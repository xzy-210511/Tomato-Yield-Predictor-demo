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
  Lightbulb,
  RefreshCw,
  Sun,
  Thermometer,
  TrendingUp,
  User,
  Wind,
  X,
} from 'lucide-react'
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { predictGrowth, predictTimeSeries } from '../api/predict'

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

export default function InputPage() {
  const [form, setForm] = useState(INITIAL_FORM)
  const [timeSeriesForm, setTimeSeriesForm] = useState(INITIAL_TS_FORM)
  const [loading, setLoading] = useState(false)
  const [timeSeriesLoading, setTimeSeriesLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const [timeSeriesResult, setTimeSeriesResult] = useState(null)
  const navigate = useNavigate()
  const user = localStorage.getItem('user')

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

  const timeSeriesChartData = useMemo(() => {
    if (!timeSeriesResult?.predictions) return []
    return timeSeriesResult.predictions.map(point => ({
      day: point.days_after_transplant,
      plantHeightCm: point.plant_height_cm,
      numLeaves: point.num_leaves,
    }))
  }, [timeSeriesResult])

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

  const handlePredict = async () => {
    setLoading(true)
    setError('')
    try {
      const payload = Object.fromEntries(
        Object.entries(form).map(([k, v]) => [k, k === 'variety' ? v : parseFloat(v)])
      )
      const response = await predictGrowth(payload)
      if (response && response.predicted_yield_kg_per_m2 !== undefined) {
        setResult({ response, payload })
        const history = JSON.parse(localStorage.getItem('history') || '[]')
        localStorage.setItem('history', JSON.stringify([
          { time: new Date().toISOString(), input: payload, output: response.predicted_yield_kg_per_m2 },
          ...history,
        ]))
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
    try {
      const payload = {
        startDay: parseInt(timeSeriesForm.startDay, 10),
        maturityDay: parseInt(timeSeriesForm.maturityDay, 10),
        ec: timeSeriesForm.ec,
        light: timeSeriesForm.light,
        environment: {
          tAirMean: parseFloat(timeSeriesForm.tAirMean),
          rhMean: parseFloat(timeSeriesForm.rhMean),
          co2Mean: parseFloat(timeSeriesForm.co2Mean),
          parLampDaily: parseFloat(timeSeriesForm.parLampDaily),
          lightOnHoursDaily: parseFloat(timeSeriesForm.lightOnHoursDaily),
        },
      }
      const response = await predictTimeSeries(payload)
      if (!response || !Array.isArray(response.predictions)) {
        throw new Error('Invalid time-series response format.')
      }
      setTimeSeriesResult(response)
    } catch (e) {
      setError(e.message || 'Time-series forecast failed.')
    } finally {
      setTimeSeriesLoading(false)
    }
  }

  const predictedYield = result?.response?.predicted_yield_kg_per_m2
  const finalTimeSeriesPoint = timeSeriesChartData.at(-1)

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

                <div className="bg-white rounded-[3rem] p-10 border border-slate-200 shadow-sm">
                  <h3 className="text-xl font-black mb-10 flex items-center gap-3">
                    <Lightbulb size={24} className="text-amber-500" /> AI Optimization Advisor
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {[
                      { ...bottleneck, title: bottleneck.label, text: bottleneck.desc },
                      { icon: <Droplets />, title: 'Irrigation Sync', text: 'Ensure water cycles match lighting photoperiod.', color: 'blue' },
                    ].map((tip, i) => (
                      <div key={i} className={`p-6 rounded-[2.5rem] border transition-all flex gap-5 ${
                        tip.color === 'blue' ? 'bg-blue-50/40 border-blue-100' :
                        tip.color === 'orange' ? 'bg-orange-50/40 border-orange-100' :
                        tip.color === 'red' ? 'bg-red-50/40 border-red-100' : 'bg-emerald-50/40 border-emerald-100'
                      }`}>
                        <div className={`shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center text-white ${
                          tip.color === 'blue' ? 'bg-blue-500' :
                          tip.color === 'orange' ? 'bg-orange-500' :
                          tip.color === 'red' ? 'bg-red-500' : 'bg-emerald-500'
                        }`}>{tip.icon}</div>
                        <div>
                          <h4 className="font-black text-slate-900 text-sm mb-1">{tip.title}</h4>
                          <p className="text-xs text-slate-500 leading-relaxed font-semibold">{tip.text}</p>
                        </div>
                      </div>
                    ))}
                  </div>
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
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  <div className="bg-white rounded-[3rem] p-10 border border-slate-200 shadow-sm">
                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Final Plant Height</p>
                    <div className="flex items-baseline gap-3">
                      <span className="text-7xl sm:text-8xl font-black text-slate-900 tracking-tighter">
                      {finalTimeSeriesPoint ? finalTimeSeriesPoint.plantHeightCm.toFixed(2) : '--'}
                    </span>
                    <span className="text-xl font-bold text-slate-400 uppercase tracking-tighter">cm</span>
                    </div>
                  </div>

                  <div className="bg-white rounded-[3rem] p-10 border border-slate-200 shadow-sm">
                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Final Leaf Count</p>
                    <div className="flex items-baseline gap-3">
                      <span className="text-7xl sm:text-8xl font-black text-slate-900 tracking-tighter">
                        {finalTimeSeriesPoint ? finalTimeSeriesPoint.numLeaves.toFixed(2) : '--'}
                      </span>
                      <span className="text-xl font-bold text-slate-400 uppercase tracking-tighter">leaves</span>
                    </div>
                  </div>
                </div>

              <div className="bg-white rounded-[3rem] p-8 border border-slate-200 shadow-sm">
                <div className="mb-6">
                  <h3 className="text-xl font-black flex items-center gap-3">
                    <TrendingUp size={24} className="text-brand-600" /> Growth Trajectory
                  </h3>
                  <p className="text-sm text-slate-500 mt-1">The time-series prediction is shown as two separate charts for easier reading.</p>
                </div>
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  {timeSeriesChartData.length > 0 ? (
                    <>
                      <div className="rounded-[2rem] border border-slate-100 bg-slate-50/50 p-5">
                        <div className="mb-4">
                          <p className="text-sm font-black text-slate-900">Plant Height</p>
                          <p className="text-xs text-slate-500">Daily predicted height in centimeters.</p>
                        </div>
                        <div className="h-[320px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={timeSeriesChartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                              <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                              <XAxis dataKey="day" stroke="#64748b" tickLine={false} axisLine={false} />
                              <YAxis stroke="#16a34a" tickLine={false} axisLine={false} width={56} />
                              <Tooltip />
                              <Legend />
                              <Line type="monotone" dataKey="plantHeightCm" name="Plant Height (cm)" stroke="#16a34a" strokeWidth={3} dot={false} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      <div className="rounded-[2rem] border border-slate-100 bg-slate-50/50 p-5">
                        <div className="mb-4">
                          <p className="text-sm font-black text-slate-900">Leaf Count</p>
                          <p className="text-xs text-slate-500">Daily predicted number of leaves.</p>
                        </div>
                        <div className="h-[320px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={timeSeriesChartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                              <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                              <XAxis dataKey="day" stroke="#64748b" tickLine={false} axisLine={false} />
                              <YAxis stroke="#2563eb" tickLine={false} axisLine={false} width={56} />
                              <Tooltip />
                              <Legend />
                              <Line type="monotone" dataKey="numLeaves" name="Leaf Count" stroke="#2563eb" strokeWidth={3} dot={false} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="xl:col-span-2 h-[420px] flex flex-col items-center justify-center border-2 border-dashed border-slate-100 rounded-[2rem] text-slate-400 bg-slate-50/50">
                      <EmptyChartState />
                    </div>
                  )}
                </div>
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
