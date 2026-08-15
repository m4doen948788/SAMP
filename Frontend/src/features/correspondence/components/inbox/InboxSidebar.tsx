import React from 'react';
import { Loader2, CheckCircle, AlertTriangle, Mail, Bell } from 'lucide-react';

interface InboxSidebarProps {
    loading: boolean;
    unsubmittedSkps: any[];
    approvals: any[];
    notifications: any[];
    activeItem: any;
    setActiveItem: (item: any) => void;
    currentMonthName: string;
}

export default function InboxSidebar({
    loading,
    unsubmittedSkps,
    approvals,
    notifications,
    activeItem,
    setActiveItem,
    currentMonthName
}: InboxSidebarProps) {
    const unreadNotifications = notifications.filter(n => !n.is_read);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                <Loader2 className="animate-spin mb-3" size={24} />
                <span className="text-xs">Memuat kotak masuk...</span>
            </div>
        );
    }

    const hasNoContent = unsubmittedSkps.length === 0 && approvals.length === 0 && unreadNotifications.length === 0;
    if (hasNoContent) {
        return (
            <div className="flex flex-col items-center justify-center py-10 px-4 text-slate-400 text-center flex-1">
                <CheckCircle size={32} className="text-slate-350 mb-2" />
                <span className="text-xs font-bold text-slate-700">Kotak Masuk Bersih</span>
                <span className="text-[10px] text-slate-400 mt-1">Tidak ada tugas atau pemberitahuan baru.</span>
            </div>
        );
    }

    return (
        <div className="p-3 space-y-2">
            {/* 1. SKP Warning Sidebar Item */}
            {unsubmittedSkps.length > 0 && (
                <button
                    onClick={() => setActiveItem({ type: 'SKP', id: 'skp-warning', data: unsubmittedSkps })}
                    className={`w-full text-left p-3.5 rounded-xl border transition-all text-xs relative ${
                        activeItem?.type === 'SKP'
                            ? 'bg-amber-50/80 border-amber-300 shadow-sm ring-1 ring-amber-300'
                            : 'bg-white hover:bg-slate-50 border-slate-200'
                    }`}
                >
                    <div className="flex gap-2.5">
                        <div className="p-2 bg-amber-100 text-amber-700 rounded-lg shrink-0">
                            <AlertTriangle size={16} />
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="flex justify-between items-start">
                                <span className="font-extrabold text-slate-800">Lengkapi SKP</span>
                                <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0 mt-1" />
                            </div>
                            <p className="text-[10px] text-slate-500 font-medium mt-1 truncate">
                                Bulan {currentMonthName} belum lengkap
                            </p>
                        </div>
                    </div>
                </button>
            )}

            {/* 2. Letter Approvals Sidebar Items */}
            {approvals.map((doc) => {
                const isSelected = activeItem?.type === 'SURAT' && activeItem.id === doc.id;
                const isPending = doc.status !== 'APPROVED' && doc.status !== 'REJECTED' && doc.status !== 'RETURNED';
                return (
                    <button
                        key={`surat-${doc.id}`}
                        onClick={() => setActiveItem({ type: 'SURAT', id: doc.id, data: doc })}
                        className={`w-full text-left p-3.5 rounded-xl border transition-all text-xs ${
                            isSelected
                                ? 'bg-indigo-50/80 border-indigo-300 shadow-sm ring-1 ring-indigo-300'
                                : 'bg-white hover:bg-slate-50 border-slate-200'
                        }`}
                    >
                        <div className="flex gap-2.5">
                            <div className={`p-2 rounded-lg shrink-0 ${isPending ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500'}`}>
                                <Mail size={16} />
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="flex justify-between items-start gap-1">
                                    <span className="font-extrabold text-slate-800 truncate">{doc.perihal || 'Draft Surat'}</span>
                                    {isPending && <span className="w-2 h-2 rounded-full bg-[#5D45FD] shrink-0 mt-1" />}
                                </div>
                                <p className="text-[10px] text-slate-500 font-medium mt-0.5 truncate">
                                    Dari: {doc.pembuat_nama}
                                </p>
                                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-1.5">
                                    {doc.status === 'APPROVED' ? 'Disetujui' : doc.status === 'RETURNED' ? 'Dikembalikan' : doc.status === 'REJECTED' ? 'Ditolak' : 'Menunggu TTD'}
                                </p>
                            </div>
                        </div>
                    </button>
                );
            })}

            {/* 3. Notifications Sidebar Items */}
            {unreadNotifications.map((n) => {
                const isSelected = activeItem?.type === 'NOTIF' && activeItem.id === n.id;
                return (
                    <button
                        key={`notif-item-${n.id}`}
                        onClick={() => setActiveItem({ type: 'NOTIF', id: n.id, data: n })}
                        className={`w-full text-left p-3.5 rounded-xl border transition-all text-xs ${
                            isSelected
                                ? 'bg-rose-50 border-rose-200 shadow-sm ring-1 ring-rose-250'
                                : 'bg-white hover:bg-slate-50 border-slate-200'
                        }`}
                    >
                        <div className="flex gap-2.5">
                            <div className="p-2 bg-rose-100 text-rose-600 rounded-lg shrink-0">
                                <Bell size={16} />
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="flex justify-between items-start">
                                    <span className="font-extrabold text-slate-800 truncate">{n.title}</span>
                                    <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0 mt-1" />
                                </div>
                                <p className="text-[10px] text-slate-500 font-medium mt-0.5 truncate">
                                    {n.message}
                                </p>
                            </div>
                        </div>
                    </button>
                );
            })}
        </div>
    );
}
