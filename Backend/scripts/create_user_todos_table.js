const db = require('../src/config/db');

async function createUserTodosTable() {
  try {
    console.log('[Migration] Checking user_todos table...');
    await db.query(`
      CREATE TABLE IF NOT EXISTS user_todos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        parent_id INT NULL DEFAULT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT NULL,
        is_completed TINYINT(1) DEFAULT 0,
        due_date DATE NULL,
        priority ENUM('LOW', 'MEDIUM', 'HIGH') DEFAULT 'MEDIUM',
        urutan INT DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_user_todos_user (user_id),
        INDEX idx_user_todos_parent (parent_id),
        INDEX idx_user_todos_completed (user_id, is_completed),
        INDEX idx_user_todos_due (user_id, due_date)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    const [parentCol] = await db.query(`SHOW COLUMNS FROM user_todos LIKE 'parent_id'`);
    if (parentCol.length === 0) {
      await db.query(`ALTER TABLE user_todos ADD COLUMN parent_id INT NULL DEFAULT NULL AFTER user_id, ADD INDEX idx_user_todos_parent (parent_id)`);
      console.log('✅ [Migration] Column parent_id added to user_todos successfully.');
    }

    console.log('✅ [Migration] Table user_todos is verified/created successfully.');
    process.exit(0);
  } catch (err) {
    console.error('❌ [Migration] Error creating user_todos table:', err.message);
    process.exit(1);
  }
}

createUserTodosTable();
