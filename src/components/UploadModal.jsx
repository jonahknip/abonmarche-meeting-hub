import React, { useState, useRef, useCallback } from 'react'
import { X, Upload, FileText, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'

const ANTHROPIC_API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY || ''

async function analyzeTranscriptWithClaude(title, content) {
  if (!ANTHROPIC_API_KEY) return null
  const prompt = `You are MHAI — Meeting Hub A.I. for Abonmarche, a civil engineering firm in South Bend, Indiana.
Analyze this meeting transcript and return ONLY a raw JSON object with this structure (no markdown, no backticks):
{
  "summary": "2-3 sentence summary",
  "key_decisions": ["decision 1", "decision 2"],
  "action_items": [{"text": "action description", "owner": "person name or Unknown", "done": false}],
  "blockers": ["blocker 1"],
  "sentiment": "positive|neutral|negative",
  "attendees": ["Name 1", "Name 2"],
  "duration_minutes": 30,
  "tags": ["tag1", "tag2"],
  "type": "Scrum|Planning|Review|1-on-1|All Hands|Uploaded"
}

MEETING TITLE: ${title}
TRANSCRIPT:
${content.substring(0, 8000)}`

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      }),
    })
    const data = await res.json()
    const text = data.content?.[0]?.text || ''
    return JSON.parse(text.replace(/```json|```/g, '').trim())
  } catch { return null }
}

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = e => resolve(e.target.result)
    reader.onerror = reject
    reader.readAsText(file)
  })
}

function isTextBased(f) {
  if (!f) return false
  return ['txt', 'vtt', 'srt'].includes(f.name.split('.').pop().toLowerCase())
}

