/* Pecha: a real, long-running line-vs-line engagement (browser: window.KitePecha, node: require).
 *
 * How a real pecha works, and what this models:
 *  - It starts the moment two lines meet. Where they meet, one line is on TOP and the other UNDER - "pecha from
 *    above" vs "from below" - and that is remembered for the whole engagement.
 *  - Once pressed together the lines are HOOKED: they cannot pass through each other. Flying on drags the other
 *    line along; the only clean way out is to REVERSE the way you came in (or the crossing slides off a line's tip).
 *  - What cuts is LINE MATERIAL MOVING THROUGH THE CROSSING. A line being pulled in fast (khainch) or let out fast
 *    (dheel) drags its glass-coated length across ONE spot of the other line - the still line takes all the wear on
 *    that one spot and goes first. That's why a sharp, fast khainch wins a pecha against a flier who just holds,
 *    and why a held line loses. If both are worked, sharpness, strength, tension and who works harder decide it.
 *  - A pecha cannot sit forever: even two still lines rub as the kites sway, and the longer it lasts the more the
 *    coating has chewed in, so a stalled pecha always ends - it never hangs in the middle of the sky.
 * Physics.js's own cutStep is left untouched; the game uses this instead. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./physics.js'));
  else root.KitePecha = factory(root.KitePhysics);
})(typeof self !== 'undefined' ? self : this, function (P) {
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const len = a => Math.sqrt(dot(a, a));
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));

  // reach: contact radius (m). k: cut gain (tuned so a sharp, fast khainch against a held line cuts in ~1-2 s, a
  //   worked-vs-worked fight lasts a few seconds, and two held lines still part within ~15 s).
  // creep: base rub of two hooked lines, growing with time (`grow` per second) so a pecha can't stall.
  // give/maxPush: how hard hooked lines hold each other (low, so kites drag rather than freeze in place).
  const CFG = { reach: 1.8, k: 0.045, creep: 0.35, grow: 0.12, base: 0.3, sweepMax: 1.2, spread: 0.12, maxSlide: 14, release: 3, releaseHold: 0.3, apart: 25,
    slipEnd: 0.985, slipHold: 0.5, hookK: 9, hookDamp: 5, hookMax: 30, playerSaw: 1.3, fast: 5,
    // a real pecha happens up in the sky, between kites that are near each other. Without these, a bot flying from a
    // roof 60 m away could hook your line a few metres above your head, which looked wrong.
    startDist: 65,   // kites must be within this many metres of each other for a pecha to begin (38 was too fiddly)
    keepDist: 95,    // an ongoing pecha lets go if the kites drift further apart than this
    minS: 0.2,
    tipS: 0.93,
    // v6.4: a line can be in up to TWO pechas at once - a third kite may fly across a pecha that is already on and join it
    // (two lines against one, or a team-mate coming to help). More than that and nobody could see who is cutting whom.
    maxHooks: 2,
    // upar / neeche: from ON TOP, dheel cuts best (the running dor is pressed down into the other by its own weight); from
    // BELOW, khainch cuts best (you haul up into it). Each gives up to this much extra bite.
    sideBonus: 0.2,
    // jhatka: a tunka in a pecha - one sharp jerk saws hard for a moment. Up to this much extra, fading in jhatkaT seconds,
    // at most one every jhatkaGap seconds (so tapping wildly, or a client claiming to tug every frame, gains nothing more).
    jhatka: 0.9, jhatkaT: 0.3, jhatkaGap: 0.3,
    // v6.5: after a pecha lets go, the same two lines wait this long before they can hook again (no flickering re-hooks)
    rehook: 1.5 };   // the crossing must be clear of both kites' own ends to hook     // the crossing must be above the bottom fifth of both lines (not right down by someone's roof)

  /** May these two lines START a pecha now? (An ongoing one always may continue.) `a.hooks` / `b.hooks` = how many
   *  pechas each line is already hooked in, counted by the caller every frame. */
  const canHook = (a, b, st, cfg = CFG) => !!(st && st.locked) || ((a.hooks | 0) < cfg.maxHooks && (b.hooks | 0) < cfg.maxHooks);
  /** One frame of one pair. `st` is a persistent per-pair object owned by the caller ({} to start). */
  function step(A, B, dt, st, cfg = CFG) {
    if (A.free || B.free) { st.on = false; return { contact: false }; }
    // a kite that has come down onto a roof has its dor lying across the roofs, not up in the sky where the other line
    // crosses it: the other line slips off and the pecha is over (it used to carry on, and even be won, from the ground)
    const grounded = k => k.onGround || k.p[2] < 0.4;
    if (grounded(A) || grounded(B)) { const was = st.on; st.on = false; return was ? { contact: false, released: 'ground' } : { contact: false }; }
    const c = P.closestSegments(A.anchor, A.p, B.anchor, B.p);
    const rad = (A.thread.dia + B.thread.dia) / 2 + cfg.reach;
    const LA = sub(A.p, A.anchor), LB = sub(B.p, B.anchor), rA = len(LA) || 1e-6, rB = len(LB) || 1e-6;
    const dA = mul(LA, 1 / rA), dB = mul(LB, 1 / rB);
    let n = cross(LA, LB);
    const nl = len(n); n = nl < 1e-6 ? (st.nPrev || [0, 0, 1]) : mul(n, 1 / nl);
    if (st.on && st.nPrev && dot(n, st.nPrev) < 0) n = mul(n, -1);   // keep "which side" continuous through the whole pecha
    st.nPrev = n;
    const sd = dot(sub(c.c1, c.c2), n);               // which side of B's line A's line is on, along the crossing normal
    const offEnd = c.s > cfg.slipEnd || c.t > cfg.slipEnd || c.s < 0.02 || c.t < 0.02;

    st.started = false;
    const kiteGap = len(sub(A.p, B.p));
    if (!st.on && st.cool > 0) { st.cool -= dt; return { contact: false }; }
    if (!st.on) {
      if (c.dist > rad || offEnd) return { contact: false };
      if (kiteGap > cfg.startDist || c.s < cfg.minS || c.t < cfg.minS) return { contact: false };
      // a kite flying INTO another line meets it with its own tip first (the crossing sits at s ~ 1 on its own line).
      // Hooking right there left the pair touching tip-to-line, and a moment later the crossing slid off the tip and the
      // pecha "released" after half a second - so dheel and khainch never had time to do anything. A real pecha starts
      // when the kite has flown ACROSS the other line and its own dor drapes over it: the crossing is then out along
      // both lines. Until then the kite simply passes by.
      if (c.s > cfg.tipS || c.t > cfg.tipS) return { contact: false };
      st.on = true; st.locked = false; st.side = sd >= 0 ? 1 : -1; st.t = 0; st.touchT = 0; st.clearT = 0; st.slipT = 0;
      st.xA = c.s * rA; st.xB = c.t * rB;
      st.aAbove = c.c1[2] >= c.c2[2];
    }
    const pen = -st.side * sd;                          // > 0: the lines are pressing into each other
    // HOOKED = the two dor are wrapped round each other at the crossing. A kite that has flown on past the other line
    // bends its own dor over it there: measured with straight lines that looks like the crossing sitting at the kite's
    // tip and the lines "through" each other (pen > 0) - but it is the deepest, firmest hook there is, not a release.
    // (Treating that as the crossing sliding off the tip ended nearly every pecha after half a second.) The crossing
    // only slides off a tip - "pecha nikal gaya" - when a kite has come BACK to its own side (pen < 0).
    const deep = st.locked && pen > rad;
    st.slipT = (st.locked && pen < 0 && (c.s > cfg.slipEnd || c.t > cfg.slipEnd)) ? (st.slipT || 0) + dt : 0;
    if (st.slipT > cfg.slipHold) { st.on = false; st.cool = cfg.rehook; return { contact: false, released: 'slip' }; }
    if (!st.locked) {
      // lines lying almost in one plane (two kites at the same distance, the usual rooftop case) can rub without one
      // ever "pressing through" the other - that used to leave the pair brushing forever, neither hooked nor
      // released. Touching for a moment is enough: the manjha bites and the pecha is on.
      st.brushT = c.dist <= rad ? (st.brushT || 0) + dt : 0;
      if (pen > -0.05 || st.brushT > 0.2) { st.locked = true; st.started = true; st.aAbove = c.c1[2] >= c.c2[2]; }
      else if (c.dist > rad * 1.5) { st.on = false; st.cool = cfg.rehook; return { contact: false, released: 'brush' }; }
    }
    // backed out the way it came: clearly back on its own side AND held clear for a moment
    st.clearT = (pen < 0 && c.dist > cfg.release) ? (st.clearT || 0) + dt : 0;
    if (st.clearT > cfg.releaseHold) { st.on = false; st.cool = cfg.rehook; return { contact: false, released: 'back' }; }
    if ((c.dist > cfg.apart && pen < 0) || kiteGap > cfg.keepDist) { st.on = false; st.cool = cfg.rehook; return { contact: false, released: 'apart' }; }

    st.t += dt;
    const sA = Math.max(c.s, 0.25), sB = Math.max(c.t, 0.25);
    // ---- the hook: lines can't pass through each other. Only the velocity that would carry the crossing through is
    // taken away (plus a soft overlap correction), kept sideways to each kite's own line, split by mass. Gentle on
    // purpose: an earlier, stiffer hook pinned both kites in one spot, which is exactly the "stuck pecha". ----
    // Per SECOND now (it was a fixed kick per frame - about 40x too hard at 120 frames a second - which threw a kite
    // that hooked at speed straight back off the line). A soft spring on how deep the hook is plus a damper on the
    // closing speed: the lines drag each other along, the kites are not pinned and not bounced.
    if (pen > -0.05) {
      const vAc = mul(A.v, c.s), vBc = mul(B.v, c.t);
      const relN = dot(sub(vAc, vBc), n) * st.side;
      const dvn = clamp(cfg.hookDamp * Math.max(0, -relN) + cfg.hookK * Math.min(Math.max(0, pen), 4), 0, cfg.hookMax) * dt;
      if (dvn > 0) {
        const mA = A.virtualMass, mB = B.virtualMass;
        // v7.6: a kite that is being FLOWN (Fly held, or steered) drags the other line along instead of being braked by it
        // - players found their kite "won't move" in a pecha: with Fly held it spent up to 40% of the fight under 0.6 m/s.
        const drv = K => clamp((K.thrustRamp || 0) + Math.abs(K.headingVel || 0) / 6, 0, 1), gA = drv(A), gB = drv(B);
        let wA = mB / (mA + mB), wB = mA / (mA + mB);
        const shift = 0.7 * (gA * wA - gB * wB); wA -= shift; wB += shift;
        const sideways = (d, dv) => sub(dv, mul(d, dot(dv, d)));
        A.v = add(A.v, sideways(dA, mul(n, st.side * dvn * wA / sA)));
        B.v = add(B.v, sideways(dB, mul(n, -st.side * dvn * wB / sB)));
      }
    }
    st.n = n; st.a = A; st.b = B;
    // where the dor actually cross: while the lines lie straight across each other, the closest points; once a kite
    // has flown on past and bent its dor over the other line, the crossing stays on the other line where it was hooked
    // (sliding along with it) - the hooked line is drawn bent through that point
    if (!deep || st.tH == null) st.tH = st.tH == null ? c.t : st.tH + (c.t - st.tH) * Math.min(1, dt / 0.25);
    if (!deep || st.sH == null) st.sH = st.sH == null ? c.s : st.sH + (c.s - st.sH) * Math.min(1, dt / 0.25);
    const H = deep ? add(B.anchor, mul(LB, st.tH)) : mul(add(c.c1, c.c2), 0.5);
    st.point = H; st.sA = deep ? clamp(len(sub(H, A.anchor)) / (len(sub(H, A.anchor)) + len(sub(A.p, H)) || 1), 0.05, 0.97) : c.s; st.sB = deep ? st.tH : c.t;

    // ---- how fast each line's MATERIAL moves through the crossing (m/s, + = outward toward the kite):
    // reel rate (line flowing in/out through the hands) minus how fast the crossing itself slides along that line ----
    const xA = c.s * rA, xB = c.t * rB;
    const slideA = clamp((xA - (st.xA ?? xA)) / dt, -15, 15), slideB = clamp((xB - (st.xB ?? xB)) / dt, -15, 15);
    st.xA = xA; st.xB = xB;
    st.uA = (st.uA ?? 0) + (clamp((A.reelRate || 0) - slideA, -18, 18) - (st.uA ?? 0)) * Math.min(1, dt / 0.08);   // smoothed: a single
    st.uB = (st.uB ?? 0) + (clamp((B.reelRate || 0) - slideB, -18, 18) - (st.uB ?? 0)) * Math.min(1, dt / 0.08);   // frame's jitter isn't a saw stroke
    const touching = pen > -rad;
    // lines hanging apart without touching for a while: the pecha is over (it used to stay "on" in this limbo - no
    // sawing, no release - which is the stuck-in-the-middle pecha). A fresh touch starts a new one at once.
    st.gapT = touching ? 0 : (st.gapT || 0) + dt;
    if (st.gapT > 1.2) { st.on = false; st.cool = cfg.rehook; return { contact: false, released: 'back' }; }
    if (!touching) return { contact: false, engaged: true };
    st.touchT += dt;

    // ---- sawing ----
    const uA = st.uA, uB = st.uB;
    let vr = sub(mul(A.v, c.s), mul(B.v, c.t)); vr = sub(vr, mul(n, dot(vr, n)));
    // ---- SAWING: what cuts is the flier's own line WORK - dor hauled in (khainch) or let run out (dheel) through the
    // crossing. Each line's STROKE is how fast its own dor is moving through the hands. The kites merely sweeping
    // past each other counts for little (it used to count fully, and with kites now flying at real speeds a pecha
    // was decided by the collision itself in half a second, before anyone could khainch or dheel).
    //   - A's stroke cuts B. A held line (no stroke) cuts only by the slow creep of two hooked lines.
    //   - Wear lands on ONE spot of a line that is NOT moving; a line that is itself running (khainch or dheel) keeps
    //     bringing fresh dor to the crossing, so it spreads the wear and holds out longer. So: work your line,
    //     and the one who works harder - and with the sharper manjha - wins. ----
    st.rlA = (st.rlA ?? 0) + (Math.abs(A.reelRate || 0) - (st.rlA ?? 0)) * Math.min(1, dt / 0.12);
    st.rlB = (st.rlB ?? 0) + (Math.abs(B.reelRate || 0) - (st.rlB ?? 0)) * Math.min(1, dt / 0.12);
    const sweep = Math.min(cfg.sweepMax, 0.25 * len(vr));
    const strokeA = Math.min(cfg.maxSlide, st.rlA), strokeB = Math.min(cfg.maxSlide, st.rlB);
    const burst = u => 1 + 0.5 * clamp((u - cfg.fast) / 5, 0, 1);             // a really fast khainch/dheel bites harder
    // jhatka: the rising edge of a tunka (tunkaT jumps to 1), at most one every jhatkaGap seconds
    const jerk = (K, key) => { const tk = +K.tunkaT || 0, prev = st['tk' + key] || 0; st['cd' + key] = Math.max(0, (st['cd' + key] || 0) - dt);
      if (tk > 0.9 && prev < 0.7 && st['cd' + key] <= 0) { st['j' + key] = 1; st['cd' + key] = cfg.jhatkaGap; }
      st['tk' + key] = tk; st['j' + key] = Math.max(0, (st['j' + key] || 0) - dt / cfg.jhatkaT); return st['j' + key]; };
    const jA = jerk(A, 'A'), jB = jerk(B, 'B');
    // upar / neeche: dheel from on top, khainch from below
    const side = (K, above) => 1 + cfg.sideBonus * clamp(above ? (K.sendE || 0) : (K.pullE || 0), 0, 1);
    const workA = (cfg.base + strokeA * burst(strokeA) + sweep) * (A.sawMul || 1) * side(A, st.aAbove) * (1 + cfg.jhatka * jA);
    const workB = (cfg.base + strokeB * burst(strokeB) + sweep) * (B.sawMul || 1) * side(B, !st.aAbove) * (1 + cfg.jhatka * jB);
    const spreadA = 1 / (1 + cfg.spread * strokeA), spreadB = 1 / (1 + cfg.spread * strokeB);   // own running line = fresh dor at the crossing
    const slide = strokeA + strokeB + sweep;
    const press = !st.locked ? 0.25 : pen > -0.05 ? 1 : 0.6;        // a brush barely saws
    const tens = clamp(0.6 + 0.4 * (A.tension + B.tension) / 18, 0.6, 1.5);
    st.chew = Math.min(25, (st.chew || 0) + dt);                     // kept across a brief part-and-rehook of the same pair
    const creep = cfg.creep + cfg.grow * st.chew;                    // the longer it lasts, the deeper it has chewed
    const toughB = Math.sqrt(B.thread.strength / 28), toughA = Math.sqrt(A.thread.strength / 28);
    // visualOnly: online, the browser shows the hook and the bent lines but the SERVER alone decides wear and cuts
    const rateB = cfg.k * A.thread.sharp * (creep + workA) * spreadB * press * tens / toughB, rateA = cfg.k * B.thread.sharp * (creep + workB) * spreadA * press * tens / toughA;
    const shareA = rateB / (rateA + rateB || 1);   // who is cutting whom right now (for the pecha meter)
    if (cfg.visualOnly) return { contact: true, hooked: pen > -0.05, slide, point: st.point, sA: st.sA, sB: st.sB, aAbove: st.aAbove, cut: null, uA, uB, shareA, dmgA: rateA, dmgB: rateB, jA, jB };
    B.damage += rateB * dt;
    A.damage += rateA * dt;
    // nearly-blunt threads (cotton/nylon both ways) still have to end: friction heat eventually parts the weaker one
    if (st.chew > 12) { const w = 0.05 * dt; if (A.lineStrength < B.lineStrength) A.damage += w; else B.damage += w; }
    const out = { contact: true, hooked: pen > -0.05, slide, point: st.point, sA: st.sA, sB: st.sB, aAbove: st.aAbove, cut: null, uA, uB, shareA, dmgA: rateA, dmgB: rateB, jA, jB };
    if (A.damage >= 1 || B.damage >= 1) {
      const loser = A.damage >= B.damage ? A : B;
      loser.releaseLine('cut'); out.cut = loser; st.on = false;
    }
    return out;
  }

  /** Line points bent through the crossing, for drawing a hooked line (anchor -> crossing -> kite). */
  function bentLine(k, point, s, above, n = 24) {
    const pts = [], up = above ? 0.06 : -0.06, P0 = k.anchor, P1 = [point[0], point[1], point[2] + up], P2 = k.p;
    const sag = (a, b, f) => Math.min(len(sub(b, a)) * 0.04, 1.2) * 4 * f * (1 - f);
    const n1 = Math.max(2, Math.round(n * s)), n2 = Math.max(2, n - n1);
    for (let i = 0; i <= n1; i++) { const f = i / n1, q = add(P0, mul(sub(P1, P0), f)); q[2] -= sag(P0, P1, f); pts.push(q); }
    for (let i = 1; i <= n2; i++) { const f = i / n2, q = add(P1, mul(sub(P2, P1), f)); q[2] -= sag(P1, P2, f) * 0.5; pts.push(q); }
    return pts;
  }

  /** A line hooked in more than one pecha: bent through every crossing, in order along it. list: [{ point, s, above }] */
  function bentLineMulti(k, list, n = 28) {
    if (!list.length) return null;
    if (list.length === 1) return bentLine(k, list[0].point, list[0].s, list[0].above, n);
    const pts = [], seq = [k.anchor, ...list.slice().sort((x, y) => x.s - y.s).map(c => [c.point[0], c.point[1], c.point[2] + (c.above ? 0.06 : -0.06)]), k.p];
    const per = Math.max(2, Math.round(n / (seq.length - 1)));
    for (let j = 0; j < seq.length - 1; j++) { const P0 = seq[j], P1 = seq[j + 1], sg = Math.min(len(sub(P1, P0)) * 0.04, 1.2);
      for (let i = j ? 1 : 0; i <= per; i++) { const f = i / per, q = add(P0, mul(sub(P1, P0), f)); q[2] -= sg * 4 * f * (1 - f) * (j === seq.length - 2 ? 0.5 : 1); pts.push(q); } }
    return pts;
  }
  /* Who gets the cut when more than one line is sawing a kite: whoever did the most of the cutting lately (each rival's
   * damage, fading over ~3 s). The pair that happens to push the wear past 100% must not take it - with two lines on one,
   * that was often the one that had barely touched it. creditSaw(victim, rival, damagePerSecond, dt, now) after each
   * frame of contact; topSawer(victim, now, fallback) when it goes. */
  function creditSaw(v, by, rate, dt, now) {
    if (!(rate > 0)) return; const m = v._dmgBy || (v._dmgBy = new Map()), e = m.get(by);
    const old = e ? e.d * Math.exp(-(now - e.t) / 3) : 0; m.set(by, { d: old + rate * dt, t: now });
  }
  function topSawer(v, now, fallback) {
    let best = fallback || null, bd = -1;
    if (v._dmgBy) for (const [by, e] of v._dmgBy) { const d = e.d * Math.exp(-(now - e.t) / 3); if (d > bd) { bd = d; best = by; } }
    return best;
  }
  return { step, bentLine, bentLineMulti, canHook, creditSaw, topSawer, CFG };
});
