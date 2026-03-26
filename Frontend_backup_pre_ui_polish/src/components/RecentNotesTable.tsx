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
    <div className="bg-white shadow-sm border border-slate-200 h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <h2 className="text-[11px] font-bold uppercase tracking-wider">Notulensi & Nota Dinas Terbaru</h2>
          <a href="#" className="text-[9px] text-blue-600 underline">Lihat Semua</a>
        </div>
        <a href="#" className="text-[9px] text-blue-600 underline">Upload & Input Notulensi / Nota Dinas</a>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-[10px]">
          <thead>
            <tr className="bg-ppm-green text-white">
              <th className="p-2 text-left border-r border-white/10 w-24">
                <div className="flex items-center gap-1">
                  <TableIcon size={10} />
                  <Calendar size={10} />
                  <span>Tanggal</span>
                  <ChevronDown size={10} />
                </div>
              </th>
              <th className="p-2 text-left border-r border-white/10">
                <div className="flex items-center gap-1">
                  <span>Nama Kegiatan</span>
                  <ChevronDown size={10} />
                </div>
              </th>
              <th className="p-2 text-left border-r border-white/10 w-16">
                <div className="flex items-center gap-1">
                  <span>Notulensi</span>
                  <ChevronDown size={10} />
                </div>
              </th>
              <th className="p-2 text-left">
                <div className="flex items-center gap-1">
                  <span>Instansi Penyelenggara</span>
                  <ChevronDown size={10} />
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {notes.map((note, idx) => (
              <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                <td className="p-2 border-r border-slate-200">{note.date}</td>
                <td className="p-2 border-r border-slate-200">{note.title}</td>
                <td className="p-2 border-r border-slate-200 text-center">
                  {note.notes && <a href="#" className="text-blue-600 underline">{note.notes}</a>}
                </td>
                <td className="p-2 text-center">{note.instansi}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RecentNotesTable;
