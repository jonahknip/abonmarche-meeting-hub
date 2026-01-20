import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { nanoid } from 'nanoid'
import { seedActionItems, seedChannels, seedMeetings, seedPeople } from '../lib/mockData'
import type { ActionItem, AppState, Meeting, Settings, UiState } from '../lib/types'

const STORAGE_KEY = 'abonmarche-meeting-hub-v1'
const MAX_TRANSCRIPT_CHARS = 100_000

const baseUiState: UiState = {
  sidebarOpen: true,
  uploadModalOpen: false,
  actionItemsView: 'kanban',
  commandPaletteOpen: false,
  analyticsRange: 'month',
}

const baseSettings: Settings = {
  mockMode: import.meta.env.VITE_MOCK_MODE !== 'false',
}

const initialState: AppState = {
  meetings: seedMeetings,
  actionItems: seedActionItems,
  people: seedPeople,
  channels: seedChannels,
  comments: [],
  settings: baseSettings,
  ui: baseUiState,
}

console.log('[store:init] meetings', seedMeetings.length, 'actionItems', seedActionItems.length)

interface Actions {
  addMeeting: (meeting: Omit<Meeting, 'id' | 'createdAt' | 'updatedAt' | 'actionItemIds'> & { actionItems?: Omit<ActionItem, 'id'>[] }) => string
  updateMeeting: (id: string, updates: Partial<Meeting>) => void
  deleteMeeting: (id: string) => void
  addActionItem: (item: Omit<ActionItem, 'id'>) => string
  updateActionItem: (id: string, updates: Partial<ActionItem>) => void
  deleteActionItem: (id: string) => void
  reorderActionItems: (meetingId: string, orderedIds: string[]) => void
  toggleSidebar: (value?: boolean) => void
  toggleUploadModal: (value?: boolean) => void
  setMockMode: (value: boolean) => void
  setActionItemsView: (view: UiState['actionItemsView']) => void
  toggleCommandPalette: (value?: boolean) => void
  setAnalyticsRange: (range: UiState['analyticsRange']) => void
}

type Store = AppState & Actions

export const useAppStore = create<Store>()(
  persist(
    (set) => ({
      ...initialState,
      addMeeting: (meeting) => {
        if (meeting.transcript.length > MAX_TRANSCRIPT_CHARS) {
          throw new Error('Transcript exceeds 100KB limit for MVP')
        }

        const meetingId = nanoid()
        const createdAt = new Date().toISOString()
        const actionItems = (meeting.actionItems || []).map((item, idx) => ({
          ...item,
          id: nanoid(),
          meetingId,
          order: idx,
        }))

        set((state) => ({
          meetings: [
            {
              ...meeting,
              id: meetingId,
              createdAt,
              updatedAt: createdAt,
              actionItemIds: actionItems.map((a) => a.id),
            },
            ...state.meetings,
          ],
          actionItems: [...actionItems, ...state.actionItems],
        }))

        return meetingId
      },
      updateMeeting: (id, updates) => {
        set((state) => ({
          meetings: state.meetings.map((m) =>
            m.id === id ? { ...m, ...updates, updatedAt: new Date().toISOString() } : m,
          ),
        }))
      },
      deleteMeeting: (id) => {
        set((state) => ({
          meetings: state.meetings.filter((m) => m.id !== id),
          actionItems: state.actionItems.filter((a) => a.meetingId !== id),
        }))
      },
      addActionItem: (item) => {
        const id = nanoid()
        set((state) => ({
          actionItems: [...state.actionItems, { ...item, id }],
          meetings: state.meetings.map((m) =>
            m.id === item.meetingId ? { ...m, actionItemIds: [...m.actionItemIds, id] } : m,
          ),
        }))
        return id
      },
      updateActionItem: (id, updates) => {
        set((state) => ({
          actionItems: state.actionItems.map((a) => (a.id === id ? { ...a, ...updates } : a)),
        }))
      },
      deleteActionItem: (id) => {
        set((state) => ({
          actionItems: state.actionItems.filter((a) => a.id !== id),
          meetings: state.meetings.map((m) => ({
            ...m,
            actionItemIds: m.actionItemIds.filter((aid) => aid !== id),
          })),
        }))
      },
      reorderActionItems: (meetingId, orderedIds) => {
        set((state) => ({
          actionItems: state.actionItems.map((item) =>
            item.meetingId === meetingId
              ? { ...item, order: orderedIds.indexOf(item.id) }
              : item,
          ),
        }))
      },
      toggleSidebar: (value) => set((state) => ({ ui: { ...state.ui, sidebarOpen: value ?? !state.ui.sidebarOpen } })),
      toggleUploadModal: (value) => set((state) => ({ ui: { ...state.ui, uploadModalOpen: value ?? !state.ui.uploadModalOpen } })),
      setMockMode: (value) => set((state) => ({ settings: { ...state.settings, mockMode: value } })),
      setActionItemsView: (view) => set((state) => ({ ui: { ...state.ui, actionItemsView: view } })),
      toggleCommandPalette: (value) => set((state) => ({ ui: { ...state.ui, commandPaletteOpen: value ?? !state.ui.commandPaletteOpen } })),
      setAnalyticsRange: (range) => set((state) => ({ ui: { ...state.ui, analyticsRange: range } })),
    }),
    {
      name: STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        meetings: state.meetings,
        actionItems: state.actionItems,
        people: state.people,
        channels: state.channels,
        comments: state.comments,
        settings: state.settings,
        ui: state.ui,
      }),
    },
  ),
)

// Selectors
export const useCounts = () =>
  useAppStore((state) => ({
    meetingsThisWeek: state.meetings.filter((m) => {
      const now = new Date()
      const start = new Date(now)
      start.setDate(now.getDate() - 7)
      return new Date(m.date) >= start
    }).length,
    openActionItems: state.actionItems.filter((a) => a.status !== 'done').length,
    pendingFollowUps: state.meetings.filter((m) => m.followUpDraft && m.followUpDraft.length > 0).length,
    hoursInMeetings: state.meetings.length * 1, // placeholder hour estimate per meeting
  }))
