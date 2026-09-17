
const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../../.env') });

const app = express();
const PORT = process.env.SMART_OFFICE_PORT || 5002;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Serve uploads
app.use('/uploads', express.static(path.join(__dirname, '../../../uploads')));

// Shared Middleware
const { verifyToken } = require('../../shared/authMiddleware');

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', service: 'Smart Office Service' });
});

// Routes
const jenisDokumenRoutes = require('../../modules/correspondence/routes/jenisDokumenRoutes');
const dokumenRoutes = require('../../modules/correspondence/routes/dokumenRoutes');
const suratRoutes = require('../../modules/correspondence/routes/suratRoutes');
const suratSettingRoutes = require('../../modules/correspondence/routes/suratSettingRoutes');
const suratTemplateRoutes = require('../../modules/correspondence/routes/suratTemplateRoutes');
const suratApprovalRoutes = require('../../modules/correspondence/routes/suratApprovalRoutes');

// Public
app.use('/api/surat-approvals', suratApprovalRoutes);

// Protected
app.use('/api', verifyToken);
app.use('/api/jenis-dokumen', jenisDokumenRoutes);
app.use('/api/dokumen', dokumenRoutes);
app.use('/api/surat', suratRoutes);
app.use('/api/surat-numbering', suratSettingRoutes);
app.use('/api/surat-templates', suratTemplateRoutes);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n📄 Smart Office Service (Surat & Dokumen) is running on port ${PORT}`);
});
