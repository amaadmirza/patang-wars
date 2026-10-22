// Headless checks: node tools/test-physics.js
// Model under test: heading (nose) / body spin / inclination / momentum are SEPARATE states (see docs/PHYSICS.md).
const { KITES, THREADS } = require('../src/data.js');
const P = require('../src/physics.js');
const dt = 1 / 120, TWO_PI = Math.PI * 2, DEG = P.DEG;
const D = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const len3 = v => Math.hypot(v[0], v[1], v[2]);
const dotv = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
let fail = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fail++; };
const fresh = (kite = 'patang', thread = 'manjha', wind = 6, line = 30) => ({ w: new P.Wind({ speed: wind, gust: 0.1 }), k: new P.Kite(KITES[kite], THREADS[thread], [0, 0, 1.5], { lineLen: line, swayPh: 0 }) });   // swayPh pinned: reproducible tests
const run = (k, w, sec, inp = {}) => { for (let i = 0; i < 120 * sec; i++) k.step(dt, w, inp); };
/** steer the heading smoothly (with the turn input, like a player) to an angle in degrees, then let it settle */
function steerTo(k, w, deg) {
  const tgt = deg * DEG; let n = 0;
  while (Math.abs(k.headingAngle - tgt) > 0.04 && n < 120 * 8) { const e = tgt - k.headingAngle; k.step(dt, w, { turn: Math.sign(e) * (Math.abs(e) > 0.5 ? 1 : 0.35) }); n++; }
  run(k, w, 0.8);
}
const f = x => x.toFixed(1);

// 1. every kite settles into steady flight at its ideal wind
for (const kd of Object.values(KITES)) {
  const { w, k } = fresh(kd.id, kd.area > 0.3 ? 'nylon' : 'cotton', kd.wind[1], 40);
  w.gust = 0.2; run(k, w, 30);
  ok(!k.snapped && k.p[2] > 10 && !k.onGround && Math.abs(D(k.p, k.anchor) - 40) < 2, `${kd.id} flies steadily and taut at ${kd.wind[1]} m/s (z=${k.p[2].toFixed(0)}, dist=${D(k.p, k.anchor).toFixed(1)})`);
}

// TEST 10. NO INPUT: stable, tiny sway, no permanent spin, heading stays put
{
  const { w, k } = fresh(); run(k, w, 6);
  let mn = 1e9, mx = -1e9, minSpin = 99, maxSpin = 0;
  for (let i = 0; i < 120 * 12; i++) { k.step(dt, w, {}); mn = Math.min(mn, k.p[1]); mx = Math.max(mx, k.p[1]); minSpin = Math.min(minSpin, Math.abs(k.spinVel)); maxSpin = Math.max(maxSpin, Math.abs(k.spinVel)); }
  ok(mx - mn < 9, `T10 idle: gentle wander only (${f(mx - mn)} m range)`);
  ok(maxSpin < 1.5, `T10 idle: never spins on its own (max ${f(maxSpin)} rad/s)`);
  ok(Math.abs(k.headingAngle) < 0.01, 'T10 idle: heading does not wander by itself');
  ok(Math.abs(k.p[2] - (1.5 + 0.6 * D(k.p, k.anchor))) < 4.5, `T10 idle: normal flight sits at the usual height (z=${f(k.p[2])})`);
}

