import { useLocation, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import {
  Leaf, ArrowLeft, Thermometer, Droplets,
  FlaskConical, Activity, RefreshCw, CheckCircle2
} from 'lucide-react'

function MetricCard({ icon: Icon, iconBg, label, value, unit, sub }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex items-start gap-4">
      <div className={`flex items-center justify-center w-12 h-12 rounded-xl shrink-0 ${iconBg}`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div>
        <p className="text-xs font-medium text-slate-500 mb-0.5">{label}</p>
        <p className="text-3xl font-bold text-slate-900 leading-none">
          {value}
          {unit && <span className="text-base font-semibold text-slate-400 ml-1">{unit}</span>}
        </p>
        {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
      </div>
    </div>
  )
}

function StatChip({ icon: Icon, color, label, value }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-4 py-3 flex items-center gap-3">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>
        <Icon className="w-4 h-4 text-white" />
      </div>
      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-sm font-semibold text-slate-800">{value}</p>
      </div>
    </div>
  )
}

export default function ResultsPage() {
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    if (!location.state?.result) navigate('/', { replace: true })
  }, [location.state, navigate])

  if (!location.state?.result) return null

  const { result, payload } = location.state
  const predictedYield = result.predictedYieldKgPerM2
  const estimatedClass = predictedYield >= 20
    ? 'High yield potential'
    : predictedYield >= 12
      ? 'Stable yield potential'
      : 'Low yield potential'

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition mr-1"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-brand-600">
            <Leaf className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <h1 className="text-lg font-semibold text-slate-900 leading-tight">Tomato Yield Predictor</h1>
            <p className="text-xs text-slate-500">Prediction Results</p>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10 space-y-8">
        <div className="rounded-2xl bg-gradient-to-r from-brand-600 to-brand-700 px-6 py-5 text-white shadow-md flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-medium text-brand-100">Analysis complete</p>
            <p className="font-semibold">
              The result below is generated from the values you submitted on the web form.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <MetricCard
            icon={Activity}
            iconBg="bg-brand-600"
            label="Predicted Yield"
            value={predictedYield.toFixed(2)}
            unit="kg/m2"
            sub="returned by the Python regression model"
          />
          <MetricCard
            icon={CheckCircle2}
            iconBg="bg-blue-500"
            label="Yield Class"
            value={estimatedClass}
            unit=""
            sub="simple interpretation of the returned number"
          />
        </div>

        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Input Summary</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatChip icon={Thermometer} color="bg-orange-400" label="Avg Temperature" value={`${payload.avgTemperatureC} C`} />
            <StatChip icon={Droplets} color="bg-blue-400" label="Humidity" value={`${payload.humidityPercent} %`} />
            <StatChip icon={FlaskConical} color="bg-purple-500" label="CO2" value={`${payload.co2Ppm} ppm`} />
            <StatChip icon={Activity} color="bg-brand-600" label="Variety" value={payload.variety} />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-5">
            <CheckCircle2 className="w-5 h-5 text-brand-600" />
            <h3 className="text-sm font-semibold text-slate-800">Prediction Outcome</h3>
          </div>

          <div className="flex flex-col items-center py-6 mb-6 bg-brand-50 rounded-xl border border-brand-100">
            <p className="text-xs font-medium text-brand-600 uppercase tracking-widest mb-2">
              Estimated Tomato Yield
            </p>
            <p className="text-7xl font-bold text-brand-700 leading-none">
              {predictedYield.toFixed(2)}
            </p>
            <p className="text-base text-brand-500 font-medium mt-2">kg per square meter</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-slate-600">
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
              <p className="font-semibold text-slate-800 mb-1">Where the result came from</p>
              <p>Spring Boot received your webpage data, called the Python FastAPI service, and returned the model output here.</p>
            </div>
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
              <p className="font-semibold text-slate-800 mb-1">What to do next</p>
              <p>You can store these inputs in your database later, compare runs, and keep building a prediction history.</p>
            </div>
          </div>
        </div>

        <div className="flex justify-end pb-6">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2.5 px-6 py-3 rounded-xl border-2 border-brand-600
                       text-brand-600 font-semibold text-sm hover:bg-brand-50 transition active:scale-95"
          >
            <RefreshCw className="w-4 h-4" />
            New Prediction
          </button>
        </div>
      </main>
    </div>
  )
}
