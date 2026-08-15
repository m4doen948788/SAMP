import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import * as Icons from 'lucide-react';
import { api } from '@/src/services/api';
import { useAuth } from '@/src/contexts/AuthContext';

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

  const [menuData, setMenuData] = useState<MenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
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
      setIsLoading(true);
      const menuRes = await api.menu.getAll();

      if (menuRes.success && currentUser) {
        const isSuperAdmin = currentUser.tipe_user_id === 1;
        let allowedMenuIds: number[] = [];

        // If not super admin, we need to fetch which menus they are allowed to see
        if (!isSuperAdmin) {
          const accessRes = await api.rbac.getRoleAccess(currentUser.tipe_user_id);
          if (accessRes.success) {
            allowedMenuIds = accessRes.data;
          }
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

        setMenuData(menus);
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
    }
  }, [currentUser, fetchMenusAndAccess]);

  const MenuQafButton = ({ item }: { item: MenuItem }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [pos, setPos] = useState({ top: 0, left: 0 });
    const buttonRef = useRef<HTMLButtonElement>(null);
    const popoverRef = useRef<HTMLDivElement>(null);
    const isQuickAccess = (item as any).is_quick_access === 1 || (item as any).is_quick_access === true;
    const [qafTextColor, setQafTextColor] = useState('#ffffff');

    useEffect(() => {
      if (!isOpen) return;

      const computeQafContrast = () => {
        try {
          const secondaryColor = getComputedStyle(document.documentElement).getPropertyValue('--theme-secondary').trim();
          if (!secondaryColor) {
            setQafTextColor('#ffffff');
            return;
          }

          // Parse hex color
          let hex = secondaryColor.replace('#', '');
          if (hex.length === 3) {
            hex = hex.split('').map(c => c + c).join('');
          }

          if (hex.length === 6) {
            const r = parseInt(hex.substring(0, 2), 16);
            const g = parseInt(hex.substring(2, 4), 16);
            const b = parseInt(hex.substring(4, 6), 16);
            const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
            // yiq >= 128 is light background, so text is dark (#0f172a), else white
            setQafTextColor(yiq >= 128 ? '#0f172a' : '#ffffff');
          } else {
            // Fallback for non-hex values
            setQafTextColor('#ffffff');
          }
        } catch (err) {
          console.error('Failed to compute QAF contrast', err);
          setQafTextColor('#ffffff');
        }
      };

      computeQafContrast();

      // Observe theme mutations
      const observer = new MutationObserver(computeQafContrast);
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'style'] });
      return () => observer.disconnect();
    }, [isOpen]);

    useEffect(() => {
      const handleOutsideClick = (e: MouseEvent) => {
        if (
          popoverRef.current && !popoverRef.current.contains(e.target as Node) &&
          buttonRef.current && !buttonRef.current.contains(e.target as Node)
        ) {
          setIsOpen(false);
        }
      };
      if (isOpen) {
        document.addEventListener('mousedown', handleOutsideClick);
      }
      return () => document.removeEventListener('mousedown', handleOutsideClick);
    }, [isOpen]);

    const handleButtonClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      
      if (isOpen) {
        setIsOpen(false);
        return;
      }

      const rect = e.currentTarget.getBoundingClientRect();
      const popoverWidth = 208; // w-52 is 208px
      const popoverHeight = 175; // approx height of options popover
      
      const viewportHeight = window.innerHeight;
      const spaceBelow = viewportHeight - rect.bottom;
      
      let top = rect.bottom + window.scrollY + 4;
      // If remaining space below is too small, and there is more space above, open upwards
      if (spaceBelow < popoverHeight && rect.top > popoverHeight) {
        top = rect.top + window.scrollY - popoverHeight - 4;
      }
      
      // Horizontal positioning: align left edges by default (opens to the right)
      let left = rect.left + window.scrollX;
      
      // If it overflows the screen width, align right edges:
      if (left + popoverWidth > window.innerWidth - 10) {
        left = rect.right + window.scrollX - popoverWidth;
      }
      
      // Ensure it never goes off the left edge of the screen:
      left = Math.max(10, left);

      setPos({ top, left });
      setIsOpen(true);
    };

    const handleToggle = async (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      try {
        const res = await api.menu.toggleQa(item.id);
        if (res.success) {
          fetchMenusAndAccess();
          window.dispatchEvent(new CustomEvent('quick-access:changed'));
        }
      } catch (err) {
        console.error('Failed to toggle menu QA', err);
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

        {isOpen && createPortal(
          <div
            ref={popoverRef}
            style={{
              position: 'absolute',
              top: `${pos.top}px`,
              left: `${pos.left}px`,
              width: '208px',
              zIndex: 99999,
              backgroundColor: 'var(--theme-secondary, #334155)',
              color: qafTextColor,
            }}
            className="border border-black/10 dark:border-white/15 rounded-lg shadow-xl py-1.5 text-left animate-in fade-in zoom-in-95 duration-100"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 1. Quick Access Semua Bidang (Disabled / Grayed Out) */}
            <div className="w-full px-3 py-2 text-xs font-bold flex items-center gap-2 cursor-not-allowed select-none text-left opacity-45">
              <Icons.Globe size={14} />
              <span>Semua Bidang</span>
              <span className="ml-auto text-[9px] px-1 bg-black/10 dark:bg-white/10 rounded font-normal uppercase tracking-wider scale-90">Off</span>
            </div>

            {/* 2. Quick Access Bidang (Disabled / Grayed Out) */}
            <div className="w-full px-3 py-2 text-xs font-bold flex items-center gap-2 cursor-not-allowed select-none text-left opacity-45">
              <Icons.Building2 size={14} />
              <span>Bidang Saya</span>
              <span className="ml-auto text-[9px] px-1 bg-black/10 dark:bg-white/10 rounded font-normal uppercase tracking-wider scale-90">Off</span>
            </div>

            {/* 3. Quick Access Personal (Clickable / Active!) */}
            <button
              type="button"
              onClick={handleToggle}
              className="w-full px-3 py-2 text-xs font-bold hover:bg-black/5 dark:hover:bg-white/10 flex items-center gap-2 transition-colors cursor-pointer text-left"
            >
              <Icons.Star size={14} className={isQuickAccess ? 'text-amber-500 fill-amber-500' : 'opacity-70'} />
              <span className="flex-1">Personal</span>
              {isQuickAccess && (
                <span className="ml-auto text-[9px] px-1 bg-amber-500/20 text-amber-500 dark:text-amber-400 rounded font-normal uppercase tracking-wider scale-90">Active</span>
              )}
            </button>

            {/* 4. Salin Link Publik (Disabled / Grayed Out) */}
            <div className="w-full px-3 py-2 text-xs font-bold flex items-center gap-2 cursor-not-allowed border-t border-black/5 dark:border-white/5 select-none text-left opacity-45">
              <Icons.Copy size={14} />
              <span>Salin Link Publik</span>
            </div>

            {/* 5. Jadikan SKP / Catatan (Disabled / Grayed Out) */}
            <div className="w-full px-3 py-2 text-xs font-bold flex items-center gap-2 cursor-not-allowed select-none text-left opacity-45">
              <Icons.FileText size={14} />
              <span>Jadikan SKP / Catatan</span>
            </div>
          </div>,
          document.body
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

  // Render menu label: "NAMA_MENU" or "NAMA_MENU -> BLUE_APP_NAME"
  const renderMenuLabel = (item: MenuItem) => {
    if (item.nama_aplikasi && item.aplikasi_url) {
      return (
        <>
          {item.nama_menu}
          {' -> '}
          <a
            href={item.aplikasi_url}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-4 transition-colors text-[0.785rem] font-black opacity-90 hover:opacity-100"
            style={extLinkStyle}
            onClick={(e) => e.stopPropagation()}
          >
            {item.aplikasi_url ? item.nama_aplikasi : ""}
          </a>
        </>
      );
    }
    return item.nama_menu;
  };

  // Render a child menu item (menu2 or menu3)
  const renderDbLink = (item: MenuItem, depth: number = 0) => {
    const children = getChildren(item.id);
    const hasChildren = children.length > 0;
    const subId = `db-${item.id}`;
    const isSubExpanded = expandedSubId === subId;
    const paddingClass = depth === 0 ? 'pl-10' : 'pl-12';

    if (hasChildren) {
      // Sub-group with children (e.g., DATA DIRI)
      return (
        <div key={item.id}>
          <div
            className={`sidebar-link ${paddingClass} flex items-start justify-between cursor-pointer font-bold`}
            onClick={() => toggleSubExpand(subId)}
          >
            <span className="text-[0.75rem] whitespace-normal break-words pr-2 leading-tight">{renderMenuLabel(item)}</span>
            <span className="mt-1 shrink-0">
              {isSubExpanded ? <Icons.ChevronDown size={12} /> : <Icons.ChevronRight size={12} />}
            </span>
          </div>
          <div className={`submenu-grid-container ${isSubExpanded ? 'expanded' : ''}`}>
            <div className="submenu-grid-content bg-white/5">
              {children.map(child => renderDbLink(child, depth + 1))}
            </div>
          </div>
        </div>
      );
    }

    // Action (internal page navigation)
    if (item.action_page) {
      return (
        <div
          key={item.id}
          className={`relative flex items-center w-full ${paddingClass} py-0.5`}
          onMouseEnter={() => setHoveredMenuId(item.id)}
          onMouseLeave={() => setHoveredMenuId(null)}
        >
          <button
            onClick={() => { onNavigate(item.action_page!); onClose(); }}
            className={`sidebar-link !pl-0 !py-1 !inline-block !w-auto text-left font-bold transition-all duration-300 ${currentPage === item.action_page ? 'active' : ''}`}
          >
            <span className="text-[0.75rem] whitespace-normal break-words">{renderMenuLabel(item)}</span>
          </button>
          {!isCollapsed && hoveredMenuId === item.id && (
            <div className="z-20 ml-2 shrink-0 animate-in fade-in duration-100">
              <MenuQafButton item={item} />
            </div>
          )}
        </div>
      );
    }

    // External link — entire row is clickable
    if (item.nama_aplikasi && item.aplikasi_url) {
      return (
        <div
          key={item.id}
          className={`relative flex items-center w-full ${paddingClass} py-0.5`}
          onMouseEnter={() => setHoveredMenuId(item.id)}
          onMouseLeave={() => setHoveredMenuId(null)}
        >
          <a
            href={item.aplikasi_url}
            target="_blank"
            rel="noopener noreferrer"
            className="sidebar-link !pl-0 !py-1 !inline-block !w-auto font-bold block cursor-pointer transition-all duration-300"
            onClick={() => onClose()}
          >
            <span className="text-[0.75rem] whitespace-normal break-words">
              {item.nama_menu}
              {' -> '}
              <span className="text-[0.785rem] font-black" style={extLinkStyle}>
                {item.nama_aplikasi}
              </span>
            </span>
          </a>
          {!isCollapsed && hoveredMenuId === item.id && (
            <div className="z-20 ml-2 shrink-0 animate-in fade-in duration-100">
              <MenuQafButton item={item} />
            </div>
          )}
        </div>
      );
    }

    // Fallback: label only (no link, no action)
    return (
      <span
        key={item.id}
        className={`sidebar-link ${paddingClass} opacity-50 font-bold cursor-default text-[0.75rem]`}
      >
        {item.nama_menu}
      </span>
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
    const groupIcon = IconCmp ? <IconCmp size={20} /> : <Icons.Link size={20} />;

    const isSelfActive = group.action_page === currentPage;
    const isActiveGroup = children.some(c => {
      if (c.action_page === currentPage) return true;
      const grandChildren = getChildren(c.id);
      return grandChildren.some(gc => gc.action_page === currentPage);
    });
    const isActive = isSelfActive || isActiveGroup;

    return (
      <div key={group.id} className="group">
        <div
          className={`sidebar-header flex items-start transition-all duration-300 active:scale-[0.98] px-4 py-3.5
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
          <div className="flex items-center w-full min-w-0">
            <div className="w-12 h-5 flex items-center justify-center shrink-0 mt-0.5">
              <span className="opacity-70 group-hover:opacity-100 transition-opacity">
                {groupIcon}
              </span>
            </div>
            <div className={`transition-all duration-300 ease-in-out overflow-hidden flex items-start justify-between flex-1 ${isCollapsed ? 'max-w-0 opacity-0' : 'max-w-xs opacity-100 ml-4'}`}>
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span className="select-none text-[0.855rem] font-bold tracking-wide whitespace-normal break-words border-b border-transparent opacity-90 capitalize leading-tight">
                  {group.nama_aplikasi && group.aplikasi_url ? (
                    <>
                      {group.nama_menu}
                      {' -> '}
                      <a
                        href={group.aplikasi_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline underline-offset-4 transition-colors text-[0.785rem] font-black opacity-90 hover:opacity-100"
                        style={extLinkStyle}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {group.nama_aplikasi}
                      </a>
                    </>
                  ) : (
                    group.nama_menu
                  )}
                </span>
                {showGroupQaf && !isCollapsed && hoveredMenuId === group.id && (
                  <div className="z-10 ml-2 shrink-0 animate-in fade-in duration-100">
                    <MenuQafButton item={group} />
                  </div>
                )}
              </div>
              {hasLinks && (
                <div className="flex items-center gap-1.5 ml-2 shrink-0">
                  {isExpanded ? <Icons.ChevronDown size={14} className="opacity-50 shrink-0" /> : <Icons.ChevronRight size={14} className="opacity-50 shrink-0" />}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className={`submenu-grid-container ${(!isCollapsed && hasLinks && isExpanded) ? 'expanded' : ''}`}>
          <div className="submenu-grid-content bg-white/5">
            {children.map(child => renderDbLink(child))}
          </div>
        </div>
      </div>
    );
  };

  const SidebarItemSkeleton = () => (
    <div className="flex items-center px-4 py-3.5">
      <div className="w-12 h-5 flex items-center justify-center shrink-0">
        <div className="w-5 h-5 bg-white/10 rounded-md animate-pulse" />
      </div>
      <div className={`transition-all duration-300 h-3 bg-white/10 rounded-md animate-pulse ${isCollapsed ? 'w-0 opacity-0' : 'ml-4 w-32 opacity-100'}`} />
    </div>
  );

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-ppm-slate/50 z-40 lg:hidden backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <div
        ref={sidebarRef}
        className={`
        fixed inset-y-0 left-0 z-50 bg-ppm-slate h-screen flex flex-col shrink-0 transform transition-all duration-300 ease-in-out
        lg:relative lg:translate-x-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        ${isCollapsed ? 'lg:w-20' : 'lg:w-72 w-72'}
        sidebar-main-container
      `}>


        <div className={`py-6 bg-ppm-slate-light flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} overflow-hidden transition-all duration-300 px-4`}>
          {!isCollapsed ? (
            <>
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-8 h-8 flex items-center justify-center shrink-0">
                  <Icons.LayoutDashboard size={24} style={{ color: 'var(--theme-text-on-primary, #ffffff)' }} />
                </div>
                <div className="transition-all duration-300 ease-in-out overflow-hidden flex flex-col min-w-0 flex-1">
                  <span className="text-[14px] font-black leading-tight uppercase tracking-tighter whitespace-nowrap overflow-hidden text-ellipsis" style={{ color: 'var(--theme-text-on-primary, #ffffff)' }}>
                    {currentUser?.instansi_singkatan || (currentUser?.tipe_user_id === 1 ? 'SYSTEM' : 'BAPPERIDA')}
                  </span>
                  <span className="text-[10px] font-bold leading-none uppercase tracking-widest -mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis" style={{ color: 'var(--theme-text-on-primary, #ffffff)', opacity: 0.6 }}>
                    {currentUser?.tipe_user_id === 1 ? 'DASHBOARD' : 'KABUPATEN BOGOR'}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-center ml-2 shrink-0">
                <button
                  onClick={onClose}
                  className="lg:hidden flex items-center justify-center w-9 h-9 rounded-lg border border-ppm-sage bg-white shadow-sm text-ppm-slate-light hover:text-ppm-slate transition-all active:scale-95"
                >
                  <Icons.ChevronRight size={22} className="rotate-180" />
                </button>

                <button
                  type="button"
                  onClick={handleToggleCollapse}
                  className="hidden lg:flex items-center justify-center w-8 h-8 rounded-lg border border-black/10 dark:border-white/20 bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 transition-all active:scale-95 cursor-pointer"
                  style={{ color: 'var(--theme-text-on-primary, #ffffff)' }}
                  title="Collapse Sidebar"
                >
                  <Icons.ChevronsLeft size={18} />
                </button>
              </div>
            </>
          ) : (
            <button
              type="button"
              onClick={handleToggleCollapse}
              className="flex items-center justify-center w-10 h-10 rounded-lg border border-black/10 dark:border-white/20 bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 transition-all active:scale-95 cursor-pointer"
              style={{ color: 'var(--theme-text-on-primary, #ffffff)' }}
              title="Expand Sidebar"
            >
              <Icons.ChevronsRight size={20} />
            </button>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto py-2 overflow-x-hidden sidebar-scroll">
          {isLoading ? (
            <div className="space-y-1">
              {[...Array(6)].map((_, i) => <SidebarItemSkeleton key={i} />)}
            </div>
          ) : (
            <div className="animate-in fade-in duration-500">
              {/* Main menu items */}
              {regularMenus.map(renderMenuGroup)}
            </div>
          )}
        </nav>

        {/* Bottom pinned menus */}
        {bottomMenus.length > 0 && (
          <div className="pb-10 pt-1 mt-auto">
            {bottomMenus.map(renderMenuGroup)}
          </div>
        )}
      </div>
    </>
  );
};

export default Sidebar;
