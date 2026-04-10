import { useState } from 'react'
import { Leaf, FlaskConical, AlertCircle, X, Activity, CheckCircle2, RefreshCw } from 'lucide-react'
import { predictGrowth } from '../api/predict'

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

const FIELD_GROUPS = [
  {
    title: 'Climate Inputs',
    description: 'These values describe the greenhouse environment.',
    fields: [
      { key: 'avgTemperatureC', label: 'Average Temperature', type: 'number', step: '0.1', unit: 'C' },
      { key: 'minTemperatureC', label: 'Minimum Temperature', type: 'number', step: '0.1', unit: 'C' },
      { key: 'maxTemperatureC', label: 'Maximum Temperature', type: 'number', step: '0.1', unit: 'C' },
      { key: 'humidityPercent', label: 'Humidity', type: 'number', step: '0.1', unit: '%' },
      { key: 'co2Ppm', label: 'CO2 Concentration', type: 'number', step: '1', unit: 'ppm' },
      { key: 'lightIntensityLux', label: 'Light Intensity', type: 'number', step: '1', unit: 'lux' },
      { key: 'photoperiodHours', label: 'Photoperiod', type: 'number', step: '0.1', unit: 'hours' },
    ],
  },
  {
    title: 'Crop Management Inputs',
    description: 'These values describe irrigation, nutrients, pest pressure, and variety.',
    fields: [
      { key: 'irrigationMm', label: 'Irrigation', type: 'number', step: '0.1', unit: 'mm' },
      { key: 'fertilizerNKgHa', label: 'Fertilizer N', type: 'number', step: '0.1', unit: 'kg/ha' },
      { key: 'fertilizerPKgHa', label: 'Fertilizer P', type: 'number', step: '0.1', unit: 'kg/ha' },
      { key: 'fertilizerKKgHa', label: 'Fertilizer K', type: 'number', step: '0.1', unit: 'kg/ha' },
      { key: 'pestSeverity', label: 'Pest Severity', type: 'number', step: '1', unit: '0-5' },
      { key: 'pH', label: 'pH', type: 'number', step: '0.1', unit: '' },
      { key: 'variety', label: 'Tomato Variety', type: 'select', options: ['Beefsteak', 'Cherry', 'Heirloom', 'Roma'] },
    ],
  },
]

