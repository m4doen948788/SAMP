import React, { useState, useEffect, useMemo } from 'react';
import { api } from '@/src/services/api';
import { Plus, Edit2, Trash2, X, Check, Loader2, Settings, FileText, Type, Move, Image as ImageIcon, List, ZoomIn, ZoomOut, RefreshCw, Eye } from 'lucide-react';
import { useLabels } from '@/src/contexts/LabelContext';
import { useAuth } from '@/src/contexts/AuthContext';
import { BaseDataTable } from '@/src/features/common/components/BaseDataTable';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { SearchableSelect } from '@/src/features/common/components/SearchableSelect';

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
    line_height: number;
    text_align: string;
    master_dokumen_id: number | null;
    kop_line_style: string;
    has_event_details: boolean;
    use_global_settings: boolean;
    paragraph_spacing_before: number;
    paragraph_spacing_after: number;
    first_line_indent: number;
}

interface GlobalSettings {
    font_family: string;
    font_size: number;
    line_height: number;
    text_align: string;
    paper_size: string;
    margin_top: number;
    margin_bottom: number;
    margin_left: number;
    margin_right: number;
    paragraph_spacing_before: number;
    paragraph_spacing_after: number;
    first_line_indent: number;
}

const PengaturanSurat = () => {
    const { getLabel } = useLabels();
    const { user } = useAuth();
    const [templates, setTemplates] = useState<SuratTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [instanceProfile, setInstanceProfile] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [masterDokumenList, setMasterDokumenList] = useState<any[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<SuratTemplate | null>(null);
    const [globalSettings, setGlobalSettings] = useState<GlobalSettings | null>(null);
    const [showGlobalModal, setShowGlobalModal] = useState(false);
    const [globalDrafts, setGlobalDrafts] = useState<Record<string, string>>({});
    const [templateDrafts, setTemplateDrafts] = useState<Record<string, string>>({});
    const [globalFormData, setGlobalFormData] = useState<GlobalSettings>({
        font_family: 'Arial',
        font_size: 12,
        line_height: 1.5,
        text_align: 'justify',
        paper_size: 'A4',
        margin_top: 20,
        margin_bottom: 20,
        margin_left: 30,
        margin_right: 20,
        paragraph_spacing_before: 0,
        paragraph_spacing_after: 0,
        first_line_indent: 0
    });

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
        has_penutup: false,
        line_height: 1.5,
        text_align: 'justify',
        master_dokumen_id: null,
        kop_line_style: 'double',
        has_event_details: false,
        use_global_settings: true,
        paragraph_spacing_before: 0,
        paragraph_spacing_after: 0,
        first_line_indent: 0
    });

    const [previewTemplateId, setPreviewTemplateId] = useState<number | null>(null);
    const [previewZoom, setPreviewZoom] = useState(0.55);

    const dummyContent = useMemo(() => `
        <div style="font-weight: bold; text-align: center; margin-bottom: 20px; text-transform: uppercase;">Contoh Format Surat Dinas</div>
        <p>Nomor : 000/123-Sekret/2026<br/>Sifat : Penting<br/>Lampiran : -<br/>Hal : Pemberitahuan Pelaksanaan Kegiatan</p>
        <div style="margin-top: 20px;">
            <p>Yth. Bapak/Ibu Pimpinan Unit Kerja,<br/>di Tempat</p>
        </div>
        <div style="margin-top: 20px;">
            <p>Dengan hormat, sehubungan dengan adanya rencana pelaksanaan kegiatan koordinasi antar bidang di lingkungan Pemerintah Kabupaten Bogor, maka melalui surat ini kami bermaksud untuk menyampaikan rancangan jadwal kegiatan tersebut.</p>
            <p>Kegiatan ini bertujuan untuk mempererat sinergi dan harmonisasi dalam rangka mencapai target kinerja yang telah ditetapkan pada Rencana Kerja Pemerintah Daerah tahun berjalan.</p>
            <p>Koordinasi ini akan mencakup evaluasi capaian triwulan sebelumnya serta penajaman strategi untuk percepatan program-program prioritas daerah yang berdampak langsung pada masyarakat.</p>
            <p>Demikian informasi ini kami sampaikan, atas perhatian dan kerja samanya kami ucapkan terima kasih.</p>
        </div>
        <div style="margin-top: 40px; margin-left: 60%;">
            <p><strong>KEPALA DINAS,</strong></p>
            <br/><br/><br/>
            <p><strong>NAMA PEJABAT LENGKAP</strong><br/>NIP. 19800101 200501 1 001</p>
        </div>
    `, []);

    const previewContent = useMemo(() => {
        if (previewTemplateId) {
            const template = templates.find(t => t.id === previewTemplateId);
            return template?.isi_template || dummyContent;
        }
        return dummyContent;
    }, [previewTemplateId, templates, dummyContent]);

    const getPaperDimensions = (size: string) => {
        const s = size?.toUpperCase();
        switch(s) {
            case 'F4': return { width: '215mm', height: '330mm' };
            case 'LETTER': return { width: '215.9mm', height: '279.4mm' };
            default: return { width: '210mm', height: '297mm' };
        }
    };

    const toTitleCase = (str: string) => {
        if (!str) return '';
        return str.toLowerCase().replace(/(?:^|\s)\w/g, function(match) {
            return match.toUpperCase();
        });
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            const [tempRes, jenisDokRes, masterDokRes, profileRes] = await Promise.all([
                api.suratTemplate.getAll(),
                api.jenisDokumen.getAll(),
                api.masterDataConfig.getDataByTable('master_dokumen'),
                user?.instansi_id ? api.internalInstansi.get(user.instansi_id) : Promise.resolve({ success: false })
            ]);

            if (tempRes.success) setTemplates(tempRes.data);
            else setError(tempRes.message);

            if (profileRes.success) {
                setInstanceProfile(profileRes.data.instansiDetail);
            }

            if (jenisDokRes.success && masterDokRes.success) {
                const suratType = jenisDokRes.data.find((j: any) => j.nama === 'Surat');
                if (suratType) {
                    const filtered = masterDokRes.data.filter((d: any) => d.jenis_dokumen_id === suratType.id);
                    setMasterDokumenList(filtered);
                }
            }

            const globalRes = await api.suratTemplate.getGlobal();
            if (globalRes.success) {
                setGlobalSettings(globalRes.data);
                setGlobalFormData(globalRes.data);
                setGlobalDrafts({});
            }
        } catch { setError('Gagal mengambil data pengaturan surat'); }
        finally { setLoading(false); }
    };

    const handleSaveGlobalSettings = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await api.suratTemplate.updateGlobal(globalFormData);
            if (res.success) {
                setShowGlobalModal(false);
                fetchData();
            } else {
                alert(res.message || 'Gagal menyimpan pengaturan global');
            }
        } catch (err) {
            console.error('Global settings save error:', err);
            alert('Terjadi kesalahan sistem saat menyimpan');
        }
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
            has_penutup: false,
            line_height: 1.5,
            text_align: 'justify',
            master_dokumen_id: null,
            kop_line_style: 'double',
            has_event_details: false,
            use_global_settings: true,
            paragraph_spacing_before: 0,
            paragraph_spacing_after: 0,
            first_line_indent: 0
        });
        setTemplateDrafts({});
        setShowModal(true);
    };

    const handleOpenEdit = (template: SuratTemplate) => {
        setEditingTemplate(template);
        setFormData({
            ...template,
            use_global_settings: !!template.use_global_settings,
            paragraph_spacing_before: template.paragraph_spacing_before || 0,
            paragraph_spacing_after: template.paragraph_spacing_after || 0,
            first_line_indent: template.first_line_indent || 0
        });
        setTemplateDrafts({});
        setShowModal(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingTemplate) {
                const res = await api.suratTemplate.update(editingTemplate.id, formData);
                if (res.success) { setShowModal(false); fetchData(); }
                else { alert(res.message || 'Gagal memperbarui pengaturan'); }
            } else {
                const res = await api.suratTemplate.create(formData);
                if (res.success) { setShowModal(false); fetchData(); }
                else { alert(res.message || 'Gagal membuat pengaturan baru'); }
            }
        } catch (err: any) { 
            console.error('Save error:', err);
            alert('Terjadi kesalahan sistem saat menyimpan'); 
        }
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
                    {!!item.is_nomor_surat_required && <span className="badge-modern bg-blue-50 text-blue-600 border-blue-100 px-2 py-0.5 text-[10px]">Nomor</span>}
                    {!!item.is_kop_surat_required && <span className="badge-modern bg-purple-50 text-purple-600 border-purple-100 px-2 py-0.5 text-[10px]">Kop</span>}
                </div>
            )
        }
    ];

    return (
        <div className="space-y-6">
            {/* Global Settings Summary Card */}
            <div className="bg-white rounded-[32px] p-8 shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden relative group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/50 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-indigo-100/50 transition-colors duration-500"></div>
                
                <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-start gap-4">
                        <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-200 ring-4 ring-indigo-50">
                            <Settings size={28} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-slate-800 tracking-tight uppercase">Konfigurasi Global</h2>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Standar format dokumen institusi</p>
                            
                            {globalSettings && (
                                <div className="flex flex-wrap gap-4 mt-4">
                                    <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-100">
                                        <Type size={12} className="text-slate-400" />
                                        <span className="text-[10px] font-bold text-slate-600">{globalSettings.font_family}, {globalSettings.font_size}pt</span>
                                    </div>
                                    <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-100">
                                        <Move size={12} className="text-slate-400" />
                                        <span className="text-[10px] font-bold text-slate-600">M: {globalSettings.margin_top},{globalSettings.margin_right},{globalSettings.margin_bottom},{globalSettings.margin_left}</span>
                                    </div>
                                    <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-100">
                                        <FileText size={12} className="text-slate-400" />
                                        <span className="text-[10px] font-bold text-slate-600">{globalSettings.paper_size}</span>
                                    </div>
                                    <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-100">
                                        <List size={12} className="text-slate-400" />
                                        <span className="text-[10px] font-bold text-slate-600">Spasi: {globalSettings.line_height}, P: {globalSettings.paragraph_spacing_before}/{globalSettings.paragraph_spacing_after}pt, Indent: {globalSettings.first_line_indent}mm</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                    
                    <button 
                        onClick={() => setShowGlobalModal(true)}
                        className="btn-modern px-6 py-3 flex items-center gap-2 text-xs self-start md:self-center shadow-indigo-200"
                    >
                        <Edit2 size={14} />
                        <span>Ubah Pengaturan Global</span>
                    </button>
                </div>
            </div>

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
                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between">
                                        <label className="text-[11px] font-bold text-slate-700 ml-1">Kategori Jenis Dokumen (Untuk Badge)</label>
                                        <span className="text-[9px] text-slate-400">Hubungkan ke master dokumen</span>
                                    </div>
                                    <SearchableSelect 
                                        label="Pilih Kategori..."
                                        value={formData.master_dokumen_id}
                                        options={masterDokumenList}
                                        displayField="dokumen"
                                        onChange={(val) => setFormData({...formData, master_dokumen_id: val})}
                                    />
                                    <p className="text-[9px] text-slate-400 ml-1 font-medium italic">* Ini menentukan teks yang muncul di badge daftar surat.</p>
                                </div>
                                <div className="flex items-center justify-between py-2 px-4 bg-indigo-50/30 rounded-2xl border border-indigo-100/30 mt-4">
                                    <div className="space-y-0.5">
                                        <div className="text-[12px] font-bold text-indigo-700">Ikuti Pengaturan Global?</div>
                                        <div className="text-[10px] text-indigo-400 font-medium italic">Gunakan margin & font default instansi</div>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input 
                                            type="checkbox" 
                                            className="sr-only peer" 
                                            checked={formData.use_global_settings} 
                                            onChange={e => setFormData({...formData, use_global_settings: e.target.checked})} 
                                        />
                                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                                    </label>
                                </div>
                            </div>

                            {/* Bagian 2: Tipografi & Kertas */}
                            {(!formData.use_global_settings) && (
                            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4 animate-in slide-in-from-top-2 duration-300">
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
                                            <option value="F4">F4 (215 x 330 mm)</option>
                                            <option value="Letter">Letter (215.9 x 279.4 mm)</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-bold text-slate-700 ml-1">Spasi Baris</label>
                                        <select 
                                            className="input-modern w-full"
                                            value={formData.line_height !== undefined && formData.line_height !== null ? Number(formData.line_height).toString() : '1.5'}
                                            onChange={e => {
                                                const val = parseFloat(e.target.value);
                                                setFormData({...formData, line_height: val});
                                            }}
                                        >
                                            <option value="1">Single (1.0)</option>
                                            <option value="1.15">1.15</option>
                                            <option value="1.25">1.25</option>
                                            <option value="1.35">1.35</option>
                                            <option value="1.5">1.5</option>
                                            <option value="2">Double (2.0)</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-bold text-slate-700 ml-1">Perataan Teks</label>
                                        <select 
                                            className="input-modern w-full"
                                            value={formData.text_align}
                                            onChange={e => setFormData({...formData, text_align: e.target.value})}
                                        >
                                            <option value="justify">Rata Kiri Kanan (Justify)</option>
                                            <option value="left">Rata Kiri (Left)</option>
                                            <option value="center">Rata Tengah (Center)</option>
                                            <option value="right">Rata Kanan (Right)</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                            )}

                            {/* Bagian 3: Margin */}
                            {(!formData.use_global_settings) && (
                            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4 animate-in slide-in-from-top-2 duration-300">
                                <div className="flex items-center gap-2 mb-2">
                                    <Move size={16} className="text-indigo-500" />
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Bagian 3: Margin Halaman (mm)</span>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="space-y-1.5 text-center">
                                        <label className="text-[11px] font-bold text-slate-700 block">Atas</label>
                                        <input 
                                            type="number" 
                                            className="input-modern w-full text-center"
                                            value={formData.margin_top}
                                            onChange={e => setFormData({...formData, margin_top: parseInt(e.target.value)})}
                                        />
                                    </div>
                                    <div className="space-y-1.5 text-center">
                                        <label className="text-[11px] font-bold text-slate-700 block">Bawah</label>
                                        <input 
                                            type="number" 
                                            className="input-modern w-full text-center"
                                            value={formData.margin_bottom}
                                            onChange={e => setFormData({...formData, margin_bottom: parseInt(e.target.value)})}
                                        />
                                    </div>
                                    <div className="space-y-1.5 text-center">
                                        <label className="text-[11px] font-bold text-slate-700 block">Kiri</label>
                                        <input 
                                            type="number" 
                                            className="input-modern w-full text-center"
                                            value={formData.margin_left}
                                            onChange={e => setFormData({...formData, margin_left: parseInt(e.target.value)})}
                                        />
                                    </div>
                                    <div className="space-y-1.5 text-center">
                                        <label className="text-[11px] font-bold text-slate-700 block">Kanan</label>
                                        <input 
                                            type="number" 
                                            className="input-modern w-full text-center"
                                            value={formData.margin_right}
                                            onChange={e => setFormData({...formData, margin_right: parseInt(e.target.value)})}
                                        />
                                    </div>
                                </div>
                            </div>
                            )}

                            {/* Bagian Baru: Pengaturan Paragraf Lanjutan */}
                            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <List size={16} className="text-indigo-500" />
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pengaturan Paragraf Lanjutan</span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-bold text-slate-700 ml-1">Spasi Sebelum (Before)</label>
                                        <input 
                                            type="number" 
                                            step="0.1"
                                            className="input-modern w-full"
                                            value={templateDrafts.paragraph_spacing_before ?? formData.paragraph_spacing_before}
                                            onChange={e => {
                                                const raw = e.target.value;
                                                setTemplateDrafts(prev => ({...prev, paragraph_spacing_before: raw}));
                                                const val = parseFloat(raw);
                                                if (!isNaN(val)) setFormData({...formData, paragraph_spacing_before: val});
                                            }}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-bold text-slate-700 ml-1">Spasi Sesudah (After)</label>
                                        <input 
                                            type="number" 
                                            step="0.1"
                                            className="input-modern w-full"
                                            value={templateDrafts.paragraph_spacing_after ?? formData.paragraph_spacing_after}
                                            onChange={e => {
                                                const raw = e.target.value;
                                                setTemplateDrafts(prev => ({...prev, paragraph_spacing_after: raw}));
                                                const val = parseFloat(raw);
                                                if (!isNaN(val)) setFormData({...formData, paragraph_spacing_after: val});
                                            }}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-bold text-slate-700 ml-1">Indentasi Baris Pertama (mm)</label>
                                        <input 
                                            type="number" 
                                            step="0.1"
                                            className="input-modern w-full"
                                            value={templateDrafts.first_line_indent ?? formData.first_line_indent}
                                            onChange={e => {
                                                const raw = e.target.value;
                                                setTemplateDrafts(prev => ({...prev, first_line_indent: raw}));
                                                const val = parseFloat(raw);
                                                if (!isNaN(val)) setFormData({...formData, first_line_indent: val});
                                            }}
                                        />
                                    </div>
                                </div>
                                <p className="text-[9px] text-slate-400 italic px-1">* Nilai spasi Before/After biasanya dalam satuan pt atau relatif terhadap baris.</p>
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

                                {!!formData.is_kop_surat_required && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in slide-in-from-top-2 duration-300">
                                        <div className="flex items-center gap-3 py-3 px-4 bg-indigo-50/50 rounded-2xl border border-indigo-100/50">
                                            <input 
                                                id="kop_no_logo_v2"
                                                type="checkbox" 
                                                className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                                checked={formData.logo_path === 'none'}
                                                onChange={e => setFormData({...formData, logo_path: e.target.checked ? 'none' : ''})}
                                            />
                                            <label htmlFor="kop_no_logo_v2" className="text-[13px] font-bold text-indigo-700 cursor-pointer leading-tight">Gunakan Kop Tanpa Logo (Teks Rata Kiri)</label>
                                        </div>
                                    </div>
                                )}
                                
                                {!!formData.is_kop_surat_required && (
                                    <div className="space-y-1.5 animate-in slide-in-from-top-2 duration-300 bg-indigo-50/30 p-4 rounded-2xl border border-indigo-100/50">
                                        <label className="text-[11px] font-bold text-slate-700 ml-1">Logo Spesifik (Opsional)</label>
                                        <select 
                                            className="input-modern w-full bg-white"
                                            value={formData.logo_path || ''}
                                            onChange={e => setFormData({...formData, logo_path: e.target.value || null})}
                                        >
                                            <option value="">Gunakan Logo Default Instansi</option>
                                            <option value="none">Tanpa Logo (Kop Teks Rata Kiri)</option>
                                            <option value="garuda">Lambang Garuda (Bupati/Pimpinan Tinggi)</option>
                                            <option value="tegar_beriman">Logo Tegar Beriman (Kabupaten Bogor)</option>
                                        </select>
                                        <p className="text-[10px] text-slate-400 ml-1 font-medium">Pilih logo khusus jika jenis surat ini memerlukan logo yang berbeda dari default.</p>
                                    </div>
                                )}
                                {!!formData.is_kop_surat_required && (
                                    <div className="space-y-1.5 animate-in slide-in-from-top-2 duration-300 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                        <label className="text-[11px] font-bold text-slate-700 ml-1">Gaya Garis Kop Surat</label>
                                        <select 
                                            className="input-modern w-full bg-white font-bold"
                                            value={formData.kop_line_style || 'double'}
                                            onChange={e => setFormData({...formData, kop_line_style: e.target.value})}
                                        >
                                            <option value="none">Tanpa Garis Pembatas</option>
                                            <option value="single">Satu Garis Tipis</option>
                                            <option value="double">Dua Garis Sama Tebal</option>
                                            <option value="heavy-light">Dua Garis (Atas Tebal, Bawah Tipis)</option>
                                            <option value="light-heavy">Dua Garis (Atas Tipis, Bawah Tebal)</option>
                                            <option value="thick">Satu Garis Sangat Tebal</option>
                                        </select>
                                        <div className="flex flex-col gap-1 mt-2 px-1">
                                            {formData.kop_line_style === 'none' && (
                                                <div className="h-[2px] w-full border border-dashed border-slate-300 rounded"></div>
                                            )}
                                            <div className={`h-1 w-full bg-black ${formData.kop_line_style === 'single' ? 'h-[1px]' : (formData.kop_line_style === 'thick' ? 'h-1' : 'hidden')}`}></div>
                                            {formData.kop_line_style === 'double' && (
                                                <div className="space-y-[1px]">
                                                    <div className="h-[2px] w-full bg-black"></div>
                                                    <div className="h-[2px] w-full bg-black"></div>
                                                </div>
                                            )}
                                            {formData.kop_line_style === 'heavy-light' && (
                                                <div className="space-y-[1px]">
                                                    <div className="h-[3px] w-full bg-black"></div>
                                                    <div className="h-[1px] w-full bg-black"></div>
                                                </div>
                                            )}
                                            {formData.kop_line_style === 'light-heavy' && (
                                                <div className="space-y-[1px]">
                                                    <div className="h-[1px] w-full bg-black"></div>
                                                    <div className="h-[3px] w-full bg-black"></div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Bagian 5: Form Terstruktur (Cuti/Lainnya) */}
                            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <Settings size={16} className="text-indigo-500" />
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Bagian 5: Konfigurasi Form Terstruktur</span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 bg-slate-50/50 p-6 rounded-2xl border border-slate-100">
                                    <div className="flex items-center justify-between py-1">
                                        <div className="text-[13px] font-bold text-slate-700">Tujuan Surat</div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input type="checkbox" className="sr-only peer" checked={formData.has_tujuan} onChange={e => setFormData({...formData, has_tujuan: e.target.checked})} />
                                            <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-indigo-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                                        </label>
                                    </div>
                                    <div className="flex items-center justify-between py-1">
                                        <div className="text-[13px] font-bold text-slate-700">Kalimat Pembuka</div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input type="checkbox" className="sr-only peer" checked={formData.has_pembuka} onChange={e => setFormData({...formData, has_pembuka: e.target.checked})} />
                                            <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-indigo-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                                        </label>
                                    </div>
                                    <div className="flex items-center justify-between py-1">
                                        <div className="text-[13px] font-bold text-slate-700">Identitas Pegawai</div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input type="checkbox" className="sr-only peer" checked={formData.is_pegawai_required} disabled />
                                            <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-indigo-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all opacity-50"></div>
                                        </label>
                                    </div>
                                    <div className="flex items-center justify-between py-1">
                                        <div className="text-[13px] font-bold text-slate-700">Detail Permintaan Cuti</div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input type="checkbox" className="sr-only peer" checked={formData.has_detail_cuti} onChange={e => setFormData({...formData, has_detail_cuti: e.target.checked})} />
                                            <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-indigo-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                                        </label>
                                    </div>
                                    <div className="flex items-center justify-between py-1">
                                        <div className="text-[13px] font-bold text-slate-700">Detail Acara (Rapat/Kegiatan)</div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input type="checkbox" className="sr-only peer" checked={formData.has_event_details} onChange={e => setFormData({...formData, has_event_details: e.target.checked})} />
                                            <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-indigo-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                                        </label>
                                    </div>
                                    <div className="flex items-center justify-between py-1">
                                        <div className="text-[13px] font-bold text-slate-700">Kalimat Penutup</div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input type="checkbox" className="sr-only peer" checked={formData.has_penutup} onChange={e => setFormData({...formData, has_penutup: e.target.checked})} />
                                            <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-indigo-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                                        </label>
                                    </div>
                                </div>
                                <p className="text-[10px] text-slate-400 italic px-1">* Mengaktifkan opsi ini akan memunculkan form input terstruktur di menu Buat Surat.</p>
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

            {/* Modal Pengaturan Global */}
            {showGlobalModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-6xl max-h-[95vh] flex flex-col border border-slate-100 overflow-hidden scale-in-center">
                        {/* Header */}
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm">
                                    <Settings size={20} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-black text-slate-800 tracking-tight">Pengaturan Global Surat</h3>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Default font, margin, dan spacing untuk seluruh dokumen</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-px bg-slate-100 mx-2"></div>
                                <button onClick={() => setShowGlobalModal(false)} className="text-slate-400 hover:text-slate-600 p-2.5 hover:bg-slate-100 rounded-full transition-all group">
                                    <X size={20} className="group-hover:rotate-90 transition-transform duration-300" />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 flex overflow-hidden bg-slate-50">
                            {/* Left Panel: Form */}
                            <div className="w-full lg:w-1/2 overflow-y-auto p-8 scrollbar-thin">
                                <form onSubmit={handleSaveGlobalSettings} className="space-y-6">
                                    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Type size={16} className="text-indigo-500" />
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipografi & Kertas (Default)</span>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <label className="text-[11px] font-bold text-slate-700 ml-1">Jenis Font</label>
                                                <select 
                                                    className="input-modern w-full"
                                                    value={globalFormData.font_family}
                                                    onChange={e => setGlobalFormData({...globalFormData, font_family: e.target.value})}
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
                                                    value={globalFormData.font_size || ''}
                                                    onChange={e => setGlobalFormData({...globalFormData, font_size: parseInt(e.target.value) || 0})}
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[11px] font-bold text-slate-700 ml-1">Spasi Baris</label>
                                                <select 
                                                    className="input-modern w-full"
                                                    value={globalFormData.line_height !== undefined && globalFormData.line_height !== null ? Number(globalFormData.line_height).toString() : '1.5'}
                                                    onChange={e => {
                                                        const val = parseFloat(e.target.value);
                                                        setGlobalFormData({...globalFormData, line_height: val});
                                                    }}
                                                >
                                                    <option value="1">Single (1.0)</option>
                                                    <option value="1.15">1.15</option>
                                                    <option value="1.25">1.25</option>
                                                    <option value="1.35">1.35</option>
                                                    <option value="1.5">1.5</option>
                                                    <option value="2">Double (2.0)</option>
                                                </select>
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[11px] font-bold text-slate-700 ml-1">Ukuran Kertas</label>
                                                <select 
                                                    className="input-modern w-full"
                                                    value={globalFormData.paper_size}
                                                    onChange={e => setGlobalFormData({...globalFormData, paper_size: e.target.value})}
                                                >
                                                    <option value="A4">A4</option>
                                                    <option value="F4">F4</option>
                                                    <option value="Letter">Letter</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Move size={16} className="text-indigo-500" />
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Margin Halaman (mm) (Default)</span>
                                        </div>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                            <div className="space-y-1.5 text-center">
                                                <label className="text-[11px] font-bold text-slate-700 block">Atas</label>
                                                <input type="number" className="input-modern w-full text-center" value={globalFormData.margin_top || 0} onChange={e => setGlobalFormData({...globalFormData, margin_top: parseInt(e.target.value) || 0})} />
                                            </div>
                                            <div className="space-y-1.5 text-center">
                                                <label className="text-[11px] font-bold text-slate-700 block">Bawah</label>
                                                <input type="number" className="input-modern w-full text-center" value={globalFormData.margin_bottom || 0} onChange={e => setGlobalFormData({...globalFormData, margin_bottom: parseInt(e.target.value) || 0})} />
                                            </div>
                                            <div className="space-y-1.5 text-center">
                                                <label className="text-[11px] font-bold text-slate-700 block">Kiri</label>
                                                <input type="number" className="input-modern w-full text-center" value={globalFormData.margin_left || 0} onChange={e => setGlobalFormData({...globalFormData, margin_left: parseInt(e.target.value) || 0})} />
                                            </div>
                                            <div className="space-y-1.5 text-center">
                                                <label className="text-[11px] font-bold text-slate-700 block">Kanan</label>
                                                <input type="number" className="input-modern w-full text-center" value={globalFormData.margin_right || 0} onChange={e => setGlobalFormData({...globalFormData, margin_right: parseInt(e.target.value) || 0})} />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <List size={16} className="text-indigo-500" />
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Paragraf Lanjutan (Default)</span>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div className="space-y-1.5">
                                                <label className="text-[11px] font-bold text-slate-700 ml-1 text-xs">Spacing Before (pt)</label>
                                                <input 
                                                    type="number" 
                                                    step="0.1" 
                                                    className="input-modern w-full" 
                                                    value={globalDrafts.paragraph_spacing_before ?? globalFormData.paragraph_spacing_before} 
                                                    onChange={e => {
                                                        const raw = e.target.value;
                                                        setGlobalDrafts(prev => ({...prev, paragraph_spacing_before: raw}));
                                                        const val = parseFloat(raw);
                                                        if (!isNaN(val)) setGlobalFormData({...globalFormData, paragraph_spacing_before: val});
                                                    }} 
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[11px] font-bold text-slate-700 ml-1 text-xs">Spacing After (pt)</label>
                                                <input 
                                                    type="number" 
                                                    step="0.1" 
                                                    className="input-modern w-full" 
                                                    value={globalDrafts.paragraph_spacing_after ?? globalFormData.paragraph_spacing_after} 
                                                    onChange={e => {
                                                        const raw = e.target.value;
                                                        setGlobalDrafts(prev => ({...prev, paragraph_spacing_after: raw}));
                                                        const val = parseFloat(raw);
                                                        if (!isNaN(val)) setGlobalFormData({...globalFormData, paragraph_spacing_after: val});
                                                    }} 
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[11px] font-bold text-slate-700 ml-1 text-xs">Indent Baris 1 (mm)</label>
                                                <input 
                                                    type="number" 
                                                    step="0.1" 
                                                    className="input-modern w-full" 
                                                    value={globalDrafts.first_line_indent ?? globalFormData.first_line_indent} 
                                                    onChange={e => {
                                                        const raw = e.target.value;
                                                        setGlobalDrafts(prev => ({...prev, first_line_indent: raw}));
                                                        const val = parseFloat(raw);
                                                        if (!isNaN(val)) setGlobalFormData({...globalFormData, first_line_indent: val});
                                                    }} 
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-4 flex items-center justify-end gap-3 sticky bottom-0 bg-white/90 backdrop-blur-md py-4 -mx-8 px-8 border-t border-slate-100 z-10">
                                        <button type="button" onClick={() => setShowGlobalModal(false)} className="btn-modern-secondary px-6 py-2.5 text-xs">Batal</button>
                                        <button type="submit" className="btn-modern px-8 py-2.5 flex items-center gap-2 text-xs">
                                            <Check size={16} />
                                            <span>Simpan Pengaturan Global</span>
                                        </button>
                                    </div>
                                </form>
                            </div>

                            {/* Right Panel: Live Preview */}
                            <div className="hidden lg:flex w-1/2 flex-col bg-slate-200/50 border-l border-slate-100">
                                <div className="p-4 bg-white border-b border-slate-200 flex items-center justify-between shrink-0">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center">
                                            <Eye size={16} />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-black text-slate-800 uppercase leading-none tracking-wider">Live Preview</span>
                                            <select 
                                                className="text-[10px] font-bold text-indigo-600 bg-transparent border-none p-0 focus:ring-0 cursor-pointer"
                                                value={previewTemplateId || ''}
                                                onChange={(e) => setPreviewTemplateId(e.target.value ? parseInt(e.target.value) : null)}
                                            >
                                                <option value="">-- Gunakan Teks Dummy --</option>
                                                {templates.map(t => (
                                                    <option key={t.id} value={t.id}>{t.nama_jenis_surat}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                                        <button onClick={() => setPreviewZoom(prev => Math.max(0.3, prev - 0.05))} className="w-7 h-7 flex items-center justify-center text-slate-500 hover:bg-white rounded-lg transition-all"><ZoomOut size={14} /></button>
                                        <span className="text-[9px] font-black text-slate-600 w-10 text-center">{Math.round(previewZoom * 100)}%</span>
                                        <button onClick={() => setPreviewZoom(prev => Math.min(1.0, prev + 0.05))} className="w-7 h-7 flex items-center justify-center text-slate-500 hover:bg-white rounded-lg transition-all"><ZoomIn size={14} /></button>
                                        <button onClick={() => setPreviewZoom(0.55)} className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-indigo-600 transition-colors"><RefreshCw size={12} /></button>
                                    </div>
                                </div>

                                <div className="flex-1 overflow-auto p-12 scrollbar-thin flex flex-col items-center">
                                    {/* Wrapper dengan Indikator Dimensi */}
                                    <div 
                                        className="relative transition-all duration-300 origin-top mb-20"
                                        style={{ 
                                            transform: `scale(${previewZoom})`,
                                            width: getPaperDimensions(globalFormData.paper_size).width,
                                            height: getPaperDimensions(globalFormData.paper_size).height
                                        }}
                                    >
                                        {/* Label Lebar (Atas) */}
                                        <div className="absolute -top-10 left-0 right-0 flex items-center justify-between px-0">
                                            <div className="w-px h-3 bg-slate-400"></div>
                                            <div className="flex-1 h-px bg-slate-300 mx-2 flex items-center justify-center">
                                                <span className="bg-slate-800 text-white text-[12px] font-black px-2 py-0.5 rounded-full shadow-lg whitespace-nowrap">
                                                    Lebar: {getPaperDimensions(globalFormData.paper_size).width}
                                                </span>
                                            </div>
                                            <div className="w-px h-3 bg-slate-400"></div>
                                        </div>

                                        {/* Label Panjang (Kiri) */}
                                        <div className="absolute top-0 bottom-0 -left-12 flex flex-col items-center justify-between py-0">
                                            <div className="h-px w-3 bg-slate-400"></div>
                                            <div className="flex-1 w-px bg-slate-300 my-2 flex items-center justify-center">
                                                <span className="bg-slate-800 text-white text-[12px] font-black px-2 py-0.5 rounded-full shadow-lg whitespace-nowrap" style={{ transform: 'rotate(-90deg)' }}>
                                                    Panjang: {getPaperDimensions(globalFormData.paper_size).height}
                                                </span>
                                            </div>
                                            <div className="h-px w-3 bg-slate-400"></div>
                                        </div>

                                        {/* Label Lebar (Bawah) */}
                                        <div className="absolute -bottom-10 left-0 right-0 flex items-center justify-between px-0">
                                            <div className="w-px h-3 bg-slate-400"></div>
                                            <div className="flex-1 h-px bg-slate-300 mx-2 flex items-center justify-center">
                                                <span className="bg-slate-400 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm whitespace-nowrap opacity-60">
                                                    {getPaperDimensions(globalFormData.paper_size).width}
                                                </span>
                                            </div>
                                            <div className="w-px h-3 bg-slate-400"></div>
                                        </div>

                                        {/* Label Panjang (Kanan) */}
                                        <div className="absolute top-0 bottom-0 -right-12 flex flex-col items-center justify-between py-0">
                                            <div className="h-px w-3 bg-slate-400"></div>
                                            <div className="flex-1 w-px bg-slate-300 my-2 flex items-center justify-center">
                                                <span className="bg-slate-400 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm whitespace-nowrap opacity-60" style={{ transform: 'rotate(90deg)' }}>
                                                    {getPaperDimensions(globalFormData.paper_size).height}
                                                </span>
                                            </div>
                                            <div className="h-px w-3 bg-slate-400"></div>
                                        </div>

                                        {/* Kertas Utama */}
                                        <div 
                                            className="bg-white shadow-2xl border border-slate-200 text-black text-left transition-all duration-300"
                                            style={{
                                                width: getPaperDimensions(globalFormData.paper_size).width,
                                                height: getPaperDimensions(globalFormData.paper_size).height,
                                                paddingTop: `${globalFormData.margin_top}mm`,
                                                paddingBottom: `${globalFormData.margin_bottom}mm`,
                                                paddingLeft: `${globalFormData.margin_left}mm`,
                                                paddingRight: `${globalFormData.margin_right}mm`,
                                                fontFamily: `${globalFormData.font_family}, sans-serif`,
                                                fontSize: `${globalFormData.font_size}pt`,
                                                lineHeight: globalFormData.line_height,
                                                textAlign: globalFormData.text_align as any,
                                                boxSizing: 'border-box'
                                            }}
                                        >
                                            <style dangerouslySetInnerHTML={{ __html: `
                                                #preview-content p { 
                                                    margin-top: ${globalFormData.paragraph_spacing_before}pt;
                                                    margin-bottom: ${globalFormData.paragraph_spacing_after}pt;
                                                    text-indent: ${globalFormData.first_line_indent}mm;
                                                }
                                            `}} />
                                            
                                            {/* KOP Preview */}
                                            {(() => {
                                                const selectedTemplate = templates.find(t => t.id === previewTemplateId);
                                                const isCuti = selectedTemplate?.nama_jenis_surat?.toLowerCase().includes('cuti');
                                                const isStructured = isCuti || selectedTemplate?.master_dokumen_id !== null;
                                                
                                                if (selectedTemplate && !selectedTemplate.is_kop_surat_required) return null;

                                                if (isStructured || selectedTemplate?.logo_path === 'none') {
                                                    return (
                                                        <div className="text-left font-bold mb-8 uppercase leading-tight">
                                                            PEMERINTAH DAERAH KABUPATEN BOGOR<br/>
                                                            <span className="underline">{instanceProfile?.nama_instansi_kop || instanceProfile?.instansi || 'NAMA INSTANSI'}</span>
                                                        </div>
                                                    );
                                                }

                                                return (
                                                    <div className="text-center mb-6" style={{ fontFamily: 'Arial' }}>
                                                        <table className="w-full border-collapse mb-1">
                                                            <tbody>
                                                                <tr>
                                                                    <td className="w-[95px] text-left align-middle">
                                                                        <img src={selectedTemplate?.logo_path === 'garuda' ? '/logo-garuda.png' : (instanceProfile?.logo_kop_path || '/logo-bgr.png')} style={{ width: '85px', height: 'auto', display: 'block' }} alt="Logo" />
                                                                    </td>
                                                                    <td className="text-center align-middle">
                                                                        <div className="text-[12pt] font-bold leading-tight">PEMERINTAH KABUPATEN BOGOR</div>
                                                                        <div className="text-[14pt] font-bold leading-tight uppercase">
                                                                            {instanceProfile?.nama_instansi_kop || instanceProfile?.instansi || 'NAMA INSTANSI'}
                                                                        </div>
                                                                        <div className="text-[8pt] font-normal leading-tight mt-1">
                                                                            {instanceProfile?.alamat || 'Alamat Lengkap Instansi'} Kode Pos {instanceProfile?.kode_pos || ''} Telp: {instanceProfile?.telepon_kop || ''} Faks: {instanceProfile?.faks_kop || ''}<br/>
                                                                            Laman: {instanceProfile?.website_kop || '-'} | Pos-el: {instanceProfile?.email_kop || '-'}
                                                                        </div>
                                                                    </td>
                                                                    <td className="w-[95px]"></td>
                                                                </tr>
                                                            </tbody>
                                                        </table>
                                                        {/* Double Border Simulation */}
                                                        <div style={{ borderBottom: '2.25pt solid #000', marginTop: '4pt' }}></div>
                                                        <div style={{ borderBottom: '0.75pt solid #000', marginTop: '2pt' }}></div>
                                                    </div>
                                                );
                                            })()}

                                            {/* Date & Location */}
                                            <div className="text-right mb-6">
                                                {toTitleCase(instanceProfile?.kecamatan || 'Cibinong')}, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                                            </div>

                                            {/* Metadata Table (Nomor, Hal, dll) */}
                                            {(() => {
                                                const selectedTemplate = templates.find(t => t.id === previewTemplateId);
                                                const isCuti = selectedTemplate?.nama_jenis_surat?.toLowerCase().includes('cuti');
                                                if (isCuti) return null;

                                                return (
                                                    <table className="w-full border-collapse mb-8">
                                                        <tbody>
                                                            <tr className="align-top">
                                                                <td className="w-[15%]">Nomor</td>
                                                                <td className="w-[2%]">:</td>
                                                                <td className="w-[48%]">000/123-Sekret/2026</td>
                                                                <td className="w-[35%]">Kepada</td>
                                                            </tr>
                                                            <tr className="align-top">
                                                                <td>Sifat</td>
                                                                <td>:</td>
                                                                <td>Penting</td>
                                                                <td rowSpan={3} className="pt-0">
                                                                    Yth. Bapak/Ibu Pimpinan Unit Kerja<br/>
                                                                    di<br/>
                                                                    <span className="inline-block ml-6">Tempat</span>
                                                                </td>
                                                            </tr>
                                                            <tr className="align-top">
                                                                <td>Lampiran</td>
                                                                <td>:</td>
                                                                <td>-</td>
                                                            </tr>
                                                            <tr className="align-top">
                                                                <td>Hal</td>
                                                                <td>:</td>
                                                                <td><strong>{selectedTemplate?.nama_jenis_surat || 'Pemberitahuan Pelaksanaan Kegiatan'}</strong></td>
                                                            </tr>
                                                        </tbody>
                                                    </table>
                                                );
                                            })()}

                                            {/* Main Content */}
                                            <div id="preview-content" dangerouslySetInnerHTML={{ __html: previewContent }} />

                                            {/* Signature Simulation */}
                                            <div className="mt-12 flex justify-end">
                                                <div className="w-[50%] text-center uppercase">
                                                    <div className="text-left inline-block">
                                                        KEPALA DINAS,<br/><br/><br/><br/>
                                                        <strong>NAMA PEJABAT LENGKAP</strong><br/>
                                                        NIP. 19800101 200501 1 001
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PengaturanSurat;
