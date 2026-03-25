import React, { useState, useRef, useEffect } from 'react'
import { X, Send, Loader2, Sparkles, User, CheckSquare, Square, AlertTriangle, Lightbulb, Users } from 'lucide-react'

const API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY || ''

// ── Rich response renderer ──────────────────────────────────────────────────
function RichMessage({ content }) {
  // Parse structured sections out of Claude's response
  const lines = content.split('\n')
  const elements = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i].trim()
    if (!line) { i++; continue }

    // Section headers like **Action Items** or ## Decisions
    if (/^(\*\*|##?\s).+(:\*\*|:)?$/.test(line) || /^\*\*[^*]+\*\*$/.test(line)) {
      const label = line.replace(/\*\*/g,'').replace(/^#+\s*/,'').replace(/:$/,'').trim()
      const icon = getIcon(label)
      elements.push(
        <div key={i} className="flex items-center gap-1.5 mt-3 mb-1 first:mt-0">
          {icon}
          <span className="text-[11px] font-bold uppercase tracking-widest text-gray-500">{label}</span>
        </div>
      )
      i++; continue
    }

    // Checkbox items: - [ ] or - [x] or • [ ]
    if (/^[-•]\s*\[([ xX])\]/.test(line)) {
      const done = /\[[xX]\]/.test(line)
      const txt  = line.replace(/^[-•]\s*\[[ xX]\]\s*/, '')
      const ownerMatch = txt.match(/\(([^)]+)\)$/)
      const taskText = ownerMatch ? txt.slice(0, -ownerMatch[0].length).trim() : txt
      elements.push(
        <div key={i} className={`flex items-start gap-2.5 py-1.5 px-3 rounded-xl mb-1 ${done ? 'bg-emerald-50' : 'bg-gray-50'}`}>
          {done
            ? <CheckSquare size={14} className="text-emerald-500 mt-0.5 shrink-0"/>
            : <Square size={14} className="text-gray-400 mt-0.5 shrink-0"/>}
          <div className="flex-1 min-w-0">
            <span className={`text-[13px] ${done ? 'line-through text-gray-400' : 'text-gray-800'}`}>{taskText}</span>
            {ownerMatch && <span className="ml-2 text-[11px] text-[#003087] font-medium bg-[#003087]/8 px-1.5 py-0.5 rounded-full">{ownerMatch[1]}</span>}
          </div>
        </div>
      )
      i++; continue
    }

    // Bullet items
    if (/^[-•]\s/.test(line)) {
      const txt = line.replace(/^[-•]\s+/, '')
      // Check for bold lead: **Label:** rest
      const boldMatch = txt.match(/^\*\*(.+?)\*\*:?\s*(.*)/)
      elements.push(
        <div key={i} className="flex items-start gap-2 py-1 text-[13px] text-gray-700">
          <span className="text-[#003087] mt-1.5 shrink-0 text-[8px]">●</span>
          <span>
            {boldMatch
              ? <><span className="font-semibold text-gray-900">{boldMatch[1]}: </span>{boldMatch[2]}</>
              : txt
            }
          </span>
        </div>
      )
      i++; continue
    }

    // Numbered list
    if (/^\d+\.\s/.test(line)) {
      const num = line.match(/^(\d+)\./)[1]
      const txt = line.replace(/^\d+\.\s+/, '')
      elements.push(
        <div key={i} className="flex items-start gap-2.5 py-1 text-[13px] text-gray-700">
          <span className="text-[11px] font-bold text-[#003087] bg-[#003087]/8 rounded-full w-5 h-5 flex items-center justify-center shrink-0 mt-0.5">{num}</span>
          <span>{txt}</span>
        </div>
      )
      i++; continue
    }

    // Plain text — but handle inline **bold**
    const rendered = line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    elements.push(
      <p key={i} className="text-[13px] text-gray-700 leading-relaxed"
        dangerouslySetInnerHTML={{ __html: rendered }} />
    )
    i++
  }

  return <div className="space-y-0.5">{elements}</div>
}

