import React, { useRef, useCallback } from 'react';
import { toPng } from 'html-to-image';
import * as XLSX from 'xlsx';
import { Download, FileSpreadsheet, BarChart2, AlertTriangle } from 'lucide-react';

interface ChartDataPoint {
  label: string;
  value: number;
}

interface ChartSeries {
  name: string;
  data: ChartDataPoint[];
}

interface ChartSpec {
  type: 'bar' | 'column' | 'line' | 'pie' | 'donut';
  title: string;
  // Single-series
  data?: ChartDataPoint[];
  // Multi-series (overrides data if present)
  series?: ChartSeries[];
  unit?: string;
  color?: string;
}

const COLOR_PALETTES: Record<string, string[]> = {
  indigo: ['#6366f1', '#818cf8', '#a5b4fc', '#c7d2fe', '#e0e7ff', '#4f46e5', '#4338ca', '#3730a3'],
  emerald: ['#10b981', '#34d399', '#6ee7b7', '#a7f3d0', '#d1fae5', '#059669', '#047857', '#065f46'],
  rose:   ['#f43f5e', '#fb7185', '#fda4af', '#fecdd3', '#ffe4e6', '#e11d48', '#be123c', '#9f1239'],
  amber:  ['#f59e0b', '#fbbf24', '#fcd34d', '#fde68a', '#fef3c7', '#d97706', '#b45309', '#92400e'],
  sky:    ['#0ea5e9', '#38bdf8', '#7dd3fc', '#bae6fd', '#e0f2fe', '#0284c7', '#0369a1', '#075985'],
};

const BAR_HEIGHT = 36;
const CHART_PADDING = { top: 60, right: 30, bottom: 40, left: 180 };

function NayaxaBarChart({ data, unit, colors, width }: { data: ChartDataPoint[], unit: string, colors: string[], width: number }) {
  const maxValue = Math.max(...data.map(d => d.value), 1);
  const innerWidth = width - CHART_PADDING.left - CHART_PADDING.right;
  const innerHeight = data.length * BAR_HEIGHT;
  const totalHeight = innerHeight + CHART_PADDING.top + CHART_PADDING.bottom;

  return (
    <svg width={width} height={totalHeight} style={{ display: 'block', overflow: 'visible' }}>
      {data.map((d, i) => {
        const barWidth = (d.value / maxValue) * innerWidth;
        const y = CHART_PADDING.top + i * BAR_HEIGHT + 6;
        const color = colors[i % colors.length];
        return (
          <g key={i}>
            {/* Background track */}
            <rect x={CHART_PADDING.left} y={y} width={innerWidth} height={BAR_HEIGHT - 12} rx={4} fill="#f1f5f9" />
            {/* Colored bar */}
            <rect x={CHART_PADDING.left} y={y} width={Math.max(barWidth, 2)} height={BAR_HEIGHT - 12} rx={4} fill={color} />
            {/* Label */}
            <text x={CHART_PADDING.left - 8} y={y + (BAR_HEIGHT - 12) / 2} textAnchor="end" dominantBaseline="middle" fontSize={12} fill="#475569" fontFamily="inherit">{d.label}</text>
            {/* Value */}
            <text x={CHART_PADDING.left + barWidth + 6} y={y + (BAR_HEIGHT - 12) / 2} dominantBaseline="middle" fontSize={12} fontWeight="bold" fill={color} fontFamily="inherit">{d.value}{unit ? unit : ''}</text>
          </g>
        );
      })}
    </svg>
  );
}

