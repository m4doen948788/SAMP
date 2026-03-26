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
    <div className="bg-white p-4 shadow-sm border border-slate-200">
      <div className="flex items-center justify-center gap-2 mb-4">
        <h2 className="text-blue-700 font-bold text-sm tracking-widest uppercase">Data Makro Kabupaten Bogor</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* IPM */}
        <div className="border border-slate-200">
          <div className="flex items-center bg-ppm-green text-white px-2 py-1 gap-1">
            <span className="text-[10px] font-bold">IPM</span>
            <ChevronDown size={10} />
            <TableIcon size={10} className="ml-auto" />
          </div>
          <table className="w-full text-[10px]">
            <thead>
              <tr className="bg-ppm-light-green text-white">
                <th className="p-1 text-left border-r border-white/20">Th</th>
                <th className="p-1 text-left">BPS (Poin)</th>
              </tr>
            </thead>
            <tbody>
              {data.ipm.map((row, i) => (
                <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                  <td className="p-1 border-r border-slate-200">{row.year}</td>
                  <td className="p-1 font-bold text-right">{row.val}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Kemiskinan */}
        <div className="border border-slate-200">
          <div className="flex items-center bg-ppm-green text-white px-2 py-1 gap-1">
            <span className="text-[10px] font-bold">Kemiskinan</span>
            <ChevronDown size={10} />
            <TableIcon size={10} className="ml-auto" />
          </div>
          <table className="w-full text-[10px]">
            <thead>
              <tr className="bg-ppm-light-green text-white">
                <th className="p-1 text-left border-r border-white/20">Th</th>
                <th className="p-1 text-left border-r border-white/20">BPS (%)</th>
                <th className="p-1 text-left">Jumlah</th>
              </tr>
            </thead>
            <tbody>
              {data.kemiskinan.map((row, i) => (
                <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                  <td className="p-1 border-r border-slate-200">{row.year}</td>
                  <td className="p-1 border-r border-slate-200 font-bold text-right">{row.pct}</td>
                  <td className="p-1 font-bold text-right">{row.num}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Stunting */}
        <div className="border border-slate-200">
          <div className="flex items-center bg-ppm-green text-white px-2 py-1 gap-1">
            <span className="text-[10px] font-bold">Stunting</span>
            <ChevronDown size={10} />
            <TableIcon size={10} className="ml-auto" />
            <a href="#" className="text-[8px] underline ml-2">Lihat Target</a>
          </div>
          <table className="w-full text-[10px]">
            <thead>
              <tr className="bg-ppm-light-green text-white">
                <th className="p-1 text-left border-r border-white/20">Th</th>
                <th className="p-1 text-left border-r border-white/20">SKI (%)</th>
                <th className="p-1 text-left">EPPBGM (%)</th>
              </tr>
            </thead>
            <tbody>
              {data.stunting.map((row, i) => (
                <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                  <td className="p-1 border-r border-slate-200">{row.year}</td>
                  <td className="p-1 border-r border-slate-200 font-bold text-right">{row.ski}</td>
                  <td className="p-1 font-bold text-right">{row.eppbgm}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Penduduk */}
        <div className="border border-slate-200">
          <div className="flex items-center bg-ppm-green text-white px-2 py-1 gap-1">
            <span className="text-[10px] font-bold">Penduduk</span>
            <ChevronDown size={10} />
            <TableIcon size={10} className="ml-auto" />
            <a href="#" className="text-[8px] underline ml-2">Input Data Makro</a>
          </div>
          <table className="w-full text-[10px]">
            <thead>
              <tr className="bg-ppm-light-green text-white">
                <th className="p-1 text-left border-r border-white/20">Th</th>
                <th className="p-1 text-left border-r border-white/20">BPS (Jiwa)</th>
                <th className="p-1 text-left"># Disdukcapil</th>
              </tr>
            </thead>
            <tbody>
              {data.penduduk.map((row, i) => (
                <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                  <td className="p-1 border-r border-slate-200">{row.year}</td>
                  <td className="p-1 border-r border-slate-200 font-bold text-right">{row.bps}</td>
                  <td className="p-1 font-bold text-right">{row.disdukcapil}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const ChevronDown = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
);

export default MacroDataTable;
