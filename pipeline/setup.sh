#!/bin/bash
echo "🔧 Setting up MHAI pipeline..."
pip3 install -r requirements.txt
# Install Whisper (requires ffmpeg)
which ffmpeg || brew install ffmpeg
mkdir -p ~/Documents/MHAI-Inbox
mkdir -p ~/Documents/MHAI-Archive
echo "✅ Pipeline ready. Run: python3 watch.py"
