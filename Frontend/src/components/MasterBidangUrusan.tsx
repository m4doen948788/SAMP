import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Plus, Edit2, Trash2, X, Check, Loader2 } from 'lucide-react';
import { useLabels } from '../contexts/LabelContext';
import { BaseDataTable } from './common/BaseDataTable';

interface UrusanItem {
    id: number;
    urusan: string;
    kode_urusan: string;
    parent_id?: number | null;
}

const MasterBidangUrusan = () => {
    const { getLabel } = useLabels();
    const [data, setData] = useState<UrusanItem[]>([]);
    const [urusans, setUrusans] = useState<{ id: number, urusan: string }[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isAdding, setIsAdding] = useState(false);
    const [newUrusan, setNewUrusan] = useState('');
    const [newKodeUrusan, setNewKodeUrusan] = useState('');
    const [newParentId, setNewParentId] = useState<number | ''>('');
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editUrusan, setEditUrusan] = useState('');
    const [editKodeUrusan, setEditKodeUrusan] = useState('');
    const [editParentId, setEditParentId] = useState<number | ''>('');

    const fetchData = async () => {
        setLoading(true);
        try {
            const [res, urusanRes] = await Promise.all([
                api.bidangUrusan.getAll(),
                api.masterDataConfig.getDataByTable('master_urusan')
            ]);
            
            if (res.success) setData(res.data);
            else setError(res.message);

            if (urusanRes.success) setUrusans(urusanRes.data);
            
        } catch { setError('Gagal mengambil data'); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchData(); }, []);

    const handleAdd = async () => {
        if (!newUrusan.trim()) return;
        try {
            const parent = newParentId === '' ? null : newParentId;
            const res = await api.bidangUrusan.create(newUrusan, newKodeUrusan, parent);
            if (res.success) { 
                setNewUrusan(''); 
                setNewKodeUrusan(''); 
                setNewParentId('');
                setIsAdding(false); 
                fetchData(); 
            }
        } catch { alert('Gagal menambah data'); }
    };

    const handleUpdate = async (id: number) => {
        if (!editUrusan.trim()) return;
        try {
            const parent = editParentId === '' ? null : editParentId;
            const res = await api.bidangUrusan.update(id, editUrusan, editKodeUrusan, parent);
            if (res.success) { setEditingId(null); fetchData(); }
        } catch { alert('Gagal mengubah data'); }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Hapus data ini?')) return;
        try {
            const res = await api.bidangUrusan.delete(id);
            if (res.success) fetchData();
        } catch { alert('Gagal menghapus data'); }
    };

    const columns = [
        {
            header: getLabel('master_bidang_urusan', 'parent_id', 'Urusan Induk'),
            key: 'parent_id',
            className: 'font-medium text-slate-600 w-1/3',
            render: (item: UrusanItem) => {
                const parent = urusans.find(u => u.id === item.parent_id);
                return parent ? parent.urusan : '-';
            }
        },
        {
            header: getLabel('master_bidang_urusan', 'kode_urusan', 'Kode'),
            key: 'kode_urusan',
            className: 'font-mono text-xs text-slate-500 w-24'
        },
        {
            header: getLabel('master_bidang_urusan', 'urusan', 'Bidang Urusan'),
            key: 'urusan',
            className: 'font-semibold text-slate-800 tracking-tight text-sm'
        }
    ];

    return (
        <BaseDataTable<UrusanItem>
            title="Master Data Bidang Urusan"
            subtitle="Klasifikasi bidang urusan pemerintahan daerah."
            data={data}
            columns={columns}
            loading={loading}
            error={error}
            searchPlaceholder="Cari bidang urusan..."
            addButtonLabel="Tambah Bidang Urusan"
            onAddClick={() => setIsAdding(true)}
            editingId={editingId}
            renderAddRow={() => isAdding && (
                <tr className="bg-blue-50">
                    <td className="p-4 border-b border-slate-50 text-slate-400 text-center">NEW</td>
                    <td className="p-2 border-b border-slate-100">
                        <select autoFocus className="input-modern" value={newParentId} onChange={e => setNewParentId(Number(e.target.value) || '')}>
                            <option value="">Pilih Urusan Induk...</option>
                            {urusans.map(u => <option key={u.id} value={u.id}>{u.urusan}</option>)}
                        </select>
                    </td>
                    <td className="p-2 border-b border-slate-100">
                        <input type="text" className="input-modern" placeholder="Kode..." value={newKodeUrusan} onChange={e => setNewKodeUrusan(e.target.value)} />
                    </td>
                    <td className="p-2 border-b border-slate-100">
                        <input type="text" className="input-modern" placeholder="Masukkan bidang urusan..." value={newUrusan} onChange={e => setNewUrusan(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleAdd()} />
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
                        <select autoFocus className="input-modern" value={editParentId} onChange={e => setEditParentId(Number(e.target.value) || '')}>
                            <option value="">Pilih Urusan Induk...</option>
                            {urusans.map(u => <option key={u.id} value={u.id}>{u.urusan}</option>)}
                        </select>
                    </td>
                    <td className="p-2 border-b border-slate-100">
                        <input type="text" className="input-modern" value={editKodeUrusan} onChange={e => setEditKodeUrusan(e.target.value)} />
                    </td>
                    <td className="p-2 border-b border-slate-100">
                        <input type="text" className="input-modern" value={editUrusan} onChange={e => setEditUrusan(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleUpdate(Number(item.id))} />
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
                    <button onClick={() => { setEditingId(Number(item.id)); setEditUrusan(item.urusan); setEditKodeUrusan(item.kode_urusan || ''); setEditParentId(item.parent_id || ''); }} className="text-slate-400 hover:text-indigo-600 p-2 hover:bg-indigo-50/80 rounded-xl transition-colors"><Edit2 size={16} /></button>
                    <button onClick={() => handleDelete(Number(item.id))} className="text-slate-400 hover:text-rose-600 p-2 hover:bg-rose-50/80 rounded-xl transition-colors"><Trash2 size={16} /></button>
                </>
            )}
        />
    );
};

export default MasterBidangUrusan;
