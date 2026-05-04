import React, { useEffect, useState } from 'react';
import { CheckCircle, AlertCircle, FileText, UserCheck, ShieldCheck, Clock, Calendar } from 'lucide-react';
import { api } from '../../../services/api';

interface Signer {
    role: string;
    status: string;
    approver_name: string;
    jabatan: string;
    nip: string;
    signed_at: string;
}

interface VerificationData {
    id: number;
    nomor_surat: string;
    perihal: string;
    tanggal_surat: string;
    status: string;
    pembuat: string;
    is_integrity_valid: boolean;
    signers: Signer[];
}

export default function VerifyDocument({ slug }: { slug: string }) {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<VerificationData | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const verify = async () => {
            try {
                const result = await api.suratApprovals.verify(slug);
                
                if (result.success) {
                    setData(result.data);
                } else {
                    setError(result.message || 'Dokumen tidak ditemukan atau kode tidak valid.');
                }
            } catch (err: any) {
                console.error('[Verify] Connection failed:', err);
                setError(`Gagal menghubungkan ke server verifikasi. Pastikan Anda terhubung ke jaringan yang sama dengan server. (Error: ${err.message})`);
            } finally {
                setLoading(false);
            }
        };
        verify();
    }, [slug]);

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-ppm-slate border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-slate-600 font-medium">Memverifikasi Dokumen...</p>
                </div>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
                <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 text-center border border-red-100">
                    <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                        <AlertCircle size={40} />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-800 mb-2">Verifikasi Gagal</h1>
                    <p className="text-slate-600 mb-8">{error || 'Dokumen tidak dapat diverifikasi.'}</p>
                    <button 
                        onClick={() => window.location.href = '/'}
                        className="w-full bg-ppm-slate text-white font-bold py-3 rounded-xl hover:opacity-90 transition-all shadow-lg"
                    >
                        Kembali ke Dashboard
                    </button>
                </div>
            </div>
        );
    }

    const isDraft = !data.is_integrity_valid && data.status !== 'APPROVED';
    const isTampered = !data.is_integrity_valid && data.status === 'APPROVED';
    const isOriginal = data.is_integrity_valid;

    // Approval Progress
    const totalSteps = data.signers.length;
    const completedSteps = data.signers.filter(s => s.status === 'APPROVED' || s.status === 'BYPASSED').length;

    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-8">
            <div className="max-w-3xl mx-auto">
                {/* Header Section */}
                <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100 mb-6">
                    <div className={`p-6 md:p-8 text-center ${isOriginal ? 'bg-emerald-50' : isDraft ? 'bg-blue-50' : 'bg-amber-50'}`}>
                        <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${
                            isOriginal ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200' : 
                            isDraft ? 'bg-blue-500 text-white shadow-lg shadow-blue-200' : 
                            'bg-amber-500 text-white shadow-lg shadow-amber-200'
                        }`}>
                            {isOriginal ? <ShieldCheck size={40} /> : isDraft ? <Clock size={40} /> : <AlertCircle size={40} />}
                        </div>
                        <h1 className={`text-2xl md:text-3xl font-black mb-1 ${isOriginal ? 'text-emerald-800' : isDraft ? 'text-blue-800' : 'text-amber-800'}`}>
                            {isOriginal ? 'DOKUMEN ASLI' : isDraft ? 'DOKUMEN DALAM PROSES' : 'INTEGRITAS DIRAGUKAN'}
                        </h1>
                        <p className={`text-sm font-bold uppercase tracking-wider ${isOriginal ? 'text-emerald-600' : isDraft ? 'text-blue-600' : 'text-amber-600'}`}>
                            {isDraft ? 'Persetujuan Sedang Berjalan' : 'Terverifikasi Secara Digital'}
                        </p>
                    </div>

                    <div className="p-6 md:p-8">
                        {isDraft && (
                            <div className="mb-8 bg-blue-50/50 border border-blue-100 rounded-2xl p-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                                        {completedSteps}/{totalSteps}
                                    </div>
                                    <div>
                                        <div className="text-sm font-bold text-blue-900">Progress Persetujuan</div>
                                        <div className="text-[11px] text-blue-700">Dokumen sedang diproses oleh pejabat berwenang</div>
                                    </div>
                                </div>
                                <div className="hidden sm:block flex-1 max-w-[200px] h-2 bg-blue-100 rounded-full mx-4 overflow-hidden">
                                    <div 
                                        className="h-full bg-blue-500 transition-all duration-500" 
                                        style={{ width: `${(completedSteps / totalSteps) * 100}%` }}
                                    ></div>
                                </div>
                            </div>
                        )}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Document Info */}
                            <div>
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <FileText size={14} /> Informasi Dokumen
                                </h3>
                                <div className="space-y-4">
                                    <div>
                                        <div className="text-[10px] font-bold text-slate-500 uppercase">Nomor Surat</div>
                                        <div className="text-slate-800 font-bold">
                                            {data.nomor_surat === 'DRAFT' && data.status === 'APPROVED' ? '-' : (data.nomor_surat || '-')}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-[10px] font-bold text-slate-500 uppercase">Perihal</div>
                                        <div className="text-slate-800 font-bold leading-tight">{data.perihal}</div>
                                    </div>
                                    <div>
                                        <div className="text-[10px] font-bold text-slate-500 uppercase">Tanggal Terbit</div>
                                        <div className="text-slate-800 font-bold flex items-center gap-2">
                                            <Calendar size={14} className="text-slate-400" />
                                            {data.tanggal_surat ? new Date(data.tanggal_surat).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Verification Status */}
                            <div>
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <ShieldCheck size={14} /> Keamanan
                                </h3>
                                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                                    <div className="flex items-start gap-3 mb-4">
                                        <div className={`p-2 rounded-xl ${isOriginal ? 'bg-emerald-100 text-emerald-600' : isDraft ? 'bg-blue-100 text-blue-600' : 'bg-amber-100 text-amber-600'}`}>
                                            <ShieldCheck size={18} />
                                        </div>
                                        <div>
                                            <div className="text-sm font-bold text-slate-800">Integritas Konten</div>
                                            <p className="text-[11px] text-slate-500 leading-relaxed">
                                                {isOriginal 
                                                    ? 'Isi dokumen sesuai dengan data yang tersimpan di server sistem.' 
                                                    : isDraft
                                                    ? 'Segel keamanan akan diterbitkan setelah seluruh proses persetujuan selesai.'
                                                    : 'Perhatian: Hash konten tidak cocok. Dokumen mungkin telah dimodifikasi.'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <div className="p-2 rounded-xl bg-indigo-100 text-indigo-600">
                                            <UserCheck size={18} />
                                        </div>
                                        <div>
                                            <div className="text-sm font-bold text-slate-800">Penandatangan Resmi</div>
                                            <p className="text-[11px] text-slate-500 leading-relaxed">
                                                Dokumen disahkan oleh {completedSteps} dari {totalSteps} pejabat berwenang.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Signers History */}
                <div className="bg-white rounded-3xl shadow-lg p-6 md:p-8 border border-slate-100">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                        <UserCheck size={14} /> Riwayat Penandatanganan
                    </h3>
                    
                    <div className="space-y-6">
                        {Array.isArray(data.signers) && data.signers.map((signer, idx) => (
                            <div key={idx} className="flex gap-4 group">
                                <div className="flex flex-col items-center">
                                    <div className="w-10 h-10 bg-ppm-slate/5 text-ppm-slate rounded-2xl flex items-center justify-center group-hover:bg-ppm-slate group-hover:text-white transition-all duration-300">
                                        <UserCheck size={20} />
                                    </div>
                                    {idx !== (data.signers?.length || 0) - 1 && (
                                        <div className="w-0.5 h-full bg-slate-100 my-2"></div>
                                    )}
                                </div>
                                <div className="flex-1 pb-6 border-b border-slate-50 group-last:border-0 group-last:pb-0">
                                    <div className="flex flex-wrap justify-between items-start gap-2 mb-1">
                                        <div className="font-bold text-slate-800">{signer.approver_name}</div>
                                        <div className={`text-[10px] font-black px-2 py-1 rounded-md uppercase tracking-wider ${
                                            signer.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-600' : 
                                            signer.status === 'PENDING' ? 'bg-blue-50 text-blue-600' : 
                                            'bg-slate-100 text-slate-400'
                                        }`}>
                                            {signer.status}
                                        </div>
                                    </div>
                                    <div className="text-xs text-slate-500 mb-3">{signer.jabatan}</div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div className="flex items-center gap-2 text-[11px] text-slate-500">
                                            <ShieldCheck size={14} className="text-slate-300" />
                                            NIP. {signer.nip || '-'}
                                        </div>
                                        <div className="flex items-center gap-2 text-[11px] text-slate-500">
                                            <Clock size={14} className="text-slate-300" />
                                            {new Date(signer.signed_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <div className="mt-8 text-center">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-2">Diterbitkan Oleh</div>
                    <div className="flex items-center justify-center gap-2 text-slate-400 font-bold text-sm">
                        <span>Dashboard PPM</span>
                        <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                        <span>Bapperida Kabupaten Bogor</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
