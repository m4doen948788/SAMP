const express = require('express');
const router = express.Router();
const controller = require('../controllers/kegiatanManajemenController');
const { verifyToken } = require('../../../config/authMiddleware');

router.get('/ketersediaan-petugas', verifyToken, controller.checkAvailability);
router.get('/trash', verifyToken, controller.getTrash);
router.delete('/trash/empty', verifyToken, controller.emptyTrash);
router.post('/restore/:id', verifyToken, controller.restore);
router.delete('/permanent/:id', verifyToken, controller.permanentDelete);
router.get('/', verifyToken, controller.getAll);
router.get('/:id', verifyToken, controller.getById);
router.post('/', verifyToken, controller.uploadMiddleware, controller.create);
router.put('/:id', verifyToken, controller.uploadMiddleware, controller.update);
router.delete('/:id', verifyToken, controller.remove);

module.exports = router;
