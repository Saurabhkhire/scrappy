const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const { getPool } = require('../db/database');
const { authMiddleware } = require('../middleware/auth');

router.get('/plans', (req, res) => {
  res.json([
    { id: 'starter',    name: 'Starter',    credits: 500,   price_usd: 4.99,   badge: null },
    { id: 'pro',        name: 'Pro',        credits: 1500,  price_usd: 12.99,  badge: 'Popular' },
    { id: 'business',   name: 'Business',   credits: 5000,  price_usd: 39.99,  badge: 'Best Value' },
    { id: 'enterprise', name: 'Enterprise', credits: 20000, price_usd: 149.99, badge: null },
  ]);
});

router.post('/purchase', authMiddleware, async (req, res) => {
  const plans = { starter: 500, pro: 1500, business: 5000, enterprise: 20000 };
  const prices = { starter: 4.99, pro: 12.99, business: 39.99, enterprise: 149.99 };
  const { plan_id } = req.body;
  if (!plans[plan_id]) return res.status(400).json({ error: 'Invalid plan' });

  const db = getPool();
  const credits = plans[plan_id];
  await db.query('UPDATE users SET credits = credits + $1 WHERE id = $2', [credits, req.user.id]);
  await db.query(
    "INSERT INTO transactions (id,user_id,amount,type,description) VALUES ($1,$2,$3,'credit',$4)",
    [uuidv4(), req.user.id, credits, `Purchased ${credits} credits ($${prices[plan_id]})`]
  );
  const { rows } = await db.query('SELECT id, username, email, credits FROM users WHERE id=$1', [req.user.id]);
  res.json({ success: true, credits_added: credits, new_balance: parseFloat(rows[0].credits), demo_mode: true });
});

router.get('/methods', authMiddleware, async (req, res) => {
  const { rows } = await getPool().query(
    'SELECT * FROM payment_methods WHERE user_id = $1', [req.user.id]
  );
  res.json(rows);
});

router.post('/methods', authMiddleware, async (req, res) => {
  const { card_number, expiry, cvc, card_holder } = req.body;
  if (!card_number || !expiry || !cvc) return res.status(400).json({ error: 'Card details required' });

  const last_four = card_number.replace(/\s/g, '').slice(-4);
  const brand = card_number.replace(/\s/g, '').startsWith('4') ? 'Visa'
    : card_number.replace(/\s/g, '').startsWith('5') ? 'Mastercard'
    : card_number.replace(/\s/g, '').startsWith('3') ? 'Amex' : 'Unknown';

  const db = getPool();
  const { rows: existing } = await db.query('SELECT id FROM payment_methods WHERE user_id=$1', [req.user.id]);
  const id = uuidv4();
  const isDefault = existing.length === 0 ? 1 : 0;
  await db.query(
    'INSERT INTO payment_methods (id,user_id,type,last_four,brand,is_default) VALUES ($1,$2,$3,$4,$5,$6)',
    [id, req.user.id, 'card', last_four, brand, isDefault]
  );
  res.json({ id, last_four, brand, is_default: isDefault });
});

module.exports = router;