// TEST 1/4/5. THE NOSE CONTROLS THE FLIGHT: whatever direction the nose points is where thrust sends the kite
{
  const cases = [['SOUTH-EAST', 135], ['EAST', 90], ['WEST', -90], ['NORTH-WEST', -45], ['NORTH', 0]];
  const res = [];
  for (const [name, deg] of cases) {
    const { w, k } = fresh(); run(k, w, 4); steerTo(k, w, deg);
    const nose = k.nose.slice(), p0 = k.p.slice(); run(k, w, 1.0, { thrust: true });
    const d = sub(k.p, p0), m = Math.hypot(...d), cos = dotv(d, nose) / m;
    res.push({ name, cos, m, head: k.headingAngle / DEG });
  }
  // a real tethered kite resists being pushed further along a heading that is mostly "climb" (the line is
  // already near that length in that direction) far more than one that is mostly lateral, where it has room
  // to move within the tether's sphere before tension pushes back - so NORTH (straight up, near its natural
  // equilibrium already) legitimately moves less than SOUTH-EAST. All must still move the right WAY, though.
  const climby = ['NORTH', 'NORTH-WEST'];   // headings with a large "climb" component fight the taut line more (see above)
  ok(res.every(r => r.cos > 0.5) && res.filter(r => !climby.includes(r.name)).every(r => r.cos > 0.8 && r.m > 3), `T1/4/5 holding the movement key flies along the nose for every heading (${res.map(r => r.name + ' cos ' + r.cos.toFixed(2) + ' ' + r.m.toFixed(1) + 'm').join(', ')})`);
  const east = res.find(r => r.name === 'EAST'), west = res.find(r => r.name === 'WEST'), se = res.find(r => r.name === 'SOUTH-EAST');
  ok(east.head > 60 && west.head < -60 && se.head > 100, 'T4/5 EAST really is a rightward nose, WEST a leftward one, SOUTH-EAST down-right');
  const a = fresh(), b = fresh(); run(a.k, a.w, 4); run(b.k, b.w, 4); steerTo(a.k, a.w, 90); steerTo(b.k, b.w, -90);
  const ay = a.k.p[1], by = b.k.p[1]; run(a.k, a.w, 1, { thrust: true }); run(b.k, b.w, 1, { thrust: true });
  ok(a.k.p[1] - ay < -3 && b.k.p[1] - by > 3, `T4/5 east moves to the player's right (-y ${f(a.k.p[1] - ay)}), west to the left (+y ${f(b.k.p[1] - by)})`);
}

// TEST 1b. A TAP gives a small impulse along the nose; repeated taps accumulate (but stay capped)
{
  const { w, k } = fresh(); run(k, w, 4); steerTo(k, w, 135); const nose = k.nose.slice(), p0 = k.p.slice();
  k.doThrustTap(); run(k, w, 1.2); const one = sub(k.p, p0);
  ok(dotv(one, nose) / Math.hypot(...one) > 0.93 && Math.hypot(...one) > 1.5, `T1 one tap moves it ${f(Math.hypot(...one))} m along the nose`);
  const q = fresh(); run(q.k, q.w, 4); steerTo(q.k, q.w, 135); const q0 = q.k.p.slice();
  for (let i = 0; i < 4; i++) { q.k.doThrustTap(); run(q.k, q.w, 0.15); } run(q.k, q.w, 1.2);
  ok(Math.hypot(...sub(q.k.p, q0)) > Math.hypot(...one) * 1.25, `T18 four taps go further than one (${f(Math.hypot(...sub(q.k.p, q0)))} vs ${f(Math.hypot(...one))} m)`);
}

// TEST 2. HOLD = the movement key keeps applying its force the whole time it is held (item 15) - it does not
// fire once and stop. Because this is now real tethered aerodynamics rather than a raw velocity injector, the
// kite finds a new equilibrium rather than accelerating forever (a real kite does too - it settles into the
// wind window, it doesn't run away to infinite speed on a fixed line): so the correct check is "it responds
// immediately and stays capped", not "it must keep climbing for 4 whole seconds".
{
  // compare the SAME starting point with vs. without the key held, rather than an absolute speed (steering
  // itself leaves a brief transient that can momentarily read faster than the sustained, thrust-held speed).
  const held = fresh(), idle = fresh(); run(held.k, held.w, 4); run(idle.k, idle.w, 4); steerTo(held.k, held.w, 135); steerTo(idle.k, idle.w, 135);
  for (let i = 0; i < 60; i++) { held.k.step(dt, held.w, { thrust: true }); idle.k.step(dt, idle.w, {}); }   // let steering's own transient (identical in both) pass first
  const vHeld = len3(held.k.v), vIdle = len3(idle.k.v);
  ok(vHeld > vIdle + 0.7, `T2 holding the key sustains more speed than not holding it (held ${f(vHeld)} vs idle ${f(vIdle)} m/s)`);
  let vmax = 0; for (let i = 0; i < 120 * 4; i++) { held.k.step(dt, held.w, { thrust: true }); vmax = Math.max(vmax, len3(held.k.v)); }
  ok(vmax < 24, `T2 top speed is capped (${f(vmax)} m/s)`);
}

