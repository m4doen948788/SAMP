import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '@/src/services/api';
import { 
  FileSpreadsheet, 
  Plus, 
  Trash2, 
  Search, 
  Loader2, 
  Download, 
  Eye, 
  ShieldCheck, 
  Lock, 
  Edit2, 
  Save, 
  X,
  RefreshCw,
  BarChart3,
  ChevronDown,
  TrendingUp,
  Tag
} from 'lucide-react';
import { useAuth } from '@/src/contexts/AuthContext';
import { BapperidaCurvesHeader, BapperidaSymbol } from '@/src/components/shared/BapperidaBrand';

interface MacroIndicator {
  id: number;
  kode: string;
  nama_data: string;
  tematik_id: number | null;
  tematik_ids?: number[];
  sumber_data: string | null;
  satuan_id: number | null;
  urutan: number;
  is_active: number;
  parent_id: number | null;
  tematik_nama?: string;
  satuan_nama?: string;
  nilai: Record<string, string>; 
  nilai_meta?: Record<string, {
    nilai: string;
    updated_at?: string;
    updated_by?: number | null;
    updated_by_nama?: string | null;
  }>;
  assigned_pegawai_ids?: number[];
  assigned_pegawai_names?: string[];
}

interface Satuan {
  id: number;
  satuan: string;
}

interface Tematik {
  id: number;
  nama: string;
}

