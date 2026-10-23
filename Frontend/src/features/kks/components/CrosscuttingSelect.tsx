import React, { useState, useRef, useEffect } from 'react';
import { Check, ChevronDown, Search, X, Users, Building2 } from 'lucide-react';

interface Instansi {
  id: number;
  instansi: string;
  singkatan?: string;
}

interface Props {
  instansiList: Instansi[];
  selectedIds: number[];
  onChange: (ids: number[]) => void;
  pengampuId?: number | null;
  placeholder?: string;
}

export const CrosscuttingSelect: React.FC<Props> = ({
  instansiList,
  selectedIds,
  onChange,
  pengampuId,
  placeholder = 'Pilih satu atau beberapa dinas terkait...'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const filteredInstansi = instansiList.filter(inst => {
    const text = `${inst.singkatan || ''} ${inst.instansi}`.toLowerCase();
    return text.includes(searchTerm.toLowerCase());
  });

  const toggleSelect = (id: number) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter(item => item !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const removeSelected = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(selectedIds.filter(item => item !== id));
  };

  const clearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([]);
  };

  const selectedInstansiList = instansiList.filter(inst => selectedIds.includes(inst.id));

  return (
    <div className="relative w-full" ref={dropdownRef}>
      {/* Trigger Button */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full min-h-[42px] px-3 py-1.5 rounded-xl bg-slate-50 border transition-all cursor-pointer flex items-center justify-between gap-2 shadow-2xs ${
          isOpen ? 'border-emerald-500 ring-2 ring-emerald-500/10 bg-white' : 'border-slate-200 hover:border-slate-300'
        }`}
      >
        <div className="flex-1 flex flex-wrap items-center gap-1.5 py-0.5">
          {selectedInstansiList.length > 0 ? (
            selectedInstansiList.map(inst => (
              <span
                key={inst.id}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200/80 text-[11px] font-bold shadow-2xs animate-in zoom-in-95 duration-150"
              >
                <span>{inst.singkatan || inst.instansi}</span>
                <button
                  type="button"
                  onClick={(e) => removeSelected(inst.id, e)}
                  className="hover:bg-emerald-200/70 text-emerald-700 p-0.5 rounded transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))
          ) : (
            <span className="text-slate-400 text-xs font-medium flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-slate-400" />
              <span>{placeholder}</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0 text-slate-400">
          {selectedIds.length > 0 && (
            <button
              type="button"
              onClick={clearAll}
              title="Bersihkan pilihan"
              className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200/60 hover:bg-rose-100 hover:text-rose-700 text-slate-600 transition-colors mr-1"
            >
              Reset
            </button>
          )}
          <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180 text-emerald-600' : ''}`} />
        </div>
      </div>

      {/* Dropdown Menu Popover */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1.5 bg-white rounded-2xl border border-slate-200 shadow-xl p-2.5 space-y-2 animate-in fade-in zoom-in-95 duration-150 text-xs">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
            <input
              type="text"
              autoFocus
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari dinas / OPD terkait..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium focus:outline-none focus:border-emerald-500 focus:bg-white"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Info & Actions */}
          <div className="flex items-center justify-between text-[10px] text-slate-400 px-1 border-b border-slate-100 pb-1.5">
            <span>{selectedIds.length} dinas crosscutting terpilih</span>
            {selectedIds.length > 0 && (
              <button
                type="button"
                onClick={() => onChange([])}
                className="text-rose-600 font-bold hover:underline"
              >
                Hapus Semua
              </button>
            )}
          </div>

          {/* List OPD */}
          <div className="max-h-52 overflow-y-auto space-y-1 pr-1 overscroll-contain">
            {filteredInstansi.length === 0 ? (
              <div className="py-4 text-center text-slate-400 text-xs">
                Tidak ada dinas yang cocok
              </div>
            ) : (
              filteredInstansi.map(inst => {
                const isSelected = selectedIds.includes(inst.id);
                const isPengampu = pengampuId === inst.id;

                return (
                  <div
                    key={inst.id}
                    onClick={() => toggleSelect(inst.id)}
                    className={`flex items-center justify-between px-2.5 py-2 rounded-xl cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-emerald-50 text-emerald-900 font-bold border border-emerald-200/60'
                        : 'hover:bg-slate-50 text-slate-700 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate flex-1">
                      <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                        isSelected ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-300 bg-white'
                      }`}>
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>

                      <div className="truncate text-left">
                        <span className="font-bold text-slate-800 text-[11px] block truncate">
                          {inst.singkatan || inst.instansi}
                        </span>
                        {inst.singkatan && (
                          <span className="text-[10px] text-slate-400 block truncate font-normal">
                            {inst.instansi}
                          </span>
                        )}
                      </div>
                    </div>

                    {isPengampu && (
                      <span className="shrink-0 text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-100 text-blue-800">
                        Pengampu Utama
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>

          <div className="pt-1 border-t border-slate-100 flex justify-end">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-3 py-1 rounded-lg bg-slate-900 text-white text-[11px] font-bold hover:bg-slate-800"
            >
              Selesai Memilih
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
