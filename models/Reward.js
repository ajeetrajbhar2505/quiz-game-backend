const mongoose = require('mongoose');

const RewardSchema = new mongoose.Schema({
  type: { 
    type: String, 
    enum: ['points', 'cash', 'badge', 'bonus'], // Reward types
    required: true 
  }, 
  value: { type: Number, required: true }, // Example: 50 points or ₹10
  description: { type: String, required: true }, // Example: "Earned from quiz", "Daily Challenge Bonus"
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Who received the reward
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Reward', RewardSchema);
