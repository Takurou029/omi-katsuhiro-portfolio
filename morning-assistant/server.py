"""
ライブ・ダッシュボード用のローカルサーバ（FastAPI）。

役割:
  ・ダッシュボード画面(dashboard_live.html)を配信
  ・/api/data     … 本物の天気・本日の予定・統計をJSONで返す
  ・/api/stream   … SSE(Server-Sent Events)で「システムログ」と
                    「Claudeが生成する執事の台本」を1文字ずつ流す

APIキー(.env)が無い場合はモックデータ／固定台本に自動フォールバックするので、
キー未設定でもそのまま起動・表示できる。

起動:
  uvicorn server:app --reload      （または python server.py）
  → ブラウザで http://localhost:8000 を開く
"""
from __future__ import annotations

import json
import os
import time
from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import HTMLResponse, JSONResponse, StreamingResponse

import config
from modules import calendar_client, script_generator, weather

app = FastAPI(title="Morning Assistant · JARVIS Dashboard")

HERE = Path(__file__).parent
NICK = config.USER_NICKNAME

# ---------- フォールバック（APIキー未設定・取得失敗時） ----------
MOCK_WEATHER = weather.WeatherInfo(city="横浜", description="晴れ時々くもり", temp_max=28, temp_min=21)
MOCK_SCHEDULE = [
    calendar_client.CalendarEvent(summary="デザインレビュー", start="10:00", is_all_day=False),
    calendar_client.CalendarEvent(summary="クライアント打ち合わせ", start="13:30", is_all_day=False),
    calendar_client.CalendarEvent(summary="ジム", start="18:00", is_all_day=False),
]
FALLBACK_SCRIPT = (
    f"おはようございます、{NICK}。現在の時刻は朝の5時です。"
    "本日の横浜は晴れ時々くもり、最高気温は28度、最低気温は21度の見込みです。"
    "本日のご予定は、午前10時からデザインレビュー、午後1時半からお打ち合わせ、"
    "夕方6時にはジムのお時間が入っております。素敵な一日をお過ごしください。"
)
LOG_STREAM = [
    "SCAN  ▹ Perimeter nominal", "PWR   ▹ Arc reactor 3.2 GJ · stable",
    "CPU   ▹ load 12% · temp 41°C", "SEC   ▹ No anomalies detected",
    "NET   ▹ Refreshing forecast ...", "SYS   ▹ All subsystems ... OK",
]


def get_weather_safe() -> weather.WeatherInfo:
    try:
        return weather.get_weather()
    except Exception as e:  # noqa: BLE001
        print(f"[warn] weather fallback: {e}")
        return MOCK_WEATHER


def get_schedule_safe():
    try:
        evs = calendar_client.get_todays_events()
        return evs if evs else MOCK_SCHEDULE
    except Exception as e:  # noqa: BLE001
        print(f"[warn] calendar fallback: {e}")
        return MOCK_SCHEDULE


def _tag(summary: str) -> str:
    s = summary.lower()
    if any(k in summary for k in ("打ち合わせ", "会議", "MTG", "レビュー")):
        return "MTG"
    if any(k in summary for k in ("電話", "コール", "call")):
        return "CALL"
    if any(k in summary for k in ("ジム", "運動", "ラン")):
        return "FIT"
    return "EVT"


# ============================================================
#  API
# ============================================================
@app.get("/api/data")
def api_data():
    w = get_weather_safe()
    evs = get_schedule_safe()
    return JSONResponse({
        "weather": {
            "city": w.city, "cond": w.description,
            "high": round(w.temp_max), "low": round(w.temp_min),
            "hum": 62, "wind": 3.4,
        },
        "schedule": [
            {"t": e.start, "title": e.summary, "tag": _tag(e.summary)} for e in evs
        ],
        "stats": {"downloads": 84213, "revenue": 1284500},
        "chart": [12, 18, 16, 24, 28, 26, 34, 40, 38, 47, 52, 63],
        "greeting": f"おはようございます、{NICK}。本日の横浜は「{w.description}」です。",
    })


def _sse(obj) -> str:
    return f"data: {json.dumps(obj, ensure_ascii=False)}\n\n"


@app.get("/api/stream")
def api_stream():
    """SSE: 起動ログ → Claude台本を逐次ストリーム → 以降は状態ログを流し続ける。"""
    def gen():
        boot = [
            "BOOT  ▹ J.A.R.V.I.S. core online",
            f'AUTH  ▹ user "{NICK}" verified',
        ]
        for line in boot:
            yield _sse({"type": "log", "text": line}); time.sleep(0.35)

        w = get_weather_safe()
        yield _sse({"type": "log", "text": f"NET   ▹ Fetching weather ... OK ({w.city})"}); time.sleep(0.3)
        evs = get_schedule_safe()
        yield _sse({"type": "log", "text": f"CAL   ▹ Syncing Calendar ... {len(evs)} events"}); time.sleep(0.3)

        provider = config.LLM_PROVIDER
        yield _sse({"type": "log", "text": f"LLM   ▹ Generating script ({provider}) ..."}); time.sleep(0.2)
        yield _sse({"type": "script_start"})
        try:
            for chunk in script_generator.stream_script(
                w.to_prompt_text(),
                calendar_client.events_to_prompt_text(evs),
                now="朝の5時",
            ):
                yield _sse({"type": "token", "text": chunk})
        except Exception as e:  # noqa: BLE001 — キー無し等 → 固定台本を1文字ずつ
            yield _sse({"type": "log", "text": f"LLM   ▹ fallback ({type(e).__name__})"})
            for ch in FALLBACK_SCRIPT:
                yield _sse({"type": "token", "text": ch}); time.sleep(0.02)
        yield _sse({"type": "script_end"})
        yield _sse({"type": "log", "text": "TTS   ▹ Voice ready · playback armed"})
        yield _sse({"type": "log", "text": "SYS   ▹ System Check ... OK"})

        # 以降は常駐ログ（Claude呼び出しは1回だけ / 接続維持）
        i = 0
        while True:
            time.sleep(1.6)
            now = time.strftime("%H:%M:%S")
            yield _sse({"type": "log", "text": f"[{now}] {LOG_STREAM[i % len(LOG_STREAM)]}"})
            i += 1

    return StreamingResponse(gen(), media_type="text/event-stream")


@app.get("/", response_class=HTMLResponse)
def index():
    return (HERE / "dashboard_live.html").read_text(encoding="utf-8")


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8000"))
    print(f"\n  ▶  http://localhost:{port}  をブラウザで開いてください\n")
    uvicorn.run(app, host="127.0.0.1", port=port)
