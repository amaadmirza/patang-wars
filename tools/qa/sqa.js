// Bo Kata! end-to-end SQA through the real UI (production build - no debug hook).
// usage: node sqa.js <url> <label> <desk|phone> [app]
const { chromium } = require(process.env.PLAYWRIGHT || 'playwright');
const fs = require('fs');
const [url, label, form, appMode] = process.argv.slice(2);
const OUT = require('path').join(process.env.QA_OUT || 'qa-out', label); fs.mkdirSync(OUT, { recursive: true });
const results = []; let errs = [];
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--autoplay-policy=no-user-gesture-required'] });
  const ctx = await b.newContext(form === 'phone' ? { viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { viewport: { width: 1366, height: 768 } });
  const p = await ctx.newPage();
  p.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  p.on('console', m => { if (m.type() === 'error' && !/favicon|fonts\.g|net::ERR_FAILED.*music/.test(m.text())) errs.push('CONSOLE ' + m.text().slice(0, 200)); });
  p.on('response', r => { if (r.status() >= 400 && !/healthz/.test(r.url())) errs.push('HTTP ' + r.status() + ' ' + r.url()); });
  const tap = async sel => { const el = await p.waitForSelector(sel, { state: 'visible', timeout: 5000 }); if (form === 'phone') await el.tap(); else await el.click(); };
  const visible = sel => p.evaluate(s => { const e = document.querySelector(s); if (!e) return false; const cs = getComputedStyle(e); return !e.classList.contains('hidden') && cs.display !== 'none' && cs.visibility !== 'hidden' && e.getBoundingClientRect().width > 0; }, sel);
  const coins = () => p.evaluate(() => +(document.querySelector('#coinCount') || {}).textContent?.replace(/\D/g, '') || 0);
  const shot = n => p.screenshot({ path: `${OUT}/${String(results.length).padStart(2, '0')}-${n}.png` });
  const clickText = async (scope, re) => { const ok = await p.evaluate(([s, r]) => { const rx = new RegExp(r, 'i'); const el = [...document.querySelectorAll(s + ' button, ' + s + ' [role=button], ' + s + ' .pk, ' + s + ' label')].find(e => rx.test(e.textContent) && e.offsetParent); if (el) { el.click(); return el.textContent.trim().slice(0, 40); } return null; }, [scope, re.source]); return ok; };
  async function step(name, fn) {
    errs = []; let ok = true, note = '';
    try { note = (await fn()) || ''; } catch (e) { ok = false; note = e.message.split('\n')[0].slice(0, 200); }
    await p.waitForTimeout(150);
    if (errs.length) { ok = false; note += ' | ' + [...new Set(errs)].slice(0, 3).join(' ; '); }
    results.push({ name, ok, note }); console.log((ok ? 'PASS ' : 'FAIL ') + name + (note ? '  - ' + note : ''));
    if (!ok) await shot('FAIL-' + name.replace(/\W+/g, '_'));
  }
  const expect = (c, m) => { if (!c) throw new Error(m); };

  await step('splash loads, kites preload, Tap to play enables', async () => {
    await p.goto(url); await p.waitForFunction(() => !document.querySelector('#splashGo').disabled, null, { timeout: 15000 }); await shot('splash');
  });
  await step('tap: smooth hand-over to the home screen', async () => {
    await tap('#splashGo'); await p.waitForTimeout(1600);
    expect(await p.evaluate(() => document.querySelector('#splash').classList.contains('hidden')), 'splash still showing');
    if (await visible('#nameScreen')) { await p.fill('#nameInput', 'Tester'); await tap('#nameGo'); await p.waitForTimeout(800); }
    expect(await visible('#menu'), 'home not visible'); await shot('hub');
  });
  await step('daily login: claim day 1', async () => {
    await p.waitForTimeout(900);
    if (!(await visible('#loginPop'))) await tap('#loginBtn');
    await p.waitForTimeout(400); const c0 = await coins();
    const what = await clickText('#loginBody', /claim/); expect(what, 'no Claim button');
    await p.waitForTimeout(900); if (await visible('#rewardPop')) { await tap('#rewardPop'); await p.waitForTimeout(400); }
    if (await visible('#loginPop')) await tap('#loginClose');
    const c1 = await coins(); expect(c1 > c0, `coins ${c0} -> ${c1}`); return `coins ${c0} -> ${c1}`;
  });
  await step('free gift claim', async () => {
    await tap('#giftBtn'); await p.waitForTimeout(500); const c0 = await coins(); const what = await clickText('#loginBody', /claim|open|collect/);
    await p.waitForTimeout(800); if (await visible('#rewardPop')) { await tap('#rewardPop'); await p.waitForTimeout(300); }
    if (await visible('#loginPop')) await tap('#loginClose'); const c1 = await coins(); return `${what || 'no claim button (already claimed?)'}; coins ${c0} -> ${c1}`;
  });
  await step('shop: every tab renders', async () => {
    await tap('#shopBtn'); await p.waitForTimeout(700); expect(await visible('#shop'), 'shop not open');
    const tabs = await p.$$eval('#shopTabs button', bs => bs.map(b => b.textContent.trim())); const counts = [];
    for (let i = 0; i < tabs.length; i++) { await p.evaluate(i => document.querySelectorAll('#shopTabs button')[i].click(), i); await p.waitForTimeout(350); counts.push(tabs[i] + ':' + await p.$$eval('#shopGrid > *', x => x.length)); }
    await shot('shop'); return counts.join(' ');
  });
  await step('shop: retired kites are gone (no Pipa/Raia/Wau/Box/Star, no Saudi flag)', async () => {
    await p.evaluate(() => [...document.querySelectorAll('#shopTabs button')].find(b => /kite/i.test(b.textContent)).click()); await p.waitForTimeout(400);
    const text = await p.$eval('#shopGrid', e => e.textContent); const bad = ['Saudi', 'Pipa ', 'Wau ', 'Raia', 'Tota', 'Dabba', 'Resham', 'Chamgadar'].filter(w => text.includes(w));
    expect(!bad.length, 'found: ' + bad.join(',')); return 'grid ok';
  });
  await step('shop: buy a string (Cerol, 200) and own it', async () => {
    await p.evaluate(() => [...document.querySelectorAll('#shopTabs button')].find(b => /string/i.test(b.textContent)).click()); await p.waitForTimeout(400);
    const c0 = await coins(); const hit = await p.evaluate(() => { const el = [...document.querySelectorAll('#shopGrid > *')].find(e => /cerol/i.test(e.textContent)); if (el) { (el.querySelector('button') || el).click(); return el.textContent.trim().slice(0, 50); } return null; });
    expect(hit, 'no Cerol card'); await p.waitForTimeout(500);
    if (await visible('#buyPop')) { await tap('#buyYes'); await p.waitForTimeout(900); }
    const c1 = await coins(); expect(c1 === c0 - 200, `coins ${c0} -> ${c1}`); return `coins ${c0} -> ${c1}`;
  });
  await step('shop: close', async () => { await tap('#shopClose'); await p.waitForTimeout(400); expect(!(await visible('#shop')), 'still open'); });
  await step('kites screen: tabs, flags count, pick a kite, back', async () => {
    await tap('#railKites'); await p.waitForTimeout(900); expect(await visible('#select'), 'select not open');
    const tabs = await p.$$eval('#kiteTabs button', bs => bs.map(b => b.textContent.trim())); expect(!tabs.some(t => /pipa|raia|wau|box|star|bird/i.test(t)), 'retired tab: ' + tabs.join('|'));
    // a locked kite opens the buy offer - check it, close it with Not now, then pick a free kite
    await p.evaluate(() => { const c = [...document.querySelectorAll('#kiteGrid > *')].find(e => /\d{3}/.test(e.textContent)); c && c.click(); }); await p.waitForTimeout(400);
    const offer = await visible('#buyPop'); if (offer) { await tap('#buyNo'); await p.waitForTimeout(300); }
    await p.evaluate(() => { const c = document.querySelector('#kiteGrid > *'); c && c.click(); }); await p.waitForTimeout(300);
    expect(!(await visible('#buyPop')), 'buy popup stuck open');
    await shot('kites'); await tap('#selBack'); await p.waitForTimeout(500); expect(!(await visible('#select')), 'did not go back'); return tabs.join(' | ') + (offer ? ' ; locked kite -> buy offer, Not now ok' : '');
  });
  for (const [btn, panel, close, name] of [['#mohallaBtn', '#mohalla', '#mhClose', 'mohalla'], ['#collBtn', '#coll', '#collClose', 'collection'], ['#trophyBtn', '#trophies', '#trophyOk', 'trophies'], ['#howBtn', '#how', '#howOk', 'how to play']].concat(appMode ? [] : [['#lbBtn', '#lb', '#lbClose', 'leaderboard']])) {
    await step(`${name}: open and close`, async () => { await tap(btn); await p.waitForTimeout(700); expect(await visible(panel), 'did not open'); await shot(name.replace(/ /g, '-')); await tap(close); await p.waitForTimeout(400); expect(!(await visible(panel)), 'did not close'); });
  }
  await step('settings: every tab, idle-spin switch present, theme light/dark, close', async () => {
    await tap('#setBtnMenu'); await p.waitForTimeout(600); expect(await visible('#settings'), 'not open');
    const n = await p.$$eval('#setNav button', bs => bs.length); for (let i = 0; i < n; i++) { await p.evaluate(i => document.querySelectorAll('#setNav button')[i].click(), i); await p.waitForTimeout(200); }
    await p.evaluate(() => document.querySelectorAll('#setNav button')[0].click()); await p.waitForTimeout(200);
    const has = await p.evaluate(() => !!document.querySelector('[data-q="idleSpin"]')); expect(has, 'no idle-spin switch');
    await shot('settings');
    for (const th of ['light', 'dark']) { await p.evaluate(t => { const b = document.querySelector(`#themePick [data-theme="${t}"], #themePick [data-v="${t}"], #themePick button[data-t="${t}"]`) || [...document.querySelectorAll('#themePick button')].find(x => new RegExp(t, 'i').test(x.textContent)); b && b.click(); }, th); await p.waitForTimeout(250); }
    const theme = await p.evaluate(() => document.documentElement.dataset.theme);
    await tap('#setClose'); await p.waitForTimeout(300); return `${n} tabs, theme now ${theme}`;
  });
  await step('mode + bots pickers', async () => {
    await tap('#hubMode'); await p.waitForTimeout(400); const modes = await p.$$eval('#pickBody .pk', x => x.map(e => e.textContent.trim().split('\n')[0].slice(0, 20)));
    await p.evaluate(() => document.querySelector('#pickBody .pk').click()); await p.waitForTimeout(500);
    await tap('#hubDiff'); await p.waitForTimeout(400); const diffs = await p.$$eval('#pickBody .pk', x => x.length);
    await p.evaluate(() => document.querySelectorAll('#pickBody .pk')[1].click()); await p.waitForTimeout(500);
    if (await visible('#pickPop')) await tap('#pickClose'); return `modes: ${modes.join(', ')}; ${diffs} bot levels`;
  });
  await step('Festival: Play starts a match', async () => {
    await tap('#hubPlay'); await p.waitForTimeout(1500); if (await visible('#select')) { await tap('#play'); await p.waitForTimeout(1200); }
    expect(await visible('#game'), 'no match'); await p.waitForTimeout(6000); await shot('festival');
  });
  if (form === 'phone') await step('zoom slider: drag up zooms in', async () => {
    const t = await p.$('#zsThumb'); const bb = await t.boundingBox(); const before = await p.$eval('#zoomSlider', e => +e.getAttribute('aria-valuenow'));
    await p.mouse.move(bb.x + 18, bb.y + 21); await p.mouse.down(); for (let i = 1; i <= 5; i++) { await p.mouse.move(bb.x + 18, bb.y + 21 - i * 10); await p.waitForTimeout(30); } await p.mouse.up();
    await p.waitForTimeout(300); const after = await p.$eval('#zoomSlider', e => +e.getAttribute('aria-valuenow')); expect(after > before, `${before} -> ${after}`); return `${before} -> ${after}`;
  });
  else await step('keyboard flying: fly, steer, dheel, khainch, zoom keys', async () => {
    for (const [k, ms] of [['ArrowUp', 1500], ['ArrowLeft', 500], ['d', 900], ['a', 700], [']', 50], ['[', 50]]) { await p.keyboard.down(k); await p.waitForTimeout(ms); await p.keyboard.up(k); }
  });
  await step('pause menu: open, resume', async () => { await tap('#pauseBtn'); await p.waitForTimeout(500); expect(await visible('#pause'), 'pause not shown'); await shot('pause'); await tap('#pauseResume'); await p.waitForTimeout(500); expect(!(await visible('#pause')), 'still paused'); });
  await step('settings from inside the match, then back', async () => { await tap('#setBtn'); await p.waitForTimeout(500); expect(await visible('#settings'), 'no settings'); await tap('#setClose'); await p.waitForTimeout(400); });
  await step('let it run 20 s (bots, pechas, loot) with no errors', async () => { await p.waitForTimeout(20000); await shot('festival-later'); return await p.$eval('#score', e => e.textContent.replace(/\s+/g, ' ').slice(0, 120)); });
  if (form === 'phone') await step('turn phone upright mid-match: rotate cover + pause, back to landscape', async () => {
    const fs0 = await p.evaluate(() => !!document.fullscreenElement); await p.evaluate(() => document.fullscreenElement && document.exitFullscreen()); await p.waitForTimeout(400);
    await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(700); const cover = await visible('#rotate'); await shot('portrait');
    await p.setViewportSize({ width: 844, height: 390 }); await p.waitForTimeout(500); if (await visible('#pause')) await tap('#pauseResume'); expect(cover, 'no rotate cover'); return 'game had gone full screen: ' + fs0; });
  await step('quit to home from the pause menu', async () => { await tap('#pauseBtn'); await p.waitForTimeout(400); await tap('#pauseQuit'); await p.waitForTimeout(1200); if (await visible('#results')) { await shot('results'); await tap('#resMenu'); await p.waitForTimeout(800); } expect(await visible('#menu'), 'not home'); });
  await step('Duel: start, fly 8 s, quit', async () => {
    await tap('#hubMode'); await p.waitForTimeout(300); await p.evaluate(() => { const c = [...document.querySelectorAll('#pickBody .pk')].find(e => /duel/i.test(e.textContent)); c && c.click(); }); await p.waitForTimeout(500);
    await tap('#hubPlay'); await p.waitForTimeout(9000); expect(await visible('#game'), 'no match'); await tap('#pauseBtn'); await p.waitForTimeout(300); await tap('#pauseQuit'); await p.waitForTimeout(1200); if (await visible('#results')) await tap('#resMenu'); await p.waitForTimeout(500);
  });
  if (form !== 'phone') await step('Two players (split screen): start, 6 s, quit', async () => {
    await tap('#hubMode'); await p.waitForTimeout(300); await p.evaluate(() => { const c = [...document.querySelectorAll('#pickBody .pk')].find(e => /two/i.test(e.textContent)); c && c.click(); }); await p.waitForTimeout(500);
    await tap('#hubPlay'); await p.waitForTimeout(1500); if (await visible('#select')) { await tap('#play'); } await p.waitForTimeout(6000); expect(await visible('#game'), 'no match'); await shot('two-players');
    await tap('#pauseBtn'); await p.waitForTimeout(300); await tap('#pauseQuit'); await p.waitForTimeout(1200); if (await visible('#results')) await tap('#resMenu'); await p.waitForTimeout(500);
    await tap('#hubMode'); await p.waitForTimeout(300); await p.evaluate(() => document.querySelector('#pickBody .pk').click()); await p.waitForTimeout(500);
  });
  await step('Mohalla: quick team match starts', async () => {
    await tap('#mohallaBtn'); await p.waitForTimeout(600); const t = await clickText('#mohalla', /fight|quick|play/); await p.waitForTimeout(1500); if (await visible('#select')) { await tap('#play'); await p.waitForTimeout(1200); }
    await p.waitForTimeout(6000); expect(await visible('#game'), 'no match (' + t + ')'); await shot('mohalla-match'); await tap('#pauseBtn'); await p.waitForTimeout(300); await tap('#pauseQuit'); await p.waitForTimeout(1200); if (await visible('#results')) await tap('#resMenu'); await p.waitForTimeout(500);
    const back = await visible('#mohalla'); if (back) { await tap('#mhClose'); await p.waitForTimeout(400); } return t + (back ? ' ; quit returns to the Mohalla screen' : '');
  });
  await step('tutorial: starts, first step shows, skip', async () => {
    await tap('#tutBtn'); await p.waitForTimeout(2500); expect(await visible('#tut'), 'no tutorial card'); const txt = await p.$eval('#tutText', e => e.textContent.slice(0, 90)); await shot('tutorial');
    await tap('#tutSkip'); await p.waitForTimeout(800); if (await visible('#game')) { await tap('#pauseBtn'); await p.waitForTimeout(300); await tap('#pauseQuit'); await p.waitForTimeout(1000); } if (await visible('#results')) await tap('#resMenu'); return txt;
  });
  if (!appMode) await step('online panel opens (server mode)', async () => { await tap('#onlineBtn'); await p.waitForTimeout(800); expect(await visible('#online'), 'no online panel'); await shot('online'); await tap('#onClose'); await p.waitForTimeout(400); });
  else await step('online in the offline app shows coming soon / no crash', async () => { await tap('#onlineBtn'); await p.waitForTimeout(800); await shot('online-app'); const txt = await p.evaluate(() => document.body.innerText.match(/coming soon|server/i)); if (await visible('#online')) await tap('#onClose'); else await p.keyboard.press('Escape'); return txt ? txt[0] : ''; });
  await step('back on the home screen, no stuck panels', async () => { await p.waitForTimeout(400); expect(await visible('#menu'), 'not home'); const open = await p.evaluate(() => ['#shop', '#settings', '#mohalla', '#select', '#pause', '#loginPop', '#pickPop'].filter(s => { const e = document.querySelector(s); return e && !e.classList.contains('hidden'); })); expect(!open.length, 'open: ' + open); });
  fs.writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 1));
  console.log(`\n${label}: ${results.filter(r => r.ok).length}/${results.length} passed`);
  await b.close();
})();
