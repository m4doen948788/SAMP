const express = require('express');
const router = express.Router();
const appSettingController = require('../controllers/appSettingController');
const { verifyToken, requireRole } = require('../../../config/authMiddleware');

// All app settings management requires Superadmin (ID: 1)
router.get('/', verifyToken, requireRole([1]), appSettingController.getAll);
router.get('/:key', verifyToken, requireRole([1]), appSettingController.getByKey);
router.put('/:key', verifyToken, requireRole([1]), appSettingController.update);

module.exports = router;
