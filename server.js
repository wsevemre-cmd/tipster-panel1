// server.js — Tipster Panel · License API + Static Server
const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// ── DB kurulumu ────────────────────────────────────────────────
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data', 'licenses.db');

// data/ klasörü yoksa oluştur
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(DB_PATH);

// Tablo oluştur (yoksa)
db.exec(`
  CREATE TABLE IF NOT EXISTS license_usage (
    code         TEXT PRIMARY KEY,
    pass_hash    TEXT NOT NULL,
    label        TEXT,
    type         TEXT,
    activated_at TEXT NOT NULL
  );
`);

// ── Middleware ─────────────────────────────────────────────────
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ── API: Lisans kullanıldı mı? ─────────────────────────────────
// POST /api/license-check   { code }
// → { used: false } veya { used: true, label, type, activatedAt }
app.post('/api/license-check', (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: 'missing_code' });

    const row = db.prepare('SELECT label, type, activated_at FROM license_usage WHERE code = ?').get(code);

    if (row) {
      return res.json({ used: true, label: row.label, type: row.type, activatedAt: row.activated_at });
    }
    return res.json({ used: false });
  } catch (err) {
    console.error('[license-check]', err.message);
    res.status(500).json({ error: 'server_error' });
  }
});

// ── API: İlk aktivasyon ────────────────────────────────────────
// POST /api/license-activate  { code, passHash, label, type }
// → { ok: true } veya { error: 'already_used' }
app.post('/api/license-activate', (req, res) => {
  try {
    const { code, passHash, label, type } = req.body;
    if (!code || !passHash) return res.status(400).json({ error: 'missing_fields' });

    const today = new Date().toISOString().slice(0, 10);

    // Atomik INSERT — eğer code zaten varsa UNIQUE constraint fırlatır
    try {
      db.prepare(
        'INSERT INTO license_usage (code, pass_hash, label, type, activated_at) VALUES (?, ?, ?, ?, ?)'
      ).run(code, passHash, label || '', type || '', today);
    } catch (e) {
      if (e.message.includes('UNIQUE constraint failed')) {
        return res.status(409).json({ error: 'already_used' });
      }
      throw e;
    }

    return res.json({ ok: true });
  } catch (err) {
    console.error('[license-activate]', err.message);
    res.status(500).json({ error: 'server_error' });
  }
});

// ── API: Şifre ile giriş doğrulama ────────────────────────────
// POST /api/license-login  { code, passHash }
// → { ok: true, label, type } veya { error: 'wrong_password' | 'not_found' }
app.post('/api/license-login', (req, res) => {
  try {
    const { code, passHash } = req.body;
    if (!code || !passHash) return res.status(400).json({ error: 'missing_fields' });

    const row = db.prepare('SELECT pass_hash, label, type, activated_at FROM license_usage WHERE code = ?').get(code);

    if (!row) return res.status(404).json({ error: 'not_found' });
    if (row.pass_hash !== passHash) return res.status(401).json({ error: 'wrong_password' });

    return res.json({ ok: true, label: row.label, type: row.type, activatedAt: row.activated_at });
  } catch (err) {
    console.error('[license-login]', err.message);
    res.status(500).json({ error: 'server_error' });
  }
});

// ── API: Şifre sıfırlama ───────────────────────────────────────
// POST /api/license-reset  { code, passHash }
// → { ok: true } veya { error: 'not_found' }
app.post('/api/license-reset', (req, res) => {
  try {
    const { code, passHash } = req.body;
    if (!code || !passHash) return res.status(400).json({ error: 'missing_fields' });

    const row = db.prepare('SELECT code FROM license_usage WHERE code = ?').get(code);
    if (!row) return res.status(404).json({ error: 'not_found' });

    db.prepare('UPDATE license_usage SET pass_hash = ? WHERE code = ?').run(passHash, code);

    return res.json({ ok: true });
  } catch (err) {
    console.error('[license-reset]', err.message);
    res.status(500).json({ error: 'server_error' });
  }
});

// ── SPA fallback ───────────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── Başlat ────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✓ Tipster Panel çalışıyor → http://localhost:${PORT}`);
});
