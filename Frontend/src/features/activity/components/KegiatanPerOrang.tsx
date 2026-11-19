import React, { useState, useEffect, useMemo, useRef, useCallback, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, ChevronLeft, ChevronRight, ChevronDown, Download, Filter, Printer, Save, User, Info, CheckCircle2, XCircle, Clock, AlertCircle, Edit2, MessageSquare, FileText, TrendingUp, Search, Upload, X, Check, Copy, ExternalLink, Eye, FileImage, Trash2, Mail, Send, FileSignature, ScrollText, BarChart3, Briefcase, FileCheck, BookOpen, Presentation, Loader2, Plus, Zap } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { jsPDF } from 'jspdf';
import { toPng } from 'html-to-image';
import { api } from '@/src/services/api';
import { useAuth } from '@/src/contexts/AuthContext';
import { SearchableSelect } from '@/src/features/common/components/SearchableSelect';
import { ActivityFormModal } from '@/src/components/modals/ActivityFormModal';
import { DocumentViewerModal } from '@/src/components/modals/DocumentViewerModal';
import { PetugasDetailModal } from '@/src/components/modals/PetugasDetailModal';

// Color mapper for reliable image export
const getActivityBgColor = (type: any) => {
    if (!type) return '#475569';
    if (type.warna?.startsWith('#')) return type.warna;
    const colorMap: Record<string, string> = {
        'bg-rose-500': '#f43f5e',
        'bg-red-500': '#ef4444',
        'bg-amber-500': '#f59e0b',
        'bg-emerald-500': '#10b981',
        'bg-green-500': '#22c55e',
        'bg-indigo-500': '#6366f1',
        'bg-blue-500': '#3b82f6',
        'bg-purple-500': '#a855f7',
        'bg-purple-600': '#9333ea',
        'bg-fuchsia-600': '#c026d3',
        'bg-ppm-slate': '#1e293b'
    };
    return colorMap[type.warna] || '#334155';
};

// Unified Document Categories (Sync with DaftarKegiatan.tsx)
const DOCUMENT_CATEGORIES = [
    { id: 'surat_undangan_masuk', icon: <Mail size={14} />, color: 'emerald', label: 'Undangan Masuk' },
    { id: 'surat_undangan_keluar', icon: <Send size={14} />, color: 'blue', label: 'Undangan Keluar' },
    { id: 'surat_perintah', icon: <FileSignature size={14} />, color: 'amber', label: 'Surat Perintah' },
    { id: 'notulensi', icon: <ScrollText size={14} />, color: 'indigo', label: 'Notulensi' },
    { id: 'paparan', icon: <Presentation size={14} />, color: 'purple', label: 'Paparan' },
    { id: 'bahan_desk', icon: <Briefcase size={14} />, color: 'orange', label: 'Bahan Desk' },
    { id: 'laporan', icon: <FileCheck size={14} />, color: 'rose', label: 'Laporan' }
];
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
    children?: ActivityType[];
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

// Tooltip data state interface
interface TooltipData {
    profil_id?: number;
    activities: any[];
    nama: string;
    session: string;
    day: number;
    rect: { left: number, top: number, width: number, bottom: number } | null;
}

const resolveDocAttachment = (d: any) => {
    if (!d) return null;
    const doc = { ...d };
    if (!doc.tipe_dokumen && doc.jenis_dokumen_id) {
        const jid = parseInt(doc.jenis_dokumen_id);
        if (jid === 11 || jid === 8) doc.tipe_dokumen = 'surat_undangan_masuk';
        else if (jid === 12 || jid === 9) doc.tipe_dokumen = 'surat_undangan_keluar';
        else if (jid === 10) doc.tipe_dokumen = 'surat_perintah';
        else if (jid === 6) doc.tipe_dokumen = 'notulensi';
        else if (jid === 2) doc.tipe_dokumen = 'paparan';
        else if ([3, 4, 5].includes(jid)) doc.tipe_dokumen = 'laporan';
        else doc.tipe_dokumen = 'bahan_desk';
    }
    return doc;
};

const extractAllAttachments = (activities: any[], suratList: any[]) => {
    const allAttachments: any[] = [];
    if (!activities || !Array.isArray(activities)) return allAttachments;
    activities.forEach(act => {
        if (act.lampiran_docs && Array.isArray(act.lampiran_docs)) {
            act.lampiran_docs.forEach((d: any) => {
                const resolved = resolveDocAttachment(d);
                if (resolved && !allAttachments.find(x => x.id === resolved.id)) allAttachments.push(resolved);
            });
        } else {
            const lampiran = act.lampiran || act.lampiran_kegiatan;
            if (lampiran) {
                const ids = lampiran.split(',');
                ids.forEach((id: string) => {
                    const s = suratList.find((doc: any) => doc.id?.toString() === id?.toString());
                    if (s) {
                        const resolved = resolveDocAttachment(s);
                        if (resolved && !allAttachments.find(x => x.id === resolved.id)) {
                            allAttachments.push(resolved);
                        }
                    }
                });
            }
        }
    });
    return allAttachments;
};

