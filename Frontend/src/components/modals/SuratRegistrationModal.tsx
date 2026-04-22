import React, { useState, useEffect, useRef } from 'react';
import { 
    X, Inbox, Send, FileText, Calendar, Building2, LayoutGrid, Edit2, List, Plus, 
    RotateCcw, Eye, User, Loader2, Check, Clock, Upload
} from 'lucide-react';
import { api } from '../../services/api';
import { SearchableSelect } from '../common/SearchableSelect';

interface SuratRegistrationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (data: any) => void;
    initialData?: any;
    defaultType?: 'masuk' | 'keluar';
    defaultKegiatanId?: number | null;
    defaultKegiatanNama?: string;
    user: any;
}

interface KegiatanItem {
    id: number;
    tanggal: string;
    nama_kegiatan: string;
    instansi_penyelenggara: string;
}

export const SuratRegistrationModal: React.FC<SuratRegistrationModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
    initialData,
    defaultType = 'masuk',
    defaultKegiatanId = null,
    defaultKegiatanNama = '',
    user
}) => {
    // Modal States
    const [modalType, setModalType] = useState<'masuk' | 'keluar'>(defaultType);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);
    const [isKegiatanPickerOpen, setIsKegiatanPickerOpen] = useState(false);

    // Master Data States
    const [bidangList, setBidangList] = useState<any[]>([]);
    const [instansiList, setInstansiList] = useState<any[]>([]);
    const [jenisSuratList, setJenisSuratList] = useState<any[]>([]);

    // Form States
    const [isManualAsal, setIsManualAsal] = useState(false);
    const [formData, setFormData] = useState({
        nomor_surat: '',
        perihal: '',
        asal_surat: '',
        tujuan_surat: '',
        tanggal_surat: new Date().toISOString().split('T')[0],
        tanggal_acara: '',
        jenis_surat_id: null as number | null,
        bidang_id: user?.bidang_id || null,
        isi_surat: '',
        jabatan_penanda: 'Kepala Bidang',
        nama_penanda: '',
        nip_penanda: '',
        kegiatan_id: defaultKegiatanId,
        kegiatan_nama: defaultKegiatanNama,
    });

    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [customFileName, setCustomFileName] = useState('');
    const [uploadedDocId, setUploadedDocId] = useState<number | null>(null);
    const [currentFileInfo, setCurrentFileInfo] = useState<{name: string, path: string} | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [showDraftPrompt, setShowDraftPrompt] = useState(false);
    const [isDragging, setIsDragging] = useState(false);

    const DRAFT_KEY = (type: string) => `nayaxa_draft_surat_${type}`;

    // --- Master Data Fetching ---
    useEffect(() => {
        if (isOpen) {
            fetchMasterData();
        }
    }, [isOpen]);

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
        } catch (err) {
            console.error('Failed to fetch master data:', err);
        }
    };

    // --- Initialization ---
    useEffect(() => {
        if (isOpen) {
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
                    jenis_surat_id: initialData.jenis_surat_id || null,
                    bidang_id: initialData.bidang_id || user?.bidang_id || null,
                    isi_surat: '',
                    jabatan_penanda: 'Kepala Bidang',
                    nama_penanda: '',
                    nip_penanda: '',
                    kegiatan_id: initialData.kegiatan_id_terkait || defaultKegiatanId,
                    kegiatan_nama: initialData.nama_kegiatan_terkait || defaultKegiatanNama,
                });
                setUploadedDocId(initialData.dokumen_id || null);
                setCustomFileName(initialData.nama_file?.split('.')[0] || '');
                setCurrentFileInfo(initialData.nama_file ? {
                    name: initialData.nama_file,
                    path: initialData.file_path || ''
                } : null);
            } else {
                setEditId(null);
                setModalType(defaultType);
                setFormData(prev => ({
                    ...prev,
                    nomor_surat: '',
                    perihal: '',
                    asal_surat: '',
                    tujuan_surat: '',
                    tanggal_surat: new Date().toISOString().split('T')[0],
                    tanggal_acara: '',
                    jenis_surat_id: null,
                    bidang_id: user?.bidang_id || null,
                    kegiatan_id: defaultKegiatanId,
                    kegiatan_nama: defaultKegiatanNama,
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
    }, [isOpen, initialData, defaultType, defaultKegiatanId]);

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
        if (isOpen && !editId && modalType === 'masuk' && jenisSuratList.length > 0 && !formData.jenis_surat_id) {
            const defaultSurat = jenisSuratList.find(s => 
                (s.dokumen || '').toLowerCase().includes('undangan masuk')
            );
            if (defaultSurat) {
                setFormData(prev => ({ ...prev, jenis_surat_id: defaultSurat.id }));
            }
        }
    }, [isOpen, editId, modalType, jenisSuratList, formData.jenis_surat_id]);

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
            
            if (modalType === 'masuk') {
                if (!selectedFile && !uploadedDocId) {
                    alert('Silakan unggah file surat masuk!');
                    setIsSubmitting(false);
                    return;
                }
                
                if (!formData.jenis_surat_id || !formData.bidang_id || !formData.perihal) {
                    alert('Harap isi Jenis Surat, Bidang, dan Perihal!');
                    setIsSubmitting(false);
                    return;
                }

                let finalDocId = uploadedDocId;

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
                    } else {
                        throw new Error(uploadRes.message || 'Gagal mengunggah file.');
                    }
                }

                const payload = { ...formData, dokumen_id: finalDocId };
                const saveRes = editId ? await api.surat.update(editId, payload) : await api.surat.saveMasuk(payload);

                if (saveRes.success) {
                    clearDraft(modalType);
                    onSuccess(saveRes);
                } else {
                    throw new Error(saveRes.message || 'Gagal menyimpan surat.');
                }
            } else {
                // Surat Keluar
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

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="relative w-full max-w-2xl">
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

                <div className="bg-white rounded-[2rem] w-full overflow-hidden shadow-2xl border border-white/20 animate-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col">
                    <form onSubmit={handleSubmit} className="flex flex-col max-h-[90vh] min-h-0">
                        <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                            <div>
                                <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                                    <div className={`p-2 rounded-xl text-white ${modalType === 'masuk' ? 'bg-blue-600' : 'bg-emerald-600'}`}>
                                        {modalType === 'masuk' ? <Inbox size={20} /> : <Send size={20} />}
                                    </div>
                                    {editId ? 'Edit Data Surat' : (modalType === 'masuk' ? 'Registrasi Surat Masuk' : 'Buat Surat Keluar')}
                                </h2>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Lengkapi informasi dokumen surat</p>
                            </div>
                            <button type="button" onClick={onClose} className="p-2 hover:bg-white rounded-xl text-slate-400 hover:text-rose-500 transition-all">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 space-y-6 min-h-0 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                            {modalType === 'masuk' && (
                                <div className="space-y-3 p-1.5">
                                    <div className="flex items-center justify-between min-h-[18px]">
                                        <label className="text-[10px] font-black text-indigo-600 uppercase tracking-widest ml-1 flex items-center gap-2">
                                            <Upload size={14} className="text-indigo-500" /> Unggah Lampiran Surat
                                        </label>
                                    </div>
                                    <div 
                                        onClick={() => fileInputRef.current?.click()}
                                        onDragOver={handleDragOver}
                                        onDragLeave={handleDragLeave}
                                        onDrop={handleDrop}
                                        className={`border-2 border-dashed rounded-3xl p-8 flex flex-col items-center justify-center gap-3 transition-all cursor-pointer ${
                                            isDragging 
                                                ? 'border-indigo-400 bg-indigo-50 text-indigo-600 scale-[1.02] shadow-xl' 
                                                : (selectedFile ? 'border-emerald-200 bg-emerald-50 text-emerald-600' : 'border-slate-200 hover:border-ppm-slate/30 hover:bg-slate-50 text-slate-400')
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
                                                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-lg"><Plus size={24} /></div>
                                                <div className="text-center"><p className="text-sm font-black text-slate-700">Seret atau Klik untuk Unggah</p></div>
                                            </>
                                        ) : (
                                            <div className="flex flex-col items-center gap-1 animate-in zoom-in-95">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-3 bg-white rounded-2xl shadow-sm"><FileText size={32} /></div>
                                                    <div className="text-left">
                                                        <p className="text-sm font-black truncate max-w-[200px] text-slate-700">{selectedFile?.name || currentFileInfo?.name}</p>
                                                        <p className="text-[10px] font-bold opacity-60 uppercase tracking-widest">Siap Diunggah</p>
                                                    </div>
                                                </div>
                                                <p className="text-[9px] font-black text-indigo-500 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100 mt-2 animate-pulse">
                                                    Klik ulang untuk mengganti file
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                    {selectedFile && (
                                        <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex flex-col gap-2 animate-in slide-in-from-top-2">
                                            <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Nama File di Sistem</label>
                                            <div className="flex items-center gap-2">
                                                <input 
                                                    type="text" className="input-modern bg-white w-full font-black h-[38px]" value={customFileName}
                                                    onChange={(e) => setCustomFileName(e.target.value)}
                                                />
                                                <span className="text-xs font-bold text-slate-400">.{selectedFile.name.split('.').pop()}</span>
                                            </div>
                                        </div>
                                    )}
                                    <div className="h-2 border-b border-slate-100 mb-2"></div>
                                </div>
                            )}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between min-h-[18px]">
                                        <label className="text-[10px] font-black text-indigo-600 uppercase tracking-widest ml-1 whitespace-nowrap">Nomor Surat</label>
                                    </div>
                                    <input 
                                        required type="text" className="input-modern w-full font-bold text-slate-700 h-[42px]" placeholder="--/--/--/--"
                                        value={formData.nomor_surat} onChange={(e) => setFormData({...formData, nomor_surat: e.target.value})}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between min-h-[18px]">
                                        <label className="text-[10px] font-black text-indigo-600 uppercase tracking-widest ml-1 whitespace-nowrap">
                                            {modalType === 'masuk' ? 'Tanggal Surat' : 'Tanggal Surat Dibuat'}
                                        </label>
                                    </div>
                                    <input 
                                        required type="date" className="input-modern w-full font-bold text-slate-700 h-[42px]"
                                        value={formData.tanggal_surat} onChange={(e) => setFormData({...formData, tanggal_surat: e.target.value})}
                                    />
                                </div>

                                {modalType === 'keluar' && (
                                    <>
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
                                        <div className="space-y-1.5 animate-in slide-in-from-top-2">
                                            <div className="flex items-center justify-between min-h-[18px]">
                                                <label className="text-[10px] font-black text-indigo-600 uppercase tracking-widest ml-1 whitespace-nowrap">Tanggal Acara / Kegiatan</label>
                                                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">Opsional</span>
                                            </div>
                                            <input 
                                                type="date" className="input-modern w-full font-bold text-slate-700 h-[42px]"
                                                value={formData.tanggal_acara} onChange={(e) => setFormData({...formData, tanggal_acara: e.target.value})}
                                            />
                                        </div>
                                    </>
                                )}
                            </div>

                            {modalType === 'masuk' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 animate-in slide-in-from-top-2">
                                    <div className="space-y-1.5">
                                        <div className="flex items-center justify-between min-h-[18px]">
                                            <label className="text-[10px] font-black text-indigo-600 uppercase tracking-widest ml-1 whitespace-nowrap">Jenis Surat</label>
                                        </div>
                                        <SearchableSelect 
                                            label="Pilih Jenis Surat" value={formData.jenis_surat_id} options={jenisSuratList} displayField="dokumen"
                                            onChange={(val) => setFormData({...formData, jenis_surat_id: val})}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <div className="flex items-center justify-between min-h-[18px]">
                                            <label className="text-[10px] font-black text-indigo-600 uppercase tracking-widest ml-1 whitespace-nowrap">Tanggal Acara</label>
                                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">Opsional</span>
                                        </div>
                                        <input 
                                            type="date" className="input-modern w-full font-bold text-slate-700 h-[42px]"
                                            value={formData.tanggal_acara} onChange={(e) => setFormData({...formData, tanggal_acara: e.target.value})}
                                        />
                                    </div>
                                </div>
                            )}

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
                            </div>

                            <div className="space-y-1.5 p-4 rounded-3xl bg-slate-50 border border-slate-100/50">
                                <label className="text-[10px] font-black text-indigo-600 uppercase tracking-widest ml-1 flex items-center gap-2">
                                    <List size={12} className="text-indigo-500" /> Kegiatan Terkait {defaultKegiatanId && <span className="text-[8px] opacity-60 font-medium normal-case ml-1">(Terkunci saat dibuka dari formulir kegiatan)</span>}
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
                                            {!defaultKegiatanId && (
                                                <button 
                                                    type="button"
                                                    onClick={() => setIsKegiatanPickerOpen(true)}
                                                    className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-indigo-600 transition-all"
                                                    title="Ganti Kegiatan"
                                                >
                                                    <RotateCcw size={14} />
                                                </button>
                                            )}
                                            {!defaultKegiatanId && (
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
                                        disabled={!!defaultKegiatanId}
                                        onClick={() => setIsKegiatanPickerOpen(true)}
                                        className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 hover:border-indigo-300 hover:bg-white hover:text-indigo-600 transition-all group disabled:opacity-50"
                                    >
                                        <Plus size={16} className="group-hover:rotate-90 transition-transform" />
                                        <span className="text-xs font-black uppercase tracking-widest">Pilih Kegiatan Terkait</span>
                                    </button>
                                )}
                            </div>


                            {modalType === 'keluar' && (
                                <div className="space-y-4">
                                     <div className="space-y-1.5 text-blue-800 bg-blue-50 px-4 py-3 rounded-2xl border border-blue-100 italic text-xs font-semibold leading-snug">
                                        💡 Sistem akan otomatis membuat file PDF resmi.
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-indigo-600 uppercase tracking-widest ml-1">Isi Singkat Surat</label>
                                        <textarea 
                                            required rows={4} className="input-modern w-full font-bold resize-none"
                                            value={formData.isi_surat} onChange={(e) => setFormData({...formData, isi_surat: e.target.value})}
                                        />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-5 bg-slate-50 rounded-3xl">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nama Penanda Tangan</label>
                                            <input type="text" className="input-modern bg-white text-xs" value={formData.nama_penanda} onChange={(e) => setFormData({...formData, nama_penanda: e.target.value})} />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">NIP</label>
                                            <input type="text" className="input-modern bg-white text-xs" value={formData.nip_penanda} onChange={(e) => setFormData({...formData, nip_penanda: e.target.value})} />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="p-8 bg-slate-50/50 border-t border-slate-50 flex items-center justify-end gap-3">
                            <button type="button" onClick={onClose} className="px-6 py-2.5 rounded-xl font-bold text-sm text-slate-500 hover:bg-white transition-all">Batal</button>
                            <button 
                                type="submit" disabled={isSubmitting}
                                className={`px-8 py-2.5 rounded-xl font-black text-sm text-white shadow-lg flex items-center gap-2 transition-all active:scale-95 ${
                                    isSubmitting ? 'bg-slate-400 cursor-not-allowed' : (modalType === 'masuk' ? 'bg-blue-600' : 'bg-emerald-600')
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

const Search = ({ size, className }: { size?: number, className?: string }) => (
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
      <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
    </svg>
);

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
