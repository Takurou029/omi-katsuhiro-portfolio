# 🌅 Morning Assistant（朝のAI執事）

本日のスケジュールと天気を取得し、AIが生成した台本を音声で読み上げるローカル実行スクリプトです。
ゆくゆくは cron で毎朝5時に自動実行することを想定しています。

- 実装言語: **Python 3.9+**
- 実行環境: **ローカルの Mac**（音声再生に macOS 標準の `afplay` を使用）

## 機能構成

| モジュール | ファイル | 役割 |
|---|---|---|
| 天気取得 | `modules/weather.py` | OpenWeatherMap で横浜の本日の天気・最高/最低気温を取得 |
| カレンダー取得 | `modules/calendar_client.py` | Google Calendar API で本日の予定を取得 |
| 台本生成 | `modules/script_generator.py` | Claude / OpenAI で「AI執事風」の台本を生成 |
| 音声合成・再生 | `modules/tts.py` | OpenAI TTS / ElevenLabs で音声化しローカル再生 |
| 本番実行 | `main.py` | 上記を統合するエントリポイント |
| 動作確認 | `mock_demo.py` | ダミーデータで音声再生まで確認する簡易版 |

各機能は関数単位で分割されており、`python -m modules.weather` のように単体でも実行・テストできます。

---

## 1. セットアップ

```bash
cd morning-assistant

# 仮想環境の作成と有効化
python3 -m venv .venv
source .venv/bin/activate

# 依存パッケージのインストール
pip install -r requirements.txt

# 環境変数ファイルを作成
cp .env.example .env
# → .env を開いて各種 API キーを設定してください
```

---

## 2. 各API キーの取得方法

### 2-1. OpenWeatherMap（天気）
1. https://openweathermap.org/ で無料アカウント登録
2. 「API keys」からキーを発行
3. `.env` の `OPENWEATHER_API_KEY` に設定
   - 対象地域はデフォルトで横浜（緯度 35.4437 / 経度 139.6380）に設定済み

### 2-2. Anthropic（Claude）または OpenAI（台本生成）
- Claude を使う場合: https://console.anthropic.com/ でキーを発行し `ANTHROPIC_API_KEY` に設定、`LLM_PROVIDER=anthropic`
- OpenAI を使う場合: https://platform.openai.com/ でキーを発行し `OPENAI_API_KEY` に設定、`LLM_PROVIDER=openai`

### 2-3. 音声合成（TTS）
- OpenAI TTS を使う場合（推奨・設定が簡単）: `OPENAI_API_KEY` を設定、`TTS_PROVIDER=openai`
- ElevenLabs を使う場合: https://elevenlabs.io/ でキーと Voice ID を取得、`ELEVENLABS_API_KEY` / `ELEVENLABS_VOICE_ID` を設定、`TTS_PROVIDER=elevenlabs`

### 2-4. Google Calendar
1. [Google Cloud Console](https://console.cloud.google.com/) でプロジェクトを作成
2. 「APIとサービス」→「ライブラリ」で **Google Calendar API** を有効化
3. 「APIとサービス」→「OAuth 同意画面」を設定（User Type: 外部、テストユーザーに自分のGoogleアカウントを追加）
4. 「認証情報」→「認証情報を作成」→「OAuth クライアント ID」→ アプリの種類「**デスクトップアプリ**」
5. 生成された JSON を **`credentials.json`** としてこのディレクトリに保存
6. 初回だけ手動で実行し、ブラウザ認証を通す（`token.json` が生成される）:
   ```bash
   python -m modules.calendar_client
   ```
   以降は `token.json` により自動でトークンが更新され、cron 無人実行が可能です。

> `.env` / `credentials.json` / `token.json` / 生成音声(`*.mp3`) は `.gitignore` 済みでコミットされません。

---

## 3. 動作確認（まずはここから）

外部の天気API・カレンダーに接続せず、**ダミーデータで音声再生まで**確認できます。

```bash
# LLM を呼ばず固定台本で「音声再生だけ」確認（TTS の API キーは必要）
python mock_demo.py --no-llm

# ダミーの天気/予定 → LLM で台本生成 → 音声再生（LLM + TTS の API キーが必要）
python mock_demo.py

# 音声を再生せず、生成された台本テキストだけ確認
python mock_demo.py --print
```

---

## 4. 本番実行

```bash
# 天気・カレンダー・台本生成・音声再生をすべて実行
python main.py

# 音声再生せず台本のみ確認
python main.py --print
```

---

## 5. 毎朝5時に自動実行（cron）

`run.sh` を毎朝5時に実行するよう cron を設定します。

```bash
# run.sh 内のパス・仮想環境の設定を自分の環境に合わせて確認したうえで、
crontab -e
```

`crontab` に以下を追記（パスは実際の設置場所に置き換えてください）:

```cron
0 5 * * * /Users/あなたのユーザー名/omi-katsuhiro-portfolio/morning-assistant/run.sh >> /Users/あなたのユーザー名/omi-katsuhiro-portfolio/morning-assistant/cron.log 2>&1
```

> **Mac の注意点**
> - Mac がスリープ中は cron が動きません。`caffeinate` や「省エネルギー」設定、または `launchd`（`pmset` で自動起動）の併用を検討してください。
> - 初回のみ手動で `python -m modules.calendar_client` を実行し、OAuth 認証（token.json 生成）を済ませておくこと（cron 実行時にはブラウザ認証はできないため）。

---

## トラブルシューティング

| 症状 | 対処 |
|---|---|
| `OPENWEATHER_API_KEY が設定されていません` | `.env` にキーを設定。発行直後は有効化まで数時間かかる場合あり |
| カレンダー認証エラー | `credentials.json` の配置と、初回 `python -m modules.calendar_client` の実行を確認 |
| 音声が再生されない | Mac は `afplay` 標準搭載。それ以外の OS は `ffplay`(ffmpeg) 等の導入が必要 |
| 台本が英語になる | 台本は日本語プロンプトで生成されます。TTS は多言語対応音声を利用してください |
