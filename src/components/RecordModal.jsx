import React, { useState, useRef, useEffect } from 'react'
import { X, Mic, Square, Loader2, CheckCircle2, AlertCircle, Clock } from 'lucide-react'

const API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY || ''

function fmt(s) {
  return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`
}

async function analyzeRecording(title, transcript) {
  if (!API_KEY || !transcript.trim()) return null
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514', max_tokens: 1500,
        messages: [{ role: 'user', content:
          `Analyze this recorded meeting for Abonmarche (civil engineering, South Bend IN).
Return ONLY raw JSON: {"summary":"...","key_decisions":["..."],"action_items":[{"text":"...","owner":"...","done":false}],"blockers":["..."],"attendees":["..."],"duration_minutes":${Math.ceil(transcript.length/800)},"sentiment":"positive|neutral|negative","tags":["..."],"type":"Recorded"}
TITLE: ${title}
TRANSCRIPT: ${transcript.substring(0,8000)}`
        }],
      }),
    })
    const d = await res.json()
    if (d.error) throw new Error(d.error.message)
    return JSON.parse(d.content[0].text.replace(/```json|```/g,'').trim())
  } catch(e) { console.error(e); return null }
}

export default function RecordModal({ onClose, onAdd }) {
  const [title, setTitle] = useState('')
  const [state, setState] = useState('idle') // idle | recording | processing | done | error
  const [elapsed, setElapsed] = useState(0)
  const [transcript, setTranscript] = useState('')
  const [liveText, setLiveText] = useState('')
  const [step, setStep] = useState('')
  const [errMsg, setErrMsg] = useState('')

  const mediaRef = useRef(null)
  const chunksRef = useRef([])
  const timerRef = useRef(null)
  const recogRef = useRef(null)

  // Live speech recognition for real-time transcript
  const startSpeechRecognition = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) return
    const r = new SR()
    r.continuous = true
    r.interimResults = true
    r.lang = 'en-US'
    let final = ''
    r.onresult = e => {
      let interim = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript + ' '
        else interim += e.results[i][0].transcript
      }
      setLiveText(final + interim)
      setTranscript(final)
    }
    r.onerror = () => {}
    r.start()
    recogRef.current = r
  }

  const startRecording = async () => {
    if (!title.trim()) return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream)
      chunksRef.current = []
      mr.ondataavailable = e => chunksRef.current.push(e.data)
      mr.start(1000)
      mediaRef.current = mr
      setState('recording')
      setElapsed(0)
      timerRef.current = setInterval(() => setElapsed(p => p + 1), 1000)
      startSpeechRecognition()
    } catch(e) {
      setErrMsg('Microphone access denied. Allow mic in browser settings.')
      setState('error')
    }
  }

  const stopRecording = () => {
    clearInterval(timerRef.current)
    if (recogRef.current) { recogRef.current.stop(); recogRef.current = null }
    if (mediaRef.current) {
      mediaRef.current.stream.getTracks().forEach(t => t.stop())
      mediaRef.current.stop()
      mediaRef.current = null
    }
    setState('processing')
    processRecording()
  }

  const processRecording = async () => {
    try {
      setStep('Analyzing with MHAI…')
      const finalTranscript = transcript || liveText || `[Recording: ${title} — ${fmt(elapsed)}]`
      const intel = await analyzeRecording(title, finalTranscript)
      setStep('Saving meeting…')
      onAdd({
        id: `mtg-${Date.now()}`,
        title: title.trim(),
        date: new Date().toISOString(),
        duration_minutes: intel?.duration_minutes || Math.ceil(elapsed / 60),
        attendees: intel?.attendees?.length ? intel.attendees : ['Jonah Knipper'],
        type: 'Recorded',
        status: 'analyzed',
        summary: intel?.summary || `Recorded meeting: ${title.trim()}`,
        key_decisions: intel?.key_decisions || [],
        action_items: intel?.action_items || [],
        blockers: intel?.blockers || [],
        sentiment: intel?.sentiment || 'neutral',
        tags: intel?.tags || ['recorded'],
        transcript_preview: finalTranscript.substring(0, 600),
      })
      setState('done')
      setTimeout(onClose, 2000)
    } catch(e) {
      setErrMsg(e.message || 'Processing failed.')
      setState('error')
    }
  }

  useEffect(() => () => {
    clearInterval(timerRef.current)
    if (recogRef.current) recogRef.current.stop()
    if (mediaRef.current) { mediaRef.current.stream?.getTracks().forEach(t=>t.stop()); mediaRef.current.stop() }
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={state==='idle'||state==='error' ? onClose : undefined}/>
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          <div>
            <h2 className="text-[20px] font-semibold text-gray-900">Record Meeting</h2>
            <p className="text-[13px] text-gray-400 mt-0.5">Live mic · Auto-transcribe · AI analysis</p>
          </div>
          {(state==='idle'||state==='error') && <button onClick={onClose}><X size={20} className="text-gray-400"/></button>}
        </div>

        <div className="px-6 pb-8 space-y-5">
          {/* Title input */}
          {(state==='idle'||state==='error') && (
            <div>
              <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">Meeting Title</label>
              <input value={title} onChange={e=>setTitle(e.target.value)}
                placeholder="e.g. Weekly Scrum — March 26"
                className="w-full border border-black/10 rounded-xl px-3.5 py-2.5 text-[14px] outline-none focus:border-[#003087]/40 transition-all"/>
            </div>
          )}

          {/* Recording state */}
          {state==='recording' && (
            <div className="text-center space-y-4">
              <div className="relative w-20 h-20 mx-auto">
                <div className="absolute inset-0 rounded-full bg-red-100 animate-ping opacity-60"/>
                <div className="relative w-20 h-20 rounded-full bg-red-500 flex items-center justify-center">
                  <Mic size={28} className="text-white"/>
                </div>
              </div>
              <div>
                <p className="text-[28px] font-mono font-semibold text-gray-900">{fmt(elapsed)}</p>
                <p className="text-[13px] text-red-500 font-medium">Recording {title}</p>
              </div>
              {liveText && (
                <div className="bg-gray-50 rounded-xl p-3 text-left max-h-32 overflow-y-auto">
                  <p className="text-[12px] text-gray-500 font-semibold uppercase tracking-wide mb-1">Live transcript</p>
                  <p className="text-[12px] text-gray-700 leading-relaxed">{liveText.slice(-400)}</p>
                </div>
              )}
            </div>
          )}

          {/* Processing */}
          {state==='processing' && (
            <div className="text-center py-4 space-y-3">
              <Loader2 size={36} className="text-[#003087] mx-auto animate-spin"/>
              <p className="text-[15px] font-medium text-gray-800">{step}</p>
              <p className="text-[12px] text-gray-400">Recorded {fmt(elapsed)}</p>
            </div>
          )}

          {/* Done */}
          {state==='done' && (
            <div className="text-center py-4 space-y-3">
              <CheckCircle2 size={44} className="text-emerald-500 mx-auto"/>
              <p className="text-[17px] font-semibold text-gray-900">Meeting saved!</p>
              <p className="text-[13px] text-gray-400">Full AI analysis in your dashboard.</p>
            </div>
          )}

          {/* Error */}
          {state==='error' && (
            <div className="flex items-start gap-2 text-red-500 text-[13px] bg-red-50 rounded-xl px-3.5 py-3">
              <AlertCircle size={16} className="mt-0.5 shrink-0"/>{errMsg}
            </div>
          )}

          {/* Action button */}
          {state==='idle' && (
            <button onClick={startRecording} disabled={!title.trim()}
              className="w-full py-3.5 bg-red-500 text-white text-[15px] font-semibold rounded-xl hover:bg-red-600 disabled:opacity-40 transition-all flex items-center justify-center gap-2">
              <Mic size={16}/>Start Recording
            </button>
          )}
          {state==='recording' && (
            <button onClick={stopRecording}
              className="w-full py-3.5 bg-gray-900 text-white text-[15px] font-semibold rounded-xl hover:bg-gray-800 transition-all flex items-center justify-center gap-2">
              <Square size={15} fill="white"/>Stop & Analyze
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
