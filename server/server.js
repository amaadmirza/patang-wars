#!/usr/bin/env node
/* Bo Kata! server - no dependencies, plain Node (18+).
 *
 *   npm run build && npm start            serves dist/public on HOST:PORT (default 0.0.0.0:8080)
 *   npm run dev                           serves client/ straight from source (no build; test hook on)
 *
 * Settings (environment variables):
 *   HOST=0.0.0.0  PORT=8080               where to listen
 *   SECRET=...                            signs player cookies; if unset one is generated once into data/secret.key
 *   TRUST_PROXY=1                         only behind nginx/Caddy/Cloudflare: take the client IP from X-Forwarded-For
 *   DATA_DIR=...                          where player records live (default: a PatangWars-data folder in your home
 *                                         folder, OUTSIDE the game folder, so unpacking a new version never loses
 *                                         coins and purchases; records found in an older copy's data/ are imported)
 *
 * Load is kept low on purpose: the game runs in the players' browsers; the server sends pre-compressed files that
 * browsers cache, and answers a couple of tiny JSON calls per match.
 */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path'), crypto = require('crypto'), os = require('os'), vm = require('vm');
const { Store } = require('./store');
const { Matches } = require('./anticheat');
const ECON = require('../client/src/economy.js');
const WS = require('./ws');
const { Rooms } = require('./rooms');

const DEV = process.argv.includes('--dev');
const ROOT = path.join(__dirname, '..');
/* v6.3: player records (coins, bought kites, trophies) and the cookie key used to live in ./data INSIDE the game folder.
 * Every new version arrives as a new zip, so unpacking it into a fresh folder started everyone from zero - "all my kites
 * are gone after a restart". They now live in one place outside the game folder, and the first start of a new version
 * imports the newest records it can find in an older copy (this folder's data/, or a sibling release folder's). */
function defaultDataDir() {
  const home = path.join(os.homedir() || ROOT, 'PatangWars-data');
  try { fs.mkdirSync(home, { recursive: true, mode: 0o700 }); fs.accessSync(home, fs.constants.W_OK); } catch (e) { return path.join(ROOT, 'data'); }
  return home;
}
function importOldRecords(dir) {
  if (fs.existsSync(path.join(dir, 'profiles.json'))) return;
  const cands = [path.join(ROOT, 'data')];
  for (const up of [path.join(ROOT, '..'), path.join(ROOT, '..', '..')]) {
    let list = []; try { list = fs.readdirSync(up, { withFileTypes: true }); } catch (e) {}
    for (const d of list.slice(0, 200)) if (d.isDirectory()) cands.push(path.join(up, d.name, 'data'), path.join(up, d.name, 'kite-fight', 'data'));
  }
  let best = null;
  for (const c of new Set(cands)) { if (path.resolve(c) === path.resolve(dir)) continue; try { const st = fs.statSync(path.join(c, 'profiles.json')); if (!best || st.mtimeMs > best.t) best = { c, t: st.mtimeMs }; } catch (e) {} }
  if (!best) return;
  try {
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
    fs.copyFileSync(path.join(best.c, 'profiles.json'), path.join(dir, 'profiles.json'));
    // the cookie key too, or every player's cookie stops matching their record
    if (!process.env.SECRET && fs.existsSync(path.join(best.c, 'secret.key')) && !fs.existsSync(path.join(dir, 'secret.key'))) fs.copyFileSync(path.join(best.c, 'secret.key'), path.join(dir, 'secret.key'));
    console.log('imported player records from ' + best.c);
  } catch (e) { console.error('could not import old records from ' + best.c + ': ' + e.message); }
}
const CFG = {
  host: process.env.HOST || '0.0.0.0',
  port: +process.env.PORT || 8080,
  trustProxy: process.env.TRUST_PROXY === '1',
  dataDir: process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : defaultDataDir(),
  publicDir: path.resolve(DEV ? path.join(ROOT, 'client') : path.join(ROOT, 'dist', 'public'))
};
if (!fs.existsSync(path.join(CFG.publicDir, 'index.html'))) {
  console.error(DEV ? 'client/index.html not found' : 'dist/public is missing - run:  npm run build');
  process.exit(1);
}

importOldRecords(CFG.dataDir);

