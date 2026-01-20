import { useEffect, useMemo, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { useDebounce } from '../hooks/useDebounce'
import { useAppStore } from '../state/useAppStore'
import { CalendarClock, CheckSquare, Hash, Search, User, Upload } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

type Result = { id: string; type: 'meeting' | 'action' | 'person' | 'channel' | 'quick'; title: string; subtitle?: string; meta?: string }

const MAX_PER_GROUP = 5

export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const navigate = useNavigate()
  const meetings = useAppStore((s) => s.meetings)
  const actionItems = useAppStore((s) => s.actionItems)
  const people = useAppStore((s) => s.people)
  const channels = useAppStore((s) => s.channels)
  const toggleUploadModal = useAppStore((s) => s.toggleUploadModal)

  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const debounced = useDebounce(query, 150)

  const recentMeetings = useMemo(() => [...meetings].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5), [meetings])

  const results = useMemo(() => {
    if (!debounced.trim()) return []
    const q = debounced.toLowerCase()

    const meetingMatches: Result[] = meetings
      .filter((m) => m.title.toLowerCase().includes(q) || m.transcript.toLowerCase().includes(q))
      .slice(0, MAX_PER_GROUP)
      .map((m) => ({ id: m.id, type: 'meeting', title: m.title, subtitle: new Date(m.date).toLocaleDateString(), meta: `${m.actionItemIds.length} AIs` }))

    const actionMatches: Result[] = actionItems
      .filter((a) => a.task.toLowerCase().includes(q))
      .slice(0, MAX_PER_GROUP)
      .map((a) => ({ id: a.id, type: 'action', title: a.task, subtitle: meetings.find((m) => m.id === a.meetingId)?.title }))

    const peopleMatches: Result[] = people
      .filter((p) => p.name.toLowerCase().includes(q) || p.email.toLowerCase().includes(q))
      .slice(0, MAX_PER_GROUP)
      .map((p) => ({ id: p.id, type: 'person', title: p.name, subtitle: p.email }))

    const channelMatches: Result[] = channels
      .filter((c) => c.name.toLowerCase().includes(q))
      .slice(0, MAX_PER_GROUP)
      .map((c) => ({ id: c.id, type: 'channel', title: `# ${c.name}`, subtitle: c.slug }))

    return [...meetingMatches, ...actionMatches, ...peopleMatches, ...channelMatches]
  }, [debounced, meetings, actionItems, people, channels])

  useEffect(() => {
    setActiveIndex(0)
  }, [results.length, debounced])

  const grouped = useMemo(() => {
    const groups: Record<string, Result[]> = { Meetings: [], 'Action Items': [], People: [], Channels: [] }
    results.forEach((r) => {
      if (r.type === 'meeting') groups['Meetings'].push(r)
      if (r.type === 'action') groups['Action Items'].push(r)
      if (r.type === 'person') groups['People'].push(r)
      if (r.type === 'channel') groups['Channels'].push(r)
    })
    return groups
  }, [results])

  const visibleResults = results.length ? results : []

  const select = (res: Result) => {
    onOpenChange(false)
    if (res.type === 'meeting') navigate(`/meetings/${res.id}`)
    if (res.type === 'action') navigate(`/meetings/${actionItems.find((a) => a.id === res.id)?.meetingId}`)
    if (res.type === 'person') navigate('/people')
    if (res.type === 'channel') navigate('/meetings')
    if (res.type === 'quick' && res.id === 'upload') toggleUploadModal(true)
    if (res.type === 'quick' && res.id === 'shortcuts') {
      const toggleCommandPalette = useAppStore.getState().toggleCommandPalette
      toggleCommandPalette(false)
      const setShortcuts = (window as any)._setShortcutsOpen as ((v: boolean) => void) | undefined
      if (setShortcuts) setShortcuts(true)
    }
  }

  const moveActive = (delta: number) => {
    setActiveIndex((prev) => {
      const next = (prev + delta + visibleResults.length) % Math.max(visibleResults.length, 1)
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
              placeholder="Search meetings, action items, people, channels"
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
                if (e.key === 'Enter' && visibleResults[activeIndex]) {
                  e.preventDefault()
                  select(visibleResults[activeIndex])
                }
                if (e.key === 'Escape') onOpenChange(false)
              }}
            />
            <kbd className="rounded-button border border-border bg-background px-2 py-1 text-[10px] text-text-secondary">Esc</kbd>
          </div>

          <div className="max-h-[60vh] overflow-y-auto">
            {!query && (
              <div className="border-b border-border px-3 py-2 text-xs uppercase tracking-wide text-text-secondary">Recent</div>
            )}
            {!query && (
              <div className="space-y-1 px-3 py-2">
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
            )}

            {!query && (
              <>
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

            {query && visibleResults.length === 0 && (
              <div className="px-4 py-6 text-sm text-text-secondary">No results for “{query}”. Try a different term.</div>
            )}

            {query && (
              <div className="px-1 py-2 space-y-2">
                {Object.entries(grouped).map(([label, items]) =>
                  items.length ? (
                    <div key={label}>
                      <div className="px-3 py-1 text-[11px] uppercase tracking-wide text-text-secondary">{label}</div>
                      {items.map((item) => {
                        const globalIndex = results.findIndex((r) => r.id === item.id && r.type === item.type)
                        return (
                          <Row
                            key={`${item.type}-${item.id}`}
                            active={activeIndex === globalIndex}
                            icon={iconFor(item.type)}
                            title={item.title}
                            subtitle={item.subtitle}
                            meta={item.meta}
                            onClick={() => select(item)}
                          />
                        )
                      })}
                    </div>
                  ) : null,
                )}
              </div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function iconFor(type: Result['type']) {
  if (type === 'meeting') return <CalendarClock className="h-4 w-4" />
  if (type === 'action') return <CheckSquare className="h-4 w-4" />
  if (type === 'person') return <User className="h-4 w-4" />
  if (type === 'channel') return <Hash className="h-4 w-4" />
  return <Search className="h-4 w-4" />
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
