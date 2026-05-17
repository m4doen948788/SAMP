import React from 'react';
import { 
    Calendar, 
    MapPin, 
    AlignLeft, 
    FileText, 
    Clock, 
    Type,
    Building2,
    User
} from 'lucide-react';
import { SearchableSelect } from '@/src/features/common/components/SearchableSelect';
import { api } from '@/src/services/api';
import { calculateDuration, getEmployeeLevel } from '../utils/letterComposers';



interface StructuredLeaveFormProps {
    data: any;
    onChange: (newData: any) => void;
    employeeData: any;
    employees: any[];
    isEdit?: boolean;
}

const StructuredLeaveForm: React.FC<StructuredLeaveFormProps> = ({ data, onChange, employeeData, employees, isEdit }) => {
    const [showAllKetuaTim, setShowAllKetuaTim] = React.useState(false);
    const [showAllKepalaBidang, setShowAllKepalaBidang] = React.useState(false);
    const [jenisCutiList, setJenisCutiList] = React.useState<{id: number, jenis_cuti: string}[]>([]);

    React.useEffect(() => {
        const fetchJenisCuti = async () => {
            try {
                const res = await api.masterDataConfig.getDataByTable('master_jenis_cuti');
                if (res.success && res.data) {
                    setJenisCutiList(res.data);
                }
            } catch (err) {
                console.error('Failed to fetch jenis cuti', err);
            }
        };
        fetchJenisCuti();
    }, []);

    const prevEmployeeIdRef = React.useRef<any>(null);

    React.useEffect(() => {
        if (!employeeData || !employees || employees.length === 0) {
            prevEmployeeIdRef.current = null;
            return;
        }

        const employeeId = employeeData.id;
        const prevEmployeeId = prevEmployeeIdRef.current;
        
        // Detect conditions for auto-selection
        const isFirstSelection = prevEmployeeId === null;
        const employeeChanged = !isFirstSelection && prevEmployeeId !== employeeId;
        
        const isApproversEmpty = !data.approvers || (
            !data.approvers.ketua_tim && 
            !data.approvers.kepala_bidang && 
            !data.approvers.sekretaris && 
            !data.approvers.kepala_badan
        );

        // We auto-select if:
        // 1. The user actively changed the employee to a different one.
        // 2. This is the first time an employee is loaded, and we are NOT in edit mode.
        // 3. This is the first time an employee is loaded, we are in edit mode, but the saved approvers are completely empty.
        const shouldAutoSelect = employeeChanged || (isFirstSelection && (!isEdit || isApproversEmpty));

        if (shouldAutoSelect) {
            const updatedApprovers = { ...(data.approvers || {}) };
            let changed = false;
            const empLevel = getEmployeeLevel(employeeData.jabatan_nama);

            // 1. Kepala Bidang (Kabid)
            if (empLevel >= 4) {
                const kabid = employees.find(e => {
                    const isRightLevel = getEmployeeLevel(e.jabatan_nama) === 3;
                    const isSameBidang = e.bidang_id === employeeData.bidang_id;
                    return isRightLevel && isSameBidang;
                });
                if (kabid) {
                    updatedApprovers.kepala_bidang = kabid;
                    changed = true;
                } else {
                    const fallbackKabid = employees.find(e => getEmployeeLevel(e.jabatan_nama) === 3);
                    if (fallbackKabid) {
                        updatedApprovers.kepala_bidang = fallbackKabid;
                        changed = true;
                    }
                }
            } else {
                if (updatedApprovers.kepala_bidang) {
                    updatedApprovers.kepala_bidang = null;
                    changed = true;
                }
            }

            // 2. Sekretaris
            if (empLevel >= 2) {
                const sekretaris = employees.find(e => {
                    const j = (e.jabatan_nama || '').toLowerCase();
                    const isRightRole = j.includes('sekretaris');
                    const isSameInstansi = e.instansi_id === employeeData.instansi_id;
                    return isRightRole && isSameInstansi;
                });
                if (sekretaris) {
                    updatedApprovers.sekretaris = sekretaris;
                    changed = true;
                } else {
                    const fallbackSekretaris = employees.find(e => (e.jabatan_nama || '').toLowerCase().includes('sekretaris'));
                    if (fallbackSekretaris) {
                        updatedApprovers.sekretaris = fallbackSekretaris;
                        changed = true;
                    }
                }
            } else {
                if (updatedApprovers.sekretaris) {
                    updatedApprovers.sekretaris = null;
                    changed = true;
                }
            }

            // 3. Kepala Badan (Kaban)
            if (empLevel >= 2) {
                const kaban = employees.find(e => {
                    const isRightLevel = getEmployeeLevel(e.jabatan_nama) === 2;
                    const isSameInstansi = e.instansi_id === employeeData.instansi_id;
                    return isRightLevel && isSameInstansi;
                });
                if (kaban) {
                    updatedApprovers.kepala_badan = kaban;
                    changed = true;
                } else {
                    const fallbackKaban = employees.find(e => getEmployeeLevel(e.jabatan_nama) === 2);
                    if (fallbackKaban) {
                        updatedApprovers.kepala_badan = fallbackKaban;
                        changed = true;
                    }
                }
            } else {
                if (updatedApprovers.kepala_badan) {
                    updatedApprovers.kepala_badan = null;
                    changed = true;
                }
            }

            // 4. Ketua Tim
            // Ketua Tim is not selected automatically per user request
            if (empLevel < 5) {
                if (updatedApprovers.ketua_tim) {
                    updatedApprovers.ketua_tim = null;
                    changed = true;
                }
            }

            if (changed) {
                onChange({
                    ...data,
                    approvers: updatedApprovers
                });
            }
        }

        // Always update the ref with the current employee ID so we can track changes
        prevEmployeeIdRef.current = employeeId;
    }, [employeeData, employees, isEdit]);

    const handleChange = (field: string, value: any) => {
        onChange({ ...data, [field]: value });
    };

    const handleNestedChange = (parent: string, field: string, value: any) => {
        onChange({
            ...data,
            [parent]: {
                ...data[parent],
                [field]: value
            }
        });
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Part 1: Tujuan */}
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                <div className="flex items-center gap-2 mb-2">
                    <Building2 size={16} className="text-purple-500" />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Bagian 1: Tujuan Surat</span>
                </div>
                <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-700 ml-1">Jabatan Penerima</label>
                        <input 
                            type="text" 
                            className="input-modern w-full"
                            placeholder="Contoh: Kepala Badan Perencanaan Pembangunan..."
                            value={data.tujuan?.jabatan || ''}
                            onChange={(e) => handleNestedChange('tujuan', 'jabatan', e.target.value)}
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-700 ml-1">Lokasi</label>
                        <input 
                            type="text" 
                            className="input-modern w-full"
                            placeholder="Tempat"
                            value={data.tujuan?.lokasi || 'Tempat'}
                            onChange={(e) => handleNestedChange('tujuan', 'lokasi', e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Part 2: Kalimat Pembuka */}
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                <div className="flex items-center gap-2 mb-2">
                    <AlignLeft size={16} className="text-purple-500" />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Bagian 2: Kalimat Pembuka</span>
                </div>
                <textarea 
                    className="input-modern w-full h-20 resize-none"
                    value={data.pembuka || 'Saya yang bertandatangan di bawah ini:'}
                    onChange={(e) => handleChange('pembuka', e.target.value)}
                />
            </div>

            {/* Part 3: Data Pegawai (Preview) */}
            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 border-dashed space-y-4">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <User size={16} className="text-slate-400" />
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Bagian 3: Identitas Pegawai</span>
                    </div>
                    {!employeeData && <span className="text-[9px] font-bold text-rose-500 uppercase">Belum Memilih Pegawai</span>}
                </div>
                {employeeData ? (
                    <div className="grid grid-cols-2 gap-y-3 text-[11px]">
                        <div><span className="text-slate-400 block">Nama</span> <span className="font-bold text-slate-700">{employeeData.nama_lengkap}</span></div>
                        <div><span className="text-slate-400 block">NIP</span> <span className="font-bold text-slate-700">{employeeData.nip}</span></div>
                        <div><span className="text-slate-400 block">Jabatan</span> <span className="font-bold text-slate-700">{employeeData.jabatan_nama}</span></div>
                        <div><span className="text-slate-400 block">Pangkat/Gol</span> <span className="font-bold text-slate-700">{employeeData.pangkat_golongan_nama}</span></div>
                    </div>
                ) : (
                    <p className="text-[10px] text-slate-400 italic">Pilih pegawai pada menu metadata di atas untuk mengisi bagian ini secara otomatis.</p>
                )}
            </div>

            {/* Part 4: Detail Cuti */}
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
                <div className="flex items-center gap-2 mb-2">
                    <Calendar size={16} className="text-purple-500" />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Bagian 4: Detail Permintaan Cuti</span>
                </div>
                
                <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-700 ml-1">Kalimat Pengantar Cuti</label>
                    <textarea 
                        className="input-modern w-full h-20 resize-none"
                        placeholder="Dengan ini mengajukan permintaan Cuti Tahunan..."
                        value={data.isi?.kalimat_pengantar || ''}
                        onChange={(e) => handleNestedChange('isi', 'kalimat_pengantar', e.target.value)}
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-700 ml-1">Durasi (Otomatis)</label>
                        <div className="relative">
                            <input 
                                type="text" 
                                readOnly
                                className="input-modern w-full pr-12 bg-slate-50 cursor-not-allowed font-bold text-purple-600 !h-[30px]"
                                value={calculateDuration(data.isi?.tgl_mulai, data.isi?.tgl_selesai) || 0}
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">HARI</span>
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-700 ml-1">Jenis Cuti</label>
                        <SearchableSelect
                            options={jenisCutiList.map(j => ({ id: j.id, label: j.jenis_cuti }))}
                            displayField="label"
                            value={data.isi?.jenis_cuti_id || ''}
                            customClassName="!h-[30px] !min-h-[30px] !py-0"
                            onChange={(val) => {
                                const selected = jenisCutiList.find(j => j.id === val);
                                const namaCuti = selected ? selected.jenis_cuti : 'Cuti Tahunan';
                                const kalimatBaru = `Dengan ini mengajukan permintaan ${namaCuti} untuk Tahun ${new Date().getFullYear()}`;
                                
                                onChange({
                                    ...data,
                                    isi: {
                                        ...data.isi,
                                        jenis_cuti_id: val,
                                        jenis_cuti_nama: namaCuti,
                                        kalimat_pengantar: kalimatBaru
                                    }
                                });
                            }}
                            label="Jenis Cuti"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-700 ml-1">Mulai Tanggal</label>
                        <input 
                            type="date" 
                            className="input-modern w-full !h-[30px]"
                            value={data.isi?.tgl_mulai || ''}
                            onChange={(e) => handleNestedChange('isi', 'tgl_mulai', e.target.value)}
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-700 ml-1">Sampai Tanggal</label>
                        <input 
                            type="date" 
                            className="input-modern w-full !h-[30px]"
                            value={data.isi?.tgl_selesai || ''}
                            onChange={(e) => handleNestedChange('isi', 'tgl_selesai', e.target.value)}
                        />
                    </div>
                </div>

                <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-700 ml-1">Alasan Cuti</label>
                    <input 
                        type="text" 
                        className="input-modern w-full"
                        placeholder="Contoh: kepentingan keluarga"
                        value={data.isi?.alasan || ''}
                        onChange={(e) => handleNestedChange('isi', 'alasan', e.target.value)}
                    />
                </div>
            </div>

            {/* Part 5: Alamat & Penutup */}
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                <div className="flex items-center gap-2 mb-2">
                    <MapPin size={16} className="text-purple-500" />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Bagian 5: Alamat & Penutup</span>
                </div>
                
                <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-700 ml-1">Alamat Selama Cuti</label>
                    <textarea 
                        className="input-modern w-full h-24 resize-none font-medium"
                        placeholder="Masukkan alamat lengkap..."
                        value={data.alamat_cuti || ''}
                        onChange={(e) => handleChange('alamat_cuti', e.target.value)}
                    />
                </div>

                <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-700 ml-1">Kalimat Penutup</label>
                    <textarea 
                        className="input-modern w-full h-20 resize-none text-[11px]"
                        value={data.penutup || 'Demikian permintaan ini saya buat untuk dapat dipertimbangkan sebagaimana mestinya.'}
                        onChange={(e) => handleChange('penutup', e.target.value)}
                    />
                </div>
            </div>
            {/* Part 6: Pejabat Penyetuju (Approval) */}
            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 border-dashed space-y-4">
                <div className="flex items-center gap-2 mb-2">
                    <User size={16} className="text-purple-500" />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Bagian 6: Pejabat Penyetuju (Approval)</span>
                </div>
                
                {(!employeeData) ? (
                    <p className="text-[10px] text-slate-400 italic">Pilih pegawai pada menu metadata terlebih dahulu untuk menentukan hierarki persetujuan.</p>
                ) : (
                    <div className="space-y-4">
                        {getEmployeeLevel(employeeData.jabatan_nama) >= 5 && (
                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between mb-1">
                                    <label className="text-[11px] font-bold text-slate-700 ml-1">Ketua Tim / Atasan Langsung</label>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Semua Bidang</span>
                                        <button 
                                            type="button"
                                            onClick={() => setShowAllKetuaTim(!showAllKetuaTim)}
                                            className={`w-8 h-4 rounded-full transition-all relative ${showAllKetuaTim ? 'bg-purple-600' : 'bg-slate-200'}`}
                                        >
                                            <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${showAllKetuaTim ? 'left-4' : 'left-0.5'}`} />
                                        </button>
                                    </div>
                                </div>
                                <SearchableSelect
                                    options={employees
                                        .filter(e => {
                                            const isRightLevel = getEmployeeLevel(e.jabatan_nama) === 4;
                                            const isSameBidang = showAllKetuaTim ? true : e.bidang_id === employeeData.bidang_id;
                                            return isRightLevel && isSameBidang;
                                        })
                                        .map(e => ({ id: e.id, label: `${e.nama_lengkap} - ${e.jabatan_nama}` }))}
                                    displayField="label"
                                    value={data.approvers?.ketua_tim?.id || ''}
                                    onChange={(val) => {
                                        const selected = employees.find(e => e.id === val);
                                        handleNestedChange('approvers', 'ketua_tim', selected || null);
                                    }}
                                    label="Ketua Tim"
                                />
                            </div>
                        )}

                        {getEmployeeLevel(employeeData.jabatan_nama) >= 4 && (
                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between mb-1">
                                    <label className="text-[11px] font-bold text-slate-700 ml-1">Mengetahui (Kepala Bidang/Bagian)</label>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Semua Bidang</span>
                                        <button 
                                            type="button"
                                            onClick={() => setShowAllKepalaBidang(!showAllKepalaBidang)}
                                            className={`w-8 h-4 rounded-full transition-all relative ${showAllKepalaBidang ? 'bg-purple-600' : 'bg-slate-200'}`}
                                        >
                                            <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${showAllKepalaBidang ? 'left-4' : 'left-0.5'}`} />
                                        </button>
                                    </div>
                                </div>
                                <SearchableSelect
                                    options={employees
                                        .filter(e => {
                                            const isRightLevel = getEmployeeLevel(e.jabatan_nama) === 3;
                                            const isSameBidang = showAllKepalaBidang ? true : e.bidang_id === employeeData.bidang_id;
                                            return isRightLevel && isSameBidang;
                                        })
                                        .map(e => ({ id: e.id, label: `${e.nama_lengkap} - ${e.jabatan_nama}` }))}
                                    displayField="label"
                                    value={data.approvers?.kepala_bidang?.id || ''}
                                    onChange={(val) => {
                                        const selected = employees.find(e => e.id === val);
                                        handleNestedChange('approvers', 'kepala_bidang', selected || null);
                                    }}
                                    label="Kepala Bidang"
                                />
                            </div>
                        )}

                        {getEmployeeLevel(employeeData.jabatan_nama) >= 2 && (
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-slate-700 ml-1">Sekretaris (Paraf)</label>
                                <SearchableSelect
                                    options={employees
                                        .filter(e => {
                                            const j = (e.jabatan_nama || '').toLowerCase();
                                            return j.includes('sekretaris');
                                        })
                                        .map(e => ({ id: e.id, label: `${e.nama_lengkap} - ${e.jabatan_nama}` }))}
                                    displayField="label"
                                    value={data.approvers?.sekretaris?.id || ''}
                                    onChange={(val) => {
                                        const selected = employees.find(e => e.id === val);
                                        handleNestedChange('approvers', 'sekretaris', selected || null);
                                    }}
                                    label="Sekretaris"
                                />
                            </div>
                        )}

                        {getEmployeeLevel(employeeData.jabatan_nama) >= 2 && (
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-slate-700 ml-1">Pejabat Berwenang (Kepala Badan/Instansi)</label>
                                <SearchableSelect
                                    options={employees
                                        .filter(e => getEmployeeLevel(e.jabatan_nama) <= 2)
                                        .map(e => ({ id: e.id, label: `${e.nama_lengkap} - ${e.jabatan_nama}` }))}
                                    displayField="label"
                                    value={data.approvers?.kepala_badan?.id || ''}
                                    onChange={(val) => {
                                        const selected = employees.find(e => e.id === val);
                                        handleNestedChange('approvers', 'kepala_badan', selected || null);
                                    }}
                                    label="Kepala Badan"
                                />
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default StructuredLeaveForm;
