#!/usr/bin/env python3
"""
MHAI Transcription Pipeline
Whisper transcription + Claude extraction + Supabase push
"""
import os, sys, json, subprocess, datetime
from pathlib import Path
import anthropic
from supabase import create_client

SUPABASE_URL = os.getenv("VITE_SUPABASE_URL") or os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("VITE_SUPABASE_ANON_KEY") or os.getenv("SUPABASE_KEY")
ANTHROPIC_KEY = os.getenv("VITE_ANTHROPIC_API_KEY") or os.getenv("ANTHROPIC_API_KEY")

def transcribe_with_whisper(file_path: str) -> str:
    """Run Whisper on the audio/video file, return transcript text."""
    print(f"  🎙  Transcribing: {Path(file_path).name}")
    result = subprocess.run(
        ["whisper", file_path, "--output_format", "txt", "--output_dir", "/tmp/mhai_transcripts", "--model", "base"],
        capture_output=True, text=True
    )
    txt_path = f"/tmp/mhai_transcripts/{Path(file_path).stem}.txt"
    if Path(txt_path).exists():
        return Path(txt_path).read_text()
    return result.stdout or "Transcription failed"

def analyze_with_claude(transcript: str, title: str) -> dict:
    """Use Claude to extract structured meeting intelligence."""
    print(f"  🧠  Analyzing with Claude...")
    client = anthropic.Anthropic(api_key=ANTHROPIC_KEY)
    
    prompt = f"""Analyze this meeting transcript and extract structured intelligence.
Return ONLY valid JSON with this exact structure:

{{
  "summary": "2-3 sentence summary",
  "key_decisions": ["decision 1", "decision 2"],
  "action_items": [
    {{"text": "what to do", "owner": "person name", "due": "YYYY-MM-DD or null", "done": false}}
  ],
  "blockers": ["blocker 1"],
  "attendees": ["Name 1", "Name 2"],
  "duration_minutes": 30,
  "sentiment": "positive|neutral|negative",
  "tags": ["tag1", "tag2"],
  "type": "meeting type"
}}

TRANSCRIPT:
{transcript[:8000]}"""

    msg = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=1500,
        messages=[{"role": "user", "content": prompt}]
    )
    
    text = msg.content[0].text.strip()
    # Strip markdown fences if present
    if text.startswith("```"):
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]
    
    return json.loads(text)

def push_to_supabase(meeting_data: dict) -> str:
    """Push analyzed meeting to Supabase."""
    print(f"  📤  Pushing to Supabase...")
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("  ⚠️  No Supabase credentials — skipping push")
        return None
    
    sb = create_client(SUPABASE_URL, SUPABASE_KEY)
    result = sb.table("meetings").insert(meeting_data).execute()
    return result.data[0]["id"] if result.data else None

def process_file(file_path: str, title: str = None):
    """Full pipeline: file → transcript → analysis → Supabase."""
    path = Path(file_path)
    title = title or path.stem.replace("-", " ").replace("_", " ").title()
    
    print(f"\n🚀 MHAI Processing: {title}")
    print(f"   File: {path.name}")
    
    # Step 1: Transcribe
    if path.suffix.lower() in [".txt", ".vtt", ".srt"]:
        transcript = path.read_text()
    else:
        transcript = transcribe_with_whisper(str(path))
    
    # Step 2: Analyze
    if ANTHROPIC_KEY:
        intel = analyze_with_claude(transcript, title)
    else:
        intel = {
            "summary": f"Meeting: {title}. Uploaded without AI analysis (no API key set).",
            "key_decisions": [], "action_items": [], "blockers": [],
            "attendees": ["Unknown"], "duration_minutes": 30,
            "sentiment": "neutral", "tags": ["uploaded"], "type": "Uploaded"
        }
    
    # Step 3: Build full meeting record
    meeting = {
        "id": f"mtg-{int(datetime.datetime.now().timestamp())}",
        "title": title,
        "date": datetime.datetime.now().isoformat(),
        "transcript": transcript[:50000],
        "transcript_preview": transcript[:500],
        "status": "analyzed",
        **intel
    }
    
    # Step 4: Push
    meeting_id = push_to_supabase(meeting)
    
    print(f"\n✅ Done!")
    print(f"   Summary: {intel['summary'][:100]}...")
    print(f"   Decisions: {len(intel['key_decisions'])} | Actions: {len(intel['action_items'])}")
    if meeting_id:
        print(f"   Supabase ID: {meeting_id}")
    
    # Save locally too
    out_path = Path.home() / "Documents" / "MHAI-Archive" / f"{meeting['id']}.json"
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(meeting, indent=2))
    print(f"   Saved: {out_path}")
    
    return meeting

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 transcribe.py <file_path> [title]")
        sys.exit(1)
    
    file_path = sys.argv[1]
    title = sys.argv[2] if len(sys.argv) > 2 else None
    process_file(file_path, title)
