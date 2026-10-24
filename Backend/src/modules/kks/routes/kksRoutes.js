const express = require('express');
const router = express.Router();
const kksController = require('../controllers/kksController');
const { verifyToken } = require('../../../config/authMiddleware');

// Public endpoints (dapat dilihat publik di dashboard KKS bapperida-ppm.my.id/kks)
router.get('/dashboard/summary', kksController.getSummary);
router.get('/dashboard/leaderboard-opd', kksController.getLeaderboardOpd);
router.get('/tatanan', kksController.getTatananList);
router.get('/periode', kksController.getPeriodeList);
router.get('/indikator', kksController.getIndikatorList);
router.get('/sync-master', kksController.syncMasterData);

// Protected endpoints (membutuhkan sesi login token)
router.post('/penilaian/save', verifyToken, kksController.savePenilaian);
router.post('/bukti-dukung/upload', verifyToken, kksController.uploadBuktiDukung);
router.get('/perpustakaan', verifyToken, kksController.getPustakaKks);
router.post('/bukti-dukung/link-library', verifyToken, kksController.linkLibraryDoc);
router.delete('/bukti-dukung/:id', verifyToken, kksController.deleteBuktiDukung);
router.post('/verifikasi/save', verifyToken, kksController.saveVerifikasi);
router.post('/master/clone-year', verifyToken, kksController.cloneYear);
router.post('/master/indikator', verifyToken, kksController.createIndikator);
router.put('/master/indikator/:id', verifyToken, kksController.updateIndikator);
router.delete('/master/indikator/:id', verifyToken, kksController.deleteIndikator);

// Master Tatanan
router.post('/master/tatanan', verifyToken, kksController.createTatanan);
router.put('/master/tatanan/:id', verifyToken, kksController.updateTatanan);
router.delete('/master/tatanan/:id', verifyToken, kksController.deleteTatanan);

module.exports = router;
