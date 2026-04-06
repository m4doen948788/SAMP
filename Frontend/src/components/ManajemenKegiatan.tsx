import React, { useState, useEffect, useRef, useMemo } from 'react';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
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
    BarChart3
} from 'lucide-react';
import { SearchableSelect } from './common/SearchableSelect';
import { SearchableSelectV2 } from './common/SearchableSelectV2';
import { CollapsibleHierarchicalSelect } from './common/CollapsibleHierarchicalSelect';

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
    created_at: string;
    sesi: string | null;
    dokumen: ActivityDoc[];
    surat_undangan_masuk_id: number | null;
    surat_undangan_keluar_id: number | null;
    bahan_desk_id: number | null;
    paparan_id: number | null;
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

export default function ManajemenKegiatan() {
    const { user } = useAuth();
    const [activities, setActivities] = useState<Activity[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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
    const hoverTimeoutRef = useRef<any>(null);

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

    useEffect(() => {
        fetchData();
        fetchMasterData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await api.kegiatanManajemen.getAll();
            if (res.success) setActivities(res.data);
        } catch (err) {
            console.error('Failed to fetch activities', err);
        } finally {
            setLoading(false);
        }
    };

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
        
        // Check if instansi is in current list
        const instansiExists = masterInstansiDaerahList.some(i => i.instansi === activity.instansi_penyelenggara);
        
        setFormData({
            tanggal: toLocalDateISO(activity.tanggal),
            tanggal_akhir: toLocalDateISO(activity.tanggal_akhir || activity.tanggal),
            nama_kegiatan: activity.nama_kegiatan,
            jenis_kegiatan_id: String(activity.jenis_kegiatan_id || ''),
            bidang_id: String(activity.bidang_id || ''),
            instansi_penyelenggara: (activity.instansi_penyelenggara && instansiExists) ? activity.instansi_penyelenggara : (activity.instansi_penyelenggara ? 'Lainnya' : ''),
            manual_instansi: instansiExists ? '' : activity.instansi_penyelenggara || '',
            kelengkapan: activity.kelengkapan || '',
            tematik_ids: activity.tematik_ids ? activity.tematik_ids.split(',').map(Number) : [],
            petugas_ids: activity.petugas_ids ? activity.petugas_ids.split(',').map(Number) : [],
            bidang_ids: activity.bidang_ids || '',
            sesi: activity.sesi || '',
            jenis_dokumen_ids: {
                surat_undangan_masuk: activity.dokumen.find(d => d.tipe_dokumen === 'surat_undangan_masuk')?.dokumen_id ? String(activity.dokumen.find(d => d.tipe_dokumen === 'surat_undangan_masuk')?.dokumen_id) : '',
                surat_undangan_keluar: activity.dokumen.find(d => d.tipe_dokumen === 'surat_undangan_keluar')?.dokumen_id ? String(activity.dokumen.find(d => d.tipe_dokumen === 'surat_undangan_keluar')?.dokumen_id) : '',
                notulensi: activity.dokumen.find(d => d.tipe_dokumen === 'notulensi')?.dokumen_id ? String(activity.dokumen.find(d => d.tipe_dokumen === 'notulensi')?.dokumen_id) : '',
                paparan: activity.dokumen.find(d => d.tipe_dokumen === 'paparan')?.dokumen_id ? String(activity.dokumen.find(d => d.tipe_dokumen === 'paparan')?.dokumen_id) : '',
                bahan_desk: activity.dokumen.find(d => d.tipe_dokumen === 'bahan_desk')?.dokumen_id ? String(activity.dokumen.find(d => d.tipe_dokumen === 'bahan_desk')?.dokumen_id) : '',
                laporan: activity.dokumen.find(d => d.tipe_dokumen === 'laporan')?.dokumen_id ? String(activity.dokumen.find(d => d.tipe_dokumen === 'laporan')?.dokumen_id) : '',
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
        setRemovedDocIds([]);
        setIsModalOpen(true);
    };

    // Reset document type if all files are removed for specific mandatory categories
    useEffect(() => {
        if (!isModalOpen) return;
        
        ['bahan_desk', 'laporan'].forEach(field => {
            const hasFiles = 
                (editingActivity?.dokumen.filter(d => d.tipe_dokumen === field && !removedDocIds.includes(d.id)).length || 0) > 0 ||
                files[field as keyof typeof files].length > 0 ||
                selectedLibraryDocs[field as keyof typeof selectedLibraryDocs].length > 0;

            if (!hasFiles && formData.jenis_dokumen_ids[field as keyof typeof formData.jenis_dokumen_ids]) {
                setFormData(prev => ({
                    ...prev,
                    jenis_dokumen_ids: { ...prev.jenis_dokumen_ids, [field]: '' }
                }));
            }
        });
    }, [files, selectedLibraryDocs, removedDocIds, isModalOpen, editingActivity]);

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

        const sumId = masterDokumenList.find(d => d.dokumen.toLowerCase().includes('undangan masuk'))?.id;
        const sukId = masterDokumenList.find(d => d.dokumen.toLowerCase().includes('undangan keluar'))?.id;
        const notId = masterDokumenList.find(d => d.dokumen.toLowerCase() === 'notulensi' || d.dokumen.toLowerCase().includes('notulensi'))?.id;
        const papId = masterDokumenList.find(d => d.dokumen.toLowerCase().includes('paparan'))?.id;

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
        if (!confirm('Apakah Anda yakin ingin menghapus kegiatan ini? Semua dokumen terkait akan dihapus.')) return;
        try {
            const res = await api.kegiatanManajemen.delete(id);
            if (res.success) {
                showMsg('success', 'Kegiatan berhasil dihapus');
                fetchData();
            } else {
                showMsg('error', res.message || 'Gagal menghapus kegiatan');
            }
        } catch (err) {
            showMsg('error', 'Terjadi kesalahan sistem');
        }
    };

    const filteredActivities = activities.filter(act => {
        const matchesSearch = act.nama_kegiatan.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             (act.instansi_penyelenggara || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchesBidang = filterBidang === '' || 
                             String(act.bidang_id) === filterBidang || 
                             (act.bidang_ids?.split(',').includes(filterBidang));
        const matchesTematik = filterTematik === '' || (act.tematik_ids?.split(',').includes(filterTematik));
        
        const actDate = new Date(act.tanggal);
        const matchesStart = filterDateStart === '' || actDate >= new Date(filterDateStart);
        const matchesEnd = filterDateEnd === '' || actDate <= new Date(filterDateEnd);

        return matchesSearch && matchesBidang && matchesTematik && matchesStart && matchesEnd;
    });

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
        if (!userBidangId) return pegawaiList; // no bidang set → show all agency personnel
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
                disabled: !!isBusy
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
        <div className="max-w-full mx-auto pb-10 space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight">Isi Kegiatan</h2>
                    <p className="text-slate-500 text-sm">Kelola daftar aktivitas, undangan, paparan, dan laporan kegiatan personil.</p>
                </div>
                <button 
                    onClick={openAddModal}
                    className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-200 hover:shadow-indigo-300/50 hover:scale-[1.05] active:scale-[0.98] transition-all duration-300 group"
                >
                    <div className="p-1 bg-white/20 rounded-lg group-hover:rotate-90 transition-transform duration-500">
                        <Plus size={18} />
                    </div>
                    <span className="font-black uppercase tracking-[0.1em] text-[10px]">Tambah Kegiatan</span>
                </button>
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

            {/* Filters */}
            <div className="card-modern p-6 bg-white border border-slate-100 shadow-xl shadow-slate-200/40">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
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
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center w-32">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <Loader2 size={32} className="text-ppm-blue animate-spin" />
                                            <p className="text-sm font-bold text-slate-400 animate-pulse">Memuat data kegiatan...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : paginatedActivities.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-20 text-center">
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
                                        <h4 className="text-sm font-bold text-slate-800 leading-tight">{act.nama_kegiatan}</h4>
                                        {act.jenis_kegiatan_nama && (
                                            <div className="mt-1.5">
                                                <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-md text-[9px] font-black uppercase border border-indigo-100">
                                                    {act.jenis_kegiatan_nama}
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
                                                        <div className="relative group/doc">
                                                            <div 
                                                                className={`
                                                                    w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300
                                                                    ${hasDocs 
                                                                        ? `bg-${cat.color}-50 text-${cat.color}-600 ${['paparan', 'bahan_desk'].includes(cat.id) ? '' : `border-2 border-${cat.color}-100`} cursor-pointer hover:scale-110 hover:shadow-lg hover:shadow-${cat.color}-100` 
                                                                        : `bg-slate-50 text-slate-200 ${['paparan', 'bahan_desk'].includes(cat.id) ? '' : 'border border-slate-100'} opacity-40`}
                                                                `}
                                                                onMouseEnter={(e) => {
                                                                    if (hasDocs) {
                                                                        if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
                                                                        const rect = e.currentTarget.getBoundingClientRect();
                                                                        setHoveredDoc({
                                                                            x: rect.left + rect.width / 2,
                                                                            y: rect.top,
                                                                            cat,
                                                                            docs
                                                                        });
                                                                    }
                                                                }}
                                                                onMouseLeave={() => {
                                                                    hoverTimeoutRef.current = setTimeout(() => {
                                                                        setHoveredDoc(null);
                                                                    }, 1000);
                                                                }}
                                                                onClick={() => {
                                                                    if (hasDocs && docs[0].path) {
                                                                        window.open(docs[0].path, '_blank');
                                                                    }
                                                                }}
                                                            >
                                                                {cat.icon}
                                                            </div>
                                                        </div>
                                                        {idx < arr.length - 1 && (
                                                            <div className={`w-3 h-px ${hasDocs && act.dokumen.some(d => d.tipe_dokumen === arr[idx+1].id) ? `bg-${cat.color}-200` : 'bg-slate-100'}`} />
                                                        )}
                                                    </React.Fragment>
                                                );
                                            })}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center justify-center gap-2">
                                            <button 
                                                onClick={() => openEditModal(act)}
                                                className="p-2 bg-slate-50 text-slate-400 hover:bg-blue-50 hover:text-blue-600 rounded-xl transition-all"
                                                title="Edit"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button 
                                                onClick={() => handleDelete(act.id)}
                                                className="p-2 bg-slate-50 text-slate-400 hover:bg-rose-50 hover:text-rose-600 rounded-xl transition-all"
                                                title="Hapus"
                                            >
                                                <Trash2 size={16} />
                                            </button>
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

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-5xl max-h-[90vh] rounded-3xl shadow-2xl flex flex-col animate-in zoom-in-95 duration-300 !overflow-visible">
                        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between shrink-0">
                            <div>
                                <h3 className="text-xl font-black text-slate-800 tracking-tight">
                                    {editingActivity ? 'Edit Kegiatan' : 'Tambah Kegiatan Baru'}
                                </h3>
                                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-0.5">Lengkapi informasi aktivitas di bawah ini</p>
                            </div>
                            <button 
                                onClick={() => setIsModalOpen(false)}
                                className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                                {/* Left Column: Basic Info */}
                                <div className="lg:col-span-7 space-y-8">
                                    <div className="grid grid-cols-12 gap-6">
                                        <div className="col-span-12 md:col-span-3 space-y-2">
                                            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                                                <Calendar size={12} className="text-ppm-blue" /> Mulai
                                            </label>
                                            <input 
                                                type="date" 
                                                required
                                                className="input-modern w-full"
                                                value={formData.tanggal}
                                                onChange={(e) => setFormData(p => ({ ...p, tanggal: e.target.value }))}
                                            />
                                        </div>
                                        <div className="col-span-12 md:col-span-3 space-y-2">
                                            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                                                <Calendar size={12} className="text-ppm-blue" /> Selesai
                                            </label>
                                            <input 
                                                type="date" 
                                                required
                                                className="input-modern w-full"
                                                value={formData.tanggal_akhir}
                                                onChange={(e) => setFormData(p => ({ ...p, tanggal_akhir: e.target.value }))}
                                            />
                                        </div>
                                        <div className="col-span-12 md:col-span-6 space-y-2">
                                            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                                                <Tag size={12} className="text-ppm-blue" /> Jenis Kegiatan
                                            </label>
                                            <CollapsibleHierarchicalSelect
                                                value={formData.jenis_kegiatan_id}
                                                onChange={(val) => {
                                                    const selectedType = jenisKegiatan.find(j => String(j.id) === String(val));
                                                    const typeName = (selectedType?.nama || '').toLowerCase();
                                                    let newSesi = formData.sesi;
                                                    
                                                    // Auto-fill Sesi for DL
                                                    if (typeName.includes('dl ') || typeName.includes('dl/') || typeName === 'dl' || typeName.includes('dinas luar')) {
                                                        newSesi = 'Full Day';
                                                    }
                                                    
                                                    setFormData(p => ({ ...p, jenis_kegiatan_id: val.toString(), sesi: newSesi }));
                                                }}
                                                options={hierarchicalJenisKegiatan}
                                                label="Jenis Kegiatan"
                                                placeholder="-- Pilih Jenis Kegiatan --"
                                                defaultCollapsedNames={['Rapat MAMIN', 'Rapat Luar Bidang']}
                                            />
                                        </div>
                                    </div>

                                    {(() => {
                                        const selectedType = jenisKegiatan.find(j => String(j.id) === formData.jenis_kegiatan_id);
                                        const typeName = (selectedType?.nama || '').toLowerCase();
                                        const isRequiredMeeting = typeName.includes('rapat mamin') || typeName.includes('rapat luar bidang');
                                        const isDL = typeName.includes('dl') || typeName.includes('dinas luar');

                                        if (!isRequiredMeeting && !isDL) return null;

                                        return (
                                            <div className="space-y-4 p-5 bg-gradient-to-br from-blue-50/50 to-indigo-50/50 rounded-[2rem] border border-blue-100/50 animate-in zoom-in-95 slide-in-from-top-2 duration-500 shadow-sm">
                                                <div className="flex items-center justify-between">
                                                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                                                        <Calendar size={12} className="text-ppm-blue" /> Pilih Sesi Kegiatan
                                                        {isRequiredMeeting && <span className="text-rose-500 ml-1 font-black">*</span>}
                                                    </label>
                                                    <span className={`px-3 py-1 text-[9px] font-black rounded-full border uppercase tracking-tighter shadow-sm
                                                        ${isRequiredMeeting 
                                                            ? 'bg-rose-50 text-rose-600 border-rose-100 ring-2 ring-rose-100/50' 
                                                            : 'bg-white text-ppm-blue border-blue-100'}
                                                    `}>
                                                        {isRequiredMeeting ? 'Wajib Diisi' : 'Rekomendasi'}
                                                    </span>
                                                </div>
                                                <div className="grid grid-cols-3 gap-3">
                                                    {[
                                                        { id: 'Pagi', label: 'Pagi', time: '07.30 - 12.00' },
                                                        { id: 'Siang', label: 'Siang', time: '13.00 - 16.30' },
                                                        { id: 'Full Day', label: 'Full Day', time: '07.30 - 16.30' }
                                                    ].map(s => (
                                                        <button
                                                            key={s.id}
                                                            type="button"
                                                            onClick={() => setFormData(p => ({ ...p, sesi: s.id }))}
                                                            className={`group relative p-4 rounded-[1.5rem] border-2 transition-all duration-300 flex flex-col items-center justify-center gap-1 overflow-hidden ${formData.sesi === s.id ? 'border-ppm-blue bg-white shadow-xl shadow-blue-100 ring-4 ring-blue-50' : 'border-slate-100 bg-white/60 hover:bg-white hover:border-slate-200'}`}
                                                        >
                                                            <div className="flex flex-col items-center">
                                                                <span className={`text-[11px] font-black uppercase tracking-wider ${formData.sesi === s.id ? 'text-ppm-blue' : 'text-slate-500'}`}>{s.label}</span>
                                                                <span className="text-[8px] font-bold text-slate-400 italic block mt-0.5">{s.time}</span>
                                                            </div>
                                                            {formData.sesi === s.id && (
                                                                <div className="absolute top-2 right-2 p-1 bg-ppm-blue text-white rounded-full">
                                                                    <CheckCircle2 size={10} />
                                                                </div>
                                                            )}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })()}

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                                            <FileText size={12} className="text-ppm-blue" /> Nama Kegiatan
                                        </label>
                                        <textarea 
                                            required
                                            rows={3}
                                            className="input-modern w-full p-4 font-bold text-slate-700 min-h-[100px]"
                                            placeholder="Masukkan nama lengkap kegiatan..."
                                            value={formData.nama_kegiatan}
                                            onChange={(e) => setFormData(p => ({ ...p, nama_kegiatan: e.target.value }))}
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 gap-6">
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                                                    <Building2 size={12} className="text-ppm-blue" /> Instansi Penyelenggara
                                                </label>
                                                {formData.instansi_penyelenggara && (
                                                    <button 
                                                        onClick={() => setFormData(p => ({ ...p, instansi_penyelenggara: '', manual_instansi: '' }))}
                                                        className="text-[10px] font-bold text-rose-500 flex items-center gap-1 hover:bg-rose-50 px-2 py-0.5 rounded transition-all"
                                                    >
                                                        <X size={10} /> Kosongkan
                                                    </button>
                                                )}
                                            </div>
                                            <SearchableSelect
                                                value={formData.instansi_penyelenggara}
                                                onChange={(val: any) => setFormData(p => ({ ...p, instansi_penyelenggara: val }))}
                                                options={agencyOptions}
                                                label="Cari Instansi..."
                                                keyField="id"
                                                displayField="label"
                                            />
                                            {formData.instansi_penyelenggara === 'Lainnya' && (
                                                <div className="animate-in slide-in-from-top-2 duration-300 pt-2">
                                                    <input 
                                                        type="text"
                                                        className="input-modern w-full bg-blue-50/50 border-blue-200"
                                                        placeholder="Ketik nama instansi di sini..."
                                                        value={formData.manual_instansi}
                                                        onChange={(e) => setFormData(p => ({ ...p, manual_instansi: e.target.value }))}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                                                <Users size={12} className="text-ppm-blue" /> 
                                                <span>Petugas / Peserta</span>
                                                {formData.petugas_ids.length > 0 && (
                                                    <span className="ml-2 px-1.5 py-0.5 bg-ppm-blue text-white rounded-md text-[9px] animate-in zoom-in-50">
                                                        {formData.petugas_ids.length}
                                                    </span>
                                                )}
                                            </label>
                                            <div className="flex items-center gap-2">
                                                {user?.tipe_user_id === 1 && (
                                                    <div className="flex items-center gap-2 mr-4">
                                                        <span className="text-[9px] font-black text-slate-400">FILTER INSTANSI:</span>
                                                        <div className="w-48">
                                                            <SearchableSelect
                                                                value={filterInstansiPetugas}
                                                                onChange={(val) => setFilterInstansiPetugas(val || '')}
                                                                options={agencyIdOptions}
                                                                label="Pilih Instansi"
                                                                className="scale-90 origin-right"
                                                            />
                                                        </div>
                                                    </div>
                                                )}
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Semua Bidang</span>
                                                <button 
                                                    type="button"
                                                    onClick={() => setShowAllPegawai(!showAllPegawai)}
                                                    className={`w-8 h-4 rounded-full transition-all relative ${showAllPegawai ? 'bg-ppm-blue' : 'bg-slate-200'}`}
                                                >
                                                    <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${showAllPegawai ? (user?.role === 'superadmin' ? 'left-4' : 'left-4.5') : 'left-0.5'}`} />
                                                </button>
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap gap-2 p-4 border-2 border-slate-100 rounded-[2rem] min-h-[80px] bg-white/50 backdrop-blur-sm">
                                            {formData.petugas_ids.map(pid => {
                                                const p = pegawaiList.find(x => x.id === pid);
                                                const isBusy = officerAvailability[pid];

                                                return p ? (
                                                    <span 
                                                        key={pid} 
                                                        title={isBusy ? `Peringatan: Jadwal bentrok (${isBusy.map(a => a.nama).join(', ')})` : ''}
                                                        className={`px-3 py-1 rounded-2xl text-[10px] font-black border flex items-center gap-1.5 shadow-sm animate-in zoom-in-95 group transition-all uppercase tracking-tight
                                                            ${isBusy 
                                                                ? 'bg-rose-50 text-rose-600 border-rose-200 ring-4 ring-rose-50' 
                                                                : 'bg-indigo-50 text-indigo-700 border-indigo-100 hover:bg-indigo-100'}
                                                        `}
                                                    >
                                                        {isBusy ? <AlertCircle size={10} className="animate-pulse" /> : <div className="w-1.5 h-1.5 rounded-full bg-indigo-400/40" />}
                                                        {p.nama_lengkap}
                                                        <X 
                                                            size={12} 
                                                            className={`${isBusy ? 'text-rose-400' : 'text-indigo-300'} hover:text-rose-500 cursor-pointer transition-colors`} 
                                                            onClick={() => setFormData(prev => ({ ...prev, petugas_ids: prev.petugas_ids.filter(id => id !== pid) }))}
                                                        />
                                                    </span>
                                                ) : null;
                                            })}
                                            <div className="w-full md:w-[600px] mt-2">
                                                <SearchableSelectV2
                                                    value={formData.petugas_ids}
                                                    onChange={(ids) => {
                                                        setFormData(prev => ({ ...prev, petugas_ids: ids }));
                                                    }}
                                                    multiple={true}
                                                    options={mappedPegawaiOptions}
                                                    label="Pilih Petugas..."
                                                    displayField="nama"
                                                    secondaryField="secondary"
                                                    className="scale-90 origin-left"
                                                    closeOnSelect={false}
                                                    hideSelectedInTrigger={true}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                                            <Tag size={12} className="text-ppm-blue" /> 
                                            <span>Tagging Tematik</span>
                                            {formData.tematik_ids.length > 0 && (
                                                <span className="ml-2 px-1.5 py-0.5 bg-emerald-500 text-white rounded-md text-[9px] animate-in zoom-in-50">
                                                    {formData.tematik_ids.length}
                                                </span>
                                            )}
                                        </label>
                                        <div className="flex flex-wrap gap-2 p-4 border-2 border-slate-100 rounded-[2rem] min-h-[80px] bg-white/50 backdrop-blur-sm">
                                            {formData.tematik_ids.map(tid => {
                                                const t = tematikList.find(x => x.id === tid);
                                                return t ? (
                                                    <span key={tid} className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-2xl text-[10px] font-black border border-emerald-100 flex items-center gap-1.5 shadow-sm animate-in zoom-in-95 group hover:bg-emerald-100 transition-all uppercase tracking-tight">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400/40" />
                                                        {t.nama}
                                                        <X 
                                                            size={12} 
                                                            className="text-emerald-300 hover:text-rose-500 cursor-pointer transition-colors" 
                                                            onClick={() => setFormData(prev => ({ ...prev, tematik_ids: prev.tematik_ids.filter(id => id !== tid) }))}
                                                        />
                                                    </span>
                                                ) : null;
                                            })}
                                            <div className="w-full md:w-[600px] mt-2">
                                                <SearchableSelectV2
                                                    value={formData.tematik_ids}
                                                    onChange={(ids) => {
                                                        setFormData(prev => ({ ...prev, tematik_ids: ids }));
                                                    }}
                                                    multiple={true}
                                                    options={mappedTematikOptions}
                                                    label="Pilih Tagging Tematik..."
                                                    displayField="nama"
                                                    className="scale-90 origin-left"
                                                    closeOnSelect={false}
                                                    hideSelectedInTrigger={true}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Right Column: Document Uploads & Kelola Dokumen Integration */}
                                <div className="lg:col-span-5 space-y-4">
                                    <div className="p-5 bg-slate-50 rounded-3xl border border-slate-100 space-y-4">
                                        <div className="flex items-center gap-2.5 border-b border-slate-200 pb-3">
                                            <div className="p-2 bg-ppm-blue text-white rounded-xl shadow-lg shadow-blue-100">
                                                <Upload size={16} />
                                            </div>
                                            <div>
                                                <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Unggah Dokumen</h4>
                                            </div>
                                        </div>

                                        {/* Document Fields */}
                                        <div className="space-y-4 max-h-[450px] overflow-y-auto custom-scrollbar pr-1">
                                            {[
                                                { id: 'surat_undangan_masuk', label: 'Surat Undangan Masuk', icon: <Paperclip size={16} />, color: 'emerald' },
                                                { id: 'surat_undangan_keluar', label: 'Surat Undangan Keluar', icon: <Paperclip size={16} />, color: 'blue' },
                                                { id: 'notulensi', label: 'Notulensi', icon: <FileText size={16} />, color: 'emerald' },
                                                { id: 'paparan', label: 'Bahan Paparan', icon: <ImageIcon size={16} />, color: 'purple' },
                                                { id: 'bahan_desk', label: 'Bahan Desk / Rapat', icon: <FileText size={16} />, color: 'orange' },
                                                { id: 'laporan', label: 'Laporan / File Pendukung', icon: <FileCheck size={16} />, color: 'purple' }
                                            ].map(field => (
                                                <div key={field.id} className="space-y-1.5">
                                                    <div className="flex items-center justify-between">
                                                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                                                            {field.label}
                                                            {(field.id === 'bahan_desk' || field.id === 'laporan') && <span className="text-rose-500 ml-1">*</span>}
                                                        </label>
                                                        {(field.id === 'bahan_desk' || field.id === 'laporan') && (
                                                            <select 
                                                                className={`text-[9px] font-black border-none rounded-lg px-2 py-0.5 focus:ring-0 uppercase tracking-tighter cursor-pointer transition-colors
                                                                    ${!formData.jenis_dokumen_ids[field.id] ? `bg-rose-100 text-rose-600 ring-1 ring-rose-200` : `bg-${field.color}-50 text-${field.color}-600`}
                                                                `}
                                                                value={formData.jenis_dokumen_ids[field.id]}
                                                                onChange={(e) => setFormData(p => ({ 
                                                                    ...p, 
                                                                    jenis_dokumen_ids: { ...p.jenis_dokumen_ids, [field.id]: e.target.value }
                                                                }))}
                                                            >
                                                                <option value="">Pilih Jenis Dokumen...</option>
                                                                {masterDokumenList
                                                                    .filter(d => !d.dokumen.toLowerCase().startsWith('surat'))
                                                                    .map(d => <option key={d.id} value={d.id}>{d.dokumen}</option>)}
                                                            </select>
                                                        )}
                                                    </div>
                                                    <div className="p-2.5 bg-white rounded-2xl border border-slate-200 border-dashed space-y-3">
                                                        <div className="flex items-center gap-1.5 flex-wrap">
                                                            {/* Existing Files */}
                                                            {editingActivity && editingActivity.dokumen
                                                                .filter(d => d.tipe_dokumen === field.id)
                                                                .map(d => (
                                                                    <div key={d.id} className={`group relative px-2 py-1 rounded-lg text-[8px] font-black flex items-center gap-1.5 transition-all ${removedDocIds.includes(d.id) ? 'bg-rose-50 text-rose-400 opacity-50' : 'bg-slate-50 text-slate-600 border border-slate-100'}`}>
                                                                        <span className="max-w-[70px] truncate">{d.nama_file}</span>
                                                                        <button 
                                                                            type="button"
                                                                            onClick={() => removedDocIds.includes(d.id) ? toggleRemovedDoc(d.id) : handleRemoveExistingDoc(d, field.id)}
                                                                            className={`${removedDocIds.includes(d.id) ? 'text-blue-500' : 'text-rose-400'} hover:scale-110`}
                                                                        >
                                                                            {removedDocIds.includes(d.id) ? <Plus size={10} /> : <X size={10} />}
                                                                        </button>
                                                                    </div>
                                                                ))
                                                            }
                                                            {/* New Files */}
                                                            {files[field.id].map((f, idx) => (
                                                                <div key={idx} className="px-2 py-1 bg-blue-50 text-blue-600 border border-blue-100 rounded-lg text-[8px] font-black flex items-center gap-1.5 animate-in zoom-in-95">
                                                                    <span className="max-w-[70px] truncate">{f.name}</span>
                                                                    <X size={10} className="cursor-pointer hover:text-rose-500 transition-colors" onClick={() => removeFile(field.id, idx)} />
                                                                </div>
                                                            ))}
                                                            
                                                            {/* Selected Library Files */}
                                                            {selectedLibraryDocs[field.id].map((doc, idx) => (
                                                                <div key={doc.id} className="px-2 py-1 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-lg text-[8px] font-black flex items-center gap-1.5 animate-in zoom-in-95">
                                                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                                                    <span className="max-w-[70px] truncate">{doc.nama_file}</span>
                                                                    <X 
                                                                        size={10} 
                                                                        className="cursor-pointer hover:text-rose-500 transition-colors" 
                                                                        onClick={() => handleRemoveExistingDoc(doc, field.id)} 
                                                                    />
                                                                </div>
                                                            ))}

                                                            <div className="flex items-center gap-2">
                                                                <button 
                                                                    type="button" 
                                                                    className={`w-6 h-6 rounded-full bg-${field.color}-500 text-white flex items-center justify-center shadow-lg shadow-${field.color}-100 hover:scale-110 active:scale-95 transition-all outline-none`}
                                                                    onClick={() => (fileRefs as any)[field.id].current?.click()}
                                                                    title="Unggah File Baru"
                                                                >
                                                                    <Plus size={10} />
                                                                </button>
                                                                <button 
                                                                    type="button" 
                                                                    className={`w-6 h-6 rounded-full bg-slate-800 text-white flex items-center justify-center shadow-lg shadow-slate-100 hover:scale-110 active:scale-95 transition-all outline-none`}
                                                                    onClick={() => {
                                                                        setPickingCategory(field.id);
                                                                        setIsLibraryPickerOpen(true);
                                                                    }}
                                                                    title="Pilih dari Perpustakaan"
                                                                >
                                                                    <FolderOpen size={10} />
                                                                </button>
                                                            </div>
                                                            <input 
                                                                type="file" 
                                                                multiple
                                                                className="hidden" 
                                                                ref={(fileRefs as any)[field.id]}
                                                                onChange={(e) => handleFileChange(e, field.id)}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </form>

                        <div className="px-8 py-6 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center rounded-b-3xl shrink-0">
                            <div className="text-[10px] font-black text-slate-400 flex items-center gap-2">
                                <Info size={14} className="text-ppm-blue" />
                                * SEMUA INPUT DATA HARUS SESUAI DENGAN ATURAN ADMINISTRASI
                            </div>
                            <div className="flex items-center gap-3">
                                <button 
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-6 py-2.5 text-xs font-black text-slate-500 uppercase tracking-widest hover:text-slate-700 transition-colors"
                                >
                                    Batal
                                </button>
                                <button 
                                    onClick={handleSubmit}
                                    disabled={saving}
                                    className="px-8 py-3 bg-ppm-blue text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-blue-100 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center gap-2"
                                >
                                    {saving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                                    {saving ? 'Menyimpan...' : 'Simpan Data'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* Document Library Picker Modal */}
            {isLibraryPickerOpen && (
                <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsLibraryPickerOpen(false)} />
                    <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-200">
                        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                            <div>
                                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Pilih Dokumen</h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">Dari Kelola Dokumen</p>
                            </div>
                            <button onClick={() => setIsLibraryPickerOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                                <X size={18} className="text-slate-400" />
                            </button>
                        </div>
                        
                        <div className="p-4">
                            <div className="relative mb-4">
                                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input 
                                    type="text" 
                                    className="input-modern pl-10" 
                                    placeholder="Cari nama file..." 
                                    value={librarySearch}
                                    onChange={(e) => setLibrarySearch(e.target.value)}
                                    autoFocus
                                />
                            </div>
                            
                            <div className="space-y-1 max-h-[350px] overflow-y-auto custom-scrollbar pr-1">
                                {libraryDocs.length === 0 ? (
                                    <div className="py-20 text-center space-y-3 animate-in fade-in duration-500">
                                        <div className="p-4 bg-slate-50 w-fit mx-auto rounded-full text-slate-300">
                                            <FolderOpen size={32} />
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Perpustakaan Kosong</p>
                                            <p className="text-[10px] font-bold text-slate-300 uppercase tracking-tighter">Unggah dokumen terlebih dahulu di menu Kelola Dokumen</p>
                                        </div>
                                    </div>
                                ) : libraryDocs.filter(doc => doc.nama_file.toLowerCase().includes(librarySearch.toLowerCase())).length === 0 ? (
                                    <div className="py-20 text-center space-y-2 animate-in fade-in duration-500">
                                        <Search size={24} className="mx-auto text-slate-200" />
                                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Dokumen Tidak Ditemukan</p>
                                    </div>
                                ) : libraryDocs
                                    .filter(doc => doc.nama_file.toLowerCase().includes(librarySearch.toLowerCase()))
                                    .map(doc => {
                                        const isSelected = pickingCategory && selectedLibraryDocs[pickingCategory].some(d => d.id === doc.id);
                                        return (
                                            <div 
                                                key={doc.id}
                                                className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between group ${isSelected ? 'bg-blue-50 border-blue-200 shadow-sm' : 'bg-slate-50 border-transparent hover:border-slate-200'}`}
                                                onClick={() => {
                                                    if (!pickingCategory) return;
                                                    
                                                    const exists = selectedLibraryDocs[pickingCategory].some(d => d.id === doc.id);
                                                    
                                                    if (!exists) {
                                                        // Validation for specific categories
                                                        const docTypeName = doc.jenis_dokumen_nama?.toLowerCase() || '';
                                                        let isMismatch = false;
                                                        let expectedType = '';

                                                        if (pickingCategory === 'surat_undangan_masuk' && !docTypeName.includes('undangan masuk')) {
                                                            isMismatch = true;
                                                            expectedType = 'Surat Undangan Masuk';
                                                        } else if (pickingCategory === 'surat_undangan_keluar' && !docTypeName.includes('undangan keluar')) {
                                                            isMismatch = true;
                                                            expectedType = 'Surat Undangan Keluar';
                                                        } else if (pickingCategory === 'notulensi' && !docTypeName.includes('notulensi')) {
                                                            isMismatch = true;
                                                            expectedType = 'Notulensi';
                                                        } else if (pickingCategory === 'paparan' && !docTypeName.includes('paparan')) {
                                                            isMismatch = true;
                                                            expectedType = 'Bahan Paparan';
                                                        }

                                                        if (isMismatch) {
                                                            alert(`Peringatan: Dokumen yang dipilih ("${doc.jenis_dokumen_nama}") tidak sesuai dengan kategori yang diminta (${expectedType}).`);
                                                            return;
                                                        }
                                                    }

                                                    setSelectedLibraryDocs(prev => {
                                                        const current = prev[pickingCategory];
                                                        const alreadyExists = current.some(d => d.id === doc.id);
                                                        
                                                        if (alreadyExists) {
                                                            return { ...prev, [pickingCategory]: current.filter(d => d.id !== doc.id) };
                                                        } else {
                                                            // Auto-sync document type if it exists in the library file and the category has a doc type selector
                                                            if (doc.jenis_dokumen_id && (formData.jenis_dokumen_ids as any).hasOwnProperty(pickingCategory)) {
                                                                setFormData(form => ({
                                                                    ...form,
                                                                    jenis_dokumen_ids: { 
                                                                        ...form.jenis_dokumen_ids, 
                                                                        [pickingCategory]: String(doc.jenis_dokumen_id) 
                                                                    }
                                                                }));
                                                            }
                                                            return { ...prev, [pickingCategory]: [...current, doc] };
                                                        }
                                                    });
                                                }}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={`p-2 rounded-xl transition-colors ${isSelected ? 'bg-blue-600 text-white' : 'bg-white text-slate-400 group-hover:text-blue-600'}`}>
                                                        <FileText size={16} />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className={`text-xs font-bold truncate max-w-[280px] ${isSelected ? 'text-blue-700' : 'text-slate-700'}`}>{doc.nama_file}</p>
                                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">{doc.jenis_dokumen_nama} • {new Date(doc.uploaded_at).toLocaleDateString('id-ID')}</p>
                                                    </div>
                                                </div>
                                                {isSelected && <Check size={16} className="text-blue-600" />}
                                            </div>
                                        );
                                    })}
                            </div>
                        </div>
                        
                        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
                            <button 
                                onClick={() => setIsLibraryPickerOpen(false)}
                                className="btn-primary"
                            >
                                Selesai
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {hoveredDoc && (
                <div 
                    className="fixed z-[9999] transition-all duration-200 animate-in fade-in zoom-in-95"
                    style={{ 
                        left: `${hoveredDoc.x}px`, 
                        top: `${hoveredDoc.y}px`,
                        transform: 'translate(-50%, calc(-100% - 12px))'
                    }}
                    onMouseEnter={() => {
                        if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
                    }}
                    onMouseLeave={() => {
                        hoverTimeoutRef.current = setTimeout(() => {
                            setHoveredDoc(null);
                        }, 1000);
                    }}
                >
                    <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 p-4 min-w-[240px] overflow-hidden relative pointer-events-auto">
                        <div className={`absolute top-0 left-0 w-1.5 h-full bg-${hoveredDoc.cat.color}-500`} />
                        <p className={`text-[11px] font-black uppercase tracking-widest text-${hoveredDoc.cat.color}-500 mb-3 px-1 flex items-center gap-2`}>
                            {hoveredDoc.cat.icon}
                            {hoveredDoc.cat.label}
                        </p>
                        <div className="space-y-2 font-bold max-h-[200px] overflow-y-auto custom-scrollbar">
                            {hoveredDoc.docs.map(doc => (
                                <div 
                                    key={doc.id}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (doc.is_trash) {
                                            alert("File ini berada di tempat sampah dan tidak dapat dibuka.");
                                            return;
                                        }
                                        window.open(doc.path, '_blank');
                                    }}
                                    className={`flex items-center gap-3 p-2 rounded-xl transition-colors cursor-pointer group/file border border-transparent 
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
                                </div>
                            ))}
                        </div>
                        <div className="mt-3 pt-3 border-t border-slate-50 flex items-center justify-between">
                            <span className="text-[9px] font-bold text-slate-400 px-1 italic">Ditemukan {hoveredDoc.docs.length} berkas</span>
                            <div className="flex items-center gap-1 text-ppm-blue animate-pulse">
                                <Eye size={10} />
                                <span className="text-[9px] font-black uppercase tracking-tighter">Pratinjau</span>
                            </div>
                        </div>
                    </div>
                    {/* Arrow */}
                    <div className="w-4 h-4 bg-white border-b border-r border-slate-100 rotate-45 mx-auto -mt-2 shadow-sm" />
                </div>
            )}
            {/* Document Delete Confirmation Modal */}
            {confirmDeleteDoc && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
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
        </div>
    );
}

