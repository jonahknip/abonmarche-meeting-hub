import React, { useState } from 'react'
import { ArrowLeft, CheckSquare, Square, Target, Calendar, TrendingUp } from 'lucide-react'
import { WEEK_ONE_PLAN } from '../lib/seedData.js'

export default function WeekPlan({ onBack }) {
  const [plan, setPlan] = useState(WEEK_ONE_PLAN)

  const toggleTask = (dayIdx, taskIdx) => {
    setPlan(prev => ({
      ...prev,
      daily: prev.daily.map((d, di) =>
        di !== dayIdx ? d : {
          ...d,
          tasks: d.tasks.map((t, ti) => ti !== taskIdx ? t : { ...t, done: !t.done })
        }
      )
    }))
  }

  const totalTasks  = plan.daily.flatMap(d => d.tasks).length
  const doneTasks   = plan.daily.flatMap(d => d.tasks).filter(t => t.done).length
  const pct         = Math.round((doneTasks / totalTasks) * 100)

  const priorityColors = { high: 'text-red-400', medium: 'text-amber-400', low: 'text-gray-300' }

  return (
    <div className="pt-[52px] min-h-screen bg-[#fbfbfd]">
      <div className="max-w-4xl mx-auto px-5 py-8">

        {/* Header */}
        <div className="mb-8">
          <div className="text-[12px] text-gray-400 font-medium mb-2">Week of {plan.week}</div>
          <h1 className="text-[32px] font-semibold tracking-[-0.03em] text-gray-900 mb-1">Week One Plan</h1>
          <p className="text-[16px] text-gradient font-medium">{plan.theme}</p>

          {/* Progress */}
          <div className="mt-4 flex items-center gap-3">
            <div className="flex-1 bg-gray-100 rounded-full h-2">
              <div
                className="bg-[#003087] h-2 rounded-full transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-[13px] font-medium text-[#003087]">{doneTasks}/{totalTasks} done</span>
          </div>
        </div>

        {/* Goals */}
        <div className="bg-white border border-black/6 rounded-2xl p-5 mb-5">
          <div className="flex items-center gap-2 mb-4">
            <Target size={16} className="text-[#003087]" />
            <span className="text-[13px] font-semibold text-gray-900">Week Goals</span>
          </div>
          <div className="space-y-2.5">
            {plan.goals.map((g, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[#003087]/10 text-[#003087] text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">{i+1}</span>
                <span className="text-[14px] text-gray-700 leading-relaxed">{g}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Daily plan */}
        <div className="space-y-3">
          {plan.daily.map((day, di) => (
            <div key={di} className="bg-white border border-black/6 rounded-2xl overflow-hidden">
              <div className="flex items-center gap-3 px-5 py-3 border-b border-black/5">
                <Calendar size={14} className="text-[#003087]" />
                <span className="text-[14px] font-semibold text-gray-900">{day.day}</span>
                <span className="ml-auto text-[12px] text-gray-400">
                  {day.tasks.filter(t => t.done).length}/{day.tasks.length}
                </span>
              </div>
              <div className="p-4 space-y-2.5">
                {day.tasks.map((task, ti) => (
                  <button
                    key={ti}
                    onClick={() => toggleTask(di, ti)}
                    className="w-full flex items-center gap-3 text-left group"
                  >
                    <span className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                      task.done ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300 group-hover:border-[#003087]'
                    }`}>
                      {task.done && <span className="text-white text-[9px]">✓</span>}
                    </span>
                    <span className={`flex-1 text-[14px] leading-relaxed transition-colors ${
                      task.done ? 'line-through text-gray-400' : 'text-gray-700'
                    }`}>
                      {task.text}
                    </span>
                    <span className={`text-[10px] font-semibold uppercase tracking-wide ${priorityColors[task.priority]}`}>
                      {task.priority}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
