import React, { useState, useEffect } from 'react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { api } from '../../services/api';
import { 
    X, Save, Loader2, FileText, History, Download, 
    AlertCircle, CheckCircle2, Calendar, User, Clock, ArrowLeft
} from 'lucide-react';

interface NotulensiEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
    kegiatanId: number;
    dokumenId: number;
    fileName?: string;
    onSaved?: (newPath: string, newVersi: number) => void;
}

interface VersionItem {
    id: number;
    versi: number;
    nama_file: string;
    path: string;
    ukuran: number;
    catatan_revisi: string;
    created_at: string;
    creator_name?: string;
}

export const NotulensiEditorModal: React.FC<NotulensiEditorModalProps> = ({
    isOpen,
    onClose,
    kegiatanId,
    dokumenId,
    fileName,
    onSaved
}) => {
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [htmlContent, setHtmlContent] = useState('');
    const [catatanRevisi, setCatatanRevisi] = useState('');
    const [versions, setVersions] = useState<VersionItem[]>([]);
    const [currentVersion, setCurrentVersion] = useState<number>(1);
    const [activeTab, setActiveTab] = useState<'editor' | 'history'>('editor');
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && kegiatanId && dokumenId) {
            loadWordContent();
        } else {
            setHtmlContent('');
            setCatatanRevisi('');
            setError(null);
            setSuccessMessage(null);
            setActiveTab('editor');
        }
    }, [isOpen, kegiatanId, dokumenId]);

    const loadWordContent = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await api.kegiatanManajemen.getWordContent(kegiatanId, dokumenId);
            if (res.success && res.data) {
                setHtmlContent(res.data.html || '<p></p>');
                const vers = res.data.versions || [];
                setVersions(vers);
                if (vers.length > 0) {
                    setCurrentVersion(vers[0].versi);
                } else {
                    setCurrentVersion(1);
                }
            } else {
                setError(res.message || 'Gagal memuat konten dokumen Word.');
            }
        } catch (err: any) {
            console.error('Failed to load Word document content:', err);
            setError(err.message || 'Terjadi kesalahan saat memuat isi dokumen Word.');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!htmlContent.trim()) {
            setError('Konten dokumen tidak boleh kosong.');
            return;
        }

        setSaving(true);
        setError(null);
        try {
            const res = await api.kegiatanManajemen.saveWordContent(kegiatanId, dokumenId, {
                htmlContent,
                catatan_revisi: catatanRevisi.trim() || undefined
            });

            if (res.success) {
                setSuccessMessage(res.message || 'Dokumen berhasil disimpan.');
                const newVersi = res.data?.versi || currentVersion + 1;
                setCurrentVersion(newVersi);
                setCatatanRevisi('');
                
                // Refresh version history
                const histRes = await api.kegiatanManajemen.getWordHistory(kegiatanId, dokumenId);
                if (histRes.success && histRes.data) {
                    setVersions(histRes.data);
                }

                if (onSaved) {
                    onSaved(res.data.path, newVersi);
                }

                setTimeout(() => {
                    setSuccessMessage(null);
                }, 3500);
            } else {
                setError(res.message || 'Gagal menyimpan perubahan.');
            }
        } catch (err: any) {
            console.error('Failed to save Word document:', err);
            setError(err.message || 'Terjadi kesalahan saat menyimpan perubahan dokumen Word.');
        } finally {
            setSaving(false);
        }
    };

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '-';
        const d = new Date(dateStr);
        return d.toLocaleDateString('id-ID', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatBytes = (bytes: number) => {
        if (!bytes || bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    if (!isOpen) return null;

    const quillModules = {
        toolbar: [
            [{ 'header': [1, 2, 3, false] }],
            ['bold', 'italic', 'underline', 'strike'],
            [{ 'color': [] }, { 'background': [] }],
            [{ 'list': 'ordered' }, { 'list': 'bullet' }],
            [{ 'align': [] }],
            ['link', 'clean']
        ]
    };

    return (
        <div className="fixed inset-0 z-[100] flex flex-col bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
            {/* Top Navigation Bar */}
            <div className="h-16 px-6 bg-white border-b border-slate-200 flex items-center justify-between shrink-0 shadow-sm">
                <div className="flex items-center gap-3">
                    <button 
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 transition-colors"
                        title="Tutup Editor"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-100 shadow-sm">
                        <FileText size={20} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-sm font-bold text-slate-800 line-clamp-1 max-w-md">
                                {fileName || 'Edit Notulensi Rapat'}
                            </h2>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black tracking-wider bg-blue-100 text-blue-700 border border-blue-200 uppercase">
                                Versi {currentVersion}
                            </span>
                        </div>
                        <p className="text-[11px] text-slate-400">
                            Revisi langsung dokumen Microsoft Word (.docx) & pencatatan audit log
                        </p>
                    </div>
                </div>

                {/* Tab Controls & Actions */}
                <div className="flex items-center gap-3">
                    <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600">
                        <button
                            onClick={() => setActiveTab('editor')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                                activeTab === 'editor' 
                                    ? 'bg-white text-blue-600 shadow-xs font-bold' 
                                    : 'hover:text-slate-900'
                            }`}
                        >
                            <FileText size={14} />
                            Editor Dokumen
                        </button>
                        <button
                            onClick={() => setActiveTab('history')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                                activeTab === 'history' 
                                    ? 'bg-white text-blue-600 shadow-xs font-bold' 
                                    : 'hover:text-slate-900'
                            }`}
                        >
                            <History size={14} />
                            Riwayat Versi ({versions.length})
                        </button>
                    </div>

                    <button
                        onClick={handleSave}
                        disabled={saving || loading}
                        className="flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all disabled:opacity-50"
                    >
                        {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                        {saving ? 'Menyimpan...' : 'Simpan Revisi'}
                    </button>

                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                        title="Tutup"
                    >
                        <X size={20} />
                    </button>
                </div>
            </div>

            {/* Notification Banner */}
            {successMessage && (
                <div className="bg-emerald-500 text-white text-xs font-medium px-6 py-2.5 flex items-center justify-between shadow-sm animate-in slide-in-from-top duration-200">
                    <div className="flex items-center gap-2">
                        <CheckCircle2 size={16} />
                        <span>{successMessage}</span>
                    </div>
                    <button onClick={() => setSuccessMessage(null)} className="hover:opacity-80">
                        <X size={14} />
                    </button>
                </div>
            )}

            {error && (
                <div className="bg-rose-500 text-white text-xs font-medium px-6 py-2.5 flex items-center justify-between shadow-sm animate-in slide-in-from-top duration-200">
                    <div className="flex items-center gap-2">
                        <AlertCircle size={16} />
                        <span>{error}</span>
                    </div>
                    <button onClick={() => setError(null)} className="hover:opacity-80">
                        <X size={14} />
                    </button>
                </div>
            )}

            {/* Main Content Area */}
            <div className="flex-1 overflow-hidden bg-slate-100 flex flex-col items-center justify-center p-4 md:p-6">
                {loading ? (
                    <div className="flex flex-col items-center gap-3 text-slate-500">
                        <Loader2 size={36} className="animate-spin text-blue-600" />
                        <span className="text-sm font-semibold">Memuat & mengonversi dokumen Word...</span>
                    </div>
                ) : activeTab === 'editor' ? (
                    <div className="w-full max-w-4xl h-full flex flex-col gap-3">
                        {/* Revision Note Box */}
                        <div className="bg-white px-4 py-2.5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3 shrink-0">
                            <span className="text-xs font-bold text-slate-700 whitespace-nowrap">
                                Catatan Revisi:
                            </span>
                            <input 
                                type="text"
                                value={catatanRevisi}
                                onChange={(e) => setCatatanRevisi(e.target.value)}
                                placeholder="Tuliskan ringkasan perubahan (misal: 'Penambahan hasil koordinasi poin 3')..."
                                className="flex-1 text-xs text-slate-800 placeholder-slate-400 bg-transparent border-none focus:outline-none"
                            />
                        </div>

                        {/* Document Sheet Canvas */}
                        <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
                            <style>{`
                                .word-editor-container .ql-toolbar {
                                    border: none !important;
                                    border-bottom: 1px solid #e2e8f0 !important;
                                    background: #f8fafc;
                                    border-top-left-radius: 1rem;
                                    border-top-right-radius: 1rem;
                                    padding: 0.75rem 1rem !important;
                                }
                                .word-editor-container .ql-container {
                                    border: none !important;
                                    font-family: 'Times New Roman', Times, serif;
                                    font-size: 11pt;
                                    line-height: 1.6;
                                }
                                .word-editor-container .ql-editor {
                                    padding: 2.5rem 3rem !important;
                                    min-height: 100%;
                                    color: #1e293b;
                                }
                                .word-editor-container .ql-editor p {
                                    margin-bottom: 0.75em;
                                }
                                .word-editor-container .ql-editor table {
                                    border-collapse: collapse;
                                    width: 100%;
                                    margin: 1em 0;
                                }
                                .word-editor-container .ql-editor table td, 
                                .word-editor-container .ql-editor table th {
                                    border: 1px solid #cbd5e1;
                                    padding: 6px 10px;
                                }
                            `}</style>
                            <div className="word-editor-container flex-1 flex flex-col overflow-hidden">
                                <ReactQuill
                                    theme="snow"
                                    value={htmlContent}
                                    onChange={setHtmlContent}
                                    modules={quillModules}
                                    className="flex-1 flex flex-col overflow-hidden"
                                />
                            </div>
                        </div>
                    </div>
                ) : (
                    /* Version History Tab */
                    <div className="w-full max-w-4xl h-full bg-white rounded-2xl border border-slate-200 shadow-sm p-6 overflow-y-auto flex flex-col">
                        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
                            <div>
                                <h3 className="text-base font-bold text-slate-800">
                                    Riwayat Versi Dokumen
                                </h3>
                                <p className="text-xs text-slate-400">
                                    Daftar seluruh perubahan dan versi berkas notulensi yang tercatat di sistem
                                </p>
                            </div>
                            <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                Total: {versions.length} Versi
                            </span>
                        </div>

                        {versions.length === 0 ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 py-12">
                                <History size={40} className="mb-2 opacity-40" />
                                <p className="text-xs font-semibold">Belum ada riwayat revisi yang tercatat.</p>
                                <p className="text-[11px] text-slate-400 mt-1">
                                    Versi awal akan dibuat otomatis saat Anda menyimpan revisi pertama.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {versions.map((ver, idx) => (
                                    <div 
                                        key={ver.id || idx}
                                        className={`p-4 rounded-xl border transition-all ${
                                            ver.versi === currentVersion 
                                                ? 'bg-blue-50/50 border-blue-200 ring-1 ring-blue-300' 
                                                : 'bg-white border-slate-200 hover:border-slate-300'
                                        }`}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-center gap-3">
                                                <span className={`px-2.5 py-1 rounded-lg text-xs font-black tracking-wider uppercase ${
                                                    ver.versi === currentVersion
                                                        ? 'bg-blue-600 text-white'
                                                        : 'bg-slate-100 text-slate-700'
                                                }`}>
                                                    Versi {ver.versi}
                                                </span>
                                                <div>
                                                    <h4 className="text-xs font-bold text-slate-800">
                                                        {ver.catatan_revisi || 'Pembaruan Dokumen'}
                                                    </h4>
                                                    <div className="flex items-center gap-4 mt-1 text-[11px] text-slate-400">
                                                        <span className="flex items-center gap-1">
                                                            <Calendar size={12} />
                                                            {formatDate(ver.created_at)}
                                                        </span>
                                                        {ver.creator_name && (
                                                            <span className="flex items-center gap-1">
                                                                <User size={12} />
                                                                {ver.creator_name}
                                                            </span>
                                                        )}
                                                        <span>
                                                            Ukuran: {formatBytes(ver.ukuran)}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            {ver.path && (
                                                <a 
                                                    href={ver.path}
                                                    download={ver.nama_file || `Notulensi_v${ver.versi}.docx`}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition-colors"
                                                    title="Unduh Berkas Versi Ini"
                                                >
                                                    <Download size={13} />
                                                    Unduh
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
