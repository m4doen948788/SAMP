import React, { useState, useEffect } from 'react';
import { useAuth } from '@/src/contexts/AuthContext';
import { useTheme } from '@/src/contexts/ThemeContext';
import { 
  KeyRound, 
  Mail, 
  ArrowRight, 
  Loader2, 
  Sun, 
  CloudSun, 
  CloudRain, 
  CloudFog, 
  CloudLightning, 
  CloudDrizzle,
  Camera,
  Building2,
  CalendarDays,
  Clock,
  Sparkles
} from 'lucide-react';
import { CURRENT_REGION } from '@/src/config/regionConfig';
import { 
  getDailyWallpaper, 
  fetchRegionWeather, 
  getUnifiedNewsFeed, 
  fetchDynamicNewsFeed,
  WallpaperItem, 
  WeatherData, 
  NewsItem,
  BOGOR_WALLPAPERS 
} from '../services/loginMediaService';
import { LoginNewsCarousel } from './LoginNewsCarousel';

export const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);

  // Dynamic Media States
  const [wallpaperIndex, setWallpaperIndex] = useState<number>(() => {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 0);
    const dayOfYear = Math.floor((now.getTime() - startOfYear.getTime()) / 86400000);
    return dayOfYear % BOGOR_WALLPAPERS.length;
  });
  const [wallpaper, setWallpaper] = useState<WallpaperItem>(() => getDailyWallpaper(wallpaperIndex));
  const [wallpaperLoaded, setWallpaperLoaded] = useState(false);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [newsList, setNewsList] = useState<NewsItem[]>([]);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');

  const { login } = useAuth();
  const { customColors } = useTheme();

  // SAMP Signature Colors (Light Theme Palette)
  const brandPrimary = customColors?.color1 || '#0097fe'; // Biru Langit SAMP
  const brandSecondary = customColors?.color4 || '#0069a3'; // Biru Tua Kelembagaan

  const rawApiUrl = import.meta.env.VITE_API_URL || '/api';
  const API_URL = rawApiUrl.endsWith('/api') ? rawApiUrl : (rawApiUrl.endsWith('/') ? `${rawApiUrl}api` : `${rawApiUrl}/api`);

  // Switch to next authentic Kabupaten Bogor wallpaper
  const handleNextWallpaper = () => {
    setWallpaperLoaded(false);
    const nextIdx = (wallpaperIndex + 1) % BOGOR_WALLPAPERS.length;
    setWallpaperIndex(nextIdx);
    const nextWp = getDailyWallpaper(nextIdx);
    setWallpaper(nextWp);

    const img = new Image();
    img.src = nextWp.imageUrl;
    img.onload = () => setWallpaperLoaded(true);
  };

  // 1. Digital Clock & Date
  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' WIB');
      setCurrentDate(now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }));
    };

    updateDateTime();
    const interval = setInterval(updateDateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // 2. Preload Wallpaper & Fetch Weather / News
  useEffect(() => {
    const currentWp = getDailyWallpaper(wallpaperIndex);
    setWallpaper(currentWp);

    const img = new Image();
    img.src = currentWp.imageUrl;
    img.onload = () => setWallpaperLoaded(true);

    // Fetch Weather for Kab. Bogor
    fetchRegionWeather().then(data => setWeather(data));

    // Fetch Unified News: instant render from curated feed + dynamic sync from aggregator
    setNewsList(getUnifiedNewsFeed());
    fetchDynamicNewsFeed(API_URL).then(items => {
      if (items && items.length > 0) {
        setNewsList(items);
      }
    }).catch(err => {
      console.warn('Backend warta fetch fallback to local seed:', err);
    });
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (data.success) {
        setTimeout(() => {
          // Force redirect to dashboard to discard any previous url param
          window.history.replaceState({}, '', '/?page=dashboard');
          login(data.data.token, data.data.user);
          // We also ensure a full refresh to reset App state cleanly
          window.location.href = '/?page=dashboard';
        }, 600);
      } else {
        setError(data.message || 'Login failed');
        setIsLoading(false);
      }
    } catch (err) {
      setError('An error occurred. Please try again later.');
      setIsLoading(false);
    }
  };

  const renderWeatherIcon = (iconName: string) => {
    switch (iconName) {
      case 'sun':
        return <Sun size={15} className="text-amber-500 animate-spin-slow" />;
      case 'cloud-rain':
      case 'cloud-rain-wind':
        return <CloudRain size={15} className="text-blue-500" />;
      case 'cloud-fog':
        return <CloudFog size={15} className="text-slate-500" />;
      case 'cloud-lightning':
        return <CloudLightning size={15} className="text-amber-500" />;
      case 'cloud-drizzle':
        return <CloudDrizzle size={15} className="text-blue-400" />;
      default:
        return <CloudSun size={15} className="text-amber-500" />;
    }
  };

  return (
    <div className="min-h-screen relative flex flex-col justify-between overflow-x-hidden font-sans bg-slate-100">
      {/* 1. Fullscreen Wallpaper Background (Lanskap Otentik Kabupaten Bogor) */}
      <div 
        className={`absolute inset-0 bg-cover bg-center bg-no-repeat transition-all duration-1000 ease-out transform ${
          wallpaperLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-105'
        }`}
        style={{ backgroundImage: `url(${wallpaper.imageUrl})` }}
      />

      {/* 2. Soft Daylight Atmosphere Overlay (Cerah, Alami & Terang) */}
      <div className="absolute inset-0 bg-gradient-to-t from-white/70 via-slate-900/10 to-white/60 pointer-events-none" />

      {/* 3. Top Header Bar (Material Kaca Terang Seragam) */}
      <header className="relative z-20 w-full px-4 sm:px-8 pt-4 pb-2 flex items-center justify-between gap-4 select-none">
        {/* Left: District & Weather Widget */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Badge Wilayah */}
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/85 hover:bg-white border border-white/90 backdrop-blur-2xl text-slate-800 shadow-[0_4px_20px_rgba(0,0,0,0.08)] transition-all">
            <Building2 size={15} className="text-blue-600 shrink-0" />
            <span className="text-xs sm:text-sm font-extrabold tracking-tight">
              {CURRENT_REGION.districtName}
            </span>
            <span className="hidden sm:inline-block text-[11px] font-semibold text-slate-600">
              ({CURRENT_REGION.provinceName})
            </span>
          </div>

          {/* Widget Cuaca Realtime */}
          {weather && (
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/85 border border-white/90 backdrop-blur-2xl text-slate-800 shadow-[0_4px_20px_rgba(0,0,0,0.08)] text-xs">
              <span className="flex items-center gap-1.5 font-bold">
                {renderWeatherIcon(weather.conditionIcon)}
                <span className="font-extrabold">{weather.temperature}°C</span>
              </span>
              <span className="text-slate-300">•</span>
              <span className="font-bold text-slate-700 hidden sm:inline">
                {weather.conditionText}
              </span>
              <span className="text-[10px] text-slate-600 hidden md:inline">
                ({CURRENT_REGION.weather.stationName.split(',')[0]})
              </span>
            </div>
          )}
        </div>

        {/* Right: Date & Live WIB Clock */}
        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-800">
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/85 border border-white/90 backdrop-blur-2xl shadow-[0_4px_20px_rgba(0,0,0,0.08)]">
            <CalendarDays size={14} className="text-blue-600" />
            <span className="font-bold text-slate-700">{currentDate}</span>
            <span className="text-slate-300">•</span>
            <Clock size={14} className="text-amber-500 ml-0.5" />
            <span className="font-black tracking-wider font-mono text-slate-900">{currentTime}</span>
          </div>
        </div>
      </header>

      {/* 4. Center Form Login (Kartu Kaca Putih Terang / Bright Frosted Glass) */}
      <main className="relative z-20 w-full flex-1 flex items-center justify-center px-4 py-6 sm:py-8">
        <div className="w-full max-w-[420px]">
          <div className="backdrop-blur-3xl bg-white/85 sm:bg-white/90 border border-white p-8 sm:p-10 rounded-[2.5rem] shadow-[0_20px_60px_rgba(0,35,90,0.14)] transition-all duration-500 hover:shadow-[0_25px_70px_rgba(0,35,90,0.2)]">
            
            {/* Header Form */}
            <div className="mb-7 text-center">
              <div className="inline-flex items-center justify-center mb-3">
                <img 
                  src="/bapperida-b-symbol.png" 
                  alt="Logo Bapperida" 
                  className="w-16 h-16 object-contain drop-shadow-md hover:scale-105 transition-transform duration-300"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    const parent = e.currentTarget.parentElement;
                    if (parent && !parent.querySelector('.fallback-txt')) {
                      const span = document.createElement('span');
                      span.className = 'fallback-txt text-2xl font-black text-blue-600 tracking-tighter';
                      span.innerText = CURRENT_REGION.branding.logoText;
                      parent.appendChild(span);
                    }
                  }}
                />
              </div>

              <h1 className="text-2xl font-black text-slate-900 tracking-tight mb-1">
                {CURRENT_REGION.branding.tagline}
              </h1>
              <p className="text-slate-600 text-xs font-semibold px-4 tracking-wide">
                {CURRENT_REGION.branding.subTagline}
              </p>
            </div>

            {/* Login Form */}
            <form onSubmit={handleLogin} className="space-y-5">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl text-xs sm:text-sm font-semibold flex items-center gap-3 shadow-xs transition-all duration-300">
                  <div className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-4">
                {/* Username / NIP Input */}
                <div className="relative group">
                  <div className={`absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors duration-300 ${
                    focusedInput === 'username' ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'
                  }`}>
                    <Mail size={18} />
                  </div>
                  <input
                    id="username"
                    name="username"
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    onFocus={() => setFocusedInput('username')}
                    onBlur={() => setFocusedInput(null)}
                    className={`block w-full pl-11 pr-4 py-3.5 bg-slate-50/90 border rounded-2xl text-slate-800 placeholder-slate-400 text-sm focus:outline-none transition-all duration-300 shadow-inner ${
                      focusedInput === 'username' 
                        ? 'border-blue-500 bg-white shadow-[0_0_15px_rgba(0,151,254,0.15)] ring-4 ring-blue-500/10' 
                        : 'border-slate-200/90 hover:border-slate-300 hover:bg-white'
                    }`}
                    placeholder="Username atau NIP"
                  />
                </div>

                {/* Password Input */}
                <div className="relative group">
                  <div className={`absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors duration-300 ${
                    focusedInput === 'password' ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'
                  }`}>
                    <KeyRound size={18} />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setFocusedInput('password')}
                    onBlur={() => setFocusedInput(null)}
                    className={`block w-full pl-11 pr-4 py-3.5 bg-slate-50/90 border rounded-2xl text-slate-800 placeholder-slate-400 text-sm focus:outline-none transition-all duration-300 shadow-inner ${
                      focusedInput === 'password' 
                        ? 'border-blue-500 bg-white shadow-[0_0_15px_rgba(0,151,254,0.15)] ring-4 ring-blue-500/10' 
                        : 'border-slate-200/90 hover:border-slate-300 hover:bg-white'
                    }`}
                    placeholder="Kata Sandi"
                  />
                </div>
              </div>

              {/* Submit Button (SAMP Signature Gradient) */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  style={{
                    background: `linear-gradient(135deg, ${brandPrimary} 0%, ${brandSecondary} 100%)`,
                    boxShadow: `0 6px 20px ${brandPrimary}40`
                  }}
                  className="group relative w-full flex justify-center items-center gap-2 py-3.5 px-4 rounded-2xl text-sm font-extrabold text-white hover:brightness-105 focus:outline-none focus:ring-4 focus:ring-blue-500/25 transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed overflow-hidden cursor-pointer shadow-lg hover:shadow-blue-500/40"
                >
                  {/* Continuous Shine Effect */}
                  <div className="absolute inset-0 w-full h-full transform translate-x-[-100%] bg-gradient-to-r from-transparent via-white/30 to-transparent group-hover:animate-shine" />

                  {isLoading ? (
                    <>
                      <Loader2 size={18} className="animate-spin text-white" />
                      <span className="tracking-wide">MEMVERIFIKASI...</span>
                    </>
                  ) : (
                    <>
                      <span className="tracking-wide">MASUK KE SISTEM</span>
                      <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </div>
            </form>

          </div>
        </div>
      </main>

      {/* 5. Bottom Section (News Carousel & Attribution) */}
      <footer className="relative z-20 w-full pb-4 pt-2 flex flex-col gap-2.5">
        {/* Unified News Carousel */}
        <LoginNewsCarousel news={newsList} />

        {/* Bottom Sub-Bar: Copyright & Photo Attribution */}
        <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-800 font-semibold select-none">
          <p className="text-center sm:text-left drop-shadow-[0_1px_2px_rgba(255,255,255,0.8)]">
            &copy; {new Date().getFullYear()} {CURRENT_REGION.appShortName} • {CURRENT_REGION.agencyName}. Hak Cipta Dilindungi.
          </p>

          {/* Photo Credit Otentik Kabupaten Bogor */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/85 border border-white/90 backdrop-blur-2xl text-slate-800 shadow-sm">
            <Camera size={13} className="text-blue-600" />
            <span className="truncate max-w-[280px] sm:max-w-none font-bold">
              📍 {wallpaper.location} ({wallpaper.district})
            </span>
          </div>
        </div>
      </footer>

      {/* Embedded Styles for Shine Animation */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @tailwind utilities;
          @layer utilities {
            .animate-shine {
              animation: shine 1.5s infinite;
            }
            @keyframes shine {
              100% {
                transform: translateX(100%);
              }
            }
            .animate-spin-slow {
              animation: spin 12s linear infinite;
            }
          }
        `
      }} />
    </div>
  );
};
