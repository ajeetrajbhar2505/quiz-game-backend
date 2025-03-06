const Wallet = require('../models/wallet');
const Transaction = require('../models/Transaction');
const Razorpay = require('razorpay');

// Initialize Razorpay instance
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// ✅ Add rewards to user’s wallet
async function addRewardToWallet(req, res) {
  try {
    const { userId, rewardAmount } = req.body;

    let wallet = await Wallet.findOne({ user: userId });

    if (!wallet) {
      wallet = await Wallet.create({ user: userId, balance: rewardAmount });
    } else {
      wallet.balance += rewardAmount;
      await wallet.save();
    }

    await Transaction.create({
      user: userId,
      amount: rewardAmount,
      type: 'credit',
      status: 'completed'
    });

    return res.json({ message: 'Reward added!', balance: wallet.balance });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

// ✅ Withdraw funds using Razorpay
async function withdrawFunds(req, res) {
  try {
    const { userId, amount, upiId } = req.body;

    const wallet = await Wallet.findOne({ user: userId });

    if (!wallet || wallet.balance < amount) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    // Deduct balance
    wallet.balance -= amount;
    await wallet.save();

    // Create Razorpay Payout
    const payout = await razorpay.payouts.create({
      account_number: process.env.RAZORPAY_ACCOUNT_NUMBER,
      amount: amount * 100, // Convert to paise
      currency: 'INR',
      mode: 'UPI',
      purpose: 'Cashback',
      fund_account: {
        account_type: 'vpa',
        vpa: {
          address: upiId // User’s UPI ID
        }
      },
      notes: {
        userId: userId
      }
    });

    // Store transaction details
    const transaction = await Transaction.create({
      user: userId,
      amount: amount,
      type: 'debit',
      status: 'pending',
      razorpayPaymentId: payout.id
    });

    return res.json({ message: 'Withdrawal initiated!', transaction });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

module.exports = { addRewardToWallet, withdrawFunds };
