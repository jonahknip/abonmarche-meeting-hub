# MHAI — Quick Setup Guide
**Meeting Hub A.I. — Abonmarche Intelligence**

---

## Step 1 — Extract this folder

Download `mhai-final.tar.gz` and extract it, or copy this folder to:

```
~/Desktop/Milo Projects/Abonmarche/Meeting Hub/mhai/
```

---

## Step 2 — Get your 3 API keys

**Supabase** (use your existing Meeting Hub project):
- Go to: https://supabase.com → your project → Settings → API
- Copy: Project URL + anon/public key

**Anthropic** (for the MHAI chatbot):
- Go to: https://console.anthropic.com/settings/api-keys
- Copy your `sk-ant-...` key

---

## Step 3 — One command to deploy

Open Terminal, `cd` into this folder, then run:

```bash
bash DEPLOY.sh
```

It will:
1. Ask for your 3 keys (paste them in)
2. `npm install` all dependencies
3. `npm run build` the production app
4. `vercel --prod` to push to Vercel

You'll get a live URL at the end like:
`https://abonmarche-meeting-hub.vercel.app`

---

## Step 4 — Add keys to Vercel (for persistence)

After deploy, go to:
**Vercel → Project → Settings → Environment Variables**

Add:
```
VITE_SUPABASE_URL        = your url
VITE_SUPABASE_ANON_KEY   = your key
VITE_ANTHROPIC_API_KEY   = sk-ant-...
```

Then trigger a redeploy.

---

## What's inside right now

**5 meetings pre-loaded:**
- Return to Work — Day One (Jeff, Brad, Justin, Anne)
- Weekly Scrum March 23 (Benton Harbor, Pumpkin Vine)
- Plan Review Agent Testing with Garrick (84% coverage)
- AI Community of Practice Q1
- Meeting Hub Architecture Session

**Week One Plan** — all your priorities for this week, interactive checkboxes

**MHAI Chatbot** — asks Claude about all your meetings. Works immediately with your Anthropic key. Smart fallback works even without a key.

---

## Whisper Pipeline (auto-capture)

The `pipeline/` folder contains local scripts for:
- Watching a folder for new audio/video files
- Transcribing with Whisper
- Pushing to Supabase automatically

Run once to set up:
```bash
cd pipeline && bash setup.sh
```

Then start watching:
```bash
python3 watch.py
```

Any `.mp3`, `.mp4`, `.wav`, or `.m4a` you drop in `~/Documents/MHAI-Inbox/` gets transcribed and sent to your dashboard automatically.

---

## Architecture

```
MHAI Frontend (React/Vite → Vercel)
    ↕
Supabase (PostgreSQL — meetings, transcripts, actions)
    ↕
Claude API (chatbot + meeting analysis)
    ↕
Whisper Pipeline (local Mac — audio → transcript → Supabase)
```
