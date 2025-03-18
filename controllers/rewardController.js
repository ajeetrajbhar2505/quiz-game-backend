const Reward = require('../models/Reward');
const User = require('../models/User');

// Add Reward to User
exports.addReward = async (req, res) => {
    try {
        const { userId, type, value, description } = req.body;

        // Create reward
        const reward = new Reward({
            type,
            value,
            description
        });

        await reward.save();

        // Assign to user
        await User.findByIdAndUpdate(userId, { $push: { rewards: reward._id } });

        res.status(201).json({ message: 'Reward added successfully', reward });

    } catch (error) {
        res.status(500).json({ message: 'Error adding reward', error });
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
