import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { api } from '@/src/services/api';
import { Edit2, Trash2, X, Check, ExternalLink, Link2, Layers, ChevronDown, Sparkles, Info, Clock, Calendar, Building2, Filter, Plus } from 'lucide-react';
import { useLabels } from '@/src/contexts/LabelContext';
import { useAuth } from '@/src/contexts/AuthContext';
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
  created_by_name?: string;
  updated_by_name?: string;
  creator_bidang_id?: number | null;
  creator_nama_bidang?: string | null;
  creator_singkatan_bidang?: string | null;
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

const getTodayDate = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

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

// Custom MultiSelect Dropdown Component with Portal floating menu
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
  const [coords, setCoords] = useState<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 220 });
  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const updateCoords = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const dropdownWidth = Math.max(rect.width, 220);
      let left = rect.left;
      if (left + dropdownWidth > window.innerWidth - 16) {
        left = Math.max(16, window.innerWidth - dropdownWidth - 16);
      }
      setCoords({
        top: rect.bottom + 4,
        left: left,
        width: dropdownWidth
      });
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current && 
        !containerRef.current.contains(e.target as Node) &&
        menuRef.current && 
        !menuRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen) {
      updateCoords();
      window.addEventListener('resize', updateCoords);
      window.addEventListener('scroll', updateCoords, true);
      return () => {
        window.removeEventListener('resize', updateCoords);
        window.removeEventListener('scroll', updateCoords, true);
      };
    }
  }, [isOpen]);

  const filtered = options.filter(o => (o.nama || '').toLowerCase().includes(search.toLowerCase()));

  const toggleOption = (id: number) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter(i => i !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="input-modern w-full flex items-center justify-between text-left gap-1 bg-white py-1 px-2 text-xs"
      >
        <span className="truncate text-[11px]">
          {selectedIds.length === 0 ? `-- ${label} --` : `${selectedIds.length} ${label}`}
        </span>
        <ChevronDown size={12} className="text-slate-400 shrink-0" />
      </button>

      {isOpen && createPortal(
        <div 
          ref={menuRef}
          className="fixed z-[99999] bg-white border border-slate-200 rounded-xl shadow-2xl p-2 max-h-60 overflow-y-auto"
          style={{
            top: `${coords.top}px`,
            left: `${coords.left}px`,
            width: `${coords.width}px`
          }}
        >
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
        </div>,
        document.body
      )}
    </div>
  );
};

