const express = require('express');
const router = express.Router();
const tipeLinkController = require('../controllers/tipeLinkController');

router.get('/', tipeLinkController.getAll);
router.get('/:id', tipeLinkController.getById);
router.post('/', tipeLinkController.create);
router.put('/:id', tipeLinkController.update);
router.delete('/:id', tipeLinkController.remove);

module.exports = router;
