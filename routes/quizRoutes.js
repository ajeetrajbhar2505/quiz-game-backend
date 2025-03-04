const express = require('express');
const router = express.Router();
const quizController = require('../controllers/quizController');

// Create a new quiz
router.post('/create', quizController.createQuiz);

// Get a list of all quizzes
router.get('/', quizController.getAllQuizzes);

// Get a single quiz by its ID
router.get('/:quizId', quizController.getQuizById);

// Attempt a quiz
router.post('/:quizId/attempt', quizController.attemptQuiz);

module.exports = router;
