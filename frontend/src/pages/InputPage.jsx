import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom' 
import { 
  Leaf, FlaskConical, AlertCircle, X, Activity, 
  CheckCircle2, RefreshCw, HelpCircle, LogOut, 
  Wind, Sun, Gauge, Lightbulb, TrendingUp, Bug, Droplets, User, ArrowUpRight
} from 'lucide-react'
import { predictGrowth } from '../api/predict'

const FIELD_INFO = {
  avgTemperatureC: "Average greenhouse temperature (°C). Tip: Measure at plant height.",
  minTemperatureC: "Lowest daily temperature. Tip: Usually occurs just before dawn.",
  maxTemperatureC: "Highest daily temperature. Tip: Ensure proper ventilation above 30°C.",
  humidityPercent: "Relative humidity (%). Ideal: 60–80%. Tip: Higher humidity increases disease risk.",
  co2Ppm: "CO₂ concentration. Tip: 800-1000 ppm can significantly boost yield.",
  lightIntensityLux: "Light intensity. Tip: Measure at the top of the canopy.",
  photoperiodHours: "Daily light hours. Tip: Tomatoes typically need 12-14 hours.",
  irrigationMm: "Daily water amount. Tip: Adjust based on soil moisture depth.",
  fertilizerNKgHa: "Nitrogen. Tip: Essential for leaf and stem growth.",
  fertilizerPKgHa: "Phosphorus. Tip: Crucial for root and flower development.",
  fertilizerKKgHa: "Potassium. Tip: Important for fruit quality and sugar content.",
  pestSeverity: "0–5 scale. 0 = None, 5 = Severe. Tip: Check underside of leaves regularly.",
  pH: "Soil/Solution pH. Ideal: 6.0–6.8. Tip: Affects nutrient availability.",
  variety: "Tomato variety. Different types have varying yield potentials."
}

const INITIAL_FORM = {
  avgTemperatureC: '25', minTemperatureC: '24', maxTemperatureC: '27',
  humidityPercent: '70', co2Ppm: '800', lightIntensityLux: '30000',
  photoperiodHours: '12', irrigationMm: '7', fertilizerNKgHa: '140',
  fertilizerPKgHa: '60', fertilizerKKgHa: '140', pestSeverity: '1',
  pH: '6.5', variety: 'Roma',
}

