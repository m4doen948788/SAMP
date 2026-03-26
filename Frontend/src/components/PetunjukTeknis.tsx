import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Edit2, Trash2, X, Check, Loader2, ChevronRight, Search } from 'lucide-react';

interface Referensi {
    id: number;
    judul: string;
    konten: string;
    is_superadmin_only: boolean | number;
}

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

const PetunjukTeknis = () => {
    const { user } = useAuth();
    const [data, setData] = useState<Referensi[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const [newRow, setNewRow] = useState({ judul: '', konten: '', is_superadmin_only: false });
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editRow, setEditRow] = useState({ judul: '', konten: '', is_superadmin_only: false });
    const [expandedIds, setExpandedIds] = useState<number[]>([]);

    // Search and Pagination states
    const [searchTerm, setSearchTerm] = useState('');
    const [pageSize, setPageSize] = useState(10);
    const [currentPage, setCurrentPage] = useState(1);

    const toggleExpand = (id: number) => {
        setExpandedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await api.referensi.getAll();
            if (res.success) {
                let filteredData = res.data;
                const isSuperAdmin = user?.tipe_user_id === 1;
                
                // Server-side/Process-level Filtering for security
                if (!isSuperAdmin) {
                    filteredData = filteredData.filter((item: Referensi) => !item.is_superadmin_only && !item.judul.toLowerCase().includes('nayaxa ai'));
                }
                setData(filteredData);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleAdd = async () => {
        if (!newRow.judul || !newRow.konten) return;
        try {
            const res = await api.referensi.create(newRow);
            if (res.success) {
                setNewRow({ judul: '', konten: '', is_superadmin_only: false });
                setIsAdding(false);
                fetchData();
            }
        } catch (err) {
            alert('Gagal menambah data');
        }
    };

    const handleUpdate = async (id: number) => {
        if (!editRow.judul || !editRow.konten) return;
        try {
            const res = await api.referensi.update(id, editRow);
            if (res.success) {
                setEditingId(null);
                fetchData();
            }
        } catch (err) {
            alert('Gagal mengubah data');
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Hapus petunjuk teknis ini?')) return;
        try {
            const res = await api.referensi.delete(id);
            if (res.success) fetchData();
        } catch (err) {
            alert('Gagal menghapus data');
        }
    };

    // Filter and Pagination Logic
    const filteredData = useMemo(() => {
        const q = searchTerm.toLowerCase();
        return data.filter(item =>
            item.judul.toLowerCase().includes(q) ||
            item.konten.toLowerCase().includes(q)
        );
    }, [data, searchTerm]);

    const totalPages = pageSize === 0 ? 1 : Math.ceil(filteredData.length / pageSize);
    const currentData = useMemo(() => {
        if (pageSize === 0) return filteredData;
        const start = (currentPage - 1) * pageSize;
        return filteredData.slice(start, start + pageSize);
    }, [filteredData, currentPage, pageSize]);

    // Reset page when search term or pageSize changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, pageSize]);

    return (
        <div className="card-modern p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-xl font-black text-ppm-slate uppercase tracking-tight">PETUNJUK TEKNIS</h2>
                    <p className="text-slate-500 text-xs mt-1">Panduan, langkah-langkah, dan dokumentasi operasional sistem.</p>
                </div>
                {!isAdding && user?.tipe_user_id === 1 && (
                    <button
                        onClick={() => setIsAdding(true)}
                        className="btn-primary"
                    >
                        <Plus size={14} /> Tambah Petunjuk
                    </button>
                )}
            </div>

            {isAdding && (
                <div className="mb-6 p-4 bg-blue-50 border-2 border-ppm-slate rounded-lg">
                    <div className="space-y-4">
                        <div>
                            <label className="text-xs font-bold text-slate-500 mb-1 block">Judul</label>
                            <input
                                autoFocus
                                type="text"
                                className="input-modern bg-white"
                                placeholder="Judul petunjuk / langkah..."
                                value={newRow.judul}
                                onChange={e => setNewRow({ ...newRow, judul: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 mb-1 block">Konten / Langkah-Langkah</label>
                            <textarea
                                rows={6}
                                className="input-modern bg-white resize-y"
                                placeholder="Isi detail langkah-langkah..."
                                value={newRow.konten}
                                onChange={e => setNewRow({ ...newRow, konten: e.target.value })}
                            />
                        </div>
                        <div className="flex items-center gap-2 bg-white p-3 rounded border border-slate-200 w-fit">
                            <input
                                id="is_superadmin_only_new"
                                type="checkbox"
                                className="w-4 h-4 text-ppm-slate focus:ring-ppm-slate border-gray-300 rounded"
                                checked={newRow.is_superadmin_only}
                                onChange={e => setNewRow({ ...newRow, is_superadmin_only: e.target.checked })}
                            />
                            <label htmlFor="is_superadmin_only_new" className="text-xs font-bold text-slate-700 cursor-pointer">Hanya Superadmin (Rahasia)</label>
                        </div>
                        <div className="flex gap-2 justify-end">
                            <button onClick={() => setIsAdding(false)} className="text-slate-500 hover:text-slate-700 px-3 py-1 text-sm font-bold">Batal</button>
                            <button onClick={handleAdd} className="bg-ppm-slate text-white px-4 py-1.5 text-xs font-bold uppercase flex items-center gap-2 hover:bg-ppm-slate-light transition-colors rounded">
                                <Check size={14} /> Simpan
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {loading ? (
                <div className="flex justify-center py-12"><Loader2 className="animate-spin text-ppm-slate" size={32} /></div>
            ) : (
                <>
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
                                <b>{currentData.length}</b> dari <b>{filteredData.length}</b> data
                            </span>
                        </div>
                        <div className="relative w-full sm:w-80">
                            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Cari juknis..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="input-modern pl-10"
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-slate-50">
                                    <th className="p-4 w-15 text-center font-bold text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-100">No</th>
                                    <th className="p-4 text-left font-bold text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-100">Judul Petunjuk</th>
                                    <th className="p-4 w-32 text-center font-bold text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-100">Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {currentData.map((item, index) => {
                                    const isExpanded = expandedIds.includes(item.id);
                                    const isEditing = editingId === item.id;

                                    return (
                                        <React.Fragment key={item.id}>
                                            <tr
                                                className={`group/row transition-colors border-b border-slate-100 ${isExpanded ? 'bg-ppm-slate/5' : 'hover:bg-slate-50 cursor-pointer'}`}
                                                onClick={() => { if (!isEditing) toggleExpand(item.id); }}
                                            >
                                                <td className="p-4 text-center">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <ChevronRight size={16} className={`text-slate-400 transition-transform duration-300 ${isExpanded ? 'rotate-90 text-ppm-slate' : ''}`} />
                                                        <span className="font-bold text-slate-500">{(currentPage - 1) * (pageSize || filteredData.length) + index + 1}</span>
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    {isEditing ? (
                                                        <input
                                                            type="text"
                                                            className="w-full border-2 border-ppm-slate p-1.5 text-sm font-bold outline-none bg-white"
                                                            value={editRow.judul}
                                                            onChange={e => setEditRow({ ...editRow, judul: e.target.value })}
                                                            onClick={e => e.stopPropagation()}
                                                        />
                                                    ) : (
                                                        <div className="flex flex-col gap-1">
                                                            <span className="font-bold text-slate-700">{item.judul}</span>
                                                            {item.is_superadmin_only ? (
                                                                <span className="text-[9px] font-black uppercase tracking-tighter bg-red-50 text-red-600 px-2 py-0.5 rounded w-fit border border-red-100 italic">Hanya Superadmin</span>
                                                            ) : null}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex justify-center flex-row gap-1 opacity-100 lg:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                                                        {isEditing ? (
                                                            <>
                                                                <button onClick={() => handleUpdate(item.id)} className="text-ppm-slate p-1.5 hover:bg-green-100 rounded-full bg-white shadow-sm border border-slate-200" title="Simpan"><Check size={14} /></button>
                                                                <button onClick={() => setEditingId(null)} className="text-red-600 p-1.5 hover:bg-red-100 rounded-full bg-white shadow-sm border border-slate-200" title="Batal"><X size={14} /></button>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <button onClick={() => { setEditingId(item.id); setEditRow({ judul: item.judul, konten: item.konten, is_superadmin_only: !!item.is_superadmin_only }); if (!isExpanded) toggleExpand(item.id); }} className="text-blue-600 p-1.5 hover:bg-blue-100 bg-white shadow-sm border border-slate-200 rounded-full transition-colors" title="Edit"><Edit2 size={14} /></button>
                                                                <button onClick={() => handleDelete(item.id)} className="text-red-600 p-1.5 hover:bg-red-100 bg-white shadow-sm border border-slate-200 rounded-full transition-colors" title="Hapus"><Trash2 size={14} /></button>
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>

                                            {(isExpanded || isEditing) && (
                                                <tr className="bg-slate-50/50 border-b border-slate-200">
                                                    <td colSpan={3} className="p-0">
                                                        <div className="p-6 pl-16 animate-in fade-in slide-in-from-top-2 duration-300">
                                                            <div className="prose prose-sm max-w-none prose-slate">
                                                                {isEditing ? (
                                                                    <div className="space-y-2">
                                                                        <label className="text-xs font-bold text-slate-500 block">Detail Konten / Langkah-langkah</label>
                                                                        <textarea
                                                                            rows={8}
                                                                            className="w-full border-2 border-ppm-slate p-3 text-sm outline-none resize-y bg-white"
                                                                            value={editRow.konten}
                                                                            onChange={e => setEditRow({ ...editRow, konten: e.target.value })}
                                                                        />
                                                                        <div className="flex items-center gap-2 bg-white p-3 rounded border border-slate-200 w-fit mt-3">
                                                                            <input
                                                                                id="is_superadmin_only_edit"
                                                                                type="checkbox"
                                                                                className="w-4 h-4 text-ppm-slate focus:ring-ppm-slate border-gray-300 rounded"
                                                                                checked={editRow.is_superadmin_only}
                                                                                onChange={e => setEditRow({ ...editRow, is_superadmin_only: e.target.checked })}
                                                                            />
                                                                            <label htmlFor="is_superadmin_only_edit" className="text-xs font-bold text-slate-700 cursor-pointer">Hanya Superadmin (Rahasia)</label>
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <div className="whitespace-pre-wrap text-slate-600 text-sm leading-relaxed font-medium bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
                                                                        {item.konten}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })}

                                {filteredData.length === 0 && !isAdding && (
                                    <tr>
                                        <td colSpan={3} className="text-center p-12 text-slate-400 font-bold border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                                            {searchTerm ? 'Tidak ada petunjuk teknis yang cocok dengan pencarian.' : 'Belum ada petunjuk teknis.'}
                                        </td>
                                    </tr>
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

export default PetunjukTeknis;
