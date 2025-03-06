const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const otpGenerator = require('otp-generator');
const nodemailer = require('nodemailer');
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
require('dotenv').config(); // Load environment variables from .env file

// User Login with Email & Password
exports.login = async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ message: 'User not found' });

        const isMatch = await user.matchPassword(password);
        if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

        res.json({ token, user });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

// Google OAuth Login
exports.googleLogin = async (req, res) => {
    const { token } = req.body;

    try {
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: process.env.GOOGLE_CLIENT_ID
        });

        const { email, name } = ticket.getPayload();

        let user = await User.findOne({ email });

        if (!user) {
            user = new User({ username: name, email, password: 'google-auth' });
            await user.save();
        }

        const authToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

        res.json({ token: authToken, user });
    } catch (error) {
        res.status(500).json({ message: 'Google authentication failed' });
    }
};



// Email Transporter (Configure SMTP settings)
const transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
        user: process.env.EMAIL_USER, // Your email
        pass: process.env.EMAIL_PASS  // Your email app password
    }
});

// Generate and Send OTP
exports.sendOTP = async (req, res) => {
    const { email } = req.body;

    try {
        const user = await User.findOne({ email });

        if (!user) return res.status(404).json({ message: 'User not found' });

        const otp = otpGenerator.generate(6, { upperCaseAlphabets: false, specialChars: false });

        // Store OTP in DB (delete existing OTPs first)
        await Otp.deleteMany({ email });
        await new Otp({ email, otp }).save();

        // Send OTP via Email
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Your OTP Code',
            text: `Your OTP code is ${otp}. It is valid for 5 minutes.`
        });

        res.json({ message: 'OTP sent to email' });

    } catch (error) {
        res.status(500).json({ message: 'Error sending OTP' });
    }
};

// Verify OTP and Login
exports.verifyOTP = async (req, res) => {
    const { email, otp } = req.body;

    try {
        const otpRecord = await Otp.findOne({ email, otp });

        if (!otpRecord) return res.status(400).json({ message: 'Invalid or expired OTP' });

        await Otp.deleteMany({ email }); // Remove OTP after verification

        const user = await User.findOne({ email });

        if (!user) return res.status(404).json({ message: 'User not found' });

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

        res.json({ token, user });
    } catch (error) {
        res.status(500).json({ message: 'OTP verification failed' });
    }
};