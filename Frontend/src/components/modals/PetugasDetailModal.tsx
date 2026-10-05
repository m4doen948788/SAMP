import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
    X, User, Mail, Phone, MapPin, Calendar, Building2, 
    Briefcase, Award, Check, Loader2, Eye, ShieldCheck, HeartHandshake
} from 'lucide-react';
import { api } from '@/src/services/api';

interface PetugasDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    pegawai: any | null; // Can be full pegawai object or minimal object with id
}

export const PetugasDetailModal: React.FC<PetugasDetailModalProps> = ({
    isOpen,
    onClose,
    pegawai
}) => {
    const [detailData, setDetailData] = useState<any | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!isOpen || !pegawai) {
            setDetailData(null);
            return;
        }

        const targetId = pegawai.id || pegawai.profil_id || pegawai.profil_pegawai_id;
        const hasFullDetails = pegawai.nip && (pegawai.tempat_lahir || pegawai.alamat_lengkap || pegawai.email || pegawai.pangkat_golongan_nama);

        // If the object already has deep/full fields, use directly
        if (hasFullDetails) {
            setDetailData(pegawai);
        } else if (targetId) {
            // Fetch detailed profile by ID if only minimal data or summary was passed
            setLoading(true);
            api.profilPegawai.getById(targetId)
                .then(res => {
                    if (res && res.success && res.data) {
                        setDetailData(res.data);
                    } else {
                        setDetailData(pegawai);
                    }
                })
                .catch(err => {
                    console.error('Failed to fetch detailed profile:', err);
                    setDetailData(pegawai);
                })
                .finally(() => setLoading(false));
        } else {
            setDetailData(pegawai);
        }
    }, [isOpen, pegawai]);

    // Handle ESC key press
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const currentItem = detailData || pegawai;
    if (!currentItem) return null;

    const names = (currentItem.nama_lengkap || currentItem.nama || '').trim().split(' ');
    const filteredNames = names.filter((n: string) => !n.includes('.') && n.length > 1);
    const nameParts = filteredNames.length > 0 ? filteredNames : names;
    const first = nameParts[0]?.[0] || '';
    const second = nameParts[1]?.[0] || '';
    const initials = (first + second).toUpperCase() || 'P';

    return createPortal(
        <div 
            className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col border border-slate-200 animate-in zoom-in-95 duration-200 overflow-hidden">
                {/* Header */}
                <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/70">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-ppm-slate-light/10 text-ppm-slate-light flex items-center justify-center shrink-0">
                            <Eye size={18} />
                        </div>
                        <div>
                            <h3 className="text-sm font-black text-slate-800 tracking-tight flex items-center gap-2 uppercase">
                                CV / Biodata Pegawai
                            </h3>
                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                                Detail Lengkap Kepegawaian & Biodata
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="p-2 hover:bg-white rounded-xl transition-all border border-transparent hover:border-slate-200 text-slate-400 hover:text-slate-600 cursor-pointer"
                        title="Tutup (Esc)"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 custom-scrollbar-visible">
                    {loading ? (
                        <div className="py-20 flex flex-col items-center justify-center gap-3">
                            <Loader2 size={32} className="text-ppm-slate-light animate-spin" />
                            <span className="text-xs font-bold text-slate-500 animate-pulse">Memuat data pegawai...</span>
                        </div>
                    ) : (
                        <div className="bg-white border border-slate-200/70 rounded-3xl shadow-xl w-full mx-auto overflow-hidden grid grid-cols-1 md:grid-cols-3 min-h-[460px] relative">
                            {/* LEFT COLUMN: SIDEBAR CV */}
                            <div className="md:col-span-1 bg-slate-50 border-r border-slate-100 p-8 flex flex-col items-center justify-center text-center space-y-5">
                                {/* Avatar */}
                                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gradient-to-br from-ppm-slate-light/10 to-ppm-slate-light/20 shadow-sm flex items-center justify-center text-ppm-slate-light text-3xl sm:text-4xl font-black tracking-tight border-2 border-ppm-slate-light/20 overflow-hidden shrink-0">
                                    {currentItem.foto_profil ? (
                                        <img 
                                            src={currentItem.foto_profil.startsWith('http') ? currentItem.foto_profil : `/uploads/${currentItem.foto_profil}`} 
                                            alt={currentItem.nama_lengkap || currentItem.nama} 
                                            className="w-full h-full object-cover" 
                                            onError={(e) => {
                                                // Fallback to initials if image load fails
                                                (e.target as HTMLElement).style.display = 'none';
                                            }}
                                        />
                                    ) : null}
                                    <span className={currentItem.foto_profil ? 'hidden' : ''}>{initials}</span>
                                </div>
                                
                                {/* Basic Info */}
                                <div className="space-y-2 w-full">
                                    <h4 className="text-base sm:text-lg font-black tracking-tight leading-snug text-slate-800 break-words">
                                        {currentItem.nama_lengkap || currentItem.nama || 'Nama Pegawai'}
                                    </h4>
                                    <div className="inline-block px-3 py-1 rounded-full bg-ppm-slate-light/10 text-ppm-slate-light text-[10px] font-black uppercase tracking-wider max-w-full truncate">
                                        {currentItem.jabatan_nama || currentItem.jabatan || 'Staf'}
                                    </div>
                                    <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mt-1">
                                        NIP. {currentItem.nip || '-'}
                                    </p>
                                </div>

                                {currentItem.instansi_nama && (
                                    <div className="pt-3 border-t border-slate-200/50 w-full">
                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Instansi</span>
                                        <span className="text-xs font-extrabold text-slate-700 block mt-0.5">
                                            {currentItem.instansi_nama} {currentItem.instansi_singkatan ? `(${currentItem.instansi_singkatan})` : ''}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* RIGHT COLUMN: MAIN CONTENT */}
                            <div className="md:col-span-2 p-6 sm:p-8 flex flex-col justify-between space-y-6 bg-white relative">
                                <div className="space-y-6 relative z-10">
                                    {/* Section 1: Kontak & Informasi Pribadi */}
                                    <div className="space-y-3">
                                        <div>
                                            <h5 className="text-xs font-black text-ppm-slate-light uppercase tracking-widest mb-0.5">
                                                Kontak & Data Pribadi
                                            </h5>
                                            <p className="text-[10px] text-slate-400 font-medium">Informasi pribadi dan kontak resmi pegawai.</p>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3.5 pt-1">
                                            <div>
                                                <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">Tempat, Tanggal Lahir</span>
                                                <span className="text-xs text-slate-800 font-bold mt-0.5 block">
                                                    {currentItem.tempat_lahir || '-'}
                                                    {currentItem.tanggal_lahir ? `, ${new Date(currentItem.tanggal_lahir).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}` : ''}
                                                </span>
                                            </div>

                                            <div>
                                                <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">Jenis Kelamin & Golongan Darah</span>
                                                <span className="text-xs text-slate-800 font-bold mt-0.5 block">
                                                    {currentItem.jenis_kelamin || '-'} {currentItem.golongan_darah && `(Gol. Darah: ${currentItem.golongan_darah})`}
                                                </span>
                                            </div>

                                            <div>
                                                <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">Agama & Status Pernikahan</span>
                                                <span className="text-xs text-slate-800 font-bold mt-0.5 block">
                                                    {currentItem.agama || '-'} {currentItem.status_perkawinan ? `• ${currentItem.status_perkawinan}` : ''}
                                                </span>
                                            </div>

                                            <div>
                                                <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">Kontak Handphone</span>
                                                <span className="text-xs text-slate-800 font-bold mt-0.5 block">
                                                    {currentItem.no_hp ? `📞 ${currentItem.no_hp}` : '-'}
                                                </span>
                                            </div>

                                            <div className="sm:col-span-2">
                                                <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">Email Resmi</span>
                                                <span className="text-xs text-slate-800 font-bold mt-0.5 block truncate lowercase">
                                                    {currentItem.email ? `✉️ ${currentItem.email}` : '-'}
                                                </span>
                                            </div>

                                            <div className="sm:col-span-2">
                                                <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">Alamat Lengkap</span>
                                                <span className="text-xs text-slate-700 leading-relaxed font-medium mt-0.5 block">
                                                    🏠 {currentItem.alamat_lengkap || '-'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Section 2: Data Pekerjaan */}
                                    <div className="pt-4 border-t border-slate-100 space-y-3">
                                        <div>
                                            <h5 className="text-xs font-black text-ppm-slate-light uppercase tracking-widest mb-0.5">
                                                Data Pekerjaan & Penempatan
                                            </h5>
                                            <p className="text-[10px] text-slate-400 font-medium">Informasi resmi kedinasan dan penempatan instansi.</p>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3.5 pt-1">
                                            <div>
                                                <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">Instansi Pemerintah</span>
                                                <span className="text-xs text-slate-800 font-extrabold mt-0.5 block">{currentItem.instansi_nama || '-'}</span>
                                            </div>

                                            <div>
                                                <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">Jenis Kepegawaian</span>
                                                <span className="text-xs text-slate-800 font-bold mt-0.5 block">{currentItem.jenis_pegawai_nama || '-'}</span>
                                            </div>

                                            <div>
                                                <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">Bidang / Unit Kerja</span>
                                                <span className="text-xs text-slate-800 font-bold mt-0.5 block">{currentItem.bidang_nama || currentItem.bidang_singkatan || '-'}</span>
                                            </div>

                                            <div>
                                                <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">Sub-Bidang / Seksi</span>
                                                <span className="text-xs text-slate-800 font-medium mt-0.5 block">{currentItem.sub_bidang_nama || '-'}</span>
                                            </div>

                                            <div>
                                                <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">Jabatan Struktur/Fungsional</span>
                                                <span className="text-xs text-slate-800 font-bold mt-0.5 block">{currentItem.jabatan_nama || currentItem.jabatan || '-'}</span>
                                            </div>

                                            <div>
                                                <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">Pangkat / Golongan</span>
                                                <span className="text-xs text-slate-800 font-bold mt-0.5 block">{currentItem.pangkat_golongan_nama || '-'}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Footnote */}
                                <div className="text-[9px] text-slate-400 italic text-right pt-3 border-t border-slate-50 relative z-10">
                                    Data diperbarui secara berkala pada sistem kepegawaian SAMP.
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end">
                    <button 
                        type="button" 
                        onClick={onClose} 
                        className="px-6 py-2 bg-ppm-slate-light hover:brightness-95 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 flex items-center gap-1.5 cursor-pointer"
                    >
                        <Check size={14} /> Tutup
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};
