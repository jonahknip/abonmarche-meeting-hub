import React, { useState } from 'react'
import { ArrowLeft, Clock, Users, Tag, CheckSquare, Square, AlertTriangle, Quote, MessageCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { format } from 'date-fns'

export default function MeetingDetail({ meeting: m, onBack, onChat }) {
  const [showTranscript, setShowTranscript] = useState(false)
  const [actions, setActions] = useState(m.action_items)

  const toggleAction = (idx) => {
    setActions(prev => prev.map((a, i) => i === idx ? { ...a, done: !a.done } : a))
  }

  return (
    <div className="pt-[52px] min-h-screen bg-[#fbfbfd]">
      <div className="max-w-4xl mx-auto px-5 py-8">

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-[12px] bg-[#003087]/8 text-[#003087] px-2.5 py-1 rounded-full font-medium">{m.type}</span>
            <span className="text-[12px] text-gray-400">{format(new Date(m.date), 'EEEE, MMMM d, yyyy')} · {m.duration_minutes} min</span>
            {m.sentiment === 'positive' && <span className="text-[12px] text-emerald-500 font-medium">● Positive sentiment</span>}
          </div>
          <h1 className="text-[36px] font-semibold tracking-[-0.03em] text-gray-900 mb-3">{m.title}</h1>
          <p className="text-[16px] text-gray-500 leading-relaxed max-w-3xl">{m.summary}</p>

          <button
            onClick={onChat}
            className="mt-4 flex items-center gap-2 px-4 py-2 bg-[#003087] text-white text-[13px] font-medium rounded-full hover:bg-[#002070] transition-colors"
          >
            <MessageCircle size={13} />
            Ask MHAI about this meeting
          </button>
        </div>

        {/* Quote callout */}
        {m.quote && (
          <div className="bg-[#003087]/5 border-l-4 border-[#003087] rounded-r-2xl p-5 mb-6">
            <Quote size={16} className="text-[#003087] mb-2" />
            <p className="text-[15px] text-gray-700 italic leading-relaxed">{m.quote}</p>
          </div>
        )}

        {/* Main grid */}
        <div className="grid md:grid-cols-2 gap-4 mb-4">

          {/* Key Decisions */}
          <Section icon={<CheckSquare size={16} className="text-[#003087]" />} title="Key Decisions">
            <div className="space-y-2.5">
              {m.key_decisions.map((d, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-[#003087]/10 text-[#003087] text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">{i+1}</span>
                  <span className="text-[14px] text-gray-700 leading-relaxed">{d}</span>
                </div>
              ))}
            </div>
          </Section>

          {/* Action Items */}
          <Section icon={<Square size={16} className="text-amber-500" />} title="Action Items">
            <div className="space-y-2.5">
              {actions.map((a, i) => (
                <button
                  key={i}
                  onClick={() => toggleAction(i)}
                  className="w-full flex items-start gap-2.5 text-left group"
                >
                  <span className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                    a.done ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300 group-hover:border-[#003087]'
                  }`}>
                    {a.done && <span className="text-white text-[9px]">✓</span>}
                  </span>
                  <div className="flex-1">
                    <span className={`text-[13px] leading-relaxed ${a.done ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                      {a.text}
                    </span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px] text-gray-400">{a.owner}</span>
                      {a.due && <span className="text-[11px] text-gray-400">· due {format(new Date(a.due), 'MMM d')}</span>}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </Section>
        </div>

        {/* Blockers */}
        {m.blockers && m.blockers.length > 0 && (
          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle size={15} className="text-amber-500" />
              <span className="text-[13px] font-semibold text-amber-700">Blockers</span>
            </div>
            {m.blockers.map((b, i) => (
              <div key={i} className="text-[14px] text-amber-800 flex items-start gap-2">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                {b}
              </div>
            ))}
          </div>
        )}

        {/* Attendees + Tags */}
        <div className="grid md:grid-cols-2 gap-4 mb-4">
          <Section icon={<Users size={16} className="text-[#003087]" />} title="Attendees">
            <div className="flex flex-wrap gap-2">
              {m.attendees.map((a, i) => (
                <span key={i} className="bg-gray-100 text-gray-700 text-[12px] px-2.5 py-1 rounded-full">{a}</span>
              ))}
            </div>
          </Section>
          <Section icon={<Tag size={16} className="text-[#003087]" />} title="Tags">
            <div className="flex flex-wrap gap-2">
              {m.tags.map((t, i) => (
                <span key={i} className="bg-[#003087]/8 text-[#003087] text-[12px] px-2.5 py-1 rounded-full font-medium">#{t}</span>
              ))}
            </div>
          </Section>
        </div>

        {/* Transcript preview */}
        {m.transcript_preview && (
          <div className="bg-white border border-black/6 rounded-2xl overflow-hidden">
            <button
              onClick={() => setShowTranscript(!showTranscript)}
              className="w-full flex items-center justify-between p-5 hover:bg-gray-50 transition-colors"
            >
              <span className="text-[14px] font-semibold text-gray-900">Transcript</span>
              {showTranscript ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
            </button>
            {showTranscript && (
              <div className="px-5 pb-5 border-t border-black/5">
                <p className="text-[13px] text-gray-600 leading-relaxed font-mono mt-4">{m.transcript_preview}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function Section({ icon, title, children }) {
  return (
    <div className="bg-white border border-black/6 rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        {icon}
        <span className="text-[13px] font-semibold text-gray-900">{title}</span>
      </div>
      {children}
    </div>
  )
}
