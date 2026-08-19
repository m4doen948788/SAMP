import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
    X, Maximize2, ZoomOut, ZoomIn, RefreshCw, Clock, 
    Check, X as XIcon, CheckCircle, FileText, XCircle, Loader2, 
    ChevronRight, Mail, Bell, Shield, PenTool, Image as ImageIcon 
} from 'lucide-react';
import { api, API_URL } from '@/src/services/api';
import { getSkpAlertsForUser, getDetailedStaffTunggakan, SkpAlert } from '@/src/services/skpHelpers';
import { useAuth } from '@/src/contexts/AuthContext';

import InboxSidebar from './inbox/InboxSidebar';
import InboxDetailPanel from './inbox/InboxDetailPanel';
import InboxActionModal from './inbox/InboxActionModal';

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
    const [unsubmittedSkps, setUnsubmittedSkps] = useState<SkpAlert[]>([]);
    const [loadingSkp, setLoadingSkp] = useState(false);
    const [activeItem, setActiveItem] = useState<{ type: 'SKP' | 'SURAT' | 'NOTIF' | 'LENGKAPI_BERKAS'; id: string | number; data: any } | null>(null);
    const [staffTunggakan, setStaffTunggakan] = useState<any[]>([]);
    const [expandedAlertIndex, setExpandedAlertIndex] = useState<number | null>(null);
    const [expandedStaffId, setExpandedStaffId] = useState<string | null>(null);

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
        let relativeLogo = logoUrl || '';
        if (relativeLogo.startsWith(window.location.origin)) {
            relativeLogo = relativeLogo.replace(window.location.origin, '');
        }
        if (relativeLogo && !relativeLogo.startsWith('/') && !relativeLogo.startsWith('http')) {
            relativeLogo = '/' + relativeLogo;
        }
        const encodedLogo = relativeLogo ? encodeURIComponent(relativeLogo) : '';
        const baseUrl = API_URL.endsWith('/api') ? API_URL.substring(0, API_URL.length - 4) : API_URL;
        return `${baseUrl}/api/public/qr/generate?text=${encodedData}${encodedLogo ? `&logo=${encodedLogo}` : ''}&size=300`;
    };

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
                return res.data;
            }
        } catch (error) {
            console.error('Failed to fetch notifications', error);
        }
        return [];
    };

    const fetchApprovals = async () => {
        try {
            const res = await api.suratApprovals.getPending();
            if (res.success) {
                setApprovals(res.data);
                return res.data;
            }
        } catch (error) {
            console.error('Failed to fetch approvals', error);
        }
        return [];
    };

    const fetchSkpUnsubmitted = async () => {
        setLoadingSkp(true);
        try {
            const [alertsList, detailedList] = await Promise.all([
                getSkpAlertsForUser(user),
                getDetailedStaffTunggakan(user)
            ]);
            setUnsubmittedSkps(alertsList);
            setStaffTunggakan(detailedList);
            return alertsList;
        } catch (error) {
            console.error('Failed to check SKP status', error);
            return [];
        } finally {
            setLoadingSkp(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            setLoading(true);
            Promise.all([
                fetchApprovals(),
                fetchNotifications(),
                fetchSkpUnsubmitted()
            ]).then(([apps, notifs, skps]) => {
                setLoading(false);
                
                // If there's an auto-navigate request from notification trigger
                const targetType = sessionStorage.getItem('inbox_navigate_type');
                const targetId = sessionStorage.getItem('inbox_navigate_id');
                
                if (targetType && targetId) {
                    sessionStorage.removeItem('inbox_navigate_type');
                    sessionStorage.removeItem('inbox_navigate_id');
                    
                    if (targetType === 'SURAT') {
                        const matched = apps.find((a: any) => Number(a.id) === Number(targetId));
                        if (matched) setActiveItem({ type: 'SURAT', id: matched.id, data: matched });
                    } else if (targetType === 'NOTIF') {
                        const matched = notifs.find((n: any) => Number(n.id) === Number(targetId));
                        if (matched) {
                            if (matched.type === 'tagihan_dokumen') {
                                const tagihanDocs = notifs.filter((n: any) => !n.is_read && n.type === 'tagihan_dokumen');
                                setActiveItem({ type: 'LENGKAPI_BERKAS', id: 'lengkapi-berkas', data: tagihanDocs });
                            } else {
                                setActiveItem({ type: 'NOTIF', id: matched.id, data: matched });
                            }
                        }
                    } else if (targetType === 'SKP') {
                        setActiveItem({ type: 'SKP', id: 'skp-warning', data: skps });
                    }
                } else {
                    // Default behavior
                    if (skps.length > 0) {
                        setActiveItem({ type: 'SKP', id: 'skp-warning', data: skps });
                    } else if (apps.length > 0) {
                        setActiveItem({ type: 'SURAT', id: apps[0].id, data: apps[0] });
                    } else {
                        const unread = notifs.filter((n: any) => !n.is_read);
                        if (unread.length > 0) {
                            const tagihanDocs = unread.filter((n: any) => n.type === 'tagihan_dokumen');
                            if (tagihanDocs.length > 0) {
                                setActiveItem({ type: 'LENGKAPI_BERKAS', id: 'lengkapi-berkas', data: tagihanDocs });
                            } else {
                                setActiveItem({ type: 'NOTIF', id: unread[0].id, data: unread[0] });
                            }
                        } else {
                            setActiveItem(null);
                        }
                    }
                }
            });
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
                setApprovals(approvals.map(a => {
                    if (a.id === id) {
                        const newChain = (typeof a.approval_chain === 'string' ? JSON.parse(a.approval_chain) : [...a.approval_chain])
                            .map((step: any) => {
                                if (step.approver_id === user.id || step.role === a.role) {
                                    return { ...step, status: action };
                                }
                                return step;
                            });
                        return { ...a, status: action, approval_chain: newChain };
                    }
                    return a;
                }));
                
                window.dispatchEvent(new CustomEvent('approval-action-success'));

                if (actionModal.isOpen) {
                    setActionModal({ isOpen: false, type: 'REJECT', id: null });
                    setReason('');
                }
                if (signingChoice.isOpen) {
                    setSigningChoice({ isOpen: false, id: null });
                }

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
                            status: 'APPROVED'
                        }));

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

    const currentMonthName = new Date().toLocaleDateString('id-ID', { month: 'long' }).toUpperCase();

    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-slate-100 shrink-0 bg-white">
                    <div>
                        <h2 className="text-lg font-bold text-slate-800">Kotak Masuk Terpadu</h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* 2-Panel Body */}
                <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
                    
                    {/* Left Sidebar - Item List */}
                    <div className={`w-full md:w-80 border-r border-slate-100 flex flex-col bg-slate-50/30 shrink-0 overflow-y-auto ${activeItem ? 'hidden md:flex' : 'flex'}`}>
                        <InboxSidebar 
                            loading={loading}
                            unsubmittedSkps={unsubmittedSkps}
                            approvals={approvals}
                            notifications={notifications}
                            activeItem={activeItem}
                            setActiveItem={setActiveItem}
                            currentMonthName={currentMonthName}
                        />
                    </div>

                    {/* Right Details Panel */}
                    <InboxDetailPanel 
                        activeItem={activeItem}
                        setActiveItem={setActiveItem}
                        unsubmittedSkps={unsubmittedSkps}
                        staffTunggakan={staffTunggakan}
                        expandedAlertIndex={expandedAlertIndex}
                        setExpandedAlertIndex={setExpandedAlertIndex}
                        expandedStaffId={expandedStaffId}
                        setExpandedStaffId={setExpandedStaffId}
                        onClose={onClose}
                        user={user}
                        globalSettings={globalSettings}
                        processingId={processingId}
                        setActionModal={setActionModal}
                        setSigningChoice={setSigningChoice}
                        setPreviewData={setPreviewData}
                        fetchHistory={fetchHistory}
                        repairOldQrUrls={repairOldQrUrls}
                        currentMonthName={currentMonthName}
                        api={api}
                    />
                </div>
            </div>

            {/* Reject/Return and Signing choice Modals */}
            <InboxActionModal 
                actionModal={actionModal}
                reason={reason}
                setReason={setReason}
                onCloseActionModal={() => {
                    setActionModal({ isOpen: false, type: 'REJECT', id: null });
                    setReason('');
                }}
                onConfirmAction={() => {
                    if (actionModal.id && reason.trim()) {
                        handleAction(actionModal.id, actionModal.type === 'REJECT' ? 'REJECTED' : 'RETURNED', reason);
                    } else {
                        alert('Alasan wajib diisi!');
                    }
                }}
                processingId={processingId}
                textareaRef={textareaRef}
                signingChoice={signingChoice}
                onCloseSigningChoice={() => setSigningChoice({ isOpen: false, id: null })}
                user={user}
                onConfirmSign={(signType) => {
                    if (signingChoice.id) {
                        handleAction(signingChoice.id, 'APPROVED', undefined, signType);
                    }
                }}
            />

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
                                                     step.status === 'REJECTED' ? <XIcon size={14} strokeWidth={3} /> : 
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
