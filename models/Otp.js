const mongoose = require('mongoose');

const OtpSchema = new mongoose.Schema({
  email: { type: String, required: true },
  otp: { type: String, required: true },
  expiresAt: { type: Date, required: true, default: () => Date.now() + 5 * 60 * 1000 } // Expire in 5 mins
});
module.exports = mongoose.model('Otp', OtpSchema);
