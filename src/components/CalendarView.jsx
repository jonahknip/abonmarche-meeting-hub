import React, { useState, useEffect } from 'react'
import { Calendar, ChevronLeft, ChevronRight, Clock, Video, RefreshCw, Loader2, Link } from 'lucide-react'

// ── ICS Parser — handles Outlook's TZID format properly ──────────────────
function parseICS(text) {
  // Unfold continuation lines (RFC 5545)
  const unfolded = text.replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '')
  const events = []
  const blocks = unfolded.split(/BEGIN:VEVENT/i)

  for (let i = 1; i < blocks.length; i++) {
    const b = blocks[i]

    // Get property — handles TZID params like DTSTART;TZID=America/New_York:20260325T090000
    const get = (key) => {
      const m = b.match(new RegExp(`^${key}(?:;[^:]*)?:(.+)$`, 'mi'))
      return m ? m[1].trim() : ''
    }

    // Robust date parser for all Outlook formats
    const parseDate = (s) => {
      if (!s) return null
      // All-day: YYYYMMDD
      if (/^\d{8}$/.test(s)) {
        return new Date(
          parseInt(s.slice(0,4)), parseInt(s.slice(4,6))-1, parseInt(s.slice(6,8))
        )
      }
      // DateTime: YYYYMMDDTHHMMSS or YYYYMMDDTHHMMSSZ
      if (/^\d{8}T\d{6}/.test(s)) {
        const y=s.slice(0,4), mo=s.slice(4,6), d=s.slice(6,8)
        const h=s.slice(9,11), min=s.slice(11,13), sec=s.slice(13,15)||'00'
        const utc = s.endsWith('Z')
        const str = `${y}-${mo}-${d}T${h}:${min}:${sec}${utc?'Z':''}`
        return new Date(str)
      }
      return null
    }

    const startRaw = get('DTSTART')
    const endRaw   = get('DTEND')
    const start    = parseDate(startRaw)
    const end      = parseDate(endRaw)
    if (!start || isNaN(start.getTime())) continue

    // Decode escaped chars
    const decode = s => s.replace(/\\n/g,' ').replace(/\\,/g,',').replace(/\\;/g,';').replace(/\\\\/g,'\\')
    const summary  = decode(get('SUMMARY'))
    const location = decode(get('LOCATION'))
    const url      = get('URL')
    const desc     = decode(get('DESCRIPTION'))

    // Find Teams join URL anywhere in description or location
    const teamsMatch = (desc + ' ' + location + ' ' + url).match(
      /https:\/\/teams\.microsoft\.com\/l\/meetup-join\/[^\s"<>\\]+/
    )
    const teamsUrl = teamsMatch ? teamsMatch[0] : ''
    const isTeams  = Boolean(teamsUrl) ||
      desc.includes('teams.microsoft') ||
      location.toLowerCase().includes('microsoft teams')

    if (summary) events.push({ summary, start, end, location, teamsUrl, isTeams })
  }
  return events.sort((a, b) => a.start - b.start)
}

