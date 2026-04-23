
const fs = require('fs');
const path = require('path');

const indexContent = fs.readFileSync('src/index.js', 'utf8');
const lines = indexContent.split('\n');
const requireLines = lines.filter(l => l.includes("require('./routes/"));

console.log(`Checking ${requireLines.length} routes...`);

requireLines.forEach(line => {
    const match = line.match(/require\('(\.\/routes\/[^']*)'\)/);
    if (match) {
        const routePath = match[1];
        const fullPath = path.join('src', routePath + '.js');
        if (!fs.existsSync(fullPath)) {
            console.error(`❌ MISSING: ${fullPath}`);
        } else {
            // console.log(`✅ OK: ${fullPath}`);
        }
    }
});

console.log('Done.');
