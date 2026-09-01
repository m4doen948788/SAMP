const express = require('express');
const router = express.Router();
const multer = require('multer');
const ctrl = require('../controllers/olahDataController');
const verifCtrl = require('../controllers/documentVerificationController');
const { verifyToken } = require('../../../config/authMiddleware');

// Setup multer memory storage (no permanent file saved on disk)
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit to handle larger PDFs
});

router.post('/inspect', verifyToken, upload.single('file'), ctrl.inspectExcel);
router.post('/process', verifyToken, upload.single('file'), ctrl.processExcel);
router.post('/compare', verifyToken, ctrl.compareExcel);
router.post('/unique-values', verifyToken, upload.single('file'), ctrl.getUniqueValues);

// Template management routes
router.get('/templates', verifyToken, ctrl.getTemplates);
router.post('/templates', verifyToken, ctrl.saveTemplate);
router.delete('/templates/:id', verifyToken, ctrl.deleteTemplate);

// Document Verification routes
router.get('/verifikasi/templates', verifyToken, verifCtrl.getTemplates);
router.delete('/verifikasi/templates/:id', verifyToken, verifCtrl.deleteTemplate);
router.post('/verifikasi/inspect-template', verifyToken, upload.single('file'), verifCtrl.inspectTemplate);
router.post('/verifikasi/templates', verifyToken, verifCtrl.saveTemplate);
router.get('/verifikasi/list', verifyToken, verifCtrl.getVerificationHistory);
router.post('/verifikasi/start', verifyToken, upload.single('file'), verifCtrl.autoVerifyDocument);
router.post('/verifikasi/save', verifyToken, verifCtrl.saveVerificationResult);
router.get('/verifikasi/export/:id', verifyToken, verifCtrl.exportVerificationExcel);
router.delete('/verifikasi/list/:id', verifyToken, verifCtrl.deleteVerificationTransaction);
router.put('/verifikasi/templates/:id', verifyToken, verifCtrl.updateTemplateName);

module.exports = router;
