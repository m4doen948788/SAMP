const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/suratController');
const makerCtrl = require('../controllers/suratMakerController');
const { verifyToken } = require('../config/authMiddleware');

router.post('/masuk', ctrl.saveSuratMasuk);
router.post('/keluar', ctrl.generateSuratKeluar);
router.post('/generate-docx', makerCtrl.generateDocx);
router.get('/klasifikasi', verifyToken, makerCtrl.getKlasifikasi);
router.get('/next-number', verifyToken, makerCtrl.getNextNumber);
router.post('/take-number', verifyToken, makerCtrl.takeNumber);
router.get('/number-logs', verifyToken, makerCtrl.getNumberLogs);
router.put('/update-number-log/:id', verifyToken, makerCtrl.updateNumberLog);
router.get('/', ctrl.getAll);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.delete);

module.exports = router;
