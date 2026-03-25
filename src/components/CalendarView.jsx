import React, { useState, useRef } from 'react'
import { Calendar, ChevronLeft, ChevronRight, Clock, Video, RefreshCw, Loader2, Upload, FileText } from 'lucide-react'

// ── ICS Parser ──────────────────────────────────────────────────────────────
function parseICS(text) {
  const unfolded = text.replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '')
  const events = []
  const blocks = unfolded.split(/BEGIN:VEVENT/i)

  for (let i = 1; i < blocks.length; i++) {
    const b = blocks[i]
    const get = (key) => {
      const m = b.match(new RegExp(`^${key}(?:;[^:]*)?:(.+)$`, 'mi'))
      return m ? m[1].trim() : ''
    }
    const parseDate = (s) => {
      if (!s) return null
      if (/^\d{8}$/.test(s)) {
        return new Date(+s.slice(0,4), +s.slice(4,6)-1, +s.slice(6,8))
      }
      if (/^\d{8}T\d{6}/.test(s)) {
        const str = `${s.slice(0,4)}-${s.slice(4,6)}-${s.slice(6,8)}T${s.slice(9,11)}:${s.slice(11,13)}:${s.slice(13,15)||'00'}${s.endsWith('Z')?'Z':''}`
        return new Date(str)
      }
      return null
    }
    const start = parseDate(get('DTSTART'))
    const end   = parseDate(get('DTEND'))
    if (!start || isNaN(start.getTime())) continue

    const decode = s => s.replace(/\\n/g,' ').replace(/\\,/g,',').replace(/\\;/g,';').replace(/\\\\/g,'\\')
    const summary  = decode(get('SUMMARY'))
    const location = decode(get('LOCATION'))
    const desc     = decode(get('DESCRIPTION'))
    const url      = get('URL')

    const teamsMatch = (desc+' '+location+' '+url).match(
      /https:\/\/teams\.microsoft\.com\/l\/meetup-join\/[^\s"<>\\]+/
    )
    const teamsUrl = teamsMatch ? teamsMatch[0] : ''
    const isTeams  = Boolean(teamsUrl) || desc.includes('teams.microsoft') ||
                     location.toLowerCase().includes('microsoft teams')

    if (summary) events.push({ summary, start, end, location, teamsUrl, isTeams })
  }
  return events.sort((a,b) => a.start - b.start)
}

function fmt(d) {
  if (!d) return ''
  return d.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit',hour12:true})
}
function getWeekDays(anchor) {
  const d = new Date(anchor)
  d.setDate(d.getDate() - d.getDay() + 1)
  return Array.from({length:5},(_,i)=>{ const x=new Date(d); x.setDate(d.getDate()+i); return x })
}

