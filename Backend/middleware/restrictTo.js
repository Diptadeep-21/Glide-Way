const restrictTo = (...roles) => {
  return (req, res, next) => {
    // Check if req.user exists (set by authenticate middleware)
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Check if the user's role is in the allowed roles
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'You do not have permission to perform this action' });
    }

    // If the role is allowed, proceed to the next middleware/route handler
    next();
  };
};

module.exports = restrictTo;