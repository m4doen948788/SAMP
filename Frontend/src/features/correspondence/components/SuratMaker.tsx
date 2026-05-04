import React, { useState, useEffect, useRef, useMemo } from 'react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { QRCodeCanvas } from 'qrcode.react';
import { api } from '@/src/services/api';
import { useAuth } from '@/src/contexts/AuthContext';
import BuatNomorModal from './BuatNomorModal';
import StructuredLeaveForm from './StructuredLeaveForm';
import { composeLeaveLetterHtml, getPaperDimensions, getLetterContentStyle } from '../utils/letterComposers';
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
    margin_top: number;
    margin_bottom: number;
    margin_left: number;
    margin_right: number;
    paper_size: string;
    font_size: number;
    line_height: number;
    text_align: string;
    paragraph_spacing_before: number;
    paragraph_spacing_after: number;
    first_line_indent: number;
}

const BAPPERIDA_SPREADSHEET_URL = 'https://docs.google.com/spreadsheets/u/0/d/1V-wRqlCvmehdAg9w9t6BxdwvQcMbpMkPUuXHt5jd368/htmlview#gid=2005265713';

const toTitleCase = (str: string) => {
    if (!str) return '';
    return str.toLowerCase().replace(/(?:^|\s)\w/g, function(match) {
        return match.toUpperCase();
    });
};

interface SuratMakerProps {
    onNavigate?: (page: string) => void;
}

