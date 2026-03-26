import { useState, useEffect, useMemo } from 'react';
import { api } from '../services/api';
import { Plus, Trash2, X, Check, Loader2, Search, Database, ArrowLeft, Edit2, ChevronDown, ChevronRight } from 'lucide-react';

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
                    <button key={p} onClick={() => setCurrentPage(p)} className={`px-2.5 py-1 border text-xs font-bold transition-colors ${p === currentPage ? 'bg-ppm-green text-white border-ppm-green' : 'border-slate-300 hover:border-ppm-green'}`}>{p}</button>
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

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await api.masterDataConfig.getData(config.id);
            if (res.success) setData(res.data);
        } catch { }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchData(); }, [config.id]);

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
        <div className="bg-white p-6 shadow-sm border border-slate-200">
            <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-3">
                    <button onClick={onBack} className="text-ppm-green hover:text-ppm-light-green p-1 transition-colors"><ArrowLeft size={20} /></button>
                    <h2 className="text-xl font-black text-ppm-green uppercase tracking-tight">{config.label}</h2>
                    <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-2 py-0.5">{config.nama_tabel}</span>
                </div>
                <button onClick={() => setIsAdding(true)} className="bg-ppm-green text-white px-4 py-2 text-xs font-bold uppercase tracking-wider flex items-center gap-2 hover:bg-ppm-light-green transition-colors">
                    <Plus size={14} /> Tambah Data
                </button>
            </div>

            <div className="mb-4 flex justify-end">
                <div className="relative w-full sm:w-72">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="text" placeholder="Cari data..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-3 py-2 border border-slate-300 text-sm outline-none focus:border-ppm-green transition-colors" />
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-12"><Loader2 className="animate-spin text-ppm-green" size={32} /></div>
            ) : (
                <>
                    <div className="overflow-x-auto">
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
                                                <input
                                                    type={k.tipe === 'number' || k.tipe === 'decimal' ? 'number' : k.tipe === 'date' ? 'date' : 'text'}
                                                    className="w-full border-2 border-ppm-green p-1.5 text-sm outline-none"
                                                    placeholder={k.nama}
                                                    value={newRow[k.nama_db] || ''}
                                                    onChange={e => setNewRow({ ...newRow, [k.nama_db]: e.target.value })}
                                                />
                                            </td>
                                        ))}
                                        <td className="p-2 border-b border-slate-100">
                                            <div className="flex justify-center gap-2">
                                                <button onClick={handleAdd} className="text-ppm-green p-1 hover:bg-slate-100 rounded-full"><Check size={18} /></button>
                                                <button onClick={() => { setIsAdding(false); setNewRow({}); }} className="text-red-600 p-1 hover:bg-red-100 rounded-full"><X size={18} /></button>
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
                                                    <input
                                                        type={k.tipe === 'number' || k.tipe === 'decimal' ? 'number' : k.tipe === 'date' ? 'date' : 'text'}
                                                        className="w-full border-2 border-ppm-green p-1.5 text-sm outline-none"
                                                        value={editRow[k.nama_db] || ''}
                                                        onChange={e => setEditRow({ ...editRow, [k.nama_db]: e.target.value })}
                                                    />
                                                ) : (
                                                    <span className="font-bold text-ppm-green">{row[k.nama_db] !== null && row[k.nama_db] !== undefined ? String(row[k.nama_db]) : '-'}</span>
                                                )}
                                            </td>
                                        ))}
                                        <td className="p-3 border-b border-slate-100">
                                            <div className="flex justify-center gap-2">
                                                {editingId === row.id ? (
                                                    <>
                                                        <button onClick={() => handleUpdate(row.id)} className="text-ppm-green p-1 hover:bg-slate-100 rounded-full"><Check size={18} /></button>
                                                        <button onClick={() => { setEditingId(null); window.dispatchEvent(new CustomEvent('sidebar:expand')); }} className="text-red-600 p-1 hover:bg-red-100 rounded-full"><X size={18} /></button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <button onClick={() => { setEditingId(row.id); const vals: Record<string, string> = {}; config.kolom.forEach(k => { vals[k.nama_db] = row[k.nama_db] !== null ? String(row[k.nama_db]) : ''; }); setEditRow(vals); }} className="text-blue-600 hover:text-blue-800 p-1 transition-colors"><Edit2 size={16} /></button>
                                                        <button onClick={() => handleDelete(row.id)} className="text-red-600 hover:text-red-800 p-1 transition-colors"><Trash2 size={16} /></button>
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
                    <div className="flex flex-col sm:flex-row justify-between items-center mt-4 gap-3">
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                            <span>Tampilkan</span>
                            <select value={pageSize} onChange={e => setPageSize(Number(e.target.value))} className="border border-slate-300 px-2 py-1.5 text-xs outline-none focus:border-ppm-green">
                                {PAGE_SIZES.map(s => <option key={s} value={s}>{s === 0 ? 'Semua' : s}</option>)}
                            </select>
                            <span className="text-slate-400">|</span>
                            <span>{displayed.length} dari {filtered.length} data</span>
                        </div>
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
            const res = await api.masterDataConfig.getAll();
            if (res.success) setConfigs(res.data);
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

    useEffect(() => { setCurrentPage(1); }, [search, pageSize]);

    // If viewing a specific master data table
    if (viewingConfig) {
        return <DataTableView config={viewingConfig} onBack={() => { setViewingConfig(null); fetchConfigs(); }} />;
    }

    return (
        <div className="bg-white p-6 shadow-sm border border-slate-200">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-black text-ppm-green uppercase tracking-tight flex items-center gap-2">
                    <Database size={22} /> Buat Master Data
                </h2>
                <button
                    onClick={() => setShowCreate(true)}
                    className="bg-ppm-green text-white px-4 py-2 text-xs font-bold uppercase tracking-wider flex items-center gap-2 hover:bg-ppm-light-green transition-colors"
                >
                    <Plus size={14} /> Master Data Baru
                </button>
            </div>

            {!showCreate && !viewingConfig && (
                <div className="mb-4 flex justify-end">
                    <div className="relative w-full sm:w-72">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input type="text" placeholder="Cari master data..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-3 py-2 border border-slate-300 text-sm outline-none focus:border-ppm-green transition-colors" />
                    </div>
                </div>
            )}

            {/* Create form (Modal) */}
            {showCreate && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
                        <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-slate-50">
                            <h3 className="text-sm font-black text-ppm-green uppercase tracking-wide">Buat Master Data Baru</h3>
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
                                window.dispatchEvent(new CustomEvent('sidebar:expand'));
                            }} className="text-slate-400 hover:text-red-500 transition-colors p-1"><X size={20} /></button>
                        </div>

                        <div className="p-5 overflow-y-auto flex-1">

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Label (Nama Tampilan) *</label>
                                    <input
                                        autoFocus type="text"
                                        className="w-full border border-slate-300 p-2 text-sm outline-none focus:border-ppm-green"
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
                                            className="flex-1 border border-slate-300 p-2 text-sm font-mono outline-none focus:border-ppm-green"
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
                                    <button onClick={addKolom} className="text-ppm-green text-xs font-bold flex items-center gap-1 hover:text-ppm-light-green transition-colors">
                                        <Plus size={12} /> Tambah Kolom
                                    </button>
                                </div>
                                <div className="space-y-2">
                                    {newKolom.map((k, idx) => (
                                        <div key={idx} className="flex items-center gap-2 bg-white p-2 border border-slate-200">
                                            <span className="text-xs text-slate-400 font-mono w-6 text-center">{idx + 1}</span>
                                            <input
                                                type="text"
                                                className="flex-1 border border-slate-300 p-1.5 text-sm outline-none focus:border-ppm-green"
                                                placeholder="Nama kolom..."
                                                value={k.nama}
                                                onChange={e => updateKolom(idx, 'nama', e.target.value)}
                                            />
                                            <select
                                                className="border border-slate-300 p-1.5 text-xs outline-none focus:border-ppm-green"
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
                                                    className="accent-ppm-green"
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
                                        <label key={key} className="flex items-center gap-2 cursor-pointer bg-slate-50 p-2 border border-slate-100 rounded hover:border-ppm-green transition-colors select-none">
                                            <input
                                                type="checkbox"
                                                checked={isChecked}
                                                onChange={(e) => setAuditFeatures(prev => ({ ...prev, [key]: e.target.checked }))}
                                                className="accent-ppm-green w-4 h-4 cursor-pointer"
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

                        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-2">
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
                                window.dispatchEvent(new CustomEvent('sidebar:expand'));
                            }} className="px-4 py-2 text-xs font-bold uppercase flex items-center gap-2 text-slate-500 hover:bg-slate-200 transition-colors rounded">
                                Batal
                            </button>
                            <button onClick={handleCreate} className="bg-ppm-green text-white px-5 py-2 text-xs font-bold uppercase flex items-center gap-2 hover:bg-ppm-light-green transition-colors rounded shadow-sm">
                                <Check size={16} /> Buat Master Data
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Config list */}
            {loading ? (
                <div className="flex justify-center py-12"><Loader2 className="animate-spin text-ppm-green" size={32} /></div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr>
                                <th className="table-header w-16 text-center">NO</th>
                                <th className="table-header">Label</th>
                                <th className="table-header">Nama Tabel</th>
                                <th className="table-header">Kolom</th>
                                <th className="table-header w-16 text-center">Status</th>
                                <th className="table-header w-32 text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {displayedConfigs.map((cfg, index) => (
                                <tr key={cfg.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="p-3 border-b border-slate-100 font-mono text-xs text-slate-500 text-center">{(currentPage - 1) * (pageSize || filteredConfigs.length) + index + 1}</td>
                                    <td className={`p-3 border-b border-slate-100 ${editingConfigId === cfg.id ? '' : 'font-bold text-ppm-green'}`}>
                                        {editingConfigId === cfg.id ? (
                                            <input autoFocus type="text" className="w-full border-2 border-ppm-green p-1.5 text-sm outline-none" value={editConfigLabel} onChange={e => setEditConfigLabel(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleUpdateConfig(cfg.id)} />
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
                                                    <button onClick={() => handleUpdateConfig(cfg.id)} className="text-ppm-green p-1 hover:bg-slate-100 rounded-full" title="Simpan"><Check size={18} /></button>
                                                    <button onClick={() => { setEditingConfigId(null); window.dispatchEvent(new CustomEvent('sidebar:expand')); }} className="text-red-600 p-1 hover:bg-red-100 rounded-full" title="Batal"><X size={18} /></button>
                                                </>
                                            ) : (
                                                <>
                                                    <button onClick={() => { setEditingConfigId(cfg.id); setEditConfigLabel(cfg.label); }} className="text-blue-600 hover:text-blue-800 p-1 transition-colors" title="Edit">
                                                        <Edit2 size={16} />
                                                    </button>
                                                    <button onClick={() => setViewingConfig(cfg)} className="text-blue-600 hover:text-blue-800 p-1 transition-colors" title="Lihat Data">
                                                        <Database size={16} />
                                                    </button>
                                                    <button onClick={() => handleDelete(cfg.id)} className="text-red-600 hover:text-red-800 p-1 transition-colors" title="Hapus">
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
                <div className="flex flex-col sm:flex-row justify-between items-center mt-4 gap-3">
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span>Tampilkan</span>
                        <select value={pageSize} onChange={e => setPageSize(Number(e.target.value))} className="border border-slate-300 px-2 py-1.5 text-xs outline-none focus:border-ppm-green">
                            {PAGE_SIZES.map(s => <option key={s} value={s}>{s === 0 ? 'Semua' : s}</option>)}
                        </select>
                        <span className="text-slate-400">|</span>
                        <span>{displayedConfigs.length} dari {filteredConfigs.length} data</span>
                    </div>
                    {renderPageButtons(currentPage, totalPages, setCurrentPage)}
                </div>
            )}
        </div>
    );
};

export default BuatMasterData;
