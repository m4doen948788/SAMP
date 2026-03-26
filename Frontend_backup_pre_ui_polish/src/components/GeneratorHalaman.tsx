import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../services/api';
import { Plus, Trash2, Layout, Loader2, Check, X, Search, Edit2 } from 'lucide-react';
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
                    <span key={`e${i}`} className="px-1.5 text-slate-400 text-xs">...</span>
                ) : (
                    <button key={p} onClick={() => setCurrentPage(p)} className={`px-2.5 py-1 border text-xs font-bold transition-colors ${p === currentPage ? 'bg-ppm-green text-white border-ppm-green' : 'border-slate-300 hover:border-ppm-green'}`}>{p}</button>
                )
            )}
        </div>
    );
};

// ICONS constant removed; using IconPicker instead
const GeneratorHalaman = () => {
    const [pages, setPages] = useState<{ id: number; title: string; slug: string; table_name: string; icon: string; menu_id: number; tipe_akses: string; }[]>([]);
    const [menus, setMenus] = useState<{ id: number; nama_menu: string; tipe: string; parent_id: number | null }[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const [form, setForm] = useState({ title: '', slug: '', table_name: '', icon: 'Layout', parent_id: '', tipe_akses: 'Privat' });
    const [tables, setTables] = useState<{ id: number; nama_tabel: string; label: string }[]>([]);

    // For inline edit
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editForm, setEditForm] = useState({ title: '', slug: '', table_name: '', icon: 'Layout', parent_id: '', tipe_akses: 'Privat' });

    // Pagination & Search
    const [search, setSearch] = useState('');
    const [pageSize, setPageSize] = useState(10);
    const [currentPage, setCurrentPage] = useState(1);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [pagesRes, menusRes, tablesRes] = await Promise.all([
                api.generatedPages.getAll(),
                api.menu.getAll(),
                api.masterDataConfig.getAll()
            ]);
            if (pagesRes.success) setPages(pagesRes.data);
            if (menusRes.success) {
                // Only allow selecting menu1 or menu2 as parents (folders)
                setMenus(menusRes.data.filter((m: any) => m.tipe === 'menu1' || m.tipe === 'menu2'));
            }
            if (tablesRes.success) setTables(tablesRes.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleSubmit = async () => {
        if (!form.title || !form.slug || !form.table_name) return;
        try {
            const res = await api.generatedPages.create(form);
            if (res.success) {
                setForm({ title: '', slug: '', table_name: '', icon: 'Layout', parent_id: '', tipe_akses: 'Privat' });
                setIsAdding(false);
                window.location.reload();
            } else {
                alert(res.message);
            }
        } catch (err) {
            alert('Gagal membuat halaman');
        }
    };

    const handleUpdate = async (id: number) => {
        if (!editForm.title || !editForm.slug || !editForm.table_name) return;
        try {
            const res = await api.generatedPages.update(id, editForm);
            if (res.success) {
                setEditingId(null);
                fetchData();
            } else {
                alert(res.message);
            }
        } catch (err) {
            alert('Gagal memperbarui halaman');
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Hapus halaman ini dan menu terkait?')) return;
        try {
            const res = await api.generatedPages.delete(id);
            if (res.success) fetchData();
        } catch (err) {
            alert('Gagal menghapus halaman');
        }
    };

    const startEdit = (page: any) => {
        setEditingId(page.id);

        setEditForm({
            title: page.title,
            slug: page.slug,
            table_name: page.table_name,
            icon: page.icon || 'Layout',
            parent_id: page.parent_id != null ? String(page.parent_id) : '',
            tipe_akses: page.tipe_akses || 'Privat',
        });
    };

    const filtered = useMemo(() => {
        if (!search.trim()) return pages;
        const q = search.toLowerCase();
        return pages.filter(p => p.title.toLowerCase().includes(q) || p.table_name.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q));
    }, [pages, search]);

    const totalPages = pageSize === 0 ? 1 : Math.ceil(filtered.length / pageSize);
    const displayed = pageSize === 0 ? filtered : filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    useEffect(() => { setCurrentPage(1); }, [search, pageSize]);

    return (
        <div className="bg-white p-6 shadow-sm border border-slate-200">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-xl font-black text-ppm-green uppercase tracking-tight">Generator Halaman</h2>
                    <p className="text-slate-500 text-xs mt-1">Buat halaman master data baru secara instan.</p>
                </div>
                {!isAdding && (
                    <button
                        onClick={() => setIsAdding(true)}
                        className="bg-ppm-green text-white px-4 py-2 text-xs font-bold uppercase tracking-wider flex items-center gap-2 hover:bg-ppm-light-green transition-colors shadow-sm"
                    >
                        <Plus size={14} /> Buat Halaman Baru
                    </button>
                )}
            </div>

            <div className="mb-4 flex justify-end">
                <div className="relative w-full sm:w-72">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="text" placeholder="Cari halaman..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-3 py-2 border border-slate-300 text-sm outline-none focus:border-ppm-green transition-colors" />
                </div>
            </div>

            {isAdding && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
                        <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-slate-50">
                            <h3 className="text-sm font-black text-ppm-green uppercase tracking-wide">Buat Halaman Baru</h3>
                            <button onClick={() => { setIsAdding(false); window.dispatchEvent(new CustomEvent('sidebar:expand')); }} className="text-slate-400 hover:text-red-500 transition-colors p-1"><X size={20} /></button>
                        </div>

                        <div className="p-5 overflow-y-auto flex-1">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase">Judul Menu</label>
                                    <input
                                        type="text"
                                        className="w-full border border-slate-300 p-2 text-sm outline-none focus:border-ppm-green"
                                        placeholder="Contoh: Master Karyawan"
                                        value={form.title}
                                        onChange={e => {
                                            const title = e.target.value;
                                            const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                                            setForm({ ...form, title, slug });
                                        }}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase">Slug (URL)</label>
                                    <input
                                        type="text"
                                        className="w-full border border-slate-300 p-2 text-sm outline-none focus:border-ppm-green"
                                        placeholder="contoh: master-karyawan"
                                        value={form.slug}
                                        onChange={e => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') })}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase">Nama Tabel Database</label>
                                    <select
                                        className="w-full border border-slate-300 p-2 text-sm outline-none focus:border-ppm-green bg-white"
                                        value={form.table_name}
                                        onChange={e => setForm({ ...form, table_name: e.target.value })}
                                    >
                                        <option value="">-- Pilih Tabel Database --</option>
                                        {tables.map(t => (
                                            <option key={t.id} value={t.nama_tabel}>{t.nama_tabel} ({t.label})</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase">Icon (Lucide)</label>
                                    <IconPicker value={form.icon} onChange={(val) => setForm({ ...form, icon: val })} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase">Pilih Menu Induk (Parent)</label>
                                    <select
                                        className="w-full border border-slate-300 p-2 text-sm outline-none focus:border-ppm-green bg-white"
                                        value={form.parent_id}
                                        onChange={e => setForm({ ...form, parent_id: e.target.value })}
                                    >
                                        <option value="">-- Paling Luar (Root) / Tanpa Menu Induk --</option>
                                        {menus.filter(m => m.tipe === 'menu1').map(m1 => (
                                            <optgroup key={m1.id} label={m1.nama_menu}>
                                                <option value={m1.id}>{m1.nama_menu}</option>
                                                {menus.filter(m2 => m2.parent_id === m1.id && m2.tipe === 'menu2').map(m2 => (
                                                    <option key={m2.id} value={m2.id}>↳ {m2.nama_menu}</option>
                                                ))}
                                            </optgroup>
                                        ))}
                                    </select>
                                    <p className="text-[10px] text-slate-500 mt-1">*Jika dikosongkan, ia akan menjadi menu paling depan.</p>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase">Hak Akses</label>
                                    <select
                                        className="w-full border border-slate-300 p-2 text-sm outline-none focus:border-ppm-green bg-white"
                                        value={form.tipe_akses}
                                        onChange={e => setForm({ ...form, tipe_akses: e.target.value })}
                                    >
                                        <option value="Privat">Privat (Hanya setelah Login)</option>
                                        <option value="Publik">Publik (Bisa tanpa Login)</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-2">
                            <button onClick={() => { setIsAdding(false); window.dispatchEvent(new CustomEvent('sidebar:expand')); }} className="px-4 py-2 text-xs font-bold uppercase text-slate-500 hover:bg-slate-200 transition-colors rounded">Batal</button>
                            <button onClick={handleSubmit} className="bg-ppm-green text-white px-5 py-2 text-xs font-bold uppercase flex items-center gap-2 hover:bg-ppm-light-green transition-colors rounded shadow-sm">
                                <Check size={14} /> Simpan & Daftarkan
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {loading ? (
                <div className="flex justify-center py-20"><Loader2 className="animate-spin text-ppm-green" size={40} /></div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr>
                                <th className="table-header w-16 text-center">NO</th>
                                <th className="table-header">Halaman / Icon</th>
                                <th className="table-header">Slug / Route</th>
                                <th className="table-header">Tabel DB</th>
                                <th className="table-header w-24 text-center">Akses</th>
                                <th className="table-header w-32 text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {displayed.map((page, index) => {
                                if (editingId === page.id) {
                                    return (
                                        <tr key={`edit-${page.id}`} className="bg-blue-50 border-b border-slate-100">
                                            <td className="p-3 font-mono text-xs text-slate-400 text-center">EDIT</td>
                                            <td className="p-3">
                                                <div className="flex flex-col gap-2">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-32">
                                                            <IconPicker value={editForm.icon} onChange={val => setEditForm({ ...editForm, icon: val })} />
                                                        </div>
                                                        <input
                                                            type="text"
                                                            className="flex-1 w-32 border-2 border-ppm-green p-1.5 text-sm outline-none"
                                                            value={editForm.title}
                                                            onChange={e => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                                                        />
                                                    </div>
                                                    <select
                                                        className="w-full border-2 border-ppm-green p-1.5 text-xs outline-none bg-white"
                                                        value={editForm.parent_id}
                                                        onChange={e => setEditForm(prev => ({ ...prev, parent_id: e.target.value }))}
                                                    >
                                                        <option value="">-- Root Menu --</option>
                                                        {menus.filter(m => m.tipe === 'menu1').map(m1 => (
                                                            <optgroup key={m1.id} label={m1.nama_menu}>
                                                                <option value={m1.id}>{m1.nama_menu}</option>
                                                                {menus.filter(m2 => m2.parent_id === m1.id && m2.tipe === 'menu2').map(m2 => (
                                                                    <option key={m2.id} value={m2.id}>↳ {m2.nama_menu}</option>
                                                                ))}
                                                            </optgroup>
                                                        ))}
                                                    </select>
                                                </div>
                                            </td>
                                            <td className="p-3">
                                                <input
                                                    type="text"
                                                    className="w-full border-2 border-ppm-green p-1.5 text-sm outline-none"
                                                    value={editForm.slug}
                                                    onChange={e => setEditForm(prev => ({ ...prev, slug: e.target.value.toLowerCase().replace(/ /g, '-') }))}
                                                />
                                            </td>
                                            <td className="p-3">
                                                <input
                                                    type="text"
                                                    className="w-full border border-slate-300 p-1.5 text-sm outline-none bg-slate-100 cursor-not-allowed text-slate-400"
                                                    value={editForm.table_name}
                                                    disabled
                                                    title="Tabel database tidak dapat diubah (ubah pengaturan di level database)"
                                                />
                                            </td>
                                            <td className="p-3">
                                                <select
                                                    className="w-full border-2 border-ppm-green p-1.5 text-xs outline-none bg-white text-center"
                                                    value={editForm.tipe_akses}
                                                    onChange={e => setEditForm({ ...editForm, tipe_akses: e.target.value })}
                                                >
                                                    <option value="Privat">Privat</option>
                                                    <option value="Publik">Publik</option>
                                                </select>
                                            </td>
                                            <td className="p-3">
                                                <div className="flex justify-center gap-2">
                                                    <button onClick={() => handleUpdate(page.id)} className="text-ppm-green p-1 hover:bg-slate-100 rounded-full" title="Simpan"><Check size={18} /></button>
                                                    <button onClick={() => { setEditingId(null); window.dispatchEvent(new CustomEvent('sidebar:expand')); }} className="text-red-600 p-1 hover:bg-red-100 rounded-full" title="Batal"><X size={18} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                }

                                return (
                                    <tr key={page.id} className="hover:bg-slate-50 transition-colors border-b border-slate-100 group/row">
                                        <td className="p-3 border-b border-slate-100 font-mono text-xs text-slate-500 text-center">
                                            {(currentPage - 1) * (pageSize || filtered.length) + index + 1}
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-ppm-green/10 flex items-center justify-center text-ppm-green" title={page.icon}>
                                                    <Layout size={16} /> {/* In a real app we would map real icon names, this is just visual placeholder based on current logic */}
                                                </div>
                                                <span className="font-bold text-slate-700">{page.title}</span>
                                            </div>
                                        </td>
                                        <td className="p-4 font-mono text-xs text-slate-400">/{page.slug}</td>
                                        <td className="p-4">
                                            <span className="bg-blue-50 text-blue-600 px-2 py-1 rounded text-[10px] font-black uppercase">{page.table_name}</span>
                                        </td>
                                        <td className="p-4 text-center">
                                            <span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${page.tipe_akses === 'Publik' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                                                {page.tipe_akses || 'Privat'}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex justify-center flex-row gap-1">
                                                <button onClick={() => startEdit(page)} className="text-blue-500 hover:text-blue-700 transition-colors p-2 hover:bg-blue-50 rounded-full">
                                                    <Edit2 size={16} />
                                                </button>
                                                <button onClick={() => handleDelete(page.id)} className="text-red-400 hover:text-red-600 transition-colors p-2 hover:bg-red-50 rounded-full">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                            {displayed.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="p-20 text-center text-slate-300 italic font-bold">
                                        {search ? 'Tidak ada hasil pencarian' : 'Belum ada halaman yang di-generate.'}
                                    </td>
                                </tr>
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
                        <span>{displayed.length} dari {filtered.length} data</span>
                    </div>
                    {renderPageButtons(currentPage, totalPages, setCurrentPage)}
                </div>
            )}
        </div>
    );
};

export default GeneratorHalaman;
