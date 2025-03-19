const jwt = require('jsonwebtoken');
require('dotenv').config();

const authMiddleware = async (req, res, next) => {
  try {
    // Get the authorization header
    const authHeader = req.headers['authorization'];

    // Check if it exists and starts with 'Bearer'
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Access Denied. No token provided.' });
    }

    // Extract token from 'Bearer <token>'
    const token = authHeader.split(' ')[1];

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // OPTIONAL: Fetch the user from DB and check if they exist
    // Example using Mongoose (uncomment and adjust according to your setup):
    // const user = await User.findById(decoded.id);
    // if (!user) {
    //   return res.status(401).json({ message: 'Invalid Token. User not found.' });
    // }

    // Attach user data to request
    req.body.userId = decoded.id;
    // Proceed to next middleware/route
    next();
  } catch (err) {
    console.error('Auth Middleware Error:', err.message);
    return res.status(401).json({ message: 'Invalid Token.' });
  }
};

module.exports = authMiddleware;
