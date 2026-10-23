// usage: node perf.js <url> <label> [seconds] [throttle] ; prints fps stats; screenshots into qa-out/<label>-*.png
const { chromium } = require(process.env.PLAYWRIGHT || 'playwright');
require('fs').mkdirSync('qa-out', { recursive: true });
(async () => {
  const [url, label, secs = '25', thr = '4'] = process.argv.slice(2);
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  await ctx.addInitScript(({ q, sk }) => { let __a = 12345; if (sk.includes('alpha')) window.__alpha = 1; Math.random = () => { __a = (__a + 0x6D2B79F5) >>> 0; let t = Math.imul(__a ^ (__a >>> 15), 1 | __a); t ^= t + Math.imul(t ^ (t >>> 7), 61 | t); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; if (sk) window.__skip = Object.fromEntries(sk.split(',').map(x => [x, 1])); if (q) { window.__QS = +q.split(',')[0]; window.__QL = q.split(',')[1] === 'low'; } if (!localStorage.getItem('kiteGame')) localStorage.setItem('kiteGame', JSON.stringify({ tutDone: true, netName: 'Tester', theme: 'dark' })); }, { q: process.env.QS || '', sk: process.env.SKIP || '' });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(url); await p.waitForTimeout(2500);
  await p.click('#splashGo'); await p.waitForTimeout(1500);
  await p.screenshot({ path: `qa-out/${label}-hub.png` });
  const ok = await p.evaluate(() => {
    const g = window.__game; if (!g) return 'no hook'; document.querySelectorAll('#loginPop,#rewardPop').forEach(e => e.classList.add('hidden'));
    g.startMatch('festival', g.matchCfg({ bots: 9, diff: 'hard', mtime: 0 }));
    const G = g.G, me = G.players[0], bot = G.players.find(x => x.ctrl === 'bot');
    me.ctrl = 'bot'; me.ai = JSON.parse(JSON.stringify(bot.ai)); me.ai.prefR = 50; me.kite.sawMul = 1.35; if (window.__QS) g.qual(window.__QS, window.__QL); return 'ok';
  });
  console.log('start:', ok);
  const cdp = await ctx.newCDPSession(p);
  await p.waitForTimeout(4000);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: +thr });
  await p.evaluate(() => { window.__ft = []; window.__perf = null; let l = performance.now(); const f = n => { window.__ft.push(n - l); l = n; window.__pech = (window.__pech || 0) + (window.__game.G && window.__game.G.players.some(p => p.kite && p.kite._pechaDraw && p.kite._pechaDraw.length) ? 1 : 0); if (window.__ft.length < 1e5) requestAnimationFrame(f); }; requestAnimationFrame(f); });
  const T = +secs * 1000;
  for (let i = 0; i < 3; i++) { await p.waitForTimeout(T / 3); await p.screenshot({ path: `qa-out/${label}-m${i}.png` }); }
  const r = await p.evaluate(() => { const ft = window.__ft.slice(2), P = window.__perf, tot = ft.reduce((a, b) => a + b, 0); const s = [...ft].sort((a, b) => a - b);
    return { frames: ft.length, fps: +(1000 * ft.length / tot).toFixed(1), p50: +s[Math.floor(s.length * .5)].toFixed(1), p95: +s[Math.floor(s.length * .95)].toFixed(1), max: +s[s.length - 1].toFixed(0), over50: +(100 * ft.filter(x => x > 50).length / ft.length).toFixed(1), over100: ft.filter(x => x > 100).length,
      stepMs: +(P.step / P.frames).toFixed(2), renderMs: +(P.render / P.frames).toFixed(2), pechaFrames: window.__pech, dpr: (() => { const c = document.querySelector('#game canvas, canvas#c, canvas'); return c ? (c.width / innerWidth).toFixed(2) : '?'; })() }; });
  console.log(label, JSON.stringify(r)); const L = await p.evaluate(() => (window.__long || []).slice(-400)); const top = [...L].sort((a, b) => b.raw - a.raw).slice(0, 12); console.log("longest", JSON.stringify(top)); console.log("long frames", L.length, "with must-repaints", L.filter(x => x.must).length, "with resize", L.filter(x => x.resized).length, "avg figs in long", (L.reduce((a, b) => a + b.figs, 0) / Math.max(1, L.length)).toFixed(2)); console.log('errors', JSON.stringify(errs.slice(0, 5)));
  await b.close();
})();
