const ExcelJS = require('exceljs');
const path = require('path');

async function checkSheets() {
    const workbook = new ExcelJS.Workbook();
    const filePath = path.join(__dirname, 'KODEFIKASI SIPD KEMENDAGRI 900.1.15.5-3406-24+Pemutakhiran.xlsx');
    await workbook.xlsx.readFile(filePath);
    
    console.log('--- Sheet Names ---');
    workbook.worksheets.forEach((s, idx) => {
        console.log(`[${idx}] ${s.name}`);
    });
    
    const ws = workbook.worksheets[0];
    console.log('\n--- Sheet 0 First 10 Rows ---');
    for (let i = 1; i <= 10; i++) {
        console.log(`Row ${i} Col 2: ${ws.getRow(i).getCell(2).text}`);
    }
    process.exit(0);
}
checkSheets();
