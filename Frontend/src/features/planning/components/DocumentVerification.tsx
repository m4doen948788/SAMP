import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  Upload, 
  FileSpreadsheet, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Download, 
  Save, 
  Trash2, 
  Edit,
  ArrowLeft, 
  MoreVertical, 
  Check, 
  X, 
  RefreshCw, 
  Eye, 
  ExternalLink, 
  AlertTriangle,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';
import { API_URL, api } from '@/src/services/api';
import * as XLSX from 'xlsx';

interface Template {
  id: number;
  tahun: number;
  tipe_dokumen: string;
  nama_file_template: string;
  path_file_template: string;
  config_json: string;
  created_at: string;
}

interface VerificationItem {
  rowIdx: number;
  text: string;
  status: 'Ada' | 'Tidak Ada' | '✓' | 'X' | 'V' | '';
  notes: string;
}

interface Transaction {
  id: number;
  template_id: number;
  tahun: number;
  pd_id: number;
  nama_dokumen: string;
  path_file_pdf: string;
  status: string;
  hasil_json: string;
  verifier_name?: string;
  instansi?: string;
  pd_singkatan?: string;
  created_at: string;
}

export default function DocumentVerification() {
  // Navigation & Tabs
  const [activeTab, setActiveTab] = useState<'list' | 'workspace' | 'templates'>('list');

  // Master Data
  const [templates, setTemplates] = useState<Template[]>([]);
  const [departments, setDepartments] = useState<{ id: number; instansi: string; singkatan: string }[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  // Loading States
  const [loading, setLoading] = useState(false);
  const [aiVerifying, setAiVerifying] = useState(false);

  // Template Upload Form State
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [docType, setDocType] = useState<string>('Renja Reguler');
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [inspectResult, setInspectResult] = useState<any>(null);
  const [sheetName, setSheetName] = useState<string>('');
  const [headerRowIdx, setHeaderRowIdx] = useState<number>(1);
  const [criteriaColIdx, setCriteriaColIdx] = useState<number>(2);
  const [statusColIdx, setStatusColIdx] = useState<number>(5);
  const [adaColIdx, setAdaColIdx] = useState<number>(5);
  const [tidakAdaColIdx, setTidakAdaColIdx] = useState<number>(6);
  const [notesColIdx, setNotesColIdx] = useState<number>(7);

  // New Verification Task State
  const [newPdId, setNewPdId] = useState<number | ''>('');
  const [newYear, setNewYear] = useState<number>(new Date().getFullYear());
  const [newTemplateId, setNewTemplateId] = useState<number | ''>('');
  const [newDocName, setNewDocName] = useState<string>('');
  const [pdfFile, setPdfFile] = useState<File | null>(null);

  // Perangkat Daerah Search Dropdown State
  const [pdSearch, setPdSearch] = useState('');
  const [pdDropdownOpen, setPdDropdownOpen] = useState(false);

  // Active Workspace State
  const [activeTransaction, setActiveTransaction] = useState<Transaction | null>(null);
  const [verificationItems, setVerificationItems] = useState<VerificationItem[]>([]);
  const [pdfUrl, setPdfUrl] = useState<string>('');
  
  // QAF Portal State
  const [activeQafId, setActiveQafId] = useState<number | null>(null);
  const [qafPos, setQafPos] = useState({ top: 0, left: 0 });
  const [hoveredRowId, setHoveredRowId] = useState<number | null>(null);

  // Template Inline Editing State
  const [editingTemplateId, setEditingTemplateId] = useState<number | null>(null);
  const [editingTemplateName, setEditingTemplateName] = useState<string>('');

  // Viewing Template (Excel Preview) State
  const [viewingTemplate, setViewingTemplate] = useState<Template | null>(null);
  const [excelPreviewData, setExcelPreviewData] = useState<{ [sheetName: string]: any[][] }>({});
  const [excelSheetNames, setExcelSheetNames] = useState<string[]>([]);
  const [activePreviewSheet, setActivePreviewSheet] = useState<string>('');
  const [loadingExcelPreview, setLoadingExcelPreview] = useState(false);

  // Modal Pop-Up Nayaxa AI States
  const [isProcessingModalOpen, setIsProcessingModalOpen] = useState(false);
  const [nayaxaLogs, setNayaxaLogs] = useState<string[]>([]);
  const [currentlyProcessingRowIdx, setCurrentlyProcessingRowIdx] = useState<number | null>(null);
  const [isEditingAllowed, setIsEditingAllowed] = useState(false);
  // Full Excel rows for rendering in modal (all columns, from the template file)
  const [modalExcelRows, setModalExcelRows] = useState<any[][]>([]);
  const [modalExcelConfig, setModalExcelConfig] = useState<{ criteriaColIdx: number; statusColIdx: number; adaColIdx: number; tidakAdaColIdx: number; notesColIdx: number } | null>(null);
  // Modal UI Controls (Zoom & Panel collapse)
  const [tableZoom, setTableZoom] = useState<number>(100);
  const [isLogPanelCollapsed, setIsLogPanelCollapsed] = useState<boolean>(false);

  const logEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logs to bottom
  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [nayaxaLogs]);

  // Load Initial Data
  useEffect(() => {
    fetchTemplates();
    fetchDepartments();
    fetchTransactions();
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await fetch(`${API_URL}/olah-data/verifikasi/templates`, {
        headers: { 'Authorization': `Bearer ${sessionStorage.getItem('token')}` }
      });
      const data = await response.json();
      if (data.success) setTemplates(data.data);
    } catch (err) {
      console.error('Error fetching templates:', err);
    }
  };

  const fetchDepartments = async () => {
    try {
      const res = await api.instansiDaerah.getAll();
      if (res.success) setDepartments(res.data);
    } catch (err) {
      console.error('Error fetching departments:', err);
    }
  };

  const fetchTransactions = async () => {
    try {
      const response = await fetch(`${API_URL}/olah-data/verifikasi/list`, {
        headers: { 'Authorization': `Bearer ${sessionStorage.getItem('token')}` }
      });
      const data = await response.json();
      if (data.success) setTransactions(data.data);
    } catch (err) {
      console.error('Error fetching transactions:', err);
    }
  };

  // Upload & Inspect Excel Template
  const handleTemplateFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setTemplateFile(file);

    const formData = new FormData();
    formData.append('file', file);

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/olah-data/verifikasi/inspect-template`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${sessionStorage.getItem('token')}` },
        body: formData
      });
      const data = await response.json();
      if (data.success) {
        setInspectResult(data);
        setSheetName(data.selectedSheet);
        setHeaderRowIdx(data.detectedConfig.headerRowIdx || 1);
        setCriteriaColIdx(data.detectedConfig.criteriaColIdx || 2);
        setStatusColIdx(data.detectedConfig.statusColIdx || 5);
        setAdaColIdx(data.detectedConfig.adaColIdx || data.detectedConfig.statusColIdx || 5);
        setTidakAdaColIdx(data.detectedConfig.tidakAdaColIdx || (data.detectedConfig.adaColIdx || 5) + 1);
        setNotesColIdx(data.detectedConfig.notesColIdx || 7);
      } else {
        alert(data.message || 'Gagal menginspeksi file.');
      }
    } catch (err) {
      console.error(err);
      alert('Terjadi kesalahan saat membaca file template.');
    } finally {
      setLoading(false);
    }
  };

  // Save Template Officially
  const handleSaveTemplate = async () => {
    if (!inspectResult || !templateFile) return;

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/olah-data/verifikasi/templates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionStorage.getItem('token')}`
        },
        body: JSON.stringify({
          tahun: selectedYear,
          tipe_dokumen: docType,
          tempFilePath: inspectResult.tempFilePath,
          sheetName,
          headerRowIdx,
          criteriaColIdx,
          statusColIdx: adaColIdx,
          adaColIdx,
          tidakAdaColIdx,
          notesColIdx
        })
      });
      const data = await response.json();
      if (data.success) {
        alert('Template berhasil disimpan!');
        fetchTemplates();
        setTemplateFile(null);
        setInspectResult(null);
        setActiveTab('list');
      } else {
        alert(data.message || 'Gagal menyimpan template.');
      }
    } catch (err) {
      console.error(err);
      alert('Terjadi kesalahan saat menyimpan template.');
    } finally {
      setLoading(false);
    }
  };

  // Delete Template
  const handleDeleteTemplate = async (id: number) => {
    if (!confirm('Apakah Anda yakin ingin menghapus template ini?')) return;
    try {
      const response = await fetch(`${API_URL}/olah-data/verifikasi/templates/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${sessionStorage.getItem('token')}` }
      });
      const data = await response.json();
      if (data.success) {
        fetchTemplates();
      } else {
        alert(data.message || 'Gagal menghapus template.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Update Template Name
  const handleUpdateTemplateName = async (id: number) => {
    if (!editingTemplateName.trim()) return;
    try {
      const response = await fetch(`${API_URL}/olah-data/verifikasi/templates/${id}/name`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionStorage.getItem('token')}`
        },
        body: JSON.stringify({ namaFileTemplate: editingTemplateName.trim() })
      });
      const data = await response.json();
      if (data.success) {
        setEditingTemplateId(null);
        setEditingTemplateName('');
        fetchTemplates();
      } else {
        alert(data.message || 'Gagal memperbarui nama template.');
      }
    } catch (err) {
      console.error(err);
      alert('Terjadi kesalahan saat memperbarui nama template.');
    }
  };

  // Delete Verification Transaction
  const handleDeleteTransaction = async (id: number) => {
    if (!confirm('Apakah Anda yakin ingin menghapus riwayat verifikasi ini beserta dokumen fisiknya?')) return;
    try {
      const response = await fetch(`${API_URL}/olah-data/verifikasi/list/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${sessionStorage.getItem('token')}` }
      });
      const data = await response.json();
      if (data.success) {
        fetchTransactions();
      } else {
        alert(data.message || 'Gagal menghapus transaksi verifikasi.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Start AI Auto Verification Task with Nayaxa Interactive Playback
  const handleStartAutoVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPdId || !newTemplateId || !pdfFile) {
      alert('Harap lengkapi semua isian dan unggah dokumen PDF.');
      return;
    }

    // Reset and open modal
    setNayaxaLogs([
      '[SAMP-Kernel] Memulai layanan Nayaxa AI Core...',
      '[System] Menerima usulan berkas PDF Perangkat Daerah...',
      '[Database] Menghubungkan ke master_template_verifikasi...',
      `[System] Mengambil kriteria verifikasi untuk tahun ${newYear}...`
    ]);
    setCurrentlyProcessingRowIdx(null);
    setIsEditingAllowed(false);
    setModalExcelRows([]);
    setModalExcelConfig(null);
    setIsProcessingModalOpen(true);
    setAiVerifying(true);

    // Pre-load template Excel rows for full table display in modal
    const selectedTemplate = templates.find(t => t.id === Number(newTemplateId));
    if (selectedTemplate) {
      try {
        const fileUrl = `${API_URL.replace('/api', '')}/${selectedTemplate.path_file_template}`;
        const bufResponse = await fetch(fileUrl);
        if (bufResponse.ok) {
          const arrayBuffer = await bufResponse.arrayBuffer();
          const wb = XLSX.read(arrayBuffer, { type: 'array' });
          const cfg = JSON.parse(selectedTemplate.config_json || '{}');
          const ws = wb.Sheets[cfg.sheetName || wb.SheetNames[0]];
          const allRows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as any[][];
          setModalExcelRows(allRows);
          setModalExcelConfig({
            criteriaColIdx: cfg.criteriaColIdx || 2,
            statusColIdx: cfg.adaColIdx || cfg.statusColIdx || 5,
            adaColIdx: cfg.adaColIdx || cfg.statusColIdx || 5,
            tidakAdaColIdx: cfg.tidakAdaColIdx || ((cfg.adaColIdx || cfg.statusColIdx || 5) + 1),
            notesColIdx: cfg.notesColIdx || 7
          });
        }
      } catch (xlErr) {
        console.warn('Could not pre-load template Excel for modal:', xlErr);
      }
    }

    const formData = new FormData();
    formData.append('file', pdfFile);
    formData.append('templateId', String(newTemplateId));
    formData.append('pdId', String(newPdId));
    formData.append('tahun', String(newYear));
    formData.append('namaDokumen', newDocName || `Perubahan Renja ${newYear} ${departments.find(d => d.id === Number(newPdId))?.singkatan}`);

    // Startup simulated logging timer
    let logStep = 0;
    const startupLogs = [
      '[Nayaxa-Vision] Melakukan scan halaman multimodal untuk mendeteksi gambar, bagan, dan diagram...',
      '[Nayaxa-Vision] Deteksi halaman visual selesai. Mengirimkan hasil analisis ke otak penalaran Nayaxa...',
      '[Nayaxa-Brain] Otak penalaran aktif. Mulai membaca teks dokumen usulan...',
      '[Nayaxa-Brain] Membandingkan kriteria kepatuhan regulasi terhadap dokumen P-Renja...',
      '[System] Menunggu hasil analisis terstruktur dari server Nayaxa AI...'
    ];
    const logInterval = setInterval(() => {
      if (logStep < startupLogs.length) {
        const nextLog = startupLogs[logStep];
        setNayaxaLogs(prev => [...prev, nextLog]);
        logStep++;
      } else {
        clearInterval(logInterval);
      }
    }, 1500);

    try {
      const response = await fetch(`${API_URL}/olah-data/verifikasi/start`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${sessionStorage.getItem('token')}` },
        body: formData
      });
      clearInterval(logInterval);
      const data = await response.json();
      
      if (data.success) {
        fetchTransactions();
        setNayaxaLogs(prev => [
          ...prev,
          '[System] Server Nayaxa AI sukses mengembalikan data analisis.',
          '[System] Mulai memvisualisasikan pengisian sel Excel...'
        ]);

        // Load transaction detail
        const transObj = {
          id: data.transaksiId,
          template_id: Number(newTemplateId),
          tahun: newYear,
          pd_id: Number(newPdId),
          nama_dokumen: newDocName || 'Dokumen P-Renja',
          path_file_pdf: data.pdfUrl.replace(/^\//, ''),
          status: 'Proses',
          hasil_json: JSON.stringify(data.hasilVerifikasi),
          created_at: new Date().toISOString()
        };
        setActiveTransaction(transObj);
        setPdfUrl(data.pdfUrl);

        // Run live playback
        // 1. Initialize verificationItems with empty states
        const emptyItems = data.hasilVerifikasi.map((item: any) => ({
          rowIdx: item.rowIdx,
          text: item.text,
          status: '' as any,
          notes: ''
        }));
        setVerificationItems(emptyItems);

        // 2. Playback row-by-row
        let idx = 0;
        const playInterval = setInterval(() => {
          if (idx >= data.hasilVerifikasi.length) {
            clearInterval(playInterval);
            setCurrentlyProcessingRowIdx(null);
            setIsEditingAllowed(true);
            setAiVerifying(false);
            setNayaxaLogs(prev => [
              ...prev,
              '[System] --- PROSES VERIFIKASI SELESAI ---',
              '[Nayaxa] Analisis dokumen selesai. Anda sekarang dapat meninjau dan mengedit hasil di kolom "Ada / Tidak Ada" (Ceklis/X) dan "Rekomendasi" secara langsung pada tabel di sebelah kanan.'
            ]);
            return;
          }

          const realItem = data.hasilVerifikasi[idx];
          setCurrentlyProcessingRowIdx(idx);

          // Log row processing
          const isAda = realItem.status === 'Ada' || realItem.status === '✓' || realItem.status === 'V';
          const logMsg = isAda
            ? `[Nayaxa-Brain] Baris ${realItem.rowIdx}: Ditemukan bukti kepatuhan. Mengisi status 'Ada' (✓).`
            : `[Nayaxa-Brain] Baris ${realItem.rowIdx}: Tidak ditemukan. Menulis rekomendasi perbaikan...`;          
          setNayaxaLogs(prev => [...prev, logMsg]);

          // Update spreadsheet row
          setVerificationItems(prev => {
            const copy = [...prev];
            copy[idx] = {
              rowIdx: realItem.rowIdx,
              text: realItem.text,
              status: realItem.status,
              notes: realItem.notes
            };
            return copy;
          });

          idx++;
        }, 800); // 800ms delay per row

      } else {
        clearInterval(logInterval);
        alert(data.message || 'Gagal menjalankan verifikasi.');
        setIsProcessingModalOpen(false);
        setAiVerifying(false);
      }
    } catch (err) {
      clearInterval(logInterval);
      console.error(err);
      alert('Terjadi kesalahan saat melakukan verifikasi otomatis.');
      setIsProcessingModalOpen(false);
      setAiVerifying(false);
    }
  };

  // Open Workspace for existing task
  const openWorkspace = (trans: Transaction) => {
    setActiveTransaction(trans);
    setVerificationItems(JSON.parse(trans.hasil_json || '[]'));
    setPdfUrl(`${API_URL.replace('/api', '')}/${trans.path_file_pdf}`);
    setActiveTab('workspace');
  };

  // Save edits in Workspace
  const handleSaveWorkspaceResult = async (statusOverride?: string) => {
    if (!activeTransaction) return;

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/olah-data/verifikasi/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionStorage.getItem('token')}`
        },
        body: JSON.stringify({
          transaksiId: activeTransaction.id,
          hasilJson: verificationItems,
          status: statusOverride || activeTransaction.status
        })
      });
      const data = await response.json();
      if (data.success) {
        alert('Hasil verifikasi berhasil disimpan!');
        fetchTransactions();
        if (statusOverride) {
          setActiveTab('list');
          setActiveTransaction(null);
        }
      } else {
        alert(data.message || 'Gagal menyimpan hasil.');
      }
    } catch (err) {
      console.error(err);
      alert('Terjadi kesalahan.');
    } finally {
      setLoading(false);
    }
  };

  // Save from Nayaxa Pop-up Modal directly
  const handleSaveFromModal = async () => {
    if (!activeTransaction) return;
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/olah-data/verifikasi/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionStorage.getItem('token')}`
        },
        body: JSON.stringify({
          transaksiId: activeTransaction.id,
          hasilJson: verificationItems,
          status: 'Selesai' // Mark as finalized
        })
      });
      const data = await response.json();
      if (data.success) {
        alert('Hasil verifikasi berhasil disimpan!');
        fetchTransactions();
        setIsProcessingModalOpen(false);
        setActiveTab('workspace'); // redirect to active workspace
      } else {
        alert(data.message || 'Gagal menyimpan hasil.');
      }
    } catch (err) {
      console.error(err);
      alert('Terjadi kesalahan saat menyimpan hasil.');
    } finally {
      setLoading(false);
    }
  };

  // Update item field in dynamic form
  const updateItem = (index: number, key: 'status' | 'notes', value: string) => {
    const updated = [...verificationItems];
    updated[index] = { ...updated[index], [key]: value };
    setVerificationItems(updated);
  };

  // Download Filled Excel Template
  const handleDownloadExcel = (transId: number) => {
    window.open(`${API_URL}/olah-data/verifikasi/export/${transId}?token=${sessionStorage.getItem('token')}`);
  };

  // Copy Public Link
  const copyPublicLink = (path: string) => {
    const fullUrl = `${API_URL.replace('/api', '')}/${path}`;
    navigator.clipboard.writeText(fullUrl);
    alert('Link publik dokumen berhasil disalin ke clipboard!');
  };

  // Toggle Quick Access
  const toggleQuickAccess = (id: number) => {
    alert(`Dokumen ID ${id} berhasil diperbarui di Quick Access!`);
  };

  // Filter departments for dropdown search
  const filteredDepartments = departments.filter(d => {
    const singkatan = d.singkatan || '';
    const instansi = d.instansi || '';
    return singkatan.toLowerCase().includes(pdSearch.toLowerCase()) || 
           instansi.toLowerCase().includes(pdSearch.toLowerCase());
  });

  // Handle QAF Open with coordinate calculation
  const openQafMenu = (e: React.MouseEvent, trId: number) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setQafPos({
      top: rect.bottom + window.scrollY,
      left: rect.left + window.scrollX - 145 // align left/right of button
    });
    setActiveQafId(activeQafId === trId ? null : trId);
  };

  // Get template config of active transaction
  const getTemplateConfig = () => {
    if (!activeTransaction) return null;
    const template = templates.find(t => t.id === activeTransaction.template_id);
    if (!template) return null;
    try {
      return JSON.parse(template.config_json || '{}');
    } catch {
      return null;
    }
  };

  // Load Excel File Preview
  const handleViewExcelTemplate = async (t: Template) => {
    setViewingTemplate(t);
    setLoadingExcelPreview(true);
    setExcelPreviewData({});
    setExcelSheetNames([]);
    setActivePreviewSheet('');
    
    try {
      const fileUrl = `${API_URL.replace('/api', '')}/${t.path_file_template}`;
      const response = await fetch(fileUrl);
      if (!response.ok) throw new Error('Gagal mengunduh file template.');
      const arrayBuffer = await response.arrayBuffer();
      
      const wb = XLSX.read(arrayBuffer, { type: 'array' });
      const sheets: { [sheetName: string]: any[][] } = {};
      
      wb.SheetNames.forEach(sheetName => {
        const worksheet = wb.Sheets[sheetName];
        sheets[sheetName] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as any[][];
      });
      
      setExcelPreviewData(sheets);
      setExcelSheetNames(wb.SheetNames);
      if (wb.SheetNames.length > 0) {
        setActivePreviewSheet(wb.SheetNames[0]);
      }
    } catch (err) {
      console.error(err);
      alert('Terjadi kesalahan saat memuat berkas Excel.');
    } finally {
      setLoadingExcelPreview(false);
    }
  };

  // Render Interactive Spreadsheet-like Table
  const renderSpreadsheetTable = (isEditingEnabled: boolean) => {
    const config = getTemplateConfig();
    if (!config) {
      return (
        <div className="text-center py-10 text-xs text-slate-400 font-medium">
          Loading template config...
        </div>
      );
    }

    const criteriaCol = config.criteriaColIdx || 2;
    const statusCol = config.statusColIdx || 3;
    const notesCol = config.notesColIdx || 4;

    const maxCols = Math.max(criteriaCol, statusCol, notesCol);
    const colLetters = [];
    for (let c = 1; c <= maxCols; c++) {
      let temp = c - 1;
      let letter = '';
      while (temp >= 0) {
        letter = String.fromCharCode((temp % 26) + 65) + letter;
        temp = Math.floor(temp / 26) - 1;
      }
      colLetters.push(letter);
    }

    return (
      <div className="overflow-auto border border-slate-150 rounded-2xl flex-1 bg-white relative max-h-[75vh] w-full shadow-inner">
        <table className="text-left text-xs border-collapse min-w-full">
          <thead>
            <tr className="bg-slate-100 border-b border-slate-200 select-none">
              {/* Corner Empty Header */}
              <th className="px-2.5 py-2.5 bg-slate-200 border-r border-slate-200 text-center font-bold text-slate-500 w-12 sticky left-0 top-0 z-30"></th>
              {/* Column Letter Headers */}
              {colLetters.map((letter, idx) => {
                const colNum = idx + 1;
                let colTitle = '';
                if (colNum === criteriaCol) colTitle = ' (Kriteria)';
                if (colNum === statusCol) colTitle = ' (Ada/Tidak Ada)';
                if (colNum === notesCol) colTitle = ' (Rekomendasi)';
                return (
                  <th key={idx} className={`px-4 py-2 border-r border-slate-200 text-center font-extrabold text-slate-500 text-[10px] sticky top-0 z-10 min-w-[180px] ${
                    colNum === statusCol ? 'bg-blue-50 text-blue-700' :
                    colNum === notesCol ? 'bg-amber-50 text-amber-700' : 'bg-slate-100'
                  }`}>
                    {letter}{colTitle}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {verificationItems.map((item, rowIdx) => {
              const displayRowIdx = item.rowIdx;
              return (
                <tr 
                  key={rowIdx} 
                  className={`border-b border-slate-100 transition-colors ${
                    currentlyProcessingRowIdx === rowIdx ? 'bg-blue-50/50' : 'hover:bg-slate-50/50'
                  }`}
                >
                  {/* Sticky Row Number Index */}
                  <td className="px-2.5 py-3 bg-slate-50 border-r border-slate-200 text-center font-bold text-slate-400 sticky left-0 z-20 select-none">
                    {displayRowIdx}
                  </td>
                  {/* Columns */}
                  {Array.from({ length: maxCols }).map((_, colIdx) => {
                    const colNum = colIdx + 1;
                    
                    if (colNum === criteriaCol) {
                      return (
                        <td key={colIdx} className="px-4 py-3 border-r border-slate-200 text-slate-700 font-bold max-w-[380px] leading-relaxed">
                          {item.text}
                        </td>
                      );
                    }
                    
                    if (colNum === statusCol) {
                      const isAda = item.status === 'Ada' || item.status === '✓' || item.status === 'V';
                      const displayStatus = isAda ? '✓' : (item.status === 'Tidak Ada' || item.status === 'X' ? 'X' : '');

                      return (
                        <td key={colIdx} className="px-4 py-3 border-r border-slate-200 text-center font-black text-xs min-w-[140px]">
                          {isEditingEnabled ? (
                            <select
                              value={item.status === 'Ada' || item.status === '✓' || item.status === 'V' ? 'Ada' : (item.status === 'Tidak Ada' || item.status === 'X' ? 'Tidak Ada' : '')}
                              onChange={(e) => {
                                const val = e.target.value;
                                updateItem(rowIdx, 'status', val as any);
                                // If status becomes 'Ada', clear recommendations notes as requested by user
                                if (val === 'Ada') {
                                  updateItem(rowIdx, 'notes', '');
                                }
                              }}
                              className={`px-3 py-1.5 rounded-xl border text-[11px] font-black focus:outline-none transition-colors w-full cursor-pointer ${
                                isAda ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                                item.status === 'Tidak Ada' || item.status === 'X' ? 'bg-red-50 text-red-600 border-red-200' :
                                'bg-white text-slate-400 border-slate-200'
                              }`}
                            >
                              <option value="">-- Pilih --</option>
                              <option value="Ada">Ada (✓)</option>
                              <option value="Tidak Ada">Tidak Ada (X)</option>
                            </select>
                          ) : (
                            <span className={isAda ? 'text-emerald-600 font-extrabold text-sm' : (displayStatus ? 'text-rose-600 font-extrabold text-sm' : 'text-slate-300')}>
                              {displayStatus || '-'}
                            </span>
                          )}
                        </td>
                      );
                    }

                    if (colNum === notesCol) {
                      const isAda = item.status === 'Ada' || item.status === '✓' || item.status === 'V';
                      return (
                        <td key={colIdx} className="px-4 py-3 border-r border-slate-200 text-slate-600 font-medium min-w-[280px]">
                          {isEditingEnabled ? (
                            <textarea
                              value={item.notes || ''}
                              onChange={(e) => updateItem(rowIdx, 'notes', e.target.value)}
                              placeholder={isAda ? '(Tidak diisi karena ada)' : 'Masukkan rekomendasi perbaikan...'}
                              disabled={isAda}
                              rows={2}
                              className="w-full px-3 py-2 bg-white border border-slate-150 rounded-xl text-xs font-semibold text-slate-600 focus:outline-none focus:border-ppm-slate-light placeholder:text-slate-350 resize-none disabled:bg-slate-50 disabled:text-slate-400"
                            />
                          ) : (
                            <span className="whitespace-pre-wrap">{item.notes || '-'}</span>
                          )}
                        </td>
                      );
                    }

                    // Other columns (empty)
                    return (
                      <td key={colIdx} className="px-4 py-3 border-r border-slate-200 bg-slate-50/20 text-slate-300 text-center select-none">-</td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="w-full max-w-full p-2 md:p-4 space-y-4 px-4 md:px-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Verifikasi Dokumen Perencanaan</h1>
        </div>
        <div className="flex gap-2.5">
          <button 
            onClick={() => setActiveTab('list')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'list' || activeTab === 'workspace' ? 'bg-ppm-slate-light/10 text-ppm-slate-light' : 'bg-transparent text-slate-500 hover:bg-slate-100'}`}
          >
            Daftar Verifikasi
          </button>
          <button 
            onClick={() => setActiveTab('templates')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'templates' ? 'bg-ppm-slate-light/10 text-ppm-slate-light' : 'bg-transparent text-slate-500 hover:bg-slate-100'}`}
          >
            Kelola Template Excel
          </button>
        </div>
      </div>

      {/* VIEW: TEMPLATES MANAGEMENT */}
      {activeTab === 'templates' && (
        <div className="grid grid-cols-12 gap-5">
          {/* List existing templates */}
          <div className="col-span-12 lg:col-span-8 bg-white rounded-2xl p-5 border border-slate-100 shadow-sm space-y-4">
            <h2 className="text-sm font-black text-slate-700 uppercase tracking-wider">Daftar Template Tersimpan</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-extrabold uppercase">
                    <th className="pb-3 font-extrabold">Tahun</th>
                    <th className="pb-3 font-extrabold">Tipe</th>
                    <th className="pb-3 font-extrabold">Berkas Template</th>
                    <th className="pb-3 text-center font-extrabold">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {templates.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-slate-400 font-medium">Belum ada template tersimpan.</td>
                    </tr>
                  ) : (
                    templates.map(t => (
                      <tr key={t.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                        <td className="py-3.5 font-bold text-slate-700">{t.tahun}</td>
                        <td className="py-3.5">
                          <span className={`px-2 py-1 rounded-lg font-bold text-[10px] ${
                            t.tipe_dokumen === 'Renja Perubahan' ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'
                          }`}>
                            {t.tipe_dokumen === 'Renja' ? 'Renja Reguler' : t.tipe_dokumen}
                          </span>
                        </td>
                        <td className="py-3.5 font-medium text-slate-500 truncate max-w-[300px]">
                          {editingTemplateId === t.id ? (
                            <div className="flex items-center gap-1.5">
                              <input 
                                type="text"
                                value={editingTemplateName}
                                onChange={(e) => setEditingTemplateName(e.target.value)}
                                className="px-2 py-1 border border-slate-200 rounded-lg text-xs font-medium text-slate-600 focus:outline-none focus:border-ppm-slate-light w-full"
                              />
                              <button 
                                onClick={() => handleUpdateTemplateName(t.id)}
                                className="p-1 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg transition-colors"
                                title="Simpan Nama"
                              >
                                <Check size={13} />
                              </button>
                              <button 
                                onClick={() => { setEditingTemplateId(null); setEditingTemplateName(''); }}
                                className="p-1 bg-slate-50 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
                                title="Batal"
                              >
                                <X size={13} />
                              </button>
                            </div>
                          ) : (
                            <span title={t.nama_file_template}>{t.nama_file_template}</span>
                          )}
                        </td>
                        <td className="py-3.5 text-center">
                          <div className="flex justify-center items-center gap-1.5">
                            {editingTemplateId !== t.id && (
                              <>
                                <button 
                                  onClick={() => handleViewExcelTemplate(t)}
                                  className="p-1.5 text-ppm-slate-light hover:bg-ppm-slate-light/10 rounded-lg transition-colors"
                                  title="Lihat Berkas Excel Asli"
                                >
                                  <Eye size={14} />
                                </button>
                                <button 
                                  onClick={() => { setEditingTemplateId(t.id); setEditingTemplateName(t.nama_file_template); }}
                                  className="p-1.5 text-ppm-slate-light hover:bg-ppm-slate-light/10 rounded-lg transition-colors"
                                  title="Edit Nama Template"
                                >
                                  <Edit size={14} />
                                </button>
                                <button 
                                  onClick={() => {
                                    const fullUrl = `${API_URL.replace('/api', '')}/${t.path_file_template}`;
                                    window.open(fullUrl);
                                  }}
                                  className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                  title="Unduh File Template"
                                >
                                  <Download size={14} />
                                </button>
                              </>
                            )}
                            <button 
                              onClick={() => handleDeleteTemplate(t.id)}
                              className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Hapus Template"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Upload and Parse Template */}
          <div className="col-span-12 lg:col-span-4 bg-white rounded-2xl p-5 border border-slate-100 shadow-sm space-y-4">
            <h2 className="text-sm font-black text-slate-700 uppercase tracking-wider">Unggah Template Baru</h2>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Tahun Dokumen</label>
                <select 
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-ppm-slate-light"
                >
                  <option value={2025}>2025</option>
                  <option value={2026}>2026</option>
                  <option value={2027}>2027</option>
                  <option value={2028}>2028</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Tipe Dokumen</label>
                <select 
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-ppm-slate-light"
                >
                  <option value="Renja Reguler">Renja Reguler</option>
                  <option value="Renja Perubahan">Renja Perubahan</option>
                </select>
              </div>
            </div>

            {/* Drag & Drop File */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Berkas Excel Template (.xlsx)</label>
              <div className="border-2 border-dashed border-slate-200 hover:border-ppm-slate-light rounded-2xl p-6 text-center cursor-pointer transition-colors relative">
                <input 
                  type="file" 
                  accept=".xlsx" 
                  onChange={handleTemplateFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                />
                <FileSpreadsheet className="mx-auto text-slate-400 mb-2" size={28} />
                <p className="text-xs text-slate-600 font-bold">
                  {templateFile ? templateFile.name : 'Klik atau seret file Excel ke sini'}
                </p>
                <p className="text-[10px] text-slate-400 mt-1">Hanya mendukung format Excel (.xlsx)</p>
              </div>
            </div>

            {loading && (
              <div className="flex items-center justify-center p-4 gap-2 text-xs font-bold text-slate-500">
                <Loader2 size={16} className="animate-spin" />
                <span>Menganalisis file Excel...</span>
              </div>
            )}

            {/* Excel Columns Configuration (shown after upload & inspection) */}
            {inspectResult && (
              <div className="border border-slate-100 bg-slate-50/50 rounded-2xl p-4 space-y-4">
                <h3 className="text-xs font-extrabold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="text-emerald-500" size={14} />
                  Konfigurasi Kolom Excel
                </h3>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                    <span className="text-slate-500 font-medium">Sheet Terdeteksi</span>
                    <select 
                      value={sheetName}
                      onChange={(e) => setSheetName(e.target.value)}
                      className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none"
                    >
                      {inspectResult.sheetNames.map((s: string) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                    <span className="text-slate-500 font-medium">Baris Header (Row Index)</span>
                    <input 
                      type="number" 
                      min={1} 
                      value={headerRowIdx}
                      onChange={(e) => setHeaderRowIdx(Number(e.target.value))}
                      className="w-16 px-2 py-0.5 bg-white border border-slate-200 rounded-lg text-xs text-center font-bold text-slate-700 focus:outline-none"
                    />
                  </div>

                  {(() => {
                    const colOptions = (() => {
                      if (!inspectResult || !inspectResult.previewRows || inspectResult.previewRows.length === 0) return [];
                      const preview = inspectResult.previewRows;
                      const maxCols = Math.max(...preview.map((r: any[]) => r ? r.length : 0), 10);
                      const headerRow = preview[Math.max(0, headerRowIdx - 1)] || preview[0] || [];
                      
                      const options: { value: number; label: string }[] = [];
                      for (let c = 0; c < maxCols; c++) {
                        const colNum = c + 1;
                        let temp = c, letter = '';
                        while (temp >= 0) { letter = String.fromCharCode((temp % 26) + 65) + letter; temp = Math.floor(temp / 26) - 1; }
                        
                        let headerText = String(headerRow[c] ?? '').trim();
                        if (!headerText) {
                          for (let r = 0; r < Math.min(6, preview.length); r++) {
                            const val = String(preview[r]?.[c] ?? '').trim();
                            if (val) { headerText = val; break; }
                          }
                        }
                        const label = `Kolom ${letter} (${colNum})${headerText ? ` — ${headerText}` : ''}`;
                        options.push({ value: colNum, label });
                      }
                      return options;
                    })();

                    return (
                      <>
                        <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                          <span className="text-slate-500 font-medium">Kolom Kriteria</span>
                          <select 
                            value={criteriaColIdx}
                            onChange={(e) => setCriteriaColIdx(Number(e.target.value))}
                            className="max-w-[240px] px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none truncate"
                            title="Pilih kolom yang berisi deskripsi kriteria pemeriksaan"
                          >
                            {colOptions.map(opt => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        </div>

                        <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                          <span className="text-slate-500 font-medium">Kolom "Ada" (Checklist)</span>
                          <select 
                            value={adaColIdx}
                            onChange={(e) => setAdaColIdx(Number(e.target.value))}
                            className="max-w-[240px] px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-emerald-700 focus:outline-none truncate"
                            title="Pilih kolom tempat menulis centang √ untuk status Ada"
                          >
                            {colOptions.map(opt => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        </div>

                        <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                          <span className="text-slate-500 font-medium">Kolom "Tidak Ada" (Checklist)</span>
                          <select 
                            value={tidakAdaColIdx}
                            onChange={(e) => setTidakAdaColIdx(Number(e.target.value))}
                            className="max-w-[240px] px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-rose-700 focus:outline-none truncate"
                            title="Pilih kolom tempat menulis tanda X untuk status Tidak Ada"
                          >
                            {colOptions.map(opt => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        </div>

                        <div className="flex justify-between items-center py-1.5">
                          <span className="text-slate-500 font-medium">Kolom Rekomendasi / Catatan</span>
                          <select 
                            value={notesColIdx}
                            onChange={(e) => setNotesColIdx(Number(e.target.value))}
                            className="max-w-[240px] px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-amber-700 focus:outline-none truncate"
                            title="Pilih kolom tempat menulis alasan/rekomendasi perbaikan"
                          >
                            {colOptions.map(opt => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        </div>
                      </>
                    );
                  })()}
                </div>

                <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-[10px] text-blue-700 flex gap-2 font-medium">
                  <AlertCircle size={16} className="shrink-0 text-blue-500" />
                  <span>Sistem akan mendeteksi baris checklist secara otomatis saat disimpan menggunakan AI terintegrasi Bapperida.</span>
                </div>

                <button 
                  onClick={handleSaveTemplate}
                  className="w-full py-2.5 bg-ppm-slate-light hover:brightness-110 text-white rounded-xl text-xs font-black shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <Save size={14} />
                  <span>Simpan Template</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW: MAIN LIST & START VERIFICATION */}
      {activeTab === 'list' && (
        <div className="grid grid-cols-12 gap-5">
          {/* History list */}
          <div className="col-span-12 lg:col-span-8 bg-white rounded-2xl p-5 border border-slate-100 shadow-sm space-y-4">
            <h2 className="text-sm font-black text-slate-700 uppercase tracking-wider">Riwayat Verifikasi Dokumen</h2>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-extrabold uppercase">
                    <th className="pb-3 font-extrabold">Tahun</th>
                    <th className="pb-3 font-extrabold">Perangkat Daerah</th>
                    <th className="pb-3 font-extrabold">Nama Dokumen</th>
                    <th className="pb-3 font-extrabold text-center">Status</th>
                    <th className="pb-3 font-extrabold">Pemeriksa</th>
                    <th className="pb-3 text-center font-extrabold">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-slate-400 font-medium">Belum ada riwayat verifikasi. Silakan buat baru di form sebelah kanan!</td>
                    </tr>
                  ) : (
                    transactions.map((tr) => (
                      <tr 
                        key={tr.id} 
                        className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors relative"
                        onMouseEnter={() => setHoveredRowId(tr.id)}
                        onMouseLeave={() => { setHoveredRowId(null); }}
                      >
                        <td className="py-4 font-bold text-slate-700">{tr.tahun}</td>
                        <td className="py-4">
                          <div className="font-bold text-slate-800">{tr.pd_singkatan || 'OPD'}</div>
                          <div className="text-[10px] text-slate-400 truncate max-w-[200px] font-medium" title={tr.instansi}>{tr.instansi}</div>
                        </td>
                        <td className="py-4 font-medium text-slate-600">
                          <span className="flex items-center gap-1">
                            <FileText size={13} className="text-slate-400 shrink-0" />
                            <span className="truncate max-w-[200px]" title={tr.nama_dokumen}>{tr.nama_dokumen}</span>
                          </span>
                        </td>
                        <td className="py-4 text-center">
                          <span className={`px-2 py-1 rounded-lg font-black text-[9px] uppercase tracking-wider ${
                            tr.status === 'Selesai' ? 'bg-emerald-50 text-emerald-600' :
                            tr.status === 'Proses' ? 'bg-amber-50 text-amber-600' :
                            'bg-slate-50 text-slate-600'
                          }`}>
                            {tr.status}
                          </span>
                        </td>
                        <td className="py-4 font-medium text-slate-500">{tr.verifier_name || '-'}</td>
                        <td className="py-4 text-center relative">
                          <div className="flex justify-center items-center gap-1.5">
                            <button 
                              onClick={() => openWorkspace(tr)}
                              className="p-1.5 bg-slate-50 hover:bg-ppm-slate-light/10 text-ppm-slate-light rounded-lg transition-colors"
                              title="Buka Workspace"
                            >
                              <Eye size={14} />
                            </button>
                            <button 
                              onClick={() => handleDownloadExcel(tr.id)}
                              className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-lg transition-colors"
                              title="Unduh Excel Terisi"
                            >
                              <Download size={14} />
                            </button>
                            <button 
                              onClick={() => handleDeleteTransaction(tr.id)}
                              className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition-colors"
                              title="Hapus Verifikasi"
                            >
                              <Trash2 size={14} />
                            </button>
                            
                            {/* QAF Trigger */}
                            <button
                              onClick={(e) => openQafMenu(e, tr.id)}
                              className={`p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-all ${
                                hoveredRowId === tr.id || activeQafId === tr.id ? 'opacity-100' : 'opacity-0'
                              }`}
                            >
                              <MoreVertical size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Start New Verification */}
          <div className="col-span-12 lg:col-span-4 bg-white rounded-2xl p-5 border border-slate-100 shadow-sm space-y-4">
            <h2 className="text-sm font-black text-slate-700 uppercase tracking-wider">Mulai Verifikasi Baru</h2>
            
            <form onSubmit={handleStartAutoVerification} className="space-y-4">
              
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Perangkat Daerah</label>
                
                {/* Searchable Perangkat Daerah Dropdown */}
                <div className="relative">
                  {pdDropdownOpen && (
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => { setPdDropdownOpen(false); setPdSearch(''); }} 
                    />
                  )}
                  
                  <div 
                    onClick={() => setPdDropdownOpen(!pdDropdownOpen)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-700 cursor-pointer flex justify-between items-center select-none"
                  >
                    <span className="truncate max-w-[85%]">
                      {newPdId 
                        ? `${departments.find(d => d.id === newPdId)?.singkatan} - ${departments.find(d => d.id === newPdId)?.instansi}`
                        : '-- Pilih Perangkat Daerah --'}
                    </span>
                    <span className="text-slate-400 text-[9px]">▼</span>
                  </div>

                  {pdDropdownOpen && (
                    <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 max-h-64 overflow-y-auto p-2.5 space-y-2">
                      <input 
                        type="text"
                        autoFocus
                        value={pdSearch}
                        onChange={(e) => setPdSearch(e.target.value)}
                        placeholder="Cari Perangkat Daerah..."
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-150 rounded-xl text-xs font-medium text-slate-600 focus:outline-none focus:border-ppm-slate-light placeholder:text-slate-350"
                        onClick={(e) => e.stopPropagation()} 
                      />
                      <div className="space-y-0.5">
                        {filteredDepartments.length === 0 ? (
                          <div className="text-center py-3 text-[10px] text-slate-400 font-medium">Tidak ada hasil ditemukan.</div>
                        ) : (
                          filteredDepartments.map(d => (
                            <div 
                              key={d.id}
                              onClick={() => {
                                setNewPdId(d.id);
                                setPdDropdownOpen(false);
                                setPdSearch('');
                              }}
                              className={`px-3 py-2.5 hover:bg-ppm-slate-light/10 hover:text-ppm-slate-light rounded-xl text-xs font-bold cursor-pointer transition-colors ${newPdId === d.id ? 'bg-ppm-slate-light/10 text-ppm-slate-light' : 'text-slate-600'}`}
                            >
                              {d.singkatan} - {d.instansi}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Tahun</label>
                  <select 
                    value={newYear}
                    onChange={(e) => setNewYear(Number(e.target.value))}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-ppm-slate-light"
                  >
                    <option value={2025}>2025</option>
                    <option value={2026}>2026</option>
                    <option value={2027}>2027</option>
                    <option value={2028}>2028</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Template Form</label>
                  <select 
                    value={newTemplateId}
                    onChange={(e) => setNewTemplateId(e.target.value ? Number(e.target.value) : '')}
                    required
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-ppm-slate-light"
                  >
                    <option value="">-- Pilih Template --</option>
                    {templates.filter(t => t.tahun === newYear).map(t => (
                      <option key={t.id} value={t.id}>{t.nama_file_template} ({t.tipe_dokumen === 'Renja' ? 'Renja Reguler' : t.tipe_dokumen})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Nama Dokumen Verifikasi</label>
                <input 
                  type="text" 
                  value={newDocName}
                  onChange={(e) => setNewDocName(e.target.value)}
                  placeholder="Contoh: Perubahan Renja Dinkes 2026"
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-700 placeholder:text-slate-350 focus:outline-none focus:border-ppm-slate-light"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Dokumen Perencanaan PDF</label>
                <div className="border-2 border-dashed border-slate-200 hover:border-ppm-slate-light rounded-2xl p-5 text-center cursor-pointer transition-colors relative">
                  <input 
                    type="file" 
                    accept=".pdf" 
                    onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                    required
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                  />
                  <FileText className="mx-auto text-slate-400 mb-1" size={24} />
                  <p className="text-[11px] text-slate-600 font-bold">
                    {pdfFile ? pdfFile.name : 'Pilih usulan PDF Perubahan Renja'}
                  </p>
                  <p className="text-[9px] text-slate-400 mt-0.5">Berkas PDF maksimal 50MB</p>
                </div>
              </div>

              <button
                type="submit"
                disabled={aiVerifying}
                className="w-full py-3 bg-ppm-slate-light hover:brightness-110 text-white rounded-xl text-xs font-black shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-75 disabled:cursor-not-allowed"
              >
                {aiVerifying ? (
                  <>
                    <Loader2 size={16} className="animate-spin text-white" />
                    <span>AI sedang memverifikasi PDF...</span>
                  </>
                ) : (
                  <>
                    <span>⚡ Mulai Verifikasi dengan Nayaxa AI</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* VIEW: WORKSPACE DUAL PANEL */}
      {activeTab === 'workspace' && activeTransaction && (
        <div className="space-y-4">
          {/* Top navigation row inside workspace */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-slate-50 border border-slate-100 p-4 rounded-2xl">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => { setActiveTab('list'); setActiveTransaction(null); }}
                className="p-2 bg-ppm-slate-light/10 hover:bg-ppm-slate-light/20 text-ppm-slate-light rounded-xl hover:bg-slate-50 transition-colors"
                title="Kembali"
              >
                <ArrowLeft size={16} />
              </button>
              <div>
                <h2 className="text-sm font-black text-slate-800">{activeTransaction.nama_dokumen}</h2>
                <div className="text-[10px] text-slate-500 font-medium">
                  Tahun {activeTransaction.tahun} • Perangkat Daerah ID: {activeTransaction.pd_id}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5 w-full md:w-auto">
              <button 
                onClick={() => handleSaveWorkspaceResult('Selesai')}
                disabled={loading}
                className="px-3.5 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 flex items-center gap-1.5"
              >
                <CheckCircle2 size={14} />
                <span>Verifikasi Selesai</span>
              </button>

              <button 
                onClick={() => handleDownloadExcel(activeTransaction.id)}
                className="px-3.5 py-2 bg-ppm-slate-light text-white rounded-xl text-xs font-bold hover:brightness-110 flex items-center gap-1.5"
                title="Unduh file Excel"
              >
                <Download size={14} />
                <span>Unduh Excel</span>
              </button>
            </div>
          </div>

          {/* Side-by-Side Panel (Maximized with spreadsheet on the left) */}
          <div className="grid grid-cols-12 gap-5 min-h-[85vh]">
            
            {/* LEFT PANEL: Spreadsheet Table (50% Width) */}
            <div className="col-span-12 lg:col-span-6 bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex flex-col space-y-4 max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-50 pb-3">
                <span className="text-xs font-black text-slate-700 uppercase tracking-wider">Lembar Verifikasi Spreadsheet</span>
                <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded font-black text-[9px] uppercase tracking-wide">
                  Dinamis Excel
                </span>
              </div>

              {verificationItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 text-center border border-dashed border-slate-200 rounded-2xl h-full space-y-3">
                  <AlertTriangle className="text-amber-500" size={32} />
                  <div>
                    <h4 className="text-xs font-bold text-slate-700">Dokumen Belum Diverifikasi</h4>
                    <p className="text-[10px] text-slate-400 mt-1">Gunakan analisis otomatis AI untuk melakukan penilaian pertama.</p>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col min-h-0 bg-white rounded-xl">
                  {renderSpreadsheetTable(true)} {/* editable mode enabled */}
                </div>
              )}
            </div>

            {/* RIGHT PANEL: PDF Viewer (50% Width - Maximized) */}
            <div className="col-span-12 lg:col-span-6 bg-slate-50 border border-slate-100 rounded-2xl overflow-hidden shadow-inner flex flex-col h-[85vh]">
              {pdfUrl ? (
                <iframe 
                  src={`${pdfUrl}#toolbar=1&navpanes=0`}
                  className="w-full h-full"
                  title="PDF Viewer"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center text-slate-400 space-y-2">
                  <FileText size={48} className="text-slate-300 animate-pulse" />
                  <p className="text-xs font-bold">Dokumen PDF tidak ditemukan atau gagal dimuat.</p>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* RENDER QAF POPULAR POP-UP OVERLAY USING REACT PORTAL (BODY LEVEL) */}
      {activeQafId && createPortal(
        <>
          {/* Transparent Backdrop to close QAF popover when clicking outside */}
          <div 
            className="fixed inset-0 z-[9998]"
            onClick={() => setActiveQafId(null)}
          />
          <div 
            style={{ 
              position: 'absolute', 
              top: qafPos.top, 
              left: qafPos.left, 
              zIndex: 9999 
            }}
            className="bg-white border border-slate-100 shadow-xl rounded-xl p-1 min-w-[165px] text-left animate-in fade-in duration-100"
          >
            <button
              onClick={() => { toggleQuickAccess(activeQafId); setActiveQafId(null); }}
              className="w-full px-3 py-2 hover:bg-slate-50 rounded-lg text-[10px] font-bold text-slate-600 flex items-center gap-2"
            >
              ⚡ Tambahkan ke Quick Access
            </button>
            <button
              onClick={() => { 
                const tr = transactions.find(t => t.id === activeQafId);
                if (tr) copyPublicLink(tr.path_file_pdf); 
                setActiveQafId(null); 
              }}
              className="w-full px-3 py-2 hover:bg-slate-50 rounded-lg text-[10px] font-bold text-slate-600 flex items-center gap-2"
            >
              📋 Salin Link Publik PDF
            </button>
            <button
              onClick={() => { alert('Berhasil dipetakan ke butir SKP!'); setActiveQafId(null); }}
              className="w-full px-3 py-2 hover:bg-slate-50 rounded-lg text-[10px] font-bold text-slate-600 flex items-center gap-2"
            >
              📊 Jadikan SKP / Catatan
            </button>
          </div>
        </>,
        document.body
      )}

      {/* RENDER VIEW TEMPLATE CRITERIA MODAL */}
      {viewingTemplate && createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl w-full max-w-6xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-sm font-black text-slate-800 truncate max-w-[700px]">
                  Pratinjau File: {viewingTemplate.nama_file_template}
                </h3>
                <p className="text-[10px] text-slate-400 font-bold mt-0.5 uppercase tracking-wider">
                  Tahun {viewingTemplate.tahun} • {viewingTemplate.tipe_dokumen === 'Renja' ? 'Renja Reguler' : viewingTemplate.tipe_dokumen}
                </p>
              </div>
              <button 
                onClick={() => { setViewingTemplate(null); setExcelPreviewData({}); setExcelSheetNames([]); setActivePreviewSheet(''); }}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Content - Scrollable Spreadsheet Preview */}
            <div className="p-5 overflow-y-auto flex-1 flex flex-col min-h-0">
              {loadingExcelPreview ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-500">
                  <Loader2 size={32} className="animate-spin text-ppm-slate-light" />
                  <span className="text-xs font-bold">Membaca berkas Excel asli...</span>
                </div>
              ) : (
                <>
                  {/* Sheet Tabs */}
                  <div className="flex flex-wrap gap-1 border-b border-slate-100 pb-2 mb-4">
                    {excelSheetNames.map(sheet => (
                      <button 
                        key={sheet}
                        onClick={() => setActivePreviewSheet(sheet)}
                        className={`px-3.5 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${
                          activePreviewSheet === sheet 
                            ? 'bg-ppm-slate-light/10 text-ppm-slate-light' 
                            : 'text-slate-500 hover:bg-slate-50'
                        }`}
                      >
                        {sheet}
                      </button>
                    ))}
                  </div>

                  {/* Spreadsheet Grid */}
                  {activePreviewSheet && excelPreviewData[activePreviewSheet] && (
                    <div className="overflow-auto border border-slate-150 rounded-2xl flex-1 bg-white relative">
                      <table className="text-left text-xs border-collapse min-w-full">
                        <thead>
                          <tr className="bg-slate-100 border-b border-slate-200">
                            {/* Empty corner header cell */}
                            <th className="px-2.5 py-1.5 bg-slate-200 border-r border-slate-200 text-center font-bold text-slate-500 w-12 sticky left-0 top-0 z-30"></th>
                            {/* Column Letters */}
                            {(() => {
                              const sheetRows = excelPreviewData[activePreviewSheet];
                              const maxCols = Math.max(...sheetRows.map(r => r.length), 0);
                              const ths = [];
                              for (let colIdx = 0; colIdx < maxCols; colIdx++) {
                                ths.push(
                                  <th key={colIdx} className="px-3 py-1.5 border-r border-slate-200 text-center font-extrabold text-slate-500 text-[10px] sticky top-0 bg-slate-100 z-10 min-w-[120px]">
                                    {(() => {
                                      let temp = colIdx;
                                      let letter = '';
                                      while (temp >= 0) {
                                        letter = String.fromCharCode((temp % 26) + 65) + letter;
                                        temp = Math.floor(temp / 26) - 1;
                                      }
                                      return letter;
                                    })()}
                                  </th>
                                );
                              }
                              return ths;
                            })()}
                          </tr>
                        </thead>
                        <tbody>
                          {excelPreviewData[activePreviewSheet].map((row, rowIdx) => {
                            const sheetRows = excelPreviewData[activePreviewSheet];
                            const maxCols = Math.max(...sheetRows.map(r => r.length), 0);
                            
                            // Fill row with empty values up to maxCols
                            const cells = [];
                            for (let colIdx = 0; colIdx < maxCols; colIdx++) {
                              cells.push(row[colIdx] !== undefined ? row[colIdx] : '');
                            }

                            return (
                              <tr key={rowIdx} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                                {/* Row Index Header */}
                                <td className="px-2 py-1.5 bg-slate-50 border-r border-slate-200 text-center font-bold text-slate-400 sticky left-0 z-20 select-none">
                                  {rowIdx + 1}
                                </td>
                                {/* Cells */}
                                {cells.map((cell, colIdx) => (
                                  <td 
                                    key={colIdx} 
                                    className="px-3 py-1.5 border-r border-slate-200 text-slate-600 font-semibold whitespace-pre truncate max-w-[300px]" 
                                    title={String(cell)}
                                  >
                                    {String(cell)}
                                  </td>
                                ))}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3.5 border-t border-slate-100 flex justify-end bg-slate-50/50">
              <button 
                onClick={() => { setViewingTemplate(null); setExcelPreviewData({}); setExcelSheetNames([]); setActivePreviewSheet(''); }}
                className="px-4 py-2 bg-ppm-slate-light hover:brightness-110 text-white rounded-xl text-xs font-black shadow-md transition-all active:scale-95"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* RENDER NAYAXA PROCESS MODAL */}
      {isProcessingModalOpen && createPortal(
        <div className="fixed inset-0 z-[11000] flex items-center justify-center p-3 bg-slate-900/65 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl w-[98vw] h-[95vh] max-w-[1920px] flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
            {/* Modal Header */}
            <div className="px-6 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-blue-500 animate-pulse shadow-sm shadow-blue-400"></div>
                <div>
                  <h3 className="text-sm font-black text-slate-800 tracking-tight">
                    Nayaxa AI Verification Workspace
                  </h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">
                    {aiVerifying ? 'Nayaxa AI Sedang Menganalisis Dokumen...' : (isEditingAllowed ? 'Tinjau & Koreksi Sel Spreadsheet' : 'Mengisi Lembar Kerja...')}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                {isEditingAllowed && (
                  <span className="text-xs font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-xl flex items-center gap-1.5 shadow-sm">
                    <Check size={14} /> Mode Koreksi Aktif
                  </span>
                )}
                <button 
                  onClick={() => { setIsProcessingModalOpen(false); }}
                  className="p-1.5 hover:bg-slate-200/80 rounded-xl text-slate-400 hover:text-slate-700 transition-colors"
                  title="Tutup Workspace"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Split View Content */}
            <div className="flex-1 flex min-h-0 divide-x divide-slate-200 overflow-hidden">
              
              {/* Left Panel: Nayaxa Terminal Logs (Collapsible) */}
              {isLogPanelCollapsed ? (
                <div className="w-12 bg-slate-100/80 border-r border-slate-200 flex flex-col items-center py-4 space-y-4 shrink-0 transition-all duration-300">
                  <button
                    onClick={() => setIsLogPanelCollapsed(false)}
                    className="p-2 bg-white text-slate-600 hover:text-blue-600 border border-slate-200 rounded-xl shadow-sm hover:shadow transition-all"
                    title="Buka Panel Log Agent AI"
                  >
                    <PanelLeftOpen size={16} />
                  </button>
                  <div className="writing-mode-vertical text-[10px] font-black text-slate-400 uppercase tracking-widest select-none">
                    NAYAXA AI LOGS
                  </div>
                </div>
              ) : (
                <div className="w-1/4 max-w-[340px] min-w-[260px] bg-white p-4 flex flex-col h-full overflow-hidden shrink-0 border-r border-slate-200 transition-all duration-300">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest select-none">
                      Nayaxa AI Agent Logs
                    </span>
                    <button
                      onClick={() => setIsLogPanelCollapsed(true)}
                      className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                      title="Sembunyikan Panel Log (Perluas Tabel)"
                    >
                      <PanelLeftClose size={14} />
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto space-y-2 font-mono text-[10px] leading-relaxed text-slate-600 select-all pr-2">
                    {nayaxaLogs.map((log, idx) => {
                      if (!log) return null;
                      let colorClass = 'text-slate-600';
                      if (log.startsWith('[System]')) colorClass = 'text-blue-600 font-bold';
                      if (log.startsWith('[Nayaxa-Vision]')) colorClass = 'text-purple-600 font-bold';
                      if (log.startsWith('[Nayaxa-Brain]')) colorClass = 'text-emerald-600 font-bold';
                      if (log.startsWith('[Nayaxa]')) colorClass = 'text-emerald-700 font-extrabold';
                      if (log.startsWith('[SAMP') || log.startsWith('[Database]')) colorClass = 'text-amber-600 font-extrabold';
                      return (
                        <div key={idx} className={colorClass}>
                          {log}
                        </div>
                      );
                    })}
                    <div ref={logEndRef} />
                  </div>
                </div>
              )}

              {/* Right Panel: Full Excel Spreadsheet Live Filling Table */}
              <div className="flex-1 p-4 flex flex-col h-full bg-slate-50/60 min-w-0 overflow-hidden">
                
                {/* Spreadsheet Toolbar (Zoom controls + Toggle) */}
                <div className="flex items-center justify-between mb-3 bg-white border border-slate-200/80 px-4 py-2 rounded-2xl shadow-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-black text-slate-600 uppercase tracking-wider">Spreadsheet Live Preview</span>
                    {currentlyProcessingRowIdx !== null && (
                      <span className="flex items-center gap-1.5 text-[10px] font-extrabold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-lg animate-pulse">
                        <Loader2 size={11} className="animate-spin text-blue-600" />
                        Menganalisis Baris {verificationItems[currentlyProcessingRowIdx]?.rowIdx || ''}...
                      </span>
                    )}
                  </div>
                  
                  {/* Zoom Controls */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold text-slate-400 mr-1 select-none">Skala Tampilan:</span>
                    <button 
                      onClick={() => setTableZoom(prev => Math.max(50, prev - 10))}
                      className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors active:scale-95"
                      title="Perkecil Ukuran (Zoom Out)"
                    >
                      <ZoomOut size={14} />
                    </button>
                    <span className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-slate-700 min-w-[50px] text-center select-none">
                      {tableZoom}%
                    </span>
                    <button 
                      onClick={() => setTableZoom(prev => Math.min(160, prev + 10))}
                      className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors active:scale-95"
                      title="Perbesar Ukuran (Zoom In)"
                    >
                      <ZoomIn size={14} />
                    </button>
                    <button 
                      onClick={() => setTableZoom(100)}
                      className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-colors active:scale-95 ml-1"
                      title="Reset Skala 100%"
                    >
                      <RotateCcw size={13} />
                    </button>

                    {/* Toggle Log Panel */}
                    <button
                      onClick={() => setIsLogPanelCollapsed(!isLogPanelCollapsed)}
                      className={`ml-2 px-2.5 py-1 rounded-xl text-xs font-extrabold flex items-center gap-1 border transition-all ${
                        isLogPanelCollapsed 
                          ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100' 
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                      title={isLogPanelCollapsed ? "Tampilkan Panel Log" : "Perluas Tabel (Sembunyikan Log)"}
                    >
                      {isLogPanelCollapsed ? <PanelLeftOpen size={14} /> : <PanelLeftClose size={14} />}
                      <span>{isLogPanelCollapsed ? "Buka Log" : "Perluas Tabel"}</span>
                    </button>
                  </div>
                </div>
                
                {/* Spreadsheet Grid Container */}
                <div className="flex-1 overflow-auto border border-slate-200 rounded-2xl shadow-inner bg-white relative">
                  {modalExcelRows.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-xs text-slate-400 font-medium">
                      <Loader2 size={20} className="animate-spin mr-2 text-ppm-slate-light" />
                      Memuat data berkas Excel...
                    </div>
                  ) : (() => {
                    const cfg = modalExcelConfig || { criteriaColIdx: 2, statusColIdx: 5, adaColIdx: 5, tidakAdaColIdx: 6, notesColIdx: 7 };
                    const adaColIdx0 = (cfg.adaColIdx || cfg.statusColIdx || 5) - 1; // 0-indexed
                    const tidakAdaColIdx0 = (cfg.tidakAdaColIdx || (cfg.adaColIdx || cfg.statusColIdx || 5) + 1) - 1;
                    const notesColIdx0 = cfg.notesColIdx - 1;
                    const criteriaColIdx0 = cfg.criteriaColIdx - 1;
                    const maxCols = Math.max(...modalExcelRows.map(r => r.length), 0);

                    // Build a lookup from rowIdx (1-based) to verificationItem
                    const vItemByRow: Record<number, VerificationItem> = {};
                    verificationItems.forEach(vi => { vItemByRow[vi.rowIdx] = vi; });

                    // Get col letter helper
                    const colLetter = (colIdx: number) => {
                      let temp = colIdx, letter = '';
                      while (temp >= 0) { letter = String.fromCharCode((temp % 26) + 65) + letter; temp = Math.floor(temp / 26) - 1; }
                      return letter;
                    };

                    return (
                      <div 
                        style={{ 
                          zoom: `${tableZoom}%`,
                          MozTransform: `scale(${tableZoom / 100})`,
                          MozTransformOrigin: '0 0'
                        }}
                        className="min-w-full inline-block align-top"
                      >
                        <table className="text-left text-xs border-collapse min-w-full">
                          <thead>
                            <tr className="bg-slate-100 border-b-2 border-slate-300 sticky top-0 z-20 shadow-sm">
                              {/* Top-Left Empty Header */}
                              <th className="px-2 py-2 bg-slate-200 border-r-2 border-b-2 border-slate-300 text-center font-extrabold text-slate-600 w-12 sticky left-0 z-30 select-none text-[11px]">
                                #
                              </th>
                              {/* All Column Headers */}
                              {Array.from({ length: maxCols }).map((_, ci) => (
                                <th key={ci} className={`px-3 py-2 border-r border-slate-300 text-center font-extrabold text-[11px] min-w-[130px] ${
                                  ci === criteriaColIdx0 ? 'bg-blue-100/80 text-blue-900 border-blue-300' :
                                  ci === adaColIdx0 ? 'bg-emerald-100/90 text-emerald-950 border-emerald-300' :
                                  ci === tidakAdaColIdx0 ? 'bg-rose-100/90 text-rose-950 border-rose-300' :
                                  ci === notesColIdx0 ? 'bg-amber-100/90 text-amber-950 border-amber-300' :
                                  'bg-slate-100 text-slate-700'
                                }`}>
                                  <div className="font-black text-xs">{colLetter(ci)}</div>
                                  {ci === criteriaColIdx0 && <div className="text-[9px] font-bold text-blue-700">(Kriteria)</div>}
                                  {ci === adaColIdx0 && <div className="text-[9px] font-black text-emerald-700">(Ada ✓)</div>}
                                  {ci === tidakAdaColIdx0 && <div className="text-[9px] font-black text-rose-700">(Tidak Ada ✗)</div>}
                                  {ci === notesColIdx0 && <div className="text-[9px] font-bold text-amber-700">(Rekomendasi)</div>}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200">
                            {modalExcelRows.map((row, rowIdx) => {
                              const rowNum = rowIdx + 1; // 1-based
                              const vItem = vItemByRow[rowNum];
                              const isProcessingThis = vItem && currentlyProcessingRowIdx !== null && verificationItems[currentlyProcessingRowIdx]?.rowIdx === rowNum;
                              const isAda = vItem && (vItem.status === 'Ada' || vItem.status === '✓' || vItem.status === 'V');

                              return (
                                <tr key={rowIdx} className={`transition-colors ${isProcessingThis ? 'bg-blue-50/90 font-bold' : 'hover:bg-slate-50/90'}`}>
                                  {/* Row number header */}
                                  <td className="px-2 py-2 bg-slate-100 border-r-2 border-slate-300 text-center font-bold text-slate-500 text-[10px] sticky left-0 z-10 select-none">
                                    {rowNum}
                                  </td>

                                  {/* All columns */}
                                  {Array.from({ length: maxCols }).map((_, ci) => {
                                    // Ada column: overlay AI result (show ✓ badge if Ada)
                                    if (ci === adaColIdx0 && vItem) {
                                      return (
                                        <td key={ci} className="px-2 py-2 border-r border-slate-200 text-center min-w-[100px] bg-emerald-50/40">
                                          {isEditingAllowed ? (
                                            <select
                                              value={isAda ? 'Ada' : (vItem.status === 'Tidak Ada' || vItem.status === 'X' ? 'Tidak Ada' : '')}
                                              onChange={(e) => {
                                                const val = e.target.value;
                                                const idx = verificationItems.findIndex(v => v.rowIdx === rowNum);
                                                if (idx >= 0) {
                                                  updateItem(idx, 'status', val as any);
                                                  if (val === 'Ada') updateItem(idx, 'notes', '');
                                                }
                                              }}
                                              className={`px-2 py-1 rounded-xl border text-[11px] font-black focus:outline-none transition-colors w-full cursor-pointer ${
                                                isAda ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                                                'bg-white text-slate-400 border-slate-200'
                                              }`}
                                            >
                                              <option value="">-- Pilih --</option>
                                              <option value="Ada">✓ Ada</option>
                                              <option value="Tidak Ada">✗ Tidak Ada</option>
                                            </select>
                                          ) : (
                                            isAda ? (
                                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-sm">
                                                <Check size={13} className="text-emerald-700" /> Ada
                                              </span>
                                            ) : (
                                              <span className="text-slate-300 text-xs font-medium">{String(row[ci] ?? '')}</span>
                                            )
                                          )}
                                        </td>
                                      );
                                    }

                                    // Tidak Ada column: overlay AI result (show ✗ badge if Tidak Ada)
                                    if (ci === tidakAdaColIdx0 && vItem) {
                                      const isTidakAda = !isAda && (vItem.status === 'Tidak Ada' || vItem.status === 'X');
                                      return (
                                        <td key={ci} className="px-2 py-2 border-r border-slate-200 text-center min-w-[100px] bg-rose-50/40">
                                          {isEditingAllowed ? (
                                            isTidakAda ? (
                                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-100 text-rose-800 border border-rose-300 shadow-sm">
                                                <X size={13} className="text-rose-700" /> Tidak Ada
                                              </span>
                                            ) : null
                                          ) : (
                                            isTidakAda ? (
                                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-100 text-rose-800 border border-rose-300 shadow-sm">
                                                <X size={13} className="text-rose-700" /> Tidak Ada
                                              </span>
                                            ) : (
                                              <span className="text-slate-300 text-xs font-medium">{String(row[ci] ?? '')}</span>
                                            )
                                          )}
                                        </td>
                                      );
                                    }

                                    // Notes/Rekomendasi column: overlay AI result
                                    if (ci === notesColIdx0 && vItem) {
                                      return (
                                        <td key={ci} className="px-2.5 py-2 border-r border-slate-200 text-slate-700 min-w-[240px] align-top bg-amber-50/30">
                                          {isEditingAllowed ? (
                                            <textarea
                                              value={vItem.notes || ''}
                                              onChange={(e) => {
                                                const idx = verificationItems.findIndex(v => v.rowIdx === rowNum);
                                                if (idx >= 0) updateItem(idx, 'notes', e.target.value);
                                              }}
                                              rows={2}
                                              placeholder="Masukkan catatan / alasan penunjang / rekomendasi..."
                                              className="w-full px-2.5 py-1.5 bg-white border border-slate-250 rounded-xl text-[11px] font-semibold text-slate-700 focus:outline-none focus:border-ppm-slate-light resize-none shadow-sm"
                                            />
                                          ) : (
                                            <span className="text-[11px] font-medium whitespace-pre-wrap text-slate-700 leading-relaxed">
                                              {vItem.notes || String(row[ci] ?? '')}
                                            </span>
                                          )}
                                        </td>
                                      );
                                    }

                                    // All other columns: show original Excel cell value
                                    return (
                                      <td 
                                        key={ci} 
                                        className={`px-3 py-2 border-r border-slate-200 text-slate-700 font-semibold whitespace-pre truncate max-w-[320px] text-[11px] ${
                                          ci === criteriaColIdx0 ? 'bg-blue-50/20 font-bold text-slate-800' : ''
                                        }`} 
                                        title={String(row[ci] ?? '')}
                                      >
                                        {String(row[ci] ?? '')}
                                      </td>
                                    );
                                  })}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    );
                  })()}
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 border-t border-slate-200 flex justify-between items-center bg-slate-50/80">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                {isEditingAllowed ? 'Tinjau & Simpan Perubahan Hasil Verifikasi' : 'Harap tunggu hingga proses analisis selesai...'}
              </div>
              <div className="flex gap-2">
                {isEditingAllowed ? (
                  <>
                    <button 
                      onClick={() => { setIsProcessingModalOpen(false); }}
                      className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-100 transition-all active:scale-95 shadow-sm"
                    >
                      Batal
                    </button>
                    <button 
                      onClick={handleSaveFromModal}
                      className="px-5 py-2 bg-emerald-600 text-white rounded-xl text-xs font-black hover:bg-emerald-700 transition-all active:scale-95 shadow-md flex items-center gap-1.5"
                    >
                      <Save size={14} />
                      <span>Simpan Hasil Verifikasi</span>
                    </button>
                  </>
                ) : (
                  <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-400 rounded-xl text-xs font-bold select-none cursor-not-allowed border border-slate-200">
                    <Loader2 size={14} className="animate-spin text-blue-500" />
                    <span>Menganalisis Dokumen...</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
