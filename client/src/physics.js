/* Kite flying + line-cutting physics. Dependency-free, engine-agnostic (port to Unity/Godot/Three.js).
 * World: metres, Z up, wind blows toward +X. Player's right-hand side is -Y. See docs/PHYSICS.md. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.KitePhysics = factory();
})(typeof self !== 'undefined' ? self : this, function () {

  const RHO = 1.2, G = 9.81, DEG = Math.PI / 180, TWO_PI = Math.PI * 2;
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const len = a => Math.sqrt(dot(a, a));
  const norm = a => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));

  /* ---------- Wind: power-law shear + layered-sine gusts (deterministic, no RNG) ---------- */
  class Wind {
    constructor(o = {}) {
      this.speed = o.speed ?? 6;      // m/s at 10 m height
      this.dir = o.dir ?? 0;          // radians about Z, 0 = toward +X
      this.gust = o.gust ?? 0.3;      // 0..1 gust strength
      this.shear = o.shear ?? 0.15;   // power-law exponent
      this.seed = o.seed ?? 0;
    }
    at(p, t, out) {   // out (optional): an array to write into instead of making a new one (no garbage in hot loops)
      const h = Math.max(p[2], 2), s0 = this.speed * Math.pow(h / 10, this.shear);
      const k = this.seed;
      const g = (Math.sin(0.7 * t + k) + 0.6 * Math.sin(1.9 * t + 0.11 * p[0] + 2 * k) + 0.3 * Math.sin(4.3 * t + 0.2 * p[1])) / 1.9;
      const s = s0 * (1 + this.gust * g);
      const a = this.dir + 0.15 * this.gust * Math.sin(0.5 * t + 0.05 * p[1] + k);
      const r = out || [0, 0, 0]; r[0] = Math.cos(a) * s; r[1] = Math.sin(a) * s; r[2] = 0.15 * this.gust * s * Math.sin(1.3 * t + k); return r;
    }
  }

  /* ---------- Aerodynamic coefficients (flat-plate model, stalls near 45 deg) ---------- */
  function coeffs(spec, alpha) {
    const a = clamp(alpha, -Math.PI / 2, Math.PI / 2);
    return { cl: spec.clMax * Math.sin(2 * a), cd: spec.cd0 + spec.cdMax * Math.sin(a) * Math.sin(a) };
  }

  /* ---------- Kite on a line held by a player ----------
   * A force model, not a velocity-blend model: wind -> apparent wind -> lift/drag -> acceleration ->
   * velocity -> position -> line extension -> spring/damper tension -> back onto the kite. Every step
   * integrates real forces (F = m a); nothing here sets velocity or position directly except the ground
   * clamp and a cut/snap release.
   *
   * States are kept separate on purpose (never collapsed into one "rotation"):
   *   p, v          the physical bridle/pivot position and its TRUE velocity (integrated, not blended)
   *   alpha         aerodynamic angle of attack - how the sail is presented to the apparent wind. Dynamic,
   *                 relaxes toward the kite's trim (+ kanni bias) over spec.alphaTau; pull/unload/dart bias it.
   *   roll          aerodynamic bank, +/-80 deg, dynamic over spec.rollTau. Separate from heading and spin.
   *   headingAngle  nose direction in the tangent plane around the line (0 = up, + = right). Steered smoothly
   *                 by TURN. Decides which way lift (hence flight) points. Never written by roll or spin.
   *   spinAngle     body cartwheel about the pivot. An EMERGENT maneuver drive (distance x tangential speed x
   *                 recent flick/unload energy), not a timer a keypress switches on.
   *   incl          extra visual/physical tilt that grows with distance + spin.
   *   lineLen       ramps at a bounded rate from pull/unload energy; never jumps.
   * Actions: PULL (A, reel in), DISBICAR (S, dart+dive flick), UNLOAD/DHEEL (D, let line out).
   */
  const PULL_LEAD = 1.1;   // how far (m) the reel may get ahead of the kite during khainch: the line goes taut and drags it in
  const SPIN_R = 35;   // the cartwheel drive only opens up once the kite is genuinely far out (past normal flight range), not just clear of the reel-in zone
  class Kite {
    constructor(spec, thread, anchor, o = {}) {
      this.spec = spec; this.thread = thread; this.anchor = anchor.slice(); this.anchorVel = [0, 0, 0];
      const L0 = o.lineLen ?? 30;
      this.p = (o.p || [anchor[0] + L0 * Math.cos(40 * DEG), anchor[1], anchor[2] + L0 * Math.sin(40 * DEG)]).slice();
      this.v = [0, 0, 0];          // TRUE velocity - integrated from forces, never blended toward a target
      this.lineLen = L0; this.maxLine = o.maxLine ?? 300;
      // kanni: the bridle knot's position along the spine (see data.js). o.kanniAdj lets a player nudge it
      // nose-ward/tail-ward from the kite's stock value (a real flyer re-ties the knot the same way). It
      // biases the trim angle of attack - nose-ward sits flatter (faster, twitchier), tail-ward sits steadier.
      this.kanni = clamp((spec.kanni || 0) + (o.kanniAdj || 0), -0.18, 0.18);
      this.alpha = spec.trim * DEG - this.kanni * 0.9; this.roll = 0;
      this.headingAngle = 0; this.headingVel = 0;
      this.spinAngle = 0; this.spinVel = 0; this.incl = 0;
      this.bodyAngle = 0; this.bodyAngularVelocity = 0;      // bodyAngle = heading + spin: the angle the artwork is drawn at
      this.nose = [0, 0, 1]; this.spinAxis = [1, 0, 0];
      this.tangentialSpeed = 0; this.radialSpeed = 0;
      this.t = 0; this.tension = 0; this.wear = 0; this.damage = 0;
      this.reelRate = 0; this.free = false; this.onGround = false; this.snapped = false; this.wa = 0;
      this.swayPh = o.swayPh ?? Math.random() * 6.28; this.slip = false;   // seedable so tests are reproducible
      this.pullE = 0; this.sendE = 0;           // smooth 0..1-ish energies: how hard PULL / UNLOAD are being asked for
      this.maneuverE = 0;                       // recent-disbicar energy that (with distance+tangential speed) allows a cartwheel
      this.lastSwingDir = 1; this.turnDir = 0;
      this.diveKick = 0;                        // disbicar's temporary dive: decays, briefly cuts alpha
      this.thrustRamp = 0; this.tapBoost = 0;   // the movement key's alpha contribution: held ramps, tapped pulses
      this.comboE = 0;                          // 0..1: two or more controls actively worked together right now
      this.legacyPullT = 0; this.legacySendT = 0;
      this.autoOut = false;
      this.landingMode = false;   // set by the game when the player has deliberately asked to land+swap kites:
                                   // suspends the close-range "reel bounces it back out" safety (see r<14 below)
                                   // so an intentional landing can actually bring the kite all the way in.
    }

    get virtualMass() { const s = this.spec; return s.mass + 0.5 * this.thread.mu * this.lineLen + 0.25 * RHO * Math.pow(s.area, 1.5); }
    // damage weakens the line quadratically, not linearly: partial sawing (damage ~0.6-0.7, common mid-pecha
    // now that cutting is fast) used to cut strength by ~40-45% on its own, which let ordinary flight tension
    // finish the kite off as an anonymous "snap" instead of letting the cut (damage >= 1, which properly
    // credits the opponent) actually land - the player losing a kite to a bot mid-pecha and being told "line
    // snapped" instead of "X cut you" was that race. Early/mid damage now barely weakens it; only once it's
    // nearly cut through does strength meaningfully drop, by which point damage reaching 1 wins the race anyway.
    get lineStrength() { const d = Math.min(this.damage, 1); return this.thread.strength * (1 - 0.5 * Math.min(this.wear, 1)) * (1 - 0.6 * d * d * d); }

    /** Line goes slack forever: kite becomes a free-flying "kati" kite. A real cut kite does not simply stop -
     *  it keeps its momentum, loses lift and tumbles into an uncontrolled dive/spiral for a moment, THEN
     *  settles into a slower drifting flutter down. cutT drives that first dramatic phase (see step()). */
    releaseLine(reason) {
      this.free = true; this.tension = 0; this.lostBy = reason; this.cutT = 0; this.fall = null;
      this.v = [this.v[0] * 0.7, this.v[1] * 0.7, this.v[2] * 0.5];
      this.spinVel = clamp(this.spinVel + (this.spinVel >= 0 ? 1 : -1) * (6 + 5 * Math.random()), -16, 16);
    }

    // ---- discrete actions (each is one key press / swipe) ----
    /** PUXAR / pull: reel the line in. Also loads the sail (raises alpha) - a real tug adds lift, not velocity. */
    doPull() {
      if (this.free || this.autoOut) return;
      this.sendE = 0; this.maneuverE *= 0.3;
      this.pullE = Math.min(1, this.pullE + 0.8);
    }
    /** DESCARREGAR / unload (dheel): let line out. Slightly unloads the sail (lowers alpha - it runs/surges).
     *  This is the ONLY thing dheel does to the line; any spin comes later, from the emergent maneuver drive. */
    doSend(dir = 0) {
      if (this.free || this.autoOut) return;
      this.pullE = 0;
      this.sendE = Math.min(1, this.sendE + 0.5);
      if (dir) this.turnDir = dir;
    }
    /** DISBICAR / flick: a short lateral dart + dive, decaying. NOT a rotation, NOT a heading change. It also
     *  feeds the emergent cartwheel drive (one of several conditions item 13 asks for), it doesn't spin by itself. */
    doSwing(dir = 0) {
      if (this.free || this.autoOut) return;
      const d = dir || -this.lastSwingDir;
      this.lastSwingDir = d;
      this.pullE = 0;
      this.diveKick = 1; this.maneuverE = Math.min(1.5, this.maneuverE + 1);
      this.dartDir = d;
      this.dartKick = Math.min(22, (this.dartKick || 0) + 22);   // capped: a repeated/rapid press redirects the dart, it does not stack on top of one already in flight
    }
    /** One tap of the movement key: a brief pulse that raises alpha (a quick tug adds lift), not raw velocity. */
    doThrustTap() {
      if (this.free || this.autoOut) return;
      this.tapBoost = Math.min(1.5, this.tapBoost + 1);
    }

    /**
     * @param dt   seconds (<= 1/120)
     * @param wind Wind instance
     * @param input actions: doPull, doSend(-1|0|1|true), doSwing(-1|0|1|true), doThrust (tap);
     *              held: thrust (movement key - loads the sail), turn -1..1 (steer the nose), steer (legacy)
     *              legacy (bots/tests): flick, reel, up, dheel
     */
    step(dt, wind, input = {}) {
      const s = this.spec, th = this.thread;
      this.t += dt;
      const W = wind.at(this.p, this.t);

      // ---- free (cut / snapped) kite: a kati patang. With the line gone slack for good, a tail-less patang does what it
      // does on dheel, only for ever: it turns round and round in one direction (ghoomti hui), and because its lift
      // always points the way its nose points, the turning nose drags it through small loops - the "chakkar kha ke
      // girti" corkscrew - while the wind carries it away and it sinks. Now and then the dor it trails catches, the
      // turning stops for a moment and it slides off in a short straight glide, then starts turning again (sometimes
      // the other way). Everything here eases in and out: no kicks, no jumps. fallRate = how fast it sinks. ----
      if (this.free) {
        // lying on a roof or the street: it stays there (a breath of wind may nudge it), it no longer skates along the
        // ground at flying speed with the looters chasing it forever
        if (this.p[2] <= 0.03 && this.cutT > 0.5) {
          const dmp = Math.exp(-7 * dt); this.v = [this.v[0] * dmp + W[0] * 0.02 * dt, this.v[1] * dmp + W[1] * 0.02 * dt, 0];
          this.p = add(this.p, mul(this.v, dt)); this.p[2] = 0; this.onGround = true; this.reelRate = 0; this.tension = 0;
          this.spinVel *= dmp; this.cutT += dt; this.incl += (0.6 - this.incl) * Math.min(1, dt / 0.4);   // lies flat-ish
          return;
        }
        const T = (this.cutT = (this.cutT || 0) + dt);
        let F = this.fall;
        if (!F) {
          F = this.fall = { dir: this.spinVel ? Math.sign(this.spinVel) : (Math.random() < 0.5 ? -1 : 1), mode: 'spin', modeT: 0, modeLen: 2.5 + Math.random() * 3,
            rate: 0.55 + Math.random() * 0.45, ph: Math.random() * TWO_PI };
          this.spinVel = clamp(this.spinVel, -1, 1);
        }
        F.modeT += dt;
        if (F.modeT > F.modeLen) {
          F.modeT = 0;
          if (F.mode === 'spin') { F.mode = 'glide'; F.modeLen = 1.5 + Math.random() * 2; }
          else { F.mode = 'spin'; F.modeLen = 2 + Math.random() * 3; F.rate = 0.55 + Math.random() * 0.45; if (Math.random() < 0.35) F.dir = -F.dir; }
        }
        const settle = clamp(T / 0.9, 0, 1);                              // the first moment: it still carries its own speed
        const spin = F.mode === 'spin' ? 1 : 0;
        // mostly a slow sway from side to side, turning only lazily (about one turn every 6-11 s while it turns at all)
        const rock = 0.55 * Math.cos(1.3 * this.t + F.ph) * (spin ? 0.6 : 1);
        const wantRate = F.dir * (spin ? F.rate : 0) * (0.35 + 0.65 * settle) + rock;
        this.spinVel += (wantRate - this.spinVel) * Math.min(1, dt / 0.6);
        this.spinAngle += this.spinVel * dt;
        this.headingVel *= 1 / (1 + 2 * dt); this.headingAngle += this.headingVel * dt;
        this.bodyAngle = this.headingAngle + this.spinAngle; this.bodyAngularVelocity = this.spinVel;
        // the nose, in the sky as the flier sees it (across the wind): up when bodyAngle = 0, turning clockwise
        const wh = Math.hypot(W[0], W[1]) || 1e-6, wx = W[0] / wh, wy = W[1] / wh, b = this.bodyAngle;
        const nose = [Math.sin(b) * wy, -Math.sin(b) * wx, Math.cos(b)];
        const fly = (spin ? 1.4 : 1.8) * (0.3 + 0.7 * settle);            // how hard its lift pulls it along the nose
        const sink = (this.fallRate ?? 1.4) * (spin ? 0.8 : 1.25);         // a turning kite half-parachutes; a glide drops faster
        const drift = 0.6 + 0.1 * Math.sin(0.6 * this.t + F.ph);
        const tv = [W[0] * drift + nose[0] * fly, W[1] * drift + nose[1] * fly, nose[2] * fly - sink];
        const tau = 0.45 + 0.9 * (1 - settle);
        for (let a = 0; a < 3; a++) this.v[a] += (tv[a] - this.v[a]) * Math.min(1, dt / tau);
        // it rocks a little in and out of the picture as it turns (seen a bit edge-on now and then), flatter in a glide
        // ...and every few seconds, as it rolls over, it shows itself almost edge-on - a thin sliver against the sky -
        // before the sail swings back flat to the wind (that flip is what a falling kati patang looks like from a roof)
        const flip = Math.pow(Math.max(0, Math.sin(0.85 * this.t + 2 * F.ph)), 4);
        const inclT = (spin ? 0.22 + 0.16 * Math.sin(1.7 * this.t + F.ph) : 0.08) + 1.05 * flip * settle;
        this.incl += (inclT - this.incl) * Math.min(1, dt / 0.4);
        this.p = add(this.p, mul(this.v, dt)); this.reelRate = 0; this.tension = 0;
        this.onGround = false;
        if (this.p[2] < 0) { this.p[2] = 0; this.onGround = true; this.v[2] = Math.max(0, this.v[2]); this.v[0] *= 1 - Math.min(1, 4 * dt); this.v[1] *= 1 - Math.min(1, 4 * dt); }
        return;
      }

      // ---- turn discrete / legacy inputs into actions ----
      const steer = clamp(input.steer || 0, -1, 1), turn = clamp(input.turn || 0, -1, 1);
      const has = v => v !== undefined && v !== false && v !== null;
      this.legacyPullT -= dt; this.legacySendT -= dt;
      if (turn) this.turnDir = Math.sign(turn);
      if (input.doPull) this.doPull();
      if (input.up && this.legacyPullT <= 0) { this.doPull(); this.legacyPullT = 0.3; }
      if (has(input.doSend)) this.doSend(input.doSend === true ? 0 : input.doSend);
      if (has(input.doSwing)) this.doSwing(input.doSwing === true ? 0 : input.doSwing);
      if (input.doThrust) this.doThrustTap();
      if (input.flick) this.doSwing(input.flick > 0 ? 1 : -1);
      const reel = clamp(input.dheel ? 1 : (input.reel || 0), -1, 1);
      if (reel > 0.35 && this.legacySendT <= 0) { this.doSend(steer > 0.2 ? 1 : steer < -0.2 ? -1 : 0); this.legacySendT = 0.35 / Math.max(0.5, reel); }
      if (reel < -0.35 && this.legacyPullT <= 0) { this.doPull(); this.legacyPullT = 0.3; }
      // ---- held pull/send (continuous, from a human holding the key every frame): ramps pullE/sendE smoothly
      // toward full rather than being re-triggered by a discrete repeat-timer, so holding the key reads as one
      // steady pull, not a stutter of sharp tugs and decays between repeat ticks. doPull()/doSend() above stay
      // as one-shot pumps for bots/legacy callers - this is a separate, additive path, not a replacement. ----
      if (!this.free && !this.autoOut) {
        if (input.pull) { this.sendE = 0; this.maneuverE *= Math.exp(-dt / 0.15); this.pullE = Math.min(1, this.pullE + dt / 0.15); }
        if (has(input.send)) { this.pullE = 0; if (input.send && input.send !== true) this.turnDir = input.send; this.sendE = Math.min(1, this.sendE + dt / 0.3); }
      }

      // ---- frame around the line: L radial (anchor->kite), U up-tangent, Wd right-tangent ----
      const lineVec = sub(this.p, this.anchor), r = len(lineVec) || 1e-6, L = mul(lineVec, 1 / r);
      let U = sub([0, 0, 1], mul(L, L[2])); U = len(U) < 1e-4 ? [1, 0, 0] : norm(U);
      let Wd = cross(L, U); Wd = len(Wd) < 1e-4 ? [0, -1, 0] : norm(Wd);

      // ---- too close to the player: force line back out, ignore pull/disbicar until clear (never rotates it) ----
      // landingMode suspends this: a deliberate landing needs to actually close that same distance, not get
      // bounced back out by the same safety that protects ordinary flight.
      if (this.landingMode) this.autoOut = false;
      else { if (r < 8) this.autoOut = true; else if (r >= 16) this.autoOut = false; }   // (was 14 m: a khainch in a pecha was snatched away by the reel well before the kite was close)
      if (this.autoOut) { this.pullE = 0; this.sendE = Math.max(this.sendE, 0.8); }

      // ---- energies decay (this is the "ramp smoothly" for pull/unload/disbicar) ----
      this.pullE = Math.max(0, this.pullE - 2.2 * dt);
      this.sendE = Math.max(0, this.sendE - 1.1 * dt);
      this.maneuverE *= Math.exp(-dt / 1.1);
      this.diveKick *= Math.exp(-dt / 0.45);
      this.thrustRamp += ((input.thrust ? 1 : 0) - this.thrustRamp) * Math.min(1, dt / 0.5);
      this.tapBoost *= Math.exp(-dt / 0.3);
      // ---- KHAINCH is hand over hand, not a winch: each hand reaches up the line and hauls it down, about two
      // hauls a second. The line comes in in surges (strong mid-stroke, nearly nothing while a hand reaches up
      // again), and every surge loads the sail so the kite shoots forward the way its nose points - that's what a
      // real khainch looks like from the roof: the patang darts across the sky in pulses while the dor pours in.
      if (this.pullE > 0.05) this.haulPh = (this.haulPh || 0) + dt * 2 * Math.PI * 1.05;
      const haulS = Math.abs(Math.sin(this.haulPh || 0));
      this.haul = this.pullE > 0.05 ? 0.3 + 0.7 * haulS * Math.sqrt(haulS) : 0;   // 0..1, read by the flier's arms and the sound
      // ---- combo: working the kite with two or more controls at once (fly+steer into a turn, fly+khainch, a
      // disbicar thrown mid-turn...) is a harder, more committed move than any one of them alone, so it earns a
      // real top-speed boost - a fast-moving kite during an aggressive multi-key maneuver, not just a single tap ----
      const activeCount = (input.thrust ? 1 : 0) + (turn ? 1 : 0) + (input.pull ? 1 : 0) + (has(input.send) ? 1 : 0) + (this.diveKick > 0.5 ? 1 : 0);
      this.comboE += ((activeCount >= 2 ? 1 : 0) - this.comboE) * Math.min(1, dt / (activeCount >= 2 ? 0.25 : 0.6));

      // ---- HEADING (nose direction): RATE steering. Holding a steer key turns the nose at a steady rate (about half a
      // turn a second for a patang - the caller scales `turn` per shape); letting go stops it within a few hundredths
      // of a second. The old version was an acceleration with a slow decay, so the nose kept swinging 20-40 deg after
      // the key came up and a short tap could never be placed where you wanted it. ----
      // v6: a real fighter patang whips round fast - ~1 full turn a second at full steer (was ~155 deg/s, which
      // players found sluggish). turnMul is the player's Settings -> Steering speed (0.75 / 1 / 1.35).
      const MAX_TURN = 6.3 * clamp(this.turnMul || 1, 0.5, 1.6);   // rad/s at turn = 1 (~360 deg/s)
      // v6.4: the turn RAMPS UP over the first ~0.3 s of a press (40% -> 100%): a quick tap now nudges the nose a little
      // (~20 deg) so you can aim it, a held key still whips it round at full speed. (A tap used to swing it ~60 deg, and
      // half a second turned it upside down.) Bots ease their own steering, so this is for human hands only.
      this.turnHold = turn ? (this.turnHold || 0) + dt : 0;
      const ramp = this.turnRamp === false ? 1 : 0.4 + 0.6 * clamp(this.turnHold / 0.3, 0, 1);
      const tauH = turn ? 0.05 : 0.035;
      this.headingVel += (turn * MAX_TURN * ramp - this.headingVel) * Math.min(1, dt / tauH);
      this.headingVel = clamp(this.headingVel, -MAX_TURN * 1.3, MAX_TURN * 1.3);
      this.headingAngle += this.headingVel * dt;
      const N = add(mul(U, Math.cos(this.headingAngle)), mul(Wd, Math.sin(this.headingAngle)));
      this.nose = N; this.spinAxis = L;

      // ================= FORCE CHAIN: wind -> apparent wind -> aerodynamics -> acceleration =================
      const Wa = sub(W, this.v), WaLen = len(Wa), WaHat = WaLen > 1e-3 ? mul(Wa, 1 / WaLen) : [0, 0, 0];

      // ---- ALPHA (angle of attack): a real dynamic state - trim + kanni, biased by the player's actions, plus
      // a couple of degrees of natural flutter (this alone gives the idle sway). Kept as a state you can read
      // and steer (item 3), not derived by fragile inverse trig - the self-limiting apparent-wind feedback
      // (item 1) instead comes from the ALIGNMENT factor below, which is what stops the model running away. ----
      // kanni doesn't just nudge the resting pitch - a real re-tied bridle changes the kite's HANDLING: nose-ward
      // (knot toward the head) is the fighting-kite setup, flatter AND noticeably twitchier/faster to respond;
      // tail-ward is the steady, forgiving setup, slower to respond but holds its attitude. Modelling kanni as
      // only a few degrees of static pitch bias (the old version) got lost under the much bigger pull/dive/
      // thrust biases below - the knot's real, visible effect is in how FAST alpha/roll react, not just where
      // they rest, so it now scales spec.alphaTau/rollTau directly.
      const kanniSpeed = clamp(1 - this.kanni * 1.5, 0.5, 1.9);   // nose-ward -> faster/twitchier; tail-ward -> slower/steadier
      const effAlphaTau = clamp(s.alphaTau * kanniSpeed, 0.05, 0.9), effRollTau = clamp(s.rollTau * kanniSpeed, 0.05, 0.9);

      const flutter = 0.035 * Math.sin(1.3 * this.t + this.swayPh) + 0.02 * Math.sin(3.1 * this.t + 2 * this.swayPh);
      const alphaBias = this.pullE * (3 + 6 * (this.haul || 0)) * DEG - this.sendE * 9 * DEG - this.diveKick * (30 + 10 * this.kanni) * DEG + (this.thrustRamp + this.tapBoost) * 5 * DEG;
      // kanni's sign here matches its own description: nose-ward (+) sits FLATTER (lower alpha, faster/twitchier
      // via kanniSpeed above), tail-ward (-) sits steeper (higher alpha, climbs higher, steadier). An earlier
      // version had this backwards - the code raised alpha for a nose-ward knot, the opposite of what the
      // kite-select screen and data.js both say it does.
      const alphaTarget = clamp(s.trim * DEG - this.kanni * 0.9 + alphaBias + flutter, 5 * DEG, 75 * DEG);
      this.alpha += (alphaTarget - this.alpha) * Math.min(1, dt / effAlphaTau);

      // ---- ROLL (aerodynamic bank): a real dynamic state, separate from heading/spin, +/-80 deg (item 12) ----
      const rollTarget = clamp(-turn * 0.8 + this.diveKick * (this.dartDir || 0) * 0.5 + 0.05 * Math.sin(0.9 * this.t + this.swayPh), -1, 1) * s.rollMax * DEG;
      this.roll += (rollTarget - this.roll) * Math.min(1, dt / effRollTau);
      this.roll = clamp(this.roll, -80 * DEG, 80 * DEG);

      // ---- lift direction: the nose's own direction, projected perpendicular to the apparent wind - so
      // steering the nose steers where lift (and so flight) actually points (item 10), through real aero.
      //
      // THE SELF-LIMITING FEEDBACK (item 1's whole point) lives in liftMag below, NOT in a bolted-on damping
      // factor: liftMag = |N projected off WaHat| = sin(angle between the nose and the apparent wind). It is
      // exactly 1 when the nose is crosswind to Wa (max lift) and shrinks to 0 as the nose swings to point
      // along Wa - i.e. as the kite's own velocity "catches up" with the apparent wind in that direction. An
      // earlier version of this normalised liftDir to a fixed unit length and threw that shrinking magnitude
      // away, which deleted the only thing stopping lift from growing without bound - it does the real work. ----
      const liftRaw = WaLen > 1e-3 ? sub(N, mul(WaHat, dot(N, WaHat))) : [0, 0, 0];
      const liftMag = len(liftRaw);
      const liftDir = liftMag > 1e-3 ? mul(liftRaw, 1 / liftMag) : Wd;

      // "bagging": a real sail is cloth, not a rigid aerofoil - stronger wind presses it into a deeper curve
      // (more effective camber), which adds lift beyond what the flat angle-of-attack model alone gives, up to
      // a point. Modest and capped, scaled off each kite's own ideal wind (spec.wind[1]) - this is why a kite
      // can feel suddenly more alive, not just faster, as the wind picks up toward its sweet spot.
      const bagging = 1 + 0.12 * clamp(WaLen / s.wind[1] - 0.6, 0, 1);
      const { cl, cd } = coeffs(s, this.alpha);
      const q = 0.5 * RHO * WaLen * WaLen * s.area;
      const Flift = mul(liftDir, q * cl * bagging * liftMag * (1 - 0.25 * Math.abs(Math.sin(this.roll))));   // banking bleeds a little lift, like a real turn
      // drag pushes the kite ALONG the apparent wind (the direction the air is actually moving past it) -
      // this is what makes it act as a brake once v approaches W, not a force fighting the wind.
      const Fdrag = WaLen > 1e-3 ? mul(WaHat, q * cd) : [0, 0, 0];
      const FlineDrag = WaLen > 1e-3 ? mul(WaHat, 0.25 * RHO * WaLen * WaLen * this.lineLen * th.dia) : [0, 0, 0]; // the line itself has drag
      const Fgrav = [0, 0, -G * this.virtualMass];
      const Fparasitic = mul(this.v, -2.6 * this.virtualMass);   // bridle/sail-flutter/tail losses not in the flat-plate Cd; keeps it a hovering kite, not a pendulum

      // ---- LINE: a real spring/damper (item 4), using the thread's own stiffness (ea) - not a teleport ----
      const ext = r - this.lineLen, radialVel = dot(this.v, L);
      const kSpring = Math.min(45, th.ea / Math.max(this.lineLen, 4));
      // 4.2x critical (an earlier tuning pass) was fighting khainch's own deliberate reel-in speed every
      // frame - nearly 90% of the radial velocity the pull nudge below sets was being erased by this damping
      // before the nudge could reapply, leaving barely any net reel-in. That heavy damping was compensating
      // for the tension SIGN bug above; now that the real cause is fixed at the source, critical damping
      // (just enough to kill spring bounce, no more) is enough on its own.
      const cDamp = 2 * 1.0 * Math.sqrt(Math.max(kSpring * this.virtualMass, 1e-6));
      // a rope can only pull, never push: without the floor at 0, the damper term (cDamp*radialVel) could
      // flip the sign during a fast reel-in (radialVel strongly negative) and shove the kite OUTWARD while
      // calling that push "tension" - which is what was snapping lines on a single ordinary pull.
      const tensionMag = Math.max(0, kSpring * ext + cDamp * (radialVel - Math.min(0, this.reelRate || 0)));   // kept as the full spring+damper estimate for reporting/snap/wear/cutting
      // the SPRING part only goes into the integrated force below - it's explicit, and kSpring*dt^2/mass is
      // small enough to stay stable. The DAMPER does not: cDamp*dt/mass comes out above 2 for a stiff short
      // line, which is the known instability threshold for an explicit damping force - past it, the damper
      // overshoots and reverses every frame instead of settling, injecting real multi-m/s velocity jumps (this
      // is what was making "release" look like a smooth coast and then a sudden stop). The damper is applied
      // just below instead, as an exponential decay of the radial velocity - unconditionally stable at any
      // strength, because decaying toward zero can never overshoot past it.
      const Fspring = ext > 0 ? mul(L, -kSpring * ext) : [0, 0, 0];

      // ---- flying power: while the flier is working the line (Fly held, a tunka, a khainch haul) the sail is DRIVING
      // the kite along its nose - the forward pull of the sail is what balances the drag of moving through the air.
      // The old code still applied the full drag against that motion, which (on a 30 g virtual mass) saturated the
      // acceleration limit and held a held Fly to ~2 m/s whenever the nose pointed up. So the resistive forces lose
      // their along-the-nose part in proportion to how hard the kite is being flown (only while it is slower than the
      // speed the flier is asking for - a diving kite that is already faster still feels all of its drag).
      //
      // WIND WINDOW: a kite only has power where the wind blows THROUGH it. Downwind of the flier it flies at full
      // speed; flying OUT toward the edges of the window (far to the sides, or up to the zenith overhead) the air slides
      // past the sail instead and it runs out of power and stops there - it can't be flown round behind you. Flying
      // back IN toward the middle always has power. Stronger wind (up to the kite's best wind) makes it livelier.
      const surge = this.pullE * (this.haul || 0);
      const demand = Math.min(1.5, this.thrustRamp + this.tapBoost + 0.9 * surge);
      // lying on the roof, a kite can only be flown off it nose-up: Fly with the nose down just scrapes it along the ground
      const grounded = this.onGround && N[2] < 0.25;
      const drive = grounded ? 0 : clamp(demand / 0.3, 0, 1);
      const Wh = Math.hypot(W[0], W[1]) || 1e-6, Whx = W[0] / Wh, Why = W[1] / Wh;
      const offWind = L[0] * Whx + L[1] * Why;                                  // cos(angle between the line and straight downwind)
      const wp = clamp((offWind - 0.08) / 0.5, 0, 1), windowP = wp * wp * (3 - 2 * wp);
      const inward = clamp(0.5 + 2.5 * (N[0] * Whx + N[1] * Why), 0, 1);       // is the nose taking it back toward the middle?
      const power = (Math.max(0.06, windowP) * (1 - inward) + Math.max(0.65, windowP) * inward) * clamp(Wh / s.wind[1], 0.7, 1.05);
      const activeTarget = power * Math.min(13 + 3 * this.comboE, 5 + 6 * this.thrustRamp + 5 * this.tapBoost + 6 * surge + 3 * this.comboE);   // a kite under a flier's hand moves briskly, not like a jet: ~12 m/s
      let Fres = add(Fdrag, add(FlineDrag, Fparasitic));
      if (drive > 0 && dot(this.v, N) < activeTarget) { const c = dot(Fres, N); if (c < 0) Fres = sub(Fres, mul(N, c * drive)); }
      let F = add(add(Flift, Fres), add(Fgrav, Fspring));
      const mass = this.virtualMass;
      let a = mul(F, 1 / mass);
      const aLen = len(a); if (aLen > 90) a = mul(a, 90 / aLen);   // numerical safety net, not a gameplay limiter
      this.v = add(this.v, mul(a, dt));
      // the damper resists the line STRETCHING, i.e. the kite's radial speed relative to the line being reeled (vr minus
      // the reel rate) - damping vr itself toward zero also cancelled every khainch, holding a hard pull to ~2.5 m/s
      if (ext > 0) { const vr = dot(this.v, L), rr = Math.min(0, this.reelRate || 0), vrNew = rr + (vr - rr) * Math.exp(-(cDamp / mass) * dt); this.v = add(this.v, mul(L, vrNew - vr)); }

      // ---- the movement key: the flyer's own active line-work, along the CURRENT nose. A force here (tried
      // earlier) fights the apparent-wind feedback that keeps the rest of the model stable - the very thing
      // that's supposed to fade lift as the kite catches up to the wind also fades this, so pushing harder
      // does not reliably win, and in some headings barely moves it at all. Setting the along-nose SPEED
      // directly (blended, not snapped) sidesteps that fight: it changes only the along-N component of v, and
      // only while held/tapped - everything perpendicular to the nose (radial, drift, gust wobble) is left
      // alone for the wind/line/mass chain above to keep handling. Releasing it leaves real momentum for drag,
      // the line and gravity to carry and settle - nothing here runs once thrustRamp/tapBoost are back near 0.
      // the push toward wantSpeed has to fade out smoothly as the key is released, not run at full strength
      // right up until thrustRamp/tapBoost cross an arbitrary 0.01 cutoff and then stop in a single frame -
      // that cliff (after a ~2.2s tail where wantSpeed sat at its 8 m/s floor) was the "release doesn't feel
      // smooth" problem. Scaling the blend itself by `demand` fades the PUSH to zero continuously; it is not
      // enough to only let wantSpeed decay, since wantSpeed had a floor it never dropped below.
      // the TARGET fades toward the current speed (not the blend RATE) as the key releases: scaling the rate
      // (an earlier version of this fix) weakened the push for the entire first ~0.2s of every hold too, not
      // just the release tail. Fading the target instead keeps full strength as soon as demand clears 0.3
      // (about 0.18s into a hold) and only softens on the way back down, so release doesn't end in a cliff
      // (the old floor of 8 m/s never relaxed until thrustRamp fell under an arbitrary 0.01 cutoff, then
      // stopped dead in one frame) without blunting the key while it's actually held.
      const along = dot(this.v, N);
      const wantSpeed = along + (activeTarget - along) * Math.min(1, demand / 0.3);
      if (demand > 0.004 && !grounded) {
        const newAlong = along + (wantSpeed - along) * Math.min(1, dt / 0.15);
        this.v = add(this.v, mul(N, newAlong - along));
      }
      // the disbicar dart: delivered as a smooth velocity impulse (not an instant snap) over ~0.15s
      if (this.dartKick > 0.01) { const k = Math.min(this.dartKick, this.dartKick * (1 - Math.exp(-dt / 0.06))); this.dartKick -= k; this.v = add(this.v, mul(Wd, this.dartDir * k)); }
      // DHEEL RUN: let line slip and a patang runs away from you with it - the wind takes the slack sail and it streams
      // off downwind and out, the dor pouring from the charkhi, sinking a little as it goes. (On slack line alone it only
      // drifted at ~4 m/s, so sending a kite far out took ages.) Strength follows how hard dheel is given and the wind.
      if (this.sendE > 0.05 && !this.autoOut && !this.launch && drive < 0.5) {   // (flying it at the same time steers it instead)
        const vr = dot(this.v, L), want = (4 + 8 * this.sendE) * clamp(Wh / s.wind[1], 0.7, 1.15);
        if (vr < want) this.v = add(this.v, mul(L, (want - vr) * Math.min(1, dt / 0.12)));
      }
      const sp = len(this.v); if (sp > 26) this.v = mul(this.v, 26 / sp);   // a generous but real top speed, not per-frame drag tuning
      this.p = add(this.p, mul(this.v, dt));

      // ---- CARTWHEEL / SPIN: an EMERGENT drive (distance x tangential speed x recent maneuver energy), never
      // a direct result of pressing dheel (item 12/13). It never touches headingAngle. ----
      this.tangentialSpeed = dot(this.v, Wd); this.radialSpeed = dot(this.v, L);
      const farF = clamp((r - SPIN_R) / 45, 0, 1), tangF = clamp(Math.abs(this.tangentialSpeed) / 7, 0, 1);
      const readiness = clamp(this.maneuverE + 0.5 * this.sendE, 0, 1.3);
      const spinDir = this.dartDir || this.turnDir || this.lastSwingDir || 1;
      // a cube root, not a plain product: three OK-ish factors (say 0.6 each) should still give a real spin,
      // not 0.6^3=0.22 of one - multiplying them outright crushed the cartwheel into a slow-motion wobble even
      // when the conditions were genuinely met.
      // noCartwheel: the game turns this off for kites on a line - their dheel rotation is the slow, steady ghoomna in
      // game.js. This drive snapped between ~9-14 rad/s and a spring back to zero, which read as irregular spinning.
      const spinDrive = this.noCartwheel ? 0 : Math.cbrt(farF * tangF * clamp(readiness, 0, 1));
      if (spinDrive > 0.15) {
        const target = spinDir * (9 + 5 * this.sendE) * spinDrive;
        this.spinVel += (target - this.spinVel) * Math.min(1, dt / 0.12);
      } else {
        const home = Math.round(this.spinAngle / TWO_PI) * TWO_PI;
        this.spinVel += (30 * (home - this.spinAngle) - 10 * this.spinVel) * dt;
      }
      this.spinVel = clamp(this.spinVel, -14, 14);
      this.spinAngle += this.spinVel * dt;
      const inclT = clamp(Math.abs(this.spinVel) / 10, 0, 1) * 0.3 + farF * this.sendE * 0.12;
      this.incl += (inclT - this.incl) * Math.min(1, dt / 0.35);
      this.bodyAngle = this.headingAngle + this.spinAngle; this.bodyAngularVelocity = this.spinVel;

      // ---- line length: ramps at a bounded RATE from pull/unload energy - never jumps (item 6) ----
      const len0 = this.lineLen;
      const reelRate = 8 * this.sendE - this.pullE * (3 + 9 * (this.haul || 0));   // payout up to 8 m/s; khainch comes in hand over hand, surging to ~12 m/s mid-haul   // m/s: payout out to 8 m/s, reel-in faster at up to 9 m/s (khainch should feel quick)
      this.lineLen = clamp(this.lineLen + reelRate * dt, 1.5, this.maxLine);
      // dheel lets the dor slip out through the fingers - but only as fast as the kite takes it. The old payout ran at a
      // fixed 8 m/s whatever the kite did, so four seconds of dheel left ~20 m of dead slack lying in the air and the
      // kite stayed out of control (no tension, a tunka did nothing) for seconds afterwards. Now the slack is capped to
      // a natural belly; the line still pours out as fast as the wind carries the kite away. In a pecha the dor is
      // being fed through the crossing on purpose (dheel-pech), so the cap is lifted there.
      if (reelRate > 0 && !(this._pecha && this._pecha.on)) this.lineLen = Math.min(this.lineLen, Math.max(len0, r + 1.5 + 0.06 * r));
      // a flier feels the line: as tension nears what the dor can take, the haul eases off (headroom 1 -> 0), so an ordinary
      // khainch doesn't snap a sound line - but a sawn, weakened line still can, mid-pecha
      // (it used to cut the haul to almost nothing from ~60% of breaking load, so in a pecha - where the hooked lines are
      // always under load - a khainch only crawled in at ~1 m/s and could never saw. Now it keeps at least a third of its pull.)
      const headroom = 0.35 + 0.65 * clamp(1 - (this.tensionSmooth || 0) / (0.92 * this.lineStrength), 0, 1);
      if (this.pullE > 0.05) {
        this.lineLen = Math.min(len0, Math.max(this.lineLen, r - PULL_LEAD * headroom));   // the haul stalls, it never pays line back out...
        if ((this.tensionSmooth || 0) > 0.92 * this.lineStrength) this.lineLen = Math.max(this.lineLen, Math.min(len0 + 0.05, r));   // ...except a little slip right at the breaking point
      }   // the reel can only get so far ahead of where the kite actually is yet - the kite's own inertia, not the reel, sets how fast it really comes in; without this the gap (and so tension) just grows every frame regardless of damping
      this.reelRate = (this.lineLen - len0) / dt; this.slip = false;
      // khainch actually winds the line in, physically dragging the kite inward with it - not just a spring
      // pulling on a shortened target (which is what kept snapping the thread: closing the gap with FORCE
      // alone needs a tension spike; closing it by directly taking up the kite's radial speed does not).
      // (the hands haul at up to ~5.5 m/s; the kite is dragged in with them. An earlier, softer version of this let the
      // kite's own lift win, so a held khainch only brought the line in at ~1 m/s - too slow to ever saw through
      // anything in a pecha. Only an INWARD speed is imposed, so this can't spike tension the way a force would.)
      if (this.pullE > 0.05) { const vr = dot(this.v, L), want = -(2.5 + 5 * (this.haul || 0)) * this.pullE * Math.sqrt(headroom); if (vr > want) this.v = add(this.v, mul(L, (want - vr) * Math.min(1, dt / 0.03))); }

      // ---- line tension for wear/snap/cutting: the spring-damper's own force when taut, a wind-pull floor when slack ----
      const r2 = len(sub(this.p, this.anchor)) || 1e-6;
      const taut = clamp(1 - Math.max(0, this.lineLen - r2) / 0.8, 0.05, 1);
      const windPull = 0.5 * RHO * WaLen * WaLen * s.area * 0.4;
      this.tension = ext > 0 ? tensionMag : taut * windPull;
      // a real thread does not snap from a single 1/120s data point - it snaps from sustained overload. The
      // raw per-frame tension above can spike from ordinary numerical chatter (e.g. right as the kite swings
      // through the taut boundary during a fast turn), which was snapping the line on a transient that wasn't
      // really there. Wear/snap both read a short-smoothed tension instead; the display/cutting model still
      // uses the raw instantaneous value, since cutting genuinely is about instant-to-instant sliding contact.
      this.tensionSmooth = (this.tensionSmooth ?? this.tension) + (this.tension - (this.tensionSmooth ?? this.tension)) * Math.min(1, dt / 0.09);
      this.wear += 0.004 * Math.pow(this.tensionSmooth / th.strength, 2) * dt;
      if (this.tensionSmooth > this.lineStrength) { this.snapped = true; this.releaseLine('snap'); return; }
      this.wa = len(W);

      this.onGround = false;
      if (this.p[2] < 0) { this.p[2] = 0; this.onGround = true; this.v[2] = Math.max(0, this.v[2]); this.v[0] *= 1 - Math.min(1, 4 * dt); this.v[1] *= 1 - Math.min(1, 4 * dt); }
    }

    /** Points along the sagging line for rendering (parabola under line weight, or slack, PLUS a sideways
     *  belly during a pecha dive/sweep - a real line being actively worked doesn't just sag straight down, it
     *  bows the way the kite has been sweeping, which is how you read "cutting from above" vs "from below" at
     *  a glance). */
    linePoints(n = 24) {
      const a = this.anchor, b = this.p, d = sub(b, a), dist = len(d) || 1e-6, cosT = Math.sqrt(d[0] * d[0] + d[1] * d[1]) / dist;
      const w = this.thread.mu * G, T = Math.max(this.tension, 0.05);
      const slack = Math.max(0, this.lineLen - dist);
      let sag = Math.max(w * dist * dist * cosT / (8 * T), Math.sqrt(3 * dist * slack / 8) * 0.08);   // dheel builds slack fast; too high a factor here reads as the line kinking hard, not a gentle droop
      sag = Math.min(sag, dist * 0.06);   // a gentle belly even on long dheel (it used to bow like a second line)
      // sideways belly: the component of the kite's own velocity across the line, so diving/sweeping one way
      // visibly bends the line that way (more slack = more belly, since a taut line can't bow sideways much) -
      // kept modest, dheel's own slack was dominating this and making an ordinary send-line look like a snap-cut
      const dHat = mul(d, 1 / dist), vAlong = dot(this.v, dHat), vPerp = sub(this.v, mul(dHat, vAlong));
      const vPerpLen = len(vPerp);
      const bowDir = vPerpLen > 0.25 ? mul(vPerp, 1 / vPerpLen) : [0, 0, 0];
      const bowAmt = Math.min(dist * 0.03, (0.03 * slack + 0.03 * vPerpLen) * clamp(vPerpLen / 4, 0, 1));
      const pts = [];
      for (let i = 0; i <= n; i++) { const s = i / n, bulge = 4 * s * (1 - s); const q = add(a, mul(d, s)); q[2] -= sag * bulge; pts.push(add(q, mul(bowDir, bowAmt * bulge))); }
      return pts;
    }
  }

  /* ---------- Line-vs-line cutting (the "patangbaazi" contact model) ---------- */
  function closestSegments(p1, q1, p2, q2) { // Ericson, Real-Time Collision Detection 5.1.9
    const d1 = sub(q1, p1), d2 = sub(q2, p2), r = sub(p1, p2);
    const a = Math.max(dot(d1, d1), 1e-9), e = Math.max(dot(d2, d2), 1e-9);   // guard zero-length segments (e.g. linePoints(1) on a kite sitting on its anchor) - without this, dividing by a/e near 0 gives NaN that silently disables snapping and cutting from then on
    const f = dot(d2, r), c = dot(d1, r), b = dot(d1, d2), den = a * e - b * b;
    let s = den > 1e-9 ? clamp((b * f - c * e) / den, 0, 1) : 0, t = (b * s + f) / e;
    if (t < 0) { t = 0; s = clamp(-c / a, 0, 1); } else if (t > 1) { t = 1; s = clamp((b - c) / a, 0, 1); }
    const c1 = add(p1, mul(d1, s)), c2 = add(p2, mul(d2, t));
    return { s, t, c1, c2, dist: len(sub(c1, c2)) };
  }

  const CUT = { reach: 1.1, k: 2.2, maxSlide: 12 }; // reach = extra hit radius (m) for playable 3D contact; k = tuning gain

  /**
   * Both lines saw into each other. Damage to B grows with A's sharpness, sliding speed and line tension,
   * and shrinks with B's strength. Returns {contact, slide} and cuts whichever line reaches damage >= 1.
   */
  const PECHA_ESCAPE = 70; // kite-to-kite distance (not the thin closest-segment distance) beyond which a pecha is plainly over
  function cutStep(A, B, dt, cfg = CUT) {
    if (A.free || B.free) { A._pechaWith = B._pechaWith = null; return { contact: false, slide: 0 }; }
    const pa = A.linePoints(1), pb = B.linePoints(1);
    const c = closestSegments(pa[0], pa[1], pb[0], pb[1]);
    const rad = (A.thread.dia + B.thread.dia) / 2 + cfg.reach;
    const engaged = A._pechaWith === B;
    // A real pecha, once the lines have crossed, keeps going - through dheel, kheench, repositioning, even a
    // moment of separation - and ends only by a cut or by plainly flying apart. It is NOT ended by a kite
    // reversing direction (an earlier version released it that way; that was wrong - reversing is how a flier
    // keeps working the engagement, not how they leave it. Leaving it happens by continuing clear away, which
    // the distance check below already covers on its own, with no direction logic needed).
    if (!engaged) {
      if (c.dist > rad) return { contact: false, slide: 0 };
      A._pechaWith = B; B._pechaWith = A;   // a real pecha starts here, and holds until cut or clear separation
    } else {
      // release only once BOTH the kites are clearly apart AND the lines themselves aren't touching right now -
      // checking kite-distance alone flip-flopped the lock every frame for any pair flying further out than
      // PECHA_ESCAPE while their lines still crossed (the long-line dheel case), which quietly halved cutting
      // there instead of holding the engagement the way it does under 70 m.
      const apart = Math.hypot(A.p[0] - B.p[0], A.p[1] - B.p[1], A.p[2] - B.p[2]);
      if (apart > PECHA_ESCAPE && c.dist > rad) { A._pechaWith = B._pechaWith = null; return { contact: false, slide: 0 }; }
    }
    if (c.dist > rad) return { contact: false, slide: 0 };   // still locked in the same pecha, but not touching THIS instant - nothing to saw yet, stay locked for when it's back in contact
    const va = add(mul(A.anchorVel, 1 - c.s), mul(A.v, c.s)), vb = add(mul(B.anchorVel, 1 - c.t), mul(B.v, c.t));
    let vr = sub(va, vb);
    const n = c.dist > 1e-4 ? mul(sub(c.c1, c.c2), 1 / c.dist) : norm(cross(sub(pa[1], pa[0]), sub(pb[1], pb[0])));
    vr = sub(vr, mul(n, dot(vr, n)));                                   // slide = motion tangent to the contact
    const slide = Math.min(cfg.maxSlide, len(vr) + 0.5 * (Math.abs(A.reelRate) + Math.abs(B.reelRate)) * 0.5);
    const N = 0.5 * (A.tension + B.tension);
    B.damage += cfg.k * A.thread.sharp * slide * N * dt / B.thread.strength;
    A.damage += cfg.k * B.thread.sharp * slide * N * dt / A.thread.strength;
    const out = { contact: true, slide, cut: null, point: c.c1, sA: c.s, sB: c.t };
    if (A.damage >= 1 || B.damage >= 1) {
      const loser = A.damage >= B.damage ? A : B;
      loser.releaseLine('cut'); out.cut = loser;
    }
    return out;
  }

  /* ---------- Simple opponent AI: hunts the target kite, keeps altitude ---------- */
  function aiInput(me, target, t) {
    const dy = target.p[1] - me.p[1], dz = target.p[2] - me.p[2];
    const steer = clamp(-dy / 3, -1, 1) + 0.2 * Math.sin(0.8 * t);
    const reel = clamp(-dz / 6, -1, 1) * 0.8;
    const close = Math.hypot(dy, dz) < 3;
    return { steer, reel, pull: close ? 0.5 + 0.5 * Math.sin(4 * t) : 0 };
  }

  return { Wind, Kite, cutStep, closestSegments, aiInput, coeffs, CUT, RHO, G, DEG, clamp };
});
