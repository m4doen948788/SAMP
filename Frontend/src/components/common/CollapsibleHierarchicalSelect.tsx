import React, { useState, useEffect, useLayoutEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Search, ChevronRight, ChevronDown, Check, Tag } from 'lucide-react';

interface Option {
    id: number | string;
    nama: string;
    parent_id?: number | string | null;
}

interface CollapsibleHierarchicalSelectProps {
    value: string | number;
    onChange: (value: string | number) => void;
    options: Option[];
    label: string;
    placeholder?: string;
    className?: string;
    defaultCollapsedNames?: string[];
}

export const CollapsibleHierarchicalSelect = ({
    value,
    onChange,
    options,
    label,
    placeholder = 'Pilih...',
    className = '',
    defaultCollapsedNames = ['Rapat MAMIN', 'Rapat Luar Bidang']
}: CollapsibleHierarchicalSelectProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [expandedNodes, setExpandedNodes] = useState<Set<number | string>>(new Set());
    
    const wrapperRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
    const [direction, setDirection] = useState<'down' | 'up'>('down');

    // Build hierarchy and initial expanded state
    const { tree, initialExpanded } = useMemo(() => {
        const nodes: Record<string | number, any> = {};
        const root: any[] = [];
        const toExpand = new Set<number | string>();

        options.forEach(opt => {
            nodes[opt.id] = { ...opt, children: [] };
        });

        options.forEach(opt => {
            if (opt.parent_id && nodes[opt.parent_id]) {
                nodes[opt.parent_id].children.push(nodes[opt.id]);
            } else {
                root.push(nodes[opt.id]);
            }
        });

        // Determine default expanded state: nodes that are NOT in defaultCollapsedNames
        options.forEach(opt => {
            if (nodes[opt.id].children.length > 0) {
                const isCollapsed = defaultCollapsedNames.some(name => 
                    opt.nama.toLowerCase().includes(name.toLowerCase())
                );
                if (!isCollapsed) {
                    toExpand.add(opt.id);
                }
            }
        });

        return { tree: root, initialExpanded: toExpand };
    }, [options]);

    // Initialize expanded nodes once
    useEffect(() => {
        if (initialExpanded.size > 0) {
            setExpandedNodes(initialExpanded);
        }
    }, [initialExpanded]);

    // If search is active, auto-expand all nodes that have matching children
    useEffect(() => {
        if (search.trim().length > 0) {
            const newExpanded = new Set<number | string>();
            const findAndExpand = (node: any) => {
                let hasMatch = node.nama.toLowerCase().includes(search.toLowerCase());
                node.children.forEach((child: any) => {
                    if (findAndExpand(child)) hasMatch = true;
                });
                if (hasMatch && node.children.length > 0) {
                    newExpanded.add(node.id);
                }
                return hasMatch;
            };
            tree.forEach(findAndExpand);
            setExpandedNodes(newExpanded);
        } else {
            setExpandedNodes(initialExpanded);
        }
    }, [search, tree, initialExpanded]);

    const updateCoords = () => {
        if (wrapperRef.current) {
            const rect = wrapperRef.current.getBoundingClientRect();
            const spaceBelow = window.innerHeight - rect.bottom;
            const spaceAbove = rect.top;
            
            if (spaceBelow < 350 && spaceAbove > spaceBelow) {
                setDirection('up');
                setCoords({ top: rect.top - 8, left: rect.left, width: rect.width });
            } else {
                setDirection('down');
                setCoords({ top: rect.bottom + 8, left: rect.left, width: rect.width });
            }
        }
    };

    useLayoutEffect(() => {
        if (isOpen) {
            updateCoords();
            window.addEventListener('scroll', updateCoords, true);
            window.addEventListener('resize', updateCoords);
        }
        return () => {
            window.removeEventListener('scroll', updateCoords, true);
            window.removeEventListener('resize', updateCoords);
        };
    }, [isOpen]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectedOption = useMemo(() => options.find(opt => String(opt.id) === String(value)), [options, value]);

    const toggleNode = (e: React.MouseEvent, id: number | string) => {
        e.stopPropagation();
        const next = new Set(expandedNodes);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setExpandedNodes(next);
    };

    const renderNode = (node: any, level = 0) => {
        const isExpanded = expandedNodes.has(node.id);
        const hasChildren = node.children && node.children.length > 0;
        const isSelected = String(node.id) === String(value);
        const matchesSearch = node.nama.toLowerCase().includes(search.toLowerCase());
        
        const hasMatchingChild = (n: any): boolean => 
            n.nama.toLowerCase().includes(search.toLowerCase()) || (n.children && n.children.some((c: any) => hasMatchingChild(c)));
        
        if (search && !matchesSearch && !hasMatchingChild(node)) return null;

        return (
            <div key={node.id}>
                <div 
                    className={`
                        flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors text-[11px] group
                        ${isSelected ? 'bg-blue-50 text-ppm-blue border-r-4 border-ppm-blue' : 'text-slate-600 hover:bg-slate-50'}
                        ${hasChildren ? 'tracking-tighter text-slate-800 bg-slate-50/50' : 'font-medium'}
                    `}
                    style={{ paddingLeft: `${12 + level * 16}px` }}
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (hasChildren) {
                            const next = new Set(expandedNodes);
                            if (next.has(node.id)) next.delete(node.id);
                            else next.add(node.id);
                            setExpandedNodes(next);
                        } else {
                            // If clicking the SAME item, unselect it (set to empty)
                            if (isSelected) {
                                onChange('');
                            } else {
                                onChange(node.id);
                            }
                            setIsOpen(false);
                            setSearch('');
                        }
                    }}
                >
                    {hasChildren ? (
                        <div className="w-4 h-4 flex items-center justify-center rounded-md bg-slate-100 text-slate-400 group-hover:bg-ppm-blue group-hover:text-white transition-all">
                            {isExpanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                        </div>
                    ) : (
                        <div className="w-4" />
                    )}
                    <span className="flex-1 truncate">{node.nama}</span>
                    {isSelected && <Check size={14} className="text-ppm-blue shrink-0" />}
                </div>
                {hasChildren && isExpanded && (
                    <div className="animate-in slide-in-from-top-1 duration-200">
                        {node.children.map((child: any) => renderNode(child, level + 1))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className={`relative ${className}`} ref={wrapperRef}>
            <div
                ref={triggerRef}
                tabIndex={0}
                className="input-modern w-full flex justify-between items-center cursor-pointer bg-white group hover:border-ppm-blue/40 transition-all border-2 border-slate-100"
                onClick={() => {
                    if (!isOpen) {
                        updateCoords();
                        setIsOpen(true);
                    } else {
                        setIsOpen(false);
                    }
                }}
            >
                <div className="flex items-center gap-2 pr-2 truncate">
                    <Tag size={12} className="text-slate-400 group-hover:text-ppm-blue transition-colors" />
                    {selectedOption ? (
                        <span className="text-slate-800 font-bold text-sm truncate tracking-tight">
                            {selectedOption.nama}
                        </span>
                    ) : (
                        <span className="text-slate-400 text-sm">{placeholder}</span>
                    )}
                </div>
                {isOpen ? <ChevronDown size={14} className="text-ppm-blue" /> : <ChevronRight size={14} className="text-slate-400" />}
            </div>

            {isOpen && coords.width > 0 && createPortal(
                <div
                    className="fixed z-[9999] bg-white border-2 border-slate-100 rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
                    onMouseDown={(e) => e.stopPropagation()}
                    style={{
                        top: `${coords.top}px`,
                        left: `${coords.left}px`,
                        width: `${coords.width}px`,
                        maxHeight: '400px',
                        transform: direction === 'up' ? 'translateY(-100%)' : 'none',
                        transformOrigin: direction === 'up' ? 'bottom' : 'top'
                    }}
                >
                    <div className="p-3 border-b border-slate-50 sticky top-0 bg-white/80 backdrop-blur-md" onMouseDown={(e) => e.stopPropagation()}>
                        <div className="relative">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                ref={inputRef}
                                type="text"
                                autoFocus
                                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-ppm-blue/10 transition-all font-bold placeholder:font-medium"
                                placeholder={`Cari ${label}...`}
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Escape') setIsOpen(false);
                                    e.stopPropagation();
                                }}
                            />
                        </div>
                    </div>
                    <div className="overflow-y-auto overflow-x-hidden p-1 custom-scrollbar pb-3">
                        {tree.length === 0 ? (
                            <div className="px-3 py-10 text-center text-slate-300 text-xs italic font-bold">
                                Tidak ada data
                            </div>
                        ) : (
                            tree.map(node => renderNode(node))
                        )}
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};