const getCategoryColorClasses = (color: string) => {
    switch (color) {
        case 'emerald': return { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-100' };
        case 'blue': return { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-100' };
        case 'amber': return { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-100' };
        case 'indigo': return { bg: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-100' };
        case 'purple': return { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-100' };
        case 'orange': return { bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-100' };
        case 'rose': return { bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-100' };
        default: return { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-100' };
    }
};

// Global Tooltip component for activity cells
const GlobalCellTooltip = React.memo(({
    data,
    suratList,
    month,
    year,
    monthNames,
    canEdit = true,
    onViewDoc,
    onEditActivity,
    onDeleteSingleDay,
    onMouseEnter,
    onMouseLeave
}: {
    data: TooltipData | null,
    suratList: any[],
    month?: number,
    year?: number,
    monthNames?: string[],
    canEdit?: boolean,
    onViewDoc?: (doc: { path: string, name: string }) => void,
    onEditActivity?: (act: any) => void,
    onDeleteSingleDay?: (act: any) => void,
    onMouseEnter?: () => void,
    onMouseLeave?: () => void
}) => {
    const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({ visibility: 'hidden' });
    const [isSelectEditOpen, setIsSelectEditOpen] = useState(false);
    const [isSelectDeleteOpen, setIsSelectDeleteOpen] = useState(false);
    const localRef = useRef<HTMLDivElement>(null);
    const hoverTimeoutRef = useRef<any>(null);
    const [tooltipHoveredDoc, setTooltipHoveredDoc] = useState<{ x: number, y: number, cat: any, docs: any[] } | null>(null);

    const handleConfirmDeleteSingleDay = (act: any) => {
        const actName = act.nama || act.activity_nama || 'kegiatan ini';
        const mName = (monthNames && month) ? monthNames[month - 1] : '';
        const tanggalText = mName ? `${data?.day} ${mName} ${year}` : `tanggal ${data?.day}`;
        const employeeName = data?.nama || 'Pegawai ini';
        const isSingleOfficer = (act.petugas_count !== undefined ? act.petugas_count : 1) <= 1;

        let confirmed = false;
        if (isSingleOfficer) {
            confirmed = window.confirm(
                `Peringatan Penting:\n` +
                `Pegawai "${employeeName}" merupakan satu-satunya petugas pada kegiatan "${actName}".\n\n` +
                `Menghapus petugas ini akan memindahkan kegiatan "${actName}" ke Tempat Sampah (lengkap dengan riwayat pencatatan).\n\n` +
                `Apakah Anda yakin ingin menghapus petugas dan memindahkan kegiatan ke Tempat Sampah?`
            );
        } else {
            confirmed = window.confirm(
                `Peringatan:\n` +
                `Anda akan menghapus "${employeeName}" dari kegiatan "${actName}" khusus pada hari ini (${tanggalText}).\n\n` +
                `Penugasan pada tanggal lain tetap tersimpan dan status kehadiran di Daftar Kegiatan akan ditandai warna merah jika tidak lengkap.\n\n` +
                `Apakah Anda yakin ingin melanjutkan?`
            );
        }

        if (confirmed) {
            onDeleteSingleDay?.(act);
        }
    };

    useLayoutEffect(() => {
        setIsSelectEditOpen(false);
        setIsSelectDeleteOpen(false);
        setTooltipHoveredDoc(null);

        if (data && data.rect && localRef.current) {
            const rect = data.rect;
            const tooltipWidth = 280;
            const estimatedHeight = 320;
            const padding = 20;

            let leftPos = rect.left + rect.width / 2 - (tooltipWidth / 2);
            if (leftPos < padding) leftPos = padding;
            if (leftPos + tooltipWidth > window.innerWidth - padding) leftPos = window.innerWidth - tooltipWidth - padding;

            const spaceAbove = rect.top;
            const spaceBelow = window.innerHeight - rect.bottom;

            let topPos, transform;
            if (spaceAbove < estimatedHeight && spaceBelow > spaceAbove) {
                topPos = rect.bottom;
                transform = 'translateY(0)';
            } else {
                topPos = rect.top;
                transform = 'translateY(-100%)';
            }

            setTooltipStyle({
                left: `${leftPos}px`,
                top: `${topPos}px`,
                transform: transform,
                visibility: 'visible'
            });
        } else {
            setTooltipStyle({ visibility: 'hidden' });
        }
    }, [data]);

    useEffect(() => {
        return () => {
            if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
        };
    }, []);

    if (!data || !data.activities || data.activities.length === 0) return null;
    const { activities, nama, session, day } = data;

    const allAttachments = extractAllAttachments(activities, suratList);
    const hasAttachments = allAttachments.length > 0;

    return (
        <div
            ref={localRef}
            className="global-cell-tooltip animate-in fade-in zoom-in-95 duration-200 pointer-events-auto"
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            style={{
                position: 'fixed',
                zIndex: 1000,
                ...tooltipStyle,
                display: 'flex',
                flexDirection: 'column',
                backgroundColor: 'white',
                borderRadius: '20px',
                border: '1px solid #f1f5f9',
                boxShadow: '0 25px 60px -12px rgba(0,0,0,0.25)',
                minWidth: '280px',
                maxWidth: '320px',
                overflow: 'hidden'
            }}
        >
            <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500 z-10 pointer-events-none"></div>
            <div className="relative pointer-events-auto flex flex-col h-full">
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
                            <div className="flex items-center gap-2 group/act">
                                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${act.tipe === 'DL' ? 'bg-orange-500' : 'bg-indigo-500'}`}></span>
                                <span className="text-[9px] font-black text-slate-700 uppercase">{act.tipe}</span>
                                <span className="text-[10px] font-bold text-indigo-600 truncate flex-1">{act.nama || act.activity_nama}</span>
                                {act.is_rapat && (
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            const url = new URL(window.location.href);
                                            url.searchParams.set('page', 'notulen-maker');
                                            url.searchParams.set('kegiatan_id', String(act.id || act.kegiatan_id));
                                            window.location.href = url.toString();
                                        }}
                                        className="p-1 bg-emerald-50 text-emerald-600 rounded-md border border-emerald-100 hover:bg-emerald-100 transition-all opacity-0 group-hover/act:opacity-100"
                                        title="Buat Notulen"
                                    >
                                        <BookOpen size={10} />
                                    </button>
                                )}
                            </div>
                            {act.keterangan && (
                                <div className="text-[9px] font-medium text-slate-500 italic pl-3.5 leading-relaxed bg-slate-50/50 py-1 px-2 rounded-lg border-l-2 border-slate-200">
                                    "{act.keterangan}"
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* Sync Document UI: Categorized Icon list & Edit button */}
                <div className="p-3 pt-0 space-y-2 relative">
                    <div className="flex items-center justify-between px-1 relative">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                            Lampiran Dokumen ({allAttachments.length})
                        </span>
                        {/* Tombol Edit (Icon Pensil) & Hapus Khusus Hari Ini (Icon Tempat Sampah) */}
                        {canEdit && (
                            <div className="flex items-center gap-1">
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (activities.length === 1) {
                                            onEditActivity?.(activities[0]);
                                        } else {
                                            setIsSelectEditOpen(prev => !prev);
                                            setIsSelectDeleteOpen(false);
                                        }
                                    }}
                                    className="p-1.5 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                                    title="Edit Kegiatan"
                                >
                                    <Edit2 size={12} />
                                </button>

                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (activities.length === 1) {
                                            handleConfirmDeleteSingleDay(activities[0]);
                                        } else {
                                            setIsSelectDeleteOpen(prev => !prev);
                                            setIsSelectEditOpen(false);
                                        }
                                    }}
                                    className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                    title="Hapus Penugasan Khusus Pada Hari Ini"
                                >
                                    <Trash2 size={12} />
                                </button>

                                {/* Dropdown if multiple activities for Edit */}
                                {activities.length > 1 && isSelectEditOpen && (
                                    <div className="absolute right-0 top-full mt-1 z-50 bg-white shadow-xl border border-slate-200 rounded-xl p-1 min-w-[190px] flex flex-col gap-0.5 animate-in fade-in zoom-in-95 duration-150">
                                        <div className="px-2 py-1 text-[8px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                                            Pilih Kegiatan Untuk Diedit
                                        </div>
                                        {activities.map((act: any, idx: number) => (
                                            <button
                                                key={idx}
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setIsSelectEditOpen(false);
                                                    onEditActivity?.(act);
                                                }}
                                                className="px-2 py-1.5 text-[9px] font-bold text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg text-left flex items-center gap-1.5 transition-colors cursor-pointer"
                                            >
                                                <span className="text-[8px] font-black text-indigo-500 uppercase">{act.tipe}</span>
                                                <span className="truncate flex-1">{act.nama || act.activity_nama || 'Tanpa Nama'}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {/* Dropdown if multiple activities for Delete */}
                                {activities.length > 1 && isSelectDeleteOpen && (
                                    <div className="absolute right-0 top-full mt-1 z-50 bg-white shadow-xl border border-slate-200 rounded-xl p-1 min-w-[210px] flex flex-col gap-0.5 animate-in fade-in zoom-in-95 duration-150">
                                        <div className="px-2 py-1 text-[8px] font-black text-rose-400 uppercase tracking-widest border-b border-slate-100">
                                            Pilih Kegiatan Untuk Dihapus Hari Ini
                                        </div>
                                        {activities.map((act: any, idx: number) => (
                                            <button
                                                key={idx}
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setIsSelectDeleteOpen(false);
                                                    handleConfirmDeleteSingleDay(act);
                                                }}
                                                className="px-2 py-1.5 text-[9px] font-bold text-slate-700 hover:bg-rose-50 hover:text-rose-600 rounded-lg text-left flex items-center gap-1.5 transition-colors cursor-pointer"
                                            >
                                                <span className="text-[8px] font-black text-rose-500 uppercase">{act.tipe}</span>
                                                <span className="truncate flex-1">{act.nama || act.activity_nama || 'Tanpa Nama'}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    <div className="h-px bg-slate-100 mx-1"></div>

                    {hasAttachments && (
                        <div className="flex items-center justify-between p-2.5 px-3 bg-slate-50/50 rounded-2xl border border-slate-100/50 shadow-inner">
                            {DOCUMENT_CATEGORIES.map((cat) => {
                                const docs = allAttachments.filter(d => d.tipe_dokumen === cat.id);
                                const hasDocs = docs.length > 0;
                                const colorCls = getCategoryColorClasses(cat.color);
                                return (
                                    <div 
                                        key={cat.id}
                                        className={`w-7 h-7 rounded-full flex items-center justify-center transition-all duration-300 border pointer-events-auto
                                            ${hasDocs 
                                                ? `${colorCls.bg} ${colorCls.text} ${colorCls.border} cursor-pointer shadow-sm` 
                                                : `bg-slate-50 text-slate-300 border-slate-100/50 cursor-help`
                                            }
                                        `}
                                        onMouseEnter={(e) => {
                                            if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
                                            const rect = e.currentTarget.getBoundingClientRect();
                                            setTooltipHoveredDoc({ x: rect.left + rect.width / 2, y: rect.top, cat, docs });
                                        }}
                                        onMouseLeave={() => {
                                            hoverTimeoutRef.current = setTimeout(() => {
                                                setTooltipHoveredDoc(null);
                                            }, 300);
                                        }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (hasDocs && docs[0]?.path) {
                                                onViewDoc?.({ path: docs[0].path, name: docs[0].nama_file });
                                            }
                                        }}
                                    >
                                        {cat.icon}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                        
                    {/* Nested Secondary Tooltip for multiple docs in one category */}
                    {tooltipHoveredDoc && createPortal(
                        <div 
                            className="doc-attachment-popup fixed z-[1200] bg-white rounded-2xl shadow-2xl border border-slate-100 p-3 flex flex-col gap-2 animate-in fade-in zoom-in-95 duration-200 pointer-events-auto before:content-[''] before:absolute before:-bottom-3 before:left-0 before:w-full before:h-3 before:pointer-events-auto"
                            style={{
                                left: tooltipHoveredDoc.x,
                                top: tooltipHoveredDoc.y,
                                transform: 'translate(-50%, -105%)'
                            }}
                            onMouseEnter={() => {
                                if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
                            }}
                            onMouseLeave={() => {
                                hoverTimeoutRef.current = setTimeout(() => {
                                    setTooltipHoveredDoc(null);
                                }, 300);
                            }}
                        >
                            <div className="flex items-center gap-2 mb-1 border-b border-slate-50 pb-2">
                                <div className={`p-1.5 ${getCategoryColorClasses(tooltipHoveredDoc.cat.color).bg} ${getCategoryColorClasses(tooltipHoveredDoc.cat.color).text} rounded-lg`}>
                                    {tooltipHoveredDoc.cat.icon}
                                </div>
                                <span className="text-[10px] font-black text-slate-800 uppercase tracking-widest">{tooltipHoveredDoc.cat.label}</span>
                            </div>
                            {tooltipHoveredDoc.docs.length > 0 ? (
                                <div className="flex flex-col gap-1 max-h-[150px] overflow-y-auto pr-1 custom-scrollbar">
                                    {tooltipHoveredDoc.docs.map((d: any, i: number) => (
                                        <button
                                            key={i}
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onViewDoc?.({ path: d.path, name: d.nama_file });
                                            }}
                                            className="group flex items-center gap-2 p-1.5 px-2.5 rounded-lg hover:bg-slate-50 text-left transition-colors whitespace-nowrap cursor-pointer"
                                        >
                                            <div className="w-1 h-1 rounded-full bg-slate-300 group-hover:bg-ppm-blue transition-colors" />
                                            <span className="text-[9px] font-bold text-slate-600 truncate max-w-[160px] group-hover:text-ppm-blue">{d.nama_file}</span>
                                            <Eye size={10} className="ml-auto text-slate-300 group-hover:text-ppm-blue" />
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-[9px] font-bold text-slate-400 italic px-2">Tidak ada dokumen</div>
                            )}
                        </div>,
                        document.body
                    )}
                </div>
            </div>
        </div>
    );
});

// Interactive clicked cell menu portal component
const ActiveCellMenu = React.memo(({
    activeCell,
    month,
    year,
    monthNames,
    suratList,
    canManage,
    canDelete,
    hierarchicalActivityTypes,
    onClose,
    onViewDoc,
    onEditActivity,
    onAddActivity,
    onDeleteSingleDay,
    onSelectActivity
}: {
    activeCell: {
        profil_id: number;
        day: number;
        session: 'Pagi' | 'Siang';
        rect?: DOMRect;
        activities?: any[];
        nama?: string;
    };
    month: number;
    year: number;
    monthNames: string[];
    suratList: any[];
    canManage: boolean;
    canDelete: boolean;
    hierarchicalActivityTypes: any[];
    onClose: () => void;
    onViewDoc?: (doc: { path: string, name: string }) => void;
    onEditActivity?: (act: any) => void;
    onAddActivity?: (profilId: number, day: number, session: 'Pagi' | 'Siang') => void;
    onDeleteSingleDay?: (profilId: number, day: number, session: 'Pagi' | 'Siang', actId?: number, extId?: string | number) => void;
    onSelectActivity: (profilId: number, day: number, session: 'Pagi' | 'Siang', kode: string | null, actId?: number, extId?: string | number) => void;
}) => {
    const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({ visibility: 'hidden' });
    const [isSelectEditOpen, setIsSelectEditOpen] = useState(false);
    const [isSelectDeleteOpen, setIsSelectDeleteOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'detail' | 'cuti_sakit'>('detail');
    const [expandedKode, setExpandedKode] = useState<string | null>(null);
    const localRef = useRef<HTMLDivElement>(null);
    const hoverTimeoutRef = useRef<any>(null);
    const closeTimeoutRef = useRef<any>(null);
    const [tooltipHoveredDoc, setTooltipHoveredDoc] = useState<{ x: number, y: number, cat: any, docs: any[] } | null>(null);

    const activities = activeCell.activities || [];
    const hasActivities = activities.length > 0;
    const allAttachments = extractAllAttachments(activities, suratList);
    const hasAttachments = allAttachments.length > 0;

    const handleConfirmDeleteSingleDay = (act: any) => {
        const actName = act.nama || act.activity_nama || 'kegiatan ini';
        const tanggalText = `${activeCell.day} ${monthNames[month - 1]} ${year}`;
        const employeeName = activeCell.nama || 'Pegawai ini';
        const isSingleOfficer = (act.petugas_count !== undefined ? act.petugas_count : 1) <= 1;

        let confirmed = false;
        if (isSingleOfficer) {
            confirmed = window.confirm(
                `Peringatan Penting:\n` +
                `Pegawai "${employeeName}" merupakan satu-satunya petugas pada kegiatan "${actName}".\n\n` +
                `Menghapus petugas ini akan memindahkan kegiatan "${actName}" ke Tempat Sampah (lengkap dengan riwayat pencatatan).\n\n` +
                `Apakah Anda yakin ingin menghapus petugas dan memindahkan kegiatan ke Tempat Sampah?`
            );
        } else {
            confirmed = window.confirm(
                `Peringatan:\n` +
                `Anda akan menghapus "${employeeName}" dari kegiatan "${actName}" khusus pada hari ini (${tanggalText}).\n\n` +
                `Penugasan pada tanggal lain tetap tersimpan dan status kehadiran di Daftar Kegiatan akan ditandai warna merah jika tidak lengkap.\n\n` +
                `Apakah Anda yakin ingin melanjutkan?`
            );
        }

        if (confirmed) {
            onDeleteSingleDay?.(activeCell.profil_id, activeCell.day, activeCell.session, act.id, act.id_eksternal || act.activity_id);
        }
    };

    useLayoutEffect(() => {
        setIsSelectEditOpen(false);
        setIsSelectDeleteOpen(false);
        setTooltipHoveredDoc(null);
        setActiveTab(hasActivities ? 'detail' : 'cuti_sakit');
        setExpandedKode(null);

        if (activeCell && activeCell.rect) {
            const rect = activeCell.rect;
            const menuWidth = hasActivities ? 310 : 230;
            const padding = 12;

            // Clamped horizontal position within viewport
            let leftPos = rect.left + rect.width / 2 - (menuWidth / 2);
            if (leftPos < padding) leftPos = padding;
            if (leftPos + menuWidth > window.innerWidth - padding) {
                leftPos = window.innerWidth - menuWidth - padding;
            }

            const spaceAbove = rect.top;
            const spaceBelow = window.innerHeight - rect.bottom;

            let topStyle: React.CSSProperties = {};

            // Decide whether to anchor below or above based on available space
            if (spaceBelow >= 300 || spaceBelow >= spaceAbove) {
                // Anchor below the cell
                const maxH = Math.min(480, Math.max(220, window.innerHeight - rect.bottom - padding * 2));
                topStyle = {
                    top: `${rect.bottom + 4}px`,
                    bottom: 'auto',
                    maxHeight: `${maxH}px`,
                    transform: 'none'
                };
            } else {
                // Anchor above the cell
                const maxH = Math.min(480, Math.max(220, rect.top - padding * 2));
                topStyle = {
                    bottom: `${window.innerHeight - rect.top + 4}px`,
                    top: 'auto',
                    maxHeight: `${maxH}px`,
                    transform: 'none'
                };
            }

            setMenuStyle({
                position: 'fixed',
                zIndex: 1100,
                left: `${leftPos}px`,
                ...topStyle,
                width: `${menuWidth}px`,
                visibility: 'visible'
            });
        } else {
            setMenuStyle({ visibility: 'hidden' });
        }
    }, [activeCell, hasActivities]);

    useEffect(() => {
        return () => {
            if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
            if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
        };
    }, []);

    return (
        <div
            ref={localRef}
            className="activity-portal-menu animate-in zoom-in-95 duration-200 pointer-events-auto"
            onMouseEnter={() => {
                if (closeTimeoutRef.current) {
                    clearTimeout(closeTimeoutRef.current);
                    closeTimeoutRef.current = null;
                }
            }}
            onMouseLeave={() => {
                if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
                closeTimeoutRef.current = setTimeout(() => {
                    onClose();
                }, 1000);
            }}
            style={{
                ...menuStyle,
                display: 'flex',
                flexDirection: 'column',
                backgroundColor: 'white',
                borderRadius: '20px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 25px 60px -12px rgba(0,0,0,0.25)',
                overflow: 'hidden'
            }}
        >
            {/* Header: Sesi, Hari, Nama Pegawai & Tab Switcher */}
            <div className="p-3 bg-slate-50/80 border-b border-slate-100 shrink-0">
                <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                {activeCell.session} · {activeCell.day} {monthNames[month - 1]}
                            </span>
                            {hasActivities && (
                                <span className="text-[8px] font-black text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-full uppercase">
                                    {activities.length} Kegiatan
                                </span>
                            )}
                        </div>
                        <div className="text-[10px] font-black text-slate-800 truncate">
                            {activeCell.nama}
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            onClose();
                        }}
                        className="text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 p-1 rounded-lg transition-colors cursor-pointer"
                        title="Tutup"
                    >
                        <X size={12} />
                    </button>
                </div>

                {/* Tab Switcher (Detail vs Cuti & Sakit) when cell has activities */}
                {hasActivities && (
                    <div className="flex items-center gap-1 mt-2.5 p-0.5 bg-slate-200/60 rounded-xl">
                        <button
                            type="button"
                            onClick={() => setActiveTab('detail')}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-1 px-2 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
                                activeTab === 'detail'
                                    ? 'bg-white text-indigo-700 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700'
                            }`}
                        >
                            <FileText size={11} />
                            <span>Detail Kegiatan</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('cuti_sakit')}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-1 px-2 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
                                activeTab === 'cuti_sakit'
                                    ? 'bg-white text-indigo-700 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700'
                            }`}
                        >
                            <Calendar size={11} />
                            <span>Cuti & Sakit</span>
                        </button>
                    </div>
                )}
            </div>

            {/* Scrollable Body Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2.5">
                {/* TAB 1: DETAIL KEGIATAN */}
                {hasActivities && activeTab === 'detail' && (
                    <>
                        {/* Activities List */}
                        <div className="space-y-2 max-h-[160px] overflow-y-auto custom-scrollbar pr-0.5">
                            {activities.map((act: any, idx: number) => (
                                <div key={idx} className="space-y-1 bg-slate-50/50 p-2 rounded-xl border border-slate-100">
                                    <div className="flex items-center gap-2 group/act">
                                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${act.tipe === 'DL' ? 'bg-orange-500' : 'bg-indigo-500'}`}></span>
                                        <span className="text-[9px] font-black text-slate-700 uppercase">{act.tipe}</span>
                                        <span className="text-[10px] font-bold text-indigo-600 truncate flex-1" title={act.nama || act.activity_nama}>
                                            {act.nama || act.activity_nama}
                                        </span>
                                        {act.is_rapat && (
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    const url = new URL(window.location.href);
                                                    url.searchParams.set('page', 'notulen-maker');
                                                    url.searchParams.set('kegiatan_id', String(act.id || act.kegiatan_id));
                                                    window.location.href = url.toString();
                                                }}
                                                className="p-1 bg-emerald-50 text-emerald-600 rounded-md border border-emerald-100 hover:bg-emerald-100 transition-all opacity-0 group-hover/act:opacity-100"
                                                title="Buat Notulen"
                                            >
                                                <BookOpen size={10} />
                                            </button>
                                        )}
                                    </div>
                                    {act.keterangan && (
                                        <div className="text-[9px] font-medium text-slate-500 italic pl-3 leading-relaxed bg-white py-1 px-2 rounded-lg border-l-2 border-slate-200">
                                            "{act.keterangan}"
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Lampiran Dokumen Section */}
                        <div className="space-y-2 pt-1 relative">
                            <div className="flex items-center justify-between px-1 relative">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                    Lampiran Dokumen ({allAttachments.length})
                                </span>
                                {/* Tombol Edit (Icon Pensil) & Hapus Khusus Hari Ini (Icon Tempat Sampah) */}
                                {canManage && (
                                    <div className="flex items-center gap-1">
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (activities.length === 1) {
                                                    onEditActivity?.(activities[0]);
                                                } else {
                                                    setIsSelectEditOpen(prev => !prev);
                                                    setIsSelectDeleteOpen(false);
                                                }
                                            }}
                                            className="p-1.5 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                                            title="Edit Kegiatan"
                                        >
                                            <Edit2 size={12} />
                                        </button>

                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (activities.length === 1) {
                                                    handleConfirmDeleteSingleDay(activities[0]);
                                                } else {
                                                    setIsSelectDeleteOpen(prev => !prev);
                                                    setIsSelectEditOpen(false);
                                                }
                                            }}
                                            className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                            title="Hapus Penugasan Khusus Pada Hari Ini"
                                        >
                                            <Trash2 size={12} />
                                        </button>

                                        {/* Dropdown if multiple activities for Edit */}
                                        {activities.length > 1 && isSelectEditOpen && (
                                            <div className="absolute right-0 top-full mt-1 z-50 bg-white shadow-xl border border-slate-200 rounded-xl p-1 min-w-[190px] flex flex-col gap-0.5 animate-in fade-in zoom-in-95 duration-150">
                                                <div className="px-2 py-1 text-[8px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                                                    Pilih Kegiatan Untuk Diedit
                                                </div>
                                                {activities.map((act: any, idx: number) => (
                                                    <button
                                                        key={idx}
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setIsSelectEditOpen(false);
                                                            onEditActivity?.(act);
                                                        }}
                                                        className="px-2 py-1.5 text-[9px] font-bold text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg text-left flex items-center gap-1.5 transition-colors cursor-pointer"
                                                    >
                                                        <span className="text-[8px] font-black text-indigo-500 uppercase">{act.tipe}</span>
                                                        <span className="truncate flex-1">{act.nama || act.activity_nama || 'Tanpa Nama'}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}

                                        {/* Dropdown if multiple activities for Delete */}
                                        {activities.length > 1 && isSelectDeleteOpen && (
                                            <div className="absolute right-0 top-full mt-1 z-50 bg-white shadow-xl border border-slate-200 rounded-xl p-1 min-w-[210px] flex flex-col gap-0.5 animate-in fade-in zoom-in-95 duration-150">
                                                <div className="px-2 py-1 text-[8px] font-black text-rose-400 uppercase tracking-widest border-b border-slate-100">
                                                    Pilih Kegiatan Untuk Dihapus Hari Ini
                                                </div>
                                                {activities.map((act: any, idx: number) => (
                                                    <button
                                                        key={idx}
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setIsSelectDeleteOpen(false);
                                                            handleConfirmDeleteSingleDay(act);
                                                        }}
                                                        className="px-2 py-1.5 text-[9px] font-bold text-slate-700 hover:bg-rose-50 hover:text-rose-600 rounded-lg text-left flex items-center gap-1.5 transition-colors cursor-pointer"
                                                    >
                                                        <span className="text-[8px] font-black text-rose-500 uppercase">{act.tipe}</span>
                                                        <span className="truncate flex-1">{act.nama || act.activity_nama || 'Tanpa Nama'}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                            <div className="h-px bg-slate-100 mx-1"></div>

                            {hasAttachments && (
                                <div className="flex items-center justify-between p-2.5 px-3 bg-slate-50/50 rounded-2xl border border-slate-100/50 shadow-inner">
                                    {DOCUMENT_CATEGORIES.map((cat) => {
                                        const docs = allAttachments.filter(d => d.tipe_dokumen === cat.id);
                                        const hasDocs = docs.length > 0;
                                        const colorCls = getCategoryColorClasses(cat.color);
                                        return (
                                            <div 
                                                key={cat.id}
                                                className={`w-7 h-7 rounded-full flex items-center justify-center transition-all duration-300 border pointer-events-auto
                                                    ${hasDocs 
                                                        ? `${colorCls.bg} ${colorCls.text} ${colorCls.border} cursor-pointer shadow-sm` 
                                                        : `bg-slate-50 text-slate-300 border-slate-100/50 cursor-help`
                                                    }
                                                `}
                                                onMouseEnter={(e) => {
                                                    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
                                                    const rect = e.currentTarget.getBoundingClientRect();
                                                    setTooltipHoveredDoc({ x: rect.left + rect.width / 2, y: rect.top, cat, docs });
                                                }}
                                                onMouseLeave={() => {
                                                    hoverTimeoutRef.current = setTimeout(() => {
                                                        setTooltipHoveredDoc(null);
                                                    }, 300);
                                                }}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (hasDocs && docs[0]?.path) {
                                                        onViewDoc?.({ path: docs[0].path, name: docs[0].nama_file });
                                                    }
                                                }}
                                            >
                                                {cat.icon}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Nested Secondary Tooltip for multiple docs in one category */}
                            {tooltipHoveredDoc && createPortal(
                                <div 
                                    className="doc-attachment-popup fixed z-[1200] bg-white rounded-2xl shadow-2xl border border-slate-100 p-3 flex flex-col gap-2 animate-in fade-in zoom-in-95 duration-200 pointer-events-auto before:content-[''] before:absolute before:-bottom-3 before:left-0 before:w-full before:h-3 before:pointer-events-auto"
                                    style={{
                                        left: tooltipHoveredDoc.x,
                                        top: tooltipHoveredDoc.y,
                                        transform: 'translate(-50%, -105%)'
                                    }}
                                    onMouseEnter={() => {
                                        if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
                                    }}
                                    onMouseLeave={() => {
                                        hoverTimeoutRef.current = setTimeout(() => {
                                            setTooltipHoveredDoc(null);
                                        }, 300);
                                    }}
                                >
                                    <div className="flex items-center gap-2 mb-1 border-b border-slate-50 pb-2">
                                        <div className={`p-1.5 ${getCategoryColorClasses(tooltipHoveredDoc.cat.color).bg} ${getCategoryColorClasses(tooltipHoveredDoc.cat.color).text} rounded-lg`}>
                                            {tooltipHoveredDoc.cat.icon}
                                        </div>
                                        <span className="text-[10px] font-black text-slate-800 uppercase tracking-widest">{tooltipHoveredDoc.cat.label}</span>
                                    </div>
                                    {tooltipHoveredDoc.docs.length > 0 ? (
                                        <div className="flex flex-col gap-1 max-h-[150px] overflow-y-auto pr-1 custom-scrollbar">
                                            {tooltipHoveredDoc.docs.map((d: any, i: number) => (
                                                <button
                                                    key={i}
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onViewDoc?.({ path: d.path, name: d.nama_file });
                                                    }}
                                                    className="group flex items-center gap-2 p-1.5 px-2.5 rounded-lg hover:bg-slate-50 text-left transition-colors whitespace-nowrap cursor-pointer"
                                                >
                                                    <div className="w-1 h-1 rounded-full bg-slate-300 group-hover:bg-ppm-blue transition-colors" />
                                                    <span className="text-[9px] font-bold text-slate-600 truncate max-w-[160px] group-hover:text-ppm-blue">{d.nama_file}</span>
                                                    <Eye size={10} className="ml-auto text-slate-300 group-hover:text-ppm-blue" />
                                                </button>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-[9px] font-bold text-slate-400 italic px-2">Tidak ada dokumen</div>
                                    )}
                                </div>,
                                document.body
                            )}
                        </div>

                        {/* Action buttons: Tambah Kegiatan & Ajukan Cuti & Sakit */}
                        {canManage ? (
                            <div className="flex flex-col gap-1.5 mt-2">
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onAddActivity?.(activeCell.profil_id, activeCell.day, activeCell.session);
                                    }}
                                    className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black rounded-xl shadow-sm hover:shadow transition-all cursor-pointer"
                                >
                                    <Plus size={12} className="stroke-[3]" />
                                    Tambah Kegiatan
                                </button>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setActiveTab('cuti_sakit');
                                        setExpandedKode('C');
                                    }}
                                    className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-gradient-to-r from-amber-50 to-indigo-50 hover:from-amber-100 hover:to-indigo-100 text-indigo-700 text-[10px] font-black rounded-xl border border-indigo-100 shadow-sm transition-all cursor-pointer"
                                >
                                    <Calendar size={11} className="text-indigo-600" />
                                    Ajukan Cuti & Sakit
                                </button>
                            </div>
                        ) : (
                            <div className="text-[9px] font-medium text-slate-400 italic text-center py-1">
                                Mode lihat (hanya pemilik akun / pimpinan yang dapat menambah kegiatan atau cuti)
                            </div>
                        )}
                    </>
                )}

                {/* TAB 2: CUTI & SAKIT (Also shown when cell has no activities) */}
                {(!hasActivities || activeTab === 'cuti_sakit') && (
                    <div className="space-y-2">
                        {hasActivities && activeTab === 'cuti_sakit' && (
                            <button
                                type="button"
                                onClick={() => setActiveTab('detail')}
                                className="text-[9px] font-bold text-slate-500 hover:text-indigo-600 mb-1 flex items-center gap-1 transition-colors cursor-pointer"
                            >
                                <ChevronLeft size={10} /> Kembali ke Detil Kegiatan
                            </button>
                        )}

                        {canManage ? (
                            <>
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onAddActivity?.(activeCell.profil_id, activeCell.day, activeCell.session);
                                    }}
                                    className="w-full flex items-center justify-center gap-1.5 py-2.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black rounded-xl shadow-md hover:shadow-lg transition-all cursor-pointer"
                                >
                                    <Plus size={13} className="stroke-[3]" />
                                    Tambah Kegiatan
                                </button>

                                <div className="flex items-center gap-2 my-2">
                                    <div className="h-px bg-slate-200 flex-1" />
                                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">atau</span>
                                    <div className="h-px bg-slate-200 flex-1" />
                                </div>

                                <div className="px-1 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                    Pilih Jenis Cuti / Sakit
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    {hierarchicalActivityTypes.filter((t: any) => ['C', 'S'].includes(t.kode)).map((t: any) => {
                                        const hasChildren = t.children && t.children.length > 0;
                                        const isExpanded = expandedKode === t.kode;
                                        return (
                                            <div key={t.kode} className="flex flex-col bg-slate-50/70 border border-slate-100 rounded-xl overflow-hidden transition-all">
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (hasChildren) {
                                                            setExpandedKode(prev => prev === t.kode ? null : t.kode);
                                                        } else {
                                                            onSelectActivity(activeCell.profil_id, activeCell.day, activeCell.session, t.kode);
                                                        }
                                                    }}
                                                    className="w-full flex items-center justify-between px-3 py-2 text-[11px] font-bold text-slate-700 hover:bg-indigo-50/60 hover:text-indigo-600 transition-colors text-left cursor-pointer"
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <div className={`w-2 h-2 rounded-full ${t.warna || 'bg-indigo-500'}`} />
                                                        <span>{t.nama}</span>
                                                    </div>
                                                    {hasChildren ? (
                                                        <ChevronDown size={12} className={`text-slate-400 transition-transform duration-200 ${isExpanded ? 'rotate-180 text-indigo-600' : ''}`} />
                                                    ) : null}
                                                </button>

                                                {/* Sub-types accordion */}
                                                {hasChildren && isExpanded && (
                                                    <div className="p-1.5 pt-0 bg-white/60 flex flex-col gap-1 border-t border-slate-100 animate-in fade-in duration-150">
                                                        {t.children.map((sub: any) => (
                                                            <button
                                                                key={sub.kode}
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    onSelectActivity(activeCell.profil_id, activeCell.day, activeCell.session, sub.kode);
                                                                }}
                                                                className="w-full px-3 py-1.5 text-[10px] font-bold text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg text-left transition-colors flex items-center gap-2 cursor-pointer"
                                                            >
                                                                <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                                                                <span className="truncate">{sub.nama}</span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>

                                {hasActivities && (
                                    <button
                                        type="button"
                                        onClick={() => setActiveTab('detail')}
                                        className="w-full text-center text-[10px] font-bold text-slate-400 hover:text-slate-600 py-1 transition-colors cursor-pointer mt-1"
                                    >
                                        ← Kembali ke Detail Kegiatan
                                    </button>
                                )}
                            </>
                        ) : (
                            <div className="p-3 bg-amber-50/70 border border-amber-200/60 rounded-xl text-center space-y-1 my-1">
                                <div className="text-[10px] font-black text-amber-800">Akses Dibatasi</div>
                                <p className="text-[9px] font-medium text-amber-700 leading-relaxed">
                                    Hanya pemilik akun atau pimpinan yang dapat membuat cuti & sakit untuk pegawai ini.
                                </p>
                                {hasActivities && (
                                    <button
                                        type="button"
                                        onClick={() => setActiveTab('detail')}
                                        className="w-full text-center text-[10px] font-bold text-indigo-600 hover:underline pt-1.5 cursor-pointer"
                                    >
                                        ← Lihat Detail Kegiatan
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
});

// Lightweight cell marker only
const CellMarker = React.memo(({ activities, type }: { activities: any[], type: any }) => {
    if (activities.length === 0) return null;
    return (
        <div
            className={`w-full h-7 flex items-center justify-center text-[9px] font-black border-r border-slate-100/80 ${activities.length > 1 ? 'bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white shadow-md' : type ? `${type.warna || 'bg-ppm-slate'} ${type.warna_teks || 'text-white'} shadow-sm active:scale-90` : 'text-slate-200'}`}
        >
            {activities.length > 1 ? `(${activities.length})` : activities[0].tipe}
        </div>
    );
});

// High-performance isolated search field to prevent main component re-renders while typing
const SearchField = React.memo(({ value, onSearch, className }: { value: string, onSearch: (val: string) => void, className?: string }) => {
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
        <div className={`relative ${className || 'w-36 sm:w-44'}`}>
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
            <input
                type="text"
                placeholder="Cari pegawai..."
                className="bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200/80 rounded-xl pl-8 pr-7 py-1.5 text-[9.5px] font-bold text-slate-700 outline-none focus:ring-2 focus:ring-ppm-blue/20 w-full h-8 transition-all shadow-2xs"
                value={localValue}
                onChange={(e) => setLocalValue(e.target.value)}
            />
            {localValue && (
                <button
                    type="button"
                    onClick={() => {
                        setLocalValue('');
                        onSearch('');
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-200/60 transition-colors"
                    title="Hapus pencarian"
                >
                    <X size={11} />
                </button>
            )}
        </div>
    );
});

// Memoized Helper Components for Performance
const MonthlyRow = React.memo(({
    p, daysInMonth, year, month, holidays, tDay, tMonth, tYear,
    flatActivityTypes, activityTypes, suratList, canEdit,
    handleSelectActivity, isSummaryExpanded, activeCell, headerHeight,
    onSelectPegawaiDetail
}: any) => {
    const summary = p.summary || {};

    // Check if a cell is active
    const isCellActive = (day: number, session: 'Pagi' | 'Siang') => {
        return activeCell?.profil_id === p.profil_id && activeCell?.day === day && activeCell?.session === session;
    };

    return (
        <tbody className="hover-group border-b border-slate-50 transition-colors duration-500" id={`pegawai-tbody-${p.profil_id}`}>
            <tr className="hover-row">
                <td rowSpan={2} className="name-cell p-2.5 py-2 sticky left-0 z-[150] bg-white border-b border-slate-50 border-r border-slate-100 w-32 sm:w-40">
                    <div 
                        className="min-w-0 cursor-pointer group/name select-none"
                        onClick={() => onSelectPegawaiDetail?.(p)}
                        title="Klik untuk melihat biodata / CV pegawai"
                    >
                        <div className="text-[11px] font-bold text-slate-800 line-clamp-1 leading-tight group-hover/name:text-indigo-600 group-hover/name:underline transition-colors">{p.nama_lengkap}</div>
                        <div className="text-[9px] font-medium text-slate-400 uppercase tracking-tight truncate">{p.jabatan || '-'}</div>
                    </div>
                </td>
                <td className="sticky-col p-1 text-[8px] font-black text-slate-400 sticky left-32 sm:left-40 z-[140] bg-white text-center border-b border-slate-50 border-r border-slate-100 w-9 sm:w-11">PAGI</td>
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
                    const isActive = isCellActive(day, 'Pagi');

                    return (
                        <td
                            key={`pagi-${i}`}
                            data-day={day}
                            data-session="Pagi"
                            data-profil-id={p.profil_id}
                            className={`activity-day-cell p-0 text-center relative group activity-cell border-b border-slate-50 border-r border-slate-100/80 ${(isWeekend || isHoliday) ? 'bg-red-200/40' : ''} ${isToday ? 'bg-indigo-50/30' : ''} ${isActive ? 'activity-cell-active shadow-[inset_0_0_0_2px_#6366f1]' : ''} cursor-pointer`}
                            title={holiday?.keterangan || (isWeekend ? 'Weekend' : '')}
                        >
                            {isToday && <div className="absolute inset-y-0 left-0 w-[2px] bg-indigo-500/50 z-10 pointer-events-none"></div>}
                            {activities.length > 0 ? (
                                <CellMarker activities={activities} type={type} />
                            ) : (
                                <div
                                    className={`w-full h-7 flex items-center justify-center text-[9px] font-black border-r border-slate-100/80 ${(isWeekend || isHoliday) ? 'text-red-100' : 'text-slate-200'} ${canEdit ? 'cursor-pointer' : ''}`}
                                >
                                    {isWeekend ? '✕' : '+'}
                                </div>
                            )}
                        </td>
                    );
                })}
                <td rowSpan={2} className="shared-cell w-1.5 bg-slate-50 border-l border-slate-200 border-b border-slate-50"></td>
                <td rowSpan={2} className="shared-cell w-6 bg-slate-50/30 border-b border-slate-50 border-r border-slate-100/50"></td>
                {isSummaryExpanded && flatActivityTypes.filter(t => !t.children || t.children.length === 0).map((t: any) => (
                    <td key={t.kode} rowSpan={2} className="shared-cell sticky-col p-1 text-center text-[10px] font-black text-slate-600 bg-slate-100/10 border-b border-slate-50 border-r border-slate-100/80">{summary?.[t.kode] || ''}</td>
                ))}
                <td rowSpan={2} className="shared-cell sticky-col p-1 text-center text-[10px] font-black text-emerald-600 bg-emerald-50/20 border-b border-slate-50 border-r border-slate-100/80 text-emerald-600">{summary?.total || ''}</td>
            </tr>
            <tr className="hover-row">
                <td className="sticky-col p-1 text-[8px] font-black text-slate-400 sticky left-32 sm:left-40 z-[140] bg-white text-center border-b border-slate-50 border-r border-slate-100 w-9 sm:w-11">SIANG</td>
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
                    const isActive = isCellActive(day, 'Siang');

                    return (
                        <td
                            key={`siang-${i}`}
                            data-day={day}
                            data-session="Siang"
                            data-profil-id={p.profil_id}
                            className={`activity-day-cell p-0 text-center relative group activity-cell border-b border-slate-50 border-r border-slate-100/80 ${(isWeekend || isHoliday) ? 'bg-red-200/40' : ''} ${isToday ? 'bg-indigo-50/30' : ''} ${isActive ? 'activity-cell-active shadow-[inset_0_0_0_2px_#6366f1]' : ''} ${activities.length > 0 || canEdit ? 'cursor-pointer' : ''}`}
                            title={holiday?.keterangan || (isWeekend ? 'Weekend' : '')}
                        >
                            {isToday && <div className="absolute inset-y-0 left-0 w-[2px] bg-indigo-500/50 z-10 pointer-events-none"></div>}
                            {activities.length > 0 ? (
                                <CellMarker activities={activities} type={type} />
                            ) : (
                                <div
                                    className={`w-full h-7 flex items-center justify-center text-[9px] font-black border-r border-slate-100/80 ${(isWeekend || isHoliday) ? 'text-red-100' : 'text-slate-200'} ${canEdit ? 'cursor-pointer' : ''}`}
                                >
                                    {isWeekend ? '✕' : '+'}
                                </div>
                            )}
                        </td>
                    );
                })}
            </tr>
        </tbody>
    );
});

const YearlyRow = React.memo(({ p, activityTypes, canEdit, isSummaryExpanded, onSelectPegawaiDetail }: any) => {
    return (
        <tr className="hover:bg-slate-50/50 transition-colors">
            <td className="p-4 py-3 sticky left-0 z-[150] bg-white border-b border-slate-50 border-r border-slate-100 transition-colors">
                <div 
                    className="cursor-pointer group/name select-none"
                    onClick={() => onSelectPegawaiDetail?.(p)}
                    title="Klik untuk melihat biodata / CV pegawai"
                >
                    <div className="text-sm font-bold text-slate-800 group-hover/name:text-indigo-600 group-hover/name:underline transition-colors">{p.nama_lengkap}</div>
                    <div className="text-[10px] font-medium text-slate-400 uppercase tracking-tight">{p.bidang_singkatan || p.bidang_nama || 'Bapperida'}</div>
                </div>
            </td>
            {isSummaryExpanded && activityTypes.filter((t: any) => !t.parent_id).map((t: any) => (
                <td key={t.kode} className="p-4 text-center text-sm font-bold text-slate-700 border-b border-slate-50 border-r border-slate-100/80">
                    {p.summary?.[t.kode] || 0}
                </td>
            ))}
            <td className="p-4 text-center text-sm font-black text-ppm-slate bg-slate-50/50 border-b border-slate-50">
                {p.summary?.total || 0}
            </td>
        </tr>
    );
});


const MonthlyTableContent = React.memo(({
    daysInMonth, month, year, holidays, tDay, tMonth, tYear,
    activityTypes, flatActivityTypes, hierarchicalActivityTypes, filteredData, canEdit,
    handleDownloadPNG, isExporting, handleToggleHoliday, handleTableClick,
    handleBodyScroll, handleTableMouseMove, handleTableMouseLeave,
    handleSelectActivity, onViewDoc, suratList,
    monthlyHeaderRef, monthlyTableRef, colOverlayRef, activeCellOverlayRef,
    headerHeight, dayNamesShort,
    isSummaryExpanded, setIsSummaryExpanded, activeCell,
    searchTerm, setSearchTerm,
    onSelectPegawaiDetail
}: any) => {
    return (
        <div className="space-y-1.5">
            {/* Compact Header Bar: Title, Legenda & Tombol Unduh Tema 2 */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 bg-white p-2 px-3 rounded-2xl border border-slate-100 shadow-xs">
                <div className="flex items-center gap-2.5">
                    <div className="bg-emerald-50 p-1.5 rounded-xl border border-emerald-100 text-emerald-600">
                        <Calendar size={15} />
                    </div>
                    <div>
                        <h3 className="text-xs font-black text-slate-800 leading-tight">Logbook Bulanan</h3>
                        <p className="text-[8.5px] font-bold text-slate-400 uppercase tracking-wider leading-none mt-0.5">Aktivitas Harian Pegawai</p>
                    </div>
                </div>

                {/* Right: Compact Legenda & Tombol Unduh Logbook Tema 2 */}
                <div className="flex items-center gap-2 flex-wrap">
                    {/* Compact Legenda */}
                    <div className="flex items-center gap-1.5 py-1 px-2.5 bg-slate-50/90 rounded-xl border border-slate-100 text-[8.5px]">
                        <span className="font-bold text-slate-400 uppercase tracking-wider mr-0.5">Legenda:</span>
                        {flatActivityTypes
                            .filter((t: any) => !t.children || t.children.length === 0)
                            .map((t: any) => (
                                <div key={t.kode} className="relative flex items-center gap-1 px-1 py-0.5 rounded hover:bg-white transition-colors cursor-help group">
                                    <div className={`w-1.5 h-1.5 rounded-full ${t.warna} shadow-2xs`}></div>
                                    <span className="font-black text-slate-700 uppercase">{t.kode}</span>

                                    {/* Tooltip */}
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 bg-slate-800 text-white text-[9px] font-bold rounded-lg opacity-0 group-hover:opacity-100 transition-all pointer-events-none whitespace-nowrap shadow-xl translate-y-1 group-hover:translate-y-0 z-[600]">
                                        {t.deskripsi || t.nama}
                                        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-800"></div>
                                    </div>
                                </div>
                            ))}
                    </div>

                    {/* Employee Search Field - Tepat di sebelah tombol Unduh Logbook */}
                    <SearchField value={searchTerm} onSearch={setSearchTerm} />

                    {/* Tombol Unduh Logbook - Warna Tema 2 */}
                    <button
                        onClick={() => handleDownloadPNG()}
                        disabled={isExporting}
                        style={{
                            backgroundColor: 'var(--theme-color-1, #0097fe)',
                            color: 'var(--theme-text-on-primary, #ffffff)'
                        }}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-[9.5px] font-black uppercase tracking-wider shadow-sm hover:brightness-110 active:scale-95 disabled:opacity-50 transition-all shrink-0 cursor-pointer"
                        title="Unduh seluruh logbook kegiatan dalam format PNG (Tanggal 01 s/d Tanggal Akhir)"
                    >
                        {isExporting ? <Loader2 size={12} className="animate-spin text-white" /> : <FileImage size={12} className="text-white" />}
                        <span className="text-white font-bold">{isExporting ? 'Memproses...' : 'Unduh Logbook'}</span>
                    </button>
                </div>
            </div>

            <div
                ref={monthlyHeaderRef}
                className="overflow-hidden sticky z-[450] bg-[#f8fafc] transition-all duration-300 shadow-sm"
                style={{ top: `${headerHeight - 1}px` }}
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
                            <th className="p-3 text-[9px] font-black text-slate-400 uppercase tracking-widest sticky !left-0 bg-white z-[160] border-b border-t border-slate-100 shadow-[0_1px_0_rgba(0,0,0,0.05)]">
                                Nama Pegawai
                            </th>
                            <th className="p-1 text-[9px] font-black text-slate-400 uppercase tracking-widest sticky !left-32 sm:!left-40 bg-white z-[155] text-center border-b border-t border-slate-100 border-r border-slate-100 shadow-[0_1px_0_rgba(0,0,0,0.05)]">
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
                                        className={`p-1 text-center text-[9px] font-black w-8 cursor-pointer transition-colors border-b border-t border-slate-100 border-r border-slate-100/80 shadow-[0_1px_0_rgba(0,0,0,0.05)] relative z-0
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
                            isSummaryExpanded={isSummaryExpanded}
                            activeCell={activeCell}
                            headerHeight={headerHeight}
                            onSelectPegawaiDetail={onSelectPegawaiDetail}
                        />
                    ))}
                </table>
            </div>
        </div>
    );
});

interface KegiatanPerOrangProps {
    headerHeight?: number;
    initialProfilId?: number | null;
    initialDate?: string | null;
}

export default function KegiatanPerOrang({
    headerHeight = 105,
    initialProfilId = null,
    initialDate = null
}: KegiatanPerOrangProps) {
    const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

    useEffect(() => {
        setPortalTarget(document.getElementById('manajemen-kegiatan-actions'));
    }, []);

    const [isSummaryExpanded, setIsSummaryExpanded] = useState(false);
    const { user } = useAuth();
    
    const isDeletableUser = (() => {
        if (!user) return false;
        const roleName = String(user.tipe_user_nama || '').toLowerCase().trim();
        const roleId = Number(user.tipe_user_id || 0);
        const username = String(user.username || '').toLowerCase().trim();
        
        const isSuperadmin = roleId === 1 || roleName === 'superadmin' || roleName === 'super admin' || username === 'superadmin';
        const isSuperadminOrAdmin = isSuperadmin || roleId === 2 || roleName === 'admin instansi';
        
        const jab = String(user.jabatan_nama || (user as any).jabatan || '').toLowerCase();
        const isRealKepala = (jab.includes('kepala') && !jab.includes('bidang') && !jab.includes('sub bag') && !jab.includes('seksi') && !jab.includes('sub bidang')) || roleName.includes('kepala') || roleName.includes('dinas');
        const isRealSekretaris = jab.includes('sekretaris') || roleName.includes('sekretaris');
        const isKepalaOrSekretaris = isRealKepala || isRealSekretaris;
        
        const isKabid = jab.includes('kabid') || jab.includes('kepala bidang');
        const isKatim = jab.includes('katim') || jab.includes('ketua tim');
        const isAdminBidang = roleName === 'admin bidang' || roleName.includes('admin bidang') || roleName.includes('verifikator') || jab.includes('admin bidang') || jab.includes('verifikator');
        
        return isKabid || isKatim || isAdminBidang || isSuperadminOrAdmin || isKepalaOrSekretaris;
    })();
    const [view, setView] = useState<'monthly' | 'yearly'>('monthly');
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [year, setYear] = useState(new Date().getFullYear());
    const [bidangId, setBidangId] = useState<string>('all');
    const [data, setData] = useState<any[]>([]);
    const [instansiList, setInstansiList] = useState<any[]>([]);
    const [selectedInstansi, setSelectedInstansi] = useState<number | null>(null);
    const [bidangList, setBidangList] = useState<any[]>([]);
    const [masterPegawaiList, setMasterPegawaiList] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Sync initialDate
    useEffect(() => {
        if (initialDate) {
            const parts = initialDate.split('-');
            if (parts.length === 3) {
                setYear(Number(parts[0]));
                setMonth(Number(parts[1]));
            }
        }
    }, [initialDate]);

    // Auto-scroll to target officer if initialProfilId provided
    useEffect(() => {
        if (initialProfilId && !isLoading) {
            const timer = setTimeout(() => {
                const el = document.getElementById(`pegawai-tbody-${initialProfilId}`);
                if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    el.classList.add('bg-blue-50/60');
                    setTimeout(() => {
                        el.classList.remove('bg-blue-50/60');
                    }, 3000);
                }
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [initialProfilId, isLoading]);
    const [isSaving, setIsSaving] = useState(false);
    const [activeCell, setActiveCell] = useState<{ profil_id: number; day: number; session: 'Pagi' | 'Siang'; rect?: DOMRect; activities?: any[]; nama?: string } | null>(null);
    const [rangeSelection, setRangeSelection] = useState<{ id?: number | null; profil_id: number; startDay: number; endDay: number; tipe_kegiatan: string; keterangan: string; selectedProfilIds: number[]; suratIds?: string[] } | null>(null);
    const [suratList, setSuratList] = useState<any[]>([]);
    const [holidays, setHolidays] = useState<any[]>([]);
    const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
    const [activityTypes, setActivityTypes] = useState<ActivityType[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [masterDokumenList, setMasterDokumenList] = useState<any[]>([]);
    const [holidayPrompt, setHolidayPrompt] = useState<{ day: number; tanggal: string; duration: number; keterangan: string } | null>(null);
    const [holidayOptions, setHolidayOptions] = useState<{ day: number; tanggal: string; keterangan: string } | null>(null);
    const [hoveredCellData, setHoveredCellData] = useState<TooltipData | null>(null);
    const [showOnlyWithActivities, setShowOnlyWithActivities] = useState(false);
    
    // Unified Modal State
    const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
    const [editingActivityForModal, setEditingActivityForModal] = useState<any>(null);
    const [modalContext, setModalContext] = useState<{
        profil_id: number;
        day: number;
        session: 'Pagi' | 'Siang';
        recordId?: number | null;
        externalId?: number | null;
    } | null>(null);
    const [tematikList, setTematikList] = useState<any[]>([]);
    const [viewedDoc, setViewedDoc] = useState<{ path: string, name: string, is_private?: number | boolean, uploaded_by?: number, kegiatan_id?: number, dokumen_id?: number } | null>(null);
    const [selectedPetugasDetail, setSelectedPetugasDetail] = useState<any | null>(null);

    // RESTRICTION LOGIC:
    // 1. Akun biasa / petugas: Hanya bisa membuat Cuti dan Sakit untuk dirinya sendiri.
    // 2. Admin Bidang: Bisa membuat Cuti dan Sakit untuk semua orang di bidangnya.
    // 3. Admin Instansi: Bisa membuat Cuti dan Sakit untuk semua orang di instansinya.
    // 4. Superadmin: Memiliki akses penuh global.
    const canManageEmployeeActivity = useCallback((targetProfilId: number | undefined | null) => {
        if (!user || !targetProfilId) return false;

        const roleName = String(user.tipe_user_nama || '').toLowerCase().trim();
        const roleId = Number(user.tipe_user_id || 0);
        const username = String(user.username || '').toLowerCase().trim();
        const userScope = Number((user as any)?.dbScope || 0);

        // 1. Superadmin (Global)
        if (roleId === 1 || roleName === 'superadmin' || roleName === 'super admin' || username === 'superadmin' || userScope === 4) {
            return true;
        }

        // 2. Cek Diri Sendiri (Semua akun bisa membuat Cuti/Sakit untuk dirinya sendiri)
        if (
            (user.profil_pegawai_id && Number(user.profil_pegawai_id) === Number(targetProfilId)) ||
            ((user as any).pegawai_id && Number((user as any).pegawai_id) === Number(targetProfilId)) ||
            (user.id && Number(user.id) === Number(targetProfilId))
        ) {
            return true;
        }

        // Cari profil target pegawai
        const targetPegawai = masterPegawaiList.find(p => Number(p.id) === Number(targetProfilId) || Number(p.profil_id) === Number(targetProfilId))
            || data.find(p => Number(p.profil_id) === Number(targetProfilId) || Number(p.id) === Number(targetProfilId));

        if (!targetPegawai) {
            return false;
        }

        // Cek self-matching via NIP atau nama lengkap jika ID profil berbeda
        if (
            (user.nip && targetPegawai.nip && String(user.nip).trim() === String(targetPegawai.nip).trim()) ||
            (user.nama_lengkap && targetPegawai.nama_lengkap && user.nama_lengkap.trim().toLowerCase() === targetPegawai.nama_lengkap.trim().toLowerCase())
        ) {
            return true;
        }

        const targetInstansiId = targetPegawai.instansi_id ? Number(targetPegawai.instansi_id) : (selectedInstansi ? Number(selectedInstansi) : null);
        const targetBidangId = targetPegawai.bidang_id ? Number(targetPegawai.bidang_id) : null;

        const jab = String(user.jabatan_nama || (user as any).jabatan || '').toLowerCase();
        const isRealKepala = (jab.includes('kepala') && !jab.includes('bidang') && !jab.includes('sub')) || jab.includes('kaban') || jab.includes('kadis');

        // 3. Admin Instansi: Semua orang di instansinya
        const isAdminInstansi = roleId === 2 || roleName.includes('admin instansi') || isRealKepala || userScope === 3;
        if (isAdminInstansi) {
            if (!user.instansi_id || !targetInstansiId || Number(user.instansi_id) === targetInstansiId) {
                return true;
            }
        }

        // 4. Admin Bidang: Semua orang di bidangnya
        const isKabid = jab.includes('kabid') || jab.includes('kepala bidang');
        const isKatim = jab.includes('katim') || jab.includes('ketua tim');
        const isAdminBidang = roleId === 4 || roleId === 6 || roleId === 9 || roleId === 10 || roleName.includes('admin bidang') || roleName.includes('verifikator') || jab.includes('admin bidang') || jab.includes('verifikator') || isKabid || isKatim || userScope === 2;
        if (isAdminBidang) {
            const sameInstansi = !user.instansi_id || !targetInstansiId || Number(user.instansi_id) === targetInstansiId;
            const sameBidang = !user.bidang_id || !targetBidangId || Number(user.bidang_id) === targetBidangId;
            if (sameInstansi && sameBidang) {
                return true;
            }
        }

        // 5. Akun biasa / Petugas: Hanya untuk diri sendiri (sudah diverifikasi pada langkah 2)
        return false;
    }, [user, masterPegawaiList, data, selectedInstansi]);

    const daysInMonth = useMemo(() => {
        return new Date(year, month, 0).getDate();
    }, [year, month]);

    const menuHideTimeoutRef = useRef<number | null>(null);


    const monthlyHeaderRef = useRef<HTMLDivElement>(null);
    const monthlyTableRef = useRef<HTMLDivElement>(null);
    // INFRASTRUKTUR SELUNCUR: Menggunakan elemen tunggal di luar React Tree (Imperatif)
    const colOverlayRef = useRef<HTMLDivElement>(null);
    const activeCellOverlayRef = useRef<HTMLDivElement>(null);
    const lastHoveredCellKeyRef = useRef<string | null>(null);
    const showTimeoutRef = useRef<number | null>(null);
    const hideTimeoutRef = useRef<number | null>(null);
    const yearlyHeaderRef = useRef<HTMLDivElement>(null);
    const yearlyTableRef = useRef<HTMLDivElement>(null);
    const captureRef = useRef<HTMLDivElement>(null);

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
            // Case 1: Monthly View (has p.activities) - Calculate summary on the fly
            if (p.activities && Object.keys(p.activities).length > 0) {
                // Initialize for ALL known codes (including children) so columns aren't empty
                const summary: any = flatActivityTypes.reduce((acc, t) => ({ ...acc, [t.kode]: 0 }), { total: 0 });

                Object.entries(p.activities).forEach(([day, dayData]: any) => {
                    const allDayActs: any[] = [...(dayData.Pagi || []), ...(dayData.Siang || [])];
                    const processedThisDay = new Set<string>(); // To prevent double counting non-rapat same type in sessions

                    // 1. Non-Rapat Activities: 1 per day per UNIQUE type
                    ['Pagi', 'Siang'].forEach(session => {
                        const sessionActivities: any[] = dayData[session] || [];
                        sessionActivities.forEach((act: any) => {
                            const leafType = flatActivityTypes.find(t => t.kode === act.tipe);
                            // Find the top-level parent for this type
                            const parentDef = activityTypes.find(t => t.kode === act.tipe || (act.tipe && t.children?.some((s: any) => s.kode === act.tipe)));

                            if (leafType && !leafType.is_rapat && !parentDef?.is_rapat) {
                                // Double counting protection: if same specific type on Pagi and Siang, count as 1
                                const typeKey = act.tipe;
                                if (!processedThisDay.has(typeKey)) {
                                    summary[typeKey] += 1;
                                    summary.total += 1;
                                    // If this is a child type, also increment the parent for the main summary tab
                                    if (parentDef && parentDef.kode !== typeKey) {
                                        summary[parentDef.kode] += 1;
                                    }
                                    processedThisDay.add(typeKey);
                                }
                            }
                        });
                    });

                    // 2. Rapat Activities: Count distinct internal meeting IDs across the WHOLE day
                    // Group meetings by their top-level parent category
                    hierarchicalActivityTypes.filter(t => t.is_rapat).forEach(rapatType => {
                        // Find all acts that belong to this rapat category or its children
                        const rapatActs = allDayActs.filter(a => a.tipe === rapatType.kode || rapatType.children?.some((s: any) => s.kode === a.tipe));

                        // Count unique meetings (by ID)
                        const meetingIds = new Set(rapatActs.map(a => a.id_eksternal).filter(id => id && id !== ''));

                        if (meetingIds.size > 0) {
                            summary[rapatType.kode] += meetingIds.size;
                            summary.total += meetingIds.size;

                            // Also increment specific child codes if any, unique per meeting
                            // (e.g. if one meeting was "RM off", count 1 for "RM off" column)
                            rapatActs.forEach(a => {
                                const subMeetingIds = new Set(rapatActs.filter(ra => ra.tipe === a.tipe).map(ra => ra.id_eksternal).filter(id => id && id !== ''));
                                if (a.tipe !== rapatType.kode && summary[a.tipe] !== undefined) {
                                    // Note: This is an approximation as one meeting might span multiple types (rare)
                                    // We set it to the size of unique meetings found for THIS specific sub-type
                                    summary[a.tipe] = subMeetingIds.size;
                                }
                            });
                        }
                    });
                });
                return { ...p, summary };
            }

            // Case 2: Yearly View or Fallback (no activities) - Use existing summary from API
            return {
                ...p,
                summary: p.summary || flatActivityTypes.reduce((acc, t) => ({ ...acc, [t.kode]: 0 }), { total: 0 })
            };
        });
    }, [data, activityTypes, flatActivityTypes, hierarchicalActivityTypes]);

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

        // Find activities from memoized processedData
        const personData = processedData.find(p => p.profil_id === profilId);
        const activities = personData?.activities?.[day]?.[session] || [];

        // RESTRICTION CHECK:
        // Jika cell kosong (tidak ada kegiatan) dan user tidak memiliki wewenang mengelola pegawai ini:
        // Jangan buka popover menu (karena tidak ada kegiatan untuk dilihat dan tidak berhak membuat Cuti/Sakit)
        const canManage = canManageEmployeeActivity(profilId);
        if (activities.length === 0 && !canManage) {
            setActiveCell(null);
            if (activeCellOverlayRef.current) activeCellOverlayRef.current.style.display = 'none';
            return;
        }

        // Toggle logically: if the same cell is clicked, close it
        if (activeCell && activeCell.profil_id === profilId && activeCell.day === day && activeCell.session === session) {
            setActiveCell(null);
            lastHoveredCellKeyRef.current = null; // Reset hover key to allow tooltip/re-click to work immediately
            if (activeCellOverlayRef.current) activeCellOverlayRef.current.style.display = 'none';
            return;
        }

        // 1. Reset hover key before opening new menu to ensure tooltip logic is clean
        lastHoveredCellKeyRef.current = null;

        // Update indicator overlay (visual feedback instantly via imperative DOM)
        const overlay = activeCellOverlayRef.current;
        if (overlay) {
            overlay.style.left = td.offsetLeft + 'px';
            overlay.style.top = td.offsetTop + 'px';
            overlay.style.width = td.offsetWidth + 'px';
            overlay.style.height = td.offsetHeight + 'px';
            overlay.style.display = 'block';
        }

        // Hide active tooltip and clear show timeout when cell is clicked to prevent overlap
        if (showTimeoutRef.current) {
            clearTimeout(showTimeoutRef.current);
            showTimeoutRef.current = null;
        }
        if (hideTimeoutRef.current) {
            clearTimeout(hideTimeoutRef.current);
            hideTimeoutRef.current = null;
        }
        setHoveredCellData(null);

        setActiveCell({ 
            profil_id: profilId, 
            day, 
            session, 
            rect, 
            activities,
            nama: personData?.nama_lengkap || ''
        });
    }, [processedData, activeCell, canManageEmployeeActivity]);

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
            const target = e.target as HTMLElement;
            if (!target || typeof target.closest !== 'function') return;

            // 1. Tooltip Inhibition: If menu is open, don't show tooltips
            if (activeCell) {
                if (showTimeoutRef.current) {
                    clearTimeout(showTimeoutRef.current);
                    showTimeoutRef.current = null;
                }
                if (hideTimeoutRef.current) {
                    clearTimeout(hideTimeoutRef.current);
                    hideTimeoutRef.current = null;
                }
                setHoveredCellData(null);
                return;
            }

            // Allow mouse to enter the global tooltip itself without hiding it
            if (target.closest('.global-cell-tooltip')) {
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
                .find(el => (el as HTMLElement).closest?.('td[data-day]'))
                ?.closest?.('td[data-day]') as HTMLElement | null;

            const overlay = colOverlayRef.current;
            if (!overlay || !td) {
                if (showTimeoutRef.current) {
                    clearTimeout(showTimeoutRef.current);
                    showTimeoutRef.current = null;
                }
                if (!hideTimeoutRef.current && hoveredCellData) {
                    hideTimeoutRef.current = window.setTimeout(() => {
                        setHoveredCellData(null);
                    }, 300);
                }
                if (overlay) overlay.style.display = 'none';
                return;
            }

            const dayAttr = td.getAttribute('data-day');
            const profilIdAttr = td.getAttribute('data-profil-id');
            const session = td.getAttribute('data-session') as 'Pagi' | 'Siang';

            if (!dayAttr || !profilIdAttr) return;

            const day = parseInt(dayAttr);
            const profilId = parseInt(profilIdAttr);
            const cellKey = `${profilId}_${day}_${session}`;

            // Imperatively move column overlay (zero style recalculation overhead)
            const table = monthlyTableRef.current?.querySelector('table');
            overlay.style.left = (td.offsetLeft || 0) + 'px';
            overlay.style.width = (td.offsetWidth || 0) + 'px';
            overlay.style.top = '0px';
            overlay.style.height = (table?.offsetHeight || 500) + 'px';
            overlay.style.display = 'block';

            const targetHoveredKey = hoveredCellData 
                ? `${hoveredCellData.profil_id}_${hoveredCellData.day}_${hoveredCellData.session}` 
                : null;

            if (cellKey === targetHoveredKey) {
                // Same cell as current open tooltip: Clear any pending hide timeout
                if (hideTimeoutRef.current) {
                    clearTimeout(hideTimeoutRef.current);
                    hideTimeoutRef.current = null;
                }
            } else if (hoveredCellData && !hideTimeoutRef.current) {
                // Moved to another cell: Start 300ms hide timer if not already running
                hideTimeoutRef.current = window.setTimeout(() => {
                    setHoveredCellData(null);
                    hideTimeoutRef.current = null;
                }, 300);
            }

            if (cellKey === lastHoveredCellKeyRef.current) {
                return;
            }

            // NEW CELL:
            lastHoveredCellKeyRef.current = cellKey;
            if (showTimeoutRef.current) {
                clearTimeout(showTimeoutRef.current);
                showTimeoutRef.current = null;
            }

            // Find activities from memoized processedData
            const personData = processedData.find(p => p.profil_id === profilId);
            const activities = personData?.activities?.[day]?.[session] || [];

            if (activities.length > 0) {
                const rect = td.getBoundingClientRect();
                const cellData: TooltipData = {
                    profil_id: profilId,
                    activities,
                    nama: personData?.nama_lengkap || '',
                    session,
                    day,
                    rect: {
                        left: rect.left,
                        top: rect.top,
                        width: rect.width,
                        bottom: rect.bottom
                    }
                };
                // User request: delay muncul 0,3 detik (300ms)
                showTimeoutRef.current = window.setTimeout(() => {
                    if (hideTimeoutRef.current) {
                        clearTimeout(hideTimeoutRef.current);
                        hideTimeoutRef.current = null;
                    }
                    setHoveredCellData(cellData);
                    showTimeoutRef.current = null;
                }, 300);
            }
        } catch (err) {
            console.error('Tooltip Tracking Error:', err);
        }
    }, [processedData, hoveredCellData, activeCell]);

    const handleTableMouseLeave = useCallback(() => {
        lastHoveredCellKeyRef.current = null;
        if (showTimeoutRef.current) {
            clearTimeout(showTimeoutRef.current);
            showTimeoutRef.current = null;
        }
        if (colOverlayRef.current) colOverlayRef.current.style.display = 'none';

        // Use 300ms delay for hiding if not already running
        if (!hideTimeoutRef.current && hoveredCellData) {
            hideTimeoutRef.current = window.setTimeout(() => {
                setHoveredCellData(null);
                hideTimeoutRef.current = null;
            }, 300);
        }
    }, [hoveredCellData]);

    // Global listener to ensure modal closes 0.3s after cursor leaves target cell or modal (even if cursor moves continuously)
    useEffect(() => {
        if (!hoveredCellData) return;

        const handleGlobalMouseMove = (e: MouseEvent) => {
            // Check if cursor is over the tooltip itself or the document attachment popup
            const targetNode = e.target as HTMLElement | null;
            const isOverTooltip = !!targetNode?.closest?.('.global-cell-tooltip');
            const isOverDocPopup = !!targetNode?.closest?.('.doc-attachment-popup');

            if (isOverTooltip || isOverDocPopup) {
                if (hideTimeoutRef.current) {
                    clearTimeout(hideTimeoutRef.current);
                    hideTimeoutRef.current = null;
                }
                return;
            }

            // Also check elementsFromPoint in case of layered elements
            const elements = document.elementsFromPoint(e.clientX, e.clientY);
            const isOverAnyModal = elements?.some(el => 
                (el as HTMLElement).closest?.('.global-cell-tooltip') || 
                (el as HTMLElement).closest?.('.doc-attachment-popup')
            );
            if (isOverAnyModal) {
                if (hideTimeoutRef.current) {
                    clearTimeout(hideTimeoutRef.current);
                    hideTimeoutRef.current = null;
                }
                return;
            }

            // Check if cursor is over the target cell
            const targetTd = elements?.find(el => {
                const td = (el as HTMLElement).closest?.('td[data-day]');
                if (!td) return false;
                const d = td.getAttribute('data-day');
                const p = td.getAttribute('data-profil-id');
                const s = td.getAttribute('data-session');
                return (
                    Number(d) === hoveredCellData.day &&
                    Number(p) === hoveredCellData.profil_id &&
                    s === hoveredCellData.session
                );
            });

            if (targetTd) {
                if (hideTimeoutRef.current) {
                    clearTimeout(hideTimeoutRef.current);
                    hideTimeoutRef.current = null;
                }
                return;
            }

            // Cursor is neither in target cell nor in modal:
            // Ensure 300ms countdown is running (DO NOT reset if already running!)
            if (!hideTimeoutRef.current) {
                hideTimeoutRef.current = window.setTimeout(() => {
                    setHoveredCellData(null);
                    hideTimeoutRef.current = null;
                }, 300);
            }
        };

        window.addEventListener('mousemove', handleGlobalMouseMove, { passive: true });
        return () => {
            window.removeEventListener('mousemove', handleGlobalMouseMove);
        };
    }, [hoveredCellData]);



    const isSuperAdmin = user?.tipe_user_id === 1;
    const isAdminInstansi = user?.tipe_user_id === 2;
    const canChangeBidang = isSuperAdmin || isAdminInstansi;


    const filteredData = useMemo(() => {
        let filtered = processedData;
        
        if (searchTerm) {
            const lowerSearch = searchTerm.toLowerCase();
            filtered = filtered.filter(p =>
                p.nama_lengkap.toLowerCase().includes(lowerSearch)
            );
        }

        if (showOnlyWithActivities) {
            filtered = filtered.filter(p => {
                const hasActivities = p.activities && Object.keys(p.activities).length > 0;
                // Double check summary total if activities map is empty (e.g. Yearly view)
                const hasTotal = p.summary && p.summary.total > 0;
                return hasActivities || hasTotal;
            });
        }

        return filtered;
    }, [processedData, searchTerm, showOnlyWithActivities]);

    // Roles: Super Admin (1), Admin Bidang (4), Kepala Bidang (6)
    const canEdit = [1, 4, 6].includes(user?.tipe_user_id || 0);

    const monthNames = [
        "Januari", "Februari", "Maret", "April", "Mei", "Juni",
        "Juli", "Agustus", "September", "Oktober", "November", "Desember"
    ];

    const dayNamesShort = ["M", "S", "S", "R", "K", "J", "S"];

    const [exportTarget, setExportTarget] = useState<{
        mode: 'all' | 'single';
        person?: any;
    } | null>(null);
    const [isExporting, setIsExporting] = useState(false);

    // Exact pixel calculation to guarantee NOT A SINGLE COLUMN OR DATE IS CUT OFF (Tanpa Kolom Rekapitulasi)
    // Kolom: No (36px) + Pegawai (240px) + Sesi (50px) + Tanggal (daysInMonth * 34px) + Padding Kiri Kanan (80px)
    const captureWidth = useMemo(() => {
        return 36 + 240 + 50 + (daysInMonth * 34) + 80;
    }, [daysInMonth]);

    const targetEmployees = useMemo(() => {
        if (exportTarget?.mode === 'single' && exportTarget?.person) {
            return [exportTarget.person];
        }
        return filteredData;
    }, [exportTarget, filteredData]);

    const singlePersonActivities = useMemo(() => {
        if (!exportTarget?.person) return [];
        const emp = exportTarget.person;
        const list: any[] = [];
        if (!emp.activities) return list;

        for (let d = 1; d <= daysInMonth; d++) {
            ['Pagi', 'Siang'].forEach(session => {
                const acts = emp.activities?.[d]?.[session] || [];
                acts.forEach((act: any) => {
                    const date = new Date(year, month - 1, d);
                    const dayName = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'][date.getDay()];
                    const type = flatActivityTypes.find((t: any) => t.kode === act.tipe);
                    list.push({
                        day: d,
                        dateStr: `${String(d).padStart(2, '0')} ${monthNames[month - 1]} ${year}`,
                        dayName,
                        session,
                        tipe: act.tipe,
                        namaTipe: type?.nama || act.tipe,
                        keterangan: act.keterangan || act.nama || act.deskripsi || '-'
                    });
                });
            });
        }
        return list;
    }, [exportTarget, daysInMonth, year, month, monthNames, flatActivityTypes]);

    const handleDownloadPNG = async (targetPerson?: any) => {
        if (isExporting) return;
        setIsExporting(true);
        setExportTarget(targetPerson ? { mode: 'single', person: targetPerson } : { mode: 'all' });

        try {
            // Give browser and React enough time to paint offscreen container with exact target data
            await new Promise(resolve => setTimeout(resolve, 450));

            const element = captureRef.current;
            if (!element) {
                throw new Error('Elemen capture logbook tidak ditemukan');
            }

            const dataUrl = await toPng(element, {
                quality: 1.0,
                backgroundColor: '#ffffff',
                pixelRatio: 2,
                cacheBust: true,
                width: captureWidth,
                height: element.scrollHeight
            });

            const fileName = targetPerson
                ? `Logbook_${targetPerson.nama_lengkap.replace(/[^a-zA-Z0-9]/g, '_')}_${monthNames[month - 1]}_${year}.png`
                : `Logbook_Bulanan_${monthNames[month - 1]}_${year}.png`;

            const link = document.createElement('a');
            link.download = fileName;
            link.href = dataUrl;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            toast.success(`Logbook ${targetPerson ? targetPerson.nama_lengkap : 'Bulanan'} berhasil diunduh dalam bentuk PNG!`);
        } catch (error) {
            console.error('Error generating logbook PNG:', error);
            alert('Gagal mengunduh logbook PNG. Silakan coba lagi.');
        } finally {
            setIsExporting(false);
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
        api.instansiDaerah.getAll().then(res => {
            if (res.success) setInstansiList(res.data);
        }).catch(err => console.error('Failed to fetch instansi list:', err));
    }, []);

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
        const fetchPegawai = async () => {
            try {
                const params = (user?.tipe_user_id !== 1 && selectedInstansi) ? { instansi_id: selectedInstansi } : undefined;
                const res = await api.profilPegawai.getAll(params);
                if (res.success) {
                    setMasterPegawaiList(res.data || []);
                }
            } catch (err) {
                console.error('Failed to fetch master pegawai:', err);
            }
        };
        fetchPegawai();
    }, [selectedInstansi, user?.tipe_user_id]);

    useEffect(() => {
        api.tipeKegiatan.getAll().then(res => {
            if (res.success) setActivityTypes(res.raw || res.data);
        });
        // Fetch Tematik
        api.tematik.getAll().then(res => {
            if (res.success) setTematikList(res.data);
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
    
    const handleSelectActivity = useCallback(async (
        profil_id: number, 
        day: number, 
        session: 'Pagi' | 'Siang', 
        t: string | null, 
        recordId: number | null = null,
        externalId: number | string | null = null
    ) => {
        if (!canManageEmployeeActivity(profil_id)) {
            alert('Anda tidak memiliki izin untuk membuat Cuti/Sakit atau mengubah kegiatan pegawai ini.');
            setActiveCell(null);
            return;
        }

        try {
            const selectedType = flatActivityTypes.find(type => type.kode === t);
            const tanggal = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

            if (t) {
                // Konfirmasi penimpaan kegiatan dinas jika ada
                const existingActs = activeCell?.activities?.filter((a: any) => !['C', 'S'].includes(a.tipe)) || [];
                if (existingActs.length > 0) {
                    const singleOfficerAct = existingActs.find((a: any) => (a.petugas_count !== undefined ? a.petugas_count : 1) <= 1);
                    const empName = activeCell?.nama || 'Petugas ini';
                    const targetTipeName = selectedType?.nama || 'Cuti/Sakit';
                    const mName = monthNames[month - 1];
                    const tanggalText = `${day} ${mName} ${year}`;

                    if (singleOfficerAct) {
                        const actName = singleOfficerAct.nama || singleOfficerAct.activity_nama || 'kegiatan ini';
                        const confirmed = window.confirm(
                            `Peringatan Penting:\n` +
                            `Pegawai "${empName}" merupakan satu-satunya petugas pada kegiatan "${actName}" pada ${tanggalText}.\n\n` +
                            `Pengajuan ${targetTipeName} pada tanggal ini akan menimpa penugasan tersebut dan memindahkan kegiatan "${actName}" ke Tempat Sampah (lengkap dengan riwayat pencatatan).\n\n` +
                            `Apakah Anda yakin ingin melanjutkan dan mengajukan ${targetTipeName}?`
                        );
                        if (!confirmed) {
                            return;
                        }
                    } else {
                        const actNames = existingActs.map((a: any) => `"${a.nama || a.activity_nama || 'Kegiatan Dinas'}"`).join(', ');
                        const confirmed = window.confirm(
                            `Konfirmasi Penimpaan Kegiatan:\n` +
                            `Pegawai "${empName}" sudah memiliki kegiatan ${actNames} pada ${tanggalText}.\n\n` +
                            `Pengajuan ${targetTipeName} akan menimpa kegiatan dinas pada tanggal tersebut. Riwayat ketidakhadiran akan dicatat di History Kegiatan dan nama petugas di Daftar Kegiatan akan ditandai warna merah (hadir sebagian).\n\n` +
                            `Apakah Anda ingin melanjutkan pengajuan ${targetTipeName}?`
                        );
                        if (!confirmed) {
                            return;
                        }
                    }
                }

                setModalContext({
                    profil_id,
                    day,
                    session,
                    recordId,
                    externalId: null
                });
                setEditingActivityForModal({
                    id: null,
                    tanggal,
                    sesi: session,
                    jenis_kegiatan_id: selectedType?.id,
                    petugas_ids: profil_id.toString(),
                    dokumen: []
                });
                setIsActivityModalOpen(true);
                setActiveCell(null);
                return;
            }

            // isClearing logic
            await api.kegiatanPegawai.upsert({
                id: recordId,
                profil_pegawai_id: profil_id,
                tanggal,
                sesi: session,
                tipe_kegiatan: null,
                id_kegiatan_eksternal: externalId
            } as any);
            fetchData();
        } catch (err: any) {
            console.error('Error saving activity:', err);
            alert(err.response?.data?.message || 'Gagal menyimpan/menghapus kegiatan. Silakan coba lagi.');
        } finally {
            setActiveCell(null);
        }
    }, [flatActivityTypes, year, month, fetchData, canManageEmployeeActivity, activeCell]);

    const handleDeleteSingleDay = useCallback(async (
        profil_id: number,
        day: number,
        session: 'Pagi' | 'Siang',
        actId?: number | null,
        externalId?: number | string | null
    ) => {
        if (!canManageEmployeeActivity(profil_id)) {
            alert('Anda tidak memiliki izin untuk menghapus kegiatan pegawai ini.');
            return;
        }

        try {
            const tanggal = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            await api.kegiatanPegawai.upsert({
                id: actId || null,
                profil_pegawai_id: profil_id,
                tanggal,
                sesi: session,
                tipe_kegiatan: null,
                id_kegiatan_eksternal: externalId || null
            } as any);
            toast.success(`Berhasil menghapus penugasan khusus pada tanggal ${day} ${monthNames[month - 1]}`);
            fetchData();
        } catch (err: any) {
            console.error('Error deleting single day activity:', err);
            toast.error(err.response?.data?.message || 'Gagal menghapus kegiatan');
        } finally {
            setActiveCell(null);
        }
    }, [year, month, monthNames, fetchData, canManageEmployeeActivity]);

    const handleOpenAddActivityModal = useCallback((profilId: number, day: number, session: 'Pagi' | 'Siang') => {
        if (!canManageEmployeeActivity(profilId)) {
            alert('Anda tidak memiliki izin untuk menambah kegiatan untuk pegawai ini.');
            return;
        }

        const formattedDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const officerProfile = masterPegawaiList.find(p => p.id === profilId || String(p.id) === String(profilId)) || data.find(p => p.profil_id === profilId);
        const targetBidangId = officerProfile?.bidang_id || (bidangId !== 'all' ? Number(bidangId) : null);

        setModalContext({
            profil_id: profilId,
            day: day,
            session: session,
            recordId: null,
            externalId: null
        });
        setEditingActivityForModal({
            id: null,
            tanggal: formattedDate,
            tanggal_akhir: formattedDate,
            sesi: session,
            bidang_id: targetBidangId,
            petugas_ids: profilId.toString(),
            dokumen: []
        });
        setIsActivityModalOpen(true);
        setActiveCell(null);
        if (activeCellOverlayRef.current) activeCellOverlayRef.current.style.display = 'none';
    }, [year, month, bidangId, masterPegawaiList, data, canManageEmployeeActivity]);

    const handleOpenEditModal = useCallback(async (act: any, profilId: number, day: number, session: 'Pagi' | 'Siang') => {
        if (!canManageEmployeeActivity(profilId)) {
            alert('Anda tidak memiliki izin untuk mengedit kegiatan pegawai ini.');
            return;
        }

        const isFull = ['C', 'S', 'DL', 'DLB'].includes(act.tipe);
        const targetId = act.id_eksternal || act.activity_id;
        
        if (targetId) {
            try {
                const res = await api.kegiatanManajemen.getById(targetId);
                if (res.success && res.data) {
                    setModalContext({
                        profil_id: profilId,
                        day: day,
                        session: session,
                        recordId: act.id,
                        externalId: targetId
                    });
                    setEditingActivityForModal(res.data);
                    setIsActivityModalOpen(true);
                } else {
                    alert("Gagal mengambil detail kegiatan.");
                }
            } catch (err) {
                console.error('Failed to fetch activity details:', err);
                alert("Terjadi kesalahan saat mengambil detail kegiatan.");
            }
        } else {
            const formattedDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const officerProfile = masterPegawaiList.find(p => p.id === profilId || String(p.id) === String(profilId)) || data.find(p => p.profil_id === profilId);
            const targetBidangId = officerProfile?.bidang_id || (bidangId !== 'all' ? Number(bidangId) : null);

            setModalContext({
                profil_id: profilId,
                day: day,
                session: session,
                recordId: act.id,
                externalId: null
            });
            setEditingActivityForModal({
                id: act.id,
                tanggal: formattedDate,
                tanggal_akhir: formattedDate,
                sesi: isFull ? 'Full Day' : session,
                nama_kegiatan: act.nama || act.activity_nama || 'Tanpa Nama Kegiatan',
                jenis_kegiatan_id: flatActivityTypes.find(t => t.kode === act.tipe)?.id,
                keterangan: act.keterangan || '',
                petugas_ids: profilId.toString(),
                bidang_ids: targetBidangId ? targetBidangId.toString() : '',
                bidang_id: targetBidangId,
                tematik_ids: act.tematik_ids || '',
                instansi_penyelenggara: act.instansi_penyelenggara || '',
                kelengkapan: act.kelengkapan || '',
                dokumen: []
            });
            setIsActivityModalOpen(true);
        }
    }, [canManageEmployeeActivity, year, month, masterPegawaiList, data, bidangId, flatActivityTypes]);

    const handleBulkUpsert = async () => {
        if (!rangeSelection) return;
        setIsSaving(true);
        try {
            const { startDay, endDay, tipe_kegiatan, keterangan, selectedProfilIds } = rangeSelection as any;
            const promises = [];
            const start = Math.min(startDay, endDay);
            const end = Math.max(startDay, endDay);

            const isFullDayType = ['C', 'S', 'DL', 'DLB'].includes(tipe_kegiatan);

            for (const pid of rangeSelection.selectedProfilIds) {
                for (let d = start; d <= end; d++) {
                    const tanggal = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                    const recordId = (pid === rangeSelection.profil_id && d === rangeSelection.startDay) ? rangeSelection.id : null;

                    promises.push(api.kegiatanPegawai.upsert({
                        id: recordId,
                        profil_pegawai_id: pid,
                        tanggal,
                        sesi: 'Pagi',
                        tipe_kegiatan,
                        keterangan
                    } as any));

                    if (!isFullDayType) {
                        promises.push(api.kegiatanPegawai.upsert({
                            id: recordId,
                            profil_pegawai_id: pid,
                            tanggal,
                            sesi: 'Siang',
                            tipe_kegiatan,
                            keterangan
                        } as any));
                    }
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

    const handleToggleHoliday = async (day: number) => {
        if (!canEdit) return;
        try {
            const tanggal = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const existing = holidays.find(h => {
                const hDate = new Date(h.tanggal);
                return hDate.getDate() === day && hDate.getMonth() + 1 === month && hDate.getFullYear() === year;
            });

            if (existing) {
                setHolidayOptions({ day, tanggal, keterangan: existing.keterangan || '' });
            } else {
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
                duration: holidayPrompt.keterangan ? holidayPrompt.duration : 1,
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
                handleDownloadPNG={handleDownloadPNG}
                isExporting={isExporting}
                handleToggleHoliday={handleToggleHoliday}
                handleTableClick={handleTableClick}
                handleBodyScroll={handleBodyScroll}
                handleTableMouseMove={handleTableMouseMove}
                handleTableMouseLeave={handleTableMouseLeave}
                handleSelectActivity={handleSelectActivity}
                onViewDoc={(doc) => setViewedDoc(doc)}
                suratList={suratList}
                monthlyHeaderRef={monthlyHeaderRef}
                monthlyTableRef={monthlyTableRef}
                colOverlayRef={colOverlayRef}
                activeCellOverlayRef={activeCellOverlayRef}
                headerHeight={headerHeight}
                dayNamesShort={dayNamesShort}
                isSummaryExpanded={isSummaryExpanded}
                setIsSummaryExpanded={setIsSummaryExpanded}
                activeCell={activeCell}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                onSelectPegawaiDetail={setSelectedPetugasDetail}
            />
        );
    };

    const renderYearlyTable = () => {
        return (
            <div className="space-y-1.5">
                <div className="flex flex-wrap items-center justify-between gap-2.5 bg-white p-2 px-3 rounded-2xl border border-slate-100 shadow-xs">
                    <div className="flex items-center gap-2.5">
                        <div className="bg-indigo-50 p-1.5 rounded-xl border border-indigo-100 text-indigo-600">
                            <TrendingUp size={15} />
                        </div>
                        <div>
                            <h3 className="text-xs font-black text-slate-800 leading-tight">Rekap Tahunan</h3>
                            <p className="text-[8.5px] font-bold text-slate-400 uppercase tracking-wider leading-none mt-0.5">Akumulasi tahunan</p>
                        </div>
                    </div>

                    {/* Right: Compact Legenda & Search */}
                    <div className="flex items-center gap-2 flex-wrap">
                        {/* Compact Legenda */}
                        <div className="flex items-center gap-1.5 py-1 px-2.5 bg-slate-50/90 rounded-xl border border-slate-100 text-[8.5px]">
                            <span className="font-bold text-slate-400 uppercase tracking-wider mr-0.5">Legenda:</span>
                            {activityTypes.filter(t => !t.parent_id).map(t => (
                                <div key={t.kode} className="relative flex items-center gap-1 px-1 py-0.5 rounded hover:bg-white transition-colors cursor-help group">
                                    <div className={`w-1.5 h-1.5 rounded-full ${t.warna} shadow-2xs`}></div>
                                    <span className="font-black text-slate-700 uppercase">{t.kode}</span>

                                    {/* Tooltip */}
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 bg-slate-800 text-white text-[9px] font-bold rounded-lg opacity-0 group-hover:opacity-100 transition-all pointer-events-none whitespace-nowrap shadow-xl translate-y-1 group-hover:translate-y-0 z-[600]">
                                        {t.deskripsi || t.nama}
                                        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-800"></div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Employee Search Field */}
                        <SearchField value={searchTerm} onSearch={setSearchTerm} />
                    </div>
                </div>

                {/* 1. Header Container - Sticky vertically to page */}
                <div
                    ref={yearlyHeaderRef}
                    className="overflow-hidden sticky z-[450] bg-[#f8fafc] transition-all duration-300 shadow-sm"
                    style={{ top: headerHeight - 1 }}
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
                                <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest sticky !left-0 bg-white z-[160] border-b border-t border-slate-100 shadow-[0_1px_0_rgba(0,0,0,0.05)]">Nama Pegawai</th>
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
                                    onSelectPegawaiDetail={setSelectedPetugasDetail}
                                />
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    return (
        <div className="max-w-full relative bg-[#f8fafc] pb-4 animate-in fade-in duration-500">
            {portalTarget && createPortal(
                <div className="flex flex-wrap items-center gap-1.5 lg:gap-2">
                    {/* Instansi Select (Super Admin Only) */}
                    {isSuperAdmin && (
                        <SearchableSelect
                            label="Instansi"
                            options={instansiList}
                            keyField="id"
                            displayField="instansi"
                            value={selectedInstansi}
                            onChange={(val) => setSelectedInstansi(val)}
                            className="w-48 text-[9px] font-bold [&>div]:!bg-white/80 [&>div]:!border-slate-200/50 [&>div]:!shadow-sm [&>div]:!rounded-xl [&>div]:!h-8 [&>div]:!py-1.5 [&>div]:!min-h-[32px]"
                        />
                    )}

                    {/* View Toggle (Bulanan / Tahunan) */}
                    <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-lg border border-slate-200/50 h-8">
                        <button
                            onClick={() => setView('monthly')}
                            style={{ color: view === 'monthly' ? 'var(--theme-color-1, #0097fe)' : undefined }}
                            className={`px-3 py-1 text-[8px] font-black uppercase tracking-widest rounded-md transition-all duration-300 ${view === 'monthly' ? 'bg-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            Bulanan
                        </button>
                        <button
                            onClick={() => setView('yearly')}
                            style={{ color: view === 'yearly' ? 'var(--theme-color-1, #0097fe)' : undefined }}
                            className={`px-3 py-1 text-[8px] font-black uppercase tracking-widest rounded-md transition-all duration-300 ${view === 'yearly' ? 'bg-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            Tahunan
                        </button>
                    </div>

                    {/* Compact Filter Group */}
                    <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-lg border border-slate-200/50 h-8">
                        {/* Year Picker */}
                        <div className="flex items-center gap-1 px-2 border-r border-slate-200/50">
                            <Calendar size={11} className="text-slate-400" />
                            <select
                                value={year}
                                onChange={(e) => setYear(Number(e.target.value))}
                                className="bg-transparent text-[9px] font-black text-slate-700 outline-none w-14 cursor-pointer"
                            >
                                {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                        </div>

                        {/* Month Navigator (Monthly Only) */}
                        {view === 'monthly' && (
                            <div className="flex items-center gap-1 px-1 border-r border-slate-200/50 relative overflow-visible">
                                <button
                                    onClick={() => {
                                        setMonth(m => {
                                            if (m === 1) {
                                                setYear(prev => prev - 1);
                                                return 12;
                                            }
                                            return m - 1;
                                        });
                                    }}
                                    className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-white text-slate-400 transition-colors"
                                >
                                    <ChevronLeft size={14} />
                                </button>
                                <button
                                    onClick={() => setIsMonthPickerOpen(!isMonthPickerOpen)}
                                    style={{ color: isMonthPickerOpen ? 'var(--theme-color-1, #0097fe)' : undefined }}
                                    className={`text-[9px] font-black uppercase tracking-widest min-w-[40px] text-center transition-all hover:opacity-80 ${isMonthPickerOpen ? '' : 'text-slate-800'}`}
                                >
                                    {monthNames[month - 1].slice(0, 3)}
                                </button>
                                <button
                                    onClick={() => {
                                        setMonth(m => {
                                            if (m === 12) {
                                                setYear(prev => prev + 1);
                                                return 1;
                                            }
                                            return m + 1;
                                        });
                                    }}
                                    className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-white text-slate-400 transition-colors"
                                >
                                    <ChevronRight size={14} />
                                </button>

                                {isMonthPickerOpen && (
                                    <div className="month-picker-container absolute top-full left-1/2 -translate-x-1/2 mt-2 p-2 bg-white border border-slate-100 rounded-xl shadow-2xl z-[700] min-w-[200px] animate-in zoom-in-95 duration-200">
                                        <div className="grid grid-cols-4 gap-1">
                                            {monthNames.map((name, idx) => {
                                                const m = idx + 1;
                                                return (
                                                    <button
                                                        key={m}
                                                        onClick={() => {
                                                            setMonth(m);
                                                            setIsMonthPickerOpen(false);
                                                        }}
                                                        style={month === m ? { backgroundColor: 'var(--theme-color-1, #0097fe)', color: 'var(--theme-text-on-primary, #ffffff)' } : undefined}
                                                        className={`py-1.5 text-[9px] font-black uppercase tracking-tight rounded-md transition-all ${month === m ? 'shadow-xs' : 'text-slate-500 hover:bg-slate-50'}`}
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
                        <div className="flex items-center gap-1 px-2">
                            <Filter size={11} className="text-slate-400" />
                            <select
                                value={bidangId}
                                onChange={(e) => setBidangId(e.target.value)}
                                disabled={!canChangeBidang}
                                className="bg-transparent text-[9px] font-black text-slate-700 outline-none w-20 cursor-pointer disabled:opacity-50"
                            >
                                <option value="all">SEMUA</option>
                                {bidangList.map(b => (
                                    <option key={b.id} value={b.id.toString()}>{b.singkatan || b.nama_bidang}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>,
                portalTarget
            )}


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
                <div className="space-y-1.5">
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
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Keterangan / Catatan</label>
                                <textarea
                                    value={rangeSelection.keterangan || ''}
                                    onChange={(e) => setRangeSelection({ ...rangeSelection, keterangan: e.target.value })}
                                    placeholder="Tulis detail kegiatan untuk rentang ini..."
                                    className="input-modern min-h-[100px] resize-none text-[12px] font-medium text-slate-600 border-slate-200/60"
                                />
                            </div>

                            <div className="space-y-2">
                                <SearchableSelect
                                    label="Pegawai"
                                    multiple={true}
                                    options={data.map(p => {
                                        return {
                                            ...p,
                                            disabled: false
                                        };
                                    })}
                                    keyField="profil_id"
                                    displayField="nama_lengkap"
                                    secondaryField="bidang_singkatan"
                                    value={rangeSelection.selectedProfilIds}
                                    onChange={(val) => setRangeSelection({ ...rangeSelection, selectedProfilIds: val })}
                                />
                            </div>
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

            {/* Hidden Capture Container for High-Res PNG Generation (Never truncated, full dates 1..daysInMonth) */}
            <div
                ref={captureRef}
                className="fixed pointer-events-none select-none bg-white text-black"
                style={{
                    position: 'fixed',
                    top: '0',
                    left: '-99999px',
                    zIndex: -9999,
                    width: `${captureWidth}px`,
                    minWidth: `${captureWidth}px`,
                    maxWidth: `${captureWidth}px`,
                    padding: '36px 40px',
                    boxSizing: 'border-box',
                    backgroundColor: '#ffffff'
                }}
            >
                {/* Kop Instansi */}
                <div className="text-center border-b-4 border-slate-900 pb-5 mb-6">
                    <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">
                        Pemerintah Daerah
                    </h2>
                    <h1 className="text-2xl font-black uppercase text-slate-900 tracking-tight mt-0.5">
                        {instansiList.find(i => i.id === selectedInstansi)?.instansi || user?.instansi_nama || 'Instansi Daerah'}
                    </h1>
                    <div className="inline-block mt-2 px-3 py-1 bg-slate-100 rounded text-xs font-black uppercase tracking-widest text-slate-800">
                        {exportTarget?.mode === 'single' && exportTarget?.person
                            ? `LOGBOOK KEGIATAN HARIAN PEGAWAI - ${exportTarget.person.nama_lengkap.toUpperCase()}`
                            : 'LOGBOOK KEGIATAN BULANAN PEGAWAI'}
                    </div>
                    <p className="text-xs font-bold text-slate-600 mt-2">
                        Periode: {monthNames[month - 1]} {year} {bidangId !== 'all' ? `• Bidang: ${bidangList.find(b => b.id.toString() === bidangId)?.nama_bidang || ''}` : ''}
                    </p>
                </div>

                {/* Identity Box (Single Person Mode) */}
                {exportTarget?.mode === 'single' && exportTarget?.person && (
                    <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                        <div>
                            <div className="text-slate-500 font-semibold">Nama Pegawai:</div>
                            <div className="text-sm font-black text-slate-900">{exportTarget.person.nama_lengkap}</div>
                        </div>
                        <div>
                            <div className="text-slate-500 font-semibold">Jabatan / Unit Kerja:</div>
                            <div className="text-sm font-black text-slate-900">{exportTarget.person.jabatan || exportTarget.person.bidang_singkatan || '-'}</div>
                        </div>
                    </div>
                )}

                {/* Main Calendar Grid Table (Exact Width, Fixed Layout, 1..daysInMonth) */}
                <div className="border border-slate-300">
                    <table
                        style={{
                            width: `${captureWidth - 80}px`,
                            minWidth: `${captureWidth - 80}px`,
                            tableLayout: 'fixed'
                        }}
                        className="border-collapse text-left bg-white"
                    >
                        <colgroup>
                            <col style={{ width: '36px' }} />
                            <col style={{ width: '240px' }} />
                            <col style={{ width: '50px' }} />
                            {[...Array(daysInMonth)].map((_, i) => (
                                <col key={i} style={{ width: '34px' }} />
                            ))}
                        </colgroup>
                        <thead>
                            <tr className="bg-slate-100 text-slate-800">
                                <th rowSpan={2} className="p-2 border border-slate-300 text-center text-xs font-black">
                                    No
                                </th>
                                <th rowSpan={2} className="p-2 border border-slate-300 text-left text-xs font-black">
                                    Nama Pegawai / Jabatan
                                </th>
                                <th rowSpan={2} className="p-2 border border-slate-300 text-center text-[10px] font-black">
                                    Sesi
                                </th>
                                <th
                                    colSpan={daysInMonth}
                                    className="p-1.5 border border-slate-300 text-center text-xs font-black uppercase tracking-wider bg-slate-200"
                                >
                                    Tanggal Kegiatan ({monthNames[month - 1]} {year})
                                </th>
                            </tr>
                            <tr className="bg-slate-50 text-slate-800">
                                {[...Array(daysInMonth)].map((_, i) => {
                                    const day = i + 1;
                                    const date = new Date(year, month - 1, day);
                                    const dayOfWeek = date.getDay();
                                    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                                    const holiday = holidays.find((h: any) => {
                                        const hDate = new Date(h.tanggal);
                                        return hDate.getDate() === day && hDate.getMonth() + 1 === month && hDate.getFullYear() === year;
                                    });
                                    const isHoliday = !!holiday;
                                    const dayName = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'][dayOfWeek];

                                    return (
                                        <th
                                            key={day}
                                            className={`p-1 text-center border border-slate-300 ${
                                                isWeekend || isHoliday ? 'bg-red-100 text-red-700 font-black' : 'bg-slate-100 text-slate-700 font-bold'
                                            }`}
                                        >
                                            <div className="text-[8px] leading-tight opacity-75">{dayName}</div>
                                            <div className="text-[10px] font-black">{String(day).padStart(2, '0')}</div>
                                        </th>
                                    );
                                })}
                            </tr>
                        </thead>
                        <tbody>
                            {targetEmployees.map((emp, empIdx) => {
                                return (
                                    <React.Fragment key={emp.profil_id || empIdx}>
                                        {/* Baris PAGI */}
                                        <tr className="border-t border-slate-300">
                                            <td rowSpan={2} className="p-2 border border-slate-300 text-center font-bold text-slate-700 text-xs">
                                                {empIdx + 1}
                                            </td>
                                            <td rowSpan={2} className="p-2 border border-slate-300">
                                                <div className="text-xs font-black text-slate-900 leading-tight">{emp.nama_lengkap}</div>
                                                <div className="text-[10px] font-medium text-slate-500 uppercase mt-0.5">{emp.jabatan || emp.bidang_singkatan || '-'}</div>
                                            </td>
                                            <td className="p-1 border border-slate-300 text-center text-[9px] font-black text-slate-600 bg-slate-50">
                                                PAGI
                                            </td>
                                            {[...Array(daysInMonth)].map((_, i) => {
                                                const day = i + 1;
                                                const date = new Date(year, month - 1, day);
                                                const isWeekend = [0, 6].includes(date.getDay());
                                                const holiday = holidays.find((h: any) => {
                                                    const hDate = new Date(h.tanggal);
                                                    return hDate.getDate() === day && hDate.getMonth() + 1 === month && hDate.getFullYear() === year;
                                                });
                                                const isHoliday = !!holiday;
                                                const activities: any[] = emp.activities?.[day]?.Pagi || [];
                                                const mainAct = activities[0];
                                                const type = mainAct ? flatActivityTypes.find((t: any) => t.kode === mainAct.tipe) : null;

                                                return (
                                                    <td
                                                        key={`pagi-${day}`}
                                                        className={`p-0 text-center border border-slate-300 h-7 ${
                                                            (isWeekend || isHoliday) ? 'bg-red-50/60' : 'bg-white'
                                                        }`}
                                                    >
                                                        {activities.length > 0 ? (
                                                            <div
                                                                className="w-full h-full flex items-center justify-center text-[9px] font-black text-white"
                                                                style={{ backgroundColor: getActivityBgColor(type) }}
                                                            >
                                                                {activities.length > 1 ? `(${activities.length})` : activities[0].tipe}
                                                            </div>
                                                        ) : (
                                                            <span className={`text-[8px] font-bold ${isWeekend || isHoliday ? 'text-red-300' : 'text-slate-300'}`}>
                                                                {isWeekend ? '✕' : '-'}
                                                            </span>
                                                        )}
                                                    </td>
                                                );
                                            })}
                                        </tr>

                                        {/* Baris SIANG */}
                                        <tr>
                                            <td className="p-1 border border-slate-300 text-center text-[9px] font-black text-slate-600 bg-slate-50">
                                                SIANG
                                            </td>
                                            {[...Array(daysInMonth)].map((_, i) => {
                                                const day = i + 1;
                                                const date = new Date(year, month - 1, day);
                                                const isWeekend = [0, 6].includes(date.getDay());
                                                const holiday = holidays.find((h: any) => {
                                                    const hDate = new Date(h.tanggal);
                                                    return hDate.getDate() === day && hDate.getMonth() + 1 === month && hDate.getFullYear() === year;
                                                });
                                                const isHoliday = !!holiday;
                                                const activities: any[] = emp.activities?.[day]?.Siang || [];
                                                const mainAct = activities[0];
                                                const type = mainAct ? flatActivityTypes.find((t: any) => t.kode === mainAct.tipe) : null;

                                                return (
                                                    <td
                                                        key={`siang-${day}`}
                                                        className={`p-0 text-center border border-slate-300 h-7 ${
                                                            (isWeekend || isHoliday) ? 'bg-red-50/60' : 'bg-white'
                                                        }`}
                                                    >
                                                        {activities.length > 0 ? (
                                                            <div
                                                                className="w-full h-full flex items-center justify-center text-[9px] font-black text-white"
                                                                style={{ backgroundColor: getActivityBgColor(type) }}
                                                            >
                                                                {activities.length > 1 ? `(${activities.length})` : activities[0].tipe}
                                                            </div>
                                                        ) : (
                                                            <span className={`text-[8px] font-bold ${isWeekend || isHoliday ? 'text-red-300' : 'text-slate-300'}`}>
                                                                {isWeekend ? '✕' : '-'}
                                                            </span>
                                                        )}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    </React.Fragment>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Single Person Detailed Agenda List (If any activities recorded) */}
                {exportTarget?.mode === 'single' && singlePersonActivities.length > 0 && (
                    <div className="mt-8 border border-slate-300 rounded-lg overflow-hidden">
                        <div className="bg-slate-100 p-2.5 border-b border-slate-300 font-black text-xs uppercase tracking-wider text-slate-800">
                            Rincian Catatan / Keterangan Kegiatan Harian (Tanggal 01 s/d {String(daysInMonth).padStart(2, '0')} {monthNames[month - 1]} {year})
                        </div>
                        <table className="w-full text-left border-collapse text-xs">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-300 text-slate-700">
                                    <th className="p-2 border-r border-slate-300 w-10 text-center font-bold">No</th>
                                    <th className="p-2 border-r border-slate-300 w-36 font-bold">Tanggal & Hari</th>
                                    <th className="p-2 border-r border-slate-300 w-20 text-center font-bold">Sesi</th>
                                    <th className="p-2 border-r border-slate-300 w-44 font-bold">Jenis Kegiatan</th>
                                    <th className="p-2 font-bold">Keterangan / Uraian Detail</th>
                                </tr>
                            </thead>
                            <tbody>
                                {singlePersonActivities.map((act, idx) => (
                                    <tr key={idx} className="border-b border-slate-200">
                                        <td className="p-2 border-r border-slate-200 text-center text-slate-500 font-medium">{idx + 1}</td>
                                        <td className="p-2 border-r border-slate-200 font-bold text-slate-800">{act.dayName}, {act.dateStr}</td>
                                        <td className="p-2 border-r border-slate-200 text-center font-bold text-slate-700">
                                            <span className={`px-2 py-0.5 rounded text-[10px] ${act.session === 'Pagi' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'}`}>
                                                {act.session.toUpperCase()}
                                            </span>
                                        </td>
                                        <td className="p-2 border-r border-slate-200 font-black text-slate-800">
                                            <div className="flex items-center gap-1.5">
                                                <span
                                                    className="px-1.5 py-0.5 rounded text-[10px] font-black text-white"
                                                    style={{ backgroundColor: getActivityBgColor(flatActivityTypes.find((t: any) => t.kode === act.tipe)) }}
                                                >
                                                    {act.tipe}
                                                </span>
                                                <span>{act.namaTipe}</span>
                                            </div>
                                        </td>
                                        <td className="p-2 text-slate-700 font-medium">
                                            {act.keterangan || '-'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Legenda Kode Kegiatan */}
                <div className="mt-6 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                    <div className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">Keterangan Legenda Kode Kegiatan:</div>
                    <div className="flex flex-wrap gap-3 text-xs">
                        {flatActivityTypes.filter(t => !t.children || t.children.length === 0).map(t => (
                            <div key={t.kode} className="flex items-center gap-1.5">
                                <span
                                    className="px-1.5 py-0.5 rounded text-[10px] font-black text-white"
                                    style={{ backgroundColor: getActivityBgColor(t) }}
                                >
                                    {t.kode}
                                </span>
                                <span className="font-semibold text-slate-700">{t.nama}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Kolom Tanda Tangan */}
                <div className="mt-8 flex justify-between items-start text-xs pt-2">
                    <div className="text-center w-72">
                        <p className="font-bold text-slate-600 mb-1">Mengetahui,</p>
                        <p className="font-black text-slate-800 uppercase">Atasan Langsung / Pejabat Penilai</p>
                        <div className="h-16"></div>
                        <p className="font-black text-slate-900 underline text-sm">( .................................................... )</p>
                        <p className="text-[10px] text-slate-500 mt-1">NIP. ....................................................</p>
                    </div>
                    <div className="text-center w-72">
                        <p className="font-bold text-slate-600 mb-1">
                            Dicetak pada: {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                        <p className="font-black text-slate-800 uppercase">
                            {exportTarget?.mode === 'single' ? 'Pegawai Yang Bersangkutan' : 'Administrator Sistem'}
                        </p>
                        <div className="h-16"></div>
                        <p className="font-black text-slate-900 underline text-sm">
                            ( {exportTarget?.mode === 'single' && exportTarget?.person ? exportTarget.person.nama_lengkap : '....................................................'} )
                        </p>
                        <p className="text-[10px] text-slate-500 mt-1">
                            {exportTarget?.mode === 'single' && exportTarget?.person?.nip ? `NIP. ${exportTarget.person.nip}` : 'NIP. ....................................................'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Tailwind Safelist for Dynamic DB Colors */}
            <div className="hidden bg-rose-500 bg-amber-500 bg-emerald-500 bg-indigo-500 bg-ppm-slate bg-purple-600 bg-purple-500 bg-fuchsia-600 text-white text-slate-800 border-slate-200 uppercase tracking-widest px-1"></div>

            {/* Single Menu Portal — fires only when activeCell is set */}
            {activeCell && activeCell.rect && activeCell.rect.left !== undefined && createPortal(
                <ActiveCellMenu
                    activeCell={activeCell}
                    month={month}
                    year={year}
                    monthNames={monthNames}
                    suratList={suratList}
                    canManage={canManageEmployeeActivity(activeCell.profil_id)}
                    canDelete={(user as any)?.dbScope >= 2 || isDeletableUser}
                    hierarchicalActivityTypes={hierarchicalActivityTypes}
                    onClose={() => {
                        setActiveCell(null);
                        if (activeCellOverlayRef.current) activeCellOverlayRef.current.style.display = 'none';
                    }}
                    onViewDoc={(doc) => {
                        setViewedDoc(doc);
                        setHoveredCellData(null);
                    }}
                    onEditActivity={(act) => {
                        handleOpenEditModal(
                            act,
                            activeCell.profil_id,
                            activeCell.day,
                            activeCell.session
                        );
                        setActiveCell(null);
                        if (activeCellOverlayRef.current) activeCellOverlayRef.current.style.display = 'none';
                    }}
                    onAddActivity={(profilId, day, session) => {
                        handleOpenAddActivityModal(profilId, day, session);
                        setActiveCell(null);
                        if (activeCellOverlayRef.current) activeCellOverlayRef.current.style.display = 'none';
                    }}
                    onDeleteSingleDay={(profilId, day, session, actId, extId) => {
                        handleDeleteSingleDay(profilId, day, session, actId, extId);
                        setActiveCell(null);
                        if (activeCellOverlayRef.current) activeCellOverlayRef.current.style.display = 'none';
                    }}
                    onSelectActivity={(profilId, day, session, kode, actId, extId) => {
                        handleSelectActivity(profilId, day, session, kode, actId, extId);
                        setActiveCell(null);
                        if (activeCellOverlayRef.current) activeCellOverlayRef.current.style.display = 'none';
                    }}
                />,
                document.body
            )}

            {/* Global Cell Tooltip Portal */}
            {hoveredCellData && createPortal(
                <GlobalCellTooltip
                    data={hoveredCellData}
                    suratList={suratList}
                    month={month}
                    year={year}
                    monthNames={monthNames}
                    canEdit={hoveredCellData.profil_id ? canManageEmployeeActivity(hoveredCellData.profil_id) : false}
                    onViewDoc={(doc) => {
                        setViewedDoc(doc);
                        setHoveredCellData(null);
                    }}
                    onEditActivity={(act) => {
                        if (hoveredCellData && hoveredCellData.profil_id) {
                            handleOpenEditModal(
                                act,
                                hoveredCellData.profil_id,
                                hoveredCellData.day,
                                hoveredCellData.session as 'Pagi' | 'Siang'
                            );
                            setHoveredCellData(null);
                        }
                    }}
                    onDeleteSingleDay={(act) => {
                        if (hoveredCellData && hoveredCellData.profil_id) {
                            handleDeleteSingleDay(
                                hoveredCellData.profil_id,
                                hoveredCellData.day,
                                hoveredCellData.session as 'Pagi' | 'Siang',
                                act.id,
                                act.id_eksternal || act.activity_id
                            );
                            setHoveredCellData(null);
                        }
                    }}
                    onMouseEnter={() => {
                        if (hideTimeoutRef.current) {
                            clearTimeout(hideTimeoutRef.current);
                            hideTimeoutRef.current = null;
                        }
                    }}
                    onMouseLeave={() => {
                        if (!hideTimeoutRef.current) {
                            hideTimeoutRef.current = window.setTimeout(() => {
                                setHoveredCellData(null);
                                hideTimeoutRef.current = null;
                            }, 300);
                        }
                    }}
                />,
                document.body
            )}

            {/* Unified Activity Modal */}
            <ActivityFormModal 
                isOpen={isActivityModalOpen}
                onClose={() => {
                    setIsActivityModalOpen(false);
                    setModalContext(null);
                }}
                onSuccess={(msg) => {
                    fetchData();
                    setModalContext(null);
                }}
                editingActivity={editingActivityForModal}
                user={user}
                masterData={{
                    jenisKegiatan: activityTypes.map(t => ({ id: t.id, nama: t.nama, parent_id: t.parent_id })),
                    bidangList: bidangList,
                    tematikList: tematikList,
                    pegawaiList: (masterPegawaiList && masterPegawaiList.length > 0)
                        ? masterPegawaiList.map(p => ({
                            id: p.id,
                            nama_lengkap: p.nama_lengkap,
                            bidang_id: p.bidang_id,
                            bidang_singkatan: p.bidang_singkatan || p.bidang_nama || '',
                            instansi_id: p.instansi_id
                        }))
                        : data.map(p => ({
                            id: p.profil_id,
                            nama_lengkap: p.nama_lengkap,
                            bidang_id: p.bidang_id,
                            bidang_singkatan: p.bidang_singkatan,
                            instansi_id: p.instansi_id
                        })),
                    masterInstansiDaerahList: instansiList,
                    masterDokumenList: masterDokumenList
                }}
                mode="management"
                onDelete={async (actId) => {
                    const ctx = modalContext;
                    if (ctx) {
                        await handleSelectActivity(
                            ctx.profil_id,
                            ctx.day,
                            ctx.session,
                            null,
                            ctx.recordId,
                            ctx.externalId || actId
                        );
                        setIsActivityModalOpen(false);
                        setModalContext(null);
                    }
                }}
            />

            {/* Document Viewer Modal for Logbook Preview */}
            <DocumentViewerModal 
                isOpen={!!viewedDoc}
                onClose={() => setViewedDoc(null)}
                fileUrl={viewedDoc?.path}
                fileName={viewedDoc?.name || ''}
                kegiatanId={viewedDoc?.kegiatan_id}
                dokumenId={viewedDoc?.dokumen_id}
                disableDownload={
                    viewedDoc?.is_private === 1 || viewedDoc?.is_private === true
                        ? viewedDoc?.uploaded_by !== user?.id
                        : false
                }
            />

            {/* Petugas / Pegawai Detail Modal (CV / Biodata) */}
            <PetugasDetailModal
                isOpen={!!selectedPetugasDetail}
                onClose={() => setSelectedPetugasDetail(null)}
                pegawai={selectedPetugasDetail}
            />
        </div>
    );
}
