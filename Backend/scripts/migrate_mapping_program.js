const pool = require('./src/config/db');

async function migrate() {
    try {
        console.log('Adding program_id to mapping_urusan_instansi...');
        
        // 1. Check if column already exists
        const [columns] = await pool.query("SHOW COLUMNS FROM mapping_urusan_instansi LIKE 'program_id'");
        
        if (columns.length === 0) {
            await pool.query("ALTER TABLE mapping_urusan_instansi ADD COLUMN program_id INT NULL AFTER urusan_id");
            console.log('Column program_id added.');
            
            await pool.query("ALTER TABLE mapping_urusan_instansi ADD CONSTRAINT fk_mapping_program FOREIGN KEY (program_id) REFERENCES master_program(id) ON DELETE CASCADE");
            console.log('Foreign key constraint added.');
        } else {
            console.log('Column program_id already exists.');
        }

        console.log('Migration successful.');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err.message);
        process.exit(1);
    }
}

migrate();
