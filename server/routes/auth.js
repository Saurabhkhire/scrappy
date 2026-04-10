const router = require('express').Router();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { getPool } = require('../db/database');
const { authMiddleware } = require('../middleware/auth');
const { sendVerificationEmail } = require('../utils/email');

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password)
    return res.status(400).json({ error: 'All fields required' });
  if (password.length < 6)
    return res.status(400).json({ error: 'Password must be at least 6 characters' });

  const db = getPool();
  try {
    const { rows: existing } = await db.query(
      'SELECT id FROM users WHERE email = $1 OR username = $2', [email, username]
    );
    if (existing.length) return res.status(409).json({ error: 'Email or username already taken' });

    const id = uuidv4();
    const hash = await bcrypt.hash(password, 10);
    await db.query(
      'INSERT INTO users (id, username, email, password_hash, email_verified) VALUES ($1,$2,$3,$4,0)',
      [id, username, email, hash]
    );
    await db.query(
      "INSERT INTO transactions (id, user_id, amount, type, description) VALUES ($1,$2,100,'credit','Welcome bonus')",
      [uuidv4(), id]
    );

    // Create verification token (expires in 24 hours)
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    await db.query(
      'INSERT INTO email_verifications (id, user_id, token, expires_at) VALUES ($1,$2,$3,$4)',
      [uuidv4(), id, token, expiresAt]
    );

    try {
      await sendVerificationEmail(email, token);
    } catch (emailErr) {
      console.error('Failed to send verification email:', emailErr.message);
      // Don't fail registration if email sending fails — user can resend
    }

    res.status(201).json({ message: 'Account created. Please check your email to verify your account.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// GET /api/auth/verify-email?token=xxx
router.get('/verify-email', async (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).json({ error: 'Token required' });

  const db = getPool();
  const { rows } = await db.query(
    'SELECT * FROM email_verifications WHERE token = $1', [token]
  );
  const record = rows[0];

  if (!record) return res.status(400).json({ error: 'Invalid or already used verification link' });
  if (new Date(record.expires_at) < new Date())
    return res.status(400).json({ error: 'Verification link has expired. Please request a new one.' });

  await db.query('UPDATE users SET email_verified = 1 WHERE id = $1', [record.user_id]);
  await db.query('DELETE FROM email_verifications WHERE id = $1', [record.id]);

  const { rows: userRows } = await db.query(
    'SELECT id, username, email, credits, is_admin, created_at FROM users WHERE id = $1',
    [record.user_id]
  );
  const user = userRows[0];
  const jwtToken = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.json({ token: jwtToken, user });
});

// POST /api/auth/resend-verification
router.post('/resend-verification', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });

  const db = getPool();
  const { rows } = await db.query('SELECT * FROM users WHERE email = $1', [email]);
  const user = rows[0];

  // Always respond the same way to prevent email enumeration
  if (!user || user.email_verified) {
    return res.json({ message: 'If your email is registered and unverified, a new link has been sent.' });
  }

  // Delete old tokens for this user and create a new one
  await db.query('DELETE FROM email_verifications WHERE user_id = $1', [user.id]);
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  await db.query(
    'INSERT INTO email_verifications (id, user_id, token, expires_at) VALUES ($1,$2,$3,$4)',
    [uuidv4(), user.id, token, expiresAt]
  );

  try {
    await sendVerificationEmail(email, token);
  } catch (err) {
    console.error('Failed to resend verification email:', err.message);
    return res.status(500).json({ error: 'Failed to send email. Check server SMTP configuration.' });
  }

  res.json({ message: 'Verification email sent. Please check your inbox.' });
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  const db = getPool();
  const { rows } = await db.query('SELECT * FROM users WHERE email = $1', [email]);
  const user = rows[0];
  if (!user || !(await bcrypt.compare(password, user.password_hash)))
    return res.status(401).json({ error: 'Invalid credentials' });

  if (!user.email_verified)
    return res.status(403).json({ error: 'Please verify your email before logging in.', unverified: true, email });

  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
  const { password_hash, ...safeUser } = user;
  res.json({ token, user: safeUser });
});

// GET /api/auth/me
router.get('/me', authMiddleware, async (req, res) => {
  const { rows } = await getPool().query(
    'SELECT id, username, email, credits, is_admin, bio, avatar, created_at FROM users WHERE id = $1',
    [req.user.id]
  );
  res.json(rows[0]);
});

module.exports = router;
