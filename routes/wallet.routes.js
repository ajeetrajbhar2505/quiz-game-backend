const express = require('express');
const router = express.Router();
const { addRewardToWallet, withdrawFunds } = require('../controllers/wallet.controller');

// ✅ Add reward to user’s wallet
router.post('/add-reward', addRewardToWallet);

// ✅ Withdraw funds
router.post('/withdraw', withdrawFunds);

module.exports = router;
