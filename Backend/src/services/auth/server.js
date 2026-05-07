
const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../../.env') });

const app = express();
const PORT = process.env.AUTH_PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', service: 'Auth Service' });
});

// Shared Middleware
const { verifyToken } = require('../../shared/authMiddleware');

// Routes
const authRoutes = require('../../modules/auth/routes/authRoutes');
const userRoutes = require('../../modules/auth/routes/userRoutes');
const profilPegawaiRoutes = require('../../modules/auth/routes/profilPegawaiRoutes');
const rbacRoutes = require('../../modules/auth/routes/rbacRoutes');
const pangkatGolonganRoutes = require('../../modules/auth/routes/pangkatGolonganRoutes');
const jenisPegawaiRoutes = require('../../modules/auth/routes/jenisPegawaiRoutes');
const statusAdministrasiPegawaiRoutes = require('../../modules/auth/routes/statusAdministrasiPegawaiRoutes');

// Regional (Master Data for Auth)
const tahunRoutes = require('../../modules/regional/routes/tahunRoutes');
const instansiDaerahRoutes = require('../../modules/regional/routes/instansiDaerahRoutes');
const internalInstansiRoutes = require('../../modules/regional/routes/internalInstansiRoutes');
const bidangInstansiRoutes = require('../../modules/regional/routes/bidangInstansiRoutes');
const wilayahRoutes = require('../../modules/regional/routes/wilayahRoutes');

// Public Routes
app.use('/api/auth', authRoutes);

// Protected Routes
app.use('/api/users', verifyToken, userRoutes);
app.use('/api/profil-pegawai', verifyToken, profilPegawaiRoutes);
app.use('/api/rbac', verifyToken, rbacRoutes);
app.use('/api/pangkat-golongan', verifyToken, pangkatGolonganRoutes);
app.use('/api/jenis-pegawai', verifyToken, jenisPegawaiRoutes);
app.use('/api/status-administrasi-pegawai', verifyToken, statusAdministrasiPegawaiRoutes);

app.use('/api/tahun', verifyToken, tahunRoutes);
app.use('/api/instansi-daerah', verifyToken, instansiDaerahRoutes);
app.use('/api/internal-instansi', verifyToken, internalInstansiRoutes);
app.use('/api/bidang-instansi', verifyToken, bidangInstansiRoutes);
app.use('/api/wilayah', verifyToken, wilayahRoutes);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🔐 Auth Service is running on port ${PORT}`);
});
