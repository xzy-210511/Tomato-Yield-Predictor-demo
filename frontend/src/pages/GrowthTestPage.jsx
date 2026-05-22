import { useEffect, useMemo, useState } from 'react'
import {
  Activity,
  AlertCircle,
  Droplets,
  FlaskConical,
  HelpCircle,
  Leaf,
  RefreshCw,
  RotateCcw,
  Sprout,
  Thermometer,
  TrendingUp,
  Wind,
  X,
  ChevronRight,
} from 'lucide-react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { predictTimeSeries } from '../api/predict'
import TomatoCanvas from '../components/TomatoCanvas.jsx'
import TopNav from '../components/TopNav.jsx'
import CollapsibleGroup from '../components/CollapsibleGroup.jsx'
import SparklineCard from '../components/SparklineCard.jsx'
import AdvisorPanel from '../components/AdvisorPanel'
import { analyzeTimeSeriesInput } from '../lib/timeSeriesAdvisor'
import {
  buildTimeSeriesCandidates,
  buildTimeSeriesComparison,
  mapTimeSeriesPredictions,
  summarizeTrajectory as summarizeTimeSeriesCandidate,
} from '../lib/findbest'
import {
  EC_OPTIONS,
  FIELD_INFO_TS,
  INITIAL_TS_FORM,
  LIGHT_OPTIONS,
  TS_GROUPS,
} from '../lib/tsConfig'

const GROUP_ICON_MAP = {
  Forecast: Thermometer,
  Locked: Wind,
}

function GrowthTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-2xl border border-ink-700 bg-ink-900/95 px-4 py-3 text-white shadow-2xl backdrop-blur-md min-w-[180px]">
      <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
        Day {label} · DAT
      </p>
      {payload.map(item => (
        <div key={item.dataKey} className="flex items-center gap-3 py-0.5 text-xs font-bold">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: item.color }} />
          <span className="mr-auto text-slate-300">{item.name}</span>
          <span className="font-black tabular-nums">{Number(item.value).toFixed(2)}</span>
        </div>
      ))}
    </div>
  )
}

function NsTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const point = payload[0].payload
  return (
    <div className="max-w-[260px] rounded-2xl border border-ink-700 bg-ink-900/95 px-4 py-3 text-white shadow-2xl backdrop-blur-md">
      <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
        Day {label} · DAT
      </p>
      <p className="text-sm font-black tabular-nums">
        {point.actionVolume > 0 ? `${point.actionVolume.toFixed(2)} L/plant` : 'No action'}
      </p>
      {point.nsRecommendation ? (
        <p className="mt-1 text-[11px] font-semibold leading-relaxed text-slate-300">
          {point.nsRecommendation}
        </p>
      ) : null}
    </div>
  )
}

function FieldRow({ field, value, onChange }) {
  const info = FIELD_INFO_TS[field.key]
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <label className="truncate text-[10px] font-bold uppercase tracking-wider text-slate-400">
            {field.label}
          </label>
          {info ? (
            <div className="group/tip relative cursor-help">
              <HelpCircle size={11} className="text-slate-600 transition-colors group-hover/tip:text-brand-400" />
              <div className="pointer-events-none absolute bottom-full left-0 z-50 mb-1.5 w-48 rounded-xl border border-ink-700 bg-ink-900/95 p-2.5 text-[10px] font-medium leading-relaxed text-slate-300 opacity-0 shadow-2xl backdrop-blur-md transition-opacity group-hover/tip:opacity-100">
                {info}
              </div>
            </div>
          ) : null}
        </div>
        <input
          type="number"
          step={field.step}
          value={value}
          onChange={(e) => onChange(field.key, e.target.value)}
          className="w-20 bg-transparent text-right text-xs font-black text-brand-400 outline-none"
        />
      </div>
      <input
        type="range"
        min={field.min}
        max={field.max}
        step={field.step}
        value={value}
        onChange={(e) => onChange(field.key, e.target.value)}
        className="h-1 w-full cursor-pointer appearance-none rounded-full bg-ink-700 accent-brand-500"
      />
    </div>
  )
}

