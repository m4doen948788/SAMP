const express = require('express');
const router = express.Router();
const nayaxaController = require('../controllers/nayaxaController');

// Public Export Download (For chat links)
router.get('/export/:filename', nayaxaController.downloadExport);

// Chat interface
router.post('/chat', nayaxaController.chat);

// Secret Chat interface (Restricted inside controller)
router.get('/secret-chat/history', nayaxaController.getSecretHistory);
router.get('/secret-chat/file/:id', nayaxaController.getSecretFile);
router.post('/secret-chat/send', nayaxaController.sendSecretMessage);
router.put('/secret-chat/edit/:id', nayaxaController.editSecretMessage);
router.delete('/secret-chat/clear', nayaxaController.clearSecretChat);

module.exports = router;
