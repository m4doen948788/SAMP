import React, { useState, useEffect, useMemo } from 'react';
import { Zap, ExternalLink, Sparkles, Layers, Info, Building2, Filter, Clock, Calendar, Plus, Link2, Star } from 'lucide-react';
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
  is_quick_access?: number | boolean;
  is_qa_all?: number | boolean;
  is_qa_bidang?: number | boolean;
  is_qa_personal?: number | boolean;
  user_is_qa_personal?: number | boolean;
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
  const [selectedBidangId, setSelectedBidangId] = useState<number | 'ALL' | 'MY_BIDANG' | 'PERSONAL'>('MY_BIDANG');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  const checkCanReorder = (userObj: any, currentSelectedBidang: number | 'ALL' | 'MY_BIDANG' | 'PERSONAL') => {
    if (!userObj) return false;
    const roleId = Number(userObj.role_id || userObj.roleId || userObj.tipe_user_id || 0);
    const isSuperadminOrAdmin = roleId === 1 || roleId === 2 || Boolean(userObj.is_admin || userObj.isAdmin);
    if (isSuperadminOrAdmin) return true;

    if (currentSelectedBidang === 'ALL' || currentSelectedBidang === 'PERSONAL') return false;

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
    const currentUserId = user?.id ? Number(user.id) : null;
    const userBidangId = user?.bidang_id ? Number(user.bidang_id) : null;

    if (selectedBidangId === 'PERSONAL') {
      return data.filter(item => Number(item.user_is_qa_personal) === 1 || (Number(item.is_qa_personal) === 1 && Number(item.created_by) === currentUserId));
    }

    if (selectedBidangId === 'ALL') {
      return data.filter(item => Number(item.is_qa_all) === 1);
    }

    const targetBidangId = selectedBidangId === 'MY_BIDANG' ? userBidangId : Number(selectedBidangId);

    return data.filter(item => {
      if (Number(item.is_qa_all) === 0 && Number(item.is_qa_bidang) === 0 && Number(item.created_by) !== currentUserId) {
        return false;
      }
      if (Number(item.is_qa_all) === 1) return true;
      if (targetBidangId && item.creator_bidang_id && Number(item.creator_bidang_id) === targetBidangId) return true;
      if (targetBidangId && userBidangId === targetBidangId && item.created_by && Number(item.created_by) === currentUserId) return true;
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
      header: getLabel('master_aplikasi_external', 'sumber', 'Sumber / Instansi'),
      key: 'sumber',
      render: (item: AplikasiItem) => (
        <span className="font-semibold text-slate-600 text-xs truncate max-w-[110px] block" title={item.sumber || item.asal_instansi || '-'}>
          {item.sumber || item.asal_instansi || '-'}
        </span>
      )
    },
    {
      header: getLabel('master_aplikasi_external', 'tipe_link_id', 'Tipe Link'),
      key: 'nama_tipe_link',
      render: (item: AplikasiItem) => (
        item.nama_tipe_link ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60 whitespace-nowrap">
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
        return (
          <div className="flex items-center gap-1 cursor-help" title={`Daftar Urusan (${uList.length}):\n• ${uList.join('\n• ')}`}>
            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/60 max-w-[90px] truncate">
              <Layers size={10} className="text-blue-500 shrink-0" /> {uList[0]}
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
      header: getLabel('master_aplikasi_external', 'tagging', 'Tematik'),
      key: 'tagging',
      render: (item: AplikasiItem) => {
        const tList = item.nama_tematik_list || [];
        if (tList.length === 0) return <span className="text-slate-400 text-xs italic">-</span>;
        return (
          <div className="flex items-center gap-1 cursor-help" title={`Daftar Tematik (${tList.length}): ${tList.join(', ')}`}>
            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200/60 max-w-[90px] truncate">
              <Sparkles size={10} className="text-purple-500 shrink-0" /> {tList[0]}
            </span>
            {tList.length > 1 && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-purple-100 text-purple-800 border border-purple-300/60 shrink-0">
                +{tList.length - 1}
              </span>
            )}
          </div>
        );
      }
    },
    {
      header: getLabel('master_aplikasi_external', 'tanggal_link', 'Tgl Link'),
      key: 'tanggal_link',
      render: (item: AplikasiItem) => (
        <div className="flex items-center gap-1 text-slate-600 text-xs font-medium whitespace-nowrap" title={`Tanggal Link: ${item.tanggal_link || '-'}`}>
          <Calendar size={12} className="text-slate-400 shrink-0" />
          <span>{formatDisplayDate(item.tanggal_link)}</span>
        </div>
      )
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
      {/* Main Content Area */}
      {viewMode === 'grid' ? (
        <div className="card-modern p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
                <Zap size={20} />
              </div>
              <div>
                <h1 className="text-base font-black text-slate-800 uppercase tracking-tight">Quick Access</h1>
                <p className="text-slate-400 text-xs">Akses cepat link kerja dan aplikasi eksternal instansi</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
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

                <button
                  type="button"
                  onClick={() => setSelectedBidangId('PERSONAL')}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-extrabold transition-all flex items-center gap-1.5 ${
                    selectedBidangId === 'PERSONAL'
                      ? 'bg-purple-600 text-white shadow-sm shadow-purple-500/20'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                  title="Filter link Quick Access Personal milik saya"
                >
                  <Star size={13} className="shrink-0" />
                  Personal
                </button>
              </div>

              <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80">
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    viewMode === 'grid' ? 'bg-white text-indigo-900 shadow-md' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Kartu
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    viewMode === 'table' ? 'bg-white text-indigo-900 shadow-md' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Tabel
                </button>
              </div>

              <button
                onClick={() => window.dispatchEvent(new CustomEvent('navigate-page', { detail: { page: 'master-aplikasi-external' } }))}
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5"
              >
                <Plus size={15} /> Kelola Link
              </button>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map(n => (
                <div key={n} className="h-32 bg-slate-100 rounded-2xl animate-pulse"></div>
              ))}
            </div>
          ) : filteredData.length === 0 ? (
            <div className="text-center py-16 text-slate-400 space-y-2">
              <Zap size={36} className="mx-auto text-amber-400 fill-amber-100 animate-bounce" />
              <p className="font-extrabold text-slate-700 text-sm">Belum Ada Link Quick Access di Kategori Ini</p>
              <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                Gunakan menu <strong className="text-indigo-600">QAF 3-titik</strong> di Master Link Eksternal untuk menambahkan link ke Quick Access {selectedBidangId === 'PERSONAL' ? 'Personal' : selectedBidangId === 'ALL' ? 'Semua Bidang' : userBidangLabel}.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredData.map((item, idx) => (
                <div
                  key={item.id || idx}
                  draggable={canReorder}
                  onDragStart={(e) => {
                    if (!canReorder) return;
                    e.dataTransfer.setData('text/plain', String(idx));
                  }}
                  onDragOver={(e) => canReorder && e.preventDefault()}
                  onDrop={(e) => {
                    if (!canReorder) return;
                    e.preventDefault();
                    const dragIdx = parseInt(e.dataTransfer.getData('text/plain'), 10);
                    if (isNaN(dragIdx) || dragIdx === idx) return;
                    const newArr = [...filteredData];
                    const [moved] = newArr.splice(dragIdx, 1);
                    newArr.splice(idx, 0, moved);
                    handleReorder(newArr);
                  }}
                  className={`group relative p-4 rounded-2xl border border-slate-200/80 bg-white hover:border-indigo-300 hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-300 flex flex-col justify-between ${
                    canReorder ? 'cursor-grab active:cursor-grabbing' : ''
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-extrabold text-slate-800 text-sm leading-snug group-hover:text-indigo-600 transition-colors line-clamp-2">
                        {item.nama_aplikasi}
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60 text-[9px] font-bold shrink-0">
                        <Link2 size={9} /> {item.nama_tipe_link || 'Aplikasi'}
                      </span>
                    </div>

                    {item.keterangan && (
                      <p className="text-slate-500 text-xs leading-relaxed line-clamp-2" title={item.keterangan}>
                        {item.keterangan}
                      </p>
                    )}

                    <div className="flex flex-wrap gap-1 pt-1">
                      {item.nama_urusan_list && item.nama_urusan_list.map((u, i) => (
                        <span key={i} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/60">
                          <Layers size={8} /> {u}
                        </span>
                      ))}
                      {item.nama_tematik_list && item.nama_tematik_list.map((t, i) => (
                        <span key={i} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-purple-50 text-purple-700 border border-purple-200/60">
                          <Sparkles size={8} /> {t}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 mt-3 border-t border-slate-100 text-[10px] text-slate-400">
                    <span className="font-semibold">{item.sumber || item.asal_instansi || 'Internal'}</span>
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[11px] transition-all shadow-sm group/btn"
                    >
                      <span>Buka</span>
                      <ExternalLink size={11} className="group-hover/btn:translate-x-0.5 transition-transform" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <BaseDataTable<AplikasiItem>
          title="Quick Access"
          subtitle="Portal tautan dan aplikasi kerja eksternal instansi."
          data={filteredData}
          columns={columns}
          loading={loading}
          renderHeaderButtons={
            <div className="flex items-center gap-2">
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

                <button
                  type="button"
                  onClick={() => setSelectedBidangId('PERSONAL')}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-extrabold transition-all flex items-center gap-1.5 ${
                    selectedBidangId === 'PERSONAL'
                      ? 'bg-purple-600 text-white shadow-sm shadow-purple-500/20'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                  title="Filter link Quick Access Personal milik saya"
                >
                  <Star size={13} className="shrink-0" />
                  Personal
                </button>
              </div>

              <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80 text-xs">
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    viewMode === 'grid' ? 'bg-white text-indigo-900 shadow-md' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Kartu
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    viewMode === 'table' ? 'bg-white text-indigo-900 shadow-md' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Tabel
                </button>
              </div>
            </div>
          }
        />
      )}
    </div>
  );
};

export default QuickAccessPage;
