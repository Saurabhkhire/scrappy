---
name: Scrappy Project Overview
description: Web scraper marketplace app - full stack with React + Express + SQLite
type: project
---

Scrappy is a web scraper marketplace. Full stack app built from scratch.

**Stack:** Express.js (Node 24) + better-sqlite3 v12+ + React 18 + Vite + Tailwind CSS

**Key note:** Node v24 requires `better-sqlite3@^12.0.0` (not v9). Standard better-sqlite3 v9 fails to compile on Node 24.

**How to apply:** Always use `better-sqlite3@^12.0.0` for this project. Use `npm run dev` from root to start everything.

**Credentials:**
- Admin: admin@scrappy.io / admin123
- Users start with 100 credits

**Architecture:**
- `server/` - Express API on port 3001
- `client/` - Vite+React on port 5173
- DB: SQLite at `server/scrappy.db`
- Scraper execution: spawn child_process (python/node), JSON stdout contract
- Public API endpoint: POST /api/endpoint/:apiKey

**One command:** `npm run dev` (from project root, uses concurrently)
**First-time setup:** `node setup.js`
