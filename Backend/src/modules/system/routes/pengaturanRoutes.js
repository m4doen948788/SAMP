const express = require('express');
const router = express.Router();
const pengaturanController = require('../controllers/pengaturanController');
const { verifyToken, requireRole } = require('../../../config/authMiddleware');

// Gemini Keys Management (Only Superadmin ID: 1)
router.get('/gemini-keys', verifyToken, requireRole([1]), pengaturanController.getGeminiKeys);
router.post('/gemini-keys', verifyToken, requireRole([1]), pengaturanController.addGeminiKey);
router.put('/gemini-keys/:id', verifyToken, requireRole([1]), pengaturanController.updateGeminiKey);
router.delete('/gemini-keys/:id', verifyToken, requireRole([1]), pengaturanController.deleteGeminiKey);
router.patch('/gemini-keys/:id/activate', verifyToken, requireRole([1]), pengaturanController.activateGeminiKey);

module.exports = router;
