const ExcelJS = require('exceljs');
const path = require('path');

async function peekRow() {
    const workbook = new ExcelJS.Workbook();
    const filePath = path.join(__dirname, 'KODEFIKASI SIPD KEMENDAGRI 900.1.15.5-3406-24+Pemutakhiran.xlsx');
    await workbook.xlsx.readFile(filePath);
    const worksheet = workbook.worksheets.find(s => s.name === 'ALL') || workbook.worksheets[0];
    
    console.log('--- Full Row Data for 01 ---');
    for (let i = 3; i <= 200; i++) {
        const row = worksheet.getRow(i);
        const codeU = row.getCell(2).text.trim();
        const codeB = row.getCell(3).text.trim();
        
        if (codeU === '01' && !codeB) {
            console.log(`Row ${i} values:`, row.values);
            break;
        }
    }
    process.exit(0);
}
peekRow();
