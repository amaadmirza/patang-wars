#!/usr/bin/env node
/* v6.4: a third line joining a pecha that is already on - online, decided by the server (real WebSockets, no browser). */
'use strict';
const { spawn } = require('child_process'), http = require('http'), net = require('net'), crypto = require('crypto');
const fs = require('fs'), os = require('os'), path = require('path');
const PORT = 19000 + Math.floor(Math.random() * 900), HOST = '127.0.0.1', BASE = `http://${HOST}:${PORT}`;
const DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'kf-mp3-'));
let pass = 0, fail = 0;
const ok = (c, name, extra = '') => { if (c) { pass++; console.log('  ok   ' + name); } else { fail++; console.log('  FAIL ' + name + (extra ? '  -> ' + extra : '')); } };
const sleep = ms => new Promise(r => setTimeout(r, ms));

function cookie() {
  return new Promise((res, rej) => http.get({ host: HOST, port: PORT, path: '/api/profile', headers: { Origin: BASE } }, r => { r.resume(); res(r.headers['set-cookie'][0].split(';')[0]); }).on('error', rej));
}
/** a tiny WebSocket client: send(obj), wait(type, pred), all messages kept in .log */
function client(ck) {
  return new Promise(res => {
    const s = net.connect(PORT, HOST), key = crypto.randomBytes(16).toString('base64');
    const c = { log: [], waiters: [], s,
      send(o) { const d = Buffer.from(JSON.stringify(o)), m = crypto.randomBytes(4), n = d.length;
        const h = n < 126 ? Buffer.from([0x81, 0x80 | n]) : Buffer.from([0x81, 0x80 | 126, n >> 8, n & 255]);
        for (let i = 0; i < n; i++) d[i] ^= m[i & 3]; s.write(Buffer.concat([h, m, d])); },
      wait(t, pred = () => true, ms = 4000) {
        const hit = c.log.find(x => x.t === t && pred(x)); if (hit) return Promise.resolve(hit);
        return new Promise((ok2, no) => { const w = { t, pred, ok2 }; c.waiters.push(w); setTimeout(() => { c.waiters = c.waiters.filter(x => x !== w); no(new Error('timeout waiting for ' + t)); }, ms); });
      } };
    let head = '', up = false, buf = Buffer.alloc(0);
    s.on('connect', () => s.write(`GET /ws HTTP/1.1\r\nHost: ${HOST}:${PORT}\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: ${key}\r\nSec-WebSocket-Version: 13\r\nOrigin: ${BASE}\r\nCookie: ${ck}\r\n\r\n`));
    s.on('data', d => {
      if (!up) { head += d.toString('latin1'); const i = head.indexOf('\r\n\r\n'); if (i < 0) return; up = true; buf = Buffer.from(head.slice(i + 4), 'latin1'); res(c); }
      else buf = Buffer.concat([buf, d]);
      for (;;) {
        if (buf.length < 2) break; let len = buf[1] & 0x7f, off = 2;
        if (len === 126) { if (buf.length < 4) break; len = buf.readUInt16BE(2); off = 4; }
        else if (len === 127) { if (buf.length < 10) break; len = Number(buf.readBigUInt64BE(2)); off = 10; }
        if (buf.length < off + len) break;
        const op = buf[0] & 0x0f, txt = buf.subarray(off, off + len).toString(); buf = buf.subarray(off + len);
        if (op !== 1) continue;
        const msg = JSON.parse(txt); c.log.push(msg);
        c.waiters = c.waiters.filter(w => { if (w.t === msg.t && w.pred(msg)) { w.ok2(msg); return false; } return true; });
      }
    });
  });
}
const kite = (seq, p, more = {}) => ({ t: 's', k: seq, p, v: [0, 0, 0], L: Math.hypot(...p) + 2, rr: 0, T: 6, h: 0, b: 0, al: 0.5, tk: 0, pe: 0, se: 0, ...more });


