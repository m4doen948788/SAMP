import React, { useState, useEffect, useMemo } from 'react';
import { ArrowRight, UserCheck, Star, ChevronLeft, ChevronRight } from 'lucide-react';
import { api } from '@/src/services/api';
import { useAuth } from '@/src/contexts/AuthContext';

interface AplikasiItem {
  id: number | string;
  nama_aplikasi: string;
  url: string;
  keterangan?: string | null;
  is_qa_personal?: number | boolean;
  user_is_qa_personal?: number | boolean;
  created_by?: number;
  urutan?: number;
  is_menu?: boolean;
  action_page?: string | null;
}

const ITEMS_PER_PAGE = 7;

const QuickAccessPersonalDashboardCard = () => {
  const { user } = useAuth();
  const [links, setLinks] = useState<AplikasiItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [currentPage, setCurrentPage] = useState<number>(1);

  useEffect(() => {
    const fetchPersonalQuickAccess = async () => {
      try {
        setLoading(true);
        const [resLinks, resMenus] = await Promise.all([
          api.aplikasiExternal.getAll(),
          api.menu.getAll()
        ]);
        
        let combined: any[] = [];
        if (resLinks && resLinks.success && Array.isArray(resLinks.data)) {
          combined = [...resLinks.data];
        }
        
        if (resMenus && resMenus.success && Array.isArray(resMenus.data)) {
          // Filter out menus that are quick access and format them to match the AplikasiItem interface
          const qaMenus = resMenus.data
            .filter((m: any) => m.is_quick_access === 1 || m.is_quick_access === true)
            .map((m: any) => ({
              id: `menu-${m.id}`,
              nama_aplikasi: m.nama_menu,
              url: m.action_page || '#',
              is_menu: true,
              action_page: m.action_page,
              is_quick_access: 1,
              user_is_qa_personal: 1, // Menus pinned to Quick Access are shown under Personal QA
              personal_urutan: m.urutan || 0,
              keterangan: 'Fitur Aplikasi Internal'
            }));
          combined = [...combined, ...qaMenus];
        }
        
        setLinks(combined);
      } catch (err) {
        console.error('Failed to fetch personal quick access:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPersonalQuickAccess();
    window.addEventListener('quick-access:changed', fetchPersonalQuickAccess);
    return () => {
      window.removeEventListener('quick-access:changed', fetchPersonalQuickAccess);
    };
  }, []);

  const personalLinks = useMemo(() => {
    const currentUserId = user?.id ? Number(user.id) : null;
    const result = links.filter(item => 
      Number(item.user_is_qa_personal) === 1 || 
      (Number(item.is_qa_personal) === 1 && Number(item.created_by) === currentUserId)
    );
    return [...result].sort((a, b) => {
      const ordA = Number((a as any).personal_urutan || 0);
      const ordB = Number((b as any).personal_urutan || 0);
      if (ordA !== ordB) return ordA - ordB;
      const idA = typeof a.id === 'string' && a.id.startsWith('menu-') ? Number(a.id.replace('menu-', '')) * 1000 : Number(a.id);
      const idB = typeof b.id === 'string' && b.id.startsWith('menu-') ? Number(b.id.replace('menu-', '')) * 1000 : Number(b.id);
      return idB - idA;
    });
  }, [links, user]);

  const totalPages = Math.ceil(personalLinks.length / ITEMS_PER_PAGE) || 1;

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [personalLinks.length, totalPages, currentPage]);

  const paginatedLinks = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return personalLinks.slice(start, start + ITEMS_PER_PAGE);
  }, [personalLinks, currentPage]);

  const handleHeaderClick = () => {
    sessionStorage.setItem('qa_active_tab', 'PERSONAL');
    window.dispatchEvent(new CustomEvent('navigate-page', { detail: { page: 'quick-access' } }));
  };

  return (
    <div className="card-modern flex flex-col h-full group/card transition-all duration-500 hover:shadow-2xl hover:shadow-indigo-500/10 hover:-translate-y-1">
      {/* Header */}
      <div className="px-5 py-3 border-b border-slate-100 bg-white group-hover/card:bg-purple-50/30 transition-colors flex items-center justify-between gap-2 min-h-[53px]">
        <h2 
          onClick={handleHeaderClick}
          className="text-[11px] font-black text-slate-800 tracking-widest uppercase flex items-center gap-1.5 leading-tight shrink-0 cursor-pointer hover:text-purple-600 transition-colors group/h2"
          title="Buka halaman utama Quick Access Personal"
        >
          <Star size={14} className="text-purple-600 fill-purple-400 group-hover/h2:scale-110 transition-transform" />
          QUICK ACCESS PERSONAL
          {personalLinks.length > 0 && (
            <span className="ml-1 px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 text-[10px] font-extrabold border border-purple-200">
              {personalLinks.length}
            </span>
          )}
        </h2>
      </div>

      <div className="p-4 flex-1 flex flex-col justify-between">
        {loading ? (
          <div className="space-y-3 py-2">
            {[1, 2, 3, 4, 5, 6, 7].map(n => (
              <div key={n} className="h-4 bg-slate-100 rounded animate-pulse" />
            ))}
          </div>
        ) : personalLinks.length === 0 ? (
          <div className="py-8 text-center text-slate-400 space-y-1 my-auto">
            <UserCheck size={24} className="mx-auto text-purple-300 fill-purple-50" />
            <p className="text-xs font-bold text-slate-600">Quick Access Personal Kosong</p>
          </div>
        ) : (
          <ul className="space-y-3 min-h-[220px]">
            {paginatedLinks.map((link) => (
              <li key={link.id} className="group/item">
                {link.is_menu ? (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      if (link.action_page) {
                        window.dispatchEvent(new CustomEvent('navigate-page', { detail: { page: link.action_page } }));
                      }
                    }}
                    title={link.keterangan || link.nama_aplikasi}
                    className="flex items-start w-full text-left gap-2 text-[11px] font-semibold text-slate-600 hover:text-purple-600 transition-all duration-300 cursor-pointer"
                  >
                    <div className="mt-1 w-1.5 h-1.5 rounded-full bg-purple-400 group-hover/item:bg-purple-600 group-hover/item:scale-125 transition-all shrink-0" />
                    <span className="flex-1 group-hover/item:translate-x-1 transition-transform duration-300 line-clamp-2">
                      {link.nama_aplikasi} <span className="text-[9px] px-1 bg-purple-50 text-purple-600 rounded border border-purple-100 uppercase ml-1 font-black tracking-tight shrink-0 inline-block align-middle">Internal</span>
                    </span>
                    <ArrowRight size={12} className="mt-0.5 opacity-0 -translate-x-2 group-hover/item:opacity-100 group-hover/item:translate-x-0 transition-all duration-300 text-purple-500 shrink-0" />
                  </button>
                ) : (
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={link.keterangan || link.nama_aplikasi}
                    className="flex items-start gap-2 text-[11px] font-semibold text-slate-600 hover:text-purple-600 transition-all duration-300"
                  >
                    <div className="mt-1 w-1.5 h-1.5 rounded-full bg-purple-400 group-hover/item:bg-purple-600 group-hover/item:scale-125 transition-all shrink-0" />
                    <span className="flex-1 group-hover/item:translate-x-1 transition-transform duration-300 line-clamp-2">
                      {link.nama_aplikasi}
                    </span>
                    <ArrowRight size={12} className="mt-0.5 opacity-0 -translate-x-2 group-hover/item:opacity-100 group-hover/item:translate-x-0 transition-all duration-300 text-purple-500 shrink-0" />
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-3 mt-2 border-t border-slate-100/80">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
              Hal {currentPage} dari {totalPages}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className="p-1 rounded-md text-slate-500 hover:text-purple-600 hover:bg-purple-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Halaman sebelumnya"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                className="p-1 rounded-md text-slate-500 hover:text-purple-600 hover:bg-purple-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Halaman berikutnya"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuickAccessPersonalDashboardCard;
