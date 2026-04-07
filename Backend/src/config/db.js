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
  connectTimeout: 20000, // 20 seconds
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000 // 10 seconds
});

// Test connection
pool.getConnection()
  .then(connection => {
    console.log(`✅ Successfully connected to MySQL database: ${process.env.DB_NAME} at ${process.env.DB_HOST}`);
    connection.release();
  })
  .catch(err => {
    console.error(`\n❌ ERROR connecting to MySQL database (${process.env.DB_NAME}):`);
    console.error(`   Message: ${err.message}`);
    console.error(`   Host: ${process.env.DB_HOST}`);
    console.error(`   If this is a local setup, ensure MySQL service is running.\n`);
  });

module.exports = pool;
