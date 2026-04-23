const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/tableLabelController');

router.get('/', ctrl.getAll);
router.get('/available-tables', ctrl.getAvailableTables);
router.get('/:tableName', ctrl.getByTable);
router.post('/', ctrl.upsert);

module.exports = router;