const PARAMETER_GROUPS = [
  {
    title: 'Climate Matrix',
    icon: <Sun size={18} className="text-orange-500" />,
    fields: [
      { key: 'avgTemperatureC', label: 'Avg Temp', unit: '°C', min: 10, max: 45, step: 0.1 },
      { key: 'minTemperatureC', label: 'Min Temp', unit: '°C', min: 5, max: 35, step: 0.1 },
      { key: 'maxTemperatureC', label: 'Max Temp', unit: '°C', min: 15, max: 50, step: 0.1 },
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

function generateSuggestions(payload, yieldKg) {
  const suggestions = []

  if (payload.avgTemperatureC < 18) {
    suggestions.push({
      title: 'Increase Growing Temperature',
      text: `Average temperature is ${payload.avgTemperatureC} deg C. Tomatoes perform best around 21-27 deg C, so raise greenhouse temperature gradually to improve photosynthesis and fruit set.`,
      icon: <Sun />,
      color: 'orange',
      priority: 2,
    })
  } else if (payload.avgTemperatureC > 30) {
    suggestions.push({
      title: 'Reduce Heat Stress',
      text: `At ${payload.avgTemperatureC} deg C, tomatoes may lose fruit set from heat stress. Use shading, ventilation, or evaporative cooling to keep daytime temperature below 29 deg C.`,
      icon: <Sun />,
      color: 'orange',
      priority: 1,
    })
  } else {
    suggestions.push({
      title: 'Temperature Range Is Strong',
      text: `Average temperature of ${payload.avgTemperatureC} deg C is within a healthy tomato growth range. Keep day and night swings consistent to avoid plant stress.`,
      icon: <CheckCircle2 />,
      color: 'emerald',
      priority: 5,
    })
  }

  if (payload.co2Ppm < 600) {
    suggestions.push({
      title: 'Boost CO2 Concentration',
      text: `CO2 is ${payload.co2Ppm} ppm. Raising it toward 800-1000 ppm during light hours can improve photosynthesis and yield potential.`,
      icon: <Wind />,
      color: 'blue',
      priority: 1,
    })
  } else if (payload.co2Ppm >= 800) {
    suggestions.push({
      title: 'CO2 Enrichment Is Effective',
      text: `CO2 at ${payload.co2Ppm} ppm supports active photosynthesis. Keep delivery synchronized with daylight so enrichment is not wasted overnight.`,
      icon: <CheckCircle2 />,
      color: 'emerald',
      priority: 5,
    })
  } else {
    suggestions.push({
      title: 'Increase CO2 Slightly',
      text: `CO2 at ${payload.co2Ppm} ppm is workable but not fully optimized. A moderate increase toward 800 ppm may improve growth under strong lighting.`,
      icon: <Wind />,
      color: 'blue',
      priority: 3,
    })
  }

  if (payload.pH < 6.0) {
    suggestions.push({
      title: 'Raise Nutrient Solution pH',
      text: `pH ${payload.pH} is below the ideal 6.0-6.8 range. Low pH can limit calcium and magnesium uptake, so correct it gradually with a pH-up solution.`,
      icon: <Gauge />,
      color: 'orange',
      priority: 1,
    })
  } else if (payload.pH > 6.8) {
    suggestions.push({
      title: 'Lower Nutrient Solution pH',
      text: `pH ${payload.pH} may reduce iron and manganese availability. Bring it back toward 6.0-6.5 with a dilute acid adjustment.`,
      icon: <Gauge />,
      color: 'orange',
      priority: 1,
    })
  } else {
    suggestions.push({
      title: 'pH Is In Range',
      text: `pH ${payload.pH} is well placed for nutrient absorption. Monitor daily and correct drift before it moves outside 6.0-6.8.`,
      icon: <CheckCircle2 />,
      color: 'emerald',
      priority: 5,
    })
  }

  if (payload.pestSeverity > 2) {
    suggestions.push({
      title: 'Control Pest Pressure',
      text: `Pest severity is ${payload.pestSeverity}/5. Use integrated pest management: inspect every 48 hours, remove affected leaves, and apply targeted treatment early.`,
      icon: <Bug />,
      color: 'red',
      priority: 0,
    })
  }

  if (payload.photoperiodHours < 10) {
    suggestions.push({
      title: 'Extend Daily Light Period',
      text: `Photoperiod is ${payload.photoperiodHours} hours. Tomatoes usually benefit from 12-16 hours of useful light, so consider supplemental LED lighting.`,
      icon: <Lightbulb />,
      color: 'blue',
      priority: 2,
    })
  }

  if (payload.irrigationMm < 3) {
    suggestions.push({
      title: 'Increase Irrigation Consistency',
      text: `Irrigation is ${payload.irrigationMm} mm. Review moisture levels around the root zone and avoid long dry periods during flowering and fruit fill.`,
      icon: <Droplets />,
      color: 'blue',
      priority: 2,
    })
  }

  if (yieldKg < 12) {
    suggestions.push({
      title: 'Review Fertiliser Programme',
      text: `Predicted yield is ${yieldKg.toFixed(2)} kg/m2. Check the current N:P:K balance of ${payload.fertilizerNKgHa}:${payload.fertilizerPKgHa}:${payload.fertilizerKKgHa}, especially potassium during fruiting.`,
      icon: <FlaskConical />,
      color: 'orange',
      priority: 1,
    })
  } else if (yieldKg >= 20) {
    suggestions.push({
      title: 'Save This Baseline',
      text: `Predicted yield of ${yieldKg.toFixed(2)} kg/m2 is strong. Keep these settings as a benchmark for future runs and compare changes against it.`,
      icon: <TrendingUp />,
      color: 'emerald',
      priority: 4,
    })
  }

  return suggestions
    .sort((a, b) => a.priority - b.priority)
    .slice(0, 4)
}

export default function InputPage() {
  const [form, setForm] = useState(INITIAL_FORM)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const navigate = useNavigate()
  const user = localStorage.getItem('user')
  const predictedYield = result?.response?.predicted_yield_kg_per_m2

  const updateField = (key, value) => setForm(prev => ({ ...prev, [key]: value }))

  const bottleneck = useMemo(() => {
    if (!result) return null;
    const f = form;
    if (parseFloat(f.pestSeverity) >= 3) return { type: 'Pest', label: 'Pest Level', desc: 'Critical pest levels detected.', icon: <Bug />, color: 'red' };
    if (parseFloat(f.co2Ppm) < 600) return { type: 'CO2', label: 'CO2 Level', desc: 'Low CO2 is limiting photosynthesis.', icon: <Wind />, color: 'blue' };
    if (parseFloat(f.pH) < 5.8 || parseFloat(f.pH) > 7.2) return { type: 'pH', label: 'Soil pH', desc: 'pH imbalance is affecting nutrient uptake.', icon: <Gauge />, color: 'orange' };
    return { type: 'Optimized', label: 'Balanced', desc: 'Metabolic rates are within optimal range.', icon: <CheckCircle2 />, color: 'emerald' };
  }, [result, form]);

  const handlePredict = async () => {
    setLoading(true); 
    setError('');
    setResult(null);
    try {
      const payload = Object.fromEntries(
        Object.entries(form).map(([k, v]) => [k, k === 'variety' ? v : parseFloat(v)])
      )
      const response = await predictGrowth(payload)
      if (response && response.predicted_yield_kg_per_m2 !== undefined) {
        setResult({ response, payload })
        const history = JSON.parse(localStorage.getItem('history') || '[]')
        localStorage.setItem('history', JSON.stringify([{ time: new Date().toISOString(), input: payload, output: response.predicted_yield_kg_per_m2 }, ...history]))
      } else { 
        throw new Error("Invalid response format.") 
      }
    } catch (e) { 
      setError(e.message || 'Simulation failed.') 
    } finally { 
      setLoading(false) 
    }
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans">
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-[1400px] mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-600 flex items-center justify-center shadow-lg shadow-brand-200"><Leaf className="text-white" size={22} /></div>
            <h1 className="text-xl font-black tracking-tight uppercase italic">Tomato<span className="text-brand-600">Lab</span></h1>
          </div>
          <div className="flex items-center gap-6">
            <button onClick={() => navigate('/history')} className="text-sm font-bold text-slate-500 hover:text-brand-600 transition-colors">History</button>
            {user ? (
              <div className="flex items-center gap-4 px-4 py-2 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-xs font-black text-slate-700 flex items-center gap-2"><User size={14}/> {user}</span>
                <button onClick={() => { localStorage.removeItem('user'); window.location.reload(); }} className="text-xs font-bold text-red-500 hover:text-red-600">Logout</button>
              </div>
            ) : (
              <button onClick={() => navigate('/login')} className="px-6 py-2 bg-slate-900 text-white rounded-xl text-xs font-black hover:bg-brand-600 transition-all shadow-lg shadow-slate-200">Sign In</button>
            )}
          </div>
        </div>
      </nav>

      <main className="max-w-[1400px] mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          <div className="lg:col-span-5 xl:col-span-4">
            <div className="bg-white rounded-[2.5rem] p-8 border border-slate-200 shadow-sm sticky top-24">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-lg font-black flex items-center gap-2"><Activity size={20} className="text-brand-600"/> Lab Settings</h2>
                <button onClick={() => setForm(INITIAL_FORM)} className="text-[10px] font-black text-slate-300 hover:text-brand-600 uppercase tracking-widest transition-colors">Reset</button>
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
                          <input 
                            type="number" step={field.step} value={form[field.key]} 
                            onChange={(e) => updateField(field.key, e.target.value)}
                            className="w-16 text-right bg-transparent text-xs font-black text-brand-600 outline-none"
                          />
                        </div>
                        <input 
                          type="range" min={field.min} max={field.max} step={field.step}
                          value={form[field.key]} onChange={(e) => updateField(field.key, e.target.value)}
                          className="w-full h-1 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-brand-600"
                        />
                      </div>
                    ))}
                  </div>
                ))}
                
                <div className="pt-4">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3">Variety Selection</label>
                  <select 
                    value={form.variety} onChange={(e) => updateField('variety', e.target.value)}
                    className="w-full p-4 bg-slate-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-brand-500 outline-none transition-all"
                  >
                    {['Beefsteak', 'Cherry', 'Heirloom', 'Roma'].map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
              </div>

              <button 
                onClick={handlePredict} disabled={loading}
                className="w-full mt-8 py-4 bg-brand-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-brand-100 hover:bg-brand-700 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {loading ? <RefreshCw className="animate-spin" size={18}/> : <TrendingUp size={18}/>}
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
                      <span className="text-7xl sm:text-8xl font-black text-slate-900 tracking-tighter">
                        {predictedYield.toFixed(2)}
                      </span>
                      <span className="text-xl font-bold text-slate-400 uppercase tracking-tighter">kg/m²</span>
                    </div>
                  </div>

                  <div className="bg-slate-900 rounded-[3rem] p-10 text-white shadow-2xl flex flex-col justify-between relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-10">
                      <TrendingUp size={120} />
                    </div>
                    <div>
                      <h3 className="text-xl font-black mb-1 italic tracking-tight">Optimization Focus</h3>
                      <p className="text-brand-400 text-[10px] font-black uppercase tracking-widest mb-6 underline decoration-brand-400/30 underline-offset-4">Current Bottleneck</p>
                      
                      <div className="flex items-center gap-4 relative z-10">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg ${
                          bottleneck.color === 'red' ? 'bg-red-500' : 
                          bottleneck.color === 'blue' ? 'bg-blue-500' : 
                          bottleneck.color === 'orange' ? 'bg-orange-500' : 'bg-emerald-500'
                        }`}>
                          {bottleneck.icon}
                        </div>
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

                {/* AI Advice Grid */}
                <div className="bg-white rounded-[3rem] p-10 border border-slate-200 shadow-sm">
                  <h3 className="text-xl font-black mb-10 flex items-center gap-3">
                    <Lightbulb size={24} className="text-amber-500" /> AI Optimization Advisor
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {generateSuggestions(result.payload, predictedYield).map((tip, i) => (
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
      </main>

      {error && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-red-600 text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-4 animate-in slide-in-from-bottom-10 z-[100]">
          <AlertCircle size={20} />
          <span className="text-sm font-bold">{error}</span>
          <button onClick={() => setError('')} className="p-1 hover:bg-white/20 rounded-lg"><X size={16}/></button>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
      `}} />
    </div>
  )
}
