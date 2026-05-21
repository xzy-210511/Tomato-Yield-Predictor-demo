import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TopNav from '../components/TopNav';
import {
  Activity,
  ArrowUpDown,
  BarChart3,
  Calendar,
  ChevronDown,
  ClipboardList,
  Download,
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
import { analyzeYieldInput, deriveBottleneck, deriveYieldClass } from '../lib/advisor';
import { analyzeTimeSeriesInput } from '../lib/timeSeriesAdvisor';

const SERIES_COLORS = ['#0ea5e9', '#22c55e', '#f97316', '#8b5cf6', '#ef4444', '#14b8a6'];
const SEVERITY_ORDER = ['critical', 'high', 'medium', 'low', 'info'];

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
      <span className="text-slate-50 font-bold">{value}</span>
    </div>
  );
}

function RecordResultCell({ item }) {
  if (isTimeSeriesRecord(item)) {
    return (
      <div className="space-y-1 text-right">
        <div>
          <span className="text-xl font-black text-brand-400 tabular-nums">
            {formatNumber(item.finalPlantHeight)}
          </span>
          <span className="text-[10px] text-slate-400 ml-1.5 font-black uppercase tracking-tighter">cm</span>
        </div>
        <p className="text-xs font-bold text-slate-500">
          {formatNumber(item.finalLeafCount)} leaves
        </p>
        <p className="text-xs font-bold text-cyan-400">
          {formatNumber(item.totalNsSupply)} L/plant NS
        </p>
      </div>
    );
  }

  return (
    <>
      <span className="text-xl font-black text-brand-400">
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
      <p className="text-2xl font-black text-slate-50">
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
    <div className="border border-ink-700/60 rounded-2xl p-4 bg-ink-850/60/50">
      <h4 className="text-sm font-black text-slate-100 mb-4">{title}</h4>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1a3d2a" />
            <XAxis dataKey="day" fontSize={11} tickLine={false} axisLine={false} dy={10} />
            <YAxis fontSize={11} tickLine={false} axisLine={false} dx={-10} unit={` ${unit}`} />
            <Tooltip
              formatter={(value, name) => [`${formatNumber(value)} ${unit}`, name]}
              labelFormatter={(day) => `Day ${day}`}
              contentStyle={{ background: '#0a1a12', border: '1px solid #1a3d2a', borderRadius: '16px', color: '#e2e8f0' }}
              labelStyle={{ color: '#94a3b8' }}
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

function flattenObject(obj, prefix = '') {
  const out = {};
  if (obj === null || obj === undefined) return out;
  for (const [key, val] of Object.entries(obj)) {
    const k = prefix ? `${prefix}.${key}` : key;
    if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
      Object.assign(out, flattenObject(val, k));
    } else {
      out[k] = val;
    }
  }
  return out;
}

function collectHeaders(rows) {
  const seen = new Set();
  const headers = [];
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      if (!seen.has(key)) {
        seen.add(key);
        headers.push(key);
      }
    }
  }
  return headers;
}

function escapeCsv(value) {
  if (value === null || value === undefined) return '';
  const s = String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(rows) {
  if (rows.length === 0) return '';
  const headers = collectHeaders(rows);
  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(headers.map((h) => escapeCsv(row[h])).join(','));
  }
  return lines.join('\r\n');
}

function escapeMarkdown(value) {
  if (value === null || value === undefined) return '';
  return String(value).replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
}

function formatMdValue(value) {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'number') return Number.isInteger(value) ? String(value) : value.toFixed(2);
  return escapeMarkdown(value);
}

function buildInputsTable(input) {
  const flat = flattenObject(input || {}, '');
  const keys = Object.keys(flat);
  if (keys.length === 0) return '_No input fields recorded._';
  const lines = ['| Field | Value |', '| --- | --- |'];
  for (const key of keys) {
    lines.push(`| ${escapeMarkdown(key)} | ${formatMdValue(flat[key])} |`);
  }
  return lines.join('\n');
}

