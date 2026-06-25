#!/bin/bash
# install-autostart.sh
# macOS ログイン時に claude-bridge.py を自動起動する launchd サービスを登録します
# 実行: bash install-autostart.sh

set -e

REPO_DIR="$(cd "$(dirname "$0")" && pwd)"
PYTHON="$(which python3)"
PLIST_LABEL="com.sakurastudio.bridge"
PLIST_PATH="$HOME/Library/LaunchAgents/${PLIST_LABEL}.plist"
LOG_FILE="/tmp/sakura-bridge.log"

echo "📦 サクラStudio bridge を自動起動に登録します..."
echo "   リポジトリ: $REPO_DIR"
echo "   Python:    $PYTHON"

# 既存があればアンロード
launchctl unload "$PLIST_PATH" 2>/dev/null || true

# plist を生成（パスを動的に埋め込む）
cat > "$PLIST_PATH" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${PLIST_LABEL}</string>

  <key>ProgramArguments</key>
  <array>
    <string>${PYTHON}</string>
    <string>${REPO_DIR}/claude-bridge.py</string>
  </array>

  <key>WorkingDirectory</key>
  <string>${REPO_DIR}</string>

  <!-- ログイン時に自動起動 -->
  <key>RunAtLoad</key>
  <true/>

  <!-- クラッシュしたら自動再起動 -->
  <key>KeepAlive</key>
  <true/>

  <key>StandardOutPath</key>
  <string>${LOG_FILE}</string>
  <key>StandardErrorPath</key>
  <string>${LOG_FILE}</string>
</dict>
</plist>
EOF

# 即時起動
launchctl load "$PLIST_PATH"

echo ""
echo "✅ 登録完了！次回ログインから自動的に起動します。"
echo ""
echo "   ステータス確認:  launchctl list | grep sakura"
echo "   ログ確認:        tail -f ${LOG_FILE}"
echo "   今すぐ停止:      launchctl unload \"${PLIST_PATH}\""
echo "   登録解除:        bash uninstall-autostart.sh"
echo ""
echo "🌸 sakura-studio.html をブラウザで開いてください:"
echo "   open \"${REPO_DIR}/sakura-studio.html\""
