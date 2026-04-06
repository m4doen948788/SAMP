import { useState, useEffect, useMemo } from 'react';
import { api } from '../services/api';
import { Plus, Trash2, X, Check, Loader2, Search, Database, ArrowLeft, Edit2, ChevronDown, ChevronRight, Upload } from 'lucide-react';

const PAGE_SIZES = [10, 20, 50, 100, 0];
const MAX_VISIBLE_PAGES = 5;

const renderPageButtons = (currentPage: number, totalPages: number, setCurrentPage: (p: number) => void) => {
    if (totalPages <= 1) return null;
    const pages: (number | string)[] = [];
    if (totalPages <= MAX_VISIBLE_PAGES + 2) {
        for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
        pages.push(1);
        const start = Math.max(2, currentPage - Math.floor(MAX_VISIBLE_PAGES / 2));
        const end = Math.min(totalPages - 1, start + MAX_VISIBLE_PAGES - 1);
        const adjustedStart = Math.max(2, end - MAX_VISIBLE_PAGES + 1);
        if (adjustedStart > 2) pages.push('...');
        for (let i = adjustedStart; i <= end; i++) pages.push(i);
        if (end < totalPages - 1) pages.push('...');
        pages.push(totalPages);
    }
    return (
        <div className="flex items-center gap-1">
            {pages.map((p, i) =>
                typeof p === 'string' ? (
                    <span key={`e${i}`} className="px-1.5 text-slate-400 text-xs">...</span>
                ) : (
                    <button key={p} onClick={() => setCurrentPage(p)} className={`px-2.5 py-1 border text-xs font-bold transition-colors ${p === currentPage ? 'bg-ppm-slate text-white border-ppm-slate' : 'border-slate-300 hover:border-ppm-slate'}`}>{p}</button>
                )
            )}
        </div>
    );
};

interface KolomDef {
    nama: string;
    nama_db: string;
    tipe: string;
    wajib: boolean;
    relation_table?: string;
    relation_label?: string;
}

interface MasterDataConfig {
    id: number;
    nama_tabel: string;
    label: string;
    kolom: KolomDef[];
    is_active: number;
}

const TIPE_KOLOM = [
    { value: 'string', label: 'Teks Pendek (VARCHAR)' },
    { value: 'text', label: 'Teks Panjang (TEXT)' },
    { value: 'number', label: 'Angka (INT)' },
    { value: 'decimal', label: 'Desimal (DECIMAL)' },
    { value: 'date', label: 'Tanggal (DATE)' },
    { value: 'relation', label: 'Relasi Data (Lookup)' },
];

