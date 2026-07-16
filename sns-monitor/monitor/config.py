"""設定の読み込み。config.yaml（なければ config.example.yaml のデフォルト値）を使う。"""

from dataclasses import dataclass, field
from pathlib import Path
from zoneinfo import ZoneInfo

import yaml

BASE_DIR = Path(__file__).resolve().parent.parent  # sns-monitor/


@dataclass
class Thresholds:
    spike_z: float = 2.5            # 急伸判定のロバストzスコア
    spike_ratio: float = 3.0        # 急伸判定の中央値比（3倍以上）
    slump_ratio: float = 0.3        # 不振判定の中央値比（3割以下）
    slump_max_age_days: int = 3     # 不振判定は投稿後この日数以内が対象
    min_baseline_posts: int = 4     # 比較には過去投稿がこの件数以上必要
    min_engagement: int = 10        # ノイズ除け：これ未満のエンゲージメントは急伸判定しない
    follower_z: float = 2.5         # フォロワー増減の異常判定zスコア
    follower_drop_pct: float = 1.0  # フォロワーが1日でこの%以上減ったら即警告


@dataclass
class Config:
    timezone: str = "Asia/Tokyo"
    database: Path = BASE_DIR / "data" / "sns_monitor.db"
    reports_dir: Path = BASE_DIR / "data" / "reports"
    tiktok_token_file: Path = BASE_DIR / "data" / "tiktok_token.json"
    post_max_age_days: int = 14     # 投稿後この日数までを「監視中の投稿」として分析
    no_post_alert_days: int = 3     # この日数投稿がなければ知らせる
    alert_dedup_days: int = 3       # 同じアラートをこの日数は再発報しない
    instagram_enabled: bool = True
    tiktok_enabled: bool = True
    webhook_env: str = "SNS_MONITOR_WEBHOOK_URL"
    always_send_summary: bool = True
    thresholds: Thresholds = field(default_factory=Thresholds)

    @property
    def tz(self) -> ZoneInfo:
        return ZoneInfo(self.timezone)


def load_config(path: Path | None = None) -> Config:
    cfg_path = path or (BASE_DIR / "config.yaml")
    if not cfg_path.exists():
        cfg_path = BASE_DIR / "config.example.yaml"

    raw = {}
    if cfg_path.exists():
        raw = yaml.safe_load(cfg_path.read_text(encoding="utf-8")) or {}

    th = Thresholds(**(raw.get("thresholds") or {}))
    cfg = Config(thresholds=th)

    for key in ("timezone", "post_max_age_days", "no_post_alert_days",
                "alert_dedup_days", "webhook_env", "always_send_summary"):
        if key in raw:
            setattr(cfg, key, raw[key])
    for key in ("database", "reports_dir", "tiktok_token_file"):
        if key in raw:
            p = Path(raw[key])
            setattr(cfg, key, p if p.is_absolute() else BASE_DIR / p)

    cfg.instagram_enabled = (raw.get("instagram") or {}).get("enabled", True)
    cfg.tiktok_enabled = (raw.get("tiktok") or {}).get("enabled", True)
    notify = raw.get("notify") or {}
    cfg.webhook_env = notify.get("webhook_env", cfg.webhook_env)
    cfg.always_send_summary = notify.get("always_send_summary", cfg.always_send_summary)
    return cfg
