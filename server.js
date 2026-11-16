// GrowTogether — waitlist backend (zero-dependency Node, stdlib only)
// Stores signups in a JSON file, dedupes by email, tracks referral invites.
// Optional: mirrors every signup to Telegram when TG_BOT_TOKEN + TG_CHAT_ID are set.
// Upgrade path: swap the file store for Postgres (DATABASE_URL) when volume demands it.
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8799;
const DATA_FILE = process.env.DATA_FILE || path.join(__dirname, 'data', 'signups.json');
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '*';
const TG_BOT_TOKEN = process.env.TG_BOT_TOKEN || '';
const TG_CHAT_ID = process.env.TG_CHAT_ID || '';

fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
let records = [];
try { records = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch (_) { records = []; }
if (!Array.isArray(records)) records = [];

function save() { fs.writeFileSync(DATA_FILE, JSON.stringify(records, null, 1)); }
function codeFor(email) { // MUST match the front-end generator in join.html
  let h = 0; const s = String(email).toLowerCase();
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h + s.charCodeAt(i)) | 0; }
  return 'gt-' + Math.abs(h).toString(36);
}
function mirror(rec) {
  if (!TG_BOT_TOKEN || !TG_CHAT_ID) return;
  const text = 'New GrowTogether signup #' + rec.position + '\n' + rec.name + ' — ' + rec.location +
    '\n' + rec.type + (rec.url ? '\n' + rec.url : '') + (rec.ref ? '\nvia ' + rec.ref : '');
  fetch('https://api.telegram.org/bot' + TG_BOT_TOKEN + '/sendMessage', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: TG_CHAT_ID, text })
  }).catch(() => {});
}
function send(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(body);
}

const server = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x');
  if (req.method === 'OPTIONS') { send(res, 204, {}); return; }

  if (req.method === 'GET' && u.pathname === '/health') { send(res, 200, { ok: true, service: 'growtogether-waitlist', count: records.length }); return; }
  if (req.method === 'GET' && u.pathname === '/api/count') { send(res, 200, { ok: true, count: records.length }); return; }

  if (req.method === 'GET' && u.pathname === '/api/export') {
    if (!ADMIN_TOKEN || u.searchParams.get('token') !== ADMIN_TOKEN) { send(res, 404, { ok: false }); return; }
    send(res, 200, { ok: true, count: records.length, records }); return;
  }
  if (req.method === 'DELETE' && u.pathname === '/api/record') {
    if (!ADMIN_TOKEN || u.searchParams.get('token') !== ADMIN_TOKEN) { send(res, 404, { ok: false }); return; }
    const email = (u.searchParams.get('email') || '').toLowerCase();
    const before = records.length;
    records = records.filter(r => r.email !== email);
    records.forEach((r, i) => { r.position = i + 1; });
    save();
    send(res, 200, { ok: true, removed: before - records.length, count: records.length }); return;
  }

  if (req.method === 'POST' && u.pathname === '/api/waitlist') {
    let raw = '';
    req.on('data', c => { raw += c; if (raw.length > 16384) req.destroy(); });
    req.on('end', () => {
      let d; try { d = JSON.parse(raw || '{}'); } catch (_) { send(res, 400, { ok: false, error: 'bad_json' }); return; }
      const email = String(d.email || '').trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { send(res, 400, { ok: false, error: 'bad_email' }); return; }
      const existing = records.find(r => r.email === email);
      if (existing) { send(res, 200, { ok: true, duplicate: true, code: existing.code, position: existing.position, invites: existing.invites || 0 }); return; }
      const rec = {
        email,
        name: String(d.name || '').trim().slice(0, 80),
        location: String(d.location || '').trim().slice(0, 80),
        type: String(d.type || '').trim().slice(0, 60),
        url: String(d.url || '').trim().slice(0, 300),
        ref: String(d.ref || '').trim().slice(0, 40),
        code: codeFor(email),
        position: records.length + 1,
        invites: 0,
        at: new Date().toISOString()
      };
      if (rec.ref) { const inviter = records.find(r => r.code === rec.ref); if (inviter) inviter.invites = (inviter.invites || 0) + 1; }
      records.push(rec); save(); mirror(rec);
      send(res, 201, { ok: true, code: rec.code, position: rec.position });
    });
    return;
  }
  send(res, 404, { ok: false, error: 'not_found' });
});
server.listen(PORT, () => console.log('growtogether-waitlist listening on ' + PORT + ' (' + records.length + ' signups loaded)'));
