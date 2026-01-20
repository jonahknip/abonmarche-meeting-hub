import dayjs from 'dayjs'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, Pie, PieChart, RadialBar, RadialBarChart, Tooltip, XAxis, YAxis, Cell } from 'recharts'
import { Activity, BarChart3, CheckSquare, Clock3, Lightbulb, PieChart as PieIcon, TrendingUp, Calendar } from 'lucide-react'
import { useMemo } from 'react'
import { useAppStore } from '../state/useAppStore'

const statusColors: Record<string, string> = {
  todo: '#f59e0b',
  in_progress: '#3b82f6',
  done: '#22c55e',
  blocked: '#ef4444',
}

const typeColors: Record<string, string> = {
  client: '#6366f1',
  internal: '#8b5cf6',
  'one-on-one': '#22c55e',
  project: '#f59e0b',
  other: '#94a3b8',
}

type Range = 'week' | 'month' | 'quarter' | 'all'

function filterByRange(date: string, range: Range) {
  if (range === 'all') return true
  const d = dayjs(date)
  const now = dayjs()
  if (range === 'week') return d.isAfter(now.subtract(7, 'day'))
  if (range === 'month') return d.isAfter(now.subtract(1, 'month'))
  if (range === 'quarter') return d.isAfter(now.subtract(3, 'month'))
  return true
}

