"""
天気情報の取得モジュール（OpenWeatherMap 無料API 使用）。

「本日の天気・最高気温・最低気温」を返す。
無料の 5day/3hour 予報エンドポイント（/data/2.5/forecast）を使い、
本日分（ローカル日付）の 3 時間ごとの予報を集約して最高/最低気温を算出する。
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Optional

import requests

import config

FORECAST_URL = "https://api.openweathermap.org/data/2.5/forecast"


@dataclass
class WeatherInfo:
    """1 日分の天気サマリー。"""
    city: str
    description: str       # 例: "曇りがち"
    temp_max: float        # 最高気温(℃)
    temp_min: float        # 最低気温(℃)

    def to_prompt_text(self) -> str:
        """LLM に渡しやすい日本語テキストへ整形。"""
        return (
            f"{self.city}の本日の天気は「{self.description}」、"
            f"最高気温は{self.temp_max:.0f}度、最低気温は{self.temp_min:.0f}度です。"
        )


def get_weather(
    api_key: Optional[str] = None,
    lat: Optional[float] = None,
    lon: Optional[float] = None,
    city_name: Optional[str] = None,
) -> WeatherInfo:
    """OpenWeatherMap から本日の天気を取得する。

    引数を省略した場合は config（.env）の値を使用する。
    """
    api_key = api_key or config.OPENWEATHER_API_KEY
    lat = lat if lat is not None else config.WEATHER_LAT
    lon = lon if lon is not None else config.WEATHER_LON
    city_name = city_name or config.WEATHER_CITY_NAME

    if not api_key:
        raise RuntimeError("OPENWEATHER_API_KEY が設定されていません（.env を確認してください）。")

    params = {
        "lat": lat,
        "lon": lon,
        "appid": api_key,
        "units": "metric",  # 摂氏
        "lang": "ja",       # 日本語の天気説明
    }
    resp = requests.get(FORECAST_URL, params=params, timeout=15)
    resp.raise_for_status()
    data = resp.json()

    today = datetime.now().date()
    todays = [
        item for item in data.get("list", [])
        if datetime.fromtimestamp(item["dt"]).date() == today
    ]

    # 本日分の予報が無い場合（深夜実行など）は直近の予報にフォールバック
    if not todays:
        todays = data.get("list", [])[:1]
    if not todays:
        raise RuntimeError("天気予報データを取得できませんでした。")

    temps = [item["main"]["temp"] for item in todays]
    temp_max = max(item["main"].get("temp_max", item["main"]["temp"]) for item in todays)
    temp_min = min(item["main"].get("temp_min", item["main"]["temp"]) for item in todays)

    # 代表的な天気説明として、昼（正午に最も近い）予報の説明を採用
    noon = min(
        todays,
        key=lambda it: abs(datetime.fromtimestamp(it["dt"]).hour - 12),
    )
    description = noon["weather"][0]["description"] if noon.get("weather") else "不明"

    return WeatherInfo(
        city=city_name,
        description=description,
        temp_max=float(temp_max),
        temp_min=float(temp_min),
    )


if __name__ == "__main__":
    # 単体動作確認: python -m modules.weather
    info = get_weather()
    print(info)
    print(info.to_prompt_text())
