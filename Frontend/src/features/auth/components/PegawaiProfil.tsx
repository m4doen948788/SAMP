import React, { useState, useEffect, useMemo, useRef } from 'react';
import { api } from '@/src/services/api';
import { useAuth } from '@/src/contexts/AuthContext';
import { Shield, User, Contact2, Building2, GraduationCap, HardHat, FileText, Check, Loader2, KeyRound, Eye, EyeOff, ChevronDown, Search } from 'lucide-react';
import { SearchableSelect } from '@/src/features/common/components/SearchableSelect';

// Reusable component for searchable dropdown
function SearchableDropdown({
    options,
    value,
    onChange,
    placeholder,
    disabled = false
}: {
    options: { id: string, nama: string }[],
    value: string,
    onChange: (val: string) => void,
    placeholder: string,
    disabled?: boolean
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);

    // Close on click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredOptions = useMemo(() => {
        if (!search.trim()) return options.slice(0, 50); // limit to 50 for performance
        const q = search.toLowerCase();
        return options.filter(o => o.nama.toLowerCase().includes(q)).slice(0, 50);
    }, [options, search]);

    const selectedOption = options.find(o => o.id === value);

    return (
        <div className="relative" ref={containerRef}>
            <button
                type="button"
                className={`input-modern w-full flex items-center justify-between text-left ${disabled ? 'bg-slate-50 cursor-not-allowed text-slate-400' : 'bg-white'}`}
                onClick={() => !disabled && setIsOpen(!isOpen)}
                disabled={disabled}
            >
                <span className="truncate">{selectedOption ? selectedOption.nama : placeholder}</span>
                <ChevronDown size={16} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg">
                    <div className="p-2 border-b border-slate-100 sticky top-0 bg-white rounded-t-xl">
                        <div className="relative">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 bg-slate-50 text-sm border-none rounded-lg focus:ring-0"
                                placeholder="Cari..."
                                autoFocus
                            />
                        </div>
                    </div>
                    <div className="max-h-48 overflow-y-auto p-1">
                        <button
                            type="button"
                            className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 rounded-lg text-slate-500 italic"
                            onClick={() => {
                                onChange('');
                                setIsOpen(false);
                                setSearch('');
                            }}
                        >
                            -- Kosongkan --
                        </button>
                        {filteredOptions.length === 0 ? (
                            <div className="px-3 py-2 text-sm text-slate-400 text-center">Tidak ditemukan</div>
                        ) : (
                            filteredOptions.map(opt => (
                                <button
                                    key={opt.id}
                                    type="button"
                                    className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-50 rounded-lg transition-colors ${value === opt.id ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-700'
                                        }`}
                                    onClick={() => {
                                        onChange(opt.id);
                                        setIsOpen(false);
                                        setSearch('');
                                    }}
                                >
                                    {opt.nama}
                                </button>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default function PegawaiProfil() {
    const { user: authUser, updateUser, login } = useAuth();
    const userId = authUser?.id;

    const [activeTab, setActiveTab] = useState('akun');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // Account data
    const [accountData, setAccountData] = useState({
        username: '',
        gelar_depan: '',
        nama: '',
        gelar_belakang: '',
        nama_lengkap: '',
        email: '',
        no_hp: '',
        tipe_user_nama: '',
        instansi_id: null as number | null,
        instansi_nama: '',
        jabatan_id: null as number | null,
        jabatan_nama: '',
        bidang_id: null as number | null,
        bidang_nama: '',
        sub_bidang_nama: '',
        foto_profil: '',
    });

    // Instansi list for dropdown
    const [instansiList, setInstansiList] = useState<{ id: number; instansi: string }[]>([]);
    const [jenisPegawaiList, setJenisPegawaiList] = useState<{ id: number; nama: string }[]>([]);

    // Permission check: can the current user edit instansi?
    const canEditInstansi = useMemo(() => {
        if (!authUser) return false;
        const tipe = (authUser.tipe_user_nama || '').toLowerCase();
        const isSuperAdmin = authUser.tipe_user_id === 1;
        const isAdminInstansi = tipe.includes('admin instansi');
        const isBapperida = (authUser.instansi_nama || '').toLowerCase().includes('bapperida');
        const isKepalaSubBagKepegawaian =
            (authUser.jabatan_nama || '').toLowerCase().includes('kepala') &&
            (authUser.sub_bidang_nama || '').toLowerCase().includes('kepegawaian');
        return isSuperAdmin || isAdminInstansi || isBapperida || isKepalaSubBagKepegawaian;
    }, [authUser]);

    // Strict check: Only Super Admin or Kasubag Kepegawaian
    const canEditKepegawaian = useMemo(() => {
        if (!authUser) return false;
        const isSuperAdmin = authUser.tipe_user_id === 1;
        const isKepalaSubBagKepegawaian =
            (authUser.jabatan_nama || '').toLowerCase().includes('kepala') &&
            (authUser.sub_bidang_nama || '').toLowerCase().includes('kepegawaian');
        return isSuperAdmin || isKepalaSubBagKepegawaian;
    }, [authUser]);

    // Auto-concatenate name
    useEffect(() => {
        const { gelar_depan, nama, gelar_belakang } = accountData;
        if (!nama && !gelar_depan && !gelar_belakang) return;

        let full = nama || '';
        if (gelar_depan) full = `${gelar_depan} ${full}`;
        if (gelar_belakang) {
            if (full) full = `${full}, ${gelar_belakang}`;
            else full = gelar_belakang;
        }

        if (full !== accountData.nama_lengkap) {
            setAccountData(prev => ({ ...prev, nama_lengkap: full }));
        }
    }, [accountData.gelar_depan, accountData.nama, accountData.gelar_belakang]);

    // Password form
    const [passwordForm, setPasswordForm] = useState({ password: '', confirm: '' });
    const [showPassword, setShowPassword] = useState(false);

    // Wilayah dropdown data
    const [allKota, setAllKota] = useState<{ id: string; nama: string; provinsi_id: string; provinsi_nama: string }[]>([]);
    const [provinsiList, setProvinsiList] = useState<{ id: string; nama: string }[]>([]);
    const [kotaList, setKotaList] = useState<{ id: string; nama: string }[]>([]);
    const [kecamatanList, setKecamatanList] = useState<{ id: string; nama: string }[]>([]);
    const [kelurahanList, setKelurahanList] = useState<{ id: string; nama: string }[]>([]);
    const [kotaSearch, setKotaSearch] = useState('');
    const [showKotaDropdown, setShowKotaDropdown] = useState(false);

    const [formData, setFormData] = useState({
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
        nip: '',
        jenis_pegawai_id: '' as string | number,
        no_bpjs_kesehatan: '',
        no_bpjs_ketenagakerjaan: '',
        pangkat_golongan_id: '' as string | number,
        tmt_cpns: '',
        tmt_pns: '',
        masa_kerja_tahun: '',
        masa_kerja_bulan: '',
        pendidikan_terakhir: ''
    });

    useEffect(() => {
        if (!userId) return;
        const fetchProfile = async () => {
            setLoading(true);
            try {
                const res = await api.profilPegawai.getFullProfile(userId);
                if (res.success) {
                    const { user: u, profil: p } = res.data;
                    setAccountData({
                        username: u.username || '',
                        gelar_depan: u.gelar_depan || '',
                        nama: u.nama || '',
                        gelar_belakang: u.gelar_belakang || '',
                        nama_lengkap: u.nama_lengkap || '',
                        email: u.email || '',
                        no_hp: u.no_hp || '',
                        tipe_user_nama: u.tipe_user_nama || '',
                        instansi_id: u.instansi_id || null,
                        instansi_nama: u.instansi_nama || '',
                        jabatan_id: u.jabatan_id || null,
                        jabatan_nama: u.jabatan_nama || '',
                        bidang_id: u.bidang_id || null,
                        bidang_nama: u.bidang_nama || '',
                        sub_bidang_nama: u.sub_bidang_nama || '',
                        foto_profil: u.foto_profil || '',
                    });
                    if (p) {
                        setFormData({
                            tempat_lahir: p.tempat_lahir || '',
                            tanggal_lahir: (p.tanggal_lahir && p.tanggal_lahir.split('T')[0]) || '',
                            jenis_kelamin: p.jenis_kelamin || '',
                            agama: p.agama || '',
                            status_perkawinan: p.status_perkawinan || '',
                            golongan_darah: p.golongan_darah || '',
                            alamat_lengkap: p.alamat_lengkap || '',
                            provinsi_id: p.provinsi_id || '',
                            kota_kabupaten_id: p.kota_kabupaten_id || '',
                            kecamatan_id: p.kecamatan_id || '',
                            kelurahan_id: p.kelurahan_id || '',
                            npwp: p.npwp || '',
                            nip: p.nip || '',
                            jenis_pegawai_id: p.jenis_pegawai_id || '',
                            no_bpjs_kesehatan: p.no_bpjs_kesehatan || '',
                            no_bpjs_ketenagakerjaan: p.no_bpjs_ketenagakerjaan || '',
                            pangkat_golongan_id: p.pangkat_golongan_id || '',
                            tmt_cpns: (p.tmt_cpns && p.tmt_cpns.split('T')[0]) || '',
                            tmt_pns: (p.tmt_pns && p.tmt_pns.split('T')[0]) || '',
                            masa_kerja_tahun: p.masa_kerja_tahun || '',
                            masa_kerja_bulan: p.masa_kerja_bulan || '',
                            pendidikan_terakhir: p.pendidikan_terakhir || ''
                        });
                        // Pre-set kota search text for tempat lahir
                        if (p.tempat_lahir) setKotaSearch(p.tempat_lahir);
                    }
                }
            } catch (error) {
                console.error("Failed to load profile", error);
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();

        // Load master data list for dropdowns
        const fetchMasterData = async () => {
            try {
                const [instRes, jenisRes] = await Promise.all([
                    api.instansiDaerah.getAll(),
                    api.masterDataConfig.getDataByTable('master_jenis_pegawai')
                ]);
                if (instRes.success) setInstansiList(instRes.data || []);
                if (jenisRes.success) setJenisPegawaiList(jenisRes.data || []);
            } catch (e) { console.error('Failed to load master data', e); }
        };
        fetchMasterData();

        // Load wilayah data
        const fetchWilayah = async () => {
            try {
                const [provRes, kotaRes] = await Promise.all([
                    api.wilayah.getProvinsi(),
                    api.wilayah.getAllKota()
                ]);
                if (provRes.success) setProvinsiList(provRes.data || []);
                if (kotaRes.success) setAllKota(kotaRes.data || []);
            } catch (e) { console.error('Failed to load wilayah', e); }
        };
        fetchWilayah();
    }, [userId]);

    // Cascading: load kota when provinsi changes
    useEffect(() => {
        if (!formData.provinsi_id) { setKotaList([]); return; }
        api.wilayah.getKotaByProvinsi(formData.provinsi_id).then(res => {
            if (res.success) setKotaList(res.data || []);
        }).catch(() => setKotaList([]));
    }, [formData.provinsi_id]);

    // Cascading: load kecamatan when kota changes
    useEffect(() => {
        if (!formData.kota_kabupaten_id) { setKecamatanList([]); return; }
        api.wilayah.getKecamatanByKota(formData.kota_kabupaten_id).then(res => {
            if (res.success) setKecamatanList(res.data || []);
        }).catch(() => setKecamatanList([]));
    }, [formData.kota_kabupaten_id]);

    // Cascading: load kelurahan when kecamatan changes
    useEffect(() => {
        if (!formData.kecamatan_id) { setKelurahanList([]); return; }
        api.wilayah.getKelurahanByKecamatan(formData.kecamatan_id).then(res => {
            if (res.success) setKelurahanList(res.data || []);
        }).catch(() => setKelurahanList([]));
    }, [formData.kecamatan_id]);

    // Filtered kota for searchable tempat lahir dropdown
    const filteredKota = useMemo(() => {
        if (!kotaSearch.trim()) return allKota.slice(0, 20);
        const q = kotaSearch.toLowerCase();
        return allKota.filter(k => k.nama.toLowerCase().includes(q)).slice(0, 20);
    }, [allKota, kotaSearch]);

    const showMsg = (type: 'success' | 'error', text: string) => {
        setMessage({ type, text });
        setTimeout(() => setMessage(null), 3000);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSaveAccount = async () => {
        if (!userId) return;
        setSaving(true);
        try {
            const payload: any = {
                username: accountData.username,
                gelar_depan: accountData.gelar_depan,
                nama: accountData.nama,
                gelar_belakang: accountData.gelar_belakang,
                no_hp: accountData.no_hp,
                nama_lengkap: accountData.nama_lengkap,
                email: accountData.email,
            };
            // Only send instansi_id if the user has permission to edit it
            if (canEditInstansi) {
                payload.instansi_id = accountData.instansi_id;
            }
            const res = await api.profilPegawai.updateAccount(userId, payload);
            if (res.success) {
                showMsg('success', 'Data berhasil disimpan!');
                // Update auth context with new token and user data from server
                if (res.data?.token && res.data?.user) {
                    login(res.data.token, res.data.user);
                } else {
                    // Fallback to partial update if token not returned
                    updateUser({ ...authUser!, ...accountData } as any);
                }
            } else {
                showMsg('error', res.message || 'Gagal menyimpan');
            }
        } catch {
            showMsg('error', 'Terjadi kesalahan saat menyimpan');
        } finally {
            setSaving(false);
        }
    };

    const handleChangePassword = async () => {
        if (!userId) return;
        if (passwordForm.password !== passwordForm.confirm) {
            showMsg('error', 'Password dan konfirmasi tidak cocok');
            return;
        }
        if (passwordForm.password.length < 4) {
            showMsg('error', 'Password minimal 4 karakter');
            return;
        }
        setSaving(true);
        try {
            const res = await api.profilPegawai.changePassword(userId, passwordForm.password);
            if (res.success) {
                showMsg('success', 'Password berhasil diubah!');
                setPasswordForm({ password: '', confirm: '' });
            } else {
                showMsg('error', res.message || 'Gagal mengubah password');
            }
        } catch {
            showMsg('error', 'Terjadi kesalahan');
        } finally {
            setSaving(false);
        }
    };

    const handleSaveProfile = async () => {
        if (!userId) return;
        setSaving(true);
        try {
            const res = await api.profilPegawai.upsertByUserId(userId, formData);
            if (res.success) {
                showMsg('success', 'Profil berhasil disimpan!');
                // Update local auth context to sync changes (header, etc)
                if (authUser) {
                    const updatedUser = { ...authUser, ...formData };
                    updateUser(updatedUser as any);
                }
            } else {
                showMsg('error', res.message || 'Gagal menyimpan profil');
            }
        } catch {
            showMsg('error', 'Terjadi kesalahan saat menyimpan profil');
        } finally {
            setSaving(false);
        }
    };

    const tabs = [
        { id: 'akun', label: 'Akun & Keamanan', icon: <Shield size={16} /> },
        { id: 'pribadi', label: 'Data Pribadi', icon: <User size={16} /> },
        { id: 'identitas', label: 'Identitas & Pajak', icon: <Contact2 size={16} /> },
        { id: 'kepegawaian', label: 'Data Kepegawaian', icon: <Building2 size={16} /> },
        { id: 'pekerjaan', label: 'Data Pekerjaan', icon: <HardHat size={16} /> },
        { id: 'pendidikan', label: 'Riwayat Pendidikan', icon: <GraduationCap size={16} /> },
        { id: 'jabatan', label: 'Riwayat Jabatan', icon: <FileText size={16} /> },
    ];

    if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-ppm-slate" size={44} /></div>;

    return (
        <div className="max-w-4xl mx-auto pb-10">
            <h2 className="text-[24px] font-black text-slate-800 tracking-tight mb-2">Profil Saya</h2>
            <p className="text-slate-500 text-sm mb-6">Kelola akun, data diri, dan riwayat kepegawaian Anda.</p>

            {/* Toast message */}
            {message && (
                <div className={`mb-4 px-4 py-3 rounded-xl text-sm font-semibold flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-200 ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                    <div className={`w-2 h-2 rounded-full ${message.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                    {message.text}
                </div>
            )}

            <div className="card-modern flex flex-col sm:flex-row shadow-[0_4px_24px_-8px_rgba(0,0,0,0.05)] border border-slate-100 min-h-[500px]">

                {/* Sidebar Tabs */}
                <div className="w-full sm:w-64 bg-slate-50/80 border-r border-slate-100 p-4 shrink-0">
                    <div className="flex flex-col gap-1.5">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-3 px-4 py-3 w-full text-left rounded-xl transition-all font-bold text-sm tracking-wide ${activeTab === tab.id
                                    ? 'bg-white text-ppm-slate shadow-sm border border-slate-100 scale-[1.02]'
                                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                                    }`}
                            >
                                <span className={activeTab === tab.id ? 'text-ppm-blue' : 'text-slate-400'}>{tab.icon}</span>
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 p-6 relative bg-white">
                    <div className="pb-16">

                        {/* TAB 0: AKUN & KEAMANAN */}
                        {activeTab === 'akun' && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                {/* Informasi Akun */}
                                <div>
                                    <h3 className="text-lg font-black text-slate-800 border-b border-slate-100 pb-2 mb-4">Informasi Akun</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Username</label>
                                            <input
                                                type="text"
                                                value={accountData.username}
                                                onChange={e => setAccountData({ ...accountData, username: e.target.value })}
                                                className="input-modern w-full"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Role</label>
                                            <input type="text" value={accountData.tipe_user_nama || '-'} disabled className="input-modern w-full bg-slate-50 text-slate-400 cursor-not-allowed" />
                                        </div>
                                    </div>
                                </div>

                                {/* Ganti Password */}
                                <div>
                                    <h3 className="text-lg font-black text-slate-800 border-b border-slate-100 pb-2 mb-4 flex items-center gap-2">
                                        <KeyRound size={18} className="text-slate-400" /> Ganti Password
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Password Baru</label>
                                            <div className="relative">
                                                <input
                                                    type={showPassword ? 'text' : 'password'}
                                                    value={passwordForm.password}
                                                    onChange={e => setPasswordForm({ ...passwordForm, password: e.target.value })}
                                                    className="input-modern w-full pr-10"
                                                    placeholder="Minimal 4 karakter"
                                                />
                                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                                </button>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Konfirmasi Password</label>
                                            <input
                                                type={showPassword ? 'text' : 'password'}
                                                value={passwordForm.confirm}
                                                onChange={e => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
                                                className={`input-modern w-full ${passwordForm.confirm && passwordForm.password !== passwordForm.confirm ? 'border-red-400 focus:border-red-500' : ''}`}
                                                placeholder="Ulangi password baru"
                                            />
                                            {passwordForm.confirm && passwordForm.password !== passwordForm.confirm && (
                                                <p className="text-[10px] text-red-500 font-bold mt-1">Password tidak cocok</p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex justify-end mt-4">
                                        <button
                                            onClick={handleChangePassword}
                                            disabled={saving || !passwordForm.password || passwordForm.password !== passwordForm.confirm}
                                            className="btn-primary shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {saving ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />}
                                            Ubah Password
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* TAB 1: DATA PRIBADI */}
                        {activeTab === 'pribadi' && (
                            <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                                <h3 className="text-lg font-black text-slate-800 border-b border-slate-100 pb-2 mb-4">Informasi Nama & Kontak</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Gelar Depan</label>
                                        <input type="text" value={accountData.gelar_depan} onChange={e => setAccountData({ ...accountData, gelar_depan: e.target.value })} className="input-modern w-full" placeholder="Contoh: Dr." />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Nama <span className="text-red-500">*</span></label>
                                        <input type="text" value={accountData.nama} onChange={e => setAccountData({ ...accountData, nama: e.target.value })} className="input-modern w-full" placeholder="Nama Tanpa Gelar" required />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Gelar Belakang</label>
                                        <input type="text" value={accountData.gelar_belakang} onChange={e => setAccountData({ ...accountData, gelar_belakang: e.target.value })} className="input-modern w-full" placeholder="Contoh: S.Kom" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Penyatuan (Otomatis)</label>
                                        <input type="text" value={accountData.nama_lengkap} disabled className="input-modern w-full bg-slate-50 text-slate-600 font-bold" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Email</label>
                                        <input type="email" value={accountData.email} onChange={e => setAccountData({ ...accountData, email: e.target.value })} className="input-modern w-full" placeholder="email@example.com" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">NIP (Nomor Induk Pegawai)</label>
                                        <input type="text" name="nip" value={formData.nip} onChange={handleChange} className="input-modern w-full font-mono tracking-widest" placeholder="19xxxxxxxxxxxxxx" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">No. HP</label>
                                        <input type="text" value={accountData.no_hp} onChange={e => setAccountData({ ...accountData, no_hp: e.target.value })} className="input-modern w-full" placeholder="08xxxxxxxxxx" />
                                    </div>
                                    <div>
                                        <label className={`block text-xs font-bold uppercase tracking-wider mb-1 ${canEditInstansi ? 'text-slate-500' : 'text-slate-400'}`}>Instansi</label>
                                        {canEditInstansi ? (
                                            <SearchableSelect
                                                value={accountData.instansi_id}
                                                onChange={(val: any) => setAccountData({ ...accountData, instansi_id: val })}
                                                options={instansiList}
                                                label="Instansi"
                                                keyField="id"
                                                displayField="instansi"
                                                className="w-full bg-white"
                                            />
                                        ) : (
                                            <input type="text" value={accountData.instansi_nama || '-'} disabled className="input-modern w-full bg-slate-50 text-slate-400 cursor-not-allowed" />
                                        )}
                                    </div>
                                </div>

                                {/* Informasi Dasar */}
                                <h3 className="text-lg font-black text-slate-800 border-b border-slate-100 pb-2 mb-4 mt-6">Informasi Dasar</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="relative">
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Tempat Lahir</label>
                                        <input
                                            type="text"
                                            name="tempat_lahir"
                                            value={formData.tempat_lahir}
                                            onChange={handleChange}
                                            className="input-modern w-full"
                                            placeholder="Masukkan tempat lahir"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Tanggal Lahir</label>
                                        <input type="date" name="tanggal_lahir" value={formData.tanggal_lahir} onChange={handleChange} className="input-modern w-full" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Jenis Kelamin</label>
                                        <select name="jenis_kelamin" value={formData.jenis_kelamin} onChange={handleChange} className="input-modern w-full bg-white">
                                            <option value="">-- Pilih --</option>
                                            <option value="Laki-laki">Laki-laki</option>
                                            <option value="Perempuan">Perempuan</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Golongan Darah</label>
                                        <select name="golongan_darah" value={formData.golongan_darah} onChange={handleChange} className="input-modern w-full bg-white">
                                            <option value="">-- Pilih --</option>
                                            <option value="A">A</option>
                                            <option value="B">B</option>
                                            <option value="AB">AB</option>
                                            <option value="O">O</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Agama</label>
                                        <select name="agama" value={formData.agama} onChange={handleChange} className="input-modern w-full bg-white">
                                            <option value="">-- Pilih --</option>
                                            <option value="Islam">Islam</option>
                                            <option value="Kristen">Kristen</option>
                                            <option value="Katolik">Katolik</option>
                                            <option value="Hindu">Hindu</option>
                                            <option value="Buddha">Buddha</option>
                                            <option value="Konghucu">Konghucu</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Status Perkawinan</label>
                                        <select name="status_perkawinan" value={formData.status_perkawinan} onChange={handleChange} className="input-modern w-full bg-white">
                                            <option value="">-- Pilih --</option>
                                            <option value="Belum Kawin">Belum Kawin</option>
                                            <option value="Kawin">Kawin</option>
                                            <option value="Cerai Hidup">Cerai Hidup</option>
                                            <option value="Cerai Mati">Cerai Mati</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Alamat Wilayah - Cascading Dropdowns */}
                                <h3 className="text-lg font-black text-slate-800 border-b border-slate-100 pb-2 mb-4 mt-6">Alamat Domisili</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Provinsi</label>
                                        <SearchableDropdown
                                            options={provinsiList}
                                            value={formData.provinsi_id}
                                            onChange={val => setFormData({ ...formData, provinsi_id: val, kota_kabupaten_id: '', kecamatan_id: '', kelurahan_id: '' })}
                                            placeholder="-- Pilih Provinsi --"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Kota / Kabupaten</label>
                                        <SearchableDropdown
                                            options={kotaList}
                                            value={formData.kota_kabupaten_id}
                                            onChange={val => setFormData({ ...formData, kota_kabupaten_id: val, kecamatan_id: '', kelurahan_id: '' })}
                                            placeholder={formData.provinsi_id ? "-- Pilih Kota/Kab --" : "-- Pilih provinsi dulu --"}
                                            disabled={!formData.provinsi_id}
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Kecamatan</label>
                                        <SearchableDropdown
                                            options={kecamatanList}
                                            value={formData.kecamatan_id}
                                            onChange={val => setFormData({ ...formData, kecamatan_id: val, kelurahan_id: '' })}
                                            placeholder={formData.kota_kabupaten_id ? "-- Pilih Kecamatan --" : "-- Pilih kota/kab dulu --"}
                                            disabled={!formData.kota_kabupaten_id}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Kelurahan / Desa</label>
                                        <SearchableDropdown
                                            options={kelurahanList}
                                            value={formData.kelurahan_id}
                                            onChange={val => setFormData({ ...formData, kelurahan_id: val })}
                                            placeholder={formData.kecamatan_id ? "-- Pilih Kelurahan --" : "-- Pilih kecamatan dulu --"}
                                            disabled={!formData.kecamatan_id}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Detail Alamat (RT/RW, Jalan, No.)</label>
                                    <textarea name="alamat_lengkap" value={formData.alamat_lengkap} onChange={handleChange} rows={3} className="input-modern w-full resize-none" placeholder="Masukkan detail alamat: Jl. ..., RT/RW ..., No. ..."></textarea>
                                </div>
                            </div>
                        )}

                        {/* TAB 2: IDENTITAS & PAJAK */}
                        {activeTab === 'identitas' && (
                            <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                                <h3 className="text-lg font-black text-slate-800 border-b border-slate-100 pb-2 mb-4">Informasi Identitas</h3>
                                <div className="grid grid-cols-1 gap-4">
                                    {/* NIP moved to Data Pribadi */}
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">NPWP</label>
                                        <input type="text" name="npwp" value={formData.npwp} onChange={handleChange} className="input-modern w-full font-mono tracking-widest" placeholder="00.000.000.0-000.000" />
                                    </div>
                                </div>
                                <h3 className="text-lg font-black text-slate-800 border-b border-slate-100 pb-2 mb-4 mt-4">Pajak & Asuransi Sosial</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">No BPJS Kesehatan</label>
                                        <input type="text" name="no_bpjs_kesehatan" value={formData.no_bpjs_kesehatan} onChange={handleChange} className="input-modern w-full font-mono" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">No BPJS Ketenagakerjaan</label>
                                        <input type="text" name="no_bpjs_ketenagakerjaan" value={formData.no_bpjs_ketenagakerjaan} onChange={handleChange} className="input-modern w-full font-mono" />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* TAB 3: DATA KEPEGAWAIAN */}
                        {activeTab === 'kepegawaian' && (
                            <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                                <h3 className="text-lg font-black text-slate-800 border-b border-slate-100 pb-2 mb-4">Informasi Kepegawaian</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Pendidikan Terakhir</label>
                                        <select name="pendidikan_terakhir" value={formData.pendidikan_terakhir} onChange={handleChange} className="input-modern w-full bg-white">
                                            <option value="">-- Pilih Pendidikan --</option>
                                            <option value="SD">SD</option>
                                            <option value="SMP">SMP</option>
                                            <option value="SMA/Sederajat">SMA/Sederajat</option>
                                            <option value="D3">Diploma 3 (D3)</option>
                                            <option value="D4">Diploma 4 (D4)</option>
                                            <option value="S1">Sarjana (S1)</option>
                                            <option value="S2">Magister (S2)</option>
                                            <option value="S3">Doktoral (S3)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Jenis Pegawai</label>
                                        <select name="jenis_pegawai_id" value={formData.jenis_pegawai_id} onChange={handleChange} className="input-modern w-full bg-white">
                                            <option value="">-- Pilih Jenis --</option>
                                            {jenisPegawaiList.map(jp => (
                                                <option key={jp.id} value={jp.id}>{jp.nama}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">TMT CPNS</label>
                                        <input type="date" name="tmt_cpns" value={formData.tmt_cpns} onChange={handleChange} className="input-modern w-full" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">TMT PNS</label>
                                        <input type="date" name="tmt_pns" value={formData.tmt_pns} onChange={handleChange} className="input-modern w-full" />
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-slate-50">
                                    <label className={`block text-xs font-bold uppercase tracking-wider mb-1 ${canEditKepegawaian ? 'text-slate-500' : 'text-slate-400'}`}>Pangkat / Golongan {!canEditKepegawaian && <span className="text-[10px] italic normal-case text-red-400 font-normal opacity-70">(Locked)</span>}</label>
                                    <input
                                        type="text"
                                        name="pangkat_golongan_id"
                                        value={formData.pangkat_golongan_id}
                                        onChange={handleChange}
                                        disabled={!canEditKepegawaian}
                                        className={`input-modern w-full ${!canEditKepegawaian ? 'bg-slate-50 text-slate-400 cursor-not-allowed opacity-80' : ''}`}
                                        placeholder="Contoh: Penata Muda (III/a)"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Masa Kerja (Tahun)</label>
                                        <input type="number" name="masa_kerja_tahun" value={formData.masa_kerja_tahun} onChange={handleChange} className="input-modern w-full" placeholder="0" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Masa Kerja (Bulan)</label>
                                        <input type="number" name="masa_kerja_bulan" value={formData.masa_kerja_bulan} onChange={handleChange} className="input-modern w-full" placeholder="0" />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* TAB 4: DATA PEKERJAAN */}
                        {activeTab === 'pekerjaan' && (
                            <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                                <h3 className="text-lg font-black text-slate-800 border-b border-slate-100 pb-2 mb-4">Informasi Pekerjaan Saat Ini</h3>
                                <div className="grid grid-cols-1 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Instansi</label>
                                        <input type="text" value={accountData.instansi_nama || '-'} disabled className="input-modern w-full bg-slate-50 text-slate-400 cursor-not-allowed" />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Jabatan</label>
                                            <input type="text" value={accountData.jabatan_nama || '-'} disabled className="input-modern w-full bg-slate-50 text-slate-400 cursor-not-allowed" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Bidang / Unit Kerja</label>
                                            <input type="text" value={accountData.bidang_nama || '-'} disabled className="input-modern w-full bg-slate-50 text-slate-400 cursor-not-allowed" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Sub Bidang / Seksi</label>
                                        <input type="text" value={accountData.sub_bidang_nama || '-'} disabled className="input-modern w-full bg-slate-50 text-slate-400 cursor-not-allowed" />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* OTHER TABS (Placeholders) */}
                        {['pendidikan', 'jabatan'].includes(activeTab) && (
                            <div className="flex flex-col items-center justify-center h-full text-slate-400 py-20 animate-in fade-in slide-in-from-right-4 duration-300">
                                <div className="bg-slate-50 border border-dashed border-slate-200 p-8 rounded-2xl w-full text-center max-w-sm">
                                    <div className="text-4xl mb-3 opacity-30">🚧</div>
                                    <h3 className="text-sm font-bold text-slate-500 mb-1">Fitur Segera Hadir</h3>
                                    <p className="text-xs text-slate-400">Modul ini membutuhkan tabel terpisah karena sifatnya "Satu ke Banyak" (Riwayat Multi-Data).</p>
                                </div>
                            </div>
                        )}

                    </div>

                    {/* Sticky Action Button - only for profile tabs */}
                    {['akun', 'pribadi', 'identitas', 'kepegawaian', 'pekerjaan'].includes(activeTab) && (
                        <div className="sticky bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur-md border-t border-slate-100 flex justify-end z-[40] -mx-6 -mb-6 rounded-b-3xl">
                            <button
                                onClick={async () => {
                                    if (activeTab === 'akun') {
                                        await handleSaveAccount();
                                    } else if (activeTab === 'pribadi') {
                                        await handleSaveAccount();
                                        await handleSaveProfile();
                                    } else {
                                        await handleSaveProfile();
                                    }
                                }}
                                disabled={saving}
                                className="btn-primary shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                                {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
                            </button>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}
