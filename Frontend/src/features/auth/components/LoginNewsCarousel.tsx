import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, ExternalLink, ChevronDown, ChevronUp, Newspaper } from 'lucide-react';
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

  // Auto slide every 6 seconds unless hovered
  useEffect(() => {
    if (isPaused || isCollapsed || news.length === 0) return;

    timerRef.current = setInterval(() => {
      setStartIndex(prev => (prev + 1) % news.length);
    }, 6000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPaused, isCollapsed, news.length]);

  if (news.length === 0) return null;

  // Prepare visible window of 3 items (circular array)
  const visibleItems: NewsItem[] = [];
  const countToShow = Math.min(3, news.length);
  for (let i = 0; i < countToShow; i++) {
    const idx = (startIndex + i) % news.length;
    visibleItems.push(news[idx]);
  }

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
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-white/90 backdrop-blur-md border border-white text-blue-600 shadow-sm">
            <Newspaper size={14} />
          </div>
          <span className="text-xs font-black uppercase tracking-wider text-slate-900 drop-shadow-[0_1px_2px_rgba(255,255,255,0.9)]">
            Warta Terkini Pilihan
          </span>
          <span className="hidden sm:inline-block text-[11px] font-bold text-slate-700 drop-shadow-[0_1px_2px_rgba(255,255,255,0.9)]">
            • Liputan Lapangan & Kebijakan
          </span>
        </div>

        <div className="flex items-center gap-1.5">
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

      {/* Cards Stream with Images & Proportional Size */}
      {!isCollapsed && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 animate-in fade-in slide-in-from-bottom-2 duration-300">
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
