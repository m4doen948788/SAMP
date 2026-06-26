const fs = require('fs');
const readline = require('readline');

async function findEdits() {
    const fileStream = fs.createReadStream('C:/Users/HP/.gemini/antigravity/brain/1b287080-561c-474b-b4f0-a4f2e2ed08d4/.system_generated/logs/transcript_full.jsonl');
    
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    for await (const line of rl) {
        if (!line.trim()) continue;
        try {
            const stepObj = JSON.parse(line);
            if (stepObj.step_index >= 1290 && stepObj.step_index <= 1310) {
                if (stepObj.tool_calls) {
                    for (const tc of stepObj.tool_calls) {
                        if (tc.args && tc.args.TargetFile && tc.args.TargetFile.replace(/\\/g, '/').endsWith('SkpSummary.tsx')) {
                            console.log(`Step ${stepObj.step_index}: Tool ${tc.name}`);
                            if (tc.name === 'replace_file_content') {
                                console.log(`  StartLine: ${tc.args.StartLine}, EndLine: ${tc.args.EndLine}`);
                                console.log(`  TargetContent:\n${tc.args.TargetContent}\n`);
                                console.log(`  ReplacementContent:\n${tc.args.ReplacementContent}\n`);
                            } else if (tc.name === 'multi_replace_file_content') {
                                tc.args.ReplacementChunks.forEach((chunk, i) => {
                                    console.log(`  Chunk ${i}: StartLine: ${chunk.StartLine}, EndLine: ${chunk.EndLine}`);
                                    console.log(`  TargetContent:\n${chunk.TargetContent}\n`);
                                    console.log(`  ReplacementContent:\n${chunk.ReplacementContent}\n`);
                                });
                            }
                        }
                    }
                }
            }
        } catch (e) {
            // Ignore
        }
    }
}

findEdits();
