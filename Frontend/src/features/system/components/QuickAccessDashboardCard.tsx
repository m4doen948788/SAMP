import React, { useState, useEffect, useMemo } from 'react';
import { ArrowRight, Zap, Filter, Building2, Globe } from 'lucide-react';
import { api } from '@/src/services/api';
import { useAuth } from '@/src/contexts/AuthContext';

interface AplikasiItem {
  id: number;
  nama_aplikasi: string;
  url: string;
  keterangan?: string | null;
  is_quick_access?: number | boolean;
  is_qa_all?: number | boolean;
  is_qa_bidang?: number | boolean;
  is_qa_personal?: number | boolean;
  creator_bidang_id?: number | null;
  created_by?: number;
  urutan?: number;
}

const QuickAccessDashboardCard = () => {
  const { user } = useAuth();
  const [links, setLinks] = useState<AplikasiItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedBidangId, setSelectedBidangId] = useState<'ALL' | 'MY_BIDANG'>('MY_BIDANG');

  const userBidangSingkatan = (user?.bidang_singkatan || user?.bidang_nama || 'BIDANG SAYA').toUpperCase();

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
    const currentUserId = user?.id ? Number(user.id) : null;
    const userBidangId = user?.bidang_id ? Number(user.bidang_id) : null;

    if (selectedBidangId === 'ALL') {
      return links.filter(item => Number(item.is_qa_all) === 1 || (Number(item.is_quick_access) === 1 && !item.is_qa_bidang));
    } else {
      // MY_BIDANG
      return links.filter(item => {
        const isQaBidang = Number(item.is_qa_bidang) === 1 || Number(item.is_quick_access) === 1;
        if (!isQaBidang) return false;

        // Check if item belongs to user's bidang or user is creator
        if (userBidangId && item.creator_bidang_id && Number(item.creator_bidang_id) === userBidangId) return true;
        if (currentUserId && item.created_by && Number(item.created_by) === currentUserId) return true;
        if (Number(item.is_qa_all) === 1) return true;
        return false;
      });
    }
  }, [links, selectedBidangId, user]);

  return (
    <div className="card-modern flex flex-col h-full group/card transition-all duration-500 hover:shadow-2xl hover:shadow-indigo-500/10 hover:-translate-y-1">
      {/* Header with Bidang Filter */}
      <div className="px-5 py-3 border-b border-slate-100 bg-white group-hover/card:bg-amber-50/20 transition-colors flex items-center justify-between gap-2 flex-wrap">
        <h2 className="text-[11px] font-black text-slate-800 tracking-widest uppercase flex items-center gap-1.5 leading-tight shrink-0">
          <Zap size={14} className="text-amber-500 fill-amber-400" />
          QUICK ACCESS
          {quickAccessLinks.length > 0 && (
            <span className="ml-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-extrabold border border-amber-200">
              {quickAccessLinks.length}
            </span>
          )}
        </h2>

        {/* Filter Buttons */}
        <div className="flex items-center gap-1 bg-slate-100/80 p-0.5 rounded-lg shrink-0">
          <button
            type="button"
            onClick={() => setSelectedBidangId('ALL')}
            className={`px-2 py-1 text-[10px] font-bold rounded-md transition-all flex items-center gap-1 ${
              selectedBidangId === 'ALL'
                ? 'bg-white text-indigo-600 shadow-sm font-extrabold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Globe size={11} />
            Semua Bidang
          </button>
          <button
            type="button"
            onClick={() => setSelectedBidangId('MY_BIDANG')}
            className={`px-2 py-1 text-[10px] font-bold rounded-md transition-all flex items-center gap-1 ${
              selectedBidangId === 'MY_BIDANG'
                ? 'bg-indigo-600 text-white shadow-sm font-extrabold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Filter size={11} />
            {userBidangSingkatan}
          </button>
        </div>
      </div>

      <div className="p-4 flex-1 flex flex-col justify-between">
        {loading ? (
          <div className="space-y-3 py-2">
            {[1, 2, 3, 4].map(n => (
              <div key={n} className="h-4 bg-slate-100 rounded animate-pulse" />
            ))}
          </div>
        ) : quickAccessLinks.length === 0 ? (
          <div className="py-8 text-center text-slate-400 space-y-1 my-auto">
            <Zap size={24} className="mx-auto text-amber-300 fill-amber-50" />
            <p className="text-xs font-bold text-slate-600">Quick Access Kosong</p>
            <p className="text-[10px] text-slate-400 max-w-[200px] mx-auto leading-relaxed">
              Belum ada link Quick Access untuk kategori {selectedBidangId === 'ALL' ? 'Semua Bidang' : userBidangSingkatan}.
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
