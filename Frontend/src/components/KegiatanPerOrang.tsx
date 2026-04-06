import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, ChevronLeft, ChevronRight, ChevronDown, Download, Filter, Printer, Save, User, Info, CheckCircle2, XCircle, Clock, AlertCircle, Edit2, MessageSquare, FileText, TrendingUp, Search, Upload, X, Check, Copy, ExternalLink, Eye, FileImage } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { toPng } from 'html-to-image';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { SearchableSelect } from './common/SearchableSelect';

// Dynamic types will be fetched from API
interface ActivityType {
    id: number;
    parent_id: number | null;
    kode: string;
    nama: string;
    deskripsi: string;
    warna: string;
    warna_teks: string;
    is_jumlah_full: boolean;
    is_rapat: boolean;
    urutan: number;
    subOptions?: ActivityType[];
}

const MOCK_MEETINGS = [
    { id: 'M1', nama: 'Rapat Koordinasi Internal' },
    { id: 'M2', nama: 'Rapat Persiapan Musrenbang' },
    { id: 'M3', nama: 'Rapat Evaluasi Program' },
    { id: 'M4', nama: 'Rapat Teknis Aplikasi' },
    { id: 'M5', nama: 'Rapat Koordinasi Lintas Sektoral' },
    { id: 'M6', nama: 'rapat mamin Online' },
    { id: 'M7', nama: 'rapat mamin Offline' },
];

const MOCK_LETTERS = [
    { id: 'S1', nomor: '001/BAP/2026', perihal: 'Undangan Rapat Koordinasi' },
    { id: 'S2', nomor: '002/BAP/2026', perihal: 'SPT Dinas Luar Jakarta' },
    { id: 'S3', nomor: '003/BAP/2026', perihal: 'Surat Tugas Monitoring' },
    { id: 'S4', nomor: '004/BAP/2026', perihal: 'Nota Dinas Internal' },
];

