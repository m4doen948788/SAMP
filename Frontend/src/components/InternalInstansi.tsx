import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { Users, Loader2, ChevronDown, ChevronRight, User, MapPin, Briefcase, GraduationCap, FileText, X, Eye, AlertCircle, HardHat, Building2, Globe, Edit2 } from 'lucide-react';
import { createPortal } from 'react-dom';
import { SearchableSelect } from './common/SearchableSelect';
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';
import { Download } from 'lucide-react';

export default function InternalInstansi() {
    const { user, isAuthenticated } = useAuth();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [instansiList, setInstansiList] = useState<any[]>([]);
    const [selectedInstansi, setSelectedInstansi] = useState<number | null>(user?.instansi_id || null);

    // Detail modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [loadingDetail, setLoadingDetail] = useState(false);
    const [selectedPegawai, setSelectedPegawai] = useState<any>(null);
    const [activeTab, setActiveTab] = useState('profil'); // profil, pekerjaan
    const [viewMode, setViewMode] = useState(() => {
        const params = new URLSearchParams(window.location.search);
        return params.get('page') === 'bagan-organisasi' ? 'chart' : 'list';
    });
    const isFullscreen = new URLSearchParams(window.location.search).get('page') === 'bagan-organisasi';

    // Update selectedInstansi from URL if provided
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const instId = params.get('instansi_id');
        if (instId) {
            setSelectedInstansi(Number(instId));
        }
    }, []);

    // Profil Instansi Modal
    const [isEditProfilModalOpen, setIsEditProfilModalOpen] = useState(false);
    const [editProfilData, setEditProfilData] = useState({ tupoksi: '', alamat: '', alamat_web: '' });
    const [isSavingProfil, setIsSavingProfil] = useState(false);

    const handleSaveProfilInstansi = async () => {
        if (!selectedInstansi) return;
        setIsSavingProfil(true);
        try {
            const res = await api.internalInstansi.updateProfil(selectedInstansi, editProfilData);
            if (res.success) {
                // Refresh data
                setData(prev => ({
                    ...prev,
                    instansiDetail: {
                        ...prev.instansiDetail,
                        ...editProfilData
                    }
                }));
                setIsEditProfilModalOpen(false);
            } else {
                alert(res.message || 'Gagal menyimpan profil instansi');
            }
        } catch (err: any) {
            alert(err.message || 'Terjadi kesalahan');
        } finally {
            setIsSavingProfil(false);
        }
    };

    // Master lists for labels
    const [jabatanList, setJabatanList] = useState<any[]>([]);
    const [bidangList, setBidangList] = useState<any[]>([]);
    const [subBidangList, setSubBidangList] = useState<any[]>([]);
    const [tipeUserList, setTipeUserList] = useState<any[]>([]);
    const [jenisPegawaiList, setJenisPegawaiList] = useState<any[]>([]);
    const [pangkatList, setPangkatList] = useState<any[]>([]);
    const [provinsi, setProvinsi] = useState<any[]>([]);
    const [kotaKab, setKotaKab] = useState<any[]>([]);
    const [kecamatan, setKecamatan] = useState<any[]>([]);
    const [kelurahan, setKelurahan] = useState<any[]>([]);

    const isSuperAdmin = user?.tipe_user_id === 1;
    const tipeUserNama = (user?.tipe_user_nama || '').toLowerCase();
    const isAdminInstansi = tipeUserNama.includes('admin instansi') || user?.tipe_user_id === 2;
    const isAdminBapperida = tipeUserNama.includes('admin bapperida');
    const isOwnInstansi = Number(user?.instansi_id) === Number(selectedInstansi);
    const canEditInstansi = isSuperAdmin || ((isAdminInstansi || isAdminBapperida) && isOwnInstansi);

    useEffect(() => {
        if (isSuperAdmin) {
            api.instansiDaerah.getAll().then(res => {
                if (res.success) {
                    setInstansiList(res.data);
                }
            });
        } else if (user?.instansi_id) {
            // Populate instansiList for non-superadmin so the detail modal can display the instansi name
            setInstansiList([{ id: user.instansi_id, instansi: user.instansi_nama || 'Instansi Anda' }]);
        }
    }, [isSuperAdmin, user]);

    useEffect(() => {
        if (!selectedInstansi) return;

        setLoading(true);
        Promise.all([
            api.internalInstansi.getByInstansiId(selectedInstansi),
            api.masterDataConfig.getDataByTable('master_jabatan').catch(() => ({ success: false, data: [] })),
            api.bidangInstansi.getAll().catch(() => ({ success: false, data: [] })),
            api.subBidangInstansi.getAll().catch(() => ({ success: false, data: [] })),
            api.masterDataConfig.getDataByTable('master_tipe_user').catch(() => ({ success: false, data: [] })),
            api.masterDataConfig.getDataByTable('master_jenis_pegawai').catch(() => ({ success: false, data: [] })),
            api.masterDataConfig.getDataByTable('master_pangkat_golongan').catch(() => ({ success: false, data: [] })),
            api.wilayah.getProvinsi().catch(() => ({ success: false, data: [] }))
        ]).then(([res, jabatanRes, bidangRes, subBidangRes, tipeUserRes, jenisPegawaiRes, pangkatRes, provinsiRes]) => {
            if (res.success) setData(res.data);
            else setError(res.message || res.error || 'Gagal mengambil data struktur organisasi');

            if (jabatanRes.success) setJabatanList(jabatanRes.data);
            if (bidangRes.success) setBidangList(bidangRes.data);
            if (subBidangRes.success) setSubBidangList(subBidangRes.data);
            if (tipeUserRes.success) setTipeUserList(tipeUserRes.data);
            if (jenisPegawaiRes.success) setJenisPegawaiList(jenisPegawaiRes.data);
            if (pangkatRes.success) setPangkatList(pangkatRes.data);
            if (provinsiRes.success) setProvinsi(provinsiRes.data);
        })
            .catch(err => setError(err.message))
            .finally(() => setLoading(false));
    }, [selectedInstansi]);

    // Handle card click to show details
    const handleCardClick = async (pId: any) => {
        const profilId = pId || null;
        if (!profilId) {
            console.error("No profile ID provided to handleCardClick");
            return;
        }

        setSelectedPegawai(null); // Clear previous data
        setLoadingDetail(true);
        setIsModalOpen(true);
        setActiveTab('profil');

        try {
            const res = await api.profilPegawai.getById(Number(profilId));
            if (res.success) {
                const pData = res.data;
                // Format dates safely
                const formatDate = (val: any) => {
                    if (!val) return '';
                    try {
                        const dateStr = typeof val === 'string' ? val : String(val);
                        return dateStr.split('T')[0];
                    } catch (e) {
                        return '';
                    }
                };

                const formattedData = {
                    ...pData,
                    tanggal_lahir: formatDate(pData.tanggal_lahir),
                    tmt_cpns: formatDate(pData.tmt_cpns),
                    tmt_pns: formatDate(pData.tmt_pns),
                };
                setSelectedPegawai(formattedData);

                // Fetch dependent wilayah data
                if (pData.provinsi_id) {
                    api.wilayah.getKotaByProvinsi(pData.provinsi_id).then(r => r.success && setKotaKab(r.data));
                }
                if (pData.kota_kabupaten_id) {
                    api.wilayah.getKecamatanByKota(pData.kota_kabupaten_id).then(r => r.success && setKecamatan(r.data));
                }
                if (pData.kecamatan_id) {
                    api.wilayah.getKelurahanByKecamatan(pData.kecamatan_id).then(r => r.success && setKelurahan(r.data));
                }
            } else {
                console.error("API failed to fetch detail:", res.message);
            }
        } catch (err) {
            console.error("Failed to fetch detail", err);
        } finally {
            setLoadingDetail(false);
        }
    };

    const downloadPDF = async () => {
        const element = document.getElementById('org-chart-container');
        if (!element) return;

        // Temporarily adjust styles for capture
        const originalStyle = element.style.overflow;
        element.style.overflow = 'visible';

        try {
            const dataUrl = await toPng(element, {
                cacheBust: true,
                backgroundColor: '#ffffff', // Force white bg
                width: element.scrollWidth,
                height: element.scrollHeight,
                pixelRatio: 2 // High resolution
            });

            const pdf = new jsPDF({
                orientation: element.scrollWidth > element.scrollHeight ? 'l' : 'p',
                unit: 'px',
                format: [element.scrollWidth * 1.5, element.scrollHeight * 1.5]
            });

            pdf.addImage(dataUrl, 'PNG', 0, 0, element.scrollWidth * 1.5, element.scrollHeight * 1.5);
            pdf.save(`Bagan-Organisasi-${new Date().getTime()}.pdf`);
        } catch (err) {
            console.error('PDF Conversion Error:', err);
            alert('Gagal mendownload PDF. Terjadi masalah saat merender bagan.');
        } finally {
            element.style.overflow = originalStyle;
        }
    };

    if (!isAuthenticated) return null;

    // Moved renderPegawaiCard outside or simplified it
    const onPegawaiClick = (p: any) => {
        const pId = p.id || p.profil_id;
        if (pId) handleCardClick(pId);
        else console.error("Missing ID in pegawai object", p);
    };

    const TreeNode = ({ title, defaultExpanded = false, children }: any) => {
        const [isExpanded, setIsExpanded] = useState(defaultExpanded);
        return (
            <div className="mb-2">
                <div
                    className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors border border-slate-200/50"
                    onClick={() => setIsExpanded(!isExpanded)}
                >
                    {isExpanded ? <ChevronDown size={16} className="text-slate-500" /> : <ChevronRight size={16} className="text-slate-500" />}
                    <h4 className="font-bold text-slate-700 text-sm">{title}</h4>
                </div>
                {isExpanded && (
                    <div className="pl-6 pt-3 pr-2 border-l-2 border-slate-100 ml-3 space-y-3">
                        {children}
                    </div>
                )}
            </div>
        );
    };

    const renderPegawaiCard = (pegawai: any) => {
        return (
            <div
                key={pegawai.id || pegawai.profil_id}
                onClick={() => onPegawaiClick(pegawai)}
                className="flex items-center gap-3 p-3 bg-white border border-slate-100 rounded-xl shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] hover:shadow-md hover:border-ppm-slate/30 transition-all cursor-pointer group active:scale-95"
            >
                <div className="w-10 h-10 rounded-full bg-slate-100 flex-shrink-0 flex items-center justify-center overflow-hidden border border-slate-50 group-hover:border-ppm-slate/20 transition-colors">
                    {pegawai.foto_profil ? (
                        <img src={`/uploads/${pegawai.foto_profil}`} alt={pegawai.nama_lengkap} className="w-full h-full object-cover" />
                    ) : (
                        <User className="text-slate-400 group-hover:text-ppm-slate transition-colors" size={20} />
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-slate-800 truncate group-hover:text-ppm-slate transition-colors">{pegawai.nama_lengkap}</div>
                    <div className="text-xs text-slate-500 truncate">{pegawai.jabatan || 'Tanpa Jabatan'}</div>
                </div>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <Eye size={14} className="text-ppm-slate" />
                </div>
            </div>
        );
    };

    return (
        <div className={`${isFullscreen ? 'max-w-full px-4' : 'max-w-7xl mx-auto'} space-y-6`}>
            {/* Fullscreen Header (only visible in bagan-organisasi page) */}
            {isFullscreen && (
                <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-slate-200 mb-6">
                    <button
                        onClick={() => window.location.href = '?page=internal-instansi'}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-slate-600 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-all shadow-sm"
                    >
                        <ChevronRight size={18} className="rotate-180" /> Kembali
                    </button>
                    <div className="flex items-center gap-3">
                        <h2 className="text-sm font-black text-slate-700 uppercase tracking-tight">Bagan Organisasi - {user?.instansi_nama || 'Instansi'}</h2>
                    </div>
                    <button
                        onClick={downloadPDF}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-ppm-slate rounded-xl hover:opacity-90 transition-all shadow-md shadow-ppm-slate/20"
                    >
                        <Download size={16} /> Download PDF
                    </button>
                </div>
            )}

            {!isFullscreen && (
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                    <div>
                        <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                            <Users className="text-ppm-slate" />
                            Struktur Organisasi Instansi
                        </h1>
                        <p className="text-sm text-slate-500 font-medium mt-1">Hierarki dan daftar pegawai berdasarkan jabatan</p>
                    </div>

                    {isSuperAdmin ? (
                        <div className="w-full md:w-64">
                            <SearchableSelect
                                value={selectedInstansi}
                                onChange={setSelectedInstansi}
                                options={instansiList}
                                label="Instansi"
                                keyField="id"
                                displayField="instansi"
                                className="w-full font-bold text-sm"
                            />
                        </div>
                    ) : (
                        <div className="bg-slate-50 border border-slate-100 px-4 py-2.5 rounded-xl flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-ppm-slate"></div>
                            <span className="text-sm font-bold text-slate-700">
                                {user?.instansi_nama || 'Instansi Anda'}
                            </span>
                        </div>
                    )}
                </div>
            )}

            {/* Toggle View and Admin Actions */}
            {!isFullscreen && (
                <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                    <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-200">
                        <button
                            onClick={() => setViewMode('list')}
                            className={`px-4 py-2 text-sm font-bold rounded-lg transition-all flex items-center gap-2 ${viewMode === 'list' ? 'bg-white shadow-sm text-ppm-slate border border-slate-200' : 'text-slate-500 hover:bg-slate-100'}`}
                        >
                            <Users size={16} /> Hierarki Daftar
                        </button>
                        <button
                            onClick={() => setViewMode('chart')}
                            className={`px-4 py-2 text-sm font-bold rounded-lg transition-all flex items-center gap-2 ${viewMode === 'chart' ? 'bg-white shadow-sm text-ppm-slate border border-slate-200' : 'text-slate-500 hover:bg-slate-100'}`}
                        >
                            <Building2 size={16} /> Bagan Organisasi
                        </button>
                    </div>

                    <div className="flex items-center gap-3">
                        {viewMode === 'chart' && selectedInstansi && (
                            <>
                                <button
                                    onClick={downloadPDF}
                                    className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-ppm-slate bg-white border border-ppm-slate/30 rounded-xl hover:bg-slate-50 transition-all shadow-sm"
                                >
                                    <Download size={16} /> Download PDF
                                </button>
                                <button
                                    onClick={() => window.open(`?page=bagan-organisasi&instansi_id=${selectedInstansi}`, '_blank')}
                                    className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all shadow-sm"
                                >
                                    <Eye size={16} /> Full Screen
                                </button>
                            </>
                        )}
                        {/* Tombol Edit untuk Admin Instansi, Admin Bapperida, Kasubbag Kepegawaian, atau Superadmin */}
                        {(isSuperAdmin || isAdminInstansi || isAdminBapperida || (user?.jabatan?.toLowerCase().includes('kepala sub bagian') && user?.jabatan?.toLowerCase().includes('kepegawaian'))) && (
                            <button
                                onClick={() => window.location.href = '?page=manajemen-pegawai'}
                                className="btn-primary"
                            >
                                Kelola Struktur Pegawai
                            </button>
                        )}
                    </div>
                </div>
            )}

            {loading ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="animate-spin text-ppm-slate" size={40} />
                </div>
            ) : !selectedInstansi ? (
                <div className="flex flex-col items-center justify-center py-24 bg-white rounded-3xl border border-slate-100 shadow-sm text-center px-4">
                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                        <Building2 className="text-slate-300" size={40} />
                    </div>
                    <h2 className="text-xl font-black text-slate-700 mb-2">Pilih Instansi</h2>
                    <p className="text-slate-500 max-w-sm">Silakan pilih instansi pada menu di atas untuk menampilkan struktur organisasi pegawai.</p>
                </div>
            ) : error ? (
                <div className="text-red-500 text-center py-10 bg-red-50 rounded-2xl border border-red-100 font-bold">{error}</div>
            ) : data ? (
                <div className="grid grid-cols-1 gap-6">
                    {/* Profil Instansi */}
                    {!isFullscreen && data.instansiDetail && (
                        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col md:flex-row gap-6 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-ppm-slate/5 to-transparent rounded-bl-full pointer-events-none"></div>

                            <div className="flex-1 space-y-4 z-10">
                                <div className="pr-24">
                                    <h3 className="text-xl font-black text-slate-800 flex items-center gap-2 tracking-tight">
                                        <Building2 className="text-ppm-slate" size={24} /> Profil {data.instansiDetail.instansi}
                                    </h3>
                                    {data.instansiDetail.singkatan && <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{data.instansiDetail.singkatan}</span>}
                                </div>
                                {viewMode === 'list' && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mb-3 border-b border-slate-200/50 pb-2">
                                                <FileText size={14} className="text-ppm-slate" /> Tugas Pokok dan Fungsi
                                            </h4>
                                            <p className="text-sm font-medium text-slate-700 whitespace-pre-wrap leading-relaxed">
                                                {data.instansiDetail.tupoksi || <span className="text-slate-400 italic">Belum ada data tupoksi</span>}
                                            </p>
                                        </div>
                                        <div className="space-y-4">
                                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-start gap-4 hover:shadow-sm transition-shadow">
                                                <div className="w-10 h-10 rounded-xl outline-none bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 border border-blue-200/50">
                                                    <MapPin size={20} />
                                                </div>
                                                <div>
                                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Alamat</h4>
                                                    <p className="text-sm font-bold text-slate-700 leading-tight">{data.instansiDetail.alamat || '-'}</p>
                                                </div>
                                            </div>
                                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-start gap-4 hover:shadow-sm transition-shadow">
                                                <div className="w-10 h-10 rounded-xl outline-none bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-200/50">
                                                    <Globe size={20} />
                                                </div>
                                                <div>
                                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Website</h4>
                                                    <p className="text-sm font-bold text-slate-700">
                                                        {data.instansiDetail.alamat_web ? (
                                                            <a href={data.instansiDetail.alamat_web.startsWith('http') ? data.instansiDetail.alamat_web : `https://${data.instansiDetail.alamat_web}`} target="_blank" rel="noopener noreferrer" className="text-ppm-slate hover:underline transition-colors decoration-2 underline-offset-4">{data.instansiDetail.alamat_web}</a>
                                                        ) : '-'}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {canEditInstansi && (
                                <div className="absolute top-6 right-6 z-20">
                                    <button
                                        onClick={() => {
                                            setEditProfilData({
                                                tupoksi: data.instansiDetail.tupoksi || '',
                                                alamat: data.instansiDetail.alamat || '',
                                                alamat_web: data.instansiDetail.alamat_web || ''
                                            });
                                            setIsEditProfilModalOpen(true);
                                        }}
                                        className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all shadow-sm active:scale-95"
                                    >
                                        <Edit2 size={14} /> Edit Profil
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* View Switch */}
                    {viewMode === 'list' ? (
                        <>
                            {/* Level 1: Kepala & Sekretaris */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
                                {/* Kepala */}
                                <div className="bg-white p-5 rounded-2xl border border-blue-100 shadow-lg shadow-blue-500/5">
                                    <h3 className="text-xs font-black text-blue-600 uppercase tracking-widest mb-4 flex items-center gap-2 border-b border-blue-50 pb-2">
                                        <div className="w-2 h-2 rounded-full bg-blue-500"></div> Pimpinan
                                    </h3>
                                    <div className="space-y-3">
                                        {data.kepala?.length > 0 ? data.kepala.map(renderPegawaiCard) : (
                                            <div className="text-sm text-slate-400 italic py-2">Belum ada data pimpinan</div>
                                        )}
                                    </div>
                                </div>

                                {/* Sekretaris */}
                                <div className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-lg shadow-emerald-500/5">
                                    <h3 className="text-xs font-black text-emerald-600 uppercase tracking-widest mb-4 flex items-center gap-2 border-b border-emerald-50 pb-2">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500"></div> Sekretariat
                                    </h3>
                                    <div className="space-y-3">
                                        {data.sekretaris?.length > 0 ? data.sekretaris.map(renderPegawaiCard) : (
                                            <div className="text-sm text-slate-400 italic py-2">Belum ada data sekretaris</div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Level 2: Bidang & Sub Bidang */}
                            <div className="bg-white p-0 rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                                <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                    <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest flex items-center gap-2">
                                        <Briefcase size={16} className="text-ppm-slate" />
                                        Daftar Bidang & Staf
                                    </h3>
                                    <div className="flex items-center gap-3">
                                        <div className="bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                            <span className="text-xs font-bold text-slate-600">
                                                {data.bidang?.length || 0} Bidang
                                            </span>
                                        </div>
                                        <div className="bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                            <span className="text-xs font-bold text-slate-600">
                                                {data.bidang?.reduce((acc: number, b: any) => acc + (b.sub_bidang?.length || 0), 0) || 0} Tim / Sub Bagian
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="p-4">
                                    {data.bidang?.length > 0 ? (
                                        data.bidang.map((b: any) => (
                                            <TreeNode key={b.id} title={b.nama_bidang} defaultExpanded={true}>
                                                {b.kepala_bidang.length > 0 && (
                                                    <div className="mb-4">
                                                        <div className="flex justify-center">
                                                            <div className="w-full md:w-1/2 xl:w-1/3">
                                                                {b.kepala_bidang.map((kb: any) => (
                                                                    <div key={kb.id || kb.profil_id} className="mb-2">
                                                                        <div className="relative border-2 border-emerald-400/50 rounded-xl overflow-hidden shadow-sm shadow-emerald-500/10">
                                                                            <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[8px] font-black tracking-widest px-2 py-0.5 rounded-bl-lg z-10 uppercase">Kepala Bidang / Kabag</div>
                                                                            {renderPegawaiCard(kb)}
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Sub Bidang */}
                                                {b.sub_bidang?.map((sb: any) => (
                                                    <div key={sb.id} className="ml-4 pl-4 border-l border-slate-200 mb-4 pb-2">
                                                        <h5 className="text-xs font-bold text-slate-600 uppercase mb-3">{sb.nama_sub_bidang}</h5>
                                                        <div className="space-y-3">
                                                            {(sb.kepala_sub.length > 0 || sb.staf.length > 0) && (
                                                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 pl-4">
                                                                    {sb.kepala_sub.map((ks: any) => (
                                                                        <div key={ks.profil_id} className="relative">
                                                                            <div className="absolute -left-[21px] top-1/2 w-4 border-b border-slate-200"></div>
                                                                            <div className="relative border-2 border-emerald-400/50 rounded-xl overflow-hidden shadow-sm shadow-emerald-500/10">
                                                                                <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[8px] font-black tracking-widest px-2 py-0.5 rounded-bl-lg z-10 uppercase">Ketua / Kasi / Kasubbag</div>
                                                                                {renderPegawaiCard(ks)}
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                    {sb.staf.map((st: any) => (
                                                                        <div key={st.profil_id} className="relative">
                                                                            <div className="absolute -left-[21px] top-1/2 w-4 border-b border-slate-200"></div>
                                                                            {renderPegawaiCard(st)}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}

                                                {/* Staf Bidang (Langsung di bawah bidang tanpa sub bidang) */}
                                                {b.staf.length > 0 && (
                                                    <div className="mt-3 ml-4">
                                                        <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Staf Bidang:</h5>
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                                                            {b.staf.map(renderPegawaiCard)}
                                                        </div>
                                                    </div>
                                                )}
                                            </TreeNode>
                                        ))
                                    ) : (
                                        <div className="text-center py-6 text-slate-400 italic text-sm">Tidak ada data bidang</div>
                                    )}
                                </div>
                            </div>
                        </>
                    ) : (
                        /* ORG CHART VIEW */
                        <div id="org-chart-container" className="bg-slate-50 p-8 rounded-3xl border border-slate-200 overflow-x-auto shadow-inner py-16 min-h-[600px] block text-center">
                            <div className="inline-flex flex-col items-center min-w-max px-8 text-left">
                                {/* Pimpinan Level */}
                                {data.kepala?.length > 0 && (
                                    <div className="flex flex-col items-center relative z-10 mb-4">
                                        <div className="w-80 border-2 border-blue-400/50 rounded-2xl overflow-hidden shadow-md shadow-blue-500/10 bg-white">
                                            <div className="bg-blue-500 text-white text-center text-[10px] font-black tracking-widest px-3 py-1.5 uppercase">Pimpinan / Kepala</div>
                                            {data.kepala.map((k: any) => renderPegawaiCard(k))}
                                        </div>
                                    </div>
                                )}

                                {/* Vertical Line from Pimpinan to Sekretariat Connector */}
                                {(data.kepala?.length > 0 && (data.sekretaris?.length > 0 || data.bidang?.length > 0)) && (
                                    <div className="w-0 border-l-2 border-slate-300 h-8"></div>
                                )}

                                {/* Sekretaris Level */}
                                {data.sekretaris?.length > 0 && (
                                    <div className="flex flex-col items-center relative z-10 w-full">
                                        {/* Sekretaris Cards */}
                                        <div className="w-80 border-2 border-emerald-400/50 rounded-2xl overflow-hidden shadow-md shadow-emerald-500/10 bg-white z-10">
                                            <div className="bg-emerald-500 text-white text-center text-[10px] font-black tracking-widest px-3 py-1.5 uppercase">Sekretaris</div>
                                            {data.sekretaris.map((s: any) => renderPegawaiCard(s))}
                                        </div>
                                        {/* Line continuing down from sekretaris to bidang if bidang exists */}
                                        {data.bidang?.length > 0 && (
                                            <div className="w-0 border-l-2 border-slate-300 h-8 z-0"></div>
                                        )}
                                    </div>
                                )}

                                {/* Bidang Level */}
                                {data.bidang?.length > 0 && (
                                    <div className="flex flex-col items-center w-full mt-4">
                                        {/* Horizontal Top Line for Bidangs */}
                                        {data.bidang.length > 1 && (
                                            <div className="border-t-2 border-slate-300 w-[calc(100%-320px)] h-0"></div>
                                        )}

                                        <div className="flex justify-center gap-12 mt-0 pt-8 relative">
                                            {/* Dynamic vertical lines connecting horizontal line to Bidang boxes */}
                                            {data.bidang.length > 1 && data.bidang.map((_: any, idx: number) => (
                                                <div key={`v-line-${idx}`} className={`absolute top-0 border-l-2 border-slate-300 h-8`} style={{ left: `calc(${(100 / (data.bidang.length * 2)) * (idx * 2 + 1)}%)` }}></div>
                                            ))}
                                            {/* If only 1 bidang, just a single straight line from top */}
                                            {data.bidang.length === 1 && (
                                                <div className="absolute top-0 border-l-2 border-slate-300 h-8 left-1/2 -translate-x-1/2"></div>
                                            )}

                                            {data.bidang.map((b: any) => (
                                                <div key={b.id} className="flex flex-col items-center w-[320px]">
                                                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm w-full overflow-hidden">
                                                        <div className="bg-slate-100 p-3 border-b border-slate-200 text-center">
                                                            <h4 className="font-bold text-xs text-slate-700 uppercase">{b.nama_bidang}</h4>
                                                        </div>

                                                        {/* Kepala Bidang */}
                                                        {b.kepala_bidang?.length > 0 && (
                                                            <div className="p-2 bg-slate-50/50">
                                                                <div className="border-2 border-emerald-400/50 rounded-xl overflow-hidden shadow-sm">
                                                                    <div className="bg-emerald-500 text-white text-center text-[8px] font-black tracking-widest px-2 py-0.5 uppercase z-10 relative">Kepala Bidang / Kabag</div>
                                                                    {b.kepala_bidang.map(renderPegawaiCard)}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Vertical line from Kabid to subordinates */}
                                                        {(b.sub_bidang?.length > 0 || b.staf?.length > 0) && (
                                                            <div className="flex justify-center">
                                                                <div className="border-l-2 border-slate-200 h-6"></div>
                                                            </div>
                                                        )}

                                                        <div className="p-3 space-y-4">
                                                            {/* Sub Bidang / Ketua Tim */}
                                                            {b.sub_bidang?.map((sb: any) => (
                                                                <div key={sb.id} className="bg-slate-50 border border-slate-200 rounded-xl p-2 relative">
                                                                    <div className="text-[10px] font-bold text-slate-500 uppercase text-center mb-2">{sb.nama_sub_bidang}</div>
                                                                    <div className="space-y-2">
                                                                        {/* Ketua Tim */}
                                                                        {sb.kepala_sub?.map((ks: any) => (
                                                                            <div key={ks.profil_id} className="border-2 border-emerald-300/50 rounded-lg overflow-hidden relative">
                                                                                <div className="absolute top-0 right-0 bg-emerald-400 text-white text-[8px] font-black tracking-widest px-1.5 py-0.5 rounded-bl z-10 uppercase">Ketua / Kasi</div>
                                                                                {renderPegawaiCard(ks)}
                                                                            </div>
                                                                        ))}
                                                                        {/* Staf Sub Bidang */}
                                                                        {sb.staf?.map((st: any) => (
                                                                            <div key={st.profil_id} className="border border-slate-100 rounded-lg overflow-hidden shadow-sm">
                                                                                {renderPegawaiCard(st)}
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            ) : null}

            {/* Detail Modal */}
            {isModalOpen && createPortal(
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col border border-slate-200 animate-in zoom-in-95 duration-200 overflow-hidden">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center shadow-sm overflow-hidden">
                                    {(selectedPegawai?.foto_profil) ? (
                                        <img src={`/uploads/${selectedPegawai.foto_profil}`} alt="Profil" className="w-full h-full object-cover" />
                                    ) : (
                                        <User className="text-slate-400" size={24} />
                                    )}
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                                        Detail Profil Pegawai
                                    </h3>
                                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-0.5">Informasi Lengkap Pegawai</p>
                                </div>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white rounded-xl transition-all border border-transparent hover:border-slate-200 text-slate-400 hover:text-slate-600">
                                <X size={24} />
                            </button>
                        </div>

                        {loadingDetail ? (
                            <div className="flex-1 flex flex-col items-center justify-center py-20 gap-4">
                                <Loader2 className="animate-spin text-ppm-slate" size={40} />
                                <p className="text-sm font-bold text-slate-400 animate-pulse">Mengambil data detail...</p>
                            </div>
                        ) : selectedPegawai ? (
                            <>
                                {/* Modal Tabs */}
                                <div className="flex border-b border-slate-100 bg-white">
                                    <button
                                        onClick={() => setActiveTab('profil')}
                                        className={`px-6 py-3 text-xs font-black uppercase tracking-widest transition-all border-b-2 flex items-center gap-2 ${activeTab === 'profil' ? 'border-ppm-slate text-ppm-slate bg-slate-50' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                                    >
                                        <User size={14} /> Profil Pegawai
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('pekerjaan')}
                                        className={`px-6 py-3 text-xs font-black uppercase tracking-widest transition-all border-b-2 flex items-center gap-2 ${activeTab === 'pekerjaan' ? 'border-ppm-slate text-ppm-slate bg-slate-50' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                                    >
                                        <HardHat size={14} /> Data Pekerjaan
                                    </button>
                                </div>

                                <div className="flex-1 overflow-y-auto p-8 space-y-6">
                                    {activeTab === 'profil' && (
                                        <div className="space-y-6 animate-in slide-in-from-left-2 duration-300">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div>
                                                    <label className="label-modern italic">Nama Lengkap</label>
                                                    <input type="text" className="input-modern w-full bg-slate-50" value={selectedPegawai.nama_lengkap || ''} readOnly />
                                                </div>
                                                <div>
                                                    <label className="label-modern italic">NIP</label>
                                                    <input type="text" className="input-modern w-full bg-slate-50" value={selectedPegawai.nip || ''} readOnly />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div>
                                                    <label className="label-modern italic">Email</label>
                                                    <input type="text" className="input-modern w-full bg-slate-50" value={selectedPegawai.email || ''} readOnly />
                                                </div>
                                                <div>
                                                    <label className="label-modern italic">No HP / WhatsApp</label>
                                                    <input type="text" className="input-modern w-full bg-slate-50" value={selectedPegawai.no_hp || ''} readOnly />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="z-40 relative">
                                                    <label className="label-modern italic">Jenis Pegawai</label>
                                                    <SearchableSelect
                                                        value={selectedPegawai.jenis_pegawai_id}
                                                        onChange={() => { }}
                                                        options={jenisPegawaiList}
                                                        label="Jenis Pegawai"
                                                        keyField="id"
                                                        displayField="nama"
                                                        disabled={true}
                                                    />
                                                </div>
                                                <div className="z-40 relative">
                                                    <label className="label-modern italic">Pangkat / Golongan</label>
                                                    <SearchableSelect
                                                        value={selectedPegawai.pangkat_golongan_id}
                                                        onChange={() => { }}
                                                        options={pangkatList}
                                                        label="Pangkat/Gol"
                                                        keyField="id"
                                                        displayField="pangkat_golongan"
                                                        disabled={true}
                                                    />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div>
                                                    <label className="label-modern italic">Pendidikan Terakhir</label>
                                                    <input type="text" className="input-modern w-full bg-slate-50" value={selectedPegawai.pendidikan_terakhir || ''} readOnly />
                                                </div>
                                                <div>
                                                    <label className="label-modern italic">Masa Kerja (Tahun / Bulan)</label>
                                                    <input type="text" className="input-modern w-full bg-slate-50" value={`${selectedPegawai.masa_kerja_tahun || 0} Tahun / ${selectedPegawai.masa_kerja_bulan || 0} Bulan`} readOnly />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div>
                                                    <label className="label-modern italic">TMT CPNS</label>
                                                    <input type="date" className="input-modern w-full bg-slate-50" value={selectedPegawai.tmt_cpns || ''} readOnly />
                                                </div>
                                                <div>
                                                    <label className="label-modern italic">TMT PNS</label>
                                                    <input type="date" className="input-modern w-full bg-slate-50" value={selectedPegawai.tmt_pns || ''} readOnly />
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {activeTab === 'pekerjaan' && (
                                        <div className="space-y-6 animate-in slide-in-from-left-2 duration-300">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="z-40 relative">
                                                    <label className="label-modern italic">Instansi</label>
                                                    <SearchableSelect
                                                        value={selectedPegawai.instansi_id}
                                                        onChange={() => { }}
                                                        options={instansiList}
                                                        label="Instansi"
                                                        keyField="id"
                                                        displayField="instansi"
                                                        disabled={true}
                                                    />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="z-30 relative">
                                                    <label className="label-modern italic">Jabatan</label>
                                                    <SearchableSelect
                                                        value={selectedPegawai.jabatan_id}
                                                        onChange={() => { }}
                                                        options={jabatanList}
                                                        label="Jabatan"
                                                        keyField="id"
                                                        displayField="jabatan"
                                                        disabled={true}
                                                    />
                                                </div>
                                                <div className="z-30 relative">
                                                    <label className="label-modern italic">Bidang</label>
                                                    <SearchableSelect
                                                        value={selectedPegawai.bidang_id}
                                                        onChange={() => { }}
                                                        options={bidangList}
                                                        label="Bidang"
                                                        keyField="id"
                                                        displayField="nama_bidang"
                                                        disabled={true}
                                                    />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="z-20 relative">
                                                    <label className="label-modern italic">Tim/Seksi</label>
                                                    <SearchableSelect
                                                        value={selectedPegawai.sub_bidang_id}
                                                        onChange={() => { }}
                                                        options={subBidangList}
                                                        label="Tim/Seksi"
                                                        keyField="id"
                                                        displayField="nama_sub_bidang"
                                                        disabled={true}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}


                                </div>
                                <div className="px-8 py-5 bg-slate-50 border-t border-slate-100 flex justify-end items-center gap-4">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                        <AlertCircle size={14} /> Mode Lihat Saja
                                    </p>
                                    <button onClick={() => setIsModalOpen(false)} className="px-8 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-all active:scale-95 shadow-sm">Tutup</button>
                                </div>
                            </>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center py-20 gap-4">
                                <AlertCircle className="text-red-400" size={40} />
                                <p className="text-sm font-bold text-slate-400">Gagal mengambil data pegawai</p>
                                <button onClick={() => setIsModalOpen(false)} className="btn-primary">Tutup</button>
                            </div>
                        )}
                    </div>
                </div>,
                document.body
            )}

            {/* Edit Profil Form Modal */}
            {isEditProfilModalOpen && createPortal(
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl flex flex-col border border-slate-200 animate-in zoom-in-95 duration-200 overflow-hidden">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center shadow-sm">
                                    <Building2 className="text-ppm-slate" size={24} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                                        Edit Profil Instansi
                                    </h3>
                                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-0.5">Tupoksi, Alamat & Website</p>
                                </div>
                            </div>
                            <button onClick={() => !isSavingProfil && setIsEditProfilModalOpen(false)} className="p-2 hover:bg-white rounded-xl transition-all border border-transparent hover:border-slate-200 text-slate-400 hover:text-slate-600">
                                <X size={24} />
                            </button>
                        </div>
                        <div className="p-8 space-y-6 flex-1 overflow-y-auto max-h-[70vh]">
                            <div>
                                <label className="label-modern italic">Alamat Instansi</label>
                                <textarea
                                    className="input-modern w-full resize-none h-24"
                                    placeholder="Masukkan alamat lengkap instansi..."
                                    value={editProfilData.alamat}
                                    onChange={e => setEditProfilData({ ...editProfilData, alamat: e.target.value })}
                                ></textarea>
                            </div>
                            <div>
                                <label className="label-modern italic">Alamat Web / Website</label>
                                <input
                                    type="text"
                                    className="input-modern w-full"
                                    placeholder="Contoh: https://bapperida.pemda.go.id"
                                    value={editProfilData.alamat_web}
                                    onChange={e => setEditProfilData({ ...editProfilData, alamat_web: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="label-modern italic">Tugok Pokok dan Fungsi (Tupoksi)</label>
                                <textarea
                                    className="input-modern w-full resize-y min-h-[150px]"
                                    placeholder="Jelaskan tupoksi instansi di sini..."
                                    value={editProfilData.tupoksi}
                                    onChange={e => setEditProfilData({ ...editProfilData, tupoksi: e.target.value })}
                                ></textarea>
                            </div>
                        </div>
                        <div className="px-8 py-5 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                            <button
                                onClick={() => setIsEditProfilModalOpen(false)}
                                disabled={isSavingProfil}
                                className="px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-all active:scale-95 shadow-sm disabled:opacity-50"
                            >
                                Batal
                            </button>
                            <button
                                onClick={handleSaveProfilInstansi}
                                disabled={isSavingProfil}
                                className="btn-primary"
                            >
                                {isSavingProfil ? <><Loader2 size={16} className="animate-spin" /> Menyimpan...</> : 'Simpan Perubahan'}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
