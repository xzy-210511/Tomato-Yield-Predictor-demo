import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ChevronRight,
  Droplets,
  FlaskConical,
  HelpCircle,
  Leaf,
  Minus,
  RefreshCw,
  Sparkles,
  Sprout,
  Thermometer,
  TrendingUp,
  User,
  Wind,
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
import { predictTimeSeries } from '../api/predict'
import NsScheduleTimeline from '../components/NsScheduleTimeline'
import {
  EC_OPTIONS,
  FIELD_INFO_TS,
  INITIAL_TS_FORM,
  LIGHT_OPTIONS,
  TS_GROUPS,
} from '../lib/tsConfig'
import { getPolicyInfo } from '../lib/nsPolicies'

const POLICY_COLORS = {
  cyan: { ring: 'ring-cyan-500', icon: 'bg-cyan-500', tag: 'bg-cyan-100 text-cyan-700' },
  amber: { ring: 'ring-amber-500', icon: 'bg-amber-500', tag: 'bg-amber-100 text-amber-700' },
  slate: { ring: 'ring-slate-500', icon: 'bg-slate-500', tag: 'bg-slate-100 text-slate-700' },
}

const POLICY_ICON_MAP = { Droplets, FlaskConical, HelpCircle }
const GROUP_ICON_MAP = { Thermometer, Wind }

function PolicyCard({ info, active }) {
  const palette = POLICY_COLORS[info.color] || POLICY_COLORS.slate
  const Icon = POLICY_ICON_MAP[info.icon] || HelpCircle
  return (
    <div
      className={`bg-white rounded-[2.5rem] p-7 border border-slate-200 transition-all ${
        active ? `ring-2 ${palette.ring} shadow-lg` : 'opacity-60 hover:opacity-100'
      }`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white ${palette.icon}`}>
          <Icon size={22} />
        </div>
        {active && (
          <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-brand-100 text-brand-700">
            Active
          </span>
        )}
      </div>
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{info.tagline}</p>
      <h4 className="text-lg font-black text-slate-900 mb-1">{info.label}</h4>
      <span className={`inline-block text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md mb-3 ${palette.tag}`}>
        {info.ecBand}
      </span>
      <p className="text-xs text-slate-600 font-semibold leading-relaxed mb-2">
        <span className="text-slate-400 font-black uppercase tracking-widest text-[10px] block mb-1">When</span>
        {info.when}
      </p>
      <p className="text-xs text-slate-600 font-semibold leading-relaxed">
        <span className="text-slate-400 font-black uppercase tracking-widest text-[10px] block mb-1">Why</span>
        {info.why}
      </p>
    </div>
  )
}

function StatCard({ label, value, unit, accentClass, icon: Icon, trendIcon: TrendIcon, trendClass }) {
  return (
    <div className="bg-white rounded-[3rem] p-8 border border-slate-200 shadow-sm relative overflow-hidden">
      <div className="absolute -right-3 -bottom-3 opacity-5"><Icon size={140} /></div>
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white ${accentClass}`}>
          <Icon size={18} />
        </div>
        <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">{label}</p>
      </div>
      <div className="flex items-baseline gap-2 relative z-10">
        <span className="text-5xl font-black text-slate-900 tracking-tighter">{value}</span>
        <span className="text-sm font-bold text-slate-400 uppercase tracking-tighter">{unit}</span>
        {TrendIcon && (
          <TrendIcon size={20} className={`ml-2 ${trendClass}`} />
        )}
      </div>
    </div>
  )
}