const PECHA = require('../client/src/pecha.js');
(async () => {
  console.log('the rule itself');
  ok(PECHA.CFG.maxHooks === 2, 'a line can be in two pechas at once');
  ok(PECHA.canHook({ hooks: 1 }, { hooks: 0 }, {}) === true, 'a line already in one pecha can be joined');
  ok(PECHA.canHook({ hooks: 2 }, { hooks: 0 }, {}) === false, 'a line already in two pechas cannot take a third');
  ok(PECHA.canHook({ hooks: 2 }, { hooks: 2 }, { locked: true }) === true, 'an ongoing pecha always carries on');
  const srv = spawn(process.execPath, [path.join(__dirname, '..', 'server', 'server.js'), '--dev'], { env: { ...process.env, HOST, PORT: String(PORT), DATA_DIR: DATA, API_BURST: '200' }, stdio: ['ignore', 'pipe', 'pipe'] });
  let log = ''; srv.stdout.on('data', d => log += d); srv.stderr.on('data', d => log += d);
  for (let i = 0; i < 50; i++) { try { await cookie(); break; } catch (e) { await sleep(100); } }
  try {
    const A = await client(await cookie()), B = await client(await cookie()), C = await client(await cookie());
    for (const [x, n] of [[A, 'Asif'], [B, 'Bilal'], [C, 'Chand']]) { await x.wait('me'); x.send({ t: 'name', name: n }); await x.wait('me', m => m.name === n); }
    A.send({ t: 'create', settings: { scene: 'lahore', mtime: '0', open: false } }); const room = (await A.wait('room')).room;
    B.send({ t: 'join', code: room.code }); C.send({ t: 'join', code: room.code }); await A.wait('room', m => m.room.members.length === 3);
    A.send({ t: 'start' }); const st = await C.wait('start');
    const id = n => st.players.find(p => p.name === n).id, home = n => { const h = st.players.find(p => p.name === n).home; return [h[0], h[1], h[2] + 1.5]; };
    const anA = home('Asif'), anB = home('Bilal'), anC = home('Chand');
    console.log('three lines, one pecha');
    const pA = [anA[0] + 40, anA[1] + 20, 30], pB = [anB[0] + 34, anB[1] - 24, 30];
    // C's line passes through a point halfway up A's line and carries on past it
    const X = anA.map((v, i) => v + 0.5 * (pA[i] - v)), pC = anC.map((v, i) => v + 1.6 * (X[i] - v));
    ok(Math.hypot(pC[0] - pA[0], pC[1] - pA[1], pC[2] - pA[2]) < 60, 'test set-up: C flies close enough to A to fight');
    const s = (seq, p, more) => ({ ...kite(seq, p, more), L: Math.hypot(p[0] - (p === pA ? anA : p === pB ? anB : anC)[0], p[1] - (p === pA ? anA : p === pB ? anB : anC)[1], p[2] - (p === pA ? anA : p === pB ? anB : anC)[2]) + 1 });
    // C waits far off to the side first
    const away = [anC[0] + 20, anC[1] - 40, 20];
    for (let i = 0; i < 25; i++) { A.send(s(0, pA, { T: 10 })); B.send(s(0, pB, { T: 10 })); C.send({ ...kite(0, away), L: 60 }); await sleep(66); }
    ok(!A.log.some(m => m.t === 'cut'), 'A and B are hooked, both holding still: nobody cut yet');
    // now C comes across A's line and hauls hard, while A and B still just hold
    const t0 = Date.now(); let cut = null;
    while (!cut && Date.now() - t0 < 12000) {
      A.send(s(0, pA, { T: 10 })); B.send(s(0, pB, { T: 10 })); C.send(s(0, pC, { rr: -7, pe: 1, T: 14 }));
      await sleep(66); cut = A.log.find(m => m.t === 'cut');
    }
    ok(!!cut, 'a line was cut', 'none in 12 s');
    if (cut) {
      ok(cut.l === id('Asif'), 'A - the line two others were on - went first', 'lost: ' + cut.l);
      ok(cut.w === id('Chand'), 'credited to C, who joined the pecha and did the cutting', 'credited: ' + cut.w);
      ok((Date.now() - t0) / 1000 < 8, `C's haul cut it quickly (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
    }
    ok(!/Error|TypeError/.test(log), 'server log has no errors', log.split('\n').find(l => /Error/.test(l)));
  } catch (e) { fail++; console.log('  FAIL ' + e.message); }
  srv.kill(); fs.rmSync(DATA, { recursive: true, force: true });
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
