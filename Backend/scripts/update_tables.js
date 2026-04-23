const fs = require('fs');
const path = require('path');

const componentsDir = 'd:\\copy-dashboard\\Frontend\\src\\components';
const files = fs.readdirSync(componentsDir).filter(f => f.startsWith('Master') || f === 'TableLabelManager.tsx' || f === 'MacroDataTable.tsx').map(f => path.join(componentsDir, f));

for (const filepath of files) {
    let content = fs.readFileSync(filepath, 'utf8');

    // Pagination buttons
    content = content.replace(
        /className={`px-2\.5 py-1 border text-xs font-bold transition-colors \$\{p === currentPage \? 'bg-ppm-slate text-white border-ppm-slate' : 'border-slate-300 hover:border-ppm-slate'\}`}/g,
        "className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 ${p === currentPage ? 'bg-ppm-slate text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}`}"
    );

    // Title area
    content = content.replace(
        /className="flex justify-between items-center mb-2"/g,
        'className="flex justify-between items-center mb-6"'
    );
    content = content.replace(
        /text-xl font-black text-ppm-slate uppercase tracking-tight/g,
        'text-[22px] font-extrabold text-slate-800 tracking-tight'
    );
    content = content.replace(/<Plus size=\{14\} \/>/g, '<Plus size={16} />');

    // Search area
    content = content.replace(/className="mb-4 flex justify-end"/g, 'className="mb-6 flex justify-end"');
    content = content.replace(/className="relative w-full sm:w-72"/g, 'className="relative w-full sm:w-80"');
    content = content.replace(/<Search size=\{16\}/g, '<Search size={18}');
    content = content.replace(/pl-9/g, 'pl-10');

    // Loader
    content = content.replace(/Loader2 className="animate-spin text-ppm-slate" size=\{32\}/g, 'Loader2 className="animate-spin text-ppm-slate" size={44}');

    // Table wrapper
    content = content.replace(
        /className="overflow-x-auto rounded-xl border border-slate-200"/g,
        'className="overflow-x-auto rounded-xl border border-slate-100 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.02)]"'
    );

    // Table headers
    content = content.replace(/<th className="table-header w-16 text-center">NO<\/th>/g, '<th className="table-header w-16 text-center rounded-tl-xl">#</th>');
    content = content.replace(/<th className="table-header w-12 text-center">NO<\/th>/g, '<th className="table-header w-12 text-center rounded-tl-xl">#</th>');

    // Rounded tr on Aksi header
    content = content.replace(/(<th className="[^"]*Aksi[^"]*)"/g, '$1 rounded-tr-xl"');

    // Table body
    content = content.replace(/<tbody>/g, '<tbody className="bg-white">');
    content = content.replace(/className="hover:bg-slate-50 transition-colors"/g, 'className="hover:bg-slate-50/80 transition-colors border-b border-slate-50 group/row"');

    // Table cells
    content = content.replace(/p-3 border-b border-slate-100/g, 'p-4 border-b border-slate-50');
    content = content.replace(/font-bold text-ppm-slate/g, 'font-semibold text-slate-700');

    // Action buttons
    content = content.replace(
        /className="text-blue-600 hover:text-blue-800 p-1 transition-colors"/g,
        'className="text-slate-400 hover:text-indigo-600 p-2 hover:bg-indigo-50/80 rounded-xl transition-colors"'
    );
    content = content.replace(
        /className="text-red-600 hover:text-red-800 p-1 transition-colors"/g,
        'className="text-slate-400 hover:text-rose-600 p-2 hover:bg-rose-50/80 rounded-xl transition-colors"'
    );

    content = content.replace(/className="flex justify-center gap-[1-4]{1}">\s*(<>\s*<button[^\n]+<Edit2[\s\S]+?<\/)\s*<\/>/g,
        (match, inner) => match.replace('className="flex justify-center gap-4"', 'className="flex justify-center opacity-0 group-hover/row:opacity-100 transition-opacity gap-2"').replace('className="flex justify-center gap-2"', 'className="flex justify-center opacity-0 group-hover/row:opacity-100 transition-opacity gap-2"').replace('className="flex justify-center gap-3"', 'className="flex justify-center opacity-0 group-hover/row:opacity-100 transition-opacity gap-2"')
    );

    // Group-hover opacity logic (make it simple)
    content = content.replace(/<div className="flex justify-center gap-4">[\s\S]*?(<Edit2 size=\{16\} \/>[\s\S]*?)<\/div>/g,
        (match) => { return match.replace(/flex justify-center gap-4/, 'flex justify-center gap-2 opacity-0 group-hover/row:opacity-100 transition-opacity') }
    );

    // Pagination footer
    content = content.replace(
        /className="flex flex-col sm:flex-row justify-between items-center mt-4 gap-3"/g,
        'className="flex flex-col sm:flex-row justify-between items-center mt-6 gap-4"'
    );
    content = content.replace(
        /className="flex items-center gap-2 text-xs text-slate-500"/g,
        'className="flex items-center gap-3 text-xs text-slate-500 font-medium"'
    );
    content = content.replace(
        /className="border border-slate-300 px-2 py-1\.5 text-xs outline-none focus:border-ppm-slate"/g,
        'className="border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-ppm-slate bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer"'
    );

    fs.writeFileSync(filepath, content, 'utf8');
}
console.log(`Updated ${files.length} files`);
