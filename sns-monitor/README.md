# SNSアカウント監視・分析システム

自社で運用している **Instagram / TikTok** アカウントが毎日正常に運用されているかを
自動チェックするシステムです。

- 毎朝9時（JST）に自動実行（GitHub Actions）
- フォロワー数・投稿ごとのいいね/コメント/再生数を **SQLiteデータベースに毎日蓄積**
- 投稿が**急速に伸びている**／**いつもより伸びていない**を統計的に検知して**アラート通知**
- フォロワーの急増・減少、投稿の途絶も検知
- 毎日 **日次レポート（Markdown）** を自動生成してリポジトリに保存

## 仕組み

```
毎朝9時（GitHub Actions）
   │
   ├─ ① 収集   Instagram Graph API / TikTok API から現在値を取得
   ├─ ② 蓄積   SQLite（data/sns_monitor.db）に日次スナップショット保存
   ├─ ③ 分析   過去投稿の「同じ経過日数時点」の実績と統計比較して異常検知
   │            ・急伸（📈）: 過去中央値の3倍以上 or ロバストz≧2.5
   │            ・不振（📉）: 投稿3日以内で過去中央値の3割以下
   │            ・フォロワー急増/減少、投稿の途絶
   └─ ④ 報告   Slack/Discord Webhookへ通知 ＋ 日次レポートをコミット
```

投稿のパフォーマンスは「投稿からの経過日数」で大きく変わるため、
**同じアカウントの過去投稿が同じ経過日数だった時点の値**と比較するのがポイントです。
外れ値に強い中央値・MADベースの判定なので、一度バズった投稿が基準を壊しません。

## まず動きを見てみる（APIキー不要のデモ）

```bash
cd sns-monitor
pip install -r requirements.txt
python -m monitor.main --demo
```

過去30日分の擬似データ（バズった投稿・不振の投稿・フォロワー急増を含む）で
一連の流れが動き、`data/reports/latest.md` にレポートが生成されます。
Webhook未設定時は通知内容がターミナルに表示されます。

## 本番セットアップ

### 1. Instagram（Graph API）

Instagramを**プロアカウント（ビジネス/クリエイター）**にし、Facebookページと連携した上で:

1. [Meta for Developers](https://developers.facebook.com/) でアプリを作成
2. `instagram_basic`, `pages_show_list` 等の権限で**長期アクセストークン**（60日有効）を取得
3. InstagramビジネスアカウントのユーザーID（数字）を確認

→ `IG_ACCESS_TOKEN` と `IG_USER_ID` を設定

### 2. TikTok（Display API）

1. [TikTok for Developers](https://developers.tiktok.com/) でアプリを作成
2. `user.info.stats`, `video.list` スコープでOAuth認証しトークンを取得

→ `TIKTOK_ACCESS_TOKEN` を設定。アクセストークンは24時間で失効するため、
`TIKTOK_CLIENT_KEY` / `TIKTOK_CLIENT_SECRET` / `TIKTOK_REFRESH_TOKEN` も
設定しておくと自動でリフレッシュされます。

### 3. 通知先（Slack または Discord）

- Slack: ワークスペースで Incoming Webhook を作成
- Discord: チャンネル設定 → 連携サービス → ウェブフック

→ そのURLを `SNS_MONITOR_WEBHOOK_URL` に設定

### 4. GitHubに登録して自動実行を有効化

リポジトリの **Settings → Secrets and variables → Actions** で上記の値をSecretsとして登録すると、
`.github/workflows/sns-monitor.yml` により毎朝9時（JST）に自動実行されます。
（scheduleはデフォルトブランチにマージ後に有効。Actionsタブから手動実行も可能）

ローカルで実行する場合:

```bash
export IG_ACCESS_TOKEN=xxx IG_USER_ID=xxx TIKTOK_ACCESS_TOKEN=xxx
export SNS_MONITOR_WEBHOOK_URL=https://hooks.slack.com/services/xxx
cd sns-monitor && python -m monitor.main
```

## データの見方

| 場所 | 内容 |
|---|---|
| `data/sns_monitor.db` | 全履歴が入ったSQLiteデータベース |
| `data/reports/YYYY-MM-DD.md` | 日次レポート（アカウントサマリー・アラート・投稿ごとの伸び） |
| `data/reports/latest.md` | 最新レポートへのショートカット |

データベースは普通のSQLiteなので、[DB Browser for SQLite](https://sqlitebrowser.org/) などで
そのまま開いて分析できます。主なテーブル:

- `account_snapshots` … フォロワー数などの日次推移
- `post_snapshots` … 投稿ごとのいいね・コメント・再生数の日次推移（`age_days`=投稿からの経過日数）
- `alerts` … 発報したアラートの全履歴

## 調整（config.yaml）

`config.example.yaml` を `config.yaml` にコピーして編集すると、
アラートのしきい値（何倍で「急伸」とみなすか等）や通知頻度を調整できます。
詳細は `config.example.yaml` のコメントを参照してください。

## よくある質問

- **通知がうるさい** → `alert_dedup_days` を増やす／`always_send_summary: false` にすると異常時のみ通知
- **判定が始まらない** → 過去投稿の比較データが `min_baseline_posts`（デフォルト4件）貯まるまで判定を保留します。運用開始から1〜2週間で精度が安定します
- **Instagramのトークンが切れた** → 長期トークンは60日有効。切れる前に再発行してSecretsを更新してください（失敗するとWebhookにエラー通知が届きます）
