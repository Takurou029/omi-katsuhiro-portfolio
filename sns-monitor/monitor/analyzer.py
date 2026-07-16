"""異常検知エンジン。

考え方:
  投稿のパフォーマンスは「投稿からの経過日数」で大きく変わるため、
  各投稿の現在のエンゲージメントを、同じアカウントの過去投稿が
  「同じ経過日数」の時点で得ていた値の分布と比較する。

  外れ値に強いように中央値とMAD（中央絶対偏差）でロバストzスコアを計算し、
  さらに直感的に分かりやすい「中央値の何倍か」も併用して判定する。

判定の種類:
  spike          投稿が過去平均より急速に伸びている（好調）
  slump          投稿がいつもより明らかに伸びていない（不振）
  follower_spike フォロワーが異常なペースで増加
  follower_drop  フォロワーが減少・伸びが異常に鈍化
  no_post        一定日数投稿がない
"""

import statistics
from dataclasses import dataclass
from datetime import datetime, timedelta

from .config import Config
from .db import Database


@dataclass
class Alert:
    account_id: int
    post_id: int | None
    alert_type: str
    severity: str      # info / warning / critical
    message: str


def robust_z(value: float, values: list[int]) -> tuple[float, float]:
    """(ロバストzスコア, 中央値) を返す。ばらつきゼロのときはzを0とする。"""
    median = statistics.median(values)
    mad = statistics.median(abs(v - median) for v in values)
    scale = 1.4826 * mad
    z = (value - median) / scale if scale > 0 else 0.0
    return z, median


def _fmt(n) -> str:
    return f"{n:,.0f}" if n is not None else "-"


def _post_label(row) -> str:
    caption = (row["caption"] or "").strip().replace("\n", " ")
    if len(caption) > 40:
        caption = caption[:40] + "…"
    return caption or row["post_key"]


