import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../services/api';
import { 
    Users, 
    Settings2, 
    Search, 
    Loader2, 
    Check, 
    ShieldCheck,
    LayoutDashboard,
    PlusCircle,
    Info
} from 'lucide-react';
import { BaseDataTable } from './common/BaseDataTable';
import { SearchableSelect } from './common/SearchableSelect';
import { useAuth } from '../contexts/AuthContext';

interface MacroIndicator {
    id: number;
    kode: string;
    nama_data: string;
    tematik_id: number | null;
    sumber_data: string | null;
    satuan_id: number | null;
    tematik_nama?: string;
    satuan_nama?: string;
}

interface Pegawai {
    id: number;
    nama_lengkap: string;
    nip: string;
    jabatan: string;
}

const SettingDataMakro = () => {
    const { user } = useAuth();
    const isSuperAdmin = user?.tipe_user_id === 1;
    const canEdit = [1, 2, 4, 6].includes(user?.tipe_user_id || 0);

    const [activeTab, setActiveTab] = useState<'assignment' | 'authority'>('assignment');
    const [loading, setLoading] = useState(true);
    const [indicators, setIndicators] = useState<MacroIndicator[]>([]);
    const [pegawaiList, setPegawaiList] = useState<Pegawai[]>([]);
    const [assignments, setAssignments] = useState<Record<number, number[]>>({});
    const [otoritasList, setOtoritasList] = useState<number[]>([]);
    
    const [savingId, setSavingId] = useState<number | null>(null);
    const [isSavingOtoritas, setIsSavingOtoritas] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchData = async () => {
        setLoading(true);
        try {
            const [indRes, pegRes, otoRes] = await Promise.all([
                api.dataMakro.getAll(),
                api.profilPegawai.getAll(),
                api.dataMakro.getOtoritas()
            ]);

            if (indRes.success) setIndicators(indRes.data);
            if (pegRes.success) setPegawaiList(pegRes.data);
            if (otoRes.success) setOtoritasList(otoRes.data.map((o: any) => o.profil_pegawai_id));

            // Fetch initial assignments for each indicator
            if (indRes.success) {
                const assigns: Record<number, number[]> = {};
                await Promise.all(indRes.data.map(async (ind: MacroIndicator) => {
                    const res = await api.dataMakro.getPegawai(ind.id);
                    if (res.success) {
                        assigns[ind.id] = res.data.map((p: any) => p.profil_pegawai_id);
                    }
                }));
                setAssignments(assigns);
            }
        } catch (err) {
            console.error('Failed to fetch setting data:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleSaveAssignment = async (indicatorId: number) => {
        const profilIds = assignments[indicatorId] || [];
        setSavingId(indicatorId);
        try {
            const res = await api.dataMakro.setPegawai(indicatorId, profilIds);
            if (!res.success) alert(res.message);
        } catch (err) {
            console.error('Save assignment failed:', err);
        } finally {
            setSavingId(null);
        }
    };

    const handleSaveOtoritas = async () => {
        setIsSavingOtoritas(true);
        try {
            const res = await api.dataMakro.setOtoritas(otoritasList);
            if (!res.success) alert(res.message);
        } catch (err) {
            console.error('Save otoritas failed:', err);
        } finally {
            setIsSavingOtoritas(false);
        }
    };

    const handleAssignmentChange = (indicatorId: number, val: number[]) => {
        setAssignments(prev => ({ ...prev, [indicatorId]: val }));
    };

    const filteredIndicators = useMemo(() => {
        return indicators.filter(ind => 
            ind.nama_data.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (ind.kode && ind.kode.toLowerCase().includes(searchTerm.toLowerCase())) ||
            ind.tematik_nama?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [indicators, searchTerm]);

    const assignmentColumns = [
        {
            header: 'Indikator Makro',
            key: 'nama_data',
            className: 'w-[40%]',
            render: (item: MacroIndicator) => (
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                        {item.kode && (
                            <span className="text-[10px] font-black text-white bg-slate-800 px-2 py-0.5 rounded-md">
                                {item.kode}
                            </span>
                        )}
                        <span className="text-sm font-black text-slate-800 uppercase tracking-tight leading-tight">
                            {item.nama_data}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        {item.tematik_nama && (
                            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100">
                                {item.tematik_nama}
                            </span>
                        )}
                        {item.satuan_nama && (
                            <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-100 italic">
                                {item.satuan_nama}
                            </span>
                        )}
                    </div>
                </div>
            )
        },
        {
            header: 'Pegawai Penanggung Jawab',
            key: 'pegawai',
            className: 'w-[50%]',
            render: (item: MacroIndicator) => {
                const currentSelection = assignments[item.id] || [];
                return (
                    <div className="flex items-center gap-3">
                        <div className="flex-1 min-w-[300px]">
                            <SearchableSelect
                                value={currentSelection}
                                onChange={(val: any) => handleAssignmentChange(item.id, val)}
                                options={pegawaiList}
                                label="Pilih Pegawai..."
                                keyField="id"
                                displayField="nama_lengkap"
                                multiple
                                disabled={!canEdit || savingId === item.id}
                            />
                        </div>
                        {canEdit && (
                            <button
                                onClick={() => handleSaveAssignment(item.id)}
                                disabled={savingId === item.id}
                                className={`p-2.5 rounded-xl transition-all shadow-sm ${
                                    savingId === item.id 
                                    ? 'bg-slate-100 text-slate-300' 
                                    : 'bg-emerald-500 text-white hover:bg-emerald-600 active:scale-95'
                                }`}
                            >
                                {savingId === item.id ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                            </button>
                        )}
                    </div>
                )
            }
        }
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white/90 backdrop-blur-md p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-5">
                    <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 shadow-inner">
                        <Settings2 size={28} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-slate-800 tracking-tight">Setting Data Makro</h1>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Konfigurasi Hak Akses & Penugasan</p>
                    </div>
                </div>

                <div className="flex bg-slate-100 p-1.5 rounded-2xl">
                    <button 
                        onClick={() => setActiveTab('assignment')}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-black transition-all ${
                            activeTab === 'assignment' 
                            ? 'bg-white text-indigo-600 shadow-sm' 
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        <LayoutDashboard size={18} />
                        Penugasan
                    </button>
                    <button 
                        onClick={() => setActiveTab('authority')}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-black transition-all ${
                            activeTab === 'authority' 
                            ? 'bg-white text-indigo-600 shadow-sm' 
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        <ShieldCheck size={18} />
                        Otoritas
                    </button>
                </div>
            </div>

            {activeTab === 'assignment' ? (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="bg-white/70 backdrop-blur-sm p-4 rounded-[2rem] border border-slate-100 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 pl-4">
                            <Info size={18} className="text-indigo-500" />
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-tight">
                                Tentukan pegawai yang bertanggung jawab mengisi nilai per indikator
                            </p>
                        </div>
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input 
                                type="text" 
                                placeholder="Cari indikator..." 
                                className="pl-11 pr-6 py-2.5 bg-white border border-slate-100 rounded-xl text-xs font-bold w-64 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="bg-white rounded-[3rem] border border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden">
                        <BaseDataTable
                            title="Penugasan Pegawai per Indikator"
                            data={filteredIndicators}
                            columns={assignmentColumns}
                            loading={loading}
                        />
                    </div>
                </div>
            ) : (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="bg-white rounded-[3rem] border border-slate-100 shadow-xl shadow-slate-200/40 p-10">
                        <div className="max-w-2xl mx-auto space-y-8">
                            <div className="text-center space-y-3">
                                <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto shadow-inner">
                                    <PlusCircle size={40} />
                                </div>
                                <h2 className="text-2xl font-black text-slate-800 tracking-tight">Otoritas Penambahan Data</h2>
                                <p className="text-sm text-slate-500 font-medium px-4">
                                    Pilih pegawai (Katim, Kabid, atau Admin Bidang) yang diberikan wewenang penuh untuk **menambah**, **mengubah definisi**, dan **menghapus** baris indikator makro.
                                </p>
                            </div>

                            <div className="p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100 space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Daftar Pegawai Berwenang</label>
                                    <SearchableSelect
                                        value={otoritasList}
                                        onChange={(val: any) => setOtoritasList(val)}
                                        options={pegawaiList}
                                        label="Ketik nama atau jabatan..."
                                        keyField="id"
                                        displayField="nama_lengkap"
                                        multiple
                                        disabled={!canEdit || isSavingOtoritas}
                                    />
                                </div>

                                <button
                                    onClick={handleSaveOtoritas}
                                    disabled={!canEdit || isSavingOtoritas}
                                    className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-2xl font-black text-sm transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-3 overflow-hidden group"
                                >
                                    {isSavingOtoritas ? (
                                        <Loader2 size={20} className="animate-spin" />
                                    ) : (
                                        <>
                                            <Check size={20} className="group-hover:scale-125 transition-transform" />
                                            Simpan Perubahan Otoritas
                                        </>
                                    )}
                                </button>
                            </div>

                            <div className="bg-amber-50/50 p-6 rounded-[2rem] border border-amber-100 flex items-start gap-4">
                                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-amber-500 shadow-sm shrink-0">
                                    <ShieldCheck size={20} />
                                </div>
                                <div>
                                    <h4 className="text-sm font-black text-amber-900 uppercase tracking-tight">Privilese Superadmin</h4>
                                    <p className="text-xs text-amber-700/70 font-medium leading-relaxed mt-1">
                                        Superadmin (Tipe User ID 1) secara otomatis memiliki hak akses penuh tanpa perlu didaftarkan dalam daftar di atas.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SettingDataMakro;
