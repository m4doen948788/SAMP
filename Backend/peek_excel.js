const ExcelJS = require('exceljs');
const path = require('path');

async function readExcel() {
    const workbook = new ExcelJS.Workbook();
    const filePath = path.join(__dirname, 'KODEFIKASI SIPD KEMENDAGRI 900.1.15.5-3406-24+Pemutakhiran.xlsx');
    await workbook.xlsx.readFile(filePath);
    const worksheet = workbook.worksheets[0]; // Assuming first sheet
    
    console.log('Sheet Name:', worksheet.name);
    console.log('Row 1 (Headers maybe):', worksheet.getRow(1).values);
    console.log('Row 2:', worksheet.getRow(2).values);
    console.log('Row 3:', worksheet.getRow(3).values);
    console.log('Row 4:', worksheet.getRow(4).values);
    console.log('Row 5:', worksheet.getRow(5).values);
}

readExcel().catch(console.error);
