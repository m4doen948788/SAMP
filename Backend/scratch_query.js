const pool = require('./src/config/db');

async function check() {
    try {
        const [tables] = await pool.query('SHOW TABLES');
        console.log(tables.map(t => Object.values(t)[0]));
        
        const [apps] = await pool.query('SELECT * FROM internal_apps WHERE name LIKE "%ppm%" OR name LIKE "%dashboard%"');
        console.log("internal_apps:", apps);
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

check();
