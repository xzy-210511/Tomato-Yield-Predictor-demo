import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Activity,
  AlertCircle,
  Bug,
  CheckCircle2,
  Droplets,
  FlaskConical,
  Gauge,
  HelpCircle,
  Leaf,
  RefreshCw,
  Sun,
  Thermometer,
  TrendingUp,
  User,
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

const PARAMETER_GROUPS = [
  {
    title: 'Climate Matrix',
    icon: <Sun size={18} className="text-orange-500" />,
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
    icon: <Droplets size={18} className="text-blue-500" />,
    fields: [
      { key: 'irrigationMm', label: 'Irrigation', unit: 'mm', min: 0, max: 50, step: 0.1 },
      { key: 'pH', label: 'Soil pH', unit: '', min: 4, max: 9, step: 0.1 },
      { key: 'pestSeverity', label: 'Pest Level', unit: '0-5', min: 0, max: 5, step: 1 },
    ],
  },
  {
    title: 'Nutrient Profile',
    icon: <FlaskConical size={18} className="text-emerald-500" />,
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
    icon: <Thermometer size={18} className="text-orange-500" />,
    fields: [
      { key: 'startDay', infoKey: 'tsStartDay', label: 'Start Day', unit: 'DAT', min: 0, max: 66, step: 1 },
      { key: 'maturityDay', infoKey: 'tsMaturityDay', label: 'Maturity Day', unit: 'DAT', min: 1, max: 90, step: 1 },
    ],
  },
  {
    title: 'Locked Environment',
    icon: <Wind size={18} className="text-sky-500" />,
    fields: [
      { key: 'tAirMean', infoKey: 'tsTAirMean', label: 'Air Temp', unit: 'C', min: 10, max: 40, step: 0.1 },
      { key: 'rhMean', infoKey: 'tsRhMean', label: 'Humidity', unit: '%', min: 20, max: 100, step: 0.1 },
      { key: 'co2Mean', infoKey: 'tsCo2Mean', label: 'CO2', unit: 'ppm', min: 200, max: 2000, step: 10 },
      { key: 'parLampDaily', infoKey: 'tsParLampDaily', label: 'Lamp PAR', unit: 'daily', min: 0, max: 2000, step: 10 },
      { key: 'lightOnHoursDaily', infoKey: 'tsLightOnHoursDaily', label: 'Light Hours', unit: 'h', min: 0, max: 24, step: 0.5 },
    ],
  },
]

function EmptyChartState() {
  return (
    <>
      <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-slate-300">
        <TrendingUp size={28} />
      </div>
      <p className="font-medium">Run the new time-series forecast to generate the chart.</p>
    </>
  )
}

function GrowthTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-slate-900/95 backdrop-blur-sm text-white rounded-2xl px-4 py-3 shadow-2xl border border-slate-700 min-w-[180px]">
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

