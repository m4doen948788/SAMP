const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const filePath = path.join(__dirname, 'Permendagri Nomor 83 Tahun 2022.xlsx');

try {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Read raw rows
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    const output = {
        sheetName,
        totalRows: data.length,
        sample: data.slice(0, 100)
    };
    
    fs.writeFileSync('excel_data_sample.json', JSON.stringify(output, null, 2));
    console.log('Successfully wrote sample to excel_data_sample.json');
} catch (err) {
    console.error('Error reading excel file:', err);
    process.exit(1);
}
