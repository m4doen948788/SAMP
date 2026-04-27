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
import { calculateDuration } from '../utils/letterComposers';

interface StructuredLeaveFormProps {
    data: any;
    onChange: (newData: any) => void;
    employeeData: any;
}

const StructuredLeaveForm: React.FC<StructuredLeaveFormProps> = ({ data, onChange, employeeData }) => {
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
                    <Building2 size={16} className="text-indigo-500" />
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
                    <AlignLeft size={16} className="text-indigo-500" />
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
                    <Calendar size={16} className="text-indigo-500" />
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
                                className="input-modern w-full pr-12 bg-slate-50 cursor-not-allowed font-bold text-indigo-600"
                                value={calculateDuration(data.isi?.tgl_mulai, data.isi?.tgl_selesai) || 0}
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">HARI</span>
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-700 ml-1">Tahun Cuti</label>
                        <input 
                            type="number" 
                            className="input-modern w-full"
                            value={data.isi?.tahun || new Date().getFullYear()}
                            onChange={(e) => handleNestedChange('isi', 'tahun', e.target.value)}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-700 ml-1">Mulai Tanggal</label>
                        <input 
                            type="date" 
                            className="input-modern w-full"
                            value={data.isi?.tgl_mulai || ''}
                            onChange={(e) => handleNestedChange('isi', 'tgl_mulai', e.target.value)}
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-700 ml-1">Sampai Tanggal</label>
                        <input 
                            type="date" 
                            className="input-modern w-full"
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
                    <MapPin size={16} className="text-indigo-500" />
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
        </div>
    );
};

export default StructuredLeaveForm;
