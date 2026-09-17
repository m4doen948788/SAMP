const pool = require('./db');

const migrate = async () => {
    try {
        console.log('🔄 Migrating RPJMD - RPJPD Link Column...');

        // 1. Check if rpjpd_sasaran_id column exists in rpjmd_sasaran
        const [cols] = await pool.query("SHOW COLUMNS FROM rpjmd_sasaran LIKE 'rpjpd_sasaran_id'");
        if (cols.length === 0) {
            await pool.query(`
                ALTER TABLE rpjmd_sasaran 
                ADD COLUMN rpjpd_sasaran_id INT NULL AFTER tujuan_id;
            `);
            console.log('✅ Column rpjpd_sasaran_id added to rpjmd_sasaran.');
        } else {
            console.log('ℹ️ Column rpjpd_sasaran_id already exists.');
        }

        // 2. Add Foreign Key if not exists
        try {
            await pool.query(`
                ALTER TABLE rpjmd_sasaran 
                ADD CONSTRAINT fk_rpjmd_rpjpd_sasaran 
                FOREIGN KEY (rpjpd_sasaran_id) REFERENCES rpjpd_sasaran(id) 
                ON DELETE SET NULL ON UPDATE CASCADE;
            `);
            console.log('✅ Foreign key fk_rpjmd_rpjpd_sasaran added.');
        } catch (fkErr) {
            if (fkErr.code === 'ER_DUP_KEY' || fkErr.code === 'ER_FK_DUP_NAME' || fkErr.message.includes('already exists')) {
                console.log('ℹ️ Foreign key fk_rpjmd_rpjpd_sasaran already exists.');
            } else {
                console.warn('⚠️ Foreign key warning:', fkErr.message);
            }
        }

        console.log('🎉 Migration completed successfully!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Migration failed:', err);
        process.exit(1);
    }
};

migrate();