function getIcon(label) {
  const l = label.toLowerCase()
  if (l.includes('action') || l.includes('task'))  return <CheckSquare size={12} className="text-[#003087]"/>
  if (l.includes('block'))   return <AlertTriangle size={12} className="text-amber-500"/>
  if (l.includes('decision') || l.includes('key')) return <Lightbulb size={12} className="text-emerald-600"/>
  if (l.includes('attend') || l.includes('people')) return <Users size={12} className="text-purple-500"/>
  return <Sparkles size={12} className="text-[#003087]"/>
}

// ── Suggested prompts ───────────────────────────────────────────────────────
const SUGGESTED = [
  "What are all open action items?",
  "What decisions were made this week?",
  "Show me all blockers",
  "Who owns the most action items?",
  "Summarize my return to work meeting",
  "What happened with the Plan Review Agent?",
]

// ── Main component ──────────────────────────────────────────────────────────
export default function ChatPanel({ meetings, onClose, currentMeeting }) {
  const [messages, setMessages] = useState([{
    role: 'assistant',
    content: `I have full context on **${meetings.length} meetings** — decisions, action items, blockers, and everyone involved. What do you want to know?`,
  }])
  const [input, setInput]   = useState('')
  const [loading, setLoading] = useState(false)
  const endRef   = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])
  useEffect(() => { inputRef.current?.focus() }, [])

  // Build rich context string for Claude
  const buildContext = () => meetings.map(m => [
    `MEETING: ${m.title} | ${new Date(m.date).toLocaleDateString()} | ${m.type} | ${m.duration_minutes}min`,
    `Attendees: ${(m.attendees||[]).join(', ')}`,
    `Summary: ${m.summary}`,
    `Decisions: ${(m.key_decisions||[]).join(' | ')}`,
    `Actions: ${(m.action_items||[]).map(a=>`${a.text} (${a.owner}, ${a.done?'done':'open'})`).join(' | ')}`,
    `Blockers: ${(m.blockers||[]).join(' | ')}`,
    `Tags: ${(m.tags||[]).join(', ')}`,
  ].join('\n')).join('\n\n---\n\n')

  const systemPrompt = `You are MHAI — the meeting intelligence assistant for Jonah Knipper, AI Solutions Lead at Abonmarche (civil engineering, South Bend Indiana).

FORMAT YOUR RESPONSES like a smart assistant — structured, scannable, visual:
- Use **bold** for section headers like **Action Items** or **Key Decisions**
- Use bullet points (- item) for lists
- For action items use checkboxes: - [ ] Task text (Owner Name)  or  - [x] Done task (Owner)
- Use numbered lists for ranked or sequential info
- Keep responses concise — no filler, no "Great question!", no lengthy preambles
- When showing multiple items, always use lists not paragraphs
- For summaries, lead with the most important info first

MEETING DATA:
${buildContext()}
${currentMeeting ? `\nCURRENT VIEW: "${currentMeeting.title}" — prioritize this meeting unless asked otherwise.` : ''}`

  const send = async (msg) => {
    const userText = (msg || input).trim()
    if (!userText || loading) return
    setInput('')
    const userMsg = { role: 'user', content: userText }
    setMessages(prev => [...prev, userMsg])
    setLoading(true)

    try {
      if (API_KEY) {
        const history = messages
          .filter((m,i) => i > 0) // skip the initial greeting
          .map(m => ({ role: m.role, content: m.content }))
        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': API_KEY,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true',
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 1024,
            system: systemPrompt,
            messages: [...history, userMsg],
          }),
        })
        const data = await res.json()
        if (data.error) throw new Error(data.error.message)
        const reply = data.content?.[0]?.text || 'No response.'
        setMessages(prev => [...prev, { role: 'assistant', content: reply }])
      } else {
        // Offline fallback
        const reply = fallback(userText, meetings)
        await new Promise(r => setTimeout(r, 400))
        setMessages(prev => [...prev, { role: 'assistant', content: reply }])
      }
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', content: `⚠️ Error: ${e.message}` }])
    }
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center md:justify-end">
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-t-3xl md:rounded-2xl md:mr-5 md:mb-5 shadow-2xl w-full md:w-[440px] h-[88vh] md:h-[640px] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-black/6 shrink-0">
          <div className="w-8 h-8 rounded-xl bg-[#003087] flex items-center justify-center">
            <Sparkles size={14} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[14px] font-semibold text-gray-900">MHAI</div>
            <div className="text-[11px] text-gray-400">{meetings.length} meetings · Abonmarche Intelligence</div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-1">
            <X size={18} />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-2.5 ${msg.role==='user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 rounded-full bg-[#003087] flex items-center justify-center shrink-0 mt-0.5">
                  <Sparkles size={12} className="text-white" />
                </div>
              )}
              <div className={`max-w-[88%] rounded-2xl px-4 py-3 ${
                msg.role === 'user'
                  ? 'bg-[#003087] text-white text-[14px] rounded-br-sm'
                  : 'bg-gray-50 border border-black/6 rounded-bl-sm'
              }`}>
                {msg.role === 'user'
                  ? <span className="text-[14px]">{msg.content}</span>
                  : <RichMessage content={msg.content} />
                }
              </div>
              {msg.role === 'user' && (
                <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center shrink-0 mt-0.5">
                  <User size={12} className="text-gray-600" />
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div className="flex gap-2.5">
              <div className="w-7 h-7 rounded-full bg-[#003087] flex items-center justify-center shrink-0">
                <Sparkles size={12} className="text-white" />
              </div>
              <div className="bg-gray-50 border border-black/6 rounded-2xl rounded-bl-sm px-4 py-3">
                <div className="flex gap-1 items-center">
                  {[0,150,300].map(d => (
                    <div key={d} className="w-1.5 h-1.5 rounded-full bg-[#003087]/40"
                      style={{animation:`pulse 1s ease-in-out ${d}ms infinite`}} />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        {/* Suggested chips — only on first message */}
        {messages.length === 1 && !loading && (
          <div className="px-4 pb-2 shrink-0">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Suggested</p>
            <div className="flex flex-wrap gap-1.5">
              {SUGGESTED.map(s => (
                <button key={s} onClick={() => send(s)}
                  className="text-[12px] bg-[#003087]/6 text-[#003087] px-2.5 py-1 rounded-full hover:bg-[#003087]/12 transition-colors font-medium">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="px-4 pb-4 pt-2 border-t border-black/6 shrink-0">
          <div className="flex items-center gap-2 bg-gray-100 rounded-2xl px-4 py-2.5">
            <input ref={inputRef} value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key==='Enter' && !e.shiftKey && send()}
              placeholder="Ask anything about your meetings…"
              className="flex-1 bg-transparent text-[14px] text-gray-800 placeholder-gray-400 outline-none" />
            <button onClick={() => send()} disabled={!input.trim() || loading}
              className="w-7 h-7 rounded-full bg-[#003087] flex items-center justify-center disabled:opacity-30 hover:bg-[#002070] transition-colors">
              <Send size={12} className="text-white ml-0.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Offline fallback ────────────────────────────────────────────────────────
function fallback(q, meetings) {
  const lq = q.toLowerCase()
  if (lq.includes('action') || lq.includes('task')) {
    const open = meetings.flatMap(m =>
      (m.action_items||[]).filter(a=>!a.done).map(a=>`- [ ] ${a.text} (${a.owner}) — _${m.title}_`)
    )
    return open.length
      ? `**Open Action Items** (${open.length})\n\n${open.join('\n')}`
      : 'All action items are marked complete.'
  }
  if (lq.includes('block')) {
    const b = meetings.flatMap(m=>(m.blockers||[]).map(x=>`- ${x} — _${m.title}_`))
    return b.length ? `**Blockers**\n\n${b.join('\n')}` : 'No blockers recorded.'
  }
  if (lq.includes('decision')) {
    const d = meetings.flatMap(m=>(m.key_decisions||[]).map(x=>`- ${x} — _${m.title}_`))
    return d.length ? `**Key Decisions**\n\n${d.join('\n')}` : 'No decisions found.'
  }
  return `No API key set. Add VITE_ANTHROPIC_API_KEY to use full AI chat.`
}
