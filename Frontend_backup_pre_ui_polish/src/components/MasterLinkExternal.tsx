import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Plus, Edit2, Trash2, X, Check, Loader2, ExternalLink } from 'lucide-react';

const MasterLinkExternal = () => {
  const [data, setData] = useState<{ id: number; label: string; uri: string }[]>([]);
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
      if (res.success) {
        setData(res.data);
      } else {
        setError(res.message);
      }
    } catch (err) {
      setError('Gagal mengambil data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAdd = async () => {
    if (!newLabel.trim() || !newUri.trim()) return;
    try {
      const res = await api.linkExternal.create(newLabel, newUri);
      if (res.success) {
        setNewLabel('');
        setNewUri('');
        setIsAdding(false);
        fetchData();
      }
    } catch (err) {
      alert('Gagal menambah data');
    }
  };

  const handleUpdate = async (id: number) => {
    if (!editLabel.trim() || !editUri.trim()) return;
    try {
      const res = await api.linkExternal.update(id, editLabel, editUri);
      if (res.success) {
        setEditingId(null);
        fetchData();
      }
    } catch (err) {
      alert('Gagal mengubah data');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Hapus data ini?')) return;
    try {
      const res = await api.linkExternal.delete(id);
      if (res.success) {
        fetchData();
      }
    } catch (err) {
      alert('Gagal menghapus data');
    }
  };

  return (
    <div className="bg-white p-6 shadow-sm border border-slate-200">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-black text-ppm-green uppercase tracking-tight">Master Link External</h2>
        <button
          onClick={() => setIsAdding(true)}
          className="bg-ppm-green text-white px-4 py-2 text-xs font-bold uppercase tracking-wider flex items-center gap-2 hover:bg-ppm-light-green transition-colors"
        >
          <Plus size={14} /> Tambah Link
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="animate-spin text-ppm-green" size={32} />
        </div>
      ) : error ? (
        <div className="text-red-600 text-center py-12 font-bold">{error}</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="table-header w-16 text-center">NO</th>
                <th className="table-header">Label / Nama Link</th>
                <th className="table-header">URI / URL</th>
                <th className="table-header w-32 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {isAdding && (
                <tr className="bg-blue-50">
                  <td className="p-3 border-b border-slate-100 text-slate-400 text-center">NEW</td>
                  <td className="p-2 border-b border-slate-100">
                    <input
                      autoFocus
                      type="text"
                      className="w-full border-2 border-ppm-green p-1.5 text-sm outline-none mb-1"
                      placeholder="Label link..."
                      value={newLabel}
                      onChange={(e) => setNewLabel(e.target.value)}
                    />
                  </td>
                  <td className="p-2 border-b border-slate-100">
                    <input
                      type="text"
                      className="w-full border-2 border-ppm-green p-1.5 text-sm outline-none"
                      placeholder="https://..."
                      value={newUri}
                      onChange={(e) => setNewUri(e.target.value)}
                    />
                  </td>
                  <td className="p-2 border-b border-slate-100">
                    <div className="flex justify-center gap-2">
                      <button onClick={handleAdd} className="text-ppm-green p-1 hover:bg-slate-100 rounded-full">
                        <Check size={18} />
                      </button>
                      <button onClick={() => { setIsAdding(false); window.dispatchEvent(new CustomEvent('sidebar:expand')); }} className="text-red-600 p-1 hover:bg-red-100 rounded-full">
                        <X size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              )}
              {data.map((item, index) => (
                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-3 border-b border-slate-100 font-mono text-xs text-slate-500 text-center">{index + 1}</td>
                  <td className="p-3 border-b border-slate-100 font-bold text-ppm-green">
                    {editingId === item.id ? (
                      <input
                        autoFocus
                        type="text"
                        className="w-full border-2 border-ppm-green p-1.5 text-sm outline-none"
                        value={editLabel}
                        onChange={(e) => setEditLabel(e.target.value)}
                      />
                    ) : (
                      item.label
                    )}
                  </td>
                  <td className="p-3 border-b border-slate-100">
                    {editingId === item.id ? (
                      <input
                        type="text"
                        className="w-full border-2 border-ppm-green p-1.5 text-sm outline-none"
                        value={editUri}
                        onChange={(e) => setEditUri(e.target.value)}
                      />
                    ) : (
                      <div className="flex items-center gap-2 group/link">
                        <span className="text-slate-600 truncate max-w-xs">{item.uri}</span>
                        <a href={item.uri} target="_blank" rel="noopener noreferrer" className="text-blue-500 opacity-0 group-hover/link:opacity-100 transition-opacity">
                          <ExternalLink size={14} />
                        </a>
                      </div>
                    )}
                  </td>
                  <td className="p-3 border-b border-slate-100">
                    <div className="flex justify-center gap-4">
                      {editingId === item.id ? (
                        <>
                          <button onClick={() => handleUpdate(item.id)} className="text-ppm-green p-1 hover:bg-slate-100 rounded-full">
                            <Check size={18} />
                          </button>
                          <button onClick={() => { setEditingId(null); window.dispatchEvent(new CustomEvent('sidebar:expand')); }} className="text-red-600 p-1 hover:bg-red-100 rounded-full">
                            <X size={18} />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => {
                              setEditingId(item.id);
                              setEditLabel(item.label);
                              setEditUri(item.uri);
                            }}
                            className="text-blue-600 hover:text-blue-800 p-1 transition-colors"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="text-red-600 hover:text-red-800 p-1 transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {data.length === 0 && !isAdding && (
                <tr>
                  <td colSpan={4} className="p-12 text-center text-slate-400 font-bold italic">
                    Belum ada data link external
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default MasterLinkExternal;
