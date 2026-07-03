"""
音声合成 + 自動再生モジュール（OpenAI TTS または ElevenLabs）。

台本テキストを音声(mp3)に変換し、ローカルでそのまま自動再生する。
macOS では標準の `afplay` を使うため追加の再生ライブラリは不要。
"""
from __future__ import annotations

import os
import platform
import shutil
import subprocess
import tempfile
from typing import Optional

import config


def synthesize(text: str, output_path: Optional[str] = None, provider: Optional[str] = None) -> str:
    """テキストを音声ファイル(mp3)に変換し、そのファイルパスを返す。"""
    provider = (provider or config.TTS_PROVIDER).lower()
    if output_path is None:
        fd, output_path = tempfile.mkstemp(suffix=".mp3", prefix="morning_")
        os.close(fd)

    if provider == "openai":
        _synthesize_openai(text, output_path)
    elif provider == "elevenlabs":
        _synthesize_elevenlabs(text, output_path)
    else:
        raise ValueError(f"未知の TTS_PROVIDER: {provider}（'openai' か 'elevenlabs'）")
    return output_path


def _synthesize_openai(text: str, output_path: str) -> None:
    from openai import OpenAI

    if not config.OPENAI_API_KEY:
        raise RuntimeError("OPENAI_API_KEY が設定されていません（.env を確認）。")
    client = OpenAI(api_key=config.OPENAI_API_KEY)
    # ストリーミングでファイルへ書き出し
    with client.audio.speech.with_streaming_response.create(
        model=config.OPENAI_TTS_MODEL,
        voice=config.OPENAI_TTS_VOICE,
        input=text,
    ) as response:
        response.stream_to_file(output_path)


def _synthesize_elevenlabs(text: str, output_path: str) -> None:
    import requests

    if not config.ELEVENLABS_API_KEY or not config.ELEVENLABS_VOICE_ID:
        raise RuntimeError("ELEVENLABS_API_KEY / ELEVENLABS_VOICE_ID が設定されていません（.env を確認）。")
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{config.ELEVENLABS_VOICE_ID}"
    headers = {
        "xi-api-key": config.ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
    }
    payload = {
        "text": text,
        "model_id": "eleven_multilingual_v2",  # 日本語対応モデル
    }
    resp = requests.post(url, headers=headers, json=payload, timeout=60)
    resp.raise_for_status()
    with open(output_path, "wb") as f:
        f.write(resp.content)


def play(audio_path: str) -> None:
    """OS に応じたコマンドで音声ファイルを再生する。"""
    system = platform.system()
    if system == "Darwin" and shutil.which("afplay"):          # macOS（標準搭載）
        cmd = ["afplay", audio_path]
    elif shutil.which("ffplay"):                                # ffmpeg 導入環境
        cmd = ["ffplay", "-nodisp", "-autoexit", "-loglevel", "quiet", audio_path]
    elif system == "Linux" and shutil.which("mpg123"):          # Linux
        cmd = ["mpg123", "-q", audio_path]
    elif system == "Windows":                                   # Windows（PowerShell）
        cmd = ["powershell", "-c", f"(New-Object Media.SoundPlayer '{audio_path}').PlaySync();"]
    else:
        raise RuntimeError(
            "音声再生コマンドが見つかりません。macOS は afplay 標準搭載、"
            "その他は ffplay(ffmpeg) 等のインストールを検討してください。"
        )
    subprocess.run(cmd, check=True)


def speak(text: str, output_path: Optional[str] = None, keep_file: bool = False) -> str:
    """テキストを音声化して即再生する便利関数。生成した音声ファイルパスを返す。"""
    path = synthesize(text, output_path=output_path)
    play(path)
    if not keep_file and output_path is None:
        # 一時ファイルとして作った場合のみ後始末（明示パス指定時は残す）
        try:
            os.remove(path)
        except OSError:
            pass
    return path


if __name__ == "__main__":
    # 単体動作確認: python -m modules.tts
    speak("おはようございます。これは音声合成のテストです。", output_path="tts_test.mp3", keep_file=True)
    print("再生完了: tts_test.mp3")
