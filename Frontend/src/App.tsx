import React, { useState, useEffect, lazy, Suspense } from 'react';
import ErrorBoundary from './features/common/components/ErrorBoundary';
import { getSkpAlertsForUser, getDetailedStaffTunggakan } from './services/skpHelpers';

import * as Icons from 'lucide-react';
import { Menu, Users } from 'lucide-react';
import Sidebar from './features/layout/components/Sidebar';
import MobileBottomNav from './features/layout/components/MobileBottomNav';
import { BapperidaSymbol, BapperidaCurvesHeader, BatikTopNavBackground, BapperidaContentWatermark } from './components/shared/BapperidaBrand';
const MacroDataTable = lazy(() => import('./features/planning/components/MacroDataTable'));
const RecentNotesTable = lazy(() => import('./features/system/components/RecentNotesTable'));
const WorkLinksTable = lazy(() => import('./features/system/components/WorkLinksTable'));
const MasterTahun = lazy(() => import('./features/regional/components/MasterTahun'));
const MasterTematik = lazy(() => import('./features/planning/components/MasterTematik'));
const MasterAplikasiExternal = lazy(() => import('./features/system/components/MasterAplikasiExternal'));
const QuickAccessPage = lazy(() => import('./features/system/components/QuickAccessPage'));
const QuickAccessDashboardCard = lazy(() => import('./features/system/components/QuickAccessDashboardCard'));
const QuickAccessPersonalDashboardCard = lazy(() => import('./features/system/components/QuickAccessPersonalDashboardCard'));
const UnifiedQuickAccessCard = lazy(() => import('./features/system/components/UnifiedQuickAccessCard'));
const MasterTipeLink = lazy(() => import('./features/system/components/MasterTipeLink'));
const KelolaMenu = lazy(() => import('./features/system/components/KelolaMenu'));
const MasterBidangUrusan = lazy(() => import('./features/planning/components/MasterBidangUrusan'));
const MasterInstansiDaerah = lazy(() => import('./features/regional/components/MasterInstansiDaerah'));
const MasterBidang = lazy(() => import('./features/planning/components/MasterBidang'));
const MasterBidangInstansi = lazy(() => import('./features/regional/components/MasterBidangInstansi'));
const BuatMasterData = lazy(() => import('./features/planning/components/BuatMasterData'));
const MasterJenisDokumen = lazy(() => import('./features/correspondence/components/MasterJenisDokumen'));
const MasterJenisKegiatan = lazy(() => import('./features/activity/components/MasterJenisKegiatan'));
const MasterJenisPegawai = lazy(() => import('./features/auth/components/MasterJenisPegawai'));
const MasterPangkatGolongan = lazy(() => import('./features/auth/components/MasterPangkatGolongan'));
const TableLabelManager = lazy(() => import('./features/planning/components/TableLabelManager'));
const GeneratorHalaman = lazy(() => import('./features/system/components/GeneratorHalaman'));
const PetunjukTeknis = lazy(() => import('./features/system/components/PetunjukTeknis'));
const DynamicTablePage = lazy(() => import('./features/system/components/DynamicTablePage'));
const PengaturanTema = lazy(() => import('./features/system/components/PengaturanTema'));
const ManajemenUser = lazy(() => import('./features/auth/components/ManajemenUser'));
const ManajemenHakAkses = lazy(() => import('./features/auth/components/ManajemenHakAkses'));
const PegawaiProfil = lazy(() => import('./features/auth/components/PegawaiProfil'));
const ManajemenPegawai = lazy(() => import('./features/auth/components/ManajemenPegawai'));
const ManajemenEsign = lazy(() => import('./features/auth/components/ManajemenEsign'));
const InternalInstansi = lazy(() => import('./features/regional/components/InternalInstansi'));
const MappingUrusanInstansi = lazy(() => import('./features/planning/components/MappingUrusanInstansi'));
const MasterTipeKegiatan = lazy(() => import('./features/activity/components/MasterTipeKegiatan'));
const ImportPerencanaan = lazy(() => import('./features/planning/components/ImportPerencanaan'));
const OlahData = lazy(() => import('./features/planning/components/OlahData'));
const DocumentVerification = lazy(() => import('./features/planning/components/DocumentVerification'));
const RpjpdInputPage = lazy(() => import('./features/planning/components/RpjpdInputPage'));
const RpjmdRenstraPage = lazy(() => import('./features/planning/components/RpjmdRenstraPage'));
const TematikHubPage = lazy(() => import('./features/planning/components/TematikHubPage'));
const NayaxaAssistant = lazy(() => import('./features/ai/components/NayaxaAssistant'));
const DraggableTodoListWidget = lazy(() => import('./components/widgets/DraggableTodoListWidget'));
const NayaxaKnowledge = lazy(() => import('./features/ai/components/NayaxaKnowledge'));
const KelolaAplikasi = lazy(() => import('./features/system/components/KelolaAplikasi'));
const DataMakro = lazy(() => import('./features/planning/components/DataMakro'));
const SettingDataMakro = lazy(() => import('./features/planning/components/SettingDataMakro'));
const ManajemenDokumen = lazy(() => import('./features/correspondence/components/ManajemenDokumen'));
const ManajemenKegiatan = lazy(() => import('./features/activity/components/ManajemenKegiatan'));
const ManajemenSurat = lazy(() => import('./features/correspondence/components/ManajemenSurat'));
const SuratMaker = lazy(() => import('./features/correspondence/components/SuratMaker'));
const PengaturanSurat = lazy(() => import('./features/correspondence/components/PengaturanSurat'));
const PengaturanPenomoran = lazy(() => import('./features/correspondence/components/PengaturanPenomoran'));
const VerifyDocument = lazy(() => import('./features/correspondence/components/VerifyDocument'));
const VerifySkpDocuments = lazy(() => import('./features/auth/components/VerifySkpDocuments'));
const ApprovalNotification = lazy(() => import('./features/correspondence/components/ApprovalNotification'));
import ApprovalInboxModal from './features/correspondence/components/ApprovalInboxModal';
const PengaturanNotulen = lazy(() => import('./features/activity/components/PengaturanNotulen'));
const NotulenMaker = lazy(() => import('./features/activity/components/NotulenMaker'));
const SkpSummary = lazy(() => import('./features/auth/components/SkpSummary'));
const KksApp = lazy(() => import('./features/kks/components/KksApp'));




