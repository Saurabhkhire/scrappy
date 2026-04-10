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

router.post('/:apiKey', authMiddleware, async (req, res) => {
  const db = getPool();
  const { rows } = await db.query('SELECT * FROM scrapers WHERE api_key = $1', [req.params.apiKey]);
  const scraper = rows[0];
  if (!scraper) return res.status(404).json({ error: 'Scraper not found' });
  if (!scraper.is_public && scraper.creator_id !== req.user.id && !req.user.is_admin)
    return res.status(403).json({ error: 'Access denied' });

  if (scraper.pricing_type === 'per_run' && scraper.price > 0) {
    if (parseFloat(req.user.credits) < scraper.price)
      return res.status(402).json({ error: 'Insufficient credits' });
  }
  if (scraper.pricing_type === 'one_time' && scraper.creator_id !== req.user.id) {
    const { rows: p } = await db.query(
      'SELECT id FROM purchases WHERE scraper_id=$1 AND user_id=$2', [scraper.id, req.user.id]
    );
    if (!p.length) return res.status(402).json({ error: 'Purchase required', scraper_id: scraper.id });
  }

  const runId = uuidv4();
  const inputParams = req.body || {};
  await db.query(
    'INSERT INTO scraper_runs (id,scraper_id,user_id,input_params,status,via_api) VALUES ($1,$2,$3,$4,$5,1)',
    [runId, scraper.id, req.user?.id || null, JSON.stringify(inputParams), 'running']
  );

  executeScraper(scraper, inputParams, async (err, output, durationMs) => {
    if (err) {
      await db.query(
        'UPDATE scraper_runs SET status=$1, error_message=$2, duration_ms=$3 WHERE id=$4',
        ['error', err.message, durationMs, runId]
      );
      return res.status(500).json({ error: err.message, run_id: runId });
    }

    await db.query(
      'UPDATE scraper_runs SET status=$1, output=$2, duration_ms=$3 WHERE id=$4',
      ['success', JSON.stringify(output), durationMs, runId]
    );

    const cost = getCostForRun(scraper, req.user);
    if (cost > 0 && req.user) {
      await db.query('UPDATE users SET credits = credits - $1 WHERE id = $2', [cost, req.user.id]);
      await db.query(
        "INSERT INTO transactions (id,user_id,amount,type,description,reference_id) VALUES ($1,$2,$3,'debit',$4,$5)",
        [uuidv4(), req.user.id, cost, `API: ${scraper.name}`, runId]
      );
      if (scraper.creator_id !== req.user.id)
        await db.query('UPDATE users SET credits = credits + $1 WHERE id = $2', [cost, scraper.creator_id]);
    }
    await db.query('UPDATE scrapers SET runs_count = runs_count + 1 WHERE id = $1', [scraper.id]);

    res.json({ success: true, run_id: runId, scraper: scraper.name, duration_ms: durationMs, data: output });
  });
});

router.get('/:apiKey', async (req, res) => {
  const { rows } = await getPool().query(
    'SELECT id, name, description, language, parameters, pricing_type, price, creator_name FROM scrapers WHERE api_key = $1',
    [req.params.apiKey]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Endpoint not found' });
  rows[0].parameters = JSON.parse(rows[0].parameters || '[]');
  res.json({ endpoint: rows[0], usage: 'POST to this URL with your parameters as JSON body' });
});

function getCostForRun(scraper, user) {
  if (!user || scraper.creator_id === user.id) return 0;
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
    try { fs.unlinkSync(tmpFile); } catch {}
    callback(new Error(`Process error: ${err.message}`), null, Date.now() - startTime);
  });
}

module.exports = router;
