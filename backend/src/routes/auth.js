const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { requireAuth, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

// 1. User Registration (Implementing the 3 wireframe rules exactly)
router.post('/register', (req, res) => {
  const { login_id, email, password, re_password, name, role } = req.body;

  // Validate presence
  if (!login_id || !email || !password) {
    return res.status(400).json({ error: 'Login ID, Email, and Password are required.' });
  }

  // Wireframe Rule 1: login ID should be unique and must be in between 6-12 characters.
  const cleanLoginId = login_id.trim().toLowerCase();
  if (cleanLoginId.length < 6 || cleanLoginId.length > 12) {
    return res.status(400).json({ error: 'Login ID must be between 6 and 12 characters.' });
  }

  // Wireframe Rule 2: Email Id should not be a duplicate in database
  const cleanEmail = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(cleanEmail)) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }

  // Check re-enter password if provided
  if (re_password !== undefined && password !== re_password) {
    return res.status(400).json({ error: 'Passwords do not match. Please re-enter your password.' });
  }

  // Wireframe Rule 3: Password must contain a small case, a large case and a special character and length should be more than 8 characters.
  if (password.length <= 8) {
    return res.status(400).json({ error: 'Password length must be more than 8 characters.' });
  }
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
  if (!hasLower || !hasUpper || !hasSpecial) {
    return res.status(400).json({
      error: 'Password must contain at least one lowercase letter, one uppercase letter, and one special character.'
    });
  }

  try {
    // Check duplicate login_id
    const existingLoginId = db.prepare('SELECT id FROM users WHERE login_id = ?').get(cleanLoginId);
    if (existingLoginId) {
      return res.status(400).json({ error: 'This Login ID is already taken. Please choose another.' });
    }

    // Check duplicate email
    const existingEmail = db.prepare('SELECT id FROM users WHERE email = ?').get(cleanEmail);
    if (existingEmail) {
      return res.status(400).json({ error: 'An account with this Email ID already exists.' });
    }

    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(password, salt);
    const userRole = role === 'Inventory Manager' ? 'Inventory Manager' : 'Warehouse Staff';
    const displayName = name ? name.trim() : cleanLoginId;

    const insert = db.prepare(`
      INSERT INTO users (login_id, name, email, password_hash, role) 
      VALUES (?, ?, ?, ?, ?)
    `);
    const result = insert.run(cleanLoginId, displayName, cleanEmail, passwordHash, userRole);

    const user = {
      id: result.lastInsertRowid,
      login_id: cleanLoginId,
      name: displayName,
      email: cleanEmail,
      role: userRole
    };

    const token = jwt.sign(user, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      message: 'Account created successfully',
      user,
      token
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2. User Login (Wireframe: Checks Login Id or Email, returns exact error message "Invalid Login Id or Password")
router.post('/login', (req, res) => {
  const { login_id, email, password } = req.body;
  const credential = (login_id || email || '').trim().toLowerCase();

  if (!credential || !password) {
    return res.status(400).json({ error: 'Please enter your Login ID and Password.' });
  }

  try {
    const user = db.prepare(`
      SELECT * FROM users 
      WHERE login_id = ? OR email = ?
    `).get(credential, credential);

    if (!user) {
      // Wireframe exact requirement: "Invalid Login Id or Password"
      return res.status(401).json({ error: 'Invalid Login Id or Password' });
    }

    const isMatch = bcrypt.compareSync(password, user.password_hash);
    if (!isMatch) {
      // Wireframe exact requirement: "Invalid Login Id or Password"
      return res.status(401).json({ error: 'Invalid Login Id or Password' });
    }

    const safeUser = {
      id: user.id,
      login_id: user.login_id,
      name: user.name,
      email: user.email,
      role: user.role
    };

    const token = jwt.sign(safeUser, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      message: 'Login successful',
      user: safeUser,
      token
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3. Forgot Password - Generate 6-digit OTP
router.post('/forgot-password', (req, res) => {
  const { email, login_id } = req.body;
  const cred = (email || login_id || '').trim().toLowerCase();

  if (!cred) {
    return res.status(400).json({ error: 'Email or Login ID is required.' });
  }

  try {
    const user = db.prepare('SELECT id, name, email FROM users WHERE email = ? OR login_id = ?').get(cred, cred);
    if (!user) {
      return res.status(404).json({ error: 'No user found with this credential.' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    db.prepare('UPDATE users SET otp_code = ?, otp_expires_at = ? WHERE id = ?')
      .run(otp, expiresAt, user.id);

    console.log(`🔑 [OTP DEMO] Password reset OTP for ${user.email} is: ${otp}`);

    res.json({
      message: `A 6-digit OTP has been sent to ${user.email}`,
      demoOtp: otp
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 4. Verify OTP and Reset Password
router.post('/reset-password', (req, res) => {
  const { email, otp, newPassword } = req.body;

  if (!email || !otp || !newPassword) {
    return res.status(400).json({ error: 'Email, OTP, and new password are required.' });
  }

  // Validate new password with wireframe rules
  if (newPassword.length <= 8) {
    return res.status(400).json({ error: 'Password must be more than 8 characters.' });
  }

  try {
    const user = db.prepare('SELECT * FROM users WHERE email = ? OR login_id = ?').get(email.toLowerCase().trim(), email.toLowerCase().trim());
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    if (!user.otp_code || user.otp_code !== otp.trim()) {
      return res.status(400).json({ error: 'Invalid OTP code. Please check and try again.' });
    }

    if (new Date(user.otp_expires_at) < new Date()) {
      return res.status(400).json({ error: 'This OTP has expired. Please request a new one.' });
    }

    const salt = bcrypt.genSaltSync(10);
    const newHash = bcrypt.hashSync(newPassword, salt);

    db.prepare('UPDATE users SET password_hash = ?, otp_code = NULL, otp_expires_at = NULL WHERE id = ?')
      .run(newHash, user.id);

    res.json({ message: 'Password has been successfully updated. You can now log in.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 5. Get current profile (Protected)
router.get('/me', requireAuth, (req, res) => {
  try {
    const user = db.prepare('SELECT id, login_id, name, email, role, created_at FROM users WHERE id = ?').get(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User profile not found.' });
    }
    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
