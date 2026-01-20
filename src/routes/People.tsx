import { Mail, User } from 'lucide-react'
import { useAppStore } from '../state/useAppStore'

export default function People() {
  const people = useAppStore((s) => s.people)
  const meetings = useAppStore((s) => s.meetings)
  const actionItems = useAppStore((s) => s.actionItems)

  const meetingsForPerson = (id: string) => meetings.filter((m) => m.participants.includes(id)).length
  const itemsForPerson = (id: string) => actionItems.filter((a) => a.ownerId === id).length

  return (
    <div className="space-y-4">
      <div>
        <div className="text-sm text-text-secondary">People Directory</div>
        <div className="text-2xl font-semibold text-text-primary">Everyone in your meetings</div>
      </div>

      <div className="grid gap-3 tablet:grid-cols-2 desktop:grid-cols-3">
        {people.map((person) => (
          <div key={person.id} className="rounded-card border border-border bg-sidebar/60 p-4">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/20 border border-border grid place-items-center text-primary font-semibold">
                {person.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1">
                <div className="text-text-primary font-semibold">{person.name}</div>
                <div className="text-sm text-text-secondary">{person.role}</div>
                <div className="mt-2 flex items-center gap-2 text-xs text-text-secondary">
                  <User className="h-3 w-3" /> {meetingsForPerson(person.id)} meetings
                  <span className="text-border">•</span>
                  <Mail className="h-3 w-3" /> {itemsForPerson(person.id)} action items
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
