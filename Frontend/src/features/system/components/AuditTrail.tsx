import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  ChevronLeft, 
  ChevronRight, 
  Eye, 
  Calendar,
  User,
  Activity,
  Database,
  ArrowRight
} from 'lucide-react';
import { api } from '@/src/services/api';

interface AuditLog {
  id: number;
  user_id: number;
  username: string;
  user_nama: string;
  action: string;
  table_name: string;
  record_id: string;
  old_values: any;
  new_values: any;
  ip_address: string;
  user_agent: string;
  created_at: string;
}

export default function AuditTrail() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, total_pages: 1, total: 0 });
  const [filters, setFilters] = useState({
    search: '',
    action: '',
    table_name: '',
    start_date: '',
    end_date: '',
    page: 1
  });

  const [actions, setActions] = useState<string[]>([]);
  const [tables, setTables] = useState<string[]>([]);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  useEffect(() => {
    loadLogs();
  }, [filters.page, filters.action, filters.table_name, filters.start_date, filters.end_date]);

  useEffect(() => {
    api.audit.getActions().then(res => res.success && setActions(res.data));
    api.audit.getTables().then(res => res.success && setTables(res.data));
  }, []);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const res = await api.audit.getAll(filters);
      if (res.success) {
        setLogs(res.data);
        setPagination(res.pagination);
      }
    } catch (error) {
      console.error('Failed to load logs', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setFilters(prev => ({ ...prev, page: 1 }));
    loadLogs();
  };

  const renderJsonDiff = (oldVal: any, newVal: any) => {
    // If it's just a simple create/delete
    if (!oldVal && newVal) return <div className="text-green-600 font-medium">Record Created</div>;
    if (oldVal && !newVal) return <div className="text-red-600 font-medium">Record Deleted</div>;

    // Compare keys if both exist
    const keys = Array.from(new Set([...Object.keys(oldVal || {}), ...Object.keys(newVal || {})]));
    
    return (
      <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
        {keys.map(key => {
          const o = oldVal[key];
          const n = newVal[key];
          if (JSON.stringify(o) === JSON.stringify(n)) return null;

          return (
            <div key={key} className="p-3 bg-slate-50 rounded-lg border border-slate-100">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{key}</div>
              <div className="grid grid-cols-2 gap-4 items-center">
                <div className="text-xs text-red-500 line-through break-all">{typeof o === 'object' ? JSON.stringify(o) : String(o || '-')}</div>
                <div className="flex items-center gap-2">
                  <ArrowRight size={12} className="text-slate-300" />
                  <div className="text-xs text-green-600 font-bold break-all">{typeof n === 'object' ? JSON.stringify(n) : String(n || '-')}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Audit Trail</h1>
          <p className="text-sm text-slate-500 font-medium">Rekaman jejak aktivitas dan perubahan data sistem.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="bg-white p-1 rounded-xl shadow-sm border border-slate-100 flex items-center gap-2">
            <div className="px-3 py-1.5 bg-ppm-slate/5 rounded-lg">
              <span className="text-[10px] font-bold text-ppm-slate uppercase">Total Log</span>
              <div className="text-lg font-black text-slate-800 leading-none">{pagination.total.toLocaleString()}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="card-modern p-4">
        <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Cari aksi, tabel, user..."
              className="input-modern pl-10 w-full"
              value={filters.search}
              onChange={e => setFilters(prev => ({ ...prev, search: e.target.value }))}
            />
          </div>

          <div className="relative">
            <Activity className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <select
              className="input-modern pl-10 w-full appearance-none"
              value={filters.action}
              onChange={e => setFilters(prev => ({ ...prev, action: e.target.value, page: 1 }))}
            >
              <option value="">Semua Aksi</option>
              {actions.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>

          <div className="relative">
            <Database className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <select
              className="input-modern pl-10 w-full appearance-none"
              value={filters.table_name}
              onChange={e => setFilters(prev => ({ ...prev, table_name: e.target.value, page: 1 }))}
            >
              <option value="">Semua Tabel</option>
              {tables.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="date"
              className="input-modern pl-10 w-full"
              value={filters.start_date}
              onChange={e => setFilters(prev => ({ ...prev, start_date: e.target.value, page: 1 }))}
            />
          </div>

          <button
            type="submit"
            className="btn-primary flex items-center justify-center gap-2"
          >
            <Filter size={18} />
            Filter Data
          </button>
        </form>
      </div>

      {/* Main Table */}
      <div className="card-modern overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Waktu</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Pengguna</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Aksi</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Objek</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-10 h-10 border-4 border-ppm-slate border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-sm font-bold text-slate-400">Memuat data audit...</span>
                    </div>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Activity size={48} className="text-slate-100" />
                      <span className="text-sm font-bold text-slate-400">Tidak ada log aktivitas ditemukan.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="text-xs font-black text-slate-700">
                        {new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(log.created_at))}
                      </div>
                      <div className="text-[10px] font-bold text-slate-400">
                        {new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(new Date(log.created_at))}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-ppm-slate/10 flex items-center justify-center text-ppm-slate shrink-0">
                          <User size={16} />
                        </div>
                        <div>
                          <div className="text-xs font-black text-slate-800">{log.user_nama || 'System'}</div>
                          <div className="text-[10px] font-bold text-slate-400">@{log.username || 'system'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-wider
                        ${log.action.includes('CREATE') ? 'bg-green-50 text-green-600' : 
                          log.action.includes('DELETE') ? 'bg-red-50 text-red-600' : 
                          log.action.includes('UPDATE') ? 'bg-amber-50 text-amber-600' : 
                          'bg-blue-50 text-blue-600'}
                      `}>
                        {log.action.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs font-bold text-slate-700">{log.table_name || '-'}</div>
                      <div className="text-[10px] font-medium text-slate-400">ID: {log.record_id || '-'}</div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button 
                        onClick={() => setSelectedLog(log)}
                        className="p-2 rounded-lg text-slate-400 hover:text-ppm-slate hover:bg-ppm-slate/5 transition-all active:scale-90"
                      >
                        <Eye size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && pagination.total_pages > 1 && (
          <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Halaman {pagination.page} dari {pagination.total_pages}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setFilters(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                disabled={filters.page === 1}
                className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors shadow-sm"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={() => setFilters(prev => ({ ...prev, page: Math.min(pagination.total_pages, prev.page + 1) }))}
                disabled={filters.page === pagination.total_pages}
                className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors shadow-sm"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setSelectedLog(null)} />
          <div className="relative bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black text-slate-800 tracking-tight">Detail Log Aktivitas</h3>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">{selectedLog.action}</p>
              </div>
              <button 
                onClick={() => setSelectedLog(null)}
                className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400"
              >
                <ChevronRight className="rotate-90" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Konteks User</div>
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="text-xs font-black text-slate-700">{selectedLog.user_nama}</div>
                    <div className="text-[10px] font-medium text-slate-500">@{selectedLog.username}</div>
                    <div className="mt-2 flex items-center gap-2 text-[10px] font-bold text-slate-400">
                      <span>IP: {selectedLog.ip_address}</span>
                    </div>
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Target Objek</div>
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="text-xs font-black text-slate-700">{selectedLog.table_name}</div>
                    <div className="text-[10px] font-medium text-slate-500">Record ID: {selectedLog.record_id}</div>
                    <div className="mt-2 text-[10px] font-bold text-slate-400">
                      {new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(new Date(selectedLog.created_at))}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Perubahan Data (Before vs After)</div>
                <div className="bg-white rounded-2xl border border-slate-100 p-4">
                  {renderJsonDiff(selectedLog.old_values, selectedLog.new_values)}
                </div>
              </div>

              <div className="p-3 bg-blue-50 rounded-2xl border border-blue-100/50">
                <div className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">User Agent</div>
                <div className="text-[10px] font-medium text-blue-600 line-clamp-2 leading-relaxed">
                  {selectedLog.user_agent}
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 text-center">
              <button 
                onClick={() => setSelectedLog(null)}
                className="btn-primary w-full max-w-[200px]"
              >
                Tutup Detail
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
