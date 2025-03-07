const Razorpay = require('razorpay');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const { Types } = require('mongoose');
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

        // Calculate the equivalent points for the requested amount
        const pointsRequired = (amount / 10) * 100;

        // Check if the user has enough points
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (user.totalPoints < pointsRequired) {
            return res.status(400).json({ message: 'Insufficient points for withdrawal' });
        }

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
            type: 'withdraw',
            razorpay_payment_id: order.id,
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
        const { transaction_id,razorpay_order_id, razorpay_signature, razorpay_payment_id, userId } = req.body;

        // Find the transaction to get the amount before updating the status
        const transaction = await Transaction.findOne({ _id: new Types.ObjectId(transaction_id) });

        if (!transaction) {
            return res.status(404).json({ message: 'Transaction not found' });
        }

        // Calculate the points to be deducted based on the withdrawal amount (10 rupees = 100 points)
        const pointsToDeduct = (transaction.amount / 10) * 100;

        // Check if the user has enough points to deduct
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (user.totalPoints < pointsToDeduct) {
            return res.status(400).json({ message: 'Insufficient points for withdrawal' });
        }

        // Deduct points from the user's account
        await User.findByIdAndUpdate(userId, { $inc: { totalPoints: -pointsToDeduct, walletBalance: -transaction.amount } });

        // Update the transaction status to 'Success'
        await Transaction.updateOne({ _id: new Types.ObjectId(orderId) }, { $set: { status: 'Success', razorpay_order_id, razorpay_signature, razorpay_payment_id } });

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
