import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  History,
  Layers,
  Users,
  FolderOpen,
  Plus,
  Trash2,
  Check,
  Copy,
  Building,
  Pencil,
  Loader2,
  FileIcon,
  FileImage,
  FileQuestion,
  Undo,
  Upload,
  ChevronRight,
  Presentation,
  UserCheck,
  Target,
  Settings2,
  Share2,
  Lock
} from 'lucide-react';
import { api } from '@/src/services/api';
import { useAuth } from '@/src/contexts/AuthContext';
import { DocumentViewerModal } from '@/src/components/modals/DocumentViewerModal';
import SubKegiatanSkpConfigModal from '../../planning/components/SubKegiatanSkpConfigModal';  // Fetch profiles, divisions, and library documents
import { formatFilename } from '@/src/services/stringHelper';
interface SkpRow {
  tahun: number;
  perencanaan: { status: 'Disetujui' | 'Draft' | 'Revisi'; docName: string; updated: string };
  penilaian: { status: 'Disetujui' | 'Draft' | 'Proses'; docName: string; score: string; updated: string };
  paririmbon: { status: 'Disetujui' | 'Draft'; docName: string; updated: string };
  upload: { files: string[]; updated: string };
}

interface UploadItem {
  id: string;
  file: File;
  namaVisual: string;
  ekstensi: string;
  jenisId: string;
  tematikIds: number[];
  bidangUrusanIds?: number[];
  isPrivate?: boolean;
  status: 'idle' | 'uploading' | 'success' | 'error';
  errorMsg?: string;
  progress?: number;
}

interface SearchableSelectProps {
  options: { id: number | string; label: string }[];
  value: string | number;
  onChange: (value: string) => void;
  placeholder: string;
  searchPlaceholder?: string;
  isFilter?: boolean;
  containerRef?: React.RefObject<HTMLDivElement>;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  className?: string;
  dropUp?: boolean;
}

const SearchableSelect: React.FC<SearchableSelectProps> = ({
  options, value, onChange, placeholder, searchPlaceholder = "Cari...",
  isFilter = false, containerRef, isOpen, setIsOpen,
  searchQuery, setSearchQuery, className = "", dropUp = false
}) => {
  const [autoDropUp, setAutoDropUp] = useState(false);
  const selectedOption = options.find(o => String(o.id) === String(value));
  const filteredOptions = options.filter(o =>
      o.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
      if (isOpen && containerRef?.current) {
          const rect = containerRef.current.getBoundingClientRect();
          const spaceBelow = window.innerHeight - rect.bottom;
          if (spaceBelow < 250) {
              setAutoDropUp(true);
          } else {
              setAutoDropUp(false);
          }
      }
  }, [isOpen, containerRef]);

  return (
      <div className={`relative ${className}`} ref={containerRef}>
          <div
              className={`input-modern w-full cursor-pointer flex justify-between items-center transition-all ${isOpen ? 'border-ppm-blue ring-2 ring-ppm-blue/10' : ''}`}
              onClick={() => setIsOpen(!isOpen)}
          >
              <span className={`truncate ${!selectedOption && !isFilter ? 'text-slate-400 font-normal' : 'text-slate-700 font-bold'}`}>
                  {selectedOption ? selectedOption.label : placeholder}
              </span>
              <ChevronRight size={14} className={`text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-90' : ''}`} />
          </div>

          {isOpen && (
              <div className={`absolute z-[110] w-full bg-white border border-slate-200 shadow-2xl rounded-2xl p-3 animate-in fade-in zoom-in-95 duration-200 ${(dropUp || autoDropUp) ? 'bottom-full mb-3 origin-bottom' : 'top-full mt-2 origin-top'}`}>
                  <div className="relative mb-2">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                          type="text"
                          className="w-full pl-9 pr-3 py-2 bg-slate-50 border-none rounded-xl text-[11px] font-bold focus:ring-2 focus:ring-ppm-blue/10 placeholder:font-normal"
                          placeholder={searchPlaceholder}
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                      />
                  </div>
                  <div className="max-h-[180px] overflow-y-auto space-y-0.5 custom-scrollbar">
                      {isFilter && (
                          <div
                              className={`p-1.5 rounded-xl text-[11px] font-bold cursor-pointer transition-colors ${value === '' ? 'bg-ppm-blue text-white shadow-md' : 'hover:bg-slate-50 text-slate-600'}`}
                              onClick={() => { onChange(''); setIsOpen(false); setSearchQuery(''); }}
                          >
                              {placeholder}
                          </div>
                      )}
                      {filteredOptions.map(o => (
                          <div
                              key={o.id}
                              className={`p-1.5 rounded-xl text-[11px] font-bold cursor-pointer transition-colors ${String(value) === String(o.id) ? 'bg-ppm-blue text-white shadow-md' : 'hover:bg-slate-50 text-slate-600'}`}
                              onClick={() => { onChange(String(o.id)); setIsOpen(false); setSearchQuery(''); }}
                          >
                              {o.label}
                          </div>
                      ))}
                      {filteredOptions.length === 0 && (
                          <div className="p-3 text-center text-[10px] text-slate-400 italic">Tidak ada pilihan</div>
                      )}
                  </div>
              </div>
          )}
    </div>
  );
};

interface PegawaiSkpRecord {
  pegawaiId: number;
  namaPegawai: string;
  jabatan: string;
  bidangId: number;
  perencanaanDocName: string | null;
  perencanaanDocId: number | null;
  perencanaanDocPath: string | null;
  perencanaanUpdatedAt: string | null;
  penilaianDocName: string | null;
  penilaianDocId: number | null;
  penilaianDocPath: string | null;
  penilaianUpdatedAt: string | null;
  pendukungDocName: string | null;
  pendukungDocId: number | null;
  pendukungDocPath: string | null;
  pendukungUpdatedAt: string | null;
  pendukungList: Array<{
    pegawaiId: number;
    bulan: number;
    butirSkp: string | null;
    docName: string | null;
    docId: number | null;
    docPath: string | null;
    updatedAt: string | null;
  }>;
  [key: string]: any;
}

interface SkpItem {
  name: string;
  code?: string;
  isManual?: boolean;
}

const formatFileSize = (bytes?: number) => {
  if (!bytes) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const formatDateSimple = (dateStr?: string) => {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return dateStr;
  }
};

