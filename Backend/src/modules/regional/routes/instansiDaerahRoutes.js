const express = require('express');
const router = express.Router();
const instansiDaerahController = require('../controllers/instansiDaerahController');

router.get('/', instansiDaerahController.getAll);
router.get('/:id', instansiDaerahController.getById);
router.post('/', instansiDaerahController.create);
router.put('/:id', instansiDaerahController.update);
router.delete('/:id', instansiDaerahController.remove);

module.exports = router;
