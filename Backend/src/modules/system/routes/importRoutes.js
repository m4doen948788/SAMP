const express = require('express');
const router = express.Router();
const multer = require('multer');
const importController = require('../controllers/importController');
const { verifyToken } = require('../../../config/authMiddleware');

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

router.post('/perencanaan', verifyToken, upload.single('file'), importController.importPerencanaan);

module.exports = router;
