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
    console.log('Successfully connected to MySQL database: ' + process.env.DB_NAME);
    connection.release();
  })
  .catch(err => {
    console.error('Error connecting to MySQL database:', err.message);
  });

module.exports = pool;
