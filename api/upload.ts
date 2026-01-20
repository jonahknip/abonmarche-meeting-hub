import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

const MAX_FILE_SIZE = 10 * 1024 * 1024
const MIN_TRANSCRIPT_LENGTH = 50

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

function detectFormat(content: string): 'vtt' | 'teams-text' | 'srt' | 'plain' {
  const trimmed = content.trim()
  
  if (trimmed.startsWith('WEBVTT') || (trimmed.includes('\n00:') && trimmed.includes(' --> '))) {
    return 'vtt'
  }
  
  if (/^\d+\s*\n\d{2}:\d{2}:\d{2},\d{3}\s*-->\s*\d{2}:\d{2}:\d{2},\d{3}/m.test(trimmed)) {
    return 'srt'
  }
  
  const teamsPatterns = [
    /AI-generated content may be incorrect/i,
    /started transcription/i,
    /\d+\s+minutes?\s+\d+\s+seconds?/i,
  ]
  
  if (teamsPatterns.some(pattern => pattern.test(trimmed))) {
    return 'teams-text'
  }
  
  return 'plain'
}

function parseVttContent(content: string): string {
  const lines = content.split('\n')
  const textLines: string[] = []
  let currentSpeaker: string | null = null
  let buffer: string[] = []

  for (const line of lines) {
    const trimmed = line.trim()

    if (trimmed === 'WEBVTT' || trimmed.startsWith('NOTE') || trimmed.startsWith('Kind:') || trimmed.startsWith('Language:') || !trimmed) {
      if (buffer.length > 0) {
        const text = buffer.join(' ').trim()
        textLines.push(currentSpeaker ? `${currentSpeaker}: ${text}` : text)
        buffer = []
      }
      continue
    }

    if (/^\d+$/.test(trimmed)) continue
    if (/^\d{2}:\d{2}/.test(trimmed) || trimmed.includes('-->')) continue

    const speakerTagMatch = trimmed.match(/<v\s+([^>]+)>(.*)/)
    if (speakerTagMatch) {
      if (buffer.length > 0) {
        const text = buffer.join(' ').trim()
        textLines.push(currentSpeaker ? `${currentSpeaker}: ${text}` : text)
        buffer = []
      }
      currentSpeaker = speakerTagMatch[1].trim()
      const text = speakerTagMatch[2].replace(/<\/v>/g, '').trim()
      if (text) buffer.push(text)
      continue
    }

    const cleanText = trimmed.replace(/<\/?v[^>]*>/g, '').trim()
    if (cleanText) buffer.push(cleanText)
  }

  if (buffer.length > 0) {
    const text = buffer.join(' ').trim()
    textLines.push(currentSpeaker ? `${currentSpeaker}: ${text}` : text)
  }

  return textLines.join('\n')
}

