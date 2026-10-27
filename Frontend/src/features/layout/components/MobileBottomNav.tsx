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
  CalendarDays,
  CalendarCheck2,
  CalendarRange,
  CalendarPlus,
  CalendarClock,
  ClipboardCheck,
  FileCheck2,
  FileText,
  FileDiff,
  FileSignature,
  MailPlus,
  Mails,
  Share2,
  BookmarkCheck,
  Building2,
  Building,
  Home,
  MapPin,
  Globe2,
  Globe,
  BarChart3,
  LineChart,
  PieChart,
  FileSpreadsheet,
  Table,
  GitCompare,
  Combine,
  ShieldCheck,
  CheckCheck,
  Users,
  Users2,
  UserCheck,
  UserCircle,
  IdCard,
  UserCog,
  KeyRound,
  Sliders,
  Settings2,
  Settings,
  FolderTree,
  FolderArchive,
  FolderHeart,
  Workflow,
  Network,
  ListTree,
  ListOrdered,
  Hash,
  Award,
  TrendingUp,
  Coins,
  HandCoins,
  Wallet,
  Landmark,
  Compass,
  Target,
  Activity,
  Zap,
  Tags,
  ArrowLeft,
  Briefcase
} from 'lucide-react';
import { api } from '@/src/services/api';
import { useAuth } from '@/src/contexts/AuthContext';
import { getSkpAlertsForUser } from '@/src/services/skpHelpers';
import { 
  BapperidaSymbol, 
  BapperidaCurvesHeader, 
  BapperidaSilhouetteWatermark, 
  BapperidaDualIcon,
  getMenuBapperidaColor, 
  BAPPERIDA_PALETTE 
} from '@/src/components/shared/BapperidaBrand';

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

/**
 * Intelligent icon resolver:
 * Matches every menu to an aesthetic, intuitive, purpose-built icon
 * avoiding generic "blank paper" icons!
 */
