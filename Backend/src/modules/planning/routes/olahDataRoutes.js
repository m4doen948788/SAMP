const express = require('express');
const router = express.Router();
const multer = require('multer');
const ctrl = require('../controllers/olahDataController');
const { verifyToken } = require('../../../config/authMiddleware');

// Setup multer memory storage (no permanent file saved on disk)
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

router.post('/inspect', verifyToken, upload.single('file'), ctrl.inspectExcel);
router.post('/process', verifyToken, upload.single('file'), ctrl.processExcel);
router.post('/compare', verifyToken, ctrl.compareExcel);
router.post('/unique-values', verifyToken, upload.single('file'), ctrl.getUniqueValues);

// Template management routes
router.get('/templates', verifyToken, ctrl.getTemplates);
router.post('/templates', verifyToken, ctrl.saveTemplate);
router.delete('/templates/:id', verifyToken, ctrl.deleteTemplate);

module.exports = router;
