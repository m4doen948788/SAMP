const pool = require('./src/config/db');

async function test() {
    try {
        const [tables] = await pool.query('SHOW TABLES');
        const rolesTable = tables.map(t => Object.values(t)[0]).find(t => t.includes('user') || t.includes('role'));
        console.log('Roles table:', rolesTable);
        if (rolesTable) {
            const [roles] = await pool.query(`SELECT * FROM ${rolesTable}`);
            console.log(roles);
        }
    } catch(err) {
        console.error(err);
    } finally {
        process.exit();
    }
}
test();
