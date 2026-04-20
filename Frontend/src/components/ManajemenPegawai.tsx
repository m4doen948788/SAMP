import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { createPortal } from 'react-dom';
import { api } from '../services/api';
import { Plus, Edit2, Trash2, Eye, X, Check, Loader2, Search, Users, MapPin, Briefcase, GraduationCap, FileText, Upload, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import XLSXStyle from 'xlsx-js-style';
import { useLabels } from '../contexts/LabelContext';
import { SearchableSelect } from './common/SearchableSelect';

const PAGE_SIZES = [10, 20, 50, 100, 0];
const MAX_VISIBLE_PAGES = 5;

const emptyForm = {
    gelar_depan: '',
    nama: '',
    gelar_belakang: '',
    nama_lengkap: '',
    nip: '',
    email: '',
    no_hp: '',
    tipe_user_id: null as number | null,
    jenis_pegawai_id: null as number | null,
    instansi_id: null as number | null,
    jabatan_id: null as number | null,
    bidang_id: null as number | null,
    sub_bidang_ids: [] as number[],
    tempat_lahir: '',
    tanggal_lahir: '',
    jenis_kelamin: '',
    agama: '',
    status_perkawinan: '',
    golongan_darah: '',
    alamat_lengkap: '',
    provinsi_id: '',
    kota_kabupaten_id: '',
    kecamatan_id: '',
    kelurahan_id: '',
    npwp: '',
    no_bpjs_kesehatan: '',
    no_bpjs_ketenagakerjaan: '',
    pangkat_golongan_id: null as number | null,
    tmt_cpns: '',
    tmt_pns: '',
    masa_kerja_tahun: '',
    masa_kerja_bulan: '',
    pendidikan_terakhir: '',
    username: '',
    password: ''
};

const calculateCompletion = (item: any) => {
    const fields = [
        { key: 'nama_lengkap', label: 'Nama Lengkap' },
        { key: 'nip', label: 'NIP' },
        { key: 'tempat_lahir', label: 'Tempat Lahir' },
        { key: 'tanggal_lahir', label: 'Tanggal Lahir' },
        { key: 'jenis_kelamin', label: 'Jenis Kelamin' },
        { key: 'alamat_lengkap', label: 'Alamat' },
        { key: 'no_hp', label: 'No HP' },
        { key: 'npwp', label: 'NPWP' },
        { key: 'email', label: 'Email' },
        { key: 'instansi_id', label: 'Instansi' },
        { key: 'jabatan_id', label: 'Jabatan' },
        { key: 'bidang_id', label: 'Bidang' },
        { key: 'sub_bidang_ids', label: 'Tim/Seksi' },
        { key: 'pangkat_golongan_id', label: 'Pangkat/Golongan' },
        { key: 'pendidikan_terakhir', label: 'Pendidikan' }
    ];

    const filled = fields.filter(f => {
        const val = item[f.key];
        if (Array.isArray(val)) return val.length > 0;
        return val !== null && val !== '' && val !== undefined && val !== 0;
    });
    const missing = fields.filter(f => {
        const val = item[f.key];
        if (Array.isArray(val)) return val.length === 0;
        return val === null || val === '' || val === undefined || val === 0;
    });

    return {
        percentage: Math.round((filled.length / fields.length) * 100),
        filledCount: filled.length,
        totalCount: fields.length,
        missing: missing.map(m => m.label)
    };
};

const ManajemenPegawai = () => {
    const { user: currentUser, updateUser } = useAuth();
    const isSuperAdmin = currentUser?.tipe_user_id === 1;
    const hasEditAccess = isSuperAdmin || (currentUser?.jabatan_nama === 'Kepala Sub Bagian' && currentUser?.sub_bidang_nama === 'Umum dan Kepegawaian');
    const { getLabel } = useLabels();

    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Master lists
    const [instansiList, setInstansiList] = useState<any[]>([]);
    const [jabatanList, setJabatanList] = useState<any[]>([]);
    const [bidangList, setBidangList] = useState<any[]>([]);
    const [subBidangList, setSubBidangList] = useState<any[]>([]);
    const [tipeUserList, setTipeUserList] = useState<any[]>([]);
    const [jenisPegawaiList, setJenisPegawaiList] = useState<any[]>([]);
    const [pangkatList, setPangkatList] = useState<any[]>([]);
    const [expandedMissingId, setExpandedMissingId] = useState<number | null>(null);
    const [popoverCoords, setPopoverCoords] = useState({ top: 0, left: 0 });
    const buttonRefs = useRef<{ [key: number]: HTMLButtonElement | null }>({});

    // Wilayah
    const [provinsi, setProvinsi] = useState<any[]>([]);
    const [kotaKab, setKotaKab] = useState<any[]>([]);
    const [kecamatan, setKecamatan] = useState<any[]>([]);
    const [kelurahan, setKelurahan] = useState<any[]>([]);

    // UI state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);
    const [formData, setFormData] = useState({ ...emptyForm });
    const [activeTab, setActiveTab] = useState('umum'); // umum, detail, wilayah, kepegawaian

    // Auto-concatenate name
    useEffect(() => {
        const { gelar_depan, nama, gelar_belakang } = formData;
        if (!nama && !gelar_depan && !gelar_belakang) return;
        
        let full = nama || '';
        if (gelar_depan) full = `${gelar_depan} ${full}`;
        if (gelar_belakang) {
            if (full) full = `${full}, ${gelar_belakang}`;
            else full = gelar_belakang;
        }
        
        if (full !== formData.nama_lengkap) {
            setFormData(prev => ({ ...prev, nama_lengkap: full }));
        }
    }, [formData.gelar_depan, formData.nama, formData.gelar_belakang]);

    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [importData, setImportData] = useState<any[]>([]);
    const [importLoading, setImportLoading] = useState(false);
    const [bulkLoading, setBulkLoading] = useState(false);

    const [search, setSearch] = useState('');
    const [pageSize, setPageSize] = useState(10);
    const [currentPage, setCurrentPage] = useState(1);
    const [filterInstansi, setFilterInstansi] = useState<number | null>(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [
                pegawaiRes,
                instansiRes,
                jabatanRes,
                bidangRes,
                subBidangRes,
                tipeUserRes,
                jenisPegawaiRes,
                pangkatRes,
                provinsiRes
            ] = await Promise.all([
                api.profilPegawai.getAll(),
                api.instansiDaerah.getAll().catch(() => ({ success: false, data: [] })),
                api.masterDataConfig.getDataByTable('master_jabatan').catch(() => ({ success: false, data: [] })),
                api.bidangInstansi.getAll().catch(() => ({ success: false, data: [] })),
                api.subBidangInstansi.getAll().catch(() => ({ success: false, data: [] })),
                api.masterDataConfig.getDataByTable('master_tipe_user').catch(() => ({ success: false, data: [] })),
                api.masterDataConfig.getDataByTable('master_jenis_pegawai').catch(() => ({ success: false, data: [] })),
                api.masterDataConfig.getDataByTable('master_pangkat_golongan').catch(() => ({ success: false, data: [] })),
                api.wilayah.getProvinsi().catch(() => ({ success: false, data: [] }))
            ]);

            if (pegawaiRes.success) setData(pegawaiRes.data);
            if (instansiRes.success) setInstansiList(instansiRes.data);
            if (jabatanRes.success) setJabatanList(jabatanRes.data);
            if (bidangRes.success) setBidangList(bidangRes.data);
            if (subBidangRes.success) setSubBidangList(subBidangRes.data);
            if (tipeUserRes.success) setTipeUserList(tipeUserRes.data);
            if (jenisPegawaiRes.success) setJenisPegawaiList(jenisPegawaiRes.data);
            if (pangkatRes.success) setPangkatList(pangkatRes.data);
            if (provinsiRes.success) setProvinsi(provinsiRes.data);

        } catch (err) {
            setError('Gagal mengambil data pegawai');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    // Load dependent wilayah data
    useEffect(() => {
        if (formData.provinsi_id) {
            api.wilayah.getKotaByProvinsi(formData.provinsi_id).then(res => {
                if (res.success) setKotaKab(res.data);
            });
        } else {
            setKotaKab([]);
        }
    }, [formData.provinsi_id]);

    useEffect(() => {
        if (formData.kota_kabupaten_id) {
            api.wilayah.getKecamatanByKota(formData.kota_kabupaten_id).then(res => {
                if (res.success) setKecamatan(res.data);
            });
        } else {
            setKecamatan([]);
        }
    }, [formData.kota_kabupaten_id]);

    useEffect(() => {
        if (formData.kecamatan_id) {
            api.wilayah.getKelurahanByKecamatan(formData.kecamatan_id).then(res => {
                if (res.success) setKelurahan(res.data);
            });
        } else {
            setKelurahan([]);
        }
    }, [formData.kecamatan_id]);

    const filtered = useMemo(() => {
        let result = data;
        
        // Search filter
        if (search.trim()) {
            const q = search.toLowerCase();
            result = result.filter(d =>
                (d.nama_lengkap && d.nama_lengkap.toLowerCase().includes(q)) ||
                (d.nip && d.nip.toLowerCase().includes(q)) ||
                (d.email && d.email.toLowerCase().includes(q)) ||
                (d.instansi_nama && d.instansi_nama.toLowerCase().includes(q)) ||
                (d.jabatan_nama && d.jabatan_nama.toLowerCase().includes(q)) ||
                (d.sub_bidang_nama && d.sub_bidang_nama.toLowerCase().includes(q))
            );
        }

        // Instansi filter (Superadmin only)
        if (isSuperAdmin && filterInstansi) {
            result = result.filter(d => Number(d.instansi_id) === Number(filterInstansi));
        }

        return result;
    }, [data, search, filterInstansi, isSuperAdmin]);

    const totalPages = pageSize === 0 ? 1 : Math.ceil(filtered.length / pageSize);
    const displayed = pageSize === 0 ? filtered : filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    useEffect(() => { setCurrentPage(1); }, [search, pageSize, filterInstansi]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.nama_lengkap.trim()) {
            alert('Nama Lengkap wajib diisi');
            return;
        }

        try {
            let res;
            if (isEditing && editId) {
                res = await api.profilPegawai.update(editId, formData);
            } else {
                res = await api.profilPegawai.create(formData);
            }

            if (res.success) {
                setIsModalOpen(false);
                fetchData();

                // If updating self, also update current auth context
                if (isEditing && editId && currentUser && Number(editId) === Number(currentUser.id)) {
                    // Fetch fresh data for self
                    const freshSelf = await api.profilPegawai.getFullProfile(currentUser.id);
                    if (freshSelf.success) {
                        // Merge user and profil data as expected by AuthContext
                        updateUser({ ...freshSelf.data.user, ...freshSelf.data.profil });
                    }
                }
            } else {
                alert(res.message || 'Gagal menyimpan data');
            }
        } catch (err) {
            alert('Terjadi kesalahan saat menyimpan data');
        }
    };

    const handleBulkCreateAccounts = async () => {
        if (!window.confirm('Buat akun otomatis untuk semua pegawai yang belum memiliki akun?\nUsername akan diambil dari nama depan dan password default "123456".')) return;

        setBulkLoading(true);
        try {
            const res = await api.profilPegawai.bulkCreateAccounts();
            if (res.success) {
                alert(res.message);
                fetchData();
            } else {
                alert(res.message || 'Gagal membuat akun secara otomatis');
            }
        } catch (err) {
            alert('Terjadi kesalahan saat membuat akun');
        } finally {
            setBulkLoading(false);
        }
    };

    const openAddModal = () => {
        setFormData({
            ...emptyForm,
            instansi_id: isSuperAdmin ? null : (currentUser?.instansi_id || null)
        });
        setIsEditing(false);
        setEditId(null);
        setActiveTab('umum');
        setIsModalOpen(true);
    };

    const openEditModal = (item: any) => {
        // Format dates for input type="date"
        const formatDate = (iso: string) => iso ? iso.split('T')[0] : '';

        setFormData({
            gelar_depan: item.gelar_depan || '',
            nama: item.nama || '',
            gelar_belakang: item.gelar_belakang || '',
            nama_lengkap: item.nama_lengkap || '',
            nip: item.nip || '',
            email: item.email || '',
            no_hp: item.no_hp || '',
            tipe_user_id: item.tipe_user_id || null,
            jenis_pegawai_id: item.jenis_pegawai_id || null,
            instansi_id: item.instansi_id || null,
            jabatan_id: item.jabatan_id || null,
            bidang_id: item.bidang_id || null,
            sub_bidang_ids: item.sub_bidang_ids || (item.sub_bidang_id ? [item.sub_bidang_id] : []),
            tempat_lahir: item.tempat_lahir || '',
            tanggal_lahir: formatDate(item.tanggal_lahir),
            jenis_kelamin: item.jenis_kelamin || '',
            agama: item.agama || '',
            status_perkawinan: item.status_perkawinan || '',
            golongan_darah: item.golongan_darah || '',
            alamat_lengkap: item.alamat_lengkap || '',
            provinsi_id: item.provinsi_id || '',
            kota_kabupaten_id: item.kota_kabupaten_id || '',
            kecamatan_id: item.kecamatan_id || '',
            kelurahan_id: item.kelurahan_id || '',
            npwp: item.npwp || '',
            no_bpjs_kesehatan: item.no_bpjs_kesehatan || '',
            no_bpjs_ketenagakerjaan: item.no_bpjs_ketenagakerjaan || '',
            pangkat_golongan_id: item.pangkat_golongan_id || null,
            tmt_cpns: formatDate(item.tmt_cpns),
            tmt_pns: formatDate(item.tmt_pns),
            masa_kerja_tahun: item.masa_kerja_tahun || '',
            masa_kerja_bulan: item.masa_kerja_bulan || '',
            pendidikan_terakhir: item.pendidikan_terakhir || '',
            username: item.username || '',
            password: ''
        });
        setIsEditing(true);
        setEditId(item.id);
        setActiveTab('umum');
        setIsModalOpen(true);
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm('Hapus data pegawai ini?')) return;
        try {
            const res = await api.profilPegawai.delete(id);
            if (res.success) fetchData();
            else alert(res.message);
        } catch {
            alert('Gagal menghapus data');
        }
    };

    const downloadTemplate = () => {
        // Create 11 rows total (1 header + 10 data rows)
        const data = [
            ['No', 'Nama', 'NIP', 'Pangkat/Golongan', 'Jabatan', 'Pendidikan'],
            ['1', 'Contoh Nama Pegawai', '198001012005011001', 'III/a (Penata Muda)', 'Staf Pelaksana', 'S1 Teknik Informatika'],
            ['2', '', '', '', '', ''],
            ['3', '', '', '', '', ''],
            ['4', '', '', '', '', ''],
            ['5', '', '', '', '', ''],
            ['6', '', '', '', '', ''],
            ['7', '', '', '', '', ''],
            ['8', '', '', '', '', ''],
            ['9', '', '', '', '', ''],
            ['10', '', '', '', '', '']
        ];

        // Use XLSXStyle for styled output
        const ws = XLSXStyle.utils.aoa_to_sheet(data);

        // Style definition
        const borderStyle = {
            top: { style: "thin", color: { rgb: "000000" } },
            bottom: { style: "thin", color: { rgb: "000000" } },
            left: { style: "thin", color: { rgb: "000000" } },
            right: { style: "thin", color: { rgb: "000000" } }
        };

        const headerStyle = {
            fill: { fgColor: { rgb: "E2E8F0" } },
            font: { bold: true, color: { rgb: "000000" } },
            alignment: { vertical: "center", horizontal: "center" },
            border: borderStyle
        };

        const cellStyle = {
            alignment: { vertical: "center" },
            border: borderStyle
        };

        // Apply styles to all cells
        const range = XLSXStyle.utils.decode_range(ws['!ref'] || 'A1:F11');
        for (let R = range.s.r; R <= range.e.r; ++R) {
            for (let C = range.s.c; C <= range.e.c; ++C) {
                const cell_address = XLSXStyle.utils.encode_cell({ c: C, r: R });
                if (!ws[cell_address]) ws[cell_address] = { t: 's', v: '' };
                ws[cell_address].s = R === 0 ? headerStyle : cellStyle;
            }
        }

        // Set column widths
        ws['!cols'] = [
            { wch: 8 },  // No
            { wch: 45 }, // Nama
            { wch: 30 }, // NIP
            { wch: 35 }, // Pangkat/Golongan
            { wch: 40 }, // Jabatan
            { wch: 35 }  // Pendidikan
        ];

        // Set row heights
        ws['!rows'] = Array(12).fill({ hpt: 25 });
        ws['!rows'][0] = { hpt: 35 };

        const wb = XLSXStyle.utils.book_new();
        XLSXStyle.utils.book_append_sheet(wb, ws, "Format Impor");
        XLSXStyle.writeFile(wb, "Format_Impor_Pegawai.xlsx");
    };

    const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setImportLoading(true);
        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const bstr = evt.target?.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data = XLSX.utils.sheet_to_json(ws);

                const mappedData = data.map((row: any) => {
                    const findVal = (possibleKeys: string[]) => {
                        const key = Object.keys(row).find(k =>
                            possibleKeys.some(pk => k.toLowerCase().trim() === pk.toLowerCase())
                        );
                        return key ? row[key] : null;
                    };

                    const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9/]/g, '').trim();

                    const rawPangkat = findVal(['pangkat', 'golongan', 'pangkat/golongan', 'pangkat_golongan', 'pangkat/golongan ruang']);
                    const rawJabatan = findVal(['jabatan', 'posisi']);
                    const nama = findVal(['nama', 'nama lengkap', 'nama_lengkap']);
                    const nip = findVal(['nip', 'nomor induk pegawai']);
                    const pendidikan = findVal(['pendidikan', 'pendidikan terakhir', 'pendidikan_terakhir']);

                    const pNorm = rawPangkat ? normalize(String(rawPangkat)) : '';
                    let pangkat = pangkatList.find(p => normalize(p.pangkat_golongan) === pNorm);

                    if (!pangkat && pNorm) {
                        // Try matching only the grade part (e.g., "III/a")
                        pangkat = pangkatList.find(p => {
                            const parts = p.pangkat_golongan.split(' - ');
                            const gradePart = parts.length > 1 ? parts[1] : parts[0];
                            return normalize(gradePart) === pNorm;
                        });
                    }
                    if (!pangkat && pNorm) {
                        pangkat = pangkatList.find(p => normalize(p.pangkat_golongan).includes(pNorm));
                    }

                    const jNorm = rawJabatan ? normalize(String(rawJabatan)) : '';
                    let jabatan = jabatanList.find(j => normalize(j.jabatan) === jNorm);
                    if (!jabatan && jNorm) {
                        jabatan = jabatanList.find(j => normalize(j.jabatan).includes(jNorm) || jNorm.includes(normalize(j.jabatan)));
                    }

                    return {
                        nama_lengkap: nama,
                        nip: nip ? String(nip) : null,
                        pangkat_golongan_id: pangkat ? pangkat.id : null,
                        jabatan_id: jabatan ? jabatan.id : null,
                        pendidikan_terakhir: pendidikan,
                        _rawPangkat: rawPangkat,
                        _rawJabatan: rawJabatan
                    };
                });

                setImportData(mappedData);
            } catch (err) {
                alert('Gagal membaca file Excel');
                console.error(err);
            } finally {
                setImportLoading(false);
            }
        };
        reader.readAsBinaryString(file);
    };

    const submitImport = async () => {
        if (importData.length === 0) return;
        setImportLoading(true);
        try {
            const res = await api.profilPegawai.bulkCreate(importData);
            if (res.success) {
                setIsImportModalOpen(false);
                setImportData([]);
                fetchData();
                alert(`Berhasil mengimpor ${importData.length} data pegawai`);
            } else {
                alert(res.message || 'Gagal mengimpor data');
            }
        } catch (err) {
            alert('Terjadi kesalahan saat mengimpor data');
        } finally {
            setImportLoading(false);
        }
    };

    return (
        <div className="card-modern p-6">
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col border border-slate-200 animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <div>
                                <h3 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                                    {isEditing ? <Edit2 size={24} className="text-ppm-slate" /> : <Plus size={24} className="text-ppm-slate" />}
                                    {isEditing ? 'Ubah Data Pegawai' : 'Tambah Pegawai Baru'}
                                </h3>
                                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-0.5">Manajemen Kepegawaian</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white rounded-xl transition-all border border-transparent hover:border-slate-200 text-slate-400 hover:text-slate-600">
                                <X size={24} />
                            </button>
                        </div>

                        {/* Modal Tabs */}
                        <div className="flex overflow-x-auto custom-scrollbar border-b border-slate-100 bg-white">
                            <button
                                onClick={() => setActiveTab('umum')}
                                className={`px-6 py-3 text-xs font-black uppercase tracking-widest transition-all border-b-2 flex items-center gap-2 whitespace-nowrap shrink-0 ${activeTab === 'umum' ? 'border-ppm-slate text-ppm-slate bg-slate-50' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                            >
                                <Users size={14} /> Umum
                            </button>
                            <button
                                onClick={() => setActiveTab('detail')}
                                className={`px-6 py-3 text-xs font-black uppercase tracking-widest transition-all border-b-2 flex items-center gap-2 whitespace-nowrap shrink-0 ${activeTab === 'detail' ? 'border-ppm-slate text-ppm-slate bg-slate-50' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                            >
                                <FileText size={14} /> Profil Detail
                            </button>
                            <button
                                onClick={() => setActiveTab('pekerjaan')}
                                className={`px-6 py-3 text-xs font-black uppercase tracking-widest transition-all border-b-2 flex items-center gap-2 whitespace-nowrap shrink-0 ${activeTab === 'pekerjaan' ? 'border-ppm-slate text-ppm-slate bg-slate-50' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                            >
                                <Briefcase size={14} /> Data Pekerjaan
                            </button>
                            <button
                                onClick={() => setActiveTab('kepegawaian')}
                                className={`px-6 py-3 text-xs font-black uppercase tracking-widest transition-all border-b-2 flex items-center gap-2 whitespace-nowrap shrink-0 ${activeTab === 'kepegawaian' ? 'border-ppm-slate text-ppm-slate bg-slate-50' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                            >
                                <GraduationCap size={14} /> Riwayat CPNS/PNS
                            </button>
                            {(isSuperAdmin || [2, 5, 7, 8].includes(currentUser?.tipe_user_id)) && (
                                <button
                                    onClick={() => setActiveTab('keamanan')}
                                    className={`px-6 py-3 text-xs font-black uppercase tracking-widest transition-all border-b-2 flex items-center gap-2 whitespace-nowrap shrink-0 ${activeTab === 'keamanan' ? 'border-ppm-slate text-ppm-slate bg-slate-50' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                                >
                                    <Users size={14} /> Akun & Keamanan
                                </button>
                            )}
                        </div>

                        <form onSubmit={handleSave} className="flex-1 overflow-y-auto">
                            <div className="p-8 space-y-6">
                                {activeTab === 'umum' && (
                                    <div className="space-y-6 animate-in slide-in-from-left-2 duration-300">
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                            <div>
                                                <label className="label-modern italic">Gelar Depan</label>
                                                <input type="text" className="input-modern w-full" placeholder="Dr. / H." value={formData.gelar_depan}
                                                    onChange={e => setFormData({ ...formData, gelar_depan: e.target.value })}
                                                    disabled={!hasEditAccess} />
                                            </div>
                                            <div>
                                                <label className="label-modern italic">Nama <span className="text-red-500">*</span></label>
                                                <input type="text" className="input-modern w-full" placeholder="Nama Tanpa Gelar" value={formData.nama}
                                                    onChange={e => setFormData({ ...formData, nama: e.target.value })}
                                                    required disabled={!hasEditAccess} />
                                            </div>
                                            <div>
                                                <label className="label-modern italic">Gelar Belakang</label>
                                                <input type="text" className="input-modern w-full" placeholder="S.Kom / M.T." value={formData.gelar_belakang}
                                                    onChange={e => setFormData({ ...formData, gelar_belakang: e.target.value })}
                                                    disabled={!hasEditAccess} />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <label className="label-modern italic">Penyatuan Gelar & Nama (Otomatis)</label>
                                                <input type="text" className="input-modern w-full bg-slate-50 font-bold text-slate-600" value={formData.nama_lengkap}
                                                    readOnly disabled />
                                            </div>
                                            <div>
                                                <label className="label-modern italic">NIP</label>
                                                <input type="text" className="input-modern w-full" placeholder="NIP Baru (18 digit)" value={formData.nip} onChange={e => setFormData({ ...formData, nip: e.target.value })} disabled={!hasEditAccess} />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <label className="label-modern italic">Email</label>
                                                <input type="email" className="input-modern w-full" placeholder="nama@instansi.go.id" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} disabled={!hasEditAccess} />
                                            </div>
                                            <div>
                                                <label className="label-modern italic">No HP / WhatsApp</label>
                                                <input type="text" className="input-modern w-full" placeholder="08..." value={formData.no_hp} onChange={e => setFormData({ ...formData, no_hp: e.target.value })} disabled={!hasEditAccess} />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'detail' && (
                                    <div className="space-y-6 animate-in slide-in-from-left-2 duration-300">
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                            <div>
                                                <label className="label-modern italic">Tempat Lahir</label>
                                                <input type="text" className="input-modern w-full" value={formData.tempat_lahir} onChange={e => setFormData({ ...formData, tempat_lahir: e.target.value })} disabled={!hasEditAccess} />
                                            </div>
                                            <div>
                                                <label className="label-modern italic">Tanggal Lahir</label>
                                                <input type="date" className="input-modern w-full" value={formData.tanggal_lahir} onChange={e => setFormData({ ...formData, tanggal_lahir: e.target.value })} disabled={!hasEditAccess} />
                                            </div>
                                            <div>
                                                <label className="label-modern italic">Jenis Kelamin</label>
                                                <select className="input-modern w-full bg-white h-[42px] font-bold" value={formData.jenis_kelamin} onChange={e => setFormData({ ...formData, jenis_kelamin: e.target.value })} disabled={!hasEditAccess}>
                                                    <option value="">Pilih...</option>
                                                    <option value="Laki-laki">Laki-laki</option>
                                                    <option value="Perempuan">Perempuan</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                            <div>
                                                <label className="label-modern italic">Agama</label>
                                                <input type="text" className="input-modern w-full" placeholder="Islam, Kristen, dll" value={formData.agama} onChange={e => setFormData({ ...formData, agama: e.target.value })} disabled={!hasEditAccess} />
                                            </div>
                                            <div>
                                                <label className="label-modern italic">Status Perkawinan</label>
                                                <select className="input-modern w-full bg-white h-[42px] font-bold" value={formData.status_perkawinan} onChange={e => setFormData({ ...formData, status_perkawinan: e.target.value })} disabled={!hasEditAccess}>
                                                    <option value="">Pilih...</option>
                                                    <option value="Belum Kawin">Belum Kawin</option>
                                                    <option value="Kawin">Kawin</option>
                                                    <option value="Cerai Hidup">Cerai Hidup</option>
                                                    <option value="Cerai Mati">Cerai Mati</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="label-modern italic">Gol. Darah</label>
                                                <select className="input-modern w-full bg-white h-[42px] font-bold" value={formData.golongan_darah} onChange={e => setFormData({ ...formData, golongan_darah: e.target.value })} disabled={!hasEditAccess}>
                                                    <option value="">-</option>
                                                    <option value="A">A</option>
                                                    <option value="B">B</option>
                                                    <option value="AB">AB</option>
                                                    <option value="O">O</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <label className="label-modern italic">NPWP</label>
                                                <input type="text" className="input-modern w-full" value={formData.npwp} onChange={e => setFormData({ ...formData, npwp: e.target.value })} disabled={!hasEditAccess} />
                                            </div>
                                            <div>
                                                <label className="label-modern italic">Pendidikan Terakhir</label>
                                                <input type="text" className="input-modern w-full" placeholder="S1 - Teknik Informatika" value={formData.pendidikan_terakhir} onChange={e => setFormData({ ...formData, pendidikan_terakhir: e.target.value })} disabled={!hasEditAccess} />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <label className="label-modern italic">No BPJS Kesehatan</label>
                                                <input type="text" className="input-modern w-full" value={formData.no_bpjs_kesehatan} onChange={e => setFormData({ ...formData, no_bpjs_kesehatan: e.target.value })} disabled={!hasEditAccess} />
                                            </div>
                                            <div>
                                                <label className="label-modern italic">No BPJS Ketenagakerjaan</label>
                                                <input type="text" className="input-modern w-full" value={formData.no_bpjs_ketenagakerjaan} onChange={e => setFormData({ ...formData, no_bpjs_ketenagakerjaan: e.target.value })} disabled={!hasEditAccess} />
                                            </div>
                                        </div>

                                        {/* Row Separator */}
                                        <div className="relative py-4">
                                            <div className="absolute inset-0 flex items-center" aria-hidden="true">
                                                <div className="w-full border-t border-slate-100"></div>
                                            </div>
                                            <div className="relative flex justify-start">
                                                <span className="pr-3 bg-white text-[10px] font-black uppercase tracking-widest text-slate-400">Informasi Alamat</span>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="z-40 relative">
                                                <label className="label-modern italic">Provinsi</label>
                                                <SearchableSelect
                                                    value={formData.provinsi_id}
                                                    onChange={(val: any) => setFormData({ ...formData, provinsi_id: val, kota_kabupaten_id: '', kecamatan_id: '', kelurahan_id: '' })}
                                                    options={provinsi}
                                                    label="Provinsi"
                                                    keyField="id"
                                                    displayField="nama"
                                                    disabled={!hasEditAccess}
                                                />
                                            </div>
                                            <div className="z-40 relative">
                                                <label className="label-modern italic">Kota/Kabupaten</label>
                                                <SearchableSelect
                                                    value={formData.kota_kabupaten_id}
                                                    onChange={(val: any) => setFormData({ ...formData, kota_kabupaten_id: val, kecamatan_id: '', kelurahan_id: '' })}
                                                    options={kotaKab}
                                                    label="Kota/Kab"
                                                    keyField="id"
                                                    displayField="nama"
                                                    disabled={!hasEditAccess}
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="z-30 relative">
                                                <label className="label-modern italic">Kecamatan</label>
                                                <SearchableSelect
                                                    value={formData.kecamatan_id}
                                                    onChange={(val: any) => setFormData({ ...formData, kecamatan_id: val, kelurahan_id: '' })}
                                                    options={kecamatan}
                                                    label="Kecamatan"
                                                    keyField="id"
                                                    displayField="nama"
                                                    disabled={!hasEditAccess}
                                                />
                                            </div>
                                            <div className="z-30 relative">
                                                <label className="label-modern italic">Kelurahan/Desa</label>
                                                <SearchableSelect
                                                    value={formData.kelurahan_id}
                                                    onChange={(val: any) => setFormData({ ...formData, kelurahan_id: val })}
                                                    options={kelurahan}
                                                    label="Kelurahan"
                                                    keyField="id"
                                                    displayField="nama"
                                                    disabled={!hasEditAccess}
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="label-modern italic">Alamat Lengkap</label>
                                            <textarea className="input-modern w-full min-h-[100px] py-3" placeholder="Nama Jalan, No Rumah, RT/RW..." value={formData.alamat_lengkap} onChange={e => setFormData({ ...formData, alamat_lengkap: e.target.value })} disabled={!hasEditAccess} />
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'pekerjaan' && (
                                    <div className="space-y-6 animate-in slide-in-from-left-2 duration-300">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className={`z-40 relative ${(!isSuperAdmin || !hasEditAccess) ? 'opacity-60 grayscale pointer-events-none' : ''}`}>
                                                <label className="label-modern italic">Instansi {(!isSuperAdmin || !hasEditAccess) && <span className="text-[10px] italic normal-case font-normal">(locked)</span>}</label>
                                                <SearchableSelect
                                                    value={formData.instansi_id}
                                                    onChange={(val: any) => setFormData({ ...formData, instansi_id: val })}
                                                    options={instansiList}
                                                    label="Instansi"
                                                    keyField="id"
                                                    displayField="instansi"
                                                    disabled={!hasEditAccess}
                                                />
                                            </div>
                                            <div className="z-40 relative">
                                                <label className="label-modern italic">Tipe Pegawai / Hak Akses</label>
                                                <SearchableSelect
                                                    value={formData.tipe_user_id}
                                                    onChange={(val: any) => setFormData({ ...formData, tipe_user_id: val })}
                                                    options={tipeUserList}
                                                    label="Tipe User"
                                                    keyField="id"
                                                    displayField="tipe_user"
                                                    disabled={!hasEditAccess}
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="z-30 relative">
                                                <label className="label-modern italic">Jabatan</label>
                                                <SearchableSelect
                                                    value={formData.jabatan_id}
                                                    onChange={(val: any) => setFormData({ ...formData, jabatan_id: val })}
                                                    options={jabatanList}
                                                    label="Jabatan"
                                                    keyField="id"
                                                    displayField="jabatan"
                                                    disabled={!hasEditAccess}
                                                />
                                            </div>
                                            <div className="z-30 relative text-xs">
                                                <label className="label-modern italic">Bidang</label>
                                                <SearchableSelect
                                                    value={formData.bidang_id}
                                                    onChange={(val: any) => setFormData({ ...formData, bidang_id: val, sub_bidang_ids: [] })}
                                                    options={isSuperAdmin && formData.instansi_id ? bidangList.filter(b => b.instansi_id === formData.instansi_id) : bidangList}
                                                    label="Bidang"
                                                    keyField="id"
                                                    displayField="nama_bidang"
                                                    disabled={!hasEditAccess}
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="z-30 relative text-xs">
                                                <label className="label-modern italic">Tim/Seksi/Sub Bidang/Sub Bagian</label>
                                                <SearchableSelect
                                                    value={formData.sub_bidang_ids}
                                                    onChange={(val: any) => setFormData({ ...formData, sub_bidang_ids: val })}
                                                    options={subBidangList.filter(sb => sb.bidang_instansi_id === formData.bidang_id)}
                                                    label="Tim/Seksi/Sub Bidang/Sub Bagian"
                                                    keyField="id"
                                                    displayField="nama_sub_bidang"
                                                    disabled={!formData.bidang_id || !hasEditAccess}
                                                    multiple={true}
                                                    alwaysShowAll={true}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'kepegawaian' && (
                                    <div className="space-y-6 animate-in slide-in-from-left-2 duration-300">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="z-40 relative">
                                                <label className="label-modern italic">Jenis Pegawai</label>
                                                <SearchableSelect
                                                    value={formData.jenis_pegawai_id}
                                                    onChange={(val: any) => setFormData({ ...formData, jenis_pegawai_id: val })}
                                                    options={jenisPegawaiList}
                                                    label="Jenis Pegawai"
                                                    keyField="id"
                                                    displayField="nama"
                                                    disabled={!hasEditAccess}
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="z-30 relative">
                                                <label className="label-modern italic">Pangkat / Golongan</label>
                                                <SearchableSelect
                                                    value={formData.pangkat_golongan_id}
                                                    onChange={(val: any) => setFormData({ ...formData, pangkat_golongan_id: val })}
                                                    options={pangkatList}
                                                    label="Pangkat/Gol"
                                                    keyField="id"
                                                    displayField="pangkat_golongan"
                                                    disabled={!hasEditAccess}
                                                />
                                            </div>
                                            <div>
                                                <label className="label-modern italic">Pendidikan Terakhir</label>
                                                <input type="text" className="input-modern w-full" placeholder="Misal: S1 - Teknik Sipil" value={formData.pendidikan_terakhir} onChange={e => setFormData({ ...formData, pendidikan_terakhir: e.target.value })} disabled={!hasEditAccess} />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <label className="label-modern italic">TMT CPNS</label>
                                                <input type="date" className="input-modern w-full" value={formData.tmt_cpns} onChange={e => setFormData({ ...formData, tmt_cpns: e.target.value })} disabled={!hasEditAccess} />
                                            </div>
                                            <div>
                                                <label className="label-modern italic">TMT PNS</label>
                                                <input type="date" className="input-modern w-full" value={formData.tmt_pns} onChange={e => setFormData({ ...formData, tmt_pns: e.target.value })} disabled={!hasEditAccess} />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <label className="label-modern italic">Masa Kerja (Tahun)</label>
                                                <input type="number" className="input-modern w-full" value={formData.masa_kerja_tahun} onChange={e => setFormData({ ...formData, masa_kerja_tahun: e.target.value })} disabled={!hasEditAccess} />
                                            </div>
                                            <div>
                                                <label className="label-modern italic">Masa Kerja (Bulan)</label>
                                                <input type="number" className="input-modern w-full" value={formData.masa_kerja_bulan} onChange={e => setFormData({ ...formData, masa_kerja_bulan: e.target.value })} disabled={!hasEditAccess} />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'keamanan' && (
                                    <div className="space-y-6 animate-in slide-in-from-left-2 duration-300">
                                        <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 flex items-start gap-3 mb-6">
                                            <AlertCircle className="text-blue-500 shrink-0" size={20} />
                                            <div>
                                                <p className="text-xs font-bold text-blue-700 uppercase tracking-widest mb-1">Pengaturan Akses Login</p>
                                                <p className="text-[11px] text-blue-600 font-medium">Username digunakan untuk login ke aplikasi. Jika password dikosongkan saat update, password lama tidak akan berubah.</p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <label className="label-modern italic">Username <span className="text-red-500">*</span></label>
                                                <input
                                                    type="text"
                                                    className="input-modern w-full"
                                                    placeholder="username_pegawai"
                                                    value={formData.username}
                                                    onChange={e => setFormData({ ...formData, username: e.target.value })}
                                                    disabled={!hasEditAccess}
                                                    required={activeTab === 'keamanan'}
                                                />
                                            </div>
                                            <div>
                                                <label className="label-modern italic">Password {isEditing ? '(Opsional)' : '<span className="text-red-500">*</span>'}</label>
                                                <input
                                                    type="password"
                                                    className="input-modern w-full"
                                                    placeholder={isEditing ? 'Isi untuk ubah password' : 'Password Minimal 6 Karakter'}
                                                    value={formData.password}
                                                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                                                    disabled={!hasEditAccess}
                                                    required={!isEditing && activeTab === 'keamanan'}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="px-8 py-4 bg-slate-50/50 border-t border-slate-100 flex justify-end gap-3 sticky bottom-0">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest text-slate-500 bg-white border border-slate-200 hover:bg-slate-50 hover:text-slate-700 transition-all active:scale-95">{hasEditAccess ? 'Batal' : 'Tutup'}</button>
                                {hasEditAccess && (
                                    <button type="submit" className="px-8 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest text-white bg-ppm-slate hover:bg-ppm-slate-light transition-all shadow-lg shadow-ppm-slate/20 hover:shadow-xl hover:shadow-ppm-slate/30 flex items-center gap-2 active:scale-95">
                                        <Check size={18} strokeWidth={3} /> Simpan Pegawai
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Import Excel Modal */}
            {isImportModalOpen && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col border border-slate-200 animate-in zoom-in-95 duration-200 overflow-hidden">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <div>
                                <h3 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                                    <Upload size={24} className="text-ppm-slate" />
                                    Impor Data Pegawai dari Excel
                                </h3>
                                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-0.5 flex items-center gap-2">
                                    <span>Gunakan format yang disediakan untuk meminimalkan kesalahan</span>
                                    {hasEditAccess && (
                                        <button
                                            onClick={downloadTemplate}
                                            className="text-ppm-slate hover:underline font-black flex items-center gap-1 ml-2"
                                        >
                                            <FileText size={12} /> Unduh Format
                                        </button>
                                    )}
                                </p>
                            </div>
                            <button onClick={() => { setIsImportModalOpen(false); setImportData([]); }} className="p-2 hover:bg-white rounded-xl transition-all border border-transparent hover:border-slate-200 text-slate-400 hover:text-slate-600">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8">
                            {importData.length === 0 ? (
                                <div className="border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center hover:border-ppm-slate/50 transition-colors group relative cursor-pointer">
                                    <input
                                        type="file"
                                        accept=".xlsx, .xls"
                                        onChange={handleImportExcel}
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                    />
                                    <div className="flex flex-col items-center gap-4">
                                        <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-ppm-slate/5 group-hover:text-ppm-slate transition-all">
                                            <Upload size={32} />
                                        </div>
                                        <div>
                                            <p className="text-lg font-black text-slate-700">Klik atau seret file Excel ke sini</p>
                                            <p className="text-sm text-slate-400 font-bold mt-1 uppercase tracking-wider">Hanya file .xlsx atau .xls</p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    <div className="flex justify-between items-center bg-blue-50/50 p-4 rounded-2xl border border-blue-100">
                                        <div className="flex items-center gap-3">
                                            <AlertCircle className="text-blue-500" size={20} />
                                            <p className="text-sm font-bold text-blue-700">Pratinjau Data Impor (Total: {importData.length} Baris)</p>
                                        </div>
                                        <button onClick={() => setImportData([])} className="text-xs font-black uppercase text-blue-600 hover:underline">Ganti File</button>
                                    </div>

                                    <div className="overflow-x-auto rounded-xl border border-slate-100">
                                        <table className="w-full text-xs">
                                            <thead>
                                                <tr className="bg-slate-50 text-slate-500 font-black uppercase tracking-widest">
                                                    <th className="p-3 text-left w-10">#</th>
                                                    <th className="p-3 text-left">Nama Lengkap</th>
                                                    <th className="p-3 text-left">NIP</th>
                                                    <th className="p-3 text-left">Pangkat/Gol</th>
                                                    <th className="p-3 text-left">Jabatan</th>
                                                    <th className="p-3 text-left">Pendidikan</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50">
                                                {importData.map((row, idx) => (
                                                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                                        <td className="p-3 text-slate-400 font-mono">{idx + 1}</td>
                                                        <td className="p-3 font-bold text-slate-700">{row.nama_lengkap || <span className="text-red-400 italic font-normal">TIDAK ADA NAMA</span>}</td>
                                                        <td className="p-3 font-mono text-slate-500">{row.nip || '-'}</td>
                                                        <td className="p-3">
                                                            {row.pangkat_golongan_id ? (
                                                                <span className="bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded text-[10px] font-bold">{pangkatList.find(p => p.id === row.pangkat_golongan_id)?.pangkat_golongan}</span>
                                                            ) : (
                                                                <span className="bg-amber-50 text-amber-600 px-2 py-0.5 rounded text-[10px] font-bold italic" title={row._rawPangkat}>Gagal Map: {row._rawPangkat || '-'}</span>
                                                            )}
                                                        </td>
                                                        <td className="p-3">
                                                            {row.jabatan_id ? (
                                                                <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded text-[10px] font-bold">{jabatanList.find(j => j.id === row.jabatan_id)?.jabatan}</span>
                                                            ) : (
                                                                <span className="bg-amber-50 text-amber-600 px-2 py-0.5 rounded text-[10px] font-bold italic" title={row._rawJabatan}>Gagal Map: {row._rawJabatan || '-'}</span>
                                                            )}
                                                        </td>
                                                        <td className="p-3 text-slate-500">{row.pendidikan_terakhir || '-'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="px-8 py-4 bg-slate-50/50 border-t border-slate-100 flex justify-end gap-3 sticky bottom-0">
                            <button type="button" onClick={() => { setIsImportModalOpen(false); setImportData([]); }} className="px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest text-slate-500 bg-white border border-slate-200 hover:bg-slate-50 hover:text-slate-700 transition-all">Batal</button>
                            {importData.length > 0 && (
                                <button
                                    onClick={submitImport}
                                    disabled={importLoading}
                                    className="px-8 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest text-white bg-ppm-slate hover:bg-ppm-slate-light transition-all shadow-lg shadow-ppm-slate/20 flex items-center gap-2 disabled:opacity-50"
                                >
                                    {importLoading ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} strokeWidth={3} />}
                                    Simpan {importData.length} Pegawai
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-[22px] font-extrabold text-slate-800 tracking-tight">Manajemen Pegawai</h2>
                    <p className="text-slate-500 text-sm mt-1 uppercase tracking-widest font-bold opacity-70 italic">Pengelolaan Data Kepegawaian</p>
                </div>
                <div className="flex gap-3">
                    {hasEditAccess && <button onClick={downloadTemplate} className="px-5 py-2.5 text-[13px] font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 hover:text-slate-900 transition-all shadow-sm active:scale-95 rounded-xl flex items-center gap-2"><FileText size={14} className="text-ppm-slate" /> Unduh Format</button>}
                    {hasEditAccess && (
                        <>
                            <button onClick={() => setIsImportModalOpen(true)} className="px-5 py-2.5 text-[13px] font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 hover:text-slate-900 transition-all shadow-sm active:scale-95 rounded-xl flex items-center gap-2">
                                <Upload size={14} className="text-ppm-slate" /> Impor Excel
                            </button>
                            <button
                                onClick={handleBulkCreateAccounts}
                                disabled={bulkLoading}
                                className="px-5 py-2.5 text-[13px] font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 hover:text-slate-900 transition-all shadow-sm active:scale-95 rounded-xl flex items-center gap-2 disabled:opacity-50"
                            >
                                {bulkLoading ? <Loader2 size={14} className="animate-spin" /> : <Users size={14} className="text-ppm-blue" />}
                                Buat Akun Otomatis
                            </button>
                            <button onClick={openAddModal} className="btn-primary">
                                <Plus size={14} /> Tambah Pegawai
                            </button>
                        </>
                    )}
                </div>
            </div>

            <div className="mb-6 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tampilkan</span>
                    <select
                        value={pageSize}
                        onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                        className="input-modern py-1 px-3 text-xs w-20 h-9 font-bold"
                    >
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                        <option value={0}>Semua</option>
                    </select>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                    {isSuperAdmin && (
                        <div className="relative w-full sm:w-64 z-50">
                            <SearchableSelect
                                value={filterInstansi}
                                onChange={(val: any) => setFilterInstansi(val)}
                                options={instansiList}
                                label="Semua Instansi"
                                keyField="id"
                                displayField="instansi"
                                showReset={true}
                                customClassName="h-[42px]"
                            />
                        </div>
                    )}
                    <div className="relative w-full sm:w-80">
                        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="search"
                            placeholder="Cari NIP, Nama, Instansi..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="input-modern w-full pl-10 pr-4 h-[42px]"
                            autoComplete="off"
                        />
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                    <Loader2 className="animate-spin text-ppm-slate" size={40} />
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest animate-pulse">Memuat Data...</p>
                </div>
            ) : error ? (
                <div className="text-red-500 text-center py-20 bg-red-50/50 rounded-2xl border border-red-100 font-bold uppercase tracking-widest text-xs">{error}</div>
            ) : (
                <>
                    <div className="overflow-x-auto rounded-xl border border-slate-100 shadow-sm bg-white">
                        <table className="w-full text-sm border-collapse">
                            <thead>
                                <tr>
                                    <th className="table-header w-12 text-center">#</th>
                                    <th className="table-header">Informasi Pegawai</th>
                                    <th className="table-header">Penempatan</th>
                                    <th className="table-header">Kelengkapan Data</th>
                                    <th className="table-header text-center">Akun</th>
                                    <th className="table-header w-32 text-center">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {displayed.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="p-20 text-center text-slate-300 italic font-bold">
                                            {search ? 'Tidak ada hasil pencarian' : 'Belum ada data pegawai.'}
                                        </td>
                                    </tr>
                                ) : (
                                    displayed.map((item, index) => (
                                        <tr key={item.id} className="hover:bg-slate-50/80 transition-colors border-b border-slate-50 group/row">
                                            <td className="p-4 font-mono text-xs text-slate-400 text-center font-medium">
                                                {(currentPage - 1) * (pageSize || filtered.length) + index + 1}
                                            </td>
                                            <td className="p-4">
                                                <div className="flex flex-col gap-1">
                                                    <span className="font-bold text-slate-800 text-sm mb-0.5">{item.nama_lengkap}</span>
                                                    <span className="font-bold text-[10px] text-slate-400 flex items-center gap-1.5 uppercase tracking-wider">
                                                        {item.nip || 'TIDAK ADA NIP'}
                                                        {item.pangkat_golongan_nama && (
                                                            <>
                                                                <span className="text-slate-200">|</span>
                                                                <span className="text-ppm-slate font-bold">{item.pangkat_golongan_nama}</span>
                                                            </>
                                                        )}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{item.instansi_nama}</span>
                                                    <span className="text-[11px] font-bold text-ppm-slate mb-0.5">{item.sub_bidang_nama || '-'}</span>
                                                    <span className="text-xs text-slate-400">{item.jabatan_nama || '-'}</span>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                {(() => {
                                                    const status = calculateCompletion(item);
                                                    return (
                                                        <div className="flex flex-col gap-2 max-w-[200px]">
                                                            <div className="flex items-center justify-between gap-3">
                                                                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                                                    <div
                                                                        className={`h-full transition-all duration-700 ${status.percentage === 100 ? 'bg-emerald-500' : 'bg-amber-400'}`}
                                                                        style={{ width: `${status.percentage}%` }}
                                                                    />
                                                                </div>
                                                                <span className={`text-[10px] font-black ${status.percentage === 100 ? 'text-emerald-600' : 'text-slate-500'} uppercase tracking-widest`}>
                                                                    {status.percentage}%
                                                                </span>
                                                            </div>
                                                            {status.missing.length > 0 ? (
                                                                <div className="flex flex-wrap gap-1 relative">
                                                                    <p className="text-[9px] font-bold text-rose-400 uppercase tracking-widest w-full mb-0.5">Belum lengkap:</p>
                                                                    {status.missing.slice(0, 5).map(m => (
                                                                        <span key={m} className="px-1.5 py-0.5 bg-rose-50 text-rose-500 text-[9px] rounded font-bold">{m}</span>
                                                                    ))}
                                                                    {status.missing.length > 5 && (
                                                                        <div className="relative">
                                                                            <button
                                                                                ref={el => buttonRefs.current[item.id] = el}
                                                                                onClick={(e) => {
                                                                                    const rect = e.currentTarget.getBoundingClientRect();
                                                                                    setPopoverCoords({
                                                                                        top: rect.top + window.scrollY,
                                                                                        left: rect.left + window.scrollX
                                                                                    });
                                                                                    setExpandedMissingId(expandedMissingId === item.id ? null : item.id);
                                                                                }}
                                                                                className="px-1.5 py-0.5 bg-slate-100 text-slate-600 hover:bg-slate-200 text-[9px] rounded font-black transition-colors"
                                                                            >
                                                                                +{status.missing.length - 5} lainnya
                                                                            </button>

                                                                            {expandedMissingId === item.id && createPortal(
                                                                                <>
                                                                                    <div className="fixed inset-0 z-[9998]" onClick={() => setExpandedMissingId(null)} />
                                                                                    <div
                                                                                        className="absolute z-[9999] p-4 bg-white border border-slate-100 rounded-2xl shadow-2xl w-72 ring-4 ring-black/5 animate-in fade-in slide-in-from-bottom-2 duration-200"
                                                                                        style={{
                                                                                            top: `${popoverCoords.top - 10}px`,
                                                                                            left: `${popoverCoords.left}px`,
                                                                                            transform: 'translateY(-100%)'
                                                                                        }}
                                                                                    >
                                                                                        <div className="flex justify-between items-center mb-3">
                                                                                            <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest flex items-center gap-1.5">
                                                                                                <AlertCircle size={14} strokeWidth={3} /> Kelengkapan Data ({status.filledCount}/{status.totalCount})
                                                                                            </p>
                                                                                            <button onClick={() => setExpandedMissingId(null)} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={14} /></button>
                                                                                        </div>
                                                                                        <div className="flex flex-wrap gap-1.5">
                                                                                            {status.missing.map(m => (
                                                                                                <span key={m} className="px-2 py-1 bg-rose-50 text-rose-600 text-[9px] rounded-lg font-bold border border-rose-100/50">{m}</span>
                                                                                            ))}
                                                                                        </div>
                                                                                        <div className="mt-4 pt-3 border-t border-slate-50 italic text-[9px] text-slate-400 font-medium">
                                                                                            Silakan lengkapi data melalui menu Edit Pegawai.
                                                                                        </div>
                                                                                    </div>
                                                                                </>,
                                                                                document.body
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-1">
                                                                    <Check size={12} strokeWidth={3} /> Lengkap
                                                                </span>
                                                            )}
                                                        </div>
                                                    );
                                                })()}
                                            </td>
                                            <td className="p-4 text-center">
                                                {item.username ? (
                                                    <span className="bg-emerald-50 text-emerald-600 px-2.5 py-1 rounded-md text-[9px] font-bold uppercase tracking-wide inline-flex items-center gap-1.5">
                                                        <Check size={12} strokeWidth={3} /> @{item.username}
                                                    </span>
                                                ) : (
                                                    <span className="bg-slate-100 text-slate-400 px-2.5 py-1 rounded-md text-[9px] font-bold uppercase tracking-wide inline-flex items-center gap-1.5">
                                                        <X size={12} strokeWidth={3} /> Belum Ada
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-4">
                                                <div className="flex justify-center items-center gap-2">
                                                    {hasEditAccess ? (
                                                        <>
                                                            <button onClick={() => openEditModal(item)} className="text-slate-400 hover:text-blue-600 transition-colors p-2 hover:bg-blue-50/80 rounded-xl" title="Edit">
                                                                <Edit2 size={16} />
                                                            </button>
                                                            <button onClick={() => handleDelete(item.id)} className="text-slate-400 hover:text-red-500 transition-colors p-2 hover:bg-red-50/80 rounded-xl" title="Hapus">
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <button onClick={() => openEditModal(item)} className="text-slate-400 hover:text-ppm-slate transition-colors p-2 hover:bg-slate-50/80 rounded-xl" title="Lihat Detail">
                                                            <Eye size={16} />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {!loading && totalPages > 1 && (
                        <div className="flex flex-col sm:flex-row justify-between items-center mt-6 gap-4">
                            <div className="text-xs text-slate-500 font-medium">
                                <span>Tampilkan <b>{displayed.length}</b> dari <b>{filtered.length}</b> data</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                    disabled={currentPage === 1}
                                    className="p-2 rounded-lg border border-slate-200 bg-white text-slate-400 disabled:opacity-30 hover:bg-slate-50 transition-all font-bold text-[10px] uppercase tracking-widest"
                                >
                                    Prev
                                </button>
                                <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-100">
                                    {[...Array(totalPages)].map((_, i) => {
                                        const page = i + 1;
                                        if (totalPages > 7) {
                                            if (page !== 1 && page !== totalPages && Math.abs(page - currentPage) > 1) {
                                                if (Math.abs(page - currentPage) === 2) return <span key={page} className="px-1 text-slate-300 font-bold">...</span>;
                                                return null;
                                            }
                                        }
                                        return (
                                            <button
                                                key={page}
                                                onClick={() => setCurrentPage(page)}
                                                className={`w-8 h-8 rounded-lg text-[11px] font-bold transition-all ${currentPage === page ? 'bg-white text-ppm-slate shadow-sm border border-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
                                            >
                                                {page}
                                            </button>
                                        );
                                    })}
                                </div>
                                <button
                                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                    disabled={currentPage === totalPages}
                                    className="p-2 rounded-lg border border-slate-200 bg-white text-slate-400 disabled:opacity-30 hover:bg-slate-50 transition-all font-bold text-[10px] uppercase tracking-widest"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default ManajemenPegawai;
