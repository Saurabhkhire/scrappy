const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const { spawn } = require('child_process');
const os = require('os');
const fs = require('fs');
const path = require('path');
const { getPool } = require('../db/database');
const { authMiddleware, optionalAuth } = require('../middleware/auth');

const isWindows = process.platform === 'win32';
const pythonCmd = process.env.PYTHON_CMD || (isWindows ? 'python' : 'python3');
const SCRAPER_TIMEOUT = parseInt(process.env.SCRAPER_TIMEOUT_MS) || 30000;

// GET /api/scrapers
router.get('/', optionalAuth, async (req, res) => {
  const db = getPool();
  const { search, language, pricing, page = 1, limit = 20 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  const conditions = ['s.is_public = 1'];
  const params = [];
  let p = 1;

  if (search) {
    conditions.push(`(s.name ILIKE $${p} OR s.description ILIKE $${p+1} OR s.creator_name ILIKE $${p+2})`);
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    p += 3;
  }
  if (language) { conditions.push(`s.language = $${p++}`); params.push(language); }
  if (pricing)  { conditions.push(`s.pricing_type = $${p++}`); params.push(pricing); }

  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

  const { rows: scrapers } = await db.query(`
    SELECT s.id, s.name, s.description, s.creator_id, s.creator_name, s.language,
           s.pricing_type, s.price, s.runs_count, s.tags, s.created_at,
           u.avatar AS creator_avatar
    FROM scrapers s LEFT JOIN users u ON s.creator_id = u.id
    ${where}
    ORDER BY s.runs_count DESC, s.created_at DESC
    LIMIT $${p} OFFSET $${p+1}
  `, [...params, parseInt(limit), offset]);

  const { rows: countRows } = await db.query(
    `SELECT COUNT(*) AS count FROM scrapers s ${where}`, params
  );

  res.json({
    scrapers: scrapers.map(s => ({ ...s, tags: JSON.parse(s.tags || '[]') })),
    total: parseInt(countRows[0].count),
    page: parseInt(page),
    pages: Math.ceil(parseInt(countRows[0].count) / parseInt(limit))
  });
});

// GET /api/scrapers/:id
router.get('/:id', optionalAuth, async (req, res) => {
  const db = getPool();
  const { rows } = await db.query(`
    SELECT s.*, u.avatar AS creator_avatar, u.bio AS creator_bio
    FROM scrapers s LEFT JOIN users u ON s.creator_id = u.id
    WHERE s.id = $1
  `, [req.params.id]);

  const scraper = rows[0];
  if (!scraper) return res.status(404).json({ error: 'Scraper not found' });
  if (!scraper.is_public && scraper.creator_id !== req.user?.id && !req.user?.is_admin)
    return res.status(403).json({ error: 'Access denied' });

  scraper.parameters = JSON.parse(scraper.parameters || '[]');
  scraper.tags = JSON.parse(scraper.tags || '[]');

  // Never expose raw code; api_key only goes to the owner or admin
  delete scraper.file_content;
  const isOwnerOrAdmin = req.user && (scraper.creator_id === req.user.id || req.user.is_admin);
  if (!isOwnerOrAdmin) delete scraper.api_key;

  if (req.user && scraper.pricing_type === 'one_time') {
    const { rows: p } = await db.query(
      'SELECT id FROM purchases WHERE scraper_id = $1 AND user_id = $2',
      [scraper.id, req.user.id]
    );
    scraper.user_purchased = p.length > 0 || scraper.creator_id === req.user.id;
  }
  res.json(scraper);
});

// POST /api/scrapers
router.post('/', authMiddleware, async (req, res) => {
  const { name, description, language, file_content, parameters, pricing_type, price, tags, is_public } = req.body;
  if (!name || !language || !file_content)
    return res.status(400).json({ error: 'Name, language, and file content required' });
  if (!['python', 'javascript'].includes(language))
    return res.status(400).json({ error: 'Language must be python or javascript' });

  const db = getPool();
  const id = uuidv4();
  const api_key = uuidv4().replace(/-/g, '');

  await db.query(`
    INSERT INTO scrapers
      (id, name, description, creator_id, creator_name, language, file_content, parameters, pricing_type, price, api_key, is_public, tags)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
  `, [
    id, name, description || '', req.user.id, req.user.username,
    language, file_content,
    JSON.stringify(parameters || []),
    pricing_type || 'free',
    parseFloat(price) || 0,
    api_key,
    is_public !== false ? 1 : 0,
    JSON.stringify(tags || [])
  ]);

  const { rows } = await db.query('SELECT * FROM scrapers WHERE id = $1', [id]);
  const s = rows[0];
  s.parameters = JSON.parse(s.parameters);
  s.tags = JSON.parse(s.tags);
  delete s.file_content;
  res.status(201).json(s);
});

// PUT /api/scrapers/:id
router.put('/:id', authMiddleware, async (req, res) => {
  const db = getPool();
  const { rows } = await db.query('SELECT * FROM scrapers WHERE id = $1', [req.params.id]);
  const scraper = rows[0];
  if (!scraper) return res.status(404).json({ error: 'Not found' });
  if (scraper.creator_id !== req.user.id && !req.user.is_admin)
    return res.status(403).json({ error: 'Access denied' });

  const { name, description, language, file_content, parameters, pricing_type, price, tags, is_public } = req.body;
  await db.query(`
    UPDATE scrapers SET
      name         = COALESCE($1, name),
      description  = COALESCE($2, description),
      language     = COALESCE($3, language),
      file_content = COALESCE($4, file_content),
      parameters   = COALESCE($5, parameters),
      pricing_type = COALESCE($6, pricing_type),
      price        = COALESCE($7, price),
      tags         = COALESCE($8, tags),
      is_public    = COALESCE($9, is_public),
      updated_at   = NOW()
    WHERE id = $10
  `, [
    name, description, language, file_content,
    parameters ? JSON.stringify(parameters) : null,
    pricing_type,
    price !== undefined ? parseFloat(price) : null,
    tags ? JSON.stringify(tags) : null,
    is_public !== undefined ? (is_public ? 1 : 0) : null,
    req.params.id
  ]);

  const { rows: updated } = await db.query('SELECT * FROM scrapers WHERE id = $1', [req.params.id]);
  updated[0].parameters = JSON.parse(updated[0].parameters);
  updated[0].tags = JSON.parse(updated[0].tags);
  delete updated[0].file_content;
  res.json(updated[0]);
});

// DELETE /api/scrapers/:id
router.delete('/:id', authMiddleware, async (req, res) => {
  const db = getPool();
  const { rows } = await db.query('SELECT creator_id FROM scrapers WHERE id = $1', [req.params.id]);
  if (!rows[0]) return res.status(404).json({ error: 'Not found' });
  if (rows[0].creator_id !== req.user.id && !req.user.is_admin)
    return res.status(403).json({ error: 'Access denied' });
  await db.query('DELETE FROM scrapers WHERE id = $1', [req.params.id]);
  res.json({ success: true });
});

// POST /api/scrapers/:id/run
router.post('/:id/run', authMiddleware, async (req, res) => {
  const db = getPool();
  const { rows } = await db.query('SELECT * FROM scrapers WHERE id = $1', [req.params.id]);
  const scraper = rows[0];
  if (!scraper) return res.status(404).json({ error: 'Scraper not found' });
  scraper.parameters = JSON.parse(scraper.parameters || '[]');

  const cost = getCostForRun(scraper, req.user);
  if (cost > parseFloat(req.user.credits))
    return res.status(402).json({ error: `Insufficient credits. Need ${cost}, have ${parseFloat(req.user.credits).toFixed(2)}` });

  if (scraper.pricing_type === 'one_time' && scraper.creator_id !== req.user.id) {
    const { rows: p } = await db.query(
      'SELECT id FROM purchases WHERE scraper_id = $1 AND user_id = $2',
      [scraper.id, req.user.id]
    );
    if (!p.length) return res.status(402).json({ error: 'Purchase required', need_purchase: true });
  }

  const runId = uuidv4();
  const inputParams = req.body || {};
  await db.query(
    'INSERT INTO scraper_runs (id, scraper_id, user_id, input_params, status) VALUES ($1,$2,$3,$4,$5)',
    [runId, scraper.id, req.user.id, JSON.stringify(inputParams), 'running']
  );

  executeScraper(scraper, inputParams, async (err, output, durationMs) => {
    if (err) {
      await db.query(
        'UPDATE scraper_runs SET status=$1, error_message=$2, duration_ms=$3 WHERE id=$4',
        ['error', err.message, durationMs, runId]
      );
      return res.status(500).json({ error: err.message, run_id: runId, duration_ms: durationMs });
    }

    await db.query(
      'UPDATE scraper_runs SET status=$1, output=$2, duration_ms=$3 WHERE id=$4',
      ['success', JSON.stringify(output), durationMs, runId]
    );

    if (cost > 0) {
      await db.query('UPDATE users SET credits = credits - $1 WHERE id = $2', [cost, req.user.id]);
      await db.query(
        "INSERT INTO transactions (id,user_id,amount,type,description,reference_id) VALUES ($1,$2,$3,'debit',$4,$5)",
        [uuidv4(), req.user.id, cost, `Ran scraper: ${scraper.name}`, runId]
      );
      if (scraper.creator_id !== req.user.id) {
        await db.query('UPDATE users SET credits = credits + $1 WHERE id = $2', [cost, scraper.creator_id]);
        await db.query(
          "INSERT INTO transactions (id,user_id,amount,type,description,reference_id) VALUES ($1,$2,$3,'credit',$4,$5)",
          [uuidv4(), scraper.creator_id, cost, `Earnings from: ${scraper.name}`, runId]
        );
      }
    }
    await db.query('UPDATE scrapers SET runs_count = runs_count + 1 WHERE id = $1', [scraper.id]);
    res.json({ run_id: runId, output, duration_ms: durationMs, credits_used: cost });
  });
});

// POST /api/scrapers/:id/purchase
router.post('/:id/purchase', authMiddleware, async (req, res) => {
  const db = getPool();
  const { rows } = await db.query('SELECT * FROM scrapers WHERE id = $1', [req.params.id]);
  const scraper = rows[0];
  if (!scraper) return res.status(404).json({ error: 'Not found' });
  if (scraper.pricing_type !== 'one_time') return res.status(400).json({ error: 'Not a one-time purchase scraper' });
  if (scraper.creator_id === req.user.id) return res.status(400).json({ error: 'Cannot purchase your own scraper' });

  const { rows: p } = await db.query(
    'SELECT id FROM purchases WHERE scraper_id=$1 AND user_id=$2', [scraper.id, req.user.id]
  );
  if (p.length) return res.status(409).json({ error: 'Already purchased' });

  const { rows: u } = await db.query('SELECT credits FROM users WHERE id=$1', [req.user.id]);
  if (parseFloat(u[0].credits) < scraper.price) return res.status(402).json({ error: 'Insufficient credits' });

  const purchaseId = uuidv4();
  await db.query('INSERT INTO purchases (id,scraper_id,user_id,amount) VALUES ($1,$2,$3,$4)',
    [purchaseId, scraper.id, req.user.id, scraper.price]);
  await db.query('UPDATE users SET credits = credits - $1 WHERE id = $2', [scraper.price, req.user.id]);
  await db.query(
    "INSERT INTO transactions (id,user_id,amount,type,description,reference_id) VALUES ($1,$2,$3,'debit',$4,$5)",
    [uuidv4(), req.user.id, scraper.price, `Purchased: ${scraper.name}`, purchaseId]
  );
  if (scraper.price > 0) {
    await db.query('UPDATE users SET credits = credits + $1 WHERE id = $2', [scraper.price, scraper.creator_id]);
    await db.query(
      "INSERT INTO transactions (id,user_id,amount,type,description,reference_id) VALUES ($1,$2,$3,'credit',$4,$5)",
      [uuidv4(), scraper.creator_id, scraper.price, `Sale: ${scraper.name}`, purchaseId]
    );
  }
  res.json({ success: true, purchase_id: purchaseId });
});

// GET /api/scrapers/:id/runs
router.get('/:id/runs', authMiddleware, async (req, res) => {
  const db = getPool();
  const { rows: s } = await db.query('SELECT creator_id FROM scrapers WHERE id=$1', [req.params.id]);
  if (!s[0]) return res.status(404).json({ error: 'Not found' });
  if (s[0].creator_id !== req.user.id && !req.user.is_admin)
    return res.status(403).json({ error: 'Access denied' });

  const { rows } = await db.query(`
    SELECT r.*, u.username FROM scraper_runs r
    LEFT JOIN users u ON r.user_id = u.id
    WHERE r.scraper_id = $1 ORDER BY r.created_at DESC LIMIT 50
  `, [req.params.id]);

  res.json(rows.map(r => ({
    ...r,
    input_params: JSON.parse(r.input_params || 'null'),
    output: JSON.parse(r.output || 'null')
  })));
});

function getCostForRun(scraper, user) {
  if (scraper.creator_id === user.id) return 0;
  if (scraper.pricing_type === 'per_run') return parseFloat(scraper.price);
  return 0;
}

function executeScraper(scraper, inputParams, callback) {
  const ext = scraper.language === 'python' ? '.py' : '.js';
  const tmpFile = path.join(os.tmpdir(), `scrappy_${uuidv4()}${ext}`);
  try { fs.writeFileSync(tmpFile, scraper.file_content, 'utf8'); }
  catch { return callback(new Error('Failed to write temp file'), null, 0); }

  const cmd = scraper.language === 'python' ? pythonCmd : 'node';
  const startTime = Date.now();
  let stdout = '', stderr = '';

  const proc = spawn(cmd, [tmpFile, JSON.stringify(inputParams)], { timeout: SCRAPER_TIMEOUT });
  proc.stdout.on('data', d => { stdout += d.toString(); });
  proc.stderr.on('data', d => { stderr += d.toString(); });
  proc.on('close', code => {
    const duration = Date.now() - startTime;
    try { fs.unlinkSync(tmpFile); } catch {}
    if (code !== 0) return callback(new Error(stderr || `Exit code ${code}`), null, duration);
    try { callback(null, JSON.parse(stdout.trim()), duration); }
    catch { callback(new Error(`Invalid JSON output: ${stdout.slice(0, 200)}`), null, duration); }
  });
  proc.on('error', err => {
    const duration = Date.now() - startTime;
    try { fs.unlinkSync(tmpFile); } catch {}
    callback(new Error(`Process error: ${err.message}`), null, duration);
  });
}

module.exports = router;
