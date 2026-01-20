import { useMemo, useState } from 'react'
import { KanbanSquare, List } from 'lucide-react'
import { DndContext, PointerSensor, closestCorners, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import dayjs from 'dayjs'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../state/useAppStore'
import type { ActionItem as ActionItemType } from '../lib/types'

const statusColumns: { key: ActionItemType['status']; label: string }[] = [
  { key: 'todo', label: 'To Do' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'done', label: 'Done' },
  { key: 'blocked', label: 'Blocked' },
]

function OwnerAvatar({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
  return <div className="h-7 w-7 rounded-full bg-primary/20 border border-border grid place-items-center text-primary text-xs font-semibold">{initials}</div>
}

function dueBadge(due?: string) {
  if (!due) return { label: 'No due date', className: 'text-text-secondary border-border' }
  const today = dayjs().startOf('day')
  const d = dayjs(due)
  if (d.isBefore(today)) return { label: `Due ${d.format('MMM D')}`, className: 'text-danger border-danger/50' }
  if (d.isSame(today)) return { label: 'Due today', className: 'text-warning border-warning/60' }
  return { label: `Due ${d.format('MMM D')}`, className: 'text-success border-success/50' }
}

function SortableCard({ item, meetingTitle, ownerName, onNavigate }: { item: ActionItemType; meetingTitle: string; ownerName: string; onNavigate: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: item.id })
  const style = { transform: CSS.Transform.toString(transform), transition }
  const badge = dueBadge(item.due)
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="cursor-grab rounded-card border border-border bg-background/60 px-3 py-2 text-sm text-text-primary shadow-sm"
      onClick={onNavigate}
    >
      <div className="font-medium">{item.task}</div>
      <div className="mt-1 flex items-center gap-2 text-[11px] text-text-secondary">
        <OwnerAvatar name={ownerName} />
        <span className={`rounded-button border px-2 py-0.5 text-[11px] ${badge.className}`}>{badge.label}</span>
      </div>
      <div className="mt-1 text-[11px] text-text-secondary">{meetingTitle}</div>
    </div>
  )
}

