"""
アプリ全体で使う設定値を .env から読み込む一元管理モジュール。

各機能モジュールはここから設定を import することで、
環境変数の読み込みロジックを重複させずに済む。

★ 既定値は「完全無料スタック」（APIキー・登録・課金いっさい不要）:
    天気     = open-meteo (キー不要)
    カレンダー = local (schedule.json)
    台本生成  = template (LLM課金なし)
    音声合成  = say (macOS標準)
  .env で各 PROVIDER を差し替えれば、有料/高機能版にも切り替えられる。
"""
import os
from dotenv import load_dotenv

# プロジェクト直下の .env を読み込む
load_dotenv()


def _get(key: str, default: str = "") -> str:
    return os.getenv(key, default)


# ---------- 天気 ----------
# "open-meteo"（キー不要・無料）/ "openweathermap"（要APIキー）
WEATHER_PROVIDER = _get("WEATHER_PROVIDER", "open-meteo").lower()
OPENWEATHER_API_KEY = _get("OPENWEATHER_API_KEY")
WEATHER_CITY_NAME = _get("WEATHER_CITY_NAME", "横浜")
WEATHER_LAT = float(_get("WEATHER_LAT", "35.4437"))
WEATHER_LON = float(_get("WEATHER_LON", "139.6380"))

# ---------- カレンダー ----------
# "local"（schedule.json・設定不要）/ "google"（要OAuth）
CALENDAR_PROVIDER = _get("CALENDAR_PROVIDER", "local").lower()
SCHEDULE_FILE = _get("SCHEDULE_FILE", "schedule.json")

# ---------- LLM（台本生成） ----------
# "template"（課金なし）/ "ollama"（ローカルLLM・無料）/ "anthropic" / "openai"
LLM_PROVIDER = _get("LLM_PROVIDER", "template").lower()
ANTHROPIC_API_KEY = _get("ANTHROPIC_API_KEY")
OPENAI_API_KEY = _get("OPENAI_API_KEY")
OLLAMA_HOST = _get("OLLAMA_HOST", "http://localhost:11434")
OLLAMA_MODEL = _get("OLLAMA_MODEL", "llama3.1")

# ---------- TTS ----------
# "say"（macOS標準・無料）/ "openai" / "elevenlabs"
TTS_PROVIDER = _get("TTS_PROVIDER", "say").lower()
SAY_VOICE = _get("SAY_VOICE", "Kyoko")  # 日本語音声（macOS）
SAY_RATE = _get("SAY_RATE", "180")      # 読み上げ速度（wpm）
OPENAI_TTS_VOICE = _get("OPENAI_TTS_VOICE", "alloy")
OPENAI_TTS_MODEL = _get("OPENAI_TTS_MODEL", "gpt-4o-mini-tts")
ELEVENLABS_API_KEY = _get("ELEVENLABS_API_KEY")
ELEVENLABS_VOICE_ID = _get("ELEVENLABS_VOICE_ID")

# ---------- 呼びかけ ----------
USER_NICKNAME = _get("USER_NICKNAME", "たくちゃん")

# ---------- Google Calendar（CALENDAR_PROVIDER=google の場合のみ使用） ----------
GOOGLE_CREDENTIALS_FILE = _get("GOOGLE_CREDENTIALS_FILE", "credentials.json")
GOOGLE_TOKEN_FILE = _get("GOOGLE_TOKEN_FILE", "token.json")
