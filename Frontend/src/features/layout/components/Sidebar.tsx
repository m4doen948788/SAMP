import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import * as Icons from 'lucide-react';
import { api } from '@/src/services/api';
import { useAuth } from '@/src/contexts/AuthContext';
import { QafPopover } from '@/src/components/shared/QafPopover';

interface MenuItem {
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

const Sidebar = ({ onNavigate, isOpen, onClose, currentPage }: {
  onNavigate: (page: string) => void,
  isOpen: boolean,
  onClose: () => void,
  currentPage: string
}) => {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (window.innerWidth < 1024) return false;
    return localStorage.getItem('sidebar_collapsed') === 'true';
  });

  const handleToggleCollapse = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('sidebar_collapsed', String(next));
      return next;
    });
  };

  const [menuData, setMenuData] = useState<MenuItem[]>(() => {
    try {
      const cached = sessionStorage.getItem('sidebar-menu-data');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [isLoading, setIsLoading] = useState(() => {
    try {
      return !sessionStorage.getItem('sidebar-menu-data');
    } catch {
      return true;
    }
  });
  const [expandedGroupIds, setExpandedGroupIds] = useState<number[]>([]);
  const [expandedSubId, setExpandedSubId] = useState<string | null>(null);
  const [hoveredMenuId, setHoveredMenuId] = useState<number | null>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);

  const { user: currentUser } = useAuth();

  // Compute external link style based on sidebar background brightness
  const [extLinkStyle, setExtLinkStyle] = useState<React.CSSProperties>({});
  useEffect(() => {
    const computeStyle = () => {
      const primary = getComputedStyle(document.documentElement).getPropertyValue('--theme-primary').trim();
      // Parse hex color to RGB
      const hex = primary.replace('#', '');
      if (hex.length < 6) return;
      const r = parseInt(hex.substring(0, 2), 16) / 255;
      const g = parseInt(hex.substring(2, 4), 16) / 255;
      const b = parseInt(hex.substring(4, 6), 16) / 255;
      // Relative luminance (WCAG formula)
      const toLinear = (c: number) => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
      const luminance = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);

      if (luminance > 0.25) {
        // Light theme → use dynamic theme accent color for distinct contrast
        setExtLinkStyle({ color: 'var(--theme-accent, #2563eb)', textDecorationColor: 'var(--theme-accent, #2563eb)', textShadow: 'none' });
      } else if (luminance > 0.08) {
        // Medium theme → medium blue, subtle glow
        setExtLinkStyle({ color: '#93c5fd', textDecorationColor: '#93c5fd', textShadow: '0 0 6px rgba(147,197,253,0.5)' });
      } else {
        // Dark theme → bright blue, full glow
        setExtLinkStyle({ color: '#60a5fa', textDecorationColor: '#60a5fa', textShadow: '0 0 8px rgba(96,165,250,0.7), 0 0 20px rgba(96,165,250,0.4)' });
      }
    };
    computeStyle();
    // Re-compute when theme changes
    const observer = new MutationObserver(computeStyle);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Intentionally removed auto-collapse on outside click
      // to resolve issue where clicking cards/tables would collapse the sidebar unexpectedly
    };

    const handleExpand = () => {
      setIsCollapsed(false);
      localStorage.setItem('sidebar_collapsed', 'false');
    };

    // Force expanded on mobile
    if (window.innerWidth < 1024 && isOpen) {
      setIsCollapsed(false);
    }

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('sidebar:expand', handleExpand as EventListener);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('sidebar:expand', handleExpand as EventListener);
    };
  }, [isCollapsed, isOpen]);

  const fetchMenusAndAccess = useCallback(async () => {
    try {
      // Only set loading to true if we don't have cached menuData to render
      setMenuData(prev => {
        if (!prev || prev.length === 0) {
          setIsLoading(true);
        }
        return prev;
      });
      if (!currentUser) return;

      const isSuperAdmin = currentUser.tipe_user_id === 1;

      const [menuRes, accessRes] = await Promise.all([
        api.menu.getAll(),
        !isSuperAdmin ? api.rbac.getRoleAccess(currentUser.tipe_user_id) : Promise.resolve({ success: true, data: [] })
      ]);

      if (menuRes.success) {
        let allowedMenuIds: number[] = [];
        if (!isSuperAdmin && accessRes && accessRes.success) {
          allowedMenuIds = accessRes.data;
        }

        let menus = menuRes.data.filter((m: MenuItem) => m.is_active).map((m: MenuItem) => {
          if (m.nama_menu === 'INTERNAL PPM') {
            if (isSuperAdmin) {
              return { ...m, nama_menu: 'Instansi Daerah' };
            } else if (currentUser && currentUser.instansi_id) {
              let cleanName = currentUser.instansi_singkatan || (currentUser.instansi_nama || '').replace(/admin/gi, '').trim();
              if (!currentUser.instansi_singkatan && cleanName.toLowerCase().includes('badan perencanaan')) {
                cleanName = 'Bapperida';
              }
              return { ...m, nama_menu: `Internal ${cleanName}` };
            }
          }
          return m;
        });

        // Filter out menus based on Dynamic Role
        let fullAllowedIds = new Set<number>(allowedMenuIds.map(id => Number(id)));
        if (!isSuperAdmin) {
          const addParent = (menuId: number) => {
            const m = menuRes.data.find((x: MenuItem) => Number(x.id) === Number(menuId));
            if (m && m.parent_id) {
              const pid = Number(m.parent_id);
              if (!fullAllowedIds.has(pid)) {
                fullAllowedIds.add(pid);
                addParent(pid);
              }
            }
          };
          allowedMenuIds.forEach(id => addParent(Number(id)));
        }

        menus = menus.filter((m: MenuItem) => {
          if (isSuperAdmin) return true; // Super admin sees everything
          // Only return true if this menu_id is inside the DB array or is a parent of one
          return fullAllowedIds.has(Number(m.id));
        });

        // Ensure "Update & Merge Data" submenu exists under "Olah Data" parent
        const olahDataParent = menus.find((m: MenuItem) => m.nama_menu === 'Olah Data' || m.action_page === 'olah-data');
        if (olahDataParent) {
          const hasUpdateSubmenu = menus.some((m: MenuItem) => m.action_page === 'olah-data-update');
          if (!hasUpdateSubmenu) {
            const komparasiSub = menus.find((m: MenuItem) => m.action_page === 'olah-data-komparasi');
            const updateSubmenu: MenuItem = {
              id: 127,
              nama_menu: 'Update & Merge Data',
              tipe: 'menu2',
              aplikasi_external_id: null,
              action_page: 'olah-data-update',
              icon: null,
              parent_id: olahDataParent.id,
              urutan: komparasiSub ? komparasiSub.urutan + 1 : 4,
              is_active: 1
            };
            menus.push(updateSubmenu);
          }
        }

        setMenuData(menus);
        try {
          sessionStorage.setItem('sidebar-menu-data', JSON.stringify(menus));
        } catch {}
      }
    } catch (err) {
      console.error('Error loading menus or access list:', err);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      fetchMenusAndAccess();
    } else {
      setMenuData([]);
      setIsLoading(true);
      try {
        sessionStorage.removeItem('sidebar-menu-data');
      } catch {}
    }
  }, [currentUser, fetchMenusAndAccess]);

  const MenuQafButton = ({ item }: { item: MenuItem }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [pos, setPos] = useState({ top: 0, left: 0, isFlippedVertical: false, flipSubmenuLeft: false });
    const buttonRef = useRef<HTMLButtonElement>(null);
    const isQuickAccess = (item as any).is_quick_access === 1 || (item as any).is_quick_access === true;

    // Check if it is an external link
    const isExternalApp = item.aplikasi_external_id !== null && item.aplikasi_external_id !== undefined;
    
    // External App Quick Access values
    const extQaAll = Number((item as any).is_qa_all || 0) === 1;
    const extQaBidang = Number((item as any).is_qa_bidang || 0) === 1;
    const extQaPersonal = Number((item as any).ae_user_is_qa_personal || 0) === 1;

    const roleName = String(currentUser?.tipe_user_nama || '').toLowerCase().trim();
    const roleId = Number(currentUser?.tipe_user_id || 0);
    const username = String(currentUser?.username || '').toLowerCase().trim();

    const isSuperadmin = roleId === 1 || roleName === 'superadmin' || roleName === 'super admin' || username === 'superadmin';
    const isSuperadminOrAdmin = isSuperadmin || roleId === 2 || roleName === 'admin instansi';

    const isKepalaOrSekretaris = (() => {
      if (!currentUser) return false;
      const jab = String(currentUser.jabatan_nama || (currentUser as any).jabatan || '').toLowerCase();
      const isRealKepala = (jab.includes('kepala') && !jab.includes('bidang') && !jab.includes('sub bag') && !jab.includes('seksi') && !jab.includes('sub bidang')) || roleName.includes('kepala badan') || roleName.includes('kepala dinas');
      const isRealSekretaris = jab.includes('sekretaris') || roleName.includes('sekretaris');
      return isRealKepala || isRealSekretaris;
    })();

    const isBidangAuthority = (() => {
      if (!currentUser) return false;
      const jab = String(currentUser.jabatan_nama || (currentUser as any).jabatan || '').toLowerCase();
      const isKabid = jab.includes('kabid') || jab.includes('kepala bidang');
      const isKatim = jab.includes('katim') || jab.includes('ketua tim');
      const isAdminBidang = roleName === 'admin bidang' || roleName.includes('admin bidang') || roleName.includes('verifikator') || jab.includes('admin bidang') || jab.includes('verifikator');
      return isKabid || isKatim || isAdminBidang || isSuperadminOrAdmin || isKepalaOrSekretaris;
    })();

    const handleButtonClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      
      if (isOpen) {
        setIsOpen(false);
        return;
      }

      const rect = e.currentTarget.getBoundingClientRect();
      const popoverWidth = 176; // w-44 is 176px
      const popoverHeight = 110; // approx height of unified 3-option popover
      
      const viewportHeight = window.innerHeight;
      const spaceBelow = viewportHeight - rect.bottom;
      
      let top = rect.bottom + window.scrollY + 4;
      let isFlippedVertical = false;
      // If remaining space below is too small, open upwards
      if (spaceBelow < popoverHeight && rect.top > popoverHeight) {
        top = rect.top + window.scrollY - popoverHeight - 4;
        isFlippedVertical = true;
      }
      
      let left = rect.left + window.scrollX;
      let flipSubmenuLeft = false;
      if (left + popoverWidth > window.innerWidth - 10) {
        left = rect.right + window.scrollX - popoverWidth;
        flipSubmenuLeft = true;
      }
      left = Math.max(10, left);

      setPos({ top, left, isFlippedVertical, flipSubmenuLeft });
      setIsOpen(true);
    };

    const handleTogglePersonal = async () => {
      try {
        if (isExternalApp) {
          const res = await api.aplikasiExternal.togglePersonal(item.aplikasi_external_id!);
          if (res.success) {
            fetchMenusAndAccess();
            window.dispatchEvent(new CustomEvent('quick-access:changed'));
          }
        } else {
          const res = await api.menu.toggleQa(item.id);
          if (res.success) {
            fetchMenusAndAccess();
            window.dispatchEvent(new CustomEvent('quick-access:changed'));
          }
        }
      } catch (err) {
        console.error('Failed to toggle personal QA', err);
      }
      setIsOpen(false);
    };

    const handleToggleBidang = async () => {
      try {
        const nextVal = extQaBidang ? 0 : 1;
        if (isExternalApp) {
          const payload = {
            nama_aplikasi: item.nama_aplikasi!,
            url: item.aplikasi_url!,
            is_qa_all: extQaAll ? 1 : 0,
            is_qa_bidang: nextVal,
            is_quick_access: (extQaAll || nextVal) ? 1 : 0
          };
          const res = await api.aplikasiExternal.update(item.aplikasi_external_id!, payload);
          if (res.success) {
            fetchMenusAndAccess();
            window.dispatchEvent(new CustomEvent('quick-access:changed'));
          }
        } else {
          const payload = {
            nama_menu: item.nama_menu,
            tipe: item.tipe,
            aplikasi_external_id: item.aplikasi_external_id,
            action_page: item.action_page,
            icon: item.icon,
            parent_id: item.parent_id,
            urutan: item.urutan,
            is_active: item.is_active,
            is_qa_all: extQaAll ? 1 : 0,
            is_qa_bidang: nextVal
          };
          const res = await api.menu.update(item.id, payload);
          if (res.success) {
            fetchMenusAndAccess();
            window.dispatchEvent(new CustomEvent('quick-access:changed'));
          }
        }
      } catch (err) {
        console.error('Failed to toggle bidang QA', err);
      }
      setIsOpen(false);
    };

    const handleToggleGlobal = async () => {
      try {
        const nextVal = extQaAll ? 0 : 1;
        if (isExternalApp) {
          const payload = {
            nama_aplikasi: item.nama_aplikasi!,
            url: item.aplikasi_url!,
            is_qa_all: nextVal,
            is_qa_bidang: extQaBidang ? 1 : 0,
            is_quick_access: (nextVal || extQaBidang) ? 1 : 0
          };
          const res = await api.aplikasiExternal.update(item.aplikasi_external_id!, payload);
          if (res.success) {
            fetchMenusAndAccess();
            window.dispatchEvent(new CustomEvent('quick-access:changed'));
          }
        } else {
          const payload = {
            nama_menu: item.nama_menu,
            tipe: item.tipe,
            aplikasi_external_id: item.aplikasi_external_id,
            action_page: item.action_page,
            icon: item.icon,
            parent_id: item.parent_id,
            urutan: item.urutan,
            is_active: item.is_active,
            is_qa_all: nextVal,
            is_qa_bidang: extQaBidang ? 1 : 0
          };
          const res = await api.menu.update(item.id, payload);
          if (res.success) {
            fetchMenusAndAccess();
            window.dispatchEvent(new CustomEvent('quick-access:changed'));
          }
        }
      } catch (err) {
        console.error('Failed to toggle global QA', err);
      }
      setIsOpen(false);
    };

    return (
      <>
        <button
          ref={buttonRef}
          type="button"
          onClick={handleButtonClick}
          className="flex items-center justify-center w-5 h-5 rounded hover:bg-black/5 dark:hover:bg-white/10 transition-all active:scale-95 cursor-pointer shrink-0"
          style={{ color: 'var(--theme-text-on-primary, #ffffff)' }}
        >
          <Icons.MoreVertical size={13} className="opacity-50 hover:opacity-100 transition-opacity" />
        </button>

        {isOpen && (
          <QafPopover
            top={pos.top}
            left={pos.left}
            isFlippedVertical={pos.isFlippedVertical}
            flipSubmenuLeft={pos.flipSubmenuLeft}
            onClose={() => setIsOpen(false)}
            personalActive={isExternalApp ? extQaPersonal : isQuickAccess}
            onTogglePersonal={handleTogglePersonal}
            globalActive={extQaAll}
            globalTitle={isSuperadminOrAdmin || isKepalaOrSekretaris ? 'Aktifkan untuk Semua Pegawai' : 'Hanya Superadmin, Admin, Kepala, atau Sekretaris yang dapat mengaktifkan'}
            canEditGlobal={isSuperadminOrAdmin || isKepalaOrSekretaris}
            onToggleGlobal={isSuperadminOrAdmin || isKepalaOrSekretaris ? handleToggleGlobal : undefined}
            bidangActive={extQaBidang}
            bidangTitle={isBidangAuthority ? 'Aktifkan untuk Bidang Saya' : 'Hanya Kabid, Katim, Admin Bidang, Admin, Kepala, atau Sekretaris yang dapat mengaktifkan'}
            canEditBidang={isBidangAuthority}
            onToggleBidang={isBidangAuthority ? handleToggleBidang : undefined}
            copyTitle={isExternalApp ? undefined : "Salin Link Publik tidak tersedia untuk navigasi menu"}
            skpTitle={isExternalApp ? undefined : "Jadikan SKP tidak tersedia untuk navigasi menu"}
          />
        )}
      </>
    );
  };

  const syncExpansionWithCurrentPage = useCallback(() => {
    if (!currentPage || menuData.length === 0) {
      setExpandedGroupIds([]);
      setExpandedSubId(null);
      return;
    }

    const activeItem = menuData.find(m => m.action_page === currentPage);
    if (activeItem) {
      if (activeItem.tipe === 'menu1') {
        const hasChildren = menuData.some(m => m.parent_id === activeItem.id);
        setExpandedGroupIds(hasChildren ? [activeItem.id] : []);
        setExpandedSubId(null);
      } 
      else if (activeItem.tipe === 'menu2') {
        if (activeItem.parent_id) {
          setExpandedGroupIds([activeItem.parent_id]);
          const hasChildren = menuData.some(m => m.parent_id === activeItem.id);
          setExpandedSubId(hasChildren ? `db-${activeItem.id}` : null);
        }
      } 
      else if (activeItem.tipe === 'menu3') {
        const parent = menuData.find(m => m.id === activeItem.parent_id);
        if (parent && parent.parent_id) {
          setExpandedGroupIds([parent.parent_id]);
          setExpandedSubId(`db-${parent.id}`);
        }
      }
    } else {
      setExpandedGroupIds([]);
      setExpandedSubId(null);
    }
  }, [currentPage, menuData]);

  useEffect(() => {
    syncExpansionWithCurrentPage();
  }, [syncExpansionWithCurrentPage]);

  // Build tree helpers
  const topLevelMenus = menuData.filter(m => m.parent_id === null && m.tipe === 'menu1');

  const getChildren = (parentId: number): MenuItem[] => {
    return menuData.filter(m => m.parent_id === parentId).sort((a, b) => a.urutan - b.urutan);
  };

  const toggleExpand = (id: number) => {
    if (isCollapsed) return;
    setExpandedGroupIds(prev =>
      prev.includes(id) ? [] : [id]
    );
  };

  const toggleSubExpand = (subId: string) => {
    setExpandedSubId(prev => prev === subId ? null : subId);
  };

  // Render a child menu item (menu2 or menu3)
  const renderDbLink = (item: MenuItem, depth: number = 0) => {
    const children = getChildren(item.id);
    const hasChildren = children.length > 0;
    const subId = `db-${item.id}`;
    const isSubExpanded = expandedSubId === subId;

    if (hasChildren) {
      // Sub-group with children (e.g., DATA DIRI)
      return (
        <div key={item.id} className="py-0.5">
          <div
            className="flex items-center justify-between cursor-pointer py-1.5 px-2.5 rounded-lg font-medium text-[11.5px] transition-colors gap-2 my-0.5"
            style={{ color: 'var(--theme-text-on-primary, #ffffff)' }}
            onClick={() => toggleSubExpand(subId)}
          >
            <span className="flex-1 min-w-0 whitespace-normal break-words leading-tight opacity-80 hover:opacity-100 transition-opacity">
              {item.nama_menu}
            </span>
            <div className="flex items-center shrink-0 gap-1.5">
              {item.nama_aplikasi && item.aplikasi_url && (
                <a
                  href={item.aplikasi_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold tracking-tight transition-all border shrink-0"
                  style={{
                    backgroundColor: 'color-mix(in srgb, var(--theme-text-on-primary, #ffffff) 10%, transparent)',
                    borderColor: 'color-mix(in srgb, var(--theme-text-on-primary, #ffffff) 18%, transparent)',
                    color: extLinkStyle.color || 'var(--theme-text-on-primary, #ffffff)'
                  }}
                  onClick={(e) => e.stopPropagation()}
                  title={`Buka ${item.nama_aplikasi}`}
                >
                  <span className="truncate max-w-[75px]">{item.nama_aplikasi}</span>
                  <Icons.ExternalLink size={10} className="shrink-0 opacity-80" />
                </a>
              )}
              <span className="shrink-0 opacity-60">
                <Icons.ChevronRight size={13} className={`transition-transform duration-200 ${isSubExpanded ? 'rotate-90' : ''}`} />
              </span>
            </div>
          </div>
          <div className={`submenu-grid-container ${isSubExpanded ? 'expanded' : ''}`}>
            <div className="submenu-grid-content">
              <div
                className="ml-3.5 pl-2.5 my-1 space-y-1"
                style={{ borderLeft: '1.5px solid color-mix(in srgb, var(--theme-text-on-primary, #ffffff) 18%, transparent)' }}
              >
                {children.map(child => renderDbLink(child, depth + 1))}
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Action (internal page navigation)
    if (item.action_page) {
      const isActive = currentPage === item.action_page;
      return (
        <div
          key={item.id}
          className={`relative flex items-center justify-between w-full py-1.5 px-2.5 rounded-lg transition-all duration-150 group/sub cursor-pointer my-0.5 ${
            isActive ? 'font-semibold shadow-sm' : 'font-normal'
          }`}
          style={{
            backgroundColor: isActive ? 'color-mix(in srgb, var(--theme-text-on-primary, #ffffff) 16%, transparent)' : undefined,
            color: 'var(--theme-text-on-primary, #ffffff)'
          }}
          onMouseEnter={() => setHoveredMenuId(item.id)}
          onMouseLeave={() => setHoveredMenuId(null)}
          onClick={() => { onNavigate(item.action_page!); onClose(); }}
        >
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <span className={`text-[11.5px] leading-snug break-words ${isActive ? 'opacity-100 font-bold' : 'opacity-80 group-hover/sub:opacity-100'}`}>
              {item.nama_menu}
            </span>
            {!isCollapsed && (
              <div
                className="transition-opacity duration-150 opacity-0 group-hover/sub:opacity-100 shrink-0"
                onClick={(e) => e.stopPropagation()}
              >
                <MenuQafButton item={item} />
              </div>
            )}
          </div>

          {item.nama_aplikasi && item.aplikasi_url && (
            <a
              href={item.aplikasi_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold tracking-tight transition-all border shrink-0 ml-1.5"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--theme-text-on-primary, #ffffff) 10%, transparent)',
                borderColor: 'color-mix(in srgb, var(--theme-text-on-primary, #ffffff) 18%, transparent)',
                color: extLinkStyle.color || 'var(--theme-text-on-primary, #ffffff)'
              }}
              onClick={(e) => e.stopPropagation()}
              title={`Buka ${item.nama_aplikasi}`}
            >
              <span className="truncate max-w-[75px]">{item.nama_aplikasi}</span>
              <Icons.ExternalLink size={10} className="shrink-0 opacity-80" />
            </a>
          )}
        </div>
      );
    }

    // External link — entire row is clickable
    if (item.nama_aplikasi && item.aplikasi_url) {
      return (
        <div
          key={item.id}
          className="relative flex items-center justify-between w-full py-1.5 px-2.5 rounded-lg transition-all duration-150 group/sub cursor-pointer my-0.5"
          style={{ color: 'var(--theme-text-on-primary, #ffffff)' }}
          onMouseEnter={() => setHoveredMenuId(item.id)}
          onMouseLeave={() => setHoveredMenuId(null)}
          onClick={() => {
            window.open(item.aplikasi_url, '_blank', 'noopener,noreferrer');
            onClose();
          }}
        >
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <span className="text-[11.5px] font-normal leading-snug break-words opacity-80 group-hover/sub:opacity-100">
              {item.nama_menu}
            </span>
            {!isCollapsed && (
              <div
                className="transition-opacity duration-150 opacity-0 group-hover/sub:opacity-100 shrink-0"
                onClick={(e) => e.stopPropagation()}
              >
                <MenuQafButton item={item} />
              </div>
            )}
          </div>

          <a
            href={item.aplikasi_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold border shrink-0 transition-colors ml-1.5"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--theme-text-on-primary, #ffffff) 10%, transparent)',
              borderColor: 'color-mix(in srgb, var(--theme-text-on-primary, #ffffff) 18%, transparent)',
              color: extLinkStyle.color || 'var(--theme-text-on-primary, #ffffff)'
            }}
            title={`Buka ${item.nama_aplikasi}`}
            onClick={(e) => e.stopPropagation()}
          >
            <span className="truncate max-w-[80px]">{item.nama_aplikasi}</span>
            <Icons.ExternalLink size={10} className="shrink-0 opacity-80" />
          </a>
        </div>
      );
    }

    // Fallback: label only (no link, no action)
    return (
      <div
        key={item.id}
        className="relative flex items-center justify-between w-full py-1.5 px-2.5 rounded-lg font-medium cursor-default text-[11.5px] transition-all duration-150 my-0.5"
        style={{ color: 'var(--theme-text-on-primary, #ffffff)' }}
      >
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <span className="leading-snug break-words opacity-75">
            {item.nama_menu}
          </span>
        </div>
      </div>
    );
  };

  const regularMenus = topLevelMenus.filter(m => m.action_page !== 'petunjuk-teknis');
  const bottomMenus = topLevelMenus.filter(m => m.action_page === 'petunjuk-teknis');

  const renderMenuGroup = (group: MenuItem) => {
    const isExpanded = expandedGroupIds.includes(group.id);
    const children = getChildren(group.id);
    const hasLinks = children.length > 0;
    const showGroupQaf = !hasLinks && !!group.action_page;

    const IconCmp = group.icon ? (Icons as any)[group.icon] : null;
    const groupIcon = IconCmp ? <IconCmp size={18} /> : <Icons.Layers size={18} />;

    const isSelfActive = group.action_page === currentPage;
    const isActiveGroup = children.some(c => {
      if (c.action_page === currentPage) return true;
      const grandChildren = getChildren(c.id);
      return grandChildren.some(gc => gc.action_page === currentPage);
    });
    const isActive = isSelfActive || isActiveGroup;

    return (
      <div key={group.id} className="group px-1 py-0.5">
        <div
          className={`sidebar-header flex items-center transition-all duration-200 active:scale-[0.99]
            ${isCollapsed ? 'justify-center p-2 mx-auto' : 'px-3 py-2.5 mx-0'}
            ${hasLinks || group.action_page ? 'cursor-pointer' : 'pointer-events-none'}
            ${isActive ? 'active' : ''}
          `}
          onMouseEnter={() => setHoveredMenuId(group.id)}
          onMouseLeave={() => setHoveredMenuId(null)}
          onClick={() => {
            if (isCollapsed) {
              setIsCollapsed(false);
              localStorage.setItem('sidebar_collapsed', 'false');
              if (hasLinks) {
                setExpandedGroupIds([group.id]);
              }
            } else if (hasLinks) {
              toggleExpand(group.id);
            }
            else if (group.action_page) {
              if (group.action_page === 'petunjuk-teknis') {
                window.open(`?page=${group.action_page}`, '_blank');
              } else {
                onNavigate(group.action_page);
              }
              onClose();
            }
          }}
          title={isCollapsed ? group.nama_menu : ''}
        >
          <div className={`flex items-center w-full min-w-0 ${isCollapsed ? 'justify-center' : ''}`}>
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                isActive ? 'shadow-sm' : ''
              }`}
              style={{
                backgroundColor: isActive
                  ? 'color-mix(in srgb, var(--theme-text-on-primary, #ffffff) 20%, transparent)'
                  : 'color-mix(in srgb, var(--theme-text-on-primary, #ffffff) 8%, transparent)',
                color: 'var(--theme-text-on-primary, #ffffff)'
              }}
            >
              {groupIcon}
            </div>

            {!isCollapsed && (
              <div className="flex items-center justify-between flex-1 min-w-0 ml-3 gap-2">
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  <span className="select-none text-[12.5px] font-semibold tracking-normal whitespace-normal break-words opacity-90 group-hover:opacity-100 transition-opacity capitalize leading-snug line-clamp-2">
                    {group.nama_menu}
                  </span>
                  {showGroupQaf && (
                    <div
                      className="transition-opacity duration-150 opacity-0 group-hover:opacity-100 shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MenuQafButton item={group} />
                    </div>
                  )}
                </div>

                <div className="flex items-center shrink-0 gap-1.5">
                  {group.nama_aplikasi && group.aplikasi_url && (
                    <a
                      href={group.aplikasi_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold tracking-tight transition-all border shrink-0"
                      style={{
                        backgroundColor: 'color-mix(in srgb, var(--theme-text-on-primary, #ffffff) 10%, transparent)',
                        borderColor: 'color-mix(in srgb, var(--theme-text-on-primary, #ffffff) 18%, transparent)',
                        color: extLinkStyle.color || 'var(--theme-text-on-primary, #ffffff)'
                      }}
                      onClick={(e) => e.stopPropagation()}
                      title={`Buka ${group.nama_aplikasi}`}
                    >
                      <span className="truncate max-w-[80px]">{group.nama_aplikasi}</span>
                      <Icons.ExternalLink size={10} className="shrink-0 opacity-80" />
                    </a>
                  )}

                  {hasLinks && (
                    <div className="flex items-center opacity-50 group-hover:opacity-90 transition-opacity shrink-0">
                      <Icons.ChevronRight
                        size={14}
                        className={`transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Submenu with Tree Guide Line */}
        <div className={`submenu-grid-container ${(!isCollapsed && hasLinks && isExpanded) ? 'expanded' : ''}`}>
          <div className="submenu-grid-content">
            <div
              className="ml-5 pl-3 my-1 space-y-1"
              style={{ borderLeft: '1.5px solid color-mix(in srgb, var(--theme-text-on-primary, #ffffff) 18%, transparent)' }}
            >
              {children.map(child => renderDbLink(child))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const SidebarItemSkeleton = () => (
    <div className="flex items-center px-4 py-2.5">
      <div className="w-7 h-7 flex items-center justify-center shrink-0">
        <div
          className="w-5 h-5 rounded-md animate-pulse"
          style={{ backgroundColor: 'color-mix(in srgb, var(--theme-text-on-primary, #ffffff) 12%, transparent)' }}
        />
      </div>
      <div
        className={`transition-all duration-300 h-3 rounded-md animate-pulse ${isCollapsed ? 'w-0 opacity-0' : 'ml-3 w-32 opacity-100'}`}
        style={{ backgroundColor: 'color-mix(in srgb, var(--theme-text-on-primary, #ffffff) 12%, transparent)' }}
      />
    </div>
  );

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-ppm-slate/50 z-[990] lg:hidden backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container: uses Theme Color 1 (Primary) */}
      <div
        ref={sidebarRef}
        className={`
        fixed inset-y-0 left-0 z-[995] lg:z-auto h-screen flex flex-col shrink-0 transform transition-all duration-300 ease-in-out
        lg:relative lg:translate-x-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        ${isCollapsed ? 'lg:w-[64px] is-collapsed' : 'lg:w-[250px] w-[250px]'}
        sidebar-main-container
      `}
        style={{
          backgroundColor: 'var(--theme-primary, #0f172a)',
          color: 'var(--theme-text-on-primary, #ffffff)',
          borderRight: '1px solid color-mix(in srgb, var(--theme-text-on-primary, #ffffff) 12%, transparent)'
        }}
      >
        {/* Header / Brand: uses Theme Color 2 (Secondary) */}
        <div
          className={`py-4 px-3.5 border-b flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} overflow-hidden transition-all duration-300`}
          style={{
            backgroundColor: 'var(--theme-secondary, #1e293b)',
            borderColor: 'color-mix(in srgb, var(--theme-text-on-secondary, #ffffff) 15%, transparent)',
            color: 'var(--theme-text-on-secondary, #ffffff)'
          }}
        >
          {!isCollapsed ? (
            <>
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div
                  className="w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 shadow-sm transition-transform hover:scale-105"
                  style={{
                    backgroundColor: 'color-mix(in srgb, var(--theme-text-on-secondary, #ffffff) 12%, transparent)',
                    borderColor: 'color-mix(in srgb, var(--theme-text-on-secondary, #ffffff) 20%, transparent)',
                    color: 'var(--theme-text-on-secondary, #ffffff)'
                  }}
                >
                  <Icons.LayoutDashboard size={19} />
                </div>
                <div className="transition-all duration-300 ease-in-out overflow-hidden flex flex-col min-w-0 flex-1">
                  <span
                    className="text-[13.5px] font-extrabold leading-tight tracking-tight whitespace-nowrap overflow-hidden text-ellipsis"
                    style={{ color: 'var(--theme-text-on-secondary, #ffffff)' }}
                  >
                    {currentUser?.instansi_singkatan || (currentUser?.tipe_user_id === 1 ? 'SYSTEM' : 'BAPPERIDA')}
                  </span>
                  <span
                    className="text-[10.5px] font-semibold tracking-wider whitespace-nowrap overflow-hidden text-ellipsis uppercase opacity-75"
                    style={{ color: 'var(--theme-text-on-secondary, #ffffff)' }}
                  >
                    {currentUser?.tipe_user_id === 1 ? 'Dashboard' : 'Kabupaten Bogor'}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-center ml-2 shrink-0">
                <button
                  onClick={onClose}
                  className="lg:hidden flex items-center justify-center w-8 h-8 rounded-lg border transition-all active:scale-95"
                  style={{
                    backgroundColor: 'color-mix(in srgb, var(--theme-text-on-secondary, #ffffff) 10%, transparent)',
                    borderColor: 'color-mix(in srgb, var(--theme-text-on-secondary, #ffffff) 18%, transparent)',
                    color: 'var(--theme-text-on-secondary, #ffffff)'
                  }}
                >
                  <Icons.ChevronLeft size={18} />
                </button>

                <button
                  type="button"
                  onClick={handleToggleCollapse}
                  className="hidden lg:flex items-center justify-center w-8 h-8 rounded-lg border transition-all active:scale-95 cursor-pointer opacity-85 hover:opacity-100"
                  style={{
                    backgroundColor: 'color-mix(in srgb, var(--theme-text-on-secondary, #ffffff) 8%, transparent)',
                    borderColor: 'color-mix(in srgb, var(--theme-text-on-secondary, #ffffff) 16%, transparent)',
                    color: 'var(--theme-text-on-secondary, #ffffff)'
                  }}
                  title="Ciutkan Sidebar"
                >
                  <Icons.ChevronLeft size={16} />
                </button>
              </div>
            </>
          ) : (
            <button
              type="button"
              onClick={handleToggleCollapse}
              className="flex items-center justify-center w-10 h-10 rounded-xl border transition-all active:scale-95 cursor-pointer shadow-sm"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--theme-text-on-secondary, #ffffff) 12%, transparent)',
                borderColor: 'color-mix(in srgb, var(--theme-text-on-secondary, #ffffff) 20%, transparent)',
                color: 'var(--theme-text-on-secondary, #ffffff)'
              }}
              title="Bentangkan Sidebar"
            >
              <Icons.LayoutDashboard size={20} />
            </button>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto py-2 px-1 overflow-x-hidden sidebar-scroll">
          {isLoading ? (
            <div className="space-y-1">
              {[...Array(6)].map((_, i) => <SidebarItemSkeleton key={i} />)}
            </div>
          ) : (
            <div className="animate-in fade-in duration-300 space-y-0.5">
              {/* Main menu items */}
              {regularMenus.map(renderMenuGroup)}
            </div>
          )}
        </nav>

        {/* Bottom pinned menus */}
        {bottomMenus.length > 0 && (
          <div
            className="pb-4 pt-2 px-1 mt-auto border-t"
            style={{ borderColor: 'color-mix(in srgb, var(--theme-text-on-primary, #ffffff) 15%, transparent)' }}
          >
            {bottomMenus.map(renderMenuGroup)}
          </div>
        )}
      </div>
    </>
  );
};

export default Sidebar;
