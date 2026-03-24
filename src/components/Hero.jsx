import React, { useEffect, useRef } from 'react'
import { ArrowRight, Mic, FileText, Video, Search, Brain, Zap } from 'lucide-react'

export default function Hero({ meetings, onEnter, onUpload }) {
  const statsRef = useRef(null)

  const totalDecisions = meetings.reduce((s, m) => s + m.key_decisions.length, 0)
  const totalActions   = meetings.reduce((s, m) => s + m.action_items.length, 0)
  const totalHours     = Math.round(meetings.reduce((s, m) => s + m.duration_minutes, 0) / 60)

  return (
    <div className="hero-bg min-h-screen pt-[52px]">

      {/* Hero section */}
      <div className="max-w-5xl mx-auto px-5 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 bg-[#003087]/8 text-[#003087] text-[12px] font-medium px-3 py-1.5 rounded-full mb-6 animate-fade-in">
          <span className="w-1.5 h-1.5 rounded-full bg-[#003087] animate-pulse" />
          Abonmarche Intelligence Platform
        </div>

        <h1 className="text-[64px] leading-[1.05] font-semibold tracking-[-0.04em] text-gray-900 mb-6 animate-fade-up">
          Every meeting.<br />
          <span className="text-gradient">Every decision.</span><br />
          Always findable.
        </h1>

        <p className="text-[19px] text-gray-500 leading-relaxed max-w-2xl mx-auto mb-10 animate-fade-up animate-delay-100 font-normal">
          Meeting Hub A.I. captures, analyzes, and makes every Abonmarche meeting searchable — with a conversational AI that knows everything discussed.
        </p>

        <div className="flex items-center justify-center gap-3 animate-fade-up animate-delay-200">
          <button
            onClick={onEnter}
            className="flex items-center gap-2 px-6 py-3 bg-[#003087] text-white text-[15px] font-medium rounded-full hover:bg-[#002070] transition-all hover:shadow-lg hover:shadow-[#003087]/20 active:scale-[0.98]"
          >
            Open Meetings
            <ArrowRight size={16} />
          </button>
          <button
            onClick={onUpload}
            className="flex items-center gap-2 px-6 py-3 bg-white border border-black/10 text-gray-700 text-[15px] font-medium rounded-full hover:bg-gray-50 transition-all hover:shadow-md active:scale-[0.98]"
          >
            Upload a Meeting
          </button>
        </div>

        {/* Stats bar */}
        <div ref={statsRef} className="mt-16 grid grid-cols-3 gap-6 max-w-lg mx-auto animate-fade-up animate-delay-300">
          <StatBubble value={meetings.length} label="Meetings" />
          <StatBubble value={totalDecisions} label="Decisions" />
          <StatBubble value={totalActions} label="Action Items" />
        </div>
      </div>

      {/* Feature grid — Apple-style */}
      <div className="max-w-5xl mx-auto px-5 pb-24">
        <h2 className="text-center text-[13px] font-semibold uppercase tracking-widest text-gray-400 mb-10">
          The full intelligence pipeline
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FeatureCard
            icon={<Mic size={20} className="text-[#003087]" />}
            title="Capture everything"
            body="Drop audio, video, or transcript files. Whisper transcribes automatically. Works with Teams, Zoom, and any recording."
            tag="Audio · Video · Transcript"
          />
          <FeatureCard
            icon={<Brain size={20} className="text-[#003087]" />}
            title="AI-powered analysis"
            body="Claude extracts decisions, action items, blockers, participants, and sentiment from every meeting — automatically."
            tag="Claude · GPT-4o · Local"
            featured
          />
          <FeatureCard
            icon={<Search size={20} className="text-[#003087]" />}
            title="Ask anything"
            body="Type any question in plain English. 'What did Jeff say about my role?' or 'Show all open action items from Q1.'"
            tag="Natural Language · Instant"
          />
          <FeatureCard
            icon={<Zap size={20} className="text-[#003087]" />}
            title="Background capture"
            body="Runs silently while Teams is open. Detects when calls start, records, transcribes, and stores with zero manual steps."
            tag="Auto · Passive · Always on"
          />
          <FeatureCard
            icon={<FileText size={20} className="text-[#003087]" />}
            title="Complete history"
            body="Every meeting stored with full transcript, analysis, and participants. Never lose a decision or miss a follow-up again."
            tag="Persistent · Searchable"
          />
          <FeatureCard
            icon={<Video size={20} className="text-[#003087]" />}
            title="Video support"
            body="Upload recordings directly. Visual-only meetings, walkthroughs, and demos are fully indexed alongside your calls."
            tag="MP4 · MOV · WebM"
          />
        </div>
      </div>

      {/* Meeting preview strip */}
      <div className="border-t border-black/6 py-16">
        <div className="max-w-5xl mx-auto px-5">
          <h2 className="text-center text-[28px] font-semibold tracking-tight text-gray-900 mb-2">
            Recent meetings
          </h2>
          <p className="text-center text-[15px] text-gray-400 mb-8">
            {meetings.length} meetings archived · {totalHours} hours of intelligence
          </p>
          <div className="space-y-2.5">
            {meetings.slice(0, 3).map((m, i) => (
              <PreviewRow key={m.id} meeting={m} delay={i * 80} onClick={onEnter} />
            ))}
          </div>
          <div className="text-center mt-8">
            <button
              onClick={onEnter}
              className="text-[#003087] text-[14px] font-medium hover:opacity-70 transition-opacity"
            >
              View all {meetings.length} meetings →
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatBubble({ value, label }) {
  return (
    <div className="text-center">
      <div className="text-[36px] font-semibold tracking-tight text-gray-900 leading-none">{value}</div>
      <div className="text-[13px] text-gray-400 mt-1">{label}</div>
    </div>
  )
}

function FeatureCard({ icon, title, body, tag, featured }) {
  return (
    <div className={`rounded-2xl p-6 ${featured ? 'bg-[#003087] text-white' : 'bg-white border border-black/6'}`}>
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-4 ${featured ? 'bg-white/15' : 'bg-[#003087]/8'}`}>
        {React.cloneElement(icon, { className: featured ? 'text-white' : 'text-[#003087]' })}
      </div>
      <h3 className={`text-[16px] font-semibold mb-1.5 tracking-tight ${featured ? 'text-white' : 'text-gray-900'}`}>{title}</h3>
      <p className={`text-[14px] leading-relaxed mb-3 ${featured ? 'text-white/75' : 'text-gray-500'}`}>{body}</p>
      <span className={`text-[11px] font-medium ${featured ? 'text-white/50' : 'text-gray-400'}`}>{tag}</span>
    </div>
  )
}

function PreviewRow({ meeting, delay, onClick }) {
  const sentimentColor = { positive: 'text-emerald-600', neutral: 'text-gray-400', negative: 'text-red-400' }
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-4 p-4 bg-white border border-black/6 rounded-xl hover:border-[#003087]/20 hover:shadow-sm transition-all text-left group"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="w-10 h-10 rounded-xl bg-[#003087]/8 flex items-center justify-center shrink-0">
        <span className="text-[11px] font-bold text-[#003087]">{meeting.type.substring(0,2).toUpperCase()}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[14px] font-medium text-gray-900 truncate group-hover:text-[#003087] transition-colors">{meeting.title}</div>
        <div className="text-[12px] text-gray-400 mt-0.5">{new Date(meeting.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} · {meeting.duration_minutes} min</div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-[11px] text-gray-400">{meeting.key_decisions.length} decisions</span>
        <ArrowRight size={13} className="text-gray-300 group-hover:text-[#003087] transition-colors" />
      </div>
    </button>
  )
}
