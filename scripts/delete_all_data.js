#!/usr/bin/env node
/**
 * delete_all_data.js
 * ==================
 * Wipes all user-created content from the Scrappy database.
 *
 * What gets deleted:
 *   - All scrapers (including the Hello World sample)
 *   - All scraper run history
 *   - All transactions
 *   - All purchases
 *   - All payment methods
 *   - All non-admin users  (admin account is preserved)
 *
 * Usage:
 *   node scripts/delete_all_data.js              -- deletes everything above
 *   node scripts/delete_all_data.js --users-too  -- also deletes the admin account
 *   node scripts/delete_all_data.js --scrapers-only  -- only deletes scrapers + runs
 *
 * Run from the project root:
 *   node scripts/delete_all_data.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../server/.env') });
const path = require('path');

// ── bootstrap the same DB layer the server uses ───────────────────────────────
const IS_POSTGRES = !!process.env.DATABASE_URL;

function getDb() {
  if (IS_POSTGRES) {
    const { Pool } = require('pg');
    const useSSL = process.env.DATABASE_URL.includes('neon.tech') ||
      process.env.DATABASE_URL.includes('supabase') ||
      process.env.NODE_ENV === 'production';
    return new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: useSSL ? { rejectUnauthorized: false } : false,
    });
  }

  // SQLite adapter (mirrors server/db/database.js)
  const Database = require('better-sqlite3');
  const dbPath = process.env.DB_PATH
    ? path.resolve(__dirname, '../server', process.env.DB_PATH)
    : path.join(__dirname, '../server/scrappy.db');

  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  const pgToSQLite = (sql) =>
    sql
      .replace(/\$\d+/g, '?')
      .replace(/\bNOW\(\)/gi, 'CURRENT_TIMESTAMP')
      .replace(/\bILIKE\b/gi, 'LIKE');

  return {
    query: async (sql, params = []) => {
      if (/^\s*(CREATE|DROP|ALTER)/i.test(sql.trim())) {
        db.exec(sql);
        return { rows: [] };
      }
      const translated = pgToSQLite(sql);
      if (/^\s*(SELECT|WITH)/i.test(sql.trim())) {
        return { rows: db.prepare(translated).all(params) };
      }
      const info = db.prepare(translated).run(params);
      return { rows: [], rowCount: info.changes };
    },
    end: () => db.close(),
  };
}

// ── helpers ───────────────────────────────────────────────────────────────────

async function countTable(db, table) {
  const { rows } = await db.query(`SELECT COUNT(*) AS n FROM ${table}`);
  return parseInt(rows[0]?.n ?? rows[0]?.count ?? 0);
}

async function deleteRows(db, table, where = '', params = []) {
  const sql = `DELETE FROM ${table}${where ? ' WHERE ' + where : ''}`;
  await db.query(sql, params);
  const n = await countTable(db, table);
  return n;
}

function arg(name) {
  return process.argv.includes(name);
}

// ── main ──────────────────────────────────────────────────────────────────────

async function main() {
  const scrapersOnly = arg('--scrapers-only');
  const usersToo     = arg('--users-too');

  const db = getDb();

  console.log('\n🗑️  Scrappy — Delete All Data');
  console.log('='.repeat(40));
  console.log(`  Database: ${IS_POSTGRES ? 'PostgreSQL' : 'SQLite (scrappy.db)'}`);
  if (scrapersOnly) console.log('  Mode: scrapers + runs only');
  else if (usersToo) console.log('  Mode: EVERYTHING including admin user');
  else console.log('  Mode: all data, admin account preserved');
  console.log('');

  // Always delete runs first (foreign key safety)
  const runsBefore = await countTable(db, 'scraper_runs');
  await db.query('DELETE FROM scraper_runs');
  console.log(`  ✓ scraper_runs   — deleted ${runsBefore} rows`);

  // Delete scrapers
  const scrapersBefore = await countTable(db, 'scrapers');
  await db.query('DELETE FROM scrapers');
  console.log(`  ✓ scrapers       — deleted ${scrapersBefore} rows`);

  if (!scrapersOnly) {
    const purchasesBefore = await countTable(db, 'purchases');
    await db.query('DELETE FROM purchases');
    console.log(`  ✓ purchases      — deleted ${purchasesBefore} rows`);

    const txBefore = await countTable(db, 'transactions');
    await db.query('DELETE FROM transactions');
    console.log(`  ✓ transactions   — deleted ${txBefore} rows`);

    const pmBefore = await countTable(db, 'payment_methods');
    await db.query('DELETE FROM payment_methods');
    console.log(`  ✓ payment_methods— deleted ${pmBefore} rows`);

    if (usersToo) {
      const usersBefore = await countTable(db, 'users');
      await db.query('DELETE FROM users');
      console.log(`  ✓ users          — deleted ${usersBefore} rows (INCLUDING admin)`);
    } else {
      // Keep admin, delete everyone else
      const adminEmail = process.env.ADMIN_EMAIL || 'admin@scrappy.io';
      const usersBefore = await countTable(db, 'users');
      await db.query(
        `DELETE FROM users WHERE email != $1`,
        [adminEmail]
      );
      const usersAfter = await countTable(db, 'users');
      console.log(`  ✓ users          — deleted ${usersBefore - usersAfter} rows (admin kept)`);
    }
  }

  if (db.end) db.end();

  console.log('\n✅ Done.\n');
}

main().catch(err => {
  console.error('\n❌ Error:', err.message);
  process.exit(1);
});
