import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  ArrowLeft,
  ArrowUpDown,
  BarChart3,
  Calendar,
  ChevronDown,
  ClipboardList,
  Edit3,
  Eye,
  EyeOff,
  Info,
  Search,
  Sun,
  Thermometer,
  Trash2,
  Wind,
} from 'lucide-react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

function getRecordType(input = {}) {
  if (input.variety) return input.variety;
  if (input.ec || input.light) return [input.ec, input.light].filter(Boolean).join(' / ');
  return 'Record';
}

function getRecordUnit(input = {}) {
  return input.variety ? 'kg/m2' : 'cm';
}

function getRecordOutputLabel(input = {}) {
  return input.variety ? 'Final Yield' : 'Final Plant Height';
}

function DetailItem({ label, value }) {
  return (
    <div className="flex justify-between items-center text-xs">
      <span className="text-slate-400 font-medium">{label}</span>
      <span className="text-slate-900 font-bold">{value}</span>
    </div>
  );
}

export default function HistoryPage() {
  const navigate = useNavigate();

  const [historyData, setHistoryData] = useState(() => {
    return JSON.parse(localStorage.getItem('history') || '[]');
  });
  const [selectedIndices, setSelectedIndices] = useState([]);
  const [compareMode, setCompareMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [sortConfig, setSortConfig] = useState({ key: 'time', direction: 'desc' });
  const [expandedRow, setExpandedRow] = useState(null);

  const saveToStorage = (newData) => {
    setHistoryData(newData);
    localStorage.setItem('history', JSON.stringify(newData));
  };

  const handleRename = (index, currentName) => {
    const newName = prompt('Enter a custom name for this record:', currentName || '');
    if (newName !== null && newName.trim() !== '') {
      const updated = [...historyData];
      updated[index].name = newName.trim();
      saveToStorage(updated);
    }
  };

  const handleDelete = (index) => {
    if (window.confirm('Are you sure you want to delete this record?')) {
      const updated = historyData.filter((_, i) => i !== index);
      saveToStorage(updated);
      setSelectedIndices(prev => prev.filter(i => i !== index));
      if (expandedRow === index) setExpandedRow(null);
    }
  };

  const processedData = useMemo(() => {
    return historyData
      .map((item, index) => ({ ...item, originalIndex: index, recordType: getRecordType(item.input) }))
      .filter(item => {
        const matchesSearch =
          (item.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.recordType.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesType = filterType === 'All' || item.recordType === filterType;
        return matchesSearch && matchesType;
      })
      .sort((a, b) => {
        const aVal = sortConfig.key === 'output' ? a.output : a[sortConfig.key] || a.time;
        const bVal = sortConfig.key === 'output' ? b.output : b[sortConfig.key] || b.time;
        if (sortConfig.direction === 'asc') return aVal > bVal ? 1 : -1;
        return aVal < bVal ? 1 : -1;
      });
  }, [historyData, searchTerm, filterType, sortConfig]);

  const chartData = useMemo(() => {
    return selectedIndices
      .map(idx => ({
        label: historyData[idx]?.name || new Date(historyData[idx]?.time).toLocaleTimeString(),
        output: historyData[idx]?.output,
        timestamp: new Date(historyData[idx]?.time).getTime(),
      }))
      .sort((a, b) => a.timestamp - b.timestamp);
  }, [selectedIndices, historyData]);

  const filterOptions = useMemo(() => {
    return ['All', ...new Set(historyData.map(item => getRecordType(item.input)).filter(Boolean))];
  }, [historyData]);

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="p-2.5 bg-white border border-slate-200 rounded-2xl hover:bg-slate-50 transition-all shadow-sm group"
            >
              <ArrowLeft size={20} className="text-slate-600 group-hover:-translate-x-0.5 transition-transform" />
            </button>
            <div>
              <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">History</h1>
              <p className="text-sm text-slate-500 font-medium italic">Manage and inspect your tomato simulations</p>
            </div>
          </div>

          <button
            onClick={() => {
              setCompareMode(!compareMode);
              if (!compareMode) setSelectedIndices([]);
            }}
            className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-bold transition-all shadow-md ${
              compareMode
                ? 'bg-brand-600 text-white ring-4 ring-brand-100 shadow-brand-200'
                : 'bg-white border border-slate-200 text-slate-700 hover:border-brand-500'
            }`}
          >
            <BarChart3 size={18} />
            {compareMode ? 'Exit Comparison' : 'Compare Analytics'}
          </button>
        </div>

        {compareMode && (
          <div className="bg-white rounded-[2rem] p-8 border border-slate-200 shadow-xl shadow-slate-200/50 animate-in fade-in zoom-in duration-500">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-2 bg-brand-50 rounded-xl">
                <Activity size={20} className="text-brand-600" />
              </div>
              <h3 className="font-bold text-slate-800 text-lg">Prediction Trend Analysis</h3>
            </div>
            {selectedIndices.length > 0 ? (
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="label" fontSize={11} tickLine={false} axisLine={false} dy={10} />
                    <YAxis fontSize={11} tickLine={false} axisLine={false} dx={-10} />
                    <Tooltip contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }} />
                    <Line
                      type="monotone"
                      dataKey="output"
                      stroke="#0ea5e9"
                      strokeWidth={4}
                      dot={{ r: 6, fill: '#0ea5e9', strokeWidth: 2, stroke: '#fff' }}
                      activeDot={{ r: 8 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center border-2 border-dashed border-slate-100 rounded-[2rem] text-slate-400 bg-slate-50/50">
                <Info size={32} className="mb-3 opacity-30" />
                <p className="font-medium">Toggle the checkboxes in the table to compare results</p>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search records..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl outline-none text-sm focus:ring-4 focus:ring-brand-50 shadow-sm"
            />
          </div>
          <div className="relative">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full px-4 py-3.5 bg-white border border-slate-200 rounded-2xl text-sm outline-none appearance-none cursor-pointer focus:ring-4 focus:ring-brand-50 shadow-sm"
            >
              {filterOptions.map(option => <option key={option} value={option}>{option}</option>)}
            </select>
            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
          </div>
          <button
            onClick={() => setSortConfig({ key: 'output', direction: sortConfig.direction === 'asc' ? 'desc' : 'asc' })}
            className="flex items-center justify-center gap-2 px-4 py-3.5 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 hover:bg-slate-50 shadow-sm"
          >
            <ArrowUpDown size={16} className="text-brand-600" /> Sort by Result
          </button>
        </div>

        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                  {compareMode && <th className="p-6 w-12 text-center">Sel</th>}
                  <th className="p-6">Basic Info</th>
                  <th className="p-6">Type</th>
                  <th className="p-6 text-right">Result</th>
                  <th className="p-6 text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {processedData.length > 0 ? (
                  processedData.map((item) => (
                    <React.Fragment key={item.originalIndex}>
                      <tr className={`group transition-all hover:bg-slate-50/60 ${selectedIndices.includes(item.originalIndex) ? 'bg-brand-50/30' : ''}`}>
                        {compareMode && (
                          <td className="p-6 text-center">
                            <input
                              type="checkbox"
                              checked={selectedIndices.includes(item.originalIndex)}
                              onChange={() => {
                                const idx = item.originalIndex;
                                setSelectedIndices(prev =>
                                  prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
                                );
                              }}
                              className="w-5 h-5 rounded-lg border-slate-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
                            />
                          </td>
                        )}
                        <td className="p-6">
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 text-base">{item.name || 'Simulation Record'}</span>
                              <button onClick={() => handleRename(item.originalIndex, item.name)} className="opacity-0 group-hover:opacity-100 p-1 text-slate-300 hover:text-brand-600 transition-opacity">
                                <Edit3 size={14} />
                              </button>
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5 font-bold">
                              <Calendar size={12} /> {new Date(item.time).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                            </div>
                          </div>
                        </td>
                        <td className="p-6">
                          <span className="px-3 py-1 rounded-xl text-[11px] font-extrabold bg-slate-100 text-slate-600 border border-slate-200 tracking-tight">
                            {item.recordType.toUpperCase()}
                          </span>
                        </td>
                        <td className="p-6 text-right">
                          <span className="text-xl font-black text-brand-700">
                            {typeof item.output === 'number' ? item.output.toFixed(2) : '--'}
                          </span>
                          <span className="text-[10px] text-slate-400 ml-1.5 font-black uppercase tracking-tighter">
                            {getRecordUnit(item.input)}
                          </span>
                        </td>
                        <td className="p-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setExpandedRow(expandedRow === item.originalIndex ? null : item.originalIndex)}
                              className={`p-2.5 rounded-xl transition-all ${expandedRow === item.originalIndex ? 'bg-brand-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-100 hover:text-brand-600'}`}
                            >
                              {expandedRow === item.originalIndex ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                            <button onClick={() => handleDelete(item.originalIndex)} className="p-2.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {expandedRow === item.originalIndex && (
                        <tr className="bg-[#fcfdfe]">
                          <td colSpan={compareMode ? 5 : 4} className="p-8">
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 animate-in fade-in slide-in-from-top-4 duration-500">
                              <div className="space-y-4">
                                <div className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">
                                  <Thermometer size={14} className="text-brand-500" /> Core Inputs
                                </div>
                                <div className="space-y-2">
                                  <DetailItem label="Avg Temp" value={item.input?.avgTemperatureC !== undefined ? `${item.input.avgTemperatureC} C` : `${item.input?.environment?.tAirMean ?? '-'} C`} />
                                  <DetailItem label="Min Temp / Start" value={item.input?.minTemperatureC !== undefined ? `${item.input.minTemperatureC} C` : `Day ${item.input?.startDay ?? '-'}`} />
                                  <DetailItem label="Max Temp / End" value={item.input?.maxTemperatureC !== undefined ? `${item.input.maxTemperatureC} C` : `Day ${item.input?.maturityDay ?? '-'}`} />
                                  <DetailItem label="Humidity" value={item.input?.humidityPercent !== undefined ? `${item.input.humidityPercent}%` : `${item.input?.environment?.rhMean ?? '-'}%`} />
                                </div>
                              </div>

                              <div className="space-y-4">
                                <div className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">
                                  <Sun size={14} className="text-orange-500" /> Environment
                                </div>
                                <div className="space-y-2">
                                  <DetailItem label="CO2 Level" value={`${item.input?.co2Ppm ?? item.input?.environment?.co2Mean ?? '-'} ppm`} />
                                  <DetailItem label="Light" value={item.input?.lightIntensityLux !== undefined ? `${item.input.lightIntensityLux} lux` : `${item.input?.light ?? '-'}`} />
                                  <DetailItem label="Light Hrs" value={`${item.input?.photoperiodHours ?? item.input?.environment?.lightOnHoursDaily ?? '-'} h`} />
                                  <DetailItem label="PAR / Water" value={item.input?.irrigationMm !== undefined ? `${item.input.irrigationMm} mm` : `${item.input?.environment?.parLampDaily ?? '-'} daily`} />
                                </div>
                              </div>

                              <div className="space-y-4">
                                <div className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">
                                  <Wind size={14} className="text-blue-500" /> Treatment
                                </div>
                                <div className="space-y-2">
                                  <DetailItem label="Type" value={getRecordType(item.input)} />
                                  <DetailItem label="EC / Variety" value={item.input?.variety ?? item.input?.ec ?? '-'} />
                                  <DetailItem label="Pest / Light" value={item.input?.pestSeverity ?? item.input?.light ?? '-'} />
                                  <DetailItem label="Soil pH" value={item.input?.pH ?? '-'} />
                                </div>
                              </div>

                              <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm flex flex-col justify-center items-center text-center space-y-2">
                                <div className="p-3 bg-brand-50 rounded-full">
                                  <Activity size={24} className="text-brand-600" />
                                </div>
                                <div>
                                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                                    {getRecordOutputLabel(item.input)}
                                  </p>
                                  <p className="text-2xl font-black text-slate-900">
                                    {typeof item.output === 'number' ? item.output.toFixed(2) : '--'} <span className="text-xs">{getRecordUnit(item.input)}</span>
                                  </p>
                                  <p className="text-[10px] text-brand-500 font-bold mt-1">Validated Model</p>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))
                ) : (
                  <tr>
                    <td colSpan={compareMode ? 5 : 4} className="p-20 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <Search size={48} className="text-slate-100" />
                        <p className="text-slate-400 font-medium">No archived simulations match your filters.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
