const mongoose = require('mongoose');

const WalletSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Linked to User
  balance: { type: Number, default: 0 }, // Wallet balance in INR
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Wallet', WalletSchema);
