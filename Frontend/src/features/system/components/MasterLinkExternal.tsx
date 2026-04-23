import React, { useState, useEffect } from 'react';
import { api } from '@/src/services/api';
import { Plus, Edit2, Trash2, X, Check, Loader2, ExternalLink } from 'lucide-react';
import { BaseDataTable } from '@/src/features/common/components/BaseDataTable';

interface LinkExternalItem {
  id: number;
  label: string;
  uri: string;
}

const MasterLinkExternal = () => {
  const [data, setData] = useState<LinkExternalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newUri, setNewUri] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editUri, setEditUri] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.linkExternal.getAll();
      if (res.success) setData(res.data);
      else setError(res.message);
    } catch { setError('Gagal mengambil data'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleAdd = async () => {
    if (!newLabel.trim() || !newUri.trim()) return;
    try {
      const res = await api.linkExternal.create(newLabel, newUri);
      if (res.success) { setNewLabel(''); setNewUri(''); setIsAdding(false); fetchData(); }
    } catch { alert('Gagal menambah data'); }
  };

  const handleUpdate = async (id: number) => {
    if (!editLabel.trim() || !editUri.trim()) return;
    try {
      const res = await api.linkExternal.update(id, editLabel, editUri);
      if (res.success) { setEditingId(null); fetchData(); }
    } catch { alert('Gagal mengubah data'); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Hapus data ini?')) return;
    try {
      const res = await api.linkExternal.delete(id);
      if (res.success) fetchData();
    } catch { alert('Gagal menghapus data'); }
  };

  const columns = [
    {
      header: 'Label / Nama Link',
      key: 'label',
      className: 'font-semibold text-slate-800 tracking-tight text-sm'
    },
    {
      header: 'URI / URL',
      key: 'uri',
      render: (item: LinkExternalItem) => (
        <div className="flex items-center gap-2 group/link">
          <span className="text-slate-600 truncate max-w-xs">{item.uri}</span>
          <a href={item.uri} target="_blank" rel="noopener noreferrer" className="text-blue-500 opacity-0 group-hover/link:opacity-100 transition-opacity"><ExternalLink size={14} /></a>
        </div>
      )
    }
  ];

  return (
    <BaseDataTable<LinkExternalItem>
      title="Master Link External"
      subtitle="Daftar tautan luar untuk referensi cepat."
      data={data}
      columns={columns}
      loading={loading}
      error={error}
      searchPlaceholder="Cari link..."
      addButtonLabel="Tambah Link"
      onAddClick={() => setIsAdding(true)}
      editingId={editingId}
      renderAddRow={() => isAdding && (
        <tr className="bg-blue-50">
          <td className="p-4 border-b border-slate-50 text-slate-400 text-center">NEW</td>
          <td className="p-2 border-b border-slate-100">
            <input autoFocus type="text" className="input-modern" placeholder="Label link..." value={newLabel} onChange={e => setNewLabel(e.target.value)} />
          </td>
          <td className="p-2 border-b border-slate-100">
            <input type="text" className="input-modern" placeholder="https://..." value={newUri} onChange={e => setNewUri(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleAdd()} />
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
            <input autoFocus type="text" className="input-modern" value={editLabel} onChange={e => setEditLabel(e.target.value)} />
          </td>
          <td className="p-2 border-b border-slate-100">
            <input type="text" className="input-modern" value={editUri} onChange={e => setEditUri(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleUpdate(Number(item.id))} />
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
          <button onClick={() => { setEditingId(Number(item.id)); setEditLabel(item.label); setEditUri(item.uri); }} className="text-slate-400 hover:text-indigo-600 p-2 hover:bg-indigo-50/80 rounded-xl transition-colors"><Edit2 size={16} /></button>
          <button onClick={() => handleDelete(Number(item.id))} className="text-slate-400 hover:text-rose-600 p-2 hover:bg-rose-50/80 rounded-xl transition-colors"><Trash2 size={16} /></button>
        </>
      )}
    />
  );
};

export default MasterLinkExternal;
