
const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../../.env') });

const app = express();
const PORT = process.env.PERFORMANCE_PORT || 5003;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Shared Middleware
const { verifyToken } = require('../../shared/authMiddleware');

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', service: 'Performance Service' });
});

// Routes
const kegiatanPegawaiRoutes = require('../../modules/activity/routes/kegiatanPegawaiRoutes');
const kegiatanManajemenRoutes = require('../../modules/activity/routes/kegiatanManajemenRoutes');
const jenisKegiatanRoutes = require('../../modules/activity/routes/jenisKegiatanRoutes');
const tipeKegiatanRoutes = require('../../modules/activity/routes/tipeKegiatanRoutes');
const holidayRoutes = require('../../modules/regional/routes/holidayRoutes');
const notulenRoutes = require('../../modules/correspondence/routes/notulenRoutes');
const notulenTemplateRoutes = require('../../modules/correspondence/routes/notulenTemplateRoutes');

// Protected
app.use('/api', verifyToken);
app.use('/api/kegiatan-pegawai', kegiatanPegawaiRoutes);
app.use('/api/kegiatan-manajemen', kegiatanManajemenRoutes);
app.use('/api/jenis-kegiatan', jenisKegiatanRoutes);
app.use('/api/tipe-kegiatan', tipeKegiatanRoutes);
app.use('/api/holidays', holidayRoutes);
app.use('/api/notulen', notulenRoutes);
app.use('/api/notulen-templates', notulenTemplateRoutes);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n📈 Performance Service (Logbook & Kegiatan) is running on port ${PORT}`);
});
