import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  CheckSquare, Square, X, Plus, Trash2, Calendar, 
  Flag, GripVertical, Check, RefreshCw, Sparkles, AlertCircle, Clock
} from 'lucide-react';
import { api } from '@/src/services/api';

export interface TodoItem {
  id: number;
  user_id: number;
  title: string;
  description?: string | null;
  is_completed: number | boolean;
  due_date?: string | null;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  urutan: number;
  created_at?: string;
  updated_at?: string;
}

export const DraggableTodoListWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState({ pending_total: 0, pending_today: 0, overdue_total: 0, completed_total: 0 });
  const [activeTab, setActiveTab] = useState<'ALL' | 'TODAY' | 'COMPLETED'>('ALL');
  
  // Quick Add State
  const [newTitle, setNewTitle] = useState('');
  const [newDueDate, setNewDueDate] = useState<string>('');
  const [newPriority, setNewPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Drag & Reorder item state
  const [draggedTodoId, setDraggedTodoId] = useState<number | null>(null);

  // Widget Button Position State
  const [position, setPosition] = useState<{ x: number; y: number }>(() => {
    try {
      const saved = localStorage.getItem('samp_todo_widget_pos');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
          return {
            x: Math.min(Math.max(12, parsed.x), window.innerWidth - 68),
            y: Math.min(Math.max(12, parsed.y), window.innerHeight - 68)
          };
        }
      }
    } catch (e) {
      // Fallback
    }
    // Posisi awal: di atas floating button Nayaxa (kanan bawah)
    return {
      x: typeof window !== 'undefined' ? Math.max(12, window.innerWidth - 76) : 500,
      y: typeof window !== 'undefined' ? Math.max(12, window.innerHeight - 150) : 500
    };
  });

  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<{ startX: number; startY: number; posX: number; posY: number }>({ startX: 0, startY: 0, posX: 0, posY: 0 });

  // Fetch todos & summary
  const fetchTodos = useCallback(async () => {
    try {
      setLoading(true);
      const [resList, resSummary] = await Promise.all([
        api.todo.getAll(),
        api.todo.getSummary()
      ]);

      if (resList && resList.success && Array.isArray(resList.data)) {
        setTodos(resList.data);
      }
      if (resSummary && resSummary.success && resSummary.data) {
        setSummary(resSummary.data);
      }
    } catch (err) {
      console.error('Failed to fetch todos:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTodos();
    // Update summary secara berkala setiap 2 menit
    const interval = setInterval(fetchTodos, 120000);
    return () => clearInterval(interval);
  }, [fetchTodos]);

  // Adjust position on window resize so widget doesn't fall off screen
  useEffect(() => {
    const handleResize = () => {
      setPosition(prev => ({
        x: Math.min(Math.max(12, prev.x), window.innerWidth - 68),
        y: Math.min(Math.max(12, prev.y), window.innerHeight - 68)
      }));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Pointer Drag Handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    isDraggingRef.current = false;
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      posX: position.x,
      posY: position.y
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (dragStartRef.current.startX === 0 && dragStartRef.current.startY === 0) return;
    const dx = e.clientX - dragStartRef.current.startX;
    const dy = e.clientY - dragStartRef.current.startY;

    if (Math.hypot(dx, dy) > 5) {
      isDraggingRef.current = true;
      const nextX = Math.min(Math.max(12, dragStartRef.current.posX + dx), window.innerWidth - 68);
      const nextY = Math.min(Math.max(12, dragStartRef.current.posY + dy), window.innerHeight - 68);
      setPosition({ x: nextX, y: nextY });
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch (err) {
      // Ignored
    }

    if (isDraggingRef.current) {
      // Save position
      localStorage.setItem('samp_todo_widget_pos', JSON.stringify(position));
    } else {
      // Click event
      setIsOpen(prev => !prev);
    }

    dragStartRef.current = { startX: 0, startY: 0, posX: 0, posY: 0 };
  };

  // Actions
  const handleCreateTodo = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newTitle.trim() || isSubmitting) return;

    try {
      setIsSubmitting(true);
      const res = await api.todo.create({
        title: newTitle.trim(),
        due_date: newDueDate || undefined,
        priority: newPriority
      });

      if (res && res.success && res.data) {
        setTodos(prev => [res.data, ...prev]);
        setNewTitle('');
        setNewDueDate('');
        setNewPriority('MEDIUM');
        fetchTodos();
      } else {
        alert(res?.message || res?.error || 'Gagal menambahkan tugas. Pastikan koneksi server aktif.');
      }
    } catch (err: any) {
      console.error('Failed to create todo:', err);
      alert(err?.message || 'Terjadi kesalahan saat menambahkan tugas');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggle = async (id: number) => {
    // Optimistic update
    setTodos(prev => prev.map(t => t.id === id ? { ...t, is_completed: t.is_completed ? 0 : 1 } : t));
    try {
      await api.todo.toggle(id);
      fetchTodos();
    } catch (err) {
      console.error('Failed to toggle todo:', err);
      fetchTodos();
    }
  };

  const handleDelete = async (id: number) => {
    setTodos(prev => prev.filter(t => t.id !== id));
    try {
      await api.todo.delete(id);
      fetchTodos();
    } catch (err) {
      console.error('Failed to delete todo:', err);
      fetchTodos();
    }
  };

  // Drag and drop reordering inside list
  const handleItemDragStart = (e: React.DragEvent, id: number) => {
    setDraggedTodoId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleItemDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleItemDrop = async (e: React.DragEvent, targetId: number) => {
    e.preventDefault();
    if (!draggedTodoId || draggedTodoId === targetId) return;

    const fromIdx = todos.findIndex(t => t.id === draggedTodoId);
    const toIdx = todos.findIndex(t => t.id === targetId);
    if (fromIdx < 0 || toIdx < 0) return;

    const updated = [...todos];
    const [moved] = updated.splice(fromIdx, 1);
    updated.splice(toIdx, 0, moved);

    setTodos(updated);
    setDraggedTodoId(null);

    try {
      const payload = updated.map((item, idx) => ({ id: item.id, urutan: idx + 1 }));
      await api.todo.reorder(payload);
    } catch (err) {
      console.error('Failed to save reorder:', err);
      fetchTodos();
    }
  };

  // Filtered List
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  const filteredTodos = useMemo(() => {
    return todos.filter(t => {
      const isDone = Number(t.is_completed) === 1;
      if (activeTab === 'COMPLETED') return isDone;
      if (activeTab === 'TODAY') {
        if (isDone) return false;
        return !t.due_date || t.due_date <= todayStr;
      }
      return true; // 'ALL'
    });
  }, [todos, activeTab, todayStr]);

  // Window Positioning: Keep popover nicely placed relative to button
  const popoverStyle = useMemo(() => {
    const isRightHalf = position.x > window.innerWidth / 2;
    const isBottomHalf = position.y > window.innerHeight / 2;

    const style: React.CSSProperties = {
      position: 'fixed',
      zIndex: 2450
    };

    if (isRightHalf) {
      style.right = `${window.innerWidth - position.x + 8}px`;
    } else {
      style.left = `${position.x + 64}px`;
    }

    if (isBottomHalf) {
      style.bottom = `${Math.max(12, window.innerHeight - position.y - 48)}px`;
    } else {
      style.top = `${Math.max(12, position.y)}px`;
    }

    return style;
  }, [position]);

  const priorityColor = (p: string) => {
    switch (p) {
      case 'HIGH': return 'text-rose-600 bg-rose-50 border-rose-200';
      case 'LOW': return 'text-slate-500 bg-slate-50 border-slate-200';
      default: return 'text-amber-600 bg-amber-50 border-amber-200';
    }
  };

  const priorityLabel = (p: string) => {
    switch (p) {
      case 'HIGH': return 'Tinggi';
      case 'LOW': return 'Rendah';
      default: return 'Sedang';
    }
  };

  return (
    <>
      {/* Floating Action Button (FAB) */}
      <button
        type="button"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        style={{
          position: 'fixed',
          left: `${position.x}px`,
          top: `${position.y}px`,
          zIndex: 2440,
          touchAction: 'none'
        }}
        title="Daftar Tugas / To-Do (Tahan & geser untuk memindahkan, klik untuk membuka)"
        className={`w-13 h-13 rounded-2xl flex items-center justify-center text-white shadow-xl transition-transform active:scale-95 cursor-grab active:cursor-grabbing select-none ${
          isOpen
            ? 'bg-emerald-700 shadow-emerald-900/30 ring-4 ring-emerald-400/30'
            : 'bg-gradient-to-tr from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 shadow-emerald-700/25 hover:shadow-2xl hover:scale-105'
        }`}
      >
        <CheckSquare size={24} strokeWidth={2.3} />

        {/* Counter Badge */}
        {summary.pending_total > 0 && (
          <span 
            className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center border-2 border-white shadow-md animate-pulse"
            title={`${summary.pending_total} tugas belum selesai`}
          >
            {summary.pending_total > 99 ? '99+' : summary.pending_total}
          </span>
        )}
      </button>

      {/* Popover To-Do Flyout Window */}
      {isOpen && (
        <div
          style={popoverStyle}
          className="w-[340px] sm:w-[370px] max-w-[calc(100vw-24px)] max-h-[520px] bg-white rounded-3xl shadow-2xl border border-slate-200/90 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        >
          {/* Header */}
          <div className="px-4 py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center text-white">
                <CheckSquare size={17} strokeWidth={2.5} />
              </div>
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider leading-none">Daftar Tugas Saya</h3>
                <span className="text-[10px] text-emerald-100 font-medium leading-none">
                  {summary.pending_total === 0 ? 'Semua tugas telah tuntas!' : `${summary.pending_total} tugas aktif`}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={fetchTodos}
                className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Segarkan daftar"
              >
                <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Tutup jendela"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Quick Add Form */}
          <form onSubmit={handleCreateTodo} className="p-3 bg-slate-50 border-b border-slate-200/80">
            <div className="flex items-center gap-2 bg-white rounded-xl border border-slate-200 p-1 pl-3 shadow-inner focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all">
              <input
                type="text"
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                placeholder="Tambah tugas baru... (Enter)"
                className="flex-1 text-xs font-medium text-slate-700 bg-transparent outline-none placeholder:text-slate-400"
              />
              <button
                type="submit"
                disabled={!newTitle.trim() || isSubmitting}
                className="p-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer shrink-0"
                title="Tambah tugas"
              >
                <Plus size={15} strokeWidth={2.5} />
              </button>
            </div>

            {/* Quick Meta Controls */}
            <div className="flex items-center justify-between gap-2 mt-2 px-1 text-[10px]">
              <div className="flex items-center gap-1.5 text-slate-500">
                <Calendar size={11} className="text-slate-400" />
                <input
                  type="date"
                  value={newDueDate}
                  onChange={e => setNewDueDate(e.target.value)}
                  className="bg-transparent text-[10px] text-slate-600 font-medium cursor-pointer outline-none"
                  title="Tenggat Waktu"
                />
              </div>

              <div className="flex items-center gap-1">
                <Flag size={11} className="text-slate-400" />
                <select
                  value={newPriority}
                  onChange={e => setNewPriority(e.target.value as any)}
                  className="bg-transparent text-[10px] text-slate-600 font-semibold cursor-pointer outline-none"
                  title="Prioritas Tugas"
                >
                  <option value="LOW">Rendah</option>
                  <option value="MEDIUM">Sedang</option>
                  <option value="HIGH">Tinggi</option>
                </select>
              </div>
            </div>
          </form>

          {/* Filter Tabs */}
          <div className="flex items-center justify-between px-3 pt-2.5 pb-1 border-b border-slate-100 bg-white text-[11px] font-bold">
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-xl">
              <button
                type="button"
                onClick={() => setActiveTab('ALL')}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold transition-all cursor-pointer ${
                  activeTab === 'ALL'
                    ? 'bg-white text-emerald-700 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Semua ({todos.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('TODAY')}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold transition-all cursor-pointer ${
                  activeTab === 'TODAY'
                    ? 'bg-white text-emerald-700 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Hari Ini ({summary.pending_today})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('COMPLETED')}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold transition-all cursor-pointer ${
                  activeTab === 'COMPLETED'
                    ? 'bg-white text-emerald-700 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Selesai ({summary.completed_total})
              </button>
            </div>

            {summary.overdue_total > 0 && activeTab !== 'COMPLETED' && (
              <span className="text-[9px] font-black text-rose-600 flex items-center gap-0.5" title={`${summary.overdue_total} tugas lewat tenggat waktu`}>
                <AlertCircle size={10} /> {summary.overdue_total} Terlewat
              </span>
            )}
          </div>

          {/* Task List */}
          <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5 custom-scrollbar-visible min-h-[160px] max-h-[300px]">
            {loading && todos.length === 0 ? (
              <div className="py-8 text-center text-slate-400 space-y-2">
                <RefreshCw size={18} className="animate-spin mx-auto text-emerald-500/60" />
                <p className="text-[11px] font-medium">Memuat tugas...</p>
              </div>
            ) : filteredTodos.length === 0 ? (
              <div className="py-10 text-center text-slate-400 space-y-2">
                <Sparkles size={24} className="mx-auto text-emerald-500/40" />
                <p className="text-xs font-bold text-slate-600">
                  {activeTab === 'COMPLETED'
                    ? 'Belum ada tugas yang diselesaikan'
                    : activeTab === 'TODAY'
                    ? 'Tidak ada tugas untuk hari ini'
                    : 'Belum ada catatan tugas'}
                </p>
                <p className="text-[10px] text-slate-400">
                  {activeTab === 'ALL' && 'Tulis tugas di atas untuk mulai mencatat!'}
                </p>
              </div>
            ) : (
              filteredTodos.map(todo => {
                const isCompleted = Number(todo.is_completed) === 1;
                const isOverdue = !isCompleted && todo.due_date && todo.due_date < todayStr;
                const isDueToday = !isCompleted && todo.due_date && todo.due_date === todayStr;

                return (
                  <div
                    key={todo.id}
                    draggable
                    onDragStart={e => handleItemDragStart(e, todo.id)}
                    onDragOver={handleItemDragOver}
                    onDrop={e => handleItemDrop(e, todo.id)}
                    className={`group/todo flex items-start gap-2 p-2 rounded-2xl border transition-all select-none ${
                      draggedTodoId === todo.id
                        ? 'opacity-40 bg-emerald-50 border-dashed border-emerald-300'
                        : isCompleted
                        ? 'bg-slate-50/70 border-slate-100 opacity-60'
                        : 'bg-white border-slate-100 hover:border-slate-200 hover:shadow-xs'
                    }`}
                  >
                    {/* Drag Handle */}
                    <div 
                      className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 mt-0.5 shrink-0" 
                      title="Geser posisi tugas"
                    >
                      <GripVertical size={13} />
                    </div>

                    {/* Checkbox */}
                    <button
                      type="button"
                      onClick={() => handleToggle(todo.id)}
                      className={`mt-0.5 shrink-0 transition-colors cursor-pointer ${
                        isCompleted ? 'text-emerald-600' : 'text-slate-300 hover:text-emerald-500'
                      }`}
                      title={isCompleted ? 'Tandai belum selesai' : 'Tandai selesai'}
                    >
                      {isCompleted ? <CheckSquare size={16} strokeWidth={2.5} /> : <Square size={16} />}
                    </button>

                    {/* Title & Metadata */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-semibold leading-tight break-words ${
                        isCompleted ? 'line-through text-slate-400' : 'text-slate-700'
                      }`}>
                        {todo.title}
                      </p>

                      <div className="flex flex-wrap items-center gap-1.5 mt-1.5 text-[9px] font-bold">
                        {/* Due Date Badge */}
                        {todo.due_date && (
                          <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md border ${
                            isCompleted
                              ? 'bg-slate-100 text-slate-400 border-slate-200'
                              : isOverdue
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : isDueToday
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-slate-50 text-slate-500 border-slate-200'
                          }`}>
                            <Clock size={9} />
                            {isDueToday ? 'Hari Ini' : isOverdue ? `Terlewat (${todo.due_date})` : todo.due_date}
                          </span>
                        )}

                        {/* Priority Badge */}
                        <span className={`px-1.5 py-0.5 rounded-md border text-[8px] font-black uppercase tracking-tight ${priorityColor(todo.priority)}`}>
                          {priorityLabel(todo.priority)}
                        </span>
                      </div>
                    </div>

                    {/* Delete Action */}
                    <button
                      type="button"
                      onClick={() => handleDelete(todo.id)}
                      className="opacity-0 group-hover/todo:opacity-100 p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer shrink-0"
                      title="Hapus tugas"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="px-3.5 py-2 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
            <span className="italic">💡 Tahan ikon bulat untuk menggeser posisi</span>
            <span className="font-extrabold text-slate-500">
              {summary.completed_total}/{todos.length} Selesai
            </span>
          </div>
        </div>
      )}
    </>
  );
};

export default DraggableTodoListWidget;
