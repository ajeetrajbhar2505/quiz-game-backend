const QuizAttempt = require('../models/QuizAttempt');
const User = require('../models/User');
const Quiz = require('../models/Quiz');
const Reward = require('../models/Reward');
const Wallet = require('../models/wallet');

// Attempt a Quiz & Calculate Score
exports.attemptQuiz = async (req, res) => {
    try {
      const { userId,quizId, answers } = req.body;
  
      // 1. Fetch the quiz & its questions
      const quiz = await Quiz.findById(quizId).populate('questions');
      if (!quiz) {
        return res.status(404).json({ message: 'Quiz not found' });
      }
  
      // 2. Calculate score
      let score = 0;
      quiz.questions.forEach((question, index) => {
        if (question.correctAnswer === answers[index]) {
          score++;
        }
      });
  
      // 3. Save quiz attempt
      const attempt = new QuizAttempt({
        user: userId,
        quiz: quizId,
        score,
        answers
      });
      await attempt.save();
  
      // 4. Calculate rupees earned
      const rupeesToAdd = (score / 100) * 10;
  
      // 5. Get user with rewards & wallet
      const user = await User.findById(userId).populate('rewards wallet');
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
  
      const description = 'Quiz Attempted';
      const type = 'points';
  
      // 6. Check for existing reward
      const existingReward = user.rewards.find(
        reward => reward.description === description && reward.type === type
      );
  
      if (existingReward) {
        // 7. Update existing reward points
        await Reward.findByIdAndUpdate(existingReward._id, { $inc: { value: score } });
  
        // 8. Update user's total points (re-fetch all rewards to sum up properly)
        const updatedRewards = await Reward.find({ _id: { $in: user.rewards } });
        const totalPoints = updatedRewards.reduce((total, reward) => total + reward.value, 0);
        await User.findByIdAndUpdate(userId, { totalPoints });
  
        // 9. Update wallet balance
        await Wallet.findByIdAndUpdate(user.wallet._id, { $inc: { balance: rupeesToAdd } });
  
        return res.status(200).json({
          message: 'Reward value updated successfully',
          rewardId: existingReward._id,
          score,
          rupeesEarned: rupeesToAdd
        });
      } else {
        // 10. Create a new reward
        const newReward = new Reward({
          description,
          value: score,
          type,
        });
        await newReward.save();
  
        // 11. Add reward to user's rewards array
        user.rewards.push(newReward._id);
        await user.save();
  
        // 12. Update user's total points
        const updatedRewards = await Reward.find({ _id: { $in: user.rewards } });
        const totalPoints = updatedRewards.reduce((total, reward) => total + reward.value, 0);
        await User.findByIdAndUpdate(userId, { totalPoints });
  
        // 13. Update wallet balance
        await Wallet.findByIdAndUpdate(user.wallet._id, { $inc: { balance: rupeesToAdd } });
  
        return res.status(201).json({
          message: 'New reward added successfully',
          rewardId: newReward._id,
          score,
          rupeesEarned: rupeesToAdd
        });
      }
  
    } catch (error) {
      console.error('Error attempting quiz:', error);
      res.status(500).json({ message: 'Error attempting quiz', error: error.message });
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
