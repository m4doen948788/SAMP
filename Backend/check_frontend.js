const fs = require('fs');
const path = require('path');

const distPath = path.join(__dirname, '../Frontend/dist/assets');
if (!fs.existsSync(distPath)) {
  console.log('Frontend/dist/assets does not exist at:', distPath);
  process.exit(1);
}

const files = fs.readdirSync(distPath);
const skpSummaryFiles = files.filter(f => f.startsWith('SkpSummary-') && f.endsWith('.js'));

console.log('Found SkpSummary built files:', skpSummaryFiles);

skpSummaryFiles.forEach(file => {
  const filePath = path.join(distPath, file);
  const content = fs.readFileSync(filePath, 'utf8');
  const containsSome = content.includes('.some((p') || content.includes('.some(');
  console.log(`File: ${file} | contains .some: ${containsSome}`);
});
