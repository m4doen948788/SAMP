import React, { useState, useEffect, useRef } from 'react';
import * as Icons from 'lucide-react';
import { api } from '../services/api';

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
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [menuData, setMenuData] = useState<MenuItem[]>([]);
  const [expandedGroupIds, setExpandedGroupIds] = useState<number[]>([]);
  const [expandedSubId, setExpandedSubId] = useState<string | null>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        sidebarRef.current &&
        !sidebarRef.current.contains(event.target as Node) &&
        !isCollapsed
      ) {
        setIsCollapsed(true);
        setExpandedGroupIds([]);
        setExpandedSubId(null);
      }
    };

    const handleExpand = () => setIsCollapsed(false);

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('sidebar:expand', handleExpand as EventListener);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('sidebar:expand', handleExpand as EventListener);
    };
  }, [isCollapsed]);

  useEffect(() => {
    api.menu.getAll().then(res => {
      if (res.success) setMenuData(res.data.filter((m: MenuItem) => m.is_active));
    }).catch(() => { });
  }, []);

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
            className="text-blue-400 hover:text-blue-300 underline underline-offset-4 decoration-blue-400/30 transition-colors text-[11px] font-black"
            onClick={(e) => e.stopPropagation()}
          >
            {item.nama_aplikasi}
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
            className={`sidebar-link ${paddingClass} flex items-center justify-between cursor-pointer hover:bg-white/10 text-white/70 hover:text-white font-bold`}
            onClick={() => toggleSubExpand(subId)}
          >
            <span className="text-[10px]">{renderMenuLabel(item)}</span>
            {isSubExpanded ? <Icons.ChevronDown size={12} /> : <Icons.ChevronRight size={12} />}
          </div>
          {isSubExpanded && (
            <div className="bg-white/5 animate-in fade-in slide-in-from-top-1 duration-200">
              {children.map(child => renderDbLink(child, depth + 1))}
            </div>
          )}
        </div>
      );
    }

    // Action (internal page navigation)
    if (item.action_page) {
      return (
        <button
          key={item.id}
          onClick={() => { onNavigate(item.action_page!); onClose(); }}
          className={`sidebar-link ${paddingClass} text-white/70 hover:text-white w-full text-left font-bold transition-all duration-300 ${currentPage === item.action_page ? 'active' : ''}`}
        >
          <span className="text-[10px]">{renderMenuLabel(item)}</span>
        </button>
      );
    }

    // External link — entire row is clickable
    if (item.nama_aplikasi && item.aplikasi_url) {
      return (
        <a
          key={item.id}
          href={item.aplikasi_url}
          target="_blank"
          rel="noopener noreferrer"
          className={`sidebar-link ${paddingClass} text-white/70 hover:text-white font-bold block cursor-pointer transition-all duration-300`}
          onClick={() => onClose()}
        >
          <span className="text-[10px]">
            {item.nama_menu}
            {' -> '}
            <span className="text-blue-400 text-[11px] font-black">
              {item.nama_aplikasi}
            </span>
          </span>
        </a>
      );
    }

    // Fallback: label only (no link, no action)
    return (
      <span
        key={item.id}
        className={`sidebar-link ${paddingClass} text-white/50 font-bold cursor-default text-[10px]`}
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
          className={`sidebar-header flex items-center transition-all duration-300 active:scale-[0.98]
            ${isCollapsed ? 'justify-center px-0 py-4' : 'justify-between px-4 py-3.5'}
            ${hasLinks || group.action_page ? 'cursor-pointer' : 'pointer-events-none'}
            ${isActive ? 'active' : ''}
          `}
          onClick={() => {
            if (hasLinks) toggleExpand(group.id);
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
          <div className="flex items-center gap-3">
            <span className="text-white/70 group-hover:text-white transition-colors">
              {groupIcon}
            </span>
            {!isCollapsed && (
              <span className="select-none text-[9.5px] font-bold uppercase tracking-widest truncate text-white/90">
                {group.nama_aplikasi && group.aplikasi_url ? (
                  <>
                    {group.nama_menu}
                    {' -> '}
                    <a
                      href={group.aplikasi_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 underline underline-offset-4 decoration-blue-400/30 transition-colors text-[11px] font-black"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {group.nama_aplikasi}
                    </a>
                  </>
                ) : (
                  group.nama_menu
                )}
              </span>
            )}
          </div>
          {!isCollapsed && hasLinks && (
            isExpanded ? <Icons.ChevronDown size={14} className="text-white/50" /> : <Icons.ChevronRight size={14} className="text-white/50" />
          )}
        </div>

        {!isCollapsed && hasLinks && isExpanded && (
          <div className="bg-white/5 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200">
            {children.map(child => renderDbLink(child))}
          </div>
        )}
      </div>
    );
  };

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
        fixed inset-y-0 left-0 z-50 bg-ppm-slate min-h-screen flex flex-col shrink-0 transform transition-all duration-300 ease-in-out
        lg:static lg:translate-x-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        ${isCollapsed ? 'lg:w-20' : 'lg:w-64 w-64'}
        relative
      `}>
        {/* Desktop Toggle Button */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden lg:flex absolute -right-4 top-10 z-50 items-center justify-center w-8 h-8 rounded-full border border-ppm-sage bg-white shadow-md hover:border-ppm-slate-light hover:bg-white transition-all duration-300 group/toggle active:scale-90 cursor-pointer"
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {isCollapsed ? (
            <Icons.ChevronRight size={18} className="text-ppm-slate-light group-hover/toggle:text-ppm-slate transition-colors" />
          ) : (
            <Icons.ChevronRight size={18} className="text-ppm-slate-light group-hover/toggle:text-ppm-slate transition-colors rotate-180" />
          )}
        </button>

        <div className={`p-6 bg-ppm-slate-light flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
          {!isCollapsed && <h1 className="text-base font-black tracking-tighter text-white truncate">DASHBOARD PPM</h1>}
          {isCollapsed && <Icons.LayoutDashboard size={24} className="text-white" />}

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="lg:hidden flex items-center justify-center w-9 h-9 rounded-lg border border-ppm-sage bg-white shadow-sm text-ppm-slate-light hover:text-ppm-slate transition-all active:scale-95"
            >
              <Icons.ChevronRight size={22} className="rotate-180" />
            </button>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-2 overflow-x-hidden sidebar-scroll">
          {/* Main menu items */}
          {regularMenus.map(renderMenuGroup)}
        </nav>

        {/* Bottom pinned menus */}
        {bottomMenus.length > 0 && (
          <div className="pb-4 pt-1 mt-auto">
            {bottomMenus.map(renderMenuGroup)}
          </div>
        )}
      </div>
    </>
  );
};

export default Sidebar;
