const express = require('express');
const router = express.Router();
const themeController = require('../controllers/themeController');
const { verifyToken, requireRole } = require('../config/authMiddleware');

// Get global theme settings (Anyone logged in)
router.get('/settings', verifyToken, themeController.getSettings);

// Update global theme settings (Super Admin ID: 1 only)
router.post('/settings', verifyToken, requireRole([1]), themeController.updateGlobalSettings);

// Update individual user theme
router.post('/user', verifyToken, themeController.updateUserTheme);

module.exports = router;
