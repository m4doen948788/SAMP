/**
 * Migration: Update role and status enums in surat_approvals table
 */

async function up(connection) {
    console.log('Running migration: 010_update_surat_approvals_enums');
    
    try {
        console.log('Altering surat_approvals.role enum column...');
        await connection.query(`
            ALTER TABLE surat_approvals 
            MODIFY COLUMN role ENUM('pengusul', 'ketua_tim', 'kabid', 'sekretaris', 'kaban') NOT NULL
        `);
        console.log('✅ Altered role column successfully.');
    } catch (err) {
        console.error('❌ Failed to alter role column:', err.message);
        throw err;
    }

    try {
        console.log('Altering surat_approvals.status enum column...');
        await connection.query(`
            ALTER TABLE surat_approvals 
            MODIFY COLUMN status ENUM('PENDING', 'APPROVED', 'REJECTED', 'RETURNED', 'BYPASSED') DEFAULT 'PENDING'
        `);
        console.log('✅ Altered status column successfully.');
    } catch (err) {
        console.error('❌ Failed to alter status column:', err.message);
        throw err;
    }
}

async function down(connection) {
    // Reverse migration
}

// Self-execution block
if (require.main === module) {
    const db = require('../../../src/config/db');
    up(db).then(() => {
        console.log('Migration 010 completed successfully.');
        process.exit(0);
    }).catch(err => {
        console.error('Migration 010 failed:', err);
        process.exit(1);
    });
}

module.exports = { up, down };
