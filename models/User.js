const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Define the User Schema
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true }, // Added password field
  totalPoints: { type: Number, default: 0 },
  rewards: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Reward' }],
  createdAt: { type: Date, default: Date.now }
});

// Hash the password before saving the user document
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next(); // If password is not modified, don't hash it again

  try {
    const salt = await bcrypt.genSalt(10); // Generate salt
    this.password = await bcrypt.hash(this.password, salt); // Hash the password
    next();
  } catch (err) {
    next(err);
  }
});

// Method to check if password is correct (for login)
UserSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);
