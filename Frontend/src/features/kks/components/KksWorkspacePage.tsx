import React, { useState, useEffect } from 'react';
import { 
  Layers, Search, Upload, FileText, CheckCircle2, 
  AlertCircle, Link as LinkIcon, Trash2, ExternalLink,
  Check, Building2, MessageSquare, AlertTriangle, ShieldCheck, 
  Info, X, ChevronRight, FileCheck, HelpCircle, Edit, Database, Users, Pencil,
  Plus, FolderOpen
} from 'lucide-react';
import { kksApi } from '../services/kksApi';
import { KksTatanan, KksIndikator, KksBuktiDukung, KksPustakaItem } from '../types';
import { useAuth } from '../../../contexts/AuthContext';
import { rawApiUrl, api } from '../../../services/api';
import { CrosscuttingSelect } from './CrosscuttingSelect';
import { KksLibraryPickerModal } from './KksLibraryPickerModal';
import { DocumentViewerModal } from '../../../components/modals/DocumentViewerModal';

interface Props {
  selectedTahun: number;
  initialTatananId?: number | null;
}

export const KksWorkspacePage: React.FC<Props> = ({ selectedTahun, initialTatananId }) => {
  const { user, isAuthenticated } = useAuth();
  const [tatananList, setTatananList] = useState<KksTatanan[]>([]);
  const [activeTatananId, setActiveTatananId] = useState<number | null>(
    initialTatananId !== undefined && initialTatananId !== null ? initialTatananId : null
  );
  const [indicators, setIndicators] = useState<KksIndikator[]>([]);
  const [instansiList, setInstansiList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [onlyMyOpd, setOnlyMyOpd] = useState(false);

  // Penilaian KKS 2 tahunan: Dokumen yang dievaluasi (2025 & 2026 untuk periode 2027)
  const docYears = selectedTahun >= 2027 ? [selectedTahun - 2, selectedTahun - 1] : [2025, 2026];

  // Modal Info Indikator Bulat (i) State
  const [infoIndikator, setInfoIndikator] = useState<KksIndikator | null>(null);

  // Modal Edit Rincian Indikator (Definisi Operasional, Sumber Data, Bukti Dukung & Skala)
  const [isEditingIndikator, setIsEditingIndikator] = useState(false);
  const [editNomor, setEditNomor] = useState('');
  const [editNama, setEditNama] = useState('');
  const [editDO, setEditDO] = useState('');
  const [editSumberData, setEditSumberData] = useState('');
  const [editBukti, setEditBukti] = useState('');
  const [editOpdId, setEditOpdId] = useState<number | null>(null);
  const [editCrosscuttingIds, setEditCrosscuttingIds] = useState<number[]>([]);
  const [editKriteriaList, setEditKriteriaList] = useState<{ skor: number; kriteria: string }[]>([]);
  const [isSavingIndEdit, setIsSavingIndEdit] = useState(false);

  // Upload modal state
  const [activeIndForUpload, setActiveIndForUpload] = useState<KksIndikator | null>(null);
  const [uploadTahunDokumen, setUploadTahunDokumen] = useState<number>(docYears[0]);
  const [uploadTipe, setUploadTipe] = useState<'file' | 'link'>('file');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadLinkUrl, setUploadLinkUrl] = useState('');
  const [uploadNamaBerkas, setUploadNamaBerkas] = useState('');
  const [uploadKeterangan, setUploadKeterangan] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // Perpustakaan Picker modal state
  const [libraryPicker, setLibraryPicker] = useState<{ indicator: KksIndikator; tahunDokumen: number } | null>(null);

  // Document Viewer preview modal state
  const [viewingDoc, setViewingDoc] = useState<{ url: string; name: string } | null>(null);

  // Verifikasi modal state (untuk Bapperida / Superadmin)
  const [activeIndForVerif, setActiveIndForVerif] = useState<KksIndikator | null>(null);
  const [verifSkor, setVerifSkor] = useState<number>(100);
  const [verifStatus, setVerifStatus] = useState<string>('disetujui');
  const [verifCatatan, setVerifCatatan] = useState<string>('');
  const [isVerifying, setIsVerifying] = useState(false);

  // Alert message
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  };

  const isBapperida = user?.tipe_user_id === 1 || user?.instansi_id === 2;

  // Helper untuk mendapatkan daftar nama OPD crosscutting
  const getCrosscuttingNames = (idsStr?: string | null) => {
    if (!idsStr) return [];
    const ids = idsStr.split(',').map(s => Number(s.trim())).filter(n => !isNaN(n) && n > 0);
    return ids.map(id => {
      const found = instansiList.find(i => i.id === id);
      return found ? (found.singkatan || found.instansi) : null;
    }).filter(Boolean) as string[];
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

  // 2. Load Tatanan List & Sinkronisasi Tatanan Aktif
  useEffect(() => {
    const fetchTatanan = async () => {
      try {
        const res = await kksApi.getTatananList(selectedTahun);
        if (res.success && res.data && res.data.length > 0) {
          setTatananList(res.data);
          
          let targetId = res.data[0].id;
          if (initialTatananId !== undefined && initialTatananId !== null) {
            const match = res.data.find((t: KksTatanan) => t.id === initialTatananId || t.nomor_tatanan === initialTatananId);
            if (match) {
              targetId = match.id;
            } else {
              targetId = initialTatananId;
            }
          }
          setActiveTatananId(targetId);
        }
      } catch (err) {
        console.error('Error load tatanan:', err);
      }
    };
    fetchTatanan();
  }, [selectedTahun, initialTatananId]);

  // Sinkronisasi activeTatananId saat initialTatananId berubah dari navigasi luar
  useEffect(() => {
    if (initialTatananId !== undefined && initialTatananId !== null && tatananList.length > 0) {
      const match = tatananList.find(t => t.id === initialTatananId || t.nomor_tatanan === initialTatananId);
      if (match) {
        setActiveTatananId(match.id);
      } else {
        setActiveTatananId(initialTatananId);
      }
    }
  }, [initialTatananId, tatananList]);

  // 3. Load Indicators
  const fetchIndicators = async () => {
    setLoading(true);
    try {
      const opdParam = onlyMyOpd && user?.instansi_id ? user.instansi_id : undefined;
      const res = await kksApi.getIndikatorList({
        tahun: selectedTahun,
        tatanan_id: activeTatananId || undefined,
        opd_id: opdParam,
        search: searchTerm || undefined
      });
      if (res.success && res.data) {
        setIndicators(res.data);
      }
    } catch (err) {
      console.error('Error load indicators:', err);
      showToast('error', 'Gagal memuat indikator penilaian');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIndicators();
  }, [selectedTahun, activeTatananId, onlyMyOpd, searchTerm, user?.instansi_id]);

  // Lock body scroll when any modal is open to prevent background scrolling (scroll chaining)
  useEffect(() => {
    const isAnyModalOpen = Boolean(infoIndikator || isEditingIndikator || activeIndForUpload || activeIndForVerif);
    if (isAnyModalOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [infoIndikator, isEditingIndikator, activeIndForUpload, activeIndForVerif]);

  // 4. Handle Skor Mandiri Change
  const handleSaveSkor = async (ind: KksIndikator, skor: number) => {
    if (!isAuthenticated) {
      showToast('error', 'Silakan login terlebih dahulu untuk mengisi penilaian');
      return;
    }

    try {
      const res = await kksApi.savePenilaian({
        tahun: selectedTahun,
        indikator_id: ind.id,
        skor_mandiri: skor,
        instansi_id: ind.instansi_pengampu_id || user?.instansi_id || 2,
        catatan_opd: ind.catatan_opd || ''
      });

      if (res.success) {
        showToast('success', `Skor ${skor} berhasil disimpan untuk indikator ${ind.nomor_indikator}`);
        fetchIndicators();
      } else {
        showToast('error', res.message || 'Gagal menyimpan skor');
      }
    } catch (err) {
      showToast('error', 'Terjadi kesalahan saat menyimpan penilaian');
    }
  };

  // 5. Handle Start Edit Indikator (dari tombol pensil)
  const handleStartEdit = (ind: KksIndikator) => {
    setInfoIndikator(ind);
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
    setIsEditingIndikator(true);
  };

  // 6. Handle Save Indikator Edit (DO, Sumber Data, Bukti, Skala, Crosscutting)
  const handleSaveIndikatorEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!infoIndikator) return;

    setIsSavingIndEdit(true);
    try {
      const selectedOpd = instansiList.find(i => i.id === editOpdId);
      const crosscuttingStr = editCrosscuttingIds.length > 0 ? editCrosscuttingIds.join(',') : null;

      const res = await kksApi.updateIndikator(infoIndikator.id, {
        nomor_indikator: editNomor,
        nama_indikator: editNama,
        definisi_operasional: editDO,
        sumber_data: editSumberData,
        bukti_dukung_dibutuhkan: editBukti,
        instansi_pengampu_id: editOpdId,
        instansi_pengampu_nama: selectedOpd ? (selectedOpd.singkatan || selectedOpd.instansi) : infoIndikator.instansi_pengampu_nama,
        crosscutting_instansi_ids: crosscuttingStr,
        kriteria_skala: editKriteriaList.filter(k => k.kriteria && k.kriteria.trim().length > 0)
      });

      if (res.success) {
        showToast('success', 'Rincian indikator, pengampu, dan skala penilaian berhasil diperbarui!');
        setIsEditingIndikator(false);
        
        // Perbarui objek infoIndikator yang sedang terbuka
        setInfoIndikator({
          ...infoIndikator,
          nomor_indikator: editNomor,
          nama_indikator: editNama,
          definisi_operasional: editDO,
          sumber_data: editSumberData,
          bukti_dukung_dibutuhkan: editBukti,
          instansi_pengampu_id: editOpdId,
          instansi_pengampu_nama: selectedOpd ? (selectedOpd.singkatan || selectedOpd.instansi) : infoIndikator.instansi_pengampu_nama,
          crosscutting_instansi_ids: crosscuttingStr,
          kriteria_skala: editKriteriaList.filter(k => k.kriteria && k.kriteria.trim().length > 0).map((k, idx) => ({
            id: idx + 1,
            indikator_id: infoIndikator.id,
            skor: k.skor,
            kriteria: k.kriteria,
            urutan: idx + 1
          }))
        });

        fetchIndicators();
      } else {
        showToast('error', res.message || 'Gagal menyimpan perubahan indikator');
      }
    } catch (err) {
      showToast('error', 'Terjadi kesalahan saat menyimpan perubahan');
    } finally {
      setIsSavingIndEdit(false);
    }
  };

  // 7. Handle Submit Upload Bukti Dukung
  const handleUploadBukti = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeIndForUpload) return;

    let penilaianId = activeIndForUpload.penilaian_id;

    if (!penilaianId) {
      try {
        const initRes = await kksApi.savePenilaian({
          tahun: selectedTahun,
          indikator_id: activeIndForUpload.id,
          skor_mandiri: activeIndForUpload.skor_mandiri !== null && activeIndForUpload.skor_mandiri !== undefined ? activeIndForUpload.skor_mandiri : 100,
          instansi_id: activeIndForUpload.instansi_pengampu_id || user?.instansi_id || 2,
        });
        if (initRes.success && initRes.data) {
          penilaianId = initRes.data.penilaian_id;
        } else {
          showToast('error', 'Gagal inisialisasi penilaian mandiri');
          return;
        }
      } catch (err) {
        showToast('error', 'Gagal inisialisasi penilaian mandiri');
        return;
      }
    }

    if (uploadTipe === 'file' && uploadFile) {
      if (!uploadFile.name.toLowerCase().endsWith('.pdf')) {
        showToast('error', 'Khusus penilaian KKS, berkas bukti dukung fisik wajib berupa format PDF!');
        return;
      }
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('penilaian_id', String(penilaianId));
      formData.append('tipe_sumber', uploadTipe === 'file' ? 'file_upload' : 'link_url');
      formData.append('tahun_dokumen', String(uploadTahunDokumen));
      formData.append('nama_berkas', uploadNamaBerkas);
      formData.append('keterangan', uploadKeterangan);

      if (uploadTipe === 'file' && uploadFile) {
        formData.append('file', uploadFile);
      } else if (uploadTipe === 'link') {
        formData.append('url_external', uploadLinkUrl);
      }

      const res = await kksApi.uploadBuktiDukung(formData);
      if (res.success) {
        showToast('success', `Bukti dukung tahun ${uploadTahunDokumen} berhasil diunggah!`);
        setActiveIndForUpload(null);
        setUploadFile(null);
        setUploadLinkUrl('');
        setUploadNamaBerkas('');
        setUploadKeterangan('');
        fetchIndicators();
      } else {
        showToast('error', res.message || 'Gagal mengunggah bukti');
      }
    } catch (err: any) {
      showToast('error', err.message || 'Terjadi kesalahan saat mengunggah');
    } finally {
      setIsUploading(false);
    }
  };

  // 7b. Handle Select & Link Dokumen dari Perpustakaan SAMP
  const handleSelectPustakaDoc = async (pustakaDoc: KksPustakaItem) => {
    if (!libraryPicker) return;
    try {
      const { indicator, tahunDokumen } = libraryPicker;

      // Pastikan ada penilaian_id
      let penilaianId = indicator.penilaian_id;
      if (!penilaianId) {
        const initRes = await kksApi.savePenilaian({
          tahun: selectedTahun,
          indikator_id: indicator.id,
          skor_mandiri: indicator.skor_mandiri !== null && indicator.skor_mandiri !== undefined ? indicator.skor_mandiri : 100,
          instansi_id: indicator.instansi_pengampu_id || user?.instansi_id || 2,
        });
        if (initRes.success && initRes.data) {
          penilaianId = initRes.data.penilaian_id;
        } else {
          showToast('error', 'Gagal inisialisasi penilaian mandiri');
          return;
        }
      }

      const res = await kksApi.linkLibraryDoc({
        penilaian_id: penilaianId,
        dokumen_id: pustakaDoc.id,
        tahun_dokumen: tahunDokumen,
        keterangan: `Ditautkan dari Perpustakaan SAMP (${pustakaDoc.nama_file})`,
      });

      if (res.success) {
        showToast('success', res.message || 'Berkas perpustakaan berhasil ditautkan sebagai bukti dukung KKS!');
        fetchIndicators();
      } else {
        showToast('error', res.message || 'Gagal menautkan berkas');
      }
    } catch (err: any) {
      console.error('Error linking pustaka doc:', err);
      showToast('error', err.message || 'Terjadi kesalahan saat menautkan berkas perpustakaan');
    }
  };

  // 8. Handle Delete Bukti Dukung
  const handleDeleteBukti = async (buktiId: number) => {
    if (!window.confirm('Yakin ingin menghapus berkas bukti dukung ini?')) return;
    try {
      const res = await kksApi.deleteBuktiDukung(buktiId);
      if (res.success) {
        showToast('success', 'Bukti dukung dihapus');
        fetchIndicators();
      } else {
        showToast('error', res.message || 'Gagal menghapus bukti');
      }
    } catch (err) {
      showToast('error', 'Gagal menghapus bukti');
    }
  };

  // 9. Handle Save Verifikasi
  const handleSaveVerif = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeIndForVerif || !activeIndForVerif.penilaian_id) return;

    setIsVerifying(true);
    try {
      const res = await kksApi.saveVerifikasi({
        penilaian_id: activeIndForVerif.penilaian_id,
        skor_verifikasi: verifSkor,
        status_verifikasi: verifStatus,
        catatan_rekomendasi: verifCatatan
      });
      if (res.success) {
        showToast('success', 'Hasil verifikasi berhasil disahkan');
        setActiveIndForVerif(null);
        fetchIndicators();
      } else {
        showToast('error', res.message || 'Gagal menyimpan verifikasi');
      }
    } catch (err) {
      showToast('error', 'Terjadi kesalahan saat memverifikasi');
    } finally {
      setIsVerifying(false);
    }
  };

  // Filter local by status
  const filteredIndicators = indicators.filter(ind => {
    if (filterStatus === 'belum') return ind.skor_mandiri === null || ind.skor_mandiri === undefined;
    if (filterStatus === 'diisi') return ind.skor_mandiri !== null && ind.skor_mandiri !== undefined;
    if (filterStatus === 'disetujui') return ind.status_verifikasi === 'disetujui';
    if (filterStatus === 'revisi') return ind.status_verifikasi === 'perlu_perbaikan';
    return true;
  });

  // Helper filter bukti dukung per tahun
  const getBuktiByYear = (ind: KksIndikator, year: number) => {
    return (ind.bukti_dukung_list || []).filter(b => {
      if (b.tahun_dokumen) return Number(b.tahun_dokumen) === year;
      return year === docYears[0];
    });
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      
      {/* TOAST NOTIFICATION */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 p-4 rounded-2xl shadow-xl flex items-center gap-3 text-xs font-bold text-white transition-all animate-in slide-in-from-bottom-5 ${
          toast.type === 'success' ? 'bg-emerald-600 shadow-emerald-600/30' : 'bg-rose-600 shadow-rose-600/30'
        }`}>
          {toast.type === 'success' ? <Check className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
          <span>{toast.text}</span>
        </div>
      )}

      {/* 1. HORIZONTAL PILLS FOR TATANAN */}
      <div className="bg-white rounded-2xl p-3 border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-0.5">
          <button
            onClick={() => setActiveTatananId(null)}
            className={`px-4 py-2 rounded-xl text-xs font-black shrink-0 transition-all ${
              activeTatananId === null
                ? 'bg-slate-900 text-white shadow-md'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Semua Tatanan
          </button>

          {tatananList.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTatananId(t.id)}
              className={`px-4 py-2 rounded-xl text-xs font-black shrink-0 transition-all flex items-center gap-1.5 ${
                activeTatananId === t.id
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span>{t.nomor_tatanan === 0 ? 'Kelembagaan' : `Tatanan ${t.nomor_tatanan}`}</span>
              {t.total_indikator !== undefined && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                  activeTatananId === t.id ? 'bg-emerald-800 text-emerald-100' : 'bg-slate-200 text-slate-700'
                }`}>
                  {t.total_indikator}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* 2. FILTER & SEARCH CONTROLS */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari indikator, nomor, atau kata kunci..."
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium focus:outline-none focus:border-emerald-500"
            />
          </div>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
          >
            <option value="all">Semua Status</option>
            <option value="belum">Belum Diisi</option>
            <option value="diisi">Sudah Diisi</option>
            <option value="disetujui">Verifikasi Disetujui</option>
            <option value="revisi">Perlu Revisi</option>
          </select>
        </div>

        {isAuthenticated && user?.instansi_id && (
          <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer self-start md:self-auto bg-emerald-50/80 px-3 py-2 rounded-xl border border-emerald-100">
            <input
              type="checkbox"
              checked={onlyMyOpd}
              onChange={(e) => setOnlyMyOpd(e.target.checked)}
              className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
            />
            <span>Hanya Indikator Pengampu Saya ({user.instansi_singkatan || 'OPD'})</span>
          </label>
        )}
      </div>

      {/* 3. TABEL INSTRUMEN PENGISIAN RAMPING */}
      {loading ? (
        <div className="py-20 text-center text-xs font-bold text-slate-400 bg-white rounded-3xl border border-slate-200">
          Memuat butir indikator...
        </div>
      ) : filteredIndicators.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-3xl border border-slate-200 p-8 space-y-2">
          <Layers className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-700">Tidak ada indikator ditemukan</h3>
          <p className="text-xs text-slate-400">Coba ubah kata kunci pencarian atau filter tatanan di atas.</p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-black text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4 w-12 text-center">No</th>
                  <th className="py-3.5 px-4 min-w-[260px]">Indikator Penilaian & Pengampu</th>
                  <th className="py-3.5 px-4 w-36 text-center">Skor Mandiri</th>
                  <th className="py-3.5 px-4 min-w-[220px] bg-emerald-50/30 border-l border-r border-slate-200/70">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-emerald-900">Dokumen {docYears[0]}</span>
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100/70 px-1.5 py-0.5 rounded">PDF/Link</span>
                    </div>
                  </th>
                  <th className="py-3.5 px-4 min-w-[220px] bg-teal-50/30 border-r border-slate-200/70">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-teal-900">Dokumen {docYears[1]}</span>
                      <span className="text-[10px] font-bold text-teal-600 bg-teal-100/70 px-1.5 py-0.5 rounded">PDF/Link</span>
                    </div>
                  </th>
                  <th className="py-3.5 px-4 w-44 text-center">Status & Verifikasi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredIndicators.map((ind) => {
                  const hasScore = ind.skor_mandiri !== null && ind.skor_mandiri !== undefined;
                  const isVerified = ind.status_verifikasi === 'disetujui';
                  const isRevision = ind.status_verifikasi === 'perlu_perbaikan';
                  const buktiYear1 = getBuktiByYear(ind, docYears[0]);
                  const buktiYear2 = getBuktiByYear(ind, docYears[1]);

                  return (
                    <tr 
                      key={ind.id} 
                      className={`hover:bg-slate-50/60 transition-colors ${
                        isVerified ? 'bg-emerald-50/10' : isRevision ? 'bg-amber-50/15' : ''
                      }`}
                    >
                      {/* 1. NOMOR INDIKATOR */}
                      <td className="py-4 px-3 text-center align-top">
                        <span className="inline-flex items-center justify-center min-w-[2.25rem] px-2 py-1 rounded-xl bg-slate-100 text-slate-800 font-black text-xs border border-slate-200/70 shadow-2xs">
                          {ind.nomor_indikator}
                        </span>
                      </td>

                      {/* 2. NAMA INDIKATOR + TOMBOL BULAT (i) + PENGAMPU */}
                      <td className="py-4 px-4 align-top space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-[13px] md:text-sm font-black text-slate-900 leading-snug tracking-tight flex-1">
                            {ind.nama_indikator}
                          </h4>

                          <div className="flex items-center gap-1 shrink-0 mt-0.5">
                            {/* TOMBOL (i) BULAT MODAL INFO */}
                            <button
                              type="button"
                              onClick={() => {
                                setInfoIndikator(ind);
                                setIsEditingIndikator(false);
                              }}
                              title="Klik untuk melihat Definisi Operasional, Sumber Data, Bukti Dukung & Panduan Skor"
                              className="w-5 h-5 rounded-full bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white border border-blue-200 hover:border-blue-600 flex items-center justify-center shrink-0 transition-all shadow-2xs hover:scale-105 cursor-pointer"
                            >
                              <Info className="w-3.5 h-3.5" />
                            </button>

                            {/* TOMBOL PENSIL EDIT INDIKATOR */}
                            {isBapperida && (
                              <button
                                type="button"
                                onClick={() => handleStartEdit(ind)}
                                title="Edit Rincian Indikator (Definisi Operasional, Pengampu, Sumber Data, Bukti Dukung, & Skala)"
                                className="w-5 h-5 rounded-full bg-amber-50 hover:bg-amber-600 text-amber-600 hover:text-white border border-amber-200 hover:border-amber-600 flex items-center justify-center shrink-0 transition-all shadow-2xs hover:scale-105 cursor-pointer"
                              >
                                <Pencil className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* BADGES METADATA */}
                        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                          <span className="inline-flex items-center gap-1 font-bold text-[11px] px-2.5 py-0.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200/70 shadow-2xs">
                            <Building2 className="w-3 h-3 text-blue-600" />
                            <span>{ind.instansi_pengampu_nama || 'Pengampu OPD'}</span>
                          </span>

                          {getCrosscuttingNames(ind.crosscutting_instansi_ids).length > 0 && (
                            <span 
                              className="inline-flex items-center gap-1 font-semibold text-[10.5px] px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200/70 shadow-2xs"
                              title={`Dinas Terkait (Crosscutting): ${getCrosscuttingNames(ind.crosscutting_instansi_ids).join(', ')}`}
                            >
                              <Users className="w-3 h-3 text-indigo-600" />
                              <span>Lintas: {getCrosscuttingNames(ind.crosscutting_instansi_ids).slice(0, 2).join(', ')}{getCrosscuttingNames(ind.crosscutting_instansi_ids).length > 2 ? ` +${getCrosscuttingNames(ind.crosscutting_instansi_ids).length - 2}` : ''}</span>
                            </span>
                          )}

                          {activeTatananId === null && (
                            <span className="inline-block font-semibold text-[11px] px-2 py-0.5 rounded-lg bg-slate-100 text-slate-600 border border-slate-200/60">
                              {ind.nama_tatanan}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 3. SKOR MANDIRI DROPDOWN COMPACT */}
                      <td className="py-4 px-3 align-top text-center">
                        <select
                          value={hasScore ? String(ind.skor_mandiri) : ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val !== '') {
                              handleSaveSkor(ind, Number(val));
                            }
                          }}
                          className={`w-full py-2 px-2.5 rounded-xl text-xs font-black border transition-all cursor-pointer text-center shadow-2xs ${
                            hasScore
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                              : 'bg-slate-50 text-slate-400 border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <option value="">Pilih Skor</option>
                          <option value="100">100</option>
                          <option value="75">75</option>
                          <option value="50">50</option>
                          <option value="25">25</option>
                          <option value="0">0</option>
                        </select>
                      </td>

                      {/* 4. DOKUMEN TAHUN 1 (MISAL 2025) */}
                      <td className="py-4 px-3.5 align-top bg-emerald-50/15 border-l border-r border-slate-200/70 space-y-2">
                        {buktiYear1.length > 0 && (
                          <div className="space-y-1.5">
                            {buktiYear1.map((bukti) => (
                              <div 
                                key={bukti.id} 
                                className="bg-white px-2.5 py-1.5 rounded-xl border border-slate-200/90 flex items-center justify-between gap-1.5 text-[11px] shadow-2xs hover:border-emerald-300 transition-colors"
                              >
                                <div 
                                  className="flex items-center gap-1.5 truncate flex-1 cursor-pointer"
                                  onClick={() => {
                                    if (bukti.file_path) {
                                      setViewingDoc({ url: bukti.file_path, name: bukti.nama_berkas });
                                    } else if (bukti.url_external) {
                                      window.open(bukti.url_external, '_blank');
                                    }
                                  }}
                                  title="Klik untuk melihat berkas"
                                >
                                  {bukti.tipe_sumber === 'link_url' ? (
                                    <LinkIcon className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                                  ) : (
                                    <FileText className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                                  )}
                                  <span className="font-semibold text-slate-800 hover:text-emerald-700 transition-colors truncate" title={bukti.nama_berkas}>
                                    {bukti.nama_berkas}
                                  </span>
                                </div>
                                <div className="flex items-center gap-0.5 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (bukti.file_path) {
                                        setViewingDoc({ url: bukti.file_path, name: bukti.nama_berkas });
                                      } else if (bukti.url_external) {
                                        window.open(bukti.url_external, '_blank');
                                      }
                                    }}
                                    className="p-1 rounded-lg text-slate-400 hover:text-emerald-700 hover:bg-slate-50 transition-colors"
                                    title="Lihat Berkas"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteBukti(bukti.id)}
                                    className="p-1 rounded-lg text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                    title="Hapus Berkas"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="flex items-center justify-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              setActiveIndForUpload(ind);
                              setUploadTahunDokumen(docYears[0]);
                              setUploadNamaBerkas(`Bukti ${ind.nomor_indikator} (${docYears[0]})`);
                            }}
                            title={`Unggah Dokumen / Tautan Baru (${docYears[0]})`}
                            aria-label={`Unggah Dokumen Baru (${docYears[0]})`}
                            className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white border border-emerald-200 hover:border-emerald-600 transition-all shadow-2xs hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setLibraryPicker({ indicator: ind, tahunDokumen: docYears[0] });
                            }}
                            title={`Pilih dari Perpustakaan SAMP / Ruang Tematik KKS (${docYears[0]})`}
                            aria-label={`Pilih dari Perpustakaan SAMP (${docYears[0]})`}
                            className="p-2 rounded-xl bg-amber-50 hover:bg-amber-600 text-amber-700 hover:text-white border border-amber-200 hover:border-amber-600 transition-all shadow-2xs hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center"
                          >
                            <FolderOpen className="w-4 h-4" />
                          </button>
                        </div>
                      </td>

                      {/* 5. DOKUMEN TAHUN 2 (MISAL 2026) */}
                      <td className="py-4 px-3.5 align-top bg-teal-50/15 border-r border-slate-200/70 space-y-2">
                        {buktiYear2.length > 0 && (
                          <div className="space-y-1.5">
                            {buktiYear2.map((bukti) => (
                              <div 
                                key={bukti.id} 
                                className="bg-white px-2.5 py-1.5 rounded-xl border border-slate-200/90 flex items-center justify-between gap-1.5 text-[11px] shadow-2xs hover:border-teal-300 transition-colors"
                              >
                                <div 
                                  className="flex items-center gap-1.5 truncate flex-1 cursor-pointer"
                                  onClick={() => {
                                    if (bukti.file_path) {
                                      setViewingDoc({ url: bukti.file_path, name: bukti.nama_berkas });
                                    } else if (bukti.url_external) {
                                      window.open(bukti.url_external, '_blank');
                                    }
                                  }}
                                  title="Klik untuk melihat berkas"
                                >
                                  {bukti.tipe_sumber === 'link_url' ? (
                                    <LinkIcon className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                                  ) : (
                                    <FileText className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                                  )}
                                  <span className="font-semibold text-slate-800 hover:text-teal-700 transition-colors truncate" title={bukti.nama_berkas}>
                                    {bukti.nama_berkas}
                                  </span>
                                </div>
                                <div className="flex items-center gap-0.5 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (bukti.file_path) {
                                        setViewingDoc({ url: bukti.file_path, name: bukti.nama_berkas });
                                      } else if (bukti.url_external) {
                                        window.open(bukti.url_external, '_blank');
                                      }
                                    }}
                                    className="p-1 rounded-lg text-slate-400 hover:text-teal-700 hover:bg-slate-50 transition-colors"
                                    title="Lihat Berkas"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteBukti(bukti.id)}
                                    className="p-1 rounded-lg text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                    title="Hapus Berkas"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="flex items-center justify-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              setActiveIndForUpload(ind);
                              setUploadTahunDokumen(docYears[1]);
                              setUploadNamaBerkas(`Bukti ${ind.nomor_indikator} (${docYears[1]})`);
                            }}
                            title={`Unggah Dokumen / Tautan Baru (${docYears[1]})`}
                            aria-label={`Unggah Dokumen Baru (${docYears[1]})`}
                            className="p-2 rounded-xl bg-teal-50 hover:bg-teal-600 text-teal-700 hover:text-white border border-teal-200 hover:border-teal-600 transition-all shadow-2xs hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setLibraryPicker({ indicator: ind, tahunDokumen: docYears[1] });
                            }}
                            title={`Pilih dari Perpustakaan SAMP / Ruang Tematik KKS (${docYears[1]})`}
                            aria-label={`Pilih dari Perpustakaan SAMP (${docYears[1]})`}
                            className="p-2 rounded-xl bg-amber-50 hover:bg-amber-600 text-amber-700 hover:text-white border border-amber-200 hover:border-amber-600 transition-all shadow-2xs hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center"
                          >
                            <FolderOpen className="w-4 h-4" />
                          </button>
                        </div>
                      </td>

                      {/* 6. VERIFIKASI & CATATAN DESK */}
                      <td className="py-4 px-3 align-top text-center space-y-1.5">
                        {isVerified ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-100 text-emerald-800 text-[10px] font-black border border-emerald-200 shadow-2xs">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Disetujui ({ind.skor_verifikasi})</span>
                          </span>
                        ) : isRevision ? (
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-100 text-amber-800 text-[10px] font-black border border-amber-200 shadow-2xs">
                              <AlertTriangle className="w-3 h-3" />
                              <span>Perlu Revisi</span>
                            </span>
                            {ind.catatan_rekomendasi && (
                              <p className="text-[10px] text-amber-900 bg-amber-50 p-2 rounded-xl border border-amber-200 text-left line-clamp-2 leading-relaxed" title={ind.catatan_rekomendasi}>
                                {ind.catatan_rekomendasi}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="inline-block px-2.5 py-1 rounded-xl bg-slate-100 text-slate-500 text-[10px] font-bold border border-slate-200">
                            Belum Diverifikasi
                          </span>
                        )}

                        {/* Tombol Verifikasi untuk Admin/Bapperida */}
                        {isBapperida && (
                          <div>
                            <button
                              onClick={() => {
                                setActiveIndForVerif(ind);
                                setVerifSkor(ind.skor_verifikasi !== null && ind.skor_verifikasi !== undefined ? ind.skor_verifikasi : ind.skor_mandiri || 100);
                                setVerifStatus(ind.status_verifikasi || 'disetujui');
                                setVerifCatatan(ind.catatan_rekomendasi || '');
                              }}
                              className="mt-1.5 px-3 py-1.5 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 text-[10px] font-bold transition-all flex items-center justify-center gap-1 mx-auto shadow-2xs"
                            >
                              <ShieldCheck className="w-3.5 h-3.5" />
                              <span>Verifikasi Desk</span>
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL INFO BULAT (i) INDIKATOR */}
      {infoIndikator && !isEditingIndikator && (
        <div 
          onClick={() => setInfoIndikator(null)}
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overscroll-contain"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto overscroll-contain p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200"
          >
            {/* Header Modal */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-3 gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-lg bg-emerald-600 text-white font-black text-xs">
                    Indikator {infoIndikator.nomor_indikator}
                  </span>
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                    {infoIndikator.nama_tatanan}
                  </span>
                </div>
                <h3 className="font-black text-slate-900 text-base leading-snug">
                  {infoIndikator.nama_indikator}
                </h3>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                  <p className="text-xs text-blue-700 font-bold flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5" />
                    <span>Pengampu: {infoIndikator.instansi_pengampu_nama || 'OPD Terkait'}</span>
                  </p>

                  {getCrosscuttingNames(infoIndikator.crosscutting_instansi_ids).length > 0 && (
                    <p className="text-xs text-indigo-700 font-bold flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Crosscutting: {getCrosscuttingNames(infoIndikator.crosscutting_instansi_ids).join(', ')}</span>
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button 
                  onClick={() => setInfoIndikator(null)}
                  className="w-8 h-8 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Content Details */}
            <div className="space-y-4 text-xs">
              {/* 1. Definisi Operasional */}
              {infoIndikator.definisi_operasional && (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-1">
                  <span className="font-black text-slate-800 flex items-center gap-1.5">
                    <Info className="w-4 h-4 text-blue-600" />
                    <span>Definisi Operasional:</span>
                  </span>
                  <p className="text-slate-700 leading-relaxed font-medium">
                    {infoIndikator.definisi_operasional}
                  </p>
                </div>
              )}

              {/* 2. Sumber Data */}
              {infoIndikator.sumber_data && (
                <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-4 space-y-1">
                  <span className="font-black text-blue-900 flex items-center gap-1.5">
                    <Database className="w-4 h-4 text-blue-700" />
                    <span>Sumber Data:</span>
                  </span>
                  <p className="text-blue-800 leading-relaxed font-medium">
                    {infoIndikator.sumber_data}
                  </p>
                </div>
              )}

              {/* 3. Bukti Dukung yang Dibutuhkan */}
              {infoIndikator.bukti_dukung_dibutuhkan && (
                <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-4 space-y-1">
                  <span className="font-black text-amber-900 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-amber-700" />
                    <span>Bukti Dukung yang Dibutuhkan (Wajib PDF / Link):</span>
                  </span>
                  <p className="text-amber-800 leading-relaxed font-medium">
                    {infoIndikator.bukti_dukung_dibutuhkan}
                  </p>
                </div>
              )}

              {/* 4. Panduan Skala / Kategori Penilaian */}
              <div className="space-y-2">
                <span className="font-black text-slate-800 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Panduan Skala Kriteria Penilaian:</span>
                </span>
                
                <div className="grid grid-cols-1 gap-2">
                  {infoIndikator.kriteria_skala.map((k) => {
                    const isSelected = infoIndikator.skor_mandiri === k.skor;
                    return (
                      <div
                        key={k.id}
                        onClick={() => {
                          handleSaveSkor(infoIndikator, k.skor);
                          setInfoIndikator({ ...infoIndikator, skor_mandiri: k.skor });
                        }}
                        className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                          isSelected
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/30'
                        }`}
                      >
                        <span className={`px-2.5 py-1 rounded-xl text-xs font-black shrink-0 ${
                          isSelected ? 'bg-white text-emerald-900' : 'bg-slate-100 text-slate-800'
                        }`}>
                          {k.skor}
                        </span>
                        <div className="flex-1">
                          <p className="text-xs leading-relaxed font-medium pt-0.5">
                            {k.kriteria}
                          </p>
                          {isSelected && (
                            <span className="inline-block mt-1 text-[10px] font-bold text-emerald-100 bg-emerald-700 px-2 py-0.5 rounded">
                              ✓ Skor terpilih saat ini
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setInfoIndikator(null)}
                className="px-5 py-2 rounded-xl bg-slate-900 text-white font-black text-xs hover:bg-slate-800"
              >
                Tutup Informasi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EDIT RINCIAN INDIKATOR (DEFINISI OPERASIONAL, SUMBER DATA, BUKTI DUKUNG & SKALA) */}
      {infoIndikator && isEditingIndikator && (
        <div 
          onClick={() => setIsEditingIndikator(false)}
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overscroll-contain"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-2xl w-full max-h-[92vh] overflow-y-auto overscroll-contain p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200 text-xs"
          >
            {/* Header Modal Edit */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-3 gap-3">
              <div>
                <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 font-black text-[10px] uppercase">
                  Mode Pengaturan Master
                </span>
                <h3 className="font-black text-slate-900 text-base mt-1">
                  Edit Indikator Penilaian KKS
                </h3>
                <p className="text-[11px] text-slate-500">
                  Ubah definisi operasional, sumber data, bukti dukung, dan skala penilaian.
                </p>
              </div>

              <button 
                onClick={() => setIsEditingIndikator(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveIndikatorEdit} className="space-y-4 font-medium">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block font-bold text-slate-700 mb-1">Nomor Indikator *</label>
                  <input
                    type="text"
                    required
                    value={editNomor}
                    onChange={(e) => setEditNomor(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-bold text-slate-800 focus:outline-none focus:border-amber-500"
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
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Definisi Operasional</label>
                <textarea
                  rows={3}
                  value={editDO}
                  onChange={(e) => setEditDO(e.target.value)}
                  placeholder="Ketik definisi operasional..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Sumber Data</label>
                <textarea
                  rows={2}
                  value={editSumberData}
                  onChange={(e) => setEditSumberData(e.target.value)}
                  placeholder="Contoh: Aplikasi MPDN Kemenkes / Laporan Resmi Dinas Kesehatan..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Bukti Dukung yang Dibutuhkan</label>
                <textarea
                  rows={2}
                  value={editBukti}
                  onChange={(e) => setEditBukti(e.target.value)}
                  placeholder="Contoh: SK Tim, Laporan Monev dengan timestamp, tangkapan layar sistem..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* EDITOR SKALA KATEGORI / PENILAIAN */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <label className="block font-black text-slate-800">
                    Panduan Skala Penilaian & Kriteria Capaian
                  </label>
                  <span className="text-[10px] text-slate-400">Sesuaikan deskripsi untuk tiap level skor</span>
                </div>

                <div className="space-y-2">
                  {editKriteriaList.map((item, idx) => (
                    <div key={item.skor} className="flex items-start gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200">
                      <span className="px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white font-black text-xs shrink-0 w-14 text-center mt-0.5">
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
                        className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditingIndikator(false)}
                  className="px-4 py-2 rounded-xl font-bold text-slate-600 hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSavingIndEdit}
                  className="px-5 py-2 rounded-xl bg-amber-600 text-white hover:bg-amber-700 font-black shadow-md shadow-amber-600/20 disabled:opacity-50"
                >
                  {isSavingIndEdit ? 'Menyimpan...' : 'Simpan Pembaruan Indikator'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL UPLOAD BUKTI DUKUNG DENGAN PILIHAN TAHUN DOKUMEN & ANTI-DUPLIKASI HASH */}
      {activeIndForUpload && (
        <div 
          onClick={() => setActiveIndForUpload(null)}
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overscroll-contain"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto overscroll-contain p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-black text-slate-900 text-sm">Unggah Bukti Dukung KKS</h3>
                <p className="text-[11px] text-slate-500">Indikator: {activeIndForUpload.nomor_indikator} - {activeIndForUpload.nama_indikator}</p>
              </div>
              <button 
                onClick={() => setActiveIndForUpload(null)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUploadBukti} className="space-y-4">
              {/* Pilihan Tahun Dokumen (2025 atau 2026) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Tahun Dokumen Evaluasi
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {docYears.map((yr) => (
                    <button
                      key={yr}
                      type="button"
                      onClick={() => setUploadTahunDokumen(yr)}
                      className={`py-2 px-3 rounded-xl border text-xs font-black transition-all ${
                        uploadTahunDokumen === yr
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      Dokumen Tahun {yr}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tipe Sumber Switcher (PDF vs Link URL) */}
              <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setUploadTipe('file')}
                  className={`py-1.5 rounded-lg transition-all ${uploadTipe === 'file' ? 'bg-white text-emerald-800 shadow-sm' : 'text-slate-600'}`}
                >
                  File Berkas PDF
                </button>
                <button
                  type="button"
                  onClick={() => setUploadTipe('link')}
                  className={`py-1.5 rounded-lg transition-all ${uploadTipe === 'link' ? 'bg-white text-emerald-800 shadow-sm' : 'text-slate-600'}`}
                >
                  Tautan Link / Aplikasi
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nama / Keterangan Berkas</label>
                <input
                  type="text"
                  required
                  value={uploadNamaBerkas}
                  onChange={(e) => setUploadNamaBerkas(e.target.value)}
                  placeholder="Contoh: SK Tim Pembina 2025.pdf / Laporan Monev Dinkes"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium focus:outline-none focus:border-emerald-500"
                />
              </div>

              {uploadTipe === 'file' ? (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Pilih File PDF Dokumen (<span className="text-emerald-700 font-black">Khusus .PDF</span>)
                  </label>
                  <input
                    type="file"
                    required
                    accept=".pdf,application/pdf"
                    onChange={(e) => setUploadFile(e.target.files ? e.target.files[0] : null)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium cursor-pointer file:mr-3 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-emerald-100 file:text-emerald-800"
                  />
                  
                  {/* Anti-Duplikasi Hash Notice */}
                  <div className="mt-2 p-2.5 rounded-xl bg-blue-50 border border-blue-200 text-[11px] text-blue-800 flex items-start gap-2">
                    <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">Proteksi Hash Anti-Duplikasi SAMP:</span>
                      <p className="text-[10px] text-blue-700 mt-0.5">
                        Sistem secara otomatis menghitung hash file untuk mencegah pengunggahan dokumen yang sama. File identik akan ditolak sistem.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Alamat Tautan URL (Google Drive / Web Dinas)</label>
                  <input
                    type="url"
                    required
                    value={uploadLinkUrl}
                    onChange={(e) => setUploadLinkUrl(e.target.value)}
                    placeholder="https://drive.google.com/... atau https://dinkes.magelangkota.go.id"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium focus:outline-none focus:border-emerald-500"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveIndForUpload(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="px-5 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-black shadow-md shadow-emerald-600/20 disabled:opacity-50"
                >
                  {isUploading ? 'Memeriksa & Mengunggah...' : 'Simpan Bukti'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL VERIFIKASI TIM PEMBINA */}
      {activeIndForVerif && (
        <div 
          onClick={() => setActiveIndForVerif(null)}
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overscroll-contain"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto overscroll-contain p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-black text-slate-900 text-sm">Verifikasi Tim Pembina KKS</h3>
                <p className="text-[11px] text-slate-500">{activeIndForVerif.nomor_indikator} - {activeIndForVerif.nama_indikator}</p>
              </div>
              <button 
                onClick={() => setActiveIndForVerif(null)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveVerif} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Skor Verifikasi</label>
                  <select
                    value={verifSkor}
                    onChange={(e) => setVerifSkor(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-bold text-slate-800"
                  >
                    <option value={100}>100</option>
                    <option value={75}>75</option>
                    <option value={50}>50</option>
                    <option value={25}>25</option>
                    <option value={0}>0</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Status Verifikasi</label>
                  <select
                    value={verifStatus}
                    onChange={(e) => setVerifStatus(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-bold text-slate-800"
                  >
                    <option value="disetujui">Disetujui</option>
                    <option value="perlu_perbaikan">Perlu Perbaikan</option>
                    <option value="ditolak">Ditolak</option>
                    <option value="menunggu">Menunggu</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Catatan Desk / Rekomendasi Perbaikan</label>
                <textarea
                  rows={3}
                  value={verifCatatan}
                  onChange={(e) => setVerifCatatan(e.target.value)}
                  placeholder="Tuliskan catatan hasil pemeriksaan berkas atau hal yang perlu dilengkapi dinas terkait..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-medium focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveIndForVerif(null)}
                  className="px-4 py-2 rounded-xl font-bold text-slate-600 hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isVerifying}
                  className="px-5 py-2 rounded-xl bg-purple-600 text-white hover:bg-purple-700 font-black shadow-md shadow-purple-600/20 disabled:opacity-50"
                >
                  {isVerifying ? 'Menyimpan...' : 'Sahkan Verifikasi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL PEMILIH DOKUMEN PERPUSTAKAAN SAMP / KKS */}
      <KksLibraryPickerModal
        isOpen={!!libraryPicker}
        onClose={() => setLibraryPicker(null)}
        indicator={libraryPicker?.indicator || null}
        tahunDokumen={libraryPicker?.tahunDokumen || docYears[0]}
        onSelectDocument={handleSelectPustakaDoc}
        onPreview={(doc) => setViewingDoc({ url: doc.path, name: doc.nama_file })}
      />

      {/* DOCUMENT VIEWER MODAL */}
      <DocumentViewerModal
        isOpen={!!viewingDoc}
        onClose={() => setViewingDoc(null)}
        fileUrl={viewingDoc?.url || ''}
        fileName={viewingDoc?.name || ''}
      />

    </div>
  );
};
