// GrowTogether — waitlist backend (zero-dependency Node, stdlib only)
// Stores signups in a JSON file, dedupes by email, tracks referral invites.
// Optional: mirrors every signup to Telegram when TG_BOT_TOKEN + TG_CHAT_ID are set.
// Upgrade path: swap the file store for Postgres (DATABASE_URL) when volume demands it.
//
// Data-safety rules (added 2026-11-17, findings C1/C2/C3/M37):
//  - Request handling never crashes the process: malformed input gets a 400,
//    unexpected handler errors get a 500, the server stays up.
//  - A data file that exists but cannot be parsed is NEVER silently dropped:
//    it is preserved as signups.corrupt-<timestamp>.json next to the original
//    and a loud warning is logged before starting from an empty list.
//  - Saves are atomic: write to a temp file in the same directory, fsync,
//    then rename over the target.
//  - Before every save, if the data file changed on disk since we last
//    read/wrote it (e.g. a backup was restored while we run), it is reloaded
//    and merged — dedupe by email, in-memory state wins on conflicts — so an
//    external restore is never silently overwritten.
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

// ---------- storage ----------

// Preserve a data file that exists but is unusable, instead of overwriting it.
function preserveCorruptFile(reason) {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const dest = path.join(path.dirname(DATA_FILE), 'signups.corrupt-' + stamp + '.json');
  try {
    fs.renameSync(DATA_FILE, dest);
    console.error('*** WARNING: data file was corrupt (' + reason + '). Preserved as ' + dest + ' — starting from an empty list. Recover records from that file if needed. ***');
    return dest;
  } catch (e1) {
    try {
      fs.copyFileSync(DATA_FILE, dest);
      console.error('*** WARNING: data file was corrupt (' + reason + '). Could not rename it (' + e1.message + '); copied to ' + dest + ' instead — starting from an empty list. ***');
      return dest;
    } catch (e2) {
      console.error('*** ERROR: data file was corrupt (' + reason + ') and could NOT be preserved (' + e2.message + '). Starting from an empty list; the next save will overwrite the corrupt file. ***');
      return null;
    }
  }
}

// Parse raw file text into a records array. Returns null (after preserving
// the file) when the content cannot be used.
function parseRecords(rawText, source) {
  let parsed;
  try { parsed = JSON.parse(rawText); }
  catch (e) { preserveCorruptFile(source + ': invalid JSON: ' + e.message); return null; }
  if (!Array.isArray(parsed)) { preserveCorruptFile(source + ': JSON is not an array'); return null; }
  return parsed;
}

function diskMtimeMs() {
  try { return fs.statSync(DATA_FILE).mtimeMs; } catch (_) { return 0; }
}

let records = [];
let lastKnownMtimeMs = 0;
(function loadInitial() {
  let rawText;
  try { rawText = fs.readFileSync(DATA_FILE, 'utf8'); }
  catch (_) { records = []; lastKnownMtimeMs = 0; return; } // no file yet — fine
  const parsed = parseRecords(rawText, 'at boot');
  records = parsed || [];
  lastKnownMtimeMs = diskMtimeMs(); // 0 if the corrupt file was renamed away
})();

// If the data file changed on disk since we last read/wrote it, reload it and
// merge: disk-only records are kept, in-memory records win on email conflicts.
function reloadAndMerge() {
  const m = diskMtimeMs();
  if (m === 0 || m === lastKnownMtimeMs) return;
  let rawText;
  try { rawText = fs.readFileSync(DATA_FILE, 'utf8'); }
  catch (_) { return; }
  const disk = parseRecords(rawText, 'during reload');
  if (!disk) { lastKnownMtimeMs = diskMtimeMs(); return; }
  const byEmail = new Map();
  for (const r of disk) { if (r && typeof r.email === 'string') byEmail.set(r.email, r); }
  for (const r of records) { byEmail.set(r.email, r); } // in-memory wins
  records = Array.from(byEmail.values());
  records.forEach((r, i) => { r.position = i + 1; });
  lastKnownMtimeMs = m;
  console.log('data file changed on disk — reloaded and merged (' + records.length + ' records)');
}

function save() {
  reloadAndMerge();
  const tmp = DATA_FILE + '.tmp';
  const fd = fs.openSync(tmp, 'w');
  try { fs.writeSync(fd, JSON.stringify(records, null, 1)); fs.fsyncSync(fd); }
  finally { fs.closeSync(fd); }
  fs.renameSync(tmp, DATA_FILE);
  // Best effort: make the rename itself durable.
  try { const dfd = fs.openSync(path.dirname(DATA_FILE), 'r'); try { fs.fsyncSync(dfd); } finally { fs.closeSync(dfd); } } catch (_) {}
  lastKnownMtimeMs = diskMtimeMs();
}

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

// Last-resort net: log loudly instead of dying. All state changes are
// synchronous and saves are atomic, so staying up is the safer failure mode.
process.on('uncaughtException', (err) => { console.error('*** uncaughtException (server kept alive):', err); });

const server = http.createServer((req, res) => {
  req.on('error', () => {});
  res.on('error', () => {});
  try {
    const u = new URL(req.url, 'http://x');
    if (req.method === 'OPTIONS') { send(res, 204, {}); return; }

    if (req.method === 'GET' && u.pathname === '/health') { send(res, 200, { ok: true, service: 'growtogether-waitlist', count: records.length }); return; }
    if (req.method === 'GET' && u.pathname === '/og-image.png') {
      const buf = Buffer.from(require('./og-image-data.js'), 'base64');
      res.writeHead(200, { 'Content-Type': 'image/png', 'Content-Length': buf.length, 'Cache-Control': 'public, max-age=86400' });
      res.end(buf); return;
    }
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
        try {
          let d; try { d = JSON.parse(raw || '{}'); } catch (_) { send(res, 400, { ok: false, error: 'bad_json' }); return; }
          // JSON.parse('null') returns null, and reading .email on it used to
          // crash the whole process. Other primitives (string/number/bool)
          // fall through to the email check below, exactly as before.
          if (d === null) { send(res, 400, { ok: false, error: 'bad_body' }); return; }
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
        } catch (err) {
          console.error('waitlist POST handler error:', err);
          if (!res.headersSent) { try { send(res, 500, { ok: false, error: 'server_error' }); } catch (_) {} }
        }
      });
      return;
    }
    send(res, 404, { ok: false, error: 'not_found' });
  } catch (err) {
    console.error('request handler error:', err);
    if (!res.headersSent) { try { send(res, 500, { ok: false, error: 'server_error' }); } catch (_) {} }
  }
});
server.listen(PORT, () => console.log('growtogether-waitlist listening on ' + PORT + ' (' + records.length + ' signups loaded)'));
