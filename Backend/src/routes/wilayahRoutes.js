const express = require('express');
const router = express.Router();
const wilayahController = require('../controllers/wilayahController');

// Get all provinsi
router.get('/provinsi', wilayahController.getProvinsi);

// Get all kota/kabupaten (for search dropdown)
router.get('/kota-kabupaten', wilayahController.getAllKota);

// Get kota/kabupaten by provinsi
router.get('/kota-kabupaten/:provinsiId', wilayahController.getKotaByProvinsi);

// Get kecamatan by kota
router.get('/kecamatan/:kotaId', wilayahController.getKecamatanByKota);

// Get kelurahan by kecamatan
router.get('/kelurahan/:kecamatanId', wilayahController.getKelurahanByKecamatan);

module.exports = router;