function NayaxaColumnChart({ data, unit, colors, width }: { data: ChartDataPoint[], unit: string, colors: string[], width: number }) {
  const PAD = { top: 60, right: 20, bottom: 60, left: 40 };
  const maxValue = Math.max(...data.map(d => d.value), 1);
  const innerWidth = width - PAD.left - PAD.right;
  const innerHeight = 200;
  const totalHeight = innerHeight + PAD.top + PAD.bottom;
  const barWidth = Math.max(innerWidth / data.length - 8, 10);

  return (
    <svg width={width} height={totalHeight} style={{ display: 'block', overflow: 'visible' }}>
      {/* Grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map(pct => {
        const y = PAD.top + innerHeight - pct * innerHeight;
        return <line key={pct} x1={PAD.left} y1={y} x2={PAD.left + innerWidth} y2={y} stroke="#e2e8f0" strokeWidth={1} strokeDasharray="4 2" />;
      })}
      {data.map((d, i) => {
        const barH = (d.value / maxValue) * innerHeight;
        const x = PAD.left + i * (innerWidth / data.length) + (innerWidth / data.length - barWidth) / 2;
        const y = PAD.top + innerHeight - barH;
        const color = colors[i % colors.length];
        return (
          <g key={i}>
            <rect x={x} y={y} width={barWidth} height={Math.max(barH, 2)} rx={4} fill={color} />
            <text x={x + barWidth / 2} y={y - 4} textAnchor="middle" fontSize={11} fontWeight="bold" fill={color} fontFamily="inherit">{d.value}{unit}</text>
            <text x={x + barWidth / 2} y={PAD.top + innerHeight + 14} textAnchor="middle" fontSize={11} fill="#64748b" fontFamily="inherit"
              style={{ dominantBaseline: 'hanging' }}>
              {d.label.length > 10 ? d.label.slice(0, 10) + '…' : d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function NayaxaLineChart({ data, unit, colors, width }: { data: ChartDataPoint[], unit: string, colors: string[], width: number }) {
  const PAD = { top: 60, right: 20, bottom: 60, left: 50 };
  const maxValue = Math.max(...data.map(d => d.value), 1);
  const innerWidth = width - PAD.left - PAD.right;
  const innerHeight = 180;
  const color = colors[0];
  const points = data.map((d, i) => {
    const x = PAD.left + (i / Math.max(data.length - 1, 1)) * innerWidth;
    const y = PAD.top + innerHeight - (d.value / maxValue) * innerHeight;
    return { x, y, ...d };
  });
  const polyline = points.map(p => `${p.x},${p.y}`).join(' ');
  const area = `M${points[0]?.x},${PAD.top + innerHeight} ` + points.map(p => `L${p.x},${p.y}`).join(' ') + ` L${points[points.length-1]?.x},${PAD.top + innerHeight} Z`;

  return (
    <svg width={width} height={innerHeight + PAD.top + PAD.bottom} style={{ display: 'block', overflow: 'visible' }}>
      <defs>
        <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {[0, 0.25, 0.5, 0.75, 1].map(pct => {
        const y = PAD.top + innerHeight - pct * innerHeight;
        return <line key={pct} x1={PAD.left} y1={y} x2={PAD.left + innerWidth} y2={y} stroke="#e2e8f0" strokeWidth={1} strokeDasharray="4 2" />;
      })}
      <path d={area} fill="url(#lineGrad)" />
      <polyline points={polyline} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r={4} fill={color} />
          <text x={p.x} y={p.y - 10} textAnchor="middle" fontSize={11} fontWeight="bold" fill={color} fontFamily="inherit">{p.value}{unit}</text>
          <text x={p.x} y={PAD.top + innerHeight + 14} textAnchor="middle" fontSize={11} fill="#64748b" fontFamily="inherit">
            {p.label.length > 10 ? p.label.slice(0, 10) + '…' : p.label}
          </text>
        </g>
      ))}
    </svg>
  );
}

function NayaxaMultiLineChart({ series, unit, colors: _colors, width }: { series: ChartSeries[], unit: string, colors: string[], width: number }) {
  const PAD = { top: 60, right: 20, bottom: 60, left: 50 };
  const innerWidth = width - PAD.left - PAD.right;
  const innerHeight = 180;
  const totalHeight = innerHeight + PAD.top + PAD.bottom;

  // Each series gets the PRIMARY color from a DIFFERENT palette for max contrast
  const SERIES_COLORS = [
    COLOR_PALETTES.indigo[0],   // #6366f1  blue-purple
    COLOR_PALETTES.rose[0],     // #f43f5e  red
    COLOR_PALETTES.emerald[0],  // #10b981  green
    COLOR_PALETTES.amber[0],    // #f59e0b  orange
    COLOR_PALETTES.sky[0],      // #0ea5e9  cyan
  ];

  // Shared max across all series
  const allValues = series.flatMap(s => s.data.map(d => d.value));
  const maxValue = Math.max(...allValues, 1);
  
  // Use first series' labels for X axis
  const labels = series[0]?.data.map(d => d.label) || [];

  const getPoints = (s: ChartSeries) => s.data.map((d, i) => ({
    x: PAD.left + (i / Math.max(labels.length - 1, 1)) * innerWidth,
    y: PAD.top + innerHeight - (d.value / maxValue) * innerHeight,
    ...d
  }));

  const legendY = totalHeight - 14;

  return (
    <svg width={width} height={totalHeight + 24} style={{ display: 'block', overflow: 'visible' }}>
      <defs>
        {series.map((_, i) => (
          <linearGradient key={i} id={`mlGrad${i}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={SERIES_COLORS[i % SERIES_COLORS.length]} stopOpacity="0.2" />
            <stop offset="100%" stopColor={SERIES_COLORS[i % SERIES_COLORS.length]} stopOpacity="0.01" />
          </linearGradient>
        ))}
      </defs>
      {/* Grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map(pct => {
        const y = PAD.top + innerHeight - pct * innerHeight;
        return <line key={pct} x1={PAD.left} y1={y} x2={PAD.left + innerWidth} y2={y} stroke="#e2e8f0" strokeWidth={1} strokeDasharray="4 2" />;
      })}
      {/* Series lines */}
      {series.map((s, si) => {
        const pts = getPoints(s);
        const color = SERIES_COLORS[si % SERIES_COLORS.length];
        const polyline = pts.map(p => `${p.x},${p.y}`).join(' ');
        const area = `M${pts[0]?.x},${PAD.top + innerHeight} ` + pts.map(p => `L${p.x},${p.y}`).join(' ') + ` L${pts[pts.length - 1]?.x},${PAD.top + innerHeight} Z`;
        return (
          <g key={si}>
            <path d={area} fill={`url(#mlGrad${si})`} />
            <polyline points={polyline} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
            {pts.map((p, i) => (
              <circle key={i} cx={p.x} cy={p.y} r={3.5} fill={color} />
            ))}
          </g>
        );
      })}
      {/* X axis labels */}
      {getPoints(series[0] || { name: '', data: [] }).map((p, i) => (
        <text key={i} x={p.x} y={PAD.top + innerHeight + 14} textAnchor="middle" fontSize={10} fill="#64748b" fontFamily="inherit">
          {labels[i]?.length > 8 ? labels[i].slice(0, 8) + '…' : labels[i]}
        </text>
      ))}
      {/* Legend with colored dots */}
      {series.map((s, i) => {
        const lx = 10 + i * (width / series.length);
        const c = SERIES_COLORS[i % SERIES_COLORS.length];
        return (
          <g key={i}>
            <circle cx={lx + 5} cy={legendY + 5} r={5} fill={c} />
            <text x={lx + 14} y={legendY + 5} dominantBaseline="middle" fontSize={10} fontWeight="600" fill={c} fontFamily="inherit">{s.name}</text>
          </g>
        );
      })}
    </svg>
  );
}

