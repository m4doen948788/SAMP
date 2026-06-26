const fs = require('fs');
const readline = require('readline');

async function extractPrevSteps() {
    const fileStream = fs.createReadStream('C:/Users/HP/.gemini/antigravity/brain/1b287080-561c-474b-b4f0-a4f2e2ed08d4/.system_generated/logs/transcript_full.jsonl');
    
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    for await (const line of rl) {
        if (!line.trim()) continue;
        try {
            const stepObj = JSON.parse(line);
            if (stepObj.step_index >= 1200 && stepObj.step_index <= 1520) {
                if (stepObj.type === 'CODE_ACTION') {
                    console.log(`Step ${stepObj.step_index} was a CODE_ACTION. Description/Content starts with: ${stepObj.content.substring(0, 150)}`);
                    fs.writeFileSync(`d:/SAMP/scratch/prev_step_${stepObj.step_index}.json`, JSON.stringify(stepObj, null, 2), 'utf8');
                }
            }
        } catch (e) {
            // Ignore
        }
    }
}

extractPrevSteps();
