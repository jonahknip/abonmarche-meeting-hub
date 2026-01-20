import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import * as Tabs from '@radix-ui/react-tabs'
import { ArrowLeft, ClipboardCopy, Download, Loader2, MoreVertical, RefreshCw, Share } from 'lucide-react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { getMeeting, analyzeMeeting, downloadTranscript } from '../lib/api'
import type { MeetingWithRelations } from '../lib/api'
import { useToast } from '../components/Toast'
import { parseTranscript, extractParticipants } from '../lib/teams'

export default function MeetingDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { addToast } = useToast()

  const [meeting, setMeeting] = useState<MeetingWithRelations | null>(null)
  const [loading, setLoading] = useState(true)
  const [reanalyzing, setReanalyzing] = useState(false)

  const [editingTitle, setEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    async function fetchMeeting() {
      if (!id) return

      try {
        const { meeting: data } = await getMeeting(id)
        setMeeting(data)
        setTitleDraft(data.title)
      } catch (error) {
        console.error('Failed to load meeting:', error)
        addToast({ type: 'error', title: 'Meeting not found' })
        navigate('/')
      } finally {
        setLoading(false)
      }
    }
    fetchMeeting()
  }, [id, navigate, addToast])

  const parsedTranscript = useMemo(() => {
    if (!meeting?.transcript) return null
    return parseTranscript(meeting.transcript)
  }, [meeting?.transcript])

  const participants = useMemo(() => {
    if (!meeting?.transcript) return []
    return extractParticipants(meeting.transcript)
  }, [meeting?.transcript])

  const filteredTranscript = useMemo(() => {
    const text = parsedTranscript?.rawText || meeting?.transcript || ''
    if (!searchTerm.trim()) return text
    const regex = new RegExp(`(${escapeRegex(searchTerm)})`, 'gi')
    return text.replace(regex, '<<$1>>')
  }, [parsedTranscript, meeting?.transcript, searchTerm])

  const highlightedTranscript = useMemo(() => {
    return filteredTranscript.split('<<').flatMap((chunk, idx) => {
      if (idx === 0) return [chunk]
      const [match, ...rest] = chunk.split('>>')
      return [<mark key={`m-${idx}`} className="bg-primary/30 text-text-primary rounded px-0.5">{match}</mark>, rest.join('>>')]
    })
  }, [filteredTranscript])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!meeting) {
    return (
      <div className="text-text-secondary">
        <button onClick={() => navigate(-1)} className="mb-2 inline-flex items-center gap-2 text-sm text-primary">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        Meeting not found.
      </div>
    )
  }

  const copyToClipboard = async (text: string, message: string) => {
    await navigator.clipboard.writeText(text)
    addToast({ type: 'success', title: message })
  }

  const handleDownload = (format: 'txt' | 'md') => {
    try {
      downloadTranscript(meeting, format)
      addToast({ type: 'success', title: `Downloaded as ${format.toUpperCase()}` })
    } catch (err) {
      console.error('Download failed:', err)
      addToast({ type: 'error', title: 'Download failed' })
    }
  }

  const handleShare = async () => {
    await copyToClipboard(window.location.href, 'Link copied to clipboard')
  }

  const handleReanalyze = async () => {
    if (!confirm('This will replace the current analysis. Proceed?')) return

    setReanalyzing(true)
    try {
      const { analysis } = await analyzeMeeting(meeting.id)
      addToast({
        type: 'success',
        title: 'Reanalysis complete',
        description: `Found ${analysis.actionItemsCount} action items`,
      })

      const { meeting: refreshed } = await getMeeting(meeting.id)
      setMeeting(refreshed)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Analysis failed'
      addToast({ type: 'error', title: 'Analysis failed', description: message })
    } finally {
      setReanalyzing(false)
    }
  }

  const statusColors: Record<string, string> = {
    todo: 'border-warning/50 bg-warning/10 text-warning',
    'in-progress': 'border-primary/50 bg-primary/10 text-primary',
    done: 'border-success/50 bg-success/10 text-success',
  }

  const priorityColors: Record<string, string> = {
    high: 'border-danger/50 bg-danger/10 text-danger',
    medium: 'border-warning/50 bg-warning/10 text-warning',
    low: 'border-text-secondary/50 bg-text-secondary/10 text-text-secondary',
  }

  const severityColors: Record<string, string> = {
    high: 'border-danger/50 bg-danger/10 text-danger',
    medium: 'border-warning/50 bg-warning/10 text-warning',
    low: 'border-success/50 bg-success/10 text-success',
  }

  return (
    <div className="flex flex-col gap-4 desktop:flex-row">
      <div className="desktop:w-3/5 space-y-4">
        <div className="rounded-card border border-border bg-sidebar/60 p-4 shadow-panel">
          <div className="mb-2 text-sm text-text-secondary">
            <button onClick={() => navigate('/meetings')} className="hover:text-primary">Meetings</button>
            {' > '}{meeting.title}
          </div>
          <div className="flex flex-wrap items-start gap-3">
            <div className="flex-1">
              {editingTitle ? (
                <div className="flex items-center gap-2">
                  <input
                    className="w-full rounded-button border border-border bg-background px-3 py-2 text-lg font-semibold text-text-primary"
                    value={titleDraft}
                    onChange={(e) => setTitleDraft(e.target.value)}
                  />
                  <button
                    className="rounded-button bg-primary px-3 py-1 text-sm text-white"
                    onClick={() => setEditingTitle(false)}
                  >
                    Done
                  </button>
                </div>
              ) : (
                <div
                  className="text-2xl font-semibold text-text-primary cursor-pointer hover:text-primary"
                  onClick={() => setEditingTitle(true)}
                >
                  {meeting.title}
                </div>
              )}

              <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-text-secondary">
                <span>{new Date(meeting.date).toLocaleString()}</span>
                {participants.length > 0 && (
                  <span className="text-xs text-text-secondary">
                    {participants.length} participant{participants.length !== 1 ? 's' : ''}
                  </span>
                )}
                {meeting.topics && meeting.topics.length > 0 && (
                  <span className="rounded-button border border-border bg-background px-2 py-1 text-xs text-primary">
                    {meeting.topics.slice(0, 2).join(', ')}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleReanalyze}
                className="rounded-button border border-border px-3 py-2 text-sm text-text-primary hover:border-primary/50 flex items-center gap-1"
                disabled={reanalyzing}
              >
                {reanalyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Reanalyze
              </button>
              <button onClick={handleShare} className="rounded-button border border-border px-3 py-2 text-sm text-text-secondary hover:border-primary/50">
                <Share className="h-4 w-4" />
              </button>
              <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                  <button className="rounded-button border border-border px-3 py-2 text-sm text-text-secondary hover:border-primary/50">
                    <MoreVertical className="h-4 w-4" />
                  </button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Portal>
                  <DropdownMenu.Content className="rounded-card border border-border bg-sidebar/95 p-2 text-sm text-text-primary shadow-lg min-w-[160px]">
                    <DropdownMenu.Item 
                      className="cursor-pointer rounded-button px-3 py-2 hover:bg-white/5 flex items-center gap-2" 
                      onSelect={() => handleDownload('txt')}
                    >
                      <Download className="h-4 w-4" />
                      Download as TXT
                    </DropdownMenu.Item>
                    <DropdownMenu.Item 
                      className="cursor-pointer rounded-button px-3 py-2 hover:bg-white/5 flex items-center gap-2" 
                      onSelect={() => handleDownload('md')}
                    >
                      <Download className="h-4 w-4" />
                      Download as Markdown
                    </DropdownMenu.Item>
                    <DropdownMenu.Separator className="my-1 border-t border-border" />
                    <DropdownMenu.Item 
                      className="cursor-pointer rounded-button px-3 py-2 hover:bg-white/5 flex items-center gap-2" 
                      onSelect={() => copyToClipboard(meeting.transcript, 'Transcript copied')}
                    >
                      <ClipboardCopy className="h-4 w-4" />
                      Copy Transcript
                    </DropdownMenu.Item>
                  </DropdownMenu.Content>
                </DropdownMenu.Portal>
              </DropdownMenu.Root>
            </div>
          </div>
        </div>

        <Tabs.Root defaultValue="summary">
          <Tabs.List className="mb-3 flex gap-2 overflow-x-auto rounded-button border border-border bg-background px-2 py-2 text-sm text-text-secondary">
            <Tabs.Trigger value="summary" className="rounded-button px-3 py-1 data-[state=active]:bg-primary/20 data-[state=active]:text-text-primary">Summary</Tabs.Trigger>
            <Tabs.Trigger value="transcript" className="rounded-button px-3 py-1 data-[state=active]:bg-primary/20 data-[state=active]:text-text-primary">Transcript</Tabs.Trigger>
            <Tabs.Trigger value="actions" className="rounded-button px-3 py-1 data-[state=active]:bg-primary/20 data-[state=active]:text-text-primary">Action Items</Tabs.Trigger>
            <Tabs.Trigger value="decisions" className="rounded-button px-3 py-1 data-[state=active]:bg-primary/20 data-[state=active]:text-text-primary">Decisions</Tabs.Trigger>
          </Tabs.List>

          <Tabs.Content value="summary" className="space-y-4">
            <div className="rounded-card border-l-4 border-primary bg-primary/10 p-4 text-text-primary">
              {meeting.summary || 'No summary yet. Click Reanalyze to generate.'}
            </div>

            <div>
              <div className="text-sm font-semibold text-text-primary">Topics</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {meeting.topics && meeting.topics.length > 0 ? (
                  meeting.topics.map((t) => (
                    <span key={t} className="rounded-button border border-border bg-background px-2 py-1 text-xs text-text-secondary">{t}</span>
                  ))
                ) : (
                  <span className="text-sm text-text-secondary">No topics captured.</span>
                )}
              </div>
            </div>

            <div>
              <div className="text-sm font-semibold text-text-primary">Projects</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {meeting.projects && meeting.projects.length > 0 ? (
                  meeting.projects.map((p) => (
                    <span key={p} className="rounded-button border border-accent/50 bg-accent/10 px-2 py-1 text-xs text-accent">{p}</span>
                  ))
                ) : (
                  <span className="text-sm text-text-secondary">No projects mentioned.</span>
                )}
              </div>
            </div>

            {participants.length > 0 && (
              <div>
                <div className="text-sm font-semibold text-text-primary">Participants</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {participants.map((p) => (
                    <span key={p} className="rounded-button border border-accent/50 bg-accent/10 px-2 py-1 text-xs text-accent">{p}</span>
                  ))}
                </div>
              </div>
            )}
          </Tabs.Content>

          <Tabs.Content value="transcript" className="space-y-3">
            <div className="flex items-center gap-2">
              <input
                className="flex-1 max-w-xs rounded-button border border-border bg-background px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary/60"
                placeholder="Search transcript..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')}
                  className="text-xs text-text-secondary hover:text-text-primary"
                >
                  Clear
                </button>
              )}
              <span className="text-xs text-text-secondary ml-auto">
                {parsedTranscript?.format && `Format: ${parsedTranscript.format}`}
              </span>
            </div>
            
            {!meeting.transcript ? (
              <div className="rounded-card border border-border bg-background/60 p-6 text-center text-text-secondary">
                No transcript available.
              </div>
            ) : (
              <div className="rounded-card border border-border bg-background/60 p-4 text-sm leading-relaxed text-text-primary max-h-[500px] overflow-y-auto">
                <pre className="whitespace-pre-wrap font-sans">
                  {highlightedTranscript}
                </pre>
              </div>
            )}
          </Tabs.Content>

          <Tabs.Content value="actions" className="space-y-3">
            {meeting.actionItems.length === 0 ? (
              <div className="text-sm text-text-secondary py-4">No action items found.</div>
            ) : (
              meeting.actionItems.map((item) => (
                <div key={item.id} className="rounded-card border border-border bg-background/60 px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="text-text-primary font-medium">{item.task}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                        <span className={`rounded-button border px-2 py-0.5 ${statusColors[item.status] || ''}`}>
                          {item.status}
                        </span>
                        <span className={`rounded-button border px-2 py-0.5 ${priorityColors[item.priority] || ''}`}>
                          {item.priority}
                        </span>
                        {item.assignee && (
                          <span className="text-text-secondary">Assigned to: {item.assignee}</span>
                        )}
                        {item.due_date && (
                          <span className="text-text-secondary">Due: {new Date(item.due_date).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                    {item.confidence && (
                      <span className="text-xs text-text-secondary">{Math.round(item.confidence * 100)}% confident</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </Tabs.Content>

          <Tabs.Content value="decisions" className="space-y-3">
            {meeting.decisions.length === 0 ? (
              <div className="text-sm text-text-secondary py-4">No decisions captured.</div>
            ) : (
              meeting.decisions.map((d) => (
                <div key={d.id} className="rounded-card border border-border bg-background/60 px-4 py-3">
                  <div className="text-text-primary font-medium">{d.decision}</div>
                  <div className="mt-1 text-sm text-text-secondary">{d.context}</div>
                </div>
              ))
            )}
          </Tabs.Content>
        </Tabs.Root>
      </div>

      <div className="desktop:w-2/5 space-y-4">
        <div className="rounded-card border border-border bg-sidebar/60 p-4">
          <div className="text-sm font-semibold text-text-primary">Risks</div>
          <div className="mt-3 space-y-2">
            {meeting.risks.length === 0 ? (
              <span className="text-sm text-text-secondary">No risks identified.</span>
            ) : (
              meeting.risks.map((r) => (
                <div key={r.id} className="rounded-button border border-border bg-background/50 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className={`rounded-button border px-2 py-0.5 text-xs ${severityColors[r.severity] || ''}`}>
                      {r.severity}
                    </span>
                    <span className="text-sm text-text-primary">{r.risk}</span>
                  </div>
                  {r.mitigation && (
                    <div className="mt-1 text-xs text-text-secondary">Mitigation: {r.mitigation}</div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-card border border-border bg-sidebar/60 p-4">
          <div className="text-sm font-semibold text-text-primary">Follow-ups</div>
          <div className="mt-3 space-y-2">
            {meeting.followUps.length === 0 ? (
              <span className="text-sm text-text-secondary">No follow-ups suggested.</span>
            ) : (
              meeting.followUps.map((f) => (
                <div key={f.id} className="rounded-button border border-border bg-background/50 px-3 py-2">
                  <div className="text-sm text-text-primary">{f.purpose}</div>
                  <div className="mt-1 text-xs text-text-secondary">
                    Attendees: {f.attendees.join(', ') || 'TBD'}
                    {f.suggested_date && ` | Suggested: ${new Date(f.suggested_date).toLocaleDateString()}`}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-card border border-border bg-sidebar/60 p-4">
          <div className="text-sm font-semibold text-text-primary mb-3">Quick Actions</div>
          <div className="space-y-2">
            <button
              onClick={() => copyToClipboard(meeting.summary || '', 'Summary copied')}
              className="w-full rounded-button border border-border px-3 py-2 text-sm text-text-secondary hover:border-primary/50 hover:text-text-primary flex items-center gap-2"
            >
              <ClipboardCopy className="h-4 w-4" /> Copy Summary
            </button>
            <button
              onClick={() => handleDownload('md')}
              className="w-full rounded-button border border-border px-3 py-2 text-sm text-text-secondary hover:border-primary/50 hover:text-text-primary flex items-center gap-2"
            >
              <Download className="h-4 w-4" /> Download Report
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function escapeRegex(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
