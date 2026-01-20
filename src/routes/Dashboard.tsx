import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, CalendarClock, CheckSquare, Clock3, Loader2, Upload } from 'lucide-react'
import { listMeetings } from '../lib/api'
import type { Meeting } from '../lib/api'
import { useAppStore } from '../state/useAppStore'
import { useToast } from '../components/Toast'

function StatCard({ label, value, icon: Icon, accent }: { label: string; value: string | number; icon: typeof ArrowRight; accent?: string }) {
  return (
    <div className="rounded-card border border-border bg-sidebar/60 p-4 shadow-panel">
      <div className="flex items-center justify-between text-text-secondary text-sm">{label}<Icon className={`h-4 w-4 ${accent ?? 'text-primary'}`} /></div>
      <div className="mt-2 text-2xl font-semibold text-text-primary">{value}</div>
    </div>
  )
}

function RecentMeetings({ meetings, loading }: { meetings: Meeting[]; loading: boolean }) {
  const recent = useMemo(() => meetings.slice(0, 5), [meetings])

  if (loading) {
    return (
      <div className="rounded-card border border-border bg-sidebar/60 p-4">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-card border border-border bg-sidebar/60 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="text-sm text-text-secondary">Recent Meetings</div>
          <div className="text-lg font-semibold text-text-primary">Last 5 analyses</div>
        </div>
        <Link to="/meetings" className="text-sm text-primary hover:text-white">View all</Link>
      </div>
      <div className="space-y-3">
        {recent.length === 0 && (
          <div className="text-sm text-text-secondary py-4 text-center">No meetings yet. Upload a transcript to get started.</div>
        )}
        {recent.map((m) => (
          <Link
            key={m.id}
            to={`/meetings/${m.id}`}
            className="block rounded-button border border-border/80 bg-background/50 px-3 py-3 hover:border-primary/40 transition"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-text-primary font-semibold">{m.title}</div>
                <div className="text-xs text-text-secondary flex gap-2">
                  <span>{new Date(m.date).toLocaleDateString()}</span>
                  {m.topics && m.topics.length > 0 && (
                    <>
                      <span className="text-border">|</span>
                      <span>{m.topics.slice(0, 2).join(', ')}</span>
                    </>
                  )}
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-text-secondary" />
            </div>
          </Link>
        ))}
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
      <div className="text-sm text-text-secondary">Accepts .txt, .vtt; docx/pdf will prompt paste; max 10MB.</div>
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
  const { addToast } = useToast()
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    async function fetchMeetings() {
      try {
        const { meetings: data, pagination } = await listMeetings(20, 0)
        setMeetings(data)
        setTotal(pagination.total)
      } catch (error) {
        console.error('Failed to load meetings:', error)
        addToast({ type: 'error', title: 'Failed to load meetings' })
      } finally {
        setLoading(false)
      }
    }
    fetchMeetings()
  }, [addToast])

  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const meetingsThisWeek = meetings.filter((m) => new Date(m.date) >= weekAgo).length
  const hoursInMeetings = Math.round((meetings.length * 0.5 + Number.EPSILON) * 10) / 10

  return (
    <div className="space-y-6">
      <div className="grid gap-4 tablet:grid-cols-2 desktop:grid-cols-4">
        <StatCard label="Meetings this week" value={meetingsThisWeek} icon={CalendarClock} />
        <StatCard label="Total meetings" value={total} icon={CheckSquare} accent="text-warning" />
        <StatCard label="Recent uploads" value={meetings.length} icon={ArrowRight} accent="text-accent" />
        <StatCard label="Est. hours" value={hoursInMeetings} icon={Clock3} accent="text-success" />
      </div>

      <div className="grid gap-4 desktop:grid-cols-3">
        <div className="desktop:col-span-2 space-y-4">
          <QuickUpload />
          <RecentMeetings meetings={meetings} loading={loading} />
        </div>
        <div className="rounded-card border border-border bg-sidebar/60 p-4">
          <div className="text-sm text-text-secondary">Quick Stats</div>
          <div className="text-lg font-semibold text-text-primary mb-4">Meeting Intelligence</div>
          <div className="space-y-3 text-sm text-text-secondary">
            <div className="flex justify-between">
              <span>Analyzed meetings</span>
              <span className="text-text-primary">{meetings.filter((m) => m.summary).length}</span>
            </div>
            <div className="flex justify-between">
              <span>Pending analysis</span>
              <span className="text-text-primary">{meetings.filter((m) => !m.summary).length}</span>
            </div>
            <div className="flex justify-between">
              <span>Projects tracked</span>
              <span className="text-text-primary">
                {[...new Set(meetings.flatMap((m) => m.projects || []))].length}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
