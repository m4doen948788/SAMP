import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../services/api';
import { Plus, Edit2, Trash2, X, Check, Loader2, ChevronRight, ChevronDown, Search, Layers, Columns, ToggleLeft, ToggleRight, Pin, PinOff } from 'lucide-react';
import { useLabels } from '../contexts/LabelContext';
import { useAuth } from '../contexts/AuthContext';
import { SearchableSelect } from './common/SearchableSelect';

interface Instansi {
    id: number;
    instansi: string;
    singkatan: string;
}

interface BidangItem {
    id: number;
    nama_bidang: string;
    singkatan: string | null;
    instansi_id: number | null;
    nama_instansi: string | null;
    tipe_bidang_id: number;
    nama_tipe_bidang?: string;
}

interface SubBidangItem {
    id: number;
    nama_sub_bidang: string;
    singkatan: string | null;
    bidang_instansi_id: number | null;
    nama_bidang: string | null;
    instansi_id: number | null;
    nama_instansi: string | null;
    tipe_sub_bidang_id: number;
    nama_tipe_sub_bidang?: string;
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
                    <button key={p} onClick={() => setCurrentPage(p)} className={`px-2.5 py-1 border text-xs font-bold transition-colors ${p === currentPage ? 'bg-ppm-slate text-white border-ppm-slate' : 'border-slate-300 hover:border-ppm-slate'}`}>{p}</button>
                )
            )}
        </div>
    );
};

const emptyBidangForm = { nama_bidang: '', singkatan: '', instansi_id: null as number | null, tipe_bidang_id: 1 };
const emptySubBidangForm = { nama_sub_bidang: '', singkatan: '', bidang_instansi_id: null as number | null, tipe_sub_bidang_id: 1 };

