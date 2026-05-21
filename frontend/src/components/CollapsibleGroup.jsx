import { useEffect, useState } from 'react'
import { ChevronDown } from 'lucide-react'

export default function CollapsibleGroup({
  id,
  title,
  icon: Icon,
  iconClass = 'text-brand-500',
  defaultOpen = true,
  children,
}) {
  const storageKey = id ? `collapsible:${id}` : null
  const [open, setOpen] = useState(() => {
    if (!storageKey || typeof window === 'undefined') return defaultOpen
    const v = window.localStorage.getItem(storageKey)
    return v == null ? defaultOpen : v === '1'
  })

  useEffect(() => {
    if (!storageKey) return
    try {
      window.localStorage.setItem(storageKey, open ? '1' : '0')
    } catch {}
  }, [storageKey, open])

  return (
    <div className="rounded-2xl border border-ink-700/70 bg-ink-850/40">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 rounded-2xl px-3.5 py-2.5 text-left transition-colors hover:bg-ink-800/40"
      >
        <span className="flex items-center gap-2">
          {Icon ? <Icon size={14} className={iconClass} /> : null}
          <span className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-300">
            {title}
          </span>
        </span>
        <ChevronDown
          size={14}
          className={`text-slate-500 transition-transform ${open ? '' : '-rotate-90'}`}
        />
      </button>
      {open ? <div className="space-y-3 px-3.5 pb-3.5 pt-1">{children}</div> : null}
    </div>
  )
}
