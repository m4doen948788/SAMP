const fs = require('fs');

function view(file) {
    console.log(`=== ${file} ===`);
    const lines = fs.readFileSync(file, 'utf8').split('\n');
    lines.forEach((line, idx) => {
        if (line.includes('copy-dashboard')) {
            console.log(`${idx + 1}: ${line}`);
        }
    });
}

view('D:/nayaxaAI/Backend/src/services/codeAgentService.js');
view('D:/nayaxaAI/Backend/src/services/nayaxaMindService.js');
