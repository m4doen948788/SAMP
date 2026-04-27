import React, { useState, useEffect, useRef, useMemo } from 'react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { api } from '@/src/services/api';
import { useAuth } from '@/src/contexts/AuthContext';
import BuatNomorModal from './BuatNomorModal';
import StructuredLeaveForm from './StructuredLeaveForm';
import { composeLeaveLetterHtml } from '../utils/letterComposers';
import { SearchableSelect } from '@/src/features/common/components/SearchableSelect';
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
    ListFilter,
    ZoomIn,
    ZoomOut,
    Maximize2,
    UserCheck
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

    const [isStructuredMode, setIsStructuredMode] = useState(false);
    const [structuredData, setStructuredData] = useState<any>({
        tujuan: { jabatan: '', lokasi: 'Tempat' },
        pembuka: 'Saya yang bertandatangan di bawah ini:',
        isi: {
            kalimat_pengantar: 'Dengan ini mengajukan permintaan Cuti Tahunan untuk Tahun ' + new Date().getFullYear(),
            durasi: '',
            tahun: new Date().getFullYear(),
            tgl_mulai: '',
            tgl_selesai: '',
            alasan: ''
        },
        alamat_cuti: '',
        penutup: 'Demikian permintaan ini saya buat untuk dapat dipertimbangkan sebagaimana mestinya.'
    });

    const [isGenerating, setIsGenerating] = useState(false);
    const [instanceProfile, setInstanceProfile] = useState<any>(null);
    const [isLoadingProfile, setIsLoadingProfile] = useState(true);
    const [showPreview, setShowPreview] = useState(true);
    const [zoom, setZoom] = useState(0.75);

    // Numbering Modal state
    const [isNumberingModalOpen, setIsNumberingModalOpen] = useState(false);
    const [numberingModalMode, setNumberingModalMode] = useState<'full' | 'select'>('full');

    const [templates, setTemplates] = useState<any[]>([]);
    const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
    const [employees, setEmployees] = useState<any[]>([]);
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<any>(null);
    const [instansiList, setInstansiList] = useState<any[]>([]);
    const [showAllPegawai, setShowAllPegawai] = useState<boolean>(false);
    const [filterInstansi, setFilterInstansi] = useState<string>('');

    useEffect(() => {
        fetchInstanceProfile();
        fetchTemplates();
        fetchEmployees();
        fetchInstansiList();
    }, []);

    const fetchInstansiList = async () => {
        try {
            const res = await api.instansiDaerah.getAll();
            if (res.success) setInstansiList(res.data);
        } catch (err) {
            console.error('Failed to fetch instansi list:', err);
        }
    };

    const fetchTemplates = async () => {
        try {
            const res = await api.suratTemplate.getAll();
            if (res.success) {
                setTemplates(res.data);
                if (res.data.length > 0) {
                    // Don't auto-select yet to avoid overwriting defaults unless user chooses
                }
            }
        } catch (err) {
            console.error('Failed to fetch templates:', err);
        }
    };

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

    const fetchEmployees = async () => {
        try {
            const res = await api.profilPegawai.getAll();
            if (res.success) {
                setEmployees(res.data);
            }
        } catch (err) {
            console.error('Failed to fetch employees:', err);
        }
    };

    // --- Computed Options for Filtering ---
    const filteredEmployees = useMemo(() => {
        if (!employees) return [];
        const isSuperAdmin = user?.tipe_user_id === 1;

        if (showAllPegawai) return employees;
        
        if (isSuperAdmin) {
            if (filterInstansi) {
                return employees.filter(p => Number(p.instansi_id) === Number(filterInstansi));
            }
            return employees;
        }

        const userBidangId = Number(user?.bidang_id);
        if (!userBidangId) return employees;
        return employees.filter(p => Number(p.bidang_id) === userBidangId);
    }, [employees, showAllPegawai, user?.bidang_id, user?.tipe_user_id, filterInstansi]);

    const mappedEmployeeOptions = useMemo(() => {
        return filteredEmployees.map(p => ({
            id: p.id,
            nama_lengkap: p.nama_lengkap,
            nip: p.nip,
            bidang_singkatan: p.bidang_singkatan || ''
        }));
    }, [filteredEmployees]);

    const replacePlaceholders = (text: string, data: any) => {
        if (!text) return '';
        let result = text;
        
        // Employee data
        if (data.employee) {
            result = result
                .replace(/{{nama}}/g, data.employee.nama_lengkap || '')
                .replace(/{{nip}}/g, data.employee.nip || '')
                .replace(/{{jabatan}}/g, data.employee.jabatan_nama || '')
                .replace(/{{pangkat_golongan}}/g, data.employee.pangkat_golongan_nama || '')
                .replace(/{{instansi}}/g, data.employee.instansi_nama || '');
        }

        // General data
        result = result
            .replace(/{{tahun}}/g, new Date().getFullYear().toString())
            .replace(/{{tanggal_surat}}/g, new Date(formData.tanggal_surat).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }));
        
        return result;
    };

    // Update structured data composition
    useEffect(() => {
        if (isStructuredMode) {
            const employee = employees.find(e => e.id === selectedEmployeeId);
            const html = composeLeaveLetterHtml(structuredData, employee);
            setFormData(prev => ({
                ...prev,
                isi_surat: html,
                tujuan_surat: structuredData.tujuan?.jabatan || prev.tujuan_surat
            }));
        }
    }, [structuredData, isStructuredMode, selectedEmployeeId, employees]);

    // Handle template selection specifically for structured types
    useEffect(() => {
        if (selectedTemplate) {
            const isCuti = selectedTemplate.nama_jenis_surat.toLowerCase().includes('cuti');
            setIsStructuredMode(isCuti);
            
            if (isCuti) {
                // Initialize structured data with some defaults from template if needed
                setStructuredData(prev => ({
                    ...prev,
                    tujuan: { 
                        ...prev.tujuan,
                        jabatan: 'Kepala ' + (instanceProfile?.nama_instansi_kop || instanceProfile?.instansi || '')
                    }
                }));
            }
        } else {
            setIsStructuredMode(false);
        }
    }, [selectedTemplate, instanceProfile]);

    const handleApplyTemplate = (template: any, employee?: any) => {
        if (!template) return;
        
        let content = template.isi_template || '';
        if (employee) {
            content = replacePlaceholders(content, { employee });
        }
        
        setFormData(prev => ({
            ...prev,
            isi_surat: content
        }));
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
            <div className="bg-white border-b border-slate-200 px-6 py-1.5 flex items-center justify-between z-20 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-ppm-slate rounded-lg flex items-center justify-center text-white shadow-lg shadow-ppm-slate/20">
                        <FileText size={18} />
                    </div>
                    <div>
                        <h1 className="text-sm font-black text-slate-800 leading-tight tracking-tight uppercase">DocTRIN Letter Maker</h1>
                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Electronic Text Editor & Professional Export</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => setShowPreview(!showPreview)}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${showPreview ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}
                    >
                        {showPreview ? <><Eye size={13} /> Preview Aktif</> : <><Search size={13} /> Lihat Preview</>}
                    </button>
                    <div className="h-6 w-px bg-slate-200"></div>
                    <button 
                        onClick={handleGenerateDocx}
                        disabled={isGenerating}
                        className="btn-primary py-1 px-3 flex items-center gap-1.5 group shadow-lg shadow-indigo-500/20 active:scale-95 disabled:opacity-50 text-[9px]"
                    >
                        {isGenerating ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} className="group-hover:-translate-y-0.5 transition-transform" />}
                        BUAT .DOCX
                    </button>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Editor Section */}
                <div className={`flex-1 overflow-y-auto p-8 scrollbar-thin transition-all duration-500 ${showPreview ? 'lg:max-w-[40%]' : 'max-w-4xl mx-auto'}`}>
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
                                <div className="flex items-center gap-2">
                                    <ListFilter size={14} className="text-slate-400" />
                                    <select 
                                        className="text-[10px] font-bold text-indigo-600 bg-indigo-50 border-none rounded-md px-2 py-1 outline-none"
                                        value={selectedTemplate?.id || ''}
                                        onChange={(e) => {
                                            const t = templates.find(item => item.id === parseInt(e.target.value));
                                            setSelectedTemplate(t);
                                            if (t) {
                                                setFormData(prev => ({
                                                    ...prev,
                                                    perihal: t.nama_jenis_surat
                                                }));
                                                // If we have an employee selected, apply template with their data
                                                const emp = employees.find(emp => emp.id === selectedEmployeeId);
                                                handleApplyTemplate(t, emp);
                                            }
                                        }}
                                    >
                                        <option value="">Pilih Jenis Surat...</option>
                                        {templates.map(t => (
                                            <option key={t.id} value={t.id}>{t.nama_jenis_surat}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Employee Selector (Only if needed or for specific templates) */}
                            {selectedTemplate && selectedTemplate.is_pegawai_required && (
                                <div className="md:col-span-2 bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100/50 mb-2">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <UserCheck size={14} className="text-indigo-500" />
                                            <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Auto-fill Data Pegawai</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Semua Bidang</span>
                                            <button 
                                                type="button"
                                                onClick={() => setShowAllPegawai(!showAllPegawai)}
                                                className={`w-8 h-4 rounded-full transition-all relative ${showAllPegawai ? 'bg-indigo-600' : 'bg-slate-200'}`}
                                            >
                                                <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${showAllPegawai ? 'left-4' : 'left-0.5'}`} />
                                            </button>
                                        </div>
                                    </div>
                                    
                                    {user?.tipe_user_id === 1 && (
                                        <div className="mb-3 animate-in slide-in-from-left-2">
                                            <SearchableSelect 
                                                label="Filter Instansi" 
                                                value={filterInstansi} 
                                                options={instansiList.map(i => ({ id: String(i.id), label: i.instansi }))} 
                                                displayField="label" 
                                                onChange={(val) => setFilterInstansi(val)}
                                                className="scale-90 origin-left"
                                            />
                                        </div>
                                    )}

                                    <SearchableSelect 
                                        label="Pegawai"
                                        options={mappedEmployeeOptions}
                                        displayField="nama_lengkap"
                                        secondaryField="bidang_singkatan"
                                        value={selectedEmployeeId}
                                        onChange={(id) => {
                                            setSelectedEmployeeId(id);
                                            const emp = employees.find(e => e.id === id);
                                            if (emp && selectedTemplate) {
                                                handleApplyTemplate(selectedTemplate, emp);
                                            }
                                        }}
                                        showReset
                                    />
                                    <p className="text-[9px] text-slate-400 mt-2 italic px-1">
                                        * Memilih pegawai akan mengisi template isi surat secara otomatis.
                                    </p>
                                </div>
                            )}

                            {/* Method Numbering Hub */}
                            {!isStructuredMode && (!selectedTemplate || selectedTemplate.is_nomor_surat_required) && (
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
                                            <div className="text-[9px] font-bold text-slate-800 uppercase tracking-normal group-hover:text-indigo-600">Buat Nomor Baru</div>
                                            <div className="text-[7px] font-medium text-slate-400 uppercase tracking-normal">Penomoran Internal Aplikasi</div>
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
                                                <div className="text-[9px] font-bold text-white uppercase tracking-normal">Penomoran Sekretariat</div>
                                                <div className="text-[7px] font-medium text-emerald-100 uppercase tracking-normal">Link Spreadsheet Bapperida</div>
                                            </div>
                                        </a>
                                    )}
                                </div>
                            </div>
                        )}

                            {!isStructuredMode && (!selectedTemplate || selectedTemplate.is_nomor_surat_required) && (
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
                            )}

                            {!isStructuredMode && (
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
                            )}

                            {!isStructuredMode && (!selectedTemplate || selectedTemplate.is_nomor_surat_required) && (
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
                            )}

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tanggal Surat</label>
                                <input 
                                    type="date" 
                                    className="input-modern w-full font-bold"
                                    value={formData.tanggal_surat}
                                    onChange={e => setFormData({...formData, tanggal_surat: e.target.value})}
                                />
                            </div>

                            {!isStructuredMode && (
                                <div className="space-y-1.5 md:col-span-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tujuan (Kepada Yth.)</label>
                                    <textarea 
                                        className="input-modern w-full font-bold h-20 resize-none"
                                        placeholder="Daftar Terlampir..."
                                        value={formData.tujuan_surat}
                                        onChange={e => setFormData({...formData, tujuan_surat: e.target.value})}
                                    />
                                </div>
                            )}
                        </div>

                        {/* Text Editor */}
                        <div className="bg-white rounded-[32px] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
                            <div className="p-8 pb-2 border-b border-slate-50 flex items-center gap-3">
                                <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-500">
                                    <Plus size={16} />
                                </div>
                                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest leading-none">
                                    {isStructuredMode ? 'Detail Format Surat Terstruktur' : 'Isi Surat (Elektronik Editor)'}
                                </h3>
                            </div>
                            <div className="p-8">
                                {isStructuredMode ? (
                                    <StructuredLeaveForm 
                                        data={structuredData} 
                                        onChange={setStructuredData} 
                                        employeeData={employees.find(e => e.id === selectedEmployeeId)}
                                    />
                                ) : (
                                    <div className="prose-editor-container">
                                        <ReactQuill 
                                            theme="snow"
                                            modules={modules}
                                            value={formData.isi_surat}
                                            onChange={(val) => setFormData({...formData, isi_surat: val})}
                                            className="h-[400px] mb-12"
                                        />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Signatory Section */}
                        {!isStructuredMode && (
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
                        )}

                    </div>
                </div>

                {/* Preview Section - Modern Simulated Letter */}
                {showPreview && (
                    <div className="w-full lg:max-w-[60%] bg-slate-200 overflow-hidden border-l border-slate-300 animate-in slide-in-from-right duration-500 relative flex flex-col">
                        {/* Zoom Controls */}
                        <div className="absolute top-4 right-4 z-30 flex items-center gap-1 bg-white/80 backdrop-blur-md p-1.5 rounded-2xl border border-white shadow-xl shadow-slate-400/20">
                            <button 
                                onClick={() => setZoom(prev => Math.max(0.3, prev - 0.1))}
                                className="w-8 h-8 flex items-center justify-center text-slate-500 hover:bg-slate-100 rounded-xl transition-all active:scale-90"
                                title="Zoom Out"
                            >
                                <ZoomOut size={16} />
                            </button>
                            <div className="w-12 text-center text-[10px] font-black text-slate-600 tabular-nums">
                                {Math.round(zoom * 100)}%
                            </div>
                            <button 
                                onClick={() => setZoom(prev => Math.min(2.0, prev + 0.1))}
                                className="w-8 h-8 flex items-center justify-center text-slate-500 hover:bg-slate-100 rounded-xl transition-all active:scale-90"
                                title="Zoom In"
                            >
                                <ZoomIn size={16} />
                            </button>
                            <div className="w-px h-4 bg-slate-200 mx-1"></div>
                            <button 
                                onClick={() => setZoom(0.75)}
                                className="w-8 h-8 flex items-center justify-center text-slate-500 hover:bg-slate-100 rounded-xl transition-all active:scale-90"
                                title="Reset Zoom"
                            >
                                <RotateCcw size={14} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-auto p-8 scrollbar-thin">
                            <div 
                                className="bg-white mx-auto shadow-2xl min-h-[11in] text-black relative transition-transform duration-300"
                                style={{ 
                                    transform: `scale(${zoom})`,
                                    transformOrigin: 'top center',
                                    marginBottom: `${(11 * zoom) - 11}in`,
                                    width: selectedTemplate?.paper_size === 'F4' ? '8.5in' : (selectedTemplate?.paper_size === 'Letter' ? '8.5in' : '8.27in'), // A4 is 8.27in
                                    height: selectedTemplate?.paper_size === 'F4' ? '13in' : (selectedTemplate?.paper_size === 'Letter' ? '11in' : '11.69in'),
                                    paddingTop: `${selectedTemplate?.margin_top || 38}mm`, // Default 1.5in is ~38mm
                                    paddingBottom: `${selectedTemplate?.margin_bottom || 25.4}mm`,
                                    paddingLeft: `${selectedTemplate?.margin_left || 38}mm`,
                                    paddingRight: `${selectedTemplate?.margin_right || 25.4}mm`,
                                    fontFamily: selectedTemplate?.font_family || 'serif',
                                    fontSize: `${selectedTemplate?.font_size || 11}pt`
                                }}
                            >
                            
                            {/* KOP Simulation */}
                            {(selectedTemplate?.is_kop_surat_required ?? true) && (
                                <div className="text-center border-b-[3px] border-double border-black pb-2 mb-6">
                                    <div className="flex items-start gap-4">
                                        <div className="w-20 h-24 shrink-0 flex items-center justify-center">
                                            {selectedTemplate?.logo_path === 'garuda' ? (
                                                <img src="/logo-garuda.png" className="max-w-full max-h-full object-contain" alt="Garuda" />
                                            ) : (selectedTemplate?.logo_path === 'tegar_beriman' || !selectedTemplate?.logo_path) && instanceProfile?.logo_kop_path ? (
                                                <img src={instanceProfile.logo_kop_path} className="max-w-full max-h-full object-contain" alt="Logo" />
                                            ) : (
                                                <div className="w-16 h-20 bg-slate-100 border border-slate-200 rounded flex items-center justify-center text-[10px] font-bold text-slate-400">LOGO</div>
                                            )}
                                        </div>
                                        <div className="flex-1 text-center pr-16 uppercase">
                                            <div className="text-[1.2em] font-bold leading-tight">PEMERINTAH KABUPATEN BOGOR</div>
                                            <div className="text-[1.4em] font-bold leading-tight">{instanceProfile?.nama_instansi_kop || instanceProfile?.instansi || 'NAMA INSTANSI'}</div>
                                            <div className="text-[0.7em] normal-case font-serif mt-1 italic">
                                                {instanceProfile?.alamat || 'Alamat Lengkap Instansi'} {instanceProfile?.kode_pos ? 'Kode Pos ' + instanceProfile.kode_pos : ''}<br/>
                                                {instanceProfile?.telepon_kop ? 'Telepon: ' + instanceProfile.telepon_kop : ''} {instanceProfile?.faks_kop ? 'Faksimile: ' + instanceProfile.faks_kop : ''}<br/>
                                                Laman: {instanceProfile?.website_kop || '-'}, Pos-el: {instanceProfile?.email_kop || '-'}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Body Content */}
                            <div className="text-right mb-6">
                                {instanceProfile?.kecamatan || 'Cibinong'}, {new Date(formData.tanggal_surat).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                            </div>

                            {(!selectedTemplate || selectedTemplate.is_nomor_surat_required) && (
                                <table className="w-full border-collapse mb-8">
                                    <tbody>
                                        <tr className="align-top">
                                            <td className="w-[15%]">Nomor</td>
                                            <td className="w-[2%]">:</td>
                                            <td className="w-[48%]">
                                                {(selectedTemplate?.is_nomor_surat_required ?? true) ? (formData.nomor_surat || '...') : '-'}
                                            </td>
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
                            )}

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
