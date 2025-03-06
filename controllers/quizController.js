const Quiz = require('../models/Quiz');

// Create a Quiz
exports.createQuiz = async (req, res) => {
    try {
        const { title, description, questions } = req.body;
        
        const quiz = new Quiz({
            title,
            description,
            questions
        });

        await quiz.save();
        res.status(201).json({ message: 'Quiz created successfully', quiz });

    } catch (error) {
        res.status(500).json({ message: 'Error creating quiz', error });
    }
};

// Get All Quizzes
exports.getQuizzes = async (req, res) => {
    try {
        const quizzes = await Quiz.find().populate('questions');
        res.json(quizzes);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching quizzes', error });
    }
};

// Get Single Quiz by ID
exports.getQuizById = async (req, res) => {
    try {
        const quiz = await Quiz.findById(req.params.id).populate('questions');
        if (!quiz) return res.status(404).json({ message: 'Quiz not found' });

        res.json(quiz);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching quiz', error });
    }
};

// Delete a Quiz
exports.deleteQuiz = async (req, res) => {
    try {
        const quiz = await Quiz.findByIdAndDelete(req.params.id);
        if (!quiz) return res.status(404).json({ message: 'Quiz not found' });

        res.json({ message: 'Quiz deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting quiz', error });
    }
};
