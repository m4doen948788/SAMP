import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../services/api';
import { Plus, Edit2, Trash2, X, Check, Loader2, ExternalLink, Search } from 'lucide-react';
import { useLabels } from '../contexts/LabelContext';

const PAGE_SIZES = [10, 20, 50, 100, 0];
const MAX_VISIBLE_PAGES = 5;

const renderPageButtons = (currentPage: number, totalPages: number, setCurrentPage: (p: number) => void) => {
  if (totalPages <= 1) return null;
  const pages: (number | string)[] = [];
  if (totalPages <= MAX_VISIBLE_PAGES + 2) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    const start = Math.max(2, currentPage - Math.floor(MAX_VISIBLE_PAGES / 2));
    const end = Math.min(totalPages - 1, start + MAX_VISIBLE_PAGES - 1);
    const adjustedStart = Math.max(2, end - MAX_VISIBLE_PAGES + 1);
    if (adjustedStart > 2) pages.push('...');
    for (let i = adjustedStart; i <= end; i++) pages.push(i);
    if (end < totalPages - 1) pages.push('...');
    pages.push(totalPages);
  }
  return (
    <div className="flex items-center gap-1">
      {pages.map((p, i) =>
        typeof p === 'string' ? (
          <span key={`e${i}`} className="px-1.5 text-slate-400 text-xs">...</span>
        ) : (
          <button key={p} onClick={() => setCurrentPage(p)} className={`px-2.5 py-1 border text-xs font-bold transition-colors ${p === currentPage ? 'bg-ppm-green text-white border-ppm-green' : 'border-slate-300 hover:border-ppm-green'}`}>{p}</button>
        )
      )}
    </div>
  );
};

