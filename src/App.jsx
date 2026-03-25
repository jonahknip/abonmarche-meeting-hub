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

export default function App() {
  const [view, setView] = useState('home')
  const [meetings, setMeetings] = useState(SEED_MEETINGS)
  const [selectedMeeting, setSelectedMeeting] = useState(null)
  const [chatOpen, setChatOpen] = useState(false)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [recordOpen, setRecordOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const filtered = meetings.filter(m => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return m.title.toLowerCase().includes(q) ||
      m.summary?.toLowerCase().includes(q) ||
      m.tags?.some(t => t.includes(q)) ||
      m.attendees?.some(a => a.toLowerCase().includes(q)) ||
      m.key_decisions?.some(d => d.toLowerCase().includes(q)) ||
      m.action_items?.some(a => a.text?.toLowerCase().includes(q))
  })

  const addMeeting = (m) => {
    setMeetings(prev => [m, ...prev])
    setView('dashboard')
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
        {view === 'home' && <Hero meetings={meetings} onEnter={() => setView('dashboard')} onUpload={() => setUploadOpen(true)}/>}
        {view === 'dashboard' && <Dashboard meetings={filtered} onSelect={m => { setSelectedMeeting(m); setView('detail') }} onUpload={() => setUploadOpen(true)} searchQuery={searchQuery}/>}
        {view === 'detail' && selectedMeeting && <MeetingDetail meeting={selectedMeeting} onBack={() => setView('dashboard')} onChat={() => setChatOpen(true)}/>}
        {view === 'week' && <WeekPlan onBack={() => setView('dashboard')}/>}
        {view === 'calendar' && <CalendarView onUpload={() => setUploadOpen(true)} onRecord={() => setRecordOpen(true)}/>}
      </main>

      {chatOpen && <ChatPanel meetings={meetings} onClose={() => setChatOpen(false)} currentMeeting={view==='detail' ? selectedMeeting : null}/>}
      {uploadOpen && <UploadModal onClose={() => setUploadOpen(false)} onAdd={addMeeting}/>}
      {recordOpen && <RecordModal onClose={() => setRecordOpen(false)} onAdd={addMeeting}/>}
    </div>
  )
}
