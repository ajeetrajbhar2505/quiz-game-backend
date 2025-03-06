const mongoose = require('mongoose');
require('dotenv').config();


// Function to connect to the database
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,     // Ensures MongoDB driver uses the new URL parser
    });
    console.log('✅ MongoDB Connected')
  } catch (err) {
    console.error('❌ MongoDB Connection Error: ', err.message)
    process.exit(1); // Exit process with failure
  }
};
// Export the connection function for use in app.js
module.exports = connectDB;
