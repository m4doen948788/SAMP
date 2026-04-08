import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { 
    FileText, 
    Upload, 
    Download, 
    Search, 
    Loader2, 
    FileIcon, 
    FileImage, 
    FileQuestion,
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
    Undo,
    Database,
    Trash,
    Trash2,
    Users
} from 'lucide-react';

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
}

interface Tematik {
    id: number;
    nama: string;
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
    const selectedOption = options.find(o => String(o.id) === String(value));
    const filteredOptions = options.filter(o => 
        o.label.toLowerCase().includes(searchQuery.toLowerCase())
    );

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
                <div className={`absolute z-[110] w-full bg-white border border-slate-200 shadow-2xl rounded-2xl p-3 animate-in fade-in zoom-in-95 duration-200 ${dropUp ? 'bottom-full mb-3 origin-bottom' : 'top-full mt-2 origin-top'}`}>
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
    const [dokumenList, setDokumenList] = useState<DokumenItem[]>([]);
    const [jenisList, setJenisList] = useState<JenisDokumen[]>([]);
    const [tematikList, setTematikList] = useState<Tematik[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedJenis, setSelectedJenis] = useState<string>('');
    const [selectedTematikFilter, setSelectedTematikFilter] = useState<string>('');
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    
    // Upload refs & state
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [uploadNamaFile, setUploadNamaFile] = useState<string>('');
    const [uploadFileExt, setUploadFileExt] = useState<string>('');
    const [uploadJenisId, setUploadJenisId] = useState<string>('');
    const [selectedTematikIds, setSelectedTematikIds] = useState<number[]>([]);

    // Edit states
    const [editingDoc, setEditingDoc] = useState<DokumenItem | null>(null);
    const [editNamaFile, setEditNamaFile] = useState<string>('');
    const [editFileExt, setEditFileExt] = useState<string>('');
    const [editJenisId, setEditJenisId] = useState<string>('');
    const [editTematikIds, setEditTematikIds] = useState<number[]>([]);
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

    // Duplicate Error State
    const [duplicateError, setDuplicateError] = useState<{
        nama_asli_unggah: string;
        nama_file_saat_ini: string;
    } | null>(null);

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

