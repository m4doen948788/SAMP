import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Calendar, List, ClipboardList, Settings, X, Check, ShieldCheck, Loader2 } from 'lucide-react';
import DaftarKegiatan from './DaftarKegiatan';
import KegiatanPerOrang from './KegiatanPerOrang';
import { api } from '../services/api';

const ManajemenKegiatan = ({ initialTab, onTabChange }: { initialTab?: 'daftar' | 'logbook', onTabChange?: (tab: 'daftar' | 'logbook') => void }) => {
    const { user } = useAuth();
    const isSuperAdmin = user?.tipe_user_id === 1;

    const [activeTab, setActiveTab] = useState<'daftar' | 'logbook'>(() => {
        if (initialTab) return initialTab;
        return (sessionStorage.getItem('manajemen_kegiatan_active_tab') as any) || 'daftar';
    });
    
    // Settings Modal State
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [roleScopes, setRoleScopes] = useState<any[]>([]); // { role_id, role_name, scope }
    const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
    const [savingSettings, setSavingSettings] = useState(false);
    const [loadingSettings, setLoadingSettings] = useState(false);


    // Dynamic Header Measurement for sticky sync
    const [headerHeight, setHeaderHeight] = useState(105);
    const headerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!headerRef.current) return;
        
        const updateHeight = () => {
            if (headerRef.current) {
                setHeaderHeight(headerRef.current.offsetHeight);
            }
        };

        const observer = new ResizeObserver(updateHeight);
        observer.observe(headerRef.current);
        updateHeight();

        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        if (initialTab) {
            setActiveTab(initialTab);
        }
    }, [initialTab]);

    useEffect(() => {
        sessionStorage.setItem('manajemen_kegiatan_active_tab', activeTab);
    }, [activeTab]);

    const fetchSettings = async () => {
        if (!isSuperAdmin) return;
        setLoadingSettings(true);
        try {
            const res = await api.rbac.getKegiatanScopes();
            if (res.success) {
                setRoleScopes(res.data);
                if (res.data.length > 0 && !selectedRoleId) {
                    setSelectedRoleId(res.data[0].role_id);
                }
            }
        } catch (err) {
            console.error('Failed to fetch settings', err);
        } finally {
            setLoadingSettings(false);
        }
    };

    const handleOpenSettings = () => {
        fetchSettings();
        setIsSettingsOpen(true);
    };

    const handleUpdateScope = async (roleId: number, scope: number) => {
        // Optimistic update
        setRoleScopes(prev => prev.map(r => r.role_id === roleId ? { ...r, scope } : r));
        
        try {
            await api.rbac.updateKegiatanScope(roleId, scope);
        } catch (err) {
            console.error('Failed to update scope', err);
            // Revert on error
            fetchSettings();
        }
    };

    const SCOPES = [
        { id: 0, label: 'Bukan Admin', desc: 'Hanya bisa melihat' },
        { id: 1, label: 'Petugas', desc: 'Upload saja jika ditag' },
        { id: 2, label: 'Level Bidang', desc: 'Kelola data di bidangnya' },
        { id: 3, label: 'Level Instansi', desc: 'Kelola data di instansinya' },
        { id: 4, label: 'Level Global', desc: 'Superadmin (Semua)' },
    ];


    return (
        <div className="max-w-full mx-auto px-4 lg:px-6 pb-6 space-y-1 animate-in fade-in duration-500">
            {/* Sticky Header Section */}
            <div 
                ref={headerRef}
                className="sticky top-[-1px] z-[600] pt-2 pb-1.5 px-4 lg:px-6 bg-[#f8fafc] border-b border-transparent shadow-sm"
            >
                {/* Header / Page Title - Optimized for sticky */}
                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-2">
                    <div className="flex items-center justify-between xl:justify-start gap-4 shrink-0">
                        <div className="shrink-0 group pointer-events-none">
                            <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                                <div className="p-1.5 bg-ppm-blue text-white rounded-xl shadow-lg shadow-blue-100 group-hover:scale-110 transition-transform">
                                    <ClipboardList size={18} />
                                </div>
                                Manajemen Kegiatan
                            </h2>
                            <p className="text-slate-500 text-[9px] uppercase tracking-wider font-bold mt-0 ml-1">Terintegrasi & Terpusat</p>
                        </div>

                        {/* Settings Trigger for Superadmin */}
                        {isSuperAdmin && (
                            <button
                                onClick={handleOpenSettings}
                                className="group relative p-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-all shadow-sm hover:shadow-md active:scale-95"
                                title="Pengaturan Hak Akses Edit"
                            >
                                <Settings size={18} className="text-slate-400 group-hover:text-ppm-blue group-hover:rotate-45 transition-all duration-300" />
                                <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white shadow-sm"></div>
                            </button>
                        )}
                    </div>

                    {/* Navigation and Action Row */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-1 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/40 flex-1 xl:ml-8">
                        {/* Premium Tab Navigation */}
                        <div className="flex items-center p-0.5 bg-slate-100/80 rounded-[2rem] border border-slate-200/50 w-fit shrink-0">
                            <button
                                onClick={() => {
                                    setActiveTab('daftar');
                                    if (onTabChange) onTabChange('daftar');
                                }}
                                className={`flex items-center gap-2 px-5 py-2 rounded-[1.75rem] font-black text-[9px] uppercase tracking-[0.1em] transition-all duration-500 ${activeTab === 'daftar'
                                        ? 'bg-white text-ppm-blue shadow-lg shadow-blue-100/50 ring-1 ring-blue-50 scale-100'
                                        : 'text-slate-500 hover:text-slate-700 hover:bg-white/50 scale-95'
                                    }`}
                            >
                                <List size={13} className={activeTab === 'daftar' ? 'animate-pulse' : ''} />
                                Daftar Kegiatan
                            </button>
                            <button
                                onClick={() => {
                                    setActiveTab('logbook');
                                    if (onTabChange) onTabChange('logbook');
                                }}
                                className={`flex items-center gap-2 px-5 py-2 rounded-[1.75rem] font-black text-[9px] uppercase tracking-[0.1em] transition-all duration-500 ${activeTab === 'logbook'
                                        ? 'bg-white text-ppm-blue shadow-lg shadow-blue-100/50 ring-1 ring-blue-50 scale-100'
                                        : 'text-slate-500 hover:text-slate-700 hover:bg-white/50 scale-95'
                                    }`}
                            >
                                <Calendar size={13} className={activeTab === 'logbook' ? 'animate-bounce-subtle' : ''} />
                                Logbook Per Orang
                            </button>
                        </div>

                        {/* Action Slot (Right Hand Side) */}
                        <div id="manajemen-kegiatan-actions" className="flex items-center gap-3 px-2">
                            {/* Buttons will be rendered here via Portal */}
                        </div>
                    </div>
                </div>
            </div>

            {/* Tab Content */}
            <div className="mt-4">
                {activeTab === 'daftar' ? (
                    <DaftarKegiatan headerHeight={headerHeight} />
                ) : (
                    <KegiatanPerOrang headerHeight={headerHeight} />
                )}
            </div>

            {/* Settings Modal */}
            {isSettingsOpen && (
                <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => !savingSettings && setIsSettingsOpen(false)}></div>
                    <div className="relative bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
                        {/* Header */}
                        <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-ppm-blue/10 text-ppm-blue rounded-xl">
                                    <ShieldCheck size={20} />
                                </div>
                                <div>
                                    <h3 className="text-sm font-black text-slate-800">Manajemen Hak Akses Kegiatan</h3>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pemetaan kewenangan operasional per role</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setIsSettingsOpen(false)}
                                className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Body - Split Pane */}
                        <div className="flex-1 overflow-hidden flex flex-col md:flex-row min-h-0">
                            {loadingSettings ? (
                                <div className="w-full py-24 flex flex-col items-center justify-center gap-3">
                                    <Loader2 className="w-8 h-8 text-ppm-blue animate-spin" />
                                    <p className="text-xs font-bold text-slate-400">Memuat konfigurasi...</p>
                                </div>
                            ) : (
                                <>
                                    {/* Left Sidebar - Role List */}
                                    <div className="w-full md:w-72 bg-slate-50/50 border-r border-slate-100 overflow-y-auto custom-scrollbar p-4 space-y-2">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 px-2">Daftar Role User</p>
                                        {roleScopes.map(role => (
                                            <button
                                                key={role.role_id}
                                                onClick={() => setSelectedRoleId(role.role_id)}
                                                className={`w-full text-left p-3 rounded-2xl transition-all flex items-center justify-between group ${selectedRoleId === role.role_id 
                                                    ? 'bg-white border-ppm-blue shadow-md scale-[1.02] ring-1 ring-blue-50' 
                                                    : 'bg-transparent border-transparent hover:bg-white/50'}`}
                                            >
                                                <div className="overflow-hidden">
                                                    <h4 className={`text-[11px] font-black truncate ${selectedRoleId === role.role_id ? 'text-ppm-blue' : 'text-slate-600 group-hover:text-slate-900'}`}>{role.role_name}</h4>
                                                    <div className="flex items-center gap-1.5 mt-0.5">
                                                        <div className={`w-1.5 h-1.5 rounded-full ${role.scope > 0 ? 'bg-green-500' : 'bg-slate-300'}`}></div>
                                                        <span className="text-[8px] font-bold text-slate-400 truncate">{SCOPES.find(s => s.id === role.scope)?.label}</span>
                                                    </div>
                                                </div>
                                                {selectedRoleId === role.role_id && <div className="w-1 h-8 bg-ppm-blue rounded-full"></div>}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Right Content - Scope Selection */}
                                    <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-white">
                                        {selectedRoleId ? (
                                            <div className="animate-in slide-in-from-right-2 duration-300">
                                                <div className="mb-6">
                                                    <h3 className="text-sm font-black text-slate-800">Cakupan Akses: {roleScopes.find(r => r.role_id === selectedRoleId)?.role_name}</h3>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">Pilih tingkat kewenangan untuk role ini</p>
                                                </div>

                                                <div className="space-y-2.5">
                                                    {SCOPES.map(s => {
                                                        const isSelected = roleScopes.find(r => r.role_id === selectedRoleId)?.scope === s.id;
                                                        return (
                                                            <button
                                                                key={s.id}
                                                                onClick={() => handleUpdateScope(selectedRoleId, s.id)}
                                                                className={`w-full flex items-start gap-4 p-4 rounded-2xl border transition-all text-left group ${isSelected 
                                                                    ? 'bg-indigo-50 border-indigo-200 ring-1 ring-indigo-50' 
                                                                    : 'bg-white border-slate-100 hover:border-slate-300'}`}
                                                            >
                                                                <div className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${isSelected ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'border-slate-300'}`}>
                                                                    {isSelected && <Check size={12} strokeWidth={4} />}
                                                                </div>
                                                                <div>
                                                                    <p className={`text-xs font-black ${isSelected ? 'text-indigo-900' : 'text-slate-700'}`}>{s.label}</p>
                                                                    <p className={`text-[10px] font-bold mt-0.5 ${isSelected ? 'text-indigo-600/70' : 'text-slate-400'}`}>{s.desc}</p>
                                                                </div>
                                                            </button>
                                                        );
                                                    })}
                                                </div>

                                                <div className="mt-8 p-4 bg-slate-50 rounded-2xl border border-slate-100 border-dashed">
                                                    <p className="text-[10px] text-slate-500 font-bold leading-relaxed italic">
                                                        * Perubahan akan berdampak langsung pada modul Daftar Kegiatan dan Logbook Per Orang untuk semua akun dengan role ini.
                                                    </p>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="h-full flex flex-col items-center justify-center text-slate-300 opacity-60">
                                                <ShieldCheck size={48} className="mb-3 stroke-[1]" />
                                                <p className="text-xs font-bold">Pilih role di sebelah kiri</p>
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center px-6 shrink-0">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic flex items-center gap-2">
                                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                Perubahan Tersimpan Otomatis
                            </p>
                            <button 
                                onClick={() => setIsSettingsOpen(false)}
                                className="px-8 py-2.5 bg-slate-900 text-white text-[11px] font-black uppercase tracking-widest rounded-xl hover:bg-slate-800 hover:scale-105 active:scale-95 transition-all shadow-xl shadow-slate-200"
                            >
                                Selesai
                            </button>
                        </div>
                    </div>
                </div>
            )}


            <style>{`
                @keyframes bounce-subtle {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-2px); }
                }
                .animate-bounce-subtle {
                    animation: bounce-subtle 2s infinite ease-in-out;
                }
            `}</style>
        </div>
    );
};

export default ManajemenKegiatan;

