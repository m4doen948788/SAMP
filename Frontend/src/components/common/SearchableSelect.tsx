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
}

export const SearchableSelect = ({
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
    alwaysShowAll = false
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
        const filtered = options.filter((opt: any) =>
            (opt[displayField] || '').toLowerCase().includes(search.toLowerCase())
        );

        if (multiple && search.length === 0) {
            return [...filtered].sort((a, b) => {
                const aSelected = Array.isArray(value) && value.includes(a[keyField]);
                const bSelected = Array.isArray(value) && value.includes(b[keyField]);
                if (aSelected && !bSelected) return -1;
                if (!aSelected && bSelected) return 1;
                return 0;
            });
        }
        return filtered;
    }, [options, search, displayField, multiple, value, keyField]);


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
                    top: rect.top - 8, // Use fixed coordinate relative to viewport for fixed position
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
    }, [isOpen, value]); // React to selection changes which affect trigger height


    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                const portalId = `portal-${label.replace(/\s+/g, '-').toLowerCase()}`;
                const portal = document.getElementById(portalId);
                if (portal && portal.contains(event.target as Node)) return;
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Handle autoFocus
    useEffect(() => {
        if (autoFocus && !disabled) {
            setIsOpen(true);
        }
    }, [autoFocus, disabled]);

    // Focus input when dropdown opens
    useEffect(() => {
        if (isOpen) {
            // Small timeout to ensure Portal is rendered
            const timer = setTimeout(() => {
                inputRef.current?.focus();
            }, 10);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    // Return focus to trigger when closing
    const prevIsOpen = useRef(isOpen);
    useEffect(() => {
        if (prevIsOpen.current && !isOpen) {
            triggerRef.current?.focus();
        }
        prevIsOpen.current = isOpen;
    }, [isOpen]);

    // Ensure highlighted item is visible in scroll
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

    // Persist scroll position when component renders while open
    const lastScrollTop = useRef(0);
    useLayoutEffect(() => {
        if (isOpen && listRef.current) {
            listRef.current.scrollTop = lastScrollTop.current;
        }
    }); // Run on every render to ensure scroll is kept across any update

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
                        const currentValues = Array.isArray(value) ? value : [];
                        const newValue = currentValues.includes(selectedId)
                            ? currentValues.filter(id => id !== selectedId)
                            : [...currentValues, selectedId];
                        onChange(newValue);
                    } else {
                        onChange(selectedId);
                        setIsOpen(false);
                        setSearch('');
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
            setIsOpen(false);
            setSearch('');
        }
    };

    const handleSelectAll = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!Array.isArray(options)) return;

        const currentValues = Array.isArray(value) ? value : [];
        const isFiltering = search.trim().length > 0;
        const targetOptions = isFiltering ? filteredOptions : options;

        const selectableIds = targetOptions
            .filter((opt: any) => !opt.disabled)
            .map((opt: any) => opt[keyField]);

        if (selectableIds.length === 0) return;

        const allTargetSelected = selectableIds.every((id: any) => currentValues.includes(id));

        if (allTargetSelected) {
            // Unselect only those in the target (filtered or all) list
            const newValue = currentValues.filter(id => !selectableIds.includes(id));
            onChange(newValue);
        } else {
            // Select all in target list (combine with existing selections)
            const newValue = [...new Set([...currentValues, ...selectableIds])];
            onChange(newValue);
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
                    {selectedOptions.length > 0 ? (
                        multiple ? (
                            <div className={`flex-1 min-w-0 flex items-center gap-1.5 py-1 max-w-full ${isOpen || alwaysShowAll ? 'flex-wrap max-h-56 overflow-y-auto custom-scrollbar pr-1' : ''}`}>
                                {(!isOpen && !alwaysShowAll && selectedOptions.length > 1) ? (
                                    <>
                                        <span className="px-1.5 py-0 bg-indigo-50 text-indigo-700 text-[10px] font-bold rounded border border-indigo-100 whitespace-nowrap flex items-center gap-1 group capitalize max-w-[70%]">
                                            <span className="truncate">{selectedOptions[0][displayField].toLowerCase()}</span>
                                            <X
                                                size={10}
                                                className="cursor-pointer hover:text-rose-500 shrink-0"
                                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleOption(selectedOptions[0][keyField]); }}
                                            />
                                        </span>
                                        <span className="text-[9px] font-black text-slate-400 bg-slate-50 px-1.5 py-0 rounded border border-slate-100 uppercase tracking-tighter shrink-0">
                                            +{selectedOptions.length - 1} Lagi
                                        </span>
                                    </>
                                ) : (
                                    selectedOptions.map(opt => (
                                        <span key={opt[keyField]} className={`px-1.5 py-0 bg-indigo-50 text-indigo-700 text-[10px] font-bold rounded border border-indigo-100 whitespace-nowrap flex items-center gap-1 group capitalize ${(!isOpen && !alwaysShowAll) ? 'max-w-[200px]' : (multiple ? 'max-w-[250px]' : '')}`}>
                                            <span className="truncate">{opt[displayField].toLowerCase()}</span>
                                            <X
                                                size={10}
                                                className="cursor-pointer hover:text-rose-500 shrink-0"
                                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleOption(opt[keyField]); }}
                                            />
                                        </span>
                                    ))
                                )}

                            </div>
                        ) : (


                            <span className="text-slate-800 font-bold text-sm truncate">
                                {selectedOptions[0][displayField]}
                            </span>
                        )
                    ) : (
                        <span className="text-slate-400 text-sm">-- Pilih {label} --</span>
                    )}
                </div>
                <Search size={14} className="text-slate-400 flex-shrink-0" />
            </div>

            {isOpen && createPortal(
                <div
                    id={`portal-${label.replace(/\s+/g, '-').toLowerCase()}`}
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
                    <div className="p-2 border-b border-slate-100 sticky top-0 bg-white space-y-2" onKeyDown={(e) => e.stopPropagation()}>
                        {multiple && (
                            <div className="flex items-center justify-between px-1">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Opsi {label}</span>
                                <button
                                    onClick={handleSelectAll}
                                    className="text-[10px] font-bold text-ppm-blue hover:text-indigo-600 transition-colors"
                                >
                                    {(() => {
                                        const isFiltering = search.trim().length > 0;
                                        const targetOptions = isFiltering ? filteredOptions : options;
                                        const selectableIds = targetOptions.filter((o: any) => !o.disabled).map((o: any) => o[keyField]);
                                        if (selectableIds.length === 0) return 'Tidak ada data';

                                        const allTargetSelected = selectableIds.every((id: any) => Array.isArray(value) && value.includes(id));

                                        if (isFiltering) {
                                            return allTargetSelected ? 'Del Filter' : 'Sel Filter';
                                        }
                                        return allTargetSelected ? 'Hapus Semua' : 'Pilih Semua';
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
                                        ${isSelected(opt[keyField]) ? 'text-ppm-blue font-bold bg-blue-50/30' : 'text-slate-700'}
                                        ${opt.disabled ? 'opacity-40 cursor-not-allowed bg-slate-50/50 grayscale' : 'hover:bg-slate-50'}
                                    `}
                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleOption(opt[keyField]); }}
                                    onMouseEnter={() => !opt.disabled && setHighlightedIndex(idx)}
                                >
                                    <div className="flex flex-col capitalize">
                                        <span className="leading-tight">{opt[displayField].toLowerCase()}</span>

                                        {secondaryField && opt[secondaryField] && (
                                            <span className="text-[10px] text-slate-400 font-medium leading-tight">{opt[secondaryField]}</span>
                                        )}
                                        {opt.disabled && opt.disabledReason && (
                                            <span className="text-[9px] font-medium text-rose-500 mt-0.5">{opt.disabledReason}</span>
                                        )}
                                    </div>
                                    {isSelected(opt[keyField]) && <Check size={14} className="text-ppm-blue" />}
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
