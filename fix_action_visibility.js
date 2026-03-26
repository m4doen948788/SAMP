const fs = require('fs');
const path = require('path');

const componentsDir = 'd:\\copy-dashboard\\Frontend\\src\\components';
const files = fs.readdirSync(componentsDir).filter(f => f.endsWith('.tsx')).map(f => path.join(componentsDir, f));

for (const filepath of files) {
    let content = fs.readFileSync(filepath, 'utf8');
    let changed = false;

    // Remove opacity-0 group-hover/row:opacity-100
    if (content.includes('opacity-0 group-hover/row:opacity-100')) {
        content = content.replace(/opacity-0 group-hover\/row:opacity-100/g, 'opacity-100');
        changed = true;
    }
    // and the one in PetunjukTeknis
    if (content.includes('opacity-100 lg:opacity-0 group-hover/row:opacity-100')) {
        content = content.replace(/opacity-100 lg:opacity-0 group-hover\/row:opacity-100/g, 'opacity-100');
        changed = true;
    }

    // Fix the Save (Check) button color on inline edits
    if (content.includes('text-ppm-slate p-1 hover:bg-slate-100')) {
        content = content.replace(/text-ppm-slate p-1 hover:bg-slate-100/g, 'text-slate-400 hover:text-emerald-600 p-1.5 hover:bg-emerald-50');
        changed = true;
    }

    // Fix the Cancel (X) button color on inline edits
    if (content.includes('text-red-600 p-1 hover:bg-red-100')) {
        content = content.replace(/text-red-600 p-1 hover:bg-red-100/g, 'text-slate-400 hover:text-rose-600 p-1.5 hover:bg-rose-50');
        changed = true;
    }

    // Inside GeneratorHalaman, we also need to remove action opacity
    // Wait, the regex already caught GeneratorHalaman if it had opacity-0 group-hover/row:opacity-100.

    // Check if there are colorful buttons in GeneratorHalaman that was missed
    if (content.includes('text-blue-600 hover:text-blue-800 p-1 transition-colors')) {
        content = content.replace(/text-blue-600 hover:text-blue-800 p-1 transition-colors/g, 'text-slate-400 hover:text-indigo-600 p-2 hover:bg-indigo-50/80 rounded-xl transition-colors');
        changed = true;
    }
    if (content.includes('text-red-600 hover:text-red-800 p-1 transition-colors')) {
        content = content.replace(/text-red-600 hover:text-red-800 p-1 transition-colors/g, 'text-slate-400 hover:text-rose-600 p-2 hover:bg-rose-50/80 rounded-xl transition-colors');
        changed = true;
    }

    if (changed) {
        fs.writeFileSync(filepath, content, 'utf8');
    }
}
console.log('Fixed visibility and colors.');
