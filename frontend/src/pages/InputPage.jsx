import { cloneElement, useEffect, useMemo, useRef, useState } from 'react'
import TomatoCanvas from '../components/TomatoCanvas.jsx'
import TopNav from '../components/TopNav.jsx'
import GlassPanel from '../components/GlassPanel.jsx'
import CollapsibleGroup from '../components/CollapsibleGroup.jsx'
import SparklineCard from '../components/SparklineCard.jsx'
import WorkflowTab from '../components/WorkflowTab.jsx'
import {
  Activity,
  AlertCircle,
  Bug,
  CheckCircle2,
  ChevronRight,
  Droplets,
  FlaskConical,
  Gauge,
  GitCompare,
  HelpCircle,
  Leaf,
  RefreshCw,
  RotateCcw,
  Save,
  Sparkles,
  Sun,
  Thermometer,
  TrendingUp,
  Wind,
  X,
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
import { predictGrowth, predictTimeSeries } from '../api/predict'
import { createRecord } from '../api/records'
import { analyzeYieldInput } from '../lib/advisor'
import { analyzeTimeSeriesInput } from '../lib/timeSeriesAdvisor'
import {
  buildTimeSeriesCandidates,
  buildTimeSeriesComparison,
  buildTimeSeriesPayload,
  buildYieldCandidates,
  mapTimeSeriesPredictions,
  summarizeTrajectory,
} from '../lib/findbest'
import AdvisorPanel from '../components/AdvisorPanel'

const FIELD_INFO = {
  avgTemperatureC: 'Average greenhouse temperature (C). Tip: Measure at plant height.',
  minTemperatureC: 'Lowest daily temperature. Tip: Usually occurs just before dawn.',
  maxTemperatureC: 'Highest daily temperature. Tip: Ensure proper ventilation above 30C.',
  humidityPercent: 'Relative humidity (%). Ideal: 60-80%. Higher humidity increases disease risk.',
  co2Ppm: 'CO2 concentration. Tip: 800-1000 ppm can significantly boost yield.',
  lightIntensityLux: 'Light intensity. Tip: Measure at the top of the canopy.',
  photoperiodHours: 'Daily light hours. Tip: Tomatoes typically need 12-14 hours.',
  irrigationMm: 'Daily water amount. Tip: Adjust based on soil moisture depth.',
  fertilizerNKgHa: 'Nitrogen. Tip: Essential for leaf and stem growth.',
  fertilizerPKgHa: 'Phosphorus. Tip: Crucial for root and flower development.',
  fertilizerKKgHa: 'Potassium. Tip: Important for fruit quality and sugar content.',
  pestSeverity: '0-5 scale. 0 = none, 5 = severe.',
  pH: 'Soil/solution pH. Ideal: 6.0-6.8.',
  variety: 'Tomato variety. Different types have varying yield potentials.',
  tsStartDay: 'Day after transplant where the recursive forecast begins.',
  tsMaturityDay: 'Last day after transplant to forecast to.',
  tsEc: 'EC treatment label used by the time-series model.',
  tsLight: 'Light treatment label used by the time-series model.',
  tsTAirMean: 'Locked daily mean air temperature used for all future days.',
  tsRhMean: 'Locked daily mean relative humidity used for all future days.',
  tsCo2Mean: 'Locked daily mean CO2 concentration used for all future days.',
  tsParLampDaily: 'Locked daily lamp PAR used for the forecast window.',
  tsLightOnHoursDaily: 'Locked daily lamp-on hours used for the forecast window.',
}

const INITIAL_FORM = {
  avgTemperatureC: '25',
  minTemperatureC: '24',
  maxTemperatureC: '27',
  humidityPercent: '70',
  co2Ppm: '800',
  lightIntensityLux: '30000',
  photoperiodHours: '12',
  irrigationMm: '7',
  fertilizerNKgHa: '140',
  fertilizerPKgHa: '60',
  fertilizerKKgHa: '140',
  pestSeverity: '1',
  pH: '6.5',
  variety: 'Roma',
}

const INITIAL_TS_FORM = {
  startDay: '15',
  maturityDay: '66',
  ec: 'EC6',
  light: 'high light',
  tAirMean: '24.8',
  rhMean: '68.5',
  co2Mean: '440',
  parLampDaily: '560',
  lightOnHoursDaily: '8',
}

function buildYieldPayload(form) {
  const payload = Object.fromEntries(
    Object.entries(form).map(([key, value]) => [
      key,
      key === 'variety' ? value : parseFloat(value),
    ])
  )

  const hasInvalidNumber = Object.entries(payload).some(([key, value]) => (
    key !== 'variety' && !Number.isFinite(value)
  ))

  return hasInvalidNumber ? null : payload
}

const PARAMETER_GROUPS = [
  {
    title: 'Climate Matrix',
    iconComponent: Sun,
    iconClass: 'text-amber-400',
    fields: [
      { key: 'avgTemperatureC', label: 'Avg Temp', unit: 'C', min: 10, max: 45, step: 0.1 },
      { key: 'minTemperatureC', label: 'Min Temp', unit: 'C', min: 5, max: 35, step: 0.1 },
      { key: 'maxTemperatureC', label: 'Max Temp', unit: 'C', min: 15, max: 50, step: 0.1 },
      { key: 'humidityPercent', label: 'Humidity', unit: '%', min: 20, max: 100, step: 1 },
      { key: 'co2Ppm', label: 'CO2 Level', unit: 'ppm', min: 300, max: 2000, step: 10 },
      { key: 'lightIntensityLux', label: 'Light', unit: 'lux', min: 0, max: 100000, step: 500 },
      { key: 'photoperiodHours', label: 'Daylight', unit: 'h', min: 0, max: 24, step: 0.5 },
    ],
  },
  {
    title: 'Resource & Soil',
    iconComponent: Droplets,
    iconClass: 'text-sky-400',
    fields: [
      { key: 'irrigationMm', label: 'Irrigation', unit: 'mm', min: 0, max: 50, step: 0.1 },
      { key: 'pH', label: 'Soil pH', unit: '', min: 4, max: 9, step: 0.1 },
      { key: 'pestSeverity', label: 'Pest Level', unit: '0-5', min: 0, max: 5, step: 1 },
    ],
  },
  {
    title: 'Nutrient Profile',
    iconComponent: FlaskConical,
    iconClass: 'text-emerald-400',
    fields: [
      { key: 'fertilizerNKgHa', label: 'Nitrogen (N)', unit: 'kg/ha', min: 0, max: 400, step: 1 },
      { key: 'fertilizerPKgHa', label: 'Phosphorus (P)', unit: 'kg/ha', min: 0, max: 400, step: 1 },
      { key: 'fertilizerKKgHa', label: 'Potassium (K)', unit: 'kg/ha', min: 0, max: 400, step: 1 },
    ],
  },
]

const TS_GROUPS = [
  {
    title: 'Forecast Window',
    iconComponent: Thermometer,
    iconClass: 'text-amber-400',
    fields: [
      { key: 'startDay', infoKey: 'tsStartDay', label: 'Start Day', unit: 'DAT', min: 0, max: 66, step: 1 },
      { key: 'maturityDay', infoKey: 'tsMaturityDay', label: 'Maturity Day', unit: 'DAT', min: 1, max: 90, step: 1 },
    ],
  },
  {
    title: 'Locked Environment',
    iconComponent: Wind,
    iconClass: 'text-sky-400',
    fields: [
      { key: 'tAirMean', infoKey: 'tsTAirMean', label: 'Air Temp', unit: 'C', min: 10, max: 40, step: 0.1 },
      { key: 'rhMean', infoKey: 'tsRhMean', label: 'Humidity', unit: '%', min: 20, max: 100, step: 0.1 },
      { key: 'co2Mean', infoKey: 'tsCo2Mean', label: 'CO2', unit: 'ppm', min: 200, max: 2000, step: 10 },
      { key: 'parLampDaily', infoKey: 'tsParLampDaily', label: 'Lamp PAR', unit: 'daily', min: 0, max: 2000, step: 10 },
      { key: 'lightOnHoursDaily', infoKey: 'tsLightOnHoursDaily', label: 'Light Hours', unit: 'h', min: 0, max: 24, step: 0.5 },
    ],
  },
]

function GrowthTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-2xl border border-ink-700 bg-ink-900/95 px-4 py-3 text-white shadow-2xl backdrop-blur-md min-w-[180px]">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
        Day {label} · DAT
      </p>
      {payload.map(item => (
        <div key={item.dataKey} className="flex items-center gap-3 text-xs font-bold py-0.5">
          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: item.color }} />
          <span className="text-slate-300 mr-auto">{item.name}</span>
          <span className="font-black tabular-nums">{Number(item.value).toFixed(2)}</span>
        </div>
      ))}
    </div>
  )
}

function NsBarTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const p = payload[0].payload
  const action = p.nsAction
  const tagClass =
    action === 'replace' ? 'bg-red-500' : action === 'add' ? 'bg-orange-500' : 'bg-slate-600'
  const tagText = action ? action.toUpperCase() : 'IDLE'
  return (
    <div className="rounded-2xl border border-ink-700 bg-ink-900/95 px-4 py-3 text-white shadow-2xl backdrop-blur-md max-w-[260px]">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
        Day {label} · DAT
      </p>
      <div className="flex items-center gap-2 mb-2">
        <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${tagClass} text-white`}>
          {tagText}
        </span>
        <span className="text-base font-black tabular-nums">
          {p.actionVolume > 0 ? `${p.actionVolume.toFixed(2)} L/plant` : '—'}
        </span>
      </div>
      {p.nsRecommendation && (
        <p className="text-[11px] font-semibold text-slate-300 leading-relaxed">
          {p.nsRecommendation}
        </p>
      )}
    </div>
  )
}

function summarizeTimeSeriesResponse(response) {
  const predictions = Array.isArray(response?.predictions) ? response.predictions : []
  const finalPrediction = predictions.at(-1) || {}
  const totals = predictions.reduce(
    (acc, point) => {
      acc.totalNsSupply += (point.ns_new_per_plant_l ?? 0) + (point.ns_added_per_plant_l ?? 0)
      acc.totalFreshNs += point.ns_new_per_plant_l ?? 0
      acc.totalAddedNs += point.ns_added_per_plant_l ?? 0
      return acc
    },
    { totalNsSupply: 0, totalFreshNs: 0, totalAddedNs: 0 }
  )

  return {
    finalPlantHeight: finalPrediction.plant_height_cm,
    finalLeafCount: finalPrediction.num_leaves,
    totalNsSupply: totals.totalNsSupply,
    totalFreshNs: totals.totalFreshNs,
    totalAddedNs: totals.totalAddedNs,
  }
}

const BOTTLENECK_BG = {
  red:     'bg-red-500/20 text-red-300 border-red-500/40',
  blue:    'bg-sky-500/20 text-sky-300 border-sky-500/40',
  orange:  'bg-orange-500/20 text-orange-300 border-orange-500/40',
  emerald: 'bg-brand-500/20 text-brand-400 border-brand-500/40',
}

function AdvisorSummary({ suggestions, onOpen }) {
  if (!suggestions || suggestions.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-ink-700 bg-ink-900/40 p-3 text-center">
        <p className="text-[11px] font-bold leading-snug text-slate-500">
          Advisor will populate after a successful run.
        </p>
      </div>
    )
  }
  const counts = suggestions.reduce(
    (acc, s) => ({ ...acc, [s.severity]: (acc[s.severity] || 0) + 1 }),
    { critical: 0, high: 0, medium: 0, low: 0, info: 0 },
  )
  const hasCritical = counts.critical > 0
  const top = suggestions[0]
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`w-full rounded-2xl border p-3 text-left transition-colors ${
        hasCritical
          ? 'border-red-500/45 bg-red-500/10 hover:border-red-500'
          : 'border-ink-700 bg-ink-900/40 hover:border-brand-500'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-brand-400">
          <Sparkles size={11} className="text-amber-400" />
          AI Advisor · {suggestions.length}
        </span>
        <ChevronRight size={12} className="text-slate-500" />
      </div>
      <p className="mt-1.5 line-clamp-2 text-xs font-bold leading-snug text-slate-100">
        {top.title}
      </p>
      <div className="mt-2 flex flex-wrap gap-1.5 text-[9px] font-black uppercase tracking-widest">
        {counts.critical ? <span className="rounded bg-red-500/25 px-1.5 py-0.5 text-red-200">{counts.critical} critical</span> : null}
        {counts.high     ? <span className="rounded bg-red-500/20 px-1.5 py-0.5 text-red-200">{counts.high} high</span> : null}
        {counts.medium   ? <span className="rounded bg-orange-500/20 px-1.5 py-0.5 text-orange-200">{counts.medium} med</span> : null}
        {counts.low      ? <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-amber-200">{counts.low} low</span> : null}
        {counts.info     ? <span className="rounded bg-brand-500/20 px-1.5 py-0.5 text-brand-200">{counts.info} info</span> : null}
      </div>
    </button>
  )
}

function FieldRow({ field, info, value, onChange }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 truncate">
            {field.label}
          </label>
          {info ? (
            <div className="group/tip relative cursor-help">
              <HelpCircle size={11} className="text-slate-600 transition-colors group-hover/tip:text-brand-400" />
              <div className="pointer-events-none absolute bottom-full left-0 mb-1.5 w-48 rounded-xl border border-ink-700 bg-ink-900/95 p-2.5 text-[10px] font-medium leading-relaxed text-slate-300 opacity-0 shadow-2xl backdrop-blur-md transition-all group-hover/tip:opacity-100 z-50">
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
          className="w-16 bg-transparent text-right text-xs font-black text-brand-400 outline-none"
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

export default function InputPage() {
  const [form, setForm] = useState(INITIAL_FORM)
  const [timeSeriesForm, setTimeSeriesForm] = useState(INITIAL_TS_FORM)
  const [loading, setLoading] = useState(false)
  const [timeSeriesLoading, setTimeSeriesLoading] = useState(false)
  const [bestYieldLoading, setBestYieldLoading] = useState(false)
  const [bestGrowthLoading, setBestGrowthLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const [livePrediction, setLivePrediction] = useState({
    response: null,
    loading: false,
    error: '',
  })
  const [timeSeriesResult, setTimeSeriesResult] = useState(null)
  const [bestYield, setBestYield] = useState(null)
  const [bestGrowth, setBestGrowth] = useState(null)
  const [activeWorkflow, setActiveWorkflow] = useState('yield')
  const [compareOpen, setCompareOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(null)
  const [advisorOpen, setAdvisorOpen] = useState(false)
  const livePredictionRequestRef = useRef(0)
  const userId = localStorage.getItem('userId')

  useEffect(() => {
    document.body.classList.add('theme-dark')
    return () => document.body.classList.remove('theme-dark')
  }, [])

  const updateField = (key, value) => setForm(prev => ({ ...prev, [key]: value }))
  const updateTimeSeriesField = (key, value) =>
    setTimeSeriesForm(prev => ({ ...prev, [key]: value }))

  useEffect(() => {
    const payload = buildYieldPayload(form)
    const requestId = livePredictionRequestRef.current + 1
    livePredictionRequestRef.current = requestId
    let cancelled = false

    if (!payload) {
      setLivePrediction({ response: null, loading: false, error: '' })
      return undefined
    }

    setLivePrediction(prev => ({ ...prev, loading: true, error: '' }))

    const timeoutId = window.setTimeout(async () => {
      try {
        const response = await predictGrowth(payload)
        if (cancelled || livePredictionRequestRef.current !== requestId) return
        setLivePrediction({ response, loading: false, error: '' })
      } catch (e) {
        if (cancelled || livePredictionRequestRef.current !== requestId) return
        setLivePrediction({
          response: null,
          loading: false,
          error: e.message || 'Live prediction failed.',
        })
      }
    }, 500)

    return () => {
      cancelled = true
      window.clearTimeout(timeoutId)
    }
  }, [form])

  const bottleneck = useMemo(() => {
    if (!result) return null
    const f = form
    if (parseFloat(f.pestSeverity) >= 3) {
      return { label: 'Pest Level', desc: 'Critical pest levels detected.', icon: <Bug />, color: 'red' }
    }
    if (parseFloat(f.co2Ppm) < 600) {
      return { label: 'CO2 Level', desc: 'Low CO2 is limiting photosynthesis.', icon: <Wind />, color: 'blue' }
    }
    if (parseFloat(f.pH) < 5.8 || parseFloat(f.pH) > 7.2) {
      return { label: 'Soil pH', desc: 'pH imbalance is affecting nutrient uptake.', icon: <Gauge />, color: 'orange' }
    }
    return { label: 'Balanced', desc: 'Metabolic rates are within a healthy range.', icon: <CheckCircle2 />, color: 'emerald' }
  }, [result, form])

  const advisorSuggestions = useMemo(() => {
    if (!result) return []
    return analyzeYieldInput(result.payload, result.response.predicted_yield_kg_per_m2).suggestions
  }, [result])

  const timeSeriesChartData = useMemo(() => {
    if (!timeSeriesResult?.predictions) return []
    return timeSeriesResult.predictions.map(point => {
      const nsNew = point.ns_new_per_plant_l ?? 0
      const nsAdded = point.ns_added_per_plant_l ?? 0
      const nsAction = point.ns_action
      const actionVolume =
        nsAction === 'replace' ? nsNew : nsAction === 'add' ? nsAdded : 0
      return {
        day: point.days_after_transplant,
        plantHeightCm: point.plant_height_cm,
        numLeaves: point.num_leaves,
        nsNew,
        nsAdded,
        nsResidual: point.ns_residual_per_plant_l ?? 0,
        nsAction,
        actionVolume,
        nsRecommendation: point.ns_recommendation,
        nsPolicy: point.ns_policy,
        ecLimit: point.ec_limit,
      }
    })
  }, [timeSeriesResult])

  const trajectoryStats = useMemo(() => {
    if (timeSeriesChartData.length < 2) return null
    const first = timeSeriesChartData[0]
    const last = timeSeriesChartData[timeSeriesChartData.length - 1]
    const days = Math.max(1, last.day - first.day)
    const heightDelta = last.plantHeightCm - first.plantHeightCm
    const leafDelta = last.numLeaves - first.numLeaves
    let cumNs = 0
    const cumulativeNs = timeSeriesChartData.map(p => {
      cumNs += (p.nsNew || 0) + (p.nsAdded || 0)
      return { day: p.day, cum: cumNs }
    })
    const freshTotal = timeSeriesChartData.reduce((s, p) => s + (p.nsNew || 0), 0)
    const addedTotal = timeSeriesChartData.reduce((s, p) => s + (p.nsAdded || 0), 0)
    const actionDays = timeSeriesChartData.filter(
      p => p.nsAction === 'replace' || p.nsAction === 'add'
    )
    return {
      days,
      startDay: first.day,
      endDay: last.day,
      heightDelta,
      leafDelta,
      heightRate: heightDelta / days,
      leafRate: leafDelta / days,
      cumulativeNs,
      freshTotal,
      addedTotal,
      actionDays,
    }
  }, [timeSeriesChartData])

  const timeSeriesAdvisorSuggestions = useMemo(() => {
    if (!timeSeriesResult?.predictions) return []
    return analyzeTimeSeriesInput(
      timeSeriesForm,
      timeSeriesResult.predictions,
      trajectoryStats
    ).suggestions
  }, [timeSeriesForm, timeSeriesResult, trajectoryStats])

  const saveRecord = async ({ recordType, input, output, summaryValue }) => {
    if (!userId) return
    try {
      await createRecord({
        userId: parseInt(userId, 10),
        recordType,
        input,
        output,
        summaryValue,
      })
    } catch (e) {
      setError(e.message ? `Prediction completed, but history was not saved: ${e.message}` : 'Prediction completed, but history was not saved.')
    }
  }

  const handlePredict = async () => {
    setLoading(true)
    setError('')
    setResult(null)
    setBestYield(null)
    try {
      const payload = buildYieldPayload(form)
      if (!payload) {
        throw new Error('Please enter valid values before running the simulation.')
      }
      const response = await predictGrowth(payload)
      if (response && response.predicted_yield_kg_per_m2 !== undefined) {
        setResult({ response, payload })
        await saveRecord({
          recordType: 'yield',
          input: payload,
          output: response,
          summaryValue: response.predicted_yield_kg_per_m2,
        })
        handleFindBestYield(payload, response)
      } else {
        throw new Error('Invalid response format.')
      }
    } catch (e) {
      setError(e.message || 'Simulation failed.')
    } finally {
      setLoading(false)
    }
  }

  const handleTimeSeriesPredict = async () => {
    setTimeSeriesLoading(true)
    setError('')
    setBestGrowth(null)
    try {
      const payload = buildTimeSeriesPayload(timeSeriesForm)
      const response = await predictTimeSeries(payload)
      if (!response || !Array.isArray(response.predictions)) {
        throw new Error('Invalid time-series response format.')
      }
      setTimeSeriesResult(response)
      const summary = summarizeTimeSeriesResponse(response)
      await saveRecord({
        recordType: 'timeseries',
        input: payload,
        output: { ...response, summary },
        summaryValue: summary.finalPlantHeight,
      })
      handleFindBestGrowth(timeSeriesForm, response)
    } catch (e) {
      setError(e.message || 'Time-series forecast failed.')
    } finally {
      setTimeSeriesLoading(false)
    }
  }

  const handleFindBestYield = async (basePayload, baseResponse) => {
    const sourcePayload = basePayload || result?.payload
    const sourceResponse = baseResponse || result?.response
    if (!sourcePayload || !sourceResponse) return
    setBestYieldLoading(true)
    setError('')
    setBestYield(null)
    try {
      const currentYield = sourceResponse.predicted_yield_kg_per_m2
      const candidates = buildYieldCandidates(sourcePayload)
      let best = {
        label: 'Current input',
        payload: sourcePayload,
        changes: ['No better tested combination found.'],
        predictedYield: currentYield,
      }

      for (let i = 0; i < candidates.length; i += 1) {
        const candidate = candidates[i]
        let response = null
        try {
          response = await predictGrowth(candidate.payload)
        } catch {
          continue
        }
        if (response && response.predicted_yield_kg_per_m2 > best.predictedYield) {
          best = {
            label: candidate.label,
            payload: candidate.payload,
            changes: candidate.changes,
            predictedYield: response.predicted_yield_kg_per_m2,
          }
        }
      }

      setBestYield({
        testedCount: candidates.length,
        currentYield,
        best,
        improvement: best.predictedYield - currentYield,
      })
    } catch (e) {
      setError(e.message || 'Best yield search failed.')
    } finally {
      setBestYieldLoading(false)
    }
  }

  const scoreGrowthCurve = (currentPoints, candidatePoints) => {
    let heightScore = 0
    let leafScore = 0
    let matchedCount = 0

    for (let i = 0; i < currentPoints.length; i += 1) {
      const currentPoint = currentPoints[i]
      let candidatePoint = null
      for (let j = 0; j < candidatePoints.length; j += 1) {
        if (candidatePoints[j].day === currentPoint.day) {
          candidatePoint = candidatePoints[j]
          break
        }
      }
      if (!candidatePoint) continue
      heightScore += (candidatePoint.plantHeightCm - currentPoint.plantHeightCm) / Math.max(currentPoint.plantHeightCm, 1)
      leafScore += (candidatePoint.numLeaves - currentPoint.numLeaves) / Math.max(currentPoint.numLeaves, 1)
      matchedCount += 1
    }
    if (matchedCount === 0) return 0
    return (heightScore + leafScore) / matchedCount
  }

  const handleFindBestGrowth = async (baseForm, baseResponse) => {
    const sourceForm = baseForm || timeSeriesForm
    const sourceResponse = baseResponse || timeSeriesResult
    if (!sourceResponse?.predictions) return
    setBestGrowthLoading(true)
    setError('')
    setBestGrowth(null)
    try {
      const currentPoints = mapTimeSeriesPredictions(sourceResponse.predictions)
      const currentSummary = summarizeTrajectory(currentPoints)
      const candidates = buildTimeSeriesCandidates(sourceForm)
      let best = {
        label: 'Current input',
        payload: buildTimeSeriesPayload(sourceForm),
        changes: ['No better tested combination found.'],
        points: currentPoints,
        summary: currentSummary,
      }
      let bestScore = 0

      for (let i = 0; i < candidates.length; i += 1) {
        const candidate = candidates[i]
        const response = await predictTimeSeries(candidate.payload)
        if (!response || !Array.isArray(response.predictions)) continue
        const points = mapTimeSeriesPredictions(response.predictions)
        const summary = summarizeTrajectory(points)
        if (!summary || !currentSummary) continue
        const candidateScore = scoreGrowthCurve(currentPoints, points)
        if (candidateScore > bestScore) {
          bestScore = candidateScore
          best = {
            label: candidate.label,
            payload: candidate.payload,
            changes: candidate.changes,
            points,
            summary,
          }
        }
      }

      setBestGrowth({
        testedCount: candidates.length,
        currentSummary,
        best,
        hasImprovement: bestScore > 0,
        comparisonData: buildTimeSeriesComparison(currentPoints, best.points),
      })
    } catch (e) {
      setError(e.message || 'Best growth search failed.')
    } finally {
      setBestGrowthLoading(false)
    }
  }

  const predictedYield = result?.response?.predicted_yield_kg_per_m2
  const livePredictedYield = livePrediction?.response?.predicted_yield_kg_per_m2
  const finalTimeSeriesPoint = timeSeriesChartData.at(-1)
  const totalNsSupply = timeSeriesChartData.reduce(
    (sum, point) => sum + point.nsNew + point.nsAdded,
    0,
  )
  const firstNsAction = timeSeriesChartData.find(point =>
    ['replace', 'add'].includes(point.nsAction)
  )

  const yieldRun = activeWorkflow === 'yield'

  return (
    <div className="relative min-h-screen overflow-hidden bg-hero-radial text-slate-100">
      {/* 3D background */}
      <div className="fixed inset-0 z-0">
        <TomatoCanvas metrics={form} prediction={livePrediction.response} darkBg />
      </div>

      {/* Subtle grid + vignettes (sit above 3D, below UI) */}
      <div className="pointer-events-none fixed inset-0 z-10 grid-bg opacity-55" />
      <div className="pointer-events-none fixed inset-x-0 top-0 z-10 h-28 bg-gradient-to-b from-ink-950/90 to-transparent" />
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-10 h-40 bg-gradient-to-t from-ink-950/95 to-transparent" />

      <div className="pointer-events-none relative z-20 flex min-h-screen flex-col">
        <TopNav variant="dark" />

        <main className="pointer-events-none flex-1 px-4 pt-4 pb-6 sm:px-6">
          <div className="flex w-full flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            {/* INPUTS LEFT */}
            <aside className="pointer-events-auto w-full shrink-0 lg:w-[340px] xl:w-[360px] 2xl:w-[380px]">
              <div
                className="flex flex-col overflow-hidden rounded-3xl border border-ink-700 bg-ink-900/82 backdrop-blur-xl shadow-[0_24px_60px_-24px_rgba(0,0,0,0.7)] lg:sticky lg:top-20 lg:max-h-[calc(100vh-10rem)]"
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
              >
                <div className="border-b border-ink-700/60 p-3">
                  <WorkflowTab
                    value={activeWorkflow}
                    onChange={setActiveWorkflow}
                    options={[
                      { value: 'yield',  label: 'Yield',  icon: TrendingUp },
                      { value: 'growth', label: 'Growth', icon: Leaf },
                    ]}
                  />
                </div>

                <div className="scrollbar-thin flex-1 overflow-y-auto p-3">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-brand-500">
                      {yieldRun ? 'Lab Inputs' : 'Time-Series Inputs'}
                    </p>
                    <button
                      type="button"
                      onClick={() => yieldRun ? setForm(INITIAL_FORM) : setTimeSeriesForm(INITIAL_TS_FORM)}
                      className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-slate-500 transition-colors hover:text-brand-400"
                    >
                      <RotateCcw size={10} />
                      Reset
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {(yieldRun ? PARAMETER_GROUPS : TS_GROUPS).map(group => (
                      <CollapsibleGroup
                        key={group.title}
                        id={`${activeWorkflow}-${group.title}`}
                        title={group.title}
                        icon={group.iconComponent}
                        iconClass={group.iconClass}
                      >
                        {group.fields.map(field => (
                          <FieldRow
                            key={field.key}
                            field={field}
                            info={FIELD_INFO[field.infoKey || field.key]}
                            value={yieldRun ? form[field.key] : timeSeriesForm[field.key]}
                            onChange={yieldRun ? updateField : updateTimeSeriesField}
                          />
                        ))}
                      </CollapsibleGroup>
                    ))}

                    {yieldRun ? (
                      <CollapsibleGroup id="yield-variety" title="Variety" icon={Leaf} iconClass="text-brand-400">
                        <select
                          value={form.variety}
                          onChange={(e) => updateField('variety', e.target.value)}
                          className="w-full rounded-2xl border border-ink-700 bg-ink-850/80 p-3 text-sm font-bold text-slate-100 outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                        >
                          {['Beefsteak', 'Cherry', 'Heirloom', 'Roma'].map(v => (
                            <option key={v} value={v}>{v}</option>
                          ))}
                        </select>
                      </CollapsibleGroup>
                    ) : (
                      <CollapsibleGroup id="growth-treatment" title="Treatment" icon={Activity} iconClass="text-brand-400">
                        <div className="space-y-3">
                          <div>
                            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                              EC Level
                            </label>
                            <select
                              value={timeSeriesForm.ec}
                              onChange={(e) => updateTimeSeriesField('ec', e.target.value)}
                              className="w-full rounded-2xl border border-ink-700 bg-ink-850/80 p-3 text-sm font-bold text-slate-100 outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                            >
                              {['EC3', 'EC6'].map(v => <option key={v} value={v}>{v}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                              Light Treatment
                            </label>
                            <select
                              value={timeSeriesForm.light}
                              onChange={(e) => updateTimeSeriesField('light', e.target.value)}
                              className="w-full rounded-2xl border border-ink-700 bg-ink-850/80 p-3 text-sm font-bold text-slate-100 outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                            >
                              {['high light', 'med light', 'low light', 'no light'].map(v => (
                                <option key={v} value={v}>{v}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </CollapsibleGroup>
                    )}
                  </div>
                </div>

                <div className="border-t border-ink-700/60 p-3">
                  {yieldRun ? (
                    <button
                      onClick={handlePredict}
                      disabled={loading}
                      className="flex w-full items-center justify-center gap-2 rounded-full bg-brand-600 py-3 text-[11px] font-black uppercase tracking-[0.22em] text-white transition-colors hover:bg-brand-500 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {loading ? <RefreshCw size={14} className="animate-spin" /> : <TrendingUp size={14} />}
                      {loading ? 'Processing…' : 'Run Simulation'}
                    </button>
                  ) : (
                    <button
                      onClick={handleTimeSeriesPredict}
                      disabled={timeSeriesLoading}
                      className="flex w-full items-center justify-center gap-2 rounded-full bg-brand-600 py-3 text-[11px] font-black uppercase tracking-[0.22em] text-white transition-colors hover:bg-brand-500 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {timeSeriesLoading ? <RefreshCw size={14} className="animate-spin" /> : <Leaf size={14} />}
                      {timeSeriesLoading ? 'Forecasting…' : 'Run Time-Series'}
                    </button>
                  )}
                </div>
              </div>
            </aside>

            {/* OUTPUT RIGHT (+ stacked sparkline column below) */}
            <aside className="pointer-events-auto w-full shrink-0 lg:w-[320px] xl:w-[340px] 2xl:w-[360px]">
              <div className="lg:sticky lg:top-20 flex flex-col gap-3 lg:max-h-[calc(100vh-6rem)]">
              <div
                className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-ink-700 bg-ink-900/82 backdrop-blur-xl shadow-[0_24px_60px_-24px_rgba(0,0,0,0.7)]"
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
              >
                <div className="border-b border-ink-700/60 px-4 py-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-brand-500">
                    {yieldRun ? 'Yield Result' : 'Growth Result'}
                  </p>
                </div>

                <div className="scrollbar-thin flex-1 overflow-y-auto p-4 space-y-4">
                  {yieldRun ? (
                    <>
                      <div>
                        <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-slate-500">
                          {result ? 'Predicted Yield' : 'Live Estimate'}
                        </p>
                        <div className="flex items-baseline gap-2">
                          <span className="text-5xl font-black tabular-nums text-slate-50 leading-none">
                            {predictedYield != null
                              ? predictedYield.toFixed(2)
                              : livePredictedYield != null
                                ? livePredictedYield.toFixed(2)
                                : '—'}
                          </span>
                          <span className="text-xs font-bold uppercase tracking-widest text-slate-500">
                            kg/m²
                          </span>
                        </div>
                        {!result && livePrediction.loading ? (
                          <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-slate-600">
                            Live · computing…
                          </p>
                        ) : null}
                      </div>

                      {bottleneck ? (
                        <div className={`rounded-2xl border bg-ink-900/40 p-3 ${BOTTLENECK_BG[bottleneck.color] || BOTTLENECK_BG.emerald}`}>
                          <div className="flex items-start gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ink-950/40">
                              {cloneElement(bottleneck.icon, { size: 16 })}
                            </div>
                            <div className="min-w-0">
                              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                Bottleneck
                              </p>
                              <p className="text-sm font-black text-slate-50">{bottleneck.label}</p>
                              <p className="text-[11px] font-semibold leading-snug text-slate-300">
                                {bottleneck.desc}
                              </p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-2xl border border-dashed border-ink-700 bg-ink-900/40 p-4 text-center">
                          <p className="text-[11px] font-bold leading-snug text-slate-500">
                            Adjust inputs on the left, then run the simulation to commit a result.
                          </p>
                        </div>
                      )}

                      {result ? (
                        <AdvisorSummary
                          suggestions={advisorSuggestions}
                          onOpen={() => setAdvisorOpen(true)}
                        />
                      ) : null}
                    </>
                  ) : (
                    <>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="rounded-2xl border border-ink-700 bg-ink-900/40 p-2.5">
                          <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Height</p>
                          <p className="text-xl font-black tabular-nums text-slate-50">
                            {finalTimeSeriesPoint ? finalTimeSeriesPoint.plantHeightCm.toFixed(1) : '—'}
                          </p>
                          <p className="text-[9px] font-bold uppercase tracking-widest text-slate-600">cm</p>
                        </div>
                        <div className="rounded-2xl border border-ink-700 bg-ink-900/40 p-2.5">
                          <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Leaves</p>
                          <p className="text-xl font-black tabular-nums text-slate-50">
                            {finalTimeSeriesPoint ? finalTimeSeriesPoint.numLeaves.toFixed(1) : '—'}
                          </p>
                          <p className="text-[9px] font-bold uppercase tracking-widest text-slate-600">count</p>
                        </div>
                        <div className="rounded-2xl border border-ink-700 bg-ink-900/40 p-2.5">
                          <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">NS Total</p>
                          <p className="text-xl font-black tabular-nums text-slate-50">
                            {timeSeriesChartData.length ? totalNsSupply.toFixed(2) : '—'}
                          </p>
                          <p className="text-[9px] font-bold uppercase tracking-widest text-slate-600">L/plant</p>
                        </div>
                      </div>

                      {firstNsAction ? (
                        <div className="rounded-2xl border border-orange-500/40 bg-orange-500/10 p-3">
                          <p className="text-[10px] font-black uppercase tracking-widest text-orange-300 mb-1">
                            Next NS Action · Day {firstNsAction.day}
                          </p>
                          <p className="text-sm font-bold text-slate-100 leading-snug">
                            {firstNsAction.nsRecommendation || (
                              firstNsAction.nsAction === 'replace' ? 'Replace nutrient solution' : `Add ${firstNsAction.actionVolume.toFixed(2)}L nutrient solution`
                            )}
                          </p>
                        </div>
                      ) : (
                        <div className="rounded-2xl border border-dashed border-ink-700 bg-ink-900/40 p-4 text-center">
                          <p className="text-[11px] font-bold leading-snug text-slate-500">
                            {timeSeriesResult ? 'No NS action triggered.' : 'Run the time-series forecast to populate the curves.'}
                          </p>
                        </div>
                      )}

                      {trajectoryStats ? (
                        <div className="rounded-2xl border border-ink-700 bg-ink-900/40 p-3 text-[10px] font-bold tabular-nums text-slate-400">
                          <span className="text-slate-500 uppercase tracking-widest mr-2">{trajectoryStats.days}d</span>
                          <span className="text-brand-400">+{trajectoryStats.heightDelta.toFixed(1)} cm</span>
                          <span className="mx-1.5 text-slate-700">·</span>
                          <span className="text-sky-400">+{trajectoryStats.leafDelta.toFixed(1)} leaf</span>
                          <span className="mx-1.5 text-slate-700">·</span>
                          <span className="text-orange-400">{(trajectoryStats.freshTotal + trajectoryStats.addedTotal).toFixed(1)}L NS</span>
                        </div>
                      ) : null}

                      {timeSeriesResult ? (
                        <AdvisorSummary
                          suggestions={timeSeriesAdvisorSuggestions}
                          onOpen={() => setAdvisorOpen(true)}
                        />
                      ) : null}
                    </>
                  )}
                </div>

                <div className="border-t border-ink-700/60 p-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setCompareOpen(true)}
                    disabled={yieldRun ? !bestYield : !bestGrowth}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-ink-700 bg-ink-900/60 px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-300 transition-colors hover:border-brand-500 hover:text-brand-400 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {(yieldRun ? bestYieldLoading : bestGrowthLoading) ? (
                      <RefreshCw size={12} className="animate-spin" />
                    ) : (
                      <GitCompare size={12} />
                    )}
                    Compare
                  </button>
                </div>
              </div>

              {/* Sparkline column docked below the output panel */}
              <div
                className="pointer-events-auto shrink-0"
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
              >
                {timeSeriesChartData.length > 0 ? (
                  <div className="rounded-3xl border border-ink-700 bg-ink-900/82 p-2 backdrop-blur-xl shadow-[0_24px_60px_-24px_rgba(0,0,0,0.7)]">
                    <div className="flex flex-col gap-2">
                      <SparklineCard
                        label="Plant Height"
                        value={finalTimeSeriesPoint ? finalTimeSeriesPoint.plantHeightCm.toFixed(1) : '—'}
                        unit="cm"
                        data={timeSeriesChartData}
                        dataKey="plantHeightCm"
                        color="#22c55e"
                        onExpand={() => setDetailOpen('height')}
                        loading={timeSeriesLoading}
                      />
                      <SparklineCard
                        label="Leaf Count"
                        value={finalTimeSeriesPoint ? finalTimeSeriesPoint.numLeaves.toFixed(1) : '—'}
                        unit="leaves"
                        data={timeSeriesChartData}
                        dataKey="numLeaves"
                        color="#38bdf8"
                        onExpand={() => setDetailOpen('leaf')}
                        loading={timeSeriesLoading}
                      />
                      <SparklineCard
                        label="NS Supply"
                        value={timeSeriesChartData.length ? totalNsSupply.toFixed(2) : '—'}
                        unit="L/plant"
                        data={trajectoryStats?.cumulativeNs}
                        dataKey="cum"
                        color="#fb923c"
                        onExpand={() => setDetailOpen('ns')}
                        loading={timeSeriesLoading}
                      />
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setActiveWorkflow('growth')}
                    className="group flex w-full items-center justify-center gap-2 rounded-full border border-ink-700 bg-ink-900/80 px-5 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-slate-400 backdrop-blur-xl transition-colors hover:border-brand-500/70 hover:text-brand-400"
                  >
                    <Leaf size={12} className="text-brand-500" />
                    Run growth forecast
                    <ChevronRight size={12} className="transition-transform group-hover:translate-x-0.5" />
                  </button>
                )}
              </div>

              </div>
            </aside>
          </div>
        </main>
      </div>

      {/* Compare modal */}
      {compareOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/85 backdrop-blur-md"
          onMouseDown={() => setCompareOpen(false)}
        >
          <div
            className="m-4 max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-3xl border border-ink-700 bg-ink-900/95 shadow-2xl"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-ink-700/60 px-5 py-3.5">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-brand-500">Compare</p>
                <p className="text-sm font-black text-slate-100">
                  {yieldRun ? 'Yield Before vs After' : 'Growth Before vs After'}
                </p>
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
              {yieldRun ? (
                bestYield ? (
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-ink-700 bg-ink-850/60 p-4">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                        Tested {bestYield.testedCount} candidate{bestYield.testedCount === 1 ? '' : 's'}
                      </p>
                      <p className="mt-1 text-sm font-bold text-slate-200">
                        Best: <span className="text-brand-400">{bestYield.best.label}</span>
                        <span className="ml-2 text-slate-500">Δ {bestYield.improvement >= 0 ? '+' : ''}{bestYield.improvement.toFixed(2)} kg/m²</span>
                      </p>
                    </div>
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={[
                            { label: 'Before', yield: bestYield.currentYield },
                            { label: 'After',  yield: bestYield.best.predictedYield },
                          ]}
                          margin={{ top: 12, right: 16, left: 0, bottom: 0 }}
                        >
                          <CartesianGrid stroke="#1a3d2a" vertical={false} />
                          <XAxis dataKey="label" stroke="#64748b" tickLine={false} axisLine={false} fontSize={11} fontWeight={700} />
                          <YAxis stroke="#64748b" tickLine={false} axisLine={false} fontSize={11} fontWeight={700} width={44} tickFormatter={(v) => v.toFixed(1)} />
                          <Tooltip cursor={{ fill: '#0a1a12' }} contentStyle={{ background: '#0a1a12', border: '1px solid #1a3d2a', borderRadius: 12, color: '#e2e8f0' }} formatter={(v) => [`${Number(v).toFixed(2)} kg/m²`, 'Predicted Yield']} />
                          <Bar dataKey="yield" radius={[8, 8, 0, 0]} maxBarSize={90}>
                            <Cell fill="#475569" />
                            <Cell fill="#16a34a" />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="rounded-2xl border border-ink-700 bg-ink-850/60 p-4">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Changes</p>
                      <ul className="space-y-1 text-xs font-semibold text-slate-300">
                        {bestYield.best.changes.map((c, i) => (
                          <li key={i} className="flex gap-2">
                            <span className="text-brand-500">▸</span> {c}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ) : (
                  <p className="rounded-2xl border border-dashed border-ink-700 bg-ink-900/40 p-6 text-center text-sm font-bold text-slate-500">
                    Run a yield simulation first to enable comparison.
                  </p>
                )
              ) : (
                bestGrowth ? (
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
                              {bestGrowth.hasImprovement && (
                                <Area type="monotone" dataKey="recommendedHeight" name="After Height" stroke="#22c55e" strokeWidth={2.5} fill="#22c55e" fillOpacity={0.18} dot={false} />
                              )}
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
                              {bestGrowth.hasImprovement && (
                                <Area type="monotone" dataKey="recommendedLeaves" name="After Leaves" stroke="#38bdf8" strokeWidth={2.5} fill="#38bdf8" fillOpacity={0.18} dot={false} />
                              )}
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>
                    <div className="rounded-2xl border border-ink-700 bg-ink-850/60 p-4">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Changes</p>
                      <ul className="space-y-1 text-xs font-semibold text-slate-300">
                        {bestGrowth.best.changes.map((c, i) => (
                          <li key={i} className="flex gap-2">
                            <span className="text-brand-500">▸</span> {c}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ) : (
                  <p className="rounded-2xl border border-dashed border-ink-700 bg-ink-900/40 p-6 text-center text-sm font-bold text-slate-500">
                    Run a time-series forecast first to enable comparison.
                  </p>
                )
              )}
            </div>
          </div>
        </div>
      ) : null}

      {/* Detail modal — sparkline expand */}
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
                  {detailOpen === 'height' && 'Plant Height (cm)'}
                  {detailOpen === 'leaf'   && 'Leaf Count'}
                  {detailOpen === 'ns'     && 'Nutrient Solution Schedule'}
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
            <div className="p-5">
              {timeSeriesChartData.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-ink-700 bg-ink-900/40 p-6 text-center text-sm font-bold text-slate-500">
                  Run a time-series forecast first.
                </p>
              ) : (
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    {detailOpen === 'ns' ? (
                      <BarChart data={timeSeriesChartData} margin={{ top: 12, right: 16, left: 0, bottom: 0 }}>
                        <CartesianGrid stroke="#1a3d2a" vertical={false} />
                        <XAxis dataKey="day" stroke="#64748b" tickLine={false} axisLine={false} fontSize={11} fontWeight={700} tickFormatter={(d) => `D${d}`} />
                        <YAxis stroke="#64748b" tickLine={false} axisLine={false} fontSize={11} fontWeight={700} width={40} tickFormatter={(v) => `${v.toFixed(1)}L`} />
                        <Tooltip content={<NsBarTooltip />} cursor={{ fill: '#0a1a12' }} />
                        <Bar dataKey="actionVolume" name="Action Volume (L)" radius={[4, 4, 0, 0]} maxBarSize={28}>
                          {timeSeriesChartData.map((entry, idx) => (
                            <Cell
                              key={idx}
                              fill={
                                entry.nsAction === 'replace' ? '#dc2626' :
                                entry.nsAction === 'add'     ? '#f97316' :
                                                                '#1f2937'
                              }
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    ) : (
                      <AreaChart data={timeSeriesChartData} margin={{ top: 12, right: 16, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="detailFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%"   stopColor={detailOpen === 'height' ? '#22c55e' : '#38bdf8'} stopOpacity={0.45} />
                            <stop offset="100%" stopColor={detailOpen === 'height' ? '#22c55e' : '#38bdf8'} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid stroke="#1a3d2a" vertical={false} />
                        <XAxis dataKey="day" stroke="#64748b" tickLine={false} axisLine={false} fontSize={11} fontWeight={700} tickFormatter={(d) => `D${d}`} />
                        <YAxis stroke="#64748b" tickLine={false} axisLine={false} fontSize={11} fontWeight={700} width={36} tickFormatter={(v) => v.toFixed(0)} />
                        <Tooltip content={<GrowthTooltip />} cursor={{ stroke: '#475569', strokeDasharray: '4 4' }} />
                        <Area
                          type="monotone"
                          dataKey={detailOpen === 'height' ? 'plantHeightCm' : 'numLeaves'}
                          name={detailOpen === 'height' ? 'Plant Height (cm)' : 'Leaf Count'}
                          stroke={detailOpen === 'height' ? '#22c55e' : '#38bdf8'}
                          strokeWidth={2.5}
                          fill="url(#detailFill)"
                          dot={false}
                          activeDot={{ r: 5, fill: detailOpen === 'height' ? '#22c55e' : '#38bdf8', stroke: '#0a1a12', strokeWidth: 3 }}
                        />
                      </AreaChart>
                    )}
                  </ResponsiveContainer>
                </div>
              )}
              {detailOpen === 'ns' && trajectoryStats && trajectoryStats.actionDays.length > 0 ? (
                <div className="mt-4 rounded-2xl border border-ink-700 bg-ink-850/60 p-4">
                  <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Upcoming Actions</p>
                  <div className="space-y-2">
                    {trajectoryStats.actionDays.slice(0, 6).map(p => {
                      const isReplace = p.nsAction === 'replace'
                      return (
                        <div key={p.day} className="flex items-center gap-3 rounded-xl border border-ink-700 bg-ink-900/50 px-3 py-2">
                          <div className="w-12 shrink-0 text-center">
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Day</p>
                            <p className="text-lg font-black tabular-nums text-slate-100 leading-none">{p.day}</p>
                          </div>
                          <span className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-white ${isReplace ? 'bg-red-600' : 'bg-orange-500'}`}>
                            {p.nsAction}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-bold text-slate-200">
                              {p.nsRecommendation || (isReplace ? 'Replace nutrient solution' : `Add ${p.actionVolume.toFixed(2)}L nutrient solution`)}
                            </p>
                          </div>
                          <p className="shrink-0 text-sm font-black tabular-nums text-slate-100">
                            {p.actionVolume.toFixed(2)} <span className="text-[10px] font-bold text-slate-500">L</span>
                          </p>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {/* Advisor modal */}
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
                <p className="text-sm font-black text-slate-100">
                  {yieldRun ? 'Yield Optimization Tips' : 'Time-Series Optimization Tips'}
                </p>
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
              <AdvisorPanel
                suggestions={yieldRun ? advisorSuggestions : timeSeriesAdvisorSuggestions}
                dark
                embed
              />
            </div>
          </div>
        </div>
      ) : null}

      {/* Error toast */}
      {error ? (
        <div className="fixed bottom-32 left-1/2 z-40 -translate-x-1/2 flex items-center gap-3 rounded-2xl border border-red-700/60 bg-red-950/85 px-5 py-3 text-red-200 shadow-2xl backdrop-blur-md">
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
