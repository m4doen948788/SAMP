import React, { useState, useEffect, useMemo } from 'react';
import { ArrowRight, Zap, ExternalLink } from 'lucide-react';
import { api } from '@/src/services/api';
import { useAuth } from '@/src/contexts/AuthContext';

interface AplikasiItem {
  id: number;
  nama_aplikasi: string;
  url: string;
  keterangan?: string | null;
  is_quick_access?: number | boolean;
  creator_bidang_id?: number | null;
  created_by?: number;
  urutan?: number;
}

const QuickAccessDashboardCard = () => {
  const { user } = useAuth();
  const [links, setLinks] = useState<AplikasiItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchQuickAccess = async () => {
      try {
        setLoading(true);
        const res = await api.aplikasiExternal.getAll();
        if (res && res.success && Array.isArray(res.data)) {
          setLinks(res.data);
        }
      } catch (err) {
        console.error('Failed to fetch quick access for dashboard:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchQuickAccess();
  }, []);

  const quickAccessLinks = useMemo(() => {
    // Only include links with is_quick_access === 1
    const qaItems = links.filter(item => Number(item.is_quick_access) === 1);
    
    // If user belongs to a bidang, filter by user's bidang or user's created items
    if (user?.bidang_id) {
      const bidangItems = qaItems.filter(item => {
        if (item.creator_bidang_id && Number(item.creator_bidang_id) === Number(user.bidang_id)) return true;
        if (item.created_by && Number(item.created_by) === Number(user.id)) return true;
        return false;
      });
      // If user's bidang has items, show them; otherwise show all QA items
      return bidangItems.length > 0 ? bidangItems : qaItems;
    }
    return qaItems;
  }, [links, user]);

  return (
    <div className="card-modern flex flex-col h-full group/card transition-all duration-500 hover:shadow-2xl hover:shadow-indigo-500/10 hover:-translate-y-1">
      <div className="px-5 py-4 border-b border-slate-50 bg-white group-hover/card:bg-indigo-50/30 transition-colors flex items-center justify-between">
        <h2 className="text-[11px] font-black text-slate-800 tracking-widest uppercase flex items-center gap-1.5 leading-tight">
          <Zap size={14} className="text-amber-500 fill-amber-400" />
          QUICK ACCESS
        </h2>
        {quickAccessLinks.length > 0 && (
          <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[10px] font-extrabold border border-amber-200">
            {quickAccessLinks.length}
          </span>
        )}
      </div>

      <div className="p-4 flex-1 flex flex-col justify-between">
        {loading ? (
          <div className="space-y-3 py-2">
            {[1, 2, 3, 4].map(n => (
              <div key={n} className="h-4 bg-slate-100 rounded animate-pulse"></div>
            ))}
          </div>
        ) : quickAccessLinks.length === 0 ? (
          <div className="py-8 text-center text-slate-400 space-y-1 my-auto">
            <Zap size={24} className="mx-auto text-amber-300 fill-amber-50" />
            <p className="text-xs font-bold text-slate-600">Quick Access Kosong</p>
            <p className="text-[10px] text-slate-400 max-w-[200px] mx-auto leading-relaxed">
              Aktifkan sakelar "Quick Access" di Master Link Eksternal untuk memunculkan link cepat di sini.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {quickAccessLinks.slice(0, 10).map((link) => (
              <li key={link.id} className="group/item">
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={link.keterangan || link.nama_aplikasi}
                  className="flex items-start gap-2 text-[11px] font-semibold text-slate-600 hover:text-indigo-600 transition-all duration-300"
                >
                  <div className="mt-1 w-1.5 h-1.5 rounded-full bg-amber-400 group-hover/item:bg-indigo-500 group-hover/item:scale-125 transition-all shrink-0" />
                  <span className="flex-1 group-hover/item:translate-x-1 transition-transform duration-300 line-clamp-2">
                    {link.nama_aplikasi}
                  </span>
                  <ArrowRight size={12} className="mt-0.5 opacity-0 -translate-x-2 group-hover/item:opacity-100 group-hover/item:translate-x-0 transition-all duration-300 text-indigo-500 shrink-0" />
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default QuickAccessDashboardCard;
