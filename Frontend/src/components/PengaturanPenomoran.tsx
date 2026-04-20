import React, { useState, useEffect } from 'react';
import { Settings2, BarChart3, Calendar, Info, Save, Loader2, ChevronLeft, ChevronRight, Hash, Layers, FileText, User, Building2 } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

export default function PengaturanPenomoran() {
    const { user } = useAuth();
    const isSuperAdmin = user?.tipe_user_id == 1;

    // States for Settings
    const [settings, setSettings] = useState({ slot_size: 15, buffer_size: 5 });
    const [isSaving, setIsSaving] = useState(false);
    const [isLoadingSettings, setIsLoadingSettings] = useState(true);

    // States for Stats & Logs
    const [stats, setStats] = useState<any[]>([]);
    const [logs, setLogs] = useState<any[]>([]);
    const [isLoadingStats, setIsLoadingStats] = useState(true);
    const [isLoadingLogs, setIsLoadingLogs] = useState(true);
    
    const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1);
    const [filterYear, setFilterYear] = useState(new Date().getFullYear());
    const [filterInstansi, setFilterInstansi] = useState<string>('all');
    const [filterBidang, setFilterBidang] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    
    const [instansiList, setInstansiList] = useState<any[]>([]);
    const [bidangList, setBidangList] = useState<any[]>([]);

    const months = [
        "Januari", "Februari", "Maret", "April", "Mei", "Juni",
        "Juli", "Agustus", "September", "Oktober", "November", "Desember"
    ];

    // Initialize filter based on user role when user data is available
    useEffect(() => {
        if (user) {
            if (user.tipe_user_id !== 1) {
                setFilterInstansi(user.instansi_id?.toString() || 'all');
            } else {
                setFilterInstansi('all');
            }
        }
    }, [user]);

    useEffect(() => {
        fetchSettings();
        if (isSuperAdmin) {
            fetchInstansi();
        }
    }, [isSuperAdmin]);

    useEffect(() => {
        if (filterInstansi !== '') {
            fetchBidang();
        }
    }, [filterInstansi]);

    useEffect(() => {
        if (filterInstansi !== '') {
            fetchStats();
            fetchLogs();
        }
    }, [filterMonth, filterYear, filterBidang, filterInstansi]);

    // Separate effect for search to avoid excessive stats fetching
    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            if (filterInstansi !== '') {
                fetchLogs();
            }
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm]);

    const fetchSettings = async () => {
        try {
            setIsLoadingSettings(true);
            const res = await api.get('/surat-numbering/settings');
            if (res.success) setSettings(res.data);
        } catch (error) {
            console.error('Failed to fetch settings:', error);
        } finally {
            setIsLoadingSettings(false);
        }
    };

    const fetchInstansi = async () => {
        try {
            const res = await api.instansiDaerah.getAll();
            if (res.success) setInstansiList(res.data);
        } catch (error) {
            console.error('Failed to fetch instansi:', error);
        }
    };

    const fetchBidang = async () => {
        try {
            let res = await api.bidangInstansi.getAll();
            if (res.success) {
                const list = res.data;
                if (filterInstansi !== 'all') {
                    setBidangList(list.filter((b: any) => b.instansi_id?.toString() === filterInstansi));
                } else {
                    setBidangList(list);
                }
            }
        } catch (error) {
            console.error('Failed to fetch bidang:', error);
        }
    };

    const fetchStats = async () => {
        try {
            setIsLoadingStats(true);
            const params = new URLSearchParams({
                month: filterMonth.toString(),
                year: filterYear.toString(),
                bidang_id: filterBidang,
                instansi_id: filterInstansi
            });
            const res = await fetch(`/api/surat-numbering/stats?${params}`, {
                headers: { 'Authorization': `Bearer ${sessionStorage.getItem('token')}` }
            }).then(r => r.json());
            if (res.success) setStats(res.data);
        } catch (error) {
            console.error('Failed to fetch stats:', error);
        } finally {
            setIsLoadingStats(false);
        }
    };

    const fetchLogs = async () => {
        try {
            setIsLoadingLogs(true);
            const params = new URLSearchParams({
                month: filterMonth.toString(),
                year: filterYear.toString(),
                bidang_id: filterBidang,
                instansi_id: filterInstansi,
                search: searchTerm
            });
            const res = await fetch(`/api/surat-numbering/logs?${params}`, {
                headers: { 'Authorization': `Bearer ${sessionStorage.getItem('token')}` }
            }).then(r => r.json());
            if (res.success) setLogs(res.data);
        } catch (error) {
            console.error('Failed to fetch logs:', error);
        } finally {
            setIsLoadingLogs(false);
        }
    };

    const handleSaveSettings = async () => {
        try {
            setIsSaving(true);
            const res = await api.post('/surat-numbering/settings', settings);
            if (res.success) {
                alert('Pengaturan berhasil diperbarui!');
            }
        } catch (error) {
            console.error('Failed to save settings:', error);
            alert('Gagal menyimpan pengaturan.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-6 max-w-[1400px] mx-auto animate-in fade-in duration-500">
            {/* Header section */}
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 uppercase tracking-widest flex items-center gap-3">
                        <Settings2 className="text-indigo-600" size={28} />
                        Pengaturan Penomoran
                    </h1>
                    <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-tighter">
                        Manajemen Alokasi Slot Harian & Inventaris Nomor Surat
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 bg-white/80 backdrop-blur-sm p-2 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="relative group">
                        <FileText className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors" size={14} />
                        <input 
                            type="text" 
                            placeholder="Cari perihal, nomor, atau bidang..."
                            className="bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-[11px] font-bold outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-300 transition-all w-full sm:w-[250px]"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="flex items-center gap-1 border-l border-slate-200 pl-3">
                        {isSuperAdmin && (
                            <select 
                                className="bg-transparent text-[11px] font-black uppercase px-2 py-2 outline-none cursor-pointer border-r border-slate-100"
                                value={filterInstansi}
                                onChange={e => {
                                    setFilterInstansi(e.target.value);
                                    setFilterBidang('all');
                                }}
                            >
                                <option value="all">Kabupaten (All)</option>
                                {instansiList.map(i => (
                                    <option key={i.id} value={i.id}>{i.instansi_singkatan || i.instansi}</option>
                                ))}
                            </select>
                        )}
                        <select 
                            className="bg-transparent text-[11px] font-black uppercase px-2 py-2 outline-none cursor-pointer border-r border-slate-100"
                            value={filterMonth}
                            onChange={e => setFilterMonth(parseInt(e.target.value))}
                        >
                            {months.map((m, i) => (
                                <option key={m} value={i + 1}>{m}</option>
                            ))}
                        </select>
                        <select 
                            className="bg-transparent text-[11px] font-black uppercase px-2 py-2 outline-none cursor-pointer"
                            value={filterYear}
                            onChange={e => setFilterYear(parseInt(e.target.value))}
                        >
                            {[2024, 2025, 2026].map(y => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-12 gap-6">
                {/* Parameter Global Panel */}
                <div className="col-span-12 lg:col-span-4 space-y-6">
                    <div className="card-modern overflow-hidden group h-full">
                        <div className="p-6 border-b border-slate-50 bg-slate-50/50 flex items-center justify-between">
                            <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                                <Layers size={14} className="text-indigo-500" /> Parameter Global
                            </h3>
                            <Info size={14} className="text-slate-300" />
                        </div>
                        <div className="p-6 space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Kapasitas Slot (Default)</label>
                                <div className="relative">
                                    <input 
                                        type="number" 
                                        className="input-modern w-full font-black pr-12 text-sm"
                                        placeholder="15"
                                        value={settings.slot_size}
                                        onChange={e => setSettings({...settings, slot_size: parseInt(e.target.value) || 0})}
                                    />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300">NO</span>
                                </div>
                                <p className="text-[9px] text-slate-400 font-bold ml-1 italic leading-tight">
                                    Jumlah nomor yang "dipesan" secara otomatis setiap harinya.
                                </p>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Slot Cadangan (Buffer)</label>
                                <div className="relative">
                                    <input 
                                        type="number" 
                                        className="input-modern w-full font-black pr-12 text-sm"
                                        placeholder="5"
                                        value={settings.buffer_size}
                                        onChange={e => setSettings({...settings, buffer_size: parseInt(e.target.value) || 0})}
                                    />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300">BUF</span>
                                </div>
                                <p className="text-[9px] text-slate-400 font-bold ml-1 italic leading-tight">
                                    Jarak aman antar hari untuk mencegah bentrokan jika terjadi lonjakan.
                                </p>
                            </div>

                            <button 
                                onClick={handleSaveSettings}
                                disabled={isSaving || isLoadingSettings}
                                className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all shadow-xl shadow-indigo-200 flex items-center justify-center gap-3 active:scale-95"
                            >
                                {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />} Simpan Konfigurasi
                            </button>
                        </div>
                    </div>
                </div>

                {/* Statistics Panel */}
                <div className="col-span-12 lg:col-span-8 space-y-6">
                    <div className="card-modern overflow-hidden h-full">
                        <div className="p-6 border-b border-slate-50 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                                <BarChart3 size={14} className="text-indigo-500" /> Aktivitas Penggunaan Slot
                            </h3>
                            
                            <div className="min-w-[150px]">
                                <select 
                                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-[10px] font-black uppercase outline-none focus:ring-4 focus:ring-indigo-100 transition-all cursor-pointer"
                                    value={filterBidang}
                                    onChange={e => setFilterBidang(e.target.value)}
                                >
                                    <option value="all">Semua Bidang</option>
                                    {bidangList.map(b => (
                                        <option key={b.id} value={b.id}>{b.singkatan || b.nama_bidang}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="p-6">
                            {isLoadingStats ? (
                                <div className="p-8 text-center">
                                    <Loader2 className="animate-spin mx-auto text-indigo-500/20" size={32} />
                                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mt-4">Memuat Statistik...</p>
                                </div>
                            ) : stats.length === 0 ? (
                                <div className="p-8 text-center">
                                    <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <Calendar size={24} className="text-slate-200" />
                                    </div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Belum ada alokasi slot</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                    {stats.map((item, idx) => (
                                        <div key={idx} className="p-4 bg-slate-50/50 border border-slate-100 rounded-2xl group hover:bg-white hover:shadow-lg hover:shadow-slate-200/50 transition-all duration-500">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-[10px] font-black text-slate-800 px-2 py-0.5 bg-white border border-slate-100 rounded-md">
                                                    {item.tanggal.split('-')[2]}
                                                </span>
                                                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                                                    item.percentage >= 90 ? 'bg-rose-50 text-rose-600' :
                                                    item.percentage >= 50 ? 'bg-amber-50 text-amber-600' :
                                                    'bg-emerald-50 text-emerald-600'
                                                }`}>
                                                    {item.percentage}%
                                                </span>
                                            </div>
                                            
                                            <div className="space-y-2">
                                                <div className="flex justify-between items-end">
                                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Terpakai</span>
                                                    <span className="text-sm font-black text-slate-700 leading-none">{item.used} <span className="text-[10px] text-slate-300">/ {item.total}</span></span>
                                                </div>
                                                <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                                                    <div 
                                                        className={`h-full transition-all duration-1000 ease-out ${
                                                            item.percentage >= 90 ? 'bg-rose-500' :
                                                            item.percentage >= 50 ? 'bg-amber-500' :
                                                            'bg-indigo-500'
                                                        }`}
                                                        style={{ width: `${item.percentage}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Log Inventory Table */}
                <div className="col-span-12">
                    <div className="card-modern overflow-hidden">
                        <div className="p-6 border-b border-slate-50 bg-slate-50/50 flex items-center justify-between">
                            <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                                <FileText size={14} className="text-indigo-500" /> Inventaris Nomor Surat
                            </h3>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{logs.length} Data ditemukan</span>
                            </div>
                        </div>
                        
                        <div className="overflow-x-auto min-h-[300px]">
                            {isLoadingLogs ? (
                                <div className="p-24 text-center">
                                    <Loader2 className="animate-spin mx-auto text-indigo-500/20" size={48} />
                                    <p className="text-[11px] font-black text-slate-300 uppercase tracking-widest mt-4">Memetakan Inventaris...</p>
                                </div>
                            ) : logs.length === 0 ? (
                                <div className="p-24 text-center">
                                    <FileText className="mx-auto text-slate-100 mb-4" size={64} />
                                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Tidak ada record surat untuk filter ini</p>
                                </div>
                            ) : (
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50/50">
                                            <th className="p-4 pl-8 text-[10px] font-black text-slate-400 uppercase tracking-widest">Nomor Surat</th>
                                            <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tanggal</th>
                                            <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Perihal</th>
                                            <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                {filterInstansi === 'all' ? 'Instansi / Bidang' : 'Bidang'}
                                            </th>
                                            <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Pencetak</th>
                                            <th className="p-4 pr-8 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {logs.map((log) => (
                                            <tr key={log.id} className="hover:bg-slate-50/50 transition-colors group">
                                                <td className="p-4 pl-8">
                                                    <div className="text-xs font-black text-slate-700 tracking-tight">{log.nomor_surat_full}</div>
                                                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Urut: {log.nomor_urut}{log.nomor_suffix || ''}</div>
                                                </td>
                                                <td className="p-4">
                                                    <div className="text-[11px] font-bold text-slate-600 flex items-center gap-1.5">
                                                        <Calendar size={12} className="text-slate-300" />
                                                        {new Date(log.tanggal_surat).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <div className="text-[11px] font-bold text-slate-700 max-w-[250px] truncate" title={log.perihal}>
                                                        {log.perihal}
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    {filterInstansi === 'all' && (
                                                        <div className="text-[10px] font-black text-slate-400 uppercase truncate max-w-[150px] mb-0.5 flex items-center gap-1">
                                                            <Building2 size={10} /> {log.nama_instansi}
                                                        </div>
                                                    )}
                                                    <div className="text-[10px] font-bold text-indigo-600 uppercase tracking-tight"> {log.bidang_singkatan || log.nama_bidang || '-'}</div>
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                                                            <User size={12} />
                                                        </div>
                                                        <span className="text-[11px] font-bold text-slate-600 capitalize">{log.creator_name || 'System'}</span>
                                                    </div>
                                                </td>
                                                <td className="p-4 pr-8 text-center">
                                                    <span className={`inline-flex px-2 py-1 rounded-lg text-[9px] font-black uppercase ${
                                                        log.status === 'Digunakan' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'
                                                    }`}>
                                                        {log.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
