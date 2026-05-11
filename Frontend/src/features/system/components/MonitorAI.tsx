import React, { useState, useEffect } from 'react';
import { api } from '@/src/services/api';
import { 
    Activity, Users, FileText, Database, Star, RefreshCw, Cpu, ShieldAlert, Settings
} from 'lucide-react';

interface AiStat {
    Username: string | null;
    Total_Chat: number;
    Total_Analisis_Dokumen: number;
    Estimasi_Panjang_Karakter: number;
}

interface AiHistory {
    id: number;
    Waktu: string;
    User: string | null;
    Brain: string | null;
    Pesan: string;
}

const MonitorAI = () => {
    const [aiStats, setAiStats] = useState<AiStat[]>([]);
    const [aiHistory, setAiHistory] = useState<AiHistory[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        fetchAiData();
    }, []);

    const fetchAiData = async () => {
        try {
            setIsLoading(true);
            const [resStats, resHistory] = await Promise.all([
                api.pengaturan.getAiUsageStats(),
                api.pengaturan.getAiUsageHistory()
            ]);
            
            if (resStats.success) setAiStats(resStats.data);
            if (resHistory.success) setAiHistory(resHistory.data);
        } catch (error) {
            console.error('Failed to fetch AI usage data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="card-modern p-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div>
                    <h2 className="text-xl font-black text-ppm-slate uppercase tracking-tight flex items-center gap-2">
                        <Activity size={22} className="text-ppm-primary" />
                        Monitor Penggunaan AI
                    </h2>
                    <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest font-bold">
                        Pelacakan Token, Klasemen Pengguna, & Log Riwayat Real-Time
                    </p>
                </div>
                <button 
                    onClick={fetchAiData} 
                    disabled={isLoading}
                    className="btn-modern-primary flex items-center gap-2 py-2 px-4 text-xs font-black uppercase"
                >
                    <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
                    Refresh Data
                </button>
            </div>

            {/* Header Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-white p-6 rounded-2xl border-2 border-slate-100 flex items-center gap-4">
                    <div className="p-4 bg-blue-50 text-blue-500 rounded-2xl">
                        <Users size={24} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Pengguna Aktif</p>
                        <p className="text-2xl font-black text-slate-700">{aiStats.length}</p>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl border-2 border-slate-100 flex items-center gap-4">
                    <div className="p-4 bg-purple-50 text-purple-500 rounded-2xl">
                        <Activity size={24} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Request AI</p>
                        <p className="text-2xl font-black text-slate-700">
                            {aiStats.reduce((sum, item) => sum + item.Total_Chat, 0).toLocaleString('id-ID')}
                        </p>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl border-2 border-slate-100 flex items-center gap-4 shadow-sm border-rose-100/50">
                    <div className="p-4 bg-rose-50 text-rose-500 rounded-2xl relative overflow-hidden">
                        <FileText size={24} className="relative z-10" />
                        <div className="absolute inset-0 bg-rose-500 opacity-10 animate-pulse"></div>
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                            Total Analisis File <ShieldAlert size={10} className="text-rose-500" />
                        </p>
                        <p className="text-2xl font-black text-slate-700">
                            {aiStats.reduce((sum, item) => sum + Number(item.Total_Analisis_Dokumen), 0)}
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-12 gap-6">
                {/* Top Spenders Table */}
                <div className="col-span-12 lg:col-span-5 bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm flex flex-col">
                    <div className="p-5 bg-slate-50 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                            <Star size={18} className="text-amber-500" />
                            <h3 className="text-xs font-black text-slate-600 uppercase tracking-widest">Klasemen Pengguna</h3>
                        </div>
                    </div>
                    <div className="overflow-y-auto h-[450px]">
                        <table className="w-full text-left border-collapse">
                            <thead className="sticky top-0 bg-white/95 backdrop-blur-sm z-10 shadow-sm border-b border-slate-100">
                                <tr>
                                    <th className="px-5 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">User</th>
                                    <th className="px-5 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Chat</th>
                                    <th className="px-5 py-4 text-[10px] font-black text-rose-400 uppercase tracking-widest text-center" title="Beban Token Terbesar">Docs</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {isLoading && aiStats.length === 0 ? (
                                    <tr>
                                        <td colSpan={3} className="px-5 py-12 text-center text-slate-400 text-xs font-bold italic uppercase animate-pulse">Memuat...</td>
                                    </tr>
                                ) : aiStats.map((stat, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-5 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${idx === 0 ? 'bg-amber-100 text-amber-600' : idx === 1 ? 'bg-slate-200 text-slate-600' : idx === 2 ? 'bg-orange-100 text-orange-600' : 'bg-slate-50 text-slate-400'}`}>
                                                    {idx + 1}
                                                </div>
                                                <span className="font-bold text-xs text-slate-700 truncate max-w-[120px]">
                                                    {stat.Username || 'Unknown'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-5 py-3 text-center text-xs font-bold text-slate-500">{stat.Total_Chat}</td>
                                        <td className="px-5 py-3 text-center">
                                            <span className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-black ${Number(stat.Total_Analisis_Dokumen) > 0 ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-400'}`}>
                                                {stat.Total_Analisis_Dokumen}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Live History Feed */}
                <div className="col-span-12 lg:col-span-7 bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm flex flex-col">
                    <div className="p-5 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
                        <Database size={18} className="text-ppm-primary" />
                        <h3 className="text-xs font-black text-slate-600 uppercase tracking-widest">Riwayat Live Terakhir (100 Chat)</h3>
                    </div>
                    <div className="overflow-y-auto h-[450px]">
                        {isLoading && aiHistory.length === 0 ? (
                            <div className="p-12 text-center text-slate-400 text-xs font-bold italic uppercase animate-pulse">Memuat Riwayat...</div>
                        ) : (
                            <ul className="divide-y divide-slate-100">
                                {aiHistory.map((item) => (
                                    <li key={item.id} className="p-5 hover:bg-slate-50/50 transition-colors">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex items-center gap-2">
                                                <span className="font-black text-xs text-slate-700">{item.User || 'Unknown'}</span>
                                                <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                                                    {new Date(item.Waktu).toLocaleString('id-ID', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}
                                                </span>
                                            </div>
                                            <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md flex items-center gap-1 ${item.Brain?.includes('DeepSeek') ? 'bg-indigo-100 text-indigo-600 border border-indigo-200/50' : 'bg-blue-100 text-blue-600 border border-blue-200/50'}`}>
                                                <Cpu size={10} />
                                                {item.Brain || 'Nayaxa Engine'}
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-600 leading-relaxed font-mono whitespace-pre-wrap bg-slate-50 p-3 rounded-lg border border-slate-100/50">
                                            {item.Pesan.length > 250 ? item.Pesan.substring(0, 250) + '...' : item.Pesan}
                                        </p>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MonitorAI;
