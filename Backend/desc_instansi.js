const db = require('./src/config/db');
db.query("DESCRIBE master_instansi_daerah").then(([rows]) => {
    console.log(rows);
    process.exit();
}).catch(e => {
    console.error(e);
    process.exit(1);
});
