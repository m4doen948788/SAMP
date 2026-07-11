const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

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
    
    // 1. Kamus singkatan
    if (ABBREVIATIONS.has(upperWord)) {
      return word.toUpperCase();
    }
    
    // 2. Deteksi konsonan tanpa vokal (singkatan dinamis)
    const hasVowels = /[aeiouyAEIOUY]/i.test(cleanWord);
    const isOnlyAlphabetic = /^[a-zA-Z]+$/.test(cleanWord);
    if (isOnlyAlphabetic && !hasVowels && cleanWord.length >= 2) {
      return word.toUpperCase();
    }
    
    // 3. Mode A (Mixed Case)
    if (!isAllUpperCase) {
      const isOriginallyAllCaps = word === word.toUpperCase();
      if (isOriginallyAllCaps && word.length >= 2 && word.length <= 5) {
        return word;
      }
    }
    
    // 4. Title Case default
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  });
  
  return formattedWords.filter(Boolean).join(' ') + ext.toLowerCase();
};

async function cleanDatabaseFilenames() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD || process.env.DB_PASS,
        database: process.env.DB_NAME,
        waitForConnections: true,
        connectionLimit: 5
    });

    try {
        console.log('🔄 Memulai proses perapihan nama berkas di database...');
        const [rows] = await pool.query('SELECT id, nama_file FROM dokumen_upload WHERE is_deleted = 0');
        console.log(`Found ${rows.length} active documents to process.`);

        let updatedCount = 0;
        for (const row of rows) {
            const originalName = row.nama_file;
            const cleanedName = formatFilename(originalName);

            if (originalName !== cleanedName) {
                await pool.query('UPDATE dokumen_upload SET nama_file = ? WHERE id = ?', [cleanedName, row.id]);
                console.log(`ID ${row.id}: "${originalName}" ➔ "${cleanedName}"`);
                updatedCount++;
            }
        }
        console.log(`\n✅ Selesai! Berhasil merapikan ${updatedCount} nama dokumen di database.`);
    } catch (err) {
        console.error('Error cleaning filenames:', err);
    } finally {
        await pool.end();
    }
}

cleanDatabaseFilenames();
