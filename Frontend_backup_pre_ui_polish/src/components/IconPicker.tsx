import React, { useState, useRef, useEffect } from 'react';
import * as Icons from 'lucide-react';

export const COMMON_ICONS = [
    'LayoutDashboard', 'Users', 'Settings', 'FileText', 'Folder',
    'BarChart2', 'Calendar', 'Home', 'Database', 'Mail',
    'MessageSquare', 'Bell', 'Search', 'Menu', 'Activity',
    'Archive', 'Book', 'Bookmark', 'Briefcase', 'Camera',
    'CheckCircle', 'Clipboard', 'Cloud', 'Code', 'Cpu',
    'CreditCard', 'Globe', 'Heart', 'Image', 'Inbox',
    'Key', 'Link', 'List', 'Lock', 'Map',
    'Monitor', 'Package', 'Paperclip', 'Phone', 'Printer',
    'Save', 'Shield', 'ShoppingBag', 'ShoppingCart', 'Star',
    'Tag', 'Terminal', 'Tool', 'Truck', 'Video',
    'Wifi', 'Zap', 'BookOpen', 'CheckSquare', 'FileDigit',
    'GraduationCap', 'Landmark', 'Building', 'MapPin',
    'Component', 'Layers', 'Grid', 'Layout', 'Table',
    'Box', 'AlignLeft'
].sort();

interface IconPickerProps {
    value?: string;
    onChange: (value: string) => void;
}

export default function IconPicker({ value, onChange }: IconPickerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredIcons = COMMON_ICONS.filter(icon => icon.toLowerCase().includes(search.toLowerCase()));

    // Safely get icon component
    const safeValue = value || 'LayoutDashboard';
    const SelectedIcon = (Icons as any)[safeValue] || Icons.HelpCircle;

    return (
        <div className="relative" ref={wrapperRef}>
            <button
                type="button"
                className="w-full border border-slate-300 p-1.5 text-xs bg-white flex items-center justify-between outline-none focus:border-ppm-green"
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className="flex items-center gap-2 overflow-hidden">
                    <SelectedIcon size={14} className="text-slate-600 shrink-0" />
                    <span className="truncate">{safeValue}</span>
                </div>
                <Icons.ChevronDown size={14} className="text-slate-400 shrink-0" />
            </button>

            {isOpen && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 shadow-xl max-h-48 flex flex-col rounded-b-md">
                    <div className="p-1.5 border-b border-slate-100 sticky top-0 bg-slate-50">
                        <div className="relative">
                            <Icons.Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                autoFocus
                                type="text"
                                className="w-full pl-6 pr-2 py-1 text-[10px] border border-slate-200 outline-none focus:border-ppm-green rounded-sm"
                                placeholder="Cari icon..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                onClick={e => e.stopPropagation()}
                            />
                        </div>
                    </div>
                    <div className="overflow-y-auto flex-1 p-1">
                        {filteredIcons.map(iconName => {
                            const IconCmp = (Icons as any)[iconName];
                            if (!IconCmp) return null;
                            return (
                                <button
                                    key={iconName}
                                    type="button"
                                    className={`w-full text-left p-1.5 text-[10px] flex items-center gap-2 hover:bg-slate-100 transition-colors rounded-sm ${safeValue === iconName ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-700'}`}
                                    onClick={() => {
                                        onChange(iconName);
                                        setIsOpen(false);
                                        setSearch('');
                                    }}
                                >
                                    <IconCmp size={12} className={safeValue === iconName ? 'text-blue-500' : 'text-slate-500'} />
                                    <span className="truncate">{iconName}</span>
                                </button>
                            );
                        })}
                        {filteredIcons.length === 0 && (
                            <div className="p-3 text-center text-[10px] text-slate-400">Tidak ada icon</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
