import React, { useState, useEffect } from 'react';
import { 
    Plus, Edit2, Trash2, Save, X, Eye, 
    TrendingUp, Award, Layers, Target, Compass, 
    AlertCircle, FileText, Check, HelpCircle,
    Clock, FolderOpen, Search, Upload, Calendar
} from 'lucide-react';
import { api, rawApiUrl } from '@/src/services/api';
import { useAuth } from '@/src/contexts/AuthContext';

interface Visi {
    id: number;
    tahun_mulai: number;
    tahun_selesai: number;
    visi: string;
    file_path: string | null;
    file_name: string | null;
    keterangan: string | null;
}

interface Misi {
    id: number;
    visi_id: number;
    kode_misi: string;
    misi: string;
    visi_nama?: string;
}

interface Sasaran {
    id: number;
    misi_id: number;
    kode_sasaran: string;
    sasaran_pokok: string;
    misi_nama?: string;
    kode_misi?: string;
}

interface ArahKebijakan {
    id: number;
    misi_id?: number | null;
    sasaran_pokok_id?: number | null;
    kode_arah_kebijakan: string;
    arah_kebijakan: string;
    tahapan?: string;
    misi_nama?: string;
    kode_misi?: string;
    sasaran_nama?: string;
    kode_sasaran?: string;
}

const TAHAPAN_OPTIONS = [
    'Tanpa Tahap / Semua Tahap',
    'Tahap I (2025-2029)',
    'Tahap II (2030-2034)',
    'Tahap III (2035-2039)',
    'Tahap IV (2040-2045)'
];

interface Indikator {
    id: number;
    sasaran_pokok_id: number;
    nama_indikator: string;
    satuan_id: number | null;
    kondisi_awal_nilai: number | null;
    kondisi_awal_tahun: number | null;
    target_tahap_1: number | null;
    target_tahap_2: number | null;
    target_tahap_3: number | null;
    target_tahap_4: number | null;
    keterangan: string | null;
    sasaran_nama?: string;
    kode_sasaran?: string;
    satuan_nama?: string;
}

interface Satuan {
    id: number;
    satuan: string;
}

