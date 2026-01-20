import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import * as Tabs from '@radix-ui/react-tabs'
import { ArrowLeft, ClipboardCopy, Loader2, MoreVertical, RefreshCw, Share, Wand2 } from 'lucide-react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { analyzeMeeting } from '../lib/claude'
import type { Meeting } from '../lib/types'
import { useAppStore } from '../state/useAppStore'
import { useToast } from '../components/Toast'

const sentimentMap: Record<Meeting['sentiment'], { label: string; emoji: string }> = {
  productive: { label: 'Productive', emoji: '😊' },
  neutral: { label: 'Neutral', emoji: '😐' },
  tense: { label: 'Tense', emoji: '😟' },
}

export default function MeetingDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { addToast } = useToast()
  const meeting = useAppStore((s) => s.meetings.find((m) => m.id === id))
  const channels = useAppStore((s) => s.channels)
  const people = useAppStore((s) => s.people)
  const actionItems = useAppStore((s) => s.actionItems.filter((a) => a.meetingId === id))
  const updateMeeting = useAppStore((s) => s.updateMeeting)
  const deleteMeeting = useAppStore((s) => s.deleteMeeting)
  const updateActionItem = useAppStore((s) => s.updateActionItem)
  const addActionItem = useAppStore((s) => s.addActionItem)

  const [editingTitle, setEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState(meeting?.title ?? '')
  const [searchTerm, setSearchTerm] = useState('')
  const [followUpDraft, setFollowUpDraft] = useState(meeting?.followUpDraft ?? '')
  const [reanalyzing, setReanalyzing] = useState(false)

  const channelName = useMemo(
    () => channels.find((c) => c.id === meeting?.channelId)?.name ?? 'Unknown',
    [channels, meeting?.channelId],
  )

  const relatedMeetings = useMemo(() => {
    if (!meeting) return []
    const participantSet = new Set(meeting.participants)
    const topicSet = new Set(meeting.topics)
    return useAppStore.getState().meetings
      .filter((m) => m.id !== meeting.id)
      .map((m) => {
        const scoreChannel = m.channelId === meeting.channelId ? 1 : 0
        const sharedParticipants = m.participants.filter((p) => participantSet.has(p)).length
        const sharedTopics = m.topics.filter((t) => topicSet.has(t)).length
        const score = scoreChannel + sharedParticipants * 0.5 + sharedTopics * 0.5
        return { m, score }
      })
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 4)
  }, [meeting])

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

  const sentiment = sentimentMap[meeting.sentiment]

  const copyFollowUp = async () => {
    await navigator.clipboard.writeText(followUpDraft || meeting.followUpDraft)
    addToast({ type: 'success', title: 'Copied to clipboard' })
  }

  const exportMarkdown = async () => {
    const md = `# ${meeting.title}\n\n- Date: ${new Date(meeting.date).toLocaleString()}\n- Channel: ${channelName}\n- Type: ${meeting.type}\n- Sentiment: ${sentiment.label}\n\n## Summary\n${meeting.summary}\n\n## Key Decisions\n${meeting.keyDecisions.map((d) => `- ${d}`).join('\n') || '- None'}\n\n## Action Items\n${actionItems
      .map((a) => `- [${a.status === 'done' ? 'x' : ' '}] ${a.task} (Owner: ${people.find((p) => p.id === a.ownerId)?.name || 'Unassigned'})`)
      .join('\n') || '- None'}\n`
    await navigator.clipboard.writeText(md)
    addToast({ type: 'success', title: 'Exported markdown to clipboard' })
  }

  const handleDelete = () => {
    if (!confirm('Delete this meeting? This cannot be undone.')) return
    deleteMeeting(meeting.id)
    addToast({ type: 'success', title: 'Meeting deleted' })
    navigate('/meetings')
  }

  const handleReanalyze = async () => {
    if (!confirm('This will replace the current analysis. Proceed?')) return
    setReanalyzing(true)
    try {
      const result = await analyzeMeeting(meeting.transcript, {
        title: meeting.title,
        date: meeting.date,
        channelId: meeting.channelId,
        type: meeting.type,
        participants: meeting.participants,
      })

      const newActionIds: string[] = []
      result.actionItems.forEach((ai, idx) => {
        const ownerId = ai.ownerId || meeting.participants[idx % Math.max(meeting.participants.length, 1)] || ''
        const id = addActionItem({
          meetingId: meeting.id,
          task: ai.task,
          ownerId,
          status: ai.status || 'todo',
          due: ai.due,
          order: idx,
        })
        newActionIds.push(id)
      })

      updateMeeting(meeting.id, {
        summary: result.summary,
        keyDecisions: result.keyDecisions,
        topics: result.topics,
        sentiment: result.sentiment,
        followUpDraft: result.followUpDraft,
        insights: result.insights,
        riskFlags: result.riskFlags,
        actionItemIds: newActionIds,
      })

      addToast({ type: 'success', title: 'Reanalysis complete', description: `Found ${newActionIds.length} action items` })
    } catch (err: any) {
      addToast({ type: 'error', title: 'Analysis failed', description: err?.message })
    } finally {
      setReanalyzing(false)
    }
  }

  const filteredTranscript = useMemo(() => {
    if (!searchTerm.trim()) return meeting.transcript
    const regex = new RegExp(`(${escapeRegex(searchTerm)})`, 'gi')
    return meeting.transcript.replace(regex, '<<$1>>')
  }, [meeting.transcript, searchTerm])

  const highlightedTranscript = filteredTranscript.split('<<').flatMap((chunk, idx) => {
    if (idx === 0) return [chunk]
    const [match, ...rest] = chunk.split('>>')
    return [<mark key={`m-${idx}`} className="bg-primary/30 text-text-primary">{match}</mark>, rest.join('>>')]
  })

  return (
    <div className="flex flex-col gap-4 desktop:flex-row">
      <div className="desktop:w-3/5 space-y-4">
        <div className="rounded-card border border-border bg-sidebar/60 p-4 shadow-panel">
          <div className="mb-2 text-sm text-text-secondary">Meetings &gt; {meeting.title}</div>
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
                    onClick={() => {
                      updateMeeting(meeting.id, { title: titleDraft })
                      setEditingTitle(false)
                    }}
                  >
                    Save
                  </button>
                </div>
              ) : (
                <div className="text-2xl font-semibold text-text-primary" onClick={() => setEditingTitle(true)}>
                  {meeting.title}
                </div>
              )}

              <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-text-secondary">
                <span>{new Date(meeting.date).toLocaleString()}</span>
                <span className="rounded-button border border-border bg-background px-2 py-1 text-xs text-primary">{channelName}</span>
                <span className="rounded-button border border-border bg-background px-2 py-1 text-xs text-text-secondary">{meeting.type}</span>
                <span className="rounded-button border border-border bg-background px-2 py-1 text-xs text-text-secondary flex items-center gap-1">
                  {sentiment.emoji} {sentiment.label}
                </span>
              </div>
              <div className="mt-2 flex items-center gap-2">
                {meeting.participants.slice(0, 5).map((pId) => {
                  const person = people.find((p) => p.id === pId)
                  const initials = person ? person.name.split(' ').map((n) => n[0]).join('').slice(0, 2) : '??'
                  return (
                    <div key={pId} className="h-8 w-8 rounded-full bg-primary/20 border border-border grid place-items-center text-primary text-sm font-semibold">
                      {initials}
                    </div>
                  )
                })}
                {meeting.participants.length > 5 && (
                  <div className="h-8 w-8 rounded-full border border-border bg-background text-text-secondary grid place-items-center text-xs">
                    +{meeting.participants.length - 5}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleReanalyze}
                className="rounded-button border border-border px-3 py-2 text-sm text-text-primary hover:border-primary/50"
                disabled={reanalyzing}
              >
                {reanalyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Reanalyze
              </button>
              <button className="rounded-button border border-border px-3 py-2 text-sm text-text-secondary hover:border-primary/50">
                <Share className="h-4 w-4" />
              </button>
              <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                  <button className="rounded-button border border-border px-3 py-2 text-sm text-text-secondary hover:border-primary/50">
                    <MoreVertical className="h-4 w-4" />
                  </button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Portal>
                  <DropdownMenu.Content className="rounded-card border border-border bg-sidebar/90 p-2 text-sm text-text-primary shadow-lg">
                    <DropdownMenu.Item className="cursor-pointer rounded-button px-2 py-1 hover:bg-white/5" onSelect={() => addToast({ type: 'info', title: 'Export as PDF coming soon' })}>
                      Export as PDF
                    </DropdownMenu.Item>
                    <DropdownMenu.Item className="cursor-pointer rounded-button px-2 py-1 hover:bg-white/5" onSelect={exportMarkdown}>
                      Export as Markdown
                    </DropdownMenu.Item>
                    <DropdownMenu.Separator className="my-1 h-px bg-border" />
                    <DropdownMenu.Item className="cursor-pointer rounded-button px-2 py-1 text-danger hover:bg-danger/10" onSelect={handleDelete}>
                      Delete meeting
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
            <Tabs.Trigger value="followup" className="rounded-button px-3 py-1 data-[state=active]:bg-primary/20 data-[state=active]:text-text-primary">Follow-up</Tabs.Trigger>
          </Tabs.List>

          <Tabs.Content value="summary" className="space-y-4">
            <div className="rounded-card border-l-4 border-primary bg-primary/10 p-4 text-text-primary">
              {meeting.summary || 'No summary yet.'}
            </div>
            <div>
              <div className="text-sm font-semibold text-text-primary">Key Decisions</div>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-text-secondary">
                {meeting.keyDecisions.map((d, idx) => (
                  <li key={idx}>{d}</li>
                ))}
                {meeting.keyDecisions.length === 0 && <li className="list-none text-text-secondary">No decisions captured.</li>}
              </ul>
            </div>
            <div className="space-y-2">
              <div className="text-sm font-semibold text-text-primary">Discussion Topics</div>
              <div className="flex flex-wrap gap-2">
                {meeting.topics.map((t) => (
                  <span key={t} className="rounded-button border border-border bg-background px-2 py-1 text-xs text-text-secondary">
                    {t}
                  </span>
                ))}
                {meeting.topics.length === 0 && <span className="text-sm text-text-secondary">No topics captured.</span>}
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-text-secondary">
              <span>{sentiment.emoji}</span>
              <span>{sentiment.label}</span>
            </div>
          </Tabs.Content>

          <Tabs.Content value="transcript" className="space-y-3">
            <div className="flex items-center gap-2">
              <input
                className="w-64 rounded-button border border-border bg-background px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary/60"
                placeholder="Search transcript"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <span className="text-xs text-text-secondary">Highlights matches</span>
            </div>
            <div className="rounded-card border border-border bg-background/60 p-3 text-sm leading-relaxed text-text-primary">
              {highlightedTranscript}
            </div>
          </Tabs.Content>

          <Tabs.Content value="actions" className="space-y-3">
            <div className="space-y-2">
              {actionItems.map((item) => (
                <div key={item.id} className="flex flex-wrap items-center gap-3 rounded-card border border-border bg-background/60 px-3 py-2 text-sm">
                  <input
                    type="checkbox"
                    checked={item.status === 'done'}
                    onChange={(e) => updateActionItem(item.id, { status: e.target.checked ? 'done' : 'todo' })}
                  />
                  <div className="flex-1 text-text-primary">{item.task}</div>
                  <select
                    className="rounded-button border border-border bg-background px-2 py-1 text-xs text-text-primary"
                    value={item.ownerId}
                    onChange={(e) => updateActionItem(item.id, { ownerId: e.target.value })}
                  >
                    <option value="">Unassigned</option>
                    {people.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="date"
                    className="rounded-button border border-border bg-background px-2 py-1 text-xs text-text-primary"
                    value={item.due?.slice(0, 10) || ''}
                    onChange={(e) => updateActionItem(item.id, { due: e.target.value })}
                  />
                  <span className="rounded-button border border-border bg-background px-2 py-1 text-[11px] text-text-secondary">Priority: Normal</span>
                </div>
              ))}
              {actionItems.length === 0 && <div className="text-sm text-text-secondary">No action items.</div>}
            </div>
            <button
              className="rounded-button border border-border px-3 py-2 text-sm text-text-primary hover:border-primary/50"
              onClick={() => {
                const id = addActionItem({
                  meetingId: meeting.id,
                  task: 'New action item',
                  ownerId: meeting.participants[0] ?? '',
                  status: 'todo',
                  order: actionItems.length,
                })
                updateMeeting(meeting.id, { actionItemIds: [...meeting.actionItemIds, id] })
              }}
            >
              Add action item
            </button>
          </Tabs.Content>

          <Tabs.Content value="followup" className="space-y-3">
            <textarea
              className="h-48 w-full rounded-card border border-border bg-background/60 p-3 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary/60"
              value={followUpDraft}
              onChange={(e) => setFollowUpDraft(e.target.value)}
            />
            <div className="flex items-center gap-2">
              <button
                className="rounded-button border border-border px-3 py-2 text-sm text-text-primary hover:border-primary/50"
                onClick={copyFollowUp}
              >
                <ClipboardCopy className="mr-2 inline h-4 w-4" /> Copy
              </button>
              <button
                className="rounded-button border border-border px-3 py-2 text-sm text-text-primary hover:border-primary/50"
                onClick={async () => {
                  try {
                    const result = await analyzeMeeting(meeting.transcript, {
                      title: meeting.title,
                      date: meeting.date,
                      channelId: meeting.channelId,
                      type: meeting.type,
                      participants: meeting.participants,
                    })
                    setFollowUpDraft(result.followUpDraft)
                    addToast({ type: 'success', title: 'Follow-up regenerated' })
                  } catch (err: any) {
                    addToast({ type: 'error', title: 'Regenerate failed', description: err?.message })
                  }
                }}
              >
                <Wand2 className="mr-2 inline h-4 w-4" /> Regenerate
              </button>
            </div>
          </Tabs.Content>
        </Tabs.Root>
      </div>

      <div className="desktop:w-2/5 space-y-4">
        <div className="rounded-card border border-border bg-sidebar/60 p-4">
          <div className="text-sm font-semibold text-text-primary">Meeting Intelligence</div>
          <div className="mt-2 text-sm text-text-secondary">
            <div className="font-semibold text-text-primary">Insights</div>
            <ul className="mt-1 space-y-1">
              {meeting.insights.length ? meeting.insights.map((i, idx) => <li key={idx}>• {i}</li>) : <li className="text-text-secondary">None</li>}
            </ul>
            <div className="mt-3 font-semibold text-text-primary">Risk Flags</div>
            <div className="mt-1 flex flex-wrap gap-2">
              {meeting.riskFlags.length ? meeting.riskFlags.map((r) => (
                <span key={r} className="rounded-button border border-warning/50 bg-warning/10 px-2 py-1 text-xs text-warning">{r}</span>
              )) : <span className="text-text-secondary text-sm">None</span>}
            </div>
            <div className="mt-3 font-semibold text-text-primary">Topics</div>
            <div className="mt-1 flex flex-wrap gap-2">
              {meeting.topics.length ? meeting.topics.map((t) => (
                <span key={t} className="rounded-button border border-border bg-background px-2 py-1 text-xs text-text-secondary">{t}</span>
              )) : <span className="text-text-secondary text-sm">None</span>}
            </div>
          </div>
        </div>

        <div className="rounded-card border border-border bg-sidebar/60 p-4">
          <div className="text-sm font-semibold text-text-primary">Related Meetings</div>
          <div className="mt-2 space-y-2 text-sm text-text-secondary">
            {relatedMeetings.length ? (
              relatedMeetings.map(({ m }) => (
                <button
                  key={m.id}
                  onClick={() => navigate(`/meetings/${m.id}`)}
                  className="w-full rounded-button border border-border bg-background px-3 py-2 text-left hover:border-primary/50"
                >
                  <div className="text-text-primary font-semibold">{m.title}</div>
                  <div className="text-xs text-text-secondary">{new Date(m.date).toLocaleDateString()} • {channels.find((c) => c.id === m.channelId)?.name ?? m.channelId}</div>
                </button>
              ))
            ) : (
              'None yet.'
            )}
          </div>
        </div>

        <div className="rounded-card border border-border bg-sidebar/60 p-4 space-y-3">
          <div className="text-sm font-semibold text-text-primary">Comments</div>
          <div className="space-y-2 text-sm text-text-secondary">Threaded replies coming soon.</div>
          <textarea className="w-full rounded-card border border-border bg-background px-3 py-2 text-sm text-text-primary" placeholder="Add a comment" />
          <button className="self-end rounded-button border border-border px-3 py-2 text-sm text-text-primary hover:border-primary/50">Post</button>
        </div>
      </div>
    </div>
  )
}

function escapeRegex(str: string) {
  return str.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')
}