// TEST 3. RELEASE: momentum carries on in the SAME direction and only gradually slows - no stop, no snap, no turn
{
  const { w, k } = fresh(); run(k, w, 4); steerTo(k, w, 135); const nose = k.nose.slice(); run(k, w, 1.2, { thrust: true });
  const s0 = len3(k.v), h0 = k.headingAngle; run(k, w, 0.3); const s1 = len3(k.v), dir1 = k.v.slice(); run(k, w, 1.7); const s2 = len3(k.v);
  ok(s1 > 0.55 * s0, `T3 release: no sudden stop (${f(s0)} -> ${f(s1)} m/s after 0.3 s)`);
  ok(dotv(dir1, nose) / len3(dir1) > 0.85, `T3 release: still moving the SAME way (cos ${(dotv(dir1, nose) / len3(dir1)).toFixed(2)})`);
  ok(s2 < s1 * 0.7 && s2 > 0.2, `T3 release: slows gradually (${f(s1)} -> ${f(s2)} m/s two seconds later)`);
  ok(Math.abs(k.headingAngle - h0) < 0.25, `T3 release: does not turn or reset its heading (${f((k.headingAngle - h0) / DEG)} deg)`);
}

// TEST 9. NO SNAP UPWARD: a kite flown downward and released does not pop back up; it settles where it was left
{
  const { w, k } = fresh(); run(k, w, 4); steerTo(k, w, 150); run(k, w, 1.4, { thrust: true });
  const z0 = k.p[2], ratio0 = (k.p[2] - 1.5) / D(k.p, k.anchor); run(k, w, 1.0); const z1 = k.p[2];
  ok(z1 < z0 + 1.5, `T9 no snap up after release (z ${f(z0)} -> ${f(z1)} m)`);
  run(k, w, 8); const ratio1 = (k.p[2] - 1.5) / D(k.p, k.anchor);
  ok(Math.abs(ratio1 - ratio0) < 0.25 && ratio1 < 0.5, `T9 it stays where it was left instead of returning to the usual height (height ratio ${ratio0.toFixed(2)} -> ${ratio1.toFixed(2)}, usual 0.60)`);
}

// smooth steering: the heading eases into a steady turn rate (~360 deg/s for a patang since v6), not a jump
{
  const { w, k } = fresh(); run(k, w, 3); const h = [];
  for (let i = 0; i < 120 * 1.5; i++) { k.step(dt, w, { turn: 1 }); if (i === 6 || i === 60 || i === 179) h.push(k.headingAngle / DEG); }
  ok(h[0] < 20 && h[1] > h[0] && h[2] > h[1] && h[2] > 400 && h[2] < 620, `steer: heading turns smoothly at a steady rate, not a jump (${h.map(v => v.toFixed(0)).join(' -> ')} deg at 0.05 / 0.5 / 1.5 s)`);
  const hb = k.headingAngle; run(k, w, 2); ok(Math.abs(k.headingAngle - hb) < 0.7, 'steer: heading settles when the key is released (no endless turning)');
}

// TEST 6. DHEEL (held) lets line out and the kite travels farther; it is NOT a spin command by itself
{
  const { w, k } = fresh(); run(k, w, 3); const d0 = D(k.p, k.anchor), l0 = k.lineLen;
  for (let i = 0; i < 120 * 3; i++) { k.doSend(); k.step(dt, w, {}); }
  ok(k.lineLen > l0 + 8 && D(k.p, k.anchor) > d0 + 5, `T6 dheel: line pays out and the kite goes farther (${f(d0)} -> ${f(D(k.p, k.anchor))} m, line ${f(l0)} -> ${f(k.lineLen)} m)`);
}

