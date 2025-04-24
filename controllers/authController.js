const User = require('../models/User');
const Otp = require('../models/Otp');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const otpGenerator = require('otp-generator');
const nodemailer = require('nodemailer');
const Wallet = require('../models/wallet');
const bcrypt = require('bcryptjs');
const { getIO } = require('./socketController');
require('dotenv').config();
const querystring = require('querystring');
const https = require('https');
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
            wallet: newWallet._id,
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
            // ✅ User already exists
            const token = jwt.sign({ id: existingUser._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

            // Emit socket event after successful login
            const io = getIO();
            io.emit('receiveLogin', { token });

            console.log('✅ Existing user login:', existingUser.username);

            // ✅ Return early to prevent continuing to create a new user!
            return res.status(200).json({ message: 'Google authenticated (existing user)' });
        }

        // Step 4: If user doesn't exist, create a new user

        // Generate a random password since Google login does not require a password
        const password = 'google-auth'; // You can improve this by making it more unique

        // Hash the password before saving
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Step 5: Create a new wallet for the user
        const newWallet = new Wallet({
            balance: 0, // Initial wallet balance
        });

        await newWallet.save();

        // Step 6: Create a new user and associate the wallet
        const newUser = new User({
            username: name,
            email,
            password: hashedPassword,
            role: 'student',
            wallet: newWallet._id,
            googleId,
            profilePicture: picture,
        });

        await newUser.save();

        // Step 7: Remove sensitive fields before responding
        const userResponse = newUser.toObject();
        delete userResponse.password;

        // Step 8: Return the new user data and emit socket event
        const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

        // Emit socket event after successful login
        const io = getIO();
        io.emit('receiveLogin', { token });

        console.log('✅ New user created and logged in:', newUser.username);

        return res.status(200).json({ message: 'Google authenticated (new user)' });

    } catch (error) {
        console.error('❌ Error during Google login callback:', error);

        // If you already sent headers, don't try to send another response
        if (!res.headersSent) {
            return res.status(500).json({ message: 'Error while Google authentication' });
        }
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

exports.facebookLogin = async (req, res) => {
    try {

        const authUrl = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${process.env.FACEBOOK_APP_ID}&redirect_uri=${encodeURIComponent(process.env.REDIRECT_URI)}&scope=email,public_profile&response_type=code&auth_type=rerequest`;

        res.json({ url: authUrl });

    } catch (error) {
        res.status(500).json({ message: 'Facebook authentication failed' });
    }
};


exports.facebookCallBack = async (req, res) => {
    const { code } = req.query;

    try {
        // Step 1: Exchange code for access token
        const tokenUrl = `https://graph.facebook.com/v19.0/oauth/access_token?` + querystring.stringify({
            client_id: process.env.FACEBOOK_APP_ID,
            client_secret: process.env.FACEBOOK_APP_SECRET,
            redirect_uri: process.env.REDIRECT_URI,
            code: code
        });

        const tokenData = await fetchJSON(tokenUrl);

        if (!tokenData.access_token) {
            return res.status(400).json({ message: 'Failed to get access token', details: tokenData });
        }

        const accessToken = tokenData.access_token;

        // Step 2: Fetch user profile
        const profileUrl = `https://graph.facebook.com/me?` + querystring.stringify({
            fields: 'id,name,email,picture',
            access_token: accessToken
        });

        const profileData = await fetchJSON(profileUrl);

        if (profileData.error) {
            return res.status(400).json({ message: 'Failed to get Facebook profile', details: profileData });
        }

        const { id: facebookId, name, email, picture } = profileData;

        // Send data or generate JWT
        res.json({ facebookId, name, email, picture });

    } catch (error) {
        console.error('Facebook login error:', error);
        res.status(500).json({ message: 'Facebook authentication failed' });
    }
};

function fetchJSON(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (err) {
                    reject(err);
                }
            });
        }).on('error', reject);
    });
}

