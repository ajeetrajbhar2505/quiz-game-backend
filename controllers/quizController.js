// Create a Quiz
const Quiz = require('../models/Quiz');
const Question = require('../models/Question');



exports.createQuiz = async (req, res) => {
    try {
        const { title, description, questions } = req.body;

        // Step 1: Create and save the quiz first
        const quiz = new Quiz({
            title,
            description,
        });

        // Save the quiz to get its ObjectId
        const savedQuiz = await quiz.save();

        // Step 2: Dynamically create questions and associate them with the quiz
        const questionIds = [];
        for (let questionData of questions) {
            const { text, options, correctAnswer } = questionData;

            // Create a new question and associate it with the quiz
            const question = new Question({
                text,
                options,
                correctAnswer,
                quiz: savedQuiz._id, // Set the quiz reference
            });

            const savedQuestion = await question.save();
            questionIds.push(savedQuestion._id); // Push the saved question's ObjectId
        }

        // Step 3: Update the quiz with the references to the questions
        savedQuiz.questions = questionIds;
        await savedQuiz.save();

        res.status(201).json({ message: 'Quiz created successfully', quiz: savedQuiz });

    } catch (error) {
        console.error(error);
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
