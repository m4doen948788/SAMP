const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 20000,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000
});

pool.getConnection()
  .then(connection => {
    console.log(`✅ [Shared DB] Connected to: ${process.env.DB_NAME}`);
    connection.release();
  })
  .catch(err => {
    console.error(`\n❌ [Shared DB] ERROR connecting to ${process.env.DB_NAME}: ${err.message}`);
  });

module.exports = pool;
