import React, { useState, useEffect, useMemo } from 'react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { api } from '../../../services/api';
import { useAuth } from '../../../contexts/AuthContext';
import { SearchableSelect } from '../../common/components/SearchableSelect';
import { 
    FileText, Save, Loader2, CheckCircle2, Eye, Search, User, Calendar, 
    ChevronLeft, ZoomIn, ZoomOut, UserCheck, Settings, BookOpen
} from 'lucide-react';
import { getPaperDimensions, getNotulenContentStyle } from '../utils/notulenComposers';

interface NotulenData {
    nomor_notulen: string;
    perihal: string;
    tanggal_notulen: string;
    isi_notulen: string;
    kegiatan_id: number | null;
    template_id: number | null;
    pimpinan_rapat_id: number | null;
    butuh_kaban_approval: boolean;
    bidang_id: number | null;
}

export default function NotulenMaker({ onNavigate, initialKegiatanId }: { onNavigate?: (page: string) => void, initialKegiatanId?: number }) {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [templates, setTemplates] = useState<any[]>([]);
    const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
    const [employees, setEmployees] = useState<any[]>([]);
    const [activities, setActivities] = useState<any[]>([]);
    const [showPreview, setShowPreview] = useState(true);
    const [zoom, setZoom] = useState(0.7);
    const [globalSettings, setGlobalSettings] = useState<any>(null);

    const [formData, setFormData] = useState<NotulenData>({
        nomor_notulen: '',
        perihal: '',
        tanggal_notulen: new Date().toISOString().split('T')[0],
        isi_notulen: '',
        kegiatan_id: initialKegiatanId || null,
        template_id: null,
        pimpinan_rapat_id: null,
        butuh_kaban_approval: false,
        bidang_id: user?.bidang_id || null
    });

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        try {
            const [tempRes, empRes, actRes, globalRes] = await Promise.all([
                api.notulenTemplate.getAll(),
                api.profilPegawai.getAll(),
                api.kegiatanManajemen.getAll(),
                api.notulenTemplate.getGlobal()
            ]);

            if (tempRes.success) setTemplates(tempRes.data);
            if (empRes.success) setEmployees(empRes.data);
            if (actRes.success) setActivities(actRes.data);
            if (globalRes.success) setGlobalSettings(globalRes.data);

            if (initialKegiatanId && actRes.success) {
                const act = actRes.data.find((a: any) => a.id === initialKegiatanId);
                if (act) {
                    setFormData(prev => ({
                        ...prev,
                        perihal: `Notulen ${act.nama_kegiatan}`,
                        tanggal_notulen: act.tanggal?.split('T')[0] || prev.tanggal_notulen,
                        bidang_id: act.bidang_id || prev.bidang_id
                    }));
                }
            }
        } catch (err) {
            console.error('Failed to fetch initial data for NotulenMaker:', err);
        }
    };

    const handleTemplateChange = (templateId: number) => {
        const template = templates.find(t => t.id === templateId);
        setSelectedTemplate(template);
        setFormData(prev => ({
            ...prev,
            template_id: templateId,
            isi_notulen: template?.isi_template || prev.isi_notulen
        }));
    };

    const handleSubmit = async () => {
        if (!formData.template_id || !formData.pimpinan_rapat_id) {
            alert('Mohon pilih template dan pimpinan rapat terlebih dahulu.');
            return;
        }

        setLoading(true);
        try {
            const res = await api.notulen.create(formData);
            if (res.success) {
                alert('Notulen berhasil disimpan dan diajukan untuk TTE Pimpinan Rapat.');
                if (onNavigate) onNavigate('manajemen-kegiatan');
            } else {
                alert('Gagal menyimpan notulen: ' + res.message);
            }
        } catch (err: any) {
            alert('Terjadi kesalahan: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const previewStyle = useMemo(() => {
        const source = (selectedTemplate?.use_global_settings && globalSettings) ? globalSettings : (selectedTemplate || globalSettings || {});
        return getNotulenContentStyle(source);
    }, [selectedTemplate, globalSettings]);

    return (
        <div className="flex flex-col h-screen -m-6 bg-slate-50 overflow-hidden">
            {/* Toolbar */}
            <div className="bg-white border-b border-slate-200 px-6 py-2.5 flex items-center justify-between z-20 shadow-sm">
                <div className="flex items-center gap-3">
                    <button onClick={() => onNavigate?.('manajemen-kegiatan')} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 transition-all">
                        <ChevronLeft size={20} />
                    </button>
                    <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-emerald-200">
                        <BookOpen size={18} />
                    </div>
                    <div>
                        <h1 className="text-sm font-black text-slate-800 uppercase tracking-tight">Buat Laporan</h1>
                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Dokumentasi Naskah Dinas & TTE</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => onNavigate?.('pengaturan-notulen')}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all bg-slate-100 text-slate-500 hover:bg-slate-200"
                        title="Pengaturan Format Laporan"
                    >
                        <Settings size={14} />
                        Pengaturan Format
                    </button>
                    <button 
                        onClick={() => setShowPreview(!showPreview)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${showPreview ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}
                    >
                        <Eye size={14} />
                        {showPreview ? 'Sembunyikan Preview' : 'Lihat Preview'}
                    </button>
                    <button 
                        onClick={handleSubmit}
                        disabled={loading}
                        className="btn-modern bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 text-[10px] shadow-emerald-200 flex items-center gap-2"
                    >
                        {loading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                        SIMPAN & AJUKAN TTE
                    </button>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Form Editor */}
                <div className={`flex-1 overflow-y-auto p-8 scrollbar-thin transition-all duration-500 ${showPreview ? 'lg:max-w-[40%]' : 'max-w-4xl mx-auto w-full'}`}>
                    <div className="space-y-8 pb-20">
                        {/* Meta Card */}
                        <div className="bg-white p-8 rounded-[32px] shadow-xl shadow-slate-200/50 border border-slate-100 space-y-6">
                            <div className="flex items-center gap-3 mb-2">
                                <Settings size={18} className="text-emerald-500" />
                                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Metadata Rapat</h3>
                            </div>

                            <div className="space-y-4">
                                <SearchableSelect 
                                    label="Tautkan ke Kegiatan"
                                    options={activities.map(a => ({ id: a.id, label: a.nama_kegiatan }))}
                                    displayField="label"
                                    value={formData.kegiatan_id}
                                    onChange={(val) => {
                                        setFormData(prev => ({ ...prev, kegiatan_id: val }));
                                        const act = activities.find(a => a.id === val);
                                        if (act) setFormData(prev => ({ ...prev, perihal: `Notulen ${act.nama_kegiatan}`, tanggal_notulen: act.tanggal?.split('T')[0] || prev.tanggal_notulen }));
                                    }}
                                />

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nomor Notulen</label>
                                        <input 
                                            type="text" 
                                            className="input-modern w-full font-bold"
                                            placeholder="Auto atau Manual..."
                                            value={formData.nomor_notulen}
                                            onChange={e => setFormData({...formData, nomor_notulen: e.target.value})}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tanggal Rapat</label>
                                        <input 
                                            type="date" 
                                            className="input-modern w-full font-bold"
                                            value={formData.tanggal_notulen}
                                            onChange={e => setFormData({...formData, tanggal_notulen: e.target.value})}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Perihal / Agenda Utama</label>
                                    <input 
                                        type="text" 
                                        className="input-modern w-full font-bold"
                                        placeholder="Contoh: Rapat Koordinasi Mingguan..."
                                        value={formData.perihal}
                                        onChange={e => setFormData({...formData, perihal: e.target.value})}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Template & Signing Card */}
                        <div className="bg-white p-8 rounded-[32px] shadow-xl shadow-slate-200/50 border border-slate-100 space-y-6">
                            <div className="flex items-center gap-3 mb-2">
                                <UserCheck size={18} className="text-emerald-500" />
                                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Template & Otoritas TTE</h3>
                            </div>

                            <div className="space-y-4">
                                <SearchableSelect 
                                    label="Pilih Template Format"
                                    options={templates.map(t => ({ id: t.id, label: t.nama_template }))}
                                    displayField="label"
                                    value={formData.template_id}
                                    onChange={handleTemplateChange}
                                />

                                <SearchableSelect 
                                    label="Pimpinan Rapat (Penanda Tangan)"
                                    options={employees.map(e => ({ id: e.user_id, label: e.nama_lengkap, sub: e.jabatan_nama }))}
                                    displayField="label"
                                    secondaryField="sub"
                                    value={formData.pimpinan_rapat_id}
                                    onChange={(val) => setFormData(prev => ({ ...prev, pimpinan_rapat_id: val }))}
                                />

                                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                    <div className="space-y-0.5">
                                        <div className="text-[12px] font-bold text-slate-700 uppercase tracking-tight">Butuh Pengesahan Kaban?</div>
                                        <div className="text-[10px] text-slate-400 font-medium italic">Tambahkan Kepala Badan dalam alur TTE</div>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input 
                                            type="checkbox" 
                                            className="sr-only peer" 
                                            checked={formData.butuh_kaban_approval} 
                                            onChange={e => setFormData({...formData, butuh_kaban_approval: e.target.checked})} 
                                        />
                                        <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-emerald-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                                    </label>
                                </div>
                            </div>
                        </div>

                        {/* Content Card */}
                        <div className="bg-white p-8 rounded-[32px] shadow-xl shadow-slate-200/50 border border-slate-100 space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <FileText size={18} className="text-emerald-500" />
                                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Isi Notulen</h3>
                                </div>
                                <span className="text-[10px] font-bold text-slate-400">Gunakan toolbar untuk format teks</span>
                            </div>
                            <div className="notulen-editor border border-slate-100 rounded-2xl overflow-hidden">
                                <ReactQuill 
                                    theme="snow"
                                    value={formData.isi_notulen}
                                    onChange={val => setFormData({...formData, isi_notulen: val})}
                                    modules={{
                                        toolbar: [
                                            [{ 'header': [1, 2, false] }],
                                            ['bold', 'italic', 'underline', 'strike'],
                                            [{'list': 'ordered'}, {'list': 'bullet'}],
                                            ['link', 'clean']
                                        ],
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Preview Section */}
                {showPreview && (
                    <div className="hidden lg:flex flex-1 bg-slate-200 p-12 overflow-y-auto items-center flex-col scrollbar-thin">
                        <div className="flex items-center justify-between w-full max-w-[210mm] mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-slate-400 shadow-sm border border-slate-100">
                                    <Eye size={16} />
                                </div>
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">High-Fidelity Live Preview</span>
                            </div>
                            <div className="flex items-center gap-2 bg-white p-1 rounded-xl shadow-sm border border-slate-200">
                                <button onClick={() => setZoom(z => Math.max(0.3, z - 0.05))} className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-500 transition-colors"><ZoomOut size={14} /></button>
                                <span className="text-[10px] font-bold text-slate-600 w-10 text-center">{Math.round(zoom * 100)}%</span>
                                <button onClick={() => setZoom(z => Math.min(1.2, z + 0.05))} className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-500 transition-colors"><ZoomIn size={14} /></button>
                            </div>
                        </div>

                        <div 
                            className="bg-white shadow-2xl origin-top transition-all duration-300"
                            style={{
                                ...previewStyle,
                                transform: `scale(${zoom})`,
                                width: getPaperDimensions(selectedTemplate?.paper_size || 'A4').width,
                                minHeight: getPaperDimensions(selectedTemplate?.paper_size || 'A4').height,
                            }}
                        >
                            {/* Kop Surat if required */}
                            {selectedTemplate?.is_kop_surat_required && (
                                <div className="border-b-2 border-black pb-4 mb-8 flex items-center gap-6">
                                    <div className="w-20 h-20 bg-slate-50 border border-slate-200 border-dashed flex items-center justify-center text-[10px] text-slate-300">LOGO</div>
                                    <div className="flex-1 text-center">
                                        <div className="font-bold text-lg uppercase">Pemerintah Kabupaten Bogor</div>
                                        <div className="font-bold text-xl uppercase">Badan Perencanaan Pembangunan, Penelitian dan Pengembangan Daerah</div>
                                        <div className="text-xs italic">Jl. Segar No. 1, Cibinong, Bogor - Jawa Barat</div>
                                    </div>
                                </div>
                            )}

                            {/* Notulen Header */}
                            <div className="text-center font-bold text-xl mb-6 uppercase underline">Notulen Rapat</div>
                            
                            {/* Notulen Metadata Table */}
                            <table className="w-full mb-8 text-[11pt]">
                                <tbody>
                                    <tr>
                                        <td className="w-32 py-1 align-top">Agenda</td>
                                        <td className="w-4 py-1 align-top">:</td>
                                        <td className="py-1 font-bold">{formData.perihal || '-'}</td>
                                    </tr>
                                    <tr>
                                        <td className="py-1 align-top">Hari/Tanggal</td>
                                        <td className="py-1 align-top">:</td>
                                        <td className="py-1">{formData.tanggal_notulen ? new Date(formData.tanggal_notulen).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '-'}</td>
                                    </tr>
                                    <tr>
                                        <td className="py-1 align-top">Nomor</td>
                                        <td className="py-1 align-top">:</td>
                                        <td className="py-1">{formData.nomor_notulen || '-'}</td>
                                    </tr>
                                </tbody>
                            </table>

                            {/* Main Content */}
                            <div 
                                className="notulen-content prose-slate max-w-none min-h-[400px]"
                                dangerouslySetInnerHTML={{ __html: formData.isi_notulen || '<p class="text-slate-300 italic">Isi notulen akan muncul di sini...</p>' }}
                            />

                            {/* Signature Area */}
                            <div className="mt-16 flex justify-between gap-12">
                                <div className="w-1/2">
                                    <p className="mb-20">Pimpinan Rapat,</p>
                                    <p className="font-bold underline uppercase">{employees.find(e => e.user_id === formData.pimpinan_rapat_id)?.nama_lengkap || '( .............................. )'}</p>
                                    <p>NIP. {employees.find(e => e.user_id === formData.pimpinan_rapat_id)?.nip || '..............................'}</p>
                                </div>
                                <div className="w-1/2">
                                    <p className="mb-20">Notulis,</p>
                                    <p className="font-bold underline uppercase">{user?.nama_lengkap || '( .............................. )'}</p>
                                    <p>NIP. {user?.nip || '..............................'}</p>
                                </div>
                            </div>

                            {/* Optional Kaban Approval placeholder */}
                            {formData.butuh_kaban_approval && (
                                <div className="mt-12 pt-8 border-t border-slate-100 text-center mx-auto w-1/2">
                                    <p className="mb-20 uppercase tracking-tight">Mengetahui,<br/>Kepala Badan</p>
                                    <p className="font-bold underline uppercase">Dr. Ir. Ajat Rochmat Jatnika, S.T., M.Si.</p>
                                    <p>NIP. 19710528 199803 1 005</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