/* ---------------- secret for signing cookies ---------------- */
function loadSecret() {
  if (process.env.SECRET && process.env.SECRET.length >= 32) return process.env.SECRET;
  const f = path.join(CFG.dataDir, 'secret.key');
  fs.mkdirSync(CFG.dataDir, { recursive: true, mode: 0o700 });
  try { const s = fs.readFileSync(f, 'utf8').trim(); if (s.length >= 32) return s; } catch (e) {}
  const s = crypto.randomBytes(48).toString('base64url');
  fs.writeFileSync(f, s, { mode: 0o600 });
  return s;
}
const SECRET = loadSecret();
const sign = v => crypto.createHmac('sha256', SECRET).update(v).digest('base64url').slice(0, 32);
const safeEq = (a, b) => a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));

const store = new Store(CFG.dataDir);
// the kites that exist (the shop can't sell an id that isn't in the catalog - e.g. a picture that was taken out)
const KNOWN_KITES = (() => { try { const c = { window: {} }; vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'client', 'src', 'catalog.js'), 'utf8'), c, { timeout: 2000 }); const ids = (c.window.KITE_CATALOG || []).map(e => e.id); return ids.length ? new Set(ids) : null; } catch (e) { return null; } })();
const matches = new Matches();

/* ---------------- security headers ---------------- */
const CSP = [
  "default-src 'self'",
  "script-src 'self'",                       // no inline or injected scripts
  "style-src 'self' 'unsafe-inline'",        // the game sets colours/positions with style attributes
  "img-src 'self' data: blob:",              // kite pictures, drawn SVG reels (data:), painted kites (blob:)
  "media-src 'self' blob:",                  // songs from the host's assets/music folder, and players' own songs (blob:)
  "font-src 'self'",
  "connect-src 'self' {WS}",                 // its own API and its own WebSocket only
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-ancestors 'none'"
].join('; ');
// the game's own WebSocket address (some browsers don't count ws:// as 'self')
function wsSource(req) {
  const host = String(req.headers.host || '');
  if (!/^[A-Za-z0-9.-]+(:\d{1,5})?$|^\[[0-9a-fA-F:]+\](:\d{1,5})?$/.test(host)) return '';
  return (isHttps(req) ? 'wss://' : 'ws://') + host;
}
function baseHeaders(req, extra) {
  const h = {
    'Content-Security-Policy': CSP.replace('{WS}', wsSource(req)),
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Resource-Policy': 'same-origin',
    ...extra
  };
  if (isHttps(req)) h['Strict-Transport-Security'] = 'max-age=31536000';
  return h;
}
const isHttps = req => req.socket.encrypted || (CFG.trustProxy && req.headers['x-forwarded-proto'] === 'https');
function ipOf(req) {
  if (CFG.trustProxy) { const f = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim(); if (f) return f.slice(0, 64); }
  return req.socket.remoteAddress || '?';
}

/* ---------------- rate limits: token buckets per IP ---------------- */
function limiter(perSec, burst) {
  const m = new Map();
  setInterval(() => { const now = Date.now(); for (const [k, b] of m) if (now - b.t > 60000) m.delete(k); }, 30000).unref();
  return ip => {
    const now = Date.now(), b = m.get(ip) || { n: burst, t: now };
    b.n = Math.min(burst, b.n + (now - b.t) / 1000 * perSec); b.t = now; m.set(ip, b);
    if (b.n < 1) return false;
    b.n -= 1; return true;
  };
}
const staticLimit = limiter(60, 400);   // a first visit loads a few hundred kite pictures
const apiLimit = limiter(2, +process.env.API_BURST || 40);   // ~2 calls per match is normal play; 40 lets a full room share one router

