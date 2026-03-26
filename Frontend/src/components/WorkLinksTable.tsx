import { ArrowRight, Link as LinkIcon, Calendar } from 'lucide-react';

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
    <div className="card-modern h-full flex flex-col group/card">
      <div className="flex items-center justify-between px-6 py-5 border-b border-slate-50 bg-white group-hover/card:bg-indigo-50/20 transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
            <LinkIcon size={20} />
          </div>
          <h2 className="text-sm font-extrabold text-slate-800 tracking-tight uppercase">Daftar Link Kerja & Zoom</h2>
        </div>
        <a href="#" className="text-[10px] font-bold bg-indigo-600 text-white px-4 py-2 rounded-xl hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-500/30 transition-all uppercase tracking-wider">Input Baru</a>
      </div>

      <div className="flex-1 overflow-x-auto p-6 pt-2">
        <div className="rounded-2xl border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] overflow-hidden bg-white">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="p-4 text-center w-12 text-slate-400 font-black uppercase tracking-tighter border-r border-slate-100/50">#</th>
                <th className="p-4 text-left w-28 border-r border-slate-100/50 text-slate-400 font-bold uppercase tracking-wider">Tanggal</th>
                <th className="p-4 text-left border-r border-slate-100/50 text-slate-400 font-bold uppercase tracking-wider">Link Kerja / Zoom</th>
                <th className="p-4 text-center w-28 text-slate-400 font-bold uppercase tracking-wider">Sumber</th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {links.map((link, idx) => (
                <tr key={idx} className="hover:bg-slate-50/80 transition-all border-b border-slate-50 group/row">
                  <td className="p-4 border-r border-slate-50 text-center text-slate-300 font-black tabular-nums">{idx + 1}</td>
                  <td className="p-4 border-r border-slate-50 text-slate-500 font-medium whitespace-nowrap tabular-nums flex items-center gap-2">
                    <Calendar size={12} className="text-slate-300" />
                    {link.date}
                  </td>
                  <td className="p-4 border-r border-slate-50">
                    <a href="#" className="flex items-center justify-between group/link">
                      <span className="font-bold text-slate-700 group-hover/link:text-indigo-600 transition-colors leading-snug">{link.title}</span>
                      <ArrowRight size={14} className="opacity-0 -translate-x-2 group-hover/link:opacity-100 group-hover/link:translate-x-0 transition-all duration-300 text-indigo-500" />
                    </a>
                  </td>
                  <td className="p-4 text-center">
                    <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-widest group-hover/row:bg-indigo-100 group-hover/row:text-indigo-600 transition-all">{link.source}</span>
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

export default WorkLinksTable;
