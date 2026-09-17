import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../../../services/api';
import { Plus, Edit2, Trash2, X, Check, Loader2, Settings, FileText, Type, Move, Image as ImageIcon, List, ZoomIn, ZoomOut, Eye, RefreshCw } from 'lucide-react';
import { useLabels } from '../../../contexts/LabelContext';
import { useAuth } from '../../../contexts/AuthContext';
import { BaseDataTable } from '../../common/components/BaseDataTable';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { SearchableSelect } from '../../common/components/SearchableSelect';
import { getPaperDimensions } from '../utils/notulenComposers';

interface NotulenTemplate {
    id: number;
    nama_template: string;
    font_family: string;
    font_size: number;
    margin_top: number;
    margin_bottom: number;
    margin_left: number;
    margin_right: number;
    paper_size: string;
    isi_template: string | null;
    is_kop_surat_required: boolean;
    logo_path: string | null;
    line_height: number;
    text_align: string;
    master_dokumen_id: number | null;
    kop_line_style: string;
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

const PengaturanNotulen = () => {
    const { getLabel } = useLabels();
    const { user } = useAuth();
    const [templates, setTemplates] = useState<NotulenTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [instanceProfile, setInstanceProfile] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [masterDokumenList, setMasterDokumenList] = useState<any[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<NotulenTemplate | null>(null);
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

    const [formData, setFormData] = useState<Partial<NotulenTemplate>>({
        nama_template: '',
        font_family: 'Arial',
        font_size: 12,
        margin_top: 20,
        margin_bottom: 20,
        margin_left: 30,
        margin_right: 20,
        paper_size: 'A4',
        is_kop_surat_required: true,
        logo_path: '',
        isi_template: '',
        line_height: 1.5,
        text_align: 'justify',
        master_dokumen_id: null,
        kop_line_style: 'double',
        use_global_settings: true,
        paragraph_spacing_before: 0,
        paragraph_spacing_after: 0,
        first_line_indent: 0
    });

    const [previewTemplateId, setPreviewTemplateId] = useState<number | null>(null);
    const [previewZoom, setPreviewZoom] = useState(0.55);

    const dummyContent = useMemo(() => `
        <div style="font-weight: bold; text-align: center; margin-bottom: 20px; text-transform: uppercase;">NOTULEN RAPAT</div>
        <p>Agenda : Rapat Koordinasi Program Kerja Triwulan II<br/>Hari/Tanggal : Selasa, 5 Mei 2026<br/>Waktu : 09.00 - 11.30 WIB<br/>Tempat : Ruang Rapat Utama</p>
        
        <div style="margin-top: 20px;">
            <p><strong>I. Pembukaan:</strong></p>
            <p>Rapat dibuka oleh Pimpinan Rapat pada pukul 09.00 WIB dengan agenda utama membahas progres capaian indikator kinerja utama pada triwulan kedua tahun berjalan.</p>
        </div>

        <div style="margin-top: 15px;">
            <p><strong>II. Pembahasan:</strong></p>
            <ol>
                <li>Evaluasi penyerapan anggaran yang telah mencapai 45% dari target.</li>
                <li>Hambatan teknis dalam implementasi sistem pelaporan digital di lapangan.</li>
                <li>Rencana aksi percepatan program prioritas untuk bulan depan.</li>
            </ol>
        </div>

        <div style="margin-top: 15px;">
            <p><strong>III. Kesimpulan/Tindak Lanjut:</strong></p>
            <p>Telah disepakati bahwa setiap bidang wajib mengumpulkan laporan harian paling lambat pukul 17.00 WIB untuk dilakukan agregasi data mingguan secara otomatis.</p>
        </div>

        <div style="margin-top: 40px; display: flex; justify-content: space-between;">
            <div style="width: 45%;">
                <p>Pimpinan Rapat,</p>
                <br/><br/><br/>
                <p><strong>( NAMA PIMPINAN )</strong></p>
            </div>
            <div style="width: 45%;">
                <p>Notulis,</p>
                <br/><br/><br/>
                <p><strong>( NAMA NOTULIS )</strong></p>
            </div>
        </div>
    `, []);

    const previewContent = useMemo(() => {
        if (previewTemplateId) {
            const template = templates.find(t => t.id === previewTemplateId);
            return template?.isi_template || dummyContent;
        }
        return dummyContent;
    }, [previewTemplateId, templates, dummyContent]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [tempRes, masterDokRes, profileRes] = await Promise.all([
                api.notulenTemplate.getAll(),
                api.masterDataConfig.getDataByTable('master_dokumen'),
                user?.instansi_id ? api.internalInstansi.get(user.instansi_id) : Promise.resolve({ success: false })
            ]);

            if (tempRes.success) setTemplates(tempRes.data);
            else setError(tempRes.message);

            if (profileRes.success) {
                setInstanceProfile(profileRes.data.instansiDetail);
            }

            if (masterDokRes.success) {
                setMasterDokumenList(masterDokRes.data);
            }

            const globalRes = await api.notulenTemplate.getGlobal();
            if (globalRes.success) {
                setGlobalSettings(globalRes.data);
                setGlobalFormData(globalRes.data);
                setGlobalDrafts({});
            }
        } catch { setError('Gagal mengambil data pengaturan notulen'); }
        finally { setLoading(false); }
    };

    const handleSaveGlobalSettings = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await api.notulenTemplate.updateGlobal(globalFormData);
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

    const handleOpenAdd = () => {
        setEditingTemplate(null);
        setFormData({
            nama_template: '',
            font_family: 'Arial',
            font_size: 12,
            margin_top: 20,
            margin_bottom: 20,
            margin_left: 30,
            margin_right: 20,
            paper_size: 'A4',
            is_kop_surat_required: true,
            logo_path: '',
            isi_template: '',
            line_height: 1.5,
            text_align: 'justify',
            master_dokumen_id: null,
            kop_line_style: 'double',
            use_global_settings: true,
            paragraph_spacing_before: 0,
            paragraph_spacing_after: 0,
            first_line_indent: 0
        });
        setTemplateDrafts({});
        setShowModal(true);
    };

    const handleOpenEdit = (template: NotulenTemplate) => {
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
                const res = await api.notulenTemplate.update(editingTemplate.id, formData);
                if (res.success) { setShowModal(false); fetchData(); }
                else { alert(res.message || 'Gagal memperbarui pengaturan'); }
            } else {
                const res = await api.notulenTemplate.create(formData);
                if (res.success) { setShowModal(false); fetchData(); }
                else { alert(res.message || 'Gagal membuat pengaturan baru'); }
            }
        } catch (err: any) { 
            console.error('Save error:', err);
            alert('Terjadi kesalahan sistem saat menyimpan'); 
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Hapus pengaturan untuk template notulen ini?')) return;
        try {
            const res = await api.notulenTemplate.delete(id);
            if (res.success) fetchData();
        } catch { alert('Gagal menghapus data'); }
    };

