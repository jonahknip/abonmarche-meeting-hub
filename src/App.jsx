import React, { useState, useEffect } from 'react'
import Nav from './components/Nav.jsx'
import Hero from './components/Hero.jsx'
import Dashboard from './components/Dashboard.jsx'
import MeetingDetail from './components/MeetingDetail.jsx'
import ChatPanel from './components/ChatPanel.jsx'
import UploadModal from './components/UploadModal.jsx'
import RecordModal from './components/RecordModal.jsx'
import CalendarView from './components/CalendarView.jsx'
import WeekPlan from './components/WeekPlan.jsx'
import { SEED_MEETINGS } from './lib/seedData.js'

const STORAGE_KEY = 'mhai_meetings_v2'

function loadMeetings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const saved = JSON.parse(raw)
      // Merge: saved meetings override seeds by id, seeds fill gaps
      const savedIds = new Set(saved.map(m => m.id))
      const merged = [
        ...saved,
        ...SEED_MEETINGS.filter(m => !savedIds.has(m.id))
      ]
      return merged.sort((a, b) => new Date(b.date) - new Date(a.date))
    }
  } catch(e) { console.error('Failed to load meetings:', e) }
  return SEED_MEETINGS
}

function saveMeetings(meetings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(meetings))
  } catch(e) { console.error('Failed to save meetings:', e) }
}

export default function App() {
  const [view, setView]                   = useState('home')
  const [meetings, setMeetings]           = useState(loadMeetings)
  const [selectedMeeting, setSelectedMeeting] = useState(null)
  const [chatOpen, setChatOpen]           = useState(false)
  const [uploadOpen, setUploadOpen]       = useState(false)
  const [recordOpen, setRecordOpen]       = useState(false)
  const [searchQuery, setSearchQuery]     = useState('')

  // Persist every time meetings changes
  useEffect(() => { saveMeetings(meetings) }, [meetings])

  const filtered = meetings.filter(m => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return m.title?.toLowerCase().includes(q) ||
      m.summary?.toLowerCase().includes(q) ||
      m.tags?.some(t => t.toLowerCase().includes(q)) ||
      m.attendees?.some(a => a.toLowerCase().includes(q)) ||
      m.key_decisions?.some(d => d.toLowerCase().includes(q)) ||
      m.action_items?.some(a => a.text?.toLowerCase().includes(q))
  })

  const addMeeting = (m) => {
    setMeetings(prev => {
      const next = [m, ...prev.filter(x => x.id !== m.id)]
      return next
    })
    setView('dashboard')
  }

  const updateMeeting = (updated) => {
    setMeetings(prev => prev.map(m => m.id === updated.id ? updated : m))
    if (selectedMeeting?.id === updated.id) setSelectedMeeting(updated)
  }

  const deleteMeeting = (id) => {
    setMeetings(prev => prev.filter(m => m.id !== id))
    if (selectedMeeting?.id === id) { setSelectedMeeting(null); setView('dashboard') }
  }

  return (
    <div className="min-h-screen bg-[#fbfbfd] font-sans">
      <Nav
        view={view} setView={setView}
        onUpload={() => setUploadOpen(true)}
        onRecord={() => setRecordOpen(true)}
        onChat={() => setChatOpen(true)}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />
      <main>
        {view === 'home' && (
          <Hero meetings={meetings} onEnter={() => setView('dashboard')} onUpload={() => setUploadOpen(true)}/>
        )}
        {view === 'dashboard' && (
          <Dashboard
            meetings={filtered}
            onSelect={m => { setSelectedMeeting(m); setView('detail') }}
            onUpload={() => setUploadOpen(true)}
            onDelete={deleteMeeting}
            onRename={updateMeeting}
            searchQuery={searchQuery}
          />
        )}
        {view === 'detail' && selectedMeeting && (
          <MeetingDetail
            meeting={selectedMeeting}
            onBack={() => setView('dashboard')}
            onChat={() => setChatOpen(true)}
            onDelete={() => { deleteMeeting(selectedMeeting.id); setView('dashboard') }}
            onRename={updateMeeting}
          />
        )}
        {view === 'week' && <WeekPlan onBack={() => setView('dashboard')}/>}
        {view === 'calendar' && <CalendarView onUpload={() => setUploadOpen(true)} onRecord={() => setRecordOpen(true)}/>}
      </main>

      {chatOpen && (
        <ChatPanel meetings={meetings} onClose={() => setChatOpen(false)}
          currentMeeting={view === 'detail' ? selectedMeeting : null}/>
      )}
      {uploadOpen && <UploadModal onClose={() => setUploadOpen(false)} onAdd={addMeeting}/>}
      {recordOpen && <RecordModal onClose={() => setRecordOpen(false)} onAdd={addMeeting}/>}
    </div>
  )
}
