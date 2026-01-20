/**
 * Teams Transcript Parser
 * Handles multiple formats:
 * - VTT files (WebVTT with speaker tags)
 * - Teams plain text format (copy/paste from Teams)
 * - SRT subtitle files
 * - Raw text
 */

export interface TeamsTranscript {
  id: string
  meetingId: string
  title: string
  startTime: string
  endTime: string
  participants: string[]
  transcriptText: string
}

export interface ParsedTranscriptEntry {
  speaker: string | null
  timestamp: string | null
  text: string
}

export interface ParsedTranscript {
  entries: ParsedTranscriptEntry[]
  participants: string[]
  rawText: string
  format: 'vtt' | 'teams-text' | 'srt' | 'plain'
}

// Teams Graph API placeholder
export async function getTeamsTranscripts(): Promise<TeamsTranscript[]> {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('graph_access_token') : null
  if (!token) return []
  return []
}

export const teamsConnectionInstructions = `
To connect Microsoft Teams:
1. IT admin must enable Graph API for meeting transcripts
2. Sign in with Microsoft work account
3. Grant transcript permissions
Required Graph permissions:
- OnlineMeetingTranscript.Read.All
- OnlineMeetings.Read
`

/**
 * Detect transcript format
 */
export function detectTranscriptFormat(content: string): 'vtt' | 'teams-text' | 'srt' | 'plain' {
  const trimmed = content.trim()
  
  // VTT format detection
  if (trimmed.startsWith('WEBVTT') || trimmed.includes('\n00:') && trimmed.includes(' --> ')) {
    return 'vtt'
  }
  
  // SRT format detection (numbered blocks with --> timestamps)
  if (/^\d+\s*\n\d{2}:\d{2}:\d{2},\d{3}\s*-->\s*\d{2}:\d{2}:\d{2},\d{3}/m.test(trimmed)) {
    return 'srt'
  }
  
  // Teams text format detection
  // Look for patterns like "5:43", "5 minutes 43 seconds", "AI-generated content"
  // or speaker names followed by timestamps
  const teamsPatterns = [
    /AI-generated content may be incorrect/i,
    /started transcription/i,
    /\d+\s+minutes?\s+\d+\s+seconds?/i,
    /^\d{1,2}:\d{2}\s*$/m,
    /\d{1,2}:\d{2}\s*\n[A-Z][a-z]+\s+[A-Z][a-z]+/m,
  ]
  
  if (teamsPatterns.some(pattern => pattern.test(trimmed))) {
    return 'teams-text'
  }
  
  return 'plain'
}

/**
 * Parse VTT (WebVTT) transcript format
 * Handles both standard VTT and Teams-specific VTT with speaker tags
 */
export function parseVttTranscript(content: string): string {
  const lines = content.split('\n')
  const entries: ParsedTranscriptEntry[] = []
  let currentSpeaker: string | null = null
  let buffer: string[] = []
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()
    
    // Skip WEBVTT header and NOTE blocks
    if (trimmed === 'WEBVTT' || trimmed.startsWith('NOTE') || trimmed.startsWith('Kind:') || trimmed.startsWith('Language:')) {
      continue
    }
    
    // Skip empty lines - process buffer
    if (!trimmed) {
      if (buffer.length > 0) {
        entries.push({
          speaker: currentSpeaker,
          timestamp: null,
          text: buffer.join(' ').trim()
        })
        buffer = []
      }
      continue
    }
    
    // Skip cue identifiers (numeric lines)
    if (/^\d+$/.test(trimmed)) {
      continue
    }
    
    // Skip timestamp lines
    if (/^\d{2}:\d{2}/.test(trimmed) || trimmed.includes('-->')) {
      continue
    }
    
    // Handle speaker tags: <v Speaker Name>text</v>
    const speakerTagMatch = trimmed.match(/<v\s+([^>]+)>(.*)/)
    if (speakerTagMatch) {
      // Save previous buffer if exists
      if (buffer.length > 0) {
        entries.push({
          speaker: currentSpeaker,
          timestamp: null,
          text: buffer.join(' ').trim()
        })
        buffer = []
      }
      
      currentSpeaker = speakerTagMatch[1].trim()
      const text = speakerTagMatch[2].replace(/<\/v>/g, '').trim()
      if (text) {
        buffer.push(text)
      }
      continue
    }
    
    // Handle closing tags and continuation text
    const cleanText = trimmed.replace(/<\/?v[^>]*>/g, '').trim()
    if (cleanText) {
      buffer.push(cleanText)
    }
  }
  
  // Process remaining buffer
  if (buffer.length > 0) {
    entries.push({
      speaker: currentSpeaker,
      timestamp: null,
      text: buffer.join(' ').trim()
    })
  }
  
  // Format output with speaker names
  return entries
    .filter(e => e.text)
    .map(e => e.speaker ? `${e.speaker}: ${e.text}` : e.text)
    .join('\n')
}

