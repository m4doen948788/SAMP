import React, { useState, useEffect } from 'react';
import { ArrowRight, Link as LinkIcon, ExternalLink, Sparkles, Layers, Info } from 'lucide-react';
import { api } from '@/src/services/api';

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
  created_at?: string;
}

const WorkLinksTable = () => {
  const [links, setLinks] = useState<AplikasiItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchLinks = async () => {
    setLoading(true);
    try {
      const res = await api.aplikasiExternal.getAll();
      if (res && res.success && Array.isArray(res.data)) {
        setLinks(res.data);
      }
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
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="card-modern h-full flex flex-col group/card">
      <div className="flex items-center justify-between px-6 py-5 border-b border-slate-50 bg-white group-hover/card:bg-indigo-50/20 transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
            <LinkIcon size={20} />
          </div>
          <h2 className="text-sm font-extrabold text-slate-800 tracking-tight uppercase">Daftar Link Kerja & Aplikasi</h2>
        </div>
        <button
          onClick={handleInputBaru}
          className="text-[10px] font-bold bg-indigo-600 text-white px-4 py-2 rounded-xl hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-500/30 transition-all uppercase tracking-wider cursor-pointer"
        >
          Input Baru
        </button>
      </div>

      <div className="flex-1 overflow-x-auto p-6 pt-2">
        <div className="rounded-2xl border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] overflow-hidden bg-white">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="p-4 text-center w-12 text-slate-400 font-black uppercase tracking-tighter border-r border-slate-100/50">#</th>
                <th className="p-4 text-left w-28 border-r border-slate-100/50 text-slate-400 font-bold uppercase tracking-wider">Tipe / Tgl</th>
                <th className="p-4 text-left border-r border-slate-100/50 text-slate-400 font-bold uppercase tracking-wider">Link Kerja / Aplikasi</th>
                <th className="p-4 text-center w-28 text-slate-400 font-bold uppercase tracking-wider">Sumber</th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {loading ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-400 animate-pulse">Memuat daftar link...</td>
                </tr>
              ) : links.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-400 italic">Belum ada link eksternal yang diinput. Klik "Input Baru" untuk menambah.</td>
                </tr>
              ) : (
                links.slice(0, 10).map((link, idx) => (
                  <tr key={link.id || idx} className="hover:bg-slate-50/80 transition-all border-b border-slate-50 group/row">
                    <td className="p-4 border-r border-slate-50 text-center text-slate-300 font-black tabular-nums">{idx + 1}</td>
                    <td className="p-4 border-r border-slate-50 text-slate-500 font-medium whitespace-nowrap tabular-nums">
                      {link.nama_tipe_link ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-semibold">
                          {link.nama_tipe_link}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[10px]">{formatDate(link.created_at)}</span>
                      )}
                    </td>
                    <td className="p-4 border-r border-slate-50">
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
                            {link.nama_tematik_list?.map((t, i) => (
                              <span key={i} className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-medium bg-purple-50 text-purple-700 border border-purple-100">
                                <Sparkles size={8} /> {t}
                              </span>
                            ))}
                            {link.nama_urusan_list?.map((u, i) => (
                              <span key={i} className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-medium bg-blue-50 text-blue-700 border border-blue-100" title={u}>
                                <Layers size={8} /> {u}
                              </span>
                            ))}
                          </div>
                        )}
                      </a>
                    </td>
                    <td className="p-4 text-center">
                      <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-widest group-hover/row:bg-indigo-100 group-hover/row:text-indigo-600 transition-all">
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
