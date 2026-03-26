import React, { useState, useEffect, useRef, useMemo } from 'react';
import { api } from '../services/api';
import { Plus, Edit2, Trash2, X, Check, Loader2, ChevronRight, ChevronDown, GripVertical, Search } from 'lucide-react';
import IconPicker from './IconPicker';

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
                    <span key={`e${i}`} className="px-1.5 text-slate-400 text-[10px]">...</span>
                ) : (
                    <button key={p} onClick={() => setCurrentPage(p)} className={`px-2.5 py-1 border text-[10px] font-bold transition-colors ${p === currentPage ? 'bg-ppm-slate text-white border-ppm-slate' : 'border-slate-300 hover:border-ppm-slate'}`}>{p}</button>
                )
            )}
        </div>
    );
};

interface MenuItem {
    id: number;
    nama_menu: string;
    tipe: 'menu1' | 'menu2' | 'menu3';
    aplikasi_external_id: number | null;
    action_page: string | null;
    icon: string | null;
    parent_id: number | null;
    urutan: number;
    is_active: number;
    nama_aplikasi?: string;
    aplikasi_url?: string;
}

interface AplikasiExternal {
    id: number;
    nama_aplikasi: string;
    url: string;
}

const emptyForm = {
    nama_menu: '',
    tipe: 'menu1' as 'menu1' | 'menu2' | 'menu3',
    aplikasi_external_id: null as number | null,
    action_page: '',
    icon: '',
    parent_id: null as number | null,
    urutan: 0,
    is_active: 1,
};

