import React from 'react';
import { Table as TableIcon, Calendar, ChevronDown } from 'lucide-react';

const WorkLinksTable = () => {
  const links = [
    { date: '20 Februari 2026', title: 'Aplikasi Profiling Kemiskinan', source: 'PPM' },
    { date: '09 Februari 2026', title: 'Rekap Musrenbang Perencanaan 2027', source: 'PPM' },
    { date: '09 Februari 2026', title: 'Bahan Musrenbang Perencanaan 2027', source: 'Rendalev' },
    { date: '23 Desember 2025', title: 'Link Bahan Desk Lorin', source: 'Rendalev' },
    { date: '02 Desember 2025', title: 'SIPD Renstra', source: 'Kemendagri' },
    { date: '02 Desember 2025', title: 'Link Dokumen Perencanaan Terbaru', source: 'Rendalev' },
    { date: '12 November 2025', title: 'Link UPT PM (Program Target UPT 2025-2029)', source: 'PPM' },
    { date: '15 September 2025', title: 'OPPKPKE 2025', source: 'Kemendagri' },
  ];

  return (
    <div className="bg-white shadow-sm border border-slate-200">
      <div className="flex items-center justify-center px-3 py-2 border-b border-slate-100">
        <a href="#" className="text-[9px] text-blue-600 underline uppercase font-bold">Input dan Lihat Semua Link Kerja / Zoom</a>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-[10px]">
          <thead>
            <tr className="bg-ppm-green text-white">
              <th className="p-1.5 text-left border-r border-white/10 w-8">
                <div className="flex items-center gap-1">
                  <TableIcon size={10} />
                  <Calendar size={10} />
                </div>
              </th>
              <th className="p-1.5 text-left border-r border-white/10 w-24">
                <div className="flex items-center gap-1">
                  <span>TGL LINK</span>
                  <ChevronDown size={10} />
                </div>
              </th>
              <th className="p-1.5 text-left border-r border-white/10">
                <div className="flex items-center gap-1">
                  <span>LINK KERJA SEMENTARA</span>
                  <ChevronDown size={10} />
                </div>
              </th>
              <th className="p-1.5 text-left w-24">
                <div className="flex items-center gap-1">
                  <span>SUMBER</span>
                  <ChevronDown size={10} />
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {links.map((link, idx) => (
              <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                <td className="p-1.5 border-r border-slate-200 text-center">{idx + 1}</td>
                <td className="p-1.5 border-r border-slate-200">{link.date}</td>
                <td className="p-1.5 border-r border-slate-200">
                  <a href="#" className="text-blue-600 underline">{link.title}</a>
                </td>
                <td className="p-1.5 text-center">{link.source}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default WorkLinksTable;