const RpjpdInputPage = () => {
    const { user } = useAuth();
    
    const checkPerdaAccess = () => {
        if (!user) return false;
        if (user.tipe_user_id === 1) return true; // Super Admin
        
        const instansiNama = (user.instansi_nama || '').toLowerCase();
        const instansiSingkatan = (user.instansi_singkatan || '').toLowerCase();
        const isBapperidaUser = instansiNama.includes('perencanaan') || 
                                instansiNama.includes('bapperida') || 
                                instansiNama.includes('bappeda') ||
                                instansiSingkatan.includes('bapperida') ||
                                instansiSingkatan.includes('bappeda');
                                
        if (!isBapperidaUser) return false;

        const isBapperidaAdmin = user.tipe_user_id === 2;
        const jabatanNama = (user.jabatan_nama || '').toLowerCase();
        const bidangNama = (user.bidang_nama || '').toLowerCase();
        
        const isKabidRendalev = (jabatanNama.includes('kabid') || jabatanNama.includes('kepala bidang')) && 
                                (bidangNama.includes('rendalev') || bidangNama.includes('pengendalian') || bidangNama.includes('evaluasi'));
                                
        const isKatimDatinfo = (jabatanNama.includes('katim') || jabatanNama.includes('ketua tim') || jabatanNama.includes('sub koordinator') || jabatanNama.includes('subkoordinator')) && 
                               (bidangNama.includes('datinfo') || bidangNama.includes('data dan informasi') || bidangNama.includes('data & informasi') || jabatanNama.includes('datinfo') || jabatanNama.includes('data dan informasi'));

        return isBapperidaAdmin || isKabidRendalev || isKatimDatinfo;
    };
    const canEdit = checkPerdaAccess();
    const canUploadPerda = checkPerdaAccess();

    const getFileUrl = (path: string | null) => {
        if (!path) return '';
        const base = rawApiUrl.replace(/\/api$/, '');
        return `${base}${path}`;
    };

    // Active Tab
    const [activeTab, setActiveTab] = useState<'visi' | 'misi' | 'sasaran' | 'arah' | 'indikator'>('visi');
    
    // Master data states
    const [visiList, setVisiList] = useState<Visi[]>([]);
    const [misiList, setMisiList] = useState<Misi[]>([]);
    const [sasaranList, setSasaranList] = useState<Sasaran[]>([]);
    const [arahList, setArahList] = useState<ArahKebijakan[]>([]);
    const [indikatorList, setIndikatorList] = useState<Indikator[]>([]);
    const [satuanList, setSatuanList] = useState<Satuan[]>([]);
    
    const [loading, setLoading] = useState(false);
    
    // Library picker states
    const [isLibraryPickerOpen, setIsLibraryPickerOpen] = useState(false);
    const [libraryDocs, setLibraryDocs] = useState<any[]>([]);
    const [librarySearch, setLibrarySearch] = useState('');
    const [selectedVisiIdForLibrary, setSelectedVisiIdForLibrary] = useState<number | null>(null);

    // History modal states
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [historyDocs, setHistoryDocs] = useState<any[]>([]);
    const [selectedVisiIdForHistory, setSelectedVisiIdForHistory] = useState<number | null>(null);
    const [loadingHistory, setLoadingHistory] = useState(false);

    // Library upload modal states
    const [isLibraryUploadModalOpen, setIsLibraryUploadModalOpen] = useState(false);
    const [jenisDokumenList, setJenisDokumenList] = useState<any[]>([]);
    const [selectedVisiIdForUpload, setSelectedVisiIdForUpload] = useState<number | null>(null);
    const [uploadDocFile, setUploadDocFile] = useState<File | null>(null);
    const [uploadDocName, setUploadDocName] = useState('');
    const [uploadDocJenisId, setUploadDocJenisId] = useState('');
    const [uploadDocIsPrivate, setUploadDocIsPrivate] = useState(false);
    const [uploadingToLibrary, setUploadingToLibrary] = useState(false);

    const [errorMsg, setErrorMsg] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    // Dynamic selected IDs for forms
    const [selectedVisiId, setSelectedVisiId] = useState<number | ''>('');

    // Modal/Editor states
    const [editorOpen, setEditorOpen] = useState(false);
    const [editType, setEditType] = useState<'visi' | 'misi' | 'sasaran' | 'arah' | 'indikator' | null>(null);
    const [editId, setEditId] = useState<number | null>(null);

    // Form inputs state
    const [formVisi, setFormVisi] = useState({ tahun_mulai: 2025, tahun_selesai: 2045, visi: '', keterangan: '' });
    const [formMisi, setFormMisi] = useState({ visi_id: '', kode_misi: '', misi: '' });
    const [formSasaran, setFormSasaran] = useState({ misi_id: '', kode_sasaran: '', sasaran_pokok: '' });
    const [formArah, setFormArah] = useState({ misi_id: '', sasaran_pokok_id: '', kode_arah_kebijakan: '', arah_kebijakan: '', tahapan: 'Semua Tahap' });
    const [formIndikator, setFormIndikator] = useState({
        sasaran_pokok_id: '',
        nama_indikator: '',
        satuan_id: '',
        kondisi_awal_nilai: '',
        kondisi_awal_tahun: new Date().getFullYear() - 1,
        target_tahap_1: '',
        target_tahap_2: '',
        target_tahap_3: '',
        target_tahap_4: '',
        keterangan: ''
    });

    // Inline Edit & Add State (Kelola Menu Style)
    const [inlineEditingType, setInlineEditingType] = useState<'misi' | 'sasaran' | 'arah' | 'indikator' | null>(null);
    const [inlineEditingId, setInlineEditingId] = useState<number | null>(null);
    const [inlineForm, setInlineForm] = useState<any>({});

    const [inlineAddingType, setInlineAddingType] = useState<'misi' | 'sasaran' | 'arah' | 'indikator' | null>(null);
    const [inlineAddForm, setInlineAddForm] = useState<any>({});

    // Custom Dynamic Tahapan Options
    const DEFAULT_TAHAPAN_OPTIONS = [
        'Tanpa Tahap / Semua Tahap',
        'Tahap I (2025-2029)',
        'Tahap II (2030-2034)',
        'Tahap III (2035-2039)',
        'Tahap IV (2040-2045)'
    ];

    const [tahapanOptions, setTahapanOptions] = useState<string[]>(() => {
        const saved = localStorage.getItem('rpjpd_tahapan_options');
        if (saved) {
            try { return JSON.parse(saved); } catch(e) {}
        }
        return DEFAULT_TAHAPAN_OPTIONS;
    });

    const [modalTambahTahapOpen, setModalTambahTahapOpen] = useState(false);
    const [newTahapName, setNewTahapName] = useState('');
    const [newTahapTahunMulai, setNewTahapTahunMulai] = useState(2025);
    const [newTahapTahunSelesai, setNewTahapTahunSelesai] = useState(2029);

    const handleCreateNewTahap = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTahapName.trim()) {
            showError('Nama Tahap wajib diisi!');
            return;
        }
        const createdOption = `${newTahapName.trim()} (${newTahapTahunMulai}-${newTahapTahunSelesai})`;
        if (!tahapanOptions.includes(createdOption)) {
            const updated = [...tahapanOptions, createdOption];
            setTahapanOptions(updated);
            localStorage.setItem('rpjpd_tahapan_options', JSON.stringify(updated));
        }

        // Set current active form tahapan value
        if (editorOpen && editType === 'arah') {
            setFormArah({ ...formArah, tahapan: createdOption });
        } else if (inlineAddingType === 'arah') {
            setInlineAddForm({ ...inlineAddForm, tahapan: createdOption });
        } else if (inlineEditingType === 'arah') {
            setInlineForm({ ...inlineForm, tahapan: createdOption });
        }

        setModalTambahTahapOpen(false);
        setNewTahapName('');
        showSuccess(`Tahapan "${createdOption}" berhasil ditambahkan ke dropdown!`);
    };

    // Load all data
    const loadAllData = async () => {
        setLoading(true);
        setErrorMsg('');
        try {
            const [vRes, mRes, sRes, aRes, iRes, satRes] = await Promise.all([
                api.rpjpd.getVisi(),
                api.rpjpd.getMisi(),
                api.rpjpd.getSasaran(),
                api.rpjpd.getArahKebijakan(),
                api.rpjpd.getIndikator(),
                api.satuan.getAll()
            ]);

            if (vRes.success) setVisiList(vRes.data);
            if (mRes.success) setMisiList(mRes.data);
            if (sRes.success) setSasaranList(sRes.data);
            if (aRes.success) setArahList(aRes.data);
            if (iRes.success) setIndikatorList(iRes.data);
            
            // Satuan endpoint might return data directly or wrapped
            if (satRes.success) {
                setSatuanList(satRes.data);
            } else if (Array.isArray(satRes)) {
                setSatuanList(satRes);
            }

            // Set default selected Visi if available
            if (vRes.success && vRes.data.length > 0 && !selectedVisiId) {
                setSelectedVisiId(vRes.data[0].id);
            }
        } catch (error: any) {
            console.error(error);
            setErrorMsg('Gagal memuat data dari server.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadAllData();
    }, []);

    // Flash Messages Helper
    const showSuccess = (msg: string) => {
        setSuccessMsg(msg);
        setTimeout(() => setSuccessMsg(''), 4000);
    };

    const showError = (msg: string) => {
        setErrorMsg(msg);
        setTimeout(() => setErrorMsg(''), 4000);
    };

    // Open Add editors
    const openAddEditor = (type: typeof activeTab) => {
        setEditId(null);
        setEditType(type);
        
        // Reset states with smart defaults
        if (type === 'visi') {
            setFormVisi({ tahun_mulai: 2025, tahun_selesai: 2045, visi: '', keterangan: '' });
        } else if (type === 'misi') {
            const activeVisi = selectedVisiId || (visiList[0]?.id || '');
            setFormMisi({ visi_id: String(activeVisi), kode_misi: String(misiList.length + 1), misi: '' });
        } else if (type === 'sasaran') {
            const defaultMisi = misiList[0]?.id || '';
            setFormSasaran({ misi_id: String(defaultMisi), kode_sasaran: '', sasaran_pokok: '' });
        } else if (type === 'arah') {
            const defaultMisi = misiList[0]?.id || '';
            setFormArah({ misi_id: String(defaultMisi), sasaran_pokok_id: '', kode_arah_kebijakan: String(arahList.length + 1), arah_kebijakan: '', tahapan: 'Tanpa Tahap / Semua Tahap' });
        } else if (type === 'indikator') {
            const defaultSasaran = sasaranList[0]?.id || '';
            setFormIndikator({
                sasaran_pokok_id: String(defaultSasaran),
                nama_indikator: '',
                satuan_id: '',
                kondisi_awal_nilai: '',
                kondisi_awal_tahun: 2024,
                target_tahap_1: '',
                target_tahap_2: '',
                target_tahap_3: '',
                target_tahap_4: '',
                keterangan: ''
            });
        }
        setEditorOpen(true);
    };

    // Open Edit editors
    const openEditEditor = (type: typeof activeTab, data: any) => {
        setEditId(data.id);
        setEditType(type);

        if (type === 'visi') {
            setFormVisi({
                tahun_mulai: data.tahun_mulai,
                tahun_selesai: data.tahun_selesai,
                visi: data.visi,
                keterangan: data.keterangan || ''
            });
        } else if (type === 'misi') {
            setFormMisi({
                visi_id: String(data.visi_id),
                kode_misi: data.kode_misi,
                misi: data.misi
            });
        } else if (type === 'sasaran') {
            setFormSasaran({
                misi_id: String(data.misi_id),
                kode_sasaran: data.kode_sasaran,
                sasaran_pokok: data.sasaran_pokok
            });
        } else if (type === 'arah') {
            setFormArah({
                misi_id: String(data.misi_id || ''),
                sasaran_pokok_id: String(data.sasaran_pokok_id || ''),
                kode_arah_kebijakan: data.kode_arah_kebijakan,
                arah_kebijakan: data.arah_kebijakan,
                tahapan: data.tahapan || 'Semua Tahap'
            });
        } else if (type === 'indikator') {
            setFormIndikator({
                sasaran_pokok_id: String(data.sasaran_pokok_id),
                nama_indikator: data.nama_indikator,
                satuan_id: data.satuan_id ? String(data.satuan_id) : '',
                kondisi_awal_nilai: data.kondisi_awal_nilai !== null ? String(data.kondisi_awal_nilai) : '',
                kondisi_awal_tahun: data.kondisi_awal_tahun || 2024,
                target_tahap_1: data.target_tahap_1 !== null ? String(data.target_tahap_1) : '',
                target_tahap_2: data.target_tahap_2 !== null ? String(data.target_tahap_2) : '',
                target_tahap_3: data.target_tahap_3 !== null ? String(data.target_tahap_3) : '',
                target_tahap_4: data.target_tahap_4 !== null ? String(data.target_tahap_4) : '',
                keterangan: data.keterangan || ''
            });
        }
        setEditorOpen(true);
    };

    // Handle Delete
    const handleDelete = async (type: typeof activeTab, id: number) => {
        if (!window.confirm('Apakah Anda yakin ingin menghapus data ini? Penghapusan akan menghapus semua sub-entitas yang terhubung di bawahnya.')) return;
        
        setLoading(true);
        try {
            let res;
            if (type === 'misi') res = await api.rpjpd.deleteMisi(id);
            else if (type === 'sasaran') res = await api.rpjpd.deleteSasaran(id);
            else if (type === 'arah') res = await api.rpjpd.deleteArahKebijakan(id);
            else if (type === 'indikator') res = await api.rpjpd.deleteIndikator(id);

            if (res && res.success) {
                showSuccess('Data berhasil dihapus');
                loadAllData();
            } else {
                showError(res?.message || 'Gagal menghapus data');
            }
        } catch (err: any) {
            showError(err.message || 'Terjadi kesalahan sistem');
        } finally {
            setLoading(false);
        }
    };

    // Handle Submit Form
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setErrorMsg('');

        try {
            let res;
            const payload: any = { id: editId };

            if (editType === 'visi') {
                Object.assign(payload, formVisi);
                res = await api.rpjpd.saveVisi(payload);
            } else if (editType === 'misi') {
                Object.assign(payload, formMisi);
                res = await api.rpjpd.saveMisi(payload);
            } else if (editType === 'sasaran') {
                Object.assign(payload, formSasaran);
                res = await api.rpjpd.saveSasaran(payload);
            } else if (editType === 'arah') {
                Object.assign(payload, formArah);
                res = await api.rpjpd.saveArahKebijakan(payload);
            } else if (editType === 'indikator') {
                const numVal = (val: string) => val === '' ? null : Number(val);
                Object.assign(payload, {
                    ...formIndikator,
                    satuan_id: formIndikator.satuan_id === '' ? null : Number(formIndikator.satuan_id),
                    kondisi_awal_nilai: numVal(formIndikator.kondisi_awal_nilai),
                    target_tahap_1: numVal(formIndikator.target_tahap_1),
                    target_tahap_2: numVal(formIndikator.target_tahap_2),
                    target_tahap_3: numVal(formIndikator.target_tahap_3),
                    target_tahap_4: numVal(formIndikator.target_tahap_4),
                });
                res = await api.rpjpd.saveIndikator(payload);
            }

            if (res && res.success) {
                showSuccess(res.message || 'Data berhasil disimpan!');
                setEditorOpen(false);
                loadAllData();
            } else {
                showError(res?.message || 'Gagal menyimpan data');
            }
        } catch (err: any) {
            showError(err.message || 'Terjadi kesalahan sistem');
        } finally {
            setLoading(false);
        }
    };

    // ========================================================
    // INLINE EDIT & ADD HANDLERS (Kelola Menu Mechanism)
    // ========================================================
    const startInlineEdit = (type: 'misi' | 'sasaran' | 'arah' | 'indikator', item: any) => {
        setInlineAddingType(null);
        setInlineEditingType(type);
        setInlineEditingId(item.id);
        if (type === 'misi') {
            setInlineForm({ id: item.id, visi_id: String(item.visi_id), kode_misi: item.kode_misi, misi: item.misi });
        } else if (type === 'sasaran') {
            setInlineForm({ id: item.id, misi_id: String(item.misi_id), kode_sasaran: item.kode_sasaran, sasaran_pokok: item.sasaran_pokok });
        } else if (type === 'arah') {
            setInlineForm({ id: item.id, misi_id: String(item.misi_id || ''), sasaran_pokok_id: String(item.sasaran_pokok_id || ''), kode_arah_kebijakan: item.kode_arah_kebijakan, arah_kebijakan: item.arah_kebijakan, tahapan: item.tahapan || 'Semua Tahap' });
        } else if (type === 'indikator') {
            setInlineForm({
                id: item.id,
                sasaran_pokok_id: String(item.sasaran_pokok_id),
                nama_indikator: item.nama_indikator,
                satuan_id: item.satuan_id ? String(item.satuan_id) : '',
                kondisi_awal_nilai: item.kondisi_awal_nilai !== null ? String(item.kondisi_awal_nilai) : '',
                kondisi_awal_tahun: item.kondisi_awal_tahun || 2024,
                target_tahap_1: item.target_tahap_1 !== null ? String(item.target_tahap_1) : '',
                target_tahap_2: item.target_tahap_2 !== null ? String(item.target_tahap_2) : '',
                target_tahap_3: item.target_tahap_3 !== null ? String(item.target_tahap_3) : '',
                target_tahap_4: item.target_tahap_4 !== null ? String(item.target_tahap_4) : '',
                keterangan: item.keterangan || ''
            });
        }
    };

    const handleSaveInline = async () => {
        if (!inlineEditingType || !inlineEditingId) return;
        setLoading(true);
        try {
            let res;
            if (inlineEditingType === 'misi') {
                res = await api.rpjpd.saveMisi(inlineForm);
            } else if (inlineEditingType === 'sasaran') {
                res = await api.rpjpd.saveSasaran(inlineForm);
            } else if (inlineEditingType === 'arah') {
                res = await api.rpjpd.saveArahKebijakan(inlineForm);
            } else if (inlineEditingType === 'indikator') {
                const numVal = (val: string) => val === '' ? null : Number(val);
                const payload = {
                    ...inlineForm,
                    satuan_id: inlineForm.satuan_id === '' ? null : Number(inlineForm.satuan_id),
                    kondisi_awal_nilai: numVal(inlineForm.kondisi_awal_nilai),
                    target_tahap_1: numVal(inlineForm.target_tahap_1),
                    target_tahap_2: numVal(inlineForm.target_tahap_2),
                    target_tahap_3: numVal(inlineForm.target_tahap_3),
                    target_tahap_4: numVal(inlineForm.target_tahap_4),
                };
                res = await api.rpjpd.saveIndikator(payload);
            }

            if (res && res.success) {
                showSuccess(res.message || 'Perubahan berhasil disimpan!');
                setInlineEditingType(null);
                setInlineEditingId(null);
                loadAllData();
            } else {
                showError(res?.message || 'Gagal menyimpan perubahan');
            }
        } catch (err: any) {
            showError(err.message || 'Terjadi kesalahan sistem');
        } finally {
            setLoading(false);
        }
    };

    const startInlineAdd = (type: 'misi' | 'sasaran' | 'arah' | 'indikator', parentId?: number) => {
        setInlineEditingType(null);
        setInlineEditingId(null);
        setInlineAddingType(type);
        if (type === 'misi') {
            const activeVisi = parentId || selectedVisiId || (visiList[0]?.id || '');
            setInlineAddForm({
                visi_id: String(activeVisi),
                kode_misi: String(misiList.filter(m => m.visi_id === activeVisi).length + 1),
                misi: ''
            });
        } else if (type === 'sasaran') {
            const defaultMisi = parentId || (misiList[0]?.id || '');
            setInlineAddForm({
                misi_id: String(defaultMisi),
                kode_sasaran: String(sasaranList.length + 1),
                sasaran_pokok: ''
            });
        } else if (type === 'arah') {
            const defaultMisi = parentId || (misiList[0]?.id || '');
            setInlineAddForm({
                misi_id: String(defaultMisi),
                sasaran_pokok_id: '',
                kode_arah_kebijakan: String(arahList.length + 1),
                arah_kebijakan: '',
                tahapan: 'Semua Tahap'
            });
        } else if (type === 'indikator') {
            const defaultSasaran = parentId || (sasaranList[0]?.id || '');
            setInlineAddForm({
                sasaran_pokok_id: String(defaultSasaran),
                nama_indikator: '',
                satuan_id: satuanList[0]?.id ? String(satuanList[0].id) : '',
                kondisi_awal_nilai: '',
                kondisi_awal_tahun: 2024,
                target_tahap_1: '',
                target_tahap_2: '',
                target_tahap_3: '',
                target_tahap_4: '',
                keterangan: ''
            });
        }
    };

    const handleSaveInlineAdd = async () => {
        if (!inlineAddingType) return;
        setLoading(true);
        try {
            let res;
            if (inlineAddingType === 'misi') {
                if (!inlineAddForm.misi?.trim()) {
                    showError('Teks Misi tidak boleh kosong');
                    setLoading(false);
                    return;
                }
                res = await api.rpjpd.saveMisi(inlineAddForm);
            } else if (inlineAddingType === 'sasaran') {
                if (!inlineAddForm.sasaran_pokok?.trim()) {
                    showError('Sasaran pokok tidak boleh kosong');
                    setLoading(false);
                    return;
                }
                res = await api.rpjpd.saveSasaran(inlineAddForm);
            } else if (inlineAddingType === 'arah') {
                if (!inlineAddForm.arah_kebijakan?.trim()) {
                    showError('Arah kebijakan tidak boleh kosong');
                    setLoading(false);
                    return;
                }
                res = await api.rpjpd.saveArahKebijakan(inlineAddForm);
            } else if (inlineAddingType === 'indikator') {
                if (!inlineAddForm.nama_indikator?.trim()) {
                    showError('Nama indikator tidak boleh kosong');
                    setLoading(false);
                    return;
                }
                const numVal = (val: string) => val === '' ? null : Number(val);
                const payload = {
                    ...inlineAddForm,
                    satuan_id: inlineAddForm.satuan_id === '' ? null : Number(inlineAddForm.satuan_id),
                    kondisi_awal_nilai: numVal(inlineAddForm.kondisi_awal_nilai),
                    target_tahap_1: numVal(inlineAddForm.target_tahap_1),
                    target_tahap_2: numVal(inlineAddForm.target_tahap_2),
                    target_tahap_3: numVal(inlineAddForm.target_tahap_3),
                    target_tahap_4: numVal(inlineAddForm.target_tahap_4),
                };
                res = await api.rpjpd.saveIndikator(payload);
            }

            if (res && res.success) {
                showSuccess(res.message || 'Data berhasil ditambahkan!');
                setInlineAddingType(null);
                setInlineAddForm({});
                loadAllData();
            } else {
                showError(res?.message || 'Gagal menambah data');
            }
        } catch (err: any) {
            showError(err.message || 'Terjadi kesalahan sistem');
        } finally {
            setLoading(false);
        }
    };




    const openLibraryPicker = (visiId: number) => {
        setSelectedVisiIdForLibrary(visiId);
        setIsLibraryPickerOpen(true);
        loadLibraryDocs();
    };

    const loadLibraryDocs = async () => {
        try {
            const res = await api.dokumen.getAll();
            if (res.success) {
                setLibraryDocs(res.data || []);
            }
        } catch (err: any) {
            console.error('Failed to load library docs:', err);
        }
    };

    const handleSelectLibraryDoc = async (doc: any) => {
        if (!selectedVisiIdForLibrary) return;
        setIsLibraryPickerOpen(false);
        setLoading(true);
        
        try {
            const res = await api.rpjpd.linkPerdaFile(selectedVisiIdForLibrary, doc.path, doc.nama_file);
            if (res.success) {
                showSuccess('Dokumen Perda berhasil dikaitkan dari perpustakaan!');
                loadAllData();
            } else {
                showError(res.message || 'Gagal mengaitkan dokumen Perda');
            }
        } catch (err: any) {
            showError(err.message || 'Terjadi kesalahan sistem');
        } finally {
            setLoading(false);
            setSelectedVisiIdForLibrary(null);
        }
    };

    const openHistoryModal = async (visiId: number) => {
        setSelectedVisiIdForHistory(visiId);
        setIsHistoryModalOpen(true);
        setLoadingHistory(true);
        
        try {
            const res = await api.rpjpd.getPerdaHistory(visiId);
            if (res.success) {
                setHistoryDocs(res.data || []);
            } else {
                showError(res.message || 'Gagal memuat riwayat dokumen');
            }
        } catch (err: any) {
            showError(err.message || 'Terjadi kesalahan sistem saat memuat riwayat');
        } finally {
            setLoadingHistory(false);
        }
    };

    const openLibraryUploadModal = async (visiId: number) => {
        setSelectedVisiIdForUpload(visiId);
        setUploadDocFile(null);
        setUploadDocName('');
        setUploadDocJenisId('');
        setUploadDocIsPrivate(false);
        setIsLibraryUploadModalOpen(true);
        
        try {
            const res = await api.jenisDokumen.getAll();
            if (res.success && Array.isArray(res.data)) {
                // Filter only "Dokumen" types (exclude "Surat" types)
                const docOnly = res.data.filter((j: any) => {
                    const label = (j.dokumen || j.nama || j.nama_jenis || j.jenis_dokumen_nama || '').toLowerCase();
                    const isSurat = j.is_surat === 1 || j.is_surat === '1' || label.includes('surat');
                    return !isSurat;
                });

                setJenisDokumenList(docOnly);

                // Auto-select Perda / Peraturan Daerah if found, or default to the first available document type
                const defaultJenis = docOnly.find((j: any) => {
                    const label = (j.dokumen || j.nama || j.nama_jenis || j.jenis_dokumen_nama || '').toLowerCase();
                    return label.includes('perda') || label.includes('peraturan daerah');
                }) || docOnly[0];

                if (defaultJenis) {
                    setUploadDocJenisId(String(defaultJenis.id));
                }
            }
        } catch (err: any) {
            console.error('Failed to load jenis dokumen list:', err);
        }
    };

    const handleLibraryUploadSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedVisiIdForUpload || !uploadDocFile || !uploadDocJenisId || !uploadDocName.trim()) {
            showError('Semua field wajib diisi');
            return;
        }

        setUploadingToLibrary(true);
        setErrorMsg('');
        
        const formData = new FormData();
        formData.append('file', uploadDocFile);
        formData.append('jenis_dokumen_id', uploadDocJenisId);
        formData.append('nama_file', uploadDocName.trim());
        formData.append('is_private', uploadDocIsPrivate ? '1' : '0');

        try {
            const uploadRes = await api.dokumen.upload(formData);
            if (uploadRes.success && uploadRes.data) {
                const { path: uploadedPath, nama_file: uploadedName } = uploadRes.data;
                
                const linkRes = await api.rpjpd.linkPerdaFile(selectedVisiIdForUpload, uploadedPath, uploadedName);
                if (linkRes.success) {
                    showSuccess('Dokumen Perda berhasil diunggah ke perpustakaan & dikaitkan!');
                    setIsLibraryUploadModalOpen(false);
                    loadAllData();
                } else {
                    showError(linkRes.message || 'Gagal mengaitkan dokumen ke perencanaan');
                }
            } else {
                showError(uploadRes.message || 'Gagal mengunggah dokumen ke perpustakaan');
            }
        } catch (err: any) {
            showError(err.message || 'Terjadi kesalahan sistem saat unggah');
        } finally {
            setUploadingToLibrary(false);
        }
    };

    const handleUnlinkPerda = async (visiId: number) => {
        if (!window.confirm('Apakah Anda yakin ingin menghapus kaitan Dokumen Perda ini? Dokumen asli akan tetap tersimpan di Perpustakaan Dokumen.')) {
            return;
        }

        setLoading(true);
        try {
            const res = await api.rpjpd.unlinkPerdaFile(visiId);
            if (res.success) {
                showSuccess('Kaitan Dokumen Perda berhasil dihapus!');
                loadAllData();
            } else {
                showError(res.message || 'Gagal memutuskan kaitan dokumen');
            }
        } catch (err: any) {
            showError(err.message || 'Terjadi kesalahan sistem');
        } finally {
            setLoading(false);
        }
    };

    // Helper to extract clean dynamic Region name (e.g. KABUPATEN BOGOR, KOTA DEPOK, etc.)
    const getRegionTitle = () => {
        if (!user?.instansi_nama) return 'Kabupaten / Kota';
        const raw = user.instansi_nama.trim();
        const match = raw.match(/(kabupaten|kota)\s+[a-zA-Z\s]+/i);
        if (match) {
            return match[0].trim().toUpperCase();
        }
        const cleaned = raw.replace(/bapperida|bappeda|dinas|badan|pemerintah/gi, '').trim();
        return cleaned ? cleaned.toUpperCase() : 'KABUPATEN / KOTA';
    };

    const activeVisiForDoc = selectedVisiId ? visiList.find(v => v.id === selectedVisiId) : (visiList[0] || null);

    return (
        <div className="w-full px-2 sm:px-4 py-2 space-y-4">
            
            {/* Header section with rich dark-blue aesthetics */}
            <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 rounded-2xl p-4 md:p-5 shadow-xl border border-slate-700/30">
                <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
                
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
                    <div>
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 rounded-full text-[10px] font-bold mb-2 uppercase tracking-widest">
                            <Compass className="w-3 h-3 animate-spin-slow" />
                            Rencana Jangka Panjang
                        </div>
                        <h1 className="text-xl md:text-2xl font-black text-white tracking-tight leading-none">RPJPD {getRegionTitle()}</h1>
                        <p className="text-slate-300 text-xs mt-1 font-medium">Perencanaan Pembangunan Jangka Panjang 20 Tahun (Visi, Misi, Sasaran, Arah Kebijakan, dan Target Makro Tahapan).</p>
                    </div>

                    {/* Filter Periode Dropdown */}
                    {visiList.length > 0 && (
                        <div className="inline-flex items-center gap-2 bg-slate-800/90 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white shadow-inner shrink-0">
                            <Calendar size={14} className="text-indigo-400 shrink-0" />
                            <span className="font-bold text-[10px] text-slate-300 uppercase tracking-wider shrink-0">Filter Periode:</span>
                            <select
                                value={selectedVisiId}
                                onChange={(e) => setSelectedVisiId(e.target.value ? Number(e.target.value) : '')}
                                className="bg-transparent text-white font-extrabold text-xs focus:outline-none cursor-pointer pr-1"
                            >
                                <option value="" className="bg-slate-900 text-slate-300">Semua Periode RPJPD</option>
                                {visiList.map((v) => (
                                    <option key={v.id} value={v.id} className="bg-slate-900 text-white">
                                        RPJPD {v.tahun_mulai} - {v.tahun_selesai}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>



            </div>

            {/* Standalone White Perda Document Container */}
            {activeVisiForDoc && (
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 text-slate-800 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shrink-0 border border-indigo-100">
                            <FileText size={18} />
                        </div>
                        <div>
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                                Dokumen Perda RPJPD ({activeVisiForDoc.tahun_mulai} - {activeVisiForDoc.tahun_selesai})
                            </div>
                            {activeVisiForDoc.file_path ? (
                                <span className="text-xs font-bold text-slate-800">
                                    {activeVisiForDoc.file_name || 'Dokumen Perda Terkait'}
                                </span>
                            ) : (
                                <span className="text-xs text-slate-400 italic font-semibold">
                                    Belum ada dokumen Perda RPJPD yang diunggah
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {activeVisiForDoc.file_path && (
                            <>
                                {/* Buka Dokumen Icon Only (Eye) */}
                                <a
                                    href={getFileUrl(activeVisiForDoc.file_path)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center justify-center p-2 text-indigo-600 hover:text-white bg-indigo-50 hover:bg-indigo-600 border border-indigo-200 hover:border-indigo-600 rounded-xl shadow-sm transition-all"
                                    title="Buka / Lihat Dokumen Perda"
                                >
                                    <Eye size={16} />
                                </a>
                                <button
                                    onClick={() => openHistoryModal(activeVisiForDoc.id)}
                                    className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-indigo-600 bg-white border border-slate-200 hover:border-indigo-200 hover:bg-slate-50 px-3 py-1.5 rounded-xl shadow-sm transition-all"
                                    title="Riwayat Perubahan Dokumen"
                                >
                                    <Clock size={13} strokeWidth={2.5} />
                                    <span>Riwayat</span>
                                </button>
                                {canUploadPerda && (
                                    <button
                                        onClick={() => handleUnlinkPerda(activeVisiForDoc.id)}
                                        className="inline-flex items-center justify-center p-2 text-rose-600 hover:text-white bg-rose-50 hover:bg-rose-600 border border-rose-200 hover:border-rose-600 rounded-xl shadow-sm transition-all"
                                        title="Hapus Kaitan Dokumen Perda"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                )}
                            </>
                        )}
                        {canUploadPerda && (
                            <div className="flex items-center gap-1.5">
                                <button
                                    onClick={() => openLibraryUploadModal(activeVisiForDoc.id)}
                                    className="inline-flex items-center gap-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-xl shadow-sm transition-all"
                                >
                                    <Upload size={13} strokeWidth={2.5} />
                                    <span>File Baru</span>
                                </button>
                                <button
                                    onClick={() => openLibraryPicker(activeVisiForDoc.id)}
                                    className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-indigo-600 bg-white border border-slate-200 hover:border-indigo-200 hover:bg-slate-50 px-3 py-1.5 rounded-xl shadow-sm transition-all"
                                >
                                    <FolderOpen size={13} strokeWidth={2.5} />
                                    <span>Dari Perpustakaan</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Error and Success alerts */}
            {errorMsg && (
                <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 text-red-200 p-3 rounded-xl font-bold text-xs animate-shake">
                    <AlertCircle className="shrink-0 text-red-400" size={16} />
                    <span>{errorMsg}</span>
                </div>
            )}
            {successMsg && (
                <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-200 p-3 rounded-xl font-bold text-xs animate-fade-in">
                    <Check className="shrink-0 text-emerald-400" size={16} />
                    <span>{successMsg}</span>
                </div>
            )}

            {/* Main Flex Layout: Left Vertical Sidebar + Right Expanding Content */}
            <div className="flex flex-col lg:flex-row items-start gap-4 w-full">
                
                {/* Left Vertical Navigation Sidebar */}
                <div className="w-full lg:w-64 shrink-0 bg-white rounded-2xl border border-slate-200/80 p-2 shadow-sm space-y-1 sticky top-2">
                    <div className="px-3 py-2 border-b border-slate-100 mb-1">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Tahapan RPJPD</span>
                        <span className="text-xs font-bold text-slate-800">Menu Perencanaan</span>
                    </div>

                    {/* Tab 1: Visi & Misi */}
                    <button
                        onClick={() => setActiveTab('visi')}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider text-left transition-all duration-200 whitespace-normal break-words ${
                            activeTab === 'visi' 
                                ? 'bg-gradient-to-r from-indigo-900 to-slate-900 text-white shadow-md shadow-indigo-950/20 ring-1 ring-slate-700/50' 
                                : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                        }`}
                    >
                        <div className={`p-1.5 rounded-lg shrink-0 ${activeTab === 'visi' ? 'bg-indigo-500/20 text-indigo-300' : 'bg-slate-100 text-slate-500'}`}>
                            <Award size={16} />
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="leading-snug break-words">Visi & Misi</div>
                            <div className={`text-[10px] normal-case font-medium mt-0.5 ${activeTab === 'visi' ? 'text-indigo-200/80' : 'text-slate-400'}`}>
                                Landasan 20 Tahun & Misi Daerah
                            </div>
                        </div>
                    </button>

                    {/* Tab 2: Arah Kebijakan */}
                    <button
                        onClick={() => setActiveTab('arah')}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider text-left transition-all duration-200 whitespace-normal break-words ${
                            activeTab === 'arah' 
                                ? 'bg-gradient-to-r from-indigo-900 to-slate-900 text-white shadow-md shadow-indigo-950/20 ring-1 ring-slate-700/50' 
                                : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                        }`}
                    >
                        <div className={`p-1.5 rounded-lg shrink-0 ${activeTab === 'arah' ? 'bg-indigo-500/20 text-indigo-300' : 'bg-slate-100 text-slate-500'}`}>
                            <Compass size={16} />
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="leading-snug break-words">Arah Kebijakan</div>
                            <div className={`text-[10px] normal-case font-medium mt-0.5 ${activeTab === 'arah' ? 'text-indigo-200/80' : 'text-slate-400'}`}>
                                Strategi Pembangunan Tahapan
                            </div>
                        </div>
                    </button>

                    {/* Tab 3: Sasaran Pokok */}
                    <button
                        onClick={() => setActiveTab('sasaran')}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider text-left transition-all duration-200 whitespace-normal break-words ${
                            activeTab === 'sasaran' 
                                ? 'bg-gradient-to-r from-indigo-900 to-slate-900 text-white shadow-md shadow-indigo-950/20 ring-1 ring-slate-700/50' 
                                : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                        }`}
                    >
                        <div className={`p-1.5 rounded-lg shrink-0 ${activeTab === 'sasaran' ? 'bg-indigo-500/20 text-indigo-300' : 'bg-slate-100 text-slate-500'}`}>
                            <Target size={16} />
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="leading-snug break-words">Sasaran Pokok</div>
                            <div className={`text-[10px] normal-case font-medium mt-0.5 ${activeTab === 'sasaran' ? 'text-indigo-200/80' : 'text-slate-400'}`}>
                                Tujuan Utama Pembangunan
                            </div>
                        </div>
                    </button>

                    {/* Tab 4: Indikator & Target */}
                    <button
                        onClick={() => setActiveTab('indikator')}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider text-left transition-all duration-200 whitespace-normal break-words ${
                            activeTab === 'indikator' 
                                ? 'bg-gradient-to-r from-indigo-900 to-slate-900 text-white shadow-md shadow-indigo-950/20 ring-1 ring-slate-700/50' 
                                : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                        }`}
                    >
                        <div className={`p-1.5 rounded-lg shrink-0 ${activeTab === 'indikator' ? 'bg-indigo-500/20 text-indigo-300' : 'bg-slate-100 text-slate-500'}`}>
                            <TrendingUp size={16} />
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="leading-snug break-words">Indikator & Target</div>
                            <div className={`text-[10px] normal-case font-medium mt-0.5 ${activeTab === 'indikator' ? 'text-indigo-200/80' : 'text-slate-400'}`}>
                                Target Makro 4 Tahapan (5 Th)
                            </div>
                        </div>
                    </button>
                </div>

                {/* Right Main Content Panel (Maximizes Space) */}
                <div className="flex-1 min-w-0 bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 md:p-6 min-h-[500px] w-full">
                
                {/* 1. VISI & MISI TAB */}
                {activeTab === 'visi' && (
                    <div className="space-y-6 animate-fade-in">
                        {/* Header bar with Tambah Visi Baru button above Visi Period Container */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                            <div>
                                <h2 className="text-sm font-black uppercase tracking-widest text-slate-700">Landasan Visi & Misi RPJPD</h2>
                                <p className="text-xs text-slate-400 mt-0.5">Visi dan Misi Pembangunan Daerah Jangka Panjang 20 Tahun.</p>
                            </div>
                            {canEdit && (
                                <button
                                    onClick={() => openAddEditor('visi')}
                                    className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white font-extrabold rounded-xl hover:brightness-110 active:scale-95 transition-all shadow-md shadow-indigo-500/20 text-xs tracking-wider uppercase shrink-0"
                                >
                                    <Plus size={16} strokeWidth={2.5} />
                                    Tambah Visi Baru
                                </button>
                            )}
                        </div>

                        {/* Visi Header Card */}
                        {visiList.length === 0 ? (
                            <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                                <FileText size={40} className="mx-auto text-slate-300 mb-3" />
                                <div className="font-extrabold text-sm uppercase">Belum Ada Visi RPJPD Aktif</div>
                                <p className="text-xs text-slate-400 mt-1">Silakan tambah Visi 20 Tahun terlebih dahulu.</p>
                            </div>
                        ) : (
                            (selectedVisiId ? visiList.filter(v => v.id === selectedVisiId) : visiList).map((item) => (
                                <div key={item.id} className="relative overflow-hidden bg-slate-50 border border-slate-200/60 rounded-2xl p-5 md:p-6 space-y-6">
                                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-indigo-500"></div>
                                    <div className="flex justify-between items-start gap-4">
                                        <div className="space-y-2">
                                            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 bg-indigo-100 text-indigo-950 rounded-lg text-[10px] font-black uppercase tracking-wider">
                                                Visi Periode {item.tahun_mulai} - {item.tahun_selesai}
                                            </div>
                                            <h2 className="text-lg md:text-xl font-black text-slate-800 italic leading-snug">
                                                "{item.visi}"
                                            </h2>
                                            {item.keterangan && (
                                                <p className="text-xs text-slate-500 mt-1">{item.keterangan}</p>
                                            )}
                                        </div>
                                        {canEdit && (
                                            <button
                                                onClick={() => openEditEditor('visi', item)}
                                                className="shrink-0 p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                                title="Edit Visi"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                        )}
                                    </div>
                                    
                                    {/* Misi Section linked to this Visi */}
                                    <div className="mt-8 border-t border-slate-200/80 pt-6">
                                        <div className="flex justify-between items-center mb-4">
                                            <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-2">
                                                <Layers size={14} />
                                                Misi Pendukung
                                            </h3>
                                            {canEdit && (
                                                <button
                                                    onClick={() => {
                                                        setEditId(null);
                                                        setEditType('misi');
                                                        setFormMisi({ 
                                                            visi_id: String(item.id), 
                                                            kode_misi: String(misiList.filter(m => m.visi_id === item.id).length + 1), 
                                                            misi: '' 
                                                        });
                                                        setEditorOpen(true);
                                                    }}
                                                    className="inline-flex items-center gap-1 text-[10px] font-black text-indigo-600 hover:bg-indigo-50 px-2.5 py-1.5 rounded-lg border border-indigo-200/50 transition-all uppercase"
                                                >
                                                    <Plus size={12} strokeWidth={3} />
                                                    Tambah Misi
                                                </button>
                                            )}
                                        </div>
                                        <div className="space-y-3">
                                            {misiList.filter(m => m.visi_id === item.id).length === 0 ? (
                                                <div className="p-4 text-center text-xs text-slate-400 bg-white/50 rounded-xl border border-dashed border-slate-200">
                                                    Belum ada misi pendukung yang diinput.
                                                </div>
                                            ) : (
                                                misiList.filter(m => m.visi_id === item.id).map((m) => (
                                                    <div key={m.id} className="flex justify-between items-start gap-4 bg-white border border-slate-200/40 p-4 rounded-xl shadow-[0_2px_8px_-4px_rgba(0,0,0,0.03)] hover:border-slate-200 transition-all group">
                                                        <div className="flex items-start gap-3">
                                                            <span className="w-6 h-6 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center text-xs font-black shrink-0">
                                                                {m.kode_misi}
                                                            </span>
                                                            <p className="text-sm font-semibold text-slate-700 leading-snug">{m.misi}</p>
                                                        </div>
                                                        {canEdit && (
                                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <button
                                                                    onClick={() => openEditEditor('misi', m)}
                                                                    className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded-md transition-colors"
                                                                    title="Edit Misi"
                                                                >
                                                                    <Edit2 size={14} />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDelete('misi', m.id)}
                                                                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                                                    title="Hapus Misi"
                                                                >
                                                                    <Trash2 size={14} />
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {/* 2. SASARAN POKOK TAB */}
                {activeTab === 'sasaran' && (
                    <div className="space-y-6 animate-fade-in">
                        <div className="flex justify-between items-center mb-2">
                            <h2 className="text-sm font-extrabold uppercase tracking-widest text-slate-600">Daftar Sasaran Pokok RPJPD</h2>
                            {canEdit && (
                                <button
                                    onClick={() => openAddEditor('sasaran')}
                                    className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs px-3.5 py-2 rounded-xl transition-colors shadow-sm"
                                    title="Tambah Sasaran Pokok Baru"
                                >
                                    <Plus size={14} strokeWidth={3} />
                                    Tambah Sasaran Pokok
                                </button>
                            )}
                        </div>
                        {sasaranList.length === 0 && inlineAddingType !== 'sasaran' ? (
                            <div className="p-12 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                                <Target size={40} className="mx-auto text-slate-300 mb-3" />
                                <div className="font-extrabold text-sm uppercase">Belum Ada Sasaran Pokok</div>
                                <p className="text-xs text-slate-400 mt-1 mb-3">Silakan input sasaran pokok pertama Anda.</p>
                                {canEdit && (
                                    <button
                                        onClick={() => openAddEditor('sasaran')}
                                        className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition-colors shadow-sm"
                                    >
                                        <Plus size={14} strokeWidth={3} />
                                        Tambah Sasaran Pokok
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="overflow-x-auto rounded-2xl border border-slate-200/80 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.02)]">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-200">
                                            <th className="p-4 text-xs font-black uppercase text-slate-500 w-24">Kode</th>
                                            <th className="p-4 text-xs font-black uppercase text-slate-500 w-1/3">Misi Pengampu</th>
                                            <th className="p-4 text-xs font-black uppercase text-slate-500">Sasaran Pokok</th>
                                            {canEdit && <th className="p-4 text-xs font-black uppercase text-slate-500 w-36 text-center">Aksi</th>}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {/* Inline Add Row for Sasaran */}
                                        {inlineAddingType === 'sasaran' && (
                                            <tr className="bg-emerald-50/70 border-2 border-emerald-400">
                                                <td className="p-3">
                                                    <input
                                                        type="text"
                                                        placeholder="Kode (mis. 1.1)"
                                                        className="w-full p-1.5 text-xs font-bold border border-emerald-300 rounded-lg text-emerald-950 focus:ring-2 focus:ring-emerald-500 bg-white"
                                                        value={inlineAddForm.kode_sasaran || ''}
                                                        onChange={e => setInlineAddForm({ ...inlineAddForm, kode_sasaran: e.target.value })}
                                                    />
                                                </td>
                                                <td className="p-3">
                                                    <select
                                                        className="w-full p-1.5 text-xs font-semibold border border-emerald-300 rounded-lg text-emerald-950 bg-white"
                                                        value={inlineAddForm.misi_id || ''}
                                                        onChange={e => setInlineAddForm({ ...inlineAddForm, misi_id: e.target.value })}
                                                    >
                                                        <option value="">-- Pilih Misi Pengampu --</option>
                                                        {misiList.map(m => (
                                                            <option key={m.id} value={m.id}>Misi {m.kode_misi}: {m.misi}</option>
                                                        ))}
                                                    </select>
                                                </td>
                                                <td className="p-3">
                                                    <input
                                                        type="text"
                                                        placeholder="Tulis Sasaran Pokok baru di sini..."
                                                        className="w-full p-1.5 text-xs font-semibold border border-emerald-300 rounded-lg text-emerald-950 focus:ring-2 focus:ring-emerald-500 bg-white"
                                                        value={inlineAddForm.sasaran_pokok || ''}
                                                        onChange={e => setInlineAddForm({ ...inlineAddForm, sasaran_pokok: e.target.value })}
                                                        onKeyDown={e => e.key === 'Enter' && handleSaveInlineAdd()}
                                                    />
                                                </td>
                                                <td className="p-3 text-center">
                                                    <div className="flex justify-center gap-1">
                                                        <button
                                                            onClick={handleSaveInlineAdd}
                                                            className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors font-bold text-xs flex items-center gap-1"
                                                            title="Simpan"
                                                        >
                                                            <Check size={14} strokeWidth={3} />
                                                        </button>
                                                        <button
                                                            onClick={() => setInlineAddingType(null)}
                                                            className="p-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg transition-colors font-bold text-xs"
                                                            title="Batal"
                                                        >
                                                            <X size={14} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}

                                        {(selectedVisiId 
                                            ? sasaranList.filter(s => { const m = misiList.find(misi => misi.id === s.misi_id); return m && m.visi_id === selectedVisiId; }) 
                                            : sasaranList
                                        ).map((item) => (
                                            inlineEditingId === item.id && inlineEditingType === 'sasaran' ? (
                                                /* Inline Edit Row for Sasaran */
                                                <tr key={item.id} className="bg-amber-50/80 border-2 border-amber-400">
                                                    <td className="p-3">
                                                        <input
                                                            type="text"
                                                            className="w-full p-1.5 text-xs font-bold border border-amber-300 rounded-lg text-amber-950 bg-white"
                                                            value={inlineForm.kode_sasaran || ''}
                                                            onChange={e => setInlineForm({ ...inlineForm, kode_sasaran: e.target.value })}
                                                        />
                                                    </td>
                                                    <td className="p-3">
                                                        <select
                                                            className="w-full p-1.5 text-xs font-semibold border border-amber-300 rounded-lg text-amber-950 bg-white"
                                                            value={inlineForm.misi_id || ''}
                                                            onChange={e => setInlineForm({ ...inlineForm, misi_id: e.target.value })}
                                                        >
                                                            {misiList.map(m => (
                                                                <option key={m.id} value={m.id}>Misi {m.kode_misi}: {m.misi}</option>
                                                            ))}
                                                        </select>
                                                    </td>
                                                    <td className="p-3">
                                                        <input
                                                            type="text"
                                                            className="w-full p-1.5 text-xs font-semibold border border-amber-300 rounded-lg text-amber-950 bg-white"
                                                            value={inlineForm.sasaran_pokok || ''}
                                                            onChange={e => setInlineForm({ ...inlineForm, sasaran_pokok: e.target.value })}
                                                            onKeyDown={e => e.key === 'Enter' && handleSaveInline()}
                                                        />
                                                    </td>
                                                    <td className="p-3 text-center">
                                                        <div className="flex justify-center gap-1">
                                                            <button
                                                                onClick={handleSaveInline}
                                                                className="p-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors font-bold text-xs flex items-center gap-1"
                                                                title="Simpan Perubahan (Inline)"
                                                            >
                                                                <Check size={14} strokeWidth={3} />
                                                            </button>
                                                            <button
                                                                onClick={() => { setInlineEditingId(null); setInlineEditingType(null); }}
                                                                className="p-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg transition-colors font-bold text-xs"
                                                                title="Batal"
                                                            >
                                                                <X size={14} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ) : (
                                                /* Normal Row for Sasaran */
                                                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                                                    <td className="p-4 text-xs font-black text-indigo-600">{item.kode_sasaran}</td>
                                                    <td className="p-4">
                                                        <div className="flex items-center gap-2">
                                                            <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-[9px] font-black">
                                                                Misi {item.kode_misi}
                                                            </span>
                                                            <span className="text-xs font-semibold text-slate-500 truncate max-w-[200px]">
                                                                {item.misi_nama}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="p-4 text-sm font-semibold text-slate-700 leading-snug">{item.sasaran_pokok}</td>
                                                    {canEdit && (
                                                        <td className="p-4 text-center">
                                                            <div className="flex justify-center gap-1">
                                                                <button
                                                                    onClick={() => startInlineEdit('sasaran', item)}
                                                                    className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors"
                                                                    title="Edit Langsung di Baris Tabel (Tanpa Pop-up)"
                                                                >
                                                                    <Edit2 size={14} />
                                                                </button>
                                                                <button
                                                                    onClick={() => openEditEditor('sasaran', item)}
                                                                    className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                                                                    title="Edit via Pop-up Modal"
                                                                >
                                                                    <Layers size={14} />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDelete('sasaran', item.id)}
                                                                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                                                    title="Hapus"
                                                                >
                                                                    <Trash2 size={14} />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    )}
                                                </tr>
                                            )
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* 3. ARAH KEBIJAKAN TAB */}
                {activeTab === 'arah' && (
                    <div className="space-y-6 animate-fade-in">
                        <div className="flex justify-between items-center mb-2">
                            <h2 className="text-sm font-extrabold uppercase tracking-widest text-slate-600">Daftar Arah Kebijakan Pembangunan</h2>
                            {canEdit && (
                                <button
                                    onClick={() => openAddEditor('arah')}
                                    className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs px-3.5 py-2 rounded-xl transition-colors shadow-sm"
                                    title="Tambah Arah Kebijakan Baru"
                                >
                                    <Plus size={14} strokeWidth={3} />
                                    Tambah Arah Kebijakan
                                </button>
                            )}
                        </div>
                        {arahList.length === 0 && inlineAddingType !== 'arah' ? (
                            <div className="p-12 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                                <Compass size={40} className="mx-auto text-slate-300 mb-3" />
                                <div className="font-extrabold text-sm uppercase">Belum Ada Arah Kebijakan</div>
                                <p className="text-xs text-slate-400 mt-1 mb-3">Silakan input arah kebijakan pembangunan.</p>
                                {canEdit && (
                                    <button
                                        onClick={() => openAddEditor('arah')}
                                        className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition-colors shadow-sm"
                                    >
                                        <Plus size={14} strokeWidth={3} />
                                        Tambah Arah Kebijakan
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="overflow-x-auto rounded-2xl border border-slate-200/80 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.02)]">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-200">
                                            <th className="p-4 text-xs font-black uppercase text-slate-500 w-24">Kode</th>
                                            <th className="p-4 text-xs font-black uppercase text-slate-500 w-1/4">Misi Pengampu</th>
                                            <th className="p-4 text-xs font-black uppercase text-slate-500 w-44">Tahapan (Periodisasi)</th>
                                            <th className="p-4 text-xs font-black uppercase text-slate-500">Arah Kebijakan</th>
                                            {canEdit && <th className="p-4 text-xs font-black uppercase text-slate-500 w-36 text-center">Aksi</th>}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {/* Inline Add Row for Arah Kebijakan */}
                                        {inlineAddingType === 'arah' && (
                                            <tr className="bg-emerald-50/70 border-2 border-emerald-400">
                                                <td className="p-3">
                                                    <input
                                                        type="text"
                                                        placeholder="Kode (mis. 1.1)"
                                                        className="w-full p-1.5 text-xs font-bold border border-emerald-300 rounded-lg text-emerald-950 focus:ring-2 focus:ring-emerald-500 bg-white"
                                                        value={inlineAddForm.kode_arah_kebijakan || ''}
                                                        onChange={e => setInlineAddForm({ ...inlineAddForm, kode_arah_kebijakan: e.target.value })}
                                                    />
                                                </td>
                                                <td className="p-3">
                                                    <select
                                                        className="w-full p-1.5 text-xs font-semibold border border-emerald-300 rounded-lg text-emerald-950 bg-white"
                                                        value={inlineAddForm.misi_id || ''}
                                                        onChange={e => setInlineAddForm({ ...inlineAddForm, misi_id: e.target.value })}
                                                    >
                                                        <option value="">-- Pilih Misi --</option>
                                                        {misiList.map(m => (
                                                            <option key={m.id} value={m.id}>Misi {m.kode_misi}: {m.misi}</option>
                                                        ))}
                                                    </select>
                                                </td>
                                                <td className="p-3">
                                                    <div className="flex items-center gap-1">
                                                        <select
                                                            className="w-full p-1.5 text-xs font-bold border border-emerald-300 rounded-lg text-emerald-950 bg-white"
                                                            value={inlineAddForm.tahapan || 'Tanpa Tahap / Semua Tahap'}
                                                            onChange={e => setInlineAddForm({ ...inlineAddForm, tahapan: e.target.value })}
                                                        >
                                                            {tahapanOptions.map(opt => (
                                                                <option key={opt} value={opt}>{opt}</option>
                                                            ))}
                                                        </select>
                                                        <button
                                                            type="button"
                                                            onClick={() => setModalTambahTahapOpen(true)}
                                                            className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors flex-shrink-0"
                                                            title="Tambah Tahapan RPJPD Baru"
                                                        >
                                                            <Plus size={14} strokeWidth={3} />
                                                        </button>
                                                    </div>
                                                </td>
                                                <td className="p-3">
                                                    <input
                                                        type="text"
                                                        placeholder="Tulis Arah Kebijakan baru di sini..."
                                                        className="w-full p-1.5 text-xs font-semibold border border-emerald-300 rounded-lg text-emerald-950 focus:ring-2 focus:ring-emerald-500 bg-white"
                                                        value={inlineAddForm.arah_kebijakan || ''}
                                                        onChange={e => setInlineAddForm({ ...inlineAddForm, arah_kebijakan: e.target.value })}
                                                        onKeyDown={e => e.key === 'Enter' && handleSaveInlineAdd()}
                                                    />
                                                </td>
                                                <td className="p-3 text-center">
                                                    <div className="flex justify-center gap-1">
                                                        <button
                                                            onClick={handleSaveInlineAdd}
                                                            className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors font-bold text-xs flex items-center gap-1"
                                                            title="Simpan"
                                                        >
                                                            <Check size={14} strokeWidth={3} />
                                                        </button>
                                                        <button
                                                            onClick={() => setInlineAddingType(null)}
                                                            className="p-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg transition-colors font-bold text-xs"
                                                            title="Batal"
                                                        >
                                                            <X size={14} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}

                                        {(selectedVisiId 
                                            ? arahList.filter(a => { const m = misiList.find(misi => misi.id === a.misi_id); return m && m.visi_id === selectedVisiId; }) 
                                            : arahList
                                        ).map((item) => (
                                            inlineEditingId === item.id && inlineEditingType === 'arah' ? (
                                                /* Inline Edit Row for Arah Kebijakan */
                                                <tr key={item.id} className="bg-amber-50/80 border-2 border-amber-400">
                                                    <td className="p-3">
                                                        <input
                                                            type="text"
                                                            className="w-full p-1.5 text-xs font-bold border border-amber-300 rounded-lg text-amber-950 bg-white"
                                                            value={inlineForm.kode_arah_kebijakan || ''}
                                                            onChange={e => setInlineForm({ ...inlineForm, kode_arah_kebijakan: e.target.value })}
                                                        />
                                                    </td>
                                                    <td className="p-3">
                                                        <select
                                                            className="w-full p-1.5 text-xs font-semibold border border-amber-300 rounded-lg text-amber-950 bg-white"
                                                            value={inlineForm.misi_id || ''}
                                                            onChange={e => setInlineForm({ ...inlineForm, misi_id: e.target.value })}
                                                        >
                                                            {misiList.map(m => (
                                                                <option key={m.id} value={m.id}>Misi {m.kode_misi}: {m.misi}</option>
                                                            ))}
                                                        </select>
                                                    </td>
                                                    <td className="p-3">
                                                        <div className="flex items-center gap-1">
                                                            <select
                                                                className="w-full p-1.5 text-xs font-bold border border-amber-300 rounded-lg text-amber-950 bg-white"
                                                                value={inlineForm.tahapan || 'Tanpa Tahap / Semua Tahap'}
                                                                onChange={e => setInlineForm({ ...inlineForm, tahapan: e.target.value })}
                                                            >
                                                                {tahapanOptions.map(opt => (
                                                                    <option key={opt} value={opt}>{opt}</option>
                                                                ))}
                                                            </select>
                                                            <button
                                                                type="button"
                                                                onClick={() => setModalTambahTahapOpen(true)}
                                                                className="p-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors flex-shrink-0"
                                                                title="Tambah Tahapan RPJPD Baru"
                                                            >
                                                                <Plus size={14} strokeWidth={3} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                    <td className="p-3">
                                                        <input
                                                            type="text"
                                                            className="w-full p-1.5 text-xs font-semibold border border-amber-300 rounded-lg text-amber-950 bg-white"
                                                            value={inlineForm.arah_kebijakan || ''}
                                                            onChange={e => setInlineForm({ ...inlineForm, arah_kebijakan: e.target.value })}
                                                            onKeyDown={e => e.key === 'Enter' && handleSaveInline()}
                                                        />
                                                    </td>
                                                    <td className="p-3 text-center">
                                                        <div className="flex justify-center gap-1">
                                                            <button
                                                                onClick={handleSaveInline}
                                                                className="p-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors font-bold text-xs flex items-center gap-1"
                                                                title="Simpan Perubahan (Inline)"
                                                            >
                                                                <Check size={14} strokeWidth={3} />
                                                            </button>
                                                            <button
                                                                onClick={() => { setInlineEditingId(null); setInlineEditingType(null); }}
                                                                className="p-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg transition-colors font-bold text-xs"
                                                                title="Batal"
                                                            >
                                                                <X size={14} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ) : (
                                                /* Normal Row for Arah Kebijakan */
                                                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                                                    <td className="p-4 text-xs font-black text-indigo-600">{item.kode_arah_kebijakan}</td>
                                                    <td className="p-4">
                                                        <div className="flex items-center gap-2">
                                                            <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-[9px] font-black">
                                                                Misi {item.kode_misi}
                                                            </span>
                                                            <span className="text-xs font-semibold text-slate-500 truncate max-w-[200px]" title={item.misi_nama}>
                                                                {item.misi_nama}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="p-4">
                                                        {item.tahapan && item.tahapan !== 'Tanpa Tahap / Semua Tahap' ? (
                                                            <span className="inline-block bg-emerald-50 text-emerald-800 border border-emerald-200/80 px-2.5 py-1 rounded-lg text-[10px] font-black shadow-2xs">
                                                                {item.tahapan}
                                                            </span>
                                                        ) : (
                                                            <span className="inline-block bg-slate-100 text-slate-500 border border-slate-200 px-2 py-0.5 rounded-lg text-[10px] font-bold">
                                                                Tanpa Tahap
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="p-4 text-sm font-semibold text-slate-700 leading-snug">{item.arah_kebijakan}</td>
                                                    {canEdit && (
                                                        <td className="p-4 text-center">
                                                            <div className="flex justify-center gap-1">
                                                                <button
                                                                    onClick={() => startInlineEdit('arah', item)}
                                                                    className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors"
                                                                    title="Edit Langsung di Baris Tabel (Tanpa Pop-up)"
                                                                >
                                                                    <Edit2 size={14} />
                                                                </button>
                                                                <button
                                                                    onClick={() => openEditEditor('arah', item)}
                                                                    className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                                                                    title="Edit via Pop-up Modal"
                                                                >
                                                                    <Layers size={14} />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDelete('arah', item.id)}
                                                                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                                                    title="Hapus"
                                                                >
                                                                    <Trash2 size={14} />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    )}
                                                </tr>
                                            )
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* 4. INDIKATOR & TARGET TAB */}
                {activeTab === 'indikator' && (
                    <div className="space-y-6 animate-fade-in">
                        <div className="flex justify-between items-center mb-2">
                            <h2 className="text-sm font-extrabold uppercase tracking-widest text-slate-600">Target Indikator Sasaran Pokok Jangka Panjang (20 Tahun)</h2>
                            {canEdit && (
                                <button
                                    onClick={() => openAddEditor('indikator')}
                                    className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs px-3.5 py-2 rounded-xl transition-colors shadow-sm"
                                    title="Tambah Indikator Target Baru"
                                >
                                    <Plus size={14} strokeWidth={3} />
                                    Tambah Indikator
                                </button>
                            )}
                        </div>
                        {indikatorList.length === 0 && inlineAddingType !== 'indikator' ? (
                            <div className="p-12 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                                <TrendingUp size={40} className="mx-auto text-slate-300 mb-3" />
                                <div className="font-extrabold text-sm uppercase">Belum Ada Indikator Target</div>
                                <p className="text-xs text-slate-400 mt-1 mb-3">Silakan input indikator target pertama Anda.</p>
                                {canEdit && (
                                    <button
                                        onClick={() => openAddEditor('indikator')}
                                        className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition-colors shadow-sm"
                                    >
                                        <Plus size={14} strokeWidth={3} />
                                        Tambah Indikator
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="overflow-x-auto rounded-2xl border border-slate-200/80 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.02)]">
                                <table className="w-full text-left border-collapse min-w-[900px]">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-200 text-center">
                                            <th className="p-4 text-xs font-black uppercase text-slate-500 text-left w-64">Sasaran Pokok & Indikator</th>
                                            <th className="p-4 text-xs font-black uppercase text-slate-500 w-24">Satuan</th>
                                            <th className="p-4 text-xs font-black uppercase text-slate-500 w-28 bg-slate-100/50">Baseline Nilai</th>
                                            <th className="p-4 text-xs font-black uppercase text-slate-500 w-20">Baseline Tahun</th>
                                            <th className="p-4 text-xs font-black uppercase text-slate-500 w-24 bg-indigo-50/40">Tahap I (Y1-5)</th>
                                            <th className="p-4 text-xs font-black uppercase text-slate-500 w-24 bg-indigo-50/40">Tahap II (Y6-10)</th>
                                            <th className="p-4 text-xs font-black uppercase text-slate-500 w-24 bg-indigo-50/40">Tahap III (Y11-15)</th>
                                            <th className="p-4 text-xs font-black uppercase text-slate-500 w-24 bg-indigo-50/40">Tahap IV (Y16-20)</th>
                                            {canEdit && <th className="p-4 text-xs font-black uppercase text-slate-500 w-36">Aksi</th>}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 text-center">
                                        {/* Inline Add Row for Indikator Target */}
                                        {inlineAddingType === 'indikator' && (
                                            <tr className="bg-emerald-50/70 border-2 border-emerald-400">
                                                <td className="p-3 text-left">
                                                    <select
                                                        className="w-full p-1 text-[11px] font-semibold border border-emerald-300 rounded mb-1 bg-white"
                                                        value={inlineAddForm.sasaran_pokok_id || ''}
                                                        onChange={e => setInlineAddForm({ ...inlineAddForm, sasaran_pokok_id: e.target.value })}
                                                    >
                                                        <option value="">-- Pilih Sasaran Pokok --</option>
                                                        {sasaranList.map(s => (
                                                            <option key={s.id} value={s.id}>{s.kode_sasaran} - {s.sasaran_pokok}</option>
                                                        ))}
                                                    </select>
                                                    <input
                                                        type="text"
                                                        placeholder="Nama Indikator Baru..."
                                                        className="w-full p-1.5 text-xs font-bold border border-emerald-300 rounded bg-white text-emerald-950"
                                                        value={inlineAddForm.nama_indikator || ''}
                                                        onChange={e => setInlineAddForm({ ...inlineAddForm, nama_indikator: e.target.value })}
                                                    />
                                                </td>
                                                <td className="p-3">
                                                    <select
                                                        className="w-full p-1 text-xs border border-emerald-300 rounded bg-white font-semibold"
                                                        value={inlineAddForm.satuan_id || ''}
                                                        onChange={e => setInlineAddForm({ ...inlineAddForm, satuan_id: e.target.value })}
                                                    >
                                                        <option value="">- Satuan -</option>
                                                        {satuanList.map(st => (
                                                            <option key={st.id} value={st.id}>{st.nama_satuan}</option>
                                                        ))}
                                                    </select>
                                                </td>
                                                <td className="p-3">
                                                    <input
                                                        type="text"
                                                        placeholder="Baseline"
                                                        className="w-20 p-1 text-xs text-center border border-emerald-300 rounded bg-white font-bold"
                                                        value={inlineAddForm.kondisi_awal_nilai || ''}
                                                        onChange={e => setInlineAddForm({ ...inlineAddForm, kondisi_awal_nilai: e.target.value })}
                                                    />
                                                </td>
                                                <td className="p-3">
                                                    <input
                                                        type="number"
                                                        placeholder="Tahun"
                                                        className="w-16 p-1 text-xs text-center border border-emerald-300 rounded bg-white font-semibold"
                                                        value={inlineAddForm.kondisi_awal_tahun || 2024}
                                                        onChange={e => setInlineAddForm({ ...inlineAddForm, kondisi_awal_tahun: Number(e.target.value) })}
                                                    />
                                                </td>
                                                <td className="p-3">
                                                    <input
                                                        type="text"
                                                        placeholder="Tahap 1"
                                                        className="w-20 p-1 text-xs text-center border border-emerald-300 rounded bg-white font-extrabold"
                                                        value={inlineAddForm.target_tahap_1 || ''}
                                                        onChange={e => setInlineAddForm({ ...inlineAddForm, target_tahap_1: e.target.value })}
                                                    />
                                                </td>
                                                <td className="p-3">
                                                    <input
                                                        type="text"
                                                        placeholder="Tahap 2"
                                                        className="w-20 p-1 text-xs text-center border border-emerald-300 rounded bg-white font-extrabold"
                                                        value={inlineAddForm.target_tahap_2 || ''}
                                                        onChange={e => setInlineAddForm({ ...inlineAddForm, target_tahap_2: e.target.value })}
                                                    />
                                                </td>
                                                <td className="p-3">
                                                    <input
                                                        type="text"
                                                        placeholder="Tahap 3"
                                                        className="w-20 p-1 text-xs text-center border border-emerald-300 rounded bg-white font-extrabold"
                                                        value={inlineAddForm.target_tahap_3 || ''}
                                                        onChange={e => setInlineAddForm({ ...inlineAddForm, target_tahap_3: e.target.value })}
                                                    />
                                                </td>
                                                <td className="p-3">
                                                    <input
                                                        type="text"
                                                        placeholder="Tahap 4"
                                                        className="w-20 p-1 text-xs text-center border border-emerald-300 rounded bg-white font-extrabold"
                                                        value={inlineAddForm.target_tahap_4 || ''}
                                                        onChange={e => setInlineAddForm({ ...inlineAddForm, target_tahap_4: e.target.value })}
                                                        onKeyDown={e => e.key === 'Enter' && handleSaveInlineAdd()}
                                                    />
                                                </td>
                                                <td className="p-3 text-center">
                                                    <div className="flex justify-center gap-1">
                                                        <button
                                                            onClick={handleSaveInlineAdd}
                                                            className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors font-bold text-xs"
                                                            title="Simpan Indikator Baru"
                                                        >
                                                            <Check size={14} strokeWidth={3} />
                                                        </button>
                                                        <button
                                                            onClick={() => setInlineAddingType(null)}
                                                            className="p-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg transition-colors font-bold text-xs"
                                                            title="Batal"
                                                        >
                                                            <X size={14} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}

                                        {(selectedVisiId 
                                            ? indikatorList.filter(ind => { const s = sasaranList.find(sasa => sasa.id === ind.sasaran_pokok_id); const m = s && misiList.find(misi => misi.id === s.misi_id); return m && m.visi_id === selectedVisiId; }) 
                                            : indikatorList
                                        ).map((item) => (
                                            inlineEditingId === item.id && inlineEditingType === 'indikator' ? (
                                                /* Inline Edit Row for Indikator Target */
                                                <tr key={item.id} className="bg-amber-50/80 border-2 border-amber-400">
                                                    <td className="p-3 text-left">
                                                        <select
                                                            className="w-full p-1 text-[11px] font-semibold border border-amber-300 rounded mb-1 bg-white"
                                                            value={inlineForm.sasaran_pokok_id || ''}
                                                            onChange={e => setInlineForm({ ...inlineForm, sasaran_pokok_id: e.target.value })}
                                                        >
                                                            {sasaranList.map(s => (
                                                                <option key={s.id} value={s.id}>{s.kode_sasaran} - {s.sasaran_pokok}</option>
                                                            ))}
                                                        </select>
                                                        <input
                                                            type="text"
                                                            className="w-full p-1.5 text-xs font-bold border border-amber-300 rounded bg-white text-amber-950"
                                                            value={inlineForm.nama_indikator || ''}
                                                            onChange={e => setInlineForm({ ...inlineForm, nama_indikator: e.target.value })}
                                                        />
                                                    </td>
                                                    <td className="p-3">
                                                        <select
                                                            className="w-full p-1 text-xs border border-amber-300 rounded bg-white font-semibold"
                                                            value={inlineForm.satuan_id || ''}
                                                            onChange={e => setInlineForm({ ...inlineForm, satuan_id: e.target.value })}
                                                        >
                                                            <option value="">- Satuan -</option>
                                                            {satuanList.map(st => (
                                                                <option key={st.id} value={st.id}>{st.nama_satuan}</option>
                                                            ))}
                                                        </select>
                                                    </td>
                                                    <td className="p-3">
                                                        <input
                                                            type="text"
                                                            className="w-20 p-1 text-xs text-center border border-amber-300 rounded bg-white font-bold"
                                                            value={inlineForm.kondisi_awal_nilai || ''}
                                                            onChange={e => setInlineForm({ ...inlineForm, kondisi_awal_nilai: e.target.value })}
                                                        />
                                                    </td>
                                                    <td className="p-3">
                                                        <input
                                                            type="number"
                                                            className="w-16 p-1 text-xs text-center border border-amber-300 rounded bg-white font-semibold"
                                                            value={inlineForm.kondisi_awal_tahun || 2024}
                                                            onChange={e => setInlineForm({ ...inlineForm, kondisi_awal_tahun: Number(e.target.value) })}
                                                        />
                                                    </td>
                                                    <td className="p-3">
                                                        <input
                                                            type="text"
                                                            className="w-20 p-1 text-xs text-center border border-amber-300 rounded bg-white font-extrabold"
                                                            value={inlineForm.target_tahap_1 || ''}
                                                            onChange={e => setInlineForm({ ...inlineForm, target_tahap_1: e.target.value })}
                                                        />
                                                    </td>
                                                    <td className="p-3">
                                                        <input
                                                            type="text"
                                                            className="w-20 p-1 text-xs text-center border border-amber-300 rounded bg-white font-extrabold"
                                                            value={inlineForm.target_tahap_2 || ''}
                                                            onChange={e => setInlineForm({ ...inlineForm, target_tahap_2: e.target.value })}
                                                        />
                                                    </td>
                                                    <td className="p-3">
                                                        <input
                                                            type="text"
                                                            className="w-20 p-1 text-xs text-center border border-amber-300 rounded bg-white font-extrabold"
                                                            value={inlineForm.target_tahap_3 || ''}
                                                            onChange={e => setInlineForm({ ...inlineForm, target_tahap_3: e.target.value })}
                                                        />
                                                    </td>
                                                    <td className="p-3">
                                                        <input
                                                            type="text"
                                                            className="w-20 p-1 text-xs text-center border border-amber-300 rounded bg-white font-extrabold"
                                                            value={inlineForm.target_tahap_4 || ''}
                                                            onChange={e => setInlineForm({ ...inlineForm, target_tahap_4: e.target.value })}
                                                            onKeyDown={e => e.key === 'Enter' && handleSaveInline()}
                                                        />
                                                    </td>
                                                    <td className="p-3 text-center">
                                                        <div className="flex justify-center gap-1">
                                                            <button
                                                                onClick={handleSaveInline}
                                                                className="p-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors font-bold text-xs flex items-center gap-1"
                                                                title="Simpan Perubahan (Inline)"
                                                            >
                                                                <Check size={14} strokeWidth={3} />
                                                            </button>
                                                            <button
                                                                onClick={() => { setInlineEditingId(null); setInlineEditingType(null); }}
                                                                className="p-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg transition-colors font-bold text-xs"
                                                                title="Batal"
                                                            >
                                                                <X size={14} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ) : (
                                                /* Normal Row for Indikator Target */
                                                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                                                    <td className="p-4 text-left">
                                                        <div className="space-y-1">
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded text-[9px] font-black">
                                                                    {item.kode_sasaran}
                                                                </span>
                                                                <span className="text-[10px] font-bold text-slate-400 truncate max-w-[150px]" title={item.sasaran_nama}>
                                                                    {item.sasaran_nama}
                                                                </span>
                                                            </div>
                                                            <p className="text-sm font-extrabold text-slate-700 leading-snug">{item.nama_indikator}</p>
                                                        </div>
                                                    </td>
                                                    <td className="p-4 text-xs font-semibold text-slate-600">{item.satuan_nama || '-'}</td>
                                                    <td className="p-4 text-sm font-black text-slate-700 bg-slate-100/50">{item.kondisi_awal_nilai !== null ? item.kondisi_awal_nilai : '-'}</td>
                                                    <td className="p-4 text-xs font-semibold text-slate-500">{item.kondisi_awal_tahun || '-'}</td>
                                                    <td className="p-4 text-sm font-extrabold text-indigo-950 bg-indigo-50/20">{item.target_tahap_1 !== null ? item.target_tahap_1 : '-'}</td>
                                                    <td className="p-4 text-sm font-extrabold text-indigo-950 bg-indigo-50/20">{item.target_tahap_2 !== null ? item.target_tahap_2 : '-'}</td>
                                                    <td className="p-4 text-sm font-extrabold text-indigo-950 bg-indigo-50/20">{item.target_tahap_3 !== null ? item.target_tahap_3 : '-'}</td>
                                                    <td className="p-4 text-sm font-extrabold text-indigo-950 bg-indigo-50/20">{item.target_tahap_4 !== null ? item.target_tahap_4 : '-'}</td>
                                                    {canEdit && (
                                                        <td className="p-4">
                                                            <div className="flex justify-center gap-1">
                                                                <button
                                                                    onClick={() => startInlineEdit('indikator', item)}
                                                                    className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors"
                                                                    title="Edit Langsung di Baris Tabel (Tanpa Pop-up)"
                                                                >
                                                                    <Edit2 size={14} />
                                                                </button>
                                                                <button
                                                                    onClick={() => openEditEditor('indikator', item)}
                                                                    className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                                                                    title="Edit via Pop-up Modal"
                                                                >
                                                                    <Layers size={14} />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDelete('indikator', item.id)}
                                                                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                                                    title="Hapus"
                                                                >
                                                                    <Trash2 size={14} />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    )}
                                                </tr>
                                            )
                                        ))}
                                    </tbody>

                                </table>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>

            {/* FORM EDITOR MODAL */}
            {editorOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] animate-scale-up">
                        {/* Modal Header */}
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <div>
                                <h3 className="text-lg font-black text-slate-800">
                                    {editId ? 'Edit' : 'Tambah'} {editType === 'visi' ? 'Visi RPJPD' : editType === 'misi' ? 'Misi RPJPD' : editType === 'sasaran' ? 'Sasaran Pokok' : editType === 'arah' ? 'Arah Kebijakan' : 'Indikator'}
                                </h3>
                                <p className="text-xs text-slate-400 mt-1">Lengkapi form di bawah ini secara teliti.</p>
                            </div>
                            <button
                                onClick={() => setEditorOpen(false)}
                                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Modal Form */}
                        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
                            
                            {/* 1. VISI FORM */}
                            {editType === 'visi' && (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-2">Tahun Mulai Periode</label>
                                            <input
                                                type="number"
                                                required
                                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 font-semibold text-slate-700"
                                                value={formVisi.tahun_mulai}
                                                onChange={(e) => setFormVisi({ ...formVisi, tahun_mulai: Number(e.target.value) })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-2">Tahun Selesai Periode</label>
                                            <input
                                                type="number"
                                                required
                                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 font-semibold text-slate-700"
                                                value={formVisi.tahun_selesai}
                                                onChange={(e) => setFormVisi({ ...formVisi, tahun_selesai: Number(e.target.value) })}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-2">Rumusan Visi Jangka Panjang</label>
                                        <textarea
                                            required
                                            rows={3}
                                            placeholder="Pernyataan visi daerah..."
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 font-semibold text-slate-700"
                                            value={formVisi.visi}
                                            onChange={(e) => setFormVisi({ ...formVisi, visi: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-2">Keterangan / Catatan Dokumen (Opsional)</label>
                                        <textarea
                                            rows={2}
                                            placeholder="Catatan tambahan..."
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 font-semibold text-slate-700"
                                            value={formVisi.keterangan}
                                            onChange={(e) => setFormVisi({ ...formVisi, keterangan: e.target.value })}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* 2. MISI FORM */}
                            {editType === 'misi' && (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-2">Pilih Visi Induk</label>
                                        <select
                                            required
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 font-semibold text-slate-700"
                                            value={formMisi.visi_id}
                                            onChange={(e) => setFormMisi({ ...formMisi, visi_id: e.target.value })}
                                        >
                                            <option value="">-- Pilih Visi RPJPD --</option>
                                            {visiList.map(v => (
                                                <option key={v.id} value={v.id}>Periode {v.tahun_mulai}-{v.tahun_selesai}: "{v.visi.substring(0, 50)}..."</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-2">Kode Misi</label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="Contoh: 1, 2, atau 3"
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 font-semibold text-slate-700"
                                            value={formMisi.kode_misi}
                                            onChange={(e) => setFormMisi({ ...formMisi, kode_misi: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-2">Pernyataan Misi</label>
                                        <textarea
                                            required
                                            rows={4}
                                            placeholder="Rumusan misi pembangunan daerah..."
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 font-semibold text-slate-700"
                                            value={formMisi.misi}
                                            onChange={(e) => setFormMisi({ ...formMisi, misi: e.target.value })}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* 3. SASARAN FORM */}
                            {editType === 'sasaran' && (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-2">Hubungkan ke Misi</label>
                                        <select
                                            required
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 font-semibold text-slate-700"
                                            value={formSasaran.misi_id}
                                            onChange={(e) => setFormSasaran({ ...formSasaran, misi_id: e.target.value })}
                                        >
                                            <option value="">-- Pilih Misi Pendukung --</option>
                                            {misiList.map(m => (
                                                <option key={m.id} value={m.id}>Misi {m.kode_misi}: {m.misi.substring(0, 60)}...</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-2">Kode Sasaran Pokok</label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="Contoh: SP-1.1 atau 1.1"
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 font-semibold text-slate-700"
                                            value={formSasaran.kode_sasaran}
                                            onChange={(e) => setFormSasaran({ ...formSasaran, kode_sasaran: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-2">Rumusan Sasaran Pokok Jangka Panjang</label>
                                        <textarea
                                            required
                                            rows={4}
                                            placeholder="Pernyataan sasaran pokok..."
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 font-semibold text-slate-700"
                                            value={formSasaran.sasaran_pokok}
                                            onChange={(e) => setFormSasaran({ ...formSasaran, sasaran_pokok: e.target.value })}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* 4. ARAH KEBIJAKAN FORM */}
                            {editType === 'arah' && (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-2">Pilih Misi Pengampu</label>
                                        <select
                                            required
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 font-semibold text-slate-700"
                                            value={formArah.misi_id}
                                            onChange={(e) => setFormArah({ ...formArah, misi_id: e.target.value })}
                                        >
                                            <option value="">-- Pilih Misi RPJPD --</option>
                                            {misiList.map(m => (
                                                <option key={m.id} value={m.id}>Misi {m.kode_misi}: {m.misi.substring(0, 60)}...</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-2">Kode Arah Kebijakan (Angka Otomatis)</label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="Otomatis (1, 2, 3...)"
                                            className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl focus:outline-none font-extrabold text-indigo-600 text-xs"
                                            value={formArah.kode_arah_kebijakan || String(arahList.length + 1)}
                                            onChange={(e) => setFormArah({ ...formArah, kode_arah_kebijakan: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-2">Tahapan / Periodisasi RPJPD</label>
                                        <div className="flex items-center gap-2">
                                            <select
                                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 font-semibold text-slate-700 text-xs"
                                                value={formArah.tahapan || 'Tanpa Tahap / Semua Tahap'}
                                                onChange={(e) => setFormArah({ ...formArah, tahapan: e.target.value })}
                                            >
                                                {tahapanOptions.map(opt => (
                                                    <option key={opt} value={opt}>{opt}</option>
                                                ))}
                                            </select>
                                            <button
                                                type="button"
                                                onClick={() => setModalTambahTahapOpen(true)}
                                                className="px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl transition-colors flex-shrink-0 flex items-center text-xs shadow-sm"
                                                title="Tambah Tahapan RPJPD Baru"
                                            >
                                                <span>+ Tahap</span>
                                            </button>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-2">Rumusan Arah Kebijakan / Pembangunan Jangka Panjang</label>
                                        <textarea
                                            required
                                            rows={4}
                                            placeholder="Arah pembangunan jangka panjang..."
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 font-semibold text-slate-700"
                                            value={formArah.arah_kebijakan}
                                            onChange={(e) => setFormArah({ ...formArah, arah_kebijakan: e.target.value })}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* 5. INDIKATOR FORM */}
                            {editType === 'indikator' && (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-2">Hubungkan ke Sasaran Pokok</label>
                                            <select
                                                required
                                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 font-semibold text-slate-700"
                                                value={formIndikator.sasaran_pokok_id}
                                                onChange={(e) => setFormIndikator({ ...formIndikator, sasaran_pokok_id: e.target.value })}
                                            >
                                                <option value="">-- Pilih Sasaran Pokok --</option>
                                                {sasaranList.map(s => (
                                                    <option key={s.id} value={s.id}>{s.kode_sasaran}: {s.sasaran_pokok.substring(0, 50)}...</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-2">Pilih Satuan Pengukuran</label>
                                            <select
                                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 font-semibold text-slate-700"
                                                value={formIndikator.satuan_id}
                                                onChange={(e) => setFormIndikator({ ...formIndikator, satuan_id: e.target.value })}
                                            >
                                                <option value="">-- Pilih Satuan --</option>
                                                {satuanList.map(s => (
                                                    <option key={s.id} value={s.id}>{s.satuan}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-2">Nama Indikator Sasaran</label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="Contoh: Indeks Pembangunan Manusia (IPM)"
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 font-semibold text-slate-700"
                                            value={formIndikator.nama_indikator}
                                            onChange={(e) => setFormIndikator({ ...formIndikator, nama_indikator: e.target.value })}
                                        />
                                    </div>

                                    {/* Baseline Data */}
                                    <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-200/50">
                                        <div>
                                            <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-2">Nilai Baseline (Kondisi Awal)</label>
                                            <input
                                                type="number"
                                                step="any"
                                                placeholder="Contoh: 75.4"
                                                className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 font-semibold text-slate-700"
                                                value={formIndikator.kondisi_awal_nilai}
                                                onChange={(e) => setFormIndikator({ ...formIndikator, kondisi_awal_nilai: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-2">Tahun Baseline</label>
                                            <input
                                                type="number"
                                                placeholder="Contoh: 2024"
                                                className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 font-semibold text-slate-700"
                                                value={formIndikator.kondisi_awal_tahun}
                                                onChange={(e) => setFormIndikator({ ...formIndikator, kondisi_awal_tahun: Number(e.target.value) })}
                                            />
                                        </div>
                                    </div>

                                    {/* 4 Stages Targets (Horizontal input) */}
                                    <div>
                                        <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-3">Target per Tahap Perencanaan 20 Tahun (5 Tahunan)</label>
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                            <div className="bg-indigo-50/30 p-3 rounded-xl border border-indigo-100/50">
                                                <label className="block text-[9px] font-bold uppercase text-indigo-900 mb-1.5">Tahap I (Y1-5)</label>
                                                <input
                                                    type="number"
                                                    step="any"
                                                    placeholder="Target"
                                                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 text-xs font-bold text-slate-800"
                                                    value={formIndikator.target_tahap_1}
                                                    onChange={(e) => setFormIndikator({ ...formIndikator, target_tahap_1: e.target.value })}
                                                />
                                            </div>
                                            <div className="bg-indigo-50/30 p-3 rounded-xl border border-indigo-100/50">
                                                <label className="block text-[9px] font-bold uppercase text-indigo-900 mb-1.5">Tahap II (Y6-10)</label>
                                                <input
                                                    type="number"
                                                    step="any"
                                                    placeholder="Target"
                                                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 text-xs font-bold text-slate-800"
                                                    value={formIndikator.target_tahap_2}
                                                    onChange={(e) => setFormIndikator({ ...formIndikator, target_tahap_2: e.target.value })}
                                                />
                                            </div>
                                            <div className="bg-indigo-50/30 p-3 rounded-xl border border-indigo-100/50">
                                                <label className="block text-[9px] font-bold uppercase text-indigo-900 mb-1.5">Tahap III (Y11-15)</label>
                                                <input
                                                    type="number"
                                                    step="any"
                                                    placeholder="Target"
                                                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 text-xs font-bold text-slate-800"
                                                    value={formIndikator.target_tahap_3}
                                                    onChange={(e) => setFormIndikator({ ...formIndikator, target_tahap_3: e.target.value })}
                                                />
                                            </div>
                                            <div className="bg-indigo-50/30 p-3 rounded-xl border border-indigo-100/50">
                                                <label className="block text-[9px] font-bold uppercase text-indigo-900 mb-1.5">Tahap IV (Y16-20)</label>
                                                <input
                                                    type="number"
                                                    step="any"
                                                    placeholder="Target"
                                                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 text-xs font-bold text-slate-800"
                                                    value={formIndikator.target_tahap_4}
                                                    onChange={(e) => setFormIndikator({ ...formIndikator, target_tahap_4: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-2">Keterangan / Rumus Indikator (Opsional)</label>
                                        <textarea
                                            rows={2}
                                            placeholder="Metodologi/Keterangan tambahan..."
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 font-semibold text-slate-700"
                                            value={formIndikator.keterangan}
                                            onChange={(e) => setFormIndikator({ ...formIndikator, keterangan: e.target.value })}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Modal Footer */}
                            <div className="pt-4 border-t border-slate-100 flex justify-end gap-2 bg-white">
                                <button
                                    type="button"
                                    onClick={() => setEditorOpen(false)}
                                    className="px-4 py-2.5 text-xs font-extrabold text-slate-500 hover:bg-slate-50 rounded-xl transition-all"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50"
                                >
                                    <Save size={14} />
                                    {loading ? 'Menyimpan...' : 'Simpan Data'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Library Picker Modal */}
            {isLibraryPickerOpen && (
                <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsLibraryPickerOpen(false)} />
                    <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                         <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
                            <div>
                                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Pilih Dokumen</h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">Dari Perpustakaan Dokumen</p>
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
                                    className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs outline-none focus:border-indigo-500 transition-all placeholder:text-slate-400" 
                                    placeholder="Cari nama file..." 
                                    value={librarySearch}
                                    onChange={(e) => setLibrarySearch(e.target.value)}
                                    autoFocus
                                />
                            </div>
                        </div>
                        
                        <div className="p-4 overflow-y-auto space-y-2 flex-1 bg-slate-50/20">
                            {libraryDocs
                                .filter(doc => (doc.nama_file || '').toLowerCase().includes((librarySearch || '').toLowerCase()))
                                .map(doc => (
                                    <div 
                                        key={doc.id}
                                        className="p-3 bg-white rounded-2xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/10 transition-all cursor-pointer flex items-center justify-between group"
                                        onClick={() => handleSelectLibraryDoc(doc)}
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center shrink-0">
                                                <FileText size={16} />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-xs font-bold truncate max-w-[280px] text-slate-700">{doc.nama_file}</p>
                                                <p className="text-[9px] font-bold text-slate-400 uppercase">{doc.jenis_dokumen_nama || 'UMUM'}</p>
                                            </div>
                                        </div>
                                        <button className="text-[10px] font-black uppercase text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white bg-indigo-50 px-2.5 py-1.5 rounded-lg transition-all">
                                            Pilih
                                        </button>
                                    </div>
                                ))}
                            {libraryDocs.length === 0 && (
                                <div className="text-center py-8 text-slate-400 text-xs italic">
                                    Belum ada dokumen yang terunggah di perpustakaan.
                                </div>
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

            {/* History Modal */}
            {isHistoryModalOpen && (
                <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsHistoryModalOpen(false)} />
                    <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                         <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
                            <div>
                                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Riwayat Dokumen Perda</h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">Daftar unggahan & pembaruan berkas</p>
                            </div>
                            <button onClick={() => setIsHistoryModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                                <X size={18} className="text-slate-400" />
                            </button>
                        </div>
                        
                        <div className="p-5 overflow-y-auto space-y-4 flex-1 bg-slate-50/20">
                            {loadingHistory ? (
                                <div className="flex flex-col items-center justify-center py-12 gap-3">
                                    <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                                    <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Memuat riwayat...</span>
                                </div>
                            ) : historyDocs.length === 0 ? (
                                <div className="text-center py-12 text-slate-400 text-xs italic">
                                    Belum ada catatan riwayat perubahan dokumen ini.
                                </div>
                            ) : (
                                <div className="relative border-l-2 border-slate-100 ml-4 space-y-6">
                                    {historyDocs.map((log) => (
                                        <div key={log.id} className="relative pl-6">
                                            <div className="absolute -left-2 top-1.5 w-4 h-4 bg-indigo-500 border-4 border-white rounded-full shadow-sm"></div>
                                            <div className="bg-white border border-slate-200/60 rounded-2xl p-4 shadow-sm hover:border-slate-300 transition-all">
                                                <div className="flex justify-between items-start gap-4 mb-2">
                                                    <div>
                                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                                                            {new Date(log.created_at).toLocaleString('id-ID', {
                                                                day: 'numeric',
                                                                month: 'long',
                                                                year: 'numeric',
                                                                hour: '2-digit',
                                                                minute: '2-digit'
                                                            })}
                                                        </span>
                                                        <span className="text-xs font-extrabold text-slate-700 block mt-0.5">
                                                            {log.file_name}
                                                        </span>
                                                    </div>
                                                    {log.file_path && (
                                                        <a
                                                            href={getFileUrl(log.file_path)}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-[10px] font-black uppercase text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-2 py-1 rounded-lg"
                                                        >
                                                            Unduh
                                                        </a>
                                                    )}
                                                </div>
                                                <div className="text-[10px] text-slate-500 font-semibold mt-2 border-t border-slate-100 pt-2 flex flex-wrap gap-x-4">
                                                    <span>Oleh: <strong className="text-slate-600">{log.uploader_name}</strong></span>
                                                    {log.uploader_nip && <span>NIP: <strong className="text-slate-600">{log.uploader_nip}</strong></span>}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
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
            {/* Library Upload Modal */}
            {isLibraryUploadModalOpen && (
                <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => !uploadingToLibrary && setIsLibraryUploadModalOpen(false)} />
                    <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-200 flex flex-col">
                        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                                    <Upload size={18} strokeWidth={2.5} />
                                </div>
                                <div>
                                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Upload File Baru</h3>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">Unggah ke perpustakaan dokumen</p>
                                </div>
                            </div>
                            <button onClick={() => !uploadingToLibrary && setIsLibraryUploadModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                                <X size={18} className="text-slate-400" />
                            </button>
                        </div>
                        
                        <form onSubmit={handleLibraryUploadSubmit} className="flex flex-col">
                            <div className="p-5 space-y-4">
                                {/* File input */}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Pilih File</label>
                                    <input 
                                        type="file" 
                                        accept=".pdf,.doc,.docx,.xls,.xlsx,.zip,.rar,.7z"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                setUploadDocFile(file);
                                                const baseName = file.name.substring(0, file.name.lastIndexOf('.'));
                                                setUploadDocName(baseName);
                                            }
                                        }}
                                        className="w-full text-xs text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 transition-all border border-slate-200 rounded-2xl p-2 bg-slate-50/50"
                                        required
                                    />
                                </div>

                                {/* Visual file name */}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Nama Dokumen</label>
                                    <input 
                                        type="text" 
                                        value={uploadDocName}
                                        onChange={(e) => setUploadDocName(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs outline-none focus:bg-white focus:border-indigo-500 transition-all"
                                        placeholder="Masukkan nama dokumen untuk perpustakaan..."
                                        required
                                    />
                                </div>

                                {/* Jenis dokumen */}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Jenis Dokumen</label>
                                    <select
                                        value={uploadDocJenisId}
                                        onChange={(e) => setUploadDocJenisId(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs outline-none focus:bg-white focus:border-indigo-500 transition-all cursor-pointer"
                                        required
                                    >
                                        <option value="">-- Pilih Jenis Dokumen --</option>
                                        {jenisDokumenList.map((j) => (
                                            <option key={j.id} value={j.id}>
                                                {j.dokumen || j.nama || j.nama_jenis || j.jenis_dokumen_nama || `Jenis #${j.id}`}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Akses Dokumen (is_private) */}
                                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-200/50">
                                    <div>
                                        <span className="text-xs font-bold text-slate-700 block">Dokumen Privat</span>
                                        <span className="text-[10px] text-slate-400 block font-medium mt-0.5">Hanya dapat diakses oleh dinas/instansi Anda</span>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input 
                                            type="checkbox" 
                                            checked={uploadDocIsPrivate}
                                            onChange={(e) => setUploadDocIsPrivate(e.target.checked)}
                                            className="sr-only peer"
                                        />
                                        <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                                    </label>
                                </div>
                            </div>
                            
                            <div className="p-4 border-t border-slate-100 flex justify-end gap-2 bg-slate-50">
                                <button
                                    type="button"
                                    onClick={() => setIsLibraryUploadModalOpen(false)}
                                    disabled={uploadingToLibrary}
                                    className="px-4 py-2.5 text-xs font-extrabold text-slate-500 hover:bg-slate-200 rounded-xl transition-all"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={uploadingToLibrary}
                                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50"
                                >
                                    {uploadingToLibrary ? (
                                        <>
                                            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                            <span>Mengunggah...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Save size={14} />
                                            <span>Upload ke Perpustakaan</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* MODAL POPUP TAMBAH TAHAPAN RPJPD */}
            {modalTambahTahapOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-md w-full overflow-hidden transform transition-all">
                        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                                    <Plus size={18} strokeWidth={3} />
                                </div>
                                <h3 className="font-extrabold text-sm text-slate-800">Buat Tahapan RPJPD Baru</h3>
                            </div>
                            <button
                                onClick={() => setModalTambahTahapOpen(false)}
                                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <form onSubmit={handleCreateNewTahap} className="p-6 space-y-4">
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-2">Nama Tahap / Periodisasi</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Contoh: Tahap I, Tahap Khusus, Periode 1"
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 font-semibold text-slate-700 text-xs"
                                    value={newTahapName}
                                    onChange={(e) => setNewTahapName(e.target.value)}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-2">Tahun Mulai</label>
                                    <input
                                        type="number"
                                        required
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 font-semibold text-slate-700 text-xs"
                                        value={newTahapTahunMulai}
                                        onChange={(e) => setNewTahapTahunMulai(Number(e.target.value))}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-2">Tahun Selesai</label>
                                    <input
                                        type="number"
                                        required
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 font-semibold text-slate-700 text-xs"
                                        value={newTahapTahunSelesai}
                                        onChange={(e) => setNewTahapTahunSelesai(Number(e.target.value))}
                                    />
                                </div>
                            </div>

                            <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-100 text-xs text-indigo-900 font-medium">
                                <span className="font-bold">Pratinjau Format: </span>
                                <span className="font-extrabold text-indigo-600">
                                    {newTahapName.trim() ? `${newTahapName.trim()} (${newTahapTahunMulai}-${newTahapTahunSelesai})` : 'Nama Tahap (TahunMulai-TahunSelesai)'}
                                </span>
                            </div>

                            <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setModalTambahTahapOpen(false)}
                                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-1.5"
                                >
                                    <Save size={14} />
                                    <span>Simpan & Tambah ke Dropdown</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RpjpdInputPage;
