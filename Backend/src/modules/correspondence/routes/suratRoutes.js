const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/suratController');
const makerCtrl = require('../controllers/suratMakerController');
const { verifyToken } = require('../../../config/authMiddleware');

/**
 * @swagger
 * tags:
 *   name: Correspondence
 *   description: Letter and Document management
 */

/**
 * @swagger
 * /api/surat:
 *   get:
 *     summary: Get all letters
 *     tags: [Correspondence]
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [masuk, keluar]
 *     responses:
 *       200:
 *         description: List of letters
 */
router.get('/', ctrl.getAll);

/**
 * @swagger
 * /api/surat/masuk:
 *   post:
 *     summary: Register incoming letter
 *     tags: [Correspondence]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [nomor_surat, perihal, asal_surat, tanggal_surat]
 *     responses:
 *       201:
 *         description: Letter registered
 */
router.post('/masuk', ctrl.saveSuratMasuk);

/**
 * @swagger
 * /api/surat/keluar:
 *   post:
 *     summary: Generate outgoing letter
 *     tags: [Correspondence]
 *     responses:
 *       201:
 *         description: Letter generated
 */
router.post('/keluar', ctrl.generateSuratKeluar);

/**
 * @swagger
 * /api/surat/generate-docx:
 *   post:
 *     summary: Generate DOCX from template
 *     tags: [Correspondence]
 *     responses:
 *       200:
 *         description: DOCX generated successfully
 */
router.post('/generate-docx', makerCtrl.generateDocx);

router.get('/klasifikasi', verifyToken, makerCtrl.getKlasifikasi);
router.get('/next-number', verifyToken, makerCtrl.getNextNumber);
router.post('/take-number', verifyToken, makerCtrl.takeNumber);
router.get('/number-logs', verifyToken, makerCtrl.getNumberLogs);
router.put('/update-number-log/:id', verifyToken, makerCtrl.updateNumberLog);

/**
 * @swagger
 * /api/surat/{id}:
 *   put:
 *     summary: Update letter data
 *     tags: [Correspondence]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Update successful
 *   delete:
 *     summary: Delete letter
 *     tags: [Correspondence]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Delete successful
 */
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.delete);

module.exports = router;
