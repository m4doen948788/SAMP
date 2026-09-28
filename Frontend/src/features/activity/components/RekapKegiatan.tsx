import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { api } from '@/src/services/api';
import { useAuth } from '@/src/contexts/AuthContext';
import { 
    Calendar,
    ChevronLeft,
    ChevronRight,
    Search,
    Filter,
    Users,
    User,
    Building2,
    CalendarDays,
    List,
    Clock,
    Tag,
    BookOpen,
    ExternalLink,
    Paperclip,
    X,
    FileText,
    CheckCircle2,
    AlertCircle,
    Eye,
    Edit2,
    Download,
    Mail,
    Send,
    FileSignature,
    ScrollText,
    Presentation,
    Briefcase,
    FileCheck,
    Sparkles,
    CalendarRange,
    FolderKanban,
    Check,
    UserCheck,
    UserX,
    Smile,
    Loader2,
    Plus
} from 'lucide-react';
import { DocumentViewerModal } from '@/src/components/modals/DocumentViewerModal';
import { ActivityFormModal } from '@/src/components/modals/ActivityFormModal';
import { PetugasDetailModal } from '@/src/components/modals/PetugasDetailModal';

// Unified Document Categories
const DOCUMENT_CATEGORIES = [
    { id: 'surat_undangan_masuk', icon: <Mail size={13} />, label: 'Undangan Masuk', color: 'emerald' },
    { id: 'surat_undangan_keluar', icon: <Send size={13} />, label: 'Undangan Keluar', color: 'blue' },
    { id: 'surat_perintah', icon: <FileSignature size={13} />, label: 'Surat Tugas / Perintah', color: 'amber' },
    { id: 'notulensi', icon: <ScrollText size={13} />, label: 'Notulensi', color: 'indigo' },
    { id: 'paparan', icon: <Presentation size={13} />, label: 'Paparan / Materi', color: 'purple' },
    { id: 'bahan_desk', icon: <Briefcase size={13} />, label: 'Bahan Desk', color: 'orange' },
    { id: 'laporan', icon: <FileCheck size={13} />, label: 'Laporan', color: 'rose' }
];

const MONTH_NAMES = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const DAY_NAMES = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

interface RekapKegiatanProps {
    headerHeight?: number;
    onNavigateToDaftar?: (kegiatanId?: number, searchKeyword?: string) => void;
    onNavigateToLogbook?: (profilId?: number, date?: string) => void;
}

