const db = require('./src/config/db');
db.query("SHOW TABLES LIKE 'master_jenis_cuti'")
    .then(res => console.log(res[0]))
    .catch(console.error)
    .finally(() => process.exit(0));
