const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// Get a user's profile
router.get('/:userId', userController.getUserById);

// Get all users (optional, admin maybe)
router.get('/', userController.getAllUsers);

// Update user profile
router.put('/:userId', userController.updateUser);

// Delete user (optional)
router.delete('/:userId', userController.deleteUser);

module.exports = router;
