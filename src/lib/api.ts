const API_BASE = import.meta.env.VITE_API_URL || ''

export interface Meeting {
  id: string
  title: string
  date: string
  transcript: string
  summary?: string
  topics?: string[]
  projects?: string[]
  created_at: string
  updated_at: string
}

export interface ActionItem {
  id: string
  meeting_id: string
  task: string
  assignee?: string
  due_date?: string
  status: 'todo' | 'in-progress' | 'done'
  priority: 'low' | 'medium' | 'high'
  confidence?: number
  created_at: string
}

export interface Decision {
  id: string
  meeting_id: string
  decision: string
  context: string
  confidence?: number
  created_at: string
}

export interface Risk {
  id: string
  meeting_id: string
  risk: string
  severity: 'low' | 'medium' | 'high'
  mitigation?: string
  confidence?: number
  created_at: string
}

export interface FollowUp {
  id: string
  meeting_id: string
  purpose: string
  attendees: string[]
  suggested_date?: string
  confidence?: number
  created_at: string
}

export interface MeetingWithRelations extends Meeting {
  actionItems: ActionItem[]
  decisions: Decision[]
  risks: Risk[]
  followUps: FollowUp[]
}

export interface AnalysisResult {
  summary: string
  actionItemsCount: number
  decisionsCount: number
  risksCount: number
  followUpsCount: number
  topics: string[]
  projects: string[]
}

export interface PaginationInfo {
  total: number
  limit: number
  offset: number
  hasMore: boolean
}

class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  let data: Record<string, unknown>
  
  try {
    data = await response.json()
  } catch {
    throw new ApiError('Invalid server response', response.status)
  }

  if (!response.ok || !data.success) {
    const errorMessage = typeof data.error === 'string' ? data.error : 'Request failed'
    throw new ApiError(errorMessage, response.status)
  }

  return data as T
}

export async function uploadTranscript(
  transcriptContent: string,
  title?: string,
  date?: string
): Promise<{ meetingId: string }> {
  if (!transcriptContent || transcriptContent.trim().length < 50) {
    throw new ApiError('Transcript must be at least 50 characters', 400)
  }

  console.log('Uploading transcript:', { 
    contentLength: transcriptContent.length, 
    title,
    preview: transcriptContent.slice(0, 100) 
  })

  const response = await fetch(`${API_BASE}/api/upload`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      transcript: transcriptContent,
      title: title || 'Untitled Meeting',
      date: date || new Date().toISOString(),
    }),
  })

  const data = await handleResponse<{ success: boolean; meetingId: string; message: string }>(response)
  console.log('Upload response:', data)

  return { meetingId: data.meetingId }
}

