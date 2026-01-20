import { useCallback, useMemo, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import * as Tabs from '@radix-ui/react-tabs'
import { useDropzone } from 'react-dropzone'
import { CalendarClock, CheckCircle2, Loader2, Upload } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { analyzeMeeting } from '../lib/claude'
import type { AnalysisMetadata, MeetingType } from '../lib/types'
import { useAppStore } from '../state/useAppStore'
import { useToast } from './Toast'

const ACCEPT = {
  'text/plain': ['.txt'],
  'text/vtt': ['.vtt'],
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
}

const MAX_BYTES = 500 * 1024

const steps: Array<{ key: 'uploading' | 'analyzing' | 'extracting' | 'done'; label: string }> = [
  { key: 'uploading', label: 'Uploading' },
  { key: 'analyzing', label: 'Analyzing' },
  { key: 'extracting', label: 'Extracting' },
  { key: 'done', label: 'Done' },
]

interface UploadModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function UploadModal({ open, onOpenChange }: UploadModalProps) {
  const channels = useAppStore((s) => s.channels)
  const people = useAppStore((s) => s.people)
  const addMeeting = useAppStore((s) => s.addMeeting)
  const updateMeeting = useAppStore((s) => s.updateMeeting)
  const addActionItem = useAppStore((s) => s.addActionItem)
  const navigate = useNavigate()
  const { addToast } = useToast()

  const [activeTab, setActiveTab] = useState<'drop' | 'paste'>('drop')
  const [transcript, setTranscript] = useState('')
  const [fileName, setFileName] = useState('')
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [channelId, setChannelId] = useState(channels[0]?.id ?? 'general')
  const [type, setType] = useState<MeetingType>('internal')
  const [participants, setParticipants] = useState<string[]>([])
  const [preview, setPreview] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [progress, setProgress] = useState<'idle' | 'uploading' | 'analyzing' | 'extracting' | 'done'>('idle')

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setError(null)
    const file = acceptedFiles[0]
    if (!file) return

    if (file.size > MAX_BYTES) {
      setError('File exceeds 500KB limit')
      return
    }

    const ext = file.name.toLowerCase()
    if (ext.endsWith('.pdf') || ext.endsWith('.docx')) {
      setError('Docx/PDF not yet parsed. Please paste the transcript text.')
      return
    }

    const text = await file.text()
    setTranscript(text)
    setFileName(file.name)
    setPreview(text.slice(0, 500))
    if (!title) setTitle(file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '))
  }, [title])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ accept: ACCEPT, multiple: false, onDrop })

  const selectedParticipants = useMemo(
    () => new Set(participants),
    [participants],
  )

  const toggleParticipant = (id: string) => {
    setParticipants((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]))
  }

  const runAnalysis = async () => {
    setError(null)
    setSubmitting(true)
    setProgress('uploading')
    const metadata: AnalysisMetadata = { title: title || 'Untitled meeting', date, channelId, type, participants }

    const meetingId = addMeeting({
      ...metadata,
      participants,
      transcript,
      summary: '',
      keyDecisions: [],
      topics: [],
      sentiment: 'neutral',
      followUpDraft: '',
      insights: [],
      riskFlags: [],
      relatedMeetingIds: [],
    })

    try {
      const result = await analyzeMeeting(transcript, metadata, {
        onProgress: (step) => {
          if (step === 'received') setProgress('uploading')
          if (step === 'analyzing') setProgress('analyzing')
          if (step === 'extracting') setProgress('extracting')
          if (step === 'complete') setProgress('done')
        },
      })

      const newActionIds: string[] = []
      result.actionItems.forEach((ai, idx) => {
        const ownerId = ai.ownerId || participants[idx % Math.max(participants.length, 1)] || ''
        const id = addActionItem({
          meetingId,
          task: ai.task,
          ownerId,
          status: ai.status || 'todo',
          due: ai.due,
          order: idx,
        })
        newActionIds.push(id)
      })

      updateMeeting(meetingId, {
        summary: result.summary,
        keyDecisions: result.keyDecisions,
        topics: result.topics,
        sentiment: result.sentiment,
        followUpDraft: result.followUpDraft,
        insights: result.insights,
        riskFlags: result.riskFlags,
        actionItemIds: newActionIds,
      })

      setProgress('done')
      addToast({ type: 'success', title: 'Meeting analyzed!', description: `Found ${newActionIds.length} action items` })
      onOpenChange(false)
      navigate(`/meetings/${meetingId}`)
    } catch (err: any) {
      setError(err?.message || 'Upload failed')
      addToast({
        type: 'error',
        title: 'Analysis failed',
        description: err?.message || 'Click to retry',
        actionLabel: 'Retry',
        onAction: () => {
          runAnalysis()
        },
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!transcript.trim()) {
      setError('Please provide a transcript')
      return
    }

    await runAnalysis()
  }

  const renderStep = (step: typeof steps[number]) => {
    const isActive = steps.findIndex((s) => s.key === step.key) <= steps.findIndex((s) => s.key === progress)
    return (
      <div key={step.key} className="flex items-center gap-2 text-sm">
        {isActive ? <CheckCircle2 className="h-4 w-4 text-success" /> : <Loader2 className="h-4 w-4 animate-spin text-text-secondary" />}
        <span className={isActive ? 'text-text-primary' : 'text-text-secondary'}>{step.label}</span>
      </div>
    )
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 w-[min(960px,90vw)] -translate-x-1/2 -translate-y-1/2 rounded-card border border-border bg-sidebar/95 p-6 shadow-2xl focus:outline-none">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="text-xl font-semibold text-text-primary">New Meeting Upload</Dialog.Title>
              <Dialog.Description className="text-sm text-text-secondary">Drop a transcript or paste text. Max 500KB. Txt/VTT parsed; docx/pdf will prompt paste.</Dialog.Description>
            </div>
            <Dialog.Close className="text-text-secondary hover:text-text-primary">✕</Dialog.Close>
          </div>

          <div className="mt-4 grid gap-4 tablet:grid-cols-2">
            <div className="space-y-3">
              <Tabs.Root value={activeTab} onValueChange={(v) => setActiveTab(v as 'drop' | 'paste')}>
                <Tabs.List className="mb-3 flex gap-2">
                  <Tabs.Trigger value="drop" className="rounded-button border border-border bg-background px-3 py-2 text-sm text-text-secondary data-[state=active]:border-primary/60 data-[state=active]:text-text-primary">Drop file</Tabs.Trigger>
                  <Tabs.Trigger value="paste" className="rounded-button border border-border bg-background px-3 py-2 text-sm text-text-secondary data-[state=active]:border-primary/60 data-[state=active]:text-text-primary">Paste text</Tabs.Trigger>
                </Tabs.List>

                <Tabs.Content value="drop">
                  <div
                    {...getRootProps()}
                    className={`cursor-pointer rounded-card border-2 border-dashed p-4 text-center transition ${isDragActive ? 'border-primary bg-primary/5' : 'border-border bg-background/60'}`}
                  >
                    <input {...getInputProps()} />
                    <Upload className="mx-auto h-8 w-8 text-primary" />
                    <div className="mt-2 text-text-primary font-semibold">Drop transcript here or click to upload</div>
                    <div className="text-sm text-text-secondary">Accepts .txt, .vtt. Docx/PDF will ask for paste.</div>
                    {fileName && <div className="mt-2 text-xs text-text-secondary">Selected: {fileName}</div>}
                  </div>
                </Tabs.Content>

                <Tabs.Content value="paste">
                  <textarea
                    className="h-48 w-full rounded-card border border-border bg-background/60 p-3 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary/60"
                    placeholder="Paste transcript text"
                    value={transcript}
                    onChange={(e) => {
                      setTranscript(e.target.value)
                      setPreview(e.target.value.slice(0, 500))
                    }}
                  />
                </Tabs.Content>
              </Tabs.Root>

              <div className="rounded-card border border-border bg-background/50 p-3 text-sm text-text-secondary">
                <div className="mb-2 text-xs uppercase tracking-wide text-text-secondary">Preview (first 500 chars)</div>
                <div className="max-h-32 overflow-y-auto whitespace-pre-wrap text-text-primary">
                  {preview || 'No transcript yet.'}
                </div>
              </div>
            </div>

            <form className="space-y-3" onSubmit={handleSubmit}>
              <div className="space-y-1">
                <label className="text-sm text-text-secondary">Title</label>
                <input
                  className="w-full rounded-button border border-border bg-background px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/60"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-sm text-text-secondary">Date</label>
                  <div className="relative">
                    <CalendarClock className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
                    <input
                      type="date"
                      className="w-full rounded-button border border-border bg-background px-8 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/60"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-text-secondary">Channel</label>
                  <select
                    className="w-full rounded-button border border-border bg-background px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/60"
                    value={channelId}
                    onChange={(e) => setChannelId(e.target.value)}
                  >
                    {channels.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-sm text-text-secondary">Meeting type</label>
                  <select
                    className="w-full rounded-button border border-border bg-background px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/60"
                    value={type}
                    onChange={(e) => setType(e.target.value as MeetingType)}
                  >
                    <option value="client">Client</option>
                    <option value="internal">Internal</option>
                    <option value="one-on-one">1:1</option>
                    <option value="project">Project</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-text-secondary">Participants</label>
                  <div className="flex flex-wrap gap-2 rounded-card border border-border bg-background px-2 py-2">
                    {people.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => toggleParticipant(p.id)}
                        className={`rounded-button px-2 py-1 text-xs ${selectedParticipants.has(p.id) ? 'bg-primary/20 text-text-primary border border-primary/50' : 'bg-background text-text-secondary border border-border'}`}
                      >
                        {p.name.split(' ')[0]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="rounded-card border border-border bg-background/50 p-3">
                <div className="text-xs uppercase tracking-wide text-text-secondary">Progress</div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                  {steps.map((s) => renderStep(s))}
                </div>
              </div>

              {error && <div className="rounded-button border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</div>}

              <div className="flex items-center justify-end gap-2">
                <Dialog.Close asChild>
                  <button type="button" className="rounded-button border border-border px-4 py-2 text-sm text-text-secondary hover:border-primary/40">
                    Cancel
                  </button>
                </Dialog.Close>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-button bg-primary px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-primary/20 hover:bg-primary/90 disabled:opacity-60"
                >
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Analyze Meeting
                </button>
              </div>
            </form>
          </div>

          <div className="mt-3 text-xs text-text-secondary">
            Txt/VTT parsed locally. Docx/PDF currently ask for pasted text. Audio not supported yet. Max 500KB. Mock mode available via VITE_MOCK_MODE=true.
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
