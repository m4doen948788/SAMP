const express = require('express');
const router = express.Router();
const auditController = require('../controllers/auditController');
const { verifyToken, requireRole } = require('../../../config/authMiddleware');

// Only Superadmin (ID: 1) can view audit trail
router.get('/', verifyToken, requireRole([1]), auditController.getAll);
router.get('/actions', verifyToken, requireRole([1]), auditController.getActions);
router.get('/tables', verifyToken, requireRole([1]), auditController.getTables);

module.exports = router;
