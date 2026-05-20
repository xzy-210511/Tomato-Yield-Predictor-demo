export default function MetricChip({
  label,
  value,
  unit,
  icon: Icon,
  align = 'left',
  className = '',
  ...rest
}) {
  const alignCls = align === 'right' ? 'items-end text-right' : 'items-start text-left'

  return (
    <div
      {...rest}
      className={`group flex ${alignCls} flex-col gap-1 rounded-2xl border border-glow/45 bg-ink-900/85 px-4 py-3 backdrop-blur-xl shadow-glow transition-all hover:border-glow hover:shadow-glow-lg ${className}`}
    >
      <div className={`flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.22em] text-glow ${align === 'right' ? 'flex-row-reverse' : ''}`}>
        {Icon ? <Icon size={11} className="text-glow" /> : null}
        <span>{label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-lg font-black tabular-nums text-slate-50 text-glow-soft">
          {value}
        </span>
        {unit ? <span className="text-[10px] font-bold uppercase tracking-widest text-slate-300">{unit}</span> : null}
      </div>
    </div>
  )
}
