const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  totalPoints: { type: Number, default: 0 }, // Tracks total points a user has earned
  rewards: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Reward' }], // References to Rewards collection
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', UserSchema);
