const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

// If DATABASE_URL is set → PostgreSQL (Neon / production)
// If not set           → SQLite  (local dev, zero config)
const IS_POSTGRES = !!process.env.DATABASE_URL;

let _client = null;

function getPool() {
  if (_client) return _client;

  if (IS_POSTGRES) {
    const { Pool } = require('pg');
    const useSSL = process.env.DATABASE_URL.includes('neon.tech') ||
      process.env.DATABASE_URL.includes('supabase') ||
      process.env.NODE_ENV === 'production';
    _client = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: useSSL ? { rejectUnauthorized: false } : false,
      max: 10,
    });
  } else {
    _client = makeSQLiteAdapter();
  }

  return _client;
}

// ── SQLite adapter ────────────────────────────────────────────
// Wraps better-sqlite3 to expose the same async query(sql, params)
// interface that pg uses, so all routes work without any changes.
function makeSQLiteAdapter() {
  const Database = require('better-sqlite3');
  const path = require('path');
  const dbPath = process.env.DB_PATH
    ? path.resolve(__dirname, '..', process.env.DB_PATH)
    : path.join(__dirname, '..', 'scrappy.db');

  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  return {
    query: async (sql, params = []) => {
      // DDL (CREATE / DROP / ALTER) — use exec(), supports multi-statement
      if (/^\s*(CREATE|DROP|ALTER)/i.test(sql.trim())) {
        db.exec(sql);
        return { rows: [] };
      }
      const translated = pgToSQLite(sql);
      if (/^\s*(SELECT|WITH)/i.test(sql.trim())) {
        return { rows: db.prepare(translated).all(params) };
      }
      db.prepare(translated).run(params);
      return { rows: [] };
    },
  };
}

// Translate PostgreSQL-style SQL → SQLite-compatible SQL
function pgToSQLite(sql) {
  return sql
    .replace(/\$\d+/g, '?')                              // $1 $2 → ?
    .replace(/\bNOW\(\)/gi, 'CURRENT_TIMESTAMP')          // NOW() → CURRENT_TIMESTAMP
    .replace(/\bCURRENT_DATE\b/g, "date('now')")          // CURRENT_DATE → date('now')
    .replace(/(\w+)::date/gi, 'date($1)')                 // col::date → date(col)
    .replace(/::(int|float|text|numeric|bigint)(\(\d+,\d+\))?/gi, '') // ::int casts
    .replace(/\bILIKE\b/gi, 'LIKE');                      // ILIKE → LIKE (SQLite is case-insensitive for ASCII)
}

// ── Schema ────────────────────────────────────────────────────
// Uses CURRENT_TIMESTAMP (valid in both SQLite and PostgreSQL)
// and standard SQL types that both understand.
async function initSchema(db) {
  await db.query(`
    CREATE TABLE IF NOT EXISTS users (
      id             VARCHAR(36) PRIMARY KEY,
      username       TEXT UNIQUE NOT NULL,
      email          TEXT UNIQUE NOT NULL,
      password_hash  TEXT NOT NULL,
      credits        NUMERIC(14,4) DEFAULT 100.0,
      is_admin       SMALLINT DEFAULT 0,
      email_verified SMALLINT DEFAULT 0,
      avatar         TEXT,
      bio            TEXT,
      created_at     TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS email_verifications (
      id         VARCHAR(36) PRIMARY KEY,
      user_id    VARCHAR(36) NOT NULL,
      token      VARCHAR(64) UNIQUE NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS scrapers (
      id           VARCHAR(36) PRIMARY KEY,
      name         TEXT NOT NULL,
      description  TEXT,
      creator_id   VARCHAR(36) NOT NULL,
      creator_name TEXT NOT NULL,
      language     TEXT NOT NULL,
      file_content TEXT NOT NULL,
      parameters   TEXT NOT NULL DEFAULT '[]',
      pricing_type TEXT NOT NULL DEFAULT 'free',
      price        NUMERIC(14,4) DEFAULT 0,
      api_key      VARCHAR(40) UNIQUE NOT NULL,
      is_public    SMALLINT DEFAULT 1,
      runs_count   INTEGER DEFAULT 0,
      tags         TEXT DEFAULT '[]',
      created_at   TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at   TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS scraper_runs (
      id            VARCHAR(36) PRIMARY KEY,
      scraper_id    VARCHAR(36) NOT NULL,
      user_id       VARCHAR(36),
      input_params  TEXT,
      output        TEXT,
      status        TEXT DEFAULT 'running',
      error_message TEXT,
      duration_ms   INTEGER,
      via_api       SMALLINT DEFAULT 0,
      created_at    TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS purchases (
      id         VARCHAR(36) PRIMARY KEY,
      scraper_id VARCHAR(36) NOT NULL,
      user_id    VARCHAR(36) NOT NULL,
      amount     NUMERIC(14,4) NOT NULL,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id           VARCHAR(36) PRIMARY KEY,
      user_id      VARCHAR(36) NOT NULL,
      amount       NUMERIC(14,4) NOT NULL,
      type         TEXT NOT NULL,
      description  TEXT,
      reference_id VARCHAR(36),
      created_at   TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS payment_methods (
      id         VARCHAR(36) PRIMARY KEY,
      user_id    VARCHAR(36) NOT NULL,
      type       TEXT NOT NULL,
      last_four  TEXT,
      brand      TEXT,
      is_default SMALLINT DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

// Safe migration — adds email_verified column to existing databases
async function migrateSchema(db) {
  try {
    if (IS_POSTGRES) {
      await db.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified SMALLINT DEFAULT 0');
    } else {
      // SQLite: throws if column already exists — safe to ignore
      try { await db.query('ALTER TABLE users ADD COLUMN email_verified SMALLINT DEFAULT 0'); } catch {}
    }
  } catch {}
}

async function seedAdmin(db) {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@scrappy.io';
  const { rows } = await db.query('SELECT id FROM users WHERE email = $1', [adminEmail]);
  if (rows.length === 0) {
    const password = process.env.ADMIN_PASSWORD || 'admin123';
    const hash = await bcrypt.hash(password, 10);
    const id = uuidv4();
    await db.query(
      'INSERT INTO users (id, username, email, password_hash, credits, is_admin, email_verified) VALUES ($1,$2,$3,$4,$5,1,1)',
      [id, process.env.ADMIN_USERNAME || 'admin', adminEmail, hash, 999999]
    );
    console.log(`✓ Admin created: ${adminEmail} / ${password}`);
  }
}

async function initDb() {
  const db = getPool();
  await initSchema(db);
  await migrateSchema(db);
  await seedAdmin(db);
  return db;
}

module.exports = { getPool, initDb };
