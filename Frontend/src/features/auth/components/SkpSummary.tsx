import React, { useState, useEffect, useRef } from 'react';
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
  Copy,
  Building,
  Pencil,
  Loader2,
  FileIcon,
  FileImage,
  FileQuestion,
  Undo,
  Upload,
  ChevronRight
} from 'lucide-react';
import { api } from '@/src/services/api';
import { useAuth } from '@/src/contexts/AuthContext';
import { DocumentViewerModal } from '@/src/components/modals/DocumentViewerModal';  // Fetch profiles, divisions, and library documents
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
  status: 'idle' | 'uploading' | 'success' | 'error';
  errorMsg?: string;
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
}

interface SkpItem {
  name: string;
  code?: string;
  isManual?: boolean;
}

export default function SkpSummary({ isPublic = false }: { isPublic?: boolean }) {
  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.tipe_user_id === 1 || [2, 5, 7, 8].includes(currentUser?.tipe_user_id || 0);

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

  const uploadTagRef = useRef<HTMLDivElement>(null);
  const uploadJenisRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const monthlyHeaderRef = useRef<HTMLDivElement>(null);
  const monthlyTableRef = useRef<HTMLDivElement>(null);

  // Perencanaan Modal State
  const [isPerencanaanModalOpen, setIsPerencanaanModalOpen] = useState(false);
  const [modalYear, setModalYear] = useState<number | null>(null);
  const [modalType, setModalType] = useState<'perencanaan' | 'penilaian' | 'upload'>('perencanaan');
  const [selectedBidangId, setSelectedBidangId] = useState<number | null>(null);
  const [showUnsubmittedOnly, setShowUnsubmittedOnly] = useState(false);
  const [searchPegawaiTerm, setSearchPegawaiTerm] = useState('');

  // Sub-modal Library Document Picker
  const [isLibPickerOpen, setIsLibPickerOpen] = useState(false);
  const [pickerTargetPegawaiId, setPickerTargetPegawaiId] = useState<number | null>(null);
  const [libSearchTerm, setLibSearchTerm] = useState('');
  const [confirmDeleteDoc, setConfirmDeleteDoc] = useState<{ pegawaiId: number; docId: number; docName: string | null } | null>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (uploading) return;
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const extension = file.name.substring(file.name.lastIndexOf('.'));
      const visualName = file.name.substring(0, file.name.lastIndexOf('.'));

      let defaultJenisId = '';
      const cat = targetKategori || 'perencanaan';
      if (jenisList && jenisList.length > 0) {
        const found = jenisList.find(j => {
          const name = j.dokumen.toLowerCase();
          return cat === 'perencanaan'
            ? name.includes('perencanaan') || name === 'dokumen'
            : name.includes('penilaian') || name.includes('laporan akhir');
        });
        if (found) {
          defaultJenisId = String(found.id);
        } else {
          defaultJenisId = String(jenisList[0].id);
        }
      }

      setUploadQueue([
        {
          id: Math.random().toString(36).substring(2, 9),
          file: file,
          namaVisual: visualName,
          ekstensi: extension,
          jenisId: defaultJenisId,
          tematikIds: [],
          status: 'idle'
        }
      ]);
      setActiveUploadIdx(0);
    }
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

            const res = await api.dokumen.upload(formData);

            if (res.success && res.data) {
                successCount++;
                setUploadQueue(prev => {
                    const next = [...prev];
                    next[i].status = 'success';
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
                      selectedBidangId || currentUser?.bidang_id || 1
                    );
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
    if (['docx', 'doc'].includes(ext || '')) return <FileText className="text-indigo-500" size={20} />;
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
  } | null>(null);
  const tooltipTimeoutRef = useRef<any>(null);

  // Preview Modal state
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewFileUrl, setPreviewFileUrl] = useState<string | null>(null);
  const [previewFileName, setPreviewFileName] = useState<string | null>(null);

  const handlePreviewDocument = (docPath: string | null, docName: string | null) => {
    if (!docPath) {
      alert('Dokumen tidak ditemukan atau belum diunggah secara fisik.');
      return;
    }
    setPreviewFileUrl(docPath);
    setPreviewFileName(docName || 'Dokumen SKP');
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
  const [manualSkpItems, setManualSkpItems] = useState<Record<number, string[]>>(() => {
    try {
      const saved = localStorage.getItem('skp_manual_skp_items');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to parse manual skp items:', e);
    }
    return {};
  });
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

  // Paririmbon links state initialized from localStorage
  const [paririmbonLinks, setParirimbonLinks] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem('skp_paririmbon_links');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to parse paririmbon links:', e);
    }
    return {};
  });
  const [isParirimbonModalOpen, setIsParirimbonModalOpen] = useState(false);
  const [paririmbonEditYear, setParirimbonEditYear] = useState<number | null>(null);
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
    year: number;
    history: any[];
  } | null>(null);

  const paririmbonEnterTimeoutRef = useRef<any>(null);
  const paririmbonLeaveTimeoutRef = useRef<any>(null);

  const openParirimbonEditModal = (year: number) => {
    setParirimbonEditYear(year);
    const key = `${year}_${selectedBidangId || 1}`;
    setParirimbonInputLink(paririmbonLinks[key] || '');
    setIsParirimbonModalOpen(true);
  };

  const handleSaveParirimbonLink = () => {
    if (!paririmbonEditYear) return;
    const bidId = selectedBidangId || 1;
    const key = `${paririmbonEditYear}_${bidId}`;
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

    const updatedLinks = { ...paririmbonLinks, [key]: newLink };

    // Save to state
    setParirimbonLinks(updatedLinks);

    // Save to localStorage
    localStorage.setItem('skp_paririmbon_links', JSON.stringify(updatedLinks));

    setIsParirimbonModalOpen(false);

    // Refresh summary view to reflect updated Paririmbon status
    fetchSummaryFromDb(bidId);
  };

  const handleParirimbonMouseEnter = (e: React.MouseEvent, year: number) => {
    if (paririmbonLeaveTimeoutRef.current) {
      clearTimeout(paririmbonLeaveTimeoutRef.current);
      paririmbonLeaveTimeoutRef.current = null;
    }

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const bidId = selectedBidangId || 1;
    const key = `${year}_${bidId}`;
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
        const [pegawaiRes, bidangRes, dokumenRes, mkiRes, jenisRes, tematikRes] = await Promise.all([
          api.profilPegawai.getAll(),
          api.bidangInstansi.getAll(),
          api.dokumen.getAll(),
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
        if (dokumenRes.success) setLibraryDocs(dokumenRes.data || []);
        if (mkiRes && mkiRes.success && mkiRes.data) {
          setMappingSubKegiatans(mkiRes.data.sub_kegiatan || []);
        }
        if (jenisRes.success) setJenisList(jenisRes.data || []);
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

  // Handle clicking outside of dropdowns to close them
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        const target = event.target as HTMLElement;
        if (uploadTagRef.current && !uploadTagRef.current.contains(target)) setIsUploadTagOpen(false);
        if (uploadJenisRef.current && !uploadJenisRef.current.contains(target)) setIsUploadJenisOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
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
    // Always build from dbPegawaiList first (outside try/catch) so total count is always correct
    const eligibleEmployees = dbPegawaiList.filter(p => Number(p.bidang_id) === bidangId);

    let dbData: any[] = [];
    try {
      if ((api as any).skp) {
        const res = await (api as any).skp.getPegawaiRecords(year, bidangId);
        if (res && res.success && res.data) {
          dbData = res.data;
        }
      }
    } catch (err) {
      console.warn('SKP API not available, showing all employees as not yet submitted:', err);
    }

    const records: PegawaiSkpRecord[] = eligibleEmployees.map(emp => {
      const dbRow = dbData.find((r: any) => Number(r.pegawaiId) === Number(emp.id)) || null;
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
        pendukungDocName: dbRow?.pendukungDocName || null,
        pendukungDocId: dbRow?.pendukungDocId || null,
        pendukungDocPath: dbRow?.pendukungDocPath || null,
        pendukungUpdatedAt: dbRow?.pendukungUpdatedAt ? new Date(dbRow.pendukungUpdatedAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : null
      };
    });

    const key = `${year}_${bidangId}`;
    setPegawaiSkpState(prev => ({ ...prev, [key]: records }));
  };

  // Fetch summary from DB
  const fetchSummaryFromDb = async (bidangId: number) => {
    try {
      const res = await api.skp.getSummary(bidangId);
      if (res && res.success && res.data) {
        let localParirimbonLinks: Record<string, string> = {};
        try {
          const saved = localStorage.getItem('skp_paririmbon_links');
          if (saved) localParirimbonLinks = JSON.parse(saved);
        } catch (e) {
          console.error('Failed to parse paririmbon links in fetch:', e);
        }

        const mappedRows: SkpRow[] = res.data.map((row: any) => {
          const paririmbonKey = `${row.tahun}_${bidangId}`;
          const hasLink = !!localParirimbonLinks[paririmbonKey];
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
              docName: localParirimbonLinks[paririmbonKey] || '',
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
      console.error('Failed to fetch SKP summary:', err);
    }
  };

  // Pre-populate all years immediately on mount/bidang change so the table is loaded
  useEffect(() => {
    if (selectedBidangId) {
      const years = [2024, 2025, 2026, 2027];
      years.forEach(yr => {
        fetchSkpRecordsFromDb(yr, selectedBidangId);
      });
      fetchSummaryFromDb(selectedBidangId);
    }
  }, [selectedBidangId, dbPegawaiList]);

  const getActiveRecords = (): PegawaiSkpRecord[] => {
    if (!modalYear || !selectedBidangId) return [];
    const key = `${modalYear}_${selectedBidangId}`;
    return pegawaiSkpState[key] || [];
  };

  // Helper to fetch ratio for main table columns
  const getYearSubmissionRatio = (year: number, category: 'perencanaan' | 'penilaian' | 'upload' = 'perencanaan'): { submitted: number; total: number } => {
    const bid = selectedBidangId || 1;
    const key = `${year}_${bid}`;
    const records = pegawaiSkpState[key] || [];
    if (records.length === 0) {
      return { submitted: 0, total: 0 };
    }
    const submitted = records.filter(r => {
      const docName = category === 'perencanaan' ? r.perencanaanDocName :
                      category === 'penilaian' ? r.penilaianDocName :
                      r.pendukungDocName;
      return docName !== null;
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
    bidangId?: number
  ) => {
    const yr = year || modalYear;
    let cat: 'perencanaan' | 'penilaian' | 'pendukung' = (category || modalType) as any;
    if ((cat as string) === 'upload') cat = 'pendukung';
    const bid = bidangId || selectedBidangId || currentUser?.bidang_id || 1;

    if (!yr || !bid) return;

    try {
      const payload = {
        pegawai_id: pegawaiId,
        tahun: yr,
        bidang_id: bid,
        kategori: cat,
        doc_name: docName,
        doc_id: docId,
        status: docName ? 'Draft' : 'Draft'
      };
      const res = await api.skp.savePegawaiRecord(payload);
      if (res && res.success) {
        // Refetch to sync state
        fetchSkpRecordsFromDb(yr, bid);
        fetchSummaryFromDb(bid);
      } else {
        alert(res?.message || 'Gagal menyimpan dokumen SKP');
      }
    } catch (err: any) {
      console.error('Failed to save pegawai SKP record:', err);
      alert('Terjadi kesalahan saat menyimpan dokumen: ' + err.message);
    }
  };

  // Handle local File Upload
  const handleLocalSkpUpload = (e: React.ChangeEvent<HTMLInputElement>, pegawaiId: number) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const extension = file.name.substring(file.name.lastIndexOf('.'));
      const visualName = file.name.substring(0, file.name.lastIndexOf('.'));

      // Find default jenis id based on category
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
        if (found) {
          defaultJenisId = String(found.id);
        } else {
          defaultJenisId = String(jenisList[0].id);
        }
      }

      setUploadQueue([
        {
          id: Math.random().toString(36).substring(2, 9),
          file: file,
          namaVisual: visualName,
          ekstensi: extension,
          jenisId: defaultJenisId,
          tematikIds: [],
          status: 'idle'
        }
      ]);
      setActiveUploadIdx(0);
      setTargetPegawaiId(pegawaiId);
      setTargetKategori(modalType === 'upload' ? 'pendukung' : modalType);
      setTargetTahun(modalYear);
      setIsUploadModalOpen(true);

      e.target.value = '';
    }
  };

  // Handle Select Library Document Picker
  const openLibPicker = (pegawaiId: number) => {
    setPickerTargetPegawaiId(pegawaiId);
    setIsLibPickerOpen(true);
  };

  const selectLibDocument = async (doc: any) => {
    if (pickerTargetPegawaiId) {
      await savePegawaiSkpDoc(pickerTargetPegawaiId, doc.nama_file || doc.dokumen, doc.id);
    }
    setIsLibPickerOpen(false);
    setPickerTargetPegawaiId(null);
  };

  const removeSkpDocument = async (pegawaiId: number, docId: number | null, docName: string | null) => {
    if (!docId) {
      await savePegawaiSkpDoc(pegawaiId, null, null);
      return;
    }
    setConfirmDeleteDoc({ pegawaiId, docId, docName });
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
      await savePegawaiSkpDoc(pegawaiId, null, null);
    } catch (err: any) {
      console.error('Failed to remove SKP document:', err);
      alert('Terjadi kesalahan saat menghapus dokumen: ' + err.message);
    } finally {
      setConfirmDeleteDoc(null);
    }
  };

  // Main Open Modal trigger for Perencanaan Column
  const triggerPerencanaanModal = (year: number, type: 'perencanaan' | 'penilaian' | 'upload' = 'perencanaan') => {
    // Dismiss tooltips immediately on click
    setHoveredPerencanaan(null);
    if (tooltipTimeoutRef.current) {
      clearTimeout(tooltipTimeoutRef.current);
      tooltipTimeoutRef.current = null;
    }

    setModalYear(year);
    setModalType(type);
    const initialBidang = selectedBidangId || (currentUser?.bidang_id ? Number(currentUser.bidang_id) : 1);
    setSelectedBidangId(initialBidang);
    fetchSkpRecordsFromDb(year, initialBidang);
    setIsPerencanaanModalOpen(true);
  };

  // Handle Bidang selection changes inside popup
  const handleBidangChange = (bidangId: number) => {
    setSelectedBidangId(bidangId);
    if (modalYear) {
      fetchSkpRecordsFromDb(modalYear, bidangId);
    }
  };

  // Tooltip Mouse Handlers
  const handlePerencanaanMouseEnter = (e: React.MouseEvent, year: number, category: 'perencanaan' | 'penilaian' | 'upload') => {
    if (isPerencanaanModalOpen || activeDetailType !== null) return;
    if (tooltipTimeoutRef.current) {
      clearTimeout(tooltipTimeoutRef.current);
      tooltipTimeoutRef.current = null;
    }
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setHoveredPerencanaan({
      rect: {
        left: rect.left,
        top: rect.top,
        width: rect.width,
        bottom: rect.bottom,
        right: rect.right
      },
      year,
      category
    });
  };

  const handlePerencanaanMouseLeave = () => {
    if (tooltipTimeoutRef.current) {
      clearTimeout(tooltipTimeoutRef.current);
    }
    tooltipTimeoutRef.current = setTimeout(() => {
      setHoveredPerencanaan(null);
    }, 500);
  };

  const handleTooltipMouseEnter = () => {
    if (tooltipTimeoutRef.current) {
      clearTimeout(tooltipTimeoutRef.current);
      tooltipTimeoutRef.current = null;
    }
  };

  const handleTooltipMouseLeave = () => {
    if (tooltipTimeoutRef.current) {
      clearTimeout(tooltipTimeoutRef.current);
    }
    tooltipTimeoutRef.current = setTimeout(() => {
      setHoveredPerencanaan(null);
    }, 500);
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

  // Counter computing for active records inside pop-up
  const currentRecords = getActiveRecords();
  const totalStaff = currentRecords.length;
  const submittedCount = currentRecords.filter(r => (modalType === 'perencanaan' ? r.perencanaanDocName : r.penilaianDocName) !== null).length;
  const unsubmittedCount = totalStaff - submittedCount;

  // Filtered staff list in modal
  const filteredModalStaff = currentRecords.filter(r => {
    const docName = modalType === 'perencanaan' ? r.perencanaanDocName : r.penilaianDocName;
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

  const getManualItemsForBidang = (bidangId: number): string[] => {
    const customList = manualSkpItems[bidangId];
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

    if (uniqueSubKegs.length > 0) return uniqueSubKegs;

    // Fallback mock data matching real divisions if DB mapping is empty
    const singkatan = getBidangSingkatan(bidangId).toUpperCase();
    let fallbackNames = [];
    if (singkatan === 'PPM' || singkatan === 'RENDALEV') {
      fallbackNames = [
        'KOORDINASI PEMERINTAHAN',
        'KOORDINASI PM',
        'ASISTENSI PEMERINTAHAN',
        'ASISTENSI PM',
        'SINERGITAS PEMERINTAHAN',
        'SINERGITAS PM',
        'MONEV PEMERINTAHAN',
        'MONEV PM'
      ];
    } else if (singkatan === 'PE' || singkatan === 'SDA') {
      fallbackNames = [
        'KOORDINASI PEREKONOMIAN',
        'SINERGITAS PEMBERDAYAAN EKONOMI',
        'MONITORING KEBIJAKAN SEKTORAL',
        'ANALISIS DATA MAKRO EKONOMI'
      ];
    } else if (singkatan === 'SOSBUD' || singkatan.includes('SOS') || singkatan === 'RISET') {
      fallbackNames = [
        'KOORDINASI SOSIAL KEMASYARAKATAN',
        'ASISTENSI PEMBANGUNAN SOSIAL',
        'SINERGITAS PERLINDUNGAN ANAK',
        'MONITORING PROGRAM KESEHATAN DAN PENDIDIKAN'
      ];
    } else if (singkatan === 'IPW' || singkatan.includes('INF')) {
      fallbackNames = [
        'KOORDINASI TATA RUANG DAN INFRASTRUKTUR',
        'ASISTENSI PENGEMBANGAN WILAYAH',
        'SINERGITAS INFRASTRUKTUR JALAN DAN AIR',
        'MONITORING PROYEK PRIORITAS DAERAH'
      ];
    } else {
      fallbackNames = [
        'KOORDINASI PROGRAM BIDANG',
        'SINERGITAS PELAKSANAAN TUGAS',
        'MONITORING DAN EVALUASI BIDANG'
      ];
    }

    return fallbackNames.map((name, i) => ({
      name,
      code: `5.01.01.2.01.000${i + 1}`
    }));
  };

  const handleAddManualItem = (itemName: string) => {
    if (!selectedBidangId || !itemName.trim()) return;
    const currentList = getManualItemsForBidang(selectedBidangId);
    if (currentList.includes(itemName.trim())) {
      alert('Butir SKP sudah ada.');
      return;
    }
    const updated = {
      ...manualSkpItems,
      [selectedBidangId]: [...currentList, itemName.trim()]
    };
    setManualSkpItems(updated);
    localStorage.setItem('skp_manual_skp_items', JSON.stringify(updated));
  };

  const handleDeleteManualItem = (itemName: string) => {
    if (!selectedBidangId) return;
    if (confirm(`Apakah Anda yakin ingin menghapus butir SKP "${itemName}"?`)) {
      const currentList = getManualItemsForBidang(selectedBidangId);
      const updatedList = currentList.filter(item => item !== itemName);
      const updated = {
        ...manualSkpItems,
        [selectedBidangId]: updatedList
      };
      setManualSkpItems(updated);
      localStorage.setItem('skp_manual_skp_items', JSON.stringify(updated));
    }
  };

  const handleEditManualItem = async (oldName: string, newName: string) => {
    if (!selectedBidangId || !oldName.trim() || !newName.trim()) return;
    const oldNameTrimmed = oldName.trim();
    const newNameTrimmed = newName.trim();
    if (oldNameTrimmed === newNameTrimmed) return;

    const currentList = getManualItemsForBidang(selectedBidangId);
    if (currentList.includes(newNameTrimmed)) {
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
        const updatedList = currentList.map(item => item === oldNameTrimmed ? newNameTrimmed : item);
        const updatedManual = {
          ...manualSkpItems,
          [selectedBidangId]: updatedList
        };
        setManualSkpItems(updatedManual);
        localStorage.setItem('skp_manual_skp_items', JSON.stringify(updatedManual));

        setMonthlyLinks(prev => {
          const newLinks: Record<string, string> = {};
          Object.keys(prev).forEach(key => {
            const parts = key.split('_');
            if (parts.length >= 4) {
              const year = parts[0];
              const bidangIdStr = parts[1];
              const month = parts[parts.length - 1];
              const itemName = parts.slice(2, parts.length - 1).join('_');

              if (Number(bidangIdStr) === selectedBidangId && itemName === oldNameTrimmed) {
                const newKey = `${year}_${bidangIdStr}_${newNameTrimmed}_${month}`;
                newLinks[newKey] = prev[key];
              } else {
                newLinks[key] = prev[key];
              }
            } else {
              newLinks[key] = prev[key];
            }
          });
          return newLinks;
        });

        setEditingManualItemName(null);
        setTempManualItemEditName('');
      } else {
        alert(res?.message || 'Gagal mengubah butir SKP manual');
      }
    } catch (err: any) {
      console.error('Failed to edit manual item:', err);
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

        // Discover manual SKP items from db links to display them to third parties
        const subActivities = getSubActivitiesForBidang(bidangId);
        const subActivityNames = new Set(subActivities.map(sa => sa.name));
        const currentList = getManualItemsForBidang(bidangId);
        const discoveredManualItems = [...currentList];

        res.data.forEach((row: any) => {
          const key = `${row.tahun}_${bidangId}_${row.butir_skp}_${row.bulan}`;
          newLinks[key] = row.link_url || '';

          if (!subActivityNames.has(row.butir_skp) && !discoveredManualItems.includes(row.butir_skp)) {
            discoveredManualItems.push(row.butir_skp);
          }
        });

        setMonthlyLinks(newLinks);

        if (discoveredManualItems.length > 0) {
          setManualSkpItems(prev => ({
            ...prev,
            [bidangId]: discoveredManualItems
          }));
        }
      }
    } catch (err) {
      console.error('Failed to fetch monthly links:', err);
    }
  };

  useEffect(() => {
    if (selectedBidangId) {
      fetchMonthlyLinks(selectedBidangId);
    }
  }, [selectedBidangId, isPublic]);

  const getMonthlyLinksFilledRatio = (year: number) => {
    const bidId = selectedBidangId || 1;
    const subActivities = getSubActivitiesForBidang(bidId);
    const manualItems = getManualItemsForBidang(bidId);
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
    if (!currentUser?.id || !currentUser?.bidang_id) return null;
    const key = `${year}_${currentUser.bidang_id}`;
    const records = pegawaiSkpState[key] || [];
    return records.find(r => r.pegawaiId === currentUser.id) || null;
  };

  const toggleDropdown = (dropdownName: string) => {
    setActiveDropdown(prev => prev === dropdownName ? null : dropdownName);
  };

  const openDetail = (year: number, type: 'perencanaan' | 'penilaian' | 'upload') => {
    // Dismiss tooltips immediately on click
    setHoveredPerencanaan(null);
    if (tooltipTimeoutRef.current) {
      clearTimeout(tooltipTimeoutRef.current);
      tooltipTimeoutRef.current = null;
    }

    if (type === 'perencanaan' || type === 'penilaian' || type === 'upload') {
      triggerPerencanaanModal(year, type);
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
    const subActivities = getSubActivitiesForBidang(selectedBidangId || 1);
    const manualItems: SkpItem[] = getManualItemsForBidang(selectedBidangId || 1).map(name => ({
      name,
      isManual: true
    }));
    const allItems: SkpItem[] = [...subActivities, ...manualItems];
    const months = [
      'JANUARI', 'FEBRUARI', 'MARET', 'APRIL', 'MEI', 'JUNI',
      'JULI', 'AGUSTUS', 'SEPTEMBER', 'OKTOBER', 'NOVEMBER', 'DESEMBER'
    ];

    if (isModal) {
      return (
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-150 text-[10px] font-black uppercase tracking-wider text-slate-500 select-none">
              <th className="p-4 border-r border-slate-150 w-64 align-middle" rowSpan={2}>
                BUTIR SKP
              </th>
              <th className="p-2.5 text-center border-b border-slate-150" colSpan={12}>
                BULAN
              </th>
            </tr>
            <tr className="bg-slate-50 border-b border-slate-150 text-[9px] font-extrabold uppercase tracking-wider text-slate-400 text-center select-none">
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
                      {item.code && (
                        <div className="flex animate-in fade-in duration-200">
                          <span className="font-mono text-[9px] text-indigo-700 bg-indigo-50 border border-indigo-100/65 rounded px-1 py-0.5">
                            {item.code}
                          </span>
                        </div>
                      )}
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
                            {isManual && !isPublic && (
                              <div className="flex items-center gap-1 shrink-0">
                                <span className="px-1.5 py-0.5 bg-amber-50 text-amber-700 text-[8px] font-extrabold rounded border border-amber-100 uppercase tracking-wider">
                                  Manual
                                </span>
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
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </td>
                  {months.map(month => {
                    const cellKey = `${monthlySelectedYear}_${selectedBidangId}_${item.name}_${month}`;
                    const url = monthlyLinks[cellKey];
                    const isCopied = copiedCell === cellKey;

                    return (
                      <td key={month} className="p-3 border-r border-slate-150/60 last:border-r-0 text-center align-middle">
                        {url ? (
                          <div className="flex flex-col items-center justify-center gap-1.5">
                            <div className="flex items-center justify-center gap-1">
                              <a
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[10px] font-extrabold text-blue-700 hover:text-blue-900 transition-all"
                              >
                                Lihat
                              </a>
                              <span className="text-slate-300 text-[10px]">|</span>
                              <button
                                onClick={() => handleCopyLink(url, cellKey)}
                                className={`p-1 transition-all ${
                                  isCopied
                                    ? 'text-emerald-600'
                                    : 'text-slate-950 hover:text-indigo-600 hover:scale-105 active:scale-95'
                                }`}
                                title={isCopied ? 'Tersalin!' : 'Salin Tautan'}
                              >
                                {isCopied ? <Check size={11} strokeWidth={3} /> : <Copy size={11} strokeWidth={2.5} />}
                              </button>
                            </div>
                            {!isPublic && (
                              <button
                                onClick={() => openEditMonthlyLinkModal(monthlySelectedYear, selectedBidangId || 1, item.name, month)}
                                className="inline-flex items-center gap-0.5 text-[9px] font-extrabold text-slate-400 hover:text-indigo-600 transition-colors"
                                title="Ubah Tautan"
                              >
                                <Pencil size={9} /> Ubah
                              </button>
                            )}
                          </div>
                        ) : (
                          isPublic ? (
                            <span className="text-slate-400 text-xs font-bold">-</span>
                          ) : (
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => openEditMonthlyLinkModal(monthlySelectedYear, selectedBidangId || 1, item.name, month)}
                                className="text-[10px] font-bold text-blue-700 hover:text-blue-900 transition-colors"
                              >
                                Lihat
                              </button>
                              <span className="text-slate-305 text-[10px]">|</span>
                              <button
                                disabled
                                className="p-1 text-slate-400 cursor-not-allowed"
                                title="Tautan tidak tersedia"
                              >
                                <Copy size={11} strokeWidth={2.5} />
                              </button>
                            </div>
                          )
                        )}
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
          className="overflow-hidden sticky z-20 bg-slate-50 border-x border-t border-slate-150 rounded-t-2xl shadow-sm top-[-16px] lg:top-[-24px]"
        >
          <table className="w-full border-collapse text-left table-fixed bg-slate-50">
            <colgroup>
              <col className="w-[256px] min-w-[256px]" />
              {months.map(m => (
                <col key={m} className="w-[70px] min-w-[70px]" />
              ))}
            </colgroup>
            <thead>
              <tr className="bg-slate-50 border-b border-slate-150 text-[10px] font-black uppercase tracking-wider text-slate-500 select-none h-10">
                <th className="p-4 border-r border-slate-150 align-middle bg-slate-50 sticky left-0 z-30 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.1)]" rowSpan={2}>
                  BUTIR SKP
                </th>
                <th className="p-2.5 text-center border-b border-slate-150 bg-slate-50" colSpan={12}>
                  BULAN
                </th>
              </tr>
              <tr className="bg-slate-50 border-b border-slate-150 text-[9px] font-extrabold uppercase tracking-wider text-slate-400 text-center select-none h-9">
                {months.map(m => (
                  <th key={m} className="p-2 border-r border-slate-150/60 last:border-r-0 bg-slate-50">
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
          className="overflow-x-auto border-x border-b border-slate-150 rounded-b-2xl custom-scrollbar"
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
                        {item.code && (
                          <div className="flex animate-in fade-in duration-200">
                            <span className="font-mono text-[9px] text-indigo-700 bg-indigo-50 border border-indigo-100/65 rounded px-1 py-0.5">
                              {item.code}
                            </span>
                          </div>
                        )}
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
                              {isManual && !isPublic && (
                                <div className="flex items-center gap-1 shrink-0">
                                  <span className="px-1.5 py-0.5 bg-amber-50 text-amber-700 text-[8px] font-extrabold rounded border border-amber-100 uppercase tracking-wider">
                                    Manual
                                  </span>
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
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </td>
                    {months.map(month => {
                      const cellKey = `${monthlySelectedYear}_${selectedBidangId}_${item.name}_${month}`;
                      const url = monthlyLinks[cellKey];
                      const isCopied = copiedCell === cellKey;

                      return (
                        <td key={month} className="p-3 border-r border-slate-150/60 last:border-r-0 text-center align-middle">
                          {url ? (
                            <div className="flex flex-col items-center justify-center gap-1.5">
                              <div className="flex items-center justify-center gap-1">
                                <a
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[10px] font-extrabold text-blue-700 hover:text-blue-900 transition-all"
                                >
                                  Lihat
                                </a>
                                <span className="text-slate-300 text-[10px]">|</span>
                                <button
                                  onClick={() => handleCopyLink(url, cellKey)}
                                  className={`p-1 transition-all ${
                                    isCopied
                                      ? 'text-emerald-600'
                                      : 'text-slate-950 hover:text-indigo-600 hover:scale-105 active:scale-95'
                                  }`}
                                  title={isCopied ? 'Tersalin!' : 'Salin Tautan'}
                                >
                                  {isCopied ? <Check size={11} strokeWidth={3} /> : <Copy size={11} strokeWidth={2.5} />}
                                </button>
                              </div>
                              {!isPublic && (
                                <button
                                  onClick={() => openEditMonthlyLinkModal(monthlySelectedYear, selectedBidangId || 1, item.name, month)}
                                  className="inline-flex items-center gap-0.5 text-[9px] font-extrabold text-slate-400 hover:text-indigo-600 transition-colors"
                                  title="Ubah Tautan"
                                >
                                  <Pencil size={9} /> Ubah
                                </button>
                              )}
                            </div>
                          ) : (
                            isPublic ? (
                              <span className="text-slate-400 text-xs font-bold">-</span>
                            ) : (
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  onClick={() => openEditMonthlyLinkModal(monthlySelectedYear, selectedBidangId || 1, item.name, month)}
                                  className="text-[10px] font-bold text-blue-700 hover:text-blue-900 transition-colors"
                                >
                                  Lihat
                                </button>
                                <span className="text-slate-305 text-[10px]">|</span>
                                <button
                                  disabled
                                  className="p-1 text-slate-400 cursor-not-allowed"
                                  title="Tautan tidak tersedia"
                                >
                                  <Copy size={11} strokeWidth={2.5} />
                                </button>
                              </div>
                            )
                          )}
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

    return (
      <div className="space-y-5 animate-in fade-in duration-300">
        {/* Main Table Card */}
        <div className="bg-white rounded-[32px] border border-slate-100 shadow-2xl shadow-slate-150/40 p-6">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm">
                <FileSpreadsheet size={20} />
              </div>
              <div>
                <h2 className="text-sm font-extrabold text-slate-800 tracking-tight uppercase">
                  SKP {singkatan}
                </h2>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Link Dokumen Per bulan - Tahun {monthlySelectedYear}</p>
              </div>
            </div>

            {/* Add custom SKP point */}
            {!isPublic && (
              <button
                onClick={() => setIsAddingManualItem(true)}
                className="px-4.5 py-2 text-xs font-black rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 shadow-md shadow-indigo-600/10 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                <Plus size={14} />
                <span>Tambah Butir SKP</span>
              </button>
            )}
          </div>

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
          {/* Division Selector */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Bidang:</span>
            <select
              value={selectedBidangId || ''}
              onChange={(e) => setSelectedBidangId(Number(e.target.value))}
              disabled={isPublic ? true : !isAdmin}
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
                            <td className="p-4 border-r border-slate-50 text-center relative cursor-help">
                              <div className="inline-block text-center">
                                <button
                                  onClick={() => openDetail(row.tahun, 'perencanaan')}
                                  onMouseEnter={(e) => handlePerencanaanMouseEnter(e, row.tahun, 'perencanaan')}
                                  onMouseLeave={handlePerencanaanMouseLeave}
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
                              </div>
                            </td>

                            {/* PENILAIAN / DOKUMEN AKHIR */}
                            <td className="p-4 border-r border-slate-50 text-center relative cursor-help">
                              <div className="inline-block text-center">
                                <button
                                  onClick={() => openDetail(row.tahun, 'penilaian')}
                                  onMouseEnter={(e) => handlePerencanaanMouseEnter(e, row.tahun, 'penilaian')}
                                  onMouseLeave={handlePerencanaanMouseLeave}
                                  className="group inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 border-b border-transparent hover:border-indigo-600/60 pb-0.5 transition-all"
                                >
                                  Lihat (Kelola Bidang)
                                  <Eye size={12} className="opacity-0 group-hover:opacity-100 transition-opacity ml-0.5 text-indigo-500" />
                                </button>
                                <div className="flex items-center justify-center gap-1.5 mt-1.5">
                                  {(() => {
                                    const ratioPenilaian = getYearSubmissionRatio(row.tahun, 'penilaian');
                                    return (
                                      <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-slate-100 text-slate-600 border border-slate-200/40 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 transition-colors">
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
                                {row.paririmbon.docName ? (
                                  <button
                                    onClick={() => window.open(row.paririmbon.docName, '_blank')}
                                    onMouseEnter={(e) => handleParirimbonMouseEnter(e, row.tahun)}
                                    onMouseLeave={handleParirimbonMouseLeave}
                                    className="group inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 border-b border-transparent hover:border-indigo-600/60 pb-0.5 transition-all"
                                  >
                                    Lihat
                                    <ExternalLink size={12} className="opacity-0 group-hover:opacity-100 transition-opacity text-indigo-500" />
                                  </button>
                                ) : (
                                  <span className="text-xs text-slate-400 font-bold">-</span>
                                )}
                                {!isPublic && (
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
                                  onClick={() => openDetail(row.tahun, 'upload')}
                                  onMouseEnter={(e) => handlePerencanaanMouseEnter(e, row.tahun, 'upload')}
                                  onMouseLeave={handlePerencanaanMouseLeave}
                                  className="group inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 border-b border-transparent hover:border-indigo-600/60 pb-0.5 transition-all"
                                >
                                  Lihat (Kelola Bidang)
                                  <Eye size={12} className="opacity-0 group-hover:opacity-100 transition-opacity ml-0.5 text-indigo-500" />
                                </button>
                                <div className="flex items-center justify-center gap-1.5 mt-1.5">
                                  {(() => {
                                    const ratioUpload = getYearSubmissionRatio(row.tahun, 'upload');
                                    return (
                                      <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-slate-100 text-slate-600 border border-slate-200/40 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 transition-colors">
                                        Terkumpul: {ratioUpload.submitted}/{ratioUpload.total}
                                      </span>
                                    );
                                  })()}
                                </div>
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
                            {row.paririmbon.docName ? (
                              <button
                                onClick={() => window.open(row.paririmbon.docName, '_blank')}
                                onMouseEnter={(e) => handleParirimbonMouseEnter(e, row.tahun)}
                                onMouseLeave={handleParirimbonMouseLeave}
                                className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-[10px] font-extrabold uppercase flex items-center gap-1 transition-all"
                              >
                                Lihat <ExternalLink size={10} />
                              </button>
                            ) : (
                              <span className="text-[10px] font-extrabold text-slate-400 bg-slate-50 px-2 py-0.5 rounded">Belum ada link</span>
                            )}
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
        renderMonthlyDocsTab()
      )}

      {/* DYNAMIC AUDIT HOVER TOOLTIP (Shows Submitted vs Unsubmitted staff list) */}
      {hoveredPerencanaan && !isPerencanaanModalOpen && !activeDetailType && (
        <div
          className="fixed bg-white text-slate-800 rounded-[20px] shadow-2xl border border-slate-150 p-4 w-[340px] animate-in fade-in zoom-in-95 duration-150 select-none overflow-hidden"
          style={getPerencanaanTooltipStyle()}
          onMouseEnter={handleTooltipMouseEnter}
          onMouseLeave={handleTooltipMouseLeave}
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
                  hoveredPerencanaan.category === 'upload' ? 'Bahan Upload' :
                  'Paririmbon'
                }
              </span>
              <span className="text-[8px] font-extrabold text-slate-400 uppercase tracking-widest bg-slate-100 px-2 py-0.5 rounded-md">
                {getBidangSingkatan(selectedBidangId)}
              </span>
            </div>

            {/* Grid Layout: 2 Columns (Left: Sudah, Right: Belum) */}
            {(() => {
              const category = hoveredPerencanaan.category || 'perencanaan';
              const records = pegawaiSkpState[`${hoveredPerencanaan.year}_${selectedBidangId || 1}`] || [];
              const hasDoc = (r: PegawaiSkpRecord) => {
                if (category === 'perencanaan') return r.perencanaanDocName !== null;
                if (category === 'penilaian') return r.penilaianDocName !== null;
                return r.pendukungDocName !== null;
              };
              const docName = (r: PegawaiSkpRecord) => {
                if (category === 'perencanaan') return r.perencanaanDocName;
                if (category === 'penilaian') return r.penilaianDocName;
                return r.pendukungDocName;
              };

              const sudahList = records.filter(hasDoc);
              const belumList = records.filter(r => !hasDoc(r));

              return (
                <div className="grid grid-cols-2 gap-3.5">
                  {/* Left Column: Sudah Upload */}
                  <div className="space-y-2">
                    <div className="bg-emerald-50 text-emerald-700 text-[9px] font-black tracking-widest uppercase py-1 px-2.5 rounded-lg text-center border border-emerald-100/60">
                      Sudah ({sudahList.length})
                    </div>
                    <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                      {sudahList.map(r => (
                        <div key={r.pegawaiId} className="text-[10px] text-slate-700 font-extrabold flex items-start gap-1">
                          <span className="text-emerald-500 font-black text-[12px] leading-none shrink-0">✓</span>
                          <span className="truncate" title={r.namaPegawai}>{r.namaPegawai.split(',')[0]}</span>
                        </div>
                      ))}
                      {sudahList.length === 0 && (
                        <span className="text-[9px] text-slate-400 italic block text-center pt-2">Belum ada</span>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Belum Upload */}
                  <div className="space-y-2">
                    <div className="bg-rose-50 text-rose-700 text-[9px] font-black tracking-widest uppercase py-1 px-2.5 rounded-lg text-center border border-rose-100/60">
                      Belum ({belumList.length})
                    </div>
                    <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                      {belumList.map(r => (
                        <div key={r.pegawaiId} className="text-[10px] text-slate-500 font-semibold flex items-start gap-1">
                          <span className="text-rose-400 font-black text-[11px] leading-none shrink-0">✗</span>
                          <span className="truncate" title={r.namaPegawai}>{r.namaPegawai.split(',')[0]}</span>
                        </div>
                      ))}
                      {belumList.length === 0 && (
                        <span className="text-[9px] text-emerald-600 font-extrabold block text-center pt-2">Lengkap!</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}
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
                <FileSpreadsheet size={12} /> Riwayat Link Paririmbon {hoveredParirimbon.year}
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
                    KELOLA {modalType === 'perencanaan' ? 'PERENCANAAN' : modalType === 'penilaian' ? 'PENILAIAN' : 'BAHAN UPLOAD / BERKAS PENDUKUNG'} SKP {modalYear}
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
              {(() => {
                const records = getActiveRecords();
                const total = records.length;
                const submitted = records.filter(r => {
                  if (modalType === 'perencanaan') return r.perencanaanDocName !== null;
                  if (modalType === 'penilaian') return r.penilaianDocName !== null;
                  return r.pendukungDocName !== null;
                }).length;
                const unsubmitted = total - submitted;

                return (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5">
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
                      <th className="py-3 px-4 w-44 text-center">Aksi Pengelolaan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredModalStaff.map((row, idx) => {
                      const docName = modalType === 'perencanaan' ? row.perencanaanDocName :
                                      modalType === 'penilaian' ? row.penilaianDocName :
                                      row.pendukungDocName;
                      const docId = modalType === 'perencanaan' ? row.perencanaanDocId :
                                    modalType === 'penilaian' ? row.penilaianDocId :
                                    row.pendukungDocId;
                      const docPath = modalType === 'perencanaan' ? row.perencanaanDocPath :
                                      modalType === 'penilaian' ? row.penilaianDocPath :
                                      row.pendukungDocPath;
                      const updatedAt = modalType === 'perencanaan' ? row.perencanaanUpdatedAt :
                                        modalType === 'penilaian' ? row.penilaianUpdatedAt :
                                        row.pendukungUpdatedAt;

                      return (
                        <tr key={row.pegawaiId} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-4 text-center text-slate-300 font-extrabold">{idx + 1}</td>
                          <td className="p-4">
                            <div className="font-extrabold text-slate-800">{row.namaPegawai}</div>
                            <div className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">{row.jabatan}</div>
                          </td>
                          <td className="p-4">
                            {docName ? (
                              <div className="flex items-center gap-2 p-2 rounded-xl bg-indigo-50/50 border border-indigo-100/50">
                                <FileText size={16} className="text-indigo-600 shrink-0" />
                                <div className="min-w-0 flex-1">
                                  <button
                                    onClick={() => handlePreviewDocument(docPath, docName)}
                                    className="font-extrabold text-indigo-900 hover:underline truncate block text-[11px] text-left w-full"
                                    title="Pratinjau Dokumen"
                                  >
                                    {docName}
                                  </button>
                                  <span className="text-[9px] text-indigo-400 font-bold uppercase block mt-0.5">diunggah: {updatedAt}</span>
                                </div>
                                <button
                                  onClick={() => removeSkpDocument(row.pegawaiId, docId, docName)}
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
                      );
                    })}
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

      {/* Document Delete Confirmation Modal */}
      {confirmDeleteDoc && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-300">
            <div className="flex flex-col items-center text-center space-y-6">
              <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center shadow-inner">
                <Trash2 size={32} />
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-black text-slate-800 tracking-tight">Hapus Dokumen?</h3>
                <p className="text-sm text-slate-500 leading-relaxed px-4">
                  Dokumen <span className="font-bold text-slate-800">"{confirmDeleteDoc.docName}"</span> akan dihapus dari SKP pegawai ini.
                </p>
              </div>

              <div className="w-full space-y-3">
                <button
                  onClick={() => processSkpDocRemoval('trash')}
                  className="w-full py-4 bg-rose-500 hover:bg-rose-600 text-white rounded-2xl font-bold text-sm shadow-lg shadow-rose-200 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <Trash2 size={18} />
                  <span>Pindahkan Ke Tempat Sampah</span>
                </button>

                <button
                  onClick={() => processSkpDocRemoval('unlink')}
                  className="w-full py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-bold text-sm transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <FolderOpen size={18} />
                  <span>Hanya Hapus dari SKP Menu Ini</span>
                </button>

                <button
                  onClick={() => setConfirmDeleteDoc(null)}
                  className="w-full py-3 text-slate-400 hover:text-slate-600 font-bold text-[10px] uppercase tracking-widest transition-all"
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
                    disabled={isPublic ? true : !isAdmin}
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
        }}
        fileUrl={previewFileUrl}
        fileName={previewFileName}
        readOnly={true}
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
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-100 flex flex-col animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-indigo-500/10 rounded-lg flex items-center justify-center text-indigo-400">
                  <Plus size={18} />
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider">
                    TAMBAH BUTIR SKP MANUAL
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
                }}
                className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 bg-slate-50/40">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                  Nama Butir SKP
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
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2 shrink-0">
              <button
                onClick={() => {
                  setIsAddingManualItem(false);
                  setNewManualItemName('');
                }}
                className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 bg-white border border-slate-200 rounded-xl transition-all"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  if (newManualItemName.trim()) {
                    handleAddManualItem(newManualItemName);
                    setIsAddingManualItem(false);
                    setNewManualItemName('');
                  } else {
                    alert('Nama butir SKP tidak boleh kosong.');
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
                    KELOLA LINK PARIRIMBON {paririmbonEditYear}
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
                  Tempel tautan Google Spreadsheet Paririmbon untuk bidang dan tahun ini. Pastikan hak akses spreadsheet telah diatur agar dapat diakses/dilihat oleh pihak ketiga yang berkepentingan.
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
                                        className={`p-4 rounded-2xl border transition-all cursor-pointer relative group ${
                                            activeUploadIdx === idx
                                            ? 'bg-white border-emerald-500 ring-4 ring-emerald-500/5 shadow-xl shadow-emerald-100/50'
                                            : 'bg-white border-slate-100 hover:border-slate-300 shadow-sm'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2.5 rounded-xl ${
                                                item.status === 'success' ? 'bg-emerald-100 text-emerald-600' :
                                                item.status === 'error' ? 'bg-rose-100 text-rose-600' :
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
                                                </div>
                                            </div>
                                        </div>
                                        {item.status === 'error' && (
                                            <p className="mt-2 text-[9px] font-black text-rose-500 uppercase tracking-widest">{item.errorMsg}</p>
                                        )}
                                        {item.status === 'success' && (
                                            <div className="absolute top-2 right-2 text-emerald-500">
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

    </div>
  );
}
