"""
音声合成 + 自動再生モジュール。

プロバイダ:
  ・say        … macOS標準の `say` コマンド（Kyoko音声）。完全無料・既定
  ・openai     … OpenAI TTS（従量課金）
  ・elevenlabs … ElevenLabs（従量課金）

macOS では `say` / `afplay` が標準搭載のため、追加インストール不要で音声再生まで完結する。
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
    """テキストを音声ファイルに変換し、そのパスを返す。"""
    provider = (provider or config.TTS_PROVIDER).lower()
    if provider == "say":
        # say は .aiff を出力
        if output_path is None:
            fd, output_path = tempfile.mkstemp(suffix=".aiff", prefix="morning_"); os.close(fd)
        elif output_path.endswith(".mp3"):
            output_path = output_path[:-4] + ".aiff"
        _synthesize_say(text, output_path)
        return output_path

    if output_path is None:
        fd, output_path = tempfile.mkstemp(suffix=".mp3", prefix="morning_"); os.close(fd)
    if provider == "openai":
        _synthesize_openai(text, output_path)
    elif provider == "elevenlabs":
        _synthesize_elevenlabs(text, output_path)
    else:
        raise ValueError(f"未知の TTS_PROVIDER: {provider}")
    return output_path


def _synthesize_say(text: str, output_path: str) -> None:
    if not shutil.which("say"):
        raise RuntimeError("`say` コマンドが見つかりません（macOS 専用機能です）。")
    cmd = ["say", "-o", output_path, "-r", str(config.SAY_RATE)]
    if config.SAY_VOICE:
        cmd += ["-v", config.SAY_VOICE]
    cmd += [text]
    subprocess.run(cmd, check=True)


def _synthesize_openai(text: str, output_path: str) -> None:
    from openai import OpenAI
    if not config.OPENAI_API_KEY:
        raise RuntimeError("OPENAI_API_KEY が設定されていません（.env を確認）。")
    client = OpenAI(api_key=config.OPENAI_API_KEY)
    with client.audio.speech.with_streaming_response.create(
        model=config.OPENAI_TTS_MODEL, voice=config.OPENAI_TTS_VOICE, input=text,
    ) as response:
        response.stream_to_file(output_path)


def _synthesize_elevenlabs(text: str, output_path: str) -> None:
    import requests
    if not config.ELEVENLABS_API_KEY or not config.ELEVENLABS_VOICE_ID:
        raise RuntimeError("ELEVENLABS_API_KEY / ELEVENLABS_VOICE_ID が未設定です（.env を確認）。")
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{config.ELEVENLABS_VOICE_ID}"
    resp = requests.post(url, headers={"xi-api-key": config.ELEVENLABS_API_KEY, "Content-Type": "application/json"},
                         json={"text": text, "model_id": "eleven_multilingual_v2"}, timeout=60)
    resp.raise_for_status()
    with open(output_path, "wb") as f:
        f.write(resp.content)


def play(audio_path: str) -> None:
    """OS に応じたコマンドで音声ファイルを再生する。"""
    system = platform.system()
    if system == "Darwin" and shutil.which("afplay"):
        cmd = ["afplay", audio_path]
    elif shutil.which("ffplay"):
        cmd = ["ffplay", "-nodisp", "-autoexit", "-loglevel", "quiet", audio_path]
    elif system == "Linux" and shutil.which("mpg123"):
        cmd = ["mpg123", "-q", audio_path]
    elif system == "Windows":
        cmd = ["powershell", "-c", f"(New-Object Media.SoundPlayer '{audio_path}').PlaySync();"]
    else:
        raise RuntimeError("音声再生コマンドが見つかりません（macOS は afplay 標準搭載）。")
    subprocess.run(cmd, check=True)


def speak(text: str, output_path: Optional[str] = None, keep_file: bool = False) -> str:
    """テキストを音声化して即再生。生成した音声ファイルパスを返す。"""
    path = synthesize(text, output_path=output_path)
    play(path)
    if not keep_file and output_path is None:
        try:
            os.remove(path)
        except OSError:
            pass
    return path


if __name__ == "__main__":
    # 単体動作確認: python -m modules.tts
    speak("おはようございます。これは音声合成のテストです。", output_path="tts_test.aiff", keep_file=True)
    print("再生完了")
