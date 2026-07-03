"""
本日の予定を取得するモジュール。

プロバイダは2種類:
  ・local   … schedule.json を読む。設定不要・完全無料（既定）
  ・google  … Google Calendar API（要OAuth）
"""
from __future__ import annotations

import json
import os
from dataclasses import dataclass
from datetime import datetime, time, timezone
from pathlib import Path
from typing import List, Optional

import config

SCOPES = ["https://www.googleapis.com/auth/calendar.readonly"]


@dataclass
class CalendarEvent:
    """カレンダー予定 1 件。"""
    summary: str
    start: str          # "10:00" / "終日"
    is_all_day: bool


def get_todays_events(provider: Optional[str] = None, calendar_id: str = "primary") -> List[CalendarEvent]:
    """本日の予定を開始時刻順で返す（既定は local・設定不要）。"""
    provider = (provider or config.CALENDAR_PROVIDER).lower()
    if provider == "local":
        return _get_local_events()
    elif provider == "google":
        return _get_google_events(calendar_id)
    else:
        raise ValueError(f"未知の CALENDAR_PROVIDER: {provider}")


# ---------------- local (schedule.json) ----------------
def _get_local_events() -> List[CalendarEvent]:
    """schedule.json を読む。

    形式（配列）:
      [{"start": "10:00", "summary": "デザインレビュー"},
       {"all_day": true, "summary": "資料提出"}]
    """
    path = Path(config.SCHEDULE_FILE)
    if not path.is_absolute():
        # このファイル基準（morning-assistant/）でも探す
        path = Path(__file__).resolve().parent.parent / config.SCHEDULE_FILE
    if not path.exists():
        return []
    data = json.loads(path.read_text(encoding="utf-8"))
    events: List[CalendarEvent] = []
    for item in data:
        all_day = bool(item.get("all_day", False))
        events.append(CalendarEvent(
            summary=item.get("summary", "（無題の予定）"),
            start="終日" if all_day else item.get("start", ""),
            is_all_day=all_day,
        ))
    # 開始時刻順（終日は先頭）
    events.sort(key=lambda e: ("" if e.is_all_day else e.start))
    return events


# ---------------- google ----------------
def _build_service():
    from google.auth.transport.requests import Request
    from google.oauth2.credentials import Credentials
    from google_auth_oauthlib.flow import InstalledAppFlow
    from googleapiclient.discovery import build

    creds: Optional[Credentials] = None
    token_path = config.GOOGLE_TOKEN_FILE
    creds_path = config.GOOGLE_CREDENTIALS_FILE
    if os.path.exists(token_path):
        creds = Credentials.from_authorized_user_file(token_path, SCOPES)
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            if not os.path.exists(creds_path):
                raise RuntimeError(
                    f"Google OAuth クライアント情報 '{creds_path}' が見つかりません。"
                    "README の手順で credentials.json を配置してください。"
                )
            flow = InstalledAppFlow.from_client_secrets_file(creds_path, SCOPES)
            creds = flow.run_local_server(port=0)
        with open(token_path, "w", encoding="utf-8") as f:
            f.write(creds.to_json())
    return build("calendar", "v3", credentials=creds)


def _get_google_events(calendar_id: str = "primary") -> List[CalendarEvent]:
    service = _build_service()
    local_tz = datetime.now().astimezone().tzinfo
    today = datetime.now(local_tz).date()
    start_of_day = datetime.combine(today, time.min, tzinfo=local_tz)
    end_of_day = datetime.combine(today, time.max, tzinfo=local_tz)
    events_result = (
        service.events().list(
            calendarId=calendar_id,
            timeMin=start_of_day.astimezone(timezone.utc).isoformat(),
            timeMax=end_of_day.astimezone(timezone.utc).isoformat(),
            singleEvents=True, orderBy="startTime",
        ).execute()
    )
    events: List[CalendarEvent] = []
    for item in events_result.get("items", []):
        start_raw = item["start"]
        if "dateTime" in start_raw:
            dt = datetime.fromisoformat(start_raw["dateTime"])
            events.append(CalendarEvent(item.get("summary", "（無題の予定）"), dt.strftime("%H:%M"), False))
        else:
            events.append(CalendarEvent(item.get("summary", "（無題の予定）"), "終日", True))
    return events


def events_to_prompt_text(events: List[CalendarEvent]) -> str:
    """予定リストを LLM/テンプレートに渡しやすい日本語テキストへ整形。"""
    if not events:
        return "本日の予定は登録されていません。"
    lines = []
    for ev in events:
        prefix = "終日: " if ev.is_all_day else f"{ev.start} "
        lines.append(f"- {prefix}{ev.summary}")
    return "本日の予定:\n" + "\n".join(lines)


if __name__ == "__main__":
    # 単体動作確認: python -m modules.calendar_client
    evs = get_todays_events()
    print(events_to_prompt_text(evs))
