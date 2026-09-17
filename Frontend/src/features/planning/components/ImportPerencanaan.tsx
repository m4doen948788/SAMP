import React, { useState } from 'react';
import { Upload, FileText, CheckCircle2, AlertCircle, Loader2, Download } from 'lucide-react';
import { api } from '@/src/services/api';

const ImportPerencanaan = () => {
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<{ type: 'success' | 'error' | null, message: string }>({ type: null, message: '' });

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setStatus({ type: null, message: '' });
        }
    };

    const handleUpload = async () => {
        if (!file) {
            setStatus({ type: 'error', message: 'Silakan pilih file terlebih dahulu' });
            return;
        }

        setLoading(true);
        setStatus({ type: null, message: '' });

        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await api.import.perencanaan(formData);
            if (res.success) {
                setStatus({ type: 'success', message: res.message || 'Data berhasil diimport!' });
                setFile(null);
                // Clear input file
                const fileInput = document.getElementById('file-upload') as HTMLInputElement;
                if (fileInput) fileInput.value = '';
            } else {
                setStatus({ type: 'error', message: res.message || 'Gagal mengimport data' });
            }
        } catch (error: any) {
            setStatus({ type: 'error', message: error.message || 'Terjadi kesalahan sistem' });
        } finally {
            setLoading(false);
        }
    };

    const downloadTemplate = () => {
        const headers = [
            'BIDANG URUSAN / BIDANG UNSUR', 
            'PROGRAM', 
            'KEGIATAN', 
            'SUB KEGIATAN', 
            'NOMENKLATUR URUSAN KABUPATEN/KOTA', 
            'KINERJA', 
            'INDIKATOR', 
            'SATUAN'
        ];
        const sampleData = [
            ['1.01', '', '', '', 'URUSAN PEMERINTAHAN BIDANG PENDIDIKAN', '', '', ''],
            ['1.01', '01', '', '', 'PROGRAM PENUNJANG URUSAN PEMERINTAHAN DAERAH', '', '', ''],
            ['1.01', '01', '2.01', '', 'Perencanaan Penganggaran dan Evaluasi Kinerja', '', '', ''],
            ['1.01', '01', '2.01', '01', 'Penyusunan Dokumen Perencanaan Perangkat Daerah', 'Jumlah Dokumen', 'Jumlah', 'Dokumen']
        ];
        
        let csvContent = "data:text/csv;charset=utf-8," 
            + headers.join(",") + "\n"
            + sampleData.map(e => e.join(",")).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "template_import_perencanaan.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="max-w-4xl mx-auto py-8 px-4">
            <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/60 border border-slate-100 overflow-hidden">
                <div className="p-8 border-b border-slate-50 flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-black text-slate-800 tracking-tight">Import Data Perencanaan</h1>
                        <p className="text-slate-500 text-sm mt-1 font-medium">Unggah file Excel (xlsx/csv) untuk mengimport Bidang Urusan, Program, Kegiatan, dan Sub-Kegiatan.</p>
                    </div>
                    <button 
                        onClick={downloadTemplate}
                        className="flex items-center gap-2 text-xs font-bold text-ppm-slate hover:bg-slate-50 px-4 py-2 rounded-xl border border-slate-200 transition-all"
                    >
                        <Download size={16} />
                        Template CSV
                    </button>
                </div>

                <div className="p-8">
                    <div className="mb-8">
                        <label className="block text-sm font-extrabold text-slate-700 mb-3 uppercase tracking-wider">Format Excel yang didukung:</label>
                        <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200/50 overflow-x-auto">
                            <table className="w-full text-[10px] text-left min-w-[800px]">
                                <thead>
                                    <tr className="text-slate-400 font-bold uppercase tracking-widest border-b border-slate-200">
                                        <th className="pb-2">BIDANG URUSAN</th>
                                        <th className="pb-2">PROGRAM</th>
                                        <th className="pb-2">KEGIATAN</th>
                                        <th className="pb-2">SUB KEGIATAN</th>
                                        <th className="pb-2">NOMENKLATUR</th>
                                        <th className="pb-2">KINERJA</th>
                                        <th className="pb-2">INDIKATOR</th>
                                        <th className="pb-2">SATUAN</th>
                                    </tr>
                                </thead>
                                <tbody className="text-slate-600 font-medium">
                                    <tr>
                                        <td className="py-2">1.01</td>
                                        <td className="py-2">-</td>
                                        <td className="py-2">-</td>
                                        <td className="py-2">-</td>
                                        <td className="py-2 italic">URUSAN PENDIDIKAN</td>
                                        <td className="py-2">-</td>
                                        <td className="py-2">-</td>
                                        <td className="py-2">-</td>
                                    </tr>
                                    <tr>
                                        <td className="py-2">1.01</td>
                                        <td className="py-2">01</td>
                                        <td className="py-2">-</td>
                                        <td className="py-2">-</td>
                                        <td className="py-2 italic">PROGRAM PENUNJANG...</td>
                                        <td className="py-2">-</td>
                                        <td className="py-2">-</td>
                                        <td className="py-2">-</td>
                                    </tr>
                                    <tr>
                                        <td className="py-2">1.01</td>
                                        <td className="py-2">01</td>
                                        <td className="py-2">2.01</td>
                                        <td className="py-2">01</td>
                                        <td className="py-2 italic">Penyusunan Dokumen...</td>
                                        <td className="py-2">Jumlah Dokumen</td>
                                        <td className="py-2">Jumlah</td>
                                        <td className="py-2">Dokumen</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div 
                        className={`relative border-2 border-dashed rounded-3xl p-12 transition-all duration-300 flex flex-col items-center justify-center text-center
                            ${file ? 'border-ppm-slate bg-indigo-50/20' : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'}
                        `}
                    >
                        <input 
                            type="file" 
                            id="file-upload"
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                            onChange={handleFileChange}
                            accept=".xlsx,.xls,.csv"
                        />
                        <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-4 transition-all duration-300
                            ${file ? 'bg-ppm-slate text-white scale-110 shadow-lg shadow-indigo-200' : 'bg-white text-slate-400 shadow-sm'}
                        `}>
                            {file ? <FileText size={36} strokeWidth={2.5} /> : <Upload size={36} strokeWidth={2.5} />}
                        </div>
                        {file ? (
                            <div>
                                <p className="text-slate-800 font-black text-lg">{file.name}</p>
                                <p className="text-slate-500 text-sm font-medium mt-1">{(file.size / 1024).toFixed(2)} KB</p>
                                <button 
                                    onClick={() => setFile(null)}
                                    className="text-rose-500 text-xs font-bold mt-3 hover:underline"
                                >
                                    Ganti File
                                </button>
                            </div>
                        ) : (
                            <div>
                                <p className="text-slate-800 font-extrabold text-lg">Pilih atau Seret File</p>
                                <p className="text-slate-400 text-sm font-medium mt-1">Format Excel (.xlsx) atau CSV diperbolehkan</p>
                            </div>
                        )}
                    </div>

                    {status.type && (
                        <div className={`mt-6 p-6 rounded-3xl flex items-start gap-5 animate-in fade-in slide-in-from-top-2 duration-300
                            ${status.type === 'success' ? 'bg-emerald-50 border border-emerald-100 text-emerald-800' : 'bg-rose-50 border border-rose-100 text-rose-800'}
                        `}>
                            <div className="shrink-0 mt-0.5">
                                {status.type === 'success' ? <CheckCircle2 size={28} /> : <AlertCircle size={28} />}
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-black uppercase tracking-wider mb-2">{status.type === 'success' ? 'Berhasil' : 'Kesalahan'}</p>
                                <p className="text-sm font-medium opacity-90 leading-relaxed">{status.message}</p>
                            </div>
                            <button onClick={() => setStatus({ type: null, message: '' })} className="shrink-0 opacity-50 hover:opacity-100 p-1">
                                <AlertCircle size={20} className="rotate-45" />
                            </button>
                        </div>
                    )}

                    <div className="mt-10 flex gap-4">
                        <button
                            onClick={handleUpload}
                            disabled={!file || loading}
                            className={`flex-1 h-16 rounded-2xl font-black text-lg flex items-center justify-center gap-3 transition-all
                                ${!file || loading 
                                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                                    : 'bg-ppm-slate text-white hover:bg-slate-800 hover:-translate-y-1 shadow-xl shadow-slate-200 active:translate-y-0'}
                            `}
                        >
                            {loading ? (
                                <>
                                    <Loader2 size={24} className="animate-spin" />
                                    <span>Sedang Memproses...</span>
                                </>
                            ) : (
                                <>
                                    <Upload size={24} strokeWidth={2.5} />
                                    <span>Mulai Import Data</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ImportPerencanaan;
