import React, { useState, useEffect } from 'react'
import { Calendar, ChevronLeft, ChevronRight, Clock, Users, Video, ExternalLink, Loader2, RefreshCw } from 'lucide-react'

const MS_CLIENT_ID = import.meta.env.VITE_MS_CLIENT_ID || ''
const SCOPES = 'Calendars.Read User.Read'

function getWeekDays(anchor) {
  const d = new Date(anchor)
  d.setDate(d.getDate() - d.getDay() + 1) // Monday
  return Array.from({ length: 5 }, (_, i) => {
    const day = new Date(d)
    day.setDate(d.getDate() + i)
    return day
  })
}

function timeStr(iso) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

function dateLabel(d) {
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

const TYPE_COLOR = {
  Teams: 'bg-[#5b5fc7]/10 text-[#5b5fc7] border-[#5b5fc7]/20',
  InPerson: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Default: 'bg-gray-50 text-gray-600 border-gray-200',
}

export default function CalendarView({ onUpload, onRecord }) {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [token, setToken] = useState(localStorage.getItem('ms_token') || '')
  const [anchor, setAnchor] = useState(new Date())
  const [connected, setConnected] = useState(!!token)

  const days = getWeekDays(anchor)

  const connectMS = async () => {
    if (!MS_CLIENT_ID) {
      setError('MS_CLIENT_ID not set in env. Add VITE_MS_CLIENT_ID to Vercel.')
      return
    }
    const params = new URLSearchParams({
      client_id: MS_CLIENT_ID,
      response_type: 'token',
      redirect_uri: window.location.origin,
      scope: SCOPES,
      response_mode: 'fragment',
    })
    window.location.href = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params}`
  }

  // Pick up token from hash after OAuth redirect
  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.replace('#','?'))
    const t = hash.get('access_token')
    if (t) {
      localStorage.setItem('ms_token', t)
      setToken(t); setConnected(true)
      window.history.replaceState(null, '', window.location.pathname)
    }
  }, [])

  const fetchEvents = async (t = token) => {
    if (!t) return
    setLoading(true); setError('')
    try {
      const start = new Date(days[0]); start.setHours(0,0,0,0)
      const end = new Date(days[4]); end.setHours(23,59,59,999)
      const url = `https://graph.microsoft.com/v1.0/me/calendarView?startDateTime=${start.toISOString()}&endDateTime=${end.toISOString()}&$orderby=start/dateTime&$top=50&$select=subject,start,end,attendees,isOnlineMeeting,onlineMeetingUrl,bodyPreview,location`
      const res = await fetch(url, { headers: { Authorization: `Bearer ${t}` } })
      if (res.status === 401) { setToken(''); localStorage.removeItem('ms_token'); setConnected(false); return }
      const data = await res.json()
      setEvents(data.value || [])
    } catch(e) { setError('Failed to load calendar.') }
    setLoading(false)
  }

  useEffect(() => { if (token) fetchEvents() }, [token, anchor])

  const weekLabel = `${dateLabel(days[0])} – ${dateLabel(days[4])}`

  const eventsForDay = (day) => events.filter(e => {
    const d = new Date(e.start.dateTime || e.start.date)
    return d.toDateString() === day.toDateString()
  })

  if (!connected) return (
    <div className="pt-28 px-6 max-w-lg mx-auto text-center">
      <div className="w-16 h-16 rounded-2xl bg-[#5b5fc7]/10 flex items-center justify-center mx-auto mb-5">
        <Calendar size={28} className="text-[#5b5fc7]"/>
      </div>
      <h2 className="text-[22px] font-semibold text-gray-900 mb-2">Connect your Teams Calendar</h2>
      <p className="text-[14px] text-gray-500 mb-6">Sign in with your Abonmarche Microsoft account to see your real calendar alongside your meetings.</p>
      {error && <p className="text-[13px] text-red-500 mb-4 bg-red-50 rounded-xl p-3">{error}</p>}
      {!MS_CLIENT_ID ? (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-left text-[13px] text-amber-800">
          <p className="font-semibold mb-1">One-time setup needed</p>
          <p>Add <code className="bg-amber-100 px-1 rounded">VITE_MS_CLIENT_ID</code> to your Vercel environment variables, then redeploy.</p>
          <p className="mt-2">Get it from Azure Portal → App Registrations → your app → Application (client) ID.</p>
          <p className="mt-3 font-medium">In the meantime, you can still use Upload and Record to add meetings manually.</p>
        </div>
      ) : (
        <button onClick={connectMS}
          className="px-6 py-3 bg-[#5b5fc7] text-white rounded-xl font-medium hover:bg-[#4f53b8] transition-colors flex items-center gap-2 mx-auto">
          <Video size={16}/>Sign in with Microsoft
        </button>
      )}
    </div>
  )

  return (
    <div className="pt-20 pb-12 px-4 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 pt-4">
        <div>
          <h1 className="text-[22px] font-semibold text-gray-900">Calendar</h1>
          <p className="text-[13px] text-gray-400 mt-0.5">{weekLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { const d=new Date(anchor); d.setDate(d.getDate()-7); setAnchor(d) }}
            className="p-2 rounded-xl hover:bg-black/5 transition-colors"><ChevronLeft size={18}/></button>
          <button onClick={() => setAnchor(new Date())}
            className="px-3 py-1.5 text-[13px] font-medium rounded-xl bg-[#003087]/8 text-[#003087] hover:bg-[#003087]/12 transition-colors">Today</button>
          <button onClick={() => { const d=new Date(anchor); d.setDate(d.getDate()+7); setAnchor(d) }}
            className="p-2 rounded-xl hover:bg-black/5 transition-colors"><ChevronRight size={18}/></button>
          <button onClick={() => fetchEvents()} className="p-2 rounded-xl hover:bg-black/5 transition-colors">
            <RefreshCw size={16} className={loading ? 'animate-spin text-gray-400' : 'text-gray-400'}/>
          </button>
        </div>
      </div>

      {loading && !events.length && (
        <div className="text-center py-16"><Loader2 size={28} className="animate-spin text-[#003087] mx-auto"/></div>
      )}
      {error && <p className="text-red-500 text-[13px] text-center py-4">{error}</p>}

      {/* Week grid */}
      <div className="grid grid-cols-5 gap-3">
        {days.map((day, i) => {
          const isToday = day.toDateString() === new Date().toDateString()
          const dayEvents = eventsForDay(day)
          return (
            <div key={i} className="space-y-2">
              <div className={`text-center py-2 rounded-xl ${isToday ? 'bg-[#003087] text-white' : 'bg-black/4'}`}>
                <p className={`text-[11px] font-semibold uppercase tracking-wide ${isToday ? 'text-white/80' : 'text-gray-500'}`}>
                  {day.toLocaleDateString('en-US',{weekday:'short'})}
                </p>
                <p className={`text-[18px] font-bold ${isToday ? 'text-white' : 'text-gray-900'}`}>{day.getDate()}</p>
              </div>
              {dayEvents.length === 0 && <div className="h-8 rounded-lg border border-dashed border-black/8"/>}
              {dayEvents.map((ev, j) => {
                const isTeams = ev.isOnlineMeeting
                const color = isTeams ? TYPE_COLOR.Teams : TYPE_COLOR.Default
                return (
                  <div key={j} className={`rounded-xl border px-2.5 py-2 text-left ${color}`}>
                    <p className="text-[12px] font-semibold leading-tight line-clamp-2">{ev.subject}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <Clock size={10} className="opacity-60"/>
                      <span className="text-[10px] opacity-70">{timeStr(ev.start.dateTime)}</span>
                    </div>
                    {ev.attendees?.length > 0 && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <Users size={10} className="opacity-60"/>
                        <span className="text-[10px] opacity-70">{ev.attendees.length} people</span>
                      </div>
                    )}
                    <div className="flex gap-1 mt-1.5">
                      {ev.onlineMeetingUrl && (
                        <a href={ev.onlineMeetingUrl} target="_blank" rel="noreferrer"
                          className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-[#5b5fc7] text-white flex items-center gap-0.5">
                          <Video size={9}/>Join
                        </a>
                      )}
                      <button onClick={onRecord}
                        className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-red-500 text-white flex items-center gap-0.5">
                        Record
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}
