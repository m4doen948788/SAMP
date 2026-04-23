const express = require('express');
const router = express.Router();
const nayaxaController = require('../controllers/nayaxaController');

// Public Export Download (For chat links)
router.get('/export/:filename', nayaxaController.downloadExport);

// Chat interface
router.post('/chat', nayaxaController.chat);

module.exports = router;
