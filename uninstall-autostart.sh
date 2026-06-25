#!/bin/bash
# uninstall-autostart.sh
# 自動起動を解除します

PLIST_LABEL="com.sakurastudio.bridge"
PLIST_PATH="$HOME/Library/LaunchAgents/${PLIST_LABEL}.plist"

launchctl unload "$PLIST_PATH" 2>/dev/null && echo "停止しました" || echo "すでに停止しています"
rm -f "$PLIST_PATH"
echo "🗑️  自動起動を解除しました"
