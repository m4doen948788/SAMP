const ExcelJS = require('exceljs');
const path = require('path');

async function dump() {
    const workbook = new ExcelJS.Workbook();
    const filePath = path.join(__dirname, 'KODEFIKASI SIPD KEMENDAGRI 900.1.15.5-3406-24+Pemutakhiran.xlsx');
    await workbook.xlsx.readFile(filePath);
    const worksheet = workbook.worksheets.find(s => s.name === 'ALL') || workbook.worksheets[0];
    
    console.log('--- First 10 Rows ---');
    for (let i = 1; i <= 10; i++) {
        const row = worksheet.getRow(i);
        console.log(`Row ${i}:`, row.values);
    }
    process.exit(0);
}
dump();
