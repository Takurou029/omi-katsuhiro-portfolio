"""アラート・日次サマリーの通知。

Slack / Discord の Incoming Webhook に対応。
Webhook URL は環境変数（デフォルト: SNS_MONITOR_WEBHOOK_URL）で渡す。
未設定の場合は標準出力に表示するだけ（ローカル確認用）。
"""

import os

import requests

from .analyzer import Alert
from .config import Config


def _severity_order(a: Alert) -> int:
    return {"critical": 0, "warning": 1}.get(a.severity, 2)


def build_message(snapshot_date: str, alerts: list[Alert],
                  summary_lines: list[str]) -> str:
    lines = [f"📊 SNS運用モニタリング {snapshot_date}", ""]
    lines += summary_lines
    if alerts:
        lines += ["", f"🔔 検知 {len(alerts)} 件:"]
        for a in sorted(alerts, key=_severity_order):
            lines += ["", a.message]
    else:
        lines += ["", "✅ 異常なし。すべて正常に運用されています。"]
    return "\n".join(lines)


def send(cfg: Config, text: str, has_alerts: bool) -> bool:
    """通知を送る。送信した（またはする必要がなかった）らTrue。"""
    if not has_alerts and not cfg.always_send_summary:
        return True

    url = os.environ.get(cfg.webhook_env, "")
    if not url:
        print("--- 通知（Webhook未設定のため標準出力） ---")
        print(text)
        return True

    # Slackは {"text": ...}、Discordは {"content": ...}
    payload = {"content": text[:1900]} if "discord.com" in url else {"text": text}
    res = requests.post(url, json=payload, timeout=30)
    ok = res.status_code < 300
    if not ok:
        print(f"通知送信に失敗: HTTP {res.status_code} {res.text[:200]}")
    return ok
