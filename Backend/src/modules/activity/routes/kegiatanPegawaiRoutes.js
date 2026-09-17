const express = require('express');
const router = express.Router();
const controller = require('../controllers/kegiatanPegawaiController');
const { verifyToken: auth } = require('../../../config/authMiddleware');

router.get('/monthly', auth, controller.getMonthlyActivities);
router.post('/upsert', auth, controller.upsertActivity);
router.get('/yearly', auth, controller.getYearlySummary);

module.exports = router;
