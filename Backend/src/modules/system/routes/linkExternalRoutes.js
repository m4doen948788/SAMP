const express = require('express');
const router = express.Router();
const linkExternalController = require('../controllers/linkExternalController');

router.get('/', linkExternalController.getAll);
router.get('/:id', linkExternalController.getById);
router.post('/', linkExternalController.create);
router.put('/:id', linkExternalController.update);
router.delete('/:id', linkExternalController.remove);

module.exports = router;
