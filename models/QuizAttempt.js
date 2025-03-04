const mongoose = require('mongoose');

const QuizAttemptSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Reference to User
  quiz: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true }, // Reference to Quiz
  score: { type: Number, required: true }, // Score earned for this attempt
  answers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Answer' }], // Answers for this attempt
  reward: { type: mongoose.Schema.Types.ObjectId, ref: 'Reward' }, // Reward earned for this attempt
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('QuizAttempt', QuizAttemptSchema);
