import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  CheckSquare, Square, X, Plus, Trash2, Calendar, 
  Flag, GripVertical, Check, RefreshCw, Sparkles, AlertCircle, Clock,
  Pencil, CornerDownRight, CornerUpLeft, ChevronRight, ChevronDown
} from 'lucide-react';
import { api } from '../../services/api';

export interface TodoItem {
  id: number;
  user_id: number;
  parent_id?: number | null;
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
  
  // Collapse/Expand state for parent items (stores parent item IDs that are collapsed)
  const [collapsedParentIds, setCollapsedParentIds] = useState<Set<number>>(new Set());

  // Quick Add State
  const [newTitle, setNewTitle] = useState('');
  const [newDueDate, setNewDueDate] = useState<string>('');
  const [newPriority, setNewPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit Item State
  const [editingTodoId, setEditingTodoId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [editPriority, setEditPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM');
  const [isEditingSaving, setIsEditingSaving] = useState(false);

  // Drag item state
  const [draggedTodoId, setDraggedTodoId] = useState<number | null>(null);
  const dragStartXRef = useRef<number>(0);

  // Container DOM ref for direct manipulation (Zero React re-render during dragging/resizing)
  const popupRef = useRef<HTMLDivElement>(null);

  // Window Dimension State (Persistent Resizable)
  const [size, setSize] = useState<{ width: number; height: number }>(() => {
    try {
      const saved = localStorage.getItem('samp_todo_popup_size');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.width === 'number' && typeof parsed.height === 'number') {
          return {
            width: Math.min(Math.max(320, parsed.width), window.innerWidth - 20),
            height: Math.min(Math.max(360, parsed.height), window.innerHeight - 20)
          };
        }
      }
    } catch (e) {
      // Fallback
    }
    return { width: 380, height: 530 };
  });

  // Window Position State (Draggable via Header)
  const [position, setPosition] = useState<{ x: number; y: number }>(() => {
    try {
      const saved = localStorage.getItem('samp_todo_popup_pos');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
          return {
            x: Math.min(Math.max(10, parsed.x), window.innerWidth - 300),
            y: Math.min(Math.max(10, parsed.y), window.innerHeight - 150)
          };
        }
      }
    } catch (e) {
      // Fallback
    }
    return {
      x: typeof window !== 'undefined' ? Math.max(16, window.innerWidth - 410) : 100,
      y: 70
    };
  });

  // Save dimensions helper (guarantees size is saved before closing or on resize)
  const persistDimensions = useCallback(() => {
    if (popupRef.current) {
      const w = popupRef.current.offsetWidth;
      const h = popupRef.current.offsetHeight;
      if (w >= 300 && h >= 300) {
        setSize({ width: w, height: h });
        localStorage.setItem('samp_todo_popup_size', JSON.stringify({ width: w, height: h }));
      }
    }
  }, []);

  // Header Drag vs Click refs (direct DOM updates without re-renders)
  const headerDragRef = useRef<{
    isDown: boolean;
    startX: number;
    startY: number;
    startPosX: number;
    startPosY: number;
    finalX: number;
    finalY: number;
    hasMoved: boolean;
  }>({
    isDown: false,
    startX: 0,
    startY: 0,
    startPosX: 0,
    startPosY: 0,
    finalX: 0,
    finalY: 0,
    hasMoved: false
  });

  // Resize Drag refs (Right and Left corners)
  const resizeDragRef = useRef<{
    isDown: boolean;
    startX: number;
    startY: number;
    startWidth: number;
    startHeight: number;
    finalW: number;
    finalH: number;
  }>({
    isDown: false,
    startX: 0,
    startY: 0,
    startWidth: 0,
    startHeight: 0,
    finalW: 0,
    finalH: 0
  });

  const resizeLeftDragRef = useRef<{
    isDown: boolean;
    startX: number;
    startY: number;
    startPosX: number;
    startWidth: number;
    startHeight: number;
    finalX: number;
    finalW: number;
    finalH: number;
  }>({
    isDown: false,
    startX: 0,
    startY: 0,
    startPosX: 0,
    startWidth: 0,
    startHeight: 0,
    finalX: 0,
    finalW: 0,
    finalH: 0
  });

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
        window.dispatchEvent(new CustomEvent('samp-todo-summary-updated', { detail: resSummary.data }));
      }
    } catch (err) {
      console.error('Failed to fetch todos:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTodos();
    const interval = setInterval(fetchTodos, 120000);
    return () => clearInterval(interval);
  }, [fetchTodos]);

  // Global toggle event listeners
  useEffect(() => {
    const handleToggle = () => {
      setIsOpen(prev => {
        if (prev) persistDimensions();
        return !prev;
      });
    };
    const handleOpen = () => setIsOpen(true);
    const handleClose = () => {
      persistDimensions();
      setIsOpen(false);
    };

    window.addEventListener('samp-toggle-todo', handleToggle);
    window.addEventListener('samp-open-todo', handleOpen);
    window.addEventListener('samp-close-todo', handleClose);

    return () => {
      window.removeEventListener('samp-toggle-todo', handleToggle);
      window.removeEventListener('samp-open-todo', handleOpen);
      window.removeEventListener('samp-close-todo', handleClose);
    };
  }, [persistDimensions]);

  // Maintain saved dimensions on open & track resize via ResizeObserver
  useEffect(() => {
    if (!isOpen || !popupRef.current) return;

    try {
      const saved = localStorage.getItem('samp_todo_popup_size');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.width && parsed.height) {
          popupRef.current.style.width = `${parsed.width}px`;
          popupRef.current.style.height = `${parsed.height}px`;
        }
      }
    } catch (e) {}

    // ResizeObserver watches both custom handle and native CSS resize handles
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        const w = Math.round(entry.contentRect.width);
        const h = Math.round(entry.contentRect.height);
        if (w >= 300 && h >= 300) {
          localStorage.setItem('samp_todo_popup_size', JSON.stringify({ width: w, height: h }));
        }
      }
    });

    observer.observe(popupRef.current);
    return () => observer.disconnect();
  }, [isOpen]);

  // Window resize bounds adjustment
  useEffect(() => {
    const handleWindowResize = () => {
      setPosition(prev => {
        const nextX = Math.min(Math.max(10, prev.x), window.innerWidth - 120);
        const nextY = Math.min(Math.max(10, prev.y), window.innerHeight - 80);
        if (popupRef.current) {
          popupRef.current.style.left = `${nextX}px`;
          popupRef.current.style.top = `${nextY}px`;
        }
        return { x: nextX, y: nextY };
      });
      setSize(prev => {
        const nextW = Math.min(prev.width, window.innerWidth - 20);
        const nextH = Math.min(prev.height, window.innerHeight - 20);
        if (popupRef.current) {
          popupRef.current.style.width = `${nextW}px`;
          popupRef.current.style.height = `${nextH}px`;
        }
        return { width: nextW, height: nextH };
      });
    };
    window.addEventListener('resize', handleWindowResize);
    return () => window.removeEventListener('resize', handleWindowResize);
  }, []);

  // Header Pointer Handlers (Direct DOM updates - ZERO React renders while dragging)
  const handleHeaderPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button, input, select, a')) {
      return;
    }

    headerDragRef.current = {
      isDown: true,
      startX: e.clientX,
      startY: e.clientY,
      startPosX: position.x,
      startPosY: position.y,
      finalX: position.x,
      finalY: position.y,
      hasMoved: false
    };

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (err) {
      // Ignored
    }
  };

  const handleHeaderPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!headerDragRef.current.isDown) return;

    const dx = e.clientX - headerDragRef.current.startX;
    const dy = e.clientY - headerDragRef.current.startY;

    if (Math.hypot(dx, dy) > 4) {
      headerDragRef.current.hasMoved = true;
      const nextX = Math.min(Math.max(10, headerDragRef.current.startPosX + dx), window.innerWidth - 80);
      const nextY = Math.min(Math.max(10, headerDragRef.current.startPosY + dy), window.innerHeight - 60);

      headerDragRef.current.finalX = nextX;
      headerDragRef.current.finalY = nextY;

      // Direct DOM update: No React re-render during drag!
      if (popupRef.current) {
        popupRef.current.style.left = `${nextX}px`;
        popupRef.current.style.top = `${nextY}px`;
      }
    }
  };

  const handleHeaderPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!headerDragRef.current.isDown) return;

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch (err) {
      // Ignored
    }

    if (headerDragRef.current.hasMoved) {
      const finalX = headerDragRef.current.finalX;
      const finalY = headerDragRef.current.finalY;
      setPosition({ x: finalX, y: finalY });
      localStorage.setItem('samp_todo_popup_pos', JSON.stringify({ x: finalX, y: finalY }));
    } else {
      // Clicked without drag -> close
      persistDimensions();
      setIsOpen(false);
    }

    headerDragRef.current.isDown = false;
  };

  // Corner Resize Handlers (Direct DOM updates - ZERO React renders while resizing)
  const handleResizePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const currentW = popupRef.current?.offsetWidth || size.width;
    const currentH = popupRef.current?.offsetHeight || size.height;

    resizeDragRef.current = {
      isDown: true,
      startX: e.clientX,
      startY: e.clientY,
      startWidth: currentW,
      startHeight: currentH,
      finalW: currentW,
      finalH: currentH
    };
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (err) {
      // Ignored
    }
  };

  const handleResizePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!resizeDragRef.current.isDown) return;
    const dx = e.clientX - resizeDragRef.current.startX;
    const dy = e.clientY - resizeDragRef.current.startY;

    const nextW = Math.max(320, Math.min(window.innerWidth - position.x - 10, resizeDragRef.current.startWidth + dx));
    const nextH = Math.max(360, Math.min(window.innerHeight - position.y - 10, resizeDragRef.current.startHeight + dy));

    resizeDragRef.current.finalW = nextW;
    resizeDragRef.current.finalH = nextH;

    // Direct DOM update: No React re-render during resize!
    if (popupRef.current) {
      popupRef.current.style.width = `${nextW}px`;
      popupRef.current.style.height = `${nextH}px`;
    }
  };

  const handleResizePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!resizeDragRef.current.isDown) return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch (err) {
      // Ignored
    }
    const finalW = resizeDragRef.current.finalW;
    const finalH = resizeDragRef.current.finalH;
    if (finalW && finalH) {
      setSize({ width: finalW, height: finalH });
      localStorage.setItem('samp_todo_popup_size', JSON.stringify({ width: finalW, height: finalH }));
    }
    resizeDragRef.current.isDown = false;
  };

  // Bottom-Left Corner Resize Handlers (Can resize from left-bottom corner too)
  const handleResizeLeftPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const currentW = popupRef.current?.offsetWidth || size.width;
    const currentH = popupRef.current?.offsetHeight || size.height;
    const currentX = popupRef.current ? popupRef.current.offsetLeft : position.x;

    resizeLeftDragRef.current = {
      isDown: true,
      startX: e.clientX,
      startY: e.clientY,
      startPosX: currentX,
      startWidth: currentW,
      startHeight: currentH,
      finalX: currentX,
      finalW: currentW,
      finalH: currentH
    };

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (err) {
      // Ignored
    }
  };

  const handleResizeLeftPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!resizeLeftDragRef.current.isDown) return;
    const dx = e.clientX - resizeLeftDragRef.current.startX;
    const dy = e.clientY - resizeLeftDragRef.current.startY;

    const rightEdge = resizeLeftDragRef.current.startPosX + resizeLeftDragRef.current.startWidth;

    let proposedX = resizeLeftDragRef.current.startPosX + dx;
    proposedX = Math.max(10, proposedX);

    let proposedWidth = rightEdge - proposedX;
    if (proposedWidth < 320) {
      proposedWidth = 320;
      proposedX = rightEdge - 320;
    } else if (proposedWidth > window.innerWidth - 20) {
      proposedWidth = window.innerWidth - 20;
      proposedX = rightEdge - proposedWidth;
    }

    const proposedHeight = Math.max(360, Math.min(window.innerHeight - position.y - 10, resizeLeftDragRef.current.startHeight + dy));

    resizeLeftDragRef.current.finalX = proposedX;
    resizeLeftDragRef.current.finalW = proposedWidth;
    resizeLeftDragRef.current.finalH = proposedHeight;

    // Direct DOM update: No React re-render during resize!
    if (popupRef.current) {
      popupRef.current.style.left = `${proposedX}px`;
      popupRef.current.style.width = `${proposedWidth}px`;
      popupRef.current.style.height = `${proposedHeight}px`;
    }
  };

  const handleResizeLeftPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!resizeLeftDragRef.current.isDown) return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch (err) {
      // Ignored
    }

    const { finalX, finalW, finalH } = resizeLeftDragRef.current;
    if (finalW && finalH) {
      setPosition(prev => ({ ...prev, x: finalX }));
      setSize({ width: finalW, height: finalH });
      localStorage.setItem('samp_todo_popup_pos', JSON.stringify({ x: finalX, y: position.y }));
      localStorage.setItem('samp_todo_popup_size', JSON.stringify({ width: finalW, height: finalH }));
    }
    resizeLeftDragRef.current.isDown = false;
  };

  // Create Todo Action
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
        setTodos(prev => [...prev, res.data]);
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

  // Toggle Completion (Jika main item diceklis, semua sub-item otomatis terceklis)
  const handleToggle = async (id: number) => {
    const target = todos.find(t => t.id === id);
    if (!target) return;
    const nextStatus = Number(target.is_completed) === 1 ? 0 : 1;

    // Optimistic update
    setTodos(prev => prev.map(t => {
      // Item target itu sendiri
      if (t.id === id) {
        return { ...t, is_completed: nextStatus };
      }
      // Jika target memiliki sub-item, sub-item otomatis mengikuti status parent
      if (t.parent_id === id) {
        return { ...t, is_completed: nextStatus };
      }
      // Jika sub-item di-uncheck, parent itemnya otomatis di-uncheck juga
      if (target.parent_id && t.id === target.parent_id && nextStatus === 0) {
        return { ...t, is_completed: 0 };
      }
      return t;
    }));

    try {
      await api.todo.toggle(id);
      fetchTodos();
    } catch (err) {
      console.error('Failed to toggle todo:', err);
      fetchTodos();
    }
  };

  // Delete Action
  const handleDelete = async (id: number) => {
    setTodos(prev => prev.filter(t => t.id !== id && t.parent_id !== id));
    try {
      await api.todo.delete(id);
      fetchTodos();
    } catch (err) {
      console.error('Failed to delete todo:', err);
      fetchTodos();
    }
  };

  // Start Editing Item
  const handleStartEdit = (todo: TodoItem) => {
    setEditingTodoId(todo.id);
    setEditTitle(todo.title);
    setEditDueDate(todo.due_date || '');
    setEditPriority(todo.priority);
  };

  const handleCancelEdit = () => {
    setEditingTodoId(null);
    setEditTitle('');
    setEditDueDate('');
    setEditPriority('MEDIUM');
  };

  const handleSaveEdit = async (id: number) => {
    if (!editTitle.trim()) return;
    try {
      setIsEditingSaving(true);
      const res = await api.todo.update(id, {
        title: editTitle.trim(),
        due_date: editDueDate || null,
        priority: editPriority
      });

      if (res && res.success) {
        setTodos(prev => prev.map(t => t.id === id ? {
          ...t,
          title: editTitle.trim(),
          due_date: editDueDate || null,
          priority: editPriority
        } : t));
        handleCancelEdit();
        fetchTodos();
      } else {
        alert(res?.message || 'Gagal memperbarui tugas');
      }
    } catch (err: any) {
      console.error('Failed to update todo:', err);
      alert(err?.message || 'Terjadi kesalahan saat memperbarui tugas');
    } finally {
      setIsEditingSaving(false);
    }
  };

  // Toggle Sub-Item Indent/Outdent Action (1-Click Shortcut)
  const handleIndent = async (todo: TodoItem, prevSiblingId: number | null) => {
    if (!prevSiblingId) return;
    const newParentId = prevSiblingId;
    setTodos(prev => prev.map(t => t.id === todo.id ? { ...t, parent_id: newParentId } : t));
    try {
      await api.todo.update(todo.id, { parent_id: newParentId });
      fetchTodos();
    } catch (err) {
      console.error('Failed to indent todo:', err);
      fetchTodos();
    }
  };

  const handleOutdent = async (todo: TodoItem) => {
    setTodos(prev => prev.map(t => t.id === todo.id ? { ...t, parent_id: null } : t));
    try {
      await api.todo.update(todo.id, { parent_id: null });
      fetchTodos();
    } catch (err) {
      console.error('Failed to outdent todo:', err);
      fetchTodos();
    }
  };

  // Toggle Collapse / Expand for parent tasks
  const toggleCollapse = (parentId: number) => {
    setCollapsedParentIds(prev => {
      const next = new Set(prev);
      if (next.has(parentId)) {
        next.delete(parentId);
      } else {
        next.add(parentId);
      }
      return next;
    });
  };

  // Drag and drop reordering & horizontal indent/outdent
  const handleItemDragStart = (e: React.DragEvent, id: number) => {
    setDraggedTodoId(id);
    dragStartXRef.current = e.clientX;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(id));
  };

  const handleItemDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  // When dragged to the left and released on container or anywhere:
  const handleContainerDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleContainerDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    if (!draggedTodoId) return;
    const finalDx = e.clientX - dragStartXRef.current;
    
    // If dragged to the left by >= 10px and is a sub-item -> outdent to main item immediately!
    if (finalDx < -10) {
      const current = todos.find(t => t.id === draggedTodoId);
      if (current && current.parent_id) {
        setDraggedTodoId(null);
        await handleOutdent(current);
      }
    }
  };

  const handleItemDrop = async (e: React.DragEvent, targetId: number) => {
    e.preventDefault();
    const finalDx = e.clientX - dragStartXRef.current;

    if (!draggedTodoId) return;
    const currentDraggedId = draggedTodoId;
    setDraggedTodoId(null);

    const fromIdx = hierarchicalTodos.findIndex(t => t.id === currentDraggedId);
    const toIdx = hierarchicalTodos.findIndex(t => t.id === targetId);
    if (fromIdx < 0 || toIdx < 0) return;

    const listCopy = [...hierarchicalTodos];
    const [movedItem] = listCopy.splice(fromIdx, 1);

    // Responsive thresholds:
    // finalDx < -10: Dragged left -> becomes a main item (outdent)
    // finalDx > 15: Dragged right -> becomes a sub-item of the preceding item
    let newParentId = movedItem.parent_id;

    if (finalDx < -10) {
      // Dragged left -> main item
      newParentId = null;
    } else if (finalDx > 15) {
      // Dragged right -> becomes a sub-item of the item above it
      const targetPos = fromIdx < toIdx ? toIdx : toIdx;
      const precedingItem = listCopy[targetPos - 1] || listCopy[targetPos];
      if (precedingItem && precedingItem.id !== movedItem.id) {
        newParentId = precedingItem.parent_id || precedingItem.id;
      }
    } else {
      // Standard reorder without horizontal displacement
      const targetItem = hierarchicalTodos[toIdx];
      if (targetItem && targetItem.id !== movedItem.id) {
        newParentId = targetItem.parent_id || null;
      }
    }

    movedItem.parent_id = newParentId;
    listCopy.splice(toIdx, 0, movedItem);

    const updatedPayload = listCopy.map((item, idx) => ({
      id: item.id,
      urutan: idx + 1,
      parent_id: item.parent_id || null
    }));

    setTodos(listCopy);

    try {
      await api.todo.reorder(updatedPayload);
      fetchTodos();
    } catch (err) {
      console.error('Failed to save reorder:', err);
      fetchTodos();
    }
  };

  // Structured Hierarchical List (Main tasks with their nested sub-tasks)
  const hierarchicalTodos = useMemo(() => {
    const mainTasks = todos.filter(t => !t.parent_id);
    const subMap = new Map<number, TodoItem[]>();

    todos.filter(t => t.parent_id).forEach(sub => {
      const list = subMap.get(sub.parent_id!) || [];
      list.push(sub);
      subMap.set(sub.parent_id!, list);
    });

    const result: TodoItem[] = [];
    mainTasks.forEach(main => {
      result.push(main);
      const subs = subMap.get(main.id);
      if (subs && subs.length > 0) {
        result.push(...subs);
      }
    });

    const includedIds = new Set(result.map(t => t.id));
    todos.forEach(t => {
      if (!includedIds.has(t.id)) {
        result.push(t);
      }
    });

    return result;
  }, [todos]);

  // Sub-items count per parent
  const subItemsCountMap = useMemo(() => {
    const map = new Map<number, number>();
    todos.forEach(t => {
      if (t.parent_id) {
        map.set(t.parent_id, (map.get(t.parent_id) || 0) + 1);
      }
    });
    return map;
  }, [todos]);

  // Filtered List based on active tab and collapsed parents
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  const filteredTodos = useMemo(() => {
    return hierarchicalTodos.filter(t => {
      // If this is a sub-task and its parent is collapsed, hide it!
      if (t.parent_id && collapsedParentIds.has(t.parent_id)) {
        return false;
      }

      const isDone = Number(t.is_completed) === 1;
      if (activeTab === 'COMPLETED') return isDone;
      if (activeTab === 'TODAY') {
        if (isDone) return false;
        return !t.due_date || t.due_date <= todayStr;
      }
      return true; // 'ALL'
    });
  }, [hierarchicalTodos, activeTab, todayStr, collapsedParentIds]);

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

  // If closed, render nothing
  if (!isOpen) return null;

  return (
    <div
      ref={popupRef}
      style={{
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${size.width}px`,
        height: `${size.height}px`,
        zIndex: 2500,
        minWidth: '320px',
        minHeight: '360px',
        maxWidth: 'calc(100vw - 20px)',
        maxHeight: 'calc(100vh - 20px)'
      }}
      className="bg-white rounded-2xl shadow-2xl border border-slate-300 flex flex-col select-none relative overflow-hidden"
    >
      {/* 
        HEADER (Warna Tema 2, Draggable & Click to Close)
        Uses direct DOM manipulation during drag for zero lag
      */}
      <div
        onPointerDown={handleHeaderPointerDown}
        onPointerMove={handleHeaderPointerMove}
        onPointerUp={handleHeaderPointerUp}
        style={{
          backgroundColor: 'var(--theme-secondary, #334155)',
          touchAction: 'none'
        }}
        className="px-4 py-3 text-white flex items-center justify-between cursor-move shrink-0 shadow-sm border-b border-white/10"
        title="Klik untuk menutup, tahan & geser untuk memindahkan posisi"
      >
        <div className="flex items-center gap-2.5 pointer-events-none">
          <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center text-white shrink-0">
            <CheckSquare size={16} strokeWidth={2.4} />
          </div>
          <div className="min-w-0">
            <h3 className="text-xs font-black uppercase tracking-wider leading-none text-white truncate">
              To Do List
            </h3>
            <span className="text-[10px] text-white/80 font-medium leading-none block mt-1">
              {summary.pending_total === 0 ? 'Semua tugas telah tuntas' : `${summary.pending_total} tugas aktif`}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              fetchTodos();
            }}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/15 transition-colors cursor-pointer"
            title="Segarkan daftar tugas"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              persistDimensions();
              setIsOpen(false);
            }}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/15 transition-colors cursor-pointer"
            title="Tutup jendela"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* Quick Add Form */}
      <form onSubmit={handleCreateTodo} className="p-3 bg-slate-50 border-b border-slate-200/80 shrink-0">
        <div className="flex items-center gap-2 bg-white rounded-xl border border-slate-200 p-1 pl-3 shadow-inner focus-within:border-slate-400 focus-within:ring-2 focus-within:ring-slate-200 transition-all">
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
            style={{ backgroundColor: 'var(--theme-secondary, #334155)' }}
            className="p-1.5 rounded-lg text-white hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer shrink-0"
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
      <div className="flex items-center justify-between px-3 pt-2.5 pb-1 border-b border-slate-100 bg-white text-[11px] font-bold shrink-0">
        <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab('ALL')}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold transition-all cursor-pointer ${
              activeTab === 'ALL'
                ? 'bg-white text-slate-800 shadow-xs'
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
                ? 'bg-white text-slate-800 shadow-xs'
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
                ? 'bg-white text-slate-800 shadow-xs'
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

      {/* 
        Task List (Flex-1 scrollable)
        Container handles dragover/drop so dragging left never drops/gets stuck
      */}
      <div 
        onDragOver={handleContainerDragOver}
        onDrop={handleContainerDrop}
        className="flex-1 overflow-y-auto p-2.5 space-y-1.5 custom-scrollbar-visible"
      >
        {loading && todos.length === 0 ? (
          <div className="py-8 text-center text-slate-400 space-y-2">
            <RefreshCw size={18} className="animate-spin mx-auto text-slate-400" />
            <p className="text-[11px] font-medium">Memuat tugas...</p>
          </div>
        ) : filteredTodos.length === 0 ? (
          <div className="py-10 text-center text-slate-400 space-y-2">
            <Sparkles size={24} className="mx-auto text-slate-300" />
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
          filteredTodos.map((todo, idx) => {
            const isCompleted = Number(todo.is_completed) === 1;
            const isOverdue = !isCompleted && todo.due_date && todo.due_date < todayStr;
            const isDueToday = !isCompleted && todo.due_date && todo.due_date === todayStr;
            const isSubItem = Boolean(todo.parent_id);
            const isBeingEdited = editingTodoId === todo.id;

            // Expand / Collapse metadata
            const childCount = subItemsCountMap.get(todo.id) || 0;
            const isCollapsed = collapsedParentIds.has(todo.id);

            // Previous sibling for quick indent shortcut
            const prevItem = idx > 0 ? filteredTodos[idx - 1] : null;

            return (
              <div
                key={todo.id}
                draggable={!isBeingEdited}
                onDragStart={e => handleItemDragStart(e, todo.id)}
                onDragOver={handleItemDragOver}
                onDrop={e => handleItemDrop(e, todo.id)}
                onDragEnd={async (e) => {
                  const finalDx = e.clientX - dragStartXRef.current;
                  setDraggedTodoId(null);
                  // Outdent cleanly even if dropped outside an element
                  if (finalDx < -10 && todo.parent_id) {
                    await handleOutdent(todo);
                  }
                }}
                className={`group/todo flex flex-col rounded-xl border transition-colors ${
                  isSubItem ? 'ml-6 pl-2 border-l-2 border-l-slate-400 bg-slate-50/60' : 'bg-white'
                } ${
                  draggedTodoId === todo.id
                    ? 'opacity-40 bg-slate-100 border-dashed border-slate-400'
                    : isCompleted
                    ? 'bg-slate-50/70 border-slate-100 opacity-60'
                    : 'border-slate-100 hover:border-slate-200 hover:shadow-xs'
                }`}
              >
                {/* Normal Item Display or Inline Edit Form */}
                {isBeingEdited ? (
                  /* Inline Edit Mode */
                  <div className="p-2.5 space-y-2 bg-blue-50/50 rounded-xl border border-blue-200">
                    {/* Teks Asli Preview - agar teks asli selalu terlihat jelas dan tidak hilang */}
                    <div className="flex items-start gap-1.5 px-2 py-1.5 bg-white/90 rounded-lg border border-blue-100 text-[11px]">
                      <span className="text-slate-400 font-medium shrink-0">Teks saat ini:</span>
                      <span className="font-bold text-slate-700 break-words flex-1">{todo.title}</span>
                    </div>

                    {/* Input Edit */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 block">Ubah teks tugas:</label>
                      <input
                        type="text"
                        value={editTitle}
                        onChange={e => setEditTitle(e.target.value)}
                        onFocus={e => {
                          const len = e.currentTarget.value.length;
                          e.currentTarget.setSelectionRange(len, len);
                        }}
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleSaveEdit(todo.id);
                          if (e.key === 'Escape') handleCancelEdit();
                        }}
                        className="w-full text-xs font-semibold p-2 bg-white rounded-lg border border-blue-300 outline-none focus:ring-2 focus:ring-blue-400/30 text-slate-800 shadow-inner"
                        placeholder="Ketik perubahan tugas..."
                        autoFocus
                      />
                    </div>

                    <div className="flex items-center justify-between gap-2 text-[10px] pt-0.5">
                      <div className="flex items-center gap-1 text-slate-500">
                        <Calendar size={11} className="text-slate-400" />
                        <input
                          type="date"
                          value={editDueDate}
                          onChange={e => setEditDueDate(e.target.value)}
                          className="bg-white p-1 rounded border border-slate-200 text-[10px] text-slate-600 outline-none"
                        />
                      </div>
                      <div className="flex items-center gap-1">
                        <Flag size={11} className="text-slate-400" />
                        <select
                          value={editPriority}
                          onChange={e => setEditPriority(e.target.value as any)}
                          className="bg-white p-1 rounded border border-slate-200 text-[10px] text-slate-600 outline-none font-semibold"
                        >
                          <option value="LOW">Rendah</option>
                          <option value="MEDIUM">Sedang</option>
                          <option value="HIGH">Tinggi</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-1.5 pt-1 border-t border-blue-100">
                      <div>
                        {editTitle !== todo.title && (
                          <button
                            type="button"
                            onClick={() => setEditTitle(todo.title)}
                            className="px-2 py-0.5 rounded text-[10px] font-semibold text-blue-600 hover:bg-blue-100 transition-colors cursor-pointer"
                            title="Kembalikan teks seperti teks aslinya"
                          >
                            Reset ke Teks Asli
                          </button>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={handleCancelEdit}
                          className="px-2.5 py-1 rounded-lg text-[10px] font-medium text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
                        >
                          Batal
                        </button>
                        <button
                          type="button"
                          disabled={isEditingSaving || !editTitle.trim()}
                          onClick={() => handleSaveEdit(todo.id)}
                          className="px-3 py-1 rounded-lg text-[10px] font-bold bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
                        >
                          {isEditingSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Standard Row View */
                  <div className="flex items-start gap-1 p-2">
                    {/* Drag Handle (Titik Enam) */}
                    <div 
                      className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-700 mt-0.5 shrink-0 select-none" 
                      title="Geser posisi (geser kiri untuk tugas utama, geser kanan untuk sub-tugas)"
                    >
                      <GripVertical size={13} />
                    </div>

                    {/* Expand/Collapse Chevron (for main tasks with children) or Connector (for sub-tasks) */}
                    {!isSubItem ? (
                      childCount > 0 ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleCollapse(todo.id);
                          }}
                          className="p-0.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors cursor-pointer shrink-0 mt-0.5"
                          title={isCollapsed ? 'Tampilkan sub-tugas' : 'Sembunyikan sub-tugas'}
                        >
                          {isCollapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
                        </button>
                      ) : (
                        <div className="w-3.5 shrink-0" />
                      )
                    ) : (
                      <span className="text-slate-400 mt-0.5 shrink-0" title="Sub-tugas">
                        <CornerDownRight size={12} />
                      </span>
                    )}

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
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className={`text-xs font-semibold leading-tight break-words ${
                          isCompleted ? 'line-through text-slate-400' : 'text-slate-700'
                        }`}>
                          {todo.title}
                        </p>

                        {/* Collapsed sub-items indicator badge */}
                        {!isSubItem && childCount > 0 && isCollapsed && (
                          <button
                            type="button"
                            onClick={() => toggleCollapse(todo.id)}
                            className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[8px] font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 cursor-pointer transition-colors"
                            title="Klik untuk membuka sub-tugas"
                          >
                            {childCount} sub-tugas
                          </button>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[9px] font-bold">
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

                        {isSubItem && (
                          <span className="px-1 py-0.2 rounded text-[8px] bg-slate-100 text-slate-500 font-normal">
                            Sub
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons: Indent/Outdent, Edit (Pencil), Delete (Trash) */}
                    <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover/todo:opacity-100 transition-opacity">
                      {/* Indent / Outdent Quick Action */}
                      {isSubItem ? (
                        <button
                          type="button"
                          onClick={() => handleOutdent(todo)}
                          className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-all cursor-pointer"
                          title="Kembalikan jadi tugas utama (Geser kiri)"
                        >
                          <CornerUpLeft size={12} />
                        </button>
                      ) : prevItem ? (
                        <button
                          type="button"
                          onClick={() => handleIndent(todo, prevItem.id)}
                          className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-all cursor-pointer"
                          title="Jadikan sub-tugas (Geser kanan)"
                        >
                          <CornerDownRight size={12} />
                        </button>
                      ) : null}

                      {/* Edit Button (Icon Pensil di sebelah icon tempat sampah) */}
                      <button
                        type="button"
                        onClick={() => handleStartEdit(todo)}
                        className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all cursor-pointer"
                        title="Ubah tugas"
                      >
                        <Pencil size={12} />
                      </button>

                      {/* Delete Button (Icon Tempat Sampah) */}
                      <button
                        type="button"
                        onClick={() => handleDelete(todo.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                        title="Hapus tugas"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Footer & Resizing Grip Indicator (Both Left & Right corners) */}
      <div className="px-2.5 py-2 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 shrink-0 select-none relative">
        {/* Custom bottom-left resize grip handle */}
        <div
          onPointerDown={handleResizeLeftPointerDown}
          onPointerMove={handleResizeLeftPointerMove}
          onPointerUp={handleResizeLeftPointerUp}
          style={{ touchAction: 'none' }}
          className="w-4 h-4 cursor-sw-resize flex items-center justify-center text-slate-400 hover:text-slate-700 select-none transition-colors"
          title="Tarik sudut kiri bawah untuk mengubah ukuran pop up"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
            <circle cx="2" cy="8" r="1.2" />
            <circle cx="2" cy="4" r="1.2" />
            <circle cx="6" cy="8" r="1.2" />
          </svg>
        </div>

        <span className="italic text-[9px] truncate max-w-[170px] sm:max-w-[220px]">
          Geser ⇄ titik enam untuk sub-item
        </span>

        <div className="flex items-center gap-2">
          <span className="font-extrabold text-slate-500">
            {summary.completed_total}/{todos.length} Selesai
          </span>
          {/* Custom bottom-right corner resize grip handle */}
          <div
            onPointerDown={handleResizePointerDown}
            onPointerMove={handleResizePointerMove}
            onPointerUp={handleResizePointerUp}
            style={{ touchAction: 'none' }}
            className="w-4 h-4 cursor-se-resize flex items-center justify-center text-slate-400 hover:text-slate-700 select-none transition-colors"
            title="Tarik sudut kanan bawah untuk mengubah ukuran pop up"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
              <circle cx="8" cy="8" r="1.2" />
              <circle cx="8" cy="4" r="1.2" />
              <circle cx="4" cy="8" r="1.2" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DraggableTodoListWidget;
