// Online SQA: a host and a friend (two separate browsers) - create room, join by invite link, start, play, leave.
const { chromium } = require(process.env.PLAYWRIGHT || 'playwright');
const url = process.argv[2] || 'http://localhost:8092/';
require('fs').mkdirSync(process.env.QA_OUT || 'qa-out', { recursive: true });
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader'] });
  const errs = { host: [], friend: [] };
  const open = async (who, link, phone) => {
    const ctx = await b.newContext(phone ? { viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } : { viewport: { width: 1280, height: 720 } });
    const p = await ctx.newPage(); p.on('pageerror', e => errs[who].push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/fonts/.test(m.text())) errs[who].push(m.text().slice(0, 160)); });
    await p.goto(link); await p.waitForFunction(() => !document.querySelector('#splashGo').disabled, null, { timeout: 15000 });
    await p.click('#splashGo'); await p.waitForTimeout(1300);
    if (await p.isVisible('#nameScreen')) { await p.fill('#nameInput', who === 'host' ? 'Amaad' : 'Reesth'); await p.click('#nameGo'); await p.waitForTimeout(900); }
    if (await p.isVisible('#loginPop')) { await p.click('#loginClose'); await p.waitForTimeout(300); }
    return p;
  };
  const log = (ok, m) => console.log((ok ? 'PASS ' : 'FAIL ') + m);
  const host = await open('host', url);
  if (!(await host.isVisible('#online'))) { await host.click('#onlineBtn'); await host.waitForTimeout(900); }
  log(await host.isVisible('#online'), 'host: online lobby open');
  await host.click('#onCreate'); await host.waitForTimeout(1500);
  const link = await host.$eval('#onLink', e => e.value).catch(() => null);
  log(!!link, 'host: room created, invite link ' + link);
  const friend = await open('friend', link.replace(/^https?:\/\/[^/]+/, url.replace(/\/$/, '')), true);
  await friend.waitForTimeout(1500);
  const members = await host.evaluate(() => document.querySelector('#onBody').innerText.match(/Reesth/g));
  log(!!members, 'friend joined by the invite link (host sees "Reesth")');
  await host.click('#onStart'); await host.waitForTimeout(4000);
  log(await host.isVisible('#game'), 'host: match running'); log(await friend.isVisible('#game'), 'friend (phone): match running');
  // fly both for 15 s
  await host.keyboard.down('ArrowUp'); await host.waitForTimeout(4000); await host.keyboard.up('ArrowUp');
  await friend.waitForTimeout(11000);
  const seen = await host.evaluate(() => document.querySelector('#score').innerText);
  log(/Amaad/.test(seen) && /Reesth/.test(seen), 'scoreboard shows both players: ' + seen.replace(/\s+/g, ' ').slice(0, 80));
  await host.screenshot({ path: '' + (process.env.QA_OUT || 'qa-out') + '/online-host.png' }); await friend.screenshot({ path: '' + (process.env.QA_OUT || 'qa-out') + '/online-friend.png' });
  await friend.tap('#back'); await friend.waitForTimeout(500); await friend.tap('#pauseQuit'); await friend.waitForTimeout(1500);
  log(!(await friend.isVisible('#game')), 'friend left the match cleanly');
  await host.waitForTimeout(2000); log(await host.isVisible('#game') || await host.isVisible('#results') || await host.isVisible('#online'), 'host still fine after friend left');
  for (const w of ['host', 'friend']) log(!errs[w].length, `${w}: no console errors ${errs[w].length ? JSON.stringify([...new Set(errs[w])].slice(0, 3)) : ''}`);
  await b.close();
})();
