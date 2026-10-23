import React from 'react';
import { 
  HeartPulse, Shield, BarChart3, ClipboardList, 
  Settings, LogOut, LogIn, ExternalLink, ArrowLeft, 
  Calendar, CheckCircle2, Building2, User as UserIcon
} from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';

interface Props {
  activeTab: 'dashboard' | 'workspace' | 'leaderboard' | 'admin' | 'login';
  setActiveTab: (tab: 'dashboard' | 'workspace' | 'leaderboard' | 'admin' | 'login') => void;
  selectedTahun: number;
  setSelectedTahun: (tahun: number) => void;
  availableYears: number[];
  onExitToSamp?: () => void;
  children: React.ReactNode;
}

export const KksLayout: React.FC<Props> = ({
  activeTab,
  setActiveTab,
  selectedTahun,
  setSelectedTahun,
  availableYears,
  onExitToSamp,
  children
}) => {
  const { user, isAuthenticated, logout } = useAuth();

  const isSuperadmin = user?.tipe_user_id === 1 || user?.instansi_id === 2; // Admin SAMP atau Bapperida

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* TOP HEADER - STICKY BAR */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-emerald-100 shadow-xs transition-all">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between min-h-[4.25rem] py-2 gap-4">
            
            {/* BRAND LOGO */}
            <div className="flex items-center gap-3 cursor-pointer shrink-0" onClick={() => setActiveTab('dashboard')}>
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20 shrink-0">
                <HeartPulse className="w-5 h-5 animate-pulse" />
              </div>
              <div className="flex flex-col justify-center">
                <div className="flex items-center gap-2">
                  <span className="font-black text-base sm:text-lg tracking-tight bg-gradient-to-r from-emerald-800 to-teal-700 bg-clip-text text-transparent whitespace-nowrap">
                    KABUPATEN SEHAT
                  </span>
                  <span className="text-[10px] uppercase font-black tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 whitespace-nowrap border border-emerald-200/60">
                    KKS {selectedTahun}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 font-medium whitespace-nowrap leading-tight mt-0.5">
                  Sistem Evaluasi Mandiri 9 Tatanan & Kelembagaan
                </p>
              </div>
            </div>

            {/* NAVIGATION TABS (DESKTOP WIDE >= 2XL) */}
            <nav className="hidden 2xl:flex items-center gap-1.5 bg-slate-100/90 p-1.5 rounded-2xl border border-slate-200/80 shrink-0">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                  activeTab === 'dashboard'
                    ? 'bg-white text-emerald-800 shadow-sm border border-emerald-100 font-black'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <BarChart3 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Dashboard Capaian</span>
              </button>

              <button
                onClick={() => setActiveTab('workspace')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                  activeTab === 'workspace'
                    ? 'bg-white text-emerald-800 shadow-sm border border-emerald-100 font-black'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <ClipboardList className="w-4 h-4 text-teal-600 shrink-0" />
                <span>Instrumen & Pengisian</span>
              </button>

              <button
                onClick={() => setActiveTab('leaderboard')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                  activeTab === 'leaderboard'
                    ? 'bg-white text-emerald-800 shadow-sm border border-emerald-100 font-black'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <Building2 className="w-4 h-4 text-blue-600 shrink-0" />
                <span>Kinerja Upload OPD</span>
              </button>

              {isSuperadmin && (
                <button
                  onClick={() => setActiveTab('admin')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                    activeTab === 'admin'
                      ? 'bg-white text-emerald-800 shadow-sm border border-emerald-100 font-black'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                >
                  <Settings className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Pengaturan Master</span>
                </button>
              )}
            </nav>

            {/* RIGHT CONTROLS: TAHUN SWITCHER & AUTH */}
            <div className="flex items-center gap-2.5 shrink-0">
              {/* Year Switcher */}
              <div className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200/70 px-2.5 py-1.5 rounded-xl border border-slate-200 shrink-0 transition-colors">
                <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <select
                  value={selectedTahun}
                  onChange={(e) => setSelectedTahun(Number(e.target.value))}
                  className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
                >
                  {availableYears.map(yr => (
                    <option key={yr} value={yr}>Tahun {yr}</option>
                  ))}
                </select>
              </div>

              {/* User / Login Button */}
              {isAuthenticated && user ? (
                <div className="flex items-center gap-2 shrink-0">
                  <div className="hidden lg:flex flex-col text-right leading-tight max-w-[170px]">
                    <span className="text-xs font-bold text-slate-800 truncate" title={user.nama_lengkap || user.username}>
                      {user.nama_lengkap || user.username}
                    </span>
                    <span className="text-[10px] font-bold text-emerald-600 truncate">
                      {user.instansi_singkatan || user.instansi_nama || 'Bapperida'}
                    </span>
                  </div>

                  {onExitToSamp && (
                    <button
                      onClick={onExitToSamp}
                      title="Kembali ke Dashboard Utama SAMP"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-bold border border-blue-200 transition-colors shrink-0 whitespace-nowrap"
                    >
                      <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
                      <span>Ke SAMP</span>
                    </button>
                  )}

                  <button
                    onClick={() => logout()}
                    title="Keluar"
                    className="p-2 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-slate-200 transition-colors shrink-0"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setActiveTab('login')}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-700 hover:to-teal-700 text-xs font-bold shadow-sm shadow-emerald-600/20 transition-all shrink-0 whitespace-nowrap"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Masuk KKS</span>
                </button>
              )}
            </div>

          </div>
        </div>
      </header>

      {/* SUB-NAV STRIP FOR SCREENS < 2XL */}
      <div className="2xl:hidden flex items-center justify-center bg-white border-b border-slate-200 px-4 py-2 overflow-x-auto text-xs font-bold shadow-xs">
        <div className="flex items-center gap-1.5 bg-slate-100/90 p-1 rounded-2xl border border-slate-200/80">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeTab === 'dashboard' ? 'bg-white text-emerald-800 shadow-sm font-black' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Dashboard Capaian</span>
          </button>
          <button
            onClick={() => setActiveTab('workspace')}
            className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeTab === 'workspace' ? 'bg-white text-emerald-800 shadow-sm font-black' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ClipboardList className="w-3.5 h-3.5 text-teal-600 shrink-0" />
            <span>Instrumen & Pengisian</span>
          </button>
          <button
            onClick={() => setActiveTab('leaderboard')}
            className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeTab === 'leaderboard' ? 'bg-white text-emerald-800 shadow-sm font-black' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span>Kinerja Upload OPD</span>
          </button>
          {isSuperadmin && (
            <button
              onClick={() => setActiveTab('admin')}
              className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-all flex items-center gap-1.5 ${
                activeTab === 'admin' ? 'bg-white text-emerald-800 shadow-sm font-black' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Settings className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>Pengaturan Master</span>
            </button>
          )}
        </div>
      </div>

      {/* MAIN BODY CONTAINER - FULL WIDTH */}
      <main className="flex-1 w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>

      {/* FOOTER */}
      <footer className="bg-white border-t border-slate-200 py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} Tim Pembina Kabupaten Kota Sehat (KKS) Kabupaten Bogor • Bapperida</p>
          <p className="flex items-center gap-1 font-medium text-emerald-700">
            <Shield className="w-3.5 h-3.5" /> Portal Penilaian Mandiri Berbasis Instrumen 2026
          </p>
        </div>
      </footer>
    </div>
  );
};