export const resolveMenuIcon = (item: MenuItem, size = 26) => {
  const name = (item.nama_menu || '').toLowerCase().trim();
  const page = (item.action_page || '').toLowerCase().trim();
  const rawIcon = (item.icon || '').trim();

  // 1. Specific Keyword Matching (HIGHEST PRIORITY: semantic matching)

  // Surat & Korespondensi
  if (name.includes('buat surat') || page === 'surat-maker') return <MailPlus size={size} />;
  if (name.includes('daftar surat') || page === 'manajemen-surat') return <Mails size={size} />;
  if (name.includes('pengaturan surat') || page === 'pengaturan-surat') return <Sliders size={size} />;
  if (name.includes('penomoran') || page === 'pengaturan-penomoran') return <ListOrdered size={size} />;
  if (name.includes('tanda tangan') || name.includes('tte') || name.includes('esign')) return <FileSignature size={size} />;
  if (name.includes('disposisi')) return <Share2 size={size} />;
  if (name.includes('surat')) return <Mail size={size} />;

  // Kegiatan & Jadwal
  if (name.includes('daftar kegiatan') || page === 'isi-kegiatan') return <CalendarCheck2 size={size} />;
  if (name.includes('rekap kegiatan') || page === 'rekap-kegiatan') return <CalendarRange size={size} />;
  if (name.includes('logbook') || page === 'kegiatan-per-orang') return <ClipboardCheck size={size} />;
  if (name.includes('draft jadwal') || page === 'draft-jadwal') return <CalendarPlus size={size} />;
  if (name.includes('master jenis kegiatan') || page === 'master-jenis-kegiatan') return <Tags size={size} />;
  if (name.includes('master kegiatan') || page === 'master-kegiatan') return <CalendarDays size={size} />;
  if (name.includes('master subkegiatan') || page === 'master-subkegiatan') return <ListTree size={size} />;
  if (name.includes('kode kegiatan') || page === 'master-tipe-kegiatan') return <Hash size={size} />;
  if (name.includes('kegiatan')) return <Calendar size={size} />;

  // Olah Data & Verifikasi
  if (name.includes('geografis') || page === 'olah-data-geografis') return <MapPin size={size} />;
  if (name.includes('rekap manual') || page === 'olah-data-manual') return <Table size={size} />;
  if (name.includes('komparasi') || page === 'olah-data-komparasi') return <GitCompare size={size} />;
  if (name.includes('update & merge') || name.includes('merge') || page === 'olah-data-update') return <Combine size={size} />;
  if (name.includes('verifikasi') || page === 'olah-data-verifikasi') return <ShieldCheck size={size} />;
  if (name.includes('olah data') || page === 'olah-data') return <FileSpreadsheet size={size} />;

  // Pegawai, Akun & Profil
  if (name.includes('manajemen pegawai') || page === 'manajemen-pegawai') return <Users2 size={size} />;
  if (name.includes('profil saya') || page === 'profil-saya') return <UserCircle size={size} />;
  if (name.includes('asn') || name.includes('data asn')) return <IdCard size={size} />;
  if (name.includes('skp') || page === 'skp') return <Award size={size} />;
  if (name.includes('lhkp')) return <Coins size={size} />;
  if (name.includes('user') || page === 'manajemen-user') return <UserCog size={size} />;
  if (name.includes('hak akses') || page === 'manajemen-hak-akses') return <KeyRound size={size} />;
  if (name.includes('pegawai')) return <Users size={size} />;

  // Perencanaan & Penganggaran
  if (name.includes('rpjpd') || page === 'rpjpd') return <Compass size={size} />;
  if (name.includes('rpjmd') || name.includes('renstra') || page === 'rpjmd-renstra') return <Target size={size} />;
  if (name.includes('rkpd') || name.includes('renja per') || page === 'renja-perubahan') return <FileDiff size={size} />;
  if (name.includes('rkpd') || name.includes('renja') || page === 'renja') return <CalendarCheck2 size={size} />;
  if (name.includes('dak') || name.includes('bankeu') || name.includes('hibah') || name.includes('bansos')) return <HandCoins size={size} />;
  if (name.includes('anggaran') || name.includes('penganggaran') || name.includes('apbd')) return <Landmark size={size} />;
  if (name.includes('kua') || name.includes('ppas')) return <Wallet size={size} />;
  if (name.includes('dpa') || name.includes('rka')) return <PieChart size={size} />;
  if (name.includes('evkin')) return <Activity size={size} />;
  if (name.includes('pemetaan bidang') || page === 'mapping-urusan') return <Network size={size} />;
  if (name.includes('pemetaan kegiatan') || page === 'mapping-kegiatan') return <Workflow size={size} />;
  if (name.includes('pemetaan instansi') || page === 'mapping-instansi') return <Building2 size={size} />;
  if (name.includes('pemegang sektor') || page === 'mapping-sektor') return <Briefcase size={size} />;
  if (name.includes('perencanaan')) return <Workflow size={size} />;
  if (name.includes('tematik') || page === 'ruang-tematik') return <Sparkles size={size} />;

  // Dokumen, Berkas & Arsip
  if (name.includes('dokumen saya')) return <FolderHeart size={size} />;
  if (name.includes('dokumen') || name.includes('berkas') || page === 'manajemen-dokumen') return <FolderArchive size={size} />;
  if (name.includes('klasifikasi arsip') || page === 'master-klasifikasi') return <BookmarkCheck size={size} />;

  // Master Data & Sistem
  if (name.includes('quick access') || page === 'quick-access') return <Zap size={size} />;
  if (name.includes('booking')) return <CalendarClock size={size} />;
  if (name.includes('bidang instansi') || name.includes('kelola bidang') || page === 'master-bidang-instansi') return <Building2 size={size} />;
  if (name.includes('kecamatan')) return <MapPin size={size} />;
  if (name.includes('kelurahan') || name.includes('desa')) return <Home size={size} />;
  if (name.includes('tahun') || page === 'master-tahun') return <CalendarDays size={size} />;
  if (name.includes('link eksternal') || page === 'master-aplikasi-external') return <ExternalLink size={size} />;
  if (name.includes('panduan') || page === 'petunjuk-teknis') return <BookOpen size={size} />;
  if (name.includes('aplikasi') || page === 'kelola-aplikasi') return <LayoutGrid size={size} />;
  if (name.includes('instansi') || page === 'internal-instansi') return <Building size={size} />;
  if (name.includes('pengaturan') || page.includes('setting')) return <Settings size={size} />;

  // 2. Custom Icon in DB if valid Lucide icon (excluding blank paper ones)
  if (rawIcon && (Icons as any)[rawIcon] && rawIcon !== 'FileText' && rawIcon !== 'File') {
    const CustomIcon = (Icons as any)[rawIcon];
    return <CustomIcon size={size} />;
  }

  // 3. Fallback
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

  // Filtered menus for search (searches across all levels!)
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
          
          {/* KIRI 1: Buat Laporan (notulen-maker) - Warna 3: Oranye Terang Bapperida */}
          <button
            onClick={() => onNavigate('notulen-maker')}
            className={`flex flex-col items-center justify-center flex-1 py-1 transition-all active:scale-95 ${
              currentPage === 'notulen-maker' ? 'font-black' : 'text-slate-500 hover:text-slate-800'
            }`}
            style={{
              color: currentPage === 'notulen-maker' ? '#fe9600' : undefined
            }}
            title="Buat Laporan / Notulen"
          >
            <div 
              className="p-1.5 rounded-xl transition-colors"
              style={{
                backgroundColor: currentPage === 'notulen-maker' ? '#fff7ed' : undefined,
                color: currentPage === 'notulen-maker' ? '#fe9600' : undefined
              }}
            >
              <BookOpen size={20} strokeWidth={currentPage === 'notulen-maker' ? 2.3 : 1.8} />
            </div>
            <span className="text-[10px] font-bold tracking-tight mt-0.5 leading-none">Laporan</span>
          </button>

          {/* KIRI 2: Buat Surat (surat-maker) - Warna 1: Biru Langit Bapperida */}
          <button
            onClick={() => onNavigate('surat-maker')}
            className={`flex flex-col items-center justify-center flex-1 py-1 transition-all active:scale-95 ${
              currentPage === 'surat-maker' ? 'font-black' : 'text-slate-500 hover:text-slate-800'
            }`}
            style={{
              color: currentPage === 'surat-maker' ? '#0097fe' : undefined
            }}
            title="Buat Surat Baru"
          >
            <div 
              className="p-1.5 rounded-xl transition-colors"
              style={{
                backgroundColor: currentPage === 'surat-maker' ? '#f0f8ff' : undefined,
                color: currentPage === 'surat-maker' ? '#0097fe' : undefined
              }}
            >
              <MailPlus size={20} strokeWidth={currentPage === 'surat-maker' ? 2.3 : 1.8} />
            </div>
            <span className="text-[10px] font-bold tracking-tight mt-0.5 leading-none">Surat</span>
          </button>

          {/* TENGAH: SEMUA MENU (4 Kotak / LayoutGrid - Dinamis Sesuai Warna 1 Tema) */}
          <div className="flex flex-col items-center justify-center flex-1 relative">
            <button
              onClick={() => {
                setMenuStack([]);
                setIsMenuOpen(prev => !prev);
              }}
              className={`relative -top-5 w-14 h-14 rounded-full flex items-center justify-center text-white border-[3.5px] border-white shadow-xl transition-all duration-300 active:scale-90 ${
                isMenuOpen 
                  ? 'rotate-90 scale-95' 
                  : 'hover:scale-105'
              }`}
              style={{
                backgroundColor: isMenuOpen ? '#1e293b' : 'var(--theme-color-1, #0097fe)',
                boxShadow: isMenuOpen 
                  ? '0 10px 25px -5px rgba(30, 41, 59, 0.4)' 
                  : '0 10px 25px -5px color-mix(in srgb, var(--theme-color-1, #0097fe) 45%, transparent)'
              }}
              title="Semua Menu"
            >
              {isMenuOpen ? (
                <X size={24} className="stroke-[2.5]" />
              ) : (
                <BapperidaDualIcon size={22} className="text-white animate-in zoom-in-75 duration-200" />
              )}
            </button>
            <span 
              className="text-[9.5px] font-black uppercase tracking-wider -mt-3.5 leading-none"
              style={{
                color: isMenuOpen ? 'var(--theme-color-1, #0097fe)' : '#334155'
              }}
            >
              Menu
            </span>
          </div>

          {/* KANAN 1: To Do List - Warna 2: Hijau Segar Bapperida */}
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

          {/* KANAN 2: Inbox - Warna 4: Biru Tua Bapperida */}
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

          {/* Bottom Sheet Body: Slides Up From Bottom with Generous Width & White Background */}
          <div className="relative z-10 bg-white rounded-t-[2.5rem] shadow-2xl border-t border-slate-200/90 flex flex-col w-full max-w-lg mx-auto min-h-[480px] max-h-[88vh] overflow-hidden animate-in slide-in-from-bottom duration-300">
            
            {/* Top Drag Handle */}
            <div className="pt-3 pb-1 flex justify-center shrink-0">
              <div className="w-12 h-1.5 bg-slate-300 rounded-full" />
            </div>

            {/* Header: Title, Bapperida Curves & Close (Solid, Tanpa Gradasi) */}
            <div className="px-5 pt-2 pb-3.5 bg-white border-b border-slate-200/80 flex items-center justify-between shrink-0 relative overflow-hidden">
              {/* Siluet garis melengkung huruf b khas Bapperida di header */}
              <BapperidaCurvesHeader className="opacity-45" />

              <div className="flex items-center gap-3 relative z-10">
                <div 
                  className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-xs"
                  style={{
                    backgroundColor: 'var(--theme-color-1, #0097fe)',
                    boxShadow: '0 4px 14px color-mix(in srgb, var(--theme-color-1, #0097fe) 30%, transparent)'
                  }}
                >
                  <LayoutGrid size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-800 tracking-tight leading-none">
                    Katalog Menu
                  </h3>
                  <p className="text-[11px] font-semibold text-slate-400 mt-1">
                    Sentuh menu untuk membuka fitur
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  setMenuStack([]);
                  setIsMenuOpen(false);
                }}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-all active:scale-95 relative z-10"
                title="Tutup Menu"
              >
                <X size={17} />
              </button>
            </div>

            {/* Search Bar */}
            <div className="px-5 pt-3 pb-2.5 bg-white border-b border-slate-100 shrink-0">
              <div className="relative">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari fitur (contoh: kegiatan, surat, skp)..."
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  className="w-full pl-10 pr-8 py-2.5 bg-slate-50 rounded-2xl text-xs font-semibold text-slate-800 placeholder-slate-400 border border-slate-200 focus:bg-white focus:outline-none focus:border-[#0097fe] transition-all"
                />
                {searchKeyword && (
                  <button
                    onClick={() => setSearchKeyword('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 rounded-full"
                  >
                    <X size={15} />
                  </button>
                )}
              </div>
            </div>

            {/* Menu Grid (4 Warna Bapperida Harmonis - Tanpa Gradasi) */}
            <div className="flex-1 overflow-y-auto px-5 py-6 pb-12 custom-scrollbar relative">
              {isSearching ? (
                /* Search Results Mode */
                searchResults.length === 0 ? (
                  <div className="py-16 text-center text-slate-400">
                    <Layers size={40} className="mx-auto mb-2.5 opacity-30" />
                    <p className="text-xs font-bold text-slate-500">Tidak ada menu yang sesuai dengan "{searchKeyword}"</p>
                  </div>
                ) : (
                  <div>
                    <div className="text-[10.5px] font-black text-slate-400 uppercase tracking-wider mb-4 px-1">
                      Hasil Pencarian ({searchResults.length} Fitur)
                    </div>
                    <div className="grid grid-cols-4 gap-y-6 gap-x-3">
                      {searchResults.map((item) => {
                        const bColor = getMenuBapperidaColor(item.nama_menu, item.action_page || '', item.id);
                        return (
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
                            className="group flex flex-col items-center text-center p-1 rounded-2xl hover:bg-slate-50 active:scale-95 transition-all duration-200"
                          >
                            <div 
                              className="relative w-15 h-15 sm:w-16 sm:h-16 rounded-2xl sm:rounded-3xl border flex items-center justify-center transition-all duration-300 group-hover:scale-105 shadow-xs"
                              style={{
                                backgroundColor: bColor.bg,
                                borderColor: bColor.border,
                                color: bColor.solid
                              }}
                            >
                              {resolveMenuIcon(item, 25)}
                            </div>
                            <span className="text-[10.5px] sm:text-[11px] font-bold text-slate-700 mt-2 line-clamp-2 leading-tight tracking-tight transition-colors max-w-[80px]">
                              {item.nama_menu}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )
              ) : (
                /* Normal Category Mode */
                <div className="grid grid-cols-4 gap-y-6 gap-x-3">
                  {topLevelMenus.map((item) => {
                    const subs = childrenMap[item.id] || [];
                    const hasSub = subs.length > 0;
                    const isExternal = !!item.aplikasi_external_id;
                    const bColor = getMenuBapperidaColor(item.nama_menu, item.action_page || '', item.id);

                    return (
                      <button
                        key={item.id}
                        onClick={() => handleMenuClick(item)}
                        className="group flex flex-col items-center text-center p-1 rounded-2xl hover:bg-slate-50 active:scale-95 transition-all duration-200"
                      >
                        {/* WADAH IKON: Solid 4 Warna Bapperida (Tanpa Gradasi) */}
                        <div 
                          className="relative w-15 h-15 sm:w-16 sm:h-16 rounded-2xl sm:rounded-3xl border flex items-center justify-center transition-all duration-300 group-hover:scale-105 shadow-xs"
                          style={{
                            backgroundColor: bColor.bg,
                            borderColor: bColor.border,
                            color: bColor.solid
                          }}
                        >
                          {resolveMenuIcon(item, 25)}

                          {/* Submenu Indicator Dot */}
                          {hasSub && (
                            <span 
                              className="absolute -top-1 -right-1 w-4 h-4 text-white rounded-full flex items-center justify-center border-2 border-white shadow-xs"
                              style={{
                                backgroundColor: bColor.solid
                              }}
                            >
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
                        <span className="text-[10.5px] sm:text-[11px] font-bold text-slate-700 mt-2 line-clamp-2 leading-tight tracking-tight transition-colors max-w-[80px]">
                          {item.nama_menu}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Siluet Watermark Logo Bapperida di latar belakang grid */}
              <BapperidaSilhouetteWatermark size={180} className="-bottom-8 -right-8" />
            </div>

            {/* Bottom Sheet Footer Hint */}
            <div className="py-2.5 px-4 bg-slate-100/80 border-t border-slate-200/60 text-center shrink-0">
              <span className="text-[10.5px] font-semibold text-slate-400">
                Pilih menu bertitik untuk melihat sub-fitur
              </span>
            </div>

          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 3. SUB-MENU BOTTOM SHEET (LUAS, ESTETIK & IKON COCOK)         */}
      {/* ============================================================== */}
      {currentStackParent && (
        <div className="fixed inset-0 z-[10005] lg:hidden flex flex-col justify-end">
          {/* Dark Backdrop */}
          <div 
            className="absolute inset-0 bg-slate-950/65 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setMenuStack([])}
          />

          {/* Generous & Spacious Sub-Menu Sheet */}
          <div className="relative z-10 bg-white w-full max-w-lg mx-auto rounded-t-[2.5rem] p-5 sm:p-6 pb-10 shadow-2xl border-t border-slate-200/90 animate-in slide-in-from-bottom duration-250 flex flex-col min-h-[380px] max-h-[85vh] overflow-hidden">
            
            {/* Top Drag Indicator */}
            <div className="pt-0 pb-2.5 flex justify-center shrink-0">
              <div className="w-12 h-1.5 bg-slate-200 rounded-full" />
            </div>

            {/* Header Pop-up: Back button (if drilled down) or Title + Close (with Bapperida Curves) */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0 relative overflow-hidden">
              {/* Siluet garis melengkung huruf b khas Bapperida di header */}
              <BapperidaCurvesHeader className="opacity-40" />

              <div className="flex items-center gap-3 min-w-0 relative z-10">
                {menuStack.length > 1 ? (
                  <button
                    onClick={handlePopStack}
                    className="p-2 -ml-1 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-2xl transition-all active:scale-95 flex items-center gap-1.5 shrink-0"
                    title="Kembali"
                  >
                    <ArrowLeft size={18} />
                    <span className="text-xs font-bold hidden sm:inline">Kembali</span>
                  </button>
                ) : (
                  <div 
                    className="w-12 h-12 rounded-2xl border flex items-center justify-center shadow-xs shrink-0"
                    style={{
                      backgroundColor: getMenuBapperidaColor(currentStackParent.nama_menu, currentStackParent.action_page || '', currentStackParent.id).bg,
                      borderColor: getMenuBapperidaColor(currentStackParent.nama_menu, currentStackParent.action_page || '', currentStackParent.id).border,
                      color: getMenuBapperidaColor(currentStackParent.nama_menu, currentStackParent.action_page || '', currentStackParent.id).solid
                    }}
                  >
                    {resolveMenuIcon(currentStackParent, 24)}
                  </div>
                )}
                
                <div className="min-w-0">
                  <h4 className="text-base font-black text-slate-800 tracking-tight leading-tight truncate">
                    {currentStackParent.nama_menu}
                  </h4>
                  <p className="text-[11px] font-semibold text-slate-400 mt-0.5 truncate">
                    {menuStack.length > 1 
                      ? `${menuStack[menuStack.length - 2].nama_menu} • ${currentStackChildren.length} Fitur`
                      : `Pilih fitur (${currentStackChildren.length} opsi):`
                    }
                  </p>
                </div>
              </div>

              <button
                onClick={() => setMenuStack([])}
                className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors shrink-0 ml-2 active:scale-95 relative z-10"
                title="Tutup"
              >
                <X size={18} />
              </button>
            </div>

            {/* GRID OF SUB-MENU ICONS (SPACIOUS, SOLID 4 WARNA BAPPERIDA, TANPA GRADASI) */}
            <div className="flex-1 overflow-y-auto py-5 px-1 custom-scrollbar relative">
              {currentStackChildren.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <Layers size={36} className="mx-auto mb-2 opacity-30" />
                  <p className="text-xs font-bold">Tidak ada sub-fitur tambahan</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-y-6 gap-x-3">
                  {currentStackChildren.map((sub) => {
                    const hasDeeper = (childrenMap[sub.id] || []).length > 0;
                    const isSelected = sub.action_page === currentPage;
                    const bColor = getMenuBapperidaColor(sub.nama_menu, sub.action_page || '', sub.id);

                    return (
                      <button
                        key={sub.id}
                        onClick={() => handleSubmenuItemClick(sub)}
                        className={`group flex flex-col items-center text-center p-2 rounded-2xl transition-all duration-200 active:scale-95 ${
                          isSelected ? 'ring-2' : 'hover:bg-slate-50'
                        }`}
                        style={{
                          backgroundColor: isSelected ? bColor.bg : undefined,
                          borderColor: isSelected ? bColor.solid : undefined
                        }}
                      >
                        {/* WADAH IKON myBCA: Solid 4 Warna Bapperida (Tanpa Gradasi) */}
                        <div 
                          className="relative w-16 h-16 sm:w-17 sm:h-17 rounded-2xl sm:rounded-3xl border flex items-center justify-center transition-all duration-300 shadow-xs"
                          style={
                            isSelected ? {
                              backgroundColor: bColor.solid,
                              borderColor: bColor.solid,
                              color: '#ffffff',
                              boxShadow: `0 8px 20px -3px ${bColor.solid}55`
                            } : {
                              backgroundColor: bColor.bg,
                              borderColor: bColor.border,
                              color: bColor.solid
                            }
                          }
                        >
                          {resolveMenuIcon(sub, 26)}

                          {/* Titik indikator jika sub-menu memiliki sub-kategori lagi */}
                          {hasDeeper && (
                            <span 
                              className="absolute -top-1 -right-1 w-4 h-4 text-white rounded-full flex items-center justify-center border-2 border-white shadow-2xs"
                              style={{
                                backgroundColor: bColor.solid
                              }}
                            >
                              <span className="w-1.5 h-1.5 bg-white rounded-full"></span>
                            </span>
                          )}
                        </div>

                        {/* Label Nama Sub-Menu */}
                        <span 
                          className={`text-[11px] sm:text-xs mt-2 line-clamp-2 leading-tight tracking-tight max-w-[85px] ${
                            isSelected ? 'font-black' : 'font-bold text-slate-700'
                          }`}
                          style={{
                            color: isSelected ? bColor.solid : undefined
                          }}
                        >
                          {sub.nama_menu}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Siluet Watermark Logo Bapperida di Sub-Menu */}
              <BapperidaSilhouetteWatermark size={150} className="-bottom-8 -right-8" />
            </div>

            {/* Direct Parent Action button if parent also has an action_page */}
            {currentStackParent.action_page && (
              <div className="pt-3.5 border-t border-slate-100 shrink-0">
                <button
                  onClick={() => {
                    onNavigate(currentStackParent.action_page!);
                    setMenuStack([]);
                    setIsMenuOpen(false);
                  }}
                  className="w-full py-2.5 px-4 rounded-2xl text-xs font-bold text-center transition-all active:scale-98 bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900"
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
