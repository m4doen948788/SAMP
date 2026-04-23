const express = require('express');
const router = express.Router();
const tematikController = require('../controllers/tematikController');

router.get('/', tematikController.getAll);
router.get('/:id', tematikController.getById);
router.post('/', tematikController.create);
router.put('/:id', tematikController.update);
router.delete('/:id', tematikController.remove);

module.exports = router;
