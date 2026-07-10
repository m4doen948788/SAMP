import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  FileSpreadsheet,
  FileImage,
  FileIcon,
  CheckCircle2, 
  AlertCircle, 
  Search, 
  Calendar,
  Clock,
  Building2, 
  Eye, 
  LayoutDashboard,
  Info,
  Presentation
} from 'lucide-react';
import { api } from '@/src/services/api';
import { DocumentViewerModal } from '@/src/components/modals/DocumentViewerModal';

interface PublicDocumentRecord {
  pegawai_id: number;
  nama_lengkap: string;
  jabatan: string;
  doc_name: string | null;
  doc_path: string | null;
  updated_at: string | null;
}

export default function VerifySkpDocuments() {
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<PublicDocumentRecord[]>([]);
  const [bidangName, setBidangName] = useState<string>('');
  const [instansiName, setInstansiName] = useState<string>('Bapperida Kabupaten');
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // PDF Preview states
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewFileUrl, setPreviewFileUrl] = useState<string | null>(null);
  const [previewFileName, setPreviewFileName] = useState<string | null>(null);

  // Parse URL search params
  const params = new URLSearchParams(window.location.search);
  const year = params.get('tahun') ? Number(params.get('tahun')) : null;
  const bidangId = params.get('bidang_id') ? Number(params.get('bidang_id')) : null;
  const month = params.get('bulan') ? Number(params.get('bulan')) : null;
  const butirSkp = params.get('butir_skp') || '';

  const monthNamesId = [
    'JANUARI', 'FEBRUARI', 'MARET', 'APRIL', 'MEI', 'JUNI',
    'JULI', 'AGUSTUS', 'SEPTEMBER', 'OKTOBER', 'NOVEMBER', 'DESEMBER'
  ];

  useEffect(() => {
    const loadResources = async () => {
      if (!year || !bidangId || !month || !butirSkp) {
        setError('Parameter pencarian dokumen tidak lengkap atau tidak valid.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        // Fetch public documents list and bids list
        const [docsRes, bidangRes] = await Promise.all([
          api.skp.getPublicDocuments(year, bidangId, month, butirSkp),
          api.skp.getPublicBidang()
        ]);

        if (docsRes.success) {
          setRecords(docsRes.data || []);
        } else {
          setError(docsRes.message || 'Gagal memuat berkas pendukung SKP.');
        }

        if (bidangRes.success && bidangRes.data) {
          const matched = bidangRes.data.find((b: any) => Number(b.id) === bidangId);
          if (matched) {
            setBidangName(matched.nama_bidang || matched.singkatan || `Bidang ID ${bidangId}`);
            if (matched.nama_instansi) {
              setInstansiName(matched.nama_instansi);
            }
          } else {
            setBidangName(`Bidang ID ${bidangId}`);
          }
        }
      } catch (err: any) {
        console.error('Failed to load public documents:', err);
        setError(`Gagal memuat data dari server. (Error: ${err.message})`);
      } finally {
        setLoading(false);
      }
    };

    loadResources();
  }, [year, bidangId, month, butirSkp]);

  const handlePreview = (docPath: string | null, docName: string | null) => {
    if (!docPath) return;
    setPreviewFileUrl(docPath);
    setPreviewFileName(docName || 'Dokumen Pendukung SKP');
    setIsPreviewOpen(true);
  };

  const filteredRecords = records.filter(r => 
    r.nama_lengkap.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (r.jabatan && r.jabatan.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const formatUpdateDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('id-ID', { 
        day: '2-digit', 
        month: 'long', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }) + ' WIB';
    } catch {
      return dateStr;
    }
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return <FileIcon className="text-rose-500 shrink-0" size={15} />;
    if (['xlsx', 'xls', 'csv'].includes(ext || '')) return <FileSpreadsheet className="text-emerald-500 shrink-0" size={15} />;
    if (['docx', 'doc'].includes(ext || '')) return <FileText className="text-indigo-500 shrink-0" size={15} />;
    if (['pptx', 'ppt'].includes(ext || '')) return <Presentation className="text-orange-500 shrink-0" size={15} />;
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) return <FileImage className="text-blue-500 shrink-0" size={15} />;
    return <FileIcon className="text-slate-400 shrink-0" size={15} />;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 font-extrabold text-sm uppercase tracking-wider">Memuat Berkas Pendukung...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full text-center">
          <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-inner">
            <AlertCircle size={32} />
          </div>
          <h2 className="text-lg font-black text-slate-800 mb-2 uppercase tracking-wide">Terjadi Kesalahan</h2>
          <p className="text-slate-500 text-xs leading-relaxed mb-6 font-semibold">{error}</p>
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-[10px] text-left text-slate-400 font-extrabold flex items-start gap-2 mb-6">
            <Info size={14} className="shrink-0 text-slate-500 mt-0.5" />
            <span>Pastikan Anda menyalin tautan dari sistem dengan benar. Tautan harus berisi parameter tahun, bidang, bulan, dan butir SKP.</span>
          </div>
        </div>
      </div>
    );
  }

  const uniquePegawaiIds = Array.from(new Set(records.map(r => r.pegawai_id)));
  const totalCount = uniquePegawaiIds.length;
  const uploadedCount = uniquePegawaiIds.filter(id => 
    records.some(r => r.pegawai_id === id && r.doc_name !== null)
  ).length;

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Top Header Logo */}
        <div className="flex items-center justify-between select-none">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-600/30">
              <LayoutDashboard size={20} />
            </div>
            <div>
              <h1 className="text-sm font-black text-slate-800 uppercase tracking-widest leading-none">SKP</h1>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{instansiName}</span>
            </div>
          </div>
        </div>

        {/* SKP Item Details Card */}
        <div className="bg-white rounded-3xl border border-slate-200/60 p-6 sm:p-8 shadow-xl shadow-slate-100/50 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-2 h-full bg-indigo-600"></div>
          
          <div className="space-y-4">
            <div className="flex items-start gap-2.5">
              <div className="w-6 h-6 bg-slate-100 text-slate-600 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                <FileText size={14} />
              </div>
              <div>
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">Butir SKP / Sub-Kegiatan</span>
                <h2 className="text-base sm:text-lg font-black text-slate-800 leading-snug max-w-3xl whitespace-pre-line">
                  {butirSkp}
                </h2>
              </div>
            </div>

            {/* Meta Grid info */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-slate-100">
              <div>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                  <Calendar size={12} className="text-slate-500" /> Tahun
                </span>
                <span className="text-sm font-black text-slate-800">{year}</span>
              </div>
              
              <div>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                  <Clock size={12} className="text-slate-500" /> Bulan
                </span>
                <span className="text-sm font-black text-slate-800">
                  {month && monthNamesId[month - 1]}
                </span>
              </div>
              
              <div>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                  <Building2 size={12} className="text-slate-500" /> Bidang / Urusan
                </span>
                <span className="text-sm font-black text-slate-800 uppercase tracking-wide block break-words" title={bidangName}>
                  {bidangName}
                </span>
              </div>

              <div>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                  <CheckCircle2 size={12} className="text-slate-500" /> Status Unggahan
                </span>
                <span className="text-sm font-black text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-xl px-2.5 py-0.5 inline-block">
                  {uploadedCount} / {totalCount} Terkumpul
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Search & List Table Section */}
        <div className="bg-white rounded-3xl border border-slate-200/60 shadow-xl shadow-slate-100/50 overflow-hidden">
          
          {/* Header & Search Filter */}
          <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-50/20">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
              Daftar Unggahan Pegawai
            </h3>
            
            <div className="relative max-w-xs w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input
                type="text"
                placeholder="Cari nama atau jabatan..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-2xl outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/50 bg-white transition-all font-semibold"
              />
            </div>
          </div>

          {/* Table List container */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[9px] font-black text-slate-400 uppercase tracking-widest select-none">
                  <th className="py-3.5 px-6 w-12 text-center">No</th>
                  <th className="py-3.5 px-6 w-72">Nama Pegawai & Jabatan</th>
                  <th className="py-3.5 px-6">Daftar Berkas Pendukung SKP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {(() => {
                  interface GroupedRecord {
                    pegawai_id: number;
                    nama_lengkap: string;
                    jabatan: string;
                    docs: Array<{
                      doc_id: number | null;
                      doc_name: string | null;
                      doc_path: string | null;
                      updated_at: string | null;
                    }>;
                  }

                  const groupedRecords: GroupedRecord[] = [];
                  filteredRecords.forEach(row => {
                    let existing = groupedRecords.find(g => g.pegawai_id === row.pegawai_id);
                    if (!existing) {
                      existing = {
                        pegawai_id: row.pegawai_id,
                        nama_lengkap: row.nama_lengkap,
                        jabatan: row.jabatan,
                        docs: []
                      };
                      groupedRecords.push(existing);
                    }
                    if (row.doc_id || row.doc_name) {
                      if (!existing.docs.some(d => d.doc_id === row.doc_id)) {
                        existing.docs.push({
                          doc_id: row.doc_id,
                          doc_name: row.doc_name,
                          doc_path: row.doc_path,
                          updated_at: row.updated_at
                        });
                      }
                    }
                  });

                  if (groupedRecords.length === 0) {
                    return (
                      <tr>
                        <td colSpan={3} className="py-12 text-center text-slate-400 italic font-semibold">
                          Tidak ada data pegawai yang cocok dengan kata kunci pencarian.
                        </td>
                      </tr>
                    );
                  }

                  return groupedRecords.map((employee, empIdx) => {
                    const docCount = employee.docs.length;
                    return (
                      <tr key={`emp-${employee.pegawai_id}`} className="hover:bg-slate-50/40 transition-colors">
                        <td className="py-4 px-6 text-center text-slate-400 font-extrabold align-top pt-5">
                          {empIdx + 1}
                        </td>
                        <td className="py-4 px-6 align-top pt-5">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-extrabold text-slate-800">{employee.nama_lengkap}</span>
                            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">{employee.jabatan}</span>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          {docCount > 0 ? (
                            <div className="space-y-1.5 max-h-[180px] overflow-y-auto pr-1 custom-scrollbar">
                              {employee.docs.map((doc, docIdx) => (
                                <div key={doc.doc_id || docIdx} className="flex items-center justify-between gap-3 p-2 rounded-xl bg-indigo-50/40 border border-indigo-100/40 hover:bg-indigo-50 transition-all">
                                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                    {getFileIcon(doc.doc_name || '')}
                                    <div className="min-w-0 flex-1">
                                      <button
                                        onClick={() => handlePreview(doc.doc_path, doc.doc_name)}
                                        className="font-extrabold text-indigo-900 hover:underline truncate block text-[11px] text-left w-full"
                                        title={doc.doc_name || ''}
                                      >
                                        {doc.doc_name}
                                      </button>
                                      <span className="text-[9px] text-slate-400 font-bold block mt-0.5">
                                        diunggah: {formatUpdateDate(doc.updated_at)}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-100/60 select-none">
                                      Sudah
                                    </span>
                                    <button
                                      onClick={() => handlePreview(doc.doc_path, doc.doc_name)}
                                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-indigo-50 border border-slate-200 text-indigo-700 text-[9px] font-black uppercase tracking-wide rounded-lg shadow-sm active:scale-[0.98] transition-all cursor-pointer"
                                    >
                                      <Eye size={10} strokeWidth={2.5} />
                                      Lihat
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[9px] font-black uppercase tracking-wider border border-rose-100/60 bg-rose-50 text-rose-700 select-none">
                              <span className="w-1.5 h-1.5 bg-rose-500 rounded-full"></span>
                              Belum Upload Berkas
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer info */}
        <p className="text-center text-[10px] text-slate-400 font-extrabold uppercase tracking-widest select-none">
          Sistem Sasaran Kinerja Pegawai (SKP) © {new Date().getFullYear()} {instansiName}
        </p>

      </div>

      {/* PDF Document Preview Modal */}
      <DocumentViewerModal
        isOpen={isPreviewOpen}
        onClose={() => {
          setIsPreviewOpen(false);
          setPreviewFileUrl(null);
          setPreviewFileName(null);
        }}
        fileUrl={previewFileUrl}
        fileName={previewFileName}
      />
    </div>
  );
}
