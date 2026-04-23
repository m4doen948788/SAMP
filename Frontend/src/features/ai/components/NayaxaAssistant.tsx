import React, { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '@/src/services/api';
import { Bot, X, Send, LineChart, AlertTriangle, Users, Award, ChevronUp, ChevronDown, FileText, Image, FileArchive, Plus, Trash2, Mic, MicOff, Pin, PinOff, Zap, Search, MoreVertical, Sparkles, Copy, Check, CheckCircle, Info, Paperclip } from 'lucide-react';
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
                const backendUrl = `http://${window.location.hostname}:6001`;

                // Case 1: Relative Path (e.g. /uploads/file.pdf)
                if (finalUrl.startsWith('/api/') || finalUrl.startsWith('/uploads/') || finalUrl.startsWith('/outputs/')) {
                    finalUrl = `${backendUrl}${finalUrl}`;
                }
                
                // Case 2: Absolute Path (check if it's an internal resource)
                else if (finalUrl.startsWith('http')) {
                    try {
                        const urlObj = new URL(finalUrl);
                        // If it points to internal API/Uploads but wrong host/port, align it
                        if (urlObj.pathname.includes('/api/') || urlObj.pathname.includes('/uploads/') || urlObj.pathname.includes('/outputs/')) {
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
                const isDownload = finalUrl.includes('/uploads/exports/') || finalUrl.includes('/export/') || finalUrl.includes('/outputs/');
                
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
                        // Smart Read-Only Detection (Generated/Exported files are NOT read-only)
                        const isExport = finalUrl.includes('/uploads/exports/') || finalUrl.includes('/outputs/') || finalUrl.includes('/export/');
                        onPreview(finalUrl, String(children), !isExport);
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
    <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
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
    </div>
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

  const showLocalToast = useCallback((msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  }, []);

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
    const currentFiles = selectedFilesRef.current;
    if ((!text.trim() && currentFiles.length === 0) || isTypingRef.current) return;

    const attachments = [...currentFiles];
    setInputVal('');
    inputValRef.current = '';
    setSelectedFiles([]);
    selectedFilesRef.current = [];
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
      base_url: `http://${window.location.hostname}:6001`,
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
              height: isMinimized ? (window.innerWidth < 640 ? '60px' : '64px') : (window.innerWidth < 640 ? 'calc(100vh - 40px)' : `${height}px`),
              transition: resizingDir ? 'none' : 'height 0.3s ease, width 0.3s ease, bottom 0.3s ease, right 0.3s ease'
            }}
          >
            {/* Resizing handles - Hidden on Mobile */}
            <div className="hidden sm:block absolute left-0 top-0 w-1.5 h-full cursor-w-resize z-[100]" onMouseDown={() => setResizingDir('w')} />
            <div className="hidden sm:block absolute left-0 top-0 w-full h-1.5 cursor-n-resize z-[100]" onMouseDown={() => setResizingDir('n')} />
            
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
                <X className="w-5 h-5 ml-2" onClick={(e) => { e.stopPropagation(); setIsOpen(false); }} />
              </div>
            </div>

            {!isMinimized && (
              <div className="flex-1 flex flex-col overflow-hidden bg-white relative">
                <div 
                  className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50 scroll-smooth custom-scrollbar relative"
                  onScroll={handleScroll}
                  onDragOver={(e: any) => e.preventDefault()} 
                  onDragLeave={() => setIsDragging(false)} 
                  onDrop={(e: any) => { e.preventDefault(); handleFiles(Array.from(e.dataTransfer.files)); }}
                >
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
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      onClick={() => {
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
                        disabled={!inputVal.trim() && selectedFiles.length === 0} 
                        className="p-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 shadow-lg shadow-indigo-100 transition-all active:scale-90"
                      >
                        <Send size={20} />
                      </button>
                    )}
                  </form>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {previewFile && (
        <DocumentViewerModal 
          isOpen={true}
          onClose={() => setPreviewFile(null)}
          fileUrl={
            previewFile.url
              ? previewFile.url.startsWith('http')
                ? previewFile.url
                : previewFile.url.startsWith('/uploads/')
                  ? `http://localhost:6001/uploads/dashboard/${previewFile.url.split('/uploads/')[1]}`
                  : `http://localhost:6001${previewFile.url}`
              : undefined
          }
          fileName={previewFile.name}
          readOnly={previewFile.readOnly}
          onSendFeedback={handleDocumentFeedback}
        />
      )}
    </>
  );
}
