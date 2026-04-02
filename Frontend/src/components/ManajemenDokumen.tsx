import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { 
    FileText, 
    Upload, 
    Download, 
    Trash2, 
    Search, 
    Loader2, 
    FileIcon, 
    FileImage, 
    FileQuestion,
    AlertCircle,
    CheckCircle2,
    X,
    Eye,
    Edit2
} from 'lucide-react';

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
}

interface JenisDokumen {
    id: number;
    nama: string;
}

interface Tematik {
    id: number;
    nama: string;
}

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

    // Search and UI state for tagging
    const [uploadTagSearch, setUploadTagSearch] = useState('');
    const [isUploadTagOpen, setIsUploadTagOpen] = useState(false);
    const [editTagSearch, setEditTagSearch] = useState('');
    const [isEditTagOpen, setIsEditTagOpen] = useState(false);
    const uploadTagRef = useRef<HTMLDivElement>(null);
    const editTagRef = useRef<HTMLDivElement>(null);

    // Handle clicking outside to close tagging dropdowns
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (uploadTagRef.current && !uploadTagRef.current.contains(event.target as Node)) {
                setIsUploadTagOpen(false);
            }
            if (editTagRef.current && !editTagRef.current.contains(event.target as Node)) {
                setIsEditTagOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [docRes, jenisRes, tematikRes] = await Promise.all([
                api.dokumen.getAll(),
                api.jenisDokumen.getAll(),
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
    }, []);

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
        if (!confirm('Apakah Anda yakin ingin menghapus dokumen ini secara permanen?')) return;
        try {
            const res = await api.dokumen.delete(id);
            if (res.success) {
                showMsg('success', 'Dokumen berhasil dihapus.');
                fetchData();
            } else {
                showMsg('error', res.message || 'Gagal menghapus dokumen.');
            }
        } catch (err) {
            showMsg('error', 'Terjadi kesalahan saat menghapus.');
        }
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
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight">Manajemen Dokumen</h2>
                    <p className="text-slate-500 text-sm">Pusat unggah dan kelola file dokumen pendukung (PDF & Gambar).</p>
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
                                <select 
                                    className="input-modern w-full"
                                    value={uploadJenisId}
                                    onChange={(e) => setUploadJenisId(e.target.value)}
                                >
                                    <option value="">-- Pilih Jenis Dokumen --</option>
                                    {jenisList.map(j => (
                                        <option key={j.id} value={j.id}>{j.nama}</option>
                                    ))}
                                </select>
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
                                        <div className="max-h-60 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                                            {tematikList
                                                .filter(t => t.nama.toLowerCase().includes(uploadTagSearch.toLowerCase()))
                                                .map(t => (
                                                    <div 
                                                        key={t.id}
                                                        className={`flex items-center justify-between p-2.5 rounded-xl text-[11px] font-bold cursor-pointer transition-all ${
                                                            selectedTematikIds.includes(t.id)
                                                            ? 'bg-blue-600 text-white shadow-md shadow-blue-100'
                                                            : 'hover:bg-slate-50 text-slate-600 border border-transparent hover:border-slate-100'
                                                        }`}
                                                        onClick={() => toggleTematik(t.id)}
                                                    >
                                                        <span>{t.nama}</span>
                                                        {selectedTematikIds.includes(t.id) ? <CheckCircle2 size={14} /> : <div className="w-4 h-4 rounded-full border-2 border-slate-100" />}
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
                        <div className="p-4 border-b border-slate-50 bg-slate-50/30 flex flex-col md:flex-row gap-3">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                <input 
                                    type="text" 
                                    className="input-modern w-full pl-10" 
                                    placeholder="Cari nama file, jenis, atau tema..." 
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <div className="w-full md:w-56">
                                <select 
                                    className="input-modern w-full"
                                    value={selectedTematikFilter}
                                    onChange={(e) => setSelectedTematikFilter(e.target.value)}
                                >
                                    <option value="">Semua Tematik</option>
                                    {tematikList.map(t => (
                                        <option key={t.id} value={t.nama}>{t.nama}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="w-full md:w-48">
                                <select 
                                    className="input-modern w-full"
                                    value={selectedJenis}
                                    onChange={(e) => setSelectedJenis(e.target.value)}
                                >
                                    <option value="">Semua Jenis Dokumen</option>
                                    {jenisList.map(j => (
                                        <option key={j.id} value={j.id}>{j.nama}</option>
                                    ))}
                                </select>
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
                                        <tr className="bg-slate-50/80 border-b border-slate-100">
                                            <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-[40%]">Informasi Dokumen</th>
                                            <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest hidden md:table-cell w-[15%]">Kategori</th>
                                            <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest hidden lg:table-cell w-[25%]">Detail Upload</th>
                                            <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap text-center w-[20%]">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {filteredList.map((doc) => (
                                            <tr key={doc.id} className="hover:bg-slate-50 transition-colors group">
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
                                                    <div className="text-[12px] font-bold text-slate-700">
                                                        {doc.uploader_nama || 'System'}
                                                    </div>
                                                    {doc.uploader_bidang && (
                                                        <div className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mt-0.5">
                                                            {doc.uploader_bidang}
                                                        </div>
                                                    )}
                                                    <div className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-tighter">
                                                        {new Date(doc.uploaded_at).toLocaleString('id-ID', {
                                                            day: '2-digit',
                                                            month: 'short',
                                                            year: 'numeric',
                                                            hour: '2-digit',
                                                            minute: '2-digit'
                                                        })}
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex items-center justify-center gap-2">
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
                                                                    title="Hapus"
                                                                >
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Edit Modal */}
            {editingDoc && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-300">
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
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Kategori / Jenis</label>
                                <select 
                                    className="input-modern w-full"
                                    value={editJenisId}
                                    onChange={(e) => setEditJenisId(e.target.value)}
                                >
                                    <option value="">-- Pilih Jenis Dokumen --</option>
                                    {jenisList.map(j => (
                                        <option key={j.id} value={j.id}>{j.nama}</option>
                                    ))}
                                </select>
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
                                    <div className="absolute z-[100] w-full mt-2 bg-white border border-slate-200 shadow-2xl rounded-2xl p-3 animate-in fade-in zoom-in-95 duration-200">
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
                                        <div className="max-h-60 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                                            {tematikList
                                                .filter(t => t.nama.toLowerCase().includes(editTagSearch.toLowerCase()))
                                                .map(t => (
                                                    <div 
                                                        key={t.id}
                                                        className={`flex items-center justify-between p-2.5 rounded-xl text-[11px] font-bold cursor-pointer transition-all ${
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
                                                        {editTematikIds.includes(t.id) ? <CheckCircle2 size={14} /> : <div className="w-4 h-4 rounded-full border-2 border-slate-100" />}
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
        </div>
    );
}
