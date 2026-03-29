import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '../services/api';
import { 
  BarChart3, 
  Plus, 
  Trash2, 
  Search,
  Loader2,
  Eye,
  ShieldCheck,
  Lock,
  ArrowRight,
  Edit2,
  Save,
  X
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface MacroIndicator {
    id: number;
    kode: string; // New field
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

const DataMakro = () => {
    const { user } = useAuth();
    const userProfilId = user?.profil_pegawai_id; 
    const isSuperAdmin = user?.tipe_user_id === 1;
    
    // Config
    const startYear = 2025;
    const endYear = 2030;
    const years = Array.from({ length: endYear - startYear + 1 }, (_, i) => startYear + i);

    // State
    const [data, setData] = useState<MacroIndicator[]>([]);
    const [tematiks, setTematiks] = useState<Tematik[]>([]);
    const [satuans, setSatuans] = useState<Satuan[]>([]);
    const [otoritasList, setOtoritasList] = useState<number[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'target' | 'realisasi'>('target');
    const [searchTerm, setSearchTerm] = useState('');
    const [editingRowId, setEditingRowId] = useState<number | null>(null);
    const [editDraft, setEditDraft] = useState<MacroIndicator | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
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

    // Handlers
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
            
            // Check metadata changes
            const metaChanged = ['nama_data', 'kode', 'tematik_id', 'sumber_data', 'satuan_id'].some(
                k => (editDraft as Record<string, any>)[k] !== (original as Record<string, any>)[k]
            );
            if (metaChanged) {
                promises.push(api.dataMakro.update(editingRowId, editDraft));
            }

            // Check nilai changes
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
                fetchData();
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
            sumber_data: '',
            satuan_id: null,
            urutan: data.length + 1,
            is_active: 1
        };

        try {
            const res = await api.dataMakro.create(newRow);
            if (res.success) fetchData();
        } catch (err) {
            console.error('Add row failed:', err);
        }
    };

    const handleDeleteRow = async (id: number) => {
        const row = data.find(d => d.id === id);
        if (!row || !canEditIndicator(row) || !confirm('Hapus baris data ini?')) return;
        try {
            const res = await api.dataMakro.delete(id);
            if (res.success) fetchData();
        } catch (err) {
            console.error('Delete row failed:', err);
        }
    };

    const filteredData = data.filter(d => 
        d.nama_data.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.kode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.tematik_nama?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading && data.length === 0) {
        return (
            <div className="flex h-[400px] items-center justify-center">
                <Loader2 className="animate-spin text-indigo-500" size={32} />
            </div>
        );
    }

    // Fixed widths for sticky headers/columns to ensure alignment
    const colWidths = {
        indikator: 'min-w-[320px] w-[320px]',
        tagging: 'min-w-[180px] w-[180px]',
        prefix: 'min-w-[150px] w-[150px]',
        sumber: 'min-w-[150px] w-[150px]',
        satuan: 'min-w-[120px] w-[120px]',
        year: 'min-w-[110px] w-[110px]',
        aksi: 'min-w-[100px] w-[100px]'
    };

    return (
        <div className="space-y-6">
            {/* Toolbar */}
            <div className="bg-white/90 backdrop-blur-md p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-ppm-slate shadow-inner">
                        <BarChart3 size={24} />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-slate-800 tracking-tight">Data Makro</h1>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">RPJMD Monitoring System</p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input 
                            type="text" 
                            placeholder="Cari indikator atau kode..." 
                            className="pl-10 pr-4 py-2.5 bg-slate-50 border-transparent rounded-2xl text-xs font-bold w-full md:w-64 focus:bg-white focus:ring-2 focus:ring-ppm-slate/20 transition-all outline-none"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="flex items-center bg-slate-50 p-1 rounded-2xl shadow-inner border border-slate-100">
                        <button 
                            onClick={() => setViewMode('target')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black tracking-wider uppercase transition-all
                                ${viewMode === 'target' ? 'bg-white text-ppm-slate shadow-sm' : 'text-slate-400 hover:text-slate-600'}
                            `}
                        >
                            <Eye size={14} /> Target
                        </button>
                        <button 
                            onClick={() => setViewMode('realisasi')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black tracking-wider uppercase transition-all
                                ${viewMode === 'realisasi' ? 'bg-white text-ppm-slate shadow-sm' : 'text-slate-400 hover:text-slate-600'}
                            `}
                        >
                            <BarChart3 size={14} /> Realisasi
                        </button>
                    </div>

                    {isAuthorizedToAdd && (
                        <button 
                            onClick={handleAddRow}
                            className="btn-primary"
                        >
                            <Plus size={18} /> Tambah Data
                        </button>
                    )}
                </div>
            </div>

            {/* Table Area */}
            <div className="card-modern">
                <div className="max-h-[calc(100vh-280px)] overflow-auto custom-scrollbar overflow-x-auto">
                    <table className="w-full border-separate border-spacing-0">
                        <thead>
                            <tr>
                                <th 
                                    className={`top-0 left-0 border-r border-slate-200 border-b shadow-[4px_0_10px_-4px_rgba(0,0,0,0.1)] p-4 text-left text-[0.625rem] uppercase font-bold tracking-wider text-slate-500 bg-white z-[60] ${colWidths.indikator}`}
                                    style={{ position: 'sticky' }}
                                >
                                    INDIKATOR
                                </th>
                                <th className={`table-header top-0 bg-slate-50 z-40 ${colWidths.tagging}`} style={{ position: 'sticky' }}>TAGGING</th>
                                <th className={`table-header top-0 bg-slate-50 z-40 ${colWidths.prefix}`} style={{ position: 'sticky' }}>PENYEBUTAN</th>
                                <th className={`table-header top-0 bg-slate-50 z-40 ${colWidths.sumber}`} style={{ position: 'sticky' }}>SUMBER</th>
                                <th className={`table-header top-0 bg-slate-50 z-40 ${colWidths.satuan}`} style={{ position: 'sticky' }}>SATUAN</th>
                                
                                {years.map(y => (
                                    <th 
                                        key={y} 
                                        className={`table-header top-0 text-center border-l border-slate-100 bg-slate-50 z-40 ${colWidths.year}`}
                                        style={{ position: 'sticky' }}
                                    >
                                        {y}
                                        <div className={`text-[8px] font-bold mt-1 uppercase tracking-tighter opacity-80 ${viewMode === 'target' ? 'text-ppm-slate' : 'text-slate-500'}`}>
                                            {viewMode === 'target' ? 'Target' : 'Realisasi'}
                                        </div>
                                    </th>
                                ))}
                                <th 
                                    className={`table-header top-0 text-center border-l border-slate-100 bg-slate-50 z-40 ${colWidths.aksi}`}
                                    style={{ position: 'sticky' }}
                                >
                                    AKSI
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredData.map((row) => {
                                const userCanEditDefinitions = canEditIndicator(row);
                                const userCanEditValues = canEditValue(row);
                                const isEditing = editingRowId === row.id;
                                const rowData = isEditing && editDraft ? editDraft : row;

                                return (
                                    <tr key={row.id} className="group hover:bg-slate-50/50 transition-colors border-b border-slate-50">
                                        <td 
                                            className={`sticky left-0 bg-white group-hover:bg-slate-50 p-4 border-r border-slate-100 transition-colors shadow-[4px_0_8px_-4px_rgba(0,0,0,0.1)] z-50 ${colWidths.indikator}`}
                                        >
                                            <div className="flex items-center gap-2">
                                                {!userCanEditValues && <Lock size={12} className="text-slate-300 pointer-events-none" />}
                                                <textarea 
                                                    rows={2}
                                                    value={rowData.nama_data}
                                                    onChange={(e) => handleDraftUpdate('nama_data', e.target.value)}
                                                    className={`w-full border-none rounded-xl p-1 text-[11px] font-bold text-slate-600 uppercase tracking-tight outline-none resize-none transition-all ${isEditing && userCanEditDefinitions ? 'bg-slate-50/80 focus:bg-slate-100/50 cursor-text focus:ring-2 focus:ring-ppm-slate/20' : 'bg-transparent pointer-events-none cursor-default'}`}
                                                    readOnly={!isEditing || !userCanEditDefinitions}
                                                />
                                            </div>
                                        </td>
                                        <td className={`p-2 border-r border-slate-100 transition-colors ${colWidths.tagging}`}>
                                            <select 
                                                value={rowData.tematik_id || ''} 
                                                onChange={(e) => handleDraftUpdate('tematik_id', e.target.value || null)}
                                                className={`w-full border-none rounded-xl p-2 text-[10px] font-bold text-slate-500 outline-none appearance-none transition-all ${isEditing && userCanEditDefinitions ? 'bg-slate-50/80 focus:ring-2 focus:ring-ppm-slate/20 hover:bg-slate-100/50 cursor-pointer' : 'bg-transparent cursor-not-allowed pointer-events-none'}`}
                                                disabled={!isEditing || !userCanEditDefinitions}
                                            >
                                                <option value="">(Belum Ada)</option>
                                                {tematiks.map(t => <option key={t.id} value={t.id}>{t.nama}</option>)}
                                            </select>
                                        </td>
                                        <td className={`p-2 border-r border-slate-100 transition-colors ${colWidths.prefix}`}>
                                            <input 
                                                type="text" 
                                                placeholder="Penyebutan..."
                                                value={rowData.kode || ''}
                                                onChange={(e) => handleDraftUpdate('kode', e.target.value)}
                                                className={`w-full border-none rounded-xl p-2 text-[10px] font-black text-slate-800 outline-none transition-all ${isEditing && userCanEditDefinitions ? 'bg-slate-50/80 focus:ring-2 focus:ring-ppm-slate/20 hover:bg-slate-100/50 cursor-text' : 'bg-transparent cursor-not-allowed pointer-events-none'}`}
                                                disabled={!isEditing || !userCanEditDefinitions}
                                            />
                                        </td>
                                        <td className={`p-2 border-r border-slate-100 transition-colors ${colWidths.sumber}`}>
                                            <input 
                                                type="text" 
                                                placeholder="Sumber..."
                                                value={rowData.sumber_data || ''}
                                                onChange={(e) => handleDraftUpdate('sumber_data', e.target.value)}
                                                className={`w-full border-none rounded-xl p-2 text-[10px] font-bold text-slate-500 outline-none transition-all ${isEditing && userCanEditDefinitions ? 'bg-slate-50/80 focus:ring-2 focus:ring-ppm-slate/20 hover:bg-slate-100/50 cursor-text' : 'bg-transparent cursor-not-allowed pointer-events-none'}`}
                                                disabled={!isEditing || !userCanEditDefinitions}
                                            />
                                        </td>
                                        <td className={`p-2 border-r border-slate-100 transition-colors ${colWidths.satuan}`}>
                                            <select 
                                                value={rowData.satuan_id || ''} 
                                                onChange={(e) => handleDraftUpdate('satuan_id', e.target.value || null)}
                                                className={`w-full border-none rounded-xl p-2 text-[10px] font-bold text-slate-500 outline-none appearance-none transition-all ${isEditing && userCanEditDefinitions ? 'bg-slate-50/80 focus:ring-2 focus:ring-ppm-slate/20 hover:bg-slate-100/50 cursor-pointer' : 'bg-transparent cursor-not-allowed pointer-events-none'}`}
                                                disabled={!isEditing || !userCanEditDefinitions}
                                            >
                                                <option value="">Unit</option>
                                                {satuans.map(s => <option key={s.id} value={s.id}>{s.satuan}</option>)}
                                            </select>
                                        </td>

                                        {years.map(y => {
                                            const key = `${y}_${viewMode}`;
                                            const val = rowData.nilai[key] || '';

                                            return (
                                                <td key={y} className={`p-2 border-l border-slate-50 text-center ${colWidths.year}`}>
                                                    <div className="relative group/cell">
                                                        <input 
                                                            type="text" 
                                                            value={val}
                                                            placeholder="0"
                                                            onChange={(e) => handleDraftNilaiUpdate(y, e.target.value)}
                                                            className={`w-full text-center border-none rounded-lg p-2 text-[11px] font-black outline-none transition-all
                                                                ${val ? 'text-ppm-slate' : 'text-slate-300'}
                                                                ${isEditing && userCanEditValues ? 'hover:bg-slate-100/50 focus:bg-white focus:ring-2 focus:ring-ppm-slate/20 bg-slate-50/80 cursor-text' : 'bg-transparent pointer-events-none cursor-default'}
                                                            `}
                                                            disabled={!isEditing || !userCanEditValues}
                                                        />
                                                    </div>
                                                </td>
                                            );
                                        })}

                                        <td className={`p-2 text-center border-l border-slate-50 ${colWidths.aksi}`}>
                                            <div className="flex items-center justify-center gap-1">
                                                {isEditing ? (
                                                    <>
                                                        <button 
                                                            onClick={handleSaveRow}
                                                            className="text-emerald-500 hover:text-emerald-600 p-1.5 hover:bg-emerald-50 rounded-lg transition-all"
                                                            title="Simpan Perubahan"
                                                        >
                                                            {saving === `row-${row.id}` ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                                                        </button>
                                                        <button 
                                                            onClick={handleCancelEdit}
                                                            className="text-slate-400 hover:text-rose-500 p-1.5 hover:bg-rose-50 rounded-lg transition-all"
                                                            title="Batal Edit"
                                                            disabled={saving === `row-${row.id}`}
                                                        >
                                                            <X size={14} />
                                                        </button>
                                                    </>
                                                ) : userCanEditDefinitions || userCanEditValues ? (
                                                    <>
                                                        <button 
                                                            onClick={() => handleEditClick(row)}
                                                            className="text-slate-300 hover:text-indigo-500 p-1.5 hover:bg-indigo-50 rounded-lg transition-all"
                                                            title="Edit Baris"
                                                        >
                                                            <Edit2 size={14} />
                                                        </button>
                                                        {userCanEditDefinitions && (
                                                            <button 
                                                                onClick={() => handleDeleteRow(row.id)}
                                                                className="text-slate-300 hover:text-rose-500 p-1.5 hover:bg-rose-50 rounded-lg transition-all"
                                                                title="Hapus baris"
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        )}
                                                    </>
                                                ) : (
                                                    <Lock size={14} className="text-slate-200" />
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Footer Info */}
                <div className="bg-slate-50 px-6 py-4 flex items-center justify-between border-t border-slate-200">
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                            <ShieldCheck size={16} className="text-emerald-600" />
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                {isAuthorizedToAdd ? 'Izin Penulisan Penuh' : 'Izin Update Nilai Terbatas'}
                            </span>
                        </div>
                        <div className="h-4 w-px bg-slate-200"></div>
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-1.5">
                                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                <span className="text-[9px] font-bold text-slate-400 uppercase">Target</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                                <span className="text-[9px] font-bold text-slate-400 uppercase">Realisasi</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                         <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                            {filteredData.length} Indikator RPJMD
                        </p>
                        <ArrowRight size={14} className="text-slate-300" />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DataMakro;
