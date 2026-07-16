# SNSアカウント監視・分析システム

自社で運用している **Instagram / TikTok** アカウントが毎日正常に運用されているかを
自動チェックするシステムです。

> ⚠️ **公開リポジトリでの運用について**: このシステムは収集データ
> （フォロワー数・投稿の数値・日次レポート）を `data/` にコミットします。
> リポジトリが公開（public）の場合、これらのデータも誰でも閲覧できます。
> 数値を非公開にしたい場合は、リポジトリを非公開にするか、
> このフォルダを非公開リポジトリに移してください。
> トークン等の認証情報は設計上リポジトリには一切保存されません（GitHub Secretsのみ）。

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

**トークンの自動延長**: Metaの長期トークンは60日で失効しますが、
`.github/workflows/ig-token-refresh.yml` が毎月自動で新しい長期トークンに交換します。
Secretsに `FB_APP_ID` / `FB_APP_SECRET`、さらに自動更新用に `GH_PAT`
（Fine-grained PAT、このリポジトリのSecrets: Read and write権限）を設定してください。
Actionsタブから手動で `verify`（有効期限の確認のみ）も実行できます。

**競合アカウントの監視（任意）**: Secretsに `IG_COMPETITORS` を
`アカウント名1,アカウント名2` の形式で設定すると、business_discovery APIで
競合の公開データ（フォロワー数・投稿のいいね/コメント）も毎日蓄積されます。
競合の投稿が急伸したときもアラートが届きます（相手がビジネス/クリエイター
アカウントの場合のみ取得可能）。

### 2. TikTok — APIキー不要の手動入力モード（推奨・デフォルト）

TikTokのAPIは開発者登録・アプリ審査・24時間で切れるトークン管理と
ハードルが高いため、**手動入力（CSV）モードがデフォルト**です。
TikTokアプリの「クリエイターツール → インサイト」の数字を、
リポジトリ内のCSVに書き足すだけで、API連携と同じ分析・アラートが動きます。

**入力はGitHubのWeb画面（スマホでも可）でCSVを開いて編集 → コミットするだけ。**
翌朝の自動実行が取り込みます。毎日でなくても、書いた分だけ蓄積・分析されます。

`sns-monitor/manual/tiktok_account.csv` … アカウント全体（1行=1日分）:

```csv
date,followers,following,video_count
2026-07-16,12800,310,45
2026-07-17,12850,310,46
```

`sns-monitor/manual/tiktok_posts.csv` … 投稿ごと（同じ投稿は確認のたびに行を追加）:

```csv
date,post_id,posted_at,title,url,views,likes,comments,shares
2026-07-16,v001,2026-07-15,新作メイキング,https://www.tiktok.com/...,54000,1200,80,45
2026-07-17,v001,2026-07-15,新作メイキング,https://www.tiktok.com/...,98000,2100,150,90
```

- `date` = 数字を確認した日 / `posted_at` = その動画を投稿した日
- 数字のカンマ区切り（12,800）はそのままでもOK

API連携に切り替えたい場合は `config.yaml` で `tiktok.mode: api` にし、
[TikTok for Developers](https://developers.tiktok.com/) のトークンを
`TIKTOK_ACCESS_TOKEN` に設定（自動リフレッシュ用に `TIKTOK_CLIENT_KEY` /
`TIKTOK_CLIENT_SECRET` / `TIKTOK_REFRESH_TOKEN` も推奨）。
TikTokを監視しない場合は `tiktok.mode: off`。

### 3. 通知先（Slack または Discord）

毎朝の実行結果が、指定したチャンネルにチャットメッセージとして届きます。
スマホにSlack/Discordアプリを入れていれば**プッシュ通知**でも気づけます。

- Slack: ワークスペースで Incoming Webhook を作成（App管理 → Incoming Webhooks）
- Discord: 通知用チャンネルの設定 → 連携サービス → ウェブフック → URLをコピー（無料・最も簡単）

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
