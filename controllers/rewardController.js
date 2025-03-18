const Reward = require('../models/Reward');
const User = require('../models/User');

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
