/* Offline kite-fighting game: Festival / 1 Player / 2 Player (split-screen) with bots. No network. */
(function () {
  'use strict';
  const { KITES, THREADS, PALETTES } = KiteData, P = KitePhysics, ART = KiteArt, PECHA = KitePecha, SFX = window.Sound;
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  // anything a player typed (kite names, flier names) or that came out of localStorage is escaped before it is put into
  // the page - a name like <img onerror=...> must show as text, never run
  const esc = v => String(v ?? '').replace(/[&<>"'`]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '`': '&#96;' }[c]));
  const cleanName = (v, max = 24) => String(v ?? '').replace(/[\u0000-\u001f<>"'`\\]/g, '').trim().slice(0, max);
  const DT = 1 / 120, clamp = P.clamp, DEG = P.DEG;
  const PECHA_VIEW = { ...PECHA.CFG, visualOnly: true };   // online: hooks and bent lines are shown, the server cuts
  const COLORS = ['#ff6b35', '#3ad6c5', '#ffd166', '#ef476f', '#9b6bff', '#06d6a0', '#5aa8ff', '#f78c6b', '#c0e218', '#ff9ff3'];
  const BOT_NAMES = ['Bilal', 'Ravi', 'Imran', 'Kabir', 'Salman', 'Arjun', 'Usman', 'Zeca', 'Faisal', 'Tiago', 'Shahid', 'Nando', 'Asif', 'Junaid', 'Waqas', 'Beto'];
  // Kanni: where the bridle knot is tied along the spine, relative to this kite's own stock knot (data.js
  // KITES[x].kanni). A real flyer re-ties it before flying to trade stability for speed; this is that choice.
  const KANNI_PRESETS = {
    nose: { label: 'Nose-ward', adj: 0.05, note: 'Sits flatter: faster and twitchier.' },
    stock: { label: 'Stock knot', adj: 0, note: "This kite's usual bridle." },
    tail: { label: 'Tail-ward', adj: -0.05, note: 'Sits steadier: climbs higher, calmer.' }
  };
  // Kanni balance: the knot tied centred between the two wings, or pulled toward one wing. A kite with an
  // off-centre kanni leans ("kanni khana") - it keeps sliding and turning toward that side, worst when the line
  // is slack. Fliers re-tie it to correct a kite, or leave a little lean on purpose to fight from one side.
  const KANNI_BALANCE = {
    left: { label: 'Leans left', lean: -1, note: 'Knot pulled toward the left wing: drifts and turns left.' },
    center: { label: 'Balanced', lean: 0, note: 'Both strings equal: flies straight.' },
    right: { label: 'Leans right', lean: 1, note: 'Knot pulled toward the right wing: drifts and turns right.' }
  };
  // Bots: skill range (reaction + aim), how hard they saw in a pecha, and whether they chase loot.
  const DIFFICULTY = {
    easy: { label: 'Easy', skill: [0.15, 0.4], saw: 0.65, loot: 0.4, note: 'Slow, forgiving bots.' },
    normal: { label: 'Normal', skill: [0.35, 0.75], saw: 1, loot: 1, note: 'A fair fight.' },
    hard: { label: 'Hard', skill: [0.75, 1], saw: 1.35, loot: 1.3, note: 'Sharp, aggressive bots.' }
  };
  // match length: a clock, no limit, or a race - the first flier to N cuts wins (no clock)
  const MATCH_TIMES = { 120: '2 min', 180: '3 min', 300: '5 min', 0: 'No limit', c5: 'First to 5 cuts', c10: 'First to 10 cuts' };
  const cutTargetOf = m => /^c\d+$/.test(String(m)) ? +String(m).slice(1) : 0;
  // kite grid tabs, by shape / how it flies
  const KITE_TYPES = [
    { id: 'mine', label: 'My Kites' }, { id: 'flags', label: 'Flags' }, { id: 'basant', label: 'Basant set' }, { id: 'all', label: 'All' }, { id: 'patang', label: 'Patang' }, { id: 'tukkal', label: 'Tukkal' }
  ];   // v7.1: Pipa, Bird/Bat, Raia/Wau, Box and Star kites were taken out of the game
  // where the two kanni strings tie onto each shape, as a fraction of sprite height from its centre (- = nose):
  // the top string at the joint of spine and bow (kaman), the bottom string low on the spine
  const BRIDLE = { patang: [-0.12, 0.34], tukkal: [-0.1, 0.32], pipa: [-0.1, 0.32], bird: [-0.16, 0.28], delta: [-0.22, 0.24], eddy: [-0.18, 0.28], rokkaku: [-0.22, 0.24] };
  const LINE_LOAD = { patang: 1, bird: 1, pipa: 1.1, tukkal: 1.3, eddy: 1.6, delta: 1.62, rokkaku: 2.7 };
  const POINTS = { cut: 3, caught: 2, lost: -1 };
  const MODE_NAMES = { festival: 'Festival', single: 'Duel', two: 'Two Players', online: 'Online', gear: 'Your kite & gear for online', mohalla: 'Mohalla' };
  // Mohalla (team) matches: your street on the left of the lane, theirs on the right; each side in its own colours
  const TEAM_SPOTS = [[[-10, 30, 1.5], [30, 40, 6], [6, 62, 3.5]], [[14, -26, 3], [22, -55, 4.5], [-18, -42, 2.5], [40, -12, 8]]];
  const TEAM_COLORS = [['#ff6b35', '#ffd166', '#f78c6b'], ['#5aa8ff', '#9b6bff', '#3ad6c5', '#c0e218']];
  const TEAM_TINT = ['#ffb347', '#6fb6ff'];
  const LAYOUTS = { shared: { label: 'Shared screen', note: 'One wide view of both kites - you fly side by side.' }, split: { label: 'Split screen', note: 'Each player gets their own half and camera.' } };
  const KITE_VIS = 5.6;   // how much bigger than life a far kite is drawn (readability at distance); near kites are compressed
  const IS_TOUCH = ('ontouchstart' in window) || (navigator.maxTouchPoints || 0) > 0;
  const real = x => !!x && x.ctrl !== 'bot';
  const person = x => real(x) || !!(x && x.autoYou);   // autoYou: a test flying 'You' on autopilot still counts as the person   // a person (here or online), not a bot: only their events reach the feed
  const pointsOf = p => p.score.cut * POINTS.cut + p.score.caught * POINTS.caught + p.score.lost * POINTS.lost + (p.score.bonus || 0);

  /* ---------------- catalog & scenes ---------------- */
  // keep the first of any duplicate id (an older generated catalog listed one kite twice)
  const CAT = [], seenCat = new Set();
  for (const e of (window.KITE_CATALOG || [])) if (!seenCat.has(e.id)) { seenCat.add(e.id); CAT.push(e); }
  // the hand-drawn SVG kites are only a fallback for a build with no kite pictures - the real patang/tukkal pictures
  // in assets/kites are the kites (the old drawn "Basant set" is gone: those shapes weren't true to the real kites)
  if (!CAT.length) for (const k of Object.values(KITES)) CAT.push({ id: 'svg:' + k.id, name: k.name, svgId: k.id, arche: k.id, scale: 1 });
  // ---- flag kites: a ready-made set of country-flag patangs, painted onto one of your own patang pictures (so the
  // shape, sticks and paper folds are real) by the kite painter in src/kitemaker.js ----
  {
    const fb = ['png:lal-hukam', 'png:safed-sarv', 'png:kali-gulabi', 'png:neela-hukam'].map(id => CAT.find(c => c.id === id)).find(Boolean) || CAT.find(c => c.src && c.arche === 'patang');
    if (fb && typeof KiteMaker !== 'undefined' && KiteMaker.FLAGS) for (const [fid, fl] of Object.entries(KiteMaker.FLAGS))
      CAT.push({ id: 'flag:' + fid, name: fl.name, flag: true, arche: 'patang', scale: fb.scale || 1, base: fb.src, baseId: fb.id,
        recipe: { mode: 'paper', flag: fid, on: {}, keepDetails: false, texture: 0.9, hue: 0, sat: 100, bri: 100 } });
  }
  // kites the player built in the kite maker (src/kitemaker.js), kept in localStorage
  // v6.3: kite pictures were renamed - a workshop kite remembers the picture it was painted on, so point it at the new file
  const KE = KiteEconomy, DEF_K = KE.DEFAULT_KITES;
  const migrateMade = k => { if (k && typeof k === 'object') { if (k.base) k.base = KE.kiteBase(k.base); if (k.baseId) k.baseId = KE.kiteId(k.baseId); } return k; };
  const okKite = k => k && /^my:[a-z0-9]{1,20}$/.test(k.id) && typeof k.base === 'string' && /^assets\/[\w\/.-]+\.(png|jpe?g|webp|svg)$/i.test(k.base) && k.recipe && typeof k.recipe === 'object';
  try { for (const k of (JSON.parse(localStorage.getItem('kiteGame') || '{}').myKites || []).map(migrateMade)) if (okKite(k)) CAT.unshift({ ...k, name: cleanName(k.name) || 'My kite' }); } catch (e) {}
  const NETCAT = new Map();   // online: kites made by other players in their workshop (painted from their recipe)
  const catById = id => CAT.find(c => c.id === id) || CAT[0];
  const thumb = (e, pal = 0) => e.src || 'data:image/svg+xml;utf8,' + encodeURIComponent(ART.kiteSVG(e.svgId, PALETTES[pal]));
  const imgCache = {};
  function kiteImg(e) {
    if (e.recipe) return KiteMaker.sprite(e);   // a workshop kite: your kite picture, repainted (src/kitemaker.js)
    if (!imgCache[e.id]) { const i = new Image(); i.src = thumb(e); imgCache[e.id] = i; } return imgCache[e.id];
  }
  // a kite's picture for menus: <img> for picture kites, a <canvas> painted from its recipe for workshop kites
  const kiteVis = (e, lazy) => e.recipe ? `<canvas data-kv="${e.id}" width="128" height="128"></canvas>` : `<img src="${thumb(e)}"${lazy ? ' loading="lazy"' : ''} alt="">`;
  const hydrate = el => KiteMaker.hydrate(el, id => CAT.find(c => c.id === id) || NETCAT.get(id));

  // ---- per-shape handling. physics.js steers every kite's nose at the same rate, so a heavy box kite turned as
  // sharply as a featherweight patang. AGILITY scales the steering input per shape (1 = full), which is where most
  // of the "each kite flies differently" feel comes from, on top of the aero differences in each spec. ----
  const AGILITY = { patang: 1, bird: 1, pipa: 0.85, tukkal: 0.72, rokkaku: 0.62, eddy: 0.58, delta: 0.5 };
  const TUKKAL = {
    id: 'tukkal', name: 'Tukkal', origin: 'Pakistan / India',
    note: 'The patang\'s bigger, heavier cousin, usually with a tail. Pulls harder on the line, holds its line steadily and turns wider.',
    stats: { speed: 3, stability: 4, lift: 4, agility: 3 }
  };
  const FLY_TIPS = {
    patang: 'Hair-trigger. Give a little dheel and it turns on its own - tunka (tap Fly) the moment its nose points where you want. Deadly up close with a fast khainch.',
    tukkal: 'Starts turns early, they are wide and slow. Let it climb on long dheel, then use its heavy pull to saw through lighter lines.',
    pipa: 'Forgiving all-rounder. Holds a hover by itself, so you can line up a pecha calmly. Good first kite.',
    bird: 'Very fast and very twitchy, with the sharpest dive. A tunka sends it shooting - and mistakes are just as big.',
    eddy: 'Rock steady, easy to launch, slow to turn. Wins by staying in the air, not by out-turning anyone.',
    rokkaku: 'Big and heavy: sits still in the wind, then lunges on a tug. Its weight loads the line, so pick a strong thread.',
    delta: 'Floats in the lightest wind and rides high, but turns like a bus. Fight from above with long dheel.'
  };
  const archInfo = a => a === 'tukkal' ? TUKKAL : (KITES[a] || KITES.patang);
  function specFor(e) {
    let s = KITES[e.arche] || KITES.patang;
    if (e.arche === 'tukkal') s = { ...KITES.pipa, id: 'tukkal', name: 'Tukkal', area: 0.3, mass: 0.02, size: { w: 0.62, h: 0.62 }, trim: 29, stability: 0.45, rollTau: 0.32, alphaTau: 0.36, kanni: 0.04 };
    if (e.scale !== 1) s = { ...s, area: s.area * e.scale, mass: s.mass * e.scale, size: { w: s.size.w * e.scale, h: s.size.h * e.scale } };
    return s;
  }

  // ---- characters: the drawn fliers (src/fliers.js - our own, animated, hold the line) and your own made one ----
  const CHARACTERS = Fliers.PRESETS.map(o => ({ id: 'd:' + o.id, name: o.name, drawn: o }));
  const myFlier = () => saved.myFlier ? { id: 'myflier', name: cleanName(saved.myFlier.name) || 'My flier', drawn: saved.myFlier } : null;
  const charById = id => (id === 'myflier' && myFlier()) || CHARACTERS.find(c => c.id === id) || CHARACTERS[0];
  const charThumb = c => `<div class="chi"><canvas data-flier="${c.id}" width="46" height="80"></canvas></div>`;

  // ---- reels (assets/spools, listed by tools/build-spools.js into src/spools.js). Purely how it looks: the
  // THREAD choice is what decides cutting power and strength. Falls back to the drawn reels if none are listed. ----
  // ---- reels: drawn charkhi and pinna (src/art.js), no picture files. The reel is wound with YOUR dor's colour.
  // Purely how it looks: the THREAD choice is what decides cutting power and strength. ----
  const SPOOLS = ART.REELS.slice();
  const spoolSrc = (s, color = '#ff5ea8') => 'data:image/svg+xml;utf8,' + encodeURIComponent(ART.reelSVG(s, color));
  const spoolFor = p => SPOOLS.find(s => s.id === p.spool) || SPOOLS[0];
  const spoolImgs = {};
  const spoolImg = (s, color) => { const k = s.id + color; return spoolImgs[k] || (spoolImgs[k] = Object.assign(new Image(), { src: spoolSrc(s, color) })); };

  const SCENES = {
    praia: { name: 'Beach', pano: 'models/panoramic/1.png', wind: 6, gust: 0.25 },
    favela: { name: 'Favela', pano: 'models/panoramic/2.png', wind: 5, gust: 0.35 },
    favela2: { name: 'Favela 2', pano: 'models/panoramic/3.png', wind: 6.5, gust: 0.3 },
    noturno: { name: 'Night Beach', pano: 'models/panoramic/1.png', wind: 5.5, gust: 0.3, night: true },
    // ---- drawn scenes (no image files): sky colours by elevation, a sun or moon, ground colours and a skyline type ----
    lahore: { name: 'Lahore Rooftops', wind: 6.5, gust: 0.3, skyline: 'rooftops', ground: ['#cfc6b6', '#a89c88'], grid: 'rgba(80,70,60,.18)',
      sky: [[0, '#cfe6f5'], [0.25, '#8fc6ee'], [0.8, '#3d8fdc'], [1.35, '#1f6cc8']], sun: { az: 0.5, el: 0.85, c: '#fffbe8' }, haze: 'rgba(235,225,205,.45)' },
    sunset: { name: 'Old City Sunset', wind: 5.5, gust: 0.25, skyline: 'rooftops', ground: ['#b9926e', '#8a6648'], grid: 'rgba(60,35,20,.18)', dusk: true,
      sky: [[0, '#ffb35c'], [0.12, '#ff8a5c'], [0.4, '#d9607a'], [0.85, '#6b4c9a'], [1.35, '#2c3570']], sun: { az: -0.25, el: 0.07, c: '#ffd27a', big: true }, haze: 'rgba(255,160,90,.35)' },
    basant: { name: 'Basant Night', wind: 6, gust: 0.3, skyline: 'rooftops', ground: ['#4a4658', '#2c2a38'], grid: 'rgba(255,255,255,.06)', nightDrawn: true,
      sky: [[0, '#2a2f5c'], [0.3, '#151a40'], [0.9, '#0a0d26'], [1.35, '#05061a']], moon: { az: 0.8, el: 0.6 }, beams: true, lights: true },
    village: { name: 'Village Fields', wind: 5, gust: 0.25, skyline: 'fields', ground: ['#9cc65f', '#5f8f37'], grid: 'rgba(40,70,20,.15)',
      sky: [[0, '#e2f1fb'], [0.3, '#9fd2f2'], [0.9, '#4f9be0'], [1.35, '#2f75cc']], sun: { az: 0.3, el: 0.7, c: '#fffbe8' }, haze: 'rgba(225,240,250,.5)' },
    hills: { name: 'Margalla Hills', wind: 7, gust: 0.35, skyline: 'hills', ground: ['#8db35a', '#5a8236'], grid: 'rgba(40,70,20,.15)',
      sky: [[0, '#dcebf5'], [0.3, '#a3cdee'], [0.9, '#5a9ddc'], [1.35, '#3672c2']], sun: { az: 0.9, el: 0.75, c: '#fffbe8' }, haze: 'rgba(210,225,240,.5)' },
    desert: { name: 'Cholistan Desert', wind: 7.5, gust: 0.4, skyline: 'dunes', ground: ['#efcf93', '#d2a35c'], grid: 'rgba(140,90,30,.15)',
      sky: [[0, '#f6e7c8'], [0.25, '#bfe0f2'], [0.9, '#5ea6e3'], [1.35, '#3a7fd0']], sun: { az: 0.2, el: 0.9, c: '#fffef0' }, haze: 'rgba(245,225,185,.55)' },
    walled: { name: 'Walled City', wind: 6, gust: 0.3, skyline: 'rooftops', extras: ['mosque'], ground: ['#d8c3a0', '#b09474'], grid: 'rgba(80,60,40,.18)',
      sky: [[0, '#f3e4cf'], [0.2, '#b9dcf3'], [0.8, '#4c96dd'], [1.35, '#2466c4']], sun: { az: -0.6, el: 0.75, c: '#fffbe8' }, haze: 'rgba(240,220,190,.5)' },
    seaside: { name: 'Karachi Seaside', wind: 8, gust: 0.35, skyline: 'rooftops', roofArc: [-3.2, -0.25], extras: ['sea'], ground: ['#e6dccb', '#c4b59c'], grid: 'rgba(80,70,60,.16)',
      sky: [[0, '#e8f4fa'], [0.2, '#a6d8f2'], [0.8, '#48a2e4'], [1.35, '#1d72cf']], sun: { az: 0.35, el: 0.8, c: '#fffef4' }, haze: 'rgba(225,240,248,.55)' },
    towers: { name: 'City Towers', wind: 7, gust: 0.4, skyline: 'rooftops', extras: ['towers'], dusk: true, ground: ['#b48a74', '#7f5e4e'], grid: 'rgba(60,35,25,.18)',
      sky: [[0, '#ffc477'], [0.1, '#ff9f6e'], [0.35, '#e0708a'], [0.8, '#7a5aa6'], [1.35, '#2e3a7a']], sun: { az: 0.45, el: 0.06, c: '#ffd27a', big: true }, haze: 'rgba(255,170,110,.32)' },
    monsoon: { name: 'Monsoon Clouds', wind: 8.5, gust: 0.55, skyline: 'rooftops', overcast: true, rain: true, ground: ['#a9a59c', '#7f7b72'], grid: 'rgba(40,40,40,.18)',
      sky: [[0, '#c9cdd2'], [0.25, '#9aa3ad'], [0.8, '#6f7a88'], [1.35, '#4d5766']], haze: 'rgba(190,195,200,.6)' },
    winter: { name: 'Foggy Winter Dawn', wind: 4.5, gust: 0.2, skyline: 'rooftops', fog: true, ground: ['#d9d2cb', '#b3aaa0'], grid: 'rgba(80,70,60,.12)',
      sky: [[0, '#f6ddd2'], [0.15, '#f2c9c4'], [0.5, '#c9c4dd'], [1.0, '#8fa6cf'], [1.35, '#6c89c2']], sun: { az: -0.15, el: 0.1, c: '#fff1d6', big: true }, haze: 'rgba(245,232,228,.85)' },
    valley: { name: 'Mountain Valley', wind: 7, gust: 0.35, skyline: 'peaks', ground: ['#9dbb63', '#678a3b'], grid: 'rgba(40,70,20,.14)',
      sky: [[0, '#e3eef6'], [0.25, '#a9d1f0'], [0.9, '#4f97dc'], [1.35, '#2b6cc4']], sun: { az: -0.4, el: 0.85, c: '#fffef4' }, haze: 'rgba(215,230,242,.5)' }
  };
  const panoImgs = {}; for (const [k, s] of Object.entries(SCENES)) { if (s.pano && !panoImgs[s.pano]) { const i = new Image(); i.src = s.pano; panoImgs[s.pano] = i; } }

  /* ---------------- persisted choices ---------------- */
  let saved = {}; try { saved = JSON.parse(localStorage.getItem('kiteGame') || '{}'); } catch (e) {}
  const save = () => { try { localStorage.setItem('kiteGame', JSON.stringify(saved)); } catch (e) {} };
  // v6.3 kite renames: move every saved kite id / picture onto its new name (purchases are moved by economy.js)
  if (saved && typeof saved === 'object') {
    for (const k of ['k1', 'k2']) if (typeof saved[k] === 'string') saved[k] = KE.kiteId(saved[k]);
    // v7.1: a kite taken out of the game (Pipa, Raia/Wau, Dabba, Parinda, Sitara, the Saudi flag) is swapped for the starter kite
    ['k1', 'k2'].forEach((k, i) => { if (KE.isRetired(saved[k])) { saved[k] = KE.DEFAULT_KITES[i]; saved.retiredNote = (saved.retiredNote || 0) + 1; } });
    if (Array.isArray(saved.myKites)) saved.myKites.forEach(migrateMade);
    if (saved.makerLast2) migrateMade(saved.makerLast2);
    if (saved.econLocal && typeof saved.econLocal === 'object') { const info = {}; saved.econLocal = KE.cleanEcon(saved.econLocal, saved.stats, info); if (info.retired) saved.retiredRefund = (saved.retiredRefund || 0) + info.refunded; }
    if (saved.econNet && typeof saved.econNet === 'object') { const n = saved.econNet; if (Array.isArray(n.owned)) n.owned = [...new Set(n.owned.map(x => typeof x === 'string' && x.startsWith('kite|') ? 'kite|' + KE.kiteId(x.slice(5)) : x))]; if (n.coll && typeof n.coll === 'object') { const c = {}; for (const [id, v] of Object.entries(n.coll)) c[KE.kiteId(id)] = (c[KE.kiteId(id)] || 0) + (+v || 0); n.coll = c; } }
  }
  saved.k1 = saved.k1 || DEF_K[0]; saved.k2 = saved.k2 || DEF_K[1]; saved.t1 = saved.t1 || 'manjha'; saved.t2 = saved.t2 || 'manjha';
  saved.kn1 = saved.kn1 || 'stock'; saved.kn2 = saved.kn2 || 'stock';
  saved.c1 = saved.c1 || 'd:ali'; saved.c2 = saved.c2 || 'd:zara';
  // older saves point at the removed PNG spools: move them onto a drawn charkhi
  if (!SPOOLS.some(s => s.id === saved.sp1)) saved.sp1 = SPOOLS[0].id; if (!SPOOLS.some(s => s.id === saved.sp2)) saved.sp2 = (SPOOLS[2] || SPOOLS[0]).id;
  saved.kb1 = saved.kb1 || 'center'; saved.kb2 = saved.kb2 || 'center';
  saved.diff = saved.diff || 'normal'; saved.mtime = saved.mtime ?? 180;
  saved.scene = saved.scene || 'lahore'; saved.sound = saved.sound !== false; saved.layout = saved.layout || 'shared';
  // v6: a damaged or hand-edited save (wrong types, removed kites/scenes) used to stop matches from starting at all
  // ("Cannot read properties of undefined"). Anything that is not a known value goes back to its default.
  {
    if (!saved || typeof saved !== 'object' || Array.isArray(saved)) saved = {};
    const pick = (k, ok, def) => { if (!ok(saved[k])) saved[k] = def; };
    const kiteOk = id => typeof id === 'string' && CAT.some(e => e.id === id);
    pick('k1', kiteOk, DEF_K[0]); pick('k2', kiteOk, DEF_K[1]);
    pick('t1', v => typeof v === 'string' && !!THREADS[v], 'manjha'); pick('t2', v => typeof v === 'string' && !!THREADS[v], 'manjha');
    pick('kn1', v => !!KANNI_PRESETS[v], 'stock'); pick('kn2', v => !!KANNI_PRESETS[v], 'stock');
    pick('kb1', v => !!KANNI_BALANCE[v], 'center'); pick('kb2', v => !!KANNI_BALANCE[v], 'center');
    const charOk = v => v === 'myflier' || (typeof v === 'string' && (CHARACTERS.some(c => c.id === v) || /^[\w:.-]{1,40}$/.test(v)));
    pick('c1', charOk, 'd:ali'); pick('c2', charOk, 'd:zara');
    pick('diff', v => !!DIFFICULTY[v], 'normal');
    pick('mtime', v => Object.prototype.hasOwnProperty.call(MATCH_TIMES, String(v)), 180);
    pick('scene', v => typeof v === 'string' && !!SCENES[v], 'lahore');
    pick('layout', v => v === 'shared' || v === 'split', 'shared');
    pick('theme', v => ['dark', 'light', 'auto'].includes(v), 'dark');
    pick('gfx', v => ['auto', 'high', 'saver'].includes(v), 'auto');
    pick('steer', v => [0.75, 1, 1.35].includes(+v), 1); saved.steer = +saved.steer;
    pick('musicVol', v => typeof v === 'number' && v >= 0 && v <= 1, 0.4);
    if (!saved.mv64) { if (saved.musicVol === 0.6) saved.musicVol = 0.4; saved.mv64 = true; }   // v6.4: the old default was too loud
    pick('voice', v => ['ur', 'hi', 'off'].includes(v), 'ur');
    if (saved.touchMode !== undefined) pick('touchMode', v => v === 'buttons' || v === 'swipe', 'buttons');
    for (const k of ['stats', 'econLocal', 'touchLayout', 'myFlier']) if (saved[k] !== undefined && (typeof saved[k] !== 'object' || saved[k] === null)) delete saved[k];
    if (saved.myKites !== undefined && !Array.isArray(saved.myKites)) delete saved.myKites;
    for (const k of ['music', 'kiteSound', 'replay', 'party', 'sound']) if (saved[k] !== undefined && typeof saved[k] !== 'boolean') delete saved[k];
    saved.sound = saved.sound !== false;
  }

  /* ---------------- sound (src/sound.js) ---------------- */
  saved.music = saved.music !== false;
  // music track: older saves had musicStyle 'soothing' / 'festival' (now the Evening Bansuri and Rooftop Dhol tracks)
  if (!saved.track) saved.track = saved.musicStyle === 'festival' ? 'dhol' : 'mix';
  saved.musicVol = saved.musicVol ?? 0.4; saved.kiteSound = saved.kiteSound !== false; saved.voice = saved.voice || 'ur';
  SFX.setEnabled(saved.sound); SFX.setMusicVolume(saved.musicVol); SFX.setKiteSound(saved.kiteSound); SFX.setVoice(saved.voice);
  SFX.setTrack(saved.track); SFX.setMusic(saved.music);
  SFX.loadSongs().then(() => { if (saved.track === 'mine') SFX.setTrack('mine'); if (typeof renderMusicPanel === 'function') renderMusicPanel(); });
  const wakeAudio = () => SFX.init();   // browsers only start audio after a user gesture
  addEventListener('pointerdown', wakeAudio, true); addEventListener('keydown', wakeAudio, true);

  /* ---------------- game state ---------------- */
  let G = null; // active match
  // v7.1: an opaque canvas - the sky always covers it, so the browser no longer blends the whole game over the page
  const canvas = $('#view'), ctx = canvas.getContext('2d', { alpha: false });
  const keys = {}; const touch = {};

  function slotY(i) { const SP = 11; const n = Math.ceil(i / 2) * SP; return i === 0 ? 0 : (i % 2 ? n : -n); }
  // Every flier has their own rooftop. Humans stand on the near roof (our roof is the ground plane, z = 0); bots are
  // spread over the neighbouring houses - left and right, nearer and further downwind, on roofs of different heights -
  // so their kites fill the whole sky in layers instead of all bunching over one spot.
  // [x downwind, y sideways (+ = left), roof height]
  const HUMAN_SPOTS = [[0, 0, 0], [0, 12, 0]];
  const BOT_SPOTS = [[14, -26, 3], [-10, 30, 1.5], [30, 40, 6], [22, -55, 4.5], [-18, -42, 2.5], [40, -12, 8], [6, 62, 3.5], [-26, 70, 5], [48, 24, 9], [34, -80, 5.5]];
  const homeOf = p => p.home || [0, slotY(p.slot), 0];
  const anchorOf = p => { const h = homeOf(p); return [h[0], h[1], h[2] + 1.5]; };
  function freeSpot() { const used = G.players.filter(q => q.home).map(q => q.home); return BOT_SPOTS.find(s => !used.includes(s)) || [Math.random() * 60 - 20, (Math.random() < 0.5 ? -1 : 1) * (90 + Math.random() * 40), 3 + Math.random() * 6]; }
  function freeSlot() { const used = new Set(G.players.map(p => p.slot)); let i = 0; while (used.has(i)) i++; return i; }

  function makePlayer(o) {
    const p = { home: o.home, name: o.name, ctrl: o.ctrl, entry: o.entry, thread: o.thread, kanni: o.kanni || 'stock', kbal: o.kbal || 'center', char: o.char || 'd:ali', spool: o.spool, color: o.color, score: { cut: 0, lost: 0, caught: 0, bonus: 0 }, kite: null, respawn: 0, slot: o.slot, ai: { skill: 0.5 + Math.random() * 0.5, target: null, until: 0, wander: Math.random() * 6 } };
    return p;
  }
  function spawn(p) {
    if (p.kite && p.kite.free && !p.kite.inDrifters) G.drifters.push(p.kite);
    const anchor = anchorOf(p);
    const kanniAdj = (KANNI_PRESETS[p.kanni] || KANNI_PRESETS.stock).adj;
    // a big kite is flown on a heavier gauge of the same thread: measured peak pull per shape (patang ~25 N,
    // rokkaku ~67 N) scales the line's breaking strength, plus 30% headroom so ordinary flying and pulling
    // doesn't snap a line - only real overload, a cut, or razor manjha pulled hard does
    const th = THREADS[p.thread], load = (LINE_LOAD[p.entry.arche] || 1) * Math.max(0.7, p.entry.scale || 1);
    const thread = { ...th, strength: th.strength * 1.3 * load };
    // launch from the hand: the kite starts just in front of the flier on a couple of metres of line
    p.kite = new P.Kite(specFor(p.entry), thread, anchor, { lineLen: 2.5, maxLine: 400, kanniAdj, p: [anchor[0] + 1.4, anchor[1], anchor[2] + 0.7] });
    p.kite.launch = { t: 0 };
    p.kite.noCartwheel = true;   // dheel rotation is the steady ghoomna below, not the physics cartwheel
    if (p.ctrl.startsWith('human')) p.kite.turnMul = STEER_MUL();   // Settings -> Steering speed (bots keep the standard rate)
    p.kite.owner = p; p.kite.entry = p.entry;   // the kite keeps its own art: changing kites later must not repaint one already falling
    p.kite.lean = (KANNI_BALANCE[p.kbal] || KANNI_BALANCE.center).lean;
    if (p.ctrl === 'bot') p.kite.turnRamp = false;   // bots already ease their own steering
    p.kite.sawMul = p.ctrl === 'bot' ? (DIFFICULTY[G.diff] || DIFFICULTY.normal).saw : PECHA.CFG.playerSaw;   // the player's own sawing counts extra: a human working the line should be able to win
    p.grounded = 0; p.respawn = 0; p.kite.hot = 0;
    if (G.online) {
      if (p.ctrl === 'net') { p.kite.netRemote = true; p.kite.launch = null; p.kite.p = [anchor[0] + 1.4, anchor[1], anchor[2] + 0.7]; }
      else p.kite.netSeq = G.net.seq++;   // the server only believes a new kite with a higher number
    }
    p.landing = false;   // a kite cut mid-landing used to leave this set, so the NEXT kite was reeled straight back in on launch
  }
  // ---- land & change kite: a deliberate, physically-reeled-in landing (not a menu teleport) ----
  function requestLand(p) {
    if (!p || p.landing || p.landed || (G && G.swapPlayer)) return;
    // no kite in the air (it was just cut and is falling as loot): go straight to choosing the next one
    if (!p.kite || p.kite.free) { p.landed = true; openSwap(p); return; }
    p.landing = true; p.kite.landingMode = true;
    note(p.name + ' is bringing the kite in...');
  }
  function openSwap(p, type = 'all') {
    G.paused = !G.online; G.swapPlayer = p;
    if (G.online && type === 'all') netSend({ t: 'ev', e: 'land' });
    const inT = (e, t) => t === 'all' || (t === 'mine' ? e.mine : t === 'flags' ? e.flag : t === 'basant' ? e.basant : e.arche === t);
    $('#swapTabs').innerHTML = KITE_TYPES.map(t => CAT.some(e => inT(e, t.id)) ? `<button data-t="${t.id}" class="${t.id === type ? 'on' : ''}">${t.label}</button>` : '').join('');
    $$('#swapTabs button').forEach(b => b.onclick = () => openSwap(p, b.dataset.t));
    $('#swapGrid').innerHTML = CAT.filter(e => inT(e, type) && owned('kite', e.id)).map(e => `<div class="it ${e.id === p.entry.id ? 'on' : ''}" data-id="${e.id}" title="${esc(e.name)}">${kiteVis(e, true)}<span>${esc(e.name)}</span></div>`).join('');
    hydrate($('#swapGrid'));
    $$('#swapGrid .it').forEach(el => {
      el.onclick = () => { p.entry = catById(el.dataset.id); closeSwap(p, true); };
      el.onmouseenter = () => { $('#swapInfo').innerHTML = kiteInfoHTML(catById(el.dataset.id)); hydrate($('#swapInfo')); };
    });
    $('#swapInfo').innerHTML = kiteInfoHTML(p.entry); hydrate($('#swapInfo'));
    $('#swap').classList.remove('hidden');
  }
  function closeSwap(p, changed) {
    $('#swap').classList.add('hidden'); G.paused = false; G.swapPlayer = null;
    p.landed = false;
    if (G.online) netSend({ t: 'gear', gear: myGear(p.entry) });
    spawn(p);
    note(p.name + (changed ? ' launched a new kite' : ' relaunched the same kite'));
  }
  const pick = a => a[Math.floor(Math.random() * a.length)];
  function randomBot() {
    const used = new Set(G.players.map(p => p.name));
    const name = BOT_NAMES.find(n => !used.has(n)) || 'Bot' + G.players.length;
    // bots use the full animated flier (turns to face its kite, works the line) rather than a static picture
    const p = makePlayer({ name, ctrl: 'bot', entry: pick(CAT), thread: pick(Object.keys(THREADS)), kanni: pick(Object.keys(KANNI_PRESETS)), kbal: Math.random() < 0.8 ? 'center' : pick(['left', 'right']), char: 'd:' + pick(Fliers.PRESETS).id, spool: pick(SPOOLS).id, color: COLORS[(G.players.length + 3) % COLORS.length], slot: freeSlot() });
    p.home = freeSpot();
    p.ai.prefR = 38 + Math.random() * 70;   // how much line this bot likes to fly on when it isn't fighting: some fly close and low, some far and high
    const D = DIFFICULTY[G.diff] || DIFFICULTY.normal;
    p.ai.skill = D.skill[0] + Math.random() * (D.skill[1] - D.skill[0]);
    p.ai.loot = D.loot;
    return p;
  }
  function addBot() { if (G.players.filter(p => p.ctrl === 'bot').length >= 9) return; const b = randomBot(); G.players.push(b); spawn(b); note(b.name + ' joined'); }
  function removeBot() {
    const bots = G.players.filter(p => p.ctrl === 'bot'); if (!bots.length) return;
    const b = bots[bots.length - 1];
    if (b.kite && !b.kite.free) b.kite.releaseLine('left');
    if (b.kite && !b.kite.inDrifters) { b.kite.inDrifters = true; G.drifters.push(b.kite); }
    for (const d of G.drifters) if (d.caught && d.caught.by === b) d.caught = null;   // drop anything that bot had hooked
    G.players.splice(G.players.indexOf(b), 1);
    for (const p of G.players) if (p.ai && p.ai.target === b) { p.ai.target = null; p.ai.until = 0; }
    note(b.name + ' left');
  }
  function note(msg) { if (!G) return; G.feed.unshift({ msg, t: G.t }); if (G.feed.length > 5) G.feed.pop(); }

  function startMatch(mode, cfg) {
    if (typeof figCache !== 'undefined') figCache.clear();
    const sc = SCENES[cfg.scene];
    G = { mode, cfg, scene: cfg.scene, sc, diff: cfg.diff || 'normal', wind: new P.Wind({ speed: sc.wind, gust: sc.gust, seed: Math.random() * 10 }), t: 0, players: [], drifters: [], looters: [], ropes: [], sparks: [], fx: [], popups: [], feed: [], paused: false, acc: 0 };
    G.duration = cfg.tutorial ? 0 : (+cfg.mtime || 0); G.timeLeft = G.duration; G.over = false;
    G.cutTarget = cfg.tutorial ? 0 : cutTargetOf(cfg.mtime);
    G.layout = cfg.layout || 'shared'; sharedView.cam = null; lootView.cam = null; lootView.focus = null;
    $('#botCtl').classList.remove('hidden'); $('#pauseBtn').classList.remove('hidden');
    netStart(mode, cfg);
    const humans = mode === 'two' ? 2 : 1;
    for (let h = 0; h < humans; h++)
      G.players.push(makePlayer({ home: HUMAN_SPOTS[h], name: humans === 2 ? 'Player ' + (h + 1) : 'You', ctrl: 'human' + (h + 1), entry: catById(h ? cfg.k2 : cfg.k1), thread: h ? cfg.t2 : cfg.t1, kanni: h ? cfg.kn2 : cfg.kn1, kbal: h ? cfg.kb2 : cfg.kb1, char: h ? cfg.c2 : cfg.c1, spool: h ? cfg.sp2 : cfg.sp1, color: COLORS[h], slot: h }));
    for (let b = 0; b < cfg.bots; b++) G.players.push(randomBot());
    if (mode === 'mohalla') setupTeams(cfg);
    G.players.forEach(spawn);
    for (const q of G.players) warmKite(q.entry || (q.kite && q.kite.entry)); refillKati();
    G.viewers = G.players.filter(p => p.ctrl.startsWith('human'));
    $('#menu').classList.add('hidden'); $('#select').classList.add('hidden'); $('#results').classList.add('hidden'); $('#game').classList.remove('hidden');
    $('#touch').classList.toggle('hidden', !IS_TOUCH || humans === 2 || saved.touchMode === 'swipe');
    if (saved.touchMode === 'swipe' && humans === 1 && (saved.swipeTips = (saved.swipeTips || 0) + 1) <= 3) setTimeout(() => toast('Swipe controls: drag \u25BC to fly, further \u25BC to khainch, \u25B2 to dheel, \u25C0 \u25B6 to steer, tap for a tunka.'), 600);
    resize(); $('#modeLabel').textContent = cfg.tutorial ? 'Tutorial' : MODE_NAMES[mode];
    // first-time tutorial: runs inside the first single-screen match (or whenever started from the menu)
    G.tut = (cfg.tutorial || (!saved.tutDone && humans === 1)) ? { i: 0, t: 0, c: {} } : null;
    if (G.tut) for (const b of G.players) if (b.ctrl === 'bot') b.ai.passive = true;   // bots hold off until the pecha lesson
    showTut();
    note('Get your line across an opponent\'s line and saw it!');
    SFX.horn(); if (SFX.setScene) SFX.setScene('match');
  }
  /** Mohalla: you and (size-1) team-mates against `size` rivals, each side on its own row of roofs */
  function setupTeams(cfg) {
    G.teams = true; const size = cfg.teamSize || 2, M = KiteEconomy.MOHALLAS[cfg.career];
    G.teamNames = ['Your mohalla', M ? M.name : 'Rivals'];
    let a = 0, b = 0;
    G.players.forEach((p, i) => {
      p.team = i < size ? 0 : 1;
      if (p.ctrl === 'bot') { p.home = TEAM_SPOTS[p.team][p.team ? b : a] || freeSpot(); p.ai.prefR = 45 + Math.random() * 40; }
      p.color = TEAM_COLORS[p.team][p.team ? b : a] || p.color;
      if (p.team) b++; else if (p.ctrl === 'bot' || i) a++;
    });
    $('#botCtl').classList.add('hidden');
  }
  const teamOf = p => (p && p.team) | 0;
  const foes2 = (a, b) => foes(a, b);
  const foes = (a, b) => !G.teams || teamOf(a) !== teamOf(b);
  function teamTotals() { const t = [{ cut: 0, pts: 0, n: 0 }, { cut: 0, pts: 0, n: 0 }]; for (const p of G.players) { const x = t[teamOf(p)]; x.cut += p.score.cut; x.pts += pointsOf(p); x.n++; } return t; }
  function endMatch() { $('#replayUI').classList.add('hidden'); $('#pause').classList.add('hidden'); /* v7.1: never carried into the next match */ $('#game').classList.remove('replaying'); const wasOnline = G && G.online, wasMh = G && G.mode === 'mohalla'; if (wasOnline) onlineLeftMatch(); else if (G && !G.over) netEnd(true); G = null; if (wasOnline) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, canvas.width, canvas.height); $('#game').classList.add('hidden'); $('#swap').classList.add('hidden'); $('#results').classList.add('hidden'); $('#tut').classList.add('hidden'); return showOnline(); } ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, canvas.width, canvas.height); $('#game').classList.add('hidden'); $('#swap').classList.add('hidden'); $('#results').classList.add('hidden'); $('#tut').classList.add('hidden'); renderWallet(); if (wasMh) openMohalla(); else showMenu(); }

  /* ---------------- round end & results ---------------- */
  /* ranking shared by the results screen and the record sent to the server. A tie is NOT a win: a player level with
   * someone else is placed behind them (v6 - two players on 0 points used to give "You win the festival!" plus the
   * win coins and XP for doing nothing). */
  const rankCmp = () => G.cutTarget ? (a, b) => b.score.cut - a.score.cut || pointsOf(b) - pointsOf(a) : (a, b) => pointsOf(b) - pointsOf(a) || b.score.cut - a.score.cut;
  function placeOf(me) { const c = rankCmp(); return 1 + G.players.filter(p => p !== me && c(p, me) <= 0).length; }
  function finishMatch() {
    if (G.replay) endReplay(); G.replayReq = null; $('#replayUI').classList.add('hidden'); $('#game').classList.remove('replaying');
    G.over = true; G.paused = true; SFX.horn(); if ($('#resCoins')) $('#resCoins').innerHTML = '';
    // in a cut race the one who reached the target wins, whatever the points say
    const rows = [...G.players].sort(rankCmp());
    const top = rows[0], humans = G.viewers, tiedTop = rows.length > 1 && rankCmp()(rows[0], rows[1]) === 0;
    let title = tiedTop ? (pointsOf(top) === 0 && top.score.cut === 0 ? 'No winner - nobody scored' : 'Tied at the top!') : top.name + ' wins!';
    if (humans.length === 1 && !tiedTop) { const place = placeOf(humans[0]); title = place === 1 ? (G.cutTarget ? `You cut ${G.cutTarget} first — you win!` : G.mode === 'single' ? 'You win the duel!' : 'You win the festival!') : (G.cutTarget ? `${top.name} reached ${G.cutTarget} cuts first` : `You finished #${place} of ${rows.length}`); }
    if (G.teams) {
      const T = teamTotals(), key = G.cutTarget ? 'cut' : 'pts', me = teamOf(humans[0]), them = 1 - me;
      G.teamWon = T[me][key] > T[them][key] || (T[me][key] === T[them][key] && T[me].pts > T[them].pts);
      const draw = T[me][key] === T[them][key] && T[me].pts === T[them].pts;
      title = draw ? `Draw - ${T[me].cut} cuts each` : G.teamWon ? `Your mohalla wins! ${T[me].cut} - ${T[them].cut}` : `${G.teamNames[them]} win ${T[them].cut} - ${T[me].cut}`;
      rows.sort((a, b) => teamOf(a) - teamOf(b) || pointsOf(b) - pointsOf(a));
    }
    $('#resTitle').textContent = title;
    $('#resTable').innerHTML = '<tr><th>#</th><th>Flier</th><th>Cut</th><th>Kites caught</th><th>Lost</th><th>Points</th></tr>' + rows.map((p, i) =>
      `<tr class="${p.ctrl.startsWith('human') ? 'me' : ''}"><td>${G.teams ? `<span class="tm t${teamOf(p)}">${teamOf(p) ? 'B' : 'A'}</span>` : i + 1}</td><td><i style="background:${p.color}"></i>${p.name}</td><td>${p.score.cut}</td><td>${p.score.caught}</td><td>${p.score.lost}</td><td><b>${pointsOf(p)}</b></td></tr>`).join('');
    $('#resNote').textContent = `Points: cut a line +${POINTS.cut}, bring home a kite +${POINTS.caught}, lose your kite ${POINTS.lost}, cut streaks +1 per kite in a row.`;
    netEnd(false);
    const iWon = G.teams ? !!G.teamWon : placeOf(humans[0]) === 1;
    const tutOnly = !!G.cfg.tutorial;   // the menu tutorial pays nothing; a real first match with the tips on still counts
    $('#tut').classList.add('hidden'); if (G.tut) { G.tut = null; saved.tutDone = true; }
    const xpGain = humans.length === 1 && !tutOnly ? humans[0].score.cut * XP.cut + humans[0].score.caught * XP.caught + (iWon ? XP.win : 0) + XP.match : 0;
    if (!tutOnly && !NET.online) stat(s => { s.matches++; if (humans.length === 1 && iWon) { s.wins++; if (G.sc.nightDrawn || G.sc.night) s.nightWins++; if (G.players.length >= 7) s.bigWins++; if (humans[0].entry && humans[0].entry.flag) s.flagWins = (s.flagWins || 0) + 1; } });
    showMatchXp(xpGain);
    // offline (no server): the same economy rules pay out here, on this device
    if (!NET.online && !tutOnly && humans.length === 1) showPaid(EC.payMatch(econ(), { rec: G.rec, won: iWon && G.players.length >= 2, lootIds: G.rec.lootIds || [], career: G.cfg.career ?? -1 }));
    else if (!NET.online) showPaid(null);
    if (!NET.online) save();
    $('#results').classList.remove('hidden');
  }

  /* ---------------- first-time tutorial ---------------- */
  const TUT = [
    { text: 'Hold <b>&uarr;</b> (Fly). The kite flies wherever its <b>nose</b> points. Let go and it settles nose-up into a steady hover.', touch: 'Hold <b>FLY</b>. The kite flies wherever its <b>nose</b> points. Let go and it settles nose-up into a steady hover.', swipe: 'Put a finger on the sky and drag it a little <b>down</b> &#9660; and hold: FLY. The kite flies wherever its <b>nose</b> points. Let go and it settles nose-up into a steady hover.', done: c => c.fly > 1.2 },
    { text: 'Hold <b>&larr;</b> or <b>&rarr;</b> to turn the nose, then Fly again to go that way.', touch: 'Hold <b>&#9664;</b> or <b>&#9654;</b> to turn the nose, then FLY again to go that way.', swipe: 'Drag <b>left or right</b> to turn the nose (further = faster), then drag down to fly that way.', done: c => c.turn > 1.2 },
    { swipe: '<b>Tunka:</b> <b>tap</b> the sky quickly 3 times. Each short tug straightens the kite and makes it dart.', touch: '<b>Tunka:</b> tap <b>FLY</b> quickly 3 times. Each short tug straightens the kite and makes it dart.', text: '<b>Tunka:</b> tap <b>&uarr;</b> quickly 3 times. Each short tug straightens the kite and makes it dart.', done: c => c.tap >= 3 },
    { swipe: '<b>Dheel:</b> drag <b>up</b> &#9650; and hold to let line out. A loose patang turns by itself - tap for a tunka when its nose points where you want.', touch: '<b>Dheel:</b> hold <b>DHEEL</b> to let line out. A loose patang turns by itself - tap FLY when its nose points where you want.', text: '<b>Dheel:</b> hold <b>D</b> to let line out. A loose patang starts to turn by itself - tunka when its nose points where you want.', done: c => c.send > 1.5 },
    { swipe: '<b>Khainch:</b> drag <b>far down</b> &#9660;&#9660; to pull the line back in.', touch: '<b>Khainch:</b> hold <b>KHAINCH</b> to pull the line back in.', text: '<b>Khainch:</b> hold <b>A</b> to pull the line back in.', done: c => c.pull > 1.2 },
    { text: '<b>Pecha:</b> fly your line across the bot\'s line. Once hooked, work it: from <b>below</b> hold <b>A</b> (khainch), from <b>on top</b> hold <b>D</b> (dheel) - your card says which you are. Tap <b>&uarr;</b> for a jhatka. A still line gets cut.', touch: '<b>Pecha:</b> fly your line across the bot\'s line. Once hooked, work it: from <b>below</b> hold <b>KHAINCH</b>, from <b>on top</b> hold <b>DHEEL</b> - your card says which you are. Tap <b>FLY</b> for a jhatka. A still line gets cut.', done: c => c.pecha > 2.5, timeout: 60, start: () => { for (const b of G.players) if (b.ctrl === 'bot') b.ai.passive = false; } },
    { text: 'Cut kites fall as <b>LOOT</b>. Fly your line through one to hook it, then hold <b>A</b> to bring it home for points. Good luck!', done: (c, t) => t > 9 }
  ];
  function showTut() {
    const el = $('#tut');
    if (!G || !G.tut) { el.classList.add('hidden'); return; }
    const s = TUT[G.tut.i];
    const txt = (saved.touchMode === 'swipe' && s.swipe) || (IS_TOUCH && s.touch) || s.text;
    $('#tutText').innerHTML = `<small>Step ${G.tut.i + 1} of ${TUT.length}</small><br>${txt}`;
    el.classList.remove('hidden');
  }
  function tutTick(dt) {
    const T = G.tut; if (!T || G.paused) return;
    T.t += dt;
    const s = TUT[T.i];
    if (s.done(T.c, T.t) || (s.timeout && T.t > s.timeout)) {
      T.i++; T.t = 0; SFX.ui();
      if (T.i >= TUT.length) { endTut(); return; }
      if (TUT[T.i].start) TUT[T.i].start();
      showTut();
    }
  }
  function endTut() {
    if (!G || !G.tut) return;
    G.tut = null; saved.tutDone = true; save();
    for (const b of G.players) if (b.ctrl === 'bot') b.ai.passive = false;
    $('#tut').classList.add('hidden'); note('Tutorial complete - now go cut some lines!');
  }
  const tutCount = (key, v) => { if (G && G.tut) G.tut.c[key] = (G.tut.c[key] || 0) + v; };

  /* ---------------- input ----------------          solo           P1        P2
   *  FLY (hold) / TUNKA (tap)                          Up             W         I
   *  STEER the nose                                    Left Right     A D       J L
   *  KHAINCH - pull the line in (hold)                 A or Down      S         K
   *  DHEEL - let line out (hold)                       D              Q         O
   *  LAND & change kite                                R              R         H
   */
  const MAP = {
    // Only the controls a real patang flier uses: fly along the nose (a quick tap = tunka), steer, khainch, dheel.
    // (The old disbicar dart on S / Space / click / Q E is gone - it was a Brazilian-pipa move nobody used here.)
    solo: { thrust: ['arrowup'], turnL: ['arrowleft'], turnR: ['arrowright'], pull: ['a', 'arrowdown'], send: ['d'], label: { fly: '↑', steer: '← →', pull: 'A', send: 'D', land: 'R' } },
    p1: { thrust: ['w'], turnL: ['a'], turnR: ['d'], pull: ['s'], send: ['q'], label: { fly: 'W', steer: 'A D', pull: 'S', send: 'Q', land: 'R' } },
    p2: { thrust: ['i'], turnL: ['j'], turnR: ['l'], pull: ['k'], send: ['o'], label: { fly: 'I', steer: 'J L', pull: 'K', send: 'O', land: 'H' } }
  };
  const mapFor = p => G.mode === 'two' ? (p.ctrl === 'human1' ? MAP.p1 : MAP.p2) : MAP.solo;
  const GAMEKEYS = new Set(['a', 's', 'd', 'w', 'q', 'j', 'k', 'l', 'o', 'i', ' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright']);
  addEventListener('keydown', e => {
    const k = e.key.toLowerCase();
    if (!$('#settings').classList.contains('hidden')) { if (k === 'escape') closeSettings(); return; }   // the Settings page has the keyboard
    if (G && GAMEKEYS.has(k)) e.preventDefault();
    if (e.repeat) return;
    keys[k] = 1;
    if (!G) return;
    if (G.replay && (k === 'escape' || k === ' ' || k === 'enter')) { endReplay(); return; }
    if (k === 'escape') { if (G.swapPlayer) return closeSwap(G.swapPlayer, false); return pauseOpen() ? closePauseMenu() : openPauseMenu(); }
    if (G.swapPlayer) { if (k === 'enter') closeSwap(G.swapPlayer, false); return; }   // the kite picker is open: game keys wait
    if (G.over) return;
    if (k === 'p') { if (!G.swapPlayer && !G.online) { if (pauseOpen()) closePauseMenu(); else openPauseMenu(); } }
    else if (k === 'm') { saved.sound = !saved.sound; save(); SFX.setEnabled(saved.sound); note('Sound ' + (saved.sound ? 'on' : 'off')); }
    else if (k === 'b') toggleMusic();
    else if ((k === '=' || k === '+') && !G.online) addBot(); else if (k === '-' && !G.online) removeBot();
    else if (k === 'g') { G.debug = !G.debug; $('#debug').classList.toggle('hidden', !G.debug); }
    else if (k === '[') zoomAll(1 / 1.15); else if (k === ']') zoomAll(1.15);
    else if (k === 't') openChat();
    else if (/^[1-8]$/.test(k) && !G.paused) { say(G.viewers[0], +k - 1); openChat(false); }
    else if (k === 'r') requestLand(G.viewers[0]); else if (k === 'h' && G.mode === 'two') requestLand(G.viewers[1]);
    for (const p of G.viewers) {
      const m = mapFor(p);
      if (m.thrust.includes(k)) queueAction(p, 'thrust', 0);
    }
  });
  addEventListener('keyup', e => delete keys[e.key.toLowerCase()]);
  addEventListener('blur', () => { for (const k in keys) delete keys[k]; });
  const down = list => list.some(k => keys[k]);
  canvas.addEventListener('wheel', e => {
    if (!G || !G.viewers.length) return; e.preventDefault();
    const v = G.layout === 'shared' && G.viewers.length > 1 ? sharedView : G.viewers.length > 1 && e.clientX > canvas.clientWidth / 2 ? G.viewers[1] : G.viewers[0];
    zoomBy(v, e.deltaY < 0 ? 1.1 : 1 / 1.1);
  }, { passive: false });

  function queueAction(p, what, dir) {
    if (!p.kite || p.kite.free) return;
    if (what === 'swing' && !dir) { // no side chosen: aim at the nearest rival kite when one is close, else alternate sides
      let best = null, bd = 1e9;
      for (const o of G.players) if (o !== p && o.kite && !o.kite.free) { const dy = o.kite.p[1] - p.kite.p[1], d = Math.hypot(dy, o.kite.p[2] - p.kite.p[2]); if (d < bd) { bd = d; best = dy; } }
      if (best !== null && bd < 30 && Math.abs(best) > 1.2) dir = best > 0 ? -1 : 1;
    }
    p.pending = p.pending || {}; p.pending[what] = dir || true; p.acting = true; p.actT = G.t;
    if (p.ctrl.startsWith('human') && what === 'thrust') tutCount('tap', 1);
  }
  function humanInput(p) {
    const m = mapFor(p), t = p.ctrl === 'human1' ? touch : {};
    const far = !p.kite || Math.hypot(p.kite.p[0] - p.kite.anchor[0], p.kite.p[1] - p.kite.anchor[1], p.kite.p[2] - p.kite.anchor[2]) > 9;
    const pullHeld = (down(m.pull) || t.in) && far;
    const sendHeld = down(m.send) || t.out;
    // touch: the arrow buttons STEER (they used to fire a disbicar, so a phone player had no way to turn at all)
    if (t.fly && !p.touchFly && !t.swipe) queueAction(p, 'thrust', 0); p.touchFly = !!t.fly;
    const pend = p.pending || {}; p.pending = {};
    const dirOf = v => (v === true ? 0 : v);
    const out = { steer: 0 };
    out.pull = pullHeld;
    if (pend.thrust) out.tunka = true;   // a tap is a tunka (handled in kiteHandling), not a speed burst
    out.thrust = down(m.thrust) || !!t.fly;
    const keyTurn = ((down(m.turnR) || t.r) ? 1 : 0) - ((down(m.turnL) || t.l) ? 1 : 0);
    out.turn = (keyTurn || (t.turnA || 0)) * (AGILITY[p.entry.arche] ?? 1);   // swipe controls steer by how far you drag (analog)
    out.send = sendHeld ? true : false;
    if (pend.swing !== undefined) out.doSwing = dirOf(pend.swing);
    p.acting = !!(pullHeld || pend.thrust || out.thrust || out.turn || sendHeld || pend.swing !== undefined || (G.t - (p.actT || -9)) < 0.4);
    if (G.tut) { if (out.thrust) tutCount('fly', DT); if (out.turn) tutCount('turn', DT); if (sendHeld) tutCount('send', DT); if (pullHeld) tutCount('pull', DT); }
    return out;
  }

  /* ---------------- tunka, rotation, kanni and launch (applied to every kite, before its physics step) ----------------
   * Tunka: one short tug on the line. The tug loads the sail: the kite dips its nose, SWINGS (a quick pendulum
   * swing that settles back), straightens out and shoots a little the way its nose points. Done as a short
   * smooth reel-in pulse - an earlier version shortened the line in one jump, which spiked tension and snapped
   * manjha after a few quick taps.
   * Rotation (ghoomna): a fighter kite is only stable under tension. Give it dheel and it starts to spin on its own
   * - a light patang quickly, a heavy box kite hardly at all - in the way its kanni leans or it last turned. That's
   * how a real patang is pointed: let it spin on slack line, then tunka the moment the nose faces where you want.
   * Kanni balance: an off-centre knot makes the kite keep sliding/turning toward that wing.
   * Launch: a new kite starts in the flier's hand and is let go into the wind; it climbs while line pays out. */
  // the kite takes up the direction its turning sail is showing (v7.1 idle ghoomna): the flight nose jumps to it - which
  // is invisible, the drawn angle doesn't change - so a pull sends it exactly where you saw the nose point
  function kiteTakeAim(k) {
    if (!k.idleAng) return; k.headingAngle += k.idleAng; k.idleAng = 0;
    // the nose vector, rebuilt the way physics.js does (frame around the line: L radial, U up-tangent, Wd right-tangent),
    // so a tunka in this same step already shoots the new way
    const d = [k.p[0] - k.anchor[0], k.p[1] - k.anchor[1], k.p[2] - k.anchor[2]], r = Math.hypot(...d) || 1e-6, L = d.map(x => x / r);
    let U = [-L[0] * L[2], -L[1] * L[2], 1 - L[2] * L[2]], u = Math.hypot(...U); U = u < 1e-4 ? [1, 0, 0] : U.map(x => x / u);
    let W = [L[1] * U[2] - L[2] * U[1], L[2] * U[0] - L[0] * U[2], L[0] * U[1] - L[1] * U[0]], w = Math.hypot(...W); W = w < 1e-4 ? [0, -1, 0] : W.map(x => x / w);
    const c = Math.cos(k.headingAngle), sn = Math.sin(k.headingAngle); k.nose = [U[0] * c + W[0] * sn, U[1] * c + W[1] * sn, U[2] * c + W[2] * sn];
  }
  function kiteHandling(p, k, inp) {
    // v6.3 pecha khainch: hauling in fast while hooked loads the sail and the kite CLIMBS (more air over it), the way a
    // real khainch keeps the fight up in the sky. Without this a held khainch dragged the kite straight down onto the
    // roof - and a pecha that reaches the roof is over, so the right move ended most fights with no result at all.
    if (!k.free && k._pecha && k._pecha.on && k._pecha.locked && (inp.pull || (k.pullE || 0) > 0.2)) {
      const hgt = k.p[2] - k.anchor[2], lift = clamp(1 - hgt / 40, 0.15, 1) * (0.6 + 0.4 * (k.pullE || 0));
      k.v[2] += 11 * lift * DT;
      if (hgt < 6) k.v[2] = Math.max(k.v[2], 1.5);   // never hauled into the parapet mid-pecha
    }
    if (k.free || p.landing) { k.idleAng = 0; k.idleE = 0; return; }
    if (k.idleAng && (inp.thrust || inp.pull || inp.tunka || inp.turn || inp.send || k.launch)) { k.idleE = 0; k.idleT = 0; kiteTakeAim(k); }
    const spec = k.spec, loose = 1 - clamp(spec.stability ?? 0.5, 0, 1);
    /* ---- v6.4 FLYING: what a real flier's hands do without thinking (measured with a "beginner" test player: the kite
     * spent two thirds of the time below 15 m, mostly stuck straight overhead, and one wrong turn drove it into the roof) ----
     * 1) DHEEL ON THE CLIMB. Overhead (the top of the wind window) a kite has no power, so holding Fly there did nothing.
     *    A flier lets the dor slip through the fingers while the kite climbs: Fly near the zenith, or on a very short line,
     *    now pays line out and lets the wind carry the kite back out to where it has power - and height comes with it. */
    const hgt0 = k.p[2] - k.anchor[2], r0 = Math.hypot(k.p[0] - k.anchor[0], k.p[1] - k.anchor[1], k.p[2] - k.anchor[2]) || 1, elev = Math.asin(clamp(hgt0 / r0, -1, 1));
    const hooked = k._pecha && k._pecha.on && k._pecha.locked;
    if (inp.thrust && !k.launch && !hooked && !inp.pull) {
      // only when it is truly overhead (over ~68 deg) or on a very short line, and never past 60 m on its own - beyond that,
      // how far out to fly is the player's call (dheel)
      const top = clamp((elev - 1.19) / 0.2, 0, 1), short = clamp((24 - k.lineLen) / 14, 0, 1), feed = Math.max(top, short * 0.6);
      if (feed > 0.02 && k.lineLen < 60 && k.lineLen < r0 + 1.2) {   // v7.3: only as fast as the kite takes it (it used to pour out slack overhead)
        k.lineLen += (2.2 + 2.6 * feed) * feed * DT;
        const w = G.wind.at(k.p, G.t), wh = Math.hypot(w[0], w[1]) || 1;
        k.v[0] += (w[0] / wh) * 4.5 * top * DT; k.v[1] += (w[1] / wh) * 4.5 * top * DT;   // the wind takes it back out of the overhead dead spot
      }
    }
    // 2) NO NOSE-DIVE INTO THE ROOF. Low down, a flier never keeps flying a kite at the roof: Fly with the nose pointing
    //    down near the roofs turns the dive into a skim across the sky (high up, a dive is still a dive - it's a move).
    const hw0 = Math.atan2(Math.sin(k.headingAngle), Math.cos(k.headingAngle));
    if ((inp.thrust || k.tunkaT > 0.5) && !inp.turn && !k.launch && Math.abs(hw0) > 1.75) {
      const low = clamp((12 - hgt0) / 8, 0, 1);
      if (low > 0) { const target = Math.sign(hw0) * 1.6; k.headingAngle += (target - hw0) * Math.min(1, DT * 7 * low); if (k.v[2] < -2 && hgt0 < 6) k.v[2] += (-2 - k.v[2]) * Math.min(1, DT * 6); }
    }
    // 3) BACK UP OFF THE ROOF. A kite lying on the roof used to ignore Fly and tunka until the game gave up after 4 s
    //    ("crashed"). Now Fly or a tunka stands it up, nose to the sky, and launches it again from where it lies.
    if (k.onGround && !k.launch && (inp.thrust || inp.tunka)) {
      k.headingAngle = 0; k.headingVel = 0; k.spinE = 0; k.launch = { t: 0, relaunch: true }; p.grounded = 0;
    }
    k.tunkaT = Math.max(0, (k.tunkaT || 0) - DT / 0.8);
    if (inp.tunka) {
      k.pullE = Math.min(1, k.pullE + 0.4);                 // short smooth tug (physics.js winds the kite in with it)
      k.diveKick = Math.max(k.diveKick, 0.35);              // nose dips
      k.headingVel *= 0.2; k.spinE = 0; k.sendE = 0;          // the tug takes up the slack: the spin stops and the kite straightens out
      const along = k.v[0] * k.nose[0] + k.v[1] * k.nose[1] + k.v[2] * k.nose[2], kick = clamp(14 - along, 0, 5.5);
      for (let a = 0; a < 3; a++) k.v[a] += k.nose[a] * kick;   // and it shoots a little the way it's pointing
      k.tunkaT = 1; k.tunkaDir = (k.tunkaDir || 1) * -1;    // the visible swing alternates side, like a real tunka
      if (p.ctrl.startsWith('human')) { SFX.tug(); if (SFX.whoosh) SFX.whoosh(0.8, panOf(p)); }
    }
    // (steering itself is a steady turn RATE in physics.js: the nose turns while the key is held and stops when it's let go)
    if (!inp.turn) {
      // v7.3: the reel's close-range safety (autoOut) also pays line out - that is not the player's dheel, and it used to
      // set the kite spinning (ghoomna) right after a khainch brought it in close, so the next Fly shot it off into the roof
      const slack = k.autoOut ? 0 : clamp(k.sendE || 0, 0, 1), lean = k.lean || 0, taut = 1 - slack;
      const dir = lean || k.turnDir || k.lastSwingDir || 1;
      // SELF-RIGHTING, only when the hands are still: a kite left alone on a taut line slowly weathervanes back to
      // nose-up and settles into a hover (a stable box/delta in well under a second, a patang - which is meant to be
      // neutral - over a second or two). While you FLY or KHAINCH it does not happen at all: the nose stays exactly
      // where you pointed it, so a quick tap of steer followed by Fly sends the kite straight that way. (It used to
      // keep pulling the nose back up even while flying, so the only way to cross the sky was to hold steer too, which
      // turned it in circles.)
      const stab = clamp(spec.stability ?? 0.5, 0, 1), still = (inp.thrust || inp.pull || k.tunkaT > 0.5) ? 0 : 1;
      /* v7.1 IDLE GHOOMNA - measured against the reference video: there a patang left alone (nobody pulling) keeps turning
       * steadily, ~150-220 deg/s (a turn every 2-2.5 s), in one direction, and a pull stops it dead within ~0.25 s so it
       * flies straight along its nose; let go again and it starts turning again, now and then the other way. Ours froze
       * nose-up instead (3 deg/s) - the "rotation" difference. Your own kite now does what the video's does (Settings ->
       * General -> "Kite turns when left alone").
       * v7.3: players found a kite that kept spinning (~200 deg/s, 3.5 turns in 6 s) with nobody touching it "disturbed" -
       * its nose ended up anywhere, so the next Fly sent it off at random or into the roof. It is now OFF by default: a
       * kite left alone settles nose-up into a steady hover (the self-righting below). Switched on, it turns at a calm
       * ~70-100 deg/s.
       * The turn is the SAIL's (k.idleAng, added to the drawn angle after the physics step): the line keeps the kite hanging
       * in its hover while it turns, exactly as on a real roof - if the flight nose turned with it, the lift swept round
       * with the nose and the kite sank onto the roof in ~12 s. The moment you pull, tunka or steer, the kite takes up the
       * direction its nose is showing and flies that way (see kiteTakeAim). Bots and the pecha rules are untouched. */
      const idleOk = p.ctrl.startsWith('human') && saved.idleSpin === true && still && !inp.send && (k.sendE || 0) < 0.1 && !k.launch && !k.onGround && !hooked && !k.landingMode;
      k.idleT = idleOk ? (k.idleT || 0) + DT : 0;
      if (k.idleT > 0.3 && k.idleT - DT <= 0.3) k.idleDir = (k.idleDir ? (Math.random() < 0.3 ? -k.idleDir : k.idleDir) : Math.sign(dir) || 1);   // a new spin: usually the same way, sometimes the other
      const wantI = k.idleT > 0.3 ? 1 : 0;
      k.idleE = (k.idleE || 0) + (wantI - (k.idleE || 0)) * Math.min(1, DT / (wantI ? 0.22 : 0.06));   // eases in over ~0.25 s
      if (k.idleE > 0.002) { const e = k.idleE, sm = e * e * (3 - 2 * e); k.idleAng = (k.idleAng || 0) + (k.idleDir || 1) * (1.1 + loose * 0.6) * (k.turnMul || 1) * sm * DT; }
      else if (!idleOk) kiteTakeAim(k);
      const spinning = clamp(k.spinE || 0, 0, 1), right = taut * (1 - spinning) * (1 - spinning);   // no tug-of-war with the ghoomna
      const hw = Math.atan2(Math.sin(k.headingAngle), Math.cos(k.headingAngle));   // -pi..pi: the short way back to nose-up
      k.headingAngle -= 2 * Math.sin(hw / 2) * (0.7 + 2.6 * stab) * right * still * DT;   // strongest when upside down, so it never just dives in
      // an off-centre kanni keeps leaning it to one side, most of all on slack line
      if (lean) k.headingAngle += 0.55 * (0.15 + 0.85 * slack) * Math.sign(lean) * DT;
      /* v7.4 GHOOMNA ON DHEEL, measured from the player's reference video (WhatsApp 24 Oct): while line is let out the
       * patang spins by itself at ~170-270 deg/s - never perfectly even (it surges and eases), now and then reversing - and
       * the moment the flier pulls (Fly, tunka or khainch) it stops DEAD with its nose where it was, and flies that way.
       * Only on dheel: with the hands still the kite hovers nose-up. (Bots keep spinning on any slack, as before.) */
      const hands = !!(inp.thrust || inp.pull || inp.tunka || k.tunkaT > 0.5);
      const dheelOn = p.ctrl.startsWith('human') ? !!inp.send : slack > 0.3;
      // hooked in a pecha the dor is loaded across the other line: the kite holds its place while the line does the work
      const want = hands || hooked ? 0 : dheelOn ? (loose > 0.5 ? 1 : 0.55) : 0;
      if (want > 0 && (k.spinE || 0) < 0.05) { k.spinDir = Math.sign(dir) || 1; k.spinDirE = k.spinDir; k.revT = 1.5 + Math.random() * 3; }   // a new spin
      if ((k.spinE || 0) > 0.3 && (k.revT -= DT) <= 0) { if (Math.random() < 0.45) k.spinDir = -(k.spinDir || 1); k.revT = 1.5 + Math.random() * 3; }   // now and then the other way
      k.spinDirE = (k.spinDirE ?? (k.spinDir || 1)) + ((k.spinDir || 1) - (k.spinDirE ?? (k.spinDir || 1))) * Math.min(1, DT / 0.2);   // a reversal swings through, it doesn't flip
      k.spinE = (k.spinE || 0) + (want - (k.spinE || 0)) * Math.min(1, DT / (hands ? 0.05 : want > (k.spinE || 0) ? 0.18 : 0.25));
      const surge = 1 + 0.3 * Math.sin(1.3 * G.t + (k.swayPh || 0)) + 0.15 * Math.sin(3.1 * G.t + 2 * (k.swayPh || 0));
      const rate = k.spinDirE * (2.8 + loose * 1.9) * surge * (k.turnMul || 1) * k.spinE * k.spinE * (3 - 2 * k.spinE);
      k.headingAngle += rate * DT;
      if (hands && (k.spinE || 0) > 0.05) k.headingVel = 0;   // stops dead: the nose stays exactly where it was
      if (k.spinE > 0.15) k.headingVel *= Math.exp(-3 * DT);   // while it's turning by itself, the old steer momentum fades
    } else { k.spinE = (k.spinE || 0) * Math.exp(-DT / 0.2); k.idleE = 0; k.idleT = 0; kiteTakeAim(k); }
    if (k.launch) {
      // let go from the hand: the wind takes it up and out while line pays out behind it (the reel's
      // close-range safety pays out by itself under 14 m), a tunka lifts it faster
      const L = k.launch; L.t += DT;
      k.landingMode = true; k.autoOut = false;   // the launch manages its own line; the close-range auto-payout stays out of it
      const boost = 1 + 1.2 * (k.tunkaT || 0) + (inp.thrust ? 0.35 : 0), w = G.wind.at(k.p, G.t), wh = Math.hypot(w[0], w[1]) || 1, tv = [w[0] / wh * 4.6 * boost, w[1] / wh * 4.6 * boost, 5.2 * boost];   // v6.4: out with the wind and up, quickly (was 3.6 m/s straight up)
      for (let a = 0; a < 3; a++) k.v[a] += (tv[a] - k.v[a]) * Math.min(1, DT / 0.2);
      k.v[2] = Math.max(k.v[2], 3.2 * boost);   // climbing out of the low, gusty air near the ground
      const r = Math.hypot(k.p[0] - k.anchor[0], k.p[1] - k.anchor[1], k.p[2] - k.anchor[2]);
      k.lineLen = Math.max(k.lineLen, r + 0.3);
      if (r > 22 || k.p[2] - k.anchor[2] > 13 || L.t > 10) {
        k.launch = null; k.landingMode = false; k.sendE = 0; k.lineLen = r;
        if (p.ctrl.startsWith('human') && !L.relaunch) banner(p, 'KITE IS UP!', '#06d6a0', 1.2, true);
      }
    }
  }
  $$('#touch button').forEach(b => {
    const a = b.dataset.a, on = e => { e.preventDefault(); touch[a] = 1; }, off = e => { e.preventDefault(); touch[a] = 0; };
    b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off); b.addEventListener('pointerleave', off); b.addEventListener('pointercancel', off);
  });

  /* ---------------- SWIPE controls (phones/tablets, or a mouse): one finger flies the kite ----------------
   * Put a finger down anywhere on the sky and drag - the spot you touched is the centre:
   *   drag LEFT / RIGHT .......... steer the nose (the further you drag, the faster it turns)
   *   drag DOWN (toward you) ..... FLY - the kite speeds off the way its nose points
   *   drag further DOWN .......... KHAINCH - haul the dor in hand over hand
   *   drag UP (away from you) .... DHEEL - let the dor run out
   *   a quick TAP ................ TUNKA (a second finger can tap while the first one flies)
   * A ring under the finger shows the zones and where you are in them. The on-screen buttons stay available as the
   * other choice (Settings -> Controls). */
  saved.touchMode = saved.touchMode || 'buttons';
  const swipe = { id: null, ox: 0, oy: 0, x: 0, y: 0, t0: 0, far: 0, zone: '' };
  const swipeOn = () => saved.touchMode === 'swipe' && G && !G.paused && !G.over && !G.replay && !G.swapPlayer && G.viewers.length === 1;
  const swipeR = () => clamp(Math.min(CW, CH) * 0.13, 48, 90);
  function swipeApply() {
    const R = swipeR(), dx = swipe.x - swipe.ox, dy = swipe.y - swipe.oy;
    const dz = 0.22 * R, ax = Math.abs(dx);
    touch.swipe = 1;
    touch.turnA = ax < dz ? 0 : Math.sign(dx) * clamp((ax - dz) / (0.9 * R), 0, 1);
    touch.out = dy < -0.4 * R ? 1 : 0;
    touch.in = dy > 1.55 * R ? 1 : 0;
    touch.fly = dy > 0.4 * R && !touch.in ? 1 : 0;
    swipe.zone = touch.in ? 'KHAINCH' : touch.fly ? 'FLY' : touch.out ? 'DHEEL' : touch.turnA ? 'STEER' : '';
  }
  function swipeClear() { swipe.id = null; touch.swipe = 0; touch.turnA = 0; touch.fly = touch.in = touch.out = 0; swipe.zone = ''; }
  canvas.addEventListener('pointerdown', e => {
    if (!swipeOn()) return;
    const me = G.viewers[0];
    if (swipe.id !== null && e.pointerId !== swipe.id) { e.preventDefault(); queueAction(me, 'thrust', 0); return; }   // second finger: tunka
    e.preventDefault(); try { canvas.setPointerCapture(e.pointerId); } catch (er) {}
    Object.assign(swipe, { id: e.pointerId, ox: e.clientX, oy: e.clientY, x: e.clientX, y: e.clientY, t0: performance.now(), far: 0 });
    swipeApply(); touch.fly = touch.in = touch.out = 0; touch.turnA = 0;
  });
  canvas.addEventListener('pointermove', e => {
    if (e.pointerId !== swipe.id) return; e.preventDefault();
    swipe.x = e.clientX; swipe.y = e.clientY; swipe.far = Math.max(swipe.far, Math.hypot(swipe.x - swipe.ox, swipe.y - swipe.oy));
    if (swipeOn()) swipeApply(); else swipeClear();
  });
  const swipeEnd = e => {
    if (e.pointerId !== swipe.id) return;
    const quick = performance.now() - swipe.t0 < 260 && swipe.far < 14;
    if (quick && swipeOn()) queueAction(G.viewers[0], 'thrust', 0);   // a tap is a tunka
    swipeClear();
  };
  canvas.addEventListener('pointerup', swipeEnd); canvas.addEventListener('pointercancel', swipeEnd);
  function drawSwipe() {
    if (!swipeOn() || swipe.id === null) return;
    const R = swipeR(), ox = swipe.ox, oy = swipe.oy, dx = swipe.x - ox, dy = swipe.y - oy, kd = Math.hypot(dx, dy), lim = 2.2 * R;
    const kx = ox + (kd > lim ? dx / kd * lim : dx), ky = oy + (kd > lim ? dy / kd * lim : dy);
    ctx.save(); ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.fillStyle = 'rgba(12,18,32,.28)';
    ctx.beginPath(); ctx.arc(ox, oy, R * 0.4, 0, 7); ctx.fill(); ctx.stroke();
    const band = (y0, y1, label, on, col) => {   // a zone strip above/below the centre
      ctx.fillStyle = on ? col : 'rgba(255,255,255,.08)'; rrect(ox - R * 0.55, Math.min(y0, y1), R * 1.1, Math.abs(y1 - y0), 10); ctx.fill();
      ctx.font = `800 ${Math.round(R * 0.24)}px Inter,system-ui,sans-serif`; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';   // label beside the strip, never under the finger
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.strokeText(label, ox + R * 0.68, (y0 + y1) / 2);
      ctx.fillStyle = on ? '#fff' : 'rgba(255,255,255,.7)'; ctx.fillText(label, ox + R * 0.68, (y0 + y1) / 2);
    };
    band(oy - 0.45 * R, oy - 1.25 * R, '▲ DHEEL', swipe.zone === 'DHEEL', 'rgba(123,223,242,.85)');
    band(oy + 0.45 * R, oy + 1.45 * R, '▼ FLY', swipe.zone === 'FLY', 'rgba(255,182,39,.9)');
    band(oy + 1.6 * R, oy + 2.3 * R, '▼▼ KHAINCH', swipe.zone === 'KHAINCH', 'rgba(61,220,151,.9)');
    ctx.fillStyle = 'rgba(255,255,255,' + (touch.turnA < 0 ? 0.9 : 0.3) + ')'; ctx.font = `800 ${Math.round(R * 0.38)}px Inter,system-ui,sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('◀', ox - 1.0 * R, oy); ctx.fillStyle = 'rgba(255,255,255,' + (touch.turnA > 0 ? 0.9 : 0.3) + ')'; ctx.fillText('▶', ox + 1.0 * R, oy);
    ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(kx, ky); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.92)'; ctx.beginPath(); ctx.arc(kx, ky, R * 0.26, 0, 7); ctx.fill();
    ctx.restore();
  }
  function applyTouchMode() {
    $$('[data-tm]').forEach(b => b.classList.toggle('on', b.dataset.tm === saved.touchMode));
    const inGame = G && !$('#game').classList.contains('hidden');
    if (inGame) $('#touch').classList.toggle('hidden', !IS_TOUCH || G.viewers.length > 1 || saved.touchMode === 'swipe');
    $$('#ctlEditRow, #pauseCtl').forEach(b => b.classList.toggle('hidden', saved.touchMode === 'swipe'));
  }
  $$('[data-tm]').forEach(b => b.onclick = () => { saved.touchMode = b.dataset.tm; save(); swipeClear(); applyTouchMode(); SFX.ui();
    if (G && G.tut) showTut(); });

  /* ---------------- bots ---------------- */
  // nose-steering toward a world point, in the tangent plane around the line (shared by pecha and loot hunting)
  function steerToward(me, pt, skill) {
    const L = me.spinAxis;
    const toward = [pt[0] - me.p[0], pt[1] - me.p[1], pt[2] - me.p[2]];
    const rad = toward[0] * L[0] + toward[1] * L[1] + toward[2] * L[2];
    const tang = [toward[0] - L[0] * rad, toward[1] - L[1] * rad, toward[2] - L[2] * rad], tm = Math.hypot(...tang) || 1;
    const nRad = me.nose[0] * L[0] + me.nose[1] * L[1] + me.nose[2] * L[2];
    const noseT = [me.nose[0] - L[0] * nRad, me.nose[1] - L[1] * nRad, me.nose[2] - L[2] * nRad], nm = Math.hypot(...noseT) || 1;
    const a = noseT.map(v => v / nm), b = tang.map(v => v / tm);
    const cr = [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
    const err = Math.atan2(cr[0] * L[0] + cr[1] * L[1] + cr[2] * L[2], a[0] * b[0] + a[1] * b[1] + a[2] * b[2]);
    return clamp(err * (1.5 + skill), -1, 1);
  }
  function nearestLoot(me, maxD) {
    let best = null, bd = maxD;
    for (const d of G.drifters) {
      if (d.caught || d.landed || d.p[2] < 4) continue;
      const dist = Math.hypot(d.p[0] - me.p[0], d.p[1] - me.p[1], d.p[2] - me.p[2]);
      if (dist < bd) { bd = dist; best = d; }
    }
    return best;
  }
  function attackPoint(me, tk, ph) {
    const A2 = tk.anchor, A = me.anchor, W = G.wind.at(me.p, G.t), wl = Math.hypot(W[0], W[1]) || 1;
    let best = null, bs = -1e9;
    for (let f = 0.5; f <= 0.92; f += 0.07) {
      const q = [A2[0] + (tk.p[0] - A2[0]) * f, A2[1] + (tk.p[1] - A2[1]) * f, A2[2] + (tk.p[2] - A2[2]) * f];
      const v = [q[0] - A[0], q[1] - A[1], q[2] - A[2]], dl = Math.hypot(v[0], v[1], v[2]) || 1;
      if (q[2] < 10) continue;
      const down = (v[0] * W[0] + v[1] * W[1]) / (wl * dl), up = v[2] / dl;
      const sc = down - 0.8 * Math.max(0, up - 0.85) + 0.05 * Math.sin(ph * 0.3 + f * 7);
      if (sc > bs) { bs = sc; best = q; }
    }
    return best || [A2[0] + (tk.p[0] - A2[0]) * 0.8, A2[1] + (tk.p[1] - A2[1]) * 0.8, A2[2] + (tk.p[2] - A2[2]) * 0.8];
  }
  function botInput(p) {
    const me = p.kite, ai = p.ai, t = G.t;
    if (me.free) return {};
    const ag = AGILITY[p.entry.arche] ?? 1;
    const r = Math.hypot(me.p[0] - me.anchor[0], me.p[1] - me.anchor[1], me.p[2] - me.anchor[2]);
    // something already hooked on my line: stop fighting and reel it home
    if (G.drifters.some(d => d.caught && d.caught.by === p)) return { pull: r > 20 };
    p.acting = false;
    if (ai.passive) {   // tutorial: just hold a calm hover, don't hunt the player
      if (r < 26 && t - (ai.lastAct || 0) > 1) { ai.lastAct = t; return { doSend: 0 }; }
      return {};
    }
    // in a hooked pecha: keep working the line - khainch when close, dheel when far, the odd disbicar - the way a
    // real flier saws, instead of wandering off (which, with hooked lines, would only drag both kites around)
    const pe = me._pecha;
    if (pe && pe.on) {
      p.acting = true;
      const foe = me._pechaDraw && me._pechaDraw[0] && me._pechaDraw[0].other;
      // keep leaning into the rival's line (nose at their kite) so the lines stay pressed together while sawing
      // lean INTO the rival's line (across it, the way the crossing presses), not at their kite - flying away from
      // the line is exactly how a pecha is backed out of
      let o = { thrust: false };
      // a real flier keeps a pecha UP in the sky: a patang flies where its nose points, so a khainch (or Fly) with the
      // nose pointing down drives it straight into the roofs. Bots used to haul regardless - in bot fights one kite
      // ended on the rooftop in most pechas, still "fighting" from there. Now: haul only while the nose is up; while it
      // points down, give dheel and let it turn (ghoomna) until the nose comes round, then haul - the same technique
      // the tutorial teaches the player. And never press DOWN onto a line when already low over the roofs.
      const noseUp = me.nose[2], height = me.p[2] - me.anchor[2], low = height < 14;
      if (foe && pe.n) {
        const sgn = pe.a === me ? -pe.side : pe.side;
        let aim = [me.p[0] + pe.n[0] * sgn * 10, me.p[1] + pe.n[1] * sgn * 10, me.p[2] + pe.n[2] * sgn * 10];
        if (low && aim[2] < me.p[2]) aim = [me.p[0] - 4, me.p[1], me.p[2] + 20];
        o = { turn: 0.7 * steerToward(me, aim, ai.skill) * ag, thrust: noseUp > 0.1 && Math.sin(t * 1.3 + p.slot) > 0.4 };
      }
      // what a real flier does in a pecha: work the line hard (a fast khainch or a long dheel). A still line loses,
      // so weaker bots sometimes freeze up and hold - that's the opening for a human's fast khainch
      ai.sawT = (ai.sawT || 0) - DT;
      if (ai.sawT <= 0) {
        ai.sawT = 0.7 + Math.random() * (1.8 - ai.skill);
        const hold = Math.random() < 0.55 * (1 - ai.skill);
        ai.sawMode = hold ? 'hold' : r > 75 ? 'pull' : r < 30 ? 'send' : (Math.random() < 0.55 ? 'pull' : 'send');
        if (Math.random() < 0.2 * ai.skill && noseUp > 0.3) o.tunka = true;
      }
      // nose down: no haul yet - wait for the turn to bring it up (stricter when already low over the roofs)
      const haulOk = noseUp > (low ? 0.35 : 0.0);
      if (ai.sawMode === 'pull' && r > 22 && haulOk) o.pull = true;
      else if (ai.sawMode !== 'hold' || (low && noseUp < 0)) o.send = true;
      return o;
    }
    if (t > ai.until || !ai.target || !ai.target.kite || ai.target.kite.free) {
      // a real festival isn't everyone diving on everyone: most of the time a flier holds their own patch of sky and
      // only goes after a kite that drifts close (or picks a fight now and then - more often on Hard)
      const dist = o => Math.hypot(o.kite.p[0] - me.p[0], o.kite.p[1] - me.p[1], o.kite.p[2] - me.p[2]);
      // only kites in reach of this roof: a bot across the city no longer flies all the way over to fight you
      // v6.4: a kite already in a pecha can be joined (up to PECHA.CFG.maxHooks lines on it): always to help a team-mate
      // in a Mohalla, now and then in a Festival (never on Easy - two bots on you at once is a Normal/Hard thing)
      const joinP = { easy: 0, normal: 0, hard: 0.15 }[G.diff] ?? 0;   // v6.5: two bots on one line is rare (players found it chaotic)
      const canJoin = o => { const bw = busyWith(o.kite); if (!bw || bw === me) return true; if ((o.kite.hooks | 0) >= PECHA.CFG.maxHooks) return false;
        return G.teams ? bw.owner && teamOf(bw.owner) === teamOf(p) : Math.random() < joinP; };
      const foes = G.players.filter(o => o !== p && foes2(p, o) && o.kite && !o.kite.free && dist(o) < 85 && canJoin(o));
      foes.sort((a, b) => dist(a) - dist(b));
      const near = foes.filter(o => dist(o) < 55), hunt = near.length ? Math.random() < 0.85 : Math.random() < 0.4 + 0.4 * ai.skill;
      ai.target = hunt ? (near[0] || foes[Math.floor(Math.random() * Math.min(3, foes.length))] || null) : null;
      ai.until = t + (hunt ? 6 + Math.random() * 6 : 3 + Math.random() * 4);
    }
    const tk = ai.target && ai.target.kite, out = {};
    const d = tk ? Math.hypot(tk.p[1] - me.p[1], tk.p[2] - me.p[2]) : Infinity;
    const loot = (d > 30) ? nearestLoot(me, (25 + 40 * ai.skill) * (ai.loot ?? 1)) : null;

    if (loot && r >= 22) {                      // a cut kite is falling nearby and no fight is close: go and hook it
      out.turn = steerToward(me, loot.p, ai.skill) * ag; out.thrust = true;
    } else if (tk && r >= 22) {
      // attack the LINE, not the kite: fly across the rival's dor about two-thirds of the way up it, so the crossing
      // drapes over it and the pecha hooks (flying at the kite itself only ever touched tip-to-line and glanced off)
      // v6: pick the spot on their dor this kite can actually fly to - the most DOWNWIND one as seen from this roof.
      // A fixed spot two-thirds up the line was often off to the side of the wind window, where a kite has no power:
      // a duel bot then hovered 9 m from an idle player for minutes and never crossed the line.
      const aim = attackPoint(me, tk, t + p.slot);
      const reach = Math.hypot(aim[0] - me.anchor[0], aim[1] - me.anchor[1], aim[2] - me.anchor[2]);
      out.turn = steerToward(me, aim, ai.skill) * ag;
      // line too short to get there: stop flying for a moment so the dheel below lets the wind run the kite out
      // (flying while giving dheel steers instead of paying out, so the line never grew)
      out.thrust = (d > 6 || r < 60) && r > reach - 6;
    } else if (r >= 22) {
      // cruising: keep the kite in this flier's own lane of sky (out from their roof, at their own height and line
      // length), drifting gently - that's what spreads a festival's kites across the whole sky
      const A = me.anchor, side = Math.sign(A[1]) || (p.slot % 2 ? 1 : -1), el = 0.55 + 0.35 * Math.sin(t * 0.07 + p.slot), az = side * (0.25 + 0.25 * Math.sin(t * 0.05 + p.slot * 2));
      const pr = ai.prefR || 60, lane = [A[0] + pr * Math.cos(el) * Math.cos(az), A[1] + pr * Math.cos(el) * Math.sin(az), A[2] + pr * Math.sin(el)];
      const off = Math.hypot(lane[0] - me.p[0], lane[1] - me.p[1], lane[2] - me.p[2]);
      if (off > 8) { out.turn = 0.6 * steerToward(me, lane, ai.skill) * ag; out.thrust = off > 18 && Math.sin(t * 0.9 + p.slot) > 0; }
    }

    // too low over the roofs: forget everything else and climb (fast kites otherwise dived into the houses chasing a line)
    if (me.p[2] < 11 && r >= 14) { out.turn = steerToward(me, [me.p[0] - 4, me.p[1], me.p[2] + 25], ai.skill) * ag; out.thrust = me.p[2] > 4; }
    const cool = 0.9 - 0.5 * ai.skill;
    p.acting = !!out.thrust;
    if (t - (ai.lastAct || 0) < cool) return out;
    p.acting = true;
    if (r < 22 || me.p[2] < 9) { out.doSend = 0; ai.lastAct = t; return out; }
    if (r > 120) { out.doPull = true; ai.lastAct = t; return out; }
    if (!tk && !loot) {   // cruising: let line out to its favourite length, or take a little in
      const pr = ai.prefR || 60;
      if (r < pr - 6) { out.doSend = 0; ai.lastAct = t; } else if (r > pr + 18) { out.doPull = true; ai.lastAct = t; }
      return out;
    }
    if (tk && !loot) {
      // fliers on different roofs: let out (or take in) enough line to reach the rival's kite, then go across it
      const aim = attackPoint(me, tk, t + p.slot), want = Math.hypot(aim[0] - me.anchor[0], aim[1] - me.anchor[1], aim[2] - me.anchor[2]) + 4;
      const da = Math.hypot(aim[0] - me.p[0], aim[1] - me.p[1], aim[2] - me.p[2]);
      if (r < want - 2) { out.doSend = 0; ai.lastAct = t; }   // first get enough line out to reach across (a tunka takes line IN)
      else if (d < 7 + 5 * ai.skill || da < 5 + 3 * ai.skill) { out.tunka = true; ai.lastAct = t; }   // close in: a tunka darts the kite across the rival's line
      else if (r > want + 12) { out.doPull = true; ai.lastAct = t; }
    }
    return out;
  }

  /* ---------------- loose string (verlet rope) for cut lines ---------------- */
  class Rope {
    constructor(pts, maxLen) {
      const n = 22, m = pts.length; let L = 0; const rs = [];
      for (let i = 0; i < n; i++) rs.push(pts[Math.round(i * (m - 1) / (n - 1))].slice());
      for (let i = 1; i < n; i++) L += Math.hypot(rs[i][0] - rs[i - 1][0], rs[i][1] - rs[i - 1][1], rs[i][2] - rs[i - 1][2]);
      if (L > maxLen) { const f = maxLen / L; for (let i = 1; i < n; i++) for (let a = 0; a < 3; a++) rs[i][a] = rs[0][a] + (rs[i][a] - rs[0][a]) * f; L = maxLen; }
      this.n = n; this.seg = L / (n - 1); this.p = rs; this.q = rs.map(x => x.slice());
    }
    // pin (optional): { i, p } - one more point held in place, e.g. a looter's hand gripping the dor
    step(dt, wind, head, t, pin) {
      const n = this.n, p = this.p, q = this.q, pi = pin ? clamp(Math.round(pin.i), 1, n - 1) : -1;
      const w = this._w || (this._w = [0, 0, 0]);
      for (let i = head ? 1 : 0; i < n; i++) {
        wind.at(p[i], t, w);
        for (let a = 0; a < 3; a++) {
          const target = a === 2 ? -1.6 : w[a] * 0.45, v = (p[i][a] - q[i][a]) / dt, nv = v + (target - v) * Math.min(1, 2.2 * dt);
          q[i][a] = p[i][a]; p[i][a] += nv * dt;
        }
      }
      if (head) { for (let a = 0; a < 3; a++) { q[0][a] = p[0][a]; p[0][a] = head[a]; } }
      if (pi > 0) for (let a = 0; a < 3; a++) { q[pi][a] = p[pi][a]; p[pi][a] = pin.p[a]; }
      for (let it = 0; it < 5; it++) {
        for (let i = 0; i < n - 1; i++) {
          const A = p[i], B = p[i + 1], dx = B[0] - A[0], dy = B[1] - A[1], dz = B[2] - A[2], d = Math.hypot(dx, dy, dz) || 1e-6, k = (d - this.seg) / d;
          const fa = (i === 0 && head) || i === pi, fb = i + 1 === pi;
          const wa = fa ? 0 : (fb ? 1 : 0.5), wb = fb ? 0 : (fa ? 1 : 0.5);
          A[0] += dx * k * wa; A[1] += dy * k * wa; A[2] += dz * k * wa; B[0] -= dx * k * wb; B[1] -= dy * k * wb; B[2] -= dz * k * wb;
        }
      }
      for (let i = 0; i < n; i++) if (p[i][2] < 0.03) { p[i][2] = 0.03; q[i][0] = p[i][0]; q[i][1] = p[i][1]; }
    }
  }
  function splitLine(kite, s, snap) {
    const pts = kite.linePoints(40), idx = clamp(Math.round((snap ? 0.35 + Math.random() * 0.5 : s) * 40), 4, 36);
    kite.trail = new Rope(pts.slice(idx).reverse(), 60);
    G.ropes.push({ rope: new Rope(pts.slice(0, idx + 1), 60), anchor: kite.anchor.slice(), pin: 0.9, life: 9, color: kite.thread.color });
  }

  /* ---------------- looting: hook a falling cut kite with your own line and reel it home ----------------
   * Contact: any part of the falling kite or its trailing string comes within CATCH_R of your line.
   * Then it hangs off a "hook" point on your line. That hook slides toward you slowly by itself, and fast while
   * you pull (khainch) - so bringing it home is a real reel-in, and the kite follows on a spring, swinging and
   * lagging under wind, never teleporting. Its weight also drags on your kite. Reaching your hands = +1 kite.
   * If your own kite is cut while carrying it, the catch is dropped and falls again (anyone can grab it). */
  const CATCH_R = 2.4;   // a little generous: wrapping a line round a passing kite is the fun part
  function segDist(q, a, b) {
    const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], aq = [q[0] - a[0], q[1] - a[1], q[2] - a[2]];
    const L2 = ab[0] * ab[0] + ab[1] * ab[1] + ab[2] * ab[2] || 1e-9;
    const s = clamp((aq[0] * ab[0] + aq[1] * ab[1] + aq[2] * ab[2]) / L2, 0, 1);
    return { d: Math.hypot(aq[0] - ab[0] * s, aq[1] - ab[1] * s, aq[2] - ab[2] * s), s };
  }
  function tryCatch(d) {
    if (d.caught || d.landed || d.looted || (d.age || 0) < 0.8) return;
    const probe = [d.p]; if (d.trail) for (let i = 2; i < d.trail.n; i += 3) probe.push(d.trail.p[i]);
    for (const p of G.players) {
      const k = p.kite; if (!k || k.free || k.launch || p.landing || p.landed) continue;
      for (const q of probe) {
        const h = segDist(q, k.anchor, k.p);
        if (h.d < CATCH_R && h.s > 0.08) {
          d.caught = { by: p, kite: k, s: h.s, hook: q.slice() };
          d.v = d.v.map(x => x * 0.5);
          const whose = d.owner === p ? 'their own' : (d.owner ? d.owner.name + "'s" : 'a');
          if (real(p) || real(d.owner)) note(`${p.name} hooked ${whose} kite`); banner(p, 'HOOKED — PULL IT IN', '#7bdff2', 1.4);
          if (p.ctrl.startsWith('human')) SFX.hooked();
          return;
        }
      }
    }
  }
  /* LAPETNA - a hooked kite flies on your line. Its own dor has wrapped round yours at the hook; it now flies on that
   * short tether exactly like a kite on a line: downwind of the hook and climbing, swinging in the gusts, nose up. As
   * you khainch, the hook (and the kite flying off it) comes down your line toward your hands. */
  function stepCaught(d) {   // returns true once collected (caller removes it)
    const c = d.caught, p = c.by, k = p.kite;
    if (k !== c.kite || k.free || !G.players.includes(p)) { d.caught = null; d.fallRate = 1.4; note(p.name + ' dropped the hooked kite'); return false; }
    c.len = c.len || 3.2 + Math.random() * 1.6;          // how much of its dor is left between the wrap and the kite
    c.t = (c.t || 0) + DT;
    const reelIn = Math.min(1, Math.max(0, -k.reelRate) / 8);
    // it slides down by itself only slowly (its weight on a sloping line); a khainch winds it in properly
    c.s = Math.max(0, c.s - DT * (0.01 + 0.17 * k.pullE + 0.1 * reelIn));
    const pts = k.linePoints(24), f = c.s * 24, i = Math.min(23, Math.floor(f)), u = f - i;
    const hook = [0, 1, 2].map(a => pts[i][a] + (pts[i + 1][a] - pts[i][a]) * u);
    c.hook = hook;
    // where a kite on a short line from the hook sits: downwind and up, at an angle that rises with the wind
    const w = G.wind.at(hook, G.t), ws = Math.hypot(w[0], w[1]) || 1, wx = w[0] / ws, wy = w[1] / ws;
    const el = clamp(0.35 + ws * 0.05, 0.4, 0.95) + 0.12 * Math.sin(c.t * 1.3 + d.swayPh);   // rises and dips with the gusts
    const side = 0.35 * Math.sin(c.t * 0.9 + d.swayPh * 2);                                    // and swings side to side
    const L = c.len * Math.min(1, 0.25 + c.t * 0.8);                                         // the tether pays out as it catches the wind
    const dir = [Math.cos(el) * (wx - wy * side), Math.cos(el) * (wy + wx * side), Math.sin(el)];
    const dl = Math.hypot(dir[0], dir[1], dir[2]) || 1;
    const tgt = [hook[0] + dir[0] / dl * L, hook[1] + dir[1] / dl * L, Math.max(0.6, hook[2] + dir[2] / dl * L)];
    for (let a = 0; a < 3; a++) d.v[a] += ((tgt[a] - d.p[a]) * 18 - d.v[a] * 6) * DT;
    for (let a = 0; a < 3; a++) d.p[a] += d.v[a] * DT;
    if (d.p[2] < 0.05) { d.p[2] = 0.05; d.v[2] = Math.max(0, d.v[2]); }
    d.t += DT;
    // it stops tumbling and flies nose-up, rocking a little like a kite on a short line
    const home = Math.round(d.spinAngle / (2 * Math.PI)) * 2 * Math.PI, rock = 0.28 * Math.sin(c.t * 2.1 + d.swayPh) + side * 0.4;
    d.spinVel += ((home + rock - d.spinAngle) * 14 - d.spinVel * 5) * DT;
    d.spinAngle += d.spinVel * DT;
    d.headingAngle *= Math.exp(-3 * DT);
    d.bodyAngle = d.headingAngle + d.spinAngle;
    d.alpha = (d.spec.trim || 28) * DEG;
    if (d.trail) d.trail.step(DT, G.wind, d.p, G.t);
    // the extra kite on the line is real load on the catcher's kite: a little inward and downward drag
    const lx = k.p[0] - k.anchor[0], ly = k.p[1] - k.anchor[1], lz = k.p[2] - k.anchor[2], ll = Math.hypot(lx, ly, lz) || 1;
    k.v[0] -= lx / ll * 1.2 * DT; k.v[1] -= ly / ll * 1.2 * DT; k.v[2] -= (lz / ll * 1.2 + 0.6) * DT;
    const hookHome = Math.hypot(hook[0] - k.anchor[0], hook[1] - k.anchor[1], hook[2] - k.anchor[2]);
    if (c.s <= 0.02 || hookHome < 2.5) { collect(d, p); return true; }
    return false;
  }
  function collect(d, p) {
    const own = d.owner === p;
    const lootId = (d.entry && d.entry.id) || '';
    if (G.online && !own && p.ctrl === 'human1') netSend({ t: 'ev', e: 'caught', k: lootId });
    if (!own && p.ctrl.startsWith('human') && G.rec && !G.tut) (G.rec.lootIds || (G.rec.lootIds = [])).push(lootId);   // for the loot collection
    if (!own) p.score.caught++;
    if (!own && p.ctrl.startsWith('human') && !G.tut) stat(s => { s.caught++; });
    if (real(p) || real(d.owner)) note(own ? `${p.name} recovered their own kite` : `${p.name} brought home ${d.owner ? d.owner.name + "'s" : 'a'} kite`);
    banner(p, own ? 'KITE RECOVERED' : 'KITE COLLECTED +1', '#ffd166', 1.8);
    if (!own) G.popups.push({ p: [p.kite.anchor[0], p.kite.anchor[1], 3.2], text: '+1 kite', color: '#ffd166', t: 1.4 });
    if (p.ctrl.startsWith('human')) SFX.collected();
  }

  /* ---------------- looters: the street kids who chase every cut kite ----------------
   * The moment a kite is cut, kids pour out of the lanes and off the roofs - some with a jhaar (a long bamboo with a
   * thorny bush tied on top, to snag a kite out of the air), some bare-handed. They run to where the kite will come
   * down, jump for it, and whoever gets it runs off waving it. Hook it with your own line first and they give up. */
  const KIDS = [['#f2c14e', '#1b1410'], ['#6cb4ee', '#2a1a12'], ['#ef6fa0', '#1b1410'], ['#2e8b57', '#1b1410'], ['#ffffff', '#3a2a1a'], ['#f28c28', '#1b1410'], ['#7b4bb3', '#2a1a12'], ['#d62828', '#1b1410']];
  const SKIN = ['#e5b48c', '#c98d5e', '#a06a43', '#f3cfb3'];
  function spawnLooters(d) {
    if (!G || !d) return;
    const n = 2 + Math.floor(Math.random() * 3), w = G.wind.at(d.p, G.t), T = Math.max(1, d.p[2] / 2.6), land = [d.p[0] + w[0] * 0.4 * T, d.p[1] + w[1] * 0.4 * T];
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, r = 22 + Math.random() * 30, k = KIDS[Math.floor(Math.random() * KIDS.length)];
      G.looters.push({ p: [land[0] + Math.cos(a) * r, land[1] + Math.sin(a) * r], v: [0, 0], spd: 4.4 + Math.random() * 2.4, kite: d, state: 'run', t: 0, ph: Math.random() * 6,
        kameez: k[0], hair: k[1], skin: SKIN[Math.floor(Math.random() * SKIN.length)], stick: Math.random() < 0.7, tall: 0.85 + Math.random() * 0.3, jump: 0, face: 0 });
    }
    if (d.owner && d.owner.ctrl && d.owner.ctrl.startsWith('human')) note(G.viewers.length > 1 ? `The kids are after ${d.owner.name}'s kite!` : 'The kids are after your kite - hook it back before they get it!');
    if (d.owner && d.owner.ctrl.startsWith('human') && SFX.kids) setTimeout(() => SFX.kids(), 500 + Math.random() * 700);
  }
  const jumpH = L => L.jump > 0 ? Math.sin(Math.PI * (1 - L.jump / 0.55)) * 0.75 : 0;
  const lootStickTop = L => [L.p[0] + (L.dir ? L.dir[0] * 0.4 : 0), L.p[1] + (L.dir ? L.dir[1] * 0.4 : 0), (L.stick ? 3.1 : 1.9) * L.tall + jumpH(L)];
  function stepLooters() {
    for (const L of G.looters) {
      L.t += DT; L.jump = Math.max(0, L.jump - DT);
      const d = L.kite;
      if (L.state === 'run') {
        if (!d || d.gone || !G.drifters.includes(d) || d.caught || (d.looted && d.looted !== L)) {
          if (d && d.caught && L.t > 1 && !d.snatchNoted) { d.snatchNoted = true; if (real(d.caught.by) || real(d.owner)) note(`${d.caught.by.name} snatched it from the looters!`); }
          L.state = 'sad'; L.t = 0; continue;
        }
        if (d.pulledBy && d.pulledBy !== L) {   // another kid already has its dor: crowd round them, hoping it slips
          const P0 = d.pulledBy.p, dx = P0[0] - L.p[0], dy = P0[1] - L.p[1], dd = Math.hypot(dx, dy) || 1, sp = dd > 2.6 ? L.spd * 0.8 : 0;
          L.dir = [dx / dd, dy / dd]; L.v = [L.dir[0] * sp, L.dir[1] * sp]; L.p[0] += L.v[0] * DT; L.p[1] += L.v[1] * DT;
          continue;
        }
        // run to where it will come down: its spot on the ground plus the drift still to come - or, once the dor it
        // trails hangs low enough to reach, straight for the end of the dor
        const w = G.wind.at(d.p, G.t), T = d.landed ? 0 : Math.max(0, d.p[2] / 2.6) * 0.7;
        let tx = d.p[0] + w[0] * 0.4 * T, ty = d.p[1] + w[1] * 0.4 * T;
        const low = lowDor(d), reachH = (L.stick ? 3.4 : 2.2) * L.tall;
        if (low && low.q[2] < reachH + 4 && d.p[2] > reachH) { tx = low.q[0]; ty = low.q[1]; }
        const dx = tx - L.p[0], dy = ty - L.p[1], dist = Math.hypot(dx, dy) || 1e-6, sp = dist > 0.8 ? L.spd * Math.min(1, dist / 3 + 0.3) : 0;
        L.dir = [dx / dist, dy / dist]; L.v = [L.dir[0] * sp, L.dir[1] * sp]; L.p[0] += L.v[0] * DT; L.p[1] += L.v[1] * DT;
        const gd = Math.hypot(d.p[0] - L.p[0], d.p[1] - L.p[1]), reach = (L.stick ? 3.6 : 2.1) * L.tall;
        if (gd < 4 && d.p[2] < reach + 2.5 && L.jump <= 0 && Math.random() < 0.08) L.jump = 0.55;   // a leap for it
        // the dor is in reach while the kite is still up: grab the string and haul the kite down hand over hand,
        // the way every real looter does it
        if (!d.landed && d.p[2] > reach + jumpH(L) && grabDor(L, d)) continue;
        if (gd < 2.4 && d.p[2] < reach + jumpH(L)) {
          L.state = 'carry'; L.t = 0; d.looted = L; d.landed = false;
          const who = d.owner ? (d.owner.ctrl.startsWith('human') && G.viewers.length === 1 ? 'your' : d.owner.name + "'s") : 'a';
          if (real(d.owner)) note(`The kids looted ${who} kite`); if (d.owner && d.owner.ctrl.startsWith('human')) banner(d.owner, 'LOOTED!', '#ffb627', 1.4);
          SFX.cheer(false);
          for (const o of G.looters) if (o !== L && o.kite === d && o.state === 'run') { o.state = 'sad'; o.t = 0; }
        }
      } else if (L.state === 'reel') {
        // hauling the kite down by its dor: backing away from it a step at a time, hand over hand
        if (!d || d.gone || !G.drifters.includes(d) || d.caught || d.pulledBy !== L) {
          if (d && d.caught && !d.snatchNoted) { d.snatchNoted = true; if (real(d.caught.by) || real(d.owner)) note(`${d.caught.by.name} snatched it off the kid's string!`); }
          if (d && d.pulledBy === L) d.pulledBy = null;
          L.state = 'sad'; L.t = 0; continue;
        }
        L.haulPh = (L.haulPh || 0) + DT * 2 * Math.PI * 1.15;
        const away = [L.p[0] - d.p[0], L.p[1] - d.p[1]], al = Math.hypot(away[0], away[1]) || 1;
        L.dir = [-away[0] / al, -away[1] / al];   // faces the kite
        const back = 0.5 + 0.4 * Math.abs(Math.sin(L.haulPh));
        L.v = [away[0] / al * back, away[1] / al * back]; L.p[0] += L.v[0] * DT; L.p[1] += L.v[1] * DT;
        if (L.t > 0.5 && Math.random() < 0.004) L.shout = { text: ['Kheencho!', 'Pakro!', 'Meri hai!', 'Chhorna mat!'][Math.floor(Math.random() * 4)], t: 1.3 };
      } else if (L.state === 'carry') {
        // off down the lane with the prize held high
        const away = L.dir ? [-L.dir[1], L.dir[0]] : [0, 1];
        L.v = [away[0] * L.spd * 0.9, away[1] * L.spd * 0.9]; L.p[0] += L.v[0] * DT; L.p[1] += L.v[1] * DT;
        if (L.t > 6) { L.dead = true; if (d) d.gone = true; }
      } else {   // sad: stop, kick the dust, wander off
        L.v = L.t < 1.5 ? [0, 0] : [-(L.dir ? L.dir[0] : 1) * 1.6, -(L.dir ? L.dir[1] : 0) * 1.6];
        L.p[0] += L.v[0] * DT; L.p[1] += L.v[1] * DT;
        if (L.t > 6) L.dead = true;
      }
    }
    for (const L of G.looters) if (L.shout && (L.shout.t -= DT) <= 0) L.shout = null;
    G.looters = G.looters.filter(L => !L.dead);
  }
  // the lowest point of the dor a falling kite trails (its rope's free end hangs lowest)
  function lowDor(d) {
    if (!d.trail) return null; let best = null;
    for (let i = 2; i < d.trail.n; i++) { const q = d.trail.p[i]; if (!best || q[2] < best.q[2]) best = { i, q }; }
    return best;
  }
  const looterHand = L => [L.p[0] + (L.dir ? L.dir[0] * 0.25 : 0), L.p[1] + (L.dir ? L.dir[1] * 0.25 : 0), 1.25 * L.tall + jumpH(L)];
  /** a looter catching hold of a falling kite's dor (any point of it within arm's - or jhaar's - reach) */
  function grabDor(L, d) {
    if (!d.trail || d.pulledBy || d.caught || d.looted) return false;
    const reachH = (L.stick ? 3.4 : 2.2) * L.tall + jumpH(L);
    for (let i = 2; i < d.trail.n; i++) {
      const q = d.trail.p[i];
      if (q[2] < reachH && Math.hypot(q[0] - L.p[0], q[1] - L.p[1]) < (L.stick ? 1.6 : 1.1)) {
        L.state = 'reel'; L.t = 0; L.grabI = i; L.haulPh = 0; d.pulledBy = L; d.pullT = 0;
        L.shout = { text: 'Dor pakar li!', t: 1.4 };
        const who = d.owner ? (d.owner.ctrl.startsWith('human') && G.viewers.length === 1 ? 'your' : d.owner.name + "'s") : 'a';
        if (real(d.owner) || G.viewers.some(v => v.kite && Math.hypot(v.kite.p[0] - d.p[0], v.kite.p[1] - d.p[1]) < 80)) note(`A kid grabbed the string of ${who} kite - pulling it down!`);
        if (d.owner && d.owner.ctrl.startsWith('human')) banner(d.owner, 'STRING GRABBED!', '#ffb627', 1.3);
        if (SFX.kids && Math.random() < 0.7) SFX.kids();
        return true;
      }
    }
    return false;
  }
  /* a kite being hauled down by a looter on its own dor: the kid's grip slides up the string as they pull it in hand over
   * hand, and the kite - on a shrinking tether - flies again for a moment (rises a little in the wind, swings, dips with
   * each haul) before it comes down into their hands. Anyone's line can still sweep it away from them on the way. */
  function stepPulled(d) {
    const L = d.pulledBy; d.pullT += DT; d.age = (d.age || 0) + DT;
    const H = looterHand(L), seg = d.trail.seg;
    // hand over hand: a surge each haul, ~1.4 m/s on average
    const haul = 0.35 + 0.65 * Math.abs(Math.sin(L.haulPh || 0));
    L.grabI = Math.max(0, L.grabI - DT * (0.6 + 1.6 * haul) / seg);
    const tether = Math.max(0.6, L.grabI * seg * 0.92);
    // where a kite on that much string from the hand sits: downwind and up, swinging in the gusts, tugged down each haul
    const w = G.wind.at(d.p, G.t), ws = Math.hypot(w[0], w[1]) || 1, wx = w[0] / ws, wy = w[1] / ws;
    const el = clamp(0.5 + ws * 0.05, 0.45, 1.05) + 0.15 * Math.sin(d.pullT * 1.4 + d.swayPh) - 0.18 * haul;
    const side = 0.4 * Math.sin(d.pullT * 0.95 + d.swayPh * 2);
    const dir = [Math.cos(el) * (wx - wy * side), Math.cos(el) * (wy + wx * side), Math.sin(el)], dl = Math.hypot(...dir) || 1;
    const tgt = [H[0] + dir[0] / dl * tether, H[1] + dir[1] / dl * tether, Math.max(0.4, H[2] + dir[2] / dl * tether)];
    const grip = Math.min(1, d.pullT / 0.7);   // the dor goes taut over a moment - the kite doesn't jump to the hand
    const dist = Math.hypot(d.p[0] - H[0], d.p[1] - H[1], d.p[2] - H[2]);
    if (dist > tether * 0.97 || grip >= 1) for (let a = 0; a < 3; a++) d.v[a] += ((tgt[a] - d.p[a]) * 14 * grip - d.v[a] * 5 * grip) * DT;
    else { d.v[2] += (-1.2 - d.v[2]) * Math.min(1, DT / 0.4); }   // still slack: it keeps sinking until the dor tightens
    for (let a = 0; a < 3; a++) d.p[a] += d.v[a] * DT;
    if (d.p[2] < 0.1) { d.p[2] = 0.1; d.v[2] = Math.max(0, d.v[2]); }
    // nose up and rocking, like any kite on a short line
    const home = Math.round(d.spinAngle / (2 * Math.PI)) * 2 * Math.PI, rock = 0.35 * Math.sin(d.pullT * 2.3 + d.swayPh) + side * 0.5;
    d.spinVel += ((home + rock - d.spinAngle) * 12 - d.spinVel * 5) * DT; d.spinAngle += d.spinVel * DT;
    d.headingAngle *= Math.exp(-3 * DT); d.bodyAngle = d.headingAngle + d.spinAngle; d.incl += (0.12 - d.incl) * Math.min(1, DT / 0.3);
    d.trail.step(DT, G.wind, d.p, G.t, { i: L.grabI, p: H });
    tryCatch(d); if (d.caught) { d.pulledBy = null; return; }
    // in the kid's hands
    if (L.grabI <= 1 || dist < 1.6) {
      d.pulledBy = null; L.state = 'carry'; L.t = 0; d.looted = L; d.landed = false;
      const who = d.owner ? (d.owner.ctrl.startsWith('human') && G.viewers.length === 1 ? 'your' : d.owner.name + "'s") : 'a';
      if (real(d.owner)) note(`The kids looted ${who} kite`); if (d.owner && d.owner.ctrl.startsWith('human')) banner(d.owner, 'LOOTED!', '#ffb627', 1.4);
      SFX.cheer(false); L.shout = { text: 'Mil gayi!', t: 1.5 };
      for (const o of G.looters) if (o !== L && o.kite === d && o.state === 'run') { o.state = 'sad'; o.t = 0; }
    }
  }
  // the street kids, drawn with the same fliers as the rooftops (src/fliers.js) as children: they run with a bob,
  // reach up for the kite with both arms (the jhaar held high), jump for it, and trudge off when someone else wins it
  const KID_HEAD = ['none', 'none', 'cap', 'topi', 'patka'];
  function kidLook(L) {
    if (L.look) return L.look;
    const r = rng(Math.floor(L.ph * 1e5));
    return (L.look = { ...Fliers.BASE, age: 'kid', build: 'slim', skin: Math.floor(r() * Fliers.SKINS.length), kameez: L.kameez, shalwar: r() < 0.5 ? L.kameez : '#e9e2d0',
      hair: L.hair, hairStyle: ['short', 'curly', 'side'][Math.floor(r() * 3)], head: KID_HEAD[Math.floor(r() * KID_HEAD.length)], headColor: ['#d62828', '#ffffff', '#1d3557', '#f28c28'][Math.floor(r() * 4)],
      outfit: r() < 0.3 ? 'tshirt' : 'shalwar', print: r() < 0.5, expr: 'grin', shoes: '#6b4226' });
  }
  let kidSeq = 0;
  function drawLooter(cam, L) {
    if (Math.hypot(L.p[0] - cam.pos[0], L.p[1] - cam.pos[1]) < 6) return;   // right under the camera: would fill the screen
    const jh = jumpH(L), moving = Math.hypot(L.v[0], L.v[1]) > 0.5, bob = moving ? Math.abs(Math.sin(L.t * 11 + L.ph)) * 0.09 : 0;
    const base = project(cam, [L.p[0], L.p[1], jh + bob]), head = project(cam, [L.p[0], L.p[1], 1.3 * L.tall + jh + bob]); if (!base || !head) return;
    const h = base.y - head.y; if (h < 3) return;
    const sad = L.state === 'sad', carry = L.state === 'carry', reel = L.state === 'reel';
    // where the kite (or, carrying it, the top of the stick) is on screen
    let tgt = null;
    if (carry) tgt = project(cam, lootStickTop(L)); else if (!sad && L.kite) tgt = project(cam, L.kite.p);
    const sh = [base.x, base.y - h * 0.78];
    let aim = tgt ? [tgt.x - sh[0], tgt.y - sh[1]] : [0.25, 0.9];
    if (aim[1] > -0.2 * Math.hypot(aim[0], aim[1]) && !sad) aim[1] = -0.6 * Math.hypot(aim[0], aim[1]);   // always reaching UP for it
    if (h < 9) {   // far away: a simple figure is enough
      ctx.fillStyle = L.kameez; ctx.fillRect(base.x - h * 0.15, base.y - h * 0.8, h * 0.3, h * 0.45);
      ctx.fillStyle = L.skin; ctx.beginPath(); ctx.arc(base.x, base.y - h * 0.9, h * 0.12, 0, 7); ctx.fill(); return;
    }
    const runYaw = moving ? Math.atan2(L.v[1], L.v[0]) : (L.kite ? Math.atan2(L.kite.p[1] - L.p[1], L.kite.p[0] - L.p[0]) : 0);
    const viewYaw = Math.atan2(L.p[1] - cam.pos[1], L.p[0] - cam.pos[0]);
    // v7.2: a kid was painted from scratch every frame (no sprite) - one running close to the camera cost 365 ms in a single
    // frame. Kids now use the same cached, budgeted sprites as the rooftop people (~14 fresh paints a second).
    L._fk = L._fk || 'kid' + (++kidSeq);
    const out = drawFig(L._fk + (curViewer && curViewer.lootcam ? 'L' : ''), base.x, base.y, h / 0.72, kidLook(L), { face: runYaw - viewYaw, aim, t: L.t + L.ph, mode: sad ? 'idle' : reel ? 'pull' : 'send', tug: L.jump > 0 ? 0.8 : 0,
      lineColor: reel && L.kite ? L.kite.thread.color : 'rgba(0,0,0,0)', haulPh: reel ? L.haulPh : null, haul: reel ? 0.5 + 0.5 * Math.abs(Math.sin(L.haulPh || 0)) : 0 }, QUAL.low ? 110 : 70);
    if (L.stick && out && out.hand && !reel) {
      const [hx, hy] = out.hand, al = Math.hypot(aim[0], aim[1]) || 1, len = h * 1.5;
      const ex = carry && tgt ? tgt.x : hx + (sad ? h * 0.45 : aim[0] / al * len), ey = carry && tgt ? tgt.y : hy + (sad ? h * 0.5 : aim[1] / al * len);
      ctx.save(); ctx.lineCap = 'round';
      ctx.strokeStyle = '#8a6a3a'; ctx.lineWidth = Math.max(1.2, h * 0.045); ctx.beginPath(); ctx.moveTo(hx - (ex - hx) * 0.12, hy - (ey - hy) * 0.12); ctx.lineTo(ex, ey); ctx.stroke();
      ctx.strokeStyle = '#4f6b2a'; ctx.lineWidth = Math.max(1, h * 0.03);   // the jhaar: thorny twigs tied on top
      for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2 + L.ph, r = h * (0.13 + 0.06 * (i % 2)); ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(ex + Math.cos(a) * r, ey + Math.sin(a) * r); ctx.stroke(); }
      ctx.restore();
    }
    const say = L.shout ? L.shout.text : carry ? 'Mil gayi!' : null;
    if (say && h > 12) { ctx.save(); ctx.font = `700 ${Math.round(Math.max(10, h * 0.24))}px Inter,system-ui,sans-serif`; ctx.textAlign = 'center'; ctx.fillStyle = '#ffd166'; ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = 3; ctx.strokeText(say, base.x, base.y - h * 1.9); ctx.fillText(say, base.x, base.y - h * 1.9); ctx.restore(); }
  }
  const shade = (hex, f) => { const n = parseInt(String(hex).slice(1), 16) || 0; return '#' + [n >> 16, (n >> 8) & 255, n & 255].map(v => Math.round(Math.max(0, Math.min(255, v * f))).toString(16).padStart(2, '0')).join(''); };

  // ---- the loot-chase camera: a small picture-in-picture that follows the kids racing for a cut kite ----
  const lootView = { lootcam: true, slot: 0, cam: null, label: '' };
  function lootFocus() {
    // the chase worth watching: one where the kite is nearly down (or already being carried off)
    let best = null, bs = -1;
    for (const L of G.looters) {
      if (L.state === 'sad') continue; const d = L.kite; if (!d) continue;
      const score = (L.state === 'carry' ? 50 : L.state === 'reel' ? 45 : 0) + 40 - Math.min(40, d.p[2]) + ((d.owner && d.owner.ctrl.startsWith('human')) ? 30 : 0);
      if (score > bs) { bs = score; best = L; }
    }
    return best;
  }
  function lootCam(v, w, h, dt) {
    const L = v.focus, d = L.kite, T = L.state === 'carry' ? [L.p[0], L.p[1], 1.6] : L.state === 'reel' ? [(L.p[0] + d.p[0]) / 2, (L.p[1] + d.p[1]) / 2, Math.max(1.4, d.p[2] * 0.45)] : [d.p[0], d.p[1], Math.max(1.2, d.p[2] * 0.5)];
    const c = v.cam = v.cam || { yaw: 0, at: T.slice() };
    for (let a = 0; a < 3; a++) c.at[a] += (T[a] - c.at[a]) * Math.min(1, dt * 3);
    const yaw = Math.atan2(c.at[1], c.at[0]);   // look out from our roof's direction
    // a little further back and higher than before, so a kid running past the camera doesn't fill the picture with a giant jhaar
    const pos = [c.at[0] - 15 * Math.cos(yaw), c.at[1] - 15 * Math.sin(yaw), 4.5], dz = c.at[2] + 1.2 - pos[2];
    const pitch = Math.atan2(dz, 15), cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
    return { pos, yaw, pitch, fl: h * 1.05, cx: w / 2, cy: h * 0.58, fwd: [cp * cy, cp * sy, sp], right: [sy, -cy, 0], up: [-sp * cy, -sp * sy, cp] };
  }
  function drawLootPip(W, H, dt) {
    const L = lootFocus();
    lootView.alpha = (lootView.alpha || 0) + ((L ? 1 : 0) - (lootView.alpha || 0)) * Math.min(1, dt * 4);
    if (L) { if (lootView.focus && lootView.focus.kite !== L.kite) lootView.cam = null; lootView.focus = L; }
    if (lootView.alpha < 0.03 || !lootView.focus || !lootView.focus.kite) return;
    // v7: Settings -> Loot window: 'small' (default, tucked in the top-right corner), 'large' (the old size) or 'off'
    const mode = saved.lootcam === 'off' || saved.lootcam === 'large' ? saved.lootcam : 'small';
    if (mode === 'off') return;
    const d = lootView.focus.kite, own = d.owner ? (G.viewers.includes(d.owner) && G.viewers.length === 1 ? 'Your kite' : d.owner.name + "'s kite") : 'A kite';
    lootView.label = own + (lootView.focus.state === 'carry' ? ' — looted!' : lootView.focus.state === 'reel' ? ' — pulled down!' : '');
    const big = mode === 'large';
    const w = Math.round(big ? Math.min(320, W * (IS_TOUCH ? 0.26 : 0.3)) : Math.min(IS_TOUCH ? 190 : 230, Math.max(132, W * (IS_TOUCH ? 0.19 : 0.17)))), h = Math.round(w * (big ? 0.62 : 0.58));
    // corner: top-right on phones (clear of the zoom buttons and the tutorial card), bottom-left on a computer
    const tut = $('#tut'), tb = tut && !tut.classList.contains('hidden') ? tut.getBoundingClientRect() : null;
    let x = IS_TOUCH ? W - w - Math.max(10, SAFE.r) : 12;
    const y = IS_TOUCH ? (tb && tb.left < W - w ? tb.bottom + 8 : Math.max(8, SAFE.t)) : H - h - 12;
    lootView.box = { x, y, w, h };
    ctx.save(); ctx.globalAlpha = lootView.alpha * (big ? 1 : 0.94);
    ctx.fillStyle = 'rgba(0,0,0,.3)'; rrectAt(x - 2, y - 2, w + 4, h + 4, 10); ctx.fill();
    ctx.save(); rrectAt(x, y, w, h, 8); ctx.clip();
    drawViewport({ x, y, w, h }, lootView, dt);
    ctx.restore();
    ctx.strokeStyle = '#ffb627'; ctx.lineWidth = 1.5; rrectAt(x, y, w, h, 8); ctx.stroke();
    ctx.restore();
  }
  function rrectAt(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }

  /* ---------------- kati patang: kites cut on other rooftops drifting across the festival ----------------
   * On a real Basant the sky over your roof is never empty of loot: kites cut somewhere upwind come drifting over,
   * slowly losing height, trailing a long tail of dor. Wrap one with your line (lapetna) and it flies down to you. */
  function refillKati() {   // keep a few loot kites ready, their pictures warmed long before they drift into view
    if (!G) return; const pics = CAT.filter(e => (e.src || e.recipe) && !e.mine && ['patang', 'tukkal', 'pipa'].includes(e.arche)); if (!pics.length) return;
    G.katiPool = G.katiPool || []; while (G.katiPool.length < 4) { const e = pick(pics); G.katiPool.push(e); warmKite(e); }
  }
  function spawnKati() {
    const v = G.viewers[0], K = v && v.kite && !v.kite.free ? v.kite.p : [35, 0, 28];
    const pics = CAT.filter(e => (e.src || e.recipe) && !e.mine && ['patang', 'tukkal', 'pipa'].includes(e.arche)); if (!pics.length) return;
    const entry = (G.katiPool && G.katiPool.length ? G.katiPool.shift() : null) || pick(pics); refillKati();   // already decoded and scaled (warmKite)
    const w = G.wind.at([K[0], K[1], 30], G.t), wh = Math.hypot(w[0], w[1]) || 1;
    const T = 16 + Math.random() * 14, fall = 0.7 + Math.random() * 0.25, drift = 0.4 * wh * T;
    // start upwind of your kite, high, so it drifts over your roof and across your line (or just past it)
    const p0 = [K[0] - w[0] / wh * drift, K[1] - w[1] / wh * drift + (Math.random() - 0.5) * 24, clamp(K[2] + fall * T + (Math.random() * 10 - 3), 22, 95)];
    const th = THREADS[pick(Object.keys(THREADS))];
    const k = new P.Kite(specFor(entry), th, [p0[0], p0[1], 0], { lineLen: 5, p: p0 });
    k.entry = entry; k.owner = null; k.ambient = true; k.fallRate = fall; k.noCartwheel = true;
    k.releaseLine('cut'); k.cutT = 5; k.spinVel = (Math.random() < 0.5 ? -1 : 1) * (1 + Math.random() * 2);
    k.v = [w[0] * 0.4, w[1] * 0.4, -fall];
    const tail = Array.from({ length: 23 }, (_, i) => [p0[0] - w[0] / wh * i * 0.25, p0[1] - w[1] / wh * i * 0.25, p0[2] - i * 0.85]);
    k.trail = new Rope(tail, 26 + Math.random() * 14);
    k.inDrifters = true; k.age = 0; G.drifters.push(k);
    if (Math.random() < 0.6) note('Kati patang aa rahi hai — lapet lo!');
  }
  function stepKatiSky() {
    if ((G.mode !== 'festival' && !G.online) || G.tut) return;
    G.katiT = (G.katiT ?? 8) - DT;
    if (G.katiT <= 0) {
      G.katiT = 12 + Math.random() * 14;
      if (G.drifters.filter(d => d.ambient && !d.landed).length < 3) spawnKati();
    }
  }

  /* ---------------- life in the sky: wind shifts, pigeon flocks, fireworks ---------------- */
  function initWorldLife() {
    G.windEv = { next: 35 + Math.random() * 30, from: G.wind.dir, to: G.wind.dir, sFrom: G.wind.speed, sTo: G.wind.speed, t: 1, base: G.wind.speed };
    G.birds = []; G.fireworks = []; G.fwNext = 3; G.lanterns = [];
    if (G.sc.nightDrawn || G.sc.night) for (let i = 0; i < 16; i++) G.lanterns.push(newLantern(true));   // Basant night: sky lanterns rising over the city
    if (!G.sc.night && !G.sc.nightDrawn) for (let f = 0; f < 2; f++) {   // kabootar: rooftop pigeon flocks wheeling over the houses
      const c = [20 + Math.random() * 60, (Math.random() - 0.5) * 120], n = 9 + Math.floor(Math.random() * 7);
      G.birds.push({ c, z: 22 + Math.random() * 20, r: 18 + Math.random() * 22, w: (Math.random() < 0.5 ? -1 : 1) * (0.25 + Math.random() * 0.15), a: Math.random() * 6.28,
        b: Array.from({ length: n }, () => [Math.random() * 6 - 3, Math.random() * 6 - 3, Math.random() * 3, Math.random() * 6.28]) });
    }
  }
  // a fanoos (paper sky lantern): let go from a far roof, it rises slowly, drifts with the wind and flickers
  function newLantern(anyHeight) {
    const a = (Math.random() - 0.5) * 2.2, r = 90 + Math.random() * 220;
    return { p: [Math.cos(a) * r + 40, Math.sin(a) * r, anyHeight ? 4 + Math.random() * 110 : 2 + Math.random() * 6], up: 0.55 + Math.random() * 0.6, ph: Math.random() * 6.28, hue: Math.random() < 0.8 ? 32 : Math.random() < 0.5 ? 350 : 50 };
  }
  function stepWorldLife() {
    if (!G.windEv) initWorldLife();
    const E = G.windEv;
    // the wind shifts now and then - "hawa badal gayi!" - turning a little and gaining or losing strength over ~8 s
    if (!G.online) E.next -= DT;
    if (E.next <= 0) {
      E.next = 45 + Math.random() * 45; E.from = G.wind.dir; E.sFrom = G.wind.speed; E.t = 0;
      E.to = clamp(E.from + (Math.random() - 0.5) * 0.7, -0.45, 0.45); E.sTo = clamp(E.base * (0.75 + Math.random() * 0.55), 3, 10);
      const stronger = E.sTo > E.sFrom + 0.4, weaker = E.sTo < E.sFrom - 0.4;
      note(stronger ? 'Hawa tez ho rahi hai — the wind is picking up!' : weaker ? 'Hawa thandi pad rahi hai — the wind is dropping.' : 'Hawa badal gayi — the wind is turning!');
      for (const v of G.viewers) banner(v, stronger ? 'HAWA TEZ!' : weaker ? 'HAWA KAM' : 'HAWA BADLI!', '#7bdff2', 1.4);
    }
    if (E.t < 1) { E.t = Math.min(1, E.t + DT / 8); const f = E.t * E.t * (3 - 2 * E.t); G.wind.dir = E.from + (E.to - E.from) * f; G.wind.speed = E.sFrom + (E.sTo - E.sFrom) * f; }
    for (const F of G.birds) { F.a += F.w * DT; for (const b of F.b) b[3] += DT * (9 + b[2]); }
    if (G.lanterns) for (let i = 0; i < G.lanterns.length; i++) { const L = G.lanterns[i], w = G.wind.at(L.p, G.t); L.p[0] += w[0] * 0.25 * DT; L.p[1] += w[1] * 0.25 * DT; L.p[2] += L.up * DT; if (L.p[2] > 170) G.lanterns[i] = newLantern(false); }
    // fireworks over the city on Basant night
    if (G.sc.nightDrawn) { G.fwNext -= DT; if (G.fwNext <= 0) { G.fwNext = 2 + Math.random() * 4; burst(); } }
    for (const q of G.fireworks) { q.v[2] -= 4 * DT; for (let a = 0; a < 3; a++) { q.v[a] *= 1 - 0.6 * DT; q.p[a] += q.v[a] * DT; } q.t -= DT; }
    G.fireworks = G.fireworks.filter(q => q.t > 0);
  }
  function burst() {
    const v = G.viewers[0], yaw = (v && v.cam ? v.cam.yaw : 0) + (Math.random() - 0.5) * 1.6, R = 220 + Math.random() * 120;
    const c = [Math.cos(yaw) * R, Math.sin(yaw) * R, 60 + Math.random() * 60], cols = ['#ffd166', '#ff5d73', '#7bdff2', '#c0ff7a', '#ff9ff3', '#ffffff'], col = cols[Math.floor(Math.random() * cols.length)];
    for (let i = 0; i < 46; i++) { const a = Math.random() * 6.28, e = Math.acos(Math.random() * 2 - 1), sp = 14 + Math.random() * 10;
      G.fireworks.push({ p: c.slice(), v: [Math.sin(e) * Math.cos(a) * sp, Math.sin(e) * Math.sin(a) * sp, Math.cos(e) * sp], t: 1.4 + Math.random() * 0.8, c: col }); }
    if (SFX.tone && Math.random() < 0.7) setTimeout(() => SFX.tone(90 + Math.random() * 40, 0.4, 'triangle', 0.05, 40), 300 + R * 2);
  }
  function drawLanterns(cam) {
    if (!G.lanterns || !G.lanterns.length) return;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const L of G.lanterns) {
      const q = project(cam, L.p); if (!q) continue;
      const s = clamp(cam.fl / q.d * 0.55, 1.2, 9), fl = 0.75 + 0.25 * Math.sin(G.t * 9 + L.ph) * Math.sin(G.t * 3.7 + L.ph * 2), fade = clamp((170 - L.p[2]) / 40, 0, 1);
      if (!QUAL.low) { const g = ctx.createRadialGradient(q.x, q.y, 0, q.x, q.y, s * 4); g.addColorStop(0, `hsla(${L.hue},100%,70%,${0.55 * fl * fade})`); g.addColorStop(1, `hsla(${L.hue},100%,50%,0)`);
      ctx.fillStyle = g; ctx.fillRect(q.x - s * 4, q.y - s * 4, s * 8, s * 8); }
      ctx.fillStyle = `hsla(${L.hue + 10},100%,${72 + 10 * fl}%,${fade})`; ctx.beginPath(); ctx.moveTo(q.x - s * 0.55, q.y - s * 0.7); ctx.lineTo(q.x + s * 0.55, q.y - s * 0.7); ctx.lineTo(q.x + s * 0.4, q.y + s * 0.7); ctx.lineTo(q.x - s * 0.4, q.y + s * 0.7); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }
  function drawWorldLife(cam) {
    drawLanterns(cam);
    for (const F of G.birds || []) {
      const cx = F.c[0] + Math.cos(F.a) * F.r, cy = F.c[1] + Math.sin(F.a) * F.r;
      for (const b of F.b) {
        const q = project(cam, [cx + b[0], cy + b[1], F.z + b[2] + Math.sin(b[3] * 0.2) * 0.6]); if (!q) continue;
        const s = clamp(cam.fl / q.d * 0.35, 1.2, 7), fl = Math.sin(b[3]) * s * 0.7;
        ctx.strokeStyle = 'rgba(70,70,80,.85)'; ctx.lineWidth = Math.max(1, s * 0.3); ctx.beginPath(); ctx.moveTo(q.x - s, q.y - fl); ctx.quadraticCurveTo(q.x - s * 0.4, q.y - fl * 0.2, q.x, q.y); ctx.quadraticCurveTo(q.x + s * 0.4, q.y - fl * 0.2, q.x + s, q.y - fl); ctx.stroke();
      }
    }
    for (const f of G.fireworks || []) { const q = project(cam, f.p); if (!q) continue; ctx.globalAlpha = clamp(f.t / 1.2, 0, 1); ctx.fillStyle = f.c; ctx.fillRect(q.x - 1.2, q.y - 1.2, 2.4, 2.4); }
    ctx.globalAlpha = 1;
  }
  function drawWindGauge(w, viewer) {   // top centre, under the timer: which way and how hard the wind blows, as you see it
    if (!G.wind) return;
    const cam = viewer.lastCam; if (!cam) return;
    const rel = G.wind.dir - cam.yaw, sp = G.wind.speed, x = w / 2, y = 78, txt = `Hawa ${sp.toFixed(1)} m/s`;
    ctx.save(); ctx.font = '600 12px Inter,system-ui,sans-serif';
    const tw = ctx.measureText(txt).width, pw = tw + 48, x0 = x - pw / 2;   // the pill fits its text
    ctx.fillStyle = 'rgba(12,18,32,.6)'; rrect(x0, y - 15, pw, 30, 15); ctx.fill();
    ctx.fillStyle = '#e6ebf5'; ctx.textAlign = 'left'; ctx.fillText(txt, x0 + 36, y + 4);
    ctx.translate(x0 + 20, y); ctx.rotate(-rel); ctx.fillStyle = '#7bdff2';
    ctx.beginPath(); ctx.moveTo(0, -9); ctx.lineTo(6, 4); ctx.lineTo(0, 1); ctx.lineTo(-6, 4); ctx.closePath(); ctx.fill(); ctx.restore();
  }

  /* ---------------- trophies & career stats ----------------
   * Served from a game server (http/https): the SERVER keeps your record and decides trophies. During a match only the
   * match's own numbers are collected (G.rec); at the end they go to the server with a match token it handed out at the
   * start, and it checks them (real time elapsed, cuts per minute, ...) before anything counts. Results that couldn't
   * have happened are refused, and stats edited in this browser are ignored.
   * Opened straight from a file there is no server, so the record is kept on this device as before. */
  const TROPHIES = KiteTrophies.TROPHIES;
  // the phone app (app/, built with --app) carries the whole game and plays OFFLINE: no server, no online rooms yet -
  // coins, kites and records are kept on the phone. (Its page loads from https://localhost, which looked like a server.)
  const APP = !!(window.PW_APP), NATIVE = window.Capacitor || null;
  const NET = { online: !APP && /^https?:$/.test(location.protocol), ready: false };
  async function api(path, body) {
    const r = await fetch(path, body ? { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-KF': '1' }, body: JSON.stringify(body) } : { credentials: 'same-origin' });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw Object.assign(new Error(j.error || 'HTTP ' + r.status), { status: r.status });
    return j;
  }
  function useProfile(pr) {   // the server's record replaces whatever this browser had cached
    if (!pr || !pr.stats) return;
    saved.stats = { ...KiteTrophies.blankStats(), ...pr.stats }; saved.trophies = (pr.trophies || []).slice();
    if (pr.econ) saved.econNet = { ...pr.econ, _at: Date.now() };
    if (pr.name && !saved.netName) saved.netName = pr.name;
    save(); renderRank(); if (typeof renderWallet === 'function') renderWallet();
  }
  function announce(ids) {
    for (const id of ids || []) { const t = TROPHIES.find(x => x.id === id); if (t) { toast(`&#127942; <b>${esc(t.name)}</b> &mdash; ${esc(t.note)}`); SFX.collected(); } }
  }
  /* v6.3: ONE failed profile call (server restarting, a Wi-Fi blip, too many requests) used to switch the whole session to
   * this browser's own empty wallet - 300 coins, nothing bought - which looked exactly like "all my kites are gone". Now
   * the last known record stays on screen and the call is retried; only a page hosted WITHOUT the game server (the API
   * answers 404) plays from this device. */
  function loadProfile(tries = 0) {
    api('/api/profile').then(r => { NET.ready = true; NET.account = r.account || null; useProfile(r.profile); autoRestore(r);
        if (!loadProfile.offered && $('#splash').classList.contains('hidden')) { loadProfile.offered = true; setTimeout(() => { if (!G && loginNow().can && !$('#menu').classList.contains('hidden') && saved.tutDone) openLogin('login'); }, 400); } })
      .catch(e => {
        if (e.status === 404 || e.status === 405) { NET.online = false; if (typeof renderWallet === 'function') renderWallet(); return; }
        clearTimeout(loadProfile.t); loadProfile.t = setTimeout(() => loadProfile(tries + 1), Math.min(20000, 1000 * 2 ** Math.min(tries, 5)));
      });
  }
  // a browser whose cookie was cleared gets a brand-new empty record from the server; if this browser still remembers
  // the player's backup code, bring their real record back by itself
  function autoRestore(r) {
    const code = r.account && r.account.code, pr = r.profile, mine = saved.acct;
    const fresh = pr && pr.stats && !(pr.stats.matches | 0) && pr.econ && !(pr.econ.owned || []).length && pr.econ.coins === EC.START_COINS;
    if (mine && code && mine !== code && fresh) {
      api('/api/restore', { code: mine }).then(x => { NET.account = x.account; saved.acct = x.account.code; useProfile(x.profile); toast('Welcome back - your coins and kites are here.'); })
        .catch(() => { saved.acct = code; save(); });
    } else if (code && code !== mine) { saved.acct = code; save(); }
  }
  if (NET.online) loadProfile();
  function stat(fn) {
    if (G && G.online) return;   // online matches: the server writes your record from its own numbers
    if (G && G.rec) fn(G.rec);   // the match's own numbers (sent to the server, or paid out here offline)
    if (NET.online) return;      // online: the server keeps the record
    const s = saved.stats = Object.assign(KiteTrophies.blankStats(), saved.stats || {});
    const before = new Set(saved.trophies || []); fn(s);
    for (const t of TROPHIES) if (!before.has(t.id) && t.test(s)) { before.add(t.id); announce([t.id]); }
    saved.trophies = [...before]; save(); renderRank();
  }
  function madeKite() {
    if (NET.online) api('/api/event', { type: 'made' }).then(r => { useProfile(r.profile); announce(r.newTrophies); }).catch(() => {});
    else stat(st => { st.made++; });
  }
  // ---- per-match token and record ----
  function netStart(mode, cfg) {
    G.rec = { ...KiteTrophies.blankStats(), cutTimes: [] }; G.token = null; G.sent = false;
    if (!NET.online || cfg.tutorial) return;
    const g = G;
    api('/api/match/start', { mode, bots: cfg.bots | 0, diff: cfg.diff, mtime: String(cfg.mtime), scene: cfg.scene, kite: cfg.k1, ...(mode === 'mohalla' ? { teams: cfg.teamSize, career: cfg.career ?? -1 } : {}) })
      .then(r => { g.token = r.token; }).catch(() => {});
  }
  function netEnd(abandoned) {
    if (!G || !NET.online || !G.token || G.sent || G.cfg.tutorial) return;
    G.sent = true;
    const humans = G.viewers, me = humans[0];
    const r = G.rec, body = { token: G.token, abandoned: !!abandoned, t: +G.t.toFixed(2), place: placeOf(me), players: G.players.length,
      rec: { cuts: r.cuts, lost: r.lost, caught: r.caught, bestStreak: r.bestStreak, dheelCuts: r.dheelCuts, khainchCuts: r.khainchCuts, cutTimes: r.cutTimes.map(x => +x.toFixed(2)) },
      lootIds: (r.lootIds || []).slice(0, r.caught) };
    if (G.teams) body.place = G.teamWon ? 1 : 2;   // Mohalla: the team's result is yours
    api('/api/match/end', body).then(res => { useProfile(res.profile); announce(res.newTrophies); if (!abandoned) showPaid(res.paid); })
      .catch(e => { if (e.status === 422) note('This match could not be recorded.'); });
  }

  /* ---------------- rank: XP from the career record, Naya -> Khalifa ----------------
   * Worked out from the same stats the trophies use (kept by the server when there is one), so it can't drift
   * from the record and needs nothing new stored. */
  const RANKS = [['Naya', 0], ['Shagird', 400], ['Patangbaaz', 1200], ['Pecha Baaz', 2600], ['Ustad', 4800], ['Khalifa', 8000]];
  const XP = { cut: 30, caught: 20, win: 120, match: 15, streak: 10 };
  const xpOf = s => (s.cuts | 0) * XP.cut + (s.caught | 0) * XP.caught + (s.wins | 0) * XP.win + (s.matches | 0) * XP.match + (s.bestStreak | 0) * XP.streak;
  function rankOf(xp) {
    let i = 0; while (i + 1 < RANKS.length && xp >= RANKS[i + 1][1]) i++;
    const to = RANKS[i + 1] ? RANKS[i + 1][1] : null;
    return { name: RANKS[i][0], xp, f: to ? (xp - RANKS[i][1]) / (to - RANKS[i][1]) : 1, need: to ? to - xp : 0, next: RANKS[i + 1] ? RANKS[i + 1][0] : null };
  }
  const rankHTML = (r, extra = '') => `<div class="rk-top"><b>${r.name}</b><span>${extra}${r.xp.toLocaleString()} XP</span></div><div class="rk-bar"><i style="width:${(clamp(r.f, 0, 1) * 100).toFixed(1)}%"></i></div><small>${r.next ? `${r.need.toLocaleString()} XP to ${r.next}` : 'Highest rank'}</small>`;
  function renderRank() {
    const el = $('#rankCard'); if (!el) return;
    const r = rankOf(xpOf(saved.stats || {})), lvl = RANKS.findIndex(x => x[0] === r.name) + 1, to = r.next ? RANKS[lvl][1] : r.xp;
    el.innerHTML = `<span class="rk-badge"><b>${lvl}</b></span><span class="rk-body"><b>${esc(r.name)}</b><span class="rk-bar"><i style="width:${(clamp(r.f, 0, 1) * 100).toFixed(1)}%"></i><em>${r.next ? `${r.xp.toLocaleString()} / ${to.toLocaleString()}` : 'Max rank'}</em></span></span>`;
    el.title = r.next ? `${r.need.toLocaleString()} XP to ${r.next}` : 'Highest rank';
  }
  function showMatchXp(gain) {   // results screen: what this match earned, on top of the record
    const el = $('#resXp'); if (!el) return;
    if (!(gain > 0)) { el.innerHTML = ''; return; }
    el.innerHTML = rankHTML(rankOf(xpOf(saved.stats || {}) + (NET.online ? gain : 0)), `+${gain} XP · `);
  }
  function toast(html) {
    const box = $('#toasts'); if (!box) return; const el = document.createElement('div'); el.className = 'toast'; el.innerHTML = html; box.appendChild(el);
    setTimeout(() => el.classList.add('out'), 3800); setTimeout(() => el.remove(), 4400);
  }
  function openTrophies() {
    if (NET.online && !openTrophies.busy) { openTrophies.busy = true; api('/api/profile').then(r => useProfile(r.profile)).catch(() => {}).finally(() => { openTrophies.busy = false; if (!$('#trophies').classList.contains('hidden')) drawTrophies(); }); }
    drawTrophies(); $('#trophies').classList.remove('hidden');
  }
  function drawTrophies() {
    const s = Object.assign(KiteTrophies.blankStats(), saved.stats || {}), have = new Set(saved.trophies || []);
    for (const k in s) s[k] = Math.max(0, Math.floor(+s[k] || 0));   // numbers only, whatever is in storage
    $('#trophyStats').innerHTML = [['Kites cut', s.cuts], ['Kites lost', s.lost], ['Kites brought home', s.caught], ['Matches', s.matches], ['Wins', s.wins], ['Best streak', s.bestStreak]].map(([l, v]) => `<div><b>${v}</b><span>${l}</span></div>`).join('');
    $('#trophyList').innerHTML = TROPHIES.map(t => `<div class="trophy ${have.has(t.id) ? 'got' : ''}"><i>${have.has(t.id) ? '&#127942;' : '&#128274;'}</i><div><b>${t.name}</b><span>${t.note}</span></div></div>`).join('');
  }

  /* ---------------- economy: coins, shop, daily challenge, collection, leaderboard ----------------
   * The numbers live on the server when the game is served online (src/economy.js runs there on results it has already
   * checked, so a browser can never give itself coins); opened from a file, the same rules run here on this device. */
  const EC = KiteEconomy;
  function econ() {
    if (NET.online) return saved.econNet || { ...EC.view(EC.blankEcon()), coins: 0, loading: true };
    if (!saved.econLocal || typeof saved.econLocal !== 'object' || !Array.isArray(saved.econLocal.owned)) { saved.econLocal = EC.cleanEcon(saved.econLocal || null, saved.stats); save(); }
    return saved.econLocal;
  }
  const dailyNow = () => NET.online ? econ().daily : EC.dailyView(econ());
  const madeKiteId = id => /^(my:|mk:|net:)/.test(id || '') || !!(catById(id) || {}).mine;
  const owned = (kind, id) => (kind === 'kite' && madeKiteId(id)) || EC.owns(econ(), kind, id);
  const priceTag = p => `<i class="coin" aria-hidden="true"></i>${p.toLocaleString()}`;
  const fmtLeft = ms => { const h = Math.max(0, Math.floor(ms / 3600e3)), d = Math.floor(h / 24); return d ? `${d}d ${h % 24}h` : h ? `${h}h ${Math.floor(ms / 60e3) % 60}m` : `${Math.max(1, Math.floor(ms / 60e3))}m`; };
  function renderWallet() {
    const e = econ(), c = e.loading ? '…' : e.coins.toLocaleString();
    if ($('#coinCount')) $('#coinCount').textContent = c;
    $$('.coinNow').forEach(el => { el.textContent = c; });
    const d = dailyNow(), el = $('#dailyCard'); if (!el || !d) return;
    el.classList.toggle('done', !!d.done);
    el.innerHTML = `<span class="dl-txt"><b>Today:</b> ${esc(d.text)}</span><span class="dl-bar"><i style="width:${Math.round(100 * Math.min(1, d.prog / d.goal))}%"></i><em>${d.done ? 'Done &check;' : `${d.prog} / ${d.goal}`}</em></span><span class="dl-rw">${priceTag(d.reward)}</span>`;
    el.title = d.done ? 'Done - a new challenge comes in ' + fmtLeft(d.endsIn) : 'New challenge in ' + fmtLeft(d.endsIn);
    if (typeof renderBadges === 'function') renderBadges();
  }
  const dorSwatchSVG = c => `<svg viewBox="0 0 38 38"><circle cx="19" cy="19" r="15" fill="${c}"/><path d="M6 15 C14 11 24 25 32 21 M7 22 C15 18 23 31 31 27 M9 9 C16 6 25 16 31 13" stroke="rgba(0,0,0,.28)" stroke-width="1.6" fill="none"/></svg>`;
  function paintFliers(root) {   // drawn fliers into their thumbnails, facing us
    $$('canvas[data-flier]').forEach(cv => {
      if (root && !root.contains(cv)) return;
      const c = charById(cv.dataset.flier), g2 = cv.getContext && cv.getContext('2d'); if (!g2 || !c.drawn) return;
      g2.clearRect(0, 0, cv.width, cv.height); Fliers.draw(g2, 23, 78, 74, c.drawn, { face: Math.PI * 0.9, aim: [0.4, -1], t: 0.6, mode: 'idle', lineColor: '#999' });
    });
  }
  /** what an item is, for the shop and the buy box */
  function itemInfo(kind, id) {
    if (kind === 'kite') { const e = catById(id); return { name: e.name, vis: kiteVis(e, true), what: archInfo(e.arche).name + ' kite' }; }
    if (kind === 'thread') { const t = THREADS[id] || THREADS.manjha; return { name: t.name, vis: `<div class="sp">${dorSwatchSVG(t.color)}</div>`, what: 'String · cut ' + t.stats.cut + '/5 · strength ' + t.stats.strength + '/5', note: t.note }; }
    if (kind === 'spool') { const sp = SPOOLS.find(x => x.id === id) || SPOOLS[0]; return { name: sp.name.split(' · ')[1] || sp.name, vis: `<div class="sp"><img src="${spoolSrc(sp, (THREADS[saved.t1] || THREADS.manjha).color)}" alt=""></div>`, what: sp.kind === 'pinna' ? 'Pinna (looks only)' : 'Charkhi (looks only)' }; }
    const c = charById(id); return { name: c.name, vis: charThumb(c), what: 'Flier (looks only)' };
  }
  async function buyItem(kind, id) {
    if (NET.online) {
      try { const r = await api('/api/buy', { kind, id }); useProfile(r.profile); SFX.collected(); return true; }
      catch (e) { toast(esc(e.message === 'not enough coins' ? 'Not enough coins yet.' : e.message)); api('/api/profile').then(r => useProfile(r.profile)).catch(() => {}); return false; }
    }
    const r = EC.buy(econ(), kind, id);
    if (!r.ok) { toast(esc(r.error)); return false; }
    save(); renderWallet(); SFX.collected(); return true;
  }
  /** the buy box: what it is, what it costs, what you'll have left. onDone runs after a purchase */
  function openBuy(kind, id, onDone) {
    const info = itemInfo(kind, id), price = EC.priceOf(kind, id), have = econ().coins, can = have >= price, rar = EC.rarityOf(price);
    $('#buyBody').innerHTML = `<div class="buy-vis">${info.vis}</div><div class="buy-txt"><span class="rar r-${rar.toLowerCase()}">${rar}</span><h3>${esc(info.name)}</h3><p class="muted">${esc(info.what)}</p>${info.note ? `<p class="small">${esc(info.note)}</p>` : ''}
      <div class="buy-price">${priceTag(price)}</div><p class="small ${can ? 'muted' : 'bad'}">${can ? `You have ${have.toLocaleString()} coins &middot; ${(have - price).toLocaleString()} left after buying` : `You have ${have.toLocaleString()} coins &mdash; ${(price - have).toLocaleString()} more needed. Win matches, bring kites home and finish the daily challenge to earn them.`}</p></div>`;
    hydrate($('#buyBody')); paintFliers($('#buyBody'));
    const yes = $('#buyYes'); yes.disabled = !can; yes.textContent = can ? 'Buy' : 'Not enough coins';
    yes.onclick = async () => { yes.disabled = true; if (await buyItem(kind, id)) { $('#buyPop').classList.add('hidden'); toast(`<b>${esc(info.name)}</b> is yours.`); onDone && onDone(); } else yes.disabled = false; };
    $('#buyNo').onclick = () => $('#buyPop').classList.add('hidden');
    $('#buyPop').classList.remove('hidden');
  }
  /** before flying: anything the player picked but doesn't own goes back to the free starter kit */
  function ensureLoadout(two) {
    if (econ().loading) return;   // the record hasn't arrived yet: never swap a bought kite out just because we can't see it yet
    const fix = [];
    for (const n of two ? ['1', '2'] : ['1']) {
      if (!owned('kite', saved['k' + n])) { saved['k' + n] = DEF_K[n === '1' ? 0 : 1]; fix.push('kite'); }
      if (!owned('thread', saved['t' + n])) { saved['t' + n] = 'manjha'; fix.push('string'); }
      if (!owned('spool', saved['sp' + n])) { saved['sp' + n] = 'charkhi:sheesham'; fix.push('reel'); }
      if (saved['c' + n] !== 'myflier' && !owned('char', saved['c' + n])) { saved['c' + n] = n === '1' ? 'd:ali' : 'd:zara'; fix.push('flier'); }
    }
    if (fix.length) { save(); toast(`Your ${[...new Set(fix)].join(', ')} ${fix.length > 1 ? 'were' : 'was'} swapped for a free one - buy it in the Shop to fly it.`); }
  }
  /* ---- the shop ---- */
  const shopState = { kind: 'kite', filter: 'all' };
  function shopItems(kind) {
    if (kind === 'kite') return CAT.filter(e => !e.mine).map(e => e.id);
    if (kind === 'thread') return Object.keys(THREADS);
    if (kind === 'spool') return SPOOLS.map(s => s.id);
    return CHARACTERS.map(c => c.id);
  }
  function openShop(kind) { if (kind) shopState.kind = kind; renderShop(); $('#shop').classList.remove('hidden'); if (NET.online) api('/api/profile').then(r => { useProfile(r.profile); if (!$('#shop').classList.contains('hidden')) renderShop(); }).catch(() => {}); }
  function renderShop() {
    const k = shopState.kind;
    $$('#shopTabs button').forEach(b => { b.classList.toggle('on', b.dataset.k === k); b.onclick = () => { shopState.kind = b.dataset.k; renderShop(); }; });
    if (k === 'crate') return renderCrates();
    const ids = shopItems(k), mine = ids.filter(id => owned(k, id)).length;
    const F = [['all', 'All ' + ids.length], ['buy', 'To buy ' + (ids.length - mine)], ['own', 'Yours ' + mine]];
    $('#shopFilter').innerHTML = F.map(([id, l]) => `<button data-f="${id}" class="${shopState.filter === id ? 'on' : ''}">${l}</button>`).join('');
    $$('#shopFilter button').forEach(b => b.onclick = () => { shopState.filter = b.dataset.f; renderShop(); });
    const shown = ids.filter(id => shopState.filter === 'all' || (shopState.filter === 'own') === owned(k, id));
    // dearest first among what's for sale, so the special ones are easy to find
    shown.sort((a, b) => (owned(k, a) - owned(k, b)) || (EC.priceOf(k, b) - EC.priceOf(k, a)));
    $('#shopGrid').className = 'grid shop-grid' + (k === 'kite' ? '' : ' shop-' + k);
    $('#shopGrid').innerHTML = shown.map(id => { const i = itemInfo(k, id), p = EC.priceOf(k, id), own = owned(k, id), rar = EC.rarityOf(p).toLowerCase();
      return `<div class="it shop-it ${own ? 'own' : 'r-' + rar}" data-id="${esc(id)}" title="${esc(i.name)}">${i.vis}<span>${esc(i.name)}</span><em class="price">${own ? (p ? '&check; Yours' : 'Free') : priceTag(p)}</em></div>`; }).join('') || '<p class="muted">Nothing here yet.</p>';
    hydrate($('#shopGrid')); paintFliers($('#shopGrid'));
    $$('#shopGrid .shop-it').forEach(el => el.onclick = () => { const id = el.dataset.id; if (owned(k, id)) { toast(`<b>${esc(itemInfo(k, id).name)}</b> is already yours - pick it when you choose your kite and gear.`); return; } openBuy(k, id, renderShop); });
    renderWallet();
  }
  /* ---- crates: a random kite you don't own yet (the server rolls it when there is one) ---- */
  const kitePool = () => CAT.filter(e => e.src && /^png:/.test(e.id)).map(e => e.id);
  const crateArt = (id, cls = '') => `<div class="crate-art crate-${id} ${cls}" aria-hidden="true"><i></i><b></b></div>`;
  function renderCrates() {
    $('#shopFilter').innerHTML = '';
    const have = econ().coins;
    $('#shopGrid').className = 'grid shop-grid shop-crates';
    $('#shopGrid').innerHTML = Object.entries(EC.CRATES).map(([id, c]) => {
      const left = kitePool().filter(x => EC.kitePrice(x) >= c.min && !owned('kite', x)).length;
      return `<div class="crate-card crate-c-${id}">${crateArt(id)}<b>${esc(c.name)}</b><small>${esc(c.note)}</small><small class="muted">${left ? `${left} kites you don't have` : 'You have them all'}</small>
        <button class="cta sm" data-crate="${id}" ${left && have >= c.price ? '' : 'disabled'}>${priceTag(c.price)} Open</button></div>`; }).join('');
    $$('#shopGrid [data-crate]').forEach(b => b.onclick = async () => {
      b.disabled = true;
      const r = await claimReward('crate', b.dataset.crate);
      if (r) showReward(r); renderShop();
    });
    renderWallet();
  }
  /** claim a prize: 'login', 'gift', or open crate `id`. Returns the reward (or null after telling the player why not) */
  async function claimReward(what, id) {
    if (NET.online) {
      try { const r = await api(what === 'crate' ? '/api/crate' : '/api/claim', what === 'crate' ? { crate: id } : { what }); useProfile(r.profile); return r.reward; }
      catch (e) { toast(esc(e.message === 'not enough coins' ? 'Not enough coins yet.' : e.message)); api('/api/profile').then(r => useProfile(r.profile)).catch(() => {}); return null; }
    }
    const e = econ(), r = what === 'crate' ? EC.openCrate(e, id, kitePool(), Math.random()) : what === 'login' ? EC.claimLogin(e, kitePool(), Math.random()) : EC.claimGift(e);
    if (!r.ok) { toast(esc(r.error)); return null; }
    save(); renderWallet(); return r.reward;
  }
  /** the full-screen "You received" moment */
  function showReward(rw) {
    const el = $('#rewardItem'); SFX.collected(); buzz([20, 40, 30]);
    if (rw.kite) { const e = catById(rw.kite), price = EC.kitePrice(rw.kite), rar = EC.rarityOf(price);
      el.innerHTML = `<div class="rw-kite">${kiteVis(e)}</div><b>${esc(e.name)}</b><span class="rar r-${rar.toLowerCase()}">${rar}</span><small>${esc(archInfo(e.arche).name)} kite &middot; yours to fly now</small>`; hydrate(el); }
    else el.innerHTML = `<div class="rw-coins"><i class="coin"></i></div><b>+${rw.coins.toLocaleString()}</b><small>${rw.dup ? 'You already have every kite the crate holds, so it paid in coins' : 'coins'}</small>`;
    const pop = $('#rewardPop'); pop.classList.remove('hidden', 'go'); void pop.offsetWidth; pop.classList.add('go');
    pop.style.pointerEvents = 'none'; setTimeout(() => { pop.style.pointerEvents = ''; }, 600);   // a double tap mustn't skip it unseen
    pop.onclick = () => { pop.classList.add('hidden'); renderLogin(); renderBadges(); };
  }
  /* ---- daily login (7 days, day 7 is a crate) and the free gift every 4 hours ---- */
  function loginNow() {
    const e = econ();
    if (!NET.online) return EC.loginView(e);
    const L = e.login || { n: 0, idx: 0, can: false, nextIn: 0 }, at = e._at || Date.now();
    const can = L.can || EC.dayOf() !== EC.dayOf(at);
    return { ...L, can, idx: (L.n | 0) % EC.LOGIN.length, nextIn: can ? 0 : Math.max(0, L.nextIn - (Date.now() - at)) };
  }
  function giftNow() {
    const e = econ();
    if (!NET.online) return EC.giftView(e);
    const g = e.gift || { ready: false, nextIn: EC.GIFT.every }, left = Math.max(0, (g.nextIn || 0) - (Date.now() - (e._at || Date.now())));
    return { ready: g.ready || left <= 0, nextIn: left, coins: EC.GIFT.coins };
  }
  let loginTab = 'login';
  function openLogin(tab) { if (G) return; loginTab = tab || (loginNow().can ? 'login' : giftNow().ready ? 'gift' : 'login'); renderLogin(); $('#loginPop').classList.remove('hidden'); }
  function renderLogin() {
    $$('#loginPop [data-lt]').forEach(b => { b.classList.toggle('on', b.dataset.lt === loginTab); b.onclick = () => { loginTab = b.dataset.lt; renderLogin(); }; });
    const L = loginNow(), G2 = giftNow(), body = $('#loginBody'); if (!body) return;
    $('#loginPop [data-lt="login"] .ev-badge').classList.toggle('on', L.can); $('#loginPop [data-lt="gift"] .ev-badge').classList.toggle('on', G2.ready);
    if (loginTab === 'gift') {
      body.innerHTML = `<p class="login-sub">A handful of coins every 4 hours, just for coming up to the roof.</p><div class="gift-box ${G2.ready ? 'ready' : ''}">${crateArt('gift')}<b>${priceTag(G2.coins)}</b>
        ${G2.ready ? '<button class="cta" id="giftClaim">Claim</button>' : `<span class="gift-wait">Next gift in ${fmtLeft(G2.nextIn)}</span>`}</div>`;
      const b = $('#giftClaim'); if (b) b.onclick = async () => { b.disabled = true; const r = await claimReward('gift'); if (r) showReward(r); renderLogin(); renderBadges(); };
      return;
    }
    body.innerHTML = `<p class="login-sub">Come back every day for a new prize. Day 7 is a free Rare Crate.</p><div class="login-grid">${EC.LOGIN.map((p, i) => {
      const now = i === L.idx && L.can, past = i < L.idx;
      return `<button class="ld ${i === 6 ? 'big' : ''} ${past ? 'got' : ''} ${now ? 'now' : ''}" data-ld="${i}" ${now ? '' : 'tabindex="-1"'}><small>Day ${i + 1}</small>${p.crate ? crateArt('rare') : `<span class="ld-coins"><i class="coin"></i></span>`}<b>${p.crate ? 'Rare Crate' : p.coins}</b>${past ? '<span class="ld-tick" aria-label="claimed">&check;</span>' : now ? '<span class="ld-claim">Claim</span>' : i === L.idx ? `<span class="ld-wait">${fmtLeft(L.nextIn)}</span>` : ''}</button>`; }).join('')}</div>`;
    const b = $('#loginBody .ld.now'); if (b) b.onclick = async () => { b.disabled = true; const r = await claimReward('login'); if (r) showReward(r); renderLogin(); renderBadges(); };
  }
  $('#loginClose').onclick = () => $('#loginPop').classList.add('hidden');
  $('#loginBtn').onclick = () => openLogin('login'); $('#giftBtn').onclick = () => openLogin('gift');
  function renderBadges() {
    const L = loginNow(), G2 = giftNow(), d = dailyNow();
    const set = (sel, on, txt = '!') => { const b = $(sel + ' .ev-badge'); if (b) { b.classList.toggle('on', !!on); b.textContent = on ? txt : ''; } };
    set('#loginBtn', L.can); set('#giftBtn', G2.ready);
    const gl = $('#giftBtn span'); if (gl) gl.textContent = G2.ready ? 'Free gift' : fmtLeft(G2.nextIn);
    set('#tutBtn', !saved.tutDone, 'New');
    set('#mohallaBtn', false);
    const sh = $('#hubPlay'); if (sh) sh.classList.toggle('glow', !!(d && !d.done));
  }
  setInterval(() => { if (!$('#menu').classList.contains('hidden')) { renderBadges(); if (!$('#loginPop').classList.contains('hidden')) renderLogin(); } }, 30000);
  $('#shopClose').onclick = () => { $('#shop').classList.add('hidden'); $('#buyPop').classList.add('hidden'); };
  // Esc closes the topmost menu panel
  addEventListener('keydown', e => { if (e.key !== 'Escape' || G) return; for (const id of ['#pickPop', '#buyPop', '#settings', '#shop', '#coll', '#lb', '#trophies', '#how']) if (!$(id).classList.contains('hidden')) { $(id).classList.add('hidden'); return; } });
  $('#shopBtn').onclick = () => openShop(); $('#walletBtn').onclick = () => openShop('crate');
  /* ---- loot collection ---- */
  let collType = 'all';
  function openColl() {
    const coll = econ().coll || {}, all = CAT.filter(e => !e.mine), got = all.filter(e => coll[e.id]);
    $('#collCount').innerHTML = `<b>${got.length}</b> / ${all.length} kites`;
    const types = [['all', 'All'], ['got', 'Caught'], ...KITE_TYPES.filter(t => !['mine', 'all', 'basant'].includes(t.id)).map(t => [t.id, t.label])];
    $('#collTabs').innerHTML = types.map(([id, l]) => `<button data-t="${id}" class="${collType === id ? 'on' : ''}">${l}</button>`).join('');
    $$('#collTabs button').forEach(b => b.onclick = () => { collType = b.dataset.t; openColl(); });
    const inT = e => collType === 'all' || (collType === 'got' ? coll[e.id] : collType === 'flags' ? e.flag : e.arche === collType);
    const list = all.filter(inT).sort((a, b) => (coll[b.id] ? 1 : 0) - (coll[a.id] ? 1 : 0));
    $('#collGrid').innerHTML = list.map(e => coll[e.id] ? `<div class="it got" title="${esc(e.name)}">${kiteVis(e, true)}<span>${esc(e.name)}</span><em class="cnt">&times;${coll[e.id]}</em></div>`
      : `<div class="it miss" title="Not caught yet">${kiteVis(e, true)}<span>?</span></div>`).join('') || '<p class="muted">No kites caught yet - cut a kite down and bring it home on your line.</p>';
    hydrate($('#collGrid'));
    $('#coll').classList.remove('hidden');
  }
  $('#collBtn').onclick = openColl; $('#collClose').onclick = () => $('#coll').classList.add('hidden');
  /* ---- weekly leaderboard ---- */
  let lbKind = 'cuts', lbData = null;
  function renderLb() {
    $$('#lbTabs button').forEach(b => { b.classList.toggle('on', b.dataset.k === lbKind); b.onclick = () => { lbKind = b.dataset.k; renderLb(); }; });
    const el = $('#lbBody');
    if (!NET.online) { el.innerHTML = APP ? '<p class="muted">The weekly leaderboard arrives with online play. Your own record is under Trophies.</p>' : '<p class="muted">The leaderboard needs the game server - open the game from its web address (not from a file) to compete with everyone.</p>'; return; }
    if (!lbData) { el.innerHTML = '<p class="muted">Loading…</p>'; return; }
    if (lbData.error) { el.innerHTML = `<p class="bad">${esc(lbData.error)}</p>`; return; }
    const rows = lbData[lbKind] || [], unit = { cuts: 'cuts', streak: 'in a row', loot: 'kites' }[lbKind], me = lbData.me || {};
    const medal = r => r <= 3 ? `<i class="medal m${r}">${r}</i>` : `<i class="medal">${r}</i>`;
    el.innerHTML = `<p class="muted small">Week ${esc(String(lbData.week).split('-W')[1] || '')} &middot; resets in ${fmtLeft(lbData.endsIn)} &middot; online matches and checked offline matches both count</p>
      <ol class="lb-list">${rows.length ? rows.map(r => `<li class="${r.me ? 'me' : ''}">${medal(r.rank)}<b>${esc(r.name)}</b><span>${r.v} ${unit}</span></li>`).join('') : '<li class="empty">No one yet this week - be the first.</li>'}</ol>
      <div class="lb-me">${me.name ? `<b>You</b> (${esc(me.name)}): ${me[lbKind] || 0} ${unit}${me.rank && me.rank[lbKind] ? ` &middot; rank #${me.rank[lbKind]}` : ''}` : 'Pick an online name (Online &rarr; your name) to appear on the leaderboard.'}</div>`;
  }
  function openLb() {
    lbData = null; renderLb(); $('#lb').classList.remove('hidden');
    if (NET.online) api('/api/leaderboard').then(r => { lbData = r; renderLb(); }).catch(e => { lbData = { error: 'Could not load the leaderboard: ' + e.message }; renderLb(); });
  }
  $('#lbBtn').onclick = openLb; $('#lbClose').onclick = () => $('#lb').classList.add('hidden');
  /** results screen: what this match paid (coins, the daily challenge, a Mohalla beaten) */
  function showPaid(paid) {
    const el = $('#resCoins'); if (!el) return;
    if (!paid) { el.innerHTML = ''; return; }
    el.innerHTML = `<div class="rc-row"><i class="coin"></i><b>+${paid.coins}</b> coins</div>`
      + (paid.daily ? `<div class="rc-row small">${paid.daily.done ? `&#10003; Daily challenge done: ${esc(paid.daily.text)} (+${paid.daily.reward})` : `Daily challenge: ${esc(paid.daily.text)} &mdash; ${paid.daily.prog}/${paid.daily.goal}`}</div>` : '')
      + (paid.career ? `<div class="rc-row small">&#127942; You beat <b>${esc(paid.career.name)}</b> (+${paid.career.reward})${paid.career.next ? ` &middot; next: ${esc(paid.career.next)}` : ' &middot; you rule Basant!'}</div>` : '');
    if (paid.daily && paid.daily.done) toast(`&#10003; <b>Daily challenge done!</b> +${paid.daily.reward} coins`);
    if (paid.career) toast(`&#127942; <b>${esc(paid.career.name)} beaten!</b> +${paid.career.reward} coins`);
    renderWallet();
  }

  /* ---------------- quick chat: a few set phrases (online they go to everyone in the match) ----------------
   * Only these fixed lines can be sent - never free text - so there is nothing to moderate. Online, the server relays
   * the phrase number (at most one every 1.5 s per player). Offline the bots read them too: ask your team for help and a
   * team-mate comes; call a rival out and one takes you on. */
  const PHRASES = ['Nice cut!', 'Come fight me!', 'Watch your string!', 'Help me!', 'On my way!', 'Too slow!', 'Good game!', 'Wow!'];
  function say(p, n, fromNet) {
    if (!G || !p || !PHRASES[n]) return;
    if (!fromNet && p.ctrl.startsWith('human')) { if (G.t - (p.saidT ?? -9) < 1.5) return; p.saidT = G.t; if (G.online && p.ctrl === 'human1') netSend({ t: 'emote', n }); }
    p.bubble = { text: PHRASES[n], t: 3.2 };
    if (real(p) || p.ctrl === 'bot') note(`<b>${esc(p.name)}:</b> ${PHRASES[n]}`);
    if (!G.online && p.ctrl.startsWith('human')) botsHear(p, n);
  }
  function botsHear(p, n) {
    const bots = G.players.filter(b => b.ctrl === 'bot' && b.kite && !b.kite.free), d = b => Math.hypot(b.kite.p[0] - p.kite.p[0], b.kite.p[1] - p.kite.p[1]);
    if (!p.kite || p.kite.free || !bots.length) return;
    if (n === 3 && G.teams) {   // help: the nearest team-mate goes after whoever you're fighting (or the nearest rival)
      const mate = bots.filter(b => !foes(b, p)).sort((a, b) => d(a) - d(b))[0]; if (!mate) return;
      const foe = (busyWith(p.kite) || {}).owner || G.players.filter(o => foes(o, p) && o.kite && !o.kite.free).sort((a, b) => d(a) - d(b))[0];
      if (foe) { mate.ai.target = foe; mate.ai.until = G.t + 12; }
      setTimeout(() => say(mate, 4), 600 + Math.random() * 700);
    } else if (n === 1) {   // a challenge: the nearest rival takes it up
      const rival = bots.filter(b => foes(b, p)).sort((a, b) => d(a) - d(b))[0]; if (!rival) return;
      rival.ai.target = p; rival.ai.until = G.t + 14; setTimeout(() => say(rival, Math.random() < 0.5 ? 4 : 5), 700 + Math.random() * 800);
    } else if (n === 6 || n === 0) { const b = bots[Math.floor(Math.random() * bots.length)]; if (Math.random() < 0.6) setTimeout(() => say(b, n === 6 ? 6 : 7), 800 + Math.random() * 900); }
  }
  function openChat(show) {
    const el = $('#chatPop'), on = show ?? el.classList.contains('hidden');
    if (on) el.innerHTML = PHRASES.map((t, i) => `<button data-n="${i}"><kbd>${i + 1}</kbd>${t}</button>`).join('');
    el.classList.toggle('hidden', !on); $('#chatBtn').classList.toggle('on', on);
    $$('#chatPop button').forEach(b => b.onclick = () => { if (G) say(G.viewers[0], +b.dataset.n); openChat(false); });
  }
  $('#chatBtn').onclick = () => G && openChat();

  /* ---------------- touch controls: your own layout ----------------
   * Positions are kept as fractions of the screen (so a layout survives rotating or a different phone), one size and one
   * see-through setting for all buttons. The editor keeps it playable: every button stays fully on screen and clear of
   * the top bar, buttons are pushed apart so they never overlap, the smallest size still leaves a ~48 px target, and
   * Reset always brings back the built-in layout. */
  const CTL = [{ a: 'l', label: '&#9664;', w: 72, h: 64 }, { a: 'r', label: '&#9654;', w: 72, h: 64 }, { a: 'in', label: 'KHAINCH', w: 76, h: 64 }, { a: 'out', label: 'DHEEL', w: 76, h: 64 }, { a: 'fly', label: 'FLY', w: 94, h: 94, round: true }];
  const ctlDefault = () => { const W = innerWidth, H = innerHeight, b = H - 16 - 47;
    return { l: [(16 + 36) / W, (H - 16 - 32) / H], r: [(16 + 72 + 6 + 36) / W, (H - 16 - 32) / H], in: [(W - 16 - 94 - 76 - 76 - 12 + 38) / W, (H - 16 - 32) / H], out: [(W - 16 - 94 - 76 - 6 + 38) / W, (H - 16 - 32) / H], fly: [(W - 16 - 47) / W, b / H] }; };
  function ctlClamp(pos, sc) {   // keep every button fully on screen, in the lower part (the sky above stays clear to fly in)
    const W = innerWidth, H = innerHeight, top = Math.max(64, H * 0.4);
    for (const c of CTL) { const p = pos[c.a], hw = c.w * sc / 2 + 6, hh = c.h * sc / 2 + 6;
      p[0] = clamp(p[0], hw / W, 1 - hw / W); p[1] = clamp(p[1], (top + hh) / H, 1 - hh / H); }
  }
  function ctlSeparate(pos, sc, moved) {   // push overlapping buttons apart (the one being moved wins its spot)
    const W = innerWidth, H = innerHeight;
    for (let it = 0; it < 12; it++) {
      let any = false;
      for (let i = 0; i < CTL.length; i++) for (let j = i + 1; j < CTL.length; j++) {
        const A = CTL[i], B = CTL[j], pa = pos[A.a], pb = pos[B.a];
        let dx = (pb[0] - pa[0]) * W, dy = (pb[1] - pa[1]) * H; const need = (Math.max(A.w, A.h) + Math.max(B.w, B.h)) * sc / 2 * 0.98 + 6, d = Math.hypot(dx, dy);
        if (d >= need) continue; any = true;
        if (d < 0.5) { dx = 1; dy = 0; } const ux = dx / (d || 1), uy = dy / (d || 1), push = need - d;
        const fa = A.a === moved ? 0 : B.a === moved ? 1 : 0.5, fb = 1 - fa;
        pa[0] -= ux * push * fa / W; pa[1] -= uy * push * fa / H; pb[0] += ux * push * fb / W; pb[1] += uy * push * fb / H;
      }
      ctlClamp(pos, sc); if (!any) break;
    }
  }
  function applyTouchLayout() {
    const L = saved.touchLayout, box = $('#touch');
    box.classList.toggle('custom', !!L);
    $$('#touch button[data-a]').forEach(b => {
      if (!L) { b.style.cssText = ''; return; }
      const p = L.pos[b.dataset.a]; if (!p) return;
      b.style.cssText = `position:fixed;left:${(p[0] * 100).toFixed(2)}vw;top:${(p[1] * 100).toFixed(2)}vh;transform:translate(-50%,-50%) scale(${L.scale});opacity:${L.opacity};margin:0`;
    });
  }
  let ceState = null;
  function openCtlEditor() {
    const L = saved.touchLayout;
    ceState = { scale: L ? L.scale : 1, opacity: L ? L.opacity : 0.9, pos: L ? JSON.parse(JSON.stringify(L.pos)) : ctlDefault(), wasPaused: G ? G.paused : null };
    if (G && !G.online) G.paused = true;
    ctlClamp(ceState.pos, ceState.scale);
    $('#ceSize').value = Math.round(ceState.scale * 100); $('#ceOpacity').value = Math.round(ceState.opacity * 100);
    $('#ceStage').innerHTML = CTL.map(c => `<button class="ce-btn ${c.round ? 'round' : ''}" data-a="${c.a}" style="width:${c.w}px;height:${c.h}px">${c.label}</button>`).join('');
    $$('#ceStage .ce-btn').forEach(el => {
      el.onpointerdown = e => {
        e.preventDefault(); el.setPointerCapture(e.pointerId); el.classList.add('drag');
        const p = ceState.pos[el.dataset.a], sx = e.clientX, sy = e.clientY, p0 = p.slice();
        ceState.reset = false;
        el.onpointermove = ev => { p[0] = p0[0] + (ev.clientX - sx) / innerWidth; p[1] = p0[1] + (ev.clientY - sy) / innerHeight; ctlClamp(ceState.pos, ceState.scale); ceDraw(); };
        el.onpointerup = el.onpointercancel = () => { el.onpointermove = null; el.classList.remove('drag'); ctlSeparate(ceState.pos, ceState.scale, el.dataset.a); ceDraw(); };
      };
    });
    ceDraw(); $('#ctlEditor').classList.remove('hidden');
  }
  function ceDraw() {
    $$('#ceStage .ce-btn').forEach(el => { const p = ceState.pos[el.dataset.a]; el.style.left = (p[0] * 100) + 'vw'; el.style.top = (p[1] * 100) + 'vh'; el.style.transform = `translate(-50%,-50%) scale(${ceState.scale})`; el.style.opacity = ceState.opacity; });
  }
  function closeCtlEditor(keep) {
    if (keep && ceState.reset) { delete saved.touchLayout; save(); toast('Buttons are back to the standard layout.'); }
    else if (keep) { saved.touchLayout = { v: 1, scale: ceState.scale, opacity: ceState.opacity, pos: ceState.pos }; save(); toast('Button layout saved.'); }
    $('#ctlEditor').classList.add('hidden'); applyTouchLayout(); if (window.__ceFromSet) { window.__ceFromSet = false; $('#settings').classList.remove('hidden'); }
    if (G && ceState && ceState.wasPaused === false && !G.online) G.paused = false;
    ceState = null;
  }
  $('#ceSize').oninput = () => { ceState.reset = false; ceState.scale = +$('#ceSize').value / 100; ctlClamp(ceState.pos, ceState.scale); ctlSeparate(ceState.pos, ceState.scale, null); ceDraw(); };
  $('#ceOpacity').oninput = () => { ceState.opacity = +$('#ceOpacity').value / 100; ceDraw(); };
  $('#ceMirror').onclick = () => { ceState.reset = false; for (const k in ceState.pos) ceState.pos[k][0] = 1 - ceState.pos[k][0]; ctlClamp(ceState.pos, ceState.scale); ceDraw(); };
  $('#ceReset').onclick = () => { ceState.scale = 1; ceState.opacity = 0.9; ceState.pos = ctlDefault(); ceState.reset = true; $('#ceSize').value = 100; $('#ceOpacity').value = 90; ceDraw(); };
  $('#ceCancel').onclick = () => closeCtlEditor(false);
  $('#ceSave').onclick = () => closeCtlEditor(true);
  $('#ctlEdit').onclick = () => { if (!$('#settings').classList.contains('hidden')) { window.__ceFromSet = true; $('#settings').classList.add('hidden'); } openCtlEditor(); }; $('#pauseCtl').onclick = () => openCtlEditor();
  addEventListener('resize', () => { if (saved.touchLayout) { ctlClamp(saved.touchLayout.pos, saved.touchLayout.scale); applyTouchLayout(); } if (ceState) { ctlClamp(ceState.pos, ceState.scale); ceDraw(); } });
  applyTouchLayout();

  /* ---------------- slow-motion cut replay ----------------
   * The last few seconds of the sky are kept as light snapshots (60 a second: every kite's position, angles and line,
   * the loose strings, the kids, the sparks). When a cut you were part of happens, the game lets it play out for a
   * moment, pauses, and plays those seconds back on a close camera aimed at the crossing - easing into slow motion right
   * at the cut. Skip ends it at once; "Don't show replays" turns them off (Settings brings them back).
   * Online the match can't pause, so there it only plays when it was YOUR kite that was cut (you're waiting anyway). */
  const RP = { keep: 3.2, before: 1.8, after: 0.9 };
  /* v7.2 NO GARBAGE: the recorder used to build a brand-new copy of every kite (dozens of fields and arrays), every loose
   * string, rope, spark and kid 60 times a second and keep 3.2 s of them. That flood of short-lived objects was promoted to
   * long-lived memory and set off full garbage collections - the occasional "stuck" moment while flying and in a pecha
   * (sampling showed the recorder holding ~5.4 MB, more than everything else together). Each kite and rope now has its own
   * ring of snapshot slots, overwritten in place: recording allocates next to nothing. A replay copies what it shows once,
   * when it starts. */
  const SNAP_RING = 210;   // > keep (3.2 s) x 60 records a second, so a slot is never reused while still in the window
  const copyInto = (dst, src) => { if (dst && dst.length === src.length) { for (let i = 0; i < src.length; i++) dst[i] = src[i]; return dst; } return src.slice(); };
  function snapKite(k, fresh) {
    let o;
    if (fresh) o = {};
    else { const ring = k._snaps || (k._snaps = { a: new Array(SNAP_RING), i: 0 }); o = ring.a[ring.i % SNAP_RING] || (ring.a[ring.i % SNAP_RING] = {}); ring.i++; }
    for (const key in k) {
      if (key === '_snaps') continue;
      const v = k[key], t = typeof v;
      if (t === 'number' || t === 'boolean') o[key] = v;
      else if (Array.isArray(v) && (!v.length || typeof v[0] === 'number')) o[key] = copyInto(o[key], v);
    }
    o.__pd = k._pechaDraw && k._pechaDraw.length ? k._pechaDraw.map(d => ({ ...d, point: d.point && d.point.slice() })) : null;
    if (k.trail) { const tp = k.trail.p, dst = Array.isArray(o.__trail) && o.__trail.length === tp.length ? o.__trail : (o.__trail = new Array(tp.length)); for (let i = 0; i < tp.length; i++) dst[i] = copyInto(dst[i], tp[i]); } else o.__trail = null;
    o.__hook = k.caught && k.caught.hook ? k.caught.hook.slice() : null;
    o.__trailRef = k.trail || null; o.__caughtRef = k.caught || null;   // the live objects themselves, to put back untouched
    return o;
  }
  /** put a snapshot back on its kite. live = true: it is the kite's own present state being restored (in place, so
   *  nothing that holds on to its arrays or its rope ever notices); false: a recorded moment, shown for one frame */
  function applyKite(k, o, live) {
    for (const key in o) {
      if (key.slice(0, 2) === '__') continue;
      const v = o[key], cur = k[key];
      if (Array.isArray(v)) { if (Array.isArray(cur) && cur.length === v.length) for (let i = 0; i < v.length; i++) cur[i] = v[i]; else k[key] = v.slice(); }
      else k[key] = v;
    }
    // a flag the kite picked up later (inDrifters, cutHandled...) didn't exist at the recorded moment
    for (const key in k) { const t = typeof k[key]; if ((t === 'number' || t === 'boolean') && !(key in o)) k[key] = undefined; }
    k._pechaDraw = o.__pd; k._gm = null;
    if (live) { k.trail = o.__trailRef; k.caught = o.__caughtRef; }
    else { k.trail = o.__trail ? { p: o.__trail, n: o.__trail.length } : null; k.caught = o.__caughtRef ? { ...o.__caughtRef, hook: o.__hook || o.__caughtRef.hook } : null; }
  }
  function recordFrame() {
    const R = G.rec60 || (G.rec60 = []), kites = new Set();
    for (const p of G.players) if (p.kite) kites.add(p.kite);
    for (const d of G.drifters) kites.add(d);
    const ropeSnap = r => { const ring = r._snaps || (r._snaps = { a: new Array(SNAP_RING), i: 0 }), j = ring.i++ % SNAP_RING; const o = ring.a[j] || (ring.a[j] = { rope: { p: [] } });
      for (const key in r) if (key !== 'rope' && key !== '_snaps') o[key] = r[key];
      const src = r.rope.p, dst = o.rope.p; dst.length = src.length; for (let i = 0; i < src.length; i++) dst[i] = copyInto(dst[i], src[i]); return o; };
    R.push({ t: G.t, players: G.players.map(p => ({ p, kite: p.kite, landing: p.landing, cheerT: p.cheerT, sadT: p.sadT, bubble: p.bubble ? { ...p.bubble } : null })),
      kites: [...kites].map(k => [k, snapKite(k)]), drifters: G.drifters.slice(),
      looters: G.looters.map(L => ({ ...L, p: L.p.slice(), v: L.v.slice() })), ropes: G.ropes.map(ropeSnap),
      sparks: G.sparks.map(x => ({ ...x, p: x.p.slice() })), fx: G.fx.map(x => ({ ...x })) });
    let drop = 0; while (drop < R.length && G.t - R[drop].t > RP.keep) drop++; if (drop) R.splice(0, drop);
  }
  function wantReplay(lp, wp) {
    if (!saved.replay || G.tut || G.replay || G.replayReq) return false;
    if (G.online) return lp && lp.ctrl === 'human1';
    return [lp, wp].some(x => x && x.ctrl.startsWith('human'));
  }
  function startReplay() {
    const q = G.replayReq; G.replayReq = null;
    // the frames are copied once here: the recording slots are reused, and online the match keeps recording during a replay
    const deep = v => Array.isArray(v) ? v.map(deep) : v;
    const frames = (G.rec60 || []).filter(f => f.t >= q.cutT - RP.before).map(f => ({ ...f,
      kites: f.kites.map(([k, o]) => { const c = {}; for (const key in o) c[key] = Array.isArray(o[key]) ? deep(o[key]) : o[key]; return [k, c]; }),
      ropes: f.ropes.map(r => ({ ...r, rope: { p: r.rope.p.map(q => q.slice()) } })) }));
    if (frames.length < 20) return;
    const viewer = G.viewers.find(v => v === q.lp || v === q.wp) || G.viewers[0];
    G.replay = { frames, t: frames[0].t, t1: frames[frames.length - 1].t, cutT: q.cutT, point: q.point, viewer, pausedSim: !G.online && !G.paused, cam: null, hands: new Map(), whoosh: false };
    if (G.replay.pausedSim) G.paused = true;
    $('#rpNever').checked = false; $('#replayUI').classList.remove('hidden'); $('#game').classList.add('replaying'); openChat(false);
  }
  function endReplay() {
    if (!G || !G.replay) return;
    const R = G.replay; G.replay = null; $('#replayUI').classList.add('hidden'); $('#game').classList.remove('replaying');
    if (R.pausedSim && !G.over) { G.paused = false; G.acc = 0; }
  }
  $('#rpSkip').onclick = () => endReplay();
  $('#rpNever').onchange = () => { if ($('#rpNever').checked) { saved.replay = false; save(); renderPrefs(); toast('Cut replays are off. Turn them back on in Settings on the main menu.'); endReplay(); } };
  // the replay camera: from behind the flier's roof, zoomed onto the crossing, pushing in slowly
  function replayCam(v, w, h, dt) {
    const R = G.replay, A = anchorOf(R.viewer), P = R.point || A, prog = clamp((R.t - R.frames[0].t) / ((R.t1 - R.frames[0].t) || 1), 0, 1);
    const dx = P[0] - A[0], dy = P[1] - A[1], dh = Math.hypot(dx, dy) || 1, yaw = Math.atan2(dy, dx), back = 9 - 3 * prog;
    const pos = [A[0] - back * Math.cos(yaw), A[1] - back * Math.sin(yaw), 2.6], pitch = Math.atan2(P[2] - pos[2], dh + back);
    const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch), zoom = 1.9 + 0.7 * prog;
    return { pos, yaw, pitch, fl: h * FOV_F * zoom, cx: w / 2, cy: h * 0.5, fwd: [cp * cy, cp * sy, sp], right: [sy, -cy, 0], up: [-sp * cy, -sp * sy, cp] };
  }
  function renderReplay(dt) {
    const R = G.replay;
    // slow motion eases in toward the cut and out after it
    const near = Math.abs(R.t - R.cutT), speed = 0.22 + 0.48 * clamp((near - 0.15) / 0.6, 0, 1);
    R.t += dt * speed; $('#rpSlow').classList.toggle('on', speed < 0.4);
    if (!R.whoosh && R.t >= R.cutT) { R.whoosh = true; if (SFX.whoosh) SFX.whoosh(1, 0); }
    if (R.t >= R.t1) { endReplay(); return render(dt); }
    let i = 0; while (i + 1 < R.frames.length && R.frames[i + 1].t <= R.t) i++;
    const F = R.frames[i], N = R.frames[i + 1] || F, f = N.t > F.t ? clamp((R.t - F.t) / (N.t - F.t), 0, 1) : 0;
    // keep the live sky aside, put the recorded one in place, draw, then put the live one back
    const live = { players: G.players.map(p => ({ p, kite: p.kite, landing: p.landing, cheerT: p.cheerT, sadT: p.sadT, bubble: p.bubble })), drifters: G.drifters, looters: G.looters, ropes: G.ropes, sparks: G.sparks, fx: G.fx, popups: G.popups, t: G.t };
    const liveKites = new Map(); for (const [k] of F.kites) liveKites.set(k, snapKite(k, true)); for (const p of G.players) if (p.kite && !liveKites.has(p.kite)) liveKites.set(p.kite, snapKite(p.kite, true));
    try {
      for (const x of F.players) { x.p.kite = x.kite; x.p.landing = x.landing; x.p.cheerT = x.cheerT; x.p.sadT = x.sadT; x.p.bubble = x.bubble; }
      const nextOf = new Map(N.kites);
      for (const [k, o] of F.kites) {
        applyKite(k, o, false); const n = nextOf.get(k);
        if (n && f > 0) { for (let a = 0; a < 3; a++) k.p[a] = o.p[a] + (n.p[a] - o.p[a]) * f; k.bodyAngle = o.bodyAngle + (n.bodyAngle - o.bodyAngle) * f; }
      }
      G.drifters = F.drifters; G.looters = F.looters; G.ropes = F.ropes; G.sparks = F.sparks; G.fx = F.fx; G.popups = []; G.t = F.t + (N.t - F.t) * f;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0); ctx.clearRect(0, 0, CW, CH);
      const rv = { replaycam: true, slot: 0, cam: null, _hands: R.hands, kite: R.viewer.kite, shared: false };
      drawViewport({ x: 0, y: 0, w: CW, h: CH }, rv, dt);
      // cinema bars and a vignette
      const bar = CH * 0.085; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, CW, bar); ctx.fillRect(0, CH - bar, CW, bar);
      const vg = ctx.createRadialGradient(CW / 2, CH / 2, Math.min(CW, CH) * 0.35, CW / 2, CH / 2, Math.max(CW, CH) * 0.75); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.45)'); ctx.fillStyle = vg; ctx.fillRect(0, 0, CW, CH);
    } finally {
      for (const x of live.players) { x.p.kite = x.kite; x.p.landing = x.landing; x.p.cheerT = x.cheerT; x.p.sadT = x.sadT; x.p.bubble = x.bubble; }
      for (const [k, o] of liveKites) applyKite(k, o, true);
      G.drifters = live.drifters; G.looters = live.looters; G.ropes = live.ropes; G.sparks = live.sparks; G.fx = live.fx; G.popups = live.popups; G.t = live.t;
    }
    $('#rpProg').style.width = (100 * clamp((R.t - R.frames[0].t) / (R.t1 - R.frames[0].t), 0, 1)).toFixed(1) + '%';
  }

  /* ---------------- simulation ---------------- */
  // low = a small banner near the bottom (pecha on / released): the big centre one would sit right on top of the fight
  function banner(p, text, color, dur = 1.6, low = false) { if (p.ctrl.startsWith('human')) p.banner = { text, color, t: dur, t0: dur, low }; }
  function onCut(loser, winner, snap, s, point) {
    dbgEv('cut');
    const lp = loser.owner, wp = winner && winner.owner, newsy = real(lp) || real(wp); lp.score.lost++; lp.sadT = G.t; if (wp && !snap) wp.cheerT = G.t; lp.respawn = 2.6; lp.streak = 0;
    if (lp.ctrl.startsWith('human') && !G.tut) stat(s => { s.lost++; });
    splitLine(loser, s || 0.5, snap);
    // the falling kite becomes loot straight away (not only after its owner respawns), so it can be hooked
    // during the most exciting moment - right after the cut
    if (!loser.inDrifters) { loser.inDrifters = true; loser.age = 0; G.drifters.push(loser); }
    spawnLooters(loser);
    if (wp && !snap) {
      wp.score.cut++; if (newsy) note(`${wp.name} cut ${lp.name}`);
      // streaks: cuts within 25 s of each other build up, each step worth a bonus point
      wp.streak = (G.t - (wp.lastCutT ?? -99) < 25) ? (wp.streak || 1) + 1 : 1; wp.lastCutT = G.t;
      const STREAK = ['BO KATA!', 'DOUBLE BO KATA!', 'TRIPLE BO KATA!', 'SHERA! x4', 'BADSHAH! x' + wp.streak];
      if (wp.streak > 1) { wp.score.bonus = (wp.score.bonus || 0) + (wp.streak - 1); if (real(wp)) note(`${wp.name}: ${wp.streak} in a row (+${wp.streak - 1})`); }
      banner(wp, STREAK[Math.min(wp.streak, STREAK.length) - 1], wp.streak > 1 ? '#ff7a45' : '#ffd166', 2.0);
      if (wp.ctrl.startsWith('human') && !G.tut) stat(s => { s.cuts++; if (s.cutTimes) s.cutTimes.push(G.t); s.bestStreak = Math.max(s.bestStreak, wp.streak); if (winner && (winner.sendE || 0) > 0.3) s.dheelCuts++; if (winner && (winner.pullE || 0) > 0.3) s.khainchCuts++; });
      if (point) {
        G.fx.push({ p: point, t: 0.7, t0: 0.7 });
        for (let i = 0; i < 14; i++) { const a = Math.random() * 7, sp = 3 + Math.random() * 6; G.sparks.push({ p: point.slice(), v: [Math.cos(a) * sp, Math.sin(a) * sp, (Math.random() - 0.3) * 5], t: 0.35 + Math.random() * 0.25, t0: 0.6, big: Math.random() < 0.3, c: Math.random() < 0.5 ? '#fff3c4' : winner.thread.color }); }
      }
      if (winner) G.popups.push({ p: winner.p.slice(), text: '+1', color: '#3ddc4b', t: 1.1 });
    } else if (real(lp)) note(`${lp.name}'s line snapped`);
    G.popups.push({ p: loser.p.slice(), text: '-1', color: '#ff4d4d', t: 1.1 });
    banner(lp, snap ? 'LINE SNAPPED' : (wp ? 'CUT BY ' + wp.name.toUpperCase() : 'LINE LOST'), '#ef476f');
    const humanInvolved = [lp, wp].some(x => x && x.ctrl.startsWith('human'));
    // the shout is for cuts you're part of; bot-vs-bot cuts get a crowd cheer instead, so a busy festival
    // isn't a non-stop voice. Losing your own kite adds a falling tone.
    // sound: the shout is only for YOUR cuts. Someone else's cut is at most a soft crowd swell far away, never a voice -
    // with many fliers, voices for every cut made it impossible to tell whose kite went
    if (wp && !snap && wp.ctrl.startsWith('human')) SFX.shout('win');            // you cut it: "Bo kaata!"
    else if (wp && !snap && lp.ctrl.startsWith('human')) SFX.shout('lost');      // they cut you: their roof shouts "Kat gayi oye!"
    else if (snap && lp.ctrl.startsWith('human')) SFX.shout('snap');             // your own line broke: "Urr gayi patang!"
    else if (humanInvolved) SFX.cheer(false);
    else if (G.t - (G.lastCrowd ?? -99) > 6) { G.lastCrowd = G.t; SFX.cheer(false); }
    if (lp.ctrl.startsWith('human')) SFX.lost();
    if (!G.online) {   // the bots talk a little: a jeer when they cut you, a nod when you cut them
      if (wp && !snap && wp.ctrl === 'bot' && lp.ctrl.startsWith('human') && Math.random() < 0.35) setTimeout(() => say(wp, Math.random() < 0.5 ? 5 : 2), 900);
      else if (wp && !snap && wp.ctrl.startsWith('human') && lp.ctrl === 'bot' && Math.random() < 0.3) setTimeout(() => say(lp, Math.random() < 0.6 ? 0 : 7), 1100);
    }
    if (wantReplay(lp, wp)) G.replayReq = { at: G.t + RP.after, cutT: G.t, point: (point || loser.p).slice(), lp, wp };
    if (humanInvolved && !G.tut) { for (const x of [lp, wp]) if (x && x.ctrl.startsWith('human')) jolt(x, x === lp ? 0.9 : 0.6); buzz(wp && wp.ctrl.startsWith('human') ? [25, 40, 50] : [80]); }
  }
  // who a kite is hooked with right now (one opponent at a time), from the last frame's pecha state
  function busyWith(k) { const e = k && k._pecha; return e && e.on && e.locked ? (e.a === k ? e.b : e.a) : null; }
  function jolt(p, amt) { if (!p || !p.ctrl.startsWith('human')) return; for (const v of [p, sharedView]) if (v.cam) v.cam.shake = Math.max(v.cam.shake || 0, amt); }
  function buzz(pat) {
    try {
      if (!IS_TOUCH || saved.vibrate === false) return;
      const H = NATIVE && NATIVE.Plugins && NATIVE.Plugins.Haptics;
      if (H) { const ms = Array.isArray(pat) ? pat.reduce((a, b) => a + b, 0) : pat; H.impact({ style: ms > 90 ? 'HEAVY' : ms > 40 ? 'MEDIUM' : 'LIGHT' }); return; }   // the phone app: real haptics (iPhone too)
      if (navigator.vibrate) navigator.vibrate(pat);
    } catch (e) {}
  }
  const panOf = p => G && G.viewers.length > 1 ? (G.viewers.indexOf(p) === 0 ? -0.55 : 0.55) : 0;
  function step() {
    if (G.over) return;
    G.t += DT;
    if (G.online) { netTick(); if (!G) return; }
    for (const p of G.players) {
      const k = p.kite; if (!k) continue;
      if (p.ctrl === 'net') { if (!k.free) netFollow(p, k); continue; }   // another player's kite: it goes where the server says
      if (p.landed) continue;   // sitting on the ground with the swap panel open
      if (k.free && k.inDrifters) {   // already falling as loot (simulated in the drifters loop) - only the respawn timer runs here
        p.respawn -= DT; if (p.respawn <= 0 && !k.respawned) { k.respawned = true; spawn(p); }
        continue;
      }
      const inp = p.landing ? { pull: true } : (k.free ? {} : (p.ctrl === 'bot' ? botInput(p) : humanInput(p)));
      if (p.ctrl === 'bot' && !k.free) {   // a real hand on the line: steering eases in and out instead of flicking each frame
        const want = inp.turn || 0; p.ai.turnS = (p.ai.turnS || 0) + (want - (p.ai.turnS || 0)) * Math.min(1, DT / 0.18);
        inp.turn = Math.abs(p.ai.turnS) > 0.03 ? p.ai.turnS : 0;
      }
      kiteHandling(p, k, inp);
      k.step(DT, G.wind, inp);
      if (k.idleAng) k.bodyAngle += k.idleAng;   // the sail turning on its own (drawn, sent online, replayed)
      if (p.landing && !k.free) {
        // the kite is home when it's near the hands, or it touched the roof, or (safety) after a few seconds of
        // reeling - a gust holding it out used to leave the player reeling forever with no swap screen
        p.landT = (p.landT || 0) + DT;
        const r = Math.hypot(k.p[0] - k.anchor[0], k.p[1] - k.anchor[1], k.p[2] - k.anchor[2]), spd = Math.hypot(...k.v);
        if ((r < 6 && spd < 4) || k.onGround || p.landT > 7) { p.landing = false; p.landed = true; p.landT = 0; k.v = [0, 0, 0]; openSwap(p); continue; }
      }
      if (k.snapped && !k.snapReported) {
        k.snapReported = true;
        if (G.online) { netSend({ t: 'ev', e: 'snap' }); p.respawn = 99; continue; }   // the server says whether it was a cut
        // a line that breaks while it's badly sawn through was CUT, not snapped: credit whoever sawed it (a nearly
        // cut line is weak, so ordinary tension often finishes it a moment before the saw itself reaches 100%)
        // credit rule (same as the server): whoever cut it LAST - the last line that sawed it, even if that kite has
        // itself gone down since - as long as that last stroke was recent
        const by = PECHA.topSawer(k, G.t, k._lastSawBy), recent = by && by.owner && G.players.includes(by.owner) && G.t - (k._lastSawT || -99) < 15;
        // a line that parts in the middle of a pecha (sawn, or overloaded by a hard khainch against the other line)
        // is the pecha's result: whoever it was hooked with gets the cut
        const inPecha = recent && G.t - (k._lastSawT || -99) < 2;
        if ((k.damage > 0.45 && recent) || inPecha) onCut(k, by, false, 0.5, k.p.slice()); else onCut(k, null, true);
        continue;
      }
      if (!k.free) { p.grounded = (k.onGround && !k.launch) ? p.grounded + DT : 0; if (p.grounded > 4) { if (real(p)) note(p.name + ' crashed'); if (G.online) netSend({ t: 'ev', e: 'land' }); spawn(p); } }
      else { p.respawn -= DT; if (p.respawn <= 0 && !k.respawned) { k.respawned = true; spawn(p); } }
      if (k.trail) k.trail.step(DT, G.wind, k.p, G.t);
    }
    for (let i = G.drifters.length - 1; i >= 0; i--) {
      const d = G.drifters[i];
      if (d.gone) { G.drifters.splice(i, 1); continue; }
      if (d.looted) {   // carried off on a looter's jhaar stick
        const L = d.looted, top = lootStickTop(L);
        for (let a = 0; a < 3; a++) d.p[a] += (top[a] - d.p[a]) * Math.min(1, DT * 12);
        d.v = [0, 0, 0]; d.spinAngle = Math.sin(G.t * 3 + d.swayPh) * 0.3; d.bodyAngle = d.headingAngle + d.spinAngle;
        if (d.trail) d.trail.step(DT, G.wind, d.p, G.t);
        continue;
      }
      if (d.caught) { if (stepCaught(d)) G.drifters.splice(i, 1); continue; }
      if (d.pulledBy) { stepPulled(d); continue; }
      if (!d.landed) {
        d.step(DT, G.wind, {}); if (d.trail) d.trail.step(DT, G.wind, d.p, G.t);
        d.age = (d.age || 0) + DT;
        tryCatch(d); if (d.caught) continue;
        if (d.onGround) { d.landed = true; d.groundT = 0; }
        else if ((d.age > (d.ambient ? 130 : 40) || d.p[0] > 600) && !G.looters.some(L => L.kite === d && L.state === 'run')) G.drifters.splice(i, 1);
        if (d.ambient && !d.lootersCalled && d.p[2] < 16) { d.lootersCalled = true; spawnLooters(d); }
      } else {
        d.groundT += DT;
        if (d.groundT > (G.looters.some(L => L.kite === d && L.state === 'run') ? 16 : 6)) G.drifters.splice(i, 1);
      }
    }
    stepLooters();
    for (let i = G.ropes.length - 1; i >= 0; i--) {
      const r = G.ropes[i]; r.pin -= DT; r.life -= DT; r.rope.step(DT, G.wind, r.pin > 0 ? r.anchor : null, G.t);
      if (r.life <= 0) G.ropes.splice(i, 1);
    }
    // ---- pecha (src/pecha.js): each pair of lines keeps its own engagement state, created fresh with each kite ----
    // v6.4: a line may be in up to PECHA.CFG.maxHooks pechas at once (a third kite can fly across a running pecha and join
    // it). `hooks` = how many locked pechas each line had last frame; a new one only starts while both have room.
    const alive = G.players.map(p => p.kite).filter(k => k && !k.free);
    for (const k of alive) { k._busy = busyWith(k); k.hooks = 0; k._pecha = null; k._pechaDraw = []; k._saw = 0; k._sawMax = 0; }
    for (const a of alive) if (a._pst) for (const [b, st] of a._pst) if (st.on && st.locked && !b.free && alive.includes(b)) { a.hooks++; b.hooks++; }
    for (let i = 0; i < alive.length; i++) for (let j = i + 1; j < alive.length; j++) {
      const a = alive[i], b = alive[j]; if (a.free || b.free) continue;
      const pa = a.owner, pb = b.owner; if (pa.landing || pb.landing || a.launch || b.launch) continue;
      if (G.teams && teamOf(pa) === teamOf(pb)) continue;   // team-mates' strings fly together and never fight
      const map = a._pst || (a._pst = new Map()), st = map.get(b) || (map.set(b, {}), map.get(b));
      if (!PECHA.canHook(a, b, st)) { st.on = false; continue; }   // both lines already as tangled as a line can be
      // v6.5: a bot never piles onto a person's line that is already in a pecha - the second pecha is only ever the
      // person's own choice (flying into someone else's). Keeps "pecha within pecha" rare and never forced on you.
      if (!st.locked && !G.online && ((person(pa) && !person(pb) && a.hooks > 0) || (person(pb) && !person(pa) && b.hooks > 0))) { st.on = false; continue; }
      const wasLocked = !!st.locked;
      const r = PECHA.step(a, b, DT, st, G.online ? PECHA_VIEW : PECHA.CFG);
      if (r.released) st.lastRelease = r.released;
      if (st.locked && !wasLocked && st.on) { a.hooks++; b.hooks++; }
      if (st.started) {
        if (real(pa) || real(pb)) note(`Pecha: ${pa.name} vs ${pb.name}`);
        for (const x of [pa, pb]) if (x.ctrl.startsWith('human')) {
          const mine = x === pa ? a : b, other = x === pa ? b : a, joined = (mine.hooks | 0) > 1;
          // the second line into the same tangle: say who came in
          banner(x, joined ? `${other.owner.name.toUpperCase()} JOINED THE PECHA` : (st.aAbove === (x === pa)) ? 'PECHA — FROM ABOVE' : 'PECHA — FROM BELOW', joined ? '#ffb347' : '#7bdff2', 1.3, true);
          SFX.pecha(); buzz(joined ? [30, 40, 30] : 35);
        }
        // a third line coming into a running pecha: the feed says who joined whom (in a team match, who came to help whom)
        { const busyK = (a.hooks | 0) > 1 ? a : (b.hooks | 0) > 1 ? b : null, joiner = busyK === a ? b : a;
          if (busyK && (real(pa) || real(pb) || G.viewers.some(v => v.kite && (v.kite._pechaDraw || []).some(d => d.other === busyK))))
            note(G.teams && G.viewers.some(v => teamOf(v) === teamOf(joiner.owner)) ? `${esc(joiner.owner.name)} came to help against ${esc(busyK.owner.name)}` : `${esc(joiner.owner.name)} joined the pecha on ${esc(busyK.owner.name)}`); }
      }
      if (r.released === 'back' || r.released === 'slip' || r.released === 'ground') for (const x of [pa, pb]) if (x.ctrl.startsWith('human')) banner(x, 'PECHA RELEASED', '#cccccc', 1.0, true);
      if (st.on && st.locked) { a._busy = a._busy || b; b._busy = b._busy || a; }
      if (st.on && st.locked) {   // brushes (lines touching without pressing in) aren't shown as a pecha
        a._pecha = b._pecha = st;
        const sh = r.contact ? r.shareA : (st.lastShare ?? 0.5); st.lastShare = sh;
        a._pechaDraw.push({ point: st.point, s: st.sA, above: st.aAbove, other: b, share: sh, t: st.t, j: r.jA || 0 });
        b._pechaDraw.push({ point: st.point, s: st.sB, above: !st.aAbove, other: a, share: 1 - sh, t: st.t, j: r.jB || 0 });
        if (G.tut && r.contact && (pa.ctrl.startsWith('human') || pb.ctrl.startsWith('human'))) tutCount('pecha', DT);
      }
      if (r.contact) {
        // credit for a cut goes to whoever cut the line LAST - with two lines sawing one, the one doing more of the cutting
        PECHA.creditSaw(a, b, r.dmgA, DT, G.t); PECHA.creditSaw(b, a, r.dmgB, DT, G.t);
        if ((r.dmgA || 0) >= a._sawMax) { a._sawMax = r.dmgA || 0; a._lastSawBy = b; a._lastSawT = G.t; }
        if ((r.dmgB || 0) >= b._sawMax) { b._sawMax = r.dmgB || 0; b._lastSawBy = a; b._lastSawT = G.t; }
        a.hot = b.hot = 0.15; a._saw = Math.max(a._saw, Math.min(1, r.slide / 6)); b._saw = Math.max(b._saw, Math.min(1, r.slide / 6));
        if (Math.random() < 0.25 + 0.5 * Math.max(r.jA || 0, r.jB || 0)) G.sparks.push({ p: r.point.slice(), v: [0, 0, 0], t: 0.25, t0: 0.25, big: (r.jA || r.jB) > 0.5 });
      }
      if (r.cut) onCut(r.cut, PECHA.topSawer(r.cut, G.t, r.cut === a ? b : a), false, r.cut === a ? r.sA : r.sB, r.point);
    }
    // the strongest threat first, so the HUD and camera show the fight that matters most
    for (const k of alive) if (k._pechaDraw.length > 1) k._pechaDraw.sort((x, y) => x.share - y.share);
    stepWorldLife();
    stepKatiSky();
    G.recN = (G.recN || 0) + 1; if (G.recN % 2 === 0) recordFrame();
    if (G.replayReq && G.t >= G.replayReq.at) startReplay();
    if (G.online) { /* the server keeps the clock and ends the match */ }
    else if (G.duration && !G.tut) { G.timeLeft -= DT; if (G.timeLeft <= 0) { G.timeLeft = 0; finishMatch(); return; } }
    if (G.cutTarget && !G.tut && !G.online && (G.teams ? teamTotals().some(t => t.cut >= G.cutTarget) : G.players.some(p => p.score.cut >= G.cutTarget))) { finishMatch(); return; }
    for (const s of G.sparks) if (s.v) { s.v[2] -= 9 * DT; for (let a = 0; a < 3; a++) s.p[a] += s.v[a] * DT; }
    G.sparks = G.sparks.filter(s => (s.t -= DT) > 0); G.fx = G.fx.filter(f => (f.t -= DT) > 0);
    for (const u of G.popups) u.p[2] += DT * 1.4;
    G.popups = G.popups.filter(u => (u.t -= DT) > 0);
  }

  /* ---------------- chase camera ---------------- */
  const BACK = 11, CAM_H = 2.6, FOV_F = 0.68, ZOOM_MIN = 0.55, ZOOM_MAX = 2.2;
  function camFor(v, w, h, dt) {
    if (v.lootcam) return lootCam(v, w, h, dt);
    if (v.replaycam) return replayCam(v, w, h, dt);
    // the camera stands behind the flier (shared 2-player view: behind the middle of both fliers) and keeps every
    // kite it's following in frame; the shared view also zooms out by itself when the two kites drift apart
    const c = v.cam = v.cam || { yaw: 0, pitch: 0.35, shake: 0, zoom: clamp(+saved.zoomPref || 1, ZOOM_MIN, ZOOM_MAX), auto: 1 };   // v6.5: your zoom is remembered
    let A, targets;
    if (v.shared) {
      const hs = G.viewers; A = [0, 1, 2].map(i => hs.reduce((s, p) => s + anchorOf(p)[i], 0) / hs.length);
      targets = hs.map(p => p.kite).filter(k => k && !k.inDrifters).map(k => k.p);
    } else {
      A = anchorOf(v); targets = v.kite ? [v.kite.p] : [];
      // in a pecha, keep the WHOLE fight in frame - both kites and the crossing - not just your own kite
      for (const pd of (v.kite && !v.kite.free && v.kite._pechaDraw) || []) if (pd.other && !pd.other.free) { targets.push(pd.other.p); if (pd.point) targets.push(pd.point); }
    }
    const back = v.shared ? BACK + 6 : BACK;
    c.pz = c.pz || 1;   // pecha zoom: closes in on a fight so both kites and the crossing are big enough to read
    const fovF = FOV_F * c.zoom * (v.shared ? c.auto : c.pz);
    let ty = 0, tp = 0.3;
    if (targets.length) {
      const tg = v.shared ? targets : targets.slice(0, 1), m = [0, 1, 2].map(i => tg.reduce((s, q) => s + q[i], 0) / tg.length);
      const dx = m[0] - A[0], dy = m[1] - A[1], dh = Math.hypot(dx, dy);
      ty = clamp(Math.atan2(dy, Math.max(dx, 0.5)), -1.25, 1.25);
      tp = clamp(Math.atan2(m[2] - CAM_H, dh + back) * 0.55, 0.02, 1.3);
    }
    const f = 1 - Math.exp(-dt * 1.1); c.yaw += (ty - c.yaw) * f; c.pitch += (tp - c.pitch) * f; c.shake = Math.max(0, c.shake - dt);
    const wrap = a => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
    const camPos = () => [A[0] - back * Math.cos(c.yaw), A[1] - back * Math.sin(c.yaw), CAM_H];
    const angles = q => { const o = camPos(), rx = q[0] - o[0], ry = q[1] - o[1], rz = q[2] - CAM_H; return [wrap(Math.atan2(ry, rx) - c.yaw), Math.atan2(rz, Math.hypot(rx, ry)) - c.pitch]; };
    if (v.shared && targets.length > 1) {   // zoom so both kites fit with a margin
      const an = targets.map(angles), sy = Math.abs(an[0][0] - an[1][0]), sp = Math.abs(an[0][1] - an[1][1]);
      const fitH = 0.5 * w / Math.tan(Math.min(1.4, sy / 2 + 0.22)), fitV = 0.47 * h / Math.tan(Math.min(1.4, sp / 2 + 0.2));
      const want = clamp(Math.min(fitH, fitV) / (h * FOV_F * c.zoom), 0.45, 1);
      c.auto += (want - c.auto) * (1 - Math.exp(-dt * (want < c.auto ? 3 : 0.8)));
    }
    if (!v.shared) {
      let want = 1;
      if (targets.length > 1) {
        const an = targets.map(angles); let sy = 0, sp = 0;
        for (const a of an) for (const b of an) { sy = Math.max(sy, Math.abs(a[0] - b[0])); sp = Math.max(sp, Math.abs(a[1] - b[1])); }
        const fitH = 0.5 * w / Math.tan(Math.min(1.4, sy / 2 + 0.16)), fitV = 0.42 * h / Math.tan(Math.min(1.4, sp / 2 + 0.14));
        want = clamp(Math.min(fitH, fitV) / (h * FOV_F * c.zoom), 1, 1.7);
      }
      c.pz += (want - c.pz) * (1 - Math.exp(-dt * (want > c.pz ? 1.2 : 0.7)));
    }
    if (targets.length) {
      const fl0 = h * fovF, halfH = Math.atan(0.5 * w / fl0), halfUp = Math.atan(0.47 * h / fl0), halfDn = Math.atan(0.53 * h / fl0);
      const mH = halfH * (v.shared ? 0.75 : 0.55), mUp = halfUp * (v.shared ? 0.75 : 0.55), mDn = halfDn * 0.5;
      for (let pass = 0; pass < 2; pass++) for (const q of targets) {
        const [dYaw, dPitch] = angles(q);
        if (dYaw > mH) c.yaw += dYaw - mH; else if (dYaw < -mH) c.yaw += dYaw + mH;
        if (dPitch > mUp) c.pitch += dPitch - mUp; else if (dPitch < -mDn) c.pitch += dPitch + mDn;
      }
      c.pitch = clamp(c.pitch, 0.02, 1.45);
    }
    const sh = Math.min(1, c.shake) * 0.3, jx = (Math.random() - 0.5) * sh, jy = (Math.random() - 0.5) * sh;
    const yaw = c.yaw, pitch = c.pitch, cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
    return {
      pos: [A[0] - back * cy + jx, A[1] - back * sy + jy, CAM_H], yaw, pitch, fl: h * fovF, cx: w / 2, cy: h * 0.47,
      fwd: [cp * cy, cp * sy, sp], right: [sy, -cy, 0], up: [-sp * cy, -sp * sy, cp]
    };
  }
  function zoomAll(m) { G.viewers.forEach(v => zoomBy(v, m)); zoomBy(sharedView, m); }
  function zoomBy(v, mul) { const c = v && v.cam; if (c) { c.zoom = clamp((c.zoom ?? 1) * mul, ZOOM_MIN, ZOOM_MAX); if (!v.shared) { saved.zoomPref = +c.zoom.toFixed(3); clearTimeout(zoomBy.t); zoomBy.t = setTimeout(save, 400); } } }
  const toCam = (cam, q) => { const r = [q[0] - cam.pos[0], q[1] - cam.pos[1], q[2] - cam.pos[2]]; return [r[0] * cam.right[0] + r[1] * cam.right[1], r[0] * cam.up[0] + r[1] * cam.up[1] + r[2] * cam.up[2], r[0] * cam.fwd[0] + r[1] * cam.fwd[1] + r[2] * cam.fwd[2]]; };
  const scr = (cam, c) => ({ x: cam.cx + cam.fl * c[0] / c[2], y: cam.cy - cam.fl * c[1] / c[2], d: c[2] });
  const project = (cam, q) => { const c = toCam(cam, q); return c[2] < 0.5 ? null : scr(cam, c); };
  function polyline(cam, pts, style, width, alpha, from, to) {
    ctx.beginPath(); let pen = false, prev = null;
    if (to) pts = pts.slice(0, to.i + 1);   // end exactly at the kanni knot, which lies on this same path (kiteGeom)
    if (from) {
      // start at the flier's hand and join the dor at the first point that is clearly BEYOND the hand toward the kite.
      // (Joining at a fixed 4% along it made the dor kink: near the roof that point often projects beside or behind
      // the hand on screen.)
      ctx.moveTo(from.x, from.y); pen = true;
      const end = project(cam, pts[pts.length - 1]);
      if (end) {
        const ex = end.x - from.x, ey = end.y - from.y, el = Math.hypot(ex, ey) || 1, need = Math.min(el * 0.5, Math.max(14, (from.h || 60) * 0.55));
        let skip = pts.length - 1;
        for (let i = 1; i < pts.length; i++) { const q = project(cam, pts[i]); if (q && ((q.x - from.x) * ex + (q.y - from.y) * ey) / el > need) { skip = i; break; } }
        pts = pts.slice(skip);
      }
    }
    for (const q of pts) {
      let c = toCam(cam, q);
      if (prev) {
        if ((prev[2] < 0.5) !== (c[2] < 0.5)) { const t = (0.5 - prev[2]) / (c[2] - prev[2]), m = [prev[0] + (c[0] - prev[0]) * t, prev[1] + (c[1] - prev[1]) * t, 0.5], sm = scr(cam, m); if (c[2] < 0.5) { ctx.lineTo(sm.x, sm.y); pen = false; } else { ctx.moveTo(sm.x, sm.y); pen = true; } }
      }
      if (c[2] >= 0.5) { const s = scr(cam, c); if (pen) ctx.lineTo(s.x, s.y); else ctx.moveTo(s.x, s.y); pen = true; }
      prev = c;
    }
    if (to && pen) ctx.lineTo(to.x, to.y);
    ctx.strokeStyle = style; ctx.lineWidth = width; ctx.globalAlpha = alpha; ctx.stroke(); ctx.globalAlpha = 1;
  }

  /* ---------------- sky, ground, backdrop ---------------- */
  const CLOUDS = Array.from({ length: 18 }, (_, i) => ({ az: (i * 2.399) % 6.283, el: 0.15 + ((i * 0.37) % 1) * 0.95, sc: 0.6 + ((i * 0.53) % 1) }));
  const CLOUDS2 = Array.from({ length: 22 }, (_, i) => ({ az: (i * 1.7 + 0.4) % 6.283, el: 0.08 + ((i * 0.29) % 1) * 0.8, sc: 0.8 + ((i * 0.41) % 1), dk: i % 3 === 0 }));   // monsoon: a heavy layer
  const STARS = Array.from({ length: 90 }, (_, i) => ({ az: (i * 2.618) % 6.283, el: 0.05 + ((i * 0.618) % 1) * 1.4, b: 0.4 + ((i * 0.31) % 1) * 0.6 }));
  const dirPt = (cam, az, el, r) => [cam.pos[0] + Math.cos(el) * Math.cos(az) * r, cam.pos[1] + Math.cos(el) * Math.sin(az) * r, cam.pos[2] + Math.sin(el) * r];
  function drawWorld(cam, w, h) {
    const SK = (KF_DEBUG && window.__skip) || {};
    const sc = G.sc, night = !!sc.night, fl = cam.fl, hzY = cam.cy + fl * Math.tan(cam.pitch);
    const yAt = e => cam.cy - fl * Math.tan(Math.min(e - cam.pitch, 1.5));
    const y0 = yAt(0), y1 = yAt(1.35), g = ctx.createLinearGradient(0, y0, 0, y1);
    const stops = sc.sky || [[0, '#1466dc'], [0.3, '#0a4cc4'], [0.7, '#0a7ee2'], [1.05, '#08b4f0'], [1.35, '#00dfff']];
    for (const [e, col] of stops) g.addColorStop(clamp((y0 - yAt(e)) / (y0 - y1), 0, 1), col);
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, clamp(Math.ceil(hzY) + 2, 0, h));   // the ground paints below the horizon: no overdraw
    if (sc.nightDrawn) drawNightSky(cam, w, h, sc);
    const sun = sc.sun || (sc.sky ? null : { az: 0.55, el: 0.8, c: '#ffffff' });
    const sp = sun && project(cam, dirPt(cam, sun.az, sun.el, 1500));
    if (sp && sun.big) {   // a big low setting sun
      const r = fl * 0.07, gr = ctx.createRadialGradient(sp.x, sp.y, 0, sp.x, sp.y, r * 5);
      gr.addColorStop(0, 'rgba(255,230,160,.9)'); gr.addColorStop(0.2, 'rgba(255,190,110,.45)'); gr.addColorStop(1, 'rgba(255,150,90,0)');
      ctx.fillStyle = gr; ctx.fillRect(sp.x - r * 5, sp.y - r * 5, r * 10, r * 10);
      ctx.fillStyle = sun.c; ctx.beginPath(); ctx.arc(sp.x, sp.y, r, 0, 7); ctx.fill();
    } else if (sp && !SK.sun) {
      const r = fl * 0.2, gr = ctx.createRadialGradient(sp.x, sp.y, 0, sp.x, sp.y, r);
      gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.18, 'rgba(255,255,255,.95)'); gr.addColorStop(0.3, 'rgba(255,255,255,.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = gr; ctx.fillRect(sp.x - r, sp.y - r, r * 2, r * 2);
      ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = fl * 0.012; ctx.beginPath(); ctx.moveTo(sp.x - r * 0.9, sp.y + r * 0.22); ctx.lineTo(sp.x + r * 0.9, sp.y - r * 0.22); ctx.stroke();
    }
    for (const c of (sc.nightDrawn ? [] : sc.overcast ? CLOUDS.concat(CLOUDS2) : CLOUDS)) {
      const q = project(cam, dirPt(cam, c.az + G.t * (sc.overcast ? 0.009 : 0.004), c.el, 1200)); if (!q) continue;
      const s = fl * 0.028 * c.sc * (sc.overcast ? 1.9 : 1); ctx.fillStyle = sc.overcast ? (c.dk ? 'rgba(92,100,112,.88)' : 'rgba(196,202,210,.9)') : sc.dusk ? 'rgba(255,190,170,.75)' : sc.fog ? 'rgba(255,240,236,.7)' : 'rgba(255,255,255,.92)';
      for (const [ex, ey, rx, ry] of [[0, 0, 1.6, 0.7], [-1, 0.15, 1, 0.55], [1.05, 0.1, 0.9, 0.5]]) { ctx.beginPath(); ctx.ellipse(q.x + ex * s, q.y + ey * s, rx * s, ry * s, 0, 0, 7); ctx.fill(); }
    }
    if (sc.skyline && !SK.skyline) drawSkyline(cam, w, h, sc, hzY);
    const im = sc.pano && panoImgs[sc.pano];
    if (im && im.complete && im.naturalWidth && hzY > -h) {
      const sw = im.naturalWidth, sh = im.naturalHeight, sc2 = fl * 2 * Math.PI / sw, dh = sh * sc2, bottom = hzY + 22 * sc2;
      if (bottom > 0 && bottom - dh < h) {
        const u0 = ((cam.yaw / (2 * Math.PI)) % 1 + 1.5) % 1 * sw, half = (w / 2) / sc2;
        for (const off of [0, -sw, sw]) { const sx = u0 + off - half; if (sx + half * 2 < 0 || sx > sw) continue; const cx0 = Math.max(0, sx), cx1 = Math.min(sw, sx + half * 2); ctx.drawImage(im, cx0, 0, cx1 - cx0, sh, (cx0 - sx) * sc2, bottom - dh, (cx1 - cx0) * sc2, dh); }
      }
    }
    if (hzY < h) {
      const gy = Math.max(0, hzY), gg = ctx.createLinearGradient(0, hzY, 0, hzY + h * 0.55);
      const gc = sc.ground || ['#f2dfa8', '#cfa95f'], gl = sc.grid || 'rgba(120,80,20,.12)';
      gg.addColorStop(0, gc[0]); gg.addColorStop(1, gc[1]); ctx.fillStyle = gg; ctx.fillRect(0, gy, w, h - gy);
      const gs = QUAL.low ? 20 : 10;   // ground grid: half the lines in low-quality mode
      if (!SK.grid) for (let gx = -160; gx <= 200; gx += gs) polyline(cam, Array.from({ length: 13 }, (_, i) => [gx, -120 + i * 20, 0]), gl, 1, 1);
      if (!SK.grid) for (let gy2 = -120; gy2 <= 120; gy2 += gs) polyline(cam, Array.from({ length: 13 }, (_, i) => [-160 + i * 30, gy2, 0]), gl, 1, 1);
    }
    if (sc.fog) {   // winter dawn: mist lying over the roofs, thinning with height
      const fg = ctx.createLinearGradient(0, hzY - fl * 0.25, 0, h); fg.addColorStop(0, 'rgba(246,236,232,0)'); fg.addColorStop(0.35, 'rgba(246,236,232,.55)'); fg.addColorStop(1, 'rgba(246,236,232,.25)');
      ctx.fillStyle = fg; ctx.fillRect(0, hzY - fl * 0.25, w, h - hzY + fl * 0.25);
    }
    if (sc.rain) {   // monsoon drizzle, slanting with the wind
      ctx.strokeStyle = 'rgba(225,232,242,.5)'; ctx.lineWidth = 1.2; ctx.beginPath();
      for (let i = 0; i < 220; i++) { const x = ((i * 97.13 + G.t * 60) % (w + 60)) - 30, y = ((i * 53.7 + G.t * 900) % (h + 40)) - 20; ctx.moveTo(x, y); ctx.lineTo(x - 4, y + 14); }
      ctx.stroke();
    }
    if (night) {
      ctx.fillStyle = 'rgba(4,8,44,0.66)'; ctx.fillRect(0, 0, w, h); ctx.fillStyle = '#fff';
      for (const s of STARS) { const q = project(cam, dirPt(cam, s.az, s.el, 2000)); if (q && q.y < hzY) { ctx.globalAlpha = s.b; ctx.fillRect(q.x, q.y, 2, 2); } } ctx.globalAlpha = 1;
    }
  }

  /* ---------------- drawn scenery: skylines, night sky, floodlights ----------------
   * Features sit at fixed compass bearings far away (so turning the camera pans across them like a real view),
   * generated once per scene from a fixed seed. */
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t ^= t + Math.imul(t ^ (t >>> 7), 61 | t); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const skylineCache = {};
  function skylineFor(id, sc) {
    if (skylineCache[id]) return skylineCache[id];
    const R = rng(id.length * 7919 + 17), F = [];
    if (sc.skyline === 'rooftops') {
      const plaster = sc.dusk ? ['#5a3d48', '#4e3542', '#634452', '#46303d'] : sc.nightDrawn ? ['#2b2a3c', '#24233a', '#313048', '#1f1e30'] : ['#e8dcc4', '#d9c7a6', '#cbb48e', '#efe6d4', '#c9a98a', '#b8a58c'];
      const arc = sc.roofArc || [-Math.PI, Math.PI];
      for (let az = arc[0]; az < arc[1];) {
        const wA = 0.025 + R() * 0.07, el = 0.012 + R() * 0.045 + (R() < 0.12 ? 0.03 : 0);
        F.push({ t: 'b', az, wA, el, c: plaster[Math.floor(R() * plaster.length)], tank: R() < 0.35, win: R() * 1e6 | 0, rail: R() < 0.4 });
        if (R() < 0.07) F.push({ t: 'minaret', az: az + wA * 0.5, el: el + 0.06 + R() * 0.04 });
        if (R() < 0.05) F.push({ t: 'dome', az: az + wA * 0.5, wA: wA * 0.8, el });
        if (R() < 0.18) F.push({ t: 'kite', az: az + wA * R(), el: 0.12 + R() * 0.35, c: ['#e63946', '#ffd166', '#06d6a0', '#118ab2', '#f78c6b', '#9b5de5'][Math.floor(R() * 6)], ph: R() * 6 });
        az += wA + (R() < 0.2 ? 0.01 : 0);
      }
    } else if (sc.skyline === 'fields') {
      for (let i = 0; i < 70; i++) F.push({ t: 'tree', az: -Math.PI + R() * 2 * Math.PI, el: 0.012 + R() * 0.02, s: 0.6 + R() * 0.8 });
      for (let i = 0; i < 14; i++) F.push({ t: 'hut', az: -Math.PI + R() * 2 * Math.PI, wA: 0.02 + R() * 0.02, el: 0.01 + R() * 0.008 });
      for (let i = 0; i < 10; i++) F.push({ t: 'kite', az: -Math.PI + R() * 2 * Math.PI, el: 0.1 + R() * 0.3, c: ['#e63946', '#ffd166', '#06d6a0', '#118ab2'][i % 4], ph: R() * 6 });
    } else if (sc.skyline === 'dunes') {
      F.push({ t: 'fort', az: 0.55, wA: 0.16, el: 0.035 });
    } else if (sc.skyline === 'peaks') {   // a valley town: poplars, flat-roofed stone houses, and snow peaks behind (drawn as ridges)
      for (let i = 0; i < 90; i++) F.push({ t: 'poplar', az: -Math.PI + R() * 2 * Math.PI, el: 0.02 + R() * 0.025 });
      for (let i = 0; i < 26; i++) F.push({ t: 'hut', az: -Math.PI + R() * 2 * Math.PI, wA: 0.015 + R() * 0.02, el: 0.008 + R() * 0.008, stone: true });
      for (let i = 0; i < 8; i++) F.push({ t: 'kite', az: -Math.PI + R() * 2 * Math.PI, el: 0.1 + R() * 0.3, c: ['#e63946', '#ffd166', '#06d6a0', '#118ab2'][i % 4], ph: R() * 6 });
    }
    const ex = sc.extras || [];
    if (ex.includes('mosque')) {   // a great Mughal-style mosque over the old city: red sandstone, three white domes, four minarets
      F.push({ t: 'mosque', az: 0.28, wA: 0.3, el: 0.05 });
      F.push({ t: 'minar', az: -0.42, el: 0.2 });
    }
    if (ex.includes('towers')) {   // a business district: glass towers and building cranes
      for (let i = 0; i < 16; i++) { const az = -0.9 + i * 0.11 + R() * 0.04; F.push({ t: 'tower', az, wA: 0.035 + R() * 0.03, el: 0.06 + R() * 0.11, c: ['#3b4f7a', '#4a5f8c', '#2e3c5e', '#566a92', '#6b5c7d'][Math.floor(R() * 5)], win: R() * 1e6 | 0, spire: R() < 0.25 }); }
      for (let i = 0; i < 3; i++) F.push({ t: 'crane', az: -0.6 + i * 0.55 + R() * 0.1, el: 0.13 + R() * 0.05, flip: R() < 0.5 });
    }
    if (ex.includes('sea')) {   // the Arabian Sea on the open side: ships, a lighthouse, sails
      for (let i = 0; i < 5; i++) F.push({ t: 'ship', az: -0.15 + i * 0.5 + R() * 0.2, s: 0.6 + R() * 0.7, sail: R() < 0.5 });
      F.push({ t: 'lighthouse', az: 1.1, el: 0.05 });
    }
    return (skylineCache[id] = F);
  }
  function drawSkyline(cam, w, h, sc, hzY) {
    const fl = cam.fl, R = 900;
    const at = (az, el) => project(cam, dirPt(cam, az, el, R));
    const visible = az => { let d = az - cam.yaw; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return Math.abs(d) < 1.35; };
    const ridge = (fn, col, from, to) => {   // a filled silhouette from a height function of bearing
      ctx.fillStyle = col; ctx.beginPath(); let first = true;
      for (let az = cam.yaw - 1.4; az <= cam.yaw + 1.4; az += 0.012) { const q = at(az, fn(az)); if (!q) continue; if (first) { ctx.moveTo(q.x, h); first = false; } ctx.lineTo(q.x, q.y); }
      ctx.lineTo(w + 10, h); ctx.closePath(); ctx.fill();
    };
    if (sc.skyline === 'hills') {
      ridge(az => 0.07 + 0.035 * Math.sin(az * 3.1 + 1) + 0.02 * Math.sin(az * 7.3) + 0.01 * Math.sin(az * 17), 'rgba(120,150,175,.75)');
      ridge(az => 0.04 + 0.025 * Math.sin(az * 4.7 + 2) + 0.012 * Math.sin(az * 11.3), 'rgba(80,120,90,.9)');
      ridge(az => 0.018 + 0.01 * Math.sin(az * 9 + 0.5) + 0.006 * Math.sin(az * 23), '#4f7a3a');
      return;
    }
    if (sc.skyline === 'dunes') {
      ridge(az => 0.022 + 0.012 * Math.sin(az * 5 + 1) + 0.006 * Math.sin(az * 13), 'rgba(222,178,112,.85)');
    }
    if (sc.skyline === 'peaks') {   // jagged snow peaks, a darker forested range, then the valley floor
      const peak = az => 0.11 + 0.06 * Math.abs(Math.sin(az * 2.3 + 0.7)) + 0.035 * Math.abs(Math.sin(az * 5.9 + 1.3)) + 0.012 * Math.sin(az * 19);
      ridge(peak, 'rgba(132,150,178,.95)');
      ctx.save(); ctx.beginPath(); let first = true;   // snow caps: the top part of the same ridge
      for (let az = cam.yaw - 1.4; az <= cam.yaw + 1.4; az += 0.012) { const q = at(az, peak(az)); if (!q) continue; if (first) { ctx.moveTo(q.x, q.y); first = false; } else ctx.lineTo(q.x, q.y); }
      for (let az = cam.yaw + 1.4; az >= cam.yaw - 1.4; az -= 0.012) { const pk = peak(az), q = at(az, pk - 0.022 - 0.012 * Math.abs(Math.sin(az * 31))); if (q) ctx.lineTo(q.x, q.y); }
      ctx.closePath(); ctx.fillStyle = '#f4f7fb'; ctx.fill(); ctx.restore();
      ridge(az => 0.045 + 0.02 * Math.sin(az * 4.1 + 2) + 0.01 * Math.sin(az * 12.7), 'rgba(70,104,82,.92)');
      ridge(az => 0.016 + 0.006 * Math.sin(az * 8 + 0.5), '#5d8240');
    }
    if ((sc.extras || []).includes('sea')) {   // the sea: a band at the horizon on the open side, with sun glints
      const a = at(cam.yaw - 1.4, 0), b = at(cam.yaw + 1.4, 0);
      if (a && b) {
        const top = at(cam.yaw, 0.026), sy = top ? top.y : hzY - 14;
        const sg = ctx.createLinearGradient(0, sy, 0, hzY + 2); sg.addColorStop(0, '#2f7fb0'); sg.addColorStop(1, '#5fb3d6');
        ctx.fillStyle = sg; ctx.fillRect(0, sy, w, hzY + 2 - sy);
        ctx.fillStyle = 'rgba(255,255,255,.55)';
        for (let i = 0; i < 60; i++) { const az = cam.yaw - 1.4 + ((i * 0.618) % 1) * 2.8, el = 0.001 + ((i * 0.37) % 1) * 0.023, q = at(az + Math.sin(G.t * 0.5 + i) * 0.002, el); if (q) ctx.fillRect(q.x, q.y, 3 + (i % 4), 1); }
      }
    }
    const F = skylineFor(G.scene, sc), night = !!sc.nightDrawn;
    for (const f of F) {
      if (!visible(f.az)) continue;
      if (f.t === 'b') {
        const a = at(f.az, 0), b = at(f.az + f.wA, f.el); if (!a || !b) continue;
        const x0 = Math.min(a.x, b.x), x1 = Math.max(a.x, b.x), y0 = b.y, y1 = hzY + 2;
        ctx.fillStyle = f.c; ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
        ctx.fillStyle = 'rgba(0,0,0,.12)'; ctx.fillRect(x0, y0, x1 - x0, Math.max(1, (y1 - y0) * 0.06));   // parapet
        if (f.rail) { ctx.fillStyle = night ? '#15141f' : 'rgba(60,45,35,.5)'; for (let x = x0 + 2; x < x1 - 1; x += 4) ctx.fillRect(x, y0 - 3, 1, 3); ctx.fillRect(x0, y0 - 3, x1 - x0, 1); }
        if (f.tank) { const tw = (x1 - x0) * 0.22, th = tw * 0.8; ctx.fillStyle = night ? '#0e0e18' : '#2a2a2a'; ctx.fillRect(x0 + (x1 - x0) * 0.6, y0 - th, tw, th); }
        // windows: dark by day, warm and lit by night
        const rows = Math.max(1, Math.floor((y1 - y0) / 9)), cols = Math.max(1, Math.floor((x1 - x0) / 9)), rw = rng(f.win);
        for (let r = 0; r < rows; r++) for (let c2 = 0; c2 < cols; c2++) {
          const lit = rw() < (night ? 0.45 : 0); if (!night && rw() < 0.4) continue;
          ctx.fillStyle = night ? (lit ? '#ffcf6b' : 'rgba(0,0,0,.25)') : 'rgba(60,45,35,.35)';
          ctx.fillRect(x0 + 3 + c2 * 9, y0 + 4 + r * 9, 3, 4);
        }
      } else if (f.t === 'minaret') {
        const a = at(f.az, 0), b = at(f.az, f.el); if (!a || !b) continue;
        const wpx = Math.max(3, fl * 0.006);
        ctx.fillStyle = night ? '#2a2840' : sc.dusk ? '#4a3240' : '#e9dfcb'; ctx.fillRect(a.x - wpx / 2, b.y, wpx, a.y - b.y);
        ctx.fillRect(a.x - wpx, b.y + (a.y - b.y) * 0.25, wpx * 2, 2);
        ctx.beginPath(); ctx.arc(a.x, b.y, wpx * 0.9, Math.PI, 0); ctx.fill();
        if (night) { ctx.fillStyle = '#7dffb0'; ctx.fillRect(a.x - wpx, b.y + (a.y - b.y) * 0.25 - 1, wpx * 2, 1); }
      } else if (f.t === 'dome') {
        const a = at(f.az, f.el), b = at(f.az + f.wA * 0.5, f.el); if (!a || !b) continue;
        const r = Math.abs(b.x - a.x); ctx.fillStyle = night ? '#2f2d48' : sc.dusk ? '#553a4a' : '#f2ede2';
        ctx.beginPath(); ctx.ellipse(a.x, a.y, r, r * 1.1, 0, Math.PI, 0); ctx.fill();
      } else if (f.t === 'tree') {
        const a = at(f.az, 0), b = at(f.az, f.el); if (!a || !b) continue;
        const r = (a.y - b.y) * 0.55 * f.s; ctx.fillStyle = '#5b4632'; ctx.fillRect(a.x - 1, b.y, 2, a.y - b.y);
        ctx.fillStyle = '#3f7a33'; ctx.beginPath(); ctx.arc(a.x, b.y, r, 0, 7); ctx.arc(a.x - r * 0.6, b.y + r * 0.3, r * 0.7, 0, 7); ctx.arc(a.x + r * 0.6, b.y + r * 0.3, r * 0.7, 0, 7); ctx.fill();
      } else if (f.t === 'hut') {
        const a = at(f.az, 0), b = at(f.az + f.wA, f.el); if (!a || !b) continue;
        ctx.fillStyle = f.stone ? '#b9ad9c' : '#c9a77a'; ctx.fillRect(a.x, b.y, b.x - a.x, a.y - b.y);
        ctx.fillStyle = f.stone ? '#7d7266' : '#8a6a44'; ctx.fillRect(a.x - 1, b.y - 2, b.x - a.x + 2, 3);
      } else if (f.t === 'fort') {   // a desert fort: walls with round bastions
        const a = at(f.az, 0), b = at(f.az + f.wA, f.el); if (!a || !b) continue;
        const x0 = a.x, x1 = b.x, top = b.y, bot = hzY + 2, n = 7;
        ctx.fillStyle = '#c98f5a'; ctx.fillRect(x0, top + (bot - top) * 0.2, x1 - x0, (bot - top) * 0.8);
        for (let i = 0; i < n; i++) { const bx = x0 + (x1 - x0) * i / (n - 1), bw = (x1 - x0) / (n * 2.2); ctx.fillStyle = '#b97f4c'; ctx.fillRect(bx - bw / 2, top, bw, bot - top);
          ctx.fillStyle = '#a56f40'; for (let m = 0; m < 3; m++) ctx.fillRect(bx - bw / 2 + m * bw / 3, top - 3, bw / 5, 3); }
      } else if (f.t === 'poplar') {
        const a = at(f.az, 0), b = at(f.az, f.el); if (!a || !b) continue;
        const hh = a.y - b.y, ww = Math.max(2, hh * 0.22); ctx.fillStyle = '#3e6b34';
        ctx.beginPath(); ctx.ellipse(a.x, b.y + hh * 0.45, ww, hh * 0.55, 0, 0, 7); ctx.fill();
      } else if (f.t === 'mosque') {
        const a = at(f.az, 0), b = at(f.az + f.wA, f.el); if (!a || !b) continue;
        const x0 = Math.min(a.x, b.x), x1 = Math.max(a.x, b.x), top = b.y, bot = hzY + 2, W = x1 - x0, Hh = bot - top;
        const red = sc.dusk ? '#8a4a3e' : '#b8573f', dark = sc.dusk ? '#6e3a32' : '#94442f', white = '#f4efe6';
        ctx.fillStyle = red; ctx.fillRect(x0, top, W, Hh);   // prayer hall
        ctx.fillStyle = dark; for (let i = 0; i < 7; i++) { const ax = x0 + W * (0.1 + i * 0.13); ctx.beginPath(); ctx.moveTo(ax, bot); ctx.lineTo(ax, top + Hh * 0.45); ctx.quadraticCurveTo(ax + W * 0.04, top + Hh * 0.2, ax + W * 0.08, top + Hh * 0.45); ctx.lineTo(ax + W * 0.08, bot); ctx.fill(); }
        ctx.fillStyle = white;   // three domes, the middle one biggest
        for (const [cx, r] of [[0.5, 0.13], [0.25, 0.09], [0.75, 0.09]]) { const dx = x0 + W * cx, rr = W * r;
          ctx.beginPath(); ctx.moveTo(dx - rr, top); ctx.bezierCurveTo(dx - rr * 1.15, top - rr * 1.3, dx - rr * 0.2, top - rr * 1.5, dx, top - rr * 1.9); ctx.bezierCurveTo(dx + rr * 0.2, top - rr * 1.5, dx + rr * 1.15, top - rr * 1.3, dx + rr, top); ctx.fill(); }
        for (const mx of [-0.02, 1.02]) {   // corner minarets
          const xx = x0 + W * mx, mw = Math.max(2.5, W * 0.035), mt = top - Hh * 1.6;
          ctx.fillStyle = red; ctx.fillRect(xx - mw / 2, mt, mw, bot - mt);
          ctx.fillStyle = white; ctx.fillRect(xx - mw, mt + (bot - mt) * 0.35, mw * 2, 2); ctx.fillRect(xx - mw, mt + (bot - mt) * 0.65, mw * 2, 2);
          ctx.beginPath(); ctx.moveTo(xx - mw, mt); ctx.lineTo(xx + mw, mt); ctx.lineTo(xx + mw * 0.9, mt - mw * 0.8); ctx.lineTo(xx, mt - mw * 2.2); ctx.lineTo(xx - mw * 0.9, mt - mw * 0.8); ctx.fill();
        }
      } else if (f.t === 'minar') {   // a tall tapering tower in a park
        const a = at(f.az, 0), b = at(f.az, f.el); if (!a || !b) continue;
        const hh = a.y - b.y, wb = Math.max(4, hh * 0.07), wt = wb * 0.45;
        ctx.fillStyle = sc.dusk ? '#d8c8bb' : '#f1ece2'; ctx.beginPath(); ctx.moveTo(a.x - wb, a.y); ctx.lineTo(a.x - wt, b.y + hh * 0.08); ctx.lineTo(a.x + wt, b.y + hh * 0.08); ctx.lineTo(a.x + wb, a.y); ctx.fill();
        ctx.fillRect(a.x - wt * 1.6, b.y + hh * 0.08, wt * 3.2, 2); ctx.beginPath(); ctx.ellipse(a.x, b.y + hh * 0.06, wt * 1.1, hh * 0.06, 0, Math.PI, 0); ctx.fill();
        ctx.fillRect(a.x - 0.5, b.y - hh * 0.02, 1, hh * 0.04);
        ctx.fillStyle = 'rgba(0,0,0,.08)'; ctx.fillRect(a.x - wb * 1.6, a.y - hh * 0.06, wb * 3.2, hh * 0.06);
      } else if (f.t === 'tower') {
        const a = at(f.az, 0), b = at(f.az + f.wA, f.el); if (!a || !b) continue;
        const x0 = a.x, x1 = b.x, top = b.y, bot = hzY + 2;
        const tg = ctx.createLinearGradient(x0, 0, x1, 0); tg.addColorStop(0, f.c); tg.addColorStop(1, 'rgba(20,24,40,.95)'); ctx.fillStyle = tg; ctx.fillRect(x0, top, x1 - x0, bot - top);
        const rw = rng(f.win); ctx.fillStyle = sc.dusk ? 'rgba(255,200,120,.75)' : 'rgba(200,225,255,.5)';
        for (let y = top + 4; y < bot - 3; y += 5) for (let x = x0 + 2; x < x1 - 2; x += 4) if (rw() < 0.35) ctx.fillRect(x, y, 2, 2);
        if (f.spire) { ctx.fillStyle = '#2a3048'; ctx.fillRect((x0 + x1) / 2 - 0.7, top - (bot - top) * 0.18, 1.4, (bot - top) * 0.18); ctx.fillStyle = '#ff4040'; ctx.fillRect((x0 + x1) / 2 - 1, top - (bot - top) * 0.18 - 2, 2, 2); }
      } else if (f.t === 'crane') {
        const a = at(f.az, 0), b = at(f.az, f.el); if (!a || !b) continue;
        const hh = a.y - b.y, dir = f.flip ? -1 : 1; ctx.strokeStyle = '#e8b13a'; ctx.lineWidth = Math.max(1, hh * 0.012);
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(a.x, b.y); ctx.moveTo(a.x - dir * hh * 0.12, b.y); ctx.lineTo(a.x + dir * hh * 0.45, b.y); ctx.moveTo(a.x, b.y - hh * 0.06); ctx.lineTo(a.x + dir * hh * 0.45, b.y); ctx.moveTo(a.x + dir * hh * 0.35, b.y); ctx.lineTo(a.x + dir * hh * 0.35, b.y + hh * 0.18); ctx.stroke();
      } else if (f.t === 'ship') {
        const q = at(f.az + G.t * 0.0004, 0.008 + f.s * 0.006); if (!q) continue;
        const L = Math.max(6, fl * 0.02 * f.s); ctx.fillStyle = '#2d3a48';
        ctx.beginPath(); ctx.moveTo(q.x - L, q.y); ctx.lineTo(q.x + L, q.y); ctx.lineTo(q.x + L * 0.8, q.y + L * 0.18); ctx.lineTo(q.x - L * 0.85, q.y + L * 0.18); ctx.fill();
        if (f.sail) { ctx.fillStyle = '#f6f1e4'; ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(q.x, q.y - L * 1.1); ctx.lineTo(q.x + L * 0.6, q.y); ctx.fill(); }
        else { ctx.fillStyle = '#e9e4da'; ctx.fillRect(q.x - L * 0.5, q.y - L * 0.3, L * 0.6, L * 0.3); ctx.fillStyle = '#c0392b'; ctx.fillRect(q.x - L * 0.3, q.y - L * 0.5, L * 0.12, L * 0.2); }
      } else if (f.t === 'lighthouse') {
        const a = at(f.az, 0), b = at(f.az, f.el); if (!a || !b) continue;
        const hh = a.y - b.y, wb = Math.max(3, hh * 0.1);
        for (let i = 0; i < 5; i++) { ctx.fillStyle = i % 2 ? '#d33c3c' : '#f6f3ee'; const y0 = a.y - hh * i / 5, y1 = a.y - hh * (i + 1) / 5, k0 = 1 - i * 0.08, k1 = 1 - (i + 1) * 0.08; ctx.beginPath(); ctx.moveTo(a.x - wb * k0, y0); ctx.lineTo(a.x - wb * k1, y1); ctx.lineTo(a.x + wb * k1, y1); ctx.lineTo(a.x + wb * k0, y0); ctx.fill(); }
        ctx.fillStyle = '#ffe9a0'; ctx.fillRect(a.x - wb * 0.5, b.y - wb, wb, wb); ctx.fillStyle = '#333'; ctx.fillRect(a.x - wb * 0.7, b.y - wb * 1.3, wb * 1.4, wb * 0.3);
      } else if (f.t === 'kite') {   // other people's kites far off over the city - the festival all around you
        const q = at(f.az + Math.sin(G.t * 0.3 + f.ph) * 0.01, f.el + Math.sin(G.t * 0.7 + f.ph) * 0.006); if (!q) continue;
        const s = Math.max(2.5, fl * 0.005), rot = Math.sin(G.t * 1.3 + f.ph) * 0.4;
        ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(rot); ctx.fillStyle = night ? '#f4f4ff' : f.c;
        ctx.beginPath(); ctx.moveTo(0, -s); ctx.lineTo(s * 0.8, 0); ctx.lineTo(0, s * 1.1); ctx.lineTo(-s * 0.8, 0); ctx.closePath(); ctx.fill(); ctx.restore();
      }
    }
    if (sc.lights) drawStringLights(cam, F, at, visible);
    if (sc.haze) { const hg = ctx.createLinearGradient(0, hzY - fl * 0.06, 0, hzY + 2); hg.addColorStop(0, 'rgba(0,0,0,0)'); hg.addColorStop(1, sc.haze); ctx.fillStyle = hg; ctx.fillRect(0, hzY - fl * 0.06, w, fl * 0.06 + 2); }
  }
  function drawStringLights(cam, F, at, visible) {   // basant night: strings of coloured bulbs between rooftops
    const cols = ['#ff5d73', '#ffd166', '#06d6a0', '#5aa8ff', '#f78cff'];
    const b = F.filter(f => f.t === 'b' && visible(f.az));
    for (let i = 0; i < b.length - 1; i += 2) {
      const p0 = at(b[i].az + b[i].wA * 0.5, b[i].el + 0.004), p1 = at(b[i + 1].az + b[i + 1].wA * 0.5, b[i + 1].el + 0.004); if (!p0 || !p1) continue;
      for (let k = 0; k <= 8; k++) { const t = k / 8, x = p0.x + (p1.x - p0.x) * t, y = p0.y + (p1.y - p0.y) * t + Math.sin(Math.PI * t) * 6;
        ctx.fillStyle = cols[(i + k + Math.floor(G.t * 2)) % cols.length]; ctx.globalAlpha = 0.9; ctx.fillRect(x - 1, y - 1, 2.4, 2.4); }
    }
    ctx.globalAlpha = 1;
  }
  function drawNightSky(cam, w, h, sc) {
    for (const s of STARS) { const q = project(cam, dirPt(cam, s.az, s.el, 2000)); if (q) { ctx.globalAlpha = s.b * (0.7 + 0.3 * Math.sin(G.t * 2 + s.az * 9)); ctx.fillStyle = '#fff'; ctx.fillRect(q.x, q.y, 1.6, 1.6); } }
    ctx.globalAlpha = 1;
    if (sc.moon) { const q = project(cam, dirPt(cam, sc.moon.az, sc.moon.el, 1500)); if (q) { const r = cam.fl * 0.025;
      const g = ctx.createRadialGradient(q.x, q.y, 0, q.x, q.y, r * 4); g.addColorStop(0, 'rgba(255,250,220,.35)'); g.addColorStop(1, 'rgba(255,250,220,0)'); ctx.fillStyle = g; ctx.fillRect(q.x - r * 4, q.y - r * 4, r * 8, r * 8);
      ctx.fillStyle = '#fbf6dc'; ctx.beginPath(); ctx.arc(q.x, q.y, r, 0, 7); ctx.fill(); } }
    if (sc.beams) {   // basant nights in Lahore: floodlights sweeping up so the white kites show against the dark
      for (let i = 0; i < 5; i++) {
        const az = cam.yaw - 1 + i * 0.5, base = project(cam, dirPt(cam, az, 0.01, 900)); if (!base) continue;
        const sweep = Math.sin(G.t * 0.25 + i * 1.7) * 0.35, top = project(cam, dirPt(cam, az + sweep, 1.1, 900)); if (!top) continue;
        const hue = [205, 320, 45, 175, 270][i], g = ctx.createLinearGradient(base.x, base.y, top.x, top.y); g.addColorStop(0, `hsla(${hue},90%,82%,.3)`); g.addColorStop(1, `hsla(${hue},90%,82%,0)`);
        ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(base.x - 2, base.y); ctx.lineTo(top.x - 60, top.y); ctx.lineTo(top.x + 60, top.y); ctx.lineTo(base.x + 2, base.y); ctx.closePath(); ctx.fill();
      }
    }
  }

  /* ---------------- sprites ---------------- */
  // a neighbour's rooftop: a plain brick-and-plaster block with a parapet, its height the flier's roof height
  function drawRoof(cam, h) {
    const S = 4, z = h[2], c = [[-S, -S], [S, -S], [S, S], [-S, S]].map(([dx, dy]) => [h[0] + dx, h[1] + dy]);
    const top = c.map(q => project(cam, [q[0], q[1], z])), bot = c.map(q => project(cam, [q[0], q[1], 0]));
    if (top.some(q => !q) || bot.some(q => !q)) return;
    const night = !!(G.sc.nightDrawn || G.sc.night), dusk = !!G.sc.dusk;
    const wall = night ? ['#3a3850', '#2c2a3e'] : dusk ? ['#a8826a', '#8a6650'] : ['#d9cbb2', '#bfae92'];
    const faces = [0, 1, 2, 3].map(i => ({ i, d: Math.hypot((c[i][0] + c[(i + 1) % 4][0]) / 2 - cam.pos[0], (c[i][1] + c[(i + 1) % 4][1]) / 2 - cam.pos[1]) })).sort((a, b) => b.d - a.d);
    for (const f of faces) {
      const a = f.i, b = (f.i + 1) % 4;
      ctx.fillStyle = wall[f.i % 2]; ctx.beginPath(); ctx.moveTo(top[a].x, top[a].y); ctx.lineTo(top[b].x, top[b].y); ctx.lineTo(bot[b].x, bot[b].y); ctx.lineTo(bot[a].x, bot[a].y); ctx.closePath(); ctx.fill();
      if (!night) { ctx.fillStyle = 'rgba(70,50,35,.28)'; const wy = 0.45; ctx.fillRect((top[a].x * (1 - wy) + bot[a].x * wy + top[b].x * (1 - wy) + bot[b].x * wy) / 2 - 2, (top[a].y * (1 - wy) + bot[a].y * wy + top[b].y * (1 - wy) + bot[b].y * wy) / 2, 4, 5); }
      else { ctx.fillStyle = 'rgba(255,207,107,.8)'; ctx.fillRect((top[a].x + bot[a].x + top[b].x + bot[b].x) / 4 - 2, (top[a].y + bot[a].y + top[b].y + bot[b].y) / 4, 3, 4); }
    }
    ctx.fillStyle = night ? '#4a4862' : dusk ? '#c49a7c' : '#e8ddc8'; ctx.beginPath(); top.forEach((q, i) => i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y)); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = night ? '#24223a' : 'rgba(90,70,50,.55)'; ctx.lineWidth = 1.5; ctx.stroke();   // parapet edge
  }
  /* v6.3 PHONES: every rooftop figure was redrawn from scratch every frame - dozens of paths, gradients and an off-screen
   * lighting pass each - and that alone was over a third of a phone's whole frame budget (the "little bit stuck" feel).
   * Figures other than your own are now painted into a small sprite of their own and re-painted ~10 times a second
   * (often enough for breathing, hauling and dancing at their size); each frame only stamps the sprite. */
  const figCache = new Map(), figBudget = { n: 3, ms: 0 };
  function drawFig(key, x, y, h, look, pose, everyMs, prio = false) {
    const now = performance.now(), U = h * ((look && look.age) === 'kid' ? 0.72 : 1);
    if (now - (figCache.pruned || 0) > 5000) { figCache.pruned = now; for (const [key, e] of figCache) if (now - (e.used || 0) > 8000) figCache.delete(key); }   // kids come and go
    let c = figCache.get(key);
    const lk = look ? (look.id || '') + '|' + (look.expr || '') + '|' + (look.kameez || '') + '|' + (look.skin ?? '') : '';
    // first paint or a new look: now. A size change (the camera zooming in on a pecha changes EVERY figure's size at
    // once) used to force all of them to re-paint in the same frame - a freeze; now the old sprite is stretched to the
    // new size and the re-paints are spread over the next frames by the budget below
    const must = !c || c.lk !== lk;
    everyMs *= h < 22 ? 4 : h < 45 ? 2 : 1;   // v7.1: a figure a few pixels tall doesn't need 10 fresh paints a second
    /* v7.2 THE PECHA STALL (measured: single frames of 200-500 ms, almost all in repainting rooftop people). When the camera
     * zooms in on a pecha every figure's size changes a little each frame, and a 6% size change forced a repaint - your own
     * flier, which skips the per-frame budget, was repainted in full on EVERY frame of the zoom. Now a size change only
     * stretches the sprite (repaint at the normal pace, or after a 30% jump), each figure's repaint rate adapts to what its
     * painting really costs (never more than ~1/8 of the time), and repaints stop for the frame once ~4 ms went on them. */
    if (c && c.cost) everyMs = Math.max(everyMs, c.cost * 8);
    const sizeJump = c && Math.abs(c.h - h) > h * 0.3;
    const stale = must || ((now - c.t > everyMs || sizeJump || c.mode !== pose.mode) && (prio ? figBudget.ms < 8 : (figBudget.n > 0 && figBudget.ms < 4)));
    if (stale) {
      if (KF_DEBUG) { window.__figPaint = (window.__figPaint || 0) + 1; if (must) window.__figMust = (window.__figMust || 0) + 1; }
      if (!must && !prio) figBudget.n--;   // at most a few re-paints per frame, so they never all land on the same frame
      if (!c) { c = { cv: document.createElement('canvas') }; figCache.set(key, c); }
      // the sprite is never painted bigger than ~360 device pixels tall (the big flier right in front of you was ~1000)
      const sc = Math.min(DPR, h > 120 ? 1.5 : 2, 360 / (U * 2.15)), w = Math.ceil(U * 2.6), top = Math.ceil(U * 1.85), bot = Math.ceil(U * 0.3), ox = w / 2;
      const pw = Math.ceil(w * sc), ph = Math.ceil((top + bot) * sc);
      const ta0 = KF_DEBUG ? performance.now() : 0; if (c.cv.width < pw || c.cv.height < ph || c.cv.width > pw * 2) { c.cv.width = pw; c.cv.height = ph; dbgEv('figResize'); } dbgT('tFigAlloc', ta0);
      const g = c.cv.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, c.cv.width, c.cv.height); g.setTransform(sc, 0, 0, sc, 0, 0);
      const tf0 = KF_DEBUG ? performance.now() : 0; const out = Fliers.draw(g, ox, top, h, look, pose); dbgT('tFigPaint', tf0);
      const spent = performance.now() - now; figBudget.ms += spent; c.cost = c.cost ? c.cost * 0.7 + spent * 0.3 : spent;
      Object.assign(c, { t: now - (c.t ? 0 : Math.random() * everyMs), h, mode: pose.mode, lk, ox, top, w: c.cv.width / sc, hh: c.cv.height / sc, hand: out && out.hand ? [out.hand[0] - ox, out.hand[1] - top] : null });
    }
    c.used = now; const k = h / c.h;   // 1 unless the sprite is waiting for its re-paint at a new size
    ctx.drawImage(c.cv, x - c.ox * k, y - c.top * k, c.w * k, c.hh * k);
    return c.hand ? { hand: [x + c.hand[0] * k, y + c.hand[1] * k] } : null;
  }
  const spoolBmp = new Map();   // the reel pictures are SVGs: decoded to a bitmap once instead of re-rasterised every frame
  function spoolBitmap(im) { let b = spoolBmp.get(im); if (b === undefined && im.complete && im.naturalWidth) { b = document.createElement('canvas'); b.width = 96; b.height = Math.round(96 * im.naturalHeight / im.naturalWidth); b.getContext('2d').drawImage(im, 0, 0, b.width, b.height); spoolBmp.set(im, b); } return b || null; }
  function drawPerson(cam, p, isViewer) {
    const H0 = homeOf(p), A = [H0[0], H0[1], H0[2]], base = project(cam, A), head = project(cam, [H0[0], H0[1], H0[2] + 1.85]); if (!base || !head) return;
    const hgt = base.y - head.y; if (hgt < 3) return;
    const ch = p.look ? { drawn: { ...Fliers.BASE, ...p.look } } : charById(p.char); let handOut = null;
    const k = p.kite, faceYaw = k ? Math.atan2(k.p[1] - A[1], k.p[0] - A[0]) : 0, viewYaw = Math.atan2(A[1] - cam.pos[1], A[0] - cam.pos[0]);
    {
      // drawn flier: faces their kite, both hands on the line pointing at it (in screen space), working it.
      // After a cut they celebrate (arms jerk up, big grin); after losing a kite they stand a moment, serious.
      const ks = k ? project(cam, k.p) : null, shoulder = [base.x, base.y - hgt * 0.78];
      const aim = ks ? [ks.x - shoulder[0], ks.y - shoulder[1]] : [0.3, -1];
      const ts0 = KF_DEBUG ? performance.now() : 0; const sp = spoolBitmap(spoolImg(spoolFor(p), THREADS[p.thread].color)); dbgT('tSpool', ts0); if (sp) { const ss = hgt * 0.24; ctx.drawImage(sp, base.x - hgt * 0.42, base.y - ss * 0.9, ss, ss * sp.height / sp.width); }
      const live = k && !k.free, mode = !live ? 'idle' : (k.pullE > 0.2 || p.landing) ? 'pull' : k.sendE > 0.25 ? 'send' : 'idle';
      const cheer = G.t - (p.cheerT ?? -99) < 2.2, sad = G.t - (p.sadT ?? -99) < 2.5;
      const look = cheer ? { ...ch.drawn, expr: 'grin' } : sad ? { ...ch.drawn, expr: 'serious' } : ch.drawn;
      const tug = cheer ? Math.max(0, Math.sin((G.t - p.cheerT) * 9)) : live ? (k.tunkaT || 0) : 0;
      const pose = { face: faceYaw - viewYaw, aim, t: G.t + p.slot * 0.7, mode, tug, lineColor: k ? k.thread.color : '#fff', haulPh: live && k.pullE > 0.05 ? k.haulPh : null, haul: live ? k.haul : 0 };
      // your own flier (big, right in front of you) is drawn live every frame; everyone else as a sprite
      // (your own flier too, but re-painted ~25 times a second and never held back by the per-frame budget)
      handOut = drawFig('p' + p.slot + (curViewer && curViewer.lootcam ? 'L' : ''), base.x, base.y, hgt, look, pose, isViewer ? (QUAL.low ? 66 : 45) : (QUAL.low ? 160 : 100), isViewer);
    }
    ctx.textAlign = 'center'; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,.6)';
    const isHuman = p.ctrl.startsWith('human'); ctx.font = `bold ${Math.round(clamp(hgt * 0.12, 10, 18))}px sans-serif`;
    const ly = head.y - 8 - hgt * 0.08;
    ctx.strokeText(p.name, base.x, ly); ctx.fillStyle = isHuman ? '#27e04a' : G.teams ? TEAM_TINT[teamOf(p)] : '#ffffff'; ctx.fillText(p.name, base.x, ly);
    if (p.bubble && p.bubble.t > 0) {   // quick-chat bubble over the flier's head
      const B = p.bubble, a = clamp(B.t / 0.4, 0, 1) * clamp((3.2 - B.t) / 0.15 + 0.2, 0, 1), fs = Math.round(clamp(hgt * 0.13, 11, 16));
      ctx.save(); ctx.globalAlpha = a; ctx.font = `700 ${fs}px Inter,system-ui,sans-serif`; ctx.textAlign = 'center';
      const tw = ctx.measureText(B.text).width + 18, bx = base.x, by = ly - fs * 1.9;
      ctx.fillStyle = 'rgba(255,255,255,.95)'; rrect(bx - tw / 2, by - fs, tw, fs * 1.7, fs * 0.8); ctx.fill();
      ctx.beginPath(); ctx.moveTo(bx - 5, by + fs * 0.7 - 1); ctx.lineTo(bx + 5, by + fs * 0.7 - 1); ctx.lineTo(bx, by + fs * 0.7 + 6); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#1a2036'; ctx.fillText(B.text, bx, by + fs * 0.25); ctx.restore();
    }
    return handOut && handOut.hand ? { x: handOut.hand[0], y: handOut.hand[1], h: hgt } : null;
  }
  /* ---------------- rooftop parties: a DJ roof and a dhol roof across the street ----------------
   * Both dance to the beat you hear (Sound.partyBeat), so what you see and hear stay together. */
  const PARTY = [{ kind: 'dj', home: [58, -30, 4], crew: ['danish', 'sana', 'fahad', 'ayesha'] }, { kind: 'dhol', home: [26, 20, 2.5], crew: ['raju', 'hamza', 'zara', 'bilal'] }];
  const partyLook = id => { const p = Fliers.PRESETS.find(x => x.id === id) || Fliers.PRESETS[0]; return { ...Fliers.BASE, ...p }; };
  function drawParty(cam, P) {
    const H = P.home, base = project(cam, H), head = project(cam, [H[0], H[1], H[2] + 1.8]); if (!base || !head) return;
    const h = base.y - head.y; if (h < 4) return;
    const beat = SFX.partyBeat ? SFX.partyBeat() : G.t * 2.13, ph = beat * Math.PI, kickF = Math.pow(1 - (beat % 1), 3), night = G.sc.nightDrawn || G.sc.night;
    let fi = 0; const fig = (dx, look, pose, bounce = 0) => { const x = base.x + dx * h, y = base.y - Math.abs(bounce) * h * 0.05; drawFig(P.kind + (fi++) + (curViewer && curViewer.lootcam ? 'L' : ''), x, y, h, look, { face: Math.PI * 0.95, t: G.t, mode: 'idle', lineColor: 'rgba(0,0,0,0)', ...pose }, QUAL.low ? 140 : 70); };
    if (P.kind === 'dj') {
      if (night && !QUAL.low) {   // party lights sweeping up off the roof
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 3; i++) { const a = -Math.PI / 2 + Math.sin(G.t * 0.9 + i * 2.1) * 0.6, L = h * 6, x0 = base.x + (i - 1) * h * 0.6, y0 = base.y - h * 0.9;
          const g = ctx.createLinearGradient(x0, y0, x0 + Math.cos(a) * L, y0 + Math.sin(a) * L), hue = [300, 190, 50][i]; g.addColorStop(0, `hsla(${hue},100%,65%,.35)`); g.addColorStop(1, `hsla(${hue},100%,65%,0)`);
          ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0 + Math.cos(a - 0.12) * L, y0 + Math.sin(a - 0.12) * L); ctx.lineTo(x0 + Math.cos(a + 0.12) * L, y0 + Math.sin(a + 0.12) * L); ctx.closePath(); ctx.fill(); }
        ctx.restore();
      }
      P.crew.slice(1).forEach((id, i) => { const b = Math.sin(ph + i * 0.9); fig(-1.1 + i * 0.55 + (i > 0 ? 1.1 : 0), partyLook(id), { aim: [Math.sin(ph * 0.5 + i) * 0.8, -1], tug: Math.abs(b) * 0.5 }, b); });
      fig(0, partyLook(P.crew[0]), { aim: [0.5, 0.4], mode: 'pull', haulPh: ph * 0.5, haul: 0.4 });   // the DJ, hands on the decks
      // the decks: a table with a glowing level meter, and two speakers that thump on the kick
      const tw = h * 0.9, th = h * 0.32, tx = base.x - tw / 2, ty = base.y - h * 0.42;
      ctx.fillStyle = '#16161f'; ctx.fillRect(tx, ty, tw, th); ctx.fillStyle = '#2b2b3a'; ctx.fillRect(tx, ty, tw, th * 0.18);
      for (let i = 0; i < 9; i++) { const lv = 0.25 + 0.75 * Math.abs(Math.sin(beat * 1.7 + i * 0.8)) * (0.5 + 0.5 * kickF); ctx.fillStyle = `hsl(${120 - lv * 120},100%,55%)`; ctx.fillRect(tx + tw * 0.08 + i * tw * 0.095, ty + th * 0.9 - th * 0.6 * lv, tw * 0.06, th * 0.6 * lv); }
      for (const sx of [-1, 1]) {
        const sw = h * 0.36 * (1 + kickF * 0.05), sh = h * 0.62 * (1 + kickF * 0.05), x = base.x + sx * h * 0.85 - sw / 2, y = base.y - sh;
        ctx.fillStyle = '#101018'; ctx.fillRect(x, y, sw, sh); ctx.strokeStyle = '#33334a'; ctx.lineWidth = Math.max(1, h * 0.012); ctx.strokeRect(x, y, sw, sh);
        ctx.fillStyle = '#2a2a3c'; for (const [cy, r] of [[0.3, 0.3], [0.72, 0.36]]) { ctx.beginPath(); ctx.arc(x + sw / 2, y + sh * cy, sw * r * (1 + (cy > 0.5 ? kickF * 0.12 : 0)), 0, 7); ctx.fill(); }
        if (night) { ctx.fillStyle = `hsla(${(G.t * 120) % 360},100%,60%,${0.4 + 0.5 * kickF})`; ctx.fillRect(x, y + sh - h * 0.03, sw, h * 0.03); }
      }
    } else {
      // the dhol player in the middle, bhangra dancers round him, arms up and shoulders going
      P.crew.slice(1).forEach((id, i) => { const b = Math.sin(ph + i * 1.3); fig([-0.75, 0.75, 1.35][i], partyLook(id), { aim: [(i % 2 ? 1 : -1) * (0.3 + 0.5 * Math.abs(Math.sin(ph * 0.5 + i))), -1], tug: Math.abs(b) * 0.7 }, b); });
      fig(0, partyLook(P.crew[0]), { aim: [0.2, 0.6] }, Math.sin(ph) * 0.4);
      const dw = h * 0.42, dh = h * 0.2, dx = base.x - dw / 2, dy = base.y - h * 0.52;
      ctx.fillStyle = '#7a3e1d'; ctx.fillRect(dx, dy, dw, dh); ctx.strokeStyle = '#d62828'; ctx.lineWidth = Math.max(1, h * 0.012);
      for (let i = 1; i < 6; i++) { ctx.beginPath(); ctx.moveTo(dx + dw * i / 6, dy); ctx.lineTo(dx + dw * (i - 0.5) / 6, dy + dh); ctx.stroke(); }
      ctx.fillStyle = '#e8d9b0'; for (const ex of [dx, dx + dw]) { ctx.beginPath(); ctx.ellipse(ex, dy + dh / 2, dw * 0.09, dh * 0.55, 0, 0, 7); ctx.fill(); }
      ctx.strokeStyle = '#3b2412'; ctx.lineWidth = Math.max(1.2, h * 0.018);   // the two sticks, striking on the beat
      const hit = Math.pow(Math.abs(Math.sin(ph)), 4);
      ctx.beginPath(); ctx.moveTo(dx - dw * 0.1, dy - h * 0.12); ctx.lineTo(dx + dw * 0.05, dy + dh * 0.4 - (1 - hit) * h * 0.12);
      ctx.moveTo(dx + dw * 1.1, dy - h * 0.1); ctx.lineTo(dx + dw * 0.95, dy + dh * 0.4 - hit * h * 0.12); ctx.stroke();
    }
  }
  function drawPivotDebug(cam, k) {
    const s = project(cam, k.p); if (!s) return;
    const arrow = (dir, color, len) => {
      const tip = project(cam, [k.p[0] + dir[0] * len, k.p[1] + dir[1] * len, k.p[2] + dir[2] * len]); if (!tip) return;
      ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(tip.x, tip.y); ctx.stroke();
      ctx.fillStyle = color; ctx.beginPath(); ctx.arc(tip.x, tip.y, 3, 0, 7); ctx.fill();
    };
    const lineDir = norm3([k.p[0] - k.anchor[0], k.p[1] - k.anchor[1], k.p[2] - k.anchor[2]]);
    arrow(lineDir, '#ffe066', -3);
    const speed = Math.hypot(...k.v);
    if (speed > 0.2) arrow(k.v.map(x => x / speed), '#4d9dff', 3);
    arrow(k.nose, '#3ddc4b', 3);
    if (Math.abs(k.spinVel) > 0.3 || k.incl > 0.05) {
      ctx.strokeStyle = '#b26bff'; ctx.lineWidth = 2; ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.arc(s.x, s.y, 16, 0, 7); ctx.stroke(); ctx.setLineDash([]);
      const a = k.spinAngle; ctx.beginPath(); ctx.arc(s.x, s.y, 16, a, a + Math.sign(k.spinVel || 1) * 0.9); ctx.lineWidth = 4; ctx.stroke();
    }
    ctx.fillStyle = '#ff3b3b'; ctx.beginPath(); ctx.arc(s.x, s.y, 5, 0, 7); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();
  }
  // the wrapped kite's own dor: a short sagging tether from the coil on your line up to the kite
  function drawWrap(cam, d) {
    const h = d.caught.hook, p = d.p, n = 8, pts = [];
    const sag = Math.min(0.6, Math.hypot(p[0] - h[0], p[1] - h[1], p[2] - h[2]) * 0.12);
    for (let i = 0; i <= n; i++) { const t = i / n; pts.push([h[0] + (p[0] - h[0]) * t, h[1] + (p[1] - h[1]) * t, h[2] + (p[2] - h[2]) * t - sag * 4 * t * (1 - t)]); }
    polyline(cam, pts, d.thread.color, 1.3, 0.95);
    const q = project(cam, h); if (!q) return;
    const r = clamp(cam.fl / q.d * 0.18, 2, 6);   // the coil: a few turns of thread wrapped round the line
    ctx.save(); ctx.strokeStyle = d.thread.color; ctx.lineWidth = 1.2; ctx.globalAlpha = 0.95;
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.ellipse(q.x + (i - 1) * r * 0.45, q.y, r * 0.35, r, 0.5, 0, 7); ctx.stroke(); }
    ctx.restore();
  }
  function norm3(v) { const l = Math.hypot(...v) || 1; return [v[0] / l, v[1] / l, v[2] / l]; }
  // where a kite sits on screen this frame: size, rotation and the kanni knot (shared by the kite and its dor, so the
  // dor meets the knot exactly)
  // on-screen size of a kite. The picture keeps its own proportions (it used to be squashed and stretched with the
  // angle of attack every frame, which made the kite's shape look irregular while flying)
  function kiteSize(cam, k, s) {
    const spec = k.spec, raw = spec.size.w * KITE_VIS * cam.fl / s.d, im = kiteImg(k.entry || k.owner.entry);
    const px = clamp(raw < 34 ? raw : 34 + (raw - 34) * 0.35, 5, cam.fl * 0.12);
    const ratio = im && im.naturalWidth ? im.naturalHeight / im.naturalWidth : spec.size.h / spec.size.w;
    return { px, py: Math.max(px * ratio, 5) };
  }
  function kiteGeom(cam, k, pts) {
    if (!pts && k._gm && k._gm.cam === cam) return k._gm.gm;   // already worked out this frame, from the dor being drawn
    const s = project(cam, k.p); if (!s) return null;
    const { px, py } = kiteSize(cam, k, s);
    const lean = k.free ? 0 : (k.lean || 0), tk = k.tunkaT || 0, swing = tk * 0.28 * Math.sin((1 - tk) * 15) * (k.tunkaDir || 1);
    const rot = k.bodyAngle + lean * 0.14 + swing + kiteAtt(k).rot;
    // THE KNOT IS ON THE DOR. Walk the dor's own screen path back from the kite until it is a kanni's length away
    // from the kite's centre: that point is the knot, so the line always ends exactly where the two kanni strings
    // meet (it used to aim at the flier in a straight line and add a sideways offset, so the dor bent into the knot
    // or missed it). `cut` = how many line points to draw before the final stroke into the knot.
    const kl = clamp(py * 0.3, 5, 26);   // kanni: from the sail to the knot is short on a real patang - about a third of its height
    let knot = { x: s.x, y: s.y + kl }, cut = -1;
    pts = pts || k.linePoints(24);
    let prev = { x: s.x, y: s.y };
    for (let i = pts.length - 1; i >= 0; i--) {
      const q = project(cam, pts[i]); if (!q) break;
      const d = Math.hypot(q.x - s.x, q.y - s.y);
      if (d >= kl) {
        const dp = Math.hypot(prev.x - s.x, prev.y - s.y), t = clamp((kl - dp) / ((d - dp) || 1), 0, 1);
        knot = { x: prev.x + (q.x - prev.x) * t, y: prev.y + (q.y - prev.y) * t }; cut = i; break;
      }
      prev = q;
    }
    const dx = knot.x - s.x, dy = knot.y - s.y, c = Math.cos(-rot), sn = Math.sin(-rot);
    const gm = { s, px, py, rot, lean, kx: dx * c - dy * sn, ky: dx * sn + dy * c, knot, cut };
    k._gm = { cam, gm };
    return gm;
  }
  /* ---------------- v7.1: the kite as a real, bowed paper sail ----------------
   * Up to v7.0 every kite was one flat picture: rotated, squashed a little for its tilt, and nothing else - while the
   * physics was already working out a full 3D attitude (bank `roll`, pitch) that was never shown. A real patang is a
   * paper sail on a bent bamboo bow (kaman): the wings sweep back, it banks into a turn, rocks in the gusts, and the
   * trailing corners of the paper flutter. The picture is now cut into a small grid and each cell is placed in 3D:
   *   - bow: the wings bend back (more under load: fast flight, khainch), with a little quiver
   *   - bank (physics roll + into the turn) and pitch (tilt), with an under-damped spring so it rocks and settles
   *   - flutter: a travelling wave on the wing tips and tail corners
   *   - shade: cells turned away from you are drawn a touch darker, which is what makes the curve read as a curve
   * Everything here is drawing only: the flight model, the server and the pecha rules are untouched.
   * Pictures are drawn from small pre-scaled copies (mipmaps): sharper (no shimmer when a 512 px picture is squeezed into
   * 30 px) and cheaper for the phone. */
  let frameNo = 0, mipBudget = 2;
  const dbgEv = KF_DEBUG ? (k => { const E = window.__ev = window.__ev || {}; E[k] = (E[k] || 0) + 1; }) : () => {};
  const dbgT = KF_DEBUG ? ((k, t0) => { const E = window.__ev = window.__ev || {}; E[k] = +((E[k] || 0) + performance.now() - t0).toFixed(2); }) : () => {};
  function kiteMip(im, need) {   // need = device pixels across the drawn kite
    const W0 = im.naturalWidth || im.width, H0 = im.naturalHeight || im.height; if (!W0 || !H0) return null;
    let m = im._mips; if (!m || m.w !== W0) m = im._mips = { w: W0, lv: {}, dk: {} };
    let target = 32; while (target < need * 1.2 && target < 512) target *= 2;
    if (target >= Math.max(W0, H0)) return im;
    if (m.lv[target]) return m.lv[target];
    if (mipBudget <= 0) { for (const t of [target * 2, target * 4, target / 2]) if (m.lv[t]) return m.lv[t]; return im; }   // made over the next frames, never all at once
    mipBudget--; dbgEv('mip');
    const sc = target / Math.max(W0, H0), tw = Math.max(1, Math.round(W0 * sc)), th = Math.max(1, Math.round(H0 * sc));
    let src = im, sw = W0, sh = H0;
    while (sw / 2 >= tw * 1.01) {   // halve step by step: a clean downscale, no aliasing
      const nw = Math.round(sw / 2), nh = Math.round(sh / 2), t = document.createElement('canvas'); t.width = nw; t.height = nh;
      const g = t.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(src, 0, 0, nw, nh); src = t; sw = nw; sh = nh; }
    const c = document.createElement('canvas'); c.width = tw; c.height = th; const g = c.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(src, 0, 0, tw, th);
    return (m.lv[target] = c);
  }
  /* v7.2 WARM-UP: a kite picture used to be decoded, scaled down and shaded the first time it was DRAWN - in the middle of
   * a frame, exactly when a new kite came into the fight (a respawn, a loot kite drifting over, the camera closing in on a
   * pecha). Now every kite of the match is decoded off the main thread when the match starts, and its scaled copies are
   * made in the idle moments between frames, a little at a time. */
  const idle = typeof requestIdleCallback === 'function' ? (f => requestIdleCallback(f, { timeout: 400 })) : (f => setTimeout(f, 60));
  const warmQ = [];
  function warmKite(entry) {
    if (!entry) return; const im = kiteImg(entry); if (!im || im._warm) return; im._warm = 1;
    const go = () => { warmQ.push([im, 64], [im, 128]); pumpWarm(); };
    if (im.decode && !im.recipe && im.src) im.decode().then(go, go); else if (im.ready && im.ready.then) im.ready.then(go, go); else go();
  }
  let warmBusy = false;
  function pumpWarm() {
    if (warmBusy || !warmQ.length) return; warmBusy = true;
    idle(deadline => {
      warmBusy = false;
      while (warmQ.length && (!deadline || !deadline.timeRemaining || deadline.timeRemaining() > 4)) {
        const [im, lvl] = warmQ.shift(); if (!(im.naturalWidth || im.width)) continue;
        const keep = mipBudget; mipBudget = 1; const m = kiteMip(im, lvl / 1.25); mipBudget = keep;
        if (m && m !== im && !QUAL.low) kiteShadeOf(m);
        if (!deadline || !deadline.timeRemaining) break;   // setTimeout fallback: one per tick
      }
      pumpWarm();
    });
  }
  function kiteShadeOf(src) {   // the same picture in shadow (only where the paper is - alpha kept), for the turned-away cells
    if (src._dark) return src._dark; dbgEv('shade');
    const w = src.naturalWidth || src.width, h = src.naturalHeight || src.height; if (!w) return null;
    const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
    g.drawImage(src, 0, 0); g.globalCompositeOperation = 'source-atop'; g.fillStyle = 'rgba(10,8,20,.62)'; g.fillRect(0, 0, w, h);
    return (src._dark = c);
  }
  // the sail's attitude for drawing: physics bank/pitch + a springy rock, per kite, advanced on match time
  function kiteAtt(k) {
    let a = k._att;
    if (!a) a = k._att = { r: k.roll || 0, rv: 0, p: 0, pv: 0, z: 0, zv: 0, gt: G.t, tk: 0, flT: Math.random() * 9, roll: 0, pitch: 0, rot: 0, bow: 0.12, flA: 0.02 };
    const dt = clamp(G.t - a.gt, 0, 0.05); a.gt = G.t;
    if (dt <= 0) return a;
    const t = k.t || G.t, ph = k.swayPh || 0, free = !!k.free, send = free ? 0 : (k.sendE || 0), pull = free ? 0 : (k.pullE || 0);
    const v = k.v || [0, 0, 0], spd = Math.hypot(v[0], v[1], v[2]);
    const load = free ? 0.12 : clamp(spd / 12, 0, 1) * 0.6 + clamp(pull, 0, 1) * 0.4;
    const loose = free ? 1 : clamp(0.35 + send * 0.9 - pull * 0.3, 0, 1.2);   // a slack line lets the sail rock more
    const n1 = 0.55 * Math.sin(2.1 * t + ph) + 0.3 * Math.sin(3.7 * t + 2.3 * ph) + 0.15 * Math.sin(6.3 * t + 0.7 * ph);
    const n2 = 0.6 * Math.sin(1.7 * t + 1.9 * ph) + 0.4 * Math.sin(4.3 * t + 0.4 * ph);
    /* v7.2 CALMER SAIL: players found the kite "too disturbed" on steer, tunka and khainch. Measured (close-ups, hilal kite):
     * steering tipped the sail 52 deg (almost edge-on, a sliver), khainch bent the wings back 28% of the kite's width, each
     * tunka kicked it hard. Now: tilt at most ~22 deg, a stiffer, well-damped spring (no overshoot), gentle bend and flutter. */
    const turnBank = clamp(-(k.headingVel || 0) * 0.03, -0.2, 0.2);
    const rT = (free ? 0 : (k.roll || 0)) * 0.35 + turnBank + n1 * (0.05 + 0.1 * loose);
    const tk = k.tunkaT || 0; if (tk > a.tk + 0.2) { a.rv += (k.tunkaDir || 1) * 1.4; a.pv -= 0.9; } a.tk = tk;   // a tunka nudges the sail
    a.rv += (90 * (rT - a.r) - 13 * a.rv) * dt; a.r = clamp(a.r + a.rv * dt, -0.3, 0.3);   // v7.3: at most ~17 deg   // ~1.5 Hz, well damped
    const pT = n2 * 0.07 * (0.4 + loose) + pull * 0.08 - send * 0.05;
    a.pv += (90 * (pT - a.p) - 9 * a.pv) * dt; a.p += a.pv * dt;
    a.zv += (60 * (n2 * 0.09 * loose - a.z) - 8 * a.zv) * dt; a.z += a.zv * dt;   // a small rock in the picture plane
    a.flT += dt * (9 + 6 * load);
    /* v7.4 GHOOMNA IN 3D, as in the reference video: a patang spinning on slack line hangs tipped back on its line, and
     * that tilt stays put in the sky while the kite turns round underneath it - so as it spins you see it from every side
     * in turn (narrow one moment, full face the next). In the kite's own frame the tilt axis therefore turns against the
     * spin (-bodyAngle). Rigid: the whole kite tilts, nothing bends. */
    const spinV = free ? 0 : clamp(Math.max(k.idleE || 0, k.spinE || 0), 0, 1), tilt = spinV * (0.42 + 0.12 * Math.sin(0.9 * t + ph)), ax = -(k.bodyAngle || 0) + ph;
    a.roll = a.r + tilt * Math.sin(ax); a.pitch = (k.incl || 0) + clamp(a.p, -0.15, 0.15) + tilt * 0.8 * Math.cos(ax) + spinV * 0.12;
    a.rot = clamp(a.z, -0.13, 0.13);
    // v7.4 RIGID SAIL: the reference kite never bends or ripples - it is one stiff plane that tilts. Players found our
    // bowed, fluttering paper "disturbed" on tunka, khainch, fly and steering, so the bend and flutter are gone.
    a.bow = 0; a.flA = 0;
    return a;
  }
  /* draw the picture as a bowed sail. W,H: drawn size; x0,y0: its top-left in the kite's own (rotated) frame;
   * cx,cy: the point it turns about; devPx: device pixels across it (decides mip level and grid size).
   * Returns the projection (u,v in 0..1 -> [x,y]) so the kanni strings can be tied to the same sail. */
  function drawSail(im, W, H, x0, y0, cx, cy, att, devPx) {
    if (KF_DEBUG && !im._seenDraw) { im._seenDraw = 1; dbgEv('firstDraw'); }
    const src = kiteMip(im, devPx) || im, SW = src.naturalWidth || src.width, SH = src.naturalHeight || src.height;
    // v7.4: the sail is a flat, rigid plane now - a few cells are enough for its perspective (no bend to follow)
    const flat = !att.bow && !att.flA, cols = devPx < 28 ? 1 : flat ? (devPx < 100 ? 2 : 4) : devPx < 64 ? 4 : devPx < 130 ? 6 : 8, rows = devPx < 28 ? 1 : flat ? 2 : devPx < 100 ? 2 : 3;
    const cp = Math.cos(att.pitch), sp = Math.sin(att.pitch), cr = Math.cos(att.roll), sr = Math.sin(att.roll), f = Math.max(W, H) * 4.5;
    const bow = cols > 1 ? att.bow * W : 0, flA = cols > 1 ? att.flA * W : 0, flT = att.flT;
    const P = (u, v) => {
      const uu = u * 2 - 1, X = x0 + u * W - cx, Y = y0 + v * H - cy, au = Math.abs(uu);
      const Z = bow * uu * uu * (1 - 0.45 * v) + flA * Math.sin(flT + uu * 2.4 + v * 3.1) * au * au * Math.sqrt(au) * (0.35 + 0.65 * v);
      const y1 = Y * cp - Z * sp, z1 = Y * sp + Z * cp, x2 = X * cr + z1 * sr, z2 = -X * sr + z1 * cr, q = f / Math.max(f * 0.35, f + z2);
      return [cx + x2 * q, cy + y1 * q];
    };
    const n = cols + 1, pts = new Array(n * (rows + 1));
    for (let j = 0; j <= rows; j++) for (let i = 0; i <= cols; i++) pts[j * n + i] = P(i / cols, j / rows);
    const B = ctx.getTransform(), sw = SW / cols, sh = SH / rows, cw = W / cols, dark = cols > 1 && !QUAL.low ? kiteShadeOf(src) : null;
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const p00 = pts[j * n + i], p10 = pts[j * n + i + 1], p01 = pts[(j + 1) * n + i];
      const sx = i * sw, sy = j * sh, ow = i < cols - 1 ? Math.min(1, SW - sx - sw) : 0, oh = j < rows - 1 ? Math.min(1, SH - sy - sh) : 0;   // 1 px overlap: no seams
      const a = (p10[0] - p00[0]) / sw, b = (p10[1] - p00[1]) / sw, c = (p01[0] - p00[0]) / sh, d = (p01[1] - p00[1]) / sh, e = p00[0], ff = p00[1];
      ctx.setTransform(B.a * a + B.c * b, B.b * a + B.d * b, B.a * c + B.c * d, B.b * c + B.d * d, B.a * e + B.c * ff + B.e, B.b * e + B.d * ff + B.f);
      ctx.drawImage(src, sx, sy, sw + ow, sh + oh, 0, 0, sw + ow, sh + oh);
      if (dark) {   // turned away from you (squeezed across) -> a little darker
        const sq = Math.hypot(p10[0] - p00[0], p10[1] - p00[1]) / cw, shade = clamp((0.97 - sq) * 1.1, 0, 0.3);
        if (shade > 0.03) { const ga = ctx.globalAlpha; ctx.globalAlpha = ga * shade; ctx.drawImage(dark, sx, sy, sw + ow, sh + oh, 0, 0, sw + ow, sh + oh); ctx.globalAlpha = ga; }
      }
    }
    ctx.setTransform(B);
    return P;
  }
  function drawKite(cam, k, isOwn, alpha = 1, dt = 0) {
    const s = project(cam, k.p); if (!s) return;
    // VIS exaggerates the kite so a 40 cm patang is readable 60 m away. Far kites keep roughly that size, but the
    // size now grows much more slowly as a kite comes close (it used to fill a third of the screen near the flier)
    const im = kiteImg(k.entry || k.owner.entry), { px, py } = kiteSize(cam, k, s);
    const flap = 1 + 0.012 * Math.sin(k.t * 7 + k.swayPh);   // the paper breathes a little in the wind - not a wobble
    const lean = k.free ? 0 : (k.lean || 0);
    // a kite on an off-centre kanni hangs tilted toward that wing; a tunka gives a quick pendulum swing that settles
    const tk = k.tunkaT || 0, swing = tk * 0.28 * Math.sin((1 - tk) * 15) * (k.tunkaDir || 1);
    const att = kiteAtt(k), rot = k.bodyAngle + lean * 0.14 + swing + att.rot;
    const pivotX = lean * 0.07 * px, pivotY = -clamp(k.kanni * 3.2, -0.4, 0.4) * py;

    // (Basant night used to put a glowing halo and chasing LED points on every patang - removed: kites fly plain at night)
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(s.x, s.y);
    ctx.rotate(rot);
    ctx.save();
    let sailP = null; const sx0 = -px * flap / 2 - pivotX, sy0 = -py / 2 - pivotY;
    if (im.complete && im.naturalWidth) {
      sailP = drawSail(im, px * flap, py, sx0, sy0, -pivotX, -pivotY, att, Math.max(px, py) * DPR);
    } else {
      if (k.incl > 0.01) ctx.scale(1, Math.cos(k.incl));
      ctx.fillStyle = (k.owner && k.owner.color) || '#e8dcc0';
      ctx.beginPath();
      ctx.moveTo(-pivotX, -py / 2 - pivotY);
      ctx.lineTo(px / 2 - pivotX, -pivotY);
      ctx.lineTo(-pivotX, py / 2 - pivotY);
      ctx.lineTo(-px / 2 - pivotX, -pivotY);
      ctx.fill();
    }
    ctx.restore();
    if (px > 6 && !k.free) {
      // THE KANNI, as on a real patang: two strings tied through the sail - the upper one where the spine meets the
      // bow (kaman), the lower one low on the spine - running OUT IN FRONT of the sail toward the flier and meeting
      // at the kanni knot, where the dor is tied. Seen from the roof, the knot sits off the sail on the flier's side,
      // so the two strings show as a clear "V" from the kite down to the line (it used to be drawn flat on the sail
      // and was lost against the paper). Knot up/down (KANNI_PRESETS) and left/right (KANNI_BALANCE) move it.
      const ba = BRIDLE[(k.entry && k.entry.arche) || k.spec.id] || BRIDLE.patang;
      let spineX = -pivotX, topY = ba[0] * py - pivotY, botY = ba[1] * py - pivotY;
      if (sailP) {   // tie the strings onto the bent, tilted sail itself
        const uS = (spineX - sx0) / (px * flap), t = sailP(uS, (topY - sy0) / py), b = sailP(uS, (botY - sy0) / py);
        spineX = (t[0] + b[0]) / 2; topY = t[1]; botY = b[1]; }
      const gm = kiteGeom(cam, k); if (!gm) { ctx.restore(); return; } const kx = gm.kx, ky = gm.ky;
      const thr = clamp(px * 0.012, 0.9, 1.6);
      // the two strings hang as shallow curves bowing away from each other, so they read as a loop meeting at the
      // knot whichever way the dor leaves the kite
      const sl = Math.hypot(kx - spineX, ky - (topY + botY) / 2), ux = (kx - spineX) / (sl || 1), uy = (ky - (topY + botY) / 2) / (sl || 1);
      const bw = Math.max(1, px * 0.05);
      const strings = () => { ctx.beginPath();
        ctx.moveTo(spineX, topY); ctx.quadraticCurveTo((spineX + kx) / 2 - uy * bw, (topY + ky) / 2 + ux * bw, kx, ky);
        ctx.moveTo(spineX, botY); ctx.quadraticCurveTo((spineX + kx) / 2 + uy * bw, (botY + ky) / 2 - ux * bw, kx, ky); };
      ctx.lineCap = 'round';
      strings(); ctx.strokeStyle = 'rgba(20,12,6,.45)'; ctx.lineWidth = thr + 1; ctx.stroke();   // dark edge so it reads on any paper
      strings(); ctx.strokeStyle = '#f6f0e2'; ctx.lineWidth = thr; ctx.stroke();
      for (const y of [topY, botY]) { ctx.fillStyle = '#f6f0e2'; ctx.beginPath(); ctx.arc(spineX, y, Math.max(1.1, thr * 0.9), 0, 7); ctx.fill(); ctx.strokeStyle = 'rgba(20,12,6,.6)'; ctx.lineWidth = 1; ctx.stroke(); }
      const r = Math.max(1.5, thr * 1.3);   // the knot
      ctx.fillStyle = 'rgba(20,12,6,.9)'; ctx.beginPath(); ctx.arc(kx, ky, r + 1, 0, 7); ctx.fill();
      ctx.fillStyle = k.thread.color; ctx.beginPath(); ctx.arc(kx, ky, r, 0, 7); ctx.fill();
    }
    ctx.restore(); ctx.globalAlpha = 1;
    if (!k.free && !isOwn && px > 8) {
      // a rival close enough to pecha gets a gold tag, so you can see who you can actually fight from here
      const mine = curViewer ? (curViewer.shared ? G.viewers.map(v => v.kite) : [curViewer.kite]) : [];
      const mate = G.teams && mine.some(m => m && teamOf(m.owner) === teamOf(k.owner));
      const inRange = !mate && mine.some(m => m && !m.free && Math.hypot(m.p[0] - k.p[0], m.p[1] - k.p[1], m.p[2] - k.p[2]) < PECHA.CFG.startDist);
      if (mate) { ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center'; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.strokeText(k.owner.name, s.x, s.y - py / 2 - 4); ctx.fillStyle = TEAM_TINT[teamOf(k.owner)]; ctx.fillText(k.owner.name, s.x, s.y - py / 2 - 4); return; }
      ctx.font = inRange ? 'bold 11px sans-serif' : '10px sans-serif'; ctx.textAlign = 'center';
      if (inRange) { ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,.55)'; ctx.strokeText('⚔ ' + k.owner.name, s.x, s.y - py / 2 - 4); }
      ctx.fillStyle = inRange ? '#ffd166' : 'rgba(255,255,255,.75)'; ctx.fillText((inRange ? '⚔ ' : '') + k.owner.name, s.x, s.y - py / 2 - 4);
    }
    if (k.free && !k.caught && !k.landed && !k.looted && px > 6) {   // loot marker, so players can see what is worth chasing
      ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(255,214,102,.9)'; ctx.fillText('LOOT', s.x, s.y - py / 2 - 4);
    }
  }
  /* ---------------- HUD (drawn on the canvas, per human flier) ---------------- */
  function rrect(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function bar(x, y, w, h, f, col) { ctx.fillStyle = 'rgba(255,255,255,.12)'; rrect(x, y, w, h, h / 2); ctx.fill(); if (f > 0.005) { ctx.fillStyle = col; rrect(x, y, Math.max(h, w * clamp(f, 0, 1)), h, h / 2); ctx.fill(); } }
  const keyHint = p => mapFor(p).label;
  /* v6.3: the pecha used to have its own big panel at the TOP CENTRE of the screen - exactly where the camera puts your
   * kite, so it covered the very pecha it was about. It now lives in your own card at the top-left (which grows while you
   * are hooked), and the fight itself is shown IN the sky: a ring at the crossing in the colour of whoever is cutting. */
  function drawHud(viewer, x0, y0, wMax, right) {
    const k = viewer.kite; if (!k) return;
    const F = 'Inter,system-ui,sans-serif';
    const cur = k && !k.free && k._pechaDraw && k._pechaDraw[0];
    viewer._pm = clamp((viewer._pm || 0) + (cur ? 0.12 : -0.08), 0, 1);
    if (cur) { viewer._pmLast = cur; viewer._pmAll = k._pechaDraw.slice(); }
    const P = viewer._pm > 0 && viewer._pmLast && viewer._pmLast.other ? viewer._pmLast : null;
    const hooked = G.drifters.some(d => d.caught && d.caught.by === viewer);
    const W = Math.min(P ? 280 : 250, wMax), X = right ? x0 - W : x0;
    const pH = P ? 74 * viewer._pm : 0, H = 62 + (hooked ? 18 : 0) + pH;
    ctx.save(); ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = 'rgba(12,18,32,.72)'; rrect(X, y0, W, H, 12); ctx.fill();
    ctx.strokeStyle = P ? `rgba(123,223,242,${0.15 + 0.45 * viewer._pm})` : 'rgba(255,255,255,.10)'; ctx.lineWidth = P ? 1.5 : 1; ctx.stroke();
    ctx.fillStyle = viewer.color; ctx.beginPath(); ctx.arc(X + 16, y0 + 18, 5, 0, 7); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = `600 13px ${F}`; ctx.fillText(viewer.name, X + 28, y0 + 22);
    ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.font = `12px ${F}`; ctx.textAlign = 'right';
    ctx.fillText(k.free ? 'kite lost' : `${k.lineLen.toFixed(0)} m line · ${Math.max(0, k.p[2]).toFixed(0)} m up`, X + W - 12, y0 + 22);
    ctx.textAlign = 'left';
    const T = k.free ? 0 : clamp(k.tension / (k.lineStrength || 1), 0, 1);
    ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.font = `11px ${F}`;
    ctx.fillText('Tension', X + 14, y0 + 40); ctx.fillText('Line wear', X + 14, y0 + 55);
    bar(X + 80, y0 + 33, W - 94, 7, T, T > 0.8 ? '#ff5d73' : T > 0.55 ? '#ffc94d' : '#3ddc97');
    bar(X + 80, y0 + 48, W - 94, 7, k.damage, '#ff5d73');
    let y = y0 + 62;
    if (hooked) { ctx.fillStyle = '#ffd166'; ctx.font = `600 11px ${F}`; ctx.fillText(`Kite on your line — hold ${IS_TOUCH ? 'KHAINCH' : keyHint(viewer).pull} to reel it home`, X + 14, y + 6); y += 18; }
    if (P) {
      ctx.save(); ctx.beginPath(); ctx.rect(X, y, W, pH); ctx.clip(); ctx.globalAlpha = viewer._pm;
      const o = P.other, sh = clamp(P.share ?? 0.5, 0, 1), kh = keyHint(viewer);
      viewer._pmShare = (viewer._pmShare ?? sh) + (sh - (viewer._pmShare ?? sh)) * 0.12;
      const S = viewer._pmShare, mine = clamp(1 - k.damage, 0, 1), theirs = clamp(1 - o.damage, 0, 1);
      ctx.fillStyle = 'rgba(255,255,255,.08)'; ctx.fillRect(X + 10, y, W - 20, 1);
      ctx.fillStyle = '#7bdff2'; ctx.font = `800 12px ${F}`;
      const all = (viewer._pmAll || [P]).filter(d => d.other && d.other.owner), extra = all.length - 1;
      let nm = o.owner.name + (extra > 0 ? ` +${extra}` : ''); ctx.font = `800 12px ${F}`; while (ctx.measureText('Pecha vs ' + nm).width > W - 120 && nm.length > 2) nm = nm.slice(0, -1);
      ctx.fillText('Pecha vs ' + nm, X + 14, y + 17);
      ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.font = `500 11px ${F}`; ctx.textAlign = 'right'; ctx.fillText(P.above ? 'you are on top' : 'you are below', X + W - 12, y + 17); ctx.textAlign = 'left';
      // tug of war: one bar, your strength from the left, theirs from the right
      const bx = X + 14, bw = W - 28, by = y + 26, f = mine / (mine + theirs || 1);
      ctx.fillStyle = 'rgba(255,255,255,.1)'; rrect(bx, by, bw, 12, 6); ctx.fill();
      ctx.fillStyle = mine > 0.35 ? '#3ddc97' : '#ff5d73'; rrect(bx, by, Math.max(12, bw * f), 12, 6); ctx.fill();
      ctx.fillStyle = '#ff9f6e'; rrect(bx + bw * f, by, Math.max(0, bw * (1 - f)), 12, 6); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.fillRect(bx + bw * f - 1, by - 2, 2, 16);
      ctx.font = `700 10px ${F}`; ctx.fillStyle = '#06261a'; ctx.fillText(Math.round(mine * 100) + '%', bx + 5, by + 10);
      ctx.textAlign = 'right'; ctx.fillStyle = '#3a1300'; ctx.fillText(Math.round(theirs * 100) + '%', bx + bw - 5, by + 10); ctx.textAlign = 'left';
      const pull = IS_TOUCH ? 'KHAINCH' : kh.pull, send = IS_TOUCH ? 'DHEEL' : kh.send;
      // the move that cuts best from where you are: dheel from on top, khainch from below (pecha.js sideBonus)
      const best = P.above ? send : pull, tap = IS_TOUCH ? 'tap FLY' : 'tap ' + kh.fly;
      const msg = S >= 0.55 ? `You are cutting — keep it up (${tap} = jhatka)` : S <= 0.45 ? `Being cut! ${best} fast${extra > 0 ? ' — two lines on you' : ''}` : `${P.above ? 'On top' : 'Below'}: ${best} cuts best, ${tap} = jhatka`;
      ctx.font = `700 11.5px ${F}`; ctx.fillStyle = S >= 0.55 ? '#3ddc97' : S <= 0.45 ? '#ff8a9b' : '#e6ebf5';
      ctx.fillText(msg, X + 14, y + 58);
      ctx.restore();
    }
    ctx.restore();
  }
  /* the fight, in the sky: a ring round the crossing - green while you are cutting, red while you are being cut - that
   * pulses with how hard the lines are sawing, plus the friction sparks. Drawn for YOUR pecha only. */
  function drawPechaMark(cam, viewer) {
    const ks = viewer.shared ? G.viewers.map(v => v.kite) : [viewer.kite];
    const mk = !viewer.shared && viewer.kite, mpd = mk && !mk.free && mk._pechaDraw && mk._pechaDraw[0];
    if (mpd && mk.damage > 0.65) {   // your line is nearly through: the screen edges glow red, faster as it gets worse
      const w = cam.cx * 2, h = cam.cy / 0.47, a = (0.25 + 0.25 * Math.sin(G.t * (6 + 10 * mk.damage))) * clamp((mk.damage - 0.65) / 0.25, 0, 1);
      const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.7);
      g.addColorStop(0, 'rgba(255,40,60,0)'); g.addColorStop(1, `rgba(255,40,60,${a.toFixed(3)})`); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      if (!mk._dangerBuzz) { mk._dangerBuzz = true; buzz([60, 40, 60]); }
    }
    for (const k of ks) for (const pd of (k && !k.free && k._pechaDraw) || []) {
      if (!pd.point) continue;
      const q = project(cam, pd.point); if (!q) continue;
      const sh = clamp(pd.share ?? 0.5, 0, 1), saw = clamp(k._saw || 0, 0, 1), t = G.t;
      const col = sh >= 0.55 ? '61,220,151' : sh <= 0.45 ? '255,93,115' : '255,214,102';
      const r = clamp(cam.fl / q.d * 0.55, 13, 26) * (1 + 0.1 * Math.sin(t * (8 + 10 * saw)) + 0.35 * (pd.j || 0));   // a jhatka makes it jump
      ctx.save();
      ctx.strokeStyle = `rgba(${col},.9)`; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(q.x, q.y, r, 0, 7); ctx.stroke();
      ctx.strokeStyle = `rgba(${col},.3)`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(q.x, q.y, r + 4, 0, 7); ctx.stroke();
      // which line is on top: a small chevron above or below the ring
      ctx.fillStyle = `rgba(${col},.95)`; const dy = pd.above ? -(r + 9) : r + 9, dir = pd.above ? -1 : 1;
      ctx.beginPath(); ctx.moveTo(q.x - 5, q.y + dy - dir * 2); ctx.lineTo(q.x + 5, q.y + dy - dir * 2); ctx.lineTo(q.x, q.y + dy + dir * 4); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
  }
  // online: connection quality (from how regularly the server's updates arrive) and the reconnect overlay
  function drawNetStatus(W, H) {
    const N = G.net, now = performance.now(), age = N.lastSnap ? now - N.lastSnap : 0, F = 'Inter,system-ui,sans-serif';
    const q = N.lostAt || age > 700 ? 0 : N.gap > 110 || N.jit > 35 || N.rtt > 250 ? 1 : 2, col = ['#ff5d73', '#ffc94d', '#3ddc97'][q], label = ['Connection lost', 'Weak connection', 'Connected'][q] + (q && N.rtt ? ` · ${Math.round(N.rtt)} ms` : '');
    ctx.save(); ctx.font = `600 11px ${F}`;
    const tw = ctx.measureText(label).width + 40, x = 12, y = H - 40 - (IS_TOUCH ? 84 : 0);
    if (!IS_TOUCH || q < 2) {
      ctx.fillStyle = 'rgba(12,18,32,.7)'; rrect(x, y, tw, 24, 12); ctx.fill();
      for (let i = 0; i < 3; i++) { ctx.fillStyle = i <= q ? col : 'rgba(255,255,255,.18)'; ctx.fillRect(x + 10 + i * 5, y + 15 - i * 3, 3, 4 + i * 3); }
      ctx.fillStyle = '#e6ebf5'; ctx.textAlign = 'left'; ctx.fillText(label, x + 30, y + 16);
    }
    if (N.lostAt) {
      const left = Math.max(0, 18 - (now - N.lostAt) / 1000);
      ctx.fillStyle = 'rgba(8,11,22,.55)'; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = 'rgba(12,18,32,.92)'; rrect(W / 2 - 150, H / 2 - 44, 300, 88, 16); ctx.fill();
      ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.font = `700 16px ${F}`; ctx.fillText('Reconnecting…', W / 2, H / 2 - 10);
      ctx.fillStyle = 'rgba(255,255,255,.65)'; ctx.font = `500 12px ${F}`; ctx.fillText(`Your seat is kept. Giving up in ${Math.ceil(left)} s`, W / 2, H / 2 + 16);
      const a = now / 300; ctx.strokeStyle = '#7bdff2'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(W / 2 - 66, H / 2 - 15, 7, a, a + 4.2); ctx.stroke();
    }
    ctx.restore();
  }
  function drawBanner(b, cx, cy, h, dt) {
    if (!b || b.t <= 0) return;
    const a = Math.min(1, b.t / 0.4), sc = 1 + ((b.t0 || 1.6) - b.t) * (b.low ? 0.02 : 0.05);
    if (b.low) cy = cy + h * 0.27;   // pecha notices: low on the screen, small, under the fight
    ctx.save(); ctx.globalAlpha = a; ctx.translate(cx, cy); ctx.scale(sc, sc);
    ctx.font = `900 ${Math.round(b.low ? clamp(h * 0.04, 15, 28) : clamp(h * 0.065, 22, 52))}px Inter,system-ui,sans-serif`; ctx.textAlign = 'center';
    ctx.lineWidth = 7; ctx.strokeStyle = 'rgba(0,0,0,.55)'; ctx.lineJoin = 'round'; ctx.strokeText(b.text, 0, 0); ctx.fillStyle = b.color; ctx.fillText(b.text, 0, 0); ctx.restore();
    b.t -= dt;
  }
  // the shared 2-player camera looks at both kites from between both fliers
  const sharedView = { shared: true, slot: 0 };
  let curViewer = null;
  /* v7.1: a slack dor hangs in a real curve. The physics line (used for crossings and cuts) keeps only a gentle belly; on
   * screen a line with slack in it droops further, deepest a third of the way up from the flier's hand (the line's own
   * weight), and straightens out as soon as it is pulled tight. Drawing only. */
  function lineVis(k) {
    const pts = k.linePoints(24), a = k.anchor, b = k.p;
    const dist = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) || 1, slack = Math.max(0, k.lineLen - dist);
    const extra = Math.min(dist * 0.085, Math.sqrt(dist * slack) * 0.16) * clamp(1 - (k.pullE || 0), 0, 1);
    // v7.4: like the reference video, even a tight dor keeps a soft belly (its own weight over a long run)...
    const belly = dist * 0.028 * clamp(1 - 0.6 * (k.pullE || 0), 0.4, 1);
    k._droop = (k._droop || 0) + (extra + belly - (k._droop || 0)) * 0.12;   // eases in and out, never snaps
    const dr = k._droop;
    // ...and when the kite moves across the sky the line can't keep up: its middle trails behind and the dor bends
    const v = k.v || [0, 0, 0], L = [(b[0] - a[0]) / dist, (b[1] - a[1]) / dist, (b[2] - a[2]) / dist], vr = v[0] * L[0] + v[1] * L[1] + v[2] * L[2];
    const lag = k._lag || (k._lag = [0, 0, 0]), cap = dist * 0.1;
    for (let c = 0; c < 3; c++) lag[c] += (-(v[c] - vr * L[c]) * 0.16 - lag[c]) * 0.1;
    const lm = Math.hypot(lag[0], lag[1], lag[2]), ls = lm > cap ? cap / lm : 1;
    for (let i = 1; i < pts.length - 1; i++) {
      const s = i / (pts.length - 1), w = 6.75 * s * (1 - s) * (1 - s), wl = 3.1 * s * Math.sqrt(s) * (1 - s);
      pts[i][2] -= dr * w; pts[i][0] += lag[0] * ls * wl; pts[i][1] += lag[1] * ls * wl; pts[i][2] += lag[2] * ls * wl;
    }
    return pts;
  }
  function drawViewport(vp, viewer, dt) {
    curViewer = viewer;
    const { x, y, w, h } = vp, W0 = w, H0 = h; ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip(); ctx.translate(x, y);
    const SK = (KF_DEBUG && window.__skip) || {};
    const cam = camFor(viewer, w, h, dt); viewer.lastCam = cam; viewer.lastVp = { w, h }; const tw0 = KF_DEBUG ? performance.now() : 0; if (!SK.world) drawWorld(cam, w, h); else { ctx.fillStyle = '#6ab'; ctx.fillRect(0, 0, w, h); } dbgT('tWorld', tw0);
    const mine = p => viewer.shared ? G.viewers.includes(p) : p === viewer;
    const items = [];
    for (const p of G.players) {
      const own = mine(p), hm = homeOf(p), dc = Math.hypot(hm[0] - cam.pos[0], hm[1] - cam.pos[1]);
      viewer._hands = viewer._hands || new Map();
      if (hm[2] > 0.2 && !SK.figs) items.push({ k: 'roof', d: -1e6 + dc + 0.5, f: () => drawRoof(cam, hm) });
      if (!SK.figs) items.push({ k: 'person', d: -1e6 + dc, f: () => { const h = drawPerson(cam, p, own); if (h) viewer._hands.set(p, h); else viewer._hands.delete(p); } });
      const k = p.kite; if (!k || k.inDrifters) continue;   // a cut kite is drawn once, from the drifters list
      if (!k.free) {
        // in a pecha the line is drawn hooked: bent through the crossing, so you see which line is on top
        const pd = k._pechaDraw && k._pechaDraw[0];
        const pts = pd ? (k._pechaDraw.length > 1 ? PECHA.bentLineMulti(k, k._pechaDraw) : PECHA.bentLine(k, pd.point, pd.s, pd.above)) : lineVis(k);
        // one dor, from the flier's own hand to the kanni knot (it used to start at the flier's chest while the hands
        // held a second short stretch of line - which read as two dors)
        const hand = viewer._hands && viewer._hands.get(p), gm = kiteGeom(cam, k, pts), knot = gm && gm.px > 6 && gm.cut >= 0 ? { ...gm.knot, i: gm.cut } : null;
        const night = G.sc.nightDrawn || G.sc.night;
        items.push({ k: 'line', d: k.p[0] + 1, f: () => { if (night && !QUAL.low) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; polyline(cam, pts, k.thread.color, own ? 5 : 3.5, 0.16, hand, knot); ctx.restore(); }
          const inMine = pd && (own || k._pechaDraw.some(d => mine(d.other.owner))), lw = (own ? 1.25 : 0.9) * (inMine ? 1.15 : 1);   // v7.4: a finer dor, as in the reference   // v6.5: barely thicker in a pecha (1.7x was too heavy)
          // in YOUR pecha the two dor must never be confused (both are often red/pink manjha): yours has a white edge,
          // theirs a dark one
          if (inMine) polyline(cam, pts, own ? 'rgba(255,255,255,.8)' : 'rgba(10,12,24,.6)', lw + 1.1, own ? 0.6 : 0.5, hand, knot);   // a slim edge, just enough to tell yours from theirs
          polyline(cam, pts, k.hot > 0 ? '#ff5a5a' : k.thread.color, lw, inMine ? 1 : own ? 0.95 : 0.75, hand, knot); } });
      }
      if (k.trail) items.push({ d: k.p[0] + 1, f: () => polyline(cam, k.trail.p, k.thread.color, 1.2, 0.85) });
      if (!SK.kites) items.push({ k: 'kite', d: k.p[0], f: () => drawKite(cam, k, own, 1, dt) });
    }
    for (const d of G.drifters) {
      const fade = d.landed ? clamp(1 - (d.groundT - 4) / 2, 0, 1) : 1;
      if (d.trail && !d.landed) items.push({ k: 'dtrail', d: d.p[0] + 1, f: () => polyline(cam, d.trail.p, d.thread.color, 1.1, 0.7) });
      if (d.caught && d.caught.hook) items.push({ k: 'wrap', d: d.p[0] + 0.5, f: () => drawWrap(cam, d) });
      items.push({ k: 'drifter', d: d.p[0], f: () => drawKite(cam, d, false, fade, dt) });
    }
    if (!SK.figs) for (const P of PARTY) { const dc = Math.hypot(P.home[0] - cam.pos[0], P.home[1] - cam.pos[1]); items.push({ k: 'proof', d: -1e6 + dc + 0.5, f: () => drawRoof(cam, P.home) }); items.push({ k: 'party', d: -1e6 + dc, f: () => drawParty(cam, P) }); }
    for (const L of G.looters) items.push({ k: 'looter', d: -1e6 + Math.hypot(L.p[0] - cam.pos[0], L.p[1] - cam.pos[1]) + 0.2, f: () => drawLooter(cam, L) });
    for (const r of G.ropes) items.push({ k: 'rope', d: 0, f: () => polyline(cam, r.rope.p, r.color, 1.2, Math.min(1, r.life / 3) * 0.85) });
    drawWorldLife(cam);
    const ti0 = KF_DEBUG ? performance.now() : 0; (SK.items ? [] : items).sort((a, b) => b.d - a.d).forEach(i => { if (!KF_DEBUG) return i.f(); const a = performance.now(); i.f(); dbgT('t.' + (i.k || 'x'), a); }); dbgT('tItems', ti0);
    for (const s of G.sparks) { const q = project(cam, s.p); if (q) { ctx.fillStyle = s.c || '#ffe066'; ctx.globalAlpha = clamp(s.t / (s.t0 || 0.25), 0, 1); ctx.beginPath(); ctx.arc(q.x, q.y, 1.5 + 4 * (s.big ? 2.2 : 1), 0, 7); ctx.fill(); ctx.globalAlpha = 1; } }
    for (const f of G.fx) {
      const q = project(cam, f.p); if (!q) continue;
      const life = f.t0 || 0.7, k = 1 - f.t / life;
      const r = (4 + k * 34) * cam.fl / q.d * 0.02;
      ctx.strokeStyle = `rgba(255,255,255,${(1 - k) * 0.9})`; ctx.lineWidth = 4 * (1 - k) + 1; ctx.beginPath(); ctx.arc(q.x, q.y, r, 0, 7); ctx.stroke();
      ctx.strokeStyle = `rgba(255,214,102,${(1 - k) * 0.8})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(q.x, q.y, r * 0.55, 0, 7); ctx.stroke();
    }
    for (const u of G.popups) {
      const q = project(cam, u.p); if (!q) continue;
      const size = clamp(cam.fl / q.d * 0.09, 11, 30);
      ctx.font = `900 ${size}px Inter,system-ui,sans-serif`; ctx.textAlign = 'center'; ctx.globalAlpha = clamp(u.t / 1.1, 0, 1);
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.strokeText(u.text, q.x, q.y);
      ctx.fillStyle = u.color; ctx.fillText(u.text, q.x, q.y); ctx.globalAlpha = 1;
    }
    if (!viewer.lootcam) drawPechaMark(cam, viewer);
    if (viewer.replaycam) { ctx.restore(); return; }
    if (viewer.lootcam) {   // picture-in-picture: just a slim label, no HUD
      const small = w < 240, bh = small ? 16 : 22;
      ctx.fillStyle = 'rgba(12,18,32,.72)'; ctx.fillRect(0, 0, w, bh);
      ctx.fillStyle = '#ffb627'; ctx.font = `800 ${small ? 9 : 11}px Inter,system-ui,sans-serif`; ctx.textAlign = 'left'; ctx.fillText('LOOT', 6, bh - 5);
      ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.font = `${small ? 9 : 11}px Inter,system-ui,sans-serif`; ctx.textAlign = 'right';
      let lab = viewer.label || ''; const room = w - (small ? 40 : 54); while (lab.length > 4 && ctx.measureText(lab).width > room) lab = lab.slice(0, -2).trimEnd() + '…';
      ctx.fillText(lab, w - 6, bh - 5);
      ctx.restore(); return;
    }
    // ---- controls legend at the bottom for the first 25 s of a match (and while paused) ----
    ctx.save(); ctx.scale(UI, UI); { const w = W0 / UI, h = H0 / UI;   // HUD in UI units: same layout on a phone and a monitor
    if (!G.tut && (G.t < 25 || G.paused) && !viewer.lootcam && !IS_TOUCH && w > 640) {
      const hs = viewer.shared ? G.viewers : [viewer];
      hs.forEach((hp, i) => { const L0 = mapFor(hp).label, txt = `${hs.length > 1 ? hp.name + ':  ' : ''}${L0.fly} Fly · tap = Tunka    ${L0.steer} Steer    ${L0.pull} Khainch    ${L0.send} Dheel    ${L0.land} Land`;
        ctx.save(); ctx.globalAlpha = G.paused ? 1 : clamp((25 - G.t) / 3, 0, 1); ctx.font = '600 13px Inter,system-ui,sans-serif';
        const tw = ctx.measureText(txt).width + 30, cx = hs.length > 1 ? w * (i ? 0.75 : 0.25) : w / 2, y0 = h - (viewer.shared || G.viewers.length === 1 ? 54 : 84);
        ctx.fillStyle = 'rgba(12,18,32,.78)'; rrect(cx - tw / 2, y0, tw, 30, 15); ctx.fill();
        ctx.fillStyle = '#e6ebf5'; ctx.textAlign = 'center'; ctx.fillText(txt, cx, y0 + 20); ctx.restore(); });
    }
    // ---- HUD: one card per human in this view (shared view: P1 left, P2 right) ----
    const top = IS_TOUCH ? Math.max(64, HUD_TOP / UI) : 64;   // phones: just under the real top bar (measured), never over it
    if (viewer.shared) {
      const [a, b] = G.viewers;
      if (G.debug && a.kite) drawPivotDebug(cam, a.kite);
      drawHud(a, 12, top, w / 2 - 24, false); drawHud(b, w - 12, top, w / 2 - 24, true);
      drawBanner(a.banner, w * 0.25, h * 0.4, h * 0.8, dt); drawBanner(b.banner, w * 0.75, h * 0.4, h * 0.8, dt);
    } else {
      if (G.debug && viewer.kite) drawPivotDebug(cam, viewer.kite);
      drawHud(viewer, 12, top, w - 24, false);
      drawBanner(viewer.banner, w / 2, h * 0.55, h, dt);
      if (G.viewers.length > 1) {   // split screen: a clear name tag on each half
        if (!IS_TOUCH) { ctx.save(); ctx.font = '700 13px Inter,system-ui,sans-serif'; const L0 = mapFor(viewer).label, label = `${viewer.name}  ·  ${L0.fly} fly  ${L0.steer} steer  ${L0.pull} khainch  ${L0.send} dheel`, tw = ctx.measureText(label).width + 28;
        ctx.fillStyle = 'rgba(12,18,32,.72)'; rrect(w / 2 - tw / 2, h - 44, tw, 30, 15); ctx.fill();
        ctx.fillStyle = viewer.color; ctx.fillRect(w / 2 - tw / 2 + 12, h - 33, 8, 8);
        ctx.fillStyle = '#fff'; ctx.textAlign = 'left'; ctx.fillText(label, w / 2 - tw / 2 + 26, h - 24); ctx.restore(); }
        ctx.strokeStyle = viewer.color; ctx.lineWidth = 3; ctx.strokeRect(1.5, 1.5, w - 3, h - 3);
      }
    }
    } ctx.restore();
    ctx.restore();
  }
  function render(dt) {
    figBudget.n = 2; figBudget.ms = 0; frameNo++; mipBudget = 2; const tr0 = KF_DEBUG ? performance.now() : 0;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);   // draw in CSS pixels on a full-resolution canvas (sharp on phones / HiDPI)
    const W = CW, H = CH;   // (no clear: every viewport paints its own sky edge to edge)
    const v = G.viewers;
    if (v.length === 1) drawViewport({ x: 0, y: 0, w: W, h: H }, v[0], dt);
    else if (G.layout === 'shared') drawViewport({ x: 0, y: 0, w: W, h: H }, sharedView, dt);
    else { drawViewport({ x: 0, y: 0, w: W / 2 - 2, h: H }, v[0], dt); drawViewport({ x: W / 2 + 2, y: 0, w: W / 2 - 2, h: H }, v[1], dt); ctx.fillStyle = '#0b0f19'; ctx.fillRect(W / 2 - 2, 0, 4, H); }
    const tp0 = KF_DEBUG ? performance.now() : 0;
    if (!(KF_DEBUG && window.__skip && window.__skip.pip)) drawLootPip(W, H, dt);
    if (KF_DEBUG) { const E = window.__ev = window.__ev || {}; E.msPip = +(performance.now() - tp0).toFixed(1); E.msMain = +(tp0 - tr0).toFixed(1); }
    ctx.save(); ctx.scale(UI, UI);
    { const W = CW / UI, H = CH / UI;
      drawWindGauge(v.length > 1 && G.layout !== 'shared' ? W / 2 : W, v.length > 1 && G.layout === 'shared' ? sharedView : v[0]);
      if (G.online) drawNetStatus(W, H);
    }
    ctx.restore();
    drawSwipe();
    { const vk0 = v[0] && v[0].kite, pd0 = vk0 && !vk0.free && vk0._pechaDraw && vk0._pechaDraw[0], tc = $('#touch');
      const st = pd0 ? (pd0.share <= 0.45 ? 'pecha losing' : 'pecha') : '';
      if (tc && tc.dataset.st !== st) { tc.dataset.st = st; tc.classList.toggle('pecha', !!pd0); tc.classList.toggle('losing', !!pd0 && pd0.share <= 0.45); } }
    if (IS_TOUCH && (frameNo % 4) === 0 && !ZS.drag) zsSync(false);
    if ((frameNo % 10) === 1 || !htmlCache['#score']) {   // v7.1: rebuilt 6 times a second, not every frame
    const rows = [...G.players].sort((a, b) => (G.teams ? teamOf(a) - teamOf(b) : 0) || pointsOf(b) - pointsOf(a) || a.score.lost - b.score.lost);
    const teamHd = G.teams ? (() => { const T = teamTotals(), nm = G.teamNames || ['Team A', 'Team B'];
      return `<div class="team-bar"><span class="t0"><b>${T[0].cut}</b>${esc(nm[0])}</span><em>cuts</em><span class="t1">${esc(nm[1])}<b>${T[1].cut}</b></span></div>`; })() : '';
    setHTML('#score', '<div class="hd">' + $('#modeLabel').textContent + ' - ' + G.sc.name + '</div>' + teamHd + '<table><tr><th>Player</th><th>Cut</th><th>Kites</th><th>Lost</th><th>Pts</th></tr>' +
      rows.map(p => `<tr class="${p.ctrl.startsWith('human') ? 'me' : ''} ${G.teams ? 'tr' + teamOf(p) : ''}"><td><i style="background:${p.color}"></i>${esc(p.name)}</td><td>${p.score.cut}</td><td>${p.score.caught}</td><td>${p.score.lost}</td><td><b>${pointsOf(p)}</b></td></tr>`).join('') + '</table>');
    }
    const tm = $('#timer');
    if (G.teams && !G.tut) { const T = teamTotals(), nm = G.teamNames || ['A', 'B'], me = teamOf(G.viewers[0]), th = 1 - me; tm.textContent = `${G.cutTarget ? 'First to ' + G.cutTarget + ' · ' : G.duration ? Math.floor(Math.ceil(G.timeLeft) / 60) + ':' + String(Math.ceil(G.timeLeft) % 60).padStart(2, '0') + ' · ' : ''}${nm[me]} ${T[me].cut} – ${T[th].cut} ${nm[th]}`; tm.classList.toggle('low', !!G.cutTarget && Math.max(T[0].cut, T[1].cut) >= G.cutTarget - 1); tm.classList.remove('hidden'); }
    else if (G.cutTarget && !G.tut) { const lead = Math.max(0, ...G.players.map(p => p.score.cut)), me = G.viewers.map(v => v.score.cut).join(' / '); tm.textContent = `First to ${G.cutTarget} \u00b7 you ${me} \u00b7 best ${lead}`; tm.classList.toggle('low', lead >= G.cutTarget - 1); tm.classList.remove('hidden'); }
    else if (G.duration && !G.tut) { const s = Math.ceil(G.timeLeft); tm.textContent = Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); tm.classList.toggle('low', s <= 15); tm.classList.remove('hidden'); }
    else tm.classList.add('hidden');
    // audio follows the (first) viewer's own kite: wind at its height, its reel, its line sawing
    const vk = G.viewers[0].kite, kites = [];
    let reel = 0, sawing = 0;
    for (const v of G.viewers) {
      const k = v.kite; if (!k || (k.inDrifters && k !== v.kite)) { kites.push(null); continue; }
      const w = G.wind.at(k.p, G.t);
      kites.push({ air: Math.hypot(w[0] - k.v[0], w[1] - k.v[1], w[2] - k.v[2]), dist: Math.hypot(k.p[0] - k.anchor[0], k.p[1] - k.anchor[1], k.p[2] - k.anchor[2]),
        tension: k.free ? 0 : k.tension, turn: Math.abs(k.headingVel || 0) + 3 * (k.spinE || 0) + (k.free ? Math.abs(k.spinVel || 0) * 0.3 : 0), pan: panOf(v),
        haul: k.free ? 0 : (k.haul || 0), pull: k.pullE || 0, free: !!k.free });
      if (!k.free) { if (Math.abs(k.reelRate) > Math.abs(reel)) reel = k.reelRate; sawing = Math.max(sawing, k._saw || 0); }
    }
    { const cam = (G.viewers[0] && G.viewers[0].lastCam) || null, list = [];
      if (cam) for (const P of PARTY) { const d = Math.hypot(P.home[0] - cam.pos[0], P.home[1] - cam.pos[1], P.home[2] - cam.pos[2]) || 1, rx = (P.home[0] - cam.pos[0]) * cam.right[0] + (P.home[1] - cam.pos[1]) * cam.right[1];
        list.push({ kind: P.kind, vol: clamp(16 / d, 0, 0.45) * (P.kind === 'dj' ? 0.75 : 1), pan: clamp(rx / d * 1.4, -0.9, 0.9), near: clamp(20 / d, 0, 1) }); }
      SFX.partyUpdate(list, saved.party && !G.paused && !G.over); }
    SFX.update(dt, { running: !G.paused, wind: vk ? Math.hypot(...G.wind.at(vk.p, G.t)) : 0, reel, sawing, kites: kites.map(x => x || { air: 0 }) });
    if (!G.paused) tutTick(dt);
    setHTML('#feed', G.feed.filter(f => G.t - f.t < 6).map(f => `<div>${f.msg}</div>`).join(''));
    setHTML('#botcount', String(G.players.filter(p => p.ctrl === 'bot').length));
    $('#pause').classList.toggle('hidden', !(G.paused || G.menuOpen) || !!G.swapPlayer || G.over || !!G.replay);
    if (G.menuOpen || G.paused) setHTML('#pauseSub', G.online ? 'Online - the match keeps going while this is open' : G.tut ? 'Tutorial' : esc(MODE_NAMES[G.mode] || ''));
    for (const p of G.players) { if (p.kite && p.kite.hot > 0) p.kite.hot -= dt; if (p.bubble && !G.paused) p.bubble.t -= dt; }
    if (G.debug) {
      const k = G.viewers[0].kite;
      $('#debug').textContent = k ? [
        `lineLength ${k.lineLen.toFixed(1)}  radialDist ${Math.hypot(k.p[0] - k.anchor[0], k.p[1] - k.anchor[1], k.p[2] - k.anchor[2]).toFixed(1)}  tension ${k.tension.toFixed(1)}N  ${k.autoOut ? '[reel bouncing it out]' : ''}`,
        `HEADING ${(k.headingAngle * 180 / Math.PI).toFixed(0)}deg  headingVel ${k.headingVel.toFixed(2)} rad/s   nose [${k.nose.map(x => x.toFixed(2))}]`,
        `SPIN ${(k.spinAngle / (2 * Math.PI)).toFixed(2)} turns  spinVel ${k.spinVel.toFixed(2)} rad/s   inclination ${(k.incl * 180 / Math.PI).toFixed(0)}deg`,
        `speed ${Math.hypot(...k.v).toFixed(1)} m/s  radial ${k.radialSpeed.toFixed(1)}  tangential ${k.tangentialSpeed.toFixed(1)}`,
        `alpha ${(k.alpha * 180 / Math.PI).toFixed(0)}deg  roll ${(k.roll * 180 / Math.PI).toFixed(0)}deg`
      ].join('\n') : '';
    }
  }
  let last = performance.now();
  /* SMOOTH MOTION: the physics runs at a fixed 120 steps a second, but screens refresh at 60, 90, 120 or 144 Hz and a
   * browser never delivers frames perfectly evenly - so some frames got 1 physics step, some 2 or 3, and the kite (and
   * the camera following it) moved in uneven hops: the "not smooth" feel. Each frame is now drawn at the exact moment
   * between the last two physics steps (the leftover time in G.acc), so motion is even at any refresh rate. */
  const lerpKites = () => G.players.map(p => p.kite).concat(G.drifters).filter(k => k && !k.netRemote);
  function snapPrev() { for (const k of lerpKites()) k._ip = [k.p[0], k.p[1], k.p[2], k.bodyAngle || 0, k.incl || 0, k.t || 0]; }
  function lerpIn(a) {
    a = clamp(a, 0, 1); const sw = [];
    for (const k of lerpKites()) {
      const q = k._ip; if (!q || Math.abs((k.t || 0) - q[5]) > DT * 1.5) continue;   // a fresh kite or a jump: draw as is
      sw.push([k, k.p, k.bodyAngle, k.incl]);
      k.p = [q[0] + (k.p[0] - q[0]) * a, q[1] + (k.p[1] - q[1]) * a, q[2] + (k.p[2] - q[2]) * a];
      k.bodyAngle = q[3] + ((k.bodyAngle || 0) - q[3]) * a; k.incl = q[4] + ((k.incl || 0) - q[4]) * a;
    }
    return sw;
  }
  function lerpOut(sw) { for (const [k, p, b, i] of sw) { k.p = p; k.bodyAngle = b; k.incl = i; } }
  // v7: while a panel covers the home screen, its drifting kites and glowing Play button stop animating (phones)
  const COVERS = ['#shop', '#coll', '#lb', '#trophies', '#how', '#settings', '#mohalla', '#loginPop', '#pickPop', '#online', '#nameScreen', '#select', '#maker', '#charMaker', '#buyPop', '#rewardPop'];
  let coverAt = 0;
  function coverTick(now) { if (now - coverAt < 400) return; coverAt = now; const on = COVERS.some(id => { const e = $(id); return e && !e.classList.contains('hidden'); }); document.body.classList.toggle('covered', on); }
  function loop(now) {
    const raw = now - last, dt = Math.min(0.1, raw / 1000); last = now;
    qualityTick(raw);
    if (G) {
      const t0 = KF_DEBUG ? performance.now() : 0; let n = 0;
      // v7.1: after one slow frame the loop used to run up to 12 physics steps at once to catch up - which made the NEXT
      // frame slow too, and the game stuttered in a chain ("stuck" in a busy pecha). Offline it now catches up at most
      // 4 steps (33 ms) a frame and lets the rest go: a hitch becomes a tiny slow-down instead of a freeze.
      // Online the clock must keep up with the server, so it still catches up fully.
      if (!G.paused) { G.acc += dt; const cap = G.online ? 12 : 4; while (G && G.acc >= DT && n < cap) { snapPrev(); step(); n++; if (G) G.acc -= DT; } if (G && !G.online && G.acc > DT) G.acc = DT * 0.999; }
      const t1 = KF_DEBUG ? performance.now() : 0;
      if (G) { if (G.replay) renderReplay(dt); else { const sw = G.paused ? null : lerpIn(G.acc / DT); try { render(dt); } finally { if (sw) lerpOut(sw); } } }
      if (KF_DEBUG) { const P2 = window.__perf = window.__perf || { step: 0, render: 0, frames: 0, steps: 0 }; P2.step += t1 - t0; P2.render += performance.now() - t1; P2.frames++; P2.steps += n; const t2 = performance.now(); (window.__frames = window.__frames || []).push([Math.round(raw * 10) / 10, +(t1 - t0).toFixed(1), +(t2 - t1).toFixed(1), n, window.__figPaint || 0, window.__resized || 0, window.__ev || null, G && G.players ? G.players.filter(q => q.kite && q.kite._pechaDraw && q.kite._pechaDraw.length).length : 0, !!(G && G.replay)]); if (window.__frames.length > 20000) window.__frames.shift(); window.__ev = null; window.__figPaint = window.__figMust = window.__resized = 0; }
    }
    else { SFX.menuTick(); SFX.partyUpdate([], false); coverTick(now); }   // music keeps playing on the menus; the roofs fall quiet
    requestAnimationFrame(loop);
  }
  // only touch the DOM when the text actually changed (rebuilding the feed every frame restarted its pop-in animation
  // 60 times a second, which made the messages flicker)
  const htmlCache = {};
  function setHTML(sel, html) { if (htmlCache[sel] !== html) { htmlCache[sel] = html; $(sel).innerHTML = html; dbgEv('dom' + sel); } }
  let DPR = 1, CW = innerWidth, CH = innerHeight, UI = 1, HUD_TOP = 64;
  // the device's safe areas (notch, rounded corners, Android gesture bar), measured from the CSS (--sa-* in index.css)
  const SAFE = { t: 0, r: 0, b: 0, l: 0 };
  function measureSafe() { try { const cs = getComputedStyle(document.documentElement); for (const k of ['t', 'r', 'b', 'l']) SAFE[k] = parseFloat(cs.getPropertyValue('--sa-' + k)) || 0; } catch (e) {} }
  /* Phones: drawing the sky at full retina resolution (2-3x) made every frame fill 4-9x the pixels, and on mid-range
   * phones the game dropped to ~12 fps. The canvas now starts at a phone-friendly resolution and an adaptive quality
   * controller (QUAL) lowers it further, and switches off the heaviest glow effects, if frames still come in slow;
   * it raises it again when there is headroom. */
  /* v7.1: the controller dropped a 3x phone all the way to 0.75 - below one canvas pixel per screen point - which is the
   * "graphics too low" blur (names, lines and kites smeared). It now starts sharp (2x), only gives up resolution after a
   * sustained slow patch, never goes below 1x (one canvas pixel per screen point, never the blurry 0.75x), and gives sharpness back on phones
   * too. The frame time itself came down a lot (the loop, figures and kite mipmaps), so it rarely needs to. */
  const QUAL = { scale: 2, max: 2, min: 1, low: false, avg: 16, slowT: 0, fastT: 0, cool: 0 };
  function resize() {
    const dev = devicePixelRatio || 1;
    DPR = Math.max(Math.min(QUAL.min, dev), Math.min(QUAL.scale, dev));
    CW = innerWidth; CH = innerHeight; UI = clamp(Math.min(CW / 1100, CH / 680), 0.6, 1); measureSafe();
    const tl = document.getElementById('topLeft'), r = tl && tl.getBoundingClientRect(); HUD_TOP = r && r.bottom > 0 ? r.bottom + 8 : 64;
    const w = Math.round(CW * DPR), h = Math.round(CH * DPR);
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; if (KF_DEBUG) window.__resized = 1; }
  }
  function qualityTick(ms) {   // called once per rendered frame with the real frame time
    if (!G || G.paused || document.hidden || QUAL.fixed) return;
    QUAL.avg += (Math.min(ms, 120) - QUAL.avg) * 0.08; QUAL.cool -= ms;
    if (QUAL.cool > 0) return;
    if (QUAL.avg > 24) { QUAL.slowT += ms; QUAL.fastT = 0; } else if (QUAL.avg < 17.5) { QUAL.fastT += ms; QUAL.slowT = 0; } else { QUAL.slowT = QUAL.fastT = 0; }
    if (QUAL.slowT > 1600) {   // too slow for a while: first drop the glows, then a little resolution
      QUAL.slowT = 0; QUAL.cool = 2500;
      if (!QUAL.low) QUAL.low = true;
      else if (QUAL.scale > QUAL.min) { QUAL.scale = Math.max(QUAL.min, +(QUAL.scale - 0.25).toFixed(2)); resize(); }
    } else if (QUAL.fastT > 4000) {   // headroom: give the sharpness back first, then the glows
      QUAL.fastT = 0; QUAL.cool = 2500;
      if (QUAL.scale < QUAL.max) { QUAL.scale = Math.min(QUAL.max, QUAL.scale + 0.25); resize(); }
      else if (QUAL.low) QUAL.low = false;
    }
  }
  // switching tabs or minimising pauses the match (it used to keep flying, and fighting, unseen)
  document.addEventListener('visibilitychange', () => { if (document.hidden && G && !G.over && !G.swapPlayer && !G.online) G.paused = true; });
  addEventListener('resize', resize);
  setInterval(() => { if (document.hidden && G && G.online && !G.over) for (let i = 0; i < 4 && G; i++) step(); }, 1000 / 30);

  /* ================= ONLINE MULTIPLAYER =================
   * Name -> Online lobby -> create a room (you get a 4-letter code + invite link) or join one -> the host starts.
   * In a match your own kite flies here (no lag); the others' kites come from the server 15 times a second, and only
   * the server decides pecha damage, cuts, scores, the clock and the winner (see server/rooms.js). */
  const ON = { ws: null, me: null, name: null, room: null, rooms: [], status: '', err: '', queue: [], want: null, afterName: null, retry: null };
  const NAME_RE = /^[\p{L}\p{N}][\p{L}\p{N} _.-]{1,15}$/u;
  const r2 = x => Math.round(x * 100) / 100;
  { const code = new URLSearchParams(location.search).get('room'); if (code && /^[A-Za-z0-9]{4}$/.test(code)) ON.want = { join: code.toUpperCase() }; }
  function onlineConnect() {
    if (!NET.online || (ON.ws && ON.ws.readyState <= 1)) return;
    clearTimeout(ON.retry);
    const ws = new WebSocket((location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws');
    ON.ws = ws; ON.status = 'Connecting…'; renderOnline();
    ws.onopen = () => { ON.status = ''; const q = ON.queue; ON.queue = []; q.forEach(netSend); renderOnline(); };
    ws.onmessage = e => { let m; try { m = JSON.parse(e.data); } catch (x) { return; } onMsg(m); };
    ws.onclose = () => {
      if (ON.ws !== ws) return;
      ON.ws = null; ON.room = null;
      if (G && G.online && !G.over) { G.net.lostAt = G.net.lostAt || performance.now(); ON.retry = setTimeout(onlineConnect, 1200); return; }
      ON.status = 'Disconnected - reconnecting…'; renderOnline();
      if (!$('#online').classList.contains('hidden') || !$('#nameScreen').classList.contains('hidden')) ON.retry = setTimeout(onlineConnect, 2000);
    };
  }
  function netSend(o) {
    if (ON.ws && ON.ws.readyState === 1) ON.ws.send(JSON.stringify(o));
    else if (o.t !== 's') { ON.queue.push(o); onlineConnect(); }
  }
  function myGear(entry) {
    const e = entry || catById(saved.k1);
    return { thread: saved.t1, char: saved.c1, spool: saved.sp1, kanni: saved.kn1, kbal: saved.kb1,
      kite: { id: e.id, arche: e.arche, scale: e.scale || 1, name: e.name, ...(e.recipe ? { recipe: e.recipe, base: e.base } : {}) },
      look: saved.c1 === 'myflier' && saved.myFlier ? saved.myFlier : undefined };
  }
  function entryFromGear(g, pid) {
    const k = (g && g.kite) || {}, local = CAT.find(c => c.id === k.id);
    if (local && !local.mine) return local;
    if (k.recipe && k.base) {
      const id = 'net:' + pid + ':' + k.id;
      if (!NETCAT.has(id)) NETCAT.set(id, { id, name: cleanName(k.name) || 'Kite', arche: k.arche || 'patang', scale: k.scale || 1, base: k.base, baseId: '', recipe: k.recipe });
      return NETCAT.get(id);
    }
    return local || CAT.find(c => c.arche === k.arche && (c.src || c.recipe)) || CAT[0];
  }
  function onMsg(m) {
    switch (m.t) {
      case 'me':
        ON.me = m.id;
        // the server's record has no name (new records folder, restored account, cleared cookie) but this browser remembers
        // one: register it again, instead of showing "Playing as Asif" while every create/join says "Choose a name first"
        if (!m.name && m.known && saved.netName && NAME_RE.test(saved.netName)) { netSend({ t: 'name', name: saved.netName }); return; }
        if (m.name) { ON.name = m.name; saved.netName = m.name; save(); }
        if (!m.known) ON.err = 'Please reload the page (no player cookie).';
        if (m.name && !$('#nameScreen').classList.contains('hidden')) { $('#nameScreen').classList.add('hidden'); const f = ON.afterName; ON.afterName = null; (f || showMenu)(); }
        if (m.name && ON.want && ON.want.join) { netSend({ t: 'join', code: ON.want.join, gear: myGear() }); ON.want = null; }
        if (G && G.online && G.net.lostAt && G.net.code) netSend({ t: 'join', code: G.net.code, gear: myGear() });   // back after a drop: ask to rejoin our room
        return renderOnline();
      case 'rooms': ON.rooms = m.rooms || []; return renderOnline();
      case 'room': ON.room = m.room; ON.err = ''; if (!G || !G.online || G.over) renderOnline(); return;
      case 'start': return startOnline(m);
      case 'snap': if (G && G.online) netSnap(m); return;
      case 'cut': if (G && G.online) netCut(m); return;
      case 'score': if (G && G.online) applyScores(m.scores); return;
      case 'left': if (G && G.online) netLeft(m); return;
      case 'gear': if (G && G.online) { const p = G.net.byId.get(m.id); if (p && p.ctrl === 'net') { p.entry = entryFromGear(m.gear, m.id); p.thread = THREADS[m.gear.thread] ? m.gear.thread : p.thread; } } return;
      case 'end': return onlineEnd(m);
      case 'emote': if (G && G.online && m.id !== ON.me) say(G.net.byId.get(m.id), m.n | 0, true); return;
      case 'away': if (G && G.online) note(`${esc(m.name)} lost connection — their seat is kept for 20 s`); return;
      case 'back': if (G && G.online && m.id !== ON.me) note(`${esc(m.name)} is back`); return;
      case 'pong': if (G && G.online && m.n) { const rtt = performance.now() - m.n; G.net.rtt = G.net.rtt ? G.net.rtt + (rtt - G.net.rtt) * 0.3 : rtt; } return;
      case 'error':
        if (!$('#nameScreen').classList.contains('hidden')) { $('#nameErr').textContent = m.error; return; }
        if (G && G.online && G.net.lostAt) { leaveGameView(); ON.err = 'Could not get back into the match: ' + m.error; showOnline(); return; }
        if (G && G.online && !G.over) { note(esc(m.error)); return; }
        ON.err = m.error; return renderOnline();
    }
  }
  /* ---------------- name ---------------- */
  function showNameScreen(next) {
    ON.afterName = next || null;
    $('#nameInput').value = saved.netName || ''; $('#nameErr').textContent = '';
    for (const id of ['#menu', '#online', '#select']) $(id).classList.add('hidden');
    $('#nameScreen').classList.remove('hidden'); setTimeout(() => $('#nameInput').focus(), 50);
    onlineConnect();
  }
  function submitName() {
    const n = $('#nameInput').value.normalize('NFC').replace(/\s+/g, ' ').trim();
    if (!NAME_RE.test(n)) { $('#nameErr').textContent = 'Use 2-16 letters or numbers (spaces, _ . - allowed).'; return; }
    $('#nameErr').textContent = 'Saving…';
    netSend({ t: 'name', name: n });
  }
  $('#nameGo').onclick = submitName;
  $('#nameInput').addEventListener('keydown', e => { if (e.key === 'Enter') submitName(); e.stopPropagation(); });
  $('#nameSkip').onclick = () => { $('#nameScreen').classList.add('hidden'); showMenu(); };
  function showMenu() { for (const id of ['#online', '#select', '#nameScreen', '#mohalla']) $(id).classList.add('hidden'); $('#menu').classList.remove('hidden'); renderRank(); if (typeof renderHub === 'function') renderHub(); }
  /* ---------------- lobby ---------------- */
  function showOnline() {
    for (const id of ['#menu', '#select', '#nameScreen']) $(id).classList.add('hidden');
    if (!saved.netName && !ON.name) return showNameScreen(showOnline);
    $('#online').classList.remove('hidden');
    onlineConnect();
    if (!ON.room) netSend({ t: 'rooms' });
    renderOnline();
  }
  const sceneOpts = sel => Object.entries(SCENES).map(([id, sc]) => `<option value="${id}" ${id === sel ? 'selected' : ''}>${esc(sc.name)}</option>`).join('');
  const lenOpts = sel => Object.entries(MATCH_TIMES).map(([id, l]) => `<option value="${id}" ${String(id) === String(sel) ? 'selected' : ''}>${esc(l)}</option>`).join('');
  function renderOnline() {
    const el = $('#online'); if (!el || el.classList.contains('hidden')) return;
    $('#onName').textContent = ON.name || saved.netName || '—';
    $('#onStatus').innerHTML = ON.err ? `<span class="bad">${esc(ON.err)}</span>` : esc(ON.status);
    const myE = catById(saved.k1), th = THREADS[saved.t1] || THREADS.manjha;
    const gearBar = `<div class="on-gear">${kiteVis(myE)}<span><b>${esc(myE.name)}</b>${esc(th.name)} · ${esc(charById(saved.c1).name)}</span><button class="ghost" id="onGear">Change kite &amp; gear</button></div>`;
    const R = ON.room;
    if (!R) {
      $('#onBody').innerHTML = `<div class="on-grid">
        <section class="card"><h3>Create a room</h3>
          <label class="field">Scene<select id="onScene">${sceneOpts(saved.scene)}</select></label>
          <label class="field">Match<select id="onLen">${lenOpts(saved.mtime)}</select></label>
          <label class="check"><input type="checkbox" id="onTeams"> Mohalla: two teams (team-mates never cut each other)</label>
          <label class="check"><input type="checkbox" id="onOpen" checked> Show in the open rooms list</label>
          <button class="cta" id="onCreate">Create room</button></section>
        <section class="card"><h3>Join a friend</h3>
          <div class="join-row"><input id="onCode" maxlength="4" placeholder="CODE" autocomplete="off" spellcheck="false"><button class="cta" id="onJoin">Join</button></div>
          <h4>Open rooms <button class="link sm" id="onRefresh">refresh</button></h4>
          <div class="on-rooms">${ON.rooms.length ? ON.rooms.map(r => `<div class="on-room"><span><b>${esc(r.host)}'s room</b><small>${r.players}/10 · ${esc((SCENES[r.scene] || {}).name || r.scene)} · ${esc(MATCH_TIMES[r.mtime] || '')}${r.teams ? ' · Teams' : ''}</small></span><button class="ghost sm" data-join="${esc(r.code)}">Join</button></div>`).join('') : '<p class="muted">No open rooms yet - create one and send the code to your friends.</p>'}</div></section>
      </div>${gearBar}`;
      $('#onCreate').onclick = () => { saved.scene = $('#onScene').value; saved.mtime = $('#onLen').value; save(); ensureLoadout(false); netSend({ t: 'create', settings: { scene: saved.scene, mtime: saved.mtime, open: $('#onOpen').checked, teams: $('#onTeams').checked }, gear: myGear() }); };
      const join = code => { code = String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); if (code.length !== 4) { ON.err = 'Room codes have 4 letters.'; return renderOnline(); } netSend({ t: 'join', code, gear: myGear() }); };
      $('#onJoin').onclick = () => join($('#onCode').value);
      $('#onCode').addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') join($('#onCode').value); });
      $('#onRefresh').onclick = () => netSend({ t: 'rooms' });
      $$('#onBody [data-join]').forEach(b => b.onclick = () => join(b.dataset.join));
    } else {
      const host = R.host === ON.me, link = location.origin + '/?room=' + R.code, playing = R.state === 'playing';
      $('#onBody').innerHTML = `<div class="on-roomhd">
          <div><small>Room code</small><b class="code">${esc(R.code)}</b></div>
          <div class="invite"><small>Invite link - send it to your friends</small><div class="join-row"><input id="onLink" readonly value="${esc(link)}"><button class="ghost" id="onCopy">Copy</button></div></div>
        </div>
        <div class="on-grid">
          <section class="card"><h3>Fliers <small>${R.members.length}/10</small></h3>
            ${(() => { const mem = x => { const e = entryFromGear(x.gear, x.id), t = THREADS[(x.gear || {}).thread];
              return `<div class="on-mem"><i style="background:${esc(x.color)}"></i>${kiteVis(e)}<span><b>${esc(x.name)}</b><small>${esc(e.name)} · ${esc(t ? t.name : '')}</small></span>${x.id === R.host ? '<em>host</em>' : ''}${x.id === ON.me ? '<em class="you">you</em>' : ''}</div>`; };
              if (!R.settings.teams) return `<div class="on-members">${R.members.map(mem).join('')}</div>`;
              const mine = (R.members.find(x => x.id === ON.me) || {}).team | 0;
              return `<div class="on-teams">${[0, 1].map(tm => `<div class="on-team t${tm}"><h4>Team ${tm ? 'B' : 'A'} <small>${R.members.filter(x => (x.team | 0) === tm).length}</small>${!playing && mine !== tm ? `<button class="link sm" data-team="${tm}">Join this side</button>` : ''}</h4><div class="on-members">${R.members.filter(x => (x.team | 0) === tm).map(mem).join('') || '<p class="muted small">Nobody yet</p>'}</div></div>`).join('')}</div>`; })()}</section>
          <section class="card"><h3>Match</h3>
            ${host && !playing ? `<label class="field">Scene<select id="onScene">${sceneOpts(R.settings.scene)}</select></label><label class="field">Match<select id="onLen">${lenOpts(R.settings.mtime)}</select></label><label class="check"><input type="checkbox" id="onTeams2" ${R.settings.teams ? 'checked' : ''}> Mohalla: two teams</label>`
              : `<p>${esc((SCENES[R.settings.scene] || {}).name || '')} · ${esc(MATCH_TIMES[R.settings.mtime] || '')}${R.settings.teams ? ' · Teams' : ''}</p>`}
            ${playing ? '<p class="muted">A match is being played - you will be in the next one.</p>' : host ? `<button class="cta big" id="onStart">Start match &rarr;</button>${R.members.length < 2 ? '<p class="muted">You can start alone to try it, but it is better with a friend.</p>' : ''}` : '<p class="muted">Waiting for the host to start…</p>'}
            <button class="ghost" id="onLeave">Leave room</button></section>
        </div>${gearBar}`;
      $('#onCopy').onclick = () => { const i = $('#onLink'); i.select(); (navigator.clipboard ? navigator.clipboard.writeText(i.value) : Promise.reject()).then(() => { $('#onCopy').textContent = 'Copied!'; }).catch(() => { document.execCommand && document.execCommand('copy'); $('#onCopy').textContent = 'Copied!'; }); };
      if ($('#onStart')) $('#onStart').onclick = () => netSend({ t: 'start' });
      if (host && !playing) { const send = () => netSend({ t: 'settings', settings: { scene: $('#onScene').value, mtime: $('#onLen').value, open: R.settings.open, teams: $('#onTeams2').checked } }); $('#onScene').onchange = send; $('#onLen').onchange = send; $('#onTeams2').onchange = send; }
      $$('#onBody [data-team]').forEach(b => b.onclick = () => netSend({ t: 'team', team: +b.dataset.team }));
      $('#onLeave').onclick = () => { netSend({ t: 'leave' }); ON.room = null; netSend({ t: 'rooms' }); renderOnline(); };
    }
    $('#onGear').onclick = () => { $('#online').classList.add('hidden'); openSelect('gear'); };
    hydrate($('#onBody'));
  }
  $('#onRename').onclick = () => showNameScreen(showOnline);
  $('#onClose').onclick = () => { if (ON.room) { netSend({ t: 'leave' }); ON.room = null; } showMenu(); };
  /* ---------------- the match ---------------- */
  function startOnline(st) {
    if (G) leaveGameView();
    const sc = SCENES[st.scene] || SCENES.lahore;
    G = { mode: 'online', online: true, cfg: { scene: st.scene, mtime: st.mtime }, scene: st.scene, sc, diff: 'normal', wind: new P.Wind({ speed: sc.wind, gust: sc.gust, seed: st.seed }),
      t: 0, players: [], drifters: [], looters: [], ropes: [], sparks: [], fx: [], popups: [], feed: [], paused: false, acc: 0 };
    G.duration = st.duration; G.timeLeft = st.duration; G.over = false; G.cutTarget = st.cutTarget; G.layout = 'shared'; G.tut = null;
    sharedView.cam = null; lootView.cam = null; lootView.focus = null;
    G.net = { seq: 0, sendT: 0, byId: new Map(), code: ON.room ? ON.room.code : null, lastSnap: 0, gap: 66, jit: 0, lostAt: 0 };
    st.players.forEach((q, i) => {
      const mine = q.id === ON.me, g = q.gear || {}, mineE = catById(saved.k1);
      const entry = mine && mineE.id === (g.kite || {}).id ? mineE : entryFromGear(g, q.id);
      const p = makePlayer({ home: q.home, name: q.name, ctrl: mine ? 'human1' : 'net', entry, thread: THREADS[g.thread] ? g.thread : 'manjha', kanni: g.kanni, kbal: g.kbal,
        char: mine ? saved.c1 : (g.char === 'myflier' ? 'd:ali' : g.char), spool: g.spool, color: q.color, slot: i });
      p.netId = q.id; p.netSeq = -1; if (!mine && g.char === 'myflier' && g.look) p.look = g.look;
      if (st.teams) p.team = q.team | 0;
      G.net.byId.set(q.id, p); G.players.push(p);
    });
    G.players.forEach(spawn);
    for (const q of G.players) warmKite(q.entry || (q.kite && q.kite.entry)); refillKati();
    G.viewers = G.players.filter(p => p.ctrl === 'human1');
    if (!G.viewers.length) { G = null; return; }
    if (st.teams) { G.teams = true; const me = teamOf(G.viewers[0]); G.teamNames = me ? ['Their team', 'Your team'] : ['Your team', 'Their team']; }
    for (const id of ['#menu', '#select', '#results', '#online', '#nameScreen', '#swap', '#tut']) $(id).classList.add('hidden');
    $('#game').classList.remove('hidden'); $('#botCtl').classList.add('hidden'); $('#pauseBtn').classList.add('hidden');
    $('#touch').classList.toggle('hidden', !IS_TOUCH || saved.touchMode === 'swipe');
    resize(); $('#modeLabel').textContent = 'Online · ' + (ON.room ? ON.room.code : '');
    note('Online match - ' + G.players.length + ' fliers. Cut their lines!'); SFX.horn();
  }
  function netTick() {
    const N = G.net;
    if (!N.lostAt && performance.now() - (N.pingAt || 0) > 2000) { N.pingAt = performance.now(); netSend({ t: 'ping', n: N.pingAt }); }
    if (N.lostAt && performance.now() - N.lostAt > 18000) {   // could not get back in: end the match cleanly
      leaveGameView(); ON.err = 'Connection to the server was lost and could not be restored. The match ended for you.'; showOnline(); return;
    } N.sendT += DT; if (N.sendT < 1 / 15) return; N.sendT = 0;
    const me = G.viewers[0], k = me && me.kite;
    if (!k || k.free || me.landed || k.netSeq === undefined) return;
    netSend({ t: 's', k: k.netSeq, p: k.p.map(r2), v: k.v.map(r2), L: r2(k.lineLen), rr: r2(clamp(k.reelRate, -39, 39)), T: r2(Math.min(k.tension, 1999)),
      h: r2(k.headingAngle % 1e4), b: r2(k.bodyAngle % 1e4), al: r2(clamp(k.alpha, -3, 3)), tk: r2(clamp(k.tunkaT || 0, 0, 1)), in: r2(clamp(k.incl || 0, 0, 2)),
      pe: r2(clamp(k.pullE, 0, 1)), se: r2(clamp(k.sendE, 0, 1)), la: k.launch ? 1 : 0 });
  }
  const wrapA = x => { x = (x + Math.PI) % (2 * Math.PI); if (x < 0) x += 2 * Math.PI; return x - Math.PI; };
  // other players' kites: snapshot interpolation. Each kite is drawn a little in the past (about 1.5 snapshot
  // intervals plus the measured jitter), between two states the server really sent - smooth at 15 updates a second and
  // steady over a jittery connection. Past the newest state it extrapolates for at most 150 ms, then waits.
  function netDelay() { const N = G.net; return clamp(N.gap * 1.5 + 2 * N.jit, 70, 260); }
  function netFollow(p, k) {
    const B = k.netBuf; if (!B || !B.length) return;
    const rt = performance.now() - netDelay();
    let i = B.length - 1; while (i > 0 && B[i].at > rt) i--;
    const A = B[i], Bn = B[i + 1];
    let tp, tb, tv;
    if (A.at > rt) { tp = A.p; tb = A.b; tv = A.v; }
    else if (Bn) {
      const f = clamp((rt - A.at) / ((Bn.at - A.at) || 1), 0, 1);
      tp = [0, 1, 2].map(j => A.p[j] + (Bn.p[j] - A.p[j]) * f); tv = [0, 1, 2].map(j => A.v[j] + (Bn.v[j] - A.v[j]) * f); tb = A.b + wrapA(Bn.b - A.b) * f;
    } else { const ex = Math.min(0.15, (rt - A.at) / 1000); tp = A.p.map((x, j) => x + A.v[j] * ex); tv = A.v; tb = A.b; }
    for (let j = 0; j < 3; j++) k.p[j] += (tp[j] - k.p[j]) * Math.min(1, DT * 30);
    k.v = tv.slice(); k.t += DT;
    k.bodyAngle += wrapA(tb - k.bodyAngle) * Math.min(1, DT * 25); k.headingAngle = (Bn || A).h;
    k.tunkaT = Math.max(0, (k.tunkaT || 0) - DT / 0.8);
  }
  function netSnap(m) {
    const now = performance.now(), N = G.net;
    if (N.lastSnap) { const gap = Math.min(1000, now - N.lastSnap); N.gap += (gap - N.gap) * 0.1; N.jit += (Math.abs(gap - N.gap) - N.jit) * 0.1; }
    N.lastSnap = now; N.lostAt = 0;
    for (const e of m.k) {
      const [id, seq, pp, vv, L, rr, T, h, b, al, tk, inc, pe, se, free, dmg, la] = e;
      const p = G.net.byId.get(id); if (!p) continue;
      if (p.ctrl === 'human1') { if (p.kite && p.kite.netSeq === seq && !p.kite.free) p.kite.damage = dmg; continue; }
      if (seq > p.netSeq && !free) { p.netSeq = seq; spawn(p); p.kite.p = pp.slice(); }
      const k = p.kite; if (!k || k.free || seq !== p.netSeq) continue;
      k.netT = { p: pp, v: vv, b, h, at: now };
      const buf = k.netBuf || (k.netBuf = []); buf.push(k.netT); if (buf.length > 12) buf.shift();
      k.lineLen = L; k.reelRate = rr; k.tension = T; k.alpha = al; k.tunkaT = Math.max(k.tunkaT || 0, tk); k.incl = inc;
      k.pullE = pe; k.sendE = se; k.damage = dmg; k.launch = la ? { t: 0 } : null;
    }
    if (G.duration) G.timeLeft = Math.max(0, G.duration - m.mt);
  }
  function netCut(m) {
    const lp = G.net.byId.get(m.l), wp = m.w ? G.net.byId.get(m.w) : null;
    if (lp && lp.kite && !lp.kite.cutHandled) {
      const lk = lp.kite; lk.cutHandled = true;
      if (lk.netT) lk.p = lk.netT.p.slice();
      if (!lk.free) lk.releaseLine(m.snap ? 'snap' : 'cut');
      onCut(lk, wp && wp.kite && !wp.kite.free && !m.snap ? wp.kite : (wp && wp.kite) || null, !!m.snap, m.s, m.pt);
    }
    applyScores(m.scores);
  }
  function applyScores(sc) {
    for (const [id, s] of Object.entries(sc || {})) { const p = G.net.byId.get(id); if (p) p.score = { cut: s.cut | 0, lost: s.lost | 0, caught: s.caught | 0, bonus: s.bonus | 0 }; }
  }
  function netLeft(m) {
    const p = G.net.byId.get(m.id); if (!p) return;
    if (p.kite && !p.kite.free) { p.kite.releaseLine('left'); }
    if (p.kite && !p.kite.inDrifters) { p.kite.inDrifters = true; p.kite.age = 0; G.drifters.push(p.kite); }
    for (const d of G.drifters) if (d.caught && d.caught.by === p) d.caught = null;
    G.players.splice(G.players.indexOf(p), 1); G.net.byId.delete(m.id);
    note(esc(p.name) + ' left the match');
  }
  function onlineEnd(m) {
    if (!G || !G.online) { renderOnline(); return; }
    G.over = true; G.paused = true; SFX.horn();
    const rows = m.results || [], mine = rows.find(r => r.id === ON.me), top = rows[0];
    if (m.teams && mine) {
      const T = m.team || [{ cut: 0 }, { cut: 0 }], me = mine.team | 0;
      $('#resTitle').textContent = m.teamWin < 0 ? `Draw - ${T[0].cut} : ${T[1].cut}` : m.teamWin === me ? `Your team wins! ${T[me].cut} - ${T[1 - me].cut}` : `Their team wins ${T[1 - me].cut} - ${T[me].cut}`;
    } else
    $('#resTitle').textContent = !mine ? 'Match over' : mine.place === 1 ? (m.cutTarget ? `You cut ${m.cutTarget} first - you win!` : 'You win the match!') : `${top ? top.name : '?'} wins - you finished #${mine.place} of ${rows.length}`;
    $('#resTable').innerHTML = '<tr><th>#</th><th>Flier</th><th>Cut</th><th>Kites caught</th><th>Lost</th><th>Points</th></tr>' + rows.map(r =>
      `<tr class="${r.id === ON.me ? 'me' : ''}"><td>${m.teams ? `<span class="tm t${r.team | 0}">${r.team ? 'B' : 'A'}</span>` : r.place}</td><td><i style="background:${esc(r.color)}"></i>${esc(r.name)}</td><td>${r.cut | 0}</td><td>${r.caught | 0}</td><td>${r.lost | 0}</td><td><b>${r.points | 0}</b></td></tr>`).join('');
    $('#resNote').textContent = 'Online match: every cut was decided by the server. Your record and trophies are saved.';
    $('#resAgain').textContent = 'Back to room'; $('#resMenu').textContent = 'Leave room';
    $('#results').classList.remove('hidden');
    announce(m.newTrophies); showPaid(m.paid || null);
    showMatchXp(mine ? (mine.cut | 0) * XP.cut + (mine.caught | 0) * XP.caught + (mine.place === 1 ? XP.win : 0) + XP.match : 0);
    if (NET.online) api('/api/profile').then(r => useProfile(r.profile)).catch(() => {});
  }
  function leaveGameView() {
    G = null; ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const id of ['#game', '#swap', '#results', '#tut']) $(id).classList.add('hidden');
    $('#resAgain').textContent = 'Play again'; $('#resMenu').textContent = 'Menu';
  }
  function onlineLeftMatch() { if (G && G.online && !G.over) { netSend({ t: 'leave' }); ON.room = null; } }
  $('#onlineBtn').onclick = () => NET.online ? showOnline() : toast(APP ? '<b>Online is coming soon.</b> For now play Festival, Duel, Two players and Mohalla - everything is saved on this phone.' : 'Online needs the game server: run <b>npm start</b> and open its web address (not the file).');

  /* ---------------- menus ---------------- */
  function kiteInfoHTML(e) {
    const a = archInfo(e.arche), s = specFor(e), st = a.stats, ag = AGILITY[e.arche] ?? 1;
    const bar = (lbl, n) => `<div class="st"><span>${lbl}</span><i>${'<b></b>'.repeat(n)}${'<em></em>'.repeat(5 - n)}</i></div>`;
    return `${kiteVis(e)}<div class="txt"><h4>${esc(e.name)} <small>${a.name} &middot; ${a.origin}</small></h4><p>${a.note}</p>
      <div class="stats">${bar('Speed', st.speed)}${bar('Agility', st.agility)}${bar('Stability', st.stability)}${bar('Lift', st.lift)}</div>
      <p class="tip"><b>How to fly it:</b> ${FLY_TIPS[e.arche] || FLY_TIPS.patang}</p>
      <p class="spec">${s.size.w.toFixed(2)} &times; ${s.size.h.toFixed(2)} m &middot; ${(s.mass * 1000).toFixed(0)} g &middot; turning ${Math.round(ag * 100)}% &middot; best wind ${s.wind[0]}&ndash;${s.wind[2]} m/s</p></div>`;
  }
  let cfg = { mode: 'festival', bots: 6, edit: 1 };
  function openSelect(mode) {
    $('#mohalla').classList.add('hidden');
    cfg.mode = mode; cfg.edit = 1; cfg.bots = { festival: 6, single: 1, two: 0, mohalla: (cfg.mh ? cfg.mh.size * 2 - 1 : 3) }[mode];
    $('#menu').classList.add('hidden'); $('#select').classList.remove('hidden'); renderSelect();
    // a double-click/tap on the menu button used to land its second click on a kite in the grid that just opened
    // underneath (opening the Buy pop-up for a locked kite). Ignore taps on the new screen for a moment.
    const sel = $('#select'); sel.style.pointerEvents = 'none'; clearTimeout(openSelect.t); openSelect.t = setTimeout(() => { sel.style.pointerEvents = ''; }, 350);
  }
  // Re-rendering the whole select screen on every click rebuilt the kite grid (hundreds of pictures), which reset its
  // scroll and made the page jump; and the kite-info box above the grid changed height on hover, which slid the grid
  // under the mouse, which hovered a different kite... - the "jerk". Now: scroll positions are kept, the kite grid is
  // only rebuilt when what it lists changes (otherwise just the highlight moves), and the info box never shrinks.
  let gridKey = '', gridHoverT = 0, gridRebuilt = false;
  function renderSelect() {
    const keep = [...$$('#select #kiteGrid, #select .sidepane, #select .sel-body, #select')].map(el => [el, el.scrollTop, el.scrollLeft]);
    gridRebuilt = false;
    try { renderSelectInner(); } finally { for (const [el, t, l] of keep) { if (gridRebuilt && el.id === 'kiteGrid') continue; el.scrollTop = t; el.scrollLeft = l; } }
  }
  function renderSelectInner() {
    const two = cfg.mode === 'two', ed = cfg.edit, n = ed === 2 ? '2' : '1';
    const kKey = 'k' + n, tKey = 't' + n, knKey = 'kn' + n, cKey = 'c' + n, spKey = 'sp' + n;
    $('#selTitle').textContent = MODE_NAMES[cfg.mode] || '';
    $('#play').innerHTML = cfg.mode === 'gear' ? 'Done &check;' : cfg.mode === 'mohalla' ? 'Fight &rarr;' : 'Fly &rarr;';
    if (cfg.mode === 'mohalla' && cfg.mh) $('#selTitle').textContent = 'Mohalla · ' + (cfg.mh.career >= 0 ? 'vs ' + KiteEconomy.MOHALLAS[cfg.mh.career].name : `${cfg.mh.size} vs ${cfg.mh.size}`);
    const noMatchTab = cfg.mode === 'gear' || cfg.mode === 'mohalla';   // the Mohalla screen already set the match up
    if (noMatchTab && cfg.side === 'match') cfg.side = 'flier';
    $$('#sideTabs button').forEach(b => b.classList.toggle('hidden', noMatchTab && b.dataset.st === 'match'));
    $('#tabs').classList.toggle('hidden', !two);
    $$('#tabs button').forEach(b => b.classList.toggle('on', +b.dataset.p === ed));
    const showInfo = id => {
      const e = catById(id), box = $('#kiteInfo'); if (box.dataset.id === id + '|' + owned('kite', id)) return; box.dataset.id = id + '|' + owned('kite', id);
      box.innerHTML = kiteInfoHTML(e);
      const own = owned('kite', e.id);
      $('#kiteInfo .txt').insertAdjacentHTML('beforeend', own ? `<button class="ghost sm" id="recolorBtn">${e.recipe ? 'Edit this kite' : 'Recolour / repaint this kite'}</button>`
        : `<button class="cta sm" id="recolorBtn">Buy &middot; ${priceTag(EC.priceOf('kite', e.id))}</button> <span class="rar r-${EC.rarityOf(EC.priceOf('kite', e.id)).toLowerCase()}">${EC.rarityOf(EC.priceOf('kite', e.id))}</span>`);
      $('#recolorBtn').onclick = () => own ? openWorkshop(e.recipe ? e : { baseId: e.id }) : openBuy('kite', e.id, () => { saved[kKey] = e.id; save(); renderSelect(); });
      hydrate(box);
      // grow-only height: a shorter description never pulls the grid up under the pointer
      if (IS_TOUCH) return;
      box.style.minHeight = ''; const h = box.offsetHeight; box.style.minHeight = Math.max(h, +(box.dataset.h || 0)) + 'px'; box.dataset.h = Math.max(h, +(box.dataset.h || 0));
    };
    cfg.ktype = cfg.ktype || 'all';
    const inType = (e, t) => t === 'all' || (t === 'mine' ? e.mine : t === 'flags' ? e.flag : t === 'basant' ? e.basant : e.arche === t);
    $('#kiteTabs').innerHTML = KITE_TYPES.map(t => { const nTy = CAT.filter(e => inType(e, t.id)).length; return (nTy || t.id === 'mine') ? `<button data-t="${t.id}" class="${t.id === cfg.ktype ? 'on' : ''}">${t.label} <small>${nTy}</small></button>` : ''; }).join('')
      + '<button class="make" id="makeKiteBtn">+ Kite workshop</button>';
    $$('#kiteTabs button[data-t]').forEach(b => b.onclick = () => { cfg.ktype = b.dataset.t; renderSelect(); });
    const openWorkshop = from => KiteMaker.open(saved, k => {
      k.name = cleanName(k.name) || 'My kite'; saved.myKites = [k, ...(saved.myKites || [])].slice(0, 60); CAT.unshift(k); saved[kKey] = k.id; cfg.ktype = 'mine'; save(); madeKite(); renderSelect();
    }, id => {
      saved.myKites = (saved.myKites || []).filter(k => k.id !== id); const i = CAT.findIndex(c => c.id === id); if (i >= 0) CAT.splice(i, 1);
      for (const key of ['k1', 'k2']) if (saved[key] === id) saved[key] = (CAT[0] || {}).id;
      save(); renderSelect();
    }, CAT.filter(c => owned('kite', c.id)), from);   // the workshop paints over kites you own
    $('#makeKiteBtn').onclick = () => openWorkshop(null);
    const shown = CAT.filter(e => inType(e, cfg.ktype));
    const lock = (kind, id) => owned(kind, id) ? '' : `<em class="lock">${priceTag(EC.priceOf(kind, id))}</em>`;
    // picking something not bought yet opens the buy box; once bought it is picked
    const pickOr = (kind, id, pick) => { if (owned(kind, id)) return pick(); openBuy(kind, id, () => { pick(); }); };
    const gk = [cfg.ktype, kKey, shown.length, shown.map(e => owned('kite', e.id) ? 1 : 0).join('')].join('|');
    if (gk === gridKey) { $$('#kiteGrid .it').forEach(el => el.classList.toggle('on', el.dataset.id === saved[kKey])); }
    else { gridKey = gk; gridRebuilt = true; $('#kiteGrid').scrollTop = 0; $('#kiteGrid').innerHTML = shown.map(e => `<div class="it ${e.id === saved[kKey] ? 'on' : ''} ${owned('kite', e.id) ? '' : 'locked'}" data-id="${e.id}" title="${esc(e.name)}">${kiteVis(e, true)}<span>${esc(e.name)}</span>${lock('kite', e.id)}</div>`).join('');
    hydrate($('#kiteGrid'));
    $$('#kiteGrid .it').forEach(el => {
      el.onclick = () => pickOr('kite', el.dataset.id, () => { saved[kKey] = el.dataset.id; save(); renderSelect(); });
      if (IS_TOUCH) return;   // phones: no hover preview (a tap fired it AND the pick, so the info box jumped twice)
      el.onmouseenter = () => { clearTimeout(gridHoverT); gridHoverT = setTimeout(() => showInfo(el.dataset.id), 90); };
      el.onmouseleave = () => { clearTimeout(gridHoverT); gridHoverT = setTimeout(() => showInfo(saved[kKey]), 160); };
    }); }
    showInfo(saved[kKey]);
    const chars = (myFlier() ? [myFlier()] : []).concat(CHARACTERS);
    $('#charRow').innerHTML = chars.map(c => `<div class="th ch ${c.id === saved[cKey] ? 'on' : ''} ${c.id === 'myflier' || owned('char', c.id) ? '' : 'locked'}" data-id="${c.id}">${charThumb(c)}<b>${esc(c.name)}</b>${c.id === 'myflier' ? '' : lock('char', c.id)}</div>`).join('')
      + '<div class="th ch make" id="makeFlierBtn"><div class="chi" style="font-size:34px;line-height:80px">+</div><b>Make your own</b></div>';
    $$('#charRow .th[data-id]').forEach(el => el.onclick = () => { const id = el.dataset.id, pick = () => { saved[cKey] = id; save(); renderSelect(); }; id === 'myflier' ? pick() : pickOr('char', id, pick); });
    $('#makeFlierBtn').onclick = () => Fliers.open(saved, o => { saved.myFlier = o; saved[cKey] = 'myflier'; save(); renderSelect(); });
    paintFliers($('#charRow'));
    const pips = (n, c) => `<i class="pips">${('<em class="on" style="background:' + c + '"></em>').repeat(n)}${'<em></em>'.repeat(5 - n)}</i>`;
    const dorSwatch = c => `<svg viewBox="0 0 38 38"><circle cx="19" cy="19" r="15" fill="${c}"/><path d="M6 15 C14 11 24 25 32 21 M7 22 C15 18 23 31 31 27 M9 9 C16 6 25 16 31 13" stroke="rgba(0,0,0,.28)" stroke-width="1.6" fill="none"/></svg>`;
    $('#threadRow').innerHTML = Object.values(THREADS).map(t => `<div class="th ${t.id === saved[tKey] ? 'on' : ''} ${owned('thread', t.id) ? '' : 'locked'}" data-id="${t.id}" title="${t.note}"><div class="sp">${dorSwatch(t.color)}</div><div><b>${t.name}</b><small>Cut ${pips(t.stats.cut, '#ff7a45')}</small><small>Strength ${pips(t.stats.strength, '#3ddc97')}</small></div>${lock('thread', t.id)}</div>`).join('');
    $$('#threadRow .th').forEach(el => el.onclick = () => pickOr('thread', el.dataset.id, () => { saved[tKey] = el.dataset.id; save(); renderSelect(); }));
    $('#spoolRow').innerHTML = SPOOLS.map(s => `<div class="th ${s.id === saved[spKey] ? 'on' : ''} ${owned('spool', s.id) ? '' : 'locked'}" data-id="${s.id}" title="${s.name}"><div class="sp"><img src="${spoolSrc(s, THREADS[saved[tKey]].color)}" alt="${s.name}"></div><b>${s.name.split(' · ')[1]}</b>${lock('spool', s.id)}</div>`).join('');
    $$('#spoolRow .th').forEach(el => el.onclick = () => pickOr('spool', el.dataset.id, () => { saved[spKey] = el.dataset.id; save(); renderSelect(); }));
    $('#kanniRow').innerHTML = Object.entries(KANNI_PRESETS).map(([id, kn]) => `<div class="th ${id === saved[knKey] ? 'on' : ''}" data-id="${id}"><b>${kn.label}</b><small>${kn.note}</small></div>`).join('');
    $$('#kanniRow .th').forEach(el => el.onclick = () => { saved[knKey] = el.dataset.id; save(); renderSelect(); });
    const kbKey = 'kb' + n;
    $('#kbalRow').innerHTML = Object.entries(KANNI_BALANCE).map(([id, kb]) => `<div class="th ${id === saved[kbKey] ? 'on' : ''}" data-id="${id}"><b>${kb.label}</b><small>${kb.note}</small></div>`).join('');
    $$('#kbalRow .th').forEach(el => el.onclick = () => { saved[kbKey] = el.dataset.id; save(); renderSelect(); });
    $('#diffRow').innerHTML = Object.entries(DIFFICULTY).map(([id, d]) => `<div class="th ${id === saved.diff ? 'on' : ''}" data-id="${id}"><b>${d.label}</b><small>${d.note}</small></div>`).join('');
    $$('#diffRow .th').forEach(el => el.onclick = () => { saved.diff = el.dataset.id; save(); renderSelect(); });
    $('#timeRow').innerHTML = Object.entries(MATCH_TIMES).map(([s, lbl]) => `<div class="th ${String(s) === String(saved.mtime) ? 'on' : ''}" data-id="${s}"><b>${lbl}</b></div>`).join('');
    $$('#timeRow .th').forEach(el => el.onclick = () => { saved.mtime = /^c/.test(el.dataset.id) ? el.dataset.id : +el.dataset.id; save(); renderSelect(); });
    const sceneBg = s => s.pano ? `background-image:url(${s.pano})` : `background:linear-gradient(to bottom, ${[...s.sky].reverse().map(x => x[1]).join(', ')} 70%, ${s.ground[0]} 70%, ${s.ground[1]})`;
    $('#sceneRow').innerHTML = Object.entries(SCENES).map(([id, s]) => `<div class="sc ${id === saved.scene ? 'on' : ''}" data-id="${id}" style="${sceneBg(s)}"><span>${s.name}</span></div>`).join('');
    $$('#sceneRow .sc').forEach(el => el.onclick = () => { saved.scene = el.dataset.id; save(); renderSelect(); });
    $('#layoutWrap').classList.toggle('hidden', !two);
    $('#layoutRow').innerHTML = Object.entries(LAYOUTS).map(([id, l]) => `<div class="th ${id === saved.layout ? 'on' : ''}" data-id="${id}"><b>${l.label}</b><small>${l.note}</small></div>`).join('');
    $$('#layoutRow .th').forEach(el => el.onclick = () => { saved.layout = el.dataset.id; save(); renderSelect(); });
    $('#botsN').textContent = cfg.bots;
    // side tabs (Flier / Dor & Charkhi / Kanni / Match) - each fits on screen, so nothing needs page scrolling
    cfg.side = cfg.side || 'flier';
    $$('#sideTabs button').forEach(b => { b.classList.toggle('on', b.dataset.st === cfg.side); b.onclick = () => { cfg.side = b.dataset.st; renderSelect(); }; });
    $$('.sidepane').forEach(el => el.classList.toggle('hidden', el.dataset.pane !== cfg.side));
    // loadout: what this player is taking up to the roof; click one to jump to its tab
    const ke = catById(saved[kKey]), ch = charById(saved[cKey]), th = THREADS[saved[tKey]], sp = SPOOLS.find(x => x.id === saved[spKey]) || SPOOLS[0];
    $('#loadout').innerHTML = `<div class="lo" data-go="kite">${kiteVis(ke)}<span><b>${esc(ke.name)}</b>Kite</span></div>
      <div class="lo" data-go="flier"><span><b>${esc(ch.name)}</b>Flier</span></div>
      <div class="lo" data-go="gear"><div class="sw">${dorSwatch(th.color)}</div><span><b>${th.name}</b>Dor</span></div>
      <div class="lo" data-go="gear"><img src="${spoolSrc(sp, th.color)}" alt=""><span><b>${sp.name.split(' · ')[1]}</b>${sp.kind === 'pinna' ? 'Pinna' : 'Charkhi'}</span></div>`;
    hydrate($('#loadout'));
    $$('#loadout .lo').forEach(el => el.onclick = () => { if (el.dataset.go === 'kite') $('#kiteGrid .it.on')?.scrollIntoView({ block: 'center', behavior: 'smooth' }); else { cfg.side = el.dataset.go; renderSelect(); } });
  }
  $$('#menu [data-mode]').forEach(b => b.onclick = () => openSelect(b.dataset.mode));
  $$('#tabs button').forEach(b => b.onclick = () => { cfg.edit = +b.dataset.p; renderSelect(); });
  $('#botsMinus').onclick = () => { cfg.bots = Math.max(0, cfg.bots - 1); renderSelect(); };
  $('#botsPlus').onclick = () => { cfg.bots = Math.min(9, cfg.bots + 1); renderSelect(); };
  $('#selBack').onclick = () => { $('#select').classList.add('hidden'); if (cfg.mode === 'gear') return showOnline(); if (cfg.mode === 'mohalla') return openMohalla(); showMenu(); };
  /* ---------------- Mohalla: the career ladder and quick team matches ---------------- */
  const mhQuick = { size: 2, diff: 'normal', mtime: 'c5' };
  const DIFF_NAME = { easy: 'Easy', normal: 'Normal', hard: 'Hard' };
  function openMohalla() {
    for (const id of ['#menu', '#select']) $(id).classList.add('hidden');
    const beaten = econ().career | 0, L = KiteEconomy.MOHALLAS;
    $('#mhProgress').textContent = `${Math.min(beaten, L.length)} / ${L.length} beaten`;
    $('#mhLadder').innerHTML = L.map((m, i) => { const st = i < beaten ? 'won' : i === beaten ? 'next' : 'locked';
      return `<div class="mh-rung ${st}"><div class="mh-n">${i + 1}</div><div class="mh-txt"><b>${esc(m.name)}</b><small>${m.size} vs ${m.size} &middot; ${DIFF_NAME[m.diff]} &middot; ${esc(MATCH_TIMES[m.mtime])} &middot; ${esc(SCENES[m.scene] ? SCENES[m.scene].name : '')}</small><small class="muted">${esc(m.note)}</small></div>
        <div class="mh-act">${st === 'won' ? `<span class="mh-badge">&check; Beaten</span><button class="ghost sm" data-mh="${i}">Rematch</button>` : st === 'next' ? `<span class="mh-rw">${priceTag(m.reward)}</span><button class="cta sm" data-mh="${i}">Fight</button>` : '<span class="mh-badge lock">&#128274; Beat the one above</span>'}</div></div>`; }).join('')
      + (beaten >= L.length ? '<p class="mh-champ">&#127942; You are the champion of Basant. Rematch anyone, any time.</p>' : '');
    $$('#mhLadder [data-mh]').forEach(b => b.onclick = () => { const i = +b.dataset.mh, m = L[i]; cfg.mh = { size: m.size, diff: m.diff, mtime: m.mtime, scene: m.scene, career: i === beaten ? i : -1, rival: m.name }; openSelect('mohalla'); });
    const opt = (el, list, key) => { $(el).innerHTML = list.map(([id, l, note]) => `<div class="th ${String(mhQuick[key]) === String(id) ? 'on' : ''}" data-id="${id}"><b>${l}</b>${note ? `<small>${note}</small>` : ''}</div>`).join('');
      $$(el + ' .th').forEach(x => x.onclick = () => { mhQuick[key] = key === 'size' ? +x.dataset.id : x.dataset.id; openMohalla(); }); };
    opt('#mhSize', [[2, '2 vs 2', 'You + 1 team-mate'], [3, '3 vs 3', 'You + 2 team-mates']], 'size');
    opt('#mhDiff', Object.entries(DIFFICULTY).map(([id, d]) => [id, d.label]), 'diff');
    opt('#mhLen', Object.entries(MATCH_TIMES).filter(([id]) => id !== '0').map(([id, l]) => [id, l]), 'mtime');
    $('#mhQuick').onclick = () => { cfg.mh = { ...mhQuick, scene: saved.scene, career: -1, rival: 'Rivals' }; openSelect('mohalla'); };
    $('#mohalla').classList.remove('hidden');
  }
  function mohallaCfg() { const m = cfg.mh || { size: 2, diff: 'normal', mtime: 'c5', scene: saved.scene, career: -1 }; return { bots: m.size * 2 - 1, diff: m.diff, mtime: m.mtime, scene: m.scene, teamSize: m.size, career: m.career }; }
  $('#mohallaBtn').onclick = () => openMohalla();
  $('#mhClose').onclick = () => { $('#mohalla').classList.add('hidden'); showMenu(); };
  const matchCfg = (extra = {}) => ({ scene: saved.scene, k1: saved.k1, k2: saved.k2, t1: saved.t1, t2: saved.t2, kn1: saved.kn1, kn2: saved.kn2, kb1: saved.kb1, kb2: saved.kb2, c1: saved.c1, c2: saved.c2, sp1: saved.sp1, sp2: saved.sp2, bots: cfg.bots, diff: saved.diff, mtime: saved.mtime, layout: saved.layout, ...extra });
  $('#play').onclick = () => {
    ensureLoadout(cfg.mode === 'two');
    if (cfg.mode === 'gear') { if (ON.room) netSend({ t: 'gear', gear: myGear() }); $('#select').classList.add('hidden'); return showOnline(); }
    startMatch(cfg.mode, matchCfg(cfg.mode === 'mohalla' ? mohallaCfg() : {}));
  };
  $('#tutBtn').onclick = () => { cfg.bots = 1; startMatch('single', matchCfg({ bots: 1, diff: 'easy', mtime: 0, tutorial: true })); };
  $('#tutSkip').onclick = () => endTut();
  /* ---------------- home hub (v6.3): pick a rooftop, pick how to fly, Play ----------------
   * Like a mobile game's home screen: Play starts straight away with the kite and gear you have on; the Kites button
   * on the rail is where you change them (and the match length / bots). */
  const STAGE_ORDER = ['lahore', 'sunset', 'basant', 'walled', 'village', 'hills', 'desert', 'seaside', 'towers', 'monsoon', 'winter', 'valley'];
  const STAGES = [...STAGE_ORDER.filter(k => SCENES[k]), ...Object.keys(SCENES).filter(k => !STAGE_ORDER.includes(k))];
  const HUB_MODES = [['festival', 'Festival', 'You against a sky full of fliers'], ['single', 'Duel', 'One on one with a bot'], ['two', 'Two players', 'Same screen, same rooftop']];
  saved.hubMode = HUB_MODES.some(m => m[0] === saved.hubMode) ? saved.hubMode : 'festival';
  const sceneBgCss = s => s.pano ? `url(${s.pano}) center/cover` : `linear-gradient(to bottom, ${[...s.sky].reverse().map(x => x[1]).join(', ')})`;
  function renderHub() {
    if (!$('#stageArt')) return;
    const i = Math.max(0, STAGES.indexOf(saved.scene)), sc = SCENES[STAGES[i]], m = HUB_MODES.find(x => x[0] === saved.hubMode);
    $('#stageName').innerHTML = `<span>${i + 1}.</span> ${esc(sc.name)}`;
    const ke = catById(saved.k1), night = sc.nightDrawn || sc.night;
    $('#stageArt').style.setProperty('--sky', sceneBgCss(sc));
    $('#stageArt').style.setProperty('--roof', night ? '#22213a' : sc.dusk ? '#5a3d48' : (sc.ground || ['#cdbd9c'])[1]);
    $('#stageArt').innerHTML = `<div class="sa-sky"></div><div class="sa-kite">${kiteVis(ke)}</div><svg class="sa-line" viewBox="0 0 100 100" preserveAspectRatio="none"><path d="M50 98 Q46 70 49 40" /></svg><div class="sa-roofs"></div>
      <div class="sa-tag"><b>${esc(ke.name)}</b><small>${esc((THREADS[saved.t1] || THREADS.manjha).name)} &middot; ${esc(m[2])}</small></div>`;
    hydrate($('#stageArt'));
    $('#hubDiff b').textContent = DIFFICULTY[saved.diff].label;
    $('#hubDiff').classList.toggle('hidden', saved.hubMode === 'two');
    $('#hubMode b').textContent = m[1];
    renderBadges();
  }
  const stageStep = d => { const i = Math.max(0, STAGES.indexOf(saved.scene)); saved.scene = STAGES[(i + d + STAGES.length) % STAGES.length]; save(); SFX.ui(); renderHub(); };
  $('#stagePrev').onclick = () => stageStep(-1); $('#stageNext').onclick = () => stageStep(1);
  { let x0 = null; const art = $('#stageArt');   // swipe the stage left/right on a phone
    art.addEventListener('pointerdown', e => { x0 = e.clientX; }); art.addEventListener('pointerup', e => { if (x0 != null && Math.abs(e.clientX - x0) > 40) stageStep(e.clientX < x0 ? 1 : -1); x0 = null; }); }
  /* v6.5: Mode and Bots open a picker - every choice as a card, the current one marked - instead of silently cycling */
  const flame = n => `<span class="pk-flames">${'<i></i>'.repeat(n)}${'<i class="off"></i>'.repeat(3 - n)}</span>`;
  function pickArt(id) {
    const ks = CAT.filter(e => e.src && !e.recipe), k = i => ks.length ? `<img src="${ks[(i * 13 + 5) % ks.length].src}" alt="">` : '';
    if (id === 'festival') return `<div class="pk-art pk-fest">${k(0)}${k(1)}${k(2)}${k(3)}${k(4)}</div>`;
    if (id === 'single') return `<div class="pk-art pk-duel">${k(6)}${k(7)}<svg viewBox="0 0 100 60" aria-hidden="true"><path d="M20 58 62 6M80 58 38 6" stroke="#fff" stroke-width="1.6" fill="none"/><circle cx="50" cy="21" r="4" fill="#ffd24d"/></svg></div>`;
    return `<div class="pk-art pk-two"><svg viewBox="0 0 100 60" aria-hidden="true"><circle cx="34" cy="20" r="9" fill="#ffd24d" stroke="#2a1606" stroke-width="2"/><path d="M18 58c1-14 7-21 16-21s15 7 16 21Z" fill="#e8402f" stroke="#2a1606" stroke-width="2"/><circle cx="66" cy="20" r="9" fill="#ffd24d" stroke="#2a1606" stroke-width="2"/><path d="M50 58c1-14 7-21 16-21s15 7 16 21Z" fill="#4cb7ff" stroke="#2a1606" stroke-width="2"/></svg></div>`;
  }
  function openPick(kind) {
    const isMode = kind === 'mode', cur = isMode ? saved.hubMode : saved.diff;
    const opts = isMode ? HUB_MODES.map(([id, name, note]) => ({ id, name, note, art: pickArt(id) }))
      : Object.entries(DIFFICULTY).map(([id, d], i) => ({ id, name: d.label, note: d.note, art: `<div class="pk-art pk-diff">${flame(i + 1)}</div>` }));
    $('#pickTitle').textContent = isMode ? 'How do you want to fly?' : 'How good are the bots?';
    $('#pickBody').className = 'pick-grid' + (isMode ? '' : ' pick-diff');
    $('#pickBody').innerHTML = opts.map(o => `<button class="pk ${o.id === cur ? 'on' : ''}" role="radio" aria-checked="${o.id === cur}" data-id="${o.id}">${o.art}<b>${esc(o.name)}</b><small>${esc(o.note)}</small><em class="pk-check" aria-hidden="true">&check;</em></button>`).join('');
    $$('#pickBody .pk').forEach(b => b.onclick = () => {
      if (isMode) saved.hubMode = b.dataset.id; else saved.diff = b.dataset.id;
      save(); SFX.ui(); buzz(15);
      $$('#pickBody .pk').forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-checked', x === b); });
      renderHub(); setTimeout(() => $('#pickPop').classList.add('hidden'), 220);   // a moment to see the choice land
    });
    $('#pickPop').classList.remove('hidden');
  }
  $('#hubDiff').onclick = () => { SFX.ui(); openPick('diff'); };
  $('#hubMode').onclick = () => { SFX.ui(); openPick('mode'); };
  $('#pickClose').onclick = () => $('#pickPop').classList.add('hidden');
  // the rail lights up the section you are in
  { const map = [['#shop', '#shopBtn'], ['#select', '#railKites'], ['#mohalla', '#mohallaBtn'], ['#online', '#onlineBtn'], ['#nameScreen', '#onlineBtn']];
    const sync = () => { const open = map.find(([scr]) => !$(scr).classList.contains('hidden')); $$('.hub-rail .rail-b').forEach(b => b.classList.toggle('on', open ? '#' + b.id === open[1] : b.id === 'railHome')); };
    const mo = new MutationObserver(sync); for (const [scr] of map) mo.observe($(scr), { attributes: true, attributeFilter: ['class'] }); sync(); }
  function hubPlay(mode = saved.hubMode) {
    if (econ().loading) { toast('Loading your kites&hellip;'); return; }
    ensureLoadout(mode === 'two');
    cfg.mode = mode; cfg.bots = { festival: 6, single: 1, two: 0 }[mode];
    startMatch(mode, matchCfg());
  }
  $('#hubPlay').onclick = () => hubPlay();
  $('#dailyCard').onclick = () => { saved.hubMode = 'festival'; save(); hubPlay('festival'); };   // the challenge strip: straight into a Festival, the place to do it
  $('#railKites').onclick = () => openSelect(saved.hubMode);
  $('#railHome').onclick = () => { for (const id of ['#shop', '#coll', '#lb', '#trophies', '#how', '#loginPop', '#mohalla', '#settings']) $(id).classList.add('hidden'); showMenu(); };
  $('#resAgain').onclick = () => { if (G && G.online) { leaveGameView(); return showOnline(); } const c = G && G.cfg, m = G && G.mode; if (c) startMatch(m, c); };
  $('#resMenu').onclick = () => { if (G && G.online) { netSend({ t: 'leave' }); ON.room = null; leaveGameView(); return showMenu(); } endMatch(); };
  /* v7: one in-match menu (the ⌂ and ❚❚ buttons, Esc, Android back): Resume, Settings, controls, Quit to home.
   * The ⌂ button used to drop you out of the match at once, and the pause screen on a phone said "Press P to continue"
   * with no way to continue - players got stuck in it. */
  function openPauseMenu() { if (!G || G.over || G.swapPlayer || G.replay) return; G.menuOpen = true; if (!G.online) G.paused = true; SFX.ui(); }
  function closePauseMenu() { if (!G) return; G.menuOpen = false; if (!G.online) G.paused = false; }
  const pauseOpen = () => !!(G && (G.menuOpen || G.paused));
  $('#back').onclick = () => pauseOpen() ? closePauseMenu() : openPauseMenu();
  $('#pauseResume').onclick = closePauseMenu;
  $('#pauseQuit').onclick = () => { if (G) G.menuOpen = false; endMatch(); };
  $('#rotHome').onclick = () => { if (G) G.menuOpen = false; endMatch(); };   // upright mid-match: leave without having to turn the phone first
  $('#pauseBtn').onclick = () => pauseOpen() ? closePauseMenu() : openPauseMenu();
  $('#botPlus').onclick = () => G && addBot(); $('#botMinus').onclick = () => G && removeBot();
  $('#zoomIn').onclick = () => G && zoomAll(1.15);
  /* phones/tablets (v7.1): a zoom SLIDER on the left edge - drag the handle up to zoom in, down to zoom out; + and -
   * at its ends step it; two-finger pinch on the sky still works (button controls - with swipe controls a second
   * finger is the tunka, so the slider does the zooming there). The handle follows the zoom however it was changed. */
  const ZS = { el: $('#zoomSlider'), track: $('#zsTrack'), thumb: $('#zsThumb'), fill: $('#zsFill'), drag: null, shown: -1 };
  const zoomFrac = z => clamp(Math.log(z / ZOOM_MIN) / Math.log(ZOOM_MAX / ZOOM_MIN), 0, 1);
  const zoomAt = f => ZOOM_MIN * Math.pow(ZOOM_MAX / ZOOM_MIN, clamp(f, 0, 1));
  function zoomTo(z) { if (!G) return; const v0 = G.viewers[0], c0 = v0 && v0.cam; const cur = c0 ? c0.zoom : 1; if (cur > 0) zoomAll(z / cur); }
  function zsSync(force) {   // put the handle where the zoom is (cheap: only when it moved)
    if (!ZS.el || !G) return; const c = G.viewers[0] && G.viewers[0].cam; if (!c) return;
    const f = zoomFrac(c.zoom); if (!force && Math.abs(f - ZS.shown) < 0.002) return; ZS.shown = f;
    const H = ZS.track.clientHeight || 1; ZS.thumb.style.transform = `translateY(${((1 - f) * H).toFixed(1)}px)`; ZS.fill.style.height = (f * 100).toFixed(1) + '%';
    ZS.el.setAttribute('aria-valuenow', Math.round(f * 100));
  }
  if (ZS.el) {
    ZS.track.addEventListener('pointerdown', e => {
      if (!G) return; e.preventDefault(); e.stopPropagation(); try { ZS.track.setPointerCapture(e.pointerId); } catch (x) {}
      const c = G.viewers[0] && G.viewers[0].cam, f0 = c ? zoomFrac(c.zoom) : 0.5, r = ZS.track.getBoundingClientRect(), thumbY = r.top + (1 - f0) * r.height;
      // grabbed the handle: drag it from where it is. Touched the track elsewhere: the handle jumps there, then drags
      const onThumb = Math.abs(e.clientY - thumbY) < 30;
      ZS.drag = { id: e.pointerId, y0: e.clientY, f0: onThumb ? f0 : clamp(1 - (e.clientY - r.top) / r.height, 0, 1), h: r.height };
      if (!onThumb) { zoomTo(zoomAt(ZS.drag.f0)); zsSync(true); }
      ZS.el.classList.add('drag'); if (saved.vibrate !== false && navigator.vibrate) try { navigator.vibrate(6); } catch (x) {}
    });
    ZS.track.addEventListener('pointermove', e => { const d = ZS.drag; if (!d || e.pointerId !== d.id) return; e.preventDefault(); zoomTo(zoomAt(d.f0 + (d.y0 - e.clientY) / d.h)); zsSync(true); });
    const end = e => { if (ZS.drag && e.pointerId === ZS.drag.id) { ZS.drag = null; ZS.el.classList.remove('drag'); } };
    ZS.track.addEventListener('pointerup', end); ZS.track.addEventListener('pointercancel', end);
    for (const id of ['#tzIn', '#tzOut']) $(id).addEventListener('pointerdown', e => e.stopPropagation());
  }
  $('#tzIn').onclick = () => { if (G) { zoomAll(1.18); zsSync(true); SFX.ui(); } };
  $('#tzOut').onclick = () => { if (G) { zoomAll(1 / 1.18); zsSync(true); SFX.ui(); } };
  { let pd = 0; const dist = t => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
    canvas.addEventListener('touchstart', e => { if (e.touches.length === 2 && saved.touchMode !== 'swipe') { pd = dist(e.touches); e.preventDefault(); } }, { passive: false });
    canvas.addEventListener('touchmove', e => { if (pd && e.touches.length === 2 && G) { const d = dist(e.touches); if (d > 0) { zoomAll(clamp(d / pd, 0.8, 1.25)); pd = d; } e.preventDefault(); } }, { passive: false });
    canvas.addEventListener('touchend', e => { if (e.touches.length < 2) pd = 0; }); }
  $('#zoomOut').onclick = () => G && zoomAll(1 / 1.15);
  $('#landBtn').onclick = () => G && requestLand(G.viewers[0]);
  saved.replay = saved.replay !== false; saved.party = saved.party !== false;
  function renderPrefs() {
    $$('#replayPick [data-replay]').forEach(b => b.classList.toggle('on', (b.dataset.replay === 'on') === saved.replay));
    $$('#lootPick [data-loot]').forEach(b => b.classList.toggle('on', b.dataset.loot === (saved.lootcam === 'off' || saved.lootcam === 'large' ? saved.lootcam : 'small')));
    $$('#partyPick [data-party]').forEach(b => b.classList.toggle('on', (b.dataset.party === 'on') === saved.party));
  }
  $$('#replayPick [data-replay]').forEach(b => b.onclick = () => { saved.replay = b.dataset.replay === 'on'; save(); renderPrefs(); SFX.ui(); });
  $$('#lootPick [data-loot]').forEach(b => b.onclick = () => { saved.lootcam = b.dataset.loot; save(); renderPrefs(); SFX.ui(); if (typeof renderQuick === 'function') renderQuick(); });
  $$('#partyPick [data-party]').forEach(b => b.onclick = () => { saved.party = b.dataset.party === 'on'; save(); renderPrefs(); SFX.ui(); });
  renderPrefs();
  /* ---------------- music & sound ----------------
   * Music: on/off and a track (Basant Mix, the single tracks, or the player's own songs). B and the HUD button step to
   * the next track, and after the last one, off. The Music & sound panel also holds the volume, your songs, the kite's
   * own sound and the shout voice. */
  const trackName = id => id === 'mine' ? 'Your songs' : ((SFX.TRACKS.find(t => t.id === id) || {}).name || 'Basant Mix');
  function applyMusic(announce) {
    save(); SFX.init(); SFX.setTrack(saved.track); SFX.setMusic(saved.music);
    const label = saved.music ? trackName(saved.track) : 'Music off';
    $('#musicBtn').classList.toggle('off', !saved.music); $('#musicBtn').title = 'Music: ' + label + ' (B for the next track)';
    $$('#musicPick [data-music]').forEach(b => b.classList.toggle('on', (b.dataset.music === 'on') === saved.music));
    renderMusicPanel();
    if (announce && G) note('\u266B ' + label);
  }
  function toggleMusic() {
    const ids = SFX.TRACKS.map(t => t.id).concat(SFX.songList().length ? ['mine'] : []);
    if (!saved.music) { saved.music = true; saved.track = ids[0]; }
    else { const i = ids.indexOf(saved.track); if (i >= ids.length - 1) saved.music = false; else saved.track = ids[i + 1]; }
    applyMusic(true);
  }
  function renderMusicPanel() {
    if (!$('#settings')) return;
    const songs = SFX.songList();
    $$('#mOnOff [data-m]').forEach(b => b.classList.toggle('on', (b.dataset.m === 'on') === saved.music));
    $('#mVol').value = Math.round(saved.musicVol * 100);
    $('#trackList').innerHTML = SFX.TRACKS.concat([{ id: 'mine', name: 'Your songs', note: songs.length ? songs.length + ' song' + (songs.length > 1 ? 's' : '') + ', shuffled' : 'Add some below first' }])
      .map(t => `<button class="track ${saved.music && saved.track === t.id ? 'on' : ''}" data-track="${t.id}" ${t.id === 'mine' && !songs.length ? 'disabled' : ''}><b>${esc(t.name)}</b><small>${esc(t.note || '')}</small></button>`).join('');
    $$('#trackList [data-track]').forEach(b => b.onclick = () => { saved.track = b.dataset.track; saved.music = true; applyMusic(); });
    $('#songCount').textContent = songs.length ? songs.length + ' added' : 'none yet';
    $('#songList').innerHTML = songs.map(x => `<li><span>${esc(x.name)}</span>${x.host ? '<small class="muted">server</small>' : `<button data-rm="${esc(x.id)}" title="Remove" aria-label="Remove">&times;</button>`}</li>`).join('');
    $$('#songList [data-rm]').forEach(b => b.onclick = async () => { await SFX.removeSong(b.dataset.rm); if (saved.track === 'mine' && !SFX.songList().length) saved.track = 'mix'; applyMusic(); });
    $$('#kOnOff [data-k]').forEach(b => b.classList.toggle('on', (b.dataset.k === 'on') === saved.kiteSound));
    $$('#kitePick [data-kites]').forEach(b => b.classList.toggle('on', (b.dataset.kites === 'on') === saved.kiteSound));
    $$('#vPick [data-v]').forEach(b => b.classList.toggle('on', b.dataset.v === saved.voice));
    $$('#rOnOff [data-r]').forEach(b => b.classList.toggle('on', (b.dataset.r === 'on') === saved.party));
    const vi = SFX.voiceInfo();
    $('#vInfo').textContent = saved.voice === 'off' ? 'No shouts.' : vi.builtIn
      ? 'This device has no Urdu or Hindi voice installed, so the game\'s own rooftop voice shouts instead. For a natural voice, add an Urdu or Hindi voice in your device\'s speech settings (or use Chrome / Edge, which include one).'
      : 'Shouting with: ' + vi.name + ' (' + vi.lang + ')';
  }
  const setKites = on => { saved.kiteSound = on; save(); SFX.setKiteSound(on); renderMusicPanel(); SFX.ui(); };
  $('#musicBtn').onclick = toggleMusic;
  $$('#musicPick [data-music]').forEach(b => b.onclick = () => { saved.music = b.dataset.music === 'on'; applyMusic(); SFX.ui(); });
  $$('#mOnOff [data-m]').forEach(b => b.onclick = () => { saved.music = b.dataset.m === 'on'; applyMusic(); });
  $('#mVol').oninput = e => { saved.musicVol = +e.target.value / 100; SFX.setMusicVolume(saved.musicVol); };
  $('#mVol').onchange = () => save();
  $('#songFile').onchange = async e => {
    const n0 = SFX.songList().length; await SFX.addSongs(e.target.files); e.target.value = '';
    if (SFX.songList().length > n0) { saved.track = 'mine'; saved.music = true; applyMusic(); toast('&#9835; Added ' + (SFX.songList().length - n0) + ' song(s) &mdash; now playing your songs'); }
    else toast('Those files are not songs this browser can play');
  };
  $$('#kOnOff [data-k]').forEach(b => b.onclick = () => setKites(b.dataset.k === 'on'));
  $$('#kitePick [data-kites]').forEach(b => b.onclick = () => setKites(b.dataset.kites === 'on'));
  $$('#vPick [data-v]').forEach(b => b.onclick = () => { saved.voice = b.dataset.v; save(); SFX.setVoice(saved.voice); renderMusicPanel(); if (saved.voice !== 'off') SFX.testVoice(); });
  $('#vTest').onclick = () => SFX.testVoice();
  $$('#rOnOff [data-r]').forEach(b => b.onclick = () => { saved.party = b.dataset.r === 'on'; save(); renderPrefs(); renderMusicPanel(); SFX.ui(); });
  if (window.speechSynthesis) try { speechSynthesis.addEventListener('voiceschanged', () => renderMusicPanel()); } catch (e) {}
  /* ---------------- theme: dark (default), light, or follow the device ---------------- */
  const sysLight = matchMedia('(prefers-color-scheme: light)');
  function applyTheme() {
    const t = saved.theme || 'dark', eff = t === 'auto' ? (sysLight.matches ? 'light' : 'dark') : t;
    document.documentElement.dataset.theme = eff;
    const mc = document.querySelector('meta[name=theme-color]'); if (mc) mc.content = eff === 'light' ? '#f5efe4' : '#0e1424';
    $$('#themePick [data-theme]').forEach(b => b.classList.toggle('on', b.dataset.theme === t));
  }
  $$('#themePick [data-theme]').forEach(b => b.onclick = () => { saved.theme = b.dataset.theme; save(); applyTheme(); SFX.ui(); });
  if (sysLight.addEventListener) sysLight.addEventListener('change', () => { if (saved.theme === 'auto') applyTheme(); });
  applyTheme();
  /* ---------------- Settings page: every option in one place ----------------
   * Opened from the menu (Settings) or in a match (gear button / pause). An offline match pauses while it is open and
   * resumes when it closes; online the match keeps running (it is the server's clock). */
  const STEERS = [0.75, 1, 1.35];
  function STEER_MUL() { const v = +saved.steer; return STEERS.includes(v) ? v : 1; }
  let setPausedByUs = false;
  function openSettings(pane) {
    SFX.init(); renderSettings(); renderMusicPanel();
    if (pane) showSetPane(pane);
    if (G && !G.online && !G.over && !G.paused) { G.paused = true; setPausedByUs = true; }
    for (const k in keys) delete keys[k];
    $('#settings').classList.remove('hidden');
  }
  function closeSettings() {
    $('#settings').classList.add('hidden');
    if (setPausedByUs && G && !G.over && !G.swapPlayer && !G.replay) { G.paused = false; G.acc = 0; }
    setPausedByUs = false;
  }
  function showSetPane(id) {
    $$('#setNav [data-sp]').forEach(b => { b.classList.toggle('on', b.dataset.sp === id); b.setAttribute('aria-selected', b.dataset.sp === id); });
    $$('#settings .set-pane').forEach(x => x.classList.toggle('hidden', x.dataset.pane !== id));
    try { sessionStorage.setItem('kfSetPane', id); } catch (e) {}
  }
  function renderSettings() {
    if (typeof renderQuick === 'function') { renderQuick(); renderAccount(); }
    $$('#sfxPick [data-sfx]').forEach(b => b.classList.toggle('on', (b.dataset.sfx === 'on') === saved.sound));
    $$('#steerPick [data-steer]').forEach(b => b.classList.toggle('on', +b.dataset.steer === STEER_MUL()));
    $$('#gfxPick [data-gfx]').forEach(b => b.classList.toggle('on', b.dataset.gfx === (saved.gfx || 'auto')));
    $('#setName').textContent = saved.netName || ON.name || 'Not set';
    $('#setRename').classList.toggle('hidden', !!G);
    $('#setTut').disabled = !!G;
    const fs = document.fullscreenEnabled || document.webkitFullscreenEnabled;
    $('#setFull').closest('.set-row').classList.toggle('hidden', !fs);
    $('#setFull').textContent = (document.fullscreenElement || document.webkitFullscreenElement) ? 'Exit full screen' : 'Full screen';
    renderPrefs(); applyTouchMode(); applyTheme();
  }
  function applyGfx() {
    const g = saved.gfx || 'auto', top = 2;
    QUAL.fixed = g !== 'auto';
    if (g === 'saver') { QUAL.max = QUAL.scale = 1; QUAL.min = 1; QUAL.low = true; }
    else if (g === 'high') { QUAL.max = QUAL.scale = top; QUAL.low = false; }
    else { QUAL.max = top; QUAL.min = 1; QUAL.scale = Math.max(QUAL.min, Math.min(QUAL.scale, top)); QUAL.low = false; }
    resize();
  }
  $('#setBtnMenu').onclick = () => openSettings();
  $('#dailyCard').onclick = () => openSelect('festival');   // the challenge card was a button that did nothing: it now takes you to a Festival, the place to do it
  $('#setBtn').onclick = () => openSettings();
  $('#pauseSet').onclick = () => openSettings();
  $('#setClose').onclick = closeSettings;
  $('#settings').addEventListener('pointerdown', e => { if (e.target === $('#settings')) closeSettings(); });
  $$('#setNav [data-sp]').forEach(b => b.onclick = () => { showSetPane(b.dataset.sp); SFX.ui(); });
  try { const sp = sessionStorage.getItem('kfSetPane'); if (sp && $(`#setNav [data-sp="${sp}"]`)) showSetPane(sp); } catch (e) {}
  $$('#sfxPick [data-sfx]').forEach(b => b.onclick = () => { saved.sound = b.dataset.sfx === 'on'; save(); SFX.setEnabled(saved.sound); renderSettings(); SFX.ui(); });
  $$('#steerPick [data-steer]').forEach(b => b.onclick = () => {
    saved.steer = +b.dataset.steer; save(); renderSettings(); SFX.ui();
    if (G) for (const p of G.players) if (p.kite && p.ctrl.startsWith('human')) p.kite.turnMul = STEER_MUL();
  });
  $$('#gfxPick [data-gfx]').forEach(b => b.onclick = () => { saved.gfx = b.dataset.gfx; save(); applyGfx(); renderSettings(); SFX.ui(); });
  $('#setTut').onclick = () => { if (G) return; closeSettings(); $('#tutBtn').click(); };
  $('#setKeys').onclick = () => { closeSettings(); $('#how').classList.remove('hidden'); };
  $('#setFull').onclick = async () => {
    try {
      if (document.fullscreenElement || document.webkitFullscreenElement) await (document.exitFullscreen || document.webkitExitFullscreen).call(document);
      else { const el = document.documentElement; await (el.requestFullscreen || el.webkitRequestFullscreen).call(el); }
    } catch (e) { toast('Full screen is not available here'); }
    setTimeout(renderSettings, 250);
  };
  $('#setRename').onclick = () => { if (G) return; closeSettings(); showNameScreen(showMenu); };
  $('#setReset').onclick = () => {
    if (!confirm('Reset every setting to its default? Your coins, kites and records are kept.')) return;
    Object.assign(saved, { sound: true, music: true, musicVol: 0.6, kiteSound: true, voice: 'ur', party: true, replay: true, lootcam: 'small', touchMode: 'buttons', theme: 'dark', steer: 1, gfx: 'auto', track: 'mix' });
    delete saved.touchLayout; save();
    SFX.setEnabled(true); SFX.setMusicVolume(saved.musicVol); SFX.setKiteSound(true); SFX.setVoice(saved.voice);
    applyGfx(); applyMusic(); applyTouchLayout(); renderSettings(); renderMusicPanel();
    if (G) for (const p of G.players) if (p.kite && p.ctrl.startsWith('human')) p.kite.turnMul = 1;
    toast('Settings reset');
  };
  /* ---- Settings -> General: the everyday switches in one grid (like a phone game's settings card) ---- */
  function renderQuick() {
    const T = [['music', 'Music', () => saved.music, v => { saved.music = v; SFX.setMusic(v); }], ['sound', 'Sound effects', () => saved.sound, v => { saved.sound = v; SFX.setEnabled(v); }],
      ['vibrate', 'Vibration', () => saved.vibrate !== false, v => { saved.vibrate = v; if (v) buzz(30); }], ['kiteSound', 'Kite sound', () => saved.kiteSound, v => { saved.kiteSound = v; SFX.setKiteSound(v); }],
      ['replay', 'Cut replays', () => saved.replay, v => { saved.replay = v; }], ['party', 'Roof music', () => saved.party, v => { saved.party = v; }],
      ['idleSpin', 'Kite turns when left alone', () => saved.idleSpin === true, v => { saved.idleSpin = v; }],
      ['lootcam', 'Loot window', () => saved.lootcam !== 'off', v => { saved.lootcam = v ? 'small' : 'off'; }],
      ['saver', 'Battery saver', () => saved.gfx === 'saver', v => { saved.gfx = v ? 'saver' : 'auto'; applyGfx(); }], ['swipe', 'Swipe controls', () => saved.touchMode === 'swipe', v => { saved.touchMode = v ? 'swipe' : 'buttons'; applyTouchMode(); }]];
    const box = $('#quickToggles'); if (!box) return;
    box.innerHTML = T.map(([id, l, get]) => `<label class="tog"><span>${l}</span><input type="checkbox" role="switch" data-q="${id}" ${get() ? 'checked' : ''}><i aria-hidden="true"></i></label>`).join('');
    $$('#quickToggles input').forEach(inp => inp.onchange = () => { const t = T.find(x => x[0] === inp.dataset.q); t[3](inp.checked); save(); SFX.ui(); if (typeof renderSettings === 'function') renderSettings(); });
  }
  function renderAccount() {
    const row = $('#acctRow'); if (!row) return;
    const a = NET.account, on = NET.online;
    $('#acctRestoreRow').classList.toggle('hidden', !on);
    $('#acctPid').textContent = on ? (a ? 'Player ID ' + a.pid : '…') : '';
    $('#acctCopy').classList.toggle('hidden', !on || !a);
    $('#acctInfo').textContent = on ? 'Copy this code somewhere safe. On another phone or browser, paste it below to get the same coins and kites back.' : APP ? 'Your coins and kites are saved on this phone. Uninstalling the app removes them.' : 'Playing from a file: your coins and kites are kept in this browser only.';
  }
  $('#acctCopy').onclick = async () => { const a = NET.account; if (!a) return; try { await navigator.clipboard.writeText(a.code); toast('Backup code copied. Keep it private - it opens your account.'); } catch (e) { prompt('Your backup code (keep it private):', a.code); } };
  $('#acctRestore').onclick = async () => {
    const code = $('#acctCode').value.trim(); if (!code) return toast('Paste a backup code first.');
    try { const r = await api('/api/restore', { code }); NET.account = r.account; saved.acct = r.account.code; save(); useProfile(r.profile); $('#acctCode').value = ''; renderAccount(); renderHub(); toast('Account restored - your coins and kites are here.'); }
    catch (e) { toast(esc(e.message)); }
  };
  applyGfx();
  applyMusic(); applyTouchMode();
  renderRank(); renderWallet();
  setInterval(() => { if (!$('#menu').classList.contains('hidden')) renderWallet(); }, 60000);   // the daily countdown
  $('#swapCancel').onclick = () => G && G.swapPlayer && closeSwap(G.swapPlayer, false);
  $('#howBtn').onclick = () => $('#how').classList.remove('hidden');
  $('#trophyBtn').onclick = openTrophies; $('#trophyOk').onclick = () => $('#trophies').classList.add('hidden'); $('#howOk').onclick = () => $('#how').classList.add('hidden');
  if (!saved.tutDone) $('#tutBtn').classList.add('new');
  /* phones play sideways only: go full screen and lock the screen to landscape where the browser allows it (Android
   * Chrome and most others). Where it can't be locked (iPhone Safari), the "turn your phone" cover in index.html sits
   * over the game in portrait. Browsers only allow this from a tap, so it is retried on taps until it holds. */
  function goLandscape() {
    if (!IS_TOUCH) return;
    try {
      const d = document.documentElement, so = screen.orientation;
      if (so && /^landscape/.test(so.type) && document.fullscreenElement) return;
      const fs = !document.fullscreenElement && d.requestFullscreen ? d.requestFullscreen({ navigationUI: 'hide' }) : Promise.resolve();
      fs.catch(() => {}).then(() => so && so.lock ? so.lock('landscape') : null).catch(() => {});
    } catch (e) {}
  }
  // menus, shop and name entry work upright too (typing a name is easier that way); only a match needs the phone sideways
  const inMatch = () => !$('#game').classList.contains('hidden');
  if (IS_TOUCH) addEventListener('pointerup', () => { if (inMatch() && (innerHeight > innerWidth || !document.fullscreenElement)) goLandscape(); }, true);
  { const gm = $('#game'), sync = () => { const on = inMatch(); document.body.classList.toggle('in-match', on); if (SFX.setScene) SFX.setScene(on ? 'match' : 'menu');
      if (on) { goLandscape(); setTimeout(resize, 50); } else { try { screen.orientation && screen.orientation.unlock && screen.orientation.unlock(); } catch (e) {} } };
    new MutationObserver(sync).observe(gm, { attributes: true, attributeFilter: ['class'] }); sync(); }
  // turning the phone upright mid-match pauses it (offline); the cover asks to turn it back
  addEventListener('resize', () => { if (IS_TOUCH && innerHeight > innerWidth && G && !G.online && !G.over && !G.swapPlayer) G.paused = true; });
  (function menuSky() {
    const el = $('#menuSky'); if (!el) return;
    const spots = [[90, 6, 96, 8], [93, 40, 70, 11], [86, 74, 60, 7], [46, 1, 58, 10], [2, 56, 84, 9], [4, 84, 58, 12], [3, 8, 66, 8]];   // around the edges, behind the menu
    const pics = CAT.filter(e => e.src && !e.recipe), pickN = i => pics[(i * 7 + 3) % Math.max(1, pics.length)];
    if (!pics.length) return;
    el.innerHTML = spots.map(([x, y, sz, d], i) => {
      return `<img src="${pickN(i).src}" alt="" style="left:${x}%;top:${y}%;--s:${sz}px;--d:${d}s;--dx:${(i % 2 ? -1 : 1) * (10 + i * 3)}px;--dy:${-12 - i * 2}px">`; }).join('');
    el.querySelectorAll('img').forEach(i => i.addEventListener('error', () => i.remove()));
  })();
  /* ---------------- splash: preload the kite pictures, then one tap starts the music and opens the menu ----------------
   * (Browsers don't allow sound before the player touches the page, so the tap is what lets the music start.) */
  (function splash() {
    const el = $('#splash'); if (!el) { $('#menu').classList.remove('hidden'); return; }
    const pics = CAT.filter(e => e.src && !e.recipe), sky = $('#splashSky');
    sky.innerHTML = Array.from({ length: Math.min(9, pics.length) }, (_, i) => { const e = pics[(i * 5 + 1) % pics.length];
      return `<img src="${e.src}" alt="" style="left:${6 + i * 10.5}%;--s:${60 + (i * 37) % 60}px;--d:${11 + (i * 7) % 9}s;--dl:${-i * 1.7}s;--dx:${(i % 2 ? -1 : 1) * (20 + i * 4)}px">`; }).join('');
    sky.querySelectorAll('img').forEach(i => i.addEventListener('error', () => i.remove()));
    const list = pics.slice(0, 60).map(e => e.src);
    const lines = ['Tying the kanni…', 'Glassing the manjha…', 'Winding the charkhi…', 'Climbing to the roof…', 'Checking the wind…'];
    let done = 0; const total = Math.max(1, list.length);
    const tick = () => { done++; $('#splashBar').style.width = Math.round(100 * done / total) + '%'; $('#splashTxt').textContent = lines[Math.min(lines.length - 1, Math.floor(done / total * lines.length))]; if (done >= total) ready(); };
    list.forEach(src => { const i = new Image(); i.onload = i.onerror = tick; i.src = src; });
    if (!list.length) ready();
    setTimeout(ready, 6000);   // never keep anyone waiting on a slow picture
    let isReady = false;
    function ready() { if (isReady) return; isReady = true; try { if (menuFirst()) showMenu(); } catch (e) {} $('#splashBar').style.width = '100%'; $('#splashTxt').textContent = 'Hawa theek hai — the wind is right.'; $('#splashGo').disabled = false; }
    try { SFX.init(); } catch (e) {}   // if this browser already allows sound here, the music starts right away
    /* v7.1 SMOOTH HAND-OVER. The tap used to do everything in the same instant: ask for full screen + landscape (the
     * page changes size, often portrait -> landscape), build the home screen, start fading the splash, and pop the
     * daily-login card 0.7 s later - so the home screen re-laid itself out and jumped WHILE it faded in ("jerking").
     * Now: the home screen is built under the splash while the kites load (pictures decoded, layout done); the tap
     * asks for full screen and the splash waits, still covering everything, until the size has stopped changing;
     * then ONE clean crossfade; the login card comes after the fade has finished. */
    const menuFirst = () => !(NET.online && (ON.want || !saved.netName));
    let going = false;
    const go = () => {
      if (!isReady || going) return; going = true;
      SFX.init(); SFX.setMusic(saved.music); SFX.ui();
      removeEventListener('keydown', onKey);
      $('#splashGo').classList.add('going');
      const needFs = IS_TOUCH && !(document.fullscreenElement && screen.orientation && /^landscape/.test(screen.orientation.type));
      goLandscape();
      let last = performance.now(), t0 = last, done = false;
      const onRs = () => { last = performance.now(); };
      addEventListener('resize', onRs);
      const reveal = () => {
        if (done) return; done = true; removeEventListener('resize', onRs);
        if (!menuFirst()) { if (!saved.netName) showNameScreen(ON.want ? showOnline : showMenu); else showOnline(); }
        else showMenu();   // already built under the splash: this only refreshes it at its final size
        requestAnimationFrame(() => requestAnimationFrame(() => {   // let that frame land, then fade
          el.classList.add('out');
          setTimeout(() => { el.classList.add('hidden'); el.querySelector('#splashSky').innerHTML = '';   // its floating kites stop costing anything
            if (!NET.online || NET.ready) setTimeout(() => { if (!G && loginNow().can && !$('#menu').classList.contains('hidden') && saved.tutDone) openLogin('login'); }, 250);
          }, 480);
        }));
      };
      if (!needFs) reveal();
      else { const wait = () => { const now = performance.now(); if (done) return; if ((now - last > 160 && now - t0 > 120) || now - t0 > 900) reveal(); else requestAnimationFrame(wait); }; requestAnimationFrame(wait); }
      if (saved.retiredRefund || saved.retiredNote) {   // v7.1: tell them once what happened to a retired kite
        const c = saved.retiredRefund | 0; delete saved.retiredRefund; delete saved.retiredNote; save();
        setTimeout(() => toast(c > 0 ? `Some kite types were retired from the game. You got <b>${c} coins</b> back for the ones you had bought.` : 'Some kite types were retired from the game - your kite was swapped for a starter kite.'), 1200);
      }
    };
    const onKey = e => { if (e.key === 'Enter' || e.key === ' ') go(); };
    $('#splashGo').onclick = go; el.onclick = e => { if (e.target === el || e.target.closest('.splash-inner')) go(); };
    addEventListener('keydown', onKey);
  })();
  /* ---- the phone app: full screen, the Android back button, pausing in the background ---- */
  if (APP && NATIVE && NATIVE.Plugins) {
    const PL = NATIVE.Plugins;
    try { PL.SystemBars && PL.SystemBars.hide(); } catch (e) {}   // Capacitor 8: status + navigation bars
    try { PL.StatusBar && PL.StatusBar.hide(); } catch (e) {}
    try { PL.SplashScreen && setTimeout(() => PL.SplashScreen.hide(), 300); } catch (e) {}
    // back: close the top panel -> leave the match (pausing it first) -> on the home screen, leave the app
    try { PL.App && PL.App.addListener('backButton', () => {
      if (!$('#ctlEditor').classList.contains('hidden')) { $('#ceCancel').click(); return; }
      for (const id of ['#rewardPop', '#pickPop', '#buyPop', '#loginPop', '#settings', '#shop', '#coll', '#lb', '#trophies', '#how', '#maker', '#charMaker', '#mohalla', '#online', '#nameScreen', '#select']) {
        const el = $(id); if (el && !el.classList.contains('hidden')) {
          if (id === '#select') $('#selBack').click(); else if (id === '#mohalla') $('#mhClose').click(); else if (id === '#settings') $('#setClose').click();
          else if (id === '#rewardPop') el.click(); else if (id === '#online') $('#onClose').click(); else if (id === '#nameScreen') $('#nameSkip').click();
          else if (id === '#maker') $('#mkClose').click(); else if (id === '#charMaker') $('#cmClose').click(); else el.classList.add('hidden');
          return; }
      }
      if (G) { if (G.over) return $('#resMenu').click(); if (G.swapPlayer) return closeSwap(G.swapPlayer, false); if (G.replay) return endReplay(); if (!pauseOpen()) return openPauseMenu(); return closePauseMenu(); }
      PL.App.exitApp();
    }); } catch (e) {}
    try { PL.App && PL.App.addListener('appStateChange', st => { if (!st.isActive && G && !G.over && !G.online) G.paused = true; }); } catch (e) {}
  }
  requestAnimationFrame(loop);
  // test/debug hook: development only. The production build defines KF_DEBUG = false and this is stripped out, so
  // nobody can reach into a running match from the browser console.
  if (KF_DEBUG) window.__game = { qual: (sc, low) => { QUAL.fixed = sc != null; if (sc != null) { QUAL.scale = sc; QUAL.low = !!low; resize(); } return { ...QUAL }; }, openSelect: m => openSelect(m), finishMatch: () => finishMatch(), tutState: () => G && G.tut, advance: sec => { for (let i = 0; i < sec / DT; i++) step(); }, kiteScreen: () => { const v = G && G.viewers[0]; if (!v || !v.kite || !v.lastCam) return null; const q = project(v.lastCam, v.kite.p); return q ? { x: q.x / v.lastVp.w, y: q.y / v.lastVp.h } : { x: -9, y: -9 }; }, get G() { return G; }, startMatch, matchCfg: x => (ensureLoadout(false), matchCfg(x)), CAT, SCENES, CHARACTERS, SPOOLS, debugCut: (i, j) => { const k = G.players[i].kite; k.releaseLine('cut'); onCut(k, G.players[j].kite, false, 0.6, k.p.slice()); } };
})();
