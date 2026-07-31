import React, { useState, useEffect, useMemo } from 'react';
import { Zap, ExternalLink, Sparkles, Layers, Info, Building2, Filter, Clock, Calendar, Plus, Link2 } from 'lucide-react';
import { api } from '@/src/services/api';
import { useAuth } from '@/src/contexts/AuthContext';
import { useLabels } from '@/src/contexts/LabelContext';
import { BaseDataTable } from '@/src/features/common/components/BaseDataTable';

interface AplikasiItem {
  id: number;
  nama_aplikasi: string;
  url: string;
  sumber?: string;
  asal_instansi?: string;
  tipe_link_id?: number | null;
  nama_tipe_link?: string;
  nama_urusan_list?: string[];
  nama_tematik_list?: string[];
  keterangan?: string | null;
  tanggal_link?: string | null;
  created_at?: string;
  updated_at?: string;
  created_by?: number;
  created_by_name?: string;
  updated_by_name?: string;
  creator_bidang_id?: number | null;
  creator_nama_bidang?: string | null;
  creator_singkatan_bidang?: string | null;
}

const QuickAccessPage = () => {
  const { user } = useAuth();
  const { getLabel } = useLabels();
  const [data, setData] = useState<AplikasiItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBidangId, setSelectedBidangId] = useState<number | 'ALL' | 'MY_BIDANG'>('MY_BIDANG');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  const checkCanReorder = (userObj: any, currentSelectedBidang: number | 'ALL' | 'MY_BIDANG') => {
    if (!userObj) return false;
    const roleId = Number(userObj.role_id || userObj.roleId || userObj.tipe_user_id || 0);
    const isSuperadminOrAdmin = roleId === 1 || roleId === 2 || Boolean(userObj.is_admin || userObj.isAdmin);
    if (isSuperadminOrAdmin) return true;

    // Kabid & Katim can only reorder when viewing their own Bidang
    if (currentSelectedBidang === 'ALL') return false;

    const jab = String(userObj.jabatan_nama || userObj.jabatan || '').toLowerCase();
    const roleName = String(userObj.tipe_user_nama || userObj.role_name || '').toLowerCase();

    const isKabid = jab.includes('kabid') || jab.includes('kepala bidang');
    const isKatim = jab.includes('katim') || jab.includes('ketua tim');
    const isAdminBidang = roleName.includes('admin') || jab.includes('admin bidang') || roleName.includes('verifikator');

    return isKabid || isKatim || isAdminBidang;
  };

  const canReorder = useMemo(() => {
    return checkCanReorder(user, selectedBidangId);
  }, [user, selectedBidangId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.aplikasiExternal.getAll();
      if (res && res.success && Array.isArray(res.data)) {
        setData(res.data);
      } else {
        setError(res?.message || 'Gagal memuat data Quick Access');
      }
    } catch {
      setError('Gagal mengambil data Quick Access');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredData = useMemo(() => {
    if (selectedBidangId === 'ALL') return data;

    const targetBidangId = selectedBidangId === 'MY_BIDANG' ? (user?.bidang_id || null) : Number(selectedBidangId);
    if (!targetBidangId) return data;

    return data.filter(item => {
      if (item.creator_bidang_id && Number(item.creator_bidang_id) === targetBidangId) return true;
      if (user?.bidang_id === targetBidangId && item.created_by && Number(item.created_by) === Number(user.id)) return true;
      return false;
    });
  }, [data, selectedBidangId, user]);

  const handleReorder = async (reorderedItems: AplikasiItem[]) => {
    setData(reorderedItems);
    try {
      const payload = reorderedItems.map((item, idx) => ({
        id: Number(item.id),
        urutan: idx + 1
      }));
      await api.aplikasiExternal.reorder(payload);
    } catch (err) {
      console.error('Failed to save reorder on Quick Access:', err);
      fetchData();
    }
  };

  const formatDisplayDate = (dStr?: string | null) => {
    if (!dStr) return '-';
    const clean = String(dStr).split(' ')[0].split('T')[0];
    const parts = clean.split('-');
    if (parts.length === 3) {
      const [year, month, day] = parts;
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'];
      const mIdx = parseInt(month, 10) - 1;
      if (mIdx >= 0 && mIdx < 12) {
        return `${day} ${months[mIdx]} ${year}`;
      }
    }
    return clean;
  };

  const userBidangLabel = (user?.bidang_singkatan || user?.bidang_nama || 'Bidang Saya').toUpperCase();

  const columns = [
    {
      header: getLabel('master_aplikasi_external', 'nama_aplikasi', 'Nama Link / Aplikasi'),
      key: 'nama_aplikasi',
      render: (item: AplikasiItem) => (
        <div className="flex items-center gap-1.5 max-w-[180px]" title={item.keterangan || item.nama_aplikasi}>
          <span className="font-bold text-slate-800 tracking-tight text-xs truncate">
            {item.nama_aplikasi}
          </span>
          {item.keterangan && (
            <span className="inline-flex items-center text-slate-400 hover:text-indigo-600 transition-colors cursor-help shrink-0" title={`Keterangan: ${item.keterangan}`}>
              <Info size={13} />
            </span>
          )}
        </div>
      )
    },
    {
      header: getLabel('master_aplikasi_external', 'tanggal_link', 'Tgl Link'),
      key: 'tanggal_link',
      render: (item: AplikasiItem) => (
        <div className="flex items-center gap-1 text-slate-600 text-xs font-medium whitespace-nowrap">
          <Calendar size={12} className="text-slate-400 shrink-0" />
          <span>{formatDisplayDate(item.tanggal_link)}</span>
        </div>
      )
    },
    {
      header: getLabel('master_aplikasi_external', 'tipe_link_id', 'Tipe Link'),
      key: 'nama_tipe_link',
      render: (item: AplikasiItem) => (
        item.nama_tipe_link ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60 whitespace-nowrap">
            <Link2 size={10} /> {item.nama_tipe_link}
          </span>
        ) : (
          <span className="text-slate-400 text-xs italic">-</span>
        )
      )
    },
    {
      header: getLabel('master_aplikasi_external', 'urusan_id', 'Urusan'),
      key: 'nama_urusan',
      render: (item: AplikasiItem) => {
        const uList = item.nama_urusan_list || [];
        if (uList.length === 0) return <span className="text-slate-400 text-xs italic">-</span>;

        const fullListStr = uList.join('\n• ');
        return (
          <div className="flex items-center gap-1 cursor-help" title={`Daftar Urusan (${uList.length}):\n• ${fullListStr}`}>
            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200/60 max-w-[90px] truncate">
              <Layers size={9} className="text-blue-500 shrink-0" /> {uList[0]}
            </span>
            {uList.length > 1 && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-blue-100 text-blue-800 border border-blue-300/60 shrink-0">
                +{uList.length - 1}
              </span>
            )}
          </div>
        );
      }
    },
    {
      header: getLabel('master_aplikasi_external', 'url', 'Buka Aplikasi'),
      key: 'url',
      render: (item: AplikasiItem) => (
        <a 
          href={item.url} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-indigo-50 hover:bg-indigo-600 text-indigo-600 hover:text-white font-bold text-xs transition-all shadow-sm group/btn"
        >
          <span>Kunjungi</span>
          <ExternalLink size={12} className="group-hover/btn:translate-x-0.5 transition-transform" />
        </a>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="card-modern p-6 bg-gradient-to-br from-indigo-900 via-indigo-800 to-slate-900 text-white shadow-xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-60 h-60 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <h1 className="text-2xl font-black tracking-tight text-white">Quick Access</h1>
            <p className="text-indigo-200 text-xs max-w-xl leading-relaxed">
              Portal tautan dan aplikasi kerja eksternal instansi. Geser (*drag & drop*) posisi link untuk mengatur urutan prioritas akses cepat.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* View Mode Switcher */}
            <div className="flex items-center bg-white/10 p-1 rounded-xl border border-white/10 backdrop-blur-md">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewMode === 'grid' ? 'bg-white text-indigo-900 shadow-md' : 'text-indigo-200 hover:text-white'
                }`}
              >
                Kartu
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewMode === 'table' ? 'bg-white text-indigo-900 shadow-md' : 'text-indigo-200 hover:text-white'
                }`}
              >
                Tabel
              </button>
            </div>

            <button
              onClick={() => window.dispatchEvent(new CustomEvent('navigate-page', { detail: { page: 'master-aplikasi-external' } }))}
              className="px-4 py-2 bg-indigo-500 hover:bg-indigo-400 text-white rounded-xl text-xs font-bold transition-all shadow-lg flex items-center gap-1.5"
            >
              <Plus size={15} /> Kelola Link
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {viewMode === 'grid' ? (
        <div className="card-modern p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                <Zap size={18} />
              </div>
              <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-tight">Daftar Quick Access</h2>
            </div>

            {/* Filter Bidang Buttons */}
            <div className="flex items-center gap-1 bg-slate-100/90 p-1 rounded-xl border border-slate-200/80 text-xs">
              <button
                type="button"
                onClick={() => setSelectedBidangId('ALL')}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-extrabold transition-all flex items-center gap-1.5 ${
                  selectedBidangId === 'ALL'
                    ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/60'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Building2 size={13} />
                Semua Bidang
              </button>

              {user?.bidang_id && (
                <button
                  type="button"
                  onClick={() => setSelectedBidangId('MY_BIDANG')}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-extrabold transition-all flex items-center gap-1.5 max-w-[210px] truncate ${
                    selectedBidangId === 'MY_BIDANG'
                      ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/20'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                  title={`Filter berdasarkan ${userBidangLabel}`}
                >
                  <Filter size={12} className="shrink-0" />
                  <span className="truncate">{userBidangLabel}</span>
                </button>
              )}
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map(n => (
                <div key={n} className="h-32 bg-slate-100 rounded-2xl animate-pulse"></div>
              ))}
            </div>
          ) : filteredData.length === 0 ? (
            <div className="text-center py-16 text-slate-400 italic">
              Belum ada link Quick Access untuk bidang ini.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredData.map((item, idx) => (
                <a
                  key={item.id || idx}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative p-5 bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-xl hover:border-indigo-300 transition-all duration-300 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs group-hover:scale-110 transition-transform">
                        {idx + 1}
                      </span>
                      <ExternalLink size={14} className="text-slate-400 group-hover:text-indigo-600 transition-colors" />
                    </div>
                    <h3 className="font-extrabold text-slate-800 text-sm group-hover:text-indigo-600 transition-colors line-clamp-2">
                      {item.nama_aplikasi}
                    </h3>
                    {item.keterangan && (
                      <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                        {item.keterangan}
                      </p>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                    <span className="font-medium truncate max-w-[120px]">{item.sumber || item.asal_instansi || 'Instansi'}</span>
                    <span className="font-bold text-indigo-600 group-hover:underline">Buka Aplikasi &rarr;</span>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      ) : (
        <BaseDataTable<AplikasiItem>
          title="Tabel Quick Access"
          subtitle="Daftar lengkap link eksternal dan portal aplikasi kerja."
          data={filteredData}
          columns={columns}
          loading={loading}
          error={error}
          searchPlaceholder="Cari aplikasi..."
          isReorderable={canReorder}
          onReorder={handleReorder}
          renderHeaderButtons={
            <div className="flex items-center gap-1 bg-slate-100/90 p-1 rounded-xl border border-slate-200/80 text-xs">
              <button
                type="button"
                onClick={() => setSelectedBidangId('ALL')}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-extrabold transition-all flex items-center gap-1.5 ${
                  selectedBidangId === 'ALL'
                    ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/60'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Building2 size={13} />
                Semua Bidang
              </button>

              {user?.bidang_id && (
                <button
                  type="button"
                  onClick={() => setSelectedBidangId('MY_BIDANG')}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-extrabold transition-all flex items-center gap-1.5 max-w-[210px] truncate ${
                    selectedBidangId === 'MY_BIDANG'
                      ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/20'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                  title={`Filter berdasarkan ${userBidangLabel}`}
                >
                  <Filter size={12} className="shrink-0" />
                  <span className="truncate">{userBidangLabel}</span>
                </button>
              )}
            </div>
          }
        />
      )}
    </div>
  );
};

export default QuickAccessPage;
