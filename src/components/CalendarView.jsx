import React, { useState, useEffect } from 'react'
import { Calendar, ChevronLeft, ChevronRight, Clock, Users, Video, RefreshCw, Loader2, Link, ExternalLink } from 'lucide-react'

// Parse ICS text into event objects
function parseICS(text) {
  const events = []
  const blocks = text.split('BEGIN:VEVENT')
  for (let i = 1; i < blocks.length; i++) {
    const b = blocks[i]
    const get = (key) => {
      const m = b.match(new RegExp(`${key}[^:]*:([^\r\n]+)`))
      return m ? m[1].trim() : ''
    }
    const parseDate = (s) => {
      if (!s) return null
      // Handle TZID format and basic YYYYMMDDTHHMMSS
      const clean = s.replace(/[TZ]/g, match => match === 'T' ? 'T' : '')
      const y=s.slice(0,4), mo=s.slice(4,6), d=s.slice(6,8)
      const h=s.slice(9,11)||'00', min=s.slice(11,13)||'00'
      return new Date(`${y}-${mo}-${d}T${h}:${min}:00`)
    }
    const startRaw = get('DTSTART')
    const endRaw   = get('DTEND')
    const start    = parseDate(startRaw)
    const end      = parseDate(endRaw)
    if (!start || isNaN(start)) continue
    const summary  = get('SUMMARY').replace(/\\,/g,',').replace(/\\n/g,' ')
    const location = get('LOCATION').replace(/\\,/g,',')
    const url      = get('URL')
    const desc     = get('DESCRIPTION').replace(/\\n/g,' ')
    const isTeams  = desc.includes('teams.microsoft') || location.includes('teams.microsoft') || url.includes('teams.microsoft')
    const teamsUrl = (desc.match(/https:\/\/teams\.microsoft\.com\/[^\s"\\]+/) || [])[0] ||
                     (url.includes('teams') ? url : '')
    events.push({ summary, start, end, location, teamsUrl, isTeams, url })
  }
  return events.sort((a,b) => a.start - b.start)
}

function fmt(d) {
  return d.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit',hour12:true})
}
function getWeekDays(anchor) {
  const d = new Date(anchor)
  d.setDate(d.getDate() - d.getDay() + 1)
  return Array.from({length:5},(_,i)=>{ const x=new Date(d); x.setDate(d.getDate()+i); return x })
}

const ICS_PROXY = 'https://corsproxy.io/?'

export default function CalendarView({ onRecord }) {
  const [icsUrl, setIcsUrl]   = useState(localStorage.getItem('mhai_ics_url') || '')
  const [events, setEvents]   = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [anchor, setAnchor]   = useState(new Date())
  const [setup, setSetup]     = useState(!localStorage.getItem('mhai_ics_url'))
  const [inputUrl, setInputUrl] = useState('')

  const days = getWeekDays(anchor)

  const loadCalendar = async (url) => {
    if (!url) return
    setLoading(true); setError('')
    try {
      const res  = await fetch(ICS_PROXY + encodeURIComponent(url))
      const text = await res.text()
      if (!text.includes('BEGIN:VCALENDAR')) throw new Error('Not a valid calendar feed')
      const parsed = parseICS(text)
      setEvents(parsed)
      localStorage.setItem('mhai_ics_url', url)
      setIcsUrl(url)
      setSetup(false)
    } catch(e) {
      setError('Could not load calendar. Check the URL and try again.')
    }
    setLoading(false)
  }

  useEffect(() => { if (icsUrl && !setup) loadCalendar(icsUrl) }, [anchor])

  const eventsForDay = (day) => events.filter(e =>
    e.start.toDateString() === day.toDateString()
  )

  // ── Setup screen ──────────────────────────────────────────────────────────
  if (setup) return (
    <div className="pt-24 px-6 max-w-lg mx-auto">
      <div className="bg-white rounded-3xl shadow-sm border border-black/6 p-8">
        <div className="w-14 h-14 rounded-2xl bg-[#5b5fc7]/10 flex items-center justify-center mb-5">
          <Calendar size={26} className="text-[#5b5fc7]"/>
        </div>
        <h2 className="text-[20px] font-semibold text-gray-900 mb-1">Connect Teams Calendar</h2>
        <p className="text-[13px] text-gray-500 mb-6">No Azure app needed — just paste your personal Teams ICS link.</p>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-5 space-y-2 text-[13px] text-blue-800">
          <p className="font-semibold">How to get your Teams ICS URL:</p>
          <ol className="space-y-1 list-decimal list-inside">
            <li>Open <strong>Outlook Web</strong> (outlook.office.com)</li>
            <li>Click the calendar icon → <strong>Settings</strong> (gear top-right)</li>
            <li>Go to <strong>View all Outlook settings → Calendar → Shared calendars</strong></li>
            <li>Under "Publish a calendar" → select <strong>Calendar</strong> → <strong>All details</strong></li>
            <li>Click <strong>Publish</strong> → copy the <strong>ICS link</strong></li>
          </ol>
        </div>

        <label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest block mb-1.5">ICS Calendar URL</label>
        <input value={inputUrl} onChange={e=>setInputUrl(e.target.value)}
          placeholder="https://outlook.live.com/owa/calendar/…/calendar.ics"
          className="w-full border border-black/10 rounded-xl px-3.5 py-2.5 text-[13px] outline-none focus:border-[#003087]/40 mb-4"/>

        {error && <p className="text-red-500 text-[13px] mb-3">{error}</p>}

        <button onClick={() => loadCalendar(inputUrl)} disabled={!inputUrl.trim() || loading}
          className="w-full py-2.5 bg-[#003087] text-white rounded-xl font-medium text-[14px] disabled:opacity-40 flex items-center justify-center gap-2">
          {loading ? <><Loader2 size={15} className="animate-spin"/>Connecting…</> : <><Link size={14}/>Connect Calendar</>}
        </button>
      </div>
    </div>
  )

  // ── Calendar view ─────────────────────────────────────────────────────────
  return (
    <div className="pt-20 pb-12 px-4 max-w-5xl mx-auto">
      <div className="flex items-center justify-between pt-4 mb-5">
        <div>
          <h1 className="text-[22px] font-semibold text-gray-900">Calendar</h1>
          <p className="text-[13px] text-gray-400 mt-0.5">
            {days[0].toLocaleDateString('en-US',{month:'short',day:'numeric'})} – {days[4].toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={()=>{const d=new Date(anchor);d.setDate(d.getDate()-7);setAnchor(d)}}
            className="p-2 rounded-xl hover:bg-black/5 transition-colors"><ChevronLeft size={18}/></button>
          <button onClick={()=>setAnchor(new Date())}
            className="px-3 py-1.5 text-[13px] font-medium rounded-xl bg-[#003087]/8 text-[#003087] hover:bg-[#003087]/12">Today</button>
          <button onClick={()=>{const d=new Date(anchor);d.setDate(d.getDate()+7);setAnchor(d)}}
            className="p-2 rounded-xl hover:bg-black/5 transition-colors"><ChevronRight size={18}/></button>
          <button onClick={()=>loadCalendar(icsUrl)}
            className="p-2 rounded-xl hover:bg-black/5 transition-colors">
            <RefreshCw size={15} className={loading?'animate-spin text-gray-300':'text-gray-400'}/>
          </button>
          <button onClick={()=>setSetup(true)}
            className="text-[12px] text-gray-400 hover:text-gray-600 px-2">Change</button>
        </div>
      </div>

      {loading && !events.length && (
        <div className="text-center py-16"><Loader2 size={28} className="animate-spin text-[#003087] mx-auto"/></div>
      )}
      {error && <p className="text-red-500 text-[13px] text-center py-4 bg-red-50 rounded-xl">{error}</p>}

      {/* Week grid */}
      <div className="grid grid-cols-5 gap-3">
        {days.map((day, i) => {
          const today = day.toDateString() === new Date().toDateString()
          const dayEvts = eventsForDay(day)
          return (
            <div key={i} className="space-y-2">
              {/* Day header */}
              <div className={`text-center py-2 rounded-xl ${today ? 'bg-[#003087]' : 'bg-black/4'}`}>
                <p className={`text-[10px] font-bold uppercase tracking-widest ${today?'text-white/70':'text-gray-400'}`}>
                  {day.toLocaleDateString('en-US',{weekday:'short'})}
                </p>
                <p className={`text-[20px] font-bold leading-tight ${today?'text-white':'text-gray-900'}`}>{day.getDate()}</p>
              </div>

              {dayEvts.length === 0 && (
                <div className="h-6 rounded-lg border border-dashed border-black/8"/>
              )}

              {dayEvts.map((ev,j) => (
                <div key={j} className={`rounded-xl border px-2.5 py-2 text-left space-y-1 ${ev.isTeams ? 'bg-[#5b5fc7]/6 border-[#5b5fc7]/20' : 'bg-gray-50 border-black/8'}`}>
                  <p className="text-[12px] font-semibold text-gray-900 leading-tight line-clamp-2">{ev.summary}</p>
                  <div className="flex items-center gap-1 text-[10px] text-gray-500">
                    <Clock size={9}/>{fmt(ev.start)}
                    {ev.end && <span>– {fmt(ev.end)}</span>}
                  </div>
                  {ev.location && !ev.isTeams && (
                    <p className="text-[10px] text-gray-400 truncate">{ev.location}</p>
                  )}
                  <div className="flex gap-1 pt-0.5">
                    {ev.teamsUrl && (
                      <a href={ev.teamsUrl} target="_blank" rel="noreferrer"
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-[#5b5fc7] text-white flex items-center gap-0.5">
                        <Video size={9}/>Join
                      </a>
                    )}
                    <button onClick={onRecord}
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-red-500 text-white">
                      Record
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        })}
      </div>

      {!loading && events.length === 0 && !error && (
        <div className="text-center py-12 text-gray-400 text-[13px]">
          No events found for this week.
        </div>
      )}
    </div>
  )
}
