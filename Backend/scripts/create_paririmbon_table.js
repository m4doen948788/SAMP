const pool = require('./src/config/db');

async function main() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS skp_paririmbon_links (
                id INT AUTO_INCREMENT PRIMARY KEY,
                tahun INT NOT NULL,
                bidang_id INT NOT NULL,
                is_contoh TINYINT(1) NOT NULL DEFAULT 0,
                link_url TEXT NOT NULL,
                updated_by INT,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY uq_paririmbon_link (tahun, bidang_id, is_contoh)
            )
        `);
        console.log('Table skp_paririmbon_links created/already exists!');
        
        // Also record to migration_history if not already there
        try {
            await pool.query(`
                INSERT IGNORE INTO migration_history (filename) VALUES (?)
            `, ['011_create_skp_paririmbon_links.js']);
            console.log('Migration recorded in history.');
        } catch (e) {
            console.log('Could not record to migration_history (table might not exist):', e.message);
        }
        
        process.exit(0);
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
}

main();
