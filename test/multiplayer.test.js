#!/usr/bin/env node
/* Online multiplayer, end to end over real WebSockets (no browser):
 * names, rooms, join by code, start, state checks, a pecha decided by the server, scores and the end of the match. */
'use strict';
const { spawn } = require('child_process'), http = require('http'), net = require('net'), crypto = require('crypto');
const fs = require('fs'), os = require('os'), path = require('path');
const PORT = 19000 + Math.floor(Math.random() * 900), HOST = '127.0.0.1', BASE = `http://${HOST}:${PORT}`;
const DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'kf-mp-'));
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

(async () => {
  const srv = spawn(process.execPath, [path.join(__dirname, '..', 'server', 'server.js'), '--dev'], { env: { ...process.env, HOST, PORT: String(PORT), DATA_DIR: DATA, API_BURST: '200' }, stdio: ['ignore', 'pipe', 'pipe'] });
  let log = ''; srv.stdout.on('data', d => log += d); srv.stderr.on('data', d => log += d);
  for (let i = 0; i < 50; i++) { try { await cookie(); break; } catch (e) { await sleep(100); } }
  try {
    console.log('names & rooms');
    const A = await client(await cookie()), B = await client(await cookie());
    await A.wait('me'); await B.wait('me');
    A.send({ t: 'create', settings: {} }); const e1 = await A.wait('error');
    ok(/name/i.test(e1.error), 'cannot make a room without a name');
    A.send({ t: 'name', name: '<script>' }); ok(/2-16/.test((await A.wait('error', e => /2-16/.test(e.error))).error), 'bad name refused');
    A.send({ t: 'name', name: 'Asif' }); ok((await A.wait('me', m => m.name === 'Asif')).name === 'Asif', 'name accepted');
    B.send({ t: 'name', name: 'Bilal 2' }); await B.wait('me', m => m.name === 'Bilal 2');
    A.send({ t: 'create', settings: { scene: 'lahore', mtime: 'c5', open: true }, gear: { thread: 'razor', kite: { id: 'png:patangN1', arche: 'patang' } } });
    const room = (await A.wait('room')).room;
    ok(/^[A-Z2-9]{4}$/.test(room.code) && room.host === room.members[0].id, 'room created with a 4-letter code, creator is host');
    B.send({ t: 'rooms' }); const list = await B.wait('rooms');
    ok(list.rooms.some(r => r.code === room.code && r.host === 'Asif'), 'room shows in the open rooms list');
    B.send({ t: 'join', code: 'ZZZZ' }); ok(/No room/.test((await B.wait('error', e => /No room/.test(e.error))).error), 'wrong code refused');
    B.send({ t: 'join', code: room.code.toLowerCase(), gear: { thread: 'nylon', kite: { id: 'flag:pk', arche: 'patang', recipe: { evil: '<img src=x onerror=alert(1)>' }, base: 'assets/x.png' } } });
    const r2 = (await A.wait('room', m => m.room.members.length === 2)).room;
    ok(r2.members[1].name === 'Bilal 2', 'friend joined by code (any case)');
    ok(!r2.members[1].gear.kite.recipe, 'a kite recipe carrying HTML is dropped');
    B.send({ t: 'start' }); await sleep(150);
    ok(!B.log.some(m => m.t === 'start'), 'only the host can start');
    A.send({ t: 'start' });
    const st = await B.wait('start');
    ok(st.players.length === 2 && st.cutTarget === 5, 'match starts for both, settings from the host');
    const homeA = st.players[0].home, homeB = st.players[1].home, anA = [homeA[0], homeA[1], homeA[2] + 1.5], anB = [homeB[0], homeB[1], homeB[2] + 1.5];

    console.log('server checks the kites');
    // two kites whose lines cross about 18 m up
    const pA = [anA[0] + 40, anA[1] + 20, 30], pB = [anB[0] + 34, anB[1] - 24, 30];
    A.send(kite(0, pA)); B.send(kite(0, pB)); await sleep(120);
    A.send(kite(0, [pA[0] + 300, pA[1], pA[2]])); await sleep(120);
    const snap1 = await A.wait('snap', s => s.k.length === 2);
    const kA = snap1.k.find(x => x[0] === st.players[0].id);
    ok(Math.abs(kA[2][0] - pA[0]) < 0.1, 'a kite teleporting off its line is ignored');
    A.send(kite(0, [pA[0] - 30, pA[1], pA[2]])); await sleep(100); A.send(kite(0, pA)); await sleep(1300);   // a jump: sits out briefly, no kick
    B.send(kite(5, pB)); await sleep(100);
    const kB = (await A.wait('snap', s => s.mt > snap1.mt)).k.find(x => x[0] === st.players[1].id);
    ok(kB[1] === 0, 'a second kite while the first is still flying is refused');

    console.log('pecha, decided by the server');
    // Asif khainches hard (line moving through the crossing); Bilal just holds: the held line must go
    const t0 = Date.now();
    let cut = null;
    while (!cut && Date.now() - t0 < 12000) {
      A.send(kite(0, pA, { rr: -6, pe: 1, T: 14 })); B.send(kite(0, pB, { T: 10 }));
      await sleep(66);
      cut = A.log.find(m => m.t === 'cut');
    }
    ok(!!cut, 'the server cut a line', 'no cut in 12 s');
    if (cut) {
      ok(cut.w === st.players[0].id && cut.l === st.players[1].id, 'the hauling line won, the held line was cut');
      ok(cut.scores[cut.w].cut === 1 && cut.scores[cut.l].lost === 1, 'scores kept by the server');
      ok(B.log.some(m => m.t === 'cut' && m.l === cut.l), 'both players told at once');
      console.log(`       (cut after ${((Date.now() - t0) / 1000).toFixed(1)} s of khainch)`);
    }
    B.send(kite(1, pB)); await sleep(150);
    ok(!(A.log.filter(m => m.t === 'snap').pop().k.find(x => x[0] === st.players[1].id)[1] === 1), 'no instant re-launch right after being cut');
    await sleep(1900); B.send(kite(1, pB)); await sleep(150);
    ok(A.log.filter(m => m.t === 'snap').pop().k.find(x => x[0] === st.players[1].id)[1] === 1, 'new kite allowed after the pause');
    B.send({ t: 'ev', e: 'caught' }); B.send({ t: 'ev', e: 'caught' });
    const sc = await A.wait('score'); await sleep(200);
    ok(sc.scores[st.players[1].id].caught === 1, 'kite brought home counted, spam ignored');

    console.log('leaving & the end');
    const C = await client(await cookie()); await C.wait('me'); C.send({ t: 'name', name: 'Late' }); await C.wait('me', m => m.name);
    C.send({ t: 'join', code: room.code }); ok(/already started/.test((await C.wait('error')).error), 'cannot join a match in progress');
    B.s.destroy();
    const away = await A.wait('away');   // a dropped player keeps their seat for a while (they can come back)
    ok(away.name === 'Bilal 2', 'a friend closing the game is announced');
    // Asif keeps cutting nobody... end by reaching the target is covered above; here the host leaves too -> room closes
    A.s.destroy(); C.s.destroy(); await sleep(200);

    console.log('a full room: 10 players');
    const big = [];
    for (let i = 0; i < 11; i++) { const c = await client(await cookie()); await c.wait('me'); c.send({ t: 'name', name: 'P' + i }); await c.wait('me', m => m.name); big.push(c); }
    big[0].send({ t: 'create', settings: { scene: 'lahore', mtime: 'm3' } }); const bigCode = (await big[0].wait('room')).room.code;
    for (let i = 1; i < 10; i++) { big[i].send({ t: 'join', code: bigCode }); await big[i].wait('room'); }
    big[10].send({ t: 'join', code: bigCode }); ok(/full \(10/.test((await big[10].wait('error')).error), '10 can join, the 11th is told the room is full');
    big[0].send({ t: 'start' }); const bst = await big[9].wait('start');
    ok(bst.players.length === 10 && new Set(bst.players.map(q => String(q.home))).size === 10, 'all 10 get a rooftop of their own');
    big.forEach(c => c.s.destroy()); await sleep(300);
    const health = await new Promise(r => http.get(`${BASE}/healthz`, x => { let b = ''; x.on('data', d => b += d); x.on('end', () => r(JSON.parse(b))); }));
    ok(health.away >= 10, 'players who dropped out of a running match keep their seats for a while (they can rejoin)');

    console.log('mohalla: team rooms, quick chat');
    const T1 = await client(await cookie()), T2 = await client(await cookie());
    await T1.wait('me'); await T2.wait('me'); T1.send({ t: 'name', name: 'Team1' }); T2.send({ t: 'name', name: 'Team2' }); await T1.wait('me', m => m.name); await T2.wait('me', m => m.name);
    T1.send({ t: 'create', settings: { scene: 'lahore', mtime: '120', teams: true }, gear: { thread: 'razor', kite: { id: 'png:pk9', arche: 'patang' } } });
    const tr = (await T1.wait('room')).room;
    ok(tr.settings.teams === true, 'a room can be made with teams');
    ok(tr.members[0].gear.thread === 'manjha', 'a string you have not bought is swapped for the free one online');
    T2.send({ t: 'join', code: tr.code }); const tr2 = (await T1.wait('room', m => m.room.members.length === 2)).room;
    ok(tr2.members[0].team !== tr2.members[1].team, 'players are dealt onto opposite sides');
    T2.send({ t: 'team', team: tr2.members[0].team }); const tr3 = (await T1.wait('room', m => m.room.members.length === 2 && m.room.members[0].team === m.room.members[1].team)).room;
    ok(tr3.members[0].team === tr3.members[1].team, 'a player can switch sides in the lobby');
    T1.send({ t: 'start' }); const tst = await T2.wait('start');
    ok(tst.teams === true && tst.players.every(q => typeof q.team === 'number'), 'the match starts as a team match');
    const hA = tst.players[0].home, hB = tst.players[1].home, qA = [hA[0] + 40, hA[1] + 20, 30], qB = [hB[0] + 34, hB[1] - 24, 30];
    const tt0 = Date.now(); while (Date.now() - tt0 < 3500) { T1.send(kite(0, qA, { rr: -6, pe: 1, T: 14 })); T2.send(kite(0, qB, { T: 10 })); await sleep(66); }
    ok(!T1.log.some(m => m.t === 'cut'), 'team-mates crossing strings never cut each other');
    T1.send({ t: 'emote', n: 3 }); const em = await T2.wait('emote');
    ok(em.n === 3 && em.id === tst.players.find(q => q.name === 'Team1').id, 'a quick-chat phrase reaches the other player');
    T1.send({ t: 'emote', n: 99 }); await sleep(200); ok(!T2.log.some(m => m.t === 'emote' && m.n === 99), 'only the known phrases are relayed');
    T1.s.destroy(); T2.s.destroy(); await sleep(200);
  } catch (e) { fail++; console.log('  FAIL crashed: ' + e.stack); }
  srv.kill('SIGTERM'); await sleep(300);
  if (/error/i.test(log)) console.log('\nserver log:\n' + log);
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
