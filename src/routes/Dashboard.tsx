import { ArrowRight, CalendarClock, CheckSquare, Clock3, Upload } from 'lucide-react'
import { useCounts, useAppStore } from '../state/useAppStore'

function StatCard({ label, value, icon: Icon, accent }: { label: string; value: string | number; icon: typeof ArrowRight; accent?: string }) {
  return (
    <div className="rounded-card border border-border bg-sidebar/60 p-4 shadow-panel">
      <div className="flex items-center justify-between text-text-secondary text-sm">{label}<Icon className={`h-4 w-4 ${accent ?? 'text-primary'}`} /></div>
      <div className="mt-2 text-2xl font-semibold text-text-primary">{value}</div>
    </div>
  )
}

function RecentMeetings() {
  const meetings = useAppStore((s) => s.meetings.slice(0, 5))
  const channels = useAppStore((s) => s.channels)
  const channelName = (id: string) => channels.find((c) => c.id === id)?.name ?? 'Unknown'

  return (
    <div className="rounded-card border border-border bg-sidebar/60 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="text-sm text-text-secondary">Recent Meetings</div>
          <div className="text-lg font-semibold text-text-primary">Last 5 analyses</div>
        </div>
        <button className="text-sm text-primary hover:text-white">View all</button>
      </div>
      <div className="space-y-3">
        {meetings.map((m) => (
          <div key={m.id} className="rounded-button border border-border/80 bg-background/50 px-3 py-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-text-primary font-semibold">{m.title}</div>
                <div className="text-xs text-text-secondary flex gap-2">
                  <span>{new Date(m.date).toLocaleDateString()}</span>
                  <span className="text-border">•</span>
                  <span>{channelName(m.channelId)}</span>
                  <span className="text-border">•</span>
                  <span>{m.actionItemIds.length} action items</span>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-text-secondary" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function MyActionItems() {
  const currentUserId = 'p2'
  const items = useAppStore((s) => s.actionItems.filter((a) => a.ownerId === currentUserId).slice(0, 5))
  const toggleStatus = useAppStore((s) => s.updateActionItem)

  return (
    <div className="rounded-card border border-border bg-sidebar/60 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="text-sm text-text-secondary">My Action Items</div>
          <div className="text-lg font-semibold text-text-primary">Assigned to you</div>
        </div>
      </div>
      <div className="space-y-2">
        {items.map((item) => (
          <label key={item.id} className="flex items-start gap-2 rounded-button border border-border/60 bg-background/40 px-3 py-2 text-sm text-text-secondary">
            <input
              type="checkbox"
              checked={item.status === 'done'}
              onChange={(e) => toggleStatus(item.id, { status: e.target.checked ? 'done' : 'todo' })}
            />
            <div>
              <div className="text-text-primary font-medium">{item.task}</div>
              <div className="text-[11px] text-text-secondary">Due {item.due ? new Date(item.due).toLocaleDateString() : '—'}</div>
            </div>
          </label>
        ))}
        {items.length === 0 && <div className="text-sm text-text-secondary">No items assigned.</div>}
      </div>
    </div>
  )
}

function QuickUpload() {
  const toggleUploadModal = useAppStore((s) => s.toggleUploadModal)
  return (
    <div className="rounded-card border border-dashed border-border bg-background/40 p-4 text-center">
      <Upload className="mx-auto h-8 w-8 text-primary" />
      <div className="mt-2 text-lg font-semibold text-text-primary">Drop transcript here or click to upload</div>
      <div className="text-sm text-text-secondary">Accepts .txt, .vtt; docx/pdf will prompt paste; max 500KB.</div>
      <button
        onClick={() => toggleUploadModal(true)}
        className="mt-3 inline-flex items-center gap-2 rounded-button bg-primary px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-primary/20 hover:bg-primary/90"
      >
        Open upload modal
      </button>
    </div>
  )
}

export default function Dashboard() {
  const { meetingsThisWeek, openActionItems, pendingFollowUps, hoursInMeetings } = useCounts()

  return (
    <div className="space-y-6">
      <div className="grid gap-4 tablet:grid-cols-2 desktop:grid-cols-4">
        <StatCard label="Meetings this week" value={meetingsThisWeek} icon={CalendarClock} />
        <StatCard label="Open action items" value={openActionItems} icon={CheckSquare} accent="text-warning" />
        <StatCard label="Pending follow-ups" value={pendingFollowUps} icon={ArrowRight} accent="text-accent" />
        <StatCard label="Hours in meetings" value={hoursInMeetings} icon={Clock3} accent="text-success" />
      </div>

      <div className="grid gap-4 desktop:grid-cols-3">
        <div className="desktop:col-span-2 space-y-4">
          <QuickUpload />
          <RecentMeetings />
        </div>
        <MyActionItems />
      </div>
    </div>
  )
}
