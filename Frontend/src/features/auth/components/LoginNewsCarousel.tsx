import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import { NewsItem } from '../services/loginMediaService';

interface LoginNewsCarouselProps {
  news: NewsItem[];
}

export const LoginNewsCarousel: React.FC<LoginNewsCarouselProps> = ({ news }) => {
  const [startIndex, setStartIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('samp_login_news_collapsed') === 'true';
  });

  // Touch / Swipe state for PWA & Mobile Single-Card View
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const [touchDeltaX, setTouchDeltaX] = useState<number>(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const isDraggingRef = useRef(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const toggleCollapse = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('samp_login_news_collapsed', String(next));
      return next;
    });
  };

  const handleNext = () => {
    setStartIndex(prev => (prev + 1) % news.length);
  };

  const handlePrev = () => {
    setStartIndex(prev => (prev - 1 + news.length) % news.length);
  };

  // Auto slide every 6 seconds unless paused / collapsed
  useEffect(() => {
    if (isPaused || isCollapsed || news.length === 0) return;

    timerRef.current = setInterval(() => {
      setStartIndex(prev => (prev + 1) % news.length);
    }, 6000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPaused, isCollapsed, news.length]);

  // Touch swipe gesture handlers for Mobile/PWA
  const handleTouchStart = (e: React.TouchEvent) => {
    setIsPaused(true);
    setTouchStartX(e.touches[0].clientX);
    setTouchStartY(e.touches[0].clientY);
    setTouchDeltaX(0);
    isDraggingRef.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartX === null || touchStartY === null) return;
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const diffX = currentX - touchStartX;
    const diffY = currentY - touchStartY;

    // Detect predominantly horizontal swipe gesture
    if (Math.abs(diffX) > Math.abs(diffY)) {
      if (Math.abs(diffX) > 8) {
        isDraggingRef.current = true;
      }
      setTouchDeltaX(diffX);
      setIsSwiping(true);
    }
  };

  const handleTouchEnd = () => {
    setIsPaused(false);
    const SWIPE_THRESHOLD = 40; // minimum pixels to trigger card change
    if (touchDeltaX < -SWIPE_THRESHOLD) {
      // Swiped Left -> Next News
      handleNext();
    } else if (touchDeltaX > SWIPE_THRESHOLD) {
      // Swiped Right -> Previous News
      handlePrev();
    }

    setTouchStartX(null);
    setTouchStartY(null);
    setTouchDeltaX(0);

    // Short timeout to prevent synthetic click after touch drag
    setTimeout(() => {
      isDraggingRef.current = false;
      setIsSwiping(false);
    }, 100);
  };

  if (news.length === 0) return null;

  // Desktop visible window of items (circular array: 3 items)
  const visibleItems: NewsItem[] = [];
  const countToShow = Math.min(3, news.length);
  for (let i = 0; i < countToShow; i++) {
    const idx = (startIndex + i) % news.length;
    visibleItems.push(news[idx]);
  }

  // Mobile / PWA current single item
  const currentMobileItem = news[startIndex % news.length];

  // Clean light badges for news levels
  const getScopeBadgeStyle = (scope: NewsItem['scope']) => {
    switch (scope) {
      case 'district':
        return 'bg-emerald-500/90 text-white border-emerald-400';
      case 'province':
        return 'bg-blue-600/90 text-white border-blue-400';
      case 'national':
        return 'bg-amber-600/90 text-white border-amber-400';
      default:
        return 'bg-slate-700/90 text-white border-slate-500';
    }
  };

  return (
    <div 
      className="w-full max-w-6xl mx-auto px-4 sm:px-6 transition-all duration-500 ease-in-out select-none"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Header Deck Bar */}
      <div className="flex items-center justify-between mb-2">
        {/* Mobile counter indicator */}
        <div className="sm:hidden px-2.5 py-0.5 rounded-lg bg-white/85 border border-white text-[11px] font-extrabold text-blue-700 shadow-xs backdrop-blur-md">
          {startIndex + 1} / {news.length}
        </div>
        <div className="hidden sm:block" />

        <div className="flex items-center gap-1.5 ml-auto">
          {/* Collapse / Expand Button */}
          <button
            type="button"
            onClick={toggleCollapse}
            className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/85 hover:bg-white text-slate-800 hover:text-slate-950 border border-white text-[11px] font-bold backdrop-blur-xl transition-all shadow-sm cursor-pointer"
            title={isCollapsed ? 'Buka Warta' : 'Lipat Warta'}
          >
            {isCollapsed ? (
              <>
                <ChevronUp size={13} className="text-blue-600" />
                <span>Buka Warta</span>
              </>
            ) : (
              <>
                <ChevronDown size={13} className="text-blue-600" />
                <span className="hidden sm:inline">Lipat Warta</span>
              </>
            )}
          </button>

          {!isCollapsed && (
            <div className="flex items-center gap-1 ml-0.5">
              <button
                type="button"
                onClick={handlePrev}
                className="w-7 h-7 flex items-center justify-center rounded-xl bg-white/85 hover:bg-white text-slate-700 hover:text-slate-950 border border-white backdrop-blur-xl transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-sm"
                title="Warta Sebelumnya"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="w-7 h-7 flex items-center justify-center rounded-xl bg-white/85 hover:bg-white text-slate-700 hover:text-slate-950 border border-white backdrop-blur-xl transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-sm"
                title="Warta Berikutnya"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 1. MOBILE & PWA VIEW (Tepat 1 Berita dengan Gesture Swipe Kiri-Kanan) */}
      {!isCollapsed && (
        <div className="block sm:hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div 
            className="relative overflow-hidden touch-pan-y"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <a
              href={currentMobileItem.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => {
                if (isDraggingRef.current) {
                  e.preventDefault();
                }
              }}
              style={{
                transform: isSwiping ? `translateX(${touchDeltaX}px)` : 'translateX(0)',
                transition: isSwiping ? 'none' : 'transform 0.25s ease-out',
              }}
              className="group relative flex flex-col rounded-2xl bg-white/92 hover:bg-white border border-white backdrop-blur-3xl shadow-[0_12px_35px_rgba(0,30,80,0.12)] overflow-hidden cursor-pointer active:scale-[0.99] transition-transform"
            >
              {/* News Thumbnail Photo */}
              <div className="relative w-full h-36 overflow-hidden bg-slate-100">
                <img 
                  src={currentMobileItem.imageUrl} 
                  alt={currentMobileItem.title} 
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover" 
                  onError={(e) => {
                    e.currentTarget.src = 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?auto=format&fit=crop&w=600&q=80';
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />

                {/* Scope Badge */}
                <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border shadow-md backdrop-blur-md ${getScopeBadgeStyle(currentMobileItem.scope)}`}>
                    {currentMobileItem.scopeLabel}
                  </span>
                </div>

                {/* Category Pill */}
                {currentMobileItem.category && (
                  <div className="absolute bottom-2 left-2.5">
                    <span className="px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-white text-[10px] font-bold shadow-xs">
                      {currentMobileItem.category}
                    </span>
                  </div>
                )}
              </div>

              {/* News Content Area */}
              <div className="p-3.5 flex flex-col justify-between flex-1">
                <h4 className="text-xs font-extrabold text-slate-900 group-hover:text-blue-600 line-clamp-2 leading-snug mb-2.5">
                  {currentMobileItem.title}
                </h4>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                  <div className="flex items-center gap-1.5 font-bold">
                    <span className="text-slate-800">{currentMobileItem.source}</span>
                    <span>•</span>
                    <span className="font-semibold text-slate-500">{currentMobileItem.timeAgo}</span>
                  </div>
                  <div className="flex items-center gap-1 text-blue-600 font-bold">
                    <span className="text-[10px]">Buka Berita</span>
                    <ExternalLink size={12} />
                  </div>
                </div>
              </div>
            </a>
          </div>

          {/* Mobile Swipe Guidance & Pagination Dots */}
          <div className="flex items-center justify-between mt-2 px-1">
            <span className="text-[10px] font-bold text-slate-700 drop-shadow-[0_1px_1px_rgba(255,255,255,0.9)] flex items-center gap-1">
              <span>👈 Geser kanan / kiri 👉</span>
            </span>

            {/* Pagination Dots (Showing 7 active dots window) */}
            <div className="flex items-center gap-1">
              {news.slice(0, Math.min(news.length, 8)).map((_, dotIdx) => {
                const isActive = dotIdx === (startIndex % Math.min(news.length, 8));
                return (
                  <button
                    key={dotIdx}
                    type="button"
                    onClick={() => setStartIndex(dotIdx)}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      isActive 
                        ? 'w-5 bg-blue-600 shadow-xs' 
                        : 'w-1.5 bg-slate-400/60 hover:bg-slate-600'
                    }`}
                    aria-label={`Ke berita ${dotIdx + 1}`}
                  />
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 2. DESKTOP VIEW (Grid 2 hingga 3 Kartu Berita Proporsional) */}
      {!isCollapsed && (
        <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-3.5 animate-in fade-in slide-in-from-bottom-2 duration-300">
          {visibleItems.map((item, idx) => {
            const isLastOnTablet = idx === 2;
            return (
              <a
                key={`${item.id}-${idx}`}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`group relative flex flex-col rounded-2xl bg-white/90 hover:bg-white border border-white/90 backdrop-blur-3xl shadow-[0_12px_35px_rgba(0,30,80,0.1)] transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_18px_45px_rgba(0,50,110,0.18)] overflow-hidden cursor-pointer ${
                  isLastOnTablet ? 'hidden lg:flex' : 'flex'
                }`}
              >
                {/* 1. News Thumbnail Photo */}
                <div className="relative w-full h-32 sm:h-36 overflow-hidden bg-slate-100">
                  <img 
                    src={item.imageUrl} 
                    alt={item.title} 
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out" 
                    onError={(e) => {
                      e.currentTarget.src = 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?auto=format&fit=crop&w=600&q=80';
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />

                  {/* Scope Badge Overlay */}
                  <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border shadow-md backdrop-blur-md ${getScopeBadgeStyle(item.scope)}`}>
                      {item.scopeLabel}
                    </span>
                  </div>

                  {/* Category Pill Overlay */}
                  {item.category && (
                    <div className="absolute bottom-2 left-2.5">
                      <span className="px-2 py-0.5 rounded-md bg-black/50 backdrop-blur-md text-white text-[10px] font-bold shadow-xs">
                        {item.category}
                      </span>
                    </div>
                  )}
                </div>

                {/* 2. News Content Area */}
                <div className="p-3.5 sm:p-4 flex flex-col justify-between flex-1">
                  {/* Headline */}
                  <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 group-hover:text-blue-600 line-clamp-2 leading-snug transition-colors mb-3">
                    {item.title}
                  </h4>

                  {/* Footer Bar: Source, Time, External Icon */}
                  <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 text-[11px] text-slate-500">
                    <div className="flex items-center gap-1.5 font-bold">
                      <span className="text-slate-800">{item.source}</span>
                      <span>•</span>
                      <span className="font-semibold text-slate-500">{item.timeAgo}</span>
                    </div>
                    <div className="flex items-center gap-1 text-slate-400 group-hover:text-blue-600 transition-colors">
                      <span className="text-[10px] opacity-0 group-hover:opacity-100 transition-opacity font-bold hidden sm:inline">
                        Baca
                      </span>
                      <ExternalLink size={12} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </div>
                  </div>
                </div>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
};
