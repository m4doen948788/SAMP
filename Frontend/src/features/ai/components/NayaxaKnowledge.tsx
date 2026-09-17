import React, { useState, useEffect } from 'react';
import { api } from '@/src/services/api';
import { Plus, Edit2, Trash2, X, Check, Brain, Database } from 'lucide-react';
import { BaseDataTable } from '@/src/features/common/components/BaseDataTable';

interface KnowledgeItem {
    id: number;
    category: string;
    feature_name: string;
    content: string; // From DB: content
    description?: string; // Fallback for legacy
    is_active: number;
    created_at: string;
}

const NayaxaKnowledge = () => {
    const [data, setData] = useState<KnowledgeItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'KNOWLEDGE' | 'GLOSSARY'>('KNOWLEDGE');
    
    // Add State
    const [isAdding, setIsAdding] = useState(false);
    const [newFeature, setNewFeature] = useState('');
    const [newDesc, setNewDesc] = useState('');
    
    // Edit State
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editFeature, setEditFeature] = useState('');
    const [editDesc, setEditDesc] = useState('');
    const [editActive, setEditActive] = useState(1);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await api.nayaxa.knowledge.getAll();
            if (res.success) {
                // Map description to content if needed (standardizing)
                const mappedData = res.data.map((item: any) => ({
                    ...item,
                    content: item.content || item.description || ''
                }));
                setData(mappedData);
            }
            else setError(res.message);
        } catch {
            setError('Gagal mengambil data pengetahuan.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleAdd = async () => {
        if (!newFeature.trim() || !newDesc.trim()) return;
        try {
            const res = await api.nayaxa.knowledge.create({
                category: activeTab,
                feature_name: newFeature,
                content: newDesc,
                is_active: 1
            });
            if (res.success) {
                setNewFeature('');
                setNewDesc('');
                setIsAdding(false);
                fetchData();
            }
        } catch {
            alert('Gagal menambah data.');
        }
    };

    const handleUpdate = async (id: number) => {
        if (!editFeature.trim() || !editDesc.trim()) return;
        try {
            const res = await api.nayaxa.knowledge.update(id, {
                feature_name: editFeature,
                content: editDesc,
                is_active: editActive
            });
            if (res.success) {
                setEditingId(null);
                fetchData();
            }
        } catch {
            alert('Gagal memperbarui data.');
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Hapus data ini? Nayaxa akan kehilangan memori terkait hal ini.')) return;
        try {
            const res = await api.nayaxa.knowledge.delete(id);
            if (res.success) fetchData();
        } catch {
            alert('Gagal menghapus data.');
        }
    };

    // Filter data based on active tab
    // CLEAN UI STRATEGY: Hide auto-generated system logs (Snapshots/Analysis)
    const filteredData = data.filter(item => {
        const isSystemLog = item.category?.includes('System Snapshot') || item.category?.includes('Dashboard Analysis');
        if (isSystemLog) return false; // Never show system logs in UI

        if (activeTab === 'KNOWLEDGE') {
            return item.category !== 'GLOSSARY';
        }
        return item.category === 'GLOSSARY';
    });

    const columns = [
        {
            header: activeTab === 'KNOWLEDGE' ? 'Nama Fitur / Konteks' : 'Istilah / Aturan',
            key: 'feature_name',
            className: 'font-bold text-indigo-700 w-1/4'
        },
        {
            header: activeTab === 'KNOWLEDGE' ? 'Deskripsi Pengetahuan (Memori AI)' : 'Definisi / Strategi Kueri',
            key: 'content',
            className: 'text-slate-600 italic text-xs'
        },
        {
            header: 'Status',
            key: 'is_active',
            render: (item: KnowledgeItem) => (
                <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${item.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                    {item.is_active ? 'AKTIF' : 'NONAKTIF'}
                </span>
            )
        }
    ];

    return (
        <div className="p-4 space-y-4">
            {/* Tab Switcher */}
            <div className="flex bg-slate-100 p-1 rounded-2xl w-fit border border-slate-200">
                <button 
                    onClick={() => { setActiveTab('KNOWLEDGE'); setIsAdding(false); setEditingId(null); }}
                    className={`flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'KNOWLEDGE' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <Brain size={18} />
                    Basis Pengetahuan
                </button>
                <button 
                    onClick={() => { setActiveTab('GLOSSARY'); setIsAdding(false); setEditingId(null); }}
                    className={`flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'GLOSSARY' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <Database size={18} />
                    Glosarium Sistem
                </button>
            </div>

            <BaseDataTable<KnowledgeItem>
                title={activeTab === 'KNOWLEDGE' ? "Nayaxa Knowledge Base" : "System Glossary & Rules"}
                subtitle={activeTab === 'KNOWLEDGE' ? "Kelola memori dan informasi bisnis untuk Nayaxa." : "Kelola pemetaan database dan aturan teknis yang mengunci kecerdasan Nayaxa."}
                data={filteredData}
                columns={columns}
                loading={loading}
                error={error}
                searchPlaceholder={activeTab === 'KNOWLEDGE' ? "Cari pengetahuan..." : "Cari aturan glosarium..."}
                addButtonLabel={activeTab === 'KNOWLEDGE' ? "Tambah Memori" : "Tambah Aturan"}
                onAddClick={() => setIsAdding(true)}
                editingId={editingId}
                renderAddRow={() => isAdding && (
                    <tr className="bg-indigo-50/50">
                        <td className="p-4 border-b border-indigo-100 text-center text-indigo-400">
                             {activeTab === 'KNOWLEDGE' ? <Brain size={20} className="mx-auto" /> : <Edit2 size={20} className="mx-auto" />}
                        </td>
                        <td className="p-2 border-b border-indigo-100">
                            <input 
                                autoFocus 
                                type="text" 
                                className="input-modern bg-white" 
                                placeholder={activeTab === 'KNOWLEDGE' ? "Nama Fitur..." : "Istilah..."}
                                value={newFeature} 
                                onChange={e => setNewFeature(e.target.value)} 
                            />
                        </td>
                        <td className="p-2 border-b border-indigo-100">
                            <textarea 
                                className="input-modern bg-white text-xs h-20" 
                                placeholder={activeTab === 'KNOWLEDGE' ? "Jelaskan detail yang harus diingat Nayaxa..." : "Tuliskan aturan teknis atau definisi..."}
                                value={newDesc} 
                                onChange={e => setNewDesc(e.target.value)} 
                            />
                        </td>
                        <td className="p-2 border-b border-indigo-100" />
                        <td className="p-2 border-b border-indigo-100">
                            <div className="flex justify-center gap-2">
                                <button onClick={handleAdd} className="bg-emerald-600 text-white p-2 rounded-xl hover:bg-emerald-700 shadow-sm"><Check size={18} /></button>
                                <button onClick={() => setIsAdding(false)} className="bg-white border border-slate-200 text-slate-400 p-2 rounded-xl hover:bg-slate-50 shadow-sm"><X size={18} /></button>
                            </div>
                        </td>
                    </tr>
                )}
                renderEditRow={(item) => (
                    <tr key={item.id} className="bg-amber-50/30">
                        <td className="p-4 border-b border-amber-100 text-center text-amber-500 font-mono text-xs">{item.id}</td>
                        <td className="p-2 border-b border-amber-100">
                            <input 
                                autoFocus 
                                type="text" 
                                className="input-modern bg-white" 
                                value={editFeature} 
                                onChange={e => setEditFeature(e.target.value)} 
                            />
                        </td>
                        <td className="p-2 border-b border-amber-100">
                            <textarea 
                                className="input-modern bg-white text-xs h-24" 
                                value={editDesc} 
                                onChange={e => setEditDesc(e.target.value)} 
                            />
                        </td>
                        <td className="p-2 border-b border-amber-100">
                            <select 
                                className="input-modern bg-white text-xs" 
                                value={editActive} 
                                onChange={e => setEditActive(Number(e.target.value))}
                            >
                                <option value={1}>AKTIF</option>
                                <option value={0}>NONAKTIF</option>
                            </select>
                        </td>
                        <td className="p-2 border-b border-amber-100">
                            <div className="flex justify-center gap-2">
                                <button onClick={() => handleUpdate(item.id)} className="bg-emerald-600 text-white p-2 rounded-xl hover:bg-emerald-700 shadow-sm"><Check size={18} /></button>
                                <button onClick={() => setEditingId(null)} className="bg-white border border-slate-200 text-slate-400 p-2 rounded-xl hover:bg-slate-50 shadow-sm"><X size={18} /></button>
                            </div>
                        </td>
                    </tr>
                )}
                renderActions={(item) => (
                    <>
                        <button 
                            onClick={() => { 
                                setEditingId(item.id); 
                                setEditFeature(item.feature_name); 
                                setEditDesc(item.content); 
                                setEditActive(item.is_active);
                            }} 
                            className="text-slate-400 hover:text-indigo-600 p-2 hover:bg-indigo-50 rounded-xl transition-colors"
                        >
                            <Edit2 size={16} />
                        </button>
                        <button 
                            onClick={() => handleDelete(item.id)} 
                            className="text-slate-400 hover:text-rose-600 p-2 hover:bg-rose-50 rounded-xl transition-colors"
                        >
                            <Trash2 size={16} />
                        </button>
                    </>
                )}
            />
        </div>
    );
};

export default NayaxaKnowledge;
