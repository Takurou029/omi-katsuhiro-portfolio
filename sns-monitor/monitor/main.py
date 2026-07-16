"""エントリポイント。

毎日1回実行すると:
  1. Instagram / TikTok から現在値を取得（収集）
  2. SQLiteデータベースに日次スナップショットとして保存（蓄積）
  3. 過去データと比較して急伸・不振・フォロワー異常を検知（分析）
  4. 日次レポート(Markdown)を生成し、Webhookに通知（報告）

使い方:
  python -m monitor.main                # 本番実行（要APIキー）
  python -m monitor.main --demo         # デモデータで動作確認（APIキー不要）
  python -m monitor.main --no-notify    # 通知を送らない
  python -m monitor.main --date 2026-07-15
"""

import argparse
import os
import sys
from datetime import datetime
from pathlib import Path

from . import notifier, report
from .analyzer import Analyzer
from .collectors import AccountData
from .config import load_config
from .db import Database


def store(db: Database, cfg, data: AccountData, snapshot_date: str):
    """コレクターの結果をDBに保存する。"""
    account_id = db.upsert_account(data.platform, data.account_key, data.username)
    db.save_account_snapshot(account_id, snapshot_date, data.followers,
                             data.following, data.media_count)

    snap_day = datetime.strptime(snapshot_date, "%Y-%m-%d").date()
    for post in data.posts:
        post_id = db.upsert_post(
            account_id, post.post_key,
            post.posted_at.isoformat(timespec="seconds"),
            post.caption, post.permalink, post.media_type,
        )
        age_days = (snap_day - post.posted_at.astimezone(cfg.tz).date()).days
        if age_days < 0:
            continue
        db.save_post_snapshot(post_id, snapshot_date, age_days,
                              post.likes, post.comments, post.views,
                              post.shares, post.saves, post.engagement)
    db.commit()


def collect_all(db: Database, cfg, snapshot_date: str) -> tuple[list[str], int]:
    """有効な全プラットフォームからデータを取得。
    (エラーメッセージのリスト, 収集を試みたプラットフォーム数) を返す。"""
    errors = []
    attempted = 0

    if cfg.instagram_enabled:
        attempted += 1
        if os.environ.get("IG_ACCESS_TOKEN") and os.environ.get("IG_USER_ID"):
            try:
                from .collectors.instagram import InstagramCollector
                store(db, cfg, InstagramCollector().collect(), snapshot_date)
                print("✅ Instagram: 取得完了")
            except Exception as e:  # 片方が失敗してももう片方は続行する
                errors.append(f"Instagramの取得に失敗: {e}")
        else:
            errors.append("Instagram: IG_ACCESS_TOKEN / IG_USER_ID が未設定のためスキップ")

    if cfg.tiktok_mode == "api":
        attempted += 1
        try:
            from .collectors.tiktok import TikTokCollector
            collector = TikTokCollector(token_file=cfg.tiktok_token_file)
            store(db, cfg, collector.collect(), snapshot_date)
            print("✅ TikTok(API): 取得完了")
        except Exception as e:
            errors.append(f"TikTokの取得に失敗: {e}")
    elif cfg.tiktok_mode == "csv":
        attempted += 1
        try:
            from .collectors.manual_tiktok import import_csv
            n_account, n_posts = import_csv(db, cfg, cfg.manual_dir)
            print(f"✅ TikTok(手動CSV): アカウント{n_account}行・投稿{n_posts}行を取り込み")
        except Exception as e:
            errors.append(f"TikTokのCSV取り込みに失敗: {e}")

    return errors, attempted


def main():
    parser = argparse.ArgumentParser(description="SNSアカウント監視・分析システム")
    parser.add_argument("--demo", action="store_true",
                        help="APIキーなしで擬似データを使って動作確認する")
    parser.add_argument("--date", help="スナップショット日付 YYYY-MM-DD（省略時は今日）")
    parser.add_argument("--no-notify", action="store_true", help="通知を送らない")
    parser.add_argument("--config", type=Path, help="設定ファイルのパス")
    args = parser.parse_args()

    cfg = load_config(args.config)
    snapshot_date = args.date or datetime.now(cfg.tz).strftime("%Y-%m-%d")

    db_path = cfg.database
    if args.demo:
        db_path = cfg.database.with_name("demo_" + cfg.database.name)
    db = Database(db_path)

    print(f"=== SNSモニタリング {snapshot_date} ===")
    errors: list[str] = []
    attempted = 0
    try:
        # 1-2. 収集・蓄積
        if args.demo:
            from .collectors.mock import seed_history
            seed_history(db, cfg, snapshot_date)
            print("✅ デモデータ（過去30日分）を生成しました")
        else:
            errors, attempted = collect_all(db, cfg, snapshot_date)
            for e in errors:
                print(f"⚠️  {e}")

        # 3. 分析
        alerts = Analyzer(db, cfg).analyze(snapshot_date)
        print(f"🔍 分析完了: アラート {len(alerts)} 件")

        # 4. レポート・通知
        report_path, summary_lines = report.generate(db, cfg, snapshot_date)
        print(f"📄 レポート: {report_path}")

        text = notifier.build_message(snapshot_date, alerts, summary_lines)
        if errors:
            text += "\n\n⚠️ 取得エラー:\n" + "\n".join(f"・{e}" for e in errors)
        if not args.no_notify:
            notifier.send(cfg, text, has_alerts=bool(alerts) or bool(errors))
    finally:
        db.close()

    # 全プラットフォームの取得に失敗した日は異常終了にする（Actionsで気づけるように）
    if attempted and len(errors) >= attempted:
        sys.exit(1)


if __name__ == "__main__":
    main()
