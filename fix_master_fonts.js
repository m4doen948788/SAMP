const fs = require('fs');
const path = require('path');

const componentsDir = 'd:\\copy-dashboard\\Frontend\\src\\components';
const files = fs.readdirSync(componentsDir).filter(f => f.startsWith('Master') || f === 'DynamicTablePage.tsx').map(f => path.join(componentsDir, f));

for (const filepath of files) {
    let content = fs.readFileSync(filepath, 'utf8');
    let changed = false;

    // Fix the main column typography
    const oldMainFont = 'font-semibold text-slate-700';
    const newMainFont = 'font-semibold text-slate-800 tracking-tight text-sm';
    if (content.includes(oldMainFont)) {
        content = content.replace(new RegExp(oldMainFont, 'g'), newMainFont);
        changed = true;
    }

    // Fix the other columns (Master files might have 'text-slate-600' directly on td)
    const oldOtherFont = 'className="p-4 border-b border-slate-50 text-slate-600';
    const newOtherFont = 'className="p-4 border-b border-slate-50 font-medium text-slate-600 text-sm';
    if (content.includes(oldOtherFont)) {
        content = content.replace(new RegExp(oldOtherFont, 'g'), newOtherFont);
        changed = true;
    }

    if (changed) {
        fs.writeFileSync(filepath, content, 'utf8');
    }
}
console.log('Fixed master data fonts.');
