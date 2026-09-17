const migrateMappingKegiatan = require('./src/config/migrate_kegiatan_mapping');

(async () => {
    try {
        await migrateMappingKegiatan();
        console.log('Migration finished successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
})();
