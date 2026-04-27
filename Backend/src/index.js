
const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { swaggerUi, specs } = require('./config/swagger');

// Global Error Handlers for catching startup/runtime crashes
process.on('uncaughtException', (err) => {
  console.error('\n[FATAL] Uncaught Exception occurred! This might be causing the crash:');
  console.error(err.stack || err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('\n[FATAL] Unhandled Rejection at:', promise, 'reason:', reason);
  // We don't always exit on unhandledRejection, but for debugging startup, it helps
  // process.exit(1);
});

require('./config/db'); // Initialize DB connection

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

// Health check route
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Backend is running' });
});

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

// Routes
const authRoutes = require('./modules/auth/routes/authRoutes');
const tahunRoutes = require('./modules/regional/routes/tahunRoutes');
const tematikRoutes = require('./modules/planning/routes/tematikRoutes');
const aplikasiExternalRoutes = require('./modules/system/routes/aplikasiExternalRoutes');
const menuRoutes = require('./modules/system/routes/menuRoutes');
const bidangUrusanRoutes = require('./modules/planning/routes/bidangUrusanRoutes');
const instansiDaerahRoutes = require('./modules/regional/routes/instansiDaerahRoutes');
const bidangRoutes = require('./modules/planning/routes/bidangRoutes');
const masterDataConfigRoutes = require('./modules/system/routes/masterDataConfigRoutes');
const jenisDokumenRoutes = require('./modules/correspondence/routes/jenisDokumenRoutes');
const jenisKegiatanRoutes = require('./modules/activity/routes/jenisKegiatanRoutes');
const jenisPegawaiRoutes = require('./modules/auth/routes/jenisPegawaiRoutes');
const tableLabelRoutes = require('./modules/planning/routes/tableLabelRoutes');
const generatedPageRoutes = require('./modules/system/routes/generatedPageRoutes');
const referensiRoutes = require('./modules/system/routes/referensiRoutes');
const userRoutes = require('./modules/auth/routes/userRoutes');
const profilPegawaiRoutes = require('./modules/auth/routes/profilPegawaiRoutes');
const rbacRoutes = require('./modules/auth/routes/rbacRoutes');
const themeRoutes = require('./modules/system/routes/themeRoutes');
const dokumenRoutes = require('./modules/correspondence/routes/dokumenRoutes');
const wilayahRoutes = require('./modules/regional/routes/wilayahRoutes');
const pangkatGolonganRoutes = require('./modules/auth/routes/pangkatGolonganRoutes');
const internalInstansiRoutes = require('./modules/regional/routes/internalInstansiRoutes');
const bidangInstansiRoutes = require('./modules/regional/routes/bidangInstansiRoutes');
const subBidangInstansiRoutes = require('./modules/planning/routes/subBidangInstansiRoutes');
const statusAdministrasiPegawaiRoutes = require('./modules/auth/routes/statusAdministrasiPegawaiRoutes');
const mappingUrusanInstansiRoutes = require('./modules/planning/routes/mappingUrusanInstansiRoutes');
const mappingBidangPengampuRoutes = require('./modules/planning/routes/mappingBidangPengampuRoutes');
const kegiatanPegawaiRoutes = require('./modules/activity/routes/kegiatanPegawaiRoutes');
const holidayRoutes = require('./modules/regional/routes/holidayRoutes');
const tipeKegiatanRoutes = require('./modules/activity/routes/tipeKegiatanRoutes');
const importRoutes = require('./modules/system/routes/importRoutes');
const pengaturanRoutes = require('./modules/system/routes/pengaturanRoutes');
const mappingKegiatanInstansiRoutes = require('./modules/planning/routes/mappingKegiatanInstansiRoutes');
const mappingPemegangSektorRoutes = require('./modules/planning/routes/mappingPemegangSektorRoutes');
const satuanRoutes = require('./modules/planning/routes/satuanRoutes');
const dataMakroRoutes = require('./modules/planning/routes/dataMakroRoutes');
const kegiatanManajemenRoutes = require('./modules/activity/routes/kegiatanManajemenRoutes');
const suratRoutes = require('./modules/correspondence/routes/suratRoutes');
const suratSettingRoutes = require('./modules/correspondence/routes/suratSettingRoutes');
const suratTemplateRoutes = require('./modules/correspondence/routes/suratTemplateRoutes');
const appSettingRoutes = require('./modules/system/routes/appSettingRoutes');


const { verifyToken } = require('./config/authMiddleware');
const db = require('./config/db'); // Get db connection for seeder check
const { seedWilayah } = require('../scripts/seed_wilayah'); // Import seeder

// Serve uploaded files (ensure inline disposition for browser viewing)
app.use('/uploads', (req, res, next) => {
  res.setHeader('Content-Disposition', 'inline');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  next();
}, express.static('uploads'));

// Public routes
app.use('/api/auth', authRoutes);

// Apply auth middleware to all subsequent /api routes
app.use('/api', verifyToken);

// Protected routes
app.use('/api/tahun', tahunRoutes);
app.use('/api/tematik', tematikRoutes);
app.use('/api/aplikasi-external', aplikasiExternalRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/bidang-urusan', bidangUrusanRoutes);
app.use('/api/instansi-daerah', instansiDaerahRoutes);
app.use('/api/bidang', bidangRoutes);
app.use('/api/master-data-config', masterDataConfigRoutes);
app.use('/api/jenis-dokumen', jenisDokumenRoutes);
app.use('/api/jenis-kegiatan', jenisKegiatanRoutes);
app.use('/api/jenis-pegawai', jenisPegawaiRoutes);
app.use('/api/table-labels', tableLabelRoutes);
app.use('/api/generated-pages', generatedPageRoutes);
app.use('/api/referensi', referensiRoutes);
app.use('/api/users', userRoutes);
app.use('/api/profil-pegawai', profilPegawaiRoutes);
app.use('/api/status-administrasi-pegawai', statusAdministrasiPegawaiRoutes);
app.use('/api/rbac', rbacRoutes);
app.use('/api/theme', themeRoutes);
app.use('/api/dokumen', dokumenRoutes);
app.use('/api/wilayah', wilayahRoutes);
app.use('/api/pangkat-golongan', pangkatGolonganRoutes);
app.use('/api/internal-instansi', internalInstansiRoutes);
app.use('/api/bidang-instansi', bidangInstansiRoutes);
app.use('/api/sub-bidang-instansi', subBidangInstansiRoutes);
app.use('/api/mapping-urusan-instansi', mappingUrusanInstansiRoutes);
app.use('/api/mapping-bidang-pengampu', mappingBidangPengampuRoutes);
app.use('/api/kegiatan-pegawai', kegiatanPegawaiRoutes);
app.use('/api/holidays', holidayRoutes);
app.use('/api/tipe-kegiatan', tipeKegiatanRoutes);
app.use('/api/import', importRoutes);
app.use('/api/mapping-pemegang-sektor', mappingPemegangSektorRoutes);
app.use('/api/pengaturan', pengaturanRoutes);
app.use('/api/mapping-kegiatan-instansi', mappingKegiatanInstansiRoutes);
app.use('/api/satuan', satuanRoutes);
app.use('/api/data-makro', dataMakroRoutes);
app.use('/api/kegiatan-manajemen', kegiatanManajemenRoutes);
app.use('/api/surat', suratRoutes);
app.use('/api/surat-numbering', suratSettingRoutes);
app.use('/api/surat-templates', suratTemplateRoutes);
app.use('/api/app-settings', appSettingRoutes);
app.use('/api/nayaxa', require('./modules/ai/routes/nayaxaRoutes'));


const { startCleanupScheduler } = require('./modules/correspondence/services/cleanupService');

// Start the cleanup scheduler for document trash bin
startCleanupScheduler();

const server = app.listen(PORT, async () => {
  console.log(`\n🚀 Server is starting on port ${PORT}...`);

  // Auto-resume wilayah seeding if incomplete
  try {
    const [rows] = await db.query("SELECT COUNT(*) as cnt FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'master_kelurahan'");
    if (rows[0].cnt > 0) {
      const [kelCount] = await db.query("SELECT COUNT(*) as cnt FROM master_kelurahan");
      if (kelCount[0].cnt < 70000) { // Should be ~80k, so 70k is a safe threshold for "incomplete"
        console.log(`[Auto-Resume] Detected incomplete wilayah data (${kelCount[0].cnt}/~80000 kelurahan). Starting background seeder...`);
        seedWilayah().catch(err => console.error("Background seeder error:", err));
      } else {
        console.log(`[Status] Wilayah data looks complete (${kelCount[0].cnt} kelurahan).`);
      }
    } else {
      console.log(`[Auto-Start] Wilayah tables not found. Starting background seeder...`);
      seedWilayah().catch(err => console.error("Background seeder error:", err));
    }
    console.log(`✅ Server is fully operational on port ${PORT}\n`);
  } catch (err) {
    console.error("❌ Failed to check wilayah data status on startup:", err.message);
  }
});

// Explicit error handler for the server (e.g. Port in Use)
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`\n❌ ERROR: Port ${PORT} is already in use by another process.`);
    console.error(`Please kill the existing process or change the PORT in your .env file.\n`);
    process.exit(1);
  } else {
    console.error('\n❌ Server error:', error.message);
    process.exit(1);
  }
});

