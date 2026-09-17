import React, { useState, useEffect } from 'react';
import { api } from '@/src/services/api';
import { Search, User, PenTool, Upload, Trash2, Check, Loader2, Image as ImageIcon, X, Shield } from 'lucide-react';
import SignatureCanvas from './SignatureCanvas';

interface Pegawai {
    id: number;
    user_id: number;
    nama_lengkap: string;
    nip: string;
    signature_image: string | null;
    paraf_image: string | null;
    bidang_nama: string | null;
    jabatan_nama: string | null;
}

export default function ManajemenEsign() {
    const [pegawaiList, setPegawaiList] = useState<Pegawai[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [saving, setSaving] = useState<number | null>(null); // pegawai ID being saved
    const [activeModal, setActiveModal] = useState<{ type: 'signature' | 'paraf', pegawai: Pegawai } | null>(null);
    const [esignMode, setEsignMode] = useState<'draw' | 'upload'>('draw');

    useEffect(() => {
        fetchPegawai();
    }, []);

    const fetchPegawai = async () => {
        setLoading(true);
        try {
            const res = await api.profilPegawai.getAll();
            if (res.success) {
                setPegawaiList(res.data);
            }
        } catch (error) {
            console.error('Error fetching pegawai:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredPegawai = pegawaiList.filter(p => 
        p.nama_lengkap?.toLowerCase().includes(search.toLowerCase()) || 
        p.nip?.includes(search)
    );

    const processToTransparent = (file: File | Blob): Promise<Blob> => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    const ctx = canvas.getContext('2d');
                    if (!ctx) { resolve(file); return; }

                    ctx.drawImage(img, 0, 0);
                    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                    const data = imageData.data;

                    // Iterate through every pixel (RGBA)
                    for (let i = 0; i < data.length; i += 4) {
                        const r = data[i];
                        const g = data[i+1];
                        const b = data[i+2];
                        
                        // If color is close to white, make it transparent
                        // Threshold 230 (out of 255) catches most paper/photo backgrounds
                        if (r > 230 && g > 230 && b > 230) {
                            data[i+3] = 0; // Alpha = 0
                        }
                    }

                    ctx.putImageData(imageData, 0, 0);
                    canvas.toBlob((blob) => {
                        resolve(blob || file);
                    }, 'image/png');
                };
                img.src = e.target?.result as string;
            };
            reader.readAsDataURL(file);
        });
    };

    const handleUpload = async (pegawai: Pegawai, type: 'signature' | 'paraf', source: Blob | File) => {
        setSaving(pegawai.id);
        try {
            // Auto-Transparent processing for uploaded files
            let processedSource = source;
            if (source instanceof File || (source instanceof Blob && source.type !== 'image/png')) {
                processedSource = await processToTransparent(source);
            }

            const formData = new FormData();
            const fileName = type === 'signature' ? `ttd_${pegawai.id}.png` : `paraf_${pegawai.id}.png`;
            const file = new File([processedSource], fileName, { type: 'image/png' });
            formData.append('file', file);

            const res = type === 'signature' 
                ? await api.profilPegawai.uploadSignature(pegawai.user_id, formData)
                : await api.profilPegawai.uploadParaf(pegawai.user_id, formData);

            if (res.success) {
                // Update local state
                setPegawaiList(prev => prev.map(p => 
                    p.id === pegawai.id 
                    ? { ...p, [type === 'signature' ? 'signature_image' : 'paraf_image']: res.path } 
                    : p
                ));
                setActiveModal(null);
            } else {
                alert(res.message || 'Gagal menyimpan');
            }
        } catch (error) {
            console.error('Upload error:', error);
            alert('Terjadi kesalahan sistem');
        } finally {
            setSaving(null);
        }
    };

    const handleClearImage = async (pegawai: Pegawai, type: 'signature' | 'paraf') => {
        if (!confirm(`Hapus ${type === 'signature' ? 'Tanda Tangan' : 'Paraf'} untuk ${pegawai.nama_lengkap}?`)) return;
        
        setSaving(pegawai.id);
        try {
            // We reuse the update profile endpoint to set it to null/empty
            const res = await api.profilPegawai.update(pegawai.id, {
                [type === 'signature' ? 'signature_image' : 'paraf_image']: null
            });

            if (res.success) {
                setPegawaiList(prev => prev.map(p => 
                    p.id === pegawai.id 
                    ? { ...p, [type === 'signature' ? 'signature_image' : 'paraf_image']: null } 
                    : p
                ));
            }
        } catch (error) {
            console.error('Clear error:', error);
        } finally {
            setSaving(null);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight">Manajemen E-Signature</h1>
                    <p className="text-sm text-slate-500">Kelola tanda tangan dan paraf seluruh personil</p>
                </div>
                
                <div className="relative w-full md:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                        type="text" 
                        placeholder="Cari Nama atau NIP..." 
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="input-modern w-full pl-10"
                    />
                </div>
            </div>

            <div className="card-modern overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100">
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Personil</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tanda Tangan</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Paraf</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-20 text-center">
                                        <Loader2 className="animate-spin inline-block text-slate-300" size={32} />
                                    </td>
                                </tr>
                            ) : filteredPegawai.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-slate-400 font-medium">Data tidak ditemukan</td>
                                </tr>
                            ) : filteredPegawai.map(p => (
                                <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-ppm-blue/5 flex items-center justify-center text-ppm-blue shrink-0">
                                                <User size={20} />
                                            </div>
                                            <div>
                                                <div className="text-sm font-bold text-slate-800 leading-tight">{p.nama_lengkap}</div>
                                                <div className="text-[10px] font-medium text-slate-400 tracking-wider mt-0.5">{p.nip || 'NIP -'}</div>
                                                <div className="text-[10px] font-bold text-slate-500 uppercase mt-0.5 truncate max-w-[200px]">{p.jabatan_nama || p.bidang_nama || '-'}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            {p.signature_image ? (
                                                <>
                                                    <div className="relative group w-32">
                                                        <div className="bg-white border-2 border-slate-100 rounded-xl p-2 h-16 flex items-center justify-center shadow-sm group-hover:border-ppm-blue/30 transition-all overflow-hidden cursor-help">
                                                            {/* Actual Image - hidden by default */}
                                                            <img 
                                                                src={p.signature_image.startsWith('http') ? p.signature_image : `${import.meta.env.VITE_API_URL || ''}${p.signature_image}`} 
                                                                className="max-h-full max-w-full object-contain opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                                                                alt="TTD"
                                                                onError={(e) => {
                                                                    (e.target as HTMLImageElement).src = 'https://placehold.co/200x100?text=Error';
                                                                }}
                                                            />
                                                            {/* Mask Placeholder - shown by default */}
                                                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50/50 group-hover:opacity-0 transition-opacity duration-300 pointer-events-none">
                                                                <Shield size={16} className="text-slate-400 mb-1" />
                                                                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">Hover to View</span>
                                                            </div>
                                                        </div>
                                                        <button 
                                                            onClick={() => handleClearImage(p, 'signature')}
                                                            className="absolute -top-2 -right-2 bg-white text-red-500 p-1.5 rounded-full border border-red-100 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50 z-10"
                                                            title="Hapus Tanda Tangan"
                                                        >
                                                            <X size={14} />
                                                        </button>
                                                    </div>
                                                    <div className="w-6 h-6 rounded-full bg-green-50 flex items-center justify-center text-green-500 shadow-sm border border-green-100" title="Tersedia">
                                                        <Check size={14} strokeWidth={3} />
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="flex items-center gap-2 text-slate-300">
                                                    <div className="w-32 h-16 border-2 border-dashed border-slate-100 rounded-xl flex items-center justify-center bg-slate-50/50">
                                                        <PenTool size={20} className="opacity-20" />
                                                    </div>
                                                    <X size={16} className="text-slate-200" />
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            {p.paraf_image ? (
                                                <>
                                                    <div className="relative group w-24">
                                                        <div className="bg-white border-2 border-slate-100 rounded-xl p-2 h-16 flex items-center justify-center shadow-sm group-hover:border-ppm-blue/30 transition-all overflow-hidden cursor-help">
                                                            {/* Actual Image */}
                                                            <img 
                                                                src={p.paraf_image.startsWith('http') ? p.paraf_image : `${import.meta.env.VITE_API_URL || ''}${p.paraf_image}`} 
                                                                className="max-h-full max-w-full object-contain opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                                                                alt="Paraf"
                                                                onError={(e) => {
                                                                    (e.target as HTMLImageElement).src = 'https://placehold.co/100x100?text=Error';
                                                                }}
                                                            />
                                                            {/* Mask Placeholder */}
                                                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50/50 group-hover:opacity-0 transition-opacity duration-300 pointer-events-none">
                                                                <Shield size={14} className="text-slate-400" />
                                                            </div>
                                                        </div>
                                                        <button 
                                                            onClick={() => handleClearImage(p, 'paraf')}
                                                            className="absolute -top-2 -right-2 bg-white text-red-500 p-1.5 rounded-full border border-red-100 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50 z-10"
                                                            title="Hapus Paraf"
                                                        >
                                                            <X size={14} />
                                                        </button>
                                                    </div>
                                                    <div className="w-6 h-6 rounded-full bg-green-50 flex items-center justify-center text-green-500 shadow-sm border border-green-100" title="Tersedia">
                                                        <Check size={14} strokeWidth={3} />
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="flex items-center gap-2 text-slate-300">
                                                    <div className="w-24 h-16 border-2 border-dashed border-slate-100 rounded-xl flex items-center justify-center bg-slate-50/50">
                                                        <ImageIcon size={20} className="opacity-20" />
                                                    </div>
                                                    <X size={16} className="text-slate-200" />
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button 
                                                onClick={() => { setActiveModal({ type: 'signature', pegawai: p }); setEsignMode('draw'); }}
                                                className="p-2 text-slate-500 hover:text-ppm-blue hover:bg-ppm-blue/5 rounded-lg transition-colors"
                                                title="Upload Tanda Tangan"
                                            >
                                                <PenTool size={18} />
                                            </button>
                                            <button 
                                                onClick={() => { setActiveModal({ type: 'paraf', pegawai: p }); setEsignMode('draw'); }}
                                                className="p-2 text-slate-500 hover:text-ppm-blue hover:bg-ppm-blue/5 rounded-lg transition-colors"
                                                title="Upload Paraf"
                                            >
                                                <ImageIcon size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MODAL UPLOAD / DRAW */}
            {activeModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setActiveModal(null)} />
                    <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl relative animate-in zoom-in-95 duration-300">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-black text-slate-800">
                                    {activeModal.type === 'signature' ? 'Update Tanda Tangan' : 'Update Paraf'}
                                </h2>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{activeModal.pegawai.nama_lengkap}</p>
                            </div>
                            <button onClick={() => setActiveModal(null)} className="p-2 text-slate-400 hover:bg-slate-50 rounded-xl transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            <div className="flex bg-slate-100 p-1 rounded-2xl">
                                <button 
                                    onClick={() => setEsignMode('draw')}
                                    className={`flex-1 py-2 text-xs font-black rounded-xl transition-all ${esignMode === 'draw' ? 'bg-white shadow-md text-slate-800' : 'text-slate-500'}`}
                                >
                                    GAMBAR LANGSUNG
                                </button>
                                <button 
                                    onClick={() => setEsignMode('upload')}
                                    className={`flex-1 py-2 text-xs font-black rounded-xl transition-all ${esignMode === 'upload' ? 'bg-white shadow-md text-slate-800' : 'text-slate-500'}`}
                                >
                                    UPLOAD FILE
                                </button>
                            </div>

                            {esignMode === 'draw' ? (
                                <div className="flex justify-center">
                                    <SignatureCanvas 
                                        onSave={(blob) => handleUpload(activeModal.pegawai, activeModal.type, blob)}
                                        width={480}
                                        height={240}
                                    />
                                </div>
                            ) : (
                                <div className="border-2 border-dashed border-slate-200 rounded-3xl p-12 flex flex-col items-center justify-center gap-4 bg-slate-50 hover:bg-slate-100 transition-all cursor-pointer relative">
                                    <input 
                                        type="file" 
                                        accept="image/*" 
                                        className="absolute inset-0 opacity-0 cursor-pointer" 
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) handleUpload(activeModal.pegawai, activeModal.type, file);
                                        }}
                                    />
                                    <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-slate-300 shadow-sm">
                                        <Upload size={32} />
                                    </div>
                                    <div className="text-center">
                                        <p className="text-sm font-bold text-slate-700">Pilih file gambar untuk diupload</p>
                                        <p className="text-xs text-slate-400 mt-1">Format PNG, JPG, atau WEBP (Maks. 5MB)</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
