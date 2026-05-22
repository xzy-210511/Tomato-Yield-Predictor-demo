import { useEffect, useState } from 'react'
import {
  Activity,
  AlertOctagon,
  Bug,
  CheckCircle2,
  ChevronDown,
  Droplets,
  FlaskConical,
  Gauge,
  HelpCircle,
  Leaf,
  Lightbulb,
  Sparkles,
  Sun,
  Thermometer,
  Wind,
} from 'lucide-react'

const ICON_MAP = {
  Activity, AlertOctagon, Bug, CheckCircle2, Droplets, FlaskConical, Gauge,
  HelpCircle, Leaf, Sun, Thermometer, Wind,
}

// Tailwind JIT-safe literal class lookups by color name.
const COLOR_CLASSES = {
  critical: {
    cardBg: 'bg-red-100/70 border-red-400 ring-2 ring-red-400/40 shadow-md shadow-red-200',
    iconBg: 'bg-red-600',
    badgeBg: 'bg-red-600 text-white',
    chipBg: 'bg-red-600 text-white',
  },
  red: {
    cardBg: 'bg-red-50/40 border-red-100',
    iconBg: 'bg-red-500',
    badgeBg: 'bg-red-100 text-red-700',
    chipBg: 'bg-red-100 text-red-700',
  },
  orange: {
    cardBg: 'bg-orange-50/40 border-orange-100',
    iconBg: 'bg-orange-500',
    badgeBg: 'bg-orange-100 text-orange-700',
    chipBg: 'bg-orange-100 text-orange-700',
  },
  amber: {
    cardBg: 'bg-amber-50/40 border-amber-100',
    iconBg: 'bg-amber-500',
    badgeBg: 'bg-amber-100 text-amber-700',
    chipBg: 'bg-amber-100 text-amber-700',
  },
  blue: {
    cardBg: 'bg-blue-50/40 border-blue-100',
    iconBg: 'bg-blue-500',
    badgeBg: 'bg-blue-100 text-blue-700',
    chipBg: 'bg-blue-100 text-blue-700',
  },
  emerald: {
    cardBg: 'bg-emerald-50/40 border-emerald-100',
    iconBg: 'bg-emerald-500',
    badgeBg: 'bg-emerald-100 text-emerald-700',
    chipBg: 'bg-emerald-100 text-emerald-700',
  },
  slate: {
    cardBg: 'bg-slate-50/60 border-slate-100',
    iconBg: 'bg-slate-500',
    badgeBg: 'bg-slate-100 text-slate-700',
    chipBg: 'bg-slate-100 text-slate-700',
  },
}

const DARK_COLOR_CLASSES = {
  critical: {
    cardBg:  'bg-red-500/15 border-red-500/45 ring-1 ring-red-500/30',
    iconBg:  'bg-red-500/90',
    badgeBg: 'bg-red-500 text-white',
    chipBg:  'bg-red-500/20 text-red-200',
  },
  red: {
    cardBg:  'bg-red-500/10 border-red-500/30',
    iconBg:  'bg-red-500',
    badgeBg: 'bg-red-500/20 text-red-200',
    chipBg:  'bg-red-500/20 text-red-200',
  },
  orange: {
    cardBg:  'bg-orange-500/10 border-orange-500/30',
    iconBg:  'bg-orange-500',
    badgeBg: 'bg-orange-500/20 text-orange-200',
    chipBg:  'bg-orange-500/20 text-orange-200',
  },
  amber: {
    cardBg:  'bg-amber-500/10 border-amber-500/30',
    iconBg:  'bg-amber-500',
    badgeBg: 'bg-amber-500/20 text-amber-200',
    chipBg:  'bg-amber-500/20 text-amber-200',
  },
  blue: {
    cardBg:  'bg-sky-500/10 border-sky-500/30',
    iconBg:  'bg-sky-500',
    badgeBg: 'bg-sky-500/20 text-sky-200',
    chipBg:  'bg-sky-500/20 text-sky-200',
  },
  emerald: {
    cardBg:  'bg-brand-500/10 border-brand-500/30',
    iconBg:  'bg-brand-600',
    badgeBg: 'bg-brand-500/25 text-brand-200',
    chipBg:  'bg-brand-500/20 text-brand-200',
  },
  slate: {
    cardBg:  'bg-ink-850/40 border-ink-700',
    iconBg:  'bg-slate-600',
    badgeBg: 'bg-ink-800 text-slate-300',
    chipBg:  'bg-ink-800 text-slate-300',
  },
}

const SEVERITY_LABEL = { critical: 'Critical', high: 'High', medium: 'Medium', low: 'Low', info: 'Info' }
const SEVERITY_COLOR = { critical: 'critical', high: 'red', medium: 'orange', low: 'amber', info: 'emerald' }
const SEVERITY_ORDER = ['critical', 'high', 'medium', 'low', 'info']