export const DataMakro: React.FC = () => {
  const { user } = useAuth();
  const userProfilId = user?.profil_pegawai_id; 
  const userRoleId = Number(user?.tipe_user_id || 0);
  const userRoleName = (user?.tipe_user_nama || '').toLowerCase();
  const userJabatanName = (user?.jabatan_nama || '').toLowerCase();
  const userBidangName = (user?.bidang_nama || '').toLowerCase();
  const userBidangSingkatan = (user?.bidang_singkatan || '').toLowerCase();

  // Akses mengubah data makro:
  // 1. Admin Instansi: Superadmin, Admin Instansi, Superadmin instansi, Admin Bapperida
  const isAdminInstansi = [1, 2, 7, 8].includes(userRoleId) || userRoleName.includes('admin');

  // 2. Kepala Badan: Role Kepala Badan Bapperida (ID 5) / Jabatan Kepala Badan
  const isKepalaBadan = userRoleId === 5 || 
    userRoleName.includes('kepala badan') || 
    userJabatanName.includes('kepala badan') ||
    (userJabatanName === 'kepala' && (Number(user?.instansi_id) === 2 || (user?.instansi_nama || '').toLowerCase().includes('bapperida')));

  // 3. Sekretariat Badan: Bidang Sekretariat / Jabatan Sekretaris
  const isSekretariatBadan = userBidangName.includes('sekretariat') || 
    userBidangSingkatan.includes('sekret') || 
    userJabatanName.includes('sekretaris');

  // Global authorized editor
  const isGlobalMacroEditor = isAdminInstansi || isKepalaBadan || isSekretariatBadan;

  // View & Control States
  const [viewMode, setViewMode] = useState<'target' | 'realisasi'>('realisasi');
  const [searchTerm, setSearchTerm] = useState('');

  // Period / Year Configuration
  const currentYear = useMemo(() => new Date().getFullYear(), []);
  const [periodPreset, setPeriodPreset] = useState<'rpjmd' | 'all'>('rpjmd');
  
  const { startYear, endYear } = useMemo(() => {
    if (periodPreset === 'rpjmd') {
      return { startYear: 2025, endYear: 2030 };
    }
    // 'all'
    if (viewMode === 'realisasi') {
      return { startYear: 2017, endYear: currentYear };
    } else {
      return { startYear: 2017, endYear: 2030 };
    }
  }, [periodPreset, viewMode, currentYear]);

  const years = useMemo(() => {
    return Array.from({ length: endYear - startYear + 1 }, (_, i) => startYear + i);
  }, [startYear, endYear]);

  // Data & Control States
  const [data, setData] = useState<MacroIndicator[]>([]);
  const [tematiks, setTematiks] = useState<Tematik[]>([]);
  const [satuans, setSatuans] = useState<Satuan[]>([]);
  const [otoritasList, setOtoritasList] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  
  // Row Editing
  const [editingRowId, setEditingRowId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState<MacroIndicator | null>(null);
  const [openTematikPopoverId, setOpenTematikPopoverId] = useState<number | null>(null);

  const fetchData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);

    try {
      const [dataRes, tematikRes, satuanRes, otoRes] = await Promise.all([
        api.dataMakro.getWithNilai(startYear, endYear),
        api.tematik.getAll(),
        api.satuan.getAll(),
        api.dataMakro.getOtoritas()
      ]);

      if (dataRes.success) setData(dataRes.data);
      if (tematikRes.success) setTematiks(tematikRes.data);
      if (satuanRes.success) setSatuans(satuanRes.data);
      if (otoRes.success) setOtoritasList(otoRes.data.map((o: any) => o.profil_pegawai_id));
    } catch (err) {
      console.error('Failed to fetch data makro:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [startYear, endYear]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Authorization Logic: Akses mengubah data makro hanya bisa:
  // 1. Yang ditugaskan
  // 2. Admin instansi
  // 3. Sekretariat badan
  // 4. Kepala badan
  const isAuthorizedToAdd = useMemo(() => {
    if (isGlobalMacroEditor) return true;
    return otoritasList.includes(userProfilId || 0);
  }, [isGlobalMacroEditor, otoritasList, userProfilId]);

  const canEditIndicator = (row: MacroIndicator) => {
    return isAuthorizedToAdd;
  };

  const canEditValue = (row: MacroIndicator) => {
    if (isGlobalMacroEditor) return true;
    return !!row.assigned_pegawai_ids?.includes(userProfilId || 0);
  };

  // Row Edit Handlers
  const handleEditClick = (row: MacroIndicator) => {
    setEditingRowId(row.id);
    setEditDraft(JSON.parse(JSON.stringify(row)));
  };

  const handleCancelEdit = () => {
    setEditingRowId(null);
    setEditDraft(null);
    setOpenTematikPopoverId(null);
  };

  const handleSaveRow = async () => {
    if (!editDraft || !editingRowId) return;
    const original = data.find(d => d.id === editingRowId);
    if (!original) return;

    setSaving(`row-${editingRowId}`);
    try {
      const promises = [];
      
      const metaChanged = ['nama_data', 'kode', 'tematik_id', 'tematik_ids', 'sumber_data', 'satuan_id'].some(
        k => (editDraft as Record<string, any>)[k] !== (original as Record<string, any>)[k]
      );
      if (metaChanged) {
        promises.push(api.dataMakro.update(editingRowId, editDraft));
      }

      for (const key of Object.keys(editDraft.nilai)) {
        if (editDraft.nilai[key] !== original.nilai[key]) {
          const [tahun, tipe] = key.split('_');
          promises.push(api.dataMakro.upsertNilai({
            data_makro_id: editingRowId,
            tahun: parseInt(tahun),
            tipe,
            nilai: editDraft.nilai[key]
          }));
        }
      }

      if (promises.length > 0) {
        await Promise.all(promises);
        fetchData(true);
      }
      
      setEditingRowId(null);
      setEditDraft(null);
      setOpenTematikPopoverId(null);
    } catch (err) {
      console.error('Save failed:', err);
    } finally {
      setSaving(null);
    }
  };

  const handleDraftUpdate = (field: string, value: any) => {
    if (!editDraft) return;
    setEditDraft({ ...editDraft, [field]: value });
  };

  const handleDraftNilaiUpdate = (tahun: number, value: string) => {
    if (!editDraft) return;
    setEditDraft({
      ...editDraft,
      nilai: {
        ...editDraft.nilai,
        [`${tahun}_${viewMode}`]: value
      }
    });
  };

  const handleAddRow = async () => {
    if (!isAuthorizedToAdd) return;
    const newRow = {
      nama_data: 'Indikator Baru...',
      kode: '',
      tematik_id: null,
      sumber_data: 'BPS',
      satuan_id: null,
      urutan: data.length + 1,
      is_active: 1
    };

    try {
      const res = await api.dataMakro.create(newRow);
      if (res.success) {
        await fetchData(true);
        if (res.data?.id) {
          handleEditClick(res.data);
        }
      }
    } catch (err) {
      console.error('Add row failed:', err);
    }
  };

  const handleDeleteRow = async (id: number) => {
    const row = data.find(d => d.id === id);
    if (!row || !canEditIndicator(row) || !confirm('Hapus baris data makro ini dari spreadsheet?')) return;
    try {
      const res = await api.dataMakro.delete(id);
      if (res.success) fetchData(true);
    } catch (err) {
      console.error('Delete row failed:', err);
    }
  };

  // Filter Data
  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return data;
    const q = searchTerm.toLowerCase();
    return data.filter(d => 
      d.nama_data.toLowerCase().includes(q) ||
      (d.kode && d.kode.toLowerCase().includes(q)) ||
      (d.tematik_nama && d.tematik_nama.toLowerCase().includes(q)) ||
      (d.sumber_data && d.sumber_data.toLowerCase().includes(q))
    );
  }, [data, searchTerm]);

  // Export Spreadsheet CSV
  const handleExportCSV = () => {
    if (data.length === 0) return;
    const header = ['No', 'Indikator Makro', 'Tagging Tematik', 'Sumber Data', 'Satuan', ...years.map(y => `${y} (${viewMode})`)];
    const rows = filteredData.map((ind, idx) => {
      const vals = years.map(y => ind.nilai[`${y}_${viewMode}`] || '');
      return [
        idx + 1,
        `"${ind.nama_data.replace(/"/g, '""')}"`,
        `"${ind.tematik_nama || ''}"`,
        `"${ind.sumber_data || ''}"`,
        `"${ind.satuan_nama || ''}"`,
        ...vals.map(v => `"${v}"`)
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [header.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Data_Makro_Kabupaten_Bogor_${viewMode}_${startYear}-${endYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-full">
      {/* 1. SPREADSHEET APPLICATION WINDOW CONTAINER - FIXED FULL HEIGHT TO PREVENT PAGE SCROLL */}
      <div className="bg-white border border-slate-300 shadow-sm flex flex-col h-[calc(100vh-130px)] min-h-[520px] rounded-none overflow-hidden">
        
        {/* TOP RIBBON HEADER - SHARP EDGES, MULTI-COLOR GRADIENT, SILUET 'B' & ARTISTIC BRANDING */}
        <div 
          className="text-white px-4 sm:px-6 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-black/15 shrink-0 transition-all duration-300 rounded-none relative overflow-hidden shadow-xs"
          style={{ 
            background: 'linear-gradient(135deg, var(--theme-color-4, #0069a3) 0%, #0284c7 50%, var(--theme-color-1, #0097fe) 100%)'
          }}
        >
          {/* 1. Subtle Multi-Color Ambient Glow Spots */}
          <div 
            className="absolute -top-12 -left-12 w-48 h-48 rounded-full pointer-events-none opacity-25 blur-2xl"
            style={{ backgroundColor: 'var(--theme-color-2, #009a19)' }}
          />
          <div 
            className="absolute -bottom-10 right-1/3 w-40 h-40 rounded-full pointer-events-none opacity-20 blur-xl"
            style={{ backgroundColor: 'var(--theme-color-3, #fe9600)' }}
          />

          {/* 2. Aesthetic Siluet Huruf 'b' Watermark (Subtle & Elegant) */}
          <div 
            className="absolute right-44 -bottom-6 pointer-events-none select-none opacity-[0.11] overflow-hidden hidden md:block"
            aria-hidden="true"
          >
            <img
              src="/bapperida-b-symbol.png"
              alt=""
              className="w-48 h-auto object-contain filter brightness-0 invert rotate-[-10deg]"
            />
          </div>

          {/* 3. Secondary Siluet 'b' Soft Watermark (Center Area) */}
          <div 
            className="absolute left-[340px] -top-6 pointer-events-none select-none opacity-[0.06] overflow-hidden hidden xl:block"
            aria-hidden="true"
          >
            <img
              src="/bapperida-b-symbol.png"
              alt=""
              className="w-32 h-auto object-contain filter brightness-0 invert rotate-[12deg]"
            />
          </div>

          {/* 4. Artistic Bapperida Multi-Color Waves on the Right Edge */}
          <BapperidaCurvesHeader className="opacity-40" />

          {/* 5. Signature Bottom 3.5px Multi-Color Accent Strip */}
          <div 
            className="absolute bottom-0 inset-x-0 h-[3.5px]"
            style={{
              background: 'linear-gradient(90deg, var(--theme-color-1, #0097fe) 0%, var(--theme-color-2, #009a19) 33%, var(--theme-color-3, #fe9600) 66%, var(--theme-color-4, #0069a3) 100%)'
            }}
          />

          {/* Left Title */}
          <div className="flex items-center gap-3 relative z-10">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-black tracking-wide text-white drop-shadow-xs">
                  Data Makro Kabupaten Bogor
                </h1>
                <span className="text-[9px] font-black px-1.5 py-0.5 rounded-xs bg-white/20 text-white border border-white/25 uppercase tracking-wider backdrop-blur-xs font-mono">
                  RPJMD MONITOR
                </span>
              </div>
              <p className="text-[11px] text-white/85 font-medium leading-tight">
                Lembar Kerja Indikator Makro Kabupaten Bogor • Bapperida
              </p>
            </div>
          </div>

          {/* Ribbon Toolbar Actions */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Search Filter in Ribbon */}
            <div className="relative w-36 sm:w-44">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/60 pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cari indikator..."
                className="w-full pl-8 pr-6 py-1 bg-black/20 hover:bg-black/30 focus:bg-white text-white focus:text-slate-800 placeholder:text-white/70 focus:placeholder:text-slate-400 border border-white/25 focus:border-white rounded-md text-xs outline-none transition-all shadow-inner"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-white/70 hover:text-white"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Period Range Dropdown */}
            <div className="relative">
              <select
                value={periodPreset}
                onChange={(e) => setPeriodPreset(e.target.value as 'rpjmd' | 'all')}
                className="bg-black/20 hover:bg-black/30 text-white font-bold text-xs py-1.5 pl-3 pr-8 rounded-md border border-white/25 outline-none cursor-pointer appearance-none shadow-inner transition-all"
                title="Pilih Rentang Periode Tahun"
              >
                <option value="rpjmd" className="text-slate-800 bg-white font-semibold">
                  2025–2030
                </option>
                <option value="all" className="text-slate-800 bg-white font-semibold">
                  {viewMode === 'realisasi'
                    ? `Semua Tahun (2017–${currentYear})`
                    : 'Semua Tahun (2017–2030)'}
                </option>
              </select>
              <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/70 pointer-events-none" />
            </div>

            {/* Target vs Realisasi Mode Toggle */}
            <div className="flex items-center bg-black/20 p-0.5 rounded-md border border-white/20 text-[10px] font-bold">
              <button
                type="button"
                onClick={() => setViewMode('realisasi')}
                className={`px-2.5 py-1 rounded-sm flex items-center gap-1 transition-all ${
                  viewMode === 'realisasi' ? 'bg-white text-slate-800 shadow-2xs font-black' : 'text-white/80 hover:text-white'
                }`}
              >
                <BarChart3 size={11} /> Realisasi
              </button>
              <button
                type="button"
                onClick={() => setViewMode('target')}
                className={`px-2.5 py-1 rounded-sm flex items-center gap-1 transition-all ${
                  viewMode === 'target' ? 'bg-white text-slate-800 shadow-2xs font-black' : 'text-white/80 hover:text-white'
                }`}
              >
                <Eye size={11} /> Target
              </button>
            </div>

            {/* Insert Row Button */}
            {isAuthorizedToAdd && (
              <button
                type="button"
                onClick={handleAddRow}
                className="px-3 py-1 rounded-md bg-white hover:bg-slate-50 font-black text-[11px] flex items-center gap-1.5 shadow-2xs transition-colors"
                style={{ color: 'var(--theme-color-1, #0097fe)' }}
                title="Sisipkan baris data makro baru"
              >
                <Plus size={13} strokeWidth={2.5} />
                <span>+ Sisipkan Baris</span>
              </button>
            )}

            {/* Export CSV / Excel Button */}
            <button
              type="button"
              onClick={handleExportCSV}
              className="px-2.5 py-1 rounded-md bg-white/15 hover:bg-white/25 text-white font-bold text-[11px] flex items-center gap-1 transition-colors border border-white/25"
              title="Ekspor ke Berkas Spreadsheet CSV / Excel"
            >
              <Download size={12} />
              <span className="hidden sm:inline">Export Excel</span>
            </button>

            {/* Refresh Button */}
            <button
              type="button"
              onClick={() => fetchData(true)}
              disabled={refreshing}
              className="p-1 rounded hover:bg-white/15 text-white transition-all"
              title="Segarkan data dari database"
            >
              <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* 2. SPREADSHEET TABLE GRID VIEW WITH FIXED FROZEN COLUMNS (NO BLEED/LEAK) */}
        <div className="flex-1 overflow-auto custom-scrollbar relative bg-white min-h-0">
          <table 
            className="border-separate border-spacing-0 text-xs font-mono w-full"
            style={{ tableLayout: 'fixed', minWidth: '100%' }}
          >
            {/* COMPACT & BALANCED COLUMN WIDTH SPECIFICATIONS (SHRINKS TO FIT SCREEN) */}
            <colgroup>
              <col style={{ width: '32px' }} />   {/* Col 0: # */}
              <col style={{ width: '220px' }} />  {/* Col 1: Indikator Kinerja Makro */}
              <col style={{ width: '58px' }} />   {/* Col 2: Satuan */}
              <col style={{ width: '80px' }} />   {/* Col 3: Sumber Data */}
              <col style={{ width: '95px' }} />   {/* Col 4: Tagging Tematik */}
              {years.map(y => (
                <col key={y} style={{ width: '60px' }} />
              ))}
              <col style={{ width: '54px' }} />   {/* Col Last: Aksi */}
            </colgroup>

            <thead>
              {/* STICKY THEME-BLENDED HEADER ROW */}
              <tr className="text-slate-700 text-xs font-bold sticky top-0 z-40 font-sans shadow-xs">
                {/* 1. # Row Number Header: sticky left-0, 32px */}
                <th 
                  className="border-r border-slate-300 py-2.5 text-center text-[10px] text-slate-500 sticky top-0 select-none"
                  style={{ 
                    position: 'sticky',
                    top: 0,
                    left: '0px', 
                    width: '32px', 
                    minWidth: '32px', 
                    maxWidth: '32px',
                    zIndex: 50,
                    backgroundColor: 'color-mix(in srgb, var(--theme-color-4, #0069a3) 8%, #ffffff)',
                    borderBottom: '2.5px solid var(--theme-color-4, #0069a3)'
                  }}
                >
                  <span className="font-mono font-bold text-slate-600">#</span>
                </th>

                {/* 2. Indikator Header: sticky left-[32px], 220px, with vertical divider shadow */}
                <th 
                  className="border-r-2 border-slate-300 py-2 px-2.5 text-left sticky top-0 shadow-[3px_0_5px_-2px_rgba(0,0,0,0.18)] select-none"
                  style={{ 
                    position: 'sticky',
                    top: 0,
                    left: '32px', 
                    width: '220px', 
                    minWidth: '220px', 
                    maxWidth: '220px',
                    zIndex: 50,
                    backgroundColor: 'color-mix(in srgb, var(--theme-color-1, #0097fe) 8%, #ffffff)',
                    borderBottom: '2.5px solid var(--theme-color-1, #0097fe)'
                  }}
                >
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-800 leading-tight">
                      Indikator Kinerja Makro
                    </span>
                    <span className="text-[8px] font-semibold text-slate-500 uppercase tracking-tight">
                      Tolok Ukur RPJMD
                    </span>
                  </div>
                </th>

                {/* 4. Satuan */}
                <th 
                  className="border-r border-slate-300 py-2 px-1 text-center sticky top-0 select-none"
                  style={{ 
                    position: 'sticky',
                    top: 0,
                    zIndex: 40,
                    width: '58px',
                    minWidth: '58px',
                    maxWidth: '58px',
                    backgroundColor: 'color-mix(in srgb, var(--theme-color-4, #0069a3) 6%, #ffffff)',
                    borderBottom: '2.5px solid var(--theme-color-4, #0069a3)'
                  }}
                >
                  <div className="flex flex-col items-center">
                    <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-700">Satuan</span>
                    <span className="text-[7.5px] font-semibold text-slate-400 uppercase tracking-tight">Metrik</span>
                  </div>
                </th>

                {/* 5. Sumber Data */}
                <th 
                  className="border-r border-slate-300 py-2 px-1 text-left sticky top-0 select-none"
                  style={{ 
                    position: 'sticky',
                    top: 0,
                    zIndex: 40,
                    width: '80px',
                    minWidth: '80px',
                    maxWidth: '80px',
                    backgroundColor: 'color-mix(in srgb, var(--theme-color-4, #0069a3) 6%, #ffffff)',
                    borderBottom: '2.5px solid var(--theme-color-4, #0069a3)'
                  }}
                >
                  <div className="flex flex-col">
                    <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-700">Sumber Data</span>
                    <span className="text-[7.5px] font-semibold text-slate-400 uppercase tracking-tight">BPS/Walidata</span>
                  </div>
                </th>

                {/* 6. Tagging Tematik */}
                <th 
                  className="border-r border-slate-300 py-2 px-1 text-left sticky top-0 select-none"
                  style={{ 
                    position: 'sticky',
                    top: 0,
                    zIndex: 40,
                    width: '95px',
                    minWidth: '95px',
                    maxWidth: '95px',
                    backgroundColor: 'color-mix(in srgb, var(--theme-color-2, #009a19) 7%, #ffffff)',
                    borderBottom: '2.5px solid var(--theme-color-2, #009a19)'
                  }}
                >
                  <div className="flex items-center gap-1">
                    <div 
                      className="w-3.5 h-3.5 rounded flex items-center justify-center shrink-0 text-white"
                      style={{ backgroundColor: 'var(--theme-color-2, #009a19)' }}
                    >
                      <Tag size={8} />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-700">Tagging</span>
                      <span className="text-[7.5px] font-semibold text-emerald-700 uppercase tracking-tight">Prioritas</span>
                    </div>
                  </div>
                </th>

                {/* 7. Dynamic Year Columns (Blend of Theme Accent by Mode) */}
                {years.map(year => {
                  const isThisYear = year === currentYear;
                  const isRealisasi = viewMode === 'realisasi';
                  const baseThemeColor = isRealisasi ? 'var(--theme-color-2, #009a19)' : 'var(--theme-color-3, #fe9600)';
                  const activeColor = isThisYear ? 'var(--theme-color-1, #0097fe)' : baseThemeColor;

                  return (
                    <th 
                      key={year} 
                      className="border-r border-slate-300 py-2 px-1 text-right sticky top-0 select-none"
                      style={{ 
                        position: 'sticky',
                        top: 0,
                        zIndex: 40,
                        width: '60px',
                        minWidth: '60px',
                        maxWidth: '60px',
                        backgroundColor: isThisYear 
                          ? 'color-mix(in srgb, var(--theme-color-1, #0097fe) 12%, #ffffff)'
                          : isRealisasi 
                            ? 'color-mix(in srgb, var(--theme-color-2, #009a19) 7%, #ffffff)' 
                            : 'color-mix(in srgb, var(--theme-color-3, #fe9600) 8%, #ffffff)',
                        borderBottom: `2.5px solid ${activeColor}`
                      }}
                    >
                      <div className="flex flex-col items-end gap-0.5">
                        <div className="flex items-center gap-1">
                          {isThisYear && (
                            <span 
                              className="text-[7px] font-black px-0.5 py-0.2 rounded text-white tracking-wider"
                              style={{ backgroundColor: 'var(--theme-color-1, #0097fe)' }}
                            >
                              KINI
                            </span>
                          )}
                          <span className={`text-[10.5px] font-black tabular-nums ${isThisYear ? 'text-blue-900' : 'text-slate-800'}`}>
                            {year}
                          </span>
                        </div>
                        <span 
                          className="text-[7px] font-extrabold uppercase tracking-wider px-0.5 py-0.2 rounded-xs"
                          style={{
                            color: isThisYear ? 'var(--theme-color-1, #0097fe)' : baseThemeColor,
                            backgroundColor: isThisYear 
                              ? 'color-mix(in srgb, var(--theme-color-1, #0097fe) 15%, #ffffff)'
                              : isRealisasi
                                ? 'color-mix(in srgb, var(--theme-color-2, #009a19) 14%, #ffffff)'
                                : 'color-mix(in srgb, var(--theme-color-3, #fe9600) 16%, #ffffff)'
                          }}
                        >
                          {viewMode}
                        </span>
                      </div>
                    </th>
                  );
                })}

                {/* 8. Aksi Header - NATURAL (NOT FROZEN RIGHT) */}
                <th 
                  className="border-r border-slate-300 py-2 px-0.5 text-center text-slate-700 font-extrabold text-[9.5px] uppercase sticky top-0 select-none"
                  style={{ 
                    position: 'sticky',
                    top: 0,
                    zIndex: 40,
                    width: '54px',
                    minWidth: '54px',
                    maxWidth: '54px',
                    backgroundColor: 'color-mix(in srgb, var(--theme-color-4, #0069a3) 8%, #ffffff)',
                    borderBottom: '2.5px solid var(--theme-color-4, #0069a3)'
                  }}
                >
                  Aksi
                </th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={years.length + 6} className="p-12 text-center text-slate-400 font-sans border-b border-slate-200">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                      <span className="text-xs font-bold">Memuat data lembar kerja spreadsheet...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan={years.length + 6} className="p-12 text-center text-slate-400 italic font-sans border-b border-slate-200">
                    Tidak ada baris data yang ditemukan.
                  </td>
                </tr>
              ) : (
                filteredData.map((row, rowIdx) => {
                  const userCanEditDefinitions = canEditIndicator(row);
                  const userCanEditValues = canEditValue(row);
                  const isEditing = editingRowId === row.id;
                  const rowData = isEditing && editDraft ? editDraft : row;

                  return (
                    <tr 
                      key={row.id} 
                      className={`group/row ${
                        isEditing ? 'bg-amber-50' : 'bg-white'
                      }`}
                    >
                      {/* 1. EXCEL ROW NUMBER: sticky left-0, 32px - 100% OPAQUE BACKGROUND */}
                      <td 
                        className={`border-b border-r border-slate-300 text-slate-500 text-[10px] font-bold text-center py-2 sticky select-none ${
                          isEditing ? 'bg-[#fef3c7]' : 'bg-[#f1f5f9] group-hover/row:bg-[#e2e8f0]'
                        }`}
                        style={{ left: '0px', width: '32px', minWidth: '32px', maxWidth: '32px', zIndex: 30 }}
                      >
                        {rowIdx + 1}
                      </td>

                      {/* 2. FROZEN INDIKATOR NAME: sticky left-[32px], 220px - 100% OPAQUE, SHADOW SEPARATION */}
                      <td 
                        className={`border-b border-r-2 border-slate-300 px-2.5 py-1 font-sans font-bold text-slate-800 sticky shadow-[3px_0_5px_-2px_rgba(0,0,0,0.18)] ${
                          isEditing ? 'bg-[#fef3c7]' : 'bg-[#ffffff] group-hover/row:bg-[#f8fafc]'
                        }`}
                        style={{ left: '32px', width: '220px', minWidth: '220px', maxWidth: '220px', zIndex: 30 }}
                        title={`Indikator: ${row.nama_data}\nPenanggung Jawab: ${
                          row.assigned_pegawai_names && row.assigned_pegawai_names.length > 0
                            ? row.assigned_pegawai_names.join(', ')
                            : 'Belum ada pegawai ditugaskan'
                        }`}
                      >
                        {isEditing && userCanEditDefinitions ? (
                          <textarea
                            rows={2}
                            value={rowData.nama_data}
                            onChange={(e) => handleDraftUpdate('nama_data', e.target.value)}
                            className="w-full p-1 bg-white border border-blue-400 rounded text-xs font-bold outline-none resize-none"
                          />
                        ) : (
                          <div className="flex items-center gap-1.5 overflow-hidden">
                            {!userCanEditValues && <Lock size={11} className="text-slate-300 shrink-0" />}
                            <span className="truncate block" style={{ maxWidth: '195px' }}>
                              {row.nama_data}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* 4. SATUAN */}
                      <td 
                        className="border-b border-r border-slate-300 px-1 py-1 text-center font-sans text-[10.5px] bg-white group-hover/row:bg-[#f8fafc]"
                        style={{ width: '58px', minWidth: '58px', maxWidth: '58px' }}
                      >
                        {isEditing && userCanEditDefinitions ? (
                          <select
                            value={rowData.satuan_id || ''}
                            onChange={(e) => handleDraftUpdate('satuan_id', e.target.value || null)}
                            className="w-full p-0.5 bg-white border border-blue-400 rounded text-xs outline-none"
                          >
                            <option value="">-</option>
                            {satuans.map(s => <option key={s.id} value={s.id}>{s.satuan}</option>)}
                          </select>
                        ) : (
                          <span className="text-slate-600 font-semibold truncate block">{row.satuan_nama || '-'}</span>
                        )}
                      </td>

                      {/* 5. SUMBER DATA */}
                      <td 
                        className="border-b border-r border-slate-300 px-1 py-1 font-sans text-[10.5px] bg-white group-hover/row:bg-[#f8fafc] truncate"
                        style={{ width: '80px', minWidth: '80px', maxWidth: '80px' }}
                      >
                        {isEditing && userCanEditDefinitions ? (
                          <input
                            type="text"
                            value={rowData.sumber_data || ''}
                            onChange={(e) => handleDraftUpdate('sumber_data', e.target.value)}
                            className="w-full p-0.5 bg-white border border-blue-400 rounded text-xs outline-none"
                            placeholder="Sumber"
                          />
                        ) : (
                          <span className="text-slate-500 truncate block">{row.sumber_data || '-'}</span>
                        )}
                      </td>

                      {/* 6. TAGGING TEMATIK (MULTI-SELECT) */}
                      <td 
                        className="border-b border-r border-slate-300 px-1 py-1 font-sans text-[10.5px] bg-white group-hover/row:bg-[#f8fafc] relative"
                        style={{ width: '95px', minWidth: '95px', maxWidth: '95px' }}
                      >
                        {isEditing && userCanEditDefinitions ? (
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() => setOpenTematikPopoverId(openTematikPopoverId === row.id ? null : row.id)}
                              className="w-full p-0.5 px-1 bg-white border border-blue-400 rounded text-[9px] font-bold text-left flex items-center justify-between gap-0.5 cursor-pointer"
                              title="Pilih satu atau beberapa tematik"
                            >
                              <span className="truncate">
                                {(rowData.tematik_ids?.length || (rowData.tematik_id ? 1 : 0)) > 0
                                  ? `${rowData.tematik_ids?.length || 1} Tematik`
                                  : '(Pilih Tematik)'}
                              </span>
                              <ChevronDown size={10} className="shrink-0 text-slate-400" />
                            </button>

                            {openTematikPopoverId === row.id && (
                              <div className="absolute left-0 top-full mt-1 z-50 bg-white border border-slate-200 rounded-xl shadow-xl p-2 w-52 max-h-52 overflow-y-auto custom-scrollbar">
                                <div className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1 px-1 flex items-center justify-between border-b border-slate-100 pb-1">
                                  <span>Pilih Tematik:</span>
                                  <button
                                    type="button"
                                    onClick={() => setOpenTematikPopoverId(null)}
                                    className="text-slate-400 hover:text-slate-600 p-0.5"
                                  >
                                    <X size={12} />
                                  </button>
                                </div>
                                <div className="space-y-0.5 mt-1">
                                  {tematiks.map(t => {
                                    const currentIds = rowData.tematik_ids || (rowData.tematik_id ? [rowData.tematik_id] : []);
                                    const isChecked = currentIds.includes(t.id);
                                    return (
                                      <label key={t.id} className="flex items-center gap-2 px-1.5 py-1 hover:bg-slate-50 rounded-lg cursor-pointer text-[10.5px] font-semibold text-slate-700">
                                        <input
                                          type="checkbox"
                                          checked={isChecked}
                                          onChange={(e) => {
                                            const nextIds = e.target.checked
                                              ? [...currentIds, t.id]
                                              : currentIds.filter(id => id !== t.id);
                                            handleDraftUpdate('tematik_ids', nextIds);
                                            const nextNames = tematiks.filter(tm => nextIds.includes(tm.id)).map(tm => tm.nama);
                                            handleDraftUpdate('tematik_nama', nextNames.join(', '));
                                          }}
                                          className="rounded text-blue-600 focus:ring-0"
                                        />
                                        <span className="truncate">{t.nama}</span>
                                      </label>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="truncate" title={row.tematik_nama || '-'}>
                            {row.tematik_nama ? (
                              <span className="px-1 py-0.2 rounded bg-emerald-50 text-emerald-700 font-bold text-[8.5px] border border-emerald-200 truncate inline-block max-w-[85px]">
                                {row.tematik_nama}
                              </span>
                            ) : (
                              <span className="text-slate-400 italic text-[10px]">-</span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* 7. DYNAMIC YEAR SPREADSHEET CELLS */}
                      {years.map(year => {
                        const cellKey = `${year}_${viewMode}`;
                        const val = rowData.nilai[cellKey] || '';
                        const meta = row.nilai_meta?.[cellKey];

                        // Tooltip putih (native title): nilai, tanggal kapan diubah, siapa yang mengubah
                        let cellTooltip = `Tahun ${year} (${viewMode === 'realisasi' ? 'Realisasi' : 'Target'}): ${val ? `${val} ${row.satuan_nama || ''}` : '(Kosong)'}`;
                        if (val && meta) {
                          if (meta.updated_at) {
                            try {
                              const d = new Date(meta.updated_at);
                              const formattedDate = d.toLocaleString('id-ID', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              });
                              cellTooltip += `\nTanggal Diubah: ${formattedDate}`;
                            } catch {
                              cellTooltip += `\nTanggal Diubah: ${meta.updated_at}`;
                            }
                          }
                          if (meta.updated_by_nama) {
                            cellTooltip += `\nDiubah Oleh: ${meta.updated_by_nama}`;
                          } else if (meta.updated_by) {
                            cellTooltip += `\nDiubah Oleh: Petugas #${meta.updated_by}`;
                          }
                        }

                        return (
                          <td
                            key={year}
                            className="border-b border-r border-slate-300 p-1 text-right tabular-nums text-xs bg-white hover:bg-slate-100 group-hover/row:bg-[#f8fafc]"
                            style={{ width: '60px', minWidth: '60px', maxWidth: '60px' }}
                            title={cellTooltip}
                          >
                            {isEditing && userCanEditValues ? (
                              <input
                                type="text"
                                value={val}
                                onChange={(e) => handleDraftNilaiUpdate(year, e.target.value)}
                                className="w-full text-right p-0.5 bg-blue-50/70 border border-blue-400 rounded text-xs font-bold outline-none font-mono"
                                placeholder="0"
                                title={cellTooltip}
                              />
                            ) : (
                              <span className={`block px-0.5 py-0.5 ${val ? 'font-bold text-slate-800' : 'text-slate-300'}`}>
                                {val || '-'}
                              </span>
                            )}
                          </td>
                        );
                      })}

                      {/* 8. AKSI CELL - NATURAL (NOT FROZEN) */}
                      <td 
                        className="border-b border-r border-slate-300 px-0.5 py-1 text-center bg-white group-hover/row:bg-[#f8fafc]"
                        style={{ width: '54px', minWidth: '54px', maxWidth: '54px' }}
                      >
                        <div className="flex items-center justify-center gap-0.5">
                          {isEditing ? (
                            <>
                              <button
                                type="button"
                                onClick={handleSaveRow}
                                disabled={saving === `row-${row.id}`}
                                className="p-1 rounded text-emerald-600 hover:bg-emerald-50 font-bold transition-all"
                                title="Simpan Perubahan"
                              >
                                {saving === `row-${row.id}` ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                              </button>
                              <button
                                type="button"
                                onClick={handleCancelEdit}
                                disabled={saving === `row-${row.id}`}
                                className="p-1 rounded text-rose-500 hover:bg-rose-50 transition-all"
                                title="Batal Edit"
                              >
                                <X size={12} />
                              </button>
                            </>
                          ) : (
                            <>
                              {(userCanEditDefinitions || userCanEditValues) ? (
                                <button
                                  type="button"
                                  onClick={() => handleEditClick(row)}
                                  className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
                                  title="Edit Baris Spreadsheet"
                                >
                                  <Edit2 size={12} />
                                </button>
                              ) : (
                                <Lock size={11} className="text-slate-300" />
                              )}

                              {userCanEditDefinitions && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteRow(row.id)}
                                  className="p-1 rounded text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-all"
                                  title="Hapus Baris"
                                >
                                  <Trash2 size={12} />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 3. SPREADSHEET STATUS BAR - SHARP EDGES (rounded-none) */}
        <div className="bg-slate-100 border-t border-slate-300 px-4 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 rounded-none text-[11px] text-slate-500 font-mono">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 font-bold" style={{ color: 'var(--theme-color-1, #0097fe)' }}>
              <ShieldCheck size={13} />
              <span>{isGlobalMacroEditor ? 'Izin Penuh (Admin Instansi / Sekretariat / Kepala Badan)' : 'Izin Update Pegawai Ditugaskan'}</span>
            </div>
            <span className="text-slate-300">|</span>
            <span className="font-semibold text-slate-600 uppercase">
              Mode: {viewMode === 'realisasi' ? 'Realisasi Capaian' : 'Target RPJMD'}
            </span>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-auto">
            <span>TOTAL: {filteredData.length} BARIS</span>
            <span className="border-l border-slate-300 pl-3">RENTANG: {startYear}–{endYear}</span>
            <span className="border-l border-slate-300 pl-3 font-bold" style={{ color: 'var(--theme-color-1, #0097fe)' }}>
              100% SINKRON DB
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataMakro;
