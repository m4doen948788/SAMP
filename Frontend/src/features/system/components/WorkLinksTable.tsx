import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Link as LinkIcon, ExternalLink, Sparkles, Layers, Info, Building2, Filter, GripVertical, ChevronLeft, ChevronRight, MoreVertical, Zap, Copy, Star, Globe } from 'lucide-react';
import { api } from '@/src/services/api';
import { useAuth } from '@/src/contexts/AuthContext';

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

const ITEMS_PER_PAGE = 7;

const WorkLinksTable = () => {
  const { user } = useAuth();
  const [links, setLinks] = useState<AplikasiItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedBidangId, setSelectedBidangId] = useState<number | 'ALL' | 'MY_BIDANG'>('MY_BIDANG');
  const [bidangOptions, setBidangOptions] = useState<{ id: number; nama: string }[]>([]);
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);

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
      const res = await api.aplikasiExternal.getAll();
      if (res && res.success && Array.isArray(res.data)) {
        setLinks(res.data);
      }

      // Fetch bidang options
      try {
        const resBidang = await api.bidangInstansi.getAll();
        if (resBidang && resBidang.success && Array.isArray(resBidang.data)) {
          const mapped = resBidang.data.map((b: any) => ({
            id: b.id,
            nama: (b.singkatan || b.nama_bidang || b.nama || `Bidang #${b.id}`).toUpperCase()
          }));
          setBidangOptions(mapped);
        }
      } catch { /* ignored */ }
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

      if (field === 'is_qa_all') newQaAll = !currentQaAll;
      if (field === 'is_qa_bidang') newQaBidang = !currentQaBidang;
      if (field === 'is_qa_personal') newQaPersonal = !currentQaPersonal;

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

    if (selectedBidangId === 'ALL') {
      // Tab Semua Bidang: tampilkan link yang target_visibilitas-nya ALL (atau kosong/fallback lama)
      return links.filter(item => {
        const tv = item.target_visibilitas;
        return !tv || tv === 'ALL';
      });
    }

    const targetBidangId = selectedBidangId === 'MY_BIDANG' ? userBidangId : Number(selectedBidangId);

    return links.filter(item => {
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
  }, [links, selectedBidangId, user]);

  const totalPages = Math.ceil(filteredLinks.length / ITEMS_PER_PAGE) || 1;

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedBidangId]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [filteredLinks.length, totalPages, currentPage]);

  const paginatedLinks = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredLinks.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredLinks, currentPage]);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    if (!canReorder) return;
    setDraggedIdx(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    if (!canReorder || draggedIdx === null || draggedIdx === index) return;
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, dropIndex: number) => {
    if (!canReorder || draggedIdx === null || draggedIdx === dropIndex) return;
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

  return (
    <div className="card-modern h-full flex flex-col group/card justify-between">
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-4 border-b border-slate-50 bg-white group-hover/card:bg-indigo-50/20 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 shrink-0">
              <LinkIcon size={18} />
            </div>
            <h2 
              onClick={handleHeaderClick}
              className="text-[11px] font-black text-slate-800 tracking-widest uppercase cursor-pointer hover:text-indigo-600 transition-colors"
              title="Buka halaman Master Aplikasi & Link Kerja"
            >
              Daftar Link Kerja & Aplikasi
            </h2>
          </div>

          {/* Filter Bidang Group */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 bg-slate-100/90 p-1 rounded-xl border border-slate-200/80 text-xs">
              <button
                type="button"
                onClick={() => setSelectedBidangId('ALL')}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold transition-all flex items-center gap-1 ${
                  selectedBidangId === 'ALL'
                    ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/60'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Building2 size={12} />
                Semua Bidang
              </button>

              {user?.bidang_id && (
                <button
                  type="button"
                  onClick={() => setSelectedBidangId('MY_BIDANG')}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold transition-all flex items-center gap-1 max-w-[160px] truncate ${
                    selectedBidangId === 'MY_BIDANG'
                      ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/20'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                  title={`Filter berdasarkan ${userBidangLabel}`}
                >
                  <Filter size={11} className="shrink-0" />
                  <span className="truncate">{userBidangLabel}</span>
                </button>
              )}
            </div>

            <button
              onClick={handleInputBaru}
              className="text-[10px] font-extrabold bg-indigo-600 text-white px-3 py-1.5 rounded-xl hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-500/30 transition-all uppercase tracking-wider cursor-pointer whitespace-nowrap"
            >
              Input Baru
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-x-auto p-6 pt-3">
          <div className="rounded-2xl border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] overflow-hidden bg-white">
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
                {loading ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-slate-400 animate-pulse">Memuat daftar link...</td>
                  </tr>
                ) : filteredLinks.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-slate-400 italic">Belum ada link eksternal yang diinput untuk bidang ini. Klik "Input Baru" untuk menambah.</td>
                  </tr>
                ) : (
                  paginatedLinks.map((link, idx) => {
                    const actualIdx = (currentPage - 1) * ITEMS_PER_PAGE + idx;
                    return (
                      <tr 
                        key={link.id || idx} 
                        draggable={canReorder}
                        onDragStart={(e) => handleDragStart(e, actualIdx)}
                        onDragOver={(e) => handleDragOver(e, actualIdx)}
                        onDrop={(e) => handleDrop(e, actualIdx)}
                        onDragEnd={() => setDraggedIdx(null)}
                        className={`hover:bg-slate-50/80 transition-all border-b border-slate-50 group/row ${
                          draggedIdx === actualIdx ? 'opacity-40 bg-indigo-50 border-dashed border-indigo-300' : ''
                        }`}
                      >
                        <td className="p-3 border-r border-slate-50 text-center text-slate-400 font-black tabular-nums whitespace-nowrap">
                          {canReorder && (
                            <span className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-indigo-600 inline-block mr-1 align-middle transition-colors" title="Drag untuk mengubah urutan">
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
                          <div className="flex items-start justify-between gap-2">
                            <a 
                              href={link.url} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              title={link.keterangan || link.nama_aplikasi}
                              className="flex flex-col gap-1 group/link flex-1 min-w-0"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-slate-700 group-hover/link:text-indigo-600 transition-colors leading-snug flex items-center gap-1.5 break-words">
                                  {link.nama_aplikasi}
                                  {link.keterangan && (
                                    <span className="text-slate-400 hover:text-indigo-500 transition-colors shrink-0" title={`Tooltip: ${link.keterangan}`}>
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
                                <ExternalLink size={12} className="opacity-0 -translate-x-2 group-hover/link:opacity-100 group-hover/link:translate-x-0 transition-all duration-300 text-indigo-500 shrink-0" />
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
                            </a>

                            {/* QAF Trigger Button */}
                            <div className="opacity-0 group-hover/td:opacity-100 transition-opacity duration-200 shrink-0 self-center">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  if (activeBalloonId === link.id) {
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
                                    setActiveBalloonId(link.id);
                                    setActiveItem(link);
                                  }
                                }}
                                className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer"
                                title="Opsi QAF"
                              >
                                <MoreVertical size={13} />
                              </button>
                            </div>
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-widest group-hover/row:bg-indigo-100 group-hover/row:text-indigo-600 transition-all">
                            {link.sumber || link.asal_instansi || '-'}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="px-6 py-3 border-t border-slate-100 bg-white flex items-center justify-between">
          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
            Menampilkan {(currentPage - 1) * ITEMS_PER_PAGE + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, filteredLinks.length)} dari {filteredLinks.length} link
          </span>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-600">
              Hal {currentPage} / {totalPages}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Halaman sebelumnya"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Halaman berikutnya"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating QAF Balloon Menu */}
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
              className="w-full text-left px-2.5 py-1.5 text-[10px] font-bold text-slate-600 hover:bg-amber-50 hover:text-amber-700 rounded-lg transition-colors flex items-center justify-between gap-1.5 cursor-pointer"
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
                    className="w-3.5 h-3.5 rounded text-amber-500 focus:ring-amber-400 cursor-pointer"
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
                    className="w-3.5 h-3.5 rounded text-amber-500 focus:ring-amber-400 cursor-pointer"
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
            className="w-full text-left px-2.5 py-1.5 text-[10px] font-bold text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Copy size={12} className="text-slate-400" />
            Salin Link Publik
          </button>
        </div>,
        document.body
      )}
    </div>
  );
};

export default WorkLinksTable;
