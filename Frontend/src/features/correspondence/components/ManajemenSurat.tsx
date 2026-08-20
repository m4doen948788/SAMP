import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { api, API_URL } from '@/src/services/api';

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
    FastForward,
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
    Trash2,
    History,
    Printer,
    ZoomIn,
    ZoomOut,
    Undo,
    Database
} from 'lucide-react';
import { SearchableSelect } from '@/src/features/common/components/SearchableSelect';
import { DocumentViewerModal } from '@/src/components/modals/DocumentViewerModal';
import { SuratRegistrationModal } from '@/src/components/modals/SuratRegistrationModal';
import { getPaperDimensions, getLetterContentStyle } from '../utils/letterComposers';
import { toast } from 'react-hot-toast';

interface SuratItem {
    id: number;
    nomor_surat: string;
    perihal: string;
    asal_surat: string;
    tujuan_surat: string | null;
    tanggal_surat: string;
    tanggal_acara: string | null;
    tipe_surat: 'masuk' | 'keluar' | 'internal';
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
    master_dokumen_id?: number | null;
    instansi_id?: number | null;
    approval_status?: 'WAITING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'RETURNED' | 'CANCELLED';
    approval_chain?: any[];
    isi_surat?: string;
    nama_pengusul?: string;
    metadata?: string | any;
    sifat?: string;
    lampiran?: string;
    margin_top?: number;
    margin_bottom?: number;
    margin_left?: number;
    margin_right?: number;
    paper_size?: string;
    font_size?: number;
    line_height?: number;
    text_align?: string;
    verification_slug?: string;
    is_deleted?: number;
    edit_history?: any[];
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

interface ManajemenSuratProps {
    onNavigate?: (page: string) => void;
}

const TrashViewModal = ({ isOpen, onClose, onRestore }: { isOpen: boolean, onClose: () => void, onRestore: () => void }) => {
    const [trashItems, setTrashItems] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchTrash = async () => {
        setIsLoading(true);
        setError(null);
        try {
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
                toast.error(res.message);
            }
        } catch (err: any) {
            toast.error(err.message);
        }
    };

