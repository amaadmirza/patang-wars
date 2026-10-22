#!/usr/bin/env node
/* Server tests: security headers, file safety, the API's anti-cheat rules, and the WebSocket channel.
 * Starts the real server on a spare port with a throw-away data folder. Run after `npm run build`:  npm test */
'use strict';
const { spawn } = require('child_process'), http = require('http'), net = require('net'), crypto = require('crypto');
const fs = require('fs'), os = require('os'), path = require('path');

const PORT = 18000 + Math.floor(Math.random() * 1000), HOST = '127.0.0.1', BASE = `http://${HOST}:${PORT}`;
const DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'kf-test-'));
let pass = 0, fail = 0;
const ok = (cond, name, extra = '') => { if (cond) { pass++; console.log('  ok   ' + name); } else { fail++; console.log('  FAIL ' + name + (extra ? '  -> ' + extra : '')); } };

function req(method, p, { headers = {}, body, raw } = {}) {
  return new Promise((res, rej) => {
    const r = http.request({ host: HOST, port: PORT, method, path: p, headers }, resp => {
      const parts = []; resp.on('data', c => parts.push(c));
      resp.on('end', () => { const b = Buffer.concat(parts).toString(); let j = null; try { j = JSON.parse(b); } catch (e) {} res({ status: resp.statusCode, headers: resp.headers, body: b, json: j }); });
    });
    r.on('error', rej);
    if (raw) r.end(raw); else if (body !== undefined) r.end(JSON.stringify(body)); else r.end();
  });
}
function rawHttp(text) {   // for paths an http client would clean up first
  return new Promise(res => { const s = net.connect(PORT, HOST, () => s.write(text)); let b = ''; s.on('data', d => b += d); s.on('end', () => res(b)); s.on('error', () => res(b)); setTimeout(() => { s.destroy(); res(b); }, 1500); });
}
const post = (p, body, cookie, more = {}) => req('POST', p, { headers: { 'Content-Type': 'application/json', 'X-KF': '1', Origin: BASE, ...(cookie ? { Cookie: cookie } : {}), ...more }, body });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const good = (token, extra = {}) => ({ token, t: 3, place: 2, players: 3, abandoned: false,
  rec: { cuts: 0, lost: 0, caught: 0, bestStreak: 0, dheelCuts: 0, khainchCuts: 0, cutTimes: [] }, ...extra });
const startBody = (more = {}) => ({ mode: 'festival', bots: 2, diff: 'normal', mtime: '0', scene: 'lahore', kite: 'png:patangN1', ...more });

function wsConnect(origin, onFrame) {
  return new Promise(res => {
    const key = crypto.randomBytes(16).toString('base64'), s = net.connect(PORT, HOST);
    let head = '', up = false, buf = Buffer.alloc(0);
    s.on('connect', () => s.write(`GET /ws HTTP/1.1\r\nHost: ${HOST}:${PORT}\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: ${key}\r\nSec-WebSocket-Version: 13\r\n${origin ? 'Origin: ' + origin + '\r\n' : ''}\r\n`));
    s.on('data', d => {
      if (!up) { head += d.toString('latin1'); const i = head.indexOf('\r\n\r\n'); if (i < 0) return; up = true; res({ s, status: +head.split(' ')[1] }); buf = Buffer.from(head.slice(i + 4), 'latin1'); }
      else buf = Buffer.concat([buf, d]);
      while (buf.length >= 2) { const len = buf[1] & 0x7f; if (len > 125 || buf.length < 2 + len) break; onFrame && onFrame(buf[0] & 0x0f, buf.subarray(2, 2 + len).toString()); buf = buf.subarray(2 + len); }
    });
    s.on('error', () => res({ s, status: 0 }));
  });
}
function wsSend(s, obj, { mask = true, op = 1, payload } = {}) {
  const data = payload || Buffer.from(JSON.stringify(obj)), m = crypto.randomBytes(4), n = data.length;
  const head = n < 126 ? Buffer.from([0x80 | op, (mask ? 0x80 : 0) | n]) : Buffer.from([0x80 | op, (mask ? 0x80 : 0) | 126, n >> 8, n & 255]);
  const body = Buffer.from(data); if (mask) for (let i = 0; i < n; i++) body[i] ^= m[i & 3];
  s.write(Buffer.concat(mask ? [head, m, body] : [head, body]));
}

