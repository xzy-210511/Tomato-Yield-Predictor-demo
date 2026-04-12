import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function HistoryPage() {
  const [data, setData] = useState([])
  const navigate = useNavigate()

  useEffect(() => {
    const history = JSON.parse(localStorage.getItem('history') || '[]')
    setData(history)
  }, [])

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-6xl mx-auto">
        
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-xl font-bold">Prediction History</h1>

          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-brand-600 text-white rounded-lg"
          >
            Back
          </button>
        </div>

        <div className="bg-white rounded-xl shadow border overflow-x-auto">
          <table className="w-full text-sm">
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

          {data.length === 0 && (
            <div className="p-6 text-center text-slate-400">
              No history yet
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
