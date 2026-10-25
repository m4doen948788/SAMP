import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  Table as TableIcon, 
  TrendingUp, 
  TrendingDown, 
  RefreshCw,
  ChevronRight,
  ChevronLeft,
  SlidersHorizontal,
  ChevronDown,
  Search,
  Check,
  X,
  Sparkles
} from 'lucide-react';
import { api } from '@/src/services/api';
import { useAuth } from '@/src/contexts/AuthContext';

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
  assigned_pegawai_ids?: number[];
  assigned_pegawai_names?: string[];
}

interface ChartPoint {
  year: number;
  val: number;
  raw: string;
  label: string;
}

export const MacroDataTable: React.FC = () => {
  const { user } = useAuth();
  const [indicators, setIndicators] = useState<MacroIndicator[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // User personalized selection of indicator IDs
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [hasLoadedPref, setHasLoadedPref] = useState<boolean>(false);
  const [showDropdown, setShowDropdown] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSavingPref, setIsSavingPref] = useState<boolean>(false);
  const [saveSuccessNotice, setSaveSuccessNotice] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Storage key per user so preferences never leak across accounts
  const storageKey = useMemo(() => {
    return user?.id ? `macro_chart_selected_user_${user.id}` : 'macro_chart_selected_guest';
  }, [user?.id]);

  // Range of years to inspect for recent trends
  const startYear = 2017;
  const endYear = 2026;

  // 1. Load preferences: first from localStorage (instant), then sync with database
  useEffect(() => {
    // Immediate fallback from localStorage
    try {
      const local = localStorage.getItem(storageKey);
      if (local) {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSelectedIds(parsed);
        }
      }
    } catch {
      // ignore JSON parse error
    }

    // Sync with database if logged in
    if (user?.id) {
      api.dataMakro.getUserChartSelection()
        .then((res: any) => {
          if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
            setSelectedIds(res.data);
            localStorage.setItem(storageKey, JSON.stringify(res.data));
          }
        })
        .catch(err => console.error('Failed to load user chart selection from DB:', err))
        .finally(() => {
          setHasLoadedPref(true);
        });
    } else {
      setHasLoadedPref(true);
    }
  }, [storageKey, user?.id]);

  // 2. Fetch Macro Data Indicators
  const fetchData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);

    try {
      const res = await api.dataMakro.getWithNilai(startYear, endYear);
      if (res && res.success && Array.isArray(res.data)) {
        setIndicators(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch data makro from menu data makro:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [startYear, endYear]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Available indicator IDs currently in system
  const availableIdSet = useMemo(() => {
    return new Set(indicators.map(i => i.id));
  }, [indicators]);

  // Valid selected IDs that actually exist in available indicators
  const validSelectedIds = useMemo(() => {
    if (indicators.length === 0) return selectedIds;
    return selectedIds.filter(id => availableIdSet.has(id));
  }, [selectedIds, indicators.length, availableIdSet]);

  // 3. Initialize default selection or auto-clean deleted indicators
  useEffect(() => {
    if (!hasLoadedPref || indicators.length === 0) return;

    if (selectedIds.length === 0) {
      // Initialize if empty
      const defaultIds = indicators.slice(0, 4).map(i => i.id);
      setSelectedIds(defaultIds);
      localStorage.setItem(storageKey, JSON.stringify(defaultIds));
      if (user?.id) {
        api.dataMakro.saveUserChartSelection(defaultIds).catch(() => {});
      }
    } else {
      // Auto-clean if any saved IDs have been deleted in DB
      const cleaned = selectedIds.filter(id => availableIdSet.has(id));
      if (cleaned.length !== selectedIds.length) {
        const nextIds = cleaned.length > 0 ? cleaned : indicators.slice(0, 4).map(i => i.id);
        setSelectedIds(nextIds);
        localStorage.setItem(storageKey, JSON.stringify(nextIds));
        if (user?.id) {
          api.dataMakro.saveUserChartSelection(nextIds).catch(() => {});
        }
      }
    }
  }, [hasLoadedPref, indicators, selectedIds, availableIdSet, storageKey, user?.id]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

  // Save selection handler (to state, localStorage, and DB)
  const saveSelection = useCallback((nextIds: number[]) => {
    setSelectedIds(nextIds);
    localStorage.setItem(storageKey, JSON.stringify(nextIds));
    setCurrentPage(1);

    if (user?.id) {
      setIsSavingPref(true);
      api.dataMakro.saveUserChartSelection(nextIds)
        .then(() => {
          setSaveSuccessNotice(true);
          setTimeout(() => setSaveSuccessNotice(false), 2200);
        })
        .catch(err => console.error('Failed to save chart selection to DB:', err))
        .finally(() => setIsSavingPref(false));
    }
  }, [storageKey, user?.id]);

  // Toggle single indicator
  const handleToggleIndicator = (id: number) => {
    let next: number[];
    if (validSelectedIds.includes(id)) {
      if (validSelectedIds.length === 1) {
        // Keep at least 1 indicator selected
        return;
      }
      next = validSelectedIds.filter(item => item !== id);
    } else {
      next = [...validSelectedIds, id];
    }
    saveSelection(next);
  };

  // Navigate directly to Menu Data Makro
  const goToMenuDataMakro = () => {
    window.dispatchEvent(new CustomEvent('navigate-page', { detail: { page: 'data-makro' } }));
  };

  // Helper to extract numeric value from string
  const parseVal = (str?: string): number | null => {
    if (!str || str === '-' || str === '') return null;
    const cleaned = str.replace(/\./g, '').replace(',', '.');
    const num = parseFloat(cleaned);
    return isNaN(num) ? null : num;
  };

  // Format short label for SVG chart point numbers
  const formatChartPointLabel = (val: number, raw: string): string => {
    if (val >= 1000000) {
      return (val / 1000000).toFixed(2).replace('.', ',') + ' jt';
    }
    if (val >= 10000) {
      return (val / 1000).toFixed(0) + ' rb';
    }
    return raw;
  };

  // Render responsive SVG line chart with numbers and years
  const renderInteractiveChart = (
    points: ChartPoint[],
    strokeColor: string,
    fillColor: string,
    satuan: string
  ) => {
    if (points.length < 2) {
      return (
        <div className="h-[84px] flex items-center justify-center text-xs text-slate-300 italic font-sans">
          Data tren belum mencukupi
        </div>
      );
    }

    const width = 280;
    const height = 84;
    const padLeft = 24;
    const padRight = 24;
    const padTop = 18;
    const padBottom = 20;

    const min = Math.min(...points.map(p => p.val));
    const max = Math.max(...points.map(p => p.val));
    const range = max - min || 1;

    const step = (width - padLeft - padRight) / (points.length - 1);
    const coords = points.map((p, i) => {
      const x = padLeft + i * step;
      const normalized = (p.val - min) / range;
      const y = height - padBottom - normalized * (height - padTop - padBottom);
      return { ...p, x, y };
    });

    const pathD = `M ${coords.map(c => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' L ')}`;
    const areaD = `M ${coords[0].x.toFixed(1)},${height - padBottom} L ${coords.map(c => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' L ')} L ${coords[coords.length - 1].x.toFixed(1)},${height - padBottom} Z`;
    const gradId = `grad-${strokeColor.replace('#', '')}`;

    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-[84px] overflow-visible">
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={fillColor} stopOpacity="0.32" />
            <stop offset="100%" stopColor={fillColor} stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Baseline / guide line */}
        <line 
          x1={padLeft - 6} 
          y1={height - padBottom} 
          x2={width - padRight + 6} 
          y2={height - padBottom} 
          stroke="#e2e8f0" 
          strokeDasharray="3 3" 
          strokeWidth="1" 
        />

        {/* Area fill */}
        <path d={areaD} fill={`url(#${gradId})`} />

        {/* Line curve */}
        <path 
          d={pathD} 
          fill="none" 
          stroke={strokeColor} 
          strokeWidth="2.5" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
        />

        {/* Points with direct numbers above and years below */}
        {coords.map((c, i) => (
          <g key={i} className="group/pt">
            <title>{`Tahun ${c.year}: ${c.raw} ${satuan}`}</title>
            
            {/* Dot circle */}
            <circle
              cx={c.x}
              cy={c.y}
              r="3.5"
              fill={strokeColor}
              stroke="#ffffff"
              strokeWidth="1.5"
              className="transition-transform group-hover/pt:scale-125"
            />

            {/* Number on the chart */}
            <text
              x={c.x}
              y={c.y - 6}
              textAnchor="middle"
              fontSize="9.5"
              fontWeight="bold"
              fill="#1e293b"
              className="select-none font-sans"
            >
              {c.label}
            </text>

            {/* Year below the baseline */}
            <text
              x={c.x}
              y={height - 6}
              textAnchor="middle"
              fontSize="8.5"
              fontWeight="600"
              fill="#94a3b8"
              className="select-none font-sans"
            >
              {c.year}
            </text>
          </g>
        ))}
      </svg>
    );
  };

  // Aesthetic color palettes for indicators
  const getIndicatorTheme = (ind: MacroIndicator, index: number) => {
    const k = (ind.kode || ind.nama_data).toUpperCase();
    if (k.includes('IPM')) {
      return {
        from: 'from-blue-50/60',
        border: 'border-blue-200/70 hover:border-blue-400',
        badgeBg: 'bg-blue-100/80 text-blue-800',
        stroke: '#0284c7',
        fill: '#38bdf8',
        isHigherBetter: true
      };
    }
    if (k.includes('KMK') || k.includes('MISKIN')) {
      return {
        from: 'from-amber-50/60',
        border: 'border-amber-200/70 hover:border-amber-400',
        badgeBg: 'bg-amber-100/80 text-amber-800',
        stroke: '#d97706',
        fill: '#fbbf24',
        isHigherBetter: false
      };
    }
    if (k.includes('STN') || k.includes('STUNTING')) {
      return {
        from: 'from-emerald-50/60',
        border: 'border-emerald-200/70 hover:border-emerald-400',
        badgeBg: 'bg-emerald-100/80 text-emerald-800',
        stroke: '#059669',
        fill: '#34d399',
        isHigherBetter: false
      };
    }
    if (k.includes('PDK') || k.includes('PENDUDUK')) {
      return {
        from: 'from-indigo-50/60',
        border: 'border-indigo-200/70 hover:border-indigo-400',
        badgeBg: 'bg-indigo-100/80 text-indigo-800',
        stroke: '#4f46e5',
        fill: '#818cf8',
        isHigherBetter: true
      };
    }

    const palettes = [
      { from: 'from-cyan-50/60', border: 'border-cyan-200/70 hover:border-cyan-400', badgeBg: 'bg-cyan-100/80 text-cyan-800', stroke: '#0891b2', fill: '#22d3ee', isHigherBetter: true },
      { from: 'from-purple-50/60', border: 'border-purple-200/70 hover:border-purple-400', badgeBg: 'bg-purple-100/80 text-purple-800', stroke: '#9333ea', fill: '#c084fc', isHigherBetter: true },
      { from: 'from-rose-50/60', border: 'border-rose-200/70 hover:border-rose-400', badgeBg: 'bg-rose-100/80 text-rose-800', stroke: '#e11d48', fill: '#fb7185', isHigherBetter: true },
      { from: 'from-teal-50/60', border: 'border-teal-200/70 hover:border-teal-400', badgeBg: 'bg-teal-100/80 text-teal-800', stroke: '#0d9488', fill: '#2dd4bf', isHigherBetter: true },
    ];
    return palettes[index % palettes.length];
  };

  // Map of active indicators by ID
  const activeIndicatorsMap = useMemo(() => {
    const map = new Map<number, MacroIndicator>();
    indicators.forEach(ind => map.set(ind.id, ind));
    return map;
  }, [indicators]);

  // Displayed indicators matching user selection in exact order
  const displayedIndicators = useMemo(() => {
    const list: MacroIndicator[] = [];
    validSelectedIds.forEach(id => {
      const item = activeIndicatorsMap.get(id);
      if (item) list.push(item);
    });
    // Fallback if none matched
    if (list.length === 0) {
      return indicators.slice(0, 4);
    }
    return list;
  }, [validSelectedIds, activeIndicatorsMap, indicators]);

  // Pagination for 2x2 grid (4 indicators per page)
  const itemsPerPage = 4;
  const totalPages = Math.ceil(displayedIndicators.length / itemsPerPage) || 1;
  const paginatedIndicators = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return displayedIndicators.slice(start, start + itemsPerPage);
  }, [displayedIndicators, currentPage, itemsPerPage]);

  // Filtered indicators inside dropdown search
  const filteredDropdownIndicators = useMemo(() => {
    if (!searchQuery.trim()) return indicators;
    const q = searchQuery.toLowerCase();
    return indicators.filter(ind => 
      ind.nama_data.toLowerCase().includes(q) || 
      (ind.kode && ind.kode.toLowerCase().includes(q)) ||
      (ind.satuan_nama && ind.satuan_nama.toLowerCase().includes(q))
    );
  }, [indicators, searchQuery]);

  return (
    <div className="card-modern h-full lg:h-[510px] flex flex-col justify-between overflow-hidden shadow-xs border border-slate-100 hover:shadow-md transition-all duration-300">
      {/* Header: Title, DB Badge, Indicator Selector, and Refresh */}
      <div className="px-5 sm:px-6 py-3.5 border-b border-slate-100/80 bg-white flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div 
            onClick={goToMenuDataMakro}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-xs cursor-pointer hover:scale-105 transition-transform shrink-0"
            style={{ backgroundColor: 'var(--theme-color-1, #0097fe)' }}
            title="Buka Menu Data Makro"
          >
            <TableIcon size={18} strokeWidth={2.2} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 
                onClick={goToMenuDataMakro}
                className="text-xs sm:text-sm font-black text-slate-800 tracking-tight uppercase cursor-pointer hover:underline flex items-center gap-1.5 truncate"
                title="Buka Menu Data Makro"
              >
                <span>Data Makro Kab. Bogor</span>
              </h2>
            </div>
            <p className="text-[10.5px] text-slate-400 font-medium truncate">
              Sinkron langsung dengan tabel data makro perencanaan
            </p>
          </div>
        </div>

        {/* Right Controls: Pilih Grafik Dropdown & Refresh */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Custom Indicator Selection Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setShowDropdown(prev => !prev)}
              className={`px-2.5 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer border ${
                showDropdown
                  ? 'bg-blue-50 text-blue-700 border-blue-300 shadow-xs'
                  : 'text-slate-700 bg-slate-50 hover:bg-slate-100 hover:text-slate-900 border-slate-200/90'
              }`}
              title="Pilih data makro yang ingin ditampilkan pada kartu grafik"
            >
              <SlidersHorizontal size={13} className="text-blue-600" />
              <span className="hidden sm:inline">Pilih Grafik</span>
              <span className="px-1.5 py-0.2 text-[10px] bg-blue-100/90 text-blue-700 font-extrabold rounded-full">
                {validSelectedIds.length}
              </span>
              <ChevronDown size={12} className={`text-slate-400 transition-transform duration-200 ${showDropdown ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Popover */}
            {showDropdown && (
              <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-slate-200/90 p-4 z-50 animate-in fade-in zoom-in-95 duration-150">
                {/* Popover Header */}
                <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-tight flex items-center gap-1.5">
                      <Sparkles size={13} className="text-amber-500" />
                      <span>Kustomisasi Kartu Grafik</span>
                    </h3>
                    <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                      Pilihan tersimpan otomatis per akun Anda
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowDropdown(false)}
                    className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>

                {/* Search Bar */}
                <div className="mt-3 relative">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Cari indikator makro..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-700 placeholder:text-slate-400"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>



                {/* Indicator Checklist */}
                <div className="mt-3 max-h-56 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                  {filteredDropdownIndicators.length === 0 ? (
                    <div className="py-6 text-center text-xs text-slate-400 italic">
                      Tidak ada indikator yang sesuai pencarian
                    </div>
                  ) : (
                    filteredDropdownIndicators.map(ind => {
                      const isSelected = validSelectedIds.includes(ind.id);
                      return (
                        <div
                          key={ind.id}
                          onClick={() => handleToggleIndicator(ind.id)}
                          className={`p-2 rounded-xl flex items-center justify-between gap-2.5 cursor-pointer transition-all border ${
                            isSelected
                              ? 'bg-blue-50/70 border-blue-200/80 text-blue-900'
                              : 'bg-white hover:bg-slate-50 border-transparent text-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className={`w-4 h-4 rounded-md border flex items-center justify-center transition-colors shrink-0 ${
                              isSelected
                                ? 'bg-blue-600 border-blue-600 text-white'
                                : 'border-slate-300 bg-white'
                            }`}>
                              {isSelected && <Check size={11} strokeWidth={3} />}
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-bold truncate leading-tight">
                                {ind.nama_data}
                              </div>
                              <div className="text-[10px] text-slate-400 font-medium truncate mt-0.5">
                                {ind.kode ? `${ind.kode} • ` : ''}{ind.satuan_nama || 'Tanpa satuan'}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Popover Footer: Status Save & Done */}
                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div className="text-[11px] font-bold">
                    {isSavingPref ? (
                      <span className="text-blue-600 flex items-center gap-1">
                        <RefreshCw size={11} className="animate-spin" /> Menyimpan...
                      </span>
                    ) : saveSuccessNotice ? (
                      <span className="text-emerald-600 font-extrabold flex items-center gap-1 animate-in fade-in">
                        ✓ Tersimpan di akun
                      </span>
                    ) : (
                      <span className="text-slate-500 font-semibold">
                        {validSelectedIds.length} indikator terpilih
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowDropdown(false)}
                    className="px-3 py-1 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
                  >
                    Selesai
                  </button>
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
            title="Segarkan data dari database"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin text-blue-600' : ''} />
          </button>
        </div>
      </div>

      {/* Main Content: 2x2 Grid Layout (2 atas, 2 bawah) */}
      <div className="p-3.5 sm:p-4 flex-1 overflow-hidden">
        {loading ? (
          <div className="h-full flex flex-col items-center justify-center gap-2 text-slate-400">
            <RefreshCw size={24} className="animate-spin text-blue-500" />
            <span className="text-xs font-bold animate-pulse">Memuat visual grafik data makro...</span>
          </div>
        ) : paginatedIndicators.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center p-6 text-center text-slate-400">
            <TableIcon size={32} className="text-slate-300 mb-2" />
            <p className="text-xs font-bold text-slate-600">Belum ada indikator yang dipilih</p>
            <button
              type="button"
              onClick={handleSelectTop4}
              className="mt-2 text-xs font-bold text-blue-600 hover:underline cursor-pointer"
            >
              Tampilkan 4 Indikator Bawaan
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 h-full">
            {paginatedIndicators.map((ind, idx) => {
              const theme = getIndicatorTheme(ind, idx);

              // 1. Gather chronological points (prioritize realisasi; fallback to target)
              const rawPoints: ChartPoint[] = [];
              const searchYears = [2020, 2021, 2022, 2023, 2024, 2025, 2026];
              
              searchYears.forEach(y => {
                const rVal = ind.nilai[`${y}_realisasi`];
                if (rVal) {
                  const valNum = parseVal(rVal);
                  if (valNum !== null) {
                    rawPoints.push({
                      year: y,
                      val: valNum,
                      raw: rVal,
                      label: formatChartPointLabel(valNum, rVal)
                    });
                  }
                }
              });

              // Take up to last 5 points for clear presentation
              const chartPoints = rawPoints.slice(-5);

              // 2. Trend Calculation: Selisih n terhadap n-1
              const pointN = chartPoints.length > 0 ? chartPoints[chartPoints.length - 1] : null;
              const pointPrev = chartPoints.length > 1 ? chartPoints[chartPoints.length - 2] : null;

              const latestYear = pointN ? pointN.year : 0;
              const latestValStr = pointN ? pointN.raw : '';
              const prevYear = pointPrev ? pointPrev.year : 0;
              const prevValStr = pointPrev ? pointPrev.raw : '';

              let diff = 0;
              if (pointN && pointPrev) {
                diff = pointN.val - pointPrev.val;
              }

              // Format diff cleanly: no floating point rounding artifacts, thousands formatted
              let diffStr = '';
              if (pointN && pointPrev) {
                if (Math.abs(diff) >= 1000) {
                  const rounded = Math.round(diff);
                  diffStr = rounded > 0 ? `+${rounded.toLocaleString('id-ID')}` : `${rounded.toLocaleString('id-ID')}`;
                } else {
                  diffStr = diff > 0 
                    ? `+${diff.toFixed(2).replace('.', ',')}` 
                    : diff.toFixed(2).replace('.', ',');
                }
              }

              const isPositiveTrend = theme.isHigherBetter ? diff >= 0 : diff <= 0;

              // Tooltip penanggung jawab (sama persis seperti di Menu Data Makro)
              const pjNames = ind.assigned_pegawai_names && ind.assigned_pegawai_names.length > 0
                ? ind.assigned_pegawai_names.join(', ')
                : 'Belum ada pegawai ditugaskan';
              const cardTooltip = `Indikator: ${ind.nama_data}\nPenanggung Jawab: ${pjNames}`;

              return (
                <div 
                  key={ind.id}
                  onClick={goToMenuDataMakro}
                  className={`bg-gradient-to-b ${theme.from} to-white rounded-2xl border ${theme.border} p-3 sm:p-3.5 flex flex-col justify-between hover:shadow-md transition-all duration-300 cursor-pointer overflow-hidden group`}
                  title={cardTooltip}
                >
                  {/* Top Bar: Title Badge + Trend Badge (N vs N-1) */}
                  <div className="flex items-center justify-between gap-1.5 mb-1 shrink-0">
                    <span 
                      className={`text-[9.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md truncate max-w-[62%] ${theme.badgeBg}`}
                      title={cardTooltip}
                    >
                      {ind.kode || ind.nama_data} ({latestYear ? latestYear : '-'})
                    </span>

                    {pointN && pointPrev && (
                      <span 
                        className={`inline-flex items-center gap-0.5 text-[9.5px] font-black px-1.5 py-0.5 rounded-md border shrink-0 ${
                          isPositiveTrend 
                            ? 'text-emerald-700 bg-emerald-50 border-emerald-200/70' 
                            : 'text-rose-700 bg-rose-50 border-rose-200/70'
                        }`}
                        title={`Tren: Selisih tahun ${latestYear} (${latestValStr}) terhadap tahun ${prevYear} (${prevValStr}) = ${diffStr}`}
                      >
                        {diff > 0 ? <TrendingUp size={11} strokeWidth={2.5} /> : <TrendingDown size={11} strokeWidth={2.5} />}
                        <span>{diffStr}</span>
                      </span>
                    )}
                  </div>

                  {/* Main Value Display */}
                  <div className="shrink-0 mb-1">
                    <div className="flex items-baseline gap-1.5 min-w-0 overflow-hidden">
                      <span className="text-xl sm:text-2xl font-black text-slate-800 tabular-nums tracking-tight truncate">
                        {latestValStr || '-'}
                      </span>
                      <span className="text-[10px] font-bold text-slate-500 shrink-0">
                        {ind.satuan_nama || ''}
                      </span>
                    </div>
                    <div 
                      className="text-[10.5px] font-bold text-slate-600 truncate leading-tight"
                      title={cardTooltip}
                    >
                      {ind.nama_data}
                    </div>
                  </div>

                  {/* Chart with visible numeric values & years */}
                  <div className="pt-1 flex items-end justify-center w-full min-w-0">
                    {renderInteractiveChart(
                      chartPoints,
                      theme.stroke,
                      theme.fill,
                      ind.satuan_nama || ''
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer Bar: Link to Data Makro Menu + Pagination if user selected > 4 indicators */}
      <div className="px-5 py-2.5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between shrink-0">
        {totalPages > 1 ? (
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-500">
              Hal {currentPage}/{totalPages} ({displayedIndicators.length} grafik)
            </span>
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className="p-1 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                title="Halaman sebelumnya"
              >
                <ChevronLeft size={12} />
              </button>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                className="p-1 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                title="Halaman berikutnya"
              >
                <ChevronRight size={12} />
              </button>
            </div>
          </div>
        ) : (
          <span className="text-[10px] font-medium text-slate-400">
            Tersinkronisasi otomatis dengan Menu Data Makro Bapperida
          </span>
        )}

        <button 
          type="button" 
          onClick={goToMenuDataMakro}
          className="text-[10px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 group/btn transition-colors cursor-pointer shrink-0"
        >
          <span>Kelola di Menu Data Makro</span>
          <ChevronRight size={13} className="group-hover/btn:translate-x-0.5 transition-transform" />
        </button>
      </div>
    </div>
  );
};

export default MacroDataTable;
