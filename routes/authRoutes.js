const express = require('express');
const { login, googleLogin, sendOTP, verifyOTP, register, googleCallBack, facebookLogin, facebookCallBack } = require('../controllers/authController');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/sendOTP', sendOTP);
router.post('/verifyOTP', verifyOTP);
router.get('/google-login', googleLogin);
router.get('/facebook-login', facebookLogin);
router.get('/google-callback', googleCallBack);
router.get('/facebook-callback', facebookCallBack);

module.exports = router;
