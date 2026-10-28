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
  Sparkles,
  Copy,
  BarChart3,
  PieChart,
  Activity
} from 'lucide-react';
import { toPng } from 'html-to-image';
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

// Clean Single Popover Copy Chart Button (Generik & Identik in Ultra-HD 300 DPI PNG)
interface CopyChartButtonProps {
  ind: MacroIndicator;
  chartId: string | number;
  latestValStr: string;
  latestYear: number;
  onCopy: (mode: 'generik' | 'identik', ind: MacroIndicator, chartId: string | number, latestValStr: string, latestYear: number) => void;
  isCopied: boolean;
}

const CopyChartButton: React.FC<CopyChartButtonProps> = ({
  ind,
  chartId,
  latestValStr,
  latestYear,
  onCopy,
  isCopied
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen]);

  return (
    <div className="relative" ref={containerRef} onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(prev => !prev);
        }}
        className={`p-1 rounded-md transition-all cursor-pointer border ${
          isCopied
            ? 'bg-emerald-100 text-emerald-700 border-emerald-300 shadow-2xs'
            : 'bg-white/90 hover:bg-slate-100 text-slate-400 hover:text-slate-700 border-slate-200/80 shadow-2xs'
        }`}
        title={isCopied ? 'Grafik berhasil disalin ke clipboard!' : 'Salin grafik Ultra-HD (Generik / Identik)'}
        aria-label="Pilihan salin grafik"
      >
        {isCopied ? (
          <Check size={10} strokeWidth={2.5} className="text-emerald-600" />
        ) : (
          <Copy size={10} strokeWidth={2} />
        )}
      </button>

      {isOpen && (
        <div 
          onClick={(e) => e.stopPropagation()}
          className="absolute right-0 top-full mt-1.5 w-32 bg-white rounded-xl shadow-xl border border-slate-200/90 p-1 z-50 animate-in fade-in zoom-in-95 duration-100 select-none flex flex-col gap-0.5"
        >
          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              onCopy('generik', ind, chartId, latestValStr, latestYear);
            }}
            className="w-full text-center py-1.5 px-3 rounded-lg text-xs font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors cursor-pointer"
          >
            Generik
          </button>

          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              onCopy('identik', ind, chartId, latestValStr, latestYear);
            }}
            className="w-full text-center py-1.5 px-3 rounded-lg text-xs font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors cursor-pointer"
          >
            Identik
          </button>
        </div>
      )}
    </div>
  );
};
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

  // Shape of chart: 'area' | 'bar' | 'pie' | 'line'
  const [chartType, setChartType] = useState<'area' | 'bar' | 'pie' | 'line'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('macro_chart_shape_type');
      if (saved === 'area' || saved === 'bar' || saved === 'pie' || saved === 'line') {
        return saved;
      }
    }
    return 'area';
  });
  const [showChartTypeDropdown, setShowChartTypeDropdown] = useState<boolean>(false);
  const chartTypeDropdownRef = useRef<HTMLDivElement>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const handleSelectChartType = (type: 'area' | 'bar' | 'pie' | 'line') => {
    setChartType(type);
    localStorage.setItem('macro_chart_shape_type', type);
    setShowChartTypeDropdown(false);
  };

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
      if (chartTypeDropdownRef.current && !chartTypeDropdownRef.current.contains(e.target as Node)) {
        setShowChartTypeDropdown(false);
      }
    };
    if (showDropdown || showChartTypeDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown, showChartTypeDropdown]);

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

  // Copy Chart Graphic (High-Resolution 2x Retina PNG without counter selisih, with Nama & Sumber)
  // Copy Chart Graphic using Native HTML5 Canvas 2D in Ultra-HD 300 DPI (3x Scale)
  const handleCopyChart = (
    mode: 'generik' | 'identik',
    ind: MacroIndicator,
    chartId: string | number,
    latestValStr: string,
    latestYear: number
  ) => {
    try {
      const svgEl = document.getElementById(`macro-chart-svg-${chartId}`) as SVGSVGElement | null;
      if (!svgEl) {
        console.warn("SVG chart element not found for copying:", chartId);
        return;
      }

      const rawSumber = (ind.sumber_data || '').trim();
      const sumberLabel = rawSumber ? (rawSumber.toLowerCase().startsWith('sumber') ? rawSumber : `Sumber: ${rawSumber}`) : '';
      const fullTitle = ind.nama_data || '';

      // Ultra-HD 300 DPI Sharpness (3x Scale)
      const scale = 3;
      const cardW = 350 * scale; // 1050px
      const cardH = (mode === 'generik' ? 190 : 205) * scale; // 570px - 615px

      const canvas = document.createElement('canvas');
      canvas.width = cardW;
      canvas.height = cardH;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const drawRoundRect = (x: number, y: number, w: number, h: number, r: number) => {
        if (typeof ctx.roundRect === 'function') {
          ctx.beginPath();
          ctx.roundRect(x, y, w, h, r);
        } else {
          ctx.beginPath();
          ctx.moveTo(x + r, y);
          ctx.lineTo(x + w - r, y);
          ctx.quadraticCurveTo(x + w, y, x + w, y + r);
          ctx.lineTo(x + w, y + h - r);
          ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
          ctx.lineTo(x + r, y + h);
          ctx.quadraticCurveTo(x, y + h, x, y + h - r);
          ctx.lineTo(x, y + r);
          ctx.quadraticCurveTo(x, y, x + r, y);
          ctx.closePath();
        }
      };

      let chartTop = 0;
      let chartH = 0;

      if (mode === 'identik') {
        // Solid white background
        ctx.fillStyle = '#ffffff';
        drawRoundRect(0, 0, cardW, cardH, 16 * scale);
        ctx.fill();

        // Subtle top-to-bottom card gradient
        const bgGrad = ctx.createLinearGradient(0, 0, 0, cardH);
        bgGrad.addColorStop(0, '#f8fafc');
        bgGrad.addColorStop(1, '#ffffff');
        ctx.fillStyle = bgGrad;
        drawRoundRect(0, 0, cardW, cardH, 16 * scale);
        ctx.fill();

        // Card border
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 1.5 * scale;
        drawRoundRect(1, 1, cardW - 2, cardH - 2, 16 * scale);
        ctx.stroke();

        // Badge Kiri Atas: [ KODE (YEAR) ]
        const badgeText = `${(ind.kode || ind.nama_data).toUpperCase()} (${latestYear || '-'})`;
        ctx.font = `bold ${9.5 * scale}px system-ui, -apple-system, sans-serif`;
        ctx.textAlign = 'left';
        const badgeTextW = ctx.measureText(badgeText).width;
        const badgePadX = 7 * scale;
        const badgeW = badgeTextW + (badgePadX * 2);
        const badgeH = 18 * scale;
        const badgeX = 16 * scale;
        const badgeY = 14 * scale;

        ctx.fillStyle = '#eff6ff';
        ctx.strokeStyle = '#bfdbfe';
        ctx.lineWidth = 1 * scale;
        drawRoundRect(badgeX, badgeY, badgeW, badgeH, 5 * scale);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#0284c7';
        ctx.fillText(badgeText, badgeX + badgePadX, badgeY + (12.5 * scale));

        // Value & Satuan
        ctx.textAlign = 'left';
        ctx.fillStyle = '#0f172a';
        ctx.font = `900 ${22 * scale}px system-ui, -apple-system, sans-serif`;
        const valText = latestValStr || '-';
        const valY = 56 * scale;
        ctx.fillText(valText, 16 * scale, valY);

        const valW = ctx.measureText(valText).width;
        if (ind.satuan_nama) {
          ctx.fillStyle = '#64748b';
          ctx.font = `bold ${10 * scale}px system-ui, -apple-system, sans-serif`;
          ctx.fillText(ind.satuan_nama, 16 * scale + valW + (6 * scale), valY - (2 * scale));
        }

        // Nama Lengkap Indikator
        ctx.font = `600 ${9.5 * scale}px system-ui, -apple-system, sans-serif`;
        ctx.fillStyle = '#475569';
        const maxNamaW = cardW - (145 * scale);
        ctx.fillText(fullTitle, 16 * scale, 74 * scale, maxNamaW);

        // Badge Sumber Data
        if (sumberLabel) {
          ctx.font = `bold ${8.5 * scale}px system-ui, -apple-system, sans-serif`;
          const sTextW = ctx.measureText(sumberLabel).width;
          const sBadgeW = sTextW + (10 * scale);
          const sBadgeH = 16 * scale;
          const sBadgeX = cardW - sBadgeW - (16 * scale);
          const sBadgeY = 62 * scale;

          ctx.fillStyle = '#f1f5f9';
          ctx.strokeStyle = '#e2e8f0';
          ctx.lineWidth = 1 * scale;
          drawRoundRect(sBadgeX, sBadgeY, sBadgeW, sBadgeH, 4 * scale);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#64748b';
          ctx.fillText(sumberLabel, sBadgeX + (5 * scale), sBadgeY + (11 * scale));
        }

        chartTop = 86 * scale;
        chartH = cardH - chartTop - (10 * scale);
      } else {
        // --- FORMAT GENERIK: Judul di tengah, sumber di kiri bawah tanpa frame ---
        ctx.fillStyle = '#ffffff';
        drawRoundRect(0, 0, cardW, cardH, 16 * scale);
        ctx.fill();

        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 1.5 * scale;
        drawRoundRect(1, 1, cardW - 2, cardH - 2, 16 * scale);
        ctx.stroke();

        // Judul di Tengah (Nama Indikator murni tanpa satuan)
        ctx.textAlign = 'center';
        ctx.fillStyle = '#0f172a';
        ctx.font = `bold ${12 * scale}px system-ui, -apple-system, sans-serif`;
        ctx.fillText(fullTitle, cardW / 2, 26 * scale, cardW - (32 * scale));

        // Sumber di Kiri Bawah Tanpa Frame
        if (sumberLabel) {
          ctx.textAlign = 'left';
          ctx.fillStyle = '#94a3b8';
          ctx.font = `500 ${9 * scale}px system-ui, -apple-system, sans-serif`;
          ctx.fillText(sumberLabel, 16 * scale, cardH - (12 * scale));
        }

        chartTop = 38 * scale;
        chartH = cardH - chartTop - (26 * scale);
      }

      // Serialize SVG element directly into Image for Canvas
      const serializer = new XMLSerializer();
      let svgStr = serializer.serializeToString(svgEl);
      if (!svgStr.includes('xmlns="http://www.w3.org/2000/svg"')) {
        svgStr = svgStr.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ');
      }
      const vb = svgEl.getAttribute('viewBox') || '0 0 280 84';
      const parts = vb.split(' ').map(Number);
      const vbW = parts[2] || 280;
      const vbH = parts[3] || 84;
      svgStr = svgStr.replace(/<svg\b([^>]*)>/, `<svg$1 width="${vbW}" height="${vbH}">`);

      const img = new Image();
      img.onload = () => {
        const chartX = 16 * scale;
        const chartW = cardW - (32 * scale);
        ctx.drawImage(img, chartX, chartTop, chartW, chartH);

        canvas.toBlob(async (blob) => {
          if (!blob) return;
          try {
            if (navigator.clipboard && typeof ClipboardItem !== 'undefined') {
              await navigator.clipboard.write([
                new ClipboardItem({ 'image/png': blob })
              ]);
              setCopiedId(ind.id);
              setTimeout(() => setCopiedId(null), 1800);
            } else {
              const a = document.createElement('a');
              a.href = canvas.toDataURL('image/png');
              a.download = `Grafik_${mode}_${(ind.kode || ind.nama_data).replace(/[^a-zA-Z0-9]/g, '_')}.png`;
              a.click();
              setCopiedId(ind.id);
              setTimeout(() => setCopiedId(null), 1800);
            }
          } catch (clipErr) {
            console.warn('Clipboard write error, fallback to download:', clipErr);
            const a = document.createElement('a');
            a.href = canvas.toDataURL('image/png');
            a.download = `Grafik_${mode}_${(ind.kode || ind.nama_data).replace(/[^a-zA-Z0-9]/g, '_')}.png`;
            a.click();
            setCopiedId(ind.id);
            setTimeout(() => setCopiedId(null), 1800);
          }
        }, 'image/png');
      };

      img.onerror = (imgErr) => {
        console.error('Failed to load SVG into Image for canvas copy:', imgErr);
      };

      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgStr);
    } catch (err) {
      console.error('Failed to copy chart graphic:', err);
    }
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

  // Render responsive SVG line/bar/pie/area chart with numbers and years
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

    // 1. Diagram Batang (Modern Rounded Bar Chart)
    if (chartType === 'bar') {
      const bPadLeft = 16;
      const bPadRight = 16;
      const bPadTop = 18;
      const bPadBottom = 20;
      const usableW = width - bPadLeft - bPadRight;
      const colW = usableW / points.length;
      const barW = Math.min(26, Math.max(16, colW * 0.58));
      const maxH = height - bPadTop - bPadBottom - 2;
      const baseLineY = height - bPadBottom;
      const gradBarId = `grad-bar-${chartId}`;

      return (
        <svg 
          id={`macro-chart-svg-${chartId}`}
          viewBox={`0 0 ${width} ${height}`} 
          style={{ height: `${chartHeight}px` }}
          className="w-full overflow-visible"
        >
          <defs>
            <linearGradient id={gradBarId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={strokeColor} stopOpacity="1" />
              <stop offset="100%" stopColor={strokeColor} stopOpacity="0.45" />
            </linearGradient>
          </defs>

          {/* Baseline */}
          <line 
            x1={bPadLeft - 4} 
            y1={baseLineY} 
            x2={width - bPadRight + 4} 
            y2={baseLineY} 
            stroke="#e2e8f0" 
            strokeDasharray="3 3" 
            strokeWidth="1" 
          />

          {points.map((p, i) => {
            const centerX = bPadLeft + (i + 0.5) * colW;
            const norm = range === 0 ? 0.5 : (p.val - min) / range;
            const barH = Math.max(8, norm * maxH);
            const barY = baseLineY - barH;
            const barX = centerX - barW / 2;

            return (
              <g key={i} className="group/bar">
                <title>{`Tahun ${p.year}: ${p.raw} ${satuan}`}</title>
                
                {/* Background Track */}
                <rect 
                  x={barX} 
                  y={bPadTop} 
                  width={barW} 
                  height={maxH} 
                  rx="4" 
                  fill="#f1f5f9" 
                  opacity="0.65" 
                />

                {/* Gradient Rounded Active Bar */}
                <rect 
                  x={barX} 
                  y={barY} 
                  width={barW} 
                  height={barH} 
                  rx="4" 
                  fill={`url(#${gradBarId})`}
                  className="transition-all duration-300 group-hover/bar:brightness-110" 
                />

                {/* Value Label */}
                <text
                  x={centerX}
                  y={Math.max(12, barY - 4)}
                  textAnchor="middle"
                  fontSize="9.5"
                  fontWeight="bold"
                  fill="#1e293b"
                  className="select-none font-sans"
                >
                  {p.label}
                </text>

                {/* Year Label */}
                <text
                  x={centerX}
                  y={height - 6}
                  textAnchor="middle"
                  fontSize="8.5"
                  fontWeight="600"
                  fill="#94a3b8"
                  className="select-none font-sans"
                >
                  {p.year}
                </text>
              </g>
            );
          })}
        </svg>
      );
    }

    // 2. Diagram Donut / Pie (Radial Donut with Compact Legend)
    if (chartType === 'pie') {
      const cx = 50;
      const cy = 42;
      const r = 24;
      const strokeW = 11;
      const C = 2 * Math.PI * r;
      const totalSum = points.reduce((acc, p) => acc + (p.val > 0 ? p.val : 0.001), 0);
      
      let accumulatedLength = 0;
      const latestPoint = points[points.length - 1];

      return (
        <svg 
          id={`macro-chart-svg-${chartId}`}
          viewBox={`0 0 ${width} ${height}`} 
          style={{ height: `${chartHeight}px` }}
          className="w-full overflow-visible"
        >
          {/* Background circle ring */}
          <circle 
            cx={cx} 
            cy={cy} 
            r={r} 
            fill="none" 
            stroke="#f1f5f9" 
            strokeWidth={strokeW} 
          />

          {/* Slices */}
          {points.map((p, i) => {
            const fraction = totalSum > 0 ? Math.max(0.001, p.val) / totalSum : 1 / points.length;
            const sliceLength = fraction * C;
            const gap = points.length > 1 ? 2.5 : 0;
            const effectiveLength = Math.max(0.5, sliceLength - gap);
            const dashArray = `${effectiveLength} ${C - effectiveLength}`;
            const dashOffset = -accumulatedLength;
            accumulatedLength += sliceLength;
            const opacity = 0.35 + (i / Math.max(1, points.length - 1)) * 0.65;

            return (
              <circle
                key={i}
                cx={cx}
                cy={cy}
                r={r}
                fill="none"
                stroke={strokeColor}
                strokeWidth={strokeW}
                strokeDasharray={dashArray}
                strokeDashoffset={dashOffset}
                strokeLinecap="round"
                opacity={opacity}
                className="transition-all duration-300"
                style={{ transformOrigin: `${cx}px ${cy}px`, transform: 'rotate(-90deg)' }}
              >
                <title>{`Tahun ${p.year}: ${p.raw} ${satuan} (${Math.round(fraction * 100)}%)`}</title>
              </circle>
            );
          })}

          {/* Center Donut Text */}
          <text 
            x={cx} 
            y={cy - 2} 
            textAnchor="middle" 
            fontSize="9" 
            fontWeight="900" 
            fill="#0f172a" 
            className="select-none font-sans"
          >
            {latestPoint?.year}
          </text>
          <text 
            x={cx} 
            y={cy + 8} 
            textAnchor="middle" 
            fontSize="7.5" 
            fontWeight="bold" 
            fill={strokeColor} 
            className="select-none font-sans"
          >
            {latestPoint?.label}
          </text>

          {/* Right Side Compact Legend */}
          {points.slice(-4).map((p, idx, arr) => {
            const isLatest = idx === arr.length - 1;
            const op = 0.35 + (idx / Math.max(1, arr.length - 1)) * 0.65;
            const pct = totalSum > 0 ? Math.round((p.val / totalSum) * 100) : 0;
            const itemY = 16 + idx * 17;

            return (
              <g key={idx} className="group/legend">
                <title>{`Tahun ${p.year}: ${p.raw} ${satuan} (${pct}%)`}</title>
                {/* Color Dot */}
                <rect x="100" y={itemY - 6} width="7" height="7" rx="2" fill={strokeColor} opacity={op} />
                {/* Year */}
                <text x="113" y={itemY} fontSize="8.5" fontWeight={isLatest ? "bold" : "600"} fill={isLatest ? "#0f172a" : "#64748b"} className="select-none font-sans">
                  {p.year}
                </text>
                {/* Value */}
                <text x="175" y={itemY} fontSize="8.5" fontWeight="bold" fill={isLatest ? strokeColor : "#334155"} className="select-none font-sans">
                  {p.label} {satuan}
                </text>
                {/* Share % */}
                <text x="272" y={itemY} textAnchor="end" fontSize="8" fontWeight="600" fill="#94a3b8" className="select-none font-sans">
                  {pct}%
                </text>
              </g>
            );
          })}
        </svg>
      );
    }

    // 3. Garis Minimalis (Clean Line Chart with Reference Lines)
    if (chartType === 'line') {
      const step = (width - padLeft - padRight) / (points.length - 1);
      const coords = points.map((p, i) => {
        const x = padLeft + i * step;
        const normalized = (p.val - min) / range;
        const y = height - padBottom - normalized * (height - padTop - padBottom);
        return { ...p, x, y };
      });

      const pathD = `M ${coords.map(c => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' L ')}`;

      return (
        <svg 
          id={`macro-chart-svg-${chartId}`}
          viewBox={`0 0 ${width} ${height}`} 
          style={{ height: `${chartHeight}px` }}
          className="w-full overflow-visible"
        >
          {/* Subtle horizontal grid lines */}
          <line x1={padLeft - 6} y1={height * 0.35} x2={width - padRight + 6} y2={height * 0.35} stroke="#f1f5f9" strokeWidth="1" />
          <line x1={padLeft - 6} y1={height * 0.65} x2={width - padRight + 6} y2={height * 0.65} stroke="#f1f5f9" strokeWidth="1" />
          <line x1={padLeft - 6} y1={height - padBottom} x2={width - padRight + 6} y2={height - padBottom} stroke="#e2e8f0" strokeDasharray="3 3" strokeWidth="1" />

          {/* Crisp Line */}
          <path 
            d={pathD} 
            fill="none" 
            stroke={strokeColor} 
            strokeWidth="2.5" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
          />

          {/* Points */}
          {coords.map((c, i) => {
            const isLast = i === coords.length - 1;
            return (
              <g key={i} className="group/pt">
                <title>{`Tahun ${c.year}: ${c.raw} ${satuan}`}</title>
                
                {/* Outer halo on latest point */}
                {isLast && (
                  <circle cx={c.x} cy={c.y} r="6.5" fill={strokeColor} opacity="0.22" className="animate-pulse" />
                )}

                <circle
                  cx={c.x}
                  cy={c.y}
                  r={isLast ? "4" : "3"}
                  fill={strokeColor}
                  stroke="#ffffff"
                  strokeWidth="1.5"
                  className="transition-transform group-hover/pt:scale-125"
                />

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
            );
          })}
        </svg>
      );
    }

    // 4. Default: Area Kurva (Smooth Spline Gradient Area)
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
        id={`macro-chart-svg-${chartId}`}
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
    const cardId = isMobile ? `mobile-${ind.id}` : ind.id;

    return (
      <div 
        key={cardId}
        id={`macro-card-${cardId}`}
        onClick={() => {
          if (hasDraggedRef.current) return;
          goToMenuDataMakro();
        }}
        style={theme.cardStyle}
        className={`${isMobile ? 'rounded-[24px]' : 'rounded-2xl'} border p-3 sm:p-3.5 flex flex-col justify-between hover:shadow-md transition-all duration-300 cursor-pointer overflow-hidden group select-none relative ${
          isMobile ? 'h-full w-full' : ''
        }`}
        title={cardTooltip}
      >
        {/* Top Bar: Title Badge + Trend Badge (N vs N-1) & Copy Button */}
        <div className="flex items-center justify-between gap-1.5 mb-1 shrink-0">
          <span 
            style={theme.badgeStyle}
            className="text-[9.5px] sm:text-[9.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md truncate max-w-[65%] border"
            title={cardTooltip}
          >
            {ind.kode || ind.nama_data} ({latestYear ? latestYear : '-'})
          </span>

          {/* Top Right: Trend Difference Badge + Copy Button */}
          <div className="flex items-center gap-1 shrink-0">
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

            {/* Fast-Response Isolated Copy Chart Button with Popover */}
            <CopyChartButton
              ind={ind}
              chartId={cardId}
              latestValStr={latestValStr}
              latestYear={latestYear}
              onCopy={handleCopyChart}
              isCopied={copiedId === ind.id}
            />
          </div>
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
            cardId,
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

          {/* Custom Chart Shape Type Dropdown (Bentuk Grafik) */}
          <div className="relative" ref={chartTypeDropdownRef}>
            <button
              type="button"
              onClick={() => setShowChartTypeDropdown(prev => !prev)}
              className={`px-2.5 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer border ${
                showChartTypeDropdown
                  ? 'bg-blue-50 text-blue-700 border-blue-300 shadow-xs'
                  : 'text-slate-700 bg-slate-50 hover:bg-slate-100 hover:text-slate-900 border-slate-200/90'
              }`}
              title="Pilih bentuk visual grafik (Batang, Pie/Donut, Area, Garis)"
            >
              {chartType === 'area' && <TrendingUp size={13} className="text-blue-600" />}
              {chartType === 'bar' && <BarChart3 size={13} className="text-blue-600" />}
              {chartType === 'pie' && <PieChart size={13} className="text-blue-600" />}
              {chartType === 'line' && <Activity size={13} className="text-blue-600" />}
              <span className="hidden sm:inline">
                {chartType === 'area' && 'Area'}
                {chartType === 'bar' && 'Batang'}
                {chartType === 'pie' && 'Pie / Donut'}
                {chartType === 'line' && 'Garis'}
              </span>
              <ChevronDown size={12} className={`text-slate-400 transition-transform duration-200 ${showChartTypeDropdown ? 'rotate-180' : ''}`} />
            </button>

            {/* Chart Type Dropdown Menu */}
            {showChartTypeDropdown && (
              <div className="absolute right-0 top-full mt-2 w-56 sm:w-64 bg-white rounded-2xl shadow-xl border border-slate-200/90 p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-2.5 py-2 border-b border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">Bentuk Grafik</span>
                  <span className="text-[10px] text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded-full">Visual</span>
                </div>
                <div className="mt-1 space-y-1">
                  {[
                    { id: 'area', label: 'Area Kurva', desc: 'Gradien kurva halus & elegan', icon: TrendingUp },
                    { id: 'bar', label: 'Diagram Batang', desc: 'Batang komparasi tahunan', icon: BarChart3 },
                    { id: 'pie', label: 'Diagram Donut / Pie', desc: 'Komposisi radial donat & nilai', icon: PieChart },
                    { id: 'line', label: 'Garis Minimalis', desc: 'Garis fokus tren & titik aktif', icon: Activity },
                  ].map(item => {
                    const IconComp = item.icon;
                    const isActive = chartType === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleSelectChartType(item.id as any)}
                        className={`w-full text-left px-2.5 py-2 rounded-xl flex items-center justify-between transition-all cursor-pointer ${
                          isActive
                            ? 'bg-blue-50/80 text-blue-800 font-bold border border-blue-200/80'
                            : 'text-slate-700 hover:bg-slate-50 border border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                            isActive ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-100 text-slate-500'
                          }`}>
                            <IconComp size={14} />
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-bold truncate leading-tight">{item.label}</div>
                            <div className="text-[10px] text-slate-400 font-medium truncate mt-0.5">{item.desc}</div>
                          </div>
                        </div>
                        {isActive && <Check size={14} className="text-blue-600 shrink-0 ml-2" />}
                      </button>
                    );
                  })}
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