export default function RekapKegiatan({
    headerHeight = 105,
    onNavigateToDaftar,
    onNavigateToLogbook
}: RekapKegiatanProps) {
    const { user } = useAuth();

    // Date State
    const today = new Date();
    const [month, setMonth] = useState<number>(today.getMonth() + 1);
    const [year, setYear] = useState<number>(today.getFullYear());

    // Filter & View State - DEFAULT VIEW ADALAH BIDANG USER
    const defaultBidang = user?.bidang_id ? String(user.bidang_id) : 'all';
    const [selectedBidang, setSelectedBidang] = useState<string>(defaultBidang);
    const [selectedJenis, setSelectedJenis] = useState<string>('all');
    const [viewMode, setViewMode] = useState<'calendar' | 'agenda'>('calendar');
    const [searchQuery, setSearchQuery] = useState<string>('');

    // Sync bidang default jika data user selesai dimuat kemudian
    useEffect(() => {
        if (user?.bidang_id && selectedBidang === 'all') {
            setSelectedBidang(String(user.bidang_id));
        }
    }, [user?.bidang_id]);

    // Data State
    const [activities, setActivities] = useState<any[]>([]);
    const [pegawaiList, setPegawaiList] = useState<any[]>([]);
    const [bidangList, setBidangList] = useState<any[]>([]);
    const [jenisList, setJenisList] = useState<any[]>([]);
    const [tematikList, setTematikList] = useState<any[]>([]);
    const [masterInstansiDaerahList, setMasterInstansiDaerahList] = useState<any[]>([]);
    const [masterDokumenList, setMasterDokumenList] = useState<any[]>([]);
    const [holidays, setHolidays] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    // Selected Date Modal Detail State
    const [selectedDateStr, setSelectedDateStr] = useState<string | null>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);
    const [petugasFilterTab, setPetugasFilterTab] = useState<'all' | 'bertugas' | 'free'>('all');
    const [petugasSearch, setPetugasSearch] = useState<string>('');

    // Activity Detail Modal State (Mata icon)
    const [detailActivity, setDetailActivity] = useState<any | null>(null);
    const [isDetailActivityOpen, setIsDetailActivityOpen] = useState<boolean>(false);
    const [fetchingDetailId, setFetchingDetailId] = useState<number | null>(null);

    // Activity Form Modal State (Pensil icon)
    const [editingActivity, setEditingActivity] = useState<any | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);

    // Petugas Detail Modal State (Klik nama pegawai untuk view CV / profil pegawai)
    const [selectedPetugasModal, setSelectedPetugasModal] = useState<any | null>(null);

    // Document Viewer Modal State
    const [viewedDoc, setViewedDoc] = useState<{
        path: string;
        name: string;
        kegiatan_id?: number;
        dokumen_id?: number;
        is_private?: boolean | number;
        uploaded_by?: number;
    } | null>(null);

    // Load Master Data (Once)
    useEffect(() => {
        let isMounted = true;
        const loadMaster = async () => {
            try {
                const [bidangRes, pegawaiRes, jenisRes, tematikRes, instansiRes, masterDokRes] = await Promise.all([
                    api.bidangInstansi.getAll(),
                    api.profilPegawai.getAll(),
                    api.masterDataConfig.getDataByTable('master_tipe_kegiatan'),
                    api.tematik.getAll(),
                    api.masterInstansiDaerah.getAll(),
                    api.masterDokumen.getAll()
                ]);

                if (isMounted) {
                    if (bidangRes.success) setBidangList(bidangRes.data || []);
                    if (pegawaiRes.success) setPegawaiList(pegawaiRes.data || []);
                    if (jenisRes.success) setJenisList(jenisRes.data || []);
                    if (tematikRes.success) setTematikList(tematikRes.data || []);
                    if (instansiRes.success) setMasterInstansiDaerahList(instansiRes.data || []);
                    if (masterDokRes.success) setMasterDokumenList(masterDokRes.data || []);
                }
            } catch (err) {
                console.error('Failed to load master data in RekapKegiatan:', err);
            }
        };
        loadMaster();
        return () => { isMounted = false; };
    }, []);

    // Load Activities & Holidays on Month / Year Change
    const fetchActivitiesAndHolidays = useCallback(async () => {
        setIsLoading(true);
        try {
            const pad = (n: number) => String(n).padStart(2, '0');
            const startStr = `${year}-${pad(month)}-01`;
            const lastDay = new Date(year, month, 0).getDate();
            const endStr = `${year}-${pad(month)}-${pad(lastDay)}`;

            const [actRes, holidayRes] = await Promise.all([
                api.kegiatanManajemen.getAll({
                    startDate: startStr,
                    endDate: endStr
                }),
                api.holidays.getMonthly(year, month)
            ]);

            if (actRes.success) {
                setActivities(actRes.data || []);
            }
            if (holidayRes.success) {
                setHolidays(holidayRes.data || []);
            }
        } catch (err) {
            console.error('Failed to fetch activities/holidays in RekapKegiatan:', err);
        } finally {
            setIsLoading(false);
        }
    }, [month, year]);

    useEffect(() => {
        fetchActivitiesAndHolidays();
    }, [fetchActivitiesAndHolidays]);

    // Pegawai Map for quick lookup
    const pegawaiMap = useMemo(() => {
        const map = new Map<number, any>();
        pegawaiList.forEach(p => map.set(Number(p.id), p));
        return map;
    }, [pegawaiList]);

    // Filter Activities based on search, bidang, and jenis
    const filteredActivities = useMemo(() => {
        return activities.filter(act => {
            // Search query filter (matching activity name, description, or assigned officers)
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase().trim();
                const matchName = (act.nama_kegiatan || '').toLowerCase().includes(q);
                const matchKet = (act.keterangan || '').toLowerCase().includes(q);
                const matchPenyelenggara = (act.instansi_penyelenggara || '').toLowerCase().includes(q);
                
                let matchOfficer = false;
                if (act.petugas_ids) {
                    const pIds = String(act.petugas_ids).split(',').map(s => Number(s.trim()));
                    matchOfficer = pIds.some(pid => {
                        const peg = pegawaiMap.get(pid);
                        return peg && (peg.nama_lengkap || '').toLowerCase().includes(q);
                    });
                }

                if (!matchName && !matchKet && !matchPenyelenggara && !matchOfficer) {
                    return false;
                }
            }

            // Bidang filter (Default view adalah bidang user)
            if (selectedBidang !== 'all') {
                const bId = String(selectedBidang);
                const actBidangIds = act.bidang_ids ? String(act.bidang_ids).split(',').map(s => s.trim()) : [];
                const actBidangSingle = act.bidang_id ? String(act.bidang_id) : '';
                if (!actBidangIds.includes(bId) && actBidangSingle !== bId) {
                    return false;
                }
            }

            // Jenis Kegiatan filter
            if (selectedJenis !== 'all') {
                if (String(act.jenis_kegiatan_id) !== String(selectedJenis)) {
                    return false;
                }
            }

            return true;
        });
    }, [activities, searchQuery, selectedBidang, selectedJenis, pegawaiMap]);

    // Group activities by date string: 'YYYY-MM-DD' => Activity[]
    const activitiesByDate = useMemo(() => {
        const map = new Map<string, any[]>();
        filteredActivities.forEach(act => {
            if (!act.tanggal) return;
            const start = new Date(act.tanggal.substring(0, 10));
            const end = act.tanggal_akhir ? new Date(act.tanggal_akhir.substring(0, 10)) : new Date(start);

            let curr = new Date(start);
            let loopCount = 0;
            while (curr <= end && loopCount < 35) {
                const y = curr.getFullYear();
                const m = String(curr.getMonth() + 1).padStart(2, '0');
                const d = String(curr.getDate()).padStart(2, '0');
                const dateKey = `${y}-${m}-${d}`;

                if (!map.has(dateKey)) {
                    map.set(dateKey, []);
                }
                map.get(dateKey)!.push(act);

                curr.setDate(curr.getDate() + 1);
                loopCount++;
            }
        });
        return map;
    }, [filteredActivities]);

    // Calculate month grid calendar days
    const calendarDays = useMemo(() => {
        const pad = (n: number) => String(n).padStart(2, '0');
        const firstDayOfMonth = new Date(year, month - 1, 1);
        const lastDayOfMonth = new Date(year, month, 0).getDate();

        let startDayIndex = firstDayOfMonth.getDay() - 1;
        if (startDayIndex === -1) startDayIndex = 6;

        const days = [];

        // Previous month filler days
        const prevMonthLastDay = new Date(year, month - 1, 0).getDate();
        for (let i = startDayIndex - 1; i >= 0; i--) {
            const dayNum = prevMonthLastDay - i;
            const prevMonth = month === 1 ? 12 : month - 1;
            const prevYear = month === 1 ? year - 1 : year;
            const dateStr = `${prevYear}-${pad(prevMonth)}-${pad(dayNum)}`;
            days.push({
                day: dayNum,
                month: prevMonth,
                year: prevYear,
                dateStr,
                isCurrentMonth: false,
                isWeekend: false
            });
        }

        // Current month days
        for (let dayNum = 1; dayNum <= lastDayOfMonth; dayNum++) {
            const dateStr = `${year}-${pad(month)}-${pad(dayNum)}`;
            days.push({
                day: dayNum,
                month,
                year,
                dateStr,
                isCurrentMonth: true,
                isWeekend: false
            });
        }

        // Next month filler days to complete grid (multiples of 7)
        const remainingDays = 7 - (days.length % 7);
        if (remainingDays < 7) {
            const nextMonth = month === 12 ? 1 : month + 1;
            const nextYear = month === 12 ? year + 1 : year;
            for (let dayNum = 1; dayNum <= remainingDays; dayNum++) {
                const dateStr = `${nextYear}-${pad(nextMonth)}-${pad(dayNum)}`;
                days.push({
                    day: dayNum,
                    month: nextMonth,
                    year: nextYear,
                    dateStr,
                    isCurrentMonth: false,
                    isWeekend: false
                });
            }
        }

        // Mark weekends, holidays, activities & officers
        return days.map(d => {
            const dt = new Date(d.year, d.month - 1, d.day);
            const isWeekend = [0, 6].includes(dt.getDay());
            const holiday = holidays.find(h => {
                const hDate = h.tanggal ? h.tanggal.substring(0, 10) : '';
                return hDate === d.dateStr;
            });
            const acts = activitiesByDate.get(d.dateStr) || [];
            
            const officerIdSet = new Set<number>();
            acts.forEach(a => {
                if (a.petugas_ids) {
                    String(a.petugas_ids).split(',').forEach(id => {
                        const n = Number(id.trim());
                        if (n) officerIdSet.add(n);
                    });
                }
            });

            return {
                ...d,
                isWeekend,
                holiday,
                isHoliday: !!holiday,
                activities: acts,
                officerCount: officerIdSet.size,
                hasActivities: acts.length > 0,
                isToday: d.dateStr === `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`
            };
        });
    }, [year, month, holidays, activitiesByDate, today]);

    // Statistics for the current month (mengikuti filter bidang aktif)
    const stats = useMemo(() => {
        let totalKegiatanCount = 0;
        const uniquePegawaiIds = new Set<number>();
        const daysWithKegiatan = new Set<string>();

        const pad = (n: number) => String(n).padStart(2, '0');
        const monthPrefix = `${year}-${pad(month)}`;

        activitiesByDate.forEach((acts, dateStr) => {
            if (dateStr.startsWith(monthPrefix) && acts.length > 0) {
                daysWithKegiatan.add(dateStr);
                acts.forEach(a => {
                    totalKegiatanCount++;
                    if (a.petugas_ids) {
                        String(a.petugas_ids).split(',').forEach(id => {
                            const n = Number(id.trim());
                            if (n) uniquePegawaiIds.add(n);
                        });
                    }
                });
            }
        });

        const uniqueActivitiesInMonth = filteredActivities.filter(a => {
            if (!a.tanggal) return false;
            const s = a.tanggal.substring(0, 7);
            const e = a.tanggal_akhir ? a.tanggal_akhir.substring(0, 7) : s;
            return s <= monthPrefix && e >= monthPrefix;
        });

        return {
            totalKegiatan: uniqueActivitiesInMonth.length,
            totalPegawai: uniquePegawaiIds.size,
            hariAktif: daysWithKegiatan.size
        };
    }, [filteredActivities, activitiesByDate, year, month]);

    // Handlers Navigation
    const handleGoToday = () => {
        const now = new Date();
        setMonth(now.getMonth() + 1);
        setYear(now.getFullYear());
    };

    const handlePrevMonth = () => {
        if (month === 1) {
            setMonth(12);
            setYear(y => y - 1);
        } else {
            setMonth(m => m - 1);
        }
    };

    const handleNextMonth = () => {
        if (month === 12) {
            setMonth(1);
            setYear(y => y + 1);
        } else {
            setMonth(m => m + 1);
        }
    };

    const handleDateClick = (dateStr: string) => {
        setSelectedDateStr(dateStr);
        setPetugasFilterTab('all');
        setPetugasSearch('');
        setIsDetailModalOpen(true);
    };

    // Activities for Selected Date in Modal
    const selectedDateActivities = useMemo(() => {
        if (!selectedDateStr) return [];
        return activitiesByDate.get(selectedDateStr) || [];
    }, [selectedDateStr, activitiesByDate]);

    // Target Officers (Petugas Bidang Terpilih atau Instansi)
    const targetOfficers = useMemo(() => {
        if (selectedBidang !== 'all') {
            return pegawaiList.filter(p => String(p.bidang_id) === String(selectedBidang));
        }
        if (user?.bidang_id) {
            return pegawaiList.filter(p => String(p.bidang_id) === String(user.bidang_id));
        }
        return pegawaiList;
    }, [pegawaiList, selectedBidang, user?.bidang_id]);

    // Pembagian Petugas: Bertugas vs Belum Memiliki Kegiatan pada tanggal yang dipilih
    const { busyOfficers, freeOfficers } = useMemo(() => {
        if (!selectedDateStr) return { busyOfficers: [], freeOfficers: [] };

        // Mapping id pegawai -> daftar kegiatan yang diikutinya di hari ini
        const officerActivityMap = new Map<number, any[]>();
        selectedDateActivities.forEach(act => {
            if (!act.petugas_ids) return;
            const ids = String(act.petugas_ids).split(',').map(s => Number(s.trim())).filter(Boolean);
            ids.forEach(id => {
                if (!officerActivityMap.has(id)) {
                    officerActivityMap.set(id, []);
                }
                officerActivityMap.get(id)!.push(act);
            });
        });

        const busy: any[] = [];
        const free: any[] = [];

        targetOfficers.forEach(peg => {
            const actList = officerActivityMap.get(Number(peg.id));
            if (actList && actList.length > 0) {
                busy.push({
                    pegawai: peg,
                    activities: actList
                });
            } else {
                free.push({
                    pegawai: peg,
                    activities: []
                });
            }
        });

        // Sertakan juga petugas luar bidang jika ditugaskan pada kegiatan di tanggal ini
        officerActivityMap.forEach((actList, id) => {
            const alreadyIncluded = busy.some(b => Number(b.pegawai.id) === id);
            if (!alreadyIncluded) {
                const p = pegawaiMap.get(id);
                if (p) {
                    busy.push({
                        pegawai: p,
                        activities: actList
                    });
                }
            }
        });

        return { busyOfficers: busy, freeOfficers: free };
    }, [selectedDateStr, selectedDateActivities, targetOfficers, pegawaiMap]);

    // Filter Petugas Bertugas (berdasarkan pencarian)
    const filteredBusyOfficers = useMemo(() => {
        if (!petugasSearch.trim()) return busyOfficers;
        const q = petugasSearch.toLowerCase().trim();
        return busyOfficers.filter(item => 
            (item.pegawai?.nama_lengkap || '').toLowerCase().includes(q) ||
            (item.pegawai?.jabatan || '').toLowerCase().includes(q) ||
            (item.activities || []).some((a: any) => (a.nama_kegiatan || '').toLowerCase().includes(q))
        );
    }, [busyOfficers, petugasSearch]);

    // Filter Petugas Belum Memiliki Kegiatan (berdasarkan pencarian)
    const filteredFreeOfficers = useMemo(() => {
        if (!petugasSearch.trim()) return freeOfficers;
        const q = petugasSearch.toLowerCase().trim();
        return freeOfficers.filter(item => 
            (item.pegawai?.nama_lengkap || '').toLowerCase().includes(q) ||
            (item.pegawai?.jabatan || '').toLowerCase().includes(q)
        );
    }, [freeOfficers, petugasSearch]);

    // Handler buka modal Detail Informasi Kegiatan (Icon Mata)
    const handleOpenDetailKegiatan = async (act: any) => {
        setFetchingDetailId(act.id);
        try {
            const res = await api.kegiatanManajemen.getById(act.id);
            if (res.success && res.data) {
                const canEdit = res.data.can_edit !== undefined ? res.data.can_edit : act.can_edit;
                setDetailActivity({ ...res.data, can_edit: canEdit });
            } else {
                setDetailActivity(act);
            }
        } catch (err) {
            console.warn('Fallback to local act data:', err);
            setDetailActivity(act);
        } finally {
            setFetchingDetailId(null);
            setIsDetailActivityOpen(true);
        }
    };

    // Handler buka modal Tambah Kegiatan
    const handleOpenAddKegiatan = () => {
        setEditingActivity(null);
        setIsEditModalOpen(true);
    };

    // Handler buka modal Edit Kegiatan (Icon Pensil)
    const handleOpenEditKegiatan = async (act: any) => {
        if (!act?.can_edit) {
            return;
        }
        setFetchingDetailId(act.id);
        try {
            const res = await api.kegiatanManajemen.getById(act.id);
            if (res.success && res.data) {
                setEditingActivity(res.data);
            } else {
                setEditingActivity(act);
            }
        } catch (err) {
            console.warn('Fallback to local act data for edit:', err);
            setEditingActivity(act);
        } finally {
            setFetchingDetailId(null);
            setIsEditModalOpen(true);
        }
    };

    // Handler hapus kegiatan (jika user menghapus dari dalam ActivityFormModal)
    const handleDeleteKegiatan = async (id: number) => {
        if (!window.confirm('Apakah Anda yakin ingin menghapus / memindahkan kegiatan ini ke tempat sampah?')) return;
        try {
            const res = await api.kegiatanManajemen.delete(id);
            if (res.success) {
                setIsEditModalOpen(false);
                setEditingActivity(null);
                fetchActivitiesAndHolidays();
            } else {
                alert(res.message || 'Gagal menghapus kegiatan');
            }
        } catch (err) {
            console.error('Failed to delete activity:', err);
            alert('Terjadi kesalahan sistem saat menghapus kegiatan');
        }
    };

    // Handler edit sukses
    const handleEditSuccess = () => {
        setIsEditModalOpen(false);
        setEditingActivity(null);
        fetchActivitiesAndHolidays();
    };

    // Format formatted date string for modal title
    const formattedSelectedDate = useMemo(() => {
        if (!selectedDateStr) return '';
        const parts = selectedDateStr.split('-');
        if (parts.length !== 3) return selectedDateStr;
        const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        const dayName = DAY_NAMES[(d.getDay() + 6) % 7];
        const monthName = MONTH_NAMES[d.getMonth()];
        return `${dayName}, ${parts[2]} ${monthName} ${parts[0]}`;
    }, [selectedDateStr]);

    // List of agenda items for agenda view
    const agendaDates = useMemo(() => {
        const dates: { dateStr: string, day: number, month: number, year: number, activities: any[] }[] = [];
        const pad = (n: number) => String(n).padStart(2, '0');
        const lastDayOfMonth = new Date(year, month, 0).getDate();

        for (let d = 1; d <= lastDayOfMonth; d++) {
            const dateStr = `${year}-${pad(month)}-${pad(d)}`;
            const acts = activitiesByDate.get(dateStr) || [];
            if (acts.length > 0) {
                dates.push({
                    dateStr,
                    day: d,
                    month,
                    year,
                    activities: acts
                });
            }
        }
        return dates;
    }, [year, month, activitiesByDate]);

    // Nama Bidang yang sedang aktif
    const currentBidangName = useMemo(() => {
        if (selectedBidang === 'all') return 'Semua Bidang';
        const b = bidangList.find(x => String(x.id) === String(selectedBidang));
        return b ? (b.singkatan || b.nama_bidang) : 'Bidang Terpilih';
    }, [selectedBidang, bidangList]);

    // Format detail kegiatan date helper
    const formatDetailDate = (dateString?: string) => {
        if (!dateString) return '-';
        try {
            const d = new Date(dateString);
            return d.toLocaleDateString('id-ID', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        } catch {
            return dateString;
        }
    };

    // Resolved Bidang list for Detail Activity Modal
    const detailResolvedBidangs = useMemo(() => {
        if (!detailActivity) return [];
        const rawIds = detailActivity.bidang_ids || (detailActivity.bidang_id ? String(detailActivity.bidang_id) : '');
        if (!rawIds) return [];
        const ids = String(rawIds).split(',').map(s => s.trim()).filter(Boolean);
        return ids.map(id => {
            const found = bidangList.find(b => String(b.id) === id);
            return found ? (found.singkatan || found.nama_bidang) : id;
        });
    }, [detailActivity, bidangList]);

    // Resolved Tematik list for Detail Activity Modal
    const detailResolvedTematiks = useMemo(() => {
        if (!detailActivity?.tematik_ids) return [];
        const ids = String(detailActivity.tematik_ids).split(',').map(s => s.trim()).filter(Boolean);
        return ids.map(id => {
            const found = tematikList.find(t => String(t.id) === id);
            return found ? found.nama : id;
        });
    }, [detailActivity, tematikList]);

    // Resolved Petugas for Detail Activity Modal
    const detailResolvedPetugas = useMemo(() => {
        if (!detailActivity?.petugas_ids) return [];
        const ids = String(detailActivity.petugas_ids).split(',').map(s => Number(s.trim())).filter(Boolean);
        return ids.map(id => {
            const p = pegawaiMap.get(id);
            return p ? {
                ...p,
                id: p.id,
                nama: p.nama_lengkap,
                nip: p.nip,
                jabatan: p.jabatan || p.bidang_singkatan || 'Pegawai'
            } : {
                id,
                nama: `Pegawai #${id}`,
                nama_lengkap: `Pegawai #${id}`,
                nip: '-',
                jabatan: 'Pegawai'
            };
        });
    }, [detailActivity, pegawaiMap]);

    return (
        <div className="space-y-3 animate-in fade-in duration-300 pb-12">
            {/* Control Bar: Bulan, Tahun, Filter, View Toggle & Compact Inline Stats */}
            <div className="bg-white rounded-3xl p-3.5 lg:p-4 border border-slate-100 shadow-xl shadow-slate-200/40 space-y-3">
                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
                    {/* Month & Year Navigation */}
                    <div className="flex flex-wrap items-center gap-2.5">
                        <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-2xl border border-slate-200/60 shadow-inner">
                            <button
                                onClick={handlePrevMonth}
                                className="w-7 h-7 rounded-xl bg-white hover:bg-slate-100 flex items-center justify-center text-slate-600 transition-all shadow-sm active:scale-90"
                                title="Bulan Sebelumnya"
                            >
                                <ChevronLeft size={15} />
                            </button>

                            <div className="flex items-center gap-1.5 px-2.5 py-0.5">
                                <select
                                    value={month}
                                    onChange={(e) => setMonth(Number(e.target.value))}
                                    className="bg-transparent font-black text-xs text-slate-800 outline-none cursor-pointer hover:text-ppm-blue transition-colors"
                                >
                                    {MONTH_NAMES.map((name, idx) => (
                                        <option key={idx} value={idx + 1} className="font-bold text-slate-700">
                                            {name}
                                        </option>
                                    ))}
                                </select>

                                <select
                                    value={year}
                                    onChange={(e) => setYear(Number(e.target.value))}
                                    className="bg-transparent font-black text-xs text-slate-800 outline-none cursor-pointer hover:text-ppm-blue transition-colors border-l border-slate-200 pl-2"
                                >
                                    {[2024, 2025, 2026, 2027, 2028, 2029, 2030].map(y => (
                                        <option key={y} value={y} className="font-bold text-slate-700">
                                            {y}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <button
                                onClick={handleNextMonth}
                                className="w-7 h-7 rounded-xl bg-white hover:bg-slate-100 flex items-center justify-center text-slate-600 transition-all shadow-sm active:scale-90"
                                title="Bulan Berikutnya"
                            >
                                <ChevronRight size={15} />
                            </button>
                        </div>

                        <button
                            onClick={handleGoToday}
                            className="px-3 py-1.5 bg-ppm-blue/10 hover:bg-ppm-blue text-ppm-blue hover:text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-300 shadow-sm active:scale-95"
                        >
                            Hari Ini
                        </button>
                    </div>

                    {/* Filter & View Switcher */}
                    <div className="flex flex-wrap items-center gap-2.5">
                        {/* Search Input */}
                        <div className="relative min-w-[190px] flex-1 sm:flex-none">
                            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Cari kegiatan / pegawai..."
                                className="w-full bg-slate-50 border border-slate-200/80 rounded-2xl pl-8 pr-7 py-1.5 text-xs font-bold text-slate-700 placeholder-slate-400 outline-none focus:ring-2 focus:ring-ppm-blue/20 focus:border-ppm-blue transition-all"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                                >
                                    <X size={12} />
                                </button>
                            )}
                        </div>

                        {/* Filter Bidang (DEFAULT VIEW: BIDANG USER) */}
                        <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/80 rounded-2xl px-2.5 py-1.5">
                            <Building2 size={13} className="text-ppm-blue shrink-0" />
                            <select
                                value={selectedBidang}
                                onChange={(e) => setSelectedBidang(e.target.value)}
                                className="bg-transparent text-xs font-black text-slate-700 outline-none cursor-pointer max-w-[140px] truncate"
                            >
                                {user?.bidang_id && (
                                    <option value={String(user.bidang_id)}>
                                        Bidang Saya ({user.bidang_singkatan || 'Saya'})
                                    </option>
                                )}
                                <option value="all">Semua Bidang</option>
                                {bidangList
                                    .filter(b => user?.bidang_id ? String(b.id) !== String(user.bidang_id) : true)
                                    .map(b => (
                                        <option key={b.id} value={b.id}>
                                            {b.singkatan || b.nama_bidang}
                                        </option>
                                    ))
                                }
                            </select>
                        </div>

                        {/* Filter Jenis Kegiatan */}
                        <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/80 rounded-2xl px-2.5 py-1.5">
                            <Tag size={13} className="text-slate-400 shrink-0" />
                            <select
                                value={selectedJenis}
                                onChange={(e) => setSelectedJenis(e.target.value)}
                                className="bg-transparent text-xs font-bold text-slate-700 outline-none cursor-pointer max-w-[120px] truncate"
                            >
                                <option value="all">Semua Jenis</option>
                                {jenisList.map(j => (
                                    <option key={j.id} value={j.id}>
                                        {j.nama}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* View Mode Toggle */}
                        <div className="flex items-center p-0.5 bg-slate-100 rounded-2xl border border-slate-200/60">
                            <button
                                onClick={() => setViewMode('calendar')}
                                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl font-black text-[9px] uppercase tracking-wider transition-all duration-300 ${
                                    viewMode === 'calendar'
                                        ? 'bg-white text-ppm-blue shadow-sm'
                                        : 'text-slate-500 hover:text-slate-700'
                                }`}
                            >
                                <CalendarDays size={12} />
                                Kalender
                            </button>
                            <button
                                onClick={() => setViewMode('agenda')}
                                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl font-black text-[9px] uppercase tracking-wider transition-all duration-300 ${
                                    viewMode === 'agenda'
                                        ? 'bg-white text-ppm-blue shadow-sm'
                                        : 'text-slate-500 hover:text-slate-700'
                                }`}
                            >
                                <List size={12} />
                                Agenda
                            </button>
                        </div>
                    </div>
                </div>

                {/* COMPACT INLINE REKAP BAR (MENGGANTIKAN KARTU COUNTER BESAR) */}
                <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2.5 border-t border-slate-100 text-xs">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mr-0.5">
                            Rekap {MONTH_NAMES[month - 1]} {year}:
                        </span>
                        
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50/80 border border-blue-100/90 rounded-xl">
                            <FolderKanban size={12} className="text-ppm-blue" />
                            <span className="text-[10px] font-bold text-slate-500">Kegiatan:</span>
                            <span className="font-black text-ppm-blue text-xs tabular-nums">{stats.totalKegiatan}</span>
                        </div>

                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50/80 border border-emerald-100/90 rounded-xl">
                            <Users size={12} className="text-emerald-600" />
                            <span className="text-[10px] font-bold text-slate-500">Personil:</span>
                            <span className="font-black text-emerald-700 text-xs tabular-nums">{stats.totalPegawai}</span>
                        </div>

                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50/80 border border-amber-100/90 rounded-xl">
                            <CalendarRange size={12} className="text-amber-600" />
                            <span className="text-[10px] font-bold text-slate-500">Hari Berisi Agenda:</span>
                            <span className="font-black text-amber-700 text-xs tabular-nums">{stats.hariAktif}</span>
                        </div>
                    </div>

                    <div className="text-[10px] font-bold text-slate-400 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-ppm-blue animate-pulse"></span>
                        <span>Fokus Tampilan: <b className="text-slate-700">{currentBidangName}</b></span>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            {viewMode === 'calendar' ? (
                /* CALENDAR GRID VIEW */
                <div className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden">
                    {/* Day Headers (Senin - Minggu) */}
                    <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/80">
                        {DAY_NAMES.map((name, i) => (
                            <div
                                key={name}
                                className={`py-2.5 text-center text-[10px] font-black uppercase tracking-wider ${
                                    i >= 5 ? 'text-red-500 bg-red-50/30' : 'text-slate-600'
                                }`}
                            >
                                <span className="hidden sm:inline">{name}</span>
                                <span className="sm:hidden">{name.substring(0, 3)}</span>
                            </div>
                        ))}
                    </div>

                    {/* Calendar Month Grid */}
                    <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-100">
                        {calendarDays.map((cell) => {
                            const isSelected = selectedDateStr === cell.dateStr;
                            return (
                                <div
                                    key={cell.dateStr}
                                    onClick={() => handleDateClick(cell.dateStr)}
                                    className={`min-h-[105px] sm:min-h-[130px] p-2 sm:p-2.5 transition-all flex flex-col justify-between group relative cursor-pointer ${
                                        !cell.isCurrentMonth
                                            ? 'bg-slate-50/40 text-slate-300'
                                            : cell.isWeekend || cell.isHoliday
                                            ? 'bg-rose-50/20 text-slate-700'
                                            : 'bg-white text-slate-800'
                                    } ${
                                        cell.isToday
                                            ? 'ring-2 ring-inset ring-ppm-blue/50 bg-blue-50/10'
                                            : ''
                                    } ${
                                        isSelected
                                            ? 'bg-blue-50/40 ring-2 ring-ppm-blue'
                                            : 'hover:bg-slate-50/80'
                                    }`}
                                >
                                    {/* Top Row: Date Number & Badges */}
                                    <div className="flex items-center justify-between mb-1">
                                        <div className="flex items-center gap-1.5">
                                            <span
                                                className={`w-6 h-6 sm:w-7 sm:h-7 rounded-xl flex items-center justify-center text-xs font-black transition-transform group-hover:scale-110 ${
                                                    cell.isToday
                                                        ? 'bg-ppm-blue text-white shadow-md shadow-blue-200'
                                                        : cell.isWeekend || cell.isHoliday
                                                        ? 'text-red-500 bg-red-100/50'
                                                        : cell.isCurrentMonth
                                                        ? 'text-slate-800 bg-slate-100/80'
                                                        : 'text-slate-400 bg-transparent'
                                                }`}
                                            >
                                                {cell.day}
                                            </span>

                                            {cell.isHoliday && (
                                                <span
                                                    className="w-2 h-2 rounded-full bg-red-500 shrink-0"
                                                    title={cell.holiday?.keterangan || 'Hari Libur'}
                                                />
                                            )}
                                        </div>

                                        {/* TANDA KEGIATAN: Badge Jumlah Kegiatan */}
                                        {cell.hasActivities && (
                                            <div className="flex items-center gap-1">
                                                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-600 text-white font-black text-[9px] shadow-sm animate-in zoom-in-95">
                                                    <Sparkles size={10} className="animate-pulse" />
                                                    {cell.activities.length}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Middle: Preview of activities */}
                                    <div className="flex-1 space-y-1 overflow-hidden">
                                        {cell.hasActivities ? (
                                            <>
                                                {cell.activities.slice(0, 2).map((act: any, idx: number) => {
                                                    const sesiBadgeColor = 
                                                        act.sesi === 'Pagi' ? 'bg-amber-100 text-amber-800 border-amber-200' :
                                                        act.sesi === 'Siang' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                                                        'bg-purple-100 text-purple-800 border-purple-200';
                                                    return (
                                                        <div
                                                            key={act.id || idx}
                                                            className="p-1 px-1.5 rounded-lg bg-slate-50 border border-slate-200/60 hover:border-ppm-blue/40 text-[9px] font-bold text-slate-700 truncate shadow-2xs group-hover:bg-white transition-colors"
                                                            title={act.nama_kegiatan}
                                                        >
                                                            <span className={`inline-block mr-1 px-1 py-0.2 rounded text-[7px] font-black uppercase border ${sesiBadgeColor}`}>
                                                                {act.sesi || 'Pagi'}
                                                            </span>
                                                            <span className="truncate">{act.nama_kegiatan}</span>
                                                        </div>
                                                    );
                                                })}
                                                {cell.activities.length > 2 && (
                                                    <div className="text-[8px] font-black text-slate-400 pl-1">
                                                        +{cell.activities.length - 2} lainnya...
                                                    </div>
                                                )}
                                            </>
                                        ) : (
                                            cell.isHoliday && cell.holiday?.keterangan ? (
                                                <div className="text-[8px] font-bold text-red-400 italic line-clamp-2 px-1">
                                                    {cell.holiday.keterangan}
                                                </div>
                                            ) : null
                                        )}
                                    </div>

                                    {/* Bottom: Officer Count Indicator */}
                                    <div className="mt-1 flex items-center justify-between text-[8px] font-black text-slate-400 pt-1 border-t border-slate-100/50">
                                        {cell.officerCount > 0 ? (
                                            <span className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md">
                                                <Users size={10} />
                                                {cell.officerCount} Pegawai
                                            </span>
                                        ) : (
                                            <span className="opacity-0">-</span>
                                        )}

                                        <span className="text-[8px] font-bold text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity">
                                            Detail &rarr;
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ) : (
                /* AGENDA / TIMELINE LIST VIEW */
                <div className="space-y-3">
                    {agendaDates.length === 0 ? (
                        <div className="bg-white rounded-3xl p-12 text-center border border-slate-100 shadow-sm flex flex-col items-center justify-center">
                            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
                                <CalendarDays size={28} />
                            </div>
                            <h4 className="text-sm font-black text-slate-700">Tidak Ada Kegiatan</h4>
                            <p className="text-xs text-slate-400 mt-1 max-w-sm">
                                Tidak ada agenda kegiatan yang tercatat untuk bulan {MONTH_NAMES[month - 1]} {year} sesuai filter yang dipilih.
                            </p>
                        </div>
                    ) : (
                        agendaDates.map((item) => {
                            const dateObj = new Date(item.year, item.month - 1, item.day);
                            const dayName = DAY_NAMES[(dateObj.getDay() + 6) % 7];
                            const isWeekend = [0, 6].includes(dateObj.getDay());

                            return (
                                <div
                                    key={item.dateStr}
                                    className="bg-white rounded-3xl p-4 lg:p-5 border border-slate-100 shadow-sm hover:shadow-md transition-all space-y-3"
                                >
                                    {/* Date Header */}
                                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center font-black ${
                                                isWeekend ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-ppm-blue/10 text-ppm-blue border border-ppm-blue/20'
                                            }`}>
                                                <span className="text-[10px] uppercase leading-none">{dayName.substring(0, 3)}</span>
                                                <span className="text-base leading-none mt-0.5">{item.day}</span>
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-black text-slate-800">
                                                    {dayName}, {item.day} {MONTH_NAMES[item.month - 1]} {item.year}
                                                </h4>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                                                    {item.activities.length} Kegiatan Terdaftar
                                                </p>
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => handleDateClick(item.dateStr)}
                                            className="px-3.5 py-1.5 rounded-xl bg-slate-50 hover:bg-ppm-blue hover:text-white text-slate-600 text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5"
                                        >
                                            Lihat Detail & Petugas &rarr;
                                        </button>
                                    </div>

                                    {/* Activity Cards List */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {item.activities.map((act: any) => {
                                            const pIds = act.petugas_ids ? String(act.petugas_ids).split(',').map(s => Number(s.trim())).filter(Boolean) : [];
                                            const officers = pIds.map(id => pegawaiMap.get(id)).filter(Boolean);

                                            return (
                                                <div
                                                    key={act.id}
                                                    className="p-3.5 rounded-2xl bg-slate-50/70 border border-slate-100 hover:border-ppm-blue/30 transition-all space-y-2 flex flex-col justify-between"
                                                >
                                                    <div>
                                                        <div className="flex items-center justify-between gap-2 mb-1.5">
                                                            <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 font-black text-[9px] uppercase tracking-wider">
                                                                {act.sesi || 'Pagi'}
                                                            </span>
                                                            <span className="text-[9px] font-bold text-slate-400 truncate">
                                                                {act.bidang_singkatan || act.bidang_nama || 'Semua Bidang'}
                                                            </span>
                                                        </div>

                                                        <div className="flex items-start justify-between gap-2">
                                                            <h5 className="text-xs font-black text-slate-800 line-clamp-2 leading-snug flex-1">
                                                                {act.nama_kegiatan}
                                                            </h5>
                                                            <div className="flex items-center gap-1 shrink-0">
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleOpenDetailKegiatan(act);
                                                                    }}
                                                                    className="p-1 rounded-md bg-blue-50 hover:bg-ppm-blue hover:text-white text-ppm-blue border border-blue-100 transition-all"
                                                                    title="Lihat Detail Kegiatan"
                                                                >
                                                                    <Eye size={11} />
                                                                </button>
                                                                <button
                                                                    disabled={!act.can_edit}
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        if (!act.can_edit) return;
                                                                        handleOpenEditKegiatan(act);
                                                                    }}
                                                                    className={`p-1 rounded-md border transition-all ${
                                                                        act.can_edit
                                                                            ? 'bg-amber-50 hover:bg-amber-500 hover:text-white text-amber-700 border-amber-200 cursor-pointer'
                                                                            : 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed opacity-40 hover:bg-slate-50 hover:text-slate-300'
                                                                    }`}
                                                                    title={act.can_edit ? "Edit Kegiatan" : "Anda tidak memiliki hak akses untuk mengedit kegiatan ini"}
                                                                >
                                                                    <Edit2 size={11} />
                                                                </button>
                                                            </div>
                                                        </div>

                                                        {act.keterangan && (
                                                            <p className="text-[10px] text-slate-500 line-clamp-2 mt-1 italic">
                                                                "{act.keterangan}"
                                                            </p>
                                                        )}
                                                    </div>

                                                    <div className="pt-2 border-t border-slate-200/50 flex items-center justify-between gap-2">
                                                        <div className="flex items-center gap-1 overflow-hidden flex-wrap">
                                                            <Users size={12} className="text-slate-400 shrink-0" />
                                                            {officers.length > 0 ? (
                                                                <div className="flex flex-wrap items-center gap-1">
                                                                    {officers.map((o: any, oIdx: number) => (
                                                                        <button
                                                                            key={o.id || oIdx}
                                                                            type="button"
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                setSelectedPetugasModal(o);
                                                                            }}
                                                                            className="text-[10px] font-bold text-slate-600 hover:text-ppm-blue hover:underline cursor-pointer transition-colors"
                                                                            title={`Lihat Biodata / Profil ${o.nama_lengkap}`}
                                                                        >
                                                                            {o.nama_lengkap.split(' ')[0]}{oIdx < officers.length - 1 ? ',' : ''}
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            ) : (
                                                                <span className="text-[10px] font-bold text-slate-400">Belum ada personil</span>
                                                            )}
                                                        </div>

                                                        {onNavigateToDaftar && (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    onNavigateToDaftar(act.id, act.nama_kegiatan);
                                                                }}
                                                                className="shrink-0 p-1.5 rounded-lg bg-white hover:bg-ppm-blue hover:text-white text-slate-500 shadow-2xs transition-colors"
                                                                title="Buka di Daftar Kegiatan"
                                                            >
                                                                <ExternalLink size={12} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            )}

            {/* MODAL DETAIL TANGGAL DENGAN PANEL BARU DAFTAR PETUGAS DI SEBELAH KANAN */}
            {isDetailModalOpen && (
                <div className="fixed inset-0 z-[2000] flex items-center justify-center p-2 sm:p-4">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200"
                        onClick={() => setIsDetailModalOpen(false)}
                    />

                    {/* Modal Card - Lebar 6XL / 7XL Split 2 Kolom Clean Dashboard Style */}
                    <div className="relative bg-white w-full max-w-6xl max-h-[92vh] rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col z-10 border border-slate-100">
                        {/* Header Modal */}
                        <div className="px-6 py-5 bg-white border-b border-slate-100 flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-3.5">
                                <div className="w-11 h-11 rounded-2xl bg-ppm-blue/10 text-ppm-blue flex items-center justify-center shrink-0">
                                    <Calendar size={22} />
                                </div>
                                <div>
                                    <span className="text-[10px] font-bold text-ppm-blue uppercase tracking-widest block mb-0.5">
                                        Rekap Jadwal & Personil Harian
                                    </span>
                                    <h3 className="text-base sm:text-lg font-black text-slate-800 tracking-tight leading-none">
                                        {formattedSelectedDate}
                                    </h3>
                                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-[11px] font-bold text-slate-500 mt-1">
                                        <span className="flex items-center gap-1 text-ppm-blue">
                                            <Sparkles size={12} /> {selectedDateActivities.length} Kegiatan
                                        </span>
                                        <span>&bull;</span>
                                        <span className="flex items-center gap-1 text-emerald-600">
                                            <UserCheck size={12} /> {busyOfficers.length} Bertugas
                                        </span>
                                        <span>&bull;</span>
                                        <span className="flex items-center gap-1 text-amber-600">
                                            <UserX size={12} /> {freeOfficers.length} Belum Memiliki Kegiatan
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={() => setIsDetailModalOpen(false)}
                                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-xl transition-all cursor-pointer"
                                title="Tutup"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Body - Split 2 Kolom Clean (Kiri: Daftar Kegiatan, Kanan: Panel Petugas) */}
                        <div className="flex-1 overflow-hidden flex flex-col lg:flex-row min-h-0">
                            {/* KOLOM KIRI: DAFTAR KEGIATAN */}
                            <div className="w-full lg:w-[57%] overflow-y-auto custom-scrollbar p-5 sm:p-6 space-y-4">
                                <div className="flex items-center justify-between pb-1">
                                    <div>
                                        <span className="text-[10px] font-bold text-ppm-blue uppercase tracking-widest block">Agenda Kegiatan</span>
                                        <h4 className="text-sm font-black text-slate-800 tracking-tight">
                                            {selectedDateActivities.length} Kegiatan Terdaftar
                                        </h4>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={handleOpenAddKegiatan}
                                            className="text-[11px] font-bold text-white bg-ppm-blue hover:bg-blue-600 flex items-center gap-1.5 px-3 py-1.5 rounded-xl shadow-xs transition-all cursor-pointer active:scale-95"
                                            title="Tambah Kegiatan Baru di Tanggal Ini"
                                        >
                                            <Plus size={13} />
                                            <span>Tambah Kegiatan</span>
                                        </button>
                                        {selectedDateActivities.length > 0 && onNavigateToDaftar && (
                                            <button
                                                onClick={() => {
                                                    setIsDetailModalOpen(false);
                                                    onNavigateToDaftar();
                                                }}
                                                className="text-[11px] font-bold text-ppm-blue hover:underline flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-blue-50 transition-colors cursor-pointer"
                                                title="Buka kegiatan di Daftar Kegiatan"
                                            >
                                                <span>Buka di Daftar Kegiatan</span>
                                                <ExternalLink size={12} />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {selectedDateActivities.length === 0 ? (
                                    <div className="text-center py-16 space-y-3 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                                        <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mx-auto">
                                            <CalendarDays size={24} />
                                        </div>
                                        <h5 className="text-sm font-black text-slate-700">Tidak Ada Kegiatan</h5>
                                        <p className="text-xs text-slate-400 max-w-xs mx-auto">
                                            Belum ada jadwal kegiatan pada tanggal ini untuk {currentBidangName}.
                                        </p>
                                        <div className="flex flex-wrap items-center justify-center gap-2.5 mt-2">
                                            <button
                                                onClick={handleOpenAddKegiatan}
                                                className="px-4 py-2 bg-ppm-blue hover:bg-blue-600 text-white rounded-xl text-xs font-black shadow-md shadow-blue-500/20 hover:shadow-blue-500/30 transition-all inline-flex items-center gap-1.5 cursor-pointer active:scale-95"
                                            >
                                                <Plus size={14} />
                                                <span>Tambah Kegiatan</span>
                                            </button>
                                            {onNavigateToDaftar && (
                                                <button
                                                    onClick={() => {
                                                        setIsDetailModalOpen(false);
                                                        onNavigateToDaftar();
                                                    }}
                                                    className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-black shadow-xs border border-slate-200/80 transition-all inline-flex items-center gap-1.5 cursor-pointer active:scale-95"
                                                >
                                                    <ExternalLink size={13} />
                                                    <span>Buka Daftar Kegiatan</span>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-3.5">
                                        {selectedDateActivities.map((act: any, idx: number) => {
                                            const pIds = act.petugas_ids ? String(act.petugas_ids).split(',').map(s => Number(s.trim())).filter(Boolean) : [];
                                            const assignedOfficers = pIds.map(id => pegawaiMap.get(id)).filter(Boolean);

                                            const docs: any[] = Array.isArray(act.dokumen) ? act.dokumen : (
                                                typeof act.dokumen === 'string' ? JSON.parse(act.dokumen) : []
                                            );

                                            return (
                                                <div
                                                    key={act.id || idx}
                                                    className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition-all space-y-3.5"
                                                >
                                                    {/* Top Badges & Ghost Action Buttons */}
                                                    <div className="flex items-center justify-between gap-2">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <span className="px-2.5 py-0.5 rounded-md bg-blue-50 text-ppm-blue font-extrabold text-[10px] uppercase tracking-wider">
                                                                {act.sesi || 'Pagi'}
                                                            </span>
                                                            {act.jenis_kegiatan_nama && (
                                                                <span className="px-2.5 py-0.5 rounded-md bg-purple-50 text-purple-700 font-extrabold text-[10px] uppercase tracking-wider">
                                                                    {act.jenis_kegiatan_nama}
                                                                </span>
                                                            )}
                                                            <span className="text-[11px] font-medium text-slate-400 truncate max-w-[200px]">
                                                                {act.instansi_penyelenggara || act.bidang_nama || 'Penyelenggara'}
                                                            </span>
                                                        </div>

                                                        {/* Action Buttons: Ghost Style (Clean & Borderless) */}
                                                        <div className="flex items-center gap-1 shrink-0">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleOpenDetailKegiatan(act);
                                                                }}
                                                                className="p-1.5 rounded-lg text-slate-400 hover:text-ppm-blue hover:bg-blue-50 transition-all cursor-pointer"
                                                                title="Lihat Detail Informasi Kegiatan"
                                                            >
                                                                {fetchingDetailId === act.id ? (
                                                                    <Loader2 size={15} className="animate-spin text-ppm-blue" />
                                                                ) : (
                                                                    <Eye size={15} />
                                                                )}
                                                            </button>
                                                            <button
                                                                disabled={!act.can_edit}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    if (!act.can_edit) return;
                                                                    handleOpenEditKegiatan(act);
                                                                }}
                                                                className={`p-1.5 rounded-lg transition-all ${
                                                                    act.can_edit
                                                                        ? 'text-slate-400 hover:text-amber-600 hover:bg-amber-50 cursor-pointer'
                                                                        : 'text-slate-300 cursor-not-allowed opacity-40 hover:bg-transparent'
                                                                }`}
                                                                title={act.can_edit ? "Edit Kegiatan" : "Anda tidak memiliki hak akses untuk mengedit kegiatan ini"}
                                                            >
                                                                <Edit2 size={15} />
                                                            </button>
                                                            {onNavigateToDaftar && (
                                                                <button
                                                                    onClick={() => {
                                                                        setIsDetailModalOpen(false);
                                                                        onNavigateToDaftar(act.id, act.nama_kegiatan);
                                                                    }}
                                                                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
                                                                    title="Buka kegiatan ini di Daftar Kegiatan"
                                                                >
                                                                    <ExternalLink size={15} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Activity Title */}
                                                    <h5 className="text-sm font-black text-slate-800 leading-snug">
                                                        {act.nama_kegiatan}
                                                    </h5>

                                                    {/* Notes / Keterangan (Border-free clean background) */}
                                                    {act.keterangan && (
                                                        <p className="text-xs text-slate-600 leading-relaxed font-medium bg-slate-50/70 p-3 rounded-xl whitespace-pre-wrap">
                                                            {act.keterangan}
                                                        </p>
                                                    )}

                                                    {/* Documents (clean borderless pills) */}
                                                    {docs && docs.length > 0 && (
                                                        <div className="space-y-1.5">
                                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                                                                Dokumen Lampiran ({docs.length})
                                                            </span>
                                                            <div className="flex flex-wrap gap-1.5">
                                                                {docs.map((doc: any, dIdx: number) => {
                                                                    const category = DOCUMENT_CATEGORIES.find(c => c.id === doc.tipe_dokumen);
                                                                    return (
                                                                        <button
                                                                            key={doc.id || dIdx}
                                                                            onClick={() => setViewedDoc({
                                                                                path: doc.path,
                                                                                name: doc.nama_file,
                                                                                kegiatan_id: act.id,
                                                                                dokumen_id: doc.dokumen_id || doc.id,
                                                                                is_private: doc.is_private,
                                                                                uploaded_by: doc.uploaded_by
                                                                            })}
                                                                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100/70 hover:bg-ppm-blue hover:text-white text-slate-700 text-[10px] font-medium transition-colors cursor-pointer"
                                                                            title="Lihat dokumen"
                                                                        >
                                                                            {category ? category.icon : <FileText size={11} />}
                                                                            <span className="truncate max-w-[140px]">{doc.nama_file}</span>
                                                                            <Eye size={10} className="opacity-60" />
                                                                        </button>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Officers (clean borderless chips) */}
                                                    <div className="flex items-center justify-between text-xs pt-1 gap-2">
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 shrink-0">
                                                            <Users size={12} className="text-ppm-blue" />
                                                            Petugas:
                                                        </span>
                                                        <div className="flex flex-wrap gap-1.5 items-center justify-end">
                                                            {assignedOfficers.length > 0 ? (
                                                                assignedOfficers.map((o: any, oIdx: number) => (
                                                                    <button
                                                                        key={o.id || oIdx}
                                                                        type="button"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setSelectedPetugasModal(o);
                                                                        }}
                                                                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100/80 hover:bg-ppm-blue hover:text-white text-slate-700 text-[10px] font-bold transition-colors cursor-pointer"
                                                                        title={`Lihat Biodata / Profil ${o.nama_lengkap}`}
                                                                    >
                                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                                                        <span className="truncate max-w-[130px]">{o.nama_lengkap.split(' ')[0]}</span>
                                                                    </button>
                                                                ))
                                                            ) : (
                                                                <span className="text-[11px] text-slate-400 italic">Belum ada</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* KOLOM KANAN: PANEL STATUS PETUGAS (Clean Dashboard Style) */}
                            <div className="w-full lg:w-[43%] bg-slate-50/50 p-5 sm:p-6 flex flex-col overflow-hidden border-t lg:border-t-0 lg:border-l border-slate-100">
                                {/* Panel Header & Sub-title */}
                                <div className="space-y-3 pb-3 shrink-0">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <span className="text-[10px] font-bold text-ppm-blue uppercase tracking-widest block">Status Personil</span>
                                            <h4 className="text-sm font-black text-slate-800 tracking-tight">
                                                {currentBidangName}
                                            </h4>
                                        </div>
                                        <span className="text-[10px] font-bold text-slate-500 bg-white px-2.5 py-1 rounded-full shadow-2xs">
                                            {targetOfficers.length} Pegawai
                                        </span>
                                    </div>

                                    {/* Tabs Filter: Clean Segmented Control */}
                                    <div className="flex items-center p-1 bg-slate-200/60 rounded-xl gap-1">
                                        <button
                                            onClick={() => setPetugasFilterTab('all')}
                                            className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
                                                petugasFilterTab === 'all'
                                                    ? 'bg-white text-slate-800 shadow-xs font-black'
                                                    : 'text-slate-500 hover:text-slate-800'
                                            }`}
                                        >
                                            <span>Semua</span>
                                            <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-full ${
                                                petugasFilterTab === 'all' ? 'bg-slate-100 text-slate-700' : 'bg-slate-300/50 text-slate-500'
                                            }`}>
                                                {targetOfficers.length}
                                            </span>
                                        </button>
                                        <button
                                            onClick={() => setPetugasFilterTab('bertugas')}
                                            className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
                                                petugasFilterTab === 'bertugas'
                                                    ? 'bg-white text-emerald-700 shadow-xs font-black ring-1 ring-emerald-500/20'
                                                    : 'text-slate-500 hover:text-emerald-700'
                                            }`}
                                        >
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                                            <span>Bertugas</span>
                                            <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-full ${
                                                petugasFilterTab === 'bertugas' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-300/50 text-slate-500'
                                            }`}>
                                                {busyOfficers.length}
                                            </span>
                                        </button>
                                        <button
                                            onClick={() => setPetugasFilterTab('free')}
                                            className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
                                                petugasFilterTab === 'free'
                                                    ? 'bg-white text-amber-700 shadow-xs font-black ring-1 ring-amber-500/20'
                                                    : 'text-slate-500 hover:text-amber-700'
                                            }`}
                                        >
                                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0"></span>
                                            <span>Belum Ada Kegiatan</span>
                                            <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-full ${
                                                petugasFilterTab === 'free' ? 'bg-amber-50 text-amber-700' : 'bg-slate-300/50 text-slate-500'
                                            }`}>
                                                {freeOfficers.length}
                                            </span>
                                        </button>
                                    </div>

                                    {/* Quick Search Officer: Clean search bar without harsh border */}
                                    <div className="relative">
                                        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input
                                            type="text"
                                            value={petugasSearch}
                                            onChange={(e) => setPetugasSearch(e.target.value)}
                                            placeholder="Cari nama pegawai..."
                                            className="w-full bg-white rounded-xl pl-8 pr-7 py-1.5 text-xs font-medium text-slate-700 placeholder-slate-400 outline-none shadow-2xs focus:ring-2 focus:ring-ppm-blue/30 transition-all border-0"
                                        />
                                        {petugasSearch && (
                                            <button
                                                onClick={() => setPetugasSearch('')}
                                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                                            >
                                                <X size={12} />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Officer List Scrollable */}
                                <div className="flex-1 overflow-y-auto custom-scrollbar pt-1 space-y-3">
                                    {((petugasFilterTab === 'all' && filteredBusyOfficers.length === 0 && filteredFreeOfficers.length === 0) ||
                                      (petugasFilterTab === 'bertugas' && filteredBusyOfficers.length === 0) ||
                                      (petugasFilterTab === 'free' && filteredFreeOfficers.length === 0)) ? (
                                        <div className="text-center py-12 space-y-2">
                                            <div className="w-10 h-10 rounded-xl bg-slate-200/50 flex items-center justify-center text-slate-400 mx-auto">
                                                <Users size={18} />
                                            </div>
                                            <p className="text-xs font-semibold text-slate-400">
                                                {petugasSearch ? `Tidak ada pegawai yang sesuai dengan "${petugasSearch}"` : 'Tidak ada pegawai yang sesuai filter'}
                                            </p>
                                        </div>
                                    ) : (
                                        <>
                                            {/* Section 1: Petugas Bertugas (shown on tab 'all' and 'bertugas') */}
                                            {(petugasFilterTab === 'all' || petugasFilterTab === 'bertugas') && filteredBusyOfficers.length > 0 && (
                                                <div className="space-y-1.5">
                                                    {petugasFilterTab === 'all' && (
                                                        <div className="flex items-center justify-between px-3 py-1.5 bg-emerald-50/70 border border-emerald-100/70 rounded-xl">
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                                                <span className="text-[11px] font-extrabold text-emerald-800 tracking-wide uppercase">
                                                                    Petugas Bertugas
                                                                </span>
                                                            </div>
                                                            <span className="text-[10px] font-black text-emerald-700 bg-white px-2 py-0.5 rounded-full shadow-2xs">
                                                                {filteredBusyOfficers.length} Pegawai
                                                            </span>
                                                        </div>
                                                    )}
                                                    <div className="divide-y divide-slate-100 bg-white rounded-2xl border border-slate-100 shadow-2xs overflow-hidden">
                                                        {filteredBusyOfficers.map(({ pegawai, activities: actList }) => (
                                                            <div
                                                                key={pegawai.id}
                                                                className="p-3.5 hover:bg-slate-50/60 transition-colors flex items-start justify-between gap-3"
                                                            >
                                                                <div className="flex items-start gap-3 min-w-0 flex-1">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setSelectedPetugasModal(pegawai)}
                                                                        className="w-8 h-8 rounded-full flex items-center justify-center font-black text-xs shrink-0 cursor-pointer hover:scale-105 active:scale-95 transition-all mt-0.5 bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200/60"
                                                                        title={`Lihat Biodata / Profil ${pegawai.nama_lengkap}`}
                                                                    >
                                                                        {pegawai.nama_lengkap ? pegawai.nama_lengkap.charAt(0).toUpperCase() : 'P'}
                                                                    </button>

                                                                    <div className="min-w-0 flex-1">
                                                                        <div className="flex items-center gap-1.5">
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => setSelectedPetugasModal(pegawai)}
                                                                                className="text-xs font-extrabold text-slate-800 hover:text-ppm-blue hover:underline truncate leading-tight text-left cursor-pointer transition-colors block"
                                                                                title={`Lihat Biodata / Profil ${pegawai.nama_lengkap}`}
                                                                            >
                                                                                {pegawai.nama_lengkap}
                                                                            </button>
                                                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" title="Sedang bertugas"></span>
                                                                        </div>
                                                                        <span className="text-[10px] text-slate-400 block mt-0.5 font-medium truncate">
                                                                            {pegawai.jabatan || pegawai.bidang_singkatan || 'Pegawai'}
                                                                        </span>

                                                                        {/* List Kegiatan yang Ditugaskan */}
                                                                        <div className="mt-2 space-y-1">
                                                                            {actList.map((a: any, aIdx: number) => (
                                                                                <div
                                                                                    key={aIdx}
                                                                                    className="flex items-center justify-between gap-2 p-1.5 px-2 rounded-lg bg-slate-50/80 hover:bg-slate-100/90 transition-colors group/act border border-slate-100"
                                                                                >
                                                                                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                                                                        <span className="text-[9px] font-extrabold text-ppm-blue shrink-0 uppercase tracking-tight">[{a.sesi || 'Pagi'}]</span>
                                                                                        <span className="truncate text-[11px] font-bold text-slate-700" title={a.nama_kegiatan}>
                                                                                            {a.nama_kegiatan}
                                                                                        </span>
                                                                                    </div>
                                                                                    <div className="flex items-center gap-0.5 shrink-0 opacity-70 group-hover/act:opacity-100 transition-opacity">
                                                                                        <button
                                                                                            onClick={(e) => {
                                                                                                e.stopPropagation();
                                                                                                handleOpenDetailKegiatan(a);
                                                                                            }}
                                                                                            className="p-1 rounded-md text-slate-400 hover:text-ppm-blue hover:bg-blue-50 transition-colors cursor-pointer"
                                                                                            title="Lihat Detail Kegiatan"
                                                                                        >
                                                                                            <Eye size={12} />
                                                                                        </button>
                                                                                        <button
                                                                                            disabled={!a.can_edit}
                                                                                            onClick={(e) => {
                                                                                                e.stopPropagation();
                                                                                                if (!a.can_edit) return;
                                                                                                handleOpenEditKegiatan(a);
                                                                                            }}
                                                                                            className={`p-1 rounded-md transition-colors ${
                                                                                                a.can_edit
                                                                                                    ? 'text-slate-400 hover:text-amber-600 hover:bg-amber-50 cursor-pointer'
                                                                                                    : 'text-slate-300 cursor-not-allowed opacity-40 hover:bg-transparent'
                                                                                            }`}
                                                                                            title={a.can_edit ? "Edit Kegiatan" : "Anda tidak memiliki hak akses untuk mengedit kegiatan ini"}
                                                                                        >
                                                                                            <Edit2 size={12} />
                                                                                        </button>
                                                                                    </div>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                {/* Right: Logbook Button */}
                                                                {onNavigateToLogbook && (
                                                                    <button
                                                                        onClick={() => {
                                                                            setIsDetailModalOpen(false);
                                                                            onNavigateToLogbook(pegawai.id, selectedDateStr || undefined);
                                                                        }}
                                                                        className="shrink-0 p-1.5 px-2.5 rounded-lg bg-slate-100 hover:bg-ppm-blue hover:text-white text-slate-600 text-[10px] font-bold transition-all cursor-pointer"
                                                                        title={`Lihat Logbook ${pegawai.nama_lengkap}`}
                                                                    >
                                                                        <BookOpen size={11} className="inline mr-1" />
                                                                        Logbook
                                                                    </button>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Section 2: Belum Memiliki Kegiatan (shown on tab 'all' and 'free') */}
                                            {(petugasFilterTab === 'all' || petugasFilterTab === 'free') && filteredFreeOfficers.length > 0 && (
                                                <div className="space-y-1.5">
                                                    {petugasFilterTab === 'all' && (
                                                        <div className="flex items-center justify-between px-3 py-1.5 bg-amber-50/70 border border-amber-100/70 rounded-xl">
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                                                                <span className="text-[11px] font-extrabold text-amber-800 tracking-wide uppercase">
                                                                    Belum Memiliki Kegiatan
                                                                </span>
                                                            </div>
                                                            <span className="text-[10px] font-black text-amber-700 bg-white px-2 py-0.5 rounded-full shadow-2xs">
                                                                {filteredFreeOfficers.length} Pegawai
                                                            </span>
                                                        </div>
                                                    )}
                                                    <div className="divide-y divide-slate-100 bg-white rounded-2xl border border-slate-100 shadow-2xs overflow-hidden">
                                                        {filteredFreeOfficers.map(({ pegawai }) => (
                                                            <div
                                                                key={pegawai.id}
                                                                className="p-3.5 hover:bg-slate-50/60 transition-colors flex items-start justify-between gap-3"
                                                            >
                                                                <div className="flex items-start gap-3 min-w-0 flex-1">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setSelectedPetugasModal(pegawai)}
                                                                        className="w-8 h-8 rounded-full flex items-center justify-center font-black text-xs shrink-0 cursor-pointer hover:scale-105 active:scale-95 transition-all mt-0.5 bg-slate-100 text-slate-500"
                                                                        title={`Lihat Biodata / Profil ${pegawai.nama_lengkap}`}
                                                                    >
                                                                        {pegawai.nama_lengkap ? pegawai.nama_lengkap.charAt(0).toUpperCase() : 'P'}
                                                                    </button>

                                                                    <div className="min-w-0 flex-1">
                                                                        <div className="flex items-center gap-1.5">
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => setSelectedPetugasModal(pegawai)}
                                                                                className="text-xs font-extrabold text-slate-800 hover:text-ppm-blue hover:underline truncate leading-tight text-left cursor-pointer transition-colors block"
                                                                                title={`Lihat Biodata / Profil ${pegawai.nama_lengkap}`}
                                                                            >
                                                                                {pegawai.nama_lengkap}
                                                                            </button>
                                                                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" title="Belum ada kegiatan"></span>
                                                                        </div>
                                                                        <span className="text-[10px] text-slate-400 block mt-0.5 font-medium truncate">
                                                                            {pegawai.jabatan || pegawai.bidang_singkatan || 'Pegawai'}
                                                                        </span>
                                                                        <div className="mt-1">
                                                                            <span className="text-[10px] font-medium text-slate-400 italic">
                                                                                Belum ada kegiatan
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                {/* Right: Logbook Button */}
                                                                {onNavigateToLogbook && (
                                                                    <button
                                                                        onClick={() => {
                                                                            setIsDetailModalOpen(false);
                                                                            onNavigateToLogbook(pegawai.id, selectedDateStr || undefined);
                                                                        }}
                                                                        className="shrink-0 p-1.5 px-2.5 rounded-lg bg-slate-100 hover:bg-ppm-blue hover:text-white text-slate-600 text-[10px] font-bold transition-all cursor-pointer"
                                                                        title={`Lihat Logbook ${pegawai.nama_lengkap}`}
                                                                    >
                                                                        <BookOpen size={11} className="inline mr-1" />
                                                                        Logbook
                                                                    </button>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="px-6 py-4 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between shrink-0">
                            <span className="text-[10px] font-medium text-slate-400 hidden sm:inline">
                                Tip: Klik icon <b>Mata</b> untuk melihat rincian informasi, dan icon <b>Pensil</b> untuk mengubah data kegiatan.
                            </span>
                            <button
                                onClick={() => setIsDetailModalOpen(false)}
                                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-black transition-colors ml-auto cursor-pointer"
                            >
                                Tutup
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL DETAIL INFORMASI KEGIATAN (SEPERTI DI DASHBOARD UTAMA) */}
            {isDetailActivityOpen && detailActivity && (
                <div className="fixed inset-0 z-[2200] flex items-center justify-center p-3 sm:p-6 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
                    <div className="bg-white rounded-[2rem] max-w-5xl w-full shadow-2xl border border-slate-100/90 overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
                        {/* Header */}
                        <div className="px-6 py-5 bg-white border-b border-slate-100 flex items-center justify-between shrink-0">
                            <div>
                                <span className="text-[10px] font-bold text-ppm-blue uppercase tracking-widest block mb-0.5">Detail Informasi Kegiatan</span>
                                <h3 className="text-base sm:text-lg font-black text-slate-800 tracking-tight leading-none uppercase">
                                    {detailActivity.jenis_kegiatan_nama || 'Kegiatan'}
                                </h3>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    disabled={!detailActivity.can_edit}
                                    onClick={() => {
                                        if (!detailActivity.can_edit) return;
                                        setIsDetailActivityOpen(false);
                                        handleOpenEditKegiatan(detailActivity);
                                    }}
                                    className={`p-2 rounded-xl transition-all flex items-center gap-1.5 text-xs font-bold border ${
                                        detailActivity.can_edit
                                            ? 'text-amber-600 hover:text-amber-700 hover:bg-amber-50 border-amber-200/80 cursor-pointer'
                                            : 'text-slate-300 border-slate-100 cursor-not-allowed opacity-40 hover:bg-transparent'
                                    }`}
                                    title={detailActivity.can_edit ? "Edit Kegiatan Ini" : "Anda tidak memiliki hak akses untuk mengedit kegiatan ini"}
                                >
                                    <Edit2 size={14} />
                                    <span>Edit</span>
                                </button>
                                <button 
                                    onClick={() => setIsDetailActivityOpen(false)}
                                    className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-xl transition-all cursor-pointer"
                                    title="Tutup"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                        </div>

                        {/* Body Modal Detail */}
                        <div className="p-6 sm:p-8 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 sm:gap-8">
                                {/* Left Column: Info Utama */}
                                <div className="md:col-span-7 space-y-5">
                                    {/* Nama Kegiatan */}
                                    <div className="space-y-1">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Nama Kegiatan</span>
                                        <h4 className="text-base font-black text-slate-800 leading-snug">
                                            {detailActivity.nama_kegiatan}
                                        </h4>
                                    </div>

                                    {/* Metadata Grid */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-4">
                                        {/* Tanggal Pelaksanaan */}
                                        <div className="flex flex-col justify-start">
                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Tanggal Pelaksanaan</span>
                                            <span className="text-xs font-extrabold text-slate-700 mt-1 flex items-center gap-1.5">
                                                <CalendarDays size={13} className="text-ppm-blue shrink-0" />
                                                <span>
                                                    {formatDetailDate(detailActivity.tanggal)}
                                                    {detailActivity.tanggal_akhir && detailActivity.tanggal_akhir !== detailActivity.tanggal && (
                                                        <> s.d {formatDetailDate(detailActivity.tanggal_akhir)}</>
                                                    )}
                                                </span>
                                            </span>
                                        </div>

                                        {/* Sesi Waktu */}
                                        <div className="flex flex-col justify-start">
                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Sesi Waktu</span>
                                            <span className="text-xs font-extrabold text-slate-700 mt-1 flex items-center gap-1.5">
                                                <Clock size={13} className="text-ppm-blue shrink-0" />
                                                <span>{detailActivity.sesi || 'Pagi'}</span>
                                            </span>
                                        </div>

                                        {/* Penyelenggara / Instansi */}
                                        <div className="flex flex-col justify-start sm:col-span-2">
                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Penyelenggara / Instansi</span>
                                            <span className="text-xs font-extrabold text-slate-700 mt-1 flex items-center gap-1.5">
                                                <Building2 size={13} className="text-ppm-blue shrink-0" />
                                                <span>{detailActivity.instansi_penyelenggara || detailActivity.bidang_nama || 'Instansi Terdaftar'}</span>
                                            </span>
                                        </div>

                                        {/* Bidang Pelaksana */}
                                        <div className="flex flex-col justify-start sm:col-span-2">
                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Bidang Pelaksana</span>
                                            <div className="flex flex-wrap gap-1 mt-1">
                                                {detailResolvedBidangs.length > 0 ? detailResolvedBidangs.map((b, idx) => (
                                                    <span key={idx} className="px-2 py-0.5 rounded bg-blue-50 text-ppm-blue text-[10px] font-extrabold uppercase border border-blue-100">
                                                        {b}
                                                    </span>
                                                )) : (
                                                    <span className="text-xs font-semibold text-slate-500">Umum / Semua Bidang</span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Tematik Strategis */}
                                        {detailResolvedTematiks.length > 0 && (
                                            <div className="flex flex-col sm:col-span-2">
                                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Tematik Strategis</span>
                                                <div className="flex flex-wrap gap-1 mt-1">
                                                    {detailResolvedTematiks.map((t, idx) => (
                                                        <span key={idx} className="px-2 py-0.5 rounded bg-purple-50 text-purple-700 text-[10px] font-extrabold border border-purple-100">
                                                            {t}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Keterangan */}
                                    <div className="space-y-1">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Catatan / Keterangan</span>
                                        <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap font-medium bg-slate-50 p-3 rounded-2xl border border-slate-100">
                                            {detailActivity.keterangan || 'Tidak ada keterangan tambahan.'}
                                        </p>
                                    </div>
                                </div>

                                {/* Right Column: Petugas & Dokumen */}
                                <div className="md:col-span-5 space-y-5">
                                    {/* Petugas Terlibat */}
                                    <div className="space-y-2">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                            Petugas Terlibat ({detailResolvedPetugas.length})
                                        </span>
                                        <div className="max-h-56 overflow-y-auto custom-scrollbar pr-1">
                                            {detailResolvedPetugas.length > 0 ? (
                                                <div className="divide-y divide-slate-100 bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-2xs">
                                                    {detailResolvedPetugas.map((p, idx) => (
                                                        <div 
                                                            key={idx} 
                                                            className="p-2.5 hover:bg-slate-50 flex items-start justify-between gap-2.5 transition-colors"
                                                        >
                                                            <div 
                                                                onClick={() => setSelectedPetugasModal(p)}
                                                                className="flex items-start gap-2 min-w-0 cursor-pointer group flex-1"
                                                                title={`Lihat Biodata / Profil ${p.nama || p.nama_lengkap}`}
                                                            >
                                                                <div className="w-7 h-7 rounded-full bg-blue-100 text-ppm-blue group-hover:bg-ppm-blue group-hover:text-white flex items-center justify-center font-black text-[10px] shrink-0 mt-0.5 transition-colors">
                                                                    {(p.nama || p.nama_lengkap || 'P').charAt(0).toUpperCase()}
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <span className="font-extrabold text-slate-800 text-xs block leading-tight truncate group-hover:text-ppm-blue group-hover:underline transition-colors">
                                                                        {p.nama || p.nama_lengkap}
                                                                    </span>
                                                                    <span className="text-[9px] text-slate-400 block mt-0.5 font-semibold">NIP. {p.nip || '-'}</span>
                                                                    <span className="text-[9px] text-ppm-blue font-bold block">{p.jabatan}</span>
                                                                </div>
                                                            </div>

                                                            {onNavigateToLogbook && (
                                                                <button
                                                                    onClick={() => {
                                                                        setIsDetailActivityOpen(false);
                                                                        setIsDetailModalOpen(false);
                                                                        onNavigateToLogbook(p.id, selectedDateStr || undefined);
                                                                    }}
                                                                    className="shrink-0 p-1 px-2 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white text-[8px] font-black uppercase tracking-wider border border-emerald-200 transition-all"
                                                                    title="Buka Logbook Pegawai"
                                                                >
                                                                    Logbook
                                                                </button>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="text-center p-3 text-slate-400 text-xs italic bg-slate-50 rounded-xl border border-slate-100">
                                                    Belum ada petugas ditugaskan.
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Dokumen Terlampir */}
                                    <div className="space-y-2 pt-3 border-t border-slate-100">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                            Dokumen Lampiran ({detailActivity.dokumen?.length || 0})
                                        </span>
                                        <div className="max-h-56 overflow-y-auto custom-scrollbar pr-1">
                                            {detailActivity.dokumen && detailActivity.dokumen.length > 0 ? (
                                                <div className="divide-y divide-slate-100 bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-2xs">
                                                    {detailActivity.dokumen.map((doc: any) => (
                                                        <div 
                                                            key={doc.id}
                                                            className="p-2.5 hover:bg-slate-50 flex items-center justify-between gap-2.5 transition-colors"
                                                        >
                                                            <div className="flex items-center gap-2 min-w-0 flex-1">
                                                                <div className="w-7 h-7 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                                                                    <FileText size={14} />
                                                                </div>
                                                                <div className="min-w-0 flex-1">
                                                                    <span className="font-bold text-slate-800 text-xs block truncate leading-tight" title={doc.nama_file}>
                                                                        {doc.nama_file}
                                                                    </span>
                                                                    <span className="px-1.5 py-0.2 rounded text-[8px] font-bold uppercase tracking-wider bg-slate-100 text-slate-500 mt-0.5 inline-block">
                                                                        {doc.tipe_dokumen?.replace(/_/g, ' ') || 'Dokumen'}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            <button
                                                                onClick={() => {
                                                                    setViewedDoc({
                                                                        path: doc.path,
                                                                        name: doc.nama_file,
                                                                        kegiatan_id: detailActivity.id,
                                                                        dokumen_id: doc.dokumen_id || doc.id,
                                                                        is_private: doc.is_private,
                                                                        uploaded_by: doc.uploaded_by
                                                                    });
                                                                }}
                                                                className="shrink-0 p-1.5 rounded-lg bg-slate-100 hover:bg-ppm-blue hover:text-white text-slate-600 transition-colors"
                                                                title="Lihat Pratinjau Dokumen"
                                                            >
                                                                <Eye size={12} />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="text-center p-3 text-slate-400 text-xs italic bg-slate-50 rounded-xl border border-slate-100">
                                                    Tidak ada dokumen terlampir.
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end shrink-0">
                            <button
                                onClick={() => setIsDetailActivityOpen(false)}
                                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-black transition-colors"
                            >
                                Tutup
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL EDIT KEGIATAN (ActivityFormModal) */}
            {isEditModalOpen && (
                <ActivityFormModal 
                    isOpen={isEditModalOpen}
                    onClose={() => {
                        setIsEditModalOpen(false);
                        setEditingActivity(null);
                    }}
                    onSuccess={handleEditSuccess}
                    editingActivity={editingActivity}
                    user={user}
                    masterData={{
                        jenisKegiatan: jenisList,
                        bidangList: bidangList,
                        tematikList: tematikList,
                        pegawaiList: pegawaiList,
                        masterInstansiDaerahList: masterInstansiDaerahList,
                        masterDokumenList: masterDokumenList
                    }}
                    mode="management"
                    zIndex={2500}
                    initialDate={selectedDateStr || undefined}
                    initialBidangId={selectedBidang !== 'all' ? selectedBidang : undefined}
                    onDelete={handleDeleteKegiatan}
                />
            )}

            {/* Document Viewer Modal */}
            <DocumentViewerModal
                isOpen={!!viewedDoc}
                onClose={() => setViewedDoc(null)}
                fileUrl={viewedDoc?.path}
                fileName={viewedDoc?.name}
                kegiatanId={viewedDoc?.kegiatan_id}
                dokumenId={viewedDoc?.dokumen_id}
                disableDownload={
                    viewedDoc?.is_private === 1 || viewedDoc?.is_private === true
                        ? viewedDoc?.uploaded_by !== user?.id
                        : false
                }
            />

            {/* Petugas Detail Modal (Biodata & CV Pegawai) */}
            <PetugasDetailModal
                isOpen={!!selectedPetugasModal}
                onClose={() => setSelectedPetugasModal(null)}
                pegawai={selectedPetugasModal}
            />
        </div>
    );
}
