const Reward = require('../models/Reward');
const User = require('../models/User');
const Wallet = require('../models/wallet');


exports.createFestivalReward = async (req, res) => {
    try {
        const { description, value } = req.body;  // Get description and value from request body

        // Step 1: Create a new Reward for the festival
        const newReward = new Reward({
            description,  // Description like "Diwali Festival", "New Year Special"
            value,        // Value (points associated with the festival reward)
            type: 'festival',  // Indicating that this is a festival-specific reward
        });

        // Step 2: Save the new reward to the database
        await newReward.save();

        // Step 3: Send a success response
        res.status(201).json({ message: 'Festival reward created successfully', reward: newReward });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error creating festival reward', error });
    }
};


exports.redeemFestivalReward = async (req, res) => {
    try {
        const { userId, rewardId } = req.body;  // Get userId and rewardId from the request body

        // Step 1: Find the user by ID
        const user = await User.findById(userId).populate('rewards');  // Populate the rewards to check if the user has claimed any reward
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Step 2: Check if the user has already claimed the reward with the given rewardId
        const existingReward = user.rewards.find(reward => reward._id.toString() === rewardId);
        if (existingReward) {
            return res.status(400).json({ message: 'You have already claimed this reward' });
        }

        // Step 3: Find the reward from the Reward collection by rewardId
        const festivalReward = await Reward.findById(rewardId);
        if (!festivalReward) {
            return res.status(404).json({ message: 'Festival reward not found' });
        }

        // Step 4: Add the festival reward to the user's rewards array
        await User.findByIdAndUpdate(userId, { $addToSet: { rewards: festivalReward._id } });

        // Step 5: Send a success response
        res.status(200).json({ message: 'Festival reward redeemed successfully', reward: festivalReward });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error redeeming festival reward', error });
    }
};

// Add Reward to User
exports.addReward = async (req, res) => {
    try {
        const { userId, description, value, type } = req.body;

        // 100 points = 10 rupees, so 1 point = 0.1 rupees
        const rupeesToAdd = (value / 100) * 10;

        // Find the user by ID and populate their rewards and wallet
        const user = await User.findById(userId).populate('rewards wallet');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Check if the user already has the reward with the same description
        const existingReward = user.rewards.find(reward => reward.description === description && reward.type === type);

        if (existingReward) {
            // If reward exists, update the value of the existing reward
            await Reward.findByIdAndUpdate(existingReward._id, { $inc: { value: value } });

            // Update the user's total points after the addition
            const totalPoints = user.rewards.reduce((total, reward) => total + reward.value, 0);
            await User.findByIdAndUpdate(userId, { totalPoints });

            // Increase the user's wallet balance by the equivalent rupees
            await Wallet.findByIdAndUpdate(user.wallet._id, { $inc: { balance: rupeesToAdd } });

            return res.status(200).json({ message: 'Reward value updated successfully', rewardId: existingReward._id });
        } else {
            // If reward doesn't exist, create a new reward
            const newReward = new Reward({
                description,
                value,
                type,
            });

            await newReward.save();

            // Add the new reward to the user's rewards
            await User.findByIdAndUpdate(userId, { $addToSet: { rewards: newReward._id } });

            // Increase the user's wallet balance by the equivalent rupees
            await Wallet.findByIdAndUpdate(user.wallet._id, { $inc: { balance: rupeesToAdd } });

            // Update the user's total points after the addition
            const totalPoints = user.rewards.reduce((total, reward) => total + reward.value, 0);
            await User.findByIdAndUpdate(userId, { totalPoints });

            return res.status(201).json({ message: 'New reward added successfully', rewardId: newReward._id });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error adding reward', error });
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

exports.redeemReward = async (req, res) => {
    try {
        const { userId, rewardId } = req.body;

        // Step 1: Find the user by ID
        const user = await User.findById(userId).populate('rewards');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Step 2: Find the reward by ID in the Rewards collection
        const reward = await Reward.findById(rewardId);
        if (!reward) {
            return res.status(404).json({ message: 'Reward not found' });
        }

        // Step 3: Check if the user already has this reward in their rewards array
        const rewardAlreadyAssigned = user.rewards.some(existingReward => existingReward._id.toString() === reward._id.toString());
        if (rewardAlreadyAssigned) {
            return res.status(400).json({ message: 'User already has this reward' });
        }

        // Step 4: Add the reward to the user's rewards array
        await User.findByIdAndUpdate(userId, { $addToSet: { rewards: reward._id } });

        // Step 5: Send a success response
        res.status(200).json({ message: 'Reward redeemed successfully', reward });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error redeeming reward', error });
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
