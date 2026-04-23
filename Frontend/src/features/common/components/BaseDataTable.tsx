import React, { useState, useMemo, useEffect } from 'react';
import { Plus, Search, Loader2 } from 'lucide-react';

const PAGE_SIZES = [10, 20, 50, 100, 0];
const MAX_VISIBLE_PAGES = 5;

interface Column<T> {
    header: string;
    key: keyof T | string;
    render?: (item: T, index: number) => React.ReactNode;
    className?: string;
    width?: string;
}

interface BaseDataTableProps<T> {
    title: string;
    subtitle?: string;
    data: T[];
    columns: Column<T>[];
    loading?: boolean;
    error?: string | null;
    searchPlaceholder?: string;
    addButtonLabel?: string;
    onAddClick?: () => void;

    // Search & Filter
    searchKey?: (item: T) => string;

    // Slots for inline forms
    renderAddRow?: () => React.ReactNode;
    renderEditRow?: (item: T) => React.ReactNode;
    editingId?: number | string | null;

    // Actions
    renderActions?: (item: T) => React.ReactNode;
    renderHeaderButtons?: React.ReactNode;
 
    // Persistence
    persistenceKey?: string;
}

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
                    <span key={`e${i}`} className="px-1.5 text-slate-400 text-xs text-center min-w-[24px]">...</span>
                ) : (
                    <button
                        key={p}
                        onClick={() => setCurrentPage(p)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 ${p === currentPage ? 'bg-ppm-slate text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}`}
                    >
                        {p}
                    </button>
                )
            )}
        </div>
    );
};

