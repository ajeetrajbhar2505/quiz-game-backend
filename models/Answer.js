const mongoose = require('mongoose');

const AnswerSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Reference to User
  question: { type: mongoose.Schema.Types.ObjectId, ref: 'Question', required: true }, // Reference to Question
  selectedAnswer: { type: String, required: true }, // User's selected answer
  isCorrect: { type: Boolean, default: false }, // Tracks whether the answer was correct
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Answer', AnswerSchema);
