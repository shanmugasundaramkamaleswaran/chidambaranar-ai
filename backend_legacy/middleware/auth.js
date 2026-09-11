const { decodeAccessToken } = require('../services/authService');
const User = require('../models/User');

/**
 * Auth middleware to protect routes.
 * Port of get_current_user/require_auth from FastAPI.
 */
async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ detail: 'Not authenticated' });
  }

  const token = authHeader.split(' ')[1];
  const payload = decodeAccessToken(token);

  if (!payload || !payload.sub) {
    return res.status(401).json({ detail: 'Invalid or expired token' });
  }

  try {
    const user = await User.findByPk(parseInt(payload.sub));
    if (!user) {
      return res.status(401).json({ detail: 'User not found' });
    }

    req.user = user;
    next();
  } catch (e) {
    console.error('Auth Middleware Error:', e);
    res.status(500).json({ detail: 'Internal server error' });
  }
}

/**
 * Optional auth middleware (doesn't block but fills req.user if token present).
 */
async function optionalAuthMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    const payload = decodeAccessToken(token);
    if (payload && payload.sub) {
      try {
        const user = await User.findByPk(parseInt(payload.sub));
        if (user) req.user = user;
      } catch (e) {
        // Ignore error for optional auth
      }
    }
  }
  next();
}

module.exports = { authMiddleware, optionalAuthMiddleware };
