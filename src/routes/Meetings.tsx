import { Filter, Search, Tags } from 'lucide-react'
import { useAppStore } from '../state/useAppStore'

export default function Meetings() {
  const meetings = useAppStore((s) => s.meetings)
  const channels = useAppStore((s) => s.channels)

  const channelName = (id: string) => channels.find((c) => c.id === id)?.name ?? 'Unknown'

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 tablet:flex-row tablet:items-center tablet:justify-between">
        <div>
          <div className="text-sm text-text-secondary">All Meetings</div>
          <div className="text-2xl font-semibold text-text-primary">Chronological list</div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button className="rounded-button border border-border bg-background px-3 py-2 text-sm text-text-secondary hover:border-primary/50">
            <Filter className="mr-2 inline h-4 w-4" /> Filters
          </button>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
            <input
              className="w-64 rounded-button border border-border bg-background px-8 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="Search meetings"
            />
          </div>
        </div>
      </div>

      <div className="rounded-card border border-border bg-sidebar/60">
        <div className="grid grid-cols-5 border-b border-border px-4 py-3 text-xs uppercase tracking-wide text-text-secondary">
          <div className="col-span-2">Title</div>
          <div>Date</div>
          <div>Channel</div>
          <div className="text-right">Action items</div>
        </div>
        <div className="divide-y divide-border">
          {meetings.map((m) => (
            <div key={m.id} className="grid grid-cols-5 items-center px-4 py-3 text-sm text-text-primary hover:bg-white/5">
              <div className="col-span-2">
                <div className="font-semibold">{m.title}</div>
                <div className="text-xs text-text-secondary flex items-center gap-2">
                  <Tags className="h-3 w-3" /> {m.type}
                </div>
              </div>
              <div className="text-text-secondary">{new Date(m.date).toLocaleDateString()}</div>
              <div className="text-text-secondary">{channelName(m.channelId)}</div>
              <div className="text-right text-text-secondary">{m.actionItemIds.length}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
