import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Calendar, List, ClipboardList } from 'lucide-react';
import DaftarKegiatan from './DaftarKegiatan';
import KegiatanPerOrang from './KegiatanPerOrang';

const ManajemenKegiatan = ({ initialTab }: { initialTab?: 'daftar' | 'logbook' }) => {
    const { user } = useAuth();

    const [activeTab, setActiveTab] = useState<'daftar' | 'logbook'>(() => {
        if (initialTab) return initialTab;
        return (sessionStorage.getItem('manajemen_kegiatan_active_tab') as any) || 'daftar';
    });
    
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

    return (
        <div className="max-w-full mx-auto px-4 lg:px-6 pb-6 space-y-1 animate-in fade-in duration-500">
            {/* Sticky Header Section */}
            <div 
                ref={headerRef}
                className="sticky top-[-1px] z-[600] pt-2 pb-1.5 px-4 lg:px-6 bg-[#f8fafc] border-b border-transparent shadow-sm"
            >
                {/* Header / Page Title - Optimized for sticky */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-3">
                    <div>
                        <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                            <div className="p-1.5 bg-ppm-blue text-white rounded-xl shadow-lg shadow-blue-100">
                                <ClipboardList size={18} />
                            </div>
                            Manajemen Kegiatan
                        </h2>
                        <p className="text-slate-500 text-[9px] uppercase tracking-wider font-bold mt-0 ml-1">Terintegrasi & Terpusat</p>
                    </div>
                </div>

                {/* Navigation and Action Row */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-1 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/40">
                    {/* Premium Tab Navigation */}
                    <div className="flex items-center p-0.5 bg-slate-100/80 rounded-[2rem] border border-slate-200/50 w-fit">
                        <button
                            onClick={() => setActiveTab('daftar')}
                            className={`flex items-center gap-3 px-6 py-2 rounded-[1.75rem] font-black text-[10px] uppercase tracking-[0.1em] transition-all duration-500 ${activeTab === 'daftar'
                                    ? 'bg-white text-ppm-blue shadow-lg shadow-blue-100/50 ring-1 ring-blue-50 scale-100'
                                    : 'text-slate-500 hover:text-slate-700 hover:bg-white/50 scale-95'
                                }`}
                        >
                            <List size={14} className={activeTab === 'daftar' ? 'animate-pulse' : ''} />
                            Daftar Kegiatan
                        </button>
                        <button
                            onClick={() => setActiveTab('logbook')}
                            className={`flex items-center gap-3 px-6 py-2 rounded-[1.75rem] font-black text-[10px] uppercase tracking-[0.1em] transition-all duration-500 ${activeTab === 'logbook'
                                    ? 'bg-white text-ppm-blue shadow-lg shadow-blue-100/50 ring-1 ring-blue-50 scale-100'
                                    : 'text-slate-500 hover:text-slate-700 hover:bg-white/50 scale-95'
                                }`}
                        >
                            <Calendar size={14} className={activeTab === 'logbook' ? 'animate-bounce-subtle' : ''} />
                            Logbook Per Orang
                        </button>
                    </div>

                    {/* Action Slot (Right Hand Side) */}
                    <div id="manajemen-kegiatan-actions" className="flex items-center gap-3 px-2">
                        {/* Buttons will be rendered here via Portal */}
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
