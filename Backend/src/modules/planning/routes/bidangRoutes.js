const express = require('express');
const router = express.Router();
const bidangController = require('../controllers/bidangController');

router.get('/', bidangController.getAll);
router.get('/:id', bidangController.getById);
router.post('/', bidangController.create);
router.put('/:id', bidangController.update);
router.delete('/:id', bidangController.remove);

module.exports = router;