class Analyzer:
    def __init__(self, db: Database, cfg: Config):
        self.db = db
        self.cfg = cfg
        self.th = cfg.thresholds

    def analyze(self, snapshot_date: str) -> list[Alert]:
        alerts: list[Alert] = []
        dedup_since = (
            datetime.strptime(snapshot_date, "%Y-%m-%d")
            - timedelta(days=self.cfg.alert_dedup_days)
        ).strftime("%Y-%m-%d")

        for account in self.db.accounts():
            alerts += self._analyze_posts(account, snapshot_date, dedup_since)
            alerts += self._analyze_followers(account, snapshot_date, dedup_since)
            alerts += self._check_no_post(account, snapshot_date, dedup_since)

        for a in alerts:
            self.db.save_alert(snapshot_date, a.account_id, a.post_id,
                               a.alert_type, a.severity, a.message)
        self.db.commit()
        return alerts

    # --- 投稿ごとの急伸・不振 -------------------------------------------------

    def _analyze_posts(self, account, snapshot_date: str, dedup_since: str) -> list[Alert]:
        alerts = []
        name = f"{account['platform']} @{account['username']}"

        for snap in self.db.post_snapshots_on(
            account["id"], snapshot_date, self.cfg.post_max_age_days
        ):
            baseline = self.db.baseline_engagements(
                account["id"], snap["age_days"], snap["post_id"]
            )
            if len(baseline) < self.th.min_baseline_posts:
                continue  # 比較材料が足りないうちは判定しない

            value = snap["engagement"]
            z, median = robust_z(value, baseline)
            ratio = value / median if median > 0 else float("inf") if value > 0 else 0.0
            label = _post_label(snap)
            detail = (
                f"投稿{snap['age_days']}日目のエンゲージメント {_fmt(value)}"
                f"（過去投稿の同時点中央値 {_fmt(median)} の {ratio:.1f}倍）"
            )

            # zスコア経路はばらつきが小さいと過敏になるため、最低でも中央値の
            # 2倍を超えていなければ「急伸」とはみなさない
            is_spike = (
                value >= self.th.min_engagement
                and ((z >= self.th.spike_z and ratio >= 2.0)
                     or ratio >= self.th.spike_ratio)
            )
            is_slump = (
                snap["age_days"] <= self.th.slump_max_age_days
                and median >= self.th.min_engagement
                and ratio <= self.th.slump_ratio
            )

            if is_spike and not self.db.recent_alert_exists(
                account["id"], snap["post_id"], "spike", dedup_since
            ):
                advice = (
                    "この投稿の形式・テーマ・投稿時間帯を分析し、"
                    "同系統のコンテンツを近日中に追加投稿するのがおすすめです。"
                )
                alerts.append(Alert(
                    account["id"], snap["post_id"], "spike", "warning",
                    f"📈【急伸】{name}「{label}」が急速に伸びています。{detail}。{advice}"
                    + (f"\n{snap['permalink']}" if snap["permalink"] else ""),
                ))

            if is_slump and not self.db.recent_alert_exists(
                account["id"], snap["post_id"], "slump", dedup_since
            ):
                advice = (
                    "サムネイル・冒頭数秒・ハッシュタグ・投稿時間帯が"
                    "普段と変わっていないか確認してください。"
                )
                alerts.append(Alert(
                    account["id"], snap["post_id"], "slump", "warning",
                    f"📉【不振】{name}「{label}」がいつもより伸びていません。{detail}。{advice}"
                    + (f"\n{snap['permalink']}" if snap["permalink"] else ""),
                ))
        return alerts

    # --- フォロワー数の異常 ----------------------------------------------------

    def _analyze_followers(self, account, snapshot_date: str, dedup_since: str) -> list[Alert]:
        history = self.db.follower_history(account["id"], snapshot_date)
        if len(history) < 2 or history[0]["snapshot_date"] != snapshot_date:
            return []

        name = f"{account['platform']} @{account['username']}"
        followers = history[0]["followers"]
        delta = followers - history[1]["followers"]
        past_deltas = [
            history[i]["followers"] - history[i + 1]["followers"]
            for i in range(1, len(history) - 1)
        ]

        alerts = []
        drop_limit = -(followers * self.th.follower_drop_pct / 100)
        z = None
        if len(past_deltas) >= self.th.min_baseline_posts:
            z, median = robust_z(delta, past_deltas)

        if delta <= min(drop_limit, -1) or (z is not None and z <= -self.th.follower_z and delta < 0):
            if not self.db.recent_alert_exists(account["id"], None, "follower_drop", dedup_since):
                alerts.append(Alert(
                    account["id"], None, "follower_drop", "critical",
                    f"⚠️【フォロワー減少】{name} のフォロワーが1日で {delta:+,} 人"
                    f"（現在 {_fmt(followers)} 人）。直近の投稿内容への反応や、"
                    f"アカウントの状態（制限・シャドウバン等）を確認してください。",
                ))
        elif z is not None and z >= self.th.follower_z and delta > 0:
            if not self.db.recent_alert_exists(account["id"], None, "follower_spike", dedup_since):
                alerts.append(Alert(
                    account["id"], None, "follower_spike", "info",
                    f"🎉【フォロワー急増】{name} のフォロワーが1日で {delta:+,} 人"
                    f"（普段の中央値 {_fmt(statistics.median(past_deltas))} 人/日、現在 {_fmt(followers)} 人）。"
                    f"流入元になった投稿を特定して横展開しましょう。",
                ))
        return alerts

    # --- 投稿の途絶 ------------------------------------------------------------

    def _check_no_post(self, account, snapshot_date: str, dedup_since: str) -> list[Alert]:
        last = self.db.last_post_date(account["id"])
        if not last:
            return []
        last_date = datetime.fromisoformat(last).astimezone(self.cfg.tz).date()
        today = datetime.strptime(snapshot_date, "%Y-%m-%d").date()
        days = (today - last_date).days
        if days < self.cfg.no_post_alert_days:
            return []
        if self.db.recent_alert_exists(account["id"], None, "no_post", dedup_since):
            return []
        name = f"{account['platform']} @{account['username']}"
        return [Alert(
            account["id"], None, "no_post", "info",
            f"🗓️【投稿なし】{name} は最終投稿から {days} 日経過しています"
            f"（最終投稿: {last_date}）。投稿頻度の低下はリーチ減少につながります。",
        )]
