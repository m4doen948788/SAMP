const ExcelJS = require('exceljs');
const path = require('path');

async function peekExcel() {
    const workbook = new ExcelJS.Workbook();
    const filePath = path.join(__dirname, 'KODEFIKASI SIPD KEMENDAGRI 900.1.15.5-3406-24+Pemutakhiran.xlsx');
    await workbook.xlsx.readFile(filePath);
    const worksheet = workbook.worksheets.find(s => s.name === 'ALL') || workbook.worksheets[0];
    
    console.log('Sheet Name:', worksheet.name);
    for (let i = 1; i <= 100; i++) {
        const row = worksheet.getRow(i);
        const values = row.values;
        if (values.some(v => v && v.toString().includes('X'))) {
            console.log(`Row ${i}:`, JSON.stringify(values));
        }
    }
    process.exit(0);
}

peekExcel();
