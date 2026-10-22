/* Match tokens and result checking.
 *
 * The game still runs in the browser (that keeps the server's load tiny), so the server can't watch every frame.
 * What it CAN do is refuse any result that could not have happened:
 *  - every match starts with a server-issued token (random, single use, tied to this player, expires). The match's
 *    settings - bots, scene, length, kite - are recorded on the server at that moment, so they can't be changed later.
 *  - the game clock can't run faster than the real clock between the token and the result.
 *  - cuts, losses and kites caught can't come faster than the game's own physics allows, cut times must fit inside the
 *    match, a streak can't exceed the cuts, a win must agree with the settings (a cut race needs the target cuts) ...
 *  - stats are only ever added to on the server; the browser never sends totals or trophies.
 * A result that fails any check is refused and nothing is recorded.
 * Full protection (the server deciding every pecha itself) comes with multiplayer, where the server runs the sky.
 */
'use strict';
const crypto = require('crypto');
const E = require('../client/src/economy.js');

const LIMITS = {
  tokenTtlMs: 4 * 3600e3,      // a match token is good for 4 hours
  openPerPlayer: 3,            // at most this many unfinished matches per player
  minCutGap: 3,                // seconds of game time between two of your cuts, at the very least
  minLostGap: 2.5,             // ... between two of your kites being lost (a new kite takes ~2.6 s to come back)
  minCaughtGap: 4,             // ... between two kites brought home
  clockSlack: 1.03,            // game time may be at most 3% (+5 s) ahead of real time (frame timing jitter)
  clockExtra: 5
};
const MODES = new Set(['festival', 'single', 'two', 'mohalla']), SCENES = /^[a-z0-9]{2,20}$/, DIFFS = new Set(['easy', 'normal', 'hard']);
const MTIMES = { '120': 120, '180': 180, '300': 300, '0': 0, c5: 0, c10: 0 };

const int = (v, lo, hi) => Number.isInteger(v) && v >= lo && v <= hi;
const num = (v, lo, hi) => typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi;

