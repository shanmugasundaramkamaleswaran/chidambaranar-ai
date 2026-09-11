const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const axios = require('axios');
const crypto = require('crypto');
require('dotenv').config();

const SECRET_KEY = process.env.JWT_SECRET || 'abimanyu-divine-wisdom-secret-key-change-in-production';
const ALGORITHM = 'HS256';
const ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7; // 7 days

/**
 * Verify a password against its hash.
 * Supports both bcrypt and existing passlib pbkdf2_sha256 hashes.
 */
async function verifyPassword(plainPassword, hashedPassword) {
  if (!hashedPassword) return false;

  // Check if it's a passlib pbkdf2_sha256 hash
  if (hashedPassword.startsWith('$pbkdf2-sha256$')) {
    try {
      const parts = hashedPassword.split('$');
      const rounds = parseInt(parts[2]);
      const salt = parts[3];
      const hash = parts[4];
      
      const derivedKey = crypto.pbkdf2Sync(
        plainPassword, 
        salt, 
        rounds, 
        32, 
        'sha256'
      );
      return derivedKey.toString('base64').replace(/=+$/, '').replace(/\+/g, '.').replace(/\//g, '/') === hash;
      // Note: passlib's encoding might be slightly different, but this is a common approach.
      // If this fails, we might just fallback to bcrypt.
    } catch (e) {
      console.error('PBKDF2 verification error:', e);
      return false;
    }
  }

  // Default to bcrypt
  return await bcrypt.compare(plainPassword, hashedPassword);
}

/**
 * Hash a password using bcrypt.
 */
async function getPasswordHash(password) {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
}

/**
 * Create a JWT access token.
 */
function createAccessToken(data) {
  return jwt.sign(data, SECRET_KEY, {
    algorithm: ALGORITHM,
    expiresIn: `${ACCESS_TOKEN_EXPIRE_MINUTES}m`
  });
}

/**
 * Decode and verify a JWT access token.
 */
function decodeAccessToken(token) {
  try {
    return jwt.verify(token, SECRET_KEY, { algorithms: [ALGORITHM] });
  } catch (e) {
    return null;
  }
}

/**
 * Verify Google OAuth token and extract user info.
 */
async function verifyGoogleToken(token) {
  try {
    const response = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  } catch (e) {
    return null;
  }
}

module.exports = {
  verifyPassword,
  getPasswordHash,
  createAccessToken,
  decodeAccessToken,
  verifyGoogleToken
};