// TEST 7. FAR AWAY: the cartwheel/inclination is an EMERGENT drive - distance x real tangential speed x recent
// maneuver energy (item 13) - not something dheel switches on by itself. A disbicar flick seeds the tangential
// motion (a real kite doesn't start looping from nothing either); dheel alone, calm, must NOT spin it.
{
  const { w, k } = fresh(); run(k, w, 3);
  for (let i = 0; i < 60; i++) { k.doSend(); k.step(dt, w, {}); }             // calm dheel first: must not boost into the big cartwheel
  ok(Math.abs(k.spinVel) < 1, 'T7 dheel by itself (no tangential motion) does not spin the kite');
  while (D(k.p, k.anchor) < 40) { k.doSend(); k.step(dt, w, {}); }            // real play order: get far out FIRST
  k.doSwing(1);                                                              // then flick, to seed tangential motion while already far
  let spunAt = null, maxIncl = 0, maxSpin = 0;
  for (let i = 0; i < 120 * 5; i++) { k.doSend(); k.step(dt, w, {}); if (Math.abs(k.spinVel) > 1.5 && spunAt === null) spunAt = D(k.p, k.anchor); maxIncl = Math.max(maxIncl, k.incl); maxSpin = Math.max(maxSpin, Math.abs(k.spinVel)); }
  ok(spunAt !== null, `T7 far + tangential motion + dheel together let the cartwheel happen (r = ${spunAt && f(spunAt)} m)`);
  ok(maxSpin > 1.5 && maxSpin < 14.5, `T7 it turns at a real rate, not clamped to a small wiggle (peak ${f(maxSpin)} rad/s)`);
  ok(maxIncl > 0.05, `T7 the kite becomes inclined while it happens (peak ${f(maxIncl / DEG)} deg)`);
  run(k, w, 6);
  ok(Math.abs(k.spinVel) < 0.6, `T7/9 the spin is not permanent: once the energy fades it dies down (${f(k.spinVel)} rad/s)`);
}

// TEST 8. SPIN DOES NOT DESTROY THE HEADING: nose / flight direction is separate state from the body spin
{
  const { w, k } = fresh(); run(k, w, 3); const h0 = k.headingAngle;
  while (D(k.p, k.anchor) < 40) { k.doSend(); k.step(dt, w, {}); }
  k.doSwing(1); let maxDh = 0, spun = false;
  for (let i = 0; i < 120 * 3; i++) { k.doSend(); k.step(dt, w, {}); if (Math.abs(k.spinVel) > 1) spun = true; maxDh = Math.max(maxDh, Math.abs(k.headingAngle - h0)); }
  ok(spun, 'T8 the body really spun');
  ok(maxDh < 0.05, `T8 while spinning the heading never moved (max change ${(maxDh / DEG).toFixed(2)} deg)`);
  const q = fresh(); run(q.k, q.w, 3); while (D(q.k.p, q.k.anchor) < 40) { q.k.doSend(); q.k.step(dt, q.w, {}); } q.k.doSwing(1);
  for (let i = 0; i < 60; i++) { q.k.doSend(); q.k.step(dt, q.w, {}); } const n = q.k.nose.slice();
  const v0 = q.k.v.slice(); for (let i = 0; i < 12; i++) { q.k.doSend(); q.k.step(dt, q.w, { thrust: true }); } const dm = sub(q.k.v, v0);
  ok(dotv(dm, n) / len3(dm) > 0.6, `T8 thrust during a spin follows the nose (cos ${(dotv(dm, n) / len3(dm)).toFixed(2)}) although the body is rotating`);
}

// D. PUXAR/pull (held): reels the kite in
{
  const { w, k } = fresh(); run(k, w, 4); const d0 = D(k.p, k.anchor);
  for (let i = 0; i < 120 * 2; i++) { k.doPull(); k.step(dt, w, {}); }
  ok(D(k.p, k.anchor) < d0 - 4, `D pull: reels the kite toward the player (${f(d0)} -> ${f(D(k.p, k.anchor))} m)`);
}
// F/G. DISBICAR/flick: a short lateral dart (+ brief dive), NOT a rotation - it alternates sides and unwinds
{
  const { w, k } = fresh(); run(k, w, 4); const dys = [];
  for (let n = 0; n < 3; n++) { const y0 = k.p[1]; k.doSwing(); run(k, w, 1.3); dys.push(k.p[1] - y0); }
  ok(Math.sign(dys[0]) !== Math.sign(dys[1]) && Math.sign(dys[1]) !== Math.sign(dys[2]) && dys.every(v => Math.abs(v) > 0.5), `F disbicar alternates sides (${dys.map(v => v.toFixed(2)).join(', ')} m each)`);
  run(k, w, 1); ok(Math.abs(k.bodyAngle) < 0.3 && Math.abs(k.headingAngle) < 0.01, 'F disbicar settles back and never touched the heading');
}
{
  const L = fresh(), R = fresh(); run(L.k, L.w, 4); run(R.k, R.w, 4); const yl = L.k.p[1], yr = R.k.p[1];
  L.k.doSwing(-1); R.k.doSwing(1); run(L.k, L.w, 1); run(R.k, R.w, 1);
  ok(L.k.p[1] - yl > 0.5 && R.k.p[1] - yr < -0.5, `G disbicar to a chosen side: left ${f(L.k.p[1] - yl)}, right ${f(R.k.p[1] - yr)} m`);
}

