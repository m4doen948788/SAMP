import React from 'react';
import { FileText, Inbox, Send } from 'lucide-react';

interface TestStatsProps {
    totalSurat: number;
    suratMasuk: number;
    suratKeluar: number;
}

export const TestHorizontalStats: React.FC<TestStatsProps> = ({ totalSurat, suratMasuk, suratKeluar }) => {
    return (
        <div className="flex items-center gap-4">
            {/* Horizontal Stats Card */}
            <div className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm shadow-slate-200/20">
                {/* Total Surat */}
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-ppm-slate/5 text-ppm-slate rounded-xl flex items-center justify-center shrink-0">
                        <FileText size={18} />
                    </div>
                    <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Surat</p>
                        <p className="text-lg font-black text-slate-800 tabular-nums">{totalSurat}</p>
                    </div>
                </div>
                
                {/* Separator */}
                <div className="w-px h-8 bg-slate-100"></div>
                
                {/* Surat Masuk */}
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
                        <Inbox size={18} />
                    </div>
                    <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Masuk</p>
                        <p className="text-lg font-black text-slate-800 tabular-nums">{suratMasuk}</p>
                    </div>
                </div>
                
                {/* Separator */}
                <div className="w-px h-8 bg-slate-100"></div>
                
                {/* Surat Keluar */}
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">
                        <Send size={18} />
                    </div>
                    <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Keluar</p>
                        <p className="text-lg font-black text-slate-800 tabular-nums">{suratKeluar}</p>
                    </div>
                </div>
            </div>
            
            {/* Action Button (Contoh) */}
            <button className="flex items-center gap-2 px-4 py-2 bg-ppm-slate text-white rounded-xl font-bold text-sm hover:shadow-lg hover:shadow-ppm-slate/30 transition-all active:scale-95">
                <span>+</span>
                Registrasi Surat Masuk
            </button>
        </div>
    );
};