import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { api } from '@/src/services/api';
import { Edit2, Trash2, X, Check, ExternalLink, Link2, Layers, ChevronDown, ChevronRight, Sparkles, Info, Clock, Calendar, Building2, Filter, Plus, Zap, MoreVertical, Copy, Database, Star, Globe } from 'lucide-react';
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
  target_visibilitas?: 'ALL' | 'BIDANG' | 'PERSONAL' | string;
  is_quick_access?: number | boolean;
  is_qa_all?: number | boolean;
  is_qa_bidang?: number | boolean;
  is_qa_personal?: number | boolean;
  user_is_qa_personal?: number | boolean;
  created_at?: string;
  updated_at?: string;
  created_by?: number;
  updated_by?: number;
  created_by_name?: string;
  updated_by_name?: string;
  creator_bidang_id?: number | null;
  creator_nama_bidang?: string | null;
  creator_singkatan_bidang?: string | null;
  instansi_id?: number | null;
  urutan?: number;
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
  target_visibilitas: 'ALL' as 'ALL' | 'BIDANG' | 'PERSONAL',
  urusan_ids: [] as number[],
  tematik_ids: [] as number[],
  keterangan: '',
  tanggal_link: getTodayDate(),
  is_quick_access: 0,
  is_qa_all: 0,
  is_qa_bidang: 0,
  is_qa_personal: 0
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
  const [instansiOptions, setInstansiOptions] = useState<OptionItem[]>([]);
  const [selectedInstansiId, setSelectedInstansiId] = useState<number | 'ALL'>('ALL');
  const [selectedBidangId, setSelectedBidangId] = useState<number | 'ALL' | 'MY_BIDANG' | 'PERSONAL'>('MY_BIDANG');
  const [loading, setLoading] = useState(true);

  const roleId = Number(user?.tipe_user_id || (user as any)?.role_id || (user as any)?.roleId || 0);
  const roleName = String(user?.tipe_user_nama || (user as any)?.role_name || '').toLowerCase().trim();
  const username = String(user?.username || '').toLowerCase().trim();

  const isSuperadmin = roleId === 1 || roleName === 'superadmin' || roleName === 'super admin' || username === 'superadmin';
  const isSuperadminOrAdmin = isSuperadmin || roleId === 2 || roleName === 'admin instansi';

  const isKepalaOrSekretaris = useMemo(() => {
    if (!user) return false;
    const jab = String(user.jabatan_nama || (user as any).jabatan || '').toLowerCase();
    const isRealKepala = (jab.includes('kepala') && !jab.includes('bidang') && !jab.includes('sub bag') && !jab.includes('seksi') && !jab.includes('sub bidang')) || roleName.includes('kepala badan') || roleName.includes('kepala dinas');
    const isRealSekretaris = jab.includes('sekretaris') || roleName.includes('sekretaris');
    return isRealKepala || isRealSekretaris;
  }, [user, roleName]);

  const isBidangAuthority = useMemo(() => {
    if (!user) return false;
    const jab = String(user.jabatan_nama || (user as any).jabatan || '').toLowerCase();
    const isKabid = jab.includes('kabid') || jab.includes('kepala bidang');
    const isKatim = jab.includes('katim') || jab.includes('ketua tim');
    const isAdminBidang = roleName === 'admin bidang' || roleName.includes('admin bidang') || roleName.includes('verifikator') || jab.includes('admin bidang') || jab.includes('verifikator');
    return isKabid || isKatim || isAdminBidang || isSuperadminOrAdmin || isKepalaOrSekretaris;
  }, [user, roleName, isSuperadminOrAdmin, isKepalaOrSekretaris]);

  const [error, setError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [newForm, setNewForm] = useState({ ...emptyForm });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ ...emptyForm });
  const [activeBalloonId, setActiveBalloonId] = useState<number | null>(null);
  const [balloonPos, setBalloonPos] = useState<{ 
    top: number; 
    left: number;
    isFlippedVertical: boolean;
    isFlippedHorizontal: boolean;
    flipSubmenuLeft: boolean;
  } | null>(null);
  const [activeItem, setActiveItem] = useState<AplikasiItem | null>(null);
  const [showQaSubmenu, setShowQaSubmenu] = useState<boolean>(false);

  const handleToggleQaScope = async (item: AplikasiItem, scopeKey: 'is_qa_all' | 'is_qa_bidang' | 'is_qa_personal') => {
    try {
      if (scopeKey === 'is_qa_personal') {
        const res = await api.aplikasiExternal.togglePersonal(item.id);
        if (res && res.success) {
          const newVal = res.data?.user_is_qa_personal !== undefined ? res.data.user_is_qa_personal : (Number(item.user_is_qa_personal) === 1 ? 0 : 1);
          setActiveItem(prev => prev ? {
            ...prev,
            is_qa_personal: newVal,
            user_is_qa_personal: newVal
          } : null);
          fetchData();
        } else {
          alert(res?.message || 'Gagal mengubah Quick Access Personal');
        }
        return;
      }

      // Check level permission for QA Semua Bidang
      if (scopeKey === 'is_qa_all' && !isSuperadminOrAdmin && !isKepalaOrSekretaris) {
        alert('Akses ditolak. Hanya Superadmin/Admin, Kepala, atau Sekretaris yang dapat mengubah Quick Access Semua Bidang.');
        return;
      }

      // Check level permission for QA Bidang
      if (scopeKey === 'is_qa_bidang' && !isBidangAuthority) {
        alert('Akses ditolak. Hanya Kabid, Katim, Admin Bidang, Admin, Kepala, atau Sekretaris yang dapat mengubah Quick Access Bidang.');
        return;
      }

      const currentVal = Number(item[scopeKey]) === 1;
      const newQaAll = scopeKey === 'is_qa_all' ? (currentVal ? 0 : 1) : Number(item.is_qa_all || 0);
      const newQaBidang = scopeKey === 'is_qa_bidang' ? (currentVal ? 0 : 1) : Number(item.is_qa_bidang || 0);

      const payload = {
        nama_aplikasi: item.nama_aplikasi,
        url: item.url,
        is_qa_all: newQaAll,
        is_qa_bidang: newQaBidang,
        is_quick_access: (newQaAll || newQaBidang) ? 1 : 0
      };
      const res = await api.aplikasiExternal.update(item.id, payload);
      if (res && res.success) {
        setActiveItem(prev => prev ? {
          ...prev,
          is_qa_all: newQaAll,
          is_qa_bidang: newQaBidang,
          is_quick_access: (newQaAll || newQaBidang) ? 1 : 0
        } : null);
        fetchData();
      } else {
        alert(res?.message || 'Gagal mengubah Quick Access');
      }
    } catch {
      alert('Terjadi kesalahan saat mengubah Quick Access');
    }
  };

  useEffect(() => {
    const handleCloseBalloon = () => {
      setActiveBalloonId(null);
      setBalloonPos(null);
      setActiveItem(null);
    };
    if (activeBalloonId) {
      window.addEventListener('click', handleCloseBalloon);
      window.addEventListener('scroll', handleCloseBalloon, true);
    }
    return () => {
      window.removeEventListener('click', handleCloseBalloon);
      window.removeEventListener('scroll', handleCloseBalloon, true);
    };
  }, [activeBalloonId]);

  const [skpMappingItem, setSkpMappingItem] = useState<AplikasiItem | null>(null);
  const [skpMappingYear, setSkpMappingYear] = useState<number>(2026);
  const [skpMappingMonth, setSkpMappingMonth] = useState<number>(new Date().getMonth() + 1);
  const [skpMappingButir, setSkpMappingButir] = useState<string>('PENGELOLAAN DOKUMEN DAN TEKNOLOGI INFORMASI');
  const [isSavingSkp, setIsSavingSkp] = useState<boolean>(false);

  const handleToggleQuickAccess = async (item: AplikasiItem) => {
    try {
      const newStatus = Number(item.is_quick_access) === 1 ? 0 : 1;
      const res = await api.aplikasiExternal.update(item.id, {
        ...item,
        is_quick_access: newStatus
      });
      if (res && res.success) {
        fetchData();
      } else {
        alert(res?.message || 'Gagal mengubah status Quick Access');
      }
    } catch {
      alert('Terjadi kesalahan saat mengubah status Quick Access');
    }
  };

  const handleSaveSkpMapping = async () => {
    if (!skpMappingItem) return;
    const pegawaiId = user?.profil_pegawai_id || user?.id;
    const bidangId = user?.bidang_id || 1;

    setIsSavingSkp(true);
    try {
      const payload = {
        pegawai_id: pegawaiId,
        tahun: skpMappingYear,
        bidang_id: bidangId,
        kategori: 'pendukung',
        bulan: skpMappingMonth,
        butir_skp: skpMappingButir,
        doc_name: skpMappingItem.nama_aplikasi,
        link_url: skpMappingItem.url,
        status: 'Draft'
      };

      const res = await api.skp.savePegawaiRecord(payload);
      if (res && res.success) {
        alert(`Link "${skpMappingItem.nama_aplikasi}" berhasil dijadikan Bukti SKP / Catatan Kinerja untuk bulan ${skpMappingMonth} tahun ${skpMappingYear}`);
        setSkpMappingItem(null);
      } else {
        alert(res?.message || 'Gagal menyimpan link ke SKP');
      }
    } catch (err: any) {
      console.error('Failed to map link to SKP:', err);
      alert('Terjadi kesalahan saat menyimpan link ke SKP: ' + (err.message || 'Error'));
    } finally {
      setIsSavingSkp(false);
    }
  };

  const canEditItem = (item: AplikasiItem) => {
    if (!user) return false;
    const currentUserId = Number(user.id);
    const roleId = Number(user.tipe_user_id || (user as any).role_id || (user as any).roleId || 0);
    const roleName = String(user.tipe_user_nama || (user as any).role_name || '').toLowerCase().trim();
    const username = String(user.username || '').toLowerCase().trim();

    const isMasterAdmin = roleId === 1 || username === 'superadmin';
    if (isMasterAdmin) return true;

    const jab = String(user.jabatan_nama || (user as any).jabatan || '').toLowerCase();
    const isKepala = jab.includes('kepala') || jab.includes('kaban') || jab.includes('kadin');
    const isSekretaris = jab.includes('sekretaris') || jab.includes('sekban') || jab.includes('sekdin');
    const isKabid = jab.includes('kabid') || jab.includes('kepala bidang');
    const isKatim = jab.includes('katim') || jab.includes('ketua tim');
    const isAdminBidang = roleName === 'admin bidang' || roleName.includes('admin bidang') || roleName.includes('verifikator') || jab.includes('admin bidang') || jab.includes('verifikator');
    const isBidangAuthority = isKabid || isKatim || isAdminBidang;

    const isCreator = item.created_by && Number(item.created_by) === currentUserId;
    const isOwnBidang = user.bidang_id && item.creator_bidang_id && Number(user.bidang_id) === Number(item.creator_bidang_id);

    // Rule: Jika target_visibilitas = 'ALL' -> semua level pegawai bisa edit & hapus
    if (item.target_visibilitas === 'ALL') {
      return true;
    }

    // Rule: Jika target_visibilitas = 'BIDANG' -> semua pegawai di bidang yang sama bisa edit & hapus
    if (item.target_visibilitas === 'BIDANG' && isOwnBidang) {
      return true;
    }

    // Rule: Selebihnya (PERSONAL / default) -> pembuat, kaban/kadin/sekretaris, atau kabid/katim/admin bidang dari bidang yang sama
    if (isCreator || isKepala || isSekretaris || (isBidangAuthority && isOwnBidang)) {
      return true;
    }

    return false;
  };

  const canReorder = useMemo(() => {
    if (!user) return false;
    const roleId = Number((user as any).role_id || (user as any).roleId || user.tipe_user_id || 0);
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

      if (isSuperadmin) {
        try {
          const resInst = await api.instansiDaerah.getAll();
          if (resInst && resInst.success && Array.isArray(resInst.data)) {
            setInstansiOptions(resInst.data.map((i: any) => ({
              id: i.id,
              nama: i.singkatan || i.nama_instansi || i.nama || `Instansi #${i.id}`
            })));
          }
        } catch { /* ignored */ }
      }

    } catch {
      setError('Gagal mengambil data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const savedTab = sessionStorage.getItem('master_links_active_tab');
    if (savedTab) {
      setSelectedBidangId(savedTab as any);
      sessionStorage.removeItem('master_links_active_tab');
    }
    fetchData();
  }, []);

  // Filtered data based on selected Instansi & Bidang
  const filteredData = useMemo(() => {
    const currentUserId = user?.id ? Number(user.id) : null;
    const userBidangId = user?.bidang_id ? Number(user.bidang_id) : null;

    let result = data.filter(item => !item.url || !item.url.includes('/uploads/'));

    // Filter per instansi untuk Superadmin jika dipilih
    if (isSuperadmin && selectedInstansiId !== 'ALL') {
      result = result.filter(item => Number(item.instansi_id) === Number(selectedInstansiId));
    }

    let filteredResult = [];

    if (selectedBidangId === 'PERSONAL') {
      // Tab Personal: hanya tampilkan link yang di-pin ke Quick Access Personal milik sendiri,
      // atau link yang memang target_visibilitas = PERSONAL milik sendiri
      filteredResult = result.filter(item => {
        if (item.target_visibilitas === 'PERSONAL') return Number(item.created_by) === currentUserId;
        return Number(item.user_is_qa_personal) === 1 || (Number(item.is_qa_personal) === 1 && Number(item.created_by) === currentUserId);
      });
    } else if (selectedBidangId === 'ALL') {
      // Tab Semua Bidang: hanya tampilkan link yang dibagikan ke ALL instansi
      // Link BIDANG atau PERSONAL tidak muncul di sini
      filteredResult = result.filter(item => {
        const tv = item.target_visibilitas;
        // Link personal milik orang lain → sembunyikan
        if (tv === 'PERSONAL' && Number(item.created_by) !== currentUserId && !isSuperadminOrAdmin) return false;
        // Superadmin/admin lihat semua
        if (isSuperadminOrAdmin) return true;
        // Hanya tampilkan yang memang ALL
        return !tv || tv === 'ALL';
      });
    } else {
      const targetBidangId = selectedBidangId === 'MY_BIDANG' ? userBidangId : Number(selectedBidangId);
      filteredResult = result.filter(item => {
        const tv = item.target_visibilitas;
        // Sembunyikan PERSONAL milik orang lain
        if (tv === 'PERSONAL' && Number(item.created_by) !== currentUserId && !isSuperadminOrAdmin) return false;
        // Superadmin lihat semua
        if (isSuperadminOrAdmin) return true;
        // Link ALL → tampil di semua tab bidang
        if (!tv || tv === 'ALL') return true;
        // Link BIDANG → hanya tampil jika bidang pembuatnya cocok dengan filter
        if (tv === 'BIDANG') {
          if (targetBidangId && item.creator_bidang_id && Number(item.creator_bidang_id) === targetBidangId) return true;
          // Juga tampilkan link BIDANG milik sendiri jika sedang di tab bidang sendiri
          if (targetBidangId && userBidangId === targetBidangId && Number(item.created_by) === currentUserId) return true;
          return false;
        }
        return false;
      });
    }

    return [...filteredResult].sort((a, b) => Number(b.id) - Number(a.id));
  }, [data, selectedBidangId, selectedInstansiId, user, isSuperadmin, isSuperadminOrAdmin]);

  const handleAdd = async () => {
    if (!newForm.nama_aplikasi.trim() || !newForm.url.trim()) return;

    // Duplicate URL check
    const normalizeUrl = (u: string) => u.trim().toLowerCase().replace(/\/+$/, '');
    const duplicate = data.find(d => normalizeUrl(d.url) === normalizeUrl(newForm.url));
    if (duplicate) {
      alert(`⚠️ URL yang sama telah ada di Manajemen Link dengan nama:\n\n"${duplicate.nama_aplikasi}"\n\nSilakan gunakan nama yang berbeda atau periksa kembali link tersebut.`);
      return;
    }

    try {
      const payload = {
        ...newForm,
        tipe_link_id: newForm.tipe_link_id ? Number(newForm.tipe_link_id) : null,
        urusan_ids: newForm.urusan_ids,
        tematik_ids: newForm.tematik_ids,
        keterangan: newForm.keterangan.trim() || null,
        tanggal_link: newForm.tanggal_link || getTodayDate(),
        // is_qa_* murni dikelola via QAF, BUKAN dari form checkbox Bagikan ke
        is_qa_all: 0,
        is_qa_bidang: 0,
        is_qa_personal: 0,
        is_quick_access: 0
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

    // Duplicate URL check (exclude current item)
    const normalizeUrl = (u: string) => u.trim().toLowerCase().replace(/\/+$/, '');
    const duplicate = data.find(d => d.id !== id && normalizeUrl(d.url) === normalizeUrl(editForm.url));
    if (duplicate) {
      alert(`⚠️ URL yang sama telah ada di Manajemen Link dengan nama:\n\n"${duplicate.nama_aplikasi}"\n\nSilakan gunakan URL yang berbeda atau periksa kembali link tersebut.`);
      return;
    }

    try {
      const payload = {
        ...editForm,
        tipe_link_id: editForm.tipe_link_id ? Number(editForm.tipe_link_id) : null,
        urusan_ids: editForm.urusan_ids,
        tematik_ids: editForm.tematik_ids,
        keterangan: editForm.keterangan.trim() || null,
        tanggal_link: editForm.tanggal_link || null,
        // is_qa_* dipertahankan dari nilai database (tidak diubah oleh form checkbox Bagikan ke)
        is_qa_all: editForm.is_qa_all,
        is_qa_bidang: editForm.is_qa_bidang,
        is_qa_personal: editForm.is_qa_personal,
        is_quick_access: editForm.is_quick_access
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
      header: getLabel('master_aplikasi_external', 'nama_aplikasi', 'Nama Link / Aplikasi'),
      key: 'nama_aplikasi',
      render: (item: AplikasiItem) => {
        const isQaAll = Number(item.is_qa_all) === 1;
        const isQaBidang = Number(item.is_qa_bidang) === 1;
        const isQaPersonal = Number(item.user_is_qa_personal) === 1;
        const isQA = isQaAll || isQaBidang || isQaPersonal;

        const creatorBidangName = item.creator_singkatan_bidang || item.creator_nama_bidang || 'Bidang';

        return (
          <div className="flex flex-col gap-1 max-w-[200px] group/itemname relative py-0.5">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="font-bold text-slate-800 tracking-tight text-xs truncate" title={item.nama_aplikasi}>
                {item.nama_aplikasi}
              </span>
              {/* Icon petir QA – tooltip menampilkan di mana link ini di-pin di Quick Access */}
              {isQA && (() => {
                const qaParts: string[] = [];
                if (isQaAll) qaParts.push('Semua Bidang');
                if (isQaBidang) qaParts.push('Bidang Saya');
                if (isQaPersonal) qaParts.push('Personal');
                return (
                  <span
                    className="inline-flex items-center text-amber-500 shrink-0 cursor-help"
                    title={`Quick Access: ${qaParts.join(', ')}`}
                  >
                    <Zap size={11} className="fill-amber-400" />
                  </span>
                );
              })()}
              {item.keterangan && (
                <span className="text-slate-400 hover:text-indigo-600 transition-colors cursor-help shrink-0 p-1 -m-1 inline-flex items-center justify-center" title={`Keterangan: ${item.keterangan}`}>
                  <Info size={13} />
                </span>
              )}

              {/* 3-dots button visible on hover */}
              <div className="opacity-0 group-hover/itemname:opacity-100 transition-opacity relative shrink-0 ml-1">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (activeBalloonId === item.id) {
                      setActiveBalloonId(null);
                      setBalloonPos(null);
                      setActiveItem(null);
                    } else {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const spaceBelow = window.innerHeight - rect.bottom;
                      const spaceAbove = rect.top;
                      const spaceRight = window.innerWidth - rect.left;

                      const mainBalloonHeight = 36;
                      const submenuHeight = 120;
                      const balloonWidth = 176;
                      const submenuWidth = 176;

                      const isFlippedVertical = spaceBelow < (submenuHeight + 20) && spaceAbove > submenuHeight;
                      const isFlippedHorizontal = spaceRight < (balloonWidth + 20);
                      const flipSubmenuLeft = spaceRight < (balloonWidth + submenuWidth + 20);

                      let top = isFlippedVertical
                        ? rect.top - mainBalloonHeight - 4
                        : rect.bottom + 4;

                      let left = isFlippedHorizontal
                        ? rect.right - balloonWidth
                        : rect.left;

                      top = Math.max(10, Math.min(window.innerHeight - mainBalloonHeight - 10, top));
                      left = Math.max(10, Math.min(window.innerWidth - balloonWidth - 10, left));

                      setBalloonPos({
                        top,
                        left,
                        isFlippedVertical,
                        isFlippedHorizontal,
                        flipSubmenuLeft
                      });
                      setActiveBalloonId(item.id);
                      setActiveItem(item);
                    }
                  }}
                  className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-indigo-600 transition-colors"
                  title="Opsi QAF"
                >
                  <MoreVertical size={13} />
                </button>
              </div>
            </div>

            {/* Badges Dibagikan Ke – berdasarkan target_visibilitas (katalog), bukan Quick Access */}
            <div className="flex flex-wrap items-center gap-1">
              {(item.target_visibilitas === 'ALL' || (!item.target_visibilitas && (isQaAll || (!isQaPersonal && !isQaBidang)))) && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-amber-50 text-amber-700 border border-amber-200/70" title="Dibagikan untuk semua bidang di katalog master">
                  <Globe size={9} className="shrink-0" /> Semua Bidang
                </span>
              )}
              {item.target_visibilitas === 'BIDANG' && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-200/70" title={`Dibagikan untuk bidang: ${creatorBidangName}`}>
                  <Building2 size={9} className="shrink-0" /> {creatorBidangName}
                </span>
              )}
              {item.target_visibilitas === 'PERSONAL' && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-purple-50 text-purple-700 border border-purple-200/70" title="Link privat khusus milik Anda">
                  <Star size={9} className="shrink-0 fill-purple-400 text-purple-500" /> Personal
                </span>
              )}
            </div>
          </div>
        );
      }
    },
    {
      header: getLabel('master_aplikasi_external', 'url', 'URL'),
      key: 'url',
      render: (item: AplikasiItem) => (
        <div className="flex items-center gap-1 group/link max-w-[140px]">
          <span className="text-slate-600 truncate text-xs">{item.url}</span>
          <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 opacity-0 group-hover/link:opacity-100 transition-opacity shrink-0"><ExternalLink size={13} /></a>
        </div>
      )
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
      header: getLabel('master_aplikasi_external', 'sumber', 'Sumber'),
      key: 'sumber',
      render: (item: AplikasiItem) => (
        <span className="font-medium text-slate-600 text-xs truncate max-w-[90px] block" title={item.sumber || item.asal_instansi || '-'}>
          {item.sumber || item.asal_instansi || '-'}
        </span>
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
    }
  ];

  const userBidangLabel = (user?.bidang_singkatan || user?.bidang_nama || 'Bidang Saya').toUpperCase();

  return (
    <>
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
      editingId={editingId}
      searchKey={(item) => `${item.nama_aplikasi} ${item.nama_tipe_link || ''} ${(item.nama_urusan_list || []).join(' ')} ${(item.nama_tematik_list || []).join(' ')} ${item.keterangan || ''} ${item.url} ${item.sumber || item.asal_instansi || ''}`}
      renderHeaderButtons={
        <div className="flex flex-wrap items-center gap-2">
          {/* Filter Instansi (Superadmin Only) */}
          {isSuperadmin && (
            <div className="flex items-center gap-1.5 bg-slate-100/90 p-1 rounded-xl border border-slate-200/80 text-xs">
              <Building2 size={13} className="text-slate-400 ml-1.5 shrink-0" />
              <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider shrink-0">Instansi:</span>
              <select
                value={selectedInstansiId}
                onChange={(e) => setSelectedInstansiId(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
                className="px-2.5 py-1 rounded-lg text-[11px] font-extrabold bg-white text-slate-800 border border-slate-200/80 shadow-xs outline-none cursor-pointer hover:border-indigo-300 transition-colors"
              >
                <option value="ALL">Semua Instansi</option>
                {instansiOptions.map(inst => (
                  <option key={inst.id} value={inst.id}>{inst.nama}</option>
                ))}
              </select>
            </div>
          )}

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

            <button
              type="button"
              onClick={() => setSelectedBidangId('PERSONAL')}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-extrabold transition-all flex items-center gap-1.5 ${
                selectedBidangId === 'PERSONAL'
                  ? 'bg-purple-600 text-white shadow-sm shadow-purple-500/20'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Filter link Quick Access Personal milik saya"
            >
              <Star size={12} className="shrink-0" />
              Personal
            </button>
          </div>

          <button onClick={() => setIsAdding(true)} className="btn-primary">
            <Plus size={16} /> Tambah Link
          </button>
        </div>
      }
      renderAddRow={() => isAdding && (
        <tr className="bg-blue-50/80">
          <td className="p-2 border-b border-slate-100 text-slate-400 text-center font-mono text-xs">NEW</td>
          {/* 1. Nama Link + 3 Checkboxes (Bagikan ke) */}
          <td className="p-1.5 border-b border-slate-100 min-w-[260px]">
            <input autoFocus type="text" className="input-modern py-1 px-2 text-xs w-full" placeholder="Nama link..." value={newForm.nama_aplikasi} onChange={e => setNewForm({ ...newForm, nama_aplikasi: e.target.value })} onKeyPress={e => e.key === 'Enter' && handleAdd()} />
            <div className="flex items-center gap-2 whitespace-nowrap mt-1.5 overflow-x-auto">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider shrink-0">Bagikan ke:</span>
              <label className="flex items-center gap-1 cursor-pointer text-[10px] font-bold text-slate-700 select-none shrink-0" title="Tampilkan untuk semua bidang di katalog master">
                <input
                  type="checkbox"
                  checked={newForm.target_visibilitas === 'ALL'}
                  onChange={() => setNewForm(prev => ({ ...prev, target_visibilitas: 'ALL' }))}
                  className="rounded text-amber-500 focus:ring-amber-400"
                />
                Semua Bidang
              </label>
              <label className="flex items-center gap-1 cursor-pointer text-[10px] font-bold text-slate-700 select-none shrink-0" title="Tampilkan untuk bidang saya saja di katalog master">
                <input
                  type="checkbox"
                  checked={newForm.target_visibilitas === 'BIDANG'}
                  onChange={() => setNewForm(prev => ({ ...prev, target_visibilitas: 'BIDANG' }))}
                  className="rounded text-indigo-500 focus:ring-indigo-400"
                />
                Bidang Saya
              </label>
              <label className="flex items-center gap-1 cursor-pointer text-[10px] font-bold text-slate-700 select-none shrink-0" title="Link privat khusus pribadi saya sendiri">
                <input
                  type="checkbox"
                  checked={newForm.target_visibilitas === 'PERSONAL'}
                  onChange={() => setNewForm(prev => ({ ...prev, target_visibilitas: 'PERSONAL' }))}
                  className="rounded text-purple-500 focus:ring-purple-400"
                />
                Personal
              </label>
            </div>
          </td>
          {/* 2. URL */}
          <td className="p-1.5 border-b border-slate-100">
            <input type="text" className="input-modern py-1 px-2 text-xs w-full" placeholder="URL..." value={newForm.url} onChange={e => setNewForm({ ...newForm, url: e.target.value })} onKeyPress={e => e.key === 'Enter' && handleAdd()} />
          </td>
          {/* 3. Keterangan */}
          <td className="p-1.5 border-b border-slate-100">
            <input type="text" className="input-modern py-1 px-2 text-xs w-full" placeholder="Keterangan..." value={newForm.keterangan} onChange={e => setNewForm({ ...newForm, keterangan: e.target.value })} onKeyPress={e => e.key === 'Enter' && handleAdd()} />
          </td>
          {/* 4. Tipe Link */}
          <td className="p-1.5 border-b border-slate-100">
            <select className="input-modern py-1 px-1.5 text-xs w-full" value={newForm.tipe_link_id} onChange={e => setNewForm({ ...newForm, tipe_link_id: e.target.value })}>
              <option value="">-- Tipe --</option>
              {tipeLinkOptions.map(t => (
                <option key={t.id} value={t.id}>{getOptionLabel(t)}</option>
              ))}
            </select>
          </td>
          {/* 5. Urusan */}
          <td className="p-1.5 border-b border-slate-100">
            <MultiSelectDropdown
              label="Urusan"
              options={urusanOptions}
              selectedIds={newForm.urusan_ids}
              onChange={ids => setNewForm({ ...newForm, urusan_ids: ids })}
            />
          </td>
          {/* 6. Tematik */}
          <td className="p-1.5 border-b border-slate-100">
            <MultiSelectDropdown
              label="Tematik"
              options={tematikOptions}
              selectedIds={newForm.tematik_ids}
              onChange={ids => setNewForm({ ...newForm, tematik_ids: ids })}
            />
          </td>
          {/* 7. Sumber */}
          <td className="p-1.5 border-b border-slate-100">
            <input type="text" className="input-modern py-1 px-2 text-xs w-full" placeholder="Sumber..." value={newForm.sumber} onChange={e => setNewForm({ ...newForm, sumber: e.target.value })} onKeyPress={e => e.key === 'Enter' && handleAdd()} />
          </td>
          {/* 8. Tgl Link */}
          <td className="p-1.5 border-b border-slate-100">
            <input type="date" className="input-modern py-1 px-1.5 text-xs w-full" value={newForm.tanggal_link} onChange={e => setNewForm({ ...newForm, tanggal_link: e.target.value })} />
          </td>
          {/* 9. Aksi */}
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
          {/* 1. Nama Link + 3 Checkboxes (Bagikan ke) */}
          <td className="p-1.5 border-b border-slate-100 min-w-[260px]">
            <input autoFocus type="text" className="input-modern py-1 px-2 text-xs w-full" value={editForm.nama_aplikasi} onChange={e => setEditForm({ ...editForm, nama_aplikasi: e.target.value })} onKeyPress={e => e.key === 'Enter' && handleUpdate(Number(item.id))} />
            <div className="flex items-center gap-2 whitespace-nowrap mt-1.5 overflow-x-auto">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider shrink-0">Bagikan ke:</span>
              <label className="flex items-center gap-1 cursor-pointer text-[10px] font-bold text-slate-700 select-none shrink-0" title="Tampilkan untuk semua bidang di katalog master">
                <input
                  type="checkbox"
                  checked={editForm.target_visibilitas === 'ALL'}
                  onChange={() => setEditForm(prev => ({ ...prev, target_visibilitas: 'ALL' }))}
                  className="rounded text-amber-500 focus:ring-amber-400"
                />
                Semua Bidang
              </label>
              <label className="flex items-center gap-1 cursor-pointer text-[10px] font-bold text-slate-700 select-none shrink-0" title="Tampilkan untuk bidang saya saja di katalog master">
                <input
                  type="checkbox"
                  checked={editForm.target_visibilitas === 'BIDANG'}
                  onChange={() => setEditForm(prev => ({ ...prev, target_visibilitas: 'BIDANG' }))}
                  className="rounded text-indigo-500 focus:ring-indigo-400"
                />
                Bidang Saya
              </label>
              <label className="flex items-center gap-1 cursor-pointer text-[10px] font-bold text-slate-700 select-none shrink-0" title="Link privat khusus pribadi saya sendiri">
                <input
                  type="checkbox"
                  checked={editForm.target_visibilitas === 'PERSONAL'}
                  onChange={() => setEditForm(prev => ({ ...prev, target_visibilitas: 'PERSONAL' }))}
                  className="rounded text-purple-500 focus:ring-purple-400"
                />
                Personal
              </label>
            </div>
          </td>
          {/* 2. URL */}
          <td className="p-1.5 border-b border-slate-100">
            <input type="text" className="input-modern py-1 px-2 text-xs w-full" value={editForm.url} onChange={e => setEditForm({ ...editForm, url: e.target.value })} onKeyPress={e => e.key === 'Enter' && handleUpdate(Number(item.id))} />
          </td>
          {/* 3. Keterangan */}
          <td className="p-1.5 border-b border-slate-100">
            <input type="text" className="input-modern py-1 px-2 text-xs w-full" value={editForm.keterangan} onChange={e => setEditForm({ ...editForm, keterangan: e.target.value })} onKeyPress={e => e.key === 'Enter' && handleUpdate(Number(item.id))} />
          </td>
          {/* 4. Tipe Link */}
          <td className="p-1.5 border-b border-slate-100">
            <select className="input-modern py-1 px-1.5 text-xs w-full" value={editForm.tipe_link_id} onChange={e => setEditForm({ ...editForm, tipe_link_id: e.target.value })}>
              <option value="">-- Tipe --</option>
              {tipeLinkOptions.map(t => (
                <option key={t.id} value={t.id}>{getOptionLabel(t)}</option>
              ))}
            </select>
          </td>
          {/* 5. Urusan */}
          <td className="p-1.5 border-b border-slate-100">
            <MultiSelectDropdown
              label="Urusan"
              options={urusanOptions}
              selectedIds={editForm.urusan_ids}
              onChange={ids => setEditForm({ ...editForm, urusan_ids: ids })}
            />
          </td>
          {/* 6. Tematik */}
          <td className="p-1.5 border-b border-slate-100">
            <MultiSelectDropdown
              label="Tematik"
              options={tematikOptions}
              selectedIds={editForm.tematik_ids}
              onChange={ids => setEditForm({ ...editForm, tematik_ids: ids })}
            />
          </td>
          {/* 7. Sumber */}
          <td className="p-1.5 border-b border-slate-100">
            <input type="text" className="input-modern py-1 px-2 text-xs w-full" value={editForm.sumber} onChange={e => setEditForm({ ...editForm, sumber: e.target.value })} onKeyPress={e => e.key === 'Enter' && handleUpdate(Number(item.id))} />
          </td>
          {/* 8. Tgl Link */}
          <td className="p-1.5 border-b border-slate-100">
            <input type="date" className="input-modern py-1 px-1.5 text-xs w-full" value={editForm.tanggal_link || ''} onChange={e => setEditForm({ ...editForm, tanggal_link: e.target.value })} />
          </td>
          {/* 9. Aksi */}
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
                      target_visibilitas: (item.target_visibilitas || (Number(item.is_qa_personal) === 1 ? 'PERSONAL' : (Number(item.is_qa_bidang) === 1 ? 'BIDANG' : 'ALL'))) as 'ALL' | 'BIDANG' | 'PERSONAL',
                      urusan_ids: item.urusan_ids || [],
                      tematik_ids: item.tematik_ids || [],
                      keterangan: item.keterangan || '',
                      tanggal_link: item.tanggal_link || getTodayDate(),
                      is_quick_access: Number(item.is_quick_access) || 0,
                      is_qa_all: Number(item.is_qa_all) || 0,
                      is_qa_bidang: Number(item.is_qa_bidang) || 0,
                      is_qa_personal: Number(item.user_is_qa_personal !== undefined ? item.user_is_qa_personal : item.is_qa_personal) || 0
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

    {/* Portal Floating QAF Balloon Menu (Smart Viewport Positioning) */}
    {activeBalloonId && balloonPos && activeItem && createPortal(
      <div 
        style={{ top: balloonPos.top, left: balloonPos.left }}
        className={`fixed w-44 bg-white border border-slate-200/80 rounded-xl shadow-2xl z-[99999] p-1 space-y-0.5 animate-in zoom-in-95 duration-100 ${balloonPos.isFlippedVertical ? 'origin-bottom-left' : 'origin-top-left'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div 
          className="relative"
          onMouseEnter={() => setShowQaSubmenu(true)}
          onMouseLeave={() => setShowQaSubmenu(false)}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowQaSubmenu(!showQaSubmenu);
            }}
            className="w-full text-left px-2.5 py-1.5 text-[10px] font-bold text-slate-600 hover:bg-amber-50 hover:text-amber-700 rounded-lg transition-colors flex items-center justify-between gap-1.5"
          >
            <div className="flex items-center gap-1.5">
              <Zap size={12} className={(Number(activeItem.is_qa_all) === 1 || Number(activeItem.is_qa_bidang) === 1 || Number(activeItem.user_is_qa_personal !== undefined ? activeItem.user_is_qa_personal : activeItem.is_qa_personal) === 1) ? "fill-amber-400 text-amber-500" : "text-slate-400"} />
              Quick Access
            </div>
            {balloonPos.flipSubmenuLeft ? <ChevronRight size={11} className="text-slate-400 rotate-180" /> : <ChevronRight size={11} className="text-slate-400" />}
          </button>

          {/* 3 Checkboxes Submenu Popover */}
          {showQaSubmenu && (
            <div 
              className={`absolute ${balloonPos.flipSubmenuLeft ? 'right-full mr-1' : 'left-full ml-1'} ${balloonPos.isFlippedVertical ? 'bottom-0' : 'top-0'} w-44 bg-white border border-slate-200/90 rounded-xl shadow-2xl z-[100000] p-2 space-y-1.5 animate-in fade-in zoom-in-95 duration-100`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-[9px] font-black text-slate-400 uppercase tracking-wider px-1 pb-1 border-b border-slate-100">
                PILIH TARGET AKSES:
              </div>
              
              <label 
                className={`flex items-center gap-2 px-1.5 py-1 rounded-lg text-[10px] font-bold transition-colors ${(isSuperadminOrAdmin || isKepalaOrSekretaris) ? 'hover:bg-slate-50 cursor-pointer text-slate-700' : 'opacity-50 cursor-not-allowed text-slate-400'}`}
                title={!(isSuperadminOrAdmin || isKepalaOrSekretaris) ? 'Hanya Superadmin/Admin, Kepala, atau Sekretaris yang dapat mengubah' : ''}
              >
                <input 
                  type="checkbox" 
                  disabled={!(isSuperadminOrAdmin || isKepalaOrSekretaris)}
                  checked={Number(activeItem.is_qa_all) === 1}
                  onChange={() => handleToggleQaScope(activeItem, 'is_qa_all')}
                  className="w-3.5 h-3.5 rounded text-amber-500 focus:ring-amber-400"
                />
                Semua Bidang
              </label>

              <label 
                className={`flex items-center gap-2 px-1.5 py-1 rounded-lg text-[10px] font-bold transition-colors ${isBidangAuthority ? 'hover:bg-slate-50 cursor-pointer text-slate-700' : 'opacity-50 cursor-not-allowed text-slate-400'}`}
                title={!isBidangAuthority ? 'Hanya Kabid, Katim, Admin Bidang, Admin, Kepala, atau Sekretaris yang dapat mengubah' : ''}
              >
                <input 
                  type="checkbox" 
                  disabled={!isBidangAuthority}
                  checked={Number(activeItem.is_qa_bidang) === 1}
                  onChange={() => handleToggleQaScope(activeItem, 'is_qa_bidang')}
                  className="w-3.5 h-3.5 rounded text-amber-500 focus:ring-amber-400"
                />
                Bidang Saya
              </label>

              <label className="flex items-center gap-2 px-1.5 py-1 rounded-lg hover:bg-slate-50 cursor-pointer text-[10px] font-bold text-slate-700 transition-colors" title="Semua user bebas menambahkan link ini ke Quick Access Personal masing-masing">
                <input 
                  type="checkbox" 
                  checked={Number(activeItem.user_is_qa_personal) === 1}
                  onChange={() => handleToggleQaScope(activeItem, 'is_qa_personal')}
                  className="w-3.5 h-3.5 rounded text-purple-600 focus:ring-purple-400 cursor-pointer"
                />
                Personal
              </label>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setActiveBalloonId(null);
            if (activeItem.url) {
              navigator.clipboard.writeText(activeItem.url);
              alert(`Link "${activeItem.nama_aplikasi}" berhasil disalin ke clipboard!`);
            }
          }}
          className="w-full text-left px-2.5 py-1.5 text-[10px] font-bold text-slate-600 hover:bg-emerald-50 hover:text-emerald-600 rounded-lg transition-colors flex items-center gap-1.5"
        >
          <Copy size={12} />
          Salin Link Publik
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setActiveBalloonId(null);
            setSkpMappingItem(activeItem);
            setSkpMappingYear(2026);
            setSkpMappingMonth(new Date().getMonth() + 1);
            setSkpMappingButir('PENGELOLAAN DOKUMEN DAN TEKNOLOGI INFORMASI');
          }}
          className="w-full text-left px-2.5 py-1.5 text-[10px] font-bold text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg transition-colors flex items-center gap-1.5"
        >
          <Database size={12} />
          Jadikan SKP
        </button>
      </div>,
      document.body
    )}

    {/* Modal Jadikan SKP */}
    {skpMappingItem && (
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[99999] flex items-center justify-center p-4 animate-in fade-in duration-200">
        <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 relative animate-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                <Database size={18} />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-800 tracking-tight">Jadikan SKP</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5 truncate max-w-[240px]" title={skpMappingItem.nama_aplikasi}>
                  {skpMappingItem.nama_aplikasi}
                </p>
              </div>
            </div>
            <button 
              onClick={() => setSkpMappingItem(null)}
              className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          <div className="space-y-4 mb-6">
            {/* Tahun */}
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Tahun SKP</label>
              <select 
                value={skpMappingYear}
                onChange={(e) => setSkpMappingYear(Number(e.target.value))}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200/50 rounded-2xl text-xs font-bold text-slate-700 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer"
              >
                {[2024, 2025, 2026, 2027].map(yr => (
                  <option key={yr} value={yr}>{yr}</option>
                ))}
              </select>
            </div>

            {/* Bulan */}
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Bulan</label>
              <select 
                value={skpMappingMonth}
                onChange={(e) => setSkpMappingMonth(Number(e.target.value))}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200/50 rounded-2xl text-xs font-bold text-slate-700 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer"
              >
                {[
                  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
                  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
                ].map((m, idx) => (
                  <option key={m} value={idx + 1}>{m}</option>
                ))}
              </select>
            </div>

            {/* Butir SKP */}
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Butir SKP</label>
              <input
                type="text"
                value={skpMappingButir}
                onChange={(e) => setSkpMappingButir(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200/50 rounded-2xl text-xs font-bold text-slate-700 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                placeholder="Masukkan nama butir kegiatan SKP..."
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={() => setSkpMappingItem(null)}
              className="w-1/2 py-2.5 px-4 rounded-2xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 transition-all"
            >
              Batal
            </button>
            <button 
              onClick={handleSaveSkpMapping}
              disabled={isSavingSkp}
              className="w-1/2 py-2.5 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-lg shadow-indigo-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSavingSkp ? 'Menyimpan...' : 'Simpan SKP'}
            </button>
          </div>
        </div>
      </div>
    )}
  </>
  );
};

export default MasterAplikasiExternal;
