const express = require('express');
const router = express.Router();
const tahunController = require('../controllers/tahunController');

router.get('/', tahunController.getAll);
router.get('/:id', tahunController.getById);
router.post('/', tahunController.create);
router.put('/:id', tahunController.update);
router.delete('/:id', tahunController.remove);

module.exports = router;
