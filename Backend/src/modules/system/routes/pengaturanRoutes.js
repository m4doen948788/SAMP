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

// Widget Prompts Management
router.get('/widget-prompts', verifyToken, pengaturanController.getWidgetPrompts);
router.post('/widget-prompts', verifyToken, requireRole([1]), pengaturanController.addWidgetPrompt);
router.post('/widget-prompts/reorder', verifyToken, requireRole([1]), pengaturanController.reorderWidgetPrompts);
router.put('/widget-prompts/:id', verifyToken, requireRole([1]), pengaturanController.updateWidgetPrompt);
router.delete('/widget-prompts/:id', verifyToken, requireRole([1]), pengaturanController.deleteWidgetPrompt);

module.exports = router;
