import React, { useState, useEffect, useLayoutEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Search, X, Check } from 'lucide-react';

interface SearchableSelectProps {
    value: any; // Can be single ID or array of IDs
    onChange: (value: any) => void;
    options: any[];
    label: string;
    keyField?: string;
    displayField?: string;
    className?: string;
    disabled?: boolean;
    onKeyDown?: (e: React.KeyboardEvent) => void;
    autoFocus?: boolean;
    multiple?: boolean;
    secondaryField?: string;
    alwaysShowAll?: boolean;
    closeOnSelect?: boolean;
    hideSelectedInTrigger?: boolean;
}

export const SearchableSelectV2 = ({
    value,
    onChange,
    options,
    label,
    keyField = 'id',
    displayField = 'nama',
    className = '',
    disabled = false,
    onKeyDown,
    autoFocus,
    multiple = false,
    secondaryField,
    alwaysShowAll = false,
    closeOnSelect = true,
    hideSelectedInTrigger = false
}: SearchableSelectProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [highlightedIndex, setHighlightedIndex] = useState(0);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLDivElement>(null);
    const listRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
    const [direction, setDirection] = useState<'down' | 'up'>('down');

    const filteredOptions = useMemo(() => {
        if (!Array.isArray(options)) return [];
        return options.filter((opt: any) =>
            (opt[displayField] || '').toLowerCase().includes(search.toLowerCase())
        );
    }, [options, search, displayField]);


    // Reset highlighted index when filtered options change
    useEffect(() => {
        setHighlightedIndex(0);
    }, [filteredOptions]);

    const updateCoords = () => {
        if (wrapperRef.current) {
            const rect = wrapperRef.current.getBoundingClientRect();
            const spaceBelow = window.innerHeight - rect.bottom;
            const spaceAbove = rect.top;
            
            // Prefer 'down' if there's enough space (300px), otherwise check if 'up' has more space
            if (spaceBelow < 300 && spaceAbove > spaceBelow) {
                setDirection('up');
                setCoords({
                    top: rect.top - 8,
                    left: rect.left,
                    width: rect.width
                });
            } else {
                setDirection('down');
                setCoords({
                    top: rect.bottom + 8,
                    left: rect.left,
                    width: rect.width
                });
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
    }, [isOpen, value]);


    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                const portalId = `portal-v2-${label.replace(/\s+/g, '-').toLowerCase()}`;
                const portal = document.getElementById(portalId);
                if (portal && portal.contains(event.target as Node)) return;
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (autoFocus && !disabled) {
            setIsOpen(true);
        }
    }, [autoFocus, disabled]);

    useEffect(() => {
        if (isOpen) {
            const timer = setTimeout(() => {
                inputRef.current?.focus();
            }, 10);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    const prevIsOpen = useRef(isOpen);
    useEffect(() => {
        if (prevIsOpen.current && !isOpen) {
            triggerRef.current?.focus();
        }
        prevIsOpen.current = isOpen;
    }, [isOpen]);

    useEffect(() => {
        if (isOpen && listRef.current && highlightedIndex >= 0) {
            const list = listRef.current;
            const highlighted = list.children[highlightedIndex] as HTMLElement;
            if (highlighted && highlighted.getBoundingClientRect) {
                const listRect = list.getBoundingClientRect();
                const highlightedRect = highlighted.getBoundingClientRect();
                if (highlightedRect.bottom > listRect.bottom) {
                    list.scrollTop += highlightedRect.bottom - listRect.bottom;
                } else if (highlightedRect.top < listRect.top) {
                    list.scrollTop -= listRect.top - highlightedRect.top;
                }
            }
        }
    }, [highlightedIndex, isOpen]);

    const lastScrollTop = useRef(0);
    useLayoutEffect(() => {
        if (isOpen && listRef.current) {
            listRef.current.scrollTop = lastScrollTop.current;
        }
    });

    const handleListScroll = () => {
        if (listRef.current) {
            lastScrollTop.current = listRef.current.scrollTop;
        }
    };


    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!isOpen) {
            if (e.key === 'Enter') {
                if (onKeyDown) onKeyDown(e);
            } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                setIsOpen(true);
            }
            return;
        }

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setHighlightedIndex(prev => Math.min(prev + 1, filteredOptions.length - 1));
                break;
            case 'ArrowUp':
                e.preventDefault();
                setHighlightedIndex(prev => Math.max(prev - 1, 0));
                break;
            case 'Enter':
                e.preventDefault();
                if (filteredOptions.length > 0 && highlightedIndex >= 0) {
                    const selectedId = filteredOptions[highlightedIndex][keyField];
                    if (multiple) {
                        toggleOption(selectedId);
                    } else {
                        onChange(selectedId);
                        if (closeOnSelect) {
                            setIsOpen(false);
                            setSearch('');
                        }
                    }
                }
                break;
            case 'Escape':
                setIsOpen(false);
                break;
            case 'Tab':
                if (isOpen) setIsOpen(false);
                break;
        }
    };

    const selectedOptions = useMemo(() => {
        if (!Array.isArray(options)) return [];
        if (multiple) {
            const values = Array.isArray(value) ? value : [];
            return options.filter(opt => values.includes(opt[keyField]));
        }
        const found = options.find(opt => opt[keyField] === value);
        return found ? [found] : [];
    }, [options, value, multiple, keyField]);

    const isSelected = (id: any) => {
        if (multiple) {
            return Array.isArray(value) && value.includes(id);
        }
        return value === id;
    };

    const toggleOption = (id: any) => {
        const option = options.find(opt => opt[keyField] === id);
        if (option?.disabled) return;

        if (multiple) {
            const currentValues = Array.isArray(value) ? value : [];
            const newValue = currentValues.includes(id)
                ? currentValues.filter(v => v !== id)
                : [...currentValues, id];
            onChange(newValue);
        } else {
            onChange(id);
            if (closeOnSelect) {
                setIsOpen(false);
                setSearch('');
            }
        }
    };

    const handleSelectAll = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!Array.isArray(options) || !multiple) return;

        const currentValues = Array.isArray(value) ? value : [];
        const selectableIds = filteredOptions
            .filter((opt: any) => !opt.disabled)
            .map((opt: any) => opt[keyField]);

        if (selectableIds.length === 0) return;

        const allTargetSelected = selectableIds.every((id: any) => currentValues.includes(id));

        if (allTargetSelected) {
            // Unselect only the visible/filtered ones
            onChange(currentValues.filter(id => !selectableIds.includes(id)));
        } else {
            // Select all visible/filtered ones
            onChange([...new Set([...currentValues, ...selectableIds])]);
        }
    };

    return (
        <div className={`relative ${className} ${disabled ? 'pointer-events-none' : ''}`} ref={wrapperRef} onKeyDown={handleKeyDown}>
            <div
                ref={triggerRef}
                tabIndex={0}
                className={`input-modern w-full flex justify-between items-center cursor-pointer bg-white min-h-[36px] focus:outline-none focus:ring-2 focus:ring-ppm-blue/20 transition-all ${disabled ? 'opacity-50 bg-slate-50 border-slate-200' : ''}`}
                onClick={() => !disabled && setIsOpen(!isOpen)}
            >
                <div className={`flex-1 min-w-0 flex gap-1 items-center pr-2 ${(isOpen || alwaysShowAll) ? 'flex-wrap' : 'overflow-hidden'}`}>
                    {selectedOptions.length > 0 && !hideSelectedInTrigger ? (
                        multiple ? (
                            <div className={`flex-1 min-w-0 flex items-center gap-1.5 py-1 max-w-full ${isOpen || alwaysShowAll ? 'flex-wrap max-h-56 overflow-y-auto custom-scrollbar pr-1' : ''}`}>
                                {selectedOptions.map(opt => (
                                    <span key={opt[keyField]} className={`px-1.5 py-0 bg-indigo-50 text-indigo-700 text-[10px] font-bold rounded border border-indigo-100 whitespace-nowrap flex items-center gap-1 group capitalize`}>
                                        <span className="truncate">{opt[displayField]?.toString()?.toLowerCase() || ''}</span>
                                        <X
                                            size={10}
                                            className="cursor-pointer hover:text-rose-500 shrink-0"
                                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleOption(opt[keyField]); }}
                                        />
                                    </span>
                                ))}
                            </div>
                        ) : (
                            <span className="text-slate-800 font-bold text-sm truncate">
                                {selectedOptions[0][displayField]}
                            </span>
                        )
                    ) : (
                        <span className="text-slate-400 text-sm">-- {label} --</span>
                    )}
                </div>
                <Search size={14} className="text-slate-400 flex-shrink-0" />
            </div>

            {isOpen && createPortal(
                <div
                    id={`portal-v2-${label.replace(/\s+/g, '-').toLowerCase()}`}
                    className="fixed z-[9999] bg-white border border-slate-200 rounded-lg shadow-xl max-h-64 overflow-hidden flex flex-col"
                    style={{
                        top: `${coords.top}px`,
                        left: `${coords.left}px`,
                        width: `${coords.width}px`,
                        transform: direction === 'up' ? 'translateY(-100%)' : 'none'
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="p-2 border-b border-slate-100 sticky top-0 bg-white" onKeyDown={(e) => e.stopPropagation()}>
                        {multiple && (
                            <div className="flex items-center justify-between px-1 mb-2">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Opsi {label}</span>
                                <button
                                    onClick={handleSelectAll}
                                    className="text-[10px] font-bold text-ppm-blue hover:text-indigo-600 transition-colors bg-blue-50/50 px-2 py-0.5 rounded-md border border-blue-100/50"
                                >
                                    {(() => {
                                        const selectableIds = filteredOptions.filter((o: any) => !o.disabled).map((o: any) => o[keyField]);
                                        if (selectableIds.length === 0) return 'Data Kosong';
                                        
                                        const allTargetSelected = selectableIds.every((id: any) => Array.isArray(value) && value.includes(id));
                                        return allTargetSelected ? (search.trim() ? 'Hapus Filtered' : 'Hapus Semua') : (search.trim() ? 'Pilih Filtered' : 'Pilih Semua');
                                    })()}
                                </button>
                            </div>
                        )}
                        <input
                            ref={inputRef}
                            type="text"
                            className="w-full px-3 py-1.5 text-sm bg-slate-50 border border-slate-100 rounded-md focus:ring-2 focus:ring-ppm-blue/10 focus:border-ppm-blue transition-all"
                            placeholder={`Cari ${label}...`}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onKeyDown={handleKeyDown}
                        />
                    </div>
                    <div className="overflow-y-auto custom-scrollbar" ref={listRef} onScroll={handleListScroll}>
                        {filteredOptions.length === 0 ? (
                            <div className="px-3 py-4 text-center text-slate-400 text-xs italic">Tidak ada hasil</div>
                        ) : (
                            filteredOptions.map((opt: any, idx: number) => (
                                <div 
                                    key={opt[keyField]}
                                    className={`
                                        px-3 py-1.5 cursor-pointer flex items-center justify-between transition-colors text-[11px]
                                        ${isSelected(opt[keyField]) ? 'text-ppm-blue font-bold bg-blue-50/10' : 'text-slate-700'}
                                        ${opt.disabled ? 'opacity-40 cursor-not-allowed bg-slate-50/50 grayscale' : 'hover:bg-slate-50'}
                                    `}
                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleOption(opt[keyField]); }}
                                    onMouseEnter={() => !opt.disabled && setHighlightedIndex(idx)}
                                >
                                    <div className="flex flex-col">
                                        <span className="leading-tight capitalize">{opt[displayField]?.toString()?.toLowerCase() || ''}</span>
                                        {secondaryField && opt[secondaryField] && (
                                            <span className="text-[10px] text-slate-400 font-medium leading-tight">{opt[secondaryField]}</span>
                                        )}
                                    </div>
                                    {isSelected(opt[keyField]) && <Check size={14} className="text-ppm-blue" strokeWidth={3} />}
                                </div>
                            ))
                        )}
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};
