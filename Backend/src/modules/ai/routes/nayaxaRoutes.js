const express = require('express');
const router = express.Router();
const nayaxaController = require('../controllers/nayaxaController');

// Public Export Download (For chat links)
router.get('/export/:filename', nayaxaController.downloadExport);

// Chat interface
router.post('/chat', nayaxaController.chat);


// WhatsApp Web Authentic QR & Session routes
router.get('/wa/status', nayaxaController.getWaStatus);
router.post('/wa/logout', nayaxaController.logoutWa);
router.post('/wa/send', nayaxaController.sendWaMessage);

module.exports = router;
