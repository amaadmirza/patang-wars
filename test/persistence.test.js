#!/usr/bin/env node
/* v6.3: "when the game restarts, every kite I bought is gone". Each way that used to happen, tested:
 *   - the server killed hard right after a purchase
 *   - a new version unpacked into a new folder (records used to live inside the old one)
 *   - the browser's cookie cleared / another phone (backup code)
 *   - records saved under the OLD kite file names (v6.3 renamed every kite)
 * plus the new home-screen prizes (daily login, free gift, crates), which must never pay twice. */
'use strict';
const { spawn } = require('child_process'), fs = require('fs'), path = require('path'), os = require('os');
const ROOT = path.join(__dirname, '..');
let pass = 0, fail = 0;
const ok = (c, msg) => { if (c) { pass++; console.log('  ok   ' + msg); } else { fail++; console.log('  FAIL ' + msg); } };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pw-persist-'));

function start(root, port, env = {}) {
  const p = spawn(process.execPath, [path.join(root, 'server', 'server.js'), '--dev'], { env: { ...process.env, HOST: '127.0.0.1', PORT: String(port), API_BURST: '500', ...env }, stdio: ['ignore', 'pipe', 'pipe'] });
  let log = ''; p.stdout.on('data', d => { log += d; }); p.stderr.on('data', d => { log += d; });
  p.log = () => log;
  return new Promise((res, rej) => { const t0 = Date.now(); (function wait() { if (/on http/.test(log)) return res(p); if (Date.now() - t0 > 8000) return rej(new Error('server did not start:\n' + log)); setTimeout(wait, 50); })(); });
}
function client(port) {
  const jar = { c: '' };
  const call = async (url, body, cookie = jar.c) => {
    const r = await fetch(`http://127.0.0.1:${port}${url}`, body ? { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-KF': '1', Cookie: cookie }, body: JSON.stringify(body) } : { headers: { Cookie: cookie } });
    const sc = r.headers.get('set-cookie'); if (sc && cookie === jar.c) jar.c = sc.split(';')[0];
    return { status: r.status, json: await r.json().catch(() => ({})), cookie: sc && sc.split(';')[0] };
  };
  return { call, jar };
}
const kill = (p, sig) => new Promise(r => { p.on('exit', r); p.kill(sig); });

(async () => {
  const DATA = path.join(tmp, 'data'), PORT = 18700 + Math.floor(Math.random() * 200);
  console.log('a purchase survives a hard crash');
  let srv = await start(ROOT, PORT, { DATA_DIR: DATA });
  const A = client(PORT);
  let r = await A.call('/api/profile');
  ok(r.json.account && /^PW-[a-f0-9]{32}-/.test(r.json.account.code) && /^[A-F0-9]{4}-[A-F0-9]{4}$/.test(r.json.account.pid), 'the profile carries a Player ID and a backup code');
  r = await A.call('/api/buy', { kind: 'kite', id: 'png:suraj-mukhi' });
  ok(r.status === 200 && r.json.profile.econ.owned.includes('kite|png:suraj-mukhi'), 'bought a kite');
  await sleep(450);
  await kill(srv, 'SIGKILL');
  srv = await start(ROOT, PORT, { DATA_DIR: DATA });
  r = await A.call('/api/profile');
  ok(r.json.profile.econ.owned.includes('kite|png:suraj-mukhi') && r.json.profile.econ.coins === 300 - 120, 'still owned (and paid for once) after the server was killed 0.45 s later');

  console.log('kites that do not exist cannot be bought');
  r = await A.call('/api/buy', { kind: 'kite', id: 'png:jason' });
  ok(r.status === 400, 'a picture that was taken out of the game is refused');
  r = await A.call('/api/buy', { kind: 'kite', id: 'png:jabur' });
  ok(r.status === 409 && /already/.test(r.json.error), 'buying a kite under its OLD name counts as the same kite (already yours)');

  console.log('daily login, free gift, crates');
  r = await A.call('/api/claim', { what: 'login' });
  ok(r.status === 200 && r.json.reward.coins === 50 && r.json.profile.econ.login.can === false, 'day 1 login prize: 50 coins');
  r = await A.call('/api/claim', { what: 'login' });
  ok(r.status === 409, 'the login prize cannot be claimed twice in a day');
  r = await A.call('/api/claim', { what: 'gift' });
  const coinsAfterGift = r.json.profile && r.json.profile.econ.coins;
  ok(r.status === 200 && r.json.reward.coins === 25, 'free gift: 25 coins');
  r = await A.call('/api/claim', { what: 'gift' });
  ok(r.status === 409 && r.json.profile.econ.gift.ready === false && r.json.profile.econ.gift.nextIn > 3.9 * 3600e3, 'the free gift waits 4 hours');
  r = await A.call('/api/crate', { crate: 'basic' });
  const got = r.json.reward && r.json.reward.kite;
  ok(r.status === 200 && /^png:/.test(got) && r.json.profile.econ.owned.includes('kite|' + got) && r.json.profile.econ.coins === coinsAfterGift - 150, 'a Patang Crate costs 150 and gives a kite you did not have');
  r = await A.call('/api/crate', { crate: 'legend' });
  ok(r.status === 409 && /coins/.test(r.json.error), 'a crate you cannot afford is refused, nothing taken');
  r = await A.call('/api/claim', { what: 'coins' });
  ok(r.status === 409, 'an unknown prize is refused');

  console.log('backup code: cookie cleared / another phone');
  const code = (await A.call('/api/profile')).json.account.code;
  const B = client(PORT);
  await B.call('/api/profile');   // a brand-new browser gets a brand-new empty record
  r = await B.call('/api/restore', { code: code.replace(/.$/, c => c === 'A' ? 'B' : 'A') });
  ok(r.status === 400, 'a wrong code is refused');
  r = await B.call('/api/restore', { code });
  ok(r.status === 200 && r.cookie && r.json.profile.econ.owned.includes('kite|png:suraj-mukhi'), 'the right code brings the same coins and kites, and sets the cookie');
  B.jar.c = r.cookie;
  r = await B.call('/api/profile');
  ok(r.json.profile.econ.owned.includes('kite|png:suraj-mukhi'), 'and the new browser stays on that record');
  const C = client(PORT);
  r = await C.call('/api/restore', { code });
  ok(r.status === 200, 'restore works even before the browser has any cookie');
  await kill(srv, 'SIGTERM');

  console.log('records saved under the old kite names');
  const D2 = path.join(tmp, 'data-old');
  fs.mkdirSync(D2, { recursive: true });
  fs.copyFileSync(path.join(DATA, 'secret.key'), path.join(D2, 'secret.key'));
  const prof = JSON.parse(fs.readFileSync(path.join(DATA, 'profiles.json'), 'utf8')), id = code.split('-')[1];
  prof[id].econ.owned = ['kite|png:patangd1', 'kite|png:pk9', 'thread|razor']; prof[id].econ.coll = { 'png:pk2': 3, 'png:char-bagh': 1 };
  fs.writeFileSync(path.join(D2, 'profiles.json'), JSON.stringify(prof));
  srv = await start(ROOT, PORT, { DATA_DIR: D2 });
  const cookieOf = (await A.call('/api/profile')).json;   // A's cookie still belongs to id
  const e = cookieOf.profile.econ;
  ok(e.owned.includes('kite|png:kali-gulabi') && e.owned.includes('kite|png:gulabi-raat') && !e.owned.some(x => /patangd1|pk9/.test(x)), 'kites bought before the rename are still yours, under their new names');
  ok(e.coll['png:char-bagh'] === 4 && !('png:pk2' in e.coll), 'the loot collection is merged onto the new names');
  await kill(srv, 'SIGTERM');

  console.log('a new version unpacked next to the old one keeps everyone\'s records');
  const old = path.join(tmp, 'rel', 'patang-wars-v6.2', 'kite-fight'), neu = path.join(tmp, 'rel', 'patang-wars-v6.3', 'kite-fight'), HOME = path.join(tmp, 'home');
  for (const dst of [old, neu]) { fs.mkdirSync(dst, { recursive: true }); for (const d of ['server', 'client']) fs.cpSync(path.join(ROOT, d), path.join(dst, d), { recursive: true, filter: s => !/node_modules|[\\/]assets[\\/]kites[\\/]/.test(s) }); }
  fs.mkdirSync(path.join(old, 'data')); fs.copyFileSync(path.join(DATA, 'profiles.json'), path.join(old, 'data', 'profiles.json')); fs.copyFileSync(path.join(DATA, 'secret.key'), path.join(old, 'data', 'secret.key'));
  fs.mkdirSync(HOME);
  const env = { HOME, USERPROFILE: HOME, DATA_DIR: '' };
  delete env.DATA_DIR;
  const p2 = spawn(process.execPath, [path.join(neu, 'server', 'server.js'), '--dev'], { env: { ...Object.fromEntries(Object.entries(process.env).filter(([k]) => k !== 'DATA_DIR')), ...env, HOST: '127.0.0.1', PORT: String(PORT), API_BURST: '500' }, stdio: ['ignore', 'pipe', 'pipe'] });
  let log = ''; p2.stdout.on('data', d => { log += d; }); p2.stderr.on('data', d => { log += d; });
  for (let i = 0; i < 160 && !/on http/.test(log); i++) await sleep(50);
  ok(/imported player records from .*patang-wars-v6\.2/.test(log), 'the new copy found the old copy\'s records by itself');
  ok(fs.existsSync(path.join(HOME, 'PatangWars-data', 'profiles.json')), 'records now live outside the game folder (PatangWars-data in the home folder)');
  r = await A.call('/api/profile');
  ok(r.json.profile && r.json.profile.econ.owned.includes('kite|png:suraj-mukhi'), 'the same cookie still opens the same record (the cookie key came along)');
  await kill(p2, 'SIGTERM');

  fs.rmSync(tmp, { recursive: true, force: true });
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
