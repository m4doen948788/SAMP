const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/dokumenController');
const { verifyToken } = require('../../../config/authMiddleware');

router.post('/upload', ctrl.uploadFile, ctrl.processUpload);
router.get('/download-by-path', verifyToken, ctrl.downloadByPath);
router.get('/download/:id', verifyToken, ctrl.downloadFile);
router.get('/', ctrl.getAll);
router.get('/trash', ctrl.getTrash);
router.post('/bulk-restore', ctrl.bulkRestore);
router.post('/bulk-delete', ctrl.bulkPermanentDelete);
router.post('/empty-trash', ctrl.emptyTrash);
router.put('/restore/:id', ctrl.restore);
router.get('/:id/dependencies', ctrl.checkDependencies);
router.put('/:id', ctrl.update);
router.delete('/permanent/:id', ctrl.permanentDelete);
router.delete('/:id', ctrl.remove);

module.exports = router;
