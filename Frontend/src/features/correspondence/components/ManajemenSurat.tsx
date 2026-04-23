import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { api } from '@/src/services/api';
import { useAuth } from '@/src/contexts/AuthContext';
import { 
    Mail, 
    Inbox, 
    Send, 
    Plus, 
    Search, 
    FileText, 
    Clock, 
    ChevronRight, 
    Filter,
    Download,
    Eye,
    LayoutGrid,
    List,
    MoreHorizontal,
    FilePlus,
    Building2,
    Calendar,
    Settings,
    FileIcon,
    Loader2,
    AlertCircle,
    CheckCircle2,
    Check,
    X, 
    Upload, 
    User, 
    Edit2, 
    Save, 
    RotateCcw, 
    Trash2 
} from 'lucide-react';
import { SearchableSelect } from '@/src/features/common/components/SearchableSelect';
import { DocumentViewerModal } from '@/src/components/modals/DocumentViewerModal';
import { SuratRegistrationModal } from '@/src/components/modals/SuratRegistrationModal';

interface SuratItem {
    id: number;
    nomor_surat: string;
    perihal: string;
    asal_surat: string;
    tujuan_surat: string | null;
    tanggal_surat: string;
    tanggal_acara: string | null;
    tipe_surat: 'masuk' | 'keluar';
    dokumen_id: number;
    bidang_id: number;
    nama_bidang: string | null;
    singkatan_bidang: string | null;
    nama_file: string | null;
    file_path: string | null;
    jenis_surat_id: number | null;
    jenis_surat_nama: string | null;
    nama_kegiatan_terkait: string | null;
    kegiatan_id_terkait: number | null;
    tematik_terkait: string | null;
}

interface MasterDokumen {
    id: number;
    dokumen: string;
    jenis_dokumen_id: number;
}

interface BidangItem {
    id: number;
    nama_bidang: string;
    singkatan: string | null;
    instansi_id: number | null;
}

interface InstansiItem {
    id: number;
    instansi: string;
}

interface KegiatanItem {
    id: number;
    tanggal: string;
    nama_kegiatan: string;
    instansi_penyelenggara: string;
}

