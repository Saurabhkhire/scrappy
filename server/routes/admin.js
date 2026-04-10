const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const { getPool } = require('../db/database');
const { adminMiddleware } = require('../middleware/auth');

router.get('/users', adminMiddleware, async (req, res) => {
  const { rows } = await getPool().query(`
    SELECT u.id, u.username, u.email, u.credits, u.is_admin, u.created_at,
      (SELECT COUNT(*) FROM scrapers WHERE creator_id = u.id)::int AS scraper_count,
      (SELECT COUNT(*) FROM scraper_runs WHERE user_id = u.id)::int AS run_count
    FROM users u ORDER BY u.created_at DESC
  `);
  res.json(rows);
});

router.post('/credits', adminMiddleware, async (req, res) => {
  const { user_id, amount, description } = req.body;
  if (!user_id || !amount) return res.status(400).json({ error: 'user_id and amount required' });

  const db = getPool();
  const { rows } = await db.query('SELECT id, username FROM users WHERE id = $1', [user_id]);
  if (!rows[0]) return res.status(404).json({ error: 'User not found' });

  const amt = parseFloat(amount);
  await db.query('UPDATE users SET credits = credits + $1 WHERE id = $2', [amt, user_id]);
  await db.query(
    'INSERT INTO transactions (id,user_id,amount,type,description) VALUES ($1,$2,$3,$4,$5)',
    [uuidv4(), user_id, Math.abs(amt), amt > 0 ? 'admin_grant' : 'admin_deduct',
     description || `Admin ${amt > 0 ? 'credit' : 'deduction'}`]
  );
  const { rows: updated } = await db.query(
    'SELECT id, username, email, credits FROM users WHERE id = $1', [user_id]
  );
  res.json(updated[0]);
});

router.put('/users/:id', adminMiddleware, async (req, res) => {
  const db = getPool();
  const { is_admin, credits } = req.body;
  if (is_admin !== undefined)
    await db.query('UPDATE users SET is_admin = $1 WHERE id = $2', [is_admin ? 1 : 0, req.params.id]);
  if (credits !== undefined)
    await db.query('UPDATE users SET credits = $1 WHERE id = $2', [parseFloat(credits), req.params.id]);
  const { rows } = await db.query(
    'SELECT id, username, email, credits, is_admin FROM users WHERE id = $1', [req.params.id]
  );
  res.json(rows[0]);
});

router.delete('/users/:id', adminMiddleware, async (req, res) => {
  if (req.params.id === req.user.id) return res.status(400).json({ error: 'Cannot delete yourself' });
  await getPool().query('DELETE FROM users WHERE id = $1', [req.params.id]);
  res.json({ success: true });
});

router.get('/stats', adminMiddleware, async (req, res) => {
  const db = getPool();
  const [users, scrapers, runs, today, credits, recentRuns, topScrapers] = await Promise.all([
    db.query('SELECT COUNT(*)::int AS c FROM users'),
    db.query('SELECT COUNT(*)::int AS c FROM scrapers'),
    db.query('SELECT COUNT(*)::int AS c FROM scraper_runs'),
    db.query("SELECT COUNT(*)::int AS c FROM scraper_runs WHERE created_at::date = CURRENT_DATE"),
    db.query('SELECT COALESCE(SUM(credits),0)::float AS c FROM users WHERE is_admin = 0'),
    db.query(`
      SELECT r.id, r.status, r.created_at, r.duration_ms, s.name AS scraper_name, u.username
      FROM scraper_runs r
      JOIN scrapers s ON r.scraper_id = s.id
      LEFT JOIN users u ON r.user_id = u.id
      ORDER BY r.created_at DESC LIMIT 10
    `),
    db.query('SELECT id, name, runs_count, creator_name FROM scrapers ORDER BY runs_count DESC LIMIT 5'),
  ]);

  res.json({
    total_users: users.rows[0].c,
    total_scrapers: scrapers.rows[0].c,
    total_runs: runs.rows[0].c,
    runs_today: today.rows[0].c,
    total_credits_in_system: credits.rows[0].c,
    recent_runs: recentRuns.rows,
    top_scrapers: topScrapers.rows,
  });
});

router.get('/scrapers', adminMiddleware, async (req, res) => {
  const { rows } = await getPool().query(`
    SELECT id, name, creator_name, language, pricing_type, price, is_public, runs_count, created_at
    FROM scrapers ORDER BY created_at DESC
  `);
  res.json(rows);
});

module.exports = router;
