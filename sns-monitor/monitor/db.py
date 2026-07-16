"""SQLiteデータベース。毎日の計測値と発報したアラートをすべて蓄積する。

テーブル構成:
  accounts          監視対象アカウント
  account_snapshots アカウントの日次スナップショット（フォロワー数など）
  posts             観測した投稿
  post_snapshots    投稿の日次スナップショット（いいね・再生数など）
  alerts            発報したアラートの履歴
"""

import sqlite3
from datetime import datetime, timezone
from pathlib import Path

SCHEMA = """
CREATE TABLE IF NOT EXISTS accounts (
    id          INTEGER PRIMARY KEY,
    platform    TEXT NOT NULL,
    account_key TEXT NOT NULL,
    username    TEXT DEFAULT '',
    UNIQUE (platform, account_key)
);

CREATE TABLE IF NOT EXISTS account_snapshots (
    id            INTEGER PRIMARY KEY,
    account_id    INTEGER NOT NULL REFERENCES accounts (id),
    snapshot_date TEXT NOT NULL,          -- YYYY-MM-DD（設定タイムゾーン基準）
    followers     INTEGER,
    following     INTEGER,
    media_count   INTEGER,
    fetched_at    TEXT NOT NULL,          -- UTC ISO8601
    UNIQUE (account_id, snapshot_date)
);

CREATE TABLE IF NOT EXISTS posts (
    id         INTEGER PRIMARY KEY,
    account_id INTEGER NOT NULL REFERENCES accounts (id),
    post_key   TEXT NOT NULL,
    posted_at  TEXT,                      -- UTC ISO8601
    caption    TEXT DEFAULT '',
    permalink  TEXT DEFAULT '',
    media_type TEXT DEFAULT '',
    UNIQUE (account_id, post_key)
);

CREATE TABLE IF NOT EXISTS post_snapshots (
    id            INTEGER PRIMARY KEY,
    post_id       INTEGER NOT NULL REFERENCES posts (id),
    snapshot_date TEXT NOT NULL,
    age_days      INTEGER NOT NULL,       -- 投稿からの経過日数
    likes         INTEGER,
    comments      INTEGER,
    views         INTEGER,
    shares        INTEGER,
    saves         INTEGER,
    engagement    INTEGER NOT NULL,
    fetched_at    TEXT NOT NULL,
    UNIQUE (post_id, snapshot_date)
);

CREATE TABLE IF NOT EXISTS alerts (
    id            INTEGER PRIMARY KEY,
    snapshot_date TEXT NOT NULL,
    account_id    INTEGER NOT NULL REFERENCES accounts (id),
    post_id       INTEGER REFERENCES posts (id),
    alert_type    TEXT NOT NULL,          -- spike / slump / follower_spike / follower_drop / no_post
    severity      TEXT NOT NULL,          -- info / warning / critical
    message       TEXT NOT NULL,
    created_at    TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_post_snap_age ON post_snapshots (age_days, snapshot_date);
CREATE INDEX IF NOT EXISTS idx_alerts_date   ON alerts (snapshot_date);
"""


