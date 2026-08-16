const mysql = require('mysql2/promise');
require('dotenv').config();

async function run() {
  console.log('--- DB DIAGNOSTICS DUMP ---');
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
    // 1. Show CREATE TABLE
    console.log('\n1. CREATE TABLE STATEMENT FOR user_qa_personal:');
    const [createTable] = await pool.query('SHOW CREATE TABLE user_qa_personal');
    console.log(createTable[0]['Create Table']);

    // 2. Dump all users to match IDs
    console.log('\n2. DUMPING USERS:');
    const [users] = await pool.query('SELECT id, username, nama_lengkap FROM users');
    users.forEach(u => {
      console.log(`- User ID: ${u.id}, Username: ${u.username}, Nama: ${u.nama_lengkap}`);
    });

    // 3. Dump all rows in user_qa_personal
    console.log('\n3. DUMPING ROWS IN user_qa_personal:');
    const [rows] = await pool.query('SELECT * FROM user_qa_personal');
    if (rows.length === 0) {
      console.log('(Table is empty)');
    } else {
      rows.forEach(r => {
        console.log(`- ID: ${r.id}, User ID: ${r.user_id}, App ID: ${r.aplikasi_external_id}, Urutan: ${r.urutan}`);
      });
    }
  } catch (err) {
    console.error('❌ Error during diagnostics:', err.message);
  }

  await pool.end();
  console.log('\n--- DUMP COMPLETED ---');
}

run();
