const mongoose = require('mongoose');
require('dotenv').config();

// MongoDB URI
let mongoURI = `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_KEY}@cluster0.j6q15.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Function to connect to the database
const connectDB = async () => {
  try {
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,     // Ensures MongoDB driver uses the new URL parser
    });
    console.log('MongoDB Connected');
  } catch (err) {
    console.error('Database connection error:', err.message);
    process.exit(1); // Exit process with failure
  }
};

// Export the connection function for use in app.js
module.exports = connectDB;
