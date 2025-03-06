const mongoose = require('mongoose');

const QuestionSchema = new mongoose.Schema({
  text: { type: String, required: true },
  options: [{ type: String, required: true }], // Ensuring options are always present
  correctAnswer: { type: String, required: true }, // Must be defined
  quiz: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: false }
});


module.exports = mongoose.model('Question', QuestionSchema);