export default function SkpSummary({ isPublic = false }: { isPublic?: boolean }) {
  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.tipe_user_id === 1 || [2, 5, 7, 8].includes(currentUser?.tipe_user_id || 0);

  const currentUserPegawaiId = currentUser?.profil_pegawai_id || currentUser?.id || 0;

  const isSupervisor = (() => {
    if (!currentUser) return false;
    const jab = (currentUser.jabatan_nama || '').toLowerCase();
    const isKatimKeAtas = 
      jab.includes('ketua tim') || 
      jab.includes('katim') ||
      jab.includes('kepala bidang') || 
      jab.includes('kabid') ||
      jab.includes('kepala sub bagian') || 
      jab.includes('kasubag') ||
      jab.includes('sekretaris') || 
      jab.includes('kepala badan') || 
      jab === 'kepala' ||
      jab.includes('kaban');
    return isKatimKeAtas;
  })();

  const monthNamesId = [
    'JANUARI', 'FEBRUARI', 'MARET', 'APRIL', 'MEI', 'JUNI',
    'JULI', 'AGUSTUS', 'SEPTEMBER', 'OKTOBER', 'NOVEMBER', 'DESEMBER'
  ];

  const canChangeBidang = (() => {
    if (isPublic) return false;
    if (!currentUser) return false;

    // 1. Superadmin (tipe_user_id === 1)
    if (currentUser.tipe_user_id === 1) return true;

    // 2. Admin Instansi (tipe_user_id === 2)
    if (currentUser.tipe_user_id === 2) return true;

    // 2b. Admin Bapperida (tipe_user_id === 8)
    if (
      currentUser.tipe_user_id === 8 ||
      (currentUser.tipe_user_nama || '').toLowerCase().includes('admin bapperida')
    ) {
      return true;
    }

    // 3. Kepala Badan (Kaban) - tipe_user_id === 5 or jabatan === 'Kepala' or contains 'kepala badan'
    if (
      currentUser.tipe_user_id === 5 ||
      currentUser.jabatan_id === 8 ||
      (currentUser.jabatan_nama || '').toLowerCase().includes('kepala badan') ||
      (currentUser.jabatan_nama || '').toLowerCase() === 'kepala'
    ) {
      return true;
    }

    // 4. Sekretaris (Sekban) - jabatan === 'Sekretaris' or contains 'sekretaris'
    if (
      currentUser.jabatan_id === 10 ||
      (currentUser.jabatan_nama || '').toLowerCase().includes('sekretaris')
    ) {
      return true;
    }

    // 5. Kasubag Kepegawaian & HR staff - sub_bidang_id === 4 (Umum dan Kepegawaian)
    if (
      currentUser.sub_bidang_id === 4 ||
      (currentUser.sub_bidang_nama || '').toLowerCase().includes('kepegawaian')
    ) {
      return true;
    }

    return false;
  })();

  // Parse URL parameters
  const queryParams = new URLSearchParams(window.location.search);
  const publicBidangId = queryParams.get('bidang_id') ? Number(queryParams.get('bidang_id')) : null;
  const publicYear = queryParams.get('tahun') ? Number(queryParams.get('tahun')) : null;

  const [activeTab, setActiveTab] = useState<'summary' | 'monthly_docs'>(() => {
    if (isPublic) return 'monthly_docs';
    const saved = sessionStorage.getItem('skp_active_tab');
    if (saved === 'summary' || saved === 'monthly_docs') {
      return saved as any;
    }
    return 'summary';
  });
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!isPublic) {
      sessionStorage.setItem('skp_active_tab', activeTab);
    }
  }, [activeTab, isPublic]);

  // Real DB data states
  const [dbPegawaiList, setDbPegawaiList] = useState<any[]>([]);
  const [dbBidangList, setDbBidangList] = useState<any[]>([]);
  const [libraryDocs, setLibraryDocs] = useState<any[]>([]);
  const [isLibraryLoading, setIsLibraryLoading] = useState(false);
  const [isLoadingDb, setIsLoadingDb] = useState(false);

  // Upload Modal State (aligned with document management)
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadQueue, setUploadQueue] = useState<UploadItem[]>([]);
  const [activeUploadIdx, setActiveUploadIdx] = useState<number>(-1);
  const [uploading, setUploading] = useState(false);
  const [uploadTagSearch, setUploadTagSearch] = useState('');
  const [isUploadTagOpen, setIsUploadTagOpen] = useState(false);
  const [uploadJenisSearch, setUploadJenisSearch] = useState('');
  const [isUploadJenisOpen, setIsUploadJenisOpen] = useState(false);

  const [targetPegawaiId, setTargetPegawaiId] = useState<number | null>(null);
  const [targetKategori, setTargetKategori] = useState<'perencanaan' | 'penilaian' | 'pendukung' | null>(null);
  const [targetTahun, setTargetTahun] = useState<number | null>(null);

  const [jenisList, setJenisList] = useState<any[]>([]);
  const [tematikList, setTematikList] = useState<any[]>([]);
  const [bidangUrusanList, setBidangUrusanList] = useState<any[]>([]);
  const [uploadUrusanSearch, setUploadUrusanSearch] = useState('');
  const [isUploadUrusanOpen, setIsUploadUrusanOpen] = useState(false);

  const uploadTagRef = useRef<HTMLDivElement>(null);
  const uploadJenisRef = useRef<HTMLDivElement>(null);
  const uploadUrusanRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const monthlyHeaderRef = useRef<HTMLDivElement>(null);
  const monthlyTableRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Perencanaan Modal State
  const [isPerencanaanModalOpen, setIsPerencanaanModalOpen] = useState(false);
  const [modalYear, setModalYear] = useState<number | null>(null);
  const [modalType, setModalType] = useState<'perencanaan' | 'penilaian' | 'upload'>('perencanaan');
  const [modalMonth, setModalMonth] = useState<number | null>(null);
  const [modalButirSkp, setModalButirSkp] = useState<string | null>(null);
  const [selectedBidangId, setSelectedBidangId] = useState<number | null>(null);
  const [showUnsubmittedOnly, setShowUnsubmittedOnly] = useState(false);
  const [searchPegawaiTerm, setSearchPegawaiTerm] = useState('');

  // Sub-modal Library Document Picker
  const [isLibPickerOpen, setIsLibPickerOpen] = useState(false);
  const [pickerTargetPegawaiId, setPickerTargetPegawaiId] = useState<number | null>(null);
  const [libSearchTerm, setLibSearchTerm] = useState('');
  const [libSelectedDocs, setLibSelectedDocs] = useState<any[]>([]);
  const [confirmDeleteDoc, setConfirmDeleteDoc] = useState<{ pegawaiId: number; docId: number; docName: string | null; isPulled?: boolean } | null>(null);

  // Scroll lag bypass for library picker
  const [isLibScrolling, setIsLibScrolling] = useState(false);
  const libScrollTimeoutRef = useRef<any>(null);

  const handleLibScroll = () => {
    if (!isLibScrolling) setIsLibScrolling(true);
    if (libScrollTimeoutRef.current) clearTimeout(libScrollTimeoutRef.current);
    libScrollTimeoutRef.current = setTimeout(() => {
      setIsLibScrolling(false);
    }, 150);
  };

  // SKP History Modal States
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [hoveredPegawaiHistory, setHoveredPegawaiHistory] = useState<{
    x: number;
    y: number;
    history: any[];
    namaPegawai: string;
  } | null>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (uploading) return;
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);
      let defaultJenisId = '';
      const cat = targetKategori || 'perencanaan';
      if (jenisList && jenisList.length > 0) {
        const found = jenisList.find(j => {
          const name = j.dokumen.toLowerCase();
          return cat === 'perencanaan'
            ? name.includes('perencanaan') || name === 'dokumen'
            : name.includes('penilaian') || name.includes('laporan akhir');
        });
        defaultJenisId = found ? String(found.id) : String(jenisList[0].id);
      }

      const newItems = files.map(f => {
        const ext = f.name.substring(f.name.lastIndexOf('.'));
        const visName = f.name.substring(0, f.name.lastIndexOf('.'));
        return {
          id: Math.random().toString(36).substring(2, 9),
          file: f,
          namaVisual: formatFilename(visName),
          ekstensi: ext,
          jenisId: defaultJenisId,
          tematikIds: [],
          bidangUrusanIds: [],
          isPrivate: false,
          status: 'idle' as const
        };
      });

      setUploadQueue(prev => [...prev, ...newItems]);
      if (activeUploadIdx === -1) setActiveUploadIdx(0);
    }
  };

  const toggleActiveUrusan = (id: number) => {
    if (activeUploadIdx === -1) return;
    const currentItem = uploadQueue[activeUploadIdx];
    const currentIds = currentItem.bidangUrusanIds || [];
    const isSelected = currentIds.includes(id);
    const updatedIds = isSelected
        ? currentIds.filter(x => x !== id)
        : [...currentIds, id];
    updateActiveItem({ bidangUrusanIds: updatedIds });
  };

  const updateActiveItem = (updates: Partial<UploadItem>) => {
    if (activeUploadIdx === -1) return;
    setUploadQueue(prev => {
        const next = [...prev];
        next[activeUploadIdx] = { ...next[activeUploadIdx], ...updates };
        return next;
    });
  };

  const toggleActiveTematik = (id: number) => {
    if (activeUploadIdx === -1) return;
    const currentItem = uploadQueue[activeUploadIdx];
    const isSelected = currentItem.tematikIds.includes(id);
    const updatedIds = isSelected
        ? currentItem.tematikIds.filter(x => x !== id)
        : [...currentItem.tematikIds, id];
    updateActiveItem({ tematikIds: updatedIds });
  };

  const handleJenisSelectInUpload = (val: string) => {
    updateActiveItem({ jenisId: val });
  };

  const handleUpload = async () => {
    if (uploadQueue.length === 0) return;

    const invalidIdx = uploadQueue.findIndex(item => !item.jenisId);
    if (invalidIdx !== -1) {
        setActiveUploadIdx(invalidIdx);
        alert(`Harap pilih Jenis Dokumen untuk file: ${uploadQueue[invalidIdx].file.name}`);
        return;
    }

    setUploading(true);
    let successCount = 0;

    for (let i = 0; i < uploadQueue.length; i++) {
        const item = uploadQueue[i];

        setUploadQueue(prev => {
            const next = [...prev];
            next[i].status = 'uploading';
            return next;
        });

        try {
            const formData = new FormData();
            formData.append('file', item.file);
            formData.append('nama_file', item.namaVisual.trim() + item.ekstensi);
            formData.append('jenis_dokumen_id', item.jenisId);
            if (item.tematikIds.length > 0) {
                formData.append('tematik_ids', item.tematikIds.join(','));
            }
            if (item.bidangUrusanIds && item.bidangUrusanIds.length > 0) {
                formData.append('bidang_urusan_ids', item.bidangUrusanIds.join(','));
            }
            formData.append('is_private', item.isPrivate ? 'true' : 'false');

            const res = await api.dokumen.uploadWithProgress(formData, (percent) => {
                setUploadQueue(prev => {
                    const next = [...prev];
                    next[i].progress = percent;
                    return next;
                });
            });

            if (res.success && res.data) {
                successCount++;
                setUploadQueue(prev => {
                    const next = [...prev];
                    next[i].status = 'success';
                    next[i].progress = 100;
                    return next;
                });

                // Link doc to skp_pegawai_docs
                if (targetPegawaiId && targetTahun && targetKategori) {
                    await savePegawaiSkpDoc(
                      targetPegawaiId,
                      res.data.nama_file,
                      res.data.id,
                      targetTahun,
                      targetKategori,
                      selectedBidangId || currentUser?.bidang_id || 1,
                      targetKategori === 'pendukung' ? modalMonth : null
                    );
                    // Auto-pull for supervisor (Katim ke atas) when subordinate uploads
                    if (isSupervisor && targetPegawaiId !== currentUserPegawaiId) {
                      setTimeout(() => {
                        handleConsolidateSubordinatesDocs(true);
                      }, 400);
                    }
                }
            } else {
                setUploadQueue(prev => {
                    const next = [...prev];
                    next[i].status = 'error';
                    next[i].errorMsg = res.message || (res.duplicate ? 'Sudah ada di sistem' : 'Gagal');
                    return next;
                });
                if (res.duplicate) {
                    setDuplicateError(res.existing_file);
                }
            }
        } catch (err: any) {
            setUploadQueue(prev => {
                const next = [...prev];
                next[i].status = 'error';
                next[i].errorMsg = err.message || 'Kesalahan sistem';
                return next;
            });
        }
    }

    setUploading(false);
    if (successCount > 0) {
        alert(`${successCount} file berhasil diunggah!`);
        setIsUploadModalOpen(false);
        setUploadQueue([]);
        setActiveUploadIdx(-1);
        setTargetPegawaiId(null);
        setTargetKategori(null);
        setTargetTahun(null);
    }
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return <FileIcon className="text-rose-500" size={20} />;
    if (['xlsx', 'xls', 'csv'].includes(ext || '')) return <FileSpreadsheet className="text-emerald-500" size={20} />;
    if (['docx', 'doc'].includes(ext || '')) return <FileText className="text-indigo-500" size={20} />;
    if (['pptx', 'ppt'].includes(ext || '')) return <Presentation className="text-orange-500" size={20} />;
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) return <FileImage className="text-blue-500" size={20} />;
    return <FileQuestion className="text-slate-400" size={20} />;
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  const [isMonthlyDocsModalOpen, setIsMonthlyDocsModalOpen] = useState(false);

  // Persistent Client State for employees' SKPs
  const [pegawaiSkpState, setPegawaiSkpState] = useState<Record<string, PegawaiSkpRecord[]>>({});

  // Hover Tooltip positions for Perencanaan Counters in Main Table
  const [hoveredPerencanaan, setHoveredPerencanaan] = useState<{
    rect: { left: number, top: number, width: number, bottom: number, right: number },
    year: number;
    category?: 'perencanaan' | 'penilaian' | 'upload';
    monthIndex?: number;
    butirSkp?: string;
  } | null>(null);
  const tooltipTimeoutRef = useRef<any>(null);

  // Preview Modal state
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewFileUrl, setPreviewFileUrl] = useState<string | null>(null);
  const [previewFileName, setPreviewFileName] = useState<string | null>(null);
  const [previewIsPrivate, setPreviewIsPrivate] = useState<boolean>(false);
  const [previewUploadedBy, setPreviewUploadedBy] = useState<number | null>(null);

  const handlePreviewDocument = (docPath: string | null, docName: string | null, isPrivate?: boolean | number, uploadedBy?: number | null) => {
    if (!docPath) {
      alert('Dokumen tidak ditemukan atau belum diunggah secara fisik.');
      return;
    }
    setPreviewFileUrl(docPath);
    setPreviewFileName(docName || 'Dokumen SKP');
    setPreviewIsPrivate(isPrivate === 1 || isPrivate === true);
    setPreviewUploadedBy(uploadedBy || null);
    setIsPreviewOpen(true);
  };

  // Regular year detail modal
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [activeDetailType, setActiveDetailType] = useState<'perencanaan' | 'penilaian' | 'upload' | null>(null);

  const [duplicateError, setDuplicateError] = useState<{
    id: number;
    nama_file_saat_ini: string;
    nama_asli_unggah: string;
  } | null>(null);

  // Header dropdown state
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    tahun: 'Semua',
    statusPerencanaan: 'Semua',
    statusPenilaian: 'Semua'
  });

  // Dynamic Year-based generator (keeps all historical years starting from 2024 up to next year dynamically)
  const getInitialSkpRows = (): SkpRow[] => {
    const startYear = 2024;
    const currentYear = new Date().getFullYear(); // dynamically matches client's current year (e.g., 2026)
    const endYear = Math.max(currentYear + 1, 2026); // Automatically ensures next year is always included, minimum 2026

    // Generate range of cumulative years from startYear (2024) up to endYear (e.g. 2027)
    const dynamicYears: number[] = [];
    for (let yr = startYear; yr <= endYear; yr++) {
      dynamicYears.push(yr);
    }

    return dynamicYears.map(yr => {
      if (yr === 2025) {
        return {
          tahun: 2025,
          perencanaan: { status: 'Disetujui' as const, docName: 'SKP_Perencanaan_2025_V2.pdf', updated: '22 Jan 2025' },
          penilaian: { status: 'Proses' as const, docName: 'SKP_Penilaian_Akhir_2025_Draft.pdf', score: 'Dalam Proses', updated: '02 Mei 2025' },
          paririmbon: { status: 'Disetujui' as const, docName: 'Paririmbon_Aktivitas_2025.pdf', updated: '05 Apr 2025' },
          upload: { files: ['Laporan_Bulanan_Q1.pdf'], updated: '30 Apr 2025' }
        };
      }

      const isCurrent = yr === currentYear;
      return {
        tahun: yr,
        perencanaan: { status: 'Draft' as const, docName: isCurrent ? `SKP_Perencanaan_${yr}_Draft.pdf` : '', updated: isCurrent ? `05 Mei ${yr}` : '' },
        penilaian: { status: 'Draft' as const, docName: isCurrent ? `SKP_Penilaian_${yr}_Template.pdf` : '', score: 'Belum Dimulai', updated: isCurrent ? `01 Mei ${yr}` : '' },
        paririmbon: { status: 'Draft' as const, docName: isCurrent ? `Paririmbon_Aktivitas_${yr}_Draft.pdf` : '', updated: isCurrent ? `02 Mei ${yr}` : '' },
        upload: { files: [], updated: 'Belum ada berkas' }
      };
    }).sort((a, b) => b.tahun - a.tahun);
  };

  const [skpRowsState, setSkpRowsState] = useState<SkpRow[]>(() => getInitialSkpRows());
  const skpData = skpRowsState;

  // Monthly SKP Documents Tab States
  const [monthlySelectedYear, setMonthlySelectedYear] = useState<number>(() => {
    if (isPublic && publicYear) return publicYear;
    return new Date().getFullYear();
  });
  const [mappingSubKegiatans, setMappingSubKegiatans] = useState<any[]>([]);
  const [customAssignments, setCustomAssignments] = useState<any[]>([]);
  const [monthlyConfigsList, setMonthlyConfigsList] = useState<any[]>([]);
  const [skpConfigModalState, setSkpConfigModalState] = useState<{
    isOpen: boolean;
    butirSkpName: string | null;
  }>({
    isOpen: false,
    butirSkpName: null
  });

  const fetchMonthlyConfigsFromDb = async (bidangId: number) => {
    try {
      const res = await api.skp.getBidangSkpMonthlyConfigs(bidangId, undefined, monthlySelectedYear);
      if (res && res.success && Array.isArray(res.data)) {
        setMonthlyConfigsList(res.data);
      }
    } catch (err) {
      console.error('Error fetching SKP monthly configs:', err);
    }
  };

  const getSkpMonthConfigForButir = (butirSkp: string, monthIndex: number) => {
    const normName = normalizeStr(butirSkp);

    // Find matching sub_kegiatan in mappingSubKegiatans by name or code
    const matchedSubKeg = mappingSubKegiatans.find(sk => 
      normalizeStr(sk.nama_sub_kegiatan) === normName || 
      normalizeStr(`${sk.kode_sub_kegiatan || ''} ${sk.nama_sub_kegiatan || ''}`) === normName ||
      (sk.kode_sub_kegiatan && normName.includes(sk.kode_sub_kegiatan))
    );

    const found = monthlyConfigsList.find(c => {
      if (Number(c.bulan) !== Number(monthIndex)) return false;

      // Match by sub_kegiatan_id if matchedSubKeg exists
      if (matchedSubKeg && Number(c.sub_kegiatan_id) === Number(matchedSubKeg.id)) {
        return true;
      }

      // Match by butir_skp string
      if (c.butir_skp && normalizeStr(c.butir_skp) === normName) {
        return true;
      }

      // Match by code in butir_skp or sub_kegiatan_id
      if (c.sub_kegiatan_id) {
        const sk = mappingSubKegiatans.find(s => Number(s.id) === Number(c.sub_kegiatan_id));
        if (sk && (normalizeStr(sk.nama_sub_kegiatan) === normName || (sk.kode_sub_kegiatan && normName.includes(sk.kode_sub_kegiatan)))) {
          return true;
        }
      }

      return false;
    });

    if (found) {
      const isActive = found.is_active === 1 || found.is_active === true || found.is_active === '1';
      return {
        is_active: isActive,
        target_type: (found.target_type || 'output') as 'progress' | 'output',
        target_description: found.target_description || ''
      };
    }
    return { is_active: true, target_type: 'output' as 'progress' | 'output', target_description: '' };
  };

  const isUserAssignedToSubKeg = (butirSkpName: string): boolean => {
    if (!currentUser) return false;
    const currentPegawaiId = Number(currentUser.profil_pegawai_id || currentUser.pegawai_id || currentUser.id || 0);
    if (!currentPegawaiId) return false;

    const normName = normalizeStr(butirSkpName);
    const customAssign = customAssignments.find(ca => normalizeStr(ca.butir_skp) === normName);

    const emp = dbPegawaiList.find(p => Number(p.id) === currentPegawaiId);
    if (!emp) return false;

    const jab = (emp.jabatan_nama || emp.jabatan || currentUser.jabatan_nama || '').toLowerCase();
    const isEmpKabid = jab.includes('kepala bidang') || jab.includes('kabid');
    if (isEmpKabid) return true;

    if (customAssign) {
      if (customAssign.target_scope === 'bidang') return true;
      if (customAssign.target_scope === 'individu') {
        const assignedIds = Array.isArray(customAssign.assigned_pegawai_ids)
          ? customAssign.assigned_pegawai_ids.map(Number)
          : [];
        return assignedIds.includes(currentPegawaiId);
      }
      if (customAssign.target_scope === 'tim' && customAssign.target_id) {
        const assignedIds = Array.isArray(customAssign.assigned_pegawai_ids) && customAssign.assigned_pegawai_ids.length > 0
          ? customAssign.assigned_pegawai_ids.map(Number)
          : null;
        if (assignedIds !== null) {
          return assignedIds.includes(currentPegawaiId);
        }
        const pSubBidangId = Number(emp.sub_bidang_id);
        const pSubBidangIds = Array.isArray((emp as any).sub_bidang_ids)
          ? (emp as any).sub_bidang_ids.map(Number)
          : (pSubBidangId ? [pSubBidangId] : []);
        return pSubBidangIds.includes(Number(customAssign.target_id));
      }
      if (customAssign.target_scope === 'peran') {
        const isLead = [8, 5, 9, 6, 7, 10, 11, 12, 13, 14, 15, 16].includes(Number(emp.jabatan_id)) ||
               (emp.jabatan_nama && /kepala|kabid|katim|sekretaris|direktur/i.test(emp.jabatan_nama));
        return isLead;
      }
    }

    if (mappingSubKegiatans.length > 0) {
      const match = mappingSubKegiatans.find(sk => 
        normalizeStr(sk.nama_sub_kegiatan) === normName ||
        normalizeStr(`${sk.kode_sub_kegiatan || ''} ${sk.nama_sub_kegiatan || ''}`) === normName ||
        (sk.kode_sub_kegiatan && normName.includes(sk.kode_sub_kegiatan))
      );
      if (match && match.penanggung_jawab_id) {
        if (Number(match.penanggung_jawab_id) === currentPegawaiId) return true;
        const pj = dbPegawaiList.find(p => Number(p.id) === Number(match.penanggung_jawab_id));
        if (pj && pj.sub_bidang_id) {
          const pSubBidangId = Number(emp.sub_bidang_id);
          const pSubBidangIds = Array.isArray((emp as any).sub_bidang_ids)
            ? (emp as any).sub_bidang_ids.map(Number)
            : (pSubBidangId ? [pSubBidangId] : []);
          return pSubBidangIds.includes(Number(pj.sub_bidang_id));
        }
      }
    }

    return false;
  };

  const [assignmentModalOpen, setAssignmentModalOpen] = useState(false);
  const [assignmentButirSkp, setAssignmentButirSkp] = useState<string | null>(null);
  const [assignmentTargetScope, setAssignmentTargetScope] = useState<'bidang' | 'tim' | 'peran' | 'individu'>('bidang');
  const [assignmentTargetId, setAssignmentTargetId] = useState<number | null>(null);
  const [assignmentPegawaiIds, setAssignmentPegawaiIds] = useState<number[]>([]);
  const [isSavingAssignment, setIsSavingAssignment] = useState(false);
  const [manualSkpItems, setManualSkpItems] = useState<Record<number, string[]>>(() => {
    try {
      const saved = localStorage.getItem('skp_manual_skp_items');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to parse manual skp items:', e);
    }
    return {};
  });
  const [deletedSkpItems, setDeletedSkpItems] = useState<Record<number, string[]>>(() => {
    try {
      const saved = localStorage.getItem('skp_deleted_items');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to parse deleted skp items:', e);
    }
    return {};
  });
  const [addButirMode, setAddButirMode] = useState<'subkegiatan' | 'manual'>('subkegiatan');
  const [selectedSubKegName, setSelectedSubKegName] = useState('');
  const [isAddingManualItem, setIsAddingManualItem] = useState(false);
  const [newManualItemName, setNewManualItemName] = useState('');
  const [editingManualItemName, setEditingManualItemName] = useState<string | null>(null);
  const [tempManualItemEditName, setTempManualItemEditName] = useState<string>('');
  const [monthlyLinks, setMonthlyLinks] = useState<Record<string, string>>({});
  const [editingMonthlyCell, setEditingMonthlyCell] = useState<{
    year: number;
    bidangId: number;
    itemName: string;
    month: string;
  } | null>(null);
  const [tempMonthlyLinkValue, setTempMonthlyLinkValue] = useState('');
  const [copiedCell, setCopiedCell] = useState<string | null>(null);
  const [copiedPublicYear, setCopiedPublicYear] = useState<number | null>(null);

  // Paririmbon links state - loaded from database
  const [paririmbonLinks, setParirimbonLinks] = useState<Record<string, string>>({});
  const [isParirimbonModalOpen, setIsParirimbonModalOpen] = useState(false);
  const [paririmbonEditYear, setParirimbonEditYear] = useState<number | string | null>(null);
  const [paririmbonInputLink, setParirimbonInputLink] = useState('');

  // Paririmbon link change history state
  const [paririmbonHistory, setParirimbonHistory] = useState<Record<string, any[]>>(() => {
    try {
      const saved = localStorage.getItem('skp_paririmbon_history');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to parse paririmbon history:', e);
    }
    return {};
  });

  const [hoveredParirimbon, setHoveredParirimbon] = useState<{
    rect: { left: number; top: number; width: number; bottom: number; right: number };
    year: number | string;
    history: any[];
  } | null>(null);

  const paririmbonEnterTimeoutRef = useRef<any>(null);
  const paririmbonLeaveTimeoutRef = useRef<any>(null);

  const ensureAbsoluteUrl = (url: string): string => {
    if (!url) return '';
    const trimmed = url.trim();
    if (/^https?:\/\//i.test(trimmed)) {
      return trimmed;
    }
    return `https://${trimmed}`;
  };

  const openParirimbonEditModal = (year: number | string) => {
    setParirimbonEditYear(year);
    const key = year === 'contoh' ? `contoh_${selectedBidangId || 1}` : `${year}_${selectedBidangId || 1}`;
    setParirimbonInputLink(paririmbonLinks[key] || '');
    setIsParirimbonModalOpen(true);
  };

  const handleSaveParirimbonLink = async () => {
    if (paririmbonEditYear === null || paririmbonEditYear === undefined) return;
    const bidId = selectedBidangId || 1;
    const isContoh = paririmbonEditYear === 'contoh';
    const key = isContoh ? `contoh_${bidId}` : `${paririmbonEditYear}_${bidId}`;
    const newLink = paririmbonInputLink.trim();
    const previousLink = paririmbonLinks[key] || '';

    // Record to history if link actually changed
    if (newLink !== previousLink) {
      const newEntry = {
        url: newLink || '(dihapus)',
        updatedAt: new Date().toLocaleDateString('id-ID', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }),
        updatedBy: currentUser?.nama_lengkap || 'Pengguna'
      };

      const currentHistory = paririmbonHistory[key] || [];
      const updatedHistory = [newEntry, ...currentHistory].slice(0, 10);
      const newHistoryState = { ...paririmbonHistory, [key]: updatedHistory };

      setParirimbonHistory(newHistoryState);
      localStorage.setItem('skp_paririmbon_history', JSON.stringify(newHistoryState));
    }

    // Update local state immediately
    const updatedLinks = { ...paririmbonLinks, [key]: newLink };
    setParirimbonLinks(updatedLinks);
    setIsParirimbonModalOpen(false);

    // Save to database
    try {
      await (api as any).skp.saveParirimbonLink({
        tahun: isContoh ? 0 : Number(paririmbonEditYear),
        bidang_id: bidId,
        is_contoh: isContoh ? 1 : 0,
        link_url: newLink,
        updated_by: currentUser?.id || null
      });
    } catch (err) {
      console.error('Failed to save paririmbon link to database:', err);
    }

    // Refresh summary view to reflect updated Paririmbon status
    fetchSummaryFromDb(bidId, updatedLinks);
  };

  const handleParirimbonMouseEnter = (e: React.MouseEvent, year: number | string) => {
    if (paririmbonLeaveTimeoutRef.current) {
      clearTimeout(paririmbonLeaveTimeoutRef.current);
      paririmbonLeaveTimeoutRef.current = null;
    }

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const bidId = selectedBidangId || 1;
    const key = year === 'contoh' ? `contoh_${bidId}` : `${year}_${bidId}`;
    const history = paririmbonHistory[key] || [];

    paririmbonEnterTimeoutRef.current = setTimeout(() => {
      setHoveredParirimbon({
        rect: {
          left: rect.left,
          top: rect.top,
          width: rect.width,
          bottom: rect.bottom,
          right: rect.right
        },
        year,
        history
      });
    }, 700); // 0.7s enter delay
  };

  const handleParirimbonMouseLeave = () => {
    if (paririmbonEnterTimeoutRef.current) {
      clearTimeout(paririmbonEnterTimeoutRef.current);
      paririmbonEnterTimeoutRef.current = null;
    }

    paririmbonLeaveTimeoutRef.current = setTimeout(() => {
      setHoveredParirimbon(null);
    }, 500); // 0.5s leave delay
  };

  const handleParirimbonTooltipMouseEnter = () => {
    if (paririmbonLeaveTimeoutRef.current) {
      clearTimeout(paririmbonLeaveTimeoutRef.current);
      paririmbonLeaveTimeoutRef.current = null;
    }
  };

  const handleParirimbonTooltipMouseLeave = () => {
    if (paririmbonEnterTimeoutRef.current) {
      clearTimeout(paririmbonEnterTimeoutRef.current);
      paririmbonEnterTimeoutRef.current = null;
    }
    paririmbonLeaveTimeoutRef.current = setTimeout(() => {
      setHoveredParirimbon(null);
    }, 500);
  };

  const getParirimbonTooltipStyle = (): React.CSSProperties => {
    if (!hoveredParirimbon || !hoveredParirimbon.rect) return { visibility: 'hidden' };

    const { rect } = hoveredParirimbon;
    const tooltipWidth = 340;
    const estimatedHeight = 220; // Estimated height for history log tooltip
    const padding = 20;

    let leftPos = rect.left + rect.width / 2 - (tooltipWidth / 2);

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
      topPos = rect.bottom + 4;
      transform = 'translateY(0)';
    } else {
      topPos = rect.top - 4;
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

  // Fetch profiles, divisions, and library documents
  const loadDatabaseResources = async () => {
    setIsLoadingDb(true);
    try {
      if (isPublic) {
        const [pegawaiRes, bidangRes, mkiRes] = await Promise.all([
          api.skp.getPublicPegawai(),
          api.skp.getPublicBidang(),
          api.skp.getPublicMapping()
        ]);
        if (pegawaiRes.success) {
          const filteredPegawai = (pegawaiRes.data || []).filter((p: any) =>
            p.jenis_pegawai_nama === 'PNS' || p.jenis_pegawai_nama === 'PPPK Penuh Waktu'
          );
          setDbPegawaiList(filteredPegawai);
        }
        if (bidangRes.success) setDbBidangList(bidangRes.data || []);
        if (mkiRes && mkiRes.success && mkiRes.data) {
          setMappingSubKegiatans(mkiRes.data.sub_kegiatan || []);
        }
      } else {
        const [pegawaiRes, bidangRes, mkiRes, jenisRes, tematikRes] = await Promise.all([
          api.profilPegawai.getAll(),
          api.bidangInstansi.getAll(),
          api.mappingKegiatanInstansi.getAll(),
          api.masterDataConfig.getDataByTable('master_dokumen'),
          api.tematik.getAll()
        ]);

        if (pegawaiRes.success) {
          const filteredPegawai = (pegawaiRes.data || []).filter((p: any) =>
            p.jenis_pegawai_nama === 'PNS' || p.jenis_pegawai_nama === 'PPPK Penuh Waktu'
          );
          setDbPegawaiList(filteredPegawai);
        }
        if (bidangRes.success) setDbBidangList(bidangRes.data || []);
        if (mkiRes && mkiRes.success && mkiRes.data) {
          setMappingSubKegiatans(mkiRes.data.sub_kegiatan || []);
        }
        if (jenisRes.success) {
          const sorted = (jenisRes.data || []).sort((a: any, b: any) => {
            const isASurat = a.dokumen?.toLowerCase().startsWith('surat');
            const isBSurat = b.dokumen?.toLowerCase().startsWith('surat');
            if (isASurat && !isBSurat) return 1;
            if (!isASurat && isBSurat) return -1;
            return a.dokumen?.localeCompare(b.dokumen || '') || 0;
          });
          setJenisList(sorted);
        }
        if (tematikRes.success) setTematikList(tematikRes.data || []);
      }
    } catch (err) {
      console.error('Failed to load DB resources for SKP:', err);
    } finally {
      setIsLoadingDb(false);
    }
  };

  useEffect(() => {
    loadDatabaseResources();
  }, []);

  // Fetch library documents on-demand when the picker opens
  useEffect(() => {
    if (isLibPickerOpen) {
      setIsLibraryLoading(true);
      api.dokumen.getAll()
        .then(res => {
          if (res.success) {
            setLibraryDocs(res.data || []);
          }
        })
        .catch(err => {
          console.error('Failed to load library documents on demand:', err);
        })
        .finally(() => {
          setIsLibraryLoading(false);
        });
    }
  }, [isLibPickerOpen]);

  useEffect(() => {
    if (isPerencanaanModalOpen && modalYear) {
      (async () => {
        try {
          const res = await api.skp.getHistory(modalYear, selectedBidangId || 1);
          if (res.success) {
            setHistoryList(res.data || []);
          }
        } catch (err) {
          console.error('Failed to auto-fetch history:', err);
        }
      })();
    }
  }, [isPerencanaanModalOpen, modalYear, selectedBidangId]);

  // Handle clicking outside of dropdowns / tooltip to close them
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        const target = event.target as HTMLElement;
        if (uploadTagRef.current && !uploadTagRef.current.contains(target)) setIsUploadTagOpen(false);
        if (uploadJenisRef.current && !uploadJenisRef.current.contains(target)) setIsUploadJenisOpen(false);
        // Close audit tooltip if clicking outside tooltip AND outside any badge trigger
        if (
          tooltipRef.current &&
          !tooltipRef.current.contains(target) &&
          !target.closest('[data-tooltip-trigger="audit"]')
        ) {
          setHoveredPerencanaan(null);
        }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Escape') setHoveredPerencanaan(null);
    };
    document.addEventListener('mousedown', handleClickOutside, true);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Set default division filter based on current user or public URL params
  useEffect(() => {
    if (isPublic) {
      if (publicBidangId) {
        setSelectedBidangId(publicBidangId);
      } else if (dbBidangList.length > 0) {
        setSelectedBidangId(Number(dbBidangList[0].id));
      }
      setActiveTab('monthly_docs');
    } else {
      if (currentUser?.bidang_id) {
        setSelectedBidangId(Number(currentUser.bidang_id));
      } else if (dbBidangList.length > 0) {
        setSelectedBidangId(Number(dbBidangList[0].id));
      }
    }
  }, [currentUser, dbBidangList, isPublic, publicBidangId]);

  // Enforce bidang lock for non-authorized users
  useEffect(() => {
    if (!isPublic && !canChangeBidang && currentUser?.bidang_id) {
      const userBidangId = Number(currentUser.bidang_id);
      if (selectedBidangId !== userBidangId) {
        setSelectedBidangId(userBidangId);
      }
    }
  }, [currentUser, selectedBidangId, isPublic, canChangeBidang]);

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

  // Fetch actual SKP records from DB
    // Uses dbPegawaiList (PNS/PPPK Penuh Waktu) as the base so total always reflects all eligible employees
  const fetchSkpRecordsFromDb = async (year: number, bidangId: number) => {
    // Always build from dbPegawaiList or fallback list so total count is always correct
    let eligibleEmployees = dbPegawaiList.filter(p => Number(p.bidang_id) === Number(bidangId));
    if (eligibleEmployees.length === 0) {
      eligibleEmployees = getEmployeesForBidang(Number(bidangId));
    }

    let dbRecords: any[] = [];
    let dbPendukung: any[] = [];
    try {
      if ((api as any).skp) {
        const res = await (api as any).skp.getPegawaiRecords(year, bidangId);
        if (res && res.success && res.data) {
          if (Array.isArray(res.data)) {
            dbRecords = res.data;
          } else {
            dbRecords = res.data.records || [];
            dbPendukung = res.data.pendukung || [];
          }
        }
      }
    } catch (err) {
      console.warn('SKP API not available, showing all employees as not yet submitted:', err);
    }

    const records: PegawaiSkpRecord[] = eligibleEmployees.map(emp => {
      const dbRow = dbRecords.find((r: any) => Number(r.pegawaiId) === Number(emp.id)) || null;
      const empPendukung = dbPendukung.filter((p: any) => Number(p.pegawaiId) === Number(emp.id));
      
      return {
        pegawaiId: Number(emp.id),
        namaPegawai: emp.nama_lengkap || emp.nama || String(emp.id),
        jabatan: emp.jabatan_nama || 'Fungsional Umum',
        bidangId: Number(emp.bidang_id),
        perencanaanDocName: dbRow?.perencanaanDocName || null,
        perencanaanDocId: dbRow?.perencanaanDocId || null,
        perencanaanDocPath: dbRow?.perencanaanDocPath || null,
        perencanaanUpdatedAt: dbRow?.perencanaanUpdatedAt ? new Date(dbRow.perencanaanUpdatedAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : null,
        penilaianDocName: dbRow?.penilaianDocName || null,
        penilaianDocId: dbRow?.penilaianDocId || null,
        penilaianDocPath: dbRow?.penilaianDocPath || null,
        penilaianUpdatedAt: dbRow?.penilaianUpdatedAt ? new Date(dbRow.penilaianUpdatedAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : null,
        pendukungDocName: null,
        pendukungDocId: null,
        pendukungDocPath: null,
        pendukungUpdatedAt: null,
        pendukungList: empPendukung
      };
    });

    const key = `${year}_${bidangId}`;
    setPegawaiSkpState(prev => ({ ...prev, [key]: records }));
  };

  // Fetch paririmbon links from database for a given bidang
  const fetchParirimbonLinksFromDb = async (bidangId: number): Promise<Record<string, string>> => {
    try {
      const res = await (api as any).skp.getParirimbonLinks(bidangId);
      if (res && res.success && res.data) {
        const links: Record<string, string> = {};
        (res.data as any[]).forEach((row: any) => {
          const key = row.is_contoh ? `contoh_${bidangId}` : `${row.tahun}_${bidangId}`;
          if (row.link_url) links[key] = row.link_url;
        });
        setParirimbonLinks(links);
        return links;
      }
    } catch (err) {
      console.error('Failed to fetch paririmbon links from database:', err);
    }
    return {};
  };


  // Fetch summary from DB
  const fetchSummaryFromDb = async (bidangId: number, preloadedLinks?: Record<string, string>) => {
    // Always ensure paririmbon links are loaded (independently of getSummary)
    if (!preloadedLinks) {
      fetchParirimbonLinksFromDb(bidangId); // fire-and-forget, updates state directly
    }

    try {
      fetchMonthlyConfigsFromDb(bidangId);
      api.skp.getCustomAssignments(bidangId).then(aRes => {
        if (aRes && aRes.success && Array.isArray(aRes.data)) {
          setCustomAssignments(aRes.data);
        }
      }).catch(err => console.error('Error fetching custom assignments:', err));

      const res = await api.skp.getSummary(bidangId);
      if (res && res.success && res.data) {
        // Use preloaded links or current state
        const linksToUse = preloadedLinks || {};
        const mappedRows: SkpRow[] = res.data.map((row: any) => {
          const paririmbonKey = `${row.tahun}_${bidangId}`;
          const hasLink = !!linksToUse[paririmbonKey];

          return {
            tahun: row.tahun,
            perencanaan: {
              status: row.perencanaan.status as 'Disetujui' | 'Draft' | 'Revisi',
              docName: row.perencanaan.submitted > 0 ? `Terkumpul: ${row.perencanaan.submitted}/${row.perencanaan.total}` : 'Belum ada',
              updated: ''
            },
            penilaian: {
              status: row.penilaian.status as 'Disetujui' | 'Draft' | 'Proses',
              docName: row.penilaian.submitted > 0 ? `Terkumpul: ${row.penilaian.submitted}/${row.penilaian.total}` : 'Belum ada',
              score: row.penilaian.status === 'Disetujui' ? 'Selesai' : 'Belum Selesai',
              updated: ''
            },
            paririmbon: {
              status: (hasLink ? 'Disetujui' : 'Draft') as 'Disetujui' | 'Draft',
              docName: linksToUse[paririmbonKey] || '',
              updated: ''
            },
            upload: {
              files: Array(row.upload.count).fill('File'),
              updated: ''
            }
          };
        });
        mappedRows.sort((a, b) => b.tahun - a.tahun);
        setSkpRowsState(mappedRows);
      }
    } catch (err) {
      console.error('Error fetching SKP summary (getSummary):', err);
      // Don't alert - paririmbon links are loaded independently above
    }
  };

  // Pre-populate all years immediately on mount/bidang change so the table is loaded
  useEffect(() => {
    const bidId = selectedBidangId || (currentUser?.bidang_id ? Number(currentUser.bidang_id) : 1);
    if (bidId && dbPegawaiList.length > 0) {
      const years = [2024, 2025, 2026, 2027];
      years.forEach(yr => {
        fetchSkpRecordsFromDb(yr, bidId);
      });
      fetchSummaryFromDb(bidId);
    }
  }, [selectedBidangId, dbPegawaiList.length]);

  const getActiveRecords = (): PegawaiSkpRecord[] => {
    if (!modalYear || !selectedBidangId) return [];
    const key = `${modalYear}_${selectedBidangId}`;
    return pegawaiSkpState[key] || [];
  };

  // Helper to normalize strings (converting all newlines, tabs, and multiple spaces into a single space)
  const normalizeStr = (s: string | null | undefined): string => {
    return (s || '').replace(/\s+/g, ' ').trim().toLowerCase();
  };

  // Helper to strip leading 4-digit code prefixes (e.g. "0004 - ") for robust subkegiatan matching
  const stripCodePrefix = (s: string | null | undefined): string => {
    if (!s) return '';
    return (s || '')
      .replace(/^[\d\s.-]+/, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  };

  // Helper to match supporting document with robust type casting and whitespace normalization
  const matchPendukungDoc = (p: any, targetBulan: number | null, targetButirSkp: string | null): boolean => {
    if (!p) return false;
    if (targetBulan !== null && targetBulan !== undefined) {
      if (Number(p.bulan) !== Number(targetBulan)) return false;
    }
    if (targetButirSkp !== null && targetButirSkp !== undefined) {
      const pRaw = (p.butirSkp || p.butir_skp || '');
      const tRaw = (targetButirSkp || '');
      if (!pRaw || !tRaw) return false;

      const pNorm = normalizeStr(pRaw);
      const tNorm = normalizeStr(tRaw);

      const pClean = stripCodePrefix(pRaw);
      const tClean = stripCodePrefix(tRaw);

      const isMatch = 
        pNorm === tNorm || 
        pClean === tClean || 
        (pClean.length > 5 && tClean.includes(pClean)) || 
        (tClean.length > 5 && pClean.includes(tClean)) ||
        (pNorm.length > 5 && tNorm.includes(pNorm)) ||
        (tNorm.length > 5 && pNorm.includes(tNorm));

      if (!isMatch) return false;
    }
    return true;
  };

  // Helper to filter staff records based on custom assignment or team penanggung jawab
  const filterRecordsForButirSkp = (records: PegawaiSkpRecord[], butirSkp: string): PegawaiSkpRecord[] => {
    if (!butirSkp || records.length === 0) return records;

    const normButirSkp = normalizeStr(butirSkp);
    const cleanButirSkp = stripCodePrefix(butirSkp);

    const customAssign = customAssignments.find(ca => {
      const caNorm = normalizeStr(ca.butir_skp);
      const caClean = stripCodePrefix(ca.butir_skp);
      return caNorm === normButirSkp || caClean === cleanButirSkp || (cleanButirSkp.length > 5 && caClean.includes(cleanButirSkp));
    });

    let targetSubBidangId: number | null = null;
    if (!customAssign && mappingSubKegiatans.length > 0) {
      const match = mappingSubKegiatans.find(sk => {
        const skNorm = normalizeStr(sk.nama_sub_kegiatan);
        const skClean = stripCodePrefix(sk.nama_sub_kegiatan);
        return skNorm === normButirSkp || skClean === cleanButirSkp || (cleanButirSkp.length > 5 && cleanButirSkp.includes(skClean));
      });
      if (match && match.penanggung_jawab_id) {
        const pj = dbPegawaiList.find(p => Number(p.id) === Number(match.penanggung_jawab_id));
        if (pj && pj.sub_bidang_id) {
          targetSubBidangId = Number(pj.sub_bidang_id);
        }
      }
    }

    if (!customAssign && !targetSubBidangId) {
      return records;
    }

    return records.filter(r => {
      const p = dbPegawaiList.find(x => Number(x.id) === Number(r.pegawaiId));

      // Kepala Bidang (Kabid) is ALWAYS included in every team / SKP item as Penanggung Jawab Bidang
      if (p) {
        const jab = (p.jabatan_nama || (p as any).jabatan || '').toLowerCase();
        if (jab.includes('kepala bidang') || jab.includes('kabid')) {
          return true;
        }
      }

      if (customAssign) {
        if (customAssign.target_scope === 'individu') {
          const assignedIds = Array.isArray(customAssign.assigned_pegawai_ids)
            ? customAssign.assigned_pegawai_ids.map(Number)
            : [];
          if (!assignedIds.includes(Number(r.pegawaiId))) return false;
        } else if (customAssign.target_scope === 'tim' && customAssign.target_id) {
          const assignedIds = Array.isArray(customAssign.assigned_pegawai_ids) && customAssign.assigned_pegawai_ids.length > 0
            ? customAssign.assigned_pegawai_ids.map(Number)
            : null;

          if (assignedIds !== null) {
            if (!assignedIds.includes(Number(r.pegawaiId))) return false;
          } else if (p) {
            const pSubBidangId = Number(p.sub_bidang_id);
            const pSubBidangIds = Array.isArray((p as any).sub_bidang_ids)
              ? (p as any).sub_bidang_ids.map(Number)
              : (pSubBidangId ? [pSubBidangId] : []);
            const isTeamMember = pSubBidangIds.includes(Number(customAssign.target_id));
            if (!isTeamMember) return false;
          } else {
            return false;
          }
        } else if (customAssign.target_scope === 'peran') {
          if (p) {
            const isLead = [8, 5, 9, 6, 7, 10, 11, 12, 13, 14, 15, 16].includes(Number(p.jabatan_id)) ||
                           (p.jabatan_nama && /kepala|kabid|katim|sekretaris|direktur/i.test(p.jabatan_nama));
            if (!isLead) return false;
          }
        }
      } else if (targetSubBidangId) {
        if (p) {
          const pSubBidangId = Number(p.sub_bidang_id);
          const pSubBidangIds = Array.isArray((p as any).sub_bidang_ids)
            ? (p as any).sub_bidang_ids.map(Number)
            : (pSubBidangId ? [pSubBidangId] : []);
          if (!pSubBidangIds.includes(targetSubBidangId)) {
            return false;
          }
        }
      }

      return true;
    });
  };

  // Helper to fetch ratio for main table columns
  const getYearSubmissionRatio = (year: number, category: 'perencanaan' | 'penilaian' | 'upload' = 'perencanaan'): { submitted: number; total: number } => {
    const bid = selectedBidangId || (currentUser?.bidang_id ? Number(currentUser.bidang_id) : 1);
    const key = `${year}_${bid}`;
    const records = pegawaiSkpState[key] || (currentUser?.bidang_id ? pegawaiSkpState[`${year}_${currentUser.bidang_id}`] : undefined) || [];
    if (records.length === 0) {
      return { submitted: 0, total: 0 };
    }
    const submitted = records.filter(r => {
      if (category === 'perencanaan') return r.perencanaanDocName !== null && r.perencanaanDocName !== undefined;
      if (category === 'penilaian') return r.penilaianDocName !== null && r.penilaianDocName !== undefined;
      return r.pendukungList && r.pendukungList.some((p: any) => p.docName !== null && p.docName !== undefined && p.docName !== 'null' && String(p.docName).trim() !== '');
    }).length;
    const total = records.length;
    return { submitted, total };
  };

  const getMonthSubmissionRatio = (year: number, monthIndex: number, butirSkp: string): { submitted: number; total: number } => {
    const bid = selectedBidangId || (currentUser?.bidang_id ? Number(currentUser.bidang_id) : 1);
    const key = `${year}_${bid}`;
    const rawRecords = pegawaiSkpState[key] || (currentUser?.bidang_id ? pegawaiSkpState[`${year}_${currentUser.bidang_id}`] : undefined) || [];
    if (rawRecords.length === 0) {
      return { submitted: 0, total: 0 };
    }
    const records = filterRecordsForButirSkp(rawRecords, butirSkp);
    if (records.length === 0) {
      return { submitted: 0, total: 0 };
    }
    const submitted = records.filter(r => {
      const hasDoc = r.pendukungList?.some((p: any) => 
        matchPendukungDoc(p, monthIndex, butirSkp) && 
        p.docName !== null && p.docName !== undefined && p.docName !== 'null' && String(p.docName).trim() !== ''
      );
      return hasDoc;
    }).length;
    const total = records.length;
    return { submitted, total };
  };

  // Save or update SKP document in database
  const savePegawaiSkpDoc = async (
    pegawaiId: number,
    docName: string | null,
    docId: number | null,
    year?: number,
    category?: 'perencanaan' | 'penilaian' | 'pendukung',
    bidangId?: number,
    bulan?: number | null,
    butirSkp?: string | null,
    silent = false
  ) => {
    const yr = year || modalYear;
    let cat: 'perencanaan' | 'penilaian' | 'pendukung' = (category || modalType) as any;
    if ((cat as string) === 'upload') cat = 'pendukung';
    const bid = bidangId || selectedBidangId || currentUser?.bidang_id || 1;

    if (!yr || !bid) return;

    // Use monthly & butir_skp context if category is pendukung/upload
    const targetBulan = cat === 'pendukung' ? (bulan !== undefined ? bulan : modalMonth) : null;
    const targetButirSkp = cat === 'pendukung' ? (butirSkp !== undefined ? butirSkp : modalButirSkp) : null;

    try {
      const payload = {
        pegawai_id: pegawaiId,
        tahun: yr,
        bidang_id: bid,
        kategori: cat,
        bulan: targetBulan,
        butir_skp: targetButirSkp,
        doc_name: docName,
        doc_id: docId || null,
        status: docName ? 'Draft' : 'Draft'
      };
      const res = await api.skp.savePegawaiRecord(payload);
      if (res && res.success) {
        // Refetch to sync state
        fetchSkpRecordsFromDb(yr, bid);
        fetchSummaryFromDb(bid);
        window.dispatchEvent(new CustomEvent('skp-update'));
        // Sync history logs immediately
        try {
          const histRes = await api.skp.getHistory(yr, bid);
          if (histRes.success) {
            setHistoryList(histRes.data || []);
          }
        } catch (err) {
          console.error('Failed to sync history after save:', err);
        }
      } else if (!silent) {
        alert(res?.message || 'Gagal menyimpan dokumen SKP');
      }
    } catch (err: any) {
      console.error('Failed to save pegawai SKP record:', err);
      if (!silent) {
        alert('Terjadi kesalahan saat menyimpan dokumen: ' + err.message);
      }
    }
  };

  // Handle local File Upload (Supports Multi-file Selection)
  const handleLocalSkpUpload = (e: React.ChangeEvent<HTMLInputElement>, pegawaiId: number) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);

      let defaultJenisId = '';
      if (jenisList && jenisList.length > 0) {
        const found = jenisList.find(j => {
          const name = j.dokumen.toLowerCase();
          if (modalType === 'perencanaan') {
            return name.includes('perencanaan') || name === 'dokumen';
          } else if (modalType === 'penilaian') {
            return name.includes('penilaian') || name.includes('laporan akhir');
          } else {
            return name.includes('pendukung') || name.includes('bahan') || name.includes('upload');
          }
        });
        defaultJenisId = found ? String(found.id) : String(jenisList[0].id);
      }

      const newItems = files.map(file => {
        const extension = file.name.substring(file.name.lastIndexOf('.'));
        const visualName = file.name.substring(0, file.name.lastIndexOf('.'));
        return {
          id: Math.random().toString(36).substring(2, 9),
          file: file,
          namaVisual: formatFilename(visualName),
          ekstensi: extension,
          jenisId: defaultJenisId,
          tematikIds: [],
          bidangUrusanIds: [] as number[],
          isPrivate: false,
          status: 'idle' as const
        };
      });

      setUploadQueue(newItems);
      setActiveUploadIdx(0);
      setTargetPegawaiId(pegawaiId);
      setTargetKategori(modalType === 'upload' ? 'pendukung' : modalType);
      setTargetTahun(modalYear);
      setIsUploadModalOpen(true);

      e.target.value = '';
    }
  };

  const handleAppendFilesToQueue = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      let defaultJenisId = '';
      if (jenisList && jenisList.length > 0) {
        defaultJenisId = String(jenisList[0].id);
      }
      const newItems = files.map(file => {
        const extension = file.name.substring(file.name.lastIndexOf('.'));
        const visualName = file.name.substring(0, file.name.lastIndexOf('.'));
        return {
          id: Math.random().toString(36).substring(2, 9),
          file: file,
          namaVisual: formatFilename(visualName),
          ekstensi: extension,
          jenisId: defaultJenisId,
          tematikIds: [],
          bidangUrusanIds: [] as number[],
          isPrivate: false,
          status: 'idle' as const
        };
      });
      setUploadQueue(prev => [...prev, ...newItems]);
      if (activeUploadIdx === -1) setActiveUploadIdx(0);
      e.target.value = '';
    }
  };

  // Handle Select Library Document Picker
  const openLibPicker = (pegawaiId: number) => {
    setPickerTargetPegawaiId(pegawaiId);
    setLibSelectedDocs([]);
    setIsLibPickerOpen(true);
  };

  // Toggle a document in/out of the multi-select list
  const toggleLibDocument = (doc: any) => {
    setLibSelectedDocs(prev => {
      const exists = prev.some(d => d.id === doc.id);
      if (exists) return prev.filter(d => d.id !== doc.id);
      return [...prev, doc];
    });
  };

  // Confirm and save all selected library documents
  const confirmLibSelection = async () => {
    if (!pickerTargetPegawaiId || libSelectedDocs.length === 0) return;
    for (const doc of libSelectedDocs) {
      await savePegawaiSkpDoc(
        pickerTargetPegawaiId,
        doc.nama_file || doc.dokumen,
        doc.id,
        modalYear || undefined,
        modalType === 'upload' ? 'pendukung' : modalType,
        selectedBidangId || undefined,
        modalType === 'upload' ? modalMonth : null,
        modalType === 'upload' ? modalButirSkp : null
      );
    }
    // Auto-pull for Katim ke atas when subordinate claims doc from library
    if (isSupervisor && pickerTargetPegawaiId !== currentUserPegawaiId) {
      setTimeout(() => {
        handleConsolidateSubordinatesDocs(true);
      }, 300);
    }
    setIsLibPickerOpen(false);
    setPickerTargetPegawaiId(null);
    setLibSelectedDocs([]);
  };

  const removeSkpDocument = async (pegawaiId: number, docId: number | null, docName: string | null) => {
    if (!docId) {
      await savePegawaiSkpDoc(
        pegawaiId,
        null,
        null,
        modalYear || undefined,
        modalType === 'upload' ? 'pendukung' : modalType,
        selectedBidangId || undefined,
        modalType === 'upload' ? modalMonth : null
      );
      return;
    }

    // Check if this document has been pulled by superior or other team members
    const isPulled = assignedRecords.some(
      r => r.pegawaiId !== pegawaiId && r.pendukungList?.some((p: any) => p.docId === docId)
    );

    setConfirmDeleteDoc({ pegawaiId, docId, docName, isPulled });
  };

  const processSkpDocRemoval = async (action: 'trash' | 'unlink') => {
    if (!confirmDeleteDoc) return;
    const { pegawaiId, docId } = confirmDeleteDoc;

    try {
      if (action === 'trash') {
        const res = await api.dokumen.delete(docId);
        if (!res || !res.success) {
          alert(res?.message || 'Gagal memindahkan file ke tempat sampah');
          return;
        }
      }

      // Unlink the document from the SKP record
      await savePegawaiSkpDoc(
        pegawaiId,
        null,
        docId, // Pass the specific docId to unlink
        modalYear || undefined,
        modalType === 'upload' ? 'pendukung' : modalType,
        selectedBidangId || undefined,
        modalType === 'upload' ? modalMonth : null
      );
    } catch (err: any) {
      console.error('Failed to remove SKP document:', err);
      alert('Terjadi kesalahan saat menghapus dokumen: ' + err.message);
    } finally {
      setConfirmDeleteDoc(null);
    }
  };

  const openHistoryModal = async () => {
    setIsHistoryOpen(true);
    setIsHistoryLoading(true);
    try {
      const yr = activeTab === 'summary' ? selectedYear : monthlySelectedYear;
      const res = await api.skp.getHistory(yr, selectedBidangId || 1);
      if (res.success) {
        setHistoryList(res.data || []);
      }
    } catch (err) {
      console.error('Failed to load SKP history:', err);
    } finally {
      setIsHistoryLoading(false);
    }
  };

  const handleConsolidateSubordinatesDocs = async (silent = false) => {
    if (!currentUserPegawaiId || !modalYear || !modalMonth || !modalButirSkp) {
      if (!silent) alert("Parameter tidak lengkap untuk konsolidasi.");
      return;
    }

    const otherStaff = filteredModalStaff.filter(r => r.pegawaiId !== currentUserPegawaiId);
    const docsToPull: Array<{ docId: number; docName: string }> = [];

    otherStaff.forEach(r => {
      const foundDocs = r.pendukungList?.filter(
        (p: any) => matchPendukungDoc(p, modalMonth, modalButirSkp)
      ) || [];
      foundDocs.forEach((p: any) => {
        if (p.docId && p.docName) {
          if (!docsToPull.some(d => d.docId === p.docId)) {
            docsToPull.push({ docId: p.docId, docName: p.docName });
          }
        }
      });
    });

    if (docsToPull.length === 0) {
      if (!silent) alert("Tidak ditemukan berkas tim untuk dikonsolidasikan pada bulan dan butir SKP ini.");
      return;
    }

    const currentUserRecord = filteredModalStaff.find(r => r.pegawaiId === currentUserPegawaiId);
    const currentUserDocs = currentUserRecord?.pendukungList?.filter(
      (p: any) => matchPendukungDoc(p, modalMonth, modalButirSkp)
    ) || [];
    const currentUserDocIds = currentUserDocs.map((p: any) => p.docId);

    const newDocsToPull = docsToPull.filter(d => !currentUserDocIds.includes(d.docId));

    if (newDocsToPull.length === 0) {
      if (!silent) alert("Semua berkas tim sudah dikonsolidasikan ke dalam SKP Anda.");
      return;
    }

    if (!silent && !confirm(`Tarik ${newDocsToPull.length} berkas dari tim untuk dikonsolidasikan ke SKP Anda?`)) {
      return;
    }

    try {
      for (const doc of newDocsToPull) {
        await savePegawaiSkpDoc(
          currentUserPegawaiId,
          doc.docName,
          doc.docId,
          modalYear,
          'pendukung',
          selectedBidangId || currentUser?.bidang_id || 1,
          modalMonth,
          modalButirSkp,
          silent
        );
      }
      if (!silent) alert(`Berhasil mengkonsolidasikan ${newDocsToPull.length} berkas tim.`);
    } catch (error: any) {
      console.error("Failed to consolidate docs:", error);
      if (!silent) alert("Terjadi kesalahan saat konsolidasi berkas: " + error.message);
    }
  };

  // Main Open Modal trigger for Perencanaan Column
  const triggerPerencanaanModal = (
    year: number,
    type: 'perencanaan' | 'penilaian' | 'upload' = 'perencanaan',
    monthIndex?: number,
    butirSkp?: string
  ) => {
    // Dismiss tooltips immediately on click
    setHoveredPerencanaan(null);
    if (tooltipTimeoutRef.current) {
      clearTimeout(tooltipTimeoutRef.current);
      tooltipTimeoutRef.current = null;
    }

    setModalYear(year);
    setModalType(type);
    setModalMonth(monthIndex || null);
    setModalButirSkp(butirSkp || null);
    const initialBidang = selectedBidangId || (currentUser?.bidang_id ? Number(currentUser.bidang_id) : 1);
    setSelectedBidangId(initialBidang);
    fetchSkpRecordsFromDb(year, initialBidang);
    setIsPerencanaanModalOpen(true);

    // Auto-pull for Katim ke atas when opening upload modal
    if (type === 'upload' && isSupervisor) {
      setTimeout(() => {
        handleConsolidateSubordinatesDocs(true);
      }, 500);
    }
  };

  // Handle Bidang selection changes inside popup
  const handleBidangChange = (bidangId: number) => {
    setSelectedBidangId(bidangId);
    if (modalYear) {
      fetchSkpRecordsFromDb(modalYear, bidangId);
    }
  };

  // Tooltip Click Handler — toggle on badge click, global listener handles outside-click
  const handlePerencanaanClick = (
    e: React.MouseEvent,
    year: number,
    category: 'perencanaan' | 'penilaian' | 'upload',
    monthIndex?: number,
    butirSkp?: string
  ) => {
    e.stopPropagation();
    if (isPerencanaanModalOpen || activeDetailType !== null) return;

    const isAlreadyOpen = hoveredPerencanaan &&
      hoveredPerencanaan.year === year &&
      hoveredPerencanaan.category === category &&
      hoveredPerencanaan.monthIndex === monthIndex &&
      hoveredPerencanaan.butirSkp === butirSkp;

    if (isAlreadyOpen) {
      setHoveredPerencanaan(null);
      return;
    }

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setHoveredPerencanaan({
      rect: { left: rect.left, top: rect.top, width: rect.width, bottom: rect.bottom, right: rect.right },
      year,
      category,
      monthIndex,
      butirSkp
    });
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
      topPos = rect.bottom + 4;
      transform = 'translateY(0)';
    } else {
      // Default: render above
      topPos = rect.top - 4;
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

  const getPegawaiHistoryTooltipStyle = (): React.CSSProperties => {
    if (!hoveredPegawaiHistory) return { visibility: 'hidden' };
    const tooltipWidth = 360;
    const estimatedHeight = 180;
    const padding = 16;

    let leftPos = hoveredPegawaiHistory.x - (tooltipWidth / 2);
    if (leftPos < padding) {
      leftPos = padding;
    } else if (leftPos + tooltipWidth > window.innerWidth - padding) {
      leftPos = window.innerWidth - tooltipWidth - padding;
    }

    const spaceAbove = hoveredPegawaiHistory.y;
    const spaceBelow = window.innerHeight - hoveredPegawaiHistory.y;
    let topPos;
    let transform;

    if (spaceAbove < estimatedHeight && spaceBelow > spaceAbove) {
      topPos = hoveredPegawaiHistory.y + 20;
      transform = 'translateY(0)';
    } else {
      topPos = hoveredPegawaiHistory.y - 12;
      transform = 'translateY(-100%)';
    }

    return {
      left: `${leftPos}px`,
      top: `${topPos}px`,
      transform: transform,
      position: 'fixed',
      zIndex: 10050,
      visibility: 'visible'
    };
  };

  // Counter computing for active records inside pop-up
  const currentRecords = getActiveRecords();
  const assignedRecords = (modalType === 'upload' && modalButirSkp)
    ? filterRecordsForButirSkp(currentRecords, modalButirSkp)
    : currentRecords;

  const totalStaff = assignedRecords.length;
  const submittedCount = assignedRecords.filter(r => {
    if (modalType === 'perencanaan') return r.perencanaanDocName !== null;
    if (modalType === 'penilaian') return r.penilaianDocName !== null;
    return r.pendukungList?.some((p: any) => 
      matchPendukungDoc(p, modalMonth, modalButirSkp) && p.docName !== null && p.docName !== undefined
    );
  }).length;
  const unsubmittedCount = totalStaff - submittedCount;

  // Filtered staff list in modal
  const filteredModalStaff = assignedRecords.filter(r => {
    let docName: string | null = null;
    if (modalType === 'perencanaan') {
      docName = r.perencanaanDocName;
    } else if (modalType === 'penilaian') {
      docName = r.penilaianDocName;
    } else {
      const foundDoc = r.pendukungList?.find((p: any) => 
        matchPendukungDoc(p, modalMonth, modalButirSkp) && p.docName !== null && p.docName !== undefined
      ) || r.pendukungList?.find((p: any) => matchPendukungDoc(p, modalMonth, modalButirSkp));
      docName = foundDoc ? foundDoc.docName : null;
    }
    if (showUnsubmittedOnly && docName !== null) return false;
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

  const getManualItemsForBidang = (bidangId: number, year: number): string[] => {
    const key = `${year}_${bidangId}`;
    const customList = manualSkpItems[key];
    if (customList && customList.length > 0) return customList;

    // Default manual items
    const singkatan = getBidangSingkatan(bidangId);
    return [
      `ADMINISTRASI ${singkatan.toUpperCase()}`,
      `PERENCANAAN DAN PENGUKURAN KINERJA`
    ];
  };

  const getSubActivitiesForBidang = (bidangId: number): { name: string; code?: string }[] => {
    // 1. Get employees in this division
    const pegawaiIds = dbPegawaiList
      .filter(p => Number(p.bidang_id) === bidangId)
      .map(p => p.id);

    // 2. Filter sub-activities penanggung jawab
    const dbSubKegs = mappingSubKegiatans.filter(sk => pegawaiIds.includes(sk.penanggung_jawab_id));

    // 3. Sort hierarchically: Urusan -> Program -> Kegiatan -> Subkegiatan code
    const sortedSubKegs = [...dbSubKegs].sort((a, b) => {
      // Sort by urusan name
      const urusanA = a.nama_urusan || '';
      const urusanB = b.nama_urusan || '';
      const cmpUrusan = urusanA.localeCompare(urusanB, undefined, { numeric: true });
      if (cmpUrusan !== 0) return cmpUrusan;

      // Sort by program name
      const progA = a.nama_program || '';
      const progB = b.nama_program || '';
      const cmpProg = progA.localeCompare(progB, undefined, { numeric: true });
      if (cmpProg !== 0) return cmpProg;

      // Sort by kegiatan name
      const kegA = a.nama_kegiatan || '';
      const kegB = b.nama_kegiatan || '';
      const cmpKeg = kegA.localeCompare(kegB, undefined, { numeric: true });
      if (cmpKeg !== 0) return cmpKeg;

      // Sort by subkegiatan code
      const codeA = a.kode_sub_kegiatan || '';
      const codeB = b.kode_sub_kegiatan || '';
      return codeA.localeCompare(codeB, undefined, { numeric: true, sensitivity: 'base' });
    });

    // 4. Unique by name, keeping code
    const seen = new Set<string>();
    const uniqueSubKegs = [];

    sortedSubKegs.forEach(sk => {
      if (!seen.has(sk.nama_sub_kegiatan)) {
        seen.add(sk.nama_sub_kegiatan);
        uniqueSubKegs.push({
          name: sk.nama_sub_kegiatan,
          code: sk.kode_sub_kegiatan
        });
      }
    });

    return uniqueSubKegs;
  };

  const handleAddManualItem = (itemName: string) => {
    if (!selectedBidangId || !itemName.trim()) return;
    const itemNameTrimmed = itemName.trim();
    const key = `${monthlySelectedYear}_${selectedBidangId}`;
    
    // Check if it already exists in active items list
    const currentSubKegs = getSubActivitiesForBidang(selectedBidangId)
      .filter(item => !(deletedSkpItems[key] || []).includes(item.name));
    const currentManual = getManualItemsForBidang(selectedBidangId, monthlySelectedYear)
      .filter(name => !(deletedSkpItems[key] || []).includes(name));
    if (currentSubKegs.some(k => k.name === itemNameTrimmed) || currentManual.includes(itemNameTrimmed)) {
      alert('Butir SKP sudah ada.');
      return;
    }

    // If it was in deleted list, remove it from deleted list!
    const deletedList = deletedSkpItems[key] || [];
    if (deletedList.includes(itemNameTrimmed)) {
      const updatedDeleted = {
        ...deletedSkpItems,
        [key]: deletedList.filter(name => name !== itemNameTrimmed)
      };
      setDeletedSkpItems(updatedDeleted);
      localStorage.setItem('skp_deleted_items', JSON.stringify(updatedDeleted));
    } else {
      // Otherwise, add it to manual list
      const currentList = getManualItemsForBidang(selectedBidangId, monthlySelectedYear);
      const updated = {
        ...manualSkpItems,
        [key]: [...currentList, itemNameTrimmed]
      };
      setManualSkpItems(updated);
      localStorage.setItem('skp_manual_skp_items', JSON.stringify(updated));
    }

    // Sync to database so all users in this bidang see it immediately
    try {
      api.skp.addCustomItem({
        tahun: monthlySelectedYear,
        bidang_id: selectedBidangId,
        butir_skp: itemNameTrimmed
      });
    } catch (err) {
      console.error('Failed to sync added custom item to db:', err);
    }
  };

  const handleDeleteManualItem = async (itemName: string) => {
    if (!selectedBidangId) return;
    if (confirm(`Apakah Anda yakin ingin menghapus butir SKP "${itemName}"?`)) {
      const key = `${monthlySelectedYear}_${selectedBidangId}`;
      const currentList = getManualItemsForBidang(selectedBidangId, monthlySelectedYear);
      const updatedList = currentList.filter(item => item !== itemName);
      
      // Update manual lists
      const updated = {
        ...manualSkpItems,
        [key]: updatedList
      };
      setManualSkpItems(updated);
      localStorage.setItem('skp_manual_skp_items', JSON.stringify(updated));

      // Also add to deleted list
      const deletedList = deletedSkpItems[key] || [];
      if (!deletedList.includes(itemName)) {
        const updatedDeleted = {
          ...deletedSkpItems,
          [key]: [...deletedList, itemName]
        };
        setDeletedSkpItems(updatedDeleted);
        localStorage.setItem('skp_deleted_items', JSON.stringify(updatedDeleted));
      }

      // Sync deletion to database so all users in this bidang see it deleted
      try {
        await api.skp.deleteCustomItem({
          tahun: monthlySelectedYear,
          bidang_id: selectedBidangId,
          butir_skp: itemName
        });
      } catch (err) {
        console.error('Failed to sync deleted custom item to db:', err);
      }
    }
  };

  const openAssignmentModal = (butirName: string) => {
    setAssignmentButirSkp(butirName);
    const normName = normalizeStr(butirName);
    const existing = customAssignments.find(ca => normalizeStr(ca.butir_skp) === normName);
    if (existing) {
      setAssignmentTargetScope(existing.target_scope || 'bidang');
      setAssignmentTargetId(existing.target_id || null);
      if (Array.isArray(existing.assigned_pegawai_ids) && existing.assigned_pegawai_ids.length > 0) {
        setAssignmentPegawaiIds(existing.assigned_pegawai_ids.map(Number));
      } else if (existing.target_scope === 'tim' && existing.target_id) {
        const teamId = Number(existing.target_id);
        const teamMemberIds = dbPegawaiList
          .filter(p => {
            const pSubBidangId = Number(p.sub_bidang_id);
            const pSubBidangIds = Array.isArray((p as any).sub_bidang_ids)
              ? (p as any).sub_bidang_ids.map(Number)
              : (pSubBidangId ? [pSubBidangId] : []);
            return pSubBidangIds.includes(teamId);
          })
          .map(p => Number(p.id));
        setAssignmentPegawaiIds(teamMemberIds);
      } else {
        setAssignmentPegawaiIds([]);
      }
    } else {
      setAssignmentTargetScope('bidang');
      setAssignmentTargetId(null);
      setAssignmentPegawaiIds([]);
    }
    setAssignmentModalOpen(true);
  };

  const handleSaveAssignment = async () => {
    if (!assignmentButirSkp || !selectedBidangId) return;
    setIsSavingAssignment(true);
    try {
      const res = await api.skp.saveCustomAssignment({
        bidang_id: selectedBidangId,
        butir_skp: assignmentButirSkp,
        target_scope: assignmentTargetScope,
        target_id: assignmentTargetId,
        assigned_pegawai_ids: assignmentPegawaiIds
      });
      if (res && res.success) {
        const refreshRes = await api.skp.getCustomAssignments(selectedBidangId);
        if (refreshRes && refreshRes.success) {
          setCustomAssignments(refreshRes.data || []);
        }
        setAssignmentModalOpen(false);
      }
    } catch (e) {
      console.error('Error saving custom assignment:', e);
    } finally {
      setIsSavingAssignment(false);
    }
  };

  const handleEditManualItem = async (oldName: string, newName: string) => {
    if (!selectedBidangId || !oldName.trim() || !newName.trim()) return;
    const oldNameTrimmed = oldName.trim();
    const newNameTrimmed = newName.trim();
    if (oldNameTrimmed === newNameTrimmed) return;
    const key = `${monthlySelectedYear}_${selectedBidangId}`;

    // Check if newName already exists in active items list
    const currentSubKegs = getSubActivitiesForBidang(selectedBidangId)
      .filter(item => !(deletedSkpItems[key] || []).includes(item.name));
    const currentManual = getManualItemsForBidang(selectedBidangId, monthlySelectedYear)
      .filter(name => !(deletedSkpItems[key] || []).includes(name));
    if (currentSubKegs.some(k => k.name === newNameTrimmed) || currentManual.includes(newNameTrimmed)) {
      alert('Butir SKP dengan nama tersebut sudah ada.');
      return;
    }

    try {
      const res = await api.skp.renameMonthlyButir({
        bidang_id: selectedBidangId,
        old_butir_skp: oldNameTrimmed,
        new_butir_skp: newNameTrimmed
      });

      if (res && res.success) {
        // Remove from manual list if oldName was manual
        const currentList = getManualItemsForBidang(selectedBidangId, monthlySelectedYear);
        const updatedList = currentList.filter(item => item !== oldNameTrimmed);
        
        // Add newName to manual list
        const updatedManual = {
          ...manualSkpItems,
          [key]: [...updatedList, newNameTrimmed]
        };
        setManualSkpItems(updatedManual);
        localStorage.setItem('skp_manual_skp_items', JSON.stringify(updatedManual));

        // Add oldName to deleted list (so if it was a sub-activity, it is hidden; if it was manual, it is also hidden/removed)
        const deletedList = deletedSkpItems[key] || [];
        if (!deletedList.includes(oldNameTrimmed)) {
          const updatedDeleted = {
            ...deletedSkpItems,
            [key]: [...deletedList, oldNameTrimmed]
          };
          setDeletedSkpItems(updatedDeleted);
          localStorage.setItem('skp_deleted_items', JSON.stringify(updatedDeleted));
        }

        // Also if the newName was previously in deleted list, remove it
        const newDeletedList = (deletedSkpItems[key] || []).filter(item => item !== newNameTrimmed);
        const updatedDeletedNew = {
          ...deletedSkpItems,
          [key]: newDeletedList
        };
        setDeletedSkpItems(updatedDeletedNew);
        localStorage.setItem('skp_deleted_items', JSON.stringify(updatedDeletedNew));

        // Update local links map
        setMonthlyLinks(prev => {
          const newLinks: Record<string, string> = {};
          Object.keys(prev).forEach(k => {
            const parts = k.split('_');
            if (parts.length >= 4) {
              const year = parts[0];
              const bidangIdStr = parts[1];
              const month = parts[parts.length - 1];
              const itemName = parts.slice(2, parts.length - 1).join('_');

              if (Number(bidangIdStr) === selectedBidangId && itemName === oldNameTrimmed) {
                const newKey = `${year}_${bidangIdStr}_${newNameTrimmed}_${month}`;
                newLinks[newKey] = prev[k];
              } else {
                newLinks[k] = prev[k];
              }
            } else {
              newLinks[k] = prev[k];
            }
          });
          return newLinks;
        });

        setEditingManualItemName(null);
        setTempManualItemEditName('');
      } else {
        alert(res?.message || 'Gagal mengubah butir SKP');
      }
    } catch (err: any) {
      console.error('Failed to edit item:', err);
      alert('Terjadi kesalahan saat menyimpan butir SKP: ' + err.message);
    }
  };

  const openEditMonthlyLinkModal = (year: number, bidangId: number, itemName: string, month: string) => {
    setEditingMonthlyCell({ year, bidangId, itemName, month });
    const key = `${year}_${bidangId}_${itemName}_${month}`;
    setTempMonthlyLinkValue(monthlyLinks[key] || '');
  };

  const handleMonthlyTableScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (monthlyHeaderRef.current) {
      monthlyHeaderRef.current.scrollLeft = e.currentTarget.scrollLeft;
    }
  };

  // Robust clipboard copy tool supporting VPS environment (even in insecure HTTP contexts)
  const copyToClipboard = (text: string): Promise<void> => {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text);
    } else {
      return new Promise<void>((resolve, reject) => {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.top = "0";
        textArea.style.left = "0";
        textArea.style.position = "fixed";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
          const successful = document.execCommand('copy');
          if (successful) {
            resolve();
          } else {
            reject(new Error('Fallback copy failed'));
          }
        } catch (err) {
          reject(err);
        }
        document.body.removeChild(textArea);
      });
    }
  };

  const fetchMonthlyLinks = async (bidangId: number) => {
    try {
      const fetchApi = isPublic ? api.skp.getPublicMonthlyLinks : api.skp.getMonthlyLinks;
      const res = await fetchApi(bidangId);
      if (res && res.success && res.data) {
        const newLinks: Record<string, string> = {};

        const isFullyLoaded = !isLoadingDb && mappingSubKegiatans.length > 0 && dbPegawaiList.length > 0;

        if (isFullyLoaded) {
          // Discover manual SKP items from db links to display them to third parties
          const subActivities = getSubActivitiesForBidang(bidangId);
          const subActivityNames = new Set(subActivities.map(sa => sa.name));

          const tempManualSkpItemsUpdate = { ...manualSkpItems };
          let changed = false;

          res.data.forEach((row: any) => {
            const key = `${row.tahun}_${bidangId}_${row.butir_skp}_${row.bulan}`;
            newLinks[key] = row.link_url || '';

            const yearBidKey = `${row.tahun}_${bidangId}`;
            const currentList = tempManualSkpItemsUpdate[yearBidKey] || getManualItemsForBidang(bidangId, row.tahun);
            if (!subActivityNames.has(row.butir_skp) && !currentList.includes(row.butir_skp)) {
              tempManualSkpItemsUpdate[yearBidKey] = [...currentList, row.butir_skp];
              changed = true;
            }
          });

          setMonthlyLinks(newLinks);

          if (changed) {
            setManualSkpItems(tempManualSkpItemsUpdate);
            localStorage.setItem('skp_manual_skp_items', JSON.stringify(tempManualSkpItemsUpdate));
          }
        } else {
          // Just set links without doing discovery while DB resources are loading
          res.data.forEach((row: any) => {
            const key = `${row.tahun}_${bidangId}_${row.butir_skp}_${row.bulan}`;
            newLinks[key] = row.link_url || '';
          });
          setMonthlyLinks(newLinks);
        }
      }

      // Also fetch DB custom SKP items to sync across all users in this bidang
      try {
        const yearBidKey = `${monthlySelectedYear}_${bidangId}`;
        const localManual = manualSkpItems[yearBidKey] || [];
        
        // Auto-push any local items stored on this device to DB so other devices can see them
        if (localManual.length > 0) {
          for (const item of localManual) {
            try {
              await api.skp.addCustomItem({
                tahun: monthlySelectedYear,
                bidang_id: bidangId,
                butir_skp: item
              });
            } catch { /* ignore if already exists */ }
          }
        }

        const customRes = await api.skp.getCustomItems(monthlySelectedYear, bidangId);
        if (customRes && customRes.success && customRes.data && customRes.data.length > 0) {
          const currentManual = manualSkpItems[yearBidKey] || getManualItemsForBidang(bidangId, monthlySelectedYear);
          const currentDeleted = deletedSkpItems[yearBidKey] || [];
          
          let newManual = [...currentManual];
          let newDeleted = [...currentDeleted];
          let manualChanged = false;
          let deletedChanged = false;

          customRes.data.forEach((item: any) => {
            if (item.is_deleted === 0 || item.is_deleted === false) {
              if (!newManual.includes(item.butir_skp)) {
                newManual.push(item.butir_skp);
                manualChanged = true;
              }
              if (newDeleted.includes(item.butir_skp)) {
                newDeleted = newDeleted.filter(d => d !== item.butir_skp);
                deletedChanged = true;
              }
            } else {
              if (!newDeleted.includes(item.butir_skp)) {
                newDeleted.push(item.butir_skp);
                deletedChanged = true;
              }
              if (newManual.includes(item.butir_skp)) {
                newManual = newManual.filter(m => m !== item.butir_skp);
                manualChanged = true;
              }
            }
          });

          if (manualChanged) {
            const updatedManual = { ...manualSkpItems, [yearBidKey]: newManual };
            setManualSkpItems(updatedManual);
            localStorage.setItem('skp_manual_skp_items', JSON.stringify(updatedManual));
          }
          if (deletedChanged) {
            const updatedDeleted = { ...deletedSkpItems, [yearBidKey]: newDeleted };
            setDeletedSkpItems(updatedDeleted);
            localStorage.setItem('skp_deleted_items', JSON.stringify(updatedDeleted));
          }
        }
      } catch (err) {
        console.error('Failed to fetch custom items:', err);
      }
    } catch (err) {
      console.error('Failed to fetch monthly links:', err);
    }
  };

  useEffect(() => {
    if (selectedBidangId) {
      fetchMonthlyLinks(selectedBidangId);
    }
  }, [selectedBidangId, isPublic, isLoadingDb, mappingSubKegiatans, dbPegawaiList]);

  useEffect(() => {
    const checkNavigation = () => {
      const navYear = sessionStorage.getItem('skp_navigate_year');
      const navMonth = sessionStorage.getItem('skp_navigate_month');
      const navButir = sessionStorage.getItem('skp_navigate_butir');

      if (navMonth && navButir && !isLoadingDb && mappingSubKegiatans.length > 0 && dbPegawaiList.length > 0) {
        sessionStorage.removeItem('skp_navigate_year');
        sessionStorage.removeItem('skp_navigate_month');
        sessionStorage.removeItem('skp_navigate_butir');

        const month = Number(navMonth);
        const year = navYear ? Number(navYear) : new Date().getFullYear();

        // Update year state and fetch records if year changes
        if (year !== monthlySelectedYear) {
          setMonthlySelectedYear(year);
          const initialBidang = selectedBidangId || (currentUser?.bidang_id ? Number(currentUser.bidang_id) : 1);
          fetchSkpRecordsFromDb(year, initialBidang);
        }

        // Switch to the "monthly_docs" tab
        setActiveTab('monthly_docs');

        // Open the upload modal automatically!
        setTimeout(() => {
          triggerPerencanaanModal(year, 'upload', month, navButir);
        }, 300);
      }
    };

    checkNavigation();

    const handleNavigateSKP = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && customEvent.detail.page === 'skp') {
        setTimeout(checkNavigation, 100);
      }
    };

    window.addEventListener('navigate-page', handleNavigateSKP);
    return () => window.removeEventListener('navigate-page', handleNavigateSKP);
  }, [isLoadingDb, mappingSubKegiatans, dbPegawaiList, monthlySelectedYear, selectedBidangId, currentUser]);

  const yearRatios = useMemo(() => {
    const bid = selectedBidangId || (currentUser?.bidang_id ? Number(currentUser.bidang_id) : 1);
    const ratios: Record<string, { submitted: number; total: number }> = {};
    const categories: ('perencanaan' | 'penilaian' | 'upload')[] = ['perencanaan', 'penilaian', 'upload'];

    [2024, 2025, 2026, 2027].forEach(year => {
      const key = `${year}_${bid}`;
      const records = pegawaiSkpState[key] || [];

      categories.forEach(category => {
        const ratioKey = `${year}_${category}`;
        if (records.length === 0) {
          ratios[ratioKey] = { submitted: 0, total: 0 };
          return;
        }

        const submitted = records.filter(r => {
          if (category === 'perencanaan') return r.perencanaanDocName !== null && r.perencanaanDocName !== undefined;
          if (category === 'penilaian') return r.penilaianDocName !== null && r.penilaianDocName !== undefined;
          return r.pendukungList && r.pendukungList.some((p: any) => p.docName !== null && p.docName !== undefined && p.docName !== 'null' && String(p.docName).trim() !== '');
        }).length;

        ratios[ratioKey] = { submitted, total: records.length };
      });
    });

    return ratios;
  }, [selectedBidangId, currentUser, pegawaiSkpState]);

  const monthlyRatios = useMemo(() => {
    const bid = selectedBidangId || (currentUser?.bidang_id ? Number(currentUser.bidang_id) : 1);
    const keyPrefix = `${monthlySelectedYear}_${bid}`;
    const rawRecords = pegawaiSkpState[keyPrefix] || [];
    const ratios: Record<string, { submitted: number; total: number }> = {};
    if (rawRecords.length === 0) return ratios;

    // Get list of all items for this bidang
    const subActivities = getSubActivitiesForBidang(bid)
      .map(item => ({ name: item.name }));
    const manualItems = getManualItemsForBidang(bid, monthlySelectedYear)
      .map(name => ({ name }));
    const allItems = [...subActivities, ...manualItems];

    allItems.forEach(item => {
      const records = filterRecordsForButirSkp(rawRecords, item.name);
      const total = records.length;
      
      for (let monthIndex = 1; monthIndex <= 12; monthIndex++) {
        const cellKey = `${item.name}_${monthIndex}`;
        if (total === 0) {
          ratios[cellKey] = { submitted: 0, total: 0 };
          continue;
        }

        const submitted = records.filter(r => {
          return r.pendukungList?.some((p: any) => 
            matchPendukungDoc(p, monthIndex, item.name) && 
            p.docName !== null && 
            p.docName !== undefined && 
            p.docName !== 'null' && 
            String(p.docName).trim() !== ''
          );
        }).length;

        ratios[cellKey] = { submitted, total };
      }
    });

    return ratios;
  }, [monthlySelectedYear, selectedBidangId, currentUser, pegawaiSkpState, customAssignments, mappingSubKegiatans, dbPegawaiList]);

  // Pre-compute tooltip content so the tooltip renders instantly with zero computation
  const tooltipData = useMemo(() => {
    if (!hoveredPerencanaan) return { sudahList: [] as any[], belumList: [] as any[] };
    const category = hoveredPerencanaan.category || 'perencanaan';
    const hoverButirSkp = hoveredPerencanaan.butirSkp ?? null;
    const hoverMonth = hoveredPerencanaan.monthIndex ?? null;
    const rawRecords = pegawaiSkpState[`${hoveredPerencanaan.year}_${selectedBidangId || 1}`] || [];
    const records = (category === 'upload' && hoverButirSkp)
      ? filterRecordsForButirSkp(rawRecords, hoverButirSkp)
      : rawRecords;
    const hasDoc = (r: PegawaiSkpRecord) => {
      if (category === 'perencanaan') return r.perencanaanDocName !== null && r.perencanaanDocName !== undefined;
      if (category === 'penilaian') return r.penilaianDocName !== null && r.penilaianDocName !== undefined;
      return (r as any).pendukungList?.some(
        (p: any) => matchPendukungDoc(p, hoverMonth, hoverButirSkp) && p.docName !== null && p.docName !== undefined
      );
    };
    return { sudahList: records.filter(hasDoc), belumList: records.filter(r => !hasDoc(r)) };
  }, [hoveredPerencanaan, pegawaiSkpState, selectedBidangId]);

  // Pre-compute filtered library docs to avoid re-filtering on every render
  const filteredLibraryDocs = useMemo(() => {
    const searchLower = (libSearchTerm || '').toLowerCase();
    if (!searchLower) return libraryDocs;
    return libraryDocs.filter(doc =>
      (doc.nama_file || '').toLowerCase().includes(searchLower) ||
      (doc.dokumen || '').toLowerCase().includes(searchLower) ||
      (doc.surat_perihal || '').toLowerCase().includes(searchLower) ||
      (doc.surat_nomor || '').toLowerCase().includes(searchLower) ||
      (doc.jenis_dokumen_nama || '').toLowerCase().includes(searchLower)
    );
  }, [libraryDocs, libSearchTerm]);

  // O(1) selected doc lookup using Set instead of Array.some() per item
  const libSelectedDocIds = useMemo(() =>
    new Set(libSelectedDocs.map((d: any) => d.id)),
  [libSelectedDocs]);

  useEffect(() => {
    const loadMasterOptions = async () => {
      try {
        const jRes = await api.dokumen.getJenis();
        if (jRes && jRes.success) setJenisList(jRes.data || []);
        const tRes = await api.dokumen.getTematik();
        if (tRes && tRes.success) setTematikList(tRes.data || []);
        const uRes = await api.bidangUrusan.getAll();
        if (uRes && uRes.success) setBidangUrusanList(uRes.data || []);
      } catch (err) {
        console.error('Failed to load master options for SKP:', err);
      }
    };
    loadMasterOptions();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (uploadTagRef.current && !uploadTagRef.current.contains(event.target as Node)) {
        setIsUploadTagOpen(false);
      }
      if (uploadJenisRef.current && !uploadJenisRef.current.contains(event.target as Node)) {
        setIsUploadJenisOpen(false);
      }
      if (uploadUrusanRef.current && !uploadUrusanRef.current.contains(event.target as Node)) {
        setIsUploadUrusanOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

   const getMonthlyLinksFilledRatio = (year: number) => {
    const bidId = selectedBidangId || 1;
    const key = `${year}_${bidId}`;
    const bidDeleted = deletedSkpItems[key] || [];
    const subActivities = getSubActivitiesForBidang(bidId).filter(item => !bidDeleted.includes(item.name));
    const manualItems = getManualItemsForBidang(bidId, year).filter(name => !bidDeleted.includes(name));
    const totalItemsCount = subActivities.length + manualItems.length;
    const totalCells = totalItemsCount * 12;

    const months = [
      'JANUARI', 'FEBRUARI', 'MARET', 'APRIL', 'MEI', 'JUNI',
      'JULI', 'AGUSTUS', 'SEPTEMBER', 'OKTOBER', 'NOVEMBER', 'DESEMBER'
    ];

    let filledCount = 0;

    subActivities.forEach(item => {
      months.forEach(month => {
        const cellKey = `${year}_${bidId}_${item.name}_${month}`;
        if (monthlyLinks[cellKey]) {
          filledCount++;
        }
      });
    });

    manualItems.forEach(itemName => {
      months.forEach(month => {
        const cellKey = `${year}_${bidId}_${itemName}_${month}`;
        if (monthlyLinks[cellKey]) {
          filledCount++;
        }
      });
    });

    return {
      filled: filledCount,
      total: totalCells
    };
  };

  const handleCopyPublicLink = (year: number) => {
    const bidId = selectedBidangId || 1;
    const publicUrl = `${window.location.origin}${window.location.pathname}?public_skp=true&bidang_id=${bidId}&tahun=${year}`;

    copyToClipboard(publicUrl)
      .then(() => {
        setCopiedPublicYear(year);
        setTimeout(() => setCopiedPublicYear(null), 2000);
      })
      .catch(err => {
        console.error('Failed to copy public link:', err);
        alert('Gagal menyalin link: ' + err.message);
      });
  };

  const saveMonthlyLink = async () => {
    if (editingMonthlyCell) {
      const { year, bidangId, itemName, month } = editingMonthlyCell;
      const key = `${year}_${bidangId}_${itemName}_${month}`;
      try {
        const payload = {
          tahun: year,
          bidang_id: bidangId,
          butir_skp: itemName,
          bulan: month,
          link_url: tempMonthlyLinkValue.trim() || null
        };
        const res = await api.skp.saveMonthlyLink(payload);
        if (res && res.success) {
          setMonthlyLinks(prev => ({
            ...prev,
            [key]: tempMonthlyLinkValue.trim()
          }));
          setEditingMonthlyCell(null);
        } else {
          alert(res?.message || 'Gagal menyimpan link SKP bulanan');
        }
      } catch (err: any) {
        console.error('Failed to save monthly link:', err);
        alert('Terjadi kesalahan saat menyimpan link: ' + err.message);
      }
    }
  };

  const handleCopyLink = (url: string, cellKey: string) => {
    copyToClipboard(url)
      .then(() => {
        setCopiedCell(cellKey);
        setTimeout(() => setCopiedCell(null), 1500);
      })
      .catch(err => {
        console.error('Failed to copy link:', err);
      });
  };

  const getCurrentUserSkpRecord = (year: number): PegawaiSkpRecord | null => {
    if (!currentUserPegawaiId || !currentUser?.bidang_id) return null;
    const key = `${year}_${currentUser.bidang_id}`;
    const records = pegawaiSkpState[key] || [];
    return records.find(r => r.pegawaiId === currentUserPegawaiId) || null;
  };

  const toggleDropdown = (dropdownName: string) => {
    setActiveDropdown(prev => prev === dropdownName ? null : dropdownName);
  };

  const openDetail = (year: number, type: 'perencanaan' | 'penilaian' | 'upload', monthIndex?: number, butirSkp?: string) => {
    // Dismiss tooltips immediately on click
    setHoveredPerencanaan(null);
    if (tooltipTimeoutRef.current) {
      clearTimeout(tooltipTimeoutRef.current);
      tooltipTimeoutRef.current = null;
    }

    if (type === 'perencanaan' || type === 'penilaian' || type === 'upload') {
      const targetMonth = monthIndex || (new Date().getMonth() + 1);
      triggerPerencanaanModal(year, type, targetMonth, butirSkp);
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
        row.paririmbon.status.toLowerCase().includes(s) ||
        row.paririmbon.docName.toLowerCase().includes(s)
      );
    }
    return true;
  });

  const renderMonthlyDocsTableContent = (isModal = false) => {
    const months = [
      'JANUARI', 'FEBRUARI', 'MARET', 'APRIL', 'MEI', 'JUNI',
      'JULI', 'AGUSTUS', 'SEPTEMBER', 'OKTOBER', 'NOVEMBER', 'DESEMBER'
    ];

    if (isLoadingDb) {
      const skeletonRows = Array.from({ length: 4 });
      const renderSkeletonRow = (idx: number, isModalView: boolean) => {
        return (
          <tr key={`skeleton-${idx}`} className="animate-pulse">
            <td className={`p-4 border-r border-slate-150/60 ${isModalView ? '' : 'sticky left-0 bg-white shadow-[4px_0_8px_-4px_rgba(0,0,0,0.1)] z-10'}`}>
              <div className="flex flex-col gap-2">
                <div className="h-3 bg-slate-200 rounded w-10"></div>
                <div className="h-4 bg-slate-200 rounded w-48"></div>
              </div>
            </td>
            {months.map(m => (
              <td key={m} className="p-3 border-r border-slate-150/60 last:border-r-0 text-center align-middle">
                <div className="flex flex-col items-center gap-1.5 justify-center">
                  <div className="h-5 bg-slate-200 rounded w-10"></div>
                  <div className="h-3 bg-slate-200 rounded w-6"></div>
                </div>
              </td>
            ))}
          </tr>
        );
      };

      if (isModal) {
        return (
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-150 text-[10px] font-black uppercase tracking-wider text-slate-700 select-none">
                <th className="p-4 border-r border-slate-150 w-64 align-middle" rowSpan={2}>
                  BUTIR SKP
                </th>
                <th className="p-2.5 text-center border-b border-slate-150" colSpan={12}>
                  BULAN
                </th>
              </tr>
              <tr className="bg-slate-100 border-b border-slate-150 text-[9px] font-extrabold uppercase tracking-wider text-slate-600 text-center select-none">
                {months.map(m => (
                  <th key={m} className="p-2 border-r border-slate-150/60 last:border-r-0 min-w-[70px]">
                    {m.substring(0, 3)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {skeletonRows.map((_, idx) => renderSkeletonRow(idx, true))}
            </tbody>
          </table>
        );
      }

      return (
        <div className="flex flex-col w-full animate-in fade-in duration-300">
          <div className="overflow-hidden sticky z-20 bg-slate-100 border-x border-t border-slate-150 rounded-t-2xl shadow-sm top-[-16px] lg:top-[-24px]">
            <table className="w-full border-collapse text-left table-fixed bg-slate-100">
              <colgroup>
                <col className="w-[256px] min-w-[256px]" />
                {months.map(m => (
                  <col key={m} className="w-[70px] min-w-[70px]" />
                ))}
              </colgroup>
              <thead>
                <tr className="bg-slate-100 border-b border-slate-150 text-[10px] font-black uppercase tracking-wider text-slate-700 select-none h-10">
                  <th className="p-4 border-r border-slate-150 align-middle bg-slate-100 sticky left-0 z-30 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.1)]" rowSpan={2}>
                    BUTIR SKP
                  </th>
                  <th className="p-2.5 text-center border-b border-slate-150 bg-slate-100" colSpan={12}>
                    BULAN
                  </th>
                </tr>
                <tr className="bg-slate-100 border-b border-slate-150 text-[9px] font-extrabold uppercase tracking-wider text-slate-600 text-center select-none h-9">
                  {months.map(m => (
                    <th key={m} className="p-2 border-r border-slate-150/60 last:border-r-0 bg-slate-100">
                      {m.substring(0, 3)}
                    </th>
                  ))}
                </tr>
              </thead>
            </table>
          </div>
          <div className="overflow-x-auto border-x border-b border-slate-150 rounded-b-2xl custom-scrollbar-visible pb-2">
            <table className="w-full border-collapse text-left table-fixed bg-white">
              <colgroup>
                <col className="w-[256px] min-w-[256px]" />
                {months.map(m => (
                  <col key={m} className="w-[70px] min-w-[70px]" />
                ))}
              </colgroup>
              <tbody className="divide-y divide-slate-100 bg-white">
                {skeletonRows.map((_, idx) => renderSkeletonRow(idx, false))}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    const bidKey = `${monthlySelectedYear}_${selectedBidangId || 1}`;
    const subActivities = getSubActivitiesForBidang(selectedBidangId || 1)
      .filter(item => !(deletedSkpItems[bidKey] || []).includes(item.name))
      .map(item => ({
        ...item,
        isManual: false
      }));
    const manualItems: SkpItem[] = getManualItemsForBidang(selectedBidangId || 1, monthlySelectedYear)
      .filter(name => !(deletedSkpItems[bidKey] || []).includes(name))
      .map(name => ({
        name,
        isManual: true
      }));
    const allItems: SkpItem[] = [...subActivities, ...manualItems];

    if (isModal) {
      return (
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="bg-slate-100 border-b border-slate-150 text-[10px] font-black uppercase tracking-wider text-slate-700 select-none">
              <th className="p-4 border-r border-slate-150 w-64 align-middle" rowSpan={2}>
                BUTIR SKP
              </th>
              <th className="p-2.5 text-center border-b border-slate-150" colSpan={12}>
                BULAN
              </th>
            </tr>
            <tr className="bg-slate-100 border-b border-slate-150 text-[9px] font-extrabold uppercase tracking-wider text-slate-600 text-center select-none">
              {months.map(m => (
                <th key={m} className="p-2 border-r border-slate-150/60 last:border-r-0 min-w-[70px]">
                  {m.substring(0, 3)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {allItems.map((item, idx) => {
              const isManual = item.isManual;
              return (
                <tr key={idx} className="hover:bg-slate-50/40 transition-colors">
                  <td className="p-4 border-r border-slate-150/60 text-xs font-bold text-slate-700 max-w-[260px] break-words">
                    <div className="flex flex-col gap-1">
                      <div className="flex flex-wrap items-center gap-1.5 animate-in fade-in duration-200">
                        {item.code && (
                          <span className="font-mono text-[9px] text-indigo-700 bg-indigo-50 border border-indigo-100/65 rounded px-1 py-0.5">
                            {item.code}
                          </span>
                        )}
                        {isUserAssignedToSubKeg(item.name) && (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-500 text-white shadow-2xs cursor-help animate-pulse"
                            title="Anda Terikat Penugasan untuk Upload SKP di Sub-Kegiatan ini"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
                            <span>Penugasan Anda</span>
                          </span>
                        )}
                      </div>
                      <div className="flex items-start justify-between gap-2">
                        {editingManualItemName === item.name ? (
                          <div className="flex items-center gap-1.5 w-full">
                            <input
                              type="text"
                              value={tempManualItemEditName}
                              onChange={(e) => setTempManualItemEditName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleEditManualItem(item.name, tempManualItemEditName);
                                } else if (e.key === 'Escape') {
                                  setEditingManualItemName(null);
                                  setTempManualItemEditName('');
                                }
                              }}
                              className="w-full px-2 py-1 text-xs border border-indigo-400 rounded-lg outline-none focus:ring-1 focus:ring-indigo-400/50 bg-white"
                              autoFocus
                            />
                            <button
                              onClick={() => handleEditManualItem(item.name, tempManualItemEditName)}
                              className="p-1 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded transition-colors"
                              title="Simpan"
                            >
                              <Check size={12} strokeWidth={2.5} />
                            </button>
                            <button
                              onClick={() => {
                                setEditingManualItemName(null);
                                setTempManualItemEditName('');
                              }}
                              className="p-1 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded transition-colors"
                              title="Batal"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ) : (
                          <>
                            <span className="leading-relaxed">{item.name}</span>
                            {!isPublic && (
                              <div className="flex items-center gap-1 shrink-0">
                                {isManual && (
                                  <span className="px-1.5 py-0.5 bg-amber-50 text-amber-700 text-[8px] font-extrabold rounded border border-amber-100 uppercase tracking-wider">
                                    Manual
                                  </span>
                                )}
                                <button
                                  onClick={() => {
                                    setEditingManualItemName(item.name);
                                    setTempManualItemEditName(item.name);
                                  }}
                                  className="text-slate-300 hover:text-indigo-600 p-0.5 rounded transition-colors"
                                  title="Ubah Nama"
                                >
                                  <Pencil size={11} />
                                </button>
                                <button
                                  onClick={() => handleDeleteManualItem(item.name)}
                                  className="text-slate-300 hover:text-rose-500 p-0.5 rounded transition-colors"
                                  title="Hapus Butir SKP"
                                >
                                  <Trash2 size={11} />
                                </button>
                                <button
                                  onClick={() => openAssignmentModal(item.name)}
                                  className={`p-0.5 rounded transition-colors ${ customAssignments.find(ca => normalizeStr(ca.butir_skp) === normalizeStr(item.name) && ca.target_scope !== 'bidang') ? 'text-indigo-500 hover:text-indigo-700' : 'text-slate-300 hover:text-indigo-500' }`}
                                  title="Atur Penugasan"
                                >
                                  <Settings2 size={11} />
                                </button>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </td>
                  {months.map(month => {
                    const monthIndex = months.indexOf(month) + 1;
                    const monthConfig = getSkpMonthConfigForButir(item.name, monthIndex);
                    const cellKey = `${monthlySelectedYear}_${selectedBidangId}_${item.name}_${month}`;
                    const url = monthlyLinks[cellKey];
                    const isCopied = copiedCell === cellKey;
                    const ratioUpload = monthlyRatios[`${item.name}_${monthIndex}`] || { submitted: 0, total: 0 };

                    if (!monthConfig.is_active) {
                      return (
                        <td key={month} className="p-3 border-r border-slate-150/60 last:border-r-0 text-center align-middle relative bg-slate-50/40 select-none">
                          <span className="text-[11px] font-bold text-slate-300 font-mono" title="Bulan Non-Aktif">-</span>
                        </td>
                      );
                    }

                    // Color thresholds
                    let badgeClass = 'bg-slate-50 text-slate-400 border-slate-200/60';
                    let colorHex = '#cbd5e1';
                    const percent = ratioUpload.total > 0 ? (ratioUpload.submitted / ratioUpload.total) * 100 : 0;
                    
                    if (ratioUpload.total > 0) {
                      const submitted = ratioUpload.submitted;
                      const total = ratioUpload.total;
                      
                      if (submitted === total) {
                        badgeClass = 'bg-emerald-50/80 text-emerald-700 border-emerald-100';
                        colorHex = '#10b981';
                      } else if (submitted > 0 && submitted < total) {
                        badgeClass = 'bg-amber-50/80 text-amber-700 border-amber-100';
                        colorHex = '#f59e0b';
                      } else {
                        badgeClass = 'bg-rose-50/80 text-rose-700 border-rose-100';
                        colorHex = '#ef4444';
                      }
                    }

                    return (
                      <td key={month} className="p-3 border-r border-slate-150/60 last:border-r-0 text-center align-middle relative cursor-help">
                        <div className="flex flex-col items-center justify-center gap-1">
                          {/* Target Type Badge Indicator */}
                          <span className={`px-1.5 py-0.2 rounded text-[8px] font-black border ${
                            monthConfig.target_type === 'progress' 
                              ? 'bg-amber-50 text-amber-700 border-amber-200' 
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}>
                            {monthConfig.target_type === 'progress' ? 'Progress %' : 'Output Final'}
                          </span>

                          {/* Row 1: Lihat | Copy Button */}
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => {
                                setHoveredPerencanaan(null);
                                openDetail(monthlySelectedYear, 'upload', monthIndex, item.name);
                              }}
                              className="text-[10px] font-extrabold text-blue-700 hover:text-blue-900 transition-colors"
                            >
                              Lihat
                            </button>
                            <span className="text-slate-300 text-[10px]">|</span>
                            <button
                              onClick={() => {
                                const publicLink = `${window.location.origin}${window.location.pathname}?view_public_docs=true&tahun=${monthlySelectedYear}&bidang_id=${selectedBidangId || 1}&bulan=${monthIndex}&butir_skp=${encodeURIComponent(item.name)}`;
                                handleCopyLink(publicLink, cellKey);
                              }}
                              className={`p-1 transition-all ${
                                isCopied
                                  ? 'text-emerald-600'
                                  : 'text-slate-950 hover:text-indigo-600 hover:scale-105 active:scale-95'
                              }`}
                              title={isCopied ? 'Tersalin!' : 'Salin Tautan Publik'}
                            >
                              {isCopied ? <Check size={11} strokeWidth={3} /> : <Copy size={11} strokeWidth={2.5} />}
                            </button>
                          </div>

                          {/* Pie chart and Ratio Badge */}
                          <span
                            data-tooltip-trigger="audit"
                            onClick={(e) => handlePerencanaanClick(e, monthlySelectedYear, 'upload', monthIndex, item.name)}
                            className={`px-1.5 py-0.5 rounded-lg border text-[9px] font-black cursor-pointer transition-all active:scale-95 flex items-center justify-center gap-1 mt-0.5 ${badgeClass}`}
                            title={`Rasio Berkas Diunggah Pegawai: ${percent.toFixed(1)}%`}
                          >
                            <svg className="w-2.5 h-2.5 shrink-0 transform -rotate-90" viewBox="0 0 36 36">
                              <circle cx="18" cy="18" r="15.9155" fill="none" stroke="#e2e8f0" strokeWidth="4" />
                              {percent > 0 && (
                                <circle
                                  cx="18"
                                  cy="18"
                                  r="15.9155"
                                  fill="none"
                                  stroke={colorHex}
                                  strokeWidth="6"
                                  strokeDasharray={`${percent} 100`}
                                />
                              )}
                            </svg>
                            <span>{ratioUpload.submitted}/{ratioUpload.total}</span>
                          </span>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
            {allItems.length === 0 && (
              <tr>
                <td colSpan={13} className="p-8 text-center text-slate-400 text-xs italic">
                  Belum ada butir SKP untuk bidang ini. Silakan klik "Tambah Butir SKP" di atas untuk menambahkan secara manual.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      );
    }

    // Split view for page-level sticky scrolling sync
    return (
      <div className="flex flex-col w-full animate-in fade-in duration-300">
        {/* Header Table: sticky top-[64px] */}
        <div
          ref={monthlyHeaderRef}
          className="overflow-hidden sticky z-20 bg-slate-100 border-x border-t border-slate-150 rounded-t-2xl shadow-sm top-[-16px] lg:top-[-24px]"
        >
          <table className="w-full border-collapse text-left table-fixed bg-slate-100">
            <colgroup>
              <col className="w-[256px] min-w-[256px]" />
              {months.map(m => (
                <col key={m} className="w-[70px] min-w-[70px]" />
              ))}
            </colgroup>
            <thead>
              <tr className="bg-slate-100 border-b border-slate-150 text-[10px] font-black uppercase tracking-wider text-slate-700 select-none h-10">
                <th className="p-4 border-r border-slate-150 align-middle bg-slate-100 sticky left-0 z-30 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.1)]" rowSpan={2}>
                  BUTIR SKP
                </th>
                <th className="p-2.5 text-center border-b border-slate-150 bg-slate-100" colSpan={12}>
                  BULAN
                </th>
              </tr>
              <tr className="bg-slate-100 border-b border-slate-150 text-[9px] font-extrabold uppercase tracking-wider text-slate-600 text-center select-none h-9">
                {months.map(m => (
                  <th key={m} className="p-2 border-r border-slate-150/60 last:border-r-0 bg-slate-100">
                    {m.substring(0, 3)}
                  </th>
                ))}
              </tr>
            </thead>
          </table>
        </div>

        {/* Body Table: scroll-synced horizontally */}
        <div
          ref={monthlyTableRef}
          onScroll={handleMonthlyTableScroll}
          className="overflow-x-auto border-x border-b border-slate-150 rounded-b-2xl custom-scrollbar-visible pb-2"
        >
          <table className="w-full border-collapse text-left table-fixed bg-white">
            <colgroup>
              <col className="w-[256px] min-w-[256px]" />
              {months.map(m => (
                <col key={m} className="w-[70px] min-w-[70px]" />
              ))}
            </colgroup>
            <tbody className="divide-y divide-slate-100 bg-white">
              {allItems.map((item, idx) => {
                const isManual = item.isManual;
                return (
                  <tr key={idx} className="group hover:bg-slate-50/40 transition-colors">
                    <td className="p-4 border-r border-slate-150/60 text-xs font-bold text-slate-700 w-[256px] break-words sticky left-0 bg-white group-hover:bg-slate-50 transition-colors shadow-[4px_0_8px_-4px_rgba(0,0,0,0.1)] z-10">
                      <div className="flex flex-col gap-1">
                        <div className="flex flex-wrap items-center gap-1.5 animate-in fade-in duration-200">
                          {item.code && (
                            <span className="font-mono text-[9px] text-indigo-700 bg-indigo-50 border border-indigo-100/65 rounded px-1 py-0.5">
                              {item.code}
                            </span>
                          )}
                          {isUserAssignedToSubKeg(item.name) && (
                            <span
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-500 text-white shadow-2xs cursor-help animate-pulse"
                              title="Anda Terikat Penugasan untuk Upload SKP di Sub-Kegiatan ini"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
                              <span>Penugasan Anda</span>
                            </span>
                          )}
                        </div>
                        <div className="flex items-start justify-between gap-2">
                          {editingManualItemName === item.name ? (
                            <div className="flex items-center gap-1.5 w-full">
                              <input
                                type="text"
                                value={tempManualItemEditName}
                                onChange={(e) => setTempManualItemEditName(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    handleEditManualItem(item.name, tempManualItemEditName);
                                  } else if (e.key === 'Escape') {
                                    setEditingManualItemName(null);
                                    setTempManualItemEditName('');
                                  }
                                }}
                                className="w-full px-2 py-1 text-xs border border-indigo-400 rounded-lg outline-none focus:ring-1 focus:ring-indigo-400/50 bg-white"
                                autoFocus
                              />
                              <button
                                onClick={() => handleEditManualItem(item.name, tempManualItemEditName)}
                                className="p-1 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded transition-colors"
                                title="Simpan"
                              >
                                <Check size={12} strokeWidth={2.5} />
                              </button>
                              <button
                                onClick={() => {
                                  setEditingManualItemName(null);
                                  setTempManualItemEditName('');
                                }}
                                className="p-1 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded transition-colors"
                                title="Batal"
                              >
                                <X size={12} />
                              </button>
                            </div>
                          ) : (
                            <>
                              <span className="leading-relaxed">{item.name}</span>
                              {!isPublic && (
                                <div className="flex items-center gap-1 shrink-0">
                                  {isManual && (
                                    <span className="px-1.5 py-0.5 bg-amber-50 text-amber-700 text-[8px] font-extrabold rounded border border-amber-100 uppercase tracking-wider">
                                      Manual
                                    </span>
                                  )}
                                  <button
                                    onClick={() => {
                                      setEditingManualItemName(item.name);
                                      setTempManualItemEditName(item.name);
                                    }}
                                    className="text-slate-300 hover:text-indigo-600 p-0.5 rounded transition-colors"
                                    title="Ubah Nama"
                                  >
                                    <Pencil size={11} />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteManualItem(item.name)}
                                    className="text-slate-300 hover:text-rose-500 p-0.5 rounded transition-colors"
                                    title="Hapus Butir SKP"
                                  >
                                    <Trash2 size={11} />
                                  </button>
                                  <button
                                    onClick={() => openAssignmentModal(item.name)}
                                     className={`p-0.5 rounded transition-colors ${ customAssignments.find(ca => normalizeStr(ca.butir_skp) === normalizeStr(item.name) && ca.target_scope !== 'bidang') ? 'text-indigo-500 hover:text-indigo-700' : 'text-slate-300 hover:text-indigo-500' }`}
                                    title="Atur Penugasan Orang/Tim"
                                  >
                                    <Settings2 size={11} />
                                  </button>
                                  <button
                                    onClick={() => setSkpConfigModalState({ isOpen: true, butirSkpName: item.name })}
                                    className="p-0.5 rounded transition-colors text-amber-500 hover:text-amber-700"
                                    title="Atur Bulan Aktif & Tipe Target (Progress / Output) SKP"
                                  >
                                    <Calendar size={11} />
                                  </button>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </td>
                    {months.map(month => {
                      const monthIndex = months.indexOf(month) + 1;
                      const monthConfig = getSkpMonthConfigForButir(item.name, monthIndex);
                      const cellKey = `${monthlySelectedYear}_${selectedBidangId}_${item.name}_${month}`;
                      const isCopied = copiedCell === cellKey;
                      const ratioUpload = monthlyRatios[`${item.name}_${monthIndex}`] || { submitted: 0, total: 0 };

                      if (!monthConfig.is_active) {
                        return (
                          <td key={month} className="p-3 border-r border-slate-150/60 last:border-r-0 text-center align-middle relative bg-slate-50/40 select-none">
                            <span className="text-[11px] font-bold text-slate-300 font-mono" title="Bulan Non-Aktif">-</span>
                          </td>
                        );
                      }

                      // Color thresholds
                      let badgeClass = 'bg-slate-50 text-slate-400 border-slate-200/60';
                      let colorHex = '#cbd5e1';
                      const percent = ratioUpload.total > 0 ? (ratioUpload.submitted / ratioUpload.total) * 100 : 0;
                      
                      if (ratioUpload.total > 0) {
                        const submitted = ratioUpload.submitted;
                        const total = ratioUpload.total;
                        
                        if (submitted === total) {
                          badgeClass = 'bg-emerald-50/80 text-emerald-700 border-emerald-100';
                          colorHex = '#10b981';
                        } else if (submitted > 0 && submitted < total) {
                          badgeClass = 'bg-amber-50/80 text-amber-700 border-amber-100';
                          colorHex = '#f59e0b';
                        } else {
                          badgeClass = 'bg-rose-50/80 text-rose-700 border-rose-100';
                          colorHex = '#ef4444';
                        }
                      }

                      return (
                        <td key={month} className="p-3 border-r border-slate-150/60 last:border-r-0 text-center align-middle relative cursor-help">
                          <div className="flex flex-col items-center justify-center gap-1">
                            {/* Row 1: Lihat | Copy Button */}
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => {
                                  setHoveredPerencanaan(null);
                                  openDetail(monthlySelectedYear, 'upload', monthIndex, item.name);
                                }}
                                className="text-[10px] font-extrabold text-blue-700 hover:text-blue-900 transition-colors"
                              >
                                Lihat
                              </button>
                              <span className="text-slate-300 text-[10px]">|</span>
                              <button
                                onClick={() => {
                                  const publicLink = `${window.location.origin}${window.location.pathname}?view_public_docs=true&tahun=${monthlySelectedYear}&bidang_id=${selectedBidangId || 1}&bulan=${monthIndex}&butir_skp=${encodeURIComponent(item.name)}`;
                                  handleCopyLink(publicLink, cellKey);
                                }}
                                className={`p-1 transition-all ${
                                  isCopied
                                    ? 'text-emerald-600'
                                    : 'text-slate-950 hover:text-indigo-600 hover:scale-105 active:scale-95'
                                }`}
                                title={isCopied ? 'Tersalin!' : 'Salin Tautan Publik'}
                              >
                                {isCopied ? <Check size={11} strokeWidth={3} /> : <Copy size={11} strokeWidth={2.5} />}
                              </button>
                            </div>

                            {/* Pie chart and Ratio Badge */}
                            <span
                              data-tooltip-trigger="audit"
                              onClick={(e) => handlePerencanaanClick(e, monthlySelectedYear, 'upload', monthIndex, item.name)}
                              className={`px-1.5 py-0.5 rounded-lg border text-[9px] font-black cursor-pointer transition-all active:scale-95 flex items-center justify-center gap-1 mt-0.5 ${badgeClass}`}
                              title={`Rasio Berkas Diunggah Pegawai: ${percent.toFixed(1)}%`}
                            >
                              <svg className="w-2.5 h-2.5 shrink-0 transform -rotate-90" viewBox="0 0 36 36">
                                <circle cx="18" cy="18" r="15.9155" fill="none" stroke="#e2e8f0" strokeWidth="4" />
                                {percent > 0 && (
                                  <circle
                                    cx="18"
                                    cy="18"
                                    r="15.9155"
                                    fill="none"
                                    stroke={colorHex}
                                    strokeWidth="6"
                                    strokeDasharray={`${percent} 100`}
                                  />
                                )}
                              </svg>
                              <span>{ratioUpload.submitted}/{ratioUpload.total}</span>
                            </span>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
              {allItems.length === 0 && (
                <tr>
                  <td colSpan={13} className="p-8 text-center text-slate-400 text-xs italic">
                    Belum ada butir SKP untuk bidang ini. Silakan klik "Tambah Butir SKP" di atas untuk menambahkan secara manual.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderMonthlyDocsTab = () => {
    const singkatan = getBidangSingkatan(selectedBidangId).toUpperCase();

    const months = [
      'JANUARI', 'FEBRUARI', 'MARET', 'APRIL', 'MEI', 'JUNI',
      'JULI', 'AGUSTUS', 'SEPTEMBER', 'OKTOBER', 'NOVEMBER', 'DESEMBER'
    ];

    // 1. Calculate overall stats for pie chart
    const bidKey = `${monthlySelectedYear}_${selectedBidangId || 1}`;
    const subActivities = getSubActivitiesForBidang(selectedBidangId || 1)
      .filter(item => !(deletedSkpItems[bidKey] || []).includes(item.name));
    const manualItems = getManualItemsForBidang(selectedBidangId || 1, monthlySelectedYear)
      .filter(name => !(deletedSkpItems[bidKey] || []).includes(name));
    const allItems = [...subActivities.map(item => item.name), ...manualItems];

    let totalCells = 0;
    let hijauCount = 0;
    let kuningCount = 0;
    let merahCount = 0;

    allItems.forEach(itemName => {
      months.forEach(month => {
        const monthIndex = months.indexOf(month) + 1;
        const ratio = getMonthSubmissionRatio(monthlySelectedYear, monthIndex, itemName);
        totalCells++;
        if (ratio.total === 0) {
          merahCount++;
        } else {
          const submitted = ratio.submitted;
          const total = ratio.total;
          if (submitted === total) {
            hijauCount++;
          } else if (submitted > 0 && submitted < total) {
            kuningCount++;
          } else {
            merahCount++;
          }
        }
      });
    });

    const N = totalCells || 1;
    const pGreen = (hijauCount / N) * 100;
    const pYellow = (kuningCount / N) * 100;
    const pRed = (merahCount / N) * 100;

    return (
      <div className="space-y-5 animate-in fade-in duration-300">
        {/* Summary Dashboard Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 mb-5 select-none">
          {/* Card 1: Title & Info */}
          <div className="md:col-span-6 bg-white rounded-[32px] border border-slate-100 shadow-xl shadow-slate-150/10 p-5 flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm shrink-0">
                  <FileSpreadsheet size={22} />
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-800 tracking-tight uppercase">
                    SKP {singkatan}
                  </h2>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Link Dokumen Per bulan - Tahun {monthlySelectedYear}</p>
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              {!isPublic && (
                <button
                  onClick={() => setIsAddingManualItem(true)}
                  className="px-4.5 py-2 text-xs font-black rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 shadow-md shadow-indigo-600/10 hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  <Plus size={14} />
                  <span>Tambah Butir SKP</span>
                </button>
              )}
              <div className="text-[11px] font-bold text-slate-400 bg-slate-50 border border-slate-100 rounded-xl px-3.5 py-1.5">
                Total Rencana Kerja: <strong className="text-slate-700 font-black">{allItems.length}</strong>
              </div>
            </div>
          </div>

          {/* Card 2: Pie Chart Summary */}
          <div className="md:col-span-6 bg-white rounded-[32px] border border-slate-100 shadow-xl shadow-slate-150/10 p-5 flex flex-col sm:flex-row items-center justify-around gap-4">
            {/* Pie SVG */}
            <div className="relative w-24 h-24 shrink-0 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                {/* Background base */}
                <circle cx="18" cy="18" r="15.9155" fill="none" stroke="#f1f5f9" strokeWidth="4" />
                
                {/* Green slice */}
                {pGreen > 0 && (
                  <circle
                    cx="18"
                    cy="18"
                    r="15.9155"
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="4"
                    strokeDasharray={`${pGreen} 100`}
                    strokeDashoffset="0"
                  />
                )}
                {/* Yellow slice */}
                {pYellow > 0 && (
                  <circle
                    cx="18"
                    cy="18"
                    r="15.9155"
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="4"
                    strokeDasharray={`${pYellow} 100`}
                    strokeDashoffset={-pGreen}
                  />
                )}
                {/* Red slice */}
                {pRed > 0 && (
                  <circle
                    cx="18"
                    cy="18"
                    r="15.9155"
                    fill="none"
                    stroke="#ef4444"
                    strokeWidth="4"
                    strokeDasharray={`${pRed} 100`}
                    strokeDashoffset={-(pGreen + pYellow)}
                  />
                )}
              </svg>
              {/* Inner Center Text */}
              <div className="absolute flex flex-col items-center justify-center text-center">
                <span className="text-[14px] font-black text-slate-800">{((hijauCount / N) * 100).toFixed(0)}%</span>
                <span className="text-[7.5px] font-extrabold text-slate-400 uppercase tracking-wider">Selesai</span>
              </div>
            </div>

            {/* Legend / Statistics */}
            <div className="flex flex-col gap-2 min-w-[160px]">
              <div className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-0.5">Progress Kinerja Bulanan</div>
              
              {/* Emerald (100%) */}
              <div className="flex items-center justify-between text-xs gap-4">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span className="font-bold text-slate-600">Selesai (100%)</span>
                </div>
                <span className="font-mono font-black text-slate-700">{hijauCount} <span className="text-[9px] text-slate-400">({pGreen.toFixed(0)}%)</span></span>
              </div>

              {/* Amber (70% - 99.99%) */}
              <div className="flex items-center justify-between text-xs gap-4">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span className="font-bold text-slate-600">Sedang (70% - 99.9%)</span>
                </div>
                <span className="font-mono font-black text-slate-700">{kuningCount} <span className="text-[9px] text-slate-400">({pYellow.toFixed(0)}%)</span></span>
              </div>

              {/* Rose (< 70%) */}
              <div className="flex items-center justify-between text-xs gap-4">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  <span className="font-bold text-slate-600">Kurang (&lt; 70%)</span>
                </div>
                <span className="font-mono font-black text-slate-700">{merahCount} <span className="text-[9px] text-slate-400">({pRed.toFixed(0)}%)</span></span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Table Card */}
        <div className="bg-white rounded-[32px] border border-slate-100 shadow-2xl shadow-slate-150/40 p-6">
          <div className="relative">
            {renderMonthlyDocsTableContent(false)}
          </div>
        </div>
      </div>
    );
  };

  const selectedRow = skpData.find(r => r.tahun === selectedYear);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
      {/* Dynamic Navigation Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200/80 pb-1 shrink-0">
        <div className="flex gap-2">
          {!isPublic && (
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
          )}
          <button
            onClick={() => setActiveTab('monthly_docs')}
            className={`px-5 py-3 text-xs font-bold uppercase tracking-wider transition-all duration-300 relative border-b-2 ${
              activeTab === 'monthly_docs'
                ? 'border-indigo-600 text-indigo-900 font-extrabold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Link / Bahan Upload
          </button>
        </div>

        {/* Search bar or Bidang/Tahun dropdowns inside header */}
        <div className="flex items-center gap-4">
          {!isPublic && (
            <button
              onClick={openHistoryModal}
              className="flex items-center gap-1.5 px-4.5 py-2 text-xs font-black rounded-xl bg-white border border-slate-200 hover:border-slate-300 text-slate-700 hover:text-slate-900 shadow-sm transition-all"
            >
              <History size={14} className="text-indigo-600" />
              <span>Riwayat Perubahan</span>
            </button>
          )}
          {/* Division Selector */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Bidang:</span>
            <select
              value={selectedBidangId || ''}
              onChange={(e) => setSelectedBidangId(Number(e.target.value))}
              disabled={!canChangeBidang}
              className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-xl focus:ring-indigo-500 focus:border-indigo-500 block p-2 font-bold transition-all outline-none disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {dbBidangList.map(b => (
                <option key={b.id} value={b.id}>{b.nama_bidang || b.singkatan}</option>
              ))}
            </select>
          </div>

          {/* Year Selector */}
          {activeTab === 'monthly_docs' && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Tahun:</span>
              <select
                value={monthlySelectedYear}
                onChange={(e) => setMonthlySelectedYear(Number(e.target.value))}
                className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-xl focus:ring-indigo-500 focus:border-indigo-500 block p-2 font-bold transition-all outline-none"
              >
                {[2024, 2025, 2026, 2027].map(yr => (
                  <option key={yr} value={yr}>{yr}</option>
                ))}
              </select>
            </div>
          )}
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
                          <div className="flex flex-col items-center gap-1">
                            <span className="flex items-center gap-1.5 mx-auto justify-center">
                              Paririmbon
                            </span>
                            {(() => {
                              const bidId = selectedBidangId || 1;
                              const key = `contoh_${bidId}`;
                              const link = paririmbonLinks[key] || '';
                              return (
                                <div className="flex items-center justify-center gap-1.5 mt-0.5 normal-case font-semibold text-[10px]">
                                  {link ? (
                                    <a
                                      href={ensureAbsoluteUrl(link)}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onMouseEnter={(e) => handleParirimbonMouseEnter(e, 'contoh')}
                                      onMouseLeave={handleParirimbonMouseLeave}
                                      className="text-indigo-500 hover:text-indigo-700 hover:underline flex items-center gap-0.5"
                                    >
                                      Contoh
                                      <ExternalLink size={10} />
                                    </a>
                                  ) : (
                                    <span className="text-slate-400/80">Contoh: -</span>
                                  )}
                                  {!isPublic && canChangeBidang && (
                                    <button
                                      onClick={() => openParirimbonEditModal('contoh')}
                                      className="p-0.5 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                                      title="Ubah Link Contoh Paririmbon"
                                    >
                                      <Pencil size={9} />
                                    </button>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
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
                        const ratio = yearRatios[`${row.tahun}_perencanaan`] || { submitted: 0, total: 0 };
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

                            {/* PERENCANAAN - INCLUDES AUDIT COUNTER WITH CLICK TOOLTIP */}
                            <td className="p-4 border-r border-slate-50 text-center relative cursor-help">
                              <div className="inline-block text-center">
                            <button
                              onClick={() => openDetail(row.tahun, 'perencanaan')}
                              className="group inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 border-b border-transparent hover:border-indigo-600/60 pb-0.5 transition-all"
                            >
                              Lihat
                              <Eye size={12} className="opacity-0 group-hover:opacity-100 transition-opacity ml-0.5 text-indigo-500" />
                            </button>
                            <div className="flex items-center justify-center gap-1.5 mt-1.5">
                              <span 
                                data-tooltip-trigger="audit"
                                onClick={(e) => handlePerencanaanClick(e, row.tahun, 'perencanaan')}
                                className="px-2 py-0.5 rounded-md text-[10px] font-black bg-slate-100 text-slate-600 border border-slate-200/40 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 cursor-pointer transition-colors"
                              >
                                Terkumpul: {ratio.submitted}/{ratio.total}
                              </span>
                            </div>
                              </div>
                            </td>

                            {/* PENILAIAN / DOKUMEN AKHIR */}
                            <td className="p-4 border-r border-slate-50 text-center relative cursor-help">
                              <div className="inline-block text-center">
                            <button
                              onClick={() => openDetail(row.tahun, 'penilaian')}
                              className="group inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 border-b border-transparent hover:border-indigo-600/60 pb-0.5 transition-all"
                            >
                              Lihat
                              <Eye size={12} className="opacity-0 group-hover:opacity-100 transition-opacity ml-0.5 text-indigo-500" />
                            </button>
                            <div className="flex items-center justify-center gap-1.5 mt-1.5">
                              {(() => {
                                const ratioPenilaian = yearRatios[`${row.tahun}_penilaian`] || { submitted: 0, total: 0 };
                                return (
                                  <span 
                                    data-tooltip-trigger="audit"
                                    onClick={(e) => handlePerencanaanClick(e, row.tahun, 'penilaian')}
                                    className="px-2 py-0.5 rounded-md text-[10px] font-black bg-slate-100 text-slate-600 border border-slate-200/40 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 cursor-pointer transition-colors"
                                  >
                                    Terkumpul: {ratioPenilaian.submitted}/{ratioPenilaian.total}
                                  </span>
                                );
                              })()}
                            </div>
                              </div>
                            </td>

                            {/* PARIRIMBON */}
                            <td className="p-4 border-r border-slate-50 text-center">
                              <div className="flex items-center justify-center gap-2">
                                {(() => {
                                  const bidId = selectedBidangId || 1;
                                  const paririmbonKey = `${row.tahun}_${bidId}`;
                                  const paririmbonLink = paririmbonLinks[paririmbonKey] || row.paririmbon.docName;
                                  return paririmbonLink ? (
                                    <button
                                      onClick={() => window.open(ensureAbsoluteUrl(paririmbonLink), '_blank')}
                                      onMouseEnter={(e) => handleParirimbonMouseEnter(e, row.tahun)}
                                      onMouseLeave={handleParirimbonMouseLeave}
                                      className="group inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 border-b border-transparent hover:border-indigo-600/60 pb-0.5 transition-all"
                                    >
                                      Lihat
                                      <ExternalLink size={12} className="opacity-0 group-hover:opacity-100 transition-opacity text-indigo-500" />
                                    </button>
                                  ) : (
                                    <span className="text-xs text-slate-400 font-bold">-</span>
                                  );
                                })()}
                                {!isPublic && canChangeBidang && (
                                  <button
                                    onClick={() => openParirimbonEditModal(row.tahun)}
                                    className="p-1 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                                    title="Ubah Link Paririmbon"
                                  >
                                    <Pencil size={12} />
                                  </button>
                                )}
                              </div>
                            </td>

                            {/* LINK / BAHAN UPLOAD */}
                            <td className="p-4 text-center relative cursor-help">
                              <div className="inline-block text-center">
                                <button
                                  onClick={() => {
                                  setMonthlySelectedYear(row.tahun);
                                  setActiveTab('monthly_docs');
                                }}
                                  className="group inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 border-b border-transparent hover:border-indigo-600/60 pb-0.5 transition-all"
                                >
                                  Lihat
                                  <Eye size={12} className="opacity-0 group-hover:opacity-100 transition-opacity ml-0.5 text-indigo-500" />
                                </button>
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
                          <div className="flex items-center gap-1.5">
                            {(() => {
                              const bidId = selectedBidangId || 1;
                              const paririmbonKey = `${row.tahun}_${bidId}`;
                              const paririmbonLink = paririmbonLinks[paririmbonKey] || row.paririmbon.docName;
                              return paririmbonLink ? (
                                <button
                                  onClick={() => window.open(ensureAbsoluteUrl(paririmbonLink), '_blank')}
                                  onMouseEnter={(e) => handleParirimbonMouseEnter(e, row.tahun)}
                                  onMouseLeave={handleParirimbonMouseLeave}
                                  className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-[10px] font-extrabold uppercase flex items-center gap-1 transition-all"
                                >
                                  Lihat <ExternalLink size={10} />
                                </button>
                              ) : (
                                <span className="text-[10px] font-extrabold text-slate-400 bg-slate-50 px-2 py-0.5 rounded">Belum ada link</span>
                              );
                            })()}
                            {!isPublic && (
                              <button
                                onClick={() => openParirimbonEditModal(row.tahun)}
                                className="p-1 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                                title="Ubah Link Paririmbon"
                              >
                                <Pencil size={11} />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[10px] text-slate-400 font-semibold">
                        Berkas Upload: <strong className="text-slate-600 font-bold">{row.upload.files.length}</strong>
                      </span>
                      <button
                        onClick={() => {
                          setMonthlySelectedYear(row.tahun);
                          setActiveTab('monthly_docs');
                        }}
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


        </div>
      ) : (
        renderMonthlyDocsTab()
      )}

      {/* DYNAMIC AUDIT HOVER TOOLTIP (Shows Submitted vs Unsubmitted staff list) */}
      {hoveredPerencanaan && !isPerencanaanModalOpen && !activeDetailType && (
        <div
          ref={tooltipRef}
          className="fixed bg-white text-slate-800 rounded-[20px] shadow-2xl border border-slate-150 p-4 w-[340px] select-none overflow-hidden z-[9999]"
          style={getPerencanaanTooltipStyle()}
        >
          {/* Vertical colored accent bar matching Kegiatan standards */}
          <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-500 z-10"></div>

          <div className="relative pl-2.5">
            {/* Tooltip Header */}
            <div className="flex items-center justify-between mb-3.5 pb-2 border-b border-slate-100">
              <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 flex items-center gap-1.5">
                <Users size={12} /> Audit SKP {hoveredPerencanaan.year} - {
                  hoveredPerencanaan.category === 'perencanaan' ? 'Perencanaan' :
                  hoveredPerencanaan.category === 'penilaian' ? 'Penilaian' :
                  hoveredPerencanaan.monthIndex ? `Bahan Upload (${monthNamesId[hoveredPerencanaan.monthIndex - 1]})` :
                  'Bahan Upload'
                }
              </span>
              <span className="text-[8px] font-extrabold text-slate-400 uppercase tracking-widest bg-slate-100 px-2 py-0.5 rounded-md">
                {getBidangSingkatan(selectedBidangId)}
              </span>
            </div>

            {/* Grid Layout: 2 Columns (Left: Sudah, Right: Belum) - data pre-computed via useMemo */}
            <div className="grid grid-cols-2 gap-3.5">
              {/* Left Column: Sudah Upload */}
              <div className="space-y-2">
                <div className="bg-emerald-50 text-emerald-700 text-[9px] font-black tracking-widest uppercase py-1 px-2.5 rounded-lg text-center border border-emerald-100/60">
                  Sudah ({tooltipData.sudahList.length})
                </div>
                <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                  {tooltipData.sudahList.map((r: any) => (
                    <div key={r.pegawaiId} className="text-[10px] text-slate-700 font-extrabold flex items-start gap-1">
                      <span className="text-emerald-500 font-black text-[12px] leading-none shrink-0">✓</span>
                      <span className="truncate" title={r.namaPegawai}>{r.namaPegawai.split(',')[0]}</span>
                    </div>
                  ))}
                  {tooltipData.sudahList.length === 0 && (
                    <span className="text-[9px] text-slate-400 italic block text-center pt-2">Belum ada</span>
                  )}
                </div>
              </div>

              {/* Right Column: Belum Upload */}
              <div className="space-y-2">
                <div className="bg-rose-50 text-rose-700 text-[9px] font-black tracking-widest uppercase py-1 px-2.5 rounded-lg text-center border border-rose-100/60">
                  Belum ({tooltipData.belumList.length})
                </div>
                <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                  {tooltipData.belumList.map((r: any) => (
                    <div key={r.pegawaiId} className="text-[10px] text-slate-500 font-semibold flex items-start gap-1">
                      <span className="text-rose-400 font-black text-[11px] leading-none shrink-0">✗</span>
                      <span className="truncate" title={r.namaPegawai}>{r.namaPegawai.split(',')[0]}</span>
                    </div>
                  ))}
                  {tooltipData.belumList.length === 0 && (
                    <span className="text-[9px] text-emerald-600 font-extrabold block text-center pt-2">Lengkap!</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PEGAWAI HISTORY HOVER TOOLTIP */}
      {hoveredPegawaiHistory && (
        <div
          className="fixed bg-slate-900 text-white rounded-2xl shadow-2xl p-4 w-[360px] animate-in fade-in zoom-in-95 duration-150 select-none overflow-hidden border border-slate-800"
          style={getPegawaiHistoryTooltipStyle()}
        >
          {/* Vertical colored accent bar */}
          <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500 z-10"></div>
          
          <div className="relative pl-1.5 space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-800 select-none">
              <span className="text-[10px] font-black uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                <History size={12} /> Riwayat: {hoveredPegawaiHistory.namaPegawai}
              </span>
              <span className="text-[8px] font-extrabold text-slate-500 uppercase tracking-widest bg-slate-850 px-2 py-0.5 rounded-md">
                Log SKP
              </span>
            </div>

            {/* List log */}
            <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar scrollbar-dark">
              {hoveredPegawaiHistory.history && hoveredPegawaiHistory.history.length > 0 ? (
                hoveredPegawaiHistory.history.map((log: any, i: number) => (
                  <div key={i} className="text-[10px] text-slate-300 leading-relaxed border-b border-slate-800 pb-2 last:border-0 last:pb-0">
                    <div className="flex justify-between items-start gap-2">
                      <span className={`inline-block px-1.5 py-0.2 bg-white/5 text-white border border-white/10 rounded text-[7.5px] font-black uppercase tracking-wider shrink-0 mt-0.5 ${
                        log.aksi === 'upload' ? 'text-emerald-400 border-emerald-500/20' : 'text-rose-400 border-rose-500/20'
                      }`}>
                        {log.aksi === 'upload' ? 'Upload' : 'Hapus'}
                      </span>
                      <span className="text-[7.5px] font-bold text-slate-500 shrink-0 mt-0.5">
                        {new Date(log.created_at).toLocaleString('id-ID', {
                          dateStyle: 'short',
                          timeStyle: 'short'
                        })}
                      </span>
                    </div>
                    <p className="mt-1 text-slate-200 font-medium leading-relaxed">{log.keterangan}</p>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-[10px] text-slate-550 italic">
                  Belum ada riwayat aktivitas.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* DYNAMIC PARIRIMBON HISTORY HOVER TOOLTIP */}
      {hoveredParirimbon && (
        <div
          className="fixed bg-white text-slate-800 rounded-[20px] shadow-2xl border border-slate-150 p-4 w-[340px] animate-in fade-in zoom-in-95 duration-150 select-none overflow-hidden"
          style={getParirimbonTooltipStyle()}
          onMouseEnter={handleParirimbonTooltipMouseEnter}
          onMouseLeave={handleParirimbonTooltipMouseLeave}
        >
          {/* Vertical colored accent bar (Emerald for Paririmbon/success link state) */}
          <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500 z-10"></div>

          <div className="relative pl-2.5">
            {/* Tooltip Header */}
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 flex items-center gap-1.5">
                <FileSpreadsheet size={12} /> {hoveredParirimbon.year === 'contoh' ? 'Riwayat Link Contoh Paririmbon' : `Riwayat Link Paririmbon ${hoveredParirimbon.year}`}
              </span>
              <span className="text-[8px] font-extrabold text-slate-400 uppercase tracking-widest bg-slate-100 px-2 py-0.5 rounded-md">
                {getBidangSingkatan(selectedBidangId)}
              </span>
            </div>

            {/* History Logs */}
            <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
              {hoveredParirimbon.history && hoveredParirimbon.history.length > 0 ? (
                hoveredParirimbon.history.map((log: any, i: number) => (
                  <div key={i} className="text-[10px] text-slate-700 leading-relaxed border-b border-slate-50 pb-2 last:border-0 last:pb-0">
                    <div className="flex justify-between items-start gap-2">
                      <span className="font-extrabold text-indigo-950 truncate max-w-[170px]" title={log.url}>
                        {log.url}
                      </span>
                      <span className="text-[8px] font-bold text-slate-400 shrink-0">{log.updatedAt}</span>
                    </div>
                    <div className="text-[8px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                      Oleh: {log.updatedBy}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-[10px] text-slate-400 italic">
                  Belum ada riwayat perubahan link.
                </div>
              )}
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
                    KELOLA {modalType === 'perencanaan' ? 'PERENCANAAN' : modalType === 'penilaian' ? 'PENILAIAN' : `BAHAN UPLOAD / BERKAS PENDUKUNG (${monthNamesId[(modalMonth || 1) - 1]})`} SKP {modalYear}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                    {getBidangName(selectedBidangId)}
                  </p>
                  {modalButirSkp && (
                    <span className="block text-[10px] text-indigo-400 font-extrabold normal-case mt-1 max-w-lg truncate" title={modalButirSkp}>
                      {modalButirSkp}
                    </span>
                  )}
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
              {(() => {
                const rawRecords = getActiveRecords();
                const records = (modalType === 'upload' && modalButirSkp)
                  ? filterRecordsForButirSkp(rawRecords, modalButirSkp)
                  : rawRecords;
                const total = records.length;
                const submitted = records.filter(r => {
                  if (modalType === 'perencanaan') return r.perencanaanDocName !== null && r.perencanaanDocName !== undefined;
                  if (modalType === 'penilaian') return r.penilaianDocName !== null && r.penilaianDocName !== undefined;
                  return (r as any).pendukungList?.some(
                    (p: any) => matchPendukungDoc(p, modalMonth, modalButirSkp) && p.docName !== null && p.docName !== undefined
                  );
                }).length;
                const unsubmitted = total - submitted;

                return (
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-2.5">
                    {/* Total Personil */}
                    <div className="bg-white px-3.5 py-1.5 rounded-xl border border-slate-200/50 flex items-center gap-2 shadow-sm select-none">
                      <div className="w-6.5 h-6.5 bg-slate-50 text-slate-500 rounded-md flex items-center justify-center shrink-0">
                        <Users size={12} />
                      </div>
                      <div className="flex items-center justify-between flex-1">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Total Personil</span>
                        <span className="text-base font-black text-slate-800">{total}</span>
                      </div>
                    </div>

                    {/* Sudah Unggah */}
                    <div className="bg-emerald-50/30 px-3.5 py-1.5 rounded-xl border border-emerald-100/60 flex items-center gap-2 shadow-sm select-none">
                      <div className="w-6.5 h-6.5 bg-emerald-100/60 text-emerald-700 rounded-md flex items-center justify-center shrink-0">
                        <CheckCircle2 size={12} />
                      </div>
                      <div className="flex items-center justify-between flex-1">
                        <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-wider">Sudah Unggah</span>
                        <span className="text-base font-black text-emerald-800">{submitted}</span>
                      </div>
                    </div>

                    {/* Belum Unggah */}
                    <div className="bg-amber-50/30 px-3.5 py-1.5 rounded-xl border border-amber-150 flex items-center gap-2 shadow-sm select-none">
                      <div className="w-6.5 h-6.5 bg-amber-100/60 text-amber-700 rounded-md flex items-center justify-center shrink-0">
                        <AlertCircle size={12} />
                      </div>
                      <div className="flex items-center justify-between flex-1">
                        <span className="text-[9px] font-bold text-amber-600 uppercase tracking-wider">Belum Unggah</span>
                        <span className="text-base font-black text-amber-800">{unsubmitted}</span>
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

                    {/* Consolidate Button for Supervisors (Katim ke atas) */}
                    {isSupervisor && modalType === 'upload' ? (
                      <button
                        onClick={() => handleConsolidateSubordinatesDocs(false)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-1.5 rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-indigo-100 hover:scale-[1.02] active:scale-[0.98] transition-all font-bold text-[9px] uppercase tracking-wider cursor-pointer border border-indigo-750"
                      >
                        <Upload size={12} />
                        Tarik Berkas Tim
                      </button>
                    ) : (
                      <div className="bg-slate-50/30 px-3.5 py-1.5 rounded-xl border border-dashed border-slate-200 flex items-center justify-center select-none text-[8px] font-bold text-slate-400 uppercase tracking-wider">
                        Konsolidasi SKP
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Staff SKP List Table */}
              <div className="rounded-2xl border border-slate-100 shadow-sm overflow-hidden bg-white">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 select-none text-[9px] font-black text-slate-400 uppercase tracking-widest">
                      <th className="py-3 px-4 w-12 text-center">No</th>
                      <th className="py-3 px-4">Nama Pegawai & Jabatan</th>
                      <th className="py-3 px-4 w-80">
                        {modalType === 'perencanaan' ? 'Dokumen SKP Perencanaan' :
                         modalType === 'penilaian' ? 'Dokumen SKP Penilaian' :
                         'Bahan Upload / Berkas Pendukung'}
                      </th>
                      <th className="py-3 px-4 w-40 text-center">Aksi Pengelolaan</th>
                      <th className="py-3 px-4 w-28 text-center">Riwayat</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredModalStaff.map((row, idx) => {
                      let matchingDocs: Array<{ docId: number; docName: string; docPath: string; updatedAt: string }> = [];

                      if (modalType === 'perencanaan') {
                        if (row.perencanaanDocName) {
                          matchingDocs.push({
                            docId: row.perencanaanDocId!,
                            docName: row.perencanaanDocName,
                            docPath: row.perencanaanDocPath!,
                            updatedAt: row.perencanaanUpdatedAt ? new Date(row.perencanaanUpdatedAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : ''
                          });
                        }
                      } else if (modalType === 'penilaian') {
                        if (row.penilaianDocName) {
                          matchingDocs.push({
                            docId: row.penilaianDocId!,
                            docName: row.penilaianDocName,
                            docPath: row.penilaianDocPath!,
                            updatedAt: row.penilaianUpdatedAt ? new Date(row.penilaianUpdatedAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : ''
                          });
                        }
                      } else {
                        const foundDocs = row.pendukungList?.filter((p: any) => matchPendukungDoc(p, modalMonth, modalButirSkp)) || [];
                        const uniqueMap = new Map<number, any>();
                        foundDocs.forEach((p: any) => {
                          if (p.docId && !uniqueMap.has(p.docId)) {
                            uniqueMap.set(p.docId, p);
                          }
                        });
                        matchingDocs = Array.from(uniqueMap.values()).map((p: any) => ({
                          docId: p.docId,
                          docName: p.docName,
                          docPath: p.docPath,
                          updatedAt: p.updatedAt ? new Date(p.updatedAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : ''
                        })).filter((d: any) => d.docName);
                      }

                      return (
                        <tr key={row.pegawaiId} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-4 text-center text-slate-300 font-extrabold">{idx + 1}</td>
                          <td className="p-4">
                            <div className="font-extrabold text-slate-800">{row.namaPegawai}</div>
                            <div className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">{row.jabatan}</div>
                          </td>
                          <td className="p-4 max-w-[20rem]">
                            {matchingDocs.length > 0 ? (
                              <div className="space-y-1.5 max-h-[120px] overflow-y-auto pr-1 custom-scrollbar">
                                {matchingDocs.map((doc) => (
                                  <div key={doc.docId} className="flex items-center justify-between gap-1.5 px-2 py-1 rounded-lg bg-indigo-50/50 border border-indigo-100/40 hover:bg-indigo-50 transition-colors">
                                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                      <FileText size={13} className="text-indigo-600 shrink-0" />
                                      <button
                                        onClick={() => handlePreviewDocument(doc.docPath, doc.docName, doc.is_private, doc.uploaded_by)}
                                        className="font-bold text-indigo-900 hover:underline truncate block text-[10px] text-left w-full"
                                        title={`${doc.docName} ${doc.updatedAt ? `(diunggah: ${doc.updatedAt})` : ''}`}
                                      >
                                        {doc.docName}
                                      </button>
                                    </div>
                                    <button
                                      onClick={() => removeSkpDocument(row.pegawaiId, doc.docId, doc.docName)}
                                      className="p-0.5 rounded-md text-red-500 hover:bg-red-50 transition-all shrink-0 cursor-pointer"
                                      title="Hapus Dokumen"
                                    >
                                      <Trash2 size={11} />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-700 text-[10px] font-black uppercase tracking-widest rounded-lg">
                                <AlertCircle size={12} /> Belum Upload
                              </span>
                            )}
                          </td>
                          <td className="p-4">
                            <div className="flex gap-2 justify-center">
                              {/* Standard Circular Upload button matching Activity/Logbook form (Multi-file enabled) */}
                              <label
                                className="w-6 h-6 rounded-full bg-indigo-500 hover:bg-indigo-600 text-white flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-all outline-none cursor-pointer"
                                title="Unggah File Baru"
                              >
                                <Plus size={12} />
                                <input
                                  type="file"
                                  multiple
                                  className="hidden"
                                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.csv,image/*,.zip,.rar,.7z"
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
                          <td className="p-4 text-center align-middle">
                            {(() => {
                              const pegLogs = historyList.filter((log: any) => Number(log.pegawai_id) === Number(row.pegawaiId));
                              const latestLog = pegLogs.length > 0 ? pegLogs[0] : null;
                              const dotColor = !latestLog ? 'bg-slate-350' :
                                              latestLog.aksi === 'upload' ? 'bg-emerald-500' : 'bg-rose-500';
                              
                              return (
                                <div className="flex items-center justify-center">
                                  <span
                                    className="px-2.5 py-1 bg-white text-slate-500 rounded-lg text-[9px] font-black uppercase tracking-widest border border-slate-200 cursor-pointer hover:bg-slate-50 hover:text-slate-800 hover:border-slate-300 transition-all shadow-xs active:scale-95 flex items-center gap-1.5"
                                    onMouseEnter={(e) => {
                                      const rect = e.currentTarget.getBoundingClientRect();
                                      setHoveredPegawaiHistory({
                                        x: rect.left + rect.width / 2,
                                        y: rect.top,
                                        history: pegLogs,
                                        namaPegawai: row.namaPegawai
                                      });
                                    }}
                                    onMouseLeave={() => setHoveredPegawaiHistory(null)}
                                  >
                                    Telusuri
                                    <div className={`w-1.5 h-1.5 rounded-full ${dotColor} shadow-sm`} />
                                  </span>
                                </div>
                              );
                            })()}
                          </td>
                        </tr>
                      );
                    })}
                    {filteredModalStaff.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-slate-400 text-xs italic">
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
        <div className="fixed inset-0 bg-slate-900/75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[75vh]">

            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-indigo-50/30 shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-black text-indigo-600 uppercase tracking-widest">Perpustakaan Dokumen</h3>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-indigo-100 text-indigo-700 uppercase tracking-wider">
                    {libraryDocs.length} File
                  </span>
                </div>
                <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">
                  Pilih surat atau laporan pendukung untuk ditautkan ke butir SKP
                </p>
              </div>
              <button
                onClick={() => { setIsLibPickerOpen(false); setPickerTargetPegawaiId(null); }}
                className="p-2 hover:bg-slate-200/80 rounded-full transition-colors cursor-pointer"
              >
                <X size={18} className="text-slate-400 hover:text-slate-600" />
              </button>
            </div>

            {/* Search inside library list */}
            <div className="p-5 border-b border-slate-100 bg-slate-50/50">
              <div className="relative">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari berdasarkan nama file, perihal, atau nomor surat..."
                  value={libSearchTerm}
                  onChange={(e) => setLibSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-xs font-semibold rounded-2xl border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                  autoFocus
                />
              </div>
            </div>

            {/* Document list */}
            <div 
              onScroll={handleLibScroll}
              className="p-5 overflow-y-auto space-y-2 flex-1 bg-slate-50/20 custom-scrollbar"
            >
              {isLibraryLoading ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                  <span className="text-xs font-semibold text-slate-400">Memuat perpustakaan dokumen...</span>
                </div>
              ) : (
              <div className="space-y-2">
                {filteredLibraryDocs.map(doc => {
                    const isSelected = libSelectedDocIds.has(doc.id);
                    return (
                      <div
                        key={doc.id}
                        onClick={() => toggleLibDocument(doc)}
                        className={`p-4 border rounded-2xl cursor-pointer transition-all duration-200 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center group/item ${
                          isSelected
                            ? 'bg-indigo-50/60 border-indigo-300 shadow-sm'
                            : 'bg-white border-slate-150 hover:border-indigo-300 hover:bg-indigo-50/10 hover:shadow-xs'
                        }`}
                      >
                        <div className="flex items-start gap-3.5 min-w-0 flex-1">
                          <div className={`p-2.5 rounded-xl shrink-0 mt-0.5 transition-all ${isSelected ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-600 group-hover/item:scale-105'}`}>
                            <FileText size={18} />
                          </div>
                          <div className="min-w-0 flex-1 space-y-1">
                            <h4 className="text-xs font-bold text-slate-800 break-words leading-relaxed pr-2">
                              {doc.nama_file || doc.dokumen}
                            </h4>
                            
                            <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                              <span className="px-2 py-0.5 rounded-md font-extrabold bg-slate-150/70 text-slate-600 uppercase tracking-wide">
                                {doc.jenis_dokumen_nama || 'Dokumen'}
                              </span>
                              {doc.ukuran && (
                                <span className="text-slate-400 font-bold">
                                  {formatFileSize(doc.ukuran)}
                                </span>
                              )}
                              {doc.uploader_nama && (
                                <span className="text-slate-400 font-bold">
                                  • Diunggah oleh {doc.uploader_nama}
                                </span>
                              )}
                            </div>

                            {doc.surat_id && (
                              <div className="mt-2 p-2.5 bg-slate-50/50 border border-slate-100 rounded-xl space-y-1 text-[10.5px]">
                                {doc.surat_nomor && (
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-extrabold text-slate-400 uppercase text-[8px] tracking-wider shrink-0 w-16">No. Surat:</span>
                                    <span className="font-bold text-slate-700 break-all bg-slate-100 px-1.5 py-0.5 rounded-md">{doc.surat_nomor}</span>
                                  </div>
                                )}
                                {doc.surat_perihal && (
                                  <div className="flex items-start gap-1.5">
                                    <span className="font-extrabold text-slate-400 uppercase text-[8px] tracking-wider shrink-0 w-16 mt-0.5">Perihal:</span>
                                    <span className="font-medium text-slate-600 break-words leading-relaxed">{doc.surat_perihal}</span>
                                  </div>
                                )}
                                {(doc.surat_asal || doc.surat_tujuan) && (
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-extrabold text-slate-400 uppercase text-[8px] tracking-wider shrink-0 w-16">Instansi:</span>
                                    <span className={`px-1.5 py-0.5 rounded-md font-bold text-[9px] uppercase tracking-wide ${
                                      doc.surat_tipe === 'masuk' 
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                                      : 'bg-amber-50 text-amber-700 border border-amber-100'
                                    }`}>
                                      {doc.surat_tipe === 'masuk' ? `Dari: ${doc.surat_asal}` : `Tujuan: ${doc.surat_tujuan}`}
                                    </span>
                                  </div>
                                )}
                                {doc.surat_tanggal_surat && (
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-extrabold text-slate-400 uppercase text-[8px] tracking-wider shrink-0 w-16">Tgl Surat:</span>
                                    <span className="font-bold text-slate-500">{formatDateSimple(doc.surat_tanggal_surat)}</span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="shrink-0 flex items-center self-center pl-2">
                          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                            isSelected
                              ? 'bg-indigo-600 border-indigo-600 text-white scale-110 shadow-sm'
                              : 'border-slate-300 bg-white group-hover/item:border-indigo-400'
                          }`}>
                            {isSelected && <Check size={13} strokeWidth={3} />}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
              )}
              {filteredLibraryDocs.length === 0 && !isLibraryLoading && (
                <div className="text-center p-8 text-slate-400 text-xs italic">
                  Belum ada dokumen yang terunggah di perpustakaan.
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between shrink-0">
              <span className="text-[10px] font-bold text-slate-500">
                {libSelectedDocs.length > 0
                  ? `${libSelectedDocs.length} dokumen dipilih`
                  : 'Ketuk dokumen untuk memilih'}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setIsLibPickerOpen(false); setPickerTargetPegawaiId(null); setLibSelectedDocs([]); }}
                  className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-[10px] font-black uppercase transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  onClick={confirmLibSelection}
                  disabled={libSelectedDocs.length === 0}
                  className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase transition-all shadow-sm cursor-pointer ${
                    libSelectedDocs.length > 0
                      ? 'bg-indigo-600 hover:bg-indigo-700 text-white hover:shadow-md'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  Simpan {libSelectedDocs.length > 0 ? `${libSelectedDocs.length} Dokumen` : ''}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Document Delete Confirmation Modal */}
      {confirmDeleteDoc && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-300">
            <div className="flex flex-col items-center text-center space-y-6">
              <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center shadow-inner">
                <Trash2 size={32} />
              </div>

              <div className="space-y-2 w-full text-center">
                <h3 className="text-xl font-black text-slate-800 tracking-tight">Hapus Dokumen?</h3>
                {confirmDeleteDoc.isPulled ? (
                  <div className="p-4 bg-amber-50/80 border border-amber-100 rounded-2xl text-left space-y-2.5 mt-2">
                    <p className="text-[11px] text-amber-800 font-black leading-relaxed flex items-center gap-1.5">
                      <span>⚠️</span> DOKUMEN SUDAH DITARIK ATASAN
                    </p>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Dokumen ini sudah dikonsolidasikan oleh atasan Anda sebagai bukti kinerjanya. Jika Anda menghapusnya dari SKP Anda, dokumen pada atasan akan <span className="font-black text-slate-700">TETAP tersimpan</span> sebagai bukti dukung tim.
                    </p>
                    <p className="text-[11px] text-slate-500 font-bold leading-tight">
                      Apakah Anda yakin ingin tetap menghapusnya?
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 leading-relaxed px-4">
                    Dokumen <span className="font-bold text-slate-800">"{confirmDeleteDoc.docName}"</span> akan dihapus dari SKP pegawai ini.
                  </p>
                )}
              </div>

              <div className="w-full space-y-3">
                <button
                  onClick={() => processSkpDocRemoval('unlink')}
                  className="w-full py-4 bg-rose-500 hover:bg-rose-600 text-white rounded-2xl font-bold text-sm shadow-lg shadow-rose-200 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <Trash2 size={18} />
                  <span>Ya, Hapus dari SKP</span>
                </button>

                <button
                  onClick={() => setConfirmDeleteDoc(null)}
                  className="w-full py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-bold text-sm transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  Batal
                </button>
              </div>

              <div className="pt-2">
                <div className="p-3 bg-blue-50 rounded-xl flex items-start gap-3">
                  <Info size={16} className="text-blue-500 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-blue-600 font-bold leading-tight text-left">
                    Pilihan kedua akan tetap menyimpan file Anda di menu Kelola Dokumen agar bisa digunakan kembali nanti.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SKP Edit History Logs Modal */}
      {isHistoryOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[1000] p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between shrink-0 select-none">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-400">
                  <History size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider">
                    Riwayat Perubahan SKP
                  </h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                    Tahun {activeTab === 'summary' ? selectedYear : monthlySelectedYear} - Bidang {getBidangSingkatan(selectedBidangId).toUpperCase()}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsHistoryOpen(false)}
                className="p-2 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-all"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
              {isHistoryLoading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                  <Loader2 size={32} className="animate-spin text-indigo-600" />
                  <span className="text-xs font-bold text-slate-500">Memuat riwayat perubahan...</span>
                </div>
              ) : historyList.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400 select-none">
                  <Info size={40} className="text-slate-300 mb-3" />
                  <p className="text-xs font-bold">Belum ada riwayat aktivitas upload atau perubahan dokumen untuk SKP ini.</p>
                </div>
              ) : (
                <div className="overflow-hidden border border-slate-100 rounded-2xl shadow-sm">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-150 text-[10px] font-black uppercase tracking-wider text-slate-500 select-none">
                        <th className="p-4 w-44">Waktu</th>
                        <th className="p-4 w-44">Pelaku</th>
                        <th className="p-4 w-28 text-center">Aksi</th>
                        <th className="p-4">Detail Perubahan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {historyList.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-50/40 transition-colors">
                          <td className="p-4 text-slate-500 font-mono">
                            {new Date(log.created_at).toLocaleString('id-ID', {
                              dateStyle: 'medium',
                              timeStyle: 'short'
                            })}
                          </td>
                          <td className="p-4 text-slate-700 font-bold">
                            {log.user_nama || 'Sistem'}
                          </td>
                          <td className="p-4 text-center">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                              log.aksi === 'upload' 
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                                : 'bg-rose-50 text-rose-700 border border-rose-100'
                            }`}>
                              {log.aksi === 'upload' ? 'Upload' : 'Hapus'}
                            </span>
                          </td>
                          <td className="p-4 text-slate-600 font-medium leading-relaxed">
                            {log.keterangan}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-5 bg-slate-50 border-t border-slate-150 flex justify-end shrink-0 select-none">
              <button
                onClick={() => setIsHistoryOpen(false)}
                className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-bold text-xs transition-all active:scale-95"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DETAILED MONTHLY DOCUMENTS (LINK / BAHAN UPLOAD) POP UP */}
      {isMonthlyDocsModalOpen && monthlySelectedYear && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-7xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">

            {/* Modal Header */}
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-indigo-500/10 rounded-lg flex items-center justify-center text-indigo-400">
                  <FileSpreadsheet size={18} />
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider">
                    LINK / BAHAN UPLOAD BULANAN TAHUN {monthlySelectedYear}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                    {getBidangName(selectedBidangId)}
                  </p>
                </div>
              </div>

              {/* Division/Bidang Selector inside Header */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-slate-300 uppercase tracking-wider">Bidang:</span>
                  <select
                    value={selectedBidangId || ''}
                    onChange={(e) => setSelectedBidangId(Number(e.target.value))}
                    disabled={!canChangeBidang}
                    className="bg-slate-800 border border-slate-700 text-white text-[11px] rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-1.5 font-bold transition-all outline-none disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {dbBidangList.map(b => (
                      <option key={b.id} value={b.id}>{b.nama_bidang || b.singkatan}</option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={() => setIsMonthlyDocsModalOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50/20">
              <div className="bg-white rounded-2xl border border-slate-155 shadow-sm overflow-x-auto">
                {renderMonthlyDocsTableContent(true)}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between shrink-0">
              {!isPublic ? (
                <button
                  onClick={() => setIsAddingManualItem(true)}
                  className="px-4 py-2 text-xs font-black rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 shadow-md shadow-indigo-600/10 hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  <Plus size={12} />
                  <span>Tambah Butir SKP</span>
                </button>
              ) : <div />}

              <button
                onClick={() => setIsMonthlyDocsModalOpen(false)}
                className="btn-secondary px-5 py-2.5 text-xs font-bold rounded-xl"
              >
                Tutup
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
              ) /* deleted paririmbon block */}

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
                  onClick={() => alert(`Mengunduh berkas: ${activeDetailType === 'penilaian' ? selectedRow.penilaian.docName : selectedRow.perencanaan.docName}`)}
                >
                  <Download size={12} /> Unduh PDF
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Document Viewer Modal for Previews */}
      <DocumentViewerModal
        isOpen={isPreviewOpen}
        onClose={() => {
          setIsPreviewOpen(false);
          setPreviewFileUrl(null);
          setPreviewFileName(null);
          setPreviewIsPrivate(false);
          setPreviewUploadedBy(null);
        }}
        fileUrl={previewFileUrl}
        fileName={previewFileName}
        readOnly={true}
        disableDownload={
          previewIsPrivate
            ? previewUploadedBy !== currentUser?.id
            : false
        }
      />

      {/* Duplicate File Blocked Modal */}
      {duplicateError && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md border border-rose-100 animate-in zoom-in-95 duration-300 overflow-hidden">
            <div className="bg-rose-50 p-8 flex flex-col items-center text-center gap-4">
              <div className="w-20 h-20 bg-white rounded-3xl shadow-xl shadow-rose-100 flex items-center justify-center text-rose-500 mb-2">
                <AlertCircle size={40} strokeWidth={2.5} />
              </div>
              <h3 className="text-xl font-black text-slate-800 tracking-tight">Upload Terblokir</h3>
              <p className="text-sm font-bold text-rose-600/80 leading-relaxed px-4">
                File yang sama telah ada di sistem
              </p>
              <div className="w-full bg-white/60 backdrop-blur-sm border border-rose-100 p-4 rounded-2xl space-y-2">
                <div className="text-left">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Nama Asli File Saat Diunggah</span>
                  <span className="text-xs font-bold text-slate-700 break-all">{duplicateError.nama_asli_unggah}</span>
                </div>
                <div className="h-px bg-rose-100/50 w-full" />
                <div className="text-left">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Nama File Saat Ini</span>
                  <span className="text-xs font-bold text-slate-700 break-all">{duplicateError.nama_file_saat_ini}</span>
                </div>
              </div>
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mt-2 animate-pulse">
                Hubungi admin instansi Anda
              </p>
            </div>
            <div className="p-6">
              <button 
                onClick={() => setDuplicateError(null)}
                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all active:scale-[0.98] shadow-xl shadow-slate-200"
              >
                Mengerti
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Add Manual SKP Item Modal */}
      {isAddingManualItem && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-indigo-500/10 rounded-lg flex items-center justify-center text-indigo-400">
                  <Plus size={18} />
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider">
                    TAMBAH BUTIR SKP
                  </h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                    {getBidangName(selectedBidangId)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsAddingManualItem(false);
                  setNewManualItemName('');
                  setSelectedSubKegName('');
                }}
                className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 bg-slate-50/40">
              {/* Selector Mode Tab */}
              <div className="flex bg-slate-100 p-1.5 rounded-xl border border-slate-200/50">
                <button
                  onClick={() => setAddButirMode('subkegiatan')}
                  className={`flex-1 py-1.5 text-center text-[10px] font-black uppercase tracking-wider rounded-lg transition-all ${
                    addButirMode === 'subkegiatan'
                      ? 'bg-white text-indigo-700 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Pilih Sub-Kegiatan
                </button>
                <button
                  onClick={() => setAddButirMode('manual')}
                  className={`flex-1 py-1.5 text-center text-[10px] font-black uppercase tracking-wider rounded-lg transition-all ${
                    addButirMode === 'manual'
                      ? 'bg-white text-indigo-700 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Ketik Manual
                </button>
              </div>

              {addButirMode === 'subkegiatan' ? (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                    Pilih Sub-Kegiatan Bidang
                  </label>
                  {(() => {
                    const key = `${monthlySelectedYear}_${selectedBidangId || 1}`;
                    const activeNames = new Set([
                      ...getSubActivitiesForBidang(selectedBidangId || 1)
                        .filter(item => !(deletedSkpItems[key] || []).includes(item.name))
                        .map(i => i.name),
                      ...getManualItemsForBidang(selectedBidangId || 1, monthlySelectedYear)
                        .filter(name => !(deletedSkpItems[key] || []).includes(name))
                    ]);
                    const divisionSubActivities = getSubActivitiesForBidang(selectedBidangId || 1)
                      .filter(item => !activeNames.has(item.name));

                    if (divisionSubActivities.length === 0) {
                      return (
                        <div className="p-4 bg-slate-100 rounded-xl text-center text-xs text-slate-400 font-medium border border-slate-200/40">
                          Semua sub-kegiatan bidang sudah terdaftar.
                        </div>
                      );
                    }

                    return (
                      <select
                        value={selectedSubKegName}
                        onChange={(e) => setSelectedSubKegName(e.target.value)}
                        className="w-full max-w-full px-4 py-2.5 rounded-xl border border-slate-200/80 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 outline-none text-xs text-slate-700 bg-white shadow-sm transition-all truncate"
                        style={{ wordBreak: 'break-all' }}
                      >
                        <option value="">-- Pilih Sub-Kegiatan --</option>
                        {divisionSubActivities.map((sa, i) => {
                          const displayName = sa.name.length > 90 ? sa.name.substring(0, 87) + '...' : sa.name;
                          return (
                            <option key={i} value={sa.name} title={sa.name}>
                              {sa.code ? `[${sa.code}] ` : ''}{displayName}
                            </option>
                          );
                        })}
                      </select>
                    );
                  })()}
                </div>
              ) : (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                    Nama Butir SKP Manual
                  </label>
                  <input
                    type="text"
                    value={newManualItemName}
                    onChange={(e) => setNewManualItemName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        if (newManualItemName.trim()) {
                          handleAddManualItem(newManualItemName);
                          setIsAddingManualItem(false);
                          setNewManualItemName('');
                        } else {
                          alert('Nama butir SKP tidak boleh kosong.');
                        }
                      }
                    }}
                    placeholder="Masukkan nama butir SKP baru..."
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200/80 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 outline-none text-xs text-slate-700 bg-white shadow-sm transition-all"
                    autoFocus
                  />
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2 shrink-0">
              <button
                onClick={() => {
                  setIsAddingManualItem(false);
                  setNewManualItemName('');
                  setSelectedSubKegName('');
                }}
                className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 bg-white border border-slate-200 rounded-xl transition-all"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  if (addButirMode === 'subkegiatan') {
                    if (selectedSubKegName) {
                      handleAddManualItem(selectedSubKegName);
                      setIsAddingManualItem(false);
                      setSelectedSubKegName('');
                    } else {
                      alert('Silakan pilih sub-kegiatan terlebih dahulu.');
                    }
                  } else {
                    if (newManualItemName.trim()) {
                      handleAddManualItem(newManualItemName);
                      setIsAddingManualItem(false);
                      setNewManualItemName('');
                    } else {
                      alert('Nama butir SKP tidak boleh kosong.');
                    }
                  }
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-500/10 hover:shadow-indigo-500/20 active:scale-95 transition-all"
              >
                Tambah
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Paririmbon Link Editor Modal */}
      {isParirimbonModalOpen && paririmbonEditYear && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-100 flex flex-col animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-indigo-500/10 rounded-lg flex items-center justify-center text-indigo-400">
                  <FileSpreadsheet size={18} />
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider">
                    {paririmbonEditYear === 'contoh' ? 'KELOLA LINK CONTOH PARIRIMBON' : `KELOLA LINK PARIRIMBON ${paririmbonEditYear}`}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                    {getBidangName(selectedBidangId)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsParirimbonModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 bg-slate-50/40">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                  Link Google Spreadsheet
                </label>
                <input
                  type="url"
                  value={paririmbonInputLink}
                  onChange={(e) => setParirimbonInputLink(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSaveParirimbonLink();
                    }
                  }}
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200/80 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 outline-none text-xs text-slate-700 bg-white shadow-sm transition-all"
                />
              </div>

              <div className="p-4 bg-indigo-50 border border-indigo-100 text-indigo-900 rounded-xl flex gap-3 text-xs leading-relaxed">
                <Info size={16} className="shrink-0 mt-0.5 text-indigo-600" />
                <p>
                  {paririmbonEditYear === 'contoh'
                    ? 'Tempel tautan Google Spreadsheet Contoh Paririmbon untuk bidang ini. Pastikan hak akses spreadsheet telah diatur agar dapat diakses/dilihat oleh pihak ketiga yang berkepentingan.'
                    : `Tempel tautan Google Spreadsheet Paririmbon untuk bidang dan tahun ini. Pastikan hak akses spreadsheet telah diatur agar dapat diakses/dilihat oleh pihak ketiga yang berkepentingan.`}
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2 shrink-0">
              <button
                onClick={() => setIsParirimbonModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 bg-white border border-slate-200 rounded-xl transition-all"
              >
                Batal
              </button>
              <button
                onClick={handleSaveParirimbonLink}
                className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-500/10 hover:shadow-indigo-500/20 active:scale-95 transition-all"
              >
                Simpan Link
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Modal - BATCH MODE (Aligned with document management) */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xl animate-in fade-in duration-300">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-6xl h-[85vh] border border-slate-100 animate-in zoom-in-95 duration-300 relative overflow-hidden flex flex-col">

                {/* Header */}
                <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-white relative z-10 shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl shadow-lg shadow-emerald-100/50">
                            <Upload size={24} strokeWidth={2.5} />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-slate-800 tracking-tight">Upload Dokumen SKP</h3>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-0.5">Konfigurasi Pengunggahan Dokumen SKP Anda</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        {uploadQueue.length > 0 && !uploading && (
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="text-xs font-black text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-4 py-2 rounded-xl transition-all flex items-center gap-2 border border-emerald-100 cursor-pointer"
                            >
                                <FileText size={14} /> Tambah File Lagi
                            </button>
                        )}
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            multiple
                            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.csv,image/*,.zip,.rar,.7z"
                            onChange={handleAppendFilesToQueue}
                        />
                        <button
                            onClick={() => {
                                if (uploading) return;
                                setIsUploadModalOpen(false);
                                setUploadQueue([]);
                                setActiveUploadIdx(-1);
                            }}
                            className="p-2 hover:bg-slate-50 rounded-xl text-slate-400 hover:text-rose-500 transition-all border border-transparent hover:border-slate-100"
                        >
                            <X size={24} />
                        </button>
                    </div>
                </div>

                {/* Body - Split View */}
                <div
                    className="flex-1 flex overflow-hidden"
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                >
                    {/* Left: Queue List (Shows the file we are uploading) */}
                    <div className="w-1/3 border-r border-slate-100 flex flex-col bg-slate-50/30">
                        <div className="p-4 bg-white border-b border-slate-50 flex justify-between items-center shrink-0">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Berkas terpilih</span>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                            {uploadQueue.length === 0 ? (
                                <div
                                    className="h-full border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center p-8 text-center cursor-pointer hover:border-emerald-500 hover:bg-white transition-all group"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <div className="p-5 bg-slate-100 text-slate-300 rounded-3xl mb-4 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                                        <Upload size={32} />
                                    </div>
                                    <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Klik atau seret file ke sini</p>
                                </div>
                            ) : (
                                uploadQueue.map((item, idx) => (
                                    <div
                                        key={item.id}
                                        onClick={() => !uploading && setActiveUploadIdx(idx)}
                                        className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden group ${
                                            activeUploadIdx === idx
                                            ? 'bg-white border-emerald-500 ring-4 ring-emerald-500/5 shadow-xl shadow-emerald-100/50'
                                            : 'bg-white border-slate-100 hover:border-slate-300 shadow-sm'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3 relative z-10">
                                            <div className={`p-2.5 rounded-xl ${
                                                item.status === 'success' ? 'bg-emerald-100 text-emerald-600' :
                                                item.status === 'error' ? 'bg-rose-100 text-rose-600' :
                                                item.status === 'uploading' ? 'bg-indigo-50 text-indigo-600' :
                                                'bg-slate-100 text-slate-400'
                                            }`}>
                                                {item.status === 'uploading' ? <Loader2 size={16} className="animate-spin" /> : getFileIcon(item.file.name)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-black text-slate-800 truncate">{item.namaVisual + item.ekstensi}</p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-[9px] font-black text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md uppercase">{formatSize(item.file.size)}</span>
                                                    {item.jenisId && (
                                                        <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md uppercase border border-emerald-100">
                                                            {jenisList.find(j => String(j.id) === item.jenisId)?.dokumen || 'Jenis'}
                                                        </span>
                                                    )}
                                                    {item.status === 'uploading' && item.progress !== undefined && (
                                                        <span className="text-[9px] font-extrabold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                                                            MENGUNGGAH {item.progress}%
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Progress Bar (Visible during upload) */}
                                        {item.status === 'uploading' && item.progress !== undefined && (
                                            <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-100">
                                                <div 
                                                    className="h-full bg-indigo-600 transition-all duration-300" 
                                                    style={{ width: `${item.progress}%` }}
                                                />
                                            </div>
                                        )}

                                        {item.status === 'error' && (
                                            <p className="mt-2 text-[9px] font-black text-rose-500 uppercase tracking-widest relative z-10">{item.errorMsg}</p>
                                        )}
                                        {item.status === 'success' && (
                                            <div className="absolute top-2 right-2 text-emerald-500 relative z-10">
                                                <CheckCircle2 size={14} />
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Right: Item Detail Form */}
                    <div className="flex-1 overflow-y-auto bg-white p-10 custom-scrollbar">
                        {activeUploadIdx !== -1 ? (
                            <div className="max-w-2xl mx-auto space-y-10 animate-in fade-in slide-in-from-right-4 duration-500">
                                <div className="flex items-center gap-6">
                                    <div className="w-24 h-24 bg-slate-50 rounded-[2rem] flex items-center justify-center border-2 border-slate-100 shadow-inner">
                                        {getFileIcon(uploadQueue[activeUploadIdx].file.name)}
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="text-xl font-black text-slate-800 tracking-tight leading-tight mb-2">
                                            Konfigurasi File
                                        </h4>
                                        <div className="flex items-center gap-3">
                                            <span className="px-3 py-1 bg-slate-100 text-slate-500 rounded-full text-[10px] font-black uppercase tracking-widest">
                                                {uploadQueue[activeUploadIdx].file.name.split('.').pop()}
                                            </span>
                                            <span className="px-3 py-1 bg-slate-100 text-slate-500 rounded-full text-[10px] font-black uppercase tracking-widest">
                                                {formatSize(uploadQueue[activeUploadIdx].file.size)}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-8">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Nama File Visual</label>
                                        <div className="flex">
                                            <input
                                                type="text"
                                                className="input-modern w-full rounded-r-none border-r-0 focus:border-r !py-4"
                                                value={uploadQueue[activeUploadIdx].namaVisual}
                                                onChange={(e) => updateActiveItem({ namaVisual: e.target.value })}
                                                placeholder="Masukkan nama file..."
                                            />
                                            <span className="flex items-center px-6 bg-slate-50 border border-slate-200 border-l-0 rounded-r-2xl text-slate-500 font-bold text-xs select-none shadow-inner">
                                                {uploadQueue[activeUploadIdx].ekstensi}
                                            </span>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Jenis Dokumen</label>
                                        <SearchableSelect
                                            options={jenisList.map(j => ({ id: j.id, label: j.dokumen }))}
                                            value={uploadQueue[activeUploadIdx].jenisId}
                                            onChange={handleJenisSelectInUpload}
                                            placeholder="-- Pilih Jenis Dokumen --"
                                            isOpen={isUploadJenisOpen}
                                            setIsOpen={setIsUploadJenisOpen}
                                            searchQuery={uploadJenisSearch}
                                            setSearchQuery={setUploadJenisSearch}
                                            containerRef={uploadJenisRef}
                                            className="!py-1"
                                        />
                                    </div>

                                    {/* Bidang Urusan Dropdown (Opsional) */}
                                    <div className="relative" ref={uploadUrusanRef}>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Bidang Urusan (Opsional)</label>
                                        <div
                                            className="min-h-[56px] p-3 border border-slate-200 rounded-2xl bg-white cursor-pointer flex flex-wrap gap-2 items-center hover:border-indigo-500 transition-all shadow-sm"
                                            onClick={() => setIsUploadUrusanOpen(!isUploadUrusanOpen)}
                                        >
                                            {(uploadQueue[activeUploadIdx].bidangUrusanIds || []).length > 0 ? (
                                                uploadQueue[activeUploadIdx].bidangUrusanIds?.map(id => {
                                                    const u = bidangUrusanList.find(x => x.id === id);
                                                    return (
                                                        <span key={id} className="px-4 py-1.5 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-black border border-indigo-100 flex items-center gap-2 shadow-sm">
                                                            {u?.urusan}
                                                            <X
                                                                size={12}
                                                                className="hover:text-rose-500 transition-colors"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    toggleActiveUrusan(id);
                                                                }}
                                                            />
                                                        </span>
                                                    );
                                                })
                                            ) : (
                                                <span className="text-xs text-slate-400 ml-2">Pilih bidang urusan...</span>
                                            )}
                                        </div>

                                        {isUploadUrusanOpen && (
                                            <div className="absolute z-[100] w-full bottom-full mb-3 bg-white border border-slate-200 shadow-2xl rounded-[1.5rem] p-5 animate-in fade-in zoom-in-95 duration-200 origin-bottom">
                                                <div className="flex items-center justify-between mb-4 px-1">
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pilih Bidang Urusan</span>
                                                    <X size={16} className="text-slate-400 cursor-pointer hover:text-rose-500 transition-colors" onClick={() => setIsUploadUrusanOpen(false)} />
                                                </div>
                                                <div className="relative mb-4">
                                                    <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-500 opacity-50" />
                                                    <input
                                                        type="text"
                                                        className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border-2 border-transparent focus:border-indigo-500/20 rounded-2xl text-[12px] font-black focus:ring-0 transition-all placeholder:font-normal placeholder:text-slate-400 shadow-inner"
                                                        placeholder="Cari bidang urusan..."
                                                        value={uploadUrusanSearch}
                                                        onChange={(e) => setUploadUrusanSearch(e.target.value)}
                                                        autoFocus
                                                    />
                                                </div>
                                                <div className="max-h-[200px] overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                                                    {bidangUrusanList
                                                        .filter(u => (u.urusan || '').toLowerCase().includes(uploadUrusanSearch.toLowerCase()))
                                                        .map(u => (
                                                            <div
                                                                key={u.id}
                                                                className={`flex items-center justify-between p-3 rounded-xl text-[11px] font-black cursor-pointer transition-all border ${
                                                                    (uploadQueue[activeUploadIdx].bidangUrusanIds || []).includes(u.id)
                                                                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-100'
                                                                    : 'hover:bg-slate-50 text-slate-600 border-transparent hover:border-slate-100'
                                                                }`}
                                                                onClick={() => toggleActiveUrusan(u.id)}
                                                            >
                                                                <span>{u.urusan}</span>
                                                                {(uploadQueue[activeUploadIdx].bidangUrusanIds || []).includes(u.id) ? <CheckCircle2 size={16} /> : <div className="w-5 h-5 rounded-full border-2 border-slate-100" />}
                                                            </div>
                                                        ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Tagging Tematik */}
                                    <div className="relative" ref={uploadTagRef}>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Tagging Tematik (Opsional)</label>
                                        <div
                                            className="min-h-[56px] p-3 border border-slate-200 rounded-2xl bg-white cursor-pointer flex flex-wrap gap-2 items-center hover:border-emerald-500 transition-all shadow-sm"
                                            onClick={() => setIsUploadTagOpen(!isUploadTagOpen)}
                                        >
                                            {uploadQueue[activeUploadIdx].tematikIds.length > 0 ? (
                                                uploadQueue[activeUploadIdx].tematikIds.map(id => {
                                                    const t = tematikList.find(x => x.id === id);
                                                    return (
                                                        <span key={id} className="px-4 py-1.5 bg-emerald-50 text-emerald-600 rounded-xl text-[10px] font-black border border-emerald-100 flex items-center gap-2 shadow-sm">
                                                            {t?.nama}
                                                            <X
                                                                size={12}
                                                                className="hover:text-rose-500 transition-colors"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    toggleActiveTematik(id);
                                                                }}
                                                            />
                                                        </span>
                                                    );
                                                })
                                            ) : (
                                                <span className="text-xs text-slate-400 ml-2">Pilih tagging tematik...</span>
                                            )}
                                        </div>

                                        {isUploadTagOpen && (
                                            <div className="absolute z-[100] w-full bottom-full mb-3 bg-white border border-slate-200 shadow-2xl rounded-[1.5rem] p-5 animate-in fade-in zoom-in-95 duration-200 origin-bottom">
                                                <div className="flex items-center justify-between mb-4 px-1">
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pilih Tagging</span>
                                                    <X size={16} className="text-slate-400 cursor-pointer hover:text-rose-500 transition-colors" onClick={() => setIsUploadTagOpen(false)} />
                                                </div>
                                                <div className="relative mb-4">
                                                    <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500 opacity-50" />
                                                    <input
                                                        type="text"
                                                        className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border-2 border-transparent focus:border-emerald-500/20 rounded-2xl text-[12px] font-black focus:ring-0 transition-all placeholder:font-normal placeholder:text-slate-400 shadow-inner"
                                                        placeholder="Cari tema / tagging..."
                                                        value={uploadTagSearch}
                                                        onChange={(e) => setUploadTagSearch(e.target.value)}
                                                        autoFocus
                                                    />
                                                </div>
                                                <div className="max-h-[200px] overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                                                    {tematikList
                                                        .filter(t => t.nama.toLowerCase().includes(uploadTagSearch.toLowerCase()))
                                                        .map(t => (
                                                            <div
                                                                key={t.id}
                                                                className={`flex items-center justify-between p-3 rounded-xl text-[11px] font-black cursor-pointer transition-all border ${
                                                                    uploadQueue[activeUploadIdx].tematikIds.includes(t.id)
                                                                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-100'
                                                                    : 'hover:bg-slate-50 text-slate-600 border-transparent hover:border-slate-100'
                                                                }`}
                                                                onClick={() => toggleActiveTematik(t.id)}
                                                            >
                                                                <span>{t.nama}</span>
                                                                {uploadQueue[activeUploadIdx].tematikIds.includes(t.id) ? <CheckCircle2 size={16} /> : <div className="w-5 h-5 rounded-full border-2 border-slate-100" />}
                                                            </div>
                                                        ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Akses Dokumen Toggle (Pribadi vs Share) */}
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Akses Dokumen</label>
                                        <div className="grid grid-cols-2 gap-3">
                                            <button
                                                type="button"
                                                onClick={() => updateActiveItem({ isPrivate: false })}
                                                className={`p-3.5 rounded-2xl border-2 font-black text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                                                    !uploadQueue[activeUploadIdx].isPrivate
                                                    ? 'border-emerald-600 bg-emerald-50 text-emerald-700 shadow-sm'
                                                    : 'border-slate-150 bg-white text-slate-500 hover:border-slate-300'
                                                }`}
                                            >
                                                <Share2 size={16} />
                                                <span>Share (Publik)</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => updateActiveItem({ isPrivate: true })}
                                                className={`p-3.5 rounded-2xl border-2 font-black text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                                                    uploadQueue[activeUploadIdx].isPrivate
                                                    ? 'border-amber-600 bg-amber-50 text-amber-700 shadow-sm'
                                                    : 'border-slate-150 bg-white text-slate-500 hover:border-slate-300'
                                                }`}
                                            >
                                                <Lock size={16} />
                                                <span>Pribadi (Private)</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-center space-y-6">
                                <div className="w-24 h-24 bg-slate-50 rounded-[2.5rem] flex items-center justify-center border-2 border-dashed border-slate-200">
                                    <FileText size={40} className="text-slate-300" />
                                </div>
                                <div>
                                    <p className="text-sm font-black text-slate-600">Seret file atau pilih berkas untuk melanjutkan</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer - Actions */}
                <div className="p-8 bg-slate-50 border-t border-slate-100 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-4">
                        <div>
                            <p className="text-xs font-black text-slate-800 leading-none">Berkas Siap Unggah</p>
                            <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">{uploadQueue.length} File Terpilih</p>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <button
                            onClick={() => {
                                setIsUploadModalOpen(false);
                                setUploadQueue([]);
                                setActiveUploadIdx(-1);
                            }}
                            className="px-8 py-4 rounded-2xl border border-slate-200 text-slate-500 font-black text-xs uppercase tracking-widest hover:bg-white transition-all active:scale-[0.98]"
                        >
                            Batal
                        </button>
                        <button
                            onClick={handleUpload}
                            disabled={uploadQueue.length === 0 || uploading}
                            className={`px-12 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all duration-300 shadow-xl flex items-center justify-center gap-3 ${
                                uploadQueue.length > 0 && !uploading
                                ? 'bg-emerald-600 text-white shadow-emerald-100 hover:scale-[1.02] active:scale-[0.98]'
                                : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                            }`}
                        >
                            {uploading ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" />
                                    <span>Mengunggah...</span>
                                </>
                            ) : (
                                <span>Mulai Upload</span>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* CUSTOM ASSIGNMENT MODAL */}
      {assignmentModalOpen && assignmentButirSkp && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[200] p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-indigo-500/10 rounded-lg flex items-center justify-center text-indigo-400">
                  <Target size={18} />
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider">Atur Penugasan Butir SKP</h3>
                  <p className="text-[10px] text-slate-400 font-bold mt-0.5 max-w-xs truncate">{assignmentButirSkp}</p>
                </div>
              </div>
              <button onClick={() => setAssignmentModalOpen(false)} className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Direct Month & Target Config Banner */}
              <button
                type="button"
                onClick={() => {
                  const targetName = assignmentButirSkp;
                  setAssignmentModalOpen(false);
                  setSkpConfigModalState({ isOpen: true, butirSkpName: targetName });
                }}
                className="w-full p-3 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 text-xs font-bold rounded-2xl transition-all flex items-center justify-between cursor-pointer active:scale-98 shadow-2xs"
              >
                <div className="flex items-center gap-2">
                  <Calendar size={15} className="text-amber-600" />
                  <span>Atur Bulan Aktif & Tipe Target (Progress / Output)</span>
                </div>
                <span className="text-[10px] bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full font-black uppercase">Setting Bulan</span>
              </button>

              {/* Scope Selection */}
              <div>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Scope Penugasan</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: 'bidang', label: 'Seluruh Bidang', desc: 'Semua PNS & PPPK di bidang ini', icon: <Users size={14} /> },
                    { value: 'tim', label: 'Spesifik Tim', desc: 'Anggota tim kerja tertentu', icon: <UserCheck size={14} /> },
                    { value: 'peran', label: 'Katim / Kabid', desc: 'Hanya jabatan struktural', icon: <Building size={14} /> },
                    { value: 'individu', label: 'Per Individu', desc: 'Satu atau beberapa orang', icon: <Target size={14} /> },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => {
                        if (assignmentTargetScope !== opt.value) {
                          setAssignmentTargetScope(opt.value as any);
                          setAssignmentTargetId(null);
                          setAssignmentPegawaiIds([]);
                        }
                      }}
                      className={`p-3 rounded-xl border-2 text-left transition-all ${
                        assignmentTargetScope === opt.value
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-slate-100 hover:border-slate-200 bg-white'
                      }`}
                    >
                      <div className={`flex items-center gap-1.5 mb-1 font-black text-[11px] ${ assignmentTargetScope === opt.value ? 'text-indigo-700' : 'text-slate-700' }`}>
                        {opt.icon} {opt.label}
                      </div>
                      <p className="text-[10px] text-slate-400">{opt.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Tim selector */}
              {assignmentTargetScope === 'tim' && (
                <div className="space-y-4">
                  <div>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Pilih Tim Kerja</p>
                    <div className="space-y-1.5 max-h-40 overflow-y-auto">
                      {(() => {
                        const teamsMap = new Map<number, string>();
                        dbPegawaiList
                          .filter(p => p.sub_bidang_id && (!selectedBidangId || Number(p.bidang_id) === selectedBidangId))
                          .forEach(p => {
                            const teamId = Number(p.sub_bidang_id);
                            if (!teamsMap.has(teamId)) {
                              const rawName = p.sub_bidang_nama?.split(',')[0] || `Tim ${teamId}`;
                              teamsMap.set(teamId, rawName.replace(/\s+/g, ' ').trim());
                            }
                          });

                        return Array.from(teamsMap.entries()).map(([teamId, teamNama]) => (
                          <button
                            key={teamId}
                            onClick={() => {
                              setAssignmentTargetId(teamId);
                              const teamMemberIds = dbPegawaiList
                                .filter(p => {
                                  if (selectedBidangId && Number(p.bidang_id) !== selectedBidangId) return false;
                                  const pSubBidangId = Number(p.sub_bidang_id);
                                  const pSubBidangIds = Array.isArray((p as any).sub_bidang_ids)
                                    ? (p as any).sub_bidang_ids.map(Number)
                                    : (pSubBidangId ? [pSubBidangId] : []);
                                  return pSubBidangIds.includes(teamId);
                                })
                                .map(p => Number(p.id));
                              setAssignmentPegawaiIds(teamMemberIds);
                            }}
                            className={`w-full p-3 rounded-xl border-2 text-left text-[11px] font-black transition-all ${
                              assignmentTargetId === teamId ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-100 text-slate-600 hover:border-slate-200'
                            }`}
                          >
                            {teamNama}
                          </button>
                        ));
                      })()}
                    </div>
                  </div>

                  {/* Extra & Team Members Checklist */}
                  {assignmentTargetId !== null && (
                    <div className="pt-3 border-t border-slate-100">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-[10px] font-black text-slate-600 uppercase tracking-wider">
                          Daftar Pegawai
                        </p>
                        <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                          {assignmentPegawaiIds.length} pegawai terpilih
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 mb-2">
                        Anggota tim otomatis tercentang. Anda dapat mencentang atau menghilangkan centang (uncheck) pegawai mana saja.
                      </p>
                      <div className="space-y-1 max-h-40 overflow-y-auto">
                        {dbPegawaiList
                          .filter(p => !selectedBidangId || Number(p.bidang_id) === selectedBidangId)
                          .sort((a,b) => a.nama_lengkap?.localeCompare(b.nama_lengkap))
                          .map(p => {
                            const pid = Number(p.id);
                            const pSubBidangId = Number(p.sub_bidang_id);
                            const pSubBidangIds = Array.isArray((p as any).sub_bidang_ids)
                              ? (p as any).sub_bidang_ids.map(Number)
                              : (pSubBidangId ? [pSubBidangId] : []);
                            const isTeamMember = pSubBidangIds.includes(Number(assignmentTargetId));
                            const selected = assignmentPegawaiIds.includes(pid);

                            return (
                              <button
                                key={p.id}
                                onClick={() => {
                                  setAssignmentPegawaiIds(prev =>
                                    selected ? prev.filter(x => x !== pid) : [...prev, pid]
                                  );
                                }}
                                className={`w-full p-2.5 rounded-xl border-2 text-left text-[11px] transition-all flex items-center justify-between cursor-pointer ${
                                  selected ? 'border-indigo-500 bg-indigo-50 text-indigo-700 font-black' : 'border-slate-100 text-slate-600 hover:border-slate-200 font-semibold'
                                }`}
                              >
                                <div className="flex items-center gap-2 truncate">
                                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${ selected ? 'border-indigo-500 bg-indigo-500' : 'border-slate-300' }`}>
                                    {selected && <Check size={10} className="text-white" />}
                                  </div>
                                  <span className="truncate">{p.nama_lengkap}</span>
                                </div>
                                {isTeamMember && (
                                  <span className="text-[9px] font-bold text-indigo-600 bg-indigo-100/70 px-1.5 py-0.5 rounded ml-2 shrink-0">
                                    Anggota Tim
                                  </span>
                                )}
                              </button>
                            );
                          })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Individu selector */}
              {assignmentTargetScope === 'individu' && (
                <div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Pilih Pegawai ({assignmentPegawaiIds.length} dipilih)</p>
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {dbPegawaiList
                      .filter(p => !selectedBidangId || Number(p.bidang_id) === selectedBidangId)
                      .sort((a,b) => a.nama_lengkap?.localeCompare(b.nama_lengkap))
                      .map(p => {
                        const selected = assignmentPegawaiIds.includes(Number(p.id));
                        return (
                          <button
                            key={p.id}
                            onClick={() => {
                              const pid = Number(p.id);
                              setAssignmentPegawaiIds(prev =>
                                selected ? prev.filter(x => x !== pid) : [...prev, pid]
                              );
                            }}
                            className={`w-full p-2.5 rounded-xl border-2 text-left text-[11px] transition-all flex items-center gap-2 ${
                              selected ? 'border-indigo-500 bg-indigo-50 text-indigo-700 font-black' : 'border-slate-100 text-slate-600 hover:border-slate-200 font-semibold'
                            }`}
                          >
                            <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${ selected ? 'border-indigo-500 bg-indigo-500' : 'border-slate-300' }`}>
                              {selected && <Check size={10} className="text-white" />}
                            </div>
                            {p.nama_lengkap}
                          </button>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setAssignmentModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-500 font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all"
                >
                  Batal
                </button>
                <button
                  onClick={handleSaveAssignment}
                  disabled={isSavingAssignment || (assignmentTargetScope === 'tim' && !assignmentTargetId) || (assignmentTargetScope === 'individu' && assignmentPegawaiIds.length === 0)}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isSavingAssignment ? <><Loader2 size={14} className="animate-spin" /> Menyimpan...</> : <><Check size={14} /> Simpan Penugasan</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SubKegiatan SKP Config Modal */}
      {skpConfigModalState.isOpen && skpConfigModalState.butirSkpName && (
        <SubKegiatanSkpConfigModal
          isOpen={skpConfigModalState.isOpen}
          onClose={() => setSkpConfigModalState(prev => ({ ...prev, isOpen: false }))}
          butirSkpName={skpConfigModalState.butirSkpName}
          bidangId={selectedBidangId || undefined}
          tahun={monthlySelectedYear}
          onSaved={() => fetchMonthlyConfigsFromDb(selectedBidangId || 1)}
        />
      )}

    </div>
  );
}
