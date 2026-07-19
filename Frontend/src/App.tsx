import React, { useState, useEffect, lazy, Suspense } from 'react';
import ErrorBoundary from './features/common/components/ErrorBoundary';

import * as Icons from 'lucide-react';
import { Menu, Users } from 'lucide-react';
import Sidebar from './features/layout/components/Sidebar';
const MacroDataTable = lazy(() => import('./features/planning/components/MacroDataTable'));
const RecentNotesTable = lazy(() => import('./features/system/components/RecentNotesTable'));
const WorkLinksTable = lazy(() => import('./features/system/components/WorkLinksTable'));
const LinkListCard = lazy(() => import('./features/system/components/LinkListCard'));
const MasterTahun = lazy(() => import('./features/regional/components/MasterTahun'));
const MasterTematik = lazy(() => import('./features/planning/components/MasterTematik'));
const MasterAplikasiExternal = lazy(() => import('./features/system/components/MasterAplikasiExternal'));
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
const AuditTrail = lazy(() => import('./features/system/components/AuditTrail'));
const ManajemenUser = lazy(() => import('./features/auth/components/ManajemenUser'));
const ManajemenHakAkses = lazy(() => import('./features/auth/components/ManajemenHakAkses'));
const PegawaiProfil = lazy(() => import('./features/auth/components/PegawaiProfil'));
const ManajemenPegawai = lazy(() => import('./features/auth/components/ManajemenPegawai'));
const ManajemenEsign = lazy(() => import('./features/auth/components/ManajemenEsign'));
const InternalInstansi = lazy(() => import('./features/regional/components/InternalInstansi'));
const MappingUrusanInstansi = lazy(() => import('./features/planning/components/MappingUrusanInstansi'));
const MasterTipeKegiatan = lazy(() => import('./features/activity/components/MasterTipeKegiatan'));
const ImportPerencanaan = lazy(() => import('./features/planning/components/ImportPerencanaan'));
const RpjpdInputPage = lazy(() => import('./features/planning/components/RpjpdInputPage'));
const NayaxaAssistant = lazy(() => import('./features/ai/components/NayaxaAssistant'));
const NayaxaKnowledge = lazy(() => import('./features/ai/components/NayaxaKnowledge'));
const KelolaAplikasi = lazy(() => import('./features/system/components/KelolaAplikasi'));
const MonitorAI = lazy(() => import('./features/system/components/MonitorAI'));
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
const ApprovalInboxModal = lazy(() => import('./features/correspondence/components/ApprovalInboxModal'));
const PengaturanNotulen = lazy(() => import('./features/activity/components/PengaturanNotulen'));
const NotulenMaker = lazy(() => import('./features/activity/components/NotulenMaker'));
const SkpSummary = lazy(() => import('./features/auth/components/SkpSummary'));



import { LabelProvider } from './contexts/LabelContext';
import { api } from './services/api';
import { Login } from './features/auth/components/Login';
import { useAuth } from './contexts/AuthContext';

