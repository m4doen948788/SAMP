const pool = require('../src/config/db');

async function migrate() {
    try {
        console.log('Starting migration to add penanggung_jawab_id to mapping tables...');

        const tables = [
            'mapping_program_instansi',
            'mapping_kegiatan_instansi',
            'mapping_sub_kegiatan_instansi'
        ];

        for (const table of tables) {
            // Check if column exists
            const [columns] = await pool.query(`
                SELECT COLUMN_NAME 
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_SCHEMA = DATABASE() 
                  AND TABLE_NAME = ? 
                  AND COLUMN_NAME = 'penanggung_jawab_id'
            `, [table]);

            if (columns.length === 0) {
                console.log(`Adding penanggung_jawab_id column to ${table}...`);
                
                // Add column
                await pool.query(`
                    ALTER TABLE ${table} 
                    ADD COLUMN penanggung_jawab_id INT NULL
                `);
                
                // Add constraint name uniquely based on table name
                const constraintName = `fk_${table.substring(0, 15)}_pegawai`;
                
                console.log(`Adding foreign key constraint ${constraintName} to ${table}...`);
                await pool.query(`
                    ALTER TABLE ${table}
                    ADD CONSTRAINT ${constraintName} 
                    FOREIGN KEY (penanggung_jawab_id) REFERENCES profil_pegawai(id) 
                    ON DELETE SET NULL
                `);
                
                console.log(`Successfully migrated ${table}.`);
            } else {
                console.log(`Column penanggung_jawab_id already exists in ${table}. Skipping.`);
            }
        }

        console.log('Migration completed successfully!');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

migrate();