// ========== Sub-component: Data Table View ==========
const DataTableView = ({ config, onBack }: { config: MasterDataConfig; onBack: () => void }) => {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const [newRow, setNewRow] = useState<Record<string, string>>({});
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editRow, setEditRow] = useState<Record<string, string>>({});
    const [search, setSearch] = useState('');
    const [pageSize, setPageSize] = useState(10);
    const [currentPage, setCurrentPage] = useState(1);
    const [relationData, setRelationData] = useState<Record<string, any[]>>({});

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await api.masterDataConfig.getData(config.id);
            if (res.success) setData(res.data);
        } catch { }
        finally { setLoading(false); }
    };

    const fetchRelations = async () => {
        const relationCols = config.kolom.filter(k => k.tipe === 'relation');
        if (relationCols.length === 0) return;

        const newRelationData: Record<string, any[]> = {};
        await Promise.all(relationCols.map(async (col) => {
            if (col.relation_table) {
                try {
                    const res = await api.masterDataConfig.getDataByTable(col.relation_table);
                    if (res.success) {
                        newRelationData[col.nama_db] = res.data;
                    }
                } catch (err) {
                    console.error(`Failed to fetch relation for ${col.nama_db}`, err);
                }
            }
        }));
        setRelationData(newRelationData);
    };

    useEffect(() => { 
        fetchData(); 
        fetchRelations();
    }, [config.id]);

    const handleAdd = async () => {
        try {
            const res = await api.masterDataConfig.createData(config.id, newRow);
            if (res.success) { setNewRow({}); setIsAdding(false); fetchData(); }
            else alert(res.message || 'Gagal menambah data');
        } catch { alert('Gagal menambah data'); }
    };

    const handleUpdate = async (id: number) => {
        try {
            const res = await api.masterDataConfig.updateData(config.id, id, editRow);
            if (res.success) { setEditingId(null); fetchData(); }
            else alert(res.message || 'Gagal mengubah data');
        } catch { alert('Gagal mengubah data'); }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Hapus data ini?')) return;
        try {
            const res = await api.masterDataConfig.deleteData(config.id, id);
            if (res.success) fetchData();
        } catch { alert('Gagal menghapus data'); }
    };

    const filtered = useMemo(() => {
        if (!search.trim()) return data;
        const q = search.toLowerCase();
        return data.filter(row =>
            config.kolom.some(k => String(row[k.nama_db] || '').toLowerCase().includes(q))
        );
    }, [data, search, config.kolom]);

    const totalPages = pageSize === 0 ? 1 : Math.ceil(filtered.length / pageSize);
    const displayed = pageSize === 0 ? filtered : filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    useEffect(() => { setCurrentPage(1); }, [search, pageSize]);

    return (
        <div className="card-modern p-6">
            <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-3">
                    <button onClick={onBack} className="text-ppm-slate hover:text-ppm-slate-light p-1 transition-colors"><ArrowLeft size={20} /></button>
                    <h2 className="text-xl font-black text-ppm-slate uppercase tracking-tight">{config.label}</h2>
                    <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-2 py-0.5">{config.nama_tabel}</span>
                </div>
                <button onClick={() => setIsAdding(true)} className="btn-primary">
                    <Plus size={14} /> Tambah Data
                </button>
            </div>

            <div className="mb-4 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span>Tampilkan</span>
                    <select value={pageSize} onChange={e => setPageSize(Number(e.target.value))} className="border border-slate-300 px-2 py-1.5 text-xs w-24 outline-none focus:border-ppm-slate bg-slate-50 rounded transition-colors cursor-pointer">
                        {PAGE_SIZES.map(s => <option key={s} value={s}>{s === 0 ? 'Semua' : s}</option>)}
                    </select>
                    <span className="text-slate-400">|</span>
                    <span><b>{displayed.length}</b> dari <b>{filtered.length}</b> data</span>
                </div>
                <div className="relative w-full sm:w-72">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="text" placeholder="Cari data..." value={search} onChange={e => setSearch(e.target.value)} className="input-modern pl-9" />
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-12"><Loader2 className="animate-spin text-ppm-slate" size={32} /></div>
            ) : (
                <>
                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                        <table className="w-full text-sm">
                            <thead>
                                <tr>
                                    <th className="table-header w-16 text-center">NO</th>
                                    {config.kolom.map(k => (
                                        <th key={k.nama_db} className="table-header">{k.nama}</th>
                                    ))}
                                    <th className="table-header w-28 text-center">Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                 {isAdding && (
                                    <tr className="bg-blue-50">
                                        <td className="p-3 border-b border-slate-100 text-slate-400 text-center text-xs">NEW</td>
                                        {config.kolom.map(k => (
                                            <td key={k.nama_db} className="p-2 border-b border-slate-100">
                                                {k.tipe === 'relation' ? (
                                                    <select
                                                        className="input-modern"
                                                        value={newRow[k.nama_db] || ''}
                                                        onChange={e => setNewRow({ ...newRow, [k.nama_db]: e.target.value })}
                                                    >
                                                        <option value="">-- Pilih {k.nama} --</option>
                                                        {(relationData[k.nama_db] || []).map(r => (
                                                            <option key={r.id} value={r.id}>{r[k.relation_label || 'nama']}</option>
                                                        ))}
                                                    </select>
                                                ) : (
                                                    <input
                                                        type={k.tipe === 'number' || k.tipe === 'decimal' ? 'number' : k.tipe === 'date' ? 'date' : 'text'}
                                                        className="input-modern"
                                                        placeholder={k.nama}
                                                        value={newRow[k.nama_db] || ''}
                                                        onChange={e => setNewRow({ ...newRow, [k.nama_db]: e.target.value })}
                                                    />
                                                )}
                                            </td>
                                        ))}
                                        <td className="p-2 border-b border-slate-100">
                                            <div className="flex justify-center gap-2">
                                                <button onClick={handleAdd} className="text-slate-400 hover:text-emerald-600 p-1.5 hover:bg-emerald-50 rounded-full"><Check size={18} /></button>
                                                <button onClick={() => { setIsAdding(false); setNewRow({}); }} className="text-slate-400 hover:text-rose-600 p-1.5 hover:bg-rose-50 rounded-full"><X size={18} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                                {displayed.map((row, index) => (
                                    <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="p-3 border-b border-slate-100 font-mono text-xs text-slate-500 text-center">
                                            {(currentPage - 1) * (pageSize || filtered.length) + index + 1}
                                        </td>
                                         {config.kolom.map(k => (
                                            <td key={k.nama_db} className="p-3 border-b border-slate-100">
                                                {editingId === row.id ? (
                                                    k.tipe === 'relation' ? (
                                                        <select
                                                            className="input-modern"
                                                            value={editRow[k.nama_db] || ''}
                                                            onChange={e => setEditRow({ ...editRow, [k.nama_db]: e.target.value })}
                                                        >
                                                            <option value="">-- Pilih {k.nama} --</option>
                                                            {(relationData[k.nama_db] || []).map(r => (
                                                                <option key={r.id} value={r.id}>{r[k.relation_label || 'nama']}</option>
                                                            ))}
                                                        </select>
                                                    ) : (
                                                        <input
                                                            type={k.tipe === 'number' || k.tipe === 'decimal' ? 'number' : k.tipe === 'date' ? 'date' : 'text'}
                                                            className="input-modern"
                                                            value={editRow[k.nama_db] || ''}
                                                            onChange={e => setEditRow({ ...editRow, [k.nama_db]: e.target.value })}
                                                        />
                                                    )
                                                ) : (
                                                    <span className="font-bold text-ppm-slate">
                                                        {k.tipe === 'relation' 
                                                            ? row[k.nama_db.replace(/_id$/, '_nama')] || row[k.nama_db] || '-'
                                                            : row[k.nama_db] !== null && row[k.nama_db] !== undefined ? String(row[k.nama_db]) : '-'
                                                        }
                                                    </span>
                                                )}
                                            </td>
                                        ))}
                                        <td className="p-3 border-b border-slate-100">
                                            <div className="flex justify-center gap-2">
                                                {editingId === row.id ? (
                                                    <>
                                                        <button onClick={() => handleUpdate(row.id)} className="text-slate-400 hover:text-emerald-600 p-1.5 hover:bg-emerald-50 rounded-full"><Check size={18} /></button>
                                                        <button onClick={() => { setEditingId(null); }} className="text-slate-400 hover:text-rose-600 p-1.5 hover:bg-rose-50 rounded-full"><X size={18} /></button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <button onClick={() => { setEditingId(row.id); const vals: Record<string, string> = {}; config.kolom.forEach(k => { vals[k.nama_db] = row[k.nama_db] !== null ? String(row[k.nama_db]) : ''; }); setEditRow(vals); }} className="text-slate-400 hover:text-indigo-600 p-2 hover:bg-indigo-50/80 rounded-xl transition-colors"><Edit2 size={16} /></button>
                                                        <button onClick={() => handleDelete(row.id)} className="text-slate-400 hover:text-rose-600 p-2 hover:bg-rose-50/80 rounded-xl transition-colors"><Trash2 size={16} /></button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {displayed.length === 0 && !isAdding && (
                                    <tr><td colSpan={config.kolom.length + 2} className="p-12 text-center text-slate-400 font-bold italic">{search ? 'Tidak ada hasil pencarian' : 'Belum ada data'}</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    <div className="flex justify-end mt-4">
                        {renderPageButtons(currentPage, totalPages, setCurrentPage)}
                    </div>
                </>
            )}
        </div>
    );
};

// ========== Main Component ==========
const BuatMasterData = () => {
    const [configs, setConfigs] = useState<MasterDataConfig[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [viewingConfig, setViewingConfig] = useState<MasterDataConfig | null>(null);
    const [editingConfigId, setEditingConfigId] = useState<number | null>(null);
    const [editConfigLabel, setEditConfigLabel] = useState('');

    // Pagination & Search for configs list
    const [search, setSearch] = useState('');
    const [pageSize, setPageSize] = useState(10);
    const [currentPage, setCurrentPage] = useState(1);

    // Create form state
    const [newLabel, setNewLabel] = useState('');

    // Upload state
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [uploadItems, setUploadItems] = useState<{ file: File; fileName: string; jenisDokumenId: number | null; progress?: number; status?: 'idle' | 'uploading' | 'success' | 'error' }[]>([]);
    const [jenisDokumenList, setJenisDokumenList] = useState<any[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadCurrentIndex, setUploadCurrentIndex] = useState(0);
    const [hoveredCategory, setHoveredCategory] = useState<'dokumen' | 'surat' | null>(null);
    const [newTableName, setNewTableName] = useState('');
    const [newKolom, setNewKolom] = useState<{ nama: string; tipe: string; wajib: boolean }[]>([
        { nama: '', tipe: 'string', wajib: false },
    ]);
    const [auditFeatures, setAuditFeatures] = useState({
        created_at: true,
        created_by: false,
        updated_at: true,
        updated_by: false,
        deleted_at: false,
        deleted_by: false
    });

    const fetchConfigs = async () => {
        setLoading(true);
        try {
            const [res, resJd] = await Promise.all([
                api.masterDataConfig.getAll(),
                api.masterDataConfig.getDataByTable('master_dokumen').catch(() => ({ success: false, data: [] }))
            ]);
            if (res.success) setConfigs(res.data);
            if (resJd && resJd.success) setJenisDokumenList(resJd.data);
        } catch { }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchConfigs(); }, []);

    const generateTableName = (label: string) => {
        return label.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '_').trim();
    };

    const addKolom = () => {
        setNewKolom([...newKolom, { nama: '', tipe: 'string', wajib: false }]);
    };

    const removeKolom = (idx: number) => {
        setNewKolom(newKolom.filter((_, i) => i !== idx));
    };

    const updateKolom = (idx: number, field: string, value: any) => {
        setNewKolom(newKolom.map((k, i) => i === idx ? { ...k, [field]: value } : k));
    };

    const handleCreate = async () => {
        if (!newLabel.trim() || !newTableName.trim()) {
            alert('Label dan nama tabel wajib diisi');
            return;
        }
        const validKolom = newKolom.filter(k => k.nama.trim());
        if (validKolom.length === 0) {
            alert('Minimal satu kolom harus ditambahkan');
            return;
        }
        try {
            const res = await api.masterDataConfig.create({
                nama_tabel: newTableName,
                label: newLabel,
                kolom: validKolom,
                audit_features: auditFeatures
            });
            if (res.success) {
                setShowCreate(false);
                setNewLabel('');
                setNewTableName('');
                setNewKolom([{ nama: '', tipe: 'string', wajib: false }]);
                setAuditFeatures({
                    created_at: true, created_by: false,
                    updated_at: true, updated_by: false,
                    deleted_at: false, deleted_by: false
                });
                fetchConfigs();
            } else {
                alert(res.message || 'Gagal membuat master data');
            }
        } catch {
            alert('Gagal membuat master data');
        }
    };

    const handleUpload = async () => {
        if (uploadItems.length === 0) return;

        const incomplete = uploadItems.find(item => !item.fileName.trim() || !item.jenisDokumenId);
        if (incomplete) {
            alert('Pastikan semua file sudah memiliki nama dan jenis dokumen');
            return;
        }

        setIsUploading(true);
        let successCount = 0;

        try {
            for (let i = 0; i < uploadItems.length; i++) {
                setUploadCurrentIndex(i + 1);
                const item = uploadItems[i];

                // Update specific item status to uploading
                setUploadItems(prev => prev.map((it, idx) => idx === i ? { ...it, status: 'uploading' } : it));

                const formData = new FormData();
                formData.append('file', item.file, item.fileName.trim());
                formData.append('jenis_dokumen_id', String(item.jenisDokumenId));

                const res = await api.dokumen.upload(formData);

                if (res.success) {
                    successCount++;
                    setUploadItems(prev => prev.map((it, idx) => idx === i ? { ...it, status: 'success' } : it));
                } else {
                    setUploadItems(prev => prev.map((it, idx) => idx === i ? { ...it, status: 'error' } : it));
                    throw new Error(res.message || 'Gagal upload salah satu file');
                }
            }

            alert(`Berhasil mengupload ${successCount} file`);
            setShowUploadModal(false);
            setUploadItems([]);
        } catch (err: any) {
            alert(err.message || 'Gagal upload file');
        } finally {
            setIsUploading(false);
            setUploadCurrentIndex(0);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Hapus master data ini beserta seluruh datanya? Tabel database akan dihapus.')) return;
        try {
            const res = await api.masterDataConfig.delete(id);
            if (res.success) fetchConfigs();
        } catch { alert('Gagal menghapus'); }
    };

    const handleUpdateConfig = async (id: number) => {
        if (!editConfigLabel.trim()) return;
        try {
            const res = await api.masterDataConfig.update(id, { label: editConfigLabel });
            if (res.success) {
                setEditingConfigId(null);
                fetchConfigs();
            } else alert(res.message || 'Gagal mengubah config');
        } catch { alert('Gagal mengubah config'); }
    };

    const filteredConfigs = useMemo(() => {
        if (!search.trim()) return configs;
        const q = search.toLowerCase();
        return configs.filter(cfg =>
            cfg.label.toLowerCase().includes(q) ||
            cfg.nama_tabel.toLowerCase().includes(q)
        );
    }, [configs, search]);

    const totalPages = pageSize === 0 ? 1 : Math.ceil(filteredConfigs.length / pageSize);
    const displayedConfigs = pageSize === 0 ? filteredConfigs : filteredConfigs.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    const suratList = useMemo(() => jenisDokumenList.filter(j => j.dokumen && j.dokumen.toLowerCase().includes('surat')), [jenisDokumenList]);
    const dokumenList = useMemo(() => jenisDokumenList.filter(j => j.dokumen && !j.dokumen.toLowerCase().includes('surat')), [jenisDokumenList]);

    useEffect(() => { setCurrentPage(1); }, [search, pageSize]);

    // If viewing a specific master data table
    if (viewingConfig) {
        return <DataTableView config={viewingConfig} onBack={() => { setViewingConfig(null); fetchConfigs(); }} />;
    }

    return (
        <div className="card-modern p-6">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-black text-ppm-slate uppercase tracking-tight flex items-center gap-2">
                    <Database size={22} /> Buat Master Data
                </h2>
                <div className="flex items-center gap-2">

                    <button
                        onClick={() => setShowCreate(true)}
                        className="btn-primary flex items-center gap-2"
                    >
                        <Plus size={14} /> Master Data Baru
                    </button>
                </div>
            </div>


            {/* Upload Modal */}
            {showUploadModal && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl flex flex-col border border-slate-200">
                        <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-slate-50">
                            <div>
                                <h3 className="text-sm font-black text-ppm-slate uppercase tracking-wide">Upload Multi File</h3>
                                <p className="text-[11px] text-slate-400 mt-0.5">Dapat ganti nama file, klik pada nama file</p>
                            </div>
                            <button onClick={() => {
                                if (isUploading && !confirm('Proses upload sedang berjalan. Tutup?')) return;
                                setShowUploadModal(false);
                                setUploadItems([]);
                            }} className="text-slate-400 hover:text-red-500 transition-colors p-1"><X size={20} /></button>
                        </div>
                        <div className="p-5 flex-1 overflow-y-auto custom-scroll space-y-4 max-h-[60vh]">
                            {uploadItems.length === 0 ? (
                                <div className="border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center transition-colors hover:border-indigo-300 group relative">
                                    <input
                                        type="file"
                                        multiple
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                        onChange={(e) => {
                                            const files = Array.from(e.target.files || []) as File[];
                                            const newItems = files.map(f => ({
                                                file: f,
                                                fileName: f.name,
                                                jenisDokumenId: null,
                                                status: 'idle' as const
                                            }));
                                            setUploadItems([...uploadItems, ...newItems]);
                                        }}
                                    />
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-500 flex items-center justify-center group-hover:bg-indigo-100 transition-colors">
                                            <Upload size={24} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-700">Pilih file untuk diupload</p>
                                            <p className="text-xs text-slate-400 mt-1">Dapat memilih lebih dari satu file sekaligus</p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {uploadItems.map((item, idx) => (
                                        <div key={idx} className={`p-4 rounded-xl border transition-all ${item.status === 'success' ? 'bg-emerald-50 border-emerald-200' : item.status === 'error' ? 'bg-rose-50 border-rose-200' : 'bg-white border-slate-200 shadow-sm'}`}>
                                            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
                                                <div className="flex-1 min-w-0 w-full space-y-3">
                                                    <div className="flex items-center gap-2">
                                                        <div className="bg-indigo-50 text-indigo-600 p-2 rounded-lg shrink-0">
                                                            <Database size={14} />
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <input
                                                                type="text"
                                                                className="w-full text-sm font-bold bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 text-slate-700 transition-all placeholder:text-slate-300"
                                                                value={item.fileName}
                                                                onChange={(e) => setUploadItems(prev => prev.map((it, i) => i === idx ? { ...it, fileName: e.target.value } : it))}
                                                                placeholder="Beri nama file..."
                                                                disabled={isUploading}
                                                            />
                                                            <p className="text-[10px] text-slate-400 font-mono truncate">{item.file.name} ({(item.file.size / 1024 / 1024).toFixed(2)} MB)</p>
                                                        </div>
                                                    </div>

                                                    <div className="flex flex-col items-stretch gap-2 w-fit">
                                                        {/* Kategori Dokumen - hover flyout */}
                                                        <div className="relative group/dok">
                                                            <div className="cursor-pointer font-bold px-3 py-1.5 rounded-lg border border-slate-200 text-[11px] text-slate-600 bg-white hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 transition-all shadow-sm flex items-center gap-1.5 group-hover/dok:ring-2 group-hover/dok:ring-indigo-100">
                                                                <span>Dokumen ({dokumenList.length})</span>
                                                                <ChevronRight size={12} className="opacity-40 group-hover/dok:translate-x-0.5 transition-transform" />
                                                            </div>
                                                            <div className="absolute left-full top-0 pl-2 w-64 z-[60] opacity-0 invisible group-hover/dok:opacity-100 group-hover/dok:visible transition-all duration-200 transform translate-x-2 group-hover/dok:translate-x-0">
                                                                <div className="bg-white border border-slate-200 shadow-2xl rounded-xl overflow-hidden ring-1 ring-black/5">
                                                                    <div className="p-1 max-h-[300px] overflow-y-auto custom-scroll bg-white">
                                                                        <div className="px-3 py-1.5 border-b border-slate-50 mb-1 bg-slate-50/50">
                                                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Daftar Dokumen</span>
                                                                        </div>
                                                                        {dokumenList.map(j => (
                                                                            <div
                                                                                key={j.id}
                                                                                className={`px-3 py-1.5 text-xs font-semibold rounded-lg cursor-pointer transition-colors mb-0.5 ${item.jenisDokumenId === j.id ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-indigo-50 hover:text-indigo-700'}`}
                                                                                onClick={() => setUploadItems(prev => prev.map((it, i) => i === idx ? { ...it, jenisDokumenId: j.id } : it))}
                                                                            >
                                                                                {j.dokumen}
                                                                            </div>
                                                                        ))}
                                                                        {dokumenList.length === 0 && <div className="px-3 py-3 text-xs text-slate-400 italic text-center">Tidak ada data</div>}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Kategori Surat - hover flyout */}
                                                        <div className="relative group/sur">
                                                            <div className="cursor-pointer font-bold px-3 py-1.5 rounded-lg border border-slate-200 text-[11px] text-slate-600 bg-white hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 transition-all shadow-sm flex items-center gap-1.5 group-hover/sur:ring-2 group-hover/sur:ring-rose-100">
                                                                <span>Surat ({suratList.length})</span>
                                                                <ChevronRight size={12} className="opacity-40 group-hover/sur:translate-x-0.5 transition-transform" />
                                                            </div>
                                                            <div className="absolute left-full top-0 pl-2 w-64 z-[60] opacity-0 invisible group-hover/sur:opacity-100 group-hover/sur:visible transition-all duration-200 transform translate-x-2 group-hover/sur:translate-x-0">
                                                                <div className="bg-white border border-slate-200 shadow-2xl rounded-xl overflow-hidden ring-1 ring-black/5">
                                                                    <div className="p-1 max-h-[300px] overflow-y-auto custom-scroll bg-white">
                                                                        <div className="px-3 py-1.5 border-b border-slate-50 mb-1 bg-slate-50/50">
                                                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Daftar Surat</span>
                                                                        </div>
                                                                        {suratList.map(j => (
                                                                            <div
                                                                                key={j.id}
                                                                                className={`px-3 py-1.5 text-xs font-semibold rounded-lg cursor-pointer transition-colors mb-0.5 ${item.jenisDokumenId === j.id ? 'bg-rose-600 text-white shadow-md' : 'text-slate-600 hover:bg-rose-50 hover:text-rose-700'}`}
                                                                                onClick={() => setUploadItems(prev => prev.map((it, i) => i === idx ? { ...it, jenisDokumenId: j.id } : it))}
                                                                            >
                                                                                {j.dokumen}
                                                                            </div>
                                                                        ))}
                                                                        {suratList.length === 0 && <div className="px-3 py-3 text-xs text-slate-400 italic text-center">Tidak ada data</div>}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Selected jenis indicator */}
                                                        {item.jenisDokumenId && jenisDokumenList.find(j => j.id === item.jenisDokumenId) && (
                                                            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full flex items-center gap-1">
                                                                <Check size={10} strokeWidth={3} />
                                                                {jenisDokumenList.find(j => j.id === item.jenisDokumenId)?.dokumen}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                                                    {item.status === 'uploading' ? (
                                                        <Loader2 size={18} className="animate-spin text-indigo-500" />
                                                    ) : item.status === 'success' ? (
                                                        <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-sm">
                                                            <Check size={16} strokeWidth={3} />
                                                        </div>
                                                    ) : item.status === 'error' ? (
                                                        <div className="w-8 h-8 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-sm">
                                                            <X size={16} strokeWidth={3} />
                                                        </div>
                                                    ) : (
                                                        <button
                                                            onClick={() => setUploadItems(prev => prev.filter((_, i) => i !== idx))}
                                                            className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                                                            disabled={isUploading}
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}

                                    {!isUploading && (
                                        <div className="relative inline-block">
                                            <input
                                                type="file"
                                                multiple
                                                className="absolute inset-0 opacity-0 cursor-pointer"
                                                onChange={(e) => {
                                                    const files = Array.from(e.target.files || []) as File[];
                                                    const newItems = files.map(f => ({
                                                        file: f,
                                                        fileName: f.name,
                                                        jenisDokumenId: null,
                                                        status: 'idle' as const
                                                    }));
                                                    setUploadItems([...uploadItems, ...newItems]);
                                                }}
                                            />
                                            <button className="flex items-center gap-2 text-xs font-bold text-indigo-600 px-4 py-2 hover:bg-indigo-50 rounded-lg transition-colors">
                                                <Plus size={14} /> Tambah File Lagi
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                        <div className="p-4 border-t border-slate-100 bg-slate-50 flex flex-col md:flex-row justify-between items-center gap-4 shrink-0">
                            {isUploading ? (
                                <div className="flex items-center gap-3">
                                    <Loader2 size={18} className="animate-spin text-indigo-600" />
                                    <span className="text-sm font-bold text-slate-600 italic">
                                        Mengupload ({uploadCurrentIndex}/{uploadItems.length})...
                                    </span>
                                </div>
                            ) : (
                                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                                    {uploadItems.length > 0 ? `${uploadItems.length} file terpilih` : 'Belum ada file'}
                                </div>
                            )}

                            <div className="flex gap-3 w-full md:w-auto">
                                <button
                                    onClick={() => {
                                        if (isUploading && !confirm('Batal?')) return;
                                        setShowUploadModal(false);
                                        setUploadItems([]);
                                    }}
                                    className="flex-1 md:flex-none px-4 py-2 rounded-lg font-bold text-slate-500 bg-white border border-slate-200 hover:bg-slate-50 hover:text-slate-700 transition-colors"
                                >
                                    Batal
                                </button>
                                <button
                                    onClick={handleUpload}
                                    disabled={isUploading || uploadItems.length === 0}
                                    className="flex-1 md:flex-none px-6 py-2 rounded-lg font-bold text-white bg-ppm-slate hover:bg-ppm-slate-light transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {!isUploading && <Upload size={16} />}
                                    {isUploading ? 'Memproses...' : 'Mulai Upload'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Create form (Modal) */}
            {showCreate && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
                        <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-slate-50">
                            <h3 className="text-sm font-black text-ppm-slate uppercase tracking-wide">Buat Master Data Baru</h3>
                            <button onClick={() => {
                                setShowCreate(false);
                                setNewLabel('');
                                setNewTableName('');
                                setNewKolom([{ nama: '', tipe: 'string', wajib: false }]);
                                setAuditFeatures({
                                    created_at: true, created_by: false,
                                    updated_at: true, updated_by: false,
                                    deleted_at: false, deleted_by: false
                                });
                            }} className="text-slate-400 hover:text-red-500 transition-colors p-1"><X size={20} /></button>
                        </div>

                        <div className="p-5 overflow-y-auto flex-1">

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Label (Nama Tampilan) *</label>
                                    <input
                                        autoFocus type="text"
                                        className="input-modern"
                                        placeholder="Contoh: Master Kecamatan"
                                        value={newLabel}
                                        onChange={(e) => { setNewLabel(e.target.value); setNewTableName(generateTableName(e.target.value)); }}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Nama Tabel (otomatis, prefix: master_) *</label>
                                    <div className="flex items-center gap-1">
                                        <span className="text-xs text-slate-400 font-mono">master_</span>
                                        <input
                                            type="text"
                                            className="flex-1 border border-slate-300 p-2 text-sm font-mono outline-none focus:border-ppm-slate"
                                            placeholder="nama_tabel"
                                            value={newTableName}
                                            onChange={(e) => setNewTableName(e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Column definitions */}
                            <div className="mb-4">
                                <div className="flex justify-between items-center mb-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase">Definisi Kolom</label>
                                    <button onClick={addKolom} className="text-ppm-slate text-xs font-bold flex items-center gap-1 hover:text-ppm-slate-light transition-colors">
                                        <Plus size={12} /> Tambah Kolom
                                    </button>
                                </div>
                                <div className="space-y-2">
                                    {newKolom.map((k, idx) => (
                                        <div key={idx} className="flex items-center gap-2 bg-white p-2 border border-slate-200">
                                            <span className="text-xs text-slate-400 font-mono w-6 text-center">{idx + 1}</span>
                                            <input
                                                type="text"
                                                className="flex-1 border border-slate-300 p-1.5 text-sm outline-none focus:border-ppm-slate"
                                                placeholder="Nama kolom..."
                                                value={k.nama}
                                                onChange={e => updateKolom(idx, 'nama', e.target.value)}
                                            />
                                            <select
                                                className="border border-slate-300 p-1.5 text-xs outline-none focus:border-ppm-slate"
                                                value={k.tipe}
                                                onChange={e => updateKolom(idx, 'tipe', e.target.value)}
                                            >
                                                {TIPE_KOLOM.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                                            </select>
                                            <label className="flex items-center gap-1 text-xs text-slate-500 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={k.wajib}
                                                    onChange={e => updateKolom(idx, 'wajib', e.target.checked)}
                                                    className="accent-ppm-slate"
                                                />
                                                Wajib
                                            </label>
                                            {newKolom.length > 1 && (
                                                <button onClick={() => removeKolom(idx)} className="text-red-500 hover:text-red-700 p-1"><X size={14} /></button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Kolom Audit (Checkboxes) */}
                            <div className="mb-6 bg-white p-4 border border-slate-200">
                                <label className="text-xs font-bold text-slate-500 uppercase mb-3 block border-b border-slate-100 pb-2">Fitur Audit Otomatis (Database)</label>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    {Object.entries(auditFeatures).map(([key, isChecked]) => (
                                        <label key={key} className="flex items-center gap-2 cursor-pointer bg-slate-50 p-2 border border-slate-100 rounded hover:border-ppm-slate transition-colors select-none">
                                            <input
                                                type="checkbox"
                                                checked={isChecked}
                                                onChange={(e) => setAuditFeatures(prev => ({ ...prev, [key]: e.target.checked }))}
                                                className="accent-ppm-slate w-4 h-4 cursor-pointer"
                                            />
                                            <div className="flex flex-col">
                                                <span className="text-xs font-bold text-slate-700 font-mono leading-tight">{key}</span>
                                                <span className="text-[9px] text-slate-400">
                                                    {key.endsWith('_at') ? 'Waktu Otomatis' : 'User ID (Otomatis)'}
                                                </span>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>

                        </div>

                        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-4">
                            <button onClick={() => {
                                setShowCreate(false);
                                setNewLabel('');
                                setNewTableName('');
                                setNewKolom([{ nama: '', tipe: 'string', wajib: false }]);
                                setAuditFeatures({
                                    created_at: true, created_by: false,
                                    updated_at: true, updated_by: false,
                                    deleted_at: false, deleted_by: false
                                });
                            }} className="btn-secondary">
                                Batal
                            </button>
                            <button onClick={handleCreate} className="btn-primary">
                                <Check size={16} /> Buat Master Data
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="mb-6 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-3">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tampilkan</span>
                    <select
                        value={pageSize}
                        onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                        className="input-modern py-1 px-3 text-xs w-20 h-9 font-bold cursor-pointer"
                    >
                        {PAGE_SIZES.map(s => (
                            <option key={s} value={s}>{s === 0 ? 'Semua' : s}</option>
                        ))}
                    </select>
                    <div className="h-4 w-px bg-slate-200 mx-1"></div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">
                        <b>{displayedConfigs.length}</b> dari <b>{filteredConfigs.length}</b> data
                    </span>
                </div>
                <div className="relative w-full sm:w-80">
                    <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="text" placeholder="Cari master data..." value={search} onChange={e => setSearch(e.target.value)} className="input-modern pl-10" />
                </div>
            </div>

            {/* Config list */}
            {loading ? (
                <div className="flex justify-center py-12"><Loader2 className="animate-spin text-ppm-slate" size={32} /></div>
            ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-sm">
                        <thead>
                            <tr>
                                <th className="table-header w-12 text-center rounded-tl-xl">NO</th>
                                <th className="table-header">Label</th>
                                <th className="table-header">Nama Tabel</th>
                                <th className="table-header">Kolom</th>
                                <th className="table-header w-16 text-center">Status</th>
                                <th className="table-header w-32 text-center rounded-tr-xl">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {displayedConfigs.map((cfg, index) => (
                                <tr key={cfg.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="p-3 border-b border-slate-100 font-mono text-xs text-slate-500 text-center">{(currentPage - 1) * (pageSize || filteredConfigs.length) + index + 1}</td>
                                    <td className={`p-3 border-b border-slate-100 ${editingConfigId === cfg.id ? '' : 'font-bold text-ppm-slate'}`}>
                                        {editingConfigId === cfg.id ? (
                                            <input autoFocus type="text" className="input-modern" value={editConfigLabel} onChange={e => setEditConfigLabel(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleUpdateConfig(cfg.id)} />
                                        ) : cfg.label}
                                    </td>
                                    <td className="p-3 border-b border-slate-100 text-xs font-mono text-slate-500">{cfg.nama_tabel}</td>
                                    <td className="p-3 border-b border-slate-100">
                                        <div className="flex flex-wrap gap-1">
                                            {cfg.kolom.map((k, i) => (
                                                <span key={i} className="inline-block px-1.5 py-0.5 text-[9px] font-bold bg-blue-100 text-blue-700">
                                                    {k.nama} <span className="text-blue-400">({k.tipe})</span>
                                                </span>
                                            ))}
                                        </div>
                                    </td>
                                    <td className="p-3 border-b border-slate-100 text-center">
                                        <span className={`inline-block px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${cfg.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                            {cfg.is_active ? 'Aktif' : 'Non'}
                                        </span>
                                    </td>
                                    <td className="p-3 border-b border-slate-100">
                                        <div className="flex justify-center gap-4">
                                            {editingConfigId === cfg.id ? (
                                                <>
                                                    <button onClick={() => handleUpdateConfig(cfg.id)} className="text-slate-400 hover:text-emerald-600 p-1.5 hover:bg-emerald-50 rounded-full" title="Simpan"><Check size={18} /></button>
                                                    <button onClick={() => { setEditingConfigId(null); }} className="text-slate-400 hover:text-rose-600 p-1.5 hover:bg-rose-50 rounded-full" title="Batal"><X size={18} /></button>
                                                </>
                                            ) : (
                                                <>
                                                    <button onClick={() => { setEditingConfigId(cfg.id); setEditConfigLabel(cfg.label); }} className="text-slate-400 hover:text-indigo-600 p-2 hover:bg-indigo-50/80 rounded-xl transition-colors" title="Edit">
                                                        <Edit2 size={16} />
                                                    </button>
                                                    <button onClick={() => setViewingConfig(cfg)} className="text-slate-400 hover:text-indigo-600 p-2 hover:bg-indigo-50/80 rounded-xl transition-colors" title="Lihat Data">
                                                        <Database size={16} />
                                                    </button>
                                                    <button onClick={() => handleDelete(cfg.id)} className="text-slate-400 hover:text-rose-600 p-2 hover:bg-rose-50/80 rounded-xl transition-colors" title="Hapus">
                                                        <Trash2 size={16} />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {displayedConfigs.length === 0 && !showCreate && (
                                <tr><td colSpan={6} className="p-12 text-center text-slate-400 font-bold italic">{search ? 'Tidak ada hasil pencarian' : 'Belum ada master data dinamis. Klik "Master Data Baru" untuk memulai.'}</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
            {!loading && (
                <div className="flex justify-end mt-4">
                    {renderPageButtons(currentPage, totalPages, setCurrentPage)}
                </div>
            )}
        </div>
    );
};

export default BuatMasterData;


