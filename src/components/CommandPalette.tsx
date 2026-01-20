import { useEffect, useMemo, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { useDebounce } from '../hooks/useDebounce'
import { useAppStore } from '../state/useAppStore'
import { CalendarClock, Search, Upload, Loader2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { searchMeetings, listMeetings } from '../lib/api'
import type { Meeting } from '../lib/api'

type Result = { id: string; type: 'meeting' | 'quick'; title: string; subtitle?: string; meta?: string }

const MAX_PER_GROUP = 5

export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const navigate = useNavigate()
  const toggleUploadModal = useAppStore((s) => s.toggleUploadModal)

  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const [recentMeetings, setRecentMeetings] = useState<Meeting[]>([])
  const [searchResults, setSearchResults] = useState<Meeting[]>([])
  const [searching, setSearching] = useState(false)
  const debounced = useDebounce(query, 200)

  useEffect(() => {
    if (open && recentMeetings.length === 0) {
      listMeetings(5, 0).then(({ meetings }) => setRecentMeetings(meetings)).catch(console.error)
    }
  }, [open, recentMeetings.length])

  useEffect(() => {
    if (!debounced.trim()) {
      setSearchResults([])
      return
    }

    setSearching(true)
    searchMeetings(debounced)
      .then(({ meetings }) => setSearchResults(meetings.slice(0, MAX_PER_GROUP)))
      .catch(console.error)
      .finally(() => setSearching(false))
  }, [debounced])

  const results: Result[] = useMemo(() => {
    if (!debounced.trim()) return []
    return searchResults.map((m) => ({
      id: m.id,
      type: 'meeting',
      title: m.title,
      subtitle: new Date(m.date).toLocaleDateString(),
      meta: m.topics?.slice(0, 2).join(', '),
    }))
  }, [searchResults, debounced])

  useEffect(() => {
    setActiveIndex(0)
  }, [results.length, debounced])

  const select = (res: Result) => {
    onOpenChange(false)
    if (res.type === 'meeting') navigate(`/meetings/${res.id}`)
    if (res.type === 'quick' && res.id === 'upload') toggleUploadModal(true)
    if (res.type === 'quick' && res.id === 'shortcuts') {
      const toggleCommandPalette = useAppStore.getState().toggleCommandPalette
      toggleCommandPalette(false)
      const setShortcuts = (window as unknown as { _setShortcutsOpen?: (v: boolean) => void })._setShortcutsOpen
      if (setShortcuts) setShortcuts(true)
    }
  }

  const moveActive = (delta: number) => {
    setActiveIndex((prev) => {
      const next = (prev + delta + results.length) % Math.max(results.length, 1)
      return next
    })
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-24 w-[min(720px,90vw)] -translate-x-1/2 rounded-card border border-border bg-sidebar/95 shadow-2xl">
          <div className="flex items-center gap-2 border-b border-border px-3 py-3">
            <Search className="h-4 w-4 text-text-secondary" />
            <input
              autoFocus
              className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-secondary focus:outline-none"
              placeholder="Search meetings..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown') {
                  e.preventDefault()
                  moveActive(1)
                }
                if (e.key === 'ArrowUp') {
                  e.preventDefault()
                  moveActive(-1)
                }
                if (e.key === 'Enter' && results[activeIndex]) {
                  e.preventDefault()
                  select(results[activeIndex])
                }
                if (e.key === 'Escape') onOpenChange(false)
              }}
            />
            {searching && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
            <kbd className="rounded-button border border-border bg-background px-2 py-1 text-[10px] text-text-secondary">Esc</kbd>
          </div>

          <div className="max-h-[60vh] overflow-y-auto">
            {!query && (
              <>
                <div className="border-b border-border px-3 py-2 text-xs uppercase tracking-wide text-text-secondary">Recent Meetings</div>
                <div className="space-y-1 px-3 py-2">
                  {recentMeetings.length === 0 && (
                    <div className="text-sm text-text-secondary py-2">No recent meetings</div>
                  )}
                  {recentMeetings.map((m) => (
                    <Row
                      key={m.id}
                      active={false}
                      icon={<CalendarClock className="h-4 w-4" />}
                      title={m.title}
                      subtitle={new Date(m.date).toLocaleDateString()}
                      onClick={() => select({ id: m.id, type: 'meeting', title: m.title })}
                    />
                  ))}
                </div>

                <div className="border-b border-border px-3 py-2 text-xs uppercase tracking-wide text-text-secondary">Quick Actions</div>
                <div className="space-y-1 px-3 py-2">
                  <Row
                    active={false}
                    icon={<Upload className="h-4 w-4" />}
                    title="Upload meeting"
                    subtitle="Open upload modal"
                    onClick={() => select({ id: 'upload', type: 'quick', title: 'Upload meeting' })}
                  />
                  <Row
                    active={false}
                    icon={<Search className="h-4 w-4" />}
                    title="Keyboard shortcuts"
                    subtitle="View shortcuts"
                    onClick={() => select({ id: 'shortcuts', type: 'quick', title: 'Shortcuts' })}
                  />
                </div>
              </>
            )}

            {query && results.length === 0 && !searching && (
              <div className="px-4 py-6 text-sm text-text-secondary">No results for "{query}". Try a different term.</div>
            )}

            {query && results.length > 0 && (
              <div className="px-1 py-2 space-y-2">
                <div className="px-3 py-1 text-[11px] uppercase tracking-wide text-text-secondary">Meetings</div>
                {results.map((item, index) => (
                  <Row
                    key={`${item.type}-${item.id}`}
                    active={activeIndex === index}
                    icon={<CalendarClock className="h-4 w-4" />}
                    title={item.title}
                    subtitle={item.subtitle}
                    meta={item.meta}
                    onClick={() => select(item)}
                  />
                ))}
              </div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function Row({ active, icon, title, subtitle, meta, onClick }: { active: boolean; icon: React.ReactNode; title: string; subtitle?: string; meta?: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-button px-3 py-2 text-left text-sm ${active ? 'bg-primary/20 text-text-primary' : 'text-text-primary hover:bg-white/5'}`}
    >
      <div className="text-text-secondary">{icon}</div>
      <div className="flex-1">
        <div className="font-semibold text-text-primary">{title}</div>
        {subtitle && <div className="text-xs text-text-secondary">{subtitle}</div>}
      </div>
      {meta && <div className="text-xs text-text-secondary">{meta}</div>}
    </button>
  )
}
