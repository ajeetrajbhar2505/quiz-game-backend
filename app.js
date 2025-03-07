const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const connectDB = require('./config/db');  // Import the database connection function
require('dotenv').config(); // Load environment variables from .env file

const app = express();

// Connect to the database
connectDB().then();

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Import Routes
const authRoutes = require('./routes/authRoutes');
const quizRoutes = require('./routes/quizRoutes');
const questionRoutes = require('./routes/questionRoutes');
const quizAttemptRoutes = require('./routes/quizAttemptRoutes');
const rewardRoutes = require('./routes/rewardRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const walletRoutes = require('./routes/wallet.routes');

// Use Routes
app.use('/api/auth', authRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/attempts', quizAttemptRoutes);
app.use('/api/rewards', rewardRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/wallet', walletRoutes);


// Start the server
const port =  process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`✅ Server running on http://localhost:${port}`);
});
