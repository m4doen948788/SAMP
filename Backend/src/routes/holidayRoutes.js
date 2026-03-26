const express = require('express');
const router = express.Router();
const holidayController = require('../controllers/holidayController');
const { verifyToken } = require('../config/authMiddleware');

router.get('/', verifyToken, holidayController.getAll);
router.get('/monthly', verifyToken, holidayController.getByMonth);
router.post('/toggle', verifyToken, holidayController.toggle);
router.post('/bulk-upsert', verifyToken, holidayController.bulkUpsert);
router.post('/bulk-delete', verifyToken, holidayController.bulkDelete);

module.exports = router;