function NayaxaPieChart({ data, colors, width, donut }: { data: ChartDataPoint[], colors: string[], width: number, donut?: boolean }) {
  const cx = width / 2;
  const r = Math.min(width / 2 - 60, 90);
  const innerR = donut ? r * 0.55 : 0;
  const total = data.reduce((s, d) => s + d.value, 0);
  let angle = -Math.PI / 2;
  const slices = data.map((d, i) => {
    const slice = (d.value / total) * 2 * Math.PI;
    const startAngle = angle;
    angle += slice;
    const x1 = cx + r * Math.cos(startAngle), y1 = r + 40 + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(angle), y2 = r + 40 + r * Math.sin(angle);
    const lx = cx + (r + 20) * Math.cos(startAngle + slice / 2);
    const ly = r + 40 + (r + 20) * Math.sin(startAngle + slice / 2);
    const large = slice > Math.PI ? 1 : 0;
    const path = `M${cx},${r + 40} L${x1},${y1} A${r},${r} 0 ${large},1 ${x2},${y2} Z`;
    const inner = donut ? `M${cx + innerR * Math.cos(startAngle)},${r + 40 + innerR * Math.sin(startAngle)} A${innerR},${innerR} 0 ${large},1 ${cx + innerR * Math.cos(angle)},${r + 40 + innerR * Math.sin(angle)}` : '';
    const pct = Math.round((d.value / total) * 100);
    return { path, color: colors[i % colors.length], label: d.label, pct, lx, ly, inner };
  });

  const legendY = r * 2 + 80;
  return (
    <svg width={width} height={legendY + Math.ceil(data.length / 2) * 22 + 20} style={{ display: 'block', overflow: 'visible' }}>
      {slices.map((s, i) => (
        <g key={i}>
          <path d={s.path} fill={s.color} />
          {data[i].value / total > 0.07 && (
            <text x={s.lx} y={s.ly} textAnchor="middle" dominantBaseline="middle" fontSize={11} fontWeight="bold" fill="white" fontFamily="inherit">{s.pct}%</text>
          )}
        </g>
      ))}
      {donut && <circle cx={cx} cy={r + 40} r={innerR} fill="white" />}
      {/* Legend */}
      {slices.map((s, i) => {
        const col = i % 2, row = Math.floor(i / 2);
        const lx2 = col === 0 ? 10 : width / 2 + 5;
        const ly2 = legendY + row * 22;
        return (
          <g key={i}>
            <rect x={lx2} y={ly2} width={12} height={12} rx={2} fill={s.color} />
            <text x={lx2 + 16} y={ly2 + 6} dominantBaseline="middle" fontSize={11} fill="#475569" fontFamily="inherit">
              {s.label.length > 14 ? s.label.slice(0, 14) + '…' : s.label} ({s.pct}%)
            </text>
          </g>
        );
      })}
    </svg>
  );
}

