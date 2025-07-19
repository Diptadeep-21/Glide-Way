const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  console.log('authHeader:', authHeader); // Debug log

  if (!authHeader) {
    return res.status(401).json({ message: 'Access Denied: No token provided' });
  }

  const token = authHeader.startsWith('Bearer ')
    ? authHeader.split(' ')[1]
    : authHeader;
  console.log('token:', token); // Debug log

  if (!token) {
    return res.status(401).json({ message: 'Access Denied: Malformed token' });
  }

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    console.log('verified:', verified); // Debug log

    if (!verified.id) {
      return res.status(401).json({ message: 'Invalid Token: User ID not found' });
    }

    req.user = verified;
    console.log('req.user set:', req.user); // Debug log
    next();
  } catch (err) {
    console.error('Token verification error:', err.message);
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token Expired' });
    } else if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid Token' });
    } else {
      return res.status(401).json({ message: 'Token Verification Failed' });
    }
  }
};

module.exports = authMiddleware;