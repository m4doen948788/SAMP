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

  // Mobile True 3D Cylinder Drum states
  const [activeMobileIndex, setActiveMobileIndex] = useState<number>(0);
  const [cylinderRotation, setCylinderRotation] = useState<number>(0);
  const [dragDeltaAngle, setDragDeltaAngle] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const touchStartXRef = useRef<number>(0);
  const touchStartYRef = useRef<number>(0);
  const isHorizontalSwipeRef = useRef<boolean | null>(null);
  const hasDraggedRef = useRef<boolean>(false);
  const rafRef = useRef<number | null>(null);

  // Cleanup requestAnimationFrame on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

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
    chartId: string | number,
    points: ChartPoint[],
    strokeColor: string,
    fillColor: string,
    satuan: string,
    chartHeight: number = 84
  ) => {
    if (points.length < 2) {
      return (
        <div 
          style={{ height: `${chartHeight}px` }}
          className="flex items-center justify-center text-xs text-slate-300 italic font-sans"
        >
          Data tren belum mencukupi
        </div>
      );
    }

    const width = 280;
    const height = chartHeight;
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
    const gradId = `grad-macro-chart-${chartId}`;

    return (
      <svg 
        viewBox={`0 0 ${width} ${height}`} 
        style={{ height: `${chartHeight}px` }}
        className="w-full overflow-visible"
      >
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

  // Dynamic theme mapping connected directly to system CSS theme variables (--theme-color-1 to --theme-color-4)
  const getIndicatorTheme = (ind: MacroIndicator, index: number) => {
    const k = (ind.kode || ind.nama_data).toUpperCase();
    const isNegativeIndicator = k.includes('MISKIN') || k.includes('STUNTING') || k.includes('PENGANGGURAN') || k.includes('KEMISKINAN');
    const isHigherBetter = !isNegativeIndicator;

    // Theme index cycling through the 4 active system theme colors: 1, 2, 3, 4
    const themeNum = (index % 4) + 1;
    const fallbackColors = {
      1: '#0097fe', // Theme 1: Biru Langit (Aksi Utama & Perencanaan)
      2: '#009a19', // Theme 2: Hijau Segar (Pelaksanaan & Lapangan)
      3: '#fe9600', // Theme 3: Oranye Terang (Inovasi & Laporan)
      4: '#0069a3', // Theme 4: Biru Tua (Kelembagaan & Aksen)
    };
    const fallback = fallbackColors[themeNum as 1 | 2 | 3 | 4];
    const themeVar = `var(--theme-color-${themeNum}, ${fallback})`;

    return {
      themeNum,
      themeVar,
      fallback,
      stroke: themeVar,
      fill: themeVar,
      isHigherBetter,
      cardStyle: {
        background: `linear-gradient(to bottom, color-mix(in srgb, ${themeVar} 7%, #ffffff), #ffffff)`,
        borderColor: `color-mix(in srgb, ${themeVar} 25%, #cbd5e1)`
      },
      badgeStyle: {
        backgroundColor: `color-mix(in srgb, ${themeVar} 14%, #ffffff)`,
        color: themeVar,
        borderColor: `color-mix(in srgb, ${themeVar} 30%, transparent)`
      }
    };
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

  // Setup Cylinder Faces (ensure minimum 3 or 4 faces for true cylindrical tube geometry)
  const cylinderFaces = useMemo(() => {
    if (displayedIndicators.length === 0) return [];
    if (displayedIndicators.length === 2) {
      return [
        { indicator: displayedIndicators[0], originalIndex: 0 },
        { indicator: displayedIndicators[1], originalIndex: 1 },
        { indicator: displayedIndicators[0], originalIndex: 0 },
        { indicator: displayedIndicators[1], originalIndex: 1 },
      ];
    }
    return displayedIndicators.map((ind, i) => ({ indicator: ind, originalIndex: i }));
  }, [displayedIndicators]);

  const numFaces = cylinderFaces.length || 1;
  const stepAngle = 360 / numFaces;

  // Radius calculation so cards form an exact closed cylinder tube with visible curvature
  const cylinderRadius = useMemo(() => {
    if (numFaces <= 2) return 150;
    const cardWidth = 270;
    const rad = Math.round((cardWidth / 2) / Math.tan(Math.PI / numFaces));
    return Math.max(145, Math.min(235, rad));
  }, [numFaces]);

  // Keep active mobile card index in bounds
  useEffect(() => {
    if (activeMobileIndex >= displayedIndicators.length && displayedIndicators.length > 0) {
      setActiveMobileIndex(0);
      setCylinderRotation(0);
      setDragDeltaAngle(0);
    }
  }, [displayedIndicators.length, activeMobileIndex]);

  // Continuous loop 3D Cylinder Navigation Handlers
  const rotateToStep = useCallback((step: number) => {
    const targetRotation = step * stepAngle;
    setCylinderRotation(targetRotation);
    const newIdx = (((-step % displayedIndicators.length) + displayedIndicators.length) % displayedIndicators.length);
    setActiveMobileIndex(newIdx);
  }, [stepAngle, displayedIndicators.length]);

  const nextMobileCard = useCallback(() => {
    if (displayedIndicators.length === 0) return;
    const currentStep = Math.round(cylinderRotation / stepAngle);
    rotateToStep(currentStep - 1);
  }, [displayedIndicators.length, cylinderRotation, stepAngle, rotateToStep]);

  const prevMobileCard = useCallback(() => {
    if (displayedIndicators.length === 0) return;
    const currentStep = Math.round(cylinderRotation / stepAngle);
    rotateToStep(currentStep + 1);
  }, [displayedIndicators.length, cylinderRotation, stepAngle, rotateToStep]);

  const handleDotClick = useCallback((targetIndex: number) => {
    if (displayedIndicators.length === 0) return;
    const N = displayedIndicators.length;
    let diff = (targetIndex - activeMobileIndex + N) % N;
    if (diff > N / 2) diff -= N; // Shortest angular path on the cylinder
    const currentStep = Math.round(cylinderRotation / stepAngle);
    rotateToStep(currentStep - diff);
  }, [displayedIndicators.length, activeMobileIndex, cylinderRotation, stepAngle, rotateToStep]);

  // High-performance Unified Drag Handlers (Touch & Mouse) with RAF Throttling for 60-120 FPS
  const handleDragStart = (clientX: number, clientY: number) => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    touchStartXRef.current = clientX;
    touchStartYRef.current = clientY;
    isHorizontalSwipeRef.current = null;
    hasDraggedRef.current = false;
    setIsDragging(true);
    setDragDeltaAngle(0);
  };

  const handleDragMove = (clientX: number, clientY: number) => {
    if (!isDragging) return;
    const deltaX = clientX - touchStartXRef.current;
    const deltaY = clientY - touchStartYRef.current;

    // Detect horizontal swipe vs natural vertical scrolling
    if (isHorizontalSwipeRef.current === null) {
      if (Math.abs(deltaX) > 6 || Math.abs(deltaY) > 6) {
        isHorizontalSwipeRef.current = Math.abs(deltaX) > Math.abs(deltaY) * 1.1;
      }
    }

    if (isHorizontalSwipeRef.current === true) {
      hasDraggedRef.current = true;
      const angle = deltaX * 0.40;
      
      // Throttle with requestAnimationFrame to eliminate micro-stutters and frame drops
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        setDragDeltaAngle(angle);
      });
    }
  };

  const handleDragEnd = () => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (!isDragging) return;
    setIsDragging(false);

    if (isHorizontalSwipeRef.current === true && Math.abs(dragDeltaAngle) > 2) {
      const totalAngle = cylinderRotation + dragDeltaAngle;
      let targetStep: number;

      // Swipe momentum detection
      if (dragDeltaAngle < -15) {
        // Swiping left -> next card
        targetStep = Math.floor(cylinderRotation / stepAngle) - 1;
      } else if (dragDeltaAngle > 15) {
        // Swiping right -> prev card
        targetStep = Math.ceil(cylinderRotation / stepAngle) + 1;
      } else {
        // Snap to nearest cylinder face
        targetStep = Math.round(totalAngle / stepAngle);
      }

      rotateToStep(targetStep);
    }

    setDragDeltaAngle(0);
    isHorizontalSwipeRef.current = null;
    setTimeout(() => {
      hasDraggedRef.current = false;
    }, 100);
  };

  // Render a single indicator card (shared between desktop 2x2 grid and mobile 3D carousel)
  const renderIndicatorCard = (ind: MacroIndicator, themeIdx: number, isMobile = false) => {
    const theme = getIndicatorTheme(ind, themeIdx);

    // 1. Gather chronological points (prioritize realisasi; fallback to target)
    const rawPoints: ChartPoint[] = [];
    const searchYears = [2020, 2021, 2022, 2023, 2024, 2025, 2026];
    
    searchYears.forEach(y => {
      const rVal = ind?.nilai ? ind.nilai[`${y}_realisasi`] : undefined;
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

    const chartPoints = rawPoints.slice(-5);

    // 2. Trend Calculation
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

    const pjNames = ind.assigned_pegawai_names && ind.assigned_pegawai_names.length > 0
      ? ind.assigned_pegawai_names.join(', ')
      : 'Belum ada pegawai ditugaskan';
    const cardTooltip = `Indikator: ${ind.nama_data}${ind.sumber_data ? `\nSumber Data: ${ind.sumber_data}` : ''}\nPenanggung Jawab: ${pjNames}`;

    return (
      <div 
        key={isMobile ? `mobile-${ind.id}` : ind.id}
        onClick={() => {
          if (hasDraggedRef.current) return;
          goToMenuDataMakro();
        }}
        style={theme.cardStyle}
        className={`${isMobile ? 'rounded-[24px]' : 'rounded-2xl'} border p-3 sm:p-3.5 flex flex-col justify-between hover:shadow-md transition-all duration-300 cursor-pointer overflow-hidden group select-none ${
          isMobile ? 'h-full w-full' : ''
        }`}
        title={cardTooltip}
      >
        {/* Top Bar: Title Badge + Trend Badge (N vs N-1) */}
        <div className="flex items-center justify-between gap-1.5 mb-1 shrink-0">
          <span 
            style={theme.badgeStyle}
            className="text-[9.5px] sm:text-[9.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md truncate max-w-[65%] border"
            title={cardTooltip}
          >
            {ind.kode || ind.nama_data} ({latestYear ? latestYear : '-'})
          </span>

          {pointN && pointPrev && (
            <span 
              className={`inline-flex items-center gap-0.5 text-[9.5px] sm:text-[9.5px] font-black px-1.5 py-0.5 rounded-md border shrink-0 ${
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

        {/* Main Value & Indicator Display (Teks berada di atas grafik) */}
        <div className="shrink-0 mb-1">
          <div className="flex items-baseline gap-1.5 min-w-0 overflow-hidden">
            <span className="text-lg sm:text-xl font-extrabold text-slate-800 tabular-nums tracking-tight truncate">
              {latestValStr || '-'}
            </span>
            <span className="text-[10px] font-bold text-slate-500 shrink-0">
              {ind.satuan_nama || ''}
            </span>
          </div>
          <div 
            className="text-[10px] font-semibold text-slate-500 leading-tight mt-0.5 flex items-center gap-1.5 min-w-0"
            title={cardTooltip}
          >
            <span className="truncate" title={ind.nama_data}>{ind.nama_data}</span>
            {ind.sumber_data && (
              <span 
                className="text-[8.5px] font-bold text-slate-500 shrink-0 px-1.5 py-0.5 rounded bg-slate-100/90 border border-slate-200/70 leading-none whitespace-nowrap"
                title={`Sumber Data: ${ind.sumber_data}`}
              >
                {ind.sumber_data.toLowerCase().startsWith('sumber') ? ind.sumber_data : `Sumber: ${ind.sumber_data}`}
              </span>
            )}
          </div>
        </div>

        {/* Chart with visible numeric values & years (Grafik berada di bawah tulisan) */}
        <div className="pt-0.5 flex items-end justify-center w-full min-w-0 flex-1">
          {renderInteractiveChart(
            isMobile ? `mobile-${ind.id}` : ind.id,
            chartPoints,
            theme.stroke,
            theme.fill,
            ind.satuan_nama || '',
            isMobile ? 90 : 84
          )}
        </div>
      </div>
    );
  };

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
                                {ind.kode ? `${ind.kode} • ` : ''}{ind.satuan_nama || 'Tanpa satuan'}{ind.sumber_data ? ` • Sumber: ${ind.sumber_data}` : ''}
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
              onClick={() => saveSelection(indicators.slice(0, 4).map(i => i.id))}
              className="mt-2 text-xs font-bold text-blue-600 hover:underline cursor-pointer"
            >
              Tampilkan 4 Indikator Bawaan
            </button>
          </div>
        ) : (
          <>
            {/* Desktop / Tablet: 2x2 Grid Layout (2 atas, 2 bawah) */}
            <div className="hidden sm:grid sm:grid-cols-2 gap-3.5 h-full">
              {paginatedIndicators.map((ind, idx) => renderIndicatorCard(ind, idx, false))}
            </div>

            {/* Mobile / WPA: 3D Cylindrical Ring Carousel (Cincin Silinder Melingkar persis seperti referensi visual) */}
            {displayedIndicators.length > 0 && (() => {
              const currentEffectiveRotation = cylinderRotation + dragDeltaAngle;

              return (
                <div className="block sm:hidden w-full min-h-[270px] flex flex-col justify-between overflow-hidden">
                  {/* 3D Perspective Viewport */}
                  <div 
                    className="relative w-full h-[225px] flex items-center justify-center overflow-hidden touch-pan-y cursor-grab active:cursor-grabbing"
                    style={{ 
                      perspective: '900px',
                      perspectiveOrigin: '50% 48%'
                    }}
                    onTouchStart={(e) => handleDragStart(e.touches[0].clientX, e.touches[0].clientY)}
                    onTouchMove={(e) => handleDragMove(e.touches[0].clientX, e.touches[0].clientY)}
                    onTouchEnd={handleDragEnd}
                    onMouseDown={(e) => {
                      if (e.button === 0) handleDragStart(e.clientX, e.clientY);
                    }}
                    onMouseMove={(e) => {
                      if (e.buttons === 1) handleDragMove(e.clientX, e.clientY);
                    }}
                    onMouseUp={handleDragEnd}
                    onMouseLeave={handleDragEnd}
                  >
                    {cylinderFaces.map((faceItem, faceIdx) => {
                      const faceAngle = faceIdx * stepAngle;
                      const rawAngle = (faceAngle + currentEffectiveRotation);
                      const normalized = ((rawAngle % 360) + 360) % 360;
                      const relAngle = normalized > 180 ? normalized - 360 : normalized;

                      // Circular cylinder ring math
                      const rad = relAngle * (Math.PI / 180);
                      const cosVal = Math.cos(rad);
                      const sinVal = Math.sin(rad);

                      // Visible on the front arc of the cylinder ring (-105deg to +105deg)
                      const isVisible = Math.abs(relAngle) < 105;
                      const isForeground = Math.abs(relAngle) < 35;

                      // Coordinates following the 3D circular cylinder ring
                      const posX = Math.round(sinVal * 162);
                      const posY = Math.round((1 - cosVal) * -12); // Melingkar naik mengikuti elips cincin
                      const posZ = Math.round((cosVal - 1) * 115);
                      const rotY = Math.round(relAngle * 0.76); // Berputar mengikuti cincin silinder
                      const scale = Math.max(0.78, 0.85 + 0.15 * cosVal);
                      const opacity = isVisible ? Math.min(1, Math.max(0.2, cosVal * 1.15)) : 0;
                      const zIndex = Math.round(10 + 20 * cosVal);

                      return (
                        <div
                          key={`cyl-ring-card-${faceItem.indicator.id}-${faceIdx}`}
                          className="absolute w-[295px] sm:w-[315px] h-[210px] max-w-[88vw] flex items-center justify-center select-none will-change-transform"
                          style={{
                            transform: `translate3d(${posX}px, ${posY}px, ${posZ}px) rotateY(${rotY}deg) scale(${scale})`,
                            opacity: isVisible ? opacity : 0,
                            zIndex: zIndex,
                            pointerEvents: isForeground ? 'auto' : 'none',
                            transition: isDragging ? 'none' : 'transform 0.45s cubic-bezier(0.2, 0.85, 0.25, 1), opacity 0.45s ease',
                            contain: 'layout paint',
                            willChange: 'transform, opacity'
                          }}
                        >
                          {/* Clean Curved Rectangle Card Frame with Soft 3D Elevation */}
                          <div 
                            className="relative w-full h-full rounded-[22px] overflow-hidden"
                            style={{
                              boxShadow: isForeground
                                ? '0 16px 32px -8px rgba(15,23,42,0.14), 0 4px 12px -2px rgba(15,23,42,0.06)'
                                : '0 8px 18px -6px rgba(15,23,42,0.07)',
                              transition: isDragging ? 'none' : 'box-shadow 0.3s ease'
                            }}
                          >
                            {renderIndicatorCard(faceItem.indicator, faceItem.originalIndex, true)}
                          </div>
                        </div>
                      );
                    })}

                    {/* Floating Prev Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        prevMobileCard();
                      }}
                      className="absolute left-1 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 backdrop-blur-md shadow-md border border-slate-200 text-slate-700 flex items-center justify-center hover:bg-white active:scale-95 transition-all z-40 cursor-pointer"
                      aria-label="Grafik Sebelumnya"
                      title="Grafik Sebelumnya"
                    >
                      <ChevronLeft size={16} strokeWidth={2.5} />
                    </button>

                    {/* Floating Next Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        nextMobileCard();
                      }}
                      className="absolute right-1 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 backdrop-blur-md shadow-md border border-slate-200 text-slate-700 flex items-center justify-center hover:bg-white active:scale-95 transition-all z-40 cursor-pointer"
                      aria-label="Grafik Berikutnya"
                      title="Grafik Berikutnya"
                    >
                      <ChevronRight size={16} strokeWidth={2.5} />
                    </button>
                  </div>

                  {/* Mobile Pagination Dots & Clean Indicator Index */}
                  <div className="pt-2 pb-0.5 px-2 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-1.5">
                      {displayedIndicators.map((ind, dotIdx) => {
                        const isActive = dotIdx === activeMobileIndex;
                        const dotTheme = getIndicatorTheme(ind, dotIdx);
                        return (
                          <button
                            key={ind.id}
                            type="button"
                            onClick={() => handleDotClick(dotIdx)}
                            className={`transition-all duration-300 rounded-full cursor-pointer border ${
                              isActive 
                                ? 'w-5 h-2 shadow-xs border-transparent' 
                                : 'w-2 h-2 bg-slate-200 hover:bg-slate-300 border-transparent'
                            }`}
                            style={{
                              backgroundColor: isActive ? dotTheme.fallback : undefined
                            }}
                            title={`Lihat ${ind.nama_data}`}
                          />
                        );
                      })}
                    </div>

                    <span className="text-[11px] font-extrabold text-slate-400 tabular-nums select-none">
                      {activeMobileIndex + 1} / {displayedIndicators.length}
                    </span>
                  </div>
                </div>
              );
            })()}
          </>
        )}
      </div>

      {/* Footer Bar: Link to Data Makro Menu + Desktop Pagination */}
      <div className="px-5 py-2.5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between shrink-0">
        {/* Desktop Pagination */}
        <div className="hidden sm:flex items-center">
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
        </div>

        {/* Mobile Info */}
        <div className="flex sm:hidden items-center">
          <span className="text-[10px] font-medium text-slate-400">
            Tersinkronisasi otomatis
          </span>
        </div>

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
