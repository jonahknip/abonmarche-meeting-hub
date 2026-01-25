import { useCallback, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import * as Tabs from '@radix-ui/react-tabs'
import { useDropzone } from 'react-dropzone'
import { AlertCircle, CalendarClock, CheckCircle2, FileText, Loader2, Monitor, Upload, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import mammoth from 'mammoth'
import { uploadTranscript, analyzeMeeting } from '../lib/api'
import { useToast } from './Toast'
import { parseTranscript, validateTranscript, detectTranscriptFormat } from '../lib/teams'

const ACCEPT = {
  'text/plain': ['.txt'],
  'text/vtt': ['.vtt'],
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
  const [rawContent, setRawContent] = useState('')
  const [parsedContent, setParsedContent] = useState('')
  const [fileName, setFileName] = useState('')
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [detectedFormat, setDetectedFormat] = useState<string>('')
  const [participants, setParticipants] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [progress, setProgress] = useState<'idle' | 'uploading' | 'analyzing' | 'extracting' | 'done'>('idle')
  const [isProcessingFile, setIsProcessingFile] = useState(false)

  const processContent = useCallback((content: string, source: string) => {
    setError(null)
    
    const validation = validateTranscript(content)
    if (!validation.valid) {
      setError(validation.error || 'Invalid transcript')
      return
    }

    const format = detectTranscriptFormat(content)
    const parsed = parseTranscript(content)
    
    setRawContent(content)
    setParsedContent(parsed.rawText)
    setDetectedFormat(format)
    setParticipants(parsed.participants)
    
    if (!title && source !== 'paste') {
      const cleanName = source.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ')
      setTitle(cleanName)
    }
  }, [title])

  const extractTextFromDocx = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer()
    const result = await mammoth.extractRawText({ arrayBuffer })
    return result.value
  }

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setError(null)
    const file = acceptedFiles[0]
    if (!file) return

    if (file.size > MAX_BYTES) {
      setError('File exceeds 10MB limit')
      return
    }

    const ext = file.name.toLowerCase()

    // Handle DOCX files
    if (ext.endsWith('.docx')) {
      setIsProcessingFile(true)
      try {
        const text = await extractTextFromDocx(file)
        setFileName(file.name)
        processContent(text, file.name)
        setDetectedFormat('Word Document')
      } catch (err) {
        console.error('DOCX parse error:', err)
        setError('Failed to read Word document. Please try copying the text and pasting it.')
      } finally {
        setIsProcessingFile(false)
      }
      return
    }

    // Handle PDF (still not supported)
    if (ext.endsWith('.pdf')) {
      setError('PDF files not supported yet. Please copy the transcript text and use "Paste text" tab.')
      return
    }

    // Handle text files
    try {
      const text = await file.text()
      setFileName(file.name)
      processContent(text, file.name)
    } catch (err) {
      setError('Failed to read file. Please try pasting the content instead.')
      console.error('File read error:', err)
    }
  }, [processContent])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    accept: ACCEPT, 
    multiple: false, 
    onDrop 
  })

  const handlePaste = useCallback((value: string) => {
    setRawContent(value)
    if (value.trim().length > 50) {
      processContent(value, 'paste')
    } else {
      setParsedContent('')
      setDetectedFormat('')
      setParticipants([])
    }
  }, [processContent])

  const handleAnalyze = async () => {
    setError(null)
    setSubmitting(true)
    setProgress('uploading')

    const contentToUpload = parsedContent || rawContent

    try {
      console.log('Step 1: Uploading transcript...', { 
        length: contentToUpload.length,
        format: detectedFormat 
      })
      
      const { meetingId } = await uploadTranscript(contentToUpload, title || 'Untitled Meeting', date)
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

      resetForm()
      onOpenChange(false)
      navigate(`/meetings/${meetingId}`)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Analysis failed'
      console.error('Analysis failed:', err)
      setError(message)
      setProgress('idle')
      addToast({
        type: 'error',
        title: 'Analysis failed',
        description: message,
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const contentToValidate = parsedContent || rawContent

    if (!contentToValidate.trim()) {
      setError('Please provide a transcript')
      return
    }

    if (contentToValidate.trim().length < 50) {
      setError('Transcript must be at least 50 characters')
      return
    }

    await handleAnalyze()
  }

  const resetForm = () => {
    setRawContent('')
    setParsedContent('')
    setFileName('')
    setTitle('')
    setDate(new Date().toISOString().slice(0, 10))
    setDetectedFormat('')
    setParticipants([])
    setError(null)
    setProgress('idle')
  }

  const renderStep = (step: typeof steps[number]) => {
    const stepIndex = steps.findIndex((s) => s.key === step.key)
    const currentIndex = steps.findIndex((s) => s.key === progress)
    const isComplete = progress !== 'idle' && stepIndex < currentIndex
    const isActive = progress === step.key

    return (
      <div key={step.key} className="flex items-center gap-2 text-sm">
        {isComplete ? (
          <CheckCircle2 className="h-4 w-4 text-success" />
        ) : isActive ? (
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
        ) : (
          <div className="h-4 w-4 rounded-full border border-text-secondary" />
        )}
        <span className={isComplete || isActive ? 'text-text-primary' : 'text-text-secondary'}>
          {step.label}
        </span>
      </div>
    )
  }

  const previewContent = parsedContent || rawContent
  const hasContent = previewContent.trim().length > 0

  return (
    <Dialog.Root open={open} onOpenChange={(isOpen) => {
      if (!isOpen) resetForm()
      onOpenChange(isOpen)
    }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 w-[min(960px,90vw)] max-h-[90vh] overflow-y-auto -translate-x-1/2 -translate-y-1/2 rounded-card border border-border bg-sidebar/95 p-6 shadow-2xl focus:outline-none">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="text-xl font-semibold text-text-primary">
                New Meeting Upload
              </Dialog.Title>
              <Dialog.Description className="text-sm text-text-secondary">
                Drop a transcript file or paste text. Supports Teams VTT, Word docs, plain text, and copy/paste.
              </Dialog.Description>
            </div>
            <Dialog.Close className="rounded-button p-1 text-text-secondary hover:text-text-primary hover:bg-white/5">
              <X className="h-5 w-5" />
            </Dialog.Close>
          </div>

          <div className="mt-4 grid gap-4 tablet:grid-cols-2">
            <div className="space-y-3">
              <Tabs.Root value={activeTab} onValueChange={(v) => setActiveTab(v as 'drop' | 'paste' | 'teams')}>
                <Tabs.List className="mb-3 flex gap-2">
                  <Tabs.Trigger 
                    value="drop" 
                    className="rounded-button border border-border bg-background px-3 py-2 text-sm text-text-secondary data-[state=active]:border-primary/60 data-[state=active]:text-text-primary"
                  >
                    <Upload className="h-4 w-4 inline mr-1" />
                    Drop file
                  </Tabs.Trigger>
                  <Tabs.Trigger 
                    value="paste" 
                    className="rounded-button border border-border bg-background px-3 py-2 text-sm text-text-secondary data-[state=active]:border-primary/60 data-[state=active]:text-text-primary"
                  >
                    <FileText className="h-4 w-4 inline mr-1" />
                    Paste text
                  </Tabs.Trigger>
                  <Tabs.Trigger 
                    value="teams" 
                    className="rounded-button border border-border bg-background px-3 py-2 text-sm text-text-secondary data-[state=active]:border-primary/60 data-[state=active]:text-text-primary"
                  >
                    <Monitor className="h-4 w-4 inline mr-1" />
                    Teams Help
                  </Tabs.Trigger>
                </Tabs.List>

                <Tabs.Content value="drop">
                  <div
                    {...getRootProps()}
                    className={`cursor-pointer rounded-card border-2 border-dashed p-6 text-center transition ${
                      isDragActive 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border bg-background/60 hover:border-primary/40'
                    }`}
                  >
                    <input {...getInputProps()} />
                    {isProcessingFile ? (
                      <>
                        <Loader2 className="mx-auto h-10 w-10 text-primary animate-spin" />
                        <div className="mt-3 text-text-primary font-semibold">
                          Processing document...
                        </div>
                      </>
                    ) : (
                      <>
                        <Upload className="mx-auto h-10 w-10 text-primary" />
                        <div className="mt-3 text-text-primary font-semibold">
                          {isDragActive ? 'Drop it here!' : 'Drop transcript here or click to upload'}
                        </div>
                        <div className="mt-1 text-sm text-text-secondary">
                          Accepts .txt, .vtt, .docx files (max 10MB)
                        </div>
                      </>
                    )}
                    {fileName && !isProcessingFile && (
                      <div className="mt-3 inline-flex items-center gap-2 rounded-button border border-success/50 bg-success/10 px-3 py-1 text-sm text-success">
                        <FileText className="h-4 w-4" />
                        {fileName}
                      </div>
                    )}
                  </div>
                </Tabs.Content>

                <Tabs.Content value="paste">
                  <textarea
                    className="h-48 w-full rounded-card border border-border bg-background/60 p-3 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary/60 resize-none"
                    placeholder="Paste your meeting transcript here...

Supported formats:
• Teams VTT transcripts
• Copy/paste from Teams transcript view
• Plain text transcripts
• Copied text from Word documents"
                    value={rawContent}
                    onChange={(e) => handlePaste(e.target.value)}
                  />
                </Tabs.Content>

                <Tabs.Content value="teams" className="space-y-4">
                  <div className="rounded-card border border-border bg-background/60 p-4">
                    <div className="flex items-center gap-2 text-lg font-semibold text-text-primary mb-3">
                      <Monitor className="h-5 w-5 text-primary" />
                      How to Export from Microsoft Teams
                    </div>
                    <ol className="space-y-3 text-sm text-text-secondary">
                      <li className="flex gap-3">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-semibold">1</span>
                        <span>Open the Teams meeting chat or recording</span>
                      </li>
                      <li className="flex gap-3">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-semibold">2</span>
                        <span>Click the <strong>"Transcript"</strong> tab in the meeting details</span>
                      </li>
                      <li className="flex gap-3">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-semibold">3</span>
                        <span>Click <strong>"Download"</strong> and choose <strong>.vtt</strong> or <strong>.docx</strong> format</span>
                      </li>
                      <li className="flex gap-3">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-semibold">4</span>
                        <span>Use the <strong>"Drop file"</strong> tab to upload, or copy the text and use <strong>"Paste text"</strong></span>
                      </li>
                    </ol>
                    <div className="mt-4 p-3 rounded-button bg-primary/5 border border-primary/20 text-sm text-text-secondary">
                      <strong className="text-text-primary">Tip:</strong> You can also select all text from the Teams transcript viewer and paste it directly. The parser will automatically detect and format it.
                    </div>
                  </div>
                </Tabs.Content>
              </Tabs.Root>

              {hasContent && (
                <div className="rounded-card border border-border bg-background/50 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs uppercase tracking-wide text-text-secondary">Preview</span>
                    <div className="flex items-center gap-2">
                      {detectedFormat && (
                        <span className="text-xs rounded-button border border-primary/30 bg-primary/10 px-2 py-0.5 text-primary">
                          {detectedFormat}
                        </span>
                      )}
                      <span className="text-xs text-text-secondary">
                        {previewContent.length.toLocaleString()} chars
                      </span>
                    </div>
                  </div>
                  {participants.length > 0 && (
                    <div className="mb-2 flex flex-wrap gap-1">
                      {participants.slice(0, 5).map(p => (
                        <span key={p} className="text-xs rounded-button border border-accent/30 bg-accent/10 px-2 py-0.5 text-accent">
                          {p}
                        </span>
                      ))}
                      {participants.length > 5 && (
                        <span className="text-xs text-text-secondary">+{participants.length - 5} more</span>
                      )}
                    </div>
                  )}
                  <div className="max-h-32 overflow-y-auto whitespace-pre-wrap text-sm text-text-primary font-mono bg-background/50 rounded p-2">
                    {previewContent.slice(0, 800)}
                    {previewContent.length > 800 && <span className="text-text-secondary">...</span>}
                  </div>
                </div>
              )}
            </div>

            <form className="space-y-3" onSubmit={handleSubmit}>
              <div className="space-y-1">
                <label className="text-sm text-text-secondary">Meeting Title</label>
                <input
                  className="w-full rounded-button border border-border bg-background px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/60"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Weekly Team Standup"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm text-text-secondary">Meeting Date</label>
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
                <div className="text-xs uppercase tracking-wide text-text-secondary mb-2">Progress</div>
                <div className="grid grid-cols-2 gap-2">
                  {steps.map((s) => renderStep(s))}
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2 rounded-button border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
                  <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <Dialog.Close asChild>
                  <button 
                    type="button" 
                    className="rounded-button border border-border px-4 py-2 text-sm text-text-secondary hover:border-primary/40 hover:text-text-primary"
                  >
                    Cancel
                  </button>
                </Dialog.Close>
                <button
                  type="submit"
                  disabled={submitting || !hasContent || isProcessingFile}
                  className="inline-flex items-center gap-2 rounded-button bg-primary px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-primary/20 hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Analyze Meeting
                </button>
              </div>
            </form>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
