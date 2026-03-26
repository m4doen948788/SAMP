const fs = require('fs');
const configs = {
    slate: ['#334155', '#475569', '#f8fafc', '#e2e8f0', '#cbd5e1'],
    gray: ['#4b5563', '#6b7280', '#f9fafb', '#e5e7eb', '#d1d5db'],
    zinc: ['#3f3f46', '#52525b', '#fafafa', '#e4e4e7', '#d4d4d8'],
    neutral: ['#404040', '#525252', '#fafafa', '#e5e5e5', '#d4d4d4'],
    stone: ['#44403c', '#57534e', '#fafaf9', '#e7e5e4', '#d6d3d1'],
    red: ['#dc2626', '#ef4444', '#fef2f2', '#fee2e2', '#fecaca'],
    orange: ['#ea580c', '#f97316', '#fff7ed', '#ffedd5', '#fed7aa'],
    amber: ['#d97706', '#f59e0b', '#fffbeb', '#fef3c7', '#fde68a'],
    yellow: ['#ca8a04', '#eab308', '#fefce8', '#fef9c3', '#fef08a'],
    lime: ['#65a30d', '#84cc16', '#f7fee7', '#ecfccb', '#d9f99d'],
    green: ['#16a34a', '#22c55e', '#f0fdf4', '#dcfce7', '#bbf7d0'],
    emerald: ['#059669', '#10b981', '#ecfdf5', '#d1fae5', '#a7f3d0'],
    teal: ['#0d9488', '#14b8a6', '#f0fdfa', '#ccfbf1', '#99f6e4'],
    cyan: ['#0891b2', '#06b6d4', '#ecfeff', '#cffafe', '#a5f3fc'],
    sky: ['#0284c7', '#0ea5e9', '#f0f9ff', '#e0f2fe', '#bae6fd'],
    blue: ['#2563eb', '#3b82f6', '#eff6ff', '#dbeafe', '#bfdbfe'],
    indigo: ['#4f46e5', '#6366f1', '#eef2ff', '#e0e7ff', '#c7d2fe'],
    violet: ['#7c3aed', '#8b5cf6', '#f5f3ff', '#ede9fe', '#ddd6fe'],
    purple: ['#9333ea', '#a855f7', '#faf5ff', '#f3e8ff', '#e9d5ff'],
    fuchsia: ['#c026d3', '#d946ef', '#fdf4ff', '#fae8ff', '#f5d0fe'],
    pink: ['#db2777', '#ec4899', '#fdf2f8', '#fce7f3', '#fbcfe8'],
    rose: ['#e11d48', '#f43f5e', '#fff1f2', '#ffe4e6', '#fecdd3']
};

let css = '';
for (const [name, [p, s, bg, m, sg]] of Object.entries(configs)) {
    css += `\n  [data-theme='${name}'] {\n    --theme-primary: ${p};\n    --theme-secondary: ${s};\n    --theme-bg: ${bg};\n    --theme-mint: ${m};\n    --theme-sage: ${sg};\n  }`;
}

let content = fs.readFileSync('src/index.css', 'utf8');
content = content.replace(/\[data-theme='emerald'\][\s\S]*?\[data-theme='purple'\][^}]*}/, css.trim() + '\n');
fs.writeFileSync('src/index.css', content);
console.log('Done generating CSS attributes');