function MiniSparkline({ data, dataKey, color, gradientId }) {
  if (!data || data.length < 2) return <div className="h-6" />
  return (
    <div className="h-6 -mx-1">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 1, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.55} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

function NsActionDot({ cx, cy, payload }) {
  if (cx == null || cy == null || !payload) return null
  if (payload.nsAction === 'replace') {
    return <circle cx={cx} cy={cy} r={6} fill="white" stroke="#dc2626" strokeWidth={2.5} />
  }
  if (payload.nsAction === 'add') {
    return <circle cx={cx} cy={cy} r={5} fill="#f97316" stroke="white" strokeWidth={2} />
  }
  return null
}

function NsBarTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const p = payload[0].payload
  const action = p.nsAction
  const tagClass =
    action === 'replace' ? 'bg-red-500' : action === 'add' ? 'bg-orange-500' : 'bg-slate-600'
  const tagText = action ? action.toUpperCase() : 'IDLE'
  return (
    <div className="bg-slate-900/95 backdrop-blur-sm text-white rounded-2xl px-4 py-3 shadow-2xl border border-slate-700 max-w-[260px]">
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

export default function InputPage() {
  const [form, setForm] = useState(INITIAL_FORM)
  const [timeSeriesForm, setTimeSeriesForm] = useState(INITIAL_TS_FORM)
  const [loading, setLoading] = useState(false)
  const [timeSeriesLoading, setTimeSeriesLoading] = useState(false)
  const [bestYieldLoading, setBestYieldLoading] = useState(false)
  const [bestGrowthLoading, setBestGrowthLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const [timeSeriesResult, setTimeSeriesResult] = useState(null)
  const [bestYield, setBestYield] = useState(null)
  const [bestGrowth, setBestGrowth] = useState(null)
  const navigate = useNavigate()
  const user = localStorage.getItem('user')
  const userId = localStorage.getItem('userId')

  const updateField = (key, value) => setForm(prev => ({ ...prev, [key]: value }))
  const updateTimeSeriesField = (key, value) =>
    setTimeSeriesForm(prev => ({ ...prev, [key]: value }))

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
      // Actionable volume on this day: replace uses fresh L, add uses added L, idle is 0.
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

  const timeSeriesSummary = useMemo(() => {
    if (timeSeriesChartData.length < 2) {
      return {
        label: 'Awaiting Forecast',
        desc: 'Run the time-series model to generate daily points and the curve.',
        icon: <Activity />,
        color: 'slate',
      }
    }
    const first = timeSeriesChartData[0]
    const last = timeSeriesChartData[timeSeriesChartData.length - 1]
    const heightGain = last.plantHeightCm - first.plantHeightCm
    const leafGain = last.numLeaves - first.numLeaves
    if (heightGain > 12 && leafGain > 8) {
      return {
        label: 'Strong Growth',
        desc: 'Both height and leaf count rise well over the forecast window.',
        icon: <CheckCircle2 />,
        color: 'emerald',
      }
    }
    if (parseFloat(timeSeriesForm.co2Mean) < 450) {
      return {
        label: 'CO2 Constraint',
        desc: 'The locked CO2 value is a likely limiting factor for future growth.',
        icon: <Wind />,
        color: 'blue',
      }
    }
    return {
      label: 'Moderate Growth',
      desc: 'The curve is stable, with room to improve the environment locks.',
      icon: <Gauge />,
      color: 'orange',
    }
  }, [timeSeriesChartData, timeSeriesForm.co2Mean])

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
      const payload = Object.fromEntries(
        Object.entries(form).map(([k, v]) => [k, k === 'variety' ? v : parseFloat(v)])
      )
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
        const response = await predictGrowth(candidate.payload)
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
  const finalTimeSeriesPoint = timeSeriesChartData.at(-1)
  const totalNsSupply = timeSeriesChartData.reduce(
    (sum, point) => sum + point.nsNew + point.nsAdded,
    0
  )
  const firstNsAction = timeSeriesChartData.find(point =>
    ['replace', 'add'].includes(point.nsAction)
  )

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans">
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-[1400px] mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-600 flex items-center justify-center shadow-lg shadow-brand-200">
              <Leaf className="text-white" size={22} />
            </div>
            <h1 className="text-xl font-black tracking-tight uppercase italic">
              Tomato<span className="text-brand-600">Lab</span>
            </h1>
          </div>
          <div className="flex items-center gap-6">
            <button onClick={() => navigate('/history')} className="text-sm font-bold text-slate-500 hover:text-brand-600 transition-colors">
              History
            </button>
            {user ? (
              <div className="flex items-center gap-4 px-4 py-2 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-xs font-black text-slate-700 flex items-center gap-2">
                  <User size={14} /> {user}
                </span>
                <button onClick={() => { localStorage.removeItem('user'); localStorage.removeItem('userId'); window.location.reload() }} className="text-xs font-bold text-red-500 hover:text-red-600">
                  Logout
                </button>
              </div>
            ) : (
              <button onClick={() => navigate('/login')} className="px-6 py-2 bg-slate-900 text-white rounded-xl text-xs font-black hover:bg-brand-600 transition-all shadow-lg shadow-slate-200">
                Sign In
              </button>
            )}
          </div>
        </div>
      </nav>

      <main className="max-w-[1400px] mx-auto px-6 py-8 space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-5 xl:col-span-4">
            <div className="bg-white rounded-[2.5rem] p-8 border border-slate-200 shadow-sm sticky top-24">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-lg font-black flex items-center gap-2">
                  <Activity size={20} className="text-brand-600" /> Lab Settings
                </h2>
                <button onClick={() => setForm(INITIAL_FORM)} className="text-[10px] font-black text-slate-300 hover:text-brand-600 uppercase tracking-widest transition-colors">
                  Reset
                </button>
              </div>

              <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                {PARAMETER_GROUPS.map(group => (
                  <div key={group.title} className="space-y-4">
                    <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-2">
                      {group.icon} {group.title}
                    </div>
                    {group.fields.map(field => (
                      <div key={field.key} className="group relative">
                        <div className="flex justify-between items-center mb-1.5">
                          <div className="flex items-center gap-1.5">
                            <label className="text-[11px] font-bold text-slate-500 group-hover:text-brand-600 transition-colors">{field.label}</label>
                            <div className="group/tip relative cursor-help">
                              <HelpCircle size={12} className="text-slate-300 group-hover/tip:text-brand-500 transition-colors" />
                              <div className="absolute bottom-full left-0 mb-2 w-48 p-3 bg-slate-800 text-white text-[10px] rounded-xl shadow-xl opacity-0 invisible group-hover/tip:opacity-100 group-hover/tip:visible transition-all z-50 leading-relaxed font-medium">
                                {FIELD_INFO[field.key]}
                              </div>
                            </div>
                          </div>
                          <input type="number" step={field.step} value={form[field.key]} onChange={e => updateField(field.key, e.target.value)} className="w-16 text-right bg-transparent text-xs font-black text-brand-600 outline-none" />
                        </div>
                        <input type="range" min={field.min} max={field.max} step={field.step} value={form[field.key]} onChange={e => updateField(field.key, e.target.value)} className="w-full h-1 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-brand-600" />
                      </div>
                    ))}
                  </div>
                ))}

                <div className="pt-4">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3">Variety Selection</label>
                  <select value={form.variety} onChange={e => updateField('variety', e.target.value)} className="w-full p-4 bg-slate-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-brand-500 outline-none transition-all">
                    {['Beefsteak', 'Cherry', 'Heirloom', 'Roma'].map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
              </div>

              <button onClick={handlePredict} disabled={loading} className="w-full mt-8 py-4 bg-brand-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-brand-100 hover:bg-brand-700 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50">
                {loading ? <RefreshCw className="animate-spin" size={18} /> : <TrendingUp size={18} />}
                {loading ? 'Processing...' : 'Run Simulation'}
              </button>
            </div>
          </div>

          <div className="lg:col-span-7 xl:col-span-8">
            {result ? (
              <div className="animate-in fade-in slide-in-from-right-8 duration-500 space-y-8">
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  <div className="bg-white rounded-[3rem] p-10 border border-slate-200 shadow-sm relative overflow-hidden group">
                    <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform duration-700 text-brand-600"><Activity size={200} /></div>
                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Estimated Yield</p>
                    <div className="flex items-baseline gap-3">
                      <span className="text-7xl sm:text-8xl font-black text-slate-900 tracking-tighter">{predictedYield.toFixed(2)}</span>
                      <span className="text-xl font-bold text-slate-400 uppercase tracking-tighter">kg/m2</span>
                    </div>
                  </div>

                  <div className="bg-slate-900 rounded-[3rem] p-10 text-white shadow-2xl flex flex-col justify-between relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-10"><TrendingUp size={120} /></div>
                    <div>
                      <h3 className="text-xl font-black mb-1 italic tracking-tight">Optimization Focus</h3>
                      <p className="text-brand-400 text-[10px] font-black uppercase tracking-widest mb-6 underline decoration-brand-400/30 underline-offset-4">Current Bottleneck</p>
                      <div className="flex items-center gap-4 relative z-10">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg ${
                          bottleneck.color === 'red' ? 'bg-red-500' :
                          bottleneck.color === 'blue' ? 'bg-blue-500' :
                          bottleneck.color === 'orange' ? 'bg-orange-500' : 'bg-emerald-500'
                        }`}>{bottleneck.icon}</div>
                        <div>
                          <p className="text-lg font-black">{bottleneck.label}</p>
                          <p className="text-xs text-slate-400 font-medium leading-tight">{bottleneck.desc}</p>
                        </div>
                      </div>
                    </div>
                    <div className="mt-8 pt-6 border-t border-white/10 flex justify-between items-end">
                      <div>
                        <p className="text-[10px] font-black text-slate-500 uppercase">Growth Status</p>
                        <p className="text-sm font-bold text-brand-400">Metabolic Peak</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-black text-slate-500 uppercase">Est. Harvest</p>
                        <p className="text-sm font-bold">~14-21 Days</p>
                      </div>
                    </div>
                  </div>
                </div>

                <AdvisorPanel suggestions={advisorSuggestions} />

                <div className="bg-white rounded-[3rem] p-8 border border-slate-200 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                    <div>
                      <h3 className="text-xl font-black flex items-center gap-3">
                        <TrendingUp size={22} className="text-brand-600" /> Yield Before vs After
                      </h3>
                    </div>
                    {bestYieldLoading && (
                      <div className="px-4 py-2 rounded-2xl bg-slate-100 text-slate-500 text-xs font-black uppercase tracking-widest flex items-center gap-2">
                        <RefreshCw size={14} className="animate-spin" /> Searching
                      </div>
                    )}
                  </div>

                  {bestYield ? (
                    <div className="space-y-5">
                      <div className="h-[280px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={[
                              { label: 'Before', yield: bestYield.currentYield },
                              { label: 'After', yield: bestYield.best.predictedYield },
                            ]}
                            margin={{ top: 12, right: 16, left: 0, bottom: 0 }}
                          >
                            <CartesianGrid stroke="#f1f5f9" vertical={false} />
                            <XAxis dataKey="label" stroke="#94a3b8" tickLine={false} axisLine={false} fontSize={11} fontWeight={700} />
                            <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} fontSize={11} fontWeight={700} width={44} tickFormatter={v => v.toFixed(1)} />
                            <Tooltip cursor={{ fill: '#f8fafc' }} formatter={v => [`${Number(v).toFixed(2)} kg/m2`, 'Predicted Yield']} />
                            <Bar dataKey="yield" radius={[8, 8, 0, 0]} maxBarSize={90}>
                              <Cell fill="#94a3b8" />
                              <Cell fill="#16a34a" />
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-2xl bg-slate-50 border border-dashed border-slate-200 p-6 text-sm font-bold text-slate-400 text-center">
                      {bestYieldLoading ? 'Searching all tested yield combinations...' : 'Run prediction to generate the before and after comparison.'}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="h-full min-h-[500px] flex flex-col items-center justify-center text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-100 p-12">
                <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-8 animate-pulse text-slate-200"><FlaskConical size={40} /></div>
                <h3 className="text-2xl font-black text-slate-300 tracking-tight italic">Ready for Lab Data</h3>
                <p className="text-slate-400 text-sm max-w-sm mt-4 font-medium italic">Adjust the environmental matrix to see predicted growth potential.</p>
              </div>
            )}
          </div>
        </div>

        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-4">
            <div className="bg-white rounded-[2.5rem] p-8 border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-lg font-black flex items-center gap-2">
                    <TrendingUp size={20} className="text-brand-600" /> Time-Series Forecast
                  </h2>
                  <p className="text-sm text-slate-500 mt-2">New variables are added here without replacing the original yield form.</p>
                </div>
                <button onClick={() => setTimeSeriesForm(INITIAL_TS_FORM)} className="text-[10px] font-black text-slate-300 hover:text-brand-600 uppercase tracking-widest transition-colors">
                  Reset
                </button>
              </div>

              <div className="space-y-6">
                {TS_GROUPS.map(group => (
                  <div key={group.title} className="space-y-4">
                    <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-2">
                      {group.icon} {group.title}
                    </div>
                    {group.fields.map(field => (
                      <div key={field.key} className="group relative">
                        <div className="flex justify-between items-center mb-1.5">
                          <div className="flex items-center gap-1.5">
                            <label className="text-[11px] font-bold text-slate-500 group-hover:text-brand-600 transition-colors">{field.label}</label>
                            <div className="group/tip relative cursor-help">
                              <HelpCircle size={12} className="text-slate-300 group-hover/tip:text-brand-500 transition-colors" />
                              <div className="absolute bottom-full left-0 mb-2 w-48 p-3 bg-slate-800 text-white text-[10px] rounded-xl shadow-xl opacity-0 invisible group-hover/tip:opacity-100 group-hover/tip:visible transition-all z-50 leading-relaxed font-medium">
                                {FIELD_INFO[field.infoKey]}
                              </div>
                            </div>
                          </div>
                          <input type="number" step={field.step} value={timeSeriesForm[field.key]} onChange={e => updateTimeSeriesField(field.key, e.target.value)} className="w-20 text-right bg-transparent text-xs font-black text-brand-600 outline-none" />
                        </div>
                        <input type="range" min={field.min} max={field.max} step={field.step} value={timeSeriesForm[field.key]} onChange={e => updateTimeSeriesField(field.key, e.target.value)} className="w-full h-1 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-brand-600" />
                      </div>
                    ))}
                  </div>
                ))}

                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3">EC Level</label>
                    <select value={timeSeriesForm.ec} onChange={e => updateTimeSeriesField('ec', e.target.value)} className="w-full p-4 bg-slate-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-brand-500 outline-none transition-all">
                      {['EC3', 'EC6'].map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3">Light Treatment</label>
                    <select value={timeSeriesForm.light} onChange={e => updateTimeSeriesField('light', e.target.value)} className="w-full p-4 bg-slate-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-brand-500 outline-none transition-all">
                      {['high light', 'med light', 'low light', 'no light'].map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <button onClick={handleTimeSeriesPredict} disabled={timeSeriesLoading} className="w-full mt-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-slate-200 hover:bg-brand-600 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50">
                {timeSeriesLoading ? <RefreshCw className="animate-spin" size={18} /> : <TrendingUp size={18} />}
                {timeSeriesLoading ? 'Forecasting...' : 'Run Time-Series'}
              </button>
            </div>
          </div>

          <div className="lg:col-span-8">
            <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                  {/* Final Height */}
                  <div className="bg-white rounded-[2rem] p-6 border border-slate-200 shadow-sm flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
                        <Sun size={16} />
                      </div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Final Height</p>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-black text-slate-900 tracking-tighter tabular-nums">
                        {finalTimeSeriesPoint ? finalTimeSeriesPoint.plantHeightCm.toFixed(1) : '--'}
                      </span>
                      <span className="text-xs font-black text-slate-400 uppercase tracking-tighter">cm</span>
                    </div>
                    {trajectoryStats ? (
                      <p className="text-[11px] font-bold text-brand-600 tabular-nums">
                        Δ {trajectoryStats.heightDelta >= 0 ? '+' : ''}{trajectoryStats.heightDelta.toFixed(1)} cm · {trajectoryStats.heightRate >= 0 ? '+' : ''}{trajectoryStats.heightRate.toFixed(2)}/day
                      </p>
                    ) : (
                      <p className="text-[11px] font-bold text-slate-300">— awaiting forecast —</p>
                    )}
                    <MiniSparkline data={timeSeriesChartData} dataKey="plantHeightCm" color="#16a34a" gradientId="sparkHeight" />
                  </div>

                  {/* Final Leaves */}
                  <div className="bg-white rounded-[2rem] p-6 border border-slate-200 shadow-sm flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                        <Leaf size={16} />
                      </div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Final Leaves</p>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-black text-slate-900 tracking-tighter tabular-nums">
                        {finalTimeSeriesPoint ? finalTimeSeriesPoint.numLeaves.toFixed(1) : '--'}
                      </span>
                      <span className="text-xs font-black text-slate-400 uppercase tracking-tighter">leaves</span>
                    </div>
                    {trajectoryStats ? (
                      <p className="text-[11px] font-bold text-blue-600 tabular-nums">
                        Δ {trajectoryStats.leafDelta >= 0 ? '+' : ''}{trajectoryStats.leafDelta.toFixed(1)} · {trajectoryStats.leafRate >= 0 ? '+' : ''}{trajectoryStats.leafRate.toFixed(2)}/day
                      </p>
                    ) : (
                      <p className="text-[11px] font-bold text-slate-300">— awaiting forecast —</p>
                    )}
                    <MiniSparkline data={timeSeriesChartData} dataKey="numLeaves" color="#2563eb" gradientId="sparkLeaves" />
                  </div>

                  {/* Total NS */}
                  <div className="bg-white rounded-[2rem] p-6 border border-slate-200 shadow-sm flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center">
                        <Droplets size={16} />
                      </div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Total NS Supply</p>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-black text-slate-900 tracking-tighter tabular-nums">
                        {timeSeriesChartData.length ? totalNsSupply.toFixed(2) : '--'}
                      </span>
                      <span className="text-xs font-black text-slate-400 uppercase tracking-tighter">L/plant</span>
                    </div>
                    {trajectoryStats ? (
                      <div className="flex flex-wrap gap-1.5 text-[10px] font-black uppercase tracking-widest">
                        <span className="px-2 py-0.5 rounded-md bg-orange-50 text-orange-600 tabular-nums">Fresh {trajectoryStats.freshTotal.toFixed(1)}L</span>
                        <span className="px-2 py-0.5 rounded-md bg-cyan-50 text-cyan-600 tabular-nums">Added {trajectoryStats.addedTotal.toFixed(1)}L</span>
                      </div>
                    ) : (
                      <p className="text-[11px] font-bold text-slate-300">— awaiting forecast —</p>
                    )}
                    <MiniSparkline data={trajectoryStats?.cumulativeNs} dataKey="cum" color="#06b6d4" gradientId="sparkNs" />
                  </div>

                  {/* NS Recommendation */}
                  <div className="bg-slate-900 rounded-[2rem] p-6 text-white shadow-lg flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                        firstNsAction?.nsAction === 'replace'
                          ? 'bg-red-500/20 text-red-300'
                          : firstNsAction?.nsAction === 'add'
                          ? 'bg-orange-500/20 text-orange-300'
                          : 'bg-slate-700 text-slate-400'
                      }`}>
                        <AlertCircle size={16} />
                      </div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Next NS Action</p>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-black tracking-tighter tabular-nums">
                        {firstNsAction ? `Day ${firstNsAction.day}` : 'Idle'}
                      </span>
                      {firstNsAction?.nsAction && (
                        <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${
                          firstNsAction.nsAction === 'replace' ? 'bg-red-500 text-white' : 'bg-orange-500 text-white'
                        }`}>
                          {firstNsAction.nsAction}
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-semibold text-slate-300 leading-relaxed line-clamp-2">
                      {firstNsAction?.nsRecommendation || 'Run the forecast to generate an NS recommendation.'}
                    </p>
                    {/* Event timeline strip */}
                    {trajectoryStats && trajectoryStats.actionDays.length > 0 && (
                      <div className="mt-auto pt-2">
                        <div className="relative h-1 bg-slate-700 rounded-full">
                          {trajectoryStats.actionDays.map(p => {
                            const span = Math.max(1, trajectoryStats.endDay - trajectoryStats.startDay)
                            const pos = ((p.day - trajectoryStats.startDay) / span) * 100
                            const color = p.nsAction === 'replace' ? 'bg-red-400' : 'bg-orange-400'
                            return (
                              <span
                                key={p.day}
                                className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2 h-2 rounded-full ${color}`}
                                style={{ left: `${pos}%` }}
                                title={`Day ${p.day} · ${p.nsAction}`}
                              />
                            )
                          })}
                        </div>
                        <div className="flex justify-between text-[9px] font-black text-slate-500 uppercase tracking-widest mt-1.5 tabular-nums">
                          <span>D{trajectoryStats.startDay}</span>
                          <span>{trajectoryStats.actionDays.length} action{trajectoryStats.actionDays.length === 1 ? '' : 's'}</span>
                          <span>D{trajectoryStats.endDay}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

              <div className="bg-white rounded-[3rem] p-8 border border-slate-200 shadow-sm">
                <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <h3 className="text-xl font-black flex items-center gap-3">
                      <TrendingUp size={24} className="text-brand-600" /> Growth Trajectory
                    </h3>
                    {trajectoryStats ? (
                      <p className="text-xs font-bold text-slate-500 mt-2 tabular-nums">
                        {trajectoryStats.days} days · D{trajectoryStats.startDay}–D{trajectoryStats.endDay}
                        <span className="mx-2 text-slate-300">·</span>
                        <span className="text-brand-600">+{trajectoryStats.heightDelta.toFixed(1)} cm</span>
                        <span className="mx-2 text-slate-300">·</span>
                        <span className="text-blue-600">+{trajectoryStats.leafDelta.toFixed(1)} leaves</span>
                        <span className="mx-2 text-slate-300">·</span>
                        <span className="text-cyan-600">{(trajectoryStats.freshTotal + trajectoryStats.addedTotal).toFixed(2)} L NS</span>
                      </p>
                    ) : (
                      <p className="text-xs font-bold text-slate-400 mt-2">Run the time-series forecast to populate the curves.</p>
                    )}
                  </div>
                </div>

                {timeSeriesChartData.length > 0 ? (
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                    {/* Plant Height */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-brand-600" />
                          <p className="text-sm font-black text-slate-900">Plant Height</p>
                        </div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">cm</p>
                      </div>
                      <div className="h-[280px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={timeSeriesChartData} margin={{ top: 12, right: 16, left: 0, bottom: 0 }}>
                            <defs>
                              <linearGradient id="heightFill" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#16a34a" stopOpacity={0.45} />
                                <stop offset="100%" stopColor="#16a34a" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid stroke="#f1f5f9" vertical={false} />
                            <XAxis dataKey="day" stroke="#94a3b8" tickLine={false} axisLine={false} fontSize={11} fontWeight={700} tickFormatter={d => `D${d}`} />
                            <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} fontSize={11} fontWeight={700} width={36} tickFormatter={v => v.toFixed(0)} />
                            <Tooltip content={<GrowthTooltip />} cursor={{ stroke: '#cbd5e1', strokeDasharray: '4 4' }} />
                            <Area
                              type="monotone"
                              dataKey="plantHeightCm"
                              name="Plant Height (cm)"
                              stroke="#16a34a"
                              strokeWidth={2.5}
                              fill="url(#heightFill)"
                              dot={false}
                              activeDot={{ r: 5, fill: '#16a34a', stroke: 'white', strokeWidth: 3 }}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Leaf Count */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                          <p className="text-sm font-black text-slate-900">Leaf Count</p>
                        </div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">leaves</p>
                      </div>
                      <div className="h-[280px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={timeSeriesChartData} margin={{ top: 12, right: 16, left: 0, bottom: 0 }}>
                            <defs>
                              <linearGradient id="leafFill" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#2563eb" stopOpacity={0.45} />
                                <stop offset="100%" stopColor="#2563eb" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid stroke="#f1f5f9" vertical={false} />
                            <XAxis dataKey="day" stroke="#94a3b8" tickLine={false} axisLine={false} fontSize={11} fontWeight={700} tickFormatter={d => `D${d}`} />
                            <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} fontSize={11} fontWeight={700} width={36} tickFormatter={v => v.toFixed(0)} />
                            <Tooltip content={<GrowthTooltip />} cursor={{ stroke: '#cbd5e1', strokeDasharray: '4 4' }} />
                            <Area
                              type="monotone"
                              dataKey="numLeaves"
                              name="Leaf Count"
                              stroke="#2563eb"
                              strokeWidth={2.5}
                              fill="url(#leafFill)"
                              dot={false}
                              activeDot={{ r: 5, fill: '#2563eb', stroke: 'white', strokeWidth: 3 }}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* NS daily action bars */}
                    <div className="xl:col-span-2">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                          <p className="text-sm font-black text-slate-900">Nutrient Solution Schedule</p>
                        </div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          L per plant · {trajectoryStats?.actionDays.length ?? 0} action{trajectoryStats?.actionDays.length === 1 ? '' : 's'}
                        </p>
                      </div>
                      <div className="h-[260px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={timeSeriesChartData} margin={{ top: 12, right: 16, left: 0, bottom: 0 }}>
                            <CartesianGrid stroke="#f1f5f9" vertical={false} />
                            <XAxis dataKey="day" stroke="#94a3b8" tickLine={false} axisLine={false} fontSize={11} fontWeight={700} tickFormatter={d => `D${d}`} />
                            <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} fontSize={11} fontWeight={700} width={40} tickFormatter={v => `${v.toFixed(1)}L`} />
                            <Tooltip content={<NsBarTooltip />} cursor={{ fill: '#f1f5f9' }} />
                            <Bar dataKey="actionVolume" name="Action Volume (L)" radius={[4, 4, 0, 0]} maxBarSize={28}>
                              {timeSeriesChartData.map((entry, idx) => (
                                <Cell
                                  key={idx}
                                  fill={
                                    entry.nsAction === 'replace' ? '#dc2626' :
                                    entry.nsAction === 'add' ? '#f97316' :
                                    '#e2e8f0'
                                  }
                                />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                      {/* Legend */}
                      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-4 text-[11px] font-black uppercase tracking-widest text-slate-500">
                        <span className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-sm bg-orange-500" /> Add
                        </span>
                        <span className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-sm bg-red-600" /> Replace
                        </span>
                        <span className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-sm bg-slate-200" /> Idle
                        </span>
                      </div>

                      {/* Schedule table — actionable list of upcoming events */}
                      {trajectoryStats && trajectoryStats.actionDays.length > 0 && (
                        <div className="mt-6 rounded-[2rem] bg-slate-50 border border-slate-100 p-5">
                          <div className="flex items-center justify-between mb-4">
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Upcoming Actions</p>
                            {trajectoryStats.actionDays.length > 5 && (
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                showing 5 of {trajectoryStats.actionDays.length}
                              </p>
                            )}
                          </div>
                          <div className="space-y-2">
                            {trajectoryStats.actionDays.slice(0, 5).map(p => {
                              const isReplace = p.nsAction === 'replace'
                              return (
                                <div
                                  key={p.day}
                                  className="flex items-center gap-4 bg-white rounded-2xl px-4 py-3 border border-slate-100 hover:border-slate-200 transition-colors"
                                >
                                  <div className="text-center shrink-0 w-14">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Day</p>
                                    <p className="text-2xl font-black text-slate-900 leading-none tabular-nums">{p.day}</p>
                                  </div>
                                  <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md shrink-0 text-white ${isReplace ? 'bg-red-600' : 'bg-orange-500'}`}>
                                    {p.nsAction}
                                  </span>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold text-slate-700 truncate">
                                      {p.nsRecommendation || (isReplace ? 'Replace nutrient solution' : `Add ${p.actionVolume.toFixed(2)}L nutrient solution`)}
                                    </p>
                                    {p.nsPolicy && (
                                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">
                                        {p.nsPolicy} policy · EC {p.ecLimit}
                                      </p>
                                    )}
                                  </div>
                                  <p className="text-sm font-black text-slate-900 tabular-nums shrink-0">
                                    {p.actionVolume.toFixed(2)} <span className="text-[10px] text-slate-400 font-bold">L</span>
                                  </p>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}

                      {timeSeriesResult && (
                        <div className="mt-8">
                          <AdvisorPanel suggestions={timeSeriesAdvisorSuggestions} />
                        </div>
                      )}

                      {timeSeriesResult && (
                        <div className="mt-8 bg-white rounded-[3rem] p-8 border border-slate-200 shadow-sm">
                          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                            <div>
                              <h3 className="text-xl font-black flex items-center gap-3">
                                <TrendingUp size={22} className="text-brand-600" /> Growth Before vs After
                              </h3>
                            </div>
                            {bestGrowthLoading && (
                              <div className="px-4 py-2 rounded-2xl bg-slate-100 text-slate-500 text-xs font-black uppercase tracking-widest flex items-center gap-2">
                                <RefreshCw size={14} className="animate-spin" /> Searching
                              </div>
                            )}
                          </div>

                          {bestGrowth ? (
                            <div className="space-y-5">
                              <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                                <div>
                                  <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-4 text-[11px] font-black uppercase tracking-widest">
                                      <span className="flex items-center gap-2 text-slate-500"><span className="w-3 h-3 rounded-full bg-slate-400" /> Before</span>
                                      {bestGrowth.hasImprovement && (
                                        <span className="flex items-center gap-2 text-emerald-600"><span className="w-3 h-3 rounded-full bg-emerald-500" /> After</span>
                                      )}
                                    </div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">height cm</p>
                                  </div>
                                  <div className="h-[280px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                      <AreaChart data={bestGrowth.comparisonData} margin={{ top: 12, right: 16, left: 0, bottom: 0 }}>
                                        <CartesianGrid stroke="#f1f5f9" vertical={false} />
                                        <XAxis dataKey="day" stroke="#94a3b8" tickLine={false} axisLine={false} fontSize={11} fontWeight={700} tickFormatter={d => `D${d}`} />
                                        <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} fontSize={11} fontWeight={700} width={36} tickFormatter={v => v.toFixed(0)} />
                                        <Tooltip cursor={{ stroke: '#cbd5e1', strokeDasharray: '4 4' }} />
                                        <Area type="monotone" dataKey="currentHeight" name="Before Height" stroke="#94a3b8" strokeWidth={2.5} fill="#94a3b8" fillOpacity={0.08} dot={false} />
                                        {bestGrowth.hasImprovement && (
                                          <Area type="monotone" dataKey="recommendedHeight" name="After Height" stroke="#16a34a" strokeWidth={2.5} fill="#16a34a" fillOpacity={0.16} dot={false} />
                                        )}
                                      </AreaChart>
                                    </ResponsiveContainer>
                                  </div>
                                </div>

                                <div>
                                  <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-4 text-[11px] font-black uppercase tracking-widest">
                                      <span className="flex items-center gap-2 text-slate-500"><span className="w-3 h-3 rounded-full bg-slate-400" /> Before</span>
                                      {bestGrowth.hasImprovement && (
                                        <span className="flex items-center gap-2 text-blue-600"><span className="w-3 h-3 rounded-full bg-blue-500" /> After</span>
                                      )}
                                    </div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">leaves</p>
                                  </div>
                                  <div className="h-[280px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                      <AreaChart data={bestGrowth.comparisonData} margin={{ top: 12, right: 16, left: 0, bottom: 0 }}>
                                        <CartesianGrid stroke="#f1f5f9" vertical={false} />
                                        <XAxis dataKey="day" stroke="#94a3b8" tickLine={false} axisLine={false} fontSize={11} fontWeight={700} tickFormatter={d => `D${d}`} />
                                        <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} fontSize={11} fontWeight={700} width={36} tickFormatter={v => v.toFixed(0)} />
                                        <Tooltip cursor={{ stroke: '#cbd5e1', strokeDasharray: '4 4' }} />
                                        <Area type="monotone" dataKey="currentLeaves" name="Before Leaves" stroke="#94a3b8" strokeWidth={2.5} fill="#94a3b8" fillOpacity={0.08} dot={false} />
                                        {bestGrowth.hasImprovement && (
                                          <Area type="monotone" dataKey="recommendedLeaves" name="After Leaves" stroke="#2563eb" strokeWidth={2.5} fill="#2563eb" fillOpacity={0.16} dot={false} />
                                        )}
                                      </AreaChart>
                                    </ResponsiveContainer>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="rounded-2xl bg-slate-50 border border-dashed border-slate-200 p-6 text-sm font-bold text-slate-400 text-center">
                              {bestGrowthLoading ? 'Searching all tested growth combinations...' : 'Run prediction to generate the before and after comparison.'}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="h-[420px] flex flex-col items-center justify-center border-2 border-dashed border-slate-100 rounded-[2rem] text-slate-400 bg-slate-50/50">
                    <EmptyChartState />
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>

      {error && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-red-600 text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-4 animate-in slide-in-from-bottom-10 z-[100]">
          <AlertCircle size={20} />
          <span className="text-sm font-bold">{error}</span>
          <button onClick={() => setError('')} className="p-1 hover:bg-white/20 rounded-lg"><X size={16} /></button>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
      ` }} />
    </div>
  )
}