    useEffect(() => { fetchData(); }, []);

    const columns = [
        {
            header: 'Nama Template',
            key: 'nama_template',
            className: 'font-bold text-slate-800'
        },
        {
            header: 'Font',
            render: (item: NotulenTemplate) => `${item.font_family} (${item.font_size}pt)`,
            className: 'text-slate-600'
        },
        {
            header: 'Margin',
            render: (item: NotulenTemplate) => `${item.margin_top}, ${item.margin_right}, ${item.margin_bottom}, ${item.margin_left} mm`,
            className: 'text-slate-500 font-mono text-xs'
        },
        {
            header: 'Kertas',
            key: 'paper_size',
            className: 'text-slate-600'
        }
    ];

    return (
        <div className="space-y-6">
            {/* Global Settings Summary Card */}
            <div className="bg-white rounded-[32px] p-8 shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden relative group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50/50 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-emerald-100/50 transition-colors duration-500"></div>
                
                <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-start gap-4">
                        <div className="w-14 h-14 bg-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-200 ring-4 ring-emerald-50">
                            <Settings size={28} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-slate-800 tracking-tight uppercase">Konfigurasi Format Laporan</h2>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Standar format dokumen laporan kegiatan institusi</p>
                            
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
                        className="group flex items-center gap-2.5 px-6 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:shadow-emerald-500/40 transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 active:scale-98"
                    >
                        <Settings size={16} className="group-hover:rotate-90 transition-transform duration-500 text-emerald-100" />
                        <span>Ubah Pengaturan Format</span>
                    </button>
                </div>
            </div>

            <BaseDataTable<NotulenTemplate>
                title="Template Notulen Rapat"
                subtitle="Daftar template format notulen yang dapat digunakan saat mencatat hasil rapat."
                data={templates}
                columns={columns}
                loading={loading}
                error={error}
                searchPlaceholder="Cari template..."
                addButtonLabel="Tambah Template Notulen"
                onAddClick={handleOpenAdd}
                renderActions={(item) => (
                    <>
                        <button onClick={() => setPreviewTemplateId(item.id)} className="text-slate-400 hover:text-emerald-600 p-2 hover:bg-emerald-50/80 rounded-xl transition-colors"><Eye size={16} /></button>
                        <button onClick={() => handleOpenEdit(item)} className="text-slate-400 hover:text-indigo-600 p-2 hover:bg-indigo-50/80 rounded-xl transition-colors"><Edit2 size={16} /></button>
                        <button onClick={() => handleDelete(item.id)} className="text-slate-400 hover:text-rose-600 p-2 hover:bg-rose-50/80 rounded-xl transition-colors"><Trash2 size={16} /></button>
                    </>
                )}
            />

            {/* Template Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-slate-100 scale-in-center flex flex-col">
                        <div className="p-6 border-b border-slate-50 flex items-center justify-between sticky top-0 bg-white/80 backdrop-blur-md z-10">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
                                    <Settings size={20} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-black text-slate-800 tracking-tight">
                                        {editingTemplate ? 'Edit Template Notulen' : 'Tambah Template Baru'}
                                    </h3>
                                    <p className="text-xs text-slate-400 font-medium">Konfigurasi format dokumen hasil rapat</p>
                                </div>
                            </div>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-100 rounded-full transition-all"><X size={20} /></button>
                        </div>

                        <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
                            {/* Left Side: Form */}
                            <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto lg:w-1/2 bg-slate-50/50">
                                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <FileText size={16} className="text-emerald-500" />
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Identitas Template</span>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-bold text-slate-700 ml-1">Nama Template <span className="text-rose-500">*</span></label>
                                        <input 
                                            required
                                            type="text" 
                                            className="input-modern w-full" 
                                            placeholder="Contoh: Notulen Rapat Staf"
                                            value={formData.nama_template}
                                            onChange={e => setFormData({...formData, nama_template: e.target.value})}
                                        />
                                    </div>
                                    <div className="flex items-center justify-between py-2 px-4 bg-emerald-50/30 rounded-2xl border border-emerald-100/30 mt-4">
                                        <div className="space-y-0.5">
                                            <div className="text-[12px] font-bold text-emerald-700">Ikuti Pengaturan Global?</div>
                                            <div className="text-[10px] text-emerald-400 font-medium italic">Gunakan margin & font default notulen</div>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input 
                                                type="checkbox" 
                                                className="sr-only peer" 
                                                checked={formData.use_global_settings} 
                                                onChange={e => setFormData({...formData, use_global_settings: e.target.checked})} 
                                            />
                                            <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-emerald-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                                        </label>
                                    </div>
                                </div>

                                {(!formData.use_global_settings) && (
                                    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4 animate-in slide-in-from-top-2">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Type size={16} className="text-emerald-500" />
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipografi & Kertas</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1.5 col-span-2">
                                                <label className="text-[11px] font-bold text-slate-700 ml-1">Jenis Font</label>
                                                <select className="input-modern w-full" value={formData.font_family} onChange={e => setFormData({...formData, font_family: e.target.value})}>
                                                    <option value="Arial">Arial</option>
                                                    <option value="Times New Roman">Times New Roman</option>
                                                </select>
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[11px] font-bold text-slate-700 ml-1">Ukuran Font (pt)</label>
                                                <input type="number" className="input-modern w-full" value={formData.font_size} onChange={e => setFormData({...formData, font_size: parseInt(e.target.value || '12')})} />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[11px] font-bold text-slate-700 ml-1">Spasi Baris</label>
                                                <input type="number" step="0.1" className="input-modern w-full" value={formData.line_height} onChange={e => setFormData({...formData, line_height: parseFloat(e.target.value || '1.5')})} />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <List size={16} className="text-emerald-500" />
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Isi Template (Rich Text)</span>
                                    </div>
                                    <div className="notulen-quill-editor">
                                        <ReactQuill 
                                            theme="snow"
                                            value={formData.isi_template || ''}
                                            onChange={val => setFormData({...formData, isi_template: val})}
                                            className="bg-white rounded-xl"
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-3 sticky bottom-0 bg-white p-4 -mx-8 -mb-8 border-t border-slate-100 z-10">
                                    <button type="submit" className="flex-1 btn-modern py-3 shadow-emerald-200 bg-emerald-600 hover:bg-emerald-700 flex items-center justify-center gap-2">
                                        <Check size={18} />
                                        <span>Simpan Template</span>
                                    </button>
                                    <button type="button" onClick={() => setShowModal(false)} className="px-6 py-3 border border-slate-200 rounded-2xl text-slate-500 font-bold text-xs hover:bg-slate-50 transition-all">Batal</button>
                                </div>
                            </form>

                            {/* Right Side: Live Preview */}
                            <div className="hidden lg:flex lg:w-1/2 bg-slate-100 p-8 flex-col items-center overflow-y-auto">
                                <div className="flex items-center justify-between w-full mb-6">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-slate-600 shadow-sm">
                                            <ImageIcon size={16} />
                                        </div>
                                        <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Live Preview</span>
                                    </div>
                                    <div className="flex items-center gap-2 bg-white p-1 rounded-xl shadow-sm border border-slate-200">
                                        <button onClick={() => setPreviewZoom(z => Math.max(0.3, z - 0.05))} className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-500"><ZoomOut size={14} /></button>
                                        <span className="text-[10px] font-bold text-slate-600 w-10 text-center">{Math.round(previewZoom * 100)}%</span>
                                        <button onClick={() => setPreviewZoom(z => Math.min(1, z + 0.05))} className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-500"><ZoomIn size={14} /></button>
                                    </div>
                                </div>

                                <div 
                                    className="bg-white shadow-2xl origin-top transition-all duration-300"
                                    style={{
                                        width: getPaperDimensions(formData.paper_size || 'A4').width,
                                        minHeight: getPaperDimensions(formData.paper_size || 'A4').height,
                                        transform: `scale(${previewZoom})`,
                                        padding: `${formData.margin_top || 20}mm ${formData.margin_right || 20}mm ${formData.margin_bottom || 20}mm ${formData.margin_left || 30}mm`,
                                        fontFamily: formData.font_family || 'Arial',
                                        fontSize: `${formData.font_size || 12}pt`,
                                        lineHeight: formData.line_height || 1.5,
                                        textAlign: (formData.text_align as any) || 'justify'
                                    }}
                                >
                                    {/* Dummy Kop */}
                                    {formData.is_kop_surat_required && (
                                        <div className="border-b-2 border-black pb-4 mb-8 flex items-center gap-6">
                                            <div className="w-20 h-20 bg-slate-100 flex items-center justify-center text-[10px] text-slate-400 border border-slate-200 border-dashed">LOGO</div>
                                            <div className="flex-1 text-center">
                                                <div className="font-bold text-lg uppercase">Pemerintah Kabupaten Bogor</div>
                                                <div className="font-bold text-xl uppercase">Badan Perencanaan Pembangunan, Penelitian dan Pengembangan Daerah</div>
                                                <div className="text-xs italic">Jl. Segar No. 1, Cibinong, Bogor - Jawa Barat</div>
                                            </div>
                                        </div>
                                    )}

                                    <div dangerouslySetInnerHTML={{ __html: formData.isi_template || dummyContent }} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

                        {/* Global Settings Modal */}
            {showGlobalModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-6xl max-h-[95vh] flex flex-col border border-slate-100 overflow-hidden scale-in-center">
                        {/* Header */}
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 shadow-sm">
                                    <Settings size={20} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-black text-slate-800 tracking-tight">Pengaturan Global Laporan</h3>
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
                                            <Type size={16} className="text-emerald-500" />
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
                                            <Move size={16} className="text-emerald-500" />
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
                                            <List size={16} className="text-emerald-500" />
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
                                        <button type="submit" className="btn-modern px-8 py-2.5 flex items-center gap-2 text-xs bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200 text-white rounded-xl">
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
                                                className="text-[10px] font-bold text-emerald-600 bg-transparent border-none p-0 focus:ring-0 cursor-pointer"
                                                value={previewTemplateId || ''}
                                                onChange={(e) => setPreviewTemplateId(e.target.value ? parseInt(e.target.value) : null)}
                                            >
                                                <option value="">-- Gunakan Teks Dummy --</option>
                                                {templates.map(t => (
                                                    <option key={t.id} value={t.id}>{t.nama_template}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                                        <button onClick={() => setPreviewZoom(prev => Math.max(0.3, prev - 0.05))} className="w-7 h-7 flex items-center justify-center text-slate-500 hover:bg-white rounded-lg transition-all"><ZoomOut size={14} /></button>
                                        <span className="text-[9px] font-black text-slate-600 w-10 text-center">{Math.round(previewZoom * 100)}%</span>
                                        <button onClick={() => setPreviewZoom(prev => Math.min(1.0, prev + 0.05))} className="w-7 h-7 flex items-center justify-center text-slate-500 hover:bg-white rounded-lg transition-all"><ZoomIn size={14} /></button>
                                        <button onClick={() => setPreviewZoom(0.55)} className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-emerald-600 transition-colors"><RefreshCw size={12} /></button>
                                    </div>
                                </div>

                                <div className="flex-1 overflow-auto p-12 scrollbar-thin flex flex-col items-center">
                                    <div 
                                        className="relative transition-all duration-300 origin-top mb-20"
                                        style={{ 
                                            transform: `scale(${previewZoom})`,
                                            width: getPaperDimensions(globalFormData.paper_size).width,
                                            height: getPaperDimensions(globalFormData.paper_size).height
                                        }}
                                    >
                                        {/* Kertas Utama */}
                                        <div 
                                            className="bg-white shadow-2xl border border-slate-200 text-black text-left transition-all duration-300 relative"
                                            style={{
                                                width: getPaperDimensions(globalFormData.paper_size).width,
                                                minHeight: getPaperDimensions(globalFormData.paper_size).height,
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
                                                #preview-content-global p { 
                                                    margin-top: ${globalFormData.paragraph_spacing_before}pt;
                                                    margin-bottom: ${globalFormData.paragraph_spacing_after}pt;
                                                    text-indent: ${globalFormData.first_line_indent}mm;
                                                }
                                            `}} />
                                            
                                            <div className="border-b-2 border-black pb-4 mb-8 flex items-center gap-6">
                                                <div className="w-20 h-20 bg-slate-100 flex items-center justify-center text-[10px] text-slate-400 border border-slate-200 border-dashed">LOGO</div>
                                                <div className="flex-1 text-center">
                                                    <div className="font-bold text-lg uppercase">Pemerintah Kabupaten Bogor</div>
                                                    <div className="font-bold text-xl uppercase">Badan Perencanaan Pembangunan, Penelitian dan Pengembangan Daerah</div>
                                                    <div className="text-xs italic">Jl. Segar No. 1, Cibinong, Bogor - Jawa Barat</div>
                                                </div>
                                            </div>

                                            <div id="preview-content-global" dangerouslySetInnerHTML={{ __html: previewContent }} />
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

export default PengaturanNotulen;
