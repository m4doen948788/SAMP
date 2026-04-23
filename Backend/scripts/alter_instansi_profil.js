const pool = require('./src/config/db');

async function alterInstansi() {
    try {
        console.log('Adding tupoksi column...');
        try {
            await pool.query('ALTER TABLE master_instansi_daerah ADD COLUMN tupoksi TEXT AFTER singkatan');
            console.log('Added tupoksi column.');
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') console.log('tupoksi column already exists.');
            else throw e;
        }

        console.log('Adding alamat column...');
        try {
            await pool.query('ALTER TABLE master_instansi_daerah ADD COLUMN alamat TEXT AFTER tupoksi');
            console.log('Added alamat column.');
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') console.log('alamat column already exists.');
            else throw e;
        }

        console.log('Adding alamat_web column...');
        try {
            await pool.query('ALTER TABLE master_instansi_daerah ADD COLUMN alamat_web VARCHAR(255) AFTER alamat');
            console.log('Added alamat_web column.');
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') console.log('alamat_web column already exists.');
            else throw e;
        }

        console.log('Database altered successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Error altering database:', err);
        process.exit(1);
    }
}

alterInstansi();
