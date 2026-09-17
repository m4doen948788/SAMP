import React, { useState, useEffect, useMemo } from 'react';
import { api } from '@/src/services/api';
import { Plus, Edit2, Trash2, X, Check, Loader2 } from 'lucide-react';
import { useLabels } from '@/src/contexts/LabelContext';
import { useAuth } from '@/src/contexts/AuthContext';
import { BaseDataTable } from '@/src/features/common/components/BaseDataTable';
import { SearchableSelect } from '@/src/features/common/components/SearchableSelect';

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
}

const emptyForm = { nama_bidang: '', singkatan: '', instansi_id: null as number | null };

const MasterBidang = () => {
    const { getLabel } = useLabels();
    const { user } = useAuth();
    const isSuperAdmin = user?.tipe_user_id === 1;
    const userInstansiId = user?.instansi_id ?? null;

    const [data, setData] = useState<BidangItem[]>([]);
    const [instansiList, setInstansiList] = useState<Instansi[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isAdding, setIsAdding] = useState(false);
    const [newForm, setNewForm] = useState({ ...emptyForm });
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editForm, setEditForm] = useState({ ...emptyForm });

    const userInstansiSingkatan = useMemo(() => {
        if (!userInstansiId || instansiList.length === 0) return '';
        const inst = instansiList.find(i => i.id === userInstansiId);
        return inst?.singkatan || '';
    }, [userInstansiId, instansiList]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [bidangRes, instansiRes] = await Promise.all([
                api.bidang.getAll(),
                api.instansiDaerah.getAll()
            ]);
            if (bidangRes.success) setData(bidangRes.data);
            else setError(bidangRes.message);
            if (instansiRes.success) setInstansiList(instansiRes.data);
        } catch { setError('Gagal mengambil data'); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchData(); }, []);

    const filteredData = useMemo(() => {
        let result = data;
        if (!isSuperAdmin && userInstansiId) {
            result = result.filter(d => d.instansi_id === userInstansiId);
        }
        return result;
    }, [data, isSuperAdmin, userInstansiId]);

    const handleAdd = async () => {
        if (!newForm.nama_bidang.trim()) return;
        try {
            const payload = { ...newForm };
            if (!isSuperAdmin && userInstansiId) payload.instansi_id = userInstansiId;
            const res = await api.bidang.create(payload);
            if (res.success) { setNewForm({ ...emptyForm }); setIsAdding(false); fetchData(); }
        } catch { alert('Gagal menambah data'); }
    };

    const handleUpdate = async (id: number) => {
        if (!editForm.nama_bidang.trim()) return;
        try {
            const payload = { ...editForm };
            if (!isSuperAdmin && userInstansiId) payload.instansi_id = userInstansiId;
            const res = await api.bidang.update(id, payload);
            if (res.success) { setEditingId(null); fetchData(); }
        } catch { alert('Gagal mengubah data'); }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Hapus data ini?')) return;
        try {
            const res = await api.bidang.delete(id);
            if (res.success) fetchData();
        } catch { alert('Gagal menghapus data'); }
    };

    const renderInstansiSelect = (value: number | null, onChange: (val: number | null) => void) => (
        <SearchableSelect
            value={value}
            onChange={onChange}
            options={instansiList}
            label="Instansi"
            keyField="id"
            displayField="instansi"
            className="w-full min-w-[200px]"
        />
    );

    const columns = [
        {
            header: getLabel('master_bidang', 'nama_bidang', 'Nama Bidang'),
            key: 'nama_bidang',
            className: 'font-semibold text-slate-800 tracking-tight text-sm'
        },
        {
            header: getLabel('master_bidang', 'singkatan', 'Singkatan'),
            key: 'singkatan',
            className: 'font-medium text-slate-600 text-sm'
        },
        ...(isSuperAdmin ? [{
            header: 'Instansi',
            key: 'nama_instansi',
            className: 'font-medium text-slate-600 text-sm'
        }] : [])
    ];

    return (
        <BaseDataTable<BidangItem>
            title="Master Data Bidang"
            subtitle="Kelola data bidang organisasi."
            data={filteredData}
            columns={columns}
            loading={loading}
            error={error}
            searchPlaceholder="Cari bidang..."
            addButtonLabel="Tambah Bidang"
            onAddClick={() => setIsAdding(true)}
            editingId={editingId}
            searchKey={(item) => `${item.nama_bidang} ${item.singkatan || ''} ${item.nama_instansi || ''}`}
            renderAddRow={() => isAdding && (
                <tr className="bg-blue-50">
                    <td className="p-4 border-b border-slate-50 text-slate-400 text-center">NEW</td>
                    <td className="p-2 border-b border-slate-100">
                        <input autoFocus type="text" className="input-modern" placeholder="Nama bidang..." value={newForm.nama_bidang} onChange={e => setNewForm({ ...newForm, nama_bidang: e.target.value })} onKeyPress={e => e.key === 'Enter' && handleAdd()} />
                    </td>
                    <td className="p-2 border-b border-slate-100">
                        <input type="text" className="input-modern" placeholder="Singkatan..." value={newForm.singkatan} onChange={e => setNewForm({ ...newForm, singkatan: e.target.value })} onKeyPress={e => e.key === 'Enter' && handleAdd()} />
                    </td>
                    {isSuperAdmin && (
                        <td className="p-2 border-b border-slate-100">
                            {renderInstansiSelect(newForm.instansi_id, val => setNewForm({ ...newForm, instansi_id: val }))}
                        </td>
                    )}
                    <td className="p-2 border-b border-slate-100">
                        <div className="flex justify-center gap-2">
                            <button onClick={handleAdd} className="text-slate-400 hover:text-emerald-600 p-1.5 hover:bg-emerald-50 rounded-full"><Check size={18} /></button>
                            <button onClick={() => { setIsAdding(false); setNewForm({ ...emptyForm }); }} className="text-slate-400 hover:text-rose-600 p-1.5 hover:bg-rose-50 rounded-full"><X size={18} /></button>
                        </div>
                    </td>
                </tr>
            )}
            renderEditRow={(item) => (
                <tr key={item.id} className="bg-indigo-50/30">
                    <td className="p-4 border-b border-slate-50 font-mono text-xs text-slate-500 text-center">{item.id}</td>
                    <td className="p-2 border-b border-slate-100">
                        <input autoFocus type="text" className="input-modern" value={editForm.nama_bidang} onChange={e => setEditForm({ ...editForm, nama_bidang: e.target.value })} onKeyPress={e => e.key === 'Enter' && handleUpdate(Number(item.id))} />
                    </td>
                    <td className="p-2 border-b border-slate-100">
                        <input type="text" className="input-modern" value={editForm.singkatan} onChange={e => setEditForm({ ...editForm, singkatan: e.target.value })} onKeyPress={e => e.key === 'Enter' && handleUpdate(Number(item.id))} />
                    </td>
                    {isSuperAdmin && (
                        <td className="p-2 border-b border-slate-100">
                            {renderInstansiSelect(editForm.instansi_id, val => setEditForm({ ...editForm, instansi_id: val }))}
                        </td>
                    )}
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
                    <button onClick={() => { setEditingId(Number(item.id)); setEditForm({ nama_bidang: item.nama_bidang, singkatan: item.singkatan || '', instansi_id: item.instansi_id }); }} className="text-slate-400 hover:text-indigo-600 p-2 hover:bg-indigo-50/80 rounded-xl transition-colors"><Edit2 size={16} /></button>
                    <button onClick={() => handleDelete(Number(item.id))} className="text-slate-400 hover:text-rose-600 p-2 hover:bg-rose-50/80 rounded-xl transition-colors"><Trash2 size={16} /></button>
                </>
            )}
        />
    );
};

export default MasterBidang;

