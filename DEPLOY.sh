#!/bin/bash
# MHAI — Abonmarche Intelligence
# One-shot setup + deploy script
# Run from: ~/Desktop/Milo\ Projects/Abonmarche/Meeting\ Hub/mhai/
# Usage: bash DEPLOY.sh

set -e
echo ""
echo "╔══════════════════════════════════════════╗"
echo "║  MHAI — Abonmarche Intelligence Deploy   ║"
echo "╚══════════════════════════════════════════╝"
echo ""

# --- STEP 1: Get API keys ---
echo "▶ Step 1: API Keys"
echo ""
echo "You need 3 values (press Enter to skip any for now):"
echo ""
read -p "  Supabase URL (from supabase.com → project → Settings → API): " SUPA_URL
read -p "  Supabase Anon Key: " SUPA_KEY
read -p "  Anthropic API Key (sk-ant-...): " ANTHRO_KEY

# Write .env
cat > .env.local << ENV
VITE_SUPABASE_URL=$SUPA_URL
VITE_SUPABASE_ANON_KEY=$SUPA_KEY
VITE_ANTHROPIC_API_KEY=$ANTHRO_KEY
ENV

echo ""
echo "✓ .env.local written"

# --- STEP 2: Install deps ---
echo ""
echo "▶ Step 2: Installing dependencies..."
npm install

# --- STEP 3: Build ---
echo ""
echo "▶ Step 3: Building..."
npm run build
echo "✓ Build complete"

# --- STEP 4: Deploy to Vercel ---
echo ""
echo "▶ Step 4: Deploying to Vercel..."
echo ""

# Check if already linked
if [ -f ".vercel/project.json" ]; then
  echo "  Found existing Vercel project config."
  vercel --prod --yes
else
  echo "  Linking to existing abonmarche-meeting-hub project..."
  vercel link --project abonmarche-meeting-hub --yes 2>/dev/null || true
  vercel --prod --yes
fi

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║  ✅ MHAI is LIVE!                         ║"
echo "╚══════════════════════════════════════════╝"
echo ""
