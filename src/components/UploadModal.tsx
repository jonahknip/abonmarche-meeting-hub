import { useCallback, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import * as Tabs from '@radix-ui/react-tabs'
import { useDropzone } from 'react-dropzone'
import { CalendarClock, CheckCircle2, Loader2, Monitor, Upload } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { uploadTranscript, analyzeMeeting } from '../lib/api'
import { useToast } from './Toast'
import { parseVttTranscript } from '../lib/teams'

const ACCEPT = {
  'text/plain': ['.txt'],
  'text/vtt': ['.vtt'],
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
}

const MAX_BYTES = 10 * 1024 * 1024

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
  const navigate = useNavigate()
  const { addToast } = useToast()

  const [activeTab, setActiveTab] = useState<'drop' | 'paste' | 'teams'>('drop')
  const [transcript, setTranscript] = useState('')
  const [fileName, setFileName] = useState('')
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [preview, setPreview] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [progress, setProgress] = useState<'idle' | 'uploading' | 'analyzing' | 'extracting' | 'done'>('idle')

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setError(null)
    const file = acceptedFiles[0]
    if (!file) return

    if (file.size > MAX_BYTES) {
      setError('File exceeds 10MB limit')
      return
    }

    const ext = file.name.toLowerCase()
    if (ext.endsWith('.pdf') || ext.endsWith('.docx')) {
      setError('Docx/PDF not yet parsed. Please paste the transcript text.')
      return
    }

    const text = await file.text()
    const lower = file.name.toLowerCase()
    let processedText = text
    if (lower.endsWith('.vtt')) {
      processedText = parseVttTranscript(text)
    }

    setTranscript(processedText)
    setPreview(processedText.slice(0, 500))
    setFileName(file.name)
    setUploadedFile(file)
    if (!title) setTitle(file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '))
  }, [title])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ accept: ACCEPT, multiple: false, onDrop })

  const handleAnalyze = async () => {
    setError(null)
    setSubmitting(true)
    setProgress('uploading')

    try {
      const file = uploadedFile || new File([transcript], 'transcript.txt', { type: 'text/plain' })

      console.log('Step 1: Uploading transcript...')
      const { meetingId } = await uploadTranscript(file, title || 'Untitled Meeting', date)
      setProgress('analyzing')

      console.log('Step 2: Analyzing with Claude...', meetingId)
      const { analysis } = await analyzeMeeting(meetingId)
      setProgress('extracting')

      console.log('Step 3: Complete', analysis)
      setProgress('done')

      addToast({
        type: 'success',
        title: 'Meeting analyzed!',
        description: `Found ${analysis.actionItemsCount} action items, ${analysis.decisionsCount} decisions`,
      })

      onOpenChange(false)
      navigate(`/meetings/${meetingId}`)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Analysis failed'
      console.error('Analysis failed:', err)
      setError(message)
      addToast({
        type: 'error',
        title: 'Analysis failed',
        description: message,
        actionLabel: 'Retry',
        onAction: () => handleAnalyze(),
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log('Form submitted', { title, transcript: transcript.slice(0, 80) })
    setError(null)

    if (!transcript.trim()) {
      setError('Please provide a transcript')
      return
    }

    if (transcript.trim().length < 100) {
      setError('Transcript must be at least 100 characters')
      return
    }

    await handleAnalyze()
  }

  const renderStep = (step: typeof steps[number]) => {
    const stepIndex = steps.findIndex((s) => s.key === step.key)
    const currentIndex = steps.findIndex((s) => s.key === progress)
    const isActive = progress !== 'idle' && stepIndex <= currentIndex

    return (
      <div key={step.key} className="flex items-center gap-2 text-sm">
        {isActive ? (
          <CheckCircle2 className="h-4 w-4 text-success" />
        ) : (
          <Loader2 className="h-4 w-4 animate-spin text-text-secondary" />
        )}
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
              <Dialog.Description className="text-sm text-text-secondary">
                Drop a transcript or paste text. Max 10MB. Txt/VTT parsed; docx/pdf will prompt paste.
              </Dialog.Description>
            </div>
            <Dialog.Close className="text-text-secondary hover:text-text-primary">X</Dialog.Close>
          </div>

          <div className="mt-4 grid gap-4 tablet:grid-cols-2">
            <div className="space-y-3">
              <Tabs.Root value={activeTab} onValueChange={(v) => setActiveTab(v as 'drop' | 'paste' | 'teams')}>
                <Tabs.List className="mb-3 flex gap-2">
                  <Tabs.Trigger value="drop" className="rounded-button border border-border bg-background px-3 py-2 text-sm text-text-secondary data-[state=active]:border-primary/60 data-[state=active]:text-text-primary">Drop file</Tabs.Trigger>
                  <Tabs.Trigger value="paste" className="rounded-button border border-border bg-background px-3 py-2 text-sm text-text-secondary data-[state=active]:border-primary/60 data-[state=active]:text-text-primary">Paste text</Tabs.Trigger>
                  <Tabs.Trigger value="teams" className="rounded-button border border-border bg-background px-3 py-2 text-sm text-text-secondary data-[state=active]:border-primary/60 data-[state=active]:text-text-primary">Import from Teams</Tabs.Trigger>
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
                      setUploadedFile(null)
                    }}
                  />
                </Tabs.Content>

                <Tabs.Content value="teams" className="space-y-4">
                  <div className="text-center py-6 space-y-3">
                    <Monitor className="w-10 h-10 mx-auto text-text-secondary" />
                    <div className="text-lg font-semibold text-text-primary">Import from Microsoft Teams</div>
                    <p className="text-sm text-text-secondary">Download your Teams transcript (.vtt or .docx) and use the Drop or Paste tabs to upload. Automatic Teams connection will be available once Graph permissions are configured.</p>
                    <ol className="text-sm text-left max-w-md mx-auto space-y-2 text-text-secondary">
                      <li>1. Open the Teams meeting chat</li>
                      <li>2. Click the "Transcript" tab</li>
                      <li>3. Click "Download" - choose .vtt or .docx</li>
                      <li>4. Use the Drop tab to upload, or paste the text</li>
                    </ol>
                  </div>
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
                  placeholder="Meeting title"
                />
              </div>

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
                  disabled={submitting || !transcript.trim()}
                  className="inline-flex items-center gap-2 rounded-button bg-primary px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-primary/20 hover:bg-primary/90 disabled:opacity-60"
                >
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Analyze Meeting
                </button>
              </div>
            </form>
          </div>

          <div className="mt-3 text-xs text-text-secondary">
            Txt/VTT parsed locally. Docx/PDF currently ask for pasted text. Audio not supported yet. Max 10MB.
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
