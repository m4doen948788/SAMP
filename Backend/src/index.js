
const express = require('express');
const cors = require('cors');
const path = require('path');
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
app.set('trust proxy', true);
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
const tipeLinkRoutes = require('./modules/system/routes/tipeLinkRoutes');
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
const rpjpdRoutes = require('./modules/planning/routes/rpjpdRoutes');
const rpjmdRenstraRoutes = require('./modules/planning/routes/rpjmdRenstraRoutes');
const kegiatanPegawaiRoutes = require('./modules/activity/routes/kegiatanPegawaiRoutes');
const holidayRoutes = require('./modules/regional/routes/holidayRoutes');
const tipeKegiatanRoutes = require('./modules/activity/routes/tipeKegiatanRoutes');
const importRoutes = require('./modules/system/routes/importRoutes');
const pengaturanRoutes = require('./modules/system/routes/pengaturanRoutes');
const mappingKegiatanInstansiRoutes = require('./modules/planning/routes/mappingKegiatanInstansiRoutes');
const mappingPemegangSektorRoutes = require('./modules/planning/routes/mappingPemegangSektorRoutes');
const satuanRoutes = require('./modules/planning/routes/satuanRoutes');
const dataMakroRoutes = require('./modules/planning/routes/dataMakroRoutes');
const olahDataRoutes = require('./modules/planning/routes/olahDataRoutes');
const kegiatanManajemenRoutes = require('./modules/activity/routes/kegiatanManajemenRoutes');
const suratRoutes = require('./modules/correspondence/routes/suratRoutes');
const suratSettingRoutes = require('./modules/correspondence/routes/suratSettingRoutes');
const suratTemplateRoutes = require('./modules/correspondence/routes/suratTemplateRoutes');
const suratApprovalRoutes = require('./modules/correspondence/routes/suratApprovalRoutes');
const auditRoutes = require('./modules/system/routes/auditRoutes');
const appSettingRoutes = require('./modules/system/routes/appSettingRoutes');
const notificationRoutes = require('./modules/system/routes/notificationRoutes');
const qrRoutes = require('./modules/system/routes/qrRoutes');
const notulenRoutes = require('./modules/correspondence/routes/notulenRoutes');
const notulenTemplateRoutes = require('./modules/correspondence/routes/notulenTemplateRoutes');
const skpRoutes = require('./modules/activity/routes/skpRoutes');
const publicSkpRoutes = require('./modules/activity/routes/publicSkpRoutes');
const convertRoutes = require('./modules/system/routes/convertRoutes');



const { verifyToken } = require('./config/authMiddleware');
const db = require('./config/db'); // Get db connection for seeder check
const { seedWilayah } = require('../scripts/seed_wilayah'); // Import seeder

// Serve uploaded files (ensure inline disposition for browser viewing)
app.use('/uploads', (req, res, next) => {
  res.setHeader('Content-Disposition', 'inline');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  next();
}, express.static(path.join(__dirname, '../uploads')));

// Public routes
app.use('/api/auth', authRoutes);
app.use('/api/surat-approvals', suratApprovalRoutes);
app.use('/api/public/qr', qrRoutes);
app.use('/api/public/skp', publicSkpRoutes);
app.use('/api/convert', convertRoutes);

app.get('/api/debug-env', (req, res) => {
  res.status(200).json({
    DB_HOST: process.env.DB_HOST,
    DB_NAME: process.env.DB_NAME,
    DB_USER: process.env.DB_USER,
    PORT: process.env.PORT,
  });
});

