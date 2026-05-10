import { useMemo, useState } from 'react'
import { Calendar, Droplets, RefreshCcw, Minus } from 'lucide-react'

const ACTION_STYLE = {
  replace: { color: '#ef4444', label: 'Replace', icon: RefreshCcw },
  add: { color: '#0891b2', label: 'Add', icon: Droplets },
  none: { color: '#e2e8f0', label: 'None', icon: Minus },
}

function formatAction(action) {
  return ACTION_STYLE[action] || ACTION_STYLE.none
}

export default function NsScheduleTimeline({ predictions = [] }) {
  const [pinnedDay, setPinnedDay] = useState(null)

  const counts = useMemo(() => {
    const tally = { replace: 0, add: 0, none: 0 }
    for (const p of predictions) {
      const k = ACTION_STYLE[p.ns_action] ? p.ns_action : 'none'
      tally[k] += 1
    }
    return tally
  }, [predictions])

  const pinned = useMemo(() => {
    if (pinnedDay == null) return null
    return predictions.find(p => p.days_after_transplant === pinnedDay) ?? null
  }, [pinnedDay, predictions])

  if (!predictions.length) {
    return (
      <div className="bg-white rounded-[3rem] p-8 border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3 mb-2">
          <Calendar size={22} className="text-brand-600" />
          <h3 className="text-xl font-black">NS Schedule</h3>
        </div>
        <div className="border-2 border-dashed border-slate-100 rounded-[2rem] p-10 text-center text-slate-400 text-sm font-semibold">
          Run the forecast to populate the daily nutrient-solution timeline.
        </div>
      </div>
    )
  }

  const n = predictions.length

  return (
    <div className="bg-white rounded-[3rem] p-8 border border-slate-200 shadow-sm">
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h3 className="text-xl font-black flex items-center gap-3">
            <Calendar size={22} className="text-brand-600" /> NS Schedule
          </h3>
          <p className="text-xs text-slate-500 mt-1 font-semibold">
            Each cell = one day after transplant. Click to pin the recommendation.
          </p>
        </div>
        <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest">
          <span className="px-3 py-1.5 rounded-full bg-red-100 text-red-700">Replace · {counts.replace}</span>
          <span className="px-3 py-1.5 rounded-full bg-cyan-100 text-cyan-700">Add · {counts.add}</span>
          <span className="px-3 py-1.5 rounded-full bg-slate-100 text-slate-600">None · {counts.none}</span>
        </div>
      </div>

      <div className="flex items-center gap-4 text-[11px] font-bold text-slate-500 mb-3">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-red-500" />Replace</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-cyan-600" />Add</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-slate-200" />None</span>
      </div>

      <div className="overflow-x-auto pb-2">
        <div
          className="min-w-full"
          style={{ display: 'grid', gridTemplateColumns: `repeat(${n}, minmax(28px, 1fr))`, gap: 4 }}
        >
          {predictions.map((p, idx) => {
            const style = formatAction(p.ns_action)
            const day = p.days_after_transplant
            const isPinned = pinnedDay === day
            const weekStart = idx > 0 && idx % 7 === 0
            return (
              <button
                key={day}
                title={`Day ${day} — ${style.label}`}
                aria-label={`Day ${day}, action ${style.label}`}
                onClick={() => setPinnedDay(prev => (prev === day ? null : day))}
                className={`h-10 rounded-md transition-all hover:ring-2 hover:ring-brand-500 ${
                  weekStart ? 'border-l-2 border-slate-100 pl-1' : ''
                } ${isPinned ? 'ring-2 ring-slate-900 scale-105' : ''}`}
                style={{ backgroundColor: style.color }}
              />
            )
          })}
        </div>
      </div>

      <div className="mt-6 rounded-[2rem] bg-slate-50 p-6 min-h-[110px]">
        {pinned ? (
          <div className="space-y-2">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Day {pinned.days_after_transplant}
              </span>
              <span
                className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md text-white"
                style={{ backgroundColor: formatAction(pinned.ns_action).color }}
              >
                {formatAction(pinned.ns_action).label}
              </span>
              {pinned.ns_policy && (
                <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md bg-slate-900 text-white">
                  Policy {pinned.ns_policy}
                </span>
              )}
              {Number.isFinite(pinned.ec_limit) && (
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                  EC limit {pinned.ec_limit}
                </span>
              )}
            </div>
            <p className="text-sm font-bold text-slate-900 leading-relaxed">
              {pinned.ns_recommendation || '— no recommendation text —'}
            </p>
            <div className="grid grid-cols-3 gap-3 pt-2">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Fresh NS</p>
                <p className="text-sm font-black text-slate-900">{(pinned.ns_new_per_plant_l ?? 0).toFixed(2)} L</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Added</p>
                <p className="text-sm font-black text-slate-900">{(pinned.ns_added_per_plant_l ?? 0).toFixed(2)} L</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Residual</p>
                <p className="text-sm font-black text-slate-900">{(pinned.ns_residual_per_plant_l ?? 0).toFixed(2)} L</p>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-400 font-semibold">点击某一天查看推荐.</p>
        )}
      </div>
    </div>
  )
}
