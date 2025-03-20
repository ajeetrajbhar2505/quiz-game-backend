const express = require('express');
const http = require('http');
const bodyParser = require('body-parser');
const cors = require('cors');
const connectDB = require('./config/db');  // Import the database connection function
require('dotenv').config(); // Load environment variables from .env file
const { initSocket } = require('./controllers/socketController');

const app = express();
const server = http.createServer(app);


// Connect to the database
connectDB().then();

// Middleware
app.use(cors());
app.use(bodyParser.json());

const authMiddleware =   require('./controllers/authMiddleware');



// Import Routes
const authRoutes = require('./routes/authRoutes');
const quizRoutes = require('./routes/quizRoutes');
const questionRoutes = require('./routes/questionRoutes');
const quizAttemptRoutes = require('./routes/quizAttemptRoutes');
const rewardRoutes = require('./routes/rewardRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const walletRoutes = require('./routes/wallet.routes');
const userRoutes = require('./routes/userRoutes');

// Use Routes
app.use('/api/auth', authRoutes);
app.use('/api/quizzes', authMiddleware, quizRoutes);
app.use('/api/questions', authMiddleware, questionRoutes);
app.use('/api/attempts', authMiddleware, quizAttemptRoutes);
app.use('/api/rewards', authMiddleware, rewardRoutes);
app.use('/api/payments', authMiddleware, paymentRoutes);
app.use('/api/wallet', authMiddleware, walletRoutes);
app.use('/api/users', authMiddleware, userRoutes);

// Initialize Socket
initSocket(server);

// Start the server
const port = process.env.PORT || 5000;
server.listen(port, () => {
  console.log(`✅ Server running on http://localhost:${port}`);
});
