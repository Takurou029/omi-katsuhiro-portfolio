"""デモモード用の擬似データ生成。

APIキーなしでシステム全体（収集→保存→分析→レポート→通知）の動きを
確認できるように、過去30日分のもっともらしい履歴をDBに直接書き込む。

シナリオ:
  - Instagram/TikTokの2アカウント、2〜3日おきに投稿
  - 昨日のTikTok投稿が「バズって」平常の約10倍 → 急伸アラートが出る
  - 2日前のInstagram投稿が平常の約2割 → 不振アラートが出る
  - TikTokのフォロワーが今日急増 → フォロワー急増アラートが出る
"""

import math
import random
from datetime import datetime, timedelta, timezone

from ..config import Config
from ..db import Database


def _engagement_at(plateau: float, age_days: int) -> int:
    """投稿は最初の数日で伸びて頭打ちになる、という成長カーブ。"""
    return int(plateau * (1 - math.exp(-max(age_days, 0) / 1.8)))


def seed_history(db: Database, cfg: Config, snapshot_date: str, days: int = 30):
    rng = random.Random(42)
    today = datetime.strptime(snapshot_date, "%Y-%m-%d").replace(
        tzinfo=cfg.tz, hour=12
    )

    specs = [
        dict(platform="instagram", username="demo_gallery", base_eng=400,
             followers=5200, daily_gain=(3, 15), post_interval=3, last_post_day=2),
        dict(platform="tiktok", username="demo_studio", base_eng=1500,
             followers=12800, daily_gain=(10, 60), post_interval=2, last_post_day=1),
    ]

    for spec in specs:
        account_id = db.upsert_account(spec["platform"], f"demo_{spec['platform']}",
                                       spec["username"])

        # 投稿を生成。倍率1前後のランダム、特定の投稿だけ異常値に。
        # last_post_day から post_interval 日おきに遡って配置する。
        posts = []
        post_days = []
        d = spec["last_post_day"]
        while d <= days:
            post_days.append(d)
            d += spec["post_interval"]
        for d in reversed(post_days):
            mult = rng.lognormvariate(0, 0.35)
            if spec["platform"] == "tiktok" and d == 1:
                mult = 10.0   # 昨日のTikTok投稿がバズった
            if spec["platform"] == "instagram" and d == 2:
                mult = 0.18   # 2日前のInstagram投稿が不振
            posted_at = today - timedelta(days=d)
            post_id = db.upsert_post(
                account_id, f"{spec['platform']}_post_{d:02d}",
                posted_at.isoformat(timespec="seconds"),
                f"デモ投稿（{posted_at:%m/%d}）", "", "IMAGE",
            )
            posts.append((post_id, d, spec["base_eng"] * mult))

        # 日次スナップショットを生成
        followers = spec["followers"]
        for back in range(days, -1, -1):
            date = (today - timedelta(days=back)).strftime("%Y-%m-%d")
            gain = rng.randint(*spec["daily_gain"])
            if spec["platform"] == "tiktok" and back == 0:
                gain = 900    # バズの翌日にフォロワー急増
            followers += gain
            db.save_account_snapshot(account_id, date, followers,
                                     rng.randint(300, 320), len(posts))

            for post_id, posted_back, plateau in posts:
                age = posted_back - back
                if age < 0:
                    continue
                eng = _engagement_at(plateau, age)
                likes = int(eng * 0.8)
                comments = int(eng * 0.1)
                shares = eng - likes - comments
                views = eng * 40 if spec["platform"] == "tiktok" else None
                db.save_post_snapshot(post_id, date, age, likes, comments,
                                      views, shares, None, eng)
    db.commit()
