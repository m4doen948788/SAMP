import React, { useState, useEffect, useMemo } from 'react';
import { api } from '@/src/services/api';
import { useLabels } from '@/src/contexts/LabelContext';
import { Plus, Edit2, Trash2, X, Check, Loader2, Search, ArrowLeft } from 'lucide-react';

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
                    <button key={p} onClick={() => setCurrentPage(p)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 ${p === currentPage ? 'bg-ppm-slate text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}`}>{p}</button>
                )
            )}
        </div>
    );
};

interface DynamicTablePageProps {
    title: string;
    tableName: string;
}

const DynamicTablePage: React.FC<DynamicTablePageProps> = ({ title, tableName }) => {
    const { getLabel } = useLabels();
    const [data, setData] = useState<any[]>([]);
    const [columns, setColumns] = useState<string[]>([]);
    const [columnMappings, setColumnMappings] = useState<any[]>([]);
    const [optionsData, setOptionsData] = useState<{ [key: string]: any[] }>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isAdding, setIsAdding] = useState(false);
    const [newForm, setNewForm] = useState<any>({});
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editForm, setEditForm] = useState<any>({});
    const [search, setSearch] = useState('');
    const [pageSize, setPageSize] = useState(10);
    const [currentPage, setCurrentPage] = useState(1);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await api.masterDataConfig.getDataByTable(tableName);
            if (res.success) {
                setData(res.data);
                const colConfigs = res.columnConfig || [];
                setColumnMappings(colConfigs);

                if (res.columns) {
                    setColumns(res.columns);
                } else if (res.data.length > 0) {
                    setColumns(Object.keys(res.data[0]).filter(k => k !== 'id' && !k.includes('_at') && !k.includes('_by')));
                } else {
                    setColumns([]);
                }

                // Fetch options for select or relation columns
                const selectCols = colConfigs.filter((c: any) => 
                    (c.tipe === 'select' && c.source_table) || 
                    (c.tipe === 'relation' && c.relation_table)
                );
                if (selectCols.length > 0) {
                    const optionsObj: any = {};
                    await Promise.all(selectCols.map(async (col: any) => {
                        const sourceTable = col.relation_table || col.source_table;
                        try {
                            const optRes = await api.masterDataConfig.getDataByTable(sourceTable);
                            if (optRes.success) {
                                optionsObj[col.nama_db] = optRes.data;
                            }
                        } catch (e) {
                            console.error(`Failed to fetch options for ${col.nama_db}`, e);
                        }
                    }));
                    setOptionsData(optionsObj);
                }
            } else {
                setError(res.message);
            }
        } catch (err) {
            setError('Gagal mengambil data dari tabel ' + tableName);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        setIsAdding(false);
        setEditingId(null);
    }, [tableName]);

    const filtered = useMemo(() => {
        if (!search.trim()) return data;
        const q = search.toLowerCase();
        return data.filter(d =>
            Object.values(d).some(v => String(v).toLowerCase().includes(q))
        );
    }, [data, search]);

    const totalPages = pageSize === 0 ? 1 : Math.ceil(filtered.length / pageSize);
    const displayed = pageSize === 0 ? filtered : filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    useEffect(() => { setCurrentPage(1); }, [search, pageSize]);

    const handleAdd = async () => {
        if (Object.keys(newForm).length === 0) return;
        try {
            const res = await api.masterDataConfig.createDataByTable(tableName, newForm);
            if (res.success) {
                setNewForm({});
                setIsAdding(false);
                fetchData();
            } else {
                alert('Gagal menambah data: ' + res.message);
            }
        } catch (err) {
            alert('Gagal menambah data');
        }
    };

    const handleUpdate = async (id: number) => {
        if (Object.keys(editForm).length === 0) return;
        try {
            const res = await api.masterDataConfig.updateDataByTable(tableName, id, editForm);
            if (res.success) {
                setEditingId(null);
                fetchData();
            } else {
                alert('Gagal mengubah data: ' + res.message);
            }
        } catch (err) {
            alert('Gagal mengubah data');
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Hapus data ini?')) return;
        try {
            const res = await api.masterDataConfig.deleteDataByTable(tableName, id);
            if (res.success) {
                fetchData();
            } else {
                alert('Gagal menghapus data: ' + res.message);
            }
        } catch (err) {
            alert('Gagal menghapus data');
        }
    };

    const renderCellValue = (item: any, col: string) => {
        const config = columnMappings.find(c => c.nama_db === col);
        if ((config?.tipe === 'select' || config?.tipe === 'relation') && optionsData[col]) {
            const displayCol = config.relation_label || config.display_column || 'nama';
            const option = optionsData[col].find(opt => opt.id === item[col]);
            return option ? (option[displayCol] || option.nama || option.id) : item[col];
        }
        return item[col];
    };

    const renderInput = (col: string, value: any, onChange: (val: any) => void, onEnter?: () => void) => {
        const config = columnMappings.find(c => c.nama_db === col);

        if ((config?.tipe === 'select' || config?.tipe === 'relation') && optionsData[col]) {
            const displayCol = config.relation_label || config.display_column || 'nama';
            return (
                <select
                    className="input-modern"
                    value={value || ''}
                    onChange={e => onChange(e.target.value)}
                >
                    <option value="">Pilih {config.nama || col.replace(/_/g, ' ')}...</option>
                    {optionsData[col].map(opt => (
                        <option key={opt.id} value={opt.id}>
                            {opt[displayCol] || opt.nama || opt.id}
                        </option>
                    ))}
                </select>
            );
        }

        return (
            <input
                autoFocus={columns[0] === col}
                type={config?.tipe === 'number' ? 'number' : 'text'}
                className="input-modern"
                placeholder={`Masukkan ${col.replace(/_/g, ' ')}...`}
                value={value || ''}
                onChange={e => onChange(e.target.value)}
                onKeyPress={e => e.key === 'Enter' && onEnter && onEnter()}
            />
        );
    };

    return (
        <div className="card-modern p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-[22px] font-extrabold text-slate-800 tracking-tight">{title}</h2>
                    <p className="text-slate-500 text-sm mt-1">Kelola data untuk tabel {tableName}.</p>
                </div>
                <button onClick={() => setIsAdding(true)} className="btn-primary">
                    <Plus size={16} /> Tambah Data
                </button>
            </div>

            <div className="mb-6 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-3">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tampilkan</span>
                    <select
                        value={pageSize}
                        onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                        className="input-modern py-1 px-3 text-xs w-24 h-9 font-bold cursor-pointer"
                    >
                        {PAGE_SIZES.map(s => (
                            <option key={s} value={s}>{s === 0 ? 'Semua' : s}</option>
                        ))}
                    </select>
                    <div className="h-4 w-px bg-slate-200 mx-1"></div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">
                        <b>{displayed.length}</b> dari <b>{filtered.length}</b> data
                    </span>
                </div>
                <div className="relative w-full sm:w-80">
                    <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="text" placeholder="Cari data..." value={search} onChange={e => setSearch(e.target.value)} className="input-modern pl-10" />
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-12"><Loader2 className="animate-spin text-ppm-slate" size={44} /></div>
            ) : error ? (
                <div className="text-red-600 text-center py-12 font-bold">{error}</div>
            ) : (
                <>
                    <div className="overflow-x-auto rounded-xl border border-slate-100 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.02)]">
                        <table className="w-full text-sm">
                            <thead>
                                <tr>
                                    <th className="table-header w-16 text-center rounded-tl-xl">#</th>
                                    {columns.map(col => (
                                        <th key={col} className="table-header">
                                            {getLabel(tableName, col, col.replace(/_/g, ' ').toUpperCase())}
                                        </th>
                                    ))}
                                    <th className="table-header w-32 text-center rounded-tr-xl">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white">
                                {isAdding && (
                                    <tr className="bg-blue-50">
                                        <td className="p-3 border-b border-slate-100 text-slate-400 text-center text-xs font-mono">NEW</td>
                                        {columns.map(col => (
                                            <td key={col} className="p-2 border-b border-slate-100">
                                                {renderInput(
                                                    col,
                                                    newForm[col],
                                                    val => setNewForm({ ...newForm, [col]: val }),
                                                    handleAdd
                                                )}
                                            </td>
                                        ))}
                                        <td className="p-2 border-b border-slate-100">
                                            <div className="flex justify-center gap-3">
                                                <button onClick={handleAdd} className="text-slate-400 hover:text-emerald-600 p-1.5 hover:bg-emerald-50 rounded-full" title="Simpan"><Check size={18} /></button>
                                                <button onClick={() => setIsAdding(false)} className="text-slate-400 hover:text-rose-600 p-1.5 hover:bg-rose-50 rounded-full" title="Batal"><X size={18} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                                {displayed.map((item, index) => (
                                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors border-b border-slate-50 group/row">
                                        <td className="p-4 border-b border-slate-50 font-mono text-xs text-slate-400 text-center font-medium">{(currentPage - 1) * (pageSize || filtered.length) + index + 1}</td>
                                        {columns.map((col, colIdx) => (
                                            <td key={col} className={`p-4 border-b border-slate-50 ${editingId === item.id ? '' : colIdx === 0 ? 'font-semibold text-slate-800 tracking-tight text-sm' : 'font-medium text-slate-600 text-sm'}`}>
                                                {editingId === item.id ? (
                                                    renderInput(
                                                        col,
                                                        editForm[col] !== undefined ? editForm[col] : item[col],
                                                        val => setEditForm({ ...editForm, [col]: val }),
                                                        () => handleUpdate(item.id)
                                                    )
                                                ) : renderCellValue(item, col)}
                                            </td>
                                        ))}
                                        <td className="p-4 border-b border-slate-50">
                                            <div className="flex justify-center flex-row gap-2">
                                                {editingId === item.id ? (
                                                    <>
                                                        <button onClick={() => handleUpdate(item.id)} className="text-slate-400 hover:text-emerald-600 p-1.5 hover:bg-emerald-50 rounded-full" title="Simpan"><Check size={18} /></button>
                                                        <button onClick={() => setEditingId(null)} className="text-slate-400 hover:text-rose-600 p-1.5 hover:bg-rose-50 rounded-full" title="Batal"><X size={18} /></button>
                                                    </>
                                                ) : (
                                                    <div className="opacity-100 transition-opacity flex gap-2">
                                                        <button onClick={() => {
                                                            setEditingId(item.id);
                                                            const currentValues: any = {};
                                                            columns.forEach(c => currentValues[c] = item[c]);
                                                            setEditForm(currentValues);
                                                        }} className="text-slate-400 hover:text-indigo-600 p-2 hover:bg-indigo-50/80 rounded-xl transition-colors" title="Edit Data"><Edit2 size={16} /></button>
                                                        <button onClick={() => handleDelete(item.id)} className="text-slate-400 hover:text-rose-600 p-2 hover:bg-rose-50/80 rounded-xl transition-colors" title="Hapus Data"><Trash2 size={16} /></button>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {displayed.length === 0 && !isAdding && (
                                    <tr><td colSpan={columns.length + 2} className="p-12 text-center text-slate-400 font-bold italic">{search ? 'Tidak ada hasil pencarian' : 'Tidak ada data'}</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    <div className="flex justify-end mt-6">
                        {renderPageButtons(currentPage, totalPages, setCurrentPage)}
                    </div>
                </>
            )}
        </div>
    );
};

export default DynamicTablePage;