export default function ManajemenSurat() {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<'masuk' | 'keluar'>('masuk');
    
    // New Filters for Superadmin/Global View
    const [filterInstansiId, setFilterInstansiId] = useState<number | 'all'>('all');
    const [filterBidangId, setFilterBidangId] = useState<number | 'all'>('all');
    
    const [suratList, setSuratList] = useState<SuratItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

    // Modal States
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalType, setModalType] = useState<'masuk' | 'keluar'>('masuk');
    const [editingItem, setEditingItem] = useState<SuratItem | null>(null);
    const [showTrashModal, setShowTrashModal] = useState(false);

    // Preview States
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [previewFileUrl, setPreviewFileUrl] = useState<string | null>(null);
    const [previewFileName, setPreviewFileName] = useState<string | null>(null);

    // Action Menu States (Smart Position)
    const [activeMenuId, setActiveMenuId] = useState<number | null>(null);
    const [menuCoords, setMenuCoords] = useState<{ x: number, y: number, width: number, direction: 'up' | 'down' } | null>(null);
    const actionMenuRef = useRef<HTMLDivElement>(null);

    // Master Data States
    const [bidangList, setBidangList] = useState<BidangItem[]>([]);
    const [instansiList, setInstansiList] = useState<InstansiItem[]>([]);
    const [jenisSuratList, setJenisSuratList] = useState<MasterDokumen[]>([]);

    useEffect(() => {
        fetchSurat();
        fetchMasterData();
    }, [activeTab, filterInstansiId, filterBidangId]);

    const fetchSurat = async () => {
        try {
            setIsLoading(true);
            const params: any = {};
            if (filterInstansiId !== 'all') params.instansi_id = filterInstansiId;
            if (filterBidangId !== 'all') params.bidang_id = filterBidangId;

            const res = await api.surat.getAll(params); // Fetch with filters
            if (res.success) {
                setSuratList(res.data);
            }
        } catch (err) {
            console.error('Failed to fetch surat:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchMasterData = async () => {
        try {
            const [bidangRes, instansiRes, jenisDokRes, masterDokRes] = await Promise.all([
                api.bidangInstansi.getAll(),
                api.instansiDaerah.getAll(),
                api.jenisDokumen.getAll(),
                api.masterDataConfig.getDataByTable('master_dokumen')
            ]);
            
            if (bidangRes.success) {
                let list = bidangRes.data;
                const isAdmin = user?.tipe_user_id === 1;
                
                if (isAdmin) {
                    if (filterInstansiId !== 'all') {
                        list = list.filter((b: any) => b.instansi_id === filterInstansiId);
                    }
                } else {
                    list = list.filter((b: any) => b.instansi_id === user?.instansi_id);
                }
                setBidangList(list);
            }

            if (instansiRes.success) {
                setInstansiList(instansiRes.data);
            }

            if (jenisDokRes.success && masterDokRes.success) {
                const suratType = jenisDokRes.data.find((j: any) => j.nama === 'Surat');
                if (suratType) {
                    const filtered = masterDokRes.data.filter((d: any) => d.jenis_dokumen_id === suratType.id);
                    setJenisSuratList(filtered);
                }
            }
        } catch (err) {
            console.error('Failed to fetch master data:', err);
        }
    };

    const handleOpenModal = (type: 'masuk' | 'keluar', editingItem?: SuratItem) => {
        setModalType(type);
        setEditingItem(editingItem || null);
        setIsModalOpen(true);
        setActiveMenuId(null);
    };

    const handleModalSuccess = (res: any) => {
        alert(editingItem ? 'Surat berhasil diperbarui!' : (modalType === 'masuk' ? 'Surat masuk berhasil dicatat!' : 'Surat berhasil dibuat dan diarsipkan!'));
        setIsModalOpen(false);
        fetchSurat();
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Apakah Anda yakin ingin menghapus catatan surat ini?')) return;
        
        try {
            const res = await api.surat.delete(id);
            if (res.success) {
                alert('Surat berhasil dihapus.');
                fetchSurat();
            } else {
                alert('Gagal menghapus: ' + res.message);
            }
        } catch (err) {
            console.error('Delete error:', err);
        }
    };

    const handlePreview = (surat: SuratItem) => {
        setPreviewFileUrl(surat.file_path);
        setPreviewFileName(surat.nama_file);
        setIsPreviewOpen(true);
        setActiveMenuId(null);
    };

    const handleActionMenuClick = (e: React.MouseEvent, surat: SuratItem) => {
        e.stopPropagation();
        if (activeMenuId === surat.id) {
            setActiveMenuId(null);
            return;
        }

        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;
        const menuHeight = 100; // Estimated height for 2 items

        const direction = (spaceBelow < menuHeight && spaceAbove > spaceBelow) ? 'up' : 'down';
        
        setMenuCoords({
            x: rect.right,
            y: direction === 'down' ? rect.bottom + 8 : rect.top - 8,
            width: 140,
            direction
        });
        setActiveMenuId(surat.id);
    };

    // Close menu on click outside or scroll
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (activeMenuId && actionMenuRef.current && !actionMenuRef.current.contains(event.target as Node)) {
                setActiveMenuId(null);
            }
        };
        const handleScroll = () => setActiveMenuId(null);

        if (activeMenuId) {
            document.addEventListener('mousedown', handleClickOutside);
            window.addEventListener('scroll', handleScroll, true);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            window.removeEventListener('scroll', handleScroll, true);
        };
    }, [activeMenuId]);

    const SuratStatusBadge = ({ item }: { item: SuratItem }) => (
        <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                item.tipe_surat === 'masuk' 
                ? 'bg-blue-50 text-blue-600 border border-blue-100' 
                : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
            }`}>
                {item.tipe_surat}
            </span>
            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded uppercase">
                {item.singkatan_bidang || item.nama_bidang || 'N/A'}
            </span>
            {item.jenis_surat_nama && (
                <span className="text-[10px] font-bold text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 uppercase">
                    {item.jenis_surat_nama}
                </span>
            )}
        </div>
    );

    const filteredSurat = suratList.filter(s => {
        // Robust filtering: check for existence before toLowerCase/includes
        const matchSearch = !searchQuery || 
            (s.nomor_surat?.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (s.perihal?.toLowerCase().includes(searchQuery.toLowerCase()));
        
        // Filter by active tab (masuk/keluar)
        const matchType = s.tipe_surat === activeTab;
        
        return matchType && matchSearch;
    });

    const totalSurat = suratList.length;
    const suratMasukCount = suratList.filter(s => s.tipe_surat === 'masuk').length;
    const suratKeluarCount = suratList.filter(s => s.tipe_surat === 'keluar').length;

    return (
        <div className="space-y-2.5 p-4 pt-2">
            {/* Header Section with Compact Stats */}
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="flex-1">
                    <div className="flex flex-col md:flex-row md:items-start gap-4">
                        {/* Title Section */}
                        <div className="flex-1">
                            <div className="flex items-start gap-3">
                                <div className="w-10 h-10 bg-ppm-slate rounded-xl flex items-center justify-center text-white shadow-lg shadow-ppm-slate/20 shrink-0">
                                    <Mail size={22} />
                                </div>
                                <div>
                                    <h1 className="text-2xl font-black text-slate-800 tracking-tight">
                                        Manajemen Surat
                                    </h1>
                                    <p className="text-slate-500 text-sm font-medium mt-1">
                                        Kelola arsip surat masuk dan pembuatan surat keluar otomatis.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                {/* Horizontal Stats and Action Buttons */}
                <div className="flex flex-col md:flex-row items-start md:items-stretch gap-4">
                    {/* Navigation Tabs (Moved Up) */}
                    <div className="flex bg-slate-100/80 p-1 rounded-2xl w-fit border border-slate-200/50 shadow-inner">
                        <button 
                            onClick={() => setActiveTab('masuk')}
                            className={`px-6 py-2 rounded-xl font-black transition-all text-xs uppercase tracking-widest ${
                                activeTab === 'masuk' 
                                ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200' 
                                : 'text-slate-500 hover:text-slate-800'
                            }`}
                        >
                            Surat Masuk
                        </button>
                        <button 
                            onClick={() => setActiveTab('keluar')}
                            className={`px-6 py-2 rounded-xl font-black transition-all text-xs uppercase tracking-widest ${
                                activeTab === 'keluar' 
                                ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200' 
                                : 'text-slate-500 hover:text-slate-800'
                            }`}
                        >
                            Surat Keluar
                        </button>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex items-stretch gap-2 shrink-0 relative z-10">
                        <button 
                            onClick={() => handleOpenModal(activeTab)}
                            className="flex items-center gap-2 px-6 py-1.5 bg-ppm-slate text-white rounded-xl font-bold text-[13px] hover:shadow-lg hover:shadow-ppm-slate/30 transition-all active:scale-95 h-full"
                        >
                            <Plus size={16} strokeWidth={3} />
                            {activeTab === 'masuk' ? 'Registrasi Surat Masuk' : 'Buat Surat Keluar'}
                        </button>
                        <button 
                            onClick={() => setShowTrashModal(true)}
                            className="flex items-center justify-center w-10 bg-slate-100 text-slate-500 rounded-xl hover:bg-rose-50 hover:text-rose-600 transition-all active:scale-95 border border-slate-200"
                            title="Tempat Sampah"
                        >
                            <Trash2 size={18} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Navigation & Filters */}
            <div className="bg-white p-1.5 rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/40">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Stats Card (Moved Down) */}
                    <div className="flex items-center gap-4 bg-slate-50 p-1 rounded-2xl border border-slate-200/50 shadow-inner">
                        <div className="flex items-center gap-2 px-3">
                            <div className="w-7 h-7 bg-white text-ppm-slate rounded-lg flex items-center justify-center shrink-0 shadow-sm border border-slate-100">
                                <FileText size={12} />
                            </div>
                            <div>
                                <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest leading-none">Total</p>
                                <p className="text-xs font-black text-slate-800 tabular-nums">{totalSurat}</p>
                            </div>
                        </div>
                        <div className="w-px h-6 bg-slate-200/50"></div>
                        <div className="flex items-center gap-2 px-3">
                            <div className="w-7 h-7 bg-blue-500 text-white rounded-lg flex items-center justify-center shrink-0 shadow-sm">
                                <Inbox size={12} />
                            </div>
                            <div>
                                <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest leading-none">Masuk</p>
                                <p className="text-xs font-black text-slate-800 tabular-nums">{suratMasukCount}</p>
                            </div>
                        </div>
                        <div className="w-px h-6 bg-slate-200/50"></div>
                        <div className="flex items-center gap-2 px-3">
                            <div className="w-7 h-7 bg-emerald-500 text-white rounded-lg flex items-center justify-center shrink-0 shadow-sm">
                                <Send size={12} />
                            </div>
                            <div>
                                <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest leading-none">Keluar</p>
                                <p className="text-xs font-black text-slate-800 tabular-nums">{suratKeluarCount}</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col md:flex-row items-center gap-3 flex-1 lg:justify-end pr-2">
                        {/* Superadmin Agency Filter */}
                        {user?.tipe_user_id === 1 && (
                            <div className="w-full md:w-56">
                                <SearchableSelect
                                    label="Instansi"
                                    placeholder="Filter Instansi"
                                    value={filterInstansiId === 'all' ? null : filterInstansiId}
                                    options={[{ id: 'all', instansi: 'Semua Instansi' }, ...instansiList]}
                                    displayField="instansi"
                                    onChange={(val) => {
                                        setFilterInstansiId(val === 'all' ? 'all' : Number(val));
                                        setFilterBidangId('all'); // Reset bidang filter when agency changes
                                    }}
                                />
                            </div>
                        )}

                        {/* Bidang Filter (Available to Superadmin & Admin Instansi) */}
                        <div className="w-full md:w-56">
                            <SearchableSelect
                                label="Bidang"
                                placeholder="Semua Bidang"
                                value={filterBidangId === 'all' ? null : filterBidangId}
                                options={[{ id: 'all', nama_bidang: 'Semua Bidang' }, ...bidangList]}
                                displayField="nama_bidang"
                                secondaryField="singkatan"
                                onChange={(val) => setFilterBidangId(val === 'all' ? 'all' : Number(val))}
                            />
                        </div>

                        <div className="flex items-center gap-3 w-full md:w-auto">
                            <div className="relative flex-1 md:w-64 group">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={16} />
                                <input 
                                    type="text" 
                                    placeholder="Cari surat / perihal..."
                                    className="w-full pl-11 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white transition-all font-bold text-slate-700 text-xs shadow-inner"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                            
                            <div className="flex items-center bg-slate-100/80 p-1 rounded-2xl border border-slate-200/50 shadow-inner">
                                <button 
                                    onClick={() => setViewMode('list')}
                                    className={`p-1.5 rounded-xl transition-all ${viewMode === 'list' ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
                                    title="List View"
                                >
                                    <List size={16} />
                                </button>
                                <button 
                                    onClick={() => setViewMode('grid')}
                                    className={`p-1.5 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
                                    title="Grid View"
                                >
                                    <LayoutGrid size={16} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* List Section */}
            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-slate-100 shadow-xl">
                    <Loader2 className="animate-spin text-ppm-slate mb-4" size={40} />
                    <p className="text-slate-500 font-extrabold text-sm uppercase tracking-widest">Memuat Data Surat...</p>
                </div>
            ) : filteredSurat.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-slate-100 shadow-xl text-center px-6">
                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-6 border-4 border-white shadow-inner">
                        <FileText size={40} />
                    </div>
                    <h3 className="text-xl font-black text-slate-800 mb-2">Belum ada surat terdaftar</h3>
                    <p className="text-slate-500 max-w-xs font-medium">Klik tombol di atas untuk mulai mencatat surat masuk atau membuat surat baru.</p>
                </div>
            ) : (
                <div className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/40 relative overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="bg-slate-50/50 border-b border-slate-100 text-left">
                                    <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Informasi Surat</th>
                                    <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Kegiatan Terkait</th>
                                    <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">File Dokumen</th>
                                    <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Asal Surat</th>
                                    <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tanggal</th>
                                    <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {filteredSurat.map((surat) => (
                                    <tr key={surat.id} className="group hover:bg-slate-50/80 transition-all">
                                        <td className="px-4 py-3">
                                            <div className="flex items-start gap-4">
                                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                                                    surat.tipe_surat === 'masuk' ? 'bg-blue-50 text-blue-500' : 'bg-emerald-50 text-emerald-500'
                                                }`}>
                                                    <FileIcon size={18} />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-black text-slate-800 truncate mb-0.5">{surat.nomor_surat}</p>
                                                    <p className="text-[11px] font-bold text-slate-500 leading-tight line-clamp-2">{surat.perihal}</p>
                                                    <div className="flex items-center gap-2 mt-2">
                                                        <SuratStatusBadge item={surat} />
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-col gap-1.5">
                                                <div className="flex items-center gap-2 text-slate-600">
                                                    <div className="p-1.5 bg-indigo-50 text-indigo-500 rounded-lg shrink-0">
                                                        <List size={11} strokeWidth={3} />
                                                    </div>
                                                    <span className={`text-[11px] font-black leading-tight max-w-[140px] truncate ${surat.nama_kegiatan_terkait ? 'text-slate-900' : 'text-slate-400 italic font-medium'}`}>
                                                        {surat.nama_kegiatan_terkait || 'Bebas'}
                                                    </span>
                                                </div>
                                                {surat.tematik_terkait && (
                                                    <div className="flex flex-wrap gap-1">
                                                        {surat.tematik_terkait.split(',').map((tag, idx) => (
                                                            <span key={idx} className="text-[8px] font-black uppercase tracking-tighter bg-indigo-100/50 text-indigo-600 px-1.5 py-0.5 rounded-md border border-indigo-200/50 leading-none">
                                                                {tag.trim()}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div 
                                                onClick={() => handlePreview(surat)}
                                                className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-2 -m-2 rounded-xl transition-all group/file"
                                                title="Klik untuk Pratinjau"
                                            >
                                                <div className="p-2 bg-slate-50 rounded-lg text-slate-400 group-hover/file:bg-ppm-slate group-hover/file:text-white transition-all shadow-sm">
                                                    <FileText size={16} />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-[11px] font-bold text-slate-600 break-all max-w-[180px] group-hover/file:text-ppm-blue transition-colors leading-tight" title={surat.nama_file || 'Dokumen'}>
                                                        {surat.nama_file || 'Tidak ada file'}
                                                    </p>
                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">
                                                        {(surat.nama_file?.split('.').pop() || 'PDF').toUpperCase()}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2 text-slate-600">
                                                <Building2 size={16} className="text-slate-400" />
                                                <span className="text-xs font-bold truncate max-w-[150px]">
                                                    {surat.tipe_surat === 'masuk' ? surat.asal_surat : surat.tujuan_surat}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2 text-slate-600">
                                                    <Calendar size={14} className="text-slate-400" />
                                                    <span className="text-[11px] font-bold">
                                                        {new Date(surat.tanggal_surat).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                    </span>
                                                </div>
                                                {surat.tanggal_acara && (
                                                    <div className="flex items-center gap-2 text-ppm-slate font-bold">
                                                        <Clock size={14} />
                                                        <span className="text-[10px] uppercase">
                                                            Acara: {new Date(surat.tanggal_acara).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex items-center justify-end gap-2 transition-opacity">
                                                <button 
                                                    onClick={() => handlePreview(surat)}
                                                    className="p-2 bg-ppm-slate/5 text-ppm-slate hover:bg-ppm-slate hover:text-white rounded-xl transition-all" 
                                                    title="Pratinjau Dokumen"
                                                >
                                                    <Eye size={18} />
                                                </button>
                                                <a 
                                                    href={surat.file_path || '#'} 
                                                    download={surat.nama_file || 'dokumen'} 
                                                    className="p-2 bg-slate-100 text-slate-500 hover:bg-slate-200 rounded-xl transition-all" 
                                                    title="Unduh"
                                                >
                                                    <Download size={18} />
                                                </a>
                                                <div className="relative">
                                                    <button 
                                                        onClick={(e) => handleActionMenuClick(e, surat)}
                                                        className={`p-2 rounded-xl transition-all ${activeMenuId === surat.id ? 'bg-ppm-slate text-white' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
                                                    >
                                                        <MoreHorizontal size={18} />
                                                    </button>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Modal Form */}
            <SuratRegistrationModal 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={handleModalSuccess}
                initialData={editingItem}
                defaultType={modalType}
                user={user}
            />
            {/* Smart Action Menu Portal */}
            {activeMenuId && menuCoords && createPortal(
                <div 
                    ref={actionMenuRef}
                    className="fixed z-[9999] bg-white rounded-2xl shadow-2xl border border-slate-100 py-2 animate-in fade-in zoom-in-95 duration-200"
                    style={{
                        top: `${menuCoords.y}px`,
                        left: `${menuCoords.x - menuCoords.width}px`,
                        width: `${menuCoords.width}px`,
                        transform: menuCoords.direction === 'up' ? 'translateY(-100%)' : 'none'
                    }}
                >
                    <button 
                        onClick={() => {
                            const surat = suratList.find(s => s.id === activeMenuId);
                            if (surat) handleOpenModal(surat.tipe_surat, surat);
                            setActiveMenuId(null);
                        }}
                        className="w-full px-4 py-2.5 text-left text-xs font-black text-slate-600 hover:bg-slate-50 flex items-center gap-2 transition-colors"
                    >
                        <Edit2 size={14} className="text-blue-500" />
                        Ubah Data
                    </button>
                    <button 
                        onClick={() => {
                            handleDelete(activeMenuId);
                            setActiveMenuId(null);
                        }}
                        className="w-full px-4 py-2.5 text-left text-xs font-black text-rose-500 hover:bg-rose-50 flex items-center gap-2 transition-colors"
                    >
                        <Trash2 size={14} />
                        Hapus Surat
                    </button>
                </div>,
                document.body
            )}

            {/* Preview Modal */}
            <DocumentViewerModal 
                isOpen={isPreviewOpen}
                onClose={() => setIsPreviewOpen(false)}
                fileUrl={previewFileUrl}
                fileName={previewFileName || 'Dokumen'}
            />


            {/* Trash View Modal */}
            <TrashViewModal 
                isOpen={showTrashModal}
                onClose={() => setShowTrashModal(false)}
                onRestore={() => fetchSurat()} // Refresh list when something is restored
            />
        </div>
    );
}

// Sub-component for Trash View
const TrashViewModal = ({ isOpen, onClose, onRestore }: { isOpen: boolean, onClose: () => void, onRestore: () => void }) => {
    const [trashItems, setTrashItems] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchTrash = async () => {
        setIsLoading(true);
        setError(null);
        try {
            // Filter by "surat" keyword as requested
            const res = await api.dokumen.getTrash('surat');
            if (res.success) {
                setTrashItems(res.data);
            } else {
                setError(res.message);
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) fetchTrash();
    }, [isOpen]);

    const handleRestore = async (id: number) => {
        try {
            const res = await api.dokumen.restore(id);
            if (res.success) {
                fetchTrash();
                onRestore();
            } else {
                alert(res.message);
            }
        } catch (err: any) {
            alert(err.message);
        }
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-4xl bg-white rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center shadow-sm">
                            <Trash2 size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-slate-800 tracking-tight">Tempat Sampah Surat</h2>
                            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-0.5">Dokumen terhapus (Kategori: Surat)</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-slate-600 hover:border-slate-300 transition-all active:scale-95"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 min-h-0 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                            <Loader2 className="animate-spin text-rose-500" size={40} />
                            <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Memuat Data Sampah...</p>
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center py-20 text-rose-500 bg-rose-50 rounded-3xl border border-rose-100 italic gap-2">
                            <AlertCircle size={32} />
                            <p className="font-bold">{error}</p>
                        </div>
                    ) : trashItems.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-300 gap-4">
                            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center border-4 border-white shadow-inner">
                                <Trash2 size={40} />
                            </div>
                            <p className="text-sm font-black uppercase tracking-widest text-slate-400">Tempat sampah kosong</p>
                        </div>
                    ) : (
                        <div className="grid gap-3">
                            {trashItems.map((item) => (
                                <div key={item.id} className="flex items-center gap-4 p-4 bg-slate-50 rounded-[24px] border border-slate-100 hover:bg-white hover:border-indigo-200 transition-all group">
                                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-slate-400 border border-slate-100 shadow-sm group-hover:text-indigo-500 transition-colors">
                                        <FileText size={20} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-bold text-slate-700 truncate">{item.nama_file}</h4>
                                        <div className="flex items-center gap-3 mt-1">
                                            <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded uppercase tracking-tight">
                                                {item.jenis_dokumen_nama}
                                            </span>
                                            <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                                                <Clock size={10} />
                                                Dihapus: {new Date(item.deleted_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                            </span>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => handleRestore(item.id)}
                                        className="px-4 py-2 bg-white text-indigo-600 rounded-xl font-bold text-xs border border-indigo-100 hover:bg-indigo-600 hover:text-white transition-all active:scale-95 shadow-sm"
                                    >
                                        Pulihkan
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                
                {/* Footer */}
                <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end">
                    <button 
                        onClick={onClose}
                        className="px-8 py-2.5 bg-slate-800 text-white rounded-2xl font-bold text-sm hover:bg-slate-700 transition-all active:scale-95 shadow-lg shadow-slate-200"
                    >
                        Tutup
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};
