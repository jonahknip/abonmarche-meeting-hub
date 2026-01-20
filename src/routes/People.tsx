import { useEffect, useState } from 'react'
import { Loader2, Users } from 'lucide-react'
import { listMeetings, getMeeting } from '../lib/api'
import type { MeetingWithRelations } from '../lib/api'
import { useToast } from '../components/Toast'

interface PersonSummary {
  name: string
  meetingCount: number
  actionItemCount: number
}

export default function People() {
  const { addToast } = useToast()
  const [people, setPeople] = useState<PersonSummary[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function extractPeople() {
      try {
        const { meetings } = await listMeetings(50, 0)

        const peopleMap = new Map<string, { meetings: Set<string>; actionItems: number }>()

        const meetingDetails = await Promise.all(
          meetings.map((m) => getMeeting(m.id).catch(() => null))
        )

        meetingDetails.forEach((detail) => {
          if (!detail?.meeting) return
          const meeting = detail.meeting as MeetingWithRelations

          meeting.actionItems.forEach((item) => {
            if (item.assignee) {
              const existing = peopleMap.get(item.assignee) || { meetings: new Set(), actionItems: 0 }
              existing.meetings.add(meeting.id)
              existing.actionItems += 1
              peopleMap.set(item.assignee, existing)
            }
          })
        })

        const peopleList: PersonSummary[] = Array.from(peopleMap.entries())
          .map(([name, data]) => ({
            name,
            meetingCount: data.meetings.size,
            actionItemCount: data.actionItems,
          }))
          .sort((a, b) => b.actionItemCount - a.actionItemCount)

        setPeople(peopleList)
      } catch (error) {
        console.error('Failed to load people:', error)
        addToast({ type: 'error', title: 'Failed to load people' })
      } finally {
        setLoading(false)
      }
    }
    extractPeople()
  }, [addToast])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="text-sm text-text-secondary">People Directory</div>
        <div className="text-2xl font-semibold text-text-primary">Everyone in your meetings</div>
        <div className="text-sm text-text-secondary">People extracted from meeting action items.</div>
      </div>

      {people.length === 0 ? (
        <div className="rounded-card border border-border bg-sidebar/60 p-6 text-sm text-text-secondary">
          <div className="flex items-center gap-3 mb-3">
            <Users className="h-8 w-8 text-text-secondary" />
            <div>
              <div className="text-text-primary font-semibold">No people found yet</div>
              <div>People will appear here as action items are extracted from your meetings.</div>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid gap-3 tablet:grid-cols-2 desktop:grid-cols-3">
          {people.map((person) => (
            <div key={person.name} className="rounded-card border border-border bg-sidebar/60 p-4">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/20 border border-border grid place-items-center text-primary font-semibold">
                  {person.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1">
                  <div className="text-text-primary font-semibold">{person.name}</div>
                  <div className="mt-2 flex items-center gap-2 text-xs text-text-secondary">
                    <span>{person.meetingCount} meetings</span>
                    <span className="text-border">|</span>
                    <span>{person.actionItemCount} action items</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
