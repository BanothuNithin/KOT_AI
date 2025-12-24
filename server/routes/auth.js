import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import pool from "../db/connection.js";

const router = express.Router();

const JWT_SECRET =
  process.env.JWT_SECRET || "change-this-secret-in-production";

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  console.log('AUTHENTICATE TOKEN: Checking request to', req.path);
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    console.log('AUTHENTICATE TOKEN: No token provided');
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    console.log('AUTHENTICATE TOKEN: Verifying token with secret');
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log('AUTHENTICATE TOKEN: Token decoded successfully:', decoded);
    req.user = decoded;
    next();
  } catch (error) {
    console.log('AUTHENTICATE TOKEN: Token verification failed:', error.message);
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

/* =========================
   REGISTER
========================= */
router.post('/register', async (req, res) => {
  try {
    console.log('REGISTER BODY:', req.body);

    const { name, email, phone, password } = req.body;

    if (!name || !email || !phone || !password) {
      return res.status(400).json({
        error: 'Name, email, phone, and password are required'
      });
    }

    const [existing] = await pool.execute(
      'SELECT id FROM users WHERE email = ? OR phone = ?',
      [email, phone]
    );

    if (existing.length > 0) {
      return res.status(409).json({ error: 'User already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userId = uuidv4();

    await pool.execute(
      `INSERT INTO users (id, name, email, phone, password_hash, role)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, name, email, phone, passwordHash, 'USER']
    );

    const token = jwt.sign(
      { userId, name, email, phone, role: 'USER' },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'Registered successfully',
      token,
      user: { id: userId, name, email, phone, role: 'USER' }
    });

  } catch (err) {
    console.error('REGISTER ERROR:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/* =========================
   LOGIN
========================= */
router.post('/login', async (req, res) => {
  try {
    console.log('LOGIN BODY:', req.body);

    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: 'Email and password are required'
      });
    }

    const [users] = await pool.execute(
      'SELECT id, name, email, phone, password_hash, role FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = users[0];
    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role }
    });

  } catch (err) {
    console.error('LOGIN ERROR:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export { router, authenticateToken };


