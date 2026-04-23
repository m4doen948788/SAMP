const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// GET all users
router.get('/', userController.getAll);

// GET simple list
router.get('/list', userController.getSimpleList);

// GET unlinked profiles
router.get('/unlinked-profiles', userController.getUnlinkedProfiles);

// GET user by id
router.get('/:id', userController.getById);

// POST create user
router.post('/', userController.create);

// PUT update user
router.put('/:id', userController.update);

// DELETE user
router.delete('/:id', userController.delete);

module.exports = router;
