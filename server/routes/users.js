const router = require('express').Router();
const { getPool } = require('../db/database');
const { authMiddleware } = require('../middleware/auth');

router.get('/me/scrapers', authMiddleware, async (req, res) => {
  const { rows } = await getPool().query(
    `SELECT id, name, description, language, pricing_type, price, api_key, is_public, runs_count, tags, created_at
     FROM scrapers WHERE creator_id = $1 ORDER BY created_at DESC`,
    [req.user.id]
  );
  res.json(rows.map(s => ({ ...s, tags: JSON.parse(s.tags || '[]') })));
});

router.get('/me/purchases', authMiddleware, async (req, res) => {
  const { rows } = await getPool().query(
    `SELECT p.*, s.name, s.description, s.language, s.creator_name
     FROM purchases p JOIN scrapers s ON p.scraper_id = s.id
     WHERE p.user_id = $1 ORDER BY p.created_at DESC`,
    [req.user.id]
  );
  res.json(rows);
});

router.get('/me/transactions', authMiddleware, async (req, res) => {
  const { rows } = await getPool().query(
    'SELECT * FROM transactions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100',
    [req.user.id]
  );
  res.json(rows);
});

router.put('/me', authMiddleware, async (req, res) => {
  const { bio, avatar } = req.body;
  await getPool().query(
    'UPDATE users SET bio = COALESCE($1, bio), avatar = COALESCE($2, avatar) WHERE id = $3',
    [bio, avatar, req.user.id]
  );
  const { rows } = await getPool().query(
    'SELECT id, username, email, credits, is_admin, bio, avatar, created_at FROM users WHERE id = $1',
    [req.user.id]
  );
  res.json(rows[0]);
});

router.get('/me/runs', authMiddleware, async (req, res) => {
  const { rows } = await getPool().query(
    `SELECT r.id, r.scraper_id, r.status, r.duration_ms, r.created_at, s.name AS scraper_name
     FROM scraper_runs r JOIN scrapers s ON r.scraper_id = s.id
     WHERE r.user_id = $1 ORDER BY r.created_at DESC LIMIT 50`,
    [req.user.id]
  );
  res.json(rows);
});

module.exports = router;