app.get('/api/debug-db-status', async (req, res) => {
  try {
    const [processes] = await db.query('SHOW PROCESSLIST');
    let innodbStatus = '';
    try {
      const [statusRows] = await db.query('SHOW ENGINE INNODB STATUS');
      innodbStatus = statusRows[0]?.Status || '';
    } catch (e) {
      innodbStatus = 'No permission: ' + e.message;
    }
    res.status(200).json({
      success: true,
      processes,
      innodbStatus
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/skp/history-debug', require('./modules/activity/controllers/skpController').getHistory);

// Apply auth middleware to all subsequent /api routes
app.use('/api', verifyToken);

// Protected routes
app.use('/api/tahun', tahunRoutes);
app.use('/api/tematik', tematikRoutes);
app.use('/api/aplikasi-external', aplikasiExternalRoutes);
app.use('/api/tipe-link', tipeLinkRoutes);
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
app.use('/api/rpjpd', rpjpdRoutes);
app.use('/api/planning/rpjmd-renstra', rpjmdRenstraRoutes);
app.use('/api/rpjmd-renstra', rpjmdRenstraRoutes);
app.use('/api/kegiatan-pegawai', kegiatanPegawaiRoutes);
app.use('/api/holidays', holidayRoutes);
app.use('/api/tipe-kegiatan', tipeKegiatanRoutes);
app.use('/api/import', importRoutes);
app.use('/api/mapping-pemegang-sektor', mappingPemegangSektorRoutes);
app.use('/api/pengaturan', pengaturanRoutes);
app.use('/api/mapping-kegiatan-instansi', mappingKegiatanInstansiRoutes);
app.use('/api/satuan', satuanRoutes);
app.use('/api/data-makro', dataMakroRoutes);
app.use('/api/olah-data', olahDataRoutes);
app.use('/api/kegiatan-manajemen', kegiatanManajemenRoutes);
app.use('/api/surat', suratRoutes);
app.use('/api/surat-numbering', suratSettingRoutes);
app.use('/api/surat-templates', suratTemplateRoutes);
app.use('/api/app-settings', appSettingRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/notulen', notulenRoutes);
app.use('/api/notulen-templates', notulenTemplateRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/skp', skpRoutes);
app.use('/api/nayaxa', require('./modules/ai/routes/nayaxaRoutes'));


const { startCleanupScheduler } = require('./modules/correspondence/services/cleanupService');

// Start the cleanup scheduler for document trash bin
startCleanupScheduler();

const server = app.listen(PORT, '0.0.0.0', async () => {
  console.log(`\n🚀 Server is starting on port ${PORT}...`);

  // Auto-resume wilayah seeding if incomplete
  try {
    // 1. Add deleted_by column to tables if not exist
    try {
      const [docCols] = await db.query('DESCRIBE dokumen_upload');
      const docHasDeletedBy = docCols.some(col => col.Field === 'deleted_by');
      if (!docHasDeletedBy) {
        console.log('[Migration] Adding deleted_by column to dokumen_upload...');
        await db.query('ALTER TABLE dokumen_upload ADD COLUMN deleted_by INT NULL');
        console.log('✅ [Migration] Column deleted_by added to dokumen_upload.');
      }
      const [suratCols] = await db.query('DESCRIBE surat');
      const suratHasDeletedBy = suratCols.some(col => col.Field === 'deleted_by');
      if (!suratHasDeletedBy) {
        console.log('[Migration] Adding deleted_by column to surat...');
        await db.query('ALTER TABLE surat ADD COLUMN deleted_by INT NULL');
        console.log('✅ [Migration] Column deleted_by added to surat.');
      }
    } catch (migErr) {
      console.error('Failed to run schema updates for deleted_by:', migErr.message);
    }

    // Add urusan_ids column to kegiatan_manajemen if not exist
    try {
      const [kegCols] = await db.query('DESCRIBE kegiatan_manajemen');
      const kegHasUrusan = kegCols.some(col => col.Field === 'urusan_ids');
      if (!kegHasUrusan) {
        console.log('[Migration] Adding urusan_ids column to kegiatan_manajemen...');
        await db.query('ALTER TABLE kegiatan_manajemen ADD COLUMN urusan_ids TEXT NULL');
        console.log('✅ [Migration] Column urusan_ids added to kegiatan_manajemen.');
      }
    } catch (migErr) {
      console.error('Failed to run schema updates for urusan_ids:', migErr.message);
    }

    // Add is_quick_access, is_qa_all, is_qa_bidang, creator_bidang_id, created_by columns to kelola_menu if not exist
    try {
      const [menuCols] = await db.query('DESCRIBE kelola_menu');
      const colNames = menuCols.map(col => col.Field);
      
      if (!colNames.includes('is_quick_access')) {
        console.log('[Migration] Adding is_quick_access column to kelola_menu...');
        await db.query('ALTER TABLE kelola_menu ADD COLUMN is_quick_access TINYINT(1) DEFAULT 0');
        console.log('✅ [Migration] Column is_quick_access added to kelola_menu.');
      }
      
      if (!colNames.includes('is_qa_all')) {
        console.log('[Migration] Adding is_qa_all column to kelola_menu...');
        await db.query('ALTER TABLE kelola_menu ADD COLUMN is_qa_all TINYINT(1) DEFAULT 0 AFTER is_quick_access');
        console.log('✅ [Migration] Column is_qa_all added to kelola_menu.');
      }
      
      if (!colNames.includes('is_qa_bidang')) {
        console.log('[Migration] Adding is_qa_bidang column to kelola_menu...');
        await db.query('ALTER TABLE kelola_menu ADD COLUMN is_qa_bidang TINYINT(1) DEFAULT 0 AFTER is_qa_all');
        console.log('✅ [Migration] Column is_qa_bidang added to kelola_menu.');
      }
      
      if (!colNames.includes('creator_bidang_id')) {
        console.log('[Migration] Adding creator_bidang_id column to kelola_menu...');
        await db.query('ALTER TABLE kelola_menu ADD COLUMN creator_bidang_id INT NULL AFTER is_qa_bidang');
        console.log('✅ [Migration] Column creator_bidang_id added to kelola_menu.');
      }
      
      if (!colNames.includes('created_by')) {
        console.log('[Migration] Adding created_by column to kelola_menu...');
        await db.query('ALTER TABLE kelola_menu ADD COLUMN created_by INT NULL AFTER creator_bidang_id');
        console.log('✅ [Migration] Column created_by added to kelola_menu.');
      }
    } catch (migErr) {
      console.error('Failed to run schema updates for kelola_menu QA columns:', migErr.message);
    }

    // Add urutan column to user_qa_personal if not exist
    try {
      const [uqpCols] = await db.query('DESCRIBE user_qa_personal');
      const uqpHasUrutan = uqpCols.some(col => col.Field === 'urutan');
      if (!uqpHasUrutan) {
        console.log('[Migration] Adding urutan column to user_qa_personal...');
        await db.query('ALTER TABLE user_qa_personal ADD COLUMN urutan INT DEFAULT 0');
        console.log('✅ [Migration] Column urutan added to user_qa_personal.');
      }

      // Make aplikasi_external_id nullable and add menu_id to user_qa_personal if not exist
      const appExtCol = uqpCols.find(col => col.Field === 'aplikasi_external_id');
      if (appExtCol && appExtCol.Null === 'NO') {
        console.log('[Migration] Modifying aplikasi_external_id to be nullable in user_qa_personal...');
        await db.query('ALTER TABLE user_qa_personal MODIFY COLUMN aplikasi_external_id INT NULL');
        console.log('✅ [Migration] Modified aplikasi_external_id to be nullable.');
      }

      const uqpHasMenuId = uqpCols.some(col => col.Field === 'menu_id');
      if (!uqpHasMenuId) {
        console.log('[Migration] Adding menu_id column to user_qa_personal...');
        await db.query('ALTER TABLE user_qa_personal ADD COLUMN menu_id INT NULL AFTER aplikasi_external_id');
        console.log('✅ [Migration] Column menu_id added to user_qa_personal.');
      }

      // Add unique key uq_user_menu if not exist
      const [indexes] = await db.query('SHOW INDEX FROM user_qa_personal');
      const hasUqUserMenu = indexes.some(idx => idx.Key_name === 'uq_user_menu');
      if (!hasUqUserMenu) {
        console.log('[Migration] Adding unique index uq_user_menu to user_qa_personal...');
        await db.query('ALTER TABLE user_qa_personal ADD UNIQUE KEY uq_user_menu (user_id, menu_id)');
        console.log('✅ [Migration] Unique index uq_user_menu added to user_qa_personal.');
      }
    } catch (migErr) {
      console.error('Failed to run schema updates for user_qa_personal (menu_id/nullable):', migErr.message);
    }

    // Add qa_urutan column to master_aplikasi_external if not exist
    try {
      const [maeCols] = await db.query('DESCRIBE master_aplikasi_external');
      const maeHasQaUrutan = maeCols.some(col => col.Field === 'qa_urutan');
      if (!maeHasQaUrutan) {
        console.log('[Migration] Adding qa_urutan column to master_aplikasi_external...');
        await db.query('ALTER TABLE master_aplikasi_external ADD COLUMN qa_urutan INT DEFAULT 0');
        await db.query('UPDATE master_aplikasi_external SET qa_urutan = urutan');
        console.log('✅ [Migration] Column qa_urutan added to master_aplikasi_external.');
      }
    } catch (migErr) {
      console.error('Failed to run schema updates for qa_urutan on master_aplikasi_external:', migErr.message);
    }

    // Add index to kegiatan_manajemen table if it does not exist
    try {
      const [indices] = await db.query('SHOW INDEX FROM kegiatan_manajemen');
      const hasTanggalIndex = indices.some(idx => idx.Key_name === 'idx_kegiatan_tanggal_deleted');
      if (!hasTanggalIndex) {
        console.log('[Migration] Adding index idx_kegiatan_tanggal_deleted to kegiatan_manajemen...');
        await db.query('ALTER TABLE kegiatan_manajemen ADD INDEX idx_kegiatan_tanggal_deleted (tanggal, is_deleted)');
        console.log('✅ [Migration] Index idx_kegiatan_tanggal_deleted added to kegiatan_manajemen.');
      }
    } catch (idxErr) {
      console.error('Failed to run index updates on kegiatan_manajemen:', idxErr.message);
    }

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