export default function Analytics() {
  const meetings = useAppStore((s) => s.meetings)
  const actionItems = useAppStore((s) => s.actionItems)
  const range = useAppStore((s) => s.ui.analyticsRange)
  const setRange = useAppStore((s) => s.setAnalyticsRange)
  const toggleUploadModal = useAppStore((s) => s.toggleUploadModal)

  const filteredMeetings = useMemo(() => meetings.filter((m) => filterByRange(m.date, range)), [meetings, range])
  const filteredActionItems = useMemo(
    () => actionItems.filter((a) => filteredMeetings.some((m) => m.id === a.meetingId)),
    [actionItems, filteredMeetings],
  )

  const totalMeetings = filteredMeetings.length
  const meetingMinutes = totalMeetings * 30
  const meetingHours = Math.round((meetingMinutes / 60) * 10) / 10

  const completed = filteredActionItems.filter((a) => a.status === 'done').length
  const completionRate = filteredActionItems.length ? Math.round((completed / filteredActionItems.length) * 100) : 0

  const stats = [
    { label: 'Total Meetings', value: totalMeetings, icon: Calendar },
    { label: 'Time in Meetings', value: `${meetingHours} hrs`, icon: Clock3 },
    { label: 'Action Items', value: `${completed} of ${filteredActionItems.length} completed`, icon: CheckSquare },
    { label: 'Completion Rate', value: `${completionRate}%`, icon: TrendingUp },
  ]

  const meetingsOverTime = useMemo(() => {
    const buckets = new Map<string, number>()
    filteredMeetings.forEach((m) => {
      const key = dayjs(m.date).format(range === 'week' ? 'MMM D' : range === 'month' ? 'MMM D' : 'MMM D')
      buckets.set(key, (buckets.get(key) || 0) + 1)
    })
    return Array.from(buckets.entries()).map(([date, count]) => ({ date, count }))
  }, [filteredMeetings, range])

  const meetingsByType = useMemo(() => {
    const map = new Map<string, number>()
    filteredMeetings.forEach((m) => {
      map.set(m.type, (map.get(m.type) || 0) + 1)
    })
    return Array.from(map.entries()).map(([type, value]) => ({ name: type, value }))
  }, [filteredMeetings])

  const meetingsByChannel = useMemo(() => {
    const map = new Map<string, number>()
    filteredMeetings.forEach((m) => {
      map.set(m.channelId, (map.get(m.channelId) || 0) + 1)
    })
    return Array.from(map.entries())
      .map(([channel, value]) => ({ channel, value }))
      .sort((a, b) => b.value - a.value)
  }, [filteredMeetings])

  const actionByStatus = useMemo(() => {
    const map = new Map<string, number>()
    filteredActionItems.forEach((a) => {
      map.set(a.status, (map.get(a.status) || 0) + 1)
    })
    return Array.from(map.entries()).map(([status, value]) => ({ name: status, value }))
  }, [filteredActionItems])

  const busiestDay = useMemo(() => {
    const map = new Map<string, number>()
    filteredMeetings.forEach((m) => {
      const day = dayjs(m.date).format('dddd')
      map.set(day, (map.get(day) || 0) + 1)
    })
    const arr = Array.from(map.entries()).sort((a, b) => b[1] - a[1])
    return arr[0]
  }, [filteredMeetings])

  const mostActiveChannel = meetingsByChannel[0]

  const insights = [
    `You had ${totalMeetings} meetings this ${range}, totaling ~${meetingHours} hours`,
    busiestDay ? `Busiest day: ${busiestDay[0]} with ${busiestDay[1]} meetings` : null,
    `${completionRate}% of action items completed`,
    mostActiveChannel ? `Most active channel: #${mostActiveChannel.channel}` : null,
  ].filter(Boolean) as string[]

  if (!meetings.length) {
    return (
      <div className="space-y-4">
        <div className="text-2xl font-semibold text-text-primary">Analytics</div>
        <div className="rounded-card border border-border bg-sidebar/60 p-6 text-text-secondary">
          No meetings yet. Upload your first meeting to see analytics.
          <div className="mt-3">
            <button
              className="rounded-button bg-primary px-3 py-2 text-sm font-semibold text-white shadow-lg shadow-primary/20 hover:bg-primary/90"
              onClick={() => toggleUploadModal(true)}
            >
              Upload meeting
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 tablet:flex-row tablet:items-center tablet:justify-between">
        <div>
          <div className="text-sm text-text-secondary">Analytics</div>
          <div className="text-2xl font-semibold text-text-primary">Patterns across meetings</div>
        </div>
        <div className="flex items-center gap-2 rounded-button border border-border bg-background px-2 py-1 text-xs text-text-secondary">
          {(['week', 'month', 'quarter', 'all'] as Range[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`rounded-button px-2 py-1 ${range === r ? 'bg-primary/20 text-text-primary' : ''}`}
            >
              {r === 'week' ? 'Week' : r === 'month' ? 'Month' : r === 'quarter' ? 'Quarter' : 'All'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 tablet:grid-cols-2 desktop:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-card border border-border bg-sidebar/60 p-4">
            <div className="flex items-center justify-between text-sm text-text-secondary">
              {s.label}
              <s.icon className="h-4 w-4 text-primary" />
            </div>
            <div className="mt-2 text-2xl font-semibold text-text-primary">{s.value}</div>
            {s.label === 'Completion Rate' && (
              <div className="mt-2 flex items-center gap-3">
                <RadialBarChart width={60} height={60} innerRadius={18} outerRadius={28} data={[{ name: 'rate', value: completionRate, fill: completionRate > 70 ? '#22c55e' : completionRate > 40 ? '#f59e0b' : '#ef4444' }]}>
                  <RadialBar dataKey="value" cornerRadius={10} />
                </RadialBarChart>
                <div className="text-xs text-text-secondary">{completionRate > 70 ? 'Great job' : completionRate > 40 ? 'Keep pushing' : 'Needs attention'}</div>
              </div>
            )}
            {s.label === 'Action Items' && (
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-border">
                <div
                  className="h-full bg-primary"
                  style={{ width: `${filteredActionItems.length ? (completed / filteredActionItems.length) * 100 : 0}%` }}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="grid gap-4 tablet:grid-cols-2">
        <div className="rounded-card border border-border bg-sidebar/60 p-4">
          <div className="mb-2 flex items-center gap-2 text-text-primary font-semibold">
            <Activity className="h-4 w-4 text-primary" /> Meetings Over Time
          </div>
          <AreaChart width={500} height={250} data={meetingsOverTime} className="w-full">
            <defs>
              <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#2d2d4a" />
            <XAxis dataKey="date" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} />
            <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} allowDecimals={false} />
            <Tooltip contentStyle={{ background: '#16162a', border: '1px solid #2d2d4a', color: '#f1f5f9' }} />
            <Area type="monotone" dataKey="count" stroke="#6366f1" fill="url(#grad)" />
          </AreaChart>
        </div>

        <div className="rounded-card border border-border bg-sidebar/60 p-4">
          <div className="mb-2 flex items-center gap-2 text-text-primary font-semibold">
            <PieIcon className="h-4 w-4 text-primary" /> Meetings by Type
          </div>
          <PieChart width={500} height={250} className="w-full">
            <Pie data={meetingsByType} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={90}>
              {meetingsByType.map((entry) => (
                <Cell key={entry.name} fill={typeColors[entry.name] || '#94a3b8'} />
              ))}
            </Pie>
            <Legend />
            <Tooltip contentStyle={{ background: '#16162a', border: '1px solid #2d2d4a', color: '#f1f5f9' }} />
          </PieChart>
        </div>

        <div className="rounded-card border border-border bg-sidebar/60 p-4">
          <div className="mb-2 flex items-center gap-2 text-text-primary font-semibold">
            <BarChart3 className="h-4 w-4 text-primary" /> Meetings by Channel
          </div>
          <BarChart width={500} height={250} data={meetingsByChannel} layout="vertical" className="w-full">
            <CartesianGrid strokeDasharray="3 3" stroke="#2d2d4a" />
            <XAxis type="number" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} allowDecimals={false} />
            <YAxis dataKey="channel" type="category" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} width={120} />
            <Tooltip contentStyle={{ background: '#16162a', border: '1px solid #2d2d4a', color: '#f1f5f9' }} />
            <Bar dataKey="value" fill="#6366f1" radius={[6, 6, 6, 6]} />
          </BarChart>
        </div>

        <div className="rounded-card border border-border bg-sidebar/60 p-4">
          <div className="mb-2 flex items-center gap-2 text-text-primary font-semibold">
            <CheckSquare className="h-4 w-4 text-primary" /> Action Items by Status
          </div>
          <PieChart width={500} height={250} className="w-full">
            <Pie data={actionByStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80}>
              {actionByStatus.map((entry) => (
                <Cell key={entry.name} fill={statusColors[entry.name] || '#94a3b8'} />
              ))}
            </Pie>
            <Legend />
            <Tooltip contentStyle={{ background: '#16162a', border: '1px solid #2d2d4a', color: '#f1f5f9' }} />
          </PieChart>
        </div>
      </div>

      <div className="rounded-card border border-border bg-sidebar/60 p-4">
        <div className="mb-2 flex items-center gap-2 text-text-primary font-semibold">
          <Lightbulb className="h-4 w-4 text-primary" /> Insights
        </div>
        <div className="space-y-1 text-sm text-text-secondary">
          {insights.length ? insights.map((i, idx) => <div key={idx}>• {i}</div>) : <div>No insights yet.</div>}
        </div>
      </div>
    </div>
  )
}
