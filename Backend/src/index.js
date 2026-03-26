const express = require('express');
const cors = require('cors');
require('dotenv').config();
require('./config/db'); // Initialize DB connection

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Health check route
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Backend is running' });
});

// Routes
const authRoutes = require('./routes/authRoutes');
const tahunRoutes = require('./routes/tahunRoutes');
const tematikRoutes = require('./routes/tematikRoutes');
const aplikasiExternalRoutes = require('./routes/aplikasiExternalRoutes');
const menuRoutes = require('./routes/menuRoutes');
const bidangUrusanRoutes = require('./routes/bidangUrusanRoutes');
const instansiDaerahRoutes = require('./routes/instansiDaerahRoutes');
const bidangRoutes = require('./routes/bidangRoutes');
const masterDataConfigRoutes = require('./routes/masterDataConfigRoutes');
const jenisDokumenRoutes = require('./routes/jenisDokumenRoutes');
const jenisKegiatanRoutes = require('./routes/jenisKegiatanRoutes');
const jenisPegawaiRoutes = require('./routes/jenisPegawaiRoutes');
const tableLabelRoutes = require('./routes/tableLabelRoutes');
const generatedPageRoutes = require('./routes/generatedPageRoutes');
const referensiRoutes = require('./routes/referensiRoutes');
const userRoutes = require('./routes/userRoutes');
const profilPegawaiRoutes = require('./routes/profilPegawaiRoutes');
const rbacRoutes = require('./routes/rbacRoutes');
const themeRoutes = require('./routes/themeRoutes');
const dokumenRoutes = require('./routes/dokumenRoutes');
const wilayahRoutes = require('./routes/wilayahRoutes');
const pangkatGolonganRoutes = require('./routes/pangkatGolonganRoutes');
const internalInstansiRoutes = require('./routes/internalInstansiRoutes');
const bidangInstansiRoutes = require('./routes/bidangInstansiRoutes');
const subBidangInstansiRoutes = require('./routes/subBidangInstansiRoutes');
const statusAdministrasiPegawaiRoutes = require('./routes/statusAdministrasiPegawaiRoutes');
const mappingUrusanInstansiRoutes = require('./routes/mappingUrusanInstansiRoutes');
const mappingBidangPengampuRoutes = require('./routes/mappingBidangPengampuRoutes');
const kegiatanPegawaiRoutes = require('./routes/kegiatanPegawaiRoutes');
const holidayRoutes = require('./routes/holidayRoutes');
const tipeKegiatanRoutes = require('./routes/tipeKegiatanRoutes');
const importRoutes = require('./routes/importRoutes');
const pengaturanRoutes = require('./routes/pengaturanRoutes');
const mappingKegiatanInstansiRoutes = require('./routes/mappingKegiatanInstansiRoutes');
const mappingPemegangSektorRoutes = require('./routes/mappingPemegangSektorRoutes');

const { verifyToken } = require('./config/authMiddleware');
const db = require('./config/db'); // Get db connection for seeder check
const { seedWilayah } = require('../seed_wilayah'); // Import seeder

// Serve uploaded files securely (should ideally be protected in production)
app.use('/uploads', express.static('uploads'));

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

app.listen(PORT, async () => {
  console.log(`Server is running on port ${PORT}`);


  // Auto-resume wilayah seeding if incomplete
  try {
    const [rows] = await db.query("SELECT COUNT(*) as cnt FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'master_kelurahan'");
    if (rows[0].cnt > 0) {
      const [kelCount] = await db.query("SELECT COUNT(*) as cnt FROM master_kelurahan");
      if (kelCount[0].cnt < 70000) { // Should be ~80k, so 70k is a safe threshold for "incomplete"
        console.log(`\n[Auto-Resume] Detected incomplete wilayah data (${kelCount[0].cnt}/~80000 kelurahan). Starting background seeder...`);
        seedWilayah().catch(err => console.error("Background seeder error:", err));
      }
    } else {
      console.log(`\n[Auto-Start] Wilayah tables not found. Starting background seeder...`);
      seedWilayah().catch(err => console.error("Background seeder error:", err));
    }
  } catch (err) {
    console.error("Failed to check wilayah data status on startup:", err);
  }
});

