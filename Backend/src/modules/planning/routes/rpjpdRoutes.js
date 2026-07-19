const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/rpjpdController');
const { verifyToken } = require('../../../config/authMiddleware');

// Visi Routes
router.get('/visi', verifyToken, ctrl.getVisi);
router.post('/visi', verifyToken, ctrl.saveVisi);
router.post('/visi/:id/upload-perda', verifyToken, ctrl.uploadFile, ctrl.uploadPerdaFile);

// Misi Routes
router.get('/misi', verifyToken, ctrl.getMisi);
router.post('/misi', verifyToken, ctrl.saveMisi);
router.delete('/misi/:id', verifyToken, ctrl.deleteMisi);

// Sasaran Routes
router.get('/sasaran', verifyToken, ctrl.getSasaran);
router.post('/sasaran', verifyToken, ctrl.saveSasaran);
router.delete('/sasaran/:id', verifyToken, ctrl.deleteSasaran);

// Arah Kebijakan Routes
router.get('/arah-kebijakan', verifyToken, ctrl.getArahKebijakan);
router.post('/arah-kebijakan', verifyToken, ctrl.saveArahKebijakan);
router.delete('/arah-kebijakan/:id', verifyToken, ctrl.deleteArahKebijakan);

// Indikator Routes
router.get('/indikator', verifyToken, ctrl.getIndikator);
router.post('/indikator', verifyToken, ctrl.saveIndikator);
router.delete('/indikator/:id', verifyToken, ctrl.deleteIndikator);

module.exports = router;
