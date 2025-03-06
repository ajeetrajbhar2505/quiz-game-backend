const express = require('express');
const router = express.Router();
const quizAttemptController = require('../controllers/quizAttemptController');

router.post('/attempt', quizAttemptController.attemptQuiz);
router.get('/user/:userId', quizAttemptController.getUserAttempts);
router.get('/:id', quizAttemptController.getAttemptById);

module.exports = router;