(async () => {
  const srv = spawn(process.execPath, [path.join(__dirname, '..', 'server', 'server.js')], { env: { ...process.env, HOST, PORT: String(PORT), DATA_DIR: DATA, API_BURST: '200' }, stdio: ['ignore', 'pipe', 'pipe'] });
  let log = ''; srv.stdout.on('data', d => log += d); srv.stderr.on('data', d => log += d);
  for (let i = 0; i < 50; i++) { try { await req('GET', '/healthz'); break; } catch (e) { await sleep(100); } }
  try {
    console.log('pages & headers');
    const home = await req('GET', '/', { headers: { 'Accept-Encoding': 'br' } });
    ok(home.status === 200, 'index.html served');
    ok(/script-src 'self'/.test(home.headers['content-security-policy'] || ''), 'Content-Security-Policy set');
    ok(home.headers['x-frame-options'] === 'DENY' && home.headers['x-content-type-options'] === 'nosniff', 'frame + sniff protection');
    ok(home.headers['content-encoding'] === 'br', 'pre-compressed (brotli) page');
    ok(home.headers['cache-control'] === 'no-cache', 'page is revalidated (updates show at once)');
    const appName = /src="(app\.[0-9a-f]{10}\.js)"/.exec(fs.readFileSync(path.join(__dirname, '..', 'dist', 'public', 'index.html'), 'utf8'))[1];
    const app = await req('GET', '/' + appName, { headers: { 'Accept-Encoding': 'gzip' } });
    ok(app.status === 200 && /immutable/.test(app.headers['cache-control']), 'bundle cached for a year (hashed name)');
    const again = await req('GET', '/' + appName, { headers: { 'Accept-Encoding': 'gzip', 'If-None-Match': app.headers.etag } });
    ok(again.status === 304, 'repeat visit: 304 Not Modified (nothing re-sent)');
    console.log('file safety');
    for (const p of ['/../package.json', '/%2e%2e/server/server.js', '/..%2fdata%2fsecret.key', '/.env', '/src/game.js', '/server/server.js', '/index.html.br', '/%00'])
      { const r = await rawHttp(`GET ${p} HTTP/1.1\r\nHost: x\r\nConnection: close\r\n\r\n`); ok(!/^HTTP\/1\.1 200/.test(r), 'blocked ' + p, r.split('\r\n')[0]); }
    ok((await req('POST', '/index.html')).status === 405, 'POST to a page refused');

    console.log('player & api');
    const prof = await req('GET', '/api/profile', { headers: { Origin: BASE } });
    const set = prof.headers['set-cookie'] && prof.headers['set-cookie'][0];
    ok(prof.status === 200 && /HttpOnly/.test(set) && /SameSite=Strict/.test(set), 'player cookie: HttpOnly, SameSite=Strict');
    const cookie = set.split(';')[0];
    const forged = cookie.slice(0, -4) + 'AAAA';
    const p2 = await req('GET', '/api/profile', { headers: { Cookie: forged } });
    ok(!!p2.headers['set-cookie'], 'forged cookie signature ignored (new player)');
    ok((await post('/api/match/start', startBody(), null)).status === 401, 'no cookie: cannot start a match');
    ok((await post('/api/match/start', startBody(), cookie, { Origin: 'http://evil.example' })).status === 403, 'other website: refused');
    ok((await req('POST', '/api/match/start', { headers: { 'Content-Type': 'application/json', Cookie: cookie }, body: startBody() })).status === 400, 'missing X-KF header: refused');
    ok((await post('/api/match/start', startBody({ bots: 50 }), cookie)).status === 400, 'impossible settings refused');
    ok((await post('/api/match/start', { x: 'y'.repeat(20000) }, cookie)).status === 413, 'oversized body refused');

    console.log('anti-cheat');
    const tok = async (m) => (await post('/api/match/start', startBody(m), cookie)).json.token;
    let t = await tok();
    let r = await post('/api/match/end', good(t, { t: 400 }), cookie);
    ok(r.status === 422 && /real time/.test(r.json.reason), 'game clock ahead of real time refused', r.body);
    t = await tok();
    r = await post('/api/match/end', good(t, { rec: { ...good().rec, cuts: 9, cutTimes: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8] } }), cookie);
    ok(r.status === 422, 'too many cuts refused', r.body);
    t = await tok();
    r = await post('/api/match/end', good(t, { rec: { ...good().rec, cuts: 1, cutTimes: [] } }), cookie);
    ok(r.status === 422, 'cuts without cut times refused');
    t = await tok();
    r = await post('/api/match/end', good(t, { rec: { ...good().rec, bestStreak: 5 } }), cookie);
    ok(r.status === 422, 'streak larger than cuts refused');
    t = await tok({ mtime: 'c10' });
    r = await post('/api/match/end', good(t, { place: 1, rec: { ...good().rec, cuts: 1, cutTimes: [1] } }), cookie);
    ok(r.status === 422 && /race/.test(r.json.reason), 'cut race "won" without 10 cuts refused', r.body);
    t = await tok();
    r = await post('/api/match/end', good(t), forged);
    ok(r.status === 401 || r.status === 422, "someone else's token refused");
    t = await tok();
    r = await post('/api/match/end', good(t, { rec: { ...good().rec, cuts: 1, cutTimes: [2], bestStreak: 1 } }), cookie);
    ok(r.status === 200 && r.json.profile.stats.cuts === 1 && r.json.newTrophies.includes('first'), 'honest result recorded, trophy from the server', r.body);
    r = await post('/api/match/end', good(t, { rec: { ...good().rec, cuts: 1, cutTimes: [2], bestStreak: 1 } }), cookie);
    ok(r.status === 422 && /used/.test(r.json.reason), 'same token twice refused (no replay)');
    r = await post('/api/match/end', { token: 'x'.repeat(24), t: 1, rec: good().rec, place: 1, players: 2 }, cookie);
    ok(r.status === 422, 'made-up token refused');
    const pr = await req('GET', '/api/profile', { headers: { Cookie: cookie } });
    ok(pr.json.profile.stats.cuts === 1 && pr.json.profile.stats.matches === 1, 'only the honest match counted');
    r = await post('/api/event', { type: 'made' }, cookie); const r2 = await post('/api/event', { type: 'made' }, cookie);
    ok(r.status === 200 && r.json.newTrophies.includes('maker') && r2.status === 429, '"made a kite" counted once, spam refused');

    console.log('economy: coins, shop, daily, leaderboard, career');
    const fresh = await req('GET', '/api/profile', { headers: { Origin: BASE } }), ck2 = fresh.headers['set-cookie'][0].split(';')[0];
    ok(fresh.json.profile.econ && fresh.json.profile.econ.coins === 300 && fresh.json.profile.econ.daily && fresh.json.profile.econ.daily.goal > 0, 'new player starts with 300 coins and a daily challenge');
    r = await post('/api/buy', { kind: 'thread', id: 'cerol' }, ck2);
    ok(r.status === 200 && r.json.profile.econ.coins === 100 && r.json.profile.econ.owned.includes('thread|cerol'), 'buying Cerol (200) leaves 100 coins and owns it', r.body);
    r = await post('/api/buy', { kind: 'thread', id: 'cerol' }, ck2);
    ok(r.status === 409 && r.json.profile.econ.coins === 100, 'buying it twice refused, nothing charged');
    r = await post('/api/buy', { kind: 'thread', id: 'razor' }, ck2);
    ok(r.status === 409 && /not enough/.test(r.json.error), 'cannot buy what you cannot afford');
    r = await post('/api/buy', { kind: 'thread', id: 'manjha' }, ck2);
    ok(r.status === 409 && /already/.test(r.json.error), 'free items are already yours');
    r = await post('/api/buy', { kind: 'gold', id: 'x' }, ck2);
    ok(r.status === 400, 'unknown item kind refused');
    let t2 = (await post('/api/match/start', startBody(), ck2)).json.token;
    r = await post('/api/match/end', good(t2, { t: 3, place: 2, rec: { ...good().rec, cuts: 1, caught: 1, cutTimes: [2] }, lootIds: ['png:pk2'] }), ck2);
    ok(r.status === 200 && r.json.paid && r.json.paid.coins === 10 + 8 + 5 && r.json.profile.econ.coins === 123, 'a checked match pays coins (cut 10 + kite home 8 + finish 5)', r.body);
    ok(r.json.profile.econ.coll['png:char-bagh'] === 1 && !('png:pk2' in r.json.profile.econ.coll) && r.json.profile.econ.weekly.cuts === 1 && r.json.profile.econ.weekly.loot === 1, 'loot collection (old kite id moved to its new name) and weekly counters updated');
    t2 = (await post('/api/match/start', startBody(), ck2)).json.token;
    r = await post('/api/match/end', good(t2, { lootIds: ['png:pk2'] }), ck2);
    ok(r.status === 422 && /loot/.test(r.json.reason), 'a loot list longer than the kites brought home is refused');
    r = await post('/api/match/start', startBody({ mode: 'mohalla', teams: 2, career: 0, diff: 'hard', mtime: 'c5' }), ck2);
    ok(r.status === 400 && /career/.test(r.json.error), 'a career match must be played as that rung is set up');
    t2 = (await post('/api/match/start', startBody({ mode: 'mohalla', teams: 2, career: 0, diff: 'easy', mtime: 'c5', bots: 3 }), ck2)).json.token;
    r = await post('/api/match/end', good(t2, { t: 3, place: 1, players: 4, rec: { ...good().rec, cuts: 1, cutTimes: [2], bestStreak: 1 } }), ck2);
    ok(r.status === 200 && r.json.won && r.json.paid.career && r.json.profile.econ.career === 1, 'winning the first Mohalla unlocks the next one and pays its reward', r.body);
    t2 = (await post('/api/match/start', startBody({ mode: 'mohalla', teams: 2, career: 0, diff: 'easy', mtime: 'c5', bots: 3 }), ck2)).json.token;
    r = await post('/api/match/end', good(t2, { t: 3, place: 1, players: 4, rec: { ...good().rec, cuts: 1, cutTimes: [2], bestStreak: 1 } }), ck2);
    ok(r.status === 200 && !r.json.paid.career, 'a Mohalla already beaten pays no career reward again');
    const lb = await req('GET', '/api/leaderboard', { headers: { Cookie: ck2 } });
    ok(lb.status === 200 && /^\d{4}-W\d\d$/.test(lb.json.week) && Array.isArray(lb.json.cuts) && lb.json.me.cuts >= 1, 'weekly leaderboard answers, with my own numbers', lb.body);

    console.log('websocket');
    const frames = [];
    const c = await wsConnect(BASE, (op, d) => frames.push(d));
    ok(c.status === 101, 'same-origin socket accepted');
    wsSend(c.s, { t: 'ping', n: 7 }); await sleep(200);
    ok(frames.some(f => /"t":"me"/.test(f)) && frames.some(f => /"t":"pong","n":7/.test(f)), 'greeting + ping/pong');
    const evil = await wsConnect('http://evil.example'); ok(evil.status === 403, 'socket from another website refused'); evil.s.destroy();
    const none = await wsConnect(null); ok(none.status === 403, 'socket without Origin refused'); none.s.destroy();
    let closed = false; c.s.on('close', () => closed = true);
    wsSend(c.s, null, { payload: Buffer.alloc(5000, 97) }); await sleep(300);
    ok(closed, 'oversized message: socket closed');
    const d = await wsConnect(BASE); let dClosed = false; d.s.on('close', () => dClosed = true);
    wsSend(d.s, { t: 'ping' }, { mask: false }); await sleep(300);
    ok(dClosed, 'unmasked frame: socket closed');
    const conns = []; for (let i = 0; i < 14; i++) conns.push(await wsConnect(BASE));
    await sleep(150); ok(conns.filter(x => x.status === 101).length <= 12 && conns.some(x => x.status === 429), 'at most 12 sockets per IP (a family behind one router)');
    await sleep(200);
    conns.forEach(x => x.s.destroy());
    const flood = await wsConnect(BASE); let fClosed = false; flood.s.on('close', () => fClosed = true);
    for (let i = 0; i < 200; i++) wsSend(flood.s, { t: 'ping', n: i }); await sleep(300);
    ok(fClosed, 'message flood: socket closed');

    console.log('persistence');
    srv.kill('SIGTERM'); await sleep(800);
    const saved = JSON.parse(fs.readFileSync(path.join(DATA, 'profiles.json'), 'utf8'));
    ok(Object.values(saved).some(p => p.stats.cuts === 1 && p.trophies.includes('first')), 'records saved to data/profiles.json on shutdown');
    ok((fs.statSync(path.join(DATA, 'secret.key')).mode & 0o077) === 0, 'secret.key readable by the owner only');
  } catch (e) { fail++; console.log('  FAIL test crashed: ' + e.stack); }
  srv.kill('SIGTERM');
  if (/anticheat/.test(log)) console.log('\nserver log (refused results):\n' + log.split('\n').filter(l => /anticheat/.test(l)).map(l => '  ' + l).join('\n'));
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
