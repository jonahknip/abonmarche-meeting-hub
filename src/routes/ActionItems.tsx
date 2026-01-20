import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckSquare, Loader2 } from 'lucide-react'
import { listMeetings, getMeeting } from '../lib/api'
import type { ActionItem, MeetingWithRelations } from '../lib/api'
import { useToast } from '../components/Toast'

interface ActionItemWithMeeting extends ActionItem {
  meetingTitle: string
}

export default function ActionItems() {
  const { addToast } = useToast()
  const [items, setItems] = useState<ActionItemWithMeeting[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchAllActionItems() {
      try {
        const { meetings } = await listMeetings(50, 0)

        const meetingDetails = await Promise.all(
          meetings.map((m) => getMeeting(m.id).catch(() => null))
        )

        const allItems: ActionItemWithMeeting[] = []
        meetingDetails.forEach((detail) => {
          if (detail?.meeting) {
            const meeting = detail.meeting as MeetingWithRelations
            meeting.actionItems.forEach((item) => {
              allItems.push({
                ...item,
                meetingTitle: meeting.title,
              })
            })
          }
        })

        setItems(allItems)
      } catch (error) {
        console.error('Failed to load action items:', error)
        addToast({ type: 'error', title: 'Failed to load action items' })
      } finally {
        setLoading(false)
      }
    }
    fetchAllActionItems()
  }, [addToast])



  const priorityColors: Record<string, string> = {
    high: 'border-danger/50 bg-danger/10 text-danger',
    medium: 'border-warning/50 bg-warning/10 text-warning',
    low: 'border-text-secondary/50 bg-text-secondary/10 text-text-secondary',
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const groupedByStatus = {
    todo: items.filter((i) => i.status === 'todo'),
    'in-progress': items.filter((i) => i.status === 'in-progress'),
    done: items.filter((i) => i.status === 'done'),
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="text-sm text-text-secondary">Action Items</div>
        <div className="text-2xl font-semibold text-text-primary">All Tasks</div>
      </div>

      <div className="grid gap-4 tablet:grid-cols-3">
        {Object.entries(groupedByStatus).map(([status, statusItems]) => (
          <div key={status} className="rounded-card border border-border bg-sidebar/60 p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <CheckSquare className="h-4 w-4 text-text-secondary" />
                <span className="font-semibold text-text-primary capitalize">{status.replace('-', ' ')}</span>
              </div>
              <span className="text-xs text-text-secondary">{statusItems.length}</span>
            </div>

            <div className="space-y-3">
              {statusItems.length === 0 && (
                <div className="text-sm text-text-secondary text-center py-4">No items</div>
              )}
              {statusItems.map((item) => (
                <Link
                  key={item.id}
                  to={`/meetings/${item.meeting_id}`}
                  className="block rounded-button border border-border bg-background/60 px-3 py-2 hover:border-primary/40"
                >
                  <div className="text-sm text-text-primary font-medium">{item.task}</div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                    <span className={`rounded-button border px-2 py-0.5 ${priorityColors[item.priority] || ''}`}>
                      {item.priority}
                    </span>
                    {item.assignee && (
                      <span className="text-text-secondary">{item.assignee}</span>
                    )}
                    {item.due_date && (
                      <span className="text-text-secondary">
                        Due: {new Date(item.due_date).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <div className="mt-1 text-xs text-text-secondary truncate">
                    From: {item.meetingTitle}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-card border border-border bg-sidebar/60 p-4">
        <div className="text-sm font-semibold text-text-primary mb-4">Summary</div>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-semibold text-warning">{groupedByStatus.todo.length}</div>
            <div className="text-xs text-text-secondary">To Do</div>
          </div>
          <div>
            <div className="text-2xl font-semibold text-primary">{groupedByStatus['in-progress'].length}</div>
            <div className="text-xs text-text-secondary">In Progress</div>
          </div>
          <div>
            <div className="text-2xl font-semibold text-success">{groupedByStatus.done.length}</div>
            <div className="text-xs text-text-secondary">Done</div>
          </div>
        </div>
      </div>
    </div>
  )
}
