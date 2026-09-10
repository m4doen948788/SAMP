const express = require('express');
const router = express.Router();
const tematikController = require('../controllers/tematikController');

// Standard CRUD
router.get('/', tematikController.getAll);
router.get('/:id', tematikController.getById);
router.post('/', tematikController.create);
router.put('/:id', tematikController.update);
router.delete('/:id', tematikController.remove);

// Tematik Hub aggregated data
router.get('/:id/hub', tematikController.getHubData);

// Mandatory Document Operations (ala RPJPD)
router.post(
  '/:id/mandatory-doc/upload',
  tematikController.uploadMandatoryMiddleware,
  tematikController.uploadMandatoryDocument
);
router.post('/:id/mandatory-doc/link', tematikController.linkMandatoryDocument);
router.post('/:id/mandatory-doc/unlink', tematikController.unlinkMandatoryDocument);
router.get('/:id/mandatory-doc/:slot_id/history', tematikController.getMandatoryDocHistory);

module.exports = router;
