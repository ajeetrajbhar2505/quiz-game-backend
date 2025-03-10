const User = require('../models/User');
const Otp = require('../models/Otp');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const otpGenerator = require('otp-generator');
const nodemailer = require('nodemailer');
const Wallet = require('../models/wallet'); // Path to your Wallet model
const bcrypt = require('bcryptjs');
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
require('dotenv').config(); // Load environment variables from .env file


exports.register = async (req, res) => {
    const { username, email, phoneNumber, password, upiId, role } = req.body;

    try {
        // Check if the user already exists by email or username
        const existingUser = await User.findOne({ $or: [{ email }, { username }] });

        if (existingUser) {
            return res.status(400).json({ message: 'User with this email or username already exists' });
        }

        // Hash the password before saving
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create a new user
        const newUser = new User({
            username,
            email,
            phoneNumber,
            password: hashedPassword,
            upiId,
            role: role || 'student', // Default to 'student' if role is not provided
        });

        // Save the new user to the database
        await newUser.save();

        // Create a wallet for the new user
        const newWallet = new Wallet({
            user: newUser._id,  // Link the wallet to the user
            balance: 0, // Initial wallet balance is 0 INR
        });

        // Save the new wallet to the database
        await newWallet.save();

        // Delete the password field before sending the user data
        const userResponse = newUser.toObject();
        delete userResponse.password;

        // Send response with user data, and wallet information (optional)
        res.status(201).json({ user: userResponse, wallet: newWallet });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};



// User Login with Email & Password
exports.login = async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });

        if (!user) return res.status(400).json({ message: 'User not found' });

        // Check if the password matches
        const isMatch = await user.matchPassword(password);
        if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

        // Generate a token after password match
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

        // Delete the password field before sending the user data
        const userResponse = user.toObject();
        delete userResponse.password;

        // Send response with the token and user data (without the password)
        res.json({ token, user : userResponse });
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
            html: `
                <div style="font-family: Arial, sans-serif; color: #333;">
                    <h2 style="color: #4CAF50;">Hello ${user.username},</h2>
                    <p style="font-size: 16px;">Your OTP code is: <strong style="font-size: 20px; color: #FF5722;">${otp}</strong></p>
                    <p style="font-size: 16px;">This code is valid for the next <strong>5 minutes</strong>. Please use it promptly.</p>
                    <p style="font-size: 16px;">If you did not request this code, please ignore this message.</p>
                    <br>
                    <p style="font-size: 16px; color: #999;">Best regards,</p>
                    <p style="font-size: 16px; color: #999;">Quiz Game Team</p>
                </div>
            `
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

        // Remove sensitive fields manually or pick the fields you want to send
        const userResponse = user.toObject();
        delete userResponse.password;

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

        res.json({ token, user: userResponse });

    } catch (error) {
        res.status(500).json({ message: 'OTP verification failed' });
    }
};

