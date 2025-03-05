const mongoose = require('mongoose');

const QuestionSchema = new mongoose.Schema({
  text: { type: String, required: true },
  options: [{ type: String }],
  correctAnswer: { type: String },
  quiz: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: false },  
});

module.exports = mongoose.model('Question', QuestionSchema);
