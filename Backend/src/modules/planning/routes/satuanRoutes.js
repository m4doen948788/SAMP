const express = require('express');
const router = express.Router();
const satuanController = require('../controllers/satuanController');

router.get('/', satuanController.getAll);
router.get('/:id', satuanController.getById);
router.post('/', satuanController.create);
router.put('/:id', satuanController.update);
router.delete('/:id', satuanController.remove);

module.exports = router;