export default function GrowthTestPage() {
  const navigate = useNavigate()
  const user = localStorage.getItem('user')

  const [form, setForm] = useState(INITIAL_TS_FORM)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const [chartsOpen, setChartsOpen] = useState(false)

  const updateField = (key, value) => setForm(prev => ({ ...prev, [key]: value }))

  const predictions = result?.predictions ?? []

  const chartData = useMemo(
    () => predictions.map(p => ({
      day: p.days_after_transplant,
      plantHeightCm: p.plant_height_cm,
      numLeaves: p.num_leaves,
    })),
    [predictions]
  )

  const kpis = useMemo(() => {
    if (!predictions.length) {
      return { finalHeight: null, finalLeaves: null, windowDays: 0, dominantPolicy: null }
    }
    const last = predictions[predictions.length - 1]
    const windowDays = predictions.length
    const policyCounts = {}
    for (const p of predictions) {
      policyCounts[p.ns_policy] = (policyCounts[p.ns_policy] || 0) + 1
    }
    const dominant = Object.entries(policyCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
    return {
      finalHeight: last.plant_height_cm,
      finalLeaves: last.num_leaves,
      windowDays,
      dominantPolicy: dominant,
    }
  }, [predictions])

  const distinctPolicies = useMemo(() => {
    const set = new Set()
    for (const p of predictions) if (p.ns_policy) set.add(p.ns_policy)
    return Array.from(set)
  }, [predictions])

  const nsTotals = useMemo(() => {
    if (!predictions.length) {
      return { totalNew: 0, totalAdded: 0, finalResidual: 0, waterSavingPct: 0, fertilizerSavingPct: 0 }
    }
    let totalNew = 0
    let totalAdded = 0
    let peakDailyNew = 0
    for (const p of predictions) {
      const fresh = p.ns_new_per_plant_l ?? 0
      const added = p.ns_added_per_plant_l ?? 0
      totalNew += fresh
      totalAdded += added
      if (fresh > peakDailyNew) peakDailyNew = fresh
    }
    const finalResidual = predictions[predictions.length - 1].ns_residual_per_plant_l ?? 0
    const totalSupply = totalNew + totalAdded
    const baselineSupply = predictions.length * peakDailyNew
    const waterSavingPct = baselineSupply > 0 ? Math.max(0, 1 - totalSupply / baselineSupply) : 0
    return {
      totalNew,
      totalAdded,
      finalResidual,
      waterSavingPct,
      fertilizerSavingPct: waterSavingPct,
    }
  }, [predictions])

  const handlePredict = async () => {
    setLoading(true)
    setError('')
    setResult(null)
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
      if (!response || !Array.isArray(response.predictions)) {
        throw new Error('Invalid time-series response format.')
      }
      setResult(response)
    } catch (e) {
      setError(e.message || 'Time-series forecast failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans">
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-[1400px] mx-auto px-6 py-4 flex items-center justify-between">
          <button onClick={() => navigate('/')} className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-2xl bg-brand-600 flex items-center justify-center shadow-lg shadow-brand-200">
              <Leaf className="text-white" size={22} />
            </div>
            <h1 className="text-xl font-black tracking-tight uppercase italic">
              Tomato<span className="text-brand-600">Lab</span>
            </h1>
          </button>
          <div className="flex items-center gap-6">
            <button onClick={() => navigate('/')} className="text-sm font-bold text-slate-500 hover:text-brand-600 transition-colors">
              Yield
            </button>
            <button className="text-sm font-black text-brand-600">
              Growth Test
            </button>
            <button onClick={() => navigate('/history')} className="text-sm font-bold text-slate-500 hover:text-brand-600 transition-colors">
              History
            </button>
            {user ? (
              <div className="flex items-center gap-4 px-4 py-2 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-xs font-black text-slate-700 flex items-center gap-2">
                  <User size={14} /> {user}
                </span>
                <button onClick={() => { localStorage.removeItem('user'); window.location.reload() }} className="text-xs font-bold text-red-500 hover:text-red-600">
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
        <header className="flex items-end justify-between flex-wrap gap-4">
          <div>
            <p className="text-[11px] font-black text-brand-600 uppercase tracking-[0.3em] mb-2">Branch Growth Test</p>
            <h2 className="text-3xl font-black tracking-tight">分支生长 + 营养液调度预测</h2>
            <p className="text-sm text-slate-500 mt-2 max-w-2xl font-medium">
              Recursively forecasts daily plant height, leaf count and nutrient-solution scheduling under a locked environment treatment.
            </p>
          </div>
          {error && (
            <div className="px-4 py-2 rounded-2xl bg-red-50 border border-red-100 text-xs font-bold text-red-600">
              {error}
            </div>
          )}
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-4">
            <div className="bg-white rounded-[2.5rem] p-8 border border-slate-200 shadow-sm sticky top-24">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-lg font-black flex items-center gap-2">
                  <Sprout size={20} className="text-brand-600" /> Forecast Settings
                </h3>
                <button
                  onClick={() => setForm(INITIAL_TS_FORM)}
                  className="text-[10px] font-black text-slate-300 hover:text-brand-600 uppercase tracking-widest transition-colors"
                >
                  Reset
                </button>
              </div>

              <div className="space-y-6">
                {TS_GROUPS.map(group => {
                  const Icon = GROUP_ICON_MAP[group.iconName] || Wind
                  return (
                    <div key={group.title} className="space-y-4">
                      <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-2">
                        <Icon size={18} className={group.iconColor} /> {group.title}
                      </div>
                      {group.fields.map(field => (
                        <div key={field.key} className="group relative">
                          <div className="flex justify-between items-center mb-1.5">
                            <label className="text-[11px] font-bold text-slate-500 group-hover:text-brand-600 transition-colors">
                              {field.label} <span className="text-slate-300">({field.unit})</span>
                            </label>
                            <input
                              type="number"
                              step={field.step}
                              value={form[field.key]}
                              onChange={e => updateField(field.key, e.target.value)}
                              className="w-20 text-right bg-transparent text-xs font-black text-brand-600 outline-none"
                            />
                          </div>
                          <input
                            type="range"
                            min={field.min}
                            max={field.max}
                            step={field.step}
                            value={form[field.key]}
                            onChange={e => updateField(field.key, e.target.value)}
                            className="w-full h-1 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-brand-600"
                          />
                          <p className="text-[10px] text-slate-400 mt-1 leading-tight">{FIELD_INFO_TS[field.key]}</p>
                        </div>
                      ))}
                    </div>
                  )
                })}

                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3">EC Treatment</label>
                    <select
                      value={form.ec}
                      onChange={e => updateField('ec', e.target.value)}
                      className="w-full p-4 bg-slate-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-brand-500 outline-none transition-all"
                    >
                      {EC_OPTIONS.map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3">Light Treatment</label>
                    <select
                      value={form.light}
                      onChange={e => updateField('light', e.target.value)}
                      className="w-full p-4 bg-slate-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-brand-500 outline-none transition-all"
                    >
                      {LIGHT_OPTIONS.map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <button
                onClick={handlePredict}
                disabled={loading}
                className="w-full mt-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-slate-200 hover:bg-brand-600 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {loading ? <RefreshCw className="animate-spin" size={18} /> : <TrendingUp size={18} />}
                {loading ? 'Forecasting...' : 'Run Time-Series'}
              </button>
            </div>
          </div>

          <div className="lg:col-span-8 space-y-6">
            {!result ? (
              <div className="bg-white rounded-[3rem] border-2 border-dashed border-slate-100 p-16 text-center">
                <div className="w-24 h-24 mx-auto bg-slate-50 rounded-full flex items-center justify-center mb-6 animate-pulse text-slate-200">
                  <Sprout size={40} />
                </div>
                <h3 className="text-2xl font-black text-slate-300 tracking-tight italic">Awaiting Forecast</h3>
                <p className="text-slate-400 text-sm max-w-md mx-auto mt-3 font-medium italic">
                  Adjust the locked environment & treatment, then run the time-series.
                </p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                  <StatCard
                    label="Final Plant Height"
                    value={kpis.finalHeight != null ? kpis.finalHeight.toFixed(1) : '--'}
                    unit="cm"
                    accentClass="bg-brand-600"
                    icon={Sprout}
                  />
                  <StatCard
                    label="Final Leaf Count"
                    value={kpis.finalLeaves != null ? kpis.finalLeaves.toFixed(1) : '--'}
                    unit="leaves"
                    accentClass="bg-blue-500"
                    icon={Leaf}
                  />
                  <StatCard
                    label="Forecast Window"
                    value={kpis.windowDays || '--'}
                    unit="days"
                    accentClass="bg-slate-700"
                    icon={Thermometer}
                  />
                  <div className="bg-slate-900 rounded-[3rem] p-8 text-white shadow-xl relative overflow-hidden">
                    <div className="absolute -right-2 -bottom-2 opacity-10"><FlaskConical size={130} /></div>
                    <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3">Active Policy</p>
                    {kpis.dominantPolicy ? (
                      <>
                        <p className="text-3xl font-black tracking-tighter mb-1">{getPolicyInfo(kpis.dominantPolicy).label}</p>
                        <p className="text-xs font-bold text-brand-400">{getPolicyInfo(kpis.dominantPolicy).tagline}</p>
                      </>
                    ) : (
                      <p className="text-sm text-slate-400">--</p>
                    )}
                  </div>
                </div>

                <NsScheduleTimeline predictions={predictions} />

                <div className="bg-white rounded-[3rem] p-8 border border-slate-200 shadow-sm">
                  <div className="mb-6">
                    <h3 className="text-xl font-black flex items-center gap-3">
                      <Sparkles size={20} className="text-amber-500" /> Policy Library
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 font-semibold">
                      The model picks an EC strategy based on treatment. The active policy is highlighted.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {distinctPolicies.map(name => (
                      <PolicyCard
                        key={name}
                        info={getPolicyInfo(name)}
                        active={kpis.dominantPolicy === name}
                      />
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  <StatCard
                    label="Total Fresh NS"
                    value={nsTotals.totalNew.toFixed(2)}
                    unit="L/plant"
                    accentClass="bg-orange-500"
                    icon={Droplets}
                  />
                  <StatCard
                    label="Total Added NS"
                    value={nsTotals.totalAdded.toFixed(2)}
                    unit="L/plant"
                    accentClass="bg-cyan-500"
                    icon={Droplets}
                  />
                  <StatCard
                    label="Water Saving"
                    value={(nsTotals.waterSavingPct * 100).toFixed(1)}
                    unit="%"
                    accentClass="bg-emerald-500"
                    icon={Droplets}
                    trendIcon={nsTotals.waterSavingPct > 0 ? TrendingUp : Minus}
                    trendClass={nsTotals.waterSavingPct > 0 ? 'text-emerald-500' : 'text-slate-300'}
                  />
                  <StatCard
                    label="Fertilizer Saving"
                    value={(nsTotals.fertilizerSavingPct * 100).toFixed(1)}
                    unit="%"
                    accentClass="bg-emerald-500"
                    icon={FlaskConical}
                    trendIcon={nsTotals.fertilizerSavingPct > 0 ? TrendingUp : Minus}
                    trendClass={nsTotals.fertilizerSavingPct > 0 ? 'text-emerald-500' : 'text-slate-300'}
                  />
                </div>

                <details
                  open={chartsOpen}
                  onToggle={e => setChartsOpen(e.currentTarget.open)}
                  className="bg-white rounded-[3rem] p-8 border border-slate-200 shadow-sm"
                >
                  <summary className="cursor-pointer list-none flex items-center justify-between">
                    <h3 className="text-xl font-black flex items-center gap-3">
                      <TrendingUp size={20} className="text-brand-600" /> Advanced Charts
                    </h3>
                    <ChevronRight
                      size={20}
                      className={`text-slate-400 transition-transform duration-200 ${chartsOpen ? 'rotate-90' : ''}`}
                    />
                  </summary>
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mt-6">
                    <div className="rounded-[2rem] border border-slate-100 bg-slate-50/50 p-5">
                      <div className="mb-4">
                        <p className="text-sm font-black text-slate-900">Plant Height</p>
                        <p className="text-xs text-slate-500">Daily predicted height in centimeters.</p>
                      </div>
                      <div className="h-[320px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
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
                          <LineChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
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
                  </div>
                </details>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