const KelolaMenu = () => {
    const [data, setData] = useState<MenuItem[]>([]);
    const [aplikasiList, setAplikasiList] = useState<AplikasiExternal[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isAdding, setIsAdding] = useState(false);
    const [addingParentId, setAddingParentId] = useState<number | null>(null);
    const [newForm, setNewForm] = useState({ ...emptyForm });
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editForm, setEditForm] = useState({ ...emptyForm });
    const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
    const dragItem = useRef<{ id: number; parentId: number | null } | null>(null);
    const dragOverItem = useRef<{ id: number; parentId: number | null } | null>(null);
    const [dragOverId, setDragOverId] = useState<number | null>(null);
    const [search, setSearch] = useState('');
    const [pageSize, setPageSize] = useState(10);
    const [currentPage, setCurrentPage] = useState(1);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [menuRes, appRes] = await Promise.all([
                api.menu.getAll(),
                api.aplikasiExternal.getAll()
            ]);
            if (menuRes.success) {
                setData(menuRes.data);
            } else {
                setError(menuRes.message);
            }
            if (appRes.success) setAplikasiList(appRes.data);
        } catch (err) {
            setError('Gagal mengambil data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const toggleExpand = (id: number) => {
        setExpandedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const getChildren = (parentId: number | null): MenuItem[] => {
        return data.filter(m => m.parent_id === parentId).sort((a, b) => a.urutan - b.urutan);
    };

    // Drag and drop handlers
    const handleDragStart = (e: React.DragEvent, item: MenuItem) => {
        e.dataTransfer.setData('text/plain', String(item.id));
        e.dataTransfer.effectAllowed = 'move';
        dragItem.current = { id: item.id, parentId: item.parent_id };
    };

    const handleDragOver = (e: React.DragEvent, item: MenuItem) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (dragOverItem.current?.id !== item.id) {
            dragOverItem.current = { id: item.id, parentId: item.parent_id };
            setDragOverId(item.id);
        }
    };

    const handleDragLeave = (e: React.DragEvent) => {
        // Only clear if actually leaving the row (not entering a child element)
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            setDragOverId(null);
        }
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOverId(null);

        const srcId = dragItem.current;
        const tgtId = dragOverItem.current;

        if (!srcId || !tgtId) return;
        if (srcId.id === tgtId.id) return;
        // Only allow reorder within same parent
        if (srcId.parentId !== tgtId.parentId) return;

        const parentId = srcId.parentId;
        const siblings = data.filter(m => m.parent_id === parentId).sort((a, b) => a.urutan - b.urutan);
        const dragIdx = siblings.findIndex(s => s.id === srcId.id);
        const overIdx = siblings.findIndex(s => s.id === tgtId.id);

        if (dragIdx === -1 || overIdx === -1) return;

        // Reorder array
        const reordered = [...siblings];
        const [moved] = reordered.splice(dragIdx, 1);
        reordered.splice(overIdx, 0, moved);

        // Build new urutan values
        const newOrder = reordered.map((m, idx) => ({ id: m.id, urutan: idx + 1 }));

        // Optimistic update with new object references
        setData(prev => prev.map(m => {
            const updated = newOrder.find(o => o.id === m.id);
            return updated ? { ...m, urutan: updated.urutan } : m;
        }));

        // Persist to backend then refresh
        try {
            const res = await api.menu.reorder(newOrder);
            if (!res.success) {
                console.error('Reorder failed:', res.message);
            }
            fetchData(); // Always refresh from server
        } catch (err) {
            console.error('Reorder error:', err);
            fetchData();
        }

        dragItem.current = null;
        dragOverItem.current = null;
    };

    const handleDragEnd = () => {
        dragItem.current = null;
        dragOverItem.current = null;
        setDragOverId(null);
    };

    const getAplikasiName = (id: number | null) => {
        if (!id) return null;
        const app = aplikasiList.find(a => a.id === id);
        return app ? app.nama_aplikasi : null;
    };

    const handleAdd = async () => {
        if (!newForm.nama_menu.trim()) return;
        try {
            const res = await api.menu.create({
                nama_menu: newForm.nama_menu,
                tipe: newForm.tipe,
                aplikasi_external_id: newForm.aplikasi_external_id,
                action_page: newForm.action_page || undefined,
                icon: newForm.icon || undefined,
                parent_id: newForm.parent_id,
                urutan: newForm.urutan,
                is_active: newForm.is_active,
            });
            if (res.success) {
                setNewForm({ ...emptyForm });
                setIsAdding(false);
                setAddingParentId(null);
                fetchData();
            }
        } catch (err) {
            alert('Gagal menambah data');
        }
    };

    const handleUpdate = async (id: number) => {
        if (!editForm.nama_menu.trim()) return;
        const originalItem = data.find(m => m.id === id);
        try {
            const res = await api.menu.update(id, {
                nama_menu: editForm.nama_menu,
                tipe: editForm.tipe,
                aplikasi_external_id: editForm.aplikasi_external_id,
                action_page: editForm.action_page || undefined,
                icon: editForm.icon || undefined,
                parent_id: editForm.parent_id,
                urutan: editForm.urutan,
                is_active: editForm.is_active,
            });
            if (res.success) {
                // Auto-downgrade children if parent level is downgraded
                if (originalItem && originalItem.tipe === 'menu1' && (editForm.tipe === 'menu2' || editForm.tipe === 'menu3')) {
                    const children = getChildren(id);
                    await Promise.all(children.map(child =>
                        api.menu.update(child.id, {
                            ...child,
                            tipe: 'menu3'
                        })
                    ));
                }
                setEditingId(null);
                fetchData();
            }
        } catch (err) {
            alert('Gagal mengubah data');
        }
    };

    const handleDelete = async (id: number) => {
        const children = getChildren(id);
        if (children.length > 0) {
            if (!confirm('Menu ini memiliki sub-menu. Hapus semua?')) return;
        } else {
            if (!confirm('Hapus data menu ini?')) return;
        }
        try {
            // Delete children first
            for (const child of children) {
                const grandChildren = getChildren(child.id);
                for (const gc of grandChildren) {
                    await api.menu.delete(gc.id);
                }
                await api.menu.delete(child.id);
            }
            const res = await api.menu.delete(id);
            if (res.success) fetchData();
        } catch (err) {
            alert('Gagal menghapus data');
        }
    };

    const startEdit = (item: MenuItem) => {
        setEditingId(item.id);
        setEditForm({
            nama_menu: item.nama_menu,
            tipe: item.tipe,
            aplikasi_external_id: item.aplikasi_external_id,
            action_page: item.action_page || '',
            icon: item.icon || '',
            parent_id: item.parent_id,
            urutan: item.urutan,
            is_active: item.is_active,
        });
    };

    const startAdd = (parentId: number | null, tipe: 'menu1' | 'menu2' | 'menu3') => {
        setIsAdding(true);
        setAddingParentId(parentId);
        setNewForm({ ...emptyForm, tipe, parent_id: parentId });
        if (parentId) {
            setExpandedIds(prev => new Set(prev).add(parentId));
        }
    };

    const tipeLabel = (t: string) => {
        switch (t) {
            case 'menu1': return 'Menu 1';
            case 'menu2': return 'Menu 2';
            case 'menu3': return 'Menu 3';
            default: return t;
        }
    };

    const tipeBadgeColor = (t: string) => {
        switch (t) {
            case 'menu1': return 'bg-purple-100 text-purple-700';
            case 'menu2': return 'bg-blue-100 text-blue-700';
            case 'menu3': return 'bg-teal-100 text-teal-700';
            default: return 'bg-slate-100 text-slate-700';
        }
    };

    // Render the add/edit form row
    const renderFormRow = (depth: number, isEditRow = false) => {
        const form = isEditRow ? editForm : newForm;
        const setForm = isEditRow ? setEditForm : setNewForm;
        const indent = depth * 24;

        return (
            <tr className="bg-blue-50">
                <td className="p-2 border-b border-slate-100"></td>
                <td className="p-2 border-b border-slate-100 text-slate-400 text-center text-[10px]">{isEditRow ? '✏️' : 'NEW'}</td>
                <td className="p-2 border-b border-slate-100" style={{ paddingLeft: `${8 + indent}px` }}>
                    <input
                        autoFocus type="text"
                        className="input-modern"
                        placeholder="Nama menu..."
                        value={form.nama_menu}
                        onChange={(e) => setForm({ ...form, nama_menu: e.target.value })}
                        onKeyPress={(e) => e.key === 'Enter' && (isEditRow ? handleUpdate(editingId!) : handleAdd())}
                    />
                </td>
                <td className="p-2 border-b border-slate-100">
                    <select className="w-full border border-slate-300 p-1.5 text-[10px] outline-none focus:border-ppm-slate" value={form.tipe} onChange={(e) => {
                        const newTipe = e.target.value as 'menu1' | 'menu2' | 'menu3';
                        setForm({ ...form, tipe: newTipe, parent_id: newTipe === 'menu1' ? null : form.parent_id });
                    }}>
                        <option value="menu1">Menu 1</option>
                        <option value="menu2">Menu 2</option>
                        <option value="menu3">Menu 3</option>
                    </select>
                    {form.tipe !== 'menu1' && (() => {
                        const parentOptions = form.tipe === 'menu2'
                            ? data.filter(m => m.tipe === 'menu1')
                            : data.filter(m => m.tipe === 'menu2');
                        return (
                            <select
                                className="w-full border border-slate-300 p-1.5 text-[10px] outline-none focus:border-ppm-slate mt-1"
                                value={form.parent_id || ''}
                                onChange={(e) => setForm({ ...form, parent_id: e.target.value ? parseInt(e.target.value) : null })}
                            >
                                <option value="">-- Pilih Parent --</option>
                                {parentOptions.map(m => (
                                    <option key={m.id} value={m.id}>{m.nama_menu}</option>
                                ))}
                            </select>
                        );
                    })()}
                </td>
                <td className="p-2 border-b border-slate-100">
                    <select
                        className="w-full border border-slate-300 p-1.5 text-[10px] outline-none focus:border-ppm-slate"
                        value={form.aplikasi_external_id || ''}
                        onChange={(e) => setForm({ ...form, aplikasi_external_id: e.target.value ? parseInt(e.target.value) : null })}
                    >
                        <option value="">-- Tidak ada --</option>
                        {aplikasiList.map(app => (
                            <option key={app.id} value={app.id}>{app.nama_aplikasi}</option>
                        ))}
                    </select>
                </td>
                <td className="p-2 border-b border-slate-100">
                    <input type="text" className="w-full border border-slate-300 p-1.5 text-[10px] outline-none focus:border-ppm-slate" placeholder="Action..." value={form.action_page} onChange={(e) => setForm({ ...form, action_page: e.target.value })} />
                </td>
                <td className="p-2 border-b border-slate-100">
                    <IconPicker value={form.icon || ''} onChange={(val) => setForm({ ...form, icon: val })} />
                </td>
                <td className="p-2 border-b border-slate-100">
                    <input type="number" className="w-16 border border-slate-300 p-1.5 text-[10px] outline-none focus:border-ppm-slate text-center" value={form.urutan} onChange={(e) => setForm({ ...form, urutan: parseInt(e.target.value) || 0 })} />
                </td>
                <td className="p-2 border-b border-slate-100 text-center">
                    <select className="border border-slate-300 p-1 text-[10px] outline-none focus:border-ppm-slate" value={form.is_active} onChange={(e) => setForm({ ...form, is_active: parseInt(e.target.value) })}>
                        <option value={1}>Aktif</option>
                        <option value={0}>Non</option>
                    </select>
                </td>
                <td className="p-2 border-b border-slate-100">
                    <div className="flex justify-center gap-1">
                        <button onClick={() => isEditRow ? handleUpdate(editingId!) : handleAdd()} className="text-slate-400 hover:text-emerald-600 p-1.5 hover:bg-emerald-50 rounded-full"><Check size={16} /></button>
                        <button onClick={() => {
                            if (isEditRow) {
                                setEditingId(null);
                            } else {
                                setIsAdding(false);
                                setAddingParentId(null);
                                setNewForm({ ...emptyForm });
                            }
                        }} className="text-slate-400 hover:text-rose-600 p-1.5 hover:bg-rose-50 rounded-full"><X size={16} /></button>
                    </div>
                </td>
            </tr>
        );
    };

    // Render a menu item row with its children recursively
    const renderMenuRow = (item: MenuItem, depth: number = 0, noTopLevel?: number): React.ReactNode[] => {
        const children = getChildren(item.id);
        const hasChildren = children.length > 0;
        const isExpanded = expandedIds.has(item.id);
        const indent = depth * 24;
        const appName = getAplikasiName(item.aplikasi_external_id);
        const rows: React.ReactNode[] = [];

        // Edit row replacement
        if (editingId === item.id) {
            rows.push(<React.Fragment key={`edit-${item.id}`}>{renderFormRow(depth, true)}</React.Fragment>);
        } else {
            const isDragOver = dragOverId === item.id;
            rows.push(
                <tr
                    key={item.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, item)}
                    onDragOver={(e) => handleDragOver(e, item)}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onDragEnd={handleDragEnd}
                    className={`hover:bg-slate-50/80 transition-colors border-b border-slate-50 group/row ${isDragOver ? 'bg-indigo-50 border-t-2 border-indigo-400' : ''}`}
                >
                    <td className="p-3 border-b border-slate-50 text-center cursor-grab active:cursor-grabbing">
                        <GripVertical size={16} className="text-slate-300 hover:text-slate-500 mx-auto" />
                    </td>
                    <td className="p-4 border-b border-slate-50 font-mono text-[10px] text-slate-400 text-center font-medium">
                        {depth === 0 ? noTopLevel : ''}
                    </td>
                    <td className="p-4 border-b border-slate-50" style={{ paddingLeft: `${16 + indent}px` }}>
                        <div className="flex items-center gap-2">
                            {hasChildren ? (
                                <button onClick={() => toggleExpand(item.id)} className="text-slate-400 hover:text-indigo-600 p-1 -ml-1 shrink-0 bg-slate-50 rounded-md hover:bg-indigo-50 transition-colors">
                                    {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                </button>
                            ) : (
                                <span className="w-6 shrink-0" />
                            )}
                            <span className="font-semibold tracking-tight leading-snug text-slate-700 text-[10px] capitalize">
                                {item.nama_menu.toLowerCase()}
                            </span>
                            {appName && (
                                <span className="text-[11px] text-slate-400 ml-2 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100/50">
                                    &rarr; <span className="font-semibold text-indigo-500">{appName}</span>
                                </span>
                            )}
                        </div>
                    </td>
                    <td className="p-4 border-b border-slate-50 text-center">
                        <span className={`inline-block px-2.5 py-1 text-[8px] font-bold uppercase tracking-widest rounded-md ${tipeBadgeColor(item.tipe)}`}>
                            {tipeLabel(item.tipe)}
                        </span>
                    </td>
                    <td className="p-4 border-b border-slate-50 text-[10px] font-medium text-slate-500">{appName || <span className="text-slate-300">-</span>}</td>
                    <td className="p-4 border-b border-slate-50 font-mono text-[10px] text-slate-400 tracking-tight">{item.action_page || <span className="text-slate-300">-</span>}</td>
                    <td className="p-4 border-b border-slate-50 font-mono text-[10px] text-slate-400 tracking-tight">{item.icon || <span className="text-slate-300">-</span>}</td>
                    <td className="p-4 border-b border-slate-50 text-center font-mono text-[10px] text-slate-500 font-medium">{item.urutan}</td>
                    <td className="p-4 border-b border-slate-50 text-center">
                        <span className={`inline-block px-2.5 py-1 rounded-md text-[8px] font-bold uppercase tracking-wider ${item.is_active ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                            {item.is_active ? 'Aktif' : 'Non'}
                        </span>
                    </td>
                    <td className="p-4 border-b border-slate-50">
                        <div className="flex justify-center gap-1.5 opacity-100 transition-opacity">
                            {item.tipe !== 'menu3' && (
                                <button
                                    onClick={() => startAdd(item.id, item.tipe === 'menu1' ? 'menu2' : 'menu3')}
                                    className="text-slate-400 hover:text-emerald-600 p-2 hover:bg-emerald-50/80 rounded-xl transition-colors"
                                    title="Tambah sub-menu"
                                >
                                    <Plus size={16} />
                                </button>
                            )}
                            <button onClick={() => startEdit(item)} className="text-slate-400 hover:text-indigo-600 p-2 hover:bg-indigo-50/80 rounded-xl transition-colors" title="Edit Menu"><Edit2 size={16} /></button>
                            <button onClick={() => handleDelete(item.id)} className="text-slate-400 hover:text-rose-600 p-2 hover:bg-rose-50/80 rounded-xl transition-colors" title="Hapus Menu"><Trash2 size={16} /></button>
                        </div>
                    </td>
                </tr>
            );
        }

        // Render children if expanded
        if (isExpanded && hasChildren) {
            children.forEach(child => {
                rows.push(...renderMenuRow(child, depth + 1));
            });
        }

        // Render add form if adding under this parent
        if (isAdding && addingParentId === item.id) {
            rows.push(<React.Fragment key={`add-under-${item.id}`}>{renderFormRow(depth + 1)}</React.Fragment>);
        }

        return rows;
    };

    // Top-level menu1 items
    const allTopLevel = data.filter(m => m.parent_id === null).sort((a, b) => a.urutan - b.urutan);

    // Recursive search: check if item or any descendant matches
    const matchesSearch = (item: MenuItem, q: string): boolean => {
        if (item.nama_menu.toLowerCase().includes(q)) return true;
        const children = data.filter(m => m.parent_id === item.id);
        return children.some(child => matchesSearch(child, q));
    };

    const filteredTopLevel = useMemo(() => {
        if (!search.trim()) return allTopLevel;
        const q = search.toLowerCase();
        return allTopLevel.filter(item => matchesSearch(item, q));
    }, [data, search, allTopLevel]);

    const totalPages = pageSize === 0 ? 1 : Math.ceil(filteredTopLevel.length / pageSize);
    const displayedTopLevel = pageSize === 0 ? filteredTopLevel : filteredTopLevel.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    // Reset page when search/pageSize changes
    useEffect(() => { setCurrentPage(1); }, [search, pageSize]);

    return (
        <div className="card-modern p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-[22px] font-extrabold text-slate-800 tracking-tight">Kelola Menu</h2>
                    <p className="text-slate-500 text-[11px] mt-1">Atur struktur, tipe, dan hierarki navigasi utama aplikasi.</p>
                </div>
                <button
                    onClick={() => startAdd(null, 'menu1')}
                    className="btn-primary"
                >
                    <Plus size={16} /> Tambah Menu 1
                </button>
            </div>

            <div className="mb-6 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-3">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tampilkan</span>
                    <select
                        value={pageSize}
                        onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                        className="input-modern py-1 px-3 text-[10px] w-24 h-9 font-bold cursor-pointer"
                    >
                        {PAGE_SIZES.map(s => (
                            <option key={s} value={s}>{s === 0 ? 'Semua' : s}</option>
                        ))}
                    </select>
                    <div className="h-4 w-px bg-slate-200 mx-1"></div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">
                        <b>{displayedTopLevel.length}</b> dari <b>{filteredTopLevel.length}</b> data top-menu
                    </span>
                </div>
                <div className="relative w-full sm:w-80">
                    <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="text" placeholder="Cari menu, aksi, atau aplikasi..." value={search} onChange={e => setSearch(e.target.value)} className="input-modern pl-10 text-[11px]" />
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="animate-spin text-ppm-slate" size={32} />
                </div>
            ) : error ? (
                <div className="text-red-600 text-center py-12 font-bold">{error}</div>
            ) : (
                <>
                    <div className="overflow-x-auto rounded-xl border border-slate-100 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.02)]">
                        <table className="w-full text-xs">
                            <thead>
                                <tr>
                                    <th className="table-header w-10 rounded-tl-xl"></th>
                                    <th className="table-header w-12 text-center">#</th>
                                    <th className="table-header">Nama Menu</th>
                                    <th className="table-header w-24 text-center">Tipe</th>
                                    <th className="table-header">Aplikasi</th>
                                    <th className="table-header">Action</th>
                                    <th className="table-header">Icon</th>
                                    <th className="table-header w-16 text-center">Urut</th>
                                    <th className="table-header w-24 text-center">Status</th>
                                    <th className="table-header w-32 text-center rounded-tr-xl">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white">
                                {/* Top-level add form */}
                                {isAdding && addingParentId === null && renderFormRow(0)}
                                {displayedTopLevel.map((item, index) => renderMenuRow(item, 0, (currentPage - 1) * (pageSize || filteredTopLevel.length) + index + 1))}
                                {displayedTopLevel.length === 0 && !isAdding && (
                                    <tr>
                                        <td colSpan={10} className="p-12 text-center text-slate-400 font-bold italic">
                                            {search ? 'Tidak ada hasil pencarian' : 'Belum ada data menu'}
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

export default KelolaMenu;