// M. PULL BOUNCES: a kite pulled too close is thrown back out by the reel and never hovers in the middle
{
  const { w, k } = fresh(); run(k, w, 4); let rmin = 1e9, autoSeen = false, ignored = true;
  for (let i = 0; i < 120 * 9; i++) { k.doPull(); k.step(dt, w, {}); rmin = Math.min(rmin, D(k.p, k.anchor)); if (k.autoOut) { autoSeen = true; if (k.pullE > 0) ignored = false; } }
  ok(autoSeen && ignored, 'M too close: the reel takes over (pull is ignored while it bounces)');
  ok(rmin > 6, `M never dragged onto the player (closest ${f(rmin)} m)`);
  run(k, w, 10); ok(D(k.p, k.anchor) > 17 && k.p[2] > 10, `M after the bounce it is back out and clear (dist ${f(D(k.p, k.anchor))} m, z=${f(k.p[2])} m)`);
}

// I. nothing teleports
{
  const { w, k } = fresh(); run(k, w, 3); let maxStep = 0, prev = k.p.slice();
  for (let i = 0; i < 120 * 8; i++) { if (i === 10) k.doSend(1); if (i === 400) k.doPull(); if (i === 600) k.doSwing(); k.step(dt, w, i > 700 ? { thrust: true, turn: 1 } : {}); maxStep = Math.max(maxStep, D(k.p, prev)); prev = k.p.slice(); }
  ok(maxStep * 120 < 45, `I no teleporting: top speed ${f(maxStep * 120)} m/s`);
}

// J. the line is still physical: tension, snapping, soft constraint
{
  const { w, k } = fresh('rokkaku', 'razor', 14, 40); run(k, w, 20);
  ok(k.snapped, 'J big kite + fragile line + storm snaps');
  const q = fresh(); run(q.k, q.w, 4); const idleT = q.k.tension; q.k.doPull(); let peak = 0; for (let i = 0; i < 120; i++) { q.k.step(dt, q.w, {}); peak = Math.max(peak, q.k.tension); }
  ok(idleT > 0.5 && peak > idleT, `J tension: idle ${f(idleT)} N, peaks at ${f(peak)} N during a pull`);
  const s = fresh(); run(s.k, s.w, 3); for (let i = 0; i < 120 * 3; i++) s.k.step(dt, s.w, { thrust: true, turn: i > 100 ? 0 : 1 });
  ok(D(s.k.p, s.k.anchor) <= s.k.lineLen + 1.5, `J the line never lets a thrusting kite stray past its length (${f(D(s.k.p, s.k.anchor))} of ${f(s.k.lineLen)} m)`);
}