class Database:
    def __init__(self, path: Path):
        path.parent.mkdir(parents=True, exist_ok=True)
        self.conn = sqlite3.connect(path)
        self.conn.row_factory = sqlite3.Row
        self.conn.executescript(SCHEMA)

    def close(self):
        self.conn.commit()
        self.conn.close()

    @staticmethod
    def _now() -> str:
        return datetime.now(timezone.utc).isoformat(timespec="seconds")

    # --- 書き込み -----------------------------------------------------------

    def upsert_account(self, platform: str, account_key: str, username: str) -> int:
        self.conn.execute(
            """INSERT INTO accounts (platform, account_key, username)
               VALUES (?, ?, ?)
               ON CONFLICT (platform, account_key)
               DO UPDATE SET username = excluded.username""",
            (platform, account_key, username),
        )
        row = self.conn.execute(
            "SELECT id FROM accounts WHERE platform = ? AND account_key = ?",
            (platform, account_key),
        ).fetchone()
        return row["id"]

    def save_account_snapshot(self, account_id: int, snapshot_date: str,
                              followers, following, media_count):
        self.conn.execute(
            """INSERT INTO account_snapshots
                   (account_id, snapshot_date, followers, following, media_count, fetched_at)
               VALUES (?, ?, ?, ?, ?, ?)
               ON CONFLICT (account_id, snapshot_date) DO UPDATE SET
                   followers = excluded.followers, following = excluded.following,
                   media_count = excluded.media_count, fetched_at = excluded.fetched_at""",
            (account_id, snapshot_date, followers, following, media_count, self._now()),
        )

    def upsert_post(self, account_id: int, post_key: str, posted_at: str,
                    caption: str, permalink: str, media_type: str) -> int:
        self.conn.execute(
            """INSERT INTO posts (account_id, post_key, posted_at, caption, permalink, media_type)
               VALUES (?, ?, ?, ?, ?, ?)
               ON CONFLICT (account_id, post_key) DO UPDATE SET caption = excluded.caption""",
            (account_id, post_key, posted_at, caption, permalink, media_type),
        )
        row = self.conn.execute(
            "SELECT id FROM posts WHERE account_id = ? AND post_key = ?",
            (account_id, post_key),
        ).fetchone()
        return row["id"]

    def save_post_snapshot(self, post_id: int, snapshot_date: str, age_days: int,
                           likes, comments, views, shares, saves, engagement: int):
        self.conn.execute(
            """INSERT INTO post_snapshots
                   (post_id, snapshot_date, age_days, likes, comments, views,
                    shares, saves, engagement, fetched_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
               ON CONFLICT (post_id, snapshot_date) DO UPDATE SET
                   age_days = excluded.age_days, likes = excluded.likes,
                   comments = excluded.comments, views = excluded.views,
                   shares = excluded.shares, saves = excluded.saves,
                   engagement = excluded.engagement, fetched_at = excluded.fetched_at""",
            (post_id, snapshot_date, age_days, likes, comments, views,
             shares, saves, engagement, self._now()),
        )

    def save_alert(self, snapshot_date: str, account_id: int, post_id,
                   alert_type: str, severity: str, message: str):
        self.conn.execute(
            """INSERT INTO alerts
                   (snapshot_date, account_id, post_id, alert_type, severity, message, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (snapshot_date, account_id, post_id, alert_type, severity, message, self._now()),
        )

    def commit(self):
        self.conn.commit()

    # --- 読み出し（分析・レポート用） ----------------------------------------

    def accounts(self) -> list[sqlite3.Row]:
        return self.conn.execute("SELECT * FROM accounts ORDER BY platform").fetchall()

    def post_snapshots_on(self, account_id: int, snapshot_date: str,
                          max_age_days: int) -> list[sqlite3.Row]:
        """指定日のスナップショットがある「分析対象の若い投稿」を返す。"""
        return self.conn.execute(
            """SELECT ps.*, p.caption, p.permalink, p.posted_at, p.post_key
               FROM post_snapshots ps JOIN posts p ON p.id = ps.post_id
               WHERE p.account_id = ? AND ps.snapshot_date = ?
                 AND ps.age_days BETWEEN 1 AND ?
               ORDER BY p.posted_at DESC""",
            (account_id, snapshot_date, max_age_days),
        ).fetchall()

    def baseline_engagements(self, account_id: int, age_days: int,
                             exclude_post_id: int, limit: int = 30) -> list[int]:
        """同じアカウントの過去投稿が「同じ経過日数」の時点で得ていたエンゲージメント。"""
        rows = self.conn.execute(
            """SELECT ps.engagement
               FROM post_snapshots ps JOIN posts p ON p.id = ps.post_id
               WHERE p.account_id = ? AND ps.age_days = ? AND ps.post_id != ?
               ORDER BY p.posted_at DESC LIMIT ?""",
            (account_id, age_days, exclude_post_id, limit),
        ).fetchall()
        return [r["engagement"] for r in rows]

    def follower_history(self, account_id: int, until_date: str,
                         limit: int = 31) -> list[sqlite3.Row]:
        """指定日以前のフォロワー数履歴（新しい順）。"""
        return self.conn.execute(
            """SELECT snapshot_date, followers FROM account_snapshots
               WHERE account_id = ? AND snapshot_date <= ? AND followers IS NOT NULL
               ORDER BY snapshot_date DESC LIMIT ?""",
            (account_id, until_date, limit),
        ).fetchall()

    def last_post_date(self, account_id: int) -> str | None:
        row = self.conn.execute(
            "SELECT MAX(posted_at) AS last FROM posts WHERE account_id = ?",
            (account_id,),
        ).fetchone()
        return row["last"]

    def recent_alert_exists(self, account_id: int, post_id, alert_type: str,
                            since_date: str) -> bool:
        """直近に同種のアラートを出していれば重複発報を抑止する。"""
        row = self.conn.execute(
            """SELECT 1 FROM alerts
               WHERE account_id = ? AND alert_type = ? AND snapshot_date >= ?
                 AND (post_id IS ? OR post_id = ?) LIMIT 1""",
            (account_id, alert_type, since_date, post_id, post_id),
        ).fetchone()
        return row is not None

    def previous_snapshot(self, post_id: int, before_date: str) -> sqlite3.Row | None:
        return self.conn.execute(
            """SELECT * FROM post_snapshots
               WHERE post_id = ? AND snapshot_date < ?
               ORDER BY snapshot_date DESC LIMIT 1""",
            (post_id, before_date),
        ).fetchone()

    def alerts_on(self, snapshot_date: str) -> list[sqlite3.Row]:
        return self.conn.execute(
            """SELECT a.*, ac.platform, ac.username, p.permalink, p.caption
               FROM alerts a
               JOIN accounts ac ON ac.id = a.account_id
               LEFT JOIN posts p ON p.id = a.post_id
               WHERE a.snapshot_date = ?
               ORDER BY CASE a.severity
                   WHEN 'critical' THEN 0 WHEN 'warning' THEN 1 ELSE 2 END""",
            (snapshot_date,),
        ).fetchall()
