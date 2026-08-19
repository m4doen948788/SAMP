import React, { useState, useEffect, useMemo } from 'react';
import { Zap, ExternalLink, Sparkles, Layers, Info, Building2, Filter, Clock, Calendar, Plus, Link2, Star, Edit2, Trash2, X, Check } from 'lucide-react';
import { api } from '@/src/services/api';
import { useAuth } from '@/src/contexts/AuthContext';
import { useLabels } from '@/src/contexts/LabelContext';
import { BaseDataTable } from '@/src/features/common/components/BaseDataTable';

interface AplikasiItem {
  id: number | string;
  nama_aplikasi: string;
  url: string;
  sumber?: string;
  asal_instansi?: string;
  tipe_link_id?: number | null;
  nama_tipe_link?: string;
  nama_urusan_list?: string[];
  nama_tematik_list?: string[];
  keterangan?: string | null;
  tanggal_link?: string | null;
  is_quick_access?: number | boolean;
  is_qa_all?: number | boolean;
  is_qa_bidang?: number | boolean;
  is_qa_personal?: number | boolean;
  user_is_qa_personal?: number | boolean;
  created_at?: string;
  updated_at?: string;
  created_by?: number;
  created_by_name?: string;
  updated_by_name?: string;
  creator_bidang_id?: number | null;
  creator_nama_bidang?: string | null;
  creator_singkatan_bidang?: string | null;
  is_menu?: boolean;
  action_page?: string | null;
  personal_urutan?: number;
  urusan_ids?: number[];
  tematik_ids?: number[];
}

