import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Eye, 
  ExternalLink, 
  Calendar, 
  CheckCircle2, 
  AlertCircle, 
  ChevronDown, 
  Download, 
  Search, 
  FileSpreadsheet, 
  Grid, 
  X, 
  FileUp, 
  Info,
  Layers,
  Users,
  FolderOpen,
  Plus,
  Trash2,
  Check,
  Building
} from 'lucide-react';
import { api } from '@/src/services/api';
import { useAuth } from '@/src/contexts/AuthContext';

interface SkpRow {
  tahun: number;
  perencanaan: { status: 'Disetujui' | 'Draft' | 'Revisi'; docName: string; updated: string };
  penilaian: { status: 'Disetujui' | 'Draft' | 'Proses'; docName: string; score: string; updated: string };
  paririmbon: { status: 'Disetujui' | 'Draft'; docName: string; updated: string };
  upload: { files: string[]; updated: string };
}

interface PegawaiSkpRecord {
  pegawaiId: number;
  namaPegawai: string;
  jabatan: string;
  bidangId: number;
  docName: string | null;
  docId: number | null;
  updatedAt: string | null;
}

export default function SkpSummary() {
  const { user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'summary' | 'upload'>('summary');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Real DB data states
  const [dbPegawaiList, setDbPegawaiList] = useState<any[]>([]);
  const [dbBidangList, setDbBidangList] = useState<any[]>([]);
  const [libraryDocs, setLibraryDocs] = useState<any[]>([]);
  const [isLoadingDb, setIsLoadingDb] = useState(false);

  // Perencanaan Modal State
  const [isPerencanaanModalOpen, setIsPerencanaanModalOpen] = useState(false);
  const [modalYear, setModalYear] = useState<number | null>(null);
  const [selectedBidangId, setSelectedBidangId] = useState<number | null>(null);
  const [showUnsubmittedOnly, setShowUnsubmittedOnly] = useState(false);
  const [searchPegawaiTerm, setSearchPegawaiTerm] = useState('');

  // Sub-modal Library Document Picker
  const [isLibPickerOpen, setIsLibPickerOpen] = useState(false);
  const [pickerTargetPegawaiId, setPickerTargetPegawaiId] = useState<number | null>(null);
  const [libSearchTerm, setLibSearchTerm] = useState('');

  // Persistent Client State for employees' SKPs
  const [pegawaiSkpState, setPegawaiSkpState] = useState<Record<string, PegawaiSkpRecord[]>>({});

  // Hover Tooltip positions for Perencanaan Counters in Main Table
  const [hoveredPerencanaan, setHoveredPerencanaan] = useState<{
    rect: { left: number, top: number, width: number, bottom: number, right: number },
    year: number;
  } | null>(null);

  // Regular year detail modal
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [activeDetailType, setActiveDetailType] = useState<'perencanaan' | 'penilaian' | 'paririmbon' | 'upload' | null>(null);
  
  // Header dropdown state
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    tahun: 'Semua',
    statusPerencanaan: 'Semua',
    statusPenilaian: 'Semua'
  });

  // Dynamic Year-based generator (keeps all historical years starting from 2025 up to next year dynamically)
  const getInitialSkpRows = (): SkpRow[] => {
    const startYear = 2025;
    const currentYear = new Date().getFullYear(); // dynamically matches client's current year (e.g., 2026)
    const endYear = Math.max(currentYear + 1, 2026); // Automatically ensures next year is always included, minimum 2026
    
    // Generate range of cumulative years from startYear (2025) up to endYear (e.g. 2027)
    const dynamicYears: number[] = [];
    for (let yr = startYear; yr <= endYear; yr++) {
      dynamicYears.push(yr);
    }
    
    return dynamicYears.map(yr => {
      if (yr === 2025) {
        return {
          tahun: 2025,
          perencanaan: { status: 'Disetujui', docName: 'SKP_Perencanaan_2025_V2.pdf', updated: '22 Jan 2025' },
          penilaian: { status: 'Proses', docName: 'SKP_Penilaian_Akhir_2025_Draft.pdf', score: 'Dalam Proses', updated: '02 Mei 2025' },
          paririmbon: { status: 'Disetujui', docName: 'Paririmbon_Aktivitas_2025.pdf', updated: '05 Apr 2025' },
          upload: { files: ['Laporan_Bulanan_Q1.pdf'], updated: '30 Apr 2025' }
        };
      }
      
      const isCurrent = yr === currentYear;
      return {
        tahun: yr,
        perencanaan: { status: 'Draft', docName: isCurrent ? `SKP_Perencanaan_${yr}_Draft.pdf` : null, updated: isCurrent ? `05 Mei ${yr}` : null },
        penilaian: { status: 'Draft', docName: isCurrent ? `SKP_Penilaian_${yr}_Template.pdf` : null, score: 'Belum Dimulai', updated: isCurrent ? `01 Mei ${yr}` : null },
        paririmbon: { status: 'Draft', docName: isCurrent ? `Paririmbon_Aktivitas_${yr}_Draft.pdf` : null, updated: isCurrent ? `02 Mei ${yr}` : null },
        upload: { files: [], updated: 'Belum ada berkas' }
      };
    }).sort((a, b) => b.tahun - a.tahun);
  };

  const [skpRowsState, setSkpRowsState] = useState<SkpRow[]>(() => getInitialSkpRows());
  const skpData = skpRowsState;

  // Fetch profiles, divisions, and library documents
  const loadDatabaseResources = async () => {
    setIsLoadingDb(true);
    try {
      const [pegawaiRes, bidangRes, dokumenRes] = await Promise.all([
        api.profilPegawai.getAll(),
        api.bidangInstansi.getAll(),
        api.dokumen.getAll()
      ]);

      if (pegawaiRes.success) setDbPegawaiList(pegawaiRes.data || []);
      if (bidangRes.success) setDbBidangList(bidangRes.data || []);
      if (dokumenRes.success) setLibraryDocs(dokumenRes.data || []);
    } catch (err) {
      console.error('Failed to load DB resources for SKP:', err);
    } finally {
      setIsLoadingDb(false);
    }
  };

  useEffect(() => {
    loadDatabaseResources();
  }, []);

  // Set default division filter based on current user
  useEffect(() => {
    if (currentUser?.bidang_id) {
      setSelectedBidangId(Number(currentUser.bidang_id));
    } else if (dbBidangList.length > 0) {
      setSelectedBidangId(Number(dbBidangList[0].id));
    }
  }, [currentUser, dbBidangList]);

  // Fallback realistic employees if DB is completely empty (helps testing)
  const getEmployeesForBidang = (bidangId: number): any[] => {
    const fromDb = dbPegawaiList.filter(p => Number(p.bidang_id) === bidangId);
    if (fromDb.length > 0) return fromDb;

    // Rich fallback data based on typical SKPD structures, mapped to real database IDs:
    // 1: Sekretariat, 2: PPM, 5: Rendalev
    const fallbacks: Record<number, any[]> = {
      2: [ // PPM (Pemerintahan dan Pembangunan Manusia)
        { id: 101, nama_lengkap: 'Ahmad Fauzi, M.T.', jabatan_nama: 'Kepala Bidang PPM / Pemerintahan', bidang_id: 2 },
        { id: 102, nama_lengkap: 'Siti Rahmawati, S.E.', jabatan_nama: 'Perencana Ahli Muda', bidang_id: 2 },
        { id: 103, nama_lengkap: 'Budi Santoso, S.Kom.', jabatan_nama: 'Pranata Komputer Ahli Pertama', bidang_id: 2 },
        { id: 104, nama_lengkap: 'Rian Hidayat, A.Md.', jabatan_nama: 'Pengolah Data Perencanaan', bidang_id: 2 },
        { id: 105, nama_lengkap: 'Anisa Amalia, S.IP.', jabatan_nama: 'Analisis Pembangunan Daerah', bidang_id: 2 }
      ],
      5: [ // Rendalev (Perencanaan Pengendalian dan Evaluasi)
        { id: 201, nama_lengkap: 'Drs. Hermawan, M.Si.', jabatan_nama: 'Kepala Bidang Rendalev', bidang_id: 5 },
        { id: 202, nama_lengkap: 'Dewi Lestari, S.E.', jabatan_nama: 'Fungsional Perencana Madya', bidang_id: 5 },
        { id: 203, nama_lengkap: 'Eko Prasetyo, S.ST.', jabatan_nama: 'Penyusun Program Anggaran', bidang_id: 5 }
      ],
      1: [ // Sekretariat
        { id: 301, nama_lengkap: 'H. Mulyadi, S.H., M.Si.', jabatan_nama: 'Sekretaris Badan', bidang_id: 1 },
        { id: 302, nama_lengkap: 'Yani Wijaya, S.Sos.', jabatan_nama: 'Kepala Subbagian Umum & Kepegawaian', bidang_id: 1 },
        { id: 303, nama_lengkap: 'Farhan Azhar, S.E.', jabatan_nama: 'Bendahara Pengeluaran', bidang_id: 1 }
      ]
    };

    return fallbacks[bidangId] || [
      { id: 901, nama_lengkap: 'Pegawai Contoh A', jabatan_nama: 'Staf Administrasi', bidang_id: bidangId },
      { id: 902, nama_lengkap: 'Pegawai Contoh B', jabatan_nama: 'Staf Teknis', bidang_id: bidangId }
    ];
  };

  // Initialize SKP records for selected year and division if empty
  const initializeSkpRecordsForYear = (year: number, bidangId: number, forceOverwrite = false) => {
    const key = `${year}_${bidangId}`;
    const isUsingFallback = !pegawaiSkpState[key] || pegawaiSkpState[key].some(r => r.pegawaiId >= 101 && r.pegawaiId <= 902);
    
    if (pegawaiSkpState[key] && !isUsingFallback && !forceOverwrite) return;

    // If we have real DB employees, and we are currently using fallback, let's overwrite!
    const staff = getEmployeesForBidang(bidangId);
    
    // Guard to not overwrite with fallback if we already had real data
    const dbStaffCount = dbPegawaiList.filter(p => Number(p.bidang_id) === bidangId).length;
    const isProposedFallback = dbStaffCount === 0;
    if (pegawaiSkpState[key] && !isUsingFallback && isProposedFallback) {
      return;
    }

    const records: PegawaiSkpRecord[] = staff.map((p, idx) => {
      // Pre-populate some as uploaded, some as null to look realistic
      const hasUploaded = idx % 2 === 0;
      return {
        pegawaiId: p.id,
        namaPegawai: p.nama_lengkap || p.nama,
        jabatan: p.jabatan_nama || p.jabatan || 'Fungsional Umum',
        bidangId: bidangId,
        docName: hasUploaded ? `SKP_Perencanaan_${year}_${(p.nama_lengkap || p.nama || 'Staff').split(' ')[0]}.pdf` : null,
        docId: hasUploaded ? 1000 + idx : null,
        updatedAt: hasUploaded ? '12 Jan ' + year : null
      };
    });

    setPegawaiSkpState(prev => ({ ...prev, [key]: records }));
  };

  // Pre-populate all years immediately on mount/bidang change so the table is loaded
  useEffect(() => {
    if (selectedBidangId) {
      const forceOverwrite = dbPegawaiList.length > 0;
      skpRowsState.forEach(row => {
        initializeSkpRecordsForYear(row.tahun, selectedBidangId, forceOverwrite);
      });
    }
  }, [selectedBidangId, dbPegawaiList, skpRowsState]);

  const getActiveRecords = (): PegawaiSkpRecord[] => {
    if (!modalYear || !selectedBidangId) return [];
    const key = `${modalYear}_${selectedBidangId}`;
    return pegawaiSkpState[key] || [];
  };

  // Helper to fetch ratio for main table columns
  const getYearSubmissionRatio = (year: number): { submitted: number; total: number } => {
    const bid = selectedBidangId || 1;
    const key = `${year}_${bid}`;
    const records = pegawaiSkpState[key] || [];
    if (records.length === 0) {
      // Fallback default
      return { submitted: 3, total: 5 };
    }
    const submitted = records.filter(r => r.docName !== null).length;
    const total = records.length;
    return { submitted, total };
  };

  // Save/Update records
  const updateRecordInState = (pegawaiId: number, docName: string | null, docId: number | null) => {
    if (!modalYear || !selectedBidangId) return;
    const key = `${modalYear}_${selectedBidangId}`;
    const dateStr = new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });

    setPegawaiSkpState(prev => {
      const existing = prev[key] || [];
      const updated = existing.map(rec => {
        if (rec.pegawaiId === pegawaiId) {
          return {
            ...rec,
            docName,
            docId,
            updatedAt: docName ? dateStr : null
          };
        }
        return rec;
      });
      return { ...prev, [key]: updated };
    });
  };

  // Handle local File Upload
  const handleLocalSkpUpload = (e: React.ChangeEvent<HTMLInputElement>, pegawaiId: number) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      updateRecordInState(pegawaiId, `${file.name}`, Math.floor(Math.random() * 5000));
    }
  };

  // Handle Select Library Document Picker
  const openLibPicker = (pegawaiId: number) => {
    setPickerTargetPegawaiId(pegawaiId);
    setIsLibPickerOpen(true);
  };

  const selectLibDocument = (doc: any) => {
    if (pickerTargetPegawaiId) {
      updateRecordInState(pickerTargetPegawaiId, doc.nama_file || doc.dokumen, doc.id);
    }
    setIsLibPickerOpen(false);
    setPickerTargetPegawaiId(null);
  };

  const removeSkpDocument = (pegawaiId: number) => {
    if (confirm('Apakah Anda yakin ingin menghapus dokumen perencanaan SKP untuk pegawai ini?')) {
      updateRecordInState(pegawaiId, null, null);
    }
  };

  // Main Open Modal trigger for Perencanaan Column
  const triggerPerencanaanModal = (year: number) => {
    setModalYear(year);
    const initialBidang = currentUser?.bidang_id ? Number(currentUser.bidang_id) : 1;
    setSelectedBidangId(initialBidang);
    initializeSkpRecordsForYear(year, initialBidang);
    setIsPerencanaanModalOpen(true);
  };

  // Handle Bidang selection changes inside popup
  const handleBidangChange = (bidangId: number) => {
    setSelectedBidangId(bidangId);
    if (modalYear) {
      initializeSkpRecordsForYear(modalYear, bidangId);
    }
  };

  // Tooltip Mouse Handlers
  const handlePerencanaanMouseEnter = (e: React.MouseEvent, year: number) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setHoveredPerencanaan({
      rect: {
        left: rect.left,
        top: rect.top,
        width: rect.width,
        bottom: rect.bottom,
        right: rect.right
      },
      year
    });
  };

  const handlePerencanaanMouseLeave = () => {
    setHoveredPerencanaan(null);
  };

  const getPerencanaanTooltipStyle = (): React.CSSProperties => {
    if (!hoveredPerencanaan || !hoveredPerencanaan.rect) return { visibility: 'hidden' };
    
    const { rect } = hoveredPerencanaan;
    const tooltipWidth = 340;
    const estimatedHeight = 280; // Estimated max height of the SKP audit tooltip
    const padding = 20;

    // Center horizontally over the cell
    let leftPos = rect.left + rect.width / 2 - (tooltipWidth / 2);
    
    // Bounds check left and right
    if (leftPos < padding) {
      leftPos = padding;
    } else if (leftPos + tooltipWidth > window.innerWidth - padding) {
      leftPos = window.innerWidth - tooltipWidth - padding;
    }

    const spaceAbove = rect.top;
    const spaceBelow = window.innerHeight - rect.bottom;

    let topPos;
    let transform;

    if (spaceAbove < estimatedHeight && spaceBelow > spaceAbove) {
      // Not enough space above, but there's room below (render below)
      topPos = rect.bottom + 12;
      transform = 'translateY(0)';
    } else {
      // Default: render above
      topPos = rect.top - 12;
      transform = 'translateY(-100%)';
    }

    return {
      left: `${leftPos}px`,
      top: `${topPos}px`,
      transform: transform,
      position: 'fixed',
      zIndex: 9999,
      visibility: 'visible'
    };
  };

  // Counter computing for active records inside pop-up
  const currentRecords = getActiveRecords();
  const totalStaff = currentRecords.length;
  const submittedCount = currentRecords.filter(r => r.docName !== null).length;
  const unsubmittedCount = totalStaff - submittedCount;

  // Filtered staff list in modal
  const filteredModalStaff = currentRecords.filter(r => {
    if (showUnsubmittedOnly && r.docName !== null) return false;
    if (searchPegawaiTerm) {
      return r.namaPegawai.toLowerCase().includes(searchPegawaiTerm.toLowerCase()) || 
             r.jabatan.toLowerCase().includes(searchPegawaiTerm.toLowerCase());
    }
    return true;
  });

  const getBidangName = (id: number | null): string => {
    if (!id) return 'Umum';
    const b = dbBidangList.find(x => Number(x.id) === id);
    if (b) return b.nama_bidang || b.singkatan;
    
    const fallbacks: Record<number, string> = {
      1: 'Sekretariat',
      2: 'Bidang Pemerintahan & PPM',
      3: 'Bidang Perekonomian & SDA',
      4: 'Bidang Infrastruktur & PW',
      5: 'Bidang Rendalev',
      6: 'Riset dan Inovasi Daerah'
    };
    return fallbacks[id] || 'Bidang Kepegawaian';
  };

  const getBidangSingkatan = (id: number | null): string => {
    if (!id) return 'UMUM';
    const b = dbBidangList.find(x => Number(x.id) === id);
    if (b && b.singkatan) return b.singkatan.toUpperCase();
    if (b && b.nama_bidang) {
      const match = b.nama_bidang.match(/\(([^)]+)\)/);
      if (match) return match[1].toUpperCase();
      
      const words = b.nama_bidang.split(' ').filter((w: string) => {
        const lower = w.toLowerCase();
        return lower !== 'bidang' && lower !== '&' && lower !== 'dan';
      });
      if (words.length > 0) {
        return words.map((w: string) => w[0]).join('').toUpperCase();
      }
    }
    
    const fallbacks: Record<number, string> = {
      1: 'SEKRETARIAT',
      2: 'PPM',
      3: 'SDA',
      4: 'IPW',
      5: 'RENDALEV',
      6: 'RISET'
    };
    return (fallbacks[id] || 'BIDANG').toUpperCase();
  };

  const openDetail = (year: number, type: 'perencanaan' | 'penilaian' | 'paririmbon' | 'upload') => {
    if (type === 'perencanaan') {
      triggerPerencanaanModal(year);
    } else {
      setSelectedYear(year);
      setActiveDetailType(type);
    }
  };

  const closeDetailModal = () => {
    setSelectedYear(null);
    setActiveDetailType(null);
  };

  const filteredData = skpData.filter(row => {
    if (filters.tahun !== 'Semua' && row.tahun.toString() !== filters.tahun) return false;
    if (filters.statusPerencanaan !== 'Semua' && row.perencanaan.status !== filters.statusPerencanaan) return false;
    if (filters.statusPenilaian !== 'Semua' && row.penilaian.status !== filters.statusPenilaian) return false;
    
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      return (
        row.tahun.toString().includes(s) ||
        row.perencanaan.docName.toLowerCase().includes(s) ||
        row.penilaian.docName.toLowerCase().includes(s) ||
        row.paririmbon.docName.toLowerCase().includes(s)
      );
    }
    return true;
  });

  const selectedRow = skpData.find(r => r.tahun === selectedYear);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
      {/* Dynamic Navigation Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200/80 pb-1 shrink-0">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('summary')}
            className={`px-5 py-3 text-xs font-bold uppercase tracking-wider transition-all duration-300 relative border-b-2 ${
              activeTab === 'summary'
                ? 'border-indigo-600 text-indigo-900 font-extrabold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Summary View SKP
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`px-5 py-3 text-xs font-bold uppercase tracking-wider transition-all duration-300 relative border-b-2 ${
              activeTab === 'upload'
                ? 'border-indigo-600 text-indigo-900 font-extrabold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Upload & Kelola Berkas
          </button>
        </div>
        
        {/* Search bar inside header */}
        <div className="relative max-w-xs w-64 hidden sm:block">
          <Search size={14} className="absolute left-3.5 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Cari dokumen SKP..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-full pl-10 pr-4 py-2 text-xs outline-none focus:border-indigo-500 transition-all shadow-sm"
          />
        </div>
      </div>

      {activeTab === 'summary' ? (
        <div className="space-y-5">
          
          {/* Main Card */}
          <div className="card-modern shadow-xl shadow-slate-200/50 border border-slate-100/60 overflow-hidden bg-white">
            
            {/* White card header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-50 bg-white select-none">
              
              {/* Left Title */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                  <Layers size={20} />
                </div>
                <div>
                  <h2 className="text-sm font-extrabold text-slate-800 tracking-tight uppercase">
                    SUMMARY VIEW SKP
                  </h2>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Ringkasan Kinerja Pegawai Tahunan</p>
                </div>
              </div>

              {/* View switches & filter controls */}
              <div className="flex items-center gap-3">
                {/* Visual View Switcher */}
                <div className="bg-slate-100/80 rounded-xl p-1 flex items-center gap-1">
                  <button 
                    onClick={() => setViewMode('table')}
                    className={`p-1.5 px-3.5 rounded-lg text-xs font-bold transition-all duration-200 flex items-center gap-1.5 ${
                      viewMode === 'table' 
                        ? 'bg-white text-indigo-600 shadow-sm' 
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <FileSpreadsheet size={14} />
                    <span>Tabel</span>
                  </button>
                  <button 
                    onClick={() => setViewMode('grid')}
                    className={`p-1.5 px-3.5 rounded-lg text-xs font-bold transition-all duration-200 flex items-center gap-1.5 ${
                      viewMode === 'grid' 
                        ? 'bg-white text-indigo-600 shadow-sm' 
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Grid size={14} />
                    <span>Grid</span>
                  </button>
                </div>

                {/* Reset button */}
                <button 
                  onClick={() => {
                    setFilters({ tahun: 'Semua', statusPerencanaan: 'Semua', statusPenilaian: 'Semua' });
                    setSearchTerm('');
                  }}
                  className="text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-2 rounded-xl transition-all uppercase tracking-wider border border-slate-200/40"
                >
                  Reset
                </button>

                {/* Automatic Calendar Status Badge */}
                <div className="hidden md:flex items-center gap-1.5 bg-indigo-50 border border-indigo-100/50 text-indigo-700 text-[9px] font-black uppercase tracking-wider px-3.5 py-2 rounded-xl select-none">
                  <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse"></span>
                  <span>Auto-Sync Kalender</span>
                </div>
              </div>
            </div>

            {/* Table View Mode */}
            {viewMode === 'table' ? (
              <div className="overflow-x-auto p-6 pt-2">
                <div className="rounded-2xl border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] overflow-hidden bg-white">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-50/50 border-b border-slate-100 select-none">
                        
                        {/* TAHUN Column */}
                        <th className="p-4 text-center w-24 border-r border-slate-100/50 relative">
                          <button 
                            onClick={() => toggleDropdown('tahun')}
                            className="flex items-center gap-1.5 mx-auto font-bold text-slate-400 uppercase tracking-wider hover:text-slate-700 transition-colors"
                          >
                            Tahun <ChevronDown size={12} className="opacity-80" />
                          </button>
                          
                          {/* Filter Dropdown */}
                          {activeDropdown === 'tahun' && (
                            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 w-28 bg-white text-slate-800 rounded-xl shadow-xl border border-slate-100 z-30 overflow-hidden font-normal py-1">
                              {['Semua', ...skpRowsState.map(r => r.tahun.toString())].map(t => (
                                <button
                                  key={t}
                                  onClick={() => {
                                    setFilters(prev => ({ ...prev, tahun: t }));
                                    setActiveDropdown(null);
                                  }}
                                  className={`w-full text-left px-3.5 py-1.5 text-[11px] hover:bg-slate-50 transition-colors ${
                                    filters.tahun === t ? 'bg-indigo-50 text-indigo-700 font-bold' : ''
                                  }`}
                                >
                                  {t}
                                </button>
                              ))}
                            </div>
                          )}
                        </th>

                        {/* PERENCANAAN Column */}
                        <th className="p-4 text-center border-r border-slate-100/50 relative">
                          <button 
                            onClick={() => toggleDropdown('perencanaan')}
                            className="flex items-center gap-1.5 mx-auto font-bold text-slate-400 uppercase tracking-wider hover:text-slate-700 transition-colors"
                          >
                            Perencanaan <ChevronDown size={12} className="opacity-80" />
                          </button>

                          {activeDropdown === 'perencanaan' && (
                            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 w-36 bg-white text-slate-800 rounded-xl shadow-xl border border-slate-100 z-30 overflow-hidden font-normal py-1">
                              <button
                                onClick={() => {
                                  setFilters(prev => ({ ...prev, statusPerencanaan: 'Semua' }));
                                  setActiveDropdown(null);
                                }}
                                className="w-full text-left px-4 py-1.5 text-[11px] hover:bg-slate-50 transition-colors"
                              >
                                Semua Status
                              </button>
                              {['Disetujui', 'Draft', 'Revisi'].map(status => (
                                <button
                                  key={status}
                                  onClick={() => {
                                    setFilters(prev => ({ ...prev, statusPerencanaan: status }));
                                    setActiveDropdown(null);
                                  }}
                                  className="w-full text-left px-4 py-1.5 text-[11px] hover:bg-slate-50 transition-colors"
                                >
                                  {status}
                                </button>
                              ))}
                            </div>
                          )}
                        </th>

                        {/* PENILAIAN Column */}
                        <th className="p-4 text-center border-r border-slate-100/50 relative">
                          <button 
                            onClick={() => toggleDropdown('penilaian')}
                            className="flex items-center gap-1.5 mx-auto font-bold text-slate-400 uppercase tracking-wider hover:text-slate-700 transition-colors"
                          >
                            Penilaian / Dokumen Akhir <ChevronDown size={12} className="opacity-80" />
                          </button>

                          {activeDropdown === 'penilaian' && (
                            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 w-36 bg-white text-slate-800 rounded-xl shadow-xl border border-slate-100 z-30 overflow-hidden font-normal py-1">
                              <button
                                onClick={() => {
                                  setFilters(prev => ({ ...prev, statusPenilaian: 'Semua' }));
                                  setActiveDropdown(null);
                                }}
                                className="w-full text-left px-4 py-1.5 text-[11px] hover:bg-slate-50 transition-colors"
                              >
                                Semua Status
                              </button>
                              {['Disetujui', 'Proses', 'Draft'].map(status => (
                                <button
                                  key={status}
                                  onClick={() => {
                                    setFilters(prev => ({ ...prev, statusPenilaian: status }));
                                    setActiveDropdown(null);
                                  }}
                                  className="w-full text-left px-4 py-1.5 text-[11px] hover:bg-slate-50 transition-colors"
                                >
                                  {status}
                                </button>
                              ))}
                            </div>
                          )}
                        </th>

                        {/* PARIRIMBON Column */}
                        <th className="p-4 text-center border-r border-slate-100/50 text-slate-400 font-bold uppercase tracking-wider">
                          <span className="flex items-center gap-1.5 mx-auto justify-center">
                            Paririmbon
                          </span>
                        </th>

                        {/* LINK UPLOAD Column */}
                        <th className="p-4 text-center text-slate-400 font-bold uppercase tracking-wider">
                          <span className="flex items-center gap-1.5 mx-auto justify-center">
                            Link / Bahan Upload
                          </span>
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100 bg-white">
                      {filteredData.map((row) => {
                        const ratio = getYearSubmissionRatio(row.tahun);
                        return (
                          <tr 
                            key={row.tahun} 
                            className="hover:bg-slate-50/80 transition-all border-b border-slate-50 group/row"
                          >
                            {/* TAHUN */}
                            <td className="p-4 text-center border-r border-slate-50 font-extrabold text-slate-700 text-sm">
                              <div>{row.tahun}</div>
                              {row.tahun > new Date().getFullYear() && (
                                <span className="inline-block mt-1 px-1.5 py-0.5 rounded-md text-[8px] font-black tracking-widest uppercase bg-rose-50 text-rose-600 border border-rose-100/40 animate-pulse-subtle">
                                  Belum Aktif
                                </span>
                              )}
                            </td>

                            {/* PERENCANAAN - INCLUDES AUDIT COUNTER WITH HOVER TOOLTIP */}
                            <td 
                              className="p-4 border-r border-slate-50 text-center relative cursor-help"
                              onMouseEnter={(e) => handlePerencanaanMouseEnter(e, row.tahun)}
                              onMouseLeave={handlePerencanaanMouseLeave}
                            >
                              <button
                                onClick={() => openDetail(row.tahun, 'perencanaan')}
                                className="group inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 border-b border-transparent hover:border-indigo-600/60 pb-0.5 transition-all"
                              >
                                Lihat (Kelola Bidang)
                                <Eye size={12} className="opacity-0 group-hover:opacity-100 transition-opacity ml-0.5 text-indigo-500" />
                              </button>
                              
                              {/* Audit counter small badge */}
                              <div className="flex items-center justify-center gap-1.5 mt-1.5">
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-slate-100 text-slate-600 border border-slate-200/40 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 transition-colors">
                                  Terkumpul: {ratio.submitted}/{ratio.total}
                                </span>
                              </div>
                            </td>

                            {/* PENILAIAN / DOKUMEN AKHIR */}
                            <td className="p-4 border-r border-slate-50 text-center">
                              <button
                                onClick={() => openDetail(row.tahun, 'penilaian')}
                                className="group inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 border-b border-transparent hover:border-indigo-600/60 pb-0.5 transition-all"
                              >
                                Lihat
                                <Eye size={12} className="opacity-0 group-hover:opacity-100 transition-opacity ml-0.5 text-indigo-500" />
                              </button>
                              <div className="flex items-center justify-center gap-1.5 mt-1.5">
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide ${
                                  row.penilaian.status === 'Disetujui' ? 'bg-emerald-50 text-emerald-700' :
                                  row.penilaian.status === 'Proses' ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-500'
                                }`}>
                                  {row.penilaian.status === 'Disetujui' ? row.penilaian.score : row.penilaian.status}
                                </span>
                              </div>
                            </td>

                            {/* PARIRIMBON */}
                            <td className="p-4 border-r border-slate-50 text-center">
                              <button
                                onClick={() => openDetail(row.tahun, 'paririmbon')}
                                className="group inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 border-b border-transparent hover:border-indigo-600/60 pb-0.5 transition-all"
                              >
                                Lihat
                                <Eye size={12} className="opacity-0 group-hover:opacity-100 transition-opacity ml-0.5 text-indigo-500" />
                              </button>
                              <div className="flex items-center justify-center gap-1.5 mt-1.5">
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide ${
                                  row.paririmbon.status === 'Disetujui' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                                }`}>
                                  {row.paririmbon.status}
                                </span>
                              </div>
                            </td>

                            {/* LINK / BAHAN UPLOAD */}
                            <td className="p-4 text-center">
                              <button
                                onClick={() => openDetail(row.tahun, 'upload')}
                                className="group inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 border-b border-transparent hover:border-indigo-600/60 pb-0.5 transition-all"
                              >
                                Lihat
                                <Eye size={12} className="opacity-0 group-hover:opacity-100 transition-opacity ml-0.5 text-indigo-500" />
                              </button>
                              <div className="flex items-center justify-center gap-1.5 mt-1.5">
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
                                  row.upload.files.length > 0 ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-400'
                                }`}>
                                  {row.upload.files.length > 0 ? `${row.upload.files.length} berkas` : 'Kosong'}
                                </span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {filteredData.length === 0 && (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-slate-400 text-xs italic">
                            Tidak ada data SKP yang cocok dengan filter atau pencarian Anda.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              /* Grid View Mode */
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 bg-slate-50/50">
                {filteredData.map(row => (
                  <div 
                    key={row.tahun} 
                    className="bg-white rounded-2xl p-5 border border-slate-200/60 shadow-md shadow-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group/grid-card"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-2">
                        <span className="text-lg font-black text-slate-800">{row.tahun}</span>
                        {row.tahun > new Date().getFullYear() ? (
                          <span className="text-[10px] font-black uppercase tracking-widest text-rose-600 bg-rose-50 px-2.5 py-1 rounded-md border border-rose-100/40 animate-pulse-subtle">
                            Belum Aktif
                          </span>
                        ) : (
                          <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 bg-slate-100 px-2.5 py-1 rounded-md">
                            Sasaran Kerja
                          </span>
                        )}
                      </div>

                      <div className="space-y-3.5">
                        {/* Perencanaan Mini-Row */}
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-slate-500">Perencanaan</span>
                          <button 
                            onClick={() => openDetail(row.tahun, 'perencanaan')}
                            className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-[10px] font-extrabold uppercase flex items-center gap-1 transition-all"
                          >
                            Kelola Bidang <Eye size={10} />
                          </button>
                        </div>

                        {/* Penilaian Mini-Row */}
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-slate-500">Penilaian Akhir</span>
                          <button 
                            onClick={() => openDetail(row.tahun, 'penilaian')}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase flex items-center gap-1 transition-all ${
                              row.penilaian.status === 'Disetujui' ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' :
                              row.penilaian.status === 'Proses' ? 'bg-blue-50 text-blue-700 hover:bg-blue-100' : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {row.penilaian.status} <Eye size={10} />
                          </button>
                        </div>

                        {/* Paririmbon Mini-Row */}
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-slate-500">Paririmbon</span>
                          <button 
                            onClick={() => openDetail(row.tahun, 'paririmbon')}
                            className="px-2.5 py-1 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg text-[10px] font-extrabold uppercase flex items-center gap-1 transition-all"
                          >
                            {row.paririmbon.status} <Eye size={10} />
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[10px] text-slate-400 font-semibold">
                        Berkas Upload: <strong className="text-slate-600 font-bold">{row.upload.files.length}</strong>
                      </span>
                      <button 
                        onClick={() => openDetail(row.tahun, 'upload')}
                        className="text-xs text-indigo-600 hover:text-indigo-800 font-extrabold flex items-center gap-1"
                      >
                        Kelola <ExternalLink size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Stats banner */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/60 flex items-center gap-4 shadow-xl shadow-slate-100/30">
              <div className="w-11 h-11 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
                <CheckCircle2 size={22} />
              </div>
              <div>
                <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest leading-none mb-1">Kepatuhan Upload</div>
                <div className="text-base font-black text-slate-800">100% Terpenuhi</div>
              </div>
            </div>
            
            <div className="bg-white p-5 rounded-2xl border border-slate-200/60 flex items-center gap-4 shadow-xl shadow-slate-100/30">
              <div className="w-11 h-11 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                <Calendar size={22} />
              </div>
              <div>
                <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest leading-none mb-1">Tahun Terakhir</div>
                <div className="text-base font-black text-slate-800">SKP 2026 (Draft)</div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/60 flex items-center gap-4 shadow-xl shadow-slate-100/30">
              <div className="w-11 h-11 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                <Info size={22} />
              </div>
              <div>
                <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest leading-none mb-1">Evaluasi Kinerja 2024</div>
                <div className="text-base font-black text-slate-800">Sangat Baik (94.2)</div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Tab 2: Upload and Manage SKP */
        <div className="bg-white rounded-2xl p-6 border border-slate-200/60 shadow-xl shadow-slate-100/30 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-sm font-extrabold text-slate-800 tracking-tight">KELOLA & UNGGAH BERKAS SKP</h3>
              <p className="text-xs text-slate-400 mt-1">Unggah dokumen perencanaan dan dokumen penilaian SKP tahunan Anda.</p>
            </div>
            <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
              <FileUp size={20} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Form Upload */}
            <div className="space-y-4 border border-slate-100 p-5 rounded-2xl bg-slate-50/40">
              <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">Unggah Berkas Baru</h4>
              
              <div className="space-y-3.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Tahun SKP</label>
                  <select className="input-modern bg-white">
                    <option value="2026">2026</option>
                    <option value="2025">2025</option>
                    <option value="2024">2024</option>
                    <option value="2023">2023</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Kategori Dokumen</label>
                  <select className="input-modern bg-white">
                    <option value="perencanaan">Perencanaan SKP</option>
                    <option value="penilaian">Penilaian / Dokumen Akhir</option>
                    <option value="paririmbon">Paririmbon Aktivitas</option>
                    <option value="pendukung">Bahan Upload / Berkas Pendukung</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Pilih Berkas (PDF / ZIP)</label>
                  <div className="border-2 border-dashed border-slate-200 hover:border-indigo-500/80 rounded-xl p-6 text-center cursor-pointer transition-all bg-white flex flex-col items-center gap-2">
                    <FileUp size={24} className="text-slate-400" />
                    <span className="text-xs font-bold text-slate-600">Klik atau seret berkas ke sini</span>
                    <span className="text-[10px] text-slate-400 font-medium">Maksimum ukuran berkas: 10MB</span>
                  </div>
                </div>

                <button className="btn-primary w-full bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-500/20 text-white">
                  Unggah Dokumen SKP
                </button>
              </div>
            </div>

            {/* Upload Rules */}
            <div className="space-y-5 border border-slate-100 p-5 rounded-2xl bg-slate-50/20">
              <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">Ketentuan & Alur Dokumen SKP</h4>
              
              <div className="space-y-4 text-xs text-slate-600 leading-relaxed">
                <div className="flex gap-3">
                  <div className="w-5 h-5 rounded-full bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0 font-extrabold text-[10px]">1</div>
                  <p><strong>Penyusunan Perencanaan:</strong> SKP disusun di awal tahun anggaran (Januari) menggunakan template resmi yang disepakati.</p>
                </div>

                <div className="flex gap-3">
                  <div className="w-5 h-5 rounded-full bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0 font-extrabold text-[10px]">2</div>
                  <p><strong>Asistensi & Persetujuan:</strong> Dokumen harus ditandatangani secara esign oleh atasan langsung (Eselon II/III) sebelum status berubah menjadi <em>Disetujui</em>.</p>
                </div>

                <div className="flex gap-3">
                  <div className="w-5 h-5 rounded-full bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0 font-extrabold text-[10px]">3</div>
                  <p><strong>Paririmbon Harian:</strong> Seluruh laporan logbook harian disatukan dalam format paririmbon di akhir triwulan/tahun sebagai bukti dukung penilaian.</p>
                </div>

                <div className="flex gap-3">
                  <div className="w-5 h-5 rounded-full bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0 font-extrabold text-[10px]">4</div>
                  <p><strong>Penilaian Akhir:</strong> Pejabat Penilai mengeluarkan dokumen akhir hasil kerja beserta predikat kinerja di akhir tahun (Desember).</p>
                </div>
              </div>

              <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl flex gap-3 text-amber-800 text-xs leading-relaxed">
                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                <p>Dokumen yang telah bertanda tangan elektronik (E-Sign) dan berkategori <strong>Disetujui</strong> tidak dapat diunggah ulang tanpa koordinasi dengan Kepegawaian.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DYNAMIC AUDIT HOVER TOOLTIP (Shows Submitted vs Unsubmitted staff list) */}
      {hoveredPerencanaan && (
        <div 
          className="fixed bg-white text-slate-800 rounded-[20px] shadow-2xl border border-slate-150 p-4 w-[340px] animate-in fade-in zoom-in-95 duration-150 select-none pointer-events-none overflow-hidden"
          style={getPerencanaanTooltipStyle()}
        >
          {/* Vertical colored accent bar matching Kegiatan standards */}
          <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-500 z-10"></div>
          
          <div className="relative pl-2.5">
            {/* Tooltip Header */}
            <div className="flex items-center justify-between mb-3.5 pb-2 border-b border-slate-100">
              <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 flex items-center gap-1.5">
                <Users size={12} /> Audit SKP {hoveredPerencanaan.year}
              </span>
              <span className="text-[8px] font-extrabold text-slate-400 uppercase tracking-widest bg-slate-100 px-2 py-0.5 rounded-md">
                {getBidangSingkatan(selectedBidangId)}
              </span>
            </div>

            {/* Grid Layout: 2 Columns (Left: Sudah, Right: Belum) */}
            <div className="grid grid-cols-2 gap-3.5">
              
              {/* Left Column: Sudah Upload */}
              <div className="space-y-2">
                <div className="bg-emerald-50 text-emerald-700 text-[9px] font-black tracking-widest uppercase py-1 px-2.5 rounded-lg text-center border border-emerald-100/60">
                  Sudah ({((pegawaiSkpState[`${hoveredPerencanaan.year}_${selectedBidangId || 1}`] || []).filter(r => r.docName !== null).length)})
                </div>
                <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                  {(pegawaiSkpState[`${hoveredPerencanaan.year}_${selectedBidangId || 1}`] || [])
                    .filter(r => r.docName !== null)
                    .map(r => (
                      <div key={r.pegawaiId} className="text-[10px] text-slate-700 font-extrabold flex items-start gap-1">
                        <span className="text-emerald-500 font-black text-[12px] leading-none shrink-0">✓</span>
                        <span className="truncate" title={r.namaPegawai}>{r.namaPegawai.split(',')[0]}</span>
                      </div>
                    ))}
                  {(pegawaiSkpState[`${hoveredPerencanaan.year}_${selectedBidangId || 1}`] || []).filter(r => r.docName !== null).length === 0 && (
                    <span className="text-[9px] text-slate-400 italic block text-center pt-2">Belum ada</span>
                  )}
                </div>
              </div>

              {/* Right Column: Belum Upload */}
              <div className="space-y-2">
                <div className="bg-rose-50 text-rose-700 text-[9px] font-black tracking-widest uppercase py-1 px-2.5 rounded-lg text-center border border-rose-100/60">
                  Belum ({((pegawaiSkpState[`${hoveredPerencanaan.year}_${selectedBidangId || 1}`] || []).filter(r => r.docName === null).length)})
                </div>
                <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                  {(pegawaiSkpState[`${hoveredPerencanaan.year}_${selectedBidangId || 1}`] || [])
                    .filter(r => r.docName === null)
                    .map(r => (
                      <div key={r.pegawaiId} className="text-[10px] text-slate-500 font-semibold flex items-start gap-1">
                        <span className="text-rose-400 font-black text-[11px] leading-none shrink-0">✗</span>
                        <span className="truncate" title={r.namaPegawai}>{r.namaPegawai.split(',')[0]}</span>
                      </div>
                    ))}
                  {(pegawaiSkpState[`${hoveredPerencanaan.year}_${selectedBidangId || 1}`] || []).filter(r => r.docName === null).length === 0 && (
                    <span className="text-[9px] text-emerald-600 font-extrabold block text-center pt-2">Lengkap!</span>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* DETAILED PERENCANAAN KOLOM POP UP */}
      {isPerencanaanModalOpen && modalYear && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-indigo-500/10 rounded-lg flex items-center justify-center text-indigo-400">
                  <Users size={18} />
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider">
                    KELOLA PERENCANAAN SKP {modalYear}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                    {getBidangName(selectedBidangId)}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsPerencanaanModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50/40">
              
              {/* Ultra-compact Consolidated Row: Counters & Filter Checkbox */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5">
                {/* Total Personil */}
                <div className="bg-white px-3.5 py-1.5 rounded-xl border border-slate-200/50 flex items-center gap-2 shadow-sm select-none">
                  <div className="w-6.5 h-6.5 bg-slate-50 text-slate-500 rounded-md flex items-center justify-center shrink-0">
                    <Users size={12} />
                  </div>
                  <div className="flex items-center justify-between flex-1">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Total Personil</span>
                    <span className="text-base font-black text-slate-800">{totalStaff}</span>
                  </div>
                </div>

                {/* Sudah Unggah */}
                <div className="bg-emerald-50/30 px-3.5 py-1.5 rounded-xl border border-emerald-100/60 flex items-center gap-2 shadow-sm select-none">
                  <div className="w-6.5 h-6.5 bg-emerald-100/60 text-emerald-700 rounded-md flex items-center justify-center shrink-0">
                    <CheckCircle2 size={12} />
                  </div>
                  <div className="flex items-center justify-between flex-1">
                    <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-wider">Sudah Unggah</span>
                    <span className="text-base font-black text-emerald-800">{submittedCount}</span>
                  </div>
                </div>

                {/* Belum Unggah */}
                <div className="bg-amber-50/30 px-3.5 py-1.5 rounded-xl border border-amber-150 flex items-center gap-2 shadow-sm select-none">
                  <div className="w-6.5 h-6.5 bg-amber-100/60 text-amber-700 rounded-md flex items-center justify-center shrink-0">
                    <AlertCircle size={12} />
                  </div>
                  <div className="flex items-center justify-between flex-1">
                    <span className="text-[9px] font-bold text-amber-600 uppercase tracking-wider">Belum Unggah</span>
                    <span className="text-base font-black text-amber-800">{unsubmittedCount}</span>
                  </div>
                </div>

                {/* Checkbox Filter */}
                <div 
                  onClick={() => setShowUnsubmittedOnly(!showUnsubmittedOnly)}
                  className="bg-white px-3.5 py-1.5 rounded-xl border border-slate-200/60 hover:border-slate-300 flex items-center justify-between shadow-sm select-none cursor-pointer hover:bg-slate-50/50 transition-all"
                >
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Tampilkan Belum Upload</span>
                  <div className={`w-4.5 h-4.5 rounded border flex items-center justify-center transition-all ${
                    showUnsubmittedOnly ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 bg-white'
                  }`}>
                    {showUnsubmittedOnly && <Check size={10} strokeWidth={3} />}
                  </div>
                </div>
              </div>

              {/* Staff SKP List Table */}
              <div className="rounded-2xl border border-slate-100 shadow-sm overflow-hidden bg-white">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 select-none text-[9px] font-black text-slate-400 uppercase tracking-widest">
                      <th className="py-3 px-4 w-12 text-center">No</th>
                      <th className="py-3 px-4">Nama Pegawai & Jabatan</th>
                      <th className="py-3 px-4 w-80">Dokumen SKP Perencanaan</th>
                      <th className="py-3 px-4 w-44 text-center">Aksi Pengelolaan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredModalStaff.map((row, idx) => (
                      <tr key={row.pegawaiId} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-4 text-center text-slate-300 font-extrabold">{idx + 1}</td>
                        <td className="p-4">
                          <div className="font-extrabold text-slate-800">{row.namaPegawai}</div>
                          <div className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">{row.jabatan}</div>
                        </td>
                        <td className="p-4">
                          {row.docName ? (
                            <div className="flex items-center gap-2 p-2 rounded-xl bg-indigo-50/50 border border-indigo-100/50">
                              <FileText size={16} className="text-indigo-600 shrink-0" />
                              <div className="min-w-0 flex-1">
                                <span className="font-extrabold text-indigo-900 truncate block text-[11px]" title={row.docName}>
                                  {row.docName}
                                </span>
                                <span className="text-[9px] text-indigo-400 font-bold uppercase block mt-0.5">diunggah: {row.updatedAt}</span>
                              </div>
                              <button 
                                onClick={() => removeSkpDocument(row.pegawaiId)}
                                className="p-1 rounded-md text-red-500 hover:bg-red-50 hover:scale-105 transition-all shrink-0"
                                title="Hapus Dokumen"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-700 text-[10px] font-black uppercase tracking-widest rounded-lg">
                              <AlertCircle size={12} /> Belum Upload
                            </span>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="flex gap-2 justify-center">
                            {/* Standard Circular Upload button matching Activity/Logbook form */}
                            <label 
                              className="w-6 h-6 rounded-full bg-indigo-500 hover:bg-indigo-600 text-white flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-all outline-none cursor-pointer" 
                              title="Unggah File Baru"
                            >
                              <Plus size={12} />
                              <input 
                                type="file" 
                                className="hidden" 
                                accept=".pdf,.doc,.docx"
                                onChange={(e) => handleLocalSkpUpload(e, row.pegawaiId)} 
                              />
                            </label>

                            {/* Standard Circular Library Picker matching Activity/Logbook form */}
                            <button 
                              type="button"
                              onClick={() => openLibPicker(row.pegawaiId)}
                              className="w-6 h-6 rounded-full bg-slate-800 hover:bg-slate-950 text-white flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-all outline-none"
                              title="Pilih dari Perpustakaan"
                            >
                              <FolderOpen size={11} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredModalStaff.length === 0 && (
                      <tr>
                        <td colSpan={4} className="p-8 text-center text-slate-400 text-xs italic">
                          Tidak ada pegawai yang ditemukan.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between shrink-0">
              <span className="text-[11px] text-slate-400 font-bold">
                * Halaman dibatasi khusus internal {getBidangName(selectedBidangId)}
              </span>
              <button 
                onClick={() => setIsPerencanaanModalOpen(false)}
                className="btn-primary bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-5 py-2.5 rounded-xl font-bold uppercase tracking-wider"
              >
                Selesai & Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUB-MODAL DOKUMEN LIBRARY PICKER */}
      {isLibPickerOpen && pickerTargetPegawaiId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[75vh] animate-in fade-in zoom-in-95 duration-150">
            
            {/* Header */}
            <div className="p-4.5 bg-indigo-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <FolderOpen size={18} className="text-indigo-300" />
                <h4 className="text-xs font-black uppercase tracking-wider">
                  PILIH DARI PERPUSTAKAAN DOKUMEN
                </h4>
              </div>
              <button 
                onClick={() => { setIsLibPickerOpen(false); setPickerTargetPegawaiId(null); }}
                className="p-1 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Search inside library list */}
            <div className="p-4 border-b border-slate-100 bg-slate-50/50">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari berkas dokumen..."
                  value={libSearchTerm}
                  onChange={(e) => setLibSearchTerm(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs outline-none focus:border-indigo-500 transition-all placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* Document list */}
            <div className="p-5 overflow-y-auto space-y-2 flex-1 bg-slate-50/20">
              {libraryDocs
                .filter(doc => (doc.nama_file || doc.dokumen || '').toLowerCase().includes(libSearchTerm.toLowerCase()))
                .map(doc => (
                  <div 
                    key={doc.id}
                    onClick={() => selectLibDocument(doc)}
                    className="flex items-center justify-between p-3.5 bg-white border border-slate-150 hover:border-indigo-400 hover:bg-indigo-50/20 rounded-2xl cursor-pointer transition-all duration-200 group/item"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center shrink-0 group-hover/item:scale-105 transition-transform">
                        <FileText size={16} />
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs text-slate-700 font-extrabold truncate block max-w-[320px]">{doc.nama_file || doc.dokumen}</span>
                        <span className="text-[10px] text-slate-400 font-medium block mt-0.5">ID Berkas: #{doc.id}</span>
                      </div>
                    </div>
                    <button className="text-[10px] font-black uppercase text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-2.5 py-1 rounded-lg">
                      Pilih
                    </button>
                  </div>
                ))}
              {libraryDocs.length === 0 && (
                <div className="text-center p-8 text-slate-400 text-xs italic">
                  Belum ada dokumen yang terunggah di perpustakaan.
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end shrink-0">
              <button 
                onClick={() => { setIsLibPickerOpen(false); setPickerTargetPegawaiId(null); }}
                className="btn-secondary px-4 py-2 text-xs rounded-xl"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DETAIL MODAL POPUP - Regular Year Details */}
      {selectedYear && activeDetailType && selectedRow && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <FileText size={18} className="text-indigo-400" />
                <h3 className="text-xs font-black uppercase tracking-wider">
                  Detail SKP {selectedYear} - {activeDetailType}
                </h3>
              </div>
              <button 
                onClick={closeDetailModal}
                className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1">
              {activeDetailType === 'penilaian' && (
                <div className="space-y-4">
                  <div className="bg-slate-50 p-4.5 rounded-2xl border border-slate-100 space-y-3.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-400 uppercase tracking-wider">Nama Berkas</span>
                      <span className="font-extrabold text-slate-800 break-all max-w-[200px] text-right">
                        {selectedRow.penilaian.docName}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-400 uppercase tracking-wider">Predikat Kinerja</span>
                      <span className="font-black text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded text-[11px]">
                        {selectedRow.penilaian.score}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-400 uppercase tracking-wider">Status Evaluasi</span>
                      <span className={`px-2.5 py-0.5 rounded-full font-extrabold text-[10px] uppercase ${
                        selectedRow.penilaian.status === 'Disetujui' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {selectedRow.penilaian.status}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-400 uppercase tracking-wider">Tanggal Penilaian</span>
                      <span className="font-extrabold text-slate-600">{selectedRow.penilaian.updated}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Penilai Kinerja</h4>
                    <div className="text-xs text-slate-600 leading-relaxed p-3.5 border border-slate-100 rounded-xl bg-slate-50/50">
                      <strong>Kepala Bidang PPM / Pemerintahan</strong><br />
                      Instansi: Badan Perencanaan Pembangunan Riset dan Inovasi Daerah
                    </div>
                  </div>
                </div>
              )}

              {activeDetailType === 'paririmbon' && (
                <div className="space-y-4">
                  <div className="bg-slate-50 p-4.5 rounded-2xl border border-slate-100 space-y-3.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-400 uppercase tracking-wider">Nama Berkas</span>
                      <span className="font-extrabold text-slate-800 break-all max-w-[200px] text-right">
                        {selectedRow.paririmbon.docName}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-400 uppercase tracking-wider">Status Validasi</span>
                      <span className="font-extrabold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-lg text-[10px] uppercase tracking-wide">
                        {selectedRow.paririmbon.status}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-400 uppercase tracking-wider">Tanggal Rekap</span>
                      <span className="font-extrabold text-slate-600">{selectedRow.paririmbon.updated}</span>
                    </div>
                  </div>

                  <div className="p-4 bg-indigo-50 border border-indigo-100 text-indigo-900 rounded-xl flex gap-3 text-xs leading-relaxed">
                    <Info size={18} className="shrink-0 mt-0.5 text-indigo-600" />
                    <p>Paririmbon menyajikan rangkuman logbook aktivitas harian serta kontribusi kinerja yang ditarik secara otomatis dari subkegiatan yang Anda ampu.</p>
                  </div>
                </div>
              )}

              {activeDetailType === 'upload' && (
                <div className="space-y-4">
                  <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">Daftar Berkas Terunggah</h4>
                  {selectedRow.upload.files.length > 0 ? (
                    <div className="space-y-2">
                      {selectedRow.upload.files.map((f, i) => (
                        <div key={i} className="flex items-center justify-between p-3 border border-slate-100 rounded-xl hover:bg-slate-50 transition-colors">
                          <div className="flex items-center gap-2 min-w-0">
                            <FileText size={16} className="text-indigo-600" />
                            <span className="text-xs text-slate-700 font-semibold truncate max-w-[260px]">{f}</span>
                          </div>
                          <button className="text-indigo-600 hover:text-indigo-800 hover:scale-105 transition-all p-1">
                            <Download size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center p-6 border border-dashed border-slate-200 rounded-2xl text-slate-400 text-xs italic">
                      Belum ada berkas pendukung yang diunggah untuk tahun {selectedYear}.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2 shrink-0">
              <button 
                onClick={closeDetailModal}
                className="btn-secondary px-4 py-2 text-xs rounded-xl"
              >
                Tutup
              </button>
              
              {activeDetailType !== 'upload' && (
                <button 
                  className="btn-primary px-4 py-2 text-xs rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 shadow-md shadow-indigo-500/20"
                  onClick={() => alert(`Mengunduh berkas: ${activeDetailType === 'penilaian' ? selectedRow.penilaian.docName : selectedRow.paririmbon.docName}`)}
                >
                  <Download size={12} /> Unduh PDF
                </button>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
