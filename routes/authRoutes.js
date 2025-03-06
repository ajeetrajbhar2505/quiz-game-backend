const express = require('express');
const { login, googleLogin } = require('../controllers/authController');

const router = express.Router();

router.post('/login', login);
router.post('/google-login', googleLogin);

module.exports = router;
