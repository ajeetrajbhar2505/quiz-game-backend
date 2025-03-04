const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const connectDB = require('./config/db');  // Import the database connection function
const quizRoutes = require('./routes/quizRoutes');
const userRoutes = require('./routes/userRoutes');
require('dotenv').config(); // Load environment variables from .env file

const app = express();

// Connect to the database
connectDB();

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Routes
app.use('/api/quizzes', quizRoutes);
app.use('/api/users', userRoutes);

// Start the server
const port = 5000;
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
