import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { Plus, Edit2, Trash2, X, Check, Loader2, Search, KeyRound, ChevronDown } from 'lucide-react';
import { useLabels } from '../contexts/LabelContext';
import { SearchableSelect } from './common/SearchableSelect';

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

const emptyForm = {
    username: '',
    password: '',
    nama_lengkap: '',
    email: '',
    no_hp: '',
    tipe_user_id: null as number | null,
    instansi_id: null as number | null,
    is_active: 1,
    profil_pegawai_id: null as number | null
};

const ManajemenUser = () => {
    const { user: currentUser } = useAuth();
    const isSuperAdmin = currentUser?.tipe_user_id === 1;
    const { getLabel } = useLabels();
    const [data, setData] = useState<any[]>([]);

    // Master data lists
    const [tipeUserList, setTipeUserList] = useState<any[]>([]);
    const [instansiList, setInstansiList] = useState<any[]>([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);
    const [formData, setFormData] = useState({ ...emptyForm });

    const [search, setSearch] = useState('');
    const [pageSize, setPageSize] = useState(10);
    const [currentPage, setCurrentPage] = useState(1);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [
                usersRes,
                tipeUserRes,
                instansiRes
            ] = await Promise.all([
                api.users.getAll(),
                api.masterDataConfig.getDataByTable('master_tipe_user').catch(() => ({ success: false, data: [] })),
                api.instansiDaerah.getAll().catch(() => ({ success: false, data: [] }))
            ]);

            if (usersRes.success) setData(usersRes.data);
            else setError(usersRes.message);

            if (tipeUserRes.success) setTipeUserList(tipeUserRes.data);
            if (instansiRes.success) setInstansiList(instansiRes.data);

        } catch (err) {
            setError('Gagal mengambil data user');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const filtered = useMemo(() => {
        if (!search.trim()) return data;
        const q = search.toLowerCase();
        return data.filter(d =>
            (d.nama_lengkap && d.nama_lengkap.toLowerCase().includes(q)) ||
            (d.username && d.username.toLowerCase().includes(q)) ||
            (d.email && d.email.toLowerCase().includes(q)) ||
            (d.instansi_nama && d.instansi_nama.toLowerCase().includes(q))
        );
    }, [data, search]);

    const totalPages = pageSize === 0 ? 1 : Math.ceil(filtered.length / pageSize);
    const displayed = pageSize === 0 ? filtered : filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    useEffect(() => { setCurrentPage(1); }, [search, pageSize]);

    const handleSaveMenu = async () => {
        if (!formData.nama_lengkap.trim() && !formData.profil_pegawai_id) {
            alert('Nama Lengkap atau Pilihan Pegawai wajib diisi');
            return;
        }

        try {
            let res;
            if (isEditing && editId) {
                res = await api.users.update(editId, formData);
            } else {
                res = await api.users.create(formData);
            }

            if (res.success) {
                setIsModalOpen(false);
                setFormData({ ...emptyForm });
                fetchData();
            } else {
                alert(res.message || 'Gagal menyimpan pengguna');
            }
        } catch {
            alert('Gagal menyimpan pengguna');
        }
    };

    const openAddModal = () => {
        setFormData({
            ...emptyForm,
            instansi_id: isSuperAdmin ? null : (currentUser?.instansi_id || null)
        });
        setIsEditing(false);
        setEditId(null);
        setIsModalOpen(true);
    };

    const openEditModal = (item: any) => {
        setFormData({
            username: item.username || '',
            password: '',
            nama_lengkap: item.nama_lengkap,
            email: item.email || '',
            no_hp: item.no_hp || '',
            tipe_user_id: item.tipe_user_id,
            instansi_id: item.instansi_id,
            is_active: item.is_active,
            profil_pegawai_id: item.profil_pegawai_id
        });
        setIsEditing(true);
        setEditId(item.id);
        setIsModalOpen(true);
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm('Hapus pengguna ini?')) return;
        try {
            const res = await api.users.delete(id);
            if (res.success) fetchData();
            else alert(res.message || 'Gagal menghapus pengguna');
        } catch { alert('Gagal menghapus pengguna'); }
    };

    const renderSelect = (value: number | null, onChange: (val: number | null) => void, options: any[], label: string, keyField: string = 'nama') => (
        <select
            value={value ?? ''}
            onChange={e => onChange(e.target.value ? Number(e.target.value) : null)}
            className="input-modern bg-white py-2 px-3 text-sm w-full"
        >
            <option value="">-- Pilih {label} --</option>
            {options.map(opt => (
                <option key={opt.id} value={opt.id}>{opt[keyField] || opt.tipe_user}</option>
            ))}
        </select>
    );

    return (
        <div className="card-modern p-6 relative">

            {/* Modal Form */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-ppm-slate/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
                            <h3 className="text-lg font-bold text-ppm-slate">{isEditing ? 'Ubah Pengguna' : 'Tambah Pengguna Baru'}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-rose-600 p-1 rounded-lg hover:bg-rose-50 transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <form autoComplete="off" onSubmit={e => { e.preventDefault(); handleSaveMenu(); }}>
                            <div className="p-6 overflow-y-auto w-full custom-scroll space-y-4">

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Nama Lengkap <span className="text-red-500">*</span></label>
                                        <input autoFocus type="text" className="input-modern w-full" placeholder="Nama berserta gelar" value={formData.nama_lengkap} onChange={e => setFormData({ ...formData, nama_lengkap: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Role Aplikasi</label>
                                        {renderSelect(formData.tipe_user_id, val => setFormData({ ...formData, tipe_user_id: val }), tipeUserList, 'Role', 'tipe_user')}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Email</label>
                                        <input type="email" className="input-modern w-full" placeholder="Email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                                    </div>
                                    <div className={`z-10 relative ${!isSuperAdmin ? 'opacity-60 grayscale pointer-events-none' : ''}`}>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                                            Instansi Asal {!isSuperAdmin && <span className="text-[10px] lowercase font-normal italic">(hanya super admin)</span>}
                                        </label>
                                        <SearchableSelect
                                            value={formData.instansi_id}
                                            onChange={(val: any) => setFormData({ ...formData, instansi_id: val })}
                                            options={instansiList}
                                            label="Instansi"
                                            keyField="id"
                                            displayField="instansi"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">No HP</label>
                                        <input type="text" className="input-modern w-full" placeholder="08..." value={formData.no_hp} onChange={e => setFormData({ ...formData, no_hp: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Akun Aktif</label>
                                        <select value={formData.is_active} onChange={e => setFormData({ ...formData, is_active: Number(e.target.value) })} className="input-modern bg-white py-2 px-3 w-full font-bold">
                                            <option value={1}>Aktif - Bisa Login</option>
                                            <option value={0}>Nonaktif - Diblokir</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Username <span className="text-red-500">*</span></label>
                                    <input type="text" className="input-modern w-full" placeholder="Username untuk login" value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value })} autoComplete="off" />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Password</label>
                                    <div className="relative">
                                        <KeyRound size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input type="password" className="input-modern w-full pl-9" placeholder={isEditing ? "(Kosongkan jika tidak diubah)" : "Default: 123456"} value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} autoComplete="new-password" />
                                    </div>
                                </div>
                            </div>
                            <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex justify-end gap-3 shrink-0">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-lg font-bold text-slate-500 bg-white border border-slate-200 hover:bg-slate-50 hover:text-slate-700 transition-colors">Batal</button>
                                <button type="submit" className="px-5 py-2 rounded-lg font-bold text-white bg-ppm-slate hover:bg-ppm-slate-light transition-all shadow-md hover:shadow-lg flex items-center gap-2">
                                    <Check size={18} /> Simpan Pengguna
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div className="flex justify-between items-center mb-6">
                <h2 className="text-[22px] font-extrabold text-slate-800 tracking-tight">Manajemen User / Pengguna</h2>
                <button onClick={openAddModal} className="btn-primary">
                    <Plus size={16} /> Tambah User
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
                    <input type="text" placeholder="Cari nama, username, atau email..." value={search} onChange={e => setSearch(e.target.value)} className="input-modern pl-10" />
                </div>
            </div>

            {
                loading ? (
                    <div className="flex justify-center py-12"><Loader2 className="animate-spin text-ppm-slate" size={44} /></div>
                ) : error ? (
                    <div className="text-red-600 text-center py-12 font-bold">{error}</div>
                ) : (
                    <>
                        <div className="overflow-x-auto rounded-xl border border-slate-100 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.02)]">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr>
                                        <th className="table-header w-12 text-center rounded-tl-xl">#</th>
                                        <th className="table-header">Profil Singkat</th>
                                        <th className="table-header">Role & Posisi</th>
                                        <th className="table-header w-24 text-center">Status</th>
                                        <th className="table-header w-24 text-center">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white">

                                    {displayed.map((item, index) => (
                                        <tr key={item.id} className="hover:bg-slate-50/80 transition-colors border-b border-slate-50 group/row align-top">
                                            <td className="p-4 border-b border-slate-50 font-mono text-xs text-slate-500 text-center">{(currentPage - 1) * (pageSize || filtered.length) + index + 1}</td>
                                            <td className="p-4 border-b border-slate-50">
                                                <div>
                                                    <div className="font-bold text-slate-800 text-sm mb-0.5">{item.nama_lengkap}</div>
                                                    <div className="font-mono text-xs text-slate-500 mb-1">@{item.username || '-'}</div>
                                                    <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1">
                                                        {item.email && <span className="bg-slate-100 px-1.5 py-0.5 rounded truncate max-w-[150px]" title={item.email}>{item.email}</span>}
                                                        {item.no_hp && <span>{item.no_hp}</span>}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4 border-b border-slate-50">
                                                <div className="space-y-1.5">
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {item.tipe_user_nama && <div className="inline-block px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded text-[10px] font-bold tracking-wide">{item.tipe_user_nama}</div>}
                                                    </div>
                                                    {item.instansi_nama && <div className="text-[11px] text-slate-500 mt-1">{item.instansi_nama}</div>}
                                                    {!item.instansi_nama && <div className="text-xs text-slate-400 italic">Belum disetup</div>}
                                                </div>
                                            </td>
                                            <td className="p-4 border-b border-slate-50 text-center">
                                                <span className={`inline-block px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${item.is_active ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                                    {item.is_active ? 'Aktif' : 'Nonaktif'}
                                                </span>
                                            </td>
                                            <td className="p-4 border-b border-slate-50">
                                                <div className="flex justify-center gap-1 opacity-100">
                                                    <button onClick={() => openEditModal(item)} className="text-slate-400 hover:text-indigo-600 p-2 hover:bg-indigo-50/80 rounded-xl transition-colors"><Edit2 size={16} /></button>
                                                    <button onClick={() => handleDelete(item.id)} className="text-slate-400 hover:text-rose-600 p-2 hover:bg-rose-50/80 rounded-xl transition-colors"><Trash2 size={16} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {displayed.length === 0 && (
                                        <tr><td colSpan={5} className="p-12 text-center text-slate-400 font-bold italic">{search ? 'Tidak ada hasil pencarian' : 'Belum ada data pengguna'}</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <div className="flex justify-end mt-6">
                            {renderPageButtons(currentPage, totalPages, setCurrentPage)}
                        </div>
                    </>
                )
            }
        </div >
    );
};

export default ManajemenUser;