export default function CalendarView({ onRecord }) {
  const [events, setEvents]   = useState(() => {
    try { return JSON.parse(localStorage.getItem('mhai_cal_events') || '[]')
      .map(e => ({...e, start: new Date(e.start), end: e.end ? new Date(e.end) : null}))
    } catch { return [] }
  })
  const [anchor, setAnchor]   = useState(new Date())
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [fileName, setFileName] = useState(localStorage.getItem('mhai_cal_file') || '')
  const [showSetup, setShowSetup] = useState(!localStorage.getItem('mhai_cal_file'))
  const fileRef = useRef()
  const days = getWeekDays(anchor)

  const loadFile = (file) => {
    if (!file) return
    setLoading(true); setError('')
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const text = e.target.result
        if (!text.includes('BEGIN:VCALENDAR')) throw new Error('Not a valid .ics calendar file')
        const parsed = parseICS(text)
        setEvents(parsed)
        setFileName(file.name)
        setShowSetup(false)
        localStorage.setItem('mhai_cal_file', file.name)
        // Store serialized events
        localStorage.setItem('mhai_cal_events', JSON.stringify(
          parsed.map(ev => ({...ev, start: ev.start.toISOString(), end: ev.end?.toISOString()||null}))
        ))
      } catch(err) {
        setError(err.message)
      }
      setLoading(false)
    }
    reader.onerror = () => { setError('Failed to read file'); setLoading(false) }
    reader.readAsText(file)
  }

  const eventsForDay = (day) =>
    events.filter(e => e.start instanceof Date && e.start.toDateString() === day.toDateString())

  // ── Setup / Upload screen ─────────────────────────────────────────────────
  if (showSetup) return (
    <div className="pt-24 px-5 max-w-lg mx-auto">
      <div className="bg-white rounded-3xl shadow-sm border border-black/6 p-8">
        <div className="w-14 h-14 rounded-2xl bg-[#5b5fc7]/10 flex items-center justify-center mb-5">
          <Calendar size={26} className="text-[#5b5fc7]"/>
        </div>
        <h2 className="text-[20px] font-semibold text-gray-900 mb-1">Import Outlook Calendar</h2>
        <p className="text-[13px] text-gray-500 mb-5">
          Export your calendar from Outlook as an .ics file and upload it here.
          Re-upload anytime to refresh.
        </p>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-5 text-[13px] text-blue-900 space-y-2">
          <p className="font-bold">How to export from Outlook (desktop app):</p>
          <ol className="list-decimal list-inside space-y-1 leading-relaxed">
            <li>Open <strong>Outlook</strong> on your Mac</li>
            <li>Click <strong>File → Export</strong></li>
            <li>Select <strong>Contacts and calendar to an OLM archive</strong> <br/>
                <span className="text-blue-700 text-[12px]">— OR — go to Calendar → right-click a calendar → Save as .ics</span></li>
            <li>Save the <strong>.ics file</strong> to your Desktop</li>
            <li>Upload it below</li>
          </ol>
          <p className="font-bold mt-2">From Outlook Web (outlook.office365.com):</p>
          <ol className="list-decimal list-inside space-y-1 leading-relaxed">
            <li>Go to Calendar → click the <strong>⚙️ Settings</strong> gear</li>
            <li>Search <strong>"export"</strong> → click <strong>Export calendar</strong></li>
            <li>Choose your calendar → click <strong>Export</strong></li>
            <li>Upload the downloaded <strong>.ics file</strong> below</li>
          </ol>
        </div>

        <input ref={fileRef} type="file" accept=".ics" className="hidden"
          onChange={e => e.target.files?.[0] && loadFile(e.target.files[0])}/>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 text-[12px] text-red-700">
            <p className="font-semibold">Error ⚠️</p><p>{error}</p>
          </div>
        )}

        <button onClick={() => fileRef.current?.click()} disabled={loading}
          className="w-full py-3 bg-[#003087] text-white rounded-xl font-semibold text-[14px] disabled:opacity-40 flex items-center justify-center gap-2 hover:bg-[#002070] transition-colors">
          {loading
            ? <><Loader2 size={15} className="animate-spin"/>Reading calendar…</>
            : <><Upload size={15}/>Upload .ics File</>
          }
        </button>
      </div>
    </div>
  )

  // ── Calendar week view ────────────────────────────────────────────────────
  return (
    <div className="pt-20 pb-12 px-4 max-w-5xl mx-auto">
      <div className="flex items-center justify-between pt-4 mb-5">
        <div>
          <h1 className="text-[22px] font-semibold text-gray-900">Calendar</h1>
          <p className="text-[13px] text-gray-400 mt-0.5">
            {days[0].toLocaleDateString('en-US',{month:'short',day:'numeric'})} –{' '}
            {days[4].toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}
            {fileName && <span className="ml-2 text-gray-300">· {fileName}</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={()=>{const d=new Date(anchor);d.setDate(d.getDate()-7);setAnchor(d)}}
            className="p-2 rounded-xl hover:bg-black/5 transition-colors"><ChevronLeft size={18}/></button>
          <button onClick={()=>setAnchor(new Date())}
            className="px-3 py-1.5 text-[13px] font-medium rounded-xl bg-[#003087]/8 text-[#003087] hover:bg-[#003087]/12">Today</button>
          <button onClick={()=>{const d=new Date(anchor);d.setDate(d.getDate()+7);setAnchor(d)}}
            className="p-2 rounded-xl hover:bg-black/5 transition-colors"><ChevronRight size={18}/></button>
          <button onClick={()=>fileRef.current?.click()}
            className="p-2 rounded-xl hover:bg-black/5 transition-colors" title="Import new .ics file">
            <RefreshCw size={15} className="text-gray-400"/>
          </button>
          <input ref={fileRef} type="file" accept=".ics" className="hidden"
            onChange={e => e.target.files?.[0] && loadFile(e.target.files[0])}/>
        </div>
      </div>

      {events.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <FileText size={32} className="mx-auto mb-3 opacity-30"/>
          <p className="text-[14px]">No events loaded. Export your calendar from Outlook and upload the .ics file.</p>
          <button onClick={()=>setShowSetup(true)}
            className="mt-4 px-4 py-2 bg-[#003087] text-white rounded-xl text-[13px] font-medium hover:bg-[#002070]">
            Upload .ics File
          </button>
        </div>
      )}

      <div className="grid grid-cols-5 gap-3">
        {days.map((day, i) => {
          const today   = day.toDateString() === new Date().toDateString()
          const dayEvts = eventsForDay(day)
          return (
            <div key={i} className="space-y-2">
              <div className={`text-center py-2 rounded-xl ${today?'bg-[#003087]':'bg-black/4'}`}>
                <p className={`text-[10px] font-bold uppercase tracking-widest ${today?'text-white/70':'text-gray-400'}`}>
                  {day.toLocaleDateString('en-US',{weekday:'short'})}
                </p>
                <p className={`text-[20px] font-bold leading-tight ${today?'text-white':'text-gray-900'}`}>
                  {day.getDate()}
                </p>
              </div>
              {dayEvts.length === 0 && <div className="h-6 rounded-lg border border-dashed border-black/8"/>}
              {dayEvts.map((ev,j) => (
                <div key={j} className={`rounded-xl border px-2.5 py-2 space-y-1 ${
                  ev.isTeams ? 'bg-[#5b5fc7]/6 border-[#5b5fc7]/20' : 'bg-gray-50 border-black/8'
                }`}>
                  <p className="text-[12px] font-semibold text-gray-900 leading-snug line-clamp-2">{ev.summary}</p>
                  <p className="text-[10px] text-gray-500 flex items-center gap-1">
                    <Clock size={9}/>{fmt(ev.start)}{ev.end ? ` – ${fmt(ev.end)}` : ''}
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
    </div>
  )
}
