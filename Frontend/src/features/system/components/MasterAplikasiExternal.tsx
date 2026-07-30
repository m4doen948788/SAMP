import React, { useState, useEffect, useRef } from 'react';
import { api } from '@/src/services/api';
import { Edit2, Trash2, X, Check, ExternalLink, Link2, Layers, ChevronDown, Sparkles, Info, Clock, Calendar } from 'lucide-react';
import { useLabels } from '@/src/contexts/LabelContext';
import { BaseDataTable } from '@/src/features/common/components/BaseDataTable';

interface AplikasiItem {
  id: number;
  nama_aplikasi: string;
  url: string;
  sumber: string;
  asal_instansi?: string;
  tipe_link_id: number | null;
  nama_tipe_link?: string;
  urusan_ids?: number[];
  nama_urusan_list?: string[];
  nama_urusan?: string;
  tematik_ids?: number[];
  nama_tematik_list?: string[];
  tagging?: string | null;
  keterangan?: string | null;
  tanggal_link?: string | null;
  created_at?: string;
  updated_at?: string;
  created_by?: number;
  updated_by?: number;
}

interface TipeLinkOption {
  id: number;
  jenis_link?: string;
  nama?: string;
}

interface OptionItem {
  id: number;
  nama: string;
}

const getTodayDate = () => new Date().toISOString().split('T')[0];

const emptyForm = { 
  nama_aplikasi: '', 
  url: '', 
  sumber: '', 
  tipe_link_id: '' as number | string,
  urusan_ids: [] as number[],
  tematik_ids: [] as number[],
  keterangan: '',
  tanggal_link: getTodayDate()
};

// Custom MultiSelect Dropdown Component
const MultiSelectDropdown = ({ 
  label, 
  options, 
  selectedIds, 
  onChange 
}: { 
  label: string; 
  options: OptionItem[]; 
  selectedIds: number[]; 
  onChange: (ids: number[]) => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = options.filter(o => (o.nama || '').toLowerCase().includes(search.toLowerCase()));

  const toggleOption = (id: number) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter(i => i !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  return (
    <div className="relative min-w-[130px]" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="input-modern w-full flex items-center justify-between text-left gap-1 bg-white"
      >
        <span className="truncate text-xs">
          {selectedIds.length === 0 ? `-- Pilih ${label} --` : `${selectedIds.length} ${label}`}
        </span>
        <ChevronDown size={14} className="text-slate-400 shrink-0" />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-64 bg-white border border-slate-200 rounded-xl shadow-xl p-2 left-0 top-full max-h-60 overflow-y-auto">
          <input
            type="text"
            className="w-full text-xs p-1.5 border border-slate-200 rounded-lg mb-2 outline-none focus:border-indigo-500"
            placeholder={`Cari ${label.toLowerCase()}...`}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <div className="space-y-1">
            {filtered.map(opt => {
              const isChecked = selectedIds.includes(opt.id);
              return (
                <label key={opt.id} className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-50 cursor-pointer text-xs select-none">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleOption(opt.id)}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className={isChecked ? 'font-semibold text-slate-800' : 'text-slate-600'}>{opt.nama}</span>
                </label>
              );
            })}
            {filtered.length === 0 && <div className="text-xs text-slate-400 p-2 text-center">Tidak ada opsi</div>}
          </div>
        </div>
      )}
    </div>
  );
};

