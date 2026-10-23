import React, { useState, useEffect } from 'react';
import { 
  Copy, Settings, Plus, Edit, Check, AlertCircle, 
  Layers, Building2, Save, Trash2, Calendar, ShieldCheck, Users
} from 'lucide-react';
import { kksApi } from '../services/kksApi';
import { KksPeriode, KksTatanan, KksIndikator } from '../types';
import { api } from '../../../services/api';
import { CrosscuttingSelect } from './CrosscuttingSelect';

interface Props {
  selectedTahun: number;
  availableYears: number[];
  onRefreshYears: () => void;
}

export const KksAdminSettings: React.FC<Props> = ({
  selectedTahun,
  availableYears,
  onRefreshYears
}) => {
  const [tatananList, setTatananList] = useState<KksTatanan[]>([]);
  const [activeTatananId, setActiveTatananId] = useState<number | null>(null);
  const [indicators, setIndicators] = useState<KksIndikator[]>([]);
  const [instansiList, setInstansiList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Admin Tab Switcher
  const [adminTab, setAdminTab] = useState<'indikator' | 'tatanan'>('indikator');

  // Clone Year Form State
  const [tahunAsal, setTahunAsal] = useState<number>(selectedTahun);
  const [tahunTujuan, setTahunTujuan] = useState<number>(selectedTahun + 1);
  const [namaPeriodeBaru, setNamaPeriodeBaru] = useState<string>(`Penilaian KKS Tahun ${selectedTahun + 1}`);
  const [isCloning, setIsCloning] = useState(false);

  // Edit Indicator Modal State
  const [editingInd, setEditingInd] = useState<KksIndikator | null>(null);
  const [editNomor, setEditNomor] = useState('');
  const [editNama, setEditNama] = useState('');
  const [editDO, setEditDO] = useState('');
  const [editSumberData, setEditSumberData] = useState('');
  const [editBukti, setEditBukti] = useState('');
  const [editOpdId, setEditOpdId] = useState<number | null>(null);
  const [editCrosscuttingIds, setEditCrosscuttingIds] = useState<number[]>([]);
  const [editKriteriaList, setEditKriteriaList] = useState<{ skor: number; kriteria: string }[]>([]);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Add Indicator Modal State
  const [isAddingInd, setIsAddingInd] = useState(false);
  const [newNomor, setNewNomor] = useState('');
  const [newNama, setNewNama] = useState('');
  const [newDO, setNewDO] = useState('');
  const [newBukti, setNewBukti] = useState('');
  const [newOpdId, setNewOpdId] = useState<number | null>(null);
  const [newCrosscuttingIds, setNewCrosscuttingIds] = useState<number[]>([]);
  const [isSavingNew, setIsSavingNew] = useState(false);

  // Tatanan State
  const [editingTatanan, setEditingTatanan] = useState<KksTatanan | null>(null);
  const [editTatananNomor, setEditTatananNomor] = useState<number>(0);
  const [editTatananNama, setEditTatananNama] = useState<string>('');
  const [editTatananBobot, setEditTatananBobot] = useState<number>(0);
  const [isSavingTatananEdit, setIsSavingTatananEdit] = useState(false);

  const [isAddingTatanan, setIsAddingTatanan] = useState(false);
  const [newTatananNomor, setNewTatananNomor] = useState<number>(1);
  const [newTatananNama, setNewTatananNama] = useState<string>('');
  const [newTatananBobot, setNewTatananBobot] = useState<number>(0);
  const [isSavingTatananNew, setIsSavingTatananNew] = useState(false);

  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3500);
  };

  // 1. Fetch Instansi List from Master
  useEffect(() => {
    const fetchInstansi = async () => {
      try {
        const res = await api.instansiDaerah.getAll();
        if (res.success && res.data) {
          setInstansiList(res.data);
        }
      } catch (err) {
        console.error('Error load master instansi:', err);
      }
    };
    fetchInstansi();
  }, []);

  // Helper untuk mendapatkan nama-nama instansi crosscutting
  const getCrosscuttingNames = (idsStr?: string | null) => {
    if (!idsStr) return [];
    const ids = idsStr.split(',').map(s => Number(s.trim())).filter(n => !isNaN(n) && n > 0);
    return ids.map(id => {
      const found = instansiList.find(i => i.id === id);
      return found ? (found.singkatan || found.instansi) : null;
    }).filter(Boolean) as string[];
  };

  // 2. Fetch Tatanan
  const fetchTatanan = async () => {
    try {
      const res = await kksApi.getTatananList(selectedTahun);
      if (res.success && res.data) {
        setTatananList(res.data);
        if (res.data.length > 0 && !activeTatananId) {
          setActiveTatananId(res.data[0].id);
        }
      }
    } catch (err) {
      console.error('Error load tatanan:', err);
    }
  };

  useEffect(() => {
    fetchTatanan();
  }, [selectedTahun]);

  // 3. Fetch Indicators
  const loadIndicators = async () => {
    setLoading(true);
    try {
      const res = await kksApi.getIndikatorList({
        tahun: selectedTahun,
        tatanan_id: activeTatananId || undefined
      });
      if (res.success && res.data) {
        setIndicators(res.data);
      }
    } catch (err) {
      console.error('Error load indicators:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIndicators();
  }, [selectedTahun, activeTatananId]);

  // Lock body scroll when any modal is open to prevent background scrolling (scroll chaining)
  useEffect(() => {
    const isAnyModalOpen = Boolean(editingInd || isAddingInd || editingTatanan || isAddingTatanan);
    if (isAnyModalOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [editingInd, isAddingInd, editingTatanan, isAddingTatanan]);

  // 4. Handle Clone Year
  const handleCloneYear = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!window.confirm(`Yakin ingin menduplikasi seluruh instrumen dari tahun ${tahunAsal} ke tahun ${tahunTujuan}?`)) {
      return;
    }

    setIsCloning(true);
    try {
      const res = await kksApi.cloneYear({
        tahun_asal: tahunAsal,
        tahun_tujuan: tahunTujuan,
        nama_periode: namaPeriodeBaru
      });

      if (res.success) {
        showToast('success', res.message || 'Instrumen berhasil disalin!');
        onRefreshYears();
      } else {
        showToast('error', res.message || 'Gagal menyalin instrumen');
      }
    } catch (err) {
      showToast('error', 'Terjadi kesalahan saat menyalin tahun');
    } finally {
      setIsCloning(false);
    }
  };

  // 5. Handle Save Indicator Edit
  const handleSaveEditInd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingInd) return;

    setIsSavingEdit(true);
    try {
      const selectedOpd = instansiList.find(i => i.id === editOpdId);
      const crosscuttingStr = editCrosscuttingIds.length > 0 ? editCrosscuttingIds.join(',') : null;

      const res = await kksApi.updateIndikator(editingInd.id, {
        nomor_indikator: editNomor,
        nama_indikator: editNama,
        definisi_operasional: editDO,
        sumber_data: editSumberData,
        bukti_dukung_dibutuhkan: editBukti,
        instansi_pengampu_id: editOpdId,
        instansi_pengampu_nama: selectedOpd ? (selectedOpd.singkatan || selectedOpd.instansi) : null,
        crosscutting_instansi_ids: crosscuttingStr,
        kriteria_skala: editKriteriaList.filter(k => k.kriteria && k.kriteria.trim().length > 0)
      });

      if (res.success) {
        showToast('success', 'Pengaturan indikator, pengampu, dan skala berhasil diperbarui!');
        setEditingInd(null);
        loadIndicators();
      } else {
        showToast('error', res.message || 'Gagal menyimpan pembaruan');
      }
    } catch (err) {
      showToast('error', 'Terjadi kesalahan');
    } finally {
      setIsSavingEdit(false);
    }
  };

  // 6. Handle Create Indicator
  const handleCreateInd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTatananId || !newNama) {
      showToast('error', 'Tatanan dan Nama Indikator wajib diisi!');
      return;
    }

    setIsSavingNew(true);
    try {
      const selectedOpd = instansiList.find(i => i.id === newOpdId);
      const crosscuttingStr = newCrosscuttingIds.length > 0 ? newCrosscuttingIds.join(',') : null;

      const res = await kksApi.createIndikator({
        tahun: selectedTahun,
        tatanan_id: activeTatananId,
        nomor_indikator: newNomor || '+',
        nama_indikator: newNama,
        definisi_operasional: newDO,
        bukti_dukung_dibutuhkan: newBukti,
        instansi_pengampu_id: newOpdId,
        instansi_pengampu_nama: selectedOpd ? (selectedOpd.singkatan || selectedOpd.instansi) : null,
        crosscutting_instansi_ids: crosscuttingStr
      });

      if (res.success) {
        showToast('success', 'Indikator baru berhasil ditambahkan!');
        setIsAddingInd(false);
        setNewNomor('');
        setNewNama('');
        setNewDO('');
        setNewBukti('');
        setNewOpdId(null);
        setNewCrosscuttingIds([]);
        loadIndicators();
      } else {
        showToast('error', res.message || 'Gagal menambahkan indikator');
      }
    } catch (err) {
      showToast('error', 'Terjadi kesalahan saat menambah indikator');
    } finally {
      setIsSavingNew(false);
    }
  };

  // 7. Handle Delete Indicator
  const handleDeleteInd = async (id: number) => {
    if (!window.confirm('Yakin ingin menghapus indikator ini?')) return;
    try {
      const res = await kksApi.deleteIndikator(id);
      if (res.success) {
        showToast('success', 'Indikator berhasil dihapus');
        loadIndicators();
      } else {
        showToast('error', res.message || 'Gagal menghapus indikator');
      }
    } catch (err) {
      showToast('error', 'Terjadi kesalahan saat menghapus indikator');
    }
  };

  // 8. Handle Save Tatanan Edit
  const handleSaveEditTatanan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTatanan) return;
    setIsSavingTatananEdit(true);
    try {
      const res = await kksApi.updateTatanan(editingTatanan.id, {
        nomor_tatanan: editTatananNomor,
        nama_tatanan: editTatananNama,
        bobot: editTatananBobot
      });
      if (res.success) {
        showToast('success', 'Tatanan berhasil diperbarui!');
        setEditingTatanan(null);
        fetchTatanan();
      } else {
        showToast('error', res.message || 'Gagal memperbarui tatanan');
      }
    } catch (err) {
      showToast('error', 'Terjadi kesalahan');
    } finally {
      setIsSavingTatananEdit(false);
    }
  };

  // 9. Handle Create Tatanan
  const handleCreateTatanan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTatananNama) {
      showToast('error', 'Nama tatanan wajib diisi!');
      return;
    }
    setIsSavingTatananNew(true);
    try {
      const res = await kksApi.createTatanan({
        tahun: selectedTahun,
        nomor_tatanan: newTatananNomor,
        nama_tatanan: newTatananNama,
        bobot: newTatananBobot,
        urutan: newTatananNomor
      });
      if (res.success) {
        showToast('success', 'Tatanan baru berhasil ditambahkan!');
        setIsAddingTatanan(false);
        setNewTatananNama('');
        setNewTatananNomor((tatananList.length || 0) + 1);
        setNewTatananBobot(0);
        fetchTatanan();
      } else {
        showToast('error', res.message || 'Gagal membuat tatanan');
      }
    } catch (err) {
      showToast('error', 'Terjadi kesalahan saat menambah tatanan');
    } finally {
      setIsSavingTatananNew(false);
    }
  };

  // 10. Handle Delete Tatanan
  const handleDeleteTatanan = async (id: number) => {
    if (!window.confirm('Yakin ingin menghapus tatanan ini? Pastikan tidak ada indikator yang terhubung.')) return;
    try {
      const res = await kksApi.deleteTatanan(id);
      if (res.success) {
        showToast('success', 'Tatanan berhasil dihapus');
        fetchTatanan();
      } else {
        showToast('error', res.message || 'Gagal menghapus tatanan');
      }
    } catch (err) {
      showToast('error', 'Terjadi kesalahan saat menghapus tatanan');
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* TOAST */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 p-4 rounded-2xl shadow-xl flex items-center gap-3 text-xs font-bold text-white transition-all ${
          toast.type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'
        }`}>
          {toast.type === 'success' ? <Check className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <span>{toast.text}</span>
        </div>
      )}

      {/* HEADER */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <Settings className="w-5 h-5 text-amber-600" />
            <span>Pengaturan Master Instrumen KKS Dinamis</span>
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Kelola instrumen penilaian tahunan, pemetaan OPD pengampu, dan duplikasi master tahun baru
          </p>
        </div>

        <div className="flex items-center gap-2 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200 text-xs font-bold text-amber-800">
          <ShieldCheck className="w-4 h-4 text-amber-600" />
          <span>Khusus Superadmin / Bapperida</span>
        </div>
      </div>

      {/* 1. KOTAK SALIN INSTRUMEN KE TAHUN BERIKUTNYA (CLONE YEAR) */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-3xl p-6 sm:p-8 shadow-xl shadow-slate-900/10 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-400/30">
            <Copy className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-black tracking-tight text-white">
              Salin Master Instrumen ke Tahun Berikutnya (Clone Year)
            </h3>
            <p className="text-xs text-slate-300">
              Duplikasi otomatis seluruh 10 Tatanan, 180+ Indikator, dan skala kriteria ke tahun baru dalam 1 klik.
            </p>
          </div>
        </div>

        <form onSubmit={handleCloneYear} className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-2">
          <div>
            <label className="block text-[11px] font-bold text-slate-300 mb-1">Tahun Sumber (Asal)</label>
            <select
              value={tahunAsal}
              onChange={(e) => setTahunAsal(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-xs font-bold text-white cursor-pointer focus:outline-none"
            >
              {availableYears.map(y => (
                <option key={y} value={y} className="text-slate-900">Tahun {y}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-300 mb-1">Tahun Baru (Target)</label>
            <input
              type="number"
              required
              value={tahunTujuan}
              onChange={(e) => {
                const val = Number(e.target.value);
                setTahunTujuan(val);
                setNamaPeriodeBaru(`Penilaian KKS Tahun ${val}`);
              }}
              className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-xs font-bold text-white focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-300 mb-1">Nama Periode Baru</label>
            <input
              type="text"
              required
              value={namaPeriodeBaru}
              onChange={(e) => setNamaPeriodeBaru(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-xs font-bold text-white focus:outline-none"
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={isCloning}
              className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black shadow-md shadow-amber-500/20 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <Copy className="w-4 h-4" />
              <span>{isCloning ? 'Menyalin Data...' : 'Salin Master Sekarang'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* 2. SUB-NAV TABS: INDIKATOR vs TATANAN */}
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 pb-3">
        <button
          type="button"
          onClick={() => setAdminTab('indikator')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-black text-xs transition-all ${
            adminTab === 'indikator'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Master Indikator & Pengampu OPD</span>
        </button>

        <button
          type="button"
          onClick={() => setAdminTab('tatanan')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-black text-xs transition-all ${
            adminTab === 'tatanan'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Master Struktur Tatanan ({tatananList.length} Tatanan)</span>
        </button>
      </div>

      {/* 3A. TAB MASTER INDIKATOR */}
      {adminTab === 'indikator' && (
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-black text-slate-800">
              Daftar Indikator Tahun {selectedTahun} & OPD Pengampu
            </h3>
            <p className="text-xs text-slate-500">
              Pilih tatanan dan klik "Edit Pengampu / Indikator" untuk mengubah penugasan dinas.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Tatanan Selector */}
            <select
              value={activeTatananId || ''}
              onChange={(e) => setActiveTatananId(Number(e.target.value))}
              className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
            >
              {tatananList.map(t => (
                <option key={t.id} value={t.id}>
                  {t.nomor_tatanan === 0 ? 'Kelembagaan' : `Tatanan ${t.nomor_tatanan}`}: {t.nama_tatanan}
                </option>
              ))}
            </select>

            <button
              onClick={() => setIsAddingInd(true)}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm flex items-center gap-1.5 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Indikator</span>
            </button>
          </div>
        </div>

        {/* Tabel Indikator */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] font-black uppercase text-slate-400">
                <th className="py-2.5 px-3 w-16">No</th>
                <th className="py-2.5 px-3">Nama Indikator</th>
                <th className="py-2.5 px-3">Dinas Pengampu Utama</th>
                <th className="py-2.5 px-3">Bukti Dukung</th>
                <th className="py-2.5 px-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400 font-bold">
                    Memuat data...
                  </td>
                </tr>
              ) : indicators.map((ind) => (
                <tr key={ind.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-3 font-black text-slate-700">
                    {ind.nomor_indikator}
                  </td>
                  <td className="py-3 px-3">
                    <div className="text-[13px] md:text-sm font-black text-slate-900 leading-snug tracking-tight">{ind.nama_indikator}</div>
                    {ind.definisi_operasional && (
                      <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{ind.definisi_operasional}</div>
                    )}
                  </td>
                  <td className="py-3 px-3">
                    <div className="space-y-1">
                      <span className="inline-flex items-center gap-1 font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-full text-[11px]">
                        <Building2 className="w-3 h-3" />
                        <span>{ind.instansi_pengampu_nama || 'Belum Diatur'}</span>
                      </span>

                      {getCrosscuttingNames(ind.crosscutting_instansi_ids).length > 0 && (
                        <div className="flex flex-wrap items-center gap-1">
                          <span 
                            className="inline-flex items-center gap-1 font-semibold text-[10px] px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200"
                            title={`Dinas Terkait (Crosscutting): ${getCrosscuttingNames(ind.crosscutting_instansi_ids).join(', ')}`}
                          >
                            <Users className="w-3 h-3 text-indigo-600" />
                            <span>Lintas: {getCrosscuttingNames(ind.crosscutting_instansi_ids).slice(0, 2).join(', ')}{getCrosscuttingNames(ind.crosscutting_instansi_ids).length > 2 ? ` +${getCrosscuttingNames(ind.crosscutting_instansi_ids).length - 2}` : ''}</span>
                          </span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-3 max-w-xs truncate text-slate-500 text-[11px]">
                    {ind.bukti_dukung_dibutuhkan || '-'}
                  </td>
                  <td className="py-3 px-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => {
                          setEditingInd(ind);
                          setEditNomor(ind.nomor_indikator);
                          setEditNama(ind.nama_indikator);
                          setEditDO(ind.definisi_operasional || '');
                          setEditSumberData(ind.sumber_data || '');
                          setEditBukti(ind.bukti_dukung_dibutuhkan || '');
                          setEditOpdId(ind.instansi_pengampu_id || null);

                          const crossIds = ind.crosscutting_instansi_ids
                            ? ind.crosscutting_instansi_ids.split(',').map(s => Number(s.trim())).filter(n => !isNaN(n) && n > 0)
                            : [];
                          setEditCrosscuttingIds(crossIds);

                          const standardScores = [100, 75, 50, 25, 0];
                          const kriteriaMap: { [key: number]: string } = {};
                          if (ind.kriteria_skala) {
                            ind.kriteria_skala.forEach(k => {
                              kriteriaMap[k.skor] = k.kriteria;
                            });
                          }
                          const list = standardScores.map(s => ({
                            skor: s,
                            kriteria: kriteriaMap[s] || ''
                          }));
                          setEditKriteriaList(list);
                        }}
                        className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 font-bold transition-all inline-flex items-center gap-1 text-[11px]"
                        title="Ubah Pengampu & Rincian"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => handleDeleteInd(ind.id)}
                        className="p-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-400 hover:text-rose-600 font-bold transition-all"
                        title="Hapus Indikator"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* 3B. TAB MASTER TATANAN */}
      {adminTab === 'tatanan' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-black text-slate-800">
                Struktur Tatanan KKS Tahun {selectedTahun}
              </h3>
              <p className="text-xs text-slate-500">
                Daftar tatanan evaluasi. Anda dapat mengubah penamaan, nomor urut, bobot, atau menambah tatanan baru jika terjadi perubahan regulasi pusat.
              </p>
            </div>

            <button
              onClick={() => {
                setNewTatananNomor(tatananList.length);
                setNewTatananNama('');
                setNewTatananBobot(0);
                setIsAddingTatanan(true);
              }}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm flex items-center gap-1.5 transition-all self-start sm:self-auto"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Tatanan Baru</span>
            </button>
          </div>

          {/* Tabel Tatanan */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-black uppercase text-slate-400">
                  <th className="py-2.5 px-3 w-32">Nomor</th>
                  <th className="py-2.5 px-3">Kode Tatanan</th>
                  <th className="py-2.5 px-3">Nama Tatanan</th>
                  <th className="py-2.5 px-3 w-28">Bobot (%)</th>
                  <th className="py-2.5 px-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tatananList.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 font-black text-slate-800">
                      {t.nomor_tatanan === 0 ? '0 (Kelembagaan)' : `Tatanan ${t.nomor_tatanan}`}
                    </td>
                    <td className="py-3 px-3 font-mono text-[11px] text-slate-500">
                      {t.kode_tatanan}
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-900">{t.nama_tatanan}</div>
                      {t.deskripsi && (
                        <div className="text-[11px] text-slate-400 mt-0.5">{t.deskripsi}</div>
                      )}
                    </td>
                    <td className="py-3 px-3 font-bold text-slate-700">
                      {t.bobot ? `${t.bobot}%` : '0%'}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setEditingTatanan(t);
                            setEditTatananNomor(t.nomor_tatanan);
                            setEditTatananNama(t.nama_tatanan);
                            setEditTatananBobot(Number(t.bobot) || 0);
                          }}
                          className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 font-bold transition-all inline-flex items-center gap-1 text-[11px]"
                          title="Ubah Rincian Tatanan"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => handleDeleteTatanan(t.id)}
                          className="p-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-400 hover:text-rose-600 font-bold transition-all"
                          title="Hapus Tatanan"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL EDIT INDIKATOR & PENGAMPU OPD */}
      {editingInd && (
        <div 
          onClick={() => setEditingInd(null)}
          className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 overscroll-contain"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-xl w-full max-h-[90vh] overflow-y-auto overscroll-contain p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200 text-xs"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-black text-slate-900 text-sm">Edit Indikator & Skala Penilaian</h3>
                <p className="text-[11px] text-slate-500">Nomor Indikator: {editingInd.nomor_indikator}</p>
              </div>
              <button 
                onClick={() => setEditingInd(null)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditInd} className="space-y-3 font-medium">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block font-bold text-slate-700 mb-1">Nomor Indikator *</label>
                  <input
                    type="text"
                    required
                    value={editNomor}
                    onChange={(e) => setEditNomor(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-bold text-slate-800 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">Dinas Pengampu (OPD)</label>
                  <select
                    value={editOpdId || ''}
                    onChange={(e) => setEditOpdId(Number(e.target.value) || null)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-bold text-slate-800"
                  >
                    <option value="">-- Pilih Dinas Pengampu --</option>
                    {instansiList.map((inst) => (
                      <option key={inst.id} value={inst.id}>
                        {inst.singkatan ? `${inst.singkatan} - ${inst.instansi}` : inst.instansi}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* DROPDOWN CROSSCUTTING DINAS */}
              <div>
                <label className="block font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span>Crosscutting Dinas (Dinas Terkait / Lintas Sektor)</span>
                  <span className="text-[10px] text-slate-400 font-normal">Bisa pilih beberapa dinas pendukung</span>
                </label>
                <CrosscuttingSelect
                  instansiList={instansiList}
                  selectedIds={editCrosscuttingIds}
                  onChange={setEditCrosscuttingIds}
                  pengampuId={editOpdId}
                  placeholder="Pilih satu atau beberapa dinas crosscutting..."
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Nama Indikator *</label>
                <textarea
                  rows={2}
                  required
                  value={editNama}
                  onChange={(e) => setEditNama(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Definisi Operasional</label>
                <textarea
                  rows={3}
                  value={editDO}
                  onChange={(e) => setEditDO(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Sumber Data</label>
                <textarea
                  rows={2}
                  value={editSumberData}
                  onChange={(e) => setEditSumberData(e.target.value)}
                  placeholder="Contoh: Aplikasi MPDN / Laporan Dinas Terkait..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Bukti Dukung yang Diminta</label>
                <textarea
                  rows={2}
                  value={editBukti}
                  onChange={(e) => setEditBukti(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* EDITOR SKALA PENILAIAN */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <label className="block font-black text-slate-800">
                    Panduan Skala Penilaian & Kriteria Capaian
                  </label>
                  <span className="text-[10px] text-slate-400">Atur kriteria untuk setiap skor</span>
                </div>

                <div className="space-y-2">
                  {editKriteriaList.map((item, idx) => (
                    <div key={item.skor} className="flex items-start gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200">
                      <span className="px-2 py-1.5 rounded-lg bg-emerald-600 text-white font-black text-xs shrink-0 w-12 text-center mt-0.5">
                        {item.skor}
                      </span>
                      <textarea
                        rows={2}
                        value={item.kriteria}
                        onChange={(e) => {
                          const updated = [...editKriteriaList];
                          updated[idx].kriteria = e.target.value;
                          setEditKriteriaList(updated);
                        }}
                        placeholder={`Kriteria jika capaian bernilai ${item.skor}...`}
                        className="w-full px-2 py-1.5 rounded-lg bg-white border border-slate-200 text-xs focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingInd(null)}
                  className="px-4 py-2 rounded-xl font-bold text-slate-600 hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="px-5 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 font-black shadow-md shadow-emerald-600/20 disabled:opacity-50"
                >
                  {isSavingEdit ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL TAMBAH INDIKATOR BARU */}
      {isAddingInd && (
        <div 
          onClick={() => setIsAddingInd(false)}
          className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 overscroll-contain"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200 text-xs overscroll-contain"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-black text-slate-900 text-sm">Tambah Indikator Baru</h3>
                <p className="text-[11px] text-slate-500">
                  Tatanan: {tatananList.find(t => t.id === activeTatananId)?.nama_tatanan} (Tahun {selectedTahun})
                </p>
              </div>
              <button 
                onClick={() => setIsAddingInd(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateInd} className="space-y-3 font-medium">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block font-bold text-slate-700 mb-1">Nomor Indikator *</label>
                  <input
                    type="text"
                    required
                    placeholder="misal: 1.15"
                    value={newNomor}
                    onChange={(e) => setNewNomor(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-bold text-slate-800 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">Dinas Pengampu (OPD)</label>
                  <select
                    value={newOpdId || ''}
                    onChange={(e) => setNewOpdId(Number(e.target.value) || null)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-bold text-slate-800"
                  >
                    <option value="">-- Pilih Dinas Pengampu --</option>
                    {instansiList.map((inst) => (
                      <option key={inst.id} value={inst.id}>
                        {inst.singkatan ? `${inst.singkatan} - ${inst.instansi}` : inst.instansi}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* DROPDOWN CROSSCUTTING DINAS */}
              <div>
                <label className="block font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span>Crosscutting Dinas (Dinas Terkait / Lintas Sektor)</span>
                  <span className="text-[10px] text-slate-400 font-normal">Bisa pilih beberapa dinas pendukung</span>
                </label>
                <CrosscuttingSelect
                  instansiList={instansiList}
                  selectedIds={newCrosscuttingIds}
                  onChange={setNewCrosscuttingIds}
                  pengampuId={newOpdId}
                  placeholder="Pilih satu atau beberapa dinas crosscutting..."
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Nama Indikator *</label>
                <textarea
                  rows={2}
                  required
                  placeholder="Ketik nama indikator..."
                  value={newNama}
                  onChange={(e) => setNewNama(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Definisi Operasional</label>
                <textarea
                  rows={3}
                  placeholder="Ketik petunjuk / definisi operasional..."
                  value={newDO}
                  onChange={(e) => setNewDO(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Bukti Dukung yang Dibutuhkan</label>
                <textarea
                  rows={2}
                  placeholder="misal: SK Tim Pembina, Laporan Kegiatan, dsb..."
                  value={newBukti}
                  onChange={(e) => setNewBukti(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddingInd(false)}
                  className="px-4 py-2 rounded-xl font-bold text-slate-600 hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSavingNew}
                  className="px-5 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 font-black shadow-md shadow-emerald-600/20 disabled:opacity-50"
                >
                  {isSavingNew ? 'Menyimpan...' : 'Tambah Indikator'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EDIT TATANAN */}
      {editingTatanan && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-black text-slate-900 text-sm">Edit Tatanan KKS</h3>
                <p className="text-[11px] text-slate-500">Tahun: {selectedTahun}</p>
              </div>
              <button 
                onClick={() => setEditingTatanan(null)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditTatanan} className="space-y-3 font-medium">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nomor Tatanan (0 untuk Kelembagaan)</label>
                <input
                  type="number"
                  required
                  value={editTatananNomor}
                  onChange={(e) => setEditTatananNomor(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-bold text-slate-800 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Nama Tatanan *</label>
                <textarea
                  rows={2}
                  required
                  value={editTatananNama}
                  onChange={(e) => setEditTatananNama(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Bobot Penilaian (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={editTatananBobot}
                  onChange={(e) => setEditTatananBobot(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-bold text-slate-800 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingTatanan(null)}
                  className="px-4 py-2 rounded-xl font-bold text-slate-600 hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSavingTatananEdit}
                  className="px-5 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 font-black shadow-md shadow-emerald-600/20 disabled:opacity-50"
                >
                  {isSavingTatananEdit ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL TAMBAH TATANAN BARU */}
      {isAddingTatanan && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-black text-slate-900 text-sm">Tambah Tatanan Baru</h3>
                <p className="text-[11px] text-slate-500">Tahun: {selectedTahun}</p>
              </div>
              <button 
                onClick={() => setIsAddingTatanan(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTatanan} className="space-y-3 font-medium">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nomor Tatanan *</label>
                <input
                  type="number"
                  required
                  value={newTatananNomor}
                  onChange={(e) => setNewTatananNomor(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-bold text-slate-800 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Nama Tatanan *</label>
                <textarea
                  rows={2}
                  required
                  placeholder="misal: Tatanan 10: Ketahanan Pangan..."
                  value={newTatananNama}
                  onChange={(e) => setNewTatananNama(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Bobot Penilaian (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={newTatananBobot}
                  onChange={(e) => setNewTatananBobot(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-bold text-slate-800 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddingTatanan(false)}
                  className="px-4 py-2 rounded-xl font-bold text-slate-600 hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSavingTatananNew}
                  className="px-5 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 font-black shadow-md shadow-emerald-600/20 disabled:opacity-50"
                >
                  {isSavingTatananNew ? 'Menyimpan...' : 'Tambah Tatanan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
