"""
Morning Assistant 本番エントリポイント。

流れ:
  1. 天気を取得（OpenWeatherMap）
  2. 本日の予定を取得（Google Calendar）
  3. 台本を生成（Claude / OpenAI）
  4. 音声合成して自動再生（OpenAI TTS / ElevenLabs）

各ステップは失敗しても致命的にならないよう、可能な範囲で
デグレード（代替テキスト）して処理を継続する。

使い方:
  python main.py            # 通常実行
  python main.py --print    # 台本を標準出力するだけ（音声再生しない）
"""
import sys
from datetime import datetime

from modules import calendar_client, script_generator, tts, weather


def gather_weather_text() -> str:
    try:
        info = weather.get_weather()
        return info.to_prompt_text()
    except Exception as e:  # noqa: BLE001
        print(f"[警告] 天気の取得に失敗しました: {e}", file=sys.stderr)
        return "本日の天気情報は取得できませんでした。"


def gather_schedule_text() -> str:
    try:
        events = calendar_client.get_todays_events()
        return calendar_client.events_to_prompt_text(events)
    except Exception as e:  # noqa: BLE001
        print(f"[警告] カレンダーの取得に失敗しました: {e}", file=sys.stderr)
        return "本日の予定は取得できませんでした。"


def run(play_audio: bool = True) -> str:
    weather_text = gather_weather_text()
    schedule_text = gather_schedule_text()

    now_str = datetime.now().strftime("%H時%M分")
    script = script_generator.generate_script(
        weather_text=weather_text,
        schedule_text=schedule_text,
        now=now_str,
    )

    print("----- 生成された台本 -----")
    print(script)
    print("--------------------------")

    if play_audio:
        # 音声ファイルは日付付きで残す（デバッグ・確認用）
        out = f"morning_{datetime.now():%Y%m%d}.mp3"
        tts.speak(script, output_path=out, keep_file=True)
        print(f"音声を再生しました（保存先: {out}）")

    return script


if __name__ == "__main__":
    play = "--print" not in sys.argv
    run(play_audio=play)
