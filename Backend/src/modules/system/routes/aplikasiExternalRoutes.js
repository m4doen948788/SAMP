const express = require('express');
const router = express.Router();
const aplikasiExternalController = require('../controllers/aplikasiExternalController');

router.get('/', aplikasiExternalController.getAll);
router.get('/:id', aplikasiExternalController.getById);
router.post('/', aplikasiExternalController.create);
router.put('/:id', aplikasiExternalController.update);
router.delete('/:id', aplikasiExternalController.remove);

module.exports = router;
