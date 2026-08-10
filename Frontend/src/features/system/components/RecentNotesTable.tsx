import React, { useState, useEffect } from 'react';
import { Calendar, Loader2 } from 'lucide-react';
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
        <div className="card-modern h-full flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-50">
                <div className="flex items-center gap-3">
                    <h2 className="text-sm font-extrabold text-slate-800 tracking-tight">Kegiatan Terbaru</h2>
                    <span className="bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-md text-[10px] font-bold">TERBARU</span>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => setScope(scope === 'bidang' ? 'all' : 'bidang')}
                        className="text-xs text-indigo-600 font-semibold hover:text-indigo-700 transition-colors"
                    >
                        {scope === 'bidang' ? 'Lihat Semua' : 'Bidang Saya'}
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                        onClick={goToDaftarKegiatan}
                        className="text-xs text-indigo-600 font-semibold hover:text-indigo-700 transition-colors"
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
                                    <td className="p-4 border-r border-slate-50 font-bold text-slate-700 leading-relaxed group-hover/row:text-indigo-600 transition-colors">{kegiatan.nama_kegiatan}</td>
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
        </div>
    );
};

export default RecentNotesTable;