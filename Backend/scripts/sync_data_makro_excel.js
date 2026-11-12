const pool = require('../src/config/db');
const { syncDataMakroFromExcel } = require('../src/modules/planning/utils/syncDataMakroExcel');

(async () => {
  try {
    const result = await syncDataMakroFromExcel(pool);
    console.log('✅ Sinkronisasi Data Makro selesai:', result);
  } catch (err) {
    console.error('❌ Sinkronisasi gagal:', err);
    process.exitCode = 1;
  } finally {
    process.exit();
  }
})();
