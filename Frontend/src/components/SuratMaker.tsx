import React, { useState, useEffect, useRef } from 'react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import BuatNomorModal from './BuatNomorModal';
import { 
    FileText, 
    Download, 
    Printer, 
    Save, 
    RotateCcw, 
    Loader2, 
    CheckCircle2, 
    AlertCircle,
    Eye,
    ChevronLeft,
    ChevronRight,
    Search,
    User,
    Building2,
    Calendar,
    Mail,
    Plus,
    X,
    ExternalLink,
    Hash,
    ListFilter
} from 'lucide-react';

interface LetterData {
    nomor_surat: string;
    perihal: string;
    lampiran: string;
    sifat: string;
    tanggal_surat: string;
    tujuan_surat: string;
    isi_surat: string;
    tembusan: string;
    nama_penanda: string;
    jabatan_penanda: string;
    nip_penanda: string;
}

const BAPPERIDA_SPREADSHEET_URL = 'https://docs.google.com/spreadsheets/u/0/d/1V-wRqlCvmehdAg9w9t6BxdwvQcMbpMkPUuXHt5jd368/htmlview#gid=2005265713';

export default function SuratMaker() {
    const { user } = useAuth();
    const isBapperida = user?.instansi_id === 2 || user?.tipe_user_id === 1;

    const [formData, setFormData] = useState<LetterData>({
        nomor_surat: '',
        perihal: '',
        lampiran: '-',
        sifat: 'Penting',
        tanggal_surat: new Date().toISOString().split('T')[0],
        tujuan_surat: 'Terlampir',
        isi_surat: '<p>Sehubungan dengan pelaksanaan sinergitas dan harmonisasi perencanaan pembangunan daerah, maka akan dilaksanakan rapat koordinasi...</p>',
        tembusan: '',
        nama_penanda: '',
        jabatan_penanda: 'KEPALA,',
        nip_penanda: ''
    });

    const [isGenerating, setIsGenerating] = useState(false);
    const [instanceProfile, setInstanceProfile] = useState<any>(null);
    const [isLoadingProfile, setIsLoadingProfile] = useState(true);
    const [showPreview, setShowPreview] = useState(true);

    // Numbering Modal state
    const [isNumberingModalOpen, setIsNumberingModalOpen] = useState(false);
    const [numberingModalMode, setNumberingModalMode] = useState<'full' | 'select'>('full');

    useEffect(() => {
        fetchInstanceProfile();
    }, []);

    const fetchInstanceProfile = async () => {
        try {
            setIsLoadingProfile(true);
            const res = await api.internalInstansi.get();
            if (res.success) {
                setInstanceProfile(res.data.instansiDetail);
                // Pre-fill penanda if profile has it (logic could be added later to fetch from employees)
            }
        } catch (err) {
            console.error('Failed to fetch instance profile:', err);
        } finally {
            setIsLoadingProfile(false);
        }
    };

    const handleGenerateDocx = async () => {
        try {
            setIsGenerating(true);
            const res = await api.surat.generateDocx(formData);
            if (res.success) {
                // Download the file
                const downloadUrl = res.data.path;
                const link = document.createElement('a');
                link.href = downloadUrl;
                link.setAttribute('download', res.data.fileName);
                document.body.appendChild(link);
                link.click();
                link.remove();
                
                alert('Surat berhasil dibuat dan diunduh!');
            } else {
                alert('Gagal membuat surat: ' + res.message);
            }
        } catch (err: any) {
            alert('Terjadi kesalahan: ' + err.message);
        } finally {
            setIsGenerating(false);
        }
    };

    const modules = {
        toolbar: [
            [{ 'header': [1, 2, false] }],
            ['bold', 'italic', 'underline','strike', 'blockquote'],
            [{'list': 'ordered'}, {'list': 'bullet'}, {'indent': '-1'}, {'indent': '+1'}],
            ['link', 'clean']
        ],
    };

    return (
        <div className="flex flex-col h-screen -m-6 bg-slate-50 overflow-hidden">
            {/* Toolbar Top */}
            <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between z-20 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-ppm-slate rounded-xl flex items-center justify-center text-white shadow-lg shadow-ppm-slate/20">
                        <FileText size={22} />
                    </div>
                    <div>
                        <h1 className="text-lg font-black text-slate-800 leading-tight tracking-tight uppercase">DocTRIN Letter Maker</h1>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Electronic Text Editor & Professional Export</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => setShowPreview(!showPreview)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${showPreview ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}
                    >
                        {showPreview ? <><Eye size={16} /> Preview Aktif</> : <><Search size={16} /> Lihat Preview</>}
                    </button>
                    <div className="h-6 w-px bg-slate-200"></div>
                    <button 
                        onClick={handleGenerateDocx}
                        disabled={isGenerating}
                        className="btn-primary py-2 px-6 flex items-center gap-2 group shadow-lg shadow-indigo-500/20 active:scale-95 disabled:opacity-50"
                    >
                        {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} className="group-hover:-translate-y-0.5 transition-transform" />}
                        BUAT .DOCX
                    </button>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Editor Section */}
                <div className={`flex-1 overflow-y-auto p-8 scrollbar-thin transition-all duration-500 ${showPreview ? 'lg:max-w-[55%]' : 'max-w-4xl mx-auto'}`}>
                    <div className="space-y-8 pb-20">
                        {/* Meta Form */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-8 rounded-[32px] shadow-xl shadow-slate-200/50 border border-slate-100">
                            <div className="md:col-span-2 flex items-center justify-between gap-3 mb-2">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-slate-500">
                                        <Mail size={16} />
                                    </div>
                                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest leading-none">Metadata Surat</h3>
                                </div>
                            </div>

                            {/* Method Numbering Hub */}
                            <div className="md:col-span-2 space-y-4 bg-slate-50 p-6 rounded-[32px] border border-slate-100 shadow-inner">
                                <div className="flex items-center gap-2 mb-2 px-1">
                                    <Hash size={16} className="text-indigo-500" />
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Pilih Metode Penomoran Surat</span>
                                </div>
                                
                                <div className="flex flex-col sm:flex-row gap-4">
                                    <button 
                                        className="flex-1 h-14 bg-white border-2 border-slate-200 hover:border-indigo-500 hover:bg-indigo-50 rounded-2xl flex items-center justify-center gap-3 transition-all group shadow-sm active:scale-95"
                                        onClick={() => {
                                            setNumberingModalMode('full');
                                            setIsNumberingModalOpen(true);
                                        }}
                                    >
                                        <div className="w-8 h-8 bg-slate-100 group-hover:bg-indigo-500 group-hover:text-white rounded-xl flex items-center justify-center text-slate-400 transition-all">
                                            <Plus size={18} />
                                        </div>
                                        <div className="text-left">
                                            <div className="text-[11px] font-black text-slate-800 uppercase tracking-tight group-hover:text-indigo-600">Buat Nomor Baru</div>
                                            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Penomoran Internal Aplikasi</div>
                                        </div>
                                    </button>

                                    {isBapperida && (
                                        <a 
                                            href={BAPPERIDA_SPREADSHEET_URL}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex-1 h-14 bg-emerald-500 hover:bg-emerald-600 rounded-2xl flex items-center justify-center gap-3 transition-all shadow-lg shadow-emerald-200/50 active:scale-95 border-2 border-emerald-400 group"
                                        >
                                            <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center text-white">
                                                <ExternalLink size={18} />
                                            </div>
                                            <div className="text-left">
                                                <div className="text-[11px] font-black text-white uppercase tracking-tight">Penomoran Sekretariat</div>
                                                <div className="text-[9px] font-bold text-emerald-100 uppercase tracking-tighter">Link Spreadsheet Bapperida</div>
                                            </div>
                                        </a>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nomor Surat</label>
                                <div className="relative group">
                                    <input 
                                        type="text" 
                                        className="input-modern w-full font-bold pr-24"
                                        placeholder="Contoh: 000.1.5/833-PPM"
                                        value={formData.nomor_surat}
                                        onChange={e => setFormData({...formData, nomor_surat: e.target.value})}
                                    />
                                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                                        <button 
                                            onClick={() => {
                                                setNumberingModalMode('select');
                                                setIsNumberingModalOpen(true);
                                            }}
                                            title="Ambil dari Log Penomoran"
                                            className="w-8 h-8 bg-slate-800 hover:bg-slate-900 text-white rounded-lg transition-all flex items-center justify-center shadow-lg active:scale-95 group/btn"
                                        >
                                            <ListFilter size={14} className="group-hover/btn:scale-110 transition-transform" />
                                        </button>
                                        <button 
                                            onClick={() => setFormData({
                                                ...formData,
                                                nomor_surat: '',
                                                perihal: '',
                                                tanggal_surat: new Date().toISOString().split('T')[0],
                                                tujuan_surat: 'Terlampir'
                                            })}
                                            title="Kosongkan Field Utama"
                                            className="w-8 h-8 bg-white border border-slate-200 text-slate-400 hover:text-rose-500 hover:border-rose-200 hover:bg-rose-50 rounded-lg transition-all flex items-center justify-center shadow-sm active:scale-95 group/clear"
                                        >
                                            <RotateCcw size={14} className="group-hover/clear:rotate-[-45deg] transition-transform" />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Perihal</label>
                                <input 
                                    type="text" 
                                    className="input-modern w-full font-bold"
                                    placeholder="Contoh: Undangan Rapat..."
                                    value={formData.perihal}
                                    onChange={e => setFormData({...formData, perihal: e.target.value})}
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Sifat & Lampiran</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <select 
                                        className="input-modern w-full font-bold"
                                        value={formData.sifat}
                                        onChange={e => setFormData({...formData, sifat: e.target.value})}
                                    >
                                        <option>Penting</option>
                                        <option>Biasa</option>
                                        <option>Segera</option>
                                        <option>Sangat Segera</option>
                                        <option>Rahasia</option>
                                    </select>
                                    <input 
                                        type="text" 
                                        className="input-modern w-full font-bold"
                                        placeholder="1 Berkas"
                                        value={formData.lampiran}
                                        onChange={e => setFormData({...formData, lampiran: e.target.value})}
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tanggal Surat</label>
                                <input 
                                    type="date" 
                                    className="input-modern w-full font-bold"
                                    value={formData.tanggal_surat}
                                    onChange={e => setFormData({...formData, tanggal_surat: e.target.value})}
                                />
                            </div>

                            <div className="space-y-1.5 md:col-span-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tujuan (Kepada Yth.)</label>
                                <textarea 
                                    className="input-modern w-full font-bold h-20 resize-none"
                                    placeholder="Daftar Terlampir..."
                                    value={formData.tujuan_surat}
                                    onChange={e => setFormData({...formData, tujuan_surat: e.target.value})}
                                />
                            </div>
                        </div>

                        {/* Text Editor */}
                        <div className="bg-white rounded-[32px] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
                            <div className="p-8 pb-2 border-b border-slate-50 flex items-center gap-3">
                                <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-500">
                                    <Plus size={16} />
                                </div>
                                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest leading-none">Isi Surat (Elektronik Editor)</h3>
                            </div>
                            <div className="p-8">
                                <div className="prose-editor-container">
                                    <ReactQuill 
                                        theme="snow"
                                        modules={modules}
                                        value={formData.isi_surat}
                                        onChange={(val) => setFormData({...formData, isi_surat: val})}
                                        className="h-[400px] mb-12"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Signatory Section */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-8 rounded-[32px] shadow-xl shadow-slate-200/50 border border-slate-100">
                            <div className="md:col-span-2 flex items-center gap-3 mb-2">
                                <div className="w-8 h-8 bg-rose-50 rounded-lg flex items-center justify-center text-rose-500">
                                    <User size={16} />
                                </div>
                                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest leading-none">Penandatangan</h3>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nama Pejabat</label>
                                <input 
                                    type="text" 
                                    className="input-modern w-full font-bold"
                                    placeholder="NAMA LENGKAP"
                                    value={formData.nama_penanda}
                                    onChange={e => setFormData({...formData, nama_penanda: e.target.value})}
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">NIP (Opsional)</label>
                                <input 
                                    type="text" 
                                    className="input-modern w-full font-bold"
                                    placeholder="19xxxxxxxxxxxx"
                                    value={formData.nip_penanda}
                                    onChange={e => setFormData({...formData, nip_penanda: e.target.value})}
                                />
                            </div>

                            <div className="space-y-1.5 md:col-span-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Jabatan Penanda</label>
                                <input 
                                    type="text" 
                                    className="input-modern w-full font-bold"
                                    placeholder="KEPALA,"
                                    value={formData.jabatan_penanda}
                                    onChange={e => setFormData({...formData, jabatan_penanda: e.target.value})}
                                />
                            </div>
                        </div>

                    </div>
                </div>

                {/* Preview Section - Modern Simulated Letter */}
                {showPreview && (
                    <div className="w-full lg:max-w-[45%] bg-slate-200 p-8 overflow-y-auto scrollbar-thin border-l border-slate-300 animate-in slide-in-from-right duration-500">
                        <div className="bg-white mx-auto shadow-2xl p-[1.5in] min-h-[11in] w-[8.5in] text-black relative font-serif scale-[0.6] origin-top md:scale-[0.8] lg:scale-100">
                            
                            {/* KOP Simulation */}
                            <div className="text-center border-b-[3px] border-double border-black pb-2 mb-6">
                                <div className="flex items-start gap-4">
                                    <div className="w-20 h-24 shrink-0 flex items-center justify-center">
                                        {instanceProfile?.logo_kop_path ? (
                                            <img src={instanceProfile.logo_kop_path} className="max-w-full max-h-full object-contain" />
                                        ) : (
                                            <div className="w-16 h-20 bg-slate-100 border border-slate-200 rounded flex items-center justify-center text-[10px] font-bold text-slate-400">LOGO</div>
                                        )}
                                    </div>
                                    <div className="flex-1 text-center pr-16 uppercase">
                                        <div className="text-[14pt] font-bold leading-tight">PEMERINTAH KABUPATEN BOGOR</div>
                                        <div className="text-[16pt] font-bold leading-tight">{instanceProfile?.nama_instansi_kop || instanceProfile?.instansi || 'NAMA INSTANSI'}</div>
                                        <div className="text-[9pt] normal-case font-serif mt-1 italic">
                                            {instanceProfile?.alamat || 'Alamat Lengkap Instansi'} {instanceProfile?.kode_pos ? 'Kode Pos ' + instanceProfile.kode_pos : ''}<br/>
                                            {instanceProfile?.telepon_kop ? 'Telepon: ' + instanceProfile.telepon_kop : ''} {instanceProfile?.faks_kop ? 'Faksimile: ' + instanceProfile.faks_kop : ''}<br/>
                                            Laman: {instanceProfile?.website_kop || '-'}, Pos-el: {instanceProfile?.email_kop || '-'}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Body Content */}
                            <div className="text-right text-[11pt] mb-6">
                                Cibinong, {new Date(formData.tanggal_surat).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                            </div>

                            <table className="w-full text-[11pt] border-collapse mb-8">
                                <tbody>
                                    <tr className="align-top">
                                        <td className="w-[15%]">Nomor</td>
                                        <td className="w-[2%]">:</td>
                                        <td className="w-[48%]">{formData.nomor_surat || '...'}</td>
                                        <td className="w-[35%]">Kepada</td>
                                    </tr>
                                    <tr className="align-top">
                                        <td>Sifat</td>
                                        <td>:</td>
                                        <td>{formData.sifat}</td>
                                        <td rowSpan={3} className="pt-0">
                                            Yth. {formData.tujuan_surat || 'Daftar Terlampir'}<br/>
                                            di<br/>
                                            <span className="inline-block ml-6">tempat</span>
                                        </td>
                                    </tr>
                                    <tr className="align-top">
                                        <td>Lampiran</td>
                                        <td>:</td>
                                        <td>{formData.lampiran}</td>
                                    </tr>
                                    <tr className="align-top">
                                        <td>Hal</td>
                                        <td>:</td>
                                        <td><strong>{formData.perihal || 'Undangan'}</strong></td>
                                    </tr>
                                </tbody>
                            </table>

                            <div 
                                className="text-[11pt] leading-relaxed text-justify mb-12 min-h-[300px]"
                                dangerouslySetInnerHTML={{ __html: formData.isi_surat }}
                            />

                            <div className="flex justify-end text-[11pt]">
                                <div className="w-[50%] text-center uppercase">
                                    <div className="text-left inline-block">
                                        {formData.jabatan_penanda}<br/><br/><br/><br/>
                                        <strong>{formData.nama_penanda || 'NAMA PEJABAT'}</strong><br/>
                                        {formData.nip_penanda && `NIP. ${formData.nip_penanda}`}
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>
                )}
            </div>

            {/* Comprehensive Numbering Modal */}
            <BuatNomorModal 
                isOpen={isNumberingModalOpen} 
                onClose={() => setIsNumberingModalOpen(false)} 
                mode={numberingModalMode}
                onSelectNumber={(data) => {
                    setFormData(prev => ({
                        ...prev,
                        nomor_surat: data.nomor_surat,
                        tanggal_surat: data.tanggal_surat,
                        perihal: data.perihal,
                        tujuan_surat: data.tujuan
                    }));
                }}
            />
        </div>
    );
}
