const ExcelJS = require('exceljs');
const path = require('path');

async function peekNames() {
    const workbook = new ExcelJS.Workbook();
    const filePath = path.join(__dirname, 'KODEFIKASI SIPD KEMENDAGRI 900.1.15.5-3406-24+Pemutakhiran.xlsx');
    await workbook.xlsx.readFile(filePath);
    const worksheet = workbook.worksheets.find(s => s.name === 'ALL') || workbook.worksheets[0];
    
    console.log('--- Seeking Urusan Names ---');
    for (let i = 3; i <= 200; i++) {
        const row = worksheet.getRow(i);
        const codeU = row.getCell(2).text.trim();
        const codeB = row.getCell(3).text.trim();
        const name = row.getCell(7).text.trim();
        
        if (codeU && !codeB && name) {
            console.log(`Row ${i}: U=${codeU}, B=${codeB}, Name=${name}`);
        }
    }
    process.exit(0);
}
peekNames();
