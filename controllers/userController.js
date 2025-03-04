const User = require('../models/User');
const Reward = require('../models/Reward');

// Register a new user
exports.registerUser = async (req, res) => {
  try {
    const { username, email } = req.body;
    const newUser = new User({
      username,
      email
    });
    await newUser.save();
    res.status(201).json(newUser);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get user details
exports.getUserDetails = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).populate('rewards');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update user rewards and points
exports.updateUserRewards = async (req, res) => {
  try {
    const { userId } = req.params;
    const { rewardId } = req.body;

    const user = await User.findById(userId);
    const reward = await Reward.findById(rewardId);
    
    if (!user || !reward) {
      return res.status(400).json({ message: 'User or reward not found' });
    }

    user.totalPoints += reward.value;
    user.rewards.push(reward._id);
    await user.save();

    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
