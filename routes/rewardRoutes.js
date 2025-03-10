const express = require('express');
const router = express.Router();
const rewardController = require('../controllers/rewardController');

router.post('/add', rewardController.addReward);
router.get('/:id', rewardController.getUserRewards);

module.exports = router;
