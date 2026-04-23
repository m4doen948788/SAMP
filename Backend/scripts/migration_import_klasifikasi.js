const XLSX = require('xlsx');
const path = require('path');
const pool = require('./src/config/db');

async function migrate() {
    const filePath = path.join(__dirname, 'Permendagri Nomor 83 Tahun 2022.xlsx');
    
    try {
        const workbook = XLSX.readFile(filePath);
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        console.log(`Read ${data.length} rows from Excel.`);
        
        const preparedData = [];
        const errors = [];
        
        // Regex to match code (numbers and dots) followed by space and then description
        // Example: "00.1.2            Lambang kabupaten/kota"
        const regex = /^([0-9.]+)\s+([\s\S]+)$/;
        
        for (let i = 0; i < data.length; i++) {
            const row = data[i];
            if (!row || row.length === 0 || !row[0]) continue;
            
            const rawString = String(row[0]).trim();
            const match = rawString.match(regex);
            
            if (match) {
                const kode = match[1].trim();
                const nama = match[2].trim().replace(/\s+/g, ' '); // Clean internal multiple spaces
                const level = (kode.match(/\./g) || []).length + 1;
                
                preparedData.push([kode, nama, level]);
            } else {
                // Check if it's just a top level code like "00       UMUM" (multiple spaces)
                const simpleSplit = rawString.split(/\s{2,}/);
                if (simpleSplit.length >= 2) {
                    const kode = simpleSplit[0].trim();
                    const nama = simpleSplit[1].trim().replace(/\s+/g, ' ');
                    const level = (kode.match(/\./g) || []).length + 1;
                    preparedData.push([kode, nama, level]);
                } else {
                    errors.push({ row: i, content: rawString });
                }
            }
        }
        
        console.log(`Parsed ${preparedData.length} valid rows.`);
        if (errors.length > 0) {
            console.warn(`Could not parse ${errors.length} rows. Samples:`, errors.slice(0, 5));
        }
        
        // Batch Insert
        if (preparedData.length > 0) {
            console.log('Inserting into database in batches...');
            const batchSize = 500;
            for (let i = 0; i < preparedData.length; i += batchSize) {
                const batch = preparedData.slice(i, i + batchSize);
                await pool.query(
                    'INSERT IGNORE INTO master_klasifikasi_arsip (kode, nama, level) VALUES ?',
                    [batch]
                );
                console.log(`Inserted batch ${Math.floor(i / batchSize) + 1} / ${Math.ceil(preparedData.length / batchSize)}`);
            }
            console.log('✅ Import completed successfully.');
        }

    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        process.exit(0);
    }
}

migrate();
