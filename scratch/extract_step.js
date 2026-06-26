const fs = require('fs');
const readline = require('readline');

async function extractSteps() {
    const fileStream = fs.createReadStream('C:/Users/HP/.gemini/antigravity/brain/1b287080-561c-474b-b4f0-a4f2e2ed08d4/.system_generated/logs/transcript_full.jsonl');
    
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    const targetSteps = [1816, 1824];
    for await (const line of rl) {
        if (!line.trim()) continue;
        try {
            const stepObj = JSON.parse(line);
            if (targetSteps.includes(stepObj.step_index)) {
                fs.writeFileSync(`d:/SAMP/scratch/step_${stepObj.step_index}.json`, JSON.stringify(stepObj, null, 2), 'utf8');
                console.log(`Successfully extracted Step ${stepObj.step_index}`);
            }
        } catch (e) {
            console.error('Error parsing line:', e);
        }
    }
}

extractSteps();
