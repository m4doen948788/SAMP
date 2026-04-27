import React, { useState, useEffect } from 'react';
import { api } from '@/src/services/api';
import { Plus, Edit2, Trash2, X, Check, Loader2, Settings, FileText, Type, Move, Image as ImageIcon } from 'lucide-react';
import { useLabels } from '@/src/contexts/LabelContext';
import { BaseDataTable } from '@/src/features/common/components/BaseDataTable';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

interface SuratTemplate {
    id: number;
    nama_jenis_surat: string;
    font_family: string;
    font_size: number;
    margin_top: number;
    margin_bottom: number;
    margin_left: number;
    margin_right: number;
    paper_size: string;
    is_nomor_surat_required: boolean;
    is_kop_surat_required: boolean;
    logo_path: string | null;
    isi_template: string | null;
    is_pegawai_required: boolean;
    has_tujuan: boolean;
    has_pembuka: boolean;
    has_identitas_pegawai: boolean;
    has_detail_cuti: boolean;
    has_penutup: boolean;
}

const PengaturanSurat = () => {
    const { getLabel } = useLabels();
    const [templates, setTemplates] = useState<SuratTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<SuratTemplate | null>(null);

    const [formData, setFormData] = useState<Partial<SuratTemplate>>({
        nama_jenis_surat: '',
        font_family: 'Arial',
        font_size: 12,
        margin_top: 20,
        margin_bottom: 20,
        margin_left: 30,
        margin_right: 20,
        paper_size: 'A4',
        is_nomor_surat_required: true,
        is_kop_surat_required: true,
        logo_path: '',
        isi_template: '',
        is_pegawai_required: false,
        has_tujuan: false,
        has_pembuka: false,
        has_identitas_pegawai: false,
        has_detail_cuti: false,
        has_penutup: false
    });

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await api.suratTemplate.getAll();
            if (res.success) setTemplates(res.data);
            else setError(res.message);
        } catch { setError('Gagal mengambil data pengaturan surat'); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchData(); }, []);

    const handleOpenAdd = () => {
        setEditingTemplate(null);
        setFormData({
            nama_jenis_surat: '',
            font_family: 'Arial',
            font_size: 12,
            margin_top: 20,
            margin_bottom: 20,
            margin_left: 30,
            margin_right: 20,
            paper_size: 'A4',
            is_nomor_surat_required: true,
            is_kop_surat_required: true,
            logo_path: '',
            isi_template: '',
            is_pegawai_required: false,
            has_tujuan: false,
            has_pembuka: false,
            has_identitas_pegawai: false,
            has_detail_cuti: false,
            has_penutup: false
        });
        setShowModal(true);
    };

    const handleOpenEdit = (template: SuratTemplate) => {
        setEditingTemplate(template);
        setFormData(template);
        setShowModal(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingTemplate) {
                const res = await api.suratTemplate.update(editingTemplate.id, formData);
                if (res.success) { setShowModal(false); fetchData(); }
            } else {
                const res = await api.suratTemplate.create(formData);
                if (res.success) { setShowModal(false); fetchData(); }
            }
        } catch { alert('Gagal menyimpan pengaturan surat'); }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Hapus pengaturan untuk jenis surat ini?')) return;
        try {
            const res = await api.suratTemplate.delete(id);
            if (res.success) fetchData();
        } catch { alert('Gagal menghapus data'); }
    };

    const columns = [
        {
            header: 'Jenis Surat',
            key: 'nama_jenis_surat',
            className: 'font-bold text-slate-800'
        },
        {
            header: 'Font',
            render: (item: SuratTemplate) => `${item.font_family} (${item.font_size}pt)`,
            className: 'text-slate-600'
        },
        {
            header: 'Margin (T, R, B, L)',
            render: (item: SuratTemplate) => `${item.margin_top}, ${item.margin_right}, ${item.margin_bottom}, ${item.margin_left} mm`,
            className: 'text-slate-500 font-mono text-xs'
        },
        {
            header: 'Kertas',
            key: 'paper_size',
            className: 'text-slate-600'
        },
        {
            header: 'Fitur',
            render: (item: SuratTemplate) => (
                <div className="flex gap-2">
                    {item.is_nomor_surat_required && <span className="badge-modern bg-blue-50 text-blue-600 border-blue-100 px-2 py-0.5 text-[10px]">Nomor</span>}
                    {item.is_kop_surat_required && <span className="badge-modern bg-purple-50 text-purple-600 border-purple-100 px-2 py-0.5 text-[10px]">Kop</span>}
                </div>
            )
        }
    ];

    return (
        <div className="space-y-6">
            <BaseDataTable<SuratTemplate>
                title="Pengaturan Surat Dinamis"
                subtitle="Konfigurasi format, margin, dan jenis surat yang tersedia di menu Buat Surat."
                data={templates}
                columns={columns}
                loading={loading}
                error={error}
                searchPlaceholder="Cari jenis surat..."
                addButtonLabel="Tambah Format Surat"
                onAddClick={handleOpenAdd}
                renderActions={(item) => (
                    <>
                        <button onClick={() => handleOpenEdit(item)} className="text-slate-400 hover:text-indigo-600 p-2 hover:bg-indigo-50/80 rounded-xl transition-colors"><Edit2 size={16} /></button>
                        <button onClick={() => handleDelete(item.id)} className="text-slate-400 hover:text-rose-600 p-2 hover:bg-rose-50/80 rounded-xl transition-colors"><Trash2 size={16} /></button>
                    </>
                )}
            />

            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-slate-100 scale-in-center">
                        <div className="p-6 border-b border-slate-50 flex items-center justify-between sticky top-0 bg-white/80 backdrop-blur-md z-10">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                                    <Settings size={20} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-black text-slate-800 tracking-tight">
                                        {editingTemplate ? 'Edit Pengaturan Surat' : 'Tambah Jenis Surat Baru'}
                                    </h3>
                                    <p className="text-xs text-slate-400 font-medium">Konfigurasi format dokumen surat</p>
                                </div>
                            </div>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-100 rounded-full transition-all"><X size={20} /></button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-8 space-y-6 bg-slate-50/50">
                            {/* Bagian 1: Identitas */}
                            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <FileText size={16} className="text-indigo-500" />
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Bagian 1: Identitas Surat</span>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold text-slate-700 ml-1">Nama Jenis Surat <span className="text-rose-500">*</span></label>
                                    <input 
                                        required
                                        type="text" 
                                        className="input-modern w-full" 
                                        placeholder="Contoh: Surat Perintah Tugas"
                                        value={formData.nama_jenis_surat}
                                        onChange={e => setFormData({...formData, nama_jenis_surat: e.target.value})}
                                    />
                                </div>
                            </div>

                            {/* Bagian 2: Tipografi & Kertas */}
                            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <Type size={16} className="text-indigo-500" />
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Bagian 2: Tipografi & Kertas</span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-bold text-slate-700 ml-1">Jenis Font</label>
                                        <select 
                                            className="input-modern w-full"
                                            value={formData.font_family}
                                            onChange={e => setFormData({...formData, font_family: e.target.value})}
                                        >
                                            <option value="Arial">Arial</option>
                                            <option value="Times New Roman">Times New Roman</option>
                                            <option value="Courier New">Courier New</option>
                                            <option value="Verdana">Verdana</option>
                                            <option value="Georgia">Georgia</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-bold text-slate-700 ml-1">Ukuran Font (pt)</label>
                                        <input 
                                            type="number" 
                                            className="input-modern w-full"
                                            value={formData.font_size}
                                            onChange={e => setFormData({...formData, font_size: parseInt(e.target.value)})}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-bold text-slate-700 ml-1">Ukuran Kertas</label>
                                        <select 
                                            className="input-modern w-full"
                                            value={formData.paper_size}
                                            onChange={e => setFormData({...formData, paper_size: e.target.value})}
                                        >
                                            <option value="A4">A4 (210 x 297 mm)</option>
                                            <option value="F4">F4 / Legal (215 x 330 mm)</option>
                                            <option value="Letter">Letter (215.9 x 279.4 mm)</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Bagian 3: Margin */}
                            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <Move size={16} className="text-indigo-500" />
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Bagian 3: Margin Halaman (mm)</span>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-bold text-slate-700 ml-1 text-center block">Atas</label>
                                        <input 
                                            type="number" 
                                            className="input-modern w-full text-center"
                                            value={formData.margin_top}
                                            onChange={e => setFormData({...formData, margin_top: parseInt(e.target.value)})}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-bold text-slate-700 ml-1 text-center block">Bawah</label>
                                        <input 
                                            type="number" 
                                            className="input-modern w-full text-center"
                                            value={formData.margin_bottom}
                                            onChange={e => setFormData({...formData, margin_bottom: parseInt(e.target.value)})}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-bold text-slate-700 ml-1 text-center block">Kiri</label>
                                        <input 
                                            type="number" 
                                            className="input-modern w-full text-center"
                                            value={formData.margin_left}
                                            onChange={e => setFormData({...formData, margin_left: parseInt(e.target.value)})}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-bold text-slate-700 ml-1 text-center block">Kanan</label>
                                        <input 
                                            type="number" 
                                            className="input-modern w-full text-center"
                                            value={formData.margin_right}
                                            onChange={e => setFormData({...formData, margin_right: parseInt(e.target.value)})}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Bagian 4: Opsi & Fitur */}
                            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
                                <div className="flex items-center gap-2 mb-2">
                                    <ImageIcon size={16} className="text-indigo-500" />
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Bagian 4: Opsi Komponen & Fitur</span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 bg-slate-50/50 p-5 rounded-2xl border border-slate-100/50">
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-0.5">
                                            <div className="text-[13px] font-bold text-slate-700">Butuh Nomor Surat?</div>
                                            <div className="text-[10px] text-slate-400 font-medium italic">Tampilkan input nomor surat</div>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input type="checkbox" className="sr-only peer" checked={formData.is_nomor_surat_required} onChange={e => setFormData({...formData, is_nomor_surat_required: e.target.checked})} />
                                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                                        </label>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-0.5">
                                            <div className="text-[13px] font-bold text-slate-700">Gunakan Kop Surat?</div>
                                            <div className="text-[10px] text-slate-400 font-medium italic">Tampilkan kop surat instansi</div>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input type="checkbox" className="sr-only peer" checked={formData.is_kop_surat_required} onChange={e => {
                                                const checked = e.target.checked;
                                                setFormData({
                                                    ...formData, 
                                                    is_kop_surat_required: checked,
                                                    logo_path: checked ? formData.logo_path : null
                                                });
                                            }} />
                                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                                        </label>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-0.5">
                                            <div className="text-[13px] font-bold text-slate-700">Butuh Data Pegawai?</div>
                                            <div className="text-[10px] text-slate-400 font-medium italic">Auto-fill dari database pegawai</div>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input type="checkbox" className="sr-only peer" checked={formData.is_pegawai_required} onChange={e => setFormData({...formData, is_pegawai_required: e.target.checked})} />
                                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                                        </label>
                                    </div>
                                </div>
                                
                                {formData.is_kop_surat_required && (
                                    <div className="space-y-1.5 animate-in slide-in-from-top-2 duration-300 bg-indigo-50/30 p-4 rounded-2xl border border-indigo-100/50">
                                        <label className="text-[11px] font-bold text-slate-700 ml-1">Logo Spesifik (Opsional)</label>
                                        <select 
                                            className="input-modern w-full bg-white"
                                            value={formData.logo_path || ''}
                                            onChange={e => setFormData({...formData, logo_path: e.target.value || null})}
                                        >
                                            <option value="">Gunakan Logo Default Instansi</option>
                                            <option value="garuda">Lambang Garuda (Bupati/Pimpinan Tinggi)</option>
                                            <option value="tegar_beriman">Logo Tegar Beriman (Kabupaten Bogor)</option>
                                        </select>
                                        <p className="text-[10px] text-slate-400 ml-1 font-medium">Pilih logo khusus jika jenis surat ini memerlukan logo yang berbeda dari default.</p>
                                    </div>
                                )}
                            </div>

                            {/* Bagian 5: Form Terstruktur (Cuti/Lainnya) */}
                            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <Settings size={16} className="text-indigo-500" />
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Bagian 5: Konfigurasi Form Terstruktur</span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 bg-indigo-50/20 p-5 rounded-2xl border border-indigo-100/30">
                                    <div className="flex items-center justify-between">
                                        <div className="text-[12px] font-bold text-slate-700">Tujuan Surat</div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input type="checkbox" className="sr-only peer" checked={formData.has_tujuan} onChange={e => setFormData({...formData, has_tujuan: e.target.checked})} />
                                            <div className="w-10 h-5 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-indigo-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all"></div>
                                        </label>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="text-[12px] font-bold text-slate-700">Kalimat Pembuka</div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input type="checkbox" className="sr-only peer" checked={formData.has_pembuka} onChange={e => setFormData({...formData, has_pembuka: e.target.checked})} />
                                            <div className="w-10 h-5 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-indigo-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all"></div>
                                        </label>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="text-[12px] font-bold text-slate-700">Identitas Pegawai</div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input type="checkbox" className="sr-only peer" checked={formData.has_identitas_pegawai} onChange={e => setFormData({...formData, has_identitas_pegawai: e.target.checked})} />
                                            <div className="w-10 h-5 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-indigo-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all"></div>
                                        </label>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="text-[12px] font-bold text-slate-700">Detail Permintaan Cuti</div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input type="checkbox" className="sr-only peer" checked={formData.has_detail_cuti} onChange={e => setFormData({...formData, has_detail_cuti: e.target.checked})} />
                                            <div className="w-10 h-5 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-indigo-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all"></div>
                                        </label>
                                    </div>
                                    <div className="flex items-center justify-between col-span-1 md:col-span-2">
                                        <div className="text-[12px] font-bold text-slate-700">Kalimat Penutup</div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input type="checkbox" className="sr-only peer" checked={formData.has_penutup} onChange={e => setFormData({...formData, has_penutup: e.target.checked})} />
                                            <div className="w-10 h-5 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-indigo-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all"></div>
                                        </label>
                                    </div>
                                </div>
                                <p className="text-[10px] text-slate-400 italic px-1">* Mengaktifkan opsi ini akan memunculkan form input terstruktur di menu Buat Surat.</p>
                            </div>

                            {/* Bagian 6: Draft Template */}
                            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <FileText size={16} className="text-indigo-500" />
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Bagian 6: Draft Isi Surat Otomatis</span>
                                </div>
                                <div className="space-y-3">
                                    <div className="text-[10px] text-amber-700 bg-amber-50 p-3 rounded-2xl border border-amber-100 leading-relaxed font-medium">
                                        💡 <strong>Tips:</strong> Gunakan placeholder berikut untuk auto-fill data pegawai: 
                                        <div className="flex flex-wrap gap-1.5 mt-2">
                                            <code className="bg-white px-2 py-0.5 border rounded-md text-[9px]">{"{{nama}}"}</code>
                                            <code className="bg-white px-2 py-0.5 border rounded-md text-[9px]">{"{{nip}}"}</code>
                                            <code className="bg-white px-2 py-0.5 border rounded-md text-[9px]">{"{{jabatan}}"}</code>
                                            <code className="bg-white px-2 py-0.5 border rounded-md text-[9px]">{"{{pangkat_golongan}}"}</code>
                                            <code className="bg-white px-2 py-0.5 border rounded-md text-[9px]">{"{{instansi}}"}</code>
                                        </div>
                                    </div>
                                    <div className="prose-editor-container bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-inner">
                                        <ReactQuill 
                                            theme="snow"
                                            value={formData.isi_template || ''}
                                            onChange={val => setFormData({...formData, isi_template: val})}
                                            className="h-[300px] mb-12"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 flex items-center justify-end gap-3 sticky bottom-0 bg-white/90 backdrop-blur-md pb-1 z-10">
                                <button type="button" onClick={() => setShowModal(false)} className="btn-modern-secondary px-6 py-2.5 text-xs">Batal</button>
                                <button type="submit" className="btn-modern px-8 py-2.5 flex items-center gap-2 text-xs">
                                    <Check size={16} />
                                    <span>{editingTemplate ? 'Simpan Perubahan' : 'Tambah Jenis Surat'}</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PengaturanSurat;
