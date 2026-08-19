import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import * as Icons from 'lucide-react';

interface QafPopoverProps {
  top: number;
  left: number;
  isFlippedVertical?: boolean;
  flipSubmenuLeft?: boolean;
  onClose: () => void;

  // Option 1: Semua Bidang (Global)
  globalActive?: boolean;
  canEditGlobal?: boolean;
  onToggleGlobal?: () => void;
  globalTitle?: string;

  // Option 2: Bidang Saya (Department)
  bidangActive?: boolean;
  canEditBidang?: boolean;
  onToggleBidang?: () => void;
  bidangTitle?: string;
  bidangLabel?: string;

  // Option 3: Personal
  personalActive?: boolean;
  canEditPersonal?: boolean;
  onTogglePersonal?: () => void;
  personalTitle?: string;

  // Option 4: Salin Link Publik
  onCopyLink?: () => void;
  copyTitle?: string;

  // Option 5: Jadikan SKP / Catatan
  onMakeSkp?: () => void;
  skpTitle?: string;
}

export const QafPopover: React.FC<QafPopoverProps> = ({
  top,
  left,
  isFlippedVertical = false,
  flipSubmenuLeft = false,
  onClose,

  globalActive = false,
  canEditGlobal = false,
  onToggleGlobal,
  globalTitle,

  bidangActive = false,
  canEditBidang = false,
  onToggleBidang,
  bidangTitle,
  bidangLabel = 'Bidang Saya',

  personalActive = false,
  canEditPersonal = true,
  onTogglePersonal,
  personalTitle,

  onCopyLink,
  copyTitle,

  onMakeSkp,
  skpTitle,
}) => {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [showSubmenu, setShowSubmenu] = useState(false);
  const [qafTextColor, setQafTextColor] = useState('#ffffff');

  // Handle click outside to close
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [onClose]);

  // Compute text color contrast dynamically based on --theme-primary background
  useEffect(() => {
    const computeQafContrast = () => {
      try {
        const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--theme-primary').trim();
        if (!primaryColor) {
          setQafTextColor('#ffffff');
          return;
        }

        // Parse hex color
        let hex = primaryColor.replace('#', '');
        if (hex.length === 3) {
          hex = hex.split('').map(c => c + c).join('');
        }

        if (hex.length === 6) {
          const r = parseInt(hex.substring(0, 2), 16);
          const g = parseInt(hex.substring(2, 4), 16);
          const b = parseInt(hex.substring(4, 6), 16);
          const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
          setQafTextColor(yiq >= 128 ? '#0f172a' : '#ffffff');
        } else {
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
  }, []);

  const isAnyQaActive = globalActive || bidangActive || personalActive;

  return createPortal(
    <div
      ref={popoverRef}
      style={{
        position: 'fixed',
        top: `${top}px`,
        left: `${left}px`,
        width: '176px', // w-44 is 176px
        zIndex: 99999,
        backgroundColor: 'var(--theme-primary, #3b82f6)',
        color: qafTextColor,
      }}
      className={`qaf-popover-portal border border-black/10 dark:border-white/15 rounded-xl shadow-2xl p-1 space-y-0.5 animate-in zoom-in-95 duration-100 ${
        isFlippedVertical ? 'origin-bottom-left' : 'origin-top-left'
      }`}
      onClick={(e) => e.stopPropagation()}
    >
      {/* 1. Quick Access Options Group */}
      <div
        className="relative"
        onMouseEnter={() => setShowSubmenu(true)}
        onMouseLeave={() => setShowSubmenu(false)}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setShowSubmenu(!showSubmenu);
          }}
          className="w-full text-left px-2.5 py-1.5 text-[10px] font-bold hover:bg-black/5 dark:hover:bg-white/10 rounded-lg transition-colors flex items-center justify-between gap-1.5 cursor-pointer"
        >
          <div className="flex items-center gap-1.5">
            <Icons.Zap
              size={12}
              className={isAnyQaActive ? 'fill-amber-400 text-amber-500' : 'opacity-70'}
            />
            <span>Quick Access</span>
          </div>
          {flipSubmenuLeft ? (
            <Icons.ChevronRight size={11} className="opacity-50 rotate-180" />
          ) : (
            <Icons.ChevronRight size={11} className="opacity-50" />
          )}
        </button>

        {/* Checkboxes Submenu Popover */}
        {showSubmenu && (
          <div
            style={{
              backgroundColor: 'var(--theme-primary, #3b82f6)',
              color: qafTextColor,
            }}
            className={`absolute ${flipSubmenuLeft ? 'right-full mr-1' : 'left-full ml-1'} ${
              isFlippedVertical ? 'bottom-0' : 'top-0'
            } w-44 border border-black/10 dark:border-white/15 rounded-xl shadow-2xl z-[100000] p-2 space-y-1.5 animate-in fade-in zoom-in-95 duration-100`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-[9px] font-black opacity-40 uppercase tracking-wider px-1 pb-1 border-b border-black/5 dark:border-white/5">
              Pilih Target Akses:
            </div>

            {/* Semua Bidang Checkbox */}
            {onToggleGlobal ? (
              <label
                className={`flex items-center gap-2 px-1.5 py-1 rounded-lg text-[10px] font-bold transition-colors ${
                  canEditGlobal ? 'hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer opacity-90' : 'opacity-50 cursor-not-allowed'
                }`}
                title={globalTitle}
              >
                <input
                  type="checkbox"
                  disabled={!canEditGlobal}
                  checked={globalActive}
                  onChange={onToggleGlobal}
                  className="w-3.5 h-3.5 rounded text-amber-500 focus:ring-amber-400 cursor-pointer"
                />
                Semua Bidang
              </label>
            ) : (
              <div
                className="w-full px-1.5 py-1 text-[10px] font-bold flex items-center gap-2 cursor-not-allowed select-none opacity-45"
                title={globalTitle}
              >
                <Icons.Globe size={13} />
                <span>Semua Bidang</span>
                <span className="ml-auto text-[9px] px-1 bg-black/10 dark:bg-white/10 rounded font-normal uppercase tracking-wider scale-90">
                  {globalActive ? 'On' : 'Off'}
                </span>
              </div>
            )}

            {/* Bidang Saya Checkbox */}
            {onToggleBidang ? (
              <label
                className={`flex items-center gap-2 px-1.5 py-1 rounded-lg text-[10px] font-bold transition-colors ${
                  canEditBidang ? 'hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer opacity-90' : 'opacity-50 cursor-not-allowed'
                }`}
                title={bidangTitle}
              >
                <input
                  type="checkbox"
                  disabled={!canEditBidang}
                  checked={bidangActive}
                  onChange={onToggleBidang}
                  className="w-3.5 h-3.5 rounded text-amber-500 focus:ring-amber-400 cursor-pointer"
                />
                {bidangLabel}
              </label>
            ) : (
              <div
                className="w-full px-1.5 py-1 text-[10px] font-bold flex items-center gap-2 cursor-not-allowed select-none opacity-45"
                title={bidangTitle}
              >
                <Icons.Building2 size={13} />
                <span>{bidangLabel}</span>
                <span className="ml-auto text-[9px] px-1 bg-black/10 dark:bg-white/10 rounded font-normal uppercase tracking-wider scale-90">
                  {bidangActive ? 'On' : 'Off'}
                </span>
              </div>
            )}

            {/* Personal Checkbox */}
            {onTogglePersonal ? (
              <label
                className={`flex items-center gap-2 px-1.5 py-1 rounded-lg text-[10px] font-bold transition-colors ${
                  canEditPersonal ? 'hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer opacity-90' : 'opacity-50 cursor-not-allowed'
                }`}
                title={personalTitle}
              >
                <input
                  type="checkbox"
                  disabled={!canEditPersonal}
                  checked={personalActive}
                  onChange={onTogglePersonal}
                  className="w-3.5 h-3.5 rounded text-amber-500 focus:ring-amber-400 cursor-pointer"
                />
                Personal
              </label>
            ) : (
              <div
                className="w-full px-1.5 py-1 text-[10px] font-bold flex items-center gap-2 cursor-not-allowed select-none opacity-45"
                title={personalTitle}
              >
                <Icons.Star size={13} />
                <span>Personal</span>
                <span className="ml-auto text-[9px] px-1 bg-black/10 dark:bg-white/10 rounded font-normal uppercase tracking-wider scale-90">
                  {personalActive ? 'On' : 'Off'}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 2. Salin Link Publik */}
      {onCopyLink ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onCopyLink();
          }}
          className="w-full text-left px-2.5 py-1.5 text-[10px] font-bold hover:bg-black/5 dark:hover:bg-white/10 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
          title={copyTitle}
        >
          <Icons.Copy size={12} className="opacity-70" />
          <span>Salin Link Publik</span>
        </button>
      ) : (
        <div
          className="w-full text-left px-2.5 py-1.5 text-[10px] font-bold flex items-center gap-1.5 opacity-45 cursor-not-allowed"
          title={copyTitle}
        >
          <Icons.Copy size={12} />
          <span>Salin Link Publik</span>
        </div>
      )}

      {/* 3. Jadikan SKP / Catatan */}
      {onMakeSkp ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onMakeSkp();
          }}
          className="w-full text-left px-2.5 py-1.5 text-[10px] font-bold hover:bg-black/5 dark:hover:bg-white/10 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
          title={skpTitle}
        >
          <Icons.Database size={12} className="opacity-70" />
          <span>Jadikan SKP / Catatan</span>
        </button>
      ) : (
        onMakeSkp === undefined ? null : (
          <div
            className="w-full text-left px-2.5 py-1.5 text-[10px] font-bold flex items-center gap-1.5 opacity-45 cursor-not-allowed"
            title={skpTitle}
          >
            <Icons.Database size={12} />
            <span>Jadikan SKP / Catatan</span>
          </div>
        )
      )}
    </div>,
    document.body
  );
};
