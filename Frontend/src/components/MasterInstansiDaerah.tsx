import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../services/api';
import { Plus, Edit2, Trash2, X, Check, Loader2 } from 'lucide-react';
import { useLabels } from '../contexts/LabelContext';
import { BaseDataTable } from './common/BaseDataTable';

interface InstansiItem {
    id: number;
    instansi: string;
    singkatan: string;
    kelas_instansi?: string;
    kelompok_instansi?: string;
}

const emptyForm = { instansi: '', singkatan: '', kelas_instansi: '', kelompok_instansi: '' };

const MasterInstansiDaerah = () => {
    const { getLabel } = useLabels();
    const [data, setData] = useState<InstansiItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isAdding, setIsAdding] = useState(false);
    const [newForm, setNewForm] = useState({ ...emptyForm });
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editForm, setEditForm] = useState({ ...emptyForm });

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await api.instansiDaerah.getAll();
            if (res.success) setData(res.data);
            else setError(res.message);
        } catch { setError('Gagal mengambil data'); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchData(); }, []);

    const handleAdd = async () => {
        if (!newForm.instansi.trim()) return;
        try {
            const res = await api.instansiDaerah.create(newForm);
            if (res.success) { setNewForm({ ...emptyForm }); setIsAdding(false); fetchData(); }
        } catch { alert('Gagal menambah data'); }
    };

    const handleUpdate = async (id: number) => {
        if (!editForm.instansi.trim()) return;
        try {
            const res = await api.instansiDaerah.update(id, editForm);
            if (res.success) { setEditingId(null); fetchData(); }
        } catch { alert('Gagal mengubah data'); }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Hapus data ini?')) return;
        try {
            const res = await api.instansiDaerah.delete(id);
            if (res.success) fetchData();
        } catch { alert('Gagal menghapus data'); }
    };

    const columns = [
        {
            header: getLabel('master_instansi_daerah', 'instansi', 'Instansi'),
            key: 'instansi',
            className: 'font-semibold text-slate-800 tracking-tight text-sm'
        },
        {
            header: getLabel('master_instansi_daerah', 'singkatan', 'Singkatan'),
            key: 'singkatan',
            className: 'font-medium text-slate-600 text-sm',
            width: '128px'
        },
        {
            header: 'Kelas',
            key: 'kelas_instansi',
            className: 'font-medium text-slate-600 text-sm italic',
            width: '96px'
        },
        {
            header: 'Kelompok',
            key: 'kelompok_instansi',
            width: '128px',
            render: (item: InstansiItem) => (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${item.kelompok_instansi?.toLowerCase() === 'tapd' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                    {item.kelompok_instansi || '-'}
                </span>
            )
        }
    ];

    return (
        <BaseDataTable<InstansiItem>
            title="Master Instansi Daerah"
            subtitle="Kelola daftar instansi dan perangkat daerah."
            data={data}
            columns={columns}
            loading={loading}
            error={error}
            searchPlaceholder="Cari instansi..."
            addButtonLabel="Tambah Instansi"
            onAddClick={() => setIsAdding(true)}
            editingId={editingId}
            searchKey={(item) => `${item.instansi} ${item.singkatan || ''} ${item.kelas_instansi || ''} ${item.kelompok_instansi || ''}`}
            renderAddRow={() => isAdding && (
                <tr className="bg-blue-50">
                    <td className="p-4 border-b border-slate-50 text-slate-400 text-center">NEW</td>
                    <td className="p-2 border-b border-slate-100">
                        <input autoFocus type="text" className="input-modern" placeholder="Nama instansi..." value={newForm.instansi} onChange={e => setNewForm({ ...newForm, instansi: e.target.value })} onKeyPress={e => e.key === 'Enter' && handleAdd()} />
                    </td>
                    <td className="p-2 border-b border-slate-100">
                        <input type="text" className="input-modern" placeholder="Singkatan..." value={newForm.singkatan} onChange={e => setNewForm({ ...newForm, singkatan: e.target.value })} onKeyPress={e => e.key === 'Enter' && handleAdd()} />
                    </td>
                    <td className="p-2 border-b border-slate-100">
                        <input type="text" className="input-modern" placeholder="Kelas..." value={newForm.kelas_instansi} onChange={e => setNewForm({ ...newForm, kelas_instansi: e.target.value })} onKeyPress={e => e.key === 'Enter' && handleAdd()} />
                    </td>
                    <td className="p-2 border-b border-slate-100">
                        <input type="text" className="input-modern" placeholder="Kelompok..." value={newForm.kelompok_instansi} onChange={e => setNewForm({ ...newForm, kelompok_instansi: e.target.value })} onKeyPress={e => e.key === 'Enter' && handleAdd()} />
                    </td>
                    <td className="p-2 border-b border-slate-100">
                        <div className="flex justify-center gap-2">
                            <button onClick={handleAdd} className="text-slate-400 hover:text-emerald-600 p-1.5 hover:bg-emerald-50 rounded-full"><Check size={18} /></button>
                            <button onClick={() => setIsAdding(false)} className="text-slate-400 hover:text-rose-600 p-1.5 hover:bg-rose-50 rounded-full"><X size={18} /></button>
                        </div>
                    </td>
                </tr>
            )}
            renderEditRow={(item) => (
                <tr key={item.id} className="bg-indigo-50/30">
                    <td className="p-4 border-b border-slate-50 font-mono text-xs text-slate-500 text-center">{item.id}</td>
                    <td className="p-2 border-b border-slate-100">
                        <input autoFocus type="text" className="input-modern" value={editForm.instansi} onChange={e => setEditForm({ ...editForm, instansi: e.target.value })} onKeyPress={e => e.key === 'Enter' && handleUpdate(Number(item.id))} />
                    </td>
                    <td className="p-2 border-b border-slate-100">
                        <input type="text" className="input-modern" value={editForm.singkatan} onChange={e => setEditForm({ ...editForm, singkatan: e.target.value })} onKeyPress={e => e.key === 'Enter' && handleUpdate(Number(item.id))} />
                    </td>
                    <td className="p-2 border-b border-slate-100">
                        <input type="text" className="input-modern" value={editForm.kelas_instansi} onChange={e => setEditForm({ ...editForm, kelas_instansi: e.target.value })} onKeyPress={e => e.key === 'Enter' && handleUpdate(Number(item.id))} />
                    </td>
                    <td className="p-2 border-b border-slate-100">
                        <input type="text" className="input-modern" value={editForm.kelompok_instansi} onChange={e => setEditForm({ ...editForm, kelompok_instansi: e.target.value })} onKeyPress={e => e.key === 'Enter' && handleUpdate(Number(item.id))} />
                    </td>
                    <td className="p-2 border-b border-slate-100">
                        <div className="flex justify-center gap-2">
                            <button onClick={() => handleUpdate(Number(item.id))} className="text-slate-400 hover:text-emerald-600 p-1.5 hover:bg-emerald-50 rounded-full"><Check size={18} /></button>
                            <button onClick={() => setEditingId(null)} className="text-slate-400 hover:text-rose-600 p-1.5 hover:bg-rose-50 rounded-full"><X size={18} /></button>
                        </div>
                    </td>
                </tr>
            )}
            renderActions={(item) => (
                <>
                    <button onClick={() => { setEditingId(Number(item.id)); setEditForm({ instansi: item.instansi, singkatan: item.singkatan || '', kelas_instansi: item.kelas_instansi || '', kelompok_instansi: item.kelompok_instansi || '' }); }} className="text-slate-400 hover:text-indigo-600 p-2 hover:bg-indigo-50/80 rounded-xl transition-colors"><Edit2 size={16} /></button>
                    <button onClick={() => handleDelete(Number(item.id))} className="text-slate-400 hover:text-rose-600 p-2 hover:bg-rose-50/80 rounded-xl transition-colors"><Trash2 size={16} /></button>
                </>
            )}
        />
    );
};

export default MasterInstansiDaerah;

