const express = require('express');
const router = express.Router();
const profilPegawaiController = require('../controllers/profilPegawaiController');

// General CRUD for standalone profile management
router.get('/', profilPegawaiController.getAll);
router.post('/', profilPegawaiController.create);
router.post('/bulk', profilPegawaiController.bulkCreate);
router.post('/bulk-create-accounts', profilPegawaiController.bulkCreateAccounts);
router.get('/id/:id', profilPegawaiController.getById);
router.put('/id/:id', profilPegawaiController.update);
router.delete('/id/:id', profilPegawaiController.delete);

// Get full profile (users + profil_pegawai combined)
router.get('/:userId/full', profilPegawaiController.getFullProfile);

// Get profile by user_id
router.get('/:userId', profilPegawaiController.getByUserId);

// Create or Update profile by user_id
router.post('/:userId', profilPegawaiController.upsertProfile);

// Update account info (username, no_hp)
router.put('/:userId/account', profilPegawaiController.updateAccount);

// Change password
router.put('/:userId/password', profilPegawaiController.changePassword);

module.exports = router;

