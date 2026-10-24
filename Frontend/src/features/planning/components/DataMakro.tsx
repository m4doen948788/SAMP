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
  BarChart3
} from 'lucide-react';
import { useAuth } from '@/src/contexts/AuthContext';

interface MacroIndicator {
  id: number;
  kode: string;
  nama_data: string;
  tematik_id: number | null;
  sumber_data: string | null;
  satuan_id: number | null;
  urutan: number;
  is_active: number;
  parent_id: number | null;
  tematik_nama?: string;
  satuan_nama?: string;
  nilai: Record<string, string>; 
  assigned_pegawai_ids?: number[];
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
  const isSuperAdmin = user?.tipe_user_id === 1;

  // Period / Year Configuration
  const [periodPreset, setPeriodPreset] = useState<'rpjmd' | 'all' | 'historical'>('all');
  
  const { startYear, endYear } = useMemo(() => {
    if (periodPreset === 'rpjmd') return { startYear: 2025, endYear: 2030 };
    if (periodPreset === 'historical') return { startYear: 2017, endYear: 2024 };
    return { startYear: 2017, endYear: 2030 };
  }, [periodPreset]);

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
  const [viewMode, setViewMode] = useState<'target' | 'realisasi'>('realisasi');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Row Editing
  const [editingRowId, setEditingRowId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState<MacroIndicator | null>(null);

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

  // Authorization Logic
  const isAuthorizedToAdd = useMemo(() => {
    if (isSuperAdmin) return true;
    return otoritasList.includes(userProfilId || 0);
  }, [isSuperAdmin, otoritasList, userProfilId]);

  const canEditIndicator = (row: MacroIndicator) => {
    return isAuthorizedToAdd;
  };

  const canEditValue = (row: MacroIndicator) => {
    if (isSuperAdmin) return true;
    if (otoritasList.includes(userProfilId || 0)) return true;
    return row.assigned_pegawai_ids?.includes(userProfilId || 0);
  };

  // Row Edit Handlers
  const handleEditClick = (row: MacroIndicator) => {
    setEditingRowId(row.id);
    setEditDraft(JSON.parse(JSON.stringify(row)));
  };

  const handleCancelEdit = () => {
    setEditingRowId(null);
    setEditDraft(null);
  };

  const handleSaveRow = async () => {
    if (!editDraft || !editingRowId) return;
    const original = data.find(d => d.id === editingRowId);
    if (!original) return;

    setSaving(`row-${editingRowId}`);
    try {
      const promises = [];
      
      const metaChanged = ['nama_data', 'kode', 'tematik_id', 'sumber_data', 'satuan_id'].some(
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
    const header = ['No', 'Kode', 'Indikator Makro', 'Tagging Tematik', 'Sumber Data', 'Satuan', ...years.map(y => `${y} (${viewMode})`)];
    const rows = filteredData.map((ind, idx) => {
      const vals = years.map(y => ind.nilai[`${y}_${viewMode}`] || '');
      return [
        idx + 1,
        `"${ind.kode || ''}"`,
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
    link.setAttribute('download', `Spreadsheet_Data_Makro_Bapperida_${viewMode}_${startYear}-${endYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      {/* 1. SPREADSHEET APPLICATION WINDOW CONTAINER - SHARP EDGES (rounded-none) */}
      <div className="bg-white border border-slate-300 shadow-sm flex flex-col min-h-[680px] rounded-none">
        
        {/* TOP RIBBON HEADER - SHARP EDGES, ADAPTIVE TO THEME COLOR */}
        <div 
          className="text-white px-4 sm:px-6 py-2.5 flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-black/10 shrink-0 transition-colors duration-300 rounded-none"
          style={{ backgroundColor: 'var(--theme-color-1, #0097fe)' }}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center text-white shadow-2xs font-bold shrink-0">
              <FileSpreadsheet size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-black tracking-wide uppercase font-mono">
                  DATA_MAKRO_BAPPERIDA.xlsx
                </h1>
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-sm bg-black/25 text-white border border-white/20 font-mono">
                  RPJMD MONITOR
                </span>
              </div>
              <p className="text-[11px] text-white/80 leading-tight">
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

            {/* Period Range Switcher */}
            <div className="flex items-center bg-black/20 p-0.5 rounded-md border border-white/20 text-[10px] font-bold">
              <button
                type="button"
                onClick={() => setPeriodPreset('all')}
                className={`px-2 py-1 rounded-sm transition-all ${
                  periodPreset === 'all' ? 'bg-white text-slate-800 shadow-2xs' : 'text-white/80 hover:text-white'
                }`}
                title="Semua Tahun (2017–2030)"
              >
                2017–2030
              </button>
              <button
                type="button"
                onClick={() => setPeriodPreset('rpjmd')}
                className={`px-2 py-1 rounded-sm transition-all ${
                  periodPreset === 'rpjmd' ? 'bg-white text-slate-800 shadow-2xs' : 'text-white/80 hover:text-white'
                }`}
                title="Periode RPJMD (2025–2030)"
              >
                2025–2030 (RPJMD)
              </button>
              <button
                type="button"
                onClick={() => setPeriodPreset('historical')}
                className={`px-2 py-1 rounded-sm transition-all ${
                  periodPreset === 'historical' ? 'bg-white text-slate-800 shadow-2xs' : 'text-white/80 hover:text-white'
                }`}
                title="Riwayat Historis (2017–2024)"
              >
                2017–2024
              </button>
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

        {/* 2. SPREADSHEET TABLE GRID VIEW WITH MATHEMATICAL FIXED FROZEN COLUMNS (NO BLEED/LEAK) */}
        <div className="flex-1 overflow-auto custom-scrollbar relative bg-white max-h-[calc(100vh-230px)]">
          <table 
            className="border-separate border-spacing-0 text-xs font-mono"
            style={{ tableLayout: 'fixed', minWidth: '100%' }}
          >
            {/* EXPLICIT COLUMN WIDTH SPECIFICATIONS FOR 100% PRECISE ALIGNMENT */}
            <colgroup>
              <col style={{ width: '44px' }} />   {/* Col 0: # */}
              <col style={{ width: '76px' }} />   {/* Col 1: Kode */}
              <col style={{ width: '320px' }} />  {/* Col 2: Indikator Kinerja Makro */}
              <col style={{ width: '90px' }} />   {/* Col 3: Satuan */}
              <col style={{ width: '130px' }} />  {/* Col 4: Sumber Data */}
              <col style={{ width: '150px' }} />  {/* Col 5: Tagging Tematik */}
              {years.map(y => (
                <col key={y} style={{ width: '100px' }} />
              ))}
              <col style={{ width: '84px' }} />   {/* Col Last: Aksi */}
            </colgroup>

            <thead>
              {/* SINGLE CLEAN STICKY HEADER ROW (SHARP & ACCURATE) */}
              <tr className="bg-slate-100 text-slate-700 text-xs font-bold sticky top-0 z-30 font-sans shadow-xs">
                {/* 1. # Row Number Header: sticky left-0, 44px */}
                <th 
                  className="border-b-2 border-r border-slate-300 bg-slate-200 py-2.5 text-center text-[10px] text-slate-500 sticky z-30 select-none"
                  style={{ left: '0px', width: '44px', minWidth: '44px', maxWidth: '44px' }}
                >
                  #
                </th>

                {/* 2. Kode Header: sticky left-[44px], 76px */}
                <th 
                  className="border-b-2 border-r border-slate-300 bg-slate-100 py-2.5 px-2 text-center text-slate-700 font-extrabold uppercase text-[10px] sticky z-30 select-none"
                  style={{ left: '44px', width: '76px', minWidth: '76px', maxWidth: '76px' }}
                >
                  KODE
                </th>

                {/* 3. Indikator Header: sticky left-[120px], 320px, with vertical divider shadow */}
                <th 
                  className="border-b-2 border-r-2 border-slate-300 py-2.5 px-3 text-left text-slate-800 font-extrabold sticky z-30 bg-slate-100 shadow-[3px_0_5px_-2px_rgba(0,0,0,0.18)] select-none"
                  style={{ left: '120px', width: '320px', minWidth: '320px', maxWidth: '320px' }}
                >
                  Indikator Kinerja Makro
                </th>

                {/* 4. Satuan */}
                <th 
                  className="border-b-2 border-r border-slate-300 py-2.5 px-2 text-center text-slate-700 font-bold text-[10px] bg-slate-100 select-none"
                  style={{ width: '90px' }}
                >
                  Satuan
                </th>

                {/* 5. Sumber Data */}
                <th 
                  className="border-b-2 border-r border-slate-300 py-2.5 px-2 text-left text-slate-700 font-bold text-[10px] bg-slate-100 select-none"
                  style={{ width: '130px' }}
                >
                  Sumber Data
                </th>

                {/* 6. Tagging Tematik */}
                <th 
                  className="border-b-2 border-r border-slate-300 py-2.5 px-2 text-left text-slate-700 font-bold text-[10px] bg-slate-100 select-none"
                  style={{ width: '150px' }}
                >
                  Tagging Tematik
                </th>

                {/* 7. Dynamic Year Columns */}
                {years.map(year => (
                  <th 
                    key={year} 
                    className="border-b-2 border-r border-slate-300 py-2.5 px-2 text-right font-extrabold text-slate-800 tabular-nums bg-slate-100 select-none"
                    style={{ width: '100px' }}
                  >
                    <div>{year}</div>
                    <div className="text-[9px] font-normal uppercase tracking-tighter text-slate-400">
                      {viewMode}
                    </div>
                  </th>
                ))}

                {/* 8. Aksi */}
                <th 
                  className="border-b-2 border-r border-slate-300 py-2.5 px-2 text-center text-slate-600 font-bold text-[10px] bg-slate-100 select-none"
                  style={{ width: '84px' }}
                >
                  Aksi
                </th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={years.length + 7} className="p-12 text-center text-slate-400 font-sans border-b border-slate-200">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                      <span className="text-xs font-bold">Memuat data lembar kerja spreadsheet...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan={years.length + 7} className="p-12 text-center text-slate-400 italic font-sans border-b border-slate-200">
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
                      className={`hover:bg-blue-50/30 transition-colors group/row ${
                        isEditing ? 'bg-amber-50/40' : ''
                      }`}
                    >
                      {/* 1. EXCEL ROW NUMBER: sticky left-0, 44px */}
                      <td 
                        className="border-b border-r border-slate-300 bg-slate-100 text-slate-500 text-[10px] font-bold text-center py-2 sticky z-20 select-none group-hover/row:bg-slate-200"
                        style={{ left: '0px', width: '44px', minWidth: '44px', maxWidth: '44px' }}
                      >
                        {rowIdx + 1}
                      </td>

                      {/* 2. KODE: sticky left-[44px], 76px - 100% OPAQUE BACKGROUND, NEVER LEAKS */}
                      <td 
                        className={`border-b border-r border-slate-300 px-2 py-1 text-center sticky z-20 ${
                          isEditing ? 'bg-amber-50' : 'bg-white group-hover/row:bg-blue-50/40'
                        }`}
                        style={{ left: '44px', width: '76px', minWidth: '76px', maxWidth: '76px' }}
                      >
                        {isEditing && userCanEditDefinitions ? (
                          <input
                            type="text"
                            value={rowData.kode || ''}
                            onChange={(e) => handleDraftUpdate('kode', e.target.value)}
                            className="w-full text-center p-1 bg-white border border-blue-400 rounded text-xs font-bold outline-none"
                            placeholder="Kode"
                          />
                        ) : (
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 font-bold text-[10px] text-slate-700">
                            {row.kode || `M${row.id}`}
                          </span>
                        )}
                      </td>

                      {/* 3. FROZEN INDIKATOR NAME: sticky left-[120px], 320px - 100% OPAQUE, SHADOW SEPARATION */}
                      <td 
                        className={`border-b border-r-2 border-slate-300 px-3 py-1 font-sans font-bold text-slate-800 sticky z-20 shadow-[3px_0_5px_-2px_rgba(0,0,0,0.18)] ${
                          isEditing ? 'bg-amber-50' : 'bg-white group-hover/row:bg-blue-50/40'
                        }`}
                        style={{ left: '120px', width: '320px', minWidth: '320px', maxWidth: '320px' }}
                        title={row.nama_data}
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
                            <span className="truncate block" style={{ maxWidth: '280px' }}>
                              {row.nama_data}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* 4. SATUAN (SCROLLABLE SAFELY BEHIND FROZEN COLUMNS) */}
                      <td 
                        className="border-b border-r border-slate-300 px-2 py-1 text-center font-sans text-[11px] bg-white group-hover/row:bg-blue-50/30"
                        style={{ width: '90px' }}
                      >
                        {isEditing && userCanEditDefinitions ? (
                          <select
                            value={rowData.satuan_id || ''}
                            onChange={(e) => handleDraftUpdate('satuan_id', e.target.value || null)}
                            className="w-full p-1 bg-white border border-blue-400 rounded text-xs outline-none"
                          >
                            <option value="">-</option>
                            {satuans.map(s => <option key={s.id} value={s.id}>{s.satuan}</option>)}
                          </select>
                        ) : (
                          <span className="text-slate-600 font-semibold">{row.satuan_nama || '-'}</span>
                        )}
                      </td>

                      {/* 5. SUMBER DATA (SCROLLABLE SAFELY BEHIND FROZEN COLUMNS) */}
                      <td 
                        className="border-b border-r border-slate-300 px-2 py-1 font-sans text-[11px] bg-white group-hover/row:bg-blue-50/30 truncate"
                        style={{ width: '130px' }}
                      >
                        {isEditing && userCanEditDefinitions ? (
                          <input
                            type="text"
                            value={rowData.sumber_data || ''}
                            onChange={(e) => handleDraftUpdate('sumber_data', e.target.value)}
                            className="w-full p-1 bg-white border border-blue-400 rounded text-xs outline-none"
                            placeholder="Sumber"
                          />
                        ) : (
                          <span className="text-slate-500">{row.sumber_data || '-'}</span>
                        )}
                      </td>

                      {/* 6. TAGGING TEMATIK (SCROLLABLE SAFELY BEHIND FROZEN COLUMNS) */}
                      <td 
                        className="border-b border-r border-slate-300 px-2 py-1 font-sans text-[11px] bg-white group-hover/row:bg-blue-50/30 truncate"
                        style={{ width: '150px' }}
                      >
                        {isEditing && userCanEditDefinitions ? (
                          <select
                            value={rowData.tematik_id || ''}
                            onChange={(e) => handleDraftUpdate('tematik_id', e.target.value || null)}
                            className="w-full p-1 bg-white border border-blue-400 rounded text-xs outline-none"
                          >
                            <option value="">(Belum Ada)</option>
                            {tematiks.map(t => <option key={t.id} value={t.id}>{t.nama}</option>)}
                          </select>
                        ) : (
                          <span className="text-slate-500">{row.tematik_nama || '-'}</span>
                        )}
                      </td>

                      {/* 7. DYNAMIC YEAR SPREADSHEET CELLS (SCROLLABLE SAFELY BEHIND FROZEN COLUMNS) */}
                      {years.map(year => {
                        const cellKey = `${year}_${viewMode}`;
                        const val = rowData.nilai[cellKey] || '';

                        return (
                          <td
                            key={year}
                            className="border-b border-r border-slate-300 p-1 text-right tabular-nums text-xs bg-white hover:bg-slate-100/70 group-hover/row:bg-blue-50/30"
                            style={{ width: '100px' }}
                          >
                            {isEditing && userCanEditValues ? (
                              <input
                                type="text"
                                value={val}
                                onChange={(e) => handleDraftNilaiUpdate(year, e.target.value)}
                                className="w-full text-right p-1 bg-blue-50/70 border border-blue-400 rounded text-xs font-bold outline-none font-mono"
                                placeholder="0"
                              />
                            ) : (
                              <span className={`block px-1.5 py-0.5 ${val ? 'font-bold text-slate-800' : 'text-slate-300'}`}>
                                {val || '-'}
                              </span>
                            )}
                          </td>
                        );
                      })}

                      {/* 8. AKSI CELL */}
                      <td 
                        className="border-b border-r border-slate-300 px-2 py-1 text-center bg-white group-hover/row:bg-blue-50/30"
                        style={{ width: '84px' }}
                      >
                        <div className="flex items-center justify-center gap-1">
                          {isEditing ? (
                            <>
                              <button
                                type="button"
                                onClick={handleSaveRow}
                                disabled={saving === `row-${row.id}`}
                                className="p-1.5 rounded text-emerald-600 hover:bg-emerald-50 font-bold transition-all"
                                title="Simpan Perubahan"
                              >
                                {saving === `row-${row.id}` ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                              </button>
                              <button
                                type="button"
                                onClick={handleCancelEdit}
                                disabled={saving === `row-${row.id}`}
                                className="p-1.5 rounded text-rose-500 hover:bg-rose-50 transition-all"
                                title="Batal Edit"
                              >
                                <X size={13} />
                              </button>
                            </>
                          ) : (
                            <>
                              {(userCanEditDefinitions || userCanEditValues) ? (
                                <button
                                  type="button"
                                  onClick={() => handleEditClick(row)}
                                  className="p-1.5 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
                                  title="Edit Baris Spreadsheet"
                                >
                                  <Edit2 size={13} />
                                </button>
                              ) : (
                                <Lock size={12} className="text-slate-300" />
                              )}

                              {userCanEditDefinitions && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteRow(row.id)}
                                  className="p-1.5 rounded text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-all"
                                  title="Hapus Baris"
                                >
                                  <Trash2 size={13} />
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

        {/* 3. EXCEL WORKSHEET TABS & STATUS BAR - SHARP EDGES (rounded-none) */}
        <div className="bg-slate-100 border-t border-slate-300 px-4 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 rounded-none">
          {/* Worksheet Tabs */}
          <div className="flex items-center gap-1 text-xs font-sans">
            <button
              type="button"
              onClick={() => setViewMode('realisasi')}
              className={`px-3 py-1 font-bold text-xs border-t-2 transition-all flex items-center gap-1.5 cursor-pointer rounded-none ${
                viewMode === 'realisasi'
                  ? 'bg-white shadow-xs'
                  : 'bg-slate-200/80 text-slate-600 border-transparent hover:bg-slate-200'
              }`}
              style={{
                borderTopColor: viewMode === 'realisasi' ? 'var(--theme-color-1, #0097fe)' : 'transparent',
                color: viewMode === 'realisasi' ? 'var(--theme-color-1, #0097fe)' : undefined
              }}
            >
              <span 
                className="w-2 h-2 rounded-full" 
                style={{ backgroundColor: 'var(--theme-color-1, #0097fe)' }}
              />
              <span>Sheet1: Realisasi Capaian</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('target')}
              className={`px-3 py-1 font-bold text-xs border-t-2 transition-all flex items-center gap-1.5 cursor-pointer rounded-none ${
                viewMode === 'target'
                  ? 'bg-white shadow-xs'
                  : 'bg-slate-200/80 text-slate-600 border-transparent hover:bg-slate-200'
              }`}
              style={{
                borderTopColor: viewMode === 'target' ? 'var(--theme-color-1, #0097fe)' : 'transparent',
                color: viewMode === 'target' ? 'var(--theme-color-1, #0097fe)' : undefined
              }}
            >
              <span 
                className="w-2 h-2 rounded-full" 
                style={{ backgroundColor: 'var(--theme-color-1, #0097fe)' }}
              />
              <span>Sheet2: Target RPJMD</span>
            </button>
          </div>

          {/* Status Bar */}
          <div className="flex items-center gap-3 text-[11px] text-slate-500 font-mono self-end sm:self-auto">
            <div className="flex items-center gap-1 font-bold" style={{ color: 'var(--theme-color-1, #0097fe)' }}>
              <ShieldCheck size={13} />
              <span>{isAuthorizedToAdd ? 'Izin Penuh (Superadmin / Otoritas)' : 'Izin Update Terbatas'}</span>
            </div>
            <span className="border-l border-slate-300 pl-3">TOTAL: {filteredData.length} BARIS</span>
            <span className="border-l border-slate-300 pl-3 hidden md:inline">RENTANG: {startYear}–{endYear}</span>
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
