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
            if (stepObj.tool_calls) {
                for (const tc of stepObj.tool_calls) {
                    if (tc.args && tc.args.TargetFile) {
                        const targetFile = tc.args.TargetFile.replace(/\\/g, '/');
                        if (targetFile.endsWith('SkpSummary.tsx')) {
                            console.log(`Step ${stepObj.step_index}: Tool: ${tc.name}. Description: ${tc.args.Description || tc.args.Instruction}`);
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
