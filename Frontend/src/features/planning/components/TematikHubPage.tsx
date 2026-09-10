import React, { useState, useEffect } from 'react';
import { 
    Layers, FileText, Check, AlertCircle, Clock, FolderOpen, 
    Search, Upload, Calendar, Eye, Trash2, Plus, ExternalLink, 
    Users, Filter, ChevronRight, Activity, BookOpen, Mail, 
    Building2, BarChart2, Globe, ShieldCheck, X, RefreshCw,
    Download, AlertTriangle, ArrowUpRight, List, ClipboardList,
    Send, Presentation, Briefcase, ScrollText, FileCheck
} from 'lucide-react';
import { api, rawApiUrl } from '@/src/services/api';
import { useAuth } from '@/src/contexts/AuthContext';

interface TematikItem {
    id: number;
    nama: string;
}

interface DokumenWajib {
    id: number;
    tematik_id: number;
    kode_dokumen: string;
    judul_dokumen: string;
    deskripsi: string | null;
    dokumen_id: number | null;
    file_path: string | null;
    file_name: string | null;
    nomor_dokumen: string | null;
    tahun: number | null;
    tanggal_penetapan: string | null;
    keterangan: string | null;
    updated_by: number | null;
    created_at: string;
    updated_at: string;
    library_file_name?: string;
    file_size?: number;
    doc_uploaded_at?: string;
    updater_username?: string;
    updater_name?: string;
}

interface KegiatanItem {
    id: number;
    tanggal: string;
    tanggal_akhir: string | null;
    nama_kegiatan: string;
    instansi_penyelenggara: string | null;
    bidang_ids: string | null;
    kelengkapan: string | null;
    keterangan: string | null;
    sesi: string | null;
    surat_undangan_masuk_id: number | null;
    surat_masuk_nama: string | null;
    surat_masuk_path: string | null;
    surat_undangan_keluar_id: number | null;
    surat_keluar_nama: string | null;
    surat_keluar_path: string | null;
    bahan_desk_id: number | null;
    bahan_desk_nama: string | null;
    bahan_desk_path: string | null;
    paparan_id: number | null;
    paparan_nama: string | null;
    paparan_path: string | null;
    petugas_ids: string | null;
    notulen_id: number | null;
    nomor_notulen: string | null;
}

interface DokumenLibraryItem {
    id: number;
    nama_file: string;
    nama_asli_unggah: string;
    path: string;
    ukuran: number;
    uploaded_at: string;
    jenis_dokumen: string | null;
    is_private: number;
    uploader_username?: string;
    uploader_name?: string;
}

interface SuratItem {
    id: number;
    nomor_surat: string;
    perihal: string;
    asal_surat: string;
    tujuan_surat: string;
    tanggal_surat: string;
    tipe_surat: string;
    approval_status: string;
    dokumen_path: string | null;
    dokumen_nama: string | null;
}

interface OpdItem {
    instansi_id: number;
    nama_opd: string;
    singkatan_opd: string;
    total_kegiatan: number;
    kegiatan_terakhir: string | null;
}

interface DataMakroItem {
    id: number;
    kode: string;
    nama_data: string;
    sumber_data: string;
    satuan: string | null;
    nilai_terakhir: string | number | null;
    tahun_terakhir: number | null;
}

interface AplikasiExternalItem {
    id: number;
    nama_aplikasi: string;
    url: string;
    pembuat: string | null;
    sumber: string | null;
    keterangan: string | null;
    tipe_link: string | null;
}

interface TematikHubStats {
    totalKegiatan: number;
    totalDokumen: number;
    totalSurat: number;
    totalOpd: number;
    mandatoryCompleted: number;
    mandatoryTotal: number;
}

interface Props {
    initialTematikId?: number;
}

