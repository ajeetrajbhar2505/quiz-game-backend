const mongoose = require('mongoose');

const QuizSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  questions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Question' }],
  reward: { type: mongoose.Schema.Types.ObjectId, ref: 'Reward', required: false }, // Reward is optional
  timeLimit: { type: Number, default: 300 }, // Time limit in seconds (5 min default)
  createdAt: { type: Date, default: Date.now }
});


module.exports = mongoose.model('Quiz', QuizSchema);
