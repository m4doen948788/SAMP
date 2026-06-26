const fs = require('fs');
const readline = require('readline');

async function processLineByLine() {
    const fileStream = fs.createReadStream('C:/Users/HP/.gemini/antigravity/brain/bdd6f237-d632-40aa-837b-26005b43efad/.system_generated/logs/transcript_full.jsonl');
    
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    for await (const line of rl) {
        if (!line.trim()) continue;
        try {
            const stepObj = JSON.parse(line);
            if (stepObj.tool_calls) {
                for (const tc of stepObj.tool_calls) {
                    if (tc.args && tc.args.TargetFile) {
                        const targetFile = tc.args.TargetFile.replace(/\\/g, '/');
                        if (targetFile.endsWith('SkpSummary.tsx')) {
                            console.log(`Step ${stepObj.step_index}: Tool: ${tc.name}`);
                        }
                    }
                }
            }
        } catch (e) {
            // Ignore
        }
    }
}

processLineByLine();
