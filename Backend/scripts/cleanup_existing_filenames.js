const mysql = require('mysql2/promise');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

const envPaths = [
    path.join(__dirname, '../.env'),
    path.join(__dirname, '../../.env'),
    path.join(__dirname, '.env')
];

let envLoaded = false;
for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
        dotenv.config({ path: envPath });
        envLoaded = true;
        break;
    }
}
if (!envLoaded) dotenv.config();

const ABBREVIATIONS = new Set([
  'SKP', 'FGD', 'IPB', 'RPJMD', 'RKPD', 'RPJMN', 'DAU', 'BAPPERIDA', 'BAPPEDA', 
  'TBC', 'PNS', 'PPPK', 'BA', 'DAP', 'PIP', 'SG', 'KAB', 'RKA', 'APBD', 'OPD', 
  'DPA', 'SIPD', 'LKPJ', 'LPPD', 'KUA', 'PPAS', 'WP', 'SWP', 'SK', 'ASN', 
  'PLT', 'PJ', 'DPD', 'DPRD', 'DPR', 'UPTD', 'BOS', 'PPA'
]);

const formatFilename = (name) => {
  if (!name) return '';
  
  const extIdx = name.lastIndexOf('.');
  let baseName = extIdx !== -1 ? name.substring(0, extIdx) : name;
  const ext = extIdx !== -1 ? name.substring(extIdx) : '';
  
  baseName = baseName.replace(/\s+/g, ' ').trim();
  
  const isAllUpperCase = baseName === baseName.toUpperCase();
  const words = baseName.split(' ');
  
  const formattedWords = words.map(word => {
    if (word.length === 0) return '';
    
    const cleanWord = word.replace(/[^a-zA-Z0-9]/g, '');
    const upperWord = cleanWord.toUpperCase();
    
    if (ABBREVIATIONS.has(upperWord)) {
      return word.toUpperCase();
    }
    
    const hasVowels = /[aeiouyAEIOUY]/i.test(cleanWord);
    const isOnlyAlphabetic = /^[a-zA-Z]+$/.test(cleanWord);
    if (isOnlyAlphabetic && !hasVowels && cleanWord.length >= 2) {
      return word.toUpperCase();
    }
    
    if (!isAllUpperCase) {
      const isOriginallyAllCaps = word === word.toUpperCase();
      if (isOriginallyAllCaps && word.length >= 2 && word.length <= 5) {
        return word;
      }
    }
    
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  });
  
  return formattedWords.filter(Boolean).join(' ') + ext.toLowerCase();
};

async function run() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'dashboard_ppm',
    });

    try {
        console.log('🔄 Fetching all active files from database...');
        const [rows] = await pool.query('SELECT id, nama_file FROM dokumen_upload WHERE is_deleted = 0');
        console.log(`Found ${rows.length} files. Checking for capitalization styling adjustments...`);

        let updateCount = 0;
        for (const row of rows) {
            const formatted = formatFilename(row.nama_file);
            if (row.nama_file !== formatted) {
                console.log(`✏️ Updating ID ${row.id}:`);
                console.log(`   Sebelum: "${row.nama_file}"`);
                console.log(`   Sesudah: "${formatted}"`);
                await pool.query('UPDATE dokumen_upload SET nama_file = ? WHERE id = ?', [formatted, row.id]);
                updateCount++;
            }
        }

        console.log(`\n🎉 Done! Successfully cleaned up and formatted ${updateCount} filenames in the database.`);
    } catch (err) {
        console.error('Error during cleanup:', err);
    } finally {
        await pool.end();
    }
}

run();