/* ---------------- static files ---------------- */
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.gif': 'image/gif', '.ico': 'image/x-icon', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.oga': 'audio/ogg', '.opus': 'audio/ogg', '.m4a': 'audio/mp4', '.aac': 'audio/aac', '.wav': 'audio/wav', '.flac': 'audio/flac', '.webm': 'audio/webm',
  '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8', '.webmanifest': 'application/manifest+json'
};
const COMPRESSIBLE = new Set(['.html', '.js', '.css', '.json', '.svg', '.txt', '.webmanifest']);
// small files are kept in memory: almost every request is answered without touching the disk
const cache = new Map(); let cacheBytes = 0; const CACHE_MAX = 64 * 1024 * 1024, CACHE_FILE_MAX = 512 * 1024;
function readCached(file, st) {
  const c = cache.get(file);
  if (c && c.mtime === st.mtimeMs && c.size === st.size) return c.buf;
  if (st.size > CACHE_FILE_MAX) return null;
  const buf = fs.readFileSync(file);
  if (cacheBytes + buf.length > CACHE_MAX) { cache.clear(); cacheBytes = 0; }
  cache.set(file, { buf, mtime: st.mtimeMs, size: st.size }); cacheBytes += buf.length;
  return buf;
}
function resolveSafe(urlPath) {
  let p;
  try { p = decodeURIComponent(urlPath); } catch (e) { return null; }
  if (p.includes('\0') || p.includes('\\')) return null;
  if (p === '/') p = '/index.html';
  if (p.split('/').some(seg => seg.startsWith('.'))) return null;            // no dotfiles, no ".."
  const file = path.resolve(CFG.publicDir, '.' + path.posix.normalize(p));
  if (!file.startsWith(CFG.publicDir + path.sep)) return null;              // never outside the public folder
  if (!TYPES[path.extname(file).toLowerCase()]) return null;                // only the file types the game uses
  if (!DEV && /\.(br|gz)$/.test(file)) return null;
  return file;
}
function serveStatic(req, res, urlPath) {
  const file = resolveSafe(urlPath);
  if (!file) return send(req, res, 404, 'Not found');
  let st;
  try { st = fs.statSync(file); } catch (e) { return send(req, res, 404, 'Not found'); }
  if (!st.isFile()) return send(req, res, 404, 'Not found');
  const ext = path.extname(file).toLowerCase(), base = path.basename(file);
  const hashed = /\.[0-9a-f]{10}\.(js|css)$/.test(base);
  const cacheControl = hashed ? 'public, max-age=31536000, immutable'
    : ext === '.html' ? 'no-cache'
    : DEV ? 'no-cache' : 'public, max-age=604800';
  // pick a pre-compressed copy made by the build, if the browser accepts it
  let body = file, enc = null;
  if (COMPRESSIBLE.has(ext)) {
    const ae = String(req.headers['accept-encoding'] || '');
    if (/\bbr\b/.test(ae) && fs.existsSync(file + '.br')) { body = file + '.br'; enc = 'br'; }
    else if (/\bgzip\b/.test(ae) && fs.existsSync(file + '.gz')) { body = file + '.gz'; enc = 'gzip'; }
  }
  const bst = body === file ? st : fs.statSync(body);
  const etag = `W/"${bst.size.toString(36)}-${Math.floor(bst.mtimeMs).toString(36)}${enc ? '-' + enc : ''}"`;
  const headers = baseHeaders(req, { 'Content-Type': TYPES[ext], 'Cache-Control': cacheControl, ETag: etag, Vary: 'Accept-Encoding' });
  if (enc) headers['Content-Encoding'] = enc;
  if (req.headers['if-none-match'] === etag) { res.writeHead(304, headers); return res.end(); }
  // audio: answer byte ranges, which Safari needs to play (and every browser uses to seek) a song
  const range = !enc && /^audio\//.test(TYPES[ext]) && /^bytes=(\d*)-(\d*)$/.exec(String(req.headers.range || ''));
  headers['Accept-Ranges'] = /^audio\//.test(TYPES[ext]) ? 'bytes' : 'none';
  if (range && (range[1] || range[2])) {
    let a = range[1] ? +range[1] : bst.size - +range[2], b = range[1] && range[2] ? Math.min(+range[2], bst.size - 1) : bst.size - 1;
    if (a < 0) a = 0;
    if (a > b || a >= bst.size) { res.writeHead(416, { ...headers, 'Content-Range': `bytes */${bst.size}` }); return res.end(); }
    headers['Content-Range'] = `bytes ${a}-${b}/${bst.size}`; headers['Content-Length'] = b - a + 1;
    res.writeHead(206, headers);
    if (req.method === 'HEAD') return res.end();
    return fs.createReadStream(body, { start: a, end: b }).on('error', () => res.destroy()).pipe(res);
  }
  headers['Content-Length'] = bst.size;
  res.writeHead(200, headers);
  if (req.method === 'HEAD') return res.end();
  const buf = readCached(body, bst);
  if (buf) return res.end(buf);
  fs.createReadStream(body).on('error', () => res.destroy()).pipe(res);
}
function send(req, res, code, text, extra) {
  res.writeHead(code, baseHeaders(req, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store', ...extra }));
  res.end(req.method === 'HEAD' ? undefined : text);
}
function json(req, res, code, obj, extra) {
  res.writeHead(code, baseHeaders(req, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...extra }));
  res.end(JSON.stringify(obj));
}

/* ---------------- players: an anonymous id in a signed, HttpOnly cookie ---------------- */
function playerOf(req) {
  const m = /(?:^|;\s*)kf=([a-f0-9]{32})\.([A-Za-z0-9_-]{32})(?:;|$)/.exec(req.headers.cookie || '');
  if (m && safeEq(sign(m[1]), m[2])) return { id: m[1], fresh: false };
  return { id: crypto.randomBytes(16).toString('hex'), fresh: true };
}
// the player's own backup code (a password for their record: whoever has it gets the same coins and kites)
const accountOf = id => ({ pid: id.slice(0, 4).toUpperCase() + '-' + id.slice(4, 8).toUpperCase(), code: `PW-${id}-${sign(id)}` });
const cookieFor = (req, id) => `kf=${id}.${sign(id)}; Path=/; Max-Age=63072000; HttpOnly; SameSite=Strict${isHttps(req) ? '; Secure' : ''}`;

/* ---------------- the API ---------------- */
function sameOrigin(req) {   // the API answers only the game's own pages
  const o = req.headers.origin;
  if (!o) return true;
  try { return new URL(o).host === req.headers.host; } catch (e) { return false; }
}
function readBody(req, max = 8192) {
  return new Promise((ok, fail) => {
    const tooBig = () => Object.assign(new Error('too large'), { code: 413 });
    if (+req.headers['content-length'] > max) { req.resume(); return fail(tooBig()); }   // refuse before reading a byte
    let n = 0, over = false; const parts = [];
    req.on('data', c => { if (over) return; n += c.length; if (n > max) { over = true; fail(tooBig()); } else parts.push(c); });
    req.on('end', () => { try { ok(JSON.parse(Buffer.concat(parts).toString('utf8') || 'null')); } catch (e) { fail(Object.assign(new Error('bad json'), { code: 400 })); } });
    req.on('error', fail);
  });
}
let lbCache = null;   // the weekly leaderboard, worked out at most every 30 s
const eventLimit = new Map();   // per player: one "made a kite" event per 10 s
async function handleApi(req, res, url) {
  if (!apiLimit(ipOf(req))) return json(req, res, 429, { error: 'too many requests' }, { 'Retry-After': '5' });
  if (!sameOrigin(req)) return json(req, res, 403, { error: 'forbidden' });
  const who = playerOf(req), extra = who.fresh ? { 'Set-Cookie': cookieFor(req, who.id) } : {};
  if (req.method === 'GET' && url === '/api/profile') {
    return json(req, res, 200, { profile: store.public(store.touch(who.id)), account: accountOf(who.id) }, extra);
  }
  if (req.method === 'GET' && url === '/api/music') {
    // the host's own Basant songs: any audio files dropped into  client/assets/music/  (copied to dist by the build)
    let files = [];
    try { files = fs.readdirSync(path.join(CFG.publicDir, 'assets', 'music')).filter(f => !f.startsWith('.') && /\.(mp3|m4a|aac|ogg|oga|opus|wav|flac|webm)$/i.test(f)).sort(); } catch (e) {}
    return json(req, res, 200, { songs: files.slice(0, 200).map(f => ({ url: 'assets/music/' + encodeURIComponent(f), name: f.replace(/\.[^.]+$/, '') })) }, extra);
  }
  if (req.method === 'GET' && url === '/api/leaderboard') {
    const now = Date.now();
    if (!lbCache || now - lbCache.at > 30000) lbCache = { at: now, lb: store.leaderboard(now) };
    const lb = lbCache.lb, mine = list => { const r = list.find(x => x.id === who.id); return r ? r.rank : null; };
    const pub = list => list.slice(0, 10).map(x => ({ rank: x.rank, name: x.name, v: x.v, me: x.id === who.id }));
    const p = store.get(who.id), w = p && p.econ ? ECON.view(p.econ, now).weekly : null;
    return json(req, res, 200, { week: lb.wk, endsIn: ECON.weekEndsIn(now), cuts: pub(lb.cuts), streak: pub(lb.streak), loot: pub(lb.loot),
      me: { name: p && p.name || null, cuts: w ? w.cuts : 0, streak: w ? w.streak : 0, loot: w ? w.loot : 0, rank: { cuts: mine(lb.cuts), streak: mine(lb.streak), loot: mine(lb.loot) } } }, extra);
  }
  if (req.method !== 'POST') return json(req, res, 405, { error: 'method not allowed' }, { Allow: 'GET, POST' });
  // a cross-site page cannot set this header without the browser asking first, and we never allow that
  if (req.headers['x-kf'] !== '1' || !/^application\/json\b/.test(req.headers['content-type'] || '')) return json(req, res, 400, { error: 'bad request' });
  if (who.fresh && url !== '/api/restore') return json(req, res, 401, { error: 'no player - load the game first' }, extra);
  let body;
  try { body = await readBody(req); } catch (e) { return json(req, res, e.code || 400, { error: e.message }, { Connection: 'close' }); }
  if (url === '/api/match/start') {
    const r = matches.start(who.id, body);
    return r.error ? json(req, res, 400, { error: r.error }) : json(req, res, 200, { token: r.token });
  }
  if (url === '/api/match/end') {
    const r = matches.end(who.id, body);
    if (!r.ok) { console.warn(`[anticheat] refused result from ${ipOf(req)}: ${r.reason}`); return json(req, res, 422, { error: 'result refused', reason: r.reason }); }
    const fresh = store.update(who.id, r.apply);
    const paid = store.updateEcon(who.id, econ => ECON.payMatch(econ, { rec: r.rec, won: r.won, abandoned: r.abandoned, lootIds: r.lootIds, career: r.career }));
    store.flushSoon();
    return json(req, res, 200, { profile: store.public(store.get(who.id)), newTrophies: fresh, won: r.won, paid });
  }
  if (url === '/api/buy') {
    const kind = body && body.kind, id = body && body.id;
    if (!['thread', 'char', 'kite', 'spool'].includes(kind) || typeof id !== 'string' || id.length > 40) return json(req, res, 400, { error: 'bad item' });
    if (kind === 'kite' && /^png:/.test(id) && KNOWN_KITES && !KNOWN_KITES.has(ECON.kiteId(id))) return json(req, res, 400, { error: 'unknown item' });
    const r = store.updateEcon(who.id, econ => ECON.buy(econ, kind, id));
    if (!r.ok) return json(req, res, 409, { error: r.error, profile: store.public(store.get(who.id)) });
    store.flushSoon();   // a purchase is on disk within a moment, not "at the next save" (a crash used to lose it)
    return json(req, res, 200, { ok: true, price: r.price, profile: store.public(store.get(who.id)) });
  }
  if (url === '/api/claim' || url === '/api/crate') {
    // daily login prize, the free gift, and kite crates: the server rolls the dice (crypto randomness) and pays
    const pool = KNOWN_KITES ? [...KNOWN_KITES] : [], rnd = crypto.randomInt(0, 1e9) / 1e9;
    const what = body && (url === '/api/crate' ? body.crate : body.what);
    const r = store.updateEcon(who.id, econ => url === '/api/crate' ? ECON.openCrate(econ, String(what), pool, rnd)
      : what === 'login' ? ECON.claimLogin(econ, pool, rnd) : what === 'gift' ? ECON.claimGift(econ) : { ok: false, error: 'unknown prize' });
    if (!r.ok) return json(req, res, 409, { error: r.error, profile: store.public(store.get(who.id)) });
    store.flushSoon();
    return json(req, res, 200, { ok: true, reward: r.reward, profile: store.public(store.get(who.id)) });
  }
  if (url === '/api/restore') {
    // "Backup your account": the code shown in Settings -> Profile brings the same coins, kites and records to another
    // browser or phone (or back, after the browser's cookies were cleared)
    const m = /^PW-([a-f0-9]{32})-([A-Za-z0-9_-]{32})$/.exec(String(body && body.code || '').trim());
    if (!m || !safeEq(sign(m[1]), m[2]) || !store.get(m[1])) return json(req, res, 400, { error: 'That code is not right - check it and try again.' });
    return json(req, res, 200, { profile: store.public(store.touch(m[1])), account: accountOf(m[1]) }, { 'Set-Cookie': cookieFor(req, m[1]) });
  }
  if (url === '/api/event') {
    if (!body || body.type !== 'made') return json(req, res, 400, { error: 'unknown event' });
    const last = eventLimit.get(who.id) || 0;
    if (Date.now() - last < 10000) return json(req, res, 429, { error: 'too soon' });
    eventLimit.set(who.id, Date.now());
    const fresh = store.update(who.id, s => { s.made = Math.min(s.made + 1, 1000); });
    return json(req, res, 200, { profile: store.public(store.get(who.id)), newTrophies: fresh });
  }
  return json(req, res, 404, { error: 'not found' });
}
setInterval(() => { const now = Date.now(); for (const [k, t] of eventLimit) if (now - t > 60000) eventLimit.delete(k); }, 60000).unref();

/* ---------------- server ---------------- */
const server = http.createServer((req, res) => {
  const url = (req.url || '/').split('?')[0];
  if (url.length > 512) return send(req, res, 414, 'URI too long');
  if (url.startsWith('/api/')) return handleApi(req, res, url).catch(e => { console.error('api error', e); if (!res.headersSent) json(req, res, 500, { error: 'server error' }); });
  if (url === '/healthz') return json(req, res, 200, { ok: true, uptime: Math.round(process.uptime()), online: ws.clients.size, openMatches: matches.size, ...rooms.stats });
  if (req.method !== 'GET' && req.method !== 'HEAD') return send(req, res, 405, 'Method not allowed', { Allow: 'GET, HEAD' });
  if (!staticLimit(ipOf(req))) return send(req, res, 429, 'Too many requests', { 'Retry-After': '5' });
  serveStatic(req, res, url);
});
// slow or oversized clients are cut off instead of holding the server
server.headersTimeout = 15000; server.requestTimeout = 20000; server.keepAliveTimeout = 5000; server.maxHeadersCount = 50;
server.maxConnections = 5000;

/* ---------------- WebSocket: online multiplayer (server/rooms.js) ---------------- */
const ws = WS.attach(server, {
  path: '/ws', ipOf, maxPayload: 4096, msgPerSec: 40, msgBurst: 80, maxPerIp: 12,
  allowOrigin: (origin, req) => { if (!origin) return false; try { return new URL(origin).host === req.headers.host; } catch (e) { return false; } }
});
const rooms = new Rooms({ store, log: console });
ws.on('connection', (sock, req) => {
  const who = playerOf(req);
  sock.player = who.fresh ? null : who.id;   // only players with a valid cookie (they loaded the game) can play online
  rooms.connect(sock);
});

server.on('clientError', (err, socket) => { if (socket.writable) socket.end('HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n'); socket.destroy(); });
server.listen(CFG.port, CFG.host, () => {
  console.log(`Bo Kata! ${DEV ? '(DEV - source files, test hook on)' : ''} on http://${CFG.host}:${CFG.port}`);
  console.log(`  player records: ${CFG.dataDir}`);
  if (CFG.host === '0.0.0.0') {
    const nets = require('os').networkInterfaces();
    for (const list of Object.values(nets)) for (const n of list || []) if (n.family === 'IPv4' && !n.internal) console.log(`  open on this network:  http://${n.address}:${CFG.port}`);
  }
});
function shutdown() { console.log('saving and stopping...'); rooms.close(); ws.close(); store.flush(); server.close(() => process.exit(0)); setTimeout(() => process.exit(0), 3000).unref(); }
process.on('SIGINT', shutdown); process.on('SIGTERM', shutdown);
process.on('exit', () => { try { store.flush(); } catch (e) {} });   // closed any other way (Windows console closed, crash): records still saved
process.on('uncaughtException', e => { console.error('crash:', e); try { store.flush(); } catch (x) {} process.exit(1); });
if (process.platform === 'win32') process.on('SIGHUP', shutdown);