export default function UploadModal({ onClose, onAdd }) {
  const [dragOver, setDragOver] = useState(false)
  const [file, setFile] = useState(null)
  const [text, setText] = useState('')
  const [title, setTitle] = useState('')
  const [tab, setTab] = useState('file')
  const [processing, setProcessing] = useState(false)
  const [processingStep, setProcessingStep] = useState('')
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef()

  const handleFile = useCallback((f) => {
    setFile(f)
    setError('')
    if (!title) setTitle(f.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '))
  }, [title])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }, [handleFile])

  const process = async () => {
    if ((!file && !text.trim()) || !title.trim()) return
    setProcessing(true)
    setError('')

    try {
      let content = text.trim()

      if (file && isTextBased(file)) {
        setProcessingStep('Reading file…')
        content = await readFileAsText(file)
      } else if (file) {
        content = `[Media file: ${file.name} · ${(file.size/1024/1024).toFixed(1)}MB]\nDrop this file in ~/Documents/MHAI-Inbox/ for full Whisper transcription.`
      }

      let analysis = null
      if (content && ANTHROPIC_API_KEY) {
        setProcessingStep('Analyzing with Claude…')
        analysis = await analyzeTranscriptWithClaude(title, content)
      }

      setProcessingStep('Saving to MHAI…')
      const newMeeting = {
        id: `mtg-${Date.now()}`,
        title: title.trim(),
        date: new Date().toISOString(),
        duration_minutes: analysis?.duration_minutes || 30,
        attendees: analysis?.attendees?.length ? analysis.attendees : ['Jonah Knipper'],
        type: analysis?.type || 'Uploaded',
        status: 'analyzed',
        summary: analysis?.summary || `Uploaded: ${title.trim()}. Indexed by MHAI.`,
        key_decisions: analysis?.key_decisions?.length ? analysis.key_decisions : ['Meeting uploaded and indexed'],
        action_items: analysis?.action_items || [],
        blockers: analysis?.blockers || [],
        sentiment: analysis?.sentiment || 'neutral',
        tags: analysis?.tags?.length ? analysis.tags : ['uploaded'],
        transcript_preview: content.substring(0, 600),
      }

      onAdd(newMeeting)
      setDone(true)
      setTimeout(onClose, 1800)
    } catch (e) {
      console.error(e)
      setError('Something went wrong. Check the console and try again.')
      setProcessing(false)
    }
  }

  const canSubmit = (file || text.trim()) && title.trim() && !processing

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={!processing ? onClose : undefined} />
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          <div>
            <h2 className="text-[20px] font-semibold text-gray-900 tracking-tight">Upload Meeting</h2>
            <p className="text-[13px] text-gray-400 mt-0.5">Audio · Video · Transcript · Paste text</p>
          </div>
          {!processing && (
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
              <X size={20} />
            </button>
          )}
        </div>

        {done ? (
          <div className="px-6 pb-10 pt-4 text-center">
            <CheckCircle2 size={44} className="text-emerald-500 mx-auto mb-3" />
            <p className="text-[17px] font-semibold text-gray-900">Meeting added!</p>
            <p className="text-[13px] text-gray-400 mt-1.5">MHAI analyzed it. Check the dashboard.</p>
          </div>
        ) : (
          <div className="px-6 pb-6 space-y-4">
            <div>
              <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">Meeting Title</label>
              <input value={title} onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Weekly Scrum — March 31"
                className="w-full border border-black/10 rounded-xl px-3.5 py-2.5 text-[14px] text-gray-800 outline-none focus:border-[#003087]/40 focus:ring-2 focus:ring-[#003087]/8 transition-all" />
            </div>

            <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
              {[['file', 'File Upload'], ['text', 'Paste Text']].map(([v, l]) => (
                <button key={v} onClick={() => setTab(v)}
                  className={`flex-1 py-1.5 rounded-lg text-[13px] font-medium transition-all ${tab === v ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}>
                  {l}
                </button>
              ))}
            </div>

            {tab === 'file' ? (
              <div onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)} onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${dragOver ? 'border-[#003087] bg-[#003087]/4' : 'border-black/12 hover:border-[#003087]/40'}`}>
                <input ref={fileRef} type="file" accept=".txt,.vtt,.srt,.mp3,.mp4,.wav,.m4a,.mov"
                  className="hidden" onChange={e => e.target.files[0] && handleFile(e.target.files[0])} />
                {file ? (
                  <div>
                    <FileText size={28} className="text-[#003087] mx-auto mb-2" />
                    <p className="text-[14px] font-semibold text-gray-900">{file.name}</p>
                    <p className="text-[12px] text-gray-400 mt-1">{(file.size/1024).toFixed(0)} KB · Click to change</p>
                    {!isTextBased(file) && (
                      <p className="text-[11px] text-amber-500 mt-2">Audio/video: drop in MHAI-Inbox for full transcription</p>
                    )}
                  </div>
                ) : (
                  <div>
                    <Upload size={24} className="text-gray-300 mx-auto mb-3" />
                    <p className="text-[14px] text-gray-600 font-medium">Drop file here or click to browse</p>
                    <p className="text-[12px] text-gray-400 mt-1">TXT · VTT · SRT · MP3 · MP4 · WAV</p>
                  </div>
                )}
              </div>
            ) : (
              <textarea value={text} onChange={e => setText(e.target.value)}
                placeholder="Paste transcript or meeting notes here…" rows={8}
                className="w-full border border-black/10 rounded-xl px-3.5 py-3 text-[13px] text-gray-700 font-mono outline-none focus:border-[#003087]/40 focus:ring-2 focus:ring-[#003087]/8 resize-none transition-all" />
            )}

            {error && (
              <div className="flex items-center gap-2 text-red-500 text-[13px] bg-red-50 rounded-xl px-3.5 py-2.5">
                <AlertCircle size={14} /> {error}
              </div>
            )}

            <button onClick={process} disabled={!canSubmit}
              className="w-full py-3 bg-[#003087] text-white text-[15px] font-medium rounded-xl hover:bg-[#002070] disabled:opacity-40 transition-all flex items-center justify-center gap-2">
              {processing ? (
                <><Loader2 size={16} className="animate-spin" /> {processingStep || 'Processing…'}</>
              ) : (
                <><Upload size={15} /> Upload & Analyze</>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
