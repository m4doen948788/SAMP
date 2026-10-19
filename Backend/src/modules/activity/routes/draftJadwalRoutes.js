const express = require('express');
const router = express.Router();
const draftJadwalController = require('../controllers/draftJadwalController');

// 1. Get Kecamatan for current user's kabupaten
router.get('/kecamatan', draftJadwalController.getKecamatan);

// 2. Check officer DL availability
router.get('/check-availability', draftJadwalController.checkDlAvailability);

// 2.5 Approval Workflow & Katim
router.get('/katim-list', draftJadwalController.getKatimList);
router.get('/approvals/pending', draftJadwalController.getPendingApprovals);

// 3. Draft CRUD & Import
router.get('/', draftJadwalController.getAll);
router.post('/import-excel', draftJadwalController.importExcel);
router.get('/:id', draftJadwalController.getById);
router.post('/', draftJadwalController.create);
router.put('/:id', draftJadwalController.update);
router.delete('/:id', draftJadwalController.remove);
router.put('/:id/restore', draftJadwalController.restore);
router.delete('/:id/permanent', draftJadwalController.permanentDelete);

// 3.5 Approval Actions
router.post('/:id/submit-approval', draftJadwalController.submitApproval);
router.post('/:id/approve', draftJadwalController.approve);
router.post('/:id/reject', draftJadwalController.reject);

// 4. Team-specific endpoints
router.post('/:id/teams', draftJadwalController.addTeam);
router.put('/teams/:teamId', draftJadwalController.updateTeam);
router.delete('/teams/:teamId', draftJadwalController.deleteTeam);
router.post('/teams/:teamId/integrate', draftJadwalController.integrateTeam);

// 5. Integrate entire draft
router.post('/:id/integrate', draftJadwalController.integrate);

module.exports = router;
