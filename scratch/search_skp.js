const fs = require('fs');
const readline = require('readline');

async function processLineByLine() {
    const fileStream = fs.createReadStream('C:/Users/HP/.gemini/antigravity/brain/1b287080-561c-474b-b4f0-a4f2e2ed08d4/.system_generated/logs/transcript.jsonl');
    
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    for await (const line of rl) {
        if (!line.trim()) continue;
        try {
            const stepObj = JSON.parse(line);
            const lineStr = JSON.stringify(stepObj);
            if (lineStr.toLowerCase().includes('skpsummary.tsx')) {
                console.log(`Step ${stepObj.step_index}: Type: ${stepObj.type}, Keys: ${Object.keys(stepObj).join(', ')}`);
            }
        } catch (e) {
            // Ignore
        }
    }
}

processLineByLine();
