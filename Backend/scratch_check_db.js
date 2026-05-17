const pool = require('./src/config/db');

async function check() {
    try {
        const [columns] = await pool.query('SHOW COLUMNS FROM users');
        console.log('Columns in users table:');
        console.table(columns);
        
        const [roles] = await pool.query('SHOW COLUMNS FROM user_roles');
        console.log('\nColumns in user_roles table:');
        console.table(roles);

    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

check();
