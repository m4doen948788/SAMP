const ExcelJS = require('exceljs');
const path = require('path');

async function peek() {
    const workbook = new ExcelJS.Workbook();
    const filePath = path.join(__dirname, 'KODEFIKASI SIPD KEMENDAGRI 900.1.15.5-3406-24+Pemutakhiran.xlsx');
    await workbook.xlsx.readFile(filePath);
    const worksheet = workbook.worksheets.find(s => s.name === 'ALL') || workbook.worksheets[0];
    
    console.log('--- Lines for Urusan 10 ---');
    let count = 0;
    for (let i = 3; i <= worksheet.rowCount; i++) {
        const row = worksheet.getRow(i);
        const codeU = row.getCell(2).text.trim();
        const codeB = row.getCell(3).text.trim();
        const codeP = row.getCell(4).text.trim();
        const name = row.getCell(7).text.trim();
        
        if (codeU === '10' || codeU === '01') {
            console.log(`Row ${i}: U=${codeU}, B=${codeB}, P=${codeP}, Name=${name}`);
            count++;
            if (count > 5) break; 
        }
    }
    process.exit(0);
}
peek();
