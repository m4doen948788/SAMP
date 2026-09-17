/**
 * Migration: Add signature and paraf image columns to profil_pegawai
 */

async function up(connection) {
    console.log('Running migration: 008_add_signature_columns');
    
    const columns = [
        { name: 'signature_image', type: 'VARCHAR(255) DEFAULT NULL' },
        { name: 'paraf_image', type: 'VARCHAR(255) DEFAULT NULL' }
    ];

    for (const col of columns) {
        try {
            const [check] = await connection.query(`
                SELECT COUNT(*) as count 
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_SCHEMA = DATABASE() 
                AND TABLE_NAME = 'profil_pegawai' 
                AND COLUMN_NAME = ?
            `, [col.name]);

            if (check[0].count === 0) {
                console.log(`Adding column ${col.name} to profil_pegawai...`);
                await connection.query(`ALTER TABLE profil_pegawai ADD COLUMN ${col.name} ${col.type}`);
            }
        } catch (err) {
            console.error(`Error adding column ${col.name}:`, err.message);
        }
    }
}

async function down(connection) {
}

// Self-execution block
if (require.main === module) {
    const db = require('../../../src/config/db');
    up(db).then(() => {
        console.log('Migration 008 completed successfully.');
        process.exit(0);
    }).catch(err => {
        console.error('Migration 008 failed:', err);
        process.exit(1);
    });
}

module.exports = { up, down };