    // Handle clicking outside to close tagging dropdowns
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            if (uploadTagRef.current && !uploadTagRef.current.contains(target)) setIsUploadTagOpen(false);
            if (uploadJenisRef.current && !uploadJenisRef.current.contains(target)) setIsUploadJenisOpen(false);
            if (editTagRef.current && !editTagRef.current.contains(target)) setIsEditTagOpen(false);
            if (editJenisRef.current && !editJenisRef.current.contains(target)) setIsEditJenisOpen(false);
            if (filterJenisRef.current && !filterJenisRef.current.contains(target)) setIsFilterJenisOpen(false);
            if (filterTematikRef.current && !filterTematikRef.current.contains(target)) setIsFilterTematikOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [docRes, jenisRes, tematikRes] = await Promise.all([
                viewMode === 'active' ? api.dokumen.getAll() : api.dokumen.getTrash(),
                api.masterDataConfig.getDataByTable('master_dokumen'),
                api.tematik.getAll()
            ]);
            if (docRes.success) setDokumenList(docRes.data);
            if (jenisRes.success) setJenisList(jenisRes.data);
            if (tematikRes.success) setTematikList(tematikRes.data);
        } catch (err) {
            console.error('Failed to fetch data', err);
        } finally {
            setLoading(false);
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

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'image/webp'];
            if (!allowedTypes.includes(file.type)) {
                showMsg('error', 'Hanya file PDF dan Gambar yang diperbolehkan.');
                setSelectedFile(null);
                if (fileInputRef.current) fileInputRef.current.value = '';
                return;
            }
            if (file.size > 50 * 1024 * 1024) {
                showMsg('error', 'Ukuran file maksimal adalah 50MB.');
                setSelectedFile(null);
                return;
            }
            setSelectedFile(file);
            // Pre-fill nama file, extract extension and lock it
            const lastDotIdx = file.name.lastIndexOf('.');
            if(lastDotIdx !== -1) {
                setUploadNamaFile(file.name.substring(0, lastDotIdx));
                setUploadFileExt(file.name.substring(lastDotIdx));
            } else {
                setUploadNamaFile(file.name);
                setUploadFileExt('');
            }
        }
    };

    const toggleTematik = (id: number) => {
        setSelectedTematikIds(prev => 
            prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
        );
    };

    const handleUpload = async () => {
        if (!selectedFile) return;
        if (!uploadJenisId) {
            showMsg('error', 'Silakan pilih jenis dokumen terlebih dahulu.');
            return;
        }

        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', selectedFile);
            formData.append('nama_file', uploadNamaFile.trim() + uploadFileExt);
            formData.append('jenis_dokumen_id', uploadJenisId);
            // Pass ids as string for backend processing
            if (selectedTematikIds.length > 0) {
                formData.append('tematik_ids', selectedTematikIds.join(','));
            }

            const res = await api.dokumen.upload(formData);
            if (res.success) {
                showMsg('success', 'File berhasil diunggah!');
                setSelectedFile(null);
                setUploadNamaFile('');
                setUploadJenisId('');
                setSelectedTematikIds([]);
                if (fileInputRef.current) fileInputRef.current.value = '';
                fetchData();
            } else if (res.duplicate) {
                // Handle duplicate error from backend
                setDuplicateError(res.existing_file);
                // Also clear the file input to prevent re-uploading the same problematic file
                setSelectedFile(null);
                if (fileInputRef.current) fileInputRef.current.value = '';
            } else {
                showMsg('error', res.message || 'Gagal mengunggah file.');
            }
        } catch (err) {
            showMsg('error', 'Terjadi kesalahan sistem saat mengunggah.');
        } finally {
            setUploading(false);
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

        if (!confirm('Pindahkan dokumen ini ke tempat sampah?')) return;
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
        if (selectedIds.length === paginatedList.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(paginatedList.map(d => d.id));
        }
    };

    const toggleSelectOne = (id: number) => {
        setSelectedIds(prev => 
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const startEdit = (doc: DokumenItem) => {
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
        // Extract IDs from tematik_names if possible, but better to have it in DokumenItem
        // For now, let's assume the backend might need to be updated or we map from tematikList
        const currentTematiks = doc.tematik_names ? doc.tematik_names.split(',') : [];
        const matchedIds = tematikList
            .filter(t => currentTematiks.includes(t.nama))
            .map(t => t.id);
        setEditTematikIds(matchedIds);
    };

    const handleUpdate = async () => {
        if (!editingDoc) return;
        setSaving(true);
        try {
            const res = await api.dokumen.update(editingDoc.id, {
                nama_file: editNamaFile.trim() + editFileExt,
                jenis_dokumen_id: editJenisId,
                tematik_ids: editTematikIds
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
        if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) return <FileImage className="text-blue-500" size={20} />;
        return <FileQuestion className="text-slate-400" size={20} />;
    };

    const renderTematikCapsules = (namesString: string | null) => {
        if (!namesString) return null;
        const names = namesString.split(',').filter(Boolean);
        const limit = 5;
        const displayNames = names.slice(0, limit);
        const more = names.length - limit;

        return (
            <div className="flex flex-wrap gap-1 mt-1.5">
                {displayNames.map((name, i) => (
                    <span 
                        key={i} 
                        className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full text-[9px] font-black uppercase tracking-tight border border-blue-100"
                    >
                        {name}
                    </span>
                ))}
                {more > 0 && (
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full text-[9px] font-black uppercase tracking-tight border border-slate-200">
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
        return matchesSearch && matchesJenis && matchesTematik;
    });

    // Reset pagination when filter changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, selectedJenis, selectedTematikFilter, itemsPerPage]);

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
        <div className="max-w-full mx-auto pb-10 space-y-6">
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
                    {viewMode === 'trash' && paginatedList.length > 0 && user && (user.tipe_user_id === 1 || [2, 5, 7, 8, 4, 6, 9, 10].includes(user.tipe_user_id)) && (
                        <button 
                            onClick={handleEmptyTrash}
                            disabled={isEmptyingTrash || loading}
                            className="bg-white border border-rose-100 text-rose-600 px-4 py-2 rounded-xl text-xs font-black shadow-sm hover:shadow-md hover:bg-rose-50 transition-all flex items-center gap-2 disabled:opacity-50"
                        >
                            {isEmptyingTrash ? <Loader2 size={14} className="animate-spin" /> : <Trash size={14} />}
                            Kosongkan Tempat Sampah
                        </button>
                    )}
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

            <div className="flex flex-col lg:flex-row gap-6">
                {/* Upload Panel - Stuck to left */}
                <div className="w-full lg:w-80 shrink-0 space-y-4">
                    <div className="card-modern p-6 bg-white border border-slate-100 shadow-xl shadow-slate-200/40 !overflow-visible">
                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <Upload size={18} className="text-ppm-blue" /> Unggah Baru
                        </h3>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Jenis Dokumen</label>
                                <SearchableSelect 
                                    options={jenisList.map(j => ({ id: j.id, label: j.dokumen }))}
                                    value={uploadJenisId}
                                    onChange={setUploadJenisId}
                                    placeholder="-- Pilih Jenis Dokumen --"
                                    isOpen={isUploadJenisOpen}
                                    setIsOpen={setIsUploadJenisOpen}
                                    searchQuery={uploadJenisSearch}
                                    setSearchQuery={setUploadJenisSearch}
                                    containerRef={uploadJenisRef}
                                />
                            </div>

                            {selectedFile && (
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Nama File</label>
                                    <div className="flex">
                                        <input 
                                            type="text"
                                            className="input-modern w-full rounded-r-none border-r-0 focus:border-r"
                                            value={uploadNamaFile}
                                            onChange={(e) => setUploadNamaFile(e.target.value)}
                                            placeholder="Masukkan nama file..."
                                        />
                                        <span className="flex items-center px-4 bg-slate-100 border border-slate-200 border-l-0 rounded-r-xl text-slate-500 font-bold text-xs select-none shadow-inner">
                                            {uploadFileExt}
                                        </span>
                                    </div>
                                </div>
                            )}

                            <div 
                                className={`relative border-2 border-dashed rounded-2xl p-6 transition-all duration-300 flex flex-col items-center justify-center gap-3 cursor-pointer ${
                                    selectedFile 
                                    ? 'border-emerald-200 bg-emerald-50/30' 
                                    : 'border-slate-200 hover:border-ppm-blue hover:bg-slate-50/50'
                                }`}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <input 
                                    type="file" 
                                    className="hidden" 
                                    ref={fileInputRef}
                                    onChange={handleFileSelect}
                                    accept=".pdf,image/*"
                                />
                                
                                {selectedFile ? (
                                    <>
                                        <div className="p-3 bg-emerald-100 text-emerald-600 rounded-2xl">
                                            {getFileIcon(selectedFile.name)}
                                        </div>
                                        <div className="text-center">
                                            <p className="text-xs font-bold text-emerald-700 truncate max-w-[200px]">
                                                {selectedFile.name}
                                            </p>
                                            <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest">
                                                {formatSize(selectedFile.size)}
                                            </p>
                                        </div>
                                        <button 
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedFile(null);
                                                if (fileInputRef.current) fileInputRef.current.value = '';
                                            }}
                                            className="absolute top-2 right-2 p-1.5 hover:bg-white rounded-full text-slate-400 hover:text-rose-500 transition-colors"
                                        >
                                            <X size={14} />
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <div className="p-3 bg-slate-100 text-slate-400 rounded-2xl group-hover:bg-ppm-blue/10 group-hover:text-ppm-blue transition-colors">
                                            <FileText size={20} />
                                        </div>
                                        <div className="text-center">
                                            <p className="text-[11px] font-bold text-slate-600">Pilih / Seret File</p>
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                                                PDF atau Gambar
                                            </p>
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Multi-tagging Tematik - Searchable Dropdown */}
                            <div className="relative" ref={uploadTagRef}>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Tagging Tematik (Opsional)</label>
                                <div 
                                    className="min-h-[42px] p-2 border border-slate-200 rounded-xl bg-white cursor-pointer flex flex-wrap gap-1 items-center hover:border-ppm-blue transition-colors"
                                    onClick={() => setIsUploadTagOpen(!isUploadTagOpen)}
                                >
                                    {selectedTematikIds.length > 0 ? (
                                        selectedTematikIds.map(id => {
                                            const t = tematikList.find(x => x.id === id);
                                            return (
                                                <span key={id} className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-bold border border-blue-100 flex items-center gap-1">
                                                    {t?.nama}
                                                    <X 
                                                        size={10} 
                                                        className="hover:text-rose-500" 
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            toggleTematik(id);
                                                        }}
                                                    />
                                                </span>
                                            );
                                        })
                                    ) : (
                                        <span className="text-xs text-slate-400 ml-1">Pilih tagging tematik...</span>
                                    )}
                                </div>

                                {isUploadTagOpen && (
                                    <div className="absolute z-[100] w-[110%] -left-[5%] bottom-full mb-3 bg-white border border-slate-200 shadow-2xl rounded-2xl p-3 animate-in fade-in zoom-in-95 duration-200 origin-bottom">
                                        <div className="flex items-center justify-between mb-2 px-1">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pilih Tagging</span>
                                            <X size={14} className="text-slate-400 cursor-pointer hover:text-rose-500 transition-colors" onClick={() => setIsUploadTagOpen(false)} />
                                        </div>
                                        <div className="relative mb-3">
                                            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ppm-blue opacity-50" />
                                            <input 
                                                type="text"
                                                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-2 border-transparent focus:border-ppm-blue/20 rounded-xl text-[12px] font-bold focus:ring-0 transition-all placeholder:font-normal placeholder:text-slate-400"
                                                placeholder="Cari tema / tagging..."
                                                value={uploadTagSearch}
                                                onChange={(e) => setUploadTagSearch(e.target.value)}
                                                autoFocus
                                            />
                                        </div>
                                        <div className="max-h-[180px] overflow-y-auto space-y-0.5 pr-1 custom-scrollbar">
                                            {tematikList
                                                .filter(t => t.nama.toLowerCase().includes(uploadTagSearch.toLowerCase()))
                                                .map(t => (
                                                    <div 
                                                        key={t.id}
                                                        className={`flex items-center justify-between p-1.5 rounded-xl text-[11px] font-bold cursor-pointer transition-all ${
                                                            selectedTematikIds.includes(t.id)
                                                            ? 'bg-blue-600 text-white shadow-md shadow-blue-100'
                                                            : 'hover:bg-slate-50 text-slate-600 border border-transparent hover:border-slate-100'
                                                        }`}
                                                        onClick={() => toggleTematik(t.id)}
                                                    >
                                                        <span>{t.nama}</span>
                                                        {selectedTematikIds.includes(t.id) ? <CheckCircle2 size={12} /> : <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-100" />}
                                                    </div>
                                                ))}
                                            {tematikList.length === 0 && <p className="text-xs text-slate-400 italic text-center py-4">Tidak ada data</p>}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={handleUpload}
                                disabled={!selectedFile || !uploadJenisId || uploading}
                                className={`w-full py-3.5 rounded-2xl flex items-center justify-center gap-2 font-black text-xs tracking-wide transition-all duration-300 shadow-lg ${
                                    selectedFile && uploadJenisId && !uploading
                                    ? 'bg-blue-600 text-white shadow-blue-200 hover:scale-[1.02] active:scale-[0.98]'
                                    : 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none'
                                }`}
                            >
                                {uploading ? (
                                    <Loader2 className="animate-spin text-white" size={16} />
                                ) : (
                                    <Upload className={selectedFile && uploadJenisId && !uploading ? 'text-white' : 'text-slate-400'} size={16} />
                                )}
                                <span className={selectedFile && uploadJenisId && !uploading ? 'text-white font-black' : 'text-slate-400 font-black'}>
                                    {uploading ? 'Mengunggah...' : 'Unggah File'}
                                </span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* List Panel - Full width to right */}
                <div className="flex-1 min-w-0 space-y-4">
                    <div className="card-modern bg-white border border-slate-100 shadow-xl shadow-slate-200/40 !overflow-visible">
                        {/* Filters */}
                        {/* Filters & Pagination Meta */}
                        <div className="px-6 py-4 border-b border-slate-50 bg-slate-50/30">
                            <div className="flex flex-col xl:flex-row gap-4 items-center justify-between">
                                <div className="flex flex-col md:flex-row gap-3 w-full xl:w-auto">
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
                                    <div className="md:w-44">
                                        <SearchableSelect 
                                            options={jenisList.map(j => ({ id: j.id, label: j.dokumen }))}
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
                                </div>

                                <div className="flex items-center justify-between w-full xl:w-auto gap-4 pl-0 xl:pl-4 border-l-0 xl:border-l border-slate-200">
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
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50/30 border-b border-slate-100">
                                            {viewMode === 'trash' && (
                                                <th className="p-4 w-[40px] text-center">
                                                    <input 
                                                        type="checkbox" 
                                                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                                        checked={paginatedList.length > 0 && selectedIds.length === paginatedList.length}
                                                        onChange={toggleSelectAll}
                                                    />
                                                </th>
                                            )}
                                            <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-[5%] text-center">#</th>
                                            <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-[40%]">Informasi Dokumen</th>
                                            <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest hidden md:table-cell w-[15%]">Jenis Dokumen</th>
                                            <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest hidden lg:table-cell w-[25%] text-center">Detail File</th>
                                            <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap text-center w-[15%]">Aksi</th>
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
                                                        <td className="p-4 text-center">
                                                            <input 
                                                                type="checkbox" 
                                                                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                                                checked={selectedIds.includes(doc.id)}
                                                                onChange={() => toggleSelectOne(doc.id)}
                                                            />
                                                        </td>
                                                    )}
                                                    <td className="p-4 text-center">
                                                        <span className="text-[10px] font-black text-slate-300 tabular-nums">{globalIdx}</span>
                                                    </td>
                                                    <td className="p-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="shrink-0 group-hover:scale-110 transition-transform">
                                                            {getFileIcon(doc.nama_file)}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <div className="text-[13px] font-black text-slate-800 truncate" title={doc.nama_file}>
                                                                {doc.nama_file}
                                                            </div>
                                                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                                                                {formatSize(doc.ukuran)}
                                                            </div>
                                                            {renderTematikCapsules(doc.tematik_names)}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-4 hidden md:table-cell">
                                                    <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg text-[9px] font-black uppercase tracking-tight border border-slate-200">
                                                        {doc.jenis_dokumen_nama}
                                                    </span>
                                                </td>
                                                <td className="p-4 hidden lg:table-cell">
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
                                                                    className="px-2 py-0.5 bg-white text-slate-500 rounded-lg text-[9px] font-black uppercase tracking-widest border border-slate-100 cursor-pointer hover:bg-slate-50 transition-all shadow-sm active:scale-95 flex items-center gap-1"
                                                                    onMouseEnter={(e) => handleRowMouseEnter(e, doc)}
                                                                    onMouseLeave={handleRowMouseLeave}
                                                                >
                                                                    Telusuri
                                                                    <div className={`w-1.5 h-1.5 rounded-full ${dotColor} ${dotShadow} shadow-sm opacity-100`} />
                                                                </span>
                                                            );
                                                        })()}
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex items-center justify-center gap-2">
                                                        {viewMode === 'active' ? (
                                                            <>
                                                                <a 
                                                                    href={doc.path} 
                                                                    target="_blank" 
                                                                    rel="noopener noreferrer"
                                                                    className="p-2 bg-white border border-slate-100 text-slate-400 hover:text-ppm-blue hover:border-blue-100 hover:bg-blue-50 rounded-xl transition-all shadow-sm hover:shadow-md"
                                                                    title="Preview / Lihat"
                                                                >
                                                                    <Eye size={16} />
                                                                </a>
                                                                {canEdit(doc) && (
                                                                    <>
                                                                        <button 
                                                                            onClick={() => startEdit(doc)}
                                                                            className="p-2 bg-white border border-slate-100 text-slate-400 hover:text-amber-600 hover:border-amber-100 hover:bg-amber-50 rounded-xl transition-all shadow-sm hover:shadow-md"
                                                                            title="Edit"
                                                                        >
                                                                            <Edit2 size={16} />
                                                                        </button>
                                                                        <button 
                                                                            onClick={() => handleDelete(doc.id)}
                                                                            className="p-2 bg-white border border-slate-100 text-slate-400 hover:text-rose-600 hover:border-rose-100 hover:bg-rose-50 rounded-xl transition-all shadow-sm hover:shadow-md"
                                                                            title="Pindahkan ke Sampah"
                                                                        >
                                                                            <Trash2 size={16} />
                                                                        </button>
                                                                    </>
                                                                )}
                                                            </>
                                                        ) : (
                                                            <>
                                                                <button 
                                                                    onClick={() => handleRestore(doc.id)}
                                                                    className="p-2 bg-white border border-slate-100 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all shadow-sm hover:shadow-md"
                                                                    title="Pulihkan (Restore)"
                                                                >
                                                                    <Undo size={16} />
                                                                </button>
                                                                <button 
                                                                    onClick={() => handleDelete(doc.id)}
                                                                    className="p-2 bg-white border border-slate-100 text-rose-600 hover:bg-rose-50 rounded-xl transition-all shadow-sm hover:shadow-md"
                                                                    title="Hapus Permanen"
                                                                >
                                                                    <Trash2 size={16} />
                                                                </button>
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
                        <div className="p-6 border-t border-slate-50 bg-slate-50/20 flex flex-col md:flex-row items-center justify-between gap-4">
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
                        <button 
                            onClick={handleBulkDelete}
                            disabled={isBulkDeleting}
                            className="px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-black transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50"
                        >
                            {isBulkDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                            Hapus Permanen
                        </button>
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
                                    options={jenisList.map(j => ({ id: j.id, label: j.dokumen }))}
                                    value={editJenisId}
                                    onChange={setEditJenisId}
                                    placeholder="-- Pilih Jenis Dokumen --"
                                    isOpen={isEditJenisOpen}
                                    setIsOpen={setIsEditJenisOpen}
                                    searchQuery={editJenisSearch}
                                    setSearchQuery={setEditJenisSearch}
                                    containerRef={editJenisRef}
                                    dropUp={true}
                                />
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
                                                        {editTematikIds.includes(t.id) ? <CheckCircle2 size={12} /> : <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-100" />}
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
        </div>
    );
}
