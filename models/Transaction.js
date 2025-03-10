const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { 
    type: String, 
    enum: ['earn', 'withdraw', 'deposit'], // Earn (rewards), Withdraw (₹10 payout), Deposit (if users add money)
    required: true 
  },
  amount: { type: Number, required: true }, // Amount in ₹
  razorpay_payment_id: { type: String, unique: true, sparse: true },
  razorpay_order_id: { type: String, unique: true, sparse: true },
  razorpay_signature: { type: String, unique: true, sparse: true },
  status: { 
    type: String, 
    enum: ['initiated', 'success', 'failed'], 
    default: 'initiated' 
  }, // Status of transaction
  description: { type: String }, // Description of the transaction (e.g., "Reward earned from quiz")
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Transaction', TransactionSchema);
