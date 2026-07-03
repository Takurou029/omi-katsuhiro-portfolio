"""
天気情報の取得モジュール。

「本日の天気・最高気温・最低気温」を返す。
プロバイダは2種類:
  ・open-meteo    … APIキー不要・完全無料（既定）
  ・openweathermap … 要APIキー（無料枠）
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Optional

import requests

import config

OPENMETEO_URL = "https://api.open-meteo.com/v1/forecast"
OWM_FORECAST_URL = "https://api.openweathermap.org/data/2.5/forecast"

# Open-Meteo の WMO 天気コード → 日本語
WMO = {
    0: "快晴", 1: "晴れ", 2: "晴れ時々くもり", 3: "くもり",
    45: "霧", 48: "霧氷",
    51: "弱い霧雨", 53: "霧雨", 55: "強い霧雨",
    61: "弱い雨", 63: "雨", 65: "強い雨",
    66: "みぞれ", 67: "強いみぞれ",
    71: "弱い雪", 73: "雪", 75: "大雪", 77: "細氷",
    80: "にわか雨", 81: "強いにわか雨", 82: "激しいにわか雨",
    85: "にわか雪", 86: "強いにわか雪",
    95: "雷雨", 96: "雹を伴う雷雨", 99: "激しい雹を伴う雷雨",
}


@dataclass
class WeatherInfo:
    """1 日分の天気サマリー。"""
    city: str
    description: str
    temp_max: float
    temp_min: float

    def to_prompt_text(self) -> str:
        return (
            f"{self.city}の本日の天気は「{self.description}」、"
            f"最高気温は{self.temp_max:.0f}度、最低気温は{self.temp_min:.0f}度です。"
        )


def get_weather(
    provider: Optional[str] = None,
    lat: Optional[float] = None,
    lon: Optional[float] = None,
    city_name: Optional[str] = None,
) -> WeatherInfo:
    """本日の天気を取得する（既定は open-meteo・キー不要）。"""
    provider = (provider or config.WEATHER_PROVIDER).lower()
    lat = lat if lat is not None else config.WEATHER_LAT
    lon = lon if lon is not None else config.WEATHER_LON
    city_name = city_name or config.WEATHER_CITY_NAME

    if provider == "open-meteo":
        return _get_open_meteo(lat, lon, city_name)
    elif provider == "openweathermap":
        return _get_openweathermap(lat, lon, city_name)
    else:
        raise ValueError(f"未知の WEATHER_PROVIDER: {provider}")


def _get_open_meteo(lat: float, lon: float, city: str) -> WeatherInfo:
    params = {
        "latitude": lat, "longitude": lon,
        "daily": "weather_code,temperature_2m_max,temperature_2m_min",
        "timezone": "Asia/Tokyo", "forecast_days": 1,
    }
    resp = requests.get(OPENMETEO_URL, params=params, timeout=15)
    resp.raise_for_status()
    d = resp.json()["daily"]
    code = d["weather_code"][0]
    return WeatherInfo(
        city=city,
        description=WMO.get(code, "不明"),
        temp_max=float(d["temperature_2m_max"][0]),
        temp_min=float(d["temperature_2m_min"][0]),
    )


def _get_openweathermap(lat: float, lon: float, city: str) -> WeatherInfo:
    if not config.OPENWEATHER_API_KEY:
        raise RuntimeError("OPENWEATHER_API_KEY が設定されていません（.env を確認）。")
    params = {
        "lat": lat, "lon": lon, "appid": config.OPENWEATHER_API_KEY,
        "units": "metric", "lang": "ja",
    }
    resp = requests.get(OWM_FORECAST_URL, params=params, timeout=15)
    resp.raise_for_status()
    data = resp.json()
    today = datetime.now().date()
    todays = [it for it in data.get("list", [])
              if datetime.fromtimestamp(it["dt"]).date() == today] or data.get("list", [])[:1]
    if not todays:
        raise RuntimeError("天気予報データを取得できませんでした。")
    temp_max = max(it["main"].get("temp_max", it["main"]["temp"]) for it in todays)
    temp_min = min(it["main"].get("temp_min", it["main"]["temp"]) for it in todays)
    noon = min(todays, key=lambda it: abs(datetime.fromtimestamp(it["dt"]).hour - 12))
    desc = noon["weather"][0]["description"] if noon.get("weather") else "不明"
    return WeatherInfo(city=city, description=desc, temp_max=float(temp_max), temp_min=float(temp_min))


if __name__ == "__main__":
    # 単体動作確認: python -m modules.weather
    info = get_weather()
    print(info)
    print(info.to_prompt_text())
