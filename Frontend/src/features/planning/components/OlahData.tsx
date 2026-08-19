import React, { useState, useEffect, useRef } from 'react';
import { 
  Upload, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Download, 
  HelpCircle, 
  Sliders, 
  Save, 
  Trash2,
  ChevronUp,
  ChevronDown,
  X,
  Filter,
  Move,
  RefreshCw,
  FolderOpen,
  Search
} from 'lucide-react';
import { API_URL, api } from '@/src/services/api';

interface FileInspectResult {
  sheetNames: string[];
  selectedSheetName: string;
  previewRows: any[][];
  tempFileName?: string;
}

interface SavedTemplate {
  id: number;
  name: string;
  type: string;
  config: string | any;
  created_at: string;
}

const OlahData = () => {
  const [file, setFile] = useState<File | null>(null);
  const [tempFileName, setTempFileName] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [inspecting, setInspecting] = useState(false);
  const [inspectResult, setInspectResult] = useState<FileInspectResult | null>(null);
  
  // Processing modes: 'geografis', 'manual', or 'komparasi'
  const [mode, setMode] = useState<'geografis' | 'manual' | 'komparasi'>('geografis');

  // File 2 States for Comparison
  const [file2, setFile2] = useState<File | null>(null);
  const [tempFileName2, setTempFileName2] = useState<string>('');
  const [inspecting2, setInspecting2] = useState<boolean>(false);
  const [inspectResult2, setInspectResult2] = useState<FileInspectResult | null>(null);
  const [selectedSheet2, setSelectedSheet2] = useState<string>('');
  const [headerRowIdx2, setHeaderRowIdx2] = useState<number>(0);
  const [fillDown2, setFillDown2] = useState<boolean>(false);
  const [activePreviewTab, setActivePreviewTab] = useState<'file1' | 'file2'>('file1');
  const fileInputRef2 = useRef<HTMLInputElement>(null);

  // Custom labels for comparison files
  const [label1, setLabel1] = useState<string>('RKPD Awal');
  const [label2, setLabel2] = useState<string>('RKPD Baru');

  const handleSwapFiles = () => {
    const tempFile1 = file;
    const tempFile2 = file2;
    setFile(tempFile2);
    setFile2(tempFile1);

    const tempName1 = tempFileName;
    const tempName2 = tempFileName2;
    setTempFileName(tempName2);
    setTempFileName2(tempName1);

    const tempResult1 = inspectResult;
    const tempResult2 = inspectResult2;
    setInspectResult(tempResult2);
    setInspectResult2(tempResult1);

    const tempSheet1 = selectedSheet;
    const tempSheet2 = selectedSheet2;
    setSelectedSheet(tempSheet2);
    setSelectedSheet2(tempSheet1);

    const tempHeader1 = headerRowIdx;
    const tempHeader2 = headerRowIdx2;
    setHeaderRowIdx(tempHeader2);
    setHeaderRowIdx2(tempHeader1);

    const tempFill1 = fillDown;
    const tempFill2 = fillDown2;
    setFillDown(tempFill2);
    setFillDown2(tempFill1);

    const tempLabel1 = label1;
    const tempLabel2 = label2;
    setLabel1(tempLabel2);
    setLabel2(tempLabel1);

    setCompFilterColIdx(-1);
    setCompFilterVal('');
    setCompFilterUniqueVals([]);
  };

  // Ladder/outline style auto-fill down preference
  const [fillDown, setFillDown] = useState<boolean>(false);

  // Mapping configuration states
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [headerRowIdx, setHeaderRowIdx] = useState<number>(0);
  
  // Geografis mode mappings
  const [provColIdx, setProvColIdx] = useState<number>(-1);
  const [kabColIdx, setKabColIdx] = useState<number>(-1);
  const [kecColIdx, setKecColIdx] = useState<number>(-1);
  const [desaColIdx, setDesaColIdx] = useState<number>(-1);
  const [alamatColIdx, setAlamatColIdx] = useState<number>(-1);
  const [filterKabupaten, setFilterKabupaten] = useState<string>('');
  const [objekColIdx, setObjekColIdx] = useState<number>(-1);
  const [objekValue, setObjekValue] = useState<string>('');

  // Manual mode mappings (Ordered array of column indexes)
  const [customGroupCols, setCustomGroupCols] = useState<number[]>([]);
  
  // Unique values and filter checklists for manual grouping
  const [columnUniqueValues, setColumnUniqueValues] = useState<{[key: number]: string[]}>({});
  const [customGroupFilters, setCustomGroupFilters] = useState<{[key: number]: string[]}>({});
  const [fetchingUniqueValues, setFetchingUniqueValues] = useState<{[key: number]: boolean}>({});
  const [filterSearchQueries, setFilterSearchQueries] = useState<{[key: number]: string}>({});



  // Perpustakaan Modal States
  const [showLibraryModal, setShowLibraryModal] = useState(false);
  const [libraryDocs, setLibraryDocs] = useState<any[]>([]);
  const [loadingLibrary, setLoadingLibrary] = useState(false);
  const [librarySearchQuery, setLibrarySearchQuery] = useState('');

  const openLibraryModal = async () => {
    setShowLibraryModal(true);
    setLoadingLibrary(true);
    setLibrarySearchQuery('');
    try {
      const resData = await api.dokumen.getAll();
      if (resData.success) {
        // Filter to only include Excel files (.xlsx or .xls)
        const excelFiles = (resData.data || []).filter((doc: any) => {
          const name = String(doc.nama_file || '').toLowerCase();
          return name.endsWith('.xlsx') || name.endsWith('.xls');
        });
        setLibraryDocs(excelFiles);
      }
    } catch (err) {
      console.error('Error fetching library docs:', err);
    } finally {
      setLoadingLibrary(false);
    }
  };

  const handleSelectLibraryDoc = (doc: any) => {
    setShowLibraryModal(false);
    
    // Construct mock File object for frontend compatibility
    const mockFile = {
      name: doc.nama_file,
      size: doc.ukuran || 0,
      libraryFilePath: doc.path
    } as any as File;

    setFile(mockFile);
    inspectFile(mockFile);
  };

  // Drag and Drop States
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Template States
  const [templates, setTemplates] = useState<SavedTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [newTemplateName, setNewTemplateName] = useState<string>('');
  const [savingTemplate, setSavingTemplate] = useState(false);

  const [status, setStatus] = useState<{ type: 'success' | 'error' | null, message: string }>({ type: null, message: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetAll = () => {
    setFile(null);
    setTempFileName('');
    setInspectResult(null);
    setSelectedSheet('');
    setHeaderRowIdx(0);
    setProvColIdx(-1);
    setKabColIdx(-1);
    setKecColIdx(-1);
    setDesaColIdx(-1);
    setAlamatColIdx(-1);
    setFilterKabupaten('');
    setObjekColIdx(-1);
    setObjekValue('');
    setCustomGroupCols([]);
    setColumnUniqueValues({});
    setCustomGroupFilters({});
    setFetchingUniqueValues({});
    setFilterSearchQueries({});
    setFillDown(false);
    setSelectedTemplateId('');
    setNewTemplateName('');
    setStatus({ type: null, message: '' });
    // Reset file 2 as well
    setFile2(null);
    setTempFileName2('');
    setInspectResult2(null);
    setSelectedSheet2('');
    setHeaderRowIdx2(0);
    setFillDown2(false);
    setActivePreviewTab('file1');
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (fileInputRef2.current) fileInputRef2.current.value = '';
  };

  // Fetch templates for current user
  const fetchTemplates = async () => {
    try {
      const token = sessionStorage.getItem('token');
      const response = await fetch(`${API_URL}/olah-data/templates`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const res = await response.json();
        if (res.success) {
          setTemplates(res.data);
        }
      }
    } catch (err) {
      console.error('Error fetching templates:', err);
    }
  };

  // Fetch templates on load
  useEffect(() => {
    fetchTemplates();
  }, []);

  // Reset filter selection when mode changes to prevent leak/conflict
  useEffect(() => {
    setCustomGroupCols([]);
    setCustomGroupFilters({});
  }, [mode]);

  // Inspect the file once uploaded
  const inspectFile = async (selectedFile: File, sheetName?: string) => {
    setInspecting(true);
    setStatus({ type: null, message: '' });

    const formData = new FormData();
    if ((selectedFile as any).libraryFilePath) {
      formData.append('libraryFilePath', (selectedFile as any).libraryFilePath);
    } else {
      formData.append('file', selectedFile);
    }
    if (sheetName) {
      formData.append('sheetName', sheetName);
    }

    try {
      const token = sessionStorage.getItem('token');
      const response = await fetch(`${API_URL}/olah-data/inspect`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Gagal memeriksa struktur file Excel.');
      }

      const res: FileInspectResult & { success: boolean } = await response.json();
      
      if (res.success) {
        setInspectResult(res);
        setSelectedSheet(res.selectedSheetName);
        if (res.tempFileName) {
          setTempFileName(res.tempFileName);
        }
        
        // Auto-detect header row index
        let bestRowIdx = 0;
        let maxFilledCols = 0;
        const searchRange = Math.min(res.previewRows.length, 20);
        for (let i = 0; i < searchRange; i++) {
          const filledCols = res.previewRows[i].filter(cell => cell !== '' && cell !== null && cell !== undefined).length;
          if (filledCols > maxFilledCols) {
            maxFilledCols = filledCols;
            bestRowIdx = i;
          }
        }
        setHeaderRowIdx(bestRowIdx);
      } else {
        throw new Error('Gagal memproses detail excel');
      }
    } catch (error: any) {
      setStatus({ type: 'error', message: error.message || 'Terjadi kesalahan saat mengunggah file.' });
      resetAll();
    } finally {
      setInspecting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      inspectFile(selectedFile);
    }
  };

  // Trigger inspect again when changing sheets
  const handleSheetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSheet = e.target.value;
    setSelectedSheet(newSheet);
    if (file) {
      inspectFile(file, newSheet);
    }
  };

  // Helper to load unique values for a column based on existing customGroupCols and filters
  const loadUniqueValues = async (colIdx: number) => {
    const idxInList = customGroupCols.indexOf(colIdx);
    const activeFilters: {[key: number]: string[]} = {};
    if (idxInList > 0) {
      for (let j = 0; j < idxInList; j++) {
        const prevColIdx = customGroupCols[j];
        if (customGroupFilters[prevColIdx] !== undefined) {
          activeFilters[prevColIdx] = customGroupFilters[prevColIdx];
        }
      }
    }
    await fetchUniqueValuesWithFilters(colIdx, activeFilters, customGroupFilters);
  };

  // Inspect the second file for comparison
  const inspectFile2 = async (selectedFile: File, sheetName?: string) => {
    setInspecting2(true);
    setStatus({ type: null, message: '' });

    const formData = new FormData();
    formData.append('file', selectedFile);
    if (sheetName) {
      formData.append('sheetName', sheetName);
    }

    try {
      const token = sessionStorage.getItem('token');
      const response = await fetch(`${API_URL}/olah-data/inspect`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Gagal memeriksa struktur file Excel kedua.');
      }

      const res: FileInspectResult & { success: boolean } = await response.json();
      
      if (res.success) {
        setInspectResult2(res);
        setSelectedSheet2(res.selectedSheetName);
        if (res.tempFileName) {
          setTempFileName2(res.tempFileName);
        }
        
        // Auto-detect header row index for file 2
        let bestRowIdx = 0;
        let maxFilledCols = 0;
        const searchRange = Math.min(res.previewRows.length, 20);
        for (let i = 0; i < searchRange; i++) {
          const filledCols = res.previewRows[i].filter(cell => cell !== '' && cell !== null && cell !== undefined).length;
          if (filledCols > maxFilledCols) {
            maxFilledCols = filledCols;
            bestRowIdx = i;
          }
        }
        setHeaderRowIdx2(bestRowIdx);
      } else {
        throw new Error('Gagal memproses detail excel kedua');
      }
    } catch (error: any) {
      setStatus({ type: 'error', message: error.message || 'Terjadi kesalahan saat mengunggah file kedua.' });
      setFile2(null);
      setTempFileName2('');
      setInspectResult2(null);
    } finally {
      setInspecting2(false);
    }
  };

  const handleFileChange2 = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile2(selectedFile);
      inspectFile2(selectedFile);
    }
  };

  const handleSheetChange2 = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSheet = e.target.value;
    setSelectedSheet2(newSheet);
    if (file2) {
      inspectFile2(file2, newSheet);
    }
  };

  // Fetch unique values with active filters constraint
  const fetchUniqueValuesWithFilters = async (
    targetColIdx: number, 
    activeFilters: {[key: number]: string[]},
    currentFiltersState: {[key: number]: string[]},
    overrideFillDown?: boolean
  ): Promise<string[]> => {
    if (!file || !selectedSheet) return [];
    setFetchingUniqueValues(prev => ({ ...prev, [targetColIdx]: true }));

    const isFdActive = overrideFillDown !== undefined ? overrideFillDown : fillDown;

    const formData = new FormData();
    formData.append('sheetName', selectedSheet);
    formData.append('headerRowIndex', headerRowIdx.toString());
    formData.append('colIdx', targetColIdx.toString());
    formData.append('activeFilters', JSON.stringify(activeFilters));
    formData.append('fillDown', isFdActive.toString());

    // Gunakan tempFileName untuk mencegah pengunggahan ulang file Excel yang lambat
    if (tempFileName) {
      formData.append('tempFileName', tempFileName);
    } else if (file) {
      formData.append('file', file);
    }

    try {
      const token = sessionStorage.getItem('token');
      const response = await fetch(`${API_URL}/olah-data/unique-values`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      if (!response.ok) throw new Error('Gagal');
      const data = await response.json();
      if (data.success) {
        setColumnUniqueValues(prev => ({ ...prev, [targetColIdx]: data.values }));
        
        const oldChecked = currentFiltersState[targetColIdx];
        let finalChecked: string[] = [];
        if (oldChecked !== undefined) {
          finalChecked = oldChecked.filter((v: string) => data.values.includes(v));
        } else {
          finalChecked = [];
        }

        setCustomGroupFilters(prev => ({ ...prev, [targetColIdx]: finalChecked }));
        return finalChecked;
      }
    } catch (err) {
      console.error('Error fetching cascading values for col', targetColIdx, err);
    } finally {
      setFetchingUniqueValues(prev => ({ ...prev, [targetColIdx]: false }));
    }
    return [];
  };

  // Cascade updates when filter selection changes
  const updateFiltersForCol = async (colIdx: number, checked: string[]) => {
    // 1. Update local filter state
    let nextFilters = { ...customGroupFilters, [colIdx]: checked };
    setCustomGroupFilters(nextFilters);

    const colPos = customGroupCols.indexOf(colIdx);
    if (colPos === -1) return;

    // 2. Fetch new unique values for all subsequent columns sequentially
    for (let i = colPos + 1; i < customGroupCols.length; i++) {
      const targetColIdx = customGroupCols[i];
      const activeFilters: {[key: number]: string[]} = {};
      for (let j = 0; j < i; j++) {
        const prevColIdx = customGroupCols[j];
        // Hanya kirim filter jika sudah terisi/tidak undefined untuk mencegah error cascading (0/0)
        if (nextFilters[prevColIdx] !== undefined) {
          activeFilters[prevColIdx] = nextFilters[prevColIdx];
        }
      }
      // Await and capture returned values to propagate down the chain in-place
      const targetChecked = await fetchUniqueValuesWithFilters(targetColIdx, activeFilters, nextFilters);
      nextFilters = { ...nextFilters, [targetColIdx]: targetChecked };
    }
  };

  // Re-fetch cascading values starting from top when column positions change
  const handleReorderedColumns = async (newOrder: number[], overrideFillDown?: boolean) => {
    setCustomGroupCols(newOrder);
    
    let nextFilters = { ...customGroupFilters };
    for (let i = 0; i < newOrder.length; i++) {
      const targetColIdx = newOrder[i];
      if (i === 0) {
        // First column has no preceding constraints
        const targetChecked = await fetchUniqueValuesWithFilters(targetColIdx, {}, nextFilters, overrideFillDown);
        nextFilters = { ...nextFilters, [targetColIdx]: targetChecked };
      } else {
        const activeFilters: {[key: number]: string[]} = {};
        for (let j = 0; j < i; j++) {
          const prevColIdx = newOrder[j];
          if (nextFilters[prevColIdx] !== undefined) {
            activeFilters[prevColIdx] = nextFilters[prevColIdx];
          }
        }
        const targetChecked = await fetchUniqueValuesWithFilters(targetColIdx, activeFilters, nextFilters, overrideFillDown);
        nextFilters = { ...nextFilters, [targetColIdx]: targetChecked };
      }
    }
  };

  // Trigger cascade refresh when fillDown toggle changes
  const handleToggleFillDown = async (checked: boolean) => {
    setFillDown(checked);
    if (customGroupCols.length > 0) {
      await handleReorderedColumns(customGroupCols, checked);
    }
  };

  // Move column order (Manual Mode positioning) via button click
  const moveColumn = async (index: number, direction: 'up' | 'down') => {
    const updated = [...customGroupCols];
    if (direction === 'up' && index > 0) {
      const temp = updated[index];
      updated[index] = updated[index - 1];
      updated[index - 1] = temp;
    } else if (direction === 'down' && index < updated.length - 1) {
      const temp = updated[index];
      updated[index] = updated[index + 1];
      updated[index + 1] = temp;
    }
    await handleReorderedColumns(updated);
  };

  // Add/Remove column to grouping list
  const toggleColumnSelection = async (colIdx: number) => {
    if (customGroupCols.includes(colIdx)) {
      const updatedOrder = customGroupCols.filter(idx => idx !== colIdx);
      await handleReorderedColumns(updatedOrder);
    } else {
      const updatedOrder = [...customGroupCols, colIdx];
      setCustomGroupCols(updatedOrder);
      
      // Fetch its unique values based on preceding columns constraints
      const activeFilters: {[key: number]: string[]} = {};
      const nextFilters = { ...customGroupFilters };
      for (let j = 0; j < updatedOrder.length - 1; j++) {
        const prevColIdx = updatedOrder[j];
        if (nextFilters[prevColIdx] !== undefined) {
          activeFilters[prevColIdx] = nextFilters[prevColIdx];
        }
      }
      await fetchUniqueValuesWithFilters(colIdx, activeFilters, nextFilters);
    }
  };

  // Native HTML5 Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    setDragOverIndex(index);
  };

  const handleDrop = async (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDragOverIndex(null);
      return;
    }

    const updated = [...customGroupCols];
    const draggedItem = updated[draggedIndex];
    updated.splice(draggedIndex, 1);
    updated.splice(targetIndex, 0, draggedItem);
    
    setDraggedIndex(null);
    setDragOverIndex(null);
    
    await handleReorderedColumns(updated);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // Auto-run mapping detection when header row index changes or inspectResult updates
  useEffect(() => {
    if (!inspectResult || headerRowIdx < 0 || headerRowIdx >= inspectResult.previewRows.length) return;
    if (selectedTemplateId) return;

    const headers = inspectResult.previewRows[headerRowIdx];
    let detectedProv = -1;
    let detectedKab = -1;
    let detectedKec = -1;
    let detectedDesa = -1;
    let detectedAlamat = -1;
    let detectedObjek = -1;

    headers.forEach((cell, idx) => {
      if (!cell) return;
      const str = cell.toString().toLowerCase().trim();
      
      // Provinsi matching
      if (detectedProv === -1 && (str === 'provinsi' || str === 'prov' || str.includes('provinsi'))) {
        detectedProv = idx;
      }
      // Kabupaten matching
      if (detectedKab === -1 && (str === 'kabupaten' || str === 'kabupaten/kota' || str === 'kota' || str === 'kab' || str === 'kab.' || str.includes('kabupaten') || str.includes('kota'))) {
        detectedKab = idx;
      }
      // Kecamatan matching
      if (detectedKec === -1 && (str === 'kecamatan' || str === 'kec' || str === 'kec.' || str.includes('kecamatan'))) {
        detectedKec = idx;
      }
      // Desa matching
      if (detectedDesa === -1 && (str === 'desa' || str === 'kelurahan' || str === 'desa/kelurahan' || str === 'kel' || str === 'des' || str.includes('kelurahan') || str.includes('desa'))) {
        detectedDesa = idx;
      }
      // Alamat/RT/RW matching
      if (detectedAlamat === -1 && (str === 'alamat' || str === 'alamat lengkap' || str.includes('alamat') || str.includes('rt') || str.includes('rw'))) {
        detectedAlamat = idx;
      }
      // Objek matching candidate
      if (detectedObjek === -1 && (str.includes('diagnosis') || str.includes('penyakit') || str.includes('stunting') || str.includes('tbc') || str.includes('kasus'))) {
        detectedObjek = idx;
      }
    });

    setProvColIdx(detectedProv);
    setKabColIdx(detectedKab);
    setKecColIdx(detectedKec);
    setDesaColIdx(detectedDesa);
    setAlamatColIdx(detectedAlamat);
    setObjekColIdx(detectedObjek);

  }, [inspectResult, headerRowIdx, selectedTemplateId]);

  // Load selected template values
  const handleApplyTemplate = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const templateId = e.target.value;
    setSelectedTemplateId(templateId);
    if (!templateId) return;

    const tObj = templates.find(t => t.id === parseInt(templateId, 10));
    if (!tObj) return;

    try {
      const config = typeof tObj.config === 'string' ? JSON.parse(tObj.config) : tObj.config;
      
      setMode(tObj.type as 'geografis' | 'manual');
      if (config.headerRowIdx !== undefined) setHeaderRowIdx(config.headerRowIdx);
      if (config.provColIdx !== undefined) setProvColIdx(config.provColIdx);
      if (config.kabColIdx !== undefined) setKabColIdx(config.kabColIdx);
      if (config.kecColIdx !== undefined) setKecColIdx(config.kecColIdx);
      if (config.desaColIdx !== undefined) setDesaColIdx(config.desaColIdx);
      if (config.alamatColIdx !== undefined) setAlamatColIdx(config.alamatColIdx);
      if (config.objekColIdx !== undefined) setObjekColIdx(config.objekColIdx);
      if (config.objekValue !== undefined) setObjekValue(config.objekValue);
      if (config.filterKabupaten !== undefined) setFilterKabupaten(config.filterKabupaten);
      if (config.fillDown !== undefined) setFillDown(config.fillDown);
      
      if (config.customGroupCols !== undefined) {
        setCustomGroupCols(config.customGroupCols);
        // Pre-populate filter values from template configuration
        config.customGroupCols.forEach((colIdx: number) => {
          loadUniqueValues(colIdx);
        });
      }
      
      if (config.customGroupFilters !== undefined) {
        setCustomGroupFilters(config.customGroupFilters);
      }
      
      setStatus({ type: 'success', message: `Berhasil memuat template "${tObj.name}"` });
    } catch (err: any) {
      setStatus({ type: 'error', message: 'Gagal membaca format konfigurasi template.' });
    }
  };

  // Save template configuration to database
  const handleSaveTemplate = async () => {
    if (!newTemplateName.trim()) {
      setStatus({ type: 'error', message: 'Masukkan nama template terlebih dahulu.' });
      return;
    }

    setSavingTemplate(true);
    setStatus({ type: null, message: '' });

    const config = {
      headerRowIdx,
      selectedSheet,
      provColIdx,
      kabColIdx,
      kecColIdx,
      desaColIdx,
      alamatColIdx,
      objekColIdx,
      objekValue,
      filterKabupaten,
      customGroupCols,
      customGroupFilters,
      fillDown
    };

    try {
      const token = sessionStorage.getItem('token');
      const response = await fetch(`${API_URL}/olah-data/templates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: newTemplateName.trim(),
          type: mode,
          config
        })
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setStatus({ type: 'success', message: `Template "${newTemplateName}" berhasil disimpan.` });
        setNewTemplateName('');
        await fetchTemplates();
        setSelectedTemplateId(data.templateId.toString());
      } else {
        throw new Error(data.message || 'Gagal menyimpan template.');
      }
    } catch (err: any) {
      setStatus({ type: 'error', message: err.message || 'Terjadi kesalahan saat menyimpan template.' });
    } finally {
      setSavingTemplate(false);
    }
  };

  // Delete saved template
  const handleDeleteTemplate = async (id: number) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus template ini?')) return;

    try {
      const token = sessionStorage.getItem('token');
      const response = await fetch(`${API_URL}/olah-data/templates/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setStatus({ type: 'success', message: 'Template berhasil dihapus.' });
        setSelectedTemplateId('');
        await fetchTemplates();
      } else {
        throw new Error(data.message || 'Gagal menghapus template.');
      }
    } catch (err: any) {
      setStatus({ type: 'error', message: err.message || 'Gagal menghapus template.' });
    }
  };

  // Handle final dynamic compilation and download
  const handleProcess = async () => {
    if (!file || !selectedSheet) return;

    if (mode === 'komparasi') {
      if (!tempFileName2) {
        setStatus({ type: 'error', message: 'Harap unggah berkas RKPD Baru terlebih dahulu untuk komparasi.' });
        return;
      }
    } else if (mode === 'geografis') {
      const hasMinMapping = kecColIdx !== -1 || desaColIdx !== -1 || alamatColIdx !== -1;
      if (!hasMinMapping) {
        setStatus({ type: 'error', message: 'Harap petakan minimal salah satu kolom geografis (Kecamatan, Desa, atau Alamat) sebelum memproses.' });
        return;
      }
    } else {
      if (customGroupCols.length === 0) {
        setStatus({ type: 'error', message: 'Harap pilih minimal satu kolom rekapitulasi untuk dikelompokkan.' });
        return;
      }
    }

    setLoading(true);
    setStatus({ type: null, message: '' });

    if (mode === 'komparasi') {
      try {
        const token = sessionStorage.getItem('token');
        const response = await fetch(`${API_URL}/olah-data/compare`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            tempFileName1: tempFileName,
            sheetName1: selectedSheet,
            headerRowIndex1: headerRowIdx,
            tempFileName2: tempFileName2,
            sheetName2: selectedSheet2,
            headerRowIndex2: headerRowIdx2,
            fillDown1: fillDown.toString(),
            fillDown2: fillDown2.toString(),
            label1,
            label2,
            customGroupFilters: JSON.stringify(customGroupFilters),
            customGroupCols: customGroupCols
          })
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || 'Gagal melakukan komparasi Excel.');
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        
        a.download = `Hasil_Komparasi_${label1.replace(/[^a-zA-Z0-9]/g, '_')}_vs_${label2.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.xlsx`;
        
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);

        setStatus({ 
          type: 'success', 
          message: 'Komparasi perencanaan selesai! Hasil unduhan berhasil disimpan.' 
        });
      } catch (error: any) {
        setStatus({ type: 'error', message: error.message || 'Terjadi kesalahan sistem saat memproses komparasi.' });
      } finally {
        setLoading(false);
      }
      return;
    }

    setLoading(true);
    setStatus({ type: null, message: '' });

    const formData = new FormData();
    formData.append('sheetName', selectedSheet);
    formData.append('headerRowIndex', headerRowIdx.toString());
    formData.append('mode', mode);
    formData.append('fillDown', fillDown.toString());

    // Gunakan tempFileName untuk menghemat upload bandwidth
    if (tempFileName) {
      formData.append('tempFileName', tempFileName);
    } else {
      formData.append('file', file);
    }

    if (mode === 'geografis') {
      formData.append('provinsiColIdx', provColIdx.toString());
      formData.append('kabupatenColIdx', kabColIdx.toString());
      formData.append('kecamatanColIdx', kecColIdx.toString());
      formData.append('desaColIdx', desaColIdx.toString());
      formData.append('alamatColIdx', alamatColIdx.toString());
      formData.append('filterKabupaten', filterKabupaten);
      formData.append('objekColIdx', objekColIdx.toString());
      formData.append('objekValue', objekValue);
    } else {
      formData.append('customGroupCols', customGroupCols.join(','));
      formData.append('customGroupFilters', JSON.stringify(customGroupFilters));
    }

    try {
      const token = sessionStorage.getItem('token');
      const response = await fetch(`${API_URL}/olah-data/process`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Gagal mengolah file Excel.');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      const originalBaseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
      const fileTypeSuffix = mode === 'geografis' ? '_Geografis' : '_Manual';
      a.download = `Rekap_${originalBaseName}${fileTypeSuffix}_Hasil.xlsx`;
      
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      setStatus({ 
        type: 'success', 
        message: 'Pemecahan data selesai! File Excel hasil rekapitulasi berhasil diunduh.' 
      });
    } catch (error: any) {
      setStatus({ type: 'error', message: error.message || 'Terjadi kesalahan sistem saat memproses data.' });
    } finally {
      setLoading(false);
    }
  };

  const hasMinMapping = kecColIdx !== -1 || desaColIdx !== -1 || alamatColIdx !== -1;

  const filteredLibraryDocs = libraryDocs.filter((doc) => {
    const query = librarySearchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      String(doc.nama_file || '').toLowerCase().includes(query) ||
      String(doc.uploader_nama || '').toLowerCase().includes(query)
    );
  });

  return (
    <div className="w-full max-w-none py-4 px-2 sm:px-4">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 px-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <FileSpreadsheet className="text-ppm-slate-light" size={28} />
            Pengolah & Rekapitulasi Excel
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5 font-medium">
            Menu cerdas untuk mengolah, menyaring, dan merekap file Excel secara dinamis dan terjadwal per pengguna.
          </p>
        </div>

        {/* Template Picker */}
        {inspectResult && (
          <div className="flex items-center gap-2 shrink-0">
            <div className="relative">
              <select
                value={selectedTemplateId}
                onChange={handleApplyTemplate}
                className="h-9 px-3 rounded-lg border border-slate-200 font-bold text-slate-700 bg-white shadow-sm focus:outline-none transition-all text-xs"
              >
                <option value="">-- Pilih Template Tersimpan --</option>
                {templates.map(t => (
                  <option key={t.id} value={t.id}>{t.name} ({t.type === 'geografis' ? 'Geografis' : 'Custom'})</option>
                ))}
              </select>
            </div>
            {selectedTemplateId && (
              <button 
                onClick={() => handleDeleteTemplate(parseInt(selectedTemplateId, 10))}
                className="h-9 w-9 rounded-lg bg-rose-50 border border-rose-100 hover:bg-rose-100 text-rose-600 flex items-center justify-center transition-all"
                title="Hapus Template Ini"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Main card */}
      <div className="bg-white rounded-2xl shadow-xl border border-slate-100/80 overflow-hidden">
        {/* State 1: Upload File */}
        {!inspectResult && (
          <div className="p-4 sm:p-8">
            <div className="text-center max-w-lg mx-auto py-10">
              <div 
                className={`relative border-2 border-dashed rounded-2xl p-8 sm:p-12 transition-all duration-300 flex flex-col items-center justify-center cursor-pointer group
                  ${inspecting ? 'border-ppm-slate-light bg-indigo-50/10' : 'border-slate-200 hover:border-ppm-slate-light hover:bg-slate-50/30'}
                `}
                onClick={() => !inspecting && fileInputRef.current?.click()}
              >
                <input 
                  type="file" 
                  ref={fileInputRef}
                  className="hidden" 
                  onChange={handleFileChange}
                  accept=".xlsx,.xls"
                />
                
                <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center mb-4 sm:mb-6 transition-all duration-300
                  ${inspecting ? 'bg-ppm-slate-light text-white scale-110 shadow-lg shadow-slate-200/50' : 'bg-slate-50 text-slate-400 group-hover:scale-110 group-hover:bg-ppm-slate-light group-hover:text-white group-hover:shadow-lg'}
                `}>
                  {inspecting ? <Loader2 size={32} className="animate-spin text-white" /> : <Upload size={32} strokeWidth={2.5} />}
                </div>

                <h3 className="text-slate-800 font-extrabold text-base sm:text-lg transition-colors group-hover:text-ppm-slate-light">
                  {inspecting ? 'Membaca Berkas...' : 'Unggah File Excel'}
                </h3>
                <p className="text-slate-400 text-xs sm:text-sm font-medium mt-1">
                  Pilih berkas Excel (.xlsx / .xls) untuk mendeteksi strukturnya secara otomatis.
                </p>
              </div>

              {/* Take from Library */}
              <div className="mt-4 flex items-center justify-center gap-2">
                <span className="text-xs text-slate-400 font-medium">atau</span>
                <button
                  type="button"
                  onClick={openLibraryModal}
                  disabled={inspecting}
                  className="inline-flex items-center gap-1.5 px-3.5 h-8.5 bg-white border border-slate-200 hover:border-ppm-slate-light/30 hover:bg-ppm-slate-light/5 text-ppm-slate-light font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer"
                >
                  <FolderOpen size={13} />
                  Ambil dari Perpustakaan
                </button>
              </div>

              {/* Quick Guide */}
              <div className="mt-6 bg-slate-50 rounded-xl p-4 border border-slate-100 text-left">
                <h4 className="text-xs font-extrabold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                  <HelpCircle size={14} /> Cara Penggunaan:
                </h4>
                <ol className="text-xs text-slate-600 font-medium space-y-1.5 list-decimal list-inside pl-1">
                  <li>Unggah file Excel Anda.</li>
                  <li>Sistem akan menampilkan baris-baris data dari file tersebut.</li>
                  <li>Tentukan baris mana yang berisi judul kolom (Header Row).</li>
                  <li>Pilih Mode Geografis atau Mode Custom, petakan kolom, saring kriteria, lalu klik **Mulai Proses**.</li>
                </ol>
              </div>
            </div>
          </div>
        )}

        {/* State 2: Map Columns and Process */}
        {inspectResult && (
          <div className="p-3 sm:p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <FileSpreadsheet size={20} />
                </div>
                <div className="min-w-0">
                  <h3 className="font-extrabold text-slate-800 text-sm sm:text-base leading-tight truncate max-w-[250px] sm:max-w-md" title={file?.name}>{file?.name}</h3>
                  <p className="text-slate-400 text-[10px] font-semibold mt-0.5 uppercase tracking-wider">
                    {(file ? file.size / (1024 * 1024) : 0).toFixed(2)} MB &bull; {inspectResult.sheetNames.length} Sheets
                  </p>
                </div>
              </div>
              
              <button 
                onClick={resetAll}
                className="text-[10px] sm:text-xs font-bold text-slate-500 hover:text-rose-500 hover:bg-rose-50 px-3 py-1.5 rounded-xl border border-slate-200 hover:border-rose-100 transition-all shrink-0"
              >
                Ganti File Excel
              </button>
            </div>

            {/* Mode Selection Tabs */}
            <div className="flex border-b border-slate-200 mt-4">
              <button
                type="button"
                onClick={() => setMode('geografis')}
                className={`py-2.5 px-6 font-extrabold text-xs uppercase tracking-wider border-b-2 transition-all
                  ${mode === 'geografis' 
                    ? 'border-ppm-slate-light text-ppm-slate-light' 
                    : 'border-transparent text-slate-400 hover:text-slate-600'}
                `}
              >
                🌍 Rekap Geografis
              </button>
              <button
                type="button"
                onClick={() => setMode('manual')}
                className={`py-2.5 px-6 font-extrabold text-xs uppercase tracking-wider border-b-2 transition-all
                  ${mode === 'manual' 
                    ? 'border-ppm-slate-light text-ppm-slate-light' 
                    : 'border-transparent text-slate-400 hover:text-slate-600'}
                `}
              >
                ⚙️ Rekap Custom / Manual
              </button>
              <button
                type="button"
                onClick={() => setMode('komparasi')}
                className={`py-2.5 px-6 font-extrabold text-xs uppercase tracking-wider border-b-2 transition-all
                  ${mode === 'komparasi' 
                    ? 'border-ppm-slate-light text-ppm-slate-light' 
                    : 'border-transparent text-slate-400 hover:text-slate-600'}
                `}
              >
                📊 Komparasi RKPD / Renja
              </button>
            </div>

            {/* Config Grid */}
            <div className="grid grid-cols-12 gap-4 sm:gap-6 mt-4">
              {/* Left Settings Panel - col-span-3 (25% width on large screens) */}
              <div className="col-span-12 lg:col-span-3 space-y-4">
                
                {/* 1. Sheet selection */}
                <div className="bg-slate-50/50 rounded-xl p-4 border border-slate-100">
                  <label className="block text-[10px] font-extrabold text-slate-500 mb-2 uppercase tracking-wider">
                    Langkah 1: Pilih Sheet
                  </label>
                  <select
                    value={selectedSheet}
                    onChange={handleSheetChange}
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 font-bold text-slate-700 bg-white shadow-sm focus:border-ppm-slate-light focus:ring-1 focus:ring-ppm-slate-light focus:outline-none transition-all text-xs"
                  >
                    {inspectResult.sheetNames.map((name) => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                </div>

                {/* 2. Column mapping */}
                <div className="bg-slate-50/50 rounded-xl p-4 border border-slate-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                      Langkah 2: Konfigurasi Rekap
                    </label>
                    <span className="flex items-center gap-0.5 text-[8px] bg-indigo-50 text-indigo-700 font-extrabold px-1.5 py-0.5 rounded-full uppercase">
                      <Sliders size={8} /> MAPPING
                    </span>
                  </div>

                  {/* Perataan Baris Cerdas (Auto-Fill Down) Checkbox */}
                  <div className="pt-1 pb-2 border-b border-slate-200/60 mb-2">
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={fillDown}
                        onChange={(e) => handleToggleFillDown(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-300 text-ppm-slate-light focus:ring-ppm-slate-light focus:ring-1"
                      />
                      <span className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider group-hover:text-slate-800 transition-colors">
                        Isian Tangga (Fill Down)
                      </span>
                    </label>
                    <span className="text-[9px] text-slate-400 font-medium mt-1 block leading-tight">
                      💡 Aktifkan jika Excel berstruktur tangga agar baris kosong terisi otomatis dari baris atasnya.
                    </span>
                  </div>

                  {/* MODE A: GEOGRAFIS SETUP */}
                  {mode === 'geografis' && (
                    <div className="space-y-3">
                      {/* Provinsi mapping (Opsional) */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">
                          Kolom Provinsi <span className="text-slate-400 font-normal">(Opsional)</span>
                        </label>
                        <select
                          value={provColIdx}
                          onChange={(e) => setProvColIdx(parseInt(e.target.value, 10))}
                          className="w-full h-10 px-3 rounded-lg border border-slate-200 font-semibold text-slate-700 bg-white focus:border-ppm-slate-light focus:outline-none transition-all text-xs"
                        >
                          <option value={-1}>-- Gunakan default (Jawa Barat) --</option>
                          {inspectResult.previewRows[headerRowIdx]?.map((_, idx) => (
                            <option key={idx} value={idx}>
                              Kolom {idx + 1}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Kabupaten mapping (Opsional) */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">
                          Kolom Kabupaten / Kota <span className="text-slate-400 font-normal">(Opsional)</span>
                        </label>
                        <select
                          value={kabColIdx}
                          onChange={(e) => setKabColIdx(parseInt(e.target.value, 10))}
                          className="w-full h-10 px-3 rounded-lg border border-slate-200 font-semibold text-slate-700 bg-white focus:border-ppm-slate-light focus:outline-none transition-all text-xs"
                        >
                          <option value={-1}>-- Gunakan default (Kab. Bogor) --</option>
                          {inspectResult.previewRows[headerRowIdx]?.map((_, idx) => (
                            <option key={idx} value={idx}>
                              Kolom {idx + 1}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Kecamatan mapping */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">
                          Kolom Kecamatan
                        </label>
                        <select
                          value={kecColIdx}
                          onChange={(e) => setKecColIdx(parseInt(e.target.value, 10))}
                          className="w-full h-10 px-3 rounded-lg border border-slate-200 font-semibold text-slate-700 bg-white focus:border-ppm-slate-light focus:outline-none transition-all text-xs"
                        >
                          <option value={-1}>-- Lewati / Kosong --</option>
                          {inspectResult.previewRows[headerRowIdx]?.map((_, idx) => (
                            <option key={idx} value={idx}>
                              Kolom {idx + 1}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Desa mapping */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">
                          Kolom Desa / Kelurahan
                        </label>
                        <select
                          value={desaColIdx}
                          onChange={(e) => setDesaColIdx(parseInt(e.target.value, 10))}
                          className="w-full h-10 px-3 rounded-lg border border-slate-200 font-semibold text-slate-700 bg-white focus:border-ppm-slate-light focus:outline-none transition-all text-xs"
                        >
                          <option value={-1}>-- Lewati / Kosong --</option>
                          {inspectResult.previewRows[headerRowIdx]?.map((_, idx) => (
                            <option key={idx} value={idx}>
                              Kolom {idx + 1}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Alamat mapping */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">
                          Kolom Alamat (Sumber RT/RW)
                        </label>
                        <select
                          value={alamatColIdx}
                          onChange={(e) => setAlamatColIdx(parseInt(e.target.value, 10))}
                          className="w-full h-10 px-3 rounded-lg border border-slate-200 font-semibold text-slate-700 bg-white focus:border-ppm-slate-light focus:outline-none transition-all text-xs"
                        >
                          <option value={-1}>-- Lewati / Kosong --</option>
                          {inspectResult.previewRows[headerRowIdx]?.map((_, idx) => (
                            <option key={idx} value={idx}>
                              Kolom {idx + 1}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Objek Utama mapping */}
                      <div className="pt-2 border-t border-slate-200/60 mt-1">
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">
                          Kolom Objek Utama <span className="text-slate-400 font-normal">(Opsional)</span>
                        </label>
                        <select
                          value={objekColIdx}
                          onChange={(e) => setObjekColIdx(parseInt(e.target.value, 10))}
                          className="w-full h-10 px-3 rounded-lg border border-slate-200 font-semibold text-slate-700 bg-white focus:border-ppm-slate-light focus:outline-none transition-all text-xs mb-2"
                        >
                          <option value={-1}>-- Tanpa Objek Utama --</option>
                          {inspectResult.previewRows[headerRowIdx]?.map((val, idx) => (
                            <option key={idx} value={idx}>
                              Kolom {idx + 1} {val ? `(${val.toString().substring(0, 15)})` : ''}
                            </option>
                          ))}
                        </select>
                        <input
                          type="text"
                          value={objekValue}
                          onChange={(e) => setObjekValue(e.target.value)}
                          placeholder="Filter Nilai (misal: TBC / Stunting)"
                          className="w-full h-9 px-3 rounded-lg border border-slate-200 font-semibold text-slate-700 bg-white placeholder:text-slate-400 focus:border-ppm-slate-light focus:outline-none transition-all text-xs"
                        />
                      </div>

                      {/* Filter Kabupaten (Opsional) */}
                      <div className="pt-2 border-t border-slate-200/60">
                        <label className="block text-[10px] font-extrabold text-slate-500 mb-1 uppercase tracking-wider">
                          Filter Kabupaten / Kota <span className="text-slate-400 font-normal">(Opsional)</span>
                        </label>
                        <input
                          type="text"
                          value={filterKabupaten}
                          onChange={(e) => setFilterKabupaten(e.target.value)}
                          placeholder="Misal: KAB. BOGOR (Ketik)"
                          className="w-full h-10 px-3 rounded-lg border border-slate-200 font-semibold text-slate-700 bg-white placeholder:text-slate-400 focus:border-ppm-slate-light focus:outline-none transition-all text-xs"
                        />
                      </div>

                      {/* Warning mapping minimum */}
                      {!hasMinMapping && (
                        <p className="text-[9px] text-rose-500 font-bold leading-tight mt-1">
                          ⚠️ Harus memetakan minimal salah satu kolom geografis (Kecamatan, Desa, atau Alamat).
                        </p>
                      )}
                    </div>
                  )}

                  {/* MODE B: MANUAL/CUSTOM SETUP */}
                  {mode === 'manual' && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-2">
                          1. Pilih Kolom untuk Direkap:
                        </label>
                        <div className="max-h-[220px] overflow-y-auto space-y-1.5 border border-slate-200/60 p-2.5 rounded-lg bg-white">
                          {inspectResult.previewRows[headerRowIdx]?.map((val, idx) => (
                            <label 
                              key={idx} 
                              className={`flex items-center gap-2 p-2 rounded-md border text-xs font-semibold cursor-pointer transition-all
                                ${customGroupCols.includes(idx) 
                                  ? 'bg-indigo-50/50 border-indigo-200 text-indigo-700' 
                                  : 'bg-slate-50/50 border-slate-200/60 text-slate-600 hover:bg-slate-100/50'}
                              `}
                            >
                              <input
                                type="checkbox"
                                checked={customGroupCols.includes(idx)}
                                onChange={() => toggleColumnSelection(idx)}
                                className="w-3.5 h-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/20"
                              />
                              <span className="truncate max-w-[150px]">
                                {val ? val.toString() : `[Kolom ${idx + 1}]`}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* MODE C: KOMPARASI SETUP */}
                  {mode === 'komparasi' && (
                    <div className="space-y-4">
                      {/* File 1 Configuration */}
                      <div className="p-3 bg-slate-100/60 rounded-lg border border-slate-200/50 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black text-ppm-slate-light uppercase">File 1 (Baseline)</span>
                        </div>

                        {/* File 1 Info Card */}
                        {file && (
                          <div className="flex items-center justify-between bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
                            <div className="min-w-0 flex-1">
                              <p className="text-[10px] font-bold text-slate-700 truncate" title={file.name}>{file.name}</p>
                              <p className="text-[8px] text-slate-400">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                            </div>
                            <button
                              type="button"
                              onClick={resetAll}
                              className="text-[9px] font-bold text-rose-500 hover:bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100 shrink-0"
                            >
                              Ganti
                            </button>
                          </div>
                        )}
                        <div>
                          <label className="block text-[9px] font-bold text-slate-500 mb-1">Nama / Label File 1:</label>
                          <input
                            type="text"
                            value={label1}
                            onChange={(e) => setLabel1(e.target.value)}
                            className="w-full h-8 px-2.5 rounded-lg border border-slate-200 font-bold text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-ppm-slate-light text-[11px]"
                            placeholder="Contoh: RKPD Awal"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold text-slate-500 mb-1">Pilih Sheet:</label>
                          <select
                            value={selectedSheet}
                            onChange={handleSheetChange}
                            className="w-full h-8 px-2.5 rounded-lg border border-slate-200 font-semibold text-slate-700 bg-white focus:outline-none text-[11px]"
                          >
                            {inspectResult.sheetNames.map((name) => (
                              <option key={name} value={name}>{name}</option>
                            ))}
                          </select>
                        </div>
                        <label className="flex items-center gap-2 cursor-pointer pt-1">
                          <input
                            type="checkbox"
                            checked={fillDown}
                            onChange={(e) => setFillDown(e.target.checked)}
                            className="w-3.5 h-3.5 rounded border-slate-300 text-ppm-slate-light focus:ring-ppm-slate-light focus:ring-1"
                          />
                          <span className="text-[10px] font-bold text-slate-600">Isian Tangga (Fill Down)</span>
                        </label>
                      </div>

                      {/* Swap Button */}
                      <div className="flex justify-center -my-2 relative z-10">
                        <button
                          type="button"
                          onClick={handleSwapFiles}
                          className="h-8 px-4 bg-white hover:bg-slate-50 text-indigo-600 border border-slate-200 rounded-full shadow-sm text-[10px] font-bold flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                        >
                          <RefreshCw size={11} className="text-indigo-500" />
                          Tukar Posisi File
                        </button>
                      </div>

                      {/* File 2 Selection & Configuration */}
                      <div className="p-3 bg-indigo-50/20 rounded-lg border border-indigo-100/50 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black text-indigo-700 uppercase">File 2 (Pembanding)</span>
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold text-slate-500 mb-1">Nama / Label File 2:</label>
                          <input
                            type="text"
                            value={label2}
                            onChange={(e) => setLabel2(e.target.value)}
                            className="w-full h-8 px-2.5 rounded-lg border border-slate-200 font-bold text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400 text-[11px]"
                            placeholder="Contoh: RKPD Baru"
                          />
                        </div>
                        
                        {/* File 2 Input */}
                        <div>
                          <input
                            type="file"
                            ref={fileInputRef2}
                            onChange={handleFileChange2}
                            accept=".xlsx, .xls"
                            className="hidden"
                          />
                          {!file2 ? (
                            <button
                              type="button"
                              onClick={() => fileInputRef2.current?.click()}
                              className="w-full py-3 px-2 border-2 border-dashed border-indigo-200 hover:border-indigo-400 bg-white rounded-lg text-center flex flex-col items-center justify-center gap-1 transition-all group cursor-pointer"
                            >
                              <Upload size={18} className="text-indigo-400 group-hover:scale-110 transition-transform" />
                              <span className="text-[10px] font-black text-indigo-600 uppercase tracking-wider">Unggah File 2</span>
                              <span className="text-[8px] font-medium text-slate-400">Pilih berkas pembanding kedua</span>
                            </button>
                          ) : (
                            <div className="space-y-2">
                              <div className="flex items-center justify-between bg-white p-2 rounded-lg border border-indigo-100 shadow-sm">
                                <div className="min-w-0 flex-1">
                                  <p className="text-[10px] font-bold text-slate-700 truncate" title={file2.name}>{file2.name}</p>
                                  <p className="text-[8px] text-slate-400">{(file2.size / (1024 * 1024)).toFixed(2)} MB</p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setFile2(null);
                                    setTempFileName2('');
                                    setInspectResult2(null);
                                  }}
                                  className="text-[9px] font-bold text-rose-500 hover:bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100 shrink-0"
                                >
                                  Ganti
                                </button>
                              </div>

                              {inspecting2 && (
                                <div className="flex items-center justify-center py-2 text-indigo-600 gap-1.5">
                                  <Loader2 size={12} className="animate-spin" />
                                  <span className="text-[9px] font-bold">Membaca berkas kedua...</span>
                                </div>
                              )}

                              {inspectResult2 && (
                                <>
                                  <div>
                                    <label className="block text-[9px] font-bold text-slate-500 mb-1">Pilih Sheet:</label>
                                    <select
                                      value={selectedSheet2}
                                      onChange={handleSheetChange2}
                                      className="w-full h-8 px-2.5 rounded-lg border border-slate-200 font-semibold text-slate-700 bg-white focus:outline-none text-[11px]"
                                    >
                                      {inspectResult2.sheetNames.map((name) => (
                                        <option key={name} value={name}>{name}</option>
                                      ))}
                                    </select>
                                  </div>
                                  <label className="flex items-center gap-2 cursor-pointer pt-1">
                                    <input
                                      type="checkbox"
                                      checked={fillDown2}
                                      onChange={(e) => setFillDown2(e.target.checked)}
                                      className="w-3.5 h-3.5 rounded border-slate-300 text-ppm-slate-light focus:ring-ppm-slate-light focus:ring-1"
                                    />
                                    <span className="text-[10px] font-bold text-slate-600">Isian Tangga (Fill Down)</span>
                                  </label>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Optional Filtering Block (reusing manual mode style) */}
                      <div className="pt-2 border-t border-slate-200/60 mt-1">
                        <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-2">
                          Pilih Kolom untuk Difilter (Opsional):
                        </label>
                        <div className="max-h-[220px] overflow-y-auto space-y-1.5 border border-slate-200/60 p-2.5 rounded-lg bg-white">
                          {inspectResult.previewRows[headerRowIdx]?.map((val, idx) => (
                            <label 
                              key={idx} 
                              className={`flex items-center gap-2 p-2 rounded-md border text-xs font-semibold cursor-pointer transition-all
                                ${customGroupCols.includes(idx) 
                                  ? 'bg-indigo-50/50 border-indigo-200 text-indigo-700' 
                                  : 'bg-slate-50/50 border-slate-200/60 text-slate-600 hover:bg-slate-100/50'}
                              `}
                            >
                              <input
                                type="checkbox"
                                checked={customGroupCols.includes(idx)}
                                onChange={() => toggleColumnSelection(idx)}
                                className="w-3.5 h-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/20"
                              />
                              <span className="truncate max-w-[150px]">
                                {val ? val.toString() : `[Kolom ${idx + 1}]`}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 3. Save as template configuration */}
                {mode !== 'komparasi' && (
                  <div className="bg-slate-50/50 rounded-xl p-4 border border-slate-100 space-y-2">
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                      Simpan Template
                    </label>
                    <input
                      type="text"
                      value={newTemplateName}
                      onChange={(e) => setNewTemplateName(e.target.value)}
                      placeholder="Nama Template Baru"
                      className="w-full h-10 px-3 rounded-lg border border-slate-200 font-semibold text-slate-700 bg-white placeholder:text-slate-400 focus:border-ppm-slate-light focus:outline-none transition-all text-xs"
                    />
                    <button
                      type="button"
                      onClick={handleSaveTemplate}
                      disabled={savingTemplate || !newTemplateName.trim()}
                      className="w-full h-9 bg-slate-800 text-white font-bold text-xs rounded-lg hover:bg-slate-900 active:scale-95 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:pointer-events-none"
                    >
                      {savingTemplate ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                      Simpan Konfigurasi
                    </button>
                  </div>
                )}
              </div>

              {/* Right Preview Panel - col-span-9 (75% width on large screens) */}
              <div className="col-span-12 lg:col-span-9 flex flex-col space-y-4">
                
                {/* Manual Mode Layout - Shows Selected Columns, Drag & Drop sorting and cascading checklists */}
                {(mode === 'manual' || mode === 'komparasi') && customGroupCols.length > 0 && (
                  <div className="bg-slate-50/50 border border-slate-200/50 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                      <span>2. Urutan Hierarki & Penyaringan Nilai Berjenjang:</span>
                      <span className="text-slate-400 lowercase font-medium flex items-center gap-1"><Move size={12} /> seret & letakkan kotak untuk mengurutkan</span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {customGroupCols.map((colIdx, index) => {
                        const colName = inspectResult.previewRows[headerRowIdx]?.[colIdx] || `Kolom ${colIdx + 1}`;
                        const uniqueVals = columnUniqueValues[colIdx] || [];
                        const checkedFilters = customGroupFilters[colIdx] || [];
                        const isFetching = fetchingUniqueValues[colIdx];
                        const isOver = dragOverIndex === index;

                        const searchQuery = (filterSearchQueries[colIdx] || '').toLowerCase().trim();
                        const filteredVals = uniqueVals.filter(val => {
                          const valStr = val === '' ? '(kosong)' : val.toLowerCase();
                          return valStr.includes(searchQuery);
                        });

                        return (
                          <div 
                            key={colIdx} 
                            draggable={!isFetching}
                            onDragStart={(e) => handleDragStart(e, index)}
                            onDragOver={(e) => handleDragOver(e, index)}
                            onDrop={(e) => handleDrop(e, index)}
                            onDragEnd={handleDragEnd}
                            className={`bg-white rounded-xl border shadow-sm overflow-hidden flex flex-col h-[280px] cursor-grab active:cursor-grabbing transition-all duration-200
                              ${isOver ? 'border-2 border-indigo-400 bg-indigo-50/10 scale-[1.03] shadow-md shadow-indigo-100' : 'border-slate-200'}
                              ${draggedIndex === index ? 'opacity-40 border-dashed' : ''}
                            `}
                          >
                            {/* Card Header with controls */}
                            <div className="bg-slate-50/80 px-3 py-2 border-b border-slate-200 flex items-center justify-between shrink-0">
                              <span className="text-xs font-black text-slate-700 truncate max-w-[120px] flex items-center gap-1.5" title={colName.toString()}>
                                <Move size={10} className="text-slate-400 shrink-0" />
                                {index + 1}. {colName.toString()}
                              </span>
                              
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => moveColumn(index, 'up')}
                                  disabled={index === 0}
                                  className="p-1 rounded hover:bg-slate-200 text-slate-500 disabled:opacity-30 disabled:hover:bg-transparent"
                                  title="Pindahkan Ke Atas"
                                >
                                  <ChevronUp size={14} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => moveColumn(index, 'down')}
                                  disabled={index === customGroupCols.length - 1}
                                  className="p-1 rounded hover:bg-slate-200 text-slate-500 disabled:opacity-30 disabled:hover:bg-transparent"
                                  title="Pindahkan Ke Bawah"
                                >
                                  <ChevronDown size={14} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => toggleColumnSelection(colIdx)}
                                  className="p-1 rounded hover:bg-rose-50 text-rose-500"
                                  title="Hapus Kolom"
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            </div>

                            {/* Card Body - Values Filter checklist */}
                            <div className="p-3 flex-1 flex flex-col overflow-hidden">
                              <div className="flex items-center justify-between text-[10px] font-extrabold text-slate-400 mb-1.5 uppercase tracking-wide shrink-0">
                                <span className="flex items-center gap-1"><Filter size={10} /> Saring Kriteria ({checkedFilters.length}/{uniqueVals.length})</span>
                              </div>

                              {isFetching ? (
                                <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                                  <Loader2 size={16} className="animate-spin text-ppm-slate-light mb-1" />
                                  <span className="text-[9px] font-bold">Menyesuaikan pilihan...</span>
                                </div>
                              ) : uniqueVals.length === 0 ? (
                                <div className="flex-1 flex items-center justify-center text-[10px] text-slate-400 font-medium text-center leading-relaxed">
                                  Tidak ada pilihan (Kolom sebelumnya kosong/belum dicentang)
                                </div>
                              ) : (
                                <div className="flex-1 flex flex-col overflow-hidden">
                                  {/* Input Pencarian Nilai */}
                                  <input
                                    type="text"
                                    value={filterSearchQueries[colIdx] || ''}
                                    onChange={(e) => setFilterSearchQueries(prev => ({ ...prev, [colIdx]: e.target.value }))}
                                    placeholder="Cari kriteria..."
                                    className="w-full h-8 px-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-ppm-slate-light focus:ring-1 focus:ring-ppm-slate-light text-[10px] font-semibold mb-2 shrink-0 bg-slate-50/50 placeholder:text-slate-400 transition-all text-slate-700"
                                  />

                                  {/* Select All / Clear buttons */}
                                  <div className="flex gap-2 mb-2 shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => updateFiltersForCol(colIdx, Array.from(new Set([...checkedFilters, ...filteredVals])))}
                                      className="text-[9px] font-bold text-ppm-slate-light hover:underline flex items-center gap-0.5"
                                    >
                                      Semua Terlihat
                                    </button>
                                    <span className="text-slate-300 text-[9px] font-bold">|</span>
                                    <button
                                      type="button"
                                      onClick={() => updateFiltersForCol(colIdx, [])}
                                      className="text-[9px] font-bold text-rose-500 hover:underline flex items-center gap-0.5"
                                    >
                                      Kosongkan
                                    </button>
                                  </div>
                                  
                                  {/* Checklist items */}
                                  <div className="flex-1 overflow-y-auto space-y-1 pr-1 border border-slate-100 rounded-lg p-1.5 bg-slate-50/50">
                                    {filteredVals.map(val => {
                                      const isChecked = checkedFilters.includes(val);
                                      const displayVal = val === '' ? '(Kosong)' : val;
                                      return (
                                        <label 
                                          key={val} 
                                          className={`flex items-center gap-1.5 p-1 rounded text-[10px] font-semibold cursor-pointer transition-all
                                            ${isChecked ? 'bg-white text-slate-700 shadow-sm border border-slate-100' : 'text-slate-400 hover:text-slate-600'}
                                          `}
                                        >
                                          <input
                                            type="checkbox"
                                            checked={isChecked}
                                            onChange={(e) => {
                                              let nextChecked = [];
                                              if (e.target.checked) {
                                                nextChecked = [...checkedFilters, val];
                                              } else {
                                                nextChecked = checkedFilters.filter(v => v !== val);
                                              }
                                              updateFiltersForCol(colIdx, nextChecked);
                                            }}
                                            className="w-3 h-3 rounded border-slate-300 text-ppm-slate-light focus:ring-ppm-slate-light"
                                          />
                                          <span className="truncate" title={displayVal}>{displayVal}</span>
                                        </label>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Steps 3: Selected header row and Grid preview */}
                <div className="flex flex-col space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                      {mode === 'komparasi' ? 'Langkah 3: Pilih Baris Header & Preview File 1 / File 2' : 'Langkah 3: Pilih Baris Header & Preview Data'}
                    </label>
                    <span className="text-[10px] font-bold text-slate-400">
                      Menampilkan 40 baris pertama
                    </span>
                  </div>

                  {mode === 'komparasi' && inspectResult2 && (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setActivePreviewTab('file1')}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wider border transition-all
                          ${activePreviewTab === 'file1'
                            ? 'bg-ppm-slate-light text-white border-ppm-slate-light'
                            : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}
                        `}
                      >
                        📂 {label1} (File 1)
                      </button>
                      <button
                        type="button"
                        onClick={() => setActivePreviewTab('file2')}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wider border transition-all
                          ${activePreviewTab === 'file2'
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}
                        `}
                      >
                        📂 {label2} (File 2)
                      </button>
                    </div>
                  )}

                  <div className="bg-slate-50/50 border border-slate-200/50 rounded-xl p-3 sm:p-4 flex-1 flex flex-col overflow-hidden max-h-[700px]">
                    <p className="text-[10px] sm:text-xs font-semibold text-slate-500 mb-2 bg-white p-2 rounded-xl border border-slate-100 shadow-sm">
                      💡 <strong>Tips:</strong> Klik pada salah satu baris tabel di bawah untuk menetapkannya sebagai <strong>Header (Nama Kolom)</strong>. Baris di atas header akan dilewati, dan data di bawahnya akan direkap.
                    </p>
                    
                    <div className="overflow-auto border border-slate-200/60 rounded-xl bg-white flex-1 relative max-h-[500px]">
                      {(!inspectResult2 && mode === 'komparasi') ? (
                        <div className="p-8 text-center flex flex-col items-center justify-center min-h-[300px]">
                          <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3">
                            <Upload size={24} />
                          </div>
                          <h4 className="text-sm font-bold text-slate-700 mb-1">Unggah {label2} untuk Komparasi</h4>
                          <p className="text-xs text-slate-400 max-w-md">
                            Silakan unggah file pembanding kedua ({label2}) di panel kiri untuk membandingkan pergeseran pagu, item belanja baru, dan item belanja dihapus.
                          </p>
                        </div>
                      ) : (activePreviewTab === 'file1' || mode !== 'komparasi') ? (
                        <table className="w-full text-xs text-left min-w-[1000px] border-collapse">
                          <thead className="sticky top-0 bg-slate-100 z-10">
                            <tr className="border-b border-slate-200 font-extrabold text-slate-500">
                              <th className="p-3 w-16 text-center bg-slate-200/80">Baris</th>
                              {inspectResult.previewRows[0]?.map((_, colIdx) => (
                                <th key={colIdx} className="p-3 font-extrabold min-w-[140px] text-center border-l border-slate-200/40">
                                  Kolom {colIdx + 1}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {inspectResult.previewRows.map((row, rowIdx) => {
                              const isHeader = headerRowIdx === rowIdx;
                              const isBeforeHeader = rowIdx < headerRowIdx;
                              
                              return (
                                <tr 
                                  key={rowIdx} 
                                  onClick={() => setHeaderRowIdx(rowIdx)}
                                  className={`cursor-pointer transition-all duration-200 group
                                    ${isHeader ? 'bg-ppm-slate-light/10 hover:bg-ppm-slate-light/15 font-bold text-ppm-slate-light border-y border-ppm-slate-light/30' : ''}
                                    ${isBeforeHeader ? 'bg-slate-50/50 text-slate-300 hover:bg-slate-100/50' : 'text-slate-600 hover:bg-slate-50'}
                                  `}
                                >
                                  <td className={`p-3 text-center font-bold text-[10px] transition-colors
                                    ${isHeader ? 'bg-ppm-slate-light text-white' : 'bg-slate-50 text-slate-400 group-hover:bg-slate-100'}
                                  `}>
                                    #{rowIdx + 1}
                                    {isHeader && <span className="block text-[8px] font-black tracking-widest mt-0.5 uppercase">HEADER</span>}
                                    {isBeforeHeader && <span className="block text-[8px] font-medium tracking-tight text-slate-400 mt-0.5">SKIP</span>}
                                  </td>
                                  {row.map((cell, colIdx) => (
                                    <td 
                                      key={colIdx} 
                                      className={`p-3 border-l border-slate-100 font-medium truncate max-w-[220px] text-center
                                        ${(colIdx === provColIdx && mode === 'geografis' && !isBeforeHeader) ? 'bg-blue-50/30 font-bold' : ''}
                                        ${(colIdx === kabColIdx && mode === 'geografis' && !isBeforeHeader) ? 'bg-cyan-50/30 font-bold' : ''}
                                        ${(colIdx === kecColIdx && mode === 'geografis' && !isBeforeHeader) ? 'bg-indigo-50/30 font-bold' : ''}
                                        ${(colIdx === desaColIdx && mode === 'geografis' && !isBeforeHeader) ? 'bg-emerald-50/30 font-bold' : ''}
                                        ${(colIdx === alamatColIdx && mode === 'geografis' && !isBeforeHeader) ? 'bg-amber-50/30 font-bold' : ''}
                                        ${(colIdx === objekColIdx && mode === 'geografis' && !isBeforeHeader) ? 'bg-purple-50/30 font-bold border-x border-purple-200/50' : ''}
                                        ${(customGroupCols.includes(colIdx) && mode === 'manual' && !isBeforeHeader) ? 'bg-indigo-50/30 font-bold' : ''}
                                      `}
                                      title={cell ? cell.toString() : ''}
                                    >
                                      {cell !== '' && cell !== null && cell !== undefined ? cell.toString() : '-'}
                                    </td>
                                  ))}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      ) : (
                        inspectResult2 && (
                          <table className="w-full text-xs text-left min-w-[1000px] border-collapse">
                            <thead className="sticky top-0 bg-indigo-50 z-10">
                              <tr className="border-b border-indigo-200 font-extrabold text-indigo-700">
                                <th className="p-3 w-16 text-center bg-indigo-100/80">Baris</th>
                                {inspectResult2.previewRows[0]?.map((_, colIdx) => (
                                  <th key={colIdx} className="p-3 font-extrabold min-w-[140px] text-center border-l border-indigo-200/40">
                                    Kolom {colIdx + 1}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {inspectResult2.previewRows.map((row, rowIdx) => {
                                const isHeader = headerRowIdx2 === rowIdx;
                                const isBeforeHeader = rowIdx < headerRowIdx2;
                                
                                return (
                                  <tr 
                                    key={rowIdx} 
                                    onClick={() => setHeaderRowIdx2(rowIdx)}
                                    className={`cursor-pointer transition-all duration-200 group
                                      ${isHeader ? 'bg-indigo-50 hover:bg-indigo-100/50 font-bold text-indigo-700 border-y border-indigo-200' : ''}
                                      ${isBeforeHeader ? 'bg-slate-50/50 text-slate-300 hover:bg-slate-100/50' : 'text-slate-600 hover:bg-slate-50'}
                                    `}
                                  >
                                    <td className={`p-3 text-center font-bold text-[10px] transition-colors
                                      ${isHeader ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-slate-400 group-hover:bg-slate-100'}
                                    `}>
                                      #{rowIdx + 1}
                                      {isHeader && <span className="block text-[8px] font-black tracking-widest mt-0.5 uppercase">HEADER</span>}
                                      {isBeforeHeader && <span className="block text-[8px] font-medium tracking-tight text-slate-400 mt-0.5">SKIP</span>}
                                    </td>
                                    {row.map((cell, colIdx) => (
                                      <td 
                                        key={colIdx} 
                                        className="p-3 border-l border-slate-100 font-medium truncate max-w-[220px] text-center text-slate-600"
                                        title={cell ? cell.toString() : ''}
                                      >
                                        {cell !== '' && cell !== null && cell !== undefined ? cell.toString() : '-'}
                                      </td>
                                    ))}
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        )
                      )}
                    </div>

                    {/* Colors Legend */}
                    {mode === 'geografis' ? (
                      <div className="flex flex-wrap gap-3 mt-2.5 text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wide px-1">
                        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-blue-50 border border-blue-200 rounded-sm"></span> Provinsi</span>
                        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-cyan-50 border border-cyan-200 rounded-sm"></span> Kab/Kota</span>
                        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-indigo-50 border border-indigo-200 rounded-sm"></span> Kecamatan</span>
                        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-emerald-50 border border-emerald-200 rounded-sm"></span> Desa</span>
                        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-amber-50 border border-amber-200 rounded-sm"></span> Alamat</span>
                        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-purple-50 border border-purple-200 rounded-sm"></span> Objek Utama</span>
                      </div>
                    ) : mode === 'manual' ? (
                      <div className="flex flex-wrap gap-3 mt-2.5 text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wide px-1">
                        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-indigo-50 border border-indigo-200 rounded-sm"></span> Kolom Grouping Pilihan</span>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-3 mt-2.5 text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wide px-1">
                        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-emerald-50 border border-emerald-200 rounded-sm"></span> RKPD Awal (File 1)</span>
                        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-indigo-50 border border-indigo-200 rounded-sm"></span> RKPD Baru (File 2)</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Error or Success notification */}
            {status.type && (
              <div className={`mt-4 p-4 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-300
                ${status.type === 'success' ? 'bg-emerald-50 border border-emerald-100 text-emerald-800' : 'bg-rose-50 border border-rose-100 text-rose-800'}
              `}>
                <div className="shrink-0 mt-0.5">
                  {status.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                </div>
                <div className="flex-1">
                  <p className="text-[10px] font-black uppercase tracking-wider mb-0.5">{status.type === 'success' ? 'Berhasil' : 'Kesalahan'}</p>
                  <p className="text-xs font-bold opacity-90 leading-relaxed">{status.message}</p>
                </div>
                <button onClick={() => setStatus({ type: null, message: '' })} className="shrink-0 opacity-40 hover:opacity-100 p-1 text-sm font-black">
                  &times;
                </button>
              </div>
            )}

            {/* Action buttons */}
            <div className="mt-4 pt-4 border-t border-slate-100 flex gap-4">
              <button
                onClick={handleProcess}
                disabled={loading || (mode === 'geografis' ? !hasMinMapping : mode === 'manual' ? customGroupCols.length === 0 : !tempFileName2)}
                className="flex-1 h-12 sm:h-14 rounded-xl font-black text-sm sm:text-base flex items-center justify-center gap-2 bg-ppm-slate-light text-white hover:brightness-90 hover:-translate-y-1 active:translate-y-0 active:scale-[0.98] transition-all shadow-lg shadow-slate-200/50 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none disabled:transform-none disabled:shadow-none"
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>Sedang Mengolah Data...</span>
                  </>
                ) : (
                  <>
                    <Download size={18} strokeWidth={2.5} />
                    <span>{mode === 'komparasi' ? 'Mulai Komparasi & Unduh Hasil' : 'Proses & Unduh Rekap Excel'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Library Selection Modal */}
      {showLibraryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-100 flex flex-col overflow-hidden max-h-[85vh] animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-slate-800 text-base flex items-center gap-2">
                  <FolderOpen size={18} className="text-ppm-slate-light" />
                  Perpustakaan Dokumen Excel
                </h3>
                <p className="text-slate-400 text-xs mt-0.5">
                  Pilih salah satu berkas perencanaan Excel yang sudah diunggah sebelumnya.
                </p>
              </div>
              <button 
                onClick={() => setShowLibraryModal(false)}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 flex items-center justify-center transition-all"
              >
                <X size={18} />
              </button>
            </div>

            {/* Search Input */}
            <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50">
              <div className="relative">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari nama berkas atau pengunggah..."
                  value={librarySearchQuery}
                  onChange={(e) => setLibrarySearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-xs font-semibold rounded-2xl border border-slate-200 focus:border-ppm-slate-light focus:ring-1 focus:ring-ppm-slate-light outline-none bg-white transition-all"
                />
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3 min-h-[250px]">
              {loadingLibrary ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                  <Loader2 className="animate-spin mb-3 text-ppm-slate-light" size={28} />
                  <span className="text-xs font-semibold">Memuat dokumen perpustakaan...</span>
                </div>
              ) : libraryDocs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                  <FileSpreadsheet className="mb-3 text-slate-300" size={40} />
                  <span className="text-xs font-semibold">Belum ada berkas Excel terunggah di perpustakaan.</span>
                </div>
              ) : filteredLibraryDocs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                  <FileSpreadsheet className="mb-3 text-slate-300" size={40} />
                  <span className="text-xs font-semibold">Tidak ditemukan berkas Excel yang cocok dengan pencarian.</span>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredLibraryDocs.map((doc) => (
                    <div 
                      key={doc.id}
                      onClick={() => handleSelectLibraryDoc(doc)}
                      className="p-3.5 rounded-xl border border-slate-100 hover:border-ppm-slate-light/20 hover:bg-ppm-slate-light/5 flex items-center gap-3.5 cursor-pointer group transition-all"
                    >
                      <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <FileSpreadsheet size={20} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-extrabold text-slate-700 text-xs sm:text-sm truncate group-hover:text-ppm-slate-light transition-colors">
                          {doc.nama_file}
                        </h4>
                        <div className="flex flex-wrap items-center gap-x-2 text-[10px] text-slate-400 font-semibold mt-1 uppercase">
                          <span>
                            {(doc.ukuran ? doc.ukuran / (1024 * 1024) : 0).toFixed(2)} MB
                          </span>
                          <span>&bull;</span>
                          <span>
                            {new Date(doc.uploaded_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                          {doc.uploader_nama && (
                            <>
                              <span>&bull;</span>
                              <span className="truncate max-w-[120px]">{doc.uploader_nama}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OlahData;
