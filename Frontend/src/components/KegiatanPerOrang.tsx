import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, ChevronLeft, ChevronRight, Download, Filter, Printer, Save, User, Info, CheckCircle2, XCircle, Clock, AlertCircle, Edit2, MessageSquare, FileText, TrendingUp, Search } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { toPng } from 'html-to-image';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { SearchableSelect } from './common/SearchableSelect';

// Dynamic types will be fetched from API
interface ActivityType {
    id: number;
    parent_id: number | null;
    kode: string;
    nama: string;
    deskripsi: string;
    warna: string;
    warna_teks: string;
    is_jumlah_full: boolean;
    is_rapat: boolean;
    urutan: number;
    subOptions?: ActivityType[];
}

const MOCK_MEETINGS = [
    { id: 'M1', nama: 'Rapat Koordinasi Internal' },
    { id: 'M2', nama: 'Rapat Persiapan Musrenbang' },
    { id: 'M3', nama: 'Rapat Evaluasi Program' },
    { id: 'M4', nama: 'Rapat Teknis Aplikasi' },
    { id: 'M5', nama: 'Rapat Koordinasi Lintas Sektoral' },
    { id: 'M6', nama: 'rapat mamin Online' },
    { id: 'M7', nama: 'rapat mamin Offline' },
];

const MOCK_LETTERS = [
    { id: 'S1', nomor: '001/BAP/2026', perihal: 'Undangan Rapat Koordinasi' },
    { id: 'S2', nomor: '002/BAP/2026', perihal: 'SPT Dinas Luar Jakarta' },
    { id: 'S3', nomor: '003/BAP/2026', perihal: 'Surat Tugas Monitoring' },
    { id: 'S4', nomor: '004/BAP/2026', perihal: 'Nota Dinas Internal' },
];

