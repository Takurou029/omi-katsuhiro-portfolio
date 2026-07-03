"""
モックデータでの動作確認スクリプト（最短で音声再生まで到達）。

外部の天気API・Google Calendar には接続せず、ダミーの天気・予定を使う。
台本生成(LLM) と 音声合成(TTS) は実際のAPIを呼ぶが、
API キーが無い場合は固定台本にフォールバックして「音声再生まで」を確認できる。

使い方:
  python mock_demo.py             # モック天気/予定 → 台本生成 → 音声再生
  python mock_demo.py --no-llm    # LLM を呼ばず固定台本で音声再生だけ確認
  python mock_demo.py --print     # 音声再生せず台本の生成のみ確認
"""
import sys

import config
from modules import script_generator, tts

# ---------- ダミーデータ ----------
MOCK_WEATHER_TEXT = "横浜の本日の天気は「晴れ時々くもり」、最高気温は28度、最低気温は21度です。"
MOCK_SCHEDULE_TEXT = (
    "本日の予定:\n"
    "- 10:00 デザインレビュー\n"
    "- 13:30 クライアント打ち合わせ\n"
    "- 18:00 ジム"
)

# LLM を使わない場合のフォールバック固定台本
FALLBACK_SCRIPT = (
    f"おはようございます、{config.USER_NICKNAME}。現在の時刻は朝の5時です。"
    "本日の横浜は晴れ時々くもり、最高気温は28度、最低気温は21度の見込みです。"
    "日中は過ごしやすい陽気になりそうですよ。"
    "本日のご予定ですが、午前10時からデザインレビュー、午後1時半からクライアントとのお打ち合わせ、"
    "夕方6時にはジムのお時間が入っております。"
    "少し予定は立て込んでおりますが、{nickname}なら大丈夫。"
    "水分補給を忘れずに、素敵な一日をお過ごしください。"
).format(nickname=config.USER_NICKNAME)


def main() -> None:
    use_llm = "--no-llm" not in sys.argv
    play_audio = "--print" not in sys.argv

    if use_llm:
        try:
            script = script_generator.generate_script(
                weather_text=MOCK_WEATHER_TEXT,
                schedule_text=MOCK_SCHEDULE_TEXT,
                now="朝の5時",
            )
        except Exception as e:  # noqa: BLE001
            print(f"[情報] LLM 呼び出しに失敗したため固定台本を使用します: {e}", file=sys.stderr)
            script = FALLBACK_SCRIPT
    else:
        script = FALLBACK_SCRIPT

    print("----- 台本 -----")
    print(script)
    print("----------------")

    if not play_audio:
        return

    try:
        tts.speak(script, output_path="mock_demo.mp3", keep_file=True)
        print("音声を再生しました（保存先: mock_demo.mp3）")
    except Exception as e:  # noqa: BLE001
        print(f"[エラー] 音声合成/再生に失敗しました: {e}", file=sys.stderr)
        print("TTS_PROVIDER と対応する API キー（.env）を確認してください。", file=sys.stderr)


if __name__ == "__main__":
    main()