function buildSuggestionsBlock(advisor) {
  const suggestions = advisor?.suggestions || [];
  const counts = advisor?.counts || {};
  if (suggestions.length === 0) {
    return '_No advisor suggestions recorded._';
  }
  const summaryParts = SEVERITY_ORDER
    .map((sev) => `${sev}: ${counts[sev] ?? 0}`)
    .join(', ');
  const lines = [`**Total:** ${suggestions.length} (${summaryParts})`, ''];
  const grouped = SEVERITY_ORDER
    .map((sev) => ({ sev, items: suggestions.filter((s) => s.severity === sev) }))
    .filter((g) => g.items.length > 0);
  for (const { sev, items } of grouped) {
    lines.push(`### ${sev.toUpperCase()} (${items.length})`);
    for (const s of items) {
      const title = s.title ? escapeMarkdown(s.title) : '(untitled)';
      const summary = s.summary ? escapeMarkdown(s.summary) : '';
      lines.push(`- **${title}**${summary ? ` — ${summary}` : ''}`);
      if (s.body) lines.push(`  - ${escapeMarkdown(s.body)}`);
      if (s.action) lines.push(`  - *Action:* ${escapeMarkdown(s.action)}`);
      if (s.impact) lines.push(`  - *Impact:* ${escapeMarkdown(s.impact)}`);
    }
    lines.push('');
  }
  return lines.join('\n').trimEnd();
}

function recordHeadlineSummary(item) {
  if (isTimeSeriesRecord(item)) {
    const height = formatNumber(item.finalPlantHeight);
    const leaves = formatNumber(item.finalLeafCount);
    const ns = formatNumber(item.totalNsSupply);
    return `**Final height:** ${height} cm  **Final leaves:** ${leaves}  **Total NS:** ${ns} L/plant`;
  }
  const yieldVal = formatNumber(item.output);
  const cls = item.yieldClass ? `**Yield class:** ${item.yieldClass}  ` : '';
  return `${cls}**Predicted:** ${yieldVal} kg/m2`;
}

function toMarkdownDocument(items) {
  if (items.length === 0) return '';
  const stamp = new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
  const out = [
    `# Tomato History Export`,
    ``,
    `_Generated ${stamp} — ${items.length} record${items.length === 1 ? '' : 's'}_`,
    ``,
  ];
  items.forEach((item, idx) => {
    const recordType = getRecordType(item.input, item);
    const time = item.time
      ? new Date(item.time).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
      : '—';
    const name = item.name || 'Simulation Record';
    const bottleneckLine = item.bottleneck?.label
      ? `**Bottleneck:** ${escapeMarkdown(item.bottleneck.label)}${
          item.bottleneck.desc ? ` — ${escapeMarkdown(item.bottleneck.desc)}` : ''
        }`
      : null;

    out.push(`## ${idx + 1}. ${escapeMarkdown(name)} — ${time}`);
    out.push('');
    out.push(`**Type:** ${escapeMarkdown(recordType)}  ${recordHeadlineSummary(item)}`);
    if (bottleneckLine) out.push(bottleneckLine);
    out.push('');
    out.push('### Inputs');
    out.push(buildInputsTable(item.input));
    out.push('');
    out.push('### Suggestions');
    out.push(buildSuggestionsBlock(item.advisor));
    out.push('');
    out.push('---');
    out.push('');
  });
  return out.join('\n').trimEnd() + '\n';
}

function downloadFile(content, filename, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function computeTrajectoryStats(predictions) {
  if (!Array.isArray(predictions) || predictions.length < 2) return null;
  const points = predictions.map((p) => ({
    day: p.days_after_transplant,
    plantHeightCm: p.plant_height_cm,
    numLeaves: p.num_leaves,
    nsNew: p.ns_new_per_plant_l ?? 0,
    nsAdded: p.ns_added_per_plant_l ?? 0,
    nsAction: p.ns_action,
  }));
  const first = points[0];
  const last = points[points.length - 1];
  const days = Math.max(1, last.day - first.day);
  const heightDelta = last.plantHeightCm - first.plantHeightCm;
  const leafDelta = last.numLeaves - first.numLeaves;
  let cumNs = 0;
  const cumulativeNs = points.map((p) => {
    cumNs += p.nsNew + p.nsAdded;
    return { day: p.day, cum: cumNs };
  });
  const freshTotal = points.reduce((s, p) => s + p.nsNew, 0);
  const addedTotal = points.reduce((s, p) => s + p.nsAdded, 0);
  const actionDays = points.filter((p) => p.nsAction === 'replace' || p.nsAction === 'add');
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
  };
}