export async function analyzeMeeting(meetingId: string): Promise<{ analysis: AnalysisResult }> {
  if (!meetingId) {
    throw new ApiError('Meeting ID is required', 400)
  }
  
  console.log('Requesting analysis for meeting:', meetingId)

  const response = await fetch(`${API_BASE}/api/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ meetingId }),
  })

  const data = await handleResponse<{ success: boolean; meetingId: string; analysis: AnalysisResult }>(response)
  console.log('Analysis response:', data)

  return { analysis: data.analysis }
}

export async function getMeeting(id: string): Promise<{ meeting: MeetingWithRelations }> {
  if (!id) {
    throw new ApiError('Meeting ID is required', 400)
  }
  
  console.log('Fetching meeting:', id)

  const response = await fetch(`${API_BASE}/api/meetings?id=${encodeURIComponent(id)}`)

  const data = await handleResponse<{ success: boolean; meeting: MeetingWithRelations }>(response)
  console.log('Meeting fetched:', { id: data.meeting.id, title: data.meeting.title })

  return { meeting: data.meeting }
}

export async function listMeetings(
  limit: number = 50,
  offset: number = 0
): Promise<{ meetings: Meeting[]; pagination: PaginationInfo }> {
  console.log('Listing meetings:', { limit, offset })

  const response = await fetch(`${API_BASE}/api/meetings?limit=${limit}&offset=${offset}`)

  const data = await handleResponse<{
    success: boolean
    meetings: Meeting[]
    pagination: PaginationInfo
  }>(response)
  console.log('Meetings listed:', { count: data.meetings.length, total: data.pagination.total })

  return { meetings: data.meetings, pagination: data.pagination }
}

export async function searchMeetings(query: string): Promise<{ meetings: Meeting[] }> {
  console.log('Searching meetings:', query)

  const response = await fetch(`${API_BASE}/api/meetings?search=${encodeURIComponent(query)}`)

  const data = await handleResponse<{ success: boolean; meetings: Meeting[] }>(response)
  console.log('Search results:', data.meetings.length)

  return { meetings: data.meetings }
}

export function downloadTranscript(meeting: MeetingWithRelations, format: 'txt' | 'md' = 'txt'): void {
  let content: string
  let filename: string
  let mimeType: string

  if (format === 'md') {
    content = generateMarkdownExport(meeting)
    filename = `${sanitizeFilename(meeting.title)}.md`
    mimeType = 'text/markdown'
  } else {
    content = generateTextExport(meeting)
    filename = `${sanitizeFilename(meeting.title)}.txt`
    mimeType = 'text/plain'
  }

  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

function sanitizeFilename(name: string): string {
  return name
    .replace(/[<>:"/\\|?*]/g, '-')
    .replace(/\s+/g, '_')
    .slice(0, 100)
}

function generateTextExport(meeting: MeetingWithRelations): string {
  const lines: string[] = [
    `MEETING TRANSCRIPT`,
    `==================`,
    ``,
    `Title: ${meeting.title}`,
    `Date: ${new Date(meeting.date).toLocaleString()}`,
    ``,
  ]

  if (meeting.summary) {
    lines.push(`SUMMARY`, `-------`, meeting.summary, ``)
  }

  if (meeting.topics?.length) {
    lines.push(`TOPICS`, `------`, meeting.topics.join(', '), ``)
  }

  if (meeting.projects?.length) {
    lines.push(`PROJECTS`, `--------`, meeting.projects.join(', '), ``)
  }

  if (meeting.actionItems.length) {
    lines.push(`ACTION ITEMS`, `------------`)
    meeting.actionItems.forEach((item, i) => {
      const status = item.status === 'done' ? '[x]' : '[ ]'
      lines.push(`${i + 1}. ${status} ${item.task}`)
      if (item.assignee) lines.push(`   Assigned: ${item.assignee}`)
      if (item.due_date) lines.push(`   Due: ${new Date(item.due_date).toLocaleDateString()}`)
      lines.push(`   Priority: ${item.priority}`)
    })
    lines.push(``)
  }

  if (meeting.decisions.length) {
    lines.push(`DECISIONS`, `---------`)
    meeting.decisions.forEach((d, i) => {
      lines.push(`${i + 1}. ${d.decision}`)
      if (d.context) lines.push(`   Context: ${d.context}`)
    })
    lines.push(``)
  }

  if (meeting.risks.length) {
    lines.push(`RISKS`, `-----`)
    meeting.risks.forEach((r, i) => {
      lines.push(`${i + 1}. [${r.severity.toUpperCase()}] ${r.risk}`)
      if (r.mitigation) lines.push(`   Mitigation: ${r.mitigation}`)
    })
    lines.push(``)
  }

  if (meeting.followUps.length) {
    lines.push(`FOLLOW-UPS`, `----------`)
    meeting.followUps.forEach((f, i) => {
      lines.push(`${i + 1}. ${f.purpose}`)
      if (f.attendees.length) lines.push(`   Attendees: ${f.attendees.join(', ')}`)
      if (f.suggested_date) lines.push(`   Suggested: ${new Date(f.suggested_date).toLocaleDateString()}`)
    })
    lines.push(``)
  }

  lines.push(`TRANSCRIPT`, `----------`, meeting.transcript)

  return lines.join('\n')
}

function generateMarkdownExport(meeting: MeetingWithRelations): string {
  const lines: string[] = [
    `# ${meeting.title}`,
    ``,
    `**Date:** ${new Date(meeting.date).toLocaleString()}`,
    ``,
  ]

  if (meeting.summary) {
    lines.push(`## Summary`, ``, meeting.summary, ``)
  }

  if (meeting.topics?.length) {
    lines.push(`## Topics`, ``, meeting.topics.map(t => `- ${t}`).join('\n'), ``)
  }

  if (meeting.projects?.length) {
    lines.push(`## Projects`, ``, meeting.projects.map(p => `- ${p}`).join('\n'), ``)
  }

  if (meeting.actionItems.length) {
    lines.push(`## Action Items`, ``)
    meeting.actionItems.forEach(item => {
      const checkbox = item.status === 'done' ? '[x]' : '[ ]'
      let line = `- ${checkbox} ${item.task}`
      const meta: string[] = []
      if (item.assignee) meta.push(`@${item.assignee}`)
      if (item.due_date) meta.push(`due: ${new Date(item.due_date).toLocaleDateString()}`)
      meta.push(`priority: ${item.priority}`)
      line += ` *(${meta.join(', ')})*`
      lines.push(line)
    })
    lines.push(``)
  }

  if (meeting.decisions.length) {
    lines.push(`## Decisions`, ``)
    meeting.decisions.forEach(d => {
      lines.push(`- **${d.decision}**${d.context ? `: ${d.context}` : ''}`)
    })
    lines.push(``)
  }

  if (meeting.risks.length) {
    lines.push(`## Risks`, ``)
    meeting.risks.forEach(r => {
      const badge = r.severity === 'high' ? '🔴' : r.severity === 'medium' ? '🟡' : '🟢'
      lines.push(`- ${badge} **${r.risk}**${r.mitigation ? ` — Mitigation: ${r.mitigation}` : ''}`)
    })
    lines.push(``)
  }

  if (meeting.followUps.length) {
    lines.push(`## Follow-ups`, ``)
    meeting.followUps.forEach(f => {
      let line = `- ${f.purpose}`
      if (f.attendees.length) line += ` *(${f.attendees.join(', ')})*`
      if (f.suggested_date) line += ` — ${new Date(f.suggested_date).toLocaleDateString()}`
      lines.push(line)
    })
    lines.push(``)
  }

  lines.push(`## Transcript`, ``, '```', meeting.transcript, '```')

  return lines.join('\n')
}