function SeverityBadge({ severity, palette }) {
  const cls = palette[SEVERITY_COLOR[severity]].badgeBg
  return (
    <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${cls}`}>
      {SEVERITY_LABEL[severity]}
    </span>
  )
}

function AdvisorCard({ tip, expanded, onToggle, dark }) {
  const palette = dark ? DARK_COLOR_CLASSES : COLOR_CLASSES
  const colors = palette[tip.color] || palette.slate
  const Icon = ICON_MAP[tip.icon] || HelpCircle
  const titleColor = dark ? 'text-slate-50' : 'text-slate-900'
  const bodyColor  = dark ? 'text-slate-300' : 'text-slate-600'
  const subColor   = dark ? 'text-slate-400' : 'text-slate-400'
  const chevronColor = dark ? 'text-slate-500' : 'text-slate-400'
  const actionBoxBg = dark ? 'bg-ink-950/70 border border-ink-700 text-slate-200' : 'bg-slate-900 text-white'
  return (
    <button
      onClick={onToggle}
      className={`text-left p-5 rounded-3xl border transition-all flex flex-col gap-3 hover:shadow-md ${colors.cardBg}`}
    >
      <div className="flex items-start gap-4">
        <div className={`shrink-0 w-11 h-11 rounded-2xl flex items-center justify-center text-white ${colors.iconBg}`}>
          <Icon size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 mb-1.5">
            <h4 className={`font-black text-sm leading-snug ${titleColor}`}>{tip.title}</h4>
            <SeverityBadge severity={tip.severity} palette={palette} />
          </div>
          <p className={`text-xs leading-relaxed font-semibold ${bodyColor}`}>{tip.summary}</p>
        </div>
        <ChevronDown
          size={18}
          className={`shrink-0 mt-1 transition-transform duration-300 ${chevronColor} ${expanded ? 'rotate-180' : ''}`}
        />
      </div>

      {expanded && (
        <div className="pl-[60px] space-y-3 animate-in slide-in-from-top-2 fade-in duration-200">
          {tip.body && (
            <p className={`text-xs leading-relaxed font-semibold ${bodyColor}`}>{tip.body}</p>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <span className={`text-[10px] font-black uppercase tracking-widest ${subColor}`}>Impact</span>
            <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md ${colors.chipBg}`}>
              {tip.impact}
            </span>
          </div>
          <div className={`rounded-2xl px-4 py-3 flex items-start gap-3 ${actionBoxBg}`}>
            <Sparkles size={14} className="text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs font-bold leading-relaxed">{tip.action}</p>
          </div>
        </div>
      )}
    </button>
  )
}

export default function AdvisorPanel({ suggestions = [], dark = false, embed = false }) {
  const [expandedIds, setExpandedIds] = useState(() =>
    new Set(suggestions.filter(s => s.severity === 'critical').map(s => s.id))
  )

  // Reset expansion when the suggestion set changes (new prediction). All
  // critical tips open by default; the user keeps full toggle control afterwards.
  useEffect(() => {
    setExpandedIds(new Set(suggestions.filter(s => s.severity === 'critical').map(s => s.id)))
  }, [suggestions])

  const toggle = id => {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const counts = suggestions.reduce(
    (acc, s) => ({ ...acc, [s.severity]: (acc[s.severity] || 0) + 1 }),
    { critical: 0, high: 0, medium: 0, low: 0, info: 0 }
  )

  const hasCritical = counts.critical > 0
  const palette = dark ? DARK_COLOR_CLASSES : COLOR_CLASSES

  let wrapperClass
  if (embed) {
    wrapperClass = ''
  } else if (dark) {
    wrapperClass = hasCritical
      ? 'bg-red-500/10 rounded-3xl p-6 border-2 border-red-500/40'
      : 'bg-ink-900/80 rounded-3xl p-6 border border-ink-700 backdrop-blur-xl'
  } else {
    wrapperClass = hasCritical
      ? 'bg-red-50 rounded-[3rem] p-10 border-2 border-red-300 shadow-md shadow-red-100'
      : 'bg-white rounded-[3rem] p-10 border border-slate-200 shadow-sm'
  }

  const headerTitleColor = dark ? 'text-slate-50' : ''
  const headerSubColor   = dark
    ? (hasCritical ? 'text-red-300' : 'text-slate-400')
    : (hasCritical ? 'text-red-700' : 'text-slate-400')
  const emptyClass = dark
    ? 'border-2 border-dashed border-ink-700 rounded-3xl p-10 text-center text-slate-500 text-sm font-semibold'
    : 'border-2 border-dashed border-slate-100 rounded-[2.5rem] p-10 text-center text-slate-400 text-sm font-semibold'

  return (
    <div className={wrapperClass}>
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h3 className={`text-lg font-black flex items-center gap-3 ${headerTitleColor}`}>
            {hasCritical ? (
              <AlertOctagon size={20} className="text-red-500" />
            ) : (
              <>
                <Sparkles size={18} className="text-amber-400" />
                <Lightbulb size={20} className="text-amber-400" />
              </>
            )}
            Advisor
          </h3>
          <p className={`text-[10px] uppercase tracking-widest font-black mt-2 ${headerSubColor}`}>
            {hasCritical
              ? `${counts.critical} critical alert${counts.critical > 1 ? 's' : ''} — review immediately`
              : `Rule engine · ${suggestions.length} signal${suggestions.length === 1 ? '' : 's'}`}
          </p>
        </div>
        <div className="hidden md:flex items-center gap-2 flex-wrap justify-end">
          {SEVERITY_ORDER.filter(level => counts[level] > 0 || level !== 'critical').map(level => {
            const colors = palette[SEVERITY_COLOR[level]]
            return (
              <div
                key={level}
                className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full ${colors.chipBg}`}
              >
                {SEVERITY_LABEL[level]} · {counts[level]}
              </div>
            )
          })}
        </div>
      </div>

      {suggestions.length === 0 ? (
        <div className={emptyClass}>
          Run a simulation to populate suggestions.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {suggestions.map(tip => (
            <AdvisorCard
              key={tip.id}
              tip={tip}
              expanded={expandedIds.has(tip.id)}
              onToggle={() => toggle(tip.id)}
              dark={dark}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export { COLOR_CLASSES, ICON_MAP }
