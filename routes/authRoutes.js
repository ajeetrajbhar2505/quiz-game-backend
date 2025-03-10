const express = require('express');
const { login, googleLogin, sendOTP, verifyOTP } = require('../controllers/authController');

const router = express.Router();

router.post('/login', login);
router.post('/sendOTP', sendOTP);
router.post('/verifyOTP', verifyOTP);
router.post('/google-login', googleLogin);

module.exports = router;
