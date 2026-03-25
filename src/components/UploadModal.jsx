import React, { useState, useRef } from 'react'
import { X, Upload, FileText, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'

const API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY || ''

async function callClaude(prompt) {
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
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    }),
  })
  const data = await res.json()
  if (data.error) throw new Error(data.error.message)
  return data.content?.[0]?.text || ''
}

async function analyzeTranscript(title, content) {
  if (!API_KEY || !content.trim()) return null
  try {
    const raw = await callClaude(
      `You are MHAI for Abonmarche (civil engineering, South Bend IN). ` +
      `Analyze this meeting. Return ONLY raw JSON, no markdown, no backticks:\n` +
      `{"summary":"2-3 sentences","key_decisions":["dec1"],"action_items":[{"text":"do this","owner":"Name","done":false}],` +
      `"blockers":["blocker"],"attendees":["Jonah Knipper"],"duration_minutes":30,` +
      `"sentiment":"neutral","tags":["tag"],"type":"Uploaded"}\n` +
      `TITLE: ${title}\nTRANSCRIPT: ${content.substring(0, 8000)}`
    )
    return JSON.parse(raw.replace(/```json|```/g, '').trim())
  } catch (e) { console.error('Claude error:', e); return null }
}

function readFileText(file) {
  return new Promise((res, rej) => {
    const r = new FileReader()
    r.onload = e => res(e.target.result)
    r.onerror = rej
    r.readAsText(file)
  })
}

const TEXT_EXTS = new Set(['txt', 'vtt', 'srt', 'text', 'md'])
const isTextFile = f => f && TEXT_EXTS.has(f.name.split('.').pop().toLowerCase())