const QuickAccessPage = () => {
  const { user } = useAuth();
  const { getLabel } = useLabels();
  const [data, setData] = useState<AplikasiItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBidangId, setSelectedBidangId] = useState<number | 'ALL' | 'MY_BIDANG' | 'PERSONAL'>('MY_BIDANG');
  const [instansiOptions, setInstansiOptions] = useState<any[]>([]);
  const [selectedInstansiId, setSelectedInstansiId] = useState<number | 'ALL'>('ALL');

  const roleId = Number(user?.tipe_user_id || (user as any)?.role_id || (user as any)?.roleId || 0);
  const roleName = String(user?.tipe_user_nama || (user as any)?.role_name || '').toLowerCase().trim();
  const username = String(user?.username || '').toLowerCase().trim();

  const isSuperadmin = roleId === 1 || roleName === 'superadmin' || roleName === 'super admin' || username === 'superadmin';
  const isSuperadminOrAdminInstansi = isSuperadmin || roleId === 2 || roleName === 'admin instansi';

  const [tipeLinkOptions, setTipeLinkOptions] = useState<any[]>([]);
  const [editingItem, setEditingItem] = useState<AplikasiItem | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState<boolean>(false);
  const [editForm, setEditForm] = useState({
    nama_aplikasi: '',
    url: '',
    sumber: '',
    keterangan: '',
    tipe_link_id: '',
    tanggal_link: '',
    is_qa_all: 0,
    is_qa_bidang: 0,
    is_qa_personal: 0
  });

  const [tipeLinkOptionsLoaded, setTipeLinkOptionsLoaded] = useState(false);
  const [tipeLinkOptionsLoading, setTipeLinkOptionsLoading] = useState(false);

  const loadTipeLinkOptionsLazy = async () => {
    if (tipeLinkOptionsLoaded || tipeLinkOptionsLoading) return;
    setTipeLinkOptionsLoading(true);
    try {
      const res = await api.tipeLink.getAll();
      if (res && res.success && Array.isArray(res.data)) {
        setTipeLinkOptions(res.data);
        setTipeLinkOptionsLoaded(true);
      }
    } catch (err) {
      console.error('Failed to load tipe link options lazily:', err);
    } finally {
      setTipeLinkOptionsLoading(false);
    }
  };

  useEffect(() => {
    if (editingItem !== null) {
      loadTipeLinkOptionsLazy();
    }
  }, [editingItem]);

  useEffect(() => {
    if (isSuperadmin) {
      api.instansiDaerah.getAll().then(res => {
        if (res && res.success && Array.isArray(res.data)) {
          setInstansiOptions(res.data.map((i: any) => ({
            id: i.id,
            nama: i.singkatan || i.nama_instansi || i.nama || `Instansi #${i.id}`
          })));
        }
      }).catch(() => {});
    }
  }, [isSuperadmin]);

  const canUserEditOrDelete = (item: AplikasiItem) => {
    if (!user || !item) return false;
    const currentUserId = user.id ? Number(user.id) : null;

    // Hanya Superadmin master yang bisa bypass semua
    const isMasterAdmin = roleId === 1 || username === 'superadmin';
    if (isMasterAdmin) return true;

    const jab = String((user as any).jabatan_nama || (user as any).jabatan || '').toLowerCase();
    const roleName = String((user as any).tipe_user_nama || (user as any).role_name || '').toLowerCase();

    const isKepala = jab.includes('kepala') || jab.includes('kaban') || jab.includes('kadin');
    const isSekretaris = jab.includes('sekretaris') || jab.includes('sekban') || jab.includes('sekdin');
    const isKabid = jab.includes('kabid') || jab.includes('kepala bidang');
    const isKatim = jab.includes('katim') || jab.includes('ketua tim');
    const isAdminBidang = roleName === 'admin bidang' || roleName.includes('admin bidang') || roleName.includes('verifikator') || jab.includes('admin bidang') || jab.includes('verifikator');

    const isCreator = currentUserId && item.created_by && Number(item.created_by) === currentUserId;

    // Rule 1: Tab Semua Bidang (ALL) -> Hanya Kepala dan Sekretaris yang bisa edit
    if (selectedBidangId === 'ALL') {
      return isKepala || isSekretaris;
    }

    // Rule 2: Tab Bidang -> Hanya Kabid, Katim, dan Admin Bidang yang bisa edit
    if (selectedBidangId === 'MY_BIDANG') {
      return isKabid || isKatim || isAdminBidang;
    }

    // Rule 3: Tab Personal -> Staff hanya bisa edit milik sendiri yang dia upload
    if (selectedBidangId === 'PERSONAL') {
      return isCreator;
    }

    return false;
  };

  const canUserDelete = (item: AplikasiItem) => {
    if (!user || !item) return false;
    if (selectedBidangId === 'PERSONAL') return true; // Di tab personal, siapapun boleh un-bookmark link favoritnya
    return canUserEditOrDelete(item);
  };

  const handleOpenEditModal = (item: AplikasiItem) => {
    setEditingItem(item);
    setEditForm({
      nama_aplikasi: item.nama_aplikasi,
      url: item.url,
      sumber: item.sumber || item.asal_instansi || '',
      keterangan: item.keterangan || '',
      tipe_link_id: item.tipe_link_id ? String(item.tipe_link_id) : '',
      tanggal_link: item.tanggal_link ? item.tanggal_link.split('T')[0] : '',
      is_qa_all: Number(item.is_qa_all) || 0,
      is_qa_bidang: Number(item.is_qa_bidang) || 0,
      is_qa_personal: Number(item.user_is_qa_personal !== undefined ? item.user_is_qa_personal : item.is_qa_personal) || 0,
      // Pertahankan urusan dan tematik agar tidak hilang saat save edit di Quick Access
      urusan_ids: item.urusan_ids || [],
      tematik_ids: item.tematik_ids || []
    } as any);
  };

  const handleSaveEdit = async () => {
    if (!editingItem) return;
    if (!editForm.nama_aplikasi.trim() || !editForm.url.trim()) {
      alert('Nama aplikasi dan URL wajib diisi');
      return;
    }

    setIsSavingEdit(true);
    try {
      const payload = {
        ...editForm,
        tipe_link_id: editForm.tipe_link_id ? Number(editForm.tipe_link_id) : null,
        urusan_ids: (editForm as any).urusan_ids || [],
        tematik_ids: (editForm as any).tematik_ids || [],
        keterangan: editForm.keterangan.trim() || null,
        tanggal_link: editForm.tanggal_link || null,
        is_qa_all: editForm.is_qa_all ? 1 : 0,
        is_qa_bidang: editForm.is_qa_bidang ? 1 : 0,
        is_qa_personal: editForm.is_qa_personal ? 1 : 0,
        is_quick_access: (editForm.is_qa_all || editForm.is_qa_bidang || editForm.is_qa_personal) ? 1 : 0
      };

      const res = await api.aplikasiExternal.update(editingItem.id as number, payload);
      if (res && res.success) {
        setEditingItem(null);
        fetchData();
      } else {
        alert(res?.message || 'Gagal mengubah data link');
      }
    } catch {
      alert('Gagal mengubah data link');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDelete = async (item: AplikasiItem) => {
    if (item.is_menu) {
      if (!confirm(`Hapus menu "${item.nama_aplikasi}" dari Quick Access Personal Anda?`)) return;
      try {
        const menuId = Number(item.id.toString().replace('menu-', ''));
        const res = await api.menu.toggleQa(menuId);
        if (res && res.success) {
          fetchData();
          window.dispatchEvent(new CustomEvent('quick-access:changed'));
        } else {
          alert(res?.message || 'Gagal menghapus dari Personal Quick Access');
        }
      } catch {
        alert('Gagal menghapus dari Personal Quick Access');
      }
      return;
    }

    if (selectedBidangId === 'PERSONAL') {
      if (!confirm(`Hapus link "${item.nama_aplikasi}" dari Quick Access Personal Anda?`)) return;
      try {
        const res = await api.aplikasiExternal.togglePersonal(Number(item.id));
        if (res && res.success) {
          fetchData();
        } else {
          alert(res?.message || 'Gagal menghapus dari Personal Quick Access');
        }
      } catch {
        alert('Gagal menghapus dari Personal Quick Access');
      }
      return;
    }

    if (!confirm(`Apakah Anda yakin ingin menghapus link "${item.nama_aplikasi}"?`)) return;
    try {
      const res = await api.aplikasiExternal.delete(Number(item.id));
      if (res && res.success) {
        fetchData();
      } else {
        alert(res?.message || 'Gagal menghapus link');
      }
    } catch {
      alert('Gagal menghapus link');
    }
  };

  const checkCanReorder = (userObj: any, currentSelectedBidang: number | 'ALL' | 'MY_BIDANG' | 'PERSONAL') => {
    if (!userObj) return false;

    // Di tab Personal, pengguna bebas menaik-turunkan urutan link favorit pribadinya
    if (currentSelectedBidang === 'PERSONAL') return true;

    const roleId = Number(userObj.role_id || userObj.roleId || userObj.tipe_user_id || 0);
    const isSuperadminOrAdmin = roleId === 1 || roleId === 2 || Boolean(userObj.is_admin || userObj.isAdmin);
    if (isSuperadminOrAdmin) return true;

    const jab = String(userObj.jabatan_nama || userObj.jabatan || '').toLowerCase();
    const roleName = String(userObj.tipe_user_nama || userObj.role_name || '').toLowerCase();

    const isKepala = jab.includes('kepala') || jab.includes('kaban') || jab.includes('kadin');
    const isSekretaris = jab.includes('sekretaris') || jab.includes('sekban') || jab.includes('sekdin');
    const isKabid = jab.includes('kabid') || jab.includes('kepala bidang');
    const isKatim = jab.includes('katim') || jab.includes('ketua tim');
    const isAdminBidang = roleName.includes('admin') || jab.includes('admin bidang') || roleName.includes('verifikator');

    if (currentSelectedBidang === 'ALL') {
      return isKepala || isSekretaris;
    }

    return isKabid || isKatim || isAdminBidang || isKepala || isSekretaris;
  };

  const canReorder = useMemo(() => {
    return checkCanReorder(user, selectedBidangId);
  }, [user, selectedBidangId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resLinks, resMenus] = await Promise.all([
        api.aplikasiExternal.getAll(),
        api.menu.getAll()
      ]);
      
      let combined: any[] = [];
      if (resLinks && resLinks.success && Array.isArray(resLinks.data)) {
        combined = [...resLinks.data];
      }
      
      if (resMenus && resMenus.success && Array.isArray(resMenus.data)) {
        const qaMenus = resMenus.data
          .filter((m: any) => 
            m.is_quick_access === 1 || 
            m.is_quick_access === true ||
            Number(m.is_qa_all) === 1 ||
            Number(m.is_qa_bidang) === 1
          )
          .map((m: any) => ({
            id: `menu-${m.id}`,
            nama_aplikasi: m.nama_menu,
            url: m.action_page || '#',
            is_menu: true,
            action_page: m.action_page,
            is_quick_access: m.is_quick_access,
            is_qa_all: Number(m.is_qa_all || 0),
            is_qa_bidang: Number(m.is_qa_bidang || 0),
            is_qa_personal: 1,
            user_is_qa_personal: m.is_quick_access,
            creator_bidang_id: m.creator_bidang_id || null,
            created_by: m.created_by || null,
            personal_urutan: m.urutan || 0,
            qa_urutan: m.urutan || 0,
            keterangan: 'Fitur Aplikasi Internal'
          }));
        combined = [...combined, ...qaMenus];
      }
      
      setData(combined);
    } catch {
      setError('Gagal mengambil data Quick Access');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const savedTab = sessionStorage.getItem('qa_active_tab');
    if (savedTab) {
      setSelectedBidangId(savedTab as any);
      sessionStorage.removeItem('qa_active_tab');
    }
    fetchData();
  }, []);

  const filteredData = useMemo(() => {
    const currentUserId = user?.id ? Number(user.id) : null;
    const userBidangId = user?.bidang_id ? Number(user.bidang_id) : null;

    let result = data;

    // Filter per instansi untuk Superadmin jika dipilih
    if (isSuperadmin && selectedInstansiId !== 'ALL') {
      result = result.filter(item => Number((item as any).instansi_id) === Number(selectedInstansiId));
    }

    let filteredResult = [];

    if (selectedBidangId === 'PERSONAL') {
      filteredResult = result.filter(item => Number(item.user_is_qa_personal) === 1 || (Number(item.is_qa_personal) === 1 && Number(item.created_by) === currentUserId));
    } else if (selectedBidangId === 'ALL') {
      filteredResult = result.filter(item => Number(item.is_qa_all) === 1);
    } else {
      const targetBidangId = selectedBidangId === 'MY_BIDANG' ? userBidangId : Number(selectedBidangId);
      filteredResult = result.filter(item => {
        const isPinnedToAll = Number(item.is_qa_all) === 1;
        const isPinnedToBidang = Number(item.is_qa_bidang) === 1;

        if (isPinnedToAll) return true;

        if (isPinnedToBidang) {
          if (targetBidangId && item.creator_bidang_id && Number(item.creator_bidang_id) === targetBidangId) return true;
          if (targetBidangId && userBidangId === targetBidangId && item.created_by && Number(item.created_by) === currentUserId) return true;
        }

        return false;
      });
    }

    // Sort accordingly
    if (selectedBidangId === 'PERSONAL') {
      return [...filteredResult].sort((a, b) => {
        const ordA = Number((a as any).personal_urutan || 0);
        const ordB = Number((b as any).personal_urutan || 0);
        if (ordA !== ordB) return ordA - ordB;
        const idA = typeof a.id === 'string' && a.id.startsWith('menu-') ? Number(a.id.replace('menu-', '')) * 1000 : Number(a.id);
        const idB = typeof b.id === 'string' && b.id.startsWith('menu-') ? Number(b.id.replace('menu-', '')) * 1000 : Number(b.id);
        return idB - idA;
      });
    } else {
      return [...filteredResult].sort((a, b) => {
        const ordA = (a as any).qa_urutan !== undefined && (a as any).qa_urutan !== 0 ? Number((a as any).qa_urutan) : Number(a.urutan || 0);
        const ordB = (b as any).qa_urutan !== undefined && (b as any).qa_urutan !== 0 ? Number((b as any).qa_urutan) : Number(b.urutan || 0);
        if (ordA !== ordB) return ordA - ordB;
        const idA = typeof a.id === 'string' && a.id.startsWith('menu-') ? Number(a.id.replace('menu-', '')) * 1000 : Number(a.id);
        const idB = typeof b.id === 'string' && b.id.startsWith('menu-') ? Number(b.id.replace('menu-', '')) * 1000 : Number(b.id);
        return idB - idA;
      });
    }
  }, [data, selectedBidangId, selectedInstansiId, user, isSuperadminOrAdminInstansi]);

  const handleReorder = async (reorderedItems: AplikasiItem[]) => {
    console.log('[QuickAccessPage-Reorder] handleReorder called. reorderedItems IDs:', reorderedItems.map(item => item.id));
    
    // 1. Assign the new urutan values to the reorderedItems so useMemo sorts correctly immediately
    const updatedReorderedItems = reorderedItems.map((item, idx) => {
      if (selectedBidangId === 'PERSONAL') {
        return {
          ...item,
          personal_urutan: idx + 1
        };
      } else {
        return {
          ...item,
          qa_urutan: idx + 1
        };
      }
    });

    console.log('[QuickAccessPage-Reorder] updatedReorderedItems with personal_urutan:', updatedReorderedItems.map(item => ({ id: item.id, personal_urutan: item.personal_urutan })));

    // 2. Merge the reordered items back into the full data array, preserving the other items and positions
    const reorderedIds = new Set(updatedReorderedItems.map(item => item.id));
    let reorderedPtr = 0;
    
    const newData = data.map(item => {
      if (reorderedIds.has(item.id)) {
        return updatedReorderedItems[reorderedPtr++];
      }
      return item;
    });

    console.log('[QuickAccessPage-Reorder] newData IDs in state:', newData.map(item => item.id));
    setData(newData);
    
    try {
      const externalPayload = updatedReorderedItems
        .filter(item => !item.is_menu)
        .map((item) => ({
          id: Number(item.id),
          urutan: selectedBidangId === 'PERSONAL' ? Number(item.personal_urutan || 0) : Number((item as any).qa_urutan || 0)
        }));
      
      const menuPayload = updatedReorderedItems
        .filter(item => item.is_menu)
        .map((item) => ({
          id: Number(item.id.toString().replace('menu-', '')),
          urutan: selectedBidangId === 'PERSONAL' ? Number(item.personal_urutan || 0) : Number((item as any).qa_urutan || 0)
        }));

      console.log('[QuickAccessPage-Reorder] Sending externalPayload:', JSON.stringify(externalPayload));
      console.log('[QuickAccessPage-Reorder] Sending menuPayload:', JSON.stringify(menuPayload));

      if (externalPayload.length > 0) {
        await api.aplikasiExternal.reorder(externalPayload, String(selectedBidangId));
      }
      
      if (menuPayload.length > 0) {
        await api.menu.reorder(menuPayload);
      }

      window.dispatchEvent(new CustomEvent('quick-access:changed'));
    } catch (err) {
      console.error('Failed to save reorder on Quick Access:', err);
      fetchData();
    }
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

  const userBidangLabel = (user?.bidang_singkatan || user?.bidang_nama || 'Bidang Saya').toUpperCase();

  const columns = [
    {
      header: getLabel('master_aplikasi_external', 'nama_aplikasi', 'Nama Link / Aplikasi'),
      key: 'nama_aplikasi',
      render: (item: AplikasiItem) => (
        <div className="flex items-center gap-1.5 max-w-[180px]" title={item.keterangan || item.nama_aplikasi}>
          <span className="font-bold text-slate-800 tracking-tight text-xs truncate">
            {item.nama_aplikasi}
          </span>
          {item.keterangan && (
            <span className="text-slate-400 hover:text-indigo-600 transition-colors cursor-help shrink-0 p-1 -m-1 inline-flex items-center justify-center" title={`Keterangan: ${item.keterangan}`}>
              <Info size={13} />
            </span>
          )}
        </div>
      )
    },
    {
      header: getLabel('master_aplikasi_external', 'sumber', 'Sumber / Instansi'),
      key: 'sumber',
      render: (item: AplikasiItem) => (
        <span className="font-semibold text-slate-600 text-xs truncate max-w-[110px] block" title={item.sumber || item.asal_instansi || '-'}>
          {item.sumber || item.asal_instansi || '-'}
        </span>
      )
    },
    {
      header: getLabel('master_aplikasi_external', 'tipe_link_id', 'Tipe Link'),
      key: 'nama_tipe_link',
      render: (item: AplikasiItem) => (
        item.nama_tipe_link ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60 whitespace-nowrap">
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
        return (
          <div className="flex items-center gap-1 cursor-help" title={`Daftar Urusan (${uList.length}):\n• ${uList.join('\n• ')}`}>
            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/60 max-w-[90px] truncate">
              <Layers size={10} className="text-blue-500 shrink-0" /> {uList[0]}
            </span>
            {uList.length > 1 && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-blue-100 text-blue-800 border border-blue-300/60 shrink-0">
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
        return (
          <div className="flex items-center gap-1 cursor-help" title={`Daftar Tematik (${tList.length}): ${tList.join(', ')}`}>
            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[10px] font-semibold bg-theme-accent/10 text-theme-accent border border-theme-accent/20 max-w-[90px] truncate">
              <Sparkles size={10} className="text-theme-accent shrink-0" /> {tList[0]}
            </span>
            {tList.length > 1 && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-theme-accent/20 text-theme-accent border border-theme-accent/30 shrink-0">
                +{tList.length - 1}
              </span>
            )}
          </div>
        );
      }
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
      header: getLabel('master_aplikasi_external', 'url', 'Buka Halaman'),
      key: 'url',
      render: (item: AplikasiItem) => (
        item.is_menu ? (
          <button 
            onClick={() => {
              if (item.action_page) {
                window.dispatchEvent(new CustomEvent('navigate-page', { detail: { page: item.action_page } }));
              }
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-indigo-50 hover:bg-indigo-600 text-indigo-600 hover:text-white font-bold text-xs transition-all shadow-sm group/btn cursor-pointer"
          >
            <span>Buka Fitur</span>
            <ExternalLink size={12} className="group-hover/btn:translate-x-0.5 transition-transform" />
          </button>
        ) : (
          <a 
            href={item.url} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-indigo-50 hover:bg-indigo-600 text-indigo-600 hover:text-white font-bold text-xs transition-all shadow-sm group/btn"
          >
            <span>Kunjungi</span>
            <ExternalLink size={12} className="group-hover/btn:translate-x-0.5 transition-transform" />
          </a>
        )
      )
    },
    {
      header: 'Aksi',
      key: 'actions',
      render: (item: AplikasiItem) => {
        if (item.is_menu) {
          return (
            <div className="flex items-center gap-1">
              <span className="text-slate-300 p-1 cursor-not-allowed inline-flex" title="Menu internal tidak dapat diedit">
                <Edit2 size={14} className="opacity-40" />
              </span>
              <button
                onClick={() => handleDelete(item)}
                className="text-slate-400 hover:text-rose-600 p-1 hover:bg-rose-50 rounded-lg transition-colors"
                title="Hapus dari Personal Quick Access"
              >
                <Trash2 size={14} />
              </button>
            </div>
          );
        }

        const canEdit = canUserEditOrDelete(item);
        const canDelete = canUserDelete(item);

        if (!canEdit && !canDelete) return <span className="text-slate-300 text-xs italic">-</span>;

        return (
          <div className="flex items-center gap-1">
            {canEdit ? (
              <button
                onClick={() => handleOpenEditModal(item)}
                className="text-slate-400 hover:text-indigo-600 p-1 hover:bg-indigo-50 rounded-lg transition-colors"
                title="Edit Quick Access"
              >
                <Edit2 size={14} />
              </button>
            ) : (
              <span className="text-slate-300 p-1 cursor-not-allowed inline-flex" title="Hanya uploader yang dapat mengedit link ini">
                <Edit2 size={14} className="opacity-40" />
              </span>
            )}
            {canDelete ? (
              <button
                onClick={() => handleDelete(item)}
                className="text-slate-400 hover:text-rose-600 p-1 hover:bg-rose-50 rounded-lg transition-colors"
                title={selectedBidangId === 'PERSONAL' ? "Hapus dari Personal Quick Access" : "Hapus Link"}
              >
                <Trash2 size={14} />
              </button>
            ) : (
              <span className="text-slate-300 p-1 cursor-not-allowed inline-flex" title="Anda tidak berwenang menghapus link ini">
                <Trash2 size={14} className="opacity-40" />
              </span>
            )}
          </div>
        );
      }
    }
  ];

  return (
    <div className="space-y-6">
      <BaseDataTable<AplikasiItem>
        title="Quick Access"
        subtitle="Portal tautan dan aplikasi kerja eksternal instansi."
        data={filteredData}
        columns={columns}
        loading={loading}
        isReorderable={canReorder}
        onReorder={canReorder ? handleReorder : undefined}
        renderHeaderButtons={
          <div className="flex items-center gap-2">
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
                    ? 'bg-theme-accent text-white shadow-sm shadow-theme-accent/20'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Filter link Quick Access Personal milik saya"
              >
                <Star size={13} className="shrink-0" />
                Personal
              </button>
            </div>

            <button
              onClick={() => window.dispatchEvent(new CustomEvent('navigate-page', { detail: { page: 'master-aplikasi-external' } }))}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5"
            >
              <Plus size={15} /> Kelola Link
            </button>
          </div>
        }
      />

      {/* Edit Modal */}
      {editingItem && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[99999] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 relative animate-in zoom-in-95 duration-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                  <Edit2 size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-800 tracking-tight">Edit Quick Access</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Ubah Detail Link</p>
                </div>
              </div>
              <button onClick={() => setEditingItem(null)} className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Nama Link / Aplikasi *</label>
                <input type="text" className="input-modern py-2 px-3 text-xs w-full" value={editForm.nama_aplikasi} onChange={e => setEditForm({ ...editForm, nama_aplikasi: e.target.value })} />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">URL *</label>
                <input type="text" className="input-modern py-2 px-3 text-xs w-full" value={editForm.url} onChange={e => setEditForm({ ...editForm, url: e.target.value })} />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Keterangan</label>
                <input type="text" className="input-modern py-2 px-3 text-xs w-full" value={editForm.keterangan} onChange={e => setEditForm({ ...editForm, keterangan: e.target.value })} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Tipe Link</label>
                  <select className="input-modern py-2 px-3 text-xs w-full cursor-pointer" value={editForm.tipe_link_id} onChange={e => setEditForm({ ...editForm, tipe_link_id: e.target.value })}>
                    <option value="">-- Pilih Tipe --</option>
                    {tipeLinkOptions.map(t => (
                      <option key={t.id} value={t.id}>{t.jenis_link || t.nama || `Tipe #${t.id}`}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Sumber / Instansi</label>
                  <input type="text" className="input-modern py-2 px-3 text-xs w-full" value={editForm.sumber} onChange={e => setEditForm({ ...editForm, sumber: e.target.value })} />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Bagikan ke:</label>
                <div className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200/60">
                  <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-slate-700">
                    <input type="checkbox" checked={Boolean(editForm.is_qa_all)} onChange={e => setEditForm(prev => ({ ...prev, is_qa_all: e.target.checked ? 1 : 0, ...(e.target.checked ? { is_qa_personal: 0 } : {}) }))} className="rounded text-amber-500" />
                    Semua Bidang
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-slate-700">
                    <input type="checkbox" checked={Boolean(editForm.is_qa_bidang)} onChange={e => setEditForm(prev => ({ ...prev, is_qa_bidang: e.target.checked ? 1 : 0, ...(e.target.checked ? { is_qa_personal: 0 } : {}) }))} className="rounded text-indigo-500" />
                    Bidang Saya
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-slate-700">
                    <input type="checkbox" checked={Boolean(editForm.is_qa_personal)} onChange={e => setEditForm(prev => ({ ...prev, is_qa_personal: e.target.checked ? 1 : 0, ...(e.target.checked ? { is_qa_all: 0, is_qa_bidang: 0 } : {}) }))} className="rounded text-theme-accent" />
                    Personal
                  </label>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button onClick={() => setEditingItem(null)} className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50">
                Batal
              </button>
              <button onClick={handleSaveEdit} disabled={isSavingEdit} className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md disabled:opacity-50">
                {isSavingEdit ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuickAccessPage;
