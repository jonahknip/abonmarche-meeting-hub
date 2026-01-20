export interface TeamsTranscript {
  id: string
  meetingId: string
  title: string
  startTime: string
  endTime: string
  participants: string[]
  transcriptText: string
}

export async function getTeamsTranscripts(): Promise<TeamsTranscript[]> {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('graph_access_token') : null
  if (!token) return []
  // Real implementation would call Graph API; return empty until wired
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

export function parseVttTranscript(vttContent: string): string {
  const lines = vttContent.split('\n')
  const textLines: string[] = []
  let buffer: string[] = []

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) {
      if (buffer.length) {
        textLines.push(buffer.join(' '))
        buffer = []
      }
      continue
    }
    if (trimmed === 'WEBVTT' || trimmed.includes('-->')) continue
    if (/^\d+$/.test(trimmed)) continue
    buffer.push(trimmed)
  }
  if (buffer.length) textLines.push(buffer.join(' '))
  return textLines.join('\n')
}

export function parseDocxTranscript(text: string): string {
  return text
    .split('\n')
    .filter((line) => !line.match(/^\d{1,2}:\d{2}:\d{2}/))
    .join('\n')
}
