#!/usr/bin/env python3
"""
MHAI Background Watcher
Watches ~/Documents/MHAI-Inbox/ for new audio/video files.
Automatically transcribes and pushes to your MHAI dashboard.
"""
import time, os
from pathlib import Path
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
from transcribe import process_file

INBOX = Path.home() / "Documents" / "MHAI-Inbox"
INBOX.mkdir(parents=True, exist_ok=True)

SUPPORTED = {".mp3", ".mp4", ".wav", ".m4a", ".mov", ".webm", ".txt", ".vtt", ".srt"}
PROCESSING = set()

class InboxHandler(FileSystemEventHandler):
    def on_created(self, event):
        if event.is_directory:
            return
        path = Path(event.src_path)
        if path.suffix.lower() not in SUPPORTED:
            return
        if str(path) in PROCESSING:
            return
        
        # Wait for file to finish writing
        time.sleep(2)
        PROCESSING.add(str(path))
        
        print(f"\n📥 New file detected: {path.name}")
        try:
            process_file(str(path))
            # Move to processed folder
            processed = INBOX / "processed"
            processed.mkdir(exist_ok=True)
            path.rename(processed / path.name)
            print(f"   Moved to processed/")
        except Exception as e:
            print(f"   ❌ Error: {e}")
        finally:
            PROCESSING.discard(str(path))

if __name__ == "__main__":
    print("╔══════════════════════════════════════════╗")
    print("║  MHAI Background Watcher — Running       ║")
    print("╚══════════════════════════════════════════╝")
    print(f"\n👁  Watching: {INBOX}")
    print("   Drop any audio/video/transcript file to process it.")
    print("   Ctrl+C to stop.\n")
    
    observer = Observer()
    observer.schedule(InboxHandler(), str(INBOX), recursive=False)
    observer.start()
    
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        observer.stop()
        print("\n👋 Watcher stopped.")
    observer.join()
