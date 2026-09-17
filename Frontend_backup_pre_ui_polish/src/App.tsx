import { useState } from 'react';
import { Menu } from 'lucide-react';
import Sidebar from './components/Sidebar';
import MacroDataTable from './components/MacroDataTable';
import RecentNotesTable from './components/RecentNotesTable';
import WorkLinksTable from './components/WorkLinksTable';
import LinkListCard from './components/LinkListCard';
import MasterTahun from './components/MasterTahun';
import MasterTematik from './components/MasterTematik';
import MasterAplikasiExternal from './components/MasterAplikasiExternal';
import KelolaMenu from './components/KelolaMenu';
import MasterUrusan from './components/MasterUrusan';
import MasterInstansiDaerah from './components/MasterInstansiDaerah';
import MasterBidang from './components/MasterBidang';
import BuatMasterData from './components/BuatMasterData';
import MasterJenisDokumen from './components/MasterJenisDokumen';
import MasterJenisKegiatan from './components/MasterJenisKegiatan';
import MasterJenisPegawai from './components/MasterJenisPegawai';
import TableLabelManager from './components/TableLabelManager';
import GeneratorHalaman from './components/GeneratorHalaman';
import PetunjukTeknis from './components/PetunjukTeknis';
import DynamicTablePage from './components/DynamicTablePage';
import { LabelProvider } from './contexts/LabelContext';
import { api } from './services/api';
import { useEffect } from 'react';

export default function App() {
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

  useEffect(() => {
    api.generatedPages.getAll().then(res => {
      if (res.success) setGeneratedPages(res.data);
    });
  }, []);

  const renderContent = () => {
    switch (currentPage) {
      case 'master-tahun':
        return <MasterTahun />;
      case 'master-tematik':
        return <MasterTematik />;
      case 'master-aplikasi-external':
        return <MasterAplikasiExternal />;
      case 'kelola-menu':
        return <KelolaMenu />;
      case 'master-urusan':
        return <MasterUrusan />;
      case 'master-instansi-daerah':
        return <MasterInstansiDaerah />;
      case 'master-bidang':
        return <MasterBidang />;
      case 'master-jenis-dokumen':
        return <MasterJenisDokumen />;
      case 'master-jenis-kegiatan':
        return <MasterJenisKegiatan />;
      case 'master-jenis-pegawai':
        return <MasterJenisPegawai />;
      case 'pelabelan-tabel':
        return <TableLabelManager />;
      case 'buat-master-data':
        return <BuatMasterData />;
      case 'generator-halaman':
        return <GeneratorHalaman />;
      case 'petunjuk-teknis':
        return <PetunjukTeknis />;
      case 'dashboard':
        return (
          <>
            {/* Header - Desktop stats */}
            <div className="flex justify-start mb-6">
              <div className="bg-white border-2 border-ppm-green p-2 flex items-center gap-4 shadow-sm">
                <a href="#" className="text-ppm-green text-[11px] font-bold underline leading-tight">
                  Jumlah Pegawai PPM + Driver<br />+ OB
                </a>
                <span className="text-3xl font-black text-ppm-green">18</span>
              </div>
            </div>

            {/* Top Section: Macro Data and Recent Notes */}
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
                <div className="bg-white shadow-sm border border-slate-200 h-full">
                  <div className="card-title text-center">URUSAN</div>
                  <div className="p-0 overflow-x-auto">
                    <table className="w-full text-[10px]">
                      <tbody>
                        <tr className="border-b border-slate-100">
                          <td className="p-2 whitespace-nowrap">Pendidikan</td>
                        </tr>
                        <tr className="border-b border-slate-100">
                          <td className="p-2 whitespace-nowrap">Kesehatan</td>
                        </tr>
                        {/* Empty rows removed for brevity or kept if preferred */}
                      </tbody>
                    </table>
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

  return (
    <LabelProvider>
      <div className="flex h-screen bg-ppm-bg relative overflow-hidden">
        <Sidebar
          currentPage={currentPage}
          onNavigate={setCurrentPage}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />

        <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
          {/* Mobile Top Header */}
          <header className="lg:hidden bg-white p-3 px-4 flex items-center justify-between sticky top-0 z-30 transition-all duration-300 shrink-0">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="flex items-center justify-center w-10 h-10 rounded-lg border border-ppm-sage bg-white shadow-sm text-ppm-slate-light active:scale-95 transition-all hover:border-ppm-slate-light hover:text-ppm-slate"
              aria-label="Open Menu"
            >
              <Menu size={24} />
            </button>
            <span className="text-sm font-black tracking-tighter text-ppm-slate">DASHBOARD PPM</span>
            <div className="w-10" /> {/* Spacer to match button width */}
          </header>

          <main className="flex-1 p-4 lg:p-6 overflow-y-auto">
            {renderContent()}
          </main>
        </div>
      </div>
    </LabelProvider>
  );
}
