import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
    X, Calendar, Tag, FileText, AlignLeft, Building2, Users, Upload, Loader2, CheckCircle2, 
    AlertCircle, Info, Paperclip, Image as ImageIcon, FileCheck, FolderOpen, Search, Check, Plus,
    Trash2, Edit2, Archive
} from 'lucide-react';
import { api } from '../../services/api';
import { SearchableSelect } from '../common/SearchableSelect';
import { SearchableSelectV2 } from '../common/SearchableSelectV2';
import { CollapsibleHierarchicalSelect } from '../common/CollapsibleHierarchicalSelect';
import { DocumentViewerModal } from './DocumentViewerModal';
import { SuratRegistrationModal } from './SuratRegistrationModal';

interface ActivityDoc {
    id: number;
    nama_file: string;
    path: string;
    tipe_dokumen: string;
    dokumen_id: number | null;
    is_trash?: number;
}

interface Activity {
    id: number;
    tanggal: string;
    tanggal_akhir: string | null;
    nama_kegiatan: string;
    tematik_ids: string | null;
    jenis_kegiatan_id: number | null;
    bidang_ids: string | null;
    bidang_id: number | null;
    instansi_penyelenggara: string | null;
    petugas_ids: string | null;
    kelengkapan: string | null;
    keterangan: string | null;
    sesi: string | null;
    dokumen: ActivityDoc[];
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
    jenis_dokumen_id?: number;
}

interface ActivityFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (message: string) => void;
    editingActivity: Activity | null;
    user: any;
    masterData: {
        jenisKegiatan: MasterData[];
        bidangList: BidangData[];
        tematikList: MasterData[];
        pegawaiList: PegawaiData[];
        masterInstansiDaerahList: InstansiDaerah[];
        masterDokumenList: MasterDokumen[];
    };
    // Optional: context where it's opened from
    mode?: 'management' | 'logbook';
    onDelete?: (id: number) => void;
}

