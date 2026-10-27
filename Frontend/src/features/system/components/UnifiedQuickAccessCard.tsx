import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Zap, 
  Star, 
  Building2, 
  ExternalLink, 
  LayoutGrid, 
  List, 
  ChevronLeft, 
  ChevronRight, 
  GripVertical, 
  Info, 
  Loader2, 
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { api } from '@/src/services/api';
import { useAuth } from '@/src/contexts/AuthContext';

interface AplikasiItem {
  id: number | string;
  nama_aplikasi: string;
  url: string;
  keterangan?: string | null;
  is_quick_access?: number | boolean;
  is_qa_all?: number | boolean;
  is_qa_bidang?: number | boolean;
  is_qa_personal?: number | boolean;
  user_is_qa_personal?: number | boolean;
  creator_bidang_id?: number | null;
  created_by?: number;
  urutan?: number;
  personal_urutan?: number;
  is_menu?: boolean;
  action_page?: string | null;
}

export const UnifiedQuickAccessCard: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'personal' | 'team'>('personal');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  // Data states
  const [personalLinks, setPersonalLinks] = useState<AplikasiItem[]>([]);
  const [teamLinks, setTeamLinks] = useState<AplikasiItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [teamScope, setTeamScope] = useState<'ALL' | 'MY_BIDANG'>('MY_BIDANG');
  
  // Pagination & dragging
  const [personalPage, setPersonalPage] = useState<number>(1);
  const [teamPage, setTeamPage] = useState<number>(1);
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [isSavingReorder, setIsSavingReorder] = useState<boolean>(false);
  const [selectedInfoItem, setSelectedInfoItem] = useState<AplikasiItem | null>(null);

  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 640);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const ITEMS_PER_PAGE_GRID = 6;
  const ITEMS_PER_PAGE_LIST = 7;
  const itemsPerPage = viewMode === 'grid' ? ITEMS_PER_PAGE_GRID : ITEMS_PER_PAGE_LIST;

  const userBidangLabel = (user?.bidang_singkatan || user?.bidang_nama || 'Bidang').toUpperCase();

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const [resLinks, resMenus] = await Promise.all([
        api.aplikasiExternal.getAll(),
        api.menu.getAll()
      ]);

      let allRawLinks: any[] = [];
      if (resLinks && resLinks.success && Array.isArray(resLinks.data)) {
        allRawLinks = [...resLinks.data];
      }

      let allRawMenus: any[] = [];
      if (resMenus && resMenus.success && Array.isArray(resMenus.data)) {
        allRawMenus = resMenus.data.map((m: any) => ({
          ...m,
          id: `menu_${m.id}`,
          nama_aplikasi: m.nama_menu || m.nama || m.title || 'Menu',
          url: m.url || '#',
          is_menu: true,
          action_page: m.action_page || m.slug || null
        }));
      }

      const combined = [...allRawLinks, ...allRawMenus];

      // 1. Process Personal Items
      const currentUserId = user?.id ? Number(user.id) : null;
      const pItems = combined.filter((item: any) => {
        if (Number(item.user_is_qa_personal) === 1) return true;
        if (currentUserId && Number(item.created_by) === currentUserId && Number(item.is_qa_personal) === 1) {
          return true;
        }
        return false;
      });

      pItems.sort((a: any, b: any) => {
        const orderA = a.personal_urutan !== undefined && a.personal_urutan !== null ? Number(a.personal_urutan) : 999999;
        const orderB = b.personal_urutan !== undefined && b.personal_urutan !== null ? Number(b.personal_urutan) : 999999;
        if (orderA !== orderB) return orderA - orderB;
        return String(a.nama_aplikasi).localeCompare(String(b.nama_aplikasi));
      });
      setPersonalLinks(pItems);

      // 2. Process Team Items
      const tItems = combined.filter((item: any) => {
        return (
          Number(item.is_qa_all) === 1 || 
          Number(item.is_qa_bidang) === 1
        );
      });

      tItems.sort((a: any, b: any) => {
        const orderA = a.urutan !== undefined && a.urutan !== null ? Number(a.urutan) : 999999;
        const orderB = b.urutan !== undefined && b.urutan !== null ? Number(b.urutan) : 999999;
        if (orderA !== orderB) return orderA - orderB;
        return String(a.nama_aplikasi).localeCompare(String(b.nama_aplikasi));
      });
      setTeamLinks(tItems);

    } catch (err) {
      console.error('Failed to load Unified Quick Access data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [user]);

  // Filter Team items based on scope
  const filteredTeamLinks = useMemo(() => {
    if (teamScope === 'ALL') return teamLinks;
    const userBidangId = Number(user?.bidang_id || 0);
    return teamLinks.filter(item => {
      if (Number(item.is_qa_all) === 1) return true;
      if (Number(item.is_qa_bidang) === 1) {
        if (!userBidangId) return true;
        return Number(item.creator_bidang_id) === userBidangId;
      }
      return false;
    });
  }, [teamLinks, teamScope, user]);

  // Paginated Slices
  const currentActiveList = activeTab === 'personal' ? personalLinks : filteredTeamLinks;
  const currentPage = activeTab === 'personal' ? personalPage : teamPage;
  const setCurrentPage = activeTab === 'personal' ? setPersonalPage : setTeamPage;

  const totalPages = Math.ceil(currentActiveList.length / itemsPerPage) || 1;
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return currentActiveList.slice(start, start + itemsPerPage);
  }, [currentActiveList, currentPage, itemsPerPage]);

  // Handle Drag Reorder for Personal
  const handleDragStart = (e: React.DragEvent, index: number) => {
    if (activeTab !== 'personal') return;
    setDraggedIdx(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (activeTab !== 'personal' || draggedIdx === null || draggedIdx === index) return;
  };

  const handleDrop = async (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (activeTab !== 'personal' || draggedIdx === null || draggedIdx === targetIndex) return;

    const actualDraggedIdx = (personalPage - 1) * itemsPerPage + draggedIdx;
    const actualTargetIdx = (personalPage - 1) * itemsPerPage + targetIndex;

    const newItems = [...personalLinks];
    const [moved] = newItems.splice(actualDraggedIdx, 1);
    newItems.splice(actualTargetIdx, 0, moved);

    setPersonalLinks(newItems);
    setDraggedIdx(null);
    setIsSavingReorder(true);

    try {
      const extLinksOnly = newItems
        .filter(item => !item.is_menu)
        .map(item => ({
          id: Number(item.id),
          urutan: Number(item.personal_urutan || 0)
        }));
      const menusOnly = newItems
        .filter(item => item.is_menu)
        .map(item => ({
          id: Number(String(item.id).replace('menu_', '')),
          urutan: Number(item.personal_urutan || 0)
        }));

      const promises: Promise<any>[] = [];
      if (extLinksOnly.length > 0) {
        promises.push(api.aplikasiExternal.reorder(extLinksOnly, 'PERSONAL'));
      }
      if (menusOnly.length > 0) {
        promises.push(api.menu.reorder(menusOnly, 'PERSONAL'));
      }
      await Promise.all(promises);
      window.dispatchEvent(new CustomEvent('quick-access:changed'));
    } catch (err) {
      console.error('Failed to save personal reorder:', err);
      fetchAllData();
    } finally {
      setIsSavingReorder(false);
    }
  };

  // Click Item Handler
  const handleItemClick = (item: AplikasiItem) => {
    if (item.is_menu && item.action_page) {
      window.dispatchEvent(new CustomEvent('navigate-page', { detail: { page: item.action_page } }));
      return;
    }
    if (item.url && item.url !== '#') {
      window.open(item.url, '_blank', 'noopener,noreferrer');
    }
  };

  // Pastel Color Palette for App Icon Tiles
  const getAppIconBadge = (name: string, index: number) => {
    const palettes = [
      { bg: 'bg-blue-50 text-blue-600 border-blue-100', dot: 'bg-blue-500' },
      { bg: 'bg-emerald-50 text-emerald-600 border-emerald-100', dot: 'bg-emerald-500' },
      { bg: 'bg-amber-50 text-amber-600 border-amber-100', dot: 'bg-amber-500' },
      { bg: 'bg-indigo-50 text-indigo-600 border-indigo-100', dot: 'bg-indigo-500' },
      { bg: 'bg-rose-50 text-rose-600 border-rose-100', dot: 'bg-rose-500' },
      { bg: 'bg-purple-50 text-purple-600 border-purple-100', dot: 'bg-purple-500' },
    ];
    const p = palettes[index % palettes.length];
    const initial = name ? name.trim().charAt(0).toUpperCase() : '?';
    return { ...p, initial };
  };

  return (
    <div className="card-modern h-full lg:h-[450px] flex flex-col justify-between overflow-hidden shadow-xs border border-slate-100 hover:shadow-md transition-all duration-300">
      {/* Header */}
      <div className="px-4 sm:px-5 py-3 border-b border-slate-100/80 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div 
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-xs"
            style={{ backgroundColor: 'var(--theme-color-1, #0097fe)' }}
          >
            <Zap size={17} strokeWidth={2.4} />
          </div>
          <div className="min-w-0">
            <h2 className="text-xs sm:text-sm font-black text-slate-800 tracking-tight uppercase flex items-center gap-1.5 truncate">
              <span>Akses Cepat Pintar</span>
              {isSavingReorder && <Loader2 size={12} className="animate-spin text-slate-400" />}
            </h2>
          </div>
        </div>

        {/* Tab Switcher & View Mode Controls (Compact & Proportional) */}
        <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
          {/* Main Tabs */}
          <div className="flex items-center gap-0.5 bg-slate-100/80 p-0.5 rounded-xl border border-slate-200/60 text-xs">
            <button
              type="button"
              onClick={() => { setActiveTab('personal'); setPersonalPage(1); }}
              className={`px-2 py-1 rounded-lg text-[10px] font-extrabold transition-all flex items-center gap-1 cursor-pointer whitespace-nowrap ${
                activeTab === 'personal'
                  ? 'bg-white shadow-xs border border-slate-200/60 text-amber-600'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Akses Cepat Personal"
            >
              <Star size={11} className={activeTab === 'personal' ? 'fill-amber-400 text-amber-500' : ''} />
              {activeTab === 'personal' && <span>Personal</span>}
              <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-slate-200/60 font-black text-slate-600 leading-none">
                {personalLinks.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => { setActiveTab('team'); setTeamPage(1); }}
              className={`px-2 py-1 rounded-lg text-[10px] font-extrabold transition-all flex items-center gap-1 cursor-pointer whitespace-nowrap ${
                activeTab === 'team'
                  ? 'bg-white shadow-xs border border-slate-200/60'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              style={{
                color: activeTab === 'team' ? 'var(--theme-color-1, #0097fe)' : undefined
              }}
              title="Akses Cepat Bidang & PPM"
            >
              <Building2 size={11} />
              {activeTab === 'team' && <span>Bidang & PPM</span>}
              <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-slate-200/60 font-black text-slate-600 leading-none">
                {filteredTeamLinks.length}
              </span>
            </button>
          </div>

          {/* View Mode Toggle: Grid vs List (Icon only) */}
          <div className="flex items-center gap-0.5 bg-slate-100/80 p-0.5 rounded-xl border border-slate-200/60">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-1 sm:p-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'grid' ? 'bg-white text-slate-800 shadow-2xs font-bold' : 'text-slate-400 hover:text-slate-700'
              }`}
              title="Tampilan Ubin Grid"
            >
              <LayoutGrid size={12} />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`p-1 sm:p-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'list' ? 'bg-white text-slate-800 shadow-2xs font-bold' : 'text-slate-400 hover:text-slate-700'
              }`}
              title="Tampilan List Kompak"
            >
              <List size={12} />
            </button>
          </div>
        </div>
      </div>

      {/* Sub-header for Team Scope if tab is team */}
      {activeTab === 'team' && (
        <div className="px-6 py-2 bg-slate-50/70 border-b border-slate-100 flex items-center justify-between text-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Visibilitas Tim
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => { setTeamScope('ALL'); setTeamPage(1); }}
              className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold transition-all ${
                teamScope === 'ALL' ? 'bg-white text-slate-800 shadow-2xs border border-slate-200' : 'text-slate-500'
              }`}
            >
              Semua
            </button>
            <button
              type="button"
              onClick={() => { setTeamScope('MY_BIDANG'); setTeamPage(1); }}
              className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold transition-all ${
                teamScope === 'MY_BIDANG' ? 'bg-white text-blue-600 shadow-2xs border border-slate-200' : 'text-slate-500'
              }`}
            >
              {userBidangLabel}
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="p-4 sm:p-5 flex-1 overflow-y-auto custom-scrollbar">
        {loading ? (
          <div className="h-full flex flex-col items-center justify-center gap-2 text-slate-400">
            <Loader2 size={24} className="animate-spin text-ppm-blue" />
            <span className="text-xs font-bold animate-pulse">Memuat akses cepat...</span>
          </div>
        ) : paginatedItems.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center p-6 text-center text-slate-400">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-2">
              <Zap size={22} />
            </div>
            <p className="text-xs font-bold text-slate-600">Belum ada item akses cepat</p>
            <p className="text-[11px] text-slate-400 mt-1 max-w-xs">
              {activeTab === 'personal' 
                ? 'Gunakan menu QAF (3-titik) pada Daftar Link untuk menambahkan item ke Akses Cepat Personal Anda.' 
                : 'Belum ada link bidang atau seluruh instansi yang disematkan.'}
            </p>
          </div>
        ) : viewMode === 'grid' ? (
          /* ================= GRID / APP TILES VIEW ================= */
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {paginatedItems.map((item, idx) => {
              const badge = getAppIconBadge(item.nama_aplikasi, idx);
              return (
                <div
                  key={item.id}
                  draggable={activeTab === 'personal'}
                  onDragStart={(e) => handleDragStart(e, idx)}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDrop={(e) => handleDrop(e, idx)}
                  onClick={() => handleItemClick(item)}
                  className={`group relative p-3 rounded-2xl border border-slate-100 bg-white hover:border-blue-200 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer flex flex-col justify-between ${
                    draggedIdx === idx ? 'opacity-30 border-dashed border-blue-400' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-1 mb-2">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm border shadow-2xs ${badge.bg}`}>
                      {badge.initial}
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {item.keterangan && (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setSelectedInfoItem(item); }}
                          className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                          title="Info keterangan"
                        >
                          <Info size={12} />
                        </button>
                      )}
                      <ExternalLink size={12} className="text-slate-400 group-hover:text-blue-600" />
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-bold text-slate-800 group-hover:text-ppm-blue transition-colors line-clamp-2 leading-snug">
                      {item.nama_aplikasi}
                    </div>
                    <div className="flex items-center gap-1.5 mt-1.5 text-[9px] font-semibold text-slate-400">
                      <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                      <span>{item.is_menu ? 'Menu Internal' : 'Aplikasi Web'}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* ================= LIST COMPACT VIEW ================= */
          <div className="divide-y divide-slate-100 rounded-2xl border border-slate-100 overflow-hidden bg-white">
            {paginatedItems.map((item, idx) => {
              const badge = getAppIconBadge(item.nama_aplikasi, idx);
              return (
                <div
                  key={item.id}
                  draggable={activeTab === 'personal'}
                  onDragStart={(e) => handleDragStart(e, idx)}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDrop={(e) => handleDrop(e, idx)}
                  onClick={() => handleItemClick(item)}
                  className={`group px-3 py-2.5 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors cursor-pointer ${
                    draggedIdx === idx ? 'opacity-30 bg-blue-50/50' : ''
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {activeTab === 'personal' && (
                      <span className="text-slate-300 group-hover:text-slate-500 cursor-grab active:cursor-grabbing">
                        <GripVertical size={13} />
                      </span>
                    )}
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs border shrink-0 ${badge.bg}`}>
                      {badge.initial}
                    </div>
                    <span className="text-xs font-bold text-slate-800 group-hover:text-ppm-blue truncate">
                      {item.nama_aplikasi}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 hidden sm:inline">
                      {item.is_menu ? 'Internal' : 'External'}
                    </span>
                    <ArrowRight size={13} className="text-slate-300 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer Navigation */}
      <div className="px-5 py-2.5 border-t border-slate-100 bg-white flex items-center justify-between shrink-0">
        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
          {currentActiveList.length} Item Tersedia
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
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={13} />
            </button>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* Information Modal */}
      {selectedInfoItem && (
        <div 
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setSelectedInfoItem(null)}
        >
          <div 
            className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <Info size={16} />
              </div>
              <h3 className="text-sm font-bold text-slate-800 truncate">
                {selectedInfoItem.nama_aplikasi}
              </h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-2xl border border-slate-100 mb-4">
              {selectedInfoItem.keterangan || 'Tidak ada keterangan tambahan.'}
            </p>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedInfoItem(null)}
                className="px-4 py-1.5 rounded-xl bg-slate-800 text-white font-bold text-xs hover:bg-slate-700 transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UnifiedQuickAccessCard;
