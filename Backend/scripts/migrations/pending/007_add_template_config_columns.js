/**
 * Migration: Add configuration columns to master_jenis_surat
 * These columns are required for the new template structure (tujuan, pembuka, etc.)
 */

async function up(connection) {
    console.log('Running migration: 007_add_template_config_columns');
    
    // List of columns to add to master_jenis_surat
    const columns = [
        { name: 'has_tujuan', type: 'TINYINT(1) DEFAULT 0' },
        { name: 'has_pembuka', type: 'TINYINT(1) DEFAULT 0' },
        { name: 'has_identitas_pegawai', type: 'TINYINT(1) DEFAULT 0' },
        { name: 'has_detail_cuti', type: 'TINYINT(1) DEFAULT 0' },
        { name: 'has_penutup', type: 'TINYINT(1) DEFAULT 0' },
        { name: 'is_pegawai_required', type: 'TINYINT(1) DEFAULT 0' },
        { name: 'is_nomor_surat_required', type: 'TINYINT(1) DEFAULT 0' },
        { name: 'is_kop_surat_required', type: 'TINYINT(1) DEFAULT 0' },
        { name: 'logo_path', type: 'VARCHAR(255) DEFAULT NULL' },
        { name: 'line_height', type: 'DECIMAL(4,2) DEFAULT 1.15' },
        { name: 'text_align', type: 'VARCHAR(20) DEFAULT "justify"' },
        { name: 'master_dokumen_id', type: 'INT DEFAULT NULL' },
        { name: 'kop_line_style', type: 'VARCHAR(50) DEFAULT "double"' },
        { name: 'has_event_details', type: 'TINYINT(1) DEFAULT 0' },
        { name: 'use_global_settings', type: 'TINYINT(1) DEFAULT 1' },
        { name: 'paragraph_spacing_before', type: 'INT DEFAULT 0' },
        { name: 'paragraph_spacing_after', type: 'INT DEFAULT 0' },
        { name: 'first_line_indent', type: 'INT DEFAULT 0' }
    ];

    for (const col of columns) {
        try {
            // Check if column exists first to avoid error
            const [check] = await connection.query(`
                SELECT COUNT(*) as count 
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_SCHEMA = DATABASE() 
                AND TABLE_NAME = 'surat_templates' 
                AND COLUMN_NAME = ?
            `, [col.name]);

            if (check[0].count === 0) {
                console.log(`Adding column ${col.name} to surat_templates...`);
                await connection.query(`ALTER TABLE surat_templates ADD COLUMN ${col.name} ${col.type}`);
            }
        } catch (err) {
            console.error(`Error adding column ${col.name}:`, err.message);
            // Continue with other columns even if one fails
        }
    }
}

async function down(connection) {
    // Optional: logic to remove columns if needed
}

// --- SELF-EXECUTION BLOCK FOR OLD RUNNERS ---
if (require.main === module) {
    const db = require('../../../src/config/db');
    up(db).then(() => {
        console.log('Migration 007 completed successfully.');
        process.exit(0);
    }).catch(err => {
        console.error('Migration 007 failed:', err);
        process.exit(1);
    });
}

module.exports = { up, down };
