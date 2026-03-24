import React, { useState, useEffect } from 'react'
import { Search, Upload, MessageCircle, ChevronLeft, Menu, X, Calendar } from 'lucide-react'

export default function Nav({ view, setView, onUpload, onChat, searchQuery, setSearchQuery }) {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', fn)
    return () => window.removeEventListener('scroll', fn)
  }, [])

  return (
    <nav className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${scrolled || view !== 'home' ? 'glass' : 'bg-transparent'}`}>
      <div className="max-w-6xl mx-auto px-5 h-[52px] flex items-center gap-4">

        {/* Back button */}
        {view !== 'home' && (
          <button
            onClick={() => setView(view === 'detail' ? 'dashboard' : 'home')}
            className="flex items-center gap-1 text-[#003087] text-sm font-medium hover:opacity-70 transition-opacity mr-1"
          >
            <ChevronLeft size={16} />
            {view === 'detail' ? 'Meetings' : 'MHAI'}
          </button>
        )}

        {/* Logo */}
        <button
          onClick={() => setView('home')}
          className="flex items-center gap-2.5 mr-auto"
        >
          <div className="w-7 h-7 rounded-lg bg-[#003087] flex items-center justify-center">
            <span className="text-white text-[11px] font-bold tracking-tight">AI</span>
          </div>
          <span className="text-[15px] font-semibold tracking-tight text-[#003087]">
            MHAI
          </span>
          <span className="hidden sm:block text-[11px] text-gray-400 font-normal mt-px">
            Abonmarche Intelligence
          </span>
        </button>

        {/* Search (dashboard + detail) */}
        {(view === 'dashboard' || view === 'detail') && (
          <div className="hidden md:flex items-center gap-2 bg-black/5 rounded-full px-3.5 py-1.5 w-64">
            <Search size={13} className="text-gray-400 shrink-0" />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search meetings, decisions…"
              className="bg-transparent text-[13px] text-gray-700 placeholder-gray-400 outline-none w-full"
            />
          </div>
        )}

        {/* Nav links */}
        <div className="hidden md:flex items-center gap-1">
          <NavBtn active={view === 'dashboard'} onClick={() => setView('dashboard')}>Meetings</NavBtn>
          <NavBtn active={view === 'week'} onClick={() => setView('week')}>
            <Calendar size={12} className="mr-1" />Week One
          </NavBtn>
          <button
            onClick={onChat}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#003087] text-white text-[13px] font-medium hover:bg-[#002070] transition-colors"
          >
            <MessageCircle size={13} />
            Ask MHAI
          </button>
          <button
            onClick={onUpload}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#003087]/30 text-[#003087] text-[13px] font-medium hover:bg-[#003087]/5 transition-colors ml-1"
          >
            <Upload size={13} />
            Upload
          </button>
        </div>

        {/* Mobile menu */}
        <button className="md:hidden" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X size={20} className="text-gray-600" /> : <Menu size={20} className="text-gray-600" />}
        </button>
      </div>

      {/* Mobile dropdown */}
      {mobileOpen && (
        <div className="md:hidden glass border-t border-black/5 px-5 py-3 space-y-2">
          <MobileBtn onClick={() => { setView('dashboard'); setMobileOpen(false) }}>Meetings</MobileBtn>
          <MobileBtn onClick={() => { setView('week'); setMobileOpen(false) }}>Week One Plan</MobileBtn>
          <MobileBtn onClick={() => { onChat(); setMobileOpen(false) }}>Ask MHAI</MobileBtn>
          <MobileBtn onClick={() => { onUpload(); setMobileOpen(false) }}>Upload Meeting</MobileBtn>
        </div>
      )}
    </nav>
  )
}

function NavBtn({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center px-3 py-1.5 rounded-full text-[13px] font-medium transition-colors ${
        active ? 'bg-black/8 text-gray-900' : 'text-gray-600 hover:text-gray-900 hover:bg-black/5'
      }`}
    >
      {children}
    </button>
  )
}
function MobileBtn({ onClick, children }) {
  return (
    <button onClick={onClick} className="w-full text-left text-[15px] text-gray-700 py-2 hover:text-[#003087] transition-colors">
      {children}
    </button>
  )
}
