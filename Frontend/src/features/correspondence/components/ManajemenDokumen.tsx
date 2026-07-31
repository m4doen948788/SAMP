import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { api } from '@/src/services/api';
import { useAuth } from '@/src/contexts/AuthContext';
import { 
    FileText, 
    FileSpreadsheet,
    Upload, 
    Download, 
    Search, 
    Loader2, 
    FileIcon, 
    FileImage, 
    FileQuestion,
    Archive,
    AlertCircle,
    CheckCircle2,
    X,
    Eye,
    Edit2,
    Clock,
    History,
    ChevronLeft,
    ChevronRight,
    MoreHorizontal,
    MoreVertical,
    Undo,
    Database,
    Trash,
    Trash2,
    Users,
    Presentation,
    Globe,
    Lock,
    Copy,
    Link,
    Zap
} from 'lucide-react';
import { DocumentViewerModal } from '@/src/components/modals/DocumentViewerModal';
import { SuratRegistrationModal } from '@/src/components/modals/SuratRegistrationModal';
import { formatFilename } from '@/src/services/stringHelper';

interface EditHistory {
    id: number;
    aksi: 'upload' | 'edit' | 'delete' | 'restore';
    keterangan: string;
    created_at: string;
    user_nama: string;
}

interface DokumenItem {
    id: number;
    nama_file: string;
    path: string;
    ukuran: number;
    jenis_dokumen_id: number;
    jenis_dokumen_nama: string;
    uploaded_by: number;
    uploader_nama: string;
    uploader_bidang_id: number | null;
    uploader_bidang: string | null;
    uploaded_at: string;
    tematik_names: string | null; // Comma separated list from backend
    edit_history: EditHistory[] | null;
    is_deleted?: number;
    deleted_at?: string | null;
}

interface JenisDokumen {
    id: number;
    dokumen: string;
    is_surat?: number;
}

interface Tematik {
    id: number;
    nama: string;
}

interface UploadItem {
    id: string;
    file: File;
    namaVisual: string;
    ekstensi: string;
    jenisId: string;
    bidangUrusanIds: number[];
    tematikIds: number[];
    isPrivate: boolean;
    status: 'idle' | 'uploading' | 'success' | 'error';
    errorMsg?: string;
    progress?: number;
}

interface SearchableSelectProps {
    options: { id: number | string; label: string }[];
    value: string | number;
    onChange: (value: string) => void;
    placeholder: string;
    searchPlaceholder?: string;
    isFilter?: boolean;
    containerRef?: React.RefObject<HTMLDivElement>;
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    className?: string;
    dropUp?: boolean;
}

