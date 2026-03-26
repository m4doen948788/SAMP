import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../services/api';
import { Plus, Edit2, Trash2, X, Check, Loader2, ChevronRight, Search } from 'lucide-react';

interface Referensi {
    id: number;
    judul: string;
    konten: string;
}

const PetunjukTeknis = () => {
    const [data, setData] = useState<Referensi[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const [newRow, setNewRow] = useState({ judul: '', konten: '' });
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editRow, setEditRow] = useState({ judul: '', konten: '' });
    const [expandedIds, setExpandedIds] = useState<number[]>([]);

    // Search and Pagination states
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 10;

    const toggleExpand = (id: number) => {
        setExpandedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await api.referensi.getAll();
            if (res.success) setData(res.data);
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
                setNewRow({ judul: '', konten: '' });
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
        return data.filter(item =>
            item.judul.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.konten.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [data, searchTerm]);

    const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);

    const currentData = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredData.slice(start, start + ITEMS_PER_PAGE);
    }, [filteredData, currentPage]);

    // Reset page when search term changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    // Generate page numbers for pagination with ellipsis
    const getPageNumbers = () => {
        const pages = [];
        const maxVisiblePages = 5;

        if (totalPages <= maxVisiblePages) {
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
            let endPage = startPage + maxVisiblePages - 1;

            if (endPage > totalPages) {
                endPage = totalPages;
                startPage = Math.max(1, endPage - maxVisiblePages + 1);
            }

            if (startPage > 1) {
                pages.push(1);
                if (startPage > 2) pages.push('...');
            }

            for (let i = startPage; i <= endPage; i++) {
                pages.push(i);
            }

            if (endPage < totalPages) {
                if (endPage < totalPages - 1) pages.push('...');
                pages.push(totalPages);
            }
        }
        return pages;
    };

    return (
        <div className="bg-white p-6 shadow-sm border border-slate-200">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-xl font-black text-ppm-green uppercase tracking-tight">PETUNJUK TEKNIS</h2>
                    <p className="text-slate-500 text-xs mt-1">Panduan, langkah-langkah, dan dokumentasi operasional sistem.</p>
                </div>
                {!isAdding && (
                    <div className="flex gap-3">
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Cari petunjuk teknis..."
                                className="pl-9 pr-4 py-2 border border-slate-300 text-sm focus:border-ppm-green focus:ring-1 focus:ring-ppm-green outline-none w-64 bg-slate-50 focus:bg-white transition-colors"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                            <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                        </div>
                        <button
                            onClick={() => setIsAdding(true)}
                            className="bg-ppm-green text-white px-4 py-2 text-xs font-bold uppercase tracking-wider flex items-center gap-2 hover:bg-ppm-light-green transition-colors"
                        >
                            <Plus size={14} /> Tambah Petunjuk
                        </button>
                    </div>
                )}
            </div>

            {isAdding && (
                <div className="mb-6 p-4 bg-blue-50 border-2 border-ppm-green rounded-lg">
                    <div className="space-y-4">
                        <div>
                            <label className="text-xs font-bold text-slate-500 mb-1 block">Judul</label>
                            <input
                                autoFocus
                                type="text"
                                className="w-full border border-slate-300 p-2 text-sm outline-none focus:border-ppm-green bg-white"
                                placeholder="Judul petunjuk / langkah..."
                                value={newRow.judul}
                                onChange={e => setNewRow({ ...newRow, judul: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 mb-1 block">Konten / Langkah-Langkah</label>
                            <textarea
                                rows={6}
                                className="w-full border border-slate-300 p-2 text-sm outline-none focus:border-ppm-green bg-white resize-y"
                                placeholder="Isi detail langkah-langkah..."
                                value={newRow.konten}
                                onChange={e => setNewRow({ ...newRow, konten: e.target.value })}
                            />
                        </div>
                        <div className="flex gap-2 justify-end">
                            <button onClick={() => { setIsAdding(false); window.dispatchEvent(new CustomEvent('sidebar:expand')); }} className="text-slate-500 hover:text-slate-700 px-3 py-1 text-sm font-bold">Batal</button>
                            <button onClick={handleAdd} className="bg-ppm-green text-white px-4 py-1.5 text-xs font-bold uppercase flex items-center gap-2 hover:bg-ppm-light-green transition-colors rounded">
                                <Check size={14} /> Simpan
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {loading ? (
                <div className="flex justify-center py-12"><Loader2 className="animate-spin text-ppm-green" size={32} /></div>
            ) : (
                <div className="overflow-x-auto">
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
                                            className={`group/row transition-colors border-b border-slate-100 ${isExpanded ? 'bg-ppm-green/5' : 'hover:bg-slate-50 cursor-pointer'}`}
                                            onClick={() => { if (!isEditing) toggleExpand(item.id); }}
                                        >
                                            <td className="p-4 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <ChevronRight size={16} className={`text-slate-400 transition-transform duration-300 ${isExpanded ? 'rotate-90 text-ppm-green' : ''}`} />
                                                    <span className="font-bold text-slate-500">{(currentPage - 1) * ITEMS_PER_PAGE + index + 1}</span>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                {isEditing ? (
                                                    <input
                                                        type="text"
                                                        className="w-full border-2 border-ppm-green p-1.5 text-sm font-bold outline-none bg-white"
                                                        value={editRow.judul}
                                                        onChange={e => setEditRow({ ...editRow, judul: e.target.value })}
                                                        onClick={e => e.stopPropagation()}
                                                    />
                                                ) : (
                                                    <span className="font-bold text-slate-700">{item.judul}</span>
                                                )}
                                            </td>
                                            <td className="p-4">
                                                <div className="flex justify-center flex-row gap-1 opacity-100 lg:opacity-0 group-hover/row:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                                                    {isEditing ? (
                                                        <>
                                                            <button onClick={() => handleUpdate(item.id)} className="text-ppm-green p-1.5 hover:bg-green-100 rounded-full bg-white shadow-sm border border-slate-200" title="Simpan"><Check size={14} /></button>
                                                            <button onClick={() => { setEditingId(null); window.dispatchEvent(new CustomEvent('sidebar:expand')); }} className="text-red-600 p-1.5 hover:bg-red-100 rounded-full bg-white shadow-sm border border-slate-200" title="Batal"><X size={14} /></button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <button onClick={() => { setEditingId(item.id); setEditRow({ judul: item.judul, konten: item.konten }); if (!isExpanded) toggleExpand(item.id); }} className="text-blue-600 p-1.5 hover:bg-blue-100 bg-white shadow-sm border border-slate-200 rounded-full transition-colors" title="Edit"><Edit2 size={14} /></button>
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
                                                                        className="w-full border-2 border-ppm-green p-3 text-sm outline-none resize-y bg-white"
                                                                        value={editRow.konten}
                                                                        onChange={e => setEditRow({ ...editRow, konten: e.target.value })}
                                                                    />
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

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                        <div className="flex justify-between items-center mt-6">
                            <div className="text-xs text-slate-500 font-medium">
                                Menampilkan <span className="font-bold text-slate-700">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> hingga <span className="font-bold text-slate-700">{Math.min(currentPage * ITEMS_PER_PAGE, filteredData.length)}</span> dari <span className="font-bold text-slate-700">{filteredData.length}</span> entri
                            </div>

                            <div className="flex gap-1">
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                    disabled={currentPage === 1}
                                    className={`px-3 py-1.5 text-xs font-bold transition-colors ${currentPage === 1 ? 'text-slate-300 cursor-not-allowed bg-slate-50' : 'text-slate-500 hover:bg-slate-100 bg-white border border-slate-200'} rounded`}
                                >
                                    Prev
                                </button>

                                {getPageNumbers().map((pageNum, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => typeof pageNum === 'number' ? setCurrentPage(pageNum) : {}}
                                        disabled={pageNum === '...'}
                                        className={`px-3 py-1.5 text-xs font-bold transition-colors rounded ${pageNum === currentPage
                                            ? 'bg-ppm-green text-white shadow-sm'
                                            : pageNum === '...'
                                                ? 'text-slate-400 cursor-default bg-transparent'
                                                : 'text-slate-500 hover:bg-slate-100 bg-white border border-slate-200'
                                            }`}
                                    >
                                        {pageNum}
                                    </button>
                                ))}

                                <button
                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                    disabled={currentPage === totalPages}
                                    className={`px-3 py-1.5 text-xs font-bold transition-colors shadow-sm ${currentPage === totalPages ? 'text-slate-300 cursor-not-allowed bg-slate-50' : 'text-slate-500 hover:bg-slate-100 bg-white border border-slate-200'} rounded`}
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default PetunjukTeknis;