interface NayaxaChartProps {
  spec: ChartSpec;
}

const NayaxaChart: React.FC<NayaxaChartProps> = ({ spec }) => {
  const chartRef = useRef<HTMLDivElement>(null);

  // Early return if data is missing or invalid (supports both single-series and multi-series)
  const hasSingleSeries = spec?.data && Array.isArray(spec.data) && spec.data.length > 0;
  const hasMultiSeries  = spec?.series && Array.isArray(spec.series) && spec.series.length > 0;
  if (!spec || (!hasSingleSeries && !hasMultiSeries)) {
    return (
      <div className="mt-3 p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-xs flex items-center gap-2">
        <AlertTriangle size={14} />
        <span>Data grafik tidak lengkap atau format tidak didukung.</span>
      </div>
    );
  }

  const colors = COLOR_PALETTES[spec.color || 'indigo'] || COLOR_PALETTES.indigo;
  const unit = spec.unit ? ` ${spec.unit}` : '';
  const chartWidth = 420;

  const handleDownloadPng = useCallback(async () => {
    if (!chartRef.current) return;
    try {
      const dataUrl = await toPng(chartRef.current, { backgroundColor: '#ffffff', pixelRatio: 2 });
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `${spec.title.replace(/\s+/g, '_')}.png`;
      a.click();
    } catch (e) {
      console.error('PNG export failed:', e);
    }
  }, [spec.title]);

  const handleDownloadExcel = useCallback(() => {
    let rows: Record<string, string | number>[];
    if (spec.series && spec.series.length > 0) {
      // Multi-series: create one row per label, one column per series
      const labels = [...new Set(spec.series.flatMap(s => s.data.map(d => d.label)))];
      rows = labels.map(label => {
        const row: Record<string, string | number> = { Label: label };
        spec.series!.forEach(s => {
          const point = s.data.find(d => d.label === label);
          row[s.name] = point?.value ?? '';
        });
        return row;
      });
    } else {
      rows = (spec.data || []).map(d => ({ Label: d.label, Nilai: d.value, Satuan: spec.unit || '' }));
    }
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Data');
    XLSX.writeFile(wb, `${spec.title.replace(/\s+/g, '_')}.xlsx`);
  }, [spec]);

  const renderChart = () => {
    // Multi-series always renders as a multi-line chart
    if (spec.series && spec.series.length > 0) {
      return <NayaxaMultiLineChart series={spec.series} unit={unit} colors={colors} width={chartWidth} />;
    }
    const data = spec.data || [];
    switch (spec.type) {
      case 'bar':    return <NayaxaBarChart    data={data} unit={unit} colors={colors} width={chartWidth} />;
      case 'column': return <NayaxaColumnChart data={data} unit={unit} colors={colors} width={chartWidth} />;
      case 'line':   return <NayaxaLineChart   data={data} unit={unit} colors={colors} width={chartWidth} />;
      case 'pie':    return <NayaxaPieChart    data={data} colors={colors} width={chartWidth} />;
      case 'donut':  return <NayaxaPieChart    data={data} colors={colors} width={chartWidth} donut />;
      default:       return <NayaxaBarChart    data={data} unit={unit} colors={colors} width={chartWidth} />;
    }
  };

  const accentColor = colors[0];

  return (
    <div className="mt-3 rounded-xl border border-slate-200 overflow-hidden shadow-sm bg-white" style={{ maxWidth: chartWidth }}>
      {/* Header */}
      <div className="px-4 py-3 flex items-center gap-2 border-b border-slate-100 bg-slate-50">
        <BarChart2 size={15} style={{ color: accentColor }} />
        <span className="text-xs font-semibold text-slate-700 flex-1 truncate">{spec.title}</span>
      </div>
      {/* Chart */}
      <div ref={chartRef} className="px-2 py-3 bg-white">
        {renderChart()}
      </div>
      {/* Download buttons */}
      <div className="flex gap-2 px-3 pb-3 pt-1">
        <button
          onClick={handleDownloadPng}
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
        >
          <Download size={12} />
          Unduh PNG
        </button>
        <button
          onClick={handleDownloadExcel}
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-lg border border-emerald-200 text-emerald-700 hover:bg-emerald-50 transition-colors"
        >
          <FileSpreadsheet size={12} />
          Unduh Excel
        </button>
      </div>
    </div>
  );
};

export default NayaxaChart;
