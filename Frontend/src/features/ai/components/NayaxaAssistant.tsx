import React, { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '@/src/services/api';
import { Bot, X, Send, LineChart, AlertTriangle, Users, Award, ChevronUp, ChevronDown, FileText, Image, FileArchive, Plus, Trash2, Mic, MicOff, Pin, PinOff, Zap, Search, MoreVertical, Sparkles, Copy, Check, CheckCircle, Info, Paperclip, CornerUpLeft, Pencil, Camera, Phone, Video, VideoOff, RefreshCw, File, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '@/src/contexts/AuthContext';
import NayaxaChart from './NayaxaChart';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Mermaid from './Mermaid';
import { DocumentViewerModal } from '@/src/components/modals/DocumentViewerModal';

// --- SUB-COMPONENTS (MEMOIZED FOR PERFORMANCE) ---

const TableWithCopy = ({ children, onCopy }: { children: React.ReactNode, onCopy: (msg: string) => void }) => {
  const [copied, setCopied] = useState(false);
  const tableRef = useRef<HTMLTableElement>(null);

  const handleCopy = () => {
    if (!tableRef.current) return;
    
    // Get headers and rows
    const rows = Array.from(tableRef.current.querySelectorAll('tr'));
    
    // Create text/plain version (TSV)
    const plainText = rows.map(row => {
      const cells = Array.from(row.querySelectorAll('th, td'));
      return cells.map(cell => cell.textContent?.trim() || '').join('\t');
    }).join('\n');

    // Create text/html version for rich copy (retaining table structure)
    // We create a clean table for the clipboard with explicit styles for Word/Excel compatibility
    const htmlTable = `
      <style>
        table { border-collapse: collapse; width: 100%; border: 1px solid #e2e8f0; }
        th { background-color: #f1f5f9; font-weight: bold; border: 1px solid #e2e8f0; padding: 8px; text-align: left; }
        td { border: 1px solid #e2e8f0; padding: 8px; }
      </style>
      <table>
        ${tableRef.current.innerHTML}
      </table>
    `;

    try {
      const blobHtml = new Blob([htmlTable], { type: 'text/html' });
      const blobText = new Blob([plainText], { type: 'text/plain' });
      
      const data = [new ClipboardItem({ 
        'text/html': blobHtml, 
        'text/plain': blobText 
      })];
      
      navigator.clipboard.write(data).then(() => {
        setCopied(true);
        onCopy('Tabel disalin dengan properti lengkap!');
        setTimeout(() => setCopied(false), 2000);
      });
    } catch (err) {
      // Fallback for browsers that don't support ClipboardItem (rare now) or non-secure contexts
      navigator.clipboard.writeText(plainText);
      setCopied(true);
      onCopy('Tabel disalin (teks saja)');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="relative group/table my-4 border border-slate-200 rounded-xl overflow-hidden bg-white/70 backdrop-blur-md shadow-sm">
      <div className="absolute right-2 top-2 z-10">
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg border border-indigo-200 hover:bg-indigo-100 transition-all font-bold text-[10px] shadow-sm active:scale-95"
          title="Salin tabel ini"
        >
          {copied ? <Check size={12} className="text-green-600" /> : <Copy size={12} />}
          {copied ? 'Tersalin' : 'Salin'}
        </button>
      </div>
      <div className="overflow-x-auto p-1 pt-12">
        <table ref={tableRef} className="w-full text-[14px] border-collapse">
          {children}
        </table>
      </div>
    </div>
  );
};

const NayaxaMarkdownRenderer = React.memo(({ text, onCopy, onPreview }: { text: string, onCopy: (msg: string) => void, onPreview: (url: string, name: string) => void }) => {
  if (!text) return null;
    const safeText = typeof text === 'string' ? text : String(text || '');
    return (
      <div className="nayaxa-markdown">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            a({ node, children, ...props }: any) {
              try {
                const linkUrl = props.href || '';
                let finalUrl = linkUrl;

                // --- UNIVERSAL PATH ALIGNMENT (v4.5.5) ---
                const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
                // Enterprise-grade backend resolution
                const backendUrl = import.meta.env.VITE_NAYAXA_API_URL 
                    ? import.meta.env.VITE_NAYAXA_API_URL.split('/api/')[0] 
                    : (isLocalDev 
                        ? `http://${window.location.hostname}:6001`
                        : `${window.location.protocol}//${window.location.hostname}:6001`);

                // Case 1: Relative Path (e.g. /uploads/file.pdf)
                if (finalUrl.startsWith('/api/') || finalUrl.startsWith('/uploads/') || finalUrl.startsWith('/outputs/') || finalUrl.startsWith('/export/')) {
                    finalUrl = `${backendUrl}${finalUrl}`;
                }
                
                // Case 2: Absolute Path (check if it's an internal resource)
                else if (finalUrl.startsWith('http')) {
                    try {
                        const urlObj = new URL(finalUrl);
                        // If it points to internal API/Uploads but wrong host/port, align it
                        if (urlObj.pathname.includes('/api/') || urlObj.pathname.includes('/uploads/') || urlObj.pathname.includes('/outputs/') || urlObj.pathname.includes('/export/')) {
                            // Only rewrite if host/port is different from intended backend
                            if (urlObj.host !== `${window.location.hostname}:6001`) {
                                finalUrl = `${backendUrl}${urlObj.pathname}${urlObj.search}`;
                            }
                        }
                    } catch (e) {
                        console.error('URL Parsing Error:', e);
                    }
                }
                
                // Final Check: Fallback for localhost/127.0.0.1 string replacements
                if (finalUrl.includes('localhost') || finalUrl.includes('127.0.0.1')) {
                    finalUrl = finalUrl.replace(/(localhost|127\.0\.0\.1)(:\d+)?/, `${window.location.hostname}:6001`);
                }

                // Determine if it's a doc for preview
                const isDoc = /\.(pdf|docx|pptx|png|jpg|jpeg|webp|xlsx|xls)$/i.test(finalUrl);
                const isDownload = finalUrl.includes('/uploads/exports/') || finalUrl.includes('/export/') || finalUrl.includes('/outputs/') || finalUrl.includes('/uploads/dashboard/');
                const isExport = finalUrl.includes('/uploads/exports/') || finalUrl.includes('/outputs/') || finalUrl.includes('/export/') || finalUrl.includes('/uploads/dashboard/');
                
                const extension = finalUrl.split('.').pop()?.toLowerCase() || '';
                let fileColorClass = 'bg-indigo-50 border-indigo-200 text-blue-600 hover:bg-indigo-100'; // Default
                
                if (isDownload) {
                  if (extension === 'pdf') fileColorClass = 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100';
                  else if (extension === 'xlsx' || extension === 'xls' || extension === 'csv') fileColorClass = 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100';
                  else if (extension === 'pptx') fileColorClass = 'bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100';
                  else if (extension === 'docx' || extension === 'doc') fileColorClass = 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100';
                }

                return (
                  <a 
                    {...props}
                    href={finalUrl}
                    target="_blank" 
                    rel="noopener noreferrer"
                    onClick={(e) => {
                      if (isDoc) {
                        e.preventDefault();
                        // Extract clean filename from URL for better preview/download fallback
                        const urlFileName = finalUrl.split('/').pop()?.split('?')[0] || '';
                        
                        // Ekstrak nama asli secara aman dari Markdown children (bisa berupa React Node Array)
                        let previewName = '';
                        try {
                           const extractText = (nodes: any): string => {
                               if (!nodes) return '';
                               if (typeof nodes === 'string' || typeof nodes === 'number') return String(nodes);
                               if (Array.isArray(nodes)) return nodes.map(extractText).join('');
                               if (nodes.props && nodes.props.children) return extractText(nodes.props.children);
                               return '';
                           };
                           previewName = extractText(children).trim() || urlFileName;
                        } catch(e) {
                           previewName = urlFileName;
                        }

                        // Jika ekstensi tidak ada, tambahkan dari URL
                        const hasExt = /\.[a-z0-9]+$/i.test(previewName);
                        if (!hasExt) {
                          const ext = urlFileName.split('.').pop();
                          if (ext && ext !== urlFileName) {
                            previewName = `${previewName}.${ext}`;
                          }
                        }
                        
                        // Strip technical prefixes if they still exist in the final name
                        previewName = previewName.replace(/^\d{10,}-/, '');
                        
                        onPreview(finalUrl, previewName, !isExport);
                      }
                    }}
                    className={`inline-flex items-center gap-2 my-2 p-3 px-4 rounded-xl border transition-all max-w-full break-all shadow-sm no-underline font-bold ${
                      isDownload ? fileColorClass : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {isDownload ? <FileArchive size={16} className="shrink-0" /> : <Plus size={16} className="rotate-45 shrink-0" />}
                    <span className="truncate max-w-[160px] sm:max-w-[320px]">{children}</span>
                  </a>
                );
              } catch (e) { return <a {...props}>{children}</a>; }
            },
            code({ node, inline, className, children, ...props }: any) {
              try {
                const match = /language-(\w+)/.exec(className || '');
                const lang = match ? match[1] : '';
                const value = String(children).replace(/\n$/, '');
                if (!inline && lang === 'mermaid') {
                  return (
                    <React.Suspense fallback={<div className="p-4 bg-slate-50 rounded-lg animate-pulse">Memuat diagram...</div>}>
                      <Mermaid chart={value} onCopy={() => onCopy('Bagan Mermaid berhasil disalin!')} />
                    </React.Suspense>
                  );
                }
                return <code className={className} {...props}>{children}</code>;
              } catch (e) { return <code className={className} {...props}>{children}</code>; }
            },
            table({ children }) {
              return <TableWithCopy onCopy={onCopy}>{children}</TableWithCopy>;
            }
          }}
        >
          {safeText}
        </ReactMarkdown>
      </div>
    );
});

const MessageItem = React.memo(({ msg, idx, isLocationEnabled, handleEnableGPS, setMessages, onCopy, handleSend, onPreview }: any) => {
  if (!msg) return null;

  // Defensive check: ensure text is a string
  const rawText = typeof msg.text === 'string' 
    ? msg.text 
    : (typeof msg.text === 'object' && msg.text !== null ? (msg.text.text || JSON.stringify(msg.text)) : String(msg.text || ''));
    
  const hasPdfAction = rawText.includes('[ACTION:NAVIGATE_LAPORAN_PDF]');
  const hasProposalAction = rawText.includes('[PROPOSAL_ACTION:kerjakan]');
  
  let cleanText = rawText
    .replace('[ACTION:NAVIGATE_LAPORAN_PDF]', '')
    .replace('[PROPOSAL_ACTION:kerjakan]', '')
    .replace('[ACTION:REQUEST_LOCATION]', '')
    .trim();

  return (
    <motion.div 
      key={idx} 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} w-full`}
    >
      <div className={`max-w-[90%] rounded-2xl p-4 px-5 text-[16px] ${
        msg.role === 'user' 
          ? 'bg-indigo-600 text-white rounded-tr-sm shadow-md shadow-indigo-200' 
          : 'bg-white text-black border border-slate-100 shadow-sm rounded-tl-sm'
      }`}>
        {/* Historical Thoughts/Steps */}
        {msg.role === 'assistant' && (msg.steps?.length > 0 || msg.thought) && (
            <div className="mb-4 border-b border-slate-100 pb-3">
                <details className="group">
                    <summary className="list-none cursor-pointer flex items-center gap-2 text-[11px] font-bold text-slate-400 hover:text-indigo-600 transition-colors">
                        <span className="p-1 bg-slate-50 rounded-full group-open:rotate-180 transition-transform">
                            <ChevronDown size={10} />
                        </span>
                        Thought {msg.thinkTime ? `for ${msg.thinkTime} seconds` : 'process'}
                    </summary>
                    <div className="mt-3 space-y-2.5 pl-4 border-l-2 border-slate-100">
                        {msg.steps?.map((s: any, idx: number) => (
                            <div key={idx} className="flex items-center gap-2.5 text-[11px] text-slate-500">
                                <span className="w-5 h-5 flex items-center justify-center bg-slate-50 rounded text-[10px]">{s.icon}</span>
                                <span className="font-medium">{s.label}</span>
                            </div>
                        ))}
                        {msg.thought && (
                            <div className="text-[11px] text-slate-400 italic bg-slate-50/50 p-2.5 rounded-xl border border-slate-100/50 leading-relaxed">
                                {msg.thought}
                            </div>
                        )}
                    </div>
                </details>
            </div>
        )}
        {msg.files && msg.files.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {msg.files.map((file: any, fidx: number) => (
              <div key={fidx} className={file.type?.startsWith('image/') ? 'w-20 h-20 shrink-0' : 'min-w-[120px] max-w-[180px] flex-1'}>
                {file.type?.startsWith('image/') ? (
                  <img src={file.url!} alt="Attachment" className="w-full h-full object-cover rounded-lg border shadow-sm" />
                ) : (
                  <div className={`border p-2 rounded-lg flex items-center gap-2 h-full overflow-hidden ${
                    file.name?.toLowerCase().endsWith('.pdf') ? 'bg-red-50 border-red-100 text-red-600' :
                    file.name?.toLowerCase().endsWith('.xlsx') || file.name?.toLowerCase().endsWith('.xls') || file.name?.toLowerCase().endsWith('.csv') ? 'bg-emerald-50 border-emerald-100 text-emerald-600' :
                    file.name?.toLowerCase().endsWith('.pptx') ? 'bg-orange-50 border-orange-100 text-orange-600' :
                    file.name?.toLowerCase().endsWith('.docx') || file.name?.toLowerCase().endsWith('.doc') ? 'bg-blue-50 border-blue-100 text-blue-600' :
                    'bg-slate-50 border-slate-200 text-slate-600'
                  }`}>
                    <FileArchive size={14} className="shrink-0" />
                    <span className="text-[9px] font-bold truncate flex-1">{file.name}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        <div className="whitespace-pre-wrap leading-relaxed break-words overflow-hidden">
          {(() => {
            const CHART_REGEX = /\[NAYAXA_CHART\](.*?)\[\/NAYAXA_CHART\]/gs;
            const parts = [];
            let lastIndex = 0;
            let match;

            while ((match = CHART_REGEX.exec(cleanText)) !== null) {
              if (match.index > lastIndex) {
                parts.push(<NayaxaMarkdownRenderer key={`text-${lastIndex}`} text={cleanText.substring(lastIndex, match.index)} onCopy={onCopy} onPreview={onPreview} />);
              }
              try {
                let rawSpec = match[1].trim();
                if (rawSpec.startsWith('```')) rawSpec = rawSpec.replace(/^```(json)?\n?/, '').replace(/\n?```$/, '').trim();
                let chartSpec;
                try { chartSpec = JSON.parse(atob(rawSpec)); } catch { chartSpec = JSON.parse(rawSpec); }
                parts.push(<NayaxaChart key={`chart-${match.index}`} spec={chartSpec} />);
              } catch (e) {
                parts.push(<span key={`error-${match.index}`} className="text-red-500 text-xs">[Kesalahan Grafik]</span>);
              }
              lastIndex = CHART_REGEX.lastIndex;
            }

            if (lastIndex < cleanText.length) {
              parts.push(<NayaxaMarkdownRenderer key={`text-${lastIndex}`} text={cleanText.substring(lastIndex)} onCopy={onCopy} onPreview={onPreview} />);
            }

            return parts.length > 0 ? parts : <NayaxaMarkdownRenderer text={cleanText} onCopy={onCopy} onPreview={onPreview} />;
          })()}
        </div>

        {msg.role === 'assistant' && hasPdfAction && (
          <button onClick={() => window.location.href = '/?page=kegiatan-per-orang'} className="mt-3 flex items-center justify-center w-full py-2 gap-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl transition-colors border border-indigo-200/60 transition-all active:scale-95">
            <FileText size={16} /> Halaman Cetak PDF Laporan
          </button>
        )}

        {msg.role === 'assistant' && msg.text?.includes('[ACTION:REQUEST_LOCATION]') && !isLocationEnabled && (
          <div className="mt-4 p-4 bg-indigo-50 border border-indigo-200 rounded-2xl flex flex-col gap-3">
            <div className="flex items-center gap-2 text-indigo-700 font-bold text-xs"><Bot size={16} /> Aktifkan GPS Sementara?</div>
            <p className="text-[11px] text-slate-600 leading-normal">Nayaxa ingin mengakses lokasi Anda untuk memberikan rekomendasi yang paling akurat di sekitar Anda. GPS akan aktif selama 5 menit.</p>
            <div className="flex gap-2">
              <button onClick={handleEnableGPS} className="flex-1 py-2 bg-indigo-600 text-white text-[11px] font-bold rounded-xl hover:bg-indigo-700 transition-colors shadow-sm">Izinkan (5 Menit)</button>
              <button onClick={() => setMessages((prev: any) => [...prev, { role: 'assistant', text: 'Baik, saya akan memberikan informasi umum saja tanpa data lokasi.' }])} className="flex-1 py-2 bg-white text-slate-500 text-[11px] font-bold rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors">Tidak</button>
            </div>
          </div>
        )}

        {msg.role === 'assistant' && hasProposalAction && (
          <div className="mt-4 p-3 bg-white border border-indigo-100 rounded-xl shadow-sm flex flex-col gap-3 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
            <div className="pl-2">
              <div className="flex items-center gap-2 text-indigo-700 font-bold text-xs mb-1">
                <CheckCircle size={14} className="text-indigo-500" /> Konfirmasi Tindakan
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed mb-3">
                Apakah Anda mengizinkan Nayaxa untuk mengeksekusi rencana modifikasi ini?
              </p>
              <div className="flex gap-2">
                <button 
                  onClick={() => handleSend(null, "kerjakan")} 
                  className="flex-1 py-1.5 bg-indigo-600 text-white text-[11px] font-bold rounded-lg hover:bg-indigo-700 transition-colors shadow-sm active:scale-95"
                >
                  Izinkan & Kerjakan
                </button>
                <button 
                  onClick={() => handleSend(null, "Tolak dan batalkan rencana ini.")} 
                  className="flex-1 py-1.5 bg-slate-100 text-slate-600 border border-slate-200 text-[11px] font-bold rounded-lg hover:bg-slate-200 transition-colors active:scale-95"
                >
                  Tolak
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
});

// --- MAIN COMPONENT ---

export default function NayaxaAssistant() {
  const { user } = useAuth();
  const isBapperida = user?.role === 'admin' || 
                      user?.role === 'bapperida' || 
                      user?.role === 'pimpinan' ||
                      user?.tipe_user_id === 1 ||
                      user?.instansi_nama?.toLowerCase().includes('badan perencanaan') || 
                      user?.instansi_singkatan?.toLowerCase() === 'bapperida';

  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [insights, setInsights] = useState<any>(null);
  const [summary, setSummary] = useState('');
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [messages, setMessages] = useState<any[]>([
    { 
      role: 'assistant', 
      text: `Halo **${user?.nama_lengkap || 'Sobat Nayaxa'}**, saya **Nayaxa**, asisten AI Bapperida yang siap membantu Anda dengan data, analisis, dan administrasi. Apa yang bisa saya bantu hari ini?` 
    }
  ]);
  const [inputVal, setInputVal] = useState('');
  const inputValRef = useRef('');
  const [isTyping, setIsTyping] = useState(false);
  const isTypingRef = useRef(false);
  const [selectedFiles, setSelectedFiles] = useState<any[]>([]);
  const selectedFilesRef = useRef<any[]>([]);
const [isDragging, setIsDragging] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<{ url: string, name: string, readOnly?: boolean } | null>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const abortFuncRef = useRef<(() => void) | null>(null);
  const [thinkingBrain, setThinkingBrain] = useState<string | null>(null);
  const [lastBrainUsed, setLastBrainUsed] = useState<string | null>(null);
  const [isLocationEnabled, setIsLocationEnabled] = useState(false);
  const [coords, setCoords] = useState<{ lat: number, lng: number } | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [width, setWidth] = useState(() => Number(localStorage.getItem('nayaxa_width')) || 400);
  const [height, setHeight] = useState(() => Number(localStorage.getItem('nayaxa_height')) || 580);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [resizingDir, setResizingDir] = useState<'w' | 'n' | null>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const isAtBottomRef = useRef(true); // Ref copy to break Effect loops
  const isUserTypingRef = useRef(false); // Suppresses scroll button during typing
  const scrollDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isAwakening, setIsAwakening] = useState(false);
  const [currentSteps, setCurrentSteps] = useState<any[]>([]);
  const currentStepsRef = useRef<any[]>([]);
  const [thought, setThought] = useState('');
  const thoughtRef = useRef('');
  const [currentResponse, setCurrentResponse] = useState('');
  const [showThought, setShowThought] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const [thinkTime, setThinkTime] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // --- Mobile Keyboard & Viewport Sizing Hooks ---
  const [viewportHeight, setViewportHeight] = useState(typeof window !== 'undefined' ? window.innerHeight : 800);
  const [keyboardOffset, setKeyboardOffset] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleResize = () => {
      if (window.visualViewport) {
        setViewportHeight(window.visualViewport.height);
        // Calculate the difference between visual layout and physical layout (keyboard size)
        const offset = window.innerHeight - window.visualViewport.height;
        setKeyboardOffset(offset > 0 ? offset : 0);
      } else {
        setViewportHeight(window.innerHeight);
        setKeyboardOffset(0);
      }
    };

    window.visualViewport?.addEventListener('resize', handleResize);
    window.visualViewport?.addEventListener('scroll', handleResize);
    window.addEventListener('resize', handleResize);

    // Initial check
    handleResize();

    return () => {
      window.visualViewport?.removeEventListener('resize', handleResize);
      window.visualViewport?.removeEventListener('scroll', handleResize);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const showLocalToast = useCallback((msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  }, []);
  
  // --- Secret Chat States & Hooks ---
  const isSecretUser = user?.username?.toLowerCase() === 'sammyl' || user?.username?.toLowerCase() === 'levina';
  const [isSecretChatActive, setIsSecretChatActive] = useState(false);
  const [isLockOverlayVisible, setIsLockOverlayVisible] = useState(false);
  const [secretMessages, setSecretMessages] = useState<any[]>([]);
  const [secretFileCache, setSecretFileCache] = useState<Record<number, string>>({});
  const [fetchingFileIds, setFetchingFileIds] = useState<Set<number>>(new Set());

  const fetchSecretFileOnDemand = useCallback(async (msgId: number) => {
    if (secretFileCache[msgId] || fetchingFileIds.has(msgId)) return;

    setFetchingFileIds(prev => {
      const next = new Set(prev);
      next.add(msgId);
      return next;
    });

    try {
      const res = await api.nayaxa.secretChat.getFile(msgId);
      if (res && res.success && res.fileData) {
        setSecretFileCache(prev => ({
          ...prev,
          [msgId]: res.fileData
        }));
      }
    } catch (err) {
      console.error("Error fetching file on-demand:", err);
    } finally {
      setFetchingFileIds(prev => {
        const next = new Set(prev);
        next.delete(msgId);
        return next;
      });
    }
  }, [secretFileCache, fetchingFileIds]);

  const [secretInput, setSecretInput] = useState('');
  const [secretSending, setSecretSending] = useState(false);
  const secretMessagesEndRef = useRef<HTMLDivElement>(null);
  const [isSecretAtBottom, setIsSecretAtBottom] = useState(true);
  const isSecretAtBottomRef = useRef(true);
  const isSecretClearingRef = useRef(false);
  const isSelectingFileRef = useRef(false);

  // --- Custom Pull-to-Dismiss Gesture for Quick Close ---
  const [pullOffset, setPullOffset] = useState(0);
  const touchStartYRef = useRef<number | null>(null);

  const handleTouchStartScroll = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    if (target.scrollTop === 0) {
      touchStartYRef.current = e.touches[0].clientY;
    }
  }, []);

  const handleTouchMoveScroll = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (touchStartYRef.current === null) return;
    const currentY = e.touches[0].clientY;
    const diffY = currentY - touchStartYRef.current;
    if (diffY > 0) {
      const offset = Math.min(80, Math.pow(diffY, 0.85));
      setPullOffset(offset);
    }
  }, []);

  const handleTouchEndScroll = useCallback(() => {
    if (touchStartYRef.current !== null) {
      if (pullOffset >= 55) {
        setIsOpen(false);
        setIsSecretChatActive(false);
        showLocalToast("Asisten ditutup.");
      }
      setPullOffset(0);
      touchStartYRef.current = null;
    }
  }, [pullOffset, showLocalToast]);

  // States and Refs for Direct Reply & Unread Message Editing
  const [replyTo, setReplyTo] = useState<any | null>(null);
  const [editingMessage, setEditingMessage] = useState<any | null>(null);

  const touchStartXRef = useRef<number | null>(null);
  const swipedMessageIdRef = useRef<number | null>(null);
  const [swipingMessageId, setSwipingMessageId] = useState<number | null>(null);
  const [swipeOffset, setSwipeOffset] = useState<number>(0);

  const handleTouchStart = (e: React.TouchEvent, msgId: number) => {
    touchStartXRef.current = e.touches[0].clientX;
    swipedMessageIdRef.current = msgId;
    setSwipingMessageId(msgId);
    setSwipeOffset(0);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null) return;
    const diffX = e.touches[0].clientX - touchStartXRef.current;
    if (diffX > 0) {
      setSwipeOffset(diffX);
    }
  };

  const handleTouchEnd = (msg: any) => {
    if (swipeOffset > 60) {
      setReplyTo(msg);
      setEditingMessage(null); // Clear editing if user chooses to reply instead
      if (navigator.vibrate) {
        navigator.vibrate(10); // Optional vibration for tactile response
      }
    }
    touchStartXRef.current = null;
    swipedMessageIdRef.current = null;
    setSwipingMessageId(null);
    setSwipeOffset(0);
  };


  // WebRTC Video Call States & Refs
  const [callState, setCallState] = useState<'idle' | 'calling' | 'ringing' | 'connected'>('idle');
  const [callRole, setCallRole] = useState<'caller' | 'callee' | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [activeCallId, setActiveCallId] = useState<string | null>(null);

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const activeCallIdRef = useRef<string | null>(null);
  const processedSignalingIdsRef = useRef<Set<number>>(new Set());

  // Guarantee that when streams are loaded, they are bound to HTMLVideoElement refs correctly
  useEffect(() => {
    if (callState === 'connected' && localVideoRef.current && localStream) {
      if (localVideoRef.current.srcObject !== localStream) {
        localVideoRef.current.srcObject = localStream;
      }
    }
  }, [callState, localStream]);

  useEffect(() => {
    if (callState === 'connected' && remoteVideoRef.current && remoteStream) {
      if (remoteVideoRef.current.srcObject !== remoteStream) {
        remoteVideoRef.current.srcObject = remoteStream;
      }
    }
  }, [callState, remoteStream]);

  // Secure Attachment & Camera States
  const [attachedFile, setAttachedFile] = useState<{ name: string, type: string, size: string, data: string } | null>(null);
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const [cameraFacingMode, setCameraFacingMode] = useState<'user' | 'environment'>('user');
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const cameraVideoRef = useRef<HTMLVideoElement>(null);
  const secretFileInputRef = useRef<HTMLInputElement>(null);
  const secretInputRef = useRef<HTMLTextAreaElement>(null);
  const isFirstSecretLoadRef = useRef(true);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const compressImageFile = async (file: File, maxWidth = 1024, quality = 0.7): Promise<string> => {
    try {
      const bitmap = await createImageBitmap(file);
      const canvas = document.createElement('canvas');
      let width = bitmap.width;
      let height = bitmap.height;

      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error("Canvas context failed");
      }

      ctx.drawImage(bitmap, 0, 0, width, height);
      const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
      bitmap.close();
      return compressedBase64;
    } catch (err) {
      console.error("createImageBitmap failed, falling back to FileReader:", err);
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            let w = img.width;
            let h = img.height;
            if (w > maxWidth) {
              h = (h * maxWidth) / w;
              w = maxWidth;
            }
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0, w, h);
              resolve(canvas.toDataURL('image/jpeg', quality));
            } else {
              resolve(reader.result as string);
            }
          };
          img.onerror = () => resolve(reader.result as string);
          img.src = reader.result as string;
        };
        reader.onerror = () => resolve('');
        reader.readAsDataURL(file);
      });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const inputEl = e.target;

    // Enforce 10MB file size limit to prevent MySQL max_allowed_packet issues
    const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE_BYTES) {
      showLocalToast(`File terlalu besar (maks 10MB). Ukuran file: ${formatBytes(file.size)}`);
      inputEl.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      let data = reader.result as string;
      let sizeText = formatBytes(file.size);
      let outName = file.name;
      let outType = file.type;

      if (file.type.startsWith('image/') && !file.type.includes('gif')) {
        try {
          const compressed = await compressImageFile(file, 1024, 0.7);
          data = compressed;
          const estBytes = Math.round((compressed.length - 22) * 3 / 4);
          sizeText = formatBytes(estBytes);
          outName = file.name.replace(/\.[^/.]+$/, "") + ".jpg";
          outType = "image/jpeg";
        } catch (compressErr) {
          console.error("Compression failed:", compressErr);
        }
      }

      setAttachedFile({
        name: outName,
        type: outType,
        size: sizeText,
        data: data
      });
      setEditingMessage(null); // Clear editing mode

      // Safe reset of input value AFTER file has been fully processed and stored in React state
      inputEl.value = '';
    };
    reader.onerror = () => {
      showLocalToast('Gagal membaca file. Coba lagi.');
      inputEl.value = '';
    };
    reader.readAsDataURL(file);
  };

  const startCameraStream = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      showLocalToast("Kamera tidak tersedia di koneksi tidak aman (HTTP). Gunakan HTTPS atau localhost.");
      setIsCameraModalOpen(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: cameraFacingMode } });
      setCameraStream(stream);
      if (cameraVideoRef.current) {
        cameraVideoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('Error starting camera preview:', err);
      showLocalToast("Gagal menyalakan kamera.");
      setIsCameraModalOpen(false);
    }
  };

  const stopCameraStream = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    if (cameraVideoRef.current) {
      cameraVideoRef.current.srcObject = null;
    }
  };

  const capturePhoto = () => {
    if (cameraVideoRef.current) {
      const video = cameraVideoRef.current;
      const canvas = document.createElement('canvas');
      
      const maxDim = 1024;
      let width = video.videoWidth || 640;
      let height = video.videoHeight || 480;
      if (width > maxDim) {
        height = Math.round((height * maxDim) / width);
        width = maxDim;
      }
      
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, width, height);
        // Compress as JPEG quality 0.7
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
        const estimatedBytes = Math.round((dataUrl.length - 22) * 3 / 4);
        
        setAttachedFile({
          name: `captured_${Date.now()}.jpg`,
          type: 'image/jpeg',
          size: formatBytes(estimatedBytes),
          data: dataUrl
        });
        
        stopCameraStream();
        setIsCameraModalOpen(false);
        setEditingMessage(null); // Clear editing on attach
      }
    }
  };

  const flipCamera = () => {
    setCameraFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  // Camera stream autostart trigger
  useEffect(() => {
    if (isCameraModalOpen) {
      startCameraStream();
    } else {
      stopCameraStream();
    }
    return () => {
      stopCameraStream();
    };
  }, [isCameraModalOpen, cameraFacingMode]);

  // WebRTC Signaling Handler
  const handleSignaling = useCallback(async (msg: any) => {
    if (processedSignalingIdsRef.current.has(msg.id)) return;
    processedSignalingIdsRef.current.add(msg.id);

    try {
      const signal = JSON.parse(msg.message);
      if (!signal || !signal.type) return;

      const senderLower = msg.sender?.toLowerCase();
      const meLower = user?.username?.toLowerCase();
      if (senderLower === meLower) return; // Ignore own packets

      // Strictly ignore any incoming video calls if the Safe Room chat is not open
      if (signal.type === 'videocall_incoming' && !isSecretChatActive) {
        return;
      }

      if (signal.type !== 'videocall_incoming' && signal.callId !== activeCallIdRef.current) return;

      console.log('[WebRTC Signaling] Signal Received:', signal.type, signal);

      switch (signal.type) {
        case 'videocall_incoming':
          if (callState === 'idle') {
            activeCallIdRef.current = signal.callId;
            setActiveCallId(signal.callId);
            setCallRole('callee');
            setCallState('ringing');
            if (navigator.vibrate) navigator.vibrate([100, 200, 100, 200]);
          }
          break;

        case 'videocall_accepted':
          if (callState === 'calling' && callRole === 'caller') {
            setCallState('connected');
            await initiateWebRTCPeerConnection(true);
          }
          break;

        case 'webrtc_offer':
          if (callRole === 'callee') {
            await handleWebRTCOffer(signal.sdp);
          }
          break;

        case 'webrtc_answer':
          if (callRole === 'caller' && peerConnectionRef.current) {
            await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: signal.sdp }));
          }
          break;

        case 'webrtc_candidate':
          if (peerConnectionRef.current && peerConnectionRef.current.remoteDescription) {
            try {
              await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(signal.candidate));
            } catch (err) {
              console.error('Error adding ICE candidate:', err);
            }
          }
          break;

        case 'videocall_declined':
        case 'videocall_ended':
          cleanupCall();
          showLocalToast("Panggilan video berakhir.");
          break;
      }
    } catch (e) {
      // Normal text messages ignore parsing
    }
  }, [callState, callRole, user, showLocalToast, isSecretChatActive]);

  const initiateWebRTCPeerConnection = async (isCaller: boolean) => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      showLocalToast("Kamera/Mikrofon tidak tersedia di koneksi tidak aman (HTTP).");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setLocalStream(stream);
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' },
          { urls: 'stun:stun3.l.google.com:19302' },
          { urls: 'stun:stun4.l.google.com:19302' },
          { urls: 'stun:stun.services.mozilla.com' }
        ]
      });
      peerConnectionRef.current = pc;

      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      pc.ontrack = (event) => {
        let rStream = event.streams[0];
        if (!rStream) {
          // Robust fallback in case event.streams is empty (common in some mobile browsers)
          rStream = new MediaStream();
          rStream.addTrack(event.track);
        }
        setRemoteStream(rStream);
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = rStream;
        }
      };

      pc.onicecandidate = async (event) => {
        if (event.candidate && activeCallIdRef.current) {
          const sig = {
            type: 'webrtc_candidate',
            callId: activeCallIdRef.current,
            candidate: event.candidate.toJSON()
          };
          await api.nayaxa.secretChat.send(JSON.stringify(sig));
        }
      };

      if (isCaller) {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        const sig = {
          type: 'webrtc_offer',
          callId: activeCallIdRef.current,
          sdp: offer.sdp
        };
        await api.nayaxa.secretChat.send(JSON.stringify(sig));
      }
    } catch (err) {
      console.error('Failed to initiate WebRTC:', err);
      showLocalToast("Gagal mengakses kamera/mikrofon.");
      cleanupCall();
    }
  };

  const handleWebRTCOffer = async (sdp: string) => {
    try {
      await initiateWebRTCPeerConnection(false);
      const pc = peerConnectionRef.current;
      if (!pc) return;

      await pc.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp }));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      const sig = {
        type: 'webrtc_answer',
        callId: activeCallIdRef.current,
        sdp: answer.sdp
      };
      await api.nayaxa.secretChat.send(JSON.stringify(sig));
    } catch (err) {
      console.error('Failed to handle WebRTC Offer:', err);
      cleanupCall();
    }
  };

  const cleanupCall = useCallback(() => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    setLocalStream(null);
    setRemoteStream(null);

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    setCallState('idle');
    setCallRole(null);
    setActiveCallId(null);
    activeCallIdRef.current = null;
  }, [localStream]);

  const startVideoCall = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      showLocalToast("Panggilan video tidak tersedia di koneksi tidak aman (HTTP). Gunakan HTTPS atau localhost.");
      return;
    }
    const cId = `call_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    activeCallIdRef.current = cId;
    setActiveCallId(cId);
    setCallRole('caller');
    setCallState('calling');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setLocalStream(stream);
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      const sig = {
        type: 'videocall_incoming',
        callId: cId,
        sender: user?.username
      };
      await api.nayaxa.secretChat.send(JSON.stringify(sig));
    } catch (err) {
      console.error('Failed to start Video Call:', err);
      showLocalToast("Izinkan kamera dan mikrofon untuk menelepon.");
      cleanupCall();
    }
  };

  const acceptVideoCall = async () => {
    setCallState('connected');
    const sig = {
      type: 'videocall_accepted',
      callId: activeCallIdRef.current
    };
    await api.nayaxa.secretChat.send(JSON.stringify(sig));
  };

  const declineVideoCall = async () => {
    const sig = {
      type: 'videocall_declined',
      callId: activeCallIdRef.current
    };
    await api.nayaxa.secretChat.send(JSON.stringify(sig));
    cleanupCall();
  };

  const endVideoCall = async () => {
    const sig = {
      type: 'videocall_ended',
      callId: activeCallIdRef.current
    };
    await api.nayaxa.secretChat.send(JSON.stringify(sig));
    cleanupCall();
  };

  const toggleMute = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  };


  // Clear secret chat handler
  const handleClearSecretChat = useCallback(async () => {
    // Set file-picker bypass flag to prevent the confirm dialog blur from triggering auto-lock
    isSelectingFileRef.current = true;
    const confirmed = window.confirm("Apakah Anda yakin ingin menghapus bersih seluruh percakapan rahasia? Tindakan ini tidak dapat dibatalkan.");
    isSelectingFileRef.current = false;

    if (confirmed) {
      // 1. Set the clearing flag lock and optimistically clear all local chat states instantly!
      isSecretClearingRef.current = true;
      setSecretMessages([]);
      setSecretFileCache({});
      setFetchingFileIds(new Set());

      try {
        const res = await api.nayaxa.secretChat.clear();
        if (res && res.success) {
          // Success is now completely silent as requested by the user
        } else {
          // If clearing failed on server, restore state by pulling history back
          const updated = await api.nayaxa.secretChat.getHistory();
          if (updated && updated.success) {
            setSecretMessages(updated.messages || []);
          }
          showLocalToast("Gagal menghapus pesan rahasia.");
        }
      } catch (err) {
        console.error(err);
        // On network error, restore state by pulling history back
        try {
          const updated = await api.nayaxa.secretChat.getHistory();
          if (updated && updated.success) {
            setSecretMessages(updated.messages || []);
          }
        } catch (restoreErr) {}
        showLocalToast("Terjadi kesalahan sistem saat menghapus.");
      } finally {
        // 2. Unlock the clearing flag so future polling can run normally
        isSecretClearingRef.current = false;
      }
    }
  }, [showLocalToast]);


  // Dynamic Polling hook for real-time Safe Room & WebRTC Signaling (Visibility-Aware Eco-Polling)
  useEffect(() => {
    let intervalId: any;
    
    // Define visibility change handler inside the effect to share fetchAndProcess reference
    let handleVisibilityChange: () => void;

    if (isOpen && isSecretChatActive && isSecretUser) {
      const fetchAndProcess = async () => {
        if (document.hidden) return; // Suspends polling/decryption when tab is in the background
        
        try {
          const res = await api.nayaxa.secretChat.getHistory();
          if (isSecretClearingRef.current) return; // Reject incoming polling results during active clearing
          if (res && res.success) {
            const rawMessages = res.messages || [];

            // 1. Process WebRTC signaling packets
            if (isFirstSecretLoadRef.current) {
              // On the very first load of Safe Room, mark all existing historical signaling packets as processed!
              rawMessages.forEach((msg: any) => {
                processedSignalingIdsRef.current.add(msg.id);
              });
              isFirstSecretLoadRef.current = false;
            } else {
              // On subsequent polls, process new signaling packets ONLY if they are extremely recent (< 60s)
              rawMessages.forEach((msg: any) => {
                const msgTime = msg.created_at ? new Date(msg.created_at).getTime() : 0;
                const ageInSeconds = (Date.now() - msgTime) / 1000;
                
                if (ageInSeconds < 60) {
                  handleSignaling(msg);
                } else {
                  processedSignalingIdsRef.current.add(msg.id); // mark old historical signals as processed
                }
              });
            }

            // 2. Filter out signaling packets from the chat history log
            const chatMessages = rawMessages.filter((msg: any) => {
              try {
                const signal = JSON.parse(msg.message);
                if (signal && signal.type && (signal.type.startsWith('webrtc_') || signal.type.startsWith('videocall_'))) {
                  return false; // Hide from chat bubbles list
                }
              } catch (e) {
                // Ignore json parse error for standard text
              }
              return true;
            });

            setSecretMessages(chatMessages);
          }
        } catch (e) {
          console.error(e);
        }
      };

      // Initial load
      fetchAndProcess();

      // Start polling (scales up to 1s during calls for sub-second handshake, 3s otherwise)
      const pollRate = callState !== 'idle' ? 1000 : 3000;
      intervalId = setInterval(fetchAndProcess, pollRate);

      // Instantly poll on tab reactivation
      handleVisibilityChange = () => {
        if (!document.hidden) {
          fetchAndProcess();
        }
      };
      document.addEventListener("visibilitychange", handleVisibilityChange);
    }
    
    return () => {
      if (intervalId) clearInterval(intervalId);
      if (handleVisibilityChange) {
        document.removeEventListener("visibilitychange", handleVisibilityChange);
      }
    };
  }, [isOpen, isSecretChatActive, isSecretUser, handleSignaling, callState]);

  // --- Secure Auto-Lock Safe Room on Screen Lock / Backgrounding ---
  // Strategy: fully CLOSE the widget (setIsOpen false) when screen locks.
  // This ensures the OS GPU snapshot captures only the blank dashboard + FAB button,
  // with zero chat content visible — the only approach that truly works in a web browser.
  useEffect(() => {
    const lockWidget = () => {
      if (isSelectingFileRef.current) return;
      if (isSecretChatActive) {
        // Instantly hide DOM element to bypass Framer Motion exit animation (which causes 0.5s delay)
        if (containerRef.current) {
          containerRef.current.style.display = 'none';
        }
        setIsSecretChatActive(false);
        setSecretInput('');
        setAttachedFile(null);
        setIsLockOverlayVisible(false);
        setIsOpen(false); // Close entire widget — OS snapshot will show blank dashboard
      }
    };

    const handleVisibilityLock = () => {
      if (document.hidden) {
        lockWidget();
      } else {
        // Reset file-picker bypass on tab resume
        setTimeout(() => { isSelectingFileRef.current = false; }, 500);
      }
    };

    const handleBlurLock = () => {
      // Fires before OS freezes the browser — closes widget so snapshot has no chat
      lockWidget();
    };

    document.addEventListener("visibilitychange", handleVisibilityLock);
    window.addEventListener("blur", handleBlurLock);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityLock);
      window.removeEventListener("blur", handleBlurLock);
    };
  }, [isSecretChatActive]);

  // Reset Safe Room first load flag when deactivated or closed
  useEffect(() => {
    if (!isSecretChatActive) {
      isFirstSecretLoadRef.current = true;
    }
  }, [isSecretChatActive]);

  const handleSecretScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const atBottom = scrollHeight - scrollTop - clientHeight < 50;
    isSecretAtBottomRef.current = atBottom;
    if (atBottom !== isSecretAtBottom) {
      setIsSecretAtBottom(atBottom);
    }
  }, [isSecretAtBottom]);

  // Auto scroll secret chat to bottom on new messages ONLY if user was already at the bottom
  useEffect(() => {
    if (isSecretChatActive && isSecretAtBottomRef.current && secretMessagesEndRef.current) {
      secretMessagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [secretMessages, isSecretChatActive]);

  // Timer for "Thought for X seconds"
  useEffect(() => {
    let interval: any;
    if (isTyping && startTime) {
      interval = setInterval(() => {
        setThinkTime(Math.round((Date.now() - startTime) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTyping, startTime]);

  // Responsive: Cap width and height by current viewport
  useEffect(() => {
    const handleResize = () => {
      const maxW = window.innerWidth - 32;
      const maxH = window.innerHeight - 80;
      if (width > maxW) setWidth(Math.max(300, maxW));
      if (height > maxH) setHeight(Math.max(400, maxH));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [width, height]);



  const handlePreview = useCallback((url: string, name: string, readOnly: boolean = false) => {
    setPreviewFile({ url, name, readOnly });
  }, []);

  const sessionIdRef = useRef<string | null>(null);
  useEffect(() => { sessionIdRef.current = sessionId; }, [sessionId]);

  const fetchInsights = async () => {
    setLoadingInsights(true);
    try {
      const res = await api.nayaxa.getDashboardInsights({ instansi_id: user?.instansi_id, profil_id: user?.profil_pegawai_id });
      if (res.success) {
        setInsights(res.data.insights);
        setSummary(res.data.nayaxa_summary);
      }
    } catch (err) { console.error(err); }
    finally { setLoadingInsights(false); }
  };

  const fetchProactiveInsight = useCallback(async () => {
    if (!sessionId && messages.length <= 1) { // Only for new/empty sessions
      setIsAwakening(true);
      try {
        const res = await api.nayaxa.getProactiveInsight({ 
          current_page: window.location.search || 'dashboard',
          instansi_id: user?.instansi_id 
        });
        
        if (res.success && res.insight) {
          setMessages([
            { 
              role: 'assistant', 
              text: `Halo **${user?.nama_lengkap || 'Sobat Nayaxa'}**, saya **Nayaxa**. ${res.insight}`,
              isProactive: true
            }
          ]);
        }
      } catch (err) { console.error('Proactive Error:', err); }
      finally { setIsAwakening(false); }
    }
  }, [sessionId, messages.length, user]);

  const fetchSessions = useCallback(async () => {
    if (!user?.id) return;
    try {
      const res = await api.nayaxa.getSessions(user.id);
      if (res.success) setSessions(res.sessions || []);
    } catch (err) { console.error(err); }
  }, [user]);

  const loadSession = useCallback(async (sid: string) => {
    try {
      setLoadingInsights(true);
      const res = await api.nayaxa.getHistoryBySession(sid);
      if (res.success) {
        setMessages(res.history.map((h: any) => ({ role: h.role, text: h.content, brainUsed: h.brain_used, created_at: h.created_at })));
        setSessionId(sid);
        setShowHistory(false);
        setTimeout(() => inputRef.current?.focus(), 100);
      }
    } catch (err) { console.error(err); }
    finally { setLoadingInsights(false); }
  }, []);

  const startNewChat = useCallback(() => {
    setMessages([{ 
      role: 'assistant', 
      text: `Halo **${user?.nama_lengkap || 'Sobat Nayaxa'}**, saya **Nayaxa**. Senang melihat Anda kembali. Ada yang ingin Anda diskusikan atau tanyakan?` 
    }]);
    setSessionId(null);
    setShowHistory(false);
    fetchProactiveInsight(); // Try to get proactive greeting for new chat
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [fetchProactiveInsight, user?.nama_lengkap]);

  const handleSend = useCallback(async (e?: React.FormEvent, overrideText?: string) => {
    if (e) e.preventDefault();
    // Use refs to read latest values without adding them as dependencies
    const text = overrideText ?? inputValRef.current;

    // Check if secret user typed secret room code
    if (isSecretUser && text.trim() === '112626') {
      setInputVal('');
      inputValRef.current = '';
      setIsSecretChatActive(true);
      return;
    }
    const currentFiles = selectedFilesRef.current;
    if ((!text.trim() && currentFiles.length === 0) || isTypingRef.current) return;

    const attachments = [...currentFiles];
    setInputVal('');
    inputValRef.current = '';
    setSelectedFiles([]);
    selectedFilesRef.current = [];
    if (fileInputRef.current) fileInputRef.current.value = '';
    // Combine file actions into instructions
    let fileInstructions = "";
    currentFiles.forEach(f => {
      if (f.action) {
        fileInstructions += `[FILE: ${f.name} -> ACTION: ${f.action}]\n`;
      }
    });

    const msg = fileInstructions ? `${fileInstructions}\n${text}` : text;
    
    setMessages(prev => [...prev, { role: 'user', text: text || (attachments.length > 0 ? "*(Mengirimkan lampiran)*" : ""), files: attachments.map(a => ({ name: a.name, url: a.base64, type: a.mimeType })) }]);
    
    // Force scroll to bottom after user sends message
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      isAtBottomRef.current = true;
      setIsAtBottom(true);
    }, 100);

    setIsTyping(true);
    setCurrentSteps([]);
    setThought('');
    setCurrentResponse('');
    setStartTime(Date.now());
    setThinkTime(0);
    setShowThought(true);

    const chatData = {
      message: msg,
      files: attachments,
      base_url: import.meta.env.VITE_NAYAXA_API_URL 
        ? import.meta.env.VITE_NAYAXA_API_URL.split('/api/')[0]
        : ((window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
          ? `http://${window.location.hostname}:6001`
          : `${window.location.protocol}//${window.location.hostname}:6001`),
      session_id: sessionIdRef.current,
      user_id: user?.id || 95,
      user_name: user?.nama_lengkap || 'Pengguna',
      profil_id: user?.profil_pegawai_id,
      instansi_id: user?.instansi_id
    };

    const stop = api.nayaxa.chatStream(chatData, (event, data) => {
      if (event === 'step') {
        currentStepsRef.current = [...currentStepsRef.current, data];
        setCurrentSteps(currentStepsRef.current);
      } else if (event === 'message') {
        setCurrentResponse(prev => prev + data.text);
      } else if (event === 'thought') {
        thoughtRef.current += data.text;
        setThought(thoughtRef.current);
      } else if (event === 'done') {
        const finalThinkTime = Math.round((Date.now() - (startTimeRef.current || Date.now())) / 1000);
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          text: data.text || '', 
          brainUsed: data.brain_used,
          steps: currentStepsRef.current,
          thought: thoughtRef.current,
          thinkTime: finalThinkTime
        }]);
        if (data.session_id) setSessionId(data.session_id);
        setIsTyping(false);
        isTypingRef.current = false;
        setCurrentSteps([]);
        currentStepsRef.current = [];
        setCurrentResponse('');
        setThought('');
        thoughtRef.current = '';
        setStartTime(null);
        startTimeRef.current = null;
        abortFuncRef.current = null;
        fetchSessions();
      } else if (event === 'error') {
        let errorMsg = data.message || '';
        if (errorMsg.includes('503') || errorMsg.includes('high demand') || errorMsg.includes('Service Unavailable') || errorMsg.includes('GoogleGenerativeAI')) {
          errorMsg = "Nayaxa sedang sibuk, silakan coba beberapa saat lagi.";
        }
        setMessages(prev => [...prev, { role: 'assistant', text: errorMsg.startsWith('Nayaxa') ? errorMsg : `Error: ${errorMsg}` }]);
        setIsTyping(false);
        isTypingRef.current = false;
        abortFuncRef.current = null;
      }
    });

    abortFuncRef.current = stop;

  }, [user, fetchSessions]);

  const handleStop = useCallback(() => {
    if (abortFuncRef.current) {
      abortFuncRef.current();
      abortFuncRef.current = null;
      setIsTyping(false);
      isTypingRef.current = false;
      
      // Memberitahu chat bahwa pesan dihentikan
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        text: "_Jawaban dihentikan oleh pengguna._",
      }]);
    }
  }, []);

  const handleDocumentFeedback = useCallback((feedback: string) => {
    if (!previewFile) return;
    
    // Hardened Tool Selection Logic
    const isPptx = previewFile.name?.toLowerCase().endsWith('.pptx');
    const toolInstruction = isPptx 
      ? "\nDOKUMEN INI ADALAH PRESENTASI (.pptx). ANDA WAJIB MENGGUNAKAN TOOL 'pembangkit_paparan_pptx' UNTUK MEMBERIKAN HASIL REVISI."
      : "\nDOKUMEN INI ADALAH TEKS (.docx/.pdf). ANDA WAJIB MENGGUNAKAN TOOL 'generate_document' UNTUK MEMBERIKAN HASIL REVISI.";

    const prompt = `[NAYAXA_EDITOR_FEEDBACK] 
Dokumen: ${previewFile.name}
Instruksi Perbaikan: ${feedback}
${toolInstruction}

Mohon perbaiki dokumen tersebut sesuai instruksi di atas dan berikan hasilnya dalam format yang sesuai.`;
    
    handleSend(undefined, prompt);
    setPreviewFile(null); 
    showLocalToast("Instruksi perbaikan sedang diproses oleh Nayaxa...");
  }, [previewFile, handleSend, showLocalToast]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    inputValRef.current = inputVal;
    if (inputRef.current) {
        inputRef.current.style.height = 'auto';
        inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 120)}px`;
    }
    // Mark user is actively typing to suppress scroll button flickering
    isUserTypingRef.current = inputVal.trim().length > 0;
  }, [inputVal]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const atBottom = scrollHeight - scrollTop - clientHeight < 50;
    
    // Update ref immediately (no re-render)
    isAtBottomRef.current = atBottom;
    
    // Don't update the UI button while user is actively typing (prevents flicker from textarea resize)
    if (isUserTypingRef.current) return;

    // Debounce the state update to avoid rapid button flickering during smooth scrolls
    if (scrollDebounceRef.current) clearTimeout(scrollDebounceRef.current);
    scrollDebounceRef.current = setTimeout(() => {
      if (atBottom !== isAtBottom) {
        setIsAtBottom(atBottom);
      }
    }, 150);
  }, [isAtBottom]);

  useEffect(() => {
    // Only auto-scroll when messages update or typing status changes, 
    // and ONLY if the Ref says we were already at the bottom.
    if (messagesEndRef.current && isAtBottomRef.current) {
      // Use 'auto' instead of 'smooth' for system to avoid scroll-event spam
      messagesEndRef.current.scrollIntoView({ behavior: 'auto' });
    }
  }, [messages, isTyping, currentResponse, thought, currentSteps]); 



  const handleEnableGPS = useCallback(() => {
    if (!navigator.geolocation) return alert('Browser tidak mendukung geolokasi');
    navigator.geolocation.getCurrentPosition((pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setIsLocationEnabled(true);
        handleSend(undefined, `[SISTEM: GPS DIAKTIFKAN] Koordinat: LAT ${pos.coords.latitude}, LNG ${pos.coords.longitude}`);
        showLocalToast("Lokasi berhasil dibagikan ke Nayaxa (Aktif 5 menit)");
    }, (err) => {
        console.error("GPS Error:", err);
        showLocalToast("Gagal mengakses lokasi. Pastikan izin GPS aktif.");
    });
  }, [handleSend, showLocalToast]);

  // GPS Timeout (5 Minutes)
  useEffect(() => {
    let timer: any;
    if (isLocationEnabled) {
      timer = setTimeout(() => {
        setIsLocationEnabled(false);
        setCoords(null);
        showLocalToast("Akses lokasi (GPS) telah berakhir otomatis.");
      }, 300000); // 5 minutes
    }
    return () => clearTimeout(timer);
  }, [isLocationEnabled, showLocalToast]);

  const handleFiles = useCallback((files: File[]) => {
    const promises = files.map(file => new Promise<any>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve({ base64: reader.result, mimeType: file.type, name: file.name, action: 'Analisis' });
      reader.readAsDataURL(file);
    }));
    Promise.all(promises).then(res => {
        selectedFilesRef.current = [...selectedFilesRef.current, ...res];
        setSelectedFiles([...selectedFilesRef.current]);
        if (fileInputRef.current) fileInputRef.current.value = '';
    });
  }, []);

  useEffect(() => {
    if (isOpen && !isMinimized && inputRef.current) {
        inputRef.current.focus();
    }
  }, [isOpen, isMinimized]);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    const files: File[] = [];
    for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
            const blob = items[i].getAsFile();
            if (blob) files.push(blob);
        }
    }

    if (files.length > 0) handleFiles(files);
  }, [handleFiles]);

  const removeFile = useCallback((index: number) => {
    selectedFilesRef.current = selectedFilesRef.current.filter((_, i) => i !== index);
    setSelectedFiles([...selectedFilesRef.current]);
  }, []);

  useEffect(() => {
    if (isOpen) { 
      fetchInsights(); 
      fetchSessions();
      if (!sessionId) fetchProactiveInsight(); 
    }
  }, [isOpen, fetchSessions, fetchProactiveInsight, sessionId]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!resizingDir) return;
      if (resizingDir === 'w') {
        const newWidth = Math.max(320, window.innerWidth - e.clientX - 24);
        setWidth(newWidth);
        localStorage.setItem('nayaxa_width', String(newWidth));
      } else if (resizingDir === 'n') {
        const newHeight = Math.max(400, window.innerHeight - e.clientY - 24);
        setHeight(newHeight);
        localStorage.setItem('nayaxa_height', String(newHeight));
      }
    };
    const onUp = () => setResizingDir(null);
    if (resizingDir) { window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp); }
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [resizingDir]);

  useEffect(() => {
    const handleNayaxaAction = (e: any) => {
      const { type } = e.detail || {};
      if (type === 'collapse') {
        setIsMinimized(true);
      } else if (type === 'reset') {
        setWidth(400);
        setHeight(580);
        setIsMinimized(false);
        setIsOpen(false);
        localStorage.removeItem('nayaxa_width');
        localStorage.removeItem('nayaxa_height');
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      // Don't minimize if user is clicking on a preview/modal or other important UI
      if (containerRef.current && !containerRef.current.contains(e.target as Node) && isOpen && !isMinimized && !previewFile) {
        setIsMinimized(true);
      }
    };

    const handleClickInside = (e: MouseEvent) => {
      const isSelecting = window.getSelection()?.toString();
      // Don't auto-focus input if we are clicking on a dropdown (SELECT) or interactive button
      const target = e.target as HTMLElement;
      const isInteractive = target.tagName === 'SELECT' || target.tagName === 'OPTION' || target.closest('button');

      if (containerRef.current?.contains(e.target as Node) && !isSelecting && target !== inputRef.current && !isInteractive) {
         setTimeout(() => {
           if (isOpen && !isMinimized && inputRef.current) {
             inputRef.current.focus();
           }
         }, 50);
      }
    };

    window.addEventListener('nayaxa-action', handleNayaxaAction as any);
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('mouseup', handleClickInside);
    
    return () => {
      window.removeEventListener('nayaxa-action', handleNayaxaAction as any);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('mouseup', handleClickInside);
    };
  }, [isOpen, isMinimized, previewFile]);

  if (!isBapperida) return null;

  return (
    <>
      <AnimatePresence>
        {!isOpen && (
          <motion.button 
            initial={{ scale: 0 }} 
            animate={{ scale: 1 }} 
            exit={{ scale: 0 }} 
            onClick={() => setIsOpen(true)} 
            className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[2500] w-14 h-14 sm:w-16 sm:h-16 bg-indigo-600 rounded-full shadow-2xl flex items-center justify-center text-white text-[16px] transition-all hover:scale-105 active:scale-95"
          >
            <Bot size={28} className="sm:w-8 sm:h-8" />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            ref={containerRef}
            initial={{ y: 100, opacity: 0 }} 
            animate={{ y: 0, opacity: 1 }} 
            exit={{ y: 100, opacity: 0 }} 
            className="fixed z-[2500] bg-white border border-slate-200 shadow-2xl rounded-t-3xl sm:rounded-2xl overflow-hidden flex flex-col transition-all duration-300" 
            style={{ 
              right: window.innerWidth < 640 ? '0' : '24px',
              bottom: window.innerWidth < 640 ? '0' : '24px',
              left: window.innerWidth < 640 ? '0' : 'auto',
              width: window.innerWidth < 640 ? '100vw' : `${width}px`, 
              height: isMinimized 
                ? (window.innerWidth < 640 ? '60px' : '64px') 
                : (window.innerWidth < 640 ? `${viewportHeight}px` : `${height}px`),
              transition: resizingDir ? 'none' : 'height 0.1s ease, width 0.3s ease, bottom 0.1s ease, right 0.3s ease',
              overscrollBehavior: 'contain'
            }}
          >
            {/* Resizing handles - Hidden on Mobile */}
            <div className="hidden sm:block absolute left-0 top-0 w-1.5 h-full cursor-w-resize z-[100]" onMouseDown={() => setResizingDir('w')} />
            <div className="hidden sm:block absolute left-0 top-0 w-full h-1.5 cursor-n-resize z-[100]" onMouseDown={() => setResizingDir('n')} />

            {/* Safe Room Privacy Overlay — covers widget synchronously before OS takes screen snapshot */}
            {isLockOverlayVisible && (
              <div
                style={{
                  position: 'absolute', inset: 0, zIndex: 9999,
                  backgroundColor: 'white',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}
              />
            )}
            
            <div className="bg-indigo-600 p-4 transition-all flex items-center justify-between text-white cursor-pointer" onClick={() => setIsMinimized(!isMinimized)}>
              <div className="flex items-center gap-3">
                <Bot size={20} /> 
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-bold text-sm">Nayaxa Assistant</h3>
                    {(sessionId || isTyping) && (
                      <div 
                        title={`Diproses oleh: ${thinkingBrain || lastBrainUsed || 'DeepSeek'}`}
                        className={`w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-bold border-2 border-white/30 shadow-sm transition-all hover:scale-110 ${
                        (thinkingBrain || lastBrainUsed || 'DeepSeek')?.toLowerCase().includes('deepseek') ? 'bg-teal-400 text-teal-900' : 'bg-indigo-400 text-indigo-900'
                      }`}>
                        {(thinkingBrain || lastBrainUsed || 'DeepSeek')?.toLowerCase().includes('deepseek') ? 'D' : 'G'}
                      </div>
                    )}
                  </div>
                  <span className="text-[9px] text-white/70">Asisten AI Cerdas Anda</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isLocationEnabled && (
                  <motion.div 
                    initial={{ scale: 0 }} animate={{ scale: 1 }}
                    className="flex items-center gap-1 px-2 py-0.5 bg-green-500/20 border border-green-400/30 rounded-full text-[9px] font-bold text-green-300 mr-2 shadow-sm"
                  >
                    <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                    GPS AKTIF
                  </motion.div>
                )}
                <button onClick={(e) => { e.stopPropagation(); setShowHistory(!showHistory); }} className="p-1 hover:bg-white/20 rounded" title="Riwayat Chat"><FileText size={18}/></button>
                <button onClick={(e) => { e.stopPropagation(); startNewChat(); }} className="p-1 hover:bg-white/20 rounded" title="Chat Baru"><Plus size={18}/></button>
                <X className="w-5 h-5 ml-2" onClick={(e) => { e.stopPropagation(); setIsOpen(false); setIsSecretChatActive(false); }} />
              </div>
            </div>

            {!isMinimized && (
              isSecretChatActive ? (
                <div className="flex-1 flex flex-col overflow-hidden bg-white text-slate-800 relative">
                  {/* Secret Header bar - Solid Indigo with white text, matches standard Nayaxa header */}
                  <div className="p-3 bg-indigo-600 flex items-center justify-between z-10 shrink-0 select-none shadow-sm">
                    <div className="flex items-center gap-2 text-white">
                      <div className="relative flex items-center justify-center">
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-ping absolute" />
                        <div className="w-2 h-2 bg-green-400 rounded-full" />
                      </div>
                      <div className="flex flex-col text-left">
                        <span className="text-[10px] font-black tracking-widest uppercase">Safe Room Active</span>
                        <span className="text-[9px] text-white/70 font-medium">Auto-destruct after 3 hours</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1.5">
                      {/* WebRTC Video Call Trigger Icon Button */}
                      <button 
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          startVideoCall();
                        }}
                        className="p-2 bg-indigo-500 hover:bg-indigo-400 active:bg-indigo-700 border border-indigo-400/50 text-white rounded-xl transition-all hover:scale-110 active:scale-90 flex items-center justify-center shadow-sm"
                        title="Mulai Panggilan Video P2P Aman"
                      >
                        <Video size={16} />
                      </button>

                      {/* Clear secret chat icon button */}
                      <button 
                        type="button"
                        onClick={handleClearSecretChat}
                        className="p-2 bg-red-500/20 hover:bg-red-500/40 active:bg-red-500/60 border border-red-500/40 text-red-200 rounded-xl transition-all hover:scale-110 active:scale-90 flex items-center justify-center"
                        title="Hapus bersih seluruh percakapan rahasia"
                      >
                        <Trash2 size={16} />
                      </button>

                      {/* Exit safe room icon button */}
                      <button 
                        type="button"
                        onClick={() => setIsSecretChatActive(false)}
                        className="p-2 bg-white/10 hover:bg-white/20 active:bg-white/30 border border-white/20 text-white rounded-xl transition-all hover:scale-110 active:scale-90 flex items-center justify-center"
                        title="Keluar dari Safe Room"
                      >
                        <LogOut size={16} />
                      </button>
                    </div>
                  </div>

                  {/* WebRTC Video Call Fullscreen Overlay */}
                  <AnimatePresence>
                    {callState !== 'idle' && (
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 z-50 bg-slate-950 flex flex-col items-center justify-center text-white p-4 select-none rounded-2xl"
                      >
                        {/* Outgoing Call State */}
                        {callState === 'calling' && (
                          <div className="flex flex-col items-center gap-6">
                            <div className="relative">
                              <div className="w-20 h-20 rounded-full bg-indigo-600/20 border-2 border-indigo-500 flex items-center justify-center animate-pulse">
                                <Video size={30} className="text-indigo-400" />
                              </div>
                              <span className="absolute top-0 right-0 flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                              </span>
                            </div>
                            <div className="text-center">
                              <h3 className="font-bold text-sm uppercase tracking-widest text-indigo-200">Memanggil...</h3>
                              <p className="text-[10px] text-slate-400 mt-1">Menunggu respon lawan bicara</p>
                            </div>
                            <button 
                              onClick={endVideoCall}
                              className="p-3.5 bg-red-600 text-white rounded-full hover:bg-red-700 hover:scale-105 active:scale-95 transition-all shadow-lg"
                            >
                              <X size={18} />
                            </button>
                          </div>
                        )}

                        {/* Incoming Call Ringing State */}
                        {callState === 'ringing' && (
                          <div className="flex flex-col items-center gap-6">
                            <div className="w-20 h-20 rounded-full bg-green-600/20 border-2 border-green-500 flex items-center justify-center animate-bounce">
                              <Phone size={30} className="text-green-400" />
                            </div>
                            <div className="text-center px-4">
                              <h3 className="font-bold text-sm uppercase tracking-widest text-green-300">Panggilan Video Masuk</h3>
                              <p className="text-[10px] text-slate-400 mt-1">Lawan bicara mengundang Anda ke obrolan video rahasia</p>
                            </div>
                            <div className="flex items-center gap-3 mt-2">
                              <button 
                                onClick={acceptVideoCall}
                                className="px-5 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 font-bold text-[10px] uppercase tracking-wider transition-all hover:scale-105 active:scale-95 shadow-md"
                              >
                                Terima
                              </button>
                              <button 
                                onClick={declineVideoCall}
                                className="px-5 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 font-bold text-[10px] uppercase tracking-wider transition-all hover:scale-105 active:scale-95 shadow-md"
                              >
                                Tolak
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Connected Video Call Screen */}
                        {callState === 'connected' && (
                          <div className="relative w-full h-full flex flex-col justify-between overflow-hidden rounded-2xl bg-black">
                            {/* Remote Stream Video Element */}
                            <video 
                              ref={remoteVideoRef} 
                              autoPlay 
                              playsInline 
                              className="absolute inset-0 w-full h-full object-cover rounded-2xl"
                            />
                            {!remoteStream && (
                              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 gap-3 text-slate-400 z-10">
                                <RefreshCw className="animate-spin text-indigo-500" size={20} />
                                <span className="text-[10px] font-semibold uppercase tracking-wider">Menyambungkan P2P...</span>
                              </div>
                            )}

                            {/* Local Stream Video Element (Mini Picture-in-Picture) */}
                            <div className="absolute top-3 right-3 w-20 h-28 bg-slate-800 rounded-lg border border-white/20 overflow-hidden shadow-2xl z-20">
                              <video 
                                ref={localVideoRef} 
                                autoPlay 
                                playsInline 
                                muted 
                                className="w-full h-full object-cover"
                              />
                            </div>

                            {/* Controls layer */}
                            <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center gap-3 z-30">
                              <button 
                                onClick={toggleMute}
                                className={`p-2.5 rounded-full border transition-all hover:scale-105 active:scale-95 ${
                                  isMuted 
                                    ? 'bg-red-600 border-red-500 text-white' 
                                    : 'bg-white/10 hover:bg-white/20 border-white/20 text-white'
                                }`}
                              >
                                {isMuted ? <MicOff size={14} /> : <Mic size={14} />}
                              </button>

                              <button 
                                onClick={endVideoCall}
                                className="p-2.5 bg-red-600 text-white rounded-full border border-red-500 hover:bg-red-700 hover:scale-105 active:scale-95 transition-all"
                              >
                                <Phone size={14} className="rotate-[135deg]" />
                              </button>

                              <button 
                                onClick={toggleVideo}
                                className={`p-2.5 rounded-full border transition-all hover:scale-105 active:scale-95 ${
                                  isVideoOff 
                                    ? 'bg-red-600 border-red-500 text-white' 
                                    : 'bg-white/10 hover:bg-white/20 border-white/20 text-white'
                                }`}
                              >
                                {isVideoOff ? <VideoOff size={14} /> : <Video size={14} />}
                              </button>
                            </div>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Native Camera Viewfinder Modal */}
                  <AnimatePresence>
                    {isCameraModalOpen && (
                      <div className="absolute inset-0 z-50 bg-slate-950 flex flex-col justify-between p-4 select-none rounded-2xl">
                        <div className="flex items-center justify-between text-white shrink-0">
                          <span className="text-[9px] font-black tracking-widest uppercase text-indigo-400">Kamera Safe Room</span>
                          <button onClick={() => setIsCameraModalOpen(false)} className="p-1 hover:bg-white/10 rounded-full text-slate-300">
                            <X size={14} />
                          </button>
                        </div>

                        <div className="flex-1 my-3 rounded-xl bg-black border border-white/10 overflow-hidden relative flex items-center justify-center">
                          <video ref={cameraVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
                          {!cameraStream && (
                            <div className="absolute inset-0 flex items-center justify-center text-[10px] text-slate-400 gap-2">
                              <RefreshCw className="animate-spin" size={12} /> Memulai kamera...
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-around shrink-0 pb-1">
                          <button onClick={flipCamera} className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all">
                            <RefreshCw size={14} />
                          </button>
                          <button onClick={capturePhoto} disabled={!cameraStream} className="w-12 h-12 bg-white hover:bg-slate-100 rounded-full border-4 border-indigo-600/30 transition-all active:scale-95" />
                          <div className="w-10 h-10" />
                        </div>
                      </div>
                    )}
                  </AnimatePresence>

                  {/* Fullscreen Image Lightbox Viewport */}
                  <AnimatePresence>
                    {fullscreenImage && (
                      <div className="absolute inset-0 z-50 bg-black/95 flex items-center justify-center p-4 cursor-zoom-out rounded-2xl" onClick={() => setFullscreenImage(null)}>
                        <button className="absolute top-4 right-4 p-1.5 bg-white/10 hover:bg-white/20 text-white rounded-full">
                          <X size={14} />
                        </button>
                        <img src={fullscreenImage} className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl animate-fade-in" alt="Lightbox" />
                      </div>
                    )}
                  </AnimatePresence>

                  {/* Messages container - bg-slate-50/50 matches standard */}
                  <div 
                    onScroll={handleSecretScroll}
                    className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50/50 custom-scrollbar relative z-10 w-full overflow-x-hidden"
                    style={{ overscrollBehavior: 'contain' }}
                    onTouchStart={handleTouchStartScroll}
                    onTouchMove={handleTouchMoveScroll}
                    onTouchEnd={handleTouchEndScroll}
                  >
                    {pullOffset > 0 && (
                      <div 
                        className="flex flex-col items-center justify-center overflow-hidden transition-all duration-75 text-indigo-600 bg-white/40 rounded-xl py-2 mb-2 border border-indigo-100/30 shrink-0"
                        style={{ height: `${pullOffset}px`, opacity: Math.min(1, pullOffset / 55) }}
                      >
                        <RefreshCw 
                          size={16} 
                          className={`text-indigo-500 transition-all ${pullOffset >= 55 ? "animate-spin text-indigo-600" : ""}`}
                          style={{ transform: `rotate(${pullOffset * 5}deg)` }}
                        />
                        <span className="text-[9px] font-bold tracking-wider uppercase mt-1 text-indigo-500/80">
                          {pullOffset >= 55 ? "Lepas untuk Menutup" : "Tarik untuk Menutup"}
                        </span>
                      </div>
                    )}

                    {secretMessages.length === 0 ? (
                      // Empty state
                      null
                    ) : (
                      secretMessages.map((msg, sidx) => {
                        const isMe = msg.sender?.toLowerCase() === user?.username?.toLowerCase();
                        const timeStr = msg.created_at ? new Date(msg.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '';
                        
                        // Alias usernames for display
                        const senderLower = msg.sender?.toLowerCase() || '';
                        const displayName = senderLower === 'sammyl' ? 'yaxa' : (senderLower === 'levina' ? 'naya' : msg.sender);
                        
                        // Parse JSON attachment payloads safely
                        let parsedPayload: any = null;
                        let hasFile = false;
                        let displayMessage = msg.message;

                        try {
                          if (msg.message && msg.message.trim().startsWith('{')) {
                            const parsed = JSON.parse(msg.message);
                            if (parsed && (parsed.text !== undefined || parsed.file !== undefined)) {
                              parsedPayload = parsed;
                              displayMessage = parsed.text || '';
                              hasFile = !!parsed.file;
                            }
                          }
                        } catch (e) {
                          // Standard string message, ignore
                        }

                        return (
                          <motion.div 
                            key={msg.id || sidx} 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.15, ease: 'easeOut' }}
                            className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} relative group w-full mb-3.5`}
                            onTouchStart={(e) => handleTouchStart(e, msg.id)}
                            onTouchMove={handleTouchMove}
                            onTouchEnd={() => handleTouchEnd(msg)}
                          >
                            {/* Sender label */}
                            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-0.5 px-1.5 select-none">
                              {displayName}
                            </span>

                            {/* Bubble & Hover Actions Row */}
                            <div 
                              className={`flex items-center gap-2 max-w-[85%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
                              style={{ 
                                transform: swipingMessageId === msg.id ? `translateX(${Math.min(80, Math.max(0, swipeOffset))}px)` : 'none', 
                                transition: swipingMessageId === msg.id ? 'none' : 'transform 0.2s ease-out' 
                              }}
                            >
                              {/* Bubble */}
                              <div 
                                onDoubleClick={() => {
                                  setReplyTo(msg);
                                  setEditingMessage(null);
                                }}
                                className={`rounded-2xl p-3 text-xs leading-relaxed break-words shadow-sm relative text-left ${
                                  isMe 
                                    ? 'bg-indigo-600 text-white rounded-tr-sm' 
                                    : 'bg-white text-slate-800 border border-slate-100 rounded-tl-sm'
                                }`}
                              >
                                {/* Quoted / Replied message box inside bubble if active */}
                                {msg.reply_to && (
                                  <div className={`mb-1.5 p-2 rounded-lg border-l-4 text-[10px] select-none text-left flex flex-col gap-0.5 ${
                                    isMe 
                                      ? 'bg-black/10 border-indigo-300 text-indigo-100' 
                                      : 'bg-slate-100/80 border-indigo-500 text-slate-600'
                                  }`}>
                                    <span className="font-bold uppercase tracking-wider text-[9px]">
                                      {msg.reply_to.sender?.toLowerCase() === 'sammyl' ? 'yaxa' : (msg.reply_to.sender?.toLowerCase() === 'levina' ? 'naya' : msg.reply_to.sender)}
                                    </span>
                                    <span className="truncate max-w-[180px]">
                                      {(() => {
                                        try {
                                          if (msg.reply_to.message?.startsWith('{')) {
                                            const p = JSON.parse(msg.reply_to.message);
                                            return p.file ? `📎 [File] ${p.file.name}` : p.text;
                                          }
                                        } catch (e) {}
                                        return msg.reply_to.message;
                                      })()}
                                    </span>
                                  </div>
                                )}

                                {/* Attachment Rendering */}
                                {hasFile && parsedPayload.file && (() => {
                                  const cachedData = secretFileCache[msg.id];
                                  const isFetching = fetchingFileIds.has(msg.id);

                                  if (!cachedData && !isFetching) {
                                    fetchSecretFileOnDemand(msg.id);
                                  }

                                  if (isFetching || !cachedData) {
                                    return (
                                      <div className={`mb-1.5 w-[160px] h-[75px] rounded-lg flex flex-col items-center justify-center gap-1.5 border text-[10px] animate-pulse ${
                                        isMe ? 'bg-black/10 border-indigo-500/30' : 'bg-slate-50 border-slate-100'
                                      }`}>
                                        <div className="w-4 h-4 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
                                        <span className="text-[8px] opacity-70">Mengunduh...</span>
                                      </div>
                                    );
                                  }

                                  return parsedPayload.file.type.startsWith('image/') ? (
                                    <div 
                                      className="mb-1.5 max-w-full overflow-hidden rounded-lg border border-slate-200/20 cursor-zoom-in" 
                                      onClick={() => setFullscreenImage(cachedData)}
                                    >
                                      <img src={cachedData} className="w-full max-h-[160px] object-cover hover:opacity-90 transition-opacity" alt="Attachment" />
                                    </div>
                                  ) : (
                                    <a 
                                      href={cachedData} 
                                      download={parsedPayload.file.name}
                                      className={`mb-1.5 p-2 rounded-lg flex items-center justify-between gap-2 border text-[10px] transition-all hover:scale-102 ${
                                        isMe 
                                          ? 'bg-black/10 border-indigo-500 text-white' 
                                          : 'bg-slate-50 border-slate-100 text-slate-700'
                                      }`}
                                    >
                                      <div className="flex items-center gap-1.5 overflow-hidden text-left">
                                        <div className={`w-6 h-6 rounded flex items-center justify-center shrink-0 ${isMe ? 'bg-white/10 text-white' : 'bg-indigo-100 text-indigo-600'}`}>
                                          <File size={12} />
                                        </div>
                                        <div className="flex flex-col overflow-hidden">
                                          <span className="font-bold truncate max-w-[120px]">{parsedPayload.file.name}</span>
                                          <span className="text-[8px] opacity-70">{parsedPayload.file.size}</span>
                                        </div>
                                      </div>
                                    </a>
                                  );
                                })()}

                                {/* Message text content */}
                                {displayMessage && <div className="whitespace-pre-wrap">{displayMessage}</div>}
                              </div>

                              {/* WhatsApp-style Hover Action Buttons - Desktop */}
                              <div className={`hidden sm:flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200 shrink-0 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                                {/* Reply button */}
                                <button 
                                  onClick={() => {
                                    setReplyTo(msg);
                                    setEditingMessage(null);
                                  }}
                                  className="w-6 h-6 rounded-full bg-slate-100 hover:bg-indigo-50 text-slate-500 hover:text-indigo-600 flex items-center justify-center border border-slate-200/50 shadow-sm transition-all hover:scale-105 active:scale-95"
                                  title="Balas pesan"
                                >
                                  <CornerUpLeft size={11} />
                                </button>

                                {/* Edit button - Only if sender is Me and message is unread */}
                                {isMe && !msg.is_read && (
                                  <button 
                                    onClick={() => {
                                      setEditingMessage(msg);
                                      setReplyTo(null);
                                      // Extract textual message for loading in input
                                      setSecretInput(displayMessage);
                                    }}
                                    className="w-6 h-6 rounded-full bg-slate-100 hover:bg-indigo-50 text-slate-500 hover:text-indigo-600 flex items-center justify-center border border-slate-200/50 shadow-sm transition-all hover:scale-105 active:scale-95"
                                    title="Edit pesan"
                                  >
                                    <Pencil size={11} />
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Footer: Time & Read status ticks */}
                            <div className={`flex items-center gap-1.5 mt-0.5 px-1.5 select-none ${isMe ? 'justify-end' : 'justify-start'}`}>
                              <span className="text-[8px] text-slate-400">
                                {timeStr}
                              </span>
                              {isMe && (
                                <span className="text-[9px]" title={msg.is_read ? "Sudah dibaca" : "Belum dibaca"}>
                                  {msg.is_read ? (
                                    <span className="text-indigo-500 font-bold">✓✓</span>
                                  ) : (
                                    <span className="text-slate-300">✓</span>
                                  )}
                                </span>
                              )}
                            </div>
                          </motion.div>
                        );
                      })
                    )}
                    <div ref={secretMessagesEndRef} />
                  </div>

                  {/* Floating Scroll to Bottom button inside Safe Room */}
                  <AnimatePresence>
                    {!isSecretAtBottom && (
                      <motion.button 
                        type="button"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        onMouseDown={(e) => {
                          e.preventDefault(); // Prevents input focus loss
                          e.stopPropagation();
                          setIsSecretAtBottom(true);
                          isSecretAtBottomRef.current = true;
                          secretMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
                        }}
                        onTouchStart={(e) => {
                          e.preventDefault(); // Prevents mobile keyboard collapse
                          e.stopPropagation();
                          setIsSecretAtBottom(true);
                          isSecretAtBottomRef.current = true;
                          secretMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
                        }}
                        className="absolute bottom-20 right-4 z-[70] w-10 h-10 bg-white border border-slate-200 text-indigo-600 rounded-full shadow-lg flex items-center justify-center hover:bg-slate-50 transition-all active:scale-90"
                      >
                        <ChevronUp className="rotate-180" size={20} />
                      </motion.button>
                    )}
                  </AnimatePresence>

                  {/* Hidden File Input — MUST be OUTSIDE the form to avoid onChange suppression on mobile browsers */}
                  <input
                    type="file"
                    ref={secretFileInputRef}
                    onChange={handleFileChange}
                    accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip"
                    className="hidden"
                    style={{ display: 'none', position: 'absolute', opacity: 0, pointerEvents: 'none' }}
                  />

                  {/* Send Input Panel */}
                  <form 
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if ((!secretInput.trim() && !attachedFile) || secretSending) return;
                      
                      const textToSend = secretInput;
                      const fileToSend = attachedFile;
                      const replyRef = replyTo;

                      // Optimistically clear all inputs immediately to prevent any keyboard focus drops on mobile!
                      setSecretInput('');
                      setAttachedFile(null);
                      setReplyTo(null);
                      setSecretSending(true);

                      // Refocus the textarea instantly so the mobile virtual keyboard stays open!
                      setTimeout(() => {
                        secretInputRef.current?.focus();
                      }, 50);

                      try {
                        let res;
                        if (editingMessage) {
                          // Update / Edit Message text
                          res = await api.nayaxa.secretChat.edit(editingMessage.id, textToSend);
                          if (res && res.success) {
                            setEditingMessage(null);
                            const updated = await api.nayaxa.secretChat.getHistory();
                            if (updated && updated.success) {
                              setSecretMessages(updated.messages || []);
                            }
                          } else if (res && !res.success) {
                            // Restore original text so user doesn't lose what they edited
                            setSecretInput(textToSend);
                            showLocalToast(res.message || 'Gagal mengedit pesan.');
                          }
                        } else {
                          // If there's an attached file, package it as encrypted JSON string
                          const payloadMessage = fileToSend 
                            ? JSON.stringify({ text: textToSend, file: fileToSend })
                            : textToSend;

                          res = await api.nayaxa.secretChat.send(payloadMessage, replyRef ? replyRef.id : null);
                          if (res && res.success) {
                            if (res.insertId && fileToSend && fileToSend.data) {
                              // Pre-cache our own uploaded file instantly so we don't fetch it from server!
                              setSecretFileCache(prev => ({
                                ...prev,
                                [res.insertId]: fileToSend.data
                              }));
                            }
                            const updated = await api.nayaxa.secretChat.getHistory();
                            if (updated && updated.success) {
                              setSecretMessages(updated.messages || []);
                            }
                          } else if (res && !res.success) {
                            // Restore inputs if sending failed so they don't lose their data
                            setSecretInput(textToSend);
                            setAttachedFile(fileToSend);
                            setReplyTo(replyRef);
                            showLocalToast(res.message || 'Gagal mengirim pesan. Coba lagi.');
                          }
                        }
                      } catch (err) {
                        console.error('[Secret Chat Submit Error]', err);
                        // Restore inputs on network failure
                        setSecretInput(textToSend);
                        setAttachedFile(fileToSend);
                        setReplyTo(replyRef);
                        showLocalToast('Koneksi bermasalah. Pesan gagal terkirim.');
                      } finally {
                        setSecretSending(false);
                      }
                    }} 
                    className="p-3 bg-white border-t border-slate-100 shadow-[0_-4px_12px_rgba(0,0,0,0.03)] z-10 shrink-0"
                  >
                    {/* Hidden file input moved to outside the form — see above */}

                    {/* Reply To Preview Box */}
                    <AnimatePresence>
                      {replyTo && (
                        <motion.div 
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mb-2 p-2 bg-slate-50 border border-slate-200/80 rounded-xl border-l-4 border-l-indigo-600 flex items-start gap-2 justify-between"
                        >
                          <div className="flex flex-col text-left overflow-hidden">
                            <span className="text-[9px] font-bold uppercase tracking-wider text-indigo-600">
                              Membalas {replyTo.sender?.toLowerCase() === 'sammyl' ? 'yaxa' : (replyTo.sender?.toLowerCase() === 'levina' ? 'naya' : replyTo.sender)}
                            </span>
                            <span className="text-[11px] text-slate-500 truncate max-w-[280px]">
                              {(() => {
                                try {
                                  if (replyTo.message?.startsWith('{')) {
                                    const p = JSON.parse(replyTo.message);
                                    return p.file ? `📎 [File] ${p.file.name}` : p.text;
                                  }
                                } catch (e) {}
                                return replyTo.message;
                              })()}
                            </span>
                          </div>
                          <button 
                            type="button" 
                            onClick={() => setReplyTo(null)}
                            className="p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
                          >
                            <X size={12} />
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Editing Message Preview Box */}
                    <AnimatePresence>
                      {editingMessage && (
                        <motion.div 
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mb-2 p-2 bg-amber-50/50 border border-amber-200/80 rounded-xl border-l-4 border-l-amber-500 flex items-start gap-2 justify-between"
                        >
                          <div className="flex flex-col text-left overflow-hidden">
                            <span className="text-[9px] font-bold uppercase tracking-wider text-amber-600 flex items-center gap-1">
                              <Pencil size={8} /> Mengedit Pesan
                            </span>
                            <span className="text-[11px] text-slate-500 truncate max-w-[280px]">
                              {(() => {
                                try {
                                  if (editingMessage.message?.startsWith('{')) {
                                    const p = JSON.parse(editingMessage.message);
                                    return p.text || '';
                                  }
                                } catch (e) {}
                                return editingMessage.message;
                              })()}
                            </span>
                          </div>
                          <button 
                            type="button" 
                            onClick={() => {
                              setEditingMessage(null);
                              setSecretInput(''); // Clear input on cancel edit
                            }}
                            className="p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
                          >
                            <X size={12} />
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Attached File Preview Box */}
                    <AnimatePresence>
                      {attachedFile && (
                        <motion.div 
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mb-2 p-2 bg-indigo-50/40 border border-indigo-100 rounded-xl flex items-center justify-between gap-2"
                        >
                          <div className="flex items-center gap-2 overflow-hidden text-left">
                            {attachedFile.type.startsWith('image/') ? (
                              <img src={attachedFile.data} className="w-8 h-8 rounded-lg object-cover border border-slate-200" alt="Preview" />
                            ) : (
                              <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                                <File size={14} />
                              </div>
                            )}
                            <div className="flex flex-col text-xs overflow-hidden">
                              <span className="font-bold text-slate-700 truncate max-w-[180px]">{attachedFile.name}</span>
                              <span className="text-[10px] text-slate-400">{attachedFile.size}</span>
                            </div>
                          </div>
                          <button 
                            type="button" 
                            onClick={() => setAttachedFile(null)}
                            className="p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
                          >
                            <X size={12} />
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="relative flex items-center gap-1.5">
                      {/* Attachment Plus/Paperclip Trigger */}
                      <button 
                        type="button" 
                        onClick={(e) => {
                          e.stopPropagation();
                          isSelectingFileRef.current = true;
                          secretFileInputRef.current?.click();
                        }}
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-xl transition-all shrink-0"
                        title="Lampirkan File"
                        disabled={secretSending || !!editingMessage}
                      >
                        <Paperclip size={18} />
                      </button>

                      {/* Camera Capture Trigger */}
                      <button 
                        type="button" 
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsCameraModalOpen(true);
                          setEditingMessage(null);
                        }}
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-xl transition-all shrink-0 mr-1"
                        title="Ambil Foto Kamera"
                        disabled={secretSending || !!editingMessage}
                      >
                        <Camera size={18} />
                      </button>

                      <textarea 
                        ref={secretInputRef}
                        name="chat_secure_message"
                        id="chat_secure_message"
                        rows={1}
                        value={secretInput}
                        onChange={(e) => setSecretInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); e.currentTarget.form?.requestSubmit(); } }}
                        placeholder={editingMessage ? "Edit pesan rahasia..." : "Kirim pesan aman ke sini..."}
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 transition-all focus:ring-1 focus:ring-indigo-100 resize-none max-h-24 overflow-y-auto"
                        autoComplete="off"
                        autoCorrect="on"
                        autoCapitalize="sentences"
                        spellCheck="true"
                      />
                      <button 
                        type="submit"
                        onMouseDown={(e) => e.preventDefault()}
                        onTouchStart={(e) => e.preventDefault()}
                        disabled={(!secretInput.trim() && !attachedFile) || secretSending}
                        className="p-2 bg-indigo-600 text-indigo-100 rounded-xl hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-40 shrink-0"
                      >
                        <Send size={14} />
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                <div className="flex-1 flex flex-col overflow-hidden bg-white relative">
                <div 
                  className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50 scroll-smooth custom-scrollbar relative"
                  onScroll={handleScroll}
                  style={{ overscrollBehavior: 'contain' }}
                  onTouchStart={handleTouchStartScroll}
                  onTouchMove={handleTouchMoveScroll}
                  onTouchEnd={handleTouchEndScroll}
                  onDragOver={(e: any) => e.preventDefault()} 
                  onDragLeave={() => setIsDragging(false)} 
                  onDrop={(e: any) => { e.preventDefault(); handleFiles(Array.from(e.dataTransfer.files)); }}
                >
                  {pullOffset > 0 && (
                    <div 
                      className="flex flex-col items-center justify-center overflow-hidden transition-all duration-75 text-indigo-600 bg-white/40 rounded-xl py-2 mb-2 border border-indigo-100/30 shrink-0"
                      style={{ height: `${pullOffset}px`, opacity: Math.min(1, pullOffset / 55) }}
                    >
                      <RefreshCw 
                        size={16} 
                        className={`text-indigo-500 transition-all ${pullOffset >= 55 ? "animate-spin text-indigo-600" : ""}`}
                        style={{ transform: `rotate(${pullOffset * 5}deg)` }}
                      />
                      <span className="text-[9px] font-bold tracking-wider uppercase mt-1 text-indigo-500/80">
                        {pullOffset >= 55 ? "Lepas untuk Menutup" : "Tarik untuk Menutup"}
                      </span>
                    </div>
                  )}

                  <AnimatePresence>
                    {isDragging && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-[30] bg-indigo-600/10 border-2 border-dashed border-indigo-600 rounded-2xl m-2 flex flex-col items-center justify-center text-indigo-600 pointer-events-none">
                        <div className="bg-white p-6 rounded-3xl shadow-xl flex flex-col items-center gap-3">
                           <div className="bg-indigo-100 p-4 rounded-2xl"> <Plus size={32} className="animate-bounce" /> </div>
                           <span className="text-sm font-bold">Lepaskan file untuk dianalisis oleh Nayaxa</span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                                    {isAwakening && (
                      <div className="flex justify-start items-center gap-3 p-4 bg-indigo-50/50 border border-indigo-100 rounded-2xl animate-pulse">
                        <Sparkles size={16} className="text-indigo-600 animate-spin" />
                        <span className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider">Meninjau aktivitas terakhir Anda...</span>
                      </div>
                    )}

                    {messages.map((msg, idx) => (
                      <div key={idx} className="relative group">
                         {msg.isProactive && idx === 0 && (
                           <div className="flex items-center gap-1.5 mb-1 ml-1 text-[10px] font-bold text-indigo-600 uppercase tracking-widest">
                             <Sparkles size={12} /> Insight Proaktif
                           </div>
                         )}
                         {(() => {
                           try {
                             return (
                               <MessageItem 
                                 key={idx} 
                                 msg={msg} 
                                 idx={idx} 
                                 isLocationEnabled={isLocationEnabled} 
                                 handleEnableGPS={handleEnableGPS} 
                                 setMessages={setMessages} 
                                 onCopy={showLocalToast}
                                 handleSend={handleSend}
                                 onPreview={handlePreview}
                               />
                             );
                           } catch (err) {
                             console.error('Render Error in MessageItem:', err);
                             return <div key={`err-${idx}`} className="text-red-500 text-[10px] p-2 bg-red-50 rounded italic">Gagal menampilkan pesan ini.</div>;
                           }
                         })()}
                      </div>
                    ))}
                  {isTyping && (
                    <div className="flex flex-col items-start gap-4 mb-6">
                      <div className="max-w-[95%] p-5 bg-white border border-slate-100 rounded-2xl shadow-xl shadow-slate-200/20">
                          
                          {/* Collapsible Thought Section */}
                          <div className="mb-4">
                              <div 
                                  onClick={() => setShowThought(!showThought)}
                                  className="flex items-center gap-3 cursor-pointer text-[12px] font-bold text-indigo-600 hover:text-indigo-700 transition-colors mb-3"
                              >
                                  <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center">
                                    <motion.div animate={{ rotate: showThought ? 180 : 0 }}>
                                      <ChevronDown size={14} />
                                    </motion.div>
                                  </div>
                                  <div className="flex-1 flex items-center justify-between">
                                    <span>{thought ? 'Proses Berpikir Nayaxa' : 'Nayaxa sedang menganalisis...'}</span>
                                    <span className="text-[10px] font-mono text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">
                                      {thinkTime}s
                                    </span>
                                  </div>
                              </div>
                              
                              <AnimatePresence>
                                  {(showThought || (!thought && currentSteps.length > 0)) && (
                                      <motion.div 
                                          initial={{ height: 0, opacity: 0 }}
                                          animate={{ height: 'auto', opacity: 1 }}
                                          exit={{ height: 0, opacity: 0 }}
                                          className="overflow-hidden"
                                      >
                                          <div className="space-y-3 pl-4 border-l-2 border-indigo-100/50 mb-5 mt-2">
                                              {currentSteps.map((s, idx) => (
                                                  <motion.div 
                                                      initial={{ x: -10, opacity: 0 }}
                                                      animate={{ x: 0, opacity: 1 }}
                                                      key={idx} 
                                                      className="flex items-center gap-3 text-[11px] text-slate-500"
                                                  >
                                                      <span className="w-6 h-6 flex items-center justify-center bg-slate-50 rounded-lg shadow-sm text-[10px]">{s.icon}</span>
                                                      <span className="font-medium">{s.label}</span>
                                                  </motion.div>
                                              ))}
                                              
                                              {thought && (
                                                  <div className="flex gap-3">
                                                    <div className="w-1 bg-indigo-200 rounded-full" />
                                                    <div className="flex-1 text-[11px] leading-relaxed text-slate-500 font-medium italic whitespace-pre-wrap">
                                                      {thought}
                                                      <motion.span
                                                        animate={{ opacity: [0, 1, 0] }}
                                                        transition={{ duration: 0.8, repeat: Infinity }}
                                                        className="inline-block w-1 h-3 ml-1 bg-indigo-400"
                                                      />
                                                    </div>
                                                  </div>
                                              )}
                                              
                                              {!currentResponse && (
                                                <div className="flex items-center gap-2.5 text-[11px] text-indigo-400 font-bold bg-indigo-50/50 w-fit px-3 py-1.5 rounded-full border border-indigo-100/50">
                                                    <Zap size={12} className="animate-pulse" />
                                                    <span>SEDANG MERAMU JAWABAN TERBAIK...</span>
                                                </div>
                                              )}
                                          </div>
                                      </motion.div>
                                  )}
                              </AnimatePresence>
                          </div>

                          {currentResponse && (
                            <div className="mt-4 pt-4 border-t border-slate-50 prose prose-sm prose-indigo max-w-none text-slate-700 leading-relaxed text-[15px]">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                  {currentResponse + '█'}
                                </ReactMarkdown>
                            </div>
                          )}
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Scroll to bottom button if user scrolled up - Moved outside scroller for fixed positioning */}
                <AnimatePresence>
                  {!isAtBottom && (
                    <motion.button 
                      type="button"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      onMouseDown={(e) => {
                        e.preventDefault(); // Prevents input focus loss
                        setIsAtBottom(true);
                        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
                      }}
                      onTouchStart={(e) => {
                        e.preventDefault(); // Prevents mobile keyboard collapse
                        setIsAtBottom(true);
                        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className="absolute bottom-24 right-4 z-[70] w-10 h-10 bg-white border border-slate-200 text-indigo-600 rounded-full shadow-lg flex items-center justify-center hover:bg-slate-50 transition-all active:scale-90"
                    >
                      <ChevronUp className="rotate-180" size={20} />
                    </motion.button>
                  )}
                </AnimatePresence>

                {/* Custom Toast Notification */}
                <AnimatePresence>
                  {toastMsg && (
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 20 }}
                      className="absolute bottom-24 left-1/2 -translate-x-1/2 z-[100] px-4 py-2 bg-indigo-600 text-white rounded-full shadow-lg text-xs font-bold flex items-center gap-2"
                    >
                      <Check size={14} />
                      {toastMsg}
                    </motion.div>
                  )}
                </AnimatePresence>

                <AnimatePresence>
                  {showHistory && (
                    <motion.div initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} className="absolute inset-0 bg-white z-[60] flex flex-col shadow-xl">
                      <div className="p-4 border-b flex justify-between bg-slate-50"> <span className="font-bold text-base">Riwayat Chat</span> <X size={20} className="cursor-pointer text-slate-400 hover:text-slate-600" onClick={() => setShowHistory(false)}/> </div>
                      <div className="flex-1 overflow-y-auto p-2 space-y-1">
                        {sessions.map((s, i) => (
                          <div key={i} onClick={() => loadSession(s.session_id)} className="p-4 border-b border-slate-50 hover:bg-indigo-50 cursor-pointer rounded-xl text-[16px] truncate text-slate-700 transition-colors">
                            {s.title || 'Percakapan Lama'}
                          </div>
                        ))}
                      </div>
                      <div className="p-4"> <button onClick={startNewChat} className="w-full py-3 bg-indigo-600 text-white rounded-xl text-[16px] font-bold shadow-lg shadow-indigo-100 transition-all active:scale-95">Chat Baru</button> </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="p-4 bg-white border-t border-slate-100 shadow-[0_-4px_12px_rgba(0,0,0,0.03)]">
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    {selectedFiles.map((f, i) => (
                      <div key={i} className="group relative flex flex-col gap-1 bg-slate-100 hover:bg-indigo-50 p-2 px-3 rounded-2xl text-indigo-700 font-bold border border-slate-200 hover:border-indigo-200 transition-all shadow-sm">
                        <div className="flex items-center gap-2">
                          <span className="truncate max-w-[120px] text-[11px]">{f.name}</span>
                          <button 
                            type="button" 
                            onClick={() => removeFile(i)} 
                            className="hover:bg-indigo-200/50 rounded-full p-0.5 transition-colors"
                            title="Hapus file"
                          >
                            <X size={10} className="text-indigo-400 group-hover:text-indigo-600" />
                          </button>
                        </div>
                        <select 
                          value={f.action || 'Analisis'}
                          onMouseDown={(e) => e.stopPropagation()}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => {
                            const newAction = e.target.value;
                            selectedFilesRef.current = selectedFilesRef.current.map((file, idx) => idx === i ? { ...file, action: newAction } : file);
                            setSelectedFiles([...selectedFilesRef.current]);
                          }}
                          className="bg-transparent text-[9px] text-indigo-500 font-black outline-none border-t border-indigo-200/30 pt-1 mt-0.5 cursor-pointer hover:text-indigo-700"
                        >
                          <option value="Analisis">Analisis</option>
                          <option value="Jadikan Acuan Bahan">Jadikan Acuan Bahan</option>
                          <option value="Jadikan Acuan Format">Jadikan Acuan Format</option>
                          <option value="Buatkan Ringkasan">Buatkan Ringkasan</option>
                          <option value="Buatkan Ringkasan+Notulen">Ringkasan+Notulen</option>
                          <option value="Buatkan Ringkasan+Notulen+Word">Ringkasan+Notulen+Word</option>
                        </select>
                      </div>
                    ))}
                  </div>
                  <form onSubmit={handleSend} className="relative flex items-center gap-2">
                    <input type="file" ref={fileInputRef} className="hidden" onChange={(e: any) => handleFiles(Array.from(e.target.files))} multiple />
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all" title="Lampirkan File / Gambar"><Paperclip size={22} /></button>
                    <textarea 
                      ref={inputRef} 
                      rows={1} 
                      value={inputVal}  
                      onChange={(e) => setInputVal(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                      onPaste={handlePaste}
                      placeholder="Tanya Nayaxa (Bisa Paste Gambar)..." 
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl py-2.5 px-4 text-[16px] focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-100 resize-none max-h-32 overflow-y-auto transition-all"
                    />
                    {isTyping ? (
                      <button 
                        type="button" 
                        onClick={handleStop} 
                        className="p-2.5 bg-red-500 text-white rounded-xl hover:bg-red-600 shadow-lg shadow-red-100 transition-all active:scale-90"
                        title="Hentikan Jawaban"
                      >
                        <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 1.5 }}>
                          <div className="w-4 h-4 bg-white rounded-[2px]" />
                        </motion.div>
                      </button>
                    ) : (
                      <button 
                        type="submit" 
                        onMouseDown={(e) => e.preventDefault()}
                        onTouchStart={(e) => e.preventDefault()}
                        disabled={!inputVal.trim() && selectedFiles.length === 0} 
                        className="p-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 shadow-lg shadow-indigo-100 transition-all active:scale-90"
                      >
                        <Send size={20} />
                      </button>
                    )}
                  </form>
                </div>
              </div>
              )
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {previewFile && (
        <DocumentViewerModal 
          isOpen={true}
          onClose={() => setPreviewFile(null)}
          fileUrl={previewFile.url}
          fileName={previewFile.name}
          readOnly={previewFile.readOnly}
          onSendFeedback={handleDocumentFeedback}
        />
      )}
    </>
  );
}
