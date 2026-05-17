import React, { useState, useEffect, useRef } from 'react';
import { api } from '@/src/services/api';
import { 
    Settings, Plus, Edit2, Trash2, CheckCircle2, 
    AlertCircle, Eye, EyeOff, Info, X, 
    Save, Key, ShieldCheck, GripVertical
} from 'lucide-react';

interface GeminiKey {
    id: number;
    email: string;
    jenis_ai: 'Gemini Free' | 'Gemini Paid' | 'DeepSeek Paid';
    label: string;
    api_key: string;
    is_active: number;
    created_at: string;
}

interface WidgetPrompt {
    id: number;
    label: string;
    prompt: string;
    urutan: number;
    is_active: number;
}

const KelolaAplikasi = ({ initialTab = 'keys' }: { initialTab?: 'keys' | 'prompts' }) => {
    const [activeTab, setActiveTab] = useState<'keys' | 'prompts'>(initialTab);

    useEffect(() => {
        setActiveTab(initialTab);
    }, [initialTab]);


    // API Key State
    const [keys, setKeys] = useState<GeminiKey[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isActionLoading, setIsActionLoading] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);
    const [status, setStatus] = useState<{ type: 'success' | 'error' | null, message: string }>({ type: null, message: '' });

    // Form inputs
    const [email, setEmail] = useState('');
    const [jenisAi, setJenisAi] = useState<'Gemini Free' | 'Gemini Paid' | 'DeepSeek Paid'>('Gemini Free');
    const [label, setLabel] = useState('');
    const [apiKey, setApiKey] = useState('');
    const [isActive, setIsActive] = useState(false);
    const [showKey, setShowKey] = useState(false);

    // Prompts State
    const [prompts, setPrompts] = useState<WidgetPrompt[]>([]);
    const [showPromptForm, setShowPromptForm] = useState(false);
    const [editPromptId, setEditPromptId] = useState<number | null>(null);
    const [promptLabel, setPromptLabel] = useState('');
    const [promptText, setPromptText] = useState('');
    const [promptUrutan, setPromptUrutan] = useState(0);

    // Drag & Drop State for Prompts
    const dragPromptItem = useRef<number | null>(null);
    const dragOverPromptItem = useRef<number | null>(null);
    const [dragOverPromptId, setDragOverPromptId] = useState<number | null>(null);

    const handleDragStartPrompt = (e: React.DragEvent, id: number) => {
        e.dataTransfer.setData('text/plain', String(id));
        e.dataTransfer.effectAllowed = 'move';
        dragPromptItem.current = id;
    };

    const handleDragOverPrompt = (e: React.DragEvent, id: number) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (dragOverPromptItem.current !== id) {
            dragOverPromptItem.current = id;
            setDragOverPromptId(id);
        }
    };

    const handleDragLeavePrompt = (e: React.DragEvent) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            setDragOverPromptId(null);
        }
    };

    const handleDropPrompt = async (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOverPromptId(null);

        const srcId = dragPromptItem.current;
        const tgtId = dragOverPromptItem.current;

        if (!srcId || !tgtId || srcId === tgtId) return;

        const dragIdx = prompts.findIndex(p => p.id === srcId);
        const overIdx = prompts.findIndex(p => p.id === tgtId);

        if (dragIdx === -1 || overIdx === -1) return;

        const reordered = [...prompts];
        const [moved] = reordered.splice(dragIdx, 1);
        reordered.splice(overIdx, 0, moved);

        const newOrder = reordered.map((p, idx) => ({ id: p.id, urutan: idx + 1 }));

        setPrompts(prev => prev.map(p => {
            const updated = newOrder.find(o => o.id === p.id);
            return updated ? { ...p, urutan: updated.urutan } : p;
        }).sort((a, b) => a.urutan - b.urutan));

        try {
            await api.pengaturan.reorderWidgetPrompts(newOrder);
            fetchPrompts();
        } catch (err) {
            console.error('Reorder error:', err);
            fetchPrompts();
        }

        dragPromptItem.current = null;
        dragOverPromptItem.current = null;
    };

    const handleDragEndPrompt = () => {
        dragPromptItem.current = null;
        dragOverPromptItem.current = null;
        setDragOverPromptId(null);
    };

    useEffect(() => {
        if (activeTab === 'keys') fetchKeys();
        else fetchPrompts();
    }, [activeTab]);

    const fetchKeys = async () => {
        try {
            setIsLoading(true);
            const res = await api.pengaturan.getGeminiKeys();
            if (res.success) {
                setKeys(res.data);
            }
        } catch (error) {
            console.error('Failed to fetch API keys:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchPrompts = async () => {
        try {
            setIsLoading(true);
            const res = await api.pengaturan.getWidgetPrompts();
            if (res.success) {
                setPrompts(res.data);
            }
        } catch (error) {
            console.error('Failed to fetch prompts:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const resetForm = () => {
        setEmail('');
        setJenisAi('Gemini Free');
        setLabel('');
        setApiKey('');
        setIsActive(false);
        setEditId(null);
        setShowForm(false);
    };

    const resetPromptForm = () => {
        setPromptLabel('');
        setPromptText('');
        setPromptUrutan(0);
        setEditPromptId(null);
        setShowPromptForm(false);
    };

    const handleEdit = (key: GeminiKey) => {
        setEmail(key.email || '');
        setJenisAi(key.jenis_ai || 'Gemini Free');
        setLabel(key.label);
        setApiKey(''); // Keep empty for security
        setIsActive(key.is_active === 1);
        setEditId(key.id);
        setShowForm(true);
    };

    const handleEditPrompt = (p: WidgetPrompt) => {
        setPromptLabel(p.label);
        setPromptText(p.prompt);
        setPromptUrutan(p.urutan);
        setEditPromptId(p.id);
        setShowPromptForm(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!label.trim()) {
            setStatus({ type: 'error', message: 'Label Key wajib diisi' });
            return;
        }
        if (!editId && !apiKey.trim()) {
            setStatus({ type: 'error', message: 'API Key wajib diisi untuk data baru' });
            return;
        }

        try {
            setIsActionLoading(true);
            let res;
            if (editId) {
                res = await api.pengaturan.updateGeminiKey(editId, { 
                    email,
                    jenis_ai: jenisAi,
                    label, 
                    api_key: apiKey || undefined, 
                    is_active: isActive 
                });
            } else {
                res = await api.pengaturan.addGeminiKey({ 
                    email,
                    jenis_ai: jenisAi,
                    label, 
                    api_key: apiKey, 
                    is_active: isActive 
                });
            }

            if (res.success) {
                setStatus({ type: 'success', message: res.message });
                resetForm();
                fetchKeys();
            } else {
                setStatus({ type: 'error', message: res.message });
            }
        } catch (error) {
            setStatus({ type: 'error', message: 'Gagal memproses data' });
        } finally {
            setIsActionLoading(false);
            setTimeout(() => setStatus({ type: null, message: '' }), 3000);
        }
    };

    const handlePromptSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!promptLabel.trim() || !promptText.trim()) {
            setStatus({ type: 'error', message: 'Label dan Prompt wajib diisi' });
            return;
        }

        try {
            setIsActionLoading(true);
            let res;
            if (editPromptId) {
                res = await api.pengaturan.updateWidgetPrompt(editPromptId, { 
                    label: promptLabel, 
                    prompt: promptText, 
                    urutan: promptUrutan 
                });
            } else {
                res = await api.pengaturan.addWidgetPrompt({ 
                    label: promptLabel, 
                    prompt: promptText, 
                    urutan: prompts.length + 1 
                });
            }

            if (res.success) {
                setStatus({ type: 'success', message: res.message });
                resetPromptForm();
                fetchPrompts();
            } else {
                setStatus({ type: 'error', message: res.message });
            }
        } catch (error) {
            setStatus({ type: 'error', message: 'Gagal memproses data prompt' });
        } finally {
            setIsActionLoading(false);
            setTimeout(() => setStatus({ type: null, message: '' }), 3000);
        }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm('Hapus API Key ini? Tindakan ini tidak dapat dibatalkan.')) return;

        try {
            setIsActionLoading(true);
            const res = await api.pengaturan.deleteGeminiKey(id);
            if (res.success) {
                setStatus({ type: 'success', message: 'API Key berhasil dihapus' });
                fetchKeys();
            }
        } catch (error) {
            setStatus({ type: 'error', message: 'Gagal menghapus API Key' });
        } finally {
            setIsActionLoading(false);
            setTimeout(() => setStatus({ type: null, message: '' }), 3000);
        }
    };

    const handleDeletePrompt = async (id: number) => {
        if (!window.confirm('Hapus Prompt ini? Tindakan ini tidak dapat dibatalkan.')) return;

        try {
            setIsActionLoading(true);
            const res = await api.pengaturan.deleteWidgetPrompt(id);
            if (res.success) {
                setStatus({ type: 'success', message: 'Prompt berhasil dihapus' });
                fetchPrompts();
            }
        } catch (error) {
            setStatus({ type: 'error', message: 'Gagal menghapus Prompt' });
        } finally {
            setIsActionLoading(false);
            setTimeout(() => setStatus({ type: null, message: '' }), 3000);
        }
    };

    const handleActivate = async (id: number) => {
        try {
            setIsActionLoading(true);
            const res = await api.pengaturan.activateGeminiKey(id);
            if (res.success) {
                setStatus({ type: 'success', message: 'API Key berhasil diaktifkan' });
                fetchKeys();
            }
        } catch (error) {
            setStatus({ type: 'error', message: 'Gagal mengaktifkan API Key' });
        } finally {
            setIsActionLoading(false);
            setTimeout(() => setStatus({ type: null, message: '' }), 3000);
        }
    };

    return (
        <div className="card-modern p-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 border-b border-slate-100 pb-6">
                <div>
                    <h2 className="text-xl font-black text-ppm-slate uppercase tracking-tight flex items-center gap-2">
                        <Settings size={22} className="text-ppm-primary" />
                        Kelola Aplikasi & Widget
                    </h2>
                    <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest font-bold">
                        Pusat Konfigurasi API Key Kredensial & Prompt Widget Dinamis
                    </p>
                </div>
                <div className="flex gap-2 bg-slate-100 p-1 rounded-xl">
                    <button 
                        onClick={() => setActiveTab('keys')}
                        className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all ${activeTab === 'keys' ? 'bg-white text-ppm-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        API Key
                    </button>
                    <button 
                        onClick={() => setActiveTab('prompts')}
                        className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all ${activeTab === 'prompts' ? 'bg-white text-ppm-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Prompt Widget
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-12 gap-8">
                {/* Main Content: Table or Form */}
                <div className="col-span-12 lg:col-span-8">
                    {activeTab === 'keys' ? (
                        showForm ? (
                            <form onSubmit={handleSubmit} className="bg-white rounded-2xl border-2 border-slate-100 p-6 animate-in slide-in-from-right-4 duration-300">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="font-black text-ppm-slate uppercase tracking-tight flex items-center gap-2">
                                        <Key size={18} className="text-ppm-primary" />
                                        {editId ? 'Edit API Key' : 'Tambah API Key Baru'}
                                    </h3>
                                    <button type="button" onClick={resetForm} className="p-2 hover:bg-slate-100 rounded-full text-slate-400">
                                        <X size={20} />
                                    </button>
                                </div>

                                <div className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Email Akun / Provider</label>
                                            <input 
                                                type="email"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                placeholder="Contoh: user@gmail.com"
                                                className="input-modern w-full font-bold focus:ring-ppm-primary/20"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Jenis AI</label>
                                            <select 
                                                value={jenisAi}
                                                onChange={(e) => setJenisAi(e.target.value as any)}
                                                className="input-modern w-full font-bold focus:ring-ppm-primary/20"
                                            >
                                                <option value="Gemini Free">Gemini Free</option>
                                                <option value="Gemini Paid">Gemini Paid</option>
                                                <option value="DeepSeek Paid">DeepSeek Paid</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Label Key</label>
                                        <input 
                                            type="text"
                                            value={label}
                                            onChange={(e) => setLabel(e.target.value)}
                                            placeholder="Contoh: Akun Utama Bapperida"
                                            className="input-modern w-full font-bold focus:ring-ppm-primary/20"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">
                                            API Key {editId && '(Kosongkan jika tidak ingin mengubah)'}
                                        </label>
                                        <div className="relative group">
                                            <input 
                                                type={showKey ? 'text' : 'password'}
                                                value={apiKey}
                                                onChange={(e) => setApiKey(e.target.value)}
                                                placeholder="AIzaSy..."
                                                className="input-modern w-full pr-12 font-mono"
                                            />
                                            <button 
                                                type="button"
                                                onClick={() => setShowKey(!showKey)}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                            >
                                                {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100/50">
                                        <input 
                                            type="checkbox"
                                            id="is_active"
                                            checked={isActive}
                                            onChange={(e) => setIsActive(e.target.checked)}
                                            className="w-4 h-4 text-ppm-primary border-slate-300 rounded focus:ring-ppm-primary/20"
                                        />
                                        <label htmlFor="is_active" className="text-xs font-black text-slate-600 uppercase tracking-tight cursor-pointer select-none">
                                            Aktifkan Kunci Ini Sekarang
                                        </label>
                                    </div>

                                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                                        <button 
                                            type="button"
                                            onClick={resetForm}
                                            className="btn-modern-secondary text-xs py-2 px-4 uppercase font-black tracking-wider"
                                        >
                                            Batal
                                        </button>
                                        <button 
                                            type="submit"
                                            disabled={isActionLoading}
                                            className="btn-modern-primary text-xs py-2 px-4 uppercase font-black tracking-wider flex items-center gap-2"
                                        >
                                            <Save size={14} />
                                            Simpan Key
                                        </button>
                                    </div>
                                </div>
                            </form>
                        ) : (
                            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
                                <div className="p-5 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                                    <h3 className="text-xs font-black text-slate-600 uppercase tracking-widest">Daftar Kunci Tersimpan</h3>
                                    <button 
                                        onClick={() => setShowForm(true)}
                                        className="btn-modern-primary flex items-center gap-2 py-1.5 px-3 text-[10px] uppercase font-black tracking-wider"
                                    >
                                        <Plus size={12} />
                                        Tambah Key
                                    </button>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="border-b border-slate-100 bg-white">
                                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-24">Status</th>
                                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Jenis AI</th>
                                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Email & Label</th>
                                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">API Key</th>
                                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right w-28">Aksi</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50 bg-white">
                                            {isLoading ? (
                                                <tr>
                                                    <td colSpan={3} className="px-6 py-12 text-center text-slate-400 text-xs font-bold italic uppercase animate-pulse">Memuat data...</td>
                                                </tr>
                                            ) : keys.length === 0 ? (
                                                <tr>
                                                    <td colSpan={3} className="px-6 py-12 text-center text-slate-400 text-xs font-bold uppercase tracking-tight">Belum ada API Key terdaftar</td>
                                                </tr>
                                            ) : keys.map((key) => (
                                                <tr key={key.id} className="group hover:bg-slate-50/50 transition-colors">
                                                    <td className="px-6 py-4">
                                                        {key.is_active ? (
                                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black bg-blue-50 text-blue-600 border border-blue-200/50 uppercase tracking-wider">
                                                                <CheckCircle2 size={10} />
                                                                Aktif
                                                            </span>
                                                        ) : (
                                                            <button 
                                                                onClick={() => handleActivate(key.id)}
                                                                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black bg-slate-100 text-slate-400 hover:bg-blue-50 hover:text-blue-500 hover:border-blue-200/50 border border-transparent transition-all uppercase tracking-wider"
                                                                title="Klik untuk mengaktifkan"
                                                            >
                                                                Nonaktif
                                                            </button>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black border uppercase tracking-wider ${
                                                            key.jenis_ai === 'DeepSeek Paid' ? 'bg-indigo-50 text-indigo-600 border-indigo-200/50' : 
                                                            key.jenis_ai === 'Gemini Paid' ? 'bg-amber-50 text-amber-600 border-amber-200/50' :
                                                            'bg-emerald-50 text-emerald-600 border-emerald-200/50'
                                                        }`}>
                                                            {key.jenis_ai}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="font-black text-slate-700 text-sm mb-1 uppercase tracking-tight">{key.label}</div>
                                                        <div className="text-[11px] text-slate-400 font-bold uppercase">{key.email || '-'}</div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="font-mono text-[11px] text-slate-400 tracking-wider flex items-center gap-1.5">
                                                            <ShieldCheck size={12} className={key.is_active ? 'text-blue-400' : 'text-slate-300'} />
                                                            {key.api_key}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 align-top">
                                                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button 
                                                                onClick={() => handleEdit(key)}
                                                                className="p-2 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-blue-500 hover:border-blue-200 transition-all shadow-sm"
                                                                title="Edit"
                                                            >
                                                                <Edit2 size={16} />
                                                            </button>
                                                            <button 
                                                                onClick={() => handleDelete(key.id)}
                                                                className="p-2 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-red-500 hover:border-red-200 transition-all shadow-sm"
                                                                title="Hapus"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )
                    ) : (
                        showPromptForm ? (
                            <form onSubmit={handlePromptSubmit} className="bg-white rounded-2xl border-2 border-slate-100 p-6 animate-in slide-in-from-right-4 duration-300">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="font-black text-ppm-slate uppercase tracking-tight flex items-center gap-2">
                                        <Plus size={18} className="text-ppm-primary" />
                                        {editPromptId ? 'Edit Prompt Widget' : 'Tambah Prompt Widget Baru'}
                                    </h3>
                                    <button type="button" onClick={resetPromptForm} className="p-2 hover:bg-slate-100 rounded-full text-slate-400">
                                        <X size={20} />
                                    </button>
                                </div>

                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Label Menu Dropdown</label>
                                        <input 
                                            type="text"
                                            value={promptLabel}
                                            onChange={(e) => setPromptLabel(e.target.value)}
                                            placeholder="Contoh: Jadikan Acuan Format"
                                            className="input-modern w-full font-bold focus:ring-ppm-primary/20"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Prompt / Instruksi AI</label>
                                        <textarea 
                                            rows={3}
                                            value={promptText}
                                            onChange={(e) => setPromptText(e.target.value)}
                                            placeholder="Contoh: Jadikan acuan format penulisan untuk dokumen ini..."
                                            className="input-modern w-full font-medium focus:ring-ppm-primary/20"
                                        />
                                    </div>

                                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                                        <button 
                                            type="button"
                                            onClick={resetPromptForm}
                                            className="btn-modern-secondary text-xs py-2 px-4 uppercase font-black tracking-wider"
                                        >
                                            Batal
                                        </button>
                                        <button 
                                            type="submit"
                                            disabled={isActionLoading}
                                            className="btn-modern-primary text-xs py-2 px-4 uppercase font-black tracking-wider flex items-center gap-2"
                                        >
                                            <Save size={14} />
                                            Simpan Prompt
                                        </button>
                                    </div>
                                </div>
                            </form>
                        ) : (
                            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
                                <div className="p-5 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                                    <h3 className="text-xs font-black text-slate-600 uppercase tracking-widest">Daftar Prompt Dropdown Chat Widget</h3>
                                    <button 
                                        onClick={() => setShowPromptForm(true)}
                                        className="btn-modern-primary flex items-center gap-2 py-1.5 px-3 text-[10px] uppercase font-black tracking-wider"
                                    >
                                        <Plus size={12} />
                                        Tambah Prompt
                                    </button>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="border-b border-slate-100 bg-white">
                                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-16 text-center">Urut</th>
                                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Label Menu</th>
                                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Instruksi Prompt</th>
                                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right w-28">Aksi</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50 bg-white">
                                            {isLoading ? (
                                                <tr>
                                                    <td colSpan={4} className="px-6 py-12 text-center text-slate-400 text-xs font-bold italic uppercase animate-pulse">Memuat data...</td>
                                                </tr>
                                            ) : prompts.length === 0 ? (
                                                <tr>
                                                    <td colSpan={4} className="px-6 py-12 text-center text-slate-400 text-xs font-bold uppercase tracking-tight">Belum ada Prompt terdaftar</td>
                                                </tr>
                                            ) : prompts.map((p) => (
                                                <tr 
                                                    key={p.id} 
                                                    draggable
                                                    onDragStart={(e) => handleDragStartPrompt(e, p.id)}
                                                    onDragOver={(e) => handleDragOverPrompt(e, p.id)}
                                                    onDragLeave={handleDragLeavePrompt}
                                                    onDrop={handleDropPrompt}
                                                    onDragEnd={handleDragEndPrompt}
                                                    className={`group hover:bg-slate-50/50 transition-colors ${dragOverPromptId === p.id ? 'bg-indigo-50 border-t-2 border-indigo-400' : ''}`}
                                                >
                                                    <td className="px-6 py-4 text-center cursor-grab active:cursor-grabbing" title={`Urutan #${p.urutan} (Seret untuk memindahkan)`}>
                                                        <GripVertical size={16} className="text-slate-300 hover:text-slate-500 mx-auto" />
                                                    </td>
                                                    <td className="px-6 py-4 font-black text-slate-700 text-xs uppercase tracking-tight">{p.label}</td>
                                                    <td className="px-6 py-4 text-xs text-slate-500 max-w-xs truncate">{p.prompt}</td>
                                                    <td className="px-6 py-4 align-top">
                                                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button 
                                                                onClick={() => handleEditPrompt(p)}
                                                                className="p-2 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-blue-500 hover:border-blue-200 transition-all shadow-sm"
                                                                title="Edit"
                                                            >
                                                                <Edit2 size={16} />
                                                            </button>
                                                            <button 
                                                                onClick={() => handleDeletePrompt(p.id)}
                                                                className="p-2 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-red-500 hover:border-red-200 transition-all shadow-sm"
                                                                title="Hapus"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )
                    )}
                </div>

                {/* Sidebar Info */}
                <div className="col-span-12 lg:col-span-4">
                    <div className="space-y-6">
                        {status.type && (
                            <div className={`p-4 rounded-2xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2 focus-within:ring-2 ${status.type === 'success' ? 'bg-green-50 border border-green-100 text-green-700' : 'bg-red-50 border border-red-100 text-red-700'}`}>
                                {status.type === 'success' ? <CheckCircle2 size={18} className="mt-0.5 shrink-0" /> : <AlertCircle size={18} className="mt-0.5 shrink-0" />}
                                <div className="text-xs font-black uppercase tracking-tight leading-tight">{status.message}</div>
                            </div>
                        )}

                        <div className="bg-amber-50 rounded-2xl border border-amber-100 p-6">
                            <div className="flex items-center gap-2 mb-4 text-amber-800">
                                <Info size={18} />
                                <h4 className="text-[10px] font-black uppercase tracking-[0.2em]">Pusat Bantuan</h4>
                            </div>
                            <div className="space-y-4">
                                {activeTab === 'keys' ? (
                                    <>
                                        <div className="space-y-1">
                                            <p className="text-[11px] font-black text-amber-900 uppercase tracking-tight">Koleksi API Key</p>
                                            <p className="text-[11px] text-amber-800/70 leading-relaxed">Anda bisa menyimpan banyak kunci AI sebagai cadangan. Pastikan hanya **SATU** yang berstatus Aktif agar Nayaxa tidak bingung.</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[11px] font-black text-amber-900 uppercase tracking-tight">Status Aktif</p>
                                            <p className="text-[11px] text-amber-800/70 leading-relaxed">Saat sebuah kunci diaktifkan, Nayaxa akan langsung menggunakannya di Dashboard dan asisten chat secara real-time.</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[11px] font-black text-amber-900 uppercase tracking-tight">Quota & Limit</p>
                                            <p className="text-[11px] text-amber-800/70 leading-relaxed">Gunakan fitur ini untuk gonta-ganti kunci jika salah satu kunci mencapai limit harian Gemini.</p>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="space-y-1">
                                            <p className="text-[11px] font-black text-amber-900 uppercase tracking-tight">Prompt Chat Widget</p>
                                            <p className="text-[11px] text-amber-800/70 leading-relaxed">Menu ini mengatur opsi tindakan yang muncul di dropdown saat pengguna melampirkan file pada chat widget.</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[11px] font-black text-amber-900 uppercase tracking-tight">Dinamis & Real-Time</p>
                                            <p className="text-[11px] text-amber-800/70 leading-relaxed">Setiap perubahan atau penambahan prompt akan langsung tersedia di seluruh widget asisten Nayaxa tanpa perlu restart.</p>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                            <div className="flex items-center gap-3 text-slate-400">
                                <ShieldCheck size={20} />
                                <span className="text-[10px] font-bold uppercase tracking-widest italic">Encrypted Secure Session</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default KelolaAplikasi;
