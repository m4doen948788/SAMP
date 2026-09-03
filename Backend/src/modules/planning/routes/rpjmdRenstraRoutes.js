const express = require('express');
const router = express.Router();
const rpjmdRenstraController = require('../controllers/rpjmdRenstraController');
const { verifyToken } = require('../../../config/authMiddleware');

router.use(verifyToken);

// Periode & RPJMD
router.get('/periode', rpjmdRenstraController.getPeriode);
router.get('/rpjmd', rpjmdRenstraController.getRPJMD);
router.post('/rpjmd/visi', rpjmdRenstraController.saveVisi);
router.post('/rpjmd/misi', rpjmdRenstraController.saveMisi);
router.post('/rpjmd/tujuan', rpjmdRenstraController.saveTujuan);
router.post('/rpjmd/sasaran', rpjmdRenstraController.saveSasaran);
router.delete('/rpjmd/:type/:id', rpjmdRenstraController.deleteRPJMDItem);

// Renstra Perangkat Daerah
router.get('/renstra', rpjmdRenstraController.getRenstra);
router.post('/renstra/sub-kegiatan', rpjmdRenstraController.saveRenstraSubKegiatan);
router.delete('/renstra/sub-kegiatan/:id', rpjmdRenstraController.deleteRenstraSubKegiatan);
router.post('/renstra/submit', rpjmdRenstraController.submitRenstra);
router.post('/renstra/verify', rpjmdRenstraController.verifyRenstra);
router.post('/renstra/quick-access', rpjmdRenstraController.toggleQuickAccess);

module.exports = router;
