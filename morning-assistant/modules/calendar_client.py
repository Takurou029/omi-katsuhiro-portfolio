"""
Google Calendar から本日の予定を取得するモジュール。

初回実行時にブラウザで OAuth 認証を行い、token.json を生成する。
以降は token.json を使って自動でアクセストークンを更新する
（cron での無人実行が可能）。
"""
from __future__ import annotations

import os
from dataclasses import dataclass
from datetime import datetime, time, timezone
from typing import List, Optional

import config

# 読み取り専用スコープ
SCOPES = ["https://www.googleapis.com/auth/calendar.readonly"]


@dataclass
class CalendarEvent:
    """カレンダー予定 1 件。"""
    summary: str
    start: str          # 表示用の開始時刻文字列（例: "10:00" / "終日"）
    is_all_day: bool


def _build_service():
    """認証済みの Google Calendar API サービスクライアントを返す。"""
    # 遅延 import: カレンダーを使わないモック実行時に依存を要求しないため
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
            # 初回のみブラウザが開く。cron 実行前に一度手動実行しておくこと。
            creds = flow.run_local_server(port=0)
        with open(token_path, "w", encoding="utf-8") as f:
            f.write(creds.to_json())

    return build("calendar", "v3", credentials=creds)


def get_todays_events(calendar_id: str = "primary") -> List[CalendarEvent]:
    """本日（ローカル日付）の予定リストを開始時刻順で返す。"""
    service = _build_service()

    # 本日の 00:00〜23:59:59 を UTC(RFC3339) に変換
    local_tz = datetime.now().astimezone().tzinfo
    today = datetime.now(local_tz).date()
    start_of_day = datetime.combine(today, time.min, tzinfo=local_tz)
    end_of_day = datetime.combine(today, time.max, tzinfo=local_tz)

    events_result = (
        service.events()
        .list(
            calendarId=calendar_id,
            timeMin=start_of_day.astimezone(timezone.utc).isoformat(),
            timeMax=end_of_day.astimezone(timezone.utc).isoformat(),
            singleEvents=True,
            orderBy="startTime",
        )
        .execute()
    )

    events: List[CalendarEvent] = []
    for item in events_result.get("items", []):
        start_raw = item["start"]
        if "dateTime" in start_raw:
            dt = datetime.fromisoformat(start_raw["dateTime"])
            events.append(
                CalendarEvent(
                    summary=item.get("summary", "（無題の予定）"),
                    start=dt.strftime("%H:%M"),
                    is_all_day=False,
                )
            )
        else:
            # 終日予定
            events.append(
                CalendarEvent(
                    summary=item.get("summary", "（無題の予定）"),
                    start="終日",
                    is_all_day=True,
                )
            )
    return events


def events_to_prompt_text(events: List[CalendarEvent]) -> str:
    """予定リストを LLM に渡しやすい日本語テキストへ整形。"""
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