const MasterBidangInstansi = () => {
    const { getLabel } = useLabels();
    const { user } = useAuth();
    const isSuperAdmin = user?.tipe_user_id === 1;
    const userInstansiId = user?.instansi_id ?? null;

    // Data states
    const [bidangData, setBidangData] = useState<BidangItem[]>([]);
    const [subBidangData, setSubBidangData] = useState<SubBidangItem[]>([]);
    const [instansiList, setInstansiList] = useState<Instansi[]>([]);
    const [tipeBidangOptions, setTipeBidangOptions] = useState<{ id: number, nama_tipe: string }[]>([]);
    const [tipeSubBidangOptions, setTipeSubBidangOptions] = useState<{ id: number, nama_tipe: string }[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Filter & View States
    const [selectedInstansiFilter, setSelectedInstansiFilter] = useState<number | null>(isSuperAdmin ? null : userInstansiId);
    const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
    const [pinnedIds, setPinnedIds] = useState<Set<number>>(new Set());
    const [search, setSearch] = useState('');
    const [pageSize, setPageSize] = useState(10);
    const [currentPage, setCurrentPage] = useState(1);

    // Form States
    const [isAddingBidang, setIsAddingBidang] = useState(false);
    const [newBidangForm, setNewBidangForm] = useState({ ...emptyBidangForm });

    const [isAddingSub, setIsAddingSub] = useState(false);
    const [addingSubParentId, setAddingSubParentId] = useState<number | null>(null);
    const [newSubForm, setNewSubForm] = useState({ ...emptySubBidangForm });

    const [editingBidangId, setEditingBidangId] = useState<number | null>(null);
    const [editBidangForm, setEditBidangForm] = useState({ ...emptyBidangForm });

    const [editingSubId, setEditingSubId] = useState<number | null>(null);
    const [editSubForm, setEditSubForm] = useState({ ...emptySubBidangForm });

    const fetchData = async () => {
        setLoading(true);
        try {
            const [bidangRes, subBidangRes, instansiRes, tipeBRes, tipeSRes] = await Promise.all([
                api.bidangInstansi.getAll(),
                api.subBidangInstansi.getAll(),
                api.instansiDaerah.getAll(),
                api.masterDataConfig.getDataByTable('master_tipe_bidang'),
                api.masterDataConfig.getDataByTable('master_tipe_sub_bidang')
            ]);
            if (bidangRes.success) setBidangData(bidangRes.data);
            else setError(bidangRes.message);
            if (subBidangRes.success) setSubBidangData(subBidangRes.data);
            if (instansiRes.success) setInstansiList(instansiRes.data);
            if (tipeBRes.success) setTipeBidangOptions(tipeBRes.data);
            if (tipeSRes.success) setTipeSubBidangOptions(tipeSRes.data);
        } catch { setError('Gagal mengambil data'); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchData(); }, []);

    const toggleExpand = (id: number) => {
        setExpandedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
                // Also unpin if collapsing manually
                setPinnedIds(p => {
                    const nextP = new Set(p);
                    nextP.delete(id);
                    return nextP;
                });
            } else {
                // If expanding, collapse all non-pinned ones
                const pinned = new Set(pinnedIds);
                [...next].forEach(expId => {
                    if (!pinned.has(expId)) {
                        next.delete(expId);
                    }
                });
                next.add(id);
            }
            return next;
        });
    };

    const togglePin = (e: React.MouseEvent, id: number) => {
        e.stopPropagation();
        setPinnedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
                // Also collapse if unpinned
                setExpandedIds(exp => {
                    const nextExp = new Set(exp);
                    nextExp.delete(id);
                    return nextExp;
                });
            } else {
                next.add(id);
                // If pinning, also ensure it's expanded
                setExpandedIds(exp => new Set(exp).add(id));
            }
            return next;
        });
    };

    const getSubUnitBreakdown = (items: SubBidangItem[]) => {
        const counts: Record<string, number> = {};
        items.forEach(item => {
            const rawName = item.nama_tipe_sub_bidang || 'Sub Bidang';
            const typeName = rawName.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
            counts[typeName] = (counts[typeName] || 0) + 1;
        });
        return Object.entries(counts)
            .map(([name, count]) => `${count} ${name}`)
            .join(', ');
    };

    const getFullSubUnitBreakdown = (items: SubBidangItem[]) => {
        const counts: Record<string, number> = {};
        items.forEach(item => {
            const rawName = item.nama_tipe_sub_bidang || 'Sub Bidang';
            const typeName = rawName.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
            counts[typeName] = (counts[typeName] || 0) + 1;
        });
        return counts;
    };

    // Derived filtering
    const { filteredBidang, filteredSubBidang } = useMemo(() => {
        let bData = bidangData;
        let sData = subBidangData;

        // Instansi Filter
        const instansiIdForFilter = selectedInstansiFilter || (!isSuperAdmin ? userInstansiId : null);
        if (instansiIdForFilter) {
            bData = bData.filter(d => d.instansi_id === instansiIdForFilter);
            sData = sData.filter(d => d.instansi_id === instansiIdForFilter);
        }

        return { filteredBidang: bData, filteredSubBidang: sData };
    }, [bidangData, subBidangData, isSuperAdmin, userInstansiId, selectedInstansiFilter]);

    // Search Logic (matches Bidang OR its SubBidangs)
    const matchesSearch = (bidang: BidangItem, q: string): boolean => {
        if (bidang.nama_bidang.toLowerCase().includes(q)) return true;
        if (bidang.singkatan && bidang.singkatan.toLowerCase().includes(q)) return true;

        const children = filteredSubBidang.filter(s => s.bidang_instansi_id === bidang.id);
        return children.some(child =>
            child.nama_sub_bidang.toLowerCase().includes(q) ||
            (child.singkatan && child.singkatan.toLowerCase().includes(q))
        );
    };

    const finalBidangList = useMemo(() => {
        if (!search.trim()) return filteredBidang;
        const q = search.toLowerCase();
        return filteredBidang.filter(item => matchesSearch(item, q));
    }, [filteredBidang, filteredSubBidang, search]);

    const totalPages = pageSize === 0 ? 1 : Math.ceil(finalBidangList.length / pageSize);
    const displayedBidangList = pageSize === 0 ? finalBidangList : finalBidangList.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    // Reset page when search/pageSize changes
    useEffect(() => { setCurrentPage(1); }, [search, pageSize]);

    // Add Bidang
    const handleAddBidang = async () => {
        if (!newBidangForm.nama_bidang.trim()) return;
        try {
            const payload = { ...newBidangForm, instansi_id: newBidangForm.instansi_id || (isSuperAdmin ? null : userInstansiId) };
            if (selectedInstansiFilter && !payload.instansi_id) {
                payload.instansi_id = selectedInstansiFilter;
            }
            const res = await api.bidangInstansi.create(payload);
            if (res.success) { setNewBidangForm({ ...emptyBidangForm }); setIsAddingBidang(false); fetchData(); }
        } catch { alert('Gagal menambah data bidang'); }
    };

    const handleUpdateBidang = async (id: number) => {
        if (!editBidangForm.nama_bidang.trim()) return;
        try {
            const payload = { ...editBidangForm };
            if (!isSuperAdmin && userInstansiId) payload.instansi_id = userInstansiId;
            const res = await api.bidangInstansi.update(id, payload);
            if (res.success) { setEditingBidangId(null); fetchData(); }
        } catch { alert('Gagal mengubah data bidang'); }
    };

    const handleDeleteBidang = async (id: number) => {
        if (!confirm('Hapus Bidang ini? Semua Sub Bidang terkait mungkin akan terhapus.')) return;
        try {
            const res = await api.bidangInstansi.delete(id);
            if (res.success) fetchData();
        } catch { alert('Gagal menghapus data bidang'); }
    };

    // Add Sub Bidang
    const startAddSub = (bidangId: number) => {
        setIsAddingSub(true);
        setAddingSubParentId(bidangId);
        setNewSubForm({ ...emptySubBidangForm, bidang_instansi_id: bidangId });
        setExpandedIds(prev => new Set(prev).add(bidangId));
    };

    const handleAddSub = async () => {
        if (!newSubForm.nama_sub_bidang.trim() || !newSubForm.bidang_instansi_id) return;
        try {
            const res = await api.subBidangInstansi.create(newSubForm);
            if (res.success) { setNewSubForm({ ...emptySubBidangForm }); setIsAddingSub(false); setAddingSubParentId(null); fetchData(); }
        } catch { alert('Gagal menambah data sub bidang'); }
    };

    const handleUpdateSub = async (id: number) => {
        if (!editSubForm.nama_sub_bidang.trim() || !editSubForm.bidang_instansi_id) return;
        try {
            const res = await api.subBidangInstansi.update(id, editSubForm);
            if (res.success) { setEditingSubId(null); fetchData(); }
        } catch { alert('Gagal mengubah data sub bidang'); }
    };

    const handleDeleteSub = async (id: number) => {
        if (!confirm('Hapus Sub Bidang ini?')) return;
        try {
            const res = await api.subBidangInstansi.delete(id);
            if (res.success) fetchData();
        } catch { alert('Gagal menghapus data sub bidang'); }
    };

    const renderInstansiSelect = (value: number | null, onChange: (val: number | null) => void) => (
        <SearchableSelect
            value={value}
            onChange={onChange}
            options={instansiList}
            label="Instansi"
            keyField="id"
            displayField="instansi"
            className="text-xs min-w-[200px]"
        />
    );

    const renderBidangRow = (bidang: BidangItem, index: number) => {
        const children = filteredSubBidang.filter(s => s.bidang_instansi_id === bidang.id);
        const hasChildren = children.length > 0;
        const isExpanded = expandedIds.has(bidang.id);
        const rows: React.ReactNode[] = [];

        // Bidang Edit Mode
        if (editingBidangId === bidang.id) {
            rows.push(
                <tr key={`edit-b-${bidang.id}`} className="bg-indigo-50/30">
                    <td className="p-4 border-b border-slate-50 font-mono text-xs text-slate-500 text-center">{bidang.id}</td>
                    <td className="p-2 border-b border-slate-100 flex items-center pl-8 pt-4 pb-4">
                        <select className="bg-indigo-100 text-indigo-700 text-[10px] font-bold px-2 py-1 rounded mr-2 shrink-0 border-none outline-none cursor-pointer uppercase appearance-none" value={editBidangForm.tipe_bidang_id} onChange={e => setEditBidangForm({ ...editBidangForm, tipe_bidang_id: Number(e.target.value) })}>
                            {tipeBidangOptions.map(opt => (
                                <option key={opt.id} value={opt.id}>{opt.nama_tipe.toUpperCase()}</option>
                            ))}
                        </select>
                        <input autoFocus type="text" className="input-modern flex-1" value={editBidangForm.nama_bidang} onChange={e => setEditBidangForm({ ...editBidangForm, nama_bidang: e.target.value })} onKeyPress={e => e.key === 'Enter' && handleUpdateBidang(bidang.id)} />
                    </td>
                    <td className="p-2 border-b border-slate-100">
                        <input type="text" className="input-modern" placeholder="Singkatan..." value={editBidangForm.singkatan || ''} onChange={e => setEditBidangForm({ ...editBidangForm, singkatan: e.target.value })} onKeyPress={e => e.key === 'Enter' && handleUpdateBidang(bidang.id)} />
                    </td>
                    {isSuperAdmin && !selectedInstansiFilter && (
                        <td className="p-2 border-b border-slate-100">
                            {renderInstansiSelect(editBidangForm.instansi_id, val => setEditBidangForm({ ...editBidangForm, instansi_id: val }))}
                        </td>
                    )}
                    <td className="p-2 border-b border-slate-100">
                        <div className="flex justify-center gap-1.5 opacity-100 transition-opacity">
                            <button onClick={() => handleUpdateBidang(bidang.id)} className="text-emerald-600 p-1.5 hover:bg-emerald-100 rounded-full bg-white shadow-sm border border-slate-200" title="Simpan"><Check size={14} /></button>
                            <button onClick={() => setEditingBidangId(null)} className="text-rose-600 p-1.5 hover:bg-rose-100 rounded-full bg-white shadow-sm border border-slate-200" title="Batal"><X size={14} /></button>
                        </div>
                    </td>
                </tr>
            );
        } else {
            rows.push(
                <tr key={`b-${bidang.id}`} className="hover:bg-slate-50/80 transition-colors border-b border-slate-50 group/row">
                    <td className="p-4 border-b border-slate-50 font-mono text-xs text-slate-400 text-center font-medium">
                        {(currentPage - 1) * (pageSize || finalBidangList.length) + index + 1}
                    </td>
                    <td className="p-4 border-b border-slate-50 pl-4 w-1/3">
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1 shrink-0">
                                {hasChildren ? (
                                    <button onClick={() => toggleExpand(bidang.id)} className="text-slate-400 hover:text-indigo-600 p-1 mt-0.5 -ml-1 shrink-0 bg-slate-50 rounded-md hover:bg-indigo-50 transition-colors self-start">
                                        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                    </button>
                                ) : (
                                    <span className="w-6 shrink-0 inline-block h-6" />
                                )}
                                {isExpanded && (
                                    <button
                                        onClick={(e) => togglePin(e, bidang.id)}
                                        className={`p-1 mt-0.5 rounded-md transition-all duration-200 ${pinnedIds.has(bidang.id) ? 'text-emerald-500 bg-emerald-50' : 'text-slate-300 hover:text-slate-400 bg-slate-50'}`}
                                        title={pinnedIds.has(bidang.id) ? "Lepas Pin (Auto-Collapse)" : "Pin (Tetap Expand)"}
                                    >
                                        <Pin size={12} className={pinnedIds.has(bidang.id) ? 'fill-current' : ''} />
                                    </button>
                                )}
                            </div>
                            <div className="flex flex-col mt-0.5">
                                <div className="flex items-center gap-2">
                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${bidang.nama_tipe_bidang?.toLowerCase() === 'bagian' ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'}`}>
                                        {(bidang.nama_tipe_bidang || 'BIDANG').toUpperCase()}
                                    </span>
                                    <span className="font-semibold tracking-tight leading-snug text-slate-800 text-sm">
                                        {bidang.nama_bidang}
                                    </span>
                                </div>
                                {hasChildren && (
                                    <span className="text-[10px] text-slate-400 font-medium ml-12 italic">
                                        {getSubUnitBreakdown(children)}
                                    </span>
                                )}
                            </div>
                        </div>
                    </td>
                    <td className="p-4 border-b border-slate-50 font-mono text-xs text-slate-500 tracking-tight">{bidang.singkatan || <span className="text-slate-300">-</span>}</td>
                    {isSuperAdmin && !selectedInstansiFilter && (
                        <td className="p-4 border-b border-slate-50 text-xs font-medium text-slate-600">{bidang.nama_instansi}</td>
                    )}
                    <td className="p-4 border-b border-slate-50">
                        <div className="flex justify-center gap-1.5 opacity-100 transition-opacity">
                            <button
                                onClick={() => startAddSub(bidang.id)}
                                className="text-slate-400 hover:text-emerald-600 p-2 hover:bg-emerald-50/80 rounded-xl transition-colors"
                                title="Tambah Sub Bidang"
                            >
                                <Plus size={16} />
                            </button>
                            <button onClick={() => { setEditingBidangId(bidang.id); setEditBidangForm({ nama_bidang: bidang.nama_bidang, singkatan: bidang.singkatan || '', instansi_id: bidang.instansi_id, tipe_bidang_id: bidang.tipe_bidang_id }); }} className="text-slate-400 hover:text-indigo-600 p-2 hover:bg-indigo-50/80 rounded-xl transition-colors" title="Edit Bidang"><Edit2 size={16} /></button>
                            <button onClick={() => handleDeleteBidang(bidang.id)} className="text-slate-400 hover:text-rose-600 p-2 hover:bg-rose-50/80 rounded-xl transition-colors" title="Hapus Bidang"><Trash2 size={16} /></button>
                        </div>
                    </td>
                </tr >
            );
        }

        // Sub Bidang Rows
        if (isExpanded && hasChildren) {
            children.forEach(sub => {
                if (editingSubId === sub.id) {
                    rows.push(
                        <tr key={`edit-s-${sub.id}`} className="bg-indigo-50/10">
                            <td className="p-0 border-b border-slate-50"></td>
                            <td className="p-2 border-b border-slate-100 flex items-center pl-10 pt-4 pb-4 w-full h-full relative" colSpan={isSuperAdmin && !selectedInstansiFilter ? 3 : 2}>
                                <div className="absolute left-6 top-0 bottom-0 w-px bg-slate-200"></div>
                                <select className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-1 rounded mr-2 shrink-0 border border-slate-200 outline-none cursor-pointer uppercase appearance-none" value={editSubForm.tipe_sub_bidang_id} onChange={e => setEditSubForm({ ...editSubForm, tipe_sub_bidang_id: Number(e.target.value) })}>
                                    {tipeSubBidangOptions.map(opt => (
                                        <option key={opt.id} value={opt.id}>{opt.nama_tipe.toUpperCase()}</option>
                                    ))}
                                </select>
                                <input autoFocus type="text" className="input-modern flex-[2]" value={editSubForm.nama_sub_bidang} onChange={e => setEditSubForm({ ...editSubForm, nama_sub_bidang: e.target.value })} onKeyPress={e => e.key === 'Enter' && handleUpdateSub(sub.id)} />
                                <div className="mx-2 text-slate-300">/</div>
                                <input type="text" className="input-modern flex-1" placeholder="Singkatan..." value={editSubForm.singkatan || ''} onChange={e => setEditSubForm({ ...editSubForm, singkatan: e.target.value })} onKeyPress={e => e.key === 'Enter' && handleUpdateSub(sub.id)} />
                            </td>
                            <td className="p-2 border-b border-slate-100">
                                <div className="flex justify-center gap-1.5 opacity-100 transition-opacity">
                                    <button onClick={() => handleUpdateSub(sub.id)} className="text-emerald-600 p-1.5 hover:bg-emerald-100 rounded-full bg-white shadow-sm border border-slate-200" title="Simpan"><Check size={14} /></button>
                                    <button onClick={() => setEditingSubId(null)} className="text-rose-600 p-1.5 hover:bg-rose-100 rounded-full bg-white shadow-sm border border-slate-200" title="Batal"><X size={14} /></button>
                                </div>
                            </td>
                        </tr>
                    );
                } else {
                    rows.push(
                        <tr key={`s-${sub.id}`} className="hover:bg-slate-50/50 transition-colors border-b border-slate-50/50">
                            <td className="p-0 border-b border-slate-50/50"></td>
                            <td className="p-3 border-b border-slate-50/50 relative" colSpan={isSuperAdmin && !selectedInstansiFilter ? 3 : 2} style={{ paddingLeft: '40px' }}>
                                <div className="absolute left-6 top-0 bottom-0 w-px bg-slate-200"></div>
                                <div className="absolute left-6 top-1/2 w-4 border-t border-slate-200"></div>
                                <div className="flex items-center gap-2">
                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md border ${sub.nama_tipe_sub_bidang?.toLowerCase() === 'sub bagian' ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                                        {(sub.nama_tipe_sub_bidang || 'SUB BIDANG').toUpperCase()}
                                    </span>
                                    <span className="text-sm font-medium text-slate-600">
                                        {sub.nama_sub_bidang}
                                        {sub.singkatan && <span className="ml-1.5 text-slate-400 font-mono text-[11px] font-normal">({sub.singkatan})</span>}
                                    </span>
                                </div>
                            </td>
                            <td className="p-3 border-b border-slate-50/50">
                                <div className="flex justify-center gap-1.5 opacity-100 transition-opacity">
                                    <button onClick={() => { setEditingSubId(sub.id); setEditSubForm({ nama_sub_bidang: sub.nama_sub_bidang, singkatan: sub.singkatan || '', bidang_instansi_id: sub.bidang_instansi_id, tipe_sub_bidang_id: sub.tipe_sub_bidang_id }); }} className="text-slate-400 hover:text-indigo-600 p-1.5 hover:bg-indigo-50/80 rounded-xl transition-colors" title="Edit Sub Bidang"><Edit2 size={14} /></button>
                                    <button onClick={() => handleDeleteSub(sub.id)} className="text-slate-400 hover:text-rose-600 p-1.5 hover:bg-rose-50/80 rounded-xl transition-colors" title="Hapus Sub Bidang"><Trash2 size={14} /></button>
                                </div>
                            </td>
                        </tr>
                    );
                }
            });
        }

        // Render add Sub Bidang form
        if (isAddingSub && addingSubParentId === bidang.id) {
            rows.push(
                <tr key={`add-s-${bidang.id}`} className="bg-blue-50/30">
                    <td className="p-0 border-b border-slate-50"></td>
                    <td className="p-2 border-b border-slate-100 flex items-center pl-10 pt-4 pb-4 w-full h-full relative" colSpan={isSuperAdmin && !selectedInstansiFilter ? 3 : 2}>
                        <div className="absolute left-6 top-0 bottom-0 w-px bg-slate-200"></div>
                        <select className="bg-emerald-50 text-emerald-600 text-[10px] font-bold px-2 py-1 rounded mr-2 shrink-0 border border-emerald-200 outline-none cursor-pointer uppercase appearance-none" value={newSubForm.tipe_sub_bidang_id} onChange={e => setNewSubForm({ ...newSubForm, tipe_sub_bidang_id: Number(e.target.value) })}>
                            {tipeSubBidangOptions.map(opt => (
                                <option key={opt.id} value={opt.id}>NEW {opt.nama_tipe.toUpperCase()}</option>
                            ))}
                        </select>
                        <input autoFocus type="text" className="input-modern flex-[2]" placeholder="Nama..." value={newSubForm.nama_sub_bidang} onChange={e => setNewSubForm({ ...newSubForm, nama_sub_bidang: e.target.value })} onKeyPress={e => e.key === 'Enter' && handleAddSub()} />
                        <div className="mx-2 text-slate-300">/</div>
                        <input type="text" className="input-modern flex-1" placeholder="Singkatan..." value={newSubForm.singkatan || ''} onChange={e => setNewSubForm({ ...newSubForm, singkatan: e.target.value })} onKeyPress={e => e.key === 'Enter' && handleAddSub()} />
                    </td>
                    <td className="p-2 border-b border-slate-100">
                        <div className="flex justify-center gap-1.5 opacity-100 transition-opacity">
                            <button onClick={handleAddSub} className="text-emerald-600 p-1.5 hover:bg-emerald-100 rounded-full bg-white shadow-sm border border-slate-200" title="Simpan"><Check size={14} /></button>
                            <button onClick={() => { setIsAddingSub(false); setNewSubForm({ ...emptySubBidangForm }); setAddingSubParentId(null); }} className="text-rose-600 p-1.5 hover:bg-rose-100 rounded-full bg-white shadow-sm border border-slate-200" title="Batal"><X size={14} /></button>
                        </div>
                    </td>
                </tr>
            );
        }

        return rows;
    };

    return (
        <div className="card-modern p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                    <h2 className="text-[22px] font-extrabold text-slate-800 tracking-tight uppercase">Bidang & Sub Bidang</h2>
                    <p className="text-slate-500 text-sm mt-1">Kelola struktur hierarki unit kerja di instansi.</p>
                </div>
                {isSuperAdmin ? (
                    <div className="flex items-center gap-3">
                        {renderInstansiSelect(selectedInstansiFilter, setSelectedInstansiFilter)}
                        <button onClick={() => setIsAddingBidang(true)} className="btn-primary shrink-0">
                            <Plus size={16} /> Tambah Bidang
                        </button>
                    </div>
                ) : (
                    <div className="flex items-center gap-3">
                        <button onClick={() => setIsAddingBidang(true)} className="btn-primary shrink-0">
                            <Plus size={16} /> Tambah Bidang
                        </button>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                        <Layers size={24} />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Bidang</p>
                        <h3 className="text-2xl font-black text-slate-800 leading-tight">{filteredBidang.length}</h3>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center gap-4 relative group/total">
                    <div className="w-12 h-12 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                        <Columns size={24} />
                    </div>
                    <div className="flex-1">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-tight">Total Tim/Seksi/Sub Bidang/Sub Bagian</p>
                        <h3 className="text-2xl font-black text-slate-800 leading-tight">{filteredSubBidang.length}</h3>
                    </div>
                    {filteredSubBidang.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-2 p-3 bg-white border border-slate-100 shadow-xl rounded-xl z-10 opacity-0 group-hover/total:opacity-100 transition-opacity pointer-events-none">
                            <p className="text-[10px] font-bold text-slate-500 uppercase mb-2 border-b border-slate-50 pb-1">Rincian Unit:</p>
                            <div className="grid grid-cols-2 gap-2">
                                {Object.entries(getFullSubUnitBreakdown(filteredSubBidang)).map(([type, count]) => (
                                    <div key={type} className="flex justify-between items-center text-[11px]">
                                        <span className="text-slate-500 font-medium">{type}</span>
                                        <span className="font-bold text-slate-700">{count}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="mb-6 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-3">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tampilkan</span>
                    <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }} className="input-modern py-1 px-3 text-xs w-24 h-9 font-bold cursor-pointer">
                        {PAGE_SIZES.map(s => <option key={s} value={s}>{s === 0 ? 'Semua' : s}</option>)}
                    </select>
                    <div className="h-4 w-px bg-slate-200 mx-1"></div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">
                        <b>{displayedBidangList.length}</b> dari <b>{finalBidangList.length}</b> data
                    </span>
                </div>
                <div className="relative w-full sm:w-80">
                    <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="text" placeholder="Cari bidang atau sub bidang..." value={search} onChange={e => setSearch(e.target.value)} className="input-modern pl-10" />
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
                        <table className="w-full text-sm">
                            <thead>
                                <tr>
                                    <th className="table-header w-12 text-center rounded-tl-xl">#</th>
                                    <th className="table-header">Nama Unit Kerja</th>
                                    <th className="table-header w-32">Singkatan</th>
                                    {isSuperAdmin && !selectedInstansiFilter && (
                                        <th className="table-header">Instansi</th>
                                    )}
                                    <th className="table-header w-32 text-center rounded-tr-xl">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white">
                                {isAddingBidang && (
                                    <tr className="bg-blue-50/30">
                                        <td className="p-4 border-b border-slate-50 text-emerald-500 font-bold text-xs text-center border-emerald-200 border-r-0">
                                            <select className="bg-transparent text-emerald-500 text-[10px] font-bold outline-none cursor-pointer appearance-none text-center" value={newBidangForm.tipe_bidang_id} onChange={e => setNewBidangForm({ ...newBidangForm, tipe_bidang_id: Number(e.target.value) })}>
                                                {tipeBidangOptions.map(opt => (
                                                    <option key={opt.id} value={opt.id}>NEW {opt.nama_tipe.toUpperCase()}</option>
                                                ))}
                                            </select>
                                        </td>
                                        <td className="p-2 border-b border-slate-100 border-l border-emerald-200 pl-4">
                                            <input autoFocus type="text" className="input-modern flex-1 w-full" placeholder="Nama..." value={newBidangForm.nama_bidang} onChange={e => setNewBidangForm({ ...newBidangForm, nama_bidang: e.target.value })} onKeyPress={e => e.key === 'Enter' && handleAddBidang()} />
                                        </td>
                                        <td className="p-2 border-b border-slate-100">
                                            <input type="text" className="input-modern w-full" placeholder="Sing..." value={newBidangForm.singkatan || ''} onChange={e => setNewBidangForm({ ...newBidangForm, singkatan: e.target.value })} onKeyPress={e => e.key === 'Enter' && handleAddBidang()} />
                                        </td>
                                        {isSuperAdmin && !selectedInstansiFilter && (
                                            <td className="p-2 border-b border-slate-100">
                                                {renderInstansiSelect(newBidangForm.instansi_id, val => setNewBidangForm({ ...newBidangForm, instansi_id: val }))}
                                            </td>
                                        )}
                                        <td className="p-2 border-b border-slate-100">
                                            <div className="flex justify-center gap-1.5">
                                                <button onClick={handleAddBidang} className="text-emerald-600 p-1.5 hover:bg-emerald-100 rounded-full bg-white shadow-sm border border-slate-200" title="Simpan"><Check size={14} /></button>
                                                <button onClick={() => { setIsAddingBidang(false); setNewBidangForm({ ...emptyBidangForm }); }} className="text-rose-600 p-1.5 hover:bg-rose-100 rounded-full bg-white shadow-sm border border-slate-200" title="Batal"><X size={14} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                                {displayedBidangList.map((bidang, index) => renderBidangRow(bidang, index))}
                                {displayedBidangList.length === 0 && !isAddingBidang && (
                                    <tr>
                                        <td colSpan={isSuperAdmin && !selectedInstansiFilter ? 5 : 4} className="p-12 text-center text-slate-400 font-bold italic">
                                            {search ? 'Tidak ada hasil pencarian' : 'Belum ada data bidang'}
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

export default MasterBidangInstansi;
