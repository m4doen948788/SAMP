
const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../../.env') });

const app = express();
const PORT = process.env.PLANNING_PORT || 5004;

// Middleware
app.use(cors());
app.use(express.json({ limit: '20mb' }));

// Shared Middleware
const { verifyToken } = require('../../shared/authMiddleware');

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', service: 'Planning Service' });
});

// Routes
const rpjpdRoutes = require('../../modules/planning/routes/rpjpdRoutes');
const rpjmdRenstraRoutes = require('../../modules/planning/routes/rpjmdRenstraRoutes');
const tematikRoutes = require('../../modules/planning/routes/tematikRoutes');
const bidangUrusanRoutes = require('../../modules/planning/routes/bidangUrusanRoutes');
const bidangRoutes = require('../../modules/planning/routes/bidangRoutes');
const tableLabelRoutes = require('../../modules/planning/routes/tableLabelRoutes');
const subBidangInstansiRoutes = require('../../modules/planning/routes/subBidangInstansiRoutes');
const mappingUrusanInstansiRoutes = require('../../modules/planning/routes/mappingUrusanInstansiRoutes');
const mappingBidangPengampuRoutes = require('../../modules/planning/routes/mappingBidangPengampuRoutes');
const mappingKegiatanInstansiRoutes = require('../../modules/planning/routes/mappingKegiatanInstansiRoutes');
const mappingPemegangSektorRoutes = require('../../modules/planning/routes/mappingPemegangSektorRoutes');
const satuanRoutes = require('../../modules/planning/routes/satuanRoutes');
const dataMakroRoutes = require('../../modules/planning/routes/dataMakroRoutes');
const olahDataRoutes = require('../../modules/planning/routes/olahDataRoutes');

// Protected
app.use('/api', verifyToken);
app.use('/api/rpjpd', rpjpdRoutes);
app.use('/api/planning/rpjmd-renstra', rpjmdRenstraRoutes);
app.use('/api/rpjmd-renstra', rpjmdRenstraRoutes);
app.use('/api/tematik', tematikRoutes);
app.use('/api/bidang-urusan', bidangUrusanRoutes);
app.use('/api/bidang', bidangRoutes);
app.use('/api/table-labels', tableLabelRoutes);
app.use('/api/sub-bidang-instansi', subBidangInstansiRoutes);
app.use('/api/mapping-urusan-instansi', mappingUrusanInstansiRoutes);
app.use('/api/mapping-bidang-pengampu', mappingBidangPengampuRoutes);
app.use('/api/mapping-kegiatan-instansi', mappingKegiatanInstansiRoutes);
app.use('/api/mapping-pemegang-sektor', mappingPemegangSektorRoutes);
app.use('/api/satuan', satuanRoutes);
app.use('/api/data-makro', dataMakroRoutes);
app.use('/api/olah-data', olahDataRoutes);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🗓️ Planning Service is running on port ${PORT}`);
});
// Force restart nodemon watch for modules/planning changes
