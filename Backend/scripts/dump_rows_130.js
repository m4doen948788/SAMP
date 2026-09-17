const ExcelJS = require('exceljs');
const path = require('path');

async function dump130() {
    const workbook = new ExcelJS.Workbook();
    const filePath = path.join(__dirname, 'KODEFIKASI SIPD KEMENDAGRI 900.1.15.5-3406-24+Pemutakhiran.xlsx');
    await workbook.xlsx.readFile(filePath);
    const worksheet = workbook.worksheets.find(s => s.name === 'ALL') || workbook.worksheets[0];
    
    console.log('--- Row 120 to 135 ---');
    for (let i = 120; i <= 135; i++) {
        const row = worksheet.getRow(i);
        console.log(`Row ${i}:`, row.values);
    }
    process.exit(0);
}
dump130();
