const mysql = require('mysql2/promise');
require('dotenv').config();

async function run() {
  console.log('--- STARTING DATABASE DIAGNOSTICS FOR QUICK ACCESS ---');
  console.log('Env variables loaded:');
  console.log('- DB_HOST:', process.env.DB_HOST);
  console.log('- DB_USER:', process.env.DB_USER);
  console.log('- DB_NAME:', process.env.DB_NAME);
  console.log('- PORT:', process.env.PORT);

  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD || process.env.DB_PASS,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });

  try {
    const [rows] = await pool.query('SELECT 1 + 1 AS test');
    console.log('✅ Connection successful. Test query result:', rows[0].test);
  } catch (err) {
    console.error('❌ Connection failed:', err.message);
    process.exit(1);
  }

  // 1. Check user_qa_personal structure
  try {
    console.log('\n1. Checking table "user_qa_personal" columns...');
    const [cols] = await pool.query('DESCRIBE user_qa_personal');
    console.log('Columns found:');
    cols.forEach(col => {
      console.log(`- ${col.Field}: type=${col.Type}, null=${col.Null}, key=${col.Key}, default=${col.Default}`);
    });
  } catch (err) {
    console.error('❌ Failed to describe user_qa_personal table:', err.message);
  }

  // 2. Check unique keys
  try {
    console.log('\n2. Checking unique keys on "user_qa_personal"...');
    const [indexes] = await pool.query('SHOW INDEX FROM user_qa_personal');
    indexes.forEach(idx => {
      console.log(`- Index: name=${idx.Key_name}, column=${idx.Column_name}, unique=${!idx.Non_unique}`);
    });
  } catch (err) {
    console.error('❌ Failed to show indexes:', err.message);
  }

  // 3. Test insert/upsert query
  try {
    console.log('\n3. Testing reorder upsert query simulation...');
    // We try to upsert a dummy entry for user_id = 999999, aplikasi_external_id = 999999
    const query = `
      INSERT INTO user_qa_personal (user_id, aplikasi_external_id, urutan) 
      VALUES (?, ?, ?) 
      ON DUPLICATE KEY UPDATE urutan = VALUES(urutan)
    `;
    const [res] = await pool.query(query, [999999, 999999, 5]);
    console.log('✅ Test query executed successfully. Affected rows:', res.affectedRows);

    // Clean up
    await pool.query('DELETE FROM user_qa_personal WHERE user_id = 999999 AND aplikasi_external_id = 999999');
    console.log('✅ Cleanup successful.');
  } catch (err) {
    console.error('❌ Reorder query test failed:', err.message);
  }

  await pool.end();
  console.log('\n--- DIAGNOSTICS COMPLETED ---');
}

run();
