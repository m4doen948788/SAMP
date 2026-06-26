const express = require('express');
const router = express.Router();
const skpController = require('../controllers/skpController');

router.get('/records', skpController.getPegawaiRecords);
router.get('/summary', skpController.getSummary);
router.post('/records', skpController.savePegawaiRecord);
router.get('/monthly-links', skpController.getMonthlyLinks);
router.post('/monthly-links', skpController.saveMonthlyLink);

module.exports = router;