function parseTeamsTextContent(content: string): string {
  const lines = content.split('\n')
  const entries: { speaker: string | null; timestamp: string | null; text: string }[] = []
  let currentSpeaker: string | null = null
  let currentTimestamp: string | null = null
  let textBuffer: string[] = []

  const cleanedLines = lines.filter(line => {
    const trimmed = line.trim().toLowerCase()
    return !trimmed.includes('ai-generated content may be incorrect') &&
           !trimmed.includes('started transcription')
  })

  for (const line of cleanedLines) {
    const trimmed = line.trim()
    if (!trimmed) continue

    const shortTimestamp = /^(\d{1,2}):(\d{2})$/.exec(trimmed)
    const longTimestamp = /^(\d+)\s+minutes?\s+(\d+)\s+seconds?$/i.exec(trimmed)

    if (shortTimestamp || longTimestamp) {
      if (shortTimestamp) {
        currentTimestamp = trimmed
      } else if (longTimestamp) {
        currentTimestamp = `${longTimestamp[1]}:${longTimestamp[2].padStart(2, '0')}`
      }
      continue
    }

    const speakerPattern = /^([A-Z][a-zA-Z'-]+(?:\s+[A-Z][a-zA-Z'-]+)*)(?:\s+(\d{1,2}:\d{2}|\d+\s+minutes?\s+\d+\s+seconds?))?$/
    const speakerWithTimestamp = /^([A-Z][a-zA-Z'-]+(?:\s+[A-Z][a-zA-Z'-]+)*)\s+(\d+\s+minutes?\s+\d+\s+seconds?|\d{1,2}:\d{2})$/i.exec(trimmed)
    const speakerMatch = speakerPattern.exec(trimmed)

    if (speakerMatch || speakerWithTimestamp) {
      if (textBuffer.length > 0 && currentSpeaker) {
        entries.push({
          speaker: currentSpeaker,
          timestamp: currentTimestamp,
          text: textBuffer.join(' ').trim()
        })
        textBuffer = []
      }

      if (speakerWithTimestamp) {
        currentSpeaker = speakerWithTimestamp[1].trim()
        const ts = speakerWithTimestamp[2]
        const longTs = /(\d+)\s+minutes?\s+(\d+)\s+seconds?/i.exec(ts)
        currentTimestamp = longTs ? `${longTs[1]}:${longTs[2].padStart(2, '0')}` : ts
      } else if (speakerMatch) {
        currentSpeaker = speakerMatch[1].trim()
        if (speakerMatch[2]) {
          const ts = speakerMatch[2]
          const longTs = /(\d+)\s+minutes?\s+(\d+)\s+seconds?/i.exec(ts)
          currentTimestamp = longTs ? `${longTs[1]}:${longTs[2].padStart(2, '0')}` : ts
        }
      }
      continue
    }

    const duplicateSpeakerCheck = /^([A-Z][a-zA-Z'-]+(?:\s+[A-Z][a-zA-Z'-]+)*)\s+\d/
    if (duplicateSpeakerCheck.test(trimmed) && currentSpeaker && trimmed.startsWith(currentSpeaker)) {
      continue
    }

    if (trimmed) {
      textBuffer.push(trimmed)
    }
  }

  if (textBuffer.length > 0) {
    entries.push({
      speaker: currentSpeaker,
      timestamp: currentTimestamp,
      text: textBuffer.join(' ').trim()
    })
  }

  return entries
    .filter(e => e.text)
    .map(e => {
      const parts: string[] = []
      if (e.timestamp) parts.push(`[${e.timestamp}]`)
      if (e.speaker) parts.push(`${e.speaker}:`)
      parts.push(e.text)
      return parts.join(' ')
    })
    .join('\n\n')
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

function parseTranscript(content: string): string {
  const format = detectFormat(content)
  
  switch (format) {
    case 'vtt':
      return parseVttContent(content)
    case 'teams-text':
      return parseTeamsTextContent(content)
    case 'srt':
      return parseSrtContent(content)
    default:
      return content.trim()
  }
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
      return res.status(400).json({ 
        success: false, 
        error: 'Transcript content is required. Please paste or upload a transcript.' 
      })
    }

    const trimmedTranscript = transcript.trim()
    
    if (trimmedTranscript.length < MIN_TRANSCRIPT_LENGTH) {
      return res.status(400).json({
        success: false,
        error: `Transcript must be at least ${MIN_TRANSCRIPT_LENGTH} characters. Current: ${trimmedTranscript.length}`,
      })
    }

    if (trimmedTranscript.length > MAX_FILE_SIZE) {
      return res.status(413).json({
        success: false,
        error: `Transcript exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`,
      })
    }

    const format = detectFormat(trimmedTranscript)
    console.log('Detected format:', format)
    
    const processedTranscript = parseTranscript(trimmedTranscript)
    console.log('Creating meeting:', { 
      title: title || 'Untitled', 
      format,
      originalLength: trimmedTranscript.length,
      processedLength: processedTranscript.length 
    })

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
