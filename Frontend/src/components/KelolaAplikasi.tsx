import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { 
    Settings, Brain, Plus, Edit2, Trash2, CheckCircle2, 
    AlertCircle, Eye, EyeOff, Info, Star, StarOff, X, 
    Save, Key, ShieldCheck, RefreshCw
} from 'lucide-react';

interface GeminiKey {
    id: number;
    label: string;
    api_key: string;
    is_active: number;
    created_at: string;
}

const KelolaAplikasi = () => {
    const [keys, setKeys] = useState<GeminiKey[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isActionLoading, setIsActionLoading] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);
    const [status, setStatus] = useState<{ type: 'success' | 'error' | null, message: string }>({ type: null, message: '' });

    // Form inputs
    const [label, setLabel] = useState('');
    const [apiKey, setApiKey] = useState('');
    const [isActive, setIsActive] = useState(false);
    const [showKey, setShowKey] = useState(false);

    useEffect(() => {
        fetchKeys();
    }, []);

    const fetchKeys = async () => {
        try {
            setIsLoading(true);
            const res = await api.pengaturan.getGeminiKeys();
            if (res.success) {
                setKeys(res.data);
            }
        } catch (error) {
            console.error('Failed to fetch keys:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const resetForm = () => {
        setLabel('');
        setApiKey('');
        setIsActive(false);
        setEditId(null);
        setShowForm(false);
        setShowKey(false);
    };

    const handleEdit = (key: GeminiKey) => {
        setEditId(key.id);
        setLabel(key.label);
        setApiKey(''); // Don't show existing key for security, user only types if they want to change
        setIsActive(key.is_active === 1);
        setShowForm(true);
    };

    const handleSave = async () => {
        if (!label || (!editId && !apiKey)) {
            setStatus({ type: 'error', message: 'Label dan API Key harus diisi' });
            return;
        }

        try {
            setIsActionLoading(true);
            let res;
            if (editId) {
                res = await api.pengaturan.updateGeminiKey(editId, { 
                    label, 
                    api_key: apiKey || undefined, 
                    is_active: isActive 
                });
            } else {
                res = await api.pengaturan.addGeminiKey({ label, api_key: apiKey, is_active: isActive });
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
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h2 className="text-xl font-black text-ppm-slate uppercase tracking-tight flex items-center gap-2">
                        <Settings size={22} className="text-ppm-primary" />
                        Kelola Aplikasi
                    </h2>
                    <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest font-bold">
                        Pusat Konfigurasi Core Nayaxa
                    </p>
                </div>
                <button 
                    onClick={() => { resetForm(); setShowForm(true); }}
                    className="btn-modern-primary flex items-center gap-2 py-2 px-4 text-xs font-black uppercase"
                >
                    <Plus size={16} />
                    Tambah Key
                </button>
            </div>

            <div className="grid grid-cols-12 gap-8">
                {/* Main Content: Table or Form */}
                <div className="col-span-12 lg:col-span-8">
                    {showForm ? (
                        <div className="bg-white rounded-2xl border-2 border-slate-100 p-6 animate-in slide-in-from-right-4 duration-300">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="font-black text-ppm-slate uppercase tracking-tight flex items-center gap-2">
                                    <Key size={18} className="text-ppm-primary" />
                                    {editId ? 'Edit API Key' : 'Tambah API Key Baru'}
                                </h3>
                                <button onClick={resetForm} className="p-2 hover:bg-slate-100 rounded-full text-slate-400">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="space-y-6">
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
                                            onClick={() => setShowKey(!showKey)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-ppm-primary"
                                        >
                                            {showKey ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                                    <input 
                                        type="checkbox"
                                        id="is_active"
                                        checked={isActive}
                                        onChange={(e) => setIsActive(e.target.checked)}
                                        className="w-5 h-5 rounded text-ppm-primary focus:ring-ppm-primary"
                                    />
                                    <label htmlFor="is_active" className="text-sm font-bold text-slate-600 select-none cursor-pointer uppercase tracking-tight">
                                        Setel sebagai Key Aktif
                                    </label>
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <button 
                                        onClick={handleSave}
                                        disabled={isActionLoading}
                                        className="flex-1 bg-ppm-slate text-white py-3 rounded-xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 hover:bg-slate-800 shadow-lg shadow-slate-200"
                                    >
                                        <Save size={16} />
                                        {isActionLoading ? 'Memproses...' : editId ? 'Perbarui Data' : 'Simpan Key'}
                                    </button>
                                    <button 
                                        onClick={resetForm}
                                        className="px-6 py-3 border-2 border-slate-100 text-slate-400 rounded-xl font-bold text-xs uppercase hover:bg-slate-50"
                                    >
                                        Batal
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
                            <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
                                <Brain size={18} className="text-ppm-primary" />
                                <h3 className="text-xs font-black text-slate-600 uppercase tracking-widest">Daftar API Key Gemini</h3>
                                {isActionLoading && <RefreshCw size={14} className="animate-spin text-slate-400 ml-auto" />}
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-white">
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Label / Kunci</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {isLoading ? (
                                            <tr>
                                                <td colSpan={3} className="px-6 py-12 text-center text-slate-400 text-xs font-bold italic uppercase tracking-widest animate-pulse">
                                                    Sedang Memuat Data...
                                                </td>
                                            </tr>
                                        ) : keys.length === 0 ? (
                                            <tr>
                                                <td colSpan={3} className="px-6 py-12 text-center">
                                                    <div className="bg-slate-50 inline-flex p-4 rounded-full mb-3">
                                                        <Key size={32} className="text-slate-300" />
                                                    </div>
                                                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Belum ada API Key terdaftar</p>
                                                </td>
                                            </tr>
                                        ) : keys.map(key => (
                                            <tr key={key.id} className={`group hover:bg-slate-50 transition-colors ${key.is_active ? 'bg-blue-50/30' : ''}`}>
                                                <td className="px-6 py-4 align-top">
                                                    {key.is_active ? (
                                                        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-500 text-white rounded-full text-[9px] font-black uppercase tracking-tighter">
                                                            <Star size={10} fill="currentColor" />
                                                            Aktif
                                                        </div>
                                                    ) : (
                                                        <button 
                                                            onClick={() => handleActivate(key.id)}
                                                            className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-400 rounded-full text-[9px] font-black uppercase tracking-tighter hover:bg-ppm-primary hover:text-white transition-all shadow-sm"
                                                        >
                                                            <StarOff size={10} />
                                                            Aktifkan
                                                        </button>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="font-black text-slate-700 text-sm mb-1 uppercase tracking-tight">{key.label}</div>
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
