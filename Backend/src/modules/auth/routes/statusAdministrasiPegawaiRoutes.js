const express = require('express');
const router = express.Router();
const controller = require('../controllers/statusAdministrasiPegawaiController');
const { verifyToken } = require('../../../config/authMiddleware');

router.get('/', verifyToken, controller.getAll);

module.exports = router;