// High-Performance Imperative Tooltip Component
const ActivitiesTooltip = React.forwardRef((props: any, ref) => {
    const [data, setData] = useState<any>(null);
    const [pos, setPos] = useState({ x: 0, y: 0 });

    React.useImperativeHandle(ref, () => ({
        show: (content: any, x: number, y: number) => {
            setData(content);
            setPos({ x, y });
        },
        hide: () => {
            setData(null);
        }
    }));

    if (!data) return null;

    return (
        <div
            className="fixed z-[600] bg-white/95 backdrop-blur shadow-2xl border border-slate-200 rounded-2xl p-4 flex flex-col gap-3 min-w-[240px] animate-in fade-in zoom-in-95 duration-150 pointer-events-none"
            style={{
                left: pos.x + 20,
                top: pos.y + 20,
            }}
        >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-ppm-slate/5 flex items-center justify-center text-ppm-slate">
                        <User size={14} />
                    </div>
                    <div>
                        <div className="text-[11px] font-bold text-slate-800">{data.nama}</div>
                        <div className="text-[9px] font-medium text-slate-400 capitalize">{data.session} • {data.day}</div>
                    </div>
                </div>
            </div>
            <div className="flex flex-col gap-2">
                {data.activities.map((act: any, idx: number) => {
                    return (
                        <div key={idx} className="p-2.5 rounded-xl bg-slate-50/50 border border-slate-100/50">
                            <div className="flex items-center gap-2 mb-1.5">
                                <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                                <div className="text-[10px] font-black text-slate-700 uppercase tracking-tight">{act.tipe}</div>
                            </div>
                            <div className="text-[10px] text-slate-500 font-medium leading-relaxed italic">"{act.keterangan || '-'}"</div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
});
// High-performance isolated search field to prevent main component re-renders while typing
const SearchField = React.memo(({ value, onSearch }: { value: string, onSearch: (val: string) => void }) => {
    const [localValue, setLocalValue] = useState(value);

    // Sync local value if parent value changes externally (e.g. reset)
    useEffect(() => {
        setLocalValue(value);
    }, [value]);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (localValue !== value) {
                onSearch(localValue);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [localValue, onSearch, value]);

    return (
        <div className="relative w-full lg:w-64">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
                type="text"
                placeholder="Cari Nama Pegawai..."
                value={localValue}
                onChange={(e) => setLocalValue(e.target.value)}
                className="input-modern pl-10 h-9 !py-1.5 text-[11px] font-bold border-slate-200/60 bg-white/80 shadow-sm"
            />
        </div>
    );
});

export default function KegiatanPerOrang() {
    const { user } = useAuth();
    const [view, setView] = useState<'monthly' | 'yearly'>('monthly');
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [year, setYear] = useState(new Date().getFullYear());
    const [bidangId, setBidangId] = useState<string>('all');
    const [data, setData] = useState<any[]>([]);
    const [instansiList, setInstansiList] = useState<any[]>([]);
    const [selectedInstansi, setSelectedInstansi] = useState<number | null>(null);
    const [bidangList, setBidangList] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [activeCell, setActiveCell] = useState<{ profil_id: number; day: number; session: 'Pagi' | 'Siang'; rect?: DOMRect } | null>(null);
    const [rangeSelection, setRangeSelection] = useState<{ profil_id: number; startDay: number; endDay: number; tipe_kegiatan: string; keterangan: string; selectedProfilIds: number[]; suratId?: string } | null>(null);
    const [meetingSelection, setMeetingSelection] = useState<{ profil_id: number; day: number; session: 'Pagi' | 'Siang'; tipe_kegiatan: string; pagi: boolean; siang: boolean; keterangan: string; selectedProfilIds: number[]; activityId?: string; activityNama?: string; suratId?: string } | null>(null);
    const [holidays, setHolidays] = useState<any[]>([]);
    const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
    const [activityTypes, setActivityTypes] = useState<ActivityType[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [holidayPrompt, setHolidayPrompt] = useState<{ day: number; tanggal: string; duration: number; keterangan: string } | null>(null);
    const [holidayOptions, setHolidayOptions] = useState<{ day: number; tanggal: string; keterangan: string } | null>(null);
    const monthlyHeaderRef = useRef<HTMLDivElement>(null);
    const monthlyTableRef = useRef<HTMLDivElement>(null);
    const yearlyHeaderRef = useRef<HTMLDivElement>(null);
    const yearlyTableRef = useRef<HTMLDivElement>(null);
    const printableReportRef = useRef<HTMLDivElement>(null);
    const stickyHeaderRef = useRef<HTMLDivElement>(null);
    const [headerHeight, setHeaderHeight] = useState(70);

    // Dynamic header height measurement
    useEffect(() => {
        const updateHeight = () => {
            if (stickyHeaderRef.current) {
                setHeaderHeight(stickyHeaderRef.current.offsetHeight);
            }
        };
        updateHeight();
        // Also update height when view changes
        const timer = setTimeout(updateHeight, 100);
        window.addEventListener('resize', updateHeight);
        return () => {
            window.removeEventListener('resize', updateHeight);
            clearTimeout(timer);
        };
    }, [view, isMonthPickerOpen]);

    // Scroll synchronization logic
    const handleBodyScroll = useCallback((e: React.UIEvent<HTMLDivElement>, headerRef: React.RefObject<HTMLDivElement>) => {
        if (headerRef.current) {
            headerRef.current.scrollLeft = e.currentTarget.scrollLeft;
        }
    }, []);

    const flatActivityTypes = useMemo(() => {
        const flat: ActivityType[] = [];
        const flatten = (items: ActivityType[]) => {
            items.forEach(item => {
                flat.push(item);
                if (item.subOptions) flatten(item.subOptions);
            });
        };
        flatten(activityTypes);
        return flat;
    }, [activityTypes]);

    const isSuperAdmin = user?.tipe_user_id === 1;
    const isAdminInstansi = user?.tipe_user_id === 2;
    const canChangeBidang = isSuperAdmin || isAdminInstansi;

    // Pre-calculate totals for all employees
    const processedData = useMemo(() => {
        return data.map(p => {
            if (!p.activities) return { ...p, monthTotals: {}, grandTotal: 0 };

            const monthTotals: any = activityTypes.reduce((acc, t) => ({ ...acc, [t.kode]: 0 }), {});
            let grandTotal = 0;

            Object.entries(p.activities || {}).forEach(([day, dayData]: any) => {
                ['Pagi', 'Siang'].forEach(session => {
                    const sessionActivities: any[] = dayData[session] || [];
                    sessionActivities.forEach((act: any) => {
                        const typeDef = activityTypes.find(t => t.kode === act.tipe || (act.tipe && t.subOptions?.some(s => s.kode === act.tipe)));
                        const baseKey = typeDef?.kode || act.tipe;

                        if (typeDef?.is_rapat) {
                            // Rapat logic handled separately below
                        } else if (monthTotals[baseKey] !== undefined) {
                            monthTotals[baseKey] += 0.5;
                            grandTotal += 0.5;
                        }
                    });
                });

                // Special handling for Rapat: Count distinct internal meeting IDs across both sessions
                const allDayActs: any[] = [...(dayData.Pagi || []), ...(dayData.Siang || [])];
                activityTypes.filter(t => t.is_rapat).forEach(rapatType => {
                    const meetingIds = new Set(
                        allDayActs
                            .filter(a => a.tipe === rapatType.kode || rapatType.subOptions?.some(s => s.kode === a.tipe))
                            .map(a => a.id_eksternal)
                    );
                    monthTotals[rapatType.kode] += meetingIds.size;
                    grandTotal += meetingIds.size;
                });
            });

            return { ...p, monthTotals, grandTotal };
        });
    }, [data, activityTypes]);

    const filteredData = useMemo(() => {
        if (!searchTerm) return processedData;
        const lowerSearch = searchTerm.toLowerCase();
        return processedData.filter(p => 
            p.nama_lengkap.toLowerCase().includes(lowerSearch)
        );
    }, [processedData, searchTerm]);

    // Roles: Super Admin (1), Admin Bidang (4), Kepala Bidang (6)
    const canEdit = [1, 4, 6].includes(user?.tipe_user_id || 0);

    const monthNames = [
        "Januari", "Februari", "Maret", "April", "Mei", "Juni",
        "Juli", "Agustus", "September", "Oktober", "November", "Desember"
    ];

    const dayNamesShort = ["M", "S", "S", "R", "K", "J", "S"];

    const handleDownloadPDF = async (type: 'monthly' | 'yearly') => {
        const element = printableReportRef.current;
        if (!element) return;

        try {
            // Stay visible long enough for high-res capture
            await new Promise(resolve => setTimeout(resolve, 600));

            const dataUrl = await toPng(element, {
                quality: 1.0,
                backgroundColor: '#ffffff',
                pixelRatio: 2
            });

            // F4 Size: 210mm x 330mm
            // Landscape: [width, height] = [330, 210]
            const pdf = new jsPDF({
                orientation: 'landscape',
                unit: 'mm',
                format: [330, 210]
            });

            // Calculate margins and available space
            const marginHorizontal = 10;
            const marginVertical = 10;
            const pageWidth = 330;
            const pageHeight = 210;
            const maxWidth = pageWidth - (marginHorizontal * 2);
            const maxHeight = pageHeight - (marginVertical * 2);

            // Calculate scaling to fit BOTH width and height
            const elementRatio = element.offsetWidth / element.offsetHeight;
            const targetRatio = maxWidth / maxHeight;

            let finalWidth, finalHeight;

            if (elementRatio > targetRatio) {
                // Element is wider than target area (constrained by width)
                finalWidth = maxWidth;
                finalHeight = finalWidth / elementRatio;
            } else {
                // Element is taller than target area (constrained by height)
                finalHeight = maxHeight;
                finalWidth = finalHeight * elementRatio;
            }

            // Center the content on the page
            const x = (pageWidth - finalWidth) / 2;
            const y = (pageHeight - finalHeight) / 2;

            pdf.addImage(dataUrl, 'PNG', x, y, finalWidth, finalHeight);
            pdf.save(`rekap-${type}-${year}${type === 'monthly' ? `-${month}` : ''}.pdf`);
        } catch (error) {
            console.error('Error generating PDF:', error);
            alert('Gagal mengunduh PDF. Silakan coba lagi.');
        }
    };

    // Click outside handler for dropdowns
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (activeCell && !target.closest('.activity-cell-active') && !target.closest('.activity-portal-menu')) {
                setActiveCell(null);
            }
            if (isMonthPickerOpen && !target.closest('.month-picker-container')) {
                setIsMonthPickerOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [activeCell, isMonthPickerOpen]);

    // Sync user profile to filters once loaded
    useEffect(() => {
        if (user) {
            setSelectedInstansi(prev => prev === null ? user.instansi_id : prev);
            if (user.bidang_id) {
                setBidangId(prev => (prev === 'all' || prev === 'undefined') ? user.bidang_id.toString() : prev);
            }
        }
    }, [user]);

    useEffect(() => {
        if (isSuperAdmin) {
            api.instansiDaerah.getAll().then(res => {
                if (res.success) setInstansiList(res.data);
            });
        }
    }, [isSuperAdmin]);

    useEffect(() => {
        if (selectedInstansi) {
            api.bidangInstansi.getAll().then(res => {
                if (res.success) {
                    setBidangList(res.data.filter((b: any) => b.instansi_id === selectedInstansi));
                }
            });
        }
    }, [selectedInstansi]);

    useEffect(() => {
        api.tipeKegiatan.getAll().then(res => {
            if (res.success) setActivityTypes(res.data);
        });
    }, []);

    const fetchData = async () => {
        if (!selectedInstansi) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        try {
            const res = view === 'monthly'
                ? await api.kegiatanPegawai.getMonthly({ instansi_id: selectedInstansi, bidang_id: bidangId, month, year })
                : await api.kegiatanPegawai.getYearly({ instansi_id: selectedInstansi, bidang_id: bidangId, year });

            if (res.success) setData(res.data);
            else setData([]);

            const typesRes = await api.tipeKegiatan.getAll();
            if (typesRes.success) setActivityTypes(typesRes.data);

            // Fetch holidays for the current month
            if (view === 'monthly') {
                const holRes = await api.holidays.getMonthly(year, month);
                if (holRes.success) setHolidays(holRes.data);
            }
        } catch (error) {
            console.error('Failed to fetch data:', error);
            setData([]);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [view, month, year, bidangId, selectedInstansi]);

    const daysInMonth = useMemo(() => {
        return new Date(year, month, 0).getDate();
    }, [month, year]);

    const handleSelectActivity = useCallback(async (profil_id: number, day: number, session: 'Pagi' | 'Siang', t: string | null) => {
        // State cleared
        try {
            const selectedType = flatActivityTypes.find(type => type.kode === t);

            if (t && selectedType?.is_rapat) {
                setMeetingSelection({
                    profil_id,
                    day,
                    session,
                    tipe_kegiatan: t,
                    pagi: session === 'Pagi',
                    siang: session === 'Siang',
                    keterangan: '',
                    selectedProfilIds: [profil_id],
                    activityId: '',
                    activityNama: ''
                });
                setActiveCell(null);
                return;
            }

            if (t && selectedType?.is_jumlah_full) {
                // Trigger range selection instead of direct saving
                setRangeSelection({
                    profil_id,
                    startDay: day,
                    endDay: day,
                    tipe_kegiatan: t,
                    keterangan: '',
                    selectedProfilIds: [profil_id]
                });
                setActiveCell(null);
                return;
            }

            const tanggal = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

            // Find current activities for this day/session
            const employeeData = data.find(p => p.profil_id === profil_id);
            const currentActivities = employeeData?.activities?.[day] || {};
            const currentSessionActivities: any[] = currentActivities[session] || [];

            // isClearing logic: if t is null, we clear EVERYTHING for this session
            const isClearing = !t;

            if (isClearing) {
                // If it's a full-day activity (C, S, DL, DLB), clear both sessions
                const currentType = flatActivityTypes.find(at => at.kode === currentSessionActivities[0]?.tipe);
                const isFullDay = currentType?.is_jumlah_full;

                await api.kegiatanPegawai.upsert({
                    profil_pegawai_id: profil_id,
                    tanggal,
                    sesi: isFullDay ? 'Both' : session,
                    tipe_kegiatan: null
                });
            } else {
                // For other types (C, S, DL, DLB), they replace everything in that session
                await api.kegiatanPegawai.upsert({
                    profil_pegawai_id: profil_id,
                    tanggal,
                    sesi: session,
                    tipe_kegiatan: t,
                    id_kegiatan_eksternal: '', // standard
                    nama_kegiatan: ''
                });
            }
            fetchData();
        } catch (err: any) {
            console.error('Error saving activity:', err);
        } finally {
            setActiveCell(null);
        }
    }, [flatActivityTypes, year, month, data, fetchData]);

    const handleBulkUpsert = async () => {
        if (!rangeSelection) return;
        setIsSaving(true);
        try {
            const { startDay, endDay, tipe_kegiatan, keterangan, selectedProfilIds, activity } = rangeSelection as any;
            const promises = [];
            const start = Math.min(startDay, endDay);
            const end = Math.max(startDay, endDay);

            for (const pid of rangeSelection.selectedProfilIds) {
                for (let d = start; d <= end; d++) {
                    const tanggal = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                    // Fill both Pagi and Siang
                    promises.push(api.kegiatanPegawai.upsert({
                        profil_pegawai_id: pid,
                        tanggal,
                        sesi: 'Pagi',
                        tipe_kegiatan,
                        id_kegiatan_eksternal: activity?.id,
                        nama_kegiatan: activity?.nama,
                        keterangan,
                        id_surat: rangeSelection.suratId // Added suratId
                    } as any));
                    promises.push(api.kegiatanPegawai.upsert({
                        profil_pegawai_id: pid,
                        tanggal,
                        sesi: 'Siang',
                        tipe_kegiatan,
                        id_kegiatan_eksternal: activity?.id,
                        nama_kegiatan: activity?.nama,
                        keterangan,
                        id_surat: rangeSelection.suratId // Added suratId
                    } as any));
                }
            }

            await Promise.all(promises);
            setRangeSelection(null);
            fetchData();
        } catch (err) {
            console.error('Error bulk saving:', err);
        } finally {
            setIsSaving(false);
        }
    };


    const handleMeetingSubmit = async (meetingArg?: any) => {
        if (!meetingSelection) return;
        setIsSaving(true);
        try {
            const { day, tipe_kegiatan, pagi, siang, keterangan, selectedProfilIds, activityId, activityNama, session: originalSession } = meetingSelection;
            const tanggal = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

            // Check if meetingArg is a valid meeting object (not an event)
            const isMeetingObject = meetingArg && typeof meetingArg === 'object' && 'id' in meetingArg;
            const finalId = isMeetingObject ? meetingArg.id : activityId;
            const finalNama = isMeetingObject ? meetingArg.nama : activityNama;

            const promises = [];
            for (const pid of selectedProfilIds) {
                // To prevent duplicates in the same session (where unique key includes id_eksternal):
                // If we are editing (1 person), we should clear other activities in the chosen sessions FIRST
                // if the finalId has changed or if we are replacing a non-meeting with a meeting.
                if (selectedProfilIds.length === 1) {
                    if (pagi) {
                        promises.push(api.kegiatanPegawai.upsert({
                            profil_pegawai_id: pid,
                            tanggal,
                            sesi: 'Pagi',
                            tipe_kegiatan: null // Clear existing session activities first to avoid duplicates
                        }));
                    }
                    if (siang) {
                        promises.push(api.kegiatanPegawai.upsert({
                            profil_pegawai_id: pid,
                            tanggal,
                            sesi: 'Siang',
                            tipe_kegiatan: null // Clear existing session activities first to avoid duplicates
                        }));
                    }
                    // Run clears first
                    if (promises.length > 0) {
                        await Promise.all(promises);
                        promises.length = 0;
                    }
                }

                if (pagi) {
                    promises.push(api.kegiatanPegawai.upsert({
                        profil_pegawai_id: pid,
                        tanggal,
                        sesi: 'Pagi',
                        tipe_kegiatan,
                        id_kegiatan_eksternal: finalId,
                        nama_kegiatan: finalNama,
                        keterangan,
                        id_surat: meetingSelection.suratId
                    } as any));
                }
                if (siang) {
                    promises.push(api.kegiatanPegawai.upsert({
                        profil_pegawai_id: pid,
                        tanggal,
                        sesi: 'Siang',
                        tipe_kegiatan,
                        id_kegiatan_eksternal: finalId,
                        nama_kegiatan: finalNama,
                        keterangan,
                        id_surat: meetingSelection.suratId
                    } as any));
                }
            }

            if (promises.length > 0) {
                await Promise.all(promises);
            }

            setMeetingSelection(null);
            fetchData();
        } catch (err) {
            console.error('Error meeting saving:', err);
        } finally {
            setIsSaving(false);
        }
    };

    const tooltipRef = useRef<any>(null);

    const handleTableMouseMove = useCallback((e: React.MouseEvent) => {
        const container = monthlyTableRef.current;
        if (!container) return;

        const target = e.target as HTMLElement;
        const cell = target.closest('td[data-day]');

        if (!cell) {
            // Clear hover
            const classes = Array.from(container.classList).filter(c => !(c as string).startsWith('hover-day-'));
            container.className = classes.join(' ');
            tooltipRef.current?.hide();
            return;
        }

        const day = cell.getAttribute('data-day');
        const session = cell.getAttribute('data-session') as 'Pagi' | 'Siang';
        const profilId = cell.getAttribute('data-profil-id');

        if (day) {
            // Update Vertical Highlight (Direct DOM)
            const newClass = `hover-day-${day}`;
            if (!container.classList.contains(newClass)) {
                const classes = Array.from(container.classList).filter(c => !(c as string).startsWith('hover-day-'));
                classes.push(newClass);
                container.className = classes.join(' ');
            }

            // Update Tooltip (Imperative)
            if (profilId && session) {
                const pId = parseInt(profilId);
                const d = parseInt(day);
                const p = data.find(x => x.profil_id === pId);
                const activities = p?.activities?.[d]?.[session] || [];

                if (activities.length > 0) {
                    tooltipRef.current?.show({
                        nama: p?.nama_lengkap,
                        day: d,
                        session,
                        activities
                    }, e.clientX, e.clientY);
                } else {
                    tooltipRef.current?.hide();
                }
            } else {
                tooltipRef.current?.hide();
            }
        }
    }, [data]);

    const handleTableMouseLeave = useCallback(() => {
        const container = monthlyTableRef.current;
        if (container) {
            const classes = Array.from(container.classList).filter(c => !(c as string).startsWith('hover-day-'));
            container.className = classes.join(' ');
        }
        tooltipRef.current?.hide();
    }, []);

    // Memoized Components for Performance
    const MonthlyRow = useMemo(() => React.memo(({
        p, daysInMonth, year, month, holidays, tDay, tMonth, tYear,
        flatActivityTypes, activityTypes, activeCell,
        canEdit, setActiveCell,
        handleSelectActivity, setMeetingSelection
    }: any) => {
        const { monthTotals, grandTotal } = p;

        return (
            <tbody className="hover-group border-b border-slate-50">
                <tr className="hover-row transition-colors">
                    <td rowSpan={2} className="name-cell p-3 py-2 sticky left-0 z-10 bg-white border-b border-slate-50 border-r border-slate-100 transition-colors w-32 sm:w-40">
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-ppm-slate/5 flex items-center justify-center text-ppm-slate shrink-0">
                                <User size={12} />
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="text-[11px] font-bold text-slate-800 line-clamp-1 leading-tight">{p.nama_lengkap}</div>
                                <div className="text-[9px] font-medium text-slate-400 uppercase tracking-tight truncate">{p.jabatan || '-'}</div>
                            </div>
                        </div>
                    </td>
                    <td className="sticky-col p-1 text-[8px] font-black text-slate-400 sticky left-32 sm:left-40 z-10 bg-white text-center border-b border-slate-50 border-r border-slate-100 transition-colors w-9 sm:w-11">PAGI</td>
                    {[...Array(daysInMonth)].map((_, i) => {
                        const day = i + 1;
                        const activities: any[] = p.activities?.[day]?.Pagi || [];
                        const mainAct = activities[0];
                        const type = mainAct ? flatActivityTypes.find((t: any) => t.kode === mainAct.tipe) : null;
                        const date = new Date(year, month - 1, day);
                        const isWeekend = [0, 6].includes(date.getDay());
                        const holiday = holidays.find((h: any) => {
                            const hDate = new Date(h.tanggal);
                            return hDate.getDate() === day && hDate.getMonth() + 1 === month && hDate.getFullYear() === year;
                        });
                        const isHoliday = !!holiday;
                        const isToday = day === tDay && month === tMonth && year === tYear;
                        const isActive = activeCell?.profil_id === p.profil_id && activeCell?.day === day && activeCell?.session === 'Pagi';

                        return (
                            <td
                                key={`pagi-${i}`}
                                data-day={day}
                                data-session="Pagi"
                                data-profil-id={p.profil_id}
                                className={`activity-day-cell p-0 text-center relative group activity-cell border-b border-slate-50 border-r border-slate-100/80 ${isActive ? 'activity-cell-active' : ''} ${(isWeekend || isHoliday) ? 'bg-red-200/40' : ''} ${isToday ? 'bg-indigo-50/30' : ''}`}
                                title={holiday?.keterangan || (isWeekend ? 'Weekend' : '')}
                            >
                                {isToday && <div className="absolute inset-y-0 left-0 w-[2px] bg-indigo-500/50 z-10 pointer-events-none"></div>}
                                {isActive && activeCell.rect ? createPortal(
                                    <div
                                        className={`fixed z-[500] bg-white shadow-2xl border border-slate-200 rounded-2xl flex flex-col p-2 min-w-[180px] overflow-visible animate-in zoom-in-95 duration-200 activity-portal-menu`}
                                        style={{
                                            left: `${activeCell.rect.left + activeCell.rect.width / 2}px`,
                                            top: (activeCell.rect.bottom > window.innerHeight * 0.6) ? `${activeCell.rect.top - 8}px` : `${activeCell.rect.bottom + 8}px`,
                                            transform: (activeCell.rect.bottom > window.innerHeight * 0.6) ? 'translate(-50%, -100%)' : 'translate(-50%, 0)'
                                        }}
                                    >
                                        <div className="px-4 py-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-50 mb-1">Pagi</div>
                                        <button onClick={(e) => { e.stopPropagation(); handleSelectActivity(p.profil_id, day, 'Pagi', null); }} className="px-3 py-2.5 text-[11px] font-bold text-slate-400 hover:bg-slate-50 text-left rounded-xl transition-colors border-b border-transparent">Kosongkan</button>
                                        {activities.length > 0 && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    const act = activities[0];
                                                    setMeetingSelection({
                                                        profil_id: p.profil_id, day, session: 'Pagi', tipe_kegiatan: act.tipe,
                                                        pagi: activities.some(a => a.sesi === 'Pagi'),
                                                        siang: p.activities[day]?.Siang?.some((a: any) => (a.id_eksternal || '') === (act.id_eksternal || '') && a.tipe === act.tipe) || false,
                                                        keterangan: act.keterangan || '', selectedProfilIds: [p.profil_id],
                                                        activityId: act.id_eksternal || '', activityNama: act.nama || '', suratId: act.id_surat || ''
                                                    });
                                                    setActiveCell(null);
                                                }}
                                                className="px-3 py-2.5 text-[11px] font-bold text-indigo-600 hover:bg-indigo-50 text-left rounded-xl transition-colors flex items-center gap-2"
                                            >
                                                <Edit2 size={14} /> Edit Kegiatan
                                            </button>
                                        )}
                                        <div className="h-px bg-slate-100 my-1 mx-2"></div>
                                        {activityTypes.map((t: any) => (
                                            <div key={t.kode} className="relative group/sub">
                                                <button onClick={(e) => { if (!t.subOptions || t.subOptions.length === 0) { e.stopPropagation(); handleSelectActivity(p.profil_id, day, 'Pagi', t.kode); } }} className="w-full flex items-center justify-between px-3 py-2.5 text-[11px] font-bold text-slate-600 hover:bg-slate-50 rounded-xl transition-colors group-hover/sub:bg-slate-50">
                                                    <div className="flex items-center gap-2"><div className={`w-1.5 h-1.5 rounded-full ${t.warna}`}></div>{t.nama}</div>
                                                    {t.subOptions && t.subOptions.length > 0 && <ChevronRight size={10} />}
                                                </button>
                                                {t.subOptions && t.subOptions.length > 0 && (
                                                    <div className={`hidden group-hover/sub:flex absolute ${activeCell.rect.left > window.innerWidth * 0.6 ? 'right-full mr-1' : 'left-full ml-1'} top-0 bg-white shadow-2xl border border-slate-200 rounded-xl flex-col p-1 min-w-[100px] z-[60]`}>
                                                        {t.subOptions.map((sub: any) => (
                                                            <button key={sub.kode} onClick={(e) => { e.stopPropagation(); handleSelectActivity(p.profil_id, day, 'Pagi', sub.kode); }} className="px-2.5 py-1.5 text-[9px] font-bold text-slate-600 hover:bg-slate-50 text-left rounded-lg transition-colors whitespace-nowrap">{sub.nama}</button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>,
                                    document.body
                                ) : (
                                    <div
                                        onClick={(e) => { if (canEdit) { const rect = (e.currentTarget as HTMLElement).getBoundingClientRect(); setActiveCell({ profil_id: p.profil_id, day, session: 'Pagi', rect }); } }}
                                        className={`w-full h-7 flex items-center justify-center text-[9px] font-black transition-colors border-r border-slate-100/80 ${activities.length > 1 ? 'bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white shadow-md' : type ? `${type.warna} ${type.warna_teks} shadow-sm active:scale-90` : (isWeekend || isHoliday) ? 'text-red-100' : 'text-slate-200'} ${!type && canEdit ? 'group-hover:bg-slate-100/50 cursor-pointer' : ''}`}
                                    >
                                        {activities.length > 0 ? (activities.length > 1 ? `(${activities.length})` : mainAct.tipe) : (isWeekend ? '✕' : '+')}
                                    </div>
                                )}
                            </td>
                        );
                    })}
                    <td rowSpan={2} className="shared-cell w-1.5 bg-slate-50 border-l border-slate-200 border-b border-slate-50 transition-colors"></td>
                    {activityTypes.map((t: any) => (
                        <td key={t.kode} rowSpan={2} className="shared-cell sticky-col p-1 text-center text-[10px] font-black text-slate-600 bg-slate-100/10 border-b border-slate-50 border-r border-slate-100/80 transition-colors">{monthTotals[t.kode] || ''}</td>
                    ))}
                    <td rowSpan={2} className="shared-cell sticky-col p-1 text-center text-[10px] font-black text-emerald-600 bg-emerald-50/20 border-b border-slate-50 border-r border-slate-100/80 transition-colors text-emerald-600">{grandTotal || ''}</td>
                </tr>
                <tr className="hover-row transition-colors">
                    <td className="sticky-col p-1 text-[8px] font-black text-slate-400 sticky left-32 sm:left-40 z-10 bg-white text-center border-b border-slate-50 border-r border-slate-100 transition-colors w-9 sm:w-11">SIANG</td>
                    {[...Array(daysInMonth)].map((_, i) => {
                        const day = i + 1;
                        const activities: any[] = p.activities?.[day]?.Siang || [];
                        const mainAct = activities[0];
                        const type = mainAct ? flatActivityTypes.find((t: any) => t.kode === mainAct.tipe) : null;
                        const date = new Date(year, month - 1, day);
                        const isWeekend = [0, 6].includes(date.getDay());
                        const holiday = holidays.find((h: any) => {
                            const hDate = new Date(h.tanggal);
                            return hDate.getDate() === day && hDate.getMonth() + 1 === month && hDate.getFullYear() === year;
                        });
                        const isHoliday = !!holiday;
                        const isToday = day === tDay && month === tMonth && year === tYear;
                        const isActive = activeCell?.profil_id === p.profil_id && activeCell?.day === day && activeCell?.session === 'Siang';

                        return (
                            <td
                                key={`siang-${i}`}
                                data-day={day}
                                data-session="Siang"
                                data-profil-id={p.profil_id}
                                className={`activity-day-cell p-0 text-center relative group activity-cell border-b border-slate-50 border-r border-slate-100/80 ${isActive ? 'activity-cell-active' : ''} ${(isWeekend || isHoliday) ? 'bg-red-200/40' : ''} ${isToday ? 'bg-indigo-50/30' : ''}`}
                                title={holiday?.keterangan || (isWeekend ? 'Weekend' : '')}
                            >
                                {isToday && <div className="absolute inset-y-0 left-0 w-[2px] bg-indigo-500/50 z-10 pointer-events-none"></div>}
                                {isActive && activeCell.rect ? createPortal(
                                    <div
                                        className={`fixed z-[500] bg-white shadow-2xl border border-slate-200 rounded-2xl flex flex-col p-2 min-w-[180px] overflow-visible animate-in zoom-in-95 duration-200 activity-portal-menu`}
                                        style={{
                                            left: `${activeCell.rect.left + activeCell.rect.width / 2}px`,
                                            top: (activeCell.rect.bottom > window.innerHeight * 0.6) ? `${activeCell.rect.top - 8}px` : `${activeCell.rect.bottom + 8}px`,
                                            transform: (activeCell.rect.bottom > window.innerHeight * 0.6) ? 'translate(-50%, -100%)' : 'translate(-50%, 0)'
                                        }}
                                    >
                                        <div className="px-4 py-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-50 mb-1">Siang</div>
                                        <button onClick={(e) => { e.stopPropagation(); handleSelectActivity(p.profil_id, day, 'Siang', null); }} className="px-3 py-2.5 text-[11px] font-bold text-slate-400 hover:bg-slate-50 text-left rounded-xl transition-colors border-b border-transparent">Kosongkan</button>
                                        {activities.length > 0 && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    const act = activities[0];
                                                    setMeetingSelection({
                                                        profil_id: p.profil_id, day, session: 'Siang', tipe_kegiatan: act.tipe,
                                                        pagi: p.activities[day]?.Pagi?.some((a: any) => (a.id_eksternal || '') === (act.id_eksternal || '') && a.tipe === act.tipe) || false,
                                                        siang: activities.some(a => a.sesi === 'Siang'),
                                                        keterangan: act.keterangan || '', selectedProfilIds: [p.profil_id],
                                                        activityId: act.id_eksternal || '', activityNama: act.nama || '', suratId: act.id_surat || ''
                                                    });
                                                    setActiveCell(null);
                                                }}
                                                className="px-3 py-2.5 text-[11px] font-bold text-indigo-600 hover:bg-indigo-50 text-left rounded-xl transition-colors flex items-center gap-2"
                                            >
                                                <Edit2 size={14} /> Edit Kegiatan
                                            </button>
                                        )}
                                        <div className="h-px bg-slate-100 my-1 mx-2"></div>
                                        {activityTypes.map((t: any) => (
                                            <div key={t.kode} className="relative group/sub">
                                                <button onClick={(e) => { if (!t.subOptions || t.subOptions.length === 0) { e.stopPropagation(); handleSelectActivity(p.profil_id, day, 'Siang', t.kode); } }} className="w-full flex items-center justify-between px-3 py-2.5 text-[11px] font-bold text-slate-600 hover:bg-slate-50 rounded-xl transition-colors group-hover/sub:bg-slate-50">
                                                    <div className="flex items-center gap-2"><div className={`w-1.5 h-1.5 rounded-full ${t.warna}`}></div>{t.nama}</div>
                                                    {t.subOptions && t.subOptions.length > 0 && <ChevronRight size={10} />}
                                                </button>
                                                {t.subOptions && t.subOptions.length > 0 && (
                                                    <div className={`hidden group-hover/sub:flex absolute ${activeCell.rect.left > window.innerWidth * 0.6 ? 'right-full mr-1' : 'left-full ml-1'} top-0 bg-white shadow-2xl border border-slate-200 rounded-xl flex-col p-1 min-w-[100px] z-[60]`}>
                                                        {t.subOptions.map((sub: any) => (
                                                            <button key={sub.kode} onClick={(e) => { e.stopPropagation(); handleSelectActivity(p.profil_id, day, 'Siang', sub.kode); }} className="px-2.5 py-1.5 text-[9px] font-bold text-slate-600 hover:bg-slate-50 text-left rounded-lg transition-colors whitespace-nowrap">{sub.nama}</button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>,
                                    document.body
                                ) : (
                                    <div
                                        onClick={(e) => { if (canEdit) { const rect = (e.currentTarget as HTMLElement).getBoundingClientRect(); setActiveCell({ profil_id: p.profil_id, day, session: 'Siang', rect }); } }}
                                        className={`w-full h-7 flex items-center justify-center text-[9px] font-black transition-colors border-r border-slate-100/80 ${activities.length > 1 ? 'bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white shadow-md' : type ? `${type.warna} ${type.warna_teks} shadow-sm active:scale-90` : (isWeekend || isHoliday) ? 'text-red-100' : 'text-slate-200'} ${!type && canEdit ? 'group-hover:bg-slate-100/50 cursor-pointer' : ''}`}
                                    >
                                        {activities.length > 0 ? (activities.length > 1 ? `(${activities.length})` : mainAct.tipe) : (isWeekend ? '✕' : '+')}
                                    </div>
                                )}
                            </td>
                        );
                    })}
                </tr>
            </tbody>
        );
    }), [flatActivityTypes, activityTypes, activeCell, canEdit, setActiveCell, handleSelectActivity, setMeetingSelection]);

    const YearlyRow = useMemo(() => React.memo(({ p, activityTypes, canEdit }: any) => {
        return (
            <tr className="hover:bg-slate-50/50 transition-colors">
                <td className="p-4 py-3 sticky left-0 z-10 bg-white border-b border-slate-50 border-r border-slate-100 transition-colors">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-ppm-slate/5 flex items-center justify-center text-ppm-slate shrink-0"><User size={14} /></div>
                        <div>
                            <div className="text-sm font-bold text-slate-800">{p.nama_lengkap}</div>
                            <div className="text-[10px] font-medium text-slate-400 uppercase tracking-tight">{p.bidang_singkatan || 'Bapperida'}</div>
                        </div>
                    </div>
                </td>
                {activityTypes.map((t: any) => (
                    <td key={t.kode} className="p-4 text-center text-sm font-bold text-slate-700 border-b border-slate-50 border-r border-slate-100/80">
                        {p.monthTotals?.[t.kode] || 0}
                    </td>
                ))}
                <td className="p-4 text-center text-sm font-black text-ppm-slate bg-slate-50/50 border-b border-slate-50">
                    {p.grandTotal || 0}
                </td>
            </tr>
        );
    }), [activityTypes]);

    const handleToggleHoliday = async (day: number) => {
        if (!canEdit) return;
        try {
            const tanggal = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const existing = holidays.find(h => {
                const hDate = new Date(h.tanggal);
                return hDate.getDate() === day && hDate.getMonth() + 1 === month && hDate.getFullYear() === year;
            });

            if (existing) {
                // Open options modal instead of toggling off immediately
                setHolidayOptions({ day, tanggal, keterangan: existing.keterangan || '' });
            } else {
                // If not holiday, prompt for duration & keterangan
                setHolidayPrompt({ day, tanggal, duration: 1, keterangan: '' });
            }
        } catch (err) {
            console.error('Error handling holiday click:', err);
        }
    };

    const handleConfirmHoliday = async () => {
        if (!holidayPrompt) return;
        try {
            const res = await api.holidays.bulkUpsert({
                start_tanggal: holidayPrompt.tanggal,
                duration: holidayPrompt.keterangan ? holidayPrompt.duration : 1, // If no keterangan, assume 1 day
                keterangan: holidayPrompt.keterangan || 'Hari Libur'
            });
            if (res.success) {
                const holRes = await api.holidays.getMonthly(year, month);
                if (holRes.success) setHolidays(holRes.data);
            }
        } catch (err) {
            console.error('Error adding holiday:', err);
        } finally {
            setHolidayPrompt(null);
        }
    };

    const handleDeleteHoliday = async () => {
        if (!holidayOptions) return;
        try {
            const res = await api.holidays.bulkDelete({ tanggal: holidayOptions.tanggal });
            if (res.success) {
                const holRes = await api.holidays.getMonthly(year, month);
                if (holRes.success) setHolidays(holRes.data);
            }
        } catch (err) {
            console.error('Error deleting holiday:', err);
        } finally {
            setHolidayOptions(null);
        }
    };

    const getRestrictedEmployees = (day: number, session: 'Pagi' | 'Siang') => {
        const restricted = new Set<{ id: number, reason: string }>();
        data.forEach(p => {
            const dayActivities = p.activities?.[day]?.[session] || [];
            const conflict = dayActivities.find((act: any) => ['C', 'S', 'DL', 'DLB'].includes(act.tipe));
            if (conflict) {
                const typeDef = flatActivityTypes.find(t => t.kode === conflict.tipe);
                restricted.add({
                    id: p.profil_id,
                    reason: `${typeDef?.nama || conflict.tipe}`
                });
            }
        });
        return restricted;
    };

    const renderMonthlyTable = () => {
        const todayDate = new Date();
        const tDay = todayDate.getDate();
        const tMonth = todayDate.getMonth() + 1;
        const tYear = todayDate.getFullYear();

        return (
            <div className="space-y-4">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-2">
                    <div className="flex items-center gap-3">
                        <div className="bg-indigo-50/50 p-2 rounded-xl border border-indigo-100/50 group-hover:bg-indigo-50 transition-colors">
                            <TrendingUp size={18} className="text-indigo-600" />
                        </div>
                        <div>
                            <h3 className="text-sm font-black text-slate-800 tracking-tight">Rekap Bulanan</h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-1">Akumulasi kegiatan per status</p>
                        </div>
                    </div>

                    {/* Legend and PDF Button - NOT STICKY */}
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex flex-wrap items-center gap-2 p-1.5 px-3 bg-slate-50/80 rounded-xl border border-slate-100">
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mr-1">Legenda:</span>
                            {activityTypes.filter(t => !t.parent_id).map(t => (
                                <div key={t.kode} className="relative flex items-center gap-1.5 px-1.5 py-0.5 rounded-lg hover:bg-white transition-colors cursor-help group">
                                    <div className={`w-1.5 h-1.5 rounded-full ${t.warna} shadow-sm group-hover:scale-125 transition-transform`}></div>
                                    <span className="text-[9px] font-black text-slate-600 uppercase mb-0.5">{t.kode}</span>
                                    <span className="text-[8px] font-bold text-slate-400 capitalize hidden xl:inline">{t.nama}</span>
                                    
                                    {/* Tooltip */}
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 bg-slate-800 text-white text-[9px] font-bold rounded-lg opacity-0 group-hover:opacity-100 transition-all pointer-events-none whitespace-nowrap shadow-xl translate-y-1 group-hover:translate-y-0 z-[600]">
                                        {t.deskripsi || t.nama}
                                        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-800"></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button
                            onClick={() => handleDownloadPDF('monthly')}
                            className="flex items-center gap-2 px-4 py-2 bg-ppm-slate hover:bg-slate-800 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md shadow-ppm-slate/10 transition-all active:scale-95"
                        >
                            <Download size={14} /> PDF
                        </button>
                    </div>
                </div>

                <div 
                    ref={monthlyHeaderRef}
                    className="overflow-hidden sticky z-[450] bg-white transition-all duration-300"
                    style={{ top: headerHeight }}
                >
                    <table className="w-full text-left border-separate border-spacing-0 table-fixed bg-white border-x border-slate-100/60">
                        <colgroup>
                            <col className="w-32 sm:w-40" />
                            <col className="w-9 sm:w-11" />
                            {[...Array(daysInMonth)].map((_, i) => <col key={i} className="w-8" />)}
                            <col className="w-1.5" />
                            {activityTypes.map(t => <col key={t.kode} className="w-9" />)}
                            <col className="w-10" />
                        </colgroup>
                        <thead>
                            <tr className="bg-slate-50/50 divide-x divide-slate-200/60 shadow-sm border-t border-slate-100">
                                <th className="p-3 text-[9px] font-black text-slate-400 uppercase tracking-widest sticky !left-0 bg-white z-[135] border-b border-t border-slate-100 shadow-[0_1px_0_rgba(0,0,0,0.05)]">
                                    Nama Pegawai
                                </th>
                                <th className="p-1 text-[9px] font-black text-slate-400 uppercase tracking-widest sticky !left-32 sm:!left-40 bg-white z-[135] text-center border-b border-t border-slate-100 border-r border-slate-100 shadow-[0_1px_0_rgba(0,0,0,0.05)]">
                                    Sesi
                                </th>
                                {[...Array(daysInMonth)].map((_, i) => {
                                    const day = i + 1;
                                    const date = new Date(year, month - 1, day);
                                    const isWeekend = [0, 6].includes(date.getDay());
                                    const holiday = holidays.find(h => {
                                        const hDate = new Date(h.tanggal);
                                        return hDate.getDate() === day && hDate.getMonth() + 1 === month && hDate.getFullYear() === year;
                                    });
                                    const isHoliday = !!holiday;
                                    const isToday = day === tDay && month === tMonth && year === tYear;

                                    return (
                                        <th
                                            key={i}
                                            onClick={() => canEdit && handleToggleHoliday(day)}
                                            title={holiday?.keterangan || (isWeekend ? 'Weekend' : '')}
                                            className={`p-1 text-center text-[9px] font-black w-8 cursor-pointer transition-colors border-b border-t border-slate-100 border-r border-slate-100/80 shadow-[0_1px_0_rgba(0,0,0,0.05)]
                                                ${(isWeekend || isHoliday) ? 'text-red-600 bg-red-50 hover:bg-red-100' : 'text-slate-400 bg-white hover:bg-slate-50'}
                                                ${isToday ? 'ring-2 ring-indigo-500 ring-inset bg-indigo-50 z-[140] shadow-sm' : ''}
                                            `}
                                        >
                                            <div className="text-[7.5px] opacity-70 mb-0.5">{dayNamesShort[date.getDay()]}</div>
                                            <div>{String(day).padStart(2, '0')}</div>
                                        </th>
                                    );
                                })}
                                <th className="w-1.5 bg-white border-b border-t border-slate-100 shadow-[0_1px_0_rgba(0,0,0,0.05)]"></th>
                                {activityTypes.map(t => (
                                    <th key={t.kode} className="p-1 text-center text-[9px] font-black text-slate-400 uppercase tracking-widest w-9 bg-white border-b border-t border-slate-100 shadow-[0_1px_0_rgba(0,0,0,0.05)]">{t.kode}</th>
                                ))}
                                <th className="p-1 text-center text-[9px] font-black text-slate-800 uppercase tracking-widest w-10 bg-slate-100 border-b border-t border-slate-100 shadow-[0_1px_0_rgba(0,0,0,0.05)]">T</th>
                            </tr>
                        </thead>
                    </table>
                </div>

                {/* 2. Body Container - Scrollable horizontal only */}
                <div
                    ref={monthlyTableRef}
                    onScroll={(e) => handleBodyScroll(e, monthlyHeaderRef)}
                    onMouseMove={handleTableMouseMove}
                    onMouseLeave={handleTableMouseLeave}
                    className="overflow-x-auto !static hover-table-container custom-scrollbar-horizontal pb-4"
                >
                    <table className="w-full text-left border-separate border-spacing-0 table-fixed bg-white border-x border-slate-100/60 transition-all duration-300">
                        <colgroup>
                            <col className="w-32 sm:w-40" />
                            <col className="w-9 sm:w-11" />
                            {[...Array(daysInMonth)].map((_, i) => <col key={i} className="w-8" />)}
                            <col className="w-1.5" />
                            {activityTypes.map(t => <col key={t.kode} className="w-9" />)}
                            <col className="w-10" />
                        </colgroup>
                        {filteredData.map((p) => (
                            <MonthlyRow
                                key={p.profil_id}
                                p={p}
                                daysInMonth={daysInMonth}
                                year={year}
                                month={month}
                                holidays={holidays}
                                tDay={tDay}
                                tMonth={tMonth}
                                tYear={tYear}
                                flatActivityTypes={flatActivityTypes}
                                activityTypes={activityTypes}
                                activeCell={activeCell}
                                canEdit={canEdit}
                                setActiveCell={setActiveCell}
                                handleSelectActivity={handleSelectActivity}
                                setMeetingSelection={setMeetingSelection}
                            />
                        ))}
                    </table>
                </div>
            </div>
        );
    };

    const renderYearlyTable = () => {
        return (
            <div className="space-y-4">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-2">
                    <div className="flex items-center gap-3">
                        <div className="bg-indigo-50/50 p-2 rounded-xl border border-indigo-100/50 group-hover:bg-indigo-50 transition-colors">
                            <TrendingUp size={18} className="text-indigo-600" />
                        </div>
                        <div>
                            <h3 className="text-sm font-black text-slate-800 tracking-tight">Rekap Tahunan</h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-1">Akumulasi kegiatan tahunan</p>
                        </div>
                    </div>

                    {/* Legend and PDF Button - NOT STICKY */}
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex flex-wrap items-center gap-2 p-1.5 px-3 bg-slate-50/80 rounded-xl border border-slate-100">
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mr-1">Legenda:</span>
                            {activityTypes.filter(t => !t.parent_id).map(t => (
                                <div key={t.kode} className="relative flex items-center gap-1.5 px-1.5 py-0.5 rounded-lg hover:bg-white transition-colors cursor-help group">
                                    <div className={`w-1.5 h-1.5 rounded-full ${t.warna} shadow-sm group-hover:scale-125 transition-transform`}></div>
                                    <span className="text-[9px] font-black text-slate-600 uppercase mb-0.5">{t.kode}</span>
                                    <span className="text-[8px] font-bold text-slate-400 capitalize hidden xl:inline">{t.nama}</span>
                                    
                                    {/* Tooltip */}
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 bg-slate-800 text-white text-[9px] font-bold rounded-lg opacity-0 group-hover:opacity-100 transition-all pointer-events-none whitespace-nowrap shadow-xl translate-y-1 group-hover:translate-y-0 z-[600]">
                                        {t.deskripsi || t.nama}
                                        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-800"></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button
                            onClick={() => handleDownloadPDF('yearly')}
                            className="flex items-center gap-2 px-4 py-2 bg-ppm-slate hover:bg-slate-800 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md shadow-ppm-slate/10 transition-all active:scale-95"
                        >
                            <Download size={14} /> PDF
                        </button>
                    </div>
                </div>

                {/* 1. Header Container - Sticky vertically to page */}
                <div 
                    ref={yearlyHeaderRef}
                    className="overflow-hidden sticky z-[450] bg-white transition-all duration-300"
                    style={{ top: headerHeight }}
                >
                    <table className="w-full text-left border-separate border-spacing-0 table-fixed bg-white border-x border-slate-100">
                        <colgroup>
                            <col className="w-[300px]" />
                            {activityTypes.map(t => <col key={t.kode} className="w-[80px]" />)}
                            <col className="w-[80px]" />
                        </colgroup>
                        <thead>
                            <tr className="divide-x divide-slate-100 shadow-sm border-t border-slate-100">
                                <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest sticky !left-0 bg-white z-[135] border-b border-t border-slate-100 shadow-[0_1px_0_rgba(0,0,0,0.05)]">Nama Pegawai</th>
                                {activityTypes.map(t => (
                                    <th key={t.kode} className="p-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest bg-white border-b border-t border-slate-100 shadow-[0_1px_0_rgba(0,0,0,0.05)]">{t.kode}</th>
                                ))}
                                <th className="p-4 text-center text-[10px] font-black text-slate-800 uppercase tracking-widest bg-slate-50 border-b border-t border-slate-100 shadow-[0_1px_0_rgba(0,0,0,0.05)]">Total</th>
                            </tr>
                        </thead>
                    </table>
                </div>

                <div 
                    ref={yearlyTableRef} 
                    onScroll={(e) => handleBodyScroll(e, yearlyHeaderRef)}
                    className="overflow-x-auto !static hover-table-container custom-scrollbar-horizontal pb-4"
                >
                    <table className="w-full text-left border-separate border-spacing-0 table-fixed bg-white border-x border-slate-100">
                        <colgroup>
                            <col className="w-[300px]" />
                            {activityTypes.map(t => <col key={t.kode} className="w-[80px]" />)}
                            <col className="w-[80px]" />
                        </colgroup>
                        <tbody className="divide-y divide-slate-50">
                            {filteredData.map((p) => (
                                <YearlyRow
                                    key={p.profil_id}
                                    p={p}
                                    activityTypes={activityTypes}
                                    canEdit={canEdit}
                                />
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    return (
        <div className="max-w-full relative bg-[#f8fafc] -mx-4 px-4">
            {/* Header / Toolbar Area - Sticky */}
            <div 
                ref={stickyHeaderRef} 
                className="sticky top-0 z-[500] bg-white -mx-4 px-4 pt-1 pb-4 border-b border-slate-100 shadow-sm
                           before:content-[''] before:absolute before:-top-[500px] before:left-0 before:right-0 before:h-[500px] before:bg-white before:pointer-events-none"
            >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-2.5 px-5 rounded-[1.8rem] border border-slate-100 shadow-md transition-all hover:shadow-lg">
                    {/* Left: Title & Subtitle */}
                    <div className="flex-1 min-w-0">
                        <h1 className="text-base font-black text-slate-800 tracking-tight flex items-center gap-2.5 truncate">
                            <Calendar className="text-ppm-slate" size={18} />
                            Rekap Kegiatan Per Orang
                        </h1>
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-0.5 ml-7">Monitoring kehadiran secara periodik</p>
                    </div>

                    {/* Right: Controls Toolbar */}
                    <div className="flex flex-wrap items-center gap-3 lg:gap-4">
                        {/* Instansi Select (Super Admin Only) */}
                        {isSuperAdmin && (
                            <SearchableSelect
                                label="Instansi"
                                options={instansiList}
                                keyField="id"
                                displayField="instansi"
                                value={selectedInstansi}
                                onChange={(val) => setSelectedInstansi(val)}
                                className="w-full lg:w-64 text-[11px] font-bold [&>div]:!bg-white/80 [&>div]:!border-slate-200/60 [&>div]:!shadow-sm [&>div]:!rounded-xl [&>div]:!h-9 [&>div]:!py-1.5 [&>div]:!min-h-[36px]"
                            />
                        )}

                        {/* Employee Search Field (Isolated for performance) */}
                        <SearchField value={searchTerm} onSearch={setSearchTerm} />

                        {/* View Toggle (Bulanan / Tahunan) */}
                        <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-sm h-9">
                            <button
                                onClick={() => setView('monthly')}
                                className={`px-4 py-1 text-[8.5px] font-black uppercase tracking-widest rounded-lg transition-all duration-300 ${view === 'monthly' ? 'bg-ppm-slate text-white shadow-sm shadow-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                Bulanan
                            </button>
                            <button
                                onClick={() => setView('yearly')}
                                className={`px-4 py-1 text-[8.5px] font-black uppercase tracking-widest rounded-lg transition-all duration-300 ${view === 'yearly' ? 'bg-ppm-slate text-white shadow-sm shadow-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                Tahunan
                            </button>
                        </div>

                        {/* Vertical Divider */}
                        <div className="hidden lg:block w-px h-6 bg-slate-200/60"></div>

                        {/* Compact Filter Group */}
                        <div className="flex items-center gap-0.5 bg-white/80 p-1 rounded-xl border border-slate-200 shadow-sm h-9">
                            {/* Year Picker */}
                            <div className="flex items-center gap-1.5 px-2.5 border-r border-slate-100 pr-4">
                                <Calendar size={13} className="text-slate-400" />
                                <select
                                    value={year}
                                    onChange={(e) => setYear(Number(e.target.value))}
                                    className="bg-transparent text-[9.5px] font-black text-slate-700 outline-none w-16 cursor-pointer"
                                >
                                    {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                                </select>
                            </div>

                            {/* Month Navigator (Monthly Only) */}
                            {view === 'monthly' && (
                                <div className="flex items-center gap-2 px-3 border-r border-slate-100 relative overflow-visible">
                                    <button
                                        onClick={() => setMonth(m => m === 1 ? 12 : m - 1)}
                                        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-50 text-slate-400 transition-colors"
                                    >
                                        <ChevronLeft size={16} />
                                    </button>
                                    <button
                                        onClick={() => setIsMonthPickerOpen(!isMonthPickerOpen)}
                                        className={`text-[9.5px] font-black uppercase tracking-widest min-w-[60px] text-center transition-all hover:text-ppm-blue ${isMonthPickerOpen ? 'text-ppm-blue' : 'text-slate-800'}`}
                                    >
                                        {monthNames[month - 1].slice(0, 3)}
                                    </button>
                                    <button
                                        onClick={() => setMonth(m => m === 12 ? 1 : m + 1)}
                                        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-50 text-slate-400 transition-colors"
                                    >
                                        <ChevronRight size={16} />
                                    </button>

                                    {isMonthPickerOpen && (
                                        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 p-3 bg-white border border-slate-100 rounded-2xl shadow-2xl z-[400] min-w-[280px] animate-in zoom-in-95 duration-200">
                                            <div className="grid grid-cols-4 gap-1.5">
                                                {monthNames.map((name, idx) => {
                                                    const m = idx + 1;
                                                    return (
                                                        <button
                                                            key={m}
                                                            onClick={() => {
                                                                setMonth(m);
                                                                setIsMonthPickerOpen(false);
                                                            }}
                                                            className={`py-2 text-[10px] font-black uppercase tracking-tight rounded-lg transition-all ${month === m ? 'bg-ppm-slate text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
                                                        >
                                                            {name.slice(0, 3)}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Bidang Select */}
                            <div className="flex items-center gap-1.5 px-2.5 pl-3">
                                <Filter size={13} className="text-slate-400" />
                                <select
                                    value={bidangId}
                                    onChange={(e) => setBidangId(e.target.value)}
                                    disabled={!canChangeBidang}
                                    className={`bg-transparent text-[9.5px] font-black text-slate-700 outline-none max-w-[150px] cursor-pointer ${!canChangeBidang ? 'opacity-50' : ''}`}
                                >
                                    {canChangeBidang && <option value="all">Semua Bidang</option>}
                                    {bidangList.map(b => <option key={b.id} value={b.id}>{b.singkatan || b.nama_bidang}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
            </div>


            {/* Content Table */}
            {isLoading ? (
                <div className="h-[400px] flex flex-col items-center justify-center gap-4 bg-white rounded-3xl border border-slate-50 shadow-sm">
                    <div className="w-12 h-12 border-4 border-ppm-slate border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-sm font-bold text-slate-400 animate-pulse">Memuat data kegiatan...</p>
                </div>
            ) : data.length === 0 ? (
                <div className="h-[300px] flex flex-col items-center justify-center bg-white rounded-3xl border border-slate-50 text-slate-400 gap-4 p-8 text-center">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center">
                        <AlertCircle size={32} className="opacity-20" />
                    </div>
                    <div>
                        <p className="font-bold text-slate-600">Tidak ada data pegawai ditemukan</p>
                        <p className="text-xs max-w-sm mt-1">Pastikan Bidang yang dipilih memiliki pegawai aktif dan script migrasi database sudah dijalankan.</p>
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                    {view === 'monthly' ? renderMonthlyTable() : renderYearlyTable()}
                </div>
            )}

            {/* Range Selection Modal */}
            {rangeSelection && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-ppm-slate/20 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white rounded-3xl shadow-[0_32px_64px_-16px_rgba(0,0,0,0.2)] border border-slate-100 p-5 w-full max-w-lg max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-300 custom-scrollbar">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-indigo-500 text-white shadow-xl shadow-indigo-500/20">
                                <Calendar size={24} />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-slate-800">Rentang Kegiatan</h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                                    {(rangeSelection as any).tipe_kegiatan && flatActivityTypes.find(t => t.kode === (rangeSelection as any).tipe_kegiatan)?.nama}
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mb-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Dari Tanggal</label>
                                <select
                                    value={rangeSelection.startDay}
                                    onChange={(e) => setRangeSelection({ ...rangeSelection, startDay: parseInt(e.target.value) })}
                                    className="input-modern"
                                >
                                    {[...Array(daysInMonth)].map((_, i) => (
                                        <option key={i + 1} value={i + 1}>{i + 1} {monthNames[month - 1]}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Sampai Tanggal</label>
                                <select
                                    value={rangeSelection.endDay}
                                    onChange={(e) => setRangeSelection({ ...rangeSelection, endDay: parseInt(e.target.value) })}
                                    className="input-modern"
                                >
                                    {[...Array(daysInMonth)].map((_, i) => (
                                        <option key={i + 1} value={i + 1}>{i + 1} {monthNames[month - 1]}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="space-y-4 mb-6">
                            <div className="space-y-2">
                                <SearchableSelect
                                    label="Pilih Surat"
                                    options={MOCK_LETTERS}
                                    keyField="id"
                                    displayField="nomor"
                                    secondaryField="perihal"
                                    value={rangeSelection.suratId || null}
                                    onChange={(val) => setRangeSelection({ ...rangeSelection, suratId: val })}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest px-1">Keterangan / Catatan</label>
                                <textarea
                                    value={rangeSelection.keterangan}
                                    onChange={(e) => setRangeSelection({ ...rangeSelection, keterangan: e.target.value })}
                                    placeholder="Tuliskan keterangan kegiatan di sini..."
                                    className="input-modern min-h-[100px] py-4 text-[12px] resize-y"
                                />
                            </div>

                            <div className="space-y-2">
                                <SearchableSelect
                                    label="Pegawai"
                                    multiple={true}
                                    options={data.map(p => {
                                        // Conflicts don't usually apply to range selection (C, S, etc.) but we'll check today if multiple days are NOT picked
                                        return {
                                            ...p,
                                            disabled: false // In range mode we usually allow overwriting or it's a new mass entry
                                        };
                                    })}
                                    keyField="profil_id"
                                    displayField="nama_lengkap"
                                    value={rangeSelection.selectedProfilIds}
                                    onChange={(val) => setRangeSelection({ ...rangeSelection, selectedProfilIds: val })}
                                />
                            </div>

                            {(rangeSelection.tipe_kegiatan === 'DL' || rangeSelection.tipe_kegiatan === 'DLB') && (
                                <div className="space-y-2">
                                    <SearchableSelect
                                        label="Kegiatan"
                                        options={MOCK_MEETINGS}
                                        keyField="id"
                                        displayField="nama"
                                        value={(rangeSelection as any).activity?.id}
                                        onChange={(val) => {
                                            const meeting = MOCK_MEETINGS.find(m => m.id === val);
                                            setRangeSelection({ ...rangeSelection, activity: meeting } as any);
                                        }}
                                    />
                                </div>
                            )}
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setRangeSelection(null)}
                                className="flex-1 px-4 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:bg-slate-50 transition-colors"
                            >
                                Batal
                            </button>
                            <button
                                onClick={handleBulkUpsert}
                                disabled={isSaving}
                                className="flex-[2] btn-primary h-auto py-2.5 text-[10px] font-black shadow-lg shadow-ppm-slate/20 flex items-center justify-center gap-2"
                            >
                                {isSaving ? (
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                ) : (
                                    <CheckCircle2 size={16} />
                                )}
                                Simpan Rentang
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Meeting Selection Modal */}
            {meetingSelection && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-ppm-slate/20 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white rounded-3xl shadow-[0_32px_64px_-16px_rgba(0,0,0,0.2)] border border-slate-100 p-5 w-full max-w-lg max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-300 custom-scrollbar">
                        <div className="flex items-center gap-3 mb-4">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${flatActivityTypes.find(t => t.kode === meetingSelection.tipe_kegiatan)?.warna} text-white shadow-xl shadow-ppm-slate/10`}>
                                <Edit2 size={24} />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-slate-800">Edit Kegiatan</h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                                    {meetingSelection.day} {monthNames[month - 1]} - {year}
                                </p>
                            </div>
                        </div>

                        <div className="space-y-4 mb-6">
                            <div className="space-y-2">
                                <SearchableSelect
                                    label="Jenis Kegiatan"
                                    options={flatActivityTypes.filter(t => !t.subOptions || t.subOptions.length === 0)}
                                    keyField="kode"
                                    displayField="nama"
                                    value={meetingSelection.tipe_kegiatan}
                                    onChange={(val) => {
                                        const isFull = ['C', 'S', 'DL', 'DLB'].includes(val);
                                        setMeetingSelection({
                                            ...meetingSelection,
                                            tipe_kegiatan: val,
                                            ...(isFull ? { pagi: true, siang: true } : {})
                                        });
                                    }}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <label className={`flex items-center gap-3 p-4 rounded-3xl border transition-all cursor-pointer group 
                                    ${meetingSelection.pagi ? 'border-ppm-slate bg-ppm-slate/5 ring-2 ring-ppm-slate/10' : 'border-slate-100 hover:bg-slate-50'}
                                    ${['C', 'S', 'DL', 'DLB'].includes(meetingSelection.tipe_kegiatan) ? 'opacity-50 cursor-not-allowed grayscale pointer-events-none' : ''}`}>
                                    <input
                                        type="checkbox"
                                        checked={meetingSelection.pagi || ['C', 'S', 'DL', 'DLB'].includes(meetingSelection.tipe_kegiatan)}
                                        disabled={['C', 'S', 'DL', 'DLB'].includes(meetingSelection.tipe_kegiatan)}
                                        onChange={(e) => setMeetingSelection({ ...meetingSelection, pagi: e.target.checked })}
                                        className="hidden"
                                    />
                                    <div className={`w-6 h-6 rounded-xl border-2 flex items-center justify-center transition-all ${meetingSelection.pagi || ['C', 'S', 'DL', 'DLB'].includes(meetingSelection.tipe_kegiatan) ? 'bg-ppm-slate border-ppm-slate' : 'border-slate-200'}`}>
                                        {(meetingSelection.pagi || ['C', 'S', 'DL', 'DLB'].includes(meetingSelection.tipe_kegiatan)) && <CheckCircle2 size={14} className="text-white" />}
                                    </div>
                                    <span className={`text-[11px] font-black uppercase tracking-widest ${meetingSelection.pagi || ['C', 'S', 'DL', 'DLB'].includes(meetingSelection.tipe_kegiatan) ? 'text-ppm-slate' : 'text-slate-400'}`}>Pagi</span>
                                </label>
                                <label className={`flex items-center gap-3 p-4 rounded-3xl border transition-all cursor-pointer group 
                                    ${meetingSelection.siang ? 'border-ppm-slate bg-ppm-slate/5 ring-2 ring-ppm-slate/10' : 'border-slate-100 hover:bg-slate-50'}
                                    ${['C', 'S', 'DL', 'DLB'].includes(meetingSelection.tipe_kegiatan) ? 'opacity-50 cursor-not-allowed grayscale pointer-events-none' : ''}`}>
                                    <input
                                        type="checkbox"
                                        checked={meetingSelection.siang || ['C', 'S', 'DL', 'DLB'].includes(meetingSelection.tipe_kegiatan)}
                                        disabled={['C', 'S', 'DL', 'DLB'].includes(meetingSelection.tipe_kegiatan)}
                                        onChange={(e) => setMeetingSelection({ ...meetingSelection, siang: e.target.checked })}
                                        className="hidden"
                                    />
                                    <div className={`w-6 h-6 rounded-xl border-2 flex items-center justify-center transition-all ${meetingSelection.siang || ['C', 'S', 'DL', 'DLB'].includes(meetingSelection.tipe_kegiatan) ? 'bg-ppm-slate border-ppm-slate' : 'border-slate-200'}`}>
                                        {(meetingSelection.siang || ['C', 'S', 'DL', 'DLB'].includes(meetingSelection.tipe_kegiatan)) && <CheckCircle2 size={14} className="text-white" />}
                                    </div>
                                    <span className={`text-[11px] font-black uppercase tracking-widest ${meetingSelection.siang || ['C', 'S', 'DL', 'DLB'].includes(meetingSelection.tipe_kegiatan) ? 'text-ppm-slate' : 'text-slate-400'}`}>Siang</span>
                                </label>
                            </div>

                            <div className="space-y-2">
                                <SearchableSelect
                                    label="Pilih Surat"
                                    options={MOCK_LETTERS}
                                    keyField="id"
                                    displayField="nomor"
                                    secondaryField="perihal"
                                    value={meetingSelection.suratId || null}
                                    onChange={(val) => setMeetingSelection({ ...meetingSelection, suratId: val })}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest px-1">Keterangan / Catatan</label>
                                <textarea
                                    value={meetingSelection.keterangan}
                                    onChange={(e) => setMeetingSelection({ ...meetingSelection, keterangan: e.target.value })}
                                    placeholder="Tuliskan keterangan rapat di sini..."
                                    className="input-modern min-h-[100px] py-4 text-[12px] resize-y"
                                />
                            </div>

                            <div className="space-y-2">
                                <SearchableSelect
                                    label="Pegawai"
                                    multiple={true}
                                    options={data.map(p => {
                                        const restricted = getRestrictedEmployees(meetingSelection.day, meetingSelection.session);
                                        const restriction = Array.from(restricted).find(r => r.id === p.profil_id);
                                        return {
                                            ...p,
                                            disabled: !!restriction,
                                            disabledReason: restriction?.reason
                                        };
                                    })}
                                    keyField="profil_id"
                                    displayField="nama_lengkap"
                                    value={meetingSelection.selectedProfilIds}
                                    onChange={(val) => setMeetingSelection({ ...meetingSelection, selectedProfilIds: val })}
                                />
                            </div>

                            <div className="space-y-2">
                                <SearchableSelect
                                    label="Kegiatan / Rapat"
                                    options={MOCK_MEETINGS}
                                    keyField="id"
                                    displayField="nama"
                                    value={meetingSelection.activityId}
                                    onChange={(val) => {
                                        const meeting = MOCK_MEETINGS.find(m => m.id === val);
                                        if (meeting) {
                                            setMeetingSelection({
                                                ...meetingSelection,
                                                activityId: meeting.id,
                                                activityNama: meeting.nama
                                            });
                                        }
                                    }}
                                />
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setMeetingSelection(null)}
                                className="flex-1 px-4 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:bg-slate-50 transition-colors"
                            >
                                Batal
                            </button>
                            <button
                                onClick={() => handleMeetingSubmit()}
                                disabled={isSaving || (!meetingSelection.pagi && !meetingSelection.siang)}
                                className="flex-1 px-4 py-2.5 rounded-2xl bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-500/20 transition-all flex items-center justify-center gap-2"
                            >
                                {isSaving ? (
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                ) : (
                                    <CheckCircle2 size={16} />
                                )}
                                Simpan
                            </button>
                        </div>
                    </div>
                </div>
            )}


            {/* Holiday Prompt Modal - Set Duration & Description */}
            {holidayPrompt && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-red-900/10 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-[2rem] shadow-2xl border border-red-50 p-6 w-full max-w-sm animate-in zoom-in-95 duration-200">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-red-500 text-white shadow-lg shadow-red-500/20">
                                <AlertCircle size={24} />
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-slate-800">Set Hari Libur</h3>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                                    Mulai: {holidayPrompt.day} {monthNames[month - 1]} {year}
                                </p>
                            </div>
                        </div>

                        <div className="space-y-4 mb-6">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Berapa Hari Libur?</label>
                                <input
                                    type="number"
                                    min={1}
                                    max={31}
                                    value={holidayPrompt.duration}
                                    onChange={(e) => setHolidayPrompt({ ...holidayPrompt, duration: parseInt(e.target.value) || 1 })}
                                    className="input-modern"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Alasan Libur / Keterangan</label>
                                <textarea
                                    value={holidayPrompt.keterangan}
                                    onChange={(e) => setHolidayPrompt({ ...holidayPrompt, keterangan: e.target.value })}
                                    placeholder="Contoh: Libur Hari Raya, Cuti Bersama..."
                                    className="input-modern min-h-[80px] py-3 text-[11px] resize-none border-red-100 focus:border-red-500 focus:ring-red-500/20"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setHolidayPrompt(null)}
                                className="flex-1 px-4 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest text-slate-400 hover:bg-slate-50 transition-colors"
                            >
                                Batal
                            </button>
                            <button
                                onClick={handleConfirmHoliday}
                                className="flex-[2] py-3 rounded-2xl bg-red-500 hover:bg-red-600 text-white text-[11px] font-black uppercase tracking-widest shadow-lg shadow-red-500/20 transition-all flex items-center justify-center gap-2"
                            >
                                <CheckCircle2 size={16} />
                                Konfirmasi
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Holiday Options Modal - Edit / Delete */}
            {holidayOptions && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/10 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-[2rem] shadow-2xl border border-slate-50 p-6 w-full max-w-sm animate-in zoom-in-95 duration-200">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-indigo-500 text-white shadow-lg shadow-indigo-500/20">
                                <Calendar size={24} />
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-slate-800">Kelola Hari Libur</h3>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                                    {holidayOptions.day} {monthNames[month - 1]} {year}
                                </p>
                            </div>
                        </div>

                        <div className="space-y-3 mb-6">
                            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 italic text-[11px] text-slate-600">
                                "{holidayOptions.keterangan || 'Tidak ada keterangan'}"
                            </div>
                            <button
                                onClick={() => {
                                    setHolidayPrompt({ day: holidayOptions.day, tanggal: holidayOptions.tanggal, duration: 1, keterangan: holidayOptions.keterangan });
                                    setHolidayOptions(null);
                                }}
                                className="w-full flex items-center justify-center gap-3 p-4 rounded-2xl bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-[11px] font-black uppercase tracking-widest transition-all"
                            >
                                <Edit2 size={16} />
                                Edit Keterangan
                            </button>
                            <button
                                onClick={handleDeleteHoliday}
                                className="w-full flex items-center justify-center gap-3 p-4 rounded-2xl bg-red-50 hover:bg-red-100 text-red-600 text-[11px] font-black uppercase tracking-widest transition-all"
                            >
                                <XCircle size={16} />
                                Hapus Libur
                            </button>
                        </div>

                        <button
                            onClick={() => setHolidayOptions(null)}
                            className="w-full py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest text-slate-400 hover:bg-slate-50 transition-all"
                        >
                            Tutup
                        </button>
                    </div>
                </div>
            )}

            {/* Imperative Tooltip Instance */}
            <ActivitiesTooltip ref={tooltipRef} />
            {/* Printable Report Container (Hidden behind UI for capture) */}
            <div
                ref={printableReportRef}
                className="fixed top-0 left-0 bg-white p-12 w-[1150px] pointer-events-none -z-50 text-black"
                style={{ visibility: 'visible' }}
            >
                {/* Kop Instansi */}
                <div className="text-center border-b-[5px] border-black pb-8 mb-8">
                    <h2 className="text-lg font-bold uppercase tracking-widest mb-1 text-black">Pemerintah Kabupaten Pemerintah</h2>
                    <h1 className="text-3xl font-black uppercase mb-1 text-black leading-tight">
                        {instansiList.find(i => i.id === selectedInstansi)?.instansi || user?.instansi_nama || 'Instansi Daerah'}
                    </h1>
                    <p className="text-sm font-black italic text-black/80 tracking-wide">
                        Rekapitulasi Laporan Kegiatan Pegawai
                    </p>
                </div>

                {/* Report Title */}
                <div className="text-center mb-10">
                    <h3 className="text-2xl font-black uppercase underline underline-offset-[12px] decoration-[4px] decoration-black text-black">
                        Laporan Rekapitulasi Kegiatan {view === 'monthly' ? 'Bulanan' : 'Tahunan'}
                    </h3>
                    <p className="text-lg font-black mt-8 text-black">
                        Periode: {view === 'monthly' ? `${monthNames[month - 1]} ${year}` : year}
                    </p>
                </div>

                {/* Summary Table */}
                <div className="border-[3px] border-black">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="bg-slate-200 border-b-[3px] border-black">
                                <th className="border-r-[2px] border-black p-4 text-left text-xs font-black uppercase tracking-wider w-[300px] text-black">Nama Pegawai</th>
                                {activityTypes.map(t => (
                                    <th key={t.kode} className="border-r-[2px] border-black p-4 text-center text-[11px] font-black uppercase tracking-wider text-black">{t.kode}</th>
                                ))}
                                <th className="p-4 text-center text-xs font-black uppercase tracking-wider bg-slate-400 text-black">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredData.map((p, idx) => (
                                <tr key={p.profil_id} className={`border-black ${idx !== filteredData.length - 1 ? 'border-b-[2px]' : ''}`}>
                                    <td className="border-r-[2px] border-black p-4">
                                        <div className="text-[15px] font-black text-black leading-tight mb-0.5">{p.nama_lengkap}</div>
                                        <div className="text-[10px] font-bold text-black/70 uppercase tracking-tighter">{p.bidang_singkatan || 'Bapperida'}</div>
                                    </td>
                                    {activityTypes.map(t => (
                                        <td key={t.kode} className="border-r-[2px] border-black p-4 text-center text-base font-black text-black">
                                            {p.summary?.[t.kode] || 0}
                                        </td>
                                    ))}
                                    <td className="p-4 text-center text-base font-black text-black bg-slate-100/80">
                                        {p.summary?.total || 0}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Footer / Signature */}
                <div className="mt-16 flex justify-end text-sm">
                    <div className="text-center w-80">
                        <p className="mb-2 font-bold text-black">Dicetak pada: {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                        <div className="h-32 text-black"></div>
                        <p className="font-black underline text-lg text-black">( ........................................ )</p>
                        <p className="text-[11px] font-black text-black mt-2 uppercase tracking-widest">Administrator Sistem</p>
                    </div>
                </div>
            </div>

            {/* Tailwind Safelist for Dynamic DB Colors */}
            <div className="hidden bg-rose-500 bg-amber-500 bg-emerald-500 bg-indigo-500 bg-ppm-slate bg-purple-600 bg-purple-500 bg-fuchsia-600 text-white text-slate-800 border-slate-200 uppercase tracking-widest px-1"></div>
        </div>
    );
}
