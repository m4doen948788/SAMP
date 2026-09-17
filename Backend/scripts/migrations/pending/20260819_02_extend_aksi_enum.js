const pool = require('../../../src/config/db');

async function run() {
  try {
    console.log("Checking kegiatan_edit_history aksi column type...");
    const [cols] = await pool.query('SHOW COLUMNS FROM kegiatan_edit_history WHERE Field = "aksi"');
    const colDef = cols[0];
    
    // Check if 'mengabaikan dokumen' is already in ENUM
    const alreadyHasValue = colDef.Type.includes('mengabaikan dokumen');
    
    if (!alreadyHasValue) {
      console.log("Extending aksi ENUM to include 'mengabaikan dokumen'...");
      await pool.query(`
        ALTER TABLE kegiatan_edit_history 
        MODIFY COLUMN aksi ENUM('create','edit','delete','restore','mengabaikan dokumen') NOT NULL
      `);
      console.log("ENUM extended successfully!");
    } else {
      console.log("aksi ENUM already includes 'mengabaikan dokumen'.");
    }

    console.log('✅ Migration 20260819_02_extend_aksi_enum completed successfully.');
    process.exit(0);
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  }
}

run();
