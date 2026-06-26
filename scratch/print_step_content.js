const fs = require('fs');

const steps = [1497, 1501];
steps.forEach(step => {
    const file = `prev_step_${step}.json`;
    const data = JSON.parse(fs.readFileSync(`d:/SAMP/scratch/${file}`, 'utf8'));
    console.log(`=== Step ${step} ===`);
    console.log(data.content);
    console.log();
});
