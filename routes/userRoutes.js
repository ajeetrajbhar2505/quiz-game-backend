const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// Register a new user
router.post('/register', userController.registerUser);

router.post('/login', userController.loginUser);

// Get user details (including rewards and total points)
router.get('/:userId', userController.getUserDetails);

// Update the user's total points and rewards
router.put('/:userId/update', userController.updateUserRewards);

module.exports = router;
