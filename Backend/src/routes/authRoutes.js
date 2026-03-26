const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifyToken } = require('../config/authMiddleware');

// Public route
router.post('/login', authController.login);

// Protected route (requires valid token)
router.get('/me', verifyToken, authController.me);

module.exports = router;