const MasterAplikasiExternal = () => {
  const { getLabel } = useLabels();
  const [data, setData] = useState<AplikasiItem[]>([]);
  const [tipeLinkOptions, setTipeLinkOptions] = useState<TipeLinkOption[]>([]);
  const [urusanOptions, setUrusanOptions] = useState<OptionItem[]>([]);
  const [tematikOptions, setTematikOptions] = useState<OptionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [newForm, setNewForm] = useState({ ...emptyForm });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ ...emptyForm });

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch master aplikasi external
      const resApp = await api.aplikasiExternal.getAll();
      if (resApp.success) {
        setData(resApp.data);
      } else {
        setError(resApp.message || 'Gagal mengambil data aplikasi');
      }

      // 2. Fetch options from master_link (Master Data Tipe Link)
      let tipeList: TipeLinkOption[] = [];
      try {
        const resLink = await api.masterDataConfig.getDataByTable('master_link');
        if (resLink && resLink.success && Array.isArray(resLink.data)) {
          tipeList = resLink.data;
        }
      } catch { /* fallback next */ }

      if (tipeList.length === 0) {
        try {
          const resTipe = await api.tipeLink.getAll();
          if (resTipe && resTipe.success && Array.isArray(resTipe.data)) {
            tipeList = resTipe.data;
          }
        } catch { /* ignored */ }
      }
      setTipeLinkOptions(tipeList);

      // 3. Fetch urusan options from bidangUrusan
      try {
        const resUrusan = await api.bidangUrusan.getAll();
        if (resUrusan && resUrusan.success && Array.isArray(resUrusan.data)) {
          const mappedUrusan = resUrusan.data.map((u: any) => ({
            id: u.id,
            nama: (u.urusan || '').replace(/\s+/g, ' ').trim()
          }));
          setUrusanOptions(mappedUrusan);
        }
      } catch { /* ignored */ }

      // 4. Fetch tematik options from master_tematik
      try {
        const resTematik = await api.tematik.getAll();
        if (resTematik && resTematik.success && Array.isArray(resTematik.data)) {
          const mappedTematik = resTematik.data.map((t: any) => ({
            id: t.id,
            nama: t.nama
          }));
          setTematikOptions(mappedTematik);
        }
      } catch { /* ignored */ }

    } catch {
      setError('Gagal mengambil data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleAdd = async () => {
    if (!newForm.nama_aplikasi.trim() || !newForm.url.trim()) return;
    try {
      const payload = {
        ...newForm,
        tipe_link_id: newForm.tipe_link_id ? Number(newForm.tipe_link_id) : null,
        urusan_ids: newForm.urusan_ids,
        tematik_ids: newForm.tematik_ids,
        keterangan: newForm.keterangan.trim() || null,
        tanggal_link: newForm.tanggal_link || getTodayDate()
      };
      const res = await api.aplikasiExternal.create(payload);
      if (res.success) { 
        setNewForm({ ...emptyForm, tanggal_link: getTodayDate() }); 
        setIsAdding(false); 
        fetchData(); 
      }
      else { alert(res.message || 'Gagal menambah data'); }
    } catch { alert('Gagal menambah data'); }
  };

  const handleUpdate = async (id: number) => {
    if (!editForm.nama_aplikasi.trim() || !editForm.url.trim()) return;
    try {
      const payload = {
        ...editForm,
        tipe_link_id: editForm.tipe_link_id ? Number(editForm.tipe_link_id) : null,
        urusan_ids: editForm.urusan_ids,
        tematik_ids: editForm.tematik_ids,
        keterangan: editForm.keterangan.trim() || null,
        tanggal_link: editForm.tanggal_link || null
      };
      const res = await api.aplikasiExternal.update(id, payload);
      if (res.success) { setEditingId(null); fetchData(); }
      else { alert(res.message || 'Gagal mengubah data'); }
    } catch { alert('Gagal mengubah data'); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Hapus data ini?')) return;
    try {
      const res = await api.aplikasiExternal.delete(id);
      if (res.success) fetchData();
    } catch { alert('Gagal menghapus data'); }
  };

  const getOptionLabel = (t: TipeLinkOption) => {
    return t.jenis_link || t.nama || `Tipe #${t.id}`;
  };

  const formatDisplayDate = (dStr?: string | null) => {
    if (!dStr) return '-';
    try {
      const d = new Date(dStr);
      return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return dStr;
    }
  };

  const formatHistoryTooltip = (item: AplikasiItem) => {
    const createdStr = item.created_at ? new Date(item.created_at).toLocaleString('id-ID') : '-';
    const updatedStr = item.updated_at ? new Date(item.updated_at).toLocaleString('id-ID') : '-';
    return `Riwayat:\n• Dibuat: ${createdStr}\n• Terakhir diubah: ${updatedStr}`;
  };

  const columns = [
    {
      header: getLabel('master_aplikasi_external', 'nama_aplikasi', 'Nama Link'),
      key: 'nama_aplikasi',
      className: 'min-w-[150px]',
      render: (item: AplikasiItem) => (
        <div className="flex items-center gap-1.5" title={item.keterangan || item.nama_aplikasi}>
          <span className="font-semibold text-slate-800 tracking-tight text-sm">
            {item.nama_aplikasi}
          </span>
          {item.keterangan && (
            <span className="inline-flex items-center text-slate-400 hover:text-indigo-600 transition-colors cursor-help" title={`Keterangan: ${item.keterangan}`}>
              <Info size={14} />
            </span>
          )}
        </div>
      )
    },
    {
      header: getLabel('master_aplikasi_external', 'tanggal_link', 'Tgl Link'),
      key: 'tanggal_link',
      className: 'min-w-[110px]',
      render: (item: AplikasiItem) => (
        <div className="flex items-center gap-1 text-slate-600 text-xs font-medium" title={`Tanggal Link: ${item.tanggal_link || '-'}`}>
          <Calendar size={13} className="text-slate-400 shrink-0" />
          <span>{formatDisplayDate(item.tanggal_link)}</span>
        </div>
      )
    },
    {
      header: getLabel('master_aplikasi_external', 'tipe_link_id', 'Tipe Link'),
      key: 'nama_tipe_link',
      className: 'min-w-[110px]',
      render: (item: AplikasiItem) => (
        item.nama_tipe_link ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
            <Link2 size={12} /> {item.nama_tipe_link}
          </span>
        ) : (
          <span className="text-slate-400 text-xs italic">-</span>
        )
      )
    },
    {
      header: getLabel('master_aplikasi_external', 'urusan_id', 'Urusan'),
      key: 'nama_urusan',
      className: 'min-w-[130px]',
      render: (item: AplikasiItem) => {
        const uList = item.nama_urusan_list || [];
        if (uList.length === 0) return <span className="text-slate-400 text-xs italic">-</span>;
        
        const fullListStr = uList.join('\n• ');
        if (uList.length === 1) {
          return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200/60 truncate max-w-[140px]" title={uList[0]}>
              <Layers size={10} className="text-blue-500 shrink-0" /> {uList[0]}
            </span>
          );
        }

        return (
          <div className="flex items-center gap-1 cursor-help" title={`Daftar Urusan (${uList.length}):\n• ${fullListStr}`}>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200/60 max-w-[110px] truncate">
              <Layers size={10} className="text-blue-500 shrink-0" /> {uList[0]}
            </span>
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-300/60 hover:bg-blue-200 transition-colors">
              +{uList.length - 1}
            </span>
          </div>
        );
      }
    },
    {
      header: getLabel('master_aplikasi_external', 'tagging', 'Tematik'),
      key: 'tagging',
      className: 'min-w-[120px]',
      render: (item: AplikasiItem) => {
        const tList = item.nama_tematik_list || [];
        if (tList.length === 0) return <span className="text-slate-400 text-xs italic">-</span>;

        const fullTematikStr = tList.join(', ');
        if (tList.length === 1) {
          return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-purple-50 text-purple-700 border border-purple-200/60 truncate max-w-[120px]" title={tList[0]}>
              <Sparkles size={10} className="text-purple-500 shrink-0" /> {tList[0]}
            </span>
          );
        }

        return (
          <div className="flex items-center gap-1 cursor-help" title={`Daftar Tematik (${tList.length}): ${fullTematikStr}`}>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-purple-50 text-purple-700 border border-purple-200/60 max-w-[90px] truncate">
              <Sparkles size={10} className="text-purple-500 shrink-0" /> {tList[0]}
            </span>
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-300/60 hover:bg-purple-200 transition-colors">
              +{tList.length - 1}
            </span>
          </div>
        );
      }
    },
    {
      header: getLabel('master_aplikasi_external', 'keterangan', 'Keterangan'),
      key: 'keterangan',
      className: 'min-w-[150px]',
      render: (item: AplikasiItem) => (
        item.keterangan ? (
          <div className="text-xs text-slate-600 max-w-[170px] whitespace-pre-line leading-snug cursor-help" title={item.keterangan}>
            <span className="line-clamp-2">{item.keterangan}</span>
          </div>
        ) : (
          <span className="text-slate-400 text-xs italic">-</span>
        )
      )
    },
    {
      header: getLabel('master_aplikasi_external', 'url', 'URL'),
      key: 'url',
      className: 'min-w-[130px]',
      render: (item: AplikasiItem) => (
        <div className="flex items-center gap-2 group/link">
          <span className="text-slate-600 truncate max-w-[130px]">{item.url}</span>
          <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 opacity-0 group-hover/link:opacity-100 transition-opacity"><ExternalLink size={14} /></a>
        </div>
      )
    },
    {
      header: getLabel('master_aplikasi_external', 'sumber', 'Sumber'),
      key: 'sumber',
      className: 'min-w-[130px]',
      render: (item: AplikasiItem) => (
        <span className="font-medium text-slate-600 text-sm">{item.sumber || item.asal_instansi || '-'}</span>
      )
    }
  ];

  return (
    <BaseDataTable<AplikasiItem>
      title="Master Link Eksternal"
      subtitle="Kelola link eksternal, urusan terkait, tematik, dan tooltip keterangan."
      data={data}
      columns={columns}
      loading={loading}
      error={error}
      searchPlaceholder="Cari link, urusan, tematik, atau keterangan..."
      addButtonLabel="Tambah Link"
      onAddClick={() => setIsAdding(true)}
      editingId={editingId}
      searchKey={(item) => `${item.nama_aplikasi} ${item.nama_tipe_link || ''} ${(item.nama_urusan_list || []).join(' ')} ${(item.nama_tematik_list || []).join(' ')} ${item.keterangan || ''} ${item.url} ${item.sumber || item.asal_instansi || ''}`}
      renderAddRow={() => isAdding && (
        <tr className="bg-blue-50/80">
          <td className="p-4 border-b border-slate-100 text-slate-400 text-center font-mono text-xs">NEW</td>
          <td className="p-2 border-b border-slate-100">
            <input autoFocus type="text" className="input-modern" placeholder="Nama link..." value={newForm.nama_aplikasi} onChange={e => setNewForm({ ...newForm, nama_aplikasi: e.target.value })} onKeyPress={e => e.key === 'Enter' && handleAdd()} />
          </td>
          <td className="p-2 border-b border-slate-100">
            <input type="date" className="input-modern" value={newForm.tanggal_link} onChange={e => setNewForm({ ...newForm, tanggal_link: e.target.value })} />
          </td>
          <td className="p-2 border-b border-slate-100">
            <select className="input-modern min-w-[110px]" value={newForm.tipe_link_id} onChange={e => setNewForm({ ...newForm, tipe_link_id: e.target.value })}>
              <option value="">-- Tipe --</option>
              {tipeLinkOptions.map(t => (
                <option key={t.id} value={t.id}>{getOptionLabel(t)}</option>
              ))}
            </select>
          </td>
          <td className="p-2 border-b border-slate-100">
            <MultiSelectDropdown
              label="Urusan"
              options={urusanOptions}
              selectedIds={newForm.urusan_ids}
              onChange={ids => setNewForm({ ...newForm, urusan_ids: ids })}
            />
          </td>
          <td className="p-2 border-b border-slate-100">
            <MultiSelectDropdown
              label="Tematik"
              options={tematikOptions}
              selectedIds={newForm.tematik_ids}
              onChange={ids => setNewForm({ ...newForm, tematik_ids: ids })}
            />
          </td>
          <td className="p-2 border-b border-slate-100">
            <textarea
              className="input-modern py-1 px-2.5 min-h-[42px] text-xs resize-y min-w-[160px] leading-relaxed"
              rows={2}
              placeholder="Keterangan (Tekan Enter / Alt+Enter untuk baris baru)..."
              value={newForm.keterangan}
              onChange={e => setNewForm({ ...newForm, keterangan: e.target.value })}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  if (e.ctrlKey) {
                    e.preventDefault();
                    handleAdd();
                  } else if (e.altKey) {
                    e.preventDefault();
                    const target = e.currentTarget;
                    const start = target.selectionStart;
                    const end = target.selectionEnd;
                    const val = newForm.keterangan;
                    const updated = val.substring(0, start) + '\n' + val.substring(end);
                    setNewForm({ ...newForm, keterangan: updated });
                    setTimeout(() => {
                      target.selectionStart = target.selectionEnd = start + 1;
                    }, 0);
                  }
                }
              }}
            />
          </td>
          <td className="p-2 border-b border-slate-100">
            <input type="text" className="input-modern" placeholder="https://..." value={newForm.url} onChange={e => setNewForm({ ...newForm, url: e.target.value })} onKeyPress={e => e.key === 'Enter' && handleAdd()} />
          </td>
          <td className="p-2 border-b border-slate-100">
            <input type="text" className="input-modern" placeholder="Sumber..." value={newForm.sumber} onChange={e => setNewForm({ ...newForm, sumber: e.target.value })} onKeyPress={e => e.key === 'Enter' && handleAdd()} />
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
            <input autoFocus type="text" className="input-modern" value={editForm.nama_aplikasi} onChange={e => setEditForm({ ...editForm, nama_aplikasi: e.target.value })} onKeyPress={e => e.key === 'Enter' && handleUpdate(Number(item.id))} />
          </td>
          <td className="p-2 border-b border-slate-100">
            <input type="date" className="input-modern" value={editForm.tanggal_link || ''} onChange={e => setEditForm({ ...editForm, tanggal_link: e.target.value })} />
          </td>
          <td className="p-2 border-b border-slate-100">
            <select className="input-modern min-w-[110px]" value={editForm.tipe_link_id} onChange={e => setEditForm({ ...editForm, tipe_link_id: e.target.value })}>
              <option value="">-- Tipe --</option>
              {tipeLinkOptions.map(t => (
                <option key={t.id} value={t.id}>{getOptionLabel(t)}</option>
              ))}
            </select>
          </td>
          <td className="p-2 border-b border-slate-100">
            <MultiSelectDropdown
              label="Urusan"
              options={urusanOptions}
              selectedIds={editForm.urusan_ids}
              onChange={ids => setEditForm({ ...editForm, urusan_ids: ids })}
            />
          </td>
          <td className="p-2 border-b border-slate-100">
            <MultiSelectDropdown
              label="Tematik"
              options={tematikOptions}
              selectedIds={editForm.tematik_ids}
              onChange={ids => setEditForm({ ...editForm, tematik_ids: ids })}
            />
          </td>
          <td className="p-2 border-b border-slate-100">
            <textarea
              className="input-modern py-1 px-2.5 min-h-[42px] text-xs resize-y min-w-[160px] leading-relaxed"
              rows={2}
              placeholder="Keterangan (Tekan Enter / Alt+Enter untuk baris baru)..."
              value={editForm.keterangan}
              onChange={e => setEditForm({ ...editForm, keterangan: e.target.value })}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  if (e.ctrlKey) {
                    e.preventDefault();
                    handleUpdate(Number(item.id));
                  } else if (e.altKey) {
                    e.preventDefault();
                    const target = e.currentTarget;
                    const start = target.selectionStart;
                    const end = target.selectionEnd;
                    const val = editForm.keterangan;
                    const updated = val.substring(0, start) + '\n' + val.substring(end);
                    setEditForm({ ...editForm, keterangan: updated });
                    setTimeout(() => {
                      target.selectionStart = target.selectionEnd = start + 1;
                    }, 0);
                  }
                }
              }}
            />
          </td>
          <td className="p-2 border-b border-slate-100">
            <input type="text" className="input-modern" value={editForm.url} onChange={e => setEditForm({ ...editForm, url: e.target.value })} onKeyPress={e => e.key === 'Enter' && handleUpdate(Number(item.id))} />
          </td>
          <td className="p-2 border-b border-slate-100">
            <input type="text" className="input-modern" value={editForm.sumber} onChange={e => setEditForm({ ...editForm, sumber: e.target.value })} onKeyPress={e => e.key === 'Enter' && handleUpdate(Number(item.id))} />
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
            type="button"
            className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-100 rounded-xl transition-colors cursor-help"
            title={formatHistoryTooltip(item)}
          >
            <Clock size={16} />
          </button>
          <button 
            onClick={() => { 
              setEditingId(Number(item.id)); 
              setEditForm({ 
                nama_aplikasi: item.nama_aplikasi, 
                url: item.url, 
                sumber: item.sumber || item.asal_instansi || '', 
                tipe_link_id: item.tipe_link_id !== null ? String(item.tipe_link_id) : '',
                urusan_ids: item.urusan_ids || [],
                tematik_ids: item.tematik_ids || [],
                keterangan: item.keterangan || '',
                tanggal_link: item.tanggal_link || getTodayDate()
              }); 
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

export default MasterAplikasiExternal;