function enrichRecord(item) {
  if (!item || !item.input) return item;
  if (isTimeSeriesRecord(item)) {
    const predictions = item.rawOutput?.predictions || [];
    const stats = computeTrajectoryStats(predictions);
    const advisor = analyzeTimeSeriesInput(item.input.environment || {}, predictions, stats);
    return { ...item, advisor };
  }
  if (isYieldRecord(item)) {
    const advisor = analyzeYieldInput(item.input, item.output);
    const bottleneckBase = deriveBottleneck(item.input);
    return {
      ...item,
      advisor,
      bottleneck: bottleneckBase
        ? { label: bottleneckBase.label, desc: bottleneckBase.desc }
        : null,
      yieldClass: deriveYieldClass(item.output),
    };
  }
  return item;
}

function buildExportRows(items) {
  return items.map((item) => {
    const counts = item.advisor?.counts || {};
    const suggestions = item.advisor?.suggestions || [];
    const topTitles = suggestions
      .map((s) => (s?.title ? `[${(s.severity || '').toUpperCase()}] ${s.title}` : null))
      .filter(Boolean)
      .join('; ');
    const isTs = isTimeSeriesRecord(item);

    return {
      name: item.name || '',
      time: item.time || '',
      recordType: getRecordType(item.input, item),
      output: typeof item.output === 'number' ? item.output : '',
      unit: getRecordUnit(item.input, item),
      yieldClass: !isTs ? item.yieldClass || '' : '',
      bottleneckLabel: !isTs ? item.bottleneck?.label || '' : '',
      bottleneckDescription: !isTs ? item.bottleneck?.desc || '' : '',
      finalPlantHeight: isTs ? (item.finalPlantHeight ?? '') : '',
      finalLeafCount: isTs ? (item.finalLeafCount ?? '') : '',
      totalNsSupply: isTs ? (item.totalNsSupply ?? '') : '',
      totalFreshNs: isTs ? (item.totalFreshNs ?? '') : '',
      totalAddedNs: isTs ? (item.totalAddedNs ?? '') : '',
      suggestionsCritical: counts.critical ?? 0,
      suggestionsHigh: counts.high ?? 0,
      suggestionsMedium: counts.medium ?? 0,
      suggestionsLow: counts.low ?? 0,
      suggestionsInfo: counts.info ?? 0,
      suggestionsTotal: suggestions.length,
      suggestionsTopTitles: topTitles,
      ...flattenObject(item.input || {}, 'input'),
    };
  });
}

