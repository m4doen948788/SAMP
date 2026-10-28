import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link as LinkIcon, ExternalLink, Sparkles, Layers, Info, Building2, Filter, GripVertical, ChevronLeft, ChevronRight, MoreVertical, Zap, Copy, Star, Globe, Search, X, LayoutGrid, List, Loader2, Plus } from 'lucide-react';
import { api } from '@/src/services/api';
import { useAuth } from '@/src/contexts/AuthContext';
import { QafPopover } from '@/src/components/shared/QafPopover';

interface AplikasiItem {
  id: number;
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
  target_visibilitas?: string;
  created_at?: string;
  created_by?: number;
  creator_bidang_id?: number | null;
  creator_nama_bidang?: string | null;
  creator_singkatan_bidang?: string | null;
}

const WorkLinksTable = () => {
  const { user } = useAuth();
  const [links, setLinks] = useState<AplikasiItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedBidangId, setSelectedBidangId] = useState<number | 'ALL' | 'MY_BIDANG'>('MY_BIDANG');
  const [bidangOptions, setBidangOptions] = useState<{ id: number; nama: string }[]>([]);
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 640);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isPwaOrTouch = isMobile || (typeof window !== 'undefined' && ('ontouchstart' in window || window.matchMedia('(display-mode: standalone)').matches));

  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    if (typeof window === 'undefined') return true;
    if (window.innerWidth < 1280) return true;
    return localStorage.getItem('sidebar_collapsed') !== 'true';
  });

  useEffect(() => {
    const updateSidebarState = () => {
      if (window.innerWidth < 1280) {
        setIsSidebarOpen(true);
      } else {
        const collapsed = localStorage.getItem('sidebar_collapsed') === 'true';
        setIsSidebarOpen(!collapsed);
      }
    };

    const handleSidebarChange = (e: any) => {
      if (e?.detail?.isCollapsed !== undefined) {
        setIsSidebarOpen(!e.detail.isCollapsed || window.innerWidth < 1280);
      } else {
        updateSidebarState();
      }
    };

    window.addEventListener('sidebar-collapsed-change', handleSidebarChange);
    window.addEventListener('sidebar:expand', () => setIsSidebarOpen(true));
    window.addEventListener('resize', updateSidebarState);
    return () => {
      window.removeEventListener('sidebar-collapsed-change', handleSidebarChange);
      window.removeEventListener('sidebar:expand', () => setIsSidebarOpen(true));
      window.removeEventListener('resize', updateSidebarState);
    };
  }, []);

  const itemsPerPage = viewMode === 'grid' ? 6 : (isMobile ? 6 : 7);

  // QAF Balloon Menu States
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

  const canReorder = useMemo(() => {
    if (!user) return false;
    const roleId = Number((user as any).role_id || (user as any).roleId || (user as any).tipe_user_id || 0);
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

  const fetchLinks = async () => {
    setLoading(true);
    try {
      const [res, resBidang] = await Promise.all([
        api.aplikasiExternal.getAll(),
        api.bidangInstansi.getAll().catch(() => null)
      ]);

      if (res && res.success && Array.isArray(res.data)) {
        setLinks(res.data);
      }

      if (resBidang && resBidang.success && Array.isArray(resBidang.data)) {
        const mapped = resBidang.data.map((b: any) => ({
          id: b.id,
          nama: (b.singkatan || b.nama_bidang || b.nama || `Bidang #${b.id}`).toUpperCase()
        }));
        setBidangOptions(mapped);
      }
    } catch (err) {
      console.error('Failed to fetch external links for WorkLinksTable', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLinks();
  }, []);

  // Authority & User profile strings for QAF checks
  const roleId = user ? Number((user as any).role_id || (user as any).roleId || (user as any).tipe_user_id || 0) : 0;
  const isSuperadminOrAdmin = roleId === 1 || roleId === 2 || Boolean((user as any)?.is_admin || (user as any)?.isAdmin);
  const jab = user ? String(user.jabatan_nama || (user as any).jabatan || '').toLowerCase() : '';
  const roleName = user ? String(user.tipe_user_nama || (user as any).role_name || '').toLowerCase() : '';

  const isKepalaOrSekretaris = jab.includes('kepala') || jab.includes('sekretaris');
  const isKabid = jab.includes('kabid') || jab.includes('kepala bidang');
  const isKatim = jab.includes('katim') || jab.includes('ketua tim');
  const isAdminBidang = roleName.includes('admin') || jab.includes('admin bidang') || roleName.includes('verifikator');
  const isBidangAuthority = isKabid || isKatim || isAdminBidang || isSuperadminOrAdmin || isKepalaOrSekretaris;

  // Auto-close QAF balloon on click or scroll
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

  // --- Long Press Support for Mobile/PWA ---
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressTriggeredRef = useRef(false);
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);

  const startLongPress = (e: React.TouchEvent, link: AplikasiItem) => {
    isLongPressTriggeredRef.current = false;
    const touch = e.touches[0];
    if (!touch) return;
    touchStartPosRef.current = { x: touch.clientX, y: touch.clientY };
    const targetElement = e.currentTarget as HTMLElement;

    longPressTimerRef.current = setTimeout(() => {
      isLongPressTriggeredRef.current = true;
      handleOpenQaf(e, link, targetElement);
    }, 450);
  };

  const cancelLongPress = (moveThresholdCheck?: React.TouchEvent) => {
    if (moveThresholdCheck && touchStartPosRef.current && moveThresholdCheck.touches[0]) {
      const moveX = Math.abs(moveThresholdCheck.touches[0].clientX - touchStartPosRef.current.x);
      const moveY = Math.abs(moveThresholdCheck.touches[0].clientY - touchStartPosRef.current.y);
      if (moveX < 10 && moveY < 10) {
        return;
      }
    }
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleOpenQaf = (
    e: React.MouseEvent | React.TouchEvent | { currentTarget?: HTMLElement | null; preventDefault?: () => void; stopPropagation?: () => void; cancelable?: boolean }, 
    link: AplikasiItem,
    targetElem?: HTMLElement | null
  ) => {
    if (e) {
      if (typeof e.stopPropagation === 'function') e.stopPropagation();
      if ((e as any).cancelable && typeof e.preventDefault === 'function') {
        e.preventDefault();
      }
    }
    if (activeBalloonId === link.id) {
      setActiveBalloonId(null);
      setBalloonPos(null);
      setActiveItem(null);
    } else {
      const el = targetElem || (e.currentTarget as HTMLElement);
      let rect: DOMRect | { top: number; bottom: number; left: number; right: number };
      if (el && typeof el.getBoundingClientRect === 'function') {
        rect = el.getBoundingClientRect();
      } else if ('touches' in e && (e as React.TouchEvent).touches && (e as React.TouchEvent).touches[0]) {
        const touch = (e as React.TouchEvent).touches[0];
        rect = { top: touch.clientY, bottom: touch.clientY + 20, left: touch.clientX, right: touch.clientX + 20 };
      } else {
        rect = { top: 120, bottom: 140, left: 20, right: 160 };
      }
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
      setActiveBalloonId(link.id);
      setActiveItem(link);
    }
  };

  const handleToggleQaScope = async (item: AplikasiItem, field: 'is_qa_all' | 'is_qa_bidang' | 'is_qa_personal') => {
    try {
      if (field === 'is_qa_all' && !(isSuperadminOrAdmin || isKepalaOrSekretaris)) {
        alert('Hanya Superadmin/Admin, Kepala, atau Sekretaris yang dapat mengubah visibilitas Semua Bidang');
        return;
      }
      if (field === 'is_qa_bidang' && !isBidangAuthority) {
        alert('Hanya Kabid, Katim, Admin Bidang, Admin, Kepala, atau Sekretaris yang dapat mengubah visibilitas Bidang Saya');
        return;
      }

      const currentQaAll = Number(item.is_qa_all) === 1;
      const currentQaBidang = Number(item.is_qa_bidang) === 1;
      const currentQaPersonal = Number(item.user_is_qa_personal !== undefined ? item.user_is_qa_personal : item.is_qa_personal) === 1;

      let newQaAll = currentQaAll;
      let newQaBidang = currentQaBidang;
      let newQaPersonal = currentQaPersonal;

      if (field === 'is_qa_personal') {
        const res = await api.aplikasiExternal.togglePersonal(item.id);
        if (res && res.success) {
          const newVal = res.data?.user_is_qa_personal !== undefined ? res.data.user_is_qa_personal : (currentQaPersonal ? 0 : 1);
          setLinks(prev => prev.map(l => l.id === item.id ? { 
            ...l, 
            is_qa_personal: newVal,
            user_is_qa_personal: newVal
          } : l));
          setActiveItem(prev => prev && prev.id === item.id ? {
            ...prev,
            is_qa_personal: newVal,
            user_is_qa_personal: newVal
          } : prev);
          window.dispatchEvent(new CustomEvent('quick-access:changed'));
          return;
        } else {
          alert(res?.message || 'Gagal mengubah status Quick Access Personal');
          return;
        }
      }

      if (field === 'is_qa_all') newQaAll = !currentQaAll;
      if (field === 'is_qa_bidang') newQaBidang = !currentQaBidang;

      const payload = {
        ...item,
        is_qa_all: newQaAll ? 1 : 0,
        is_qa_bidang: newQaBidang ? 1 : 0,
        is_qa_personal: newQaPersonal ? 1 : 0,
        is_quick_access: (newQaAll || newQaBidang || newQaPersonal) ? 1 : 0
      };

      const res = await api.aplikasiExternal.update(item.id, payload);
      if (res && res.success) {
        // Refresh local links state
        setLinks(prev => prev.map(l => l.id === item.id ? { 
          ...l, 
          is_qa_all: newQaAll ? 1 : 0,
          is_qa_bidang: newQaBidang ? 1 : 0,
          is_qa_personal: newQaPersonal ? 1 : 0,
          user_is_qa_personal: newQaPersonal ? 1 : 0,
          is_quick_access: (newQaAll || newQaBidang || newQaPersonal) ? 1 : 0
        } : l));
        
        setActiveItem(prev => prev && prev.id === item.id ? {
          ...prev,
          is_qa_all: newQaAll ? 1 : 0,
          is_qa_bidang: newQaBidang ? 1 : 0,
          is_qa_personal: newQaPersonal ? 1 : 0,
          user_is_qa_personal: newQaPersonal ? 1 : 0,
          is_quick_access: (newQaAll || newQaBidang || newQaPersonal) ? 1 : 0
        } : prev);
      } else {
        alert(res?.message || 'Gagal mengubah status Quick Access');
      }
    } catch (err) {
      console.error(err);
      alert('Terjadi kesalahan saat mengubah status Quick Access');
    }
  };

  const handleInputBaru = (e: React.MouseEvent) => {
    e.preventDefault();
    window.dispatchEvent(new CustomEvent('navigate-page', { detail: { page: 'master-aplikasi-external' } }));
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    const clean = String(dateStr).split(' ')[0].split('T')[0];
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

  // Filtered links based on selected Bidang (displays external links matching selected scope)
  const filteredLinks = useMemo(() => {
    const currentUserId = user?.id ? Number(user.id) : null;
    const userBidangId = user?.bidang_id ? Number(user.bidang_id) : null;

    let result = links;

    if (selectedBidangId === 'ALL') {
      // Tab Semua Bidang: tampilkan link yang target_visibilitas-nya ALL (atau kosong/fallback lama)
      result = links.filter(item => {
        const tv = item.target_visibilitas;
        return !tv || tv === 'ALL';
      });
    } else {
      const targetBidangId = selectedBidangId === 'MY_BIDANG' ? userBidangId : Number(selectedBidangId);

      result = links.filter(item => {
        const tv = item.target_visibilitas;

        // Link ALL selalu tampil di tab bidang manapun
        if (!tv || tv === 'ALL') return true;

        // Link BIDANG tampil jika bidang pembuat cocok dengan filter bidang aktif
        if (tv === 'BIDANG') {
          if (targetBidangId && item.creator_bidang_id && Number(item.creator_bidang_id) === targetBidangId) return true;
          if (targetBidangId && userBidangId === targetBidangId && item.created_by && Number(item.created_by) === currentUserId) return true;
        }

        return false;
      });
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(item => {
        const nameMatch = (item.nama_aplikasi || '').toLowerCase().includes(q);
        const descMatch = (item.keterangan || '').toLowerCase().includes(q);
        const urlMatch = (item.url || '').toLowerCase().includes(q);
        const sourceMatch = (item.sumber || item.asal_instansi || '').toLowerCase().includes(q);
        const tipeMatch = (item.nama_tipe_link || '').toLowerCase().includes(q);
        const creatorMatch = (item.creator_nama_bidang || item.creator_singkatan_bidang || '').toLowerCase().includes(q);
        return nameMatch || descMatch || urlMatch || sourceMatch || tipeMatch || creatorMatch;
      });
    }

    return result;
  }, [links, selectedBidangId, user, searchQuery]);

  const totalPages = Math.ceil(filteredLinks.length / itemsPerPage) || 1;

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedBidangId, searchQuery, viewMode]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [filteredLinks.length, totalPages, currentPage]);

  const paginatedLinks = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredLinks.slice(start, start + itemsPerPage);
  }, [filteredLinks, currentPage, itemsPerPage]);

  const isReorderActive = canReorder && !searchQuery.trim();

  const handleDragStart = (e: React.DragEvent, index: number) => {
    if (!isReorderActive) return;
    setDraggedIdx(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    if (!isReorderActive || draggedIdx === null || draggedIdx === index) return;
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, dropIndex: number) => {
    if (!isReorderActive || draggedIdx === null || draggedIdx === dropIndex) return;
    e.preventDefault();

    const newLinks = [...filteredLinks];
    const [movedItem] = newLinks.splice(draggedIdx, 1);
    newLinks.splice(dropIndex, 0, movedItem);

    setLinks(newLinks);
    setDraggedIdx(null);

    try {
      const payload = newLinks.map((item, idx) => ({
        id: Number(item.id),
        urutan: idx + 1
      }));
      await api.aplikasiExternal.reorder(payload);
    } catch (err) {
      console.error('Failed to save reorder on dashboard', err);
      fetchLinks();
    }
  };

  const handleHeaderClick = () => {
    sessionStorage.setItem('master_links_active_tab', String(selectedBidangId));
    window.dispatchEvent(new CustomEvent('navigate-page', { detail: { page: 'master-aplikasi-external' } }));
  };

  const userBidangLabel = (user?.bidang_singkatan || user?.bidang_nama || 'Bidang Saya').toUpperCase();

  const getAppBadge = (name: string, index: number) => {
    const palettes = [
      'bg-blue-50 text-blue-600 border-blue-100',
      'bg-emerald-50 text-emerald-600 border-emerald-100',
      'bg-amber-50 text-amber-600 border-amber-100',
      'bg-indigo-50 text-indigo-600 border-indigo-100',
      'bg-rose-50 text-rose-600 border-rose-100',
      'bg-purple-50 text-purple-600 border-purple-100',
    ];
    const initial = name ? name.trim().charAt(0).toUpperCase() : '?';
    return { cls: palettes[index % palettes.length], initial };
  };

  return (
    <div className="card-modern h-full lg:h-[450px] flex flex-col group/card justify-between overflow-hidden shadow-xs border border-slate-100 hover:shadow-md transition-all duration-300">
      <div className="flex flex-col gap-2.5 px-4 sm:px-6 py-3 border-b border-slate-100/80 bg-white group-hover/card:bg-slate-50/50 transition-colors shrink-0">
        {/* Top Header Row: Title on Left, Controls (Switcher & Buttons) on Right — Sejajar seperti Agenda & Kegiatan */}
        <div className="flex items-center justify-between gap-2 w-full">
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <div 
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-xs"
              style={{ backgroundColor: 'var(--theme-color-1, #0097fe)' }}
            >
              <LinkIcon size={17} strokeWidth={2.3} />
            </div>
            <div className="min-w-0">
              <h2 
                onClick={handleHeaderClick}
                className="text-xs sm:text-sm font-black text-slate-800 tracking-tight uppercase cursor-pointer hover:underline transition-colors whitespace-nowrap truncate max-w-[105px] xs:max-w-[150px] sm:max-w-none"
                title="Buka halaman Master Aplikasi & Link Kerja"
              >
                Direktori Link
              </h2>
            </div>
          </div>

          {/* Controls: Switcher & Baru — Sejajar dengan nama kartu */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 flex-nowrap">
            {/* Filter Bidang */}
            <div className="flex items-center gap-0.5 bg-slate-100/80 p-0.5 sm:p-1 rounded-xl border border-slate-200/60 text-xs shrink-0">
              <button
                type="button"
                onClick={() => setSelectedBidangId('ALL')}
                className={`px-2 py-1 rounded-lg text-[10px] font-extrabold transition-all flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap ${
                  selectedBidangId === 'ALL'
                    ? 'bg-white shadow-xs border border-slate-200/60 font-black'
                    : 'text-slate-400 hover:text-slate-700'
                }`}
                style={{
                  color: selectedBidangId === 'ALL' ? 'var(--theme-color-1, #0097fe)' : undefined
                }}
                title="Semua Bidang"
                aria-label="Semua Bidang"
              >
                <Building2 size={12} className="shrink-0" />
                {selectedBidangId === 'ALL' && <span>Semua</span>}
              </button>

              {user?.bidang_id && (
                <button
                  type="button"
                  onClick={() => setSelectedBidangId('MY_BIDANG')}
                  className={`px-2 py-1 rounded-lg text-[10px] font-extrabold transition-all flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap ${
                    selectedBidangId === 'MY_BIDANG'
                      ? 'bg-white shadow-xs border border-slate-200/60 font-black'
                      : 'text-slate-400 hover:text-slate-700'
                  }`}
                  style={{
                    color: selectedBidangId === 'MY_BIDANG' ? 'var(--theme-color-1, #0097fe)' : undefined
                  }}
                  title={`Filter berdasarkan ${userBidangLabel}`}
                  aria-label={`Filter berdasarkan ${userBidangLabel}`}
                >
                  <Filter size={11} className="shrink-0" />
                  {selectedBidangId === 'MY_BIDANG' && (
                    <span className="truncate max-w-[80px] sm:max-w-[120px]">{userBidangLabel}</span>
                  )}
                </button>
              )}
            </div>

            {/* View Mode Toggle Switcher */}
            <div className="flex items-center gap-0.5 bg-slate-100/80 p-0.5 rounded-xl border border-slate-200/60 shrink-0">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`p-1 sm:p-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'table' ? 'bg-white text-slate-800 shadow-2xs font-bold' : 'text-slate-400 hover:text-slate-700'
                }`}
                title="Tampilan Tabel"
              >
                <List size={12} />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-1 sm:p-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'grid' ? 'bg-white text-slate-800 shadow-2xs font-bold' : 'text-slate-400 hover:text-slate-700'
                }`}
                title="Tampilan Grid Ubin"
              >
                <LayoutGrid size={12} />
              </button>
            </div>

            {/* Tombol Input Baru */}
            <button
              onClick={handleInputBaru}
              className="px-2.5 sm:px-3 py-1.5 text-[10px] font-extrabold text-white rounded-xl hover:brightness-95 hover:shadow-lg hover:shadow-slate-200/30 transition-all uppercase tracking-wider cursor-pointer whitespace-nowrap shadow-xs shrink-0 flex items-center justify-center gap-1"
              style={{ backgroundColor: 'var(--theme-color-1, #0097fe)' }}
              title="Input Baru"
              aria-label="Input Baru"
            >
              <Plus size={13} strokeWidth={2.5} className="shrink-0" />
              <span className="hidden sm:inline font-black">Baru</span>
            </button>
          </div>
        </div>

        {/* Search Bar Row: Full width on mobile, right-aligned on desktop */}
        <div className="relative w-full sm:w-64 sm:ml-auto">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari tautan / aplikasi..."
            className="w-full pl-8 pr-7 py-1 text-[11px] font-medium bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200/90 focus:border-blue-400 rounded-xl outline-none transition-all placeholder:text-slate-400 text-slate-700 shadow-2xs"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
              title="Bersihkan pencarian"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>
      
      <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 pt-3 custom-scrollbar">
          {loading ? (
            <div className="h-48 flex flex-col items-center justify-center gap-2 text-slate-400">
              <Loader2 size={24} className="animate-spin text-ppm-blue" />
              <span className="text-xs font-bold animate-pulse">Memuat daftar link...</span>
            </div>
          ) : filteredLinks.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center p-6 text-center text-slate-400">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-2">
                <LinkIcon size={22} />
              </div>
              <p className="text-xs font-bold text-slate-600">Tidak ada data link</p>
              <p className="text-[11px] text-slate-400 mt-1 max-w-xs">
                {searchQuery.trim()
                  ? `Tidak ditemukan link kerja atau aplikasi dengan kata kunci "${searchQuery}".`
                  : 'Belum ada link eksternal yang diinput untuk bidang ini. Klik "Input Baru" untuk menambah.'}
              </p>
            </div>
          ) : viewMode === 'table' ? (
            /* ================= TABLE VIEW ================= */
            <div className="rounded-2xl border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] overflow-hidden bg-white overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50/50">
                    <th className="p-3 text-center w-12 text-slate-400 font-black uppercase tracking-tighter border-r border-slate-100/50">#</th>
                    <th className="p-3 text-left w-28 border-r border-slate-100/50 text-slate-400 font-bold uppercase tracking-wider">Tipe / Tgl</th>
                    <th className="p-3 text-left border-r border-slate-100/50 text-slate-400 font-bold uppercase tracking-wider">Link Kerja / Aplikasi</th>
                    <th className="p-3 text-center w-24 text-slate-400 font-bold uppercase tracking-wider">Sumber</th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {paginatedLinks.map((link, idx) => {
                    const actualIdx = (currentPage - 1) * itemsPerPage + idx;
                    const appBadge = getAppBadge(link.nama_aplikasi, actualIdx);
                    return (
                      <tr 
                        key={link.id || idx} 
                        draggable={isReorderActive}
                        onDragStart={(e) => handleDragStart(e, actualIdx)}
                        onDragOver={(e) => handleDragOver(e, actualIdx)}
                        onDrop={(e) => handleDrop(e, actualIdx)}
                        onDragEnd={() => setDraggedIdx(null)}
                        className={`hover:bg-slate-50/80 transition-all border-b border-slate-50 group/row ${
                          draggedIdx === actualIdx ? 'opacity-40 bg-ppm-slate-light/5 border-dashed border-ppm-slate-light/30' : ''
                        }`}
                      >
                        <td className="p-3 border-r border-slate-50 text-center text-slate-400 font-black tabular-nums whitespace-nowrap">
                          {canReorder && (
                            <span 
                              className={`${isReorderActive ? 'cursor-grab active:cursor-grabbing text-slate-300 hover:text-ppm-slate-light' : 'opacity-30 cursor-not-allowed text-slate-300'} inline-block mr-1 align-middle transition-colors`} 
                              title={isReorderActive ? "Drag untuk mengubah urutan" : "Hapus filter pencarian untuk mengubah urutan"}
                            >
                              <GripVertical size={13} />
                            </span>
                          )}
                          {actualIdx + 1}
                        </td>
                        <td className="p-3 border-r border-slate-50 text-slate-500 font-medium whitespace-nowrap tabular-nums">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-slate-600 font-bold text-xs">
                              {formatDate(link.tanggal_link || link.created_at)}
                            </span>
                            {link.nama_tipe_link && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[9px] font-semibold w-fit">
                                {link.nama_tipe_link}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-3 border-r border-slate-50 relative group/td">
                          <div 
                            title={link.keterangan || link.nama_aplikasi}
                            onTouchStart={(e) => startLongPress(e, link)}
                            onTouchMove={(e) => cancelLongPress(e)}
                            onTouchEnd={() => cancelLongPress()}
                            onTouchCancel={() => cancelLongPress()}
                            onContextMenu={(e) => {
                              if (isPwaOrTouch && e.cancelable) e.preventDefault();
                            }}
                            onClick={(e) => {
                              if (isLongPressTriggeredRef.current) {
                                if (e.cancelable) e.preventDefault();
                                e.stopPropagation();
                                isLongPressTriggeredRef.current = false;
                                return;
                              }
                              if (link.url) window.open(link.url, '_blank', 'noopener,noreferrer');
                            }}
                            className="flex flex-col gap-1 group/link w-full cursor-pointer select-none"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs border shrink-0 shadow-2xs ${appBadge.cls}`}>
                                  {appBadge.initial}
                                </div>
                                <span className="font-bold text-slate-700 group-hover/link:text-ppm-slate-light transition-colors leading-snug flex items-center gap-1.5 min-w-0">
                                  <span className="truncate block max-w-[150px] sm:max-w-[200px] md:max-w-[240px] lg:max-w-[160px] xl:max-w-[260px] 2xl:max-w-[340px]" title={link.nama_aplikasi}>
                                    {link.nama_aplikasi}
                                  </span>
                                  {link.keterangan && (
                                    <span className="text-slate-400 hover:text-ppm-slate-light transition-colors shrink-0 p-1 -m-1 cursor-help inline-flex items-center justify-center" title={`Tooltip: ${link.keterangan}`}>
                                      <Info size={13} />
                                    </span>
                                  )}
                                  {(() => {
                                    const isQaAll = Number(link.is_qa_all) === 1;
                                    const isQaBidang = Number(link.is_qa_bidang) === 1;
                                    const isQaPersonal = Number(link.user_is_qa_personal !== undefined ? link.user_is_qa_personal : link.is_qa_personal) === 1;
                                    
                                    if (!isQaAll && !isQaBidang && !isQaPersonal) return null;
                                    
                                    const qaParts = [];
                                    if (isQaAll) qaParts.push('Semua Bidang');
                                    if (isQaBidang) qaParts.push('Bidang');
                                    if (isQaPersonal) qaParts.push('Personal');
                                    
                                    return (
                                      <span 
                                        className="inline-flex items-center justify-center p-0.5 rounded-full bg-amber-50 border border-amber-200 animate-in zoom-in-50 duration-300 shrink-0"
                                        title={`Quick Access: ${qaParts.join(', ')}`}
                                      >
                                        <Zap size={10} className="fill-amber-400 text-amber-500" />
                                      </span>
                                    );
                                  })()}
                                </span>

                                {/* QAF Trigger Button - Hidden on Mobile/PWA for cleaner look, accessible via long-press */}
                                <div className="hidden sm:block opacity-0 group-hover/td:opacity-100 transition-opacity duration-200 shrink-0">
                                  <button
                                    type="button"
                                    onClick={(e) => handleOpenQaf(e, link)}
                                    className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-ppm-slate-light transition-colors cursor-pointer"
                                    title="Opsi QAF"
                                  >
                                    <MoreVertical size={13} />
                                  </button>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (link.url) window.open(link.url, '_blank', 'noopener,noreferrer');
                                }}
                                className="p-1 text-slate-400 hover:text-ppm-slate-light transition-colors shrink-0 cursor-pointer"
                                title="Buka Link Langsung"
                              >
                                <ExternalLink size={12} className="opacity-0 -translate-x-2 group-hover/link:opacity-100 group-hover/link:translate-x-0 transition-all duration-300 text-ppm-slate-light shrink-0" />
                              </button>
                            </div>

                            {/* Tematik & Urusan Badges */}
                            {((link.nama_tematik_list && link.nama_tematik_list.length > 0) || (link.nama_urusan_list && link.nama_urusan_list.length > 0)) && (
                              <div className="flex flex-wrap gap-1 mt-0.5">
                                {link.nama_tematik_list && link.nama_tematik_list.length > 0 && (
                                  <span 
                                    className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-medium bg-purple-50 text-purple-700 border border-purple-100 max-w-[110px] truncate cursor-help" 
                                    title={`Daftar Tematik (${link.nama_tematik_list.length}): ${link.nama_tematik_list.join(', ')}`}
                                  >
                                    <Sparkles size={8} className="shrink-0" /> {link.nama_tematik_list[0]} {link.nama_tematik_list.length > 1 ? `+${link.nama_tematik_list.length - 1}` : ''}
                                  </span>
                                )}
                                {link.nama_urusan_list && link.nama_urusan_list.length > 0 && (
                                  <span 
                                    className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-medium bg-blue-50 text-blue-700 border border-blue-100 max-w-[130px] truncate cursor-help" 
                                    title={`Daftar Urusan (${link.nama_urusan_list.length}):\n• ${link.nama_urusan_list.join('\n• ')}`}
                                  >
                                    <Layers size={8} className="shrink-0" /> {link.nama_urusan_list[0]} {link.nama_urusan_list.length > 1 ? `+${link.nama_urusan_list.length - 1}` : ''}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-widest group-hover/row:bg-ppm-slate-light/10 group-hover/row:text-ppm-slate-light transition-all">
                            {link.sumber || link.asal_instansi || '-'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            /* ================= GRID / TILES VIEW ================= */
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3">
              {paginatedLinks.map((link, idx) => {
                const actualIdx = (currentPage - 1) * itemsPerPage + idx;
                const appBadge = getAppBadge(link.nama_aplikasi, actualIdx);
                const isQaAll = Number(link.is_qa_all) === 1;
                const isQaBidang = Number(link.is_qa_bidang) === 1;
                const isQaPersonal = Number(link.user_is_qa_personal !== undefined ? link.user_is_qa_personal : link.is_qa_personal) === 1;
                const hasQa = isQaAll || isQaBidang || isQaPersonal;

                return (
                  <div
                    key={link.id || idx}
                    draggable={isReorderActive}
                    onDragStart={(e) => handleDragStart(e, actualIdx)}
                    onDragOver={(e) => handleDragOver(e, actualIdx)}
                    onDrop={(e) => handleDrop(e, actualIdx)}
                    onDragEnd={() => setDraggedIdx(null)}
                    onTouchStart={(e) => startLongPress(e, link)}
                    onTouchMove={(e) => cancelLongPress(e)}
                    onTouchEnd={() => cancelLongPress()}
                    onTouchCancel={() => cancelLongPress()}
                    onContextMenu={(e) => {
                      if (isPwaOrTouch && e.cancelable) e.preventDefault();
                    }}
                    onClick={(e) => {
                      if (isLongPressTriggeredRef.current) {
                        if (e.cancelable) e.preventDefault();
                        e.stopPropagation();
                        isLongPressTriggeredRef.current = false;
                        return;
                      }
                      if (link.url) window.open(link.url, '_blank', 'noopener,noreferrer');
                    }}
                    className={`group relative p-2.5 sm:p-3 rounded-2xl border border-slate-100 bg-white hover:border-blue-200 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer flex flex-col justify-between ${
                      draggedIdx === actualIdx ? 'opacity-30 border-dashed border-blue-400' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1 mb-2">
                      <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center font-black text-xs sm:text-sm border shadow-2xs shrink-0 ${appBadge.cls}`}>
                        {appBadge.initial}
                      </div>
                      <div className="flex items-center gap-1">
                        {hasQa && (
                          <span 
                            className="inline-flex items-center justify-center p-0.5 rounded-full bg-amber-50 border border-amber-200 shrink-0"
                            title="Tersedia di Akses Cepat"
                          >
                            <Zap size={10} className="fill-amber-400 text-amber-500" />
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={(e) => handleOpenQaf(e, link)}
                          className="hidden sm:inline-flex p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-ppm-slate-light transition-colors cursor-pointer"
                          title="Opsi QAF"
                        >
                          <MoreVertical size={13} />
                        </button>
                        <ExternalLink size={12} className="text-slate-400 group-hover:text-ppm-slate-light shrink-0" />
                      </div>
                    </div>

                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-800 group-hover:text-ppm-slate-light transition-colors line-clamp-2 leading-snug" title={link.nama_aplikasi}>
                        {link.nama_aplikasi}
                      </div>
                      <div className="flex items-center justify-between gap-1 mt-1.5 text-[9px] font-semibold text-slate-400">
                        <span className="truncate max-w-[90px]">{link.sumber || link.asal_instansi || 'Eksternal'}</span>
                        {link.nama_tipe_link && (
                          <span className="px-1.5 py-0.2 rounded-full bg-emerald-50 text-emerald-700 text-[8px] font-bold shrink-0">
                            {link.nama_tipe_link}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      {/* Pagination Footer */}
      <div className="px-5 sm:px-6 py-2.5 border-t border-slate-100 bg-white flex items-center justify-between shrink-0">
        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
          Menampilkan {filteredLinks.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredLinks.length)} dari {filteredLinks.length} link
        </span>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-600">
            Hal {currentPage} / {totalPages}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              className="p-1.5 rounded-lg text-slate-500 hover:text-ppm-slate-light hover:bg-ppm-slate-light/10 border border-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
              title="Halaman sebelumnya"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              className="p-1.5 rounded-lg text-slate-500 hover:text-ppm-slate-light hover:bg-ppm-slate-light/10 border border-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
              title="Halaman berikutnya"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Floating QAF Balloon Menu */}
      {activeBalloonId && balloonPos && activeItem && (
        <QafPopover
          top={balloonPos.top}
          left={balloonPos.left}
          isFlippedVertical={balloonPos.isFlippedVertical}
          flipSubmenuLeft={balloonPos.flipSubmenuLeft}
          onClose={() => {
            setActiveBalloonId(null);
          }}
          globalActive={Number(activeItem.is_qa_all) === 1}
          canEditGlobal={isSuperadminOrAdmin || isKepalaOrSekretaris}
          onToggleGlobal={() => handleToggleQaScope(activeItem, 'is_qa_all')}
          globalTitle={!(isSuperadminOrAdmin || isKepalaOrSekretaris) ? 'Hanya Superadmin/Admin, Kepala, atau Sekretaris yang dapat mengubah' : ''}
          bidangActive={Number(activeItem.is_qa_bidang) === 1}
          canEditBidang={isBidangAuthority}
          onToggleBidang={() => handleToggleQaScope(activeItem, 'is_qa_bidang')}
          bidangTitle={!isBidangAuthority ? 'Hanya Kabid, Katim, Admin Bidang, Admin, Kepala, atau Sekretaris yang dapat mengubah' : ''}
          personalActive={Number(activeItem.user_is_qa_personal) === 1}
          canEditPersonal={true}
          onTogglePersonal={() => handleToggleQaScope(activeItem, 'is_qa_personal')}
          onCopyLink={() => {
            setActiveBalloonId(null);
            if (activeItem.url) {
              navigator.clipboard.writeText(activeItem.url);
              alert(`Link "${activeItem.nama_aplikasi}" berhasil disalin ke clipboard!`);
            }
          }}
          onMakeSkp={undefined} // Hide/omit SKP option in WorkLinksTable
        />
      )}
    </div>
  );
};

export default WorkLinksTable;
