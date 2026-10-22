/* Online multiplayer: names, rooms and the match.
 *
 * Who decides what:
 *  - each browser flies its OWN kite (smooth controls, no lag) and sends where it is 15 times a second.
 *  - the SERVER checks every report (how fast the kite moved, how long the line is, that it stays on its own line),
 *    runs the pecha between every pair of kites 30 times a second with the same rules as the game, and alone decides
 *    the damage, every cut, the scores, the clock and the winner. Browsers only show what the server says.
 *  - stats and trophies of online matches are written straight from the server's own numbers.
 *
 * Messages (JSON over /ws):
 *  in : name{name} | rooms | create{settings} | join{code} | leave | gear{gear} | settings{settings} | team{team} | start
 *       s{...kite state} | ev{e:'snap'|'caught'|'land'} | emote{n} | ping{n}
 *  out: me | rooms | room | start | snap | cut | score | left | end | emote | error | pong
 *
 * Cut credit: whoever cuts the line LAST gets the cut. In a pecha that is the line it is hooked with when it parts;
 * a sawn line that then breaks under tension goes to the last line that was sawing it (within CREDIT_S seconds).
 * A pecha is always one line against one: a kite hooked with someone can't be hooked by a third line until that ends.
 * Dropped connections: during a match a player who loses connection keeps their place, kite and score for
 * REJOIN_MS; reconnecting (same browser cookie) and sending join{code} puts them straight back in.
 */
'use strict';
const crypto = require('crypto');
const PECHA = require('../client/src/pecha.js');
const { THREADS } = require('../client/src/data.js');
const ECON = require('../client/src/economy.js');

const TICK = 1 / 30, SNAP_EVERY = 2;                 // pecha at 30 Hz, positions out at 15 Hz
const MAX_MEMBERS = 10, MAX_ROOMS = 500, REJOIN_MS = 20000, CREDIT_S = 15;
// 10 rooftops along the street, one for every player
const ROOF = [[0, 0, 0], [6, 24, 2], [6, -24, 2], [-8, 46, 3.5], [-8, -46, 3.5], [14, 66, 5], [14, -66, 5], [-4, 88, 4], [-4, -88, 4], [-34, 12, 6]];
const COLORS = ['#ff6b35', '#3ad6c5', '#ffd166', '#ef476f', '#9b6bff', '#06d6a0', '#5aa8ff', '#f78c6b', '#c0e218', '#ff9ff3'];
const LINE_LOAD = { patang: 1, bird: 1, pipa: 1.1, tukkal: 1.3, eddy: 1.6, delta: 1.62, rokkaku: 2.7 };
const ARCHES = new Set(Object.keys(LINE_LOAD));
const SCENES = new Set(['praia', 'favela', 'favela2', 'noturno', 'lahore', 'sunset', 'basant', 'village', 'hills', 'desert', 'walled', 'seaside', 'towers', 'monsoon', 'winter', 'valley']);
const MTIMES = { '120': 120, '180': 180, '300': 300, '0': 0, c5: 0, c10: 0 };
const POINTS = { cut: 3, caught: 2, lost: -1 };
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';   // no 0/O, 1/I
const NAME_RE = /^[\p{L}\p{N}][\p{L}\p{N} _.-]{1,15}$/u;

const num = (v, lo, hi) => typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi;
const vec = (a, lim) => Array.isArray(a) && a.length === 3 && a.every(x => num(x, -lim, lim));
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const r2 = x => Math.round(x * 100) / 100;
const pointsOf = s => s.cut * POINTS.cut + s.caught * POINTS.caught + s.lost * POINTS.lost + s.bonus;

