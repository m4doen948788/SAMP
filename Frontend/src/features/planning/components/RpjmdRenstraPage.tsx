import React, { useState, useEffect } from 'react';
import { 
  Building2, Calendar, ShieldCheck, Lock, Unlock, Plus, Edit2, Trash2, 
  CheckCircle2, AlertCircle, FileText, ChevronRight, Search, MoreVertical, 
  Copy, Zap, BarChart3, Save, RefreshCw, Send, Check, BookOpen
} from 'lucide-react';
import { QafPopover } from '../../../components/shared/QafPopover';

interface Periode {
  id: number;
  nama_periode: string;
  tahun_awal: number;
  tahun_akhir: number;
  status_dokumen: string;
  is_active: boolean;
}

interface Instansi {
  id: number;
  nama_instansi: string;
  singkatan?: string;
}

interface RPJMDSasaran {
  id: number;
  kode_sasaran: string;
  sasaran: string;
  indikator: string;
  satuan: string;
  baseline_t0: string;
  target_t1: string;
  target_t2: string;
  target_t3: string;
  target_t4: string;
  target_t5: string;
  target_akhir: string;
  pagu_t1: number;
  pagu_t2: number;
  pagu_t3: number;
  pagu_t4: number;
  pagu_t5: number;
  pagu_total: number;
}

interface RPJMDTujuan {
  id: number;
  kode_tujuan: string;
  tujuan: string;
  indikator: string;
  satuan: string;
  sasaran_list: RPJMDSasaran[];
}

interface RPJMDMisi {
  id: number;
  kode_misi: string;
  misi: string;
  tujuan_list: RPJMDTujuan[];
}

interface RPJMDVisi {
  id: number;
  visi: string;
  misi_list: RPJMDMisi[];
}

interface RenstraSubKegiatan {
  id: number;
  periode_id: number;
  instansi_id: number;
  renstra_sasaran_id: number | null;
  kode_program: string;
  nama_program: string;
  kode_kegiatan: string;
  nama_kegiatan: string;
  kode_sub_kegiatan: string;
  nama_sub_kegiatan: string;
  indikator: string;
  satuan: string;
  baseline_t0: string;
  target_t1: string;
  target_t2: string;
  target_t3: string;
  target_t4: string;
  target_t5: string;
  target_akhir: string;
  pagu_t1: number;
  pagu_t2: number;
  pagu_t3: number;
  pagu_t4: number;
  pagu_t5: number;
  pagu_total: number;
  is_quick_access: boolean;
  renstra_sasaran_nama?: string;
  rpjmd_sasaran_nama?: string;
}

interface VerifikasiStatus {
  status: 'draft' | 'submitted' | 'revisi' | 'approved';
  is_locked: boolean;
  catatan_bapperida?: string;
}

const RpjmdRenstraPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'rpjmd' | 'renstra'>('rpjmd');
  const [periodeList, setPeriodeList] = useState<Periode[]>([]);
  const [selectedPeriodeId, setSelectedPeriodeId] = useState<number | ''>('');
  const [instansiList, setInstansiList] = useState<Instansi[]>([]);
  const [selectedInstansiId, setSelectedInstansiId] = useState<number | ''>('');
  
  const [rpjmdData, setRpjmdData] = useState<RPJMDVisi[]>([]);
  const [renstraData, setRenstraData] = useState<RenstraSubKegiatan[]>([]);
  const [verifikasi, setVerifikasi] = useState<VerifikasiStatus>({ status: 'draft', is_locked: false });
  const [loading, setLoading] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');

  // User details & permission (Always allow management on RPJMD & Renstra for logged in planning users)
  const user = JSON.parse(sessionStorage.getItem('user') || localStorage.getItem('user') || '{}');
  const isBapperida = true;

  // Modal State for Renstra Input
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<Partial<RenstraSubKegiatan>>({});

  // Modal State for RPJMD Input (Visi, Misi, Tujuan, Sasaran)
  const [rpjmdModalOpen, setRpjmdModalOpen] = useState<boolean>(false);
  const [rpjmdModalType, setRpjmdModalType] = useState<'visi' | 'misi' | 'tujuan' | 'sasaran'>('visi');
  const [rpjmdForm, setRpjmdForm] = useState<any>({});

  // RPJPD Reference List & Drawer State
  const [rpjpdSasaranList, setRpjpdSasaranList] = useState<any[]>([]);
  const [rpjpdDrawerOpen, setRpjpdDrawerOpen] = useState<boolean>(false);

  // QAF Popover state
  const [qafAnchor, setQafAnchor] = useState<{ top: number; left: number; item: RenstraSubKegiatan } | null>(null);

  // Notification Banner
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showNotif = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const getToken = () => sessionStorage.getItem('token') || localStorage.getItem('token');

  // Helper: Extract flat list of all RPJMD Sasaran for cascading
  const allRpjmdSasaranList = rpjmdData.flatMap(v => 
    v.misi_list.flatMap(m => 
      m.tujuan_list.flatMap(t => t.sasaran_list)
    )
  );

  // Fetch Periode, Instansi, & RPJPD
  useEffect(() => {
    fetchPeriode();
    fetchInstansi();
    fetchRPJPD();
  }, []);

  const fetchRPJPD = async () => {
    try {
      const res = await fetch('/api/rpjpd', {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      const data = await res.json();
      if (data.success || Array.isArray(data)) {
        const list = Array.isArray(data) ? data : data.data || [];
        const flatSasaran = list.flatMap((v: any) =>
          (v.misi_list || []).flatMap((m: any) => m.sasaran_list || [])
        );
        setRpjpdSasaranList(flatSasaran);
      }
    } catch (err) {
      console.error('Error fetching RPJPD reference:', err);
    }
  };

  useEffect(() => {
    if (selectedPeriodeId) {
      fetchRPJMD();
      fetchRenstra();
    }
  }, [selectedPeriodeId, selectedInstansiId, activeTab]);

  const handleSaveRPJMDItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const endpoint = `/api/planning/rpjmd-renstra/rpjmd/${rpjmdModalType}`;
      const payload = {
        ...rpjmdForm,
        periode_id: selectedPeriodeId ? Number(selectedPeriodeId) : (periodeList[0]?.id || 1)
      };
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        showNotif('success', data.message);
        setRpjmdModalOpen(false);
        setRpjmdForm({});
        fetchRPJMD();
      } else {
        showNotif('error', data.message);
      }
    } catch (err: any) {
      showNotif('error', err.message);
    }
  };

  const handleDeleteRPJMDItem = async (type: 'visi' | 'misi' | 'tujuan' | 'sasaran', id: number) => {
    if (!window.confirm(`Apakah Anda yakin ingin menghapus ${type.toUpperCase()} ini?`)) return;
    try {
      const res = await fetch(`/api/planning/rpjmd-renstra/rpjmd/${type}/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      const data = await res.json();
      if (data.success) {
        showNotif('success', data.message);
        fetchRPJMD();
      } else {
        showNotif('error', data.message);
      }
    } catch (err: any) {
      showNotif('error', err.message);
    }
  };

  const fetchPeriode = async () => {
    try {
      const res = await fetch('/api/planning/rpjmd-renstra/periode', {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      const data = await res.json();
      if (data.success && data.data.length > 0) {
        setPeriodeList(data.data);
        setSelectedPeriodeId(data.data[0].id);
      }
    } catch (err) {
      console.error('Error fetching periode:', err);
    }
  };

  const fetchInstansi = async () => {
    try {
      const res = await fetch('/api/instansi-daerah', {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      const data = await res.json();
      if (data.success || Array.isArray(data)) {
        const list = Array.isArray(data) ? data : data.data || [];
        setInstansiList(list);
        if (user.instansi_id && !selectedInstansiId) {
          setSelectedInstansiId(user.instansi_id);
        } else if (list.length > 0 && !selectedInstansiId) {
          setSelectedInstansiId(list[0].id);
        }
      }
    } catch (err) {
      console.error('Error fetching instansi:', err);
    }
  };

  const fetchRPJMD = async () => {
    setLoading(true);
    try {
      const url = selectedPeriodeId 
        ? `/api/planning/rpjmd-renstra/rpjmd?periode_id=${selectedPeriodeId}`
        : `/api/planning/rpjmd-renstra/rpjmd`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      const data = await res.json();
      if (data.success) {
        setRpjmdData(data.data);
      }
    } catch (err) {
      console.error('Error fetching RPJMD:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRenstra = async () => {
    if (!selectedInstansiId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/planning/rpjmd-renstra/renstra?periode_id=${selectedPeriodeId}&instansi_id=${selectedInstansiId}`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      const data = await res.json();
      if (data.success) {
        setRenstraData(data.data);
        setVerifikasi(data.verifikasi);
      }
    } catch (err) {
      console.error('Error fetching Renstra:', err);
    } finally {
      setLoading(false);
    }
  };

  // Submit Renstra to Bapperida
  const handleSubmitRenstra = async () => {
    if (!selectedInstansiId || !selectedPeriodeId) return;
    try {
      const res = await fetch('/api/planning/rpjmd-renstra/renstra/submit', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}` 
        },
        body: JSON.stringify({ periode_id: selectedPeriodeId, instansi_id: selectedInstansiId })
      });
      const data = await res.json();
      if (data.success) {
        showNotif('success', data.message);
        fetchRenstra();
      } else {
        showNotif('error', data.message);
      }
    } catch (err: any) {
      showNotif('error', err.message);
    }
  };

  // Verify & Lock (Bapperida)
  const handleVerifyRenstra = async (status: 'approved' | 'revisi', isLocked: boolean, catatan: string) => {
    try {
      const res = await fetch('/api/planning/rpjmd-renstra/renstra/verify', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}` 
        },
        body: JSON.stringify({ 
          periode_id: selectedPeriodeId, 
          instansi_id: selectedInstansiId, 
          status, 
          is_locked: isLocked,
          catatan_bapperida: catatan 
        })
      });
      const data = await res.json();
      if (data.success) {
        showNotif('success', data.message);
        fetchRenstra();
      } else {
        showNotif('error', data.message);
      }
    } catch (err: any) {
      showNotif('error', err.message);
    }
  };

  // Save Renstra Sub-Kegiatan
  const handleSaveSubKegiatan = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/planning/rpjmd-renstra/renstra/sub-kegiatan', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}` 
        },
        body: JSON.stringify({
          ...editingItem,
          periode_id: selectedPeriodeId,
          instansi_id: selectedInstansiId
        })
      });
      const data = await res.json();
      if (data.success) {
        showNotif('success', data.message);
        setIsModalOpen(false);
        setEditingItem({});
        fetchRenstra();
      } else {
        showNotif('error', data.message);
      }
    } catch (err: any) {
      showNotif('error', err.message);
    }
  };

  // Delete Sub-Kegiatan
  const handleDeleteSubKegiatan = async (id: number) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus item Sub-Kegiatan ini?')) return;
    try {
      const res = await fetch(`/api/planning/rpjmd-renstra/renstra/sub-kegiatan/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      const data = await res.json();
      if (data.success) {
        showNotif('success', data.message);
        fetchRenstra();
      }
    } catch (err: any) {
      showNotif('error', err.message);
    }
  };

  // Toggle Quick Access (QAF)
  const handleToggleQuickAccess = async (item: RenstraSubKegiatan) => {
    try {
      const res = await fetch('/api/planning/rpjmd-renstra/renstra/quick-access', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`
        },
        body: JSON.stringify({ id: item.id })
      });
      const data = await res.json();
      if (data.success) {
        showNotif('success', data.message);
        fetchRenstra();
      }
    } catch (err: any) {
      showNotif('error', err.message);
    }
  };

  const filteredRenstra = renstraData.filter(item => 
    item.nama_sub_kegiatan.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.nama_program.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.kode_sub_kegiatan.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPagu5Tahun = renstraData.reduce((acc, curr) => acc + (Number(curr.pagu_total) || 0), 0);

  return (
    <div className="w-full px-2 sm:px-4 md:px-6 space-y-6 text-slate-800 dark:text-slate-100">
      
      {/* Notification Banner */}
      {notification && (
        <div className={`p-4 rounded-xl shadow-lg flex items-center justify-between transition-all ${
          notification.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
        }`}>
          <div className="flex items-center gap-3 font-semibold text-sm">
            {notification.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            {notification.message}
          </div>
        </div>
      )}

      {/* Top Header Card - Inherits User Secondary Theme Color (#1f75ff for Sammy) */}
      <div 
        className="rounded-2xl p-6 md:p-8 shadow-xl text-white relative overflow-hidden transition-all duration-300"
        style={{
          backgroundColor: 'var(--theme-secondary, #1f75ff)',
          color: '#ffffff'
        }}
      >
        {/* Decorative subtle ambient glow */}
        <div className="absolute right-0 top-0 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/20 border border-white/30 text-white text-[11px] font-extrabold uppercase tracking-widest shadow-sm">
              <Building2 className="w-3.5 h-3.5 text-white" /> Modul Perencanaan 5 Tahunan
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white drop-shadow-sm">
              RPJMD & Renstra Perangkat Daerah
            </h1>
            <p className="text-white/90 text-sm font-medium leading-relaxed max-w-3xl">
              Integrasi dokumen perencanaan 5 tahunan daerah dengan kerangka target kinerja dan penganggaran ($T_1 - T_5$) Perangkat Daerah.
            </p>
          </div>

          {/* Context Switchers */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Periode Switcher */}
            <div className="bg-black/20 border border-white/30 rounded-xl px-3.5 py-2 flex items-center gap-2.5 shadow-sm">
              <Calendar className="w-4 h-4 text-white shrink-0" />
              <div className="flex flex-col">
                <span className="text-[9px] font-extrabold uppercase text-white/80 tracking-wider">Periode RPJMD</span>
                <select
                  value={selectedPeriodeId}
                  onChange={(e) => setSelectedPeriodeId(Number(e.target.value))}
                  className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer pr-1"
                >
                  {periodeList.map(p => (
                    <option key={p.id} value={p.id} className="bg-slate-900 text-white font-medium">
                      {p.nama_periode} ({p.status_dokumen})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Instansi Switcher */}
            <div className="bg-black/20 border border-white/30 rounded-xl px-3.5 py-2 flex items-center gap-2.5 shadow-sm">
              <Building2 className="w-4 h-4 text-white shrink-0" />
              <div className="flex flex-col">
                <span className="text-[9px] font-extrabold uppercase text-white/80 tracking-wider">Perangkat Daerah</span>
                <select
                  value={selectedInstansiId}
                  onChange={(e) => setSelectedInstansiId(Number(e.target.value))}
                  className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer max-w-[220px] truncate pr-1"
                >
                  {instansiList.map(inst => (
                    <option key={inst.id} value={inst.id} className="bg-slate-900 text-white font-medium">
                      {inst.singkatan || inst.nama_instansi}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="relative z-10 flex items-center gap-3 mt-6 pt-5 border-t border-white/30">
          <button
            onClick={() => setActiveTab('rpjmd')}
            className={`px-5 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all shadow-md ${
              activeTab === 'rpjmd'
                ? 'bg-white text-indigo-600 font-black shadow-lg ring-2 ring-white/50'
                : 'bg-black/20 text-white hover:bg-black/30 border border-white/30'
            }`}
          >
            <FileText className="w-4 h-4" /> RPJMD (Tingkat Daerah)
          </button>
          <button
            onClick={() => setActiveTab('renstra')}
            className={`px-5 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all shadow-md ${
              activeTab === 'renstra'
                ? 'bg-white text-indigo-600 font-black shadow-lg ring-2 ring-white/50'
                : 'bg-black/20 text-white hover:bg-black/30 border border-white/30'
            }`}
          >
            <Building2 className="w-4 h-4" /> Renstra Perangkat Daerah (5 Tahunan OPD)
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {activeTab === 'renstra' ? (
        <div className="space-y-6">
          
          {/* Status & Control Panel */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            
            {/* Stat: Total Sub-Kegiatan */}
            <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black text-xl">
                {renstraData.length}
              </div>
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Sub-Kegiatan</div>
                <div className="text-base font-black">Renstra 5 Tahunan</div>
              </div>
            </div>

            {/* Stat: Total Pagu 5 Tahunan */}
            <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-black text-sm">
                Rp
              </div>
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Pagu Total 5 Tahunan</div>
                <div className="text-base font-black text-emerald-600 dark:text-emerald-400">
                  Rp {totalPagu5Tahun.toLocaleString('id-ID')}
                </div>
              </div>
            </div>

            {/* Stat: Status Verifikasi & Locking */}
            <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-sm flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black ${
                verifikasi.is_locked ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-600' : 'bg-amber-50 dark:bg-amber-950/50 text-amber-600'
              }`}>
                {verifikasi.is_locked ? <Lock className="w-6 h-6" /> : <Unlock className="w-6 h-6" />}
              </div>
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Status Kunci & Verifikasi</div>
                <div className="text-sm font-black capitalize flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    verifikasi.status === 'approved' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' :
                    verifikasi.status === 'submitted' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' :
                    verifikasi.status === 'revisi' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300' :
                    'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                  }`}>
                    {verifikasi.status.toUpperCase()}
                  </span>
                  {verifikasi.is_locked ? '(Terkunci)' : '(Dapat Di-edit)'}
                </div>
              </div>
            </div>

            {/* Action Button Panel */}
            <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-sm flex items-center justify-end gap-2">
              {/* OPD Submit Button */}
              {!verifikasi.is_locked && (
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-2 transition-all shadow-md shadow-blue-600/30"
                >
                  <Plus className="w-4 h-4" /> Tambah Sub-Kegiatan
                </button>
              )}

              {/* Submit to Bapperida */}
              {!isBapperida && verifikasi.status !== 'submitted' && verifikasi.status !== 'approved' && (
                <button
                  onClick={handleSubmitRenstra}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-2 transition-all shadow-md shadow-emerald-600/20"
                >
                  <Send className="w-4 h-4" /> Ajukan ke Bapperida
                </button>
              )}

              {/* Bapperida Approval Controls */}
              {isBapperida && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleVerifyRenstra('approved', true, 'Telah disetujui Bapperida')}
                    className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" /> Disetujui & Kunci
                  </button>
                  <button
                    onClick={() => handleVerifyRenstra('revisi', false, 'Perlu perbaikan target dan pagu')}
                    className="px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1.5"
                  >
                    <AlertCircle className="w-3.5 h-3.5" /> Minta Revisi
                  </button>
                </div>
              )}
            </div>

          </div>

          {/* Search & Table Header */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari nama program, sub-kegiatan, atau kode..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={fetchRenstra}
                  className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500"
                  title="Refresh Data"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Table Matriks Target & Pagu 5 Tahunan */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse min-w-[1200px]">
                <thead className="bg-slate-50 dark:bg-slate-900/80 text-slate-600 dark:text-slate-300 font-extrabold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-3 border-b border-slate-200 dark:border-slate-700">Kode & Sub-Kegiatan</th>
                    <th className="p-3 border-b border-slate-200 dark:border-slate-700">Indikator & Satuan</th>
                    <th className="p-3 border-b border-slate-200 dark:border-slate-700 text-center">Baseline ($T_0$)</th>
                    <th className="p-3 border-b border-slate-200 dark:border-slate-700 text-center">Target ($T_1 - T_5$)</th>
                    <th className="p-3 border-b border-slate-200 dark:border-slate-700 text-right">Total Pagu 5 Th (Rp)</th>
                    <th className="p-3 border-b border-slate-200 dark:border-slate-700 text-center w-12">QAF</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700/60 font-medium">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400 animate-pulse">
                        Memuat matriks perencanaan Renstra 5 Tahunan...
                      </td>
                    </tr>
                  ) : filteredRenstra.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400">
                        Belum ada data Sub-Kegiatan Renstra 5 Tahunan. Klik "Tambah Sub-Kegiatan" untuk menginput data baru.
                      </td>
                    </tr>
                  ) : (
                    filteredRenstra.map((item) => (
                      <tr 
                        key={item.id} 
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition-colors group"
                      >
                        {/* Kode & Sub-Kegiatan */}
                        <td className="p-3 align-top max-w-xs">
                          <div className="font-mono text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                            {item.kode_sub_kegiatan}
                          </div>
                          <div className="font-bold text-slate-800 dark:text-slate-200 leading-snug">
                            {item.nama_sub_kegiatan}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            Program: {item.nama_program}
                          </div>
                        </td>

                        {/* Indikator & Satuan */}
                        <td className="p-3 align-top max-w-xs">
                          <div className="font-semibold text-slate-700 dark:text-slate-300">
                            {item.indikator || '-'}
                          </div>
                          <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                            Satuan: {item.satuan || '-'}
                          </div>
                        </td>

                        {/* Baseline T0 */}
                        <td className="p-3 align-top text-center font-mono font-bold text-slate-600 dark:text-slate-300">
                          {item.baseline_t0 || '-'}
                        </td>

                        {/* Target T1 - T5 */}
                        <td className="p-3 align-top">
                          <div className="grid grid-cols-5 gap-1 text-[10px] text-center font-mono">
                            <div className="bg-slate-100 dark:bg-slate-900 p-1 rounded">
                              <span className="text-[8px] text-slate-400 block">T1</span>
                              {item.target_t1 || '-'}
                            </div>
                            <div className="bg-slate-100 dark:bg-slate-900 p-1 rounded">
                              <span className="text-[8px] text-slate-400 block">T2</span>
                              {item.target_t2 || '-'}
                            </div>
                            <div className="bg-slate-100 dark:bg-slate-900 p-1 rounded">
                              <span className="text-[8px] text-slate-400 block">T3</span>
                              {item.target_t3 || '-'}
                            </div>
                            <div className="bg-slate-100 dark:bg-slate-900 p-1 rounded">
                              <span className="text-[8px] text-slate-400 block">T4</span>
                              {item.target_t4 || '-'}
                            </div>
                            <div className="bg-slate-100 dark:bg-slate-900 p-1 rounded">
                              <span className="text-[8px] text-slate-400 block">T5</span>
                              {item.target_t5 || '-'}
                            </div>
                          </div>
                        </td>

                        {/* Total Pagu 5 Tahunan */}
                        <td className="p-3 align-top text-right font-mono font-black text-emerald-600 dark:text-emerald-400">
                          Rp {(Number(item.pagu_total) || 0).toLocaleString('id-ID')}
                        </td>

                        {/* QAF Menu 3-Titik */}
                        <td className="p-3 align-top text-center">
                          <button
                            onClick={(e) => {
                              const rect = e.currentTarget.getBoundingClientRect();
                              setQafAnchor({
                                top: rect.bottom + window.scrollY,
                                left: rect.left + window.scrollX - 180,
                                item: item
                              });
                            }}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500"
                            title="Quick Action Feature"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* Tab RPJMD */
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/60 p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
            <div>
              <h3 className="text-lg font-black">Visi, Misi & Sasaran RPJMD Daerah</h3>
              <p className="text-xs text-slate-400">Kerangka Penjenjangan Kinerja (Cascading) Visi $\rightarrow$ Misi $\rightarrow$ Tujuan $\rightarrow$ Sasaran Strategis Daerah.</p>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setRpjpdDrawerOpen(true)}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md"
              >
                <BookOpen className="w-4 h-4" /> Acuan RPJPD (2025-2045)
              </button>
              {isBapperida && (
                <button 
                  onClick={() => {
                    setRpjmdModalType('visi');
                    setRpjmdForm({});
                    setRpjmdModalOpen(true);
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md"
                >
                  <Plus className="w-4 h-4" /> Tambah Visi Daerah
                </button>
              )}
            </div>
          </div>

          {rpjmdData.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              Belum ada data Visi & Misi RPJMD untuk periode yang dipilih. Klik "Tambah Visi Daerah" untuk menginput.
            </div>
          ) : (
            rpjmdData.map((visi) => (
              <div key={visi.id} className="p-5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4 bg-slate-50/50 dark:bg-slate-900/30">
                
                {/* Visi Header */}
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400 tracking-wider">
                      VISI KEPALA DAERAH
                    </div>
                    <div className="text-base font-black text-slate-800 dark:text-slate-100">
                      "{visi.visi}"
                    </div>
                  </div>
                  {isBapperida && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button 
                        onClick={() => {
                          setRpjmdModalType('misi');
                          setRpjmdForm({ visi_id: visi.id });
                          setRpjmdModalOpen(true);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold text-xs flex items-center gap-1 hover:bg-indigo-100"
                      >
                        <Plus className="w-3.5 h-3.5" /> Tambah Misi
                      </button>
                      <button 
                        onClick={() => handleDeleteRPJMDItem('visi', visi.id)}
                        className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                        title="Hapus Visi"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Misi List */}
                <div className="space-y-4 pl-4 border-l-2 border-indigo-500">
                  {visi.misi_list.map((misi) => (
                    <div key={misi.id} className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200/80 dark:border-slate-700/80 space-y-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="font-bold text-xs text-slate-800 dark:text-slate-200">
                          <span className="text-indigo-600 dark:text-indigo-400 mr-2">MISI {misi.kode_misi}:</span>
                          {misi.misi}
                        </div>
                        {isBapperida && (
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button 
                              onClick={() => {
                                setRpjmdModalType('tujuan');
                                setRpjmdForm({ misi_id: misi.id });
                                setRpjmdModalOpen(true);
                              }}
                              className="px-2.5 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 font-bold text-[10px] flex items-center gap-1 hover:bg-emerald-100"
                            >
                              <Plus className="w-3 h-3" /> Tambah Tujuan
                            </button>
                            <button 
                              onClick={() => handleDeleteRPJMDItem('misi', misi.id)}
                              className="p-1 rounded text-rose-500 hover:bg-rose-50"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Tujuan & Sasaran List */}
                      {misi.tujuan_list.map((tujuan) => (
                        <div key={tujuan.id} className="pl-4 space-y-2 border-l border-slate-200 dark:border-slate-700">
                          <div className="flex items-start justify-between gap-4 text-xs font-semibold text-slate-700 dark:text-slate-300">
                            <div>
                              <span className="text-emerald-600 dark:text-emerald-400 mr-2">TUJUAN {tujuan.kode_tujuan}:</span>
                              {tujuan.tujuan} (Indikator: {tujuan.indikator || '-'})
                            </div>
                            {isBapperida && (
                              <div className="flex items-center gap-1.5 shrink-0">
                                <button 
                                  onClick={() => {
                                    setRpjmdModalType('sasaran');
                                    setRpjmdForm({ tujuan_id: tujuan.id });
                                    setRpjmdModalOpen(true);
                                  }}
                                  className="px-2 py-0.5 rounded bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 font-bold text-[10px] flex items-center gap-1 hover:bg-sky-100"
                                >
                                  <Plus className="w-3 h-3" /> Tambah Sasaran
                                </button>
                                <button 
                                  onClick={() => handleDeleteRPJMDItem('tujuan', tujuan.id)}
                                  className="p-1 rounded text-rose-500 hover:bg-rose-50"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Sasaran RPJMD */}
                          {tujuan.sasaran_list.map((sasaran) => (
                            <div key={sasaran.id} className="pl-4 p-2 bg-slate-50 dark:bg-slate-900/60 rounded-lg text-[11px] font-mono flex items-center justify-between gap-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <ChevronRight className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                                <span className="font-bold text-indigo-600 dark:text-indigo-400">SASARAN {sasaran.kode_sasaran}:</span>
                                <span className="text-slate-800 dark:text-slate-200">{sasaran.sasaran}</span>
                                <span className="text-slate-400">(Indikator: {sasaran.indikator || '-'}, Target Akhir: {sasaran.target_akhir || '-'})</span>
                                {sasaran.rpjpd_sasaran_pokok && (
                                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[9px] font-extrabold flex items-center gap-1 border border-emerald-300/40">
                                    🎯 RPJPD: {sasaran.rpjpd_kode_sasaran || ''} - {sasaran.rpjpd_sasaran_pokok}
                                  </span>
                                )}
                              </div>
                              {isBapperida && (
                                <button 
                                  onClick={() => handleDeleteRPJMDItem('sasaran', sasaran.id)}
                                  className="p-1 text-rose-500 hover:bg-rose-100 rounded shrink-0"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Modal Input/Edit Sub-Kegiatan Renstra */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="p-5 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <h3 className="font-black text-base">Form Sub-Kegiatan Renstra 5 Tahunan</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            
            <form onSubmit={handleSaveSubKegiatan} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto text-xs">
              {/* Cascading: Dukungan Sasaran RPJMD */}
              <div>
                <label className="font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5 mb-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Penyelarasan / Cascading ke Sasaran RPJMD Daerah
                </label>
                <select
                  value={editingItem.renstra_sasaran_id || ''}
                  onChange={e => setEditingItem({ ...editingItem, renstra_sasaran_id: e.target.value ? Number(e.target.value) : null })}
                  className="w-full p-2.5 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/40 text-slate-800 dark:text-slate-100 font-medium"
                >
                  <option value="">-- Pilih Sasaran Strategis RPJMD (Penyelarasan Kinerja Daerah) --</option>
                  {allRpjmdSasaranList.map(s => (
                    <option key={s.id} value={s.id}>
                      Sasaran RPJMD {s.kode_sasaran}: {s.sasaran}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-500">Kode Program</label>
                  <input
                    type="text"
                    required
                    placeholder="1.01.01"
                    value={editingItem.kode_program || ''}
                    onChange={e => setEditingItem({ ...editingItem, kode_program: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-500">Nama Program</label>
                  <input
                    type="text"
                    required
                    placeholder="Program Pelayanan Kesehatan"
                    value={editingItem.nama_program || ''}
                    onChange={e => setEditingItem({ ...editingItem, nama_program: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-500">Kode Sub-Kegiatan</label>
                  <input
                    type="text"
                    required
                    placeholder="1.01.01.2.02.0001"
                    value={editingItem.kode_sub_kegiatan || ''}
                    onChange={e => setEditingItem({ ...editingItem, kode_sub_kegiatan: e.target.value, kode_kegiatan: e.target.value.substring(0, 15) })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-500">Nama Sub-Kegiatan</label>
                  <input
                    type="text"
                    required
                    placeholder="Penyediaan Jasa Pelayanan Kesehatan..."
                    value={editingItem.nama_sub_kegiatan || ''}
                    onChange={e => setEditingItem({ ...editingItem, nama_sub_kegiatan: e.target.value, nama_kegiatan: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-500">Indikator Kinerja</label>
                  <input
                    type="text"
                    placeholder="Jumlah pasien terlayani"
                    value={editingItem.indikator || ''}
                    onChange={e => setEditingItem({ ...editingItem, indikator: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-500">Satuan</label>
                  <input
                    type="text"
                    placeholder="Orang / Dokumen / %"
                    value={editingItem.satuan || ''}
                    onChange={e => setEditingItem({ ...editingItem, satuan: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                  />
                </div>
              </div>

              {/* Targets T1 - T5 */}
              <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl space-y-2">
                <div className="font-extrabold text-slate-600 dark:text-slate-300">Target Kinerja Fisik ($T_1 - T_5$)</div>
                <div className="grid grid-cols-6 gap-2">
                  <div>
                    <span className="text-[10px] text-slate-400">Baseline T0</span>
                    <input type="text" value={editingItem.baseline_t0 || ''} onChange={e => setEditingItem({ ...editingItem, baseline_t0: e.target.value })} className="w-full p-1.5 border rounded" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400">Tahun 1</span>
                    <input type="text" value={editingItem.target_t1 || ''} onChange={e => setEditingItem({ ...editingItem, target_t1: e.target.value })} className="w-full p-1.5 border rounded" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400">Tahun 2</span>
                    <input type="text" value={editingItem.target_t2 || ''} onChange={e => setEditingItem({ ...editingItem, target_t2: e.target.value })} className="w-full p-1.5 border rounded" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400">Tahun 3</span>
                    <input type="text" value={editingItem.target_t3 || ''} onChange={e => setEditingItem({ ...editingItem, target_t3: e.target.value })} className="w-full p-1.5 border rounded" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400">Tahun 4</span>
                    <input type="text" value={editingItem.target_t4 || ''} onChange={e => setEditingItem({ ...editingItem, target_t4: e.target.value })} className="w-full p-1.5 border rounded" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400">Tahun 5</span>
                    <input type="text" value={editingItem.target_t5 || ''} onChange={e => setEditingItem({ ...editingItem, target_t5: e.target.value })} className="w-full p-1.5 border rounded" />
                  </div>
                </div>
              </div>

              {/* Pagu T1 - T5 */}
              <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-xl space-y-2">
                <div className="font-extrabold text-emerald-700 dark:text-emerald-300">Target Pagu Anggaran Rp ($T_1 - T_5$)</div>
                <div className="grid grid-cols-5 gap-2">
                  <div>
                    <span className="text-[10px] text-slate-400">Pagu T1 (Rp)</span>
                    <input type="number" value={editingItem.pagu_t1 || 0} onChange={e => setEditingItem({ ...editingItem, pagu_t1: Number(e.target.value) })} className="w-full p-1.5 border rounded" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400">Pagu T2 (Rp)</span>
                    <input type="number" value={editingItem.pagu_t2 || 0} onChange={e => setEditingItem({ ...editingItem, pagu_t2: Number(e.target.value) })} className="w-full p-1.5 border rounded" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400">Pagu T3 (Rp)</span>
                    <input type="number" value={editingItem.pagu_t3 || 0} onChange={e => setEditingItem({ ...editingItem, pagu_t3: Number(e.target.value) })} className="w-full p-1.5 border rounded" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400">Pagu T4 (Rp)</span>
                    <input type="number" value={editingItem.pagu_t4 || 0} onChange={e => setEditingItem({ ...editingItem, pagu_t4: Number(e.target.value) })} className="w-full p-1.5 border rounded" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400">Pagu T5 (Rp)</span>
                    <input type="number" value={editingItem.pagu_t5 || 0} onChange={e => setEditingItem({ ...editingItem, pagu_t5: Number(e.target.value) })} className="w-full p-1.5 border rounded" />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 font-bold">
                  Batal
                </button>
                <button 
                  type="submit" 
                  className="px-5 py-2 rounded-xl text-white font-bold flex items-center gap-1.5 hover:brightness-110 shadow-sm"
                  style={{ backgroundColor: 'var(--theme-primary, #0f172a)' }}
                >
                  <Save className="w-4 h-4" /> Simpan Data
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QAF Popover Menu */}
      {qafAnchor && (
        <QafPopover
          top={qafAnchor.top}
          left={qafAnchor.left}
          onClose={() => setQafAnchor(null)}
          globalActive={qafAnchor.item.is_quick_access}
          canEditGlobal={true}
          onToggleGlobal={() => {
            handleToggleQuickAccess(qafAnchor.item);
            setQafAnchor(null);
          }}
          globalTitle={qafAnchor.item.is_quick_access ? 'Hapus dari Quick Access' : 'Tambahkan ke Quick Access'}
          onCopyLink={() => {
            const url = `${window.location.origin}/#rpjmd-renstra?id=${qafAnchor.item.id}`;
            navigator.clipboard.writeText(url);
            showNotif('success', 'Link publik item berhasil disalin!');
            setQafAnchor(null);
          }}
          copyTitle="Salin Link Publik"
          onMakeSkp={() => {
            showNotif('success', `Item "${qafAnchor.item.nama_sub_kegiatan}" siap dijadikan butir SKP.`);
            setQafAnchor(null);
          }}
          skpTitle="Jadikan SKP / Catatan"
        />
      )}

      {/* Modal Input/Edit RPJMD (Visi, Misi, Tujuan, Sasaran) */}
      {rpjmdModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="p-5 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <h3 className="font-black text-base uppercase text-indigo-600 dark:text-indigo-400">
                Form Input {rpjmdModalType.toUpperCase()} RPJMD
              </h3>
              <button onClick={() => setRpjmdModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            
            <form onSubmit={handleSaveRPJMDItem} className="p-5 space-y-4 text-xs">
              {rpjmdModalType === 'visi' && (
                <div>
                  <label className="font-bold text-slate-500 block mb-1">Visi Utama Kepala Daerah</label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Masukkan rumusan Visi Kepala Daerah..."
                    value={rpjmdForm.visi || ''}
                    onChange={e => setRpjmdForm({ ...rpjmdForm, visi: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                  />
                </div>
              )}

              {rpjmdModalType === 'misi' && (
                <div className="space-y-3">
                  <div>
                    <label className="font-bold text-slate-500 block mb-1">Kode Misi</label>
                    <input
                      type="text"
                      required
                      placeholder="Misi 1 / 1"
                      value={rpjmdForm.kode_misi || ''}
                      onChange={e => setRpjmdForm({ ...rpjmdForm, kode_misi: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-500 block mb-1">Rumusan Misi</label>
                    <textarea
                      required
                      rows={3}
                      placeholder="Masukkan Uraian Misi Daerah..."
                      value={rpjmdForm.misi || ''}
                      onChange={e => setRpjmdForm({ ...rpjmdForm, misi: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                    />
                  </div>
                </div>
              )}

              {rpjmdModalType === 'tujuan' && (
                <div className="space-y-3">
                  <div>
                    <label className="font-bold text-slate-500 block mb-1">Kode Tujuan</label>
                    <input
                      type="text"
                      required
                      placeholder="T.01"
                      value={rpjmdForm.kode_tujuan || ''}
                      onChange={e => setRpjmdForm({ ...rpjmdForm, kode_tujuan: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-500 block mb-1">Rumusan Tujuan Daerah</label>
                    <textarea
                      required
                      rows={2}
                      placeholder="Meningkatkan kualitas pelayanan kesehatan..."
                      value={rpjmdForm.tujuan || ''}
                      onChange={e => setRpjmdForm({ ...rpjmdForm, tujuan: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="font-bold text-slate-500 block mb-1">Indikator Tujuan</label>
                      <input
                        type="text"
                        placeholder="Indeks Pembangunan Manusia"
                        value={rpjmdForm.indikator || ''}
                        onChange={e => setRpjmdForm({ ...rpjmdForm, indikator: e.target.value })}
                        className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-500 block mb-1">Satuan</label>
                      <input
                        type="text"
                        placeholder="Indeks / Nilai"
                        value={rpjmdForm.satuan || ''}
                        onChange={e => setRpjmdForm({ ...rpjmdForm, satuan: e.target.value })}
                        className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                      />
                    </div>
                  </div>
                </div>
              )}

              {rpjmdModalType === 'sasaran' && (
                <div className="space-y-3">
                  {/* RPJPD Cascading Selector */}
                  <div>
                    <label className="font-bold text-emerald-600 dark:text-emerald-400 block mb-1">
                      🎯 Penyelarasan ke Sasaran Pokok RPJPD (2025-2045)
                    </label>
                    <select
                      value={rpjmdForm.rpjpd_sasaran_id || ''}
                      onChange={e => setRpjmdForm({ ...rpjmdForm, rpjpd_sasaran_id: e.target.value ? Number(e.target.value) : null })}
                      className="w-full p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/40 text-slate-800 dark:text-slate-100 font-medium text-xs"
                    >
                      <option value="">-- Pilih Sasaran Pokok RPJPD (Penyelarasan 20 Tahun) --</option>
                      {rpjpdSasaranList.map(s => (
                        <option key={s.id} value={s.id}>
                          Sasaran Pokok RPJPD {s.kode_sasaran}: {s.sasaran_pokok}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="font-bold text-slate-500 block mb-1">Kode Sasaran</label>
                      <input
                        type="text"
                        required
                        placeholder="S.01"
                        value={rpjmdForm.kode_sasaran || ''}
                        onChange={e => setRpjmdForm({ ...rpjmdForm, kode_sasaran: e.target.value })}
                        className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-500 block mb-1">Satuan</label>
                      <input
                        type="text"
                        placeholder="Orang / % / Indeks"
                        value={rpjmdForm.satuan || ''}
                        onChange={e => setRpjmdForm({ ...rpjmdForm, satuan: e.target.value })}
                        className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="font-bold text-slate-500 block mb-1">Rumusan Sasaran Strategis RPJMD</label>
                    <textarea
                      required
                      rows={2}
                      placeholder="Meningkatnya akses dan mutu pelayanan..."
                      value={rpjmdForm.sasaran || ''}
                      onChange={e => setRpjmdForm({ ...rpjmdForm, sasaran: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-500 block mb-1">Indikator Kinerja Utama (IKU/IKD)</label>
                    <input
                      type="text"
                      placeholder="Cakupan pelayanan kesehatan dasar"
                      value={rpjmdForm.indikator || ''}
                      onChange={e => setRpjmdForm({ ...rpjmdForm, indikator: e.target.value })}
                      className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="font-bold text-slate-500 block mb-1">Baseline (T0)</label>
                      <input
                        type="text"
                        placeholder="80%"
                        value={rpjmdForm.baseline_t0 || ''}
                        onChange={e => setRpjmdForm({ ...rpjmdForm, baseline_t0: e.target.value })}
                        className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-500 block mb-1">Target Akhir (T5)</label>
                      <input
                        type="text"
                        placeholder="95%"
                        value={rpjmdForm.target_akhir || ''}
                        onChange={e => setRpjmdForm({ ...rpjmdForm, target_akhir: e.target.value })}
                        className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t">
                <button type="button" onClick={() => setRpjmdModalOpen(false)} className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 font-bold">
                  Batal
                </button>
                <button type="submit" className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center gap-1.5 shadow-md">
                  <Save className="w-4 h-4" /> Simpan Data
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal RPJPD Reference List (2025-2045) */}
      {rpjpdDrawerOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-5 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between bg-emerald-700 text-white">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-emerald-200" />
                <h3 className="font-black text-base">Referensi Sasaran Pokok RPJPD 20 Tahun (2025-2045)</h3>
              </div>
              <button onClick={() => setRpjpdDrawerOpen(false)} className="text-emerald-200 hover:text-white font-bold">✕</button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              {rpjpdSasaranList.length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  Belum ada data Sasaran Pokok RPJPD 20-Tahunan yang terdaftar.
                </div>
              ) : (
                rpjpdSasaranList.map((item, index) => (
                  <div key={item.id || index} className="p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1.5">
                    <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-extrabold">
                      <ChevronRight className="w-4 h-4 shrink-0" />
                      <span>Sasaran Pokok RPJPD {item.kode_sasaran || `#${index + 1}`}:</span>
                    </div>
                    <div className="pl-6 font-bold text-slate-800 dark:text-slate-100 text-sm">
                      {item.sasaran_pokok}
                    </div>
                    {item.arah_kebijakan_list && item.arah_kebijakan_list.length > 0 && (
                      <div className="pl-6 pt-1 space-y-1">
                        <div className="text-[10px] font-bold text-slate-400 uppercase">Arah Kebijakan Tahapan:</div>
                        {item.arah_kebijakan_list.map((ak: any) => (
                          <div key={ak.id} className="text-[11px] text-slate-600 dark:text-slate-400 font-mono">
                            • {ak.kode_arah_kebijakan}: {ak.arah_kebijakan}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex justify-end bg-slate-50 dark:bg-slate-900/50">
              <button 
                onClick={() => setRpjpdDrawerOpen(false)}
                className="px-5 py-2 rounded-xl bg-slate-800 text-white font-bold text-xs"
              >
                Tutup Referensi
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default RpjmdRenstraPage;
