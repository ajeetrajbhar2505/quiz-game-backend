const mongoose = require('mongoose');

const QuestionSchema = new mongoose.Schema({
  quiz: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true }, // Reference to Quiz
  text: { type: String, required: true },
  options: [{ type: String, required: true }], // List of answer options
  correctAnswer: { type: String, required: true }, // Correct answer option
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Question', QuestionSchema);
