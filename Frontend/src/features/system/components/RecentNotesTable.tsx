import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, Loader2, Clock, X, Building2, Layers, FileText, Eye, CalendarDays, FileEdit, Filter, ExternalLink, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { api } from '@/src/services/api';
import { useAuth } from '@/src/contexts/AuthContext';
import { DocumentViewerModal } from '@/src/components/modals/DocumentViewerModal';
import { ActivityFormModal } from '@/src/components/modals/ActivityFormModal';
import { PetugasDetailModal } from '@/src/components/modals/PetugasDetailModal';
import { toast } from 'react-hot-toast';

interface KegiatanDoc {
    id: number;
    nama_file: string;
    path: string;
    tipe_dokumen: string;
    dokumen_id: number | null;
    is_trash?: number;
}

interface KegiatanItem {
    id: number;
    tanggal: string;
    tanggal_akhir: string | null;
    nama_kegiatan: string;
    bidang_ids: string | null;
    bidang_singkatan: string | null;
    bidang_nama: string | null;
    instansi_penyelenggara: string | null;
    dokumen: KegiatanDoc[];
}

const RecentNotesTable = () => {
    const { user } = useAuth();
    const [activities, setActivities] = useState<KegiatanItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [scope, setScope] = useState<'bidang' | 'all'>('bidang');
    const [currentPage, setCurrentPage] = useState<number>(1);

    const [isMobile, setIsMobile] = useState(() => {
        if (typeof window === 'undefined') return false;
        return window.innerWidth < 640;
    });

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 640);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const itemsPerPage = isMobile ? 6 : 9;

    useEffect(() => {
        setCurrentPage(1);
    }, [scope, itemsPerPage]);

    const totalPages = Math.ceil(activities.length / itemsPerPage) || 1;
    const paginatedActivities = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return activities.slice(start, start + itemsPerPage);
    }, [activities, currentPage, itemsPerPage]);
    const [viewedDoc, setViewedDoc] = useState<{ path: string, name: string, is_private?: number | boolean, uploaded_by?: number, kegiatan_id?: number, dokumen_id?: number } | null>(null);
    const [masterInstansiDaerahList, setMasterInstansiDaerahList] = useState<any[]>([]);
    const [selectedActivity, setSelectedActivity] = useState<any | null>(null);
    const [pegawaiList, setPegawaiList] = useState<any[]>([]);
    const [tematikList, setTematikList] = useState<any[]>([]);
    const [urusanList, setUrusanList] = useState<any[]>([]);
    const [bidangList, setBidangList] = useState<any[]>([]);
    const [jenisKegiatanList, setJenisKegiatanList] = useState<any[]>([]);
    const [masterDokumenList, setMasterDokumenList] = useState<any[]>([]);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [notulensiSelectorActivity, setNotulensiSelectorActivity] = useState<KegiatanItem | null>(null);
    const [fetchingDetailId, setFetchingDetailId] = useState<number | null>(null);
    const [selectedPetugasDetail, setSelectedPetugasDetail] = useState<any | null>(null);

    const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
        if (typeof window === 'undefined') return true;
        if (window.innerWidth < 1280) return true;
        return localStorage.getItem('sidebar_collapsed') !== 'true';
    });

    useEffect(() => {
        const updateSidebarState = () => {
            if (window.innerWidth < 1280) {
                setIsSidebarOpen(true);
            } else {
                const collapsed = localStorage.getItem('sidebar_collapsed') === 'true';
                setIsSidebarOpen(!collapsed);
            }
        };

        const handleSidebarChange = (e: any) => {
            if (e?.detail?.isCollapsed !== undefined) {
                setIsSidebarOpen(!e.detail.isCollapsed || window.innerWidth < 1280);
            } else {
                updateSidebarState();
            }
        };

        window.addEventListener('sidebar-collapsed-change', handleSidebarChange);
        window.addEventListener('sidebar:expand', () => setIsSidebarOpen(true));
        window.addEventListener('resize', updateSidebarState);
        return () => {
            window.removeEventListener('sidebar-collapsed-change', handleSidebarChange);
            window.removeEventListener('sidebar:expand', () => setIsSidebarOpen(true));
            window.removeEventListener('resize', updateSidebarState);
        };
    }, []);

    const userBidangId = user?.bidang_id;
    const userBidangLabel = (user?.bidang_singkatan || user?.bidang_nama || 'Bidang Saya').toUpperCase();

    const [detailOptionsLoaded, setDetailOptionsLoaded] = useState(false);
    const [detailOptionsLoading, setDetailOptionsLoading] = useState(false);

    const loadDetailOptionsLazy = async () => {
        if (detailOptionsLoaded || detailOptionsLoading) return;
        setDetailOptionsLoading(true);
        try {
            const [resInst, resPegawai, resTematik, resUrusan, resBidang, resJenis, resDokumen] = await Promise.all([
                api.masterInstansiDaerah.getAll().catch(() => null),
                api.profilPegawai.getAll().catch(() => null),
                api.tematik.getAll().catch(() => null),
                api.bidangUrusan.getAll().catch(() => null),
                api.bidang.getAll().catch(() => null),
                api.masterDataConfig.getDataByTable('master_tipe_kegiatan').catch(() => null),
                api.masterDokumen.getAll().catch(() => null)
            ]);

            if (resInst && resInst.success) setMasterInstansiDaerahList(resInst.data || []);
            if (resPegawai && resPegawai.success) setPegawaiList(resPegawai.data || []);
            if (resTematik && resTematik.success) setTematikList(resTematik.data || []);
            if (resUrusan && resUrusan.success) setUrusanList(resUrusan.data || []);
            if (resBidang && resBidang.success) setBidangList(resBidang.data || []);
            if (resJenis && resJenis.success) setJenisKegiatanList(resJenis.data || []);
            if (resDokumen && resDokumen.success) setMasterDokumenList(resDokumen.data || []);

            setDetailOptionsLoaded(true);
        } catch (err) {
            console.error('Failed to load detail options lazily:', err);
        } finally {
            setDetailOptionsLoading(false);
        }
    };

    const refreshData = async () => {
        try {
            const params: any = {
                startDate: '',
                endDate: '',
                search: '',
                tematik: ''
            };
            if (scope === 'bidang' && userBidangId) {
                params.bidang = String(userBidangId);
            }
            const res = await api.kegiatanManajemen.getAll(params);
            if (res.success) {
                setActivities(res.data || []);
            }
            if (selectedActivity) {
                const resDetail = await api.kegiatanManajemen.getById(selectedActivity.id);
                if (resDetail.success) {
                    setSelectedActivity(resDetail.data);
                }
            }
        } catch (err) {
            console.error('Failed to refresh data:', err);
        }
    };

    useEffect(() => {
        const loadInstansi = async () => {
            try {
                const res = await api.masterInstansiDaerah.getAll();
                if (res.success) {
                    setMasterInstansiDaerahList(res.data || []);
                }
            } catch (err) {
                console.error('Failed to load instansi on mount:', err);
            }
        };
        loadInstansi();
    }, []);

    useEffect(() => {
        let isMounted = true;
        const fetchKegiatan = async () => {
            setLoading(true);
            try {
                const params: any = {
                    startDate: '',
                    endDate: '',
                    search: '',
                    tematik: ''
                };
                if (scope === 'bidang' && userBidangId) {
                    params.bidang = String(userBidangId);
                }
                const res = await api.kegiatanManajemen.getAll(params);
                if (isMounted && res.success) {
                    setActivities(res.data || []);
                }
            } catch (err) {
                console.error('Failed to fetch kegiatan', err);
            } finally {
                if (isMounted) setLoading(false);
            }
        };
        fetchKegiatan();
        return () => { isMounted = false; };
    }, [scope, userBidangId]);

    const handleOpenDetail = async (kegiatan: KegiatanItem) => {
        setFetchingDetailId(kegiatan.id);
        try {
            const [resDetail] = await Promise.all([
                api.kegiatanManajemen.getById(kegiatan.id),
                loadDetailOptionsLazy()
            ]);
            if (resDetail.success) {
                setSelectedActivity(resDetail.data);
            } else {
                alert('Gagal memuat detail kegiatan.');
            }
        } catch (err) {
            console.error('Failed to fetch activity detail:', err);
            alert('Terjadi kesalahan saat memuat detail kegiatan.');
        } finally {
            setFetchingDetailId(null);
        }
    };

    const resolvedData = useMemo(() => {
        if (!selectedActivity) return null;
        
        const resolvedBidangs = String(selectedActivity.bidang_ids || '')
            .split(',')
            .map(idStr => idStr.trim())
            .filter(Boolean)
            .map(idStr => {
                const id = Number(idStr);
                const match = bidangList.find(b => b.id === id);
                return match ? (match.singkatan || match.nama) : null;
            })
            .filter(Boolean);

        const resolvedTematiks = String(selectedActivity.tematik_ids || '')
            .split(',')
            .map(idStr => idStr.trim())
            .filter(Boolean)
            .map(idStr => {
                const id = Number(idStr);
                const match = tematikList.find(t => t.id === id);
                return match ? match.nama : null;
            })
            .filter(Boolean);

        const resolvedUrusans = String(selectedActivity.urusan_ids || '')
            .split(',')
            .map(idStr => idStr.trim())
            .filter(Boolean)
            .map(idStr => {
                const match = urusanList.find(u => String(u.id) === idStr || u.kode_urusan === idStr);
                return match ? `${match.kode_urusan} - ${match.urusan}` : idStr;
            })
            .filter(Boolean);

        const resolvedPetugas = String(selectedActivity.petugas_ids || '')
            .split(',')
            .map(idStr => idStr.trim())
            .filter(Boolean)
            .map(idStr => {
                const id = Number(idStr);
                const match = pegawaiList.find(p => p.id === id);
                return match ? { 
                    ...match,
                    id: match.id,
                    nama: match.nama_lengkap, 
                    nip: match.nip, 
                    jabatan: match.jabatan_nama,
                    raw: match 
                } : null;
            })
            .filter(Boolean);

        const sortedEditHistory = Array.isArray(selectedActivity.edit_history)
            ? [...selectedActivity.edit_history].sort((a, b) => {
                return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            })
            : [];

        return {
            resolvedBidangs,
            resolvedTematiks,
            resolvedUrusans,
            resolvedPetugas,
            sortedEditHistory
        };
    }, [selectedActivity, bidangList, tematikList, urusanList, pegawaiList]);

    const formatDate = (tanggal: string) => {
        const date = new Date(tanggal);
        return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
    };

    const getNotulensiDocs = (kegiatan: KegiatanItem) =>
        (kegiatan.dokumen || []).filter(d => d.tipe_dokumen === 'notulensi');

    const hasNotulensi = (kegiatan: KegiatanItem) =>
        getNotulensiDocs(kegiatan).length > 0;

    const openNotulensi = (e: React.MouseEvent, kegiatan: KegiatanItem) => {
        e.preventDefault();
        const docs = getNotulensiDocs(kegiatan);
        if (docs.length === 0) return;

        if (docs.length > 1) {
            setNotulensiSelectorActivity(kegiatan);
        } else {
            const doc = docs[0];
            if (doc && doc.path) {
                setViewedDoc({
                    path: doc.path,
                    name: doc.nama_file,
                    is_private: (doc as any).is_private,
                    uploaded_by: (doc as any).uploaded_by,
                    kegiatan_id: kegiatan.id,
                    dokumen_id: doc.dokumen_id
                });
            }
        }
    };

    const getDateParts = (dStr: string) => {
        try {
            const date = new Date(dStr);
            if (isNaN(date.getTime())) return { day: '--', month: '---' };
            const day = String(date.getDate()).padStart(2, '0');
            const month = date.toLocaleDateString('id-ID', { month: 'short' }).toUpperCase();
            return { day, month };
        } catch {
            return { day: '--', month: '---' };
        }
    };

    const getInstansiInfo = (kegiatan: KegiatanItem) => {
        const rawName = kegiatan.instansi_penyelenggara;
        if (!rawName) {
            return {
                display: kegiatan.bidang_singkatan || '-',
                tooltip: kegiatan.bidang_nama || kegiatan.bidang_singkatan || 'Bapperida',
                isFallback: true
            };
        }

        const match = masterInstansiDaerahList.find(i => {
            const rawLower = rawName.trim().toLowerCase();
            const instansiLower = (i.instansi || '').trim().toLowerCase();
            const singkatanLower = (i.singkatan || '').trim().toLowerCase();
            return instansiLower === rawLower || singkatanLower === rawLower;
        });

        return {
            display: match?.singkatan || rawName,
            tooltip: match?.instansi || rawName,
            isFallback: false
        };
    };

    const goToDaftarKegiatan = () => {
        window.dispatchEvent(new CustomEvent('navigate-page', { detail: { page: 'isi-kegiatan' } }));
    };

    return (
        <div className="card-modern h-full lg:h-[510px] flex flex-col group/card justify-between overflow-hidden shadow-xs border border-slate-100 hover:shadow-md transition-all duration-300">
            <div className="flex items-center justify-between gap-2 px-4 sm:px-5 py-3 border-b border-slate-100/80 bg-white group-hover/card:bg-slate-50/50 transition-colors shrink-0">
                <div className="flex items-center gap-2.5 min-w-0">
                    <div 
                        className="w-8 h-8 sm:w-9 sm:h-9 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-xs"
                        style={{ backgroundColor: 'var(--theme-color-1, #0097fe)' }}
                    >
                        <Clock size={17} strokeWidth={2.3} />
                    </div>
                    <h2 
                        onClick={goToDaftarKegiatan}
                        className="text-xs sm:text-sm font-black text-slate-800 tracking-tight uppercase cursor-pointer hover:underline transition-colors whitespace-nowrap"
                        title="Buka halaman Daftar Kegiatan"
                    >
                        Agenda & Kegiatan
                    </h2>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 flex-nowrap">
                    <div className="flex items-center gap-0.5 bg-slate-100/80 p-0.5 sm:p-1 rounded-xl border border-slate-200/60 text-xs shrink-0">
                        <button
                            type="button"
                            onClick={() => setScope('all')}
                            className={`p-1.5 sm:px-2 sm:py-1 rounded-lg text-[10px] font-extrabold transition-all flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap ${
                                scope === 'all'
                                    ? 'bg-white shadow-xs border border-slate-200/60 font-black'
                                    : 'text-slate-400 hover:text-slate-700'
                            }`}
                            style={{
                                color: scope === 'all' ? 'var(--theme-color-1, #0097fe)' : undefined
                            }}
                            title="Semua Bidang"
                            aria-label="Semua Bidang"
                        >
                            <Building2 size={13} className="shrink-0" />
                            {!isSidebarOpen && <span className="hidden xl:inline">Semua Bidang</span>}
                        </button>

                        {user?.bidang_id && (
                            <button
                                type="button"
                                onClick={() => setScope('bidang')}
                                className={`p-1.5 sm:px-2 sm:py-1 rounded-lg text-[10px] font-extrabold transition-all flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap ${
                                    scope === 'bidang'
                                        ? 'bg-white shadow-xs border border-slate-200/60 font-black'
                                        : 'text-slate-400 hover:text-slate-700'
                                }`}
                                style={{
                                    color: scope === 'bidang' ? 'var(--theme-color-1, #0097fe)' : undefined
                                }}
                                title={`Filter berdasarkan ${userBidangLabel}`}
                                aria-label={`Filter berdasarkan ${userBidangLabel}`}
                            >
                                <Filter size={12} className="shrink-0" />
                                {!isSidebarOpen && <span className="hidden xl:inline">{userBidangLabel}</span>}
                            </button>
                        )}
                    </div>

                    <button
                        onClick={goToDaftarKegiatan}
                        className={`text-[10px] font-extrabold text-white rounded-xl hover:brightness-95 hover:shadow-lg hover:shadow-slate-200/30 transition-all uppercase tracking-wider cursor-pointer whitespace-nowrap shadow-xs shrink-0 flex items-center justify-center ${
                            isSidebarOpen ? 'w-8 h-8' : 'px-2.5 sm:px-3 py-1.5 gap-1'
                        }`}
                        style={{ backgroundColor: 'var(--theme-color-1, #0097fe)' }}
                        title="Upload & Input Kegiatan"
                        aria-label="Upload & Input Kegiatan"
                    >
                        <Plus size={15} strokeWidth={2.5} className="shrink-0" />
                        {!isSidebarOpen && <span className="hidden xl:inline">Upload & Input</span>}
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-hidden px-4 sm:px-5 py-2.5 flex flex-col justify-between">
                {loading ? (
                    <div className="h-full rounded-2xl border border-slate-100 flex flex-col items-center justify-center gap-2.5 text-slate-400 bg-white">
                        <Loader2 size={24} className="animate-spin" style={{ color: 'var(--theme-color-1, #0097fe)' }} />
                        <span className="text-[11px] font-bold animate-pulse text-slate-500">Memuat agenda kegiatan...</span>
                    </div>
                ) : activities.length === 0 ? (
                    <div className="h-full rounded-2xl border border-slate-100 flex flex-col items-center justify-center gap-2 text-slate-400 bg-white">
                        <div 
                            className="w-12 h-12 rounded-2xl flex items-center justify-center mb-1"
                            style={{ backgroundColor: 'color-mix(in srgb, var(--theme-color-1, #0097fe) 8%, #f8fafc)' }}
                        >
                            <Calendar size={22} style={{ color: 'var(--theme-color-1, #0097fe)' }} />
                        </div>
                        <span className="text-xs font-bold text-slate-700">Tidak ada kegiatan ditemukan</span>
                        <p className="text-[11px] text-slate-400">Belum ada agenda pada kategori yang dipilih</p>
                    </div>
                ) : (
                    <>
                        {/* Desktop View (Table) */}
                        <div className="hidden sm:block rounded-xl border border-slate-100/90 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.03)] overflow-hidden bg-white w-full">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="bg-slate-50/80 border-b border-slate-100 h-[34px]">
                                        <th className="py-2 px-3 text-left w-24 border-r border-slate-100/60 font-extrabold text-slate-500 uppercase text-[10px] tracking-wider">
                                            <div className="flex items-center gap-1.5">
                                                <Calendar size={12} style={{ color: 'var(--theme-color-1, #0097fe)' }} />
                                                <span>Tanggal</span>
                                            </div>
                                        </th>
                                        <th className="py-2 px-3 text-left border-r border-slate-100/60 font-extrabold text-slate-500 uppercase text-[10px] tracking-wider">
                                            <div className="flex items-center gap-1.5">
                                                <span>Nama Kegiatan</span>
                                            </div>
                                        </th>
                                        <th className="py-2 px-3 text-center border-r border-slate-100/60 w-24 font-extrabold text-slate-500 uppercase text-[10px] tracking-wider">
                                            <div className="flex items-center justify-center gap-1.5">
                                                <span>Notula</span>
                                            </div>
                                        </th>
                                        <th className="py-2 px-3 text-left font-extrabold text-slate-500 uppercase text-[10px] tracking-wider">
                                            <div className="flex items-center gap-1.5">
                                                <span>Instansi</span>
                                            </div>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-slate-100/60">
                                    {paginatedActivities.map((kegiatan) => {
                                        const { day, month } = getDateParts(kegiatan.tanggal);
                                        const docs = getNotulensiDocs(kegiatan);
                                        const isMultiple = docs.length > 1;
                                        const instansi = getInstansiInfo(kegiatan);

                                        return (
                                            <tr 
                                                key={kegiatan.id} 
                                                className="hover:bg-slate-50/80 transition-colors group/row h-[40px] relative"
                                            >
                                                {/* Date Badge */}
                                                <td className="py-1.5 px-3 border-r border-slate-100/60 whitespace-nowrap">
                                                    <div className="flex items-center gap-2">
                                                        <div 
                                                            className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg border flex flex-col items-center justify-center shrink-0 transition-transform duration-200 group-hover/row:scale-105"
                                                            style={{
                                                                borderColor: 'color-mix(in srgb, var(--theme-color-1, #0097fe) 25%, #e2e8f0)',
                                                                backgroundColor: 'color-mix(in srgb, var(--theme-color-1, #0097fe) 6%, #ffffff)'
                                                            }}
                                                        >
                                                            <span 
                                                                className="text-[7.5px] font-black uppercase leading-none tracking-wider"
                                                                style={{ color: 'var(--theme-color-1, #0097fe)' }}
                                                            >
                                                                {month}
                                                            </span>
                                                            <span className="text-[11px] font-black text-slate-800 leading-none mt-0.5 tabular-nums">
                                                                {day}
                                                            </span>
                                                        </div>
                                                        <span className="text-[10px] font-semibold text-slate-400 hidden xl:inline">
                                                            {formatDate(kegiatan.tanggal).split(' ').slice(2).join(' ')}
                                                        </span>
                                                    </div>
                                                </td>

                                                {/* Nama Kegiatan */}
                                                <td 
                                                    onClick={() => handleOpenDetail(kegiatan)}
                                                    className={`py-1.5 px-3 border-r border-slate-100/60 font-bold text-slate-700 leading-snug cursor-pointer transition-all ${fetchingDetailId === kegiatan.id ? 'cursor-wait bg-blue-50/20' : ''}`}
                                                    title={kegiatan.nama_kegiatan}
                                                >
                                                    <div className="flex items-center gap-2 min-w-0">
                                                        {fetchingDetailId === kegiatan.id && (
                                                            <Loader2 size={12} className="animate-spin shrink-0" style={{ color: 'var(--theme-color-1, #0097fe)' }} />
                                                        )}
                                                        <span className="truncate block max-w-[130px] sm:max-w-[190px] md:max-w-[240px] lg:max-w-[170px] xl:max-w-[240px] 2xl:max-w-[340px] group-hover/row:underline">
                                                            {kegiatan.nama_kegiatan}
                                                        </span>
                                                    </div>
                                                </td>

                                                {/* Notula Rapat */}
                                                <td className="py-1.5 px-3 border-r border-slate-100/60 text-center">
                                                    {docs.length === 0 ? (
                                                        <span className="text-slate-300 text-[11px]">-</span>
                                                    ) : (
                                                        <button 
                                                            onClick={(e) => openNotulensi(e, kegiatan)} 
                                                            className="inline-flex items-center gap-1 justify-center font-black px-2 py-0.5 rounded-lg transition-all duration-200 text-[9.5px] tracking-wider cursor-pointer whitespace-nowrap shadow-2xs hover:brightness-95 active:scale-95"
                                                            style={{
                                                                backgroundColor: 'color-mix(in srgb, var(--theme-color-1, #0097fe) 12%, #ffffff)',
                                                                color: 'var(--theme-color-1, #0097fe)',
                                                                border: '1px solid color-mix(in srgb, var(--theme-color-1, #0097fe) 25%, transparent)'
                                                            }}
                                                            title="Lihat dokumen notulensi"
                                                        >
                                                            <FileText size={10} strokeWidth={2.3} />
                                                            <span>{isMultiple ? '1+ LIHAT' : 'Lihat'}</span>
                                                        </button>
                                                    )}
                                                </td>

                                                {/* Instansi */}
                                                <td className="py-1.5 px-3">
                                                    <span 
                                                        className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-help truncate block max-w-[110px] text-center border"
                                                        style={{
                                                            backgroundColor: instansi.isFallback ? '#f8fafc' : 'color-mix(in srgb, var(--theme-color-1, #0097fe) 6%, #ffffff)',
                                                            color: instansi.isFallback ? '#64748b' : 'var(--theme-color-1, #0097fe)',
                                                            borderColor: instansi.isFallback ? '#e2e8f0' : 'color-mix(in srgb, var(--theme-color-1, #0097fe) 22%, #e2e8f0)'
                                                        }}
                                                        title={instansi.tooltip}
                                                    >
                                                        {instansi.display}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile View (Card Feed) */}
                        <div className="block sm:hidden space-y-2">
                            {paginatedActivities.map((kegiatan) => {
                                const { day, month } = getDateParts(kegiatan.tanggal);
                                const docs = getNotulensiDocs(kegiatan);
                                const isMultiple = docs.length > 1;
                                const instansi = getInstansiInfo(kegiatan);

                                return (
                                    <div 
                                        key={kegiatan.id}
                                        className="p-2.5 rounded-xl border border-slate-100/90 bg-white hover:bg-slate-50/60 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.03)] transition-all flex items-start gap-2.5 relative overflow-hidden group/mcard"
                                    >
                                        {/* Left accent bar */}
                                        <div 
                                            className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r"
                                            style={{ backgroundColor: 'var(--theme-color-1, #0097fe)' }}
                                        />

                                        {/* Calendar Date Badge */}
                                        <div 
                                            className="w-8 h-8 rounded-lg border flex flex-col items-center justify-center shrink-0 ml-1"
                                            style={{
                                                borderColor: 'color-mix(in srgb, var(--theme-color-1, #0097fe) 25%, #e2e8f0)',
                                                backgroundColor: 'color-mix(in srgb, var(--theme-color-1, #0097fe) 8%, #ffffff)'
                                            }}
                                        >
                                            <span 
                                                className="text-[7.5px] font-black uppercase leading-none tracking-wider"
                                                style={{ color: 'var(--theme-color-1, #0097fe)' }}
                                            >
                                                {month}
                                            </span>
                                            <span className="text-[11px] font-black text-slate-800 leading-none mt-0.5 tabular-nums">
                                                {day}
                                            </span>
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <div 
                                                onClick={() => handleOpenDetail(kegiatan)}
                                                className="font-bold text-slate-800 text-[11px] leading-snug hover:underline cursor-pointer line-clamp-1"
                                                title={kegiatan.nama_kegiatan}
                                            >
                                                {fetchingDetailId === kegiatan.id && (
                                                    <Loader2 size={11} className="inline animate-spin mr-1 text-ppm-blue" style={{ color: 'var(--theme-color-1, #0097fe)' }} />
                                                )}
                                                {kegiatan.nama_kegiatan}
                                            </div>

                                            {/* Metadata chips */}
                                            <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                                {/* Instansi Pill - casing preserved */}
                                                <span 
                                                    className="inline-flex items-center px-1.5 py-0.2 rounded text-[9.5px] font-semibold border max-w-[130px] truncate"
                                                    style={{
                                                        backgroundColor: instansi.isFallback ? '#f8fafc' : 'color-mix(in srgb, var(--theme-color-1, #0097fe) 6%, #ffffff)',
                                                        color: instansi.isFallback ? '#64748b' : 'var(--theme-color-1, #0097fe)',
                                                        borderColor: instansi.isFallback ? '#e2e8f0' : 'color-mix(in srgb, var(--theme-color-1, #0097fe) 20%, #e2e8f0)'
                                                    }}
                                                    title={instansi.tooltip}
                                                >
                                                    {instansi.display}
                                                </span>

                                                {/* Notula Button if available */}
                                                {docs.length > 0 && (
                                                    <button
                                                        onClick={(e) => openNotulensi(e, kegiatan)}
                                                        className="inline-flex items-center gap-1 font-bold px-1.5 py-0.2 rounded text-[9.5px] transition-all cursor-pointer shadow-2xs hover:brightness-95 active:scale-95"
                                                        style={{
                                                            backgroundColor: 'color-mix(in srgb, var(--theme-color-1, #0097fe) 12%, #ffffff)',
                                                            color: 'var(--theme-color-1, #0097fe)',
                                                            border: '1px solid color-mix(in srgb, var(--theme-color-1, #0097fe) 25%, transparent)'
                                                        }}
                                                    >
                                                        <FileText size={9} strokeWidth={2.3} />
                                                        <span>{isMultiple ? '1+ Notula' : 'Notula'}</span>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}
            </div>

            {/* Pagination Navigation Footer */}
            <div className="px-4 sm:px-5 py-2 border-t border-slate-100 bg-white flex items-center justify-between shrink-0">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                    Menampilkan {activities.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, activities.length)} dari {activities.length} kegiatan
                </span>
                <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-600">
                        Hal <span style={{ color: 'var(--theme-color-1, #0097fe)' }}>{currentPage}</span> / {totalPages}
                    </span>
                    <div className="flex items-center gap-1">
                        <button
                            type="button"
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-white border border-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                            onMouseEnter={(e) => {
                                if (currentPage > 1) {
                                    e.currentTarget.style.backgroundColor = 'var(--theme-color-1, #0097fe)';
                                    e.currentTarget.style.borderColor = 'var(--theme-color-1, #0097fe)';
                                }
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = '';
                                e.currentTarget.style.borderColor = '';
                            }}
                            title="Halaman sebelumnya"
                        >
                            <ChevronLeft size={14} />
                        </button>
                        <button
                            type="button"
                            disabled={currentPage >= totalPages}
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-white border border-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                            onMouseEnter={(e) => {
                                if (currentPage < totalPages) {
                                    e.currentTarget.style.backgroundColor = 'var(--theme-color-1, #0097fe)';
                                    e.currentTarget.style.borderColor = 'var(--theme-color-1, #0097fe)';
                                }
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = '';
                                e.currentTarget.style.borderColor = '';
                            }}
                            title="Halaman berikutnya"
                        >
                            <ChevronRight size={14} />
                        </button>
                    </div>
                </div>
            </div>

            <DocumentViewerModal
                isOpen={!!viewedDoc}
                zIndex={100030}
                onClose={() => setViewedDoc(null)}
                fileUrl={viewedDoc?.path}
                fileName={viewedDoc?.name || null}
                kegiatanId={viewedDoc?.kegiatan_id}
                dokumenId={viewedDoc?.dokumen_id}
                onDocumentUpdated={refreshData}
                disableDownload={
                    viewedDoc?.is_private === 1 || viewedDoc?.is_private === true
                        ? viewedDoc?.uploaded_by !== user?.id
                        : false
                }
            />

            {/* Kegiatan Summary Modal */}
            {selectedActivity && resolvedData && (() => {
                const { resolvedBidangs, resolvedTematiks, resolvedUrusans, resolvedPetugas, sortedEditHistory } = resolvedData;

                const getSesiLabel = (s: string) => {
                    const dict: any = {
                        'pagi': 'Pagi (08:00 - 12:00)',
                        'siang': 'Siang (13:00 - 15:30)',
                        'sore': 'Sore (15:30 - 18:00)',
                        'malam': 'Malam (19:00 - selesai)',
                        'full_day': 'Full Day (Seharian)'
                    };
                    return dict[s] || s;
                };

                const modalContent = (
                    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-6 md:p-8 bg-slate-950/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
                        <div className="bg-white rounded-2xl sm:rounded-[2rem] max-w-6xl w-full shadow-2xl border border-slate-100/90 overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[88vh] my-auto">
                            
                            {/* Header */}
                            <div className="px-6 sm:px-8 py-5 sm:py-6 bg-white border-b border-slate-100 flex items-center justify-between shrink-0">
                                <div>
                                    <span className="text-[10px] font-bold text-ppm-slate-light uppercase tracking-widest block mb-1">Detail Informasi Kegiatan</span>
                                    <h3 className="text-base sm:text-lg font-black text-slate-850 tracking-tight leading-none uppercase">
                                        {selectedActivity.jenis_kegiatan_nama || 'Kegiatan'}
                                    </h3>
                                </div>
                                <button 
                                    onClick={() => setSelectedActivity(null)}
                                    className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
                                    title="Tutup"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Body */}
                            <div className="p-6 sm:p-8 space-y-6 sm:space-y-8 overflow-y-auto flex-1 custom-scrollbar-visible">
                                <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                                    
                                    {/* Left Column - Main Details */}
                                    <div className="md:col-span-7 space-y-6">
                                        
                                        {/* Nama Kegiatan */}
                                        <div className="space-y-1">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Nama Kegiatan</span>
                                            <h4 className="text-base font-black text-slate-800 leading-snug">
                                                {selectedActivity.nama_kegiatan}
                                            </h4>
                                        </div>

                                        {/* Metadata Grid */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-4">
                                            {/* Tanggal Pelaksanaan */}
                                            <div className="flex flex-col justify-start">
                                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Tanggal Pelaksanaan</span>
                                                <span className="text-xs font-extrabold text-slate-700 mt-1.5 flex items-center gap-2">
                                                    <CalendarDays size={14} className="text-ppm-slate-light shrink-0" />
                                                    <span>
                                                        {formatDate(selectedActivity.tanggal)}
                                                        {selectedActivity.tanggal_akhir && selectedActivity.tanggal_akhir !== selectedActivity.tanggal && (
                                                            <> s.d {formatDate(selectedActivity.tanggal_akhir)}</>
                                                        )}
                                                    </span>
                                                </span>
                                            </div>

                                            {/* Sesi Waktu */}
                                            <div className="flex flex-col justify-start">
                                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Sesi Waktu</span>
                                                <span className="text-xs font-extrabold text-slate-700 mt-1.5 flex items-center gap-2">
                                                    <Clock size={14} className="text-ppm-slate-light shrink-0" />
                                                    <span>{getSesiLabel(selectedActivity.sesi)}</span>
                                                </span>
                                            </div>

                                            {/* Penyelenggara / Instansi */}
                                            <div className="flex flex-col justify-start sm:col-span-2">
                                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Penyelenggara / Instansi</span>
                                                <span className="text-xs font-extrabold text-slate-700 mt-1.5 flex items-center gap-2">
                                                    <Building2 size={14} className="text-ppm-slate-light shrink-0" />
                                                    <span>
                                                        {(() => {
                                                            const rawName = selectedActivity.instansi_penyelenggara;
                                                            if (!rawName) return selectedActivity.bidang_singkatan || 'Bapperida';
                                                            const rawLower = rawName.trim().toLowerCase();
                                                            const match = masterInstansiDaerahList.find(
                                                                i => (i.instansi || '').trim().toLowerCase() === rawLower ||
                                                                     (i.singkatan || '').trim().toLowerCase() === rawLower
                                                            );
                                                            return match ? `${match.instansi} (${match.singkatan})` : rawName;
                                                        })()}
                                                    </span>
                                                </span>
                                            </div>

                                            {/* Bidang Pelaksana */}
                                            <div className="flex flex-col justify-start sm:col-span-2">
                                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Bidang Pelaksana</span>
                                                <div className="flex flex-wrap gap-1.5 mt-1.5">
                                                    {resolvedBidangs.length > 0 ? resolvedBidangs.map((b, idx) => (
                                                        <span key={idx} className="px-2.5 py-0.5 rounded bg-ppm-slate-light/10 text-ppm-slate-light text-[10px] font-extrabold uppercase border border-ppm-slate-light/20">
                                                            {b}
                                                        </span>
                                                    )) : (
                                                        <span className="text-xs font-semibold text-slate-500">Umum / Semua Bidang</span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Urusan Terkait */}
                                            <div className="flex flex-col">
                                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Urusan Terkait</span>
                                                <div className="flex flex-col gap-1 mt-1.5">
                                                    {resolvedUrusans.length > 0 ? resolvedUrusans.map((u, idx) => (
                                                        <span key={idx} className="text-xs font-extrabold text-slate-700 block w-full truncate" title={u}>
                                                            {u}
                                                        </span>
                                                    )) : (
                                                        <span className="text-[10px] font-semibold text-slate-400">-</span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Tematik Strategis */}
                                            <div className="flex flex-col">
                                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Tematik Strategis</span>
                                                <div className="flex flex-col gap-1 mt-1.5">
                                                    {resolvedTematiks.length > 0 ? resolvedTematiks.map((t, idx) => (
                                                        <span key={idx} className="text-xs font-extrabold text-slate-700 block w-full truncate" title={t}>
                                                            {t}
                                                        </span>
                                                    )) : (
                                                        <span className="text-[10px] font-semibold text-slate-400">-</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Keterangan */}
                                        <div className="space-y-1">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Catatan / Keterangan</span>
                                            <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap font-medium">
                                                {selectedActivity.keterangan || 'Tidak ada keterangan tambahan.'}
                                            </p>
                                        </div>

                                    </div>

                                    {/* Right Column - Stakeholders & Documents */}
                                    <div className="md:col-span-5 space-y-6">
                                        
                                        {/* Petugas / Pegawai Terlibat */}
                                        <div className="space-y-2.5">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Petugas Terlibat ({resolvedPetugas.length})</span>
                                            <div className="max-h-64 overflow-y-auto pr-1 custom-scrollbar-visible">
                                                {resolvedPetugas.length > 0 ? (
                                                    <div className="divide-y divide-slate-100 bg-white rounded-2xl border border-slate-100 overflow-hidden">
                                                        {resolvedPetugas.map((p, idx) => (
                                                            <div 
                                                                key={idx} 
                                                                onClick={() => setSelectedPetugasDetail(p.raw || p)}
                                                                className="p-3.5 hover:bg-slate-50/80 flex items-start gap-3 transition-colors cursor-pointer group/petugas"
                                                                title="Klik untuk melihat biodata & detail petugas"
                                                            >
                                                                <div className="w-8 h-8 rounded-full bg-ppm-slate-light/10 text-ppm-slate-light flex items-center justify-center font-black text-[11px] shrink-0 mt-0.5 group-hover/petugas:bg-ppm-slate-light group-hover/petugas:text-white transition-colors">
                                                                    {p.nama.charAt(0).toUpperCase()}
                                                                </div>
                                                                <div className="min-w-0 flex-1">
                                                                    <div className="flex items-center justify-between gap-1.5">
                                                                        <span className="font-extrabold text-slate-800 text-xs block leading-tight group-hover/petugas:text-ppm-slate-light group-hover/petugas:underline transition-colors">
                                                                            {p.nama}
                                                                        </span>
                                                                        <span className="text-[8px] font-black text-ppm-slate-light opacity-0 group-hover/petugas:opacity-100 transition-opacity bg-ppm-slate-light/10 px-1.5 py-0.5 rounded tracking-wider uppercase shrink-0">
                                                                            Lihat Detail
                                                                        </span>
                                                                    </div>
                                                                    <span className="text-[10px] text-slate-400 block mt-0.5 font-semibold">NIP. {p.nip || '-'}</span>
                                                                    <span className="text-[10px] text-ppm-slate-light font-bold block mt-0.5">{p.jabatan}</span>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="text-center p-4 text-slate-400 text-xs italic bg-slate-50/50 rounded-2xl border border-slate-100/50">
                                                        Tidak ada petugas yang ditugaskan.
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Dokumen Terlampir */}
                                        <div className="space-y-2.5 pt-4 border-t border-slate-100">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Dokumen Lampiran ({selectedActivity.dokumen?.length || 0})</span>
                                            <div className="max-h-64 overflow-y-auto pr-1 custom-scrollbar-visible">
                                                {selectedActivity.dokumen && selectedActivity.dokumen.length > 0 ? (
                                                    <div className="divide-y divide-slate-100 bg-white rounded-2xl border border-slate-100 overflow-hidden">
                                                        {selectedActivity.dokumen.map((doc: any) => (
                                                            <div 
                                                                key={doc.id}
                                                                className="p-4 hover:bg-slate-50/30 flex items-center justify-between gap-3 transition-colors group/doc"
                                                            >
                                                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                                                    <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                                                                        <FileText size={16} />
                                                                    </div>
                                                                    <div className="min-w-0 flex-1">
                                                                        <span className="font-extrabold text-slate-800 text-xs block truncate leading-tight" title={doc.nama_file}>
                                                                            {doc.nama_file}
                                                                        </span>
                                                                        <span className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-slate-100 text-slate-500 mt-1 inline-block">
                                                                            {doc.tipe_dokumen.replace(/_/g, ' ')}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                                <button
                                                                    onClick={() => {
                                                                        setViewedDoc({
                                                                            path: doc.path,
                                                                            name: doc.nama_file,
                                                                            is_private: doc.is_private,
                                                                            uploaded_by: doc.uploaded_by
                                                                        });
                                                                    }}
                                                                    className="px-3 py-1.5 bg-ppm-slate-light/10 hover:bg-ppm-slate-light text-ppm-slate-light hover:text-white border border-ppm-slate-light/20 rounded-xl text-[9px] font-bold uppercase tracking-wider transition-all cursor-pointer shrink-0"
                                                                >
                                                                    Lihat
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="text-center p-4 text-slate-400 text-xs italic bg-slate-50/50 rounded-2xl border border-slate-100/50">
                                                        Belum ada dokumen lampiran.
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                    </div>
                                </div>

                                {/* Edit History */}
                                {sortedEditHistory && sortedEditHistory.length > 0 && (
                                    <div className="pt-4 border-t border-slate-100 space-y-2.5">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Riwayat Aktivitas & Perubahan</span>
                                        <div className="space-y-2 max-h-32 overflow-y-auto pr-1 custom-scrollbar-visible">
                                            {sortedEditHistory.map((hist: any, hIdx: number) => (
                                                <div key={hIdx} className="flex gap-2 text-[10px] text-slate-550 items-start">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0 mt-1" />
                                                    <div className="flex-1">
                                                        <span className="font-extrabold text-slate-700">{hist.user_nama}</span>
                                                        <span className="mx-1">{hist.aksi} kegiatan:</span>
                                                        <span className="italic text-slate-400">{hist.keterangan || '-'}</span>
                                                    </div>
                                                    <span className="text-[9px] text-slate-400 shrink-0 font-bold tabular-nums">
                                                        {new Date(hist.created_at).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                            </div>

                             {/* Footer */}
                             <div className="p-6 bg-white border-t border-slate-100 flex justify-end items-center gap-3 shrink-0">
                                 <button
                                     onClick={() => setIsEditModalOpen(true)}
                                     className="px-5 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 hover:text-blue-800 border border-blue-200/60 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2"
                                 >
                                     <FileEdit size={14} />
                                     <span>Edit / Upload Dokumen</span>
                                 </button>
                                 <button
                                     onClick={() => setSelectedActivity(null)}
                                     className="px-6 py-2.5 bg-ppm-slate-light hover:brightness-95 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-sm cursor-pointer"
                                 >
                                     Tutup
                                 </button>
                             </div>

                         </div>
                     </div>
                 );

                 return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
             })()}

             {isEditModalOpen && selectedActivity && (
                 <ActivityFormModal
                     isOpen={isEditModalOpen}
                     zIndex={100020}
                     onClose={() => setIsEditModalOpen(false)}
                     onSuccess={(msg) => {
                         toast.success(msg);
                         refreshData();
                     }}
                     editingActivity={selectedActivity}
                     user={user}
                     masterData={{
                         jenisKegiatan: jenisKegiatanList,
                         bidangList: bidangList,
                         tematikList: tematikList,
                         pegawaiList: pegawaiList,
                         masterInstansiDaerahList: masterInstansiDaerahList,
                         masterDokumenList: masterDokumenList
                     }}
                 />
             )}

             {notulensiSelectorActivity && typeof document !== 'undefined' && createPortal(
                 <div className="fixed inset-0 z-[100040] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
                     <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100/90 overflow-hidden animate-in zoom-in-95 duration-200 my-auto">
                         {/* Header */}
                         <div className="px-6 py-5 bg-white border-b border-slate-100 flex items-center justify-between">
                             <div>
                                 <span className="text-[10px] font-bold text-ppm-slate-light uppercase tracking-widest block mb-0.5">Pilih Dokumen</span>
                                 <h3 className="text-sm font-black text-slate-800 tracking-tight leading-none uppercase">
                                     Notula Rapat
                                 </h3>
                             </div>
                             <button 
                                 onClick={() => setNotulensiSelectorActivity(null)}
                                 className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-xl transition-all cursor-pointer"
                             >
                                 <X size={16} />
                             </button>
                         </div>
                         {/* List of documents */}
                         <div className="p-6 space-y-2.5 max-h-96 overflow-y-auto custom-scrollbar-visible">
                             {getNotulensiDocs(notulensiSelectorActivity).map((doc, index) => (
                                 <button
                                     key={doc.id}
                                     onClick={() => {
                                         setViewedDoc({
                                             path: doc.path,
                                             name: doc.nama_file,
                                             is_private: (doc as any).is_private,
                                             uploaded_by: (doc as any).uploaded_by,
                                             kegiatan_id: notulensiSelectorActivity.id,
                                             dokumen_id: doc.dokumen_id
                                         });
                                         setNotulensiSelectorActivity(null);
                                     }}
                                     className="w-full text-left p-4 hover:bg-slate-50 border border-slate-100 hover:border-slate-200 rounded-2xl transition-all flex items-start gap-3.5 cursor-pointer group"
                                 >
                                     <div className="w-9 h-9 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5 transition-colors group-hover:bg-emerald-100">
                                         <FileText size={18} />
                                     </div>
                                     <div className="min-w-0 flex-1">
                                         <span className="font-extrabold text-slate-800 text-xs block group-hover:text-ppm-slate-light transition-colors truncate" title={doc.nama_file}>
                                             {doc.nama_file}
                                         </span>
                                         <span className="text-[9px] text-slate-400 block mt-1 font-semibold">Notula ke-{index + 1}</span>
                                     </div>
                                 </button>
                             ))}
                         </div>
                         {/* Footer */}
                         <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex justify-end">
                             <button
                                 onClick={() => setNotulensiSelectorActivity(null)}
                                 className="px-4 py-2 bg-ppm-slate-light hover:brightness-95 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer"
                             >
                                 Batal
                             </button>
                         </div>
                     </div>
                 </div>,
                 document.body
             )}

             {/* Detail Petugas Popup */}
             <PetugasDetailModal
                 isOpen={!!selectedPetugasDetail}
                 zIndex={100050}
                 onClose={() => setSelectedPetugasDetail(null)}
                 pegawai={selectedPetugasDetail}
             />
         </div>
     );
 };

export default RecentNotesTable;