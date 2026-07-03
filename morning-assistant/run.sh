#!/bin/bash
# cron から毎朝呼び出すためのラッパースクリプト。
# cron は最小限の環境変数しか持たないため、絶対パスで仮想環境を有効化して実行する。
#
# 使い方（このファイルのあるディレクトリのパスに合わせて編集してください）:
#   crontab -e に以下を追加（毎朝5時）:
#   0 5 * * * /Users/あなたのユーザー名/.../morning-assistant/run.sh >> /Users/あなたのユーザー名/.../morning-assistant/cron.log 2>&1

set -euo pipefail

# このスクリプト自身のあるディレクトリへ移動
cd "$(dirname "$0")"

# 仮想環境を有効化（venv を使っている場合）
if [ -d ".venv" ]; then
  source .venv/bin/activate
fi

python main.py