export default function InputPage() {
  const [form, setForm] = useState(INITIAL_FORM)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const [showHistory, setShowHistory] = useState(false)
  const predictedYield = result?.response?.predicted_yield_kg_per_m2

  const updateField = (key, value) => {
    setForm(current => ({ ...current, [key]: value }))
  }

  const handlePredict = async () => {
    setError('')
    setResult(null)

    const emptyField = Object.entries(form).find(([, value]) => String(value).trim() === '')
    if (emptyField) {
      setError('Please complete every field before requesting a prediction.')
      return
    }

    const payload = {
      avgTemperatureC: parseFloat(form.avgTemperatureC),
      minTemperatureC: parseFloat(form.minTemperatureC),
      maxTemperatureC: parseFloat(form.maxTemperatureC),
      humidityPercent: parseFloat(form.humidityPercent),
      co2Ppm: parseFloat(form.co2Ppm),
      lightIntensityLux: parseFloat(form.lightIntensityLux),
      photoperiodHours: parseFloat(form.photoperiodHours),
      irrigationMm: parseFloat(form.irrigationMm),
      fertilizerNKgHa: parseFloat(form.fertilizerNKgHa),
      fertilizerPKgHa: parseFloat(form.fertilizerPKgHa),
      fertilizerKKgHa: parseFloat(form.fertilizerKKgHa),
      pestSeverity: parseFloat(form.pestSeverity),
      pH: parseFloat(form.pH),
      variety: form.variety,
    }

    try {
      setLoading(true);
      // 1. Send a request to the back end
      const response = await predictGrowth(payload); 
      setResult({ response, payload });
  
      // 2. Save the successful result of this time to the localStorage of your browser
      const newRecord = {
        time: new Date().toISOString(),
        input: payload,
        output: response.predicted_yield_kg_per_m2 
      };
  
      // Read the old record, add the new record and save it back
      const existingHistory = JSON.parse(localStorage.getItem('history') || '[]');
      localStorage.setItem('history', JSON.stringify([newRecord, ...existingHistory]));
  
    } catch (e) {
      setError(e.message || 'Prediction failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-brand-600">
              <Leaf className="w-5 h-5 text-white" />
            </div>

            <div>
              <h1 className="text-lg font-semibold text-slate-900 leading-tight">
                Tomato Yield Predictor
              </h1>
              <p className="text-xs text-slate-500">
                Spring Boot + Python model integration
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowHistory(true)}
            className="text-sm px-4 py-2 rounded-lg bg-slate-900 text-white hover:bg-slate-800"
          >
            History
          </button>

        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10 space-y-8">
        <div className="rounded-2xl bg-gradient-to-r from-brand-600 to-brand-700 p-6 text-white shadow-md">
          <p className="text-sm font-medium text-brand-100 mb-1">Feature 134 - Yield Forecast</p>
          <h2 className="text-2xl font-bold mb-2">Predict Tomato Yield From Your Web Form</h2>
          <p className="text-brand-100 text-sm max-w-xl">
            Fill in the greenhouse and fertilizer data below. The values you enter on this page are
            sent to Spring Boot, forwarded to your Python model, and the predicted yield is returned to the result page.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {FIELD_GROUPS.map(group => (
            <section key={group.title} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-800">{group.title}</h3>
                <p className="text-xs text-slate-400 mt-0.5">{group.description}</p>
              </div>

              <div className="space-y-4">
                {group.fields.map(field => (
                  <label key={field.key} className="block">
                    <span className="block text-sm font-medium text-slate-700 mb-1.5">{field.label}</span>
                    {field.type === 'select' ? (
                      <select
                        value={form[field.key]}
                        onChange={e => updateField(field.key, e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-900
                                   focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                      >
                        {field.options.map(option => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    ) : (
                      <div className="relative">
                        <input
                          type={field.type}
                          step={field.step}
                          value={form[field.key]}
                          onChange={e => updateField(field.key, e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-900
                                     focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                        />
                        {field.unit && (
                          <span className="absolute inset-y-0 right-3 flex items-center text-xs text-slate-400">
                            {field.unit}
                          </span>
                        )}
                      </div>
                    )}
                  </label>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h3 className="text-sm font-semibold text-slate-800 mb-2">How the data flows</h3>
          <ol className="text-sm text-slate-600 space-y-1 list-decimal list-inside">
            <li>You enter the base data on this webpage.</li>
            <li>The browser sends the form to Spring Boot at <code>/api/predict</code>.</li>
            <li>Spring Boot forwards the request to your Python model service.</li>
            <li>The model prediction is returned and shown on the results page.</li>
          </ol>
        </div>

        {error && (
          <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-500" />
            <span className="flex-1">{error}</span>
            <button onClick={() => setError('')} className="text-red-400 hover:text-red-600">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="flex justify-end">
          <button
            onClick={handlePredict}
            disabled={loading}
            className="flex items-center gap-2.5 px-7 py-3 rounded-xl bg-brand-600 hover:bg-brand-700
                       text-white font-semibold text-sm shadow-md shadow-brand-600/25
                       disabled:opacity-60 disabled:cursor-not-allowed
                       transition-all active:scale-95"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Analysing...
              </>
            ) : (
              <>
                <FlaskConical className="w-4 h-4" />
                Predict Tomato Yield
              </>
            )}
          </button>
        </div>

        {result && (
          <section className="space-y-6">
            <div className="rounded-2xl bg-gradient-to-r from-brand-600 to-brand-700 px-6 py-5 text-white shadow-md flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                <Activity className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-brand-100">Analysis complete</p>
                <p className="font-semibold">The result below is generated from the values you submitted on this page.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex items-start gap-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-xl shrink-0 bg-brand-600">
                  <Activity className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-0.5">Predicted Yield</p>
                  <p className="text-3xl font-bold text-slate-900 leading-none">
                    {predictedYield.toFixed(2)}
                    <span className="text-base font-semibold text-slate-400 ml-1">kg/m2</span>
                  </p>
                  <p className="text-xs text-slate-400 mt-1">returned by the Python regression model</p>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex items-start gap-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-xl shrink-0 bg-blue-500">
                  <CheckCircle2 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-0.5">Yield Class</p>
                  <p className="text-3xl font-bold text-slate-900 leading-none">
                    {predictedYield >= 20
                      ? 'High yield potential'
                      : predictedYield >= 12
                        ? 'Stable yield potential'
                        : 'Low yield potential'}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">simple interpretation of the returned number</p>
                </div>
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
                  <p className="font-semibold text-slate-800 mb-1">Input Summary</p>
                  <p>
                    Variety: {result.payload.variety}, Avg Temp: {result.payload.avgTemperatureC} C, Humidity: {result.payload.humidityPercent} %,
                    CO2: {result.payload.co2Ppm} ppm
                  </p>
                </div>
              </div>

              <div className="flex justify-end pt-6">
                <button
                  onClick={() => setResult(null)}
                  className="flex items-center gap-2.5 px-6 py-3 rounded-xl border-2 border-brand-600
                             text-brand-600 font-semibold text-sm hover:bg-brand-50 transition active:scale-95"
                >
                  <RefreshCw className="w-4 h-4" />
                  Clear Result
                </button>
              </div>
            </div>
          </section>
        )}
      </main>
      {showHistory && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
          
          {/* modal box */}
          <div className="bg-white w-[90%] max-w-5xl rounded-2xl shadow-xl overflow-hidden">
            
            {/* header */}
            <div className="flex justify-between items-center px-6 py-4 border-b">
              <h2 className="font-semibold text-lg">Prediction History</h2>

              <button
                onClick={() => setShowHistory(false)}
                className="text-slate-500 hover:text-black"
              >
                ✕
              </button>
            </div>

            {/* content */}
            <div className="p-6 max-h-[70vh] overflow-auto">
              {(() => {
                const data = JSON.parse(localStorage.getItem('history') || '[]')

                if (data.length === 0) {
                  return (
                    <p className="text-center text-slate-400 py-10">
                      No history yet
                    </p>
                  )
                }

                return (
                  <table className="w-full text-sm border">
                    <thead className="bg-slate-100">
                      <tr>
                        <th className="p-3 text-left">Time</th>
                        <th className="p-3 text-left">Variety</th>
                        <th className="p-3 text-left">Temp</th>
                        <th className="p-3 text-left">Humidity</th>
                        <th className="p-3 text-left">CO2</th>
                        <th className="p-3 text-left">Yield</th>
                      </tr>
                    </thead>

                    <tbody>
                      {data.map((item, i) => (
                        <tr key={i} className="border-t">
                          <td className="p-3">
                            {new Date(item.time).toLocaleString()}
                          </td>
                          <td className="p-3">{item.input.variety}</td>
                          <td className="p-3">{item.input.avgTemperatureC}</td>
                          <td className="p-3">{item.input.humidityPercent}</td>
                          <td className="p-3">{item.input.co2Ppm}</td>
                          <td className="p-3 font-bold text-brand-600">
                            {item.output?.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