// Lightweight CSS-only cell tooltip for activity cells
// This component only renders when the cell actually HAS activities
// Tooltip component for activity cells
const CellTooltip = React.memo(({ activities, nama, session, day, suratList }: { activities: any[], nama: string, session: string, day: number, suratList: any[] }) => {
    if (!activities || activities.length === 0) return null;
    
    // Check if there are attachments in any of the activities
    const allAttachments: any[] = [];
    activities.forEach(act => {
        const lampiran = act.lampiran || act.lampiran_kegiatan;
        if (lampiran) {
            const ids = lampiran.split(',');
            ids.forEach((id: string) => {
                const s = suratList.find((doc: any) => doc.id.toString() === id.toString());
                if (s && !allAttachments.find(x => x.id === s.id)) {
                    allAttachments.push(s);
                }
            });
        }
    });

    const hasAttachments = allAttachments.length > 0;

    return (
        <div className="cell-tooltip">
            {/* Header: Sesi & Info Kegiatan Utama */}
            <div className="p-3 bg-slate-50/50 border-b border-slate-100">
                <div className="flex items-center justify-between mb-1">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{session} · {day}</span>
                    <span className="text-[9px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full uppercase">{activities.length} Kegiatan</span>
                </div>
                <div className="text-[10px] font-black text-slate-800 truncate">{nama}</div>
            </div>

            {/* Activities List */}
            <div className="p-3 space-y-3">
                {activities.map((act: any, idx: number) => (
                    <div key={idx} className="space-y-1">
                        <div className="flex items-center gap-2">
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${act.tipe === 'DL' ? 'bg-orange-500' : 'bg-indigo-500'}`}></span>
                            <span className="text-[9px] font-black text-slate-700 uppercase">{act.tipe}</span>
                            <span className="text-[10px] font-bold text-indigo-600 truncate">{act.nama || act.activity_nama}</span>
                        </div>
                        {act.keterangan && (
                            <div className="text-[9px] font-medium text-slate-500 italic pl-3.5 leading-relaxed bg-slate-50/50 py-1 px-2 rounded-lg border-l-2 border-slate-200">
                                "{act.keterangan}"
                            </div>
                        )}
                    </div>
                ))}
            </div>
            {/* Compact Icon-based Attachment List */}
            {hasAttachments && (
                <div className="p-3 pt-0 space-y-2">
                    <div className="h-px bg-slate-100 mx-1"></div>
                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 mt-1 px-1">Lampiran Dokumen ({allAttachments.length})</div>
                    
                    <div className="flex flex-col gap-1.5 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                        {allAttachments.map((surat, sIdx) => {
                            const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(surat.path);
                            const isPdf = /\.pdf$/i.test(surat.path);
                            const isWord = /\.(doc|docx)$/i.test(surat.path);
                            const isExcel = /\.(xls|xlsx)$/i.test(surat.path);
                            const isPPT = /\.(ppt|pptx)$/i.test(surat.path);

                            return (
                                <div 
                                    key={sIdx} 
                                    onClick={() => window.open(surat.path, '_blank')}
                                    className="group flex items-center justify-between p-2 rounded-xl bg-white border border-slate-100 hover:border-indigo-200 hover:shadow-sm transition-all cursor-pointer"
                                >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 ${
                                            isPdf ? 'bg-rose-50 text-rose-500' : 
                                            isImage ? 'bg-blue-50 text-blue-500' : 
                                            isWord ? 'bg-indigo-50 text-indigo-500' :
                                            isExcel ? 'bg-emerald-50 text-emerald-500' :
                                            isPPT ? 'bg-orange-50 text-orange-500' :
                                            'bg-slate-50 text-slate-500'
                                        }`}>
                                            {isPdf ? <FileText size={16} /> : 
                                             isImage ? <FileImage size={16} /> : 
                                             <FileText size={16} />}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="text-[10px] font-black text-slate-700 truncate group-hover:text-indigo-600 transition-colors" title={surat.nama_file}>
                                                {surat.nama_file}
                                            </div>
                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                <span className="text-[8px] font-bold text-slate-400 uppercase">{surat.jenis_dokumen_nama || 'Dokumen'}</span>
                                                <span className="text-[8px] font-bold text-slate-300">•</span>
                                                <span className="text-[8px] font-bold text-slate-400 capitalize">{surat.uploader_nama?.split(' ')[0] || 'System'}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity pr-1">
                                        <ExternalLink size={12} className="text-indigo-400" />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

        </div>
    );
});

// High-performance isolated search field to prevent main component re-renders while typing
const SearchField = React.memo(({ value, onSearch }: { value: string, onSearch: (val: string) => void }) => {
    const [localValue, setLocalValue] = useState(value);

    // Sync local value if parent value changes externally (e.g. reset)
    useEffect(() => {
        setLocalValue(value);
    }, [value]);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (localValue !== value) {
                onSearch(localValue);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [localValue, onSearch, value]);

    return (
        <div className="relative w-full lg:w-64">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
                type="text"
                placeholder="Cari Nama Pegawai..."
                value={localValue}
                onChange={(e) => setLocalValue(e.target.value)}
                className="input-modern pl-10 h-9 !py-1.5 text-[11px] font-bold border-slate-200/60 bg-white/80 shadow-sm"
            />
        </div>
    );
});

// Multi-select and File Upload for Surat
const SuratMultiUpload = React.memo(({ label, suratList, selectedIds, onChange, onNewUpload, masterDokumenList }: any) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const [selectedJenisId, setSelectedJenisId] = useState<string>('');
    const [isJenisOpen, setIsJenisOpen] = useState(false);
    const [jenisSearch, setJenisSearch] = useState('');
    const jenisRef = useRef<HTMLDivElement>(null);

    // Filter only "Surat" options from masterDokumenList
    const suratTypes = useMemo(() => {
        if (!masterDokumenList) return [];
        return masterDokumenList.filter((d: any) => 
            d.jenis_dokumen_id === 8 || d.dokumen.toLowerCase().startsWith('surat')
        );
    }, [masterDokumenList]);

    // Handle click outside for jenis dropdown
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (jenisRef.current && !jenisRef.current.contains(e.target as Node)) {
                setIsJenisOpen(false);
            }
        };
        if (isJenisOpen) document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [isJenisOpen]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    const filteredSurat = suratList.filter((s: any) => 
        s.nama_file.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!selectedJenisId) {
            alert('Silakan pilih jenis surat terlebih dahulu!');
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }

        setIsUploading(true);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('jenis_dokumen_id', selectedJenisId); // Classification ID from master_dokumen
        formData.append('nama_file', file.originalname || file.name);

        try {
            const res = await api.dokumen.upload(formData);
            if (res.success) {
                onNewUpload(res.data.id);
            }
        } catch (err) {
            console.error('Upload failed:', err);
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    return (
        <div className="space-y-2">
            <div className="flex flex-col md:flex-row md:items-end justify-between px-1 gap-3">
                <div className="flex-1 space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</label>
                    <div className="relative" ref={jenisRef}>
                        <div 
                            onClick={() => setIsJenisOpen(!isJenisOpen)}
                            className={`w-full ${!selectedJenisId ? 'bg-amber-50/50 border-amber-200' : 'bg-slate-50 border-slate-100'} border rounded-xl px-3 py-2 text-[10px] font-bold text-slate-600 flex items-center justify-between cursor-pointer hover:bg-white transition-all shadow-inner`}
                        >
                            <span className="truncate">
                                {suratTypes.find((t: any) => t.id.toString() === selectedJenisId)?.dokumen || '-- Pilih Jenis Surat --'}
                            </span>
                            <ChevronDown size={12} className={`transition-transform duration-300 ${isJenisOpen ? 'rotate-180' : ''}`} />
                        </div>

                        {isJenisOpen && (
                            <div className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-slate-200 shadow-2xl rounded-2xl p-2 z-[2200] animate-in zoom-in-95 duration-200 origin-bottom">
                                <div className="relative mb-2">
                                    <Search size={10} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input 
                                        type="text" 
                                        placeholder="Cari klasifikasi..." 
                                        value={jenisSearch}
                                        onChange={(e) => setJenisSearch(e.target.value)}
                                        className="w-full bg-slate-50 border-none rounded-lg pl-8 pr-3 py-1.5 text-[10px] font-medium outline-none"
                                        autoFocus
                                    />
                                </div>
                                <div className="max-h-32 overflow-y-auto custom-scrollbar flex flex-col gap-0.5">
                                    {suratTypes
                                        .filter((t: any) => t.dokumen.toLowerCase().includes(jenisSearch.toLowerCase()))
                                        .map((t: any) => (
                                            <button
                                                key={t.id}
                                                onClick={() => {
                                                    setSelectedJenisId(t.id.toString());
                                                    setIsJenisOpen(false);
                                                    setJenisSearch('');
                                                }}
                                                className={`px-3 py-1.5 rounded-lg text-left text-[10px] font-bold transition-all ${selectedJenisId === t.id.toString() ? 'bg-indigo-600 text-white shadow-md' : 'hover:bg-slate-50 text-slate-600'}`}
                                            >
                                                {t.dokumen}
                                            </button>
                                        ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                <div className="shrink-0 pb-0.5">
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className="h-[36px] px-4 rounded-xl bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-indigo-100 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                    >
                        <Upload size={14} />
                        {isUploading ? 'Mengupload...' : 'Upload File'}
                    </button>
                    <input type="file" ref={fileInputRef} className="hidden" onChange={handleUpload} accept=".pdf,image/*" />
                </div>
            </div>

            <div className="relative" ref={containerRef}>
                <div 
                    onClick={() => setIsOpen(!isOpen)}
                    className="input-modern min-h-[42px] flex flex-wrap gap-1.5 p-2 pr-10 cursor-pointer"
                >
                    {selectedIds.length === 0 ? (
                        <span className="text-slate-400 text-[11px] font-medium italic mt-1 ml-1">Pilih atau upload surat...</span>
                    ) : (
                        selectedIds.map((id: string) => {
                            const surat = suratList.find((s: any) => s.id.toString() === id.toString());
                            return (
                                <div key={id} className="flex items-center gap-1.5 bg-indigo-50 text-indigo-600 px-2 py-1 rounded-lg border border-indigo-100 group">
                                    <span className="text-[10px] font-bold truncate max-w-[150px]">{surat?.nama_file || 'Memuat...'}</span>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); onChange(selectedIds.filter((sid: string) => sid !== id)); }}
                                        className="hover:text-red-500 transition-colors"
                                    >
                                        <X size={10} />
                                    </button>
                                </div>
                            );
                        })
                    )}
                    <div className="absolute right-3 top-3 text-slate-400">
                        <ChevronDown size={14} className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
                    </div>
                </div>

                {isOpen && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 p-2 z-[2100] animate-in slide-in-from-top-2 duration-200">
                        <div className="relative mb-2">
                            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input 
                                type="text" 
                                placeholder="Cari surat..." 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-slate-50 border-none rounded-xl pl-9 pr-4 py-2 text-[11px] font-medium outline-none focus:ring-2 focus:ring-indigo-500/10"
                                autoFocus
                            />
                        </div>
                        <div className="max-h-[200px] overflow-y-auto custom-scrollbar flex flex-col gap-0.5">
                            {filteredSurat.length === 0 ? (
                                <div className="p-4 text-center text-[10px] font-medium text-slate-400 italic">Tidak ada surat ditemukan</div>
                            ) : (
                                filteredSurat.map((surat: any) => {
                                    const isSelected = selectedIds.includes(surat.id.toString());
                                    return (
                                        <button
                                            key={surat.id}
                                            onClick={() => {
                                                const idStr = surat.id.toString();
                                                onChange(isSelected ? selectedIds.filter((sid: string) => sid !== idStr) : [...selectedIds, idStr]);
                                            }}
                                            className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all ${isSelected ? 'bg-indigo-50 text-indigo-600' : 'hover:bg-slate-50 text-slate-600'}`}
                                        >
                                            <div className="flex flex-col gap-0.5">
                                                <div className="text-[11px] font-bold line-clamp-1">{surat.nama_file}</div>
                                                <div className="text-[9px] opacity-60">Diunggah: {new Date(surat.uploaded_at).toLocaleDateString('id-ID')}</div>
                                            </div>
                                            {isSelected && <div className="w-4 h-4 rounded-full bg-indigo-500 flex items-center justify-center text-white"><Check size={10} /></div>}
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
});

// Isolated Textarea for High-Performance typing (prevents whole table re-render on keystroke)
const IsolatedTextarea = React.memo(({ value, onChange, placeholder, label }: { value: string, onChange: (val: string) => void, placeholder?: string, label: string }) => {
    const [localValue, setLocalValue] = useState(value);
    
    // Reset local value if parent value changes (e.g. modal closed/opened)
    useEffect(() => {
        setLocalValue(value || '');
    }, [value]);

    return (
        <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{label}</label>
            <textarea
                value={localValue}
                onChange={(e) => setLocalValue(e.target.value)}
                onBlur={() => {
                    if (localValue !== value) onChange(localValue);
                }}
                placeholder={placeholder}
                className="input-modern min-h-[100px] resize-none text-[12px] font-medium text-slate-600 border-slate-200/60"
            />
            <p className="text-[9px] font-bold text-slate-400 leading-none px-1 italic">Tersimpan otomatis saat Anda meninggalkan kotak ini.</p>
        </div>
    );
});

// Memoized Helper Components for Performance
const MonthlyRow = React.memo(({
    p, daysInMonth, year, month, holidays, tDay, tMonth, tYear,
    flatActivityTypes, activityTypes, suratList,
    canEdit,
    handleSelectActivity, setMeetingSelection,
    isSummaryExpanded
}: any) => {
    const { monthTotals, grandTotal } = p;

    return (
        <tbody className="hover-group border-b border-slate-50">
            <tr className="hover-row">
                <td rowSpan={2} className="name-cell p-3 py-2 sticky left-0 z-[150] bg-white border-b border-slate-50 border-r border-slate-100 w-32 sm:w-40">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-ppm-slate/5 flex items-center justify-center text-ppm-slate shrink-0">
                            <User size={12} />
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="text-[11px] font-bold text-slate-800 line-clamp-1 leading-tight">{p.nama_lengkap}</div>
                            <div className="text-[9px] font-medium text-slate-400 uppercase tracking-tight truncate">{p.jabatan || '-'}</div>
                        </div>
                    </div>
                </td>
                <td className="sticky-col p-1 text-[8px] font-black text-slate-400 sticky left-32 sm:left-40 z-10 bg-white text-center border-b border-slate-50 border-r border-slate-100 w-9 sm:w-11">PAGI</td>
                {[...Array(daysInMonth)].map((_, i) => {
                    const day = i + 1;
                    const activities: any[] = p.activities?.[day]?.Pagi || [];
                    const mainAct = activities[0];
                    const type = mainAct ? flatActivityTypes.find((t: any) => t.kode === mainAct.tipe) : null;
                    const date = new Date(year, month - 1, day);
                    const isWeekend = [0, 6].includes(date.getDay());
                    const holiday = holidays.find((h: any) => {
                        const hDate = new Date(h.tanggal);
                        return hDate.getDate() === day && hDate.getMonth() + 1 === month && hDate.getFullYear() === year;
                    });
                    const isHoliday = !!holiday;
                    const isToday = day === tDay && month === tMonth && year === tYear;

                    return (
                        <td
                            key={`pagi-${i}`}
                            data-day={day}
                            data-session="Pagi"
                            data-profil-id={p.profil_id}
                            className={`activity-day-cell p-0 text-center relative group activity-cell border-b border-slate-50 border-r border-slate-100/80 ${(isWeekend || isHoliday) ? 'bg-red-200/40' : ''} ${isToday ? 'bg-indigo-50/30' : ''} cursor-pointer`}
                            title={holiday?.keterangan || (isWeekend ? 'Weekend' : '')}
                        >
                            {isToday && <div className="absolute inset-y-0 left-0 w-[2px] bg-indigo-500/50 z-10 pointer-events-none"></div>}
                            <div
                                className={`w-full h-7 flex items-center justify-center text-[9px] font-black border-r border-slate-100/80 ${activities.length > 1 ? 'bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white shadow-md' : type ? `${type.warna || 'bg-ppm-slate'} ${type.warna_teks || 'text-white'} shadow-sm active:scale-90` : (isWeekend || isHoliday) ? 'text-red-100' : 'text-slate-200'} ${!type && canEdit ? 'cursor-pointer' : ''}`}
                            >
                                {activities.length > 0 ? (activities.length > 1 ? `(${activities.length})` : mainAct.tipe) : (isWeekend ? '✕' : '+')}
                            </div>
                            <CellTooltip activities={activities} nama={p.nama_lengkap} session="Pagi" day={day} suratList={suratList} />
                        </td>
                    );
                })}
                <td rowSpan={2} className="shared-cell w-1.5 bg-slate-50 border-l border-slate-200 border-b border-slate-50"></td>
                <td rowSpan={2} className="shared-cell w-6 bg-slate-50/30 border-b border-slate-50 border-r border-slate-100/50"></td>
                {isSummaryExpanded && flatActivityTypes.filter(t => !t.children || t.children.length === 0).map((t: any) => (
                    <td key={t.kode} rowSpan={2} className="shared-cell sticky-col p-1 text-center text-[10px] font-black text-slate-600 bg-slate-100/10 border-b border-slate-50 border-r border-slate-100/80">{monthTotals[t.kode] || ''}</td>
                ))}
                <td rowSpan={2} className="shared-cell sticky-col p-1 text-center text-[10px] font-black text-emerald-600 bg-emerald-50/20 border-b border-slate-50 border-r border-slate-100/80 text-emerald-600">{grandTotal || ''}</td>
            </tr>
            <tr className="hover-row">
                <td className="sticky-col p-1 text-[8px] font-black text-slate-400 sticky left-32 sm:left-40 z-10 bg-white text-center border-b border-slate-50 border-r border-slate-100 w-9 sm:w-11">SIANG</td>
                {[...Array(daysInMonth)].map((_, i) => {
                    const day = i + 1;
                    const activities: any[] = p.activities?.[day]?.Siang || [];
                    const mainAct = activities[0];
                    const type = mainAct ? flatActivityTypes.find((t: any) => t.kode === mainAct.tipe) : null;
                    const date = new Date(year, month - 1, day);
                    const isWeekend = [0, 6].includes(date.getDay());
                    const holiday = holidays.find((h: any) => {
                        const hDate = new Date(h.tanggal);
                        return hDate.getDate() === day && hDate.getMonth() + 1 === month && hDate.getFullYear() === year;
                    });
                    const isHoliday = !!holiday;
                    const isToday = day === tDay && month === tMonth && year === tYear;

                    return (
                        <td
                            key={`siang-${i}`}
                            data-day={day}
                            data-session="Siang"
                            data-profil-id={p.profil_id}
                            className={`activity-day-cell p-0 text-center relative group activity-cell border-b border-slate-50 border-r border-slate-100/80 ${(isWeekend || isHoliday) ? 'bg-red-200/40' : ''} ${isToday ? 'bg-indigo-50/30' : ''} ${activities.length > 0 || canEdit ? 'cursor-pointer' : ''}`}
                            title={holiday?.keterangan || (isWeekend ? 'Weekend' : '')}
                        >
                            {isToday && <div className="absolute inset-y-0 left-0 w-[2px] bg-indigo-500/50 z-10 pointer-events-none"></div>}
                            <div
                                className={`w-full h-7 flex items-center justify-center text-[9px] font-black border-r border-slate-100/80 ${activities.length > 1 ? 'bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white shadow-md' : type ? `${type.warna || 'bg-ppm-slate'} ${type.warna_teks || 'text-white'} shadow-sm active:scale-90` : (isWeekend || isHoliday) ? 'text-red-100' : 'text-slate-200'} ${!type && canEdit ? 'cursor-pointer' : ''}`}
                            >
                                {activities.length > 0 ? (activities.length > 1 ? `(${activities.length})` : mainAct.tipe) : (isWeekend ? '✕' : '+')}
                            </div>
                            <CellTooltip activities={activities} nama={p.nama_lengkap} session="Siang" day={day} suratList={suratList} />
                        </td>
                    );
                })}
            </tr>
        </tbody>
    );
});

const YearlyRow = React.memo(({ p, activityTypes, canEdit, isSummaryExpanded }: any) => {
    return (
        <tr className="hover:bg-slate-50/50 transition-colors">
            <td className="p-4 py-3 sticky left-0 z-10 bg-white border-b border-slate-50 border-r border-slate-100 transition-colors">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-ppm-slate/5 flex items-center justify-center text-ppm-slate shrink-0"><User size={14} /></div>
                    <div>
                        <div className="text-sm font-bold text-slate-800">{p.nama_lengkap}</div>
                        <div className="text-[10px] font-medium text-slate-400 uppercase tracking-tight">{p.bidang_singkatan || 'Bapperida'}</div>
                    </div>
                </div>
            </td>
            {isSummaryExpanded && activityTypes.filter((t: any) => !t.parent_id).map((t: any) => (
                <td key={t.kode} className="p-4 text-center text-sm font-bold text-slate-700 border-b border-slate-50 border-r border-slate-100/80">
                    {p.monthTotals?.[t.kode] || 0}
                </td>
            ))}
            <td className="p-4 text-center text-sm font-black text-ppm-slate bg-slate-50/50 border-b border-slate-50">
                {p.grandTotal || 0}
            </td>
        </tr>
    );
});


const MonthlyTableContent = React.memo(({
    daysInMonth, month, year, holidays, tDay, tMonth, tYear,
    activityTypes, flatActivityTypes, hierarchicalActivityTypes, filteredData, canEdit,
    handleDownloadPDF, handleToggleHoliday, handleTableClick,
    handleBodyScroll, handleTableMouseMove, handleTableMouseLeave,
    handleSelectActivity, setMeetingSelection, suratList,
    monthlyHeaderRef, monthlyTableRef, colOverlayRef, activeCellOverlayRef,
    headerHeight, dayNamesShort,
    isSummaryExpanded, setIsSummaryExpanded
}: any) => {
    return (
        <div className="space-y-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-2">
                <div className="flex items-center gap-3">
                    <div className="bg-emerald-50/50 p-2 rounded-xl border border-emerald-100/50 group-hover:bg-emerald-50 transition-colors">
                        <Calendar size={18} className="text-emerald-600" />
                    </div>
                    <div>
                        <h3 className="text-sm font-black text-slate-800 tracking-tight">Rekap Bulanan</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-1">Akumulasi kegiatan per status</p>
                    </div>
                </div>

                {/* Legend and PDF Button - NOT STICKY */}
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex flex-wrap items-center gap-2 p-1.5 px-3 bg-slate-50/80 rounded-xl border border-slate-100">
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mr-1">Legenda:</span>
                        {flatActivityTypes
                            .filter((t: any) => !t.children || t.children.length === 0)
                            .map((t: any) => (
                            <div key={t.kode} className="relative flex items-center gap-1.5 px-1.5 py-0.5 rounded-lg hover:bg-white transition-colors cursor-help group">
                                <div className={`w-1.5 h-1.5 rounded-full ${t.warna} shadow-sm group-hover:scale-125 transition-transform`}></div>
                                <span className="text-[9px] font-black text-slate-600 uppercase mb-0.5">{t.kode}</span>
                                <span className="text-[8px] font-bold text-slate-400 capitalize hidden xl:inline">{t.nama}</span>
                                
                                {/* Tooltip */}
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 bg-slate-800 text-white text-[9px] font-bold rounded-lg opacity-0 group-hover:opacity-100 transition-all pointer-events-none whitespace-nowrap shadow-xl translate-y-1 group-hover:translate-y-0 z-[600]">
                                    {t.deskripsi || t.nama}
                                    <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-800"></div>
                                </div>
                            </div>
                        ))}
                    </div>
                    <button
                        onClick={() => handleDownloadPDF('monthly')}
                        className="flex items-center gap-2 px-4 py-2 bg-ppm-slate hover:bg-slate-800 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md shadow-ppm-slate/10 transition-all active:scale-95"
                    >
                        <Download size={14} /> PDF
                    </button>
                </div>
            </div>

            <div 
                ref={monthlyHeaderRef}
                className="overflow-hidden sticky z-[450] bg-white transition-all duration-300"
                style={{ top: headerHeight }}
            >
                <table className="w-full text-left border-separate border-spacing-0 table-fixed bg-white border-x border-slate-100/60">
                    <colgroup>
                        <col className="w-32 sm:w-40" />
                        <col className="w-9 sm:w-11" />
                        {[...Array(daysInMonth)].map((_, i) => <col key={i} className="w-8" />)}
                        <col className="w-1.5" />
                        <col className="w-6" />
                        {isSummaryExpanded && flatActivityTypes.filter(t => !t.children || t.children.length === 0).map((t: any) => <col key={t.kode} className="w-9" />)}
                        <col className="w-10" />
                    </colgroup>
                    <thead>
                        <tr className="bg-slate-50 divide-x divide-slate-200/60 shadow-sm border-t border-slate-100">
                            <th className="p-3 text-[9px] font-black text-slate-400 uppercase tracking-widest sticky !left-0 bg-white z-[135] border-b border-t border-slate-100 shadow-[0_1px_0_rgba(0,0,0,0.05)]">
                                Nama Pegawai
                            </th>
                            <th className="p-1 text-[9px] font-black text-slate-400 uppercase tracking-widest sticky !left-32 sm:!left-40 bg-white z-[135] text-center border-b border-t border-slate-100 border-r border-slate-100 shadow-[0_1px_0_rgba(0,0,0,0.05)]">
                                Sesi
                            </th>
                            {[...Array(daysInMonth)].map((_, i) => {
                                const day = i + 1;
                                const date = new Date(year, month - 1, day);
                                const isWeekend = [0, 6].includes(date.getDay());
                                const holiday = holidays.find((h: any) => {
                                    const hDate = new Date(h.tanggal);
                                    return hDate.getDate() === day && hDate.getMonth() + 1 === month && hDate.getFullYear() === year;
                                });
                                const isHoliday = !!holiday;
                                const isToday = day === tDay && month === tMonth && year === tYear;

                                return (
                                    <th
                                        key={i}
                                        onClick={() => canEdit && handleToggleHoliday(day)}
                                        title={holiday?.keterangan || (isWeekend ? 'Weekend' : '')}
                                        className={`p-1 text-center text-[9px] font-black w-8 cursor-pointer transition-colors border-b border-t border-slate-100 border-r border-slate-100/80 shadow-[0_1px_0_rgba(0,0,0,0.05)] sticky top-0 z-[145]
                                            ${(isWeekend || isHoliday) ? 'text-red-600 bg-red-50 hover:bg-red-100' : 'text-slate-400 bg-white hover:bg-slate-50'}
                                            ${isToday ? 'ring-2 ring-indigo-500 ring-inset bg-indigo-50 shadow-sm' : ''}
                                        `}
                                    >
                                        <div className="text-[7.5px] opacity-70 mb-0.5">{dayNamesShort[date.getDay()]}</div>
                                        <div>{String(day).padStart(2, '0')}</div>
                                    </th>
                                );
                            })}
                            <th className="w-1.5 bg-white border-b border-t border-slate-100 shadow-[0_1px_0_rgba(0,0,0,0.05)]"></th>
                            <th className="w-6 bg-slate-50 border-b border-t border-slate-100 shadow-[0_1px_0_rgba(0,0,0,0.05)]">
                                <button
                                    onClick={(e) => { e.stopPropagation(); setIsSummaryExpanded(!isSummaryExpanded); }}
                                    className="w-5 h-5 flex items-center justify-center rounded-lg hover:bg-white text-slate-400 hover:text-indigo-500 transition-all border border-transparent hover:border-indigo-100 mx-auto"
                                    title={isSummaryExpanded ? "Sembunyikan Rekap" : "Tampilkan Rekap Detail"}
                                >
                                    {isSummaryExpanded ? <ChevronLeft size={12} /> : <ChevronRight size={12} />}
                                </button>
                            </th>
                            {isSummaryExpanded && flatActivityTypes.filter(t => !t.children || t.children.length === 0).map((t: any) => (
                                <th key={t.kode} className="p-1 text-center text-[9px] font-black text-slate-400 uppercase tracking-widest w-9 bg-white border-b border-t border-slate-100 shadow-[0_1px_0_rgba(0,0,0,0.05)]">{t.kode}</th>
                            ))}
                            <th className="p-1 text-center text-[9px] font-black text-slate-800 uppercase tracking-widest w-10 bg-slate-100 border-b border-t border-slate-100 shadow-[0_1px_0_rgba(0,0,0,0.05)]">T</th>
                        </tr>
                    </thead>
                </table>
            </div>

            {/* 2. Body Container - Scrollable horizontal only */}
            <div
                ref={monthlyTableRef}
                onClick={handleTableClick}
                onScroll={(e) => handleBodyScroll(e, monthlyHeaderRef)}
                onMouseOver={handleTableMouseMove}
                onMouseLeave={handleTableMouseLeave}
                className="overflow-x-auto hover-table-container custom-scrollbar-horizontal pb-4 relative"
            >
                {/* Single column highlight overlay — 1 element instead of hundreds */}
                <div
                    ref={colOverlayRef}
                    style={{
                        display: 'none',
                        position: 'absolute',
                        top: 0,
                        bottom: 0,
                        pointerEvents: 'none',
                        backgroundColor: 'var(--theme-sage)',
                        opacity: 0.4,
                        zIndex: 0, // Ensure it's below any text/sticky elements
                        willChange: 'left, width'
                    }}
                />
                {/* Active cell indicator overlay — instant visual feedback */}
                <div
                    ref={activeCellOverlayRef}
                    style={{
                        display: 'none',
                        position: 'absolute',
                        pointerEvents: 'none',
                        border: '2px solid #6366f1',
                        borderRadius: '4px',
                        zIndex: 5, // Above normal cells but below sticky headers if needed
                        boxShadow: '0 0 0 4px rgba(99, 102, 241, 0.1)'
                    }}
                />

                <table className="w-full text-left border-separate border-spacing-0 table-fixed bg-white border-x border-slate-100/60">
                    <colgroup>
                        <col className="w-32 sm:w-40" />
                        <col className="w-9 sm:w-11" />
                        {[...Array(daysInMonth)].map((_, i) => <col key={i} className="w-8" />)}
                        <col className="w-1.5" />
                        <col className="w-6" />
                        {isSummaryExpanded && flatActivityTypes.filter(t => !t.children || t.children.length === 0).map((t: any) => <col key={t.kode} className="w-9" />)}
                        <col className="w-10" />
                    </colgroup>
                    {filteredData.map((p: any) => (
                        <MonthlyRow
                            key={p.profil_id}
                            p={p}
                            daysInMonth={daysInMonth}
                            year={year}
                            month={month}
                            holidays={holidays}
                            tDay={tDay}
                            tMonth={tMonth}
                            tYear={tYear}
                            flatActivityTypes={flatActivityTypes}
                            activityTypes={activityTypes}
                            suratList={suratList}
                            canEdit={canEdit}
                            handleSelectActivity={handleSelectActivity}
                            setMeetingSelection={setMeetingSelection}
                            isSummaryExpanded={isSummaryExpanded}
                        />
                    ))}
                </table>
            </div>
        </div>
    );
});

export default function KegiatanPerOrang() {
    const [isSummaryExpanded, setIsSummaryExpanded] = useState(false);
    const { user } = useAuth();
    const [view, setView] = useState<'monthly' | 'yearly'>('monthly');
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [year, setYear] = useState(new Date().getFullYear());
    const [bidangId, setBidangId] = useState<string>('all');
    const [data, setData] = useState<any[]>([]);
    const [instansiList, setInstansiList] = useState<any[]>([]);
    const [selectedInstansi, setSelectedInstansi] = useState<number | null>(null);
    const [bidangList, setBidangList] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [activeCell, setActiveCell] = useState<{ profil_id: number; day: number; session: 'Pagi' | 'Siang'; rect?: DOMRect; activities?: any[] } | null>(null);
    const [rangeSelection, setRangeSelection] = useState<{ profil_id: number; startDay: number; endDay: number; tipe_kegiatan: string; keterangan: string; selectedProfilIds: number[]; suratIds?: string[] } | null>(null);
    const [meetingSelection, setMeetingSelection] = useState<{ profil_id: number; day: number; session: 'Pagi' | 'Siang'; tipe_kegiatan: string; pagi: boolean; siang: boolean; keterangan: string; selectedProfilIds: number[]; activityId?: string; activityNama?: string; suratIds?: string[] } | null>(null);
    const [suratList, setSuratList] = useState<any[]>([]);
    const [holidays, setHolidays] = useState<any[]>([]);
    const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
    const [activityTypes, setActivityTypes] = useState<ActivityType[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [masterDokumenList, setMasterDokumenList] = useState<any[]>([]);
    const [holidayPrompt, setHolidayPrompt] = useState<{ day: number; tanggal: string; duration: number; keterangan: string } | null>(null);
    const [holidayOptions, setHolidayOptions] = useState<{ day: number; tanggal: string; keterangan: string } | null>(null);
    const menuHideTimeoutRef = useRef<number | null>(null);


    const monthlyHeaderRef = useRef<HTMLDivElement>(null);
    const monthlyTableRef = useRef<HTMLDivElement>(null);
    // INFRASTRUKTUR SELUNCUR: Menggunakan elemen tunggal di luar React Tree (Imperatif)
    const colOverlayRef = useRef<HTMLDivElement>(null);
    const activeCellOverlayRef = useRef<HTMLDivElement>(null);
    const lastHoveredCellKeyRef = useRef<string | null>(null);
    const lastHoveredTooltipRef = useRef<HTMLElement | null>(null); // Single active tooltip tracker
    const hideTimeoutRef = useRef<number | null>(null);
    const yearlyHeaderRef = useRef<HTMLDivElement>(null);
    const yearlyTableRef = useRef<HTMLDivElement>(null);
    const printableReportRef = useRef<HTMLDivElement>(null);
    const stickyHeaderRef = useRef<HTMLDivElement>(null);
    const [headerHeight, setHeaderHeight] = useState(70);

    const hierarchicalActivityTypes = useMemo(() => {
        const build = (parentId: number | null): any[] => {
            return activityTypes
                .filter(t => t.parent_id === parentId)
                .map(t => ({
                    ...t,
                    children: build(t.id).sort((a, b) => {
                        if (a.nama.toLowerCase().includes('offline')) return -1;
                        if (b.nama.toLowerCase().includes('offline')) return 1;
                        return a.nama.localeCompare(b.nama);
                    })
                }));
        };
        const items = build(null);
        const order = ['C', 'S', 'DL', 'DLB', 'RM', 'RLB'];
        return items.sort((a, b) => {
            const idxA = order.indexOf(a.kode);
            const idxB = order.indexOf(b.kode);
            if (idxA === -1 && idxB === -1) return 0;
            if (idxA === -1) return 1;
            if (idxB === -1) return -1;
            return idxA - idxB;
        });
    }, [activityTypes]);

    const flatActivityTypes = useMemo(() => {
        const flat: ActivityType[] = [];
        const flatten = (items: any[]) => {
            items.forEach(item => {
                flat.push(item);
                if (item.children) flatten(item.children);
            });
        };
        flatten(hierarchicalActivityTypes);
        return flat;
    }, [hierarchicalActivityTypes]);

    // Pre-calculate totals for all employees
    const processedData = useMemo(() => {
        return data.map(p => {
            if (!p.activities) return { ...p, monthTotals: {}, grandTotal: 0 };

            const monthTotals: any = activityTypes.reduce((acc, t) => ({ ...acc, [t.kode]: 0 }), {});
            let grandTotal = 0;

            Object.entries(p.activities || {}).forEach(([day, dayData]: any) => {
                ['Pagi', 'Siang'].forEach(session => {
                    const sessionActivities: any[] = dayData[session] || [];
                    sessionActivities.forEach((act: any) => {
                        const typeDef = activityTypes.find(t => t.kode === act.tipe || (act.tipe && t.children?.some((s: any) => s.kode === act.tipe)));
                        const baseKey = typeDef?.kode || act.tipe;

                        if (typeDef?.is_rapat) {
                            // Rapat logic handled separately below
                        } else if (monthTotals[baseKey] !== undefined) {
                            monthTotals[baseKey] += 0.5;
                            grandTotal += 0.5;
                        }
                    });
                });

                // Special handling for Rapat: Count distinct internal meeting IDs across both sessions
                const allDayActs: any[] = [...(dayData.Pagi || []), ...(dayData.Siang || [])];
                hierarchicalActivityTypes.filter(t => t.is_rapat).forEach(rapatType => {
                    const meetingIds = new Set(
                        allDayActs
                            .filter(a => a.tipe === rapatType.kode || rapatType.children?.some((s: any) => s.kode === a.tipe))
                            .map(a => a.id_eksternal)
                    );
                    monthTotals[rapatType.kode] += meetingIds.size;
                    grandTotal += meetingIds.size;
                });
            });

            return { ...p, monthTotals, grandTotal };
        });
    }, [data, activityTypes, hierarchicalActivityTypes]);

    // Handle table click with delegation — zero re-renders of rows on click
    const handleTableClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        // Toggle/close menu if clicking already active or background
        const td = (e.target as HTMLElement).closest('td[data-day][data-session][data-profil-id]') as HTMLElement | null;
        if (!td) {
            setActiveCell(null);
            if (activeCellOverlayRef.current) activeCellOverlayRef.current.style.display = 'none';
            return;
        }

        const day = parseInt(td.getAttribute('data-day') || '0');
        const session = td.getAttribute('data-session') as 'Pagi' | 'Siang';
        const profilId = parseInt(td.getAttribute('data-profil-id') || '0');
        const rect = td.getBoundingClientRect();

        // Update indicator overlay (visual feedback instantly via imperative DOM)
        const overlay = activeCellOverlayRef.current;
        if (overlay) {
            overlay.style.left = td.offsetLeft + 'px';
            overlay.style.top = td.offsetTop + 'px';
            overlay.style.width = td.offsetWidth + 'px';
            overlay.style.height = td.offsetHeight + 'px';
            overlay.style.display = 'block';
        }

        // Find activities from memoized processedData
        const personData = processedData.find(p => p.profil_id === profilId);
        const activities = personData?.activities?.[day]?.[session] || [];

        // Hide active tooltip when cell is clicked to prevent overlap
        if (lastHoveredTooltipRef.current) {
            lastHoveredTooltipRef.current.style.display = 'none';
            lastHoveredTooltipRef.current = null;
        }
        if (hideTimeoutRef.current) {
            clearTimeout(hideTimeoutRef.current);
            hideTimeoutRef.current = null;
        }

        // AUTO-HIDE MENU: Start 2s delay specifically for the menu if not entered
        if (menuHideTimeoutRef.current) clearTimeout(menuHideTimeoutRef.current);
        menuHideTimeoutRef.current = window.setTimeout(() => {
            setActiveCell(null);
            if (activeCellOverlayRef.current) activeCellOverlayRef.current.style.display = 'none';
        }, 2000);

        setActiveCell({ profil_id: profilId, day, session, rect, activities });
    }, [processedData]);

    // Dynamic header height measurement
    useEffect(() => {
        const updateHeight = () => {
            if (stickyHeaderRef.current) {
                setHeaderHeight(stickyHeaderRef.current.offsetHeight);
            }
        };
        updateHeight();
        // Also update height when view changes
        const timer = setTimeout(updateHeight, 100);
        window.addEventListener('resize', updateHeight);
        return () => {
            window.removeEventListener('resize', updateHeight);
            clearTimeout(timer);
        };
    }, [view, isMonthPickerOpen]);

    // Scroll synchronization logic
    const handleBodyScroll = useCallback((e: React.UIEvent<HTMLDivElement>, headerRef: React.RefObject<HTMLDivElement>) => {
        if (headerRef.current) {
            headerRef.current.scrollLeft = e.currentTarget.scrollLeft;
        }
    }, []);

    /** 
     * PERFORMANCE CRITICAL: HIGH-SPEED NAVIGATION
     * -------------------------------------------
     * PERINGATAN: Jangan ubah logika ini menjadi React State untuk highlight.
     * Kita menggunakan Imperative DOM Manipulation (Overlay Tunggal) untuk menjaga
     * efisiensi RAM/CPU agar tetap 'ringan' saat berseluncur di ribuan sel.
     */
    const handleTableMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        try {
            // INTERACTIVE ZONE: Jika kursor berada di atas kartu tooltip, jangan hilangkan tooltip
            const target = e.target as HTMLElement;
            if (!target || typeof target.closest !== 'function') return;
            
            if (target.closest('.cell-tooltip')) {
                if (hideTimeoutRef.current) {
                    clearTimeout(hideTimeoutRef.current);
                    hideTimeoutRef.current = null;
                }
                return;
            }

            // X-RAY LOGIC: Deteksi sel di bawah kursor
            const elements = document.elementsFromPoint(e.clientX, e.clientY);
            if (!elements || elements.length === 0) return;

            const td = Array.from(elements)
                .filter(el => {
                    const element = el as HTMLElement;
                    if (!element || typeof element.closest !== 'function') return false;
                    const isTooltip = element.classList?.contains?.('cell-tooltip') || !!element.closest?.('.cell-tooltip');
                    return !isTooltip;
                })
                .find(el => (el as HTMLElement).closest?.('td[data-day]'))
                ?.closest?.('td[data-day]') as HTMLElement | null;

            const overlay = colOverlayRef.current;
            if (!overlay || !td) {
                // If moving to empty area within table but not over a valid cell
                if (!hideTimeoutRef.current) {
                    hideTimeoutRef.current = window.setTimeout(() => {
                        if (lastHoveredTooltipRef.current) {
                            lastHoveredTooltipRef.current.style.display = 'none';
                            lastHoveredTooltipRef.current = null;
                        }
                    }, 2000);
                }
                return;
            }

            const day = td.getAttribute?.('data-day');
            const profilId = td.getAttribute?.('data-profil-id');
            if (!day || !profilId) return;

            const cellKey = `${profilId}_${day}`;
            if (cellKey === lastHoveredCellKeyRef.current) {
                // Same cell: Clear any pending hide timeout
                if (hideTimeoutRef.current) {
                    clearTimeout(hideTimeoutRef.current);
                    hideTimeoutRef.current = null;
                }
                return;
            }

            // Position components based on cell rect
            const cellTooltip = td.querySelector('.cell-tooltip') as HTMLElement | null;

            // IF MOVING TO A NEW CELL: Clear timeout
            if (hideTimeoutRef.current) {
                clearTimeout(hideTimeoutRef.current);
                hideTimeoutRef.current = null;
            }

            // INSTANT SWITCH: Sembunyikan tooltip lama SECARA INSTAN hanya jika masuk ke cell BARU yang JUGA memiliki isi (cellTooltip ada).
            // Jika masuk ke cell kosong, tooltip lama dibiarkan tetap muncul selama jeda 2 detik (diatur di bagian bawah).
            if (lastHoveredTooltipRef.current && cellTooltip && lastHoveredTooltipRef.current !== cellTooltip) {
                lastHoveredTooltipRef.current.style.display = 'none';
                lastHoveredTooltipRef.current = null;
            }

            // Imperatively move column overlay (zero style recalculation)
            const table = monthlyTableRef.current?.querySelector('table');
            overlay.style.left = (td.offsetLeft || 0) + 'px';
            overlay.style.width = (td.offsetWidth || 0) + 'px';
            overlay.style.top = '0px';
            overlay.style.height = (table?.offsetHeight || 500) + 'px';
            overlay.style.display = 'block';

            if (cellTooltip && cellTooltip.style) {
                const rect = td.getBoundingClientRect();
                if (rect.left === 0 && rect.top === 0) return;

                const tooltipWidth = 280; 
                let leftPos = rect.left + rect.width / 2 - (tooltipWidth / 2);
                if (leftPos < 20) leftPos = 20;
                if (leftPos + tooltipWidth > window.innerWidth - 20) leftPos = window.innerWidth - tooltipWidth - 20;

                const estimatedHeight = 320;
                const spaceAbove = rect.top;
                const spaceBelow = window.innerHeight - rect.bottom;

                let topPos, transform;
                if (spaceAbove < estimatedHeight && spaceBelow > spaceAbove) {
                    topPos = (rect.bottom + 12) + 'px';
                    transform = 'translateY(0)';
                } else {
                    topPos = (rect.top - 12) + 'px';
                    transform = 'translateY(-100%)';
                }

                cellTooltip.style.left = leftPos + 'px';
                cellTooltip.style.top = topPos;
                cellTooltip.style.transform = transform;
                cellTooltip.style.display = 'flex';
                
                lastHoveredTooltipRef.current = cellTooltip;
                lastHoveredCellKeyRef.current = cellKey;
            } else {
                // Empty cell: Start hide timeout for the current active tooltip
                lastHoveredCellKeyRef.current = cellKey;
                if (!hideTimeoutRef.current && lastHoveredTooltipRef.current) {
                    hideTimeoutRef.current = window.setTimeout(() => {
                        if (lastHoveredTooltipRef.current) {
                            lastHoveredTooltipRef.current.style.display = 'none';
                            lastHoveredTooltipRef.current = null;
                        }
                        hideTimeoutRef.current = null;
                    }, 2000);
                }
            }
        } catch (err) {
            console.error('Tooltip Tracking Error:', err);
        }
    }, []);

    const handleTableMouseLeave = useCallback(() => {
        lastHoveredCellKeyRef.current = null;
        if (colOverlayRef.current) colOverlayRef.current.style.display = 'none';
        
        // Start 2s delay instead of immediate hide
        if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
        hideTimeoutRef.current = window.setTimeout(() => {
            if (lastHoveredTooltipRef.current) {
                lastHoveredTooltipRef.current.style.display = 'none';
                lastHoveredTooltipRef.current = null;
            }
        }, 2000);
    }, []);



    const isSuperAdmin = user?.tipe_user_id === 1;
    const isAdminInstansi = user?.tipe_user_id === 2;
    const canChangeBidang = isSuperAdmin || isAdminInstansi;


    const filteredData = useMemo(() => {
        if (!searchTerm) return processedData;
        const lowerSearch = searchTerm.toLowerCase();
        return processedData.filter(p => 
            p.nama_lengkap.toLowerCase().includes(lowerSearch)
        );
    }, [processedData, searchTerm]);

    // Roles: Super Admin (1), Admin Bidang (4), Kepala Bidang (6)
    const canEdit = [1, 4, 6].includes(user?.tipe_user_id || 0);

    const monthNames = [
        "Januari", "Februari", "Maret", "April", "Mei", "Juni",
        "Juli", "Agustus", "September", "Oktober", "November", "Desember"
    ];

    const dayNamesShort = ["M", "S", "S", "R", "K", "J", "S"];

    const handleDownloadPDF = async (type: 'monthly' | 'yearly') => {
        const element = printableReportRef.current;
        if (!element) return;

        try {
            // Stay visible long enough for high-res capture
            await new Promise(resolve => setTimeout(resolve, 600));

            const dataUrl = await toPng(element, {
                quality: 1.0,
                backgroundColor: '#ffffff',
                pixelRatio: 2
            });

            // F4 Size: 210mm x 330mm
            // Landscape: [width, height] = [330, 210]
            const pdf = new jsPDF({
                orientation: 'landscape',
                unit: 'mm',
                format: [330, 210]
            });

            // Calculate margins and available space
            const marginHorizontal = 10;
            const marginVertical = 10;
            const pageWidth = 330;
            const pageHeight = 210;
            const maxWidth = pageWidth - (marginHorizontal * 2);
            const maxHeight = pageHeight - (marginVertical * 2);

            // Calculate scaling to fit BOTH width and height
            const elementRatio = element.offsetWidth / element.offsetHeight;
            const targetRatio = maxWidth / maxHeight;

            let finalWidth, finalHeight;

            if (elementRatio > targetRatio) {
                // Element is wider than target area (constrained by width)
                finalWidth = maxWidth;
                finalHeight = finalWidth / elementRatio;
            } else {
                // Element is taller than target area (constrained by height)
                finalHeight = maxHeight;
                finalWidth = finalHeight * elementRatio;
            }

            // Center the content on the page
            const x = (pageWidth - finalWidth) / 2;
            const y = (pageHeight - finalHeight) / 2;

            pdf.addImage(dataUrl, 'PNG', x, y, finalWidth, finalHeight);
            pdf.save(`rekap-${type}-${year}${type === 'monthly' ? `-${month}` : ''}.pdf`);
        } catch (error) {
            console.error('Error generating PDF:', error);
            alert('Gagal mengunduh PDF. Silakan coba lagi.');
        }
    };

    // Click outside handler for dropdowns
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (activeCell && !target.closest('.activity-cell-active') && !target.closest('.activity-portal-menu')) {
                setActiveCell(null);
            }
            if (isMonthPickerOpen && !target.closest('.month-picker-container')) {
                setIsMonthPickerOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [activeCell, isMonthPickerOpen]);

    // Sync user profile to filters once loaded
    useEffect(() => {
        if (user) {
            setSelectedInstansi(prev => prev === null ? user.instansi_id : prev);
            if (user.bidang_id) {
                setBidangId(prev => (prev === 'all' || prev === 'undefined') ? user.bidang_id.toString() : prev);
            }
        }
    }, [user]);

    useEffect(() => {
        if (isSuperAdmin) {
            api.instansiDaerah.getAll().then(res => {
                if (res.success) setInstansiList(res.data);
            });
        }
    }, [isSuperAdmin]);

    useEffect(() => {
        if (selectedInstansi) {
            api.bidangInstansi.getAll().then(res => {
                if (res.success) {
                    setBidangList(res.data.filter((b: any) => b.instansi_id === selectedInstansi));
                }
            });
        }
    }, [selectedInstansi]);

    useEffect(() => {
        api.tipeKegiatan.getAll().then(res => {
            if (res.success) setActivityTypes(res.raw || res.data);
        });
    }, []);

    const fetchData = async () => {
        if (!selectedInstansi) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        try {
            const res = view === 'monthly'
                ? await api.kegiatanPegawai.getMonthly({ instansi_id: selectedInstansi, bidang_id: bidangId, month, year })
                : await api.kegiatanPegawai.getYearly({ instansi_id: selectedInstansi, bidang_id: bidangId, year });

            if (res.success) setData(res.data);
            else setData([]);

            const typesRes = await api.tipeKegiatan.getAll();
            if (typesRes.success) setActivityTypes(typesRes.raw || typesRes.data);

            // Fetch holidays for the current month
            if (view === 'monthly') {
                const holRes = await api.holidays.getMonthly(year, month);
                if (holRes.success) setHolidays(holRes.data);
            }
        } catch (error) {
            console.error('Failed to fetch data:', error);
            setData([]);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [view, month, year, bidangId, selectedInstansi]);

    useEffect(() => {
        // Fetch master_dokumen for classification FIRST
        api.masterDataConfig.getDataByTable('master_dokumen').then(masterRes => {
            if (masterRes.success) {
                setMasterDokumenList(masterRes.data);
                const suratTypeIds = masterRes.data
                    .filter((d: any) => d.jenis_dokumen_id === 8 || d.dokumen.toLowerCase().startsWith('surat'))
                    .map((d: any) => d.id);

                // Then fetch letters and filter correctly
                api.dokumen.getAll().then(res => {
                    if (res.success) {
                        setSuratList(res.data.filter((d: any) => 
                            d.jenis_dokumen_id === 8 || suratTypeIds.includes(d.jenis_dokumen_id)
                        ));
                    }
                });
            }
        });
    }, []);

    const daysInMonth = useMemo(() => {
        return new Date(year, month, 0).getDate();
    }, [month, year]);

    const handleSelectActivity = useCallback(async (profil_id: number, day: number, session: 'Pagi' | 'Siang', t: string | null) => {
        // State cleared
        try {
            const selectedType = flatActivityTypes.find(type => type.kode === t);

            // Find current activities for this day/session to preserve data
            const employeeData = data.find(p => p.profil_id === profil_id);
            const currentActivities = employeeData?.activities?.[day] || {};
            const currentSessionActivities: any[] = currentActivities[session] || [];
            
            // Try to find if we already have an activity that matches this type or any activity to get existing metadata
            const existingAct = currentSessionActivities.find((act: any) => act.tipe === t) || currentSessionActivities[0];
            const existingSuratIds = (existingAct?.lampiran || existingAct?.lampiran_kegiatan) ? (existingAct.lampiran || existingAct.lampiran_kegiatan).split(',') : [];
            const existingKeterangan = existingAct?.keterangan || '';
            const existingActivityId = existingAct?.id_eksternal || '';
            const existingActivityNama = existingAct?.nama || existingAct?.activity_nama || '';

            if (t && selectedType?.is_rapat) {
                setMeetingSelection({
                    profil_id,
                    day,
                    session,
                    tipe_kegiatan: t,
                    pagi: session === 'Pagi',
                    siang: session === 'Siang',
                    keterangan: existingKeterangan,
                    selectedProfilIds: [profil_id],
                    activityId: existingActivityId,
                    activityNama: existingActivityNama,
                    suratIds: existingSuratIds
                });
                setActiveCell(null);
                return;
            }

            if (t && selectedType?.is_jumlah_full) {
                // Trigger range selection instead of direct saving
                setRangeSelection({
                    profil_id,
                    startDay: day,
                    endDay: day,
                    tipe_kegiatan: t,
                    keterangan: existingKeterangan,
                    selectedProfilIds: [profil_id],
                    suratIds: existingSuratIds
                });
                setActiveCell(null);
                return;
            }

            const tanggal = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

            // isClearing logic: if t is null, we clear EVERYTHING for this session
            const isClearing = !t;

            if (isClearing) {
                // If it's a full-day activity (C, S, DL, DLB), clear both sessions
                const currentType = flatActivityTypes.find(at => at.kode === currentSessionActivities[0]?.tipe);
                const isFullDay = currentType?.is_jumlah_full;

                await api.kegiatanPegawai.upsert({
                    profil_pegawai_id: profil_id,
                    tanggal,
                    sesi: isFullDay ? 'Both' : session,
                    tipe_kegiatan: null
                });
            } else {
                // For other types (C, S, DL, DLB), they replace everything in that session
                await api.kegiatanPegawai.upsert({
                    profil_pegawai_id: profil_id,
                    tanggal,
                    sesi: session,
                    tipe_kegiatan: t,
                    id_kegiatan_eksternal: '', // standard
                    nama_kegiatan: '',
                    keterangan: existingKeterangan,
                    lampiran_kegiatan: existingSuratIds.join(',')
                });
            }
            fetchData();
        } catch (err: any) {
            console.error('Error saving activity:', err);
        } finally {
            setActiveCell(null);
        }
    }, [flatActivityTypes, year, month, data, fetchData]);

    const handleBulkUpsert = async () => {
        if (!rangeSelection) return;
        setIsSaving(true);
        try {
            const { startDay, endDay, tipe_kegiatan, keterangan, selectedProfilIds, activity } = rangeSelection as any;
            const promises = [];
            const start = Math.min(startDay, endDay);
            const end = Math.max(startDay, endDay);

            for (const pid of rangeSelection.selectedProfilIds) {
                for (let d = start; d <= end; d++) {
                    const tanggal = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                    // Fill both Pagi and Siang
                    promises.push(api.kegiatanPegawai.upsert({
                        profil_pegawai_id: pid,
                        tanggal,
                        sesi: 'Pagi',
                        tipe_kegiatan,
                        id_kegiatan_eksternal: activity?.id,
                        nama_kegiatan: activity?.nama,
                        keterangan,
                        lampiran_kegiatan: (rangeSelection.suratIds || []).join(',')
                    } as any));
                    promises.push(api.kegiatanPegawai.upsert({
                        profil_pegawai_id: pid,
                        tanggal,
                        sesi: 'Siang',
                        tipe_kegiatan,
                        id_kegiatan_eksternal: activity?.id,
                        nama_kegiatan: activity?.nama,
                        keterangan,
                        lampiran_kegiatan: (rangeSelection.suratIds || []).join(',')
                    } as any));
                }
            }

            await Promise.all(promises);
            setRangeSelection(null);
            fetchData();
        } catch (err) {
            console.error('Error bulk saving:', err);
        } finally {
            setIsSaving(false);
        }
    };


    const handleMeetingSubmit = async (meetingArg?: any) => {
        if (!meetingSelection) return;
        setIsSaving(true);
        try {
            const { day, tipe_kegiatan, pagi, siang, keterangan, selectedProfilIds, activityId, activityNama, session: originalSession } = meetingSelection;
            const tanggal = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

            // Ensure S, C, DL, DLB always fill both sessions
            const isFullDay = ['C', 'S', 'DL', 'DLB'].includes(tipe_kegiatan);
            const finalPagi = pagi || isFullDay;
            const finalSiang = siang || isFullDay;

            // Check if meetingArg is a valid meeting object (not an event)
            const isMeetingObject = meetingArg && typeof meetingArg === 'object' && 'id' in meetingArg;
            const finalId = isMeetingObject ? meetingArg.id : activityId;
            const finalNama = isMeetingObject ? meetingArg.nama : activityNama;

            const promises = [];
            for (const pid of selectedProfilIds) {
                // To prevent duplicates in the same session (where unique key includes id_eksternal):
                // If we are editing (1 person), we should clear other activities in the chosen sessions FIRST
                // if the finalId has changed or if we are replacing a non-meeting with a meeting.
                if (selectedProfilIds.length === 1) {
                    if (finalPagi) {
                        promises.push(api.kegiatanPegawai.upsert({
                            profil_pegawai_id: pid,
                            tanggal,
                            sesi: 'Pagi',
                            tipe_kegiatan: null // Clear existing session activities first to avoid duplicates
                        }));
                    }
                    if (finalSiang) {
                        promises.push(api.kegiatanPegawai.upsert({
                            profil_pegawai_id: pid,
                            tanggal,
                            sesi: 'Siang',
                            tipe_kegiatan: null // Clear existing session activities first to avoid duplicates
                        }));
                    }
                    // Run clears first
                    if (promises.length > 0) {
                        await Promise.all(promises);
                        promises.length = 0;
                    }
                }

                if (finalPagi) {
                    promises.push(api.kegiatanPegawai.upsert({
                        profil_pegawai_id: pid,
                        tanggal,
                        sesi: 'Pagi',
                        tipe_kegiatan,
                        id_kegiatan_eksternal: finalId,
                        nama_kegiatan: finalNama,
                        keterangan,
                        lampiran_kegiatan: (meetingSelection.suratIds || []).join(',')
                    } as any));
                }
                if (finalSiang) {
                    promises.push(api.kegiatanPegawai.upsert({
                        profil_pegawai_id: pid,
                        tanggal,
                        sesi: 'Siang',
                        tipe_kegiatan,
                        id_kegiatan_eksternal: finalId,
                        nama_kegiatan: finalNama,
                        keterangan,
                        lampiran_kegiatan: (meetingSelection.suratIds || []).join(',')
                    } as any));
                }
            }

            if (promises.length > 0) {
                await Promise.all(promises);
            }

            setMeetingSelection(null);
            fetchData();
        } catch (err) {
            console.error('Error meeting saving:', err);
        } finally {
            setIsSaving(false);
        }
    };




    const handleToggleHoliday = async (day: number) => {
        if (!canEdit) return;
        try {
            const tanggal = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const existing = holidays.find(h => {
                const hDate = new Date(h.tanggal);
                return hDate.getDate() === day && hDate.getMonth() + 1 === month && hDate.getFullYear() === year;
            });

            if (existing) {
                // Open options modal instead of toggling off immediately
                setHolidayOptions({ day, tanggal, keterangan: existing.keterangan || '' });
            } else {
                // If not holiday, prompt for duration & keterangan
                setHolidayPrompt({ day, tanggal, duration: 1, keterangan: '' });
            }
        } catch (err) {
            console.error('Error handling holiday click:', err);
        }
    };

    const handleConfirmHoliday = async () => {
        if (!holidayPrompt) return;
        try {
            const res = await api.holidays.bulkUpsert({
                start_tanggal: holidayPrompt.tanggal,
                duration: holidayPrompt.keterangan ? holidayPrompt.duration : 1, // If no keterangan, assume 1 day
                keterangan: holidayPrompt.keterangan || 'Hari Libur'
            });
            if (res.success) {
                const holRes = await api.holidays.getMonthly(year, month);
                if (holRes.success) setHolidays(holRes.data);
            }
        } catch (err) {
            console.error('Error adding holiday:', err);
        } finally {
            setHolidayPrompt(null);
        }
    };

    const handleDeleteHoliday = async () => {
        if (!holidayOptions) return;
        try {
            const res = await api.holidays.bulkDelete({ tanggal: holidayOptions.tanggal });
            if (res.success) {
                const holRes = await api.holidays.getMonthly(year, month);
                if (holRes.success) setHolidays(holRes.data);
            }
        } catch (err) {
            console.error('Error deleting holiday:', err);
        } finally {
            setHolidayOptions(null);
        }
    };

    const getRestrictedEmployees = (day: number, session: 'Pagi' | 'Siang') => {
        const restricted = new Set<{ id: number, reason: string }>();
        data.forEach(p => {
            const dayActivities = p.activities?.[day]?.[session] || [];
            const conflict = dayActivities.find((act: any) => ['C', 'S', 'DL', 'DLB'].includes(act.tipe));
            if (conflict) {
                const typeDef = flatActivityTypes.find(t => t.kode === conflict.tipe);
                restricted.add({
                    id: p.profil_id,
                    reason: `${typeDef?.nama || conflict.tipe}`
                });
            }
        });
        return restricted;
    };

    const renderMonthlyTable = (suratList: any[]) => {
        return (
            <MonthlyTableContent
                daysInMonth={daysInMonth}
                month={month}
                year={year}
                holidays={holidays}
                tDay={new Date().getDate()}
                tMonth={new Date().getMonth() + 1}
                tYear={new Date().getFullYear()}
                activityTypes={activityTypes}
                flatActivityTypes={flatActivityTypes}
                hierarchicalActivityTypes={hierarchicalActivityTypes}
                filteredData={filteredData}
                canEdit={canEdit}
                handleDownloadPDF={handleDownloadPDF}
                handleToggleHoliday={handleToggleHoliday}
                handleTableClick={handleTableClick}
                handleBodyScroll={handleBodyScroll}
                handleTableMouseMove={handleTableMouseMove}
                handleTableMouseLeave={handleTableMouseLeave}
                handleSelectActivity={handleSelectActivity}
                setMeetingSelection={setMeetingSelection}
                suratList={suratList}
                monthlyHeaderRef={monthlyHeaderRef}
                monthlyTableRef={monthlyTableRef}
                colOverlayRef={colOverlayRef}
                activeCellOverlayRef={activeCellOverlayRef}
                headerHeight={headerHeight}
                dayNamesShort={dayNamesShort}
                isSummaryExpanded={isSummaryExpanded}
                setIsSummaryExpanded={setIsSummaryExpanded}
            />
        );
    };

    const renderYearlyTable = () => {
        return (
            <div className="space-y-4">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-2">
                    <div className="flex items-center gap-3">
                        <div className="bg-indigo-50/50 p-2 rounded-xl border border-indigo-100/50 group-hover:bg-indigo-50 transition-colors">
                            <TrendingUp size={18} className="text-indigo-600" />
                        </div>
                        <div>
                            <h3 className="text-sm font-black text-slate-800 tracking-tight">Rekap Tahunan</h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-1">Akumulasi kegiatan tahunan</p>
                        </div>
                    </div>

                    {/* Legend and PDF Button - NOT STICKY */}
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex flex-wrap items-center gap-2 p-1.5 px-3 bg-slate-50/80 rounded-xl border border-slate-100">
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mr-1">Legenda:</span>
                            {activityTypes.filter(t => !t.parent_id).map(t => (
                                <div key={t.kode} className="relative flex items-center gap-1.5 px-1.5 py-0.5 rounded-lg hover:bg-white transition-colors cursor-help group">
                                    <div className={`w-1.5 h-1.5 rounded-full ${t.warna} shadow-sm group-hover:scale-125 transition-transform`}></div>
                                    <span className="text-[9px] font-black text-slate-600 uppercase mb-0.5">{t.kode}</span>
                                    <span className="text-[8px] font-bold text-slate-400 capitalize hidden xl:inline">{t.nama}</span>
                                    
                                    {/* Tooltip */}
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 bg-slate-800 text-white text-[9px] font-bold rounded-lg opacity-0 group-hover:opacity-100 transition-all pointer-events-none whitespace-nowrap shadow-xl translate-y-1 group-hover:translate-y-0 z-[600]">
                                        {t.deskripsi || t.nama}
                                        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-800"></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button
                            onClick={() => handleDownloadPDF('yearly')}
                            className="flex items-center gap-2 px-4 py-2 bg-ppm-slate hover:bg-slate-800 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md shadow-ppm-slate/10 transition-all active:scale-95"
                        >
                            <Download size={14} /> PDF
                        </button>
                    </div>
                </div>

                {/* 1. Header Container - Sticky vertically to page */}
                <div 
                    ref={yearlyHeaderRef}
                    className="overflow-hidden sticky z-[450] bg-white transition-all duration-300"
                    style={{ top: headerHeight }}
                >
                    <table className="w-full text-left border-separate border-spacing-0 table-fixed bg-white border-x border-slate-100">
                        <colgroup>
                            <col className="w-[300px]" />
                            <col className="w-8" />
                            {isSummaryExpanded && activityTypes.filter(t => !t.parent_id).map(t => <col key={t.kode} className="w-[80px]" />)}
                            <col className="w-[80px]" />
                        </colgroup>
                        <thead>
                            <tr className="divide-x divide-slate-100 shadow-sm border-t border-slate-100">
                                <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest sticky !left-0 bg-white z-[135] border-b border-t border-slate-100 shadow-[0_1px_0_rgba(0,0,0,0.05)]">Nama Pegawai</th>
                                <th className="w-8 bg-slate-50 border-b border-t border-slate-100 shadow-[0_1px_0_rgba(0,0,0,0.05)]">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setIsSummaryExpanded(!isSummaryExpanded); }}
                                        className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-white text-slate-400 hover:text-indigo-500 transition-all border border-transparent hover:border-indigo-100 mx-auto"
                                        title={isSummaryExpanded ? "Sembunyikan Rekap" : "Tampilkan Rekap Detail"}
                                    >
                                        {isSummaryExpanded ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
                                    </button>
                                </th>
                                {isSummaryExpanded && activityTypes.filter(t => !t.parent_id).map(t => (
                                    <th key={t.kode} className="p-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest bg-white border-b border-t border-slate-100 shadow-[0_1px_0_rgba(0,0,0,0.05)]">{t.kode}</th>
                                ))}
                                <th className="p-4 text-center text-[10px] font-black text-slate-800 uppercase tracking-widest bg-slate-50 border-b border-t border-slate-100 shadow-[0_1px_0_rgba(0,0,0,0.05)]">Total</th>
                            </tr>
                        </thead>
                    </table>
                </div>

                <div 
                    ref={yearlyTableRef} 
                    onScroll={(e) => handleBodyScroll(e, yearlyHeaderRef)}
                    className="overflow-x-auto hover-table-container custom-scrollbar-horizontal pb-4 relative"
                >
                    <table className="w-full text-left border-separate border-spacing-0 table-fixed bg-white border-x border-slate-100">
                        <colgroup>
                            <col className="w-[300px]" />
                            <col className="w-8" />
                            {isSummaryExpanded && activityTypes.filter(t => !t.parent_id).map(t => <col key={t.kode} className="w-[80px]" />)}
                            <col className="w-[80px]" />
                        </colgroup>
                        <tbody className="divide-y divide-slate-50">
                            {filteredData.map((p) => (
                                <YearlyRow
                                    key={p.profil_id}
                                    p={p}
                                    activityTypes={activityTypes}
                                    canEdit={canEdit}
                                    isSummaryExpanded={isSummaryExpanded}
                                />
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    return (
        <div className="max-w-full relative bg-[#f8fafc] -mx-4 px-4">
            {/* Header / Toolbar Area - Sticky */}
            <div 
                ref={stickyHeaderRef} 
                className="sticky top-0 z-[500] bg-white -mx-4 px-4 pt-1 pb-4 border-b border-slate-100 shadow-sm
                           before:content-[''] before:absolute before:-top-[500px] before:left-0 before:right-0 before:h-[500px] before:bg-white before:pointer-events-none"
            >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-2.5 px-5 rounded-[1.8rem] border border-slate-100 shadow-md transition-all hover:shadow-lg">
                    {/* Left: Title & Subtitle */}
                    <div className="flex-1 min-w-0">
                        <h1 className="text-base font-black text-slate-800 tracking-tight flex items-center gap-2.5 truncate">
                            <Calendar className="text-ppm-slate" size={18} />
                            Rekap Kegiatan Per Orang
                        </h1>
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-0.5 ml-7">Monitoring kehadiran secara periodik</p>
                    </div>

                    {/* Right: Controls Toolbar */}
                    <div className="flex flex-wrap items-center gap-3 lg:gap-4">
                        {/* Instansi Select (Super Admin Only) */}
                        {isSuperAdmin && (
                            <SearchableSelect
                                label="Instansi"
                                options={instansiList}
                                keyField="id"
                                displayField="instansi"
                                value={selectedInstansi}
                                onChange={(val) => setSelectedInstansi(val)}
                                className="w-full lg:w-64 text-[11px] font-bold [&>div]:!bg-white/80 [&>div]:!border-slate-200/60 [&>div]:!shadow-sm [&>div]:!rounded-xl [&>div]:!h-9 [&>div]:!py-1.5 [&>div]:!min-h-[36px]"
                            />
                        )}

                        {/* Employee Search Field (Isolated for performance) */}
                        <SearchField value={searchTerm} onSearch={setSearchTerm} />

                        {/* View Toggle (Bulanan / Tahunan) */}
                        <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-sm h-9">
                            <button
                                onClick={() => setView('monthly')}
                                className={`px-4 py-1 text-[8.5px] font-black uppercase tracking-widest rounded-lg transition-all duration-300 ${view === 'monthly' ? 'bg-ppm-slate text-white shadow-sm shadow-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                Bulanan
                            </button>
                            <button
                                onClick={() => setView('yearly')}
                                className={`px-4 py-1 text-[8.5px] font-black uppercase tracking-widest rounded-lg transition-all duration-300 ${view === 'yearly' ? 'bg-ppm-slate text-white shadow-sm shadow-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                Tahunan
                            </button>
                        </div>

                        {/* Vertical Divider */}
                        <div className="hidden lg:block w-px h-6 bg-slate-200/60"></div>

                        {/* Compact Filter Group */}
                        <div className="flex items-center gap-0.5 bg-white/80 p-1 rounded-xl border border-slate-200 shadow-sm h-9">
                            {/* Year Picker */}
                            <div className="flex items-center gap-1.5 px-2.5 border-r border-slate-100 pr-4">
                                <Calendar size={13} className="text-slate-400" />
                                <select
                                    value={year}
                                    onChange={(e) => setYear(Number(e.target.value))}
                                    className="bg-transparent text-[9.5px] font-black text-slate-700 outline-none w-16 cursor-pointer"
                                >
                                    {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                                </select>
                            </div>

                            {/* Month Navigator (Monthly Only) */}
                            {view === 'monthly' && (
                                <div className="flex items-center gap-2 px-3 border-r border-slate-100 relative overflow-visible">
                                    <button
                                        onClick={() => setMonth(m => m === 1 ? 12 : m - 1)}
                                        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-50 text-slate-400 transition-colors"
                                    >
                                        <ChevronLeft size={16} />
                                    </button>
                                    <button
                                        onClick={() => setIsMonthPickerOpen(!isMonthPickerOpen)}
                                        className={`text-[9.5px] font-black uppercase tracking-widest min-w-[60px] text-center transition-all hover:text-ppm-blue ${isMonthPickerOpen ? 'text-ppm-blue' : 'text-slate-800'}`}
                                    >
                                        {monthNames[month - 1].slice(0, 3)}
                                    </button>
                                    <button
                                        onClick={() => setMonth(m => m === 12 ? 1 : m + 1)}
                                        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-50 text-slate-400 transition-colors"
                                    >
                                        <ChevronRight size={16} />
                                    </button>

                                    {isMonthPickerOpen && (
                                        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 p-3 bg-white border border-slate-100 rounded-2xl shadow-2xl z-[400] min-w-[280px] animate-in zoom-in-95 duration-200">
                                            <div className="grid grid-cols-4 gap-1.5">
                                                {monthNames.map((name, idx) => {
                                                    const m = idx + 1;
                                                    return (
                                                        <button
                                                            key={m}
                                                            onClick={() => {
                                                                setMonth(m);
                                                                setIsMonthPickerOpen(false);
                                                            }}
                                                            className={`py-2 text-[10px] font-black uppercase tracking-tight rounded-lg transition-all ${month === m ? 'bg-ppm-slate text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
                                                        >
                                                            {name.slice(0, 3)}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Bidang Select */}
                            <div className="flex items-center gap-1.5 px-2.5 pl-3">
                                <Filter size={13} className="text-slate-400" />
                                <select
                                    value={bidangId}
                                    onChange={(e) => setBidangId(e.target.value)}
                                    disabled={!canChangeBidang}
                                    className={`bg-transparent text-[9.5px] font-black text-slate-700 outline-none max-w-[150px] cursor-pointer ${!canChangeBidang ? 'opacity-50' : ''}`}
                                >
                                    {canChangeBidang && <option value="all">Semua Bidang</option>}
                                    {bidangList.map(b => <option key={b.id} value={b.id}>{b.singkatan || b.nama_bidang}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
            </div>


            {/* Content Table */}
            {isLoading ? (
                <div className="h-[400px] flex flex-col items-center justify-center gap-4 bg-white rounded-3xl border border-slate-50 shadow-sm">
                    <div className="w-12 h-12 border-4 border-ppm-slate border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-sm font-bold text-slate-400 animate-pulse">Memuat data kegiatan...</p>
                </div>
            ) : data.length === 0 ? (
                <div className="h-[300px] flex flex-col items-center justify-center bg-white rounded-3xl border border-slate-50 text-slate-400 gap-4 p-8 text-center">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center">
                        <AlertCircle size={32} className="opacity-20" />
                    </div>
                    <div>
                        <p className="font-bold text-slate-600">Tidak ada data pegawai ditemukan</p>
                        <p className="text-xs max-w-sm mt-1">Pastikan Bidang yang dipilih memiliki pegawai aktif dan script migrasi database sudah dijalankan.</p>
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                    {view === 'monthly' ? renderMonthlyTable(suratList) : renderYearlyTable()}
                </div>
            )}

            {/* Range Selection Modal */}
            {rangeSelection && (
                <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-ppm-slate/30 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white rounded-3xl shadow-[0_32px_128px_-16px_rgba(0,0,0,0.3)] border border-slate-100 p-6 w-full max-w-xl max-h-[95vh] overflow-y-auto animate-in zoom-in-95 duration-300 custom-scrollbar translate-y-0">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-indigo-500 text-white shadow-xl shadow-indigo-500/20">
                                <Calendar size={24} />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-slate-800">Rentang Kegiatan</h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                                    {(rangeSelection as any).tipe_kegiatan && flatActivityTypes.find(t => t.kode === (rangeSelection as any).tipe_kegiatan)?.nama}
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mb-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Dari Tanggal</label>
                                <select
                                    value={rangeSelection.startDay}
                                    onChange={(e) => setRangeSelection({ ...rangeSelection, startDay: parseInt(e.target.value) })}
                                    className="input-modern"
                                >
                                    {[...Array(daysInMonth)].map((_, i) => (
                                        <option key={i + 1} value={i + 1}>{i + 1} {monthNames[month - 1]}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Sampai Tanggal</label>
                                <select
                                    value={rangeSelection.endDay}
                                    onChange={(e) => setRangeSelection({ ...rangeSelection, endDay: parseInt(e.target.value) })}
                                    className="input-modern"
                                >
                                    {[...Array(daysInMonth)].map((_, i) => (
                                        <option key={i + 1} value={i + 1}>{i + 1} {monthNames[month - 1]}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="space-y-4 mb-6">
                            <SuratMultiUpload
                                label="Lampiran Surat"
                                suratList={suratList}
                                masterDokumenList={masterDokumenList}
                                selectedIds={rangeSelection.suratIds || []}
                                onChange={(ids) => setRangeSelection({ ...rangeSelection, suratIds: ids })}
                                onNewUpload={(newId) => {
                                    const currentIds = rangeSelection.suratIds || [];
                                    if (!currentIds.includes(newId.toString())) {
                                        setRangeSelection({ ...rangeSelection, suratIds: [...currentIds, newId.toString()] });
                                    }
                                    // Refresh surat list to show the new one in selection
                                    const suratTypeIds = masterDokumenList
                                        .filter((d: any) => d.jenis_dokumen_id === 8 || d.dokumen.toLowerCase().startsWith('surat'))
                                        .map((d: any) => d.id);
                                    api.dokumen.getAll().then(res => {
                                        if (res.success) {
                                            setSuratList(res.data.filter((d: any) => 
                                                d.jenis_dokumen_id === 8 || suratTypeIds.includes(d.jenis_dokumen_id)
                                            ));
                                        }
                                    });
                                }}
                            />

                            <div className="space-y-2">
                                <IsolatedTextarea
                                    label="Keterangan / Catatan"
                                    value={rangeSelection.keterangan || ''}
                                    onChange={(val) => setRangeSelection({ ...rangeSelection, keterangan: val })}
                                    placeholder="Tulis detail kegiatan untuk rentang ini..."
                                />
                            </div>

                            <div className="space-y-2">
                                <SearchableSelect
                                    label="Pegawai"
                                    multiple={true}
                                    options={data.map(p => {
                                        // Conflicts don't usually apply to range selection (C, S, etc.) but we'll check today if multiple days are NOT picked
                                        return {
                                            ...p,
                                            disabled: false // In range mode we usually allow overwriting or it's a new mass entry
                                        };
                                    })}
                                    keyField="profil_id"
                                    displayField="nama_lengkap"
                                    value={rangeSelection.selectedProfilIds}
                                    onChange={(val) => setRangeSelection({ ...rangeSelection, selectedProfilIds: val })}
                                />
                            </div>

                            {(rangeSelection.tipe_kegiatan === 'DL' || rangeSelection.tipe_kegiatan === 'DLB') && (
                                <div className="space-y-2">
                                    <SearchableSelect
                                        label="Kegiatan"
                                        options={MOCK_MEETINGS}
                                        keyField="id"
                                        displayField="nama"
                                        value={(rangeSelection as any).activity?.id}
                                        onChange={(val) => {
                                            const meeting = MOCK_MEETINGS.find(m => m.id === val);
                                            setRangeSelection({ ...rangeSelection, activity: meeting } as any);
                                        }}
                                    />
                                </div>
                            )}
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setRangeSelection(null)}
                                className="flex-1 px-4 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:bg-slate-50 transition-colors"
                            >
                                Batal
                            </button>
                            <button
                                onClick={handleBulkUpsert}
                                disabled={isSaving}
                                className="flex-[2] btn-primary h-auto py-2.5 text-[10px] font-black shadow-lg shadow-ppm-slate/20 flex items-center justify-center gap-2"
                            >
                                {isSaving ? (
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                ) : (
                                    <CheckCircle2 size={16} />
                                )}
                                Simpan Rentang
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Meeting Selection Modal */}
            {meetingSelection && (
                <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-ppm-slate/30 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white rounded-3xl shadow-[0_32px_128px_-16px_rgba(0,0,0,0.3)] border border-slate-100 p-6 w-full max-w-lg max-h-[95vh] overflow-y-auto animate-in zoom-in-95 duration-300 custom-scrollbar">
                        <div className="flex items-center gap-3 mb-4">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${flatActivityTypes.find(t => t.kode === meetingSelection.tipe_kegiatan)?.warna} text-white shadow-xl shadow-ppm-slate/10`}>
                                <Edit2 size={24} />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-slate-800">Edit Kegiatan</h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                                    {meetingSelection.day} {monthNames[month - 1]} - {year}
                                </p>
                            </div>
                        </div>

                        <div className="space-y-4 mb-6">
                            <div className="space-y-2">
                                <SearchableSelect
                                    label="Jenis Kegiatan"
                                    options={flatActivityTypes.filter(t => !t.children || t.children.length === 0)}
                                    keyField="kode"
                                    displayField="nama"
                                    value={meetingSelection.tipe_kegiatan}
                                    onChange={(val) => {
                                        const isFull = ['C', 'S', 'DL', 'DLB'].includes(val);
                                        setMeetingSelection({
                                            ...meetingSelection,
                                            tipe_kegiatan: val,
                                            ...(isFull ? { pagi: true, siang: true } : {})
                                        });
                                    }}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <label className={`flex items-center gap-3 p-4 rounded-3xl border transition-all cursor-pointer group 
                                    ${meetingSelection.pagi ? 'border-ppm-slate bg-ppm-slate/5 ring-2 ring-ppm-slate/10' : 'border-slate-100 hover:bg-slate-50'}
                                    ${['C', 'S', 'DL', 'DLB'].includes(meetingSelection.tipe_kegiatan) ? 'opacity-50 cursor-not-allowed grayscale pointer-events-none' : ''}`}>
                                    <input
                                        type="checkbox"
                                        checked={meetingSelection.pagi || ['C', 'S', 'DL', 'DLB'].includes(meetingSelection.tipe_kegiatan)}
                                        disabled={['C', 'S', 'DL', 'DLB'].includes(meetingSelection.tipe_kegiatan)}
                                        onChange={(e) => setMeetingSelection({ ...meetingSelection, pagi: e.target.checked })}
                                        className="hidden"
                                    />
                                    <div className={`w-6 h-6 rounded-xl border-2 flex items-center justify-center transition-all ${meetingSelection.pagi || ['C', 'S', 'DL', 'DLB'].includes(meetingSelection.tipe_kegiatan) ? 'bg-ppm-slate border-ppm-slate' : 'border-slate-200'}`}>
                                        {(meetingSelection.pagi || ['C', 'S', 'DL', 'DLB'].includes(meetingSelection.tipe_kegiatan)) && <CheckCircle2 size={14} className="text-white" />}
                                    </div>
                                    <span className={`text-[11px] font-black uppercase tracking-widest ${meetingSelection.pagi || ['C', 'S', 'DL', 'DLB'].includes(meetingSelection.tipe_kegiatan) ? 'text-ppm-slate' : 'text-slate-400'}`}>Pagi</span>
                                </label>
                                <label className={`flex items-center gap-3 p-4 rounded-3xl border transition-all cursor-pointer group 
                                    ${meetingSelection.siang ? 'border-ppm-slate bg-ppm-slate/5 ring-2 ring-ppm-slate/10' : 'border-slate-100 hover:bg-slate-50'}
                                    ${['C', 'S', 'DL', 'DLB'].includes(meetingSelection.tipe_kegiatan) ? 'opacity-50 cursor-not-allowed grayscale pointer-events-none' : ''}`}>
                                    <input
                                        type="checkbox"
                                        checked={meetingSelection.siang || ['C', 'S', 'DL', 'DLB'].includes(meetingSelection.tipe_kegiatan)}
                                        disabled={['C', 'S', 'DL', 'DLB'].includes(meetingSelection.tipe_kegiatan)}
                                        onChange={(e) => setMeetingSelection({ ...meetingSelection, siang: e.target.checked })}
                                        className="hidden"
                                    />
                                    <div className={`w-6 h-6 rounded-xl border-2 flex items-center justify-center transition-all ${meetingSelection.siang || ['C', 'S', 'DL', 'DLB'].includes(meetingSelection.tipe_kegiatan) ? 'bg-ppm-slate border-ppm-slate' : 'border-slate-200'}`}>
                                        {(meetingSelection.siang || ['C', 'S', 'DL', 'DLB'].includes(meetingSelection.tipe_kegiatan)) && <CheckCircle2 size={14} className="text-white" />}
                                    </div>
                                    <span className={`text-[11px] font-black uppercase tracking-widest ${meetingSelection.siang || ['C', 'S', 'DL', 'DLB'].includes(meetingSelection.tipe_kegiatan) ? 'text-ppm-slate' : 'text-slate-400'}`}>Siang</span>
                                </label>
                            </div>

                            <div className="space-y-2">
                                <SuratMultiUpload
                                    label="Lampiran Surat"
                                    suratList={suratList}
                                    masterDokumenList={masterDokumenList}
                                    selectedIds={meetingSelection.suratIds || []}
                                    onChange={(ids) => setMeetingSelection({ ...meetingSelection, suratIds: ids })}
                                    onNewUpload={(newId) => {
                                        const currentIds = meetingSelection.suratIds || [];
                                        if (!currentIds.includes(newId.toString())) {
                                            setMeetingSelection({ ...meetingSelection, suratIds: [...currentIds, newId.toString()] });
                                        }
                                        // Refresh surat list
                                        const suratTypeIds = masterDokumenList
                                            .filter((d: any) => d.jenis_dokumen_id === 8 || d.dokumen.toLowerCase().startsWith('surat'))
                                            .map((d: any) => d.id);
                                        api.dokumen.getAll().then(res => {
                                            if (res.success) {
                                                setSuratList(res.data.filter((d: any) => 
                                                    d.jenis_dokumen_id === 8 || suratTypeIds.includes(d.jenis_dokumen_id)
                                                ));
                                            }
                                        });
                                    }}
                                />
                            </div>

                            <div className="space-y-2">
                                <IsolatedTextarea
                                    label="Keterangan / Catatan"
                                    value={meetingSelection.keterangan || ''}
                                    onChange={(val) => setMeetingSelection({ ...meetingSelection, keterangan: val })}
                                    placeholder="Tulis detail atau catatan poin rapat di sini..."
                                />
                            </div>

                            <div className="space-y-2">
                                <SearchableSelect
                                    label="Pegawai"
                                    multiple={true}
                                    options={data.map(p => {
                                        const restricted = getRestrictedEmployees(meetingSelection.day, meetingSelection.session);
                                        const restriction = Array.from(restricted).find(r => r.id === p.profil_id);
                                        return {
                                            ...p,
                                            disabled: !!restriction,
                                            disabledReason: restriction?.reason
                                        };
                                    })}
                                    keyField="profil_id"
                                    displayField="nama_lengkap"
                                    value={meetingSelection.selectedProfilIds}
                                    onChange={(val) => setMeetingSelection({ ...meetingSelection, selectedProfilIds: val })}
                                />
                            </div>

                            <div className="space-y-2">
                                <SearchableSelect
                                    label="Kegiatan / Rapat"
                                    options={MOCK_MEETINGS}
                                    keyField="id"
                                    displayField="nama"
                                    value={meetingSelection.activityId}
                                    onChange={(val) => {
                                        const meeting = MOCK_MEETINGS.find(m => m.id === val);
                                        if (meeting) {
                                            setMeetingSelection({
                                                ...meetingSelection,
                                                activityId: meeting.id,
                                                activityNama: meeting.nama
                                            });
                                        }
                                    }}
                                />
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setMeetingSelection(null)}
                                className="flex-1 px-4 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:bg-slate-50 transition-colors"
                            >
                                Batal
                            </button>
                            <button
                                onClick={() => handleMeetingSubmit()}
                                disabled={isSaving || (!meetingSelection.pagi && !meetingSelection.siang)}
                                className="flex-1 px-4 py-2.5 rounded-2xl bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-500/20 transition-all flex items-center justify-center gap-2"
                            >
                                {isSaving ? (
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                ) : (
                                    <CheckCircle2 size={16} />
                                )}
                                Simpan
                            </button>
                        </div>
                    </div>
                </div>
            )}


            {/* Holiday Prompt Modal - Set Duration & Description */}
            {holidayPrompt && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-red-900/10 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-[2rem] shadow-2xl border border-red-50 p-6 w-full max-w-sm animate-in zoom-in-95 duration-200">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-red-500 text-white shadow-lg shadow-red-500/20">
                                <AlertCircle size={24} />
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-slate-800">Set Hari Libur</h3>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                                    Mulai: {holidayPrompt.day} {monthNames[month - 1]} {year}
                                </p>
                            </div>
                        </div>

                        <div className="space-y-4 mb-6">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Berapa Hari Libur?</label>
                                <input
                                    type="number"
                                    min={1}
                                    max={31}
                                    value={holidayPrompt.duration}
                                    onChange={(e) => setHolidayPrompt({ ...holidayPrompt, duration: parseInt(e.target.value) || 1 })}
                                    className="input-modern"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Alasan Libur / Keterangan</label>
                                <textarea
                                    value={holidayPrompt.keterangan}
                                    onChange={(e) => setHolidayPrompt({ ...holidayPrompt, keterangan: e.target.value })}
                                    placeholder="Contoh: Libur Hari Raya, Cuti Bersama..."
                                    className="input-modern min-h-[80px] py-3 text-[11px] resize-none border-red-100 focus:border-red-500 focus:ring-red-500/20"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setHolidayPrompt(null)}
                                className="flex-1 px-4 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest text-slate-400 hover:bg-slate-50 transition-colors"
                            >
                                Batal
                            </button>
                            <button
                                onClick={handleConfirmHoliday}
                                className="flex-[2] py-3 rounded-2xl bg-red-500 hover:bg-red-600 text-white text-[11px] font-black uppercase tracking-widest shadow-lg shadow-red-500/20 transition-all flex items-center justify-center gap-2"
                            >
                                <CheckCircle2 size={16} />
                                Konfirmasi
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Holiday Options Modal - Edit / Delete */}
            {holidayOptions && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/10 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-[2rem] shadow-2xl border border-slate-50 p-6 w-full max-w-sm animate-in zoom-in-95 duration-200">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-indigo-500 text-white shadow-lg shadow-indigo-500/20">
                                <Calendar size={24} />
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-slate-800">Kelola Hari Libur</h3>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                                    {holidayOptions.day} {monthNames[month - 1]} {year}
                                </p>
                            </div>
                        </div>

                        <div className="space-y-3 mb-6">
                            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 italic text-[11px] text-slate-600">
                                "{holidayOptions.keterangan || 'Tidak ada keterangan'}"
                            </div>
                            <button
                                onClick={() => {
                                    setHolidayPrompt({ day: holidayOptions.day, tanggal: holidayOptions.tanggal, duration: 1, keterangan: holidayOptions.keterangan });
                                    setHolidayOptions(null);
                                }}
                                className="w-full flex items-center justify-center gap-3 p-4 rounded-2xl bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-[11px] font-black uppercase tracking-widest transition-all"
                            >
                                <Edit2 size={16} />
                                Edit Keterangan
                            </button>
                            <button
                                onClick={handleDeleteHoliday}
                                className="w-full flex items-center justify-center gap-3 p-4 rounded-2xl bg-red-50 hover:bg-red-100 text-red-600 text-[11px] font-black uppercase tracking-widest transition-all"
                            >
                                <XCircle size={16} />
                                Hapus Libur
                            </button>
                        </div>

                        <button
                            onClick={() => setHolidayOptions(null)}
                            className="w-full py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest text-slate-400 hover:bg-slate-50 transition-all"
                        >
                            Tutup
                        </button>
                    </div>
                </div>
            )}

            {/* Printable Report Container (Hidden behind UI for capture) */}
            <div
                ref={printableReportRef}
                className="fixed top-0 left-0 bg-white p-12 w-[1150px] pointer-events-none -z-50 text-black"
                style={{ visibility: 'visible' }}
            >
                {/* Kop Instansi */}
                <div className="text-center border-b-[5px] border-black pb-8 mb-8">
                    <h2 className="text-lg font-bold uppercase tracking-widest mb-1 text-black">Pemerintah Kabupaten Pemerintah</h2>
                    <h1 className="text-3xl font-black uppercase mb-1 text-black leading-tight">
                        {instansiList.find(i => i.id === selectedInstansi)?.instansi || user?.instansi_nama || 'Instansi Daerah'}
                    </h1>
                    <p className="text-sm font-black italic text-black/80 tracking-wide">
                        Rekapitulasi Laporan Kegiatan Pegawai
                    </p>
                </div>

                {/* Report Title */}
                <div className="text-center mb-10">
                    <h3 className="text-2xl font-black uppercase underline underline-offset-[12px] decoration-[4px] decoration-black text-black">
                        Laporan Rekapitulasi Kegiatan {view === 'monthly' ? 'Bulanan' : 'Tahunan'}
                    </h3>
                    <p className="text-lg font-black mt-8 text-black">
                        Periode: {view === 'monthly' ? `${monthNames[month - 1]} ${year}` : year}
                    </p>
                </div>

                {/* Summary Table */}
                <div className="border-[3px] border-black">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="bg-slate-200 border-b-[3px] border-black">
                                <th className="border-r-[2px] border-black p-4 text-left text-xs font-black uppercase tracking-wider w-[300px] text-black">Nama Pegawai</th>
                                {activityTypes.map(t => (
                                    <th key={t.kode} className="border-r-[2px] border-black p-4 text-center text-[11px] font-black uppercase tracking-wider text-black">{t.kode}</th>
                                ))}
                                <th className="p-4 text-center text-xs font-black uppercase tracking-wider bg-slate-400 text-black">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredData.map((p, idx) => (
                                <tr key={p.profil_id} className={`border-black ${idx !== filteredData.length - 1 ? 'border-b-[2px]' : ''}`}>
                                    <td className="border-r-[2px] border-black p-4">
                                        <div className="text-[15px] font-black text-black leading-tight mb-0.5">{p.nama_lengkap}</div>
                                        <div className="text-[10px] font-bold text-black/70 uppercase tracking-tighter">{p.bidang_singkatan || 'Bapperida'}</div>
                                    </td>
                                    {activityTypes.map(t => (
                                        <td key={t.kode} className="border-r-[2px] border-black p-4 text-center text-base font-black text-black">
                                            {p.summary?.[t.kode] || 0}
                                        </td>
                                    ))}
                                    <td className="p-4 text-center text-base font-black text-black bg-slate-100/80">
                                        {p.summary?.total || 0}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Footer / Signature */}
                <div className="mt-16 flex justify-end text-sm">
                    <div className="text-center w-80">
                        <p className="mb-2 font-bold text-black">Dicetak pada: {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                        <div className="h-32 text-black"></div>
                        <p className="font-black underline text-lg text-black">( ........................................ )</p>
                        <p className="text-[11px] font-black text-black mt-2 uppercase tracking-widest">Administrator Sistem</p>
                    </div>
                </div>
            </div>

            {/* Tailwind Safelist for Dynamic DB Colors */}
            <div className="hidden bg-rose-500 bg-amber-500 bg-emerald-500 bg-indigo-500 bg-ppm-slate bg-purple-600 bg-purple-500 bg-fuchsia-600 text-white text-slate-800 border-slate-200 uppercase tracking-widest px-1"></div>

            {/* Single Menu Portal — fires only when activeCell is set */}
            {activeCell && activeCell.rect && activeCell.rect.left !== undefined && createPortal(
                <div
                    onMouseEnter={() => {
                        if (menuHideTimeoutRef.current) {
                            clearTimeout(menuHideTimeoutRef.current);
                            menuHideTimeoutRef.current = null;
                        }
                    }}
                    onMouseLeave={() => {
                        if (menuHideTimeoutRef.current) clearTimeout(menuHideTimeoutRef.current);
                        menuHideTimeoutRef.current = window.setTimeout(() => {
                            setActiveCell(null);
                            if (activeCellOverlayRef.current) activeCellOverlayRef.current.style.display = 'none';
                        }, 2000);
                    }}
                    className={`fixed z-[500] bg-white shadow-2xl border border-slate-200 rounded-2xl flex flex-col p-2 min-w-[180px] overflow-visible animate-in zoom-in-95 duration-200 activity-portal-menu`}
                    style={{
                        left: `${(activeCell.rect?.left || 0) + (activeCell.rect?.width || 0) / 2}px`,
                        top: ((activeCell.rect?.bottom || 0) > window.innerHeight * 0.6) ? `${(activeCell.rect?.top || 0) - 8}px` : `${(activeCell.rect?.bottom || 0) + 8}px`,
                        transform: ((activeCell.rect?.bottom || 0) > window.innerHeight * 0.6) ? 'translate(-50%, -100%)' : 'translate(-50%, 0)'
                    }}
                >
                    <div className="px-4 py-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-50 mb-1">{activeCell.session}</div>
                    <button 
                        onClick={(e) => { e.stopPropagation(); handleSelectActivity(activeCell.profil_id, activeCell.day, activeCell.session, null); }} 
                        className="px-3 py-2.5 text-[11px] font-bold text-slate-400 hover:bg-slate-50 text-left rounded-xl transition-colors border-b border-transparent"
                    >
                        Kosongkan
                    </button>
                    {activeCell.activities && activeCell.activities.length > 0 && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                const act = activeCell.activities![0];
                                const isFull = ['C', 'S', 'DL', 'DLB'].includes(act.tipe);
                                
                                // Support both property names for attachments
                                const lampiran = act.lampiran || act.lampiran_kegiatan;
                                const suratIds = lampiran ? lampiran.split(',').map((id: any) => id.toString()) : [];
                                
                                setMeetingSelection({
                                    profil_id: activeCell.profil_id, 
                                    day: activeCell.day, 
                                    session: activeCell.session, 
                                    tipe_kegiatan: act.tipe,
                                    pagi: isFull || activeCell.session === 'Pagi', 
                                    siang: isFull || activeCell.session === 'Siang',
                                    keterangan: act.keterangan || '', 
                                    selectedProfilIds: [activeCell.profil_id],
                                    activityId: act.id_eksternal || '', 
                                    activityNama: act.nama || '', 
                                    suratIds: suratIds
                                });
                                setActiveCell(null);
                                if (activeCellOverlayRef.current) activeCellOverlayRef.current.style.display = 'none';
                            }}
                            className="px-3 py-2.5 text-[11px] font-bold text-indigo-600 hover:bg-indigo-50 text-left rounded-xl transition-colors flex items-center gap-2"
                        >
                            <Edit2 size={14} /> Edit Kegiatan
                        </button>
                    )}
                    <div className="h-px bg-slate-100 my-1 mx-2"></div>
                    <div className="h-px bg-slate-100 my-1 mx-2"></div>
                    <div className="flex flex-col gap-0.5">
                        {hierarchicalActivityTypes.map((t: any) => (
                            <div key={t.kode} className="relative group/sub">
                                <button 
                                    onClick={(e) => { 
                                        if (!t.children || t.children.length === 0) { 
                                            e.stopPropagation(); 
                                            handleSelectActivity(activeCell.profil_id, activeCell.day, activeCell.session, t.kode); 
                                        } 
                                    }} 
                                    className="w-full flex items-center justify-between px-3 py-2.5 text-[11px] font-bold text-slate-600 hover:bg-indigo-50/50 hover:text-indigo-600 rounded-xl transition-all group-hover/sub:bg-indigo-50/50 group-hover/sub:text-indigo-600 text-left"
                                >
                                    <div className="flex items-center gap-2">
                                        <div className={`w-1.5 h-1.5 rounded-full ${t.warna}`}></div>
                                        {t.nama}
                                    </div>
                                    {t.children && t.children.length > 0 && <ChevronRight size={10} className="opacity-40 group-hover/sub:opacity-100 transition-opacity" />}
                                </button>
                                
                                {t.children && t.children.length > 0 && (
                                    <div className={`invisible group-hover/sub:visible opacity-0 group-hover/sub:opacity-100 absolute ${activeCell.rect!.left > window.innerWidth * 0.6 ? 'right-full mr-1' : 'left-full ml-1'} top-0 bg-white shadow-2xl border border-slate-200 rounded-2xl flex flex-col p-1.5 min-w-[140px] z-[600] transition-all duration-200 scale-95 origin-top group-hover/sub:scale-100`}>
                                        <div className="px-3 py-1.5 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 mb-1">{t.nama}</div>
                                        {t.children.map((sub: any) => (
                                            <button 
                                                key={sub.kode} 
                                                onClick={(e) => { 
                                                    e.stopPropagation(); 
                                                    handleSelectActivity(activeCell.profil_id, activeCell.day, activeCell.session, sub.kode); 
                                                }} 
                                                className="px-2.5 py-2 text-[10px] font-bold text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 text-left rounded-lg transition-colors whitespace-nowrap"
                                            >
                                                {sub.nama}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>,
                document.body
            )}

        </div>
    );
}
