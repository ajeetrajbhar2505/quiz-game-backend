const mongoose = require('mongoose');

const AnswerSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  question: { type: mongoose.Schema.Types.ObjectId, ref: 'Question', required: true },
  selectedAnswer: { type: String, required: true },
  isCorrect: { type: Boolean, default: false },
  score: { type: Number, default: 0 }, // Points earned per question
  createdAt: { type: Date, default: Date.now }
});


module.exports = mongoose.model('Answer', AnswerSchema);
