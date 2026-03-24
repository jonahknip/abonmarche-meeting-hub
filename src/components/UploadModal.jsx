import React, { useState, useRef, useCallback } from 'react'
import { X, Upload, FileText, Mic, Video, Loader2, CheckCircle2 } from 'lucide-react'
import { format } from 'date-fns'

export default function UploadModal({ onClose, onAdd }) {
  const [dragOver, setDragOver] = useState(false)
  const [file, setFile] = useState(null)
  const [text, setText] = useState('')
  const [title, setTitle] = useState('')
  const [tab, setTab] = useState('file')
  const [processing, setProcessing] = useState(false)
  const [done, setDone] = useState(false)
  const fileRef = useRef()

  const handleFile = (f) => {
    setFile(f)
    if (!title) setTitle(f.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '))
  }

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }, [])

  const process = async () => {
    if ((!file && !text.trim()) || !title.trim()) return
    setProcessing(true)
    await new Promise(r => setTimeout(r, 1800))

    const content = text || (file ? `[File: ${file.name} — ${(file.size/1024).toFixed(0)}KB]` : '')

    const newMeeting = {
      id: `mtg-${Date.now()}`,
      title: title.trim(),
      date: new Date().toISOString(),
      duration_minutes: Math.floor(Math.random() * 40) + 20,
      attendees: ['Jonah Knipper'],
      type: 'Uploaded',
      status: 'analyzed',
      summary: `Uploaded meeting: ${title}. Content processed and indexed by MHAI.`,
      key_decisions: ['Meeting content uploaded and indexed'],
      action_items: [],
      blockers: [],
      sentiment: 'neutral',
      tags: ['uploaded'],
      transcript_preview: content.substring(0, 500),
    }

    onAdd(newMeeting)
    setProcessing(false)
    setDone(true)
    setTimeout(onClose, 1500)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          <div>
            <h2 className="text-[20px] font-semibold text-gray-900 tracking-tight">Upload Meeting</h2>
            <p className="text-[13px] text-gray-400 mt-0.5">Audio, video, or transcript</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        {done ? (
          <div className="px-6 pb-8 text-center">
            <CheckCircle2 size={40} className="text-emerald-500 mx-auto mb-3" />
            <p className="text-[16px] font-medium text-gray-900">Meeting uploaded!</p>
            <p className="text-[13px] text-gray-400 mt-1">MHAI is analyzing your meeting…</p>
          </div>
        ) : (
          <div className="px-6 pb-6 space-y-4">

            {/* Title */}
            <div>
              <label className="text-[12px] font-medium text-gray-500 uppercase tracking-wide block mb-1.5">Meeting Title</label>
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Weekly Scrum — March 31"
                className="w-full border border-black/10 rounded-xl px-3.5 py-2.5 text-[14px] text-gray-800 outline-none focus:border-[#003087]/40 focus:ring-2 focus:ring-[#003087]/8 transition-all"
              />
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
              {[['file', 'File Upload'], ['text', 'Paste Text']].map(([v, l]) => (
                <button
                  key={v}
                  onClick={() => setTab(v)}
                  className={`flex-1 py-1.5 rounded-lg text-[13px] font-medium transition-all ${
                    tab === v ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>

            {tab === 'file' ? (
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                  dragOver ? 'border-[#003087] bg-[#003087]/4' : 'border-black/12 hover:border-[#003087]/40'
                }`}
              >
                <input ref={fileRef} type="file" accept=".txt,.vtt,.srt,.mp3,.mp4,.wav,.m4a,.mov,.docx" className="hidden" onChange={e => e.target.files[0] && handleFile(e.target.files[0])} />
                {file ? (
                  <div>
                    <FileText size={28} className="text-[#003087] mx-auto mb-2" />
                    <p className="text-[14px] font-medium text-gray-900">{file.name}</p>
                    <p className="text-[12px] text-gray-400 mt-1">{(file.size / 1024).toFixed(0)}KB · Click to change</p>
                  </div>
                ) : (
                  <div>
                    <Upload size={24} className="text-gray-300 mx-auto mb-3" />
                    <p className="text-[14px] text-gray-600 font-medium">Drop file here or click to browse</p>
                    <p className="text-[12px] text-gray-400 mt-1">TXT · VTT · SRT · MP3 · MP4 · WAV · DOCX</p>
                  </div>
                )}
              </div>
            ) : (
              <textarea
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder="Paste transcript text here…"
                rows={8}
                className="w-full border border-black/10 rounded-xl px-3.5 py-3 text-[13px] text-gray-700 font-mono outline-none focus:border-[#003087]/40 focus:ring-2 focus:ring-[#003087]/8 resize-none transition-all"
              />
            )}

            <button
              onClick={process}
              disabled={(!file && !text.trim()) || !title.trim() || processing}
              className="w-full py-3 bg-[#003087] text-white text-[15px] font-medium rounded-xl hover:bg-[#002070] disabled:opacity-40 transition-all flex items-center justify-center gap-2"
            >
              {processing ? (
                <><Loader2 size={16} className="animate-spin" /> Analyzing with MHAI…</>
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
