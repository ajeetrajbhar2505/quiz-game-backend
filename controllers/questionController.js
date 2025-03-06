const Question = require('../models/Question');
const Quiz = require('../models/Quiz');

// Create a Question and Add to Quiz
exports.createQuestion = async (req, res) => {
    try {
        const { text, options, correctAnswer, quizId } = req.body;

        const question = new Question({
            text,
            options,
            correctAnswer,
            quiz: quizId || null
        });

        await question.save();

        // Add the question to the quiz if quizId is provided
        if (quizId) {
            await Quiz.findByIdAndUpdate(quizId, { $push: { questions: question._id } });
        }

        res.status(201).json({ message: 'Question created successfully', question });

    } catch (error) {
        res.status(500).json({ message: 'Error creating question', error });
    }
};

// Get All Questions
exports.getQuestions = async (req, res) => {
    try {
        const questions = await Question.find();
        res.json(questions);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching questions', error });
    }
};

// Get Single Question by ID
exports.getQuestionById = async (req, res) => {
    try {
        const question = await Question.findById(req.params.id);
        if (!question) return res.status(404).json({ message: 'Question not found' });

        res.json(question);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching question', error });
    }
};

// Delete a Question
exports.deleteQuestion = async (req, res) => {
    try {
        const question = await Question.findByIdAndDelete(req.params.id);
        if (!question) return res.status(404).json({ message: 'Question not found' });

        res.json({ message: 'Question deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting question', error });
    }
};