export default function App() {
  const { isAuthenticated, user, logout } = useAuth();
  const params = new URLSearchParams(window.location.search);
  const verifySlug = params.get('v');

  const [currentPage, setCurrentPage] = useState(() => {
    if (verifySlug) return 'verify-document';
    return params.get('page') || 'dashboard';
  });

  useEffect(() => {
    const url = new URL(window.location.href);
    if (currentPage !== 'dashboard') {
      url.searchParams.set('page', currentPage);
    } else {
      url.searchParams.delete('page');
    }
    window.history.pushState({}, '', url);
  }, [currentPage]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isInboxOpen, setIsInboxOpen] = useState(false);
  const [generatedPages, setGeneratedPages] = useState<{ title: string, slug: string, table_name: string }[]>([]);
  const [allowedActionPages, setAllowedActionPages] = useState<string[]>([]);
  const [isLoadingAccess, setIsLoadingAccess] = useState(true);

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
          const res = await api.rbac.getRoleAccess(user.tipe_user_id);
          if (res.success) {
            const menuRes = await api.menu.getAll();
            if (menuRes.success) {
              const allowedMenus = menuRes.data.filter((m: any) => res.data.includes(m.id) && m.action_page);
              setAllowedActionPages(allowedMenus.map((m: any) => m.action_page));
            }
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

  const renderContent = () => {

    // Dynamic RBAC Protection for certain sensitive pages
    const isSuperAdmin = user?.tipe_user_id === 1;

    const hasAccess = (pageSlug: string) => {
      if (isSuperAdmin) return true;
      // While RBAC is still loading, show loading indicator instead of denying access
      if (isLoadingAccess) return 'loading';
      return allowedActionPages.includes(pageSlug);
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
      case 'rpjpd':
        return renderModule(<RpjpdInputPage />);
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
      case 'monitor-ai':
        return renderProtectedPage('monitor-ai', <MonitorAI />);
      case 'petunjuk-teknis':
        return renderProtectedPage('petunjuk-teknis', <PetunjukTeknis />);
      case 'pengaturan-tema':
        return renderProtectedPage('pengaturan-tema', <PengaturanTema />);
      case 'audit-trail':
        return renderProtectedPage('audit-trail', <AuditTrail />);
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
        return renderModule(<ManajemenKegiatan initialTab="logbook" onTabChange={(tab) => setCurrentPage(tab === 'logbook' ? 'kegiatan-per-orang' : 'isi-kegiatan')} />);
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
        return renderModule(<ManajemenKegiatan initialTab="daftar" onTabChange={(tab) => setCurrentPage(tab === 'logbook' ? 'kegiatan-per-orang' : 'isi-kegiatan')} />);
      case 'profil-saya':
        return renderModule(<PegawaiProfil />);
      case 'skp':
        return renderModule(<SkpSummary />);
      case 'dashboard':
        return renderModule(
          <>
            {/* Header - Desktop stats */}
            <div className="flex justify-center sm:justify-start mb-8">
              <div className="w-full sm:w-auto bg-white rounded-3xl p-5 px-6 flex items-center gap-4 sm:gap-6 shadow-xl shadow-slate-200/50 border border-slate-100/60 hover:-translate-y-1 transition-all duration-300">
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-ppm-slate/5 rounded-2xl flex items-center justify-center text-ppm-slate shrink-0">
                  <Users size={24} strokeWidth={2.5} />
                </div>
                <div>
                  <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1">Total Personil</div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl sm:text-3xl font-black text-slate-800 tabular-nums">18</span>
                    <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 leading-tight">
                      Pegawai PPM + Driver<br className="hidden sm:block" /> + OB
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

            {/* Middle Section: Link Lists and Work Links */}
            <div className="grid grid-cols-12 gap-6 mb-6">
              <div className="col-span-12 lg:col-span-3">
                <LinkListCard
                  title="PROGRAM SEKTORAL / LINTAS SEKTOR / TEMATIK / PUSAT"
                  links={[
                    { label: 'Kemiskinan dan Kemiskinan Ekstrem', href: '#' },
                    { label: 'Stunting', href: '#' },
                    { label: 'KLA', href: '#' },
                    { label: 'Smart City', href: '#' },
                    { label: 'SPM', href: '#' },
                  ]}
                />
              </div>
              <div className="col-span-12 lg:col-span-3">
                <LinkListCard
                  title="QUICK ACCESS"
                  links={[
                    { label: 'Sarpras Puskesmas dan Pustu', href: '#' },
                    { label: 'Sarpras Pendidikan', href: '#' },
                    { label: 'Gambaran Umum Data Pendidikan Kab Bogor -> PENTA Disdik', href: '#' },
                    { label: 'DAK -> KRISNA', href: '#' },
                    { label: 'Drive Setda - SAKIP & RB', href: '#' },
                    { label: 'Masterplan Kesehatan 2025-2029', href: '#' },
                    { label: 'UHC - Dataviz BPJS', href: '#' },
                    { label: 'e-SPM', href: '#' },
                  ]}
                />
              </div>
              <div className="col-span-12 lg:col-span-6">
                <WorkLinksTable />
              </div>
            </div>

            {/* Bottom Section: More Link Lists and Urusan */}
            <div className="grid grid-cols-12 gap-6">
              <div className="col-span-12 lg:col-span-3">
                <LinkListCard
                  title="KEY NOTE PERENCANAAN"
                  links={[
                    { label: 'Jadwal Perencanaan 2025', href: '#' },
                    { label: 'Janji Bupati 2025-2029', href: '#' },
                    { label: 'Cascading RPJMD 2025-2029', href: '#' },
                    { label: 'Asta Cita Presiden', href: '#' },
                    { label: 'Target Makro RPJMD 2025 - 2029', href: '#' },
                  ]}
                />
              </div>
              <div className="col-span-12 lg:col-span-3">
                <LinkListCard
                  title="QUICK ACCESS DATA PPM"
                  links={[
                    { label: 'Rekap Kegiatan Per Orang 2026', href: '#' },
                    { label: 'Foto ID Pegawai Bappedalitbang', href: '#' },
                    { label: 'Foto ID Pegawai PPM', href: '#' },
                    { label: 'DPA PPM 2026', href: '#' },
                    { label: 'Realisasi 2026', href: '#' },
                    { label: 'Foto-Foto Kegiatan', href: '#' },
                    { label: 'Daftar Email Terkait PPM', href: '#' },
                    { label: 'KAK', href: '#' },
                  ]}
                />
              </div>
              <div className="col-span-12 lg:col-span-6">
                <div className="card-modern h-full flex flex-col">
                  <div className="px-5 py-4 border-b border-slate-50">
                    <h2 className="text-sm font-extrabold text-slate-800 tracking-tight uppercase text-center">URUSAN</h2>
                  </div>
                  <div className="flex-1 overflow-x-auto p-4 pt-2">
                    <div className="rounded-xl border border-slate-100 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.02)] overflow-hidden">
                      <table className="w-full text-xs">
                        <tbody className="bg-white">
                          <tr className="hover:bg-slate-50/80 transition-colors border-b border-slate-50 group/row">
                            <td className="p-3 text-slate-700 font-semibold leading-snug">Pendidikan</td>
                          </tr>
                          <tr className="hover:bg-slate-50/80 transition-colors border-b border-slate-50 group/row">
                            <td className="p-3 text-slate-700 font-semibold leading-snug">Kesehatan</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
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

  if (!isAuthenticated) {
    return (
      <Login />
    );
  }

  // Handle Fullscreen Pages (e.g., Bagan Organisasi)
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

        <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
          <header className="bg-white p-3 px-4 flex items-center justify-between sticky top-0 z-30 transition-all duration-300 shrink-0 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="lg:hidden p-2 rounded-xl text-slate-500 hover:bg-slate-100 transition-colors"
                title="Buka Menu"
              >
                <Menu size={24} />
              </button>
            </div>

            <div className="flex items-center gap-2 sm:gap-4 overflow-hidden">
              <button
                onClick={() => setCurrentPage('surat-maker')}
                className="hidden md:flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 transition-all active:scale-95 group rounded-md"
                title="Buat Surat Baru"
              >
                <Icons.Mail size={18} className="text-black group-hover:rotate-12 transition-transform" strokeWidth={1.5} />
                <div className="flex flex-col items-center justify-center text-black">
                  <span className="text-[9px] font-semibold uppercase tracking-wider leading-none mb-[2px]">Buat</span>
                  <span className="text-xs font-black uppercase tracking-wider leading-none">Surat</span>
                </div>
              </button>
              
              <button
                onClick={() => setCurrentPage('notulen-maker')}
                className="hidden md:flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 transition-all active:scale-95 group rounded-md"
                title="Buat Laporan Baru"
              >
                <Icons.BookOpen size={18} className="text-black group-hover:rotate-12 transition-transform" strokeWidth={1.5} />
                <div className="flex flex-col items-center justify-center text-black">
                  <span className="text-[9px] font-semibold uppercase tracking-wider leading-none mb-[2px]">Buat</span>
                  <span className="text-xs font-black uppercase tracking-wider leading-none">Laporan</span>
                </div>
              </button>

              <div className="hidden md:block w-px h-8 bg-black/20 mx-1 rounded-full"></div>

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
              
              <Suspense fallback={<div className="w-8 h-8 rounded-full bg-slate-100 animate-pulse" />}>
                <ApprovalNotification onOpenInbox={() => setIsInboxOpen(true)} />
              </Suspense>

              <button
                onClick={() => { logout(); window.dispatchEvent(new CustomEvent('nayaxa-action', { detail: { type: 'reset' } })); }}
                className="text-xs font-semibold bg-red-50 text-red-600 px-3 py-1.5 rounded-md hover:bg-red-100 transition-colors"
              >
                Logout
              </button>
            </div>
          </header>

          <main className={`flex-1 overflow-y-auto w-full transition-all duration-300 ${['isi-kegiatan', 'kegiatan-per-orang', 'manajemen-dokumen', 'manajemen-surat'].includes(currentPage) ? 'p-0' : 'p-4 lg:p-6'}`}>
            <div className="max-w-[1920px] mx-auto w-full">
              {renderContent()}
            </div>
          </main>
        </div>
        <Suspense fallback={null}>
          <NayaxaAssistant />
        </Suspense>
        <Suspense fallback={null}>
          <ApprovalInboxModal isOpen={isInboxOpen} onClose={() => setIsInboxOpen(false)} />
        </Suspense>
      </div>
    </LabelProvider>
  );
}
