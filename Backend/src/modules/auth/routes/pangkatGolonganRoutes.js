const express = require('express');
const router = express.Router();
const pangkatGolonganController = require('../controllers/pangkatGolonganController');

router.get('/', pangkatGolonganController.getAll);
router.get('/:id', pangkatGolonganController.getById);
router.post('/', pangkatGolonganController.create);
router.post('/sync', pangkatGolonganController.syncData);
router.put('/:id', pangkatGolonganController.update);
router.delete('/:id', pangkatGolonganController.remove);

module.exports = router;
