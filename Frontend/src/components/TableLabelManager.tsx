import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../services/api';
import { Save, RefreshCw, AlertCircle, CheckCircle2, Table as TableIcon, Search, ChevronRight, ChevronDown } from 'lucide-react';

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

interface TableLabel {
    id: number;
    table_name: string;
    column_key: string;
    label: string;
}

interface AvailableTable {
    name: string;
    label: string;
    columns: { key: string, default: string }[];
}

export default function TableLabelManager() {
    const [availableTables, setAvailableTables] = useState<AvailableTable[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<string | null>(null);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Key format: "table_name:column_key"
    const [editingLabels, setEditingLabels] = useState<Record<string, string>>({});
    const [originalLabels, setOriginalLabels] = useState<Record<string, string>>({});

    const [expandedTables, setExpandedTables] = useState<Record<string, boolean>>({});
    const [search, setSearch] = useState('');
    const [pageSize, setPageSize] = useState(10);
    const [currentPage, setCurrentPage] = useState(1);

    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchData = async () => {
        try {
            const [tablesRes, labelsRes] = await Promise.all([
                api.tableLabels.getAvailableTables(),
                api.tableLabels.getAll()
            ]);

            if (tablesRes.success) {
                setAvailableTables(tablesRes.data);
            }

            if (labelsRes.success) {
                const initialEditState: Record<string, string> = {};
                labelsRes.data.forEach((l: TableLabel) => {
                    initialEditState[`${l.table_name}:${l.column_key}`] = l.label;
                });
                setEditingLabels(prev => ({ ...initialEditState, ...prev }));
                setOriginalLabels(initialEditState);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (tableName: string, columnKey: string, defaultLabel: string, forceValue?: string) => {
        const key = `${tableName}:${columnKey}`;
        const newLabel = forceValue !== undefined ? forceValue : (editingLabels[key] || defaultLabel);

        if (!newLabel) return;

        setSaving(key);
        setMessage(null);

        try {
            const res = await api.tableLabels.upsert({ table_name: tableName, column_key: columnKey, label: newLabel });
            if (res.success) {
                setMessage({ type: 'success', text: `Label untuk kolom ${columnKey} berhasil diperbarui.` });
                setTimeout(() => setMessage(null), 3000);
            } else {
                setMessage({ type: 'error', text: res.message || 'Gagal menyimpan label.' });
            }
        } catch (err) {
            setMessage({ type: 'error', text: 'Terjadi kesalahan koneksi.' });
        } finally {
            setSaving(null);
        }
    };

    const handleReset = async (tableName: string, columnKey: string, defaultLabel: string) => {
        if (!confirm('Kembalikan label ini ke nilai default?')) return;

        const key = `${tableName}:${columnKey}`;
        setEditingLabels(prev => ({ ...prev, [key]: '' }));
        await handleSave(tableName, columnKey, defaultLabel, defaultLabel);
    };

    const toggleTable = (tableName: string) => {
        setExpandedTables(prev => {
            const isCurrentlyExpanded = !!prev[tableName];
            if (isCurrentlyExpanded) {
                // Removed auto-expand
            }
            return {
                ...prev,
                [tableName]: !isCurrentlyExpanded
            };
        });
    };

    const filteredTables = useMemo(() => {
        if (!search.trim()) return availableTables;
        const q = search.toLowerCase();

        return availableTables.map(table => {
            // Check if table level matches
            const tableMatch = table.label.toLowerCase().includes(q) || table.name.toLowerCase().includes(q);

            // Check if any column matches
            const matchingColumns = table.columns.filter(col => {
                const key = `${table.name}:${col.key}`;
                const currentLabel = editingLabels[key] || '';
                return (
                    col.key.toLowerCase().includes(q) ||
                    col.default.toLowerCase().includes(q) ||
                    currentLabel.toLowerCase().includes(q)
                );
            });

            if (tableMatch) return table;
            if (matchingColumns.length > 0) return { ...table, columns: matchingColumns };
            return null;
        }).filter(Boolean) as AvailableTable[];
    }, [availableTables, search, editingLabels]);

    // Auto-expand tables if search is active
    useEffect(() => {
        if (search.trim()) {
            const newExpandedState: Record<string, boolean> = {};
            filteredTables.forEach(t => { newExpandedState[t.name] = true; });
            setExpandedTables(newExpandedState);
        } else {
            setExpandedTables({});
        }
    }, [search]); // Intentionally removed filteredTables from dependency

    const totalPages = pageSize === 0 ? 1 : Math.ceil(filteredTables.length / pageSize);
    const displayedTables = pageSize === 0 ? filteredTables : filteredTables.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    useEffect(() => { setCurrentPage(1); }, [search, pageSize]);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <RefreshCw className="animate-spin text-ppm-slate" size={32} />
            </div>
        );
    }

    return (
        <div className="card-modern p-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-[22px] font-extrabold text-slate-800 tracking-tight">Pengaturan Label Tabel</h2>
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
                        <b>{displayedTables.length}</b> dari <b>{filteredTables.length}</b> data
                    </span>
                </div>
                <div className="relative w-full sm:w-80">
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Cari tabel atau kolom..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="input-modern pl-10"
                    />
                </div>
            </div>

            {message && (
                <div className={`p-4 rounded-xl flex items-center gap-3 border shadow-sm mb-6 ${message.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                    {message.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                    <p className="text-sm font-medium">{message.text}</p>
                </div>
            )}

            <div className="bg-white overflow-hidden">
                <div className="overflow-x-auto rounded-xl border border-slate-100 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.02)]">
                    <table className="w-full text-sm border-collapse">
                        <thead>
                            <tr>
                                <th className="table-header w-12 text-center rounded-tl-xl">#</th>
                                <th className="table-header w-10 text-center"></th>
                                <th className="table-header">Tabel / Kolom</th>
                                <th className="table-header">Key Kolom <span className="font-normal lowercase text-slate-300 ml-1">(Default)</span></th>
                                <th className="table-header">Label Kustom</th>
                                <th className="table-header w-32 text-center rounded-tr-xl">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white">
                            {displayedTables.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="text-center p-12 text-slate-400 font-bold bg-slate-50/50">
                                        {search ? `Tidak ada data yang cocok dengan "${search}".` : 'Belum ada tabel yang tersedia.'}
                                    </td>
                                </tr>
                            )}

                            {displayedTables.map((table, index) => {
                                const isExpanded = !!expandedTables[table.name];

                                return (
                                    <React.Fragment key={table.name}>
                                        {/* TABLE HEADER ROW */}
                                        <tr
                                            onClick={() => toggleTable(table.name)}
                                            className={`cursor-pointer transition-colors border-b border-slate-200 ${isExpanded ? 'bg-slate-50' : 'hover:bg-slate-50'}`}
                                        >
                                            <td className="p-4 border-b border-slate-50 font-mono text-xs text-slate-500 text-center">
                                                {(currentPage - 1) * (pageSize || filteredTables.length) + index + 1}
                                            </td>
                                            <td className="px-4 py-4 text-center">
                                                <button className="text-ppm-slate transition-transform duration-300">
                                                    {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                                                </button>
                                            </td>
                                            <td className="px-4 py-4" colSpan={4}>
                                                <div className="flex items-center gap-4">
                                                    <h2 className="font-semibold text-slate-800 tracking-tight text-sm">
                                                        {table.label}
                                                    </h2>
                                                    <span className="text-[10px] font-mono text-slate-400 bg-white px-2 py-1 rounded-md border border-slate-200 shadow-sm">
                                                        {table.name}
                                                    </span>
                                                    <span className="text-[10px] uppercase font-bold text-slate-400 ml-auto mr-4">
                                                        {table.columns.length} Kolom
                                                    </span>
                                                </div>
                                            </td>
                                        </tr>

                                        {/* TABLE COLUMNS ROWS */}
                                        {isExpanded && table.columns.length === 0 && (
                                            <tr className="bg-slate-50/50 border-b border-slate-100">
                                                <td></td>
                                                <td></td>
                                                <td colSpan={4} className="px-4 py-4 text-center text-xs text-slate-400 italic font-medium">
                                                    Belum ada kolom yang dapat dilabeli
                                                </td>
                                            </tr>
                                        )}

                                        {isExpanded && table.columns.map((column) => {
                                            const key = `${table.name}:${column.key}`;
                                            const isSaving = saving === key;
                                            const currentInputValue = editingLabels[key] || '';

                                            const originalValue = originalLabels[key];
                                            const hasChanges = currentInputValue !== (originalValue || '') && currentInputValue !== '';

                                            return (
                                                <tr key={column.key} className={`border-b border-slate-100 transition-colors ${hasChanges ? 'bg-yellow-50/20' : ''}`}>
                                                    <td></td>
                                                    <td></td>
                                                    <td className="px-4 py-3 pl-8 relative">
                                                        {/* Visual indicator for nesting */}
                                                        <div className="absolute left-4 top-0 bottom-0 w-px bg-slate-200 block"></div>
                                                        <div className="absolute left-4 top-1/2 w-3 h-px bg-slate-200 block"></div>
                                                        <span className="font-semibold text-slate-800 tracking-tight text-sm block pl-2">{column.default}</span>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="font-mono text-xs text-slate-700 bg-slate-100 px-2 py-1 rounded inline-block border border-slate-200">
                                                            {column.key}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <input
                                                            type="text"
                                                            value={currentInputValue}
                                                            placeholder={column.default}
                                                            onChange={(e) => setEditingLabels({ ...editingLabels, [key]: e.target.value })}
                                                            onKeyPress={(e) => e.key === 'Enter' && handleSave(table.name, column.key, column.default)}
                                                            className={`w-full bg-white border rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-ppm-slate/20 focus:border-ppm-slate transition-all ${hasChanges ? 'border-yellow-400 bg-yellow-50/10' : 'border-slate-200'
                                                                }`}
                                                        />
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex justify-center flex-col gap-2">
                                                            <button
                                                                onClick={() => handleSave(table.name, column.key, column.default)}
                                                                disabled={isSaving}
                                                                className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold transition-all disabled:opacity-50 ${hasChanges
                                                                    ? 'bg-ppm-slate text-white hover:bg-ppm-slate-dark shadow-sm'
                                                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
                                                                    }`}
                                                            >
                                                                {isSaving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                                                                SIMPAN
                                                            </button>

                                                            {originalValue && originalValue !== column.default && (
                                                                <button
                                                                    onClick={() => handleReset(table.name, column.key, column.default)}
                                                                    className="text-[10px] text-slate-400 hover:text-red-500 underline text-center"
                                                                >
                                                                    Reset Default
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </React.Fragment>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {!loading && (
                <div className="flex justify-end mt-6">
                    {renderPageButtons(currentPage, totalPages, setCurrentPage)}
                </div>
            )}
        </div>
    );
}

