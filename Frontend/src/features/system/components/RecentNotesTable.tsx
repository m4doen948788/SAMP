import React, { useState, useEffect } from 'react';
import { Calendar, Loader2, Clock, X, Building2, Layers, FileText, Eye, CalendarDays } from 'lucide-react';
import { api } from '@/src/services/api';
import { useAuth } from '@/src/contexts/AuthContext';
import { DocumentViewerModal } from '@/src/components/modals/DocumentViewerModal';

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
    const [selectedActivity, setSelectedActivity] = useState<KegiatanItem | null>(null);

    const userBidangId = user?.bidang_id;

    useEffect(() => {
        let isMounted = true;
        api.masterInstansiDaerah.getAll().then(res => {
            if (isMounted && res.success) {
                setMasterInstansiDaerahList(res.data || []);
            }
        });
        return () => { isMounted = false; };
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

    const formatDate = (tanggal: string) => {
        const date = new Date(tanggal);
        return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
    };

    const hasNotulensi = (kegiatan: KegiatanItem) =>
        (kegiatan.dokumen || []).some(d => d.tipe_dokumen === 'notulensi');

    const openNotulensi = (e: React.MouseEvent, kegiatan: KegiatanItem) => {
        e.preventDefault();
        const doc = (kegiatan.dokumen || []).find(d => d.tipe_dokumen === 'notulensi');
        if (doc && doc.path) {
            setViewedDoc({
                path: doc.path,
                name: doc.nama_file,
                is_private: (doc as any).is_private,
                uploaded_by: (doc as any).uploaded_by
            });
        }
    };

    const goToDaftarKegiatan = () => {
        window.dispatchEvent(new CustomEvent('navigate-page', { detail: { page: 'isi-kegiatan' } }));
    };

    return (
        <div className="card-modern h-full flex flex-col group/card justify-between">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-4 border-b border-slate-50 bg-white group-hover/card:bg-indigo-50/20 transition-colors">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 shrink-0">
                        <Clock size={18} />
                    </div>
                    <h2 
                        onClick={goToDaftarKegiatan}
                        className="text-[11px] font-black text-slate-800 tracking-widest uppercase cursor-pointer hover:text-indigo-600 transition-colors"
                        title="Buka halaman Daftar Kegiatan"
                    >
                        Kegiatan Terbaru
                    </h2>
                    <span className="bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-md text-[9px] font-bold tracking-wider shrink-0">TERBARU</span>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setScope(scope === 'bidang' ? 'all' : 'bidang')}
                        className="text-xs text-indigo-600 font-semibold hover:text-indigo-700 transition-colors cursor-pointer"
                    >
                        {scope === 'bidang' ? 'Lihat Semua' : 'Bidang Saya'}
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                        onClick={goToDaftarKegiatan}
                        className="text-xs text-indigo-600 font-semibold hover:text-indigo-700 transition-colors cursor-pointer"
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
                                        onClick={() => setSelectedActivity(kegiatan)}
                                        className="p-4 border-r border-slate-50 font-bold text-slate-700 leading-relaxed hover:text-indigo-600 hover:underline cursor-pointer transition-all"
                                        title="Klik untuk melihat detail kegiatan"
                                    >
                                        {kegiatan.nama_kegiatan}
                                    </td>
                                    <td className="p-4 border-r border-slate-50 text-center">
                                        {hasNotulensi(kegiatan) ? (
                                            <button onClick={(e) => openNotulensi(e, kegiatan)} className="inline-flex items-center justify-center bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white font-bold px-3 py-1.5 rounded-lg transition-all duration-300 text-[10px] uppercase tracking-wider cursor-pointer">Lihat</button>
                                        ) : (
                                            <span className="text-slate-200">-</span>
                                        )}
                                    </td>
                                    <td className="p-4">
                                        <span className="px-2.5 py-1 rounded-full bg-slate-50 text-slate-500 text-[10px] font-black uppercase tracking-tighter group-hover/row:bg-indigo-50 group-hover/row:text-indigo-500 transition-all" title={kegiatan.instansi_penyelenggara || undefined}>
                                            {(() => {
                                                const rawName = kegiatan.instansi_penyelenggara;
                                                if (!rawName) return kegiatan.bidang_singkatan || '-';
                                                const match = masterInstansiDaerahList.find(
                                                    i => i.instansi?.trim().toLowerCase() === rawName.trim().toLowerCase()
                                                );
                                                return match?.singkatan || rawName;
                                            })()}
                                        </span>
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
            {selectedActivity && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white rounded-[2rem] max-w-xl w-full shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col">
                        
                        {/* Header */}
                        <div className="p-6 bg-gradient-to-r from-indigo-50 to-blue-50/50 border-b border-indigo-100/50 flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-indigo-600 text-white rounded-2xl shadow-md">
                                    <Clock size={20} />
                                </div>
                                <div>
                                    <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest block mb-0.5">Ringkasan Kegiatan</span>
                                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-wide leading-tight">Detail Informasi</h3>
                                </div>
                            </div>
                            <button 
                                onClick={() => setSelectedActivity(null)}
                                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-150/50 rounded-xl transition-all cursor-pointer"
                                title="Tutup"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-6 space-y-5 overflow-y-auto max-h-[70vh] custom-scrollbar-visible">
                            
                            {/* Nama Kegiatan */}
                            <div className="space-y-1">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Nama Kegiatan</span>
                                <h4 className="text-sm font-extrabold text-slate-800 leading-relaxed pr-2">
                                    {selectedActivity.nama_kegiatan}
                                </h4>
                            </div>

                            {/* Info Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                                
                                {/* Tanggal */}
                                <div className="flex items-start gap-2.5">
                                    <div className="p-2 bg-slate-50 text-slate-500 rounded-xl shrink-0 mt-0.5">
                                        <CalendarDays size={14} />
                                    </div>
                                    <div className="min-w-0">
                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Tanggal Pelaksanaan</span>
                                        <span className="text-xs font-extrabold text-slate-700 block mt-0.5">
                                            {formatDate(selectedActivity.tanggal)}
                                            {selectedActivity.tanggal_akhir && selectedActivity.tanggal_akhir !== selectedActivity.tanggal && (
                                                <> s.d {formatDate(selectedActivity.tanggal_akhir)}</>
                                            )}
                                        </span>
                                    </div>
                                </div>

                                {/* Penyelenggara */}
                                <div className="flex items-start gap-2.5">
                                    <div className="p-2 bg-slate-50 text-slate-500 rounded-xl shrink-0 mt-0.5">
                                        <Building2 size={14} />
                                    </div>
                                    <div className="min-w-0">
                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Penyelenggara / Instansi</span>
                                        <span className="text-xs font-extrabold text-slate-700 block mt-0.5 truncate" title={selectedActivity.instansi_penyelenggara || undefined}>
                                            {(() => {
                                                const rawName = selectedActivity.instansi_penyelenggara;
                                                if (!rawName) return selectedActivity.bidang_singkatan || '-';
                                                const match = masterInstansiDaerahList.find(
                                                    i => i.instansi?.trim().toLowerCase() === rawName.trim().toLowerCase()
                                                );
                                                return match?.singkatan || rawName;
                                            })()}
                                        </span>
                                    </div>
                                </div>

                                {/* Bidang Terkait */}
                                <div className="flex items-start gap-2.5 sm:col-span-2 pt-2 border-t border-slate-50">
                                    <div className="p-2 bg-slate-50 text-slate-500 rounded-xl shrink-0 mt-0.5">
                                        <Layers size={14} />
                                    </div>
                                    <div className="min-w-0">
                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Bidang Terkait</span>
                                        <span className="text-xs font-extrabold text-slate-700 block mt-0.5" title={selectedActivity.bidang_nama || undefined}>
                                            {selectedActivity.bidang_nama || 'Umum'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Dokumen Terlampir */}
                            <div className="pt-4 border-t border-slate-100 space-y-3">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Dokumen Terlampir ({selectedActivity.dokumen?.length || 0})</span>
                                
                                <div className="space-y-2">
                                    {selectedActivity.dokumen && selectedActivity.dokumen.length > 0 ? (
                                        selectedActivity.dokumen.map((doc) => (
                                            <div 
                                                key={doc.id}
                                                className="p-3 bg-slate-50/50 hover:bg-indigo-50/15 border border-slate-100 rounded-xl flex items-center justify-between gap-3 transition-colors group/doc"
                                            >
                                                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg shrink-0 group-hover/doc:scale-105 transition-transform">
                                                        <FileText size={14} />
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <span className="font-extrabold text-slate-800 text-[11px] block truncate" title={doc.nama_file}>
                                                            {doc.nama_file}
                                                        </span>
                                                        <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-slate-150 text-slate-600 mt-1 inline-block">
                                                            {doc.tipe_dokumen.replace(/_/g, ' ')}
                                                        </span>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => {
                                                        setViewedDoc({
                                                            path: doc.path,
                                                            name: doc.nama_file,
                                                            is_private: (doc as any).is_private,
                                                            uploaded_by: (doc as any).uploaded_by
                                                        });
                                                    }}
                                                    className="px-3 py-1 bg-white border border-slate-200 hover:border-indigo-300 hover:text-indigo-600 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer shadow-2xs hover:shadow-xs"
                                                >
                                                    Lihat
                                                </button>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center p-6 text-slate-400 text-xs italic">
                                            Belum ada dokumen yang terlampir pada kegiatan ini.
                                        </div>
                                    )}
                                </div>
                            </div>

                        </div>

                        {/* Footer */}
                        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end shrink-0">
                            <button
                                onClick={() => setSelectedActivity(null)}
                                className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-sm cursor-pointer"
                            >
                                Tutup
                            </button>
                        </div>

                    </div>
                </div>
            )}
        </div>
    );
};

export default RecentNotesTable;