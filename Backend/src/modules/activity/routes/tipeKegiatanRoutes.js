const express = require('express');
const router = express.Router();
const tipeKegiatanController = require('../controllers/tipeKegiatanController');

router.get('/', tipeKegiatanController.getAll);
router.get('/:id', tipeKegiatanController.getById);
router.post('/', tipeKegiatanController.create);
router.put('/:id', tipeKegiatanController.update);
router.delete('/:id', tipeKegiatanController.remove);

module.exports = router;
