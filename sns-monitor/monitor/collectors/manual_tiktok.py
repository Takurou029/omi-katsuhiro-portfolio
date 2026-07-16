"""TikTok 手動入力（CSV）モード。

TikTokのAPIは審査・トークン管理のハードルが高いため、
TikTokアプリの「インサイト（クリエイターツール）」の数字を
CSVに書き写すだけで、API連携と同じ分析・アラートが動く仕組み。

編集するファイル（GitHubのWeb画面から直接編集でもOK）:

  manual/tiktok_account.csv   アカウント全体の数字（1行=1日分）
      date,followers,following,video_count
      2026-07-16,12800,310,45

  manual/tiktok_posts.csv     投稿ごとの数字（1行=ある日の計測値）
      date,post_id,posted_at,title,url,views,likes,comments,shares
      2026-07-16,v001,2026-07-15,新作メイキング,https://...,54000,1200,80,45

  - date      : 数字を確認した日（YYYY-MM-DD）
  - posted_at : その動画を投稿した日（YYYY-MM-DD）
  - 同じ投稿は数字を確認するたびに行を追加していく（履歴が伸びを作る）

毎日でなくてもよい。書いた分だけ蓄積・分析される。
"""

import csv
from datetime import datetime
from pathlib import Path

from ..config import Config
from ..db import Database


def _to_int(value: str) -> int | None:
    value = (value or "").strip().replace(",", "")
    return int(value) if value else None


def import_csv(db: Database, cfg: Config, manual_dir: Path) -> tuple[int, int]:
    """CSVを取り込み、(アカウント行数, 投稿行数) を返す。ファイルがなければ(0,0)。"""
    account_id = db.upsert_account("tiktok", "tiktok_manual", cfg.tiktok_username)

    n_account = 0
    account_csv = manual_dir / "tiktok_account.csv"
    if account_csv.exists():
        with account_csv.open(encoding="utf-8-sig") as f:
            for row in csv.DictReader(f):
                date = (row.get("date") or "").strip()
                followers = _to_int(row.get("followers"))
                if not date or followers is None:
                    continue
                db.save_account_snapshot(
                    account_id, date, followers,
                    _to_int(row.get("following")), _to_int(row.get("video_count")),
                )
                n_account += 1

    n_posts = 0
    posts_csv = manual_dir / "tiktok_posts.csv"
    if posts_csv.exists():
        with posts_csv.open(encoding="utf-8-sig") as f:
            for row in csv.DictReader(f):
                date = (row.get("date") or "").strip()
                post_key = (row.get("post_id") or "").strip()
                posted = (row.get("posted_at") or "").strip()
                if not (date and post_key and posted):
                    continue

                posted_at = datetime.fromisoformat(posted)
                if posted_at.tzinfo is None:
                    posted_at = posted_at.replace(hour=12, tzinfo=cfg.tz)
                post_id = db.upsert_post(
                    account_id, post_key,
                    posted_at.isoformat(timespec="seconds"),
                    (row.get("title") or "").strip(),
                    (row.get("url") or "").strip(), "VIDEO",
                )

                snap_day = datetime.strptime(date, "%Y-%m-%d").date()
                age_days = (snap_day - posted_at.astimezone(cfg.tz).date()).days
                if age_days < 0:
                    continue
                likes = _to_int(row.get("likes"))
                comments = _to_int(row.get("comments"))
                shares = _to_int(row.get("shares"))
                engagement = sum(v or 0 for v in (likes, comments, shares))
                db.save_post_snapshot(
                    post_id, date, age_days, likes, comments,
                    _to_int(row.get("views")), shares, None, engagement,
                )
                n_posts += 1

    db.commit()
    return n_account, n_posts
