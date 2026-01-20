import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Filter, Loader2, Search, Tags } from 'lucide-react'
import { listMeetings, searchMeetings } from '../lib/api'
import type { Meeting } from '../lib/api'
import { useToast } from '../components/Toast'

export default function Meetings() {
  const { addToast } = useToast()
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    async function fetchMeetings() {
      try {
        const { meetings: data } = await listMeetings(100, 0)
        setMeetings(data)
      } catch (error) {
        console.error('Failed to load meetings:', error)
        addToast({ type: 'error', title: 'Failed to load meetings' })
      } finally {
        setLoading(false)
      }
    }
    fetchMeetings()
  }, [addToast])

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      const { meetings: data } = await listMeetings(100, 0)
      setMeetings(data)
      return
    }

    setSearching(true)
    try {
      const { meetings: data } = await searchMeetings(searchQuery)
      setMeetings(data)
    } catch (error) {
      console.error('Search failed:', error)
      addToast({ type: 'error', title: 'Search failed' })
    } finally {
      setSearching(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

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
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            {searching && <Loader2 className="absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-primary" />}
          </div>
        </div>
      </div>

      <div className="rounded-card border border-border bg-sidebar/60">
        <div className="grid grid-cols-4 border-b border-border px-4 py-3 text-xs uppercase tracking-wide text-text-secondary">
          <div className="col-span-2">Title</div>
          <div>Date</div>
          <div className="text-right">Topics</div>
        </div>
        <div className="divide-y divide-border">
          {meetings.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-text-secondary">
              No meetings found. Upload a transcript to get started.
            </div>
          )}
          {meetings.map((m) => (
            <Link
              key={m.id}
              to={`/meetings/${m.id}`}
              className="grid grid-cols-4 items-center px-4 py-3 text-sm text-text-primary hover:bg-white/5"
            >
              <div className="col-span-2">
                <div className="font-semibold">{m.title}</div>
                <div className="text-xs text-text-secondary flex items-center gap-2">
                  {m.summary ? (
                    <span className="truncate max-w-xs">{m.summary.slice(0, 60)}...</span>
                  ) : (
                    <span className="text-warning">Pending analysis</span>
                  )}
                </div>
              </div>
              <div className="text-text-secondary">{new Date(m.date).toLocaleDateString()}</div>
              <div className="text-right text-text-secondary">
                {m.topics && m.topics.length > 0 ? (
                  <div className="flex flex-wrap justify-end gap-1">
                    {m.topics.slice(0, 2).map((t) => (
                      <span key={t} className="rounded-button border border-border bg-background px-2 py-0.5 text-xs">
                        <Tags className="inline h-3 w-3 mr-1" />{t}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-xs">-</span>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
