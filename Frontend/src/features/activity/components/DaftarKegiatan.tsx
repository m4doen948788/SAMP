import React, { useState, useEffect, useRef, useMemo, useCallback, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { api } from '@/src/services/api';
import { useAuth } from '@/src/contexts/AuthContext';
import { 
    Calendar,
    Plus,
    Search,
    Filter,
    Edit2,
    Trash2,
    FileText,
    Image as ImageIcon,
    FileCheck,
    Users,
    AlignLeft,
    Building2,
    Tag,
    X,
    Upload,
    Loader2,
    Download,
    CheckCircle2,
    AlertCircle,
    Check,
    ChevronLeft,
    ChevronRight,
    MoreHorizontal,
    Paperclip,
    FolderOpen,
    Info,
    LayoutGrid,
    Eye,
    ChevronDown,
    List,
    Mail,
    Send,
    Monitor,
    Presentation,
    ScrollText,
    Briefcase,
    BarChart3,
    History,
    RefreshCcw,
    Undo2,
    Trash,
    Archive
} from 'lucide-react';
import { SearchableSelect } from '@/src/features/common/components/SearchableSelect';
import { SearchableSelectV2 } from '@/src/features/common/components/SearchableSelectV2';
import { CollapsibleHierarchicalSelect } from '@/src/features/common/components/CollapsibleHierarchicalSelect';
import { ActivityFormModal } from '@/src/components/modals/ActivityFormModal';
import { DocumentViewerModal } from '@/src/components/modals/DocumentViewerModal';

interface ActivityDoc {
    id: number;
    nama_file: string;
    path: string;
    tipe_dokumen: 'surat_undangan_masuk' | 'surat_undangan_keluar' | 'bahan_desk' | 'paparan' | 'notulensi' | 'foto' | 'laporan';
    dokumen_id: number | null;
    is_trash?: number;
}

interface Activity {
    id: number;
    tanggal: string;
    tanggal_akhir: string | null;
    nama_kegiatan: string;
    surat_undangan_masuk: string | null;
    surat_undangan_keluar: string | null;
    tematik_ids: string | null;
    bahan_desk: string | null;
    paparan: string | null;
    jenis_kegiatan_id: number | null;
    jenis_kegiatan_nama: string | null;
    bidang_ids: string | null;
    bidang_id: number | null;
    bidang_singkatan: string | null;
    bidang_nama: string | null;
    instansi_penyelenggara: string | null;
    petugas_ids: string | null;
    kelengkapan: string | null;
    keterangan: string | null;
    created_at: string;
    sesi: string | null;
    dokumen: ActivityDoc[];
    surat_undangan_masuk_id: number | null;
    surat_undangan_keluar_id: number | null;
    bahan_desk_id: number | null;
    paparan_id: number | null;
    is_deleted: number;
    deleted_at: string | null;
    edit_history: {
        id: number;
        aksi: string;
        keterangan: string;
        created_at: string;
        user_nama: string;
    }[];
}

interface MasterData {
    id: number;
    nama: string;
    parent_id?: number | null;
}

interface BidangData {
    id: number;
    nama_bidang: string;
    singkatan: string;
}

interface PegawaiData {
    id: number;
    nama_lengkap: string;
    bidang_id: number;
    bidang_singkatan: string;
    instansi_id?: number | null;
}

interface InstansiDaerah {
    id: number;
    instansi: string;
}

interface MasterDokumen {
    id: number;
    dokumen: string;
}

export default function DaftarKegiatan() {
    const { user } = useAuth();
    const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

    useEffect(() => {
        const checkPortal = () => {
            const el = document.getElementById('manajemen-kegiatan-actions');
            if (el) {
                setPortalTarget(el);
                return true;
            }
            return false;
        };

        // Try immediately
        if (checkPortal()) return;

        // Otherwise, poll for a bit
        const interval = setInterval(() => {
            if (checkPortal()) {
                clearInterval(interval);
            }
        }, 100);

        // Safety timeout to stop polling after 2 seconds
        const timeout = setTimeout(() => {
            clearInterval(interval);
        }, 2000);

        return () => {
            clearInterval(interval);
            clearTimeout(timeout);
        };
    }, []);

    const [activities, setActivities] = useState<Activity[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [viewMode, setViewMode] = useState<'active' | 'trash'>('active');

    // Tooltip History State (Fixed Positioning)
    const [hoveredHistory, setHoveredHistory] = useState<{ x: number, y: number, history: any[], name: string } | null>(null);

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingActivity, setEditingActivity] = useState<Activity | null>(null);

    // Master data
    const [jenisKegiatan, setJenisKegiatan] = useState<MasterData[]>([]);
    const [bidangList, setBidangList] = useState<BidangData[]>([]);
    const [tematikList, setTematikList] = useState<MasterData[]>([]);
    const [pegawaiList, setPegawaiList] = useState<PegawaiData[]>([]);
    const [masterInstansiDaerahList, setMasterInstansiDaerahList] = useState<InstansiDaerah[]>([]);
    const [masterDokumenList, setMasterDokumenList] = useState<MasterDokumen[]>([]);
    const [filterInstansiPetugas, setFilterInstansiPetugas] = useState<string>('');

    // Helper for local date
    const getTodayLocalDate = () => {
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    // Form state
    const [formData, setFormData] = useState({
        tanggal: getTodayLocalDate(),
        tanggal_akhir: getTodayLocalDate(),
        nama_kegiatan: '',
        jenis_kegiatan_id: '',
        bidang_id: (user?.bidang_id || '').toString(),
        instansi_penyelenggara: '',
        manual_instansi: '',
        kelengkapan: '',
        tematik_ids: [] as number[],
        petugas_ids: [] as number[],
        keterangan: '',
        bidang_ids: '', 
        sesi: '',
        jenis_dokumen_ids: {
            surat_undangan_masuk: '',
            surat_undangan_keluar: '',
            bahan_desk: '',
            paparan: '',
            notulensi: '',
            laporan: ''
        } as { [key: string]: string }
    });

    const [showAllPegawai, setShowAllPegawai] = useState(false);

    // File state
    const [files, setFiles] = useState<{ [key: string]: File[] }>({
        surat_undangan_masuk: [],
        surat_undangan_keluar: [],
        bahan_desk: [],
        paparan: [],
        notulensi: [],
        laporan: []
    });

    const [removedDocIds, setRemovedDocIds] = useState<number[]>([]);
    const [docsToTrash, setDocsToTrash] = useState<number[]>([]);
    const [docsToUnlink, setDocsToUnlink] = useState<number[]>([]);
    const [confirmDeleteDoc, setConfirmDeleteDoc] = useState<{ doc: ActivityDoc, fieldId: string } | null>(null);
    
    // Library Picker State
    const [libraryDocs, setLibraryDocs] = useState<any[]>([]);
    const [selectedLibraryDocs, setSelectedLibraryDocs] = useState<{ [key: string]: any[] }>({
        surat_undangan_masuk: [],
        surat_undangan_keluar: [],
        bahan_desk: [],
        paparan: [],
        notulensi: [],
        laporan: []
    });
    const [isLibraryPickerOpen, setIsLibraryPickerOpen] = useState(false);
    const [pickingCategory, setPickingCategory] = useState<string | null>(null);
    const [librarySearch, setLibrarySearch] = useState('');
    const [officerAvailability, setOfficerAvailability] = useState<Record<number, any[]>>({});
    const [loadingAvailability, setLoadingAvailability] = useState(false);
    

    // Hovered Doc info for tooltip (Fixed position)
    const [hoveredDoc, setHoveredDoc] = useState<{ x: number, y: number, cat: any, docs: ActivityDoc[] } | null>(null);
    const [viewedDoc, setViewedDoc] = useState<{ path: string, name: string } | null>(null);
    const hoverTimeoutRef = useRef<any>(null);
    const historyRef = useRef<HTMLDivElement>(null);
    const docRef = useRef<HTMLDivElement>(null);
    const [historyStyle, setHistoryStyle] = useState<React.CSSProperties>({ visibility: 'hidden' });
    const [docStyle, setDocStyle] = useState<React.CSSProperties>({ visibility: 'hidden' });

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

    useLayoutEffect(() => {
        if (hoveredDoc && docRef.current) {
            const rect = docRef.current.getBoundingClientRect();
            let left = hoveredDoc.x;
            let top = hoveredDoc.y - 15;
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

            // Vertical check
            if (top - rect.height < 20) {
                top = hoveredDoc.y + 15;
                ty = '0%';
            }

            setDocStyle({
                left: `${left}px`,
                top: `${top}px`,
                transform: `translateX(${tx}) translateY(${ty})`,
                visibility: 'visible'
            });
        } else {
            setDocStyle({ visibility: 'hidden' });
        }
    }, [hoveredDoc]);

    // Refs
    const fileRefs = {
        surat_undangan_masuk: useRef<HTMLInputElement>(null),
        surat_undangan_keluar: useRef<HTMLInputElement>(null),
        bahan_desk: useRef<HTMLInputElement>(null),
        paparan: useRef<HTMLInputElement>(null),
        notulensi: useRef<HTMLInputElement>(null),
        laporan: useRef<HTMLInputElement>(null)
    };

    // Filter state
    const [filterBidang, setFilterBidang] = useState('');
    const [filterTematik, setFilterTematik] = useState('');
    const [filterDateStart, setFilterDateStart] = useState('');
    const [filterDateEnd, setFilterDateEnd] = useState('');

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(15);

    // Debounced search for server-side filtering
    const [debouncedSearch, setDebouncedSearch] = useState(searchTerm);
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(searchTerm), 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setActivities([]); // Clear current list to prevent "flicker" of old data
        try {
            const res = viewMode === 'active' 
                ? await api.kegiatanManajemen.getAll({
                    search: debouncedSearch,
                    startDate: filterDateStart,
                    endDate: filterDateEnd,
                    bidang: filterBidang,
                    tematik: filterTematik
                })
                : await api.kegiatanManajemen.getTrash();
            if (res.success) setActivities(res.data);
        } catch (err) {
            console.error('Failed to fetch activities', err);
        } finally {
            setLoading(false);
        }
    }, [viewMode, debouncedSearch, filterDateStart, filterDateEnd, filterBidang, filterTematik]);

    useEffect(() => {
        fetchData();
        fetchMasterData();
    }, []);

    useEffect(() => {
        if (viewMode === 'active') {
            fetchData();
        }
    }, [debouncedSearch, filterDateStart, filterDateEnd, filterBidang, filterTematik]);

    useEffect(() => {
        setCurrentPage(1);
    }, [debouncedSearch, filterBidang, filterTematik, filterDateStart, filterDateEnd, viewMode]);

    useEffect(() => {
        fetchData();
    }, [viewMode]);

    // Click outside tooltips to close immediately
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            const isClickInsideHistory = historyRef.current?.contains(target);
            const isClickInsideDoc = docRef.current?.contains(target);
            const isClickOnTrigger = target.closest('.tooltip-trigger');
            
            if (!isClickInsideHistory && !isClickInsideDoc && !isClickOnTrigger) {
                if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
                setHoveredHistory(null);
                setHoveredDoc(null);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchMasterData = async () => {
        try {
            const [jenisRes, bidangRes, tematikRes, pegawaiRes, instansiRes, masterDokRes] = await Promise.all([
                api.masterDataConfig.getDataByTable('master_tipe_kegiatan'),
                api.bidangInstansi.getAll(),
                api.tematik.getAll(),
                api.profilPegawai.getAll(),
                api.masterInstansiDaerah.getAll(),
                api.masterDokumen.getAll()
            ]);

            if (jenisRes.success) setJenisKegiatan(jenisRes.data);
            if (bidangRes.success) setBidangList(bidangRes.data);
            if (tematikRes.success) setTematikList(tematikRes.data);
            if (pegawaiRes.success) {
                setPegawaiList(pegawaiRes.data || []);
            }
            if (instansiRes.success) setMasterInstansiDaerahList(instansiRes.data);
            if (masterDokRes.success) setMasterDokumenList(masterDokRes.data);
        } catch (err) {
            console.error('Failed to fetch master data', err);
        }
    };

    const fetchOfficerAvailability = async (tanggal: string, sesi: string, excludeId?: number) => {
        if (!tanggal || !sesi) return;
        setLoadingAvailability(true);
        try {
            const res = await api.kegiatanManajemen.checkAvailability(tanggal, sesi, excludeId);
            if (res.success) {
                setOfficerAvailability(res.data);
            }
        } catch (err) {
            console.error('Failed to fetch availability', err);
        } finally {
            setLoadingAvailability(false);
        }
    };

    useEffect(() => {
        if (isModalOpen && formData.tanggal && formData.sesi) {
            fetchOfficerAvailability(formData.tanggal, formData.sesi, editingActivity?.id);
        } else {
            setOfficerAvailability({});
        }
    }, [formData.tanggal, formData.sesi, isModalOpen]);

    const showMsg = (type: 'success' | 'error', text: string) => {
        setMessage({ type, text });
        setTimeout(() => setMessage(null), 5000);
    };

    const handleTooltipMouseEnter = (e: React.MouseEvent, act: Activity) => {
        if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
        
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        setHoveredHistory({
            x: rect.left + rect.width / 2,
            y: rect.top,
            history: act.edit_history || [],
            name: act.nama_kegiatan
        });
        setHoveredDoc(null);
    };

    const handleTooltipMouseLeave = () => {
        hoverTimeoutRef.current = setTimeout(() => {
            setHoveredHistory(null);
        }, 800);
    };

    const resetForm = () => {
        const today = getTodayLocalDate();
        setFormData({
            tanggal: today,
            tanggal_akhir: today,
            nama_kegiatan: '',
            jenis_kegiatan_id: '',
            bidang_id: (user?.bidang_id || '').toString(),
            instansi_penyelenggara: '',
            manual_instansi: '',
            kelengkapan: '',
            tematik_ids: [],
            petugas_ids: [],
            keterangan: '',
            bidang_ids: (user?.bidang_id || '').toString(),
            sesi: '',
            jenis_dokumen_ids: {
                surat_undangan_masuk: '',
                surat_undangan_keluar: '',
                bahan_desk: '',
                paparan: '',
                notulensi: '',
                laporan: ''
            }
        });
        setFiles({
            surat_undangan_masuk: [],
            surat_undangan_keluar: [],
            bahan_desk: [],
            paparan: [],
            notulensi: [],
            laporan: []
        });
        setSelectedLibraryDocs({
            surat_undangan_masuk: [],
            surat_undangan_keluar: [],
            bahan_desk: [],
            paparan: [],
            notulensi: [],
            laporan: []
        });
        setRemovedDocIds([]);
        setDocsToTrash([]);
        setDocsToUnlink([]);
        setConfirmDeleteDoc(null);
        setEditingActivity(null);
        setShowAllPegawai(false);
        setFilterInstansiPetugas('');
    };

    const openAddModal = () => {
        resetForm();
        setIsModalOpen(true);
    };

    const toLocalDateISO = (dateStr: string) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const openEditModal = (activity: Activity) => {
        setEditingActivity(activity);
        setIsModalOpen(true);
    };

    const handleModalSuccess = (msg: string) => {
        showMsg('success', msg);
        fetchData();
    };

    // Fetch library documents when modal opens
    useEffect(() => {
        if (isModalOpen) {
            fetchLibraryDocs();
        }
    }, [isModalOpen]);

    const fetchLibraryDocs = async () => {
        try {
            const res = await api.dokumen.getAll();
            if (res.success) {
                setLibraryDocs(res.data || []);
            }
        } catch (err) {
            console.error('Failed to fetch library docs', err);
        }
    };

    // Auto-assign document types from master list based on keywords
    useEffect(() => {
        if (!isModalOpen || masterDokumenList.length === 0) return;

        const sumId = masterDokumenList.find(d => (d.dokumen || '').toLowerCase().includes('undangan masuk'))?.id;
        const sukId = masterDokumenList.find(d => (d.dokumen || '').toLowerCase().includes('undangan keluar'))?.id;
        const notId = masterDokumenList.find(d => (d.dokumen || '').toLowerCase() === 'notulensi' || (d.dokumen || '').toLowerCase().includes('notulensi'))?.id;
        const papId = masterDokumenList.find(d => (d.dokumen || '').toLowerCase().includes('paparan'))?.id;

        setFormData(prev => {
            const newIds = { ...prev.jenis_dokumen_ids };
            let changed = false;

            if (sumId && newIds.surat_undangan_masuk !== String(sumId)) {
                newIds.surat_undangan_masuk = String(sumId);
                changed = true;
            }
            if (sukId && newIds.surat_undangan_keluar !== String(sukId)) {
                newIds.surat_undangan_keluar = String(sukId);
                changed = true;
            }
            if (notId && newIds.notulensi !== String(notId)) {
                newIds.notulensi = String(notId);
                changed = true;
            }
            if (papId && newIds.paparan !== String(papId)) {
                newIds.paparan = String(papId);
                changed = true;
            }

            if (changed) return { ...prev, jenis_dokumen_ids: newIds };
            return prev;
        });
    }, [masterDokumenList, isModalOpen]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
        if (e.target.files && e.target.files.length > 0) {
            setFiles(prev => ({
                ...prev,
                [field]: [...prev[field], ...Array.from(e.target.files!)]
            }));
        }
    };

    const removeFile = (field: string, index: number) => {
        setFiles(prev => ({
            ...prev,
            [field]: prev[field].filter((_, i) => i !== index)
        }));
    };

    const toggleRemovedDoc = (docId: number) => {
        if (removedDocIds.includes(docId)) {
            setRemovedDocIds(prev => prev.filter(id => id !== docId));
            setDocsToTrash(prev => prev.filter(id => id !== docId));
            setDocsToUnlink(prev => prev.filter(id => id !== docId));
        } else {
            setRemovedDocIds(prev => [...prev, docId]);
        }
    };

    const handleRemoveExistingDoc = (doc: any, fieldId: string) => {
        setConfirmDeleteDoc({ doc, fieldId });
    };

    const processDocRemoval = (action: 'trash' | 'unlink') => {
        if (!confirmDeleteDoc) return;
        
        const { doc, fieldId } = confirmDeleteDoc;
        const relId = doc.id; // ID in kegiatan_manajemen_dokumen (relationship)
        const globalId = doc.dokumen_id || doc.id; // ID in dokumen_upload (if it's a library doc picked but not saved, its id is the global id)

        if (action === 'trash') {
            setDocsToTrash(prev => [...new Set([...prev, globalId])]);
        } else {
            setDocsToUnlink(prev => [...new Set([...prev, relId])]);
        }
        
        // If it was a selected library doc (not yet saved to activity), remove it from the list
        if (!doc.tipe_dokumen) { // Library docs in our state don't have tipe_dokumen until mapped
            setSelectedLibraryDocs(prev => ({
                ...prev,
                [fieldId]: prev[fieldId].filter(d => d.id !== doc.id)
            }));
        }

        setRemovedDocIds(prev => [...new Set([...prev, relId])]);
        setConfirmDeleteDoc(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const selectedType = jenisKegiatan.find(j => String(j.id) === formData.jenis_kegiatan_id);
        const typeName = (selectedType?.nama || '').toLowerCase();
        const isRequiredMeeting = typeName.includes('rapat mamin') || typeName.includes('rapat luar bidang');
            
        if (isRequiredMeeting && !formData.sesi) {
            alert("Silakan pilih Sesi Kegiatan (Pagi/Siang/Full Day) untuk jenis rapat ini!");
            return;
        }

        // Validation for Bahan Desk and Laporan: Mandatory doc type if files are provided
        const hasBahanDesk = 
            (editingActivity?.dokumen.filter(d => d.tipe_dokumen === 'bahan_desk' && !removedDocIds.includes(d.id)).length || 0) > 0 ||
            files.bahan_desk.length > 0 || 
            selectedLibraryDocs.bahan_desk.length > 0;
            
        if (hasBahanDesk && !formData.jenis_dokumen_ids.bahan_desk) {
            alert("Silakan pilih Jenis Dokumen untuk kategori Bahan Desk!");
            return;
        }

        const hasLaporan = 
            (editingActivity?.dokumen.filter(d => d.tipe_dokumen === 'laporan' && !removedDocIds.includes(d.id)).length || 0) > 0 ||
            files.laporan.length > 0 || 
            selectedLibraryDocs.laporan.length > 0;
            
        if (hasLaporan && !formData.jenis_dokumen_ids.laporan) {
            alert("Silakan pilih Jenis Dokumen untuk kategori Laporan / File Pendukung!");
            return;
        }

        setSaving(true);
        try {
            const data = new FormData();
            
            const finalInstansi = formData.instansi_penyelenggara === 'Lainnya' 
                ? formData.manual_instansi 
                : formData.instansi_penyelenggara;

            data.append('tanggal', formData.tanggal);
            data.append('tanggal_akhir', formData.tanggal_akhir || formData.tanggal);
            data.append('nama_kegiatan', formData.nama_kegiatan);
            data.append('jenis_kegiatan_id', formData.jenis_kegiatan_id);
            data.append('instansi_penyelenggara', finalInstansi || '');
            data.append('kelengkapan', formData.kelengkapan);
            data.append('tematik_ids', formData.tematik_ids.join(','));
            data.append('petugas_ids', formData.petugas_ids.join(','));
            data.append('keterangan', formData.keterangan);
            data.append('bidang_ids', formData.bidang_ids);
            data.append('sesi', formData.sesi);
            data.append('jenis_dokumen_ids', JSON.stringify(formData.jenis_dokumen_ids));

            // Add selected library document IDs
            const libraryDocIds: { [key: string]: number[] } = {};
            Object.entries(selectedLibraryDocs as Record<string, ActivityDoc[]>).forEach(([field, docs]) => {
                if (docs.length > 0) {
                    libraryDocIds[field] = docs.map(d => d.id);
                }
            });
            data.append('selected_library_doc_ids', JSON.stringify(libraryDocIds));

            // Append all files as multiple
            const allDocFields = ['surat_undangan_masuk', 'surat_undangan_keluar', 'bahan_desk', 'paparan', 'notulensi', 'laporan'];
            allDocFields.forEach(field => {
                (files[field as keyof typeof files] as File[]).forEach(file => data.append(field, file));
            });

            if (removedDocIds.length > 0) {
                data.append('removed_dokumen_ids', removedDocIds.join(','));
            }
            if (docsToTrash.length > 0) {
                data.append('docs_to_trash', docsToTrash.join(','));
            }
            if (docsToUnlink.length > 0) {
                data.append('docs_to_unlink', docsToUnlink.join(','));
            }

            let res;
            if (editingActivity) {
                res = await api.kegiatanManajemen.update(editingActivity.id, data);
            } else {
                res = await api.kegiatanManajemen.create(data);
            }

            if (res.success) {
                showMsg('success', editingActivity ? 'Kegiatan berhasil diperbarui' : 'Kegiatan berhasil ditambahkan');
                setIsModalOpen(false);
                fetchData();
            } else {
                showMsg('error', res.message || 'Gagal menyimpan kegiatan');
            }
        } catch (err) {
            showMsg('error', 'Terjadi kesalahan sistem');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Apakah Anda yakin ingin memindahkan kegiatan ini ke tempat sampah?')) return;
        try {
            const res = await api.kegiatanManajemen.delete(id);
            if (res.success) {
                showMsg('success', 'Kegiatan dipindahkan ke tempat sampah');
                fetchData();
            } else {
                showMsg('error', res.message || 'Gagal menghapus kegiatan');
            }
        } catch (err) {
            showMsg('error', 'Terjadi kesalahan sistem');
        }
    };

    const handleRestore = async (id: number) => {
        try {
            const res = await api.kegiatanManajemen.restore(id);
            if (res.success) {
                showMsg('success', 'Kegiatan berhasil dipulihkan');
                fetchData();
            } else {
                showMsg('error', res.message || 'Gagal memulihkan kegiatan');
            }
        } catch (err) {
            showMsg('error', 'Terjadi kesalahan sistem');
        }
    };

    const handlePermanentDelete = async (id: number) => {
        if (!confirm('Hapus PERMANEN? Tindakan ini tidak dapat dibatalkan dan semua file fisik akan dihapus.')) return;
        try {
            const res = await api.kegiatanManajemen.permanentDelete(id);
            if (res.success) {
                showMsg('success', 'Kegiatan berhasil dihapus permanen');
                fetchData();
            } else {
                showMsg('error', res.message || 'Gagal menghapus permanen');
            }
        } catch (err) {
            showMsg('error', 'Terjadi kesalahan sistem');
        }
    };

    const handleEmptyTrash = async () => {
        if (!confirm('Kosongkan tempat sampah? Semua kegiatan di sini akan dihapus permanen.')) return;
        try {
            const res = await api.kegiatanManajemen.emptyTrash();
            if (res.success) {
                showMsg('success', 'Tempat sampah dikosongkan');
                fetchData();
            } else {
                showMsg('error', res.message || 'Gagal mengosongkan tempat sampah');
            }
        } catch (err) {
            showMsg('error', 'Terjadi kesalahan sistem');
        }
    };

    const filteredActivities = activities; // Filtering is now handled by server

    const paginatedActivities = filteredActivities.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const totalPages = Math.ceil(filteredActivities.length / itemsPerPage);

    const getDocCount = (activity: Activity, type: string) => {
        return activity.dokumen.filter(d => d.tipe_dokumen === type && !d.is_trash).length;
    };

    const filteredPegawaiList = useMemo(() => {
        if (!pegawaiList) return [];
        const isSuperAdmin = user?.tipe_user_id === 1;

        if (showAllPegawai) return pegawaiList;

        if (isSuperAdmin) {
            if (filterInstansiPetugas) {
                return pegawaiList.filter(p => Number(p.instansi_id) === Number(filterInstansiPetugas));
            }
            return pegawaiList;
        }

        // Non-superadmin: filter by bidang
        const userBidangId = Number(user?.bidang_id);
        if (!userBidangId) return pegawaiList; // no bidang set â†’ show all agency personnel
        return pegawaiList.filter(p => Number(p.bidang_id) === userBidangId);
    }, [pegawaiList, showAllPegawai, user?.bidang_id, user?.tipe_user_id, filterInstansiPetugas]);

    // Auto-calculate bidang_ids based on selected petugas_ids
    useEffect(() => {
        const selectedUniqueBidangIds = [...new Set(
            formData.petugas_ids
                .map(id => pegawaiList.find(p => p.id === id)?.bidang_id)
                .filter(Boolean)
        )];
        
        const newBidangIds = selectedUniqueBidangIds.length > 0 
            ? selectedUniqueBidangIds.join(',') 
            : (user?.bidang_id ? String(user.bidang_id) : '');
            
        if (formData.bidang_ids !== newBidangIds) {
            setFormData(prev => ({ ...prev, bidang_ids: newBidangIds }));
        }
    }, [formData.petugas_ids, pegawaiList, user?.bidang_id]);

    const agencyOptions = useMemo(() => {
        const options = masterInstansiDaerahList.map(i => ({ id: i.instansi, label: i.instansi }));
        options.push({ id: 'Lainnya', label: 'Lainnya (Ketik Manual)...' });
        return options;
    }, [masterInstansiDaerahList]);

    const agencyIdOptions = useMemo(() => {
        return masterInstansiDaerahList.map(i => ({ id: String(i.id), label: i.instansi }));
    }, [masterInstansiDaerahList]);

    const hierarchicalJenisKegiatan = useMemo(() => {
        return jenisKegiatan.filter(j => 
            !['cuti', 'sakit'].includes(j.nama.toLowerCase())
        );
    }, [jenisKegiatan]);

    const mappedPegawaiOptions = useMemo(() => {
        return filteredPegawaiList.map(p => {
            const isBusy = officerAvailability[p.id];
            let secondaryText = p.bidang_singkatan;
            if (isBusy) {
                const activities = isBusy.map(a => {
                    const fullDayTypes = ['Cuti', 'Sakit', 'Dinas Luar', 'DL Luar Bidang'];
                    const isFullDay = fullDayTypes.includes(a.tipe_nama);
                    const displaySesi = isFullDay ? 'Full Day' : a.sesi;
                    const activityName = a.tipe_nama || a.tipe;
                    return `${activityName} (${displaySesi})`;
                });
                const uniqueActivities = [...new Set(activities)];
                secondaryText = uniqueActivities.join(', ');
            }

            return {
                id: p.id,
                nama: p.nama_lengkap,
                secondary: secondaryText,
                disabled: false,
                hasConflict: !!isBusy
            };
        });
    }, [filteredPegawaiList, officerAvailability]);

    const mappedTematikOptions = useMemo(() => {
        return tematikList.map(t => ({
            id: t.id,
            nama: t.nama
        }));
    }, [tematikList]);

    return (
        <div className="max-w-full mx-auto pb-4 space-y-1.5 animate-in fade-in duration-500">
            {portalTarget && createPortal(
                <div className="flex items-center gap-3">
                    {/* View Selection Tabs */}
                    <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200 shadow-inner">
                        <button 
                            onClick={() => {
                                if (viewMode !== 'active') {
                                    setActivities([]);
                                    setViewMode('active');
                                }
                            }}
                            className={`flex items-center gap-2 px-5 py-2 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all duration-300 ${viewMode === 'active' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <Calendar size={13} />
                            Aktif
                        </button>
                        <button 
                            onClick={() => {
                                if (viewMode !== 'trash') {
                                    setActivities([]);
                                    setViewMode('trash');
                                }
                            }}
                            className={`flex items-center gap-2 px-5 py-2 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all duration-300 ${viewMode === 'trash' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <Trash size={13} />
                            Sampah
                        </button>
                    </div>

                    {viewMode === 'trash' ? (
                        <button 
                            onClick={handleEmptyTrash}
                            disabled={activities.length === 0}
                            className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white border border-rose-100 text-rose-500 shadow-sm hover:shadow-rose-100 hover:bg-rose-50 disabled:opacity-50 disabled:hover:bg-white transition-all duration-300 group"
                        >
                            <Trash size={16} className="group-hover:rotate-12 transition-transform" />
                            <span className="font-black uppercase tracking-[0.1em] text-[10px]">Kosongkan Sampah</span>
                        </button>
                    ) : (
                        <button 
                            onClick={openAddModal}
                            className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-200 hover:shadow-indigo-300/50 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 group"
                        >
                            <div className="p-1 bg-white/20 rounded-lg group-hover:rotate-90 transition-transform duration-500">
                                <Plus size={16} />
                            </div>
                            <span className="font-black uppercase tracking-[0.1em] text-[10px]">Tambah Kegiatan</span>
                        </button>
                    )}
                </div>,
                portalTarget
            )}

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

            {/* Filters */}
            <div className="card-modern p-3 bg-white border border-slate-100 shadow-xl shadow-slate-200/40">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input 
                            type="text" 
                            className="input-modern w-full pl-10" 
                            placeholder="Cari kegiatan..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <select 
                        className="input-modern w-full"
                        value={filterTematik}
                        onChange={(e) => setFilterTematik(e.target.value)}
                    >
                        <option value="">Semua Tagging Tematik</option>
                        {tematikList.map(t => <option key={t.id} value={String(t.id)}>{t.nama}</option>)}
                    </select>
                    <select 
                        className="input-modern w-full"
                        value={filterBidang}
                        onChange={(e) => setFilterBidang(e.target.value)}
                    >
                        <option value="">Semua Bidang</option>
                        {bidangList.map(b => <option key={b.id} value={b.id}>{b.singkatan || b.nama_bidang}</option>)}
                    </select>
                    <div className="flex gap-2 lg:col-span-2">
                        <input 
                            type="date" 
                            className="input-modern w-full" 
                            value={filterDateStart}
                            onChange={(e) => setFilterDateStart(e.target.value)}
                        />
                        <span className="flex items-center text-slate-400">-</span>
                        <input 
                            type="date" 
                            className="input-modern w-full" 
                            value={filterDateEnd}
                            onChange={(e) => setFilterDateEnd(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="card-modern bg-white border border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100">
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center w-24">Tanggal</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Nama Kegiatan</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Tagging Tematik</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Instansi Penyelenggara</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Petugas</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center w-40">Dokumen Terkait</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center w-32">Status / History</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center w-32">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <Loader2 size={32} className="text-ppm-blue animate-spin" />
                                            <p className="text-sm font-bold text-slate-400 animate-pulse">Memuat data kegiatan...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : paginatedActivities.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center gap-3 text-slate-300">
                                            <Calendar size={48} />
                                            <p className="text-sm font-bold">Tidak ada kegiatan ditemukan</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : paginatedActivities.map((act) => (
                                <tr key={act.id} className="hover:bg-slate-50 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="text-center group-hover:scale-110 transition-transform duration-300">
                                            <div className="flex flex-col items-center">
                                                <p className="text-[10px] font-black text-slate-800 tracking-tight">
                                                    {new Date(act.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}
                                                </p>
                                                {act.tanggal_akhir && act.tanggal_akhir.split('T')[0] !== act.tanggal.split('T')[0] && (
                                                    <>
                                                        <div className="h-2 w-px bg-slate-300 my-0.5" />
                                                        <p className="text-[10px] font-black text-slate-800 tracking-tight">
                                                            {new Date(act.tanggal_akhir).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}
                                                        </p>
                                                    </>
                                                )}
                                                <p className="text-[9px] font-bold text-slate-400 mt-0.5">
                                                    {new Date(act.tanggal).getFullYear()}
                                                </p>
                                                {act.sesi && (
                                                    <span className="mt-1.5 px-1.5 py-0.5 bg-amber-50 text-amber-600 rounded-md text-[8px] font-black uppercase border border-amber-100 whitespace-nowrap">
                                                        {act.sesi}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <h4 
                                            className={`text-base font-bold text-slate-800 leading-tight ${act.keterangan ? 'cursor-help' : ''}`}
                                            title={act.keterangan || undefined}
                                        >
                                            {act.nama_kegiatan}
                                        </h4>
                                        {act.jenis_kegiatan_nama && (
                                            <div className="mt-1.5">
                                                <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-md text-[8px] font-black capitalize border border-indigo-100">
                                                    {(act.jenis_kegiatan_nama || '').toLowerCase()}
                                                </span>
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-wrap items-center justify-center gap-1">
                                            {(() => {
                                                if (!act.tematik_ids) return <span className="text-slate-300 text-[10px] tracking-widest uppercase font-black">-</span>;
                                                const ids = act.tematik_ids.split(',');
                                                const visibleIds = ids.slice(0, 2);
                                                const remainingCount = ids.length - 2;
                                                return (
                                                    <>
                                                        {visibleIds.map(tid => {
                                                            const t = tematikList.find(x => x.id === Number(tid));
                                                            return t ? (
                                                                <span key={tid} className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-md text-[9px] font-black uppercase border border-blue-100">
                                                                    {t.nama}
                                                                </span>
                                                            ) : null;
                                                        })}
                                                        {remainingCount > 0 && (() => {
                                                            const remainingNames = ids.slice(2)
                                                                .map(tid => tematikList.find(x => x.id === Number(tid))?.nama)
                                                                .filter(Boolean);
                                                            return (
                                                                <span 
                                                                    className="text-[9px] font-black text-slate-400 px-2 py-0.5 bg-slate-50 rounded-md border border-slate-100 whitespace-nowrap cursor-help hover:bg-white hover:text-ppm-blue hover:border-ppm-blue/30 transition-all"
                                                                    title={remainingNames.join('\n')}
                                                                >
                                                                    +{remainingCount} lainnya
                                                                </span>
                                                            );
                                                        })()}
                                                    </>
                                                );
                                            })()}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-1.5 text-slate-500">
                                            <Building2 size={12} className="shrink-0" />
                                            <span className="text-[11px] font-bold">{act.instansi_penyelenggara || '-'}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-wrap gap-1 max-w-[220px]">
                                            {(() => {
                                                if (!act.petugas_ids) return <span className="text-slate-300 text-[10px] tracking-widest uppercase font-black">-</span>;
                                                const ids = act.petugas_ids.split(',');
                                                const visibleIds = ids.slice(0, 3);
                                                const remainingCount = ids.length - 3;
                                                return (
                                                    <>
                                                        {visibleIds.map(pid => {
                                                            const p = pegawaiList.find(x => x.id === Number(pid));
                                                            return p ? (
                                                                <span key={pid} className="px-2 py-1 bg-slate-50 text-slate-600 rounded-lg text-[9px] font-bold border border-slate-100 whitespace-nowrap shadow-sm">
                                                                    {p.nama_lengkap}
                                                                </span>
                                                            ) : null;
                                                        })}
                                                        {remainingCount > 0 && (() => {
                                                            const remainingNames = ids.slice(3)
                                                                .map(pid => pegawaiList.find(x => x.id === Number(pid))?.nama_lengkap)
                                                                .filter(Boolean);
                                                            return (
                                                                <span 
                                                                    className="px-2 py-1 bg-blue-50 text-blue-600 rounded-lg text-[9px] font-black border border-blue-100 whitespace-nowrap cursor-help hover:bg-white transition-all shadow-sm"
                                                                    title={remainingNames.join('\n')}
                                                                >
                                                                    + {remainingCount} lainnya
                                                                </span>
                                                            );
                                                        })()}
                                                    </>
                                                );
                                            })()}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center justify-center">
                                            {[
                                                { id: 'surat_undangan_masuk', icon: <Mail size={14} />, color: 'emerald', label: 'Undangan Masuk' },
                                                { id: 'surat_undangan_keluar', icon: <Send size={14} />, color: 'blue', label: 'Undangan Keluar' },
                                                { id: 'notulensi', icon: <ScrollText size={14} />, color: 'indigo', label: 'Notulensi' },
                                                { id: 'paparan', icon: <BarChart3 size={14} />, color: 'purple', label: 'Paparan' },
                                                { id: 'bahan_desk', icon: <Briefcase size={14} />, color: 'orange', label: 'Bahan Desk' },
                                                { id: 'laporan', icon: <FileCheck size={14} />, color: 'rose', label: 'Laporan' }
                                            ].map((cat, idx, arr) => {
                                                const docs = act.dokumen.filter(d => d.tipe_dokumen === cat.id);
                                                const hasDocs = docs.length > 0;
                                                
                                                return (
                                                    <React.Fragment key={cat.id}>
                                                            {hasDocs ? (
                                                                <button 
                                                                    type="button"
                                                                    className={`tooltip-trigger w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 bg-${cat.color}-50 text-${cat.color}-600 border border-${cat.color}-100 cursor-pointer hover:scale-110 shadow-sm`}
                                                                    onMouseEnter={(e) => {
                                                                        if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
                                                                        const rect = e.currentTarget.getBoundingClientRect();
                                                                        setHoveredDoc({
                                                                            x: rect.left + rect.width / 2,
                                                                            y: rect.top,
                                                                            cat,
                                                                            docs
                                                                        });
                                                                        setHoveredHistory(null);
                                                                    }}
                                                                    onMouseLeave={() => {
                                                                        hoverTimeoutRef.current = setTimeout(() => {
                                                                            setHoveredDoc(null);
                                                                        }, 1000);
                                                                    }}
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        if (docs[0]?.path) {
                                                                            setViewedDoc({ path: docs[0].path, name: docs[0].nama_file });
                                                                        }
                                                                    }}
                                                                >
                                                                    {cat.icon}
                                                                </button>
                                                            ) : (
                                                                <div 
                                                                    className="w-8 h-8 rounded-full flex items-center justify-center text-slate-300 bg-slate-50 border border-slate-100/50 cursor-help transition-all hover:scale-105 hover:bg-slate-100"
                                                                    onMouseEnter={(e) => {
                                                                        if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
                                                                        const rect = e.currentTarget.getBoundingClientRect();
                                                                        setHoveredDoc({
                                                                            x: rect.left + rect.width / 2,
                                                                            y: rect.top,
                                                                            cat,
                                                                            docs: []
                                                                        });
                                                                        setHoveredHistory(null);
                                                                    }}
                                                                    onMouseLeave={() => {
                                                                        hoverTimeoutRef.current = setTimeout(() => {
                                                                            setHoveredDoc(null);
                                                                        }, 1000);
                                                                    }}
                                                                >
                                                                    {cat.icon}
                                                                </div>
                                                            )}
                                                        {idx < arr.length - 1 && (
                                                            <div className={`w-3 h-px ${hasDocs && act.dokumen.some(d => d.tipe_dokumen === arr[idx+1].id) ? `bg-${cat.color}-200` : 'bg-slate-100'}`} />
                                                        )}
                                                    </React.Fragment>
                                                );
                                            })}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col items-center gap-1 relative">
                                            {(() => {
                                                // Sort history by date descending to ensure the latest action is at [0]
                                                const sortedHistory = act.edit_history && act.edit_history.length > 0 
                                                    ? [...act.edit_history].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                                                    : [];
                                                const lastHistory = sortedHistory.length > 0 ? sortedHistory[0] : null;
                                                const dotColor = !lastHistory ? 'bg-blue-500' : 
                                                                lastHistory.aksi === 'create' ? 'bg-blue-500' :
                                                                lastHistory.aksi === 'delete' ? 'bg-rose-500' :
                                                                lastHistory.aksi === 'restore' ? 'bg-emerald-500' :
                                                                'bg-amber-500'; // edit
                                                const dotShadow = dotColor.replace('bg-', 'shadow-');

                                                if (viewMode === 'active') {
                                                    return (
                                                        <div 
                                                            onMouseEnter={(e) => handleTooltipMouseEnter(e, act)}
                                                            onMouseLeave={handleTooltipMouseLeave}
                                                            className="tooltip-trigger flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 text-slate-500 rounded-lg text-[10px] font-black uppercase border border-slate-100 cursor-help hover:bg-white transition-colors"
                                                        >
                                                            <CheckCircle2 size={12} />
                                                            Aktif
                                                            <div className={`w-2 h-2 rounded-full ${dotColor} ${dotShadow} shadow-sm ml-0.5 opacity-100`} />
                                                        </div>
                                                    );
                                                } else {
                                                    return (
                                                        <div 
                                                            onMouseEnter={(e) => handleTooltipMouseEnter(e, act)}
                                                            onMouseLeave={handleTooltipMouseLeave}
                                                            className="flex flex-col items-center gap-0.5 cursor-help group/trash-info"
                                                        >
                                                            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 text-slate-500 rounded-lg text-[10px] font-black uppercase border border-slate-100 group-hover/trash-info:bg-white transition-colors">
                                                                <Trash size={12} />
                                                                Dihapus
                                                                <div className={`w-2 h-2 rounded-full ${dotColor} ${dotShadow} shadow-sm ml-0.5 opacity-100`} />
                                                            </div>
                                                            <span className="text-[9px] font-bold text-slate-400">
                                                                {act.deleted_at ? new Date(act.deleted_at).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '-'}
                                                            </span>
                                                        </div>
                                                    );
                                                }
                                            })()}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center justify-center gap-2">
                                            {viewMode === 'active' ? (
                                                <>
                                                    {act.can_edit && (
                                                        <button 
                                                            onClick={() => openEditModal(act)}
                                                            className="p-2 bg-slate-50 text-slate-400 hover:bg-blue-50 hover:text-blue-600 rounded-xl transition-all shadow-sm"
                                                            title="Edit"
                                                        >
                                                            <Edit2 size={16} />
                                                        </button>
                                                    )}
                                                    {act.can_delete && (
                                                        <button 
                                                            onClick={() => handleDelete(act.id)}
                                                            className="p-2 bg-slate-50 text-slate-400 hover:bg-rose-50 hover:text-rose-600 rounded-xl transition-all shadow-sm"
                                                            title="Hapus"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    )}
                                                </>
                                            ) : (
                                                <>
                                                    {act.can_edit && (
                                                        <button 
                                                            onClick={() => handleRestore(act.id)}
                                                            className="p-2 bg-slate-50 text-slate-400 hover:bg-blue-50 hover:text-blue-600 rounded-xl transition-all shadow-sm"
                                                            title="Pulihkan"
                                                        >
                                                            <Undo2 size={16} />
                                                        </button>
                                                    )}
                                                    {act.can_delete && (
                                                        <button 
                                                            onClick={() => handlePermanentDelete(act.id)}
                                                            className="p-2 bg-slate-50 text-slate-400 hover:bg-rose-50 hover:text-rose-600 rounded-xl transition-all shadow-sm"
                                                            title="Hapus Permanen"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    )}
                                                </>
                                            )}

                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                
                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="px-6 py-4 bg-slate-50 flex items-center justify-between border-t border-slate-100">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                            Menampilkan <span className="text-ppm-blue">{(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, filteredActivities.length)}</span> dari <span className="text-slate-800">{filteredActivities.length}</span> data
                        </p>
                        <div className="flex items-center gap-2">
                            <button 
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="p-2 rounded-xl border border-slate-200 text-slate-400 hover:bg-white disabled:opacity-30 transition-all"
                            >
                                <ChevronLeft size={16} />
                            </button>
                            {[...Array(totalPages)].map((_, i) => (
                                <button 
                                    key={i}
                                    onClick={() => setCurrentPage(i + 1)}
                                    className={`w-8 h-8 rounded-xl font-black text-xs transition-all ${currentPage === i + 1 ? 'bg-ppm-blue text-white shadow-lg shadow-blue-100' : 'text-slate-500 hover:bg-white'}`}
                                >
                                    {i + 1}
                                </button>
                            ))}
                            <button 
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="p-2 rounded-xl border border-slate-200 text-slate-400 hover:bg-white disabled:opacity-30 transition-all"
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                )}
        </div>

        {/* Unified Modal */}
            <ActivityFormModal 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={handleModalSuccess}
                editingActivity={editingActivity}
                user={user}
                masterData={{
                    jenisKegiatan,
                    bidangList,
                    tematikList,
                    pegawaiList,
                    masterInstansiDaerahList,
                    masterDokumenList
                }}
                mode="management"
                onDelete={(id) => handleDelete(id)}
            />


            {hoveredHistory && (
                <div 
                    ref={historyRef}
                    className="fixed z-[9999] transition-opacity duration-200 animate-in fade-in zoom-in-95 pointer-events-none"
                    style={historyStyle}
                    onMouseEnter={() => {
                        if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
                    }}
                    onMouseLeave={() => {
                        hoverTimeoutRef.current = setTimeout(() => {
                            setHoveredHistory(null);
                        }, 800);
                    }}
                >
                    <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 p-4 min-w-[280px] max-w-[320px] overflow-hidden relative pointer-events-auto">
                        <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500" />
                        <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-50 px-1">
                            <History size={14} className="text-blue-600" />
                            <span className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Riwayat Perubahan</span>
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
                                                ${h.aksi === 'create' ? 'bg-blue-500 shadow-blue-100' : 
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
                                                        ${h.aksi === 'create' ? 'text-blue-600' : 
                                                          h.aksi === 'delete' ? 'text-rose-600' : 
                                                          h.aksi === 'restore' ? 'text-emerald-600' : 
                                                          'text-amber-600'}`}
                                                    >
                                                        {h.aksi === 'create' ? 'Dibuat' : h.aksi === 'delete' ? 'Dihapus' : h.aksi === 'restore' ? 'Dipulihkan' : 'Diubah'}
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
                                                </p>
                                            </div>
                                        </div>
                                    ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            {hoveredDoc && (
                <div 
                    ref={docRef}
                    className="fixed z-[9999] transition-opacity duration-200 animate-in fade-in zoom-in-95 pointer-events-none"
                    style={docStyle}
                    onMouseEnter={() => {
                        if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
                    }}
                    onMouseLeave={() => {
                        hoverTimeoutRef.current = setTimeout(() => {
                            setHoveredDoc(null);
                        }, 1000);
                    }}
                >
                    <div className={`bg-white rounded-2xl shadow-2xl border border-slate-100 ${hoveredDoc.docs.length === 0 ? 'min-w-[140px] p-3' : 'min-w-[240px] p-4'} overflow-hidden relative pointer-events-auto`}>
                        <div className={`absolute top-0 left-0 w-1.5 h-full bg-${hoveredDoc.cat.color}-500`} />
                        <p className={`text-[11px] font-black uppercase tracking-widest text-${hoveredDoc.cat.color}-500 ${hoveredDoc.docs.length === 0 ? 'mb-2' : 'mb-3'} px-1 flex items-center gap-2`}>
                            {hoveredDoc.cat.icon}
                            {hoveredDoc.cat.label}
                        </p>
                        <div className="space-y-2 font-bold max-h-[200px] overflow-y-auto custom-scrollbar px-1">
                            {hoveredDoc.docs.length === 0 ? (
                                <div className="py-2 flex flex-col items-center justify-center text-center">
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">Belum ada berkas</p>
                                </div>
                            ) : (
                                hoveredDoc.docs.map(doc => (
                                    <button 
                                        key={doc.id}
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (doc.is_trash) {
                                                alert("File ini berada di tempat sampah dan tidak dapat dibuka.");
                                            } else {
                                                setViewedDoc({ path: doc.path, name: doc.nama_file });
                                            }
                                        }}
                                        className={`w-full flex items-center gap-3 p-2 rounded-xl transition-colors cursor-pointer group/file border border-transparent 
                                            ${doc.is_trash ? 'bg-rose-50/50 text-rose-400 hover:border-rose-100 cursor-not-allowed' : 'hover:bg-slate-50 text-slate-700 hover:border-slate-100'}
                                        `}
                                    >
                                        <div className={`p-2 rounded-lg transition-colors shrink-0 
                                            ${doc.is_trash ? 'bg-rose-100 text-rose-500' : 'bg-slate-100 text-slate-400 group-hover/file:bg-blue-600 group-hover/file:text-white'}
                                        `}>
                                            <FileText size={16} />
                                        </div>
                                        <div className="min-w-0 pr-2">
                                            <p className="text-xs truncate w-full group-hover/file:text-blue-700 transition-colors">
                                                {doc.nama_file}
                                                {doc.is_trash === 1 && <span className="ml-1.5 text-[8px] font-black uppercase text-rose-600 bg-rose-100 px-1.5 py-0.5 rounded-md">Terhapus</span>}
                                            </p>
                                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5 shrink-0">
                                                LIHAT FILE
                                            </p>
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                        <div className="mt-3 pt-3 border-t border-slate-50 flex items-center justify-between">
                            <span className="text-[9px] font-bold text-slate-400 px-1 italic">
                                {hoveredDoc.docs.length > 0 ? `Ditemukan ${hoveredDoc.docs.length} berkas` : 'Tidak ada berkas'}
                            </span>
                            {hoveredDoc.docs.length > 0 && (
                                <div className="flex items-center gap-1 text-ppm-blue animate-pulse">
                                    <Eye size={10} />
                                    <span className="text-[9px] font-black uppercase tracking-tighter">Pratinjau</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
            {/* Document Delete Confirmation Modal */}
            {confirmDeleteDoc && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-300">
                        <div className="flex flex-col items-center text-center space-y-6">
                            <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center shadow-inner">
                                <Trash2 size={32} />
                            </div>
                            
                            <div className="space-y-2">
                                <h3 className="text-xl font-black text-slate-800 tracking-tight">Hapus Dokumen?</h3>
                                <p className="text-sm text-slate-500 leading-relaxed px-4">
                                    Dokumen <span className="font-bold text-slate-800">"{confirmDeleteDoc.doc.nama_file}"</span> akan dihapus dari kegiatan ini.
                                </p>
                            </div>

                            <div className="w-full space-y-3">
                                <button
                                    onClick={() => processDocRemoval('trash')}
                                    className="w-full py-4 bg-rose-500 hover:bg-rose-600 text-white rounded-2xl font-bold text-sm shadow-lg shadow-rose-200 transition-all active:scale-95 flex items-center justify-center gap-2"
                                >
                                    <Trash2 size={18} />
                                    <span>Pindahkan Ke Tempat Sampah</span>
                                </button>
                                
                                <button
                                    onClick={() => processDocRemoval('unlink')}
                                    className="w-full py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-bold text-sm transition-all active:scale-95 flex items-center justify-center gap-2"
                                >
                                    <FolderOpen size={18} />
                                    <span>Hanya Hapus dari Kegiatan Ini</span>
                                </button>
                                
                                <button
                                    onClick={() => setConfirmDeleteDoc(null)}
                                    className="w-full py-3 text-slate-400 hover:text-slate-600 font-bold text-[10px] uppercase tracking-widest transition-all"
                                >
                                    Batal
                                </button>
                            </div>
                            
                            <div className="pt-2">
                                <div className="p-3 bg-blue-50 rounded-xl flex items-start gap-3">
                                    <Info size={16} className="text-blue-500 shrink-0 mt-0.5" />
                                    <p className="text-[10px] text-blue-600 font-bold leading-tight text-left">
                                        Pilihan kedua akan tetap menyimpan file Anda di menu Kelola Dokumen agar bisa digunakan kembali nanti.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* Document Viewer Modal */}
            <DocumentViewerModal 
                isOpen={!!viewedDoc}
                onClose={() => setViewedDoc(null)}
                fileUrl={viewedDoc?.path}
                fileName={viewedDoc?.name}
            />
        </div>
    );
}


