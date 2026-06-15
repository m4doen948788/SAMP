import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
    X, Inbox, Send, FileText, Calendar, Building2, LayoutGrid, Edit2, List, Plus, 
    RotateCcw, Eye, User, Loader2, Check, Clock, Upload, Search, CheckCircle2, Sparkles
} from 'lucide-react';
import { api } from '@/src/services/api';
import { SearchableSelect } from '@/src/features/common/components/SearchableSelect';

interface SuratRegistrationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (data: any) => void;
    initialData?: any;
    defaultType?: 'masuk' | 'keluar' | 'internal';
    defaultKegiatanId?: number | null;
    defaultKegiatanNama?: string;
    defaultEmployeeId?: number | null;
    initialFile?: File | null;
    initialJenisSuratId?: string | number | null;
    defaultTanggalMulai?: string;
    defaultTanggalAkhir?: string;
    defaultPerihal?: string;
    user: any;
}

interface KegiatanItem {
    id: number;
    tanggal: string;
    nama_kegiatan: string;
    instansi_penyelenggara: string;
}

const getSmartThematics = (perihal: string, tematikList: any[]) => {
    if (!perihal || !tematikList.length) return [];
    const text = perihal.toLowerCase();
    const suggestedIds: number[] = [];

    const mappings: { [key: string]: string[] } = {
        'stunting': ['stunting', 'gizi', 'stunt', 'anak kerdil', 'balita', 'posyandu', 'tumbuh kembang', 'makanan tambahan', 'pmt'],
        'kemiskinan': ['kemiskinan', 'miskin', 'penerima bantuan', 'pemberdayaan masyarakat', 'pkh', 'dtks', 'rentan', 'dhuafa', 'bansos', 'bantuan sosial', 'bdt'],
        'inflasi': ['inflasi', 'harga pangan', 'sembako', 'stabilitas harga', 'pasar murah', 'komoditas', 'tarif'],
        'kesetaraan gender': ['gender', 'pug', 'perempuan', 'anak', 'kekerasan perempuan', 'perlindungan anak', 'kb', 'kesetaraan', 'arus utama'],
        'pariwisata': ['pariwisata', 'wisata', 'destinasi', 'ekonomi kreatif', 'ekraf', 'budaya', 'seni'],
        'pertanian': ['tani', 'pertanian', 'pangan', 'pupuk', 'panen', 'irigasi', 'beras', 'peternakan', 'ternak', 'nelayan', 'perikanan', 'ikan', 'ketahanan pangan'],
        'kesehatan': ['sehat', 'kesehatan', 'medis', 'puskesmas', 'rumah sakit', 'rsud', 'penyakit', 'imunisasi', 'dbd', 'tbc', 'faskes', 'klinik', 'dokter', 'perawat', 'vaksin', 'imun'],
        'pendidikan': ['didik', 'pendidikan', 'sekolah', 'guru', 'murid', 'siswa', 'beasiswa', 'kurikulum', 'paud', 'sd', 'smp', 'sma', 'smk', 'kuliah', 'belajar', 'ajar'],
        'infrastruktur': ['infrastruktur', 'jalan', 'jembatan', 'drainase', 'trotoar', 'pengaspalan', 'bangunan', 'gedung', 'pupr', 'tata ruang', 'pemukiman', 'sanitasi', 'konstruksi'],
        'umkm': ['umkm', 'koperasi', 'usaha mikro', 'usaha kecil', 'pedagang', 'wirausaha', 'perijinan usaha', 'nib', 'industri kecil'],
        'digitalisasi': ['digital', 'digitalisasi', 'aplikasi', 'website', 'spbe', 'internet', 'smart city', 'teknologi', 'sistem informasi', 'software', 'hardware', 'jaringan', 'kominfo'],
        'kebencanaan': ['bencana', 'kebencanaan', 'banjir', 'gempa', 'longsor', 'kebakaran', 'bpbd', 'evakuasi', 'darurat', 'tanggap darurat'],
        'lingkungan': ['lingkungan', 'sampah', 'kebersihan', 'limbah', 'polusi', 'hijau', 'reboisasi', 'kehutanan', 'taman', 'iklim', 'perubahan iklim', 'amdal'],
        'kepemudaan': ['pemuda', 'olahraga', 'pora', 'karang taruna', 'atlet', 'turnamen', 'kompetisi', 'senam'],
        'kepegawaian': ['pegawai', 'asn', 'pns', 'pppk', 'sdm', 'kepegawaian', 'mutasi', 'promosi', 'diklat', 'sertifikasi', 'skp', 'cuti', 'pensiun', 'kinerja', 'absen', 'gaji', 'tpp', 'sakit']
    };

    tematikList.forEach(t => {
        const nameLower = (t.nama || t.nama_tematik || '').toLowerCase();
        let isMatched = false;
        
        if (text.includes(nameLower) || nameLower.includes(text)) {
            isMatched = true;
        }

        if (!isMatched) {
            for (const [key, keywords] of Object.entries(mappings)) {
                if (nameLower.includes(key) || key.includes(nameLower)) {
                    if (keywords.some(kw => text.includes(kw))) {
                        isMatched = true;
                        break;
                    }
                }
            }
        }

        if (isMatched) {
            suggestedIds.push(t.id);
        }
    });

    return suggestedIds;
};

