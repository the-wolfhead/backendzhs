import express from 'express';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import prisma from '../prismaClient.js';
import { hashPassword, comparePassword } from '../utils/hash.js';

const router = express.Router();

// 🔑 Setup Google client
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// 🔐 Utility to issue JWT tokens
const generateToken = (user) =>
  jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });

/* ---------------------------------------------
   🧾 EMAIL SIGNUP
--------------------------------------------- */
router.post('/signup', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    console.log('📥 Signup request body:', req.body);

    if (!email || !password || !name) {
      console.log('❌ Missing fields');
      return res.status(400).json({ error: 'Missing fields' });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      console.log('⚠️ User already exists:', email);
      return res.status(400).json({ error: 'User already exists' });
    }

    console.log('🔐 Hashing password...');
    const hashed = await hashPassword(password);

    console.log('🧾 Creating user in database...');
    const user = await prisma.user.create({
      data: { email, password: hashed, name },
    });

    console.log('✅ User created successfully:', user);

    console.log('🔑 Generating token...');
    const token = generateToken(user);

    console.log('✅ Token generated successfully');

    res.json({ user, token });
  } catch (err) {
    console.error('🔥 Signup Error:', err);
    res.status(500).json({
      error: 'Signup failed',
      message: err.message,
      stack: err.stack,
    });
  }
});


router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json({ user });
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

/* ---------------------------------------------
   🔐 EMAIL LOGIN
--------------------------------------------- */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log('📥 Login request body:', req.body);

    if (!email || !password)
      return res.status(400).json({ error: 'Missing credentials' });

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (!user.password)
      return res.status(400).json({ error: 'Use Google login for this account' });

    const isMatch = await comparePassword(password, user.password);
    if (!isMatch) return res.status(400).json({ error: 'Invalid credentials' });

    const token = generateToken(user);
    res.json({ user, token });
  } catch (err) {
    console.error('Login Error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

/* ---------------------------------------------
   🟢 GOOGLE LOGIN (Expo Mobile)
--------------------------------------------- */
router.post('/google/mobile', async (req, res) => {
  try {
    const { id_token } = req.body;
    if (!id_token) return res.status(400).json({ error: 'Missing ID token' });

    // ✅ Verify the token with Google
    const ticket = await googleClient.verifyIdToken({
      idToken: id_token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture } = payload;

    if (!email) return res.status(400).json({ error: 'Invalid Google token' });

    // ✅ Check if user exists or create new one
    let user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      user = await prisma.user.create({
        data: { googleId, email, name, picture },
      });
    } else if (!user.googleId) {
      // merge Google ID if user signed up manually before
      user = await prisma.user.update({
        where: { email },
        data: { googleId, picture },
      });
    }

    const token = generateToken(user);
    res.json({ user, token });
  } catch (err) {
    console.error('Google Auth Error:', err);
    res.status(500).json({ error: 'Google login failed' });
  }
});

/* ---------------------------------------------
   🚪 LOGOUT (Optional - client handles token removal)
--------------------------------------------- */
router.post('/logout', async (req, res) => {
  try {
    // You can also blacklist JWTs here if desired
    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    console.error('Logout Error:', err);
    res.status(500).json({ error: 'Logout failed' });
  }
});

export default router;