const MasterAplikasiExternal = () => {
  const { getLabel } = useLabels();
  const [data, setData] = useState<{ id: number; nama_aplikasi: string; url: string; pembuat: string; asal_instansi: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [newForm, setNewForm] = useState({ nama_aplikasi: '', url: '', pembuat: '', asal_instansi: '' });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ nama_aplikasi: '', url: '', pembuat: '', asal_instansi: '' });
  const [search, setSearch] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

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

  const filtered = useMemo(() => {
    if (!search.trim()) return data;
    const q = search.toLowerCase();
    return data.filter(d =>
      d.nama_aplikasi.toLowerCase().includes(q) ||
      d.url.toLowerCase().includes(q) ||
      (d.pembuat && d.pembuat.toLowerCase().includes(q)) ||
      (d.asal_instansi && d.asal_instansi.toLowerCase().includes(q))
    );
  }, [data, search]);

  const totalPages = pageSize === 0 ? 1 : Math.ceil(filtered.length / pageSize);
  const displayed = pageSize === 0 ? filtered : filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => { setCurrentPage(1); }, [search, pageSize]);

  const handleAdd = async () => {
    if (!newForm.nama_aplikasi.trim() || !newForm.url.trim()) return;
    try {
      const res = await api.aplikasiExternal.create(newForm);
      if (res.success) { setNewForm({ nama_aplikasi: '', url: '', pembuat: '', asal_instansi: '' }); setIsAdding(false); fetchData(); }
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

  return (
    <div className="bg-white p-6 shadow-sm border border-slate-200">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-xl font-black text-ppm-green uppercase tracking-tight">Master Aplikasi External</h2>
        <button onClick={() => setIsAdding(true)} className="bg-ppm-green text-white px-4 py-2 text-xs font-bold uppercase tracking-wider flex items-center gap-2 hover:bg-ppm-light-green transition-colors">
          <Plus size={14} /> Tambah Aplikasi
        </button>
      </div>

      <div className="mb-4 flex justify-end">
        <div className="relative w-full sm:w-72">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" placeholder="Cari aplikasi..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-3 py-2 border border-slate-300 text-sm outline-none focus:border-ppm-green transition-colors" />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-ppm-green" size={32} /></div>
      ) : error ? (
        <div className="text-red-600 text-center py-12 font-bold">{error}</div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="table-header w-16 text-center">NO</th>
                  <th className="table-header">{getLabel('master_aplikasi_external', 'nama_aplikasi', 'Nama Aplikasi')}</th>
                  <th className="table-header">{getLabel('master_aplikasi_external', 'url', 'URL')}</th>
                  <th className="table-header">{getLabel('master_aplikasi_external', 'pembuat', 'Pembuat')}</th>
                  <th className="table-header">{getLabel('master_aplikasi_external', 'asal_instansi', 'Asal Instansi')}</th>
                  <th className="table-header w-32 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {isAdding && (
                  <tr className="bg-blue-50">
                    <td className="p-3 border-b border-slate-100 text-slate-400 text-center">NEW</td>
                    <td className="p-2 border-b border-slate-100">
                      <input autoFocus type="text" className="w-full border-2 border-ppm-green p-1.5 text-sm outline-none" placeholder="Nama aplikasi..." value={newForm.nama_aplikasi} onChange={e => setNewForm({ ...newForm, nama_aplikasi: e.target.value })} />
                    </td>
                    <td className="p-2 border-b border-slate-100">
                      <input type="text" className="w-full border-2 border-ppm-green p-1.5 text-sm outline-none" placeholder="https://..." value={newForm.url} onChange={e => setNewForm({ ...newForm, url: e.target.value })} />
                    </td>
                    <td className="p-2 border-b border-slate-100">
                      <input type="text" className="w-full border-2 border-ppm-green p-1.5 text-sm outline-none" placeholder="Pembuat..." value={newForm.pembuat} onChange={e => setNewForm({ ...newForm, pembuat: e.target.value })} />
                    </td>
                    <td className="p-2 border-b border-slate-100">
                      <input type="text" className="w-full border-2 border-ppm-green p-1.5 text-sm outline-none" placeholder="Instansi..." value={newForm.asal_instansi} onChange={e => setNewForm({ ...newForm, asal_instansi: e.target.value })} />
                    </td>
                    <td className="p-2 border-b border-slate-100">
                      <div className="flex justify-center gap-2">
                        <button onClick={handleAdd} className="text-ppm-green p-1 hover:bg-slate-100 rounded-full"><Check size={18} /></button>
                        <button onClick={() => { setIsAdding(false); window.dispatchEvent(new CustomEvent('sidebar:expand')); }} className="text-red-600 p-1 hover:bg-red-100 rounded-full"><X size={18} /></button>
                      </div>
                    </td>
                  </tr>
                )}
                {displayed.map((item, index) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 border-b border-slate-100 font-mono text-xs text-slate-500 text-center">{(currentPage - 1) * (pageSize || filtered.length) + index + 1}</td>
                    <td className="p-3 border-b border-slate-100 font-bold text-ppm-green">
                      {editingId === item.id ? (
                        <input autoFocus type="text" className="w-full border-2 border-ppm-green p-1.5 text-sm outline-none" value={editForm.nama_aplikasi} onChange={e => setEditForm({ ...editForm, nama_aplikasi: e.target.value })} />
                      ) : item.nama_aplikasi}
                    </td>
                    <td className="p-3 border-b border-slate-100">
                      {editingId === item.id ? (
                        <input type="text" className="w-full border-2 border-ppm-green p-1.5 text-sm outline-none" value={editForm.url} onChange={e => setEditForm({ ...editForm, url: e.target.value })} />
                      ) : (
                        <div className="flex items-center gap-2 group/link">
                          <span className="text-slate-600 truncate max-w-[150px]">{item.url}</span>
                          <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 opacity-0 group-hover/link:opacity-100 transition-opacity"><ExternalLink size={14} /></a>
                        </div>
                      )}
                    </td>
                    <td className="p-3 border-b border-slate-100 text-slate-600">
                      {editingId === item.id ? (
                        <input type="text" className="w-full border-2 border-ppm-green p-1.5 text-sm outline-none" value={editForm.pembuat} onChange={e => setEditForm({ ...editForm, pembuat: e.target.value })} />
                      ) : item.pembuat}
                    </td>
                    <td className="p-3 border-b border-slate-100 text-slate-600">
                      {editingId === item.id ? (
                        <input type="text" className="w-full border-2 border-ppm-green p-1.5 text-sm outline-none" value={editForm.asal_instansi} onChange={e => setEditForm({ ...editForm, asal_instansi: e.target.value })} />
                      ) : item.asal_instansi}
                    </td>
                    <td className="p-3 border-b border-slate-100">
                      <div className="flex justify-center gap-4">
                        {editingId === item.id ? (
                          <>
                            <button onClick={() => handleUpdate(item.id)} className="text-ppm-green p-1 hover:bg-slate-100 rounded-full"><Check size={18} /></button>
                            <button onClick={() => { setEditingId(null); window.dispatchEvent(new CustomEvent('sidebar:expand')); }} className="text-red-600 p-1 hover:bg-red-100 rounded-full"><X size={18} /></button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => { setEditingId(item.id); setEditForm({ nama_aplikasi: item.nama_aplikasi, url: item.url, pembuat: item.pembuat || '', asal_instansi: item.asal_instansi || '' }); }} className="text-blue-600 hover:text-blue-800 p-1 transition-colors"><Edit2 size={16} /></button>
                            <button onClick={() => handleDelete(item.id)} className="text-red-600 hover:text-red-800 p-1 transition-colors"><Trash2 size={16} /></button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {displayed.length === 0 && !isAdding && (
                  <tr><td colSpan={6} className="p-12 text-center text-slate-400 font-bold italic">{search ? 'Tidak ada hasil pencarian' : 'Belum ada data aplikasi external'}</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="flex flex-col sm:flex-row justify-between items-center mt-4 gap-3">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>Tampilkan</span>
              <select value={pageSize} onChange={e => setPageSize(Number(e.target.value))} className="border border-slate-300 px-2 py-1.5 text-xs outline-none focus:border-ppm-green">
                {PAGE_SIZES.map(s => <option key={s} value={s}>{s === 0 ? 'Semua' : s}</option>)}
              </select>
              <span className="text-slate-400">|</span>
              <span>{displayed.length} dari {filtered.length} data</span>
            </div>
            {renderPageButtons(currentPage, totalPages, setCurrentPage)}
          </div>
        </>
      )}
    </div>
  );
};

export default MasterAplikasiExternal;