export default function HistoryPage() {
  const navigate = useNavigate();

  useEffect(() => {
    document.body.classList.add('theme-dark');
    return () => document.body.classList.remove('theme-dark');
  }, []);

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
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const exportMenuRef = useRef(null);

  useEffect(() => {
    if (!exportMenuOpen) return undefined;
    const handleClickOutside = (event) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target)) {
        setExportMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [exportMenuOpen]);

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

  const handleExport = (format) => {
    setExportMenuOpen(false);
    if (processedData.length === 0) {
      window.alert('No records to export with the current filters.');
      return;
    }
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const baseName = `tomato-history-${stamp}`;
    const enriched = processedData.map(({ originalIndex, recordType, ...rest }) =>
      enrichRecord(rest)
    );

    if (format === 'csv') {
      const csv = toCsv(buildExportRows(enriched));
      downloadFile('﻿' + csv, `${baseName}.csv`, 'text/csv;charset=utf-8;');
    } else if (format === 'md') {
      const md = toMarkdownDocument(enriched);
      downloadFile(md, `${baseName}.md`, 'text/markdown;charset=utf-8;');
    } else if (format === 'json') {
      downloadFile(JSON.stringify(enriched, null, 2), `${baseName}.json`, 'application/json;charset=utf-8;');
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-hero-radial text-slate-100">
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-20" />
      <TopNav variant="dark" />
      <div className="relative z-10 max-w-6xl mx-auto space-y-6 p-4 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.36em] text-brand-500">Living Lab</p>
            <h1 className="text-3xl font-black text-slate-100 tracking-tight">History</h1>
            <p className="text-sm text-slate-400 font-medium italic">Manage and inspect your tomato simulations</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative" ref={exportMenuRef}>
              <button
                onClick={() => setExportMenuOpen((open) => !open)}
                disabled={processedData.length === 0}
                className="flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-bold transition-all shadow-md bg-ink-900/80 backdrop-blur-md border border-ink-700 text-slate-200 hover:border-brand-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-ink-700"
              >
                <Download size={18} />
                Export
                <ChevronDown size={14} className={`transition-transform ${exportMenuOpen ? 'rotate-180' : ''}`} />
              </button>
              {exportMenuOpen && (
                <div className="absolute right-0 mt-2 w-44 bg-ink-900/80 backdrop-blur-md border border-ink-700 rounded-2xl shadow-xl shadow-slate-200/60 overflow-hidden z-20 animate-in fade-in zoom-in-95 duration-150">
                  <button
                    onClick={() => handleExport('csv')}
                    className="w-full text-left px-4 py-3 text-sm font-semibold text-slate-200 hover:bg-brand-500/10 hover:text-brand-400 transition-colors"
                  >
                    Export as CSV
                  </button>
                  <button
                    onClick={() => handleExport('md')}
                    className="w-full text-left px-4 py-3 text-sm font-semibold text-slate-200 hover:bg-brand-500/10 hover:text-brand-400 transition-colors border-t border-ink-700/60"
                  >
                    Export as Markdown
                  </button>
                  <button
                    onClick={() => handleExport('json')}
                    className="w-full text-left px-4 py-3 text-sm font-semibold text-slate-200 hover:bg-brand-500/10 hover:text-brand-400 transition-colors border-t border-ink-700/60"
                  >
                    Export as JSON
                  </button>
                  <div className="px-4 py-2 text-[10px] text-slate-400 font-medium bg-ink-850/60 border-t border-ink-700/60">
                    Exports {processedData.length} filtered record{processedData.length === 1 ? '' : 's'}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => {
                setCompareMode(!compareMode);
                if (!compareMode) setSelectedIndices([]);
              }}
              className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-bold transition-all shadow-md ${
                compareMode
                  ? 'bg-brand-600 text-white ring-4 ring-brand-100 shadow-brand-200'
                  : 'bg-ink-900/80 backdrop-blur-md border border-ink-700 text-slate-200 hover:border-brand-500'
              }`}
            >
              <BarChart3 size={18} />
              {compareMode ? 'Exit Comparison' : 'Compare Analytics'}
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-2xl border border-red-700/60 bg-red-950/50 px-5 py-3 text-sm font-bold text-red-300">
            {error}
          </div>
        )}

        {loading && (
          <div className="bg-ink-900/80 backdrop-blur-md border border-ink-700 px-5 py-3 rounded-2xl text-sm font-bold text-slate-500">
            Loading history...
          </div>
        )}

        {compareMode && (
          <div className="bg-ink-900/80 backdrop-blur-md rounded-[2rem] p-8 border border-ink-700 shadow-xl shadow-slate-200/50 animate-in fade-in zoom-in duration-500">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-2 bg-brand-500/10 rounded-xl">
                <Activity size={20} className="text-brand-400" />
              </div>
              <div>
                <h3 className="font-bold text-slate-100 text-lg">
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
                        contentStyle={{ background: '#0a1a12', border: '1px solid #1a3d2a', borderRadius: '20px', color: '#e2e8f0' }}
                        labelStyle={{ color: '#94a3b8' }}
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
                      <div key={record.id} className="border border-ink-700/60 rounded-2xl p-4 bg-ink-850/60/60">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-black text-slate-100">{record.label}</p>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{record.variety}</p>
                          </div>
                          <p className="text-lg font-black text-brand-400 tabular-nums">{formatNumber(record.output)}</p>
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
                    <div key={record.id} className="border border-ink-700/60 rounded-2xl p-4 bg-ink-850/60/60">
                      <p className="text-sm font-black text-slate-100">{record.name || new Date(record.time).toLocaleTimeString()}</p>
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
              <div className="h-64 flex flex-col items-center justify-center border-2 border-dashed border-ink-700/60 rounded-[2rem] text-slate-400 bg-ink-850/60/50">
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
              className="w-full pl-12 pr-4 py-3.5 bg-ink-900/80 backdrop-blur-md border border-ink-700 rounded-2xl outline-none text-sm focus:ring-4 focus:ring-brand-50 shadow-sm"
            />
          </div>
          <div className="relative">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full px-4 py-3.5 bg-ink-900/80 backdrop-blur-md border border-ink-700 rounded-2xl text-sm outline-none appearance-none cursor-pointer focus:ring-4 focus:ring-brand-50 shadow-sm"
            >
              {filterOptions.map(option => <option key={option} value={option}>{option}</option>)}
            </select>
            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
          </div>
          <button
            onClick={() => setSortConfig({ key: 'output', direction: sortConfig.direction === 'asc' ? 'desc' : 'asc' })}
            className="flex items-center justify-center gap-2 px-4 py-3.5 bg-ink-900/80 backdrop-blur-md border border-ink-700 rounded-2xl text-sm font-bold text-slate-200 hover:bg-ink-850/60 shadow-sm"
          >
            <ArrowUpDown size={16} className="text-brand-400" /> Sort by Result
          </button>
        </div>

        <div className="bg-ink-900/80 backdrop-blur-md rounded-[2.5rem] border border-ink-700 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-ink-850/60/50 border-b border-ink-700/60 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
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
                      <tr className={`group transition-all hover:bg-ink-850/60/60 ${selectedIndices.includes(item.originalIndex) ? 'bg-brand-500/10/30' : ''}`}>
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
                              className="w-5 h-5 rounded-lg border-slate-300 text-brand-400 focus:ring-brand-500 cursor-pointer disabled:cursor-not-allowed disabled:opacity-30"
                            />
                          </td>
                        )}
                        <td className="p-6">
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-50 text-base">{item.name || 'Simulation Record'}</span>
                              <button onClick={() => handleRename(item.originalIndex, item.name)} className="opacity-0 group-hover:opacity-100 p-1 text-slate-600 hover:text-brand-400 transition-opacity">
                                <Edit3 size={14} />
                              </button>
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5 font-bold">
                              <Calendar size={12} /> {new Date(item.time).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                            </div>
                          </div>
                        </td>
                        <td className="p-6">
                          <span className="px-3 py-1 rounded-xl text-[11px] font-extrabold bg-ink-850/80 text-slate-600 border border-ink-700 tracking-tight">
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
                              className={`p-2.5 rounded-xl transition-all ${expandedRow === item.originalIndex ? 'bg-brand-600 text-white shadow-lg' : 'text-slate-400 hover:bg-ink-850/80 hover:text-brand-400'}`}
                            >
                              {expandedRow === item.originalIndex ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                            <button onClick={() => handleDelete(item.originalIndex)} className="p-2.5 text-slate-600 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
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
                                <div className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-widest border-b border-ink-700/60 pb-2">
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
                                <div className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-widest border-b border-ink-700/60 pb-2">
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
                                <div className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-widest border-b border-ink-700/60 pb-2">
                                  <Wind size={14} className="text-blue-500" /> Treatment
                                </div>
                                <div className="space-y-2">
                                  <DetailItem label="Type" value={getRecordType(item.input, item)} />
                                  <DetailItem label="EC / Variety" value={item.input?.variety ?? item.input?.ec ?? '-'} />
                                  <DetailItem label="Pest / Light" value={item.input?.pestSeverity ?? item.input?.light ?? '-'} />
                                  <DetailItem label="Soil pH" value={item.input?.pH ?? '-'} />
                                </div>
                              </div>

                              <div className="bg-ink-900/80 backdrop-blur-md rounded-3xl p-5 border border-ink-700/60 shadow-sm flex flex-col justify-center items-center text-center space-y-2">
                                <div className="p-3 bg-brand-500/10 rounded-full">
                                  <Activity size={24} className="text-brand-400" />
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
