#!/usr/bin/env node
/**
 * upload_scraper.js
 * =================
 * Logs in and uploads a scraper file to the Scrappy API.
 * Run this to register the apartments_com.py scraper (or any other .py / .js scraper).
 *
 * Usage:
 *   node scripts/upload_scraper.js
 *
 * Env vars (or edit defaults below):
 *   API_BASE   — e.g. http://localhost:3001   (default)
 *   ADMIN_EMAIL
 *   ADMIN_PASSWORD
 */

const fs   = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

const API_BASE = (process.env.API_BASE || 'http://localhost:3001').replace(/\/$/, '');
const EMAIL    = process.env.ADMIN_EMAIL    || 'admin@scrappy.io';
const PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

// ── scrapers to upload ────────────────────────────────────────────────────────
// Add more entries here to upload multiple scrapers at once.

const SCRAPERS_TO_UPLOAD = [
  {
    name: 'Apartments.com Scraper',
    description: 'Scrapes apartment listings from apartments.com. Returns price, beds, baths, sqft, amenities, address, and phone for each listing.',
    language: 'python',
    file: path.join(__dirname, '../scrapers/apartments_com.py'),
    parameters: [
      { name: 'location',    type: 'string',  required: true,  description: 'City/state or zip code, e.g. "Austin, TX" or "78701"' },
      { name: 'max_results', type: 'number',  required: false, description: 'Max listings to return (default: 20)' },
      { name: 'min_price',   type: 'number',  required: false, description: 'Minimum monthly rent filter' },
      { name: 'max_price',   type: 'number',  required: false, description: 'Maximum monthly rent filter' },
      { name: 'beds',        type: 'string',  required: false, description: 'Bedroom filter: "1", "2", "3", or "4+"' },
    ],
    pricing_type: 'free',
    price: 0,
    is_public: true,
    tags: ['real-estate', 'apartments', 'housing', 'rental'],
  },
];

// ── http helper ───────────────────────────────────────────────────────────────

function request(method, urlStr, body, token) {
  return new Promise((resolve, reject) => {
    const url  = new URL(urlStr);
    const lib  = url.protocol === 'https:' ? https : http;
    const data = body ? JSON.stringify(body) : null;

    const options = {
      hostname: url.hostname,
      port:     url.port || (url.protocol === 'https:' ? 443 : 80),
      path:     url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(data         ? { 'Content-Length': Buffer.byteLength(data) } : {}),
        ...(token        ? { 'Authorization': `Bearer ${token}` }       : {}),
      },
    };

    const req = lib.request(options, (res) => {
      let raw = '';
      res.on('data', d => raw += d);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(raw) }); }
        catch { resolve({ status: res.statusCode, body: raw }); }
      });
    });

    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

// ── main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🕷️  Scrappy — Upload Scraper');
  console.log('='.repeat(40));
  console.log(`  API: ${API_BASE}`);
  console.log(`  User: ${EMAIL}\n`);

  // 1. Login
  const login = await request('POST', `${API_BASE}/api/auth/login`, { email: EMAIL, password: PASSWORD });
  if (login.status !== 200 || !login.body.token) {
    console.error('❌ Login failed:', login.body?.error || login.body);
    process.exit(1);
  }
  const token = login.body.token;
  console.log(`  ✓ Logged in as ${login.body.user?.username || EMAIL}`);

  // 2. Upload each scraper
  for (const spec of SCRAPERS_TO_UPLOAD) {
    console.log(`\n  → Uploading: ${spec.name}`);

    if (!fs.existsSync(spec.file)) {
      console.error(`    ❌ File not found: ${spec.file}`);
      continue;
    }

    const file_content = fs.readFileSync(spec.file, 'utf8');

    const res = await request('POST', `${API_BASE}/api/scrapers`, {
      name:         spec.name,
      description:  spec.description,
      language:     spec.language,
      file_content,
      parameters:   spec.parameters,
      pricing_type: spec.pricing_type,
      price:        spec.price,
      is_public:    spec.is_public,
      tags:         spec.tags,
    }, token);

    if (res.status === 201) {
      const s = res.body;
      console.log(`    ✅ Created!`);
      console.log(`       ID:      ${s.id}`);
      console.log(`       API Key: ${s.api_key}`);
      console.log(`       Endpoint: ${API_BASE}/api/endpoint/${s.api_key}`);
      console.log('');
      console.log('    Usage example (Python):');
      console.log(`       import requests`);
      console.log(`       resp = requests.post('${API_BASE}/api/endpoint/${s.api_key}',`);
      console.log(`           json={"location": "Austin, TX", "max_results": 10})`);
      console.log(`       data = resp.json()['data']`);
    } else {
      console.error(`    ❌ Failed (${res.status}):`, res.body?.error || res.body);
    }
  }

  console.log('\n✅ Done.\n');
}

main().catch(err => {
  console.error('\n❌ Unexpected error:', err.message);
  process.exit(1);
});
