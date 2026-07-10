
const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../../.env') });

const app = express();
const PORT = process.env.SYSTEM_PORT || 5005;

// Middleware
app.use(cors());
app.use(express.json({ limit: '100mb' }));

// Shared Middleware
const { verifyToken } = require('../../shared/authMiddleware');

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', service: 'System & AI Service' });
});

// Routes
const aplikasiExternalRoutes = require('../../modules/system/routes/aplikasiExternalRoutes');
const menuRoutes = require('../../modules/system/routes/menuRoutes');
const masterDataConfigRoutes = require('../../modules/system/routes/masterDataConfigRoutes');
const generatedPageRoutes = require('../../modules/system/routes/generatedPageRoutes');
const referensiRoutes = require('../../modules/system/routes/referensiRoutes');
const themeRoutes = require('../../modules/system/routes/themeRoutes');
const importRoutes = require('../../modules/system/routes/importRoutes');
const pengaturanRoutes = require('../../modules/system/routes/pengaturanRoutes');
const auditRoutes = require('../../modules/system/routes/auditRoutes');
const appSettingRoutes = require('../../modules/system/routes/appSettingRoutes');
const notificationRoutes = require('../../modules/system/routes/notificationRoutes');
const nayaxaRoutes = require('../../modules/ai/routes/nayaxaRoutes');
const qrRoutes = require('../../modules/system/routes/qrRoutes');
const convertRoutes = require('../../modules/system/routes/convertRoutes');


// Public
app.use('/api/public/qr', qrRoutes);
app.use('/api/convert', convertRoutes);

// Protected
app.use('/api', verifyToken);

app.use('/api/aplikasi-external', aplikasiExternalRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/master-data-config', masterDataConfigRoutes);
app.use('/api/generated-pages', generatedPageRoutes);
app.use('/api/referensi', referensiRoutes);
app.use('/api/theme', themeRoutes);
app.use('/api/import', importRoutes);
app.use('/api/pengaturan', pengaturanRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/app-settings', appSettingRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/nayaxa', nayaxaRoutes);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n⚙️ System & AI Service is running on port ${PORT}`);
});
