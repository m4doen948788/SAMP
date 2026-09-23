import React, { useState, useEffect, useMemo } from 'react';
import { 
  ArrowRight, UserCheck, Star, ChevronLeft, ChevronRight, Info, 
  GripVertical, Loader2 
} from 'lucide-react';
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
  personal_urutan?: number;
  is_menu?: boolean;
  action_page?: string | null;
}

const QuickAccessPersonalDashboardCard = () => {
  const { user } = useAuth();
  const [links, setLinks] = useState<AplikasiItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(7);
  const [isSavingReorder, setIsSavingReorder] = useState<boolean>(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const measure = () => {
      const containerHeight = containerRef.current?.clientHeight || 0;
      const availableHeight = containerHeight - 32 - 45;
      const count = Math.max(3, Math.floor((availableHeight + 12) / 32));
      setItemsPerPage(count);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [loading]);

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
            personal_urutan: m.personal_urutan !== undefined && m.personal_urutan !== null ? Number(m.personal_urutan) : (m.urutan || 0),
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

  useEffect(() => {
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
      (Number(item.is_qa_personal) === 1 && (Number(item.created_by) === currentUserId || !item.created_by || Number(item.created_by) === 0))
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

  const totalPages = Math.ceil(personalLinks.length / itemsPerPage) || 1;

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [personalLinks.length, totalPages, currentPage]);

  const paginatedLinks = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return personalLinks.slice(start, start + itemsPerPage);
  }, [personalLinks, currentPage, itemsPerPage]);

  const handleHeaderClick = () => {
    sessionStorage.setItem('qa_active_tab', 'PERSONAL');
    window.dispatchEvent(new CustomEvent('navigate-page', { detail: { page: 'quick-access' } }));
  };

  // Reordering Logic
  const handleSaveReorder = async (newOrderedList: AplikasiItem[]) => {
    setIsSavingReorder(true);
    
    // Assign 1-indexed personal_urutan
    const updatedList = newOrderedList.map((item, idx) => ({
      ...item,
      personal_urutan: idx + 1
    }));

    // Optimistically update links state
    const orderMap = new Map(updatedList.map(item => [item.id, item.personal_urutan]));
    setLinks(prev => prev.map(item => {
      if (orderMap.has(item.id)) {
        return { ...item, personal_urutan: orderMap.get(item.id) };
      }
      return item;
    }));

    try {
      const externalPayload = updatedList
        .filter(item => !item.is_menu)
        .map(item => ({
          id: Number(item.id),
          urutan: Number(item.personal_urutan || 0)
        }));

      const menuPayload = updatedList
        .filter(item => item.is_menu)
        .map(item => ({
          id: Number(item.id.toString().replace('menu-', '')),
          urutan: Number(item.personal_urutan || 0)
        }));

      const promises: Promise<any>[] = [];
      if (externalPayload.length > 0) {
        promises.push(api.aplikasiExternal.reorder(externalPayload, 'PERSONAL'));
      }
      if (menuPayload.length > 0) {
        promises.push(api.menu.reorder(menuPayload, 'PERSONAL'));
      }
      await Promise.all(promises);

      window.dispatchEvent(new CustomEvent('quick-access:changed'));
    } catch (err) {
      console.error('Failed to save personal quick access reorder:', err);
      fetchPersonalQuickAccess();
    } finally {
      setIsSavingReorder(false);
    }
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    if (draggedIndex === null || draggedIndex === index) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) return;

    const updated = [...personalLinks];
    const [removed] = updated.splice(draggedIndex, 1);
    updated.splice(dropIndex, 0, removed);

    setDraggedIndex(null);
    await handleSaveReorder(updated);
  };

  return (
    <div className="card-modern flex flex-col h-full group/card transition-all duration-500 hover:shadow-2xl hover:shadow-ppm-slate-light/10 hover:-translate-y-1">
      {/* Header */}
      <div className="px-5 py-3 border-b border-slate-100 bg-white group-hover/card:bg-ppm-slate-light/5 transition-colors flex items-center justify-between gap-2 min-h-[53px]">
        <h2 
          onClick={handleHeaderClick}
          className="text-[11px] font-black text-slate-800 tracking-widest uppercase flex items-center gap-1.5 leading-tight shrink-0 cursor-pointer hover:text-ppm-slate-light transition-colors group/h2"
          title="Buka halaman utama Quick Access Personal"
        >
          <Star size={14} className="text-ppm-slate-light fill-ppm-slate-light/40 group-hover/h2:scale-110 transition-transform" />
          QUICK ACCESS PERSONAL
          {personalLinks.length > 0 && (
            <span className="ml-1 px-2 py-0.5 rounded-full bg-ppm-slate-light/10 text-ppm-slate-light text-[10px] font-extrabold border border-ppm-slate-light/20">
              {personalLinks.length}
            </span>
          )}
        </h2>

        {isSavingReorder && (
          <span className="text-[9px] font-bold text-ppm-slate-light animate-pulse flex items-center gap-1">
            <Loader2 size={11} className="animate-spin" /> Menyimpan...
          </span>
        )}
      </div>

      <div className="p-4 flex-1 flex flex-col justify-between" ref={containerRef}>
        {loading ? (
          <div className="space-y-3 py-2">
            {Array.from({ length: itemsPerPage }).map((_, n) => (
              <div key={n} className="h-4 bg-slate-100 rounded animate-pulse" />
            ))}
          </div>
        ) : personalLinks.length === 0 ? (
          <div className="py-8 text-center text-slate-400 space-y-1 my-auto">
            <UserCheck size={24} className="mx-auto text-ppm-slate-light/40 fill-ppm-slate-light/10" />
            <p className="text-xs font-bold text-slate-600">Quick Access Personal Kosong</p>
          </div>
        ) : (
          /* Normal List View with 6-Dots Drag Handle & Numbering */
          <ul className="space-y-2 flex-1 overflow-hidden">
            {paginatedLinks.map((link, idx) => {
              const actualIdx = (currentPage - 1) * itemsPerPage + idx;
              return (
                <li 
                  key={link.id} 
                  draggable={true}
                  onDragStart={(e) => handleDragStart(e, actualIdx)}
                  onDragOver={(e) => handleDragOver(e, actualIdx)}
                  onDrop={(e) => handleDrop(e, actualIdx)}
                  onDragEnd={() => setDraggedIndex(null)}
                  className={`group/item flex items-center gap-2 px-2 py-1.5 rounded-xl border transition-all ${
                    draggedIndex === actualIdx
                      ? 'opacity-40 bg-ppm-slate-light/10 border-dashed border-ppm-slate-light/40 shadow-inner'
                      : 'hover:bg-slate-50/80 border-transparent hover:border-slate-100'
                  }`}
                >
                  {/* Titik 6 & Nomor Item */}
                  <div className="flex items-center gap-0.5 shrink-0 text-slate-400 select-none">
                    <span 
                      className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-ppm-slate-light p-0.5 rounded transition-colors inline-flex items-center justify-center" 
                      title="Tahan dan geser ke atas/bawah untuk mengubah posisi"
                    >
                      <GripVertical size={13} />
                    </span>
                    <span className="text-[11px] font-black text-slate-400 tabular-nums min-w-[14px]">
                      {actualIdx + 1}.
                    </span>
                  </div>

                  {link.is_menu ? (
                    <button
                      type="button"
                      draggable={false}
                      onClick={(e) => {
                        e.preventDefault();
                        if (link.action_page) {
                          window.dispatchEvent(new CustomEvent('navigate-page', { detail: { page: link.action_page } }));
                        }
                      }}
                      title={link.keterangan || link.nama_aplikasi}
                      className="flex items-center flex-1 min-w-0 text-left gap-1.5 text-xs font-bold text-slate-700 hover:text-ppm-slate-light transition-all duration-300 cursor-pointer"
                    >
                      <span className="truncate group-hover/item:translate-x-0.5 transition-transform duration-300">
                        {link.nama_aplikasi}
                      </span>
                      {link.keterangan && (
                        <span 
                          onClick={(ev) => ev.stopPropagation()}
                          className="text-slate-400 hover:text-ppm-slate-light transition-colors cursor-help inline-flex items-center justify-center shrink-0" 
                          title={`Tooltip: ${link.keterangan}`}
                        >
                          <Info size={11} strokeWidth={2.5} />
                        </span>
                      )}
                      <span className="text-[9px] px-1 py-0.2 bg-ppm-slate-light/10 text-ppm-slate-light rounded border border-ppm-slate-light/20 uppercase font-black tracking-tight shrink-0">
                        Internal
                      </span>
                      <ArrowRight size={12} className="ml-auto opacity-0 -translate-x-1 group-hover/item:opacity-100 group-hover/item:translate-x-0 transition-all duration-300 text-ppm-slate-light shrink-0" />
                    </button>
                  ) : (
                    <a
                      href={link.url}
                      draggable={false}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={link.keterangan || link.nama_aplikasi}
                      className="flex items-center flex-1 min-w-0 gap-1.5 text-xs font-bold text-slate-700 hover:text-ppm-slate-light transition-all duration-300"
                    >
                      <span className="truncate group-hover/item:translate-x-0.5 transition-transform duration-300">
                        {link.nama_aplikasi}
                      </span>
                      {link.keterangan && (
                        <span 
                          onClick={(ev) => ev.stopPropagation()}
                          className="text-slate-400 hover:text-ppm-slate-light transition-colors cursor-help inline-flex items-center justify-center shrink-0" 
                          title={`Tooltip: ${link.keterangan}`}
                        >
                          <Info size={11} strokeWidth={2.5} />
                        </span>
                      )}
                      <ArrowRight size={12} className="ml-auto opacity-0 -translate-x-1 group-hover/item:opacity-100 group-hover/item:translate-x-0 transition-all duration-300 text-ppm-slate-light shrink-0" />
                    </a>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-3 mt-2 border-t border-slate-100/80">
            <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Hal {currentPage} dari {totalPages}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className="p-1 rounded-md text-slate-500 hover:text-ppm-slate-light hover:bg-ppm-slate-light/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                title="Halaman sebelumnya"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                className="p-1 rounded-md text-slate-500 hover:text-ppm-slate-light hover:bg-ppm-slate-light/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
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
