"""
アプリ全体で使う設定値を .env から読み込む一元管理モジュール。

各機能モジュールはここから設定を import することで、
環境変数の読み込みロジックを重複させずに済む。
"""
import os
from dotenv import load_dotenv

# プロジェクト直下の .env を読み込む
load_dotenv()


def _get(key: str, default: str = "") -> str:
    return os.getenv(key, default)


# ---------- 天気 ----------
OPENWEATHER_API_KEY = _get("OPENWEATHER_API_KEY")
WEATHER_CITY_NAME = _get("WEATHER_CITY_NAME", "横浜")
WEATHER_LAT = float(_get("WEATHER_LAT", "35.4437"))
WEATHER_LON = float(_get("WEATHER_LON", "139.6380"))

# ---------- LLM（台本生成） ----------
LLM_PROVIDER = _get("LLM_PROVIDER", "anthropic").lower()
ANTHROPIC_API_KEY = _get("ANTHROPIC_API_KEY")
OPENAI_API_KEY = _get("OPENAI_API_KEY")

# ---------- TTS ----------
TTS_PROVIDER = _get("TTS_PROVIDER", "openai").lower()
OPENAI_TTS_VOICE = _get("OPENAI_TTS_VOICE", "alloy")
OPENAI_TTS_MODEL = _get("OPENAI_TTS_MODEL", "gpt-4o-mini-tts")
ELEVENLABS_API_KEY = _get("ELEVENLABS_API_KEY")
ELEVENLABS_VOICE_ID = _get("ELEVENLABS_VOICE_ID")

# ---------- 呼びかけ ----------
USER_NICKNAME = _get("USER_NICKNAME", "たくちゃん")

# ---------- Google Calendar ----------
GOOGLE_CREDENTIALS_FILE = _get("GOOGLE_CREDENTIALS_FILE", "credentials.json")
GOOGLE_TOKEN_FILE = _get("GOOGLE_TOKEN_FILE", "token.json")
