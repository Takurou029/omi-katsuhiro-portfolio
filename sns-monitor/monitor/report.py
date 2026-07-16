"""日次レポート（Markdown）の生成。

data/reports/YYYY-MM-DD.md に保存し、最新版を latest.md にも複製する。
通知にも使う短いサマリー行のリストを併せて返す。
"""

from pathlib import Path

from .config import Config
from .db import Database

PLATFORM_LABEL = {"instagram": "Instagram", "tiktok": "TikTok"}


def _fmt(n) -> str:
    return f"{n:,}" if n is not None else "-"


def generate(db: Database, cfg: Config, snapshot_date: str) -> tuple[Path, list[str]]:
    summary_lines: list[str] = []
    md = [f"# SNS運用日次レポート {snapshot_date}", ""]

    # --- アカウントサマリー ---
    md += ["## アカウントサマリー", "",
           "| プラットフォーム | アカウント | フォロワー | 前日比 | 投稿数 |",
           "|---|---|---:|---:|---:|"]
    for account in db.accounts():
        history = db.follower_history(account["id"], snapshot_date, limit=8)
        followers = delta_str = "-"
        if history and history[0]["snapshot_date"] == snapshot_date:
            followers = _fmt(history[0]["followers"])
            if len(history) > 1:
                delta = history[0]["followers"] - history[1]["followers"]
                delta_str = f"{delta:+,}"
        label = PLATFORM_LABEL.get(account["platform"], account["platform"])
        media = db.conn.execute(
            """SELECT media_count FROM account_snapshots
               WHERE account_id = ? AND snapshot_date = ?""",
            (account["id"], snapshot_date),
        ).fetchone()
        media_count = _fmt(media["media_count"]) if media else "-"
        md.append(f"| {label} | @{account['username']} | {followers} | {delta_str} | {media_count} |")
        summary_lines.append(
            f"・{label} @{account['username']}: フォロワー {followers}（前日比 {delta_str}）"
        )
    md.append("")

    # --- アラート（当日発報分をDBから読む：再実行しても消えない） ---
    md += ["## 検知・アラート", ""]
    day_alerts = db.alerts_on(snapshot_date)
    if day_alerts:
        for a in day_alerts:
            md.append(f"- **[{a['severity']}]** {a['message'].replace(chr(10), ' ')}")
    else:
        md.append("異常なし。すべて正常に運用されています。")
    md.append("")

    # --- 監視中の投稿 ---
    md += ["## 監視中の投稿（直近の伸び）", ""]
    for account in db.accounts():
        snaps = db.post_snapshots_on(account["id"], snapshot_date, cfg.post_max_age_days)
        if not snaps:
            continue
        label = PLATFORM_LABEL.get(account["platform"], account["platform"])
        md += [f"### {label} @{account['username']}", "",
               "| 投稿 | 経過日数 | エンゲージメント | 24h増分 | 再生数 |",
               "|---|---:|---:|---:|---:|"]
        for s in snaps:
            prev = db.previous_snapshot(s["post_id"], snapshot_date)
            growth = f"+{s['engagement'] - prev['engagement']:,}" if prev else "-"
            caption = (s["caption"] or s["post_key"]).strip().replace("\n", " ")[:30]
            name = f"[{caption}]({s['permalink']})" if s["permalink"] else caption
            md.append(
                f"| {name} | {s['age_days']}日 | {_fmt(s['engagement'])} "
                f"| {growth} | {_fmt(s['views'])} |"
            )
        md.append("")

    # --- フォロワー推移 ---
    md += ["## フォロワー推移（直近7日）", ""]
    for account in db.accounts():
        history = db.follower_history(account["id"], snapshot_date, limit=7)
        if not history:
            continue
        label = PLATFORM_LABEL.get(account["platform"], account["platform"])
        points = ", ".join(
            f"{h['snapshot_date'][5:]}: {_fmt(h['followers'])}" for h in reversed(history)
        )
        md.append(f"- **{label} @{account['username']}**: {points}")
    md.append("")

    cfg.reports_dir.mkdir(parents=True, exist_ok=True)
    path = cfg.reports_dir / f"{snapshot_date}.md"
    content = "\n".join(md)
    path.write_text(content, encoding="utf-8")
    (cfg.reports_dir / "latest.md").write_text(content, encoding="utf-8")
    return path, summary_lines
