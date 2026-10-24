import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Table as TableIcon, 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  Calendar, 
  ExternalLink, 
  Loader2, 
  RefreshCw,
  Sparkles,
  ChevronRight,
  Database
} from 'lucide-react';
import { api } from '@/src/services/api';

interface MacroIndicator {
  id: number;
  kode: string;
  nama_data: string;
  tematik_id: number | null;
  sumber_data: string | null;
  satuan_id: number | null;
  satuan_nama?: string;
  tematik_nama?: string;
  urutan: number;
  is_active: number;
  nilai: Record<string, string>;
}

export const MacroDataTable: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'trends' | 'table'>('trends');
  const [selectedIndicatorId, setSelectedIndicatorId] = useState<number | null>(null);
  const [indicators, setIndicators] = useState<MacroIndicator[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Year range covers historical up to current planning targets
  const startYear = 2017;
  const endYear = 2026;
  const years = useMemo(() => {
    return Array.from({ length: endYear - startYear + 1 }, (_, i) => endYear - i);
  }, [startYear, endYear]);

  const chronologicalYears = useMemo(() => [...years].reverse(), [years]);

  const fetchData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);

    try {
      const res = await api.dataMakro.getWithNilai(startYear, endYear);
      if (res && res.success && Array.isArray(res.data)) {
        setIndicators(res.data);
        if (res.data.length > 0 && selectedIndicatorId === null) {
          setSelectedIndicatorId(res.data[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to fetch data makro from menu data makro:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [startYear, endYear, selectedIndicatorId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Navigate directly to Menu Data Makro
  const goToMenuDataMakro = () => {
    window.dispatchEvent(new CustomEvent('navigate-page', { detail: { page: 'data-makro' } }));
  };

  // Helper to extract numeric value from string (e.g. "73,63" -> 73.63, "5.948.925" -> 5948925)
  const parseVal = (str?: string): number | null => {
    if (!str || str === '-' || str === '') return null;
    const cleaned = str.replace(/\./g, '').replace(',', '.');
    const num = parseFloat(cleaned);
    return isNaN(num) ? null : num;
  };

  // Helper to generate sparkline SVG coords
  const renderSparkline = (points: number[], strokeColor: string, fillColor: string) => {
    if (points.length < 2) return null;
    const width = 110;
    const height = 34;
    const min = Math.min(...points);
    const max = Math.max(...points);
    const range = max - min || 1;

    const step = width / (points.length - 1);
    const coords = points.map((p, i) => {
      const x = i * step;
      const normalized = (p - min) / range;
      const y = height - normalized * (height - 10) - 5;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });

    const pathD = `M ${coords.join(' L ')}`;
    const areaD = `M ${coords[0]} L ${coords.join(' L ')} L ${width},${height} L 0,${height} Z`;
    const gradId = `grad-${strokeColor.replace('#', '')}`;

    const last = coords[coords.length - 1].split(',');

    return (
      <svg width={width} height={height} className="overflow-visible">
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={fillColor} stopOpacity="0.45" />
            <stop offset="100%" stopColor={fillColor} stopOpacity="0.0" />
          </linearGradient>
        </defs>
        <path d={areaD} fill={`url(#${gradId})`} />
        <path d={pathD} fill="none" stroke={strokeColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={last[0]} cy={last[1]} r="3" fill={strokeColor} className="animate-pulse" />
      </svg>
    );
  };

  // Aesthetic color palettes for indicators
  const getIndicatorTheme = (ind: MacroIndicator, index: number) => {
    const k = (ind.kode || ind.nama_data).toUpperCase();
    if (k.includes('IPM')) {
      return {
        from: 'from-blue-50/50',
        border: 'border-blue-100/80 hover:border-blue-300',
        badgeBg: 'bg-blue-100/70 text-blue-700',
        stroke: '#0284c7',
        fill: '#38bdf8',
        isHigherBetter: true
      };
    }
    if (k.includes('KMK') || k.includes('MISKIN')) {
      return {
        from: 'from-amber-50/50',
        border: 'border-amber-100/80 hover:border-amber-300',
        badgeBg: 'bg-amber-100/70 text-amber-700',
        stroke: '#d97706',
        fill: '#fbbf24',
        isHigherBetter: false
      };
    }
    if (k.includes('STN') || k.includes('STUNTING')) {
      return {
        from: 'from-emerald-50/50',
        border: 'border-emerald-100/80 hover:border-emerald-300',
        badgeBg: 'bg-emerald-100/70 text-emerald-700',
        stroke: '#059669',
        fill: '#34d399',
        isHigherBetter: false
      };
    }
    if (k.includes('PDK') || k.includes('PENDUDUK')) {
      return {
        from: 'from-indigo-50/50',
        border: 'border-indigo-100/80 hover:border-indigo-300',
        badgeBg: 'bg-indigo-100/70 text-indigo-700',
        stroke: '#4f46e5',
        fill: '#818cf8',
        isHigherBetter: true
      };
    }

    // Default rotation
    const palettes = [
      { from: 'from-cyan-50/50', border: 'border-cyan-100/80 hover:border-cyan-300', badgeBg: 'bg-cyan-100/70 text-cyan-700', stroke: '#0891b2', fill: '#22d3ee', isHigherBetter: true },
      { from: 'from-purple-50/50', border: 'border-purple-100/80 hover:border-purple-300', badgeBg: 'bg-purple-100/70 text-purple-700', stroke: '#9333ea', fill: '#c084fc', isHigherBetter: true },
    ];
    return palettes[index % palettes.length];
  };

  // Selected indicator for table view
  const currentSelectedIndicator = useMemo(() => {
    return indicators.find(i => i.id === selectedIndicatorId) || indicators[0] || null;
  }, [indicators, selectedIndicatorId]);

  return (
    <div className="card-modern h-full lg:h-[510px] flex flex-col justify-between overflow-hidden shadow-xs border border-slate-100 hover:shadow-md transition-all duration-300">
      {/* Header */}
      <div className="px-5 sm:px-6 py-4 border-b border-slate-100/80 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div 
            onClick={goToMenuDataMakro}
            className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-xs cursor-pointer hover:scale-105 transition-transform"
            style={{ backgroundColor: 'var(--theme-color-1, #0097fe)' }}
            title="Buka Menu Data Makro"
          >
            <TableIcon size={20} strokeWidth={2.2} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 
                onClick={goToMenuDataMakro}
                className="text-sm font-black text-slate-800 tracking-tight uppercase cursor-pointer hover:underline flex items-center gap-1.5"
                title="Buka Menu Data Makro"
              >
                <span>Data Makro Kab. Bogor</span>
              </h2>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100/80 inline-flex items-center gap-1">
                <Database size={10} /> Terkoneksi DB
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">
              Sinkron langsung dengan tabel data makro perencanaan
            </p>
          </div>
        </div>

        {/* View Switcher & Action Controls */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200/60 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('trends')}
              className={`px-3 py-1 rounded-lg text-[11px] font-extrabold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'trends'
                  ? 'bg-white shadow-xs border border-slate-200/60'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              style={{
                color: activeTab === 'trends' ? 'var(--theme-color-1, #0097fe)' : undefined
              }}
            >
              <BarChart3 size={13} />
              <span>Ringkasan & Tren</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('table')}
              className={`px-3 py-1 rounded-lg text-[11px] font-extrabold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'table'
                  ? 'bg-white shadow-xs border border-slate-200/60'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              style={{
                color: activeTab === 'table' ? 'var(--theme-color-1, #0097fe)' : undefined
              }}
            >
              <Calendar size={13} />
              <span>Tabel Riwayat</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all"
            title="Segarkan data dari database"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin text-blue-600' : ''} />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-4 sm:p-5 flex-1 overflow-y-auto custom-scrollbar">
        {loading ? (
          <div className="h-full flex flex-col items-center justify-center gap-2 text-slate-400">
            <Loader2 size={26} className="animate-spin text-ppm-blue" />
            <span className="text-xs font-bold animate-pulse">Memuat data makro dari server...</span>
          </div>
        ) : indicators.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center p-6 text-center text-slate-400">
            <TableIcon size={32} className="text-slate-300 mb-2" />
            <p className="text-xs font-bold text-slate-600">Belum ada data indikator makro</p>
            <button
              type="button"
              onClick={goToMenuDataMakro}
              className="mt-3 px-3 py-1.5 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 transition-colors"
            >
              Input di Menu Data Makro
            </button>
          </div>
        ) : activeTab === 'trends' ? (
          /* ================= RINGKASAN & TREN (BENTO CARDS DARI DB) ================= */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 xl:gap-4 h-full">
            {indicators.slice(0, 4).map((ind, idx) => {
              const theme = getIndicatorTheme(ind, idx);

              // Find latest available value
              let latestYear = 0;
              let latestValStr = '';
              let latestTipe = 'realisasi';
              let prevValNum: number | null = null;

              for (const y of years) {
                const rVal = ind.nilai[`${y}_realisasi`];
                const tVal = ind.nilai[`${y}_target`];
                if (rVal) {
                  latestYear = y;
                  latestValStr = rVal;
                  latestTipe = 'realisasi';
                  break;
                } else if (!latestValStr && tVal) {
                  latestYear = y;
                  latestValStr = tVal;
                  latestTipe = 'target';
                }
              }

              // Sparkline chronological points
              const sparklinePoints: number[] = [];
              chronologicalYears.forEach(y => {
                const val = parseVal(ind.nilai[`${y}_realisasi`] || ind.nilai[`${y}_target`]);
                if (val !== null) sparklinePoints.push(val);
              });

              // Calculate YoY diff
              const latestValNum = parseVal(latestValStr);
              if (latestYear > 0) {
                const prevStr = ind.nilai[`${latestYear - 1}_realisasi`] || ind.nilai[`${latestYear - 1}_target`];
                prevValNum = parseVal(prevStr);
              }

              let diff = 0;
              if (latestValNum !== null && prevValNum !== null) {
                diff = latestValNum - prevValNum;
              }

              const isPositiveTrend = theme.isHigherBetter ? diff >= 0 : diff <= 0;

              return (
                <div 
                  key={ind.id} 
                  onClick={goToMenuDataMakro}
                  className={`group bg-gradient-to-b ${theme.from} to-white rounded-2xl border ${theme.border} p-3.5 flex flex-col justify-between hover:shadow-md transition-all duration-300 cursor-pointer`}
                  title="Klik untuk membuka & mengedit di Menu Data Makro"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${theme.badgeBg}`}>
                        {ind.kode || ind.nama_data.slice(0, 10)} {latestYear ? latestYear : ''}
                      </span>
                      {diff !== 0 && (
                        <span className={`inline-flex items-center gap-0.5 text-[10px] font-black ${isPositiveTrend ? 'text-emerald-600' : 'text-rose-500'}`}>
                          {diff > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                          {diff > 0 ? `+${diff.toFixed(2).replace('.', ',')}` : diff.toFixed(2).replace('.', ',')}
                        </span>
                      )}
                    </div>
                    <div className="flex items-baseline gap-1.5 mb-1">
                      <span className="text-2xl sm:text-3xl font-black text-slate-800 tabular-nums">
                        {latestValStr || '-'}
                      </span>
                      <span className="text-[10px] font-bold text-slate-500">
                        {ind.satuan_nama || ''}
                      </span>
                    </div>
                    <div className="text-[10px] font-bold text-slate-500 truncate mb-2">
                      {ind.nama_data}
                    </div>
                  </div>

                  {/* Dynamic Sparkline Visual */}
                  <div className="py-1 flex items-center justify-center">
                    {sparklinePoints.length >= 2 ? (
                      renderSparkline(sparklinePoints, theme.stroke, theme.fill)
                    ) : (
                      <div className="h-[34px] flex items-center justify-center text-[10px] text-slate-300">
                        Tren bertahap
                      </div>
                    )}
                  </div>

                  {/* Micro-table latest 3 years */}
                  <div className="pt-2 border-t border-slate-100 text-[10px]">
                    {years.slice(0, 3).map(y => {
                      const v = ind.nilai[`${y}_realisasi`] || ind.nilai[`${y}_target`];
                      return (
                        <div key={y} className="flex justify-between py-0.5 text-slate-500">
                          <span className="text-slate-400">{y}</span>
                          <span className="font-bold text-slate-800 tabular-nums">
                            {v ? v : '-'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* ================= TABEL RIWAYAT LENGKAP (DARI DB) ================= */
          <div className="space-y-3">
            {/* Indikator Selector Tabs */}
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2 overflow-x-auto custom-scrollbar">
              {indicators.map(ind => (
                <button
                  key={ind.id}
                  type="button"
                  onClick={() => setSelectedIndicatorId(ind.id)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                    currentSelectedIndicator?.id === ind.id
                      ? 'bg-slate-800 text-white shadow-xs'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {ind.nama_data} ({ind.satuan_nama || '-'})
                </button>
              ))}
            </div>

            {currentSelectedIndicator && (
              <div className="rounded-2xl border border-slate-100 overflow-hidden shadow-2xs">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50/80 text-slate-500 font-extrabold uppercase text-[10px] tracking-wider border-b border-slate-100">
                      <th className="p-3 text-left w-24">Tahun</th>
                      <th className="p-3 text-right">Realisasi</th>
                      <th className="p-3 text-right">Target</th>
                      <th className="p-3 text-left">Sumber Data</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-100/60">
                    {years.map(y => {
                      const realisasi = currentSelectedIndicator.nilai[`${y}_realisasi`];
                      const target = currentSelectedIndicator.nilai[`${y}_target`];
                      return (
                        <tr key={y} className="hover:bg-slate-50/70 transition-colors">
                          <td className="p-2.5 font-bold text-slate-700">{y}</td>
                          <td className="p-2.5 text-right font-black text-slate-800 tabular-nums">
                            {realisasi ? `${realisasi} ${currentSelectedIndicator.satuan_nama || ''}` : '-'}
                          </td>
                          <td className="p-2.5 text-right font-bold text-blue-600 tabular-nums">
                            {target ? `${target} ${currentSelectedIndicator.satuan_nama || ''}` : '-'}
                          </td>
                          <td className="p-2.5 text-left text-slate-400 text-[11px]">
                            {currentSelectedIndicator.sumber_data || 'BPS / PD'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer bar with link to Menu Data Makro */}
      <div className="px-5 py-2.5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between shrink-0">
        <span className="text-[10px] font-medium text-slate-400">
          Tersinkronisasi otomatis dengan Menu Data Makro Bapperida
        </span>
        <button 
          type="button" 
          onClick={goToMenuDataMakro}
          className="text-[10px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 group/btn transition-colors cursor-pointer"
        >
          <span>Kelola di Menu Data Makro</span>
          <ChevronRight size={13} className="group-hover/btn:translate-x-0.5 transition-transform" />
        </button>
      </div>
    </div>
  );
};

export default MacroDataTable;
