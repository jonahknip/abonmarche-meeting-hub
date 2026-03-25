import React, { useState } from 'react'
import { Upload, Calendar, Clock, Users, CheckSquare, ChevronRight, TrendingUp, Trash2, Pencil, Check, X } from 'lucide-react'
import { format } from 'date-fns'

const TYPE_COLORS = {
  'Weekly Scrum':    'bg-blue-50 text-blue-700',
  'One-on-One':      'bg-purple-50 text-purple-700',
  'Technical Review':'bg-amber-50 text-amber-700',
  'All Hands / COP': 'bg-emerald-50 text-emerald-700',
  'Planning':        'bg-indigo-50 text-indigo-700',
  'Uploaded':        'bg-gray-50 text-gray-600',
  'Recorded':        'bg-red-50 text-red-600',
}

export default function Dashboard({ meetings, onSelect, onUpload, onDelete, onRename, searchQuery }) {
  const [filter, setFilter] = useState('all')
  const types = ['all', ...new Set(meetings.map(m => m.type))]
  const filtered = filter === 'all' ? meetings : meetings.filter(m => m.type === filter)
  const openActions = meetings.flatMap(m => (m.action_items||[]).filter(a => !a.done)).length
  const totalDecisions = meetings.reduce((s, m) => s + (m.key_decisions||[]).length, 0)

  return (
    <div className="pt-[52px] min-h-screen bg-[#fbfbfd]">
      <div className="max-w-5xl mx-auto px-5 py-8">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h1 className="text-[32px] font-semibold tracking-[-0.03em] text-gray-900">
              {searchQuery ? `Results for "${searchQuery}"` : 'All Meetings'}
            </h1>
            <p className="text-[15px] text-gray-400 mt-1">
              {filtered.length} meeting{filtered.length !== 1 ? 's' : ''} · {totalDecisions} decisions captured
            </p>
          </div>
          <button onClick={onUpload}
            className="flex items-center gap-2 px-4 py-2 bg-[#003087] text-white text-[13px] font-medium rounded-full hover:bg-[#002070] transition-colors">
            <Upload size={13}/>Upload Meeting
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <StatCard icon={<Calendar size={16}/>} value={meetings.length} label="Total Meetings"/>
          <StatCard icon={<CheckSquare size={16}/>} value={openActions} label="Open Actions" color="text-amber-600"/>
          <StatCard icon={<TrendingUp size={16}/>} value={totalDecisions} label="Decisions Logged" color="text-emerald-600"/>
          <StatCard icon={<Clock size={16}/>} value={`${Math.round(meetings.reduce((s,m)=>s+(m.duration_minutes||0),0)/60)}h`} label="Archived"/>
        </div>

        {!searchQuery && (
          <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1">
            {types.map(t => (
              <button key={t} onClick={() => setFilter(t)}
                className={`px-3.5 py-1.5 rounded-full text-[13px] font-medium whitespace-nowrap transition-all ${
                  filter===t ? 'bg-[#003087] text-white' : 'bg-white border border-black/8 text-gray-600 hover:border-[#003087]/30'}`}>
                {t === 'all' ? 'All types' : t}
              </button>
            ))}
          </div>
        )}

        {filtered.length === 0 ? (
          <EmptyState query={searchQuery} onUpload={onUpload}/>
        ) : (
          <div className="space-y-3">
            {filtered.map((m, i) => (
              <MeetingCard key={m.id} meeting={m} index={i}
                onClick={() => onSelect(m)}
                onDelete={onDelete}
                onRename={onRename}/>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ icon, value, label, color = 'text-[#003087]' }) {
  return (
    <div className="bg-white border border-black/6 rounded-2xl p-4">
      <div className={`mb-2 ${color}`}>{icon}</div>
      <div className={`text-[24px] font-semibold tracking-tight ${color}`}>{value}</div>
      <div className="text-[12px] text-gray-400 mt-0.5">{label}</div>
    </div>
  )
}

function MeetingCard({ meeting: m, onClick, onDelete, onRename, index }) {
  const [editing, setEditing]   = useState(false)
  const [renameVal, setRenameVal] = useState(m.title)
  const [confirmDel, setConfirmDel] = useState(false)
  const typeStyle = TYPE_COLORS[m.type] || 'bg-gray-50 text-gray-600'
  const openCount = (m.action_items||[]).filter(a => !a.done).length

  const saveRename = (e) => {
    e.stopPropagation()
    if (renameVal.trim()) onRename({ ...m, title: renameVal.trim() })
    setEditing(false)
  }

  const cancelRename = (e) => {
    e.stopPropagation()
    setRenameVal(m.title)
    setEditing(false)
  }

  const handleDelete = (e) => {
    e.stopPropagation()
    if (confirmDel) { onDelete(m.id) } else { setConfirmDel(true); setTimeout(() => setConfirmDel(false), 3000) }
  }

  return (
    <div className="relative bg-white border border-black/6 rounded-2xl hover:border-[#003087]/25 hover:shadow-md transition-all group"
      style={{ animationDelay: `${index * 40}ms` }}>

      {/* Action bar — shown on hover */}
      <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        {!editing && (
          <button onClick={e => { e.stopPropagation(); setEditing(true); setRenameVal(m.title) }}
            className="p-1.5 rounded-lg bg-white border border-black/8 text-gray-400 hover:text-[#003087] hover:border-[#003087]/30 transition-colors"
            title="Rename">
            <Pencil size={12}/>
          </button>
        )}
        <button onClick={handleDelete}
          className={`p-1.5 rounded-lg border transition-colors ${
            confirmDel
              ? 'bg-red-500 border-red-500 text-white'
              : 'bg-white border-black/8 text-gray-400 hover:text-red-500 hover:border-red-300'
          }`}
          title={confirmDel ? 'Click again to confirm delete' : 'Delete'}>
          <Trash2 size={12}/>
        </button>
      </div>

      <button onClick={onClick} className="w-full p-5 text-left">
        <div className="flex items-start gap-4">
          <div className="w-12 shrink-0 text-center">
            <div className="text-[11px] text-gray-400 uppercase font-medium">{format(new Date(m.date), 'MMM')}</div>
            <div className="text-[22px] font-semibold text-gray-900 leading-none mt-0.5">{format(new Date(m.date), 'd')}</div>
          </div>

          <div className="flex-1 min-w-0 pr-16">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${typeStyle}`}>{m.type}</span>
              {m.sentiment === 'positive' && <span className="text-[11px] text-emerald-500">● Positive</span>}
              {openCount > 0 && <span className="text-[11px] text-amber-500">{openCount} open</span>}
            </div>

            {/* Inline rename */}
            {editing ? (
              <div className="flex items-center gap-2 mb-2" onClick={e => e.stopPropagation()}>
                <input
                  value={renameVal}
                  onChange={e => setRenameVal(e.target.value)}
                  onKeyDown={e => { if (e.key==='Enter') saveRename(e); if (e.key==='Escape') cancelRename(e) }}
                  autoFocus
                  className="flex-1 text-[15px] font-semibold border-b-2 border-[#003087] outline-none bg-transparent text-gray-900 pb-0.5"
                />
                <button onClick={saveRename} className="p-1 text-emerald-500 hover:text-emerald-600"><Check size={14}/></button>
                <button onClick={cancelRename} className="p-1 text-gray-400 hover:text-gray-600"><X size={14}/></button>
              </div>
            ) : (
              <h3 className="text-[16px] font-semibold text-gray-900 tracking-tight group-hover:text-[#003087] transition-colors mb-1 truncate">
                {m.title}
              </h3>
            )}

            <p className="text-[13px] text-gray-500 line-clamp-2 leading-relaxed mb-3">{m.summary}</p>

            <div className="flex items-center gap-4 text-[12px] text-gray-400 flex-wrap">
              <span className="flex items-center gap-1"><Clock size={11}/>{m.duration_minutes} min</span>
              <span className="flex items-center gap-1"><Users size={11}/>{(m.attendees||[]).length} people</span>
              <span className="flex items-center gap-1"><CheckSquare size={11}/>{(m.key_decisions||[]).length} decisions</span>
              {(m.tags||[]).slice(0,2).map(tag => (
                <span key={tag} className="bg-gray-100 px-2 py-0.5 rounded-full">{tag}</span>
              ))}
            </div>
          </div>
          <ChevronRight size={16} className="text-gray-300 group-hover:text-[#003087] transition-colors shrink-0 mt-1"/>
        </div>
      </button>
    </div>
  )
}

function EmptyState({ query, onUpload }) {
  return (
    <div className="text-center py-20">
      <div className="w-16 h-16 rounded-2xl bg-[#003087]/8 mx-auto flex items-center justify-center mb-4">
        <Calendar size={24} className="text-[#003087]"/>
      </div>
      <h3 className="text-[18px] font-semibold text-gray-900 mb-2">
        {query ? `No results for "${query}"` : 'No meetings yet'}
      </h3>
      <p className="text-[14px] text-gray-400 mb-6">
        {query ? 'Try a different search term' : 'Upload your first meeting to get started'}
      </p>
      {!query && (
        <button onClick={onUpload}
          className="px-5 py-2.5 bg-[#003087] text-white text-[14px] font-medium rounded-full hover:bg-[#002070] transition-colors">
          Upload Meeting
        </button>
      )}
    </div>
  )
}
