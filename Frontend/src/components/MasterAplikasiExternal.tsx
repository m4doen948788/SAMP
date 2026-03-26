import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../services/api';
import { Plus, Edit2, Trash2, X, Check, Loader2, ExternalLink } from 'lucide-react';
import { useLabels } from '../contexts/LabelContext';
import { BaseDataTable } from './common/BaseDataTable';

interface AplikasiItem {
  id: number;
  nama_aplikasi: string;
  url: string;
  pembuat: string;
  asal_instansi: string;
}

const emptyForm = { nama_aplikasi: '', url: '', pembuat: '', asal_instansi: '' };

const MasterAplikasiExternal = () => {
  const { getLabel } = useLabels();
  const [data, setData] = useState<AplikasiItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [newForm, setNewForm] = useState({ ...emptyForm });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ ...emptyForm });

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.aplikasiExternal.getAll();
      if (res.success) setData(res.data);
      else setError(res.message);
    } catch { setError('Gagal mengambil data'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleAdd = async () => {
    if (!newForm.nama_aplikasi.trim() || !newForm.url.trim()) return;
    try {
      const res = await api.aplikasiExternal.create(newForm);
      if (res.success) { setNewForm({ ...emptyForm }); setIsAdding(false); fetchData(); }
    } catch { alert('Gagal menambah data'); }
  };

  const handleUpdate = async (id: number) => {
    if (!editForm.nama_aplikasi.trim() || !editForm.url.trim()) return;
    try {
      const res = await api.aplikasiExternal.update(id, editForm);
      if (res.success) { setEditingId(null); fetchData(); }
    } catch { alert('Gagal mengubah data'); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Hapus data ini?')) return;
    try {
      const res = await api.aplikasiExternal.delete(id);
      if (res.success) fetchData();
    } catch { alert('Gagal menghapus data'); }
  };

  const columns = [
    {
      header: getLabel('master_aplikasi_external', 'nama_aplikasi', 'Nama Aplikasi'),
      key: 'nama_aplikasi',
      className: 'font-semibold text-slate-800 tracking-tight text-sm'
    },
    {
      header: getLabel('master_aplikasi_external', 'url', 'URL'),
      key: 'url',
      render: (item: AplikasiItem) => (
        <div className="flex items-center gap-2 group/link">
          <span className="text-slate-600 truncate max-w-[150px]">{item.url}</span>
          <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 opacity-0 group-hover/link:opacity-100 transition-opacity"><ExternalLink size={14} /></a>
        </div>
      )
    },
    {
      header: getLabel('master_aplikasi_external', 'pembuat', 'Pembuat'),
      key: 'pembuat',
      className: 'font-medium text-slate-600 text-sm'
    },
    {
      header: getLabel('master_aplikasi_external', 'asal_instansi', 'Asal Instansi'),
      key: 'asal_instansi',
      className: 'font-medium text-slate-600 text-sm'
    }
  ];

  return (
    <BaseDataTable<AplikasiItem>
      title="Master Aplikasi External"
      subtitle="Kelola link aplikasi pihak ketiga."
      data={data}
      columns={columns}
      loading={loading}
      error={error}
      searchPlaceholder="Cari aplikasi..."
      addButtonLabel="Tambah Aplikasi"
      onAddClick={() => setIsAdding(true)}
      editingId={editingId}
      searchKey={(item) => `${item.nama_aplikasi} ${item.url} ${item.pembuat || ''} ${item.asal_instansi || ''}`}
      renderAddRow={() => isAdding && (
        <tr className="bg-blue-50">
          <td className="p-4 border-b border-slate-50 text-slate-400 text-center">NEW</td>
          <td className="p-2 border-b border-slate-100">
            <input autoFocus type="text" className="input-modern" placeholder="Nama aplikasi..." value={newForm.nama_aplikasi} onChange={e => setNewForm({ ...newForm, nama_aplikasi: e.target.value })} onKeyPress={e => e.key === 'Enter' && handleAdd()} />
          </td>
          <td className="p-2 border-b border-slate-100">
            <input type="text" className="input-modern" placeholder="https://..." value={newForm.url} onChange={e => setNewForm({ ...newForm, url: e.target.value })} onKeyPress={e => e.key === 'Enter' && handleAdd()} />
          </td>
          <td className="p-2 border-b border-slate-100">
            <input type="text" className="input-modern" placeholder="Pembuat..." value={newForm.pembuat} onChange={e => setNewForm({ ...newForm, pembuat: e.target.value })} onKeyPress={e => e.key === 'Enter' && handleAdd()} />
          </td>
          <td className="p-2 border-b border-slate-100">
            <input type="text" className="input-modern" placeholder="Instansi..." value={newForm.asal_instansi} onChange={e => setNewForm({ ...newForm, asal_instansi: e.target.value })} onKeyPress={e => e.key === 'Enter' && handleAdd()} />
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
            <input autoFocus type="text" className="input-modern" value={editForm.nama_aplikasi} onChange={e => setEditForm({ ...editForm, nama_aplikasi: e.target.value })} onKeyPress={e => e.key === 'Enter' && handleUpdate(Number(item.id))} />
          </td>
          <td className="p-2 border-b border-slate-100">
            <input type="text" className="input-modern" value={editForm.url} onChange={e => setEditForm({ ...editForm, url: e.target.value })} onKeyPress={e => e.key === 'Enter' && handleUpdate(Number(item.id))} />
          </td>
          <td className="p-2 border-b border-slate-100">
            <input type="text" className="input-modern" value={editForm.pembuat} onChange={e => setEditForm({ ...editForm, pembuat: e.target.value })} onKeyPress={e => e.key === 'Enter' && handleUpdate(Number(item.id))} />
          </td>
          <td className="p-2 border-b border-slate-100">
            <input type="text" className="input-modern" value={editForm.asal_instansi} onChange={e => setEditForm({ ...editForm, asal_instansi: e.target.value })} onKeyPress={e => e.key === 'Enter' && handleUpdate(Number(item.id))} />
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
          <button onClick={() => { setEditingId(Number(item.id)); setEditForm({ nama_aplikasi: item.nama_aplikasi, url: item.url, pembuat: item.pembuat || '', asal_instansi: item.asal_instansi || '' }); }} className="text-slate-400 hover:text-indigo-600 p-2 hover:bg-indigo-50/80 rounded-xl transition-colors"><Edit2 size={16} /></button>
          <button onClick={() => handleDelete(Number(item.id))} className="text-slate-400 hover:text-rose-600 p-2 hover:bg-rose-50/80 rounded-xl transition-colors"><Trash2 size={16} /></button>
        </>
      )}
    />
  );
};

export default MasterAplikasiExternal;