function cleanName(n) {
  if (typeof n !== 'string') return null;
  const s = n.normalize('NFC').replace(/\s+/g, ' ').trim();
  return NAME_RE.test(s) ? s : null;
}
function cleanSettings(x = {}) {
  return {
    scene: SCENES.has(x.scene) ? x.scene : 'lahore',
    mtime: Object.prototype.hasOwnProperty.call(MTIMES, String(x.mtime)) ? String(x.mtime) : '180',
    open: x.open !== false,
    teams: x.teams === true     // Mohalla: two teams; team-mates' lines never cut each other, the team with more points wins
  };
}
/** a player's kit, as the server will trust it: only known threads, a sane kite description, colours as #rrggbb */
function cleanGear(g = {}) {
  const out = { thread: THREADS[g.thread] ? g.thread : 'manjha', char: /^(d:[a-z]{2,12}|myflier)$/.test(g.char) ? g.char : 'd:ali',
    spool: /^(charkhi|pinna):[a-z]{2,12}$/.test(g.spool) ? g.spool : 'charkhi:sheesham',
    kanni: ['nose', 'stock', 'tail'].includes(g.kanni) ? g.kanni : 'stock', kbal: ['left', 'center', 'right'].includes(g.kbal) ? g.kbal : 'center' };
  const k = g.kite || {};
  out.kite = { id: typeof k.id === 'string' && /^[\w:.-]{1,40}$/.test(k.id) ? ECON.kiteId(k.id) : ECON.DEFAULT_KITES[0], arche: ARCHES.has(k.arche) ? k.arche : 'patang',
    scale: num(k.scale, 0.5, 1.5) ? k.scale : 1, name: typeof k.name === 'string' ? k.name.replace(/[^\p{L}\p{N} _.'-]/gu, '').slice(0, 24) : '' };
  // a kite made in the workshop travels as its small recipe, so the others can paint it too
  if (k.recipe && typeof k.base === 'string' && /^assets\/[\w\/.-]+\.(png|jpe?g|webp)$/i.test(k.base) && !k.base.includes('..')) {
    const txt = JSON.stringify(k.recipe);
    if (txt.length <= 1800 && !/[<>`]|javascript:|url\(/i.test(txt)) { out.kite.base = ECON.kiteBase(k.base); out.kite.recipe = k.recipe; }
  }
  // the my-flier look: only plain values
  if (out.char === 'myflier' && g.look && typeof g.look === 'object') {
    const look = {};
    for (const [key, v] of Object.entries(g.look).slice(0, 40)) {
      if (!/^[a-zA-Z]{1,12}$/.test(key)) continue;
      if (typeof v === 'boolean' || (typeof v === 'number' && Number.isFinite(v) && Math.abs(v) < 100)) look[key] = v;
      else if (typeof v === 'string' && (/^#[0-9a-fA-F]{6}$/.test(v) || /^[a-z]{0,12}$/.test(v))) look[key] = v;
    }
    look.name = ''; out.look = look;
  }
  return out;
}

class Rooms {
  constructor({ store, log = console }) {
    this.store = store; this.log = log;
    this.rooms = new Map();          // code -> room
    this.timer = setInterval(() => this.tick(), TICK * 1000); this.timer.unref();
  }
  close() { clearInterval(this.timer); }

  /* ---------------- connections ---------------- */
  connect(sock) {
    sock.pub = crypto.randomBytes(5).toString('hex');            // public id: others never see the cookie id
    const prof = sock.player && this.store.get(sock.player);
    sock.name = prof && prof.name ? prof.name : null;
    sock.send({ t: 'me', id: sock.pub, name: sock.name, known: !!sock.player });
    sock.on('message', m => { try { this.handle(sock, m); } catch (e) { this.log.error('room message error', e); } });
    sock.on('close', () => this.dropped(sock));
  }
  /** the socket closed. In a lobby that is leaving; in a match the player keeps their place for REJOIN_MS. */
  dropped(sock) {
    const room = sock.room; if (!room) return;
    const x = room.members.get(sock.pub);
    if (!x || room.state !== 'playing' || !sock.player) return this.leave(sock, 'left');
    x.goneAt = Date.now(); sock.room = null;
    this.send(room, { t: 'away', id: x.id, name: x.name });
  }
  /** the same player (same cookie) back on a new socket: hand them their old seat, id and kite */
  rejoin(room, x, sock) {
    if (sock.room && sock.room !== room) this.leave(sock, 'left');
    x.sock = sock; x.goneAt = 0; sock.pub = x.id; sock.room = room;
    if (x.k) x.k.at = Date.now();
    sock.send({ t: 'me', id: x.id, name: sock.name, known: true });
    sock.send({ t: 'room', room: this.roomView(room) });
    this.send(room, { t: 'back', id: x.id, name: x.name });
    this.sendScores(room);
  }
  /** seats whose player didn't come back in time are given up */
  sweepGone(room, now) {
    for (const x of [...room.members.values()]) if (x.goneAt && now - x.goneAt > REJOIN_MS) this.removeMember(room, x);
  }
  err(sock, error) { sock.send({ t: 'error', error }); }

  handle(sock, m) {
    switch (m.t) {
      case 'ping': return sock.send({ t: 'pong', n: num(m.n, 0, 1e15) ? m.n : 0 });
      case 'name': {
        if (!sock.player) return this.err(sock, 'Please reload the page.');
        const n = cleanName(m.name);
        if (!n) return this.err(sock, 'Name: 2-16 letters or numbers.');
        sock.name = n; this.store.setName(sock.player, n);
        if (sock.room) this.broadcastRoom(sock.room);
        return sock.send({ t: 'me', id: sock.pub, name: n, known: true });
      }
      case 'rooms': return sock.send({ t: 'rooms', rooms: this.list() });
      case 'create': {
        if (!sock.name) return this.err(sock, 'Choose a name first.');
        if (this.rooms.size >= MAX_ROOMS) return this.err(sock, 'The server is full, try again soon.');
        this.leave(sock, 'left');
        let code; do { code = Array.from(crypto.randomBytes(4), b => CODE_CHARS[b % CODE_CHARS.length]).join(''); } while (this.rooms.has(code));
        const room = { code, host: sock.pub, state: 'lobby', settings: cleanSettings(m.settings), members: new Map(), match: null, made: Date.now() };
        this.rooms.set(code, room);
        return this.addMember(room, sock, m.gear);
      }
      case 'join': {
        if (!sock.name) return this.err(sock, 'Choose a name first.');
        const code = typeof m.code === 'string' ? m.code.toUpperCase().replace(/[^A-Z0-9]/g, '') : '';
        const room = this.rooms.get(code);
        if (!room) return this.err(sock, 'No room with that code.');
        if (room.members.has(sock.pub)) return this.broadcastRoom(room);
        // the same player coming back after a dropped connection (matched by their signed cookie, never by name)
        // (an old socket that hasn't noticed it is dead yet is closed and replaced - the cookie proves it's the same player)
        const seat = sock.player && [...room.members.values()].find(x => x.player === sock.player && x.sock !== sock);
        if (seat) {
          if (seat.sock.open) { seat.sock.room = null; seat.sock.close(4000, 'replaced by a new connection'); }
          return this.rejoin(room, seat, sock);
        }
        if (room.members.size >= MAX_MEMBERS) return this.err(sock, `That room is full (${MAX_MEMBERS} players).`);
        if (room.state !== 'lobby') return this.err(sock, 'That match has already started - wait for it to finish.');
        this.leave(sock, 'left');
        return this.addMember(room, sock, m.gear);
      }
      case 'leave': return this.leave(sock, 'left');
      case 'gear': {
        const room = sock.room; if (!room) return;
        const mem = room.members.get(sock.pub); if (!mem) return;
        if (room.state === 'playing' && !(mem.k && (mem.k.free || mem.landed))) return;   // change kites only when it's down
        mem.gear = this.ownedGear(sock, cleanGear(m.gear));
        if (room.state === 'playing') { mem.thread = this.threadFor(mem.gear); this.send(room, { t: 'gear', id: mem.id, gear: mem.gear }); }
        else this.broadcastRoom(room);
        return;
      }
      case 'settings': {
        const room = sock.room;
        if (!room || room.host !== sock.pub || room.state !== 'lobby') return;
        const was = room.settings.teams;
        room.settings = cleanSettings(m.settings);
        if (room.settings.teams && !was) [...room.members.values()].sort((a, b) => a.slot - b.slot).forEach((x, i) => { x.team = i % 2; });   // teams just switched on: deal everyone out evenly
        return this.broadcastRoom(room);
      }
      case 'team': {   // pick a side in the lobby
        const room = sock.room; if (!room || room.state !== 'lobby' || !room.settings.teams || (m.team !== 0 && m.team !== 1)) return;
        const x = room.members.get(sock.pub); if (!x) return;
        x.team = m.team; return this.broadcastRoom(room);
      }
      case 'start': {
        const room = sock.room;
        if (!room || room.host !== sock.pub || room.state !== 'lobby') return;
        return this.startMatch(room);
      }
      case 's': return this.state(sock, m);
      case 'ev': return this.event(sock, m);
      case 'emote': {
        const room = sock.room; if (!room || !num(m.n, 0, 7)) return;
        const now = Date.now(); if (now - (sock.lastEmote || 0) < 1500) return; sock.lastEmote = now;
        return this.send(room, { t: 'emote', id: sock.pub, n: m.n | 0 });
      }
      default: return this.err(sock, 'unknown message');
    }
  }
  list() {
    return [...this.rooms.values()].filter(r => r.settings.open && r.state === 'lobby' && r.members.size < MAX_MEMBERS).slice(0, 30)
      .map(r => ({ code: r.code, host: (r.members.get(r.host) || {}).name || '?', players: r.members.size, scene: r.settings.scene, mtime: r.settings.mtime, teams: !!r.settings.teams }));
  }
  addMember(room, sock, gear) {
    const used = new Set([...room.members.values()].map(x => x.slot));
    let slot = 0; while (used.has(slot)) slot++;
    room.members.set(sock.pub, { id: sock.pub, sock, player: sock.player, name: sock.name, gear: this.ownedGear(sock, cleanGear(gear)), slot, color: COLORS[slot % COLORS.length], goneAt: 0, team: this.smallerTeam(room) });
    sock.room = room;
    this.broadcastRoom(room);
  }
  /** the shop's items only work for whoever bought them: anything not owned falls back to the free starter kit */
  ownedGear(sock, g) {
    const p = sock.player && this.store.get(sock.player), econ = p && p.econ;
    if (!ECON.owns(econ, 'thread', g.thread)) g.thread = 'manjha';
    if (!ECON.owns(econ, 'spool', g.spool)) g.spool = 'charkhi:sheesham';
    if (g.char !== 'myflier' && !ECON.owns(econ, 'char', g.char)) g.char = 'd:ali';
    if (!g.kite.recipe && !ECON.owns(econ, 'kite', g.kite.id)) g.kite = { id: ECON.DEFAULT_KITES[0], arche: 'patang', scale: 1, name: 'Lal Hukam' };
    return g;
  }
  smallerTeam(room) { const n = [0, 0]; for (const x of room.members.values()) n[x.team | 0]++; return n[1] < n[0] ? 1 : 0; }
  leave(sock, why) {
    const room = sock.room; if (!room) return;
    sock.room = null;
    const x = room.members.get(sock.pub); if (x) this.removeMember(room, x);
  }
  removeMember(room, x) {
    room.members.delete(x.id);
    if (room.match) for (const key of [...room.match.pst.keys()]) if (key.includes(x.id)) room.match.pst.delete(key);
    const present = [...room.members.values()].filter(m => !m.goneAt);
    if (!present.length) { this.rooms.delete(room.code); return; }
    if (room.host === x.id || !room.members.has(room.host) || room.members.get(room.host).goneAt) room.host = present[0].id;
    if (room.state === 'playing') this.send(room, { t: 'left', id: x.id, name: x.name, host: room.host });
    this.broadcastRoom(room);
  }
  roomView(room) {
    return { code: room.code, host: room.host, state: room.state, settings: room.settings,
      members: [...room.members.values()].map(x => ({ id: x.id, name: x.name, color: x.color, gear: x.gear, away: !!x.goneAt, team: x.team | 0 })) };
  }
  broadcastRoom(room) { this.send(room, { t: 'room', room: this.roomView(room) }); }
  send(room, msg) { const s = JSON.stringify(msg); for (const x of room.members.values()) if (!x.goneAt && x.sock.open) x.sock.sendRaw(s); }

  /* ---------------- the match ---------------- */
  threadFor(gear) {
    const th = THREADS[gear.thread] || THREADS.manjha, load = (LINE_LOAD[gear.kite.arche] || 1) * Math.max(0.7, gear.kite.scale || 1);
    return { ...th, strength: th.strength * 1.3 * load };   // same gauge rule as the game: a big kite flies on heavier thread
  }
  startMatch(room) {
    const s = room.settings, members = [...room.members.values()].sort((a, b) => a.slot - b.slot);
    members.forEach((x, i) => {
      x.home = ROOF[i % ROOF.length]; x.anchor = [x.home[0], x.home[1], x.home[2] + 1.5];
      x.thread = this.threadFor(x.gear);
      x.score = { cut: 0, lost: 0, caught: 0, bonus: 0 }; x.rec = { cuts: 0, lost: 0, caught: 0, bestStreak: 0, dheelCuts: 0, khainchCuts: 0 };
      x.k = null; x.seq = -1; x.streak = 0; x.lastCutT = -99; x.lastCaught = -99; x.strikes = []; x.landed = false; x.freeAt = -99;
    });
    room.state = 'playing';
    room.match = { t: 0, n: 0, duration: MTIMES[s.mtime], cutTarget: /^c\d+$/.test(s.mtime) ? +s.mtime.slice(1) : 0, seed: Math.random() * 10, pst: new Map(), cuts: 0, teams: !!s.teams };
    this.send(room, { t: 'start', seed: r2(room.match.seed), scene: s.scene, mtime: s.mtime, duration: room.match.duration, cutTarget: room.match.cutTarget,
      teams: !!s.teams, players: members.map(x => ({ id: x.id, name: x.name, color: x.color, gear: x.gear, home: x.home, team: x.team | 0 })) });
    this.broadcastRoom(room);
  }
  /** a kite report from its flier: checked before the server believes it */
  state(sock, m) {
    const room = sock.room; if (!room || room.state !== 'playing') return;
    const x = room.members.get(sock.pub); if (!x || !x.anchor) return;
    if (!Number.isInteger(m.k) || m.k < 0 || m.k > 1e6) return;
    if (!vec(m.p, 2000) || !vec(m.v, 200) || !num(m.L, 0, 420) || !num(m.rr, -40, 40) || !num(m.T, 0, 2000)) return this.strike(x, 'bad state');
    const now = Date.now();
    if (m.k > x.seq) {   // a new kite: allowed after the last one was cut / snapped / landed (and ~2 s for a new one to go up)
      const old = x.k;
      if (old && !old.free && !x.landed) return this.strike(x, 'new kite while flying');
      if (old && old.free && room.match.t - x.freeAt < 1.8) return;
      x.seq = m.k; x.landed = false;
      x.k = { id: x.id, seq: m.k, anchor: x.anchor, p: m.p.slice(), v: m.v.slice(), free: false, damage: 0, thread: x.thread, sawMul: 1, at: now,
        lineLen: m.L, reelRate: 0, tension: 0, pullE: 0, sendE: 0, virtualMass: 0.03, owner: x,
        get lineStrength() { const d = Math.min(this.damage, 1); return this.thread.strength * (1 - 0.6 * d * d * d); },
        releaseLine(reason) { this.free = true; this.lostBy = reason; } };
      for (const key of [...room.match.pst.keys()]) if (key.includes(x.id)) room.match.pst.delete(key);
    }
    const k = x.k; if (!k || k.seq !== m.k || k.free) return;
    // the kite must stay on its own line, and can't move faster than a kite can
    const r = dist(m.p, x.anchor), dt = Math.max(0.05, (now - k.at) / 1000);
    if (r > Math.min(m.L, 410) + 4 || m.p[2] < -1) return this.strike(x, 'off its line');
    // faster than a kite can fly (a lag spike, or a cheat): believed, but that kite sits out of every pecha for a moment,
    // so a jump can never win a cut. Rejecting it instead left the kite stuck and kicked honest players after lag.
    const jump = dist(m.p, k.p), allowed = 45 * dt + 3;
    if (jump > allowed) { k.coolUntil = room.match.t + 1.2; if (jump > allowed + 80) this.strike(x, 'teleport'); }
    k.p = m.p; k.v = m.v; k.lineLen = m.L; k.reelRate = m.rr; k.tension = m.T; k.at = now;
    k.pullE = num(m.pe, 0, 1) ? m.pe : 0; k.sendE = num(m.se, 0, 1) ? m.se : 0; k.launch = !!m.la;
    k.tunkaT = num(m.tk, 0, 1) ? m.tk : 0;   // a tunka in a pecha is a jhatka (pecha.js limits it to one every 0.3 s, whatever a client claims)
    k.virtualMass = 0.03 + 0.5 * k.thread.mu * k.lineLen;
    // what the others need to draw it (passed through as numbers only)
    k.view = [num(m.h, -1e4, 1e4) ? r2(m.h) : 0, num(m.b, -1e4, 1e4) ? r2(m.b) : 0, num(m.al, -3, 3) ? r2(m.al) : 0.5, num(m.tk, 0, 1) ? r2(m.tk) : 0, num(m.in, 0, 2) ? r2(m.in) : 0];
  }
  strike(x, why) {
    const now = Date.now(); x.strikes = x.strikes.filter(t => now - t < 10000); x.strikes.push(now);
    if (x.strikes.length > 30) { this.log.warn(`[anticheat] kicked ${x.name}: ${why}`); this.err(x.sock, 'Disconnected: your game sent impossible moves.'); x.sock.close(1008, 'cheat'); }
  }
  event(sock, m) {
    const room = sock.room; if (!room || room.state !== 'playing') return;
    const x = room.members.get(sock.pub), M = room.match; if (!x) return;
    if (m.e === 'snap') {   // its line broke under load: if it was being sawn just now, that's the sawyer's cut
      const k = x.k; if (!k || k.free) return;
      // the last line that sawed it gets the cut: straight away if they were still in contact, or if the line was
      // badly sawn and broke within CREDIT_S of that last stroke. Otherwise it simply snapped.
      const top = PECHA.topSawer(k, M.t, k.lastSawBy), ago = M.t - (k.lastSawT ?? -99), by = top && top.owner && room.members.has(top.owner.id) && (ago < 2 || (k.damage > 0.45 && ago < CREDIT_S)) ? top : null;
      return this.cut(room, k, by, by ? 0.5 : null, k.p, !by);
    }
    if (m.e === 'land') { if (x.k && !x.k.free) x.landed = true; return; }
    if (m.e === 'caught') {   // a kite brought home on your line: at most one every 6 s (k: which kite, for the collection)
      if (M.t - x.lastCaught < 6) return;
      x.lastCaught = M.t; x.score.caught++; x.rec.caught++;
      if (typeof m.k === 'string') (x.rec.lootIds || (x.rec.lootIds = [])).push(m.k.slice(0, 40));
      return this.sendScores(room);
    }
  }
  cut(room, loser, winnerKite, s, point, snap) {
    const M = room.match, lx = loser.owner, wx = winnerKite && winnerKite.owner;
    loser.free = true; lx.freeAt = M.t; lx.landed = false;
    lx.score.lost++; lx.rec.lost++; lx.streak = 0;
    let streak = 0;
    if (wx && wx !== lx && !snap) {
      wx.score.cut++; wx.rec.cuts++; M.cuts++;
      wx.streak = M.t - wx.lastCutT < 25 ? wx.streak + 1 : 1; wx.lastCutT = M.t; streak = wx.streak;
      if (wx.streak > 1) wx.score.bonus += wx.streak - 1;
      wx.rec.bestStreak = Math.max(wx.rec.bestStreak, wx.streak);
      if (winnerKite.sendE > 0.3) wx.rec.dheelCuts++;
      if (winnerKite.pullE > 0.3) wx.rec.khainchCuts++;
    }
    this.send(room, { t: 'cut', l: lx.id, w: wx && !snap ? wx.id : null, snap: !!snap, s: r2(s || 0.5), pt: (point || loser.p).map(r2), streak, scores: this.scores(room) });
    if (M.cutTarget && wx && (M.teams ? this.teamCuts(room, wx.team) : wx.score.cut) >= M.cutTarget) this.endMatch(room);
  }
  teamCuts(room, team) { let n = 0; for (const x of room.members.values()) if (x.score && (x.team | 0) === (team | 0)) n += x.score.cut; return n; }
  scores(room) { const o = {}; for (const x of room.members.values()) if (x.score) o[x.id] = x.score; return o; }
  sendScores(room) { this.send(room, { t: 'score', scores: this.scores(room) }); }
  tick() {
    for (const room of this.rooms.values()) {
      if (room.state !== 'playing') continue;
      const M = room.match; M.t += TICK; M.n++;
      const now = Date.now();
      this.sweepGone(room, now); if (room.state !== 'playing' || !this.rooms.has(room.code)) continue;
      const kites = [...room.members.values()].map(x => x.k).filter(k => k && !k.free && !k.launch && now - k.at < 1500 && !(k.coolUntil > M.t));
      // how many pechas each line is hooked in (v6.4: up to PECHA.CFG.maxHooks - a third line may join a running pecha)
      for (const k of kites) { k.hooks = 0; k.sawMax = 0; }
      for (const st of M.pst.values()) if (st.on && st.locked && st.a && st.b && !st.a.free && !st.b.free && kites.includes(st.a) && kites.includes(st.b)) { st.a.hooks++; st.b.hooks++; }
      for (let i = 0; i < kites.length; i++) for (let j = i + 1; j < kites.length; j++) {
        const a = kites[i], b = kites[j]; if (a.free || b.free) continue;
        const key = a.id + ':' + a.seq + '|' + b.id + ':' + b.seq;
        if (M.teams && a.owner.team === b.owner.team) continue;   // team-mates fly together; their lines never fight
        let st = M.pst.get(key); if (!st) { st = {}; M.pst.set(key, st); }
        if (!PECHA.canHook(a, b, st)) { st.on = false; continue; }   // both lines already as tangled as a line can be
        const va = a.v, vb = b.v, was = !!st.locked;   // the hook's push is felt in the browsers; here only the cut matters
        const r = PECHA.step(a, b, TICK, st);
        a.v = va; b.v = vb;
        if (st.locked && !was && st.on) { a.hooks++; b.hooks++; }
        // credit: whoever cut the line last - with two lines sawing one, the one doing more of the cutting
        if (r.contact) { if ((r.dmgA || 0) >= a.sawMax) { a.sawMax = r.dmgA || 0; a.lastSawBy = b; a.lastSawT = M.t; } if ((r.dmgB || 0) >= b.sawMax) { b.sawMax = r.dmgB || 0; b.lastSawBy = a; b.lastSawT = M.t; } }
        if (r.contact) { PECHA.creditSaw(a, b, r.dmgA, TICK, M.t); PECHA.creditSaw(b, a, r.dmgB, TICK, M.t); }
        if (r.cut) { const loser = r.cut, winner = PECHA.topSawer(loser, M.t, loser === a ? b : a); this.cut(room, loser, winner, loser === a ? r.sA : r.sB, r.point, false); }
        if (room.state !== 'playing') break;
      }
      if (room.state !== 'playing') continue;
      if (M.n % SNAP_EVERY === 0) {
        const k = [];
        for (const x of room.members.values()) {
          const q = x.k; if (!q) continue;
          k.push([x.id, q.seq, q.p.map(r2), q.v.map(r2), r2(q.lineLen), r2(q.reelRate), r2(q.tension), ...(q.view || [0, 0, 0.5, 0, 0]), r2(q.pullE), r2(q.sendE), q.free ? 1 : 0, r2(q.damage), q.launch ? 1 : 0, x.landed ? 1 : 0]);
        }
        this.send(room, { t: 'snap', mt: r2(M.t), k });
      }
      if (M.duration && M.t >= M.duration) this.endMatch(room);
    }
  }
  endMatch(room) {
    const M = room.match, list = [...room.members.values()].filter(x => x.score);
    list.sort(M.cutTarget ? (a, b) => b.score.cut - a.score.cut || pointsOf(b.score) - pointsOf(a.score) : (a, b) => pointsOf(b.score) - pointsOf(a.score) || b.score.cut - a.score.cut);
    // teams: the side with more points wins (in a cut race, more cuts); every member of the winning side wins
    let teamWin = -1, team = null;
    if (M.teams) {
      team = [0, 1].map(t => { const xs = list.filter(x => (x.team | 0) === t); return { cut: xs.reduce((n, x) => n + x.score.cut, 0), points: xs.reduce((n, x) => n + pointsOf(x.score), 0), n: xs.length }; });
      const key = M.cutTarget ? 'cut' : 'points';
      teamWin = team[0][key] === team[1][key] ? (team[0].points === team[1].points ? -1 : team[0].points > team[1].points ? 0 : 1) : team[0][key] > team[1][key] ? 0 : 1;
      if (!team[0].n || !team[1].n) teamWin = -1;   // nobody on the other side: no winner
    }
    const results = list.map((x, i) => ({ id: x.id, name: x.name, color: x.color, place: i + 1, team: x.team | 0, ...x.score, points: pointsOf(x.score) }));
    room.state = 'lobby'; room.match = null;
    const flag = id => /^flag:/.test(id), night = room.settings.scene === 'basant' || room.settings.scene === 'noturno';
    const trophies = {}, paid = {};
    list.forEach((x, i) => {
      if (!x.player) return;
      const won = M.teams ? teamWin === (x.team | 0) : i === 0 && list.length >= 2 && (!M.cutTarget || x.score.cut >= M.cutTarget);
      trophies[x.id] = this.store.update(x.player, s => {
        s.cuts += x.rec.cuts; s.lost += x.rec.lost; s.caught += x.rec.caught; s.dheelCuts += x.rec.dheelCuts; s.khainchCuts += x.rec.khainchCuts;
        s.bestStreak = Math.max(s.bestStreak, x.rec.bestStreak); s.matches += 1;
        if (won) { s.wins += 1; if (night) s.nightWins += 1; if (list.length >= 7) s.bigWins += 1; if (flag(x.gear.kite.id)) s.flagWins += 1; }
      });
      paid[x.id] = this.store.updateEcon(x.player, econ => ECON.payMatch(econ, { rec: x.rec, won, lootIds: x.rec.lootIds || [] }));
    });
    for (const x of room.members.values()) { x.k = null; x.score = null; if (!x.goneAt) x.sock.send({ t: 'end', results, cutTarget: M.cutTarget, teams: M.teams, team, teamWin, newTrophies: trophies[x.id] || [], paid: paid[x.id] || null }); }
    for (const x of [...room.members.values()]) if (x.goneAt) this.removeMember(room, x);
    if (this.rooms.has(room.code)) this.broadcastRoom(room);
  }

  get stats() { let players = 0, playing = 0, away = 0; for (const r of this.rooms.values()) { players += r.members.size; if (r.state === 'playing') playing++; for (const x of r.members.values()) if (x.goneAt) away++; } return { rooms: this.rooms.size, playing, players, away }; }
}
module.exports = { Rooms, cleanName, cleanGear, ROOF, MAX_MEMBERS };