export default function SuratMaker({ onNavigate }: SuratMakerProps) {
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
        nip_penanda: '',
        margin_top: 20,
        margin_bottom: 20,
        margin_left: 30,
        margin_right: 20,
        paper_size: 'A4',
        font_size: 12,
        line_height: 1.5,
        text_align: 'justify',
        paragraph_spacing_before: 0,
        paragraph_spacing_after: 0,
        first_line_indent: 0
    });

    const [globalSettings, setGlobalSettings] = useState<any>(null);

    const [eventData, setEventData] = useState({
        hari_tanggal: '',
        waktu: '',
        tempat: '',
        tipe: 'Offline',
        link: '',
        agenda: ''
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
        penutup: 'Demikian permintaan ini saya buat untuk dapat dipertimbangkan sebagaimana mestinya.',
        approvers: {
            ketua_tim: null,
            kepala_bidang: null,
            sekretaris: null,
            kepala_badan: null
        }
    });

    const [isGenerating, setIsGenerating] = useState(false);
    const [editSuratId, setEditSuratId] = useState<number | null>(null);
    const [instanceProfile, setInstanceProfile] = useState<any>(null);
    const [isLoadingProfile, setIsLoadingProfile] = useState(true);
    const [showPreview, setShowPreview] = useState(true);
    const [zoom, setZoom] = useState(0.75);

    useEffect(() => {
        if (window.innerWidth < 1024) {
            setShowPreview(false);
        }
    }, []);

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
        if (user) {
            // If superadmin has selected a filter, use that. Otherwise use user's default instansi
            const targetInstansiId = (user?.tipe_user_id === 1 && filterInstansi) 
                ? Number(filterInstansi) 
                : user.instansi_id;
            
            if (targetInstansiId) {
                fetchInstanceProfile(targetInstansiId);
            }
            
            fetchTemplates();
            fetchEmployees();
            fetchInstansiList();
            fetchGlobalSettings();
        }
    }, [user, filterInstansi]);

    const fetchGlobalSettings = async () => {
        try {
            const res = await api.suratTemplate.getGlobal();
            if (res.success) {
                setGlobalSettings(res.data);
            }
        } catch (err) {
            console.error('Failed to fetch global settings:', err);
        }
    };

    useEffect(() => {
        const storedId = localStorage.getItem('edit_surat_id');
        if (storedId && employees.length > 0 && templates.length > 0) {
            const id = Number(storedId);
            setEditSuratId(id);
            fetchEditData(id);
            localStorage.removeItem('edit_surat_id');
        }
    }, [employees, templates]);

    const fetchEditData = async (id: number) => {
        try {
            const res = await api.surat.getById(id);
            if (res.success && res.data) {
                const s = res.data;
                setFormData({
                    nomor_surat: s.nomor_surat || '',
                    perihal: s.perihal || '',
                    lampiran: s.lampiran || '-',
                    sifat: s.sifat || 'Penting',
                    tanggal_surat: s.tanggal_surat ? s.tanggal_surat.split('T')[0] : new Date().toISOString().split('T')[0],
                    tujuan_surat: s.tujuan_surat || 'Terlampir',
                    isi_surat: s.isi_surat || '',
                    tembusan: s.tembusan || '',
                    nama_penanda: s.nama_penanda || '',
                    jabatan_penanda: s.jabatan_penanda || 'KEPALA,',
                    nip_penanda: s.nip_penanda || ''
                });
                
                if (s.employee_id) {
                    setSelectedEmployeeId(s.employee_id);
                }
                
                if (s.metadata) {
                    const meta = typeof s.metadata === 'string' ? JSON.parse(s.metadata) : s.metadata;
                    if (meta.eventData) {
                        setEventData(meta.eventData);
                    }
                    setStructuredData(meta);
                }
                
                if (s.jenis_surat_id) {
                    const template = templates.find(t => t.id === s.jenis_surat_id);
                    if (template) setSelectedTemplate(template);
                }
            }
        } catch (err) {
            console.error('Failed to fetch edit data', err);
        }
    };

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

    const fetchInstanceProfile = async (targetId?: number) => {
        try {
            setIsLoadingProfile(true);
            const idToFetch = targetId || user?.instansi_id;
            
            if (!idToFetch) {
                console.warn('Cannot fetch instance profile: No ID provided');
                setIsLoadingProfile(false);
                return;
            }
            
            const res = await api.internalInstansi.get(idToFetch);
            if (res.success) {
                setInstanceProfile(res.data.instansiDetail);
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
            const employee = employees.find(e => Number(e.id) === Number(selectedEmployeeId));
            const html = composeLeaveLetterHtml(structuredData, employee);
            setFormData(prev => ({
                ...prev,
                isi_surat: html,
                tujuan_surat: structuredData.tujuan?.jabatan || prev.tujuan_surat,
                jabatan_penanda: ' ', // Empty spaces so the backend DOCX engine ignores the standard signature block
                nama_penanda: ' ',
                nip_penanda: ' '
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
                        jabatan: 'Kepala ' + toTitleCase(instanceProfile?.nama_instansi_kop || instanceProfile?.instansi || '')
                    }
                }));
            } else {
                setFormData(prev => ({
                    ...prev,
                    jabatan_penanda: prev.jabatan_penanda.trim() === '' ? 'KEPALA,' : prev.jabatan_penanda,
                    nama_penanda: prev.nama_penanda.trim() === '' ? '' : prev.nama_penanda,
                    nip_penanda: prev.nip_penanda.trim() === '' ? '' : prev.nip_penanda
                }));
            }

                // Sync layout properties from template to formData
                const useGlobal = !!selectedTemplate.use_global_settings;
                const source = useGlobal && globalSettings ? globalSettings : selectedTemplate;

                setFormData(prev => ({
                    ...prev,
                    margin_top: source.margin_top || 20,
                    margin_bottom: source.margin_bottom || 20,
                    margin_left: source.margin_left || 30,
                    margin_right: source.margin_right || 20,
                    paper_size: source.paper_size || 'A4',
                    font_size: source.font_size || 12,
                    line_height: source.line_height || 1.5,
                    text_align: source.text_align || 'justify',
                    paragraph_spacing_before: selectedTemplate.paragraph_spacing_before || (useGlobal ? globalSettings?.paragraph_spacing_before : 0) || 0,
                    paragraph_spacing_after: selectedTemplate.paragraph_spacing_after || (useGlobal ? globalSettings?.paragraph_spacing_after : 0) || 0,
                    first_line_indent: selectedTemplate.first_line_indent || (useGlobal ? globalSettings?.first_line_indent : 0) || 0
                }));
            } else {
                setIsStructuredMode(false);
            }
        }, [selectedTemplate, instanceProfile, globalSettings]);

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


    const handleSubmitDraft = async () => {
        setIsGenerating(true);
        try {
            const approvers = [];
            let urutan = 1;

            const selectedEmployee = employees.find(e => Number(e.id) === Number(selectedEmployeeId));

            if (isStructuredMode && selectedEmployee) {
                if (!selectedEmployee.user_id) {
                    alert('Pegawai pengusul belum memiliki akun sistem. Tidak dapat memproses persetujuan digital.');
                    setIsGenerating(false);
                    return;
                }
                approvers.push({ role: 'pengusul', approver_id: Number(selectedEmployee.user_id), urutan: urutan++ });
            }

            if (structuredData.approvers.ketua_tim) {
                if (!structuredData.approvers.ketua_tim.user_id) {
                    alert('Ketua Tim yang dipilih belum memiliki akun sistem.');
                    setIsGenerating(false);
                    return;
                }
                approvers.push({ role: 'ketua_tim', approver_id: structuredData.approvers.ketua_tim.user_id, urutan: urutan++ });
            }

            if (structuredData.approvers.kepala_bidang) {
                if (!structuredData.approvers.kepala_bidang.user_id) {
                    alert('Kepala Bidang yang dipilih belum memiliki akun sistem.');
                    setIsGenerating(false);
                    return;
                }
                approvers.push({ role: 'kabid', approver_id: structuredData.approvers.kepala_bidang.user_id, urutan: urutan++ });
            }
            if (structuredData.approvers.sekretaris) {
                if (!structuredData.approvers.sekretaris.user_id) {
                    alert('Sekretaris yang dipilih belum memiliki akun sistem.');
                    setIsGenerating(false);
                    return;
                }
                approvers.push({ role: 'sekretaris', approver_id: structuredData.approvers.sekretaris.user_id, urutan: urutan++ });
            }
            if (structuredData.approvers.kepala_badan) {
                if (!structuredData.approvers.kepala_badan.user_id) {
                    alert('Kepala Badan yang dipilih belum memiliki akun sistem.');
                    setIsGenerating(false);
                    return;
                }
                approvers.push({ role: 'kaban', approver_id: structuredData.approvers.kepala_badan.user_id, urutan: urutan++ });
            }

            if (approvers.length === 0) {
                alert('Pilih setidaknya satu pejabat untuk menyetujui dokumen ini.');
                setIsGenerating(false);
                return;
            }

            const htmlContent = composeLeaveLetterHtml(
                structuredData, 
                employees.find(e => Number(e.id) === Number(selectedEmployeeId))
            );

            const payload = {
                surat_id: editSuratId,
                draft_data: {
                    ...formData,
                    isi_surat: htmlContent,
                    jenis_surat_id: selectedTemplate?.id,
                    metadata: (isStructuredMode || selectedTemplate?.has_event_details) 
                        ? JSON.stringify({ 
                            ...(isStructuredMode ? structuredData : {}), 
                            ...(selectedTemplate?.has_event_details ? { eventData } : {}) 
                        }) 
                        : null,
                    employee_id: isStructuredMode ? selectedEmployeeId : null
                },
                approvers
            };

            const res = await api.suratApprovals.submitDraft(payload);
            if (res.success) {
                alert('Dokumen berhasil diajukan untuk persetujuan berjenjang!');
                if (onNavigate) onNavigate('manajemen-surat');
            } else {
                alert('Gagal mengajukan dokumen: ' + res.message);
            }
        } catch (error: any) {
            alert('Terjadi kesalahan: ' + error.message);
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
        <>
            <div className="flex flex-col h-screen -m-6 bg-slate-50 overflow-hidden">
            {/* Toolbar Top */}
            <div className="bg-white border-b border-slate-200 px-4 md:px-6 py-2 md:py-1.5 flex items-center justify-between z-20 shadow-sm flex-wrap gap-y-2">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-ppm-slate rounded-lg flex items-center justify-center text-white shadow-lg shadow-ppm-slate/20">
                        <FileText size={18} />
                    </div>
                    <div>
                        <h1 className="text-sm font-black text-slate-800 leading-tight tracking-tight uppercase">Dashboard [Singkatan Instansi]</h1>
                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Sistem Manajemen Surat & Dokumen Elektronik</p>
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
                    {isStructuredMode && (
                        <>
                            <div className="h-6 w-px bg-slate-200"></div>
                            <button 
                                onClick={handleSubmitDraft}
                                disabled={isGenerating || (!structuredData.approvers.ketua_tim && !structuredData.approvers.kepala_bidang && !structuredData.approvers.sekretaris && !structuredData.approvers.kepala_badan)}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg py-1 px-3 flex items-center gap-1.5 group shadow-lg shadow-emerald-500/20 active:scale-95 disabled:opacity-50 text-[9px] font-black tracking-widest uppercase transition-colors"
                            >
                                {isGenerating ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} className="group-hover:-translate-y-0.5 transition-transform" />}
                                AJUKAN PERSETUJUAN
                            </button>
                        </>
                    )}
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden relative">
                {/* Editor Section */}
                <div className={`flex-1 overflow-y-auto p-4 md:p-8 scrollbar-thin transition-all duration-500 ${showPreview ? 'hidden lg:block lg:max-w-[40%]' : 'block max-w-4xl mx-auto w-full'}`}>
                    <div className="space-y-6 md:space-y-8 pb-20">
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
                            {selectedTemplate && !!selectedTemplate.is_pegawai_required && (
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
                            {!isStructuredMode && (!selectedTemplate || Boolean(selectedTemplate.is_nomor_surat_required)) && (
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

                            {!isStructuredMode && (!selectedTemplate || Boolean(selectedTemplate.is_nomor_surat_required)) && (
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

                            {!isStructuredMode && (!selectedTemplate || Boolean(selectedTemplate.is_nomor_surat_required)) && (
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

                            {!!selectedTemplate?.has_event_details && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-8 rounded-[32px] shadow-xl shadow-slate-200/50 border border-slate-100 md:col-span-2">
                                    <div className="md:col-span-2 flex items-center gap-3 mb-2">
                                        <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center text-amber-500">
                                            <Calendar size={16} />
                                        </div>
                                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest leading-none">Detail Acara / Rapat</h3>
                                    </div>
                                    
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Hari / Tanggal</label>
                                        <input 
                                            type="text" 
                                            className="input-modern w-full font-bold"
                                            placeholder="Senin, 01 Januari 2024"
                                            value={eventData.hari_tanggal}
                                            onChange={e => setEventData({...eventData, hari_tanggal: e.target.value})}
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Waktu</label>
                                        <input 
                                            type="text" 
                                            className="input-modern w-full font-bold"
                                            placeholder="09.00 WIB s.d Selesai"
                                            value={eventData.waktu}
                                            onChange={e => setEventData({...eventData, waktu: e.target.value})}
                                        />
                                    </div>

                                    <div className="space-y-1.5 md:col-span-2">
                                        <div className="flex items-center justify-between mb-1">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tempat / Lokasi</label>
                                            <div className="flex items-center gap-4">
                                                <label className="flex items-center gap-2 cursor-pointer group">
                                                    <input 
                                                        type="radio" 
                                                        name="event_tipe" 
                                                        checked={eventData.tipe === 'Offline'} 
                                                        onChange={() => setEventData({...eventData, tipe: 'Offline'})}
                                                        className="w-3 h-3 text-indigo-600 focus:ring-indigo-500"
                                                    />
                                                    <span className="text-[10px] font-black text-slate-600 group-hover:text-indigo-600 transition-colors uppercase">Offline</span>
                                                </label>
                                                <label className="flex items-center gap-2 cursor-pointer group">
                                                    <input 
                                                        type="radio" 
                                                        name="event_tipe" 
                                                        checked={eventData.tipe === 'Online'} 
                                                        onChange={() => setEventData({...eventData, tipe: 'Online'})}
                                                        className="w-3 h-3 text-indigo-600 focus:ring-indigo-500"
                                                    />
                                                    <span className="text-[10px] font-black text-slate-600 group-hover:text-indigo-600 transition-colors uppercase">Online</span>
                                                </label>
                                            </div>
                                        </div>
                                        <input 
                                            type="text" 
                                            className="input-modern w-full font-bold"
                                            placeholder={eventData.tipe === 'Offline' ? 'Ruang Rapat A, Lantai 2' : 'Zoom Cloud Meetings'}
                                            value={eventData.tempat}
                                            onChange={e => setEventData({...eventData, tempat: e.target.value})}
                                        />
                                    </div>

                                    {eventData.tipe === 'Online' && (
                                        <div className="space-y-1.5 md:col-span-2 animate-in slide-in-from-top-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Link Pertemuan (Zoom/Meet/dll)</label>
                                            <input 
                                                type="text" 
                                                className="input-modern w-full font-bold text-indigo-600"
                                                placeholder="https://zoom.us/j/..."
                                                value={eventData.link}
                                                onChange={e => setEventData({...eventData, link: e.target.value})}
                                            />
                                        </div>
                                    )}

                                    <div className="space-y-1.5 md:col-span-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Agenda / Acara</label>
                                        <textarea 
                                            className="input-modern w-full font-bold h-20 resize-none"
                                            placeholder="Pembahasan mengenai..."
                                            value={eventData.agenda}
                                            onChange={e => setEventData({...eventData, agenda: e.target.value})}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {selectedTemplate && (
                            <>
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
                                    <div className="space-y-6">
                                        <StructuredLeaveForm 
                                            data={structuredData} 
                                            onChange={setStructuredData} 
                                            employeeData={employees.find(e => e.id === selectedEmployeeId)}
                                            employees={employees}
                                        />
                                        <div className="flex justify-end pt-4 border-t border-slate-100">
                                            <button 
                                                onClick={handleSubmitDraft}
                                                disabled={isGenerating || (!structuredData.approvers?.ketua_tim && !structuredData.approvers?.kepala_bidang && !structuredData.approvers?.sekretaris && !structuredData.approvers?.kepala_badan)}
                                                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl py-3 px-8 flex items-center gap-2 group shadow-xl shadow-emerald-500/20 active:scale-95 disabled:opacity-50 text-[11px] font-black tracking-widest uppercase transition-all"
                                            >
                                                {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} className="group-hover:-translate-y-0.5 transition-transform" />}
                                                AJUKAN PERSETUJUAN
                                            </button>
                                        </div>
                                    </div>
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
                            </>
                        )}

                    </div>
                </div>

                {/* Preview Section - Modern Simulated Letter */}
                {showPreview && (
                    <div className="w-full lg:max-w-[60%] lg:flex-1 bg-slate-200 overflow-hidden lg:border-l border-slate-300 animate-in slide-in-from-right duration-500 relative flex flex-col">
                        {/* Zoom Controls */}
                        {selectedTemplate && (
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
                        )}

                        <div className="flex-1 overflow-auto p-4 md:p-8 scrollbar-thin flex flex-col items-center">
                            {!selectedTemplate ? (
                                <div className="flex items-center justify-center h-full">
                                    <div className="text-center text-slate-400 font-bold uppercase tracking-widest text-xs flex flex-col items-center gap-3">
                                        <FileText size={48} className="text-slate-300" />
                                        Pilih Jenis Surat untuk Menampilkan Preview
                                    </div>
                                </div>
                            ) : (
                                <div 
                                    className="bg-white mx-auto shadow-2xl text-black relative transition-all duration-300"
                                style={{ 
                                    transform: `scale(${zoom})`,
                                    transformOrigin: 'top center',
                                    marginBottom: `${(parseFloat(getPaperDimensions(formData.paper_size).height) * zoom) - parseFloat(getPaperDimensions(formData.paper_size).height)}mm`,
                                    width: getPaperDimensions(formData.paper_size).width,
                                    height: getPaperDimensions(formData.paper_size).height,
                                    paddingTop: `${formData.margin_top}mm`,
                                    paddingBottom: `${formData.margin_bottom}mm`,
                                    paddingLeft: `${formData.margin_left}mm`,
                                    paddingRight: `${formData.margin_right}mm`,
                                    fontFamily: (selectedTemplate?.use_global_settings && globalSettings) ? globalSettings.font_family : (selectedTemplate?.font_family || 'Arial, sans-serif'),
                                    fontSize: `${formData.font_size || 12}pt`,
                                    lineHeight: formData.line_height || 1.5,
                                    textAlign: (formData.text_align as any) || 'justify'
                                }}
                            >
                                <style dangerouslySetInnerHTML={{ __html: getLetterContentStyle({
                                    paragraph_spacing_before: formData.paragraph_spacing_before,
                                    paragraph_spacing_after: formData.paragraph_spacing_after,
                                    first_line_indent: formData.first_line_indent
                                }) }} />
                            
                            {/* KOP Simulation */}
                            {!!(selectedTemplate?.is_kop_surat_required ?? true) && (
                                (isStructuredMode || selectedTemplate?.logo_path === 'none') ? (
                                    <div className="text-left font-bold mb-8 uppercase leading-tight">
                                        PEMERINTAH DAERAH KABUPATEN BOGOR<br/>
                                        <span className="underline">{instanceProfile?.nama_instansi_kop || instanceProfile?.instansi || 'NAMA INSTANSI'}</span>
                                    </div>
                                ) : (
                                    <div className="text-center mb-6">
                                        <table className="w-full border-collapse mb-1">
                                            <tbody>
                                                <tr>
                                                    <td className="w-[95px] text-left align-middle">
                                                        {selectedTemplate?.logo_path === 'garuda' ? (
                                                            <img src="/logo-garuda.png" style={{ width: '85px', height: 'auto', display: 'block' }} alt="Garuda" />
                                                        ) : (selectedTemplate?.logo_path === 'tegar_beriman' || !selectedTemplate?.logo_path) && instanceProfile?.logo_kop_path ? (
                                                            <img src={instanceProfile.logo_kop_path} style={{ width: '85px', height: 'auto', display: 'block' }} alt="Logo" />
                                                        ) : (
                                                            <div className="flex-shrink-0">
                                                                {formData.logo_path ? (
                                                                    <img src={formData.logo_path} style={{ width: '85px', height: 'auto', display: 'block' }} alt="Instansi Logo" />
                                                                ) : (
                                                                    <div className="w-[85px] h-20 bg-slate-100 border border-slate-200 rounded flex items-center justify-center text-[10px] font-bold text-slate-400">LOGO</div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="text-center align-middle px-[5px] uppercase">
                                                        <div className="text-[13pt] font-bold leading-[1.1]">PEMERINTAH KABUPATEN BOGOR</div>
                                                        <div className="text-[15pt] font-bold leading-[1.1]">
                                                            {(() => {
                                                                const name = (instanceProfile?.nama_instansi_kop || instanceProfile?.instansi || 'NAMA INSTANSI').toUpperCase();
                                                                const splitKey = ' RISET';
                                                                if (name.includes(splitKey)) {
                                                                    const parts = name.split(splitKey);
                                                                    return (
                                                                        <>
                                                                            {parts[0]}<br/>
                                                                            RISET{parts[1]}
                                                                        </>
                                                                    );
                                                                }
                                                                return name;
                                                            })()}
                                                        </div>
                                                        <div className="text-[7pt] normal-case font-normal mt-1 leading-[1.2]">
                                                            {instanceProfile?.alamat || 'Alamat Lengkap Instansi'} Kode Pos {instanceProfile?.kode_pos || ''} Telp: {instanceProfile?.telepon_kop || ''} Faks: {instanceProfile?.faks_kop || ''}<br/>
                                                            Laman: {instanceProfile?.website_kop || '-'} | Pos-el: {instanceProfile?.email_kop || '-'}
                                                        </div>
                                                    </td>
                                                    <td className="w-[95px]"></td>
                                                </tr>
                                            </tbody>
                                        </table>
                                        
                                        {/* Dynamic Border */}
                                        {selectedTemplate?.kop_line_style !== 'none' && (
                                            <>
                                                {(() => {
                                                    const lineStyle = selectedTemplate?.kop_line_style || 'double';
                                                    if (lineStyle === 'single') {
                                                        return <div className="border-b-[1.5pt] border-black mt-1"></div>;
                                                    } else if (lineStyle === 'thick') {
                                                        return <div className="border-b-[3pt] border-black mt-1"></div>;
                                                    } else if (lineStyle === 'double' || lineStyle === 'heavy-light' || lineStyle === 'light-heavy') {
                                                        const top = (lineStyle === 'double' || lineStyle === 'heavy-light') ? '2.25pt' : '0.75pt';
                                                        const bottom = (lineStyle === 'double' || lineStyle === 'heavy-light') ? '0.75pt' : '2.25pt';
                                                        return (
                                                            <>
                                                                <div style={{ borderBottom: `${top} solid #000`, marginTop: '4pt' }}></div>
                                                                <div style={{ borderBottom: `${bottom} solid #000`, marginTop: '2pt' }}></div>
                                                            </>
                                                        );
                                                    }
                                                    return <div className="border-b-[1.5pt] border-black mt-1"></div>;
                                                })()}
                                            </>
                                        )}
                                    </div>
                                )
                            )}

                            {/* Body Content */}
                            <div className="text-right mb-6">
                                {toTitleCase(instanceProfile?.kecamatan || 'Cibinong')}, {new Date(formData.tanggal_surat).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                            </div>

                            {(!selectedTemplate || (Boolean(selectedTemplate.is_nomor_surat_required) && !isStructuredMode)) && (
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
                                    id="letter-content"
                                    className="text-justify mb-8 min-h-[100px]"
                                    style={{ fontSize: `${formData.font_size || 12}pt` }}
                                    dangerouslySetInnerHTML={{ __html: formData.isi_surat }}
                                />

                                {!!selectedTemplate?.has_event_details && (
                                    <div className="mt-8 pt-6 border-t border-slate-100 animate-in fade-in duration-700">
                                        <div className="flex items-center gap-2 mb-4">
                                            <div className="w-6 h-6 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center">
                                                <Calendar size={12} />
                                            </div>
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Detail Acara Terkait</span>
                                        </div>
                                        <table className="w-full border-collapse" style={{ fontSize: `${formData.font_size || 12}pt` }}>
                                            <tbody className="divide-y divide-slate-50">
                                                <tr className="align-top">
                                                    <td className="w-[18%] py-1">Hari/Tgl</td>
                                                    <td className="w-[2%] py-1">:</td>
                                                    <td className="w-[80%] font-bold py-1">{eventData.hari_tanggal || '...'}</td>
                                                </tr>
                                                <tr className="align-top">
                                                    <td className="py-1">Waktu</td>
                                                    <td className="py-1">:</td>
                                                    <td className="py-1">{eventData.waktu || '...'}</td>
                                                </tr>
                                                <tr className="align-top">
                                                    <td className="py-1">Tempat</td>
                                                    <td className="py-1">:</td>
                                                    <td className="py-1">
                                                        {eventData.tempat || '...'}
                                                        {(eventData.tipe === 'Online' && eventData.link) ? (
                                                            <div className="mt-1 text-blue-600 underline">Link: {eventData.link}</div>
                                                        ) : null}
                                                    </td>
                                                </tr>
                                                <tr className="align-top">
                                                    <td className="py-1">Agenda</td>
                                                    <td className="py-1">:</td>
                                                    <td className="py-1">{eventData.agenda || '...'}</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                )}


                            {!isStructuredMode ? (
                                <div className="flex justify-end text-[11pt]">
                                    <div className="w-[50%] text-center uppercase">
                                        <div className="text-left inline-block">
                                            {formData.jabatan_penanda}<br/><br/><br/><br/>
                                            <strong>{formData.nama_penanda || 'NAMA PEJABAT'}</strong><br/>
                                            {formData.nip_penanda ? `NIP. ${formData.nip_penanda}` : null}
                                        </div>
                                    </div>
                                </div>
                            ) : null}

                            {(() => {
                                const logoUrl = instanceProfile?.logo_kop_path || '/logo-garuda.png';
                                return (
                                    <div className="select-none pointer-events-none" style={{ position: 'absolute', bottom: '5mm', left: '5mm', zIndex: 10 }}>
                                        <div className="p-1 bg-white border border-slate-100 rounded shadow-sm flex items-center justify-center">
                                            <QRCodeCanvas 
                                                value="PREVIEW_ONLY"
                                                size={60}
                                                level="H"
                                                includeMargin={false}
                                                imageSettings={{
                                                    src: logoUrl,
                                                    x: undefined,
                                                    y: undefined,
                                                    height: 15,
                                                    width: 15,
                                                    excavate: true,
                                                }}
                                            />
                                        </div>
                                    </div>
                                );
                            })()}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
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
        </>
    );
}
