const fs = require('fs');
const path = require('path');

const targetSteps = [1331, 1405, 1407];

targetSteps.forEach(step => {
    const file = `prev_step_${step}.json`;
    const filePath = path.join('d:/SAMP/scratch', file);
    if (!fs.existsSync(filePath)) {
        console.log(`${file} does not exist`);
        return;
    }
    try {
        const stepObj = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        const content = stepObj.content;
        
        if (content.includes('SkpSummary.tsx')) {
            console.log(`=== ${file} ===`);
            const lines = content.split('\n');
            let inDiff = false;
            let diffLines = [];
            lines.forEach(l => {
                if (l.includes('[diff_block_start]')) inDiff = true;
                if (inDiff) diffLines.push(l);
                if (l.includes('[diff_block_end]')) inDiff = false;
            });
            if (diffLines.length > 0) {
                console.log(diffLines.join('\n'));
            } else {
                console.log(content.substring(0, 500));
            }
            console.log('\n');
        }
    } catch (e) {
        console.error('Error reading', file, e);
    }
});
