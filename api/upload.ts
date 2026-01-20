import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

const MAX_FILE_SIZE = 10 * 1024 * 1024
const MIN_TRANSCRIPT_LENGTH = 100

function getSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables')
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

function parseVttContent(content: string): string {
  const lines = content.split('\n')
  const textLines: string[] = []

  for (const line of lines) {
    const trimmed = line.trim()

    if (trimmed === 'WEBVTT' || trimmed.startsWith('NOTE') || trimmed === '') {
      continue
    }

    if (/^\d+$/.test(trimmed)) {
      continue
    }

    if (/^\d{2}:\d{2}/.test(trimmed) || /-->/.test(trimmed)) {
      continue
    }

    if (trimmed.startsWith('<v ')) {
      const match = trimmed.match(/<v ([^>]+)>(.*)/)
      if (match) {
        textLines.push(`${match[1]}: ${match[2].replace(/<\/v>/, '').trim()}`)
      }
      continue
    }

    if (trimmed) {
      textLines.push(trimmed)
    }
  }

  return textLines.join('\n')
}

function parseSrtContent(content: string): string {
  const blocks = content.split(/\n\n+/)
  const textLines: string[] = []

  for (const block of blocks) {
    const lines = block.trim().split('\n')
    if (lines.length >= 3) {
      textLines.push(...lines.slice(2))
    }
  }

  return textLines.join('\n')
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    return res.status(204).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  Object.entries(CORS_HEADERS).forEach(([key, value]) => {
    res.setHeader(key, value)
  })

  try {
    const { transcript, title, date } = req.body || {}

    if (!transcript || typeof transcript !== 'string') {
      return res.status(400).json({ success: false, error: 'transcript is required' })
    }

    let processedTranscript = transcript

    if (transcript.startsWith('WEBVTT')) {
      processedTranscript = parseVttContent(transcript)
    }

    if (processedTranscript.length < MIN_TRANSCRIPT_LENGTH) {
      return res.status(400).json({
        success: false,
        error: `Transcript must be at least ${MIN_TRANSCRIPT_LENGTH} characters`,
      })
    }

    if (processedTranscript.length > MAX_FILE_SIZE) {
      return res.status(413).json({
        success: false,
        error: `Transcript exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`,
      })
    }

    console.log('Creating meeting:', { title: title || 'Untitled', transcriptLength: processedTranscript.length })

    const supabase = getSupabaseClient()

    const { data: meeting, error } = await supabase
      .from('meetings')
      .insert({
        title: title || 'Untitled Meeting',
        date: date || new Date().toISOString(),
        transcript: processedTranscript,
        summary: null,
        topics: [],
        projects: [],
      })
      .select('id')
      .single()

    if (error) {
      console.error('Supabase error:', error)
      return res.status(500).json({ success: false, error: `Database error: ${error.message}` })
    }

    console.log('Meeting created:', meeting.id)

    return res.status(201).json({
      success: true,
      meetingId: meeting.id,
      message: 'Transcript uploaded successfully',
    })
  } catch (error) {
    console.error('Upload error:', error)
    const message = error instanceof Error ? error.message : 'Upload failed'
    return res.status(500).json({ success: false, error: message })
  }
}
