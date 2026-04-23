import React, { useEffect, useRef, useState } from 'react';
import { X, Download, FileText, ExternalLink, Loader2, AlertCircle, Zap, Sparkles, Send } from 'lucide-react';
import { renderAsync } from 'docx-preview';

interface DocumentViewerModalProps {
    isOpen: boolean;
    onClose: () => void;
    fileUrl?: string | null; // For existing files (URL)
    fileName: string | null;
    fileObject?: File | null; // For newly uploaded files (File object)
    onSendFeedback?: (feedback: string) => void;
    readOnly?: boolean;
}

// ABSOLUTE URL RESOLVER: Ensures URLs point to the correct Nayaxa Engine route (port 6001)
const resolveUrl = (url: string | null | undefined): string | null => {
    if (!url) return null;
    if (url.startsWith('blob:')) return url;

    const ENGINE_PORT = ':6001';
    const NAYAXA_ENGINE = `http://${window.location.hostname}${ENGINE_PORT}`;
    
    let path = url;
    // If it's an absolute URL but points to our engine (port 6001), extract the path for re-mapping
    if (url.includes(ENGINE_PORT)) {
        try {
            const u = new URL(url);
            path = u.pathname + u.search;
        } catch {
            path = url.substring(url.indexOf(ENGINE_PORT) + ENGINE_PORT.length);
        }
    }

    // If it's an external absolute URL (e.g. from a different domain), return as-is
    if (path.startsWith('http')) return url;

    // Ensure leading slash for uniform matching
    if (!path.startsWith('/')) path = '/' + path;

    // CRITICAL MAPPING: Redirect standard uploads to the dashboard sub-route handled by the engine
    // This specifically fixes the "Cannot GET /uploads/..." error for dashboard files
    if (path.startsWith('/uploads/') && !path.startsWith('/uploads/dashboard/') && !path.startsWith('/uploads/exports/')) {
        const fileName = path.replace('/uploads/', '');
        return `${NAYAXA_ENGINE}/uploads/dashboard/${fileName}`;
    }

    // Return prepended relative path
    return `${NAYAXA_ENGINE}${path}`;
};


export const DocumentViewerModal: React.FC<DocumentViewerModalProps> = ({ 
    isOpen, 
    onClose, 
    fileUrl, 
    fileName,
    fileObject,
    onSendFeedback,
    readOnly
}) => {
    const [loading, setLoading] = useState(false);
    const [feedbackText, setFeedbackText] = useState('');
    const [error, setError] = useState<string | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [fileType, setFileType] = useState<string>('');
    const [zoom, setZoom] = useState(1);
    const [viewportWidth, setViewportWidth] = useState(0);
    const docAreaRef = useRef<HTMLDivElement>(null);

    // Resolved URL based on input props
    const finalUrl = React.useMemo(() => {
        if (fileObject) return URL.createObjectURL(fileObject);
        return resolveUrl(fileUrl);
    }, [fileUrl, fileObject]);

    // Measure viewport and handle auto-fit

    useEffect(() => {
        if (!isOpen || !docAreaRef.current) return;
        
        const observer = new ResizeObserver((entries) => {
            for (let entry of entries) {
                const width = entry.contentRect.width;
                setViewportWidth(width);
                // Auto-fit A4 (816px) into available width
                if (width < 850) {
                    const padding = window.innerWidth < 640 ? 20 : 64; 
                    const calculatedZoom = (width - padding) / 816;
                    setZoom(Math.min(1, Math.max(0.3, calculatedZoom)));
                } else {
                    setZoom(1);
                }
            }
        });

        observer.observe(docAreaRef.current);
        return () => observer.disconnect();
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) {
            setError(null);
            setLoading(false);
            setFileType('');
            return;
        }

        // Smart Extension Detection: Clean filename and get actual extension
        // Matches the last string after '.', even if there are parentheses like 'Unduh (file).pdf'
        const cleanName = fileName?.replace(/[()]/g, '').trim() || '';
        const extMatch = cleanName.match(/\.([a-z0-9]+)$|$/i);
        const ext = extMatch ? extMatch[1]?.toLowerCase() : '';
        setFileType(ext || '');
    }, [isOpen, fileName]);

    useEffect(() => {
        if (isOpen && fileType === 'docx' && containerRef.current && !loading) {
            loadDocx();
        }
    }, [isOpen, fileType, finalUrl]);


    const loadDocx = async () => {
        if (!containerRef.current) return;
        setLoading(true);
        setError(null);
        
        try {
            let data: ArrayBuffer | Blob;
            
            if (fileObject) {
                data = await fileObject.arrayBuffer();
            } else if (finalUrl) {
                // Ensure we handle potential relative URLs correctly
                const response = await fetch(finalUrl);
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                data = await response.arrayBuffer();
            } else {
                throw new Error('Tidak ada data file.');
            }

            // Clear previous content thoroughly
            while (containerRef.current.firstChild) {
                containerRef.current.removeChild(containerRef.current.firstChild);
            }
            
            // Use docx-preview with robust options
            await renderAsync(data, containerRef.current, undefined, {
                className: "docx", // default is 'docx'
                inWrapper: true, // renders content within a wrapper div
                ignoreWidth: false, // disables rendering of width settings
                ignoreHeight: false, // disables rendering of height settings
                ignoreFonts: false, // disables rendering of font settings
                breakPages: true, // enables page breaking on page breaks
                ignoreLastRenderedPageBreak: true, // disables last rendered page break
                experimental: false, // enables experimental features
                trimXmlDeclaration: true, // if true, xml declaration will be removed from xml documents
                useBase64URL: true, // if true, images will be rendered as base64 urls
                useMathMLPolyfill: true, // if true, MathML polyfill will be used
                showChanges: false, // if true, changes will be shown
                debug: false
            });
            
            console.log('DOCX rendered successfully');
        } catch (err: any) {
            console.error('Docx Preview Error:', err);
            setError(`Gagal memproses pratinjau dokumen: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileType);
    const isPdf = fileType === 'pdf';
    const isDocx = fileType === 'docx';
    const isPptx = fileType === 'pptx';

    // Dynamic Color Mapping for Header Icon & Labels
    const getFileColor = (type: string) => {
        const t = type.toLowerCase();
        if (t === 'pdf') return { bg: 'bg-red-50', text: 'text-red-600' };
        if (t === 'xlsx' || t === 'xls' || t === 'csv') return { bg: 'bg-emerald-50', text: 'text-emerald-600' };
        if (t === 'pptx') return { bg: 'bg-orange-50', text: 'text-orange-600' };
        if (t === 'docx' || t === 'doc') return { bg: 'bg-blue-50', text: 'text-blue-600' };
        return { bg: 'bg-slate-50', text: 'text-slate-600' };
    };

    const fileColors = getFileColor(fileType);

    return (
        <div className="fixed inset-0 z-[6000] flex items-center justify-center p-0 sm:p-4 md:p-8 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-300">
            <div className={`bg-white w-full ${onSendFeedback ? 'max-w-[1400px]' : 'max-w-6xl'} h-full sm:h-auto sm:max-h-[92vh] rounded-none sm:rounded-[2.5rem] shadow-2xl border border-white/20 overflow-hidden flex flex-col animate-in zoom-in-95 duration-300 transition-all`}>
                {/* Header */}
                <div className="px-3 sm:px-8 py-3 sm:py-5 border-b border-slate-100 flex items-center justify-between bg-white/50 backdrop-blur-sm sticky top-0 z-10 gap-2 sm:gap-4">
                    <div className="flex items-center gap-2 sm:gap-4 min-w-0 max-w-[200px] sm:max-w-none">
                        <div className={`p-1.5 sm:p-3 ${fileColors.bg} ${fileColors.text} rounded-lg sm:rounded-2xl shadow-inner transition-colors duration-500`}>
                            <FileText size={18} className="sm:w-6 sm:h-6" />
                        </div>
                        <div className="min-w-0">
                            <h3 className="text-xs sm:text-lg font-black text-slate-800 truncate tracking-tight leading-none sm:leading-normal">{fileName}</h3>
                            <p className={`text-[8px] sm:text-[10px] font-bold ${fileColors.text} opacity-70 uppercase tracking-widest mt-0.5 sm:mt-1`}>
                                {fileType.toUpperCase()}
                            </p>
                        </div>
                    </div>

                    {/* Integrated Zoom Controls */}
                    <div className="flex items-center bg-slate-100/80 p-0.5 sm:p-1 rounded-lg sm:rounded-xl border border-slate-200">
                        <button 
                            onClick={() => setZoom(prev => Math.max(0.3, prev - 0.1))}
                            className="w-7 h-7 sm:w-10 sm:h-10 flex items-center justify-center text-slate-500 hover:text-ppm-blue hover:bg-white rounded-md sm:rounded-lg transition-all active:scale-90"
                            title="Zoom Out"
                        >
                            <Zap size={14} className="sm:w-[18px] sm:h-[18px] rotate-180" />
                        </button>
                        <button 
                            onClick={() => {
                                if (!docAreaRef.current) return;
                                const width = docAreaRef.current.offsetWidth;
                                const padding = window.innerWidth < 640 ? 20 : 64; 
                                setZoom((width - padding) / 816);
                            }}
                            className="px-2 sm:px-4 h-7 sm:h-10 flex items-center justify-center text-slate-700 text-[8px] sm:text-[10px] font-black uppercase tracking-widest hover:bg-white rounded-md sm:rounded-lg transition-all"
                        >
                            {Math.round(zoom * 100)}%
                        </button>
                        <button 
                            onClick={() => setZoom(prev => Math.min(2, prev + 0.1))}
                            className="w-7 h-7 sm:w-10 sm:h-10 flex items-center justify-center text-slate-500 hover:text-ppm-blue hover:bg-white rounded-md sm:rounded-lg transition-all active:scale-90"
                            title="Zoom In"
                        >
                            <Zap size={14} className="sm:w-[18px] sm:h-[18px]" />
                        </button>
                    </div>

                    <div className="flex items-center gap-1 sm:gap-3">
                        {finalUrl && (
                            <a 
                                href={finalUrl} 
                                download={fileName || 'dokumen'}
                                className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-all active:scale-95"
                            >
                                <Download size={16} />
                                <span className="hidden sm:inline">Unduh</span>
                            </a>
                        )}
                        <button 
                            onClick={onClose}
                            className="p-3 hover:bg-rose-50 text-slate-400 hover:text-rose-500 rounded-2xl transition-all active:scale-90"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Main Content Grid */}
                <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-slate-50 relative">
                    {/* Document Area */}
                    <div ref={docAreaRef} className="flex-1 overflow-auto relative p-3 sm:p-4 md:p-8 custom-scrollbar scroll-smooth">
                        {loading && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50/50 z-20 backdrop-blur-sm">
                            <div className="relative">
                                <Loader2 size={48} className="text-blue-500 animate-spin" />
                                <div className="absolute inset-0 blur-xl bg-blue-500/20 animate-pulse" />
                            </div>
                            <p className="mt-6 text-sm font-bold text-slate-500 animate-pulse tracking-widest uppercase">Sedang Menyiapkan Dokumen...</p>
                        </div>
                    )}

                    {error ? (
                        <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-white rounded-3xl border border-slate-100 shadow-sm mx-auto max-w-md">
                            <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mb-6 shadow-inner">
                                <AlertCircle size={32} />
                            </div>
                            <h4 className="text-lg font-black text-slate-800 mb-2">Gagal Menampilkan</h4>
                            <p className="text-sm text-slate-500 mb-8 leading-relaxed italic font-medium">"{error}"</p>
                            <a 
                                href={finalUrl || '#'} 
                                download={fileName || 'dokumen'}
                                className="w-full py-4 bg-blue-500 hover:bg-blue-600 text-white rounded-2xl font-bold text-sm shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-2"
                            >
                                <Download size={18} />
                                <span>Unduh Saja</span>
                            </a>
                        </div>
                    ) : (
                        <div className="w-full h-full flex flex-col items-center">
                            {isPdf && finalUrl && (
                                <iframe 
                                    src={`${finalUrl}#toolbar=0`} 
                                    className="w-full h-full min-h-[75vh] rounded-2xl border border-slate-200 bg-white shadow-sm"
                                    title={fileName || 'PDF Preview'}
                                />
                            )}

                            {isImage && finalUrl && (
                                <div className="max-w-full h-full flex items-center justify-center">
                                    <img 
                                        src={finalUrl} 
                                        alt={fileName || 'Preview'} 
                                        className="max-w-full max-h-full rounded-2xl shadow-xl object-contain border border-white"
                                    />
                                </div>
                            )}

                            {isDocx && (
                                <div 
                                    className="w-full flex justify-center py-2 sm:py-4 origin-top"
                                    style={{ 
                                        transform: `scale(${zoom})`, 
                                        transformOrigin: 'top center',
                                        width: zoom < 1 ? '816px' : '100%',
                                        marginBottom: zoom < 1 ? `-${(1 - zoom) * 100}%` : '0' // Try to reclaim some vertical space if scaled
                                    }}
                                >
                                    <div 
                                        ref={containerRef} 
                                        className="bg-white p-4 sm:p-8 md:p-12 shadow-2xl border border-slate-200 rounded-xl sm:rounded-2xl w-[816px] min-h-[1056px] docx-preview-container"
                                    />
                                </div>
                            )}

                            {isPptx && (
                                <div className="h-full flex flex-col items-center justify-center text-center p-4 sm:p-12 w-full max-w-2xl mx-auto">
                                    <div className="relative mb-8 group">
                                        <div className="absolute inset-0 bg-orange-500/20 blur-3xl rounded-full scale-150 animate-pulse group-hover:bg-orange-600/30 transition-all" />
                                        <div className="relative w-24 h-24 sm:w-32 sm:h-32 bg-gradient-to-br from-orange-400 to-rose-600 text-white rounded-[2rem] flex items-center justify-center shadow-2xl shadow-orange-200 border-4 border-white transform hover:rotate-6 transition-transform">
                                            <Sparkles size={48} className="sm:w-16 sm:h-16" />
                                        </div>
                                        <div className="absolute -bottom-2 -right-2 bg-white p-2 rounded-xl shadow-lg border border-slate-100">
                                            <ExternalLink size={20} className="text-orange-500" />
                                        </div>
                                    </div>
                                    
                                    <h4 className="text-2xl sm:text-3xl font-black text-slate-800 mb-4 tracking-tight">Presentasi Siap Ditampilkan</h4>
                                    <p className="text-slate-500 mb-10 text-sm sm:text-lg leading-relaxed font-medium">
                                        Nayaxa telah berhasil menyusun materi paparan Anda secara strategis. Klik tombol di bawah untuk mengunduh dan memulai presentasi.
                                    </p>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                                        <a 
                                            href={finalUrl || '#'} 
                                            download={fileName || 'paparan.pptx'}
                                            className="group flex items-center justify-center gap-3 px-8 py-5 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl font-black text-sm shadow-[0_20px_40px_-10px_rgba(249,115,22,0.4)] transition-all active:scale-95"
                                        >
                                            <Download size={20} className="group-hover:bounce" />
                                            <span>UNDUH PAPARAN</span>
                                        </a>
                                        <button 
                                            onClick={() => window.open(finalUrl || '#', '_blank')}
                                            className="flex items-center justify-center gap-3 px-8 py-5 bg-white border-2 border-slate-100 hover:border-orange-200 hover:bg-orange-50 text-slate-700 rounded-2xl font-black text-sm transition-all active:scale-95"
                                        >
                                            <ExternalLink size={20} className="text-orange-500" />
                                            <span>PRESENTASI TAB BARU</span>
                                        </button>
                                    </div>

                                    <div className="mt-12 flex items-center gap-3 px-6 py-3 bg-indigo-50/50 rounded-full border border-indigo-100/50">
                                        <div className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
                                        <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Nayaxa Presentation Engine Enabled</span>
                                    </div>
                                </div>
                            )}

                            {!isPdf && !isImage && !isDocx && !isPptx && (
                                <div className="h-full flex flex-col items-center justify-center text-center p-8">
                                    <div className="w-20 h-20 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mb-6">
                                        <ExternalLink size={40} />
                                    </div>
                                    <h4 className="text-xl font-black text-slate-800 mb-3">Format Tidak Didukung Preview</h4>
                                    <p className="text-slate-500 mb-8 max-w-sm">File ini hanya dapat diakses melalui unduhan langsung.</p>
                                    <a 
                                        href={finalUrl || '#'} 
                                        download={fileName || 'dokumen'}
                                        className="px-8 py-4 bg-slate-800 hover:bg-slate-900 text-white rounded-2xl font-bold text-sm shadow-lg shadow-slate-200 transition-all flex items-center justify-center gap-2"
                                    >
                                        <Download size={18} />
                                        <span>Unduh File</span>
                                    </a>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                    {/* AI Feedback Sidebar */}
                    {onSendFeedback && (
                        <div className="w-full md:w-[350px] border-t md:border-t-0 md:border-l border-slate-100 bg-white flex flex-col shadow-[-10px_0_30_px_-15px_rgba(0,0,0,0.05)] z-20 overflow-hidden max-h-[40vh] md:max-h-full shrink-0">
                            <div className="p-4 sm:p-6 border-b border-slate-50 bg-indigo-50/30">
                                <div className="flex items-center justify-between gap-2 text-indigo-700 font-black text-sm mb-1 uppercase">
                                    <div className="flex items-center gap-2">
                                        <Sparkles size={16} className="text-indigo-500 animate-pulse" />
                                        NAYAXA AI EDITOR
                                    </div>
                                    {readOnly && (
                                        <div className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[8px] rounded-md flex items-center gap-1 border border-amber-200">
                                            <AlertCircle size={10} />
                                            LOCKED
                                        </div>
                                    )}
                                </div>
                                <p className="text-[9px] sm:text-[10px] text-indigo-600/70 font-bold uppercase tracking-widest">
                                    {readOnly ? 'Dokumen Perpustakaan Nasional' : 'Koreksi & Perbaikan Dokumen'}
                                </p>
                            </div>
 
                            <div className="flex-1 p-4 sm:p-6 flex flex-col gap-3 sm:gap-4 overflow-y-auto custom-scrollbar relative">
                                {readOnly && (
                                    <div className="absolute inset-0 z-10 bg-white/60 backdrop-blur-[1px] flex items-center justify-center p-6 text-center">
                                        <div className="bg-white p-6 rounded-2xl shadow-xl border border-slate-100 max-w-xs">
                                            <div className="w-12 h-12 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-4">
                                                <AlertCircle size={24} />
                                            </div>
                                            <h5 className="text-sm font-black text-slate-800 mb-2 uppercase">Dokumen Terkunci</h5>
                                            <p className="text-[10px] text-slate-500 leading-relaxed font-medium">
                                                Dokumen ini berasal dari Perpustakaan Resmi. Sesuai protokol keamanan, modifikasi langsung pada file sistem tidak diizinkan untuk menjaga keaslian data.
                                            </p>
                                        </div>
                                    </div>
                                )}

                                <div className={`space-y-1.5 sm:space-y-2 ${readOnly ? 'opacity-30 pointer-events-none' : ''}`}>
                                    <label className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Instruksi Anda</label>
                                    <textarea 
                                        value={feedbackText}
                                        onChange={(e) => setFeedbackText(e.target.value)}
                                        disabled={readOnly}
                                        placeholder="Contoh: 'Ganti judul menjadi Laporan Kinerja 2024'..."
                                        className="w-full h-24 sm:h-48 bg-slate-50 border border-slate-100 rounded-xl sm:rounded-2xl p-4 sm:p-5 text-base sm:text-lg font-bold focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 transition-all resize-none leading-relaxed text-slate-700 shadow-inner"
                                    />
                                </div>
 
                                <div className={`hidden sm:flex bg-amber-50 border border-amber-100 rounded-xl p-3 gap-2 ${readOnly ? 'opacity-30' : ''}`}>
                                    <Zap size={14} className="text-amber-500 shrink-0 mt-0.5" />
                                    <p className="text-[10px] text-amber-700 leading-normal font-medium italic">
                                        {readOnly ? 'Gunakan file ini sebagai referensi data tanpa merubah isinya.' : 'Nayaxa akan membaca dokumen ini dan membuatkan versi baru sesuai instruksi Anda.'}
                                    </p>
                                </div>
                            </div>
 
                            <div className="p-6 bg-slate-50/50 border-t border-slate-100">
                                <button
                                    onClick={() => {
                                        if (feedbackText.trim() && !readOnly) {
                                            onSendFeedback(feedbackText);
                                            setFeedbackText('');
                                        }
                                    }}
                                    disabled={!feedbackText.trim() || readOnly}
                                    className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-2xl font-black text-xs shadow-lg shadow-indigo-100 transition-all flex items-center justify-center gap-2 active:scale-95 group"
                                >
                                    <Send size={16} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                                    {readOnly ? 'TIDAK DAPAT DIEDIT' : 'BUAT PERBAIKAN'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer / Tip */}
                {!error && !loading && (
                    <div className="px-8 py-4 bg-slate-50/80 border-t border-slate-100 flex items-center justify-center">
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em]">Sistem Pratinjau Dokumen Nayaxa</p>
                    </div>
                )}
            </div>
            
            {/* Global style overwrite for docx preview styling */}
            <style>{`
                .docx-preview-container {
                    font-family: 'Inter', 'Segoe UI', sans-serif !important;
                    background: #f1f5f9 !important; /* slate-100 */
                    width: 100% !important;
                    display: flex !important;
                    justify-content: center !important;
                }
                .docx-wrapper {
                    background: #f1f5f9 !important; /* slate-100 */
                    padding: 20px 0 !important;
                    display: flex !important;
                    flex-direction: column !important;
                    align-items: center !important;
                    width: 100% !important;
                    overflow-x: auto !important; /* Enable page swiping */
                    -webkit-overflow-scrolling: touch;
                }
                /* Target the actual page sections generated by docx-preview */
                .docx {
                    background: white !important;
                    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04), 0 0 0 1px rgba(0,0,0,0.05) !important;
                    margin-bottom: 30px !important; /* Space between pages */
                    padding: 2cm !important; /* Standard margins */
                    min-height: 29.7cm !important; /* A4 Height */
                    width: 816px !important; /* Fixed A4 Width to prevent distortion */
                    border: 1px solid #e2e8f0 !important;
                    position: relative !important;
                    box-sizing: border-box !important;
                }
                
                /* Target tables inside docx - Preserved & Locked Width */
                .docx table {
                    width: 100% !important; /* Force tables to fill paper */
                    table-layout: fixed !important; /* Prevent bleed-out */
                    max-width: 100% !important;
                    margin: 0 !important;
                }
                
                .docx td, .docx th {
                    word-break: break-word !important;
                    overflow-wrap: break-word !important;
                }

                /* Mobile Optimizations - Header only */
                @media (max-width: 640px) {
                    .docx-wrapper {
                        padding: 10px !important;
                        align-items: center !important; 
                    }
                    .docx {
                        margin-bottom: 15px !important;
                        flex-shrink: 0 !important; 
                    }
                }

                .docx p {
                    margin-bottom: 0.5em !important;
                    line-height: 1.6 !important;
                }
                /* Ensure nested wrappers don't break the layout */
                .docx-wrapper > .docx-wrapper {
                    padding: 0 !important;
                    background: transparent !important;
                    display: contents !important;
                }
            `}</style>
        </div>
    );
};