export function BaseDataTable<T extends { id: number | string }>({
    title,
    subtitle,
    data,
    columns,
    loading = false,
    error = null,
    searchPlaceholder = "Cari data...",
    addButtonLabel,
    onAddClick,
    searchKey,
    renderAddRow,
    renderEditRow,
    editingId,
    renderActions,
    renderHeaderButtons,
    persistenceKey
}: BaseDataTableProps<T>) {
    const [search, setSearch] = useState(() => {
        if (!persistenceKey) return '';
        return sessionStorage.getItem(`${persistenceKey}_search`) || '';
    });
    const [pageSize, setPageSize] = useState(() => {
        if (!persistenceKey) return 10;
        return Number(sessionStorage.getItem(`${persistenceKey}_pageSize`)) || 10;
    });
    const [currentPage, setCurrentPage] = useState(() => {
        if (!persistenceKey) return 1;
        return Number(sessionStorage.getItem(`${persistenceKey}_currentPage`)) || 1;
    });

    const filtered = useMemo(() => {
        if (!search.trim()) return data;
        const q = search.toLowerCase();
        return data.filter(item => {
            if (searchKey) return searchKey(item).toLowerCase().includes(q);
            // Default: search all string values
            return Object.values(item).some(val =>
                String(val).toLowerCase().includes(q)
            );
        });
    }, [data, search, searchKey]);

    const totalPages = pageSize === 0 ? 1 : Math.ceil(filtered.length / pageSize);
    const displayed = pageSize === 0 ? filtered : filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    useEffect(() => { 
        if (!persistenceKey) {
            setCurrentPage(1); 
            return;
        }
        // If search changes and we are not in the first mount, go back to p1
        // But wait, if we load from session, we don't want to reset
        const savedSearch = sessionStorage.getItem(`${persistenceKey}_search`) || '';
        if (search !== savedSearch) {
             setCurrentPage(1);
             sessionStorage.setItem(`${persistenceKey}_search`, search);
        }
    }, [search, persistenceKey]);
 
    useEffect(() => {
        if (persistenceKey) {
            sessionStorage.setItem(`${persistenceKey}_currentPage`, String(currentPage));
            sessionStorage.setItem(`${persistenceKey}_pageSize`, String(pageSize));
        }
    }, [currentPage, pageSize, persistenceKey]);

    // Scroll and Highlight logic
    const [highlightedId, setHighlightedId] = useState<number | string | null>(null);
    
    useEffect(() => {
        if (loading || !persistenceKey) return;

        const lastEditedId = sessionStorage.getItem(`${persistenceKey}_lastEditedId`);
        if (!lastEditedId) return;

        // Give it a small delay for DOM to settle
        const timer = setTimeout(() => {
            const element = document.getElementById(`${persistenceKey}-row-${lastEditedId}`);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                setHighlightedId(lastEditedId);
                
                // Clear highlight and storage after animation
                setTimeout(() => {
                    setHighlightedId(null);
                    sessionStorage.removeItem(`${persistenceKey}_lastEditedId`);
                }, 2000);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [loading, persistenceKey, displayed.length]);

    return (
        <div className="card-modern p-6">
            {/* Header Area */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-[22px] font-extrabold text-slate-800 tracking-tight">{title}</h2>
                    {subtitle && <p className="text-slate-500 text-sm mt-1">{subtitle}</p>}
                </div>
                {renderHeaderButtons ? renderHeaderButtons : (
                    onAddClick && (
                        <button onClick={onAddClick} className="btn-primary">
                            <Plus size={16} /> {addButtonLabel || 'Tambah'}
                        </button>
                    )
                )}
            </div>

            {/* Controls Area */}
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
                    <div className="h-4 w-px bg-slate-200 mx-1 border-r border-slate-200"></div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">
                        <b>{displayed.length}</b> dari <b>{filtered.length}</b> data
                    </span>
                </div>
                <div className="relative w-full sm:w-80">
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder={searchPlaceholder}
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="input-modern pl-10"
                    />
                </div>
            </div>

            {/* Table Area */}
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
                                    <th className="table-header w-16 text-center rounded-tl-xl whitespace-nowrap">#</th>
                                    {columns.map((col, idx) => (
                                        <th
                                            key={String(col.key)}
                                            className={`table-header ${col.className || ''} ${idx === columns.length - 1 && !renderActions ? 'rounded-tr-xl' : ''}`}
                                            style={col.width ? { width: col.width } : {}}
                                        >
                                            {col.header}
                                        </th>
                                    ))}
                                    {renderActions && (
                                        <th className="table-header w-32 text-center rounded-tr-xl whitespace-nowrap">Aksi</th>
                                    )}
                                </tr>
                            </thead>
                            <tbody className="bg-white">
                                {/* Inline Add Row Slot */}
                                {renderAddRow && renderAddRow()}

                                {displayed.map((item, index) => {
                                    const isEditing = editingId === item.id;

                                    if (isEditing && renderEditRow) {
                                        return <React.Fragment key={item.id}>{renderEditRow(item)}</React.Fragment>;
                                    }

                                    return (
                                        <tr 
                                            key={item.id} 
                                            id={persistenceKey ? `${persistenceKey}-row-${item.id}` : undefined}
                                            className={`hover:bg-slate-50/80 transition-all duration-500 border-b border-slate-50 group/row ${highlightedId == String(item.id) ? 'bg-yellow-100 ring-2 ring-yellow-400 z-10' : ''}`}
                                        >
                                            <td className="p-4 border-b border-slate-50 font-mono text-xs text-slate-500 text-center whitespace-nowrap">
                                                {pageSize === 0 ? index + 1 : (currentPage - 1) * pageSize + index + 1}
                                            </td>
                                            {columns.map((col) => (
                                                <td key={String(col.key)} className={`p-4 border-b border-slate-50 ${col.className || ''}`}>
                                                    {col.render ? col.render(item, index) : String(item[col.key as keyof T] || '-')}
                                                </td>
                                            ))}
                                            {renderActions && (
                                                <td className="p-4 border-b border-slate-50">
                                                    <div className="flex justify-center gap-2">
                                                        {renderActions(item)}
                                                    </div>
                                                </td>
                                            )}
                                        </tr>
                                    );
                                })}
                                {displayed.length === 0 && (
                                    <tr>
                                        <td colSpan={columns.length + (renderActions ? 2 : 1)} className="p-12 text-center text-slate-400 font-bold italic">
                                            {search ? 'Tidak ada hasil pencarian' : 'Belum ada data'}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    {/* Pagination Area */}
                    <div className="flex justify-end mt-6">
                        {renderPageButtons(currentPage, totalPages, setCurrentPage)}
                    </div>
                </>
            )}
        </div>
    );
}
