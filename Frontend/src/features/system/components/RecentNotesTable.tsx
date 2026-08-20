import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, Loader2, Clock, X, Building2, Layers, FileText, Eye, CalendarDays, FileEdit } from 'lucide-react';
import { api } from '@/src/services/api';
import { useAuth } from '@/src/contexts/AuthContext';
import { DocumentViewerModal } from '@/src/components/modals/DocumentViewerModal';
import { ActivityFormModal } from '@/src/components/modals/ActivityFormModal';
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
    const [viewedDoc, setViewedDoc] = useState<{ path: string, name: string, is_private?: number | boolean, uploaded_by?: number } | null>(null);
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

    const userBidangId = user?.bidang_id;

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
                return match ? { nama: match.nama_lengkap, nip: match.nip, jabatan: match.jabatan_nama } : null;
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
                    uploaded_by: (doc as any).uploaded_by
                });
            }
        }
    };

    const goToDaftarKegiatan = () => {
        window.dispatchEvent(new CustomEvent('navigate-page', { detail: { page: 'isi-kegiatan' } }));
    };

    return (
        <div className="card-modern h-full flex flex-col group/card justify-between">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-4 border-b border-slate-50 bg-white group-hover/card:bg-ppm-slate-light/5 transition-colors">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-ppm-slate-light/10 rounded-xl flex items-center justify-center text-ppm-slate-light shrink-0">
                        <Clock size={18} />
                    </div>
                    <h2 
                        onClick={goToDaftarKegiatan}
                        className="text-[11px] font-black text-slate-800 tracking-widest uppercase cursor-pointer hover:text-ppm-slate-light transition-colors"
                        title="Buka halaman Daftar Kegiatan"
                    >
                        Kegiatan Terbaru
                    </h2>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setScope(scope === 'bidang' ? 'all' : 'bidang')}
                        className="text-xs text-ppm-slate-light font-semibold hover:brightness-90 transition-colors cursor-pointer"
                    >
                        {scope === 'bidang' ? 'Lihat Semua' : 'Bidang Saya'}
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                        onClick={goToDaftarKegiatan}
                        className="text-xs text-ppm-slate-light font-semibold hover:brightness-90 transition-colors cursor-pointer"
                    >
                        Upload & Input
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-x-auto p-6 pt-2">
                <div className="rounded-2xl border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] overflow-hidden bg-white">
                    <table className="w-full text-xs">
                        <thead>
                            <tr>
                                <th className="table-header p-3 text-left w-24 rounded-tl-xl border-r border-slate-100/50">
                                    <div className="flex items-center gap-1.5 text-slate-500">
                                        <Calendar size={12} className="text-slate-400" />
                                        <span>Tanggal</span>
                                    </div>
                                </th>
                                <th className="table-header p-3 text-left border-r border-slate-100/50">
                                    <div className="flex items-center gap-1.5 text-slate-500">
                                        <span>Nama Kegiatan</span>
                                    </div>
                                </th>
                                <th className="table-header p-3 text-center border-r border-slate-100/50 w-20">
                                    <div className="flex items-center justify-center gap-1.5 text-slate-500">
                                        <span>Notula Rapat</span>
                                    </div>
                                </th>
                                <th className="table-header p-3 text-left rounded-tr-xl">
                                    <div className="flex items-center gap-1.5 text-slate-500">
                                        <span>Instansi</span>
                                    </div>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white">
                            {loading ? (
                                <tr>
                                    <td colSpan={4} className="p-8 text-center">
                                        <div className="flex flex-col items-center gap-2 text-slate-400">
                                            <Loader2 size={24} className="text-ppm-blue animate-spin" />
                                            <span className="text-[11px] font-bold animate-pulse">Memuat kegiatan...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : activities.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="p-8 text-center">
                                        <div className="flex flex-col items-center gap-2 text-slate-300">
                                            <Calendar size={32} />
                                            <span className="text-[11px] font-bold">Tidak ada kegiatan ditemukan</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : activities.slice(0, 10).map((kegiatan) => (
                                <tr key={kegiatan.id} className="hover:bg-slate-50/80 transition-colors border-b border-slate-50 group/row">
                                    <td className="p-4 border-r border-slate-50 text-slate-500 font-medium whitespace-nowrap tabular-nums">{formatDate(kegiatan.tanggal)}</td>
                                    <td 
                                        onClick={() => handleOpenDetail(kegiatan)}
                                        className={`p-4 border-r border-slate-50 font-bold text-slate-700 leading-relaxed hover:text-ppm-slate-light hover:underline cursor-pointer transition-all ${fetchingDetailId === kegiatan.id ? 'cursor-wait bg-ppm-slate-light/5' : ''}`}
                                        title="Klik untuk melihat detail kegiatan"
                                    >
                                        <div className="flex items-center gap-2">
                                            {fetchingDetailId === kegiatan.id && <Loader2 size={12} className="animate-spin text-ppm-slate-light shrink-0" />}
                                            <span>{kegiatan.nama_kegiatan}</span>
                                        </div>
                                    </td>
                                    <td className="p-4 border-r border-slate-50 text-center">
                                        {(() => {
                                            const docs = getNotulensiDocs(kegiatan);
                                            if (docs.length === 0) return <span className="text-slate-200">-</span>;

                                            const isMultiple = docs.length > 1;
                                            return (
                                                <button 
                                                    onClick={(e) => openNotulensi(e, kegiatan)} 
                                                    className="inline-flex items-center justify-center bg-ppm-slate-light/10 text-ppm-slate-light hover:bg-ppm-slate-light hover:text-white font-bold px-3 py-1.5 rounded-lg transition-all duration-305 text-[10px] uppercase tracking-wider cursor-pointer whitespace-nowrap"
                                                >
                                                    {isMultiple ? '1+ LIHAT' : 'Lihat'}
                                                </button>
                                            );
                                        })()}
                                    </td>
                                    <td className="p-4">
                                        {(() => {
                                            const rawName = kegiatan.instansi_penyelenggara;
                                            if (!rawName) {
                                                return (
                                                    <span className="px-2.5 py-1 rounded-full bg-slate-50 text-slate-500 text-[10px] font-black uppercase tracking-tighter group-hover/row:bg-ppm-slate-light/10 group-hover/row:text-ppm-slate-light transition-all">
                                                        {kegiatan.bidang_singkatan || '-'}
                                                    </span>
                                                );
                                            }

                                            // Cari kecocokan di masterInstansiDaerahList
                                            const match = masterInstansiDaerahList.find(i => {
                                                const rawLower = rawName.trim().toLowerCase();
                                                const instansiLower = (i.instansi || '').trim().toLowerCase();
                                                const singkatanLower = (i.singkatan || '').trim().toLowerCase();
                                                return instansiLower === rawLower || singkatanLower === rawLower;
                                            });

                                            const displayVal = match?.singkatan || rawName;
                                            const tooltipVal = match?.instansi || rawName;

                                            return (
                                                <span 
                                                    className="px-2.5 py-1 rounded-full bg-slate-50 text-slate-500 text-[10px] font-black uppercase tracking-tighter group-hover/row:bg-ppm-slate-light/10 group-hover/row:text-ppm-slate-light transition-all cursor-help"
                                                    title={tooltipVal}
                                                >
                                                    {displayVal}
                                                </span>
                                            );
                                        })()}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <DocumentViewerModal
                isOpen={!!viewedDoc}
                onClose={() => setViewedDoc(null)}
                fileUrl={viewedDoc?.path}
                fileName={viewedDoc?.name || null}
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

                return (
                    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-slate-950/50 animate-in fade-in duration-200">
                        <div className="bg-white rounded-[2rem] max-w-6xl w-full shadow-2xl border border-slate-100/90 overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[95vh]">
                            
                            {/* Header */}
                            <div className="px-8 py-6 bg-white border-b border-slate-100 flex items-center justify-between shrink-0">
                                <div>
                                    <span className="text-[10px] font-bold text-ppm-slate-light uppercase tracking-widest block mb-1">Detail Informasi Kegiatan</span>
                                    <h3 className="text-lg font-black text-slate-850 tracking-tight leading-none uppercase">
                                        {selectedActivity.jenis_kegiatan_nama || 'Kegiatan'}
                                    </h3>
                                </div>
                                <button 
                                    onClick={() => setSelectedActivity(null)}
                                    className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-xl transition-all cursor-pointer"
                                    title="Tutup"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Body */}
                            <div className="p-8 space-y-8 overflow-y-auto flex-1 custom-scrollbar-visible">
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
                                                            if (!rawName) return selectedActivity.bidang_singkatan || 'Bappeda';
                                                            const match = masterInstansiDaerahList.find(
                                                                i => i.instansi?.trim().toLowerCase() === rawName.trim().toLowerCase()
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
                                                            <div key={idx} className="p-4 hover:bg-slate-50/30 flex items-start gap-3 transition-colors">
                                                                <div className="w-8 h-8 rounded-full bg-ppm-slate-light/10 text-ppm-slate-light flex items-center justify-center font-black text-[11px] shrink-0 mt-0.5">
                                                                    {p.nama.charAt(0).toUpperCase()}
                                                                </div>
                                                                <div className="min-w-0 flex-1">
                                                                    <span className="font-extrabold text-slate-800 text-xs block leading-tight">{p.nama}</span>
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
                                                                    className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-200/60 rounded-xl text-[9px] font-bold uppercase tracking-wider transition-all cursor-pointer shrink-0"
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
                                     className="px-6 py-2.5 bg-slate-800 hover:bg-slate-750 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-sm cursor-pointer"
                                 >
                                     Tutup
                                 </button>
                             </div>

                         </div>
                     </div>
                 );
             })()}

             {isEditModalOpen && selectedActivity && (
                 <ActivityFormModal
                     isOpen={isEditModalOpen}
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

             {notulensiSelectorActivity && (
                 <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-slate-950/40 animate-in fade-in duration-200">
                     <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100/90 overflow-hidden animate-in zoom-in-95 duration-200">
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
                                             uploaded_by: (doc as any).uploaded_by
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
                                 className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer"
                             >
                                 Batal
                             </button>
                         </div>
                     </div>
                 </div>
             )}
         </div>
     );
 };

export default RecentNotesTable;