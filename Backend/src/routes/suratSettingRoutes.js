const express = require('express');
const router = express.Router();
const suratSettingController = require('../controllers/suratSettingController');
const { verifyToken } = require('../config/authMiddleware');

router.use(verifyToken);

router.get('/settings', suratSettingController.getSettings);
router.post('/settings', suratSettingController.updateSettings);
router.get('/stats', suratSettingController.getSlotStats);
router.get('/logs', suratSettingController.getLogs);
router.get('/debug-logs', suratSettingController.debugGetAll);

module.exports = router;
