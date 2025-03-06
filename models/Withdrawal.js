const WithdrawalSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true, default: 10 }, // Fixed ₹10 withdrawal
    razorpayPayoutId: { type: String, unique: true, sparse: true }, // Razorpay payout ID (to track successful payouts)
    status: { 
      type: String, 
      enum: ['pending', 'approved', 'rejected'], 
      default: 'pending' 
    }, // Pending → Approved → Processed / Rejected
    createdAt: { type: Date, default: Date.now }
  });
  
  module.exports = mongoose.model('Withdrawal', WithdrawalSchema);
  