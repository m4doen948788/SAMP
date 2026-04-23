const express = require('express');
const router = express.Router();
const mappingPemegangSektorController = require('../controllers/mappingPemegangSektorController');

// All routes are protected by the auth middleware in index.js
router.get('/', mappingPemegangSektorController.getAll);
router.post('/', mappingPemegangSektorController.update);
router.get('/available-instansi/:pegawai_id', mappingPemegangSektorController.getAvailableInstansi);

module.exports = router;
