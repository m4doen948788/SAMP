import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, CheckCircle, XCircle, RefreshCw, FileText, Loader2, Search, Shield, PenTool, Image as ImageIcon, ZoomIn, ZoomOut, Maximize2, Check, Clock, UserCheck } from 'lucide-react';
import { api, API_URL } from '@/src/services/api';

import { useAuth } from '@/src/contexts/AuthContext';

interface ApprovalInboxModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function ApprovalInboxModal({ isOpen, onClose }: ApprovalInboxModalProps) {
    const { user } = useAuth();
    const [approvals, setApprovals] = useState<any[]>([]);
    const [notifications, setNotifications] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [globalSettings, setGlobalSettings] = useState<any>(null);
    const [processingId, setProcessingId] = useState<number | null>(null);
    const [actionModal, setActionModal] = useState<{ isOpen: boolean, type: 'REJECT' | 'RETURN', id: number | null }>({ isOpen: false, type: 'REJECT', id: null });
    const [signingChoice, setSigningChoice] = useState<{ isOpen: boolean, id: number | null }>({ isOpen: false, id: null });
    const [reason, setReason] = useState('');

    useEffect(() => {
        const fetchGlobal = async () => {
            const res = await api.suratTemplate.getGlobal();
            if (res.success) setGlobalSettings(res.data);
        };
        fetchGlobal();
    }, []);
    const [previewData, setPreviewData] = useState<{ 
        isOpen: boolean, 
        html: string, 
        title: string, 
        zoom: number, 
        surat_id?: number, 
        approval_id?: number, 
        status?: string,
        layout?: {
            marginTop: number;
            marginBottom: number;
            marginLeft: number;
            marginRight: number;
            paperSize: string;
            fontSize: number;
            lineHeight: number;
            textAlign: string;
        }
    }>({ isOpen: false, html: '', title: '', zoom: 0.65 });
    const [history, setHistory] = useState<any[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (actionModal.isOpen) {
            const timer = setTimeout(() => {
                textareaRef.current?.focus();
            }, 150);
            return () => clearTimeout(timer);
        }
    }, [actionModal.isOpen]);

    const BASE_VERIFY_URL = import.meta.env.VITE_DASHBOARD_PUBLIC_URL || import.meta.env.VITE_VERIFY_URL || window.location.origin;

    const getPremiumQrUrl = (data: string, logoUrl?: string) => {
        const encodedData = encodeURIComponent(data);
        
        // Normalize logo path (remove the base URL if present to get relative path for backend)
        let relativeLogo = logoUrl || '';
        if (relativeLogo.startsWith(window.location.origin)) {
            relativeLogo = relativeLogo.replace(window.location.origin, '');
        }
        
        // Ensure it's a relative path starting with /
        if (relativeLogo && !relativeLogo.startsWith('/') && !relativeLogo.startsWith('http')) {
            relativeLogo = '/' + relativeLogo;
        }

        const encodedLogo = relativeLogo ? encodeURIComponent(relativeLogo) : '';
        
        // Use our local backend QR generator
        const baseUrl = API_URL.endsWith('/api') ? API_URL.substring(0, API_URL.length - 4) : API_URL;
        return `${baseUrl}/api/public/qr/generate?text=${encodedData}${encodedLogo ? `&logo=${encodedLogo}` : ''}&size=300`;
    };


    // Repair logic for old/hardcoded QR URLs in existing documents
    const repairOldQrUrls = (html: string, logoUrl?: string) => {
        if (!html) return html;
        return html.replace(
            /https:\/\/api\.qrserver\.com\/v1\/create-qr-code\/\?size=150x150&data=([^"'\s&]+)/g,
            (match, encodedData) => {
                try {
                    const decodedData = decodeURIComponent(encodedData);
                    const slugMatch = decodedData.match(/[?&]v=([^&]+)/);
                    if (slugMatch) {
                        const slug = slugMatch[1];
                        const newVerifyUrl = `${BASE_VERIFY_URL}${BASE_VERIFY_URL.endsWith('/') ? '' : '/'}?v=${slug}`;
                        return getPremiumQrUrl(newVerifyUrl, logoUrl);
                    }
                } catch (e) {}
                return match;
            }
        );
    };

    const fetchHistory = async (suratId: number) => {
        setLoadingHistory(true);
        try {
            const res = await api.suratApprovals.getHistory(suratId);
            if (res.success) {
                setHistory(res.data);
            }
        } catch (error) {
            console.error('Failed to fetch history', error);
        } finally {
            setLoadingHistory(false);
        }
    };

    const fetchNotifications = async () => {
        try {
            const res = await api.notifications.getAll();
            if (res.success) {
                setNotifications(res.data);
            }
        } catch (error) {
            console.error('Failed to fetch notifications', error);
        }
    };

    const fetchApprovals = async () => {
        setLoading(true);
        try {
            const res = await api.suratApprovals.getPending();
            if (res.success) {
                setApprovals(res.data);
            }
        } catch (error) {
            console.error('Failed to fetch approvals', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchApprovals();
            fetchNotifications();
        }
    }, [isOpen]);

    const handleAction = async (id: number, action: 'APPROVED' | 'REJECTED' | 'RETURNED', actionReason?: string, signType?: 'signature' | 'paraf') => {
        setProcessingId(id);
        try {
            const res = await api.suratApprovals.processAction(id, { 
                action, 
                reason: actionReason,
                sign_type: signType 
            });
            if (res.success) {
                // Update local state instead of filtering, so user can track immediately
                setApprovals(approvals.map(a => {
                    if (a.id === id) {
                        const newChain = (typeof a.approval_chain === 'string' ? JSON.parse(a.approval_chain) : [...a.approval_chain])
                            .map((step: any) => {
                                // Update this specific approver's step in the chain
                                if (step.approver_id === user.id || step.role === a.role) {
                                    return { ...step, status: action };
                                }
                                return step;
                            });
                        return { ...a, status: action, approval_chain: newChain };
                    }
                    return a;
                }));
                
                // Dispatch event to update notification bubble elsewhere
                window.dispatchEvent(new CustomEvent('approval-action-success'));

                if (actionModal.isOpen) {
                    setActionModal({ isOpen: false, type: 'REJECT', id: null });
                    setReason('');
                }
                if (signingChoice.isOpen) {
                    setSigningChoice({ isOpen: false, id: null });
                }

                // Visual Injection: If preview is open, show the signature immediately
                if (action === 'APPROVED' && previewData.isOpen && previewData.approval_id === id) {
                    const imgUrl = signType === 'paraf' ? (user.paraf_image || user.signature_image) : (user.signature_image || user.paraf_image);
                    if (imgUrl) {
                        const fullImgUrl = imgUrl.startsWith('http') ? imgUrl : `${import.meta.env.VITE_API_URL || ''}${imgUrl}`;
                        const regex = new RegExp(`(<div[^>]*data-approver-id=["']${user.id}["'][^>]*>)\\s*<\\/div>`, 'gi');
                        const maxHeight = signType === 'paraf' ? '50px' : '80px';
                        const inkFilter = 'invert(20%) sepia(80%) saturate(4000%) hue-rotate(230deg) brightness(100%) contrast(100%)';
                        const newHtml = previewData.html.replace(regex, `$1<img src="${fullImgUrl}" style="max-height: ${maxHeight}; width: auto; display: block; margin: 0 auto; filter: ${inkFilter};" /></div>`);
                        
                        setPreviewData(prev => ({ 
                            ...prev, 
                            html: newHtml,
                            status: 'APPROVED' // Update status to hide action buttons
                        }));

                        // Optionally refresh history to show the new approved step
                        if (previewData.surat_id) fetchHistory(previewData.surat_id);
                    }
                }
            } else {
                alert(res.message || 'Gagal memproses persetujuan');
            }
        } catch (error) {
            console.error('Action failed', error);
            alert('Terjadi kesalahan sistem');
        } finally {
            setProcessingId(null);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
                <div className="flex items-center justify-between p-5 border-b border-slate-100">
                    <div>
                        <h2 className="text-lg font-bold text-slate-800">Kotak Masuk Persetujuan</h2>
                        <p className="text-xs text-slate-500 mt-1">Daftar dokumen yang menunggu tanda tangan Anda</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-5 bg-slate-50/50">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-40 text-slate-400">
                            <Loader2 className="animate-spin mb-3" size={24} />
                            <span className="text-sm">Memuat dokumen...</span>
                        </div>
                    ) : (approvals.length === 0 && notifications.filter(n => !n.is_read).length === 0) ? (
                        <div className="flex flex-col items-center justify-center h-40 text-slate-400 text-center">
                            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-3">
                                <CheckCircle size={32} className="text-slate-300" />
                            </div>
                            <h3 className="text-slate-600 font-semibold">Semua Bersih!</h3>
                            <span className="text-xs mt-1">Tidak ada dokumen atau notifikasi baru saat ini.</span>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* Notifications Section */}
                            {notifications.filter(n => !n.is_read).map((n) => (
                                <div key={`notif-${n.id}`} className="bg-rose-50 border border-rose-100 rounded-xl p-4 shadow-sm relative overflow-hidden group animate-in slide-in-from-top-2 duration-300">
                                    <div className="flex items-start gap-4">
                                        <div className="w-10 h-10 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center shrink-0 shadow-sm group-hover:scale-110 transition-transform">
                                            <XCircle size={20} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between">
                                                <h4 className="text-sm font-bold text-rose-900">{n.title}</h4>
                                                <span className="text-[10px] text-rose-400 font-medium">{new Date(n.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>
                                            </div>
                                            <p className="text-xs text-rose-700 mt-1 leading-relaxed">{n.message}</p>
                                            <button 
                                                onClick={async () => {
                                                    await api.notifications.markRead(n.id);
                                                    fetchNotifications();
                                                    window.dispatchEvent(new CustomEvent('notification-update'));
                                                }}
                                                className="mt-3 px-3 py-1 bg-white border border-rose-200 text-[10px] font-bold text-rose-600 hover:bg-rose-600 hover:text-white rounded-lg transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
                                            >
                                                <Check size={12} strokeWidth={3} /> TANDAI DIBACA
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {/* Approvals Section */}
                            {approvals.map((doc) => (
                                <div key={doc.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex flex-col sm:flex-row justify-between gap-4">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className={`px-2.5 py-1 text-[10px] font-bold rounded-md tracking-wide ${
                                                    doc.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' : 
                                                    doc.status === 'RETURNED' ? 'bg-amber-100 text-amber-700' : 
                                                    'bg-amber-100 text-amber-700'
                                                }`}>
                                                    {doc.status === 'APPROVED' ? 'SUDAH ANDA TTD' : 
                                                     doc.status === 'RETURNED' ? 'ANDA KEMBALIKAN' : 
                                                     'MENUNGGU TTD'}
                                                </span>
                                                <span className="text-xs text-slate-400 font-medium">{new Date(doc.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                                            </div>
                                            <h3 className="text-base font-bold text-slate-800 leading-snug">{doc.perihal || 'Dokumen Tanpa Perihal'}</h3>
                                            <div className="mt-2 space-y-1">
                                                <p className="text-[10px] text-slate-600 flex items-center gap-2">
                                                    <span className="w-16 text-slate-400 font-medium">Pembuat</span>: <span className="font-bold text-slate-700">{doc.pembuat_nama}</span>
                                                </p>
                                                <p className="text-[10px] text-slate-600 flex items-center gap-2">
                                                    <span className="w-16 text-slate-400 font-medium">Pengusul</span>: <span className="font-bold text-indigo-600">{doc.pengusul_nama}</span>
                                                </p>
                                                <p className="text-xs text-slate-600 flex items-center gap-2">
                                                    <span className="w-20 text-slate-400">Peran Anda</span>: <span className="uppercase text-slate-700 font-bold">{doc.role.replace('_', ' ')}</span>
                                                </p>
                                            </div>
                                        </div>
                                        
                                        {/* Vertical Progress Chain - Space between Info and Buttons */}
                                        <div className="hidden lg:flex flex-col items-center justify-center gap-1 px-6 border-x border-slate-50 min-w-[80px]">
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Progres</p>
                                            <div className="flex flex-col items-center">
                                                {(() => {
                                                    const chain = doc.approval_chain && (typeof doc.approval_chain === 'string' ? JSON.parse(doc.approval_chain) : doc.approval_chain);
                                                    return chain.sort((a: any, b: any) => a.urutan - b.urutan).map((step: any, idx: number) => (
                                                        <div key={idx} className="flex flex-col items-center group relative">
                                                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] shadow-sm z-10 border-2 border-white transition-all duration-300 ${
                                                                step.status === 'APPROVED' ? 'bg-emerald-500 text-white shadow-emerald-200' : 
                                                                step.status === 'REJECTED' ? 'bg-rose-500 text-white shadow-rose-200' : 
                                                                step.status === 'RETURNED' ? 'bg-amber-500 text-white shadow-amber-200' : 
                                                                'bg-slate-50 text-slate-400 border-slate-200'
                                                            }`} title={`${step.role}: ${step.approver_name}`}>
                                                                {step.status === 'APPROVED' ? <Check size={12} strokeWidth={3} /> : 
                                                                 step.status === 'REJECTED' ? <X size={12} strokeWidth={3} /> : 
                                                                 step.status === 'RETURNED' ? <RefreshCw size={10} strokeWidth={3} /> : 
                                                                 <span className="font-bold">{step.urutan}</span>}
                                                            </div>
                                                            {idx < chain.length - 1 && (
                                                                <div className={`w-0.5 h-4 -my-0.5 transition-colors duration-500 ${
                                                                    (step.status === 'APPROVED' && chain[idx+1].status !== 'PENDING') ? 'bg-emerald-400' : 'bg-slate-100'
                                                                }`} />
                                                            )}
                                                            {/* Tooltip on hover */}
                                                            <div className="absolute left-full ml-3 px-3 py-2 bg-slate-900 text-white text-[10px] rounded-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 z-20 whitespace-nowrap shadow-2xl translate-x-2 group-hover:translate-x-0 border border-slate-700/50">
                                                                <p className="font-black uppercase tracking-wider text-[9px] text-indigo-300 mb-0.5">
                                                                    {step.role?.toLowerCase() === 'pengusul' ? 'PENGUSUL' : 
                                                                     step.role?.toLowerCase() === 'ketua_tim' ? 'KETUA TIM' : 
                                                                     step.role?.toLowerCase() === 'kabid' ? 'KEPALA BIDANG' : 
                                                                     step.role?.toLowerCase() === 'sekretaris' ? 'SEKRETARIS' : 
                                                                     step.role?.toLowerCase() === 'kaban' ? 'KEPALA BADAN' : 
                                                                     (step.role || 'PERAN').replace('_', ' ').toUpperCase()}
                                                                </p>
                                                                <p className="font-bold text-slate-100">{step.approver_name || 'Menunggu...'}</p>
                                                                {step.status !== 'PENDING' && (
                                                                    <p className="text-[8px] mt-1 text-slate-400 font-medium italic border-t border-slate-800 pt-1">
                                                                        {step.status === 'APPROVED' ? 'Telah Disetujui' : 
                                                                         step.status === 'REJECTED' ? (step.role === 'pengusul' ? 'Dibatalkan' : 'Ditolak') : 'Dikembalikan'}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ));
                                                })()}
                                            </div>
                                        </div>
                                        
                                        <div className="flex flex-col justify-center gap-2 shrink-0 border-t sm:border-t-0 sm:border-l border-slate-100 pt-4 sm:pt-0 sm:pl-6 min-w-[150px]">
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
                                                             const pBefore = template?.paragraph_spacing_before || (useGlobal ? globalSettings?.paragraph_spacing_before : 0) || 0;
                                                             const pAfter = template?.paragraph_spacing_after || (useGlobal ? globalSettings?.paragraph_spacing_after : 0) || 0;
                                                             const pIndent = template?.first_line_indent || (useGlobal ? globalSettings?.first_line_indent : 0) || 0;

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
                                                                let borderHtml = '';
                                                                if (lineStyle === 'single') {
                                                                    borderHtml = '<div style="border-bottom: 1.5pt solid #000; margin-top: 4pt;"></div>';
                                                                } else if (lineStyle === 'thick') {
                                                                    borderHtml = '<div style="border-bottom: 3pt solid #000; margin-top: 4pt;"></div>';
                                                                } else if (lineStyle === 'double' || lineStyle === 'heavy-light' || lineStyle === 'light-heavy') {
                                                                    const top = (lineStyle === 'double' || lineStyle === 'heavy-light') ? '2.25pt' : '0.75pt';
                                                                    const bottom = (lineStyle === 'double' || lineStyle === 'heavy-light') ? '0.75pt' : '2.25pt';
                                                                    borderHtml = `
                                                                        <div style="border-bottom: ${top} solid #000; margin-top: 4pt;"></div>
                                                                        <div style="border-bottom: ${bottom} solid #000; margin-top: 2pt;"></div>
                                                                    `;
                                                                } else if (lineStyle !== 'none') {
                                                                    borderHtml = '<div style="border-bottom: 1.5pt solid #000; margin-top: 4pt;"></div>';
                                                                }

                                                                kopHtml = `
                                                                    <div style="text-align: center; margin-bottom: 25px; position: relative;">
                                                                        <table style="width: 100%; border-collapse: collapse; margin-bottom: 2px;">
                                                                            <tr>
                                                                                <td style="width: 95px; text-align: left; vertical-align: middle;">
                                                                                    ${inst.logo_kop_path ? `<img src="${inst.logo_kop_path}" style="width: 85px; height: auto; display: block;" />` : ''}
                                                                                </td>
                                                                                <td style="text-align: center; vertical-align: middle; padding: 0 5px;">
                                                                                    <div style="font-size: 13pt; font-weight: bold; line-height: 1.1; text-transform: uppercase;">PEMERINTAH KABUPATEN BOGOR</div>
                                                                                    <div style="font-size: 15pt; font-weight: bold; line-height: 1.1; text-transform: uppercase;">
                                                                                        ${(inst.nama_instansi_kop || inst.instansi || '').toUpperCase().replace(' RISET', '<br/>RISET')}
                                                                                    </div>
                                                                                    <div style="font-size: 7pt; font-weight: normal; margin-top: 4px; line-height: 1.2;">
                                                                                        ${inst.alamat || ''} Kode Pos ${inst.kode_pos || ''} Telp: ${inst.telepon_kop || ''} Faks: ${inst.faks_kop || ''}<br/>
                                                                                        Laman: ${inst.website_kop || '-'} | Pos-el: ${inst.email_kop || '-'}
                                                                                    </div>
                                                                                </td>
                                                                                <td style="width: 95px;"></td>
                                                                            </tr>
                                                                        </table>
                                                                        ${borderHtml}
                                                                    </div>
                                                                `;
                                                            }

                                                             const dateStr = new Date(doc.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
                                                             const kec = (inst.kecamatan || 'Cibinong').charAt(0).toUpperCase() + (inst.kecamatan || 'Cibinong').slice(1).toLowerCase();

                                                             const metaTableHtml = isCuti ? '' : `
                                                                <table style="width: 100%; border-collapse: collapse; margin-bottom: 2rem; font-family: Arial, sans-serif; font-size: ${fSize}pt;">
                                                                    <tr style="vertical-align: top;">
                                                                        <td style="width: 15%;">Nomor</td>
                                                                        <td style="width: 2%;">:</td>
                                                                        <td style="width: 48%;">${doc.nomor_surat || '...'}</td>
                                                                        <td style="width: 35%;">Kepada</td>
                                                                    </tr>
                                                                    <tr style="vertical-align: top;">
                                                                        <td>Sifat</td>
                                                                        <td>:</td>
                                                                        <td>${doc.sifat || 'Biasa'}</td>
                                                                        <td rowspan="3" style="padding-top: 0;">
                                                                            Yth. ${doc.tujuan_surat || '...'}<br/>
                                                                            di<br/>
                                                                            <span style="display: inline-block; margin-left: 1.5rem;">${inst.lokasi || 'Tempat'}</span>
                                                                        </td>
                                                                    </tr>
                                                                    <tr style="vertical-align: top;">
                                                                        <td>Lampiran</td>
                                                                        <td>:</td>
                                                                        <td>${doc.lampiran || '-'}</td>
                                                                    </tr>
                                                                    <tr style="vertical-align: top;">
                                                                        <td>Hal</td>
                                                                        <td>:</td>
                                                                        <td><strong>${doc.perihal || '...'}</strong></td>
                                                                    </tr>
                                                                </table>
                                                             `;

                                                             fullHtml = `
                                                                ${kopHtml}
                                                                <div style="text-align: right; margin-bottom: 20px; font-family: Arial, sans-serif; font-size: ${fSize}pt;">
                                                                    ${kec}, ${dateStr}
                                                                </div>
                                                                ${metaTableHtml}
                                                                 <div id="letter-content-approval" style="font-family: ${useGlobal && globalSettings ? globalSettings.font_family : (template?.font_family || 'Arial, sans-serif')}; font-size: ${fSize}pt; line-height: ${lHeight}; text-align: ${tAlign};">
                                                                     <style>
                                                                        #letter-content-approval p { 
                                                                            margin-top: ${pBefore}pt; 
                                                                            margin-bottom: ${pAfter}pt; 
                                                                            text-indent: ${pIndent}mm; 
                                                                        }
                                                                     </style>
                                                                     ${doc.isi_surat || ''}
                                                                 </div>
                                                                 ${(() => {
                                                                     const verifyUrl = `${String(import.meta.env.VITE_DASHBOARD_PUBLIC_URL || import.meta.env.VITE_VERIFY_URL || window.location.origin)}?v=${doc.verification_slug || ''}`;
                                                                     const logoForQr = typeof inst?.logo_kop_path === 'string' ? inst.logo_kop_path : '';
                                                                     const qrValue = doc.verification_slug ? verifyUrl : "PREVIEW_ONLY";
                                                                     const qrUrl = getPremiumQrUrl(qrValue, logoForQr);
                                                                     const footerQrHtml = `
                                                                         <div style="position: absolute; bottom: 5mm; left: 5mm; z-index: 10;">
                                                                             <div style="padding: 4px; background: white; border: 1px solid #f1f5f9; border-radius: 4px; box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05); display: flex; align-items: center; justify-content: center;">
                                                                                 <img src="${qrUrl}" style="width: 60px; height: 60px; display: block;" />
                                                                             </div>
                                                                         </div>
                                                                     `;
                                                                     return footerQrHtml;
                                                                 })()}
                                                                  ${(() => {
                                                                     let meta = null;
                                                                     try {
                                                                         meta = typeof doc.metadata === 'string' ? JSON.parse(doc.metadata) : doc.metadata;
                                                                     } catch(e) {}
                                                                     
                                                                     if (meta && meta.eventData) {
                                                                         const ed = meta.eventData;
                                                                         return `
                                                                             <div style="margin-top: 20px; font-family: Arial, sans-serif; font-size: ${fSize}pt;">
                                                                                 <table style="width: 100%; border-collapse: collapse;">
                                                                                     <tr style="vertical-align: top;">
                                                                                         <td style="width: 18%;">Hari/Tanggal</td>
                                                                                         <td style="width: 2%;">:</td>
                                                                                         <td style="width: 80%; font-weight: bold;">${ed.hari_tanggal || '...'}</td>
                                                                                     </tr>
                                                                                     <tr style="vertical-align: top;">
                                                                                         <td>Waktu</td>
                                                                                         <td>:</td>
                                                                                         <td>${ed.waktu || '...'}</td>
                                                                                     </tr>
                                                                                     <tr style="vertical-align: top;">
                                                                                         <td>Tempat</td>
                                                                                         <td>:</td>
                                                                                         <td>
                                                                                             ${ed.tempat || '...'}
                                                                                             ${ed.tipe === 'Online' && ed.link ? `<br/>Link: <span style="color: blue; text-decoration: underline;">${ed.link}</span>` : ''}
                                                                                         </td>
                                                                                     </tr>
                                                                                     <tr style="vertical-align: top;">
                                                                                         <td>Agenda</td>
                                                                                         <td>:</td>
                                                                                         <td>${ed.agenda || '...'}</td>
                                                                                     </tr>
                                                                                 </table>
                                                                             </div>
                                                                         `;
                                                                     }
                                                                     return '';
                                                                 })()}
                                                             `;

                                                             setPreviewData({ 
                                                                isOpen: true, 
                                                                html: repairOldQrUrls(fullHtml, logoPath), 
                                                                title: doc.perihal, 
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
                                                        }
                                                    } catch (e) {
                                                        console.error('Error generating preview:', e);
                                                    }
                                                    fetchHistory(doc.surat_id);
                                                }}
                                                className="w-full sm:w-auto px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors"
                                            >
                                                <Search size={16} />
                                                Lihat Surat
                                            </button>
                                            {doc.status === 'PENDING' ? (
                                                <>
                                                    <button 
                                                        onClick={() => setSigningChoice({ isOpen: true, id: doc.id })}
                                                        disabled={processingId === doc.id}
                                                        className="w-full sm:w-auto px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-70"
                                                    >
                                                        {processingId === doc.id ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                                                        Setujui & TTD
                                                    </button>
                                                    <div className="flex gap-2">
                                                        <button 
                                                            onClick={() => setActionModal({ isOpen: true, type: 'RETURN', id: doc.id })}
                                                            disabled={processingId === doc.id}
                                                            className="flex-1 px-3 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors"
                                                        >
                                                            <RefreshCw size={14} />
                                                            Kembalikan
                                                        </button>
                                                        <button 
                                                            onClick={() => setActionModal({ isOpen: true, type: 'REJECT', id: doc.id })}
                                                            disabled={processingId === doc.id}
                                                            className="flex-1 px-3 py-2 bg-white border border-red-200 hover:bg-red-50 text-red-600 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors"
                                                        >
                                                            <XCircle size={14} />
                                                            Tolak
                                                        </button>
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="flex flex-col items-center p-3 bg-slate-50 rounded-lg border border-slate-100">
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Status Anda</span>
                                                    <div className="flex items-center gap-1.5 text-emerald-600 font-bold text-xs">
                                                        <Check size={14} strokeWidth={3} />
                                                        Selesai Diproses
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Action Modal (Reject / Return) */}
            {actionModal.isOpen && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
                        <h3 className="text-lg font-bold text-slate-800 mb-2">
                            {actionModal.type === 'REJECT' ? 'Tolak Dokumen' : 'Kembalikan Dokumen'}
                        </h3>
                        <p className="text-sm text-slate-600 mb-4">
                            Silakan masukkan alasan mengapa dokumen ini {actionModal.type === 'REJECT' ? 'ditolak' : 'dikembalikan ke pengusul'}. Alasan ini akan dibaca oleh pengusul.
                        </p>
                        
                        <textarea
                            ref={textareaRef}
                            id="rejection-reason"
                            name="reason"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 mb-4 min-h-[100px] resize-none text-slate-900"
                            placeholder="Ketik alasan di sini..."
                        />
                        
                        <div className="flex gap-3 justify-end">
                            <button 
                                onClick={() => {
                                    setActionModal({ isOpen: false, type: 'REJECT', id: null });
                                    setReason('');
                                }}
                                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-xl transition-colors"
                            >
                                Batal
                            </button>
                            <button 
                                onClick={() => {
                                    if (actionModal.id && reason.trim()) {
                                        handleAction(actionModal.id, actionModal.type === 'REJECT' ? 'REJECTED' : 'RETURNED', reason);
                                    } else {
                                        alert('Alasan wajib diisi!');
                                    }
                                }}
                                className={`px-4 py-2 text-white text-sm font-semibold rounded-xl transition-colors flex items-center gap-2 ${actionModal.type === 'REJECT' ? 'bg-red-600 hover:bg-red-700' : 'bg-amber-600 hover:bg-amber-700'}`}
                            >
                                {processingId === actionModal.id ? <Loader2 size={16} className="animate-spin" /> : null}
                                Konfirmasi
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Signing Choice Modal */}
            {signingChoice.isOpen && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl relative animate-in zoom-in-95 duration-300" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="text-lg font-black text-slate-800">Pilih Jenis TTD</h3>
                                <p className="text-xs text-slate-500">Pilih spesimen yang ingin digunakan</p>
                            </div>
                            <button 
                                onClick={() => setSigningChoice({ isOpen: false, id: null })}
                                className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-8">
                            {/* Tanda Tangan Option */}
                            <button
                                onClick={() => signingChoice.id && handleAction(signingChoice.id, 'APPROVED', undefined, 'signature')}
                                disabled={processingId !== null}
                                className="group relative flex flex-col items-center p-4 bg-white border-2 border-slate-100 rounded-2xl hover:border-indigo-500 hover:bg-indigo-50/30 transition-all text-center"
                            >
                                <div className="w-full aspect-[3/2] bg-slate-50 rounded-xl mb-3 flex items-center justify-center p-2 overflow-hidden border border-slate-100 group-hover:border-indigo-100 transition-colors">
                                    {user?.signature_image ? (
                                        <img 
                                            src={user.signature_image.startsWith('http') ? user.signature_image : `${import.meta.env.VITE_API_URL || ''}${user.signature_image}`} 
                                            className="max-h-full max-w-full object-contain"
                                            style={{ filter: 'invert(20%) sepia(80%) saturate(4000%) hue-rotate(230deg) brightness(100%) contrast(100%)' }}
                                            alt="TTD Preview"
                                        />
                                    ) : (
                                        <div className="text-slate-300 flex flex-col items-center">
                                            <Shield size={24} className="opacity-20 mb-1" />
                                            <span className="text-[10px] font-bold">Belum Ada TTD</span>
                                        </div>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="p-1.5 bg-indigo-100 text-indigo-600 rounded-md">
                                        <PenTool size={14} />
                                    </div>
                                    <span className="text-xs font-black text-slate-700">Tanda Tangan</span>
                                </div>
                            </button>

                            {/* Paraf Option */}
                            <button
                                onClick={() => signingChoice.id && handleAction(signingChoice.id, 'APPROVED', undefined, 'paraf')}
                                disabled={processingId !== null}
                                className="group relative flex flex-col items-center p-4 bg-white border-2 border-slate-100 rounded-2xl hover:border-indigo-500 hover:bg-indigo-50/30 transition-all text-center"
                            >
                                <div className="w-full aspect-[3/2] bg-slate-50 rounded-xl mb-3 flex items-center justify-center p-2 overflow-hidden border border-slate-100 group-hover:border-indigo-100 transition-colors">
                                    {user?.paraf_image ? (
                                        <img 
                                            src={user.paraf_image.startsWith('http') ? user.paraf_image : `${import.meta.env.VITE_API_URL || ''}${user.paraf_image}`} 
                                            className="max-h-full max-w-full object-contain"
                                            style={{ filter: 'invert(20%) sepia(80%) saturate(4000%) hue-rotate(230deg) brightness(100%) contrast(100%)' }}
                                            alt="Paraf Preview"
                                        />
                                    ) : (
                                        <div className="text-slate-300 flex flex-col items-center">
                                            <Shield size={24} className="opacity-20 mb-1" />
                                            <span className="text-[10px] font-bold">Belum Ada Paraf</span>
                                        </div>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="p-1.5 bg-indigo-100 text-indigo-600 rounded-md">
                                        <ImageIcon size={14} />
                                    </div>
                                    <span className="text-xs font-black text-slate-700">Paraf</span>
                                </div>
                            </button>
                        </div>

                        {processingId && (
                            <div className="flex items-center justify-center gap-3 text-indigo-600 font-bold text-sm animate-pulse">
                                <Loader2 className="animate-spin" size={20} />
                                Sedang Memproses TTD...
                            </div>
                        )}
                        
                        {!processingId && (
                            <button 
                                onClick={() => setSigningChoice({ isOpen: false, id: null })}
                                className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all"
                            >
                                Batal
                            </button>
                        )}
                    </div>
                </div>,
                document.body
            )}

            {/* HTML Preview Modal for Drafts */}
            {previewData.isOpen && createPortal(
                <div className="fixed inset-0 z-[9990] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setPreviewData({ ...previewData, isOpen: false })} />
                    <div className="relative w-full max-w-5xl bg-slate-100 rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[95vh] h-[95vh] animate-in zoom-in-95 duration-300" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-8 py-4 border-b border-slate-200 bg-white shrink-0">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                                    <FileText size={24} />
                                </div>
                                <div>
                                    <h3 className="font-black text-slate-800 tracking-tight leading-none">{previewData.title || 'Draft Surat'}</h3>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1.5 flex items-center gap-2">
                                        <Maximize2 size={12} /> Pratinjau Dokumen Digital
                                    </p>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200">
                                    <button 
                                        onClick={() => setPreviewData(prev => ({ ...prev, zoom: Math.max(0.3, prev.zoom - 0.1) }))}
                                        className="w-8 h-8 flex items-center justify-center text-slate-500 hover:bg-white hover:shadow-sm rounded-lg transition-all"
                                    >
                                        <ZoomOut size={16} />
                                    </button>
                                    <div className="w-12 text-center text-[10px] font-black text-slate-600 tabular-nums">
                                        {Math.round(previewData.zoom * 100)}%
                                    </div>
                                    <button 
                                        onClick={() => setPreviewData(prev => ({ ...prev, zoom: Math.min(2.0, prev.zoom + 0.1) }))}
                                        className="w-8 h-8 flex items-center justify-center text-slate-500 hover:bg-white hover:shadow-sm rounded-lg transition-all"
                                    >
                                        <ZoomIn size={16} />
                                    </button>
                                    <div className="w-px h-4 bg-slate-200 mx-1"></div>
                                    <button 
                                        onClick={() => setPreviewData(prev => ({ ...prev, zoom: 0.65 }))}
                                        className="w-8 h-8 flex items-center justify-center text-slate-500 hover:bg-white hover:shadow-sm rounded-lg transition-all"
                                        title="Reset Zoom"
                                    >
                                        <RefreshCw size={14} />
                                    </button>
                                </div>

                                <button 
                                    onClick={() => setPreviewData({ ...previewData, isOpen: false })}
                                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-800 text-white hover:bg-slate-900 transition-all active:scale-95 shadow-lg shadow-slate-800/20"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-hidden flex flex-col md:flex-row bg-slate-200/50">
                            {/* Tracking Record Sidebar */}
                            <div className="w-full md:w-64 bg-white border-b md:border-b-0 md:border-r border-slate-200 overflow-y-auto p-6 flex flex-col max-h-[200px] md:max-h-none">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6 hidden md:block">Tracking Record</h4>
                                <div className="flex items-center justify-between mb-4 md:hidden">
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Tracking Record</h4>
                                    <span className="text-[10px] font-bold text-indigo-600 px-2 py-0.5 bg-indigo-50 rounded">Proses Berjalan</span>
                                </div>
                                
                                {loadingHistory ? (
                                    <div className="flex flex-col items-center justify-center py-10 text-slate-300">
                                        <Loader2 className="animate-spin mb-2" size={20} />
                                        <span className="text-[10px] font-bold">Memuat tracking...</span>
                                    </div>
                                ) : (
                                    <div className="relative flex flex-col-reverse">
                                        {/* Vertical Line */}
                                        <div className="absolute left-[15px] top-4 bottom-4 w-0.5 bg-slate-100" />
                                        
                                        {history.map((step, idx) => (
                                            <div key={step.id} className={`relative flex items-start gap-4 mb-8 last:mb-0 ${idx === history.length - 1 ? 'z-10' : ''}`}>
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10 shadow-sm border-4 border-white transition-all duration-500 ${
                                                    step.status === 'APPROVED' ? 'bg-emerald-500 text-white' : 
                                                    step.status === 'REJECTED' ? 'bg-rose-500 text-white' : 
                                                    step.status === 'RETURNED' ? 'bg-amber-500 text-white' : 
                                                    'bg-slate-200 text-slate-400'
                                                }`}>
                                                    {step.status === 'APPROVED' ? <Check size={14} strokeWidth={3} /> : 
                                                     step.status === 'REJECTED' ? <X size={14} strokeWidth={3} /> : 
                                                     step.status === 'RETURNED' ? <RefreshCw size={12} strokeWidth={3} /> : 
                                                     <Clock size={14} strokeWidth={3} />}
                                                </div>
                                                <div className="flex-1 min-w-0 pt-1">
                                                    <p className={`text-[11px] font-black leading-none uppercase tracking-tight ${step.status === 'APPROVED' ? 'text-emerald-600' : 'text-slate-400'}`}>
                                                        {step.role.replace('_', ' ')}
                                                    </p>
                                                    <p className="text-[10px] font-bold text-slate-700 mt-1 truncate" title={step.approver_name}>
                                                        {step.approver_name}
                                                    </p>
                                                    {step.updated_at && step.status !== 'PENDING' && (
                                                        <p className="text-[9px] text-slate-400 mt-1 flex items-center gap-1 font-medium">
                                                            <Clock size={10} /> {new Date(step.updated_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                                                        </p>
                                                    )}
                                                    {step.reason && (
                                                        <div className="mt-2 p-2 bg-slate-50 rounded-lg border border-slate-100 italic text-[9px] text-slate-500 leading-tight">
                                                            "{step.reason}"
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div className="mt-auto space-y-4 pt-6 border-t border-slate-100">
                                    {/* Action Buttons in Sidebar */}
                                    {previewData.status === 'PENDING' && (
                                        <div className="flex flex-col gap-3">
                                            <button 
                                                onClick={() => setSigningChoice({ isOpen: true, id: previewData.approval_id || null })}
                                                className="w-full py-2.5 bg-[#5D45FD] hover:bg-[#4C36E2] text-white text-[11px] font-bold rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-500/25 active:scale-[0.98]"
                                            >
                                                <div className="w-5 h-5 rounded-full border-2 border-white/30 flex items-center justify-center">
                                                    <Check size={11} strokeWidth={4} />
                                                </div>
                                                Setujui & TTD
                                            </button>
                                            <div className="grid grid-cols-2 gap-3">
                                                <button 
                                                    onClick={() => setActionModal({ isOpen: true, type: 'RETURN', id: previewData.approval_id || null })}
                                                    className="py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 text-[10px] font-bold rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                                                >
                                                    <RefreshCw size={13} className="text-slate-400" />
                                                    Kembalikan
                                                </button>
                                                <button 
                                                    onClick={() => setActionModal({ isOpen: true, type: 'REJECT', id: previewData.approval_id || null })}
                                                    className="py-2 bg-white border border-red-100 hover:bg-red-50 text-red-600 text-[10px] font-bold rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                                                >
                                                    <XCircle size={14} className="text-red-500" />
                                                    Tolak
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-100/50">
                                        <p className="text-[9px] font-bold text-indigo-600 uppercase tracking-widest mb-1">Status Terakhir</p>
                                        <p className="text-[11px] font-black text-indigo-900 leading-tight">
                                            {history.find(h => h.status === 'PENDING') 
                                                ? `Menunggu ${history.find(h => h.status === 'PENDING')?.role.replace('_', ' ')}`
                                                : 'Selesai / Menunggu Upload'
                                            }
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Letter Content */}
                            <div className="flex-1 overflow-auto p-8 scrollbar-thin flex flex-col items-center">
                                <div 
                                    className="bg-white shadow-2xl transition-transform duration-300 origin-top mb-20 relative"
                                    style={{ 
                                        transform: `scale(${previewData.zoom})`,
                                        transformOrigin: 'top center',
                                        marginBottom: `${(297 * previewData.zoom) - 297}mm`,
                                        width: previewData.layout?.paperSize === 'F4' ? '215mm' : (previewData.layout?.paperSize === 'Letter' ? '215.9mm' : '210mm'),
                                        minHeight: previewData.layout?.paperSize === 'F4' ? '330mm' : (previewData.layout?.paperSize === 'Letter' ? '279.4mm' : '297mm'),
                                        padding: previewData.layout ? `${previewData.layout.marginTop}mm ${previewData.layout.marginRight}mm ${previewData.layout.marginBottom}mm ${previewData.layout.marginLeft}mm` : '2.5cm 2cm 2cm 3cm',
                                        fontFamily: 'Arial, sans-serif', 
                                        fontSize: `${previewData.layout?.fontSize || 12}pt`, 
                                        boxSizing: 'border-box',
                                        lineHeight: previewData.layout?.lineHeight || 1.5,
                                        textAlign: (previewData.layout?.textAlign || 'justify') as any,
                                        color: 'black',
                                        textRendering: 'optimizeLegibility'
                                    }}
                                    dangerouslySetInnerHTML={{ __html: previewData.html }}
                                />
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
