import React, { useState, useEffect, useMemo } from 'react';
import { ArrowRight, UserCheck, Star } from 'lucide-react';
import { api } from '@/src/services/api';
import { useAuth } from '@/src/contexts/AuthContext';

interface AplikasiItem {
  id: number;
  nama_aplikasi: string;
  url: string;
  keterangan?: string | null;
  is_qa_personal?: number | boolean;
  user_is_qa_personal?: number | boolean;
  created_by?: number;
  urutan?: number;
}

const QuickAccessPersonalDashboardCard = () => {
  const { user } = useAuth();
  const [links, setLinks] = useState<AplikasiItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchPersonalQuickAccess = async () => {
      try {
        setLoading(true);
        const res = await api.aplikasiExternal.getAll();
        if (res && res.success && Array.isArray(res.data)) {
          setLinks(res.data);
        }
      } catch (err) {
        console.error('Failed to fetch personal quick access:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPersonalQuickAccess();
  }, []);

  const personalLinks = useMemo(() => {
    return links.filter(item => Number(item.user_is_qa_personal !== undefined ? item.user_is_qa_personal : item.is_qa_personal) === 1);
  }, [links]);

  return (
    <div className="card-modern flex flex-col h-full group/card transition-all duration-500 hover:shadow-2xl hover:shadow-indigo-500/10 hover:-translate-y-1">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-50 bg-white group-hover/card:bg-purple-50/30 transition-colors flex items-center justify-between">
        <h2 className="text-[11px] font-black text-slate-800 tracking-widest uppercase flex items-center gap-1.5 leading-tight">
          <Star size={14} className="text-purple-600 fill-purple-400" />
          QUICK ACCESS PERSONAL
        </h2>
        {personalLinks.length > 0 && (
          <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 text-[10px] font-extrabold border border-purple-200">
            {personalLinks.length}
          </span>
        )}
      </div>

      <div className="p-4 flex-1 flex flex-col justify-between">
        {loading ? (
          <div className="space-y-3 py-2">
            {[1, 2, 3, 4].map(n => (
              <div key={n} className="h-4 bg-slate-100 rounded animate-pulse" />
            ))}
          </div>
        ) : personalLinks.length === 0 ? (
          <div className="py-8 text-center text-slate-400 space-y-1 my-auto">
            <UserCheck size={24} className="mx-auto text-purple-300 fill-purple-50" />
            <p className="text-xs font-bold text-slate-600">Quick Access Personal Kosong</p>
            <p className="text-[10px] text-slate-400 max-w-[200px] mx-auto leading-relaxed">
              Centang opsi "Personal" pada menu 3-titik QAF untuk menambahkan link favorit pribadi Anda ke sini.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {personalLinks.slice(0, 10).map((link) => (
              <li key={link.id} className="group/item">
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={link.keterangan || link.nama_aplikasi}
                  className="flex items-start gap-2 text-[11px] font-semibold text-slate-600 hover:text-purple-600 transition-all duration-300"
                >
                  <div className="mt-1 w-1.5 h-1.5 rounded-full bg-purple-400 group-hover/item:bg-purple-600 group-hover/item:scale-125 transition-all shrink-0" />
                  <span className="flex-1 group-hover/item:translate-x-1 transition-transform duration-300 line-clamp-2">
                    {link.nama_aplikasi}
                  </span>
                  <ArrowRight size={12} className="mt-0.5 opacity-0 -translate-x-2 group-hover/item:opacity-100 group-hover/item:translate-x-0 transition-all duration-300 text-purple-500 shrink-0" />
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default QuickAccessPersonalDashboardCard;