import { LabelProvider } from './contexts/LabelContext';
import { api } from './services/api';
import { Login } from './features/auth/components/Login';
import { useAuth } from './contexts/AuthContext';

export default function App() {
  const { isAuthenticated, user, logout } = useAuth();
  const params = new URLSearchParams(window.location.search);
  const verifySlug = params.get('v');

  const isKksPath = typeof window !== 'undefined' && (
    window.location.pathname === '/kks' || 
    window.location.pathname.startsWith('/kks/')
  );

  const [currentPage, setCurrentPage] = useState(() => {
    if (verifySlug) return 'verify-document';
    if (isKksPath) return 'kks';
    return params.get('page') || 'dashboard';
  });

  useEffect(() => {
    if (window.location.pathname === '/kks' || window.location.pathname.startsWith('/kks/')) {
      return; // Pertahankan path URL bersih /kks di address bar browser
    }
    const url = new URL(window.location.href);
    if (currentPage !== 'dashboard') {
      url.searchParams.set('page', currentPage);
    } else {
      url.searchParams.delete('page');
    }
    window.history.pushState({}, '', url);
  }, [currentPage]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [navTematikId, setNavTematikId] = useState<number | undefined>(() => {
    const idParam = params.get('tematik_id') || params.get('id');
    return idParam ? Number(idParam) : undefined;
  });
  const [isInboxOpen, setIsInboxOpen] = useState(false);
  const [generatedPages, setGeneratedPages] = useState<{ title: string, slug: string, table_name: string }[]>([]);
  const [allowedActionPages, setAllowedActionPages] = useState<string[]>([]);
  const [isLoadingAccess, setIsLoadingAccess] = useState(true);
  const [totalPersonil, setTotalPersonil] = useState<number | null>(null);
  const [todoPendingCount, setTodoPendingCount] = useState<number>(0);
  const [isFullscreenDraft, setIsFullscreenDraft] = useState(() => {
    if (typeof window === 'undefined') return false;
    const p = new URLSearchParams(window.location.search);
    const page = p.get('page');
    const isFs = p.get('fullscreen') === 'true' || p.get('fullscreen') === '1';
    return (page === 'draft-jadwal' || page === 'manajemen-kegiatan') && isFs;
  });

  useEffect(() => {
    const handleExitFs = () => {
      setIsFullscreenDraft(false);
    };
    const handlePopState = () => {
      const p = new URLSearchParams(window.location.search);
      const page = p.get('page');
      const isFs = p.get('fullscreen') === 'true' || p.get('fullscreen') === '1';
      setIsFullscreenDraft((page === 'draft-jadwal' || page === 'manajemen-kegiatan') && isFs);
    };
    window.addEventListener('samp-exit-fullscreen-draft', handleExitFs);
    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('samp-exit-fullscreen-draft', handleExitFs);
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      api.todo.getSummary()
        .then(res => {
          if (res && res.success && res.data) {
            setTodoPendingCount(Number(res.data.pending_total || 0));
          }
        })
        .catch(() => {});

      const handleTodoSummary = (e: any) => {
        if (e.detail && typeof e.detail.pending_total === 'number') {
          setTodoPendingCount(e.detail.pending_total);
        }
      };
      window.addEventListener('samp-todo-summary-updated', handleTodoSummary);
      return () => window.removeEventListener('samp-todo-summary-updated', handleTodoSummary);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      api.profilPegawai.getAll()
        .then(res => {
          if (res && res.success && Array.isArray(res.data)) {
            if (user?.bidang_id) {
              const count = res.data.filter((p: any) => Number(p.bidang_id) === Number(user.bidang_id)).length;
              setTotalPersonil(count);
            } else {
              setTotalPersonil(res.data.length);
            }
          }
        })
        .catch(err => console.error('Failed to fetch personil count:', err));
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    if (verifySlug) return;
    api.generatedPages.getAll().then(res => {
      if (res.success) setGeneratedPages(res.data);
    }).catch(err => console.error('Failed to load generated pages:', err));
  }, [verifySlug]);

  useEffect(() => {
    // Fetch RBAC access slugs for the current user
    const fetchUserAccess = async () => {
      if (user && user.tipe_user_id !== 1) { // 1 is Super Admin
        try {
          setIsLoadingAccess(true);
          const [res, menuRes] = await Promise.all([
            api.rbac.getRoleAccess(user.tipe_user_id),
            api.menu.getAll()
          ]);
          if (res.success && menuRes.success) {
            const allowedMenus = menuRes.data.filter((m: any) => res.data.includes(m.id) && m.action_page);
            setAllowedActionPages(allowedMenus.map((m: any) => m.action_page));
          }
        } catch (error) {
          console.error('Failed to load access roles', error);
        } finally {
          setIsLoadingAccess(false);
        }
      } else {
        setIsLoadingAccess(false);
      }
    };
    fetchUserAccess();
  }, [user]);

  // Handle page navigation via custom events
  useEffect(() => {
    const handleNavigate = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && customEvent.detail.page) {
        if (customEvent.detail.tematikId) {
          setNavTematikId(Number(customEvent.detail.tematikId));
        }
        setCurrentPage(customEvent.detail.page);
      }
    };
    window.addEventListener('navigate-page', handleNavigate);
    return () => window.removeEventListener('navigate-page', handleNavigate);
  }, []);

  const [skpChecked, setSkpChecked] = useState(false);
  const [activeAlerts, setActiveAlerts] = useState<any[]>([]);

  // Reset checked state when user logs out
  useEffect(() => {
    if (!user) {
      setSkpChecked(false);
      setActiveAlerts([]);
      sessionStorage.removeItem('skp_login_checked');
      sessionStorage.removeItem('fresh_login_session');
    }
  }, [user]);

  // Trigger notification pop-up ONCE on mount after fresh login.
  // fresh_login_session is written by AuthContext.login() which is called from Login.tsx
  // BEFORE the window.location.href redirect. So it's already in sessionStorage when
  // this component mounts after the page reload.
  useEffect(() => {
    const isFreshLogin = sessionStorage.getItem('fresh_login_session') === 'true';
    if (!isFreshLogin) return;

    // Auto expand sidebar ONLY on fresh login
    localStorage.setItem('sidebar_collapsed', 'false');
    window.dispatchEvent(new CustomEvent('sidebar:expand'));

    sessionStorage.removeItem('fresh_login_session');

    // Wait for user to be available from AuthContext (it's sync from sessionStorage so should be immediate)
    const doCheck = async (currentUser: any) => {
      if (!currentUser) return;
      try {
        const [skpAlerts, staffTunggakan, resApp, resNotif] = await Promise.all([
          getSkpAlertsForUser(currentUser).catch(() => []),
          getDetailedStaffTunggakan(currentUser).catch(() => []),
          api.suratApprovals.getPending().catch(() => ({ success: false, data: [] })),
          api.notifications.getAll().catch(() => ({ success: false, data: [] }))
        ]);

        const hasSkpAlerts = (skpAlerts as any[]).length > 0 || (staffTunggakan as any[]).length > 0;
        const pendingApprovals = (resApp as any).success ? ((resApp as any).data || []).filter((a: any) => a.status === 'PENDING') : [];
        const unreadNotifs = (resNotif as any).success ? ((resNotif as any).data || []).filter((n: any) => !n.is_read) : [];

        if (hasSkpAlerts || pendingApprovals.length > 0 || unreadNotifs.length > 0) {
          setIsInboxOpen(true);
        }
      } catch (err) {
        console.error('[App] Failed to check alerts before opening inbox:', err);
      }
    };

    // user is initialized synchronously from sessionStorage, so it's available immediately
    doCheck(user);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps


  const renderContent = () => {

    // Dynamic RBAC Protection for certain sensitive pages
    const isSuperAdmin = user?.tipe_user_id === 1;

    const hasAccess = (pageSlug: string) => {
      if (isSuperAdmin) return true;
      // While RBAC is still loading, show loading indicator instead of denying access
      if (isLoadingAccess) return 'loading';
      if (allowedActionPages.includes(pageSlug)) return true;

      // Grouped fallback: allow all Olah Data subpages if user has access to parent or any Olah Data tool
      if (pageSlug.startsWith('olah-data')) {
        return (
          allowedActionPages.includes('olah-data') ||
          allowedActionPages.includes('olah-data-geografis') ||
          allowedActionPages.includes('olah-data-manual') ||
          allowedActionPages.includes('olah-data-komparasi') ||
          allowedActionPages.includes('olah-data-update') ||
          allowedActionPages.includes('olah-data-verifikasi')
        );
      }

      return false;
    };

    const renderProtectedPage = (slug: string, component: React.ReactNode) => {
      const access = hasAccess(slug);
      if (access === 'loading') {
        return (
          <div className="flex items-center justify-center p-12">
            <div className="w-8 h-8 border-4 border-ppm-slate border-t-transparent rounded-full animate-spin"></div>
          </div>
        );
      }
      if (!access) return <div className="p-8 text-center text-red-500 font-bold">Akses Ditolak</div>;

      return (
        <ErrorBoundary>
          <Suspense fallback={<div className="p-12 text-center animate-pulse text-slate-400">Memuat modul...</div>}>
            {component}
          </Suspense>
        </ErrorBoundary>
      );
    };

    const renderModule = (component: React.ReactNode) => (
      <ErrorBoundary>
        <Suspense fallback={<div className="p-12 text-center animate-pulse text-slate-400">Memuat modul...</div>}>
          {component}
        </Suspense>
      </ErrorBoundary>
    );


    switch (currentPage) {
      case 'master-tahun':
        return renderProtectedPage('master-tahun', <MasterTahun />);
      case 'master-tematik':
        return renderProtectedPage('master-tematik', <MasterTematik />);
      case 'master-aplikasi-external':
        return renderProtectedPage('master-aplikasi-external', <MasterAplikasiExternal />);
      case 'quick-access':
        return renderProtectedPage('quick-access', <QuickAccessPage />);
      case 'master-link':
      case 'master-tipe-link':
        return renderProtectedPage('master-link', <MasterTipeLink />);
      case 'kelola-menu':
        return renderProtectedPage('kelola-menu', <KelolaMenu />);
      case 'master-bidang-urusan':
        return renderProtectedPage('master-bidang-urusan', <MasterBidangUrusan />);
      case 'master-instansi-daerah':
        return renderProtectedPage('master-instansi-daerah', <MasterInstansiDaerah />);
      case 'master-bidang':
        return renderProtectedPage('master-bidang', <MasterBidang />);
      case 'master-bidang-instansi':
        return renderProtectedPage('master-bidang-instansi', <MasterBidangInstansi />);
      case 'master-jenis-dokumen':
        return renderProtectedPage('master-jenis-dokumen', <MasterJenisDokumen />);
      case 'master-jenis-kegiatan':
        return renderProtectedPage('master-jenis-kegiatan', <MasterJenisKegiatan />);
      case 'master-jenis-pegawai':
        return renderProtectedPage('master-jenis-pegawai', <MasterJenisPegawai />);
      case 'master-pangkat-golongan':
        return renderProtectedPage('master-pangkat-golongan', <MasterPangkatGolongan />);
      case 'master-tipe-kegiatan':
        return renderProtectedPage('master-tipe-kegiatan', <MasterTipeKegiatan />);
      case 'data-makro':
        return renderProtectedPage('data-makro', <DataMakro />);
      case 'setting-data-makro':
        return renderProtectedPage('setting-data-makro', <SettingDataMakro />);
      case 'import-perencanaan':
        return renderProtectedPage('import-perencanaan', <ImportPerencanaan />);
      case 'olah-data':
        return renderProtectedPage('olah-data', <OlahData />);
      case 'olah-data-geografis':
        return renderProtectedPage('olah-data-geografis', <OlahData initialMode="geografis" />);
      case 'olah-data-manual':
        return renderProtectedPage('olah-data-manual', <OlahData initialMode="manual" />);
      case 'olah-data-komparasi':
        return renderProtectedPage('olah-data-komparasi', <OlahData initialMode="komparasi" />);
      case 'olah-data-update':
        return renderProtectedPage('olah-data-update', <OlahData initialMode="update" />);
      case 'olah-data-verifikasi':
        return renderProtectedPage('olah-data-verifikasi', <DocumentVerification />);
      case 'rpjpd':
        return renderModule(<RpjpdInputPage />);
      case 'rpjmd-renstra':
        return renderProtectedPage('rpjmd-renstra', <RpjmdRenstraPage />);
      case 'ruang-tematik':
        return renderModule(<TematikHubPage initialTematikId={navTematikId} />);
      case 'master-program':
        return renderProtectedPage('master-program', <DynamicTablePage title="Master Program" tableName="master_program" />);
      case 'master-kegiatan':
        return renderProtectedPage('master-kegiatan', <DynamicTablePage title="Master Kegiatan" tableName="master_kegiatan" />);
      case 'master-sub-kegiatan':
        return renderProtectedPage('master-sub-kegiatan', <DynamicTablePage title="Master Sub Kegiatan" tableName="master_sub_kegiatan" />);
      case 'pelabelan-tabel':
        return renderProtectedPage('pelabelan-tabel', <TableLabelManager />);
      case 'buat-master-data':
        return renderProtectedPage('buat-master-data', <BuatMasterData />);
      case 'master-tipe-bidang':
        return renderProtectedPage('master-tipe-bidang', <DynamicTablePage title="Master Tipe Bidang" tableName="master_tipe_bidang" />);
      case 'master-tipe-sub-bidang':
        return renderProtectedPage('master-tipe-sub-bidang', <DynamicTablePage title="Master Tipe Sub Bidang" tableName="master_tipe_sub_bidang" />);
      case 'master-klasifikasi':
        return renderProtectedPage('master-klasifikasi', <DynamicTablePage title="Master Klasifikasi Arsip" tableName="master_klasifikasi_arsip" />);
      case 'generator-halaman':
        return renderProtectedPage('generator-halaman', <GeneratorHalaman />);
      case 'kelola-aplikasi':
        return renderProtectedPage('kelola-aplikasi', <KelolaAplikasi initialTab="keys" />);
      case 'prompt-widget':
        return renderProtectedPage('prompt-widget', <KelolaAplikasi initialTab="prompts" />);
      case 'petunjuk-teknis':
        return renderProtectedPage('petunjuk-teknis', <PetunjukTeknis />);
      case 'pengaturan-tema':
        return renderProtectedPage('pengaturan-tema', <PengaturanTema />);
      case 'nayaxa-knowledge':
        return renderProtectedPage('nayaxa-knowledge', <NayaxaKnowledge />);
      case 'manajemen-user':
        return renderProtectedPage('manajemen-user', <ManajemenUser />);
      case 'manajemen-hak-akses':
        return renderProtectedPage('manajemen-hak-akses', <ManajemenHakAkses />);
      case 'manajemen-pegawai':
        return renderProtectedPage('manajemen-pegawai', <ManajemenPegawai />);
      case 'manajemen-esign':
        return renderProtectedPage('manajemen-esign', <ManajemenEsign />);
      case 'internal-instansi':
        return renderProtectedPage('internal-instansi', <InternalInstansi />);
      case 'referensi-urusan-instansi':
        return renderProtectedPage('referensi-urusan-instansi', <MappingUrusanInstansi />);
      case 'mapping-urusan':
        return renderProtectedPage('mapping-urusan', <MappingUrusanInstansi initialTab="urusan" />);
      case 'mapping-kegiatan':
        return renderProtectedPage('mapping-kegiatan', <MappingUrusanInstansi initialTab="kegiatan" />);
      case 'mapping-instansi':
        return renderProtectedPage('mapping-instansi', <MappingUrusanInstansi initialTab="bidang" />);
      case 'mapping-sektor':
        return renderProtectedPage('mapping-sektor', <MappingUrusanInstansi initialTab="sektor" />);
      case 'kegiatan-per-orang':
        return renderModule(<ManajemenKegiatan initialTab="logbook" onTabChange={(tab) => setCurrentPage(tab === 'logbook' ? 'kegiatan-per-orang' : tab === 'rekap' ? 'rekap-kegiatan' : tab === 'draft' ? 'draft-jadwal' : 'isi-kegiatan')} />);
      case 'rekap-kegiatan':
        return renderModule(<ManajemenKegiatan initialTab="rekap" onTabChange={(tab) => setCurrentPage(tab === 'logbook' ? 'kegiatan-per-orang' : tab === 'rekap' ? 'rekap-kegiatan' : tab === 'draft' ? 'draft-jadwal' : 'isi-kegiatan')} />);
      case 'isi-kegiatan':
        return renderModule(<ManajemenKegiatan initialTab="daftar" onTabChange={(tab) => setCurrentPage(tab === 'logbook' ? 'kegiatan-per-orang' : tab === 'rekap' ? 'rekap-kegiatan' : tab === 'draft' ? 'draft-jadwal' : 'isi-kegiatan')} />);
      case 'draft-jadwal':
        return renderModule(<ManajemenKegiatan initialTab="draft" onTabChange={(tab) => setCurrentPage(tab === 'logbook' ? 'kegiatan-per-orang' : tab === 'rekap' ? 'rekap-kegiatan' : tab === 'draft' ? 'draft-jadwal' : 'isi-kegiatan')} />);
      case 'manajemen-kegiatan':
        return renderModule(<ManajemenKegiatan initialTab={(params.get('tab') as any) || 'draft'} onTabChange={(tab) => setCurrentPage(tab === 'logbook' ? 'kegiatan-per-orang' : tab === 'rekap' ? 'rekap-kegiatan' : tab === 'draft' ? 'draft-jadwal' : 'isi-kegiatan')} />);
      case 'manajemen-dokumen':
        return renderModule(<ManajemenDokumen />);
      case 'manajemen-surat':
        return renderModule(<ManajemenSurat onNavigate={(page) => setCurrentPage(page)} />);
      case 'surat-maker':
        return renderModule(<SuratMaker onNavigate={(page) => setCurrentPage(page)} />);
      case 'pengaturan-surat':
        return renderProtectedPage('pengaturan-surat', <PengaturanSurat />);
      case 'pengaturan-notulen':
        return renderProtectedPage('pengaturan-notulen', <PengaturanNotulen />);
      case 'pengaturan-penomoran':
        return renderProtectedPage('pengaturan-penomoran', <PengaturanPenomoran />);
      case 'notulen-maker':
        return renderModule(<NotulenMaker onNavigate={(page) => setCurrentPage(page)} initialKegiatanId={Number(params.get('kegiatan_id')) || undefined} />);
      case 'isi-kegiatan':
        return renderModule(<ManajemenKegiatan initialTab="daftar" onTabChange={(tab) => setCurrentPage(tab === 'logbook' ? 'kegiatan-per-orang' : tab === 'rekap' ? 'rekap-kegiatan' : 'isi-kegiatan')} />);
      case 'profil-saya':
        return renderModule(<PegawaiProfil />);
      case 'skp':
        return renderModule(<SkpSummary />);
      case 'kks':
        return (
          <Suspense fallback={<div className="flex items-center justify-center min-h-[60vh] text-slate-400 font-bold">Memuat Portal KKS...</div>}>
            <KksApp onExitToSamp={() => setCurrentPage('dashboard')} />
          </Suspense>
        );
      case 'dashboard':
        return renderModule(
          <>
            {/* Header - Desktop stats */}
            <div className="flex justify-center sm:justify-start mb-6">
              <div 
                onClick={() => setCurrentPage('manajemen-pegawai')}
                className="w-full sm:w-auto bg-white rounded-2xl p-3.5 px-4 flex items-center gap-3.5 shadow-sm border border-slate-100 hover:border-ppm-slate-light/40 hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 cursor-pointer select-none group"
              >
                <div className="w-9 h-9 bg-ppm-slate-light/10 rounded-xl flex items-center justify-center text-ppm-slate-light shrink-0 group-hover:bg-ppm-slate-light group-hover:text-white transition-all duration-300">
                  <Users size={16} strokeWidth={2.5} />
                </div>
                <div>
                  <div className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest mb-0.5 group-hover:text-ppm-slate-light transition-colors">Total Personil</div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-lg font-black text-slate-800 tabular-nums">
                      {totalPersonil !== null ? totalPersonil : '...'}
                    </span>
                    <span className="text-[10px] font-bold text-slate-500">
                      Pegawai {user?.bidang_singkatan || 'Instansi'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-12 gap-6 mb-6">
              <div className="col-span-12 lg:col-span-7">
                <MacroDataTable />
              </div>
              <div className="col-span-12 lg:col-span-5">
                <RecentNotesTable />
              </div>
            </div>

            {/* Middle Section: Unified Quick Access & Work Links Directory */}
            <div className="grid grid-cols-12 gap-6 mb-6">
              <div className="col-span-12 lg:col-span-5">
                <UnifiedQuickAccessCard />
              </div>
              <div className="col-span-12 lg:col-span-7">
                <WorkLinksTable />
              </div>
            </div>
          </>
        );

      default:
        // Check if current page is a generated page fallback
        const genPage = generatedPages.find(p => p.slug === currentPage);
        if (genPage) {
          return <DynamicTablePage title={genPage.title} tableName={genPage.table_name} />;
        }
        return null;
    }
  };

  // Handle Public Verification Page (No Auth Required)
  if (verifySlug) {
    console.log('[App] Rendering VerifyDocument for slug:', verifySlug);
    return (
      <div id="verify-document-container" className="min-h-screen bg-slate-50">
        <VerifyDocument slug={verifySlug} />
      </div>
    );
  }

  const viewPublicDocs = params.get('view_public_docs') === 'true';
  const isPublicSkp = params.get('public_skp') === 'true';

  if (viewPublicDocs) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Suspense fallback={<div className="flex items-center justify-center min-h-screen text-slate-400">Memuat...</div>}>
          <VerifySkpDocuments />
        </Suspense>
      </div>
    );
  }

  if (isPublicSkp) {
    return (
      <div className="min-h-screen bg-slate-50">
        <SkpSummary isPublic={true} />
      </div>
    );
  }

  // Handle KKS Standalone / Public Portal (dapat diakses publik tanpa login wajib)
  const isKks = isKksPath || currentPage === 'kks' || params.get('page') === 'kks';
  if (isKks) {
    return (
      <Suspense fallback={
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 text-slate-500 gap-3">
          <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-bold tracking-wide">Memuat Portal Kabupaten Kota Sehat (KKS)...</p>
        </div>
      }>
        <KksApp 
          initialTab={(params.get('tab') as any) || 'dashboard'}
          onExitToSamp={() => {
            if (window.location.pathname.startsWith('/kks')) {
              window.history.pushState({}, '', '/');
            }
            setCurrentPage('dashboard');
          }} 
        />
      </Suspense>
    );
  }

  if (!isAuthenticated) {
    return (
      <Login />
    );
  }

  // Handle Fullscreen Pages (e.g., Bagan Organisasi, Draft Jadwal Fullscreen)
  if (currentPage === 'bagan-organisasi') {
    return (
      <LabelProvider>
        <div className="bg-ppm-bg min-h-screen">
          <Suspense fallback={null}>
            <InternalInstansi />
          </Suspense>
        </div>
      </LabelProvider>
    );
  }

  if (isFullscreenDraft) {
    return (
      <LabelProvider>
        <div className="bg-slate-50 min-h-screen">
          <Suspense fallback={
            <div className="fixed inset-0 z-[9999] bg-slate-50 flex flex-col items-center justify-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ppm-blue"></div>
              <span className="text-xs font-bold text-slate-500">Mempersiapkan rincian jadwal kegiatan...</span>
            </div>
          }>
            <ManajemenKegiatan initialTab="draft" />
          </Suspense>
        </div>
      </LabelProvider>
    );
  }

  const ownAlerts = activeAlerts.filter((a: any) => a.type === 'own_unsubmitted');
  const staffAlerts = activeAlerts.filter((a: any) => a.type === 'staff_unsubmitted');
  
  const alertTexts: string[] = [];
  if (ownAlerts.length > 0) {
    const months = Array.from(new Set(ownAlerts.map((a: any) => `${a.monthName} ${a.year}`)));
    if (months.length <= 2) {
      alertTexts.push(`SKP ${months.join(', ')}`);
    } else {
      alertTexts.push(`SKP ${months[0]} dan ${months.length - 1} bulan lainnya`);
    }
  }
  if (staffAlerts.length > 0) {
    const staffMonths = Array.from(new Set(staffAlerts.map((a: any) => `${a.monthName} ${a.year}`)));
    if (staffMonths.length <= 2) {
      alertTexts.push(`Tunggakan Staff ${staffMonths.join(', ')}`);
    } else {
      alertTexts.push(`Tunggakan Staff ${staffMonths[0]} dan ${staffMonths.length - 1} bulan lainnya`);
    }
  }
  const activeAlertsText = alertTexts.join(', ');

  return (
    <LabelProvider>
      <div className="flex h-screen bg-ppm-bg relative overflow-hidden">
        <Sidebar
          currentPage={currentPage}
          onNavigate={(page) => {
            setCurrentPage(page);
            window.dispatchEvent(new CustomEvent('nayaxa-action', { detail: { type: 'collapse' } }));
          }}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />

        <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden relative">
          {/* Siluet Huruf B Bapperida sebagai Watermark Latar Halaman Konten */}
          <BapperidaContentWatermark />

          <header className="p-2.5 sm:p-3 px-4 flex items-center justify-between sticky top-0 z-30 transition-all duration-300 shrink-0 border-b border-slate-200/80 relative overflow-hidden backdrop-blur-md">
            {/* Latar Belakang Motif Batik Nusantara Dinamis Berdasarkan Warna Tema Aktif */}
            <BatikTopNavBackground />

            {/* Siluet garis melengkung huruf b khas Bapperida di header */}
            <BapperidaCurvesHeader className="opacity-35" />

            <div className="flex items-center gap-2.5 relative z-10">
              {/* Brand logo Bapperida huruf 'b' di mobile/PWA */}
              <div 
                className="lg:hidden flex items-center gap-2 select-none cursor-pointer active:scale-95 transition-all"
                onClick={() => {
                  setCurrentPage('dashboard');
                }}
                title="Kembali ke Beranda"
              >
                <BapperidaSymbol size={26} />
                <div className="flex flex-col">
                  <span className="font-black text-xs tracking-tight text-slate-800 leading-none">
                    BAPPERIDA
                  </span>
                  <span className="text-[9px] font-bold text-slate-400 leading-none mt-0.5 tracking-wider">
                    KABUPATEN BOGOR
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-4 relative z-10">
              <button
                onClick={() => window.dispatchEvent(new CustomEvent('samp-toggle-todo'))}
                className="hidden lg:flex items-center gap-1.5 sm:gap-2 px-2.5 py-1.5 bg-white/75 hover:bg-white border border-slate-200/70 shadow-2xs hover:shadow-xs transition-all active:scale-95 group rounded-xl cursor-pointer relative"
                title={`To Do List (${todoPendingCount} tugas belum selesai)`}
              >
                <div className="relative">
                  <Icons.CheckSquare size={17} className="text-slate-800 group-hover:rotate-12 transition-transform" strokeWidth={1.8} />
                </div>

                <div className="flex flex-col items-center justify-center">
                  <span className="text-[9px] font-bold uppercase tracking-wider leading-none mb-[2px] text-slate-500">To Do</span>
                  <span className="text-xs font-black uppercase tracking-wider leading-none text-slate-800">List</span>
                </div>

                {/* Balon notifikasi di atas tombol to do list */}
                {todoPendingCount > 0 && (
                  <span className="flex absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-rose-600 text-white text-[9px] font-black items-center justify-center rounded-full border-2 border-white leading-none shadow-xs tabular-nums select-none">
                    {todoPendingCount > 99 ? '99+' : todoPendingCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => setCurrentPage('surat-maker')}
                className="hidden lg:flex items-center gap-2 px-2.5 py-1.5 bg-white/75 hover:bg-white border border-slate-200/70 shadow-2xs hover:shadow-xs transition-all active:scale-95 group rounded-xl"
                title="Buat Surat Baru"
              >
                <Icons.Mail size={17} className="text-slate-800 group-hover:rotate-12 transition-transform" strokeWidth={1.6} />
                <div className="flex flex-col items-center justify-center">
                  <span className="text-[9px] font-bold uppercase tracking-wider leading-none mb-[2px] text-slate-500">Buat</span>
                  <span className="text-xs font-black uppercase tracking-wider leading-none text-slate-800">Surat</span>
                </div>
              </button>
              
              <button
                onClick={() => setCurrentPage('notulen-maker')}
                className="hidden lg:flex items-center gap-2 px-2.5 py-1.5 bg-white/75 hover:bg-white border border-slate-200/70 shadow-2xs hover:shadow-xs transition-all active:scale-95 group rounded-xl"
                title="Buat Laporan Baru"
              >
                <Icons.BookOpen size={17} className="text-slate-800 group-hover:rotate-12 transition-transform" strokeWidth={1.6} />
                <div className="flex flex-col items-center justify-center">
                  <span className="text-[9px] font-bold uppercase tracking-wider leading-none mb-[2px] text-slate-500">Buat</span>
                  <span className="text-xs font-black uppercase tracking-wider leading-none text-slate-800">Laporan</span>
                </div>
              </button>

              <div className="hidden lg:block w-px h-7 bg-slate-300/80 mx-1 rounded-full"></div>

              <div className="text-right min-w-0">
                <div className="font-semibold text-gray-800 text-xs sm:text-sm truncate max-w-[120px] md:max-w-[200px] lg:max-w-[300px]">
                  {user?.nama_lengkap}
                </div>
                <div className="text-[10px] sm:text-xs text-gray-500 truncate">
                  {user?.instansi_singkatan ||
                    (user?.instansi_nama?.toLowerCase().includes('badan perencanaan')
                      ? 'Bapperida'
                      : user?.instansi_nama?.replace(/admin/gi, '').trim()) ||
                    user?.tipe_user_nama}
                </div>
              </div>
              
              <div className="hidden lg:block">
                <Suspense fallback={<div className="w-8 h-8 rounded-full bg-slate-100 animate-pulse" />}>
                  <ApprovalNotification onOpenInbox={() => setIsInboxOpen(true)} />
                </Suspense>
              </div>

              <button
                onClick={() => { logout(); window.dispatchEvent(new CustomEvent('nayaxa-action', { detail: { type: 'reset' } })); }}
                className="text-xs font-semibold bg-red-50 text-red-600 px-3 py-1.5 rounded-md hover:bg-red-100 transition-colors"
              >
                Logout
              </button>
            </div>
          </header>

          <main className={`flex-1 overflow-y-auto w-full transition-all duration-300 relative z-10 ${['isi-kegiatan', 'kegiatan-per-orang', 'rekap-kegiatan', 'draft-jadwal', 'manajemen-dokumen', 'manajemen-surat', 'rpjpd'].includes(currentPage) ? 'p-0 pb-24 lg:pb-0' : 'px-4 lg:px-6 pt-2.5 lg:pt-3.5 pb-24 lg:pb-6'}`}>
            <div className="max-w-[1920px] mx-auto w-full">
              {activeAlerts.length > 0 && (
                <div className="mb-3 p-4 bg-gradient-to-r from-rose-900 to-rose-950/95 border border-rose-500/30 text-white rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md shadow-rose-950/10 relative overflow-hidden">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(244,63,94,0.15),transparent)] pointer-events-none" />
                  <div className="flex items-center gap-3 z-10 min-w-0">
                    <div className="w-7 h-7 bg-rose-500/20 border border-rose-500/30 rounded-xl flex items-center justify-center text-rose-400 shrink-0">
                      <Icons.AlertTriangle className="animate-pulse text-rose-400" size={15} />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[10px] font-black uppercase tracking-wider text-rose-200 block leading-tight">Peringatan Administrasi</span>
                      <p className="text-xs font-semibold text-white truncate">
                        Anda memiliki <strong>{activeAlerts.length} tugas</strong> belum lengkap ({activeAlertsText}).
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsInboxOpen(true)}
                    className="z-10 shrink-0 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-sm active:scale-[0.98]"
                  >
                    Buka Kotak Masuk
                  </button>
                </div>
              )}
              {renderContent()}
            </div>
          </main>
        </div>
        <Suspense fallback={null}>
          <NayaxaAssistant mode="nayaxa" />
        </Suspense>
        <Suspense fallback={null}>
          <DraggableTodoListWidget />
        </Suspense>
        <Suspense fallback={null}>
          <ApprovalInboxModal isOpen={isInboxOpen} onClose={() => setIsInboxOpen(false)} />
        </Suspense>
        <MobileBottomNav
          currentPage={currentPage}
          onNavigate={(page) => {
            setCurrentPage(page);
            window.dispatchEvent(new CustomEvent('nayaxa-action', { detail: { type: 'collapse' } }));
          }}
          todoPendingCount={todoPendingCount}
          onOpenInbox={() => setIsInboxOpen(true)}
        />
      </div>
    </LabelProvider>
  );
}
