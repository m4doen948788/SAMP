import React, { useState, useEffect } from 'react';
import { 
  FolderOpen, Search, X, Check, Eye, FileText, Calendar, User, 
  Tag, Loader2, Sparkles, AlertCircle, RefreshCw, Layers
} from 'lucide-react';
import { kksApi } from '../services/kksApi';
import { KksIndikator, KksPustakaItem } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  indicator: KksIndikator | null;
  tahunDokumen: number;
  onSelectDocument: (doc: KksPustakaItem) => Promise<void>;
  onPreview: (doc: { path: string; nama_file: string }) => void;
}

export const KksLibraryPickerModal: React.FC<Props> = ({
  isOpen,
  onClose,
  indicator,
  tahunDokumen,
  onSelectDocument,
  onPreview,
}) => {
  const [filter, setFilter] = useState<'kks' | 'all'>('kks');
  const [searchTerm, setSearchTerm] = useState('');
  const [docs, setDocs] = useState<KksPustakaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [submittingId, setSubmittingId] = useState<number | null>(null);

  // Helper format file size
  const formatSize = (bytes?: number) => {
    if (!bytes || bytes <= 0) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Helper format date
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  // Fetch documents from Perpustakaan SAMP
  const fetchLibraryDocs = async () => {
    setLoading(true);
    try {
      const res = await kksApi.getPustakaKks({
        search: searchTerm,
        filter: filter,
        page: page,
        limit: 15
      });
      if (res.success && res.data) {
        setDocs(res.data);
        if (res.pagination) {
          setPagination({
            total: res.pagination.total,
            totalPages: res.pagination.totalPages
          });
        }
      }
    } catch (err) {
      console.error('Error load pustaka KKS:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchLibraryDocs();
    }
  }, [isOpen, filter, page]);

  // Handle Search submit
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchLibraryDocs();
  };

  const handleSelect = async (doc: KksPustakaItem) => {
    setSubmittingId(doc.id);
    try {
      await onSelectDocument(doc);
      onClose();
    } finally {
      setSubmittingId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/80 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-start justify-between bg-gradient-to-r from-emerald-50/60 via-teal-50/40 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/20 shrink-0">
              <FolderOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                Pilih Berkas dari Perpustakaan SAMP
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Tahun Evaluasi {tahunDokumen}
                </span>
              </h3>
              <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                {indicator?.nomor_indikator} - {indicator?.nama_indikator}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Tabs & Search Bar */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            
            {/* Filter Toggle */}
            <div className="inline-flex p-1 rounded-xl bg-slate-200/70 text-xs font-semibold">
              <button
                type="button"
                onClick={() => { setFilter('kks'); setPage(1); }}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                  filter === 'kks'
                    ? 'bg-white text-emerald-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                Ruang Tematik KKS
              </button>
              <button
                type="button"
                onClick={() => { setFilter('all'); setPage(1); }}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                  filter === 'all'
                    ? 'bg-white text-emerald-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-slate-500" />
                Semua Dokumen Perpustakaan
              </button>
            </div>

            {/* Search Form */}
            <form onSubmit={handleSearchSubmit} className="relative flex-1 sm:max-w-xs">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari nama berkas / dokumen..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-8 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => { setSearchTerm(''); setPage(1); }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </form>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span>
              Menampilkan {docs.length} dari total {pagination.total} dokumen
              {filter === 'kks' && ' yang terhubung dengan Ruang Tematik KKS'}
            </span>
            <button
              onClick={fetchLibraryDocs}
              disabled={loading}
              className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-700 font-semibold"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
              Segarkan
            </button>
          </div>
        </div>

        {/* Documents List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {loading ? (
            <div className="py-16 text-center text-slate-400 space-y-2">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-emerald-600" />
              <p className="text-xs">Memuat daftar berkas dari perpustakaan...</p>
            </div>
          ) : docs.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <FolderOpen className="w-6 h-6" />
              </div>
              <div className="space-y-1 max-w-sm mx-auto">
                <p className="text-sm font-bold text-slate-700">Tidak ada berkas ditemukan</p>
                <p className="text-xs text-slate-500">
                  {filter === 'kks'
                    ? 'Belum ada dokumen yang tertagging Ruang Tematik KKS. Anda dapat memilih tab "Semua Dokumen Perpustakaan" atau unggah berkas baru.'
                    : 'Tidak ada dokumen perpustakaan yang cocok dengan kata kunci pencarian.'}
                </p>
              </div>
              {filter === 'kks' && (
                <button
                  onClick={() => { setFilter('all'); setPage(1); }}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-semibold transition-colors"
                >
                  Buka Semua Dokumen Perpustakaan
                </button>
              )}
            </div>
          ) : (
            docs.map((doc) => {
              const isKksTagged = Number(doc.is_kks) === 1 || doc.is_kks === true;
              return (
                <div
                  key={doc.id}
                  className="p-3.5 rounded-xl border border-slate-200/90 hover:border-emerald-400 bg-white hover:bg-emerald-50/10 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs group"
                >
                  {/* File Info */}
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="w-9 h-9 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center shrink-0 mt-0.5">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-slate-800 line-clamp-1 group-hover:text-emerald-700 transition-colors" title={doc.nama_file}>
                          {doc.nama_file}
                        </span>
                        {isKksTagged && (
                          <span className="px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-200 flex items-center gap-1">
                            <Sparkles className="w-2.5 h-2.5 text-emerald-600" />
                            KKS
                          </span>
                        )}
                        {doc.tematik_names && (
                          <span className="text-[10px] text-slate-500 font-medium truncate max-w-[200px]" title={doc.tematik_names}>
                            🏷️ {doc.tematik_names}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-[11px] text-slate-400 flex-wrap">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3 text-slate-400" />
                          {doc.uploader_nama || 'Sistem'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          {formatDate(doc.uploaded_at)}
                        </span>
                        <span>{formatSize(doc.ukuran)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={() => onPreview({ path: doc.path, nama_file: doc.nama_file })}
                      className="px-2.5 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:text-emerald-700 hover:border-emerald-300 hover:bg-white text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-2xs"
                      title="Pratinjau Berkas"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Pratinjau
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelect(doc)}
                      disabled={submittingId === doc.id}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-all flex items-center gap-1.5 shadow-sm shadow-emerald-500/20 disabled:opacity-50"
                    >
                      {submittingId === doc.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Check className="w-3.5 h-3.5" />
                      )}
                      Gunakan Berkas Ini
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer & Pagination */}
        {pagination.totalPages > 1 && (
          <div className="p-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-600">
            <span>Halaman {page} dari {pagination.totalPages}</span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white"
              >
                Sebelumnya
              </button>
              <button
                type="button"
                disabled={page >= pagination.totalPages}
                onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white"
              >
                Selanjutnya
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
