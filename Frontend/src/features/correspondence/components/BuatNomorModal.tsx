import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
    X, Hash, Calendar, User, Search, 
    Hash as HashIcon, FileText, Send, 
    History, ChevronRight, Loader2, 
    Edit, Save, RotateCcw, Check,
    AlertCircle, Briefcase, Info, List
} from 'lucide-react';
import { api } from '@/src/services/api';
import { useAuth } from '@/src/contexts/AuthContext';
import KlasifikasiSearchModal from './KlasifikasiSearchModal';

interface BuatNomorModalProps {
    isOpen: boolean;
    onClose: () => void;
    mode?: 'full' | 'select';
    onSelectNumber?: (data: {
        nomor_surat: string;
        tanggal_surat: string;
        perihal: string;
        tujuan: string;
    }) => void;
}

export default function BuatNomorModal({ isOpen, onClose, mode = 'full', onSelectNumber }: BuatNomorModalProps) {
    const { user } = useAuth();
    
    // UI States
    const [isKlasifikasiOpen, setIsKlasifikasiOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    
    // Form States
    const [formData, setFormData] = useState({
        tanggal_surat: new Date().toISOString().split('T')[0],
        nomor_urut: '',
        kode_klasifikasi: '',
        bidang_id: user?.bidang_id || 0,
        bidang_singkatan: user?.bidang_singkatan || 'BAP',
        perihal: '',
        tujuan: '',
        jenis_surat: 'Manual' as 'Manual' | 'TTE',
    });

    // History States
    const [logMonth, setLogMonth] = useState(new Date().getMonth() + 1);
    const [logYear, setLogYear] = useState(new Date().getFullYear());
    const [logs, setLogs] = useState<any[]>([]);
    const [isLoadingLogs, setIsLoadingLogs] = useState(false);
    const [editingLogId, setEditingLogId] = useState<number | null>(null);
    const [editData, setEditData] = useState<any>(null);
    const [historySearch, setHistorySearch] = useState('');

    // Tooltip States
    const [hoveredInfo, setHoveredInfo] = useState<{ x: number, y: number, perihal: string, tujuan: string, log: any } | null>(null);
    const infoRef = useRef<HTMLDivElement>(null);
    const [infoStyle, setInfoStyle] = useState<React.CSSProperties>({ visibility: 'hidden' });
    const hoverTimeoutRef = useRef<any>(null);

    useLayoutEffect(() => {
        if (hoveredInfo && infoRef.current) {
            const rect = infoRef.current.getBoundingClientRect();
            let left = hoveredInfo.x;
            let top = hoveredInfo.y - 15;
            let tx = '-50%';
            let ty = '-100%';

            // Horizontal check
            if (left - rect.width/2 < 20) {
                left = 20;
                tx = '0%';
            } else if (left + rect.width/2 > window.innerWidth - 20) {
                left = window.innerWidth - rect.width - 20;
                tx = '0%';
            }

            // Vertical check (if it hits top, show bottom)
            if (top - rect.height < 20) {
                top = hoveredInfo.y + 15;
                ty = '0%';
            }

            setInfoStyle({
                left: `${left}px`,
                top: `${top}px`,
                transform: `translateX(${tx}) translateY(${ty})`,
                visibility: 'visible'
            });
        } else {
            setInfoStyle({ visibility: 'hidden' });
        }
    }, [hoveredInfo]);

    const handleTooltipMouseEnter = (e: React.MouseEvent, log: any) => {
        if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
        
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        setHoveredInfo({
            x: rect.left + rect.width / 2,
            y: rect.top,
            perihal: log.perihal,
            tujuan: log.tujuan,
            log: log
        });
    };

    const handleTooltipMouseLeave = () => {
        hoverTimeoutRef.current = setTimeout(() => {
            setHoveredInfo(null);
        }, 300);
    };

    useEffect(() => {
        if (isOpen) {
            fetchLogs();
            if (formData.bidang_id) fetchNextNumber(formData.bidang_id);
        }
    }, [isOpen, logMonth, logYear]);

    // Filtering logic for the history table
    const filteredLogs = logs.filter(log => {
        if (!historySearch) return true;
        const searchLower = historySearch.toLowerCase();
        return (
            log.nomor_surat_full?.toLowerCase().includes(searchLower) ||
            log.perihal?.toLowerCase().includes(searchLower) ||
            log.tujuan?.toLowerCase().includes(searchLower)
        );
    });

    const fetchNextNumber = async (bidId: number) => {
        setIsLoading(true);
        try {
            const res = await api.surat.getNextNumber(bidId);
            if (res.success) {
                setFormData(prev => ({ ...prev, nomor_urut: res.data.nextNumber.toString().padStart(3, '0') }));
            }
        } catch (err) {
            console.error('Failed to get next number:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchLogs = async () => {
        setIsLoadingLogs(true);
        try {
            const res = await api.surat.getNumberLogs(logMonth, logYear);
            if (res.success) {
                setLogs(res.data);
            }
        } catch (err) {
            console.error('Failed to fetch logs:', err);
        } finally {
            setIsLoadingLogs(false);
        }
    };

    const handleTakeNumber = async () => {
        if (!formData.kode_klasifikasi || !formData.perihal) {
            alert('Harap isi Kode Klasifikasi dan Perihal');
            return;
        }

        setIsSaving(true);
        const nomor_surat_full = `${formData.kode_klasifikasi}/${formData.nomor_urut}-${formData.bidang_singkatan}`;
        
        try {
            const res = await api.surat.takeNumber({
                ...formData,
                nomor_surat_full,
                bidang_singkatan: formData.bidang_singkatan
            });
            if (res.success) {
                fetchLogs();
                if (onSelectNumber) {
                    onSelectNumber({
                        nomor_surat: res.data.nomor_surat_full,
                        tanggal_surat: formData.tanggal_surat,
                        perihal: formData.perihal,
                        tujuan: formData.tujuan
                    });
                    onClose();
                } else {
                    setFormData(prev => ({ ...prev, perihal: '', tujuan: '' }));
                    fetchNextNumber(formData.bidang_id);
                }
            }
        } catch (err) {
            console.error('Failed to take number:', err);
        } finally {
            setIsSaving(false);
        }
    };

    const handleEditLog = (log: any) => {
        setEditingLogId(log.id);
        setEditData({ ...log });
    };

    const handleUpdateLog = async () => {
        if (!editData) return;
        try {
            const res = await api.surat.updateNumberLog(editingLogId!, editData);
            if (res.success) {
                setEditingLogId(null);
                fetchLogs();
            }
        } catch (err) {
            console.error('Update failed:', err);
        }
    };

    if (!isOpen) return null;

    const months = [
        "Januari", "Februari", "Maret", "April", "Mei", "Juni",
        "Juli", "Agustus", "September", "Oktober", "November", "Desember"
    ];

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose} />
            
            <div className="bg-white w-full max-w-[95vw] h-[90vh] rounded-[40px] shadow-2xl overflow-hidden flex flex-col relative animate-in zoom-in-95 duration-300 border border-white/20">
                {/* Header */}
                <div className="p-8 pb-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                            <HashIcon size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-slate-800 uppercase tracking-widest leading-none">
                                {mode === 'select' ? 'Pilih Nomor dari Log' : 'Sistem Penomoran Otomatis'}
                            </h2>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5 flex items-center gap-2">
                                <Briefcase size={12} className="text-indigo-400" /> {user?.instansi_nama} — {user?.bidang_nama}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-3 hover:bg-slate-100 rounded-2xl text-slate-400 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 flex overflow-hidden p-6 gap-6">
                    {/* Left Side: Create Form */}
                    {mode === 'full' && (
                        <div className="w-[280px] flex flex-col gap-6 bg-slate-50/50 p-6 rounded-[32px] border border-slate-100 overflow-y-auto custom-scrollbar">
                        <div className="space-y-4">
                            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest px-2">Buat Entri Nomor</h3>
                            
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Tanggal Surat</label>
                                <input 
                                    type="date"
                                    className="w-full h-12 px-5 bg-white border border-slate-200 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-indigo-100 transition-all outline-none"
                                    value={formData.tanggal_surat}
                                    onChange={e => setFormData({...formData, tanggal_surat: e.target.value})}
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Kode Klasifikasi</label>
                                <div className="relative group">
                                    <button 
                                        onClick={() => setIsKlasifikasiOpen(true)}
                                        className="w-full h-12 px-5 bg-white border border-slate-200 rounded-2xl flex items-center justify-between group-hover:border-indigo-400 transition-all shadow-sm"
                                    >
                                        <span className={`text-sm font-bold ${formData.kode_klasifikasi ? 'text-indigo-600' : 'text-slate-400 italic'}`}>
                                            {formData.kode_klasifikasi || "Klik untuk cari kode..."}
                                        </span>
                                        <Search size={16} className="text-slate-300 group-hover:text-indigo-500" />
                                    </button>
                                    
                                    {formData.kode_klasifikasi && (
                                        <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setFormData({...formData, kode_klasifikasi: ''});
                                            }}
                                            className="absolute right-12 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-red-500 transition-colors"
                                        >
                                            <X size={14} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">No. Urut</label>
                                    <input 
                                        type="text"
                                        className="w-full h-12 px-5 bg-slate-100 border border-slate-200 rounded-2xl text-sm font-black font-mono text-center tracking-widest focus:ring-4 focus:ring-indigo-100 outline-none"
                                        value={formData.nomor_urut}
                                        onChange={e => setFormData({...formData, nomor_urut: e.target.value})}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Bidang</label>
                                    <div className="w-full h-12 px-5 bg-slate-100 border border-slate-200 rounded-2xl flex items-center justify-center text-xs font-black text-slate-500 uppercase tracking-wider">
                                        {formData.bidang_singkatan}
                                    </div>
                                </div>
                            </div>

                            <div className="p-4 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-100 border border-indigo-500">
                                <label className="text-[9px] font-black text-indigo-200 uppercase tracking-widest flex items-center gap-1.5 mb-1">
                                    <Info size={10} /> Preview Nomor Surat
                                </label>
                                <div className="text-sm font-black text-white font-mono tracking-wider truncate">
                                    {formData.kode_klasifikasi ? `${formData.kode_klasifikasi}/${formData.nomor_urut}-${formData.bidang_singkatan}` : '-- PILIH KLASIFIKASI --'}
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Perihal</label>
                                <textarea 
                                    className="w-full h-24 p-4 bg-white border border-slate-200 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-indigo-100 transition-all outline-none resize-none"
                                    placeholder="Contoh: Undangan Koordinasi..."
                                    value={formData.perihal}
                                    onChange={e => setFormData({...formData, perihal: e.target.value})}
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Kepada / Tujuan</label>
                                <input 
                                    className="w-full h-12 px-5 bg-white border border-slate-200 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-indigo-100 transition-all outline-none"
                                    placeholder="Instansi / Nama Tujuan"
                                    value={formData.tujuan}
                                    onChange={e => setFormData({...formData, tujuan: e.target.value})}
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Jenis Surat</label>
                                <div className="flex gap-2">
                                    {['Manual', 'TTE'].map(t => (
                                        <button 
                                            key={t}
                                            onClick={() => setFormData({...formData, jenis_surat: t as any})}
                                            className={`flex-1 h-10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                                formData.jenis_surat === t 
                                                ? 'bg-slate-800 text-white shadow-lg shadow-slate-200' 
                                                : 'bg-white text-slate-400 border border-slate-200 hover:bg-slate-50'
                                            }`}
                                        >
                                            {t}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <button 
                                onClick={handleTakeNumber}
                                disabled={isSaving || !formData.kode_klasifikasi || !formData.perihal}
                                className="w-full h-14 mt-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-2xl font-black text-sm uppercase tracking-widest transition-all shadow-xl shadow-indigo-200 flex items-center justify-center gap-3 active:scale-95"
                            >
                                {isSaving ? <Loader2 className="animate-spin" /> : <Send size={18} />} Ambil Nomor
                            </button>
                        </div>
                    </div>
                    )}

                    {/* Right Side: Logs Table */}
                    <div className="flex-1 flex flex-col bg-white rounded-[32px] border border-slate-100 overflow-hidden shadow-sm">
                        <div className="p-6 border-b border-slate-50 flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3 shrink-0">
                                <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400">
                                    <History size={20} />
                                </div>
                                <div className="hidden sm:block">
                                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest leading-none">Log Penomoran</h3>
                                    <p className="text-[9px] font-bold text-slate-400 tracking-tighter mt-1 uppercase">Riwayat bulan terpilih</p>
                                </div>
                            </div>

                            <div className="flex-1 max-w-md relative">
                                <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input 
                                    type="text"
                                    placeholder="Cari Nomor, Perihal, atau Tujuan..."
                                    className="w-full h-10 pl-11 pr-4 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold outline-none focus:ring-4 focus:ring-indigo-100 transition-all"
                                    value={historySearch}
                                    onChange={e => setHistorySearch(e.target.value)}
                                />
                            </div>

                            <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-2xl border border-slate-100 shrink-0">
                                <select 
                                    className="bg-transparent text-[11px] font-black uppercase px-3 py-2 outline-none cursor-pointer"
                                    value={logMonth}
                                    onChange={e => setLogMonth(parseInt(e.target.value))}
                                >
                                    {months.map((m, i) => (
                                        <option key={m} value={i+1}>{m}</option>
                                    ))}
                                </select>
                                <select 
                                    className="bg-transparent text-[11px] font-black uppercase px-3 py-2 outline-none cursor-pointer border-l border-slate-200"
                                    value={logYear}
                                    onChange={e => setLogYear(parseInt(e.target.value))}
                                >
                                    {[2024, 2025, 2026].map(y => (
                                        <option key={y} value={y}>{y}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="flex-1 overflow-x-auto overflow-y-auto custom-scrollbar">
                            <table className="w-full text-left border-collapse">
                                <thead className="sticky top-0 bg-white/80 backdrop-blur-md z-10">
                                    <tr className="border-b border-slate-50">
                                        <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest pl-8">Tanggal</th>
                                        <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Nomor Surat</th>
                                        <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Bidang</th>
                                        <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Perihal</th>
                                        <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                                        <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center pr-8">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {isLoadingLogs ? (
                                        <tr>
                                            <td colSpan={6} className="p-10 text-center">
                                                <Loader2 className="animate-spin mx-auto text-indigo-500" size={32} />
                                            </td>
                                        </tr>
                                    ) : filteredLogs.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="p-10 text-center italic text-slate-400 text-sm">Data tidak ditemukan</td>
                                        </tr>
                                    ) : filteredLogs.map(log => (
                                        <tr key={log.id} className="group border-b border-slate-50 hover:bg-slate-50 transition-colors">
                                            <td className="p-5 pl-8">
                                                <div className="text-xs font-bold text-slate-600">{new Date(log.tanggal_surat).toLocaleDateString('id-ID')}</div>
                                                <div className="text-[9px] font-bold text-slate-300 uppercase tracking-tighter mt-0.5 whitespace-nowrap">
                                                    By {log.creator_name}
                                                </div>
                                            </td>
                                            <td className="p-5">
                                                <div 
                                                    className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-[11px] font-bold font-mono tracking-tight text-indigo-600 shadow-sm inline-block cursor-help tooltip-trigger"
                                                    onMouseEnter={(e) => handleTooltipMouseEnter(e, log)}
                                                    onMouseLeave={handleTooltipMouseLeave}
                                                >
                                                    {log.nomor_surat_full}
                                                </div>
                                                <div className="flex items-center gap-1.5 mt-1.5 opacity-50 group-hover:opacity-100 transition-opacity">
                                                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${log.jenis_surat === 'TTE' ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-600'}`}>
                                                        {log.jenis_surat}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="p-5">
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-2 py-0.5 rounded">{log.bidang_singkatan}</span>
                                            </td>
                                            <td className="p-5">
                                                <div className="text-xs font-bold text-slate-700 uppercase tracking-tight max-w-[200px] line-clamp-2">{log.perihal}</div>
                                                <div className="text-[10px] font-bold text-slate-400 mt-1 italic truncate max-w-[200px]">Untuk: {log.tujuan || '-'}</div>
                                            </td>
                                            <td className="p-5">
                                                {editingLogId === log.id ? (
                                                    <select 
                                                        className="p-1 border border-indigo-300 rounded text-[10px] font-bold outline-none"
                                                        value={editData.status}
                                                        onChange={e => setEditData({...editData, status: e.target.value})}
                                                    >
                                                        <option value="Digunakan">DIGUNAKAN</option>
                                                        <option value="Batal">BATAL</option>
                                                    </select>
                                                ) : (
                                                    <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                                                        log.status === 'Digunakan' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'
                                                    }`}>
                                                        {log.status}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-5 text-center pr-8">
                                                {mode === 'select' ? (
                                                    log.status === 'Batal' ? (
                                                        <div className="px-4 py-2 bg-slate-100 text-slate-400 text-[9px] font-black uppercase tracking-widest rounded-xl border border-slate-200 cursor-not-allowed">
                                                            Nomor Batal
                                                        </div>
                                                    ) : (
                                                        <button 
                                                            onClick={() => {
                                                                if (onSelectNumber) {
                                                                    onSelectNumber({
                                                                        nomor_surat: log.nomor_surat_full,
                                                                        tanggal_surat: log.tanggal_surat.split('T')[0],
                                                                        perihal: log.perihal,
                                                                        tujuan: log.tujuan
                                                                    });
                                                                    onClose();
                                                                }
                                                            }}
                                                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-indigo-100 transition-all active:scale-95"
                                                        >
                                                            Pilih Nomor
                                                        </button>
                                                    )
                                                ) : log.can_edit && (
                                                    <div className="flex items-center justify-center gap-2">
                                                        {editingLogId === log.id ? (
                                                            <>
                                                                <button onClick={handleUpdateLog} className="p-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 shadow-lg shadow-emerald-100 transition-all active:scale-90">
                                                                    <Check size={14} />
                                                                </button>
                                                                <button onClick={() => setEditingLogId(null)} className="p-2 bg-slate-200 text-slate-600 rounded-xl hover:bg-slate-300 transition-all">
                                                                    <X size={14} />
                                                                </button>
                                                            </>
                                                        ) : (
                                                            <button 
                                                                onClick={() => handleEditLog(log)}
                                                                className="p-2.5 bg-white border border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 rounded-xl transition-all shadow-sm active:scale-95 group/edit"
                                                            >
                                                                <Edit size={14} className="group-hover/edit:rotate-12 transition-transform" />
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination / Footer */}
                        <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between px-8">
                             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                Total Entri Bulan Ini: {logs.length} Nomor
                            </p>
                        </div>
                    </div>
                </div>

                <KlasifikasiSearchModal 
                    isOpen={isKlasifikasiOpen} 
                    onClose={() => setIsKlasifikasiOpen(false)}
                    onSelect={(kode) => {
                        setFormData({...formData, kode_klasifikasi: kode});
                        setIsKlasifikasiOpen(false);
                    }}
                />

                {hoveredInfo && (
                    <div 
                        ref={infoRef}
                        className="fixed z-[10000] transition-opacity duration-200 animate-in fade-in zoom-in-95 pointer-events-none"
                        style={infoStyle}
                        onMouseEnter={() => {
                            if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
                        }}
                        onMouseLeave={handleTooltipMouseLeave}
                    >
                        <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 p-4 min-w-[300px] max-w-[350px] overflow-hidden relative pointer-events-auto">
                            <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-500" />
                            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-50 px-1">
                                <List size={14} className="text-indigo-600" />
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black text-slate-800 uppercase tracking-widest leading-none">Keterangan Kode</span>
                                    <span className="text-[9px] font-bold text-indigo-500 font-mono mt-1 tracking-tighter">{hoveredInfo.log.kode_klasifikasi}</span>
                                </div>
                            </div>
                            
                            <div className="space-y-3 px-1">
                                <div className="space-y-1">
                                    <p className="text-xs font-black text-slate-800 leading-snug">
                                        {hoveredInfo.log.klasifikasi_nama || <span className="text-slate-300 italic">Deskripsi kode tidak ditemukan</span>}
                                    </p>
                                </div>
                                
                                <div className="pt-2 flex items-center justify-between opacity-50">
                                    <div className="flex items-center gap-1.5 font-bold text-[9px] text-slate-400 uppercase">
                                        <Calendar size={10} />
                                        {new Date(hoveredInfo.log.tanggal_surat).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                                    </div>
                                    <span className="text-[8px] font-black bg-slate-100 px-1.5 py-0.5 rounded uppercase tracking-tighter">
                                        {hoveredInfo.log.bidang_singkatan}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
}
