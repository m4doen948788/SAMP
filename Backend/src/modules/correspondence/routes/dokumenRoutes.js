const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/dokumenController');

router.post('/upload', ctrl.uploadFile, ctrl.processUpload);
router.get('/', ctrl.getAll);
router.get('/trash', ctrl.getTrash);
router.post('/bulk-restore', ctrl.bulkRestore);
router.post('/bulk-delete', ctrl.bulkPermanentDelete);
router.post('/empty-trash', ctrl.emptyTrash);
router.put('/restore/:id', ctrl.restore);
router.put('/:id', ctrl.update);
router.delete('/permanent/:id', ctrl.permanentDelete);
router.delete('/:id', ctrl.remove);

module.exports = router;
