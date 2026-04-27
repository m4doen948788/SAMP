import React, { useState } from 'react';
import { Menu, Users } from 'lucide-react';
import Sidebar from './features/layout/components/Sidebar';
import MacroDataTable from './features/planning/components/MacroDataTable';
import RecentNotesTable from './features/system/components/RecentNotesTable';
import WorkLinksTable from './features/system/components/WorkLinksTable';
import LinkListCard from './features/system/components/LinkListCard';
import MasterTahun from './features/regional/components/MasterTahun';
import MasterTematik from './features/planning/components/MasterTematik';
import MasterAplikasiExternal from './features/system/components/MasterAplikasiExternal';
import KelolaMenu from './features/system/components/KelolaMenu';
import MasterBidangUrusan from './features/planning/components/MasterBidangUrusan';
import MasterInstansiDaerah from './features/regional/components/MasterInstansiDaerah';
import MasterBidang from './features/planning/components/MasterBidang';
import MasterBidangInstansi from './features/regional/components/MasterBidangInstansi';
import BuatMasterData from './features/planning/components/BuatMasterData';
import MasterJenisDokumen from './features/correspondence/components/MasterJenisDokumen';
import MasterJenisKegiatan from './features/activity/components/MasterJenisKegiatan';
import MasterJenisPegawai from './features/auth/components/MasterJenisPegawai';
import MasterPangkatGolongan from './features/auth/components/MasterPangkatGolongan';
import TableLabelManager from './features/planning/components/TableLabelManager';
import GeneratorHalaman from './features/system/components/GeneratorHalaman';
import PetunjukTeknis from './features/system/components/PetunjukTeknis';
import DynamicTablePage from './features/system/components/DynamicTablePage';
import PengaturanTema from './features/system/components/PengaturanTema';
import ManajemenUser from './features/auth/components/ManajemenUser';
import ManajemenHakAkses from './features/auth/components/ManajemenHakAkses';
import PegawaiProfil from './features/auth/components/PegawaiProfil';
import ManajemenPegawai from './features/auth/components/ManajemenPegawai';
import InternalInstansi from './features/regional/components/InternalInstansi';
import MappingUrusanInstansi from './features/planning/components/MappingUrusanInstansi';

import MasterTipeKegiatan from './features/activity/components/MasterTipeKegiatan';
import ImportPerencanaan from './features/planning/components/ImportPerencanaan';
import NayaxaAssistant from './features/ai/components/NayaxaAssistant';
import NayaxaKnowledge from './features/ai/components/NayaxaKnowledge';
import KelolaAplikasi from './features/system/components/KelolaAplikasi';
import DataMakro from './features/planning/components/DataMakro';
import SettingDataMakro from './features/planning/components/SettingDataMakro';
import ManajemenDokumen from './features/correspondence/components/ManajemenDokumen';
import ManajemenKegiatan from './features/activity/components/ManajemenKegiatan';
import ManajemenSurat from './features/correspondence/components/ManajemenSurat';
import SuratMaker from './features/correspondence/components/SuratMaker';
import PengaturanSurat from './features/correspondence/components/PengaturanSurat';
import PengaturanPenomoran from './features/correspondence/components/PengaturanPenomoran';
import { LabelProvider } from './contexts/LabelContext';
import { api } from './services/api';
import { useEffect } from 'react';
import { Login } from './features/auth/components/Login';
import { useAuth } from './contexts/AuthContext';

export default function App() {
  const { isAuthenticated, user, logout } = useAuth();
  const [currentPage, setCurrentPage] = useState(() => {
    const params = new URLSearchParams(window.location.search);
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
  const [generatedPages, setGeneratedPages] = useState<{ title: string, slug: string, table_name: string }[]>([]);
  const [allowedActionPages, setAllowedActionPages] = useState<string[]>([]);
  const [isLoadingAccess, setIsLoadingAccess] = useState(true);

  useEffect(() => {
    api.generatedPages.getAll().then(res => {
      if (res.success) setGeneratedPages(res.data);
    }).catch(err => console.error('Failed to load generated pages:', err));
  }, []);

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
      return access ? component : <div className="p-8 text-center text-red-500">Access Denied</div>;
    };

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
        return renderProtectedPage('kelola-aplikasi', <KelolaAplikasi />);
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
        return <ManajemenKegiatan initialTab="logbook" onTabChange={(tab) => setCurrentPage(tab === 'logbook' ? 'kegiatan-per-orang' : 'isi-kegiatan')} />;
      case 'manajemen-dokumen':
        return <ManajemenDokumen />;
      case 'manajemen-surat':
        return <ManajemenSurat onNavigate={(page) => setCurrentPage(page)} />;
      case 'surat-maker':
        return <SuratMaker />;
      case 'pengaturan-surat':
        return renderProtectedPage('pengaturan-surat', <PengaturanSurat />);
      case 'pengaturan-penomoran':
        return renderProtectedPage('pengaturan-penomoran', <PengaturanPenomoran />);
      case 'isi-kegiatan':
        return <ManajemenKegiatan initialTab="daftar" onTabChange={(tab) => setCurrentPage(tab === 'logbook' ? 'kegiatan-per-orang' : 'isi-kegiatan')} />;
      case 'profil-saya':
        return <PegawaiProfil />;
      case 'dashboard':
        return (
          <>
            {/* Header - Desktop stats */}
            <div className="flex justify-center sm:justify-start mb-8">
              <div className="w-full sm:w-auto bg-white rounded-3xl p-5 px-6 flex items-center gap-4 sm:gap-6 shadow-xl shadow-slate-200/50 border border-slate-100/60 hover:-translate-y-1 transition-all duration-300">
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-ppm-slate/5 rounded-2xl flex items-center justify-center text-ppm-slate shrink-0">
                  <Users size={24} sm:size={28} strokeWidth={2.5} />
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
          <InternalInstansi />
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
        <NayaxaAssistant />
      </div>
    </LabelProvider>
  );
}
