import React, { useState, useRef, useEffect } from 'react'
import { X, Send, Loader2, Bot, User, Sparkles } from 'lucide-react'

const SUGGESTED = [
  "What are all open action items?",
  "What decisions did Jeff make recently?",
  "What are the blockers on AI rollout?",
  "Summarize my return to work meeting",
  "Who is on the AI Task Force?",
  "What happened with Plan Review Agent testing?",
]

const ANTHROPIC_API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY || ''

export default function ChatPanel({ meetings, onClose, currentMeeting }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `Hi, I'm MHAI — your Abonmarche meeting intelligence. I have full context on ${meetings.length} meetings, all decisions, action items, and participants. Ask me anything.`,
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const endRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])
  useEffect(() => { inputRef.current?.focus() }, [])

  const meetingContext = meetings.map(m => `
MEETING: ${m.title}
Date: ${new Date(m.date).toLocaleDateString()}
Type: ${m.type} | Duration: ${m.duration_minutes} min
Attendees: ${m.attendees.join(', ')}
Summary: ${m.summary}
Key Decisions: ${m.key_decisions.join(' | ')}
Action Items: ${m.action_items.map(a => `${a.text} (owner: ${a.owner}, done: ${a.done})`).join(' | ')}
Blockers: ${m.blockers.join(' | ')}
Tags: ${m.tags.join(', ')}
${m.quote ? `Quote: ${m.quote}` : ''}
  `.trim()).join('\n\n---\n\n')

  const systemPrompt = `You are MHAI — Meeting Hub A.I., Abonmarche's meeting intelligence assistant. You have access to all archived meetings for Abonmarche, a civil engineering firm in South Bend, Indiana. The primary user is Jonah Knipper, AI Solutions Lead.

Your job: answer questions about meetings, decisions, action items, blockers, and people — using only the meeting data provided. Be concise, direct, and smart. Format using short paragraphs or brief bullet lists. No fluff.

MEETING DATA:
${meetingContext}

${currentMeeting ? `CURRENT MEETING CONTEXT: The user is viewing "${currentMeeting.title}". Prioritize this meeting in responses unless asked otherwise.` : ''}`

  const send = async () => {
    if (!input.trim() || loading) return
    const userMsg = { role: 'user', content: input.trim() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      if (ANTHROPIC_API_KEY) {
        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
          body: JSON.stringify({
            model: 'claude-opus-4-6',
            max_tokens: 1024,
            system: systemPrompt,
            messages: [...messages.filter(m => m.role !== 'assistant' || messages.indexOf(m) > 0), userMsg]
              .map(m => ({ role: m.role, content: m.content })),
          })
        })
        const data = await res.json()
        const reply = data.content?.[0]?.text || 'Sorry, something went wrong.'
        setMessages(prev => [...prev, { role: 'assistant', content: reply }])
      } else {
        // Smart fallback — parse query against meeting data
        const reply = smartFallback(userMsg.content, meetings)
        await new Promise(r => setTimeout(r, 600))
        setMessages(prev => [...prev, { role: 'assistant', content: reply }])
      }
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Connection error. Please check your API key and try again.' }])
    }
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center md:justify-end">
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-t-3xl md:rounded-2xl md:mr-5 md:mb-5 shadow-2xl w-full md:w-[420px] h-[85vh] md:h-[600px] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-black/6">
          <div className="w-8 h-8 rounded-xl bg-[#003087] flex items-center justify-center">
            <Sparkles size={14} className="text-white" />
          </div>
          <div>
            <div className="text-[14px] font-semibold text-gray-900">MHAI</div>
            <div className="text-[11px] text-gray-400">{meetings.length} meetings · Abonmarche Intelligence</div>
          </div>
          <button onClick={onClose} className="ml-auto text-gray-400 hover:text-gray-600 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-4 space-y-3">
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && (
                <div className="w-6 h-6 rounded-full bg-[#003087] flex items-center justify-center shrink-0 mt-0.5">
                  <Bot size={12} className="text-white" />
                </div>
              )}
              <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[14px] leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-[#003087] text-white rounded-br-sm'
                  : 'chat-bubble-ai text-gray-800 rounded-bl-sm'
              }`}>
                {msg.content}
              </div>
              {msg.role === 'user' && (
                <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center shrink-0 mt-0.5">
                  <User size={12} className="text-gray-600" />
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div className="flex gap-2.5">
              <div className="w-6 h-6 rounded-full bg-[#003087] flex items-center justify-center shrink-0">
                <Bot size={12} className="text-white" />
              </div>
              <div className="chat-bubble-ai rounded-2xl rounded-bl-sm px-4 py-3">
                <Loader2 size={14} className="text-[#003087] animate-spin" />
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        {/* Suggested (only when first message) */}
        {messages.length === 1 && (
          <div className="px-4 pb-2">
            <div className="text-[11px] text-gray-400 mb-2 font-medium uppercase tracking-wide">Suggested</div>
            <div className="flex flex-wrap gap-1.5">
              {SUGGESTED.map(s => (
                <button
                  key={s}
                  onClick={() => { setInput(s); inputRef.current?.focus() }}
                  className="text-[12px] bg-[#003087]/6 text-[#003087] px-2.5 py-1 rounded-full hover:bg-[#003087]/12 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="px-4 pb-4 pt-2 border-t border-black/6">
          <div className="flex items-center gap-2 bg-gray-100 rounded-2xl px-4 py-2.5">
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
              placeholder="Ask about any meeting…"
              className="flex-1 bg-transparent text-[14px] text-gray-800 placeholder-gray-400 outline-none"
            />
            <button
              onClick={send}
              disabled={!input.trim() || loading}
              className="w-7 h-7 rounded-full bg-[#003087] flex items-center justify-center disabled:opacity-30 hover:bg-[#002070] transition-colors"
            >
              <Send size={12} className="text-white ml-0.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function smartFallback(query, meetings) {
  const q = query.toLowerCase()
  
  if (q.includes('open') && (q.includes('action') || q.includes('task'))) {
    const open = meetings.flatMap(m => m.action_items.filter(a => !a.done).map(a => `• ${a.text} — ${a.owner} (from: ${m.title})`))
    return open.length ? `**${open.length} open action items:**\n\n${open.join('\n')}` : 'All action items are marked complete.'
  }
  if (q.includes('jeff') || q.includes('decision')) {
    const jeffMeetings = meetings.filter(m => m.attendees.some(a => a.toLowerCase().includes('jeff')))
    const decisions = jeffMeetings.flatMap(m => m.key_decisions.map(d => `• ${d} (${m.title})`))
    return `Jeff was in ${jeffMeetings.length} meetings. Key decisions:\n\n${decisions.slice(0, 6).join('\n')}`
  }
  if (q.includes('action') || q.includes('task')) {
    const items = meetings.flatMap(m => m.action_items.map(a => `• [${a.done ? '✓' : ' '}] ${a.text} — ${a.owner}`))
    return `**All action items:**\n\n${items.join('\n')}`
  }
  if (q.includes('blocker')) {
    const blockers = meetings.flatMap(m => m.blockers.map(b => `• ${b} (from: ${m.title})`))
    return blockers.length ? `**Current blockers:**\n\n${blockers.join('\n')}` : 'No blockers recorded.'
  }
  if (q.includes('ai task force') || q.includes('garrick')) {
    const m = meetings.find(m => m.tags.includes('ai-task-force'))
    return m ? `The AI Task Force was established in "${m.title}". Jonah Knipper and Garrick were formally assigned. Key context: ${m.key_decisions.slice(0,3).join('; ')}.` : 'No AI Task Force meeting found.'
  }
  
  // Generic search
  const results = meetings.filter(m =>
    m.title.toLowerCase().includes(q) ||
    m.summary.toLowerCase().includes(q) ||
    m.key_decisions.some(d => d.toLowerCase().includes(q)) ||
    m.action_items.some(a => a.text.toLowerCase().includes(q))
  )
  if (results.length) {
    return `Found ${results.length} relevant meeting(s):\n\n${results.map(m => `**${m.title}** (${new Date(m.date).toLocaleDateString()})\n${m.summary.substring(0,150)}…`).join('\n\n')}`
  }
  return `I didn't find a direct match for "${query}" in the ${meetings.length} archived meetings. Try asking about action items, decisions, attendees, or specific topics like "AI Task Force", "Plan Review Agent", or "Benton Harbor".`
}
