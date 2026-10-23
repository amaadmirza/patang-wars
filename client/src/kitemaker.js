/* Kite maker: make your own kite FROM YOUR OWN KITE PICTURES (assets/kites). The shape is never redrawn - every
 * custom kite is one of your real patang / tukkal / gudda pictures, so its outline, sticks and tail stay exactly as made.
 *
 *   Colours  - the kite's own colours are found automatically (sail, goley, tikkay...). Tap one, pick a new colour;
 *              folds, shading and sticks stay.
 *   Paper    - make a new design the way a kite-maker does: the sail is split into panels along the real spine and
 *              bow (do-rangi halves, upar-neeche, char-khana, kaat), then tissue-paper pieces are pasted on: gol sir,
 *              chand, gola, goley, patti, dhaari, tikkay, dumchi, kinara. Every piece is placed from the kite's own
 *              nose / wings / tail found in the picture, so it fits the shape. The paper's folds are laid back on top.
 *
 * Colours are picked from one palette of tissue-paper colours (no fiddly colour wheels). A custom kite is saved as a
 * small recipe {base picture + choices} and painted when the game loads. Works offline; when a browser blocks
 * reading picture pixels (file://), Colours is unavailable but Paper still works. */
(function (root) {
  'use strict';
  const SIZE = 256;
  // tissue-paper colours a kite-maker keeps on the shelf
  const PALETTE = ['#ffffff', '#f4ead5', '#ffd23f', '#ffb000', '#ff8c1a', '#ff5a1f', '#e3121b', '#b5121b', '#7a0f1f', '#ff5ea8', '#e8355a', '#f2718f',
    '#c2185b', '#9c27b0', '#5b2a86', '#3a0ca3', '#1d4ed8', '#4ea8de', '#00a3a3', '#0b6e4f', '#1d6b3a', '#5aa02c', '#a3d977', '#7a5230',
    '#3a2a20', '#111111', '#6b6b6b', '#c9a227'];
  const SPLITS = { saada: 'Saada', adha: 'Do-rangi (halves)', aar: 'Upar-neeche', char: 'Char-khana', kaat: 'Kaat (tirchi)' };
  const PIECES = {
    golSir: 'Gol sir', chand: 'Chand', gola: 'Gola', goley: 'Goley', patti: 'Patti (spine)', dhaari: 'Dhaari (bow)',
    tikkay: 'Tikkay', dumchi: 'Dumchi', kinara: 'Kinara'
  };
  const PIECE_COL = { golSir: '#ffffff', chand: '#ffffff', gola: '#111111', goley: '#111111', patti: '#111111', dhaari: '#ffd23f', tikkay: '#ffd23f', dumchi: '#111111', kinara: '#ffd23f' };
  // ready-made paper designs, like the kites on any Basant rooftop
  const STYLES = [
    { id: 'sirwali', name: 'Sir wali', c1: '#c2185b', split: 'saada', on: { golSir: true, dumchi: true }, pc: { golSir: '#f4ead5', dumchi: '#3a2a20' } },
    { id: 'chandwali', name: 'Chand wali', c1: '#3a0ca3', split: 'saada', on: { chand: true }, pc: { chand: '#f4ead5' } },
    { id: 'dorangi', name: 'Do-rangi', c1: '#e3121b', c2: '#111111', split: 'aar', on: {}, pc: {} },
    { id: 'adha', name: 'Adha', c1: '#ffffff', c2: '#1d4ed8', split: 'adha', on: { dumchi: true }, pc: { dumchi: '#1d4ed8' } },
    { id: 'charkhana', name: 'Char-khana', c1: '#111111', c2: '#ffffff', split: 'char', on: { patti: true, dhaari: true }, pc: { patti: '#e8355a', dhaari: '#e8355a' } },
    { id: 'goley', name: 'Goley', c1: '#f2718f', split: 'saada', on: { goley: true, patti: true }, pc: { goley: '#111111', patti: '#111111' } },
    { id: 'gola', name: 'Gola', c1: '#ffd23f', split: 'saada', on: { gola: true, tikkay: true, kinara: true }, pc: { gola: '#e3121b', tikkay: '#e3121b', kinara: '#e3121b' } },
    { id: 'kaat', name: 'Kaat', c1: '#ff8c1a', c2: '#0b6e4f', split: 'kaat', on: { tikkay: true }, pc: { tikkay: '#ffffff' } }
  ];
  const DEF = { mode: 'paper', regions: {}, c1: '#c2185b', c2: '#111111', split: 'saada', on: { golSir: true, dumchi: true }, pc: { ...PIECE_COL, golSir: '#f4ead5', dumchi: '#3a2a20' }, texture: 0.9, keepDetails: true, hue: 0, sat: 100, bri: 100 };

  /* ---------------- images & pixel access ---------------- */
  const imgs = {};
  function loadImg(src) {
    if (!imgs[src]) imgs[src] = new Promise(res => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });
    return imgs[src];
  }
  function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  const hex = c => '#' + c.map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
  function hsl(c) { const r = c[0] / 255, g = c[1] / 255, b = c[2] / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
    if (!d) return [0, 0, l]; const s = d / (1 - Math.abs(2 * l - 1)); let h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; return [(h * 60 + 360) % 360, s, l]; }
  // move a pixel from its region's mean colour onto a new colour, keeping its light and shade (folds, sticks, shadow)
  function shadeTo(out, i, src, mean, t, strength) {
    const lp = src[i] * 0.3 + src[i + 1] * 0.59 + src[i + 2] * 0.11, lm = mean[0] * 0.3 + mean[1] * 0.59 + mean[2] * 0.11;
    if (lm > 45) { const f = 1 + (Math.max(0.35, Math.min(1.5, lp / lm)) - 1) * strength; out[0] = t[0] * f; out[1] = t[1] * f; out[2] = t[2] * f; }
    else { const dl = Math.max(-60, Math.min(60, lp - lm)) * strength; out[0] = t[0] + dl; out[1] = t[1] + dl; out[2] = t[2] + dl; }
  }
  const rgb = h => { const n = parseInt(String(h).slice(1), 16) || 0; return [n >> 16, (n >> 8) & 255, n & 255]; };

  // analysis of one base picture at one size: its pixels, outline box, and colour regions (cached)
  const anCache = {};
  function analyse(img, src, S) {
    const key = src + '@' + S; if (anCache[key] !== undefined) return anCache[key];
    const c = canvas(S, S), g = c.getContext('2d'); fit(g, img, S);
    let data;
    try { data = g.getImageData(0, 0, S, S).data; } catch (e) { return (anCache[key] = null); }   // picture can't be read here (file://)
    // outline box
    let x0 = S, y0 = S, x1 = 0, y1 = 0;
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) if (data[(y * S + x) * 4 + 3] > 24) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    if (x1 <= x0) { x0 = 0; y0 = 0; x1 = S - 1; y1 = S - 1; }
    // colour regions: k-means on the kite's pixels (farthest-point start so small tikkay still get a region)
    const pts = []; const step = Math.max(1, Math.floor(S * S / 9000));
    for (let i = 0; i < S * S; i += step) if (data[i * 4 + 3] > 40) pts.push([data[i * 4], data[i * 4 + 1], data[i * 4 + 2]]);
    const d2 = (a, b) => (a[0] - b[0]) ** 2 * 0.9 + (a[1] - b[1]) ** 2 * 1.2 + (a[2] - b[2]) ** 2 * 0.8;
    let cent = [];
    if (pts.length) {
      const mean = [0, 1, 2].map(i => pts.reduce((s, p) => s + p[i], 0) / pts.length);
      let best = pts[0]; for (const p of pts) if (d2(p, mean) < d2(best, mean)) best = p; cent.push(best.slice());
      while (cent.length < 7) { let far = null, fd = -1; for (const p of pts) { let m = Infinity; for (const q of cent) m = Math.min(m, d2(p, q)); if (m > fd) { fd = m; far = p; } } if (fd < 30 * 30) break; cent.push(far.slice()); }
      for (let it = 0; it < 10; it++) {
        const sum = cent.map(() => [0, 0, 0, 0]);
        for (const p of pts) { let bi = 0, bd = Infinity; cent.forEach((q, i) => { const d = d2(p, q); if (d < bd) { bd = d; bi = i; } }); const s = sum[bi]; s[0] += p[0]; s[1] += p[1]; s[2] += p[2]; s[3]++; }
        cent = sum.filter(s => s[3]).map(s => [s[0] / s[3], s[1] / s[3], s[2] / s[3]]);
      }
      // merge near-duplicates - and lighter/darker shades of the same colour (a sail's folds are one colour, not three)
      const same = (a, b) => { if (d2(a, b) < 34 * 34) return true; const A = hsl(a), B = hsl(b); return A[1] > 0.28 && B[1] > 0.28 && A[2] > 0.12 && B[2] > 0.12 && Math.min(Math.abs(A[0] - B[0]), 360 - Math.abs(A[0] - B[0])) < 11; };
      for (let i = 0; i < cent.length; i++) for (let j = i + 1; j < cent.length; j++) if (same(cent[i], cent[j])) { cent[i] = cent[i].map((v, k) => (v + cent[j][k]) / 2); cent.splice(j, 1); j = i; }
    }
    // label every pixel, count region sizes, drop specks (they join their nearest big region)
    const label = new Uint8Array(S * S).fill(255), count = cent.map(() => 0);
    const near = (r, gg, b) => { let bi = 0, bd = Infinity; for (let i = 0; i < cent.length; i++) { const q = cent[i], d = (r - q[0]) ** 2 * 0.9 + (gg - q[1]) ** 2 * 1.2 + (b - q[2]) ** 2 * 0.8; if (d < bd) { bd = d; bi = i; } } return bi; };
    let inside = 0;
    for (let i = 0; i < S * S; i++) if (data[i * 4 + 3] > 24) { const k = near(data[i * 4], data[i * 4 + 1], data[i * 4 + 2]); label[i] = k; count[k]++; inside++; }
    const keep = cent.map((c, i) => count[i] / Math.max(1, inside) > 0.006);
    if (keep.some(k => !k)) {
      const old = cent; cent = old.filter((c, i) => keep[i]); count.length = 0; cent.forEach(() => count.push(0));
      for (let i = 0; i < S * S; i++) if (label[i] !== 255) { const k = near(data[i * 4], data[i * 4 + 1], data[i * 4 + 2]); label[i] = k; count[k]++; }
    }
    // order regions biggest first, so "Colour 1" is the sail
    const order = cent.map((c, i) => i).sort((a, b) => count[b] - count[a]), remap = new Uint8Array(256).fill(255);
    order.forEach((o, n) => { remap[o] = n; });
    for (let i = 0; i < S * S; i++) if (label[i] !== 255) label[i] = remap[label[i]];
    const regions = order.map(o => ({ rgb: cent[o], hex: hex(cent[o]), share: count[o] / Math.max(1, inside) }));
    // distance from the outline (for the kinara) - two-pass chamfer
    const dist = new Float32Array(S * S);
    for (let i = 0; i < S * S; i++) dist[i] = data[i * 4 + 3] > 100 ? 1e9 : 0;
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) { const i = y * S + x; if (!dist[i]) continue; let m = dist[i]; if (x) m = Math.min(m, dist[i - 1] + 1); if (y) m = Math.min(m, dist[i - S] + 1); if (x && y) m = Math.min(m, dist[i - S - 1] + 1.41); if (y && x < S - 1) m = Math.min(m, dist[i - S + 1] + 1.41); if (x === 0 || y === 0 || x === S - 1 || y === S - 1) m = Math.min(m, 1); dist[i] = m; }
    for (let y = S - 1; y >= 0; y--) for (let x = S - 1; x >= 0; x--) { const i = y * S + x; if (!dist[i]) continue; let m = dist[i]; if (x < S - 1) m = Math.min(m, dist[i + 1] + 1); if (y < S - 1) m = Math.min(m, dist[i + S] + 1); if (x < S - 1 && y < S - 1) m = Math.min(m, dist[i + S + 1] + 1.41); if (y < S - 1 && x) m = Math.min(m, dist[i + S - 1] + 1.41); dist[i] = m; }
    return (anCache[key] = { S, data, label, regions, dist, box: [x0, y0, x1 - x0 + 1, y1 - y0 + 1], geo: keypoints(data, S, x0, y0, x1, y1) });
  }
  function fit(g, img, S) {   // draw the picture centred in an S x S square, keeping its proportions
    const sc = Math.min(S / img.naturalWidth, S / img.naturalHeight), w = img.naturalWidth * sc, h = img.naturalHeight * sc;
    g.drawImage(img, (S - w) / 2, (S - h) / 2, w, h);
  }


  // the kite's own geometry from its picture: nose (top tip), tail (bottom tip), wing tips, and the centre where the
  // spine crosses the bow - so pasted pieces sit where a kite-maker would put them on THIS shape
  function keypoints(data, S, x0, y0, x1, y1) {
    const A = (x, y) => data[(y * S + x) * 4 + 3] > 60;
    const rowMid = y => { let s = 0, n = 0; for (let x = x0; x <= x1; x++) if (A(x, y)) { s += x; n++; } return n ? s / n : null; };
    const colMid = x => { let s = 0, n = 0; for (let y = y0; y <= y1; y++) if (A(x, y)) { s += y; n++; } return n ? s / n : null; };
    let N = null, B = null, L = null, R = null;
    for (let y = y0; y <= y1 && !N; y++) { const m = rowMid(y); if (m !== null) N = [m, y]; }
    for (let y = y1; y >= y0 && !B; y--) { const m = rowMid(y); if (m !== null) B = [m, y]; }
    for (let x = x0; x <= x1 && !L; x++) { const m = colMid(x); if (m !== null) L = [x, m]; }
    for (let x = x1; x >= x0 && !R; x--) { const m = colMid(x); if (m !== null) R = [x, m]; }
    return geoFrom(N, B, L, R);
  }
  function geoFrom(N, B, L, R) {
    const bowY = (L[1] + R[1]) / 2, C = [N[0], bowY], W = R[0] - L[0], H = B[1] - N[1];
    return { N, B, L, R, C, W, H };
  }
  // when the browser won't let us read pixels (game opened straight from a file) we use these, measured from the
  // pictures in assets/kites (nose x,y, tail x,y, left wing x,y, right wing x,y as fractions of the square)
  const KNOWN = {"chakkar":[0.496,0.18,0.494,0.824,0.125,0.508,0.875,0.516],"chakra":[0.502,0.078,0.52,0.895,0.117,0.494,0.895,0.504],"charkhana":[0.504,0.047,0.518,0.984,0.0,0.545,0.996,0.545],"dabbi":[0.506,0.055,0.506,0.992,0.039,0.459,0.973,0.459],"goleykala":[0.498,0.031,0.51,0.973,0.004,0.535,0.992,0.543],"gulabi":[0.5,0.023,0.5,0.945,0.055,0.508,0.941,0.506],"jaal":[0.498,0.094,0.507,0.969,0.039,0.492,0.953,0.496],"kalasir":[0.498,0.105,0.498,0.961,0.008,0.51,0.988,0.51],"kalax":[0.498,0.09,0.507,0.855,0.102,0.422,0.895,0.422],"neela":[0.498,0.055,0.498,0.941,0.0,0.549,0.996,0.547],"paanlal":[0.498,0.078,0.498,0.977,0.004,0.613,0.992,0.613],"kali-gulabi":[0.498,0.035,0.498,0.969,0.0,0.568,0.996,0.568],"peela":[0.5,0.125,0.5,0.871,0.07,0.516,0.93,0.516],"phool":[0.498,0.051,0.498,0.93,0.004,0.551,0.992,0.551],"safedpaan":[0.502,0.094,0.508,0.898,0.012,0.475,0.988,0.471],"surajgoley":[0.502,0.07,0.502,0.973,0.004,0.467,0.996,0.467],"tirchi":[0.496,0.086,0.498,0.891,0.051,0.48,0.945,0.477],"tukkal-lal":[0.496,0.0,0.482,0.984,0.012,0.438,0.98,0.438],"tkHara":[0.508,0.102,0.5,0.98,0.043,0.441,0.965,0.455],"tkRang":[0.504,0.062,0.486,0.938,0.051,0.443,0.934,0.449],"tota":[0.506,0.121,0.504,0.785,0.133,0.5,0.879,0.504],"vpatti":[0.5,0.0,0.494,0.996,0.043,0.367,0.957,0.359]};
  function fallbackGeo(S, src) {
    const nm = String(src || '').split('/').pop().replace(/\.[a-z]+$/i, '');
    const g = KNOWN[nm] || (/^tk|tukkal/i.test(nm) ? [0.5, 0.06, 0.5, 0.97, 0.04, 0.44, 0.96, 0.44] : [0.5, 0.05, 0.5, 0.96, 0.01, 0.53, 0.99, 0.53]);
    const P = i => [g[i] * S, g[i + 1] * S];
    return geoFrom(P(0), P(2), P(4), P(6));
  }

  /* ---------------- flag kites ----------------
   * A whole sail pasted in a country's flag colours, the way flag patangs are sold for Independence Day and
   * cricket matches. Each flag is laid out on THIS kite's own geometry: bands follow the spine and bow, emblems sit
   * where the eye lands (just above the bow joint), and the outer bands run off the edges so the cut outline is
   * always fully covered. */
  const star = (g, cx, cy, r, rot = -Math.PI / 2, n = 5, inner = 0.4) => {
    g.beginPath();
    for (let i = 0; i < n * 2; i++) { const rr = i % 2 ? r * inner : r, a = rot + i * Math.PI / n; g.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); }
    g.closePath(); g.fill();
  };
  const crescent = (g, cx, cy, r, fg, bg, dx = 0.28, dy = -0.12) => {   // a disc with an offset disc cut out of it
    g.fillStyle = fg; g.beginPath(); g.arc(cx, cy, r, 0, 7); g.fill();
    g.fillStyle = bg; g.beginPath(); g.arc(cx + r * dx, cy + r * dy, r * 0.82, 0, 7); g.fill();
  };
  // hz(n, cols): n horizontal bands from nose to tail; vt(cols): vertical bands from left wing to right wing
  const FLAGS = {
    pk: { name: 'Pakistan', draw(g, f) {
      g.fillStyle = '#01411c'; g.fillRect(0, 0, f.S, f.S);
      g.fillStyle = '#ffffff'; g.fillRect(0, 0, f.x0 + f.w * 0.26, f.S);   // the white band at the hoist
      const cx = f.x0 + f.w * 0.6, cy = f.cy, r = f.w * 0.2;
      crescent(g, cx, cy, r, '#ffffff', '#01411c', 0.3, -0.22);
      g.fillStyle = '#ffffff'; star(g, cx + r * 0.62, cy - r * 0.5, r * 0.34, -Math.PI / 2 - 0.5);
    } },
    in: { name: 'India', draw(g, f) {
      bands(g, f, ['#ff9933', '#ffffff', '#138808'], 'h');
      const r = Math.min(f.w, f.h) * 0.11; g.strokeStyle = '#000080'; g.lineWidth = Math.max(1.5, r * 0.14);
      g.beginPath(); g.arc(f.cx, f.mid, r, 0, 7); g.stroke();
      g.lineWidth = Math.max(0.8, r * 0.05); for (let i = 0; i < 24; i++) { const a = i * Math.PI / 12; g.beginPath(); g.moveTo(f.cx, f.mid); g.lineTo(f.cx + Math.cos(a) * r, f.mid + Math.sin(a) * r); g.stroke(); }
      g.fillStyle = '#000080'; g.beginPath(); g.arc(f.cx, f.mid, r * 0.18, 0, 7); g.fill();
    } },
    bd: { name: 'Bangladesh', draw(g, f) { g.fillStyle = '#006a4e'; g.fillRect(0, 0, f.S, f.S); g.fillStyle = '#f42a41'; g.beginPath(); g.arc(f.cx - f.w * 0.05, f.cy, f.w * 0.2, 0, 7); g.fill(); } },
    af: { name: 'Afghanistan', draw(g, f) { bands(g, f, ['#000000', '#d32011', '#007a36'], 'v'); } },
    tr: { name: 'Türkiye', draw(g, f) {
      g.fillStyle = '#e30a17'; g.fillRect(0, 0, f.S, f.S);
      const r = f.w * 0.19; crescent(g, f.cx - r * 0.25, f.cy, r, '#ffffff', '#e30a17', 0.26, 0);
      g.fillStyle = '#ffffff'; star(g, f.cx + r * 0.75, f.cy, r * 0.32, Math.PI);
    } },
    ae: { name: 'UAE', draw(g, f) { bands(g, f, ['#00732f', '#ffffff', '#000000'], 'h'); g.fillStyle = '#ff0000'; g.fillRect(0, 0, f.x0 + f.w * 0.28, f.S); } },
    cn: { name: 'China', draw(g, f) {
      g.fillStyle = '#de2910'; g.fillRect(0, 0, f.S, f.S); g.fillStyle = '#ffde00';
      const cx = f.cx - f.w * 0.12, cy = f.cy - f.h * 0.04, r = f.w * 0.11; star(g, cx, cy, r);
      [[1.9, -1.2], [2.4, -0.4], [2.4, 0.5], [1.9, 1.2]].forEach(([dx, dy]) => star(g, cx + dx * r, cy + dy * r, r * 0.34, Math.atan2(-dy, -dx)));
    } },
    jp: { name: 'Japan', draw(g, f) { g.fillStyle = '#ffffff'; g.fillRect(0, 0, f.S, f.S); g.fillStyle = '#bc002d'; g.beginPath(); g.arc(f.cx, f.cy, f.w * 0.19, 0, 7); g.fill(); } },
    id: { name: 'Indonesia', draw(g, f) { bands(g, f, ['#ce1126', '#ffffff'], 'h'); } },
    gb: { name: 'United Kingdom', draw(g, f) {
      g.fillStyle = '#012169'; g.fillRect(0, 0, f.S, f.S);
      const X = (col, w) => { g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.moveTo(f.x0, f.y0); g.lineTo(f.x1, f.y1); g.moveTo(f.x1, f.y0); g.lineTo(f.x0, f.y1); g.stroke(); };
      const P = (col, w) => { g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.moveTo(f.cx, 0); g.lineTo(f.cx, f.S); g.moveTo(0, f.cy); g.lineTo(f.S, f.cy); g.stroke(); };
      X('#ffffff', f.w * 0.12); X('#c8102e', f.w * 0.045); P('#ffffff', f.w * 0.16); P('#c8102e', f.w * 0.095);
    } },
    us: { name: 'USA', draw(g, f) {
      bands(g, f, Array.from({ length: 13 }, (_, i) => i % 2 ? '#ffffff' : '#b22234'), 'h');
      g.fillStyle = '#3c3b6e'; g.fillRect(-f.S, -f.S, f.cx + f.S, f.cy + f.S);   // the canton fills the top-left wing
      g.fillStyle = '#ffffff';
      for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) star(g, f.x0 + (f.cx - f.x0) * (c + 0.7 + (r % 2) * 0.4) / 5, f.y0 + (f.cy - f.y0) * (r + 0.7) / 4.6, f.w * 0.02);
    } },
    de: { name: 'Germany', draw(g, f) { bands(g, f, ['#000000', '#dd0000', '#ffce00'], 'h'); } },
    fr: { name: 'France', draw(g, f) { bands(g, f, ['#0055a4', '#ffffff', '#ef4135'], 'v'); } },
    it: { name: 'Italy', draw(g, f) { bands(g, f, ['#009246', '#ffffff', '#ce2b37'], 'v'); } },
    br: { name: 'Brazil', draw(g, f) {
      g.fillStyle = '#009c3b'; g.fillRect(0, 0, f.S, f.S);
      g.fillStyle = '#ffdf00'; g.beginPath(); g.moveTo(f.cx, f.y0 + f.h * 0.14); g.lineTo(f.x1 - f.w * 0.1, f.cy); g.lineTo(f.cx, f.y1 - f.h * 0.14); g.lineTo(f.x0 + f.w * 0.1, f.cy); g.closePath(); g.fill();
      g.fillStyle = '#002776'; g.beginPath(); g.arc(f.cx, f.cy, f.w * 0.17, 0, 7); g.fill();
      g.strokeStyle = '#ffffff'; g.lineWidth = Math.max(1.5, f.w * 0.025); g.beginPath(); g.arc(f.cx + f.w * 0.05, f.cy + f.w * 0.3, f.w * 0.34, Math.PI * 1.28, Math.PI * 1.72); g.stroke();
    } },
    ar: { name: 'Argentina', draw(g, f) { bands(g, f, ['#74acdf', '#ffffff', '#74acdf'], 'h'); g.fillStyle = '#f6b40e'; g.beginPath(); g.arc(f.cx, f.mid, f.w * 0.07, 0, 7); g.fill(); } },
    ca: { name: 'Canada', draw(g, f) {
      bands(g, f, ['#d80621', '#ffffff', '#ffffff', '#d80621'], 'v');
      g.fillStyle = '#d80621'; star(g, f.cx, f.cy, f.w * 0.15, -Math.PI / 2, 7, 0.55);   // a simple leaf
      g.fillRect(f.cx - f.w * 0.012, f.cy, f.w * 0.024, f.w * 0.17);
    } },
    za: { name: 'South Africa', draw(g, f) {
      bands(g, f, ['#e03c31', '#ffffff', '#001489'], 'h');
      g.fillStyle = '#007749'; g.beginPath(); g.moveTo(-f.S, f.mid - f.h * 0.12); g.lineTo(f.cx - f.w * 0.05, f.mid - f.h * 0.12); g.lineTo(f.cx + f.w * 0.1, f.mid); g.lineTo(f.cx - f.w * 0.05, f.mid + f.h * 0.12); g.lineTo(-f.S, f.mid + f.h * 0.12); g.fill();
      g.fillStyle = '#000000'; g.beginPath(); g.moveTo(f.x0 - 2, f.mid - f.h * 0.2); g.lineTo(f.x0 + f.w * 0.22, f.mid); g.lineTo(f.x0 - 2, f.mid + f.h * 0.2); g.fill();
    } },
    lk: { name: 'Sri Lanka', draw(g, f) {
      g.fillStyle = '#ffbe29'; g.fillRect(0, 0, f.S, f.S);
      g.fillStyle = '#00534e'; g.fillRect(f.x0 + f.w * 0.05, -f.S, f.w * 0.13, f.S * 3);
      g.fillStyle = '#eb7400'; g.fillRect(f.x0 + f.w * 0.18, -f.S, f.w * 0.13, f.S * 3);
      g.fillStyle = '#8d153a'; g.fillRect(f.x0 + f.w * 0.36, -f.S, f.S * 2, f.S * 3);
    } },
    nz: { name: 'New Zealand', draw(g, f) {
      g.fillStyle = '#012169'; g.fillRect(0, 0, f.S, f.S);
      g.fillStyle = '#ffffff'; [[0.62, 0.32], [0.74, 0.52], [0.6, 0.72], [0.5, 0.5]].forEach(([x, y]) => star(g, f.x0 + f.w * x, f.y0 + f.h * y, f.w * 0.055));
      g.fillStyle = '#c8102e'; [[0.62, 0.32], [0.74, 0.52], [0.6, 0.72], [0.5, 0.5]].forEach(([x, y]) => star(g, f.x0 + f.w * x, f.y0 + f.h * y, f.w * 0.035));
    } }
  };
  // bands that cover the whole kite: the first and last run off the edges
  function bands(g, f, cols, dir) {
    const n = cols.length;
    cols.forEach((c, i) => {
      g.fillStyle = c;
      if (dir === 'h') { const a = i ? f.y0 + (f.y1 - f.y0) * i / n : -f.S, b = i === n - 1 ? f.S * 2 : f.y0 + (f.y1 - f.y0) * (i + 1) / n; g.fillRect(-f.S, a, f.S * 3, b - a); }
      else { const a = i ? f.x0 + (f.x1 - f.x0) * i / n : -f.S, b = i === n - 1 ? f.S * 2 : f.x0 + (f.x1 - f.x0) * (i + 1) / n; g.fillRect(a, -f.S, b - a, f.S * 3); }
    });
  }
  function drawFlag(g, id, geo, S) {
    const F = FLAGS[id]; if (!F) return false;
    const { N, B, L, R, C } = geo;
    const f = { S, x0: L[0], x1: R[0], y0: N[1], y1: B[1], w: R[0] - L[0], h: B[1] - N[1], cx: C[0], cy: C[1] - (C[1] - N[1]) * 0.08 };
    f.mid = (f.y0 + f.y1) / 2;
    g.save(); F.draw(g, f); g.restore();
    return true;
  }

  /* ---------------- paper pieces ---------------- */
  function drawPaper(g, o, geo, S) {
    const { N, B, L, R, C, W, H } = geo, top = C[1] - N[1];
    if (o.flag && drawFlag(g, o.flag, geo, S)) return;   // a flag kite is the whole sail
    g.fillStyle = o.c1; g.fillRect(0, 0, S, S);
    // the split: panels along the real spine (N-B) and bow (L-R)
    g.fillStyle = o.c2;
    if (o.split === 'adha') g.fillRect(C[0], 0, S, S);
    else if (o.split === 'aar') g.fillRect(0, C[1], S, S);
    else if (o.split === 'char') { g.fillRect(C[0], 0, S, C[1]); g.fillRect(0, C[1], C[0], S); }
    else if (o.split === 'kaat') { const a = [(N[0] + L[0]) / 2, (N[1] + L[1]) / 2], b = [(R[0] + B[0]) / 2, (R[1] + B[1]) / 2]; const dx = b[0] - a[0], dy = b[1] - a[1];
      g.beginPath(); g.moveTo(a[0] - dx * 3, a[1] - dy * 3); g.lineTo(b[0] + dx * 3, b[1] + dy * 3); g.lineTo(S * 4, -S * 3); g.closePath(); g.fill(); }
    const on = o.on || {}, pc = { ...PIECE_COL, ...(o.pc || {}) };
    const disc = (x, y, r, c) => { g.fillStyle = c; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); };
    if (on.patti) { g.fillStyle = pc.patti; const w = W * 0.07; g.fillRect(C[0] - w / 2, 0, w, S); }
    if (on.dhaari) { g.strokeStyle = pc.dhaari; g.lineWidth = H * 0.07; g.beginPath(); g.moveTo(L[0] - 10, L[1]); g.lineTo(R[0] + 10, R[1]); g.stroke(); }
    if (on.goley) for (const sx of [-1, 1]) disc(C[0] + sx * W * 0.23, C[1] - top * 0.12, W * 0.15, pc.goley);
    if (on.gola) disc(C[0], C[1] + (B[1] - C[1]) * 0.12, W * 0.16, pc.gola);
    if (on.golSir) disc(N[0], N[1], Math.max(top * 0.62, W * 0.2), pc.golSir);
    if (on.chand) { const cx = C[0], cy = N[1] + top * 0.62, r = W * 0.17; g.strokeStyle = pc.chand; g.lineWidth = W * 0.045; g.lineCap = 'round'; g.beginPath(); g.arc(cx, cy, r, -Math.PI * 0.32, Math.PI * 1.32, false); g.stroke(); }
    if (on.dumchi) { g.fillStyle = pc.dumchi; const h = H * 0.17; g.beginPath(); g.moveTo(B[0], B[1] + 4); g.lineTo(B[0] - W * 0.2, B[1] - h); g.lineTo(B[0] + W * 0.2, B[1] - h); g.closePath(); g.fill(); }
    if (on.tikkay) { g.fillStyle = pc.tikkay; const t = W * 0.085;
      const tri = (p, dx, dy) => { const l = Math.hypot(dx, dy) || 1, ux = dx / l, uy = dy / l; g.beginPath(); g.moveTo(p[0] - uy * t * 0.6, p[1] + ux * t * 0.6); g.lineTo(p[0] + ux * t * 1.4, p[1] + uy * t * 1.4); g.lineTo(p[0] + uy * t * 0.6, p[1] - ux * t * 0.6); g.closePath(); g.fill(); };
      tri(N, C[0] - N[0], C[1] - N[1] + 1); tri(L, C[0] - L[0], C[1] - L[1]); tri(R, C[0] - R[0], C[1] - R[1]); }
  }

  /* ---------------- painting a recipe onto its base picture ---------------- */
  function paint(oIn, img, src, S) {
    const out = canvas(S, S), g = out.getContext('2d'), an = analyse(img, src, S);
    const o = { ...DEF, ...oIn, on: { ...(oIn.on || DEF.on) }, pc: { ...PIECE_COL, ...(oIn.pc || {}) } };
    if (o.mode === 'recolour') {
      if (an) {
        const id = g.createImageData(S, S), d = id.data, b = an.data, px = [0, 0, 0];
        const to = an.regions.map((r, i) => o.regions[i] ? rgb(o.regions[i]) : null);
        for (let i = 0; i < S * S; i++) {
          const a = b[i * 4 + 3]; if (!a) continue; const L = an.label[i], t = L !== 255 && to[L];
          if (t) { shadeTo(px, i * 4, b, an.regions[L].rgb, t, 1); d[i * 4] = px[0]; d[i * 4 + 1] = px[1]; d[i * 4 + 2] = px[2]; }
          else { d[i * 4] = b[i * 4]; d[i * 4 + 1] = b[i * 4 + 1]; d[i * 4 + 2] = b[i * 4 + 2]; }
          d[i * 4 + 3] = a;
        }
        g.putImageData(id, 0, 0);
      } else fit(g, img, S);
    } else {
      const geo = an ? an.geo : fallbackGeo(S, src), Lc = canvas(S, S), lg = Lc.getContext('2d');
      drawPaper(lg, o, geo, S);
      if (an) {
        const P = lg.getImageData(0, 0, S, S).data, id = g.createImageData(S, S), d = id.data, b = an.data, tex = o.flag ? Math.min(o.texture, 0.3) : o.texture, bw = Math.max(3, S * 0.035), er = rgb(o.pc.kinara), keep = o.keepDetails !== false, px = [0, 0, 0];
        for (let i = 0; i < S * S; i++) {
          const a = b[i * 4 + 3]; if (!a) continue;
          let r = P[i * 4], gg = P[i * 4 + 1], bb = P[i * 4 + 2];
          if (o.on.kinara && an.dist[i] <= bw) { r = er[0]; gg = er[1]; bb = er[2]; }
          const Lb = an.label[i];
          if (Lb !== 255 && keep && an.regions[Lb].share < 0.035) { r = b[i * 4]; gg = b[i * 4 + 1]; bb = b[i * 4 + 2]; }   // small appliqué (phundna, kanni, tikkay) stays as made
          else if (Lb !== 255 && tex > 0) { px[0] = r; px[1] = gg; px[2] = bb; shadeTo(px, i * 4, b, an.regions[Lb].rgb, px.slice(), tex); r = px[0]; gg = px[1]; bb = px[2]; }
          d[i * 4] = r; d[i * 4 + 1] = gg; d[i * 4 + 2] = bb; d[i * 4 + 3] = a;
        }
        g.putImageData(id, 0, 0);
      } else {
        g.drawImage(Lc, 0, 0); g.globalCompositeOperation = 'destination-in'; fit(g, img, S); g.globalCompositeOperation = 'source-over';
        g.save(); g.globalAlpha = 0.22; g.globalCompositeOperation = 'multiply'; g.filter = 'grayscale(1) contrast(1.6) brightness(1.4)'; fit(g, img, S); g.restore();
        g.globalCompositeOperation = 'destination-in'; fit(g, img, S); g.globalCompositeOperation = 'source-over';
      }
    }
    if (o.hue || o.sat !== 100 || o.bri !== 100) {
      const f = canvas(S, S), fg = f.getContext('2d'); fg.filter = `hue-rotate(${o.hue}deg) saturate(${o.sat}%) brightness(${o.bri}%)`; fg.drawImage(out, 0, 0);
      g.clearRect(0, 0, S, S); g.drawImage(f, 0, 0);
    }
    return out;
  }
  // older saved kites (repaint recipes from the previous workshop) still paint: they show as a plain sail now
  const upgrade = r => r && r.mode === 'repaint' ? { ...r, mode: 'paper', c1: r.sail || DEF.c1, c2: r.sail2 || r.sail || DEF.c2, split: r.two ? 'aar' : 'saada', on: {}, pc: {} } : r;

  const spriteCache = {};
  function sprite(entry, S = SIZE) {
    const key = entry.id + '@' + S + '@' + JSON.stringify(entry.recipe);
    if (spriteCache[key]) return spriteCache[key];
    const c = canvas(S, S); c.complete = false; c.naturalWidth = 0;
    c.ready = loadImg(entry.base).then(img => {
      if (!img) return c;
      const p = paint(upgrade(entry.recipe || {}), img, entry.base, S); c.getContext('2d').drawImage(p, 0, 0);
      c.complete = true; c.naturalWidth = S; c.naturalHeight = S; return c;
    });
    return (spriteCache[key] = c);
  }
  /* v7: a canvas is painted only when it scrolls into view. The shop and kite lists hold 200+ kites; painting every
   * workshop kite the moment the panel opened froze a phone for about a second ("the menu gets stuck"). */
  let io = null;
  const paintCanvas = (cv, e) => sprite(e).ready.then(s => { const g = cv.getContext('2d'); g.clearRect(0, 0, cv.width, cv.height); g.drawImage(s, 0, 0, cv.width, cv.height); });
  function hydrate(rootEl, byId) {
    if (!io && typeof IntersectionObserver !== 'undefined') io = new IntersectionObserver(list => list.forEach(en => {
      if (!en.isIntersecting) return; const cv = en.target; io.unobserve(cv); const e = cv._kvEntry; cv._kvEntry = null; if (e) paintCanvas(cv, e);
    }), { rootMargin: '160px' });
    rootEl.querySelectorAll('canvas[data-kv]').forEach(cv => {
      const e = byId(cv.dataset.kv); if (!e || !e.recipe) return;
      if (io) { cv._kvEntry = e; io.observe(cv); } else paintCanvas(cv, e);
    });
  }

  /* ---------------- one colour palette, used everywhere in the maker ---------------- */
  let popEl = null;
  function pickColour(anchor, current, onPick) {
    closePop();
    popEl = document.createElement('div'); popEl.className = 'palette-pop';
    popEl.innerHTML = PALETTE.map(c => `<button style="background:${c}" data-col="${c}" class="${c.toLowerCase() === String(current).toLowerCase() ? 'on' : ''}" aria-label="${c}"></button>`).join('') +
      `<label class="more" title="Any colour"><input type="color" value="${current || '#ffffff'}">&#43;</label>`;
    document.body.appendChild(popEl);
    const r = anchor.getBoundingClientRect(), pw = popEl.offsetWidth, ph = popEl.offsetHeight;
    popEl.style.left = Math.max(8, Math.min(innerWidth - pw - 8, r.left + r.width / 2 - pw / 2)) + 'px';
    popEl.style.top = (r.bottom + ph + 8 < innerHeight ? r.bottom + 6 : Math.max(8, r.top - ph - 6)) + 'px';
    popEl.querySelectorAll('[data-col]').forEach(b => b.onclick = e => { e.stopPropagation(); onPick(b.dataset.col); closePop(); });
    const inp = popEl.querySelector('input'); inp.oninput = () => onPick(inp.value); inp.onchange = () => closePop();
    setTimeout(() => addEventListener('pointerdown', outside, true), 0);
  }
  function outside(e) { if (popEl && !popEl.contains(e.target)) closePop(); }
  function closePop() { if (popEl) { popEl.remove(); popEl = null; } removeEventListener('pointerdown', outside, true); }

  /* ---------------- the maker panel (#maker) ---------------- */
  const TYPES = [['all', 'All'], ['patang', 'Patang'], ['tukkal', 'Tukkal'], ['pipa', 'Pipa'], ['bird', 'Bird / Bat'], ['delta', 'Raia / Wau'], ['eddy', 'Box'], ['rokkaku', 'Star']];
  const esc = s => String(s).replace(/[<>&"]/g, '');
  function open(saved, onSave, onDelete, catalog, editEntry) {
    const el = document.querySelector('#maker'); if (!el) return;
    const bases = (catalog || []).filter(e => e.src && !e.recipe && !/^data:/.test(e.src));
    if (!bases.length) { alert('No kite pictures were found in assets/kites.'); return; }
    const fresh = () => JSON.parse(JSON.stringify(DEF));
    let st = { ...fresh(), baseId: (bases.find(b => b.id === saved.k1) || bases[0]).id };
    if (saved.makerLast2 && bases.some(b => b.id === saved.makerLast2.baseId)) st = { ...fresh(), ...saved.makerLast2 };
    if (editEntry && editEntry.recipe) st = { ...fresh(), ...upgrade(editEntry.recipe), baseId: editEntry.baseId };
    else if (editEntry && editEntry.baseId && bases.some(b => b.id === editEntry.baseId)) st = { ...fresh(), baseId: editEntry.baseId, mode: 'recolour' };
    st.on = { ...st.on }; st.pc = { ...PIECE_COL, ...st.pc }; st.regions = { ...st.regions };
    const editing = editEntry && editEntry.recipe && editEntry.mine ? editEntry.id : null;
    let tab = editEntry && !editEntry.recipe ? 'colours' : (st.mode === 'recolour' ? 'colours' : 'paper'), type = 'all', name = editEntry && editEntry.recipe ? editEntry.name : '', token = 0;
    const base = () => bases.find(b => b.id === st.baseId) || bases[0];
    const recipe = (over = {}) => { const { baseId, ...r } = { ...st, ...over }; return JSON.parse(JSON.stringify(r)); };
    const draw = (cv, over, S) => { const b = base(); return loadImg(b.src).then(img => { if (!img) return; const p = paint(recipe(over), img, b.src, S); const g = cv.getContext('2d'); g.clearRect(0, 0, cv.width, cv.height); g.drawImage(p, 0, 0, cv.width, cv.height); }); };
    function preview() { const my = ++token, cv = el.querySelector('#mkPrev'); if (!cv) return; const b = base(); loadImg(b.src).then(img => { if (my !== token || !img) return; const p = paint(recipe(), img, b.src, SIZE), g = cv.getContext('2d'); g.clearRect(0, 0, SIZE, SIZE); g.drawImage(p, 0, 0); }); }
    const dot = (key, colour, label) => `<button class="cdot" data-pick="${key}" style="--c:${colour}" title="${label || 'Colour'}"><i></i>${label ? `<span>${label}</span>` : ''}</button>`;

    function render() {
      const b = base();
      el.querySelector('.mk-body').innerHTML = `
        <div class="mk-prev kite"><div class="sky"><canvas id="mkPrev" width="${SIZE}" height="${SIZE}"></canvas></div>
          <input id="mkName" maxlength="20" placeholder="Name your kite" value="${esc(name)}">
          <div class="prev-row"><button class="ghost sm" id="mkSurprise">&#127922; Surprise me</button><button class="ghost sm" id="mkReset">Start over</button></div>
          <p class="mk-base">Kite: <b>${esc(b.name)}</b></p></div>
        <div class="mk-opts">
          <div class="seg mk-tabs" id="mkTabs">${[['kite', '1 · Kite'], ['colours', '2 · Colours'], ['paper', '3 · Paper design']].map(([id, l]) => `<button data-tab="${id}" class="${tab === id ? 'on' : ''}">${l}</button>`).join('')}</div>
          <div id="mkPane"></div>
          <details class="adv"><summary>More options</summary>
            <div class="sliders"><label>Hue <input type="range" min="-180" max="180" value="${st.hue}" data-r="hue"></label>
              <label>Colour <input type="range" min="0" max="200" value="${st.sat}" data-r="sat"></label>
              <label>Brightness <input type="range" min="50" max="150" value="${st.bri}" data-r="bri"></label>
              <label>Paper texture <input type="range" min="0" max="100" value="${Math.round(st.texture * 100)}" data-r="texture"></label></div>
            <label class="check"><input type="checkbox" id="mkKeep" ${st.keepDetails !== false ? 'checked' : ''}> Keep the kite's small patches (phundna, tikkay) as made</label>
          </details>
        </div>`;
      el.querySelector('#mkName').oninput = e => { name = e.target.value; };
      el.querySelectorAll('[data-tab]').forEach(bt => bt.onclick = () => { tab = bt.dataset.tab; if (tab === 'colours') st.mode = 'recolour'; if (tab === 'paper') st.mode = 'paper'; render(); });
      el.querySelectorAll('[data-r]').forEach(r => r.oninput = () => { st[r.dataset.r] = r.dataset.r === 'texture' ? r.value / 100 : +r.value; preview(); });
      el.querySelector('#mkKeep').onchange = e => { st.keepDetails = e.target.checked; preview(); };
      el.querySelector('#mkSurprise').onclick = surprise;
      el.querySelector('#mkReset').onclick = () => { const id = st.baseId, m = st.mode; st = { ...fresh(), baseId: id, mode: m }; render(); };
      pane(); preview();
    }
    function pane() {
      const p = el.querySelector('#mkPane'), b = base();
      if (tab === 'kite') {
        const list = bases.filter(e => type === 'all' || e.arche === type);
        p.innerHTML = `<p class="hint">Pick the kite to start from. Its shape stays exactly as it is.</p>
          <div class="chips">${TYPES.filter(([id]) => id === 'all' || bases.some(e => e.arche === id)).map(([id, l]) => `<button data-type="${id}" class="${type === id ? 'on' : ''}">${l}</button>`).join('')}</div>
          <div class="tiles base-tiles">${list.map(e => `<button class="tile ${e.id === st.baseId ? 'on' : ''}" data-base="${e.id}" title="${esc(e.name)}"><img src="${e.src}" loading="lazy" alt=""><span>${esc(e.name)}</span></button>`).join('')}</div>
          <div class="pane-ft"><button class="cta sm" data-next="colours">Next: colours &rarr;</button></div>`;
        p.querySelectorAll('[data-type]').forEach(bt => bt.onclick = () => { type = bt.dataset.type; pane(); });
        p.querySelectorAll('[data-base]').forEach(bt => bt.onclick = () => { st.baseId = bt.dataset.base; st.regions = {}; p.querySelectorAll('[data-base]').forEach(x => x.classList.toggle('on', x === bt)); el.querySelector('.mk-base b').textContent = base().name; preview(); });
      } else if (tab === 'colours') {
        st.mode = 'recolour';
        p.innerHTML = '<p class="hint">Reading the kite&rsquo;s colours&hellip;</p>';
        loadImg(b.src).then(img => {
          const an = img && analyse(img, b.src, SIZE);
          if (!an) { p.innerHTML = `<p class="note">This browser won&rsquo;t let the game read a picture&rsquo;s colours when the game is opened straight from a file. Use <b>3 · Paper design</b> instead, or run the game from a local server.</p>`; return; }
          p.innerHTML = `<p class="hint">These are the colours of this kite. Tap one and choose a new colour &mdash; folds and sticks stay.</p>
            <div class="regions2">${an.regions.map((r, i) => `<div class="reg"><button class="cdot big" data-reg="${i}" style="--c:${st.regions[i] || r.hex}"><i></i></button><span>${i === 0 ? 'Sail' : 'Colour ' + (i + 1)}<small>${Math.round(r.share * 100)}%</small></span>${st.regions[i] ? `<button class="undo" data-unreg="${i}" title="Original colour">&#8634;</button>` : ''}</div>`).join('')}</div>
            <div class="pane-ft"><button class="ghost sm" id="mkOrig">Original colours</button><button class="cta sm" data-next="paper">Or paint a new design &rarr;</button></div>`;
          p.querySelectorAll('[data-reg]').forEach(bt => bt.onclick = () => pickColour(bt, st.regions[bt.dataset.reg] || an.regions[bt.dataset.reg].hex, c => { st.regions[bt.dataset.reg] = c; bt.style.setProperty('--c', c); preview(); if (!bt.parentNode.querySelector('.undo')) pane(); }));
          p.querySelectorAll('[data-unreg]').forEach(bt => bt.onclick = () => { delete st.regions[bt.dataset.unreg]; pane(); preview(); });
          p.querySelector('#mkOrig').onclick = () => { st.regions = {}; pane(); preview(); };
          p.querySelectorAll('[data-next]').forEach(bt => bt.onclick = () => { tab = bt.dataset.next; st.mode = 'paper'; render(); });
        });
        preview(); return;
      } else {
        st.mode = 'paper';
        p.innerHTML = `
          <div class="step"><h4>Country flag <small>the whole sail in a flag</small></h4><div class="tiles flag-tiles"><button class="tile ${!st.flag ? 'on' : ''}" data-flag=""><span class="noflag">&#10005;</span><span>No flag</span></button>${Object.entries(FLAGS).map(([id, fl]) => `<button class="tile ${st.flag === id ? 'on' : ''}" data-flag="${id}"><canvas data-fv="${id}" width="72" height="72"></canvas><span>${fl.name}</span></button>`).join('')}</div></div>
          <div class="step${st.flag ? ' dim' : ''}"><h4>Start from a style</h4><div class="tiles style-tiles">${STYLES.map(s => `<button class="tile" data-style="${s.id}"><canvas data-sv="${s.id}" width="80" height="80"></canvas><span>${s.name}</span></button>`).join('')}</div></div>
          <div class="step${st.flag ? ' dim' : ''}"><h4>Paper</h4><div class="split-row">${dot('c1', st.c1, 'Sail')}${st.split !== 'saada' ? dot('c2', st.c2, 'Second') : ''}</div>
            <div class="tiles split-tiles">${Object.entries(SPLITS).map(([id, l]) => `<button class="tile ${st.split === id ? 'on' : ''}" data-split="${id}"><canvas data-spv="${id}" width="64" height="64"></canvas><span>${l}</span></button>`).join('')}</div></div>
          <div class="step"><h4>Pasted pieces <small>tap to add, tap the dot for its colour</small></h4>
            <div class="pieces">${Object.entries(PIECES).map(([id, l]) => `<div class="piece ${st.on[id] ? 'on' : ''}"><button class="ptog" data-piece="${id}">${l}</button>${st.on[id] ? dot('pc.' + id, st.pc[id]) : ''}</div>`).join('')}</div></div>`;
        p.querySelectorAll('[data-flag]').forEach(bt => bt.onclick = () => { st.flag = bt.dataset.flag || ''; if (st.flag) { st.on = {}; if (!name || FLAGS[Object.keys(FLAGS).find(k => FLAGS[k].name + ' patang' === name)]) name = FLAGS[st.flag].name + ' patang'; const n = el.querySelector('#mkName'); if (n) n.value = name; } pane(); preview(); });
        Object.keys(FLAGS).forEach(id => { const cv = p.querySelector(`[data-fv="${id}"]`); if (cv) draw(cv, { mode: 'paper', flag: id, on: {}, keepDetails: false, hue: 0, sat: 100, bri: 100 }, 96); });
        p.querySelectorAll('[data-style]').forEach(bt => bt.onclick = () => { st.flag = ''; const s = STYLES.find(x => x.id === bt.dataset.style); st.c1 = s.c1; st.c2 = s.c2 || s.c1; st.split = s.split; st.on = { ...s.on }; st.pc = { ...PIECE_COL, ...s.pc }; pane(); preview(); });
        p.querySelectorAll('[data-split]').forEach(bt => bt.onclick = () => { st.flag = ''; st.split = bt.dataset.split; pane(); preview(); });
        p.querySelectorAll('[data-piece]').forEach(bt => bt.onclick = () => { st.flag = ''; const id = bt.dataset.piece; st.on[id] = !st.on[id]; pane(); preview(); });
        STYLES.forEach(s => { const cv = p.querySelector(`[data-sv="${s.id}"]`); if (cv) draw(cv, { mode: 'paper', c1: s.c1, c2: s.c2 || s.c1, split: s.split, on: s.on, pc: { ...PIECE_COL, ...s.pc }, hue: 0, sat: 100, bri: 100 }, 96); });
        Object.keys(SPLITS).forEach(id => { const cv = p.querySelector(`[data-spv="${id}"]`); if (cv) draw(cv, { mode: 'paper', split: id, on: {}, hue: 0, sat: 100, bri: 100 }, 80); });
      }
      p.querySelectorAll('[data-pick]').forEach(bt => bt.onclick = () => {
        const k = bt.dataset.pick, cur = k.startsWith('pc.') ? st.pc[k.slice(3)] : st[k];
        pickColour(bt, cur, c => { if (k.startsWith('pc.')) st.pc[k.slice(3)] = c; else st[k] = c; bt.style.setProperty('--c', c); preview(); });
      });
      p.querySelectorAll('[data-next]').forEach(bt => bt.onclick = () => { tab = bt.dataset.next; render(); });
    }
    function surprise() {
      const pick = a => a[Math.floor(Math.random() * a.length)], bright = PALETTE.filter(c => c !== '#6b6b6b');
      if (tab === 'colours') { const an = loadedAn(); if (an) { st.regions = {}; an.regions.forEach((r, i) => { st.regions[i] = pick(bright); }); } }
      else if (Math.random() < 0.3) { st.mode = 'paper'; tab = 'paper'; st.flag = pick(Object.keys(FLAGS)); st.on = {}; }
      else { const s = pick(STYLES); st.mode = 'paper'; tab = 'paper'; st.flag = ''; st.c1 = pick(bright); st.c2 = pick(bright); st.split = pick(Object.keys(SPLITS)); st.on = { ...s.on }; st.pc = { ...PIECE_COL }; for (const k in st.on) st.pc[k] = pick(bright); }
      render();
    }
    const loadedAn = () => { const b = base(); return anCache[b.src + '@' + SIZE] || null; };
    el.querySelector('#mkSave').onclick = () => {
      closePop();
      const b = base(), nm = (name || '').trim() || 'My ' + b.name;
      saved.makerLast2 = { ...recipe(), baseId: b.id };
      onSave({ id: 'my:' + Date.now().toString(36), name: nm, mine: true, arche: b.arche, scale: b.scale || 1, base: b.src, baseId: b.id, recipe: recipe() });
      if (editing) onDelete(editing);
      el.classList.add('hidden');
    };
    el.querySelector('#mkClose').onclick = () => { closePop(); el.classList.add('hidden'); };
    render(); el.classList.remove('hidden');
  }

  // kept for older code paths: a plain drawn diamond (only used when there are no kite pictures at all)
  const dataUrl = o => 'data:image/svg+xml;utf8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><polygon points="100,10 176,92 100,188 24,92" fill="${o.top || o.sail || '#e63946'}" stroke="#222" stroke-width="2"/></svg>`);
  root.KiteMaker = { FLAGS, open, sprite, hydrate, paint, analyse, loadImg, dataUrl, PALETTE, PIECES, SPLITS, STYLES, PRESETS: [], SHAPES: { patang: { arche: 'patang', label: 'Patang' } } };
})(typeof self !== 'undefined' ? self : this);
