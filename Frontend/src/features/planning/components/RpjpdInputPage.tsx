import React, { useState, useEffect } from 'react';
import { 
    Plus, Edit2, Trash2, Save, X, Eye, 
    TrendingUp, Award, Layers, Target, Compass, 
    AlertCircle, FileText, Check, HelpCircle
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
    sasaran_pokok_id: number;
    kode_arah_kebijakan: string;
    arah_kebijakan: string;
    sasaran_nama?: string;
    kode_sasaran?: string;
}

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
    
    // Authorization Check
    const isSuperAdmin = user?.tipe_user_id === 1;
    const isBapperida = user?.instansi_nama && (
        user.instansi_nama.toLowerCase().includes('perencanaan') || 
        user.instansi_nama.toLowerCase().includes('bapperida') ||
        user.instansi_nama.toLowerCase().includes('bappeda') ||
        user.instansi_singkatan?.toLowerCase().includes('bapperida') ||
        user.instansi_singkatan?.toLowerCase().includes('bappeda')
    );
    const canEdit = isSuperAdmin || isBapperida;

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
    const [uploadingVisiId, setUploadingVisiId] = useState<number | null>(null);
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
    const [formArah, setFormArah] = useState({ sasaran_pokok_id: '', kode_arah_kebijakan: '', arah_kebijakan: '' });
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
            const defaultSasaran = sasaranList[0]?.id || '';
            setFormArah({ sasaran_pokok_id: String(defaultSasaran), kode_arah_kebijakan: '', arah_kebijakan: '' });
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
                sasaran_pokok_id: String(data.sasaran_pokok_id),
                kode_arah_kebijakan: data.kode_arah_kebijakan,
                arah_kebijakan: data.arah_kebijakan
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

    const handleUploadPerda = async (visiId: number, file: File) => {
        setUploadingVisiId(visiId);
        setErrorMsg('');
        const formData = new FormData();
        formData.append('file', file);
        
        try {
            const res = await api.rpjpd.uploadPerdaFile(visiId, formData);
            if (res.success) {
                showSuccess('Dokumen Perda RPJPD berhasil diunggah!');
                loadAllData();
            } else {
                showError(res.message || 'Gagal mengunggah dokumen Perda');
            }
        } catch (err: any) {
            showError(err.message || 'Terjadi kesalahan sistem saat unggah');
        } finally {
            setUploadingVisiId(null);
        }
    };

    return (
        <div className="max-w-7xl mx-auto py-6 px-4">
            
            {/* Header section with rich dark-blue aesthetics */}
            <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 rounded-3xl p-8 mb-8 shadow-2xl shadow-slate-900/10 border border-slate-700/30">
                <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
                
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 rounded-full text-xs font-bold mb-4 uppercase tracking-widest">
                            <Compass className="w-3 h-3 animate-spin-slow" />
                            Rencana Jangka Panjang
                        </div>
                        <h1 className="text-3xl font-black text-white tracking-tight leading-none">RPJPD Kabupaten / Kota</h1>
                        <p className="text-slate-300 text-sm mt-2 font-medium">Perencanaan Pembangunan Jangka Panjang 20 Tahun (Visi, Misi, Sasaran, Arah Kebijakan, dan Target Makro Tahapan).</p>
                    </div>
                    {canEdit && (
                        <button
                            onClick={() => openAddEditor(activeTab)}
                            className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white font-extrabold rounded-2xl hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-indigo-500/20 text-sm tracking-wider uppercase"
                        >
                            <Plus size={18} strokeWidth={2.5} />
                            Tambah {activeTab === 'visi' ? 'Visi Baru' : activeTab === 'misi' ? 'Misi' : activeTab === 'sasaran' ? 'Sasaran' : activeTab === 'arah' ? 'Arah Kebijakan' : 'Indikator'}
                        </button>
                    )}
                </div>

                {/* Read-only Banner for non-Bapperida */}
                {!canEdit && (
                    <div className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 mt-6 text-amber-200">
                        <AlertCircle className="shrink-0 text-amber-400" size={20} />
                        <div className="text-xs font-semibold leading-relaxed">
                            <strong>Mode Lihat-Saja (Read-Only)</strong>: Halaman ini hanya dapat diubah/diinput oleh dinas <strong>Bapperida</strong> selaku koordinator perencana kabupaten/kota.
                        </div>
                    </div>
                )}
            </div>

            {/* Error and Success alerts */}
            {errorMsg && (
                <div className="mb-6 flex items-center gap-3 bg-red-500/10 border border-red-500/20 text-red-200 p-4 rounded-2xl font-bold text-xs animate-shake">
                    <AlertCircle className="shrink-0 text-red-400" size={18} />
                    <span>{errorMsg}</span>
                </div>
            )}
            {successMsg && (
                <div className="mb-6 flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-200 p-4 rounded-2xl font-bold text-xs animate-fade-in">
                    <Check className="shrink-0 text-emerald-400" size={18} />
                    <span>{successMsg}</span>
                </div>
            )}

            {/* Tab Navigation with sleek glassmorphism */}
            <div className="flex overflow-x-auto gap-2 p-1.5 bg-slate-100/80 rounded-2xl border border-slate-200/50 mb-8 max-w-fit">
                <button
                    onClick={() => setActiveTab('visi')}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 ${activeTab === 'visi' ? 'bg-white text-indigo-950 shadow-md shadow-slate-300/40' : 'text-slate-500 hover:text-slate-800'}`}
                >
                    <Award size={16} />
                    Visi & Misi
                </button>
                <button
                    onClick={() => setActiveTab('sasaran')}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 ${activeTab === 'sasaran' ? 'bg-white text-indigo-950 shadow-md shadow-slate-300/40' : 'text-slate-500 hover:text-slate-800'}`}
                >
                    <Target size={16} />
                    Sasaran Pokok
                </button>
                <button
                    onClick={() => setActiveTab('arah')}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 ${activeTab === 'arah' ? 'bg-white text-indigo-950 shadow-md shadow-slate-300/40' : 'text-slate-500 hover:text-slate-800'}`}
                >
                    <Compass size={16} />
                    Arah Kebijakan
                </button>
                <button
                    onClick={() => setActiveTab('indikator')}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 ${activeTab === 'indikator' ? 'bg-white text-indigo-950 shadow-md shadow-slate-300/40' : 'text-slate-500 hover:text-slate-800'}`}
                >
                    <TrendingUp size={16} />
                    Indikator & Target
                </button>
            </div>

            {/* TAB CONTENTS */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 p-6 md:p-8 min-h-[400px]">
                
                {/* 1. VISI & MISI TAB */}
                {activeTab === 'visi' && (
                    <div className="space-y-8 animate-fade-in">
                        {/* Visi Header Card */}
                        {visiList.length === 0 ? (
                            <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                                <FileText size={40} className="mx-auto text-slate-300 mb-3" />
                                <div className="font-extrabold text-sm uppercase">Belum Ada Visi RPJPD Aktif</div>
                                <p className="text-xs text-slate-400 mt-1">Silakan tambah Visi 20 Tahun terlebih dahulu.</p>
                            </div>
                        ) : (
                            visiList.map((item) => (
                                <div key={item.id} className="relative overflow-hidden bg-slate-50 border border-slate-200/60 rounded-2xl p-6 md:p-8">
                                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-indigo-500"></div>
                                    <div className="flex justify-between items-start gap-4">
                                        <div className="space-y-3">
                                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-100 text-indigo-950 rounded-lg text-[10px] font-black uppercase tracking-wider">
                                                Visi Periode {item.tahun_mulai} - {item.tahun_selesai}
                                            </div>
                                            <h2 className="text-xl md:text-2xl font-black text-slate-800 italic leading-snug">
                                                "{item.visi}"
                                            </h2>
                                            {item.keterangan && (
                                                <p className="text-xs text-slate-500 mt-2">{item.keterangan}</p>
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
                                    
                                    {/* Perda Document Section */}
                                    <div className="mt-4 p-4 bg-indigo-50/50 border border-indigo-100/60 rounded-2xl flex flex-wrap items-center justify-between gap-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 bg-indigo-100 text-indigo-700 rounded-xl flex items-center justify-center shrink-0">
                                                <FileText size={18} />
                                            </div>
                                            <div>
                                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                                                    Dokumen Perda RPJPD (20 Tahun)
                                                </div>
                                                {item.file_path ? (
                                                    <span className="text-xs font-bold text-slate-700">
                                                        {item.file_name || 'Lihat Dokumen'}
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-slate-400 font-semibold italic">
                                                        Belum ada dokumen Perda RPJPD yang diunggah
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {item.file_path && (
                                                <a
                                                    href={getFileUrl(item.file_path)}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-2 rounded-xl shadow-sm transition-all"
                                                >
                                                    <Eye size={12} strokeWidth={2.5} />
                                                    Buka Dokumen
                                                </a>
                                            )}
                                            {canUploadPerda && (
                                                <div className="relative">
                                                    <input
                                                        type="file"
                                                        id={`perda-file-input-${item.id}`}
                                                        className="hidden"
                                                        accept=".pdf,.doc,.docx,.xls,.xlsx"
                                                        onChange={(e) => {
                                                            const file = e.target.files?.[0];
                                                            if (file) handleUploadPerda(item.id, file);
                                                        }}
                                                    />
                                                    <button
                                                        onClick={() => document.getElementById(`perda-file-input-${item.id}`)?.click()}
                                                        disabled={uploadingVisiId === item.id}
                                                        className={`inline-flex items-center gap-1.5 text-xs font-bold ${
                                                            item.file_path 
                                                                ? 'text-slate-600 hover:text-indigo-600 bg-white border border-slate-200 hover:border-indigo-200 hover:bg-slate-50' 
                                                                : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                                                        } px-3.5 py-2 rounded-xl shadow-sm transition-all`}
                                                    >
                                                        {uploadingVisiId === item.id ? (
                                                            <>
                                                                <div className="w-3 h-3 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                                                                <span>Mengunggah...</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Plus size={12} strokeWidth={2.5} />
                                                                <span>{item.file_path ? 'Ganti Dokumen' : 'Unggah Perda'}</span>
                                                            </>
                                                        )}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
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
                        </div>
                        {sasaranList.length === 0 ? (
                            <div className="p-12 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                                <Target size={40} className="mx-auto text-slate-300 mb-3" />
                                <div className="font-extrabold text-sm uppercase">Belum Ada Sasaran Pokok</div>
                                <p className="text-xs text-slate-400 mt-1">Silakan input sasaran pokok pertama Anda.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto rounded-2xl border border-slate-200/80 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.02)]">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-200">
                                            <th className="p-4 text-xs font-black uppercase text-slate-500 w-24">Kode</th>
                                            <th className="p-4 text-xs font-black uppercase text-slate-500 w-1/3">Misi Pengampu</th>
                                            <th className="p-4 text-xs font-black uppercase text-slate-500">Sasaran Pokok</th>
                                            {canEdit && <th className="p-4 text-xs font-black uppercase text-slate-500 w-24 text-center">Aksi</th>}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {sasaranList.map((item) => (
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
                                                                onClick={() => openEditEditor('sasaran', item)}
                                                                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded-md transition-colors"
                                                                title="Edit"
                                                            >
                                                                <Edit2 size={14} />
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
                        </div>
                        {arahList.length === 0 ? (
                            <div className="p-12 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                                <Compass size={40} className="mx-auto text-slate-300 mb-3" />
                                <div className="font-extrabold text-sm uppercase">Belum Ada Arah Kebijakan</div>
                                <p className="text-xs text-slate-400 mt-1">Silakan input arah kebijakan pembangunan.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto rounded-2xl border border-slate-200/80 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.02)]">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-200">
                                            <th className="p-4 text-xs font-black uppercase text-slate-500 w-24">Kode</th>
                                            <th className="p-4 text-xs font-black uppercase text-slate-500 w-1/3">Sasaran Pokok</th>
                                            <th className="p-4 text-xs font-black uppercase text-slate-500">Arah Kebijakan</th>
                                            {canEdit && <th className="p-4 text-xs font-black uppercase text-slate-500 w-24 text-center">Aksi</th>}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {arahList.map((item) => (
                                            <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="p-4 text-xs font-black text-indigo-600">{item.kode_arah_kebijakan}</td>
                                                <td className="p-4">
                                                    <div className="flex items-center gap-2">
                                                        <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-[9px] font-black">
                                                            {item.kode_sasaran}
                                                        </span>
                                                        <span className="text-xs font-semibold text-slate-500 truncate max-w-[200px]">
                                                            {item.sasaran_nama}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="p-4 text-sm font-semibold text-slate-700 leading-snug">{item.arah_kebijakan}</td>
                                                {canEdit && (
                                                    <td className="p-4 text-center">
                                                        <div className="flex justify-center gap-1">
                                                            <button
                                                                onClick={() => openEditEditor('arah', item)}
                                                                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded-md transition-colors"
                                                                title="Edit"
                                                            >
                                                                <Edit2 size={14} />
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
                        </div>
                        {indikatorList.length === 0 ? (
                            <div className="p-12 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                                <TrendingUp size={40} className="mx-auto text-slate-300 mb-3" />
                                <div className="font-extrabold text-sm uppercase">Belum Ada Indikator Target</div>
                                <p className="text-xs text-slate-400 mt-1">Silakan input indikator target pertama Anda.</p>
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
                                            {canEdit && <th className="p-4 text-xs font-black uppercase text-slate-500 w-24">Aksi</th>}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 text-center">
                                        {indikatorList.map((item) => (
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
                                                                onClick={() => openEditEditor('indikator', item)}
                                                                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded-md transition-colors"
                                                                title="Edit"
                                                            >
                                                                <Edit2 size={14} />
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
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}
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
                                        <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-2">Hubungkan ke Sasaran Pokok</label>
                                        <select
                                            required
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 font-semibold text-slate-700"
                                            value={formArah.sasaran_pokok_id}
                                            onChange={(e) => setFormArah({ ...formArah, sasaran_pokok_id: e.target.value })}
                                        >
                                            <option value="">-- Pilih Sasaran Pokok --</option>
                                            {sasaranList.map(s => (
                                                <option key={s.id} value={s.id}>{s.kode_sasaran}: {s.sasaran_pokok.substring(0, 60)}...</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-2">Kode Arah Kebijakan</label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="Contoh: AK-1.1.1 atau 1.1.1"
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 font-semibold text-slate-700"
                                            value={formArah.kode_arah_kebijakan}
                                            onChange={(e) => setFormArah({ ...formArah, kode_arah_kebijakan: e.target.value })}
                                        />
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
        </div>
    );
};

export default RpjpdInputPage;
