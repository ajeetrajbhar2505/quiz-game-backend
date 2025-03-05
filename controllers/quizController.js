const Quiz = require('../models/Quiz');
const QuizAttempt = require('../models/QuizAttempt');
const Answer = require('../models/Answer');
const Reward = require('../models/Reward');
const User = require('../models/User');
const Question = require('../models/Question');

// Create a new quiz
exports.createQuiz = async (req, res) => {
  try {
    const { title, description, questions, rewardId } = req.body;

    // Check if the provided rewardId exists in the database
    let reward = await Reward.findById(rewardId);

    // If reward doesn't exist, create a new one with default values
    if (!reward) {
      reward = await new Reward({
        type: "Points",
        value: 50,
        description: "Reward for completing the quiz successfully.",
      }).save();
    }

    // Create the quiz first
    const newQuiz = new Quiz({
      title,
      description,
      reward: reward._id, // Reference to the reward ObjectId
    });

    // Save the quiz and get its saved _id
    const savedQuiz = await newQuiz.save();

    // Save the questions and link them to the newly created quiz
    const savedQuestionIds = [];
    for (const { text, options, correctAnswer } of questions) {
      const newQuestion = new Question({
        text,
        options,
        correctAnswer,
        quiz: savedQuiz._id,  // Link question to the saved quiz
      });
      const savedQuestion = await newQuestion.save();
      savedQuestionIds.push(savedQuestion._id);
    }

    // Update the quiz with the list of saved question ObjectIds
    savedQuiz.questions = savedQuestionIds;
    await savedQuiz.save(); // Save the quiz again after associating questions

    // Return the created quiz with its questions
    res.status(201).json(savedQuiz);
  } catch (error) {
    // Improved error message for debugging
    console.error('Error creating quiz:', error);
    res.status(500).json({ message: 'An error occurred while creating the quiz.', error: error.message });
  }
};




// Get all quizzes
exports.getAllQuizzes = async (req, res) => {
  try {
    const quizzes = await Quiz.find().populate('reward').populate('questions');
    res.status(200).json(quizzes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get quiz by ID
exports.getQuizById = async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.quizId)
      .populate('reward')
      .populate('questions');

    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    res.status(200).json(quiz);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Attempt a quiz
exports.attemptQuiz = async (req, res) => {
  try {
    const { userId, answers } = req.body;
    const quiz = await Quiz.findById(req.params.quizId).populate('questions');

    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    const correctAnswers = [];
    const totalQuestions = quiz.questions.length;

    // Validate answers
    for (let i = 0; i < totalQuestions; i++) {
      const question = await Question.findById(quiz.questions[i]);
      const userAnswer = answers[i];

      const isCorrect = userAnswer === question.correctAnswer;
      correctAnswers.push(isCorrect);

      // Store the answer
      await Answer.create({
        user: userId,
        question: question._id,
        selectedAnswer: userAnswer,
        isCorrect
      });
    }

    const score = correctAnswers.filter(answer => answer).length;
    const reward = quiz.reward;

    // Create a quiz attempt record
    const newQuizAttempt = new QuizAttempt({
      user: userId,
      quiz: quiz._id,
      score,
      reward,
      answers: answers.map((_, index) => quiz.questions[index]),
    });

    await newQuizAttempt.save();

    // Update the user with their rewards and points
    const user = await User.findById(userId);
    user.totalPoints += score;
    user.rewards.push(reward);
    await user.save();

    res.status(200).json({
      message: `Quiz completed. Your score is ${score}/${totalQuestions}`,
      reward,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
