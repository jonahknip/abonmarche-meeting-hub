# MHAI — Meeting Hub A.I. · Abonmarche Intelligence

> Every meeting. Every decision. Always findable.

A production-grade meeting intelligence platform for Abonmarche Consultants. Captures, transcribes, analyzes, and makes every meeting searchable via natural language AI.

---

## Stack

| Layer | Tech |
|-------|------|
| Frontend | React + Vite + Tailwind CSS |
| Hosting | Vercel |
| Database | Supabase (PostgreSQL) |
| AI Brain | Claude (Anthropic API) |
| Transcription | OpenAI Whisper (local) |
| Pipeline | Python script (runs on Mac/PC) |

---

## Quick Start

### 1. Frontend

```bash
npm install
cp .env.example .env.local
# Fill in VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_ANTHROPIC_API_KEY
npm run dev
```

### 2. Deploy to Vercel

```bash
npm install -g vercel
vercel --prod
# Set env vars in Vercel dashboard → Settings → Environment Variables
```

### 3. Pipeline (Mac/PC)

```bash
cd pipeline
bash setup.sh
ANTHROPIC_API_KEY=sk-ant-... SUPABASE_URL=... SUPABASE_ANON_KEY=... python3 transcribe.py
```

Drop any `.mp3`, `.mp4`, `.wav`, `.txt`, or `.vtt` file into `~/Desktop/MeetingDrop` — the pipeline handles the rest.

---

## Features

- **Upload anything** — audio, video, transcript files
- **Whisper transcription** — local, private, free
- **Claude AI analysis** — decisions, actions, blockers, sentiment, tags
- **Conversational search** — ask questions in plain English
- **Week One Plan** — interactive day-by-day task tracker
- **Background capture** — watch folder mode for passive ingestion

---

## Supabase Schema

```sql
create table meetings (
  id               uuid default gen_random_uuid() primary key,
  created_at       timestamptz default now(),
  title            text not null,
  date             timestamptz,
  duration_minutes int,
  attendees        jsonb,
  type             text,
  status           text default 'analyzed',
  summary          text,
  key_decisions    jsonb,
  action_items     jsonb,
  blockers         jsonb,
  sentiment        text,
  tags             jsonb,
  quote            text,
  transcript       text,
  source_file      text
);

-- Enable full text search
create index meetings_fts on meetings using gin(to_tsvector('english', coalesce(title,'') || ' ' || coalesce(summary,'') || ' ' || coalesce(transcript,'')));
```

---

## Developer: Jonah Knipper — AI Solutions Lead, Abonmarche Consultants
