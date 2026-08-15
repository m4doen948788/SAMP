import React from 'react';
import { createPortal } from 'react-dom';
import { X, Loader2, Shield, PenTool, Image as ImageIcon } from 'lucide-react';

interface InboxActionModalProps {
    actionModal: { isOpen: boolean; type: 'REJECT' | 'RETURN'; id: number | null };
    reason: string;
    setReason: (reason: string) => void;
    onCloseActionModal: () => void;
    onConfirmAction: () => void;
    processingId: number | null;
    textareaRef: React.RefObject<HTMLTextAreaElement | null>;

    signingChoice: { isOpen: boolean; id: number | null };
    onCloseSigningChoice: () => void;
    user: any;
    onConfirmSign: (signType: 'signature' | 'paraf') => void;
}

export default function InboxActionModal({
    actionModal,
    reason,
    setReason,
    onCloseActionModal,
    onConfirmAction,
    processingId,
    textareaRef,

    signingChoice,
    onCloseSigningChoice,
    user,
    onConfirmSign
}: InboxActionModalProps) {
    return (
        <>
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
                                onClick={onCloseActionModal}
                                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-xl transition-colors"
                            >
                                Batal
                            </button>
                            <button 
                                onClick={onConfirmAction}
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
                                onClick={onCloseSigningChoice}
                                className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-8">
                            {/* Tanda Tangan Option */}
                            <button
                                onClick={() => onConfirmSign('signature')}
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
                                onClick={() => onConfirmSign('paraf')}
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
                                onClick={onCloseSigningChoice}
                                className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all"
                            >
                                Batal
                            </button>
                        )}
                    </div>
                </div>,
                document.body
            )}
        </>
    );
}
