const express = require('express');
const router = express.Router();
const rbacController = require('../controllers/rbacController');
const { requireRole } = require('../config/authMiddleware');

// Anyone logged in can fetch roles (used for dropdowns) or their own menu access
router.get('/roles', rbacController.getRoles);
router.get('/menu-access/:roleId', rbacController.getRoleAccess);

// Only Super Admin (ID: 1) can update role access configurations
router.post('/menu-access/:roleId', requireRole([1]), rbacController.updateRoleAccess);

// Activity Scope Management
router.get('/kegiatan-scopes', requireRole([1]), rbacController.getKegiatanScopes);
router.post('/kegiatan-scopes/:roleId', requireRole([1]), rbacController.updateKegiatanScope);


module.exports = router;