export const ActivityFormModal: React.FC<ActivityFormModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
    editingActivity,
    user,
    masterData,
    mode = 'management',
    onDelete
}) => {
    const { jenisKegiatan, bidangList, tematikList, pegawaiList, masterInstansiDaerahList, masterDokumenList } = masterData;

    // Helper for local date
    const getTodayLocalDate = () => {
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const toLocalDateISO = (dateStr: string) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
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
            laporan: '',
        } as { [key: string]: string }
    });

    const [saving, setSaving] = useState(false);
    const [showAllPegawai, setShowAllPegawai] = useState(false);
    const [filterInstansiPetugas, setFilterInstansiPetugas] = useState<string>('');
    const [files, setFiles] = useState<{ [key: string]: File[] }>({
        surat_undangan_masuk: [],
        surat_undangan_keluar: [],
        bahan_desk: [],
        paparan: [],
        notulensi: [],
        laporan: [],
        surat_manual: []
    });

    const [removedDocIds, setRemovedDocIds] = useState<number[]>([]);
    const [docsToTrash, setDocsToTrash] = useState<number[]>([]);
    const [docsToUnlink, setDocsToUnlink] = useState<number[]>([]);
    
    // Library Picker State
    const [libraryDocs, setLibraryDocs] = useState<any[]>([]);
    const [selectedLibraryDocs, setSelectedLibraryDocs] = useState<{ [key: string]: any[] }>({
        surat_undangan_masuk: [],
        surat_undangan_keluar: [],
        bahan_desk: [],
        paparan: [],
        notulensi: [],
        laporan: [],
        surat_manual: []
    });
    const [isLibraryPickerOpen, setIsLibraryPickerOpen] = useState(false);
    const [pickingCategory, setPickingCategory] = useState<string | null>(null);
    const [librarySearch, setLibrarySearch] = useState('');
    const [officerAvailability, setOfficerAvailability] = useState<Record<number, any[]>>({});
    const [loadingAvailability, setLoadingAvailability] = useState(false);
    const [viewedDoc, setViewedDoc] = useState<{ path?: string; name: string; file?: File } | null>(null);
    const [confirmDeleteDoc, setConfirmDeleteDoc] = useState<{ doc: any, fieldId: string } | null>(null);
    const [isSuratModalOpen, setIsSuratModalOpen] = useState(false);
    const [suratModalType, setSuratModalType] = useState<'masuk' | 'keluar'>('masuk');

    // Permission logic
    const isUserAdmin = user?.tipe_user_id === 1;
    const isCurrentUserTagged = useMemo(() => {
        if (!editingActivity || !user) return false;
        const petugasIds = editingActivity.petugas_ids?.split(',').map(id => id.trim()) || [];
        // Typically user.pegawai_id or user.id matches petugas_ids
        return petugasIds.includes(String(user.pegawai_id)) || petugasIds.includes(String(user.id));
    }, [editingActivity, user]);

    // Restricted mode: Not an admin AND (Explicit logbook mode OR tagged user)
    const isRestrictedMode = !isUserAdmin && (mode === 'logbook' || isCurrentUserTagged);

    const fileRefs = {
        surat_undangan_masuk: useRef<HTMLInputElement>(null),
        surat_undangan_keluar: useRef<HTMLInputElement>(null),
        bahan_desk: useRef<HTMLInputElement>(null),
        paparan: useRef<HTMLInputElement>(null),
        notulensi: useRef<HTMLInputElement>(null),
        laporan: useRef<HTMLInputElement>(null)
    };

    // Reset Form when editingActivity changes or modal opens
    useEffect(() => {
        if (isOpen) {
            if (editingActivity) {
                const instansiExists = masterInstansiDaerahList.some(i => i.instansi === editingActivity.instansi_penyelenggara);
                setFormData({
                    tanggal: toLocalDateISO(editingActivity.tanggal),
                    tanggal_akhir: toLocalDateISO(editingActivity.tanggal_akhir || editingActivity.tanggal),
                    nama_kegiatan: editingActivity.nama_kegiatan,
                    jenis_kegiatan_id: String(editingActivity.jenis_kegiatan_id || ''),
                    bidang_id: String(editingActivity.bidang_id || ''),
                    instansi_penyelenggara: (editingActivity.instansi_penyelenggara && instansiExists) ? editingActivity.instansi_penyelenggara : (editingActivity.instansi_penyelenggara ? 'Lainnya' : ''),
                    manual_instansi: instansiExists ? '' : editingActivity.instansi_penyelenggara || '',
                    kelengkapan: editingActivity.kelengkapan || '',
                    keterangan: editingActivity.keterangan || '',
                    tematik_ids: editingActivity.tematik_ids ? editingActivity.tematik_ids.split(',').map(Number) : [],
                    petugas_ids: editingActivity.petugas_ids ? editingActivity.petugas_ids.split(',').map(Number) : [],
                    bidang_ids: editingActivity.bidang_ids || '',
                    sesi: editingActivity.sesi || '',
                    jenis_dokumen_ids: {
                        surat_undangan_masuk: editingActivity.dokumen.find(d => d.tipe_dokumen === 'surat_undangan_masuk')?.dokumen_id ? String(editingActivity.dokumen.find(d => d.tipe_dokumen === 'surat_undangan_masuk')?.dokumen_id) : '',
                        surat_undangan_keluar: editingActivity.dokumen.find(d => d.tipe_dokumen === 'surat_undangan_keluar')?.dokumen_id ? String(editingActivity.dokumen.find(d => d.tipe_dokumen === 'surat_undangan_keluar')?.dokumen_id) : '',
                        notulensi: editingActivity.dokumen.find(d => d.tipe_dokumen === 'notulensi')?.dokumen_id ? String(editingActivity.dokumen.find(d => d.tipe_dokumen === 'notulensi')?.dokumen_id) : '',
                        paparan: editingActivity.dokumen.find(d => d.tipe_dokumen === 'paparan')?.dokumen_id ? String(editingActivity.dokumen.find(d => d.tipe_dokumen === 'paparan')?.dokumen_id) : '',
                        bahan_desk: editingActivity.dokumen.find(d => d.tipe_dokumen === 'bahan_desk')?.dokumen_id ? String(editingActivity.dokumen.find(d => d.tipe_dokumen === 'bahan_desk')?.dokumen_id) : '',
                        laporan: editingActivity.dokumen.find(d => d.tipe_dokumen === 'laporan')?.dokumen_id ? String(editingActivity.dokumen.find(d => d.tipe_dokumen === 'laporan')?.dokumen_id) : '',
                    }
                });
            } else {
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
                        laporan: '',
                    }
                });
            }
            // Clear file and document states
            setFiles({
                surat_undangan_masuk: [],
                surat_undangan_keluar: [],
                bahan_desk: [],
                paparan: [],
                notulensi: [],
                laporan: [],
                surat_manual: []
            });
            setSelectedLibraryDocs({
                surat_undangan_masuk: [],
                surat_undangan_keluar: [],
                bahan_desk: [],
                paparan: [],
                notulensi: [],
                laporan: [],
                surat_manual: []
            });
            setRemovedDocIds([]);
            setDocsToTrash([]);
            setDocsToUnlink([]);
        }
    }, [isOpen, editingActivity]);

    const handleSuratRegistrationSuccess = (res: any) => {
        if (res.success && res.data) {
            const newSurat = res.data;
            const category = newSurat.tipe_surat === 'masuk' ? 'surat_undangan_masuk' : 'surat_undangan_keluar';
            
            // Add the created document to the current activity's selection
            setSelectedLibraryDocs(prev => ({
                ...prev,
                [category]: [...prev[category], {
                    id: newSurat.dokumen_id || newSurat.id, // We need the document ID for linking
                    nama_file: newSurat.nama_file || newSurat.nomor_surat,
                    path: newSurat.file_path,
                    jenis_dokumen_nama: newSurat.jenis_surat_nama
                }]
            }));
            
            setIsSuratModalOpen(false);
        }
    };

    // Fetch availability
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
        if (isOpen && formData.tanggal && formData.sesi) {
            fetchOfficerAvailability(formData.tanggal, formData.sesi, editingActivity?.id);
        } else {
            setOfficerAvailability({});
        }
    }, [formData.tanggal, formData.sesi, isOpen]);

    // Load library docs once when picker opens
    useEffect(() => {
        if (isLibraryPickerOpen) {
            api.dokumen.getAll().then(res => {
                if (res.success) setLibraryDocs(res.data);
            });
        }
    }, [isLibraryPickerOpen]);

    // Computed Options
    const hierarchicalJenisKegiatan = useMemo(() => {
        return jenisKegiatan.filter(j => 
            !['cuti', 'sakit'].includes(j.nama.toLowerCase())
        );
    }, [jenisKegiatan]);

    const agencyOptions = useMemo(() => {
        const options = masterInstansiDaerahList.map(i => ({ id: i.instansi, label: i.instansi }));
        options.push({ id: 'Lainnya', label: 'Lainnya (Ketik Manual)...' });
        return options;
    }, [masterInstansiDaerahList]);

    const agencyIdOptions = useMemo(() => {
        return masterInstansiDaerahList.map(i => ({ id: String(i.id), label: i.instansi }));
    }, [masterInstansiDaerahList]);

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

        const userBidangId = Number(user?.bidang_id);
        if (!userBidangId) return pegawaiList;
        return pegawaiList.filter(p => Number(p.bidang_id) === userBidangId);
    }, [pegawaiList, showAllPegawai, user?.bidang_id, user?.tipe_user_id, filterInstansiPetugas]);

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

    // Handlers
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
        const selectedFiles = Array.from(e.target.files || []);
        
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
        const allowedExts = ['.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.pdf', '.jpg', '.jpeg', '.png', '.gif', '.webp'];

        const validFiles = selectedFiles.filter(file => {
            const fileExt = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
            if (allowedTypes.includes(file.type) || allowedExts.includes(fileExt)) {
                return true;
            }
            alert(`File "${file.name}" tidak diizinkan. Hanya file PDF, Gambar, dan Dokumen Office yang diperbolehkan.`);
            return false;
        });

        if (validFiles.length > 0) {
            setFiles(prev => ({ ...prev, [field]: [...prev[field], ...validFiles] }));

            // NEW LOGIC: Automatically set jenis_dokumen_id for this field if not already set
            if (!formData.jenis_dokumen_ids[field]) {
                const searchNames: { [key: string]: string } = {
                    'surat_undangan_masuk': 'Surat Undangan Masuk',
                    'surat_undangan_keluar': 'Surat Undangan Keluar',
                    'notulensi': 'Notulensi',
                    'paparan': 'Bahan Paparan',
                    'bahan_desk': 'Bahan Desk',
                    'laporan': 'Laporan'
                };
                
                const targetName = searchNames[field];
                if (targetName) {
                    const match = masterDokumenList.find(d => d.dokumen.toLowerCase().includes(targetName.toLowerCase()));
                    if (match) {
                        setFormData(prev => ({
                            ...prev,
                            jenis_dokumen_ids: {
                                ...prev.jenis_dokumen_ids,
                                [field]: String(match.id)
                            }
                        }));
                    }
                }
            }
        }
        if (e.target) e.target.value = '';
    };

    const removeFile = (field: string, index: number) => {
        setFiles(prev => ({ ...prev, [field]: prev[field].filter((_, i) => i !== index) }));
    };

    const toggleRemovedDoc = (id: number) => {
        setRemovedDocIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
        setDocsToTrash(prev => prev.filter(x => x !== id));
        setDocsToUnlink(prev => prev.filter(x => x !== id));
    };

    const handleRemoveExistingDoc = (doc: any, fieldId: string) => {
        // Find if it's from current library selection
        if (selectedLibraryDocs[fieldId].some(d => d.id === doc.id)) {
            setSelectedLibraryDocs(prev => ({
                ...prev,
                [fieldId]: prev[fieldId].filter(d => d.id !== doc.id)
            }));
            return;
        }

        // Trigger custom confirmation modal instead of window.confirm
        setConfirmDeleteDoc({ doc, fieldId });
    };

    const processDocRemoval = (action: 'trash' | 'unlink') => {
        if (!confirmDeleteDoc) return;
        const { doc } = confirmDeleteDoc;

        // Backend expects:
        // - Trash: ID from dokumen_upload (doc.dokumen_id)
        // - Unlink: ID from kegiatan_manajemen_dokumen (doc.id)
        const idToProcess = action === 'trash' ? (doc.dokumen_id || doc.id) : doc.id;

        if (action === 'trash') {
            setDocsToTrash(prev => [...new Set([...prev, idToProcess])]);
            setDocsToUnlink(prev => prev.filter(x => x !== idToProcess));
        } else {
            setDocsToUnlink(prev => [...new Set([...prev, idToProcess])]);
            setDocsToTrash(prev => prev.filter(x => x !== idToProcess));
        }
        setRemovedDocIds(prev => [...new Set([...prev, doc.id])]);
        setConfirmDeleteDoc(null);
    };

    // Use the derived isRestrictedMode instead of just mode check
    // In logbook/restricted mode, only tematik and documents can be updated
    const isLogbookMode = isRestrictedMode;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // In logbook mode, only submit tematik_ids change
        if (isLogbookMode && editingActivity) {
            setSaving(true);
            try {
                const submitData = new FormData();
                // Use formData values which are already formatted (dates as YYYY-MM-DD, etc.)
                submitData.append('tanggal', formData.tanggal);
                submitData.append('tanggal_akhir', formData.tanggal_akhir || formData.tanggal);
                submitData.append('nama_kegiatan', formData.nama_kegiatan);
                submitData.append('jenis_kegiatan_id', String(formData.jenis_kegiatan_id));
                submitData.append('bidang_id', String(formData.bidang_id));
                submitData.append('instansi_penyelenggara', editingActivity.instansi_penyelenggara || '');
                submitData.append('kelengkapan', formData.kelengkapan || '');
                submitData.append('keterangan', formData.keterangan || '');
                submitData.append('tematik_ids', formData.tematik_ids.join(','));
                submitData.append('petugas_ids', formData.petugas_ids.join(','));
                submitData.append('sesi', formData.sesi);
                
                // Allow document updates even in logbook mode
                // Backend expects snake_case and comma-joined strings
                submitData.append('docs_to_trash', docsToTrash.join(','));
                submitData.append('docs_to_unlink', docsToUnlink.join(','));
                
                const libraryLinks: { [key: string]: number[] } = {};
                Object.keys(selectedLibraryDocs).forEach(cat => {
                    if (selectedLibraryDocs[cat].length > 0) {
                        libraryLinks[cat] = selectedLibraryDocs[cat].map(d => d.id);
                    }
                });
                submitData.append('libraryLinks', JSON.stringify(libraryLinks));
                submitData.append('jenis_dokumen_ids', JSON.stringify(formData.jenis_dokumen_ids));

                // Add files
                Object.keys(files).forEach(cat => {
                    files[cat].forEach(file => {
                        submitData.append(cat, file);
                    });
                });

                const res = await api.kegiatanManajemen.update(editingActivity.id, submitData);
                if (res.success) {
                    onSuccess('Data kegiatan berhasil diperbarui');
                    onClose();
                } else {
                    alert(res.message || 'Gagal menyimpan data kegiatan');
                }
            } catch (err) {
                console.error('Submit error:', err);
                alert('Terjadi kesalahan sistem');
            } finally {
                setSaving(false);
            }
            return;
        }
        
        // --- Normal (management) mode below ---
        
        // Basic Validation
        if (!formData.nama_kegiatan.trim()) return alert('Nama kegiatan wajib diisi');
        if (!formData.jenis_kegiatan_id) return alert('Jenis kegiatan wajib diisi');
        
        const selectedType = jenisKegiatan.find(j => String(j.id) === formData.jenis_kegiatan_id);
        const typeName = (selectedType?.nama || '').toLowerCase();
        const isRequiredMeeting = typeName.includes('rapat mamin') || typeName.includes('rapat luar bidang');
        
        if (isRequiredMeeting && !formData.sesi) return alert('Sesi wajib diisi untuk jenis kegiatan ini');

        // Check mandatory document types
        for (const field of ['bahan_desk', 'laporan']) {
            const hasFiles = 
                (editingActivity?.dokumen.filter(d => d.tipe_dokumen === field && !removedDocIds.includes(d.id)).length || 0) > 0 ||
                files[field].length > 0 ||
                selectedLibraryDocs[field].length > 0;

            if (hasFiles && !formData.jenis_dokumen_ids[field]) {
                const label = field === 'bahan_desk' ? 'Bahan Desk' : 'Laporan';
                return alert(`Silakan pilih klasifikasi jenis dokumen untuk lampiran ${label}`);
            }
        }

        setSaving(true);
        try {
            const submitData = new FormData();
            submitData.append('tanggal', formData.tanggal);
            submitData.append('tanggal_akhir', formData.tanggal_akhir);
            submitData.append('nama_kegiatan', formData.nama_kegiatan);
            submitData.append('jenis_kegiatan_id', formData.jenis_kegiatan_id);
            submitData.append('bidang_id', formData.bidang_id);
            submitData.append('instansi_penyelenggara', formData.instansi_penyelenggara === 'Lainnya' ? formData.manual_instansi : formData.instansi_penyelenggara);
            submitData.append('kelengkapan', formData.kelengkapan);
            submitData.append('keterangan', formData.keterangan);
            submitData.append('tematik_ids', formData.tematik_ids.join(','));
            submitData.append('petugas_ids', formData.petugas_ids.join(','));
            submitData.append('sesi', formData.sesi);
            submitData.append('docs_to_trash', docsToTrash.join(','));
            submitData.append('docs_to_unlink', docsToUnlink.join(','));
            
            // Add library links
            const libraryLinks: { [key: string]: number[] } = {};
            Object.keys(selectedLibraryDocs).forEach(cat => {
                if (selectedLibraryDocs[cat].length > 0) {
                    libraryLinks[cat] = selectedLibraryDocs[cat].map(d => d.id);
                }
            });
            submitData.append('libraryLinks', JSON.stringify(libraryLinks));

            // Add classification IDs
            submitData.append('jenis_dokumen_ids', JSON.stringify(formData.jenis_dokumen_ids));

            // Add files
            Object.keys(files).forEach(cat => {
                files[cat].forEach(file => {
                    submitData.append(cat, file);
                });
            });

            const res = editingActivity 
                ? await api.kegiatanManajemen.update(editingActivity.id, submitData)
                : await api.kegiatanManajemen.create(submitData);

            if (res.success) {
                onSuccess(editingActivity ? 'Kegiatan berhasil diperbarui' : 'Kegiatan berhasil ditambahkan');
                onClose();
            } else {
                alert(res.message || 'Gagal menyimpan kegiatan');
            }
        } catch (err) {
            console.error('Submit error:', err);
            alert('Terjadi kesalahan sistem');
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-5xl max-h-[90vh] rounded-3xl shadow-2xl flex flex-col animate-in zoom-in-95 duration-300 overflow-hidden">
                <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between shrink-0">
                    <div>
                        <h3 className="text-xl font-black text-slate-800 tracking-tight">
                            {isLogbookMode ? 'Edit Tagging Tematik' : (editingActivity ? 'Edit Kegiatan' : 'Tambah Kegiatan Baru')}
                        </h3>
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-0.5">
                            {isLogbookMode 
                                ? 'Hanya field Tagging Tematik dan Dokumen yang dapat diubah'
                                : 'Lengkapi informasi aktivitas di bawah ini'
                            }
                        </p>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    {/* Logbook mode notice banner */}
                    {isLogbookMode && (
                        <div className="mb-6 flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-2xl animate-in slide-in-from-top-2 duration-300">
                            <div className="p-1.5 bg-amber-400 text-white rounded-lg shrink-0 mt-0.5">
                                <Info size={14} />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-amber-800 uppercase tracking-widest">Akses Terbatas — Petugas</p>
                                <p className="text-[11px] font-medium text-amber-700 mt-0.5">Hanya field <span className="font-black">Tagging Tematik</span> dan <span className="font-black">Dokumen</span> yang dapat diedit. Field lainnya dikunci.</p>
                            </div>
                        </div>
                    )}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                        {/* Left Column: Basic Info */}
                        <div className="lg:col-span-7 space-y-8">
                            <div className={`grid grid-cols-12 gap-6 ${isLogbookMode ? 'opacity-50 pointer-events-none select-none' : ''}`}>
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
                                        disabled={isLogbookMode}
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
                                        disabled={isLogbookMode}
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
                                if (isLogbookMode) return null;

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

                            <div className={`space-y-2 ${isLogbookMode ? 'opacity-50 pointer-events-none select-none' : ''}`}>
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                                    <FileText size={12} className="text-ppm-blue" /> Nama Kegiatan
                                </label>
                                <textarea 
                                    required={!isLogbookMode}
                                    rows={3}
                                    className="input-modern w-full p-4 font-bold text-slate-700 min-h-[100px]"
                                    placeholder="Masukkan nama lengkap kegiatan..."
                                    value={formData.nama_kegiatan}
                                    onChange={(e) => setFormData(p => ({ ...p, nama_kegiatan: e.target.value }))}
                                    disabled={isLogbookMode}
                                />
                            </div>

                            <div className={`space-y-2 ${isLogbookMode ? 'opacity-50 pointer-events-none select-none' : ''}`}>
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                                    <AlignLeft size={12} className="text-ppm-blue" /> Keterangan
                                </label>
                                <textarea 
                                    rows={3}
                                    className="input-modern w-full p-4 font-bold text-slate-700 min-h-[100px]"
                                    placeholder="Masukkan keterangan tambahan jika ada..."
                                    value={formData.keterangan}
                                    onChange={(e) => setFormData(p => ({ ...p, keterangan: e.target.value }))}
                                    disabled={isLogbookMode}
                                />
                            </div>

                            <div className={`grid grid-cols-1 gap-6 ${isLogbookMode ? 'opacity-50 pointer-events-none select-none' : ''}`}>
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                                            <Building2 size={12} className="text-ppm-blue" /> Instansi Penyelenggara
                                        </label>
                                        {formData.instansi_penyelenggara && !isLogbookMode && (
                                            <button 
                                                type="button"
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
                                                disabled={isLogbookMode}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className={`space-y-2 ${isLogbookMode ? 'opacity-50 pointer-events-none select-none' : ''}`}>
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
                                            <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${showAllPegawai ? 'left-4' : 'left-0.5'}`} />
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
                                    <div className="w-full mt-2">
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
                                    <div className="w-full mt-2">
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

                        {/* Right Column: Document Uploads */}
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
                                                            .filter(d => !(d.dokumen || '').toLowerCase().startsWith('surat'))
                                                            .map(d => <option key={d.id} value={d.id}>{d.dokumen}</option>)}
                                                    </select>
                                                )}
                                            </div>
                                            <div className="p-2.5 bg-white rounded-2xl border border-slate-200 border-dashed space-y-3">
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    {editingActivity && editingActivity.dokumen
                                                        .filter(d => d.tipe_dokumen === field.id)
                                                        .map(d => (
                                                            <div key={d.id} className={`group relative px-2 py-1 rounded-lg text-[8px] font-black flex items-center gap-1.5 transition-all ${removedDocIds.includes(d.id) ? 'bg-rose-50 text-rose-400 opacity-50' : 'bg-slate-50 text-slate-600 border border-slate-100'}`}>
                                                                <button 
                                                                    type="button"
                                                                    className={`max-w-[70px] truncate ${!removedDocIds.includes(d.id) ? 'cursor-pointer hover:text-blue-600 hover:underline' : ''}`}
                                                                    onClick={() => {
                                                                        if (!removedDocIds.includes(d.id)) {
                                                                            setViewedDoc({ path: d.path, name: d.nama_file });
                                                                        }
                                                                    }}
                                                                >
                                                                    {d.nama_file}
                                                                </button>
                                                                <button 
                                                                    type="button"
                                                                    onClick={() => handleRemoveExistingDoc(d, field.id)}
                                                                    className={`${removedDocIds.includes(d.id) ? 'text-blue-500' : 'text-rose-400'} hover:scale-110`}
                                                                >
                                                                    {removedDocIds.includes(d.id) ? <Plus size={10} /> : <X size={10} />}
                                                                </button>
                                                            </div>
                                                        ))
                                                    }
                                                    {files[field.id].map((f, idx) => (
                                                        <div key={idx} className="px-2 py-1 bg-blue-50 text-blue-600 border border-blue-100 rounded-lg text-[8px] font-black flex items-center gap-1.5 animate-in zoom-in-95">
                                                            <button 
                                                                type="button"
                                                                className="max-w-[70px] truncate cursor-pointer hover:underline"
                                                                onClick={() => {
                                                                    setViewedDoc({ file: f, name: f.name });
                                                                }}
                                                            >
                                                                {f.name}
                                                            </button>
                                                            <X size={10} className="cursor-pointer hover:text-rose-500 transition-colors" onClick={() => removeFile(field.id, idx)} />
                                                        </div>
                                                    ))}
                                                    {selectedLibraryDocs[field.id].map((doc, idx) => (
                                                        <div key={doc.id} className="px-2 py-1 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-lg text-[8px] font-black flex items-center gap-1.5 animate-in zoom-in-95">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                                            <button 
                                                                type="button"
                                                                className="max-w-[70px] truncate cursor-pointer hover:underline"
                                                                onClick={() => setViewedDoc({ path: doc.path, name: doc.nama_file })}
                                                            >
                                                                {doc.nama_file}
                                                            </button>
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
                                                            className={`w-6 h-6 rounded-full bg-${field.color}-500 text-white flex items-center justify-center shadow-lg hover:scale-110 transition-all outline-none`}
                                                            onClick={() => {
                                                                if (field.id === 'surat_undangan_masuk' || field.id === 'surat_undangan_keluar') {
                                                                    setSuratModalType(field.id === 'surat_undangan_masuk' ? 'masuk' : 'keluar');
                                                                    setIsSuratModalOpen(true);
                                                                } else {
                                                                    (fileRefs as any)[field.id].current?.click();
                                                                }
                                                            }}
                                                            title={field.id.startsWith('surat_undangan') ? "Registrasi Surat Baru" : "Unggah File Baru"}
                                                        >
                                                            <Plus size={10} />
                                                        </button>
                                                        <button 
                                                            type="button" 
                                                            className={`w-6 h-6 rounded-full bg-slate-800 text-white flex items-center justify-center shadow-lg hover:scale-110 transition-all outline-none`}
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
                        {isLogbookMode 
                            ? '* HANYA FIELD TAGGING TEMATIK DAN DOKUMEN YANG DAPAT DIUBAH'
                            : '* SEMUA INPUT DATA HARUS SESUAI DENGAN ATURAN ADMINISTRASI'
                        }
                    </div>
                    <div className="flex items-center gap-3">
                        {editingActivity && user?.dbScope >= 2 && onDelete && (
                            <button 
                                type="button"
                                onClick={() => {
                                    const confirmMsg = mode === 'logbook' 
                                        ? 'Apakah anda akan menghapus kegiatan dari pegawai ini?' 
                                        : 'Apakah Anda yakin ingin memindahkan kegiatan ini ke tempat sampah?';
                                    if (window.confirm(confirmMsg)) {
                                        onDelete(editingActivity.id);
                                    }
                                }}
                                className="px-6 py-2.5 text-[10px] font-black text-rose-500 uppercase tracking-widest hover:bg-rose-50 rounded-2xl transition-all flex items-center gap-2 mr-2"
                            >
                                <Trash2 size={16} />
                                Hapus
                            </button>
                        )}
                        <button 
                            type="button"
                            onClick={onClose}
                            className="px-6 py-2.5 text-xs font-black text-slate-500 uppercase tracking-widest hover:text-slate-700 transition-colors"
                        >
                            Batal
                        </button>
                        <button 
                            onClick={handleSubmit}
                            disabled={saving}
                            className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center gap-2
                                ${isLogbookMode 
                                    ? 'bg-emerald-500 text-white shadow-emerald-100 hover:bg-emerald-600' 
                                    : 'bg-ppm-blue text-white shadow-blue-100'
                                }
                            `}
                        >
                            {saving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                            {saving ? 'Menyimpan...' : 'Simpan'}
                        </button>
                    </div>
                </div>

                {/* Library Picker Modal */}
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
                                    {libraryDocs.filter(doc => (doc.nama_file || '').toLowerCase().includes((librarySearch || '').toLowerCase())).map(doc => {
                                        const isSelected = pickingCategory && selectedLibraryDocs[pickingCategory].some(d => d.id === doc.id);
                                        return (
                                            <div 
                                                key={doc.id}
                                                className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between group ${isSelected ? 'bg-blue-50 border-blue-200 shadow-sm' : 'bg-slate-50 border-transparent hover:border-slate-200'}`}
                                                onClick={() => {
                                                    if (!pickingCategory) return;
                                                    const exists = selectedLibraryDocs[pickingCategory].some(d => d.id === doc.id);
                                                    if (!exists) {
                                                        const docTypeName = doc.jenis_dokumen_nama?.toLowerCase() || '';
                                                        let isMismatch = false;
                                                        if (pickingCategory === 'surat_undangan_masuk' && !(docTypeName || '').toLowerCase().includes('undangan masuk')) isMismatch = true;
                                                        else if (pickingCategory === 'surat_undangan_keluar' && !(docTypeName || '').toLowerCase().includes('undangan keluar')) isMismatch = true;
                                                        
                                                        if (isMismatch) {
                                                            alert(`Dokumen "${doc.nama_file}" tidak sesuai kategori.`);
                                                            return;
                                                        }
                                                    }
                                                    setSelectedLibraryDocs(prev => {
                                                        const current = prev[pickingCategory];
                                                        const alreadyExists = current.some(d => d.id === doc.id);
                                                        if (alreadyExists) return { ...prev, [pickingCategory]: current.filter(d => d.id !== doc.id) };
                                                        return { ...prev, [pickingCategory]: [...current, doc] };
                                                    });
                                                }}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={`p-2 rounded-xl ${isSelected ? 'bg-blue-600 text-white' : 'bg-white text-slate-400'}`}>
                                                        <FileText size={16} />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-xs font-bold truncate max-w-[280px]">{doc.nama_file}</p>
                                                        <p className="text-[9px] font-bold text-slate-400 uppercase">{doc.jenis_dokumen_nama}</p>
                                                    </div>
                                                </div>
                                                {isSelected && <Check size={16} className="text-blue-600" />}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
                                <button onClick={() => setIsLibraryPickerOpen(false)} className="px-6 py-2 bg-slate-800 text-white rounded-xl text-[10px] font-black uppercase">Selesai</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            {/* Document Viewer Modal */}
            <DocumentViewerModal 
                isOpen={!!viewedDoc}
                onClose={() => setViewedDoc(null)}
                fileUrl={viewedDoc?.path}
                fileName={viewedDoc?.name || ''}
                fileObject={viewedDoc?.file}
            />

            {/* Document Delete Confirmation Modal */}
            {confirmDeleteDoc && (
                <div className="fixed inset-0 z-[7000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
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
                                        Pilihan pertama akan memindahkan file ke tempat sampah sistem. Pilihan kedua hanya melepas kaitan file dari kegiatan ini.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Reusable Surat Registration Modal */}
            <SuratRegistrationModal 
                isOpen={isSuratModalOpen}
                onClose={() => setIsSuratModalOpen(false)}
                onSuccess={handleSuratRegistrationSuccess}
                defaultType={suratModalType}
                defaultKegiatanId={editingActivity?.id}
                user={user}
            />
        </div>
    );
};
