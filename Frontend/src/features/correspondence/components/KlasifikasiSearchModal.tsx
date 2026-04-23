import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Search, X, Hash, ChevronRight, Loader2, Check } from 'lucide-react';
import { api } from '@/src/services/api';

interface KlasifikasiSearchModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (kode: string, nama: string) => void;
}

export default function KlasifikasiSearchModal({ isOpen, onClose, onSelect }: KlasifikasiSearchModalProps) {
    const [search, setSearch] = useState('');
    const [results, setResults] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [lastRequestTime, setLastRequestTime] = useState(0);

    useEffect(() => {
        if (isOpen) {
            handleSearch('', true);
        }
    }, [isOpen]);

    const handleSearch = async (term: string, isInitial = false) => {
        const startTime = Date.now();
        setSearch(term);
        setLastRequestTime(startTime);
        
        setIsLoading(true);
        try {
            const res = await api.surat.getKlasifikasi(term);
            if (res.success) {
                // Only set results if this was the latest request
                setLastRequestTime(prev => {
                    if (startTime >= prev) {
                        setResults(res.data);
                    }
                    return prev;
                });
            }
        } catch (err) {
            console.error('Search failed:', err);
        } finally {
            setLastRequestTime(prev => {
                if (startTime >= prev) {
                    setIsLoading(false);
                }
                return prev;
            });
        }
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose} />
            
            <div className="bg-white w-full max-w-4xl max-h-[85vh] rounded-[40px] shadow-2xl overflow-hidden flex flex-col relative animate-in zoom-in-95 duration-300 border border-slate-100">
                {/* Header */}
                <div className="p-8 pb-6 flex items-center justify-between border-b border-slate-50">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 shadow-inner">
                            <Hash size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-slate-800 uppercase tracking-widest leading-none">Pilih Kode Klasifikasi</h2>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">Permendagri Nomor 83 Tahun 2022</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-3 hover:bg-slate-100 rounded-2xl text-slate-400 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Search Box */}
                <div className="px-8 py-6 bg-slate-50/50">
                    <div className="relative group">
                        <Search size={20} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                        <input 
                            autoFocus
                            type="text" 
                            className="w-full h-16 pl-14 pr-6 bg-white border border-slate-200 rounded-3xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all shadow-sm"
                            placeholder="Cari berdasarkan kode (cth: 00.1) atau nama kegiatan (cth: Perjalanan)..."
                            value={search}
                            onChange={(e) => handleSearch(e.target.value)}
                        />
                        {isLoading && (
                            <div className="absolute right-5 top-1/2 -translate-y-1/2">
                                <Loader2 className="animate-spin text-indigo-500" size={20} />
                            </div>
                        )}
                    </div>
                </div>

                {/* Results List */}
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                    {results.length === 0 && !isLoading ? (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-400 italic">
                            <Search size={48} strokeWidth={1} className="mb-4 opacity-20" />
                            <p className="text-sm font-bold uppercase tracking-widest opacity-50">Tidak ada hasil ditemukan</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-2 p-4">
                            {results.map((item) => (
                                <button
                                    key={item.kode}
                                    onClick={() => onSelect(item.kode, item.nama)}
                                    className="group w-full flex items-center justify-between p-4 bg-white hover:bg-indigo-50 rounded-2xl border border-transparent hover:border-indigo-100 transition-all duration-300 text-left hover:shadow-lg hover:shadow-indigo-100/50"
                                >
                                    <div className="flex items-center gap-4 min-w-0">
                                        <div className="px-3 py-1 bg-slate-100 group-hover:bg-white text-slate-600 group-hover:text-indigo-600 rounded-lg text-[11px] font-black font-mono tracking-wider border border-slate-200 transition-colors">
                                            {item.kode}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-bold text-slate-700 group-hover:text-indigo-900 truncate uppercase tracking-tight">
                                                {item.nama}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0">
                                        <div className="w-8 h-8 bg-indigo-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                                            <Check size={16} />
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between px-8">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        Menampilkan {results.length} hasil klasifikasi
                    </p>
                    <button 
                        onClick={onClose}
                        className="px-8 py-3 bg-slate-800 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-slate-700 transition-all active:scale-95 shadow-lg shadow-slate-200"
                    >
                        Tutup
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
