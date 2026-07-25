import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, CheckCircle, XCircle, RefreshCw, FileText, Loader2, Search, Shield, PenTool, Image as ImageIcon, ZoomIn, ZoomOut, Maximize2, Check, Clock, UserCheck, AlertTriangle, AlertCircle, FileSpreadsheet, ChevronRight, Inbox, Mail, Bell, Users } from 'lucide-react';
import { api, API_URL } from '@/src/services/api';
import { getSkpAlertsForUser, getDetailedStaffTunggakan, SkpAlert } from '@/src/services/skpHelpers';

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
    const [unsubmittedSkps, setUnsubmittedSkps] = useState<SkpAlert[]>([]);
    const [loadingSkp, setLoadingSkp] = useState(false);
    const [activeItem, setActiveItem] = useState<{ type: 'SKP' | 'SURAT' | 'NOTIF'; id: string | number; data: any } | null>(null);
    const [staffTunggakan, setStaffTunggakan] = useState<any[]>([]);
    const [copiedId, setCopiedId] = useState<string | null>(null);
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
                if (skps && skps.length > 0) {
                    setActiveItem({ type: 'SKP', id: 'skp-warning', data: skps });
                } else if (apps && apps.length > 0) {
                    const pending = apps.find((a: any) => a.status !== 'APPROVED' && a.status !== 'REJECTED' && a.status !== 'RETURNED') || apps[0];
                    setActiveItem({ type: 'SURAT', id: pending.id, data: pending });
                } else if (notifs && notifs.length > 0) {
                    const unread = notifs.find((n: any) => !n.is_read) || notifs[0];
                    setActiveItem({ type: 'NOTIF', id: unread.id, data: unread });
                } else {
                    setActiveItem(null);
                }
            }).finally(() => {
                setLoading(false);
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

    const currentMonthName = new Date().toLocaleDateString('id-ID', { month: 'long' }).toUpperCase();
    const currentYear = new Date().getFullYear();

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
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
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                                <Loader2 className="animate-spin mb-3" size={24} />
                                <span className="text-xs">Memuat kotak masuk...</span>
                            </div>
                        ) : (unsubmittedSkps.length === 0 && approvals.length === 0 && notifications.filter(n => !n.is_read).length === 0) ? (
                            <div className="flex flex-col items-center justify-center py-10 px-4 text-slate-400 text-center flex-1">
                                <CheckCircle size={32} className="text-slate-350 mb-2" />
                                <span className="text-xs font-bold text-slate-700">Kotak Masuk Bersih</span>
                                <span className="text-[10px] text-slate-400 mt-1">Tidak ada tugas atau pemberitahuan baru.</span>
                            </div>
                        ) : (
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
                                {notifications.filter(n => !n.is_read).map((n) => {
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
                        )}
                    </div>

                    {/* Right Details Panel */}
                    <div className={`flex-1 flex flex-col min-w-0 bg-white overflow-y-auto ${!activeItem ? 'hidden md:flex' : 'flex'}`}>
                        {activeItem ? (
                            <div className="flex-1 flex flex-col min-h-0 bg-white">
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

                                                                                   const missingListStr = emp.items.map(it => `• ${it.code ? `[${it.code}] ` : ''}${it.butirSkp}`).join('\n');
                                                                                   const reminderText = `Halo ${emp.namaLengkap}, mohon segera mengunggah berkas SKP Anda untuk bulan ${item.monthName} ${item.year} pada subkegiatan berikut:\n${missingListStr}\n\nTerima kasih.`;

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
                                                            fetchNotifications();
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
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8">
                                <Inbox size={48} className="text-slate-350 stroke-[1.5] mb-3" />
                                <h3 className="font-extrabold text-slate-700">Pilih Detail</h3>
                                <p className="text-xs mt-1 text-slate-400 text-center max-w-xs leading-relaxed">
                                    Silakan pilih salah satu berkas atau pemberitahuan dari panel kiri untuk meninjau detailnya di sini.
                                </p>
                            </div>
                        )}
                    </div>
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
