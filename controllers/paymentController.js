const Razorpay = require('razorpay');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
require('dotenv').config();

// Initialize Razorpay
// https://dashboard.razorpay.com/app/website-app-settings/api-keys
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

// Create an Order
exports.createOrder = async (req, res) => {
    try {
        const { userId, amount } = req.body;

        const options = {
            amount: amount * 100, // Razorpay works with paise
            currency: 'INR',
            receipt: `receipt_${Date.now()}`,
            payment_capture: 1 // Auto capture payment
        };

        const order = await razorpay.orders.create(options);

        // Save transaction record
        const transaction = new Transaction({
            user: userId,
            orderId: order.id,
            type : 'withdraw',
            razorpayPaymentId : order.id,
            amount,
        });

        await transaction.save();

        res.json({ order, transaction });

    } catch (error) {
        res.status(500).json({ message: 'Error creating order', error });
    }
};

// Verify Payment
exports.verifyPayment = async (req, res) => {
    try {
        const { orderId, paymentId, userId } = req.body;

        // Find the transaction
        const transaction = await Transaction.findOne({ orderId });
        if (!transaction) return res.status(404).json({ message: 'Transaction not found' });

        // Update transaction details
        transaction.paymentId = paymentId;
        transaction.status = 'Success';
        await transaction.save();

        // Optionally update user's wallet or rewards
        await User.findByIdAndUpdate(userId, { $inc: { totalPoints: transaction.amount } });

        res.json({ message: 'Payment verified successfully', transaction });

    } catch (error) {
        res.status(500).json({ message: 'Error verifying payment', error });
    }
};

// Get User Transactions
exports.getUserTransactions = async (req, res) => {
    try {
        const transactions = await Transaction.find({ user: req.params.userId });
        res.json(transactions);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching transactions', error });
    }
};
