const fs = require('fs');
const path = require('path');

const targetSteps = [1403, 1405, 1407, 1477, 1479, 1497, 1501];

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
        
        let toolName = "";
        let targetFile = "";
        let description = "";
        
        if (stepObj.tool_calls && stepObj.tool_calls.length > 0) {
            const tc = stepObj.tool_calls[0];
            toolName = tc.name;
            targetFile = tc.args.TargetFile || "";
            description = tc.args.Description || tc.args.Instruction || "";
        } else {
            // parse from content
            const lines = content.split('\n');
            const toolLine = lines.find(l => l.includes('Tool Name:') || l.includes('made by the'));
            const targetLine = lines.find(l => l.includes('TargetFile') || l.includes('to:'));
            toolName = toolLine || "Unknown";
            targetFile = targetLine || "Unknown";
        }
        
        console.log(`=== Step ${step} ===`);
        console.log(`Tool: ${toolName}`);
        console.log(`File: ${targetFile}`);
        console.log(`Desc: ${description}`);
        console.log();
    } catch (e) {
        console.error('Error reading', file, e);
    }
});
