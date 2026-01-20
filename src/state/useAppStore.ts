import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

const STORAGE_KEY = 'abonmarche-meeting-hub-ui-v1'

interface UiState {
  sidebarOpen: boolean
  uploadModalOpen: boolean
  commandPaletteOpen: boolean
  analyticsRange: 'week' | 'month' | 'quarter' | 'all'
}

const baseUiState: UiState = {
  sidebarOpen: true,
  uploadModalOpen: false,
  commandPaletteOpen: false,
  analyticsRange: 'month',
}

interface Actions {
  toggleSidebar: (value?: boolean) => void
  toggleUploadModal: (value?: boolean) => void
  toggleCommandPalette: (value?: boolean) => void
  setAnalyticsRange: (range: UiState['analyticsRange']) => void
}

type Store = { ui: UiState } & Actions

export const useAppStore = create<Store>()(
  persist(
    (set) => ({
      ui: baseUiState,
      toggleSidebar: (value) =>
        set((state) => ({ ui: { ...state.ui, sidebarOpen: value ?? !state.ui.sidebarOpen } })),
      toggleUploadModal: (value) =>
        set((state) => ({ ui: { ...state.ui, uploadModalOpen: value ?? !state.ui.uploadModalOpen } })),
      toggleCommandPalette: (value) =>
        set((state) => ({ ui: { ...state.ui, commandPaletteOpen: value ?? !state.ui.commandPaletteOpen } })),
      setAnalyticsRange: (range) =>
        set((state) => ({ ui: { ...state.ui, analyticsRange: range } })),
    }),
    {
      name: STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        ui: state.ui,
      }),
    }
  )
)