const SearchableSelect: React.FC<SearchableSelectProps> = ({ 
    options, value, onChange, placeholder, searchPlaceholder = "Cari...", 
    isFilter = false, containerRef, isOpen, setIsOpen, 
    searchQuery, setSearchQuery, className = "", dropUp = false
}) => {
    const [autoDropUp, setAutoDropUp] = useState(false);
    const selectedOption = options.find(o => String(o.id) === String(value));
    const filteredOptions = options.filter(o => 
        o.label.toLowerCase().includes(searchQuery.toLowerCase())
    );

    useEffect(() => {
        if (isOpen && containerRef?.current) {
            const rect = containerRef.current.getBoundingClientRect();
            const spaceBelow = window.innerHeight - rect.bottom;
            if (spaceBelow < 250) {
                setAutoDropUp(true);
            } else {
                setAutoDropUp(false);
            }
        }
    }, [isOpen, containerRef]);

    return (
        <div className={`relative ${className}`} ref={containerRef}>
            <div 
                className={`input-modern w-full cursor-pointer flex justify-between items-center transition-all ${isOpen ? 'border-ppm-blue ring-2 ring-ppm-blue/10' : ''}`}
                onClick={() => setIsOpen(!isOpen)}
            >
                <span className={`truncate ${!selectedOption && !isFilter ? 'text-slate-400 font-normal' : 'text-slate-700 font-bold'}`}>
                    {selectedOption ? selectedOption.label : placeholder}
                </span>
                <ChevronRight size={14} className={`text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-90' : ''}`} />
            </div>

            {isOpen && (
                <div className={`absolute z-[110] w-full bg-white border border-slate-200 shadow-2xl rounded-2xl p-3 animate-in fade-in zoom-in-95 duration-200 ${(dropUp || autoDropUp) ? 'bottom-full mb-3 origin-bottom' : 'top-full mt-2 origin-top'}`}>
                    <div className="relative mb-2">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                            type="text"
                            className="w-full pl-9 pr-3 py-2 bg-slate-50 border-none rounded-xl text-[11px] font-bold focus:ring-2 focus:ring-ppm-blue/10 placeholder:font-normal"
                            placeholder={searchPlaceholder}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>
                    <div className="max-h-[180px] overflow-y-auto space-y-0.5 custom-scrollbar">
                        {isFilter && (
                            <div 
                                className={`p-1.5 rounded-xl text-[11px] font-bold cursor-pointer transition-colors ${value === '' ? 'bg-ppm-blue text-white shadow-md' : 'hover:bg-slate-50 text-slate-600'}`}
                                onClick={() => { onChange(''); setIsOpen(false); setSearchQuery(''); }}
                            >
                                {placeholder}
                            </div>
                        )}
                        {filteredOptions.map(opt => (
                            <div 
                                key={opt.id}
                                className={`p-1.5 rounded-xl text-[11px] font-bold cursor-pointer transition-colors ${String(value) === String(opt.id) ? 'bg-ppm-blue text-white shadow-md' : 'hover:bg-slate-50 text-slate-600'}`}
                                onClick={() => { onChange(String(opt.id)); setIsOpen(false); setSearchQuery(''); }}
                            >
                                {opt.label}
                            </div>
                        ))}
                        {filteredOptions.length === 0 && (
                            <div className="p-4 text-center text-slate-400 text-[11px] italic">Tidak ditemukan</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default function ManajemenDokumen() {
    const { user } = useAuth();
    const isSuperAdmin = user?.tipe_user_id === 1;
    const isAdminInstansi = user?.tipe_user_id === 2 || (user?.tipe_user_nama || '').toLowerCase().includes('admin instansi');
    const isAdminBapperida = user?.tipe_user_id === 8 || (user?.tipe_user_nama || '').toLowerCase().includes('admin bapperida') || (user?.instansi_id === 2 && user?.tipe_user_id === 2);
    const canDeletePermanently = isSuperAdmin || isAdminInstansi || isAdminBapperida;
    const [dokumenList, setDokumenList] = useState<DokumenItem[]>([]);
    const [jenisList, setJenisList] = useState<JenisDokumen[]>([]);
    const [tematikList, setTematikList] = useState<Tematik[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedJenis, setSelectedJenis] = useState<string>('');
    const [selectedTematikFilter, setSelectedTematikFilter] = useState<string>('');
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [activeLibTab, setActiveLibTab] = useState<'berkas' | 'surat'>('berkas');

    // Reset selected jenis when tab changes
    useEffect(() => {
        setSelectedJenis('');
    }, [activeLibTab]);
    
    // Multi-Upload State
    const [uploadQueue, setUploadQueue] = useState<UploadItem[]>([]);
    const [activeUploadIdx, setActiveUploadIdx] = useState<number>(-1);

    // Edit states
    const [editingDoc, setEditingDoc] = useState<DokumenItem | null>(null);
    const [editNamaFile, setEditNamaFile] = useState<string>('');
    const [editFileExt, setEditFileExt] = useState<string>('');
    const [editJenisId, setEditJenisId] = useState<string>('');
    const [editBidangUrusanIds, setEditBidangUrusanIds] = useState<number[]>([]);
    const [editTematikIds, setEditTematikIds] = useState<number[]>([]);
    const [editIsPrivate, setEditIsPrivate] = useState<boolean>(false);
    const [saving, setSaving] = useState(false);

    // Search and UI state for tagging and Jenis Dokumen
    const [uploadTagSearch, setUploadTagSearch] = useState('');
    const [isUploadTagOpen, setIsUploadTagOpen] = useState(false);
    const uploadTagRef = useRef<HTMLDivElement>(null);

    const [uploadJenisSearch, setUploadJenisSearch] = useState('');
    const [isUploadJenisOpen, setIsUploadJenisOpen] = useState(false);
    const uploadJenisRef = useRef<HTMLDivElement>(null);

    const [editTagSearch, setEditTagSearch] = useState('');
    const [isEditTagOpen, setIsEditTagOpen] = useState(false);
    const editTagRef = useRef<HTMLDivElement>(null);

    const [editJenisSearch, setEditJenisSearch] = useState('');
    const [isEditJenisOpen, setIsEditJenisOpen] = useState(false);
    const editJenisRef = useRef<HTMLDivElement>(null);

    const [uploadUrusanSearch, setUploadUrusanSearch] = useState('');
    const [isUploadUrusanOpen, setIsUploadUrusanOpen] = useState(false);
    const uploadUrusanRef = useRef<HTMLDivElement>(null);

    const [editUrusanSearch, setEditUrusanSearch] = useState('');
    const [isEditUrusanOpen, setIsEditUrusanOpen] = useState(false);
    const editUrusanRef = useRef<HTMLDivElement>(null);

    const [filterJenisSearch, setFilterJenisSearch] = useState('');
    const [isFilterJenisOpen, setIsFilterJenisOpen] = useState(false);
    const filterJenisRef = useRef<HTMLDivElement>(null);

    const [filterTematikSearch, setFilterTematikSearch] = useState('');
    const [isFilterTematikOpen, setIsFilterTematikOpen] = useState(false);
    const filterTematikRef = useRef<HTMLDivElement>(null);
    
    // Tooltip timer state (Fixed Positioning)
    const [hoveredHistory, setHoveredHistory] = useState<{ x: number, y: number, history: EditHistory[], name: string } | null>(null);
    const [historyStyle, setHistoryStyle] = useState<React.CSSProperties>({ visibility: 'hidden' });
    const historyRef = useRef<HTMLDivElement>(null);
    const tooltipTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Viewed Doc (for premium viewer)
    const [viewingDoc, setViewingDoc] = useState<{ path: string; nama_file: string; is_private?: number | boolean; uploaded_by?: number; } | null>(null);

    // Upload Modal State
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

    // Duplicate Error State
    const [duplicateError, setDuplicateError] = useState<{
        nama_asli_unggah: string;
        nama_file_saat_ini: string;
    } | null>(null);
    
    // Redirection to Surat Modal
    const [redirectSurat, setRedirectSurat] = useState<{
        isOpen: boolean;
        type: 'masuk' | 'keluar' | 'internal';
        file: File | null;
        jenisId: string | number | null;
        initialData?: any;
    }>({ isOpen: false, type: 'masuk', file: null, jenisId: null, initialData: null });

    // SKP Mapping States
    const [activeBalloonDocId, setActiveBalloonDocId] = useState<number | null>(null);
    const [showDocQaSubmenuId, setShowDocQaSubmenuId] = useState<number | null>(null);
    const [skpMappingDoc, setSkpMappingDoc] = useState<DokumenItem | null>(null);
    const [skpMappingYear, setSkpMappingYear] = useState<number>(2026);
    const [skpMappingMonth, setSkpMappingMonth] = useState<number>(new Date().getMonth() + 1);
    const [skpMappingButir, setSkpMappingButir] = useState<string>('');
    const [isSavingSkp, setIsSavingSkp] = useState<boolean>(false);

    const handleAddDocToQaScope = async (doc: DokumenItem, scopeKey: 'is_qa_all' | 'is_qa_bidang' | 'is_qa_personal') => {
        if (!doc.path) {
            showMsg('error', 'Path file tidak ditemukan.');
            return;
        }
        const publicUrl = doc.path.startsWith('http')
            ? doc.path
            : `${window.location.origin}${doc.path.startsWith('/') ? '' : '/'}${doc.path}`;
        
        try {
            const payload = {
                nama_aplikasi: doc.nama_file,
                url: publicUrl,
                sumber: doc.jenis_dokumen_nama || 'Perpustakaan Dokumen',
                is_quick_access: 1,
                is_qa_all: scopeKey === 'is_qa_all' ? 1 : 0,
                is_qa_bidang: scopeKey === 'is_qa_bidang' ? 1 : 0,
                is_qa_personal: scopeKey === 'is_qa_personal' ? 1 : 0
            };
            const res = await api.aplikasiExternal.create(payload);
            if (res && res.success) {
                const targetName = scopeKey === 'is_qa_all' ? 'Semua Bidang' : scopeKey === 'is_qa_bidang' ? 'Bidang Saya' : 'Personal';
                showMsg('success', `"${doc.nama_file}" berhasil ditambahkan ke Quick Access (${targetName})!`);
                setActiveBalloonDocId(null);
                setShowDocQaSubmenuId(null);
            } else {
                showMsg('error', res?.message || 'Gagal menambahkan ke Quick Access.');
            }
        } catch {
            showMsg('error', 'Terjadi kesalahan sistem.');
        }
    };

    // SKP Database Lists
    const [mappingSubKegiatans, setMappingSubKegiatans] = useState<any[]>([]);
    const [dbBidangList, setDbBidangList] = useState<any[]>([]);
    const [dbPegawaiList, setDbPegawaiList] = useState<any[]>([]);
    const [bidangUrusanList, setBidangUrusanList] = useState<any[]>([]);

    // Reference for Batch File Input
    const fileInputRef = useRef<HTMLInputElement>(null);

    useLayoutEffect(() => {
        if (hoveredHistory && historyRef.current) {
            const rect = historyRef.current.getBoundingClientRect();
            let left = hoveredHistory.x;
            let top = hoveredHistory.y - 15;
            let tx = '-50%';
            let ty = '-100%';

            // Horizontal check
            if (left - rect.width/2 < 20) {
                left = 20;
                tx = '0%';
            } else if (left + rect.width/2 > window.innerWidth - 20) {
                left = window.innerWidth - rect.width - 20;
                tx = '0%';
            }

            // Vertical check (if it hits top, show bottom)
            if (top - rect.height < 20) {
                top = hoveredHistory.y + 15;
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
    }, [hoveredHistory]);

    const handleRowMouseEnter = (e: React.MouseEvent, doc: DokumenItem) => {
        if (tooltipTimeoutRef.current) clearTimeout(tooltipTimeoutRef.current);
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        setHoveredHistory({
            x: rect.left + rect.width / 2,
            y: rect.top,
            history: doc.edit_history || [],
            name: doc.nama_file
        });
    };

    const handleRowMouseLeave = () => {
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
            setHoveredHistory(null);
        }, 800);
    };

    // Click outside to clear tooltip immediately
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            if (historyRef.current && !historyRef.current.contains(target)) {
                setHoveredHistory(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(25);

    // Trash bin state
    const [viewMode, setViewMode] = useState<'active' | 'trash'>('active');
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [isBulkDeleting, setIsBulkDeleting] = useState(false);
    const [isBulkRestoring, setIsBulkRestoring] = useState(false);
    const [isEmptyingTrash, setIsEmptyingTrash] = useState(false);

    // Document Dependency Check state
    const [dependencyData, setDependencyData] = useState<any | null>(null);
    const [targetDeleteId, setTargetDeleteId] = useState<number | null>(null);
    const [isDependencyModalOpen, setIsDependencyModalOpen] = useState(false);

    // Handle clicking outside to close tagging dropdowns
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            if (uploadTagRef.current && !uploadTagRef.current.contains(target)) setIsUploadTagOpen(false);
            if (uploadJenisRef.current && !uploadJenisRef.current.contains(target)) setIsUploadJenisOpen(false);
            if (editTagRef.current && !editTagRef.current.contains(target)) setIsEditTagOpen(false);
            if (editJenisRef.current && !editJenisRef.current.contains(target)) setIsEditJenisOpen(false);
            if (uploadUrusanRef.current && !uploadUrusanRef.current.contains(target)) setIsUploadUrusanOpen(false);
            if (editUrusanRef.current && !editUrusanRef.current.contains(target)) setIsEditUrusanOpen(false);
            if (filterJenisRef.current && !filterJenisRef.current.contains(target)) setIsFilterJenisOpen(false);
            if (filterTematikRef.current && !filterTematikRef.current.contains(target)) setIsFilterTematikOpen(false);
            
            // Close any active balloon menu if clicking outside the button
            if (target instanceof Element && !target.closest('.balloon-container-btn')) {
                setActiveBalloonDocId(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [docRes, jenisRes, tematikRes, mkiRes, bidangRes, pegawaiRes, urusanRes] = await Promise.all([
                viewMode === 'active' ? api.dokumen.getAll() : api.dokumen.getTrash(),
                api.masterDataConfig.getDataByTable('master_dokumen'),
                api.tematik.getAll(),
                api.mappingKegiatanInstansi.getAll().catch(() => ({ success: false, data: [] })),
                api.bidangInstansi.getAll().catch(() => ({ success: false, data: [] })),
                api.profilPegawai.getAll().catch(() => ({ success: false, data: [] })),
                api.bidangUrusan.getAll().catch(() => ({ success: false, data: [] }))
            ]);
            if (docRes.success) setDokumenList(docRes.data);
            if (jenisRes.success) {
                const sorted = (jenisRes.data || []).sort((a: any, b: any) => {
                    const isASurat = a.dokumen?.toLowerCase().startsWith('surat');
                    const isBSurat = b.dokumen?.toLowerCase().startsWith('surat');
                    if (isASurat && !isBSurat) return 1;
                    if (!isASurat && isBSurat) return -1;
                    return a.dokumen?.localeCompare(b.dokumen || '') || 0;
                });
                setJenisList(sorted);
            }
            if (tematikRes.success) setTematikList(tematikRes.data);
            if (mkiRes && mkiRes.success) setMappingSubKegiatans(mkiRes.data?.sub_kegiatan || mkiRes.data || []);
            if (bidangRes && bidangRes.success) setDbBidangList(bidangRes.data);
            if (pegawaiRes && pegawaiRes.success) {
                const filteredPegawai = (pegawaiRes.data || []).filter((p: any) =>
                    p.jenis_pegawai_nama === 'PNS' || p.jenis_pegawai_nama === 'PPPK Penuh Waktu'
                );
                setDbPegawaiList(filteredPegawai);
            }
            if (urusanRes && urusanRes.success) {
                setBidangUrusanList(urusanRes.data || []);
            }
        } catch (err) {
            console.error('Failed to fetch data', err);
        } finally {
            setLoading(false);
        }
    };

    const getBidangSingkatan = (id: number | null): string => {
        if (!id) return 'UMUM';
        const b = dbBidangList.find(x => Number(x.id) === id);
        if (b && b.singkatan) return b.singkatan.toUpperCase();
        if (b && b.nama_bidang) {
            const match = b.nama_bidang.match(/\(([^)]+)\)/);
            if (match) return match[1].toUpperCase();

            const words = b.nama_bidang.split(' ').filter((w: string) => {
                const lower = w.toLowerCase();
                return lower !== 'bidang' && lower !== '&' && lower !== 'dan';
            });
            if (words.length > 0) {
                return words.map((w: string) => w[0]).join('').toUpperCase();
            }
        }

        const fallbacks: Record<number, string> = {
            1: 'SEKRETARIAT',
            2: 'PPM',
            3: 'SDA',
            4: 'IPW',
            5: 'RENDALEV',
            6: 'RISET'
        };
        return (fallbacks[id || 1] || 'BIDANG').toUpperCase();
    };

    const getManualItemsForBidang = (bidangId: number, year: number): string[] => {
        const key = `${year}_${bidangId}`;
        let customList: string[] = [];
        try {
            const saved = localStorage.getItem('skp_manual_skp_items');
            if (saved) {
                const parsed = JSON.parse(saved);
                customList = parsed[key] || [];
            }
        } catch (e) {
            console.error(e);
        }
        if (customList && customList.length > 0) return customList;

        const singkatan = getBidangSingkatan(bidangId);
        return [
            `ADMINISTRASI ${singkatan.toUpperCase()}`,
            `PERENCANAAN DAN PENGUKURAN KINERJA`
        ];
    };

    const getSubActivitiesForBidang = (bidangId: number): { name: string; code?: string }[] => {
        const pegawaiIds = dbPegawaiList
            .filter(p => Number(p.bidang_id) === bidangId)
            .map(p => p.id);

        const dbSubKegs = mappingSubKegiatans.filter(sk => pegawaiIds.includes(sk.penanggung_jawab_id));

        const sortedSubKegs = [...dbSubKegs].sort((a, b) => {
            const urusanA = a.nama_urusan || '';
            const urusanB = b.nama_urusan || '';
            const cmpUrusan = urusanA.localeCompare(urusanB, undefined, { numeric: true });
            if (cmpUrusan !== 0) return cmpUrusan;

            const progA = a.nama_program || '';
            const progB = b.nama_program || '';
            const cmpProg = progA.localeCompare(progB, undefined, { numeric: true });
            if (cmpProg !== 0) return cmpProg;

            const kegA = a.nama_kegiatan || '';
            const kegB = b.nama_kegiatan || '';
            const cmpKeg = kegA.localeCompare(kegB, undefined, { numeric: true });
            if (cmpKeg !== 0) return cmpKeg;

            const codeA = a.kode_sub_kegiatan || '';
            const codeB = b.kode_sub_kegiatan || '';
            return codeA.localeCompare(codeB, undefined, { numeric: true, sensitivity: 'base' });
        });

        const seen = new Set<string>();
        const uniqueSubKegs: { name: string; code?: string }[] = [];

        sortedSubKegs.forEach(sk => {
            if (!seen.has(sk.nama_sub_kegiatan)) {
                seen.add(sk.nama_sub_kegiatan);
                uniqueSubKegs.push({
                    name: sk.nama_sub_kegiatan,
                    code: sk.kode_sub_kegiatan
                });
            }
        });

        return uniqueSubKegs;
    };

    const handleSaveSkpMapping = async () => {
        if (!skpMappingDoc) return;
        const pegawaiId = user?.profil_pegawai_id;
        const bidangId = user?.bidang_id || 1;

        if (!pegawaiId) {
            alert("Gagal memetakan dokumen ke SKP: Akun Anda tidak memiliki Profil Pegawai.");
            return;
        }

        if (!skpMappingButir) {
            alert("Pilih butir SKP terlebih dahulu.");
            return;
        }

        setIsSavingSkp(true);
        try {
            const payload = {
                pegawai_id: pegawaiId,
                tahun: skpMappingYear,
                bidang_id: bidangId,
                kategori: 'pendukung',
                bulan: skpMappingMonth,
                butir_skp: skpMappingButir,
                doc_name: skpMappingDoc.nama_file,
                doc_id: skpMappingDoc.id,
                status: 'Draft'
            };

            const res = await api.skp.savePegawaiRecord(payload);
            if (res && res.success) {
                showMsg('success', `Dokumen "${skpMappingDoc.nama_file}" berhasil dijadikan SKP untuk bulan ${skpMappingMonth} tahun ${skpMappingYear}`);
                setSkpMappingDoc(null);
            } else {
                alert(res?.message || 'Gagal menyimpan dokumen SKP');
            }
        } catch (err: any) {
            console.error('Failed to map document to SKP:', err);
            alert('Terjadi kesalahan saat menyimpan dokumen ke SKP: ' + err.message);
        } finally {
            setIsSavingSkp(false);
        }
    };

    useEffect(() => {
        fetchData();
        setSelectedIds([]); // Clear selection when switching modes
    }, [viewMode]);

    useEffect(() => {
        setSelectedIds([]); // Clear selection when page changes
    }, [currentPage, itemsPerPage]);

    const showMsg = (type: 'success' | 'error', text: string) => {
        setMessage({ type, text });
        setTimeout(() => setMessage(null), 5000);
    };

    const processFiles = (files: File[]) => {
        const allowedTypes = [
            'application/pdf', 
            'image/jpeg', 
            'image/png', 
            'image/gif', 
            'image/webp',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'application/vnd.ms-powerpoint',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-excel'
        ];
        
        const newItems: UploadItem[] = [];
        
        files.forEach(file => {
            const fileExt = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
            if (file.size > 50 * 1024 * 1024) return; // Skip too large

            const lastDotIdx = file.name.lastIndexOf('.');
            const namaVisual = lastDotIdx !== -1 ? file.name.substring(0, lastDotIdx) : file.name;
            const ekstensi = lastDotIdx !== -1 ? file.name.substring(lastDotIdx) : '';

            newItems.push({
                id: Math.random().toString(36).substr(2, 9),
                file,
                namaVisual: formatFilename(namaVisual),
                ekstensi,
                jenisId: '',
                bidangUrusanIds: [],
                tematikIds: [],
                isPrivate: false,
                status: 'idle'
            });
        });

        if (newItems.length > 0) {
            setUploadQueue(prev => [...prev, ...newItems]);
            if (activeUploadIdx === -1) setActiveUploadIdx(uploadQueue.length);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            processFiles(Array.from(e.target.files));
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            processFiles(Array.from(e.dataTransfer.files));
        }
    };

    const updateActiveItem = (updates: Partial<UploadItem>) => {
        if (activeUploadIdx === -1) return;
        setUploadQueue(prev => {
            const next = [...prev];
            next[activeUploadIdx] = { ...next[activeUploadIdx], ...updates };
            return next;
        });
    };

    const toggleActiveTematik = (id: number) => {
        if (activeUploadIdx === -1) return;
        const currentItem = uploadQueue[activeUploadIdx];
        const newIds = currentItem.tematikIds.includes(id)
            ? currentItem.tematikIds.filter(t => t !== id)
            : [...currentItem.tematikIds, id];
        updateActiveItem({ tematikIds: newIds });
    };

    const toggleActiveUrusan = (id: number) => {
        if (activeUploadIdx === -1) return;
        const currentItem = uploadQueue[activeUploadIdx];
        const newIds = currentItem.bidangUrusanIds.includes(id)
            ? currentItem.bidangUrusanIds.filter(u => u !== id)
            : [...currentItem.bidangUrusanIds, id];
        updateActiveItem({ bidangUrusanIds: newIds });
    };

    const applyToAll = () => {
        if (activeUploadIdx === -1) return;
        const currentItem = uploadQueue[activeUploadIdx];
        setUploadQueue(prev => prev.map(item => ({
            ...item,
            jenisId: currentItem.jenisId,
            tematikIds: [...currentItem.tematikIds],
            bidangUrusanIds: [...currentItem.bidangUrusanIds],
            isPrivate: currentItem.isPrivate
        })));
        showMsg('success', 'Konfigurasi diterapkan ke semua file dalam antrean.');
    };

    const handleJenisSelectInUpload = (val: string) => {
        if (activeUploadIdx === -1) return;
        
        const selectedType = jenisList.find(j => String(j.id) === String(val));
        if (selectedType) {
            const typeName = (selectedType.dokumen || '').toLowerCase();
            const currentFile = uploadQueue[activeUploadIdx].file;

            if (typeName.includes('surat masuk') || typeName.includes('undangan masuk')) {
                setRedirectSurat({ isOpen: true, type: 'masuk', file: currentFile, jenisId: val });
                setIsUploadModalOpen(false);
                return;
            } else if (typeName.includes('surat keluar') || typeName.includes('undangan keluar')) {
                setRedirectSurat({ isOpen: true, type: 'keluar', file: currentFile, jenisId: val });
                setIsUploadModalOpen(false);
                return;
            } else if (typeName.includes('surat internal') || typeName.includes('surat sakit') || typeName.includes('surat cuti')) {
                setRedirectSurat({ isOpen: true, type: 'internal', file: currentFile, jenisId: val });
                setIsUploadModalOpen(false);
                return;
            }
        }

        updateActiveItem({ jenisId: val });
    };

    const handleUpload = async () => {
        if (uploadQueue.length === 0) return;
        
        // Validate all have jenisId
        const invalidIdx = uploadQueue.findIndex(item => !item.jenisId);
        if (invalidIdx !== -1) {
            setActiveUploadIdx(invalidIdx);
            showMsg('error', `Harap pilih Jenis Dokumen untuk file: ${uploadQueue[invalidIdx].file.name}`);
            return;
        }

        setUploading(true);
        let successCount = 0;
        let failCount = 0;

        for (let i = 0; i < uploadQueue.length; i++) {
            const item = uploadQueue[i];
            
            // Update UI status
            setUploadQueue(prev => {
                const next = [...prev];
                next[i].status = 'uploading';
                return next;
            });

            try {
                const formData = new FormData();
                formData.append('file', item.file);
                formData.append('nama_file', item.namaVisual.trim() + item.ekstensi);
                formData.append('jenis_dokumen_id', item.jenisId);
                if (item.tematikIds.length > 0) {
                    formData.append('tematik_ids', item.tematikIds.join(','));
                }
                if (item.bidangUrusanIds && item.bidangUrusanIds.length > 0) {
                    formData.append('bidang_urusan_ids', item.bidangUrusanIds.join(','));
                }
                formData.append('is_private', item.isPrivate ? 'true' : 'false');

                const res = await api.dokumen.uploadWithProgress(formData, (percent) => {
                    setUploadQueue(prev => {
                        const next = [...prev];
                        next[i].progress = percent;
                        return next;
                    });
                });
                
                if (res.success) {
                    successCount++;
                } else {
                    failCount++;
                }

                setUploadQueue(prev => {
                    const next = [...prev];
                    if (res.success) {
                        next[i].status = 'success';
                        next[i].progress = 100;
                    } else {
                        next[i].status = 'error';
                        next[i].errorMsg = res.message || (res.duplicate ? 'Sudah ada di sistem' : 'Gagal');
                        if (res.duplicate) setDuplicateError(res.existing_file);
                    }
                    return next;
                });
            } catch (err) {
                setUploadQueue(prev => {
                    const next = [...prev];
                    next[i].status = 'error';
                    next[i].errorMsg = 'Kesalahan sistem';
                    return next;
                });
                failCount++;
            }
        }

        setUploading(false);
        if (successCount > 0) {
            showMsg('success', `${successCount} file berhasil diunggah!`);
            
            // Clear search and filters to ensure the new document is visible at the top
            setSearchTerm('');
            setSelectedJenis('');
            setSelectedTematikFilter('');
            setCurrentPage(1);
            
            await fetchData();
        }
        
        // If all success, auto close. If some failed, let user see.
        if (failCount === 0 && successCount > 0) {
            setIsUploadModalOpen(false);
            setUploadQueue([]);
            setActiveUploadIdx(-1);
        }
    };

    const handleDelete = async (id: number) => {
        if (viewMode === 'trash') {
            if (!confirm('Apakah Anda yakin ingin menghapus dokumen ini secara PERMANEN? File fisik juga akan dihapus dan tidak dapat dikembalikan.')) return;
            try {
                const res = await api.dokumen.permanentDelete(id);
                if (res.success) {
                    showMsg('success', 'Dokumen dihapus secara permanen.');
                    fetchData();
                } else {
                    showMsg('error', res.message || 'Gagal menghapus secara permanen.');
                }
            } catch (err) {
                showMsg('error', 'Terjadi kesalahan saat menghapus permanen.');
            }
            return;
        }

        // Tembak API checkDependencies terlebih dahulu untuk mendeteksi rujukan berkas aktif
        try {
            const depRes = await api.dokumen.checkDependencies(id);
            if (depRes.success && depRes.has_dependencies) {
                // Tampilkan warning modal jika memiliki rujukan berkas aktif
                setDependencyData(depRes.dependencies);
                setTargetDeleteId(id);
                setIsDependencyModalOpen(true);
                return;
            }
        } catch (err) {
            console.error('Failed to verify document dependencies:', err);
        }

        if (!confirm('Pindahkan dokumen ini ke tempat sampah?')) return;
        executeSoftDelete(id);
    };

    const executeSoftDelete = async (id: number) => {
        try {
            const res = await api.dokumen.delete(id);
            if (res.success) {
                showMsg('success', 'Dokumen dipindahkan ke tempat sampah.');
                fetchData();
            } else {
                showMsg('error', res.message || 'Gagal menghapus dokumen.');
            }
        } catch (err) {
            showMsg('error', 'Terjadi kesalahan saat menghapus.');
        }
    };

    const handleRestore = async (id: number) => {
        try {
            const res = await api.dokumen.restore(id);
            if (res.success) {
                showMsg('success', 'Dokumen berhasil dipulihkan.');
                fetchData();
            } else {
                showMsg('error', res.message || 'Gagal memulihkan dokumen.');
            }
        } catch (err) {
            showMsg('error', 'Terjadi kesalahan saat memulihkan.');
        }
    };

    const handleBulkRestore = async () => {
        if (selectedIds.length === 0) return;
        if (!confirm(`Pulihkan ${selectedIds.length} dokumen terpilih?`)) return;
        
        setIsBulkRestoring(true);
        try {
            const res = await api.dokumen.bulkRestore(selectedIds);
            if (res.success) {
                showMsg('success', res.message || `${selectedIds.length} dokumen berhasil dipulihkan.`);
                setSelectedIds([]);
                fetchData();
            } else {
                showMsg('error', res.message || 'Gagal memulihkan dokumen massal.');
            }
        } catch (err) {
            showMsg('error', 'Terjadi kesalahan saat pemulihan massal.');
        } finally {
            setIsBulkRestoring(false);
        }
    };

    const handleBulkDelete = async () => {
        if (selectedIds.length === 0) return;
        if (!confirm(`Hapus PERMANEN ${selectedIds.length} dokumen terpilih? Tindakan ini tidak dapat dibatalkan.`)) return;
        
        setIsBulkDeleting(true);
        try {
            const res = await api.dokumen.bulkDelete(selectedIds);
            if (res.success) {
                showMsg('success', res.message || `${selectedIds.length} dokumen berhasil dihapus permanen.`);
                setSelectedIds([]);
                fetchData();
            } else {
                showMsg('error', res.message || 'Gagal menghapus dokumen massal.');
            }
        } catch (err) {
            showMsg('error', 'Terjadi kesalahan saat penghapusan massal.');
        } finally {
            setIsBulkDeleting(false);
        }
    };

    const handleEmptyTrash = async () => {
        if (!confirm('Apakah Anda yakin ingin MENGOSONGKAN TEMPAT SAMPAH? Semua file Anda di tempat sampah akan dihapus secara PERMANEN dari server.')) return;
        if (!confirm('KONFIRMASI TERAKHIR: Anda benar-benar yakin? Ini tidak bisa dibatalkan.')) return;

        setIsEmptyingTrash(true);
        try {
            const res = await api.dokumen.emptyTrash();
            if (res.success) {
                showMsg('success', res.message || 'Tempat sampah berhasil dikosongkan.');
                setSelectedIds([]);
                fetchData();
            } else {
                showMsg('error', res.message || 'Gagal mengosongkan tempat sampah.');
            }
        } catch (err) {
            showMsg('error', 'Terjadi kesalahan saat mengosongkan tempat sampah.');
        } finally {
            setIsEmptyingTrash(false);
        }
    };

    const toggleSelectAll = () => {
        const allowedList = paginatedList.filter(d => isSuperAdmin || d.deleted_by === user?.id);
        if (selectedIds.length === allowedList.length && allowedList.length > 0) {
            setSelectedIds([]);
        } else {
            setSelectedIds(allowedList.map(d => d.id));
        }
    };

    const toggleSelectOne = (id: number) => {
        setSelectedIds(prev => 
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const startEdit = (doc: DokumenItem) => {
        if ((doc as any).surat_id) {
            const mappedSuratItem = {
                id: (doc as any).surat_id,
                nomor_surat: (doc as any).surat_nomor || '',
                perihal: (doc as any).surat_perihal || '',
                asal_surat: (doc as any).surat_asal || '',
                tujuan_surat: (doc as any).surat_tujuan || '',
                tanggal_surat: (doc as any).surat_tanggal_surat,
                tanggal_acara: (doc as any).surat_tanggal_acara,
                tanggal_akhir: (doc as any).surat_tanggal_akhir,
                tipe_surat: (doc as any).surat_tipe || 'internal',
                dokumen_id: doc.id,
                jenis_surat_id: doc.jenis_dokumen_id,
                master_dokumen_id: doc.jenis_dokumen_id,
                employee_id: (doc as any).surat_employee_id,
                nama_file: doc.nama_file,
                file_path: doc.path,
                bidang_id: doc.uploader_bidang_id,
                tematik_ids: (doc as any).tematik_ids || []
            };

            setRedirectSurat({
                isOpen: true,
                type: (doc as any).surat_tipe || 'internal',
                file: null,
                jenisId: doc.jenis_dokumen_id,
                initialData: mappedSuratItem
            });
            return;
        }

        setEditingDoc(doc);
        const lastDotIdx = doc.nama_file.lastIndexOf('.');
        if(lastDotIdx !== -1) {
            setEditNamaFile(doc.nama_file.substring(0, lastDotIdx));
            setEditFileExt(doc.nama_file.substring(lastDotIdx));
        } else {
            setEditNamaFile(doc.nama_file);
            setEditFileExt('');
        }
        setEditJenisId(String(doc.jenis_dokumen_id));
        // Extract bidang_urusan_ids
        const currentUrusanIds = (doc as any).bidang_urusan_ids 
            ? String((doc as any).bidang_urusan_ids).split(',').map(Number).filter(Boolean)
            : [];
        setEditBidangUrusanIds(currentUrusanIds);
        // Extract IDs from tematik_names if possible, but better to have it in DokumenItem
        // For now, let's assume the backend might need to be updated or we map from tematikList
        const currentTematiks = doc.tematik_names ? doc.tematik_names.split(',') : [];
        const matchedIds = tematikList
            .filter(t => currentTematiks.includes(t.nama))
            .map(t => t.id);
        setEditTematikIds(matchedIds);
        setEditIsPrivate((doc as any).is_private === 1 || (doc as any).is_private === true);
    };

    const handleUpdate = async () => {
        if (!editingDoc) return;
        setSaving(true);
        try {
            const res = await api.dokumen.update(editingDoc.id, {
                nama_file: editNamaFile.trim() + editFileExt,
                jenis_dokumen_id: editJenisId,
                tematik_ids: editTematikIds,
                bidang_urusan_ids: editBidangUrusanIds.join(','),
                is_private: editIsPrivate
            });
            if (res.success) {
                showMsg('success', 'Dokumen berhasil diperbarui.');
                setEditingDoc(null);
                fetchData();
            } else {
                showMsg('error', res.message || 'Gagal memperbarui dokumen.');
            }
        } catch (err) {
            showMsg('error', 'Terjadi kesalahan saat memperbarui.');
        } finally {
            setSaving(false);
        }
    };

    const formatSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const getFileIcon = (fileName: string) => {
        const ext = fileName.split('.').pop()?.toLowerCase();
        if (ext === 'pdf') return <FileIcon className="text-rose-500" size={20} />;
        if (['xlsx', 'xls', 'csv'].includes(ext || '')) return <FileSpreadsheet className="text-emerald-500" size={20} />;
        if (['docx', 'doc'].includes(ext || '')) return <FileText className="text-indigo-500" size={20} />;
        if (['pptx', 'ppt'].includes(ext || '')) return <Presentation className="text-orange-500" size={20} />;
        if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) return <FileImage className="text-blue-500" size={20} />;
        if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext || '')) return <Archive className="text-amber-500" size={20} />;
        return <FileQuestion className="text-slate-400" size={20} />;
    };

    const renderTematikCapsules = (namesString: string | null) => {
        if (!namesString) return null;
        const names = namesString.split(',').filter(Boolean);
        const limit = 2;
        const displayNames = names.slice(0, limit);
        const more = names.length - limit;

        return (
            <div className="flex flex-wrap gap-1 mt-1">
                {displayNames.map((name, i) => (
                    <span 
                        key={i} 
                        className="px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded text-[8px] font-black uppercase tracking-tight border border-blue-100"
                    >
                        {name}
                    </span>
                ))}
                {more > 0 && (
                    <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded text-[8px] font-black uppercase tracking-tight border border-slate-200">
                        +{more} lainnya
                    </span>
                )}
            </div>
        );
    };
    const filteredList = dokumenList.filter(doc => {
        const docSearchText = `${doc.nama_file} ${doc.jenis_dokumen_nama} ${doc.tematik_names || ''} ${doc.uploader_nama || ''}`.toLowerCase();
        const matchesSearch = docSearchText.includes(searchTerm.toLowerCase());
        const matchesJenis = selectedJenis === '' || String(doc.jenis_dokumen_id) === selectedJenis;
        const matchesTematik = selectedTematikFilter === '' || (doc.tematik_names || '').split(',').includes(selectedTematikFilter);
        
        // Filter by tab: Berkas (non-surat) vs Surat-Surat (surat)
        const jenis = jenisList.find(j => String(j.id) === String(doc.jenis_dokumen_id));
        const isSurat = jenis ? (jenis.is_surat === 1 || jenis.dokumen?.toLowerCase().startsWith('surat')) : doc.jenis_dokumen_nama?.toLowerCase().startsWith('surat');
        const matchesTab = activeLibTab === 'surat' ? isSurat : !isSurat;

        return matchesSearch && matchesJenis && matchesTematik && matchesTab;
    });

    // Reset pagination when filter changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, selectedJenis, selectedTematikFilter, itemsPerPage, activeLibTab]);

    const totalPages = itemsPerPage === 0 ? 1 : Math.ceil(filteredList.length / itemsPerPage);
    const paginatedList = itemsPerPage === 0 ? filteredList : filteredList.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const renderPageButtons = () => {
        if (totalPages <= 1) return null;
        const pages: (number | string)[] = [];
        const MAX_VISIBLE = 5;

        if (totalPages <= MAX_VISIBLE + 2) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            pages.push(1);
            let start = Math.max(2, currentPage - 1);
            let end = Math.min(totalPages - 1, currentPage + 1);

            if (currentPage <= 3) {
                end = 4;
            } else if (currentPage >= totalPages - 2) {
                start = totalPages - 3;
            }

            if (start > 2) pages.push('...');
            for (let i = start; i <= end; i++) pages.push(i);
            if (end < totalPages - 1) pages.push('...');
            pages.push(totalPages);
        }

        return (
            <div className="flex items-center gap-1.5">
                <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="p-2 rounded-xl border border-slate-200 text-slate-400 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                    <ChevronLeft size={16} />
                </button>
                {pages.map((p, i) => (
                    typeof p === 'string' ? (
                        <span key={`dots-${i}`} className="px-2 text-slate-400"><MoreHorizontal size={14} /></span>
                    ) : (
                        <button
                            key={p}
                            onClick={() => setCurrentPage(p)}
                            className={`min-w-[40px] h-10 rounded-xl font-bold text-xs transition-all ${
                                currentPage === p
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-100'
                                : 'bg-white border border-slate-200 text-slate-500 hover:border-blue-200 hover:text-blue-600'
                            }`}
                        >
                            {p}
                        </button>
                    )
                ))}
                <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-xl border border-slate-200 text-slate-400 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                    <ChevronRight size={16} />
                </button>
            </div>
        );
    };

    const canEdit = (doc: DokumenItem) => {
        if (!user) return false;
        
        const isSuperadmin = user.tipe_user_id === 1;
        const isAgencyLevel = [2, 5, 7, 8].includes(user.tipe_user_id);
        if (isSuperadmin || isAgencyLevel) return true;

        const isDivisionLevel = [4, 6, 9, 10].includes(user.tipe_user_id);
        if (isDivisionLevel) {
            return user.bidang_id === doc.uploader_bidang_id;
        }

        return doc.uploaded_by === user.id;
    };

    return (
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 pb-10 space-y-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight">
                        {viewMode === 'active' ? 'Manajemen Dokumen' : 'Tempat Sampah Dokumen'}
                    </h2>
                    <p className="text-slate-500 text-sm">
                        {viewMode === 'active' 
                            ? 'Pusat unggah dan kelola file dokumen pendukung (PDF & Gambar).' 
                            : 'Daftar dokumen yang dihapus. File akan dihapus permanen otomatis setelah 30 hari.'
                        }
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200">
                        <button 
                            onClick={() => setViewMode('active')}
                            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${viewMode === 'active' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <Database size={14} />
                            Aktif
                        </button>
                        <button 
                            onClick={() => setViewMode('trash')}
                            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${viewMode === 'trash' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <Trash2 size={14} />
                            Sampah
                        </button>
                    </div>

                    {viewMode === 'active' && (
                        <button 
                            onClick={() => setIsUploadModalOpen(true)}
                            className="bg-ppm-blue text-white px-5 py-2.5 rounded-2xl text-xs font-black shadow-lg shadow-blue-200 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                        >
                            <Upload size={16} />
                            Unggah Dokumen
                        </button>
                    )}

                    {viewMode === 'trash' && paginatedList.length > 0 && canDeletePermanently && (
                        <button 
                             onClick={handleEmptyTrash}
                             disabled={isEmptyingTrash || loading}
                             className="bg-white border border-rose-100 text-rose-600 px-4 py-2 rounded-xl text-xs font-black shadow-sm hover:shadow-md hover:bg-rose-50 transition-all flex items-center gap-2 disabled:opacity-50"
                        >
                            {isEmptyingTrash ? <Loader2 size={14} className="animate-spin" /> : <Trash size={14} />}
                            Kosongkan Tempat Sampah
                        </button>
                    )}
                </div>
            </div>

            {/* Notification Toast */}
            {message && (
                <div className={`p-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300 border shadow-lg ${
                    message.type === 'success' 
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                    : 'bg-rose-50 text-rose-700 border-rose-100'
                }`}>
                    {message.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                    <span className="font-bold text-sm">{message.text}</span>
                    <button onClick={() => setMessage(null)} className="ml-auto opacity-50 hover:opacity-100 transition-opacity">
                        <X size={18} />
                    </button>
                </div>
            )}

            <div className="flex flex-col gap-6">
                <div className="flex-1 min-w-0 space-y-4">
                    <div className="card-modern bg-white border border-slate-100 shadow-xl shadow-slate-200/40 !overflow-visible">
                        {/* Tab Berkas vs Surat-Surat */}
                        <div className="flex border-b border-slate-100 px-4 pt-3 bg-slate-50/50">
                            <button
                                onClick={() => setActiveLibTab('berkas')}
                                className={`px-4 py-2 text-xs font-black uppercase tracking-widest border-b-2 transition-all flex items-center gap-2 select-none ${
                                    activeLibTab === 'berkas'
                                    ? 'border-blue-600 text-blue-600'
                                    : 'border-transparent text-slate-400 hover:text-slate-600'
                                }`}
                            >
                                <FileText size={14} />
                                Berkas / Dokumen
                            </button>
                            <button
                                onClick={() => setActiveLibTab('surat')}
                                className={`px-4 py-2 text-xs font-black uppercase tracking-widest border-b-2 transition-all flex items-center gap-2 select-none ${
                                    activeLibTab === 'surat'
                                    ? 'border-blue-600 text-blue-600'
                                    : 'border-transparent text-slate-400 hover:text-slate-600'
                                }`}
                            >
                                <Clock size={14} />
                                Surat-Surat
                            </button>
                        </div>
                        {/* Filters */}
                        {/* Filters & Pagination Meta */}
                        <div className="px-4 py-2.5 border-b border-slate-50 bg-slate-50/30">
                            <div className="flex flex-col xl:flex-row gap-4 items-center justify-between">
                                <div className="flex items-center justify-between w-full xl:w-auto gap-4 pr-0 xl:pr-4 border-r-0 xl:border-r border-slate-200">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tampilkan</span>
                                        <select
                                            value={itemsPerPage}
                                            onChange={(e) => setItemsPerPage(Number(e.target.value))}
                                            className="bg-white border border-slate-200 text-slate-700 text-[11px] font-black rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-1.5"
                                        >
                                            <option value={25}>25</option>
                                            <option value={50}>50</option>
                                            <option value={100}>100</option>
                                            <option value={250}>250</option>
                                            <option value={0}>Semua</option>
                                        </select>
                                    </div>
                                    <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">
                                        <span className="text-blue-600">{paginatedList.length}</span> dari <span className="text-slate-800">{filteredList.length}</span> data
                                    </div>
                                </div>

                                <div className="flex flex-col md:flex-row gap-3 w-full xl:w-auto">
                                    <div className="md:w-44">
                                        <SearchableSelect 
                                            options={jenisList
                                                .filter(j => {
                                                    const isSurat = j.is_surat === 1 || j.dokumen?.toLowerCase().startsWith('surat');
                                                    return activeLibTab === 'surat' ? isSurat : !isSurat;
                                                })
                                                .map(j => ({ id: j.id, label: j.dokumen }))
                                            }
                                            value={selectedJenis}
                                            onChange={setSelectedJenis}
                                            placeholder="Semua Jenis"
                                            isFilter={true}
                                            isOpen={isFilterJenisOpen}
                                            setIsOpen={setIsFilterJenisOpen}
                                            searchQuery={filterJenisSearch}
                                            setSearchQuery={setFilterJenisSearch}
                                            containerRef={filterJenisRef}
                                        />
                                    </div>
                                    <div className="md:w-44">
                                        <SearchableSelect 
                                            options={tematikList.map(t => ({ id: t.nama, label: t.nama }))}
                                            value={selectedTematikFilter}
                                            onChange={setSelectedTematikFilter}
                                            placeholder="Semua Tematik"
                                            isFilter={true}
                                            isOpen={isFilterTematikOpen}
                                            setIsOpen={setIsFilterTematikOpen}
                                            searchQuery={filterTematikSearch}
                                            setSearchQuery={setFilterTematikSearch}
                                            containerRef={filterTematikRef}
                                        />
                                    </div>
                                    <div className="relative flex-1 md:w-64">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                        <input 
                                            type="text" 
                                            className="input-modern w-full pl-10" 
                                            placeholder="Cari file, jenis, atau tema..." 
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="overflow-x-auto min-h-[500px]">
                            {loading ? (
                                <div className="flex flex-col items-center justify-center py-20 gap-3">
                                    <Loader2 className="animate-spin text-ppm-blue" size={32} />
                                    <p className="text-sm font-bold text-slate-400 animate-pulse">Memuat Data Dokumen...</p>
                                </div>
                            ) : filteredList.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 text-center px-10">
                                    <div className="p-4 bg-slate-50 rounded-full text-slate-200 mb-4">
                                        <FileText size={48} />
                                    </div>
                                    <h4 className="text-slate-800 font-black">Tidak Ada Dokumen</h4>
                                    <p className="text-slate-500 text-sm mt-1">
                                        {searchTerm || selectedJenis 
                                            ? "Hasil pencarian tidak ditemukan." 
                                            : "Belum ada dokumen yang diunggah."
                                        }
                                    </p>
                                </div>
                            ) : (
                                <table className="w-full text-left border-collapse table-auto">
                                    <thead>
                                        <tr className="bg-slate-50/30 border-b border-slate-100 text-left">
                                            {viewMode === 'trash' && (
                                                <th className="px-3 py-2 text-center w-[40px]">
                                                    <input 
                                                        type="checkbox" 
                                                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                                        checked={
                                                            (() => {
                                                                const allowedList = paginatedList.filter(d => isSuperAdmin || d.deleted_by === user?.id);
                                                                return allowedList.length > 0 && selectedIds.length === allowedList.length;
                                                            })()
                                                        }
                                                        onChange={toggleSelectAll}
                                                    />
                                                </th>
                                            )}
                                            <th className="px-3 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest w-[5%] text-center">#</th>
                                            <th className="px-3 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest w-[45%]">Informasi Dokumen</th>
                                            <th className="px-3 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest hidden md:table-cell w-[15%]">Jenis Dokumen</th>
                                            <th className="px-3 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest hidden md:table-cell w-[15%]">Bidang Urusan</th>
                                            <th className="px-3 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest hidden lg:table-cell w-[10%] text-center">Detail File</th>
                                            <th className="px-3 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center w-[10%]">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {paginatedList.map((doc, idx) => {
                                            const globalIdx = itemsPerPage === 0 ? idx + 1 : (currentPage - 1) * itemsPerPage + idx + 1;
                                            
                                            return (
                                                <tr 
                                                    key={doc.id} 
                                                    className={`hover:bg-slate-50/50 transition-colors group relative hover:z-[60] ${selectedIds.includes(doc.id) ? 'bg-blue-50/30' : ''}`}
                                                >
                                                    {viewMode === 'trash' && (
                                                        <td className="px-3 py-2 text-center">
                                                            {(isSuperAdmin || doc.deleted_by === user?.id) ? (
                                                                <input 
                                                                    type="checkbox" 
                                                                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                                                    checked={selectedIds.includes(doc.id)}
                                                                    onChange={() => toggleSelectOne(doc.id)}
                                                                />
                                                            ) : null}
                                                        </td>
                                                    )}
                                                    <td className="px-3 py-2 text-center">
                                                        <span className="text-[9px] font-bold text-slate-300 tabular-nums">{globalIdx}</span>
                                                    </td>
                                                    <td className="px-3 py-2 max-w-0">
                                                    <div className="flex items-center gap-2.5 min-w-0">
                                                        <div className="shrink-0 group-hover:scale-105 transition-transform">
                                                            {getFileIcon(doc.nama_file)}
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <div className="flex items-center gap-1.5 group/docname min-w-0 relative">
                                                                <div className="text-[13px] font-black text-slate-700 truncate" title={doc.nama_file}>
                                                                    {doc.nama_file}
                                                                </div>
                                                                
 
                                                                
                                                                {/* 3-dots button visible on hover */}
                                                                <div className="opacity-0 group-hover/docname:opacity-100 transition-opacity relative balloon-container-btn shrink-0">
                                                                    <button 
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setActiveBalloonDocId(activeBalloonDocId === doc.id ? null : doc.id);
                                                                        }} 
                                                                        className="p-1 hover:bg-slate-100 rounded-md text-slate-400 hover:text-indigo-600 transition-colors flex items-center justify-center"
                                                                        title="Opsi Dokumen"
                                                                    >
                                                                        <MoreVertical size={13} />
                                                                    </button>
 
                                                                    {/* Balloon dropdown */}
                                                                    {activeBalloonDocId === doc.id && (
                                                                        <div className="absolute left-0 mt-1 w-40 bg-white border border-slate-100 rounded-xl shadow-xl z-[90] p-1 animate-in zoom-in-95 duration-100 origin-top-left space-y-0.5">
                                                                            <button
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    setActiveBalloonDocId(null);
                                                                                    setSkpMappingDoc(doc);
                                                                                    setSkpMappingYear(2026); // Default 2026
                                                                                    setSkpMappingMonth(new Date().getMonth() + 1);
                                                                                    
                                                                                    // Pre-select first available butir SKP
                                                                                    const bid = user?.bidang_id || 1;
                                                                                    const subs = getSubActivitiesForBidang(bid);
                                                                                    const manuals = getManualItemsForBidang(bid, 2026);
                                                                                    const firstItem = subs.length > 0 ? subs[0].name : (manuals.length > 0 ? manuals[0] : '');
                                                                                    setSkpMappingButir(firstItem);
                                                                                }}
                                                                                className="w-full text-left px-2.5 py-1.5 text-[10px] font-bold text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg transition-colors flex items-center gap-1.5"
                                                                            >
                                                                                <Database size={12} />
                                                                                Jadikan SKP
                                                                            </button>

                                                                            <button
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    setActiveBalloonDocId(null);
                                                                                    if (doc.path) {
                                                                                        const publicUrl = doc.path.startsWith('http')
                                                                                            ? doc.path
                                                                                            : `${window.location.origin}${doc.path.startsWith('/') ? '' : '/'}${doc.path}`;
                                                                                        navigator.clipboard.writeText(publicUrl);
                                                                                        showMsg('success', `Link publik "${doc.nama_file}" berhasil disalin!`);
                                                                                    } else {
                                                                                        showMsg('error', 'Path file tidak ditemukan.');
                                                                                    }
                                                                                }}
                                                                                className="w-full text-left px-2.5 py-1.5 text-[10px] font-bold text-slate-600 hover:bg-emerald-50 hover:text-emerald-600 rounded-lg transition-colors flex items-center gap-1.5"
                                                                            >
                                                                                <Copy size={12} />
                                                                                Salin Link Publik
                                                                            </button>

                                                                            <div 
                                                                                 className="relative"
                                                                                 onMouseEnter={() => setShowDocQaSubmenuId(doc.id)}
                                                                                 onMouseLeave={() => setShowDocQaSubmenuId(null)}
                                                                             >
                                                                                 <button
                                                                                     type="button"
                                                                                     onClick={(e) => {
                                                                                         e.stopPropagation();
                                                                                         setShowDocQaSubmenuId(showDocQaSubmenuId === doc.id ? null : doc.id);
                                                                                     }}
                                                                                     className="w-full text-left px-2.5 py-1.5 text-[10px] font-bold text-slate-600 hover:bg-amber-50 hover:text-amber-700 rounded-lg transition-colors flex items-center justify-between gap-1.5"
                                                                                 >
                                                                                     <div className="flex items-center gap-1.5">
                                                                                         <Zap size={12} className="fill-amber-400 text-amber-500" />
                                                                                         Quick Access
                                                                                     </div>
                                                                                     <ChevronRight size={11} className="text-slate-400" />
                                                                                 </button>

                                                                                 {/* 3 Scope Options Submenu Popover */}
                                                                                 {showDocQaSubmenuId === doc.id && (
                                                                                     <div 
                                                                                         className="absolute left-full top-0 ml-1 w-44 bg-white border border-slate-200/90 rounded-xl shadow-2xl z-[100000] p-2 space-y-1.5 animate-in fade-in zoom-in-95 duration-100"
                                                                                         onClick={(e) => e.stopPropagation()}
                                                                                     >
                                                                                         <div className="text-[9px] font-black text-slate-400 uppercase tracking-wider px-1 pb-1 border-b border-slate-100">
                                                                                             PILIH TARGET AKSES:
                                                                                         </div>
                                                                                         
                                                                                         <button
                                                                                             type="button"
                                                                                             onClick={() => handleAddDocToQaScope(doc, 'is_qa_all')}
                                                                                             className="w-full text-left flex items-center gap-2 px-1.5 py-1 rounded-lg hover:bg-slate-50 text-[10px] font-bold text-slate-700 transition-colors"
                                                                                         >
                                                                                             <span className="w-2 h-2 rounded-full bg-amber-400" />
                                                                                             Semua Bidang
                                                                                         </button>

                                                                                         <button
                                                                                             type="button"
                                                                                             onClick={() => handleAddDocToQaScope(doc, 'is_qa_bidang')}
                                                                                             className="w-full text-left flex items-center gap-2 px-1.5 py-1 rounded-lg hover:bg-slate-50 text-[10px] font-bold text-slate-700 transition-colors"
                                                                                         >
                                                                                             <span className="w-2 h-2 rounded-full bg-indigo-500" />
                                                                                             Bidang Saya
                                                                                         </button>

                                                                                         <button
                                                                                             type="button"
                                                                                             onClick={() => handleAddDocToQaScope(doc, 'is_qa_personal')}
                                                                                             className="w-full text-left flex items-center gap-2 px-1.5 py-1 rounded-lg hover:bg-slate-50 text-[10px] font-bold text-slate-700 transition-colors"
                                                                                         >
                                                                                             <span className="w-2 h-2 rounded-full bg-purple-500" />
                                                                                             Personal
                                                                                         </button>
                                                                                     </div>
                                                                                 )}
                                                                             </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div className="text-[9px] font-bold text-slate-400 mt-0.5">
                                                                {formatSize(doc.ukuran)}
                                                            </div>
                                                            {renderTematikCapsules(doc.tematik_names)}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-3 py-2 hidden md:table-cell">
                                                    <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[9px] font-black uppercase tracking-tight border border-slate-200">
                                                        {doc.jenis_dokumen_nama}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-2 hidden md:table-cell">
                                                    {doc.bidang_urusan_nama ? (
                                                        <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded text-[9px] font-black uppercase tracking-tight border border-indigo-100 block max-w-[120px] truncate" title={doc.bidang_urusan_nama}>
                                                            {doc.bidang_urusan_nama}
                                                        </span>
                                                    ) : (
                                                        <span className="text-[9px] text-slate-400 font-bold italic">-</span>
                                                    )}
                                                </td>
                                                <td className="px-3 py-2 hidden lg:table-cell">
                                                    <div className="flex items-center justify-center">
                                                        {(() => {
                                                            const sortedHistory = doc.edit_history && doc.edit_history.length > 0 
                                                                ? [...doc.edit_history].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                                                                : [];
                                                            const lastHistory = sortedHistory.length > 0 ? sortedHistory[0] : null;
                                                            const dotColor = !lastHistory ? 'bg-blue-500' : 
                                                                            lastHistory.aksi === 'upload' ? 'bg-blue-500' :
                                                                            lastHistory.aksi === 'delete' ? 'bg-rose-500' :
                                                                            lastHistory.aksi === 'restore' ? 'bg-emerald-500' :
                                                                            'bg-amber-500'; // edit
                                                            const dotShadow = dotColor.replace('bg-', 'shadow-');
 
                                                            return (
                                                                <span 
                                                                    className="px-1.5 py-0.5 bg-white text-slate-500 rounded text-[9px] font-black uppercase tracking-widest border border-slate-100 cursor-pointer hover:bg-slate-50 transition-all shadow-sm active:scale-95 flex items-center gap-1"
                                                                    onMouseEnter={(e) => handleRowMouseEnter(e, doc)}
                                                                    onMouseLeave={handleRowMouseLeave}
                                                                >
                                                                    Telusuri
                                                                    <div className={`w-1 h-1 rounded-full ${dotColor} ${dotShadow} shadow-sm opacity-100`} />
                                                                </span>
                                                            );
                                                        })()}
                                                    </div>
                                                </td>
                                                <td className="px-3 py-2">
                                                    <div className="flex items-center justify-center gap-1.5">
                                                        {viewMode === 'active' ? (
                                                            <>
                                                                <button 
                                                                    onClick={() => setViewingDoc({ 
                                                                        path: doc.path, 
                                                                        nama_file: doc.nama_file,
                                                                        is_private: (doc as any).is_private,
                                                                        uploaded_by: doc.uploaded_by
                                                                    })}
                                                                    className="p-1.5 bg-white border border-slate-100 text-slate-400 hover:text-ppm-blue hover:border-blue-100 hover:bg-blue-50 rounded-lg transition-all shadow-sm hover:shadow-md"
                                                                    title="Pratinjau / Lihat"
                                                                >
                                                                    <Eye size={14} />
                                                                </button>
                                                                {canEdit(doc) && (
                                                                    <>
                                                                        <button 
                                                                            onClick={() => startEdit(doc)}
                                                                            className="p-1.5 bg-white border border-slate-100 text-slate-400 hover:text-amber-600 hover:border-amber-100 hover:bg-amber-50 rounded-lg transition-all shadow-sm hover:shadow-md"
                                                                            title="Edit"
                                                                        >
                                                                            <Edit2 size={14} />
                                                                        </button>
                                                                        <button 
                                                                            onClick={() => handleDelete(doc.id)}
                                                                            className="p-1.5 bg-white border border-slate-100 text-slate-400 hover:text-rose-600 hover:border-rose-100 hover:bg-rose-50 rounded-lg transition-all shadow-sm hover:shadow-md"
                                                                            title="Pindahkan ke Sampah"
                                                                        >
                                                                            <Trash2 size={14} />
                                                                        </button>
                                                                    </>
                                                                )}
                                                            </>
                                                        ) : (
                                                            <>
                                                                {(isSuperAdmin || doc.deleted_by === user?.id) && (
                                                                    <button 
                                                                        onClick={() => handleRestore(doc.id)}
                                                                        className="p-1.5 bg-white border border-slate-100 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all shadow-sm hover:shadow-md"
                                                                        title="Pulihkan (Restore)"
                                                                    >
                                                                        <Undo size={14} />
                                                                    </button>
                                                                )}
                                                                {canDeletePermanently && (isSuperAdmin || doc.deleted_by === user?.id) && (
                                                                    <button 
                                                                        onClick={() => handleDelete(doc.id)}
                                                                        className="p-1.5 bg-white border border-slate-100 text-rose-600 hover:bg-rose-50 rounded-lg transition-all shadow-sm hover:shadow-md"
                                                                        title="Hapus Permanen"
                                                                    >
                                                                        <Trash2 size={14} />
                                                                    </button>
                                                                )}
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            )}
                        </div>

                        {/* Footer Pagination */}
                        <div className="px-4 py-3 border-t border-slate-50 bg-slate-50/20 flex flex-col md:flex-row items-center justify-between gap-4">
                            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                                Halaman <span className="text-slate-800">{currentPage}</span> dari <span className="text-slate-800">{totalPages}</span>
                            </div>
                            {renderPageButtons()}
                        </div>
                    </div>
                </div>
            </div>

            {/* Bulk Action Floating Bar */}
            {viewMode === 'trash' && selectedIds.length > 0 && (
                <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] bg-slate-900 text-white px-6 py-4 rounded-3xl shadow-2xl flex items-center gap-6 animate-in slide-in-from-bottom-10 fade-in duration-500 border border-slate-800 backdrop-blur-xl bg-opacity-90">
                    <div className="flex items-center gap-3 pr-6 border-r border-slate-800">
                        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-[12px] font-black">
                            {selectedIds.length}
                        </div>
                        <span className="text-xs font-black uppercase tracking-widest text-slate-400">Dokumen Terpilih</span>
                    </div>

                    <div className="flex items-center gap-3">
                        <button 
                            onClick={handleBulkRestore}
                            disabled={isBulkRestoring}
                            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50"
                        >
                            {isBulkRestoring ? <Loader2 size={14} className="animate-spin" /> : <Undo size={14} />}
                            Pulihkan Terpilih
                        </button>
                        {canDeletePermanently && (
                            <button 
                                onClick={handleBulkDelete}
                                disabled={isBulkDeleting}
                                className="px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-black transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50"
                            >
                                {isBulkDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                                Hapus Permanen
                            </button>
                        )}
                        <button 
                            onClick={() => setSelectedIds([])}
                            className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl transition-all"
                            title="Batalkan Pilihan"
                        >
                            <X size={16} />
                        </button>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {editingDoc && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg border border-slate-100 animate-in zoom-in-95 duration-300 relative">
                        <div className="p-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-amber-100 text-amber-600 rounded-2xl">
                                    <Edit2 size={20} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-black text-slate-800 tracking-tight">Edit Dokumen</h3>
                                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-0.5">Perbarui informasi file</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setEditingDoc(null)}
                                className="p-2 hover:bg-white rounded-xl text-slate-400 hover:text-rose-500 transition-all shadow-sm hover:shadow-md border border-transparent hover:border-slate-100"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        
                        <div className="p-6 space-y-5">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Nama Dokumen</label>
                                <div className="flex">
                                    <input 
                                        type="text"
                                        className="input-modern w-full rounded-r-none border-r-0 focus:border-r"
                                        value={editNamaFile}
                                        onChange={(e) => setEditNamaFile(e.target.value)}
                                    />
                                    <span className="flex items-center px-4 bg-slate-100 border border-slate-200 border-l-0 rounded-r-xl text-slate-500 font-bold text-xs select-none shadow-inner">
                                        {editFileExt}
                                    </span>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Jenis Dokumen</label>
                                <SearchableSelect 
                                    options={jenisList
                                        .filter(j => {
                                            if (!editingDoc) return true;
                                            const docJenis = jenisList.find(x => String(x.id) === String(editingDoc.jenis_dokumen_id));
                                            const docIsSurat = docJenis ? (docJenis.is_surat === 1 || docJenis.dokumen?.toLowerCase().startsWith('surat')) : editingDoc.jenis_dokumen_nama?.toLowerCase().startsWith('surat');
                                            const thisIsSurat = j.is_surat === 1 || j.dokumen?.toLowerCase().startsWith('surat');
                                            return docIsSurat ? thisIsSurat : !thisIsSurat;
                                        })
                                        .map(j => ({ id: j.id, label: j.dokumen }))
                                    }
                                    value={editJenisId}
                                    onChange={setEditJenisId}
                                    placeholder="-- Pilih Jenis Dokumen --"
                                    isOpen={isEditJenisOpen}
                                    setIsOpen={setIsEditJenisOpen}
                                    searchQuery={editJenisSearch}
                                    setSearchQuery={setEditJenisSearch}
                                    containerRef={editJenisRef}
                                    dropUp={true}
                                    isFilter={false}
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Status Akses Dokumen</label>
                                <div className="flex items-center justify-between p-3 border border-slate-100 rounded-2xl bg-slate-50/50 shadow-inner">
                                    <div className="flex items-center gap-2.5">
                                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
                                            editIsPrivate 
                                            ? 'bg-indigo-50 text-indigo-600 shadow-sm' 
                                            : 'bg-emerald-50 text-emerald-600 shadow-sm'
                                        }`}>
                                            {editIsPrivate ? <Lock size={14} /> : <Globe size={14} />}
                                        </div>
                                        <div>
                                            <div className="text-[11px] font-bold text-slate-700">
                                                {editIsPrivate ? 'Pribadi / Private' : 'Share (Publik)'}
                                            </div>
                                            <div className="text-[9px] font-semibold text-slate-400 mt-0.5">
                                                {editIsPrivate 
                                                    ? 'Hanya Anda yang dapat melihat berkas ini' 
                                                    : 'Semua orang dapat melihat berkas ini'}
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* Premium Sliding Toggle */}
                                    <button 
                                        type="button"
                                        className={`relative inline-flex h-6 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-300 ease-in-out focus:outline-none ${
                                            editIsPrivate ? 'bg-indigo-600' : 'bg-emerald-500'
                                        }`}
                                        onClick={() => setEditIsPrivate(!editIsPrivate)}
                                    >
                                        <span className="sr-only">Toggle Private Status</span>
                                        <span 
                                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-300 ease-in-out flex items-center justify-center ${
                                                editIsPrivate ? 'translate-x-6' : 'translate-x-0'
                                            }`}
                                        >
                                            <div className={`w-1.5 h-1.5 rounded-full ${editIsPrivate ? 'bg-indigo-600' : 'bg-emerald-500'}`} />
                                        </span>
                                    </button>
                                </div>
                            </div>

                            <div className="relative" ref={editUrusanRef}>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Bidang Urusan (Opsional)</label>
                                <div 
                                    className="min-h-[42px] p-2.5 border border-slate-200 rounded-2xl bg-white cursor-pointer flex flex-wrap gap-1 items-center hover:border-indigo-500 transition-all shadow-sm"
                                    onClick={() => setIsEditUrusanOpen(!isEditUrusanOpen)}
                                >
                                    {editBidangUrusanIds.length > 0 ? (
                                        editBidangUrusanIds.map(id => {
                                            const u = bidangUrusanList.find(x => x.id === id);
                                            return (
                                                <span key={id} className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-bold border border-indigo-100 flex items-center gap-1">
                                                    {u?.urusan}
                                                    <X 
                                                        size={10} 
                                                        className="hover:text-rose-500 cursor-pointer" 
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setEditBidangUrusanIds(prev => prev.filter(x => x !== id));
                                                        }}
                                                    />
                                                </span>
                                            );
                                        })
                                    ) : (
                                        <span className="text-xs text-slate-400 ml-1">Pilih bidang urusan...</span>
                                    )}
                                </div>

                                {isEditUrusanOpen && (
                                    <div className="absolute z-[100] w-full bottom-full mb-2 bg-white border border-slate-200 shadow-2xl rounded-2xl p-3 animate-in fade-in zoom-in-95 duration-200 origin-bottom">
                                        <div className="flex items-center justify-between mb-2 px-1">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pilih Bidang Urusan</span>
                                            <X size={14} className="text-slate-400 cursor-pointer hover:text-rose-500 transition-colors" onClick={() => setIsEditUrusanOpen(false)} />
                                        </div>
                                        <div className="relative mb-3">
                                            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-indigo-500 opacity-50" />
                                            <input 
                                                type="text"
                                                className="w-full pl-10 pr-3 py-2 bg-slate-50 border-2 border-transparent focus:border-indigo-500/20 rounded-xl text-[11px] font-bold focus:ring-0 transition-all placeholder:font-normal placeholder:text-slate-400 shadow-inner"
                                                placeholder="Cari bidang urusan..."
                                                value={editUrusanSearch}
                                                onChange={(e) => setEditUrusanSearch(e.target.value)}
                                                autoFocus
                                            />
                                        </div>
                                        <div className="max-h-[150px] overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                                            {bidangUrusanList
                                                .filter(u => u.urusan.toLowerCase().includes(editUrusanSearch.toLowerCase()))
                                                .map(u => (
                                                    <div 
                                                        key={u.id} 
                                                        className={`flex items-center justify-between p-2 rounded-lg text-[10px] font-bold cursor-pointer transition-all border ${
                                                            editBidangUrusanIds.includes(u.id)
                                                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg'
                                                            : 'hover:bg-slate-50 text-slate-600 border-transparent hover:border-slate-100'
                                                        }`}
                                                        onClick={() => {
                                                            setEditBidangUrusanIds(prev => 
                                                                prev.includes(u.id) ? prev.filter(x => x !== u.id) : [...prev, u.id]
                                                            );
                                                        }}
                                                    >
                                                        <span>{u.urusan}</span>
                                                        {editBidangUrusanIds.includes(u.id) ? <CheckCircle2 size={14} /> : <div className="w-4 h-4 rounded-full border-2 border-slate-100" />}
                                                    </div>
                                                ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="relative" ref={editTagRef}>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Tagging Tematik</label>
                                <div 
                                    className="min-h-[42px] p-2.5 border border-slate-200 rounded-2xl bg-white cursor-pointer flex flex-wrap gap-1 items-center"
                                    onClick={() => setIsEditTagOpen(!isEditTagOpen)}
                                >
                                    {editTematikIds.length > 0 ? (
                                        editTematikIds.map(id => {
                                            const t = tematikList.find(x => x.id === id);
                                            return (
                                                <span key={id} className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-bold border border-blue-100 flex items-center gap-1">
                                                    {t?.nama}
                                                    <X 
                                                        size={10} 
                                                        className="hover:text-rose-500" 
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setEditTematikIds(prev => prev.filter(x => x !== id));
                                                        }}
                                                    />
                                                </span>
                                            );
                                        })
                                    ) : (
                                        <span className="text-xs text-slate-400 ml-1">Pilih tagging...</span>
                                    )}
                                </div>

                                {isEditTagOpen && (
                                    <div className="absolute z-[100] w-full bottom-full mb-2 bg-white border border-slate-200 shadow-2xl rounded-2xl p-3 animate-in fade-in zoom-in-95 duration-200 origin-bottom">
                                        <div className="flex items-center justify-between mb-2 px-1">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pilih Tagging</span>
                                            <X size={14} className="text-slate-400 cursor-pointer hover:text-rose-500 transition-colors" onClick={() => setIsEditTagOpen(false)} />
                                        </div>
                                        <div className="relative mb-3">
                                            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ppm-blue opacity-50" />
                                            <input 
                                                type="text"
                                                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-2 border-transparent focus:border-ppm-blue/20 rounded-xl text-[12px] font-bold focus:ring-0 transition-all placeholder:font-normal placeholder:text-slate-400"
                                                placeholder="Cari tema / tagging..."
                                                value={editTagSearch}
                                                onChange={(e) => setEditTagSearch(e.target.value)}
                                                autoFocus
                                            />
                                        </div>
                                        <div className="max-h-[180px] overflow-y-auto space-y-0.5 pr-1 custom-scrollbar">
                                            {tematikList
                                                .filter(t => t.nama.toLowerCase().includes(editTagSearch.toLowerCase()))
                                                .map(t => (
                                                    <div 
                                                        key={t.id}
                                                        className={`flex items-center justify-between p-1.5 rounded-xl text-[11px] font-bold cursor-pointer transition-all ${
                                                            editTematikIds.includes(t.id)
                                                            ? 'bg-blue-600 text-white shadow-md shadow-blue-100'
                                                            : 'hover:bg-slate-50 text-slate-600 border border-transparent hover:border-slate-100'
                                                        }`}
                                                        onClick={() => {
                                                            setEditTematikIds(prev => 
                                                                prev.includes(t.id) ? prev.filter(x => x !== t.id) : [...prev, t.id]
                                                            );
                                                        }}
                                                    >
                                                        <span>{t.nama}</span>
                                                        {editTematikIds.includes(t.id) ? <CheckCircle2 size={12} /> : <div className="w-4 h-4 rounded-full border-2 border-slate-100" />}
                                                    </div>
                                                ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="p-6 bg-slate-50/50 border-t border-slate-50 flex gap-3">
                            <button 
                                onClick={() => setEditingDoc(null)}
                                className="flex-1 py-3 px-4 rounded-xl border border-slate-200 text-slate-500 font-bold text-xs hover:bg-white transition-all active:scale-[0.98]"
                            >
                                Batal
                            </button>
                            <button 
                                onClick={handleUpdate}
                                disabled={saving}
                                className="flex-2 py-3 px-8 rounded-xl bg-blue-600 text-white font-black text-xs shadow-lg shadow-blue-200 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                            >
                                {saving ? (
                                    <>
                                        <Loader2 className="animate-spin" size={16} />
                                        <span>Menyimpan...</span>
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle2 size={16} />
                                        <span>Simpan Perubahan</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Upload Modal - BATCH MODE */}
            {isUploadModalOpen && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xl animate-in fade-in duration-300">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-6xl h-[85vh] border border-slate-100 animate-in zoom-in-95 duration-300 relative overflow-hidden flex flex-col">
                        
                        {/* Header */}
                        <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-white relative z-10 shrink-0">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl shadow-lg shadow-emerald-100/50">
                                    <Upload size={24} strokeWidth={2.5} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-slate-800 tracking-tight">Batch Upload Dokumen</h3>
                                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-0.5">Kelola antrean pengunggahan Anda</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                {uploadQueue.length > 0 && !uploading && (
                                    <button 
                                        onClick={() => fileInputRef.current?.click()}
                                        className="text-xs font-black text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-4 py-2 rounded-xl transition-all flex items-center gap-2 border border-emerald-100"
                                    >
                                        <FileText size={14} /> Tambah File Lagi
                                    </button>
                                )}
                                <button 
                                    onClick={() => {
                                        if (uploading) return;
                                        setIsUploadModalOpen(false);
                                        setUploadQueue([]);
                                        setActiveUploadIdx(-1);
                                    }}
                                    className="p-2 hover:bg-slate-50 rounded-xl text-slate-400 hover:text-rose-500 transition-all border border-transparent hover:border-slate-100"
                                >
                                    <X size={24} />
                                </button>
                            </div>
                        </div>

                        {/* Body - Split View */}
                        <div 
                            className="flex-1 flex overflow-hidden"
                            onDragOver={handleDragOver}
                            onDrop={handleDrop}
                        >
                            {/* Left: Queue List */}
                            <div className="w-1/3 border-r border-slate-100 flex flex-col bg-slate-50/30">
                                <div className="p-4 bg-white border-b border-slate-50 flex justify-between items-center shrink-0">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Antrean: {uploadQueue.length} File</span>
                                    {uploadQueue.length > 1 && !uploading && (
                                        <button 
                                            onClick={applyToAll}
                                            className="text-[9px] font-black text-white bg-slate-900 px-3 py-1.5 rounded-lg hover:bg-slate-800 transition-all flex items-center gap-1.5"
                                        >
                                            <Undo size={10} className="rotate-90" /> Terapkan Aktif Ke Semua
                                        </button>
                                    )}
                                </div>
                                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                                    {uploadQueue.length === 0 ? (
                                        <div 
                                            className="h-full border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center p-8 text-center cursor-pointer hover:border-emerald-500 hover:bg-white transition-all group"
                                            onClick={() => fileInputRef.current?.click()}
                                        >
                                            <div className="p-5 bg-slate-100 text-slate-300 rounded-3xl mb-4 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                                                <Upload size={32} />
                                            </div>
                                            <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Klik atau seret file ke sini untuk memulai</p>
                                        </div>
                                    ) : (
                                        uploadQueue.map((item, idx) => (
                                            <div 
                                                key={item.id}
                                                onClick={() => !uploading && setActiveUploadIdx(idx)}
                                                className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden group ${
                                                    activeUploadIdx === idx 
                                                    ? 'bg-white border-emerald-500 ring-4 ring-emerald-500/5 shadow-xl shadow-emerald-100/50' 
                                                    : 'bg-white border-slate-100 hover:border-slate-300 shadow-sm'
                                                }`}
                                            >
                                                <div className="flex items-center gap-3 relative z-10">
                                                    <div className={`p-2.5 rounded-xl ${
                                                        item.status === 'success' ? 'bg-emerald-100 text-emerald-600' :
                                                        item.status === 'error' ? 'bg-rose-100 text-rose-600' :
                                                        item.status === 'uploading' ? 'bg-indigo-50 text-indigo-600' :
                                                        'bg-slate-100 text-slate-400'
                                                    }`}>
                                                        {item.status === 'uploading' ? <Loader2 size={16} className="animate-spin" /> : getFileIcon(item.file.name)}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-xs font-black text-slate-800 truncate">{item.namaVisual + item.ekstensi}</p>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <span className="text-[9px] font-black text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md uppercase">{formatSize(item.file.size)}</span>
                                                            {item.jenisId && (
                                                                <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md uppercase border border-emerald-100">
                                                                    {jenisList.find(j => String(j.id) === item.jenisId)?.dokumen || 'Jenis'}
                                                                </span>
                                                            )}
                                                            {item.status === 'uploading' && item.progress !== undefined && (
                                                                <span className="text-[9px] font-extrabold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                                                                    MENGUNGGAH {item.progress}%
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    {!uploading && (
                                                        <button 
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                const nextIdx = activeUploadIdx >= idx ? activeUploadIdx - 1 : activeUploadIdx;
                                                                setUploadQueue(prev => prev.filter((_, i) => i !== idx));
                                                                setActiveUploadIdx(nextIdx < 0 && uploadQueue.length > 1 ? 0 : nextIdx);
                                                            }}
                                                            className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-500 rounded-lg transition-all"
                                                        >
                                                            <X size={14} />
                                                        </button>
                                                    )}
                                                </div>

                                                {/* Progress Bar (Visible during upload) */}
                                                {item.status === 'uploading' && item.progress !== undefined && (
                                                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-100">
                                                        <div 
                                                            className="h-full bg-indigo-600 transition-all duration-300" 
                                                            style={{ width: `${item.progress}%` }}
                                                        />
                                                    </div>
                                                )}

                                                {item.status === 'error' && (
                                                    <p className="mt-2 text-[9px] font-black text-rose-500 uppercase tracking-widest relative z-10">{item.errorMsg}</p>
                                                )}
                                                {item.status === 'success' && (
                                                    <div className="absolute top-2 right-2 text-emerald-500 relative z-10">
                                                        <CheckCircle2 size={14} />
                                                    </div>
                                                )}
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* Right: Item Detail Form */}
                            <div className="flex-1 overflow-y-auto bg-white p-10 custom-scrollbar">
                                {activeUploadIdx !== -1 ? (
                                    <div className="max-w-2xl mx-auto space-y-10 animate-in fade-in slide-in-from-right-4 duration-500">
                                        <div className="flex items-center gap-6">
                                            <div className="w-24 h-24 bg-slate-50 rounded-[2rem] flex items-center justify-center border-2 border-slate-100 shadow-inner">
                                                {getFileIcon(uploadQueue[activeUploadIdx].file.name)}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center justify-between mb-2">
                                                    <h4 className="text-xl font-black text-slate-800 tracking-tight leading-tight">
                                                        Konfigurasi File {activeUploadIdx + 1}
                                                    </h4>
                                                    {/* Toggle Share/Privat sejajar dengan heading */}
                                                    <button
                                                        type="button"
                                                        className={`relative inline-flex h-8 w-16 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-300 ease-in-out focus:outline-none ${
                                                            uploadQueue[activeUploadIdx].isPrivate ? 'bg-indigo-600' : 'bg-emerald-500'
                                                        }`}
                                                        onClick={() => {
                                                            const currentVal = uploadQueue[activeUploadIdx].isPrivate;
                                                            updateActiveItem({ isPrivate: !currentVal });
                                                        }}
                                                        title={uploadQueue[activeUploadIdx].isPrivate ? 'Pribadi – klik untuk ubah ke Share' : 'Share – klik untuk ubah ke Pribadi'}
                                                    >
                                                        <span className="sr-only">Toggle Private Status</span>
                                                        <span
                                                            className={`pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow-lg ring-0 transition duration-300 ease-in-out flex items-center justify-center ${
                                                                uploadQueue[activeUploadIdx].isPrivate ? 'translate-x-8' : 'translate-x-0'
                                                            }`}
                                                        >
                                                            <div className={`w-2 h-2 rounded-full ${uploadQueue[activeUploadIdx].isPrivate ? 'bg-indigo-600' : 'bg-emerald-500'}`} />
                                                        </span>
                                                    </button>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className="px-3 py-1 bg-slate-100 text-slate-500 rounded-full text-[10px] font-black uppercase tracking-widest">
                                                        {uploadQueue[activeUploadIdx].file.name.split('.').pop()}
                                                    </span>
                                                    <span className="px-3 py-1 bg-slate-100 text-slate-500 rounded-full text-[10px] font-black uppercase tracking-widest">
                                                        {formatSize(uploadQueue[activeUploadIdx].file.size)}
                                                    </span>
                                                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1 ${
                                                        uploadQueue[activeUploadIdx].isPrivate
                                                        ? 'bg-indigo-50 text-indigo-600'
                                                        : 'bg-emerald-50 text-emerald-600'
                                                    }`}>
                                                        {uploadQueue[activeUploadIdx].isPrivate ? <Lock size={10} /> : <Globe size={10} />}
                                                        {uploadQueue[activeUploadIdx].isPrivate ? 'Pribadi' : 'Share'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-8">
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Nama File Visual</label>
                                                <div className="flex">
                                                    <input 
                                                        type="text"
                                                        className="input-modern w-full rounded-r-none border-r-0 focus:border-r !py-4"
                                                        value={uploadQueue[activeUploadIdx].namaVisual}
                                                        onChange={(e) => updateActiveItem({ namaVisual: e.target.value })}
                                                        placeholder="Masukkan nama file..."
                                                    />
                                                    <span className="flex items-center px-6 bg-slate-50 border border-slate-200 border-l-0 rounded-r-2xl text-slate-500 font-bold text-xs select-none shadow-inner">
                                                        {uploadQueue[activeUploadIdx].ekstensi}
                                                    </span>
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Jenis Dokumen</label>
                                                <SearchableSelect 
                                                    options={jenisList.map(j => ({ id: j.id, label: j.dokumen }))}
                                                    value={uploadQueue[activeUploadIdx].jenisId}
                                                    onChange={handleJenisSelectInUpload}
                                                    placeholder="-- Pilih Jenis Dokumen --"
                                                    isOpen={isUploadJenisOpen}
                                                    setIsOpen={setIsUploadJenisOpen}
                                                    searchQuery={uploadJenisSearch}
                                                    setSearchQuery={setUploadJenisSearch}
                                                    containerRef={uploadJenisRef}
                                                    className="!py-1"
                                                />
                                            </div>



                                            <div className="relative" ref={uploadUrusanRef}>
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Bidang Urusan (Opsional)</label>
                                                <div 
                                                    className="min-h-[56px] p-3 border border-slate-200 rounded-2xl bg-white cursor-pointer flex flex-wrap gap-2 items-center hover:border-indigo-500 transition-all shadow-sm"
                                                    onClick={() => setIsUploadUrusanOpen(!isUploadUrusanOpen)}
                                                >
                                                    {uploadQueue[activeUploadIdx].bidangUrusanIds.length > 0 ? (
                                                        uploadQueue[activeUploadIdx].bidangUrusanIds.map(id => {
                                                            const u = bidangUrusanList.find(x => x.id === id);
                                                            return (
                                                                <span key={id} className="px-4 py-1.5 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-black border border-indigo-100 flex items-center gap-2 shadow-sm">
                                                                    {u?.urusan}
                                                                    <X 
                                                                        size={12} 
                                                                        className="hover:text-rose-500 transition-colors" 
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            toggleActiveUrusan(id);
                                                                        }}
                                                                    />
                                                                </span>
                                                            );
                                                        })
                                                    ) : (
                                                        <span className="text-xs text-slate-400 ml-2">Pilih bidang urusan...</span>
                                                    )}
                                                </div>

                                                {isUploadUrusanOpen && (
                                                    <div className="absolute z-[100] w-full bottom-full mb-3 bg-white border border-slate-200 shadow-2xl rounded-[1.5rem] p-5 animate-in fade-in zoom-in-95 duration-200 origin-bottom">
                                                        <div className="flex items-center justify-between mb-4 px-1">
                                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pilih Bidang Urusan</span>
                                                            <X size={16} className="text-slate-400 cursor-pointer hover:text-rose-500 transition-colors" onClick={() => setIsUploadUrusanOpen(false)} />
                                                        </div>
                                                        <div className="relative mb-4">
                                                            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-500 opacity-50" />
                                                            <input 
                                                                type="text"
                                                                className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border-2 border-transparent focus:border-indigo-500/20 rounded-2xl text-[12px] font-black focus:ring-0 transition-all placeholder:font-normal placeholder:text-slate-400 shadow-inner"
                                                                placeholder="Cari bidang urusan..."
                                                                value={uploadUrusanSearch}
                                                                onChange={(e) => setUploadUrusanSearch(e.target.value)}
                                                                autoFocus
                                                            />
                                                        </div>
                                                        <div className="max-h-[200px] overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                                                            {bidangUrusanList
                                                                .filter(u => u.urusan.toLowerCase().includes(uploadUrusanSearch.toLowerCase()))
                                                                .map(u => (
                                                                    <div 
                                                                        key={u.id} 
                                                                        className={`flex items-center justify-between p-3 rounded-xl text-[11px] font-black cursor-pointer transition-all border ${
                                                                            uploadQueue[activeUploadIdx].bidangUrusanIds.includes(u.id)
                                                                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-100'
                                                                            : 'hover:bg-slate-50 text-slate-600 border-transparent hover:border-slate-100'
                                                                        }`}
                                                                        onClick={() => toggleActiveUrusan(u.id)}
                                                                    >
                                                                        <span>{u.urusan}</span>
                                                                        {uploadQueue[activeUploadIdx].bidangUrusanIds.includes(u.id) ? <CheckCircle2 size={16} /> : <div className="w-5 h-5 rounded-full border-2 border-slate-100" />}
                                                                    </div>
                                                                ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="relative" ref={uploadTagRef}>
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Tagging Tematik (Opsional)</label>
                                                <div 
                                                    className="min-h-[56px] p-3 border border-slate-200 rounded-2xl bg-white cursor-pointer flex flex-wrap gap-2 items-center hover:border-emerald-500 transition-all shadow-sm"
                                                    onClick={() => setIsUploadTagOpen(!isUploadTagOpen)}
                                                >
                                                    {uploadQueue[activeUploadIdx].tematikIds.length > 0 ? (
                                                        uploadQueue[activeUploadIdx].tematikIds.map(id => {
                                                            const t = tematikList.find(x => x.id === id);
                                                            return (
                                                                <span key={id} className="px-4 py-1.5 bg-emerald-50 text-emerald-600 rounded-xl text-[10px] font-black border border-emerald-100 flex items-center gap-2 shadow-sm">
                                                                    {t?.nama}
                                                                    <X 
                                                                        size={12} 
                                                                        className="hover:text-rose-500 transition-colors" 
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            toggleActiveTematik(id);
                                                                        }}
                                                                    />
                                                                </span>
                                                            );
                                                        })
                                                    ) : (
                                                        <span className="text-xs text-slate-400 ml-2">Pilih tagging tematik...</span>
                                                    )}
                                                </div>

                                                {isUploadTagOpen && (
                                                    <div className="absolute z-[100] w-full bottom-full mb-3 bg-white border border-slate-200 shadow-2xl rounded-[1.5rem] p-5 animate-in fade-in zoom-in-95 duration-200 origin-bottom">
                                                        <div className="flex items-center justify-between mb-4 px-1">
                                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pilih Tagging</span>
                                                            <X size={16} className="text-slate-400 cursor-pointer hover:text-rose-500 transition-colors" onClick={() => setIsUploadTagOpen(false)} />
                                                        </div>
                                                        <div className="relative mb-4">
                                                            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500 opacity-50" />
                                                            <input 
                                                                type="text"
                                                                className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border-2 border-transparent focus:border-emerald-500/20 rounded-2xl text-[12px] font-black focus:ring-0 transition-all placeholder:font-normal placeholder:text-slate-400 shadow-inner"
                                                                placeholder="Cari tema / tagging..."
                                                                value={uploadTagSearch}
                                                                onChange={(e) => setUploadTagSearch(e.target.value)}
                                                                autoFocus
                                                            />
                                                        </div>
                                                        <div className="max-h-[200px] overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                                                            {tematikList
                                                                .filter(t => t.nama.toLowerCase().includes(uploadTagSearch.toLowerCase()))
                                                                .map(t => (
                                                                    <div 
                                                                        key={t.id}
                                                                        className={`flex items-center justify-between p-3 rounded-xl text-[11px] font-black cursor-pointer transition-all border ${
                                                                            uploadQueue[activeUploadIdx].tematikIds.includes(t.id)
                                                                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-100'
                                                                            : 'hover:bg-slate-50 text-slate-600 border-transparent hover:border-slate-100'
                                                                        }`}
                                                                        onClick={() => toggleActiveTematik(t.id)}
                                                                    >
                                                                        <span>{t.nama}</span>
                                                                        {uploadQueue[activeUploadIdx].tematikIds.includes(t.id) ? <CheckCircle2 size={16} /> : <div className="w-5 h-5 rounded-full border-2 border-slate-100" />}
                                                                    </div>
                                                                ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-center space-y-6">
                                        <div className="w-24 h-24 bg-slate-50 rounded-[2.5rem] flex items-center justify-center border-2 border-dashed border-slate-200">
                                            <FileText size={40} className="text-slate-300" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-black text-slate-600">Pilih file dari daftar di samping untuk mengatur detail</p>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">Atau klik tombol "Tambah File Lagi" di pojok kanan atas</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Footer - Actions */}
                        <div className="p-8 bg-slate-50 border-t border-slate-100 flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-4">
                                <div className="flex -space-x-3">
                                    {uploadQueue.slice(0, 5).map((item, i) => (
                                        <div key={item.id} className="w-10 h-10 rounded-full border-4 border-white bg-slate-100 flex items-center justify-center shadow-sm overflow-hidden z-[10]">
                                            {getFileIcon(item.file.name)}
                                        </div>
                                    ))}
                                    {uploadQueue.length > 5 && (
                                        <div className="w-10 h-10 rounded-full border-4 border-white bg-slate-900 text-white flex items-center justify-center text-[10px] font-black z-[5]">
                                            +{uploadQueue.length - 5}
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <p className="text-xs font-black text-slate-800 leading-none">Total Antrean</p>
                                    <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">{uploadQueue.length} File Siap Unggah</p>
                                </div>
                            </div>
                            
                            <div className="flex gap-4">
                                <button 
                                    onClick={() => {
                                        setIsUploadModalOpen(false);
                                        setUploadQueue([]);
                                        setActiveUploadIdx(-1);
                                    }}
                                    className="px-8 py-4 rounded-2xl border border-slate-200 text-slate-500 font-black text-xs uppercase tracking-widest hover:bg-white transition-all active:scale-[0.98]"
                                >
                                    Batal
                                </button>
                                <button 
                                    onClick={handleUpload}
                                    disabled={uploadQueue.length === 0 || uploading}
                                    className={`px-12 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all duration-300 shadow-xl flex items-center justify-center gap-3 ${
                                        uploadQueue.length > 0 && !uploading
                                        ? 'bg-emerald-600 text-white shadow-emerald-100 hover:scale-[1.02] active:scale-[0.98]'
                                        : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                                    }`}
                                >
                                    {uploading ? (
                                        <>
                                            <Loader2 className="animate-spin text-white" size={18} />
                                            <span>Sedang Memproses...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Upload size={18} />
                                            <span>Mulai Unggah ({uploadQueue.length})</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                        
                        {/* Hidden File Input for Batch Addition */}
                        <input 
                            type="file" 
                            className="hidden" 
                            ref={fileInputRef}
                            onChange={handleFileSelect}
                            multiple
                            accept=".pdf,image/*,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar,.7z"
                        />
                    </div>
                </div>
            )}
            {/* Duplicate File Blocked Modal */}
            {duplicateError && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md border border-rose-100 animate-in zoom-in-95 duration-300 overflow-hidden">
                        <div className="bg-rose-50 p-8 flex flex-col items-center text-center gap-4">
                            <div className="w-20 h-20 bg-white rounded-3xl shadow-xl shadow-rose-100 flex items-center justify-center text-rose-500 mb-2">
                                <AlertCircle size={40} strokeWidth={2.5} />
                            </div>
                            <h3 className="text-xl font-black text-slate-800 tracking-tight">Upload Terblokir</h3>
                            <p className="text-sm font-bold text-rose-600/80 leading-relaxed px-4">
                                File yang sama telah ada di sistem
                            </p>
                            <div className="w-full bg-white/60 backdrop-blur-sm border border-rose-100 p-4 rounded-2xl space-y-2">
                                <div className="text-left">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Nama Asli File Saat Diunggah</span>
                                    <span className="text-xs font-bold text-slate-700 break-all">{duplicateError.nama_asli_unggah}</span>
                                </div>
                                <div className="h-px bg-rose-100/50 w-full" />
                                <div className="text-left">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Nama File Saat Ini</span>
                                    <span className="text-xs font-bold text-slate-700 break-all">{duplicateError.nama_file_saat_ini}</span>
                                </div>
                            </div>
                            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mt-2 animate-pulse">
                                Hubungi admin instansi Anda
                            </p>
                        </div>
                        <div className="p-6">
                            <button 
                                onClick={() => setDuplicateError(null)}
                                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all active:scale-[0.98] shadow-xl shadow-slate-200"
                            >
                                Mengerti
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* History Hover Tooltip - Premium Floating Version */}
            {hoveredHistory && (
                <div 
                    ref={historyRef}
                    className="fixed z-[9999] transition-opacity duration-200 animate-in fade-in zoom-in-95 pointer-events-none"
                    style={historyStyle}
                    onMouseEnter={handleTooltipMouseEnter}
                    onMouseLeave={handleTooltipMouseLeave}
                >
                    <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 p-4 min-w-[280px] max-w-[320px] overflow-hidden relative pointer-events-auto">
                        <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500" />
                        <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-50 px-1">
                            <History size={14} className="text-blue-600" />
                            <div>
                                <span className="text-[10px] font-black text-slate-800 uppercase tracking-widest block">Riwayat Perubahan</span>
                                <span className="text-[8px] font-bold text-slate-400 uppercase truncate block max-w-[220px]">{hoveredHistory.name}</span>
                            </div>
                        </div>
                        
                        <div className="space-y-4 max-h-[250px] overflow-y-auto custom-scrollbar pr-1 px-1">
                            {hoveredHistory.history.length === 0 ? (
                                <div className="py-4 text-center text-slate-300 italic text-[10px] font-bold">
                                    Belum ada data riwayat
                                </div>
                            ) : (
                                hoveredHistory.history
                                    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                                    .map((h, idx) => (
                                        <div key={h.id} className="relative pl-6 pb-2 last:pb-0">
                                            {/* Dot */}
                                            <div className={`absolute left-0 top-1 w-2.5 h-2.5 rounded-full border-2 border-white shadow-sm z-10 
                                                ${h.aksi === 'upload' ? 'bg-blue-500 shadow-blue-100' : 
                                                  h.aksi === 'delete' ? 'bg-rose-500 shadow-rose-100' : 
                                                  h.aksi === 'restore' ? 'bg-emerald-500 shadow-emerald-100' : 
                                                  'bg-amber-500 shadow-amber-100'}`} 
                                            />
                                            {/* Line */}
                                            {idx < hoveredHistory.history.length - 1 && (
                                                <div className="absolute left-[4px] top-4 w-[2px] h-full bg-slate-100" />
                                            )}
                                            
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center justify-between gap-2">
                                                    <span className={`text-[9px] font-black uppercase tracking-wider
                                                        ${h.aksi === 'upload' ? 'text-blue-600' : 
                                                          h.aksi === 'delete' ? 'text-rose-600' : 
                                                          h.aksi === 'restore' ? 'text-emerald-600' : 
                                                          'text-amber-600'}`}
                                                    >
                                                        {h.aksi === 'upload' ? 'Diupload' : h.aksi === 'delete' ? 'Dihapus' : h.aksi === 'restore' ? 'Dipulihkan' : 'Diubah'}
                                                    </span>
                                                    <span className="text-[8px] font-bold text-slate-300">
                                                        {new Date(h.created_at).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                                <p className="text-[11px] font-medium text-slate-600 leading-relaxed">
                                                    {h.keterangan}
                                                </p>
                                                <p className="text-[9px] font-bold text-slate-400 flex items-center gap-1 mt-0.5">
                                                    <Users size={10} />
                                                    {h.user_nama}
                                                    {h.user_bidang && <span className="opacity-70 font-black">.{h.user_bidang}</span>}
                                                </p>
                                            </div>
                                        </div>
                                    ))
                            )}
                        </div>
                    </div>
                </div>
            )}
            {/* Premium Document Viewer Modal */}
            <DocumentViewerModal 
                isOpen={!!viewingDoc}
                onClose={() => setViewingDoc(null)}
                fileUrl={viewingDoc?.path || ''}
                fileName={viewingDoc?.nama_file || ''}
                disableDownload={
                    viewingDoc?.is_private === 1 || viewingDoc?.is_private === true
                        ? viewingDoc?.uploaded_by !== user?.id
                        : false
                }
            />

            {/* Specialized Surat Registration Modal for Redirection */}
            <SuratRegistrationModal 
                isOpen={redirectSurat.isOpen}
                onClose={() => {
                    setRedirectSurat(prev => ({ ...prev, isOpen: false, initialData: null }));
                    if (redirectSurat.file) {
                        setIsUploadModalOpen(true);
                    }
                }}
                onSuccess={() => {
                    setRedirectSurat(prev => ({ ...prev, isOpen: false, initialData: null }));
                    if (activeUploadIdx !== -1) {
                        setUploadQueue(prev => prev.filter((_, i) => i !== activeUploadIdx));
                        setActiveUploadIdx(prev => prev > 0 ? prev - 1 : (uploadQueue.length > 1 ? 0 : -1));
                    }
                    if (redirectSurat.file) {
                        setIsUploadModalOpen(true);
                    }
                    fetchData();
                }}
                defaultType={redirectSurat.type}
                initialFile={redirectSurat.file}
                initialJenisSuratId={redirectSurat.jenisId}
                initialData={redirectSurat.initialData}
                user={user}
            />

            {/* Modal Jadikan SKP */}
            {skpMappingDoc && (
                <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white rounded-3xl shadow-[0_32px_128px_-16px_rgba(0,0,0,0.3)] border border-slate-100 p-6 w-full max-w-lg animate-in zoom-in-95 duration-300">
                        {/* Header */}
                        <div className="flex items-center gap-3 mb-5 pb-3 border-b border-slate-100">
                            <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-indigo-500 text-white shadow-xl shadow-indigo-500/25">
                                <Database size={22} />
                            </div>
                            <div className="min-w-0 flex-1">
                                <h3 className="text-base font-black text-slate-800 leading-tight">Jadikan Berkas SKP</h3>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5 truncate" title={skpMappingDoc.nama_file}>
                                    {skpMappingDoc.nama_file}
                                </p>
                            </div>
                            <button 
                                onClick={() => setSkpMappingDoc(null)}
                                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Form */}
                        <div className="space-y-4 mb-6">
                            {/* Tahun */}
                            <div className="space-y-1.5">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Tahun SKP</label>
                                <select 
                                    value={skpMappingYear}
                                    onChange={(e) => {
                                        const yr = Number(e.target.value);
                                        setSkpMappingYear(yr);
                                        // Update default butir SKP
                                        const bid = user?.bidang_id || 1;
                                        const subs = getSubActivitiesForBidang(bid);
                                        const manuals = getManualItemsForBidang(bid, yr);
                                        const firstItem = subs.length > 0 ? subs[0].name : (manuals.length > 0 ? manuals[0] : '');
                                        setSkpMappingButir(firstItem);
                                    }}
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200/50 rounded-2xl text-xs font-bold text-slate-700 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer"
                                >
                                    {[2024, 2025, 2026, 2027].map(yr => (
                                        <option key={yr} value={yr}>{yr}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Bulan */}
                            <div className="space-y-1.5">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Bulan</label>
                                <select 
                                    value={skpMappingMonth}
                                    onChange={(e) => setSkpMappingMonth(Number(e.target.value))}
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200/50 rounded-2xl text-xs font-bold text-slate-700 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer"
                                >
                                    {[
                                        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
                                        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
                                    ].map((m, idx) => (
                                        <option key={m} value={idx + 1}>{m}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Butir SKP */}
                            <div className="space-y-1.5">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Butir SKP / Kegiatan</label>
                                <select 
                                    value={skpMappingButir}
                                    onChange={(e) => setSkpMappingButir(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200/50 rounded-2xl text-xs font-bold text-slate-700 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer"
                                >
                                    {/* Sub Activities */}
                                    <optgroup label="Sub Kegiatan Bidang">
                                        {getSubActivitiesForBidang(user?.bidang_id || 1).map(item => (
                                            <option key={item.name} value={item.name}>
                                                {item.code ? `[${item.code}] ` : ''}{item.name}
                                            </option>
                                        ))}
                                    </optgroup>
                                    {/* Manual / Default Items */}
                                    <optgroup label="Kegiatan Administrasi / Umum">
                                        {getManualItemsForBidang(user?.bidang_id || 1, skpMappingYear).map(name => (
                                            <option key={name} value={name}>
                                                {name}
                                            </option>
                                        ))}
                                    </optgroup>
                                </select>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3">
                            <button 
                                onClick={() => setSkpMappingDoc(null)}
                                className="flex-1 px-4 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:bg-slate-50 transition-colors"
                            >
                                Batal
                            </button>
                            <button 
                                onClick={handleSaveSkpMapping}
                                disabled={isSavingSkp}
                                className="flex-[2] py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-500/20 transition-all flex items-center justify-center gap-2"
                            >
                                {isSavingSkp ? (
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <CheckCircle2 size={14} />
                                )}
                                Jadikan SKP
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* DEPENDENCY WARNING MODAL */}
            {isDependencyModalOpen && dependencyData && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xl animate-in fade-in duration-300">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-xl border border-slate-100 animate-in zoom-in-95 duration-300 relative overflow-hidden flex flex-col max-h-[90vh]">
                        {/* Header */}
                        <div className="p-6 bg-rose-500 text-white flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-white/10 rounded-2xl">
                                    <AlertCircle size={22} className="text-white" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-black uppercase tracking-wider">Peringatan: Berkas Rujukan Aktif!</h3>
                                    <p className="text-[10px] text-rose-100 font-bold uppercase tracking-widest mt-0.5">
                                        Dokumen Sedang Digunakan
                                    </p>
                                </div>
                            </div>
                            <button 
                                onClick={() => {
                                    setIsDependencyModalOpen(false);
                                    setDependencyData(null);
                                    setTargetDeleteId(null);
                                }}
                                className="p-1.5 rounded-lg hover:bg-white/10 text-rose-100 hover:text-white transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-6 overflow-y-auto space-y-5 flex-1 bg-slate-50/50">
                            <div className="bg-rose-50 border border-rose-100 p-4.5 rounded-2xl text-[11px] text-rose-800 leading-relaxed font-bold">
                                Menghapus berkas ini akan melepaskan tautan (*unlink*) secara otomatis dari seluruh halaman terkait di bawah ini. Apakah Anda yakin ingin memindahkannya ke tempat sampah?
                            </div>

                            {/* SKP Dependencies */}
                            {dependencyData.skp && dependencyData.skp.length > 0 && (
                                <div className="space-y-2">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Rujukan SKP Pegawai ({dependencyData.skp.length})</h4>
                                    <div className="bg-white border border-slate-100 rounded-2xl p-4.5 space-y-3.5 shadow-sm">
                                        {dependencyData.skp.map((item: any, idx: number) => {
                                            const indonesianMonths = [
                                                'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
                                                'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
                                            ];
                                            return (
                                                <div key={idx} className="flex justify-between items-start text-xs border-b border-slate-50 pb-2.5 last:border-0 last:pb-0">
                                                    <div>
                                                        <span className="font-extrabold text-slate-800">{item.pegawai_nama}</span>
                                                        <span className="block text-[10px] text-slate-400 font-bold uppercase mt-0.5">
                                                            Kategori: {item.kategori === 'perencanaan' ? 'Perencanaan' : item.kategori === 'penilaian' ? 'Penilaian' : 'Bahan Upload'} {item.bulan ? `(${indonesianMonths[item.bulan - 1]})` : ''}
                                                        </span>
                                                    </div>
                                                    <span className="text-[9px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded uppercase tracking-wider">
                                                        Tahun {item.tahun}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Kegiatan Utama & Lampiran Dependencies */}
                            {((dependencyData.kegiatan_utama && dependencyData.kegiatan_utama.length > 0) || 
                              (dependencyData.lampiran_kegiatan && dependencyData.lampiran_kegiatan.length > 0)) && (
                                <div className="space-y-2">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                        Rujukan Agenda Kegiatan ({
                                            (dependencyData.kegiatan_utama?.length || 0) + (dependencyData.lampiran_kegiatan?.length || 0)
                                        })
                                    </h4>
                                    <div className="bg-white border border-slate-100 rounded-2xl p-4.5 space-y-3.5 shadow-sm">
                                        {/* Kegiatan Utama */}
                                        {dependencyData.kegiatan_utama?.map((item: any) => (
                                            <div key={`k-utama-${item.id}`} className="flex justify-between items-start text-xs border-b border-slate-50 pb-2.5 last:border-0 last:pb-0">
                                                <div>
                                                    <span className="font-extrabold text-slate-800">{item.nama_kegiatan}</span>
                                                    <span className="block text-[10px] text-rose-500 font-bold uppercase mt-0.5">
                                                        Rujukan Utama
                                                    </span>
                                                </div>
                                                <span className="text-[9px] font-bold text-slate-400 shrink-0">
                                                    {new Date(item.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}
                                                </span>
                                            </div>
                                        ))}
                                        {/* Lampiran Kegiatan */}
                                        {dependencyData.lampiran_kegiatan?.map((item: any) => (
                                            <div key={`k-lampiran-${item.id}`} className="flex justify-between items-start text-xs border-b border-slate-50 pb-2.5 last:border-0 last:pb-0">
                                                <div>
                                                    <span className="font-extrabold text-slate-800">{item.nama_kegiatan}</span>
                                                    <span className="block text-[10px] text-slate-400 font-bold uppercase mt-0.5">
                                                        Lampiran Kegiatan
                                                    </span>
                                                </div>
                                                <span className="text-[9px] font-bold text-slate-400 shrink-0">
                                                    {new Date(item.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Logbook / Kegiatan Harian Dependencies */}
                            {dependencyData.logbook && dependencyData.logbook.length > 0 && (
                                <div className="space-y-2">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Rujukan Logbook Pegawai ({dependencyData.logbook.length})</h4>
                                    <div className="bg-white border border-slate-100 rounded-2xl p-4.5 space-y-3.5 shadow-sm">
                                        {dependencyData.logbook.map((item: any) => (
                                            <div key={`logbook-${item.id}`} className="flex justify-between items-start text-xs border-b border-slate-50 pb-2.5 last:border-0 last:pb-0">
                                                <div>
                                                    <span className="font-extrabold text-slate-800">{item.nama_kegiatan}</span>
                                                    <span className="block text-[10px] text-slate-400 font-bold uppercase mt-0.5">
                                                        Pegawai: {item.pegawai_nama}
                                                    </span>
                                                </div>
                                                <span className="text-[9px] font-bold text-slate-400 shrink-0">
                                                    {new Date(item.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3 shrink-0">
                            <button
                                onClick={() => {
                                    setIsDependencyModalOpen(false);
                                    setDependencyData(null);
                                    setTargetDeleteId(null);
                                }}
                                className="flex-1 px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 transition-colors"
                            >
                                Batalkan
                            </button>
                            <button
                                onClick={() => {
                                    if (targetDeleteId) {
                                        executeSoftDelete(targetDeleteId);
                                    }
                                    setIsDependencyModalOpen(false);
                                    setDependencyData(null);
                                    setTargetDeleteId(null);
                                }}
                                className="flex-1 px-4 py-2.5 bg-rose-500 hover:bg-rose-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-rose-500/25 transition-colors"
                            >
                                Ya, Tetap Hapus
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
