import React, { useEffect, useState } from 'react';
import { 
  Award, CheckCircle2, AlertCircle, ArrowUpRight, 
  Layers, Upload, FileText, Check, Clock, TrendingUp,
  Building2, ChevronRight, Sparkles, Filter, ShieldCheck,
  HeartPulse, Home, GraduationCap, Store, Palmtree, Bus,
  Briefcase, AlertTriangle, Shield
} from 'lucide-react';
import { kksApi } from '../services/kksApi';
import { KksPeriode, KksStats, KksTatanan, KksLeaderboardOpd } from '../types';
import { useAuth } from '../../../contexts/AuthContext';

interface Props {
  selectedTahun: number;
  onOpenTatanan: (tatananId: number) => void;
  onGoToLeaderboard: () => void;
  onGoToLogin: () => void;
}

const TATANAN_ICONS: Record<number, React.ReactNode> = {
  0: <Building2 className="w-5 h-5" />,
  1: <HeartPulse className="w-5 h-5" />,
  2: <Home className="w-5 h-5" />,
  3: <GraduationCap className="w-5 h-5" />,
  4: <Store className="w-5 h-5" />,
  5: <Palmtree className="w-5 h-5" />,
  6: <Bus className="w-5 h-5" />,
  7: <Briefcase className="w-5 h-5" />,
  8: <ShieldCheck className="w-5 h-5" />,
  9: <AlertTriangle className="w-5 h-5" />,
};

