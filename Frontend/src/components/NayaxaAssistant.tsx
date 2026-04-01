import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import { Bot, X, Send, LineChart, AlertTriangle, Users, Award, ChevronUp, FileText, Image, FileArchive, Plus, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import NayaxaChart from './NayaxaChart';

interface Alert {
  nama: string;
  bidang: string;
  days_inactive: number | string;
  last_activity: string | null;
}

export default function NayaxaAssistant() {
  const { user } = useAuth();

  // Restrict Nayaxa to Bapperida users (and Superadmin for safety)
  const isBapperida = user?.tipe_user_id === 1 || 
                      user?.instansi_nama?.toLowerCase().includes('badan perencanaan') || 
                      user?.instansi_singkatan?.toLowerCase() === 'bapperida';

  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  
  // Dashboard Insights State
  const [insights, setInsights] = useState<any>(null);
  const [summary, setSummary] = useState('');
  const [loadingInsights, setLoadingInsights] = useState(false);

  // Chat State
  const [messages, setMessages] = useState<{
    role: 'user' | 'assistant', 
    text: string, 
    files?: { name: string, url?: string | null, type: string }[],
    brainUsed?: string,
    created_at?: string
  }[]>([
    { role: 'assistant', text: `hi selamat datang ${user?.nama_lengkap || 'Sobat Nayaxa'}` }
  ]);
  const [inputVal, setInputVal] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<{ base64: string, mimeType: string, name: string }[]>([]);
  const selectedFilesRef = useRef<{ base64: string, mimeType: string, name: string }[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  
  // History & Sessions State
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [lastBrainUsed, setLastBrainUsed] = useState<string | null>(null);
  const [thinkingBrain, setThinkingBrain] = useState<string | null>(null);
  
  // Geolocation State
  const [isLocationEnabled, setIsLocationEnabled] = useState(false);
  const [coords, setCoords] = useState<{ lat: number, lng: number } | null>(null);



  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const fetchSessions = async () => {
    if (!user?.id) return;
    try {
      const res = await api.nayaxa.getSessions(user.id);
      if (res.success) {
        setSessions(res.sessions || []);
      }
    } catch (err) { console.error('Gagal memuat sesi:', err); }
  };

  const loadSession = async (sid: string) => {
    try {
      setLoadingInsights(true);
      const res = await api.nayaxa.getHistoryBySession(sid);
      if (res.success) {
        const historyData = res.history.map((h: any) => ({
          role: h.role,
          text: h.content,
          brainUsed: h.brain_used,
          created_at: h.created_at
        }));
        setMessages(historyData);
        // Set last brain from history if available
        const lastAssist = [...historyData].reverse().find(m => m.role === 'assistant' && m.brainUsed);
        if (lastAssist) setLastBrainUsed(lastAssist.brainUsed);
        
        setSessionId(sid);
        setShowHistory(false);
      }
    } catch (err) { console.error('Gagal memuat history:', err); }
    finally { setLoadingInsights(false); }
  };
  
  const handleDeleteSession = async (e: React.MouseEvent, sid: string) => {
    e.stopPropagation();
    if (!window.confirm('Hapus percakapan ini secara permanen?')) return;
    
    try {
      const res = await api.nayaxa.deleteSession(sid);
      if (res.success) {
        setSessions(prev => prev.filter(s => s.session_id !== sid));
        if (sessionId === sid) {
          startNewChat();
        }
      }
    } catch (err) { console.error('Gagal menghapus sesi:', err); }
  };

  const startNewChat = () => {
    setMessages([{ role: 'assistant', text: `hi selamat datang ${user?.nama_lengkap || 'Sobat Nayaxa'}` }]);
    setSessionId(null);
    setLastBrainUsed(null);
    setShowHistory(false);
  };

  const handleFiles = (files: File[]) => {
    if (!files || files.length === 0) return;
    const currentCount = selectedFilesRef.current.length;
    const remaining = 5 - currentCount;
    if (remaining <= 0) return alert('Maksimal 5 file sekaligus');
    const toProcess = files.slice(0, remaining);
    if (toProcess.length < files.length) alert('Hanya 5 file pertama yang akan diproses');

    const promises = toProcess.map(file => {
      return new Promise<{ base64: string, mimeType: string, name: string } | null>((resolve) => {
        if (file.size > 10 * 1024 * 1024) {
          alert(`${file.name} terlalu besar (max 10MB)`);
          return resolve(null);
        }
        const reader = new FileReader();
        reader.onloadend = () => resolve({
          base64: reader.result as string,
          mimeType: file.type,
          name: file.name
        });
        reader.readAsDataURL(file);
      });
    });

    Promise.all(promises).then(results => {
      const validResults = results.filter(r => r !== null) as { base64: string, mimeType: string, name: string }[];
      if (validResults.length > 0) {
        selectedFilesRef.current = [...selectedFilesRef.current, ...validResults];
        setSelectedFiles([...selectedFilesRef.current]);
      }
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) handleFiles(Array.from(files));
    e.target.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          handleFiles([file]);
        }
      }
    }
  };

  useEffect(() => {
    if (isOpen && !insights && !loadingInsights) {
      fetchInsights();
      fetchSessions();
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  useEffect(() => {
    // Auto-focus the input field when chat is open, maximized, and not waiting for AI
    if (isOpen && !isMinimized && !isTyping) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen, isMinimized, isTyping]);
  
  // Close chat when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (isOpen && panelRef.current && !panelRef.current.contains(event.target as Node)) {
        // Prevent close if we're clicking the file input or some other dynamic element
        const target = event.target as HTMLElement;
        if (target.tagName === 'INPUT' && target.getAttribute('type') === 'file') return;
        
        setIsOpen(false);
      }
    }
    
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // GPS Expiry Timer (5 Minutes)
  useEffect(() => {
    let timer: any;
    if (isLocationEnabled) {
      timer = setTimeout(() => {
        setIsLocationEnabled(false);
        setCoords(null);
        console.log('[GPS] Location access expired after 5 minutes.');
      }, 5 * 60 * 1000);
    }
    return () => clearTimeout(timer);
  }, [isLocationEnabled]);

  const handleEnableGPS = () => {
    if (!navigator.geolocation) {
      alert('Browser Anda tidak mendukung geolokasi.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setIsLocationEnabled(true);
        // Send a hidden message to AI with coordinates directly
        handleSend(undefined, `[SISTEM: GPS DIAKTIFKAN] Koordinat saya saat ini: LAT ${pos.coords.latitude}, LNG ${pos.coords.longitude}. Sila berikan rekomendasi terdekat.`);
      },
      (err) => {
        console.error('GPS Error:', err);
        alert('Gagal mendapatkan lokasi. Pastikan izin GPS aktif di browser Anda.');
      }
    );
  };

  const fetchInsights = async () => {
    setLoadingInsights(true);
    try {
      const res = await api.nayaxa.getDashboardInsights({ 
        instansi_id: user?.instansi_id, 
        profil_id: user?.profil_pegawai_id 
      });
      if (res.success) {
        setInsights(res.data.insights);
        setSummary(res.data.nayaxa_summary);
        
        if (messages.length === 0) {
          setMessages([
            { role: 'assistant', text: `Hai, selamat datang, saya Nayaxa asisten Anda, ada yang bisa saya bantu hari ini?` }
          ]);
        }
      } else {
        setSummary('Gagal memuat insight Nayaxa.');
      }
    } catch (err) {
      console.error(err);
      setSummary('Terdapat kendala koneksi dengan Nayaxa Engine.');
    } finally {
      setLoadingInsights(false);
    }
  };

  const handleSend = async (e?: React.FormEvent, overrideText?: string) => {
    if (e) e.preventDefault();
    const messageToSend = overrideText || inputVal;
    if ((!messageToSend.trim() && selectedFiles.length === 0) || isTyping) return;

    const userMessage = messageToSend;
    const attachments = [...selectedFiles];
    
    setInputVal('');
    setSelectedFiles([]);
    selectedFilesRef.current = [];
    
    setMessages(prev => [...prev, { 
      role: 'user', 
      text: userMessage, 
      files: attachments.map(a => ({ name: a.name, url: a.base64, type: a.mimeType }))
    }]);
    
    const hasImage = attachments.some(a => a.mimeType?.includes('image/'));
    setThinkingBrain(attachments.length > 0 ? (hasImage ? 'Gemini' : 'DeepSeek') : 'DeepSeek');
    setIsTyping(true);

    try {
      const res = await api.nayaxa.chat({
        message: userMessage,
        files: attachments,
        current_page: window.location.pathname,
        page_title: document.title,
        session_id: sessionId,
        user_id: user?.id!,
        user_name: user?.nama_lengkap || 'Pengguna',
        profil_id: user?.profil_pegawai_id,
        instansi_id: user?.instansi_id
      });

      if (res.success) {
        const rawResponseText = res.text?.trim() 
          ? res.text 
          : 'Maaf, ada gangguan kecil saat memproses jawaban. Silakan coba kirim ulang.';
        // Strip chart markers from stored text so they don't leak into AI history context
        // (The frontend renderer handles display; markers in history cause AI to imitate them incorrectly)
        const responseText = rawResponseText.replace(/\[NAYAXA_CHART\][\s\S]*?\[\/NAYAXA_CHART\]/g, '[Grafik ditampilkan]');
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          text: rawResponseText, // Keep full text for rendering in UI
          brainUsed: res.brain_used 
        }]);
        if (res.brain_used) setLastBrainUsed(res.brain_used);
        if (res.session_id) setSessionId(res.session_id);
        fetchSessions(); 
      } else {
        setMessages(prev => [...prev, { role: 'assistant', text: res.message || res.error || 'Terjadi kesalahan sistem' }]);
      }
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'assistant', text: 'Koneksi ke server Nayaxa terputus.' }]);
    } finally {
      setIsTyping(false);
      setThinkingBrain(null);
    }
  };

  if (!isBapperida) return null;

  return (
    <>
      {/* Floating Action Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 w-16 h-16 bg-gradient-to-tr from-indigo-600 to-purple-500 rounded-full shadow-2xl flex items-center justify-center hover:shadow-indigo-500/50 hover:scale-105 transition-all duration-300"
          >
            <Bot className="text-white w-8 h-8" />
            <span className="absolute -top-1 -right-1 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-purple-500 border border-white"></span>
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Main Assistant Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            ref={panelRef}
            className={`fixed right-4 bottom-4 sm:right-6 sm:bottom-6 z-50 w-[calc(100%-32px)] sm:w-[400px] md:w-[420px] bg-white border border-slate-200 shadow-2xl rounded-2xl overflow-hidden flex flex-col transition-all duration-300 ${isMinimized ? 'h-16' : 'h-[580px] max-h-[calc(100vh-120px)]'}`}
          >
            {/* Header */}
            <div 
              className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 flex items-center justify-between cursor-pointer"
              onClick={() => setIsMinimized(!isMinimized)}
            >
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
                  <Bot className="text-white w-5 h-5" />
                </div>
                <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-white font-bold text-sm leading-tight">Nayaxa AI</h3>
                      <AnimatePresence>
                        {(lastBrainUsed || thinkingBrain) && (
                          <motion.div 
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ 
                              opacity: isTyping ? [0.4, 1, 0.4] : 1,
                              scale: 1,
                              transition: isTyping ? { repeat: Infinity, duration: 1.2 } : { duration: 0.2 }
                            }}
                            exit={{ opacity: 0 }}
                            className={`w-4 h-4 flex items-center justify-center rounded-full text-[9px] font-black border border-white/20 shadow-sm ${
                              (thinkingBrain || lastBrainUsed)?.toLowerCase().includes('deepseek') 
                                ? 'bg-teal-500 text-white' 
                                : 'bg-indigo-500 text-white'
                            }`}
                            title={thinkingBrain || lastBrainUsed || ''}
                          >
                            {(thinkingBrain || lastBrainUsed)?.toLowerCase().includes('deepseek') ? 'D' : 'G'}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  <p className="text-indigo-100 text-xs text-opacity-80">Asisten Cerdas Kamu</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button 
                  onClick={(e) => { e.stopPropagation(); setShowHistory(!showHistory); }}
                  className={`p-1.5 rounded-lg transition-all ${showHistory ? 'bg-white/20 text-white' : 'text-white/70 hover:text-white hover:bg-white/10'}`}
                  title="Riwayat Percakapan"
                >
                  <FileText className="w-4 h-4" />
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); startNewChat(); }}
                  className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                  title="Percakapan Baru"
                >
                  <Plus className="w-4 h-4" />
                </button>
                <div className="w-px h-4 bg-white/20 mx-1" />
                <button className="text-white/70 hover:text-white p-1 rounded transition-colors hidden sm:block">
                  <ChevronUp className={`w-5 h-5 transition-transform duration-300 ${isMinimized ? 'rotate-180' : 'rotate-0'}`} />
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}
                  className="text-white/70 hover:text-white p-1 hover:bg-white/10 rounded transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Assistant Content */}
            {!isMinimized && (
              <div className="flex-1 flex flex-col overflow-hidden bg-slate-50 relative">
                
                {/* Chat Area - Now flex-1 with no top panel */}



                {/* Chat Area */}
                <div 
                  className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar relative"
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <AnimatePresence>
                    {isDragging && (
                      <motion.div 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="absolute inset-0 z-[30] bg-indigo-600/10 border-2 border-dashed border-indigo-600 rounded-2xl m-2 flex flex-col items-center justify-center text-indigo-600 pointer-events-none"
                      >
                        <div className="bg-white p-6 rounded-3xl shadow-xl flex flex-col items-center gap-3">
                           <div className="bg-indigo-100 p-4 rounded-2xl">
                             <Plus size={32} className="animate-bounce" />
                           </div>
                           <span className="text-sm font-bold">Lepaskan file untuk dianalisis oleh Nayaxa</span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  {messages.map((msg, idx) => {
                    const hasPdfAction = msg.text.includes('[ACTION:NAVIGATE_LAPORAN_PDF]');
                    const cleanText = msg.text.replace('[ACTION:NAVIGATE_LAPORAN_PDF]', '').trim();

                    return (
                    <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                      <div className={`max-w-[90%] rounded-2xl p-3 px-4 text-sm ${
                        msg.role === 'user' 
                          ? 'bg-indigo-600 text-white rounded-tr-sm shadow-md shadow-indigo-200' 
                          : 'bg-white text-black border border-slate-100 shadow-sm rounded-tl-sm'
                      }`}>
                        {msg.files && msg.files.length > 0 && (
                          <div className="mb-2 flex flex-wrap gap-2">
                            {msg.files.map((file, fidx) => (
                              <div key={fidx} className={file.type.startsWith('image/') ? 'w-20 h-20 shrink-0' : 'min-w-[120px] max-w-[180px] flex-1'}>
                                {file.type.startsWith('image/') ? (
                                  <img src={file.url!} alt="Attachment" className="w-full h-full object-cover rounded-lg border shadow-sm" />
                                ) : (
                                  <div className="bg-slate-50 border border-slate-200 p-2 rounded-lg flex items-center gap-2 h-full overflow-hidden">
                                    <FileArchive size={14} className="text-indigo-600 shrink-0" />
                                    <span className="text-[9px] font-bold truncate flex-1 text-slate-600">{file.name}</span>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="whitespace-pre-wrap leading-relaxed break-words overflow-hidden">
                          {(() => {
                            // Split text into text segments and chart blocks
                            const CHART_REGEX = /\[NAYAXA_CHART\](.*?)\[\/NAYAXA_CHART\]/gs;
                            const segments: JSX.Element[] = [];
                            let lastIdx = 0;
                            let chartMatch;

                            const renderTextSegment = (text: string, key: string) => {
                              // Strip Markdown Header hashes (e.g. ### Title)
                              const cleanMarkdown = text.replace(/^#+\s/gm, '').replace(/\n#+\s/g, '\n');
                              
                              const parts: (string | JSX.Element)[] = [];
                              let li = 0;
                              let lm;
                              
                              // Handle bold formatting **text**
                              const boldRegex = /\*\*([^*]+)\*\*/g;
                              
                              const processLinks = (input: string, baseKey: string) => {
                                const subParts: (string | JSX.Element)[] = [];
                                let sli = 0;
                                let slm;
                                
                                // Regex to match either Markdown link [text](url) OR raw URL http(s)://...
                                const combinedRegex = /\[([^\]]+)\]\s*\(([^)]+)\)|(https?:\/\/[^\s]+)/g;
                                
                                while ((slm = combinedRegex.exec(input)) !== null) {
                                  if (slm.index > sli) subParts.push(input.substring(sli, slm.index));
                                  
                                  const markdownText = slm[1];
                                  const markdownUrl = slm[2];
                                  const rawUrl = slm[3];
                                  
                                  const linkUrl = markdownUrl || rawUrl;
                                  const linkText = markdownText || rawUrl;
                                  
                                  const isDownload = linkUrl.includes('/uploads/exports/');
                                  
                                  subParts.push(
                                    <a key={`${baseKey}-l-${slm.index}`} 
                                      href={linkUrl} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      download={isDownload ? `${linkText.replace(/[\[\]]/g, '')}.${linkUrl.split('.').pop()?.split(/[?#]/)[0]}` : undefined}
                                      className={`inline-flex items-center gap-2 my-2 p-3 px-4 rounded-xl border transition-all max-w-full break-all shadow-sm ${
                                        isDownload ? 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100 font-bold underline' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 underline'
                                      }`}>
                                      {isDownload ? <FileArchive size={16} className="shrink-0" /> : <Plus size={16} className="rotate-45 shrink-0" />}
                                      <span className="truncate max-w-[160px] sm:max-w-[320px]">{linkText}</span>
                                    </a>
                                  );
                                  sli = combinedRegex.lastIndex;
                                }
                                if (sli < input.length) subParts.push(input.substring(sli));
                                return subParts;
                              };

                              while ((lm = boldRegex.exec(cleanMarkdown)) !== null) {
                                if (lm.index > li) {
                                  parts.push(...processLinks(cleanMarkdown.substring(li, lm.index), `bpre-${lm.index}`));
                                }
                                parts.push(<strong key={`b-${lm.index}`} className="font-black text-indigo-900">{lm[1]}</strong>);
                                li = boldRegex.lastIndex;
                              }
                              
                              if (li < cleanMarkdown.length) {
                                parts.push(...processLinks(cleanMarkdown.substring(li), `bend-${li}`));
                              }
                              
                              return <span key={key}>{parts.length > 0 ? parts : cleanMarkdown}</span>;
                            };

                            while ((chartMatch = CHART_REGEX.exec(cleanText)) !== null) {
                              if (chartMatch.index > lastIdx) {
                                const textBefore = cleanText.substring(lastIdx, chartMatch.index).trim();
                                if (textBefore) segments.push(renderTextSegment(textBefore, `t-${lastIdx}`));
                              }
                              try {
                                let rawSpec = chartMatch[1].trim();
                                // Strip markdown code blocks if AI wrapped
                                if (rawSpec.startsWith('```')) {
                                  rawSpec = rawSpec.replace(/^```(json)?\n?/, '').replace(/\n?```$/, '').trim();
                                }
                                // Try base64 decode first (server-side injection format)
                                // Fall back to raw JSON parse (AI may imitate from history)
                                let chartSpec;
                                try {
                                  chartSpec = JSON.parse(atob(rawSpec));
                                } catch {
                                  chartSpec = JSON.parse(rawSpec);
                                }
                                segments.push(<NayaxaChart key={`c-${chartMatch.index}`} spec={chartSpec} />);
                              } catch (err) {
                                console.error('Chart Parse Error:', err, 'Raw:', chartMatch[1]);
                                segments.push(<span key={`ce-${chartMatch.index}`} className="text-xs text-red-400 font-mono">[Grafik tidak valid: {err instanceof Error ? err.message : 'Base64/JSON Error'}]</span>);
                              }
                              lastIdx = CHART_REGEX.lastIndex;
                            }
                            if (lastIdx < cleanText.length) {
                              const remaining = cleanText.substring(lastIdx).trim();
                              if (remaining) segments.push(renderTextSegment(remaining, `t-end`));
                            }
                            return segments.length > 0 ? segments : renderTextSegment(cleanText, 'all');
                          })()}
                        </div>
                        {msg.role === 'assistant' && hasPdfAction && (
                          <button 
                            onClick={() => window.location.href = '/?page=kegiatan-per-orang'}
                            className="mt-3 flex items-center justify-center w-full py-2 gap-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl transition-colors border border-indigo-200/60 active:scale-95"
                          >
                            <FileText size={16} />
                            Halaman Cetak PDF Laporan
                          </button>
                        )}

                        {msg.role === 'assistant' && msg.text.includes('[ACTION:REQUEST_LOCATION]') && !isLocationEnabled && (
                          <div className="mt-4 p-4 bg-indigo-50 border border-indigo-200 rounded-2xl flex flex-col gap-3">
                            <div className="flex items-center gap-2 text-indigo-700 font-bold text-xs">
                              <Bot size={16} />
                              Aktifkan GPS Sementara?
                            </div>
                            <p className="text-[11px] text-slate-600 leading-normal">
                              Nayaxa ingin mengakses lokasi Anda untuk memberikan rekomendasi yang paling akurat di sekitar Anda. GPS akan aktif selama 5 menit.
                            </p>
                            <div className="flex gap-2">
                              <button 
                                onClick={handleEnableGPS}
                                className="flex-1 py-2 bg-indigo-600 text-white text-[11px] font-bold rounded-xl hover:bg-indigo-700 transition-colors shadow-sm"
                              >
                                Izinkan (5 Menit)
                              </button>
                              <button 
                                onClick={() => {
                                  setMessages(prev => [...prev, { role: 'assistant', text: 'Baik, saya akan memberikan informasi umum saja tanpa data lokasi.' }]);
                                }}
                                className="flex-1 py-2 bg-white text-slate-500 text-[11px] font-bold rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors"
                              >
                                Tidak
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )})}
                  
                  {isTyping && (
                    <div className="flex justify-start items-end gap-2">
                      <div className="bg-white border border-slate-100 shadow-sm rounded-2xl rounded-tl-sm p-3 px-4">
                        <div className="flex gap-1.5 items-center h-5">
                          <div className={`w-1.5 h-1.5 rounded-full animate-bounce [animation-delay:-0.3s] ${thinkingBrain === 'DeepSeek' ? 'bg-teal-400' : 'bg-indigo-400'}`}></div>
                          <div className={`w-1.5 h-1.5 rounded-full animate-bounce [animation-delay:-0.15s] ${thinkingBrain === 'DeepSeek' ? 'bg-teal-400' : 'bg-indigo-400'}`}></div>
                          <div className={`w-1.5 h-1.5 rounded-full animate-bounce ${thinkingBrain === 'DeepSeek' ? 'bg-teal-400' : 'bg-indigo-400'}`}></div>
                        </div>
                      </div>
                      <div className={`w-2 h-2 rounded-full mb-1 animate-pulse ${thinkingBrain === 'DeepSeek' ? 'bg-teal-400 shadow-[0_0_8px_rgba(45,212,191,0.6)]' : 'bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.6)]'}`}></div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* History Overlay */}
                <AnimatePresence>
                  {showHistory && (
                    <motion.div 
                      initial={{ x: '-100%' }}
                      animate={{ x: 0 }}
                      exit={{ x: '-100%' }}
                      className="absolute inset-0 bg-white z-20 flex flex-col border-r border-slate-200 shadow-xl"
                    >
                      <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileText size={18} className="text-indigo-600" />
                          <span className="font-bold text-slate-700 text-sm">Riwayat Percakapan</span>
                        </div>
                        <button onClick={() => setShowHistory(false)} className="text-slate-400 hover:text-slate-600">
                          <X size={18} />
                        </button>
                      </div>
                      <div className="flex-1 overflow-y-auto p-2 space-y-2">
                        {sessions.length === 0 ? (
                          <div className="p-8 text-center text-slate-400 text-xs">Belum ada riwayat percakapan.</div>
                        ) : (
                          sessions.map((sess, i) => (
                            <div 
                              key={i}
                              onClick={() => loadSession(sess.session_id)}
                              className={`w-full text-left p-3 rounded-xl transition-all border group relative ${
                                sessionId === sess.session_id 
                                  ? 'bg-indigo-50 border-indigo-200 ring-1 ring-indigo-200' 
                                  : 'bg-white border-slate-100 hover:bg-slate-50'
                              }`}
                            >
                              <div className="text-[11px] font-bold text-slate-700 truncate mb-1 pr-6">
                                {sess.title || 'Percakapan Lama'}...
                              </div>
                              <div className="text-[9px] text-slate-400 flex items-center gap-1">
                                <Plus size={10} />
                                {new Date(sess.last_msg).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </div>
                              <button 
                                onClick={(e) => handleDeleteSession(e, sess.session_id)}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                title="Hapus Riwayat"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                      <div className="p-3 border-t border-slate-100">
                        <button 
                          onClick={startNewChat}
                          className="w-full py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-100"
                        >
                          Mulai Sesi Baru
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Input Area */}
                <div className="p-3 bg-white border-t border-slate-100">
                  {selectedFiles.length > 0 && (
                    <div className="mb-3 flex flex-wrap gap-2 pl-1">
                      {selectedFiles.map((file, idx) => (
                        <div key={idx} className="relative inline-block group">
                          {file.mimeType?.startsWith('image/') ? (
                            <img src={file.base64} alt="Preview" className="h-14 w-14 object-cover rounded-lg border-2 border-indigo-100 shadow-sm" />
                          ) : (
                            <div className="h-14 w-28 bg-indigo-50 rounded-lg border-2 border-indigo-100 flex flex-col items-center justify-center p-1 overflow-hidden">
                              <FileArchive size={18} className="text-indigo-600 mb-0.5" />
                              <span className="text-[8px] font-black truncate w-full text-center text-indigo-700 uppercase tracking-tighter">{file.name}</span>
                            </div>
                          )}
                          <button 
                            type="button" 
                            onClick={() => {
                              const next = selectedFiles.filter((_, i) => i !== idx);
                              selectedFilesRef.current = next;
                              setSelectedFiles(next);
                            }}
                            className="absolute -top-2 -right-2 bg-slate-800 text-white rounded-full p-1 shadow-md hover:bg-slate-700 hover:scale-110 transition-all"
                          >
                            <X size={10} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <form onSubmit={(e) => handleSend(e)} className="relative flex items-center gap-2">
                    <input type="file" ref={fileInputRef} accept="image/*,.pdf,.xlsx,.csv,.txt" onChange={handleFileChange} className="hidden" multiple />
                      <button 
                        type="button" 
                        onClick={() => fileInputRef.current?.click()}
                        title="Lampirkan File / Gambar"
                        className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors shrink-0"
                      >
                        <Plus size={20} />
                      </button>
                    <div className="relative flex-1">
                      <input
                        ref={inputRef}
                        type="text"
                        value={inputVal}
                        onChange={(e) => setInputVal(e.target.value)}
                        onPaste={handlePaste}
                        placeholder="Tanya Nayaxa atau lampirkan file (Excel/PDF)..."
                        className="w-full bg-slate-50 border border-slate-200 text-sm rounded-xl py-3 pl-4 pr-12 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder:text-slate-400"
                        disabled={isTyping}
                      />
                      <button 
                        type="submit"
                        disabled={(!inputVal.trim() && selectedFiles.length === 0) || isTyping}
                        className="absolute right-2 top-1.5 p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 transition-colors"
                      >
                        <Send size={16} />
                      </button>
                    </div>
                  </form>
                  <div className="text-[10px] text-center text-slate-400 mt-2 font-medium">
                    Nayaxa dapat membuat analisis berdasarkan data Anda.
                  </div>
                </div>

              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
