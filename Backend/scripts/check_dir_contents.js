const fs = require('fs');
const path = require('path');

async function run() {
    const dir = '/home/ppm/uploads-ppm';
    console.log(`=== LISTING FILES IN ${dir} ===`);
    try {
        if (!fs.existsSync(dir)) {
            console.log('Directory does not exist!');
            return;
        }
        const files = fs.readdirSync(dir);
        console.log(`Total files found: ${files.length}`);
        console.log(files.slice(0, 50)); // Print first 50 files
    } catch (err) {
        console.error('Error:', err);
    }
}

run();
