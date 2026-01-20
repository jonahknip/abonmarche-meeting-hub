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
  const data = await response.json()

  if (!response.ok || !data.success) {
    throw new ApiError(data.error || 'Request failed', response.status)
  }

  return data
}

export async function uploadTranscript(
  file: File,
  title?: string,
  date?: string
): Promise<{ meetingId: string }> {
  const formData = new FormData()
  formData.append('transcript', file)
  if (title) formData.append('title', title)
  if (date) formData.append('date', date)

  console.log('Uploading transcript:', { fileName: file.name, fileSize: file.size, title })

  const response = await fetch(`${API_BASE}/api/upload`, {
    method: 'POST',
    body: formData,
  })

  const data = await handleResponse<{ success: boolean; meetingId: string; message: string }>(response)
  console.log('Upload response:', data)

  return { meetingId: data.meetingId }
}

export async function analyzeMeeting(meetingId: string): Promise<{ analysis: AnalysisResult }> {
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
