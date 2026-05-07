const express = require('express');
const router = express.Router();
const qrController = require('../controllers/qrController');

/**
 * @swagger
 * tags:
 *   name: System
 *   description: System utilities
 */

/**
 * @swagger
 * /api/public/qr/generate:
 *   get:
 *     summary: Generate a QR code with optional logo
 *     tags: [System]
 *     parameters:
 *       - in: query
 *         name: text
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: logo
 *         schema:
 *           type: string
 *       - in: query
 *         name: size
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: PNG Image
 *         content:
 *           image/png:
 *             schema:
 *               type: string
 *               format: binary
 */
router.get('/generate', qrController.generate);

module.exports = router;
