const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Auth Middleware
 * 
 * JWT Authentication Flow:
 * 1. Client sends request with "Authorization: Bearer <token>" header
 * 2. Middleware extracts the token from the header
 * 3. Token is verified using the JWT_SECRET from environment
 * 4. If valid, the decoded payload (containing user ID) is used to fetch the user from MongoDB
 * 5. The user object (minus password) is attached to req.user for downstream route handlers
 * 6. If the token is missing, expired, or invalid, a 401 Unauthorized response is returned
 */
const auth = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided. Authorization denied.' });
    }

    const token = authHeader.replace('Bearer ', '');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');

    if (!user) {
      return res.status(401).json({ message: 'User not found. Token is invalid.' });
    }

    req.user = user;
    req.token = token;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token has expired. Please log in again.' });
    }
    res.status(401).json({ message: 'Invalid token. Authorization denied.' });
  }
};

module.exports = auth;
