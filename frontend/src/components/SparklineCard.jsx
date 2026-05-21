import { Area, AreaChart, ResponsiveContainer } from 'recharts'
import { Maximize2 } from 'lucide-react'

export default function SparklineCard({
  label,
  value,
  unit,
  data,
  dataKey,
  color = '#22c55e',
  onExpand,
  loading = false,
  compact = false,
}) {
  const hasData = Array.isArray(data) && data.length > 1
  const gradientId = `spark-${dataKey || label.replace(/\s+/g, '-')}`

  const padCls   = compact ? 'px-3 py-2'   : 'px-4 py-3'
  const gapCls   = compact ? 'gap-1'       : 'gap-1.5'
  const valueCls = compact ? 'text-base'   : 'text-xl'
  const chartH   = compact ? 'h-7'         : 'h-10'

  return (
    <button
      type="button"
      onClick={hasData ? onExpand : undefined}
      disabled={!hasData}
      className={`group relative flex h-full w-full flex-col overflow-hidden rounded-2xl border border-ink-700 bg-ink-900/65 text-left backdrop-blur-xl transition-colors hover:border-brand-500/70 disabled:cursor-default disabled:hover:border-ink-700 ${padCls} ${gapCls}`}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-[9px] font-black uppercase tracking-[0.22em] text-slate-400">
          {label}
        </span>
        {hasData ? (
          <Maximize2 size={11} className="text-slate-500 transition-colors group-hover:text-brand-500" />
        ) : null}
      </div>
      <div className="flex items-baseline gap-1">
        <span className={`font-black tabular-nums text-slate-100 ${valueCls}`}>
          {hasData ? value : '—'}
        </span>
        {unit && hasData ? (
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{unit}</span>
        ) : null}
      </div>
      <div className={`-mx-1 mt-auto w-[calc(100%+0.5rem)] ${chartH}`}>
        {hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 2, bottom: 0, left: 0, right: 0 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor={color} stopOpacity={0.55} />
                  <stop offset="100%" stopColor={color} stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey={dataKey}
                stroke={color}
                strokeWidth={1.6}
                fill={`url(#${gradientId})`}
                isAnimationActive={false}
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-[9px] font-bold uppercase tracking-[0.22em] text-slate-600">
            {loading ? 'computing…' : 'no run yet'}
          </div>
        )}
      </div>
    </button>
  )
}
