const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/suratApprovalController');
const { verifyToken } = require('../../../config/authMiddleware');

router.post('/submit', verifyToken, ctrl.submitDraft);
router.get('/pending', verifyToken, ctrl.getPendingApprovals);
router.put('/process/:id', verifyToken, ctrl.processAction);
router.put('/upload-final/:id', verifyToken, ctrl.uploadFinal);
router.put('/bypass/:id', verifyToken, ctrl.bypassApproval);
router.get('/history/:surat_id', verifyToken, ctrl.getHistory);

// Public route for document verification
router.get('/verify/:slug', ctrl.verifyDocument);

module.exports = router;