function fmt(d) {
  if (!d) return ''
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

function getWeekDays(anchor) {
  const d = new Date(anchor)
  d.setDate(d.getDate() - d.getDay() + 1) // Monday
  return Array.from({ length: 5 }, (_, i) => {
    const x = new Date(d); x.setDate(d.getDate() + i); return x
  })
}

// Multiple CORS proxies — try each in order until one works
const PROXIES = [
  url => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  url => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  url => `https://cors-anywhere.herokuapp.com/${url}`,
]

async function fetchICS(url) {
  for (const proxy of PROXIES) {
    try {
      const res = await fetch(proxy(url), {
        headers: { 'Accept': 'text/calendar, text/plain, */*' }
      })
      if (!res.ok) continue
      const text = await res.text()
      if (text.includes('BEGIN:VCALENDAR')) return text
    } catch (e) { continue }
  }
  throw new Error('All proxies failed — see instructions below')
}

export default function CalendarView({ onRecord }) {
  const [icsUrl, setIcsUrl]     = useState(localStorage.getItem('mhai_ics_url') || '')
  const [events, setEvents]     = useState([])
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [anchor, setAnchor]     = useState(new Date())
  const [setup, setSetup]       = useState(!localStorage.getItem('mhai_ics_url'))
  const [inputUrl, setInputUrl] = useState('')
  const days = getWeekDays(anchor)

  const loadCalendar = async (url) => {
    if (!url?.trim()) return
    setLoading(true); setError('')
    try {
      const text   = await fetchICS(url.trim())
      const parsed = parseICS(text)
      setEvents(parsed)
      localStorage.setItem('mhai_ics_url', url.trim())
      setIcsUrl(url.trim())
      setSetup(false)
    } catch (e) {
      setError(e.message)
    }
    setLoading(false)
  }

  useEffect(() => { if (icsUrl && !setup) loadCalendar(icsUrl) }, [anchor])

  const eventsForDay = (day) =>
    events.filter(e => e.start.toDateString() === day.toDateString())

  // ── Setup screen ────────────────────────────────────────────────────────
  if (setup) return (
    <div className="pt-24 px-5 max-w-lg mx-auto">
      <div className="bg-white rounded-3xl shadow-sm border border-black/6 p-8">
        <div className="w-14 h-14 rounded-2xl bg-[#5b5fc7]/10 flex items-center justify-center mb-5">
          <Calendar size={26} className="text-[#5b5fc7]"/>
        </div>
        <h2 className="text-[20px] font-semibold text-gray-900 mb-1">Connect Outlook Calendar</h2>
        <p className="text-[13px] text-gray-500 mb-5">One-time setup — paste your ICS link below.</p>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-5 text-[13px] text-blue-900 space-y-2">
          <p className="font-bold">Get your ICS URL from Outlook Web:</p>
          <ol className="list-decimal list-inside space-y-1 leading-relaxed">
            <li>Go to <strong>outlook.office365.com</strong> (your work Outlook)</li>
            <li>Click the <strong>Calendar</strong> icon (bottom left)</li>
            <li>Click the <strong>gear/settings</strong> icon (top right)</li>
            <li>Search for <strong>"publish"</strong> → click <strong>Publish a calendar</strong></li>
            <li>Choose <strong>Calendar</strong> → <strong>All details</strong> → click <strong>Publish</strong></li>
            <li>Copy the <strong>ICS link</strong> (ends in <code className="bg-blue-100 px-1 rounded">.ics</code>)</li>
          </ol>
          <p className="text-blue-700 mt-2">⚠️ Use <strong>outlook.office365.com</strong> (work), not outlook.com (personal)</p>
        </div>

        <label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest block mb-1.5">
          ICS Calendar URL
        </label>
        <input
          value={inputUrl}
          onChange={e => setInputUrl(e.target.value)}
          placeholder="https://outlook.office365.com/owa/calendar/…/calendar.ics"
          className="w-full border border-black/10 rounded-xl px-3.5 py-2.5 text-[13px] outline-none focus:border-[#003087]/40 mb-1"
        />
        <p className="text-[11px] text-gray-400 mb-4">Paste the full URL from Outlook's "Publish calendar" page</p>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 text-[12px] text-red-700">
            <p className="font-semibold mb-1">Could not connect ⚠️</p>
            <p>{error}</p>
            <p className="mt-2 text-red-600">Make sure you copied the full ICS URL from <strong>outlook.office365.com</strong> (not the Outlook app).</p>
          </div>
        )}

        <button
          onClick={() => loadCalendar(inputUrl)}
          disabled={!inputUrl.trim() || loading}
          className="w-full py-2.5 bg-[#003087] text-white rounded-xl font-semibold text-[14px] disabled:opacity-40 flex items-center justify-center gap-2 hover:bg-[#002070] transition-colors"
        >
          {loading
            ? <><Loader2 size={15} className="animate-spin"/>Connecting…</>
            : <><Link size={14}/>Connect Calendar</>
          }
        </button>
      </div>
    </div>
  )

  // ── Calendar week view ───────────────────────────────────────────────────
  return (
    <div className="pt-20 pb-12 px-4 max-w-5xl mx-auto">
      <div className="flex items-center justify-between pt-4 mb-5">
        <div>
          <h1 className="text-[22px] font-semibold text-gray-900">Calendar</h1>
          <p className="text-[13px] text-gray-400 mt-0.5">
            {days[0].toLocaleDateString('en-US',{month:'short',day:'numeric'})} –{' '}
            {days[4].toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { const d=new Date(anchor); d.setDate(d.getDate()-7); setAnchor(d) }}
            className="p-2 rounded-xl hover:bg-black/5 transition-colors"><ChevronLeft size={18}/></button>
          <button onClick={() => setAnchor(new Date())}
            className="px-3 py-1.5 text-[13px] font-medium rounded-xl bg-[#003087]/8 text-[#003087]">Today</button>
          <button onClick={() => { const d=new Date(anchor); d.setDate(d.getDate()+7); setAnchor(d) }}
            className="p-2 rounded-xl hover:bg-black/5 transition-colors"><ChevronRight size={18}/></button>
          <button onClick={() => loadCalendar(icsUrl)}
            className="p-2 rounded-xl hover:bg-black/5 transition-colors">
            <RefreshCw size={15} className={loading ? 'animate-spin text-gray-300' : 'text-gray-400'}/>
          </button>
          <button onClick={() => { setSetup(true); setError('') }}
            className="text-[12px] text-gray-400 hover:text-gray-600 px-2">Change</button>
        </div>
      </div>

      {loading && !events.length && (
        <div className="text-center py-16"><Loader2 size={28} className="animate-spin text-[#003087] mx-auto"/></div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-[13px] text-red-700 mb-4">
          {error} — <button onClick={() => setSetup(true)} className="underline font-medium">Update ICS URL</button>
        </div>
      )}

      <div className="grid grid-cols-5 gap-3">
        {days.map((day, i) => {
          const today   = day.toDateString() === new Date().toDateString()
          const dayEvts = eventsForDay(day)
          return (
            <div key={i} className="space-y-2">
              <div className={`text-center py-2 rounded-xl ${today ? 'bg-[#003087]' : 'bg-black/4'}`}>
                <p className={`text-[10px] font-bold uppercase tracking-widest ${today?'text-white/70':'text-gray-400'}`}>
                  {day.toLocaleDateString('en-US',{weekday:'short'})}
                </p>
                <p className={`text-[20px] font-bold leading-tight ${today?'text-white':'text-gray-900'}`}>
                  {day.getDate()}
                </p>
              </div>
              {dayEvts.length === 0 && <div className="h-6 rounded-lg border border-dashed border-black/8"/>}
              {dayEvts.map((ev, j) => (
                <div key={j} className={`rounded-xl border px-2.5 py-2 space-y-1 ${
                  ev.isTeams ? 'bg-[#5b5fc7]/6 border-[#5b5fc7]/20' : 'bg-gray-50 border-black/8'
                }`}>
                  <p className="text-[12px] font-semibold text-gray-900 leading-snug line-clamp-2">{ev.summary}</p>
                  <p className="text-[10px] text-gray-500 flex items-center gap-1">
                    <Clock size={9}/>{fmt(ev.start)}{ev.end && ` – ${fmt(ev.end)}`}
                  </p>
                  {ev.location && !ev.isTeams && (
                    <p className="text-[10px] text-gray-400 truncate">{ev.location}</p>
                  )}
                  <div className="flex gap-1 pt-0.5 flex-wrap">
                    {ev.teamsUrl && (
                      <a href={ev.teamsUrl} target="_blank" rel="noreferrer"
                        className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#5b5fc7] text-white flex items-center gap-0.5">
                        <Video size={9}/>Join
                      </a>
                    )}
                    <button onClick={onRecord}
                      className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-red-500 text-white">
                      Record
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        })}
      </div>

      {!loading && !error && events.length === 0 && (
        <p className="text-center text-gray-400 text-[13px] py-12">No events this week.</p>
      )}
    </div>
  )
}
