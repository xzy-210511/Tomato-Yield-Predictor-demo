import React, { useEffect, useMemo, useState } from 'react';
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
import { deleteRecord, listRecords, renameRecord } from '../api/records';

const SERIES_COLORS = ['#0ea5e9', '#22c55e', '#f97316', '#8b5cf6', '#ef4444', '#14b8a6'];

function buildTimeSeriesData(output = {}) {
  let cumulativeNs = 0;
  return (output.predictions || []).map(point => {
    const nsNew = point.ns_new_per_plant_l ?? 0;
    const nsAdded = point.ns_added_per_plant_l ?? 0;
    const dailyNs = nsNew + nsAdded;
    cumulativeNs += dailyNs;

    return {
      day: point.days_after_transplant,
      plantHeightCm: point.plant_height_cm,
      numLeaves: point.num_leaves,
      dailyNs,
      cumulativeNs,
    };
  });
}

function normalizeRecord(record) {
  const input = record.input || {};
  const rawOutput = record.output || {};
  const savedRecordType = record.recordType;
  const isTimeSeries = savedRecordType === 'timeseries';
  const seriesData = isTimeSeries ? buildTimeSeriesData(rawOutput) : [];
  const lastPoint = seriesData.at(-1) || {};
  const summary = rawOutput.summary || {};

  return {
    id: record.id,
    name: record.recordName,
    time: record.createdAt,
    input,
    output: record.summaryValue,
    rawOutput,
    savedRecordType,
    finalPlantHeight: summary.finalPlantHeight ?? lastPoint.plantHeightCm,
    finalLeafCount: summary.finalLeafCount ?? lastPoint.numLeaves,
    totalNsSupply: summary.totalNsSupply ?? lastPoint.cumulativeNs,
    totalFreshNs: summary.totalFreshNs,
    totalAddedNs: summary.totalAddedNs,
    seriesData,
  };
}

function isTimeSeriesRecord(record = {}) {
  return record.savedRecordType === 'timeseries' || !!record.input?.ec || !!record.input?.light;
}

function isYieldRecord(record = {}) {
  return !isTimeSeriesRecord(record) && typeof record.output === 'number' && Number.isFinite(record.output);
}

function isComparableRecord(record = {}) {
  return isYieldRecord(record) || (isTimeSeriesRecord(record) && record.seriesData?.length > 0);
}

function getComparisonKind(record = {}) {
  if (isYieldRecord(record)) return 'yield';
  if (isTimeSeriesRecord(record) && record.seriesData?.length > 0) return 'timeseries';
  return null;
}

function canSelectForComparison(record, selectedRecords) {
  if (!isComparableRecord(record)) return false;
  const selectedKind = getComparisonKind(selectedRecords[0]);
  return !selectedKind || getComparisonKind(record) === selectedKind;
}

function getRecordType(input = {}, record = {}) {
  if (isTimeSeriesRecord(record)) return 'Time-Series';
  if (input.variety) return input.variety;
  return 'Record';
}

function getRecordUnit(input = {}, record = {}) {
  if (isTimeSeriesRecord(record)) return 'cm';
  return input.variety ? 'kg/m2' : '';
}

function getRecordOutputLabel(input = {}, record = {}) {
  return isTimeSeriesRecord(record) ? 'Final Plant Height' : 'Final Yield';
}

function formatNumber(value, digits = 2) {
  return typeof value === 'number' && Number.isFinite(value) ? value.toFixed(digits) : '--';
}

function DetailItem({ label, value }) {
  return (
    <div className="flex justify-between items-center text-xs">
      <span className="text-slate-400 font-medium">{label}</span>
      <span className="text-slate-900 font-bold">{value}</span>
    </div>
  );
}