export const TematikHubPage: React.FC<Props> = ({ initialTematikId }) => {
    const { user } = useAuth();

    // Master list of all tematik
    const [tematikList, setTematikList] = useState<TematikItem[]>([]);
    const [selectedTematikId, setSelectedTematikId] = useState<number | null>(initialTematikId || null);

    // Active detail tab
    const [activeTab, setActiveTab] = useState<'kegiatan' | 'dokumen' | 'surat' | 'opd' | 'makro' | 'aplikasi'>('kegiatan');

    // Selected mandatory document slot in RPJPD-style card
    const [selectedDocSlotId, setSelectedDocSlotId] = useState<number | null>(null);

    // Hub data states
    const [hubLoading, setHubLoading] = useState(false);
    const [stats, setStats] = useState<TematikHubStats | null>(null);
    const [dokumenWajibList, setDokumenWajibList] = useState<DokumenWajib[]>([]);
    const [kegiatanList, setKegiatanList] = useState<KegiatanItem[]>([]);
    const [dokumenList, setDokumenList] = useState<DokumenLibraryItem[]>([]);
    const [suratList, setSuratList] = useState<SuratItem[]>([]);
    const [opdList, setOpdList] = useState<OpdItem[]>([]);
    const [dataMakroList, setDataMakroList] = useState<DataMakroItem[]>([]);
    const [aplikasiList, setAplikasiList] = useState<AplikasiExternalItem[]>([]);

    // Search filters within tabs
    const [searchKegiatan, setSearchKegiatan] = useState('');
    const [searchDokumen, setSearchDokumen] = useState('');
    const [searchSurat, setSearchSurat] = useState('');
    const [searchOpd, setSearchOpd] = useState('');

    // Alerts
    const [errorMsg, setErrorMsg] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    // ==========================================
    // MODAL STATES FOR MANDATORY DOCUMENTS
    // ==========================================
    // 1. Library Picker Modal
    const [isLibraryPickerOpen, setIsLibraryPickerOpen] = useState(false);
    const [activeSlotForPicker, setActiveSlotForPicker] = useState<DokumenWajib | null>(null);
    const [libraryDocs, setLibraryDocs] = useState<any[]>([]);
    const [librarySearch, setLibrarySearch] = useState('');
    const [loadingLibrary, setLoadingLibrary] = useState(false);

    // 2. Upload Modal
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [activeSlotForUpload, setActiveSlotForUpload] = useState<DokumenWajib | null>(null);
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [uploadNomorDokumen, setUploadNomorDokumen] = useState('');
    const [uploadTahun, setUploadTahun] = useState<number | ''>(new Date().getFullYear());
    const [uploadTanggal, setUploadTanggal] = useState('');
    const [uploadKeterangan, setUploadKeterangan] = useState('');
    const [uploading, setUploading] = useState(false);

    // 3. History Modal
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [activeSlotForHistory, setActiveSlotForHistory] = useState<DokumenWajib | null>(null);
    const [historyLogs, setHistoryLogs] = useState<any[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    const showSuccess = (msg: string) => {
        setSuccessMsg(msg);
        setTimeout(() => setSuccessMsg(''), 4000);
    };

    const showError = (msg: string) => {
        setErrorMsg(msg);
        setTimeout(() => setErrorMsg(''), 4000);
    };

    const getFileUrl = (path: string | null) => {
        if (!path) return '';
        const base = rawApiUrl.replace(/\/api$/, '');
        return `${base}${path}`;
    };

    const formatBytes = (bytes?: number) => {
        if (!bytes || bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const formatDate = (dateStr?: string | null) => {
        if (!dateStr) return '-';
        try {
            return new Date(dateStr).toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
            });
        } catch {
            return dateStr;
        }
    };

    // Sync initialTematikId prop if provided or updated from parent/navigation
    useEffect(() => {
        if (initialTematikId) {
            setSelectedTematikId(initialTematikId);
        }
    }, [initialTematikId]);

    // Load initial tematik list
    useEffect(() => {
        const fetchTematiks = async () => {
            try {
                const res = await api.tematik.getAll();
                if (res.success && Array.isArray(res.data)) {
                    setTematikList(res.data);
                    if (!selectedTematikId && res.data.length > 0) {
                        setSelectedTematikId(initialTematikId || res.data[0].id);
                    }
                }
            } catch (err: any) {
                console.error('Failed to load tematiks:', err);
                showError('Gagal memuat master data tematik');
            }
        };
        fetchTematiks();
    }, []);

    // Load hub data whenever selectedTematikId changes
    const fetchHubData = async () => {
        if (!selectedTematikId) return;
        setHubLoading(true);
        try {
            const res = await api.tematik.getHubData(selectedTematikId);
            if (res.success && res.data) {
                setStats(res.data.stats || null);
                const wList = res.data.dokumenWajib || [];
                setDokumenWajibList(wList);
                setSelectedDocSlotId(prev => (prev && wList.some((d: any) => d.id === prev)) ? prev : (wList[0]?.id || null));
                setKegiatanList(res.data.kegiatan || []);
                setDokumenList(res.data.dokumen || []);
                setSuratList(res.data.surat || []);
                setOpdList(res.data.perangkatDaerah || []);
                setDataMakroList(res.data.dataMakro || []);
                setAplikasiList(res.data.aplikasiExternal || []);
            } else {
                showError(res.message || 'Gagal memuat data ruang tematik');
            }
        } catch (err: any) {
            console.error('Fetch hub error:', err);
            showError('Terjadi kesalahan saat memuat data ruang tematik');
        } finally {
            setHubLoading(false);
        }
    };

    useEffect(() => {
        fetchHubData();
    }, [selectedTematikId]);

    // Open Library Picker
    const openLibraryPicker = async (slot: DokumenWajib) => {
        setActiveSlotForPicker(slot);
        setLibrarySearch('');
        setIsLibraryPickerOpen(true);
        setLoadingLibrary(true);
        try {
            const res = await api.dokumen.getAll();
            if (res.success && Array.isArray(res.data)) {
                setLibraryDocs(res.data);
            }
        } catch (e) {
            console.error('Error fetching library docs:', e);
            showError('Gagal memuat dokumen perpustakaan');
        } finally {
            setLoadingLibrary(false);
        }
    };

    // Select Document from Library
    const handleSelectLibraryDoc = async (doc: any) => {
        if (!activeSlotForPicker || !selectedTematikId) return;
        try {
            const res = await api.tematik.linkMandatoryDoc(selectedTematikId, {
                slot_id: activeSlotForPicker.id,
                dokumen_id: doc.id,
                file_path: doc.path,
                file_name: doc.nama_file,
                nomor_dokumen: activeSlotForPicker.nomor_dokumen,
                tahun: activeSlotForPicker.tahun
            });
            if (res.success) {
                showSuccess('Dokumen berhasil dikaitkan dari perpustakaan!');
                setIsLibraryPickerOpen(false);
                fetchHubData();
            } else {
                showError(res.message || 'Gagal mengaitkan dokumen');
            }
        } catch (err: any) {
            showError(err.message || 'Gagal mengaitkan dokumen');
        }
    };

    // Open Upload Modal
    const openUploadModal = (slot: DokumenWajib) => {
        setActiveSlotForUpload(slot);
        setUploadFile(null);
        setUploadNomorDokumen(slot.nomor_dokumen || '');
        setUploadTahun(slot.tahun || new Date().getFullYear());
        setUploadTanggal(slot.tanggal_penetapan ? slot.tanggal_penetapan.split('T')[0] : '');
        setUploadKeterangan(slot.keterangan || '');
        setIsUploadModalOpen(true);
    };

    // Submit Upload
    const handleUploadSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!uploadFile || !activeSlotForUpload || !selectedTematikId) {
            showError('Silakan pilih file terlebih dahulu');
            return;
        }

        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', uploadFile);
            formData.append('slot_id', String(activeSlotForUpload.id));
            if (uploadNomorDokumen) formData.append('nomor_dokumen', uploadNomorDokumen);
            if (uploadTahun) formData.append('tahun', String(uploadTahun));
            if (uploadTanggal) formData.append('tanggal_penetapan', uploadTanggal);
            if (uploadKeterangan) formData.append('keterangan', uploadKeterangan);

            const res = await api.tematik.uploadMandatoryDoc(selectedTematikId, formData);
            if (res.success) {
                showSuccess('Dokumen wajib berhasil diunggah dan dikaitkan!');
                setIsUploadModalOpen(false);
                fetchHubData();
            } else {
                showError(res.message || 'Gagal mengunggah dokumen');
            }
        } catch (err: any) {
            showError(err.message || 'Gagal mengunggah dokumen');
        } finally {
            setUploading(false);
        }
    };

    // Unlink Document
    const handleUnlink = async (slot: DokumenWajib) => {
        if (!selectedTematikId) return;
        if (!window.confirm(`Hapus kaitan dokumen "${slot.judul_dokumen}"? File asli di perpustakaan tetap tersimpan.`)) return;

        try {
            const res = await api.tematik.unlinkMandatoryDoc(selectedTematikId, { slot_id: slot.id });
            if (res.success) {
                showSuccess('Kaitan dokumen berhasil dihapus!');
                fetchHubData();
            } else {
                showError(res.message || 'Gagal menghapus kaitan');
            }
        } catch (err: any) {
            showError(err.message || 'Gagal menghapus kaitan');
        }
    };

    // Open History Modal
    const openHistoryModal = async (slot: DokumenWajib) => {
        setActiveSlotForHistory(slot);
        setIsHistoryModalOpen(true);
        setLoadingHistory(true);
        if (!selectedTematikId) return;

        try {
            const res = await api.tematik.getMandatoryDocHistory(selectedTematikId, slot.id);
            if (res.success && Array.isArray(res.data)) {
                setHistoryLogs(res.data);
            }
        } catch (err) {
            console.error('Error fetching history:', err);
            showError('Gagal memuat riwayat dokumen');
        } finally {
            setLoadingHistory(false);
        }
    };

    const currentTematik = tematikList.find(t => t.id === selectedTematikId);
    const activeSlot = dokumenWajibList.find(d => d.id === selectedDocSlotId) || dokumenWajibList[0];

    // Filtered items
    const filteredKegiatan = kegiatanList.filter(k => 
        (k.nama_kegiatan || '').toLowerCase().includes(searchKegiatan.toLowerCase()) ||
        (k.instansi_penyelenggara || '').toLowerCase().includes(searchKegiatan.toLowerCase())
    );

    const filteredDokumen = dokumenList.filter(d => 
        (d.nama_file || '').toLowerCase().includes(searchDokumen.toLowerCase()) ||
        (d.jenis_dokumen || '').toLowerCase().includes(searchDokumen.toLowerCase())
    );

    const filteredSurat = suratList.filter(s => 
        (s.perihal || '').toLowerCase().includes(searchSurat.toLowerCase()) ||
        (s.nomor_surat || '').toLowerCase().includes(searchSurat.toLowerCase()) ||
        (s.asal_surat || '').toLowerCase().includes(searchSurat.toLowerCase())
    );

    const filteredOpd = opdList.filter(o => 
        (o.nama_opd || '').toLowerCase().includes(searchOpd.toLowerCase()) ||
        (o.singkatan_opd || '').toLowerCase().includes(searchOpd.toLowerCase())
    );

    return (
        <div className="max-w-full mx-auto px-4 lg:px-6 pb-6 space-y-3 animate-in fade-in duration-500">
            {/* ALERT NOTIFICATIONS */}
            {successMsg && (
                <div className="p-3.5 rounded-2xl flex items-center gap-3 border shadow-sm bg-emerald-50 text-emerald-700 border-emerald-100 text-xs font-bold animate-in fade-in slide-in-from-top-2 duration-300">
                    <Check size={18} className="text-emerald-600 shrink-0" />
                    <span>{successMsg}</span>
                    <button onClick={() => setSuccessMsg('')} className="ml-auto opacity-50 hover:opacity-100">
                        <X size={16} />
                    </button>
                </div>
            )}
            {errorMsg && (
                <div className="p-3.5 rounded-2xl flex items-center gap-3 border shadow-sm bg-rose-50 text-rose-700 border-rose-100 text-xs font-bold animate-in fade-in slide-in-from-top-2 duration-300">
                    <AlertCircle size={18} className="text-rose-600 shrink-0" />
                    <span>{errorMsg}</span>
                    <button onClick={() => setErrorMsg('')} className="ml-auto opacity-50 hover:opacity-100">
                        <X size={16} />
                    </button>
                </div>
            )}

            {/* STICKY HEADER SECTION (SAMA DENGAN MANAJEMEN KEGIATAN & DASHBOARD UTAMA) */}
            <div className="sticky top-[-1px] z-[600] pt-2 pb-1.5 bg-[#f8fafc] border-b border-transparent shadow-sm">
                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-2">
                    {/* Header Title */}
                    <div className="flex items-center justify-between xl:justify-start gap-4 shrink-0">
                        <div className="shrink-0 group pointer-events-none">
                            <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                                <div className="p-1.5 bg-ppm-blue text-white rounded-xl shadow-lg shadow-blue-100 group-hover:scale-110 transition-transform">
                                    <ClipboardList size={18} />
                                </div>
                                <span>Ruang Tematik</span>
                            </h2>
                            <p className="text-slate-500 text-[9px] uppercase tracking-wider font-bold mt-0 ml-1">
                                {currentTematik ? `Tema: ${currentTematik.nama}` : 'Perencanaan Terpadu Lintas Sektor'}
                            </p>
                        </div>
                    </div>

                    {/* Right-Hand Controls: Selector Dropdown + Refresh */}
                    <div className="flex items-center gap-2 bg-white p-1 pl-3 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/40 flex-1 xl:ml-8 justify-end">
                        <select
                            value={selectedTematikId || ''}
                            onChange={(e) => setSelectedTematikId(Number(e.target.value))}
                            className="input-modern py-1.5 px-3 text-xs font-black text-slate-800 cursor-pointer min-w-[170px] bg-slate-50/80 rounded-xl"
                        >
                            {tematikList.map((t) => (
                                <option key={t.id} value={t.id}>
                                    Tema: {t.nama}
                                </option>
                            ))}
                        </select>

                        <button
                            onClick={() => fetchHubData()}
                            disabled={hubLoading}
                            className="p-2 text-slate-400 hover:text-ppm-blue hover:bg-slate-50 border border-slate-200 rounded-xl transition-all shadow-sm active:scale-95 disabled:opacity-50"
                            title="Segarkan Data"
                        >
                            <RefreshCw size={15} className={hubLoading ? 'animate-spin text-ppm-blue' : ''} />
                        </button>
                    </div>
                </div>
            </div>

            {/* ========================================================================= */}
            {/* STANDALONE WHITE MANDATORY DOCUMENT CONTAINER (SAMA PERSIS POLA RPJPD) */}
            {/* ========================================================================= */}
            <div className="card-modern bg-white border border-slate-100 shadow-xl shadow-slate-200/40 p-3.5">
                {/* Top strip: Document Selector Tabs in Pill Format */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 pb-2.5 border-b border-slate-100">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest shrink-0 flex items-center gap-1.5">
                            <FileText size={13} className="text-ppm-blue" />
                            DOKUMEN INTI:
                        </span>
                        <div className="relative inline-block min-w-[200px] max-w-xs">
                            <select
                                value={activeSlot?.id || ''}
                                onChange={(e) => setSelectedDocSlotId(Number(e.target.value))}
                                className="input-modern py-1 px-3 text-xs font-black text-slate-800 cursor-pointer w-full bg-slate-50 border-slate-200/80 rounded-xl focus:ring-1 focus:ring-blue-100"
                            >
                                {dokumenWajibList.map((slot) => {
                                    const hasFile = Boolean(slot.file_path);
                                    return (
                                        <option key={slot.id} value={slot.id}>
                                            {hasFile ? '✓ ' : '○ '} {slot.judul_dokumen} {hasFile ? '(Tersedia)' : '(Belum Ada)'}
                                        </option>
                                    );
                                })}
                            </select>
                        </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-2 self-end md:self-center">
                        <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400">
                            Kelengkapan:
                        </span>
                        <span className="px-2 py-0.5 rounded-lg text-[9px] font-black bg-emerald-50 text-emerald-700 border border-emerald-100">
                            {dokumenWajibList.filter(d => d.file_path).length}/{dokumenWajibList.length} Terpenuhi
                        </span>
                    </div>
                </div>

                {/* THE SINGLE SLIM WHITE ROW CONTAINER (PERSIS TATA LETAK & ELEGANSI RPJPD) */}
                {activeSlot && (
                    <div className="pt-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                                activeSlot.file_path 
                                    ? 'bg-blue-50 text-ppm-blue border-blue-100' 
                                    : 'bg-amber-50 text-amber-600 border-amber-200/60'
                            }`}>
                                <FileText size={18} />
                            </div>
                            <div className="min-w-0">
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                    <span>{activeSlot.judul_dokumen}</span>
                                    {activeSlot.file_path ? (
                                        <span className="text-[8px] font-black uppercase text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded">
                                            TERSEDIA
                                        </span>
                                    ) : (
                                        <span className="text-[8px] font-black uppercase text-amber-700 bg-amber-100 px-1.5 py-0.2 rounded">
                                            BELUM ADA
                                        </span>
                                    )}
                                </div>
                                {activeSlot.file_path ? (
                                    <div className="mt-0.5 space-y-0.5">
                                        <div className="flex items-baseline gap-2 truncate">
                                            <span className="text-xs font-bold text-slate-800 truncate" title={activeSlot.file_name || ''}>
                                                {activeSlot.file_name || 'Dokumen Terkait'}
                                            </span>
                                            {activeSlot.nomor_dokumen && (
                                                <span className="text-[10px] text-ppm-blue font-bold shrink-0">
                                                    (No: {activeSlot.nomor_dokumen})
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 text-[10px] text-slate-400 font-medium">
                                            <span className="flex items-center gap-1">
                                                <Calendar size={11} className="text-slate-400" />
                                                Diupload: {formatDate(activeSlot.doc_uploaded_at || activeSlot.updated_at)}
                                            </span>
                                            {(activeSlot.updater_name || activeSlot.updater_username) && (
                                                <>
                                                    <span>•</span>
                                                    <span className="flex items-center gap-1 text-slate-500 font-semibold">
                                                        <Users size={11} className="text-slate-400" />
                                                        Oleh: {activeSlot.updater_name || activeSlot.updater_username}
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <span className="text-xs text-slate-400 italic font-semibold mt-0.5 block">
                                        Belum ada dokumen yang diunggah untuk {activeSlot.judul_dokumen}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                            {/* History Perubahan Button (Always accessible to see modification logs) */}
                            <button
                                onClick={() => openHistoryModal(activeSlot)}
                                className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-ppm-blue bg-white border border-slate-200 hover:border-blue-200 hover:bg-slate-50 px-3 py-1.5 rounded-xl shadow-sm transition-all"
                                title="Lihat Riwayat Perubahan Dokumen"
                            >
                                <Clock size={13} strokeWidth={2.5} />
                                <span>Riwayat Perubahan</span>
                            </button>

                            {activeSlot.file_path && (
                                <>
                                    <a
                                        href={getFileUrl(activeSlot.file_path)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center justify-center p-2 text-ppm-blue hover:text-white bg-blue-50 hover:bg-ppm-blue border border-blue-200 hover:border-ppm-blue rounded-xl shadow-sm transition-all"
                                        title="Buka / Lihat Dokumen"
                                    >
                                        <Eye size={15} />
                                    </a>
                                    <button
                                        onClick={() => handleUnlink(activeSlot)}
                                        className="inline-flex items-center justify-center p-2 text-rose-600 hover:text-white bg-rose-50 hover:bg-rose-600 border border-rose-200 hover:border-rose-600 rounded-xl shadow-sm transition-all"
                                        title="Hapus Kaitan Dokumen"
                                    >
                                        <Trash2 size={15} />
                                    </button>
                                </>
                            )}

                            <button
                                onClick={() => openUploadModal(activeSlot)}
                                className="inline-flex items-center gap-1.5 text-xs font-bold bg-ppm-blue hover:bg-blue-700 text-white px-3 py-1.5 rounded-xl shadow-sm transition-all"
                            >
                                <Upload size={13} strokeWidth={2.5} />
                                <span>{activeSlot.file_path ? 'Ganti File' : 'File Baru'}</span>
                            </button>
                            <button
                                onClick={() => openLibraryPicker(activeSlot)}
                                className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-ppm-blue bg-white border border-slate-200 hover:border-blue-200 hover:bg-slate-50 px-3 py-1.5 rounded-xl shadow-sm transition-all"
                            >
                                <FolderOpen size={13} strokeWidth={2.5} />
                                <span>Dari Perpustakaan</span>
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* ========================================================================= */}
            {/* CONTENT VIEWS (PERSIS TATA LETAK DAFTAR KEGIATAN & DASHBOARD) */}
            {/* ========================================================================= */}

            {/* TAB NAVIGATION + SEARCH — satu kontainer, tab kiri, search kanan */}
            <div className="card-modern p-2 bg-white border border-slate-100 shadow-xl shadow-slate-200/40 flex items-center gap-2">
                {/* Tab pills - kiri */}
                <div className="flex items-center p-0.5 bg-slate-100/80 rounded-[1.75rem] border border-slate-200/50 overflow-x-auto scrollbar-none flex-1 min-w-0">
                    <button
                        onClick={() => setActiveTab('kegiatan')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-[1.5rem] font-black text-[9px] uppercase tracking-[0.1em] transition-all duration-300 shrink-0 ${
                            activeTab === 'kegiatan'
                                ? 'bg-white text-ppm-blue shadow-lg shadow-blue-100/50 ring-1 ring-blue-50'
                                : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
                        }`}
                    >
                        <Activity size={13} className={activeTab === 'kegiatan' ? 'text-ppm-blue' : ''} />
                        <span>Kegiatan</span>
                        <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full ${
                            activeTab === 'kegiatan' ? 'bg-blue-100 text-ppm-blue' : 'bg-slate-200 text-slate-600'
                        }`}>{stats?.totalKegiatan ?? 0}</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('dokumen')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-[1.5rem] font-black text-[9px] uppercase tracking-[0.1em] transition-all duration-300 shrink-0 ${
                            activeTab === 'dokumen'
                                ? 'bg-white text-ppm-blue shadow-lg shadow-blue-100/50 ring-1 ring-blue-50'
                                : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
                        }`}
                    >
                        <BookOpen size={13} />
                        <span>Dokumen</span>
                        <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full ${
                            activeTab === 'dokumen' ? 'bg-blue-100 text-ppm-blue' : 'bg-slate-200 text-slate-600'
                        }`}>{stats?.totalDokumen ?? 0}</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('surat')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-[1.5rem] font-black text-[9px] uppercase tracking-[0.1em] transition-all duration-300 shrink-0 ${
                            activeTab === 'surat'
                                ? 'bg-white text-ppm-blue shadow-lg shadow-blue-100/50 ring-1 ring-blue-50'
                                : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
                        }`}
                    >
                        <Mail size={13} />
                        <span>Surat</span>
                        <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full ${
                            activeTab === 'surat' ? 'bg-blue-100 text-ppm-blue' : 'bg-slate-200 text-slate-600'
                        }`}>{stats?.totalSurat ?? 0}</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('opd')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-[1.5rem] font-black text-[9px] uppercase tracking-[0.1em] transition-all duration-300 shrink-0 ${
                            activeTab === 'opd'
                                ? 'bg-white text-ppm-blue shadow-lg shadow-blue-100/50 ring-1 ring-blue-50'
                                : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
                        }`}
                    >
                        <Building2 size={13} />
                        <span>OPD Terkait</span>
                        <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full ${
                            activeTab === 'opd' ? 'bg-blue-100 text-ppm-blue' : 'bg-slate-200 text-slate-600'
                        }`}>{stats?.totalOpd ?? 0}</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('makro')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-[1.5rem] font-black text-[9px] uppercase tracking-[0.1em] transition-all duration-300 shrink-0 ${
                            activeTab === 'makro'
                                ? 'bg-white text-ppm-blue shadow-lg shadow-blue-100/50 ring-1 ring-blue-50'
                                : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
                        }`}
                    >
                        <BarChart2 size={13} />
                        <span>Data Makro</span>
                        <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full ${
                            activeTab === 'makro' ? 'bg-blue-100 text-ppm-blue' : 'bg-slate-200 text-slate-600'
                        }`}>{dataMakroList.length}</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('aplikasi')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-[1.5rem] font-black text-[9px] uppercase tracking-[0.1em] transition-all duration-300 shrink-0 ${
                            activeTab === 'aplikasi'
                                ? 'bg-white text-ppm-blue shadow-lg shadow-blue-100/50 ring-1 ring-blue-50'
                                : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
                        }`}
                    >
                        <Globe size={13} />
                        <span>Tautan</span>
                        <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full ${
                            activeTab === 'aplikasi' ? 'bg-blue-100 text-ppm-blue' : 'bg-slate-200 text-slate-600'
                        }`}>{aplikasiList.length}</span>
                    </button>
                </div>
                {/* Search — kanan, muncul sesuai tab aktif */}
                <div className="relative shrink-0 w-56">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <input
                        type="text"
                        className="input-modern w-full pl-9 py-2 text-xs"
                        placeholder={
                            activeTab === 'kegiatan' ? 'Cari kegiatan...' :
                            activeTab === 'dokumen' ? 'Cari dokumen...' :
                            activeTab === 'surat' ? 'Cari surat...' :
                            activeTab === 'opd' ? 'Cari OPD...' : 'Cari...'
                        }
                        value={
                            activeTab === 'kegiatan' ? searchKegiatan :
                            activeTab === 'dokumen' ? searchDokumen :
                            activeTab === 'surat' ? searchSurat :
                            activeTab === 'opd' ? searchOpd : ''
                        }
                        onChange={(e) => {
                            if (activeTab === 'kegiatan') setSearchKegiatan(e.target.value);
                            else if (activeTab === 'dokumen') setSearchDokumen(e.target.value);
                            else if (activeTab === 'surat') setSearchSurat(e.target.value);
                            else if (activeTab === 'opd') setSearchOpd(e.target.value);
                        }}
                    />
                </div>
            </div>



            {/* TAB 1: KEGIATAN & RAPAT KOORDINASI */}
            {activeTab === 'kegiatan' && (
                <div className="space-y-3">
                    {/* Table ala DaftarKegiatan */}
                    <div className="card-modern bg-white border border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                    <tr className="bg-slate-50/50 border-b border-slate-100">
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center w-28">Tanggal</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Nama Kegiatan</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">OPD Penyelenggara</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Kelengkapan</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center w-24">Notulen</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                                    {filteredKegiatan.length > 0 ? (
                                        filteredKegiatan.map((k) => (
                                            <tr key={k.id} className="hover:bg-slate-50/60 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap text-center text-slate-500">
                                                    <div className="font-bold text-slate-800">{formatDate(k.tanggal)}</div>
                                                    {k.sesi && <div className="text-[9px] text-slate-400 font-semibold">Sesi: {k.sesi}</div>}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="font-bold text-slate-900 leading-snug">{k.nama_kegiatan}</div>
                                                    {k.keterangan && (
                                                        <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{k.keterangan}</p>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="inline-block px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-[10px] font-bold">
                                                        {k.instansi_penyelenggara || 'Bapperida / Internal'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center justify-center gap-0.5">
                                                        {[
                                                            { path: k.surat_masuk_path, icon: <Mail size={13} />, color: 'emerald', label: 'Undangan Masuk' },
                                                            { path: k.surat_keluar_path, icon: <Send size={13} />, color: 'blue', label: 'Undangan Keluar' },
                                                            { path: k.bahan_desk_path, icon: <Briefcase size={13} />, color: 'orange', label: 'Bahan Desk' },
                                                            { path: k.paparan_path, icon: <Presentation size={13} />, color: 'purple', label: 'Paparan' },
                                                        ].map((item, idx, arr) => (
                                                            <React.Fragment key={idx}>
                                                                {item.path ? (
                                                                    <a
                                                                        href={getFileUrl(item.path)}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        title={item.label}
                                                                        className={`w-7 h-7 rounded-full flex items-center justify-center bg-${item.color}-50 text-${item.color}-600 border border-${item.color}-100 hover:scale-110 transition-all shadow-sm`}
                                                                    >
                                                                        {item.icon}
                                                                    </a>
                                                                ) : (
                                                                    <div
                                                                        title={`${item.label} (Belum ada)`}
                                                                        className="w-7 h-7 rounded-full flex items-center justify-center text-slate-300 bg-slate-50 border border-slate-100/50"
                                                                    >
                                                                        {item.icon}
                                                                    </div>
                                                                )}
                                                                {idx < arr.length - 1 && (
                                                                    <div className={`w-2 h-px ${item.path ? `bg-${item.color}-200` : 'bg-slate-100'}`} />
                                                                )}
                                                            </React.Fragment>
                                                        ))}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    {k.notulen_id ? (
                                                        <span className="inline-flex items-center gap-1 text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                                                            <Check size={11} strokeWidth={3} />
                                                            <span>Ada</span>
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-300 text-[10px] font-bold">-</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={5} className="py-12 text-center text-slate-400 text-xs italic">
                                                Belum ada kegiatan rapat atau desk yang di-tag ke tematik ini.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 2: PERPUSTAKAAN DOKUMEN */}
            {activeTab === 'dokumen' && (
                <div className="space-y-3">
                    <div className="card-modern bg-white border border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                    <tr className="bg-slate-50/50 border-b border-slate-100">
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Nama Dokumen</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Kategori / Jenis</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Ukuran</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tanggal Unggah</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Pengunggah</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center w-24">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                                    {filteredDokumen.length > 0 ? (
                                        filteredDokumen.map((doc) => (
                                            <tr key={doc.id} className="hover:bg-slate-50/60 transition-colors">
                                                <td className="px-6 py-4 max-w-sm">
                                                    <div className="flex items-center gap-2.5">
                                                        <FileText size={16} className="text-ppm-blue shrink-0" />
                                                        <span className="font-bold text-slate-900 truncate" title={doc.nama_file}>
                                                            {doc.nama_file}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[9px] font-black uppercase">
                                                        {doc.jenis_dokumen || 'Umum'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-slate-500 font-mono text-[11px]">
                                                    {formatBytes(doc.ukuran)}
                                                </td>
                                                <td className="px-6 py-4 text-slate-500">
                                                    {formatDate(doc.uploaded_at)}
                                                </td>
                                                <td className="px-6 py-4 text-slate-600">
                                                    {doc.uploader_name || doc.uploader_username || 'Sistem'}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <a
                                                        href={getFileUrl(doc.path)}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 hover:bg-ppm-blue text-ppm-blue hover:text-white rounded-lg text-[10px] font-bold transition-all shadow-sm"
                                                    >
                                                        <Eye size={12} />
                                                        <span>Buka</span>
                                                    </a>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={6} className="py-12 text-center text-slate-400 text-xs italic">
                                                Belum ada berkas perpustakaan yang ditautkan ke tematik ini.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 3: ARSIP PERSURATAN */}
            {activeTab === 'surat' && (
                <div className="space-y-3">
                    <div className="card-modern bg-white border border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                    <tr className="bg-slate-50/50 border-b border-slate-100">
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Nomor & Tanggal</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Perihal</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Asal / Tujuan</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center w-24">Lampiran</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                                    {filteredSurat.length > 0 ? (
                                        filteredSurat.map((s) => (
                                            <tr key={s.id} className="hover:bg-slate-50/60 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="font-bold text-slate-900">{s.nomor_surat}</div>
                                                    <div className="text-[10px] text-slate-400">{formatDate(s.tanggal_surat)}</div>
                                                </td>
                                                <td className="px-6 py-4 max-w-xs">
                                                    <div className="font-bold text-slate-800 leading-snug">{s.perihal}</div>
                                                    <span className="text-[9px] uppercase font-black text-slate-400">{s.tipe_surat}</span>
                                                </td>
                                                <td className="px-6 py-4 text-slate-600">
                                                    <div>Dari: <span className="font-semibold text-slate-800">{s.asal_surat}</span></div>
                                                    <div>Ke: <span className="font-semibold text-slate-800">{s.tujuan_surat}</span></div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase ${
                                                        s.approval_status === 'approved' 
                                                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                                                            : 'bg-slate-100 text-slate-600'
                                                    }`}>
                                                        {s.approval_status || 'Draft'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    {s.dokumen_path ? (
                                                        <a
                                                            href={getFileUrl(s.dokumen_path)}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="inline-flex items-center gap-1 text-[10px] font-bold text-ppm-blue hover:text-blue-800 bg-blue-50 px-2 py-1 rounded-lg transition-all"
                                                        >
                                                            <Eye size={12} />
                                                            <span>Lihat</span>
                                                        </a>
                                                    ) : (
                                                        <span className="text-slate-300 text-[10px] italic">-</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={5} className="py-12 text-center text-slate-400 text-xs italic">
                                                Belum ada arsip persuratan yang terhubung dengan tematik ini.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 4: PERANGKAT DAERAH (OPD) TERKAIT */}
            {activeTab === 'opd' && (
                <div className="space-y-3">
                    <div className="card-modern bg-white border border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                    <tr className="bg-slate-50/50 border-b border-slate-100">
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-16 text-center">No</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Nama Perangkat Daerah / Instansi</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center w-36">Total Kegiatan</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center w-36">Aktivitas Terakhir</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                                    {filteredOpd.length > 0 ? (
                                        filteredOpd.map((opd, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                                                <td className="px-6 py-4 text-center font-bold text-slate-400 font-mono text-[11px]">
                                                    {idx + 1}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="font-bold text-slate-900 leading-snug">{opd.nama_opd}</div>
                                                    {opd.singkatan_opd && (
                                                        <span className="text-[10px] text-ppm-blue font-semibold">({opd.singkatan_opd})</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className="px-2.5 py-0.5 bg-blue-50 text-ppm-blue rounded-full text-[10px] font-black">
                                                        {opd.total_kegiatan} Kegiatan
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-center text-slate-500 font-semibold">
                                                    {formatDate(opd.kegiatan_terakhir)}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={4} className="py-12 text-center text-slate-400 text-xs italic">
                                                Belum ada data keterlibatan Perangkat Daerah pada kegiatan tematik ini.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 5: DATA & INDIKATOR MAKRO */}
            {activeTab === 'makro' && (
                <div className="space-y-3">
                    <div className="card-modern bg-white border border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                    <tr className="bg-slate-50/50 border-b border-slate-100">
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-28">Kode</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Nama Indikator Makro</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Sumber Data</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center w-36">Nilai Terakhir</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center w-28">Satuan</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                                    {dataMakroList.length > 0 ? (
                                        dataMakroList.map((dm) => (
                                            <tr key={dm.id} className="hover:bg-slate-50/60 transition-colors">
                                                <td className="px-6 py-4 font-mono text-[11px] font-bold text-ppm-blue">
                                                    {dm.kode || '-'}
                                                </td>
                                                <td className="px-6 py-4 font-bold text-slate-900">
                                                    {dm.nama_data}
                                                </td>
                                                <td className="px-6 py-4 text-slate-500">
                                                    {dm.sumber_data || 'BPS / Sektoral'}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className="text-sm font-black text-slate-900 tabular-nums">
                                                        {dm.nilai_terakhir !== null && dm.nilai_terakhir !== undefined ? dm.nilai_terakhir : '-'}
                                                    </span>
                                                    {dm.tahun_terakhir && (
                                                        <span className="text-[10px] text-slate-400 block font-semibold">
                                                            Tahun {dm.tahun_terakhir}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-center font-bold text-slate-500">
                                                    {dm.satuan || '-'}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={5} className="py-12 text-center text-slate-400 text-xs italic">
                                                Belum ada indikator data makro yang dikaitkan ke tematik ini di menu Data Makro.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 6: TAUTAN & APLIKASI TERKAIT */}
            {activeTab === 'aplikasi' && (
                <div className="space-y-3">
                    <div className="card-modern bg-white border border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                    <tr className="bg-slate-50/50 border-b border-slate-100">
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Nama Aplikasi / Portal</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipe Link</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Pengembang / Sumber</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Keterangan</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center w-28">Akses</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                                    {aplikasiList.length > 0 ? (
                                        aplikasiList.map((app) => (
                                            <tr key={app.id} className="hover:bg-slate-50/60 transition-colors">
                                                <td className="px-6 py-4 font-bold text-slate-900">
                                                    {app.nama_aplikasi}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="px-2 py-0.5 bg-blue-50 text-ppm-blue rounded-md text-[9px] font-black uppercase">
                                                        {app.tipe_link || 'Aplikasi'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-slate-600">
                                                    {app.pembuat || app.sumber || 'Pemerintah'}
                                                </td>
                                                <td className="px-6 py-4 text-slate-400 text-[11px] max-w-xs truncate">
                                                    {app.keterangan || '-'}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <a
                                                        href={app.url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-1 px-3 py-1 bg-ppm-blue hover:bg-blue-700 text-white rounded-xl text-[10px] font-bold transition-all shadow-sm"
                                                    >
                                                        <span>Buka</span>
                                                        <ArrowUpRight size={12} />
                                                    </a>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={5} className="py-12 text-center text-slate-400 text-xs italic">
                                                Belum ada aplikasi eksternal yang di-tag ke tematik ini di Master Aplikasi External.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* MODAL 1: LIBRARY PICKER MODAL (ALA RPJPD) */}
            {/* ========================================================================= */}
            {isLibraryPickerOpen && (
                <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsLibraryPickerOpen(false)} />
                    <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
                            <div>
                                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Pilih Dari Perpustakaan</h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">
                                    Tautkan ke: {activeSlotForPicker?.judul_dokumen}
                                </p>
                            </div>
                            <button onClick={() => setIsLibraryPickerOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                                <X size={18} className="text-slate-400" />
                            </button>
                        </div>

                        <div className="p-4 border-b border-slate-100 bg-slate-50/50 shrink-0">
                            <div className="relative">
                                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    className="input-modern w-full pl-10 pr-4 py-2 text-xs font-medium"
                                    placeholder="Cari nama dokumen..."
                                    value={librarySearch}
                                    onChange={(e) => setLibrarySearch(e.target.value)}
                                    autoFocus
                                />
                            </div>
                        </div>

                        <div className="p-4 overflow-y-auto space-y-2 flex-1 bg-slate-50/20">
                            {loadingLibrary ? (
                                <div className="text-center py-8 text-slate-400 text-xs italic">
                                    Memuat dokumen perpustakaan...
                                </div>
                            ) : (
                                <>
                                    {libraryDocs
                                        .filter(doc => (doc.nama_file || '').toLowerCase().includes(librarySearch.toLowerCase()))
                                        .map(doc => (
                                            <div
                                                key={doc.id}
                                                onClick={() => handleSelectLibraryDoc(doc)}
                                                className="p-3 bg-white rounded-2xl border border-slate-100 hover:border-ppm-blue hover:bg-blue-50/10 transition-all cursor-pointer flex items-center justify-between group"
                                            >
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className="w-8 h-8 bg-blue-50 text-ppm-blue rounded-lg flex items-center justify-center shrink-0">
                                                        <FileText size={16} />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-xs font-bold truncate max-w-[280px] text-slate-700">{doc.nama_file}</p>
                                                        <p className="text-[9px] font-bold text-slate-400 uppercase">{doc.jenis_dokumen_nama || 'UMUM'}</p>
                                                    </div>
                                                </div>
                                                <button className="text-[10px] font-black uppercase text-ppm-blue group-hover:bg-ppm-blue group-hover:text-white bg-blue-50 px-2.5 py-1.5 rounded-lg transition-all">
                                                    Pilih
                                                </button>
                                            </div>
                                        ))}
                                    {libraryDocs.length === 0 && (
                                        <div className="text-center py-8 text-slate-400 text-xs italic">
                                            Belum ada dokumen yang tersedia di perpustakaan.
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end shrink-0">
                            <button
                                onClick={() => setIsLibraryPickerOpen(false)}
                                className="px-4 py-2 text-xs font-extrabold text-slate-500 hover:bg-slate-200 rounded-xl transition-all"
                            >
                                Batal
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* MODAL 2: UPLOAD DOKUMEN BARU (ALA RPJPD) */}
            {/* ========================================================================= */}
            {isUploadModalOpen && (
                <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => !uploading && setIsUploadModalOpen(false)} />
                    <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-200 flex flex-col">
                        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-50 text-ppm-blue rounded-xl">
                                    <Upload size={18} strokeWidth={2.5} />
                                </div>
                                <div>
                                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Upload Dokumen Wajib</h3>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">
                                        Slot: {activeSlotForUpload?.judul_dokumen}
                                    </p>
                                </div>
                            </div>
                            <button onClick={() => !uploading && setIsUploadModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                                <X size={18} className="text-slate-400" />
                            </button>
                        </div>

                        <form onSubmit={handleUploadSubmit} className="flex flex-col">
                            <div className="p-5 space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Pilih Berkas</label>
                                    <input
                                        type="file"
                                        accept=".pdf,.doc,.docx,.xls,.xlsx,.zip,.rar,.7z"
                                        onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                                        className="w-full text-xs text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-blue-50 file:text-ppm-blue hover:file:bg-blue-100 transition-all border border-slate-200 rounded-2xl p-2 bg-slate-50/50"
                                        required
                                    />
                                    <p className="text-[10px] text-slate-400 font-medium">Format didukung: PDF, Word (.doc, .docx), Excel (.xls, .xlsx), Zip, Rar.</p>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Nomor Dokumen / SK</label>
                                        <input
                                            type="text"
                                            value={uploadNomorDokumen}
                                            onChange={(e) => setUploadNomorDokumen(e.target.value)}
                                            placeholder="Contoh: 050/Kep.123/2026"
                                            className="input-modern text-xs"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Tahun Berlaku</label>
                                        <input
                                            type="number"
                                            value={uploadTahun}
                                            onChange={(e) => setUploadTahun(e.target.value ? Number(e.target.value) : '')}
                                            placeholder="2026"
                                            className="input-modern text-xs"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Tanggal Penetapan / Pengesahan</label>
                                    <input
                                        type="date"
                                        value={uploadTanggal}
                                        onChange={(e) => setUploadTanggal(e.target.value)}
                                        className="input-modern text-xs"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Catatan / Ringkasan Dokumen</label>
                                    <textarea
                                        rows={2}
                                        value={uploadKeterangan}
                                        onChange={(e) => setUploadKeterangan(e.target.value)}
                                        placeholder="Catatan tambahan mengenai dokumen ini..."
                                        className="input-modern text-xs resize-none"
                                    />
                                </div>
                            </div>

                            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2 shrink-0">
                                <button
                                    type="button"
                                    onClick={() => !uploading && setIsUploadModalOpen(false)}
                                    disabled={uploading}
                                    className="px-4 py-2 text-xs font-extrabold text-slate-500 hover:bg-slate-200 rounded-xl transition-all"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={uploading || !uploadFile}
                                    className="px-5 py-2 text-xs font-black bg-ppm-blue hover:bg-blue-700 text-white rounded-xl shadow-md shadow-blue-500/20 transition-all disabled:opacity-50 flex items-center gap-1.5"
                                >
                                    {uploading ? (
                                        <>
                                            <RefreshCw size={13} className="animate-spin" />
                                            <span>Mengunggah...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Upload size={13} strokeWidth={2.5} />
                                            <span>Simpan & Tautkan</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* MODAL 3: RIWAYAT PERUBAHAN DOKUMEN (ALA RPJPD) */}
            {/* ========================================================================= */}
            {isHistoryModalOpen && (
                <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsHistoryModalOpen(false)} />
                    <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
                        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-50 text-ppm-blue rounded-xl">
                                    <Clock size={18} strokeWidth={2.5} />
                                </div>
                                <div>
                                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Riwayat Perubahan Dokumen</h3>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">
                                        {activeSlotForHistory?.judul_dokumen}
                                    </p>
                                </div>
                            </div>
                            <button onClick={() => setIsHistoryModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                                <X size={18} className="text-slate-400" />
                            </button>
                        </div>

                        <div className="p-5 overflow-y-auto flex-1 space-y-3">
                            {loadingHistory ? (
                                <div className="text-center py-8 text-slate-400 text-xs italic">
                                    Memuat riwayat perubahan...
                                </div>
                            ) : historyLogs.length > 0 ? (
                                historyLogs.map((log) => (
                                    <div key={log.id} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1.5">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-black uppercase text-ppm-blue bg-blue-50 px-2 py-0.5 rounded-md">
                                                {log.action}
                                            </span>
                                            <span className="text-[10px] text-slate-400 font-semibold">
                                                {formatDate(log.created_at)}
                                            </span>
                                        </div>
                                        <div className="text-xs font-bold text-slate-800">
                                            {log.file_name}
                                        </div>
                                        <div className="text-[10px] text-slate-500 flex items-center gap-1.5">
                                            <span>Oleh: <strong>{log.uploader_name}</strong></span>
                                            {log.uploader_nip && <span>(NIP: {log.uploader_nip})</span>}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-8 text-slate-400 text-xs italic">
                                    Belum ada catatan riwayat perubahan untuk dokumen ini.
                                </div>
                            )}
                        </div>

                        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end shrink-0">
                            <button
                                onClick={() => setIsHistoryModalOpen(false)}
                                className="px-4 py-2 text-xs font-extrabold text-slate-500 hover:bg-slate-200 rounded-xl transition-all"
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

export default TematikHubPage;
