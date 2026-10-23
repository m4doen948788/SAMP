import React, { useState, useEffect, useMemo, useRef } from 'react';
import * as Icons from 'lucide-react';
import { 
  BookOpen, 
  Mail, 
  LayoutGrid, 
  CheckSquare, 
  Inbox, 
  X, 
  Search, 
  ChevronRight, 
  ChevronLeft,
  ExternalLink, 
  Sparkles,
  Layers,
  Calendar,
  FileText,
  BarChart3,
  Users,
  Settings,
  FolderTree,
  FileCheck2,
  Workflow,
  ArrowLeft
} from 'lucide-react';
import { api } from '@/src/services/api';
import { useAuth } from '@/src/contexts/AuthContext';
import { getSkpAlertsForUser } from '@/src/services/skpHelpers';

export interface MenuItem {
  id: number;
  nama_menu: string;
  tipe: 'menu1' | 'menu2' | 'menu3';
  aplikasi_external_id: number | null;
  action_page: string | null;
  icon: string | null;
  parent_id: number | null;
  urutan: number;
  is_active: number;
  nama_aplikasi?: string;
  aplikasi_url?: string;
}

interface MobileBottomNavProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  todoPendingCount?: number;
  onOpenInbox: () => void;
}

// Fallback icon resolver for menus without custom icon configured
const resolveMenuIcon = (item: MenuItem, size = 22) => {
  if (item.icon && (Icons as any)[item.icon]) {
    const CustomIcon = (Icons as any)[item.icon];
    return <CustomIcon size={size} />;
  }

  const name = (item.nama_menu || '').toLowerCase();
  const page = (item.action_page || '').toLowerCase();

  if (name.includes('daftar kegiatan') || page === 'isi-kegiatan') return <Calendar size={size} />;
  if (name.includes('rekap kegiatan') || page === 'rekap-kegiatan') return <BarChart3 size={size} />;
  if (name.includes('logbook') || page === 'kegiatan-per-orang') return <FileCheck2 size={size} />;
  if (name.includes('draft jadwal') || page === 'draft-jadwal') return <Calendar size={size} />;
  if (name.includes('kegiatan') || page.includes('kegiatan')) return <Calendar size={size} />;
  if (name.includes('surat') || page.includes('surat')) return <Mail size={size} />;
  if (name.includes('dokumen') || page.includes('dokumen')) return <FileText size={size} />;
  if (name.includes('olah data') || name.includes('makro') || page.includes('olah-data')) return <BarChart3 size={size} />;
  if (name.includes('pegawai') || name.includes('user') || page.includes('pegawai')) return <Users size={size} />;
  if (name.includes('renja') || name.includes('rpjpd') || name.includes('perencanaan')) return <Workflow size={size} />;
  if (name.includes('skp') || name.includes('kinerja')) return <FileCheck2 size={size} />;
  if (name.includes('pengaturan') || name.includes('kelola') || page.includes('setting')) return <Settings size={size} />;
  if (name.includes('tematik')) return <Sparkles size={size} />;

  return <Layers size={size} />;
};

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentPage,
  onNavigate,
  todoPendingCount = 0,
  onOpenInbox,
}) => {
  const { user } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  
  // Navigation stack for drill-down in modal (e.g. [Manajemen, Manajemen Kegiatan])
  const [menuStack, setMenuStack] = useState<MenuItem[]>([]);

  // Inbox badge state
  const [inboxPendingTotal, setInboxPendingTotal] = useState(0);

  // Menu data state
  const [menuData, setMenuData] = useState<MenuItem[]>(() => {
    try {
      const cached = sessionStorage.getItem('sidebar-menu-data');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });

  // Fetch inbox alert counts
  const fetchInboxCount = async () => {
    if (!user) return;
    try {
      const [resApp, resNotif, skpAlerts] = await Promise.all([
        api.suratApprovals.getPending().catch(() => ({ success: false, data: [] })),
        api.notifications.getAll().catch(() => ({ success: false, data: [] })),
        getSkpAlertsForUser(user).catch(() => [])
      ]);

      let total = 0;
      if (resApp.success && Array.isArray(resApp.data)) {
        total += resApp.data.filter((a: any) => a.status === 'PENDING').length;
      }
      if (resNotif.success && Array.isArray(resNotif.data)) {
        total += resNotif.data.filter((n: any) => !n.is_read).length;
      }
      if (Array.isArray(skpAlerts)) {
        total += skpAlerts.length;
      }
      setInboxPendingTotal(total);
    } catch (err) {
      console.error('Failed to update mobile inbox badge', err);
    }
  };

  useEffect(() => {
    fetchInboxCount();
    const interval = setInterval(fetchInboxCount, 30000);

    const handleUpdate = () => setTimeout(fetchInboxCount, 500);
    window.addEventListener('approval-action-success', handleUpdate);
    window.addEventListener('notification-update', handleUpdate);
    window.addEventListener('skp-update', handleUpdate);

    return () => {
      clearInterval(interval);
      window.removeEventListener('approval-action-success', handleUpdate);
      window.removeEventListener('notification-update', handleUpdate);
      window.removeEventListener('skp-update', handleUpdate);
    };
  }, [user]);

  // Sync menuData from sessionStorage or API
  useEffect(() => {
    const loadMenus = async () => {
      try {
        const cached = sessionStorage.getItem('sidebar-menu-data');
        if (cached) {
          setMenuData(JSON.parse(cached));
          return;
        }
        if (!user) return;
        const isSuperAdmin = user.tipe_user_id === 1;
        const [menuRes, accessRes] = await Promise.all([
          api.menu.getAll(),
          !isSuperAdmin ? api.rbac.getRoleAccess(user.tipe_user_id) : Promise.resolve({ success: true, data: [] })
        ]);

        if (menuRes.success && Array.isArray(menuRes.data)) {
          let allowedMenuIds = new Set<number>((accessRes?.data || []).map((id: any) => Number(id)));
          let menus = menuRes.data.filter((m: MenuItem) => m.is_active);

          if (!isSuperAdmin) {
            menus = menus.filter((m: MenuItem) => allowedMenuIds.has(Number(m.id)));
          }
          setMenuData(menus);
        }
      } catch (err) {
        console.error('Failed to fetch mobile menus', err);
      }
    };

    loadMenus();
  }, [user]);

  // Hierarchical groupings
  const { topLevelMenus, childrenMap, allActionableMenus } = useMemo(() => {
    const sorted = [...menuData].sort((a, b) => (a.urutan || 0) - (b.urutan || 0));
    const topLevel: MenuItem[] = [];
    const children: Record<number, MenuItem[]> = {};
    const actionable: MenuItem[] = [];

    sorted.forEach(item => {
      if (!item.parent_id || item.tipe === 'menu1') {
        topLevel.push(item);
      } else {
        if (!children[item.parent_id]) children[item.parent_id] = [];
        children[item.parent_id].push(item);
      }

      if (item.action_page || (item.aplikasi_external_id && item.aplikasi_url)) {
        actionable.push(item);
      }
    });

    return { topLevelMenus: topLevel, childrenMap: children, allActionableMenus: actionable };
  }, [menuData]);

  // Filtered menus for search (if search keyword is typed, search across all actionable submenus)
  const isSearching = !!searchKeyword.trim();
  const searchResults = useMemo(() => {
    if (!isSearching) return [];
    const q = searchKeyword.toLowerCase();
    return allActionableMenus.filter(m => 
      m.nama_menu.toLowerCase().includes(q) || 
      (m.nama_aplikasi && m.nama_aplikasi.toLowerCase().includes(q))
    );
  }, [allActionableMenus, searchKeyword, isSearching]);

  // Helper to resolve page action with smart fallback
  const resolveTargetAction = (item: MenuItem): string | null => {
    if (item.action_page) return item.action_page;

    const name = (item.nama_menu || '').toLowerCase();
    if (name.includes('kegiatan')) return 'isi-kegiatan';
    if (name.includes('surat')) return 'manajemen-surat';
    if (name.includes('dokumen')) return 'manajemen-dokumen';
    if (name.includes('pegawai')) return 'manajemen-pegawai';

    const subs = childrenMap[item.id] || [];
    const firstWithAction = subs.find(s => s.action_page);
    return firstWithAction?.action_page || null;
  };

  const handleMenuClick = (item: MenuItem) => {
    const subs = childrenMap[item.id] || [];

    // If external app
    if (item.aplikasi_external_id && item.aplikasi_url) {
      window.open(item.aplikasi_url, '_blank');
      setIsMenuOpen(false);
      return;
    }

    // If has submenus -> open drill-down popup
    if (subs.length > 0) {
      setMenuStack([item]);
      return;
    }

    // Direct navigation
    const targetPage = resolveTargetAction(item);
    if (targetPage) {
      onNavigate(targetPage);
      setIsMenuOpen(false);
    }
  };

  const handleSubmenuItemClick = (item: MenuItem) => {
    const deeperSubs = childrenMap[item.id] || [];

    // If external app
    if (item.aplikasi_external_id && item.aplikasi_url) {
      window.open(item.aplikasi_url, '_blank');
      setMenuStack([]);
      setIsMenuOpen(false);
      return;
    }

    // If this sub-menu has its own children (e.g. Manajemen Kegiatan has Daftar Kegiatan, Rekap, etc.)
    if (deeperSubs.length > 0) {
      // Drill down one level deeper in the stack
      setMenuStack(prev => [...prev, item]);
      return;
    }

    // Leaf item -> navigate!
    const targetPage = resolveTargetAction(item);
    if (targetPage) {
      onNavigate(targetPage);
      setMenuStack([]);
      setIsMenuOpen(false);
    }
  };

  const handlePopStack = () => {
    setMenuStack(prev => prev.slice(0, prev.length - 1));
  };

  // Current active parent in popup stack
  const currentStackParent = menuStack.length > 0 ? menuStack[menuStack.length - 1] : null;
  const currentStackChildren = currentStackParent ? (childrenMap[currentStackParent.id] || []) : [];

  return (
    <>
      {/* ============================================================== */}
      {/* 1. BOTTOM NAVIGATION DOCK (FIXED AT SCREEN BOTTOM)             */}
      {/* ============================================================== */}
      <nav className="fixed bottom-0 inset-x-0 z-[900] lg:hidden bg-white/95 backdrop-blur-xl border-t border-slate-200/90 shadow-[0_-8px_30px_rgba(15,23,42,0.08)] select-none">
        <div className="max-w-md mx-auto px-3 h-[66px] flex items-center justify-between relative">
          
          {/* KIRI 1: Buat Laporan (notulen-maker) */}
          <button
            onClick={() => onNavigate('notulen-maker')}
            className={`flex flex-col items-center justify-center flex-1 py-1 transition-all active:scale-95 ${
              currentPage === 'notulen-maker' ? 'text-ppm-blue font-black' : 'text-slate-500 hover:text-slate-800'
            }`}
            title="Buat Laporan / Notulen"
          >
            <div className={`p-1.5 rounded-xl transition-colors ${
              currentPage === 'notulen-maker' ? 'bg-blue-50 text-ppm-blue' : ''
            }`}>
              <BookOpen size={20} strokeWidth={currentPage === 'notulen-maker' ? 2.3 : 1.8} />
            </div>
            <span className="text-[10px] font-bold tracking-tight mt-0.5 leading-none">Laporan</span>
          </button>

          {/* KIRI 2: Buat Surat (surat-maker) - persis sebelah tombol tengah */}
          <button
            onClick={() => onNavigate('surat-maker')}
            className={`flex flex-col items-center justify-center flex-1 py-1 transition-all active:scale-95 ${
              currentPage === 'surat-maker' ? 'text-ppm-blue font-black' : 'text-slate-500 hover:text-slate-800'
            }`}
            title="Buat Surat Baru"
          >
            <div className={`p-1.5 rounded-xl transition-colors ${
              currentPage === 'surat-maker' ? 'bg-blue-50 text-ppm-blue' : ''
            }`}>
              <Mail size={20} strokeWidth={currentPage === 'surat-maker' ? 2.3 : 1.8} />
            </div>
            <span className="text-[10px] font-bold tracking-tight mt-0.5 leading-none">Surat</span>
          </button>

          {/* TENGAH: SEMUA MENU (FLOATING ACTION BUTTON ALA myBCA) */}
          <div className="flex flex-col items-center justify-center flex-1 relative">
            <button
              onClick={() => {
                setMenuStack([]);
                setIsMenuOpen(prev => !prev);
              }}
              className={`relative -top-5 w-14 h-14 rounded-full flex items-center justify-center text-white border-[3.5px] border-white shadow-xl transition-all duration-300 active:scale-90 ${
                isMenuOpen 
                  ? 'bg-slate-800 shadow-slate-900/30 rotate-90 scale-95' 
                  : 'bg-gradient-to-tr from-ppm-blue via-sky-600 to-sky-400 shadow-blue-500/35 hover:shadow-blue-500/45 hover:scale-105'
              }`}
              title="Semua Menu"
            >
              {isMenuOpen ? (
                <X size={24} className="stroke-[2.5]" />
              ) : (
                <LayoutGrid size={22} className="stroke-[2.2] animate-in zoom-in-75 duration-200" />
              )}
            </button>
            <span className="text-[9.5px] font-black uppercase tracking-wider text-slate-700 -mt-3.5 leading-none">
              Menu
            </span>
          </div>

          {/* KANAN 1: To Do List - persis sebelah tombol tengah */}
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('samp-toggle-todo'))}
            className="flex flex-col items-center justify-center flex-1 py-1 text-slate-500 hover:text-slate-800 transition-all active:scale-95 relative"
            title="Daftar Tugas / To Do"
          >
            <div className="relative p-1.5 rounded-xl">
              <CheckSquare size={20} strokeWidth={1.8} />
              {todoPendingCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[17px] h-[17px] px-1 bg-rose-600 text-white text-[9px] font-black flex items-center justify-center rounded-full border-2 border-white shadow-sm tabular-nums animate-pulse">
                  {todoPendingCount > 99 ? '99+' : todoPendingCount}
                </span>
              )}
            </div>
            <span className="text-[10px] font-bold tracking-tight mt-0.5 leading-none">To Do</span>
          </button>

          {/* KANAN 2: Inbox (Kotak Masuk Persetujuan & Notifikasi) */}
          <button
            onClick={onOpenInbox}
            className="flex flex-col items-center justify-center flex-1 py-1 text-slate-500 hover:text-slate-800 transition-all active:scale-95 relative"
            title="Kotak Masuk & Persetujuan"
          >
            <div className="relative p-1.5 rounded-xl">
              <Inbox size={20} strokeWidth={1.8} />
              {inboxPendingTotal > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[17px] h-[17px] px-1 bg-rose-600 text-white text-[9px] font-black flex items-center justify-center rounded-full border-2 border-white shadow-sm tabular-nums animate-pulse">
                  {inboxPendingTotal > 99 ? '99+' : inboxPendingTotal}
                </span>
              )}
            </div>
            <span className="text-[10px] font-bold tracking-tight mt-0.5 leading-none">Inbox</span>
          </button>

        </div>
      </nav>

      {/* ============================================================== */}
      {/* 2. SEMUA MENU BOTTOM SHEET (SLIDES UP FROM BOTTOM TO THUMB)   */}
      {/* ============================================================== */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-[9999] lg:hidden flex flex-col justify-end">
          {/* Soft Blur Backdrop */}
          <div 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => {
              setMenuStack([]);
              setIsMenuOpen(false);
            }}
          />

          {/* Bottom Sheet Body: Slides Up From Bottom */}
          <div className="relative z-10 bg-slate-50/98 backdrop-blur-xl rounded-t-[2.5rem] shadow-2xl border-t border-slate-200/90 flex flex-col max-h-[85vh] overflow-hidden animate-in slide-in-from-bottom duration-300">
            
            {/* Top Drag Handle */}
            <div className="pt-2.5 pb-1 flex justify-center shrink-0">
              <div className="w-12 h-1.5 bg-slate-300 rounded-full" />
            </div>

            {/* Header: Title & Close */}
            <div className="px-5 pt-2 pb-3.5 bg-white border-b border-slate-200/80 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-ppm-blue to-sky-500 text-white flex items-center justify-center shadow-md shadow-blue-500/25">
                  <LayoutGrid size={18} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-800 tracking-tight leading-none">
                    Katalog Menu
                  </h3>
                  <p className="text-[11px] font-medium text-slate-400 mt-1">
                    Sentuh menu untuk membuka fitur
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  setMenuStack([]);
                  setIsMenuOpen(false);
                }}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-all active:scale-95"
                title="Tutup Menu"
              >
                <X size={17} />
              </button>
            </div>

            {/* Search Bar */}
            <div className="px-4 pt-3 pb-2.5 bg-white/70 border-b border-slate-200/60 shrink-0">
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari semua fitur / sub-menu..."
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 bg-slate-100/80 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 border border-slate-200/60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-ppm-blue/20 focus:border-ppm-blue transition-all"
                />
                {searchKeyword && (
                  <button
                    onClick={() => setSearchKeyword('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 rounded-full"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* Menu Grid (Ala myBCA Icon Squircle with Harmonic Soft Blue Glow) */}
            <div className="flex-1 overflow-y-auto px-4 py-5 pb-8 custom-scrollbar">
              {isSearching ? (
                /* Search Results Mode: Shows all matching actionable sub-menus directly */
                searchResults.length === 0 ? (
                  <div className="py-12 text-center text-slate-400">
                    <Layers size={36} className="mx-auto mb-2 opacity-40" />
                    <p className="text-xs font-bold">Tidak ada menu yang sesuai dengan "{searchKeyword}"</p>
                  </div>
                ) : (
                  <div>
                    <div className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider mb-3 px-1">
                      Hasil Pencarian ({searchResults.length})
                    </div>
                    <div className="grid grid-cols-4 gap-y-4 gap-x-2.5 sm:gap-x-4">
                      {searchResults.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => {
                            if (item.aplikasi_external_id && item.aplikasi_url) {
                              window.open(item.aplikasi_url, '_blank');
                            } else if (item.action_page) {
                              onNavigate(item.action_page);
                            }
                            setIsMenuOpen(false);
                          }}
                          className="group flex flex-col items-center text-center p-1 rounded-2xl hover:bg-white/80 active:scale-95 transition-all duration-200"
                        >
                          <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-b from-sky-50/95 via-blue-50/80 to-blue-100/60 border border-sky-200/70 shadow-sm shadow-blue-500/10 flex items-center justify-center text-ppm-blue transition-all duration-300 group-hover:scale-105 group-hover:border-sky-300">
                            {resolveMenuIcon(item, 23)}
                          </div>
                          <span className="text-[10px] sm:text-[11px] font-bold text-slate-700 mt-1.5 line-clamp-2 leading-tight tracking-tight group-hover:text-ppm-blue transition-colors max-w-[76px]">
                            {item.nama_menu}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )
              ) : (
                /* Normal Category Mode */
                <div className="grid grid-cols-4 gap-y-5 gap-x-2.5 sm:gap-x-4">
                  {topLevelMenus.map((item) => {
                    const subs = childrenMap[item.id] || [];
                    const hasSub = subs.length > 0;
                    const isExternal = !!item.aplikasi_external_id;

                    return (
                      <button
                        key={item.id}
                        onClick={() => handleMenuClick(item)}
                        className="group flex flex-col items-center text-center p-1 rounded-2xl hover:bg-white/80 active:scale-95 transition-all duration-200"
                      >
                        {/* WADAH IKON myBCA: Soft Frosty Gradient Squircle dengan Shadow Halus */}
                        <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-b from-sky-50/95 via-blue-50/80 to-blue-100/60 border border-sky-200/70 shadow-sm shadow-blue-500/10 flex items-center justify-center text-ppm-blue transition-all duration-300 group-hover:scale-105 group-hover:shadow-md group-hover:shadow-blue-500/20 group-hover:border-sky-300">
                          {resolveMenuIcon(item, 23)}

                          {/* Submenu Indicator Dot */}
                          {hasSub && (
                            <span className="absolute -top-1 -right-1 w-4 h-4 bg-sky-500 text-white rounded-full flex items-center justify-center border-2 border-white shadow-xs">
                              <span className="w-1.5 h-1.5 bg-white rounded-full"></span>
                            </span>
                          )}

                          {/* External App Link Indicator */}
                          {isExternal && (
                            <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 text-white rounded-full flex items-center justify-center border-2 border-white shadow-xs">
                              <ExternalLink size={8} />
                            </span>
                          )}
                        </div>

                        {/* Label Teks Menu Bawah Ikon */}
                        <span className="text-[10px] sm:text-[11px] font-bold text-slate-700 mt-1.5 line-clamp-2 leading-tight tracking-tight group-hover:text-ppm-blue transition-colors max-w-[76px]">
                          {item.nama_menu}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Bottom Sheet Footer Hint */}
            <div className="py-2.5 px-4 bg-slate-100/80 border-t border-slate-200/60 text-center shrink-0">
              <span className="text-[10px] font-semibold text-slate-400">
                Pilih menu dengan titik untuk membuka sub-fitur
              </span>
            </div>

          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 3. SUB-MENU POPUP MODAL (BERBENTUK GRID IKON ALA myBCA)        */}
      {/* ============================================================== */}
      {currentStackParent && (
        <div className="fixed inset-0 z-[10005] lg:hidden flex items-end sm:items-center justify-center p-0 sm:p-4">
          {/* Dark Backdrop */}
          <div 
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200"
            onClick={() => setMenuStack([])}
          />

          {/* Popup Card (Bottom-sheet on mobile, centered card on tablet) */}
          <div className="relative z-10 bg-white w-full max-w-sm rounded-t-[2.5rem] sm:rounded-3xl p-5 shadow-2xl border border-slate-100 animate-in slide-in-from-bottom duration-200 flex flex-col max-h-[82vh] overflow-hidden">
            
            {/* Top drag indicator on mobile */}
            <div className="sm:hidden pt-0 pb-2 flex justify-center shrink-0">
              <div className="w-10 h-1 bg-slate-200 rounded-full" />
            </div>

            {/* Header Pop-up: Back button (if drilled down) or Title + Close */}
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                {menuStack.length > 1 ? (
                  <button
                    onClick={handlePopStack}
                    className="p-1.5 -ml-1 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all active:scale-95 flex items-center gap-1 shrink-0"
                    title="Kembali"
                  >
                    <ArrowLeft size={16} />
                  </button>
                ) : (
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-b from-sky-50 via-blue-50 to-blue-100/80 border border-sky-200/80 text-ppm-blue flex items-center justify-center shadow-xs shrink-0">
                    {resolveMenuIcon(currentStackParent, 20)}
                  </div>
                )}
                
                <div className="min-w-0">
                  <h4 className="text-sm font-black text-slate-800 tracking-tight leading-tight truncate">
                    {currentStackParent.nama_menu}
                  </h4>
                  <p className="text-[10px] font-semibold text-slate-400 mt-0.5">
                    {menuStack.length > 1 ? `Sub-menu ${menuStack[menuStack.length - 2].nama_menu}` : 'Pilih fitur:'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setMenuStack([])}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors shrink-0 ml-2"
                title="Tutup"
              >
                <X size={16} />
              </button>
            </div>

            {/* GRID OF SUB-MENU ICONS (BENTUK IKON ALA myBCA, BUKAN LIST!) */}
            <div className="flex-1 overflow-y-auto py-4 px-1 custom-scrollbar">
              {currentStackChildren.length === 0 ? (
                <div className="py-8 text-center text-slate-400">
                  <p className="text-xs font-bold">Tidak ada sub-fitur tambahan</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-y-4 gap-x-2">
                  {currentStackChildren.map((sub) => {
                    const hasDeeper = (childrenMap[sub.id] || []).length > 0;
                    const isSelected = sub.action_page === currentPage;

                    return (
                      <button
                        key={sub.id}
                        onClick={() => handleSubmenuItemClick(sub)}
                        className={`group flex flex-col items-center text-center p-2 rounded-2xl transition-all duration-200 active:scale-95 ${
                          isSelected ? 'bg-blue-50/80 ring-1 ring-blue-200' : 'hover:bg-slate-50'
                        }`}
                      >
                        {/* WADAH IKON myBCA UNTUK SUB-MENU */}
                        <div className={`relative w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-xs ${
                          isSelected
                            ? 'bg-gradient-to-tr from-ppm-blue to-sky-500 text-white shadow-md shadow-blue-500/20'
                            : 'bg-gradient-to-b from-sky-50/95 via-blue-50/80 to-blue-100/60 border border-sky-200/70 text-ppm-blue group-hover:scale-105 group-hover:border-sky-300'
                        }`}>
                          {resolveMenuIcon(sub, 22)}

                          {/* Titik indikator jika sub-menu memiliki sub-kategori lagi */}
                          {hasDeeper && (
                            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-sky-500 text-white rounded-full flex items-center justify-center border-2 border-white shadow-2xs">
                              <span className="w-1.5 h-1.5 bg-white rounded-full"></span>
                            </span>
                          )}
                        </div>

                        {/* Label Nama Sub-Menu */}
                        <span className={`text-[10px] sm:text-[10.5px] font-bold mt-1.5 line-clamp-2 leading-tight tracking-tight max-w-[80px] ${
                          isSelected ? 'text-ppm-blue' : 'text-slate-700 group-hover:text-ppm-blue'
                        }`}>
                          {sub.nama_menu}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Direct Parent Action button if parent also has an action_page */}
            {currentStackParent.action_page && (
              <div className="pt-3 border-t border-slate-100 shrink-0">
                <button
                  onClick={() => {
                    onNavigate(currentStackParent.action_page!);
                    setMenuStack([]);
                    setIsMenuOpen(false);
                  }}
                  className="w-full py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 text-center transition-colors"
                >
                  Buka Halaman Utama {currentStackParent.nama_menu}
                </button>
              </div>
            )}

          </div>
        </div>
      )}
    </>
  );
};

export default MobileBottomNav;
