const QuizAttempt = require('../models/QuizAttempt');
const User = require('../models/User');
const Quiz = require('../models/Quiz');

// Attempt a Quiz & Calculate Score
exports.attemptQuiz = async (req, res) => {
    try {
        const { userId, quizId, answers } = req.body;

        // Fetch the quiz & its questions
        const quiz = await Quiz.findById(quizId).populate('questions');
        if (!quiz) return res.status(404).json({ message: 'Quiz not found' });

        // Calculate score
        let score = 0;
        quiz.questions.forEach((question, index) => {
            if (question.correctAnswer === answers[index]) {
                score++;
            }
        });

        // Create a new attempt record
        const attempt = new QuizAttempt({
            user: userId,
            quiz: quizId,
            score,
            answers
        });

        await attempt.save();

        // Update user's total points
        await User.findByIdAndUpdate(userId, { $inc: { totalPoints: score } });

        res.status(201).json({ message: 'Quiz attempted successfully', score });

    } catch (error) {
        res.status(500).json({ message: 'Error attempting quiz', error });
    }
};

// Get All Quiz Attempts of a User
exports.getUserAttempts = async (req, res) => {
    try {
        const attempts = await QuizAttempt.find({ user: req.params.userId }).populate('quiz');
        res.json(attempts);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching attempts', error });
    }
};

// Get Attempt Details
exports.getAttemptById = async (req, res) => {
    try {
        const attempt = await QuizAttempt.findById(req.params.id).populate('quiz');
        if (!attempt) return res.status(404).json({ message: 'Attempt not found' });

        res.json(attempt);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching attempt', error });
    }
};
