import React from 'react';
import { 
    Loader2, Inbox, AlertTriangle, Users, Mail, Check, X, 
    RefreshCw, FileSpreadsheet, ChevronRight, FileText, 
    XCircle, CheckCircle, Bell 
} from 'lucide-react';

interface InboxDetailPanelProps {
    activeItem: any;
    setActiveItem: (item: any) => void;
    unsubmittedSkps: any[];
    staffTunggakan: any[];
    expandedAlertIndex: number | null;
    setExpandedAlertIndex: (idx: number | null) => void;
    expandedStaffId: string | null;
    setExpandedStaffId: (id: string | null) => void;
    onClose: () => void;
    user: any;
    globalSettings: any;
    processingId: number | null;
    setActionModal: (val: any) => void;
    setSigningChoice: (val: any) => void;
    setPreviewData: (val: any) => void;
    fetchHistory: (suratId: number) => Promise<void>;
    repairOldQrUrls: (html: string, logoUrl?: string) => string;
    currentMonthName: string;
    api: any;
}

export default function InboxDetailPanel({
    activeItem,
    setActiveItem,
    unsubmittedSkps,
    staffTunggakan,
    expandedAlertIndex,
    setExpandedAlertIndex,
    expandedStaffId,
    setExpandedStaffId,
    onClose,
    user,
    globalSettings,
    processingId,
    setActionModal,
    setSigningChoice,
    setPreviewData,
    fetchHistory,
    repairOldQrUrls,
    currentMonthName,
    api
}: InboxDetailPanelProps) {
    if (!activeItem) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8">
                <Inbox size={48} className="text-slate-350 stroke-[1.5] mb-3" />
                <h3 className="font-extrabold text-slate-700">Pilih Detail</h3>
                <p className="text-xs mt-1 text-slate-400 text-center max-w-xs leading-relaxed">
                    Silakan pilih salah satu berkas atau pemberitahuan dari panel kiri untuk meninjau detailnya di sini.
                </p>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col min-w-0 bg-white">
            {/* Mobile Header / Back to List Button */}
            <div className="p-4 border-b border-slate-100 flex items-center md:hidden bg-slate-50 shrink-0">
                <button
                    onClick={() => setActiveItem(null)}
                    className="text-xs font-bold text-indigo-600 flex items-center gap-1"
                >
                    &larr; Kembali ke Daftar
                </button>
            </div>

            {/* Content Renderer */}
            <div className="flex-1 p-6 overflow-y-auto">
                {/* A. SKP Detail View */}
                {activeItem.type === 'SKP' && (
                    <div className="max-w-xl mx-auto space-y-6 py-4">
                        <div className="flex flex-col items-center text-center">
                            <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mb-4 text-amber-500 shadow-sm border border-amber-100 animate-pulse">
                                <AlertTriangle size={32} />
                            </div>
                            <h3 className="text-lg font-black text-slate-800">Tugas Administrasi SKP</h3>
                            <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                                Daftar tunggakan dan pemantauan dokumen SKP yang memerlukan perhatian Anda:
                            </p>
                        </div>

                        <div className="space-y-2.5">
                            {unsubmittedSkps.map((item, i) => (
                                <div
                                    key={i}
                                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl transition-all text-left"
                                >
                                    {item.type === 'own_unsubmitted' ? (
                                        <button
                                            onClick={() => {
                                                sessionStorage.setItem('skp_navigate_year', String(item.year));
                                                sessionStorage.setItem('skp_navigate_month', String(item.month));
                                                sessionStorage.setItem('skp_navigate_butir', item.name || '');
                                                window.dispatchEvent(new CustomEvent('navigate-page', { detail: { page: 'skp' } }));
                                                onClose();
                                            }}
                                            className="w-full flex items-start gap-3 text-left group cursor-pointer"
                                        >
                                            <FileSpreadsheet className="text-indigo-500 shrink-0 mt-0.5 group-hover:scale-110 transition-transform" size={16} />
                                            <span className="text-xs text-slate-700 group-hover:text-indigo-950 font-extrabold leading-snug">
                                                <span className="text-[10px] text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded font-black mr-1.5 uppercase">{item.monthName} {item.year}</span>
                                                SKP Anda belum lengkap: {item.code ? `[${item.code}] ` : ''}{item.name}
                                            </span>
                                        </button>
                                    ) : (
                                        <div className="space-y-3">
                                            <button
                                                onClick={() => {
                                                    setExpandedAlertIndex(expandedAlertIndex === i ? null : i);
                                                }}
                                                className="w-full flex items-center justify-between text-left group cursor-pointer"
                                            >
                                                <div className="flex items-start gap-3">
                                                    <Users className="text-amber-500 shrink-0 mt-0.5 group-hover:scale-110 transition-transform" size={16} />
                                                    <span className="text-xs text-slate-700 group-hover:text-amber-950 font-extrabold leading-snug">
                                                        <span className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded font-black mr-1.5 uppercase">{item.monthName} {item.year}</span>
                                                        Rekap {item.scope === 'bidang' ? 'Bidang' : 'Tim'}: Ada <strong>{item.count} pegawai</strong> belum mengumpulkan SKP.
                                                    </span>
                                                </div>
                                                <span className="text-[10px] text-indigo-600 font-black uppercase tracking-wider group-hover:underline shrink-0">
                                                    {expandedAlertIndex === i ? 'Tutup ▲' : 'Detail ▼'}
                                                </span>
                                            </button>
                                            
                                            {expandedAlertIndex === i && (
                                                <div className="mt-3 pt-3 border-t border-slate-200/60 space-y-2 max-h-[320px] overflow-y-auto pr-1 custom-scrollbar">
                                                    {(() => {
                                                        const periodTunggakan = staffTunggakan.filter(t => t.year === item.year && t.month === item.month);
                                                        
                                                        interface StaffGroup {
                                                            employeeId: number;
                                                            namaLengkap: string;
                                                            subBidangNama: string;
                                                            noHp: string | null;
                                                            items: typeof periodTunggakan;
                                                        }

                                                        const groupedStaff: StaffGroup[] = [];
                                                        periodTunggakan.forEach(t => {
                                                            let emp = groupedStaff.find(g => g.employeeId === t.employeeId);
                                                            if (!emp) {
                                                                emp = {
                                                                    employeeId: t.employeeId,
                                                                    namaLengkap: t.namaLengkap,
                                                                    subBidangNama: t.subBidangNama,
                                                                    noHp: t.noHp,
                                                                    items: []
                                                                };
                                                                groupedStaff.push(emp);
                                                            }
                                                            emp.items.push(t);
                                                        });

                                                        if (groupedStaff.length === 0) {
                                                            return (
                                                                <div className="text-center py-4 text-xs text-slate-400 font-semibold italic">
                                                                    Tidak ada data pegawai yang belum mengumpulkan.
                                                                </div>
                                                            );
                                                        }

                                                        return groupedStaff.map(emp => {
                                                            const staffKey = `${item.year}-${item.month}-${emp.employeeId}`;
                                                            const isEmpExpanded = expandedStaffId === staffKey;

                                                            return (
                                                                <div key={staffKey} className="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-2xs">
                                                                    {/* Tier 1: Employee Header (Click to expand subactivities) */}
                                                                    <div 
                                                                        onClick={() => setExpandedStaffId(isEmpExpanded ? null : staffKey)}
                                                                        className="flex items-center justify-between p-2.5 bg-slate-50/80 hover:bg-indigo-50/40 transition-colors cursor-pointer select-none"
                                                                    >
                                                                        <div className="flex items-center gap-2.5 min-w-0">
                                                                            <div className="w-7 h-7 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center font-black text-xs shrink-0">
                                                                                {emp.namaLengkap.charAt(0)}
                                                                            </div>
                                                                            <div className="min-w-0">
                                                                                <span className="block text-[11px] font-black text-slate-800 leading-tight truncate">{emp.namaLengkap}</span>
                                                                                <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wide">
                                                                                    Tim {emp.subBidangNama} &bull; <span className="text-rose-600 font-black">{emp.items.length} Subkegiatan</span>
                                                                                </span>
                                                                            </div>
                                                                        </div>

                                                                        <div className="flex items-center gap-2 shrink-0">
                                                                            <span className="text-[9px] text-indigo-600 font-extrabold flex items-center gap-0.5 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100/60">
                                                                                {isEmpExpanded ? 'Tutup ▲' : 'Buka ▼'}
                                                                            </span>
                                                                        </div>
                                                                    </div>

                                                                    {/* Tier 2: Subactivities List */}
                                                                    {isEmpExpanded && (
                                                                        <div className="p-3 bg-white border-t border-slate-100 space-y-2.5">
                                                                            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                                                                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">
                                                                                    Daftar Subkegiatan Belum Diunggah ({emp.items.length} Item)
                                                                                </span>
                                                                            </div>

                                                                            <div className="space-y-1.5 pt-0.5">
                                                                                {emp.items.map((sub, sIdx) => (
                                                                                    <div key={sIdx} className="flex items-start gap-2 p-2 bg-slate-50/90 rounded-lg text-[10px] text-slate-700 font-semibold leading-snug">
                                                                                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0 mt-1"></span>
                                                                                        <div>
                                                                                            {sub.code ? (
                                                                                                <span className="text-[9px] text-indigo-600 bg-indigo-50 font-black px-1.5 py-0.5 rounded mr-1.5 uppercase">
                                                                                                    {sub.code}
                                                                                                </span>
                                                                                            ) : null}
                                                                                            {sub.butirSkp}
                                                                                        </div>
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        });
                                                    })()}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        <div className="pt-4">
                            <button
                                onClick={() => {
                                    window.dispatchEvent(new CustomEvent('navigate-page', { detail: { page: 'skp' } }));
                                    onClose();
                                }}
                                className="w-full py-3.5 bg-[#5D45FD] hover:bg-[#4C36E2] text-white text-xs font-bold rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-500/25 active:scale-[0.98]"
                            >
                                Buka Halaman SKP Saya
                                <ChevronRight size={14} />
                            </button>
                        </div>
                    </div>
                )}

                {/* B. Surat Approval Detail View */}
                {activeItem.type === 'SURAT' && (() => {
                    const doc = activeItem.data;
                    const isPending = doc.status !== 'APPROVED' && doc.status !== 'REJECTED' && doc.status !== 'RETURNED';
                    return (
                        <div className="space-y-6">
                            <div className="flex flex-col justify-between items-start gap-3 pb-4 border-b border-slate-100">
                                <div>
                                    <div className="flex items-center gap-2 mb-1.5">
                                        <span className={`px-2.5 py-0.5 text-[9px] font-black rounded-md tracking-wider uppercase ${
                                            doc.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' : 
                                            doc.status === 'RETURNED' ? 'bg-amber-100 text-amber-700' : 
                                            doc.status === 'REJECTED' ? 'bg-rose-100 text-rose-700' :
                                            'bg-amber-100 text-amber-700'
                                        }`}>
                                            {doc.status === 'APPROVED' ? 'Disetujui' : doc.status === 'RETURNED' ? 'Dikembalikan' : doc.status === 'REJECTED' ? 'Ditolak' : 'Menunggu TTD'}
                                        </span>
                                        <span className="text-[10px] text-slate-400 font-bold">{new Date(doc.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                                    </div>
                                    <h3 className="text-base font-black text-slate-800 leading-tight">{doc.perihal || 'Dokumen Tanpa Perihal'}</h3>
                                </div>
                            </div>

                            {/* Meta Info */}
                            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                <div>
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">Pembuat Dokumen</span>
                                    <span className="text-xs font-bold text-slate-700">{doc.pembuat_nama}</span>
                                </div>
                                <div>
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">Pengusul</span>
                                    <span className="text-xs font-bold text-indigo-600">{doc.pengusul_nama}</span>
                                </div>
                                <div className="col-span-2 pt-2 border-t border-slate-200/50">
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">Peran Persetujuan Anda</span>
                                    <span className="text-xs font-bold text-slate-700 uppercase">{doc.role.replace('_', ' ')}</span>
                                </div>
                            </div>

                            {/* Progress Timeline */}
                            <div>
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Jalur Persetujuan</h4>
                                <div className="flex flex-wrap items-center gap-4 p-4 bg-white border border-slate-100 rounded-2xl shadow-xs">
                                    {(() => {
                                        const chain = doc.approval_chain && (typeof doc.approval_chain === 'string' ? JSON.parse(doc.approval_chain) : doc.approval_chain);
                                        return chain.sort((a: any, b: any) => a.urutan - b.urutan).map((step: any, idx: number) => (
                                            <div key={idx} className="flex items-center gap-2 group relative">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] shadow-sm z-10 border-2 border-white transition-all duration-300 ${
                                                    step.status === 'APPROVED' ? 'bg-emerald-500 text-white' : 
                                                    step.status === 'REJECTED' ? 'bg-rose-500 text-white' : 
                                                    step.status === 'RETURNED' ? 'bg-amber-500 text-white' : 
                                                    'bg-slate-100 text-slate-400 border-slate-200'
                                                }`} title={`${step.role}: ${step.approver_name}`}>
                                                    {step.status === 'APPROVED' ? <Check size={14} strokeWidth={3} /> : 
                                                     step.status === 'REJECTED' ? <X size={14} strokeWidth={3} /> : 
                                                     step.status === 'RETURNED' ? <RefreshCw size={12} strokeWidth={3} /> : 
                                                     <span className="font-bold">{step.urutan}</span>}
                                                </div>
                                                <div className="text-left leading-none pr-1">
                                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-tight">{step.role.replace('_', ' ')}</p>
                                                    <p className="text-[9px] font-bold text-slate-700 mt-0.5 max-w-[80px] truncate">{step.approver_name || 'Menunggu'}</p>
                                                </div>
                                                {idx < chain.length - 1 && (
                                                    <ChevronRight size={14} className="text-slate-300" />
                                                )}
                                            </div>
                                        ));
                                    })()}
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="pt-4 border-t border-slate-100 flex flex-col gap-3">
                                <button
                                    onClick={async () => {
                                        let fullHtml = doc.isi_surat || '';
                                        let logoPath = undefined;
                                        try {
                                            const res = await api.internalInstansi.get(user.instansi_id);
                                            if (res.success && res.data && res.data.instansiDetail) {
                                                const inst = res.data.instansiDetail;
                                                logoPath = inst.logo_kop_path;
                                                const isCuti = (doc.perihal || '').toLowerCase().includes('cuti') || (doc.jenis_surat_nama || '').toLowerCase().includes('cuti');
                                                
                                                let template = null;
                                                if (doc.jenis_surat_id) {
                                                    const tRes = await api.suratTemplate.getById(doc.jenis_surat_id);
                                                    if (tRes.success) template = tRes.data;
                                                }

                                                 const useGlobal = !!template?.use_global_settings;
                                                 const source = useGlobal && globalSettings ? globalSettings : (template || doc);

                                                 const mTop = source.margin_top ?? 20;
                                                 const mBottom = source.margin_bottom ?? 20;
                                                 const mLeft = source.margin_left ?? 30;
                                                 const mRight = source.margin_right ?? 20;
                                                 const pSize = source.paper_size ?? 'A4';
                                                 const fSize = source.font_size ?? 12;
                                                 const lHeight = source.line_height ?? 1.5;
                                                 const tAlign = source.text_align ?? 'justify';

                                                let kopHtml = '';
                                                if (isCuti || template?.logo_path === 'none') {
                                                    kopHtml = `
                                                        <div style="text-align: left; font-weight: bold; margin-bottom: 2rem; text-transform: uppercase; line-height: 1.25;">
                                                            PEMERINTAH DAERAH KABUPATEN BOGOR<br/>
                                                            <span style="text-decoration: underline;">${String(inst?.nama_instansi_kop || inst?.instansi || '')}</span>
                                                        </div>
                                                    `;
                                                } else {
                                                    const lineStyle = template?.kop_line_style || 'double';
                                                    const lineWeight = template?.kop_line_weight || '3px';
                                                    const subTitle = template?.sub_title || inst?.alamat_instansi || '';
                                                    const fullLogoUrl = logoPath ? (logoPath.startsWith('http') ? logoPath : `${import.meta.env.VITE_API_URL || ''}${logoPath}`) : '';
                                                    
                                                    kopHtml = `
                                                        <div style="display: flex; align-items: center; justify-content: center; gap: 1.5rem; margin-bottom: 1.5rem; border-bottom: ${lineWeight} ${lineStyle === 'double' ? 'double' : 'solid'} #000; padding-bottom: 0.75rem;">
                                                            ${fullLogoUrl ? `<img src="${fullLogoUrl}" style="height: 80px; width: auto; object-fit: contain;" />` : ''}
                                                            <div style="text-align: center; flex: 1;">
                                                                <h1 style="font-size: 14pt; font-weight: bold; margin: 0; text-transform: uppercase; line-height: 1.2;">PEMERINTAH KABUPATEN BOGOR</h1>
                                                                <h2 style="font-size: 16pt; font-weight: 800; margin: 0; text-transform: uppercase; line-height: 1.2;">${String(inst?.nama_instansi_kop || inst?.instansi || '')}</h2>
                                                                <p style="font-size: 9pt; margin: 4px 0 0 0; line-height: 1.3; font-weight: 500;">${subTitle}</p>
                                                            </div>
                                                        </div>
                                                    `;
                                                }

                                                fullHtml = kopHtml + fullHtml;
                                                fullHtml = repairOldQrUrls(fullHtml, logoPath);
                                                
                                                setPreviewData({
                                                    isOpen: true,
                                                    html: fullHtml,
                                                    title: doc.perihal || 'Detail Surat',
                                                    zoom: 0.65,
                                                    surat_id: doc.surat_id,
                                                    approval_id: doc.id,
                                                    status: doc.status,
                                                    layout: {
                                                        marginTop: mTop,
                                                        marginBottom: mBottom,
                                                        marginLeft: mLeft,
                                                        marginRight: mRight,
                                                        paperSize: pSize,
                                                        fontSize: fSize,
                                                        lineHeight: lHeight,
                                                        textAlign: tAlign
                                                    }
                                                });
                                                fetchHistory(doc.surat_id);
                                            }
                                        } catch (error) {
                                            console.error('Failed to preview document', error);
                                        }
                                    }}
                                    className="w-full py-3 bg-[#5D45FD] hover:bg-[#4C36E2] text-white text-xs font-bold rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-500/25 active:scale-[0.98]"
                                >
                                    <FileText size={15} />
                                    Buka & Pratinjau Dokumen Surat
                                </button>

                                {isPending ? (
                                    <div className="grid grid-cols-2 gap-3 mt-1">
                                        <button
                                            onClick={() => setActionModal({ isOpen: true, type: 'RETURN', id: doc.id })}
                                            disabled={processingId === doc.id}
                                            className="py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all active:scale-[0.98]"
                                        >
                                            <RefreshCw size={13} className="text-slate-400" />
                                            Kembalikan
                                        </button>
                                        <button
                                            onClick={() => setActionModal({ isOpen: true, type: 'REJECT', id: doc.id })}
                                            disabled={processingId === doc.id}
                                            className="py-2.5 bg-white border border-red-100 hover:bg-red-50 text-red-600 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all active:scale-[0.98]"
                                        >
                                            <XCircle size={14} className="text-red-500" />
                                            Tolak
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center p-3 bg-slate-50 rounded-2xl border border-slate-100 mt-2">
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Status Persetujuan Anda</span>
                                        <div className="flex items-center gap-1.5 text-emerald-600 font-bold text-xs">
                                            <CheckCircle size={14} className="text-emerald-500" />
                                            Selesai Diproses ({doc.status === 'APPROVED' ? 'Disetujui' : doc.status === 'REJECTED' ? 'Ditolak' : 'Dikembalikan'})
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })()}

                {/* C. Notification Detail View */}
                {activeItem.type === 'NOTIF' && (() => {
                    const n = activeItem.data;
                    return (
                        <div className="max-w-xl mx-auto space-y-6 py-4">
                            <div className="flex flex-col items-center text-center">
                                <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mb-4 text-rose-500 shadow-sm border border-rose-100">
                                    <Bell size={32} />
                                </div>
                                <h3 className="text-lg font-black text-slate-800">{n.title}</h3>
                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">{new Date(n.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                                <p className="text-xs text-slate-600 mt-4 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-100 text-left w-full">
                                    {n.message}
                                </p>
                            </div>

                            <div className="pt-4">
                                <button
                                    onClick={async () => {
                                        await api.notifications.markRead(n.id);
                                        window.dispatchEvent(new CustomEvent('notification-update'));
                                        setActiveItem(null);
                                    }}
                                    className="w-full py-3.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                                >
                                    <Check size={14} strokeWidth={3} />
                                    Tandai Telah Dibaca
                                </button>
                            </div>
                        </div>
                    );
                })()}
            </div>
        </div>
    );
}
