import React from 'react';
import { Table as TableIcon, Calendar, ChevronDown } from 'lucide-react';

const RecentNotesTable = () => {
  const notes = [
    { date: '12 Februari 2026', title: 'Rapat Permohonan Narasumber pada Kegiatan Musrenbang Perempuan, Anak dan Disabilitas', notes: '', instansi: 'DP3AP2KB' },
    { date: '10 Februari 2026', title: 'Permohonan Musrenbang Perempuan, Anak dan Disabilitas Tingkat Kabupaten Bogor Tahun 2026', notes: '', instansi: 'DP3AP2KB' },
    { date: '10 Februari 2026', title: 'Rapat Persiapan Evaluasi Kabupaten Layak Anak (KLA)', notes: 'Lihat', instansi: 'Sekretariat Daerah' },
    { date: '09 Februari 2026', title: 'Undangan Sosialisasi dan Penyegaran Pelaksanaan Studi EHRA', notes: '', instansi: 'Kemenkes' },
    { date: '06 Februari 2026', title: 'Opening Ceremony Konferensi Cabang (Konfercab) ke-LIX HMI Cabang Bogor dan Peringatan Dies Natalis HMI yang ke-79', notes: '', instansi: 'Lain-lain' },
    { date: '04 Februari 2026', title: 'Monitoring dan Evaluasi Bangunan Sekolah', notes: '', instansi: 'Lain-lain' },
    { date: '03 Februari 2026', title: 'Rapat Pembahasan Rancangan Perbup Penyelenggaraan UHC dan Bantuan Pembiayaan Pelayanan Kesehatan di Luar Cakupan JKN', notes: 'Lihat', instansi: 'Sekretariat Daerah' },
    { date: '03 Februari 2026', title: 'Penginputan dan perbaikan data pada aplikasi web Aksi Konvergensi Pencegahan dan Percepatan Penurunan Stunting', notes: 'Lihat', instansi: 'Bapperida' },
    { date: '03 Februari 2026', title: 'Pengumpulan bahan dan kajian dalam upaya melakukan pendalaman, penajaman dan perluasan materi konsep terhadap penyusunan Peraturan Bupati', notes: '', instansi: 'Sekretariat Daerah' },
  ];

  return (
    <div className="card-modern h-full flex flex-col">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-50">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-extrabold text-slate-800 tracking-tight">Notulensi & Nota Dinas Terbaru</h2>
          <span className="bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-md text-[10px] font-bold">TERBARU</span>
        </div>
        <div className="flex gap-3">
          <a href="#" className="text-xs text-indigo-600 font-semibold hover:text-indigo-700 transition-colors">Lihat Semua</a>
          <span className="text-slate-300">|</span>
          <a href="#" className="text-xs text-indigo-600 font-semibold hover:text-indigo-700 transition-colors">Upload & Input</a>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto p-6 pt-2">
        <div className="rounded-2xl border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] overflow-hidden bg-white">
          <table className="w-full text-xs">
            <thead>
              <tr>
                <th className="table-header p-3 text-left w-24 rounded-tl-xl border-r border-slate-100/50">
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <Calendar size={12} className="text-slate-400" />
                    <span>Tanggal</span>
                  </div>
                </th>
                <th className="table-header p-3 text-left border-r border-slate-100/50">
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <span>Nama Kegiatan</span>
                  </div>
                </th>
                <th className="table-header p-3 text-center border-r border-slate-100/50 w-20">
                  <div className="flex items-center justify-center gap-1.5 text-slate-500">
                    <span>File</span>
                  </div>
                </th>
                <th className="table-header p-3 text-left rounded-tr-xl">
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <span>Instansi</span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {notes.map((note, idx) => (
                <tr key={idx} className="hover:bg-slate-50/80 transition-colors border-b border-slate-50 group/row">
                  <td className="p-4 border-r border-slate-50 text-slate-500 font-medium whitespace-nowrap tabular-nums">{note.date}</td>
                  <td className="p-4 border-r border-slate-50 font-bold text-slate-700 leading-relaxed group-hover/row:text-indigo-600 transition-colors">{note.title}</td>
                  <td className="p-4 border-r border-slate-50 text-center">
                    {note.notes ? (
                      <a href="#" className="inline-flex items-center justify-center bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white font-bold px-3 py-1.5 rounded-lg transition-all duration-300 text-[10px] uppercase tracking-wider">Lihat</a>
                    ) : (
                      <span className="text-slate-200">-</span>
                    )}
                  </td>
                  <td className="p-4">
                    <span className="px-2.5 py-1 rounded-full bg-slate-50 text-slate-500 text-[10px] font-black uppercase tracking-tighter group-hover/row:bg-indigo-50 group-hover/row:text-indigo-500 transition-all">{note.instansi}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default RecentNotesTable;