const MasterAplikasiExternal = () => {
  const { getLabel } = useLabels();
  const { user } = useAuth();
  const [data, setData] = useState<AplikasiItem[]>([]);
  const [tipeLinkOptions, setTipeLinkOptions] = useState<TipeLinkOption[]>([]);
  const [urusanOptions, setUrusanOptions] = useState<OptionItem[]>([]);
  const [tematikOptions, setTematikOptions] = useState<OptionItem[]>([]);
  const [bidangOptions, setBidangOptions] = useState<OptionItem[]>([]);
  const [selectedBidangId, setSelectedBidangId] = useState<number | 'ALL' | 'MY_BIDANG'>('MY_BIDANG');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [newForm, setNewForm] = useState({ ...emptyForm });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ ...emptyForm });

  const canEditItem = (item: AplikasiItem) => {
    if (!user) return true;
    const currentUserId = Number(user.id);
    const roleId = Number(user.role_id || (user as any).roleId || 0);
    const isSuperadminOrAdmin = roleId === 1 || roleId === 2 || Boolean((user as any).is_admin || (user as any).isAdmin);

    if (isSuperadminOrAdmin) return true;

    // Check if user is creator
    if (item.created_by && Number(item.created_by) === currentUserId) return true;

    // Check if user is Kabid, Katim, or Admin Bidang for this item's Bidang
    const jab = String(user.jabatan_nama || (user as any).jabatan || '').toLowerCase();
    const roleName = String(user.tipe_user_nama || (user as any).role_name || '').toLowerCase();
    const isKabid = jab.includes('kabid') || jab.includes('kepala bidang');
    const isKatim = jab.includes('katim') || jab.includes('ketua tim');
    const isAdminBidang = roleName.includes('admin') || jab.includes('admin bidang') || roleName.includes('verifikator');

    if ((isKabid || isKatim || isAdminBidang) && user.bidang_id && item.creator_bidang_id) {
      if (Number(item.creator_bidang_id) === Number(user.bidang_id)) {
        return true;
      }
    }

    return false;
  };

  const canReorder = useMemo(() => {
    if (!user) return false;
    const roleId = Number(user.role_id || (user as any).roleId || user.tipe_user_id || 0);
    const isSuperadminOrAdmin = roleId === 1 || roleId === 2 || Boolean((user as any).is_admin || (user as any).isAdmin);
    if (isSuperadminOrAdmin) return true;

    // Kabid & Katim hanya dapat mengatur posisi saat melihat Bidang Saya
    if (selectedBidangId === 'ALL') return false;

    const jab = String(user.jabatan_nama || (user as any).jabatan || '').toLowerCase();
    const roleName = String(user.tipe_user_nama || (user as any).role_name || '').toLowerCase();

    const isKabid = jab.includes('kabid') || jab.includes('kepala bidang');
    const isKatim = jab.includes('katim') || jab.includes('ketua tim');
    const isAdminBidang = roleName.includes('admin') || jab.includes('admin bidang') || roleName.includes('verifikator');

    return isKabid || isKatim || isAdminBidang;
  }, [user, selectedBidangId]);

  const handleReorder = async (reorderedItems: AplikasiItem[]) => {
    setData(reorderedItems);
    try {
      const payload = reorderedItems.map((item, idx) => ({
        id: Number(item.id),
        urutan: idx + 1
      }));
      await api.aplikasiExternal.reorder(payload);
    } catch (err) {
      console.error('Failed to save reorder:', err);
      fetchData();
    }
  };

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

      // 5. Fetch bidang instansi options from master_bidang_instansi
      try {
        const resBidang = await api.bidangInstansi.getAll();
        if (resBidang && resBidang.success && Array.isArray(resBidang.data)) {
          const mappedBidang = resBidang.data.map((b: any) => ({
            id: b.id,
            nama: (b.singkatan || b.nama_bidang || b.nama || `Bidang #${b.id}`).toUpperCase(),
            fullName: b.nama_bidang || b.nama || ''
          }));
          setBidangOptions(mappedBidang);
        }
      } catch { /* ignored */ }

    } catch {
      setError('Gagal mengambil data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // Filtered data based on selected Bidang
  const filteredData = useMemo(() => {
    if (selectedBidangId === 'ALL') return data;

    const targetBidangId = selectedBidangId === 'MY_BIDANG' ? (user?.bidang_id || null) : Number(selectedBidangId);
    if (!targetBidangId) return data;

    return data.filter(item => {
      if (item.creator_bidang_id && Number(item.creator_bidang_id) === targetBidangId) return true;
      if (user?.bidang_id === targetBidangId && item.created_by && Number(item.created_by) === Number(user.id)) return true;
      return false;
    });
  }, [data, selectedBidangId, user]);

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
    const clean = String(dStr).split(' ')[0].split('T')[0];
    const parts = clean.split('-');
    if (parts.length === 3) {
      const [year, month, day] = parts;
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'];
      const mIdx = parseInt(month, 10) - 1;
      if (mIdx >= 0 && mIdx < 12) {
        return `${day} ${months[mIdx]} ${year}`;
      }
    }
    return clean;
  };

  const formatHistoryTooltip = (item: AplikasiItem) => {
    const createdStr = item.created_at ? new Date(item.created_at).toLocaleString('id-ID') : '-';
    const updatedStr = item.updated_at ? new Date(item.updated_at).toLocaleString('id-ID') : '-';
    const creator = item.created_by_name || 'Admin';
    const updater = item.updated_by_name;

    let res = `Riwayat:\n• Dibuat: ${createdStr} oleh ${creator}`;
    if (updater && updatedStr !== '-') {
      res += `\n• Diubah: ${updatedStr} oleh ${updater}`;
    }
    return res;
  };

  const columns = [
    {
      header: getLabel('master_aplikasi_external', 'nama_aplikasi', 'Nama Link'),
      key: 'nama_aplikasi',
      render: (item: AplikasiItem) => (
        <div className="flex items-center gap-1 max-w-[130px]" title={item.keterangan || item.nama_aplikasi}>
          <span className="font-semibold text-slate-800 tracking-tight text-xs truncate">
            {item.nama_aplikasi}
          </span>
          {item.keterangan && (
            <span className="inline-flex items-center text-slate-400 hover:text-indigo-600 transition-colors cursor-help shrink-0" title={`Keterangan: ${item.keterangan}`}>
              <Info size={13} />
            </span>
          )}
        </div>
      )
    },
    {
      header: getLabel('master_aplikasi_external', 'tanggal_link', 'Tgl Link'),
      key: 'tanggal_link',
      render: (item: AplikasiItem) => (
        <div className="flex items-center gap-1 text-slate-600 text-xs font-medium whitespace-nowrap" title={`Tanggal Link: ${item.tanggal_link || '-'}`}>
          <Calendar size={12} className="text-slate-400 shrink-0" />
          <span>{formatDisplayDate(item.tanggal_link)}</span>
        </div>
      )
    },
    {
      header: getLabel('master_aplikasi_external', 'tipe_link_id', 'Tipe Link'),
      key: 'nama_tipe_link',
      render: (item: AplikasiItem) => (
        item.nama_tipe_link ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60 whitespace-nowrap">
            <Link2 size={10} /> {item.nama_tipe_link}
          </span>
        ) : (
          <span className="text-slate-400 text-xs italic">-</span>
        )
      )
    },
    {
      header: getLabel('master_aplikasi_external', 'urusan_id', 'Urusan'),
      key: 'nama_urusan',
      render: (item: AplikasiItem) => {
        const uList = item.nama_urusan_list || [];
        if (uList.length === 0) return <span className="text-slate-400 text-xs italic">-</span>;

        const fullListStr = uList.join('\n• ');
        return (
          <div className="flex items-center gap-1 cursor-help" title={`Daftar Urusan (${uList.length}):\n• ${fullListStr}`}>
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/60 max-w-[75px] truncate">
              <Layers size={9} className="text-blue-500 shrink-0" /> {uList[0]}
            </span>
            {uList.length > 1 && (
              <span className="inline-flex items-center px-1 py-0.5 rounded text-[9px] font-extrabold bg-blue-100 text-blue-800 border border-blue-300/60 shrink-0">
                +{uList.length - 1}
              </span>
            )}
          </div>
        );
      }
    },
    {
      header: getLabel('master_aplikasi_external', 'tagging', 'Tematik'),
      key: 'tagging',
      render: (item: AplikasiItem) => {
        const tList = item.nama_tematik_list || [];
        if (tList.length === 0) return <span className="text-slate-400 text-xs italic">-</span>;

        const fullTematikStr = tList.join(', ');
        return (
          <div className="flex items-center gap-1 cursor-help" title={`Daftar Tematik (${tList.length}): ${fullTematikStr}`}>
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200/60 max-w-[75px] truncate">
              <Sparkles size={9} className="text-purple-500 shrink-0" /> {tList[0]}
            </span>
            {tList.length > 1 && (
              <span className="inline-flex items-center px-1 py-0.5 rounded text-[9px] font-extrabold bg-purple-100 text-purple-800 border border-purple-300/60 shrink-0">
                +{tList.length - 1}
              </span>
            )}
          </div>
        );
      }
    },
    {
      header: getLabel('master_aplikasi_external', 'keterangan', 'Keterangan'),
      key: 'keterangan',
      render: (item: AplikasiItem) => (
        item.keterangan ? (
          <div className="text-xs text-slate-600 max-w-[120px] truncate leading-snug cursor-help" title={item.keterangan}>
            <span className="truncate">{item.keterangan}</span>
          </div>
        ) : (
          <span className="text-slate-400 text-xs italic">-</span>
        )
      )
    },
    {
      header: getLabel('master_aplikasi_external', 'url', 'URL'),
      key: 'url',
      render: (item: AplikasiItem) => (
        <div className="flex items-center gap-1 group/link max-w-[110px]">
          <span className="text-slate-600 truncate text-xs">{item.url}</span>
          <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 opacity-0 group-hover/link:opacity-100 transition-opacity shrink-0"><ExternalLink size={13} /></a>
        </div>
      )
    },
    {
      header: getLabel('master_aplikasi_external', 'sumber', 'Sumber'),
      key: 'sumber',
      render: (item: AplikasiItem) => (
        <span className="font-medium text-slate-600 text-xs truncate max-w-[90px] block" title={item.sumber || item.asal_instansi || '-'}>
          {item.sumber || item.asal_instansi || '-'}
        </span>
      )
    }
  ];

  const userBidangLabel = (user?.bidang_singkatan || user?.bidang_nama || 'Bidang Saya').toUpperCase();

  return (
    <BaseDataTable<AplikasiItem>
      title="Master Link Eksternal"
      subtitle="Kelola link eksternal, urusan terkait, tematik, dan tooltip keterangan."
      data={filteredData}
      columns={columns}
      loading={loading}
      error={error}
      searchPlaceholder="Cari link, urusan, tematik..."
      addButtonLabel="Tambah Link"
      onAddClick={() => setIsAdding(true)}
      isReorderable={canReorder}
      onReorder={handleReorder}
      editingId={editingId}
      searchKey={(item) => `${item.nama_aplikasi} ${item.nama_tipe_link || ''} ${(item.nama_urusan_list || []).join(' ')} ${(item.nama_tematik_list || []).join(' ')} ${item.keterangan || ''} ${item.url} ${item.sumber || item.asal_instansi || ''}`}
      renderHeaderButtons={
        <div className="flex flex-wrap items-center gap-2">
          {/* Filter Bidang Group */}
          <div className="flex items-center gap-1 bg-slate-100/90 p-1 rounded-xl border border-slate-200/80 text-xs">
            <button
              type="button"
              onClick={() => setSelectedBidangId('ALL')}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-extrabold transition-all flex items-center gap-1.5 ${
                selectedBidangId === 'ALL'
                  ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/60'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Building2 size={13} />
              Semua Bidang
            </button>

            {user?.bidang_id && (
              <button
                type="button"
                onClick={() => setSelectedBidangId('MY_BIDANG')}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-extrabold transition-all flex items-center gap-1.5 max-w-[210px] truncate ${
                  selectedBidangId === 'MY_BIDANG'
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/20'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title={`Filter berdasarkan ${userBidangLabel}`}
              >
                <Filter size={12} className="shrink-0" />
                <span className="truncate">{userBidangLabel}</span>
              </button>
            )}
          </div>

          <button onClick={() => setIsAdding(true)} className="btn-primary">
            <Plus size={16} /> Tambah Link
          </button>
        </div>
      }
      renderAddRow={() => isAdding && (
        <tr className="bg-blue-50/80">
          <td className="p-2 border-b border-slate-100 text-slate-400 text-center font-mono text-xs">NEW</td>
          <td className="p-1.5 border-b border-slate-100">
            <input autoFocus type="text" className="input-modern py-1 px-2 text-xs w-full" placeholder="Nama link..." value={newForm.nama_aplikasi} onChange={e => setNewForm({ ...newForm, nama_aplikasi: e.target.value })} onKeyPress={e => e.key === 'Enter' && handleAdd()} />
          </td>
          <td className="p-1.5 border-b border-slate-100">
            <input type="date" className="input-modern py-1 px-1.5 text-xs w-full" value={newForm.tanggal_link} onChange={e => setNewForm({ ...newForm, tanggal_link: e.target.value })} />
          </td>
          <td className="p-1.5 border-b border-slate-100">
            <select className="input-modern py-1 px-1.5 text-xs w-full" value={newForm.tipe_link_id} onChange={e => setNewForm({ ...newForm, tipe_link_id: e.target.value })}>
              <option value="">-- Tipe --</option>
              {tipeLinkOptions.map(t => (
                <option key={t.id} value={t.id}>{getOptionLabel(t)}</option>
              ))}
            </select>
          </td>
          <td className="p-1.5 border-b border-slate-100">
            <MultiSelectDropdown
              label="Urusan"
              options={urusanOptions}
              selectedIds={newForm.urusan_ids}
              onChange={ids => setNewForm({ ...newForm, urusan_ids: ids })}
            />
          </td>
          <td className="p-1.5 border-b border-slate-100">
            <MultiSelectDropdown
              label="Tematik"
              options={tematikOptions}
              selectedIds={newForm.tematik_ids}
              onChange={ids => setNewForm({ ...newForm, tematik_ids: ids })}
            />
          </td>
          <td className="p-1.5 border-b border-slate-100">
            <textarea
              className="input-modern py-1 px-2 min-h-[36px] text-xs resize-y w-full leading-relaxed"
              rows={1}
              placeholder="Keterangan..."
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
          <td className="p-1.5 border-b border-slate-100">
            <input type="text" className="input-modern py-1 px-2 text-xs w-full" placeholder="https://..." value={newForm.url} onChange={e => setNewForm({ ...newForm, url: e.target.value })} onKeyPress={e => e.key === 'Enter' && handleAdd()} />
          </td>
          <td className="p-1.5 border-b border-slate-100">
            <input type="text" className="input-modern py-1 px-2 text-xs w-full" placeholder="Sumber..." value={newForm.sumber} onChange={e => setNewForm({ ...newForm, sumber: e.target.value })} onKeyPress={e => e.key === 'Enter' && handleAdd()} />
          </td>
          <td className="p-1.5 border-b border-slate-100">
            <div className="flex justify-center gap-1">
              <button onClick={handleAdd} className="text-slate-400 hover:text-emerald-600 p-1 hover:bg-emerald-50 rounded-full"><Check size={16} /></button>
              <button onClick={() => { setIsAdding(false); }} className="text-slate-400 hover:text-rose-600 p-1 hover:bg-rose-50 rounded-full"><X size={16} /></button>
            </div>
          </td>
        </tr>
      )}
      renderEditRow={(item) => (
        <tr key={item.id} className="bg-indigo-50/30">
          <td className="p-2 border-b border-slate-100 font-mono text-xs text-slate-500 text-center">{item.id}</td>
          <td className="p-1.5 border-b border-slate-100">
            <input autoFocus type="text" className="input-modern py-1 px-2 text-xs w-full" value={editForm.nama_aplikasi} onChange={e => setEditForm({ ...editForm, nama_aplikasi: e.target.value })} onKeyPress={e => e.key === 'Enter' && handleUpdate(Number(item.id))} />
          </td>
          <td className="p-1.5 border-b border-slate-100">
            <input type="date" className="input-modern py-1 px-1.5 text-xs w-full" value={editForm.tanggal_link || ''} onChange={e => setEditForm({ ...editForm, tanggal_link: e.target.value })} />
          </td>
          <td className="p-1.5 border-b border-slate-100">
            <select className="input-modern py-1 px-1.5 text-xs w-full" value={editForm.tipe_link_id} onChange={e => setEditForm({ ...editForm, tipe_link_id: e.target.value })}>
              <option value="">-- Tipe --</option>
              {tipeLinkOptions.map(t => (
                <option key={t.id} value={t.id}>{getOptionLabel(t)}</option>
              ))}
            </select>
          </td>
          <td className="p-1.5 border-b border-slate-100">
            <MultiSelectDropdown
              label="Urusan"
              options={urusanOptions}
              selectedIds={editForm.urusan_ids}
              onChange={ids => setEditForm({ ...editForm, urusan_ids: ids })}
            />
          </td>
          <td className="p-1.5 border-b border-slate-100">
            <MultiSelectDropdown
              label="Tematik"
              options={tematikOptions}
              selectedIds={editForm.tematik_ids}
              onChange={ids => setEditForm({ ...editForm, tematik_ids: ids })}
            />
          </td>
          <td className="p-1.5 border-b border-slate-100">
            <textarea
              className="input-modern py-1 px-2 min-h-[36px] text-xs resize-y w-full leading-relaxed"
              rows={1}
              placeholder="Keterangan..."
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
          <td className="p-1.5 border-b border-slate-100">
            <input type="text" className="input-modern py-1 px-2 text-xs w-full" value={editForm.url} onChange={e => setEditForm({ ...editForm, url: e.target.value })} onKeyPress={e => e.key === 'Enter' && handleUpdate(Number(item.id))} />
          </td>
          <td className="p-1.5 border-b border-slate-100">
            <input type="text" className="input-modern py-1 px-2 text-xs w-full" value={editForm.sumber} onChange={e => setEditForm({ ...editForm, sumber: e.target.value })} onKeyPress={e => e.key === 'Enter' && handleUpdate(Number(item.id))} />
          </td>
          <td className="p-1.5 border-b border-slate-100">
            <div className="flex justify-center gap-1">
              <button onClick={() => handleUpdate(Number(item.id))} className="text-slate-400 hover:text-emerald-600 p-1 hover:bg-emerald-50 rounded-full"><Check size={16} /></button>
              <button onClick={() => { setEditingId(null); }} className="text-slate-400 hover:text-rose-600 p-1 hover:bg-rose-50 rounded-full"><X size={16} /></button>
            </div>
          </td>
        </tr>
      )}
      renderActions={(item) => {
        const allowEdit = canEditItem(item);
        return (
          <div className="flex items-center justify-center gap-0.5">
            <button 
              type="button"
              className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 rounded-lg transition-colors cursor-help"
              title={formatHistoryTooltip(item)}
            >
              <Clock size={15} />
            </button>
            {allowEdit ? (
              <>
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
                  className="text-slate-400 hover:text-indigo-600 p-1 hover:bg-indigo-50/80 rounded-lg transition-colors"
                  title="Edit link"
                >
                  <Edit2 size={15} />
                </button>
                <button 
                  onClick={() => handleDelete(Number(item.id))} 
                  className="text-slate-400 hover:text-rose-600 p-1 hover:bg-rose-50/80 rounded-lg transition-colors"
                  title="Hapus link"
                >
                  <Trash2 size={15} />
                </button>
              </>
            ) : (
              <span className="text-slate-300 p-1 cursor-not-allowed inline-flex" title={`Link ini diinput oleh ${item.created_by_name || 'pengguna lain'}. Hanya penginput atau Admin yang dapat merubah.`}>
                <Edit2 size={15} className="opacity-40" />
              </span>
            )}
          </div>
        );
      }}
    />
  );
};

export default MasterAplikasiExternal;
