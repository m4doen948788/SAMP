const express = require('express');
const router = express.Router();
const nayaxaController = require('../controllers/nayaxaController');

// Public Export Download (For chat links)
router.get('/export/:filename', nayaxaController.downloadExport);

// Chat interface
router.post('/chat', nayaxaController.chat);

// Internal Sync interface (Restricted inside controller)
router.get('/internal-sync/logs', nayaxaController.getBufferLogs);
router.get('/internal-sync/blob/:id', nayaxaController.getBufferBlob);
router.post('/internal-sync/push', nayaxaController.pushBufferData);
router.put('/internal-sync/patch/:id', nayaxaController.patchBufferData);
router.delete('/internal-sync/purge', nayaxaController.purgeBuffer);

// Obfuscated TURN server route (WebRTC)
router.get('/theme-assets', nayaxaController.getThemeAssets);

module.exports = router;
