import React, { useState, useEffect, useMemo } from 'react';
import { Link as LinkIcon, ExternalLink, Sparkles, Layers, Info, Building2, Filter } from 'lucide-react';
import { api } from '@/src/services/api';
import { useAuth } from '@/src/contexts/AuthContext';

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
  created_by?: number;
  creator_bidang_id?: number | null;
  creator_nama_bidang?: string | null;
  creator_singkatan_bidang?: string | null;
}

const WorkLinksTable = () => {
  const { user } = useAuth();
  const [links, setLinks] = useState<AplikasiItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedBidangId, setSelectedBidangId] = useState<number | 'ALL' | 'MY_BIDANG'>('MY_BIDANG');
  const [bidangOptions, setBidangOptions] = useState<{ id: number; nama: string }[]>([]);

  const fetchLinks = async () => {
    setLoading(true);
    try {
      const res = await api.aplikasiExternal.getAll();
      if (res && res.success && Array.isArray(res.data)) {
        setLinks(res.data);
      }

      // Fetch bidang options
      try {
        const resBidang = await api.bidangInstansi.getAll();
        if (resBidang && resBidang.success && Array.isArray(resBidang.data)) {
          const mapped = resBidang.data.map((b: any) => ({
            id: b.id,
            nama: (b.singkatan || b.nama_bidang || b.nama || `Bidang #${b.id}`).toUpperCase()
          }));
          setBidangOptions(mapped);
        }
      } catch { /* ignored */ }
    } catch (err) {
      console.error('Failed to fetch external links for WorkLinksTable', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLinks();
  }, []);

  const handleInputBaru = (e: React.MouseEvent) => {
    e.preventDefault();
    window.dispatchEvent(new CustomEvent('navigate-page', { detail: { page: 'master-aplikasi-external' } }));
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    const clean = String(dateStr).split(' ')[0].split('T')[0];
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

  // Filtered links based on selected Bidang
  const filteredLinks = useMemo(() => {
    if (selectedBidangId === 'ALL') return links;

    const targetBidangId = selectedBidangId === 'MY_BIDANG' ? (user?.bidang_id || null) : Number(selectedBidangId);
    if (!targetBidangId) return links;

    return links.filter(item => {
      if (item.creator_bidang_id && Number(item.creator_bidang_id) === targetBidangId) return true;
      if (user?.bidang_id === targetBidangId && item.created_by && Number(item.created_by) === Number(user.id)) return true;
      return false;
    });
  }, [links, selectedBidangId, user]);

  const userBidangLabel = (user?.bidang_singkatan || user?.bidang_nama || 'Bidang Saya').toUpperCase();

  return (
    <div className="card-modern h-full flex flex-col group/card">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-4 border-b border-slate-50 bg-white group-hover/card:bg-indigo-50/20 transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 shrink-0">
            <LinkIcon size={18} />
          </div>
          <h2 className="text-xs font-black text-slate-800 tracking-tight uppercase">Daftar Link Kerja & Aplikasi</h2>
        </div>

        {/* Filter Bidang Group */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-100/90 p-1 rounded-xl border border-slate-200/80 text-xs">
            <button
              type="button"
              onClick={() => setSelectedBidangId('ALL')}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold transition-all flex items-center gap-1 ${
                selectedBidangId === 'ALL'
                  ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/60'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Building2 size={12} />
              Semua Bidang
            </button>

            {user?.bidang_id && (
              <button
                type="button"
                onClick={() => setSelectedBidangId('MY_BIDANG')}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold transition-all flex items-center gap-1 max-w-[160px] truncate ${
                  selectedBidangId === 'MY_BIDANG'
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/20'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title={`Filter berdasarkan ${userBidangLabel}`}
              >
                <Filter size={11} className="shrink-0" />
                <span className="truncate">{userBidangLabel}</span>
              </button>
            )}

            {bidangOptions.length > 0 && (
              <select
                value={selectedBidangId === 'MY_BIDANG' ? (user?.bidang_id || 'ALL') : selectedBidangId}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === 'ALL') setSelectedBidangId('ALL');
                  else if (Number(val) === user?.bidang_id) setSelectedBidangId('MY_BIDANG');
                  else setSelectedBidangId(Number(val));
                }}
                className="bg-white border border-slate-200 text-slate-700 text-[10px] font-bold rounded-lg py-1 px-1.5 focus:ring-1 focus:ring-indigo-500 outline-none cursor-pointer max-w-[120px]"
              >
                <option value="ALL">-- Pilih Bidang --</option>
                {bidangOptions.map(b => (
                  <option key={b.id} value={b.id}>{b.nama}</option>
                ))}
              </select>
            )}
          </div>

          <button
            onClick={handleInputBaru}
            className="text-[10px] font-extrabold bg-indigo-600 text-white px-3 py-1.5 rounded-xl hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-500/30 transition-all uppercase tracking-wider cursor-pointer whitespace-nowrap"
          >
            Input Baru
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto p-6 pt-3">
        <div className="rounded-2xl border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] overflow-hidden bg-white">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="p-3 text-center w-10 text-slate-400 font-black uppercase tracking-tighter border-r border-slate-100/50">#</th>
                <th className="p-3 text-left w-28 border-r border-slate-100/50 text-slate-400 font-bold uppercase tracking-wider">Tipe / Tgl</th>
                <th className="p-3 text-left border-r border-slate-100/50 text-slate-400 font-bold uppercase tracking-wider">Link Kerja / Aplikasi</th>
                <th className="p-3 text-center w-24 text-slate-400 font-bold uppercase tracking-wider">Sumber</th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {loading ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-400 animate-pulse">Memuat daftar link...</td>
                </tr>
              ) : filteredLinks.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-400 italic">Belum ada link eksternal yang diinput untuk bidang ini. Klik "Input Baru" untuk menambah.</td>
                </tr>
              ) : (
                filteredLinks.slice(0, 10).map((link, idx) => (
                  <tr key={link.id || idx} className="hover:bg-slate-50/80 transition-all border-b border-slate-50 group/row">
                    <td className="p-3 border-r border-slate-50 text-center text-slate-300 font-black tabular-nums">{idx + 1}</td>
                    <td className="p-3 border-r border-slate-50 text-slate-500 font-medium whitespace-nowrap tabular-nums">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-slate-600 font-bold text-xs">
                          {formatDate(link.tanggal_link || link.created_at)}
                        </span>
                        {link.nama_tipe_link && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[9px] font-semibold w-fit">
                            {link.nama_tipe_link}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-3 border-r border-slate-50">
                      <a 
                        href={link.url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        title={link.keterangan || link.nama_aplikasi}
                        className="flex flex-col gap-1 group/link"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-700 group-hover/link:text-indigo-600 transition-colors leading-snug flex items-center gap-1.5">
                            {link.nama_aplikasi}
                            {link.keterangan && (
                              <span className="text-slate-400 hover:text-indigo-500 transition-colors" title={`Tooltip: ${link.keterangan}`}>
                                <Info size={13} />
                              </span>
                            )}
                          </span>
                          <ExternalLink size={12} className="opacity-0 -translate-x-2 group-hover/link:opacity-100 group-hover/link:translate-x-0 transition-all duration-300 text-indigo-500 shrink-0" />
                        </div>

                        {/* Tematik & Urusan Badges */}
                        {((link.nama_tematik_list && link.nama_tematik_list.length > 0) || (link.nama_urusan_list && link.nama_urusan_list.length > 0)) && (
                          <div className="flex flex-wrap gap-1 mt-0.5">
                            {link.nama_tematik_list && link.nama_tematik_list.length > 0 && (
                              <span 
                                className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-medium bg-purple-50 text-purple-700 border border-purple-100 max-w-[110px] truncate cursor-help" 
                                title={`Daftar Tematik (${link.nama_tematik_list.length}): ${link.nama_tematik_list.join(', ')}`}
                              >
                                <Sparkles size={8} className="shrink-0" /> {link.nama_tematik_list[0]} {link.nama_tematik_list.length > 1 ? `+${link.nama_tematik_list.length - 1}` : ''}
                              </span>
                            )}
                            {link.nama_urusan_list && link.nama_urusan_list.length > 0 && (
                              <span 
                                className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-medium bg-blue-50 text-blue-700 border border-blue-100 max-w-[130px] truncate cursor-help" 
                                title={`Daftar Urusan (${link.nama_urusan_list.length}):\n• ${link.nama_urusan_list.join('\n• ')}`}
                              >
                                <Layers size={8} className="shrink-0" /> {link.nama_urusan_list[0]} {link.nama_urusan_list.length > 1 ? `+${link.nama_urusan_list.length - 1}` : ''}
                              </span>
                            )}
                          </div>
                        )}
                      </a>
                    </td>
                    <td className="p-3 text-center">
                      <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-widest group-hover/row:bg-indigo-100 group-hover/row:text-indigo-600 transition-all">
                        {link.sumber || link.asal_instansi || '-'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default WorkLinksTable;