export const KksDashboardPage: React.FC<Props> = ({
  selectedTahun,
  onOpenTatanan,
  onGoToLeaderboard,
  onGoToLogin
}) => {
  const { user, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(true);
  const [periode, setPeriode] = useState<KksPeriode | null>(null);
  const [stats, setStats] = useState<KksStats | null>(null);
  const [tatananList, setTatananList] = useState<KksTatanan[]>([]);
  const [leaderboard, setLeaderboard] = useState<KksLeaderboardOpd[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [sumRes, leadRes] = await Promise.all([
          kksApi.getSummary(selectedTahun),
          kksApi.getLeaderboardOpd(selectedTahun)
        ]);

        if (sumRes.success && sumRes.data) {
          setPeriode(sumRes.data.periode);
          setStats(sumRes.data.stats);
          setTatananList(sumRes.data.tatananSummary || []);
        }

        if (leadRes.success && leadRes.data) {
          setLeaderboard(leadRes.data);
        }
      } catch (err) {
        console.error('Error fetching KKS dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedTahun]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-bold text-slate-500">Memuat data instrumen KKS...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* 1. HERO BANNER: STATUS PREDIKAT SWASTI SABA */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-800 via-teal-800 to-slate-900 text-white p-6 sm:p-8 shadow-xl shadow-emerald-950/20">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Periode Penilaian Mandiri Tahun {selectedTahun}</span>
            </div>

            <div>
              <p className="text-xs uppercase font-extrabold tracking-wider text-emerald-200/80">
                Peringkat Capaian Kabupaten Saat Ini
              </p>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white flex items-center gap-3">
                <Award className="w-9 h-9 text-amber-400 shrink-0" />
                <span>{stats?.predikat || 'Potensi Swasti Saba Wistara'}</span>
              </h1>
            </div>

            <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed">
              Berdasarkan akumulasi pengisian mandiri 18 Perangkat Daerah dan verifikasi berkas bukti dukung 9 Tatanan serta Kelembagaan.
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              {isAuthenticated ? (
                <button
                  onClick={() => {
                    const kelembagaan = tatananList.find(t => t.nomor_tatanan === 0);
                    onOpenTatanan(kelembagaan ? (kelembagaan.id || (kelembagaan as any).tatanan_id) : 1);
                  }}
                  className="px-5 py-2.5 rounded-xl bg-white text-emerald-900 hover:bg-emerald-50 text-xs font-black shadow-lg shadow-black/10 transition-all flex items-center gap-2"
                >
                  <Upload className="w-4 h-4 text-emerald-700" />
                  <span>Isi Bukti Dukung OPD Saya</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={onGoToLogin}
                  className="px-5 py-2.5 rounded-xl bg-emerald-500 text-white hover:bg-emerald-400 text-xs font-black shadow-lg shadow-emerald-500/30 transition-all flex items-center gap-2"
                >
                  <Award className="w-4 h-4" />
                  <span>Masuk untuk Melakukan Pengisian OPD</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}

              <button
                onClick={onGoToLeaderboard}
                className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/20 transition-all"
              >
                Lihat Ranking Upload OPD
              </button>
            </div>
          </div>

          {/* METRIC BOXES */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 gap-3 lg:w-80 shrink-0">
            <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10">
              <span className="text-[10px] font-bold text-emerald-200 uppercase tracking-wider block">Skor Rata-Rata</span>
              <span className="text-2xl font-black text-white">{stats?.rataRataSkor || 0}</span>
              <span className="text-[10px] text-emerald-300 block mt-0.5">Target: ≥ 90</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10">
              <span className="text-[10px] font-bold text-emerald-200 uppercase tracking-wider block">Keterisian Bukti</span>
              <span className="text-2xl font-black text-white">{stats?.persentaseKeterisian || 0}%</span>
              <span className="text-[10px] text-emerald-300 block mt-0.5">{stats?.totalDiisi} / {stats?.totalIndikator} Butir</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 col-span-2 sm:col-span-1 lg:col-span-2">
              <span className="text-[10px] font-bold text-emerald-200 uppercase tracking-wider block">Status Verifikasi</span>
              <div className="flex items-center justify-between mt-1">
                <span className="text-lg font-black text-white">{stats?.totalVerifikasi || 0} Terverifikasi</span>
                <span className="px-2 py-0.5 rounded-md bg-emerald-500/30 text-emerald-200 text-[10px] font-bold">
                  {stats?.persentaseVerifikasi || 0}%
                </span>
              </div>
              <div className="w-full bg-white/20 h-1.5 rounded-full mt-2 overflow-hidden">
                <div 
                  className="bg-emerald-400 h-full rounded-full transition-all duration-700" 
                  style={{ width: `${stats?.persentaseVerifikasi || 0}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. TINGKAT KETERISIAN INDIKATOR PER TATANAN */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
              <Layers className="w-5 h-5 text-emerald-600" />
              <span>Tingkat Keterisian per Tatanan Penilaian</span>
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              {tatananList.length} Komponen Evaluasi ({tatananList.some(t => t.nomor_tatanan === 0) ? `Kelembagaan & ${tatananList.filter(t => t.nomor_tatanan > 0).length} Tatanan` : `${tatananList.length} Tatanan`})
            </p>
          </div>
          <span className="text-xs font-bold text-slate-500 self-start sm:self-auto">
            Klik kartu untuk mengisi atau melihat indikator
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {tatananList.map((tatanan) => {
            const pct = tatanan.persentase || 0;
            const isCompleted = pct === 100;
            const targetId = tatanan.id ?? (tatanan as any).tatanan_id;

            return (
              <div
                key={targetId || tatanan.nomor_tatanan}
                onClick={() => onOpenTatanan(targetId)}
                className="group relative bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm hover:shadow-md hover:border-emerald-300 transition-all cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center group-hover:scale-110 group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-sm">
                      {TATANAN_ICONS[tatanan.nomor_tatanan] || <Layers className="w-5 h-5" />}
                    </div>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                      {tatanan.nomor_tatanan === 0 ? 'Kelembagaan' : `Tatanan ${tatanan.nomor_tatanan}`}
                    </span>
                  </div>

                  <h3 className="text-xs font-bold text-slate-800 leading-snug line-clamp-2 min-h-[32px] group-hover:text-emerald-700 transition-colors">
                    {tatanan.nama_tatanan}
                  </h3>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600">
                    <span>Keterisian</span>
                    <span className="font-bold text-slate-900">{tatanan.total_diisi || 0} / {tatanan.total_indikator || 0}</span>
                  </div>

                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-slate-300'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[10px] pt-1">
                    <span className="text-slate-400 font-medium">Skor: {tatanan.avg_skor || 0}</span>
                    <span className="font-bold text-emerald-600 flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                      Buka <ChevronRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. LEADERBOARD KINERJA UPLOAD OPD */}
      <section className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-600" />
              <span>Kinerja Upload Bukti Dukung Perangkat Daerah (OPD)</span>
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Pemantauan kepatuhan dan keaktifan 18 dinas pengampu indikator KKS 2026
            </p>
          </div>

          <button
            onClick={onGoToLeaderboard}
            className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 self-start sm:self-auto"
          >
            <span>Tabel Lengkap</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] font-black uppercase text-slate-400">
                <th className="py-2.5 px-3">Peringkat</th>
                <th className="py-2.5 px-3">Perangkat Daerah (OPD)</th>
                <th className="py-2.5 px-3 text-center">Jml Indikator</th>
                <th className="py-2.5 px-3 text-center">Berkas Terunggah</th>
                <th className="py-2.5 px-3">Progres Upload Bukti</th>
                <th className="py-2.5 px-3 text-center">Disetujui</th>
                <th className="py-2.5 px-3 text-right">Rata-Rata Skor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {leaderboard.slice(0, 8).map((opd) => {
                const pct = opd.persentase_upload;
                const badgeColor =
                  pct >= 80
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : pct >= 50
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-rose-50 text-rose-700 border-rose-200';

                return (
                  <tr key={opd.instansi_id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 font-bold text-slate-400">
                      #{opd.rank}
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-800">{opd.singkatan_opd}</div>
                      <div className="text-[10px] text-slate-400 font-medium truncate max-w-xs">{opd.nama_opd}</div>
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-slate-700">
                      {opd.total_indikator}
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-emerald-600">
                      {opd.total_bukti}
                    </td>
                    <td className="py-3 px-3 w-48">
                      <div className="flex items-center gap-2">
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className={`text-[10px] font-black px-1.5 py-0.5 rounded border shrink-0 ${badgeColor}`}>
                          {pct}%
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                        <CheckCircle2 className="w-3 h-3" />
                        {opd.total_disetujui}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-black text-slate-900">
                      {opd.avg_skor}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

    </div>
  );
};
