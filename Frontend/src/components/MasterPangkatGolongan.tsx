import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Plus, Edit2, Trash2, X, Check, Loader2, RefreshCw } from 'lucide-react';
import { useLabels } from '../contexts/LabelContext';
import { BaseDataTable } from './common/BaseDataTable';

interface PangkatGolonganItem {
    id: number;
    pangkat_golongan: string;
}

const MasterPangkatGolongan = () => {
    const { getLabel } = useLabels();
    const [data, setData] = useState<PangkatGolonganItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isAdding, setIsAdding] = useState(false);
    const [newVal, setNewVal] = useState('');
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editVal, setEditVal] = useState('');

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await api.pangkatGolongan.getAll();
            if (res.success) setData(res.data);
            else setError(res.message);
        } catch { setError('Gagal mengambil data'); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchData(); }, []);

    const handleAdd = async () => {
        if (!newVal.trim()) return;
        try {
            const res = await api.pangkatGolongan.create(newVal);
            if (res.success) { setNewVal(''); setIsAdding(false); fetchData(); }
        } catch { alert('Gagal menambah data'); }
    };

    const handleUpdate = async (id: number) => {
        if (!editVal.trim()) return;
        try {
            const res = await api.pangkatGolongan.update(id, editVal);
            if (res.success) { setEditingId(null); fetchData(); }
        } catch { alert('Gagal mengubah data'); }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Hapus data ini?')) return;
        try {
            const res = await api.pangkatGolongan.delete(id);
            if (res.success) fetchData();
        } catch { alert('Gagal menghapus data'); }
    };

    const handleSync = async () => {
        if (!confirm('Lakukan sinkronisasi data pangkat/golongan dengan standar nasional?')) return;
        setSyncing(true);
        try {
            const res = await api.pangkatGolongan.sync();
            if (res.success) {
                alert(res.message);
                fetchData();
            } else {
                alert(res.message || 'Gagal sinkronisasi');
            }
        } catch {
            alert('Gagal melakukan sinkronisasi');
        } finally {
            setSyncing(false);
        }
    };

    const columns = [
        {
            header: getLabel('master_pangkat_golongan', 'pangkat_golongan', 'Pangkat / Golongan'),
            key: 'pangkat_golongan',
            className: 'font-semibold text-slate-800 tracking-tight text-sm'
        }
    ];

    const HeaderButtons = () => (
        <div className="flex gap-2">
            <button
                onClick={handleSync}
                disabled={syncing}
                className={`btn-secondary flex items-center gap-2 ${syncing ? 'opacity-50' : ''}`}
            >
                {syncing ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                Sync Data
            </button>
            <button onClick={() => setIsAdding(true)} className="btn-primary flex items-center gap-2">
                <Plus size={16} /> Tambah Data
            </button>
        </div>
    );

    return (
        <BaseDataTable<PangkatGolonganItem>
            title="Master Pangkat / Golongan"
            subtitle="Daftar jenjang pangkat dan golongan kepegawaian."
            data={data}
            columns={columns}
            loading={loading}
            error={error}
            searchPlaceholder="Cari pangkat/golongan..."
            addButtonLabel="Tambah Data"
            renderHeaderButtons={<HeaderButtons />}
            editingId={editingId}
            renderAddRow={() => isAdding && (
                <tr className="bg-blue-50">
                    <td className="p-4 border-b border-slate-50 text-slate-400 text-center">NEW</td>
                    <td className="p-2 border-b border-slate-100">
                        <input autoFocus type="text" className="input-modern" placeholder="Masukkan pangkat/golongan..." value={newVal} onChange={e => setNewVal(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleAdd()} />
                    </td>
                    <td className="p-2 border-b border-slate-100">
                        <div className="flex justify-center gap-2">
                            <button onClick={handleAdd} className="text-slate-400 hover:text-emerald-600 p-1.5 hover:bg-emerald-50 rounded-full"><Check size={18} /></button>
                            <button onClick={() => { setIsAdding(false); }} className="text-slate-400 hover:text-rose-600 p-1.5 hover:bg-rose-50 rounded-full"><X size={18} /></button>
                        </div>
                    </td>
                </tr>
            )}
            renderEditRow={(item) => (
                <tr key={item.id} className="bg-indigo-50/30">
                    <td className="p-4 border-b border-slate-50 font-mono text-xs text-slate-500 text-center">{item.id}</td>
                    <td className="p-2 border-b border-slate-100">
                        <input autoFocus type="text" className="input-modern" value={editVal} onChange={e => setEditVal(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleUpdate(Number(item.id))} />
                    </td>
                    <td className="p-2 border-b border-slate-100">
                        <div className="flex justify-center gap-2">
                            <button onClick={() => handleUpdate(Number(item.id))} className="text-slate-400 hover:text-emerald-600 p-1.5 hover:bg-emerald-50 rounded-full"><Check size={18} /></button>
                            <button onClick={() => { setEditingId(null); }} className="text-slate-400 hover:text-rose-600 p-1.5 hover:bg-rose-50 rounded-full"><X size={18} /></button>
                        </div>
                    </td>
                </tr>
            )}
            renderActions={(item) => (
                <>
                    <button onClick={() => { setEditingId(Number(item.id)); setEditVal(item.pangkat_golongan); }} className="text-slate-400 hover:text-indigo-600 p-2 hover:bg-indigo-50/80 rounded-xl transition-colors"><Edit2 size={16} /></button>
                    <button onClick={() => handleDelete(Number(item.id))} className="text-slate-400 hover:text-rose-600 p-2 hover:bg-rose-50/80 rounded-xl transition-colors"><Trash2 size={16} /></button>
                </>
            )}
        />
    );
};

export default MasterPangkatGolongan;
