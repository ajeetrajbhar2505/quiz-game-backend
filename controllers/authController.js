const User = require('../models/User');
const Otp = require('../models/Otp');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const otpGenerator = require('otp-generator');
const nodemailer = require('nodemailer');
const Wallet = require('../models/wallet'); // Path to your Wallet model
const bcrypt = require('bcryptjs');
require('dotenv').config(); // Load environment variables from .env file
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, process.env.GOOGLE_REDIRECT_URL);


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

        // Create a wallet for the new user
        const newWallet = new Wallet({
            balance: 0, // Initial wallet balance is 0 INR
        });

        // Save the new wallet to the database
        await newWallet.save();

        // Create a new user
        const newUser = new User({
            username,
            email,
            phoneNumber,
            password: hashedPassword,
            upiId,
            wallet : newWallet._id,
            role: role || 'student', // Default to 'student' if role is not provided
        });

        // Save the new user to the database
        await newUser.save();



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
        res.json({ token, user: userResponse });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};


// Google OAuth Login with OTP
exports.googleLogin = async (req, res) => {
    try {

        const authUrl = await client.generateAuthUrl({
            access_type: 'offline',  // Use 'offline' to get refresh token (optional)
            scope: ['https://www.googleapis.com/auth/userinfo.profile', 'https://www.googleapis.com/auth/userinfo.email'], // Requested scopes
          });
          
          // Send the URL back to the frontend
          res.json({ url: authUrl });

    } catch (error) {
        res.status(500).json({ message: 'Google authentication failed' });
    }
};

exports.googleCallBack = async (req, res) => {
        
        const { code } = req.query; // Authorization code from Google
        
        try {
          // Step 1: Exchange the authorization code for an access token
          const { tokens } = await client.getToken(code);
          
          // Step 2: Verify the ID token and extract user info
          const ticket = await client.verifyIdToken({
            idToken: tokens.id_token,
            audience: process.env.GOOGLE_CLIENT_ID,
          });
      
          const { email, name, picture, sub: googleId } = ticket.getPayload(); // Google user info
      
          // Step 3: Check if user already exists (by email or username)
          let existingUser = await User.findOne({ $or: [{ email }, { username: name }] });
      
          if (existingUser) {
            // If user already exists, return the existing user document
            return res.status(200).json({ user: existingUser });
          }
      
          // Step 4: If user doesn't exist, create a new user
          // Generate a random password since Google login does not require a password
          const password = 'google-auth'; // You could choose another password handling strategy
      
          // Hash the password before saving
          const salt = await bcrypt.genSalt(10);
          const hashedPassword = await bcrypt.hash(password, salt);
      
          // Step 5: Create a new wallet for the user
          const newWallet = new Wallet({
            balance: 0, // Initial wallet balance is 0 INR
          });
      
          await newWallet.save(); // Save the wallet in DB
      
          // Step 6: Create a new user and associate the wallet
          const newUser = new User({
            username: name, // Use the Google name as username (you can customize this logic)
            email,
            password: hashedPassword, // Hashed password
            role: 'student', // Default role
            wallet: newWallet._id, // Link wallet to the user
            googleId, // Store Google ID for reference
            profilePicture: picture, // Store profile picture from Google
          });
      
          await newUser.save(); // Save the user to the DB
      
          // Step 7: Delete the password field before sending the user data in the response
          const userResponse = newUser.toObject();
          delete userResponse.password; // No need to send the password back to the frontend
      
          // Step 8: Return the new user and wallet data
          res.status(201).json({ user: userResponse, wallet: newWallet });
      
        } catch (error) {
          console.error('Error during Google login callback:', error);
          res.status(500).json({ message: 'Google authentication failed or server error' });
        }

}

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