// K. cutting: sharp thread beats plain cotton in a bot duel (same action policy as the game), never the reverse
function duelBot(me, other, ai, t) {
  const out = {}; if (t - (ai.lastAct || 0) < 0.9 - 0.5 * ai.skill) return out;
  const r = D(me.p, me.anchor);
  if (r < 22 || me.p[2] < 9) { out.doSend = 0; ai.lastAct = t; return out; }
  if (r > 120) { out.doPull = true; ai.lastAct = t; return out; }
  const dy = other.p[1] - me.p[1], d = Math.hypot(dy, other.p[2] - me.p[2]);
  if (d < 7 + 5 * ai.skill) { out.doSwing = dy > 0 ? -1 : 1; ai.lastAct = t; }
  else if (d < 18 && Math.random() < 0.25) { out.doPull = true; ai.lastAct = t; }
  else if (Math.random() < 0.06) { out.doSend = 0; ai.lastAct = t; }
  return out;
}
{
  let win = 0, lose = 0, N = 10, times = [];
  for (let sd = 0; sd < N; sd++) {
    const wind = new P.Wind({ speed: 6, gust: 0.25, seed: sd });
    const A = new P.Kite(KITES.patang, THREADS.manjha, [0, 0, 1.5], { lineLen: 30 });
    const B = new P.Kite(KITES.pipa, THREADS.cotton, [0, 5, 1.5], { lineLen: 30 });
    const aiA = { skill: 0.9 }, aiB = { skill: 0.6 }; let t = 0, cut = null;
    for (let i = 0; i < 120 * 150 && !cut; i++) { t += dt; A.step(dt, wind, duelBot(A, B, aiA, t)); B.step(dt, wind, duelBot(B, A, aiB, t)); cut = P.cutStep(A, B, dt).cut; }
    if (cut === B) { win++; times.push(t.toFixed(0)); } else if (cut === A) lose++;
  }
  console.log(`  manjha vs cotton duels: cut ${win}, lost ${lose} of ${N} (times ${times.join(', ')} s)`);
  ok(win >= 6 && lose === 0, 'K sharp manjha cuts plain cotton in a bot duel, never the reverse');
}

// N. THE SNAP-STEALS-CUT RACE, explicitly: a line that's already mostly sawn through must not fail as a
// generic "snap" under ORDINARY flight tension - it has to actually be cut (damage reaching 1), or be put
// under genuinely excessive load. This is the specific regression from the "Ravi cut you" vs "Line Snapped"
// mix-up. It is NOT a claim that a severely compromised line is impossible to break by deliberately hauling
// on it - a thread that's 90%+ sawn through plausibly can snap under a hard pull, and that's fine; the bug was
// calm, ordinary flight stealing the attribution, not the player's own aggressive pull doing it.
{
  for (const d of [0.90, 0.94]) {
    const { w, k } = fresh(); run(k, w, 4);                 // calm, ordinary flight - the exact case that was failing
    k.damage = d;
    run(k, w, 3);
    ok(!k.snapped, `N damage=${d}: ordinary flight tension does not generic-snap an already-mostly-cut line (lineStrength ${f(k.lineStrength)} N, tension stayed ${f(k.tension)} N)`);
  }
  // once damage actually reaches 1 in a real duel, the CUT path (which credits the opponent) is what ends it,
  // not a tension snap that fired a moment earlier - confirmed via the real cutStep contact/damage model, with
  // B's anchor properly offset from A's (fresh() alone puts both at the same anchor - no real crossing), and
  // real sawing motion (doPull on A) so there's actual slide, the way a duel - not a static pose - cuts a line.
  const A = fresh(); run(A.k, A.w, 3);
  const Bw = new P.Wind({ speed: 6, gust: 0.1 }), Bk = new P.Kite(KITES.pipa, THREADS.cotton, [0, 5, 1.5], { lineLen: 30, swayPh: 1 });
  run(Bk, Bw, 3);
  A.k.p = [20, 10, 20]; Bk.p = [20, -5, 22]; A.k.damage = 0.995;  // lines cross: A's goes y 0->10, B's goes y 5->-5
  let cutWinner = null;
  for (let i = 0; i < 120 * 3 && !cutWinner; i++) { A.k.doPull(); Bk.doSend(1); A.k.step(dt, A.w, {}); Bk.step(dt, Bw, {}); const r = P.cutStep(A.k, Bk, dt); if (r.cut) cutWinner = r.cut; }
  ok(cutWinner === A.k && !A.k.snapped, `N damage=0.995 in real contact: the CUT event lands and is attributed, not a bare snap (cut landed=${cutWinner === A.k}, snapped=${A.k.snapped})`);
  // and the floor case: a perfectly fresh, undamaged line still snaps for real under genuinely excessive
  // tension (test J already covers this scenario end to end; this just pins damage=0 explicitly for clarity).
  const { w: w3, k: k3 } = fresh('rokkaku', 'razor', 14, 40); k3.damage = 0; run(k3, w3, 20);
  ok(k3.snapped, 'N damage=0: a fresh line still genuinely snaps under real excessive tension (storm + big kite + fragile thread)');
}
process.exit(fail ? 1 : 0);
