const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/dokumenController');

router.post('/upload', ctrl.uploadFile, ctrl.processUpload);
router.get('/', ctrl.getAll);
router.delete('/:id', ctrl.remove);

module.exports = router;
