const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { getPool } = require('../db/database');
const { authMiddleware } = require('../middleware/auth');

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
      'INSERT INTO users (id, username, email, password_hash) VALUES ($1,$2,$3,$4)',
      [id, username, email, hash]
    );
    await db.query(
      "INSERT INTO transactions (id, user_id, amount, type, description) VALUES ($1,$2,100,'credit','Welcome bonus')",
      [uuidv4(), id]
    );

    const token = jwt.sign({ userId: id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    const { rows } = await db.query(
      'SELECT id, username, email, credits, is_admin, created_at FROM users WHERE id = $1', [id]
    );
    res.status(201).json({ token, user: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  const db = getPool();
  const { rows } = await db.query('SELECT * FROM users WHERE email = $1', [email]);
  const user = rows[0];
  if (!user || !(await bcrypt.compare(password, user.password_hash)))
    return res.status(401).json({ error: 'Invalid credentials' });

  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
  const { password_hash, ...safeUser } = user;
  res.json({ token, user: safeUser });
});

router.get('/me', authMiddleware, async (req, res) => {
  const { rows } = await getPool().query(
    'SELECT id, username, email, credits, is_admin, bio, avatar, created_at FROM users WHERE id = $1',
    [req.user.id]
  );
  res.json(rows[0]);
});

module.exports = router;
