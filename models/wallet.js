const mongoose = require('mongoose');

const WalletSchema = new mongoose.Schema({
  balance: { type: Number, default: 0 }, // Wallet balance in INR
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Wallet', WalletSchema);
