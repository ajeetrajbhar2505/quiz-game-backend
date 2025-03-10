const mongoose = require('mongoose');

const RewardSchema = new mongoose.Schema({
  type: { 
    type: String, 
    enum: ['points', 'cash', 'badge', 'bonus'], // Reward types
    required: true 
  }, 
  value: { type: Number, required: true }, 
  description: { type: String, required: true }, 
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Reward', RewardSchema);
