const express = require('express');
const router = express.Router();
const controller = require('../controllers/internalInstansiController');
const { verifyToken } = require('../../../config/authMiddleware');

router.get('/:instansi_id', controller.getInternalInstansi);
router.put('/:instansi_id/profil', verifyToken, controller.updateProfilInstansi);
router.post('/:instansi_id/logo', verifyToken, controller.uploadLogo);

module.exports = router;
