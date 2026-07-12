const fs = require('fs');
const path = require('path');

// We will scan common directories for files matching the pattern of multer uploads:
// e.g., 177XXXXXXXXXX-XXXXXXXXX.ext
const multerPattern = /^\d{13}-\d+\.[a-zA-Z0-9]+$/;

const searchDirs = [
    '/var/www',
    '/home/ppm',
    '/tmp'
];

function scanDirectory(dir, depth = 0) {
    if (depth > 6) return []; // Prevent going too deep
    let results = [];
    try {
        if (!fs.existsSync(dir)) return [];
        const stats = fs.statSync(dir);
        if (!stats.isDirectory()) return [];

        const files = fs.readdirSync(dir);
        for (const file of files) {
            const fullPath = path.join(dir, file);
            try {
                const fileStats = fs.statSync(fullPath);
                if (fileStats.isDirectory()) {
                    // Skip node_modules and .git folders to save time
                    if (file === 'node_modules' || file === '.git' || file === 'cache') continue;
                    results = results.concat(scanDirectory(fullPath, depth + 1));
                } else if (fileStats.isFile()) {
                    if (multerPattern.test(file)) {
                        results.push({
                            name: file,
                            path: fullPath,
                            size: fileStats.size
                        });
                    }
                }
            } catch (e) {
                // Ignore permission or read errors for individual files
            }
        }
    } catch (err) {
        // Ignore read errors for directories
    }
    return results;
}

async function run() {
    console.log('🔍 Scanning server disk for any backup/lost uploaded files...');
    let allFound = [];
    for (const searchDir of searchDirs) {
        console.log(`Scanning ${searchDir}...`);
        const found = scanDirectory(searchDir);
        console.log(`Found ${found.length} files in ${searchDir}`);
        allFound = allFound.concat(found);
    }

    console.log('\n=== SCAN RESULTS ===');
    console.log(`Total uploads-like files found across server: ${allFound.length}`);
    
    // Group by filename to see if we have duplicates in other paths
    const groups = {};
    for (const file of allFound) {
        if (!groups[file.name]) groups[file.name] = [];
        groups[file.name].push(file.path);
    }

    // Print results
    for (const [name, paths] of Object.entries(groups)) {
        console.log(`- File: ${name}`);
        for (const p of paths) {
            console.log(`  📍 ${p}`);
        }
    }
}

run();
