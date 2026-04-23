import React, { useState, useEffect } from 'react';
import { api } from '@/src/services/api';
import { Plus, Edit2, Trash2, X, Check, Loader2 } from 'lucide-react';
import { useLabels } from '@/src/contexts/LabelContext';
import { BaseDataTable } from '@/src/features/common/components/BaseDataTable';

interface JenisPegawaiItem {
    id: number;
    nama: string;
    status_administrasi_id: number | null;
    administrasi_pegawai: string | null;
}

interface StatusAdministrasiItem {
    id: number;
    administrasi_pegawai: string;
}

const MasterJenisPegawai = () => {
    const { getLabel } = useLabels();
    const [data, setData] = useState<JenisPegawaiItem[]>([]);
    const [statusAdminList, setStatusAdminList] = useState<StatusAdministrasiItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isAdding, setIsAdding] = useState(false);
    const [newNama, setNewNama] = useState('');
    const [newStatusAdminId, setNewStatusAdminId] = useState<number | null>(null);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editNama, setEditNama] = useState('');
    const [editStatusAdminId, setEditStatusAdminId] = useState<number | null>(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [res, typeRes] = await Promise.all([
                api.jenisPegawai.getAll(),
                api.statusAdministrasiPegawai.getAll()
            ]);
            if (res.success) setData(res.data);
            else setError(res.message);

            if (typeRes.success) setStatusAdminList(typeRes.data);
        } catch { setError('Gagal mengambil data'); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchData(); }, []);

    const handleAdd = async () => {
        if (!newNama.trim()) return;
        try {
            const res = await api.jenisPegawai.create(newNama, newStatusAdminId);
            if (res.success) { setNewNama(''); setNewStatusAdminId(null); setIsAdding(false); fetchData(); }
        } catch { alert('Gagal menambah data'); }
    };

    const handleUpdate = async (id: number) => {
        if (!editNama.trim()) return;
        try {
            const res = await api.jenisPegawai.update(id, editNama, editStatusAdminId);
            if (res.success) { setEditingId(null); fetchData(); }
        } catch { alert('Gagal mengubah data'); }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Hapus data ini?')) return;
        try {
            const res = await api.jenisPegawai.delete(id);
            if (res.success) fetchData();
        } catch { alert('Gagal menghapus data'); }
    };

    const columns = [
        {
            header: getLabel('master_jenis_pegawai', 'nama', 'Nama Jenis Pegawai'),
            key: 'nama',
            className: 'font-semibold text-slate-800 tracking-tight text-sm'
        },
        {
            header: getLabel('master_jenis_pegawai', 'status_administrasi_id', 'Status Administrasi'),
            key: 'administrasi_pegawai',
            className: 'text-sm text-slate-500'
        }
    ];

    return (
        <BaseDataTable<JenisPegawaiItem>
            title="Master Data Jenis Pegawai"
            subtitle="Kelola kategori kepegawaian dalam instansi."
            data={data}
            columns={columns}
            loading={loading}
            error={error}
            searchPlaceholder="Cari jenis pegawai..."
            addButtonLabel="Tambah Jenis"
            onAddClick={() => setIsAdding(true)}
            editingId={editingId}
            renderAddRow={() => isAdding && (
                <tr className="bg-blue-50">
                    <td className="p-4 border-b border-slate-50 text-slate-400 text-center">NEW</td>
                    <td className="p-2 border-b border-slate-100">
                        <input autoFocus type="text" className="input-modern" placeholder="Masukkan jenis pegawai..." value={newNama} onChange={e => setNewNama(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleAdd()} />
                    </td>
                    <td className="p-2 border-b border-slate-100">
                        <select
                            className="input-modern bg-white text-sm"
                            value={newStatusAdminId || ''}
                            onChange={(e) => setNewStatusAdminId(e.target.value ? Number(e.target.value) : null)}
                        >
                            <option value="">-- Pilih Status Administrasi --</option>
                            {statusAdminList.map(s => (
                                <option key={s.id} value={s.id}>{s.administrasi_pegawai}</option>
                            ))}
                        </select>
                    </td>
                    <td className="p-2 border-b border-slate-100">
                        <div className="flex justify-center gap-2">
                            <button onClick={handleAdd} className="text-slate-400 hover:text-emerald-600 p-1.5 hover:bg-emerald-50 rounded-full"><Check size={18} /></button>
                            <button onClick={() => { setIsAdding(false); setNewStatusAdminId(null); }} className="text-slate-400 hover:text-rose-600 p-1.5 hover:bg-rose-50 rounded-full"><X size={18} /></button>
                        </div>
                    </td>
                </tr>
            )}
            renderEditRow={(item) => (
                <tr key={item.id} className="bg-indigo-50/30">
                    <td className="p-4 border-b border-slate-50 font-mono text-xs text-slate-500 text-center">{item.id}</td>
                    <td className="p-2 border-b border-slate-100">
                        <input autoFocus type="text" className="input-modern" value={editNama} onChange={e => setEditNama(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleUpdate(Number(item.id))} />
                    </td>
                    <td className="p-2 border-b border-slate-100">
                        <select
                            className="input-modern bg-white text-sm"
                            value={editStatusAdminId || ''}
                            onChange={(e) => setEditStatusAdminId(e.target.value ? Number(e.target.value) : null)}
                        >
                            <option value="">-- Pilih Status Administrasi --</option>
                            {statusAdminList.map(s => (
                                <option key={s.id} value={s.id}>{s.administrasi_pegawai}</option>
                            ))}
                        </select>
                    </td>
                    <td className="p-2 border-b border-slate-100">
                        <div className="flex justify-center gap-2">
                            <button onClick={() => handleUpdate(Number(item.id))} className="text-slate-400 hover:text-emerald-600 p-1.5 hover:bg-emerald-50 rounded-full"><Check size={18} /></button>
                            <button onClick={() => { setEditingId(null); setEditStatusAdminId(null); }} className="text-slate-400 hover:text-rose-600 p-1.5 hover:bg-rose-50 rounded-full"><X size={18} /></button>
                        </div>
                    </td>
                </tr>
            )}
            renderActions={(item) => (
                <>
                    <button onClick={() => { setEditingId(Number(item.id)); setEditNama(item.nama); setEditStatusAdminId(item.status_administrasi_id); }} className="text-slate-400 hover:text-indigo-600 p-2 hover:bg-indigo-50/80 rounded-xl transition-colors"><Edit2 size={16} /></button>
                    <button onClick={() => handleDelete(Number(item.id))} className="text-slate-400 hover:text-rose-600 p-2 hover:bg-rose-50/80 rounded-xl transition-colors"><Trash2 size={16} /></button>
                </>
            )}
        />
    );
};

export default MasterJenisPegawai;

