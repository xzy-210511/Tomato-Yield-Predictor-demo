export default function WorkflowTab({ value, onChange, options }) {
  return (
    <div className="grid grid-cols-2 gap-1.5 rounded-full border border-ink-700 bg-ink-850/70 p-1">
      {options.map((opt) => {
        const active = opt.value === value
        const Icon = opt.icon
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`flex items-center justify-center gap-1.5 rounded-full px-3 py-2 text-[10px] font-black uppercase tracking-[0.22em] transition-colors ${
              active
                ? 'bg-brand-600 text-white shadow-[0_6px_20px_-6px_rgba(34,197,94,0.5)]'
                : 'text-slate-400 hover:text-slate-100'
            }`}
          >
            {Icon ? <Icon size={11} /> : null}
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
