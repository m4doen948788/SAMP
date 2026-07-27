import React, { useState, useEffect } from 'react';
import { 
  X, Settings, Calendar, CheckCircle2, AlertCircle, 
  FileText, Activity, Zap, Save, Loader2, Info
} from 'lucide-react';
import { api } from '@/src/services/api';

export interface MonthConfigItem {
  id?: number | null;
  bulan: number;
  nama_bulan: string;
  is_active: boolean;
  target_type: 'progress' | 'output';
  target_description: string;
}

interface SubKegiatanSkpConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  subKegiatanId?: number | null;
  butirSkpName?: string | null;
  subKegiatanName?: string;
  subKegiatanCode?: string;
  instansiId?: number | null;
  bidangId?: number | null;
  tahun?: number;
  onSaved?: () => void;
}

export default function SubKegiatanSkpConfigModal({
  isOpen,
  onClose,
  subKegiatanId = null,
  butirSkpName = null,
  subKegiatanName,
  subKegiatanCode,
  instansiId = null,
  bidangId = null,
  tahun = 2026,
  onSaved
}: SubKegiatanSkpConfigModalProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [months, setMonths] = useState<MonthConfigItem[]>([
    { bulan: 1, nama_bulan: 'Januari', is_active: true, target_type: 'output', target_description: '' },
    { bulan: 2, nama_bulan: 'Februari', is_active: true, target_type: 'output', target_description: '' },
    { bulan: 3, nama_bulan: 'Maret', is_active: true, target_type: 'output', target_description: '' },
    { bulan: 4, nama_bulan: 'April', is_active: true, target_type: 'output', target_description: '' },
    { bulan: 5, nama_bulan: 'Mei', is_active: true, target_type: 'output', target_description: '' },
    { bulan: 6, nama_bulan: 'Juni', is_active: true, target_type: 'output', target_description: '' },
    { bulan: 7, nama_bulan: 'Juli', is_active: true, target_type: 'output', target_description: '' },
    { bulan: 8, nama_bulan: 'Agustus', is_active: true, target_type: 'output', target_description: '' },
    { bulan: 9, nama_bulan: 'September', is_active: true, target_type: 'output', target_description: '' },
    { bulan: 10, nama_bulan: 'Oktober', is_active: true, target_type: 'output', target_description: '' },
    { bulan: 11, nama_bulan: 'November', is_active: true, target_type: 'output', target_description: '' },
    { bulan: 12, nama_bulan: 'Desember', is_active: true, target_type: 'output', target_description: '' },
  ]);

  const loadConfig = async () => {
    if (!subKegiatanId && !butirSkpName) return;
    setLoading(true);
    setError(null);
    try {
      let res: any;
      if (butirSkpName) {
        res = await api.skp.getSkpMonthlyConfigByButir(butirSkpName, bidangId || undefined, tahun);
      } else if (subKegiatanId) {
        res = await api.mappingKegiatanInstansi.getSubKegiatanSkpConfig(subKegiatanId, instansiId, tahun);
      }

      if (res && res.success && res.data && res.data.months) {
        setMonths(res.data.months);
      }
    } catch (err: any) {
      console.error('Failed to load SKP monthly config:', err);
      setError('Gagal memuat konfigurasi bulan SKP');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && (subKegiatanId || butirSkpName)) {
      loadConfig();
    }
  }, [isOpen, subKegiatanId, butirSkpName, instansiId, bidangId, tahun]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccessMsg(null);
    try {
      let res: any;
      if (butirSkpName) {
        res = await api.skp.saveSkpMonthlyConfigByButir({
          butir_skp: butirSkpName,
          bidang_id: bidangId || undefined,
          tahun,
          months
        });
      } else if (subKegiatanId) {
        res = await api.mappingKegiatanInstansi.saveSubKegiatanSkpConfig(subKegiatanId, {
          instansi_id: instansiId,
          tahun,
          months
        });
      }

      if (res && res.success) {
        setSuccessMsg('Konfigurasi bulan SKP berhasil disimpan!');
        if (onSaved) onSaved();
        setTimeout(() => {
          setSuccessMsg(null);
          onClose();
        }, 1200);
      } else {
        setError(res?.message || 'Gagal menyimpan konfigurasi');
      }
    } catch (err: any) {
      console.error('Failed to save SKP config:', err);
      setError(err.message || 'Terjadi kesalahan saat menyimpan');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = (bulan: number) => {
    setMonths(prev => prev.map(m => m.bulan === bulan ? { ...m, is_active: !m.is_active } : m));
  };

  const handleTypeChange = (bulan: number, type: 'progress' | 'output') => {
    setMonths(prev => prev.map(m => m.bulan === bulan ? { ...m, target_type: type } : m));
  };

  const handleDescChange = (bulan: number, text: string) => {
    setMonths(prev => prev.map(m => m.bulan === bulan ? { ...m, target_description: text } : m));
  };

  // Preset Handlers
  const applyPresetAllOutput = () => {
    setMonths(prev => prev.map(m => ({ ...m, is_active: true, target_type: 'output' })));
  };

  const applyPresetTriwulanan = () => {
    setMonths(prev => prev.map(m => ({
      ...m,
      is_active: [3, 6, 9, 12].includes(m.bulan),
      target_type: 'output'
    })));
  };

  const applyPresetSemesteran = () => {
    setMonths(prev => prev.map(m => ({
      ...m,
      is_active: [6, 12].includes(m.bulan),
      target_type: 'output'
    })));
  };

  const applyPresetProgressPlusFinal = () => {
    setMonths(prev => prev.map(m => ({
      ...m,
      is_active: true,
      target_type: m.bulan === 12 ? 'output' : 'progress'
    })));
  };

  if (!isOpen) return null;

  const displayName = subKegiatanName || butirSkpName || 'Sub-Kegiatan SKP';
  const displayCode = subKegiatanCode || 'BUTIR SKP';
  const activeCount = months.filter(m => m.is_active).length;
  const progressCount = months.filter(m => m.is_active && m.target_type === 'progress').length;
  const outputCount = months.filter(m => m.is_active && m.target_type === 'output').length;

  return (
    <div className="fixed inset-0 z-[300] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] my-auto">
        
        {/* Modal Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center text-indigo-300 shrink-0">
              <Settings size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  {displayCode}
                </span>
                <span className="text-[10px] font-bold text-slate-300">
                  Tahun {tahun}
                </span>
              </div>
              <h3 className="text-sm font-black text-white leading-tight mt-0.5 max-w-xl truncate">
                {displayName}
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 p-6 overflow-y-auto space-y-5 custom-scrollbar bg-slate-50">
          
          {/* Quick Presets Bar */}
          <div className="p-3.5 bg-white border border-slate-200/80 rounded-2xl shadow-2xs space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700">
              <span className="flex items-center gap-1.5 text-indigo-700 font-extrabold uppercase tracking-wide text-[11px]">
                <Zap size={14} className="text-amber-500" />
                Preset Konfigurasi Cepat:
              </span>
              <span className="text-[10px] text-slate-400 font-medium">Klik salah satu untuk menerapkan secara instan</span>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={applyPresetAllOutput}
                className="px-3 py-1.5 bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 border border-slate-200 hover:border-indigo-300 rounded-xl text-[11px] font-bold transition-all cursor-pointer active:scale-95"
              >
                12 Bulan Full Output
              </button>
              <button
                type="button"
                onClick={applyPresetTriwulanan}
                className="px-3 py-1.5 bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 border border-slate-200 hover:border-indigo-300 rounded-xl text-[11px] font-bold transition-all cursor-pointer active:scale-95"
              >
                Triwulanan (Bulan 3, 6, 9, 12)
              </button>
              <button
                type="button"
                onClick={applyPresetSemesteran}
                className="px-3 py-1.5 bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 border border-slate-200 hover:border-indigo-300 rounded-xl text-[11px] font-bold transition-all cursor-pointer active:scale-95"
              >
                Semesteran (Bulan 6 & 12)
              </button>
              <button
                type="button"
                onClick={applyPresetProgressPlusFinal}
                className="px-3 py-1.5 bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 border border-slate-200 hover:border-indigo-300 rounded-xl text-[11px] font-bold transition-all cursor-pointer active:scale-95"
              >
                Progress Bulanan + Output Akhir Tahun
              </button>
            </div>
          </div>

          {/* Feedback Messages */}
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 font-semibold flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-700 font-semibold flex items-center gap-2">
              <CheckCircle2 size={16} className="shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Loading Indicator */}
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center space-y-3">
              <Loader2 className="animate-spin text-indigo-600" size={32} />
              <span className="text-xs font-bold text-slate-500">Memuat data bulan SKP...</span>
            </div>
          ) : (
            /* 12 Months Vertical Stacked List (Ke Bawah) */
            <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden divide-y divide-slate-100">
              {/* Table Header */}
              <div className="p-3 px-4 bg-slate-100/90 text-[11px] font-black text-slate-600 uppercase tracking-wider grid grid-cols-12 gap-3 items-center select-none border-b border-slate-200/80">
                <div className="col-span-3 flex items-center gap-1">
                  <Calendar size={13} className="text-indigo-600" />
                  <span>Bulan Target SKP</span>
                </div>
                <div className="col-span-3 sm:col-span-2 text-center">Status Aktif</div>
                <div className="col-span-4 sm:col-span-4 text-center">Tipe Target SKP</div>
                <div className="col-span-2 sm:col-span-3">Catatan Target</div>
              </div>

              {/* Month Rows */}
              {months.map(m => {
                const isActive = m.is_active;
                return (
                  <div
                    key={m.bulan}
                    className={`p-3 px-4 grid grid-cols-12 gap-3 items-center transition-colors ${
                      isActive ? 'hover:bg-indigo-50/40 bg-white' : 'bg-slate-50/70 opacity-60'
                    }`}
                  >
                    {/* Month Name & Number */}
                    <div className="col-span-3 flex items-center gap-2.5">
                      <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black shrink-0 ${
                        isActive ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-200 text-slate-500'
                      }`}>
                        {m.bulan}
                      </span>
                      <span className="text-xs font-black text-slate-800">{m.nama_bulan}</span>
                    </div>

                    {/* Active Toggle Switch */}
                    <div className="col-span-3 sm:col-span-2 flex items-center justify-center gap-2">
                      <label className="relative inline-flex items-center cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={isActive}
                          onChange={() => handleToggleActive(m.bulan)}
                          className="sr-only peer"
                        />
                        <div className="w-8 h-4.5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-emerald-600"></div>
                      </label>
                      <span className={`text-[11px] font-extrabold hidden sm:inline ${isActive ? 'text-emerald-700' : 'text-slate-400'}`}>
                        {isActive ? 'Aktif' : 'Non-Aktif'}
                      </span>
                    </div>

                    {/* Target Type Selector */}
                    <div className="col-span-4 sm:col-span-4 flex items-center justify-center gap-1.5">
                      {isActive ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleTypeChange(m.bulan, 'progress')}
                            className={`flex-1 py-1.5 px-2 rounded-xl border text-[10px] font-black flex items-center justify-center gap-1 transition-all cursor-pointer ${
                              m.target_type === 'progress'
                                ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            <Activity size={12} />
                            <span>Progress (%)</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleTypeChange(m.bulan, 'output')}
                            className={`flex-1 py-1.5 px-2 rounded-xl border text-[10px] font-black flex items-center justify-center gap-1 transition-all cursor-pointer ${
                              m.target_type === 'output'
                                ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            <FileText size={12} />
                            <span>Output Final</span>
                          </button>
                        </>
                      ) : (
                        <span className="text-[11px] font-bold text-slate-400 italic">
                          Tidak Ada Penagihan (Non-Aktif)
                        </span>
                      )}
                    </div>

                    {/* Target Description Input */}
                    <div className="col-span-2 sm:col-span-3">
                      {isActive ? (
                        <input
                          type="text"
                          placeholder="Catatan target (opsional)..."
                          value={m.target_description || ''}
                          onChange={(e) => handleDescChange(m.bulan, e.target.value)}
                          className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-indigo-500 font-semibold transition-all"
                        />
                      ) : (
                        <span className="text-[11px] text-slate-300 italic">-</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Info Banner */}
          <div className="p-3 bg-indigo-50/80 border border-indigo-100 rounded-2xl text-[11px] text-indigo-900 font-medium flex items-start gap-2">
            <Info size={16} className="text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <strong>Catatan Sistem:</strong> Bulan yang disetting <strong>Non-Aktif</strong> tidak akan ditagih dokumen SKP-nya pada rekapitulasi kinerja pegawai. Bulan bermerek <strong>Progress</strong> mengharapkan upload laporan progres berkala, sedangkan <strong>Output Final</strong> mengharapkan berkas fisik/laporan hasil selesai.
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-white border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
            <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-lg text-[11px] font-black">
              {activeCount} / 12 Bulan Aktif
            </span>
            <span className="text-[11px] text-slate-400">
              ({progressCount} Progress, {outputCount} Output)
            </span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex-1 sm:flex-none px-5 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-black text-xs rounded-xl shadow-md shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {saving ? <Loader2 className="animate-spin" size={15} /> : <Save size={15} />}
              <span>Simpan Pengaturan Bulan SKP</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
