import React, { useState, useEffect } from 'react';
import { api } from '@/src/services/api';
import { 
    Settings2, 
    Loader2, 
    Check, 
    ShieldCheck,
    LayoutDashboard,
    PlusCircle,
    Edit2,
    X
} from 'lucide-react';
import { BaseDataTable } from '@/src/features/common/components/BaseDataTable';
import { SearchableSelect } from '@/src/features/common/components/SearchableSelect';
import { useAuth } from '@/src/contexts/AuthContext';

interface MacroIndicator {
    id: number;
    kode: string;
    nama_data: string;
    tematik_id: number | null;
    tematik_ids?: number[];
    sumber_data: string | null;
    satuan_id: number | null;
    tematik_nama?: string;
    satuan_nama?: string;
    assigned_pegawai_ids?: number[];
}

interface Pegawai {
    id: number;
    nama_lengkap: string;
    nip: string;
    jabatan: string;
}

interface Tematik {
    id: number;
    nama: string;
}

interface Satuan {
    id: number;
    satuan: string;
}

const SettingDataMakro = () => {
    const { user } = useAuth();
    const userRoleId = Number(user?.tipe_user_id || 0);
    const userRoleName = (user?.tipe_user_nama || '').toLowerCase();
    const userJabatanName = (user?.jabatan_nama || '').toLowerCase();
    const userBidangName = (user?.bidang_nama || '').toLowerCase();
    const userBidangSingkatan = (user?.bidang_singkatan || '').toLowerCase();

    // Akses konfigurasi data makro: Admin Instansi, Sekretariat Badan, Kepala Badan
    const isAdminInstansi = [1, 2, 7, 8].includes(userRoleId) || userRoleName.includes('admin');
    const isKepalaBadan = userRoleId === 5 || 
        userRoleName.includes('kepala badan') || 
        userJabatanName.includes('kepala badan') ||
        (userJabatanName === 'kepala' && (Number(user?.instansi_id) === 2 || (user?.instansi_nama || '').toLowerCase().includes('bapperida')));
    const isSekretariatBadan = userBidangName.includes('sekretariat') || 
        userBidangSingkatan.includes('sekret') || 
        userJabatanName.includes('sekretaris');

    const canEdit = isAdminInstansi || isKepalaBadan || isSekretariatBadan;

    const [activeTab, setActiveTab] = useState<'assignment' | 'authority'>('assignment');
    const [loading, setLoading] = useState(true);
    const [indicators, setIndicators] = useState<MacroIndicator[]>([]);
    const [pegawaiList, setPegawaiList] = useState<Pegawai[]>([]);
    const [tematiks, setTematiks] = useState<Tematik[]>([]);
    const [satuans, setSatuans] = useState<Satuan[]>([]);
    const [assignments, setAssignments] = useState<Record<number, number[]>>({});
    const [otoritasList, setOtoritasList] = useState<number[]>([]);
    
    const [isSavingOtoritas, setIsSavingOtoritas] = useState(false);

    // Modal Edit Tunggal Untuk Mengubah Semua (Satuan, Sumber, Tagging, Pegawai, Nama)
    const [editingIndicator, setEditingIndicator] = useState<MacroIndicator | null>(null);
    const [editForm, setEditForm] = useState({
        nama_data: '',
        satuan_id: null as number | null,
        sumber_data: '',
        tematik_ids: [] as number[],
        pegawai_ids: [] as number[]
    });
    const [isSavingIndicator, setIsSavingIndicator] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [indRes, pegRes, otoRes, temRes, satRes] = await Promise.all([
                api.dataMakro.getAll(),
                api.profilPegawai.getAll(),
                api.dataMakro.getOtoritas(),
                api.tematik.getAll(),
                api.satuan.getAll()
            ]);

            if (indRes.success) {
                setIndicators(indRes.data);
                const assigns: Record<number, number[]> = {};
                indRes.data.forEach((ind: MacroIndicator) => {
                    assigns[ind.id] = ind.assigned_pegawai_ids || [];
                });
                setAssignments(assigns);
            }
            if (pegRes.success) setPegawaiList(pegRes.data);
            if (otoRes.success) setOtoritasList(otoRes.data.map((o: any) => o.profil_pegawai_id));
            if (temRes.success) setTematiks(temRes.data);
            if (satRes.success) setSatuans(satRes.data);
        } catch (err) {
            console.error('Failed to fetch setting data:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleSaveOtoritas = async () => {
        setIsSavingOtoritas(true);
        try {
            const res = await api.dataMakro.setOtoritas(otoritasList);
            if (!res.success) alert(res.message);
        } catch (err) {
            console.error('Save otoritas failed:', err);
        } finally {
            setIsSavingOtoritas(false);
        }
    };

    // Buka Modal Edit Lengkap (Semua data indikator + penugasan pegawai)
    const openEditModal = (item: MacroIndicator) => {
        setEditingIndicator(item);
        const currentPegawai = assignments[item.id] !== undefined ? assignments[item.id] : (item.assigned_pegawai_ids || []);
        setEditForm({
            nama_data: item.nama_data,
            satuan_id: item.satuan_id,
            sumber_data: item.sumber_data || '',
            tematik_ids: item.tematik_ids || (item.tematik_id ? [item.tematik_id] : []),
            pegawai_ids: currentPegawai
        });
    };

    // Simpan semua perubahan (Satuan, Sumber, Tagging, Pegawai, Nama)
    const handleSaveIndicator = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingIndicator) return;
        setIsSavingIndicator(true);
        try {
            const [updateRes, pegawaiRes] = await Promise.all([
                api.dataMakro.update(editingIndicator.id, {
                    nama_data: editForm.nama_data,
                    satuan_id: editForm.satuan_id ? Number(editForm.satuan_id) : null,
                    sumber_data: editForm.sumber_data,
                    tematik_ids: editForm.tematik_ids
                }),
                api.dataMakro.setPegawai(editingIndicator.id, editForm.pegawai_ids)
            ]);

            if (updateRes.success && pegawaiRes.success) {
                const updatedTematikNames = tematiks
                    .filter(t => editForm.tematik_ids.includes(t.id))
                    .map(t => t.nama)
                    .join(', ');
                const updatedSatuanName = satuans.find(s => s.id === Number(editForm.satuan_id))?.satuan;

                // Optimistically update both states immediately
                setAssignments(prev => ({ ...prev, [editingIndicator.id]: editForm.pegawai_ids }));
                setIndicators(prev => prev.map(ind => ind.id === editingIndicator.id ? {
                    ...ind,
                    nama_data: editForm.nama_data,
                    satuan_id: editForm.satuan_id ? Number(editForm.satuan_id) : null,
                    satuan_nama: updatedSatuanName || ind.satuan_nama,
                    sumber_data: editForm.sumber_data,
                    tematik_ids: editForm.tematik_ids,
                    tematik_nama: updatedTematikNames,
                    assigned_pegawai_ids: editForm.pegawai_ids
                } : ind));

                setEditingIndicator(null);
                // Background fetch to ensure fully synchronized data
                fetchData();
            } else {
                alert(updateRes.message || pegawaiRes.message || 'Gagal menyimpan perubahan');
            }
        } catch (err) {
            console.error('Save indicator failed:', err);
            alert('Terjadi kesalahan saat menyimpan perubahan indikator');
        } finally {
            setIsSavingIndicator(false);
        }
    };

    const assignmentColumns = [
        {
            header: 'Indikator Makro',
            key: 'nama_data',
            className: 'w-[42%]',
            render: (item: MacroIndicator) => {
                const tematikBadgeList = item.tematik_nama ? item.tematik_nama.split(', ') : [];
                const currentSelection = assignments[item.id] !== undefined ? assignments[item.id] : (item.assigned_pegawai_ids || []);
                const assignedPegawaiObjects = pegawaiList.filter(p => currentSelection.includes(p.id));
                const pjNames = assignedPegawaiObjects.map(p => p.nama_lengkap).join(', ');

                return (
                    <div 
                        className="flex flex-col gap-1.5 py-0.5"
                        title={`Indikator: ${item.nama_data}\nPenanggung Jawab: ${pjNames || 'Belum ada pegawai ditugaskan'}`}
                    >
                        <span className="text-sm font-bold text-slate-800 tracking-tight leading-tight">
                            {item.nama_data}
                        </span>
                        <div className="flex items-center gap-1.5 flex-wrap">
                            {tematikBadgeList.length > 0 ? (
                                tematikBadgeList.map(tn => (
                                    <span key={tn} className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/70">
                                        {tn}
                                    </span>
                                ))
                            ) : (
                                <span className="text-[10px] text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200/60">
                                    Tanpa Tematik
                                </span>
                            )}
                            {item.satuan_nama && (
                                <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                                    Satuan: {item.satuan_nama}
                                </span>
                            )}
                            {item.sumber_data && (
                                <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                                    Sumber: {item.sumber_data}
                                </span>
                            )}
                        </div>
                    </div>
                );
            }
        },
        {
            header: 'Pegawai Penanggung Jawab',
            key: 'pegawai',
            className: 'w-[48%]',
            render: (item: MacroIndicator) => {
                const currentSelection = assignments[item.id] !== undefined ? assignments[item.id] : (item.assigned_pegawai_ids || []);
                const assignedPegawaiObjects = pegawaiList.filter(p => currentSelection.includes(p.id));

                return (
                    <div className="flex items-center gap-1.5 flex-wrap py-1">
                        {assignedPegawaiObjects.length > 0 ? (
                            assignedPegawaiObjects.map(p => (
                                <span 
                                    key={p.id}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-700 shadow-2xs"
                                >
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                                    <span>{p.nama_lengkap}</span>
                                </span>
                            ))
                        ) : (
                            <span className="text-xs text-slate-400 italic">
                                Belum ada pegawai ditugaskan
                            </span>
                        )}
                    </div>
                );
            }
        },
        {
            header: 'Aksi',
            key: 'aksi',
            className: 'w-[10%] text-center',
            render: (item: MacroIndicator) => {
                if (!canEdit) return null;
                return (
                    <div className="flex items-center justify-center">
                        <button
                            type="button"
                            onClick={() => openEditModal(item)}
                            className="p-2 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 transition-all shadow-2xs cursor-pointer"
                            title="Ubah Semua (Satuan, Sumber, Tagging, Pegawai)"
                        >
                            <Edit2 size={15} />
                        </button>
                    </div>
                );
            }
        }
    ];

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="bg-white/90 backdrop-blur-md p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-11 h-11 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 shadow-inner">
                        <Settings2 size={24} />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-slate-800 tracking-tight">Setting Data Makro</h1>
                        <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Konfigurasi Hak Akses & Penugasan</p>
                    </div>
                </div>

                <div className="flex bg-slate-100 p-1 rounded-xl">
                    <button 
                        onClick={() => setActiveTab('assignment')}
                        className={`flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-black transition-all ${
                            activeTab === 'assignment' 
                            ? 'bg-white text-indigo-600 shadow-xs' 
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        <LayoutDashboard size={15} />
                        Penugasan
                    </button>
                    <button 
                        onClick={() => setActiveTab('authority')}
                        className={`flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-black transition-all ${
                            activeTab === 'authority' 
                            ? 'bg-white text-indigo-600 shadow-xs' 
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        <ShieldCheck size={15} />
                        Otoritas
                    </button>
                </div>
            </div>

            {/* Content Tabs */}
            {activeTab === 'assignment' ? (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <BaseDataTable
                        title="Penugasan Pegawai per Indikator"
                        searchPlaceholder="Cari indikator atau tematik..."
                        searchKey={(item: MacroIndicator) => `${item.nama_data} ${item.tematik_nama || ''} ${item.satuan_nama || ''} ${item.sumber_data || ''}`}
                        data={indicators}
                        columns={assignmentColumns}
                        loading={loading}
                    />
                </div>
            ) : (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 sm:p-8">
                        <div className="max-w-2xl mx-auto space-y-6">
                            <div className="text-center space-y-2">
                                <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
                                    <PlusCircle size={28} />
                                </div>
                                <h2 className="text-xl font-black text-slate-800 tracking-tight">Otoritas Penambahan Data</h2>
                                <p className="text-xs text-slate-500 font-medium px-4">
                                    Pilih pegawai (Katim, Kabid, atau Admin Bidang) yang diberikan wewenang penuh untuk <b>menambah</b>, <b>mengubah definisi</b>, dan <b>menghapus</b> baris indikator makro.
                                </p>
                            </div>

                            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-5">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Daftar Pegawai Berwenang</label>
                                    <SearchableSelect
                                        value={otoritasList}
                                        onChange={(val: any) => setOtoritasList(val)}
                                        options={pegawaiList}
                                        label="Ketik nama atau jabatan..."
                                        keyField="id"
                                        displayField="nama_lengkap"
                                        multiple
                                        disabled={!canEdit || isSavingOtoritas}
                                    />
                                </div>

                                <button
                                    onClick={handleSaveOtoritas}
                                    disabled={!canEdit || isSavingOtoritas}
                                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-xl font-black text-xs transition-all shadow-md shadow-indigo-200 flex items-center justify-center gap-2 overflow-hidden group"
                                >
                                    {isSavingOtoritas ? (
                                        <Loader2 size={16} className="animate-spin" />
                                    ) : (
                                        <>
                                            <Check size={16} className="group-hover:scale-125 transition-transform" />
                                            <span>Simpan Perubahan Otoritas</span>
                                        </>
                                    )}
                                </button>
                            </div>

                            <div className="bg-amber-50/60 p-4 rounded-xl border border-amber-200/60 flex items-start gap-3">
                                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-amber-500 shadow-xs shrink-0">
                                    <ShieldCheck size={16} />
                                </div>
                                <div>
                                    <h4 className="text-xs font-black text-amber-900 uppercase tracking-tight">Privilese Administrator</h4>
                                    <p className="text-[11px] text-amber-700/80 font-medium leading-relaxed mt-0.5">
                                        Akun Administrator (Superadmin, Admin Bapperida, dll.) secara otomatis memiliki hak akses penuh tanpa perlu didaftarkan dalam daftar di atas.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Edit Tunggal: Mengubah SEMUA (Satuan, Sumber, Tagging, Pegawai, Nama) */}
            {editingIndicator && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-200">
                        {/* Modal Header */}
                        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                            <div>
                                <h3 className="text-base font-black text-slate-800">Edit Data & Penugasan Indikator</h3>
                                <p className="text-xs text-slate-500 font-medium">Ubah nama indikator, satuan, sumber data, tagging tematik, dan pegawai penanggung jawab</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setEditingIndicator(null)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-all cursor-pointer"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Modal Form */}
                        <form onSubmit={handleSaveIndicator} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto custom-scrollbar">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Nama Indikator Makro</label>
                                <textarea
                                    rows={2}
                                    value={editForm.nama_data}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, nama_data: e.target.value }))}
                                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none resize-none"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Satuan Metrik</label>
                                    <select
                                        value={editForm.satuan_id || ''}
                                        onChange={(e) => setEditForm(prev => ({ ...prev, satuan_id: e.target.value ? Number(e.target.value) : null }))}
                                        className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none cursor-pointer"
                                    >
                                        <option value="">- Pilih Satuan -</option>
                                        {satuans.map(s => (
                                            <option key={s.id} value={s.id}>{s.satuan}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Sumber Data</label>
                                    <input
                                        type="text"
                                        placeholder="Contoh: BPS / Walidata"
                                        value={editForm.sumber_data}
                                        onChange={(e) => setEditForm(prev => ({ ...prev, sumber_data: e.target.value }))}
                                        className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                    Tagging Prioritas / Tematik (Bisa Pilih Lebih Dari Satu)
                                </label>
                                <SearchableSelect
                                    value={editForm.tematik_ids}
                                    onChange={(val: any) => setEditForm(prev => ({ ...prev, tematik_ids: val }))}
                                    options={tematiks}
                                    label="Pilih satu atau beberapa tematik..."
                                    keyField="id"
                                    displayField="nama"
                                    multiple
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                    Pegawai Penanggung Jawab (Bisa Pilih Lebih Dari Satu)
                                </label>
                                <SearchableSelect
                                    value={editForm.pegawai_ids}
                                    onChange={(val: any) => setEditForm(prev => ({ ...prev, pegawai_ids: val }))}
                                    options={pegawaiList}
                                    label="Pilih satu atau beberapa pegawai penanggung jawab..."
                                    keyField="id"
                                    displayField="nama_lengkap"
                                    multiple
                                />
                            </div>

                            {/* Modal Actions - Tombol Ceklis Muncul untuk Simpan Perubahan */}
                            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                                <button
                                    type="button"
                                    onClick={() => setEditingIndicator(null)}
                                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSavingIndicator}
                                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm shadow-emerald-200 cursor-pointer"
                                    title="Simpan Semua Perubahan"
                                >
                                    {isSavingIndicator ? <Loader2 size={15} className="animate-spin" /> : <Check size={16} strokeWidth={2.5} />}
                                    <span>Simpan Perubahan</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SettingDataMakro;
