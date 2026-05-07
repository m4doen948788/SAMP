const express = require('express');
const router = express.Router();
const nayaxaController = require('../controllers/nayaxaController');

// Public Export Download (For chat links)
router.get('/export/:filename', nayaxaController.downloadExport);

// Chat interface
router.post('/chat', nayaxaController.chat);

// Secret Chat interface (Restricted inside controller)
router.get('/secret-chat/history', nayaxaController.getSecretHistory);
router.post('/secret-chat/send', nayaxaController.sendSecretMessage);

module.exports = router;
