// Soak + results: a long hard Festival (10 kites) on the dev build, the human kite left to idle-spin or flown by the bot
// brain, counting cuts/loot/replays and every error; then a match played to its end -> results + coins.
const { chromium } = require(process.env.PLAYWRIGHT || 'playwright');
require('fs').mkdirSync(process.env.QA_OUT || 'qa-out', { recursive: true });
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } }); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/fonts/.test(m.text())) errs.push(m.text()); });
  await p.addInitScript(() => localStorage.setItem('kiteGame', JSON.stringify({ tutDone: true, netName: 'T' })));
  await p.goto('http://localhost:8090/'); await p.waitForFunction(() => !document.querySelector('#splashGo').disabled); await p.click('#splashGo'); await p.waitForTimeout(1200);
  const r = await p.evaluate(async () => {
    document.querySelectorAll('#loginPop').forEach(e => e.classList.add('hidden'));
    const g = window.__game, out = {};
    g.startMatch('festival', g.matchCfg({ bots: 9, diff: 'hard', mtime: 0 }));
    const G = g.G; G.paused = true;
    let cuts = 0, maxHooks = 0, idleSpinT = 0, loot = 0;
    // 6 minutes of match time in 1 s chunks: the first 3 the human hands-off (idle spin), then flown by the bot brain
    for (let s = 0; s < 360; s++) {
      if (s === 180) { const me = G.players[0], bot = G.players.find(x => x.ctrl === 'bot'); me.ctrl = 'bot'; me.ai = Object.fromEntries(Object.entries(bot.ai).filter(([k, v]) => v === null || typeof v !== 'object')); }
      g.advance(1);
      const me = G.players[0].kite; if (me && (me.idleE || 0) > 0.5) idleSpinT++;
      maxHooks = Math.max(maxHooks, ...G.players.map(q => (q.kite && q.kite.hooks) | 0));
    }
    out.cuts = G.players.reduce((a, q) => a + q.score.cut, 0); out.caught = G.players.reduce((a, q) => a + q.score.caught, 0);
    out.lost = G.players.reduce((a, q) => a + q.score.lost, 0); out.idleSpinSeconds = idleSpinT; out.maxLinesOnOneKite = maxHooks;
    out.nanKites = G.players.filter(q => q.kite && q.kite.p.some(v => !isFinite(v))).length;
    out.meHeightNow = +(G.players[0].kite.p[2]).toFixed(1);
    return out;
  });
  console.log('soak 6 min hard festival:', JSON.stringify(r));
  // results screen + payout
  const res = await p.evaluate(async () => { const g = window.__game; g.G.paused = false; const c0 = (document.querySelector('#coinCount') || {}).textContent; g.finishMatch(); await new Promise(r => setTimeout(r, 1500));
    return { results: !document.querySelector('#results').classList.contains('hidden'), title: document.querySelector('#resTitle').textContent, coins: document.querySelector('#resCoins') && document.querySelector('#resCoins').textContent.replace(/\s+/g, ' ').slice(0, 80), c0 }; });
  console.log('results:', JSON.stringify(res));
  await p.screenshot({ path: '' + (process.env.QA_OUT || 'qa-out') + '/results.png' });
  await p.click('#resAgain').catch(() => {}); await p.waitForTimeout(2500);
  console.log('play again starts a new match:', await p.isVisible('#game'));
  console.log('errors:', JSON.stringify([...new Set(errs)].slice(0, 5)));
  await b.close();
})();
