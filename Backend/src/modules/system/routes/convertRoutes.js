const express = require('express');
const router = express.Router();
const { convertPptxToPdf } = require('../controllers/convertController');

/**
 * GET /api/convert/pptx-preview?path=/uploads/dashboard/file.pptx
 * Converts a PPTX file to PDF and streams it back for inline viewing.
 * Requires authentication (handled by global verifyToken middleware).
 */
router.get('/pptx-preview', convertPptxToPdf);

module.exports = router;
