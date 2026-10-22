/* Player records, kept in data/profiles.json.
 * Small and dependency-free: everything lives in memory, and is written to disk at most every few seconds, through a
 * temporary file and a rename so a crash can never leave a half-written file. Swap this for a database (SQLite,
 * Postgres) when the game grows - the rest of the server only uses get/touch/update. */
'use strict';
const fs = require('fs'), path = require('path');
const T = require('../client/src/trophies.js');
const E = require('../client/src/economy.js');

class Store {
  constructor(dir, { maxProfiles = 200000, flushMs = 3000 } = {}) {
    this.file = path.join(dir, 'profiles.json'); this.max = maxProfiles; this.flushMs = flushMs;
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
    this.map = new Map();
    try {
      const raw = JSON.parse(fs.readFileSync(this.file, 'utf8'));
      for (const [id, p] of Object.entries(raw)) if (/^[a-f0-9]{32}$/.test(id)) this.map.set(id, this._clean(p));
    } catch (e) { if (e.code !== 'ENOENT') console.error('profiles.json unreadable, starting empty:', e.message); }
    this.dirty = false; this.timer = null;
  }
  _clean(p) {
    const stats = T.blankStats();
    for (const k of T.STAT_KEYS) stats[k] = Math.max(0, Math.floor(+((p && p.stats) || {})[k] || 0));
    const valid = new Set(T.TROPHIES.map(t => t.id));
    const name = typeof (p && p.name) === 'string' ? p.name.slice(0, 16) : null;
    return { name, stats, trophies: (Array.isArray(p && p.trophies) ? p.trophies : []).filter(t => valid.has(t)), created: +(p && p.created) || Date.now(), seen: +(p && p.seen) || Date.now(),
      econ: E.cleanEcon(p && p.econ, stats) };   // coins, shop, collection, daily, weekly, career (see client/src/economy.js)
  }
  get(id) { return this.map.get(id) || null; }
  /** get or create, and mark as seen */
  touch(id) {
    let p = this.map.get(id);
    if (!p) {
      if (this.map.size >= this.max) this._prune();
      p = { stats: T.blankStats(), trophies: [], created: Date.now(), seen: Date.now(), econ: E.blankEcon() };
      this.map.set(id, p); this._dirty();
    } else if (Date.now() - p.seen > 3600e3) { p.seen = Date.now(); this._dirty(); }
    return p;
  }
  /** apply a stats change; returns the trophies it newly earned */
  update(id, fn) {
    const p = this.touch(id);
    fn(p.stats);
    const fresh = T.earned(p.stats, p.trophies);
    p.trophies.push(...fresh); p.seen = Date.now(); this._dirty();
    return fresh;
  }
  /** change a player's economy (coins, purchases, daily, ...); fn returns whatever the caller wants back */
  updateEcon(id, fn) { const p = this.touch(id); if (!p.econ) p.econ = E.blankEcon(); const out = fn(p.econ, p); p.seen = Date.now(); this._dirty(); return out; }
  /** this week's best fliers by cuts, longest streak and kites brought home (only players with a name) */
  leaderboard(now = Date.now(), n = 10) {
    const wk = E.weekOf(now), rows = [];
    for (const [id, p] of this.map) if (p.name && p.econ && p.econ.weekly && p.econ.weekly.wk === wk) rows.push({ id, name: p.name, w: p.econ.weekly });
    const top = key => rows.filter(r => r.w[key] > 0).sort((a, b) => b.w[key] - a.w[key] || a.name.localeCompare(b.name)).map((r, i) => ({ rank: i + 1, id: r.id, name: r.name, v: r.w[key] }));
    return { wk, cuts: top('cuts'), streak: top('streak'), loot: top('loot'), n };
  }
  setName(id, name) { const p = this.touch(id); if (p.name !== name) { p.name = name; this._dirty(); } }
  public(p) { return { name: p.name || null, stats: { ...p.stats }, trophies: p.trophies.slice(), econ: E.view(p.econ || E.blankEcon()) }; }
  _prune() {   // full: drop the least recently seen tenth of the players who never played a match
    const idle = [...this.map].filter(([, p]) => !p.stats.matches).sort((a, b) => a[1].seen - b[1].seen);
    for (const [id] of idle.slice(0, Math.max(1, Math.floor(this.max / 10)))) this.map.delete(id);
  }
  _dirty() { this.dirty = true; if (!this.timer) this.timer = setTimeout(() => this.flush(), this.flushMs); }
  /** something that must not be lost (a purchase, a match's pay): on disk within a quarter of a second */
  flushSoon() { this.dirty = true; if (this.timer && this.soon) return; clearTimeout(this.timer); this.soon = true; this.timer = setTimeout(() => { this.soon = false; this.flush(); }, 250); }
  flush() {
    clearTimeout(this.timer); this.timer = null; this.soon = false;
    if (!this.dirty) return;
    this.dirty = false;
    const tmp = this.file + '.tmp';
    try {
      fs.writeFileSync(tmp, JSON.stringify(Object.fromEntries(this.map)), { mode: 0o600 });
      fs.renameSync(tmp, this.file);
    } catch (e) { console.error('could not save profiles:', e.message); this.dirty = true; }
  }
}
module.exports = { Store };
