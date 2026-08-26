import React, { useEffect, useRef, useState } from 'react';
import { X, Download, FileText, FileSpreadsheet, FileImage, FileIcon, ExternalLink, Loader2, AlertCircle, Zap, Sparkles, Send, Search, ChevronUp, ChevronDown, Plus, Minus, ChevronLeft, ChevronRight, Archive } from 'lucide-react';
import { renderAsync } from 'docx-preview';
import * as XLSX from 'xlsx';


interface DocumentViewerModalProps {
    isOpen: boolean;
    onClose: () => void;
    fileUrl?: string | null; // For existing files (URL)
    fileName: string | null;
    fileObject?: File | null; // For newly uploaded files (File object)
    onSendFeedback?: (feedback: string) => void;
    readOnly?: boolean;
    disableDownload?: boolean;
}

// ABSOLUTE URL RESOLVER: Ensures URLs point to the correct routes
const resolveUrl = (url: string | null | undefined): string | null => {
    if (!url) return null;
    if (url.startsWith('blob:')) return url;

    let path = url;

    // Jika link berisi domain/port, ambil path-nya saja
    if (url.includes(':6001') || url.includes('bapperida-ppm.my.id')) {
        try {
            const u = new URL(url.startsWith('http') ? url : `http://${url}`);
            path = u.pathname + u.search;
        } catch {
            const match = url.match(/:\d+(.*)/);
            if (match) path = match[1];
        }
    }

    // Pastikan path diawali dengan slash
    if (!path.startsWith('/')) path = '/' + path;

    // Bersihkan prefix lama
    path = path.replace(/^\/api\/nayaxa/, '');

    const lowerPath = path.toLowerCase();
    const isStaticFile = (lowerPath.endsWith('.pdf') || 
                          lowerPath.endsWith('.docx') || 
                          lowerPath.endsWith('.xlsx') || 
                          lowerPath.endsWith('.xls') || 
                          lowerPath.endsWith('.jpg') || 
                          lowerPath.endsWith('.jpeg') || 
                          lowerPath.endsWith('.png') || 
                          lowerPath.endsWith('.gif') || 
                          lowerPath.endsWith('.webp') ||
                          lowerPath.endsWith('.zip') ||
                          lowerPath.endsWith('.rar') ||
                          lowerPath.endsWith('.7z')) &&
                         !lowerPath.startsWith('/export/') && 
                         !lowerPath.startsWith('/outputs/');

    // --- Mode A: Static Files (Direct from Nginx) ---
    if (isStaticFile) {
        // Return relative path direct to Nginx /uploads/ folder (extremely stable)
        return path;
    }

    // --- Mode B: API/AI Engine Files (via port 6001) ---
    const NAYAXA_ENGINE = import.meta.env.VITE_NAYAXA_API_URL 
        ? import.meta.env.VITE_NAYAXA_API_URL.split('/api/')[0]
        : (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
            ? `http://${window.location.hostname}:6001`
            : `${window.location.protocol}//${window.location.hostname}:6001`);

    if (path.startsWith('/uploads/') && !path.startsWith('/uploads/dashboard/') && !path.startsWith('/uploads/exports/')) {
        const fileName = path.replace('/uploads/', '');
        path = `/uploads/dashboard/${fileName}`;
    }

    const NAYAXA_API_KEY = import.meta.env.VITE_NAYAXA_API_KEY || 'NAYAXA-BAPPERIDA-8888-9999-XXXX';
    const finalUrl = `${NAYAXA_ENGINE}${path}`;
    const separator = finalUrl.includes('?') ? '&' : '?';
    return `${finalUrl}${separator}api_key=${NAYAXA_API_KEY}`;
};


export const DocumentViewerModal: React.FC<DocumentViewerModalProps> = ({ 
    isOpen, 
    onClose, 
    fileUrl, 
    fileName,
    fileObject,
    onSendFeedback,
    readOnly,
    disableDownload
}) => {
    const [loading, setLoading] = useState(false);
    const [feedbackText, setFeedbackText] = useState('');
    const [error, setError] = useState<string | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [fileType, setFileType] = useState<string>('');
    const isExcel = ['xlsx', 'xls', 'csv'].includes(fileType);
    const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileType);
    const isPdf = fileType === 'pdf';
    const isDocx = fileType === 'docx';
    const isPptx = fileType === 'pptx';
    const isArchive = ['zip', 'rar', '7z', 'tar', 'gz'].includes(fileType);
    const [excelSheets, setExcelSheets] = useState<{ name: string; html: string }[]>([]);
    const [activeSheetIndex, setActiveSheetIndex] = useState(0);
    const [pptxSlides, setPptxSlides] = useState<{ title: string; texts: string[] }[]>([]);
    const [activeSlideIndex, setActiveSlideIndex] = useState(0);
    const [zoom, setZoom] = useState(1);
    const [viewportWidth, setViewportWidth] = useState(0);
    const docAreaRef = useRef<HTMLDivElement>(null);
    const [searchText, setSearchText] = useState('');
    const [ctrlPressed, setCtrlPressed] = useState(false);
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const pdfContainerRef = useRef<HTMLDivElement>(null);

    const handleSearch = (direction: 'next' | 'prev') => {
        if (!searchText) return;
        const backwards = direction === 'prev';
        // Use native window.find for simple text search within the document
        window.find(searchText, false, backwards, true, false, true, false);
    };

    const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSearch(e.shiftKey ? 'prev' : 'next');
        }
    };

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
        if (!isOpen) return;
        
        const handleWheel = (e: WheelEvent) => {
            if (e.ctrlKey && !isPdf) {
                e.preventDefault();
                const zoomFactor = 0.05;
                if (e.deltaY < 0) {
                    setZoom(prev => Math.min(2, prev + zoomFactor));
                } else {
                    setZoom(prev => Math.max(0.3, prev - zoomFactor));
                }
            }
        };

        const docArea = docAreaRef.current;
        if (docArea) {
            docArea.addEventListener('wheel', handleWheel, { passive: false });
        }

        return () => {
            if (docArea) {
                docArea.removeEventListener('wheel', handleWheel);
            }
        };
    }, [isOpen]);



    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Control') {
                setCtrlPressed(true);
            }
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.key === 'Control') {
                setCtrlPressed(false);
            }
        };

        const handleBlur = () => {
            setCtrlPressed(false);
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        window.addEventListener('blur', handleBlur);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            window.removeEventListener('blur', handleBlur);
        };
    }, [isOpen]);



    useEffect(() => {
        if (!isOpen) {
            setError(null);
            setLoading(false);
            setFileType('');
            setExcelSheets([]);
            setActiveSheetIndex(0);
            setPptxSlides([]);
            setActiveSlideIndex(0);
            return;
        }

        // Smart Extension Detection: Clean filename, fileUrl, or fileObject to get actual extension
        const getExt = (str?: string | null) => {
            if (!str) return '';
            const cleanStr = str.split('?')[0].split('#')[0].replace(/[()]/g, '').trim();
            const extMatch = cleanStr.match(/\.([a-z0-9]+)$/i);
            return extMatch ? extMatch[1].toLowerCase() : '';
        };

        let ext = getExt(fileName);
        if (!ext && fileUrl) {
            ext = getExt(fileUrl);
        }
        if (!ext && fileObject) {
            ext = getExt(fileObject.name);
        }
        setFileType(ext || '');
    }, [isOpen, fileName, fileUrl, fileObject]);

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
                const NAYAXA_API_KEY = import.meta.env.VITE_NAYAXA_API_KEY || 'NAYAXA-BAPPERIDA-8888-9999-XXXX';
                console.log('NAYAXA_DEBUG: Fetching DOCX from', finalUrl);
                const response = await fetch(finalUrl, {
                    headers: { 'x-api-key': NAYAXA_API_KEY }
                });
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

    useEffect(() => {
        if (isOpen && isExcel && !loading) {
            loadExcel();
        }
    }, [isOpen, fileType, finalUrl]);

    useEffect(() => {
        if (isOpen && isPptx && !loading) {
            loadPptx();
        }
    }, [isOpen, fileType, finalUrl]);

    const loadPptx = async () => {
        setLoading(true);
        setError(null);
        setPptxSlides([]);
        setActiveSlideIndex(0);

        // --- Strategy 1: Server-side conversion via LibreOffice ---
        // Only works for files stored on the server (not local fileObject)
        if (!fileObject && fileUrl) {
            const NAYAXA_API_KEY = import.meta.env.VITE_NAYAXA_API_KEY || 'NAYAXA-BAPPERIDA-8888-9999-XXXX';

            // Extract the clean /uploads/... path from the file URL
            let rawPath = fileUrl;
            try {
                const u = new URL(fileUrl.startsWith('http') ? fileUrl : `http://x${fileUrl}`);
                rawPath = u.pathname;
            } catch { /* keep rawPath as-is */ }
            if (!rawPath.startsWith('/uploads/')) {
                rawPath = rawPath.replace(/.*\/uploads\//, '/uploads/');
            }

            // Route to dashboard base gateway path instead of Nayaxa engine port
            const conversionUrl = `/api/convert/pptx-preview?path=${encodeURIComponent(rawPath)}&api_key=${NAYAXA_API_KEY}`;
            
            setPptxSlides([{ title: '__PDF_CONVERSION__', texts: [conversionUrl] }]);
            setLoading(false);
            return;
        }

        // --- Strategy 2: Client-side text extraction via jszip ---
        try {
            let data: ArrayBuffer;
            if (fileObject) {
                data = await fileObject.arrayBuffer();
            } else if (finalUrl) {
                const NAYAXA_API_KEY = import.meta.env.VITE_NAYAXA_API_KEY || 'NAYAXA-BAPPERIDA-8888-9999-XXXX';
                const response = await fetch(finalUrl, {
                    headers: { 'x-api-key': NAYAXA_API_KEY }
                });
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                data = await response.arrayBuffer();
            } else {
                throw new Error('Tidak ada data file.');
            }

            const JSZip = (await import('jszip')).default;
            const zip = await JSZip.loadAsync(data);

            const slideFiles = Object.keys(zip.files)
                .filter(name => /^ppt\/slides\/slide\d+\.xml$/.test(name))
                .sort((a, b) => {
                    const na = parseInt(a.match(/\d+/)?.[0] || '0');
                    const nb = parseInt(b.match(/\d+/)?.[0] || '0');
                    return na - nb;
                });

            if (slideFiles.length === 0) throw new Error('Tidak ada slide ditemukan dalam file.');

            const slides = await Promise.all(slideFiles.map(async (slideFile, idx) => {
                const xml = await zip.file(slideFile)?.async('string') || '';
                const parser = new DOMParser();
                const doc = parser.parseFromString(xml, 'text/xml');

                let title = '';
                const shapes: string[][] = [];
                const allSp = doc.querySelectorAll('sp');
                allSp.forEach(sp => {
                    const phEl = sp.querySelector('ph');
                    const tEls = sp.querySelectorAll('t');
                    const shapeTexts: string[] = [];
                    tEls.forEach(t => { if (t.textContent?.trim()) shapeTexts.push(t.textContent.trim()); });
                    if (shapeTexts.length === 0) return;
                    const phType = phEl?.getAttribute('type') || '';
                    const phIdx = phEl?.getAttribute('idx') || '';
                    if (!title && (phType === 'title' || phType === 'ctrTitle' || phIdx === '0')) {
                        title = shapeTexts.join(' ');
                    } else {
                        shapes.push(shapeTexts);
                    }
                });

                const allTexts: string[] = [];
                shapes.forEach(s => allTexts.push(...s));

                return { title: title || `Slide ${idx + 1}`, texts: allTexts };
            }));

            setPptxSlides(slides);
        } catch (err: any) {
            console.error('PPTX Preview Error:', err);
            setError(`Gagal memproses pratinjau presentasi: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    const loadExcel = async () => {
        setLoading(true);
        setError(null);
        setExcelSheets([]);

        try {
            let data: ArrayBuffer;
            if (fileObject) {
                data = await fileObject.arrayBuffer();
            } else if (finalUrl) {
                const NAYAXA_API_KEY = import.meta.env.VITE_NAYAXA_API_KEY || 'NAYAXA-BAPPERIDA-8888-9999-XXXX';
                const response = await fetch(finalUrl, {
                    headers: { 'x-api-key': NAYAXA_API_KEY }
                });
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                data = await response.arrayBuffer();
            } else {
                throw new Error('Tidak ada data file.');
            }

            const workbook = XLSX.read(data, { type: 'array' });
            const sheetsData = workbook.SheetNames.map(sheetName => {
                const worksheet = workbook.Sheets[sheetName];
                const html = worksheet && worksheet['!ref']
                    ? XLSX.utils.sheet_to_html(worksheet, { id: `sheet-${sheetName}`, editable: false })
                    : '<div class="p-8 text-center text-slate-400 font-semibold">Sheet ini kosong</div>';
                return { name: sheetName, html };
            });
            setExcelSheets(sheetsData);
            setActiveSheetIndex(0);
        } catch (err: any) {
            console.error('Excel Preview Error:', err);
            setError(`Gagal memproses pratinjau Excel: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = async () => {
        if (!finalUrl) return;

        // If it is a library document (stored in /uploads/), we download it via backend download-by-path endpoint
        // to preserve the original filename and prevent CORS issues.
        const isLibraryDoc = fileUrl && fileUrl.startsWith('/uploads/') && !fileUrl.startsWith('/uploads/dashboard/') && !fileUrl.startsWith('/uploads/exports/');
        if (isLibraryDoc) {
            try {
                const API_URL = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:5001/api`;
                const token = sessionStorage.getItem('token');
                
                const response = await fetch(`${API_URL}/dokumen/download-by-path?filePath=${encodeURIComponent(fileUrl)}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                
                if (!response.ok) {
                    throw new Error('Gagal mengunduh file dari server');
                }
                
                const blob = await response.blob();
                const blobUrl = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = blobUrl;
                link.download = fileName || 'dokumen';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(blobUrl);
                return;
            } catch (err) {
                console.error('Library download failed, falling back to direct link:', err);
            }
        }
        
        // If it's already a blob URL (from fileObject), we can just use it
        if (finalUrl.startsWith('blob:')) {
            const link = document.createElement('a');
            link.href = finalUrl;
            link.download = fileName || 'dokumen';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            return;
        }

        // For external URLs, fetch as blob to force download
        try {
            const response = await fetch(finalUrl);
            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = fileName || 'dokumen';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(blobUrl);
        } catch (err) {
            console.error('Download failed:', err);
            // Fallback to traditional anchor if fetch fails
            const link = document.createElement('a');
            link.href = finalUrl;
            link.target = '_blank';
            link.download = fileName || 'dokumen';
            link.click();
        }
    };

    if (!isOpen) return null;

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
                            {isPdf && <FileText size={18} className="sm:w-6 sm:h-6" />}
                            {isExcel && <FileSpreadsheet size={18} className="sm:w-6 sm:h-6" />}
                            {isDocx && <FileText size={18} className="sm:w-6 sm:h-6" />}
                            {isImage && <FileImage size={18} className="sm:w-6 sm:h-6" />}
                            {!isPdf && !isExcel && !isDocx && !isImage && <FileIcon size={18} className="sm:w-6 sm:h-6" />}
                        </div>
                        <div className="min-w-0">
                            <h3 className="text-xs sm:text-lg font-black text-slate-800 truncate tracking-tight leading-none sm:leading-normal">{fileName}</h3>
                            <p className={`text-[8px] sm:text-[10px] font-bold ${fileColors.text} opacity-70 uppercase tracking-widest mt-0.5 sm:mt-1`}>
                                {fileType.toUpperCase()}
                            </p>
                        </div>
                    </div>

                    {/* Integrated Zoom Controls - hidden for PDF */}
                    {!isPdf && (
                    <div className="flex items-center bg-slate-100/80 p-0.5 sm:p-1 rounded-lg sm:rounded-xl border border-slate-200">
                        <button 
                            onClick={() => setZoom(prev => Math.max(0.3, prev - 0.1))}
                            className="w-7 h-7 sm:w-10 sm:h-10 flex items-center justify-center text-slate-500 hover:text-ppm-blue hover:bg-white rounded-md sm:rounded-lg transition-all active:scale-90"
                            title="Zoom Out"
                        >
                            <Minus size={14} className="sm:w-[18px] sm:h-[18px]" />
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
                            <Plus size={14} className="sm:w-[18px] sm:h-[18px]" />
                        </button>
                    </div>
                    )}

                    <div className="flex items-center gap-1 sm:gap-3">
                        {!disableDownload && finalUrl && (
                            <button 
                                onClick={handleDownload}
                                className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-all active:scale-95"
                            >
                                <Download size={16} />
                                <span className="hidden sm:inline">Unduh</span>
                            </button>
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
                            {!disableDownload && (
                                <button 
                                    onClick={handleDownload}
                                    className="w-full py-4 bg-blue-500 hover:bg-blue-600 text-white rounded-2xl font-bold text-sm shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-2"
                                >
                                    <Download size={18} />
                                    <span>Unduh Saja</span>
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="w-full h-full flex flex-col items-center">
                             {isPdf && finalUrl && (
                                 <iframe 
                                     src={`${finalUrl}#toolbar=0&navpanes=0`}
                                     className="w-full h-full min-h-[75vh] rounded-2xl border border-slate-200 bg-white shadow-sm"
                                     style={{ border: 'none' }}
                                     title={fileName || 'PDF Preview'}
                                 />
                             )}

                            {isImage && finalUrl && (
                                <div className="max-w-full h-full flex items-center justify-center overflow-auto p-4">
                                    <img 
                                        src={finalUrl} 
                                        alt={fileName || 'Preview'} 
                                        className="rounded-2xl shadow-xl border border-white transition-all duration-200"
                                        style={{
                                            transform: `scale(${zoom})`,
                                            transformOrigin: 'center center',
                                            maxHeight: '70vh',
                                            objectFit: 'contain'
                                        }}
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

                             {isPptx && pptxSlides.length > 0 && pptxSlides[0].title === '__PDF_CONVERSION__' && (
                                 // --- Mode: LibreOffice PDF conversion (visual, accurate) ---
                                 <iframe
                                     src={`${pptxSlides[0].texts[0]}#toolbar=0&navpanes=0`}
                                     className="w-full min-h-[75vh] rounded-2xl border border-slate-200 bg-white shadow-sm"
                                     style={{ border: 'none' }}
                                     title={fileName || 'PPTX Preview'}
                                 />
                             )}

                             {isPptx && pptxSlides.length > 0 && pptxSlides[0].title !== '__PDF_CONVERSION__' && (
                                 // --- Mode: Text extraction fallback ---
                                 <div className="w-full flex flex-col h-full min-h-[70vh] rounded-2xl overflow-hidden border border-slate-200 bg-slate-50">
                                     {/* Navigation Bar */}
                                     <div className="flex items-center justify-between px-4 py-2.5 bg-white border-b border-slate-200 shrink-0 shadow-sm">
                                         <button
                                             onClick={() => setActiveSlideIndex(prev => Math.max(0, prev - 1))}
                                             disabled={activeSlideIndex === 0}
                                             className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-30 transition-all"
                                         >
                                             <ChevronLeft size={14} /> Sebelumnya
                                         </button>
                                         <span className="text-xs font-black text-slate-600 tracking-wide">
                                             Slide {activeSlideIndex + 1} / {pptxSlides.length}
                                         </span>
                                         <button
                                             onClick={() => setActiveSlideIndex(prev => Math.min(pptxSlides.length - 1, prev + 1))}
                                             disabled={activeSlideIndex === pptxSlides.length - 1}
                                             className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-30 transition-all"
                                         >
                                             Berikutnya <ChevronRight size={14} />
                                         </button>
                                     </div>
                                     {/* Slide Content */}
                                     <div className="flex-1 overflow-auto custom-scrollbar p-6 sm:p-10 flex flex-col gap-4">
                                         <div
                                             className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden"
                                             style={{
                                                 transform: `scale(${zoom})`,
                                                 transformOrigin: 'top center',
                                                 width: zoom < 1 ? `${100 / zoom}%` : '100%',
                                             }}
                                         >
                                             <div className="bg-gradient-to-r from-orange-500 to-rose-500 px-8 py-6">
                                                 <span className="text-[10px] font-black text-orange-100 uppercase tracking-widest">Slide {activeSlideIndex + 1}</span>
                                                 <h3 className="text-xl sm:text-2xl font-black text-white leading-tight mt-1">
                                                     {pptxSlides[activeSlideIndex]?.title || `Slide ${activeSlideIndex + 1}`}
                                                 </h3>
                                             </div>
                                             <div className="px-8 py-6">
                                                 {pptxSlides[activeSlideIndex]?.texts.length > 0 ? (
                                                     <ul className="space-y-2">
                                                         {pptxSlides[activeSlideIndex].texts.map((text, i) => (
                                                             <li key={i} className="flex items-start gap-3 text-slate-700 text-sm leading-relaxed">
                                                                 <span className="mt-1.5 w-2 h-2 rounded-full bg-orange-400 shrink-0" />
                                                                 <span>{text}</span>
                                                             </li>
                                                         ))}
                                                     </ul>
                                                 ) : (
                                                     <p className="text-slate-400 text-sm italic">Slide ini tidak memiliki teks konten.</p>
                                                 )}
                                             </div>
                                         </div>
                                         {pptxSlides.length > 1 && (
                                             <div className="flex gap-2 flex-wrap mt-2">
                                                 {pptxSlides.map((slide, idx) => (
                                                     <button
                                                         key={idx}
                                                         onClick={() => setActiveSlideIndex(idx)}
                                                         className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border-2 transition-all truncate max-w-[120px] ${
                                                             activeSlideIndex === idx
                                                                 ? 'border-orange-400 bg-orange-50 text-orange-700'
                                                                 : 'border-slate-200 bg-white text-slate-500 hover:border-orange-200'
                                                         }`}
                                                     >
                                                         {idx + 1}. {slide.title}
                                                     </button>
                                                 ))}
                                             </div>
                                         )}
                                     </div>
                                 </div>
                             )}

                            {isExcel && excelSheets.length > 0 && excelSheets[0].name === '__PDF_CONVERSION__' && (
                                // --- Mode: LibreOffice PDF conversion (visual, accurate) ---
                                <iframe
                                    src={`${excelSheets[0].html}#toolbar=0&navpanes=0`}
                                    className="w-full min-h-[75vh] rounded-2xl border border-slate-200 bg-white shadow-sm"
                                    style={{ border: 'none' }}
                                    title={fileName || 'Excel Preview'}
                                />
                            )}

                            {isExcel && excelSheets.length > 0 && excelSheets[0].name !== '__PDF_CONVERSION__' && (
                                // --- Mode: SheetJS parsed HTML table fallback ---
                                <div className="w-full flex flex-col h-full min-h-[70vh] bg-white rounded-2xl overflow-hidden border border-slate-200">
                                    <style>{`
                                        .excel-preview-container table {
                                            border-collapse: collapse;
                                            width: 100%;
                                            font-size: 11px;
                                            color: #334155;
                                        }
                                        .excel-preview-container th, .excel-preview-container td {
                                            border: 1px solid #e2e8f0;
                                            padding: 6px 10px;
                                            min-width: 80px;
                                            text-align: left;
                                            white-space: nowrap;
                                        }
                                        .excel-preview-container tr:nth-child(even) {
                                            background-color: #f8fafc;
                                        }
                                        .excel-preview-container tr:hover {
                                            background-color: #f1f5f9;
                                        }
                                    `}</style>
                                    {/* Tabs */}
                                    {excelSheets.length > 1 && (
                                        <div className="flex border-b border-slate-200 overflow-x-auto bg-slate-100/50 p-1.5 gap-1 shrink-0">
                                            {excelSheets.map((sheet, index) => (
                                                <button
                                                    key={index}
                                                    onClick={() => setActiveSheetIndex(index)}
                                                    className={`px-4 py-2 text-xs font-black rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                                                        activeSheetIndex === index 
                                                            ? 'bg-white text-emerald-700 shadow-sm border border-slate-200' 
                                                            : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
                                                    }`}
                                                >
                                                    {sheet.name}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                    {/* Sheet content */}
                                    <div className="flex-1 overflow-auto p-6 excel-preview-container bg-slate-50/50 custom-scrollbar flex justify-center items-start">
                                        <div 
                                            className="bg-white p-6 shadow-md border border-slate-100 rounded-xl min-w-full md:min-w-[90%] origin-top-left"
                                            style={{ 
                                                transform: `scale(${zoom})`, 
                                                transformOrigin: 'top left',
                                                width: zoom > 1 ? `${100 / zoom}%` : '100%',
                                                marginBottom: zoom < 1 ? `-${(1 - zoom) * 100}%` : '0'
                                            }}
                                            dangerouslySetInnerHTML={{ __html: excelSheets[activeSheetIndex]?.html || '' }} 
                                        />
                                    </div>
                                </div>
                            )}

                            {isArchive && (
                                <div className="h-full flex flex-col items-center justify-center text-center p-8">
                                    <div className="w-20 h-20 bg-amber-50 text-amber-600 rounded-3xl flex items-center justify-center mb-6 shadow-md border border-amber-100">
                                        <Archive size={40} />
                                    </div>
                                    <h4 className="text-xl font-black text-slate-800 mb-2 uppercase tracking-wide">Berkas Arsip ({fileType.toUpperCase()})</h4>
                                    <p className="text-slate-500 mb-6 max-w-md text-xs leading-relaxed font-semibold">
                                        Dokumen ini dikemas dalam bentuk berkas terkompresi <strong>.{fileType.toUpperCase()}</strong>. Silakan unduh untuk mengeset atau mengekstrak dokumen di dalamnya.
                                    </p>
                                    {!disableDownload ? (
                                        <button 
                                            onClick={handleDownload}
                                            className="px-8 py-3.5 bg-amber-600 hover:bg-amber-700 text-white rounded-2xl font-extrabold text-xs shadow-lg shadow-amber-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                                        >
                                            <Download size={16} />
                                            <span>Unduh Berkas Arsip (.{fileType.toUpperCase()})</span>
                                        </button>
                                    ) : (
                                        <div className="px-6 py-3 bg-amber-50 border border-amber-200 text-amber-800 font-bold text-xs rounded-xl flex items-center gap-2">
                                            <AlertCircle size={16} />
                                            <span>Akses Unduhan Dibatasi</span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {!isPdf && !isImage && !isDocx && !isPptx && !isExcel && !isArchive && (
                                <div className="h-full flex flex-col items-center justify-center text-center p-8">
                                    <div className="w-20 h-20 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mb-6">
                                        <ExternalLink size={40} />
                                    </div>
                                    <h4 className="text-xl font-black text-slate-800 mb-3">Format Tidak Didukung Preview</h4>
                                    <p className="text-slate-500 mb-8 max-w-sm">
                                        {disableDownload 
                                            ? 'File ini diset sebagai Pribadi/Private dan tidak diizinkan untuk diunduh langsung.' 
                                            : 'File ini hanya dapat diakses melalui unduhan langsung.'}
                                    </p>
                                    {!disableDownload ? (
                                        <button 
                                            onClick={handleDownload}
                                            className="px-8 py-4 bg-slate-800 hover:bg-slate-900 text-white rounded-2xl font-bold text-sm shadow-lg shadow-slate-200 transition-all flex items-center justify-center gap-2"
                                        >
                                            <Download size={18} />
                                            <span>Unduh File</span>
                                        </button>
                                    ) : (
                                        <div className="px-6 py-3 bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold text-xs rounded-xl flex items-center gap-2">
                                            <AlertCircle size={16} />
                                            <span>Akses Unduhan Dibatasi</span>
                                        </div>
                                    )}
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
