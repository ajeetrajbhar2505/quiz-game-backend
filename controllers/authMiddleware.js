const jwt = require('jsonwebtoken');
require('dotenv').config();


const authMiddleware = (req, res, next) => {
  // Get token from headers
  const token = req.headers['authorization'];

  // Check if token is present
  if (!token) {
    return res.status(401).json({ message: 'Access Denied. No token provided.' });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // You can fetch the user from DB here if needed
    // Example (pseudo-code):
    // const user = await User.findById(decoded.id);
    // if (!user) return res.status(401).json({ message: 'Invalid Token. User not found.' });

    // Attach decoded user info to the request for further use
    req.user = decoded;

    // Proceed to next middleware or route handler
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid Token.' });
  }
};

module.exports = authMiddleware;