export const SuratRegistrationModal: React.FC<SuratRegistrationModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
    initialData,
    defaultType = 'masuk',
    defaultKegiatanId = null,
    defaultKegiatanNama = '',
    defaultEmployeeId = null,
    initialFile = null,
    initialJenisSuratId = null,
    defaultTanggalMulai,
    defaultTanggalAkhir,
    defaultPerihal,
    user
}) => {
    const isSuperAdmin = user?.tipe_user_id === 1;
    const isAdminInstansi = user?.tipe_user_id === 2 || (user?.tipe_user_nama || '').toLowerCase().includes('admin instansi');
    const isSekretaris = (user?.jabatan_nama || '').toLowerCase().includes('sekretaris');
    const isAdmin = isSuperAdmin || isAdminInstansi || isSekretaris;

    // Modal States
    const [modalType, setModalType] = useState<'masuk' | 'keluar' | 'internal'>(defaultType);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);
    const [isKegiatanPickerOpen, setIsKegiatanPickerOpen] = useState(false);

    // Master Data States
    const [bidangList, setBidangList] = useState<any[]>([]);
    const [instansiList, setInstansiList] = useState<any[]>([]);
    const [jenisSuratList, setJenisSuratList] = useState<any[]>([]);
    const [pegawaiList, setPegawaiList] = useState<any[]>([]);
    const [tematikList, setTematikList] = useState<any[]>([]);

    // Form States
    const [isManualAsal, setIsManualAsal] = useState(false);
    const [formData, setFormData] = useState({
        nomor_surat: '',
        perihal: '',
        asal_surat: '',
        tujuan_surat: '',
        tanggal_surat: new Date().toISOString().split('T')[0],
        tanggal_acara: '',
        tanggal_akhir: '',
        jenis_surat_id: null as number | null,
        bidang_id: user?.bidang_id || null,
        isi_surat: '',
        jabatan_penanda: 'Kepala Bidang',
        nama_penanda: '',
        nip_penanda: '',
        kegiatan_id: defaultKegiatanId,
        kegiatan_nama: defaultKegiatanNama,
        employee_id: defaultEmployeeId || (([1, 2, 4, 5, 6, 7, 8, 9, 10].includes(Number(user?.tipe_user_id))) ? null : (user?.profil_pegawai_id || null)),
        tematik_ids: [] as number[],
    });

    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [customFileName, setCustomFileName] = useState('');
    const [uploadedDocId, setUploadedDocId] = useState<number | null>(null);
    const [currentFileInfo, setCurrentFileInfo] = useState<{name: string, path: string} | null>(null);
    const [historyStyle, setHistoryStyle] = useState<React.CSSProperties>({});
    const [historyPos, setHistoryPos] = useState({ top: 0, left: 0 });
    const [showAllPegawai, setShowAllPegawai] = useState(false);
    const [filterInstansi, setFilterInstansi] = useState<string>('');
    const [showDraftPrompt, setShowDraftPrompt] = useState(false);
    const [isDragging, setIsDragging] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const manuallyRemovedIdsRef = useRef<Set<number>>(new Set());
    const lastPerihalCheckedRef = useRef('');

    const smartRecommendations = useMemo(() => {
        if (!formData.perihal || !tematikList.length) return [];
        const matchedIds = getSmartThematics(formData.perihal, tematikList);
        return tematikList.filter(t => matchedIds.includes(t.id));
    }, [formData.perihal, tematikList]);

    const mappedTematikList = useMemo(() => {
        return tematikList.map(t => ({
            ...t,
            nama: t.nama || t.nama_tematik
        }));
    }, [tematikList]);

    const DRAFT_KEY = (type: string) => `nayaxa_draft_surat_${type}`;



    // --- Master Data Fetching ---
    useEffect(() => {
        if (isOpen) {
            fetchMasterData();
        }
    }, [isOpen]);

    const fetchMasterData = async () => {
        try {
            const wrapPromise = (promise: Promise<any>) => promise.catch(err => {
                console.error('API call failed:', err);
                return { success: false, data: [] };
            });

            const [bidangRes, instansiRes, jenisDokRes, masterDokRes, pegawaiRes, tematikRes] = await Promise.all([
                wrapPromise(api.bidangInstansi.getAll()),
                wrapPromise(api.instansiDaerah.getAll()),
                wrapPromise(api.jenisDokumen.getAll()),
                wrapPromise(api.masterDataConfig.getDataByTable('master_dokumen')),
                wrapPromise(api.profilPegawai.getAll()),
                wrapPromise(api.masterDataConfig.getDataByTable('master_tematik'))
            ]);
            
            if (bidangRes.success) {
                let list = bidangRes.data;
                if (user?.tipe_user_id !== 1) {
                    list = list.filter((b: any) => b.instansi_id === user?.instansi_id);
                }
                setBidangList(list);
            }

            if (instansiRes.success) setInstansiList(instansiRes.data);

            if (jenisDokRes.success && masterDokRes.success) {
                const suratType = jenisDokRes.data.find((j: any) => j.nama === 'Surat');
                if (suratType) {
                    const filtered = masterDokRes.data.filter((d: any) => d.jenis_dokumen_id === suratType.id);
                    setJenisSuratList(filtered);
                }
            }

            if (pegawaiRes.success) {
                setPegawaiList(pegawaiRes.data);
            }

            if (tematikRes.success) {
                setTematikList(tematikRes.data);
            }
        } catch (err) {
            console.error('Failed to fetch master data:', err);
        }
    };

    // --- Initialization ---
    useEffect(() => {
        if (isOpen) {
            manuallyRemovedIdsRef.current.clear();
            lastPerihalCheckedRef.current = '';
            if (initialData) {
                setEditId(initialData.id);
                setModalType(initialData.tipe_surat || defaultType);
                setFormData({
                    nomor_surat: initialData.nomor_surat || '',
                    perihal: initialData.perihal || '',
                    asal_surat: initialData.asal_surat || '',
                    tujuan_surat: initialData.tujuan_surat || '',
                    tanggal_surat: initialData.tanggal_surat ? initialData.tanggal_surat.split('T')[0] : new Date().toISOString().split('T')[0],
                    tanggal_acara: initialData.tanggal_acara ? initialData.tanggal_acara.split('T')[0] : '',
                    jenis_surat_id: initialData.master_dokumen_id || initialData.jenis_surat_id || null,
                    bidang_id: initialData.bidang_id || user?.bidang_id || null,
                    isi_surat: '',
                    jabatan_penanda: 'Kepala Bidang',
                    nama_penanda: '',
                    nip_penanda: '',
                    kegiatan_id: initialData.kegiatan_id_terkait || defaultKegiatanId,
                    kegiatan_nama: initialData.nama_kegiatan_terkait || defaultKegiatanNama,
                    employee_id: initialData.employee_id || null,
                    tanggal_akhir: initialData.tanggal_akhir ? initialData.tanggal_akhir.split('T')[0] : '',
                    tematik_ids: initialData.tematik_ids ? String(initialData.tematik_ids).split(',').map(Number) : [],
                });
                setUploadedDocId(initialData.dokumen_id || null);
                setCustomFileName(initialData.nama_file?.split('.')[0] || '');
                setCurrentFileInfo(initialData.nama_file ? {
                    name: initialData.nama_file,
                    path: initialData.file_path || ''
                } : null);
            } else if (initialFile) {
                setModalType(defaultType);
                setSelectedFile(initialFile);
                setCustomFileName(initialFile.name.split('.').slice(0, -1).join('.'));
                if (initialJenisSuratId) {
                    const idAsNumber = Number(initialJenisSuratId);
                    setFormData(prev => ({ ...prev, jenis_surat_id: isNaN(idAsNumber) ? initialJenisSuratId : idAsNumber }));
                }
            } else {
                setEditId(null);
                setModalType(defaultType);
                setFormData(prev => ({
                    ...prev,
                    nomor_surat: '',
                    perihal: defaultPerihal || '',
                    asal_surat: '',
                    tujuan_surat: '',
                    tanggal_surat: defaultTanggalMulai || new Date().toISOString().split('T')[0],
                    tanggal_acara: defaultTanggalMulai || '',
                    tanggal_akhir: defaultTanggalAkhir || '',
                    jenis_surat_id: initialJenisSuratId ? Number(initialJenisSuratId) : null,
                    bidang_id: user?.bidang_id || null,
                    kegiatan_id: defaultKegiatanId,
                    kegiatan_nama: defaultKegiatanNama,
                    employee_id: defaultEmployeeId || (([1, 2, 4, 5, 6, 7, 8, 9, 10].includes(Number(user?.tipe_user_id))) ? null : (user?.profil_pegawai_id || null)),
                }));
                setSelectedFile(null);
                setCustomFileName('');
                setUploadedDocId(null);
                setCurrentFileInfo(null);
                
                // Check for draft
                if (localStorage.getItem(DRAFT_KEY(defaultType))) {
                    setShowDraftPrompt(true);
                }
            }
        }
    }, [isOpen, initialData, defaultType, defaultKegiatanId, initialFile, initialJenisSuratId, defaultTanggalMulai, defaultTanggalAkhir, defaultPerihal]);

    // --- Auto-numbering for Surat Keluar ---
    useEffect(() => {
        const fetchNextNumber = async () => {
            if (isOpen && !editId && modalType === 'keluar') {
                const bId = user?.bidang_id || formData.bidang_id;
                if (bId) {
                    try {
                        const res = await api.surat.getNextNumber(Number(bId));
                        if (res.success) {
                            setFormData(prev => ({ ...prev, nomor_surat: res.next_number }));
                        }
                    } catch (err) {
                        console.error('Failed to get next number:', err);
                    }
                }
            }
        };
        fetchNextNumber();
    }, [isOpen, modalType, editId, user?.bidang_id, formData.bidang_id]);

    // --- Automatic Default Letter Type ---
    useEffect(() => {
        if (isOpen && !editId && jenisSuratList.length > 0 && !formData.jenis_surat_id && !initialJenisSuratId) {
            let searchStr = '';
            if (modalType === 'masuk') searchStr = 'undangan masuk';
            else if (modalType === 'keluar') searchStr = 'surat keluar';
            else if (modalType === 'internal') searchStr = 'surat internal';

            if (searchStr) {
                const defaultSurat = jenisSuratList.find(s => 
                    (s.dokumen || '').toLowerCase().includes(searchStr)
                );
                if (defaultSurat) {
                    setFormData(prev => ({ ...prev, jenis_surat_id: defaultSurat.id }));
                }
            }
        }
    }, [isOpen, editId, modalType, jenisSuratList, formData.jenis_surat_id]);

    // --- Intelligent Default based on Perihal (Cuti/Sakit) ---
    useEffect(() => {
        if (!isOpen || editId || !formData.perihal || !jenisSuratList.length) return;
        
        const perihalLower = formData.perihal.toLowerCase();
        let matchedId = null;

        if (perihalLower.includes('cuti')) {
            const found = jenisSuratList.find(s => (s.dokumen || '').toLowerCase().includes('cuti'));
            if (found) matchedId = found.id;
        } else if (perihalLower.includes('sakit')) {
            const found = jenisSuratList.find(s => (s.dokumen || '').toLowerCase().includes('sakit'));
            if (found) matchedId = found.id;
        }

        if (matchedId && formData.jenis_surat_id !== matchedId) {
            setFormData(prev => ({ ...prev, jenis_surat_id: matchedId }));
        }
    }, [formData.perihal, isOpen, editId, jenisSuratList]);

    // --- Intelligent Thematic Auto-selection based on Perihal ---
    useEffect(() => {
        if (!isOpen || editId || !formData.perihal || !tematikList.length) return;

        const currentPerihal = formData.perihal.trim();
        if (currentPerihal === lastPerihalCheckedRef.current) return;
        lastPerihalCheckedRef.current = currentPerihal;

        const matchedIds = getSmartThematics(currentPerihal, tematikList);
        const filteredMatchedIds = matchedIds.filter(id => !manuallyRemovedIdsRef.current.has(id));

        if (filteredMatchedIds.length > 0) {
            setFormData(prev => {
                const uniqueIds = Array.from(new Set([...prev.tematik_ids, ...filteredMatchedIds]));
                if (uniqueIds.length !== prev.tematik_ids.length) {
                    return { ...prev, tematik_ids: uniqueIds };
                }
                return prev;
            });
        }
    }, [formData.perihal, isOpen, editId, tematikList]);

    // --- Draft Logic ---
    useEffect(() => {
        if (!isOpen) return;
        const timer = setTimeout(() => {
            const isSignificant = formData.nomor_surat?.trim() || formData.perihal?.trim();
            if (isSignificant) {
                const draftData = { formData, customFileName, timestamp: new Date().getTime() };
                localStorage.setItem(DRAFT_KEY(modalType), JSON.stringify(draftData));
            }
        }, 1000);
        return () => clearTimeout(timer);
    }, [formData, customFileName, isOpen, modalType]);
    
    // --- Computed Options ---
    const filteredPegawaiList = useMemo(() => {
        if (!pegawaiList) return [];
        const isSuperAdmin = user?.tipe_user_id === 1;

        if (showAllPegawai) return pegawaiList;
        
        if (isSuperAdmin) {
            if (filterInstansi) {
                return pegawaiList.filter(p => Number(p.instansi_id) === Number(filterInstansi));
            }
            return pegawaiList;
        }

        const userBidangId = Number(user?.bidang_id);
        if (!userBidangId) return pegawaiList;
        return pegawaiList.filter(p => Number(p.bidang_id) === userBidangId);
    }, [pegawaiList, showAllPegawai, user?.bidang_id, user?.tipe_user_id, filterInstansi]);

    const mappedPegawaiOptions = useMemo(() => {
        return filteredPegawaiList.map(p => ({
            id: p.id,
            nama_lengkap: p.nama_lengkap,
            nip: p.nip,
            bidang_singkatan: p.bidang_singkatan || '',
            jabatan_id: p.jabatan_id
        }));
    }, [filteredPegawaiList]);

    const handleLoadDraft = () => {
        const saved = localStorage.getItem(DRAFT_KEY(modalType));
        if (saved) {
            const { formData: savedData, customFileName: savedName } = JSON.parse(saved);
            setFormData(savedData);
            if (savedName) setCustomFileName(savedName);
            setShowDraftPrompt(false);
        }
    };

    const clearDraft = (type: string) => localStorage.removeItem(DRAFT_KEY(type));
    
    // --- Drag and Drop Handlers ---
    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        
        const file = e.dataTransfer.files ? e.dataTransfer.files[0] : null;
        if (file) {
            setSelectedFile(file);
            setCustomFileName(file.name.split('.').slice(0, -1).join('.'));
        }
    };

    // --- Handlers ---
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setIsSubmitting(true);
            
            if (modalType === 'masuk' || modalType === 'internal' || (modalType === 'keluar' && (selectedFile || uploadedDocId))) {
                if (!selectedFile && !uploadedDocId) {
                    alert(`Silakan unggah file surat ${modalType === 'masuk' ? 'masuk' : (modalType === 'internal' ? 'internal' : 'keluar')}!`);
                    setIsSubmitting(false);
                    return;
                }
                
                if (!formData.jenis_surat_id || !formData.bidang_id || !formData.perihal) {
                    alert('Harap isi Jenis Surat, Bidang, dan Perihal!');
                    setIsSubmitting(false);
                    return;
                }

                let finalDocId = uploadedDocId;
                let uploadResData: any = null;

                if (!finalDocId && selectedFile) {
                    const fileForm = new FormData();
                    fileForm.append('file', selectedFile);
                    const extension = selectedFile.name.split('.').pop();
                    const finalFileName = `${customFileName}.${extension}`;
                    fileForm.append('nama_file', finalFileName);
                    fileForm.append('jenis_dokumen_id', String(formData.jenis_surat_id)); 
                    
                    const uploadRes = await api.dokumen.upload(fileForm);
                    if (uploadRes.success) {
                        finalDocId = uploadRes.data.id;
                        uploadResData = uploadRes.data;
                    } else {
                        throw new Error(uploadRes.message || 'Gagal mengunggah file.');
                    }
                }

                const payload = { ...formData, dokumen_id: finalDocId, tipe_surat: modalType };
                const saveRes = editId ? await api.surat.update(editId, payload) : await api.surat.saveMasuk(payload);

                if (saveRes.success) {
                    clearDraft(modalType);
                    const enrichedRes = {
                        ...saveRes,
                        data: saveRes.data || {
                            id: finalDocId,
                            dokumen_id: finalDocId,
                            nama_file: uploadResData ? uploadResData.nama_file : (selectedFile ? selectedFile.name : (formData.nomor_surat || formData.perihal)),
                            file_path: uploadResData ? uploadResData.path : '',
                            tipe_surat: modalType,
                            nomor_surat: formData.nomor_surat,
                            jenis_surat_nama: jenisSuratList.find(js => js.id === formData.jenis_surat_id)?.jenis_surat || ''
                        }
                    };
                    onSuccess(enrichedRes);
                } else {
                    throw new Error(saveRes.message || 'Gagal menyimpan surat.');
                }
            } else {
                // Automated Surat Keluar (only if no file is uploaded and it's 'keluar')
                if (editId) {
                    const saveRes = await api.surat.update(editId, { ...formData });
                    if (saveRes.success) {
                        onSuccess(saveRes);
                    } else {
                        throw new Error(saveRes.message);
                    }
                } else {
                    const res = await api.surat.generateKeluar(formData);
                    if (res.success) {
                        onSuccess(res);
                        window.open(res.data.path, '_blank');
                    } else {
                        throw new Error(res.message);
                    }
                }
            }
        } catch (err: any) {
            console.error('Submit Error:', err);
            alert('Gagal menyimpan surat: ' + err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const isSuratCuti = !!(jenisSuratList.find(j => j.id === formData.jenis_surat_id)?.dokumen?.toLowerCase().includes('cuti'));
    const isKegiatanLocked = !!defaultKegiatanId || modalType === 'internal';

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
             <div className="relative w-full max-w-5xl h-[85vh] flex flex-col">
                {/* Draft Alert */}
                {showDraftPrompt && (
                    <div className="absolute -top-12 left-0 right-0 flex justify-center z-[101] animate-in slide-in-from-top-2">
                        <button 
                            onClick={handleLoadDraft}
                            className="bg-amber-500 text-white px-4 py-2 rounded-xl shadow-lg hover:bg-amber-600 transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
                        >
                            <RotateCcw size={14} /> Pulihkan Draf Terakhir
                        </button>
                    </div>
                )}

                <div className="bg-white rounded-[2.5rem] w-full overflow-hidden shadow-2xl border border-white/20 animate-in zoom-in-95 duration-300 h-full flex flex-col">
                    <form onSubmit={handleSubmit} className="flex flex-col h-full min-h-0">
                        <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between bg-white shrink-0">
                            <div>
                                <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                                    <div className={`p-2 rounded-xl text-white ${modalType === 'masuk' ? 'bg-blue-600 shadow-lg shadow-blue-100' : modalType === 'internal' ? 'bg-indigo-600 shadow-lg shadow-indigo-100' : 'bg-emerald-600 shadow-lg shadow-emerald-100'}`}>
                                        {modalType === 'masuk' ? <Inbox size={20} /> : modalType === 'internal' ? <Upload size={20} /> : <Send size={20} />}
                                    </div>
                                    {editId ? 'Edit Data Surat' : (modalType === 'masuk' ? 'Registrasi Surat Masuk' : modalType === 'internal' ? 'Upload Surat Internal' : 'Registrasi Surat Keluar')}
                                </h2>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                                    {(modalType === 'internal' || modalType === 'keluar') ? 'Unggah dokumen yang sudah ada' : 'Lengkapi informasi dokumen surat'}
                                </p>
                            </div>
                            <button type="button" onClick={onClose} className="p-2 hover:bg-slate-50 rounded-xl text-slate-400 hover:text-rose-500 transition-all border border-transparent hover:border-slate-100">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden divide-y md:divide-y-0 md:divide-x divide-slate-100">
                            {/* Panel Kiri: Upload Area & Preview File */}
                            <div className="w-full md:w-[38%] p-8 overflow-y-auto space-y-6 bg-slate-50/50 flex flex-col shrink-0 custom-scrollbar">
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <label className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${
                                            modalType === 'masuk' ? 'text-blue-600' : modalType === 'internal' ? 'text-indigo-600' : 'text-emerald-600'
                                        }`}>
                                            <Upload size={14} /> Dokumen Lampiran
                                        </label>
                                    </div>
                                    <div 
                                        onClick={() => fileInputRef.current?.click()}
                                        onDragOver={handleDragOver}
                                        onDragLeave={handleDragLeave}
                                        onDrop={handleDrop}
                                        className={`border-2 border-dashed rounded-3xl p-8 flex flex-col items-center justify-center gap-4 transition-all cursor-pointer min-h-[220px] ${
                                            isDragging 
                                                ? 'border-indigo-400 bg-indigo-50/50 text-indigo-600 scale-[1.02] shadow-xl animate-pulse' 
                                                : (selectedFile || currentFileInfo ? 'border-emerald-200 bg-emerald-50/30 text-emerald-600' : 'border-slate-200 hover:border-indigo-200 hover:bg-slate-50 text-slate-400')
                                        }`}
                                    >
                                        <input 
                                            type="file" className="hidden" ref={fileInputRef} 
                                            onChange={(e) => {
                                                const file = e.target.files ? e.target.files[0] : null;
                                                setSelectedFile(file);
                                                if (file) setCustomFileName(file.name.split('.').slice(0, -1).join('.'));
                                            }} 
                                        />
                                        {!selectedFile && !currentFileInfo ? (
                                            <>
                                                <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-md text-slate-400 hover:text-indigo-500 transition-colors">
                                                    <Plus size={28} />
                                                </div>
                                                <div className="text-center">
                                                    <p className="text-xs font-black text-slate-700 uppercase tracking-wider">Pilih / Tarik File</p>
                                                    <p className="text-[10px] text-slate-400 font-bold mt-1">PDF, Gambar (Maks. 50MB)</p>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="flex flex-col items-center gap-1 animate-in zoom-in-95">
                                                <div className="flex flex-col items-center gap-3 text-center">
                                                    <div className="p-4 bg-white rounded-2xl shadow-md text-emerald-500"><FileText size={40} /></div>
                                                    <div>
                                                        <p className="text-xs font-black truncate max-w-[180px] text-slate-800">{selectedFile?.name || currentFileInfo?.name}</p>
                                                        <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mt-1">Siap Diunggah</p>
                                                    </div>
                                                </div>
                                                <p className={`text-[9px] font-black bg-white px-3 py-1.5 rounded-full border shadow-sm mt-3 animate-pulse ${
                                                    modalType === 'masuk' ? 'text-blue-500 border-blue-100' : modalType === 'internal' ? 'text-indigo-500 border-indigo-100' : 'text-emerald-500 border-emerald-100'
                                                }`}>
                                                    Klik ulang untuk mengganti file
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {selectedFile && (
                                    <div className="p-5 bg-white rounded-3xl border border-slate-100 flex flex-col gap-3 shadow-sm animate-in slide-in-from-top-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nama File di Sistem</label>
                                        <div className="flex items-center gap-2">
                                            <input 
                                                type="text" className="input-modern bg-slate-50 w-full font-black h-[42px] focus:bg-white" value={customFileName}
                                                onChange={(e) => setCustomFileName(e.target.value)}
                                            />
                                            <span className="text-xs font-black text-slate-400 bg-slate-100 px-3 py-2.5 rounded-xl border border-slate-200 select-none">
                                                .{selectedFile.name.split('.').pop()}
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Panel Kanan: Form Isian Metadata (Scrollable) */}
                            <div className="flex-1 p-8 overflow-y-auto space-y-6 bg-white custom-scrollbar">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div className="space-y-1.5">
                                        <div className="flex items-center justify-between min-h-[18px]">
                                            <label className="text-[10px] font-black text-indigo-600 uppercase tracking-widest ml-1 whitespace-nowrap">
                                                {modalType === 'internal' ? 'Nomor Surat (Jika Ada)' : 'Nomor Surat'}
                                            </label>
                                        </div>
                                        <input 
                                            type="text" 
                                            className="input-modern w-full font-bold text-slate-700 h-[42px] disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed disabled:border-slate-100" 
                                            placeholder={modalType === 'internal' ? 'Otomatis diisi oleh sistem' : '--/--/--/--'}
                                            disabled={modalType === 'internal'}
                                            value={formData.nomor_surat} onChange={(e) => setFormData({...formData, nomor_surat: e.target.value})}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <div className="flex items-center justify-between min-h-[18px]">
                                            <label className="text-[10px] font-black text-indigo-600 uppercase tracking-widest ml-1 whitespace-nowrap">
                                                {modalType === 'masuk' ? 'Tanggal Surat' : modalType === 'internal' ? 'Tanggal Dokumen' : 'Tanggal Surat Dibuat'}
                                            </label>
                                        </div>
                                        <input 
                                            required type="date" className="input-modern w-full font-bold text-slate-700 h-[42px]"
                                            value={formData.tanggal_surat} onChange={(e) => setFormData({...formData, tanggal_surat: e.target.value})}
                                        />
                                    </div>

                                    {modalType === 'keluar' && (
                                        <div className="space-y-1.5 animate-in slide-in-from-top-2">
                                            <div className="flex items-center justify-between min-h-[18px]">
                                                <label className="text-[10px] font-black text-indigo-600 uppercase tracking-widest ml-1 whitespace-nowrap overflow-hidden text-ellipsis">
                                                    Tujuan Surat
                                                </label>
                                            </div>
                                            <input 
                                                type="text" className="input-modern w-full font-bold text-slate-700 h-[42px]" placeholder="Ketik tujuan surat..."
                                                value={formData.tujuan_surat} onChange={(e) => setFormData({...formData, tujuan_surat: e.target.value})}
                                            />
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 animate-in slide-in-from-top-2">
                                    <div className="space-y-1.5">
                                        <div className="flex items-center justify-between min-h-[18px]">
                                            <label className="text-[10px] font-black text-indigo-600 uppercase tracking-widest ml-1 whitespace-nowrap">Jenis Surat</label>
                                        </div>
                                        <SearchableSelect 
                                            label="Pilih Jenis Surat" value={formData.jenis_surat_id} options={jenisSuratList} displayField="dokumen"
                                            onChange={(val) => {
                                                const isCuti = jenisSuratList.find(j => j.id === val)?.dokumen?.toLowerCase().includes('cuti');
                                                setFormData({
                                                    ...formData,
                                                    jenis_surat_id: val,
                                                    ...(isCuti ? { tematik_ids: [], kegiatan_id: null, kegiatan_nama: '' } : {})
                                                });
                                            }}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <div className="flex items-center justify-between min-h-[18px]">
                                            <label className="text-[10px] font-black text-indigo-600 uppercase tracking-widest ml-1 whitespace-nowrap">Tanggal Mulai</label>
                                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">Opsional</span>
                                        </div>
                                        <input 
                                            type="date" className="input-modern w-full font-bold text-slate-700 h-[42px]"
                                            value={formData.tanggal_acara} onChange={(e) => setFormData({...formData, tanggal_acara: e.target.value})}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <div className="flex items-center justify-between min-h-[18px]">
                                            <label className="text-[10px] font-black text-indigo-600 uppercase tracking-widest ml-1 whitespace-nowrap">Sampai Tanggal</label>
                                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">Opsional</span>
                                        </div>
                                        <input 
                                            type="date" className="input-modern w-full font-bold text-slate-700 h-[42px]"
                                            value={formData.tanggal_akhir} onChange={(e) => setFormData({...formData, tanggal_akhir: e.target.value})}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between min-h-[18px]">
                                        <label className="text-[10px] font-black text-indigo-600 uppercase tracking-widest ml-1">Perihal / Subjek</label>
                                    </div>
                                    <textarea 
                                        required rows={2} className="input-modern w-full font-bold resize-none" placeholder="Tuliskan ringkasan perihal surat..."
                                        value={formData.perihal} onChange={(e) => setFormData({...formData, perihal: e.target.value})}
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div className="space-y-1.5">
                                        <div className="flex items-center justify-between min-h-[18px]">
                                            <label className="text-[10px] font-black text-indigo-600 uppercase tracking-widest ml-1 whitespace-nowrap">
                                                {modalType === 'masuk' ? 'Bidang Yang Dituju' : 'Bidang Pengampu'}
                                            </label>
                                        </div>
                                        <SearchableSelect 
                                            label="Bidang" value={formData.bidang_id} options={bidangList} displayField="nama_bidang" secondaryField="singkatan"
                                            onChange={(val) => setFormData({...formData, bidang_id: val})}
                                        />
                                    </div>
                                    {modalType === 'masuk' && (
                                        <div className="space-y-1.5">
                                            <div className="flex items-center justify-between min-h-[18px]">
                                                <label className="text-[10px] font-black text-indigo-600 uppercase tracking-widest ml-1 whitespace-nowrap overflow-hidden text-ellipsis">
                                                    Asal Instansi / Surat
                                                </label>
                                                <button 
                                                    type="button" onClick={() => { setIsManualAsal(!isManualAsal); setFormData({...formData, asal_surat: ''}); }}
                                                    className="text-[9px] font-bold text-slate-400 hover:text-indigo-600 flex items-center gap-1 transition-colors uppercase tracking-tight shrink-0 bg-slate-100 hover:bg-indigo-50 px-2 py-0.5 rounded-md"
                                                >
                                                    {isManualAsal ? <><LayoutGrid size={10} /> Pilih</> : <><Edit2 size={10} /> Lainnya</>}
                                                </button>
                                            </div>
                                            {isManualAsal ? (
                                                <input 
                                                    required type="text" className="input-modern w-full font-bold text-slate-700 h-[42px] animate-in slide-in-from-top-2" placeholder="Ketik asal surat manual..."
                                                    value={formData.asal_surat} onChange={(e) => setFormData({...formData, asal_surat: e.target.value})}
                                                />
                                            ) : (
                                                <SearchableSelect 
                                                    label="Instansi Asal" value={formData.asal_surat} options={instansiList} keyField="instansi" displayField="instansi"
                                                    onChange={(val) => setFormData({...formData, asal_surat: val})}
                                                />
                                            )}
                                        </div>
                                    )}

                                    {modalType === 'internal' && (
                                        <div className="space-y-1.5 animate-in slide-in-from-top-2">
                                            <div className="flex items-center justify-between min-h-[18px]">
                                                <label className="text-[10px] font-black text-indigo-600 uppercase tracking-widest ml-1 whitespace-nowrap">Pegawai Terkait</label>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Semua Bidang</span>
                                                    <button 
                                                        type="button"
                                                        onClick={() => setShowAllPegawai(!showAllPegawai)}
                                                        className={`w-6 h-3 rounded-full transition-all relative ${showAllPegawai ? 'bg-indigo-600' : 'bg-slate-200'}`}
                                                    >
                                                        <div className={`absolute top-0.5 w-2 h-2 rounded-full bg-white transition-all ${showAllPegawai ? 'left-3.5' : 'left-0.5'}`} />
                                                    </button>
                                                </div>
                                            </div>
                                            <SearchableSelect 
                                                label="Pilih Pegawai" 
                                                value={formData.employee_id} 
                                                options={mappedPegawaiOptions} 
                                                displayField="nama_lengkap" 
                                                secondaryField="bidang_singkatan"
                                                onChange={(val) => setFormData({...formData, employee_id: val})}
                                            />
                                        </div>
                                    )}
                                </div>

                                {!isSuratCuti && (
                                    <div className="space-y-1.5">
                                        <div className="flex justify-between items-center mb-1 ml-1">
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Tagging / Tematik (Opsional)</label>
                                            {smartRecommendations.length > 0 && modalType !== 'internal' && (
                                                <span className="text-[9px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full flex items-center gap-1.5 animate-pulse">
                                                    <Sparkles size={10} /> Terdeteksi Otomatis
                                                </span>
                                            )}
                                        </div>

                                        {/* Smart Recommendations Section */}
                                        {smartRecommendations.length > 0 && modalType !== 'internal' && (
                                            <div className="flex flex-wrap gap-1.5 items-center p-2.5 bg-indigo-50/20 border border-indigo-100/30 rounded-2xl mb-1.5 animate-in slide-in-from-top-1 duration-200">
                                                <span className="text-[8px] font-black text-indigo-500 uppercase tracking-wider flex items-center gap-1 mr-1">
                                                    <Sparkles size={10} /> Rekomendasi Pintar:
                                                </span>
                                                {smartRecommendations.map(t => {
                                                    const isSelected = formData.tematik_ids.includes(t.id);
                                                    return (
                                                        <button
                                                            key={t.id}
                                                            type="button"
                                                            onClick={() => {
                                                                const current = formData.tematik_ids;
                                                                if (isSelected) {
                                                                    manuallyRemovedIdsRef.current.add(t.id);
                                                                    setFormData({ ...formData, tematik_ids: current.filter(id => id !== t.id) });
                                                                } else {
                                                                    manuallyRemovedIdsRef.current.delete(t.id);
                                                                    setFormData({ ...formData, tematik_ids: [...current, t.id] });
                                                                }
                                                            }}
                                                            className={`px-2.5 py-1 rounded-xl text-[9px] font-black transition-all flex items-center gap-1.5 border cursor-pointer hover:scale-105 active:scale-95 ${
                                                                isSelected 
                                                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-100' 
                                                                : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200 shadow-xs'
                                                            }`}
                                                        >
                                                            {isSelected ? <Check size={8} /> : <Plus size={8} />}
                                                            {t.nama || t.nama_tematik}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        )}

                                        <SearchableSelect 
                                            label="Pilih Tagging Tematik"
                                            value={formData.tematik_ids}
                                            options={mappedTematikList}
                                            displayField="nama"
                                            multiple={true}
                                            disabled={modalType === 'internal'}
                                            onChange={(val) => {
                                                const current = formData.tematik_ids;
                                                const removed = current.filter(id => !val.includes(id));
                                                removed.forEach(id => manuallyRemovedIdsRef.current.add(id));
                                                
                                                const added = val.filter((id: number) => !current.includes(id));
                                                added.forEach((id: number) => manuallyRemovedIdsRef.current.delete(id));
                                                
                                                setFormData({...formData, tematik_ids: val});
                                            }}
                                        />
                                    </div>
                                )}

                                {!isSuratCuti && (
                                    <div className="space-y-1.5 p-4 rounded-3xl bg-slate-50 border border-slate-100/50 animate-in slide-in-from-top-2">
                                        <label className="text-[10px] font-black text-indigo-600 uppercase tracking-widest ml-1 flex items-center gap-2">
                                            <List size={12} className="text-indigo-500" /> Kegiatan Terkait {isKegiatanLocked && <span className="text-[8px] opacity-60 font-medium normal-case ml-1">(Terkunci)</span>}
                                        </label>
                                        
                                        {formData.kegiatan_id ? (
                                            <div className="flex items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-indigo-100 shadow-sm animate-in slide-in-from-left-2 transition-all">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                                                        <Calendar size={14} />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-xs font-black text-slate-700 truncate capitalize">{formData.kegiatan_nama.toLowerCase()}</p>
                                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">Telah Ditautkan</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    {!isKegiatanLocked && (
                                                        <button 
                                                            type="button"
                                                            onClick={() => setIsKegiatanPickerOpen(true)}
                                                            className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-indigo-600 transition-all"
                                                            title="Ganti Kegiatan"
                                                        >
                                                            <RotateCcw size={14} />
                                                        </button>
                                                    )}
                                                    {!isKegiatanLocked && (
                                                        <button 
                                                            type="button"
                                                            onClick={() => setFormData({...formData, kegiatan_id: null, kegiatan_nama: ''})}
                                                            className="p-1.5 hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-600 transition-all"
                                                            title="Hapus Tautan"
                                                        >
                                                            <X size={14} />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ) : (
                                            <button
                                                type="button"
                                                disabled={isKegiatanLocked}
                                                onClick={() => setIsKegiatanPickerOpen(true)}
                                                className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 hover:border-indigo-300 hover:bg-white hover:text-indigo-600 transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                <Plus size={16} className="group-hover:rotate-90 transition-transform" />
                                                <span className="text-xs font-black uppercase tracking-widest">Pilih Kegiatan Terkait</span>
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="p-8 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
                            <button type="button" onClick={onClose} className="px-6 py-2.5 rounded-xl font-bold text-sm text-slate-500 hover:bg-white transition-all">Batal</button>
                            <button 
                                type="submit" disabled={isSubmitting}
                                className={`px-8 py-2.5 rounded-xl font-black text-sm text-white shadow-lg flex items-center gap-2 transition-all active:scale-95 ${
                                    isSubmitting ? 'bg-slate-400 cursor-not-allowed' : (modalType === 'masuk' ? 'bg-blue-600 shadow-blue-100' : modalType === 'internal' ? 'bg-indigo-600 shadow-indigo-100' : 'bg-emerald-600 shadow-emerald-100')
                                }`}
                            >
                                {isSubmitting ? <><Loader2 size={18} className="animate-spin" /> Memproses...</> : <><Check size={18} strokeWidth={3} /> Simpan</>}
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            <KegiatanPickerModal 
                isOpen={isKegiatanPickerOpen}
                onClose={() => setIsKegiatanPickerOpen(false)}
                onSelect={(kegiatnan) => {
                    setFormData({
                        ...formData,
                        kegiatan_id: kegiatnan.id,
                        kegiatan_nama: kegiatnan.nama_kegiatan
                    });
                    setIsKegiatanPickerOpen(false);
                }}
            />
        </div>
    );
};

// Sub-component for Activity Picker
function KegiatanPickerModal({ isOpen, onClose, onSelect }: { isOpen: boolean, onClose: () => void, onSelect: (k: KegiatanItem) => void }) {
    const [list, setList] = useState<KegiatanItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');

    useEffect(() => {
        if (isOpen) fetchActivities();
    }, [isOpen]);

    const fetchActivities = async () => {
        try {
            setLoading(true);
            const res = await api.kegiatanManajemen.getAll();
            if (res.success) setList(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const filtered = list.filter(k => 
        k.nama_kegiatan.toLowerCase().includes(search.toLowerCase()) ||
        k.instansi_penyelenggara?.toLowerCase().includes(search.toLowerCase())
    );

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white rounded-[2rem] w-full max-w-3xl overflow-hidden shadow-2xl border border-white/20 animate-in zoom-in-95 duration-300 flex flex-col max-h-[85vh] min-h-0">
                <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                    <div>
                        <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                            <div className="p-2 rounded-xl text-white bg-indigo-600">
                                <List size={20} />
                            </div>
                            Pilih Kegiatan Terkait
                        </h2>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Klik pada kegiatan untuk menautkan surat</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white rounded-xl text-slate-400 hover:text-rose-500 transition-all">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-6 border-b border-slate-50">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                            type="text"
                            placeholder="Cari nama kegiatan atau instansi..."
                            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold text-slate-700"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 min-h-0 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                            <Loader2 className="animate-spin text-indigo-500" size={40} />
                            <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Memuat Daftar Kegiatan...</p>
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-2">
                            <AlertCircle size={40} />
                            <p className="font-bold">Kegiatan tidak ditemukan</p>
                        </div>
                    ) : (
                        <div className="grid gap-3">
                            {filtered.map((k) => (
                                <button
                                    key={k.id}
                                    onClick={() => onSelect(k)}
                                    className="group flex items-center gap-4 p-4 rounded-3xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/50 transition-all text-left"
                                >
                                    <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-slate-100 group-hover:bg-white flex flex-col items-center justify-center border border-transparent group-hover:border-indigo-100 transition-all">
                                        <span className="text-[10px] font-black text-indigo-600 uppercase leading-none">
                                            {new Date(k.tanggal).toLocaleDateString('id-ID', { month: 'short' })}
                                        </span>
                                        <span className="text-lg font-black text-slate-700 leading-none mt-0.5">
                                            {new Date(k.tanggal).getDate()}
                                        </span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-black text-slate-700 leading-tight group-hover:text-indigo-600 transition-colors line-clamp-1">{k.nama_kegiatan}</h4>
                                        <div className="flex items-center gap-3 mt-1 text-slate-400">
                                            <div className="flex items-center gap-1.5 min-w-0">
                                                <Building2 size={12} className="flex-shrink-0" />
                                                <span className="text-[10px] font-bold uppercase tracking-tight truncate">{k.instansi_penyelenggara}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                                        <div className="p-2 rounded-full bg-indigo-500 text-white shadow-lg shadow-indigo-200">
                                            <Check size={16} />
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

const AlertCircle = ({ size, className }: { size?: number, className?: string }) => (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
);
