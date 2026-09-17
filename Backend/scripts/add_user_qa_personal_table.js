const pool = require('../src/config/db');

async function migrateUserQaPersonalTable() {
  try {
    console.log('Creating table user_qa_personal if not exists...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_qa_personal (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        aplikasi_external_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_user_app (user_id, aplikasi_external_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('✅ Table user_qa_personal successfully created/verified.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
}

migrateUserQaPersonalTable();
