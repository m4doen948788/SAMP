import os
import re
import glob

components_dir = r"d:\copy-dashboard\Frontend\src\components"
master_files = glob.glob(os.path.join(components_dir, 'Master*.tsx'))
other_files = [os.path.join(components_dir, f) for f in ['TableLabelManager.tsx']]
all_files = master_files + other_files

for filepath in all_files:
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Pagination buttons
    content = content.replace(
        "className={`px-2.5 py-1 border text-xs font-bold transition-colors ${p === currentPage ? 'bg-ppm-slate text-white border-ppm-slate' : 'border-slate-300 hover:border-ppm-slate'}`}",
        "className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 ${p === currentPage ? 'bg-ppm-slate text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}`}"
    )

    # Title area
    content = content.replace(
        'className="flex justify-between items-center mb-2"',
        'className="flex justify-between items-center mb-6"'
    )
    content = content.replace(
        'text-xl font-black text-ppm-slate uppercase tracking-tight',
        'text-[22px] font-extrabold text-slate-800 tracking-tight'
    )
    content = content.replace('<Plus size={14} />', '<Plus size={16} />')

    # Search area
    content = content.replace('className="mb-4 flex justify-end"', 'className="mb-6 flex justify-end"')
    content = content.replace('className="relative w-full sm:w-72"', 'className="relative w-full sm:w-80"')
    content = content.replace('<Search size={16}', '<Search size={18}')
    content = content.replace('pl-9', 'pl-10')

    # Loader
    content = content.replace('Loader2 className="animate-spin text-ppm-slate" size={32}', 'Loader2 className="animate-spin text-ppm-slate" size={44}')

    # Table wrapper
    content = content.replace(
        'className="overflow-x-auto rounded-xl border border-slate-200"',
        'className="overflow-x-auto rounded-xl border border-slate-100 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.02)]"'
    )
    
    # Table headers NO -> #
    content = content.replace('<th className="table-header w-16 text-center">NO</th>', '<th className="table-header w-16 text-center rounded-tl-xl">#</th>')
    content = content.replace('<th className="table-header w-12 text-center">NO</th>', '<th className="table-header w-12 text-center rounded-tl-xl">#</th>')
    
    # Rounded tr on Aksi header
    content = re.sub(r'(<th className="[^"]*Aksi[^"]*)"', r'\1 rounded-tr-xl"', content)

    # Table body
    content = content.replace('<tbody>', '<tbody className="bg-white">')
    content = content.replace('className="hover:bg-slate-50 transition-colors"', 'className="hover:bg-slate-50/80 transition-colors border-b border-slate-50 group/row"')

    # Table cells (td)
    content = content.replace('p-3 border-b border-slate-100', 'p-4 border-b border-slate-50')
    content = content.replace('font-bold text-ppm-slate', 'font-semibold text-slate-700')

    # Action buttons
    content = content.replace(
        'className="text-blue-600 hover:text-blue-800 p-1 transition-colors"',
        'className="text-slate-400 hover:text-indigo-600 p-2 hover:bg-indigo-50/80 rounded-xl transition-colors"'
    )
    content = content.replace(
        'className="text-red-600 hover:text-red-800 p-1 transition-colors"',
        'className="text-slate-400 hover:text-rose-600 p-2 hover:bg-rose-50/80 rounded-xl transition-colors"'
    )
    content = content.replace('<Edit2 size={16} />', '<Edit2 size={16} />')
    content = content.replace('<Trash2 size={16} />', '<Trash2 size={16} />')
    
    # Add group opacity to action container
    content = re.sub(
        r'<div className="flex justify-center gap-[1-4]{1}">\s*<>\s*<button[^\n]+<Edit2[\s\S]+?</>',
        lambda m: m.group(0).replace('className="flex justify-center', 'className="flex justify-center opacity-0 group-hover/row:opacity-100 transition-opacity'),
        content
    )
    content = content.replace('<div className="flex justify-center gap-4">', '<div className="flex justify-center gap-2">')

    # Pagination footer
    content = content.replace(
        'className="flex flex-col sm:flex-row justify-between items-center mt-4 gap-3"',
        'className="flex flex-col sm:flex-row justify-between items-center mt-6 gap-4"'
    )
    content = content.replace(
        'className="flex items-center gap-2 text-xs text-slate-500"',
        'className="flex items-center gap-3 text-xs text-slate-500 font-medium"'
    )
    content = content.replace(
        'className="border border-slate-300 px-2 py-1.5 text-xs outline-none focus:border-ppm-slate"',
        'className="border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-ppm-slate bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer"'
    )

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

print(f"Updated {len(all_files)} files.")
