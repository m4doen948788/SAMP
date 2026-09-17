import React, { useState, useEffect } from 'react';
import { api } from '@/src/services/api';
import { Edit2, Trash2, X, Check, Link2, Plus } from 'lucide-react';
import { useLabels } from '@/src/contexts/LabelContext';
import { BaseDataTable } from '@/src/features/common/components/BaseDataTable';

interface TipeLinkItem {
  id: number;
  jenis_link: string;
  nama?: string;
}

const emptyForm = { jenis_link: '' };

const MasterTipeLink = () => {
  const { getLabel } = useLabels();
  const [data, setData] = useState<TipeLinkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [newForm, setNewForm] = useState({ ...emptyForm });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ ...emptyForm });

  const fetchData = async () => {
    setLoading(true);
    try {
      let resultData: TipeLinkItem[] = [];
      
      // Primary API
      try {
        const res = await api.tipeLink.getAll();
        if (res && res.success && Array.isArray(res.data)) {
          resultData = res.data.map((item: any) => ({
            id: item.id,
            jenis_link: item.jenis_link || item.nama || ''
          }));
        }
      } catch { /* fallback next */ }

      // Fallback API via masterDataConfig if empty
      if (resultData.length === 0) {
        try {
          const resConfig = await api.masterDataConfig.getDataByTable('master_link');
          if (resConfig && resConfig.success && Array.isArray(resConfig.data)) {
            resultData = resConfig.data.map((item: any) => ({
              id: item.id,
              jenis_link: item.jenis_link || item.nama || ''
            }));
          }
        } catch { /* ignored */ }
      }

      setData(resultData);
    } catch {
      setError('Gagal mengambil data Master Tipe Link');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleAdd = async () => {
    if (!newForm.jenis_link.trim()) return;
    try {
      let res = await api.tipeLink.create(newForm.jenis_link);
      if (!res || !res.success) {
        // Fallback create via masterDataConfig
        res = await api.masterDataConfig.createDataByTable('master_link', { jenis_link: newForm.jenis_link.trim() });
      }
      if (res && res.success) {
        setNewForm({ ...emptyForm });
        setIsAdding(false);
        fetchData();
      } else {
        alert(res?.message || 'Gagal menambah data');
      }
    } catch {
      alert('Gagal menambah data');
    }
  };

  const handleUpdate = async (id: number) => {
    if (!editForm.jenis_link.trim()) return;
    try {
      let res = await api.tipeLink.update(id, editForm.jenis_link);
      if (!res || !res.success) {
        // Fallback update via masterDataConfig
        res = await api.masterDataConfig.updateDataByTable('master_link', id, { jenis_link: editForm.jenis_link.trim() });
      }
      if (res && res.success) {
        setEditingId(null);
        fetchData();
      } else {
        alert(res?.message || 'Gagal mengubah data');
      }
    } catch {
      alert('Gagal mengubah data');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Hapus data Tipe Link ini?')) return;
    try {
      let res = await api.tipeLink.delete(id);
      if (!res || !res.success) {
        res = await api.masterDataConfig.deleteDataByTable('master_link', id);
      }
      if (res && res.success) {
        fetchData();
      } else {
        alert(res?.message || 'Gagal menghapus data');
      }
    } catch {
      alert('Gagal menghapus data');
    }
  };

  const columns = [
    {
      header: getLabel('master_link', 'jenis_link', 'Nama Tipe Link'),
      key: 'jenis_link',
      render: (item: TipeLinkItem) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <Link2 size={16} />
          </div>
          <span className="font-semibold text-slate-800 tracking-tight text-sm">
            {item.jenis_link}
          </span>
        </div>
      )
    }
  ];

  return (
    <BaseDataTable<TipeLinkItem>
      title="Master Tipe Link"
      subtitle="Kelola kategori/tipe link yang digunakan pada Master Link Eksternal."
      data={data}
      columns={columns}
      loading={loading}
      error={error}
      searchPlaceholder="Cari tipe link..."
      addButtonLabel="Tambah Tipe Link"
      onAddClick={() => setIsAdding(true)}
      editingId={editingId}
      searchKey={(item) => `${item.jenis_link || ''}`}
      renderAddRow={() => isAdding && (
        <tr className="bg-blue-50/80">
          <td className="p-4 border-b border-slate-100 text-slate-400 text-center font-mono text-xs">NEW</td>
          <td className="p-2 border-b border-slate-100">
            <input 
              autoFocus 
              type="text" 
              className="input-modern" 
              placeholder="Masukkan nama tipe link (cth: Link Aplikasi, Link Bahan)..." 
              value={newForm.jenis_link} 
              onChange={e => setNewForm({ ...newForm, jenis_link: e.target.value })} 
              onKeyPress={e => e.key === 'Enter' && handleAdd()} 
            />
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
          <td className="p-4 border-b border-slate-100 font-mono text-xs text-slate-500 text-center">{item.id}</td>
          <td className="p-2 border-b border-slate-100">
            <input 
              autoFocus 
              type="text" 
              className="input-modern" 
              value={editForm.jenis_link} 
              onChange={e => setEditForm({ ...editForm, jenis_link: e.target.value })} 
              onKeyPress={e => e.key === 'Enter' && handleUpdate(Number(item.id))} 
            />
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
          <button 
            onClick={() => { 
              setEditingId(Number(item.id)); 
              setEditForm({ jenis_link: item.jenis_link }); 
            }} 
            className="text-slate-400 hover:text-indigo-600 p-2 hover:bg-indigo-50/80 rounded-xl transition-colors"
          >
            <Edit2 size={16} />
          </button>
          <button onClick={() => handleDelete(Number(item.id))} className="text-slate-400 hover:text-rose-600 p-2 hover:bg-rose-50/80 rounded-xl transition-colors"><Trash2 size={16} /></button>
        </>
      )}
    />
  );
};

export default MasterTipeLink;