class Matches {
  constructor() { this.open = new Map(); }
  /** validate the start request; returns { token } or { error } */
  start(pid, b, now = Date.now()) {
    if (!b || typeof b !== 'object') return { error: 'bad request' };
    if (!MODES.has(b.mode)) return { error: 'bad mode' };
    if (!int(b.bots, 0, 9)) return { error: 'bad bots' };
    if (!DIFFS.has(b.diff)) return { error: 'bad difficulty' };
    if (!Object.prototype.hasOwnProperty.call(MTIMES, b.mtime)) return { error: 'bad length' };
    if (typeof b.scene !== 'string' || !SCENES.test(b.scene)) return { error: 'bad scene' };
    if (typeof b.kite !== 'string' || b.kite.length > 40) return { error: 'bad kite' };
    // Mohalla (team) matches: team size, and which career rung it is (-1 = a quick team match). A career match must be
    // played exactly as that rung is set up, or its reward could be farmed on an easy setting.
    let teams = 0, career = -1;
    if (b.mode === 'mohalla') {
      teams = b.teams; career = b.career ?? -1;
      if (!int(teams, 2, 3)) return { error: 'bad teams' };
      if (!int(career, -1, E.MOHALLAS.length - 1)) return { error: 'bad career' };
      const M = E.MOHALLAS[career];
      if (M && (M.size !== teams || M.diff !== b.diff || M.mtime !== b.mtime)) return { error: 'career match not as set up' };
    }
    this._sweep(now);
    const mine = [...this.open].filter(([, m]) => m.pid === pid).sort((x, y) => x[1].start - y[1].start);
    while (mine.length >= LIMITS.openPerPlayer) this.open.delete(mine.shift()[0]);
    const token = crypto.randomBytes(18).toString('base64url');
    this.open.set(token, { pid, start: now, mode: b.mode, bots: b.bots, diff: b.diff, mtime: b.mtime, scene: b.scene, kite: b.kite,
      cutTarget: /^c\d+$/.test(b.mtime) ? +b.mtime.slice(1) : 0, duration: MTIMES[b.mtime], teams, career });
    return { token };
  }
  /** check a result. Returns { ok:true, apply(stats) } or { ok:false, reason }. The token is used up either way. */
  end(pid, b, now = Date.now()) {
    if (!b || typeof b !== 'object' || typeof b.token !== 'string') return { ok: false, reason: 'no token' };
    const m = this.open.get(b.token);
    if (!m) return { ok: false, reason: 'unknown or used token' };
    this.open.delete(b.token);                                   // single use, even if the result is refused
    if (m.pid !== pid) return { ok: false, reason: 'token belongs to someone else' };
    if (now - m.start > LIMITS.tokenTtlMs) return { ok: false, reason: 'token expired' };
    const r = b.rec;
    if (!r || typeof r !== 'object') return { ok: false, reason: 'no record' };
    const t = b.t, real = (now - m.start) / 1000;
    if (!num(t, 0, 4 * 3600)) return { ok: false, reason: 'bad time' };
    if (t > real * LIMITS.clockSlack + LIMITS.clockExtra) return { ok: false, reason: 'game clock ahead of real time' };
    if (m.duration && t > m.duration + 2) return { ok: false, reason: 'longer than the match' };
    for (const k of ['cuts', 'lost', 'caught', 'bestStreak', 'dheelCuts', 'khainchCuts']) if (!int(r[k], 0, 10000)) return { ok: false, reason: 'bad ' + k };
    if (r.cuts > 1 + t / LIMITS.minCutGap) return { ok: false, reason: 'too many cuts for the time' };
    if (r.lost > 1 + t / LIMITS.minLostGap) return { ok: false, reason: 'too many losses for the time' };
    if (r.caught > 1 + t / LIMITS.minCaughtGap) return { ok: false, reason: 'too many kites caught for the time' };
    if (r.bestStreak > r.cuts || r.dheelCuts > r.cuts || r.khainchCuts > r.cuts) return { ok: false, reason: 'numbers do not add up' };
    // every cut has a time, in order, inside the match, at least minCutGap apart
    const ct = r.cutTimes;
    if (!Array.isArray(ct) || ct.length !== r.cuts) return { ok: false, reason: 'cut times missing' };
    for (let i = 0; i < ct.length; i++) {
      if (!num(ct[i], 0, t + 0.5)) return { ok: false, reason: 'cut time outside the match' };
      if (i && ct[i] - ct[i - 1] < LIMITS.minCutGap - 0.05) return { ok: false, reason: 'cuts too close together' };
    }
    if (!int(b.players, 1, 12) || !int(b.place, 1, 12) || b.place > b.players) return { ok: false, reason: 'bad placing' };
    // (bots can be added or removed during a match, so the count at the end may differ from the start)
    const abandoned = !!b.abandoned;
    // a win: finished, first place, against at least one bot, solo, and (cut race) the target reached
    let won = !abandoned && b.place === 1 && m.mode !== 'two' && b.players >= 2;
    // (a team race is won by the team's cuts, not only yours)
    if (won && m.cutTarget && !m.teams && r.cuts < m.cutTarget) return { ok: false, reason: 'race won without the cuts' };
    if (won && m.duration && t < m.duration - 3 && !m.cutTarget) won = false;   // a timed match is only won at the bell
    const flag = /^flag:/.test(m.kite), night = m.scene === 'basant' || m.scene === 'noturno';
    if (b.lootIds !== undefined && (!Array.isArray(b.lootIds) || b.lootIds.length > r.caught)) return { ok: false, reason: 'bad loot list' };
    return {
      ok: true, won, abandoned, career: m.career, lootIds: E.cleanLootIds(b.lootIds, r.caught), rec: r,
      apply(s) {
        s.cuts += r.cuts; s.lost += r.lost; s.caught += r.caught;
        s.dheelCuts += r.dheelCuts; s.khainchCuts += r.khainchCuts; s.bestStreak = Math.max(s.bestStreak, r.bestStreak);
        if (!abandoned) s.matches += 1;
        if (won) { s.wins += 1; if (night) s.nightWins += 1; if (m.bots >= 6 && b.players >= 7) s.bigWins += 1; if (flag) s.flagWins += 1; }
      }
    };
  }
  _sweep(now) { for (const [k, m] of this.open) if (now - m.start > LIMITS.tokenTtlMs) this.open.delete(k); }
  get size() { return this.open.size; }
}
module.exports = { Matches, LIMITS };