/**
 * Parse Teams plain text transcript format
 * Handles the copy/paste format from Teams with timestamps like:
 * "5:43" or "5 minutes 43 seconds"
 */
export function parseTeamsTextTranscript(content: string): string {
  const lines = content.split('\n')
  const entries: ParsedTranscriptEntry[] = []
  let currentSpeaker: string | null = null
  let currentTimestamp: string | null = null
  let textBuffer: string[] = []
  
  // Remove the AI-generated warning header
  const cleanedLines = lines.filter(line => {
    const trimmed = line.trim().toLowerCase()
    return !trimmed.includes('ai-generated content may be incorrect') &&
           !trimmed.includes('started transcription')
  })
  
  for (let i = 0; i < cleanedLines.length; i++) {
    const line = cleanedLines[i]
    const trimmed = line.trim()
    
    if (!trimmed) continue
    
    // Check if line is a timestamp only (like "5:43" or "5 minutes 43 seconds")
    const shortTimestamp = /^(\d{1,2}):(\d{2})$/.exec(trimmed)
    const longTimestamp = /^(\d+)\s+minutes?\s+(\d+)\s+seconds?$/i.exec(trimmed)
    
    if (shortTimestamp || longTimestamp) {
      // This is just a timestamp line, save it and continue
      if (shortTimestamp) {
        currentTimestamp = trimmed
      } else if (longTimestamp) {
        currentTimestamp = `${longTimestamp[1]}:${longTimestamp[2].padStart(2, '0')}`
      }
      continue
    }
    
    // Check if line is a speaker name (capitalized words, no punctuation at end)
    // Speaker names typically appear on their own line or with timestamp
    const speakerPattern = /^([A-Z][a-zA-Z'-]+(?:\s+[A-Z][a-zA-Z'-]+)*)(?:\s+(\d{1,2}:\d{2}|\d+\s+minutes?\s+\d+\s+seconds?))?$/
    const speakerMatch = speakerPattern.exec(trimmed)
    
    // Also check for "Speaker Name X minutes Y seconds" format
    const speakerWithTimestamp = /^([A-Z][a-zA-Z'-]+(?:\s+[A-Z][a-zA-Z'-]+)*)\s+(\d+\s+minutes?\s+\d+\s+seconds?|\d{1,2}:\d{2})$/i.exec(trimmed)
    
    if (speakerMatch || speakerWithTimestamp) {
      // Save previous entry
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
    
    // Check for duplicate speaker name with timestamp (Teams sometimes shows this)
    // "Garrick Garcia 5 minutes 58 seconds" followed by same speaker content
    const duplicateSpeakerCheck = /^([A-Z][a-zA-Z'-]+(?:\s+[A-Z][a-zA-Z'-]+)*)\s+\d/
    if (duplicateSpeakerCheck.test(trimmed) && currentSpeaker && trimmed.startsWith(currentSpeaker)) {
      // Skip duplicate speaker line
      continue
    }
    
    // This is content text
    if (trimmed) {
      textBuffer.push(trimmed)
    }
  }
  
  // Save final entry
  if (textBuffer.length > 0) {
    entries.push({
      speaker: currentSpeaker,
      timestamp: currentTimestamp,
      text: textBuffer.join(' ').trim()
    })
  }
  
  // Format output
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

