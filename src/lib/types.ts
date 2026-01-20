export type MeetingType = 'client' | 'internal' | 'one-on-one' | 'project'
export type Sentiment = 'productive' | 'neutral' | 'tense'

export interface Person {
  id: string
  name: string
  role: string
  email: string
  avatar?: string
}

export interface Channel {
  id: string
  name: string
  slug: string
}

export interface ActionItem {
  id: string
  meetingId: string
  task: string
  ownerId: string
  due?: string
  status: 'todo' | 'in_progress' | 'done' | 'blocked'
  order: number
}

export interface Meeting {
  id: string
  title: string
  date: string
  channelId: string
  type: MeetingType
  participants: string[]
  transcript: string
  summary: string
  keyDecisions: string[]
  topics: string[]
  sentiment: Sentiment
  actionItemIds: string[]
  followUpDraft: string
  insights: string[]
  riskFlags: string[]
  relatedMeetingIds: string[]
  createdAt: string
  updatedAt: string
}

export interface Comment {
  id: string
  meetingId: string
  parentId?: string
  authorId: string
  text: string
  createdAt: string
  reactions: string[]
}

export interface Settings {
  mockMode: boolean
}

export interface UiState {
  sidebarOpen: boolean
  uploadModalOpen: boolean
  actionItemsView: 'list' | 'kanban'
  commandPaletteOpen: boolean
  analyticsRange: 'week' | 'month' | 'quarter' | 'all'
}

export interface AppState {
  meetings: Meeting[]
  actionItems: ActionItem[]
  people: Person[]
  channels: Channel[]
  comments: Comment[]
  settings: Settings
  ui: UiState
}

export interface AnalysisMetadata {
  title: string
  date: string
  channelId: string
  type: MeetingType
  participants: string[]
}

export interface AnalysisResult {
  summary: string
  keyDecisions: string[]
  topics: string[]
  sentiment: Sentiment
  actionItems: Array<{ task: string; ownerId?: string; due?: string; status?: ActionItem['status'] }>
  followUpDraft: string
  insights: string[]
  riskFlags: string[]
}