function RecordResultCell({ item }) {
  if (isTimeSeriesRecord(item)) {
    return (
      <div className="space-y-1 text-right">
        <div>
          <span className="text-xl font-black text-brand-700 tabular-nums">
            {formatNumber(item.finalPlantHeight)}
          </span>
          <span className="text-[10px] text-slate-400 ml-1.5 font-black uppercase tracking-tighter">cm</span>
        </div>
        <p className="text-xs font-bold text-slate-500">
          {formatNumber(item.finalLeafCount)} leaves
        </p>
        <p className="text-xs font-bold text-cyan-600">
          {formatNumber(item.totalNsSupply)} L/plant NS
        </p>
      </div>
    );
  }

  return (
    <>
      <span className="text-xl font-black text-brand-700">
        {formatNumber(item.output)}
      </span>
      <span className="text-[10px] text-slate-400 ml-1.5 font-black uppercase tracking-tighter">
        {getRecordUnit(item.input, item)}
      </span>
    </>
  );
}

function RecordDetailSummary({ item }) {
  if (isTimeSeriesRecord(item)) {
    return (
      <div className="w-full">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter mb-3">
          Time-Series Summary
        </p>
        <div className="space-y-2">
          <DetailItem label="Final Height" value={`${formatNumber(item.finalPlantHeight)} cm`} />
          <DetailItem label="Final Leaves" value={`${formatNumber(item.finalLeafCount)} leaves`} />
          <DetailItem label="Total NS" value={`${formatNumber(item.totalNsSupply)} L/plant`} />
        </div>
        <p className="text-[10px] text-brand-500 font-bold mt-3">Validated Model</p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">
        {getRecordOutputLabel(item.input, item)}
      </p>
      <p className="text-2xl font-black text-slate-900">
        {formatNumber(item.output)} <span className="text-xs">{getRecordUnit(item.input, item)}</span>
      </p>
      <p className="text-[10px] text-brand-500 font-bold mt-1">Validated Model</p>
    </div>
  );
}

function buildTimeSeriesMetricData(records, metricKey) {
  const days = [...new Set(records.flatMap(record => record.seriesData.map(point => point.day)))].sort((a, b) => a - b);

  return days.map(day => {
    const row = { day };
    records.forEach((record, index) => {
      const point = record.seriesData.find(item => item.day === day);
      row[`record_${index}`] = point?.[metricKey];
    });
    return row;
  });
}

function TimeSeriesComparisonChart({ title, unit, metricKey, records }) {
  const chartData = buildTimeSeriesMetricData(records, metricKey);

  return (
    <div className="border border-slate-100 rounded-2xl p-4 bg-slate-50/50">
      <h4 className="text-sm font-black text-slate-800 mb-4">{title}</h4>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="day" fontSize={11} tickLine={false} axisLine={false} dy={10} />
            <YAxis fontSize={11} tickLine={false} axisLine={false} dx={-10} unit={` ${unit}`} />
            <Tooltip
              formatter={(value, name) => [`${formatNumber(value)} ${unit}`, name]}
              labelFormatter={(day) => `Day ${day}`}
              contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}
            />
            <Legend />
            {records.map((record, index) => (
              <Line
                key={record.id}
                type="monotone"
                dataKey={`record_${index}`}
                name={record.name || `Record ${index + 1}`}
                stroke={SERIES_COLORS[index % SERIES_COLORS.length]}
                strokeWidth={3}
                dot={false}
                activeDot={{ r: 6 }}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default function HistoryPage() {
  const navigate = useNavigate();

  const userId = localStorage.getItem('userId');

  const [historyData, setHistoryData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedIndices, setSelectedIndices] = useState([]);
  const [compareMode, setCompareMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [sortConfig, setSortConfig] = useState({ key: 'time', direction: 'desc' });
  const [expandedRow, setExpandedRow] = useState(null);

  useEffect(() => {
    if (!userId) {
      setHistoryData([]);
      setError('Sign in to view saved simulation history.');
      return;
    }

    let isActive = true;
    setLoading(true);
    setError('');

    listRecords(userId)
      .then(records => {
        if (!isActive) return;
        setHistoryData(records.map(normalizeRecord));
      })
      .catch(e => {
        if (!isActive) return;
        setError(e.message || 'Failed to load history.');
      })
      .finally(() => {
        if (isActive) setLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [userId]);

  const handleRename = async (index, currentName) => {
    if (!userId) return;
    const newName = prompt('Enter a custom name for this record:', currentName || '');
    if (newName !== null && newName.trim() !== '') {
      try {
        const updatedRecord = await renameRecord(historyData[index].id, userId, newName.trim());
        const updated = [...historyData];
        updated[index] = normalizeRecord(updatedRecord);
        setHistoryData(updated);
      } catch (e) {
        setError(e.message || 'Failed to rename record.');
      }
    }
  };

  const handleDelete = async (index) => {
    if (!userId) return;
    if (window.confirm('Are you sure you want to delete this record?')) {
      try {
        await deleteRecord(historyData[index].id, userId);
        const updated = historyData.filter((_, i) => i !== index);
        setHistoryData(updated);
        setSelectedIndices(prev => prev.filter(i => i !== index));
        if (expandedRow === index) setExpandedRow(null);
      } catch (e) {
        setError(e.message || 'Failed to delete record.');
      }
    }
  };

  const processedData = useMemo(() => {
    return historyData
      .map((item, index) => ({ ...item, originalIndex: index, recordType: getRecordType(item.input, item) }))
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

  const selectedRecords = useMemo(() => {
    return selectedIndices
      .map(idx => historyData[idx])
      .filter(Boolean);
  }, [selectedIndices, historyData]);

  const selectedComparisonKind = getComparisonKind(selectedRecords[0]);

  const yieldChartData = useMemo(() => {
    return selectedIndices
      .map(idx => historyData[idx])
      .filter(isYieldRecord)
      .map(record => ({
        id: record.id,
        label: record.name || new Date(record.time).toLocaleTimeString(),
        output: record.output,
        timestamp: new Date(record.time).getTime(),
        variety: record.input?.variety || 'Yield',
      }))
      .sort((a, b) => a.timestamp - b.timestamp);
  }, [selectedIndices, historyData]);

  const timeSeriesComparisonRecords = useMemo(() => {
    return selectedIndices
      .map(idx => historyData[idx])
      .filter(record => isTimeSeriesRecord(record) && record.seriesData?.length > 0)
      .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
  }, [selectedIndices, historyData]);

  const selectedYieldCount = yieldChartData.length;
  const selectedTimeSeriesCount = timeSeriesComparisonRecords.length;
  const comparisonBaseline = yieldChartData[0]?.output;

  const filterOptions = useMemo(() => {
    return ['All', ...new Set(historyData.map(item => getRecordType(item.input, item)).filter(Boolean))];
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

        {error && (
          <div className="bg-red-50 border border-red-100 text-red-600 px-5 py-3 rounded-2xl text-sm font-bold">
            {error}
          </div>
        )}

        {loading && (
          <div className="bg-white border border-slate-200 px-5 py-3 rounded-2xl text-sm font-bold text-slate-500">
            Loading history...
          </div>
        )}

        {compareMode && (
          <div className="bg-white rounded-[2rem] p-8 border border-slate-200 shadow-xl shadow-slate-200/50 animate-in fade-in zoom-in duration-500">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-2 bg-brand-50 rounded-xl">
                <Activity size={20} className="text-brand-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-lg">
                  {selectedComparisonKind === 'timeseries' ? 'Time-Series Growth Comparison' : 'Yield Record Comparison'}
                </h3>
                <p className="text-xs font-bold text-slate-400">
                  Select two or more records of the same type to compare saved prediction results.
                </p>
              </div>
            </div>

            {selectedComparisonKind === 'yield' && selectedYieldCount >= 2 ? (
              <div className="space-y-6">
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={yieldChartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="label" fontSize={11} tickLine={false} axisLine={false} dy={10} />
                      <YAxis fontSize={11} tickLine={false} axisLine={false} dx={-10} unit=" kg/m2" />
                      <Tooltip
                        formatter={(value) => [`${formatNumber(value)} kg/m2`, 'Final Yield']}
                        contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}
                      />
                      <Line
                        type="monotone"
                        dataKey="output"
                        name="Final Yield"
                        stroke="#0ea5e9"
                        strokeWidth={4}
                        dot={{ r: 6, fill: '#0ea5e9', strokeWidth: 2, stroke: '#fff' }}
                        activeDot={{ r: 8 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {yieldChartData.map(record => {
                    const difference = typeof comparisonBaseline === 'number' ? record.output - comparisonBaseline : 0;
                    const sign = difference > 0 ? '+' : '';
                    return (
                      <div key={record.id} className="border border-slate-100 rounded-2xl p-4 bg-slate-50/60">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-black text-slate-800">{record.label}</p>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{record.variety}</p>
                          </div>
                          <p className="text-lg font-black text-brand-700 tabular-nums">{formatNumber(record.output)}</p>
                        </div>
                        <p className="mt-2 text-xs font-bold text-slate-500">
                          {record === yieldChartData[0] ? 'Baseline record' : `${sign}${formatNumber(difference)} kg/m2 vs baseline`}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : selectedComparisonKind === 'timeseries' && selectedTimeSeriesCount >= 2 ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  <TimeSeriesComparisonChart
                    title="Plant Height Over Time"
                    unit="cm"
                    metricKey="plantHeightCm"
                    records={timeSeriesComparisonRecords}
                  />
                  <TimeSeriesComparisonChart
                    title="Leaf Count Over Time"
                    unit="leaves"
                    metricKey="numLeaves"
                    records={timeSeriesComparisonRecords}
                  />
                  <div className="xl:col-span-2">
                    <TimeSeriesComparisonChart
                      title="Cumulative NS Supply Over Time"
                      unit="L/plant"
                      metricKey="cumulativeNs"
                      records={timeSeriesComparisonRecords}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {timeSeriesComparisonRecords.map(record => (
                    <div key={record.id} className="border border-slate-100 rounded-2xl p-4 bg-slate-50/60">
                      <p className="text-sm font-black text-slate-800">{record.name || new Date(record.time).toLocaleTimeString()}</p>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Time-Series</p>
                      <div className="space-y-2">
                        <DetailItem label="Final Height" value={`${formatNumber(record.finalPlantHeight)} cm`} />
                        <DetailItem label="Final Leaves" value={`${formatNumber(record.finalLeafCount)} leaves`} />
                        <DetailItem label="Total NS" value={`${formatNumber(record.totalNsSupply)} L/plant`} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center border-2 border-dashed border-slate-100 rounded-[2rem] text-slate-400 bg-slate-50/50">
                <Info size={32} className="mb-3 opacity-30" />
                <p className="font-medium">Select at least two records of the same type to compare results</p>
                {selectedIndices.length > 0 && (
                  <p className="text-xs font-bold mt-2">
                    Current selection: {selectedComparisonKind === 'timeseries' ? 'time-series growth records' : 'yield records'}
                  </p>
                )}
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
                  processedData.map((item) => {
                    const canCompareItem = canSelectForComparison(item, selectedRecords);
                    return (
                    <React.Fragment key={item.originalIndex}>
                      <tr className={`group transition-all hover:bg-slate-50/60 ${selectedIndices.includes(item.originalIndex) ? 'bg-brand-50/30' : ''}`}>
                        {compareMode && (
                          <td className="p-6 text-center">
                            <input
                              type="checkbox"
                              disabled={!canCompareItem}
                              checked={selectedIndices.includes(item.originalIndex)}
                              onChange={() => {
                                if (!canCompareItem) return;
                                const idx = item.originalIndex;
                                setSelectedIndices(prev =>
                                  prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
                                );
                              }}
                              title={canCompareItem ? 'Select record for comparison' : 'Select records of the same type for comparison'}
                              className="w-5 h-5 rounded-lg border-slate-300 text-brand-600 focus:ring-brand-500 cursor-pointer disabled:cursor-not-allowed disabled:opacity-30"
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
                          <RecordResultCell item={item} />
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
                                  <DetailItem label="Type" value={getRecordType(item.input, item)} />
                                  <DetailItem label="EC / Variety" value={item.input?.variety ?? item.input?.ec ?? '-'} />
                                  <DetailItem label="Pest / Light" value={item.input?.pestSeverity ?? item.input?.light ?? '-'} />
                                  <DetailItem label="Soil pH" value={item.input?.pH ?? '-'} />
                                </div>
                              </div>

                              <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm flex flex-col justify-center items-center text-center space-y-2">
                                <div className="p-3 bg-brand-50 rounded-full">
                                  <Activity size={24} className="text-brand-600" />
                                </div>
                                <RecordDetailSummary item={item} />
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                    );
                  })
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
