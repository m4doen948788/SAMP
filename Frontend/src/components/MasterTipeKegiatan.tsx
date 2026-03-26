import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Plus, Edit2, Trash2, X, Check, Loader2, Palette, Settings2, Hash, Layers } from 'lucide-react';
import { BaseDataTable } from './common/BaseDataTable';

interface TipeKegiatanItem {
    id: number;
    parent_id: number | null;
    kode: string;
    nama: string;
    deskripsi: string;
    warna: string;
    warna_teks: string;
    is_jumlah_full: boolean;
    is_rapat: boolean;
    urutan: number;
    subOptions?: TipeKegiatanItem[];
}

const MasterTipeKegiatan = () => {
    const [data, setData] = useState<TipeKegiatanItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<number | string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const [form, setForm] = useState({
        kode: '',
        nama: '',
        deskripsi: '',
        warna: 'bg-slate-500',
        warna_teks: 'text-white',
        is_jumlah_full: false,
        is_rapat: false,
        urutan: 0,
        parent_id: null as number | null
    });

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await api.tipeKegiatan.getAll();
            if (res.success) {
                // Flatten to list for table, but we use the structured 'data' for potential hierarchy display
                // Actually BaseDataTable wants a flat array, we'll use the raw data from response if provided
                setData(res.raw || res.data);
            }
            else setError(res.message);
        } catch { setError('Gagal mengambil data'); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchData(); }, []);

    const resetForm = () => {
        setForm({
            kode: '',
            nama: '',
            deskripsi: '',
            warna: 'bg-slate-500',
            warna_teks: 'text-white',
            is_jumlah_full: false,
            is_rapat: false,
            urutan: 0,
            parent_id: null
        });
        setEditingId(null);
        setIsAdding(false);
    };

    const handleSave = async () => {
        if (!form.kode.trim() || !form.nama.trim()) {
            alert('Kode dan Nama wajib diisi');
            return;
        }
        setIsSaving(true);
        console.log('HANDLESAVE - ID:', editingId, 'Form:', form);
        setIsSaving(true);
        try {
            const res = editingId
                ? await api.tipeKegiatan.update(Number(editingId), form)
                : await api.tipeKegiatan.create(form);

            console.log('SAVE RESPONSE:', res);
            if (res.success) {
                alert('Tipe kegiatan berhasil disimpan');
                resetForm();
                fetchData();
            } else {
                alert('Gagal: ' + (res.message || 'Terjadi kesalahan pada server'));
            }
        } catch (err: any) {
            alert('Kesalahan koneksi: ' + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Hapus tipe kegiatan ini?')) return;
        try {
            const res = await api.tipeKegiatan.delete(id);
            if (res.success) fetchData();
        } catch { alert('Gagal menghapus data'); }
    };

    const startEdit = (item: TipeKegiatanItem) => {
        setEditingId(item.id);
        setForm({
            kode: item.kode,
            nama: item.nama,
            deskripsi: item.deskripsi || '',
            warna: item.warna,
            warna_teks: item.warna_teks,
            is_jumlah_full: item.is_jumlah_full,
            is_rapat: item.is_rapat,
            urutan: item.urutan,
            parent_id: item.parent_id
        });
    };

    const columns = [
        { header: 'Urutan', key: 'urutan', className: 'w-[60px] text-center font-mono text-xs' },
        { header: 'Kode', key: 'kode', className: 'w-[100px] font-black text-slate-800' },
        { header: 'Nama', key: 'nama', className: 'font-semibold text-slate-700 w-[180px]' },
        {
            header: 'Keterangan',
            key: 'deskripsi',
            className: 'text-[11px] text-slate-500 italic leading-relaxed min-w-[200px]',
            render: (item: TipeKegiatanItem) => item.deskripsi || <span className="text-slate-300">Belum ada keterangan...</span>
        },
        {
            header: 'Warna',
            key: 'warna',
            render: (item: TipeKegiatanItem) => (
                <div className="flex items-center gap-2">
                    <div className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider shadow-sm ${item.warna} ${item.warna_teks}`}>
                        Preview
                    </div>
                </div>
            )
        },
        {
            header: 'Aturan',
            key: 'is_rapat',
            render: (item: TipeKegiatanItem) => (
                <div className="flex gap-2">
                    {item.is_jumlah_full && <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded-md text-[9px] font-bold uppercase">Rentang Hari</span>}
                    {item.is_rapat && <span className="bg-purple-50 text-purple-600 px-2 py-0.5 rounded-md text-[9px] font-bold uppercase">Pilih Rapat</span>}
                    {item.parent_id && <span className="bg-slate-50 text-slate-500 px-2 py-0.5 rounded-md text-[9px] font-bold uppercase italic">Sub-Opsi</span>}
                </div>
            )
        }
    ];

    const renderFormRow = (isEdit: boolean = false) => (
        <tr className={isEdit ? "bg-indigo-50/50" : "bg-emerald-50/30"}>
            <td className="p-4 border-b border-slate-100 bg-slate-50/50"></td>
            <td className="p-4 border-b border-slate-100">
                <input type="number" className="input-modern py-1 text-center" value={form.urutan} onChange={e => setForm({ ...form, urutan: parseInt(e.target.value) })} />
            </td>
            <td className="p-4 border-b border-slate-100">
                <input autoFocus type="text" className="input-modern py-1" placeholder="Kode (C, RM...)" value={form.kode} onChange={e => setForm({ ...form, kode: e.target.value })} />
            </td>
            <td className="p-4 border-b border-slate-100">
                <input type="text" className="input-modern py-1" placeholder="Nama Label" value={form.nama} onChange={e => setForm({ ...form, nama: e.target.value })} />
            </td>
            <td className="p-4 border-b border-slate-100">
                <textarea
                    className="input-modern py-2 text-[11px] min-h-[60px] resize-none"
                    placeholder="Keterangan singkat untuk hover..."
                    value={form.deskripsi}
                    onChange={e => setForm({ ...form, deskripsi: e.target.value })}
                    rows={2}
                />
            </td>
            <td className="p-4 border-b border-slate-100">
                <div className="flex flex-col gap-1">
                    <input type="text" className="input-modern py-1 text-[10px]" placeholder="bg-red-500" value={form.warna} onChange={e => setForm({ ...form, warna: e.target.value })} />
                    <input type="text" className="input-modern py-1 text-[10px]" placeholder="text-white" value={form.warna_teks} onChange={e => setForm({ ...form, warna_teks: e.target.value })} />
                </div>
            </td>
            <td className="p-4 border-b border-slate-100">
                <div className="flex flex-col gap-2 scale-90 origin-left">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={form.is_jumlah_full} onChange={e => setForm({ ...form, is_jumlah_full: e.target.checked })} />
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Rentang</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={form.is_rapat} onChange={e => setForm({ ...form, is_rapat: e.target.checked })} />
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Rapat</span>
                    </label>
                </div>
            </td>
            <td className="p-4 border-b border-slate-100">
                <div className="flex justify-center gap-1.5">
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className={`text-emerald-600 p-1.5 hover:bg-emerald-100 rounded-lg transition-colors ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                    </button>
                    <button onClick={resetForm} disabled={isSaving} className="text-rose-600 p-1.5 hover:bg-rose-100 rounded-lg transition-colors"><X size={18} /></button>
                </div>
            </td>
        </tr>
    );

    return (
        <BaseDataTable<TipeKegiatanItem>
            title="Master Tipe Kegiatan"
            subtitle="Atur kode dan metadata untuk kalender kegiatan pegawai."
            data={data}
            columns={columns}
            loading={loading}
            error={error}
            searchPlaceholder="Cari kode atau nama..."
            addButtonLabel="Tambah Tipe"
            onAddClick={() => setIsAdding(true)}
            editingId={editingId}
            renderAddRow={() => isAdding && renderFormRow(false)}
            renderEditRow={() => renderFormRow(true)}
            renderActions={(item) => (
                <>
                    <button onClick={() => startEdit(item)} className="text-slate-400 hover:text-indigo-600 p-2 hover:bg-indigo-50/80 rounded-xl transition-colors"><Edit2 size={16} /></button>
                    <button onClick={() => handleDelete(item.id)} className="text-slate-400 hover:text-rose-600 p-2 hover:bg-rose-50/80 rounded-xl transition-colors"><Trash2 size={16} /></button>
                </>
            )}
        />
    );
};

export default MasterTipeKegiatan;
