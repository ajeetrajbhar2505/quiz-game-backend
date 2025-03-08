const User = require('../models/User');
const Otp = require('../models/Otp');
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

// Google OAuth Login with OTP
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

        // Generate OTP
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

        res.json({ message: 'OTP sent to email, please verify' });

    } catch (error) {
        res.status(500).json({ message: 'Google authentication failed' });
    }
};



// Email Transporter (Configure SMTP settings)

// Don't use real pass , Generate App pass for smt servive
// https://myaccount.google.com/apppasswords?rapt=AEjHL4OgrUmKhpKnZuGdciaA_ZmE_IMYv2jDJFKi0us0w57uo9c6gqX8s_zO-_aMsbpiDJazKms3DQ34CH9u_F2Zuy_LkdSTSFxdoAVvNvqolfr2Lp3OqjA
const transporter = nodemailer.createTransport({
    host: "gmail",
    host: 'smtp.gmail.com',
    port: 587,    
    secure: false,
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
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // Expire in 5 minutes

        await Otp.deleteMany({ email }); // Remove existing OTPs
        await new Otp({ email, otp, expiresAt }).save();

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

        if (!otpRecord) return res.status(400).json({ message: 'Invalid OTP' });

        if (otpRecord.expiresAt < Date.now()) {
            await Otp.deleteMany({ email }); // Delete expired OTP
            return res.status(400).json({ message: 'OTP has expired, request a new one' });
        }

        await Otp.deleteMany({ email }); // Remove OTP after successful verification

        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ message: 'User not found' });

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

        res.json({ token, user });

    } catch (error) {
        res.status(500).json({ message: 'OTP verification failed' });
    }
};
