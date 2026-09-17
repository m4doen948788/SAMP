const pool = require('../../src/config/db');

const up = async () => {
    console.log('[013] Altering table "surat" to make "nomor_surat" nullable...');
    await pool.query('ALTER TABLE surat MODIFY COLUMN nomor_surat VARCHAR(100) NULL');
    console.log('[013] Column "nomor_surat" in table "surat" is now nullable.');
    process.exit(0);
};

up().catch(err => {
    console.error('[013] Migration failed:', err.message);
    process.exit(1);
});
