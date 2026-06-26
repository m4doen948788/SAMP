const fs = require('fs');
const path = require('path');

function searchDir(dir, query) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (file === 'node_modules' || file === '.git' || file === '.vite') continue;
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            searchDir(fullPath, query);
        } else {
            if (file.endsWith('.js') || file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.json')) {
                const content = fs.readFileSync(fullPath, 'utf8');
                if (content.includes(query)) {
                    console.log(`FOUND in file: ${fullPath}`);
                }
            }
        }
    }
}

searchDir('D:/nayaxaAI', 'File tidak ditemukan di server');
