# 🌅 Morning Assistant（朝のAI執事）

本日のスケジュールと天気を取得し、AIが生成した台本を音声で読み上げるローカル実行スクリプトです。
ゆくゆくは cron で毎朝5時に自動実行することを想定しています。

- 実装言語: **Python 3.9+**
- 実行環境: **ローカルの Mac**（音声再生に macOS 標準の `afplay` を使用）

> ✅ **既定は「完全無料スタック」** — APIキー・外部登録・課金いっさい不要でそのまま動きます。
> `.env` の各 `*_PROVIDER` を差し替えると、有料/高機能版にも切り替えられます。

## 機能構成（★=既定の無料プロバイダ）

| モジュール | ファイル | 無料（既定） | 差し替え可 |
|---|---|---|---|
| 天気取得 | `modules/weather.py` | ★ **Open-Meteo**（キー不要） | OpenWeatherMap |
| カレンダー取得 | `modules/calendar_client.py` | ★ **local** (`schedule.json`) | Google Calendar |
| 台本生成 | `modules/script_generator.py` | ★ **template**（LLM課金なし） | Ollama(無料) / Claude / OpenAI |
| 音声合成・再生 | `modules/tts.py` | ★ **say**（macOS標準・無料） | OpenAI TTS / ElevenLabs |
| 本番実行 | `main.py` | — | — |
| 動作確認 | `mock_demo.py` | — | — |
| ダッシュボード | `server.py` / `dashboard*.html` | — | — |

各機能は関数単位で分割されており、`python -m modules.weather` のように単体でも実行・テストできます。

---

## 1. セットアップ（完全無料・キー不要）

```bash
cd morning-assistant

# 仮想環境の作成と有効化
python3 -m venv .venv
source .venv/bin/activate

# 依存パッケージのインストール（無料スタックはこれだけでOK）
pip install -r requirements.txt

# .env は「無くても動く」。呼びかけ名や地域を変えたい場合だけ:
# cp .env.example .env
```

これで準備完了です。予定を変えたいときは **`schedule.json`** を編集してください。

```jsonc
// schedule.json
[
  { "start": "10:00", "summary": "デザインレビュー" },
  { "start": "13:30", "summary": "クライアント打ち合わせ" },
  { "start": "18:00", "summary": "ジム" }
]
```

---

## 2. （任意）有料/高機能版への切り替え

無料版で十分ですが、精度や自然さを上げたい場合は `.env` で各 `*_PROVIDER` を変更します。

| 機能 | 無料（既定） | 切り替え例 | 必要な設定 |
|---|---|---|---|
| 台本 | `LLM_PROVIDER=template` | `ollama`（ローカルLLM・無料） | Ollama インストール＋`ollama pull llama3.1` |
| 台本 | 〃 | `anthropic` / `openai` | 各 API キー（従量課金）＋`pip install anthropic`（または `openai`） |
| 天気 | `WEATHER_PROVIDER=open-meteo` | `openweathermap` | `OPENWEATHER_API_KEY`（無料登録） |
| カレンダー | `CALENDAR_PROVIDER=local` | `google` | OAuth 設定（`credentials.json`）＋`pip install google-api-python-client google-auth-oauthlib` |
| 音声 | `TTS_PROVIDER=say` | `openai` / `elevenlabs` | 各 API キー（従量課金） |

> `.env` / `credentials.json` / `token.json` / 生成音声(`*.mp3` `*.aiff`) は `.gitignore` 済みでコミットされません。

---

## 3. 動作確認（まずはここから）

外部の天気API・カレンダーに接続せず、**ダミーデータで音声再生まで**確認できます。

```bash
# ダミーの天気/予定 → テンプレートで台本生成 → say で音声再生（キー不要）
python mock_demo.py

# LLM を一切使わず固定台本で「音声再生だけ」確認（キー不要）
python mock_demo.py --no-llm

# 音声を再生せず、生成された台本テキストだけ確認
python mock_demo.py --print
```

> 既定では台本=テンプレート、音声=macOS の `say`（Kyoko）なので、**API キーなしで音声再生まで**確認できます。

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
> - 無料版（`say` / template / local / open-meteo）は認証不要でそのまま cron 実行できます。
> - `CALENDAR_PROVIDER=google` に切り替える場合のみ、初回に手動で `python -m modules.calendar_client` を実行して OAuth 認証（token.json 生成）を済ませておいてください（cron ではブラウザ認証ができないため）。

---

## 6. ダッシュボード（JARVIS 風 UI）

映画「アイアンマン」の J.A.R.V.I.S. 風ダッシュボードを 2 種類用意しています。

### 6-1. 静的版 `dashboard.html`（モックデータ）
そのまま **Mac でダブルクリックして開くだけ**で動きます（描画に CDN を読むためネット接続のみ必要）。

### 6-2. ライブ版 `server.py` + `dashboard_live.html`（実データ＋Claudeストリーミング）
天気・カレンダー・Claude を**実際に実行**し、執事の台本が Claude から 1 文字ずつ流れて表示されます。

```bash
cd morning-assistant
source .venv/bin/activate
pip install -r requirements.txt      # fastapi / uvicorn を含む

python server.py
# → ブラウザで http://localhost:8000 を開く
```

- APIキー(`.env`)が無くても**モックデータ／固定台本にフォールバック**して起動・表示できます。
- `.env` にキーを設定すると、本物の天気・予定・Claude の台本ストリーミングに切り替わります。
- `file://`（ファイル直開き）では Claude と繋がりません。ブラウザでAPIキーを晒さないため、必ず `server.py` 経由（`http://localhost:8000`）で開いてください。

| ファイル | エンドポイント | 役割 |
|---|---|---|
| `server.py` | `GET /` | ダッシュボード配信 |
|  | `GET /api/data` | 天気・予定・統計を JSON で返す |
|  | `GET /api/stream` | SSE でシステムログ＋Claude台本を逐次配信 |

---

## トラブルシューティング

| 症状 | 対処 |
|---|---|
| 天気が「取得できませんでした」になる | Open-Meteo はキー不要。ネット接続とプロキシ/ファイアウォールを確認。取得失敗時も台本はフォールバックで生成されます |
| 音声が出ない / `say が見つかりません` | `say`・`afplay` は macOS 標準。macOS 以外では `TTS_PROVIDER` を変更するか `ffplay`(ffmpeg) 等を導入 |
| 予定が反映されない | `schedule.json` を編集（`CALENDAR_PROVIDER=local` が既定） |
| `say` の声を変えたい | `say -v '?'` で一覧確認。`.env` の `SAY_VOICE`（既定 Kyoko）や `SAY_RATE` を変更 |
| カレンダー認証エラー（google利用時） | `credentials.json` の配置と、初回 `python -m modules.calendar_client` の実行を確認 |