export default function UploadModal({ onClose, onAdd }) {
  const [drag, setDrag]     = useState(false)
  const [file, setFile]     = useState(null)
  const [text, setText]     = useState('')
  const [title, setTitle]   = useState('')
  const [tab, setTab]       = useState('text')
  const [busy, setBusy]     = useState(false)
  const [step, setStep]     = useState('')
  const [done, setDone]     = useState(false)
  const [error, setError]   = useState('')
  const fileRef = useRef()

  const pickFile = (f) => {
    setFile(f)
    setError('')
    setTitle(prev => prev.trim() ? prev : f.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '))
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDrag(false)
    const f = e.dataTransfer.files?.[0]
    if (f) pickFile(f)
  }

  // Evaluate readiness fresh every render — no stale closures
  const hasContent = tab === 'file' ? Boolean(file) : text.trim().length > 0
  const canSubmit  = hasContent && title.trim().length > 0 && !busy

  const submit = async () => {
    if (!canSubmit) return
    setBusy(true)
    setError('')
    try {
      let content = ''
      if (tab === 'text') {
        content = text.trim()
      } else if (file && isTextFile(file)) {
        setStep('Reading file…')
        content = await readFileText(file)
      } else if (file) {
        content = `[Audio/video: ${file.name} (${(file.size/1024/1024).toFixed(1)}MB) — transcript not available in browser]`
      }

      let intel = null
      if (content && API_KEY) {
        setStep('Analyzing with MHAI…')
        intel = await analyzeTranscript(title.trim(), content)
      }

      setStep('Saving…')
      onAdd({
        id: `mtg-${Date.now()}`,
        title: title.trim(),
        date: new Date().toISOString(),
        duration_minutes: intel?.duration_minutes ?? 30,
        attendees: intel?.attendees?.length ? intel.attendees : ['Jonah Knipper'],
        type: intel?.type ?? 'Uploaded',
        status: 'analyzed',
        summary: intel?.summary ?? `Uploaded: ${title.trim()}`,
        key_decisions: intel?.key_decisions ?? [],
        action_items: intel?.action_items ?? [],
        blockers: intel?.blockers ?? [],
        sentiment: intel?.sentiment ?? 'neutral',
        tags: intel?.tags ?? ['uploaded'],
        transcript_preview: content.substring(0, 600),
      })
      setDone(true)
      setTimeout(onClose, 1600)
    } catch (e) {
      console.error(e)
      setError(e.message ?? 'Something went wrong. Try again.')
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={!busy ? onClose : undefined} />
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          <div>
            <h2 className="text-[20px] font-semibold text-gray-900 tracking-tight">Upload Meeting</h2>
            <p className="text-[13px] text-gray-400 mt-0.5">Transcript · Notes · Audio · Video</p>
          </div>
          {!busy && <button onClick={onClose}><X size={20} className="text-gray-400 hover:text-gray-600" /></button>}
        </div>

        {done ? (
          <div className="px-6 pb-10 pt-4 text-center">
            <CheckCircle2 size={44} className="text-emerald-500 mx-auto mb-3" />
            <p className="text-[17px] font-semibold text-gray-900">Meeting added to MHAI!</p>
            <p className="text-[13px] text-gray-400 mt-1.5">Check the dashboard for the full analysis.</p>
          </div>
        ) : (
          <div className="px-6 pb-6 space-y-4">

            {/* Title */}
            <div>
              <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">
                Meeting Title
              </label>
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Weekly Scrum — March 26"
                className="w-full border border-black/10 rounded-xl px-3.5 py-2.5 text-[14px] outline-none focus:border-[#003087]/40 focus:ring-2 focus:ring-[#003087]/8 transition-all"
              />
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
              {[['text','Paste Text'],['file','File / Audio']].map(([v,l]) => (
                <button key={v} onClick={() => { setTab(v); setError('') }}
                  className={`flex-1 py-1.5 rounded-lg text-[13px] font-medium transition-all ${tab===v ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}>
                  {l}
                </button>
              ))}
            </div>

            {/* Paste text */}
            {tab === 'text' && (
              <textarea
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder="Paste transcript, meeting notes, or any text here…"
                rows={9}
                className="w-full border border-black/10 rounded-xl px-3.5 py-3 text-[13px] text-gray-700 font-mono outline-none focus:border-[#003087]/40 resize-none transition-all"
              />
            )}

            {/* File drop */}
            {tab === 'file' && (
              <div
                onDragOver={e => { e.preventDefault(); setDrag(true) }}
                onDragLeave={() => setDrag(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${drag ? 'border-[#003087] bg-[#003087]/4' : 'border-black/12 hover:border-[#003087]/40'}`}
              >
                <input ref={fileRef} type="file" accept=".txt,.vtt,.srt,.md,.mp3,.mp4,.wav,.m4a,.mov"
                  className="hidden" onChange={e => e.target.files?.[0] && pickFile(e.target.files[0])} />
                {file ? (
                  <div>
                    <FileText size={28} className="text-[#003087] mx-auto mb-2" />
                    <p className="text-[14px] font-semibold text-gray-900">{file.name}</p>
                    <p className="text-[12px] text-gray-400 mt-1">{(file.size/1024).toFixed(0)} KB · click to change</p>
                    {!isTextFile(file) && (
                      <p className="text-[11px] text-amber-500 mt-2">Audio/video saved — transcript requires Whisper pipeline</p>
                    )}
                  </div>
                ) : (
                  <div>
                    <Upload size={24} className="text-gray-300 mx-auto mb-3" />
                    <p className="text-[14px] text-gray-600 font-medium">Drop file or click to browse</p>
                    <p className="text-[12px] text-gray-400 mt-1">TXT · VTT · SRT · MP3 · MP4 · WAV · M4A</p>
                  </div>
                )}
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 text-red-500 text-[13px] bg-red-50 rounded-xl px-3.5 py-2.5">
                <AlertCircle size={14} />{error}
              </div>
            )}

            <button
              onClick={submit}
              disabled={!canSubmit}
              className="w-full py-3 bg-[#003087] text-white text-[15px] font-semibold rounded-xl hover:bg-[#002070] disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {busy
                ? <><Loader2 size={16} className="animate-spin" />{step || 'Processing…'}</>
                : <><Upload size={15} />Upload & Analyze</>
              }
            </button>

            {!API_KEY && (
              <p className="text-[11px] text-center text-amber-500">No API key — meeting will be saved without AI analysis</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
