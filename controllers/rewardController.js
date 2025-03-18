const Reward = require('../models/Reward');
const User = require('../models/User');
const Wallet = require('../models/wallet');

// Add Reward to User
exports.addReward = async (req, res) => {
    try {
        const { userId, type, value, description } = req.body;

        // Check if the user already has this reward with the same type, value, and description
        const existingReward = await Reward.findOne({ type, description });

        // Check if the user already has this reward assigned
        const user = await User.findById(userId).populate('rewards');

        let rewardId;

        // If reward exists, update the value and use the existing reward ID
        if (existingReward) {
            // If the user already has the reward, update the reward value
            const rewardAlreadyAssigned = user.rewards.some(reward => reward._id.toString() === existingReward._id.toString());

            if (rewardAlreadyAssigned) {
                // Update the value of the existing reward
                await Reward.findByIdAndUpdate(existingReward._id, { $inc: { value: +value } });
                rewardId = existingReward._id;
            } else {
                // If the reward is not yet assigned to the user, assign the existing reward
                await User.findByIdAndUpdate(userId, { $addToSet: { rewards: existingReward._id } });
                rewardId = existingReward._id;
            }
        } else {
            // If the reward doesn't exist, create a new one
            const newReward = new Reward({
                type,
                value,
                description
            });

            await newReward.save();
            rewardId = newReward._id;

            // Add the new reward to the user's rewards
            await User.findByIdAndUpdate(userId, { $addToSet: { rewards: newReward._id } });
        }

        res.status(201).json({ message: 'Reward added or updated successfully', rewardId });

    } catch (error) {
        res.status(500).json({ message: 'Error adding or updating reward', error });
    }
};


exports.shareReward = async (req, res) => {
    try {
        const { senderId, recipientEmail,description, value } = req.body;

        // 100 points = 10 rupees, so 1 point = 0.1 rupees
        const rupeesToDeduct = (value / 100) * 10;

        // Find the sender user by ID and populate rewards and wallet
        const sender = await User.findById(senderId).populate('rewards wallet');
        if (!sender) {
            return res.status(404).json({ message: 'Sender not found' });
        }

        // Find the sender's reward that has sufficient points (matching the points)
        const senderReward = sender.rewards.find(reward => reward.value >= value);
        if (!senderReward) {
            return res.status(400).json({ message: 'Sender does not have sufficient reward points' });
        }

        // Find the recipient user by email
        const recipient = await User.findOne({ email: recipientEmail }).populate('rewards wallet');
        if (!recipient) {
            return res.status(404).json({ message: 'Recipient not found' });
        }

        // Find the sender's wallet
        const senderWallet = await Wallet.findById(sender.wallet);
        if (!senderWallet || senderWallet.balance < rupeesToDeduct) {
            return res.status(400).json({ message: 'Sender does not have sufficient wallet balance to share reward' });
        }

        // Decrease the sender's reward points
        await Reward.findByIdAndUpdate(senderReward._id, { $inc: { value: -value } });

        // If the sender's reward points become zero, remove it from the sender's rewards
        if (senderReward.value - value === 0) {
            await User.findByIdAndUpdate(senderId, { $pull: { rewards: senderReward._id } });
        }

        // Decrease the sender's wallet balance by the equivalent rupees
        await Wallet.findByIdAndUpdate(sender.wallet, { $inc: { balance: -rupeesToDeduct } });

        // Check if the recipient already has this reward (by points, not description)
        const recipientReward = recipient.rewards.find(reward => reward.value >= value);
        if (recipientReward) {
            // If recipient already has the reward, increment the points
            await Reward.findByIdAndUpdate(recipientReward._id, { $inc: { value: value } });
        } else {
            // If the recipient does not have the reward, create a new reward for them
            const newReward = new Reward({
                value,
                description,
                type: 'shared', // You can adjust the type as needed
            });
            await newReward.save();
            await User.findByIdAndUpdate(recipient._id, { $addToSet: { rewards: newReward._id } });
        }

        // Increase the recipient's wallet balance by the equivalent rupees
        await Wallet.findByIdAndUpdate(recipient.wallet, { $inc: { balance: rupeesToDeduct } });

        // Update total points for the sender and recipient

        // Calculate sender's total points after the deduction
        const senderTotalPoints = sender.rewards.reduce((total, reward) => total + reward.value, 0);
        await User.findByIdAndUpdate(senderId, { totalPoints: senderTotalPoints });

        // Calculate recipient's total points after the addition
        const recipientTotalPoints = recipient.rewards.reduce((total, reward) => total + reward.value, 0);
        await User.findByIdAndUpdate(recipient._id, { totalPoints: recipientTotalPoints });

        res.status(200).json({ message: 'Reward points shared successfully', senderId, recipientEmail });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error sharing reward points', error });
    }
};





// Get Rewards of a User
exports.getUserRewards = async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password').populate('rewards').populate('wallet');
        if (!user) return res.status(404).json({ message: 'User not found' });

        res.json(user);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching rewards', error });
    }
};
