import React from 'react';
import { Calendar, Table as TableIcon } from 'lucide-react';

const MacroDataTable = () => {
  const years = [2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017];

  const data = {
    ipm: [
      { year: 2025, val: '' },
      { year: 2024, val: '73,63' },
      { year: 2023, val: '73,02' },
      { year: 2022, val: '72,45' },
      { year: 2021, val: '71,83' },
      { year: 2020, val: '71,63' },
      { year: 2019, val: '70,65' },
      { year: 2018, val: '69,69' },
      { year: 2017, val: '69,13' },
    ],
    kemiskinan: [
      { year: 2025, pct: '6,26', num: '401.860' },
      { year: 2024, pct: '7,05', num: '446.790' },
      { year: 2023, pct: '7,27', num: '453.760' },
      { year: 2022, pct: '7,73', num: '474.740' },
      { year: 2021, pct: '8,13', num: '491.240' },
      { year: 2020, pct: '7,69', num: '465.670' },
      { year: 2019, pct: '6,66', num: '395.030' },
      { year: 2018, pct: '7,14', num: '415.020' },
      { year: 2017, pct: '8,57', num: '487.300' },
    ],
    stunting: [
      { year: 2025, ski: '', eppbgm: '' },
      { year: 2024, ski: '18,90', eppbgm: '1,08' },
      { year: 2023, ski: '27,60', eppbgm: '1,59' },
      { year: 2022, ski: '24,90', eppbgm: '4,78' },
      { year: 2021, ski: '28,6', eppbgm: '9,98' },
      { year: 2020, ski: '-', eppbgm: '12,79' },
      { year: 2019, ski: '34,96', eppbgm: '' },
    ],
    penduduk: [
      { year: 2025, bps: '5.948.925', disdukcapil: '' },
      { year: 2024, bps: '5.682.303', disdukcapil: '5.809.790' },
      { year: 2023, bps: '5.627.021', disdukcapil: '5.473.476' },
      { year: 2022, bps: '5.566.838', disdukcapil: '5.495.372' },
      { year: 2021, bps: '5.489.536', disdukcapil: '5.385.219' },
      { year: 2020, bps: '5.427.068', disdukcapil: '4.715.924' },
      { year: 2019, bps: '5.965.410', disdukcapil: '4.585.812' },
      { year: 2018, bps: '5.840.907', disdukcapil: '4.357.897' },
      { year: 2017, bps: '5.715.009', disdukcapil: '' },
    ]
  };

  return (
    <div className="card-modern h-full flex flex-col">
      <div className="px-6 py-5 border-b border-slate-50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
            <TableIcon size={20} />
          </div>
          <h2 className="text-sm font-extrabold text-slate-800 tracking-tight uppercase">Data Makro Kabupaten Bogor</h2>
        </div>
        <div className="flex gap-2">
          <button className="text-[10px] font-bold bg-slate-50 text-slate-500 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors uppercase tracking-wider">Download PDF</button>
        </div>
      </div>

      <div className="p-6 flex-1">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* IPM */}
          <div className="group/card bg-slate-50/30 rounded-2xl border border-slate-100 overflow-hidden hover:border-indigo-100 hover:shadow-lg hover:shadow-indigo-500/5 transition-all duration-300">
            <div className="flex items-center bg-white px-4 py-3 border-b border-slate-100 gap-2 group-hover/card:bg-indigo-50/30 transition-colors">
              <span className="text-[11px] font-extrabold text-slate-700 uppercase tracking-tight">IPM</span>
              <ChevronDown size={12} className="text-slate-400" />
              <div className="ml-auto w-6 h-6 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 group-hover/card:bg-white group-hover/card:text-indigo-400 transition-all">
                <TableIcon size={12} />
              </div>
            </div>
            <div className="p-1">
              <table className="w-full text-[10px]">
                <thead>
                  <tr className="text-slate-400 font-bold uppercase tracking-wider">
                    <th className="p-2 text-left">Tahun</th>
                    <th className="p-2 text-right">BPS (Poin)</th>
                  </tr>
                </thead>
                <tbody className="bg-transparent">
                  {data.ipm.map((row, i) => (
                    <tr key={i} className="hover:bg-white transition-colors group/row">
                      <td className="p-2 text-slate-500 font-medium border-t border-slate-100/50">{row.year}</td>
                      <td className="p-2 font-black text-right text-slate-700 border-t border-slate-100/50 tabular-nums">{row.val || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Kemiskinan */}
          <div className="group/card bg-slate-50/30 rounded-2xl border border-slate-100 overflow-hidden hover:border-indigo-100 hover:shadow-lg hover:shadow-indigo-500/5 transition-all duration-300">
            <div className="flex items-center bg-white px-4 py-3 border-b border-slate-100 gap-2 group-hover/card:bg-indigo-50/30 transition-colors">
              <span className="text-[11px] font-extrabold text-slate-700 uppercase tracking-tight">Kemiskinan</span>
              <ChevronDown size={12} className="text-slate-400" />
              <div className="ml-auto w-6 h-6 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 group-hover/card:bg-white group-hover/card:text-indigo-400 transition-all">
                <TableIcon size={12} />
              </div>
            </div>
            <div className="p-1">
              <table className="w-full text-[10px]">
                <thead>
                  <tr className="text-slate-400 font-bold uppercase tracking-wider">
                    <th className="p-2 text-left">Th</th>
                    <th className="p-2 text-right">BPS (%)</th>
                    <th className="p-2 text-right">Jumlah</th>
                  </tr>
                </thead>
                <tbody className="bg-transparent">
                  {data.kemiskinan.map((row, i) => (
                    <tr key={i} className="hover:bg-white transition-colors group/row">
                      <td className="p-2 text-slate-500 font-medium border-t border-slate-100/50">{row.year}</td>
                      <td className="p-2 font-black text-right text-slate-700 border-t border-slate-100/50 tabular-nums">{row.pct}</td>
                      <td className="p-2 font-black text-right text-indigo-600 border-t border-slate-100/50 tabular-nums">{row.num}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Stunting */}
          <div className="group/card bg-slate-50/30 rounded-2xl border border-slate-100 overflow-hidden hover:border-indigo-100 hover:shadow-lg hover:shadow-indigo-500/5 transition-all duration-300">
            <div className="flex items-center bg-white px-4 py-3 border-b border-slate-100 gap-2 group-hover/card:bg-indigo-50/30 transition-colors">
              <span className="text-[11px] font-extrabold text-slate-700 uppercase tracking-tight">Stunting</span>
              <ChevronDown size={12} className="text-slate-400" />
              <a href="#" className="text-[9px] font-bold text-indigo-500 underline ml-2 opacity-0 group-hover/card:opacity-100 transition-opacity">Target</a>
              <div className="ml-auto w-6 h-6 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 group-hover/card:bg-white group-hover/card:text-indigo-400 transition-all">
                <TableIcon size={12} />
              </div>
            </div>
            <div className="p-1">
              <table className="w-full text-[10px]">
                <thead>
                  <tr className="text-slate-400 font-bold uppercase tracking-wider">
                    <th className="p-2 text-left">Th</th>
                    <th className="p-2 text-right">SKI (%)</th>
                    <th className="p-2 text-right">EPP</th>
                  </tr>
                </thead>
                <tbody className="bg-transparent">
                  {data.stunting.map((row, i) => (
                    <tr key={i} className="hover:bg-white transition-colors group/row">
                      <td className="p-2 text-slate-500 font-medium border-t border-slate-100/50">{row.year}</td>
                      <td className="p-2 font-black text-right text-slate-700 border-t border-slate-100/50 tabular-nums">{row.ski || '-'}</td>
                      <td className="p-2 font-black text-right text-rose-500 border-t border-slate-100/50 tabular-nums">{row.eppbgm || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Penduduk */}
          <div className="group/card bg-slate-50/30 rounded-2xl border border-slate-100 overflow-hidden hover:border-indigo-100 hover:shadow-lg hover:shadow-indigo-500/5 transition-all duration-300">
            <div className="flex items-center bg-white px-4 py-3 border-b border-slate-100 gap-2 group-hover/card:bg-indigo-50/30 transition-colors">
              <span className="text-[11px] font-extrabold text-slate-700 uppercase tracking-tight">Penduduk</span>
              <ChevronDown size={12} className="text-slate-400" />
              <a href="#" className="text-[9px] font-bold text-indigo-500 underline ml-2 opacity-0 group-hover/card:opacity-100 transition-opacity">Input</a>
              <div className="ml-auto w-6 h-6 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 group-hover/card:bg-white group-hover/card:text-indigo-400 transition-all">
                <TableIcon size={12} />
              </div>
            </div>
            <div className="p-1">
              <table className="w-full text-[10px]">
                <thead>
                  <tr className="text-slate-400 font-bold uppercase tracking-wider">
                    <th className="p-2 text-left">Th</th>
                    <th className="p-2 text-right">BPS (Jiwa)</th>
                    <th className="p-2 text-right">Disduk</th>
                  </tr>
                </thead>
                <tbody className="bg-transparent">
                  {data.penduduk.map((row, i) => (
                    <tr key={i} className="hover:bg-white transition-colors group/row">
                      <td className="p-2 text-slate-500 font-medium border-t border-slate-100/50">{row.year}</td>
                      <td className="p-2 font-black text-right text-slate-700 border-t border-slate-100/50 tabular-nums">{row.bps}</td>
                      <td className="p-2 font-black text-right text-emerald-600 border-t border-slate-100/50 tabular-nums">{row.disdukcapil || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ChevronDown = ({ size, className }: { size: number, className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="m6 9 6 6 6-6" /></svg>
);

export default MacroDataTable;