    const handlePermanentDelete = async (id: number) => {
        if (!window.confirm('Hapus dokumen ini secara permanen? Aksi ini tidak dapat dibatalkan.')) return;
        try {
            const res = await api.dokumen.permanentDelete(id);
            if (res.success) {
                fetchTrash();
                toast.success('Dokumen berhasil dihapus permanen');
            } else {
                toast.error(res.message);
            }
        } catch (err: any) {
            toast.error(err.message);
        }
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-4xl bg-white rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
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
                                <div key={item.id} className="flex items-center gap-4 p-4 bg-slate-50 rounded-[24px] border border-slate-100 hover:bg-white hover:border-ppm-blue/30 transition-all group">
                                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-slate-400 border border-slate-100 shadow-sm group-hover:text-ppm-blue transition-colors">
                                        <FileText size={20} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-bold text-slate-700 truncate">{item.nama_file}</h4>
                                        <div className="flex items-center gap-3 mt-1">
                                            <span className="text-[10px] font-black text-ppm-blue bg-ppm-blue/10 px-2 py-0.5 rounded uppercase tracking-tight">
                                                {item.jenis_dokumen_nama}
                                            </span>
                                            <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                                                <Clock size={10} />
                                                Dihapus: {new Date(item.deleted_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button 
                                            onClick={() => handleRestore(item.id)}
                                            className="px-4 py-2 bg-white text-ppm-blue rounded-xl font-bold text-xs border border-ppm-blue/20 hover:bg-ppm-blue hover:text-white transition-all active:scale-95 shadow-sm"
                                        >
                                            Pulihkan
                                        </button>
                                        <button 
                                            onClick={() => handlePermanentDelete(item.id)}
                                            className="p-2 bg-white text-rose-500 rounded-xl font-bold text-xs border border-rose-100 hover:bg-rose-500 hover:text-white transition-all active:scale-95 shadow-sm"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
};

const FinalUploadModal = ({ isOpen, onClose, onConfirm, file, fileName, setFileName, isSubmitting }: any) => {
    if (!isOpen || !file) return null;
    const extension = file.name.split('.').pop();

    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white rounded-[2rem] w-full max-w-md overflow-hidden shadow-2xl border border-white/20 animate-in zoom-in-95 duration-300">
                <div className="px-6 py-4 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                            <Upload size={20} />
                        </div>
                        <div>
                            <h3 className="font-black text-slate-800 tracking-tight">Unggah Dokumen Final</h3>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Konfirmasi nama file sistem</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white rounded-xl text-slate-400 hover:text-rose-500 transition-all">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-4">
                        <div className="p-3 bg-white rounded-2xl shadow-sm text-slate-400">
                            <FileText size={24} />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-xs font-black text-slate-700 truncate">{file.name}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">File Terpilih</p>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-ppm-blue uppercase tracking-widest ml-1">Nama File di Sistem</label>
                        <div className="flex items-center gap-2">
                            <input 
                                type="text" 
                                className="w-full h-10 px-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-ppm-blue/10 focus:border-ppm-blue focus:bg-white transition-all font-black text-slate-700 text-sm"
                                value={fileName}
                                onChange={(e) => setFileName(e.target.value)}
                                placeholder="Masukkan nama file..."
                            />
                            <div className="h-10 px-3 bg-slate-100 border border-slate-200 rounded-xl flex items-center justify-center text-xs font-bold text-slate-400">
                                .{extension}
                            </div>
                        </div>
                        <p className="text-[9px] font-bold text-slate-400 ml-1 italic">* Ekstensi file dikunci demi integritas data</p>
                    </div>
                </div>

                <div className="p-6 bg-slate-50/50 border-t border-slate-50 flex items-center justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 rounded-xl font-bold text-xs text-slate-500 hover:bg-white transition-all">Batal</button>
                    <button 
                        onClick={onConfirm}
                        disabled={isSubmitting || !fileName.trim()}
                        className="px-6 py-2 rounded-xl bg-emerald-600 text-white font-black text-sm shadow-lg shadow-emerald-600/20 flex items-center gap-2 hover:bg-emerald-700 transition-all active:scale-95 disabled:opacity-50"
                    >
                        {isSubmitting ? <><Loader2 size={14} className="animate-spin" /> Mengunggah...</> : <><Check size={14} strokeWidth={3} /> Unggah Sekarang</>}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default function ManajemenSurat({ onNavigate }: ManajemenSuratProps) {
    const { user } = useAuth();
    const isSuperAdmin = user?.tipe_user_id === 1;
    const isAdminInstansi = user?.tipe_user_id === 2 || (user?.tipe_user_nama || '').toLowerCase().includes('admin instansi');
    const isSekretaris = (user?.jabatan_nama || '').toLowerCase().includes('sekretaris');
    const isArsiparis = (user?.jabatan_nama || '').toLowerCase().includes('arsiparis') || 
                        (user?.tipe_user_nama || '').toLowerCase().includes('arsiparis');
    const isAdmin = isSuperAdmin || isAdminInstansi || isSekretaris;
    const canDelete = isSuperAdmin || isArsiparis;
    
    const BASE_VERIFY_URL = import.meta.env.VITE_DASHBOARD_PUBLIC_URL || import.meta.env.VITE_VERIFY_URL || window.location.origin; 

    const getPremiumQrUrl = (data: string, logoUrl?: string) => {
        const encodedData = encodeURIComponent(data);
        
        // Normalize logo path (remove the base URL if present to get relative path for backend)
        let relativeLogo = logoUrl || '';
        if (relativeLogo.startsWith(window.location.origin)) {
            relativeLogo = relativeLogo.replace(window.location.origin, '');
        }
        
        // Ensure it's a relative path starting with /
        if (relativeLogo && !relativeLogo.startsWith('/') && !relativeLogo.startsWith('http')) {
            relativeLogo = '/' + relativeLogo;
        }

        const encodedLogo = relativeLogo ? encodeURIComponent(relativeLogo) : '';
        
        // Use our local backend QR generator
        // Format: /api/public/qr/generate?text=...&logo=...&size=...
        const baseUrl = API_URL.endsWith('/api') ? API_URL.substring(0, API_URL.length - 4) : API_URL;
        return `${baseUrl}/api/public/qr/generate?text=${encodedData}${encodedLogo ? `&logo=${encodedLogo}` : ''}&size=300`;
    };


    // Repair logic for old/hardcoded QR URLs in existing documents
    const repairOldQrUrls = (html: string, logoUrl?: string) => {
        if (!html) return html;
        return html.replace(
            /https:\/\/api\.qrserver\.com\/v1\/create-qr-code\/\?size=150x150&data=([^"'\s&]+)/g,
            (match, encodedData) => {
                try {
                    const decodedData = decodeURIComponent(encodedData);
                    const slugMatch = decodedData.match(/[?&]v=([^&]+)/);
                    if (slugMatch) {
                        const slug = slugMatch[1];
                        const newVerifyUrl = `${BASE_VERIFY_URL}${BASE_VERIFY_URL.endsWith('/') ? '' : '/'}?v=${slug}`;
                        return getPremiumQrUrl(newVerifyUrl, logoUrl);
                    }
                } catch (e) {}
                return match;
            }
        );
    };
    const [activeTab, setActiveTab] = useState<'masuk' | 'keluar' | 'internal'>('internal');
    
    const [filterInstansiId, setFilterInstansiId] = useState<number | 'all'>('all');
    const [filterBidangId, setFilterBidangId] = useState<number | 'all'>(user?.bidang_id || 'all');
    
    const [suratList, setSuratList] = useState<SuratItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
    const [viewTrash, setViewTrash] = useState<'active' | 'trash'>('active');

    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    useEffect(() => {
        setCurrentPage(1);
    }, [activeTab, searchQuery, filterInstansiId, filterBidangId, viewTrash]);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalType, setModalType] = useState<'masuk' | 'keluar' | 'internal'>('masuk');
    const [editingItem, setEditingItem] = useState<SuratItem | null>(null);
    const [showTrashModal, setShowTrashModal] = useState(false);

    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [previewFileUrl, setPreviewFileUrl] = useState<string | null>(null);
    const [previewFileName, setPreviewFileName] = useState<string | null>(null);
    const [previewZoom, setPreviewZoom] = useState(0.7);
    
    const [isHtmlPreviewOpen, setIsHtmlPreviewOpen] = useState(false);
    const [previewHtml, setPreviewHtml] = useState<string>('');
    const [previewLayout, setPreviewLayout] = useState({
        marginTop: 20,
        marginBottom: 20,
        marginLeft: 30,
        marginRight: 20,
        paperSize: 'A4',
        fontSize: 12,
        lineHeight: 1.5,
        textAlign: 'justify',
        fontFamily: 'Arial, sans-serif',
        paragraphSpacingBefore: 0,
        paragraphSpacingAfter: 0,
        firstLineIndent: 0
    });

    const [activeMenuId, setActiveMenuId] = useState<number | null>(null);
    const [menuCoords, setMenuCoords] = useState<{ x: number, y: number, width: number, direction: 'up' | 'down' } | null>(null);
    const actionMenuRef = useRef<HTMLDivElement>(null);

    const [hoveredApprovalChain, setHoveredApprovalChain] = useState<{ x: number, y: number, chain: any[], subject: string, bidang_id?: number } | null>(null);
    const [hoveredEditHistory, setHoveredEditHistory] = useState<{ x: number, y: number, history: any[], subject: string } | null>(null);
    const [historyStyle, setHistoryStyle] = useState<React.CSSProperties>({ visibility: 'hidden' });
    const [auditStyle, setAuditStyle] = useState<React.CSSProperties>({ visibility: 'hidden' });
    const historyRef = useRef<HTMLDivElement>(null);
    const auditRef = useRef<HTMLDivElement>(null);
    const tooltipTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    useLayoutEffect(() => {
        if (hoveredApprovalChain && historyRef.current) {
            const rect = historyRef.current.getBoundingClientRect();
            let left = hoveredApprovalChain.x;
            let top = hoveredApprovalChain.y - 15;
            let tx = '-50%';
            let ty = '-100%';

            if (left - rect.width / 2 < 20) {
                left = 20;
                tx = '0%';
            } else if (left + rect.width / 2 > window.innerWidth - 20) {
                left = window.innerWidth - rect.width - 20;
                tx = '0%';
            }

            if (top - rect.height < 20) {
                top = hoveredApprovalChain.y + 15;
                ty = '0%';
            }

            setHistoryStyle({
                left: `${left}px`,
                top: `${top}px`,
                transform: `translateX(${tx}) translateY(${ty})`,
                visibility: 'visible'
            });
        } else {
            setHistoryStyle({ visibility: 'hidden' });
        }

        if (hoveredEditHistory && auditRef.current) {
            const rect = auditRef.current.getBoundingClientRect();
            let left = hoveredEditHistory.x;
            let top = hoveredEditHistory.y - 15;
            let tx = '-50%';
            let ty = '-100%';

            if (left - rect.width / 2 < 20) {
                left = 20;
                tx = '0%';
            } else if (left + rect.width / 2 > window.innerWidth - 20) {
                left = window.innerWidth - rect.width - 20;
                tx = '0%';
            }

            if (top - rect.height < 20) {
                top = hoveredEditHistory.y + 15;
                ty = '0%';
            }

            setAuditStyle({
                left: `${left}px`,
                top: `${top}px`,
                transform: `translateX(${tx}) translateY(${ty})`,
                visibility: 'visible',
                opacity: 1
            });
        } else if (hoveredEditHistory) {
            // Force visible if data exists but ref not ready yet (next tick will fix position)
            setAuditStyle({ visibility: 'visible', opacity: 0 });
        } else {
            setAuditStyle({ visibility: 'hidden', opacity: 0 });
        }
    }, [hoveredApprovalChain, hoveredEditHistory]);

    const handleBadgeMouseEnter = (e: React.MouseEvent, item: SuratItem) => {
        if (tooltipTimeoutRef.current) clearTimeout(tooltipTimeoutRef.current);
        setHoveredEditHistory(null); // Force close edit history
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        
        let chain = [];
        try {
            chain = typeof item.approval_chain === 'string' ? JSON.parse(item.approval_chain) : item.approval_chain;
        } catch (e) {
            chain = [];
        }

        if (!chain || chain.length === 0) return;

        setHoveredApprovalChain({
            x: rect.left + rect.width / 2,
            y: rect.top,
            chain: chain.filter((c: any) => c && c.role),
            subject: item.perihal,
            bidang_id: item.bidang_id
        });
    };

    const handleBadgeMouseLeave = () => {
        startTooltipHideTimer();
    };

    const handleHistoryMouseEnter = (e: React.MouseEvent, item: SuratItem) => {
        if (tooltipTimeoutRef.current) clearTimeout(tooltipTimeoutRef.current);
        setHoveredApprovalChain(null); // Force close approval chain
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        
        let history = item.edit_history || [];
        
        // Synthesize initial "Created" history if empty
        if (history.length === 0) {
            history = [{
                aksi: 'create',
                keterangan: 'Surat dicatat di sistem',
                created_at: (item as any).created_at || new Date().toISOString(),
                user_nama: (item as any).creator_nama || 'System',
                user_bidang: item.singkatan_bidang || '-'
            }];
        }

        setHoveredEditHistory({
            x: rect.left + rect.width / 2,
            y: rect.top,
            history: history,
            subject: item.perihal
        });
    };

    const handleHistoryMouseLeave = () => {
        startTooltipHideTimer();
    };

    const handleTooltipMouseEnter = () => {
        if (tooltipTimeoutRef.current) clearTimeout(tooltipTimeoutRef.current);
    };

    const handleTooltipMouseLeave = () => {
        startTooltipHideTimer();
    };

    const startTooltipHideTimer = () => {
        if (tooltipTimeoutRef.current) clearTimeout(tooltipTimeoutRef.current);
        tooltipTimeoutRef.current = setTimeout(() => {
            setHoveredApprovalChain(null);
            setHoveredEditHistory(null);
        }, 300); // Reduced delay for snappier feel
    };

    const handleBypass = async (approvalId: number, name: string) => {
        const reason = window.prompt(`Lompati tahap persetujuan untuk ${name}? Masukkan alasan (opsional):`, 'Pejabat berhalangan (Sakit/Cuti)');
        
        if (reason === null) return; 

        try {
            const data = await api.suratApprovals.bypass(approvalId, reason);
            if (data.success) {
                toast.success('Tahap persetujuan berhasil dilompati');
                fetchSurat();
                setHoveredApprovalChain(null); 
            } else {
                toast.error(data.message || 'Gagal melewati tahap persetujuan');
            }
        } catch (error) {
            console.error('Error bypassing approval:', error);
            toast.error('Terjadi kesalahan koneksi');
        }
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            if (historyRef.current && !historyRef.current.contains(target)) {
                setHoveredApprovalChain(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const [bidangList, setBidangList] = useState<BidangItem[]>([]);
    const [instansiList, setInstansiList] = useState<InstansiItem[]>([]);
    const [jenisSuratList, setJenisSuratList] = useState<MasterDokumen[]>([]);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploadingSuratId, setUploadingSuratId] = useState<number | null>(null);
    const [finalUploadFile, setFinalUploadFile] = useState<File | null>(null);
    const [finalFileName, setFinalFileName] = useState('');
    const [isProcessingUpload, setIsProcessingUpload] = useState(false);

    const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !uploadingSuratId) return;
        setFinalUploadFile(file);
        setFinalFileName(file.name.split('.').slice(0, -1).join('.'));
    };

    const processUploadFinal = async () => {
        if (!finalUploadFile || !uploadingSuratId || !finalFileName.trim()) return;

        const surat = suratList.find(s => s.id === uploadingSuratId);
        const fallbackJenis = jenisSuratList.length > 0 ? jenisSuratList[0].id : 1;
        const matchedJenis = jenisSuratList.find(j => j.dokumen === surat?.jenis_surat_nama);
        const finalJenisId = surat?.master_dokumen_id || matchedJenis?.id || fallbackJenis;

        try {
            setIsProcessingUpload(true);
            const formData = new FormData();
            formData.append('file', finalUploadFile);
            
            const extension = finalUploadFile.name.split('.').pop();
            const finalSystemName = `${finalFileName}.${extension}`;
            formData.append('nama_file', finalSystemName);
            formData.append('jenis_dokumen_id', String(finalJenisId));

            const docRes = await api.dokumen.upload(formData);
            if (docRes.success) {
                const docId = docRes.data.id;
                await api.suratApprovals.uploadFinal(uploadingSuratId, docId);
                toast.success('Dokumen final berhasil diunggah!');
                setFinalUploadFile(null);
                setUploadingSuratId(null);
                fetchSurat(); 
            } else {
                toast.error(docRes.message || 'Gagal mengunggah dokumen');
            }
        } catch (err) {
            toast.error('Gagal mengunggah dokumen final');
        } finally {
            setIsProcessingUpload(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    useEffect(() => {
        fetchMasterData();
    }, [filterInstansiId]);

    useEffect(() => {
        fetchSurat();
    }, [filterInstansiId, filterBidangId]);

    const fetchSurat = async () => {
        try {
            setIsLoading(true);
            const params: any = {};
            if (filterInstansiId !== 'all') params.instansi_id = filterInstansiId;
            if (filterBidangId !== 'all') params.bidang_id = filterBidangId;

            const res = await api.surat.getAll(params); 
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

    const handleOpenModal = (type: 'masuk' | 'keluar' | 'internal', editingItem?: SuratItem) => {
        setModalType(type);
        setEditingItem(editingItem || null);
        setIsModalOpen(true);
        setActiveMenuId(null);
    };

    const handleDelete = async (id: number) => {
        const surat = suratList.find(s => s.id === id);
        const isFinal = surat?.approval_status === 'APPROVED';
        
        const message = isFinal 
            ? 'PERHATIAN: Surat ini sudah FINAL dan memiliki QR Code verifikasi. Menghapus surat ini akan membubuhkan status "DIBATALKAN" secara permanen pada sistem verifikasi. Apakah Anda yakin ingin membatalkan dokumen resmi ini?'
            : 'Apakah Anda yakin ingin menghapus catatan surat ini?';

        if (!window.confirm(message)) return;
        
        try {
            const res = await api.surat.delete(id);
            if (res.success) {
                toast.success(isFinal ? 'Dokumen resmi telah dibatalkan.' : 'Surat berhasil dihapus.');
                fetchSurat();
            } else {
                toast.error('Gagal menghapus: ' + res.message);
            }
        } catch (err) {
            console.error('Delete error:', err);
        }
    };

    const handleRestoreSurat = async (id: number) => {
        if (!window.confirm('Apakah Anda yakin ingin memulihkan kembali surat ini?')) return;
        try {
            const res = await api.dokumen.restore(-id); // negative id marker for surat
            if (res.success) {
                toast.success('Surat berhasil dipulihkan.');
                fetchSurat();
            } else {
                toast.error('Gagal memulihkan: ' + res.message);
            }
        } catch (err) {
            console.error('Restore error:', err);
            toast.error('Terjadi kesalahan saat memulihkan surat.');
        }
    };

    const handlePermanentDeleteSurat = async (id: number) => {
        if (!window.confirm('PERHATIAN: Menghapus surat ini secara permanen akan menghilangkan seluruh data surat dan dokumen fisiknya dari server secara permanen. Tindakan ini tidak dapat dibatalkan. Apakah Anda benar-benar yakin?')) return;
        try {
            const res = await api.dokumen.permanentDelete(-id); // negative id marker for surat
            if (res.success) {
                toast.success('Surat telah dihapus secara permanen.');
                fetchSurat();
            } else {
                toast.error('Gagal menghapus: ' + res.message);
            }
        } catch (err) {
            console.error('Permanent delete error:', err);
            toast.error('Terjadi kesalahan saat menghapus surat.');
        }
    };

    const [globalSettings, setGlobalSettings] = useState<any>(null);

    useEffect(() => {
        const fetchGlobal = async () => {
            const res = await api.suratTemplate.getGlobal();
            if (res.success) setGlobalSettings(res.data);
        };
        fetchGlobal();
    }, []);

    const handlePreview = async (surat: SuratItem) => {
        let template = null;
        if (surat.jenis_surat_id) {
            const tRes = await api.suratTemplate.getById(surat.jenis_surat_id);
            if (tRes.success) template = tRes.data;
        }

        const useGlobal = !!template?.use_global_settings;
        const source = useGlobal && globalSettings ? globalSettings : (template || surat);

        const fSize = source.font_size ?? 12;
        const lHeight = source.line_height ?? 1.5;
        const tAlign = source.text_align ?? 'justify';
        const pBefore = template?.paragraph_spacing_before || (useGlobal ? globalSettings?.paragraph_spacing_before : 0) || 0;
        const pAfter = template?.paragraph_spacing_after || (useGlobal ? globalSettings?.paragraph_spacing_after : 0) || 0;
        const pIndent = template?.first_line_indent || (useGlobal ? globalSettings?.first_line_indent : 0) || 0;

        setPreviewLayout({
            marginTop: source.margin_top ?? 20,
            marginBottom: source.margin_bottom ?? 20,
            marginLeft: source.margin_left ?? 30,
            marginRight: source.margin_right ?? 20,
            paperSize: source.paper_size ?? 'A4',
            fontSize: fSize,
            lineHeight: lHeight,
            textAlign: tAlign,
            fontFamily: source.font_family || (useGlobal && globalSettings?.font_family) || 'Arial, sans-serif',
            paragraphSpacingBefore: pBefore,
            paragraphSpacingAfter: pAfter,
            firstLineIndent: pIndent
        });

        if (surat.file_path) {
            setPreviewFileUrl(surat.file_path);
            setPreviewFileName(surat.nama_file);
            setIsPreviewOpen(true);
        } else if (surat.isi_surat) {
            let fullHtml = surat.isi_surat;
            try {
                const instRes = await api.internalInstansi.get(user.instansi_id);
                const isCuti = (surat.perihal || '').toLowerCase().includes('cuti') || 
                              (surat.jenis_surat_nama || '').toLowerCase().includes('cuti') ||
                              template?.has_detail_cuti;
                
                let inst: any = {};
                const showKop = template ? template.is_kop_surat_required : true;
                const useLeftKop = isCuti || template?.logo_path === 'none';

                if (instRes.success && instRes.data && instRes.data.instansiDetail) {
                    inst = instRes.data.instansiDetail;
                }

                let kopHtml = '';
                if (showKop && inst.nama_instansi_kop) {
                    if (useLeftKop) {
                        kopHtml = `
                            <div style="text-align: left; font-weight: bold; margin-bottom: 2rem; text-transform: uppercase; line-height: 1.25;">
                                PEMERINTAH DAERAH KABUPATEN BOGOR<br/>
                                <span style="text-decoration: underline;">${String(inst?.nama_instansi_kop || inst?.instansi || '')}</span>
                            </div>
                        `;
                    } else {
                        const lineStyle = template?.kop_line_style || 'double';
                        let borderHtml = '';
                        if (lineStyle === 'single') {
                            borderHtml = '<div style="border-bottom: 1.5pt solid #000; margin-top: 4pt;"></div>';
                        } else if (lineStyle === 'thick') {
                            borderHtml = '<div style="border-bottom: 3pt solid #000; margin-top: 4pt;"></div>';
                        } else if (lineStyle === 'double') {
                            borderHtml = `
                                <div style="border-bottom: 2.25pt solid #000; margin-top: 4pt;"></div>
                                <div style="border-bottom: 0.75pt solid #000; margin-top: 2pt;"></div>
                            `;
                        } else if (lineStyle === 'heavy-light' || lineStyle === 'light-heavy') {
                            const top = lineStyle === 'heavy-light' ? '2.25pt' : '0.75pt';
                            const bottom = lineStyle === 'heavy-light' ? '0.75pt' : '2.25pt';
                            borderHtml = `
                                <div style="border-bottom: ${top} solid #000; margin-top: 4pt;"></div>
                                <div style="border-bottom: ${bottom} solid #000; margin-top: 2pt;"></div>
                            `;
                        } else if (lineStyle !== 'none') {
                            borderHtml = '<div style="border-bottom: 1.5pt solid #000; margin-top: 4pt;"></div>';
                        }

                        kopHtml = `
                            <div style="text-align: center; margin-bottom: 25px; position: relative;">
                                <table style="width: 100%; border-collapse: collapse; margin-bottom: 2px;">
                                    <tr>
                                        <td style="width: 80px; text-align: left; vertical-align: middle; padding-right: 15px;">
                                            ${inst.logo_kop_path ? `<img src="${inst.logo_kop_path}" style="width: 75px; height: auto; display: block;" />` : ''}
                                        </td>
                                        <td style="text-align: center; vertical-align: middle; padding-right: 40px;">
                                            <div style="font-size: 13pt; font-weight: bold; line-height: 1.1; text-transform: uppercase;">PEMERINTAH KABUPATEN BOGOR</div>
                                            <div style="font-size: 15pt; font-weight: bold; line-height: 1.1; text-transform: uppercase;">
                                                ${(inst.nama_instansi_kop || inst.instansi || '').toUpperCase().replace(' RISET', '<br/>RISET')}
                                            </div>
                                            <div style="font-size: 7pt; font-weight: normal; margin-top: 4px; line-height: 1.2;">
                                                ${inst.alamat || ''} Kode Pos ${inst.kode_pos || ''} Telp: ${inst.telepon_kop || ''} Faks: ${inst.faks_kop || ''}<br/>
                                                Laman: ${inst.website_kop || '-'} | Pos-el: ${inst.email_kop || '-'}
                                            </div>
                                        </td>
                                    </tr>
                                </table>
                                ${borderHtml}
                            </div>
                        `;
                    }

                    const dateStr = new Date(surat.tanggal_surat).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
                    const kec = (inst.kecamatan || 'Cibinong').charAt(0).toUpperCase() + (inst.kecamatan || 'Cibinong').slice(1).toLowerCase();
                    
                    const metaTableHtml = isCuti ? '' : `
                        <table style="width: 100%; border-collapse: collapse; margin-bottom: 2rem; font-family: ${source.font_family || 'Arial, sans-serif'}; font-size: 12pt;">
                            <tr style="vertical-align: top;">
                                <td style="width: 15%;">Nomor</td>
                                <td style="width: 2%;">:</td>
                                <td style="width: 48%;">${surat.nomor_surat || '...'}</td>
                                <td style="width: 35%;">Kepada</td>
                            </tr>
                            <tr style="vertical-align: top;">
                                <td>Sifat</td>
                                <td>:</td>
                                <td>${surat.sifat || 'Biasa'}</td>
                                <td rowspan="3" style="padding-top: 0;">
                                    Yth. ${surat.tujuan_surat || '...'}<br/>
                                    di<br/>
                                    <span style="display: inline-block; margin-left: 1.5rem;">${inst.lokasi || 'Tempat'}</span>
                                </td>
                            </tr>
                            <tr style="vertical-align: top;">
                                <td>Lampiran</td>
                                <td>:</td>
                                <td>${surat.lampiran || '-'}</td>
                            </tr>
                            <tr style="vertical-align: top;">
                                <td>Hal</td>
                                <td>:</td>
                                <td><strong>${surat.perihal || '...'}</strong></td>
                            </tr>
                        </table>
                    `;

                    const verifyUrl = `${String(import.meta.env.VITE_DASHBOARD_PUBLIC_URL || import.meta.env.VITE_VERIFY_URL || window.location.origin)}?v=${surat.verification_slug || ''}`;
                    const logoForQr = typeof inst?.logo_kop_path === 'string' ? inst.logo_kop_path : '';
                    const qrValue = surat.verification_slug ? verifyUrl : "PREVIEW_ONLY";
                    
                    // Footer QR (Bottom left of page) - STYLED TO MATCH SURATMAKER
                    const footerQrHtml = `
                        <div style="position: absolute; bottom: 5mm; left: 5mm; z-index: 50;">
                            <div style="padding: 4px; background: white; border: 1px solid #f1f5f9; border-radius: 4px; box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05); display: flex; align-items: center; justify-content: center;">
                                <img src="${getPremiumQrUrl(qrValue, logoForQr)}" style="width: 60px; height: 60px; display: block;" />
                            </div>
                        </div>
                    `;


                    fullHtml = `
                        ${kopHtml}
                        <div style="text-align: right; margin-bottom: 20px; font-family: ${source.font_family || 'Arial, sans-serif'}; font-size: ${fSize}pt;">
                            ${kec}, ${dateStr}
                        </div>
                        ${metaTableHtml}
                        <div id="letter-content" style="font-family: ${useGlobal && globalSettings ? globalSettings.font_family : (template?.font_family || 'Arial, sans-serif')}; font-size: ${fSize}pt; line-height: ${lHeight}; text-align: ${tAlign};">
                            <style>
                                ${getLetterContentStyle({
                                    paragraph_spacing_before: pBefore,
                                    paragraph_spacing_after: pAfter,
                                    first_line_indent: pIndent
                                })}
                            </style>
                            ${surat.isi_surat || ''}
                        </div>
                        ${footerQrHtml}
                        ${(() => {
                            let meta = null;
                            try {
                                meta = typeof surat.metadata === 'string' ? JSON.parse(surat.metadata) : surat.metadata;
                            } catch(e) {}
                            
                            if (meta && meta.eventData) {
                                const ed = meta.eventData;
                                return `
                                    <div style="margin-top: 20px; font-family: Arial, sans-serif; font-size: 12pt;">
                                        <table style="width: 100%; border-collapse: collapse;">
                                            <tr style="vertical-align: top;">
                                                <td style="width: 18%;">Hari/Tanggal</td>
                                                <td style="width: 2%;">:</td>
                                                <td style="width: 80%; font-weight: bold;">${ed.hari_tanggal || '...'}</td>
                                            </tr>
                                            <tr style="vertical-align: top;">
                                                <td>Waktu</td>
                                                <td>:</td>
                                                <td>${ed.waktu || '...'}</td>
                                            </tr>
                                            <tr style="vertical-align: top;">
                                                <td>Tempat</td>
                                                <td>:</td>
                                                <td>
                                                    ${ed.tempat || '...'}
                                                    ${ed.tipe === 'Online' && ed.link ? `<br/>Link: <span style="color: blue; text-decoration: underline;">${ed.link}</span>` : ''}
                                                </td>
                                            </tr>
                                            <tr style="vertical-align: top;">
                                                <td>Agenda</td>
                                                <td>:</td>
                                                <td>${ed.agenda || '...'}</td>
                                            </tr>
                                        </table>
                                    </div>
                                `;
                            }
                            return '';
                        })()}
                    `;
                }
            } catch (err) {
                console.error('Error fetching instance for preview:', err);
            }
            
            let logoPathInternal = undefined;
            try {
                const res = await api.internalInstansi.get(user.instansi_id);
                if (res.success) logoPathInternal = res.data.instansiDetail?.logo_kop_path;
            } catch (e) {}

            setPreviewHtml(repairOldQrUrls(fullHtml, logoPathInternal));
            setPreviewFileName(surat.perihal || 'Draft Surat');
            setIsHtmlPreviewOpen(true);
        } else {
            toast.error('File fisik atau draft surat tidak tersedia.');
        }
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
        const menuHeight = 120; 

        const direction = (spaceBelow < menuHeight && spaceAbove > spaceBelow) ? 'up' : 'down';
        
        setMenuCoords({
            x: rect.right,
            y: direction === 'down' ? rect.bottom + 8 : rect.top - 8,
            width: 150,
            direction
        });
        setActiveMenuId(surat.id);
    };

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

    const SuratStatusBadge = ({ item }: { item: SuratItem }) => {
        const getApprovalConfig = (status: string, isFullLabel = true, currentRole?: string) => {
            switch (status) {
                case 'WAITING_APPROVAL':
                    const roleLabel = currentRole ? currentRole.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) : (isFullLabel ? 'Persetujuan' : 'MENUNGGU');
                    return { 
                        label: isFullLabel ? `Menunggu ${roleLabel}` : `MENUNGGU ${roleLabel.toUpperCase()}`, 
                        bg: 'bg-amber-50', 
                        text: 'text-amber-600', 
                        border: 'border-amber-200' 
                    };
                case 'APPROVED':
                    return { 
                        label: isFullLabel ? 'Disetujui' : 'DISETUJUI', 
                        bg: 'bg-emerald-50', 
                        text: 'text-emerald-600', 
                        border: 'border-emerald-200' 
                    };
                case 'REJECTED':
                    return { 
                        label: isFullLabel ? 'Ditolak' : 'DITOLAK', 
                        bg: 'bg-rose-50', 
                        text: 'text-rose-600', 
                        border: 'border-rose-200' 
                    };
                case 'RETURNED':
                    return { 
                        label: isFullLabel ? 'Dikembalikan' : 'DIKEMBALIKAN', 
                        bg: 'bg-orange-50', 
                        text: 'text-orange-600', 
                        border: 'border-orange-200' 
                    };
                case 'CANCELLED':
                    return { 
                        label: isFullLabel ? 'Batal' : 'BATAL', 
                        bg: 'bg-slate-100', 
                        text: 'text-slate-500', 
                        border: 'border-slate-200' 
                    };
                default:
                    return { 
                        label: status, 
                        bg: 'bg-slate-50', 
                        text: 'text-slate-600', 
                        border: 'border-slate-200' 
                    };
            }
        };

        let currentPendingRole = '';
        if (item.approval_status === 'WAITING_APPROVAL') {
            try {
                const chain = typeof item.approval_chain === 'string' ? JSON.parse(item.approval_chain) : item.approval_chain;
                if (Array.isArray(chain)) {
                    const sortedChain = [...chain].sort((a, b) => a.urutan - b.urutan);
                    const current = sortedChain.find(c => c.status !== 'APPROVED');
                    if (current) {
                        currentPendingRole = current.role;
                    }
                }
            } catch (e) {
                console.error('Error parsing approval chain:', e);
            }
        }

        const appConfig = getApprovalConfig(item.approval_status || 'WAITING_APPROVAL', true, currentPendingRole);
        
        return (
            <div className="flex items-center gap-2">
                {appConfig && (
                    <div 
                        className="group relative flex items-center"
                        onMouseEnter={(e) => handleBadgeMouseEnter(e, item)}
                        onMouseLeave={handleBadgeMouseLeave}
                    >
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase border ${appConfig.bg} ${appConfig.text} ${appConfig.border} flex items-center gap-1 cursor-help transition-all hover:scale-105 active:scale-95 shadow-sm`}>
                            {item.approval_status === 'WAITING_APPROVAL' && <Clock size={8} />}
                            {item.approval_status === 'APPROVED' && <CheckCircle2 size={8} />}
                            {(item.approval_status === 'REJECTED' || item.approval_status === 'RETURNED') && <AlertCircle size={8} />}
                            {appConfig.label}
                        </span>
                    </div>
                )}

                {item.jenis_surat_nama && (
                    <span 
                        className="text-[8px] font-bold text-ppm-blue bg-ppm-blue/10 px-1.5 py-0.5 rounded border border-ppm-blue/20 uppercase cursor-help transition-all hover:scale-105"
                        onMouseEnter={(e) => handleHistoryMouseEnter(e, item)}
                        onMouseLeave={handleHistoryMouseLeave}
                    >
                        {item.jenis_surat_nama}
                    </span>
                )}
            </div>
        );
    };

    const filteredSurat = suratList.filter(s => {
        const matchSearch = !searchQuery || 
            (s.nomor_surat?.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (s.perihal?.toLowerCase().includes(searchQuery.toLowerCase()));
        
        const matchType = s.tipe_surat === activeTab;
        const isDeleted = s.is_deleted === 1;
        const matchView = viewTrash === 'trash' ? isDeleted : !isDeleted;
        
        return matchType && matchSearch && matchView;
    });

    const totalPages = Math.ceil(filteredSurat.length / itemsPerPage);
    const displayedSurat = filteredSurat.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const totalSurat = suratList.length;
    const suratMasukCount = suratList.filter(s => s.tipe_surat === 'masuk').length;
    const suratKeluarCount = suratList.filter(s => s.tipe_surat === 'keluar').length;

    return (
        <div className="space-y-2.5 p-4 pt-2">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-ppm-blue rounded-lg flex items-center justify-center text-white shadow-lg shadow-ppm-blue/20 shrink-0">
                        <Mail size={14} />
                    </div>
                    <div>
                        <h1 className="text-base font-black text-slate-800 tracking-tight leading-none uppercase">
                            Manajemen Surat
                        </h1>
                        <p className="text-slate-400 text-[9px] font-bold mt-0.5">
                            Arsip surat masuk & pembuatan surat otomatis.
                        </p>
                    </div>
                </div>
                
                {/* Horizontal Stats and Action Buttons (Static layout with divider, aligned right) */}
                <div className="flex flex-row items-center justify-end w-full border-b border-slate-200/60 pb-3.5 gap-4">
                    {/* Navigation Tabs (Anchored left of the line) */}
                    <div className="flex bg-slate-100/80 p-0.5 rounded-xl border border-slate-200/50 shadow-inner shrink-0">
                        <button 
                            onClick={() => setActiveTab('masuk')}
                            className={`px-4 h-7 rounded-lg font-black transition-all text-[9px] uppercase tracking-widest ${
                                activeTab === 'masuk' ? 'bg-ppm-blue text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/30'
                            }`}
                        >
                            Surat Masuk
                        </button>
                        <button 
                            onClick={() => setActiveTab('keluar')}
                            className={`px-4 h-7 rounded-lg font-black transition-all text-[9px] uppercase tracking-widest ${
                                activeTab === 'keluar' ? 'bg-ppm-blue text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/30'
                            }`}
                        >
                            Surat Keluar
                        </button>
                        <button 
                            onClick={() => setActiveTab('internal')}
                            className={`px-4 h-7 rounded-lg font-black transition-all text-[9px] uppercase tracking-widest ${
                                activeTab === 'internal' ? 'bg-ppm-blue text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/30'
                            }`}
                        >
                            Surat Internal
                        </button>
                    </div>

                    {/* Divider Line */}
                    <div className="w-px h-6 bg-slate-200 shrink-0"></div>

                    {/* Action Buttons Container (Anchored Right of the line, constant width of 320px to prevent wrapping and layout shift) */}
                    <div className="flex items-center gap-1.5 shrink-0 relative z-10 w-[320px] justify-end">
                        {viewTrash === 'active' ? (
                            <>
                                <button 
                                    onClick={() => {
                                        if ((activeTab === 'keluar' || activeTab === 'internal') && onNavigate) {
                                            onNavigate('surat-maker');
                                        } else {
                                            handleOpenModal(activeTab as 'masuk' | 'keluar');
                                        }
                                    }}
                                    className="flex items-center gap-1 px-3 h-8 bg-ppm-blue text-white rounded-lg font-black text-[9px] uppercase tracking-wider hover:shadow-lg hover:shadow-ppm-blue/30 transition-all active:scale-95 whitespace-nowrap"
                                >
                                    <Plus size={12} strokeWidth={3} />
                                    {activeTab === 'masuk' ? 'Registrasi Surat' : activeTab === 'keluar' ? 'Buat Surat Keluar' : 'Buat Surat Internal'}
                                </button>

                                {(activeTab === 'internal' || activeTab === 'keluar') && (
                                    <button 
                                        onClick={() => handleOpenModal(activeTab as 'keluar' | 'internal')}
                                        className="flex items-center gap-1 px-3 h-8 bg-ppm-blue text-white rounded-lg font-black text-[9px] uppercase tracking-wider hover:shadow-lg hover:shadow-ppm-blue/30 transition-all active:scale-95 whitespace-nowrap"
                                    >
                                        <Upload size={12} strokeWidth={3} />
                                        Upload Surat
                                    </button>
                                )}
                            </>
                        ) : (
                            <div className="h-8" />
                        )}
                    </div>
                </div>
            </div>

            {/* Navigation & Filters */}
            <div className="bg-white p-1 rounded-2xl border border-slate-100 shadow-xl shadow-slate-200/40">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                    {/* Stats Card (Moved Down) */}
                    <div className="flex items-center gap-3 bg-slate-50 p-0.5 rounded-xl border border-slate-200/50 shadow-inner">
                        <div className="flex items-center gap-1.5 px-2">
                            <div className="w-6 h-6 bg-ppm-slate-light text-white rounded-lg flex items-center justify-center shrink-0 shadow-sm">
                                <FileText size={10} />
                            </div>
                            <div>
                                <p className="text-[6px] font-black text-slate-400 uppercase tracking-widest leading-none">Total</p>
                                <p className="text-[10px] font-black text-slate-800 tabular-nums leading-tight">{totalSurat}</p>
                            </div>
                        </div>
                        <div className="w-px h-5 bg-slate-200/50"></div>
                        <div className="flex items-center gap-1.5 px-2">
                            <div className="w-6 h-6 bg-blue-500 text-white rounded-lg flex items-center justify-center shrink-0 shadow-sm">
                                <Inbox size={10} />
                            </div>
                            <div>
                                <p className="text-[6px] font-black text-slate-400 uppercase tracking-widest leading-none">Masuk</p>
                                <p className="text-[10px] font-black text-slate-800 tabular-nums leading-tight">{suratMasukCount}</p>
                            </div>
                        </div>
                        <div className="w-px h-5 bg-slate-200/50"></div>
                        <div className="flex items-center gap-1.5 px-2">
                            <div className="w-6 h-6 bg-emerald-500 text-white rounded-lg flex items-center justify-center shrink-0 shadow-sm">
                                <Send size={10} />
                            </div>
                            <div>
                                <p className="text-[6px] font-black text-slate-400 uppercase tracking-widest leading-none">Keluar</p>
                                <p className="text-[10px] font-black text-slate-800 tabular-nums leading-tight">{suratKeluarCount}</p>
                            </div>
                        </div>
                        <div className="w-px h-5 bg-slate-200/50"></div>
                        <div className="flex items-center gap-1.5 px-2">
                            <div className="w-6 h-6 bg-amber-500 text-white rounded-lg flex items-center justify-center shrink-0 shadow-sm">
                                <FileText size={10} />
                            </div>
                            <div>
                                <p className="text-[6px] font-black text-slate-400 uppercase tracking-widest leading-none">Internal</p>
                                <p className="text-[10px] font-black text-slate-800 tabular-nums leading-tight">{suratList.filter(s => s.tipe_surat === 'internal').length}</p>
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
                                        setFilterBidangId('all'); 
                                    }}
                                    customClassName="!h-[32px] !rounded-xl !bg-slate-50 !border-slate-100 !text-xs !font-bold shadow-inner"
                                />
                            </div>
                        )}

                        {/* View Trash Toggle (Aktif vs Sampah) */}
                        <div className="flex bg-slate-100/80 p-0.5 rounded-xl border border-slate-200/50 shadow-inner h-8 shrink-0">
                            <button 
                                onClick={() => setViewTrash('active')}
                                className={`px-3.5 h-7 rounded-lg font-black transition-all text-[9px] uppercase tracking-widest flex items-center gap-1.5 ${
                                    viewTrash === 'active' ? 'bg-ppm-blue text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/30'
                                }`}
                            >
                                <Database size={11} />
                                Aktif
                            </button>
                            <button 
                                onClick={() => setViewTrash('trash')}
                                className={`px-3.5 h-7 rounded-lg font-black transition-all text-[9px] uppercase tracking-widest flex items-center gap-1.5 ${
                                    viewTrash === 'trash' ? 'bg-rose-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/30'
                                }`}
                            >
                                <Trash2 size={11} />
                                Sampah
                            </button>
                        </div>

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
                                customClassName="!h-[32px] !rounded-xl !bg-slate-50 !border-slate-100 !text-xs !font-bold shadow-inner"
                            />
                        </div>

                        <div className="flex items-center gap-2 w-full md:w-auto">
                            <div className="relative flex-1 md:w-64 group">
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-ppm-blue transition-colors" size={14} />
                                <input 
                                    type="text" 
                                    placeholder="Cari surat / perihal..."
                                    className="w-full h-8 pl-10 pr-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-4 focus:ring-ppm-blue/10 focus:border-ppm-blue focus:bg-white transition-all font-bold text-slate-700 text-[10px] shadow-inner"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                            
                            <div className="flex items-center bg-slate-100/80 p-0.5 rounded-xl border border-slate-200/50 shadow-inner">
                                <button 
                                    onClick={() => setViewMode('list')}
                                    className={`p-1 rounded-lg transition-all ${viewMode === 'list' ? 'bg-ppm-blue text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                    title="List View"
                                >
                                    <List size={14} />
                                </button>
                                <button 
                                    onClick={() => setViewMode('grid')}
                                    className={`p-1 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-ppm-blue text-white shadow-sm' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200/30'}`}
                                    title="Grid View"
                                >
                                    <LayoutGrid size={14} />
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
                                    <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Detail Surat</th>
                                    <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tagging/Tematik</th>
                                    <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Dokumen</th>
                                    <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                                    <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Waktu</th>
                                    <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Opsi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {displayedSurat.map((surat) => (
                                    <tr key={surat.id} className={`group/row transition-all ${surat.is_deleted ? 'bg-slate-50/40 opacity-60 grayscale-[0.5]' : 'hover:bg-slate-50/80'}`}>
                                        <td className="px-4 py-3">
                                            <div className="flex items-start gap-4">
                                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                                                    surat.tipe_surat === 'masuk' ? 'bg-blue-50 text-blue-500' : surat.tipe_surat === 'keluar' ? 'bg-emerald-50 text-emerald-500' : 'bg-amber-50 text-amber-500'
                                                }`}>
                                                    <FileIcon size={18} />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{surat.nomor_surat || '--'}</p>
                                                    <p className="text-xs font-black text-slate-700 leading-tight group-hover/row:text-ppm-blue transition-colors capitalize">{surat.perihal.toLowerCase()}</p>
                                                    
                                                    <div className="flex items-center gap-1.5 mt-2 opacity-60 group-hover/row:opacity-100 transition-opacity">
                                                        <Building2 size={12} className="text-slate-400" />
                                                        <span className="text-[10px] font-bold text-slate-500 truncate max-w-[200px]">
                                                            {surat.tipe_surat === 'internal' ? (surat.nama_pengusul || 'Internal') : (surat.tipe_surat === 'masuk' ? surat.asal_surat : (surat.tujuan_surat || surat.asal_surat || 'Internal'))}
                                                        </span>
                                                        {(surat.singkatan_bidang || surat.nama_bidang) && (
                                                            <span className="text-[8px] font-black bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded uppercase tracking-tighter leading-none shrink-0">
                                                                {surat.singkatan_bidang || surat.nama_bidang}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-col gap-1.5">
                                                <div className="flex items-center gap-2 text-slate-600">
                                                    <div className="p-1.5 bg-ppm-blue/10 text-ppm-blue rounded-lg shrink-0">
                                                        <List size={11} strokeWidth={3} />
                                                    </div>
                                                    <span className={`text-[11px] font-black leading-tight max-w-[140px] truncate ${surat.nama_kegiatan_terkait ? 'text-slate-900' : 'text-slate-400 italic font-medium'}`}>
                                                        {surat.nama_kegiatan_terkait || 'Bebas'}
                                                    </span>
                                                </div>
                                                {surat.tematik_terkait && (
                                                    <div className="flex flex-wrap gap-1">
                                                        {surat.tematik_terkait.split(',').map((tag, idx) => (
                                                            <span key={idx} className="text-[8px] font-black uppercase tracking-tighter bg-ppm-blue/20 text-ppm-blue px-1.5 py-0.5 rounded-md border border-ppm-blue/30 leading-none">
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
                                                <div className="p-2 bg-ppm-slate-light/10 rounded-lg text-ppm-slate-light group-hover/file:bg-ppm-blue group-hover/file:text-white transition-all shadow-sm">
                                                    <FileText size={16} />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-[10px] font-bold text-slate-700 truncate max-w-[120px]">{surat.nama_file || 'Draft Surat'}</p>
                                                    <p className="text-[8px] font-black text-ppm-blue uppercase tracking-widest mt-0.5">
                                                        {surat.file_path ? 'Fisik' : 'Draft Sistem'}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <SuratStatusBadge item={surat} />
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-bold text-slate-700">
                                                    📅 {new Date(surat.tanggal_surat).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                </span>
                                                {surat.tanggal_acara && (
                                                    <span className="text-[8px] font-black text-rose-500 uppercase tracking-widest mt-0.5 flex items-center gap-1">
                                                        ⚡ Acara: {new Date(surat.tanggal_acara).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex items-center justify-end gap-2 transition-opacity">
                                                {viewTrash === 'trash' ? (
                                                    <>
                                                        <button 
                                                            onClick={() => handleRestoreSurat(surat.id)}
                                                            className="p-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded-xl transition-all shadow-sm"
                                                            title="Pulihkan (Restore)"
                                                        >
                                                            <Undo size={15} />
                                                        </button>
                                                        {canDelete && (
                                                            <button 
                                                                onClick={() => handlePermanentDeleteSurat(surat.id)}
                                                                className="p-1.5 bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white rounded-xl transition-all shadow-sm"
                                                                title="Hapus Permanen"
                                                            >
                                                                <Trash2 size={15} />
                                                            </button>
                                                        )}
                                                    </>
                                                ) : (
                                                    <>
                                                        {!surat.file_path && (
                                                            <button 
                                                                onClick={() => {
                                                                    setUploadingSuratId(surat.id);
                                                                    fileInputRef.current?.click();
                                                                }}
                                                                className="p-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded-xl transition-all" 
                                                                title="Unggah Final (Fisik)"
                                                            >
                                                                <Upload size={18} />
                                                            </button>
                                                        )}
                                                        {(!surat.file_path && surat.tipe_surat === 'keluar' && surat.approval_status !== 'APPROVED') ? (
                                                            <button 
                                                                className="p-2 bg-ppm-slate-light/5 text-ppm-slate-light/30 rounded-xl cursor-not-allowed" title="Belum dapat diunduh (Menunggu Persetujuan)"
                                                                disabled
                                                            >
                                                                <Download size={18} />
                                                            </button>
                                                        ) : (
                                                            <a 
                                                                href={surat.file_path || '#'} 
                                                                download={surat.nama_file || 'dokumen'} 
                                                                onClick={(e) => {
                                                                    if (!surat.file_path) {
                                                                        e.preventDefault();
                                                                        toast.error('File fisik belum tersedia. Silakan cetak melalui menu opsi atau tunggu hingga disetujui.');
                                                                    }
                                                                }}
                                                                className="p-2 bg-ppm-slate-light/10 text-ppm-slate-light hover:bg-ppm-slate hover:text-white rounded-xl transition-all" title="Unduh"
                                                            >
                                                                <Download size={18} />
                                                            </a>
                                                        )}
                                                        <div className="relative">
                                                            <button 
                                                                onClick={(e) => handleActionMenuClick(e, surat)}
                                                                className={`p-2 rounded-xl transition-all ${activeMenuId === surat.id ? 'bg-ppm-blue text-white shadow-sm' : 'bg-ppm-slate-light/10 text-ppm-slate-light hover:bg-ppm-slate hover:text-white'}`}
                                                            >
                                                                <MoreHorizontal size={18} />
                                                            </button>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {!isLoading && totalPages > 1 && (
                        <div className="flex flex-col sm:flex-row justify-between items-center mt-6 gap-4 p-6 bg-slate-50/50 rounded-b-3xl border-t border-slate-100/60">
                            <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">
                                Tampilkan <span className="text-slate-800">{displayedSurat.length}</span> dari <span className="text-slate-800">{filteredSurat.length}</span> data
                            </div>
                            <div className="flex items-center gap-1.5">
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                    disabled={currentPage === 1}
                                    className="px-3 py-2 rounded-xl bg-ppm-slate-light/10 hover:bg-ppm-slate hover:text-white text-ppm-slate-light disabled:opacity-30 disabled:cursor-not-allowed transition-all font-bold text-[10px] uppercase tracking-widest active:scale-95 shadow-sm">Prev
                                </button>
                                <div className="flex items-center gap-1 bg-slate-100/50 p-1 rounded-xl shadow-sm">
                                    {[...Array(totalPages)].map((_, i) => {
                                        const page = i + 1;
                                        if (totalPages > 7) {
                                            if (page !== 1 && page !== totalPages && Math.abs(page - currentPage) > 1) {
                                                if (Math.abs(page - currentPage) === 2) return <span key={page} className="px-1 text-slate-300 font-bold">...</span>;
                                                return null;
                                            }
                                        }
                                        return (
                                            <button
                                                key={page}
                                                onClick={() => setCurrentPage(page)}
                                                className={`w-8 h-8 rounded-lg text-[11px] font-extrabold transition-all ${currentPage === page ? 'bg-ppm-blue text-white shadow-lg' : 'text-ppm-slate-light hover:bg-ppm-slate-light/20'}`}
                                            >
                                                {page}
                                            </button>
                                        );
                                    })}
                                </div>
                                <button
                                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                    disabled={currentPage === totalPages}
                                    className="px-3 py-2 rounded-xl bg-ppm-slate-light/10 hover:bg-ppm-slate hover:text-white text-ppm-slate-light disabled:opacity-30 disabled:cursor-not-allowed transition-all font-bold text-[10px] uppercase tracking-widest active:scale-95 shadow-sm">Next
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Modal Form */}
            <SuratRegistrationModal 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={() => { setIsModalOpen(false); fetchSurat(); }}
                initialData={editingItem}
                defaultType={modalType}
                user={user}
            />

            {/* Approval History Hover Tooltip */}
            {hoveredApprovalChain && (
                <div 
                    ref={historyRef}
                    style={historyStyle}
                    className="fixed z-[9999] bg-white rounded-2xl shadow-2xl border border-slate-100 p-4 min-w-[280px] max-w-[320px] overflow-hidden pointer-events-auto animate-in fade-in zoom-in-95 duration-200"
                    onMouseEnter={handleTooltipMouseEnter}
                    onMouseLeave={handleTooltipMouseLeave}
                >
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500"></div>
                    <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-50 px-1">
                        <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                            <History size={16} />
                        </div>
                        <div>
                            <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-wider">Riwayat Persetujuan</h3>
                            <p className="text-[9px] font-bold text-slate-400 uppercase truncate max-w-[200px]">{hoveredApprovalChain.subject}</p>
                        </div>
                    </div>

                    <div className="space-y-4 relative">
                        <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-slate-100"></div>

                        {hoveredApprovalChain.chain.sort((a, b) => a.urutan - b.urutan).map((chain, idx) => {
                            const isApproved = chain.status === 'APPROVED';
                            const isWaiting = chain.status === 'PENDING' || chain.status === 'WAITING_APPROVAL';
                            const isRejected = chain.status === 'REJECTED' || chain.status === 'RETURNED';

                            return (
                                <div key={idx} className="flex gap-4 relative z-10">
                                    <div className={`w-6 h-6 rounded-full border-4 border-white shadow-sm flex items-center justify-center shrink-0 transition-colors ${
                                        isApproved ? 'bg-emerald-500 text-white' : 
                                        isRejected ? 'bg-rose-500 text-white' : 
                                        'bg-amber-400 text-white'
                                    }`}>
                                        {isApproved ? <CheckCircle2 size={10} /> : isWaiting ? <Clock size={10} /> : <AlertCircle size={10} />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="flex flex-col">
                                                <p className="text-[10px] font-black text-slate-700 truncate capitalize">{chain.role.replace('_', ' ')}</p>
                                                {chain.logbook_status && (
                                                    <span className="text-[8px] font-bold text-rose-500 animate-pulse">Pejabat {chain.logbook_status}</span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter ${
                                                    isApproved ? 'bg-emerald-50 text-emerald-600' : 
                                                    isRejected ? 'bg-rose-50 text-rose-600' : 
                                                    chain.status === 'BYPASSED' ? 'bg-slate-100 text-slate-500' :
                                                    'bg-amber-50 text-amber-600'
                                                }`}>
                                                    {chain.status === 'PENDING' ? 'MENUNGGU' : chain.status}
                                                </span>
                                                
                                                {(user?.tipe_user_id === 1 || ((user?.tipe_user_id === 2 || user?.tipe_user_id === 3) && hoveredApprovalChain.bidang_id === user?.bidang_id)) && chain.status === 'PENDING' && (
                                                    <button 
                                                        onClick={() => handleBypass(chain.id, chain.approver_name)}
                                                        className="w-4 h-4 flex items-center justify-center bg-slate-100 text-slate-400 hover:bg-amber-500 hover:text-white rounded-md transition-all group/bypass shadow-sm"
                                                        title="Lompati Tahap Ini (Bypass)"
                                                    >
                                                        <FastForward size={8} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        <p className="text-[11px] font-bold text-slate-800 truncate">{chain.approver_name || '...'}</p>
                                        {chain.reason && (
                                            <div className={`mt-1.5 p-2 rounded-lg border ${chain.status === 'BYPASSED' ? 'bg-slate-50 border-slate-100' : 'bg-rose-50 border-rose-100'}`}>
                                                <p className={`text-[9px] font-bold italic leading-snug ${chain.status === 'BYPASSED' ? 'text-slate-500' : 'text-rose-700'}`}>"{chain.reason}"</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

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
                    {(() => {
                        const surat = suratList.find(s => s.id === activeMenuId);
                        if (!surat) return null;
                        const canEdit = (isSuperAdmin || (isAdminInstansi && surat.instansi_id === user.instansi_id) || surat.bidang_id === user.bidang_id) && surat.approval_status !== 'APPROVED';

                        return (
                            <>
                                {canEdit && (
                                    <button 
                                        onClick={() => {
                                            if (surat.tipe_surat === 'internal' && !surat.dokumen_id) {
                                                localStorage.setItem('edit_surat_id', String(surat.id));
                                                if (onNavigate) onNavigate('surat-maker');
                                            } else {
                                                handleOpenModal(surat.tipe_surat, surat);
                                            }
                                            setActiveMenuId(null);
                                        }}
                                        className="w-full px-4 py-2.5 text-left text-xs font-black text-slate-600 hover:bg-slate-50 flex items-center gap-2 transition-colors"
                                    >
                                        <Edit2 size={14} className="text-blue-500" />
                                        Ubah Data
                                    </button>
                                )}
                                
                                                                 {(surat.approval_status === 'APPROVED' || (surat.tipe_surat === 'internal' && surat.approval_status === 'WAITING_APPROVAL' && surat.isi_surat)) && (
                                    <button 
                                        onClick={async () => {
                                            if (surat.approval_status === 'APPROVED' && surat.file_path) {
                                                window.open(surat.file_path, '_blank');
                                                setActiveMenuId(null);
                                                return;
                                            }
                                            
                                            // Original HTML print logic for draf or internal
                                            try {
                                                const res = await api.internalInstansi.get(user.instansi_id);
                                                let template = null;
                                                if (surat.jenis_surat_id) {
                                                    const tRes = await api.suratTemplate.getById(surat.jenis_surat_id);
                                                    if (tRes.success) template = tRes.data;
                                                }

                                                const isCuti = (surat.perihal || '').toLowerCase().includes('cuti') || 
                                                              (surat.jenis_surat_nama || '').toLowerCase().includes('cuti') ||
                                                              template?.has_detail_cuti;

                                                const inst = res.data?.instansiDetail;
                                                let kopHtml = '';
                                                const showKop = template ? template.is_kop_surat_required : true;
                                                const useLeftKop = isCuti || template?.logo_path === 'none'; 
                                                
                                                if (showKop && inst) {
                                                    if (useLeftKop) {
                                                        kopHtml = `
                                                            <div style="text-align: left; font-weight: bold; margin-bottom: 2rem; text-transform: uppercase; line-height: 1.25;">
                                                                PEMERINTAH DAERAH KABUPATEN BOGOR<br/>
                                                                <span style="text-decoration: underline;">${String(inst?.nama_instansi_kop || inst?.instansi || '')}</span>
                                                            </div>
                                                        `;
                                                    } else {
                                                        const lineStyle = template?.kop_line_style || 'double';
                                                        let borderHtml = '';
                                                        if (lineStyle === 'single') {
                                                            borderHtml = '<div style="border-bottom: 1.5pt solid #000; margin-top: 4pt;"></div>';
                                                        } else if (lineStyle === 'thick') {
                                                            borderHtml = '<div style="border-bottom: 3pt solid #000; margin-top: 4pt;"></div>';
                                                        } else if (lineStyle === 'double' || lineStyle === 'heavy-light' || lineStyle === 'light-heavy') {
                                                            const top = (lineStyle === 'double' || lineStyle === 'heavy-light') ? '2.25pt' : '0.75pt';
                                                            const bottom = (lineStyle === 'double' || lineStyle === 'heavy-light') ? '0.75pt' : '2.25pt';
                                                            borderHtml = `
                                                                <div style="border-bottom: ${top} solid #000; margin-top: 4pt;"></div>
                                                                <div style="border-bottom: ${bottom} solid #000; margin-top: 2pt;"></div>
                                                            `;
                                                        } else if (lineStyle !== 'none') {
                                                            borderHtml = '<div style="border-bottom: 1.5pt solid #000; margin-top: 4pt;"></div>';
                                                        }

                                                        kopHtml = `
                                                            <div style="text-align: center; margin-bottom: 25px; position: relative;">
                                                                <table style="width: 100%; border-collapse: collapse; margin-bottom: 2px;">
                                                                    <tr>
                                                                        <td style="width: 95px; text-align: left; vertical-align: middle;">
                                                                            ${inst.logo_kop_path ? `<img src="${inst.logo_kop_path}" style="width: 85px; height: auto; display: block;" />` : ''}
                                                                        </td>
                                                                        <td style="text-align: center; vertical-align: middle; padding: 0 5px;">
                                                                            <div style="font-size: 13pt; font-weight: bold; line-height: 1.1; text-transform: uppercase;">PEMERINTAH KABUPATEN BOGOR</div>
                                                                            <div style="font-size: 15pt; font-weight: bold; line-height: 1.1; text-transform: uppercase;">
                                                                                ${(inst.nama_instansi_kop || inst.instansi || '').toUpperCase().replace(' RISET', '<br/>RISET')}
                                                                            </div>
                                                                            <div style="font-size: 7pt; font-weight: normal; margin-top: 4px; line-height: 1.2;">
                                                                                ${inst.alamat || ''} Kode Pos ${inst.kode_pos || ''} Telp: ${inst.telepon_kop || ''} Faks: ${inst.faks_kop || ''}<br/>
                                                                                Laman: ${inst.website_kop || '-'} | Pos-el: ${inst.email_kop || '-'}
                                                                            </div>
                                                                        </td>
                                                                        <td style="width: 95px;"></td>
                                                                    </tr>
                                                                </table>
                                                                ${borderHtml}
                                                            </div>
                                                        `;
                                                    }
                                                }

                                                const printWindow = window.open('', '_blank');
                                                if (printWindow) {
                                                    const useGlobal = !!template?.use_global_settings;
                                                    const mTop = template?.margin_top ?? surat.margin_top ?? 20;
                                                    const mBottom = template?.margin_bottom ?? surat.margin_bottom ?? 20;
                                                    const mLeft = template?.margin_left ?? surat.margin_left ?? 30;
                                                    const mRight = template?.margin_right ?? surat.margin_right ?? 20;
                                                    const pSize = template?.paper_size ?? surat.paper_size ?? 'A4';
                                                    const fSize = template?.font_size ?? surat.font_size ?? 12;
                                                    const lHeight = template?.line_height ?? surat.line_height ?? 1.5;
                                                    const tAlign = template?.text_align ?? surat.text_align ?? 'justify';
                                                    const pBefore = template?.paragraph_spacing_before || (useGlobal ? globalSettings?.paragraph_spacing_before : 0) || 0;
                                                    const pAfter = template?.paragraph_spacing_after || (useGlobal ? globalSettings?.paragraph_spacing_after : 0) || 0;
                                                    const pIndent = template?.first_line_indent || (useGlobal ? globalSettings?.first_line_indent : 0) || 0;
                                                    
                                                    const dateStr = new Date(surat.tanggal_surat).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
                                                    const kec = (inst?.kecamatan || 'Cibinong').charAt(0).toUpperCase() + (inst?.kecamatan || 'Cibinong').slice(1).toLowerCase();
                                                    
                                                    const metaTableHtml = isCuti ? '' : `
                                                        <table style="width: 100%; border-collapse: collapse; margin-bottom: 2rem; font-family: Arial, sans-serif; font-size: ${fSize}pt;">
                                                            <tr style="vertical-align: top;">
                                                                <td style="width: 15%;">Nomor</td>
                                                                <td style="width: 2%;">:</td>
                                                                <td style="width: 48%;">${surat.nomor_surat || '...'}</td>
                                                                <td style="width: 35%;">Kepada</td>
                                                            </tr>
                                                            <tr style="vertical-align: top;">
                                                                <td>Sifat</td>
                                                                <td>:</td>
                                                                <td>${surat.sifat || 'Biasa'}</td>
                                                                <td rowspan="3" style="padding-top: 0;">
                                                                    Yth. ${surat.tujuan_surat || '...'}<br/>
                                                                    di<br/>
                                                                    <span style="display: inline-block; margin-left: 1.5rem;">${inst?.lokasi || 'Tempat'}</span>
                                                                </td>
                                                            </tr>
                                                            <tr style="vertical-align: top;">
                                                                <td>Lampiran</td>
                                                                <td>:</td>
                                                                <td>${surat.lampiran || '-'}</td>
                                                            </tr>
                                                            <tr style="vertical-align: top;">
                                                                <td>Hal</td>
                                                                <td>:</td>
                                                                <td><strong>${surat.perihal || '...'}</strong></td>
                                                            </tr>
                                                        </table>
                                                    `;

                                                    const jenisSurat = template?.nama_jenis_surat || surat.jenis_surat_nama || 'Surat';
                                                    const namaPengusul = surat.nama_pengusul || 'Internal';
                                                    const tglAcara = surat.tanggal_acara || surat.tanggal_surat;
                                                    const tglFormatted = new Date(tglAcara).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
                                                    const documentTitle = `${jenisSurat} - ${namaPengusul} - ${tglFormatted}`;
                                                    
                                                    const verifyUrl = `${String(import.meta.env.VITE_DASHBOARD_PUBLIC_URL || import.meta.env.VITE_VERIFY_URL || window.location.origin)}?v=${surat.verification_slug || ''}`;
                                                    const logoForQr = typeof inst?.logo_kop_path === 'string' ? inst.logo_kop_path : '';
                                                    const qrValue = surat.verification_slug ? verifyUrl : "PREVIEW_ONLY";
                                                    
                                                    const qrHtml = `
                                                        <div class="qr-footer">
                                                            <div style="padding: 4px; background: white; border: 1px solid #f1f5f9; border-radius: 4px; box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05); display: flex; align-items: center; justify-content: center;">
                                                                <img src="${getPremiumQrUrl(qrValue, logoForQr)}" style="width: 60px; height: 60px; display: block;" />
                                                            </div>
                                                        </div>
                                                    `;

                                                    printWindow.document.write(`
                                                        <html>
                                                            <head>
                                                                <title>${documentTitle}</title>
                                                                <style>
                                                                    body { 
                                                                        font-family: ${template?.font_family || (useGlobal && globalSettings?.font_family) || 'Arial, sans-serif'}; 
                                                                        font-size: ${fSize}pt; 
                                                                        padding: ${mTop}mm ${mRight}mm ${mBottom}mm ${mLeft}mm; 
                                                                        margin: 0; 
                                                                        line-height: ${lHeight}; 
                                                                        text-align: ${tAlign}; 
                                                                        box-sizing: border-box;
                                                                    }
                                                                    @page { 
                                                                        size: ${getPaperDimensions(pSize).width} ${getPaperDimensions(pSize).height}; 
                                                                        margin: 0; 
                                                                    }
                                                                    ${getLetterContentStyle({
                                                                        paragraph_spacing_before: pBefore,
                                                                        paragraph_spacing_after: pAfter,
                                                                        first_line_indent: pIndent
                                                                    })}
                                                                    .qr-footer {
                                                                        position: fixed;
                                                                        bottom: 5mm;
                                                                        left: 5mm;
                                                                        z-index: 100;
                                                                    }
                                                                    .qr-footer img {
                                                                        width: 60px;
                                                                        height: 60px;
                                                                        opacity: 1;
                                                                    }
                                                                    @media print { 
                                                                        body { 
                                                                            padding: ${mTop}mm ${mRight}mm ${mBottom}mm ${mLeft}mm; 
                                                                            margin: 0; 
                                                                        } 
                                                                        .no-print { display: none; }
                                                                        .qr-footer { display: flex !important; }
                                                                    }
                                                                </style>
                                                            </head>
                                                            <body>
                                                                ${kopHtml}
                                                                <div style="text-align: right; margin-bottom: 20px;">
                                                                    ${kec}, ${dateStr}
                                                                </div>
                                                                ${metaTableHtml}
                                                                <div class="document-content">
                                                                    ${surat.isi_surat}
                                                                </div>
                                                                ${qrHtml}
                                                            </body>
                                                        </html>
                                                    `);
                                                    printWindow.document.close();
                                                    setTimeout(() => {
                                                        printWindow.print();
                                                    }, 1500);
                                                }
                                            } catch (err) {
                                                console.error('Failed to print document:', err);
                                                toast.error('Gagal menyiapkan dokumen cetak.');
                                            }
                                            setActiveMenuId(null);
                                        }}
                                        className="w-full px-4 py-2.5 text-left text-xs font-black text-slate-600 hover:bg-slate-50 flex items-center gap-2 transition-colors"
                                    >
                                        <Printer size={14} className="text-amber-500" />
                                        Cetak Dokumen
                                    </button>
                                )}
                                {canDelete && (
                                    <button 
                                        onClick={() => {
                                            handleDelete(surat.id);
                                            setActiveMenuId(null);
                                        }}
                                        className={`w-full px-4 py-2.5 text-left text-xs font-black flex items-center gap-2 transition-colors border-t border-slate-100 ${
                                            surat.approval_status === 'APPROVED' ? 'text-amber-600 hover:bg-amber-50' : 'text-rose-600 hover:bg-rose-50'
                                        }`}
                                    >
                                        <Trash2 size={14} />
                                        {surat.approval_status === 'APPROVED' ? 'Batalkan Dokumen' : 'Hapus Dokumen'}
                                    </button>
                                )}
                            </>
                        );
                    })()}
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

            {/* HTML Preview Modal */}
            {isHtmlPreviewOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsHtmlPreviewOpen(false)} />
                    <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] h-[95vh]">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50 shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-ppm-blue/10 text-ppm-blue rounded-lg">
                                    <FileText size={20} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800 tracking-tight leading-none">{previewFileName}</h3>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Pratinjau Draft Dokumen</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
                                    <button 
                                        onClick={() => setPreviewZoom(prev => Math.max(0.5, prev - 0.1))}
                                        className="w-8 h-8 flex items-center justify-center text-slate-500 hover:bg-slate-50 rounded-lg transition-all"
                                    >
                                        <ZoomOut size={16} />
                                    </button>
                                    <div className="w-12 text-center text-[10px] font-black text-slate-600 tabular-nums">
                                        {Math.round(previewZoom * 100)}%
                                    </div>
                                    <button 
                                        onClick={() => setPreviewZoom(prev => Math.min(2.0, prev + 0.1))}
                                        className="w-8 h-8 flex items-center justify-center text-slate-500 hover:bg-slate-50 rounded-lg transition-all"
                                    >
                                        <ZoomIn size={16} />
                                    </button>
                                </div>
                                <button 
                                    onClick={() => {
                                        setIsHtmlPreviewOpen(false);
                                        setPreviewZoom(0.7);
                                    }}
                                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-slate-600 hover:border-slate-300 transition-all active:scale-95"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto bg-slate-200/50 p-4 md:p-8 flex flex-col items-center">
                            <div 
                                className="bg-white shadow-xl text-black transition-all duration-300 relative"
                                style={{ 
                                    transform: `scale(${previewZoom})`,
                                    transformOrigin: 'top center',
                                    marginBottom: `${(parseFloat(getPaperDimensions(previewLayout.paperSize).height) * previewZoom) - parseFloat(getPaperDimensions(previewLayout.paperSize).height)}mm`,
                                    width: getPaperDimensions(previewLayout.paperSize).width,
                                    height: getPaperDimensions(previewLayout.paperSize).height,
                                    padding: `${previewLayout.marginTop}mm ${previewLayout.marginRight}mm ${previewLayout.marginBottom}mm ${previewLayout.marginLeft}mm`,
                                    fontFamily: previewLayout.fontFamily, 
                                    fontSize: `${previewLayout.fontSize}pt`, 
                                    boxSizing: 'border-box', 
                                    lineHeight: previewLayout.lineHeight || '1.5', 
                                    textAlign: (previewLayout.textAlign || 'justify') as any,
                                    color: 'black'
                                }}
                            >
                                <style dangerouslySetInnerHTML={{ __html: getLetterContentStyle({
                                    paragraph_spacing_before: previewLayout.paragraphSpacingBefore,
                                    paragraph_spacing_after: previewLayout.paragraphSpacingAfter,
                                    first_line_indent: previewLayout.firstLineIndent
                                }) }} />
                                <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Trash View Modal */}
            <TrashViewModal 
                isOpen={showTrashModal}
                onClose={() => setShowTrashModal(false)}
                onRestore={() => fetchSurat()} 
            />

            {/* Hidden File Input */}
            <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept=".pdf,.doc,.docx"
                onChange={handleFileSelected}
            />

            {/* Final Upload Confirmation Modal */}
            <FinalUploadModal 
                isOpen={!!finalUploadFile}
                onClose={() => {
                    setFinalUploadFile(null);
                    setUploadingSuratId(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                onConfirm={processUploadFinal}
                file={finalUploadFile}
                fileName={finalFileName}
                setFileName={setFinalFileName}
                isSubmitting={isProcessingUpload}
            />
        {hoveredEditHistory && (
            <div 
                ref={auditRef}
                className="fixed z-[10000] transition-opacity duration-200 animate-in fade-in zoom-in-95"
                style={auditStyle}
                onMouseEnter={handleTooltipMouseEnter}
                onMouseLeave={handleTooltipMouseLeave}
            >
                <div className="bg-white rounded-[24px] shadow-2xl border border-slate-100 p-4 min-w-[320px] max-w-[380px] overflow-hidden relative pointer-events-auto">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-slate-400" />
                    
                    <div className="flex items-center gap-3 mb-3 pb-3 border-b border-slate-50 px-1">
                        <div className="w-8 h-8 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400">
                            <History size={16} />
                        </div>
                        <div className="flex flex-col min-w-0">
                            <span className="text-[10px] font-black text-slate-800 uppercase tracking-widest leading-none">Riwayat Perubahan</span>
                            <span className="text-[9px] font-bold text-slate-400 truncate mt-1 italic uppercase tracking-tighter">{hoveredEditHistory.subject}</span>
                        </div>
                    </div>

                    <div className="space-y-4 max-h-[250px] overflow-y-auto px-1 pr-2 scrollbar-thin scrollbar-thumb-slate-100 scrollbar-track-transparent">
                        {[...hoveredEditHistory.history].sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map((h, idx) => (
                            <div key={idx} className="relative pl-6 pb-4 last:pb-0">
                                {/* Connector Line */}
                                {idx < hoveredEditHistory.history.length - 1 && (
                                    <div className="absolute left-[9px] top-[18px] bottom-0 w-px bg-slate-100" />
                                )}
                                
                                {/* Icon/Dot */}
                                <div className={`absolute left-0 top-0.5 w-[18px] h-[18px] rounded-full border-2 border-white shadow-sm flex items-center justify-center ${
                                    h.aksi === 'create' ? 'bg-emerald-500' :
                                    h.aksi === 'delete' ? 'bg-rose-500' :
                                    h.aksi === 'restore' ? 'bg-ppm-blue' : 'bg-slate-400'
                                }`}>
                                    {h.aksi === 'create' ? <Plus size={10} className="text-white" /> :
                                     h.aksi === 'delete' ? <Trash2 size={10} className="text-white" /> :
                                     h.aksi === 'restore' ? <RotateCcw size={10} className="text-white" /> :
                                     <Edit2 size={10} className="text-white" />}
                                </div>

                                <div className="flex flex-col">
                                    <div className="flex items-center justify-between gap-4">
                                        <span className="text-[10px] font-black text-slate-800 uppercase tracking-tight">
                                            {h.aksi === 'create' ? 'DIBUAT' : 
                                             h.aksi === 'edit' ? 'DIUBAH' : 
                                             h.aksi === 'delete' ? 'DIHAPUS' : 
                                             h.aksi === 'restore' ? 'DIPULIHKAN' : h.aksi.toUpperCase()}
                                        </span>
                                        <span className="text-[9px] font-bold text-slate-300">
                                            {new Date(h.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })} • {new Date(h.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    <p className="text-[10px] font-bold text-slate-500 mt-0.5 leading-snug">
                                        {h.keterangan}
                                    </p>
                                    <div className="flex items-center gap-1.5 mt-1.5">
                                        <div className="w-4 h-4 bg-slate-100 rounded-full flex items-center justify-center">
                                            <User size={8} className="text-slate-400" />
                                        </div>
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">
                                            {h.user_nama} <span className="font-bold opacity-60">({h.user_bidang})</span>
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )}
        </div>
    );
}