function GrowthAdvisorSummary({ suggestions, onOpen }) {
  if (!suggestions || suggestions.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-ink-700 bg-ink-900/40 p-4 text-center">
        <p className="text-[11px] font-bold leading-snug text-slate-500">
          Run the growth forecast to populate Growth Advisor.
        </p>
      </div>
    )
  }

  const counts = suggestions.reduce(
    (acc, s) => ({ ...acc, [s.severity]: (acc[s.severity] || 0) + 1 }),
    { critical: 0, high: 0, medium: 0, low: 0, info: 0 },
  )
  const top = suggestions[0]
  const hasHighSignal = counts.critical > 0 || counts.high > 0

  return (
    <button
      type="button"
      onClick={onOpen}
      className={`w-full rounded-2xl border p-3 text-left transition-colors ${
        hasHighSignal
          ? 'border-orange-500/45 bg-orange-500/10 hover:border-orange-400'
          : 'border-ink-700 bg-ink-900/40 hover:border-brand-500'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-brand-400">
          <FlaskConical size={11} className="text-amber-400" />
          Growth Advisor · {suggestions.length}
        </span>
        <ChevronRight size={12} className="text-slate-500" />
      </div>
      <p className="mt-1.5 line-clamp-2 text-xs font-bold leading-snug text-slate-100">
        {top.title}
      </p>
      <div className="mt-2 flex flex-wrap gap-1.5 text-[9px] font-black uppercase tracking-widest">
        {counts.high ? <span className="rounded bg-red-500/20 px-1.5 py-0.5 text-red-200">{counts.high} high</span> : null}
        {counts.medium ? <span className="rounded bg-orange-500/20 px-1.5 py-0.5 text-orange-200">{counts.medium} med</span> : null}
        {counts.low ? <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-amber-200">{counts.low} low</span> : null}
        {counts.info ? <span className="rounded bg-brand-500/20 px-1.5 py-0.5 text-brand-200">{counts.info} info</span> : null}
      </div>
    </button>
  )
}

function summarizeTrajectory(points) {
  if (points.length < 2) return null
  const first = points[0]
  const last = points.at(-1)
  const days = Math.max(1, last.day - first.day)
  const actionDays = points.filter(p => p.nsAction === 'replace' || p.nsAction === 'add')
  const totalNsSupply = points.reduce((sum, p) => sum + (p.nsNew || 0) + (p.nsAdded || 0), 0)
  return {
    startDay: first.day,
    endDay: last.day,
    days,
    heightDelta: last.plantHeightCm - first.plantHeightCm,
    leafDelta: last.numLeaves - first.numLeaves,
    heightRate: (last.plantHeightCm - first.plantHeightCm) / days,
    leafRate: (last.numLeaves - first.numLeaves) / days,
    totalNsSupply,
    actionDays,
  }
}

export default function GrowthTestPage() {
  const [form, setForm] = useState(INITIAL_TS_FORM)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const [bestGrowth, setBestGrowth] = useState(null)
  const [bestGrowthLoading, setBestGrowthLoading] = useState(false)
  const [compareOpen, setCompareOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(null)
  const [advisorOpen, setAdvisorOpen] = useState(false)

  useEffect(() => {
    document.body.classList.add('theme-dark')
    return () => document.body.classList.remove('theme-dark')
  }, [])

  const updateField = (key, value) => setForm(prev => ({ ...prev, [key]: value }))

  const chartData = useMemo(() => {
    const predictions = Array.isArray(result?.predictions) ? result.predictions : []
    return predictions.map(point => {
      const nsNew = point.ns_new_per_plant_l ?? 0
      const nsAdded = point.ns_added_per_plant_l ?? 0
      const nsAction = point.ns_action
      return {
        day: point.days_after_transplant,
        plantHeightCm: point.plant_height_cm,
        numLeaves: point.num_leaves,
        nsNew,
        nsAdded,
        nsAction,
        actionVolume: nsAction === 'replace' ? nsNew : nsAction === 'add' ? nsAdded : 0,
        nsRecommendation: point.ns_recommendation,
      }
    })
  }, [result])

  const stats = useMemo(() => summarizeTrajectory(chartData), [chartData])
  const finalPoint = chartData.at(-1)
  const firstNsAction = stats?.actionDays?.[0]
  const advisorSuggestions = useMemo(
    () => analyzeTimeSeriesInput(form, result?.predictions || [], stats).suggestions,
    [form, result, stats],
  )

  const scoreGrowthCurve = (currentPoints, candidatePoints) => {
    let score = 0
    let matched = 0
    for (let i = 0; i < currentPoints.length; i += 1) {
      const current = currentPoints[i]
      const candidate = candidatePoints.find(point => point.day === current.day)
      if (!candidate) continue
      score += Math.max(0, candidate.plantHeightCm - current.plantHeightCm)
      score += Math.max(0, candidate.numLeaves - current.numLeaves) * 2
      matched += 1
    }
    return matched ? score / matched : 0
  }

  const findBestGrowth = async (baseForm, baseResponse) => {
    const currentPoints = mapTimeSeriesPredictions(baseResponse.predictions)
    const currentSummary = summarizeTimeSeriesCandidate(currentPoints)
    if (!currentSummary) return

    setBestGrowthLoading(true)
    setBestGrowth(null)
    try {
      const candidates = buildTimeSeriesCandidates(baseForm)
      let best = {
        label: 'Current input',
        payload: {
          startDay: parseInt(baseForm.startDay, 10),
          maturityDay: parseInt(baseForm.maturityDay, 10),
          ec: baseForm.ec,
          light: baseForm.light,
          environment: {
            tAirMean: parseFloat(baseForm.tAirMean),
            rhMean: parseFloat(baseForm.rhMean),
            co2Mean: parseFloat(baseForm.co2Mean),
            parLampDaily: parseFloat(baseForm.parLampDaily),
            lightOnHoursDaily: parseFloat(baseForm.lightOnHoursDaily),
          },
        },
        changes: ['Current input performed best among the tested growth combinations.'],
        points: currentPoints,
        summary: currentSummary,
        score: currentSummary.score,
      }

      for (let i = 0; i < candidates.length; i += 1) {
        const candidate = candidates[i]
        let response = null
        try {
          response = await predictTimeSeries(candidate.payload)
        } catch {
          continue
        }
        if (!Array.isArray(response?.predictions)) continue
        const candidatePoints = mapTimeSeriesPredictions(response.predictions)
        const candidateSummary = summarizeTimeSeriesCandidate(candidatePoints)
        if (!candidateSummary) continue
        const gainScore = scoreGrowthCurve(currentPoints, candidatePoints)
        const adjustedScore = candidateSummary.score + gainScore - (candidate.changeCount || 0) * 0.05
        if (adjustedScore > best.score) {
          best = {
            label: candidate.label,
            payload: candidate.payload,
            changes: candidate.changes,
            points: candidatePoints,
            summary: candidateSummary,
            score: adjustedScore,
          }
        }
      }

      setBestGrowth({
        testedCount: candidates.length,
        currentSummary,
        best,
        comparisonData: buildTimeSeriesComparison(currentPoints, best.points),
        hasImprovement: best.label !== 'Current input',
      })
    } finally {
      setBestGrowthLoading(false)
    }
  }

  const handlePredict = async () => {
    setLoading(true)
    setError('')
    setResult(null)
    setBestGrowth(null)
    try {
      const payload = {
        startDay: parseInt(form.startDay, 10),
        maturityDay: parseInt(form.maturityDay, 10),
        ec: form.ec,
        light: form.light,
        environment: {
          tAirMean: parseFloat(form.tAirMean),
          rhMean: parseFloat(form.rhMean),
          co2Mean: parseFloat(form.co2Mean),
          parLampDaily: parseFloat(form.parLampDaily),
          lightOnHoursDaily: parseFloat(form.lightOnHoursDaily),
        },
      }
      const response = await predictTimeSeries(payload)
      if (!Array.isArray(response?.predictions)) {
        throw new Error('Invalid growth response format.')
      }
      setResult(response)
      findBestGrowth(form, response)
    } catch (e) {
      setError(e.message || 'Growth forecast failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-ink-950 text-slate-100">
      <div className="fixed inset-0 z-0">
        <TomatoCanvas metrics={form} prediction={null} darkBg />
      </div>
      <div className="pointer-events-none fixed inset-0 z-10 grid-bg opacity-55" />
      <div className="pointer-events-none fixed inset-x-0 top-0 z-10 h-28 bg-gradient-to-b from-ink-950/90 to-transparent" />
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-10 h-40 bg-gradient-to-t from-ink-950/95 to-transparent" />

      <div className="pointer-events-none relative z-20 flex min-h-screen flex-col">
        <TopNav variant="dark" />

        <main className="pointer-events-none flex-1 px-4 pb-6 pt-4 sm:px-6">
          <div className="flex w-full flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <aside className="pointer-events-auto w-full shrink-0 lg:w-[340px] xl:w-[360px]">
              <div className="flex flex-col overflow-hidden rounded-3xl border border-ink-700 bg-ink-900/82 shadow-[0_24px_60px_-24px_rgba(0,0,0,0.7)] backdrop-blur-xl lg:sticky lg:top-20 lg:max-h-[calc(100vh-10rem)]">
                <div className="scrollbar-thin flex-1 overflow-y-auto p-3">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-brand-500">
                        Growth Forecast
                      </p>
                      <p className="mt-1 text-xs font-bold text-slate-500">
                        Time-series inputs only.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setForm(INITIAL_TS_FORM)}
                      className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-slate-500 transition-colors hover:text-brand-400"
                    >
                      <RotateCcw size={10} />
                      Reset
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {TS_GROUPS.map(group => {
                      const Icon = group.title.startsWith('Forecast') ? Thermometer : Wind
                      return (
                        <CollapsibleGroup
                          key={group.title}
                          id={`growth-${group.title}`}
                          title={group.title}
                          icon={Icon || GROUP_ICON_MAP[group.title]}
                          iconClass={group.title.startsWith('Forecast') ? 'text-orange-400' : 'text-sky-400'}
                        >
                          {group.fields.map(field => (
                            <FieldRow
                              key={field.key}
                              field={field}
                              value={form[field.key]}
                              onChange={updateField}
                            />
                          ))}
                        </CollapsibleGroup>
                      )
                    })}

                    <CollapsibleGroup id="growth-treatment" title="Treatment" icon={Activity} iconClass="text-brand-400">
                      <div className="space-y-3">
                        <div>
                          <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            EC Level
                          </label>
                          <select
                            value={form.ec}
                            onChange={(e) => updateField('ec', e.target.value)}
                            className="w-full rounded-2xl border border-ink-700 bg-ink-850/80 p-3 text-sm font-bold text-slate-100 outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                          >
                            {EC_OPTIONS.map(v => <option key={v} value={v}>{v}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Light Treatment
                          </label>
                          <select
                            value={form.light}
                            onChange={(e) => updateField('light', e.target.value)}
                            className="w-full rounded-2xl border border-ink-700 bg-ink-850/80 p-3 text-sm font-bold text-slate-100 outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                          >
                            {LIGHT_OPTIONS.map(v => <option key={v} value={v}>{v}</option>)}
                          </select>
                        </div>
                      </div>
                    </CollapsibleGroup>
                  </div>
                </div>

                <div className="border-t border-ink-700/60 p-3">
                  <button
                    onClick={handlePredict}
                    disabled={loading}
                    className="flex w-full items-center justify-center gap-2 rounded-full bg-brand-600 py-3 text-[11px] font-black uppercase tracking-[0.22em] text-white transition-colors hover:bg-brand-500 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loading ? <RefreshCw size={14} className="animate-spin" /> : <TrendingUp size={14} />}
                    {loading ? 'Processing...' : 'Run Growth Forecast'}
                  </button>
                </div>
              </div>
            </aside>

            <section className="pointer-events-auto w-full min-w-0">
              <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_360px]">
                <div className="rounded-3xl border border-ink-700 bg-ink-900/82 p-4 shadow-[0_24px_60px_-24px_rgba(0,0,0,0.7)] backdrop-blur-xl">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-brand-500">
                        Growth Curves
                      </p>
                      <p className="mt-1 text-xs font-bold text-slate-500">
                        Height, leaves and nutrient-solution actions.
                      </p>
                    </div>
                  </div>

                  {chartData.length ? (
                    <div className="grid gap-4 xl:grid-cols-2">
                      <div className="h-[320px] rounded-2xl border border-ink-700 bg-ink-900/40 p-3">
                        <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-500">Plant Height</p>
                        <ResponsiveContainer width="100%" height="92%">
                          <AreaChart data={chartData} margin={{ top: 12, right: 16, left: 0, bottom: 0 }}>
                            <CartesianGrid stroke="#1a3d2a" vertical={false} />
                            <XAxis dataKey="day" stroke="#64748b" tickLine={false} axisLine={false} fontSize={11} fontWeight={700} tickFormatter={(d) => `D${d}`} />
                            <YAxis stroke="#64748b" tickLine={false} axisLine={false} fontSize={11} fontWeight={700} width={36} tickFormatter={(v) => v.toFixed(0)} />
                            <Tooltip content={<GrowthTooltip />} cursor={{ stroke: '#475569', strokeDasharray: '4 4' }} />
                            <Area type="monotone" dataKey="plantHeightCm" name="Height" stroke="#22c55e" strokeWidth={2.5} fill="#22c55e" fillOpacity={0.18} dot={false} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>

                      <div className="h-[320px] rounded-2xl border border-ink-700 bg-ink-900/40 p-3">
                        <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-500">Leaves</p>
                        <ResponsiveContainer width="100%" height="92%">
                          <AreaChart data={chartData} margin={{ top: 12, right: 16, left: 0, bottom: 0 }}>
                            <CartesianGrid stroke="#1a3d2a" vertical={false} />
                            <XAxis dataKey="day" stroke="#64748b" tickLine={false} axisLine={false} fontSize={11} fontWeight={700} tickFormatter={(d) => `D${d}`} />
                            <YAxis stroke="#64748b" tickLine={false} axisLine={false} fontSize={11} fontWeight={700} width={36} tickFormatter={(v) => v.toFixed(0)} />
                            <Tooltip content={<GrowthTooltip />} cursor={{ stroke: '#475569', strokeDasharray: '4 4' }} />
                            <Area type="monotone" dataKey="numLeaves" name="Leaves" stroke="#38bdf8" strokeWidth={2.5} fill="#38bdf8" fillOpacity={0.18} dot={false} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>

                      <div className="h-[280px] rounded-2xl border border-ink-700 bg-ink-900/40 p-3 xl:col-span-2">
                        <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-500">NS Action Volume</p>
                        <ResponsiveContainer width="100%" height="90%">
                          <BarChart data={chartData} margin={{ top: 12, right: 16, left: 0, bottom: 0 }}>
                            <CartesianGrid stroke="#1a3d2a" vertical={false} />
                            <XAxis dataKey="day" stroke="#64748b" tickLine={false} axisLine={false} fontSize={11} fontWeight={700} tickFormatter={(d) => `D${d}`} />
                            <YAxis stroke="#64748b" tickLine={false} axisLine={false} fontSize={11} fontWeight={700} width={40} tickFormatter={(v) => `${v.toFixed(1)}L`} />
                            <Tooltip content={<NsTooltip />} cursor={{ fill: '#0a1a12' }} />
                            <Bar dataKey="actionVolume" name="NS Action" radius={[4, 4, 0, 0]} maxBarSize={28}>
                              {chartData.map((entry, idx) => (
                                <Cell
                                  key={idx}
                                  fill={
                                    entry.nsAction === 'replace' ? '#dc2626' :
                                    entry.nsAction === 'add' ? '#f97316' :
                                    '#1f2937'
                                  }
                                />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  ) : (
                    <div className="flex min-h-[520px] items-center justify-center rounded-2xl border border-dashed border-ink-700 bg-ink-900/35 text-center">
                      <div>
                        <Sprout size={42} className="mx-auto mb-4 text-slate-700" />
                        <p className="text-sm font-black uppercase tracking-[0.2em] text-slate-500">
                          Awaiting Growth Forecast
                        </p>
                        <p className="mt-2 text-xs font-bold text-slate-600">
                          Adjust the time-series inputs, then run the forecast.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <aside className="flex flex-col gap-3">
                  <div className="rounded-3xl border border-ink-700 bg-ink-900/82 p-4 shadow-[0_24px_60px_-24px_rgba(0,0,0,0.7)] backdrop-blur-xl">
                    <p className="mb-3 text-[10px] font-black uppercase tracking-[0.22em] text-brand-500">
                      Growth Result
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="rounded-2xl border border-ink-700 bg-ink-900/40 p-2.5">
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Height</p>
                        <p className="text-xl font-black tabular-nums text-slate-50">{finalPoint ? finalPoint.plantHeightCm.toFixed(1) : '-'}</p>
                        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-600">cm</p>
                      </div>
                      <div className="rounded-2xl border border-ink-700 bg-ink-900/40 p-2.5">
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Leaves</p>
                        <p className="text-xl font-black tabular-nums text-slate-50">{finalPoint ? finalPoint.numLeaves.toFixed(1) : '-'}</p>
                        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-600">count</p>
                      </div>
                      <div className="rounded-2xl border border-ink-700 bg-ink-900/40 p-2.5">
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">NS</p>
                        <p className="text-xl font-black tabular-nums text-slate-50">{stats ? stats.totalNsSupply.toFixed(2) : '-'}</p>
                        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-600">L/plant</p>
                      </div>
                    </div>

                    {firstNsAction ? (
                      <div className="mt-3 rounded-2xl border border-orange-500/40 bg-orange-500/10 p-3">
                        <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-orange-300">
                          Next NS Action · Day {firstNsAction.day}
                        </p>
                        <p className="text-sm font-bold leading-snug text-slate-100">
                          {firstNsAction.nsRecommendation || `Add ${firstNsAction.actionVolume.toFixed(2)} L nutrient solution`}
                        </p>
                      </div>
                    ) : (
                      <div className="mt-3 rounded-2xl border border-dashed border-ink-700 bg-ink-900/40 p-4 text-center">
                        <p className="text-[11px] font-bold leading-snug text-slate-500">
                          {result ? 'No NS action triggered.' : 'Run the growth forecast first.'}
                        </p>
                      </div>
                    )}

                    {stats ? (
                      <div className="mt-3 rounded-2xl border border-ink-700 bg-ink-900/40 p-3 text-[10px] font-bold tabular-nums text-slate-400">
                        <span className="mr-2 text-slate-500 uppercase tracking-widest">{stats.days}d</span>
                        <span className="text-brand-400">+{stats.heightDelta.toFixed(1)} cm</span>
                        <span className="mx-1.5 text-slate-700">·</span>
                        <span className="text-sky-400">+{stats.leafDelta.toFixed(1)} leaf</span>
                      </div>
                    ) : null}
                  </div>

                  <div className="rounded-3xl border border-ink-700 bg-ink-900/82 p-2 shadow-[0_24px_60px_-24px_rgba(0,0,0,0.7)] backdrop-blur-xl">
                    <div className="flex flex-col gap-2">
                      <SparklineCard
                        label="Plant Height"
                        value={finalPoint ? finalPoint.plantHeightCm.toFixed(1) : '-'}
                        unit="cm"
                        data={chartData}
                        dataKey="plantHeightCm"
                        color="#22c55e"
                        onExpand={() => setDetailOpen('height')}
                        loading={loading}
                      />
                      <SparklineCard
                        label="Leaf Count"
                        value={finalPoint ? finalPoint.numLeaves.toFixed(1) : '-'}
                        unit="leaves"
                        data={chartData}
                        dataKey="numLeaves"
                        color="#38bdf8"
                        onExpand={() => setDetailOpen('leaf')}
                        loading={loading}
                      />
                    </div>
                  </div>

                  <GrowthAdvisorSummary
                    suggestions={result ? advisorSuggestions : []}
                    onOpen={() => setAdvisorOpen(true)}
                  />

                  <button
                    type="button"
                    onClick={() => setCompareOpen(true)}
                    disabled={!bestGrowth}
                    className="flex w-full items-center justify-center gap-2 rounded-full border border-ink-700 bg-ink-900/80 px-5 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-slate-300 backdrop-blur-xl transition-colors hover:border-brand-500 hover:text-brand-400 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {bestGrowthLoading ? <RefreshCw size={12} className="animate-spin" /> : <TrendingUp size={12} className="text-brand-500" />}
                    Compare Growth
                  </button>
                </aside>
              </div>
            </section>
          </div>
        </main>
      </div>

      {advisorOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/85 backdrop-blur-md"
          onMouseDown={() => setAdvisorOpen(false)}
        >
          <div
            className="m-4 flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-ink-700 bg-ink-900/95 shadow-2xl"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-ink-700/60 px-5 py-3.5">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-brand-500">Advisor</p>
                <p className="text-sm font-black text-slate-100">Growth Optimization Tips</p>
              </div>
              <button
                type="button"
                onClick={() => setAdvisorOpen(false)}
                className="rounded-full p-1.5 text-slate-400 transition-colors hover:bg-ink-800 hover:text-slate-100"
              >
                <X size={16} />
              </button>
            </div>
            <div className="scrollbar-thin flex-1 overflow-y-auto p-5">
              <AdvisorPanel suggestions={advisorSuggestions} dark embed />
            </div>
          </div>
        </div>
      ) : null}

      {compareOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/85 backdrop-blur-md"
          onMouseDown={() => setCompareOpen(false)}
        >
          <div
            className="m-4 max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-3xl border border-ink-700 bg-ink-900/95 shadow-2xl"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-ink-700/60 px-5 py-3.5">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-brand-500">Compare</p>
                <p className="text-sm font-black text-slate-100">Growth Before vs After</p>
              </div>
              <button
                type="button"
                onClick={() => setCompareOpen(false)}
                className="rounded-full p-1.5 text-slate-400 transition-colors hover:bg-ink-800 hover:text-slate-100"
              >
                <X size={16} />
              </button>
            </div>
            <div className="scrollbar-thin max-h-[calc(90vh-4rem)] overflow-y-auto p-5">
              {bestGrowth ? (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-ink-700 bg-ink-850/60 p-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                      Tested {bestGrowth.testedCount} candidate{bestGrowth.testedCount === 1 ? '' : 's'}
                    </p>
                    <p className="mt-1 text-sm font-bold text-slate-200">
                      Best: <span className="text-brand-400">{bestGrowth.best.label}</span>
                    </p>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div>
                      <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-500">Plant Height</p>
                      <div className="h-[240px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={bestGrowth.comparisonData} margin={{ top: 12, right: 16, left: 0, bottom: 0 }}>
                            <CartesianGrid stroke="#1a3d2a" vertical={false} />
                            <XAxis dataKey="day" stroke="#64748b" tickLine={false} axisLine={false} fontSize={11} fontWeight={700} tickFormatter={(d) => `D${d}`} />
                            <YAxis stroke="#64748b" tickLine={false} axisLine={false} fontSize={11} fontWeight={700} width={36} tickFormatter={(v) => v.toFixed(0)} />
                            <Tooltip content={<GrowthTooltip />} cursor={{ stroke: '#475569', strokeDasharray: '4 4' }} />
                            <Area type="monotone" dataKey="currentHeight" name="Before Height" stroke="#64748b" strokeWidth={2.2} fill="#64748b" fillOpacity={0.1} dot={false} />
                            {bestGrowth.hasImprovement ? (
                              <Area type="monotone" dataKey="recommendedHeight" name="After Height" stroke="#22c55e" strokeWidth={2.5} fill="#22c55e" fillOpacity={0.18} dot={false} />
                            ) : null}
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                    <div>
                      <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-500">Leaves</p>
                      <div className="h-[240px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={bestGrowth.comparisonData} margin={{ top: 12, right: 16, left: 0, bottom: 0 }}>
                            <CartesianGrid stroke="#1a3d2a" vertical={false} />
                            <XAxis dataKey="day" stroke="#64748b" tickLine={false} axisLine={false} fontSize={11} fontWeight={700} tickFormatter={(d) => `D${d}`} />
                            <YAxis stroke="#64748b" tickLine={false} axisLine={false} fontSize={11} fontWeight={700} width={36} tickFormatter={(v) => v.toFixed(0)} />
                            <Tooltip content={<GrowthTooltip />} cursor={{ stroke: '#475569', strokeDasharray: '4 4' }} />
                            <Area type="monotone" dataKey="currentLeaves" name="Before Leaves" stroke="#64748b" strokeWidth={2.2} fill="#64748b" fillOpacity={0.1} dot={false} />
                            {bestGrowth.hasImprovement ? (
                              <Area type="monotone" dataKey="recommendedLeaves" name="After Leaves" stroke="#38bdf8" strokeWidth={2.5} fill="#38bdf8" fillOpacity={0.18} dot={false} />
                            ) : null}
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-ink-700 bg-ink-850/60 p-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Changes</p>
                    <ul className="space-y-1 text-xs font-semibold text-slate-300">
                      {bestGrowth.best.changes.map((change, index) => (
                        <li key={index} className="flex gap-2">
                          <span className="text-brand-500">▸</span> {change}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : (
                <p className="rounded-2xl border border-dashed border-ink-700 bg-ink-900/40 p-6 text-center text-sm font-bold text-slate-500">
                  Run a growth forecast first to enable comparison.
                </p>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {detailOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/85 backdrop-blur-md"
          onMouseDown={() => setDetailOpen(null)}
        >
          <div
            className="m-4 max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-3xl border border-ink-700 bg-ink-900/95 shadow-2xl"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-ink-700/60 px-5 py-3.5">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-brand-500">Trajectory</p>
                <p className="text-sm font-black text-slate-100">
                  {detailOpen === 'height' ? 'Plant Height' : 'Leaf Count'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDetailOpen(null)}
                className="rounded-full p-1.5 text-slate-400 transition-colors hover:bg-ink-800 hover:text-slate-100"
              >
                <X size={16} />
              </button>
            </div>
            <div className="h-[440px] p-5">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 12, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="#1a3d2a" vertical={false} />
                  <XAxis dataKey="day" stroke="#64748b" tickLine={false} axisLine={false} fontSize={11} fontWeight={700} tickFormatter={(d) => `D${d}`} />
                  <YAxis stroke="#64748b" tickLine={false} axisLine={false} fontSize={11} fontWeight={700} width={36} tickFormatter={(v) => v.toFixed(0)} />
                  <Tooltip content={<GrowthTooltip />} cursor={{ stroke: '#475569', strokeDasharray: '4 4' }} />
                  <Area
                    type="monotone"
                    dataKey={detailOpen === 'height' ? 'plantHeightCm' : 'numLeaves'}
                    name={detailOpen === 'height' ? 'Height' : 'Leaves'}
                    stroke={detailOpen === 'height' ? '#22c55e' : '#38bdf8'}
                    strokeWidth={2.5}
                    fill={detailOpen === 'height' ? '#22c55e' : '#38bdf8'}
                    fillOpacity={0.18}
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="fixed bottom-8 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-2xl border border-red-700/60 bg-red-950/85 px-5 py-3 text-red-200 shadow-2xl backdrop-blur-md">
          <AlertCircle size={16} />
          <span className="text-sm font-bold">{error}</span>
          <button onClick={() => setError('')} className="rounded-lg p-1 text-red-300 hover:bg-red-900/40">
            <X size={14} />
          </button>
        </div>
      ) : null}
    </div>
  )
}
