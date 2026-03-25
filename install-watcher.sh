#!/bin/bash
# MHAI Teams Auto-Capture Setup
# Run this once to install the background watcher as a Mac login item

PLIST="$HOME/Library/LaunchAgents/com.mhai.inbox-watcher.plist"
INBOX="$HOME/Documents/MHAI-Inbox"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WATCH_SCRIPT="$SCRIPT_DIR/pipeline/watch.py"

mkdir -p "$INBOX"
mkdir -p "$INBOX/processed"

cat > "$PLIST" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.mhai.inbox-watcher</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/bin/python3</string>
        <string>$WATCH_SCRIPT</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>$HOME/Documents/MHAI-Inbox/watcher.log</string>
    <key>StandardErrorPath</key>
    <string>$HOME/Documents/MHAI-Inbox/watcher-error.log</string>
    <key>WorkingDirectory</key>
    <string>$SCRIPT_DIR</string>
</dict>
</plist>
EOF

launchctl unload "$PLIST" 2>/dev/null
launchctl load "$PLIST"

echo ""
echo "✅ MHAI Inbox Watcher installed and running."
echo ""
echo "Drop meeting files into: $INBOX"
echo "Supported: .txt  .vtt  .srt  .mp3  .mp4  .wav  .m4a"
echo ""
echo "Teams auto-capture: Files are saved to MHAI-Inbox automatically."
echo "Check watcher.log in MHAI-Inbox if anything seems off."
