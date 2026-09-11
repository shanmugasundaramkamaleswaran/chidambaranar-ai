const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { 
  getPasswordHash, 
  verifyPassword, 
  createAccessToken, 
  verifyGoogleToken 
} = require('../services/authService');
const { authMiddleware } = require('../middleware/auth');
const { Op } = require('sequelize');

/**
 * Register a new user.
 */
router.post('/register', async (req, res) => {
  const { email, password, name } = req.body;
  
  try {
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ detail: 'Email already registered' });
    }

    const passwordHash = await getPasswordHash(password);
    const user = await User.create({
      email,
      password_hash: passwordHash,
      name: name || email.split('@')[0]
    });

    const accessToken = createAccessToken({ sub: user.id.toString() });

    res.json({
      access_token: accessToken,
      token_type: 'bearer',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar_url: user.avatar_url
      }
    });
  } catch (e) {
    console.error('Registration Error:', e);
    res.status(500).json({ detail: 'Internal server error during registration' });
  }
});

/**
 * Login with email and password.
 */
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ where: { email } });
    if (!user || !user.password_hash) {
      return res.status(401).json({ detail: 'Invalid email or password' });
    }

    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ detail: 'Invalid email or password' });
    }

    const accessToken = createAccessToken({ sub: user.id.toString() });

    res.json({
      access_token: accessToken,
      token_type: 'bearer',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar_url: user.avatar_url
      }
    });
  } catch (e) {
    console.error('Login Error:', e);
    res.status(500).json({ detail: 'Internal server error during login' });
  }
});

/**
 * Google Auth.
 */
router.post('/google', async (req, res) => {
  const { access_token } = req.body;

  try {
    const googleUser = await verifyGoogleToken(access_token);
    if (!googleUser) {
      return res.status(401).json({ detail: 'Invalid Google token' });
    }

    const { email, sub: googleId, name, picture: avatarUrl } = googleUser;

    let user = await User.findOne({ 
      where: { 
        [Op.or]: [{ email }, { google_id: googleId }] 
      } 
    });

    if (!user) {
      user = await User.create({
        email,
        google_id: googleId,
        name,
        avatar_url: avatarUrl
      });
    } else {
      // Update existing
      if (!user.google_id) user.google_id = googleId;
      if (!user.avatar_url) user.avatar_url = avatarUrl;
      if (!user.name) user.name = name;
      await user.save();
    }

    const accessToken = createAccessToken({ sub: user.id.toString() });

    res.json({
      access_token: accessToken,
      token_type: 'bearer',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar_url: user.avatar_url
      }
    });
  } catch (e) {
    console.error('Google Auth Error:', e);
    res.status(500).json({ detail: 'Internal server error during Google authentication' });
  }
});

/**
 * Get current user profile.
 */
router.get('/me', authMiddleware, (req, res) => {
  res.json({
    id: req.user.id,
    email: req.user.email,
    name: req.user.name,
    avatar_url: req.user.avatar_url
  });
});

module.exports = router;
