import React, { useState, useEffect } from 'react';
import { KksLayout } from './KksLayout';
import { KksDashboardPage } from './KksDashboardPage';
import { KksWorkspacePage } from './KksWorkspacePage';
import { KksAdminSettings } from './KksAdminSettings';
import { KksLoginPage } from './KksLoginPage';
import { kksApi } from '../services/kksApi';
import { useAuth } from '../../../contexts/AuthContext';
import { Building2, CheckCircle2 } from 'lucide-react';
import { KksLeaderboardOpd } from '../types';

interface Props {
  onExitToSamp?: () => void;
  initialTab?: 'dashboard' | 'workspace' | 'leaderboard' | 'admin' | 'login';
}

export const KksApp: React.FC<Props> = ({ onExitToSamp, initialTab = 'dashboard' }) => {
  const { isAuthenticated, user } = useAuth();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'workspace' | 'leaderboard' | 'admin' | 'login'>(initialTab);
  const [selectedTahun, setSelectedTahun] = useState<number>(2026);
  const [availableYears, setAvailableYears] = useState<number[]>([2026]);
  const [selectedTatananForWorkspace, setSelectedTatananForWorkspace] = useState<number | null>(null);
  
  // Leaderboard data for full view
  const [leaderboardData, setLeaderboardData] = useState<KksLeaderboardOpd[]>([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);

  const fetchYears = async () => {
    try {
      const res = await kksApi.getPeriodeList();
      if (res.success && res.data && res.data.length > 0) {
        const years = res.data.map(p => p.tahun);
        setAvailableYears(years);
        if (!years.includes(selectedTahun)) {
          setSelectedTahun(years[0]);
        }
      }
    } catch (err) {
      console.error('Error load periode years:', err);
    }
  };

  useEffect(() => {
    fetchYears();
  }, []);

  const loadLeaderboard = async () => {
    setLoadingLeaderboard(true);
    try {
      const res = await kksApi.getLeaderboardOpd(selectedTahun);
      if (res.success && res.data) {
        setLeaderboardData(res.data);
      }
    } catch (err) {
      console.error('Error leaderboard:', err);
    } finally {
      setLoadingLeaderboard(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'leaderboard') {
      loadLeaderboard();
    }
  }, [activeTab, selectedTahun]);

  return (
    <KksLayout
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      selectedTahun={selectedTahun}
      setSelectedTahun={setSelectedTahun}
      availableYears={availableYears}
      onExitToSamp={onExitToSamp}
    >
      {activeTab === 'dashboard' && (
        <KksDashboardPage
          selectedTahun={selectedTahun}
          onOpenTatanan={(tatananId) => {
            setSelectedTatananForWorkspace(tatananId);
            setActiveTab('workspace');
          }}
          onGoToLeaderboard={() => setActiveTab('leaderboard')}
          onGoToLogin={() => setActiveTab('login')}
        />
      )}

      {activeTab === 'workspace' && (
        <KksWorkspacePage
          selectedTahun={selectedTahun}
          initialTatananId={selectedTatananForWorkspace}
        />
      )}

      {activeTab === 'leaderboard' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6 animate-in fade-in">
          <div>
            <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
              <Building2 className="w-6 h-6 text-blue-600" />
              <span>Peringkat & Kinerja Upload Dokumen Bukti Dukung 18 OPD</span>
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Data evaluasi kepatuhan kelengkapan bukti fisik penilaian mandiri KKS Tahun {selectedTahun}
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] font-black uppercase text-slate-400">
                  <th className="py-3 px-4">Rank</th>
                  <th className="py-3 px-4">Nama Perangkat Daerah (OPD)</th>
                  <th className="py-3 px-4 text-center">Jml Indikator</th>
                  <th className="py-3 px-4 text-center">Berkas Terunggah</th>
                  <th className="py-3 px-4">Persentase Upload</th>
                  <th className="py-3 px-4 text-center">Disetujui</th>
                  <th className="py-3 px-4 text-center">Perlu Revisi</th>
                  <th className="py-3 px-4 text-right">Rata-Rata Nilai</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loadingLeaderboard ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400 font-bold">
                      Memuat data...
                    </td>
                  </tr>
                ) : leaderboardData.map((opd) => {
                  const pct = opd.persentase_upload;
                  const badgeColor =
                    pct >= 80
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : pct >= 50
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-rose-50 text-rose-700 border-rose-200';

                  return (
                    <tr key={opd.instansi_id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3.5 px-4 font-black text-slate-400">
                        #{opd.rank}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 text-sm">{opd.singkatan_opd}</div>
                        <div className="text-[11px] text-slate-400 font-medium">{opd.nama_opd}</div>
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-slate-700">
                        {opd.total_indikator}
                      </td>
                      <td className="py-3.5 px-4 text-center font-black text-emerald-600">
                        {opd.total_bukti}
                      </td>
                      <td className="py-3.5 px-4 w-56">
                        <div className="flex items-center gap-2">
                          <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded border shrink-0 ${badgeColor}`}>
                            {pct}%
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{opd.total_disetujui}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-amber-600">
                        {opd.total_revisi}
                      </td>
                      <td className="py-3.5 px-4 text-right font-black text-slate-900 text-sm">
                        {opd.avg_skor}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'admin' && (
        <KksAdminSettings
          selectedTahun={selectedTahun}
          availableYears={availableYears}
          onRefreshYears={fetchYears}
        />
      )}

      {activeTab === 'login' && (
        <KksLoginPage
          onSuccess={() => setActiveTab('workspace')}
          onCancel={() => setActiveTab('dashboard')}
        />
      )}
    </KksLayout>
  );
};
export default KksApp;
