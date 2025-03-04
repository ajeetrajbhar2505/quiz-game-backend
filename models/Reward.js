const mongoose = require('mongoose');

const RewardSchema = new mongoose.Schema({
  type: { type: String, required: true }, // Type of reward (e.g., points, badges, cash)
  value: { type: Number, required: true }, // Value of the reward (e.g., 50 points)
  description: { type: String, required: true }, // Description of the reward
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Reward', RewardSchema);