/**
 * Parse SRT subtitle format
 */
export function parseSrtTranscript(content: string): string {
  const blocks = content.split(/\n\n+/)
  const entries: string[] = []
  
  for (const block of blocks) {
    const lines = block.trim().split('\n')
    
    // SRT blocks: [index, timestamp, ...text lines]
    if (lines.length >= 3) {
      // Skip index (line 0) and timestamp (line 1)
      const text = lines.slice(2).join(' ').trim()
      if (text) {
        entries.push(text)
      }
    }
  }
  
  return entries.join('\n')
}

/**
 * Main parsing function - auto-detects format and parses accordingly
 */
export function parseTranscript(content: string): ParsedTranscript {
  const format = detectTranscriptFormat(content)
  let rawText: string
  
  switch (format) {
    case 'vtt':
      rawText = parseVttTranscript(content)
      break
    case 'teams-text':
      rawText = parseTeamsTextTranscript(content)
      break
    case 'srt':
      rawText = parseSrtTranscript(content)
      break
    default:
      rawText = content.trim()
  }
  
  // Extract unique participants from the parsed text
  const participants = extractParticipants(rawText)
  
  // Parse into structured entries for the UI
  const entries = rawText.split('\n\n').filter(Boolean).map(block => {
    const speakerMatch = block.match(/^(?:\[[\d:]+\]\s*)?([^:]+):\s*(.*)$/s)
    if (speakerMatch) {
      const timestampMatch = block.match(/^\[(\d{1,2}:\d{2})\]/)
      return {
        speaker: speakerMatch[1].trim(),
        timestamp: timestampMatch ? timestampMatch[1] : null,
        text: speakerMatch[2].trim()
      }
    }
    return {
      speaker: null,
      timestamp: null,
      text: block.trim()
    }
  })
  
  return {
    entries,
    participants,
    rawText,
    format
  }
}

/**
 * Extract unique participant names from parsed transcript
 */
export function extractParticipants(text: string): string[] {
  const speakerPattern = /^(?:\[[\d:]+\]\s*)?([A-Z][a-zA-Z'-]+(?:\s+[A-Z][a-zA-Z'-]+)*):/gm
  const speakers = new Set<string>()
  
  let match
  while ((match = speakerPattern.exec(text)) !== null) {
    const name = match[1].trim()
    // Filter out common false positives
    if (!['Note', 'Warning', 'Error', 'Info', 'TODO', 'WEBVTT'].includes(name)) {
      speakers.add(name)
    }
  }
  
  return Array.from(speakers).sort()
}

/**
 * Validate transcript content
 */
export function validateTranscript(content: string): { valid: boolean; error?: string } {
  if (!content || typeof content !== 'string') {
    return { valid: false, error: 'No transcript content provided' }
  }
  
  const trimmed = content.trim()
  
  if (trimmed.length < 50) {
    return { valid: false, error: 'Transcript is too short (minimum 50 characters)' }
  }
  
  if (trimmed.length > 10 * 1024 * 1024) {
    return { valid: false, error: 'Transcript exceeds 10MB limit' }
  }
  
  // Check if it's just binary garbage
  const nonPrintableRatio = (trimmed.match(/[^\x20-\x7E\n\r\t]/g) || []).length / trimmed.length
  if (nonPrintableRatio > 0.1) {
    return { valid: false, error: 'File appears to be binary. Please upload a text file or paste the transcript text.' }
  }
  
  return { valid: true }
}

/**
 * Format transcript for display with proper styling
 */
export function formatTranscriptForDisplay(content: string): string {
  const { rawText, format } = parseTranscript(content)
  
  // For Teams and VTT formats, we already have proper formatting
  if (format === 'vtt' || format === 'teams-text') {
    return rawText
  }
  
  // For plain text, just clean it up
  return rawText
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .join('\n')
}