export default function ActionItems() {
  const navigate = useNavigate()
  const items = useAppStore((s) => s.actionItems)
  const meetings = useAppStore((s) => s.meetings)
  const people = useAppStore((s) => s.people)
  const updateActionItem = useAppStore((s) => s.updateActionItem)
  const view = useAppStore((s) => s.ui.actionItemsView)
  const setView = useAppStore((s) => s.setActionItemsView)

  const meetingTitle = (id: string) => meetings.find((m) => m.id === id)?.title ?? '—'
  const ownerName = (id: string) => people.find((p) => p.id === id)?.name ?? 'Unassigned'

  const [selected, setSelected] = useState<string[]>([])
  const [ownerFilter, setOwnerFilter] = useState('')
  const [meetingFilter, setMeetingFilter] = useState('')

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const filteredItems = useMemo(() => {
    return items.filter((i) => {
      if (ownerFilter && i.ownerId !== ownerFilter) return false
      if (meetingFilter && i.meetingId !== meetingFilter) return false
      return true
    })
  }, [items, ownerFilter, meetingFilter])

  const byStatus = (status: ActionItemType['status']) =>
    filteredItems
      .filter((i) => i.status === status)
      .sort((a, b) => a.order - b.order)

  const handleDragEnd = (event: any) => {
    const { active, over } = event
    if (!over) return
    const activeId = active.id as string
    const overId = over.id as string
    const activeItem = items.find((i) => i.id === activeId)
    if (!activeItem) return

    const targetStatus = overId.endsWith('-column')
      ? (overId.replace('-column', '') as ActionItemType['status'])
      : items.find((i) => i.id === overId)?.status || activeItem.status

    const destList = byStatus(targetStatus)
    const activeList = byStatus(activeItem.status)

    if (targetStatus === activeItem.status) {
      const oldIndex = activeList.findIndex((i) => i.id === activeId)
      const newIndex = overId.endsWith('-column') ? activeList.length - 1 : destList.findIndex((i) => i.id === overId)
      const reordered = arrayMove(activeList, oldIndex, newIndex)
      reordered.forEach((item, idx) => updateActionItem(item.id, { order: idx }))
    } else {
      const newIndex = overId.endsWith('-column') ? destList.length : destList.findIndex((i) => i.id === overId)
      updateActionItem(activeId, { status: targetStatus, order: newIndex })
    }
  }

  const arrayMove = <T,>(arr: T[], from: number, to: number) => {
    const copy = [...arr]
    const [item] = copy.splice(from, 1)
    copy.splice(to, 0, item)
    return copy
  }

  const listView = (
    <div className="rounded-card border border-border bg-sidebar/60">
      <div className="grid grid-cols-6 border-b border-border px-4 py-2 text-xs uppercase tracking-wide text-text-secondary">
        <div className="col-span-2">Task</div>
        <div>Owner</div>
        <div>Due</div>
        <div>Status</div>
        <div className="text-right">Select</div>
      </div>
      <div className="divide-y divide-border">
        {filteredItems.map((item) => {
          const badge = dueBadge(item.due)
          return (
            <div key={item.id} className="grid grid-cols-6 items-center px-4 py-2 text-sm text-text-primary">
              <div className="col-span-2">
                <div className="font-medium">{item.task}</div>
                <div className="text-xs text-text-secondary">{meetingTitle(item.meetingId)}</div>
              </div>
              <div className="text-text-secondary">{ownerName(item.ownerId)}</div>
              <div className={`text-xs ${badge.className}`}>{badge.label}</div>
              <div className="text-text-secondary text-xs">{item.status}</div>
              <div className="text-right">
                <input
                  type="checkbox"
                  checked={selected.includes(item.id)}
                  onChange={(e) =>
                    setSelected((prev) => (e.target.checked ? [...prev, item.id] : prev.filter((id) => id !== item.id)))
                  }
                />
              </div>
            </div>
          )
        })}
        {filteredItems.length === 0 && <div className="px-4 py-4 text-sm text-text-secondary">No items match filters.</div>}
      </div>
      {selected.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-t border-border px-4 py-2 text-sm text-text-secondary">
          <span>{selected.length} selected</span>
          <button
            className="rounded-button border border-border px-2 py-1 text-xs hover:border-primary/50"
            onClick={() => {
              selected.forEach((id) => updateActionItem(id, { status: 'done' }))
              setSelected([])
            }}
          >
            Mark complete
          </button>
          <select
            className="rounded-button border border-border bg-background px-2 py-1 text-xs text-text-primary"
            onChange={(e) => {
              const owner = e.target.value
              selected.forEach((id) => updateActionItem(id, { ownerId: owner }))
              setSelected([])
            }}
          >
            <option value="">Change owner</option>
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  )

  const kanbanView = (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
      <div className="grid gap-3 tablet:grid-cols-2 desktop:grid-cols-4">
        {statusColumns.map((col) => {
          const itemsForColumn = byStatus(col.key)
          return (
            <div key={col.key} className="rounded-card border border-border bg-sidebar/60 p-3">
              <div className="mb-2 flex items-center justify-between text-sm font-semibold text-text-primary">
                {col.label}
                <span className="text-xs text-text-secondary">{itemsForColumn.length}</span>
              </div>
              <SortableContext items={itemsForColumn.map((i) => i.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2" id={`${col.key}-column`}>
                  {itemsForColumn.map((item) => (
                    <SortableCard
                      key={item.id}
                      item={item}
                      meetingTitle={meetingTitle(item.meetingId)}
                      ownerName={ownerName(item.ownerId)}
                      onNavigate={() => navigate(`/meetings/${item.meetingId}`)}
                    />
                  ))}
                  {itemsForColumn.length === 0 && <div className="rounded-button border border-border bg-background/60 px-2 py-4 text-center text-xs text-text-secondary">No items</div>}
                </div>
              </SortableContext>
            </div>
          )
        })}
      </div>
    </DndContext>
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 tablet:flex-row tablet:items-center tablet:justify-between">
        <div>
          <div className="text-sm text-text-secondary">Action Items</div>
          <div className="text-2xl font-semibold text-text-primary">List & Kanban</div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="rounded-button border border-border bg-background px-2 py-1 text-xs text-text-secondary">Filter:</div>
          <select
            className="rounded-button border border-border bg-background px-2 py-1 text-xs text-text-primary"
            value={ownerFilter}
            onChange={(e) => setOwnerFilter(e.target.value)}
          >
            <option value="">All owners</option>
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <select
            className="rounded-button border border-border bg-background px-2 py-1 text-xs text-text-primary"
            value={meetingFilter}
            onChange={(e) => setMeetingFilter(e.target.value)}
          >
            <option value="">All meetings</option>
            {meetings.map((m) => (
              <option key={m.id} value={m.id}>
                {m.title}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-1 rounded-button border border-border bg-background px-1 py-1 text-xs text-text-secondary">
            <button
              className={`flex items-center gap-1 rounded-button px-2 py-1 ${view === 'list' ? 'bg-primary/20 text-text-primary' : ''}`}
              onClick={() => setView('list')}
            >
              <List className="h-3.5 w-3.5" /> List
            </button>
            <button
              className={`flex items-center gap-1 rounded-button px-2 py-1 ${view === 'kanban' ? 'bg-primary/20 text-text-primary' : ''}`}
              onClick={() => setView('kanban')}
            >
              <KanbanSquare className="h-3.5 w-3.5" /> Kanban
            </button>
          </div>
        </div>
      </div>

      {view === 'list' ? listView : kanbanView}
    </div>
  )
}
