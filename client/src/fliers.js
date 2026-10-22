/* Drawn fliers: original characters made in code (no image files, no licensing questions).
 * Shalwar kameez, optional waistcoat, headwear, real faces (eyes that follow the kite, brows, nose, mouth that
 * changes with effort, blinking), and a body that actually flies a kite:
 *   idle  - lead hand up the line toward the kite, the other hand at the chest, a little sway
 *   pull  - khainch: hand-over-hand, each hand reaching up the line and hauling it down to the hip, leaning back
 *   send  - dheel: both arms out toward the kite, line slipping through the fingers, leaning in
 *   tug   - tunka: a sharp jerk of both hands back and up that springs back
 * Seen from behind, the side or the front depending on where the camera is relative to where the flier faces.
 * Includes the "make your own flier" panel. */
(function (root) {
  'use strict';
  const SKINS = ['#f3cfb3', '#e5b48c', '#c98d5e', '#a06a43', '#7a4a2a'];
  const HEADWEAR = { none: 'Hair', topi: 'Topi', cap: 'Cap', pagri: 'Pagri', dupatta: 'Dupatta', patka: 'Patka', jinnah: 'Karakuli' };
  const BUILDS = { slim: 'Slim', regular: 'Regular', broad: 'Broad' };
  const HAIRSTYLES = { short: 'Short', side: 'Side part', long: 'Long', curly: 'Curly' };
  const AGES = { kid: 'Kid', adult: 'Adult', elder: 'Elder' };
  const GLASSES = { none: 'None', specs: 'Specs', shades: 'Shades' };
  const KPATTERNS = { plain: 'Plain', stripes: 'Stripes', checks: 'Checks', kadhai: 'Kadhai (embroidery)' };
  const EXPRS = { smile: 'Smile', grin: 'Big grin', serious: 'Serious' };
  // what they wear: the traditional shalwar kameez, or everyday western clothes over jeans
  const OUTFITS = { shalwar: 'Shalwar kameez', tshirt: 'T-shirt & jeans', shirt: 'Shirt & jeans', hoodie: 'Hoodie & jeans', jacket: 'Jacket & jeans', coat: 'Long coat' };
  const LAYER = { hoodie: 'Hoodie', jacket: 'Jacket', coat: 'Coat' };   // outfits with an outer layer (its colour is o.coat)
  const COAT_DEF = { hoodie: '#5b6b7a', jacket: '#3d5a80', coat: '#6b4f3a' };
  const BASE = { skin: 1, kameez: '#f4f1e8', shalwar: '#f4f1e8', head: 'none', headColor: '#ffffff', hair: '#1b1410', hairStyle: 'short', beard: false, mustache: false, vest: '', eyes: '#3b2416', shoes: '#6b4226', build: 'regular',
    age: 'adult', glasses: 'none', kpattern: 'plain', trim: '#c9a227', shawl: '', expr: 'smile', outfit: 'shalwar', coat: '', print: false };
  const PRESETS = [
    { id: 'ali', name: 'Ali', skin: 1, kameez: '#f4f1e8', shalwar: '#f4f1e8', head: 'topi', headColor: '#ffffff', hair: '#1b1410', vest: '#2f4f4f' },
    { id: 'bilal', name: 'Bilal', skin: 2, kameez: '#6cb4ee', shalwar: '#6cb4ee', head: 'cap', headColor: '#d62828', hair: '#1b1410', hairStyle: 'side' },
    { id: 'ustad', name: 'Ustad Ji', skin: 2, kameez: '#e9dcc0', shalwar: '#e9dcc0', head: 'pagri', headColor: '#fafafa', hair: '#d8d2c8', beard: true, mustache: true, build: 'broad', vest: '#5a3a22' },
    { id: 'zara', name: 'Zara', skin: 0, kameez: '#ef6fa0', shalwar: '#fbe7ef', head: 'dupatta', headColor: '#ffd23f', hair: '#2a1a12', hairStyle: 'long', build: 'slim', shoes: '#c2185b' },
    { id: 'hamza', name: 'Hamza', skin: 3, kameez: '#2e8b57', shalwar: '#202020', head: 'none', hair: '#1b1410', hairStyle: 'curly', mustache: true },
    { id: 'raju', name: 'Raju', skin: 2, kameez: '#f28c28', shalwar: '#ffffff', head: 'patka', headColor: '#f28c28', hair: '#1b1410', beard: true, mustache: true },
    { id: 'saad', name: 'Saad', skin: 1, kameez: '#7b1e3a', shalwar: '#2b4c7e', head: 'cap', headColor: '#151515', hair: '#1b1410', hairStyle: 'side', build: 'slim' },
    { id: 'amna', name: 'Amna', skin: 1, kameez: '#7b4bb3', shalwar: '#f0e6fa', head: 'dupatta', headColor: '#ff9ec7', hair: '#2a1a12', hairStyle: 'long', build: 'slim', shoes: '#7b4bb3' },
    { id: 'nawab', name: 'Nawab', skin: 1, kameez: '#fdfaf2', shalwar: '#fdfaf2', head: 'jinnah', headColor: '#4a4a4a', hair: '#1b1410', mustache: true, vest: '#1f2a44', build: 'broad' },
    // everyday western clothes
    { id: 'danish', name: 'Danish', skin: 2, outfit: 'tshirt', kameez: '#e63946', shalwar: '#3b5b8c', print: true, head: 'cap', headColor: '#1d3557', hair: '#1b1410', hairStyle: 'short', shoes: '#f4f4f4' },
    { id: 'sana', name: 'Sana', skin: 1, outfit: 'hoodie', kameez: '#ffffff', shalwar: '#2b3a55', coat: '#9b5de5', hair: '#2a1a12', hairStyle: 'long', build: 'slim', shoes: '#f4f4f4' },
    { id: 'omer', name: 'Omer', skin: 1, outfit: 'coat', kameez: '#d9e2ec', shalwar: '#2a2f3a', coat: '#5a4636', hair: '#1b1410', hairStyle: 'side', glasses: 'specs', beard: true, shoes: '#3a2a20' },
    { id: 'fahad', name: 'Fahad', skin: 3, outfit: 'jacket', kameez: '#f2f2f2', shalwar: '#22304a', coat: '#2b2b2b', hair: '#1b1410', hairStyle: 'curly', glasses: 'shades', shoes: '#1b1b1b' },
    { id: 'ayesha', name: 'Ayesha', skin: 0, outfit: 'shirt', kameez: '#7fb3d5', shalwar: '#33415c', head: 'dupatta', headColor: '#f6bd60', hair: '#2a1a12', hairStyle: 'long', build: 'slim', shoes: '#c2185b' },
    { id: 'kamran', name: 'Kamran', skin: 2, outfit: 'tshirt', kameez: '#2a9d8f', shalwar: '#4a6fa5', hair: '#1b1410', hairStyle: 'side', mustache: true, build: 'broad', shoes: '#6b4226' }
  ].map(p => ({ ...BASE, ...p }));
  const shade = (hex, f) => { const n = parseInt(String(hex).slice(1), 16) || 0, c = [n >> 16, (n >> 8) & 255, n & 255].map(v => Math.round(Math.max(0, Math.min(255, v * f)))); return '#' + c.map(v => v.toString(16).padStart(2, '0')).join(''); };
  const lum = hx => { const n = parseInt(String(hx).slice(1), 16) || 0; return ((n >> 16) * 0.3 + ((n >> 8) & 255) * 0.59 + (n & 255) * 0.11) / 255; };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const mixGrey = hx => { const n = parseInt(String(hx).slice(1), 16) || 0; return '#' + [n >> 16, (n >> 8) & 255, n & 255].map(v => Math.round(v * 0.25 + 200 * 0.75).toString(16).padStart(2, '0')).join(''); };

  // two-bone arm: elbow from shoulder + hand, bending downward/outward like a real elbow
  function ik(sh, hd, L1, L2, out) {
    let dx = hd[0] - sh[0], dy = hd[1] - sh[1], d = Math.hypot(dx, dy) || 1e-6;
    const dm = Math.min(d, (L1 + L2) * 0.999); if (dm < d) { hd = [sh[0] + dx / d * dm, sh[1] + dy / d * dm]; dx = hd[0] - sh[0]; dy = hd[1] - sh[1]; d = dm; }
    const a = (L1 * L1 - L2 * L2 + d * d) / (2 * d), hgt = Math.sqrt(Math.max(0, L1 * L1 - a * a));
    const ux = dx / d, uy = dy / d; let px = -uy, py = ux;                 // perpendicular
    if (py < 0 || (Math.abs(py) < 0.2 && px * out < 0)) { px = -px; py = -py; }   // elbow below the line / outward
    return { e: [sh[0] + ux * a + px * hgt, sh[1] + uy * a + py * hgt], h: hd };
  }

  /**
   * ctx: 2D context. x,y: feet position on screen. h: height in px. o: look. pose: {face (radians, 0 = seen from
   * behind, PI = from the front), aim: [dx,dy] screen direction to the kite, t: time, mode: idle|pull|send|tug,
   * tug: 0..1, act, pulling (legacy), lineColor}
   */
  function drawRaw(ctx, x, y, h, oIn, pose) {
    const o = { ...BASE, ...oIn };
    if (o.age === 'elder' && !oIn.hairKeep) o.hair = mixGrey(o.hair);
    const face = pose.face || 0, front = -Math.cos(face), side = Math.sin(face);
    const t = pose.t || 0, mode = pose.mode || (pose.pulling ? 'pull' : 'idle'), tug = clamp(pose.tug || 0, 0, 1);
    const U = h * (o.age === 'kid' ? 0.72 : o.age === 'elder' ? 0.96 : 1), build = ({ slim: 0.9, regular: 1, broad: 1.13 }[o.build] || 1) * (o.age === 'kid' ? 1.08 : 1);
    const wm = (0.6 + 0.4 * Math.abs(Math.cos(face))) * build;
    const skin = typeof o.skin === 'number' ? SKINS[o.skin] || SKINS[1] : o.skin;
    const aim0 = pose.aim || [0.3, -1], al = Math.hypot(aim0[0], aim0[1]) || 1;
    const sgn = aim0[0] >= 0 ? 1 : -1;
    // whole-body lean: back away from the kite while hauling, into it while giving line, a jolt on a tunka
    const haulK = pose.haul != null ? clamp(pose.haul, 0, 1) : 0.6;
    const lean = (mode === 'pull' ? -(0.06 + 0.09 * haulK) : mode === 'send' ? 0.06 : 0) * sgn - tug * 0.1 * sgn + 0.018 * Math.sin(t * 1.6 + x * 0.013) + (o.age === 'elder' ? 0.03 * sgn : 0);
    const crouch = (mode === 'pull' ? 0.025 : 0) + tug * 0.015;
    const lw = Math.max(1, U * 0.006);
    ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    // shadow (not leaned)
    ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.beginPath(); ctx.ellipse(x, y, 0.21 * U * build, 0.04 * U, 0, 0, 7); ctx.fill();
    ctx.translate(x, y); ctx.rotate(lean);
    // aim in the leaned frame
    const ca = Math.cos(-lean), sa = Math.sin(-lean), ax = (aim0[0] * ca - aim0[1] * sa) / al, ay = (aim0[0] * sa + aim0[1] * ca) / al;
    const breathe = Math.sin(t * 2.1 + x * 0.01) * 0.005 * U;
    const Y = f => -f * U + (f > 0.3 ? crouch * U * (f - 0.3) / 0.7 : 0) + (f > 0.5 ? breathe : 0);
    const hipW = 0.165 * U * wm, shW = 0.15 * U * wm;

    // ---- shalwar (baggy, gathered at the ankle), feet in chappals; feet spread wider when hauling ----
    const stance = (mode === 'pull' ? 0.085 : 0.068) * U * wm;
    const west = o.outfit && o.outfit !== 'shalwar';
    const jeansLeg = (dx, k) => {   // straight-cut jeans: slimmer than a shalwar, a seam down the side, a turned-up hem, trainers
      const kx = dx + k * crouch * U * 0.5, pc = o.shalwar;
      const g = ctx.createLinearGradient(dx - 0.07 * U, 0, dx + 0.07 * U, 0); g.addColorStop(0, shade(pc, 0.8)); g.addColorStop(0.5, pc); g.addColorStop(1, shade(pc, 0.86));
      ctx.fillStyle = g; ctx.beginPath();
      ctx.moveTo(dx - 0.07 * U * wm, Y(0.5)); ctx.lineTo(dx + 0.072 * U * wm, Y(0.5));
      ctx.quadraticCurveTo(kx + 0.062 * U * wm, Y(0.27), dx + 0.04 * U * wm, Y(0.045));
      ctx.lineTo(dx - 0.04 * U * wm, Y(0.045));
      ctx.quadraticCurveTo(kx - 0.062 * U * wm, Y(0.27), dx - 0.07 * U * wm, Y(0.5)); ctx.fill();
      ctx.strokeStyle = shade(pc, 0.6); ctx.lineWidth = lw; ctx.stroke();
      ctx.strokeStyle = shade(pc, 1.35); ctx.globalAlpha = 0.5; ctx.lineWidth = Math.max(1, U * 0.003);   // stitched seam
      ctx.beginPath(); ctx.moveTo(dx + k * 0.05 * U * wm, Y(0.48)); ctx.quadraticCurveTo(kx + k * 0.045 * U * wm, Y(0.27), dx + k * 0.03 * U * wm, Y(0.06)); ctx.stroke(); ctx.globalAlpha = 1;
      ctx.fillStyle = shade(pc, 1.18); ctx.fillRect(dx - 0.041 * U * wm, Y(0.07), 0.082 * U * wm, 0.022 * U);   // turned-up hem
      const fx = dx + side * 0.035 * U, fw = 0.056 * U * (0.6 + 0.4 * Math.abs(side));   // trainers: white sole
      ctx.fillStyle = '#f2f0ea'; ctx.beginPath(); ctx.ellipse(fx, Y(0.012), fw, 0.016 * U, 0, 0, 7); ctx.fill();
      ctx.fillStyle = o.shoes; ctx.beginPath(); ctx.ellipse(fx, Y(0.03), fw * 0.86, 0.024 * U, 0, Math.PI, 0); ctx.fill();
      ctx.strokeStyle = shade(o.shoes, 0.6); ctx.lineWidth = Math.max(1, U * 0.003); ctx.stroke();
    };
    const leg = (dx, k) => {
      if (west) return jeansLeg(dx, k);
      const kx = dx + k * crouch * U * 0.6;   // knees push out a little when crouched
      const g = ctx.createLinearGradient(dx - 0.1 * U, 0, dx + 0.1 * U, 0); g.addColorStop(0, shade(o.shalwar, 0.86)); g.addColorStop(0.5, o.shalwar); g.addColorStop(1, shade(o.shalwar, 0.9));
      ctx.fillStyle = g; ctx.beginPath();
      ctx.moveTo(dx - 0.075 * U * wm, Y(0.52)); ctx.lineTo(dx + 0.078 * U * wm, Y(0.52));
      ctx.quadraticCurveTo(kx + 0.105 * U * wm, Y(0.24), dx + 0.034 * U * wm, Y(0.05));
      ctx.lineTo(dx - 0.034 * U * wm, Y(0.05));
      ctx.quadraticCurveTo(kx - 0.105 * U * wm, Y(0.24), dx - 0.075 * U * wm, Y(0.52)); ctx.fill();
      ctx.strokeStyle = shade(o.shalwar, 0.72); ctx.lineWidth = lw; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(kx - 0.03 * U, Y(0.3)); ctx.quadraticCurveTo(kx, Y(0.22), kx + 0.02 * U, Y(0.12)); ctx.globalAlpha = 0.35; ctx.stroke(); ctx.globalAlpha = 1;   // a fold
      ctx.fillStyle = skin; ctx.fillRect(dx - 0.022 * U, Y(0.055), 0.044 * U, 0.03 * U);   // ankle
      const fx = dx + side * 0.03 * U, fw = 0.05 * U * (0.6 + 0.4 * Math.abs(side));
      ctx.fillStyle = shade(o.shoes, 0.75); ctx.beginPath(); ctx.ellipse(fx, Y(0.012), fw, 0.016 * U, 0, 0, 7); ctx.fill();
      ctx.fillStyle = o.shoes; ctx.beginPath(); ctx.ellipse(fx, Y(0.03), fw * 0.8, 0.018 * U, 0, Math.PI, 0); ctx.fill();
    };
    leg(-stance, -1); leg(stance, 1);

    // ---- arms & hands ----
    const shY = Y(0.775), shL = [-shW, shY], shR = [shW, shY], L1 = 0.165 * U, L2 = 0.16 * U;
    const leadSh = ax >= 0 ? shR : shL, backSh = ax >= 0 ? shL : shR, chest = [ax * 0.02 * U, shY + 0.1 * U];
    const reach = 0.3 * U;
    let hA, hB;   // hA: lead (higher up the line), hB: the other
    if (mode === 'pull') {
      // hand over hand: each hand grabs high up the line and hauls it down to the hip, half a cycle apart
      const ph = pose.haulPh != null ? pose.haulPh + Math.PI / 2 : t * 6.5, f1 = 0.5 + 0.5 * Math.sin(ph), f2 = 0.5 + 0.5 * Math.sin(ph + Math.PI);
      const along = f => [chest[0] + ax * (0.04 + 0.27 * f) * U, chest[1] + 0.06 * U * (1 - f) + ay * (0.04 + 0.27 * f) * U];
      const p1 = along(f1), p2 = along(f2);
      hA = f1 >= f2 ? p1 : p2; hB = f1 >= f2 ? p2 : p1;
      // hands stay with their own arm: right hand on the right shoulder side, whichever is leading
      const right = p1, left = p2; hA = ax >= 0 ? right : left; hB = ax >= 0 ? left : right;
    } else if (mode === 'send') {
      const jig = Math.sin(t * 13) * 0.007 * U;   // the line slipping through the fingers
      hA = [leadSh[0] + ax * reach * 0.95, leadSh[1] + ay * reach * 0.95 + jig];
      hB = [hA[0] - ax * 0.1 * U - sgn * 0.02 * U, hA[1] - ay * 0.1 * U + 0.03 * U - jig];
    } else {
      const sway = Math.sin(t * 1.3) * 0.01 * U, jerk = tug * 0.12 * U;
      hA = [leadSh[0] + ax * (reach * 0.85 - jerk) + sway, leadSh[1] + ay * (reach * 0.85 - jerk) - jerk * 0.3];
      hB = [chest[0] + ax * (reach * 0.22 - jerk * 0.6), chest[1] + ay * reach * 0.22 - jerk * 0.4];
    }
    const armA = ik(leadSh, hA, L1, L2, Math.sign(leadSh[0]) || 1), armB = ik(backSh, hB, L1, L2, Math.sign(backSh[0]) || -1);
    const outer = LAYER[o.outfit] ? (o.coat || COAT_DEF[o.outfit]) : o.kameez;   // what the sleeves are made of
    const shortSleeve = o.outfit === 'tshirt';
    const sleeve = near => near ? shade(outer, 0.97) : shade(outer, 0.82);
    const drawArm = (sh, arm, near) => {
      if (shortSleeve) {   // bare arm, short sleeve over the shoulder
        ctx.strokeStyle = shade(skin, near ? 0.8 : 0.68); ctx.lineWidth = 0.044 * U; ctx.beginPath(); ctx.moveTo(sh[0], sh[1]); ctx.lineTo(arm.e[0], arm.e[1]); ctx.lineTo(arm.h[0], arm.h[1]); ctx.stroke();
        ctx.strokeStyle = skin; ctx.lineWidth = 0.028 * U; ctx.beginPath(); ctx.moveTo(sh[0], sh[1]); ctx.lineTo(arm.e[0], arm.e[1]); ctx.lineTo(arm.h[0], arm.h[1]); ctx.stroke();
        const mx = sh[0] + (arm.e[0] - sh[0]) * 0.5, my = sh[1] + (arm.e[1] - sh[1]) * 0.5;
        ctx.strokeStyle = shade(outer, near ? 0.75 : 0.62); ctx.lineWidth = 0.066 * U; ctx.beginPath(); ctx.moveTo(sh[0], sh[1]); ctx.lineTo(mx, my); ctx.stroke();
        ctx.strokeStyle = sleeve(near); ctx.lineWidth = 0.056 * U; ctx.beginPath(); ctx.moveTo(sh[0], sh[1]); ctx.lineTo(mx, my); ctx.stroke();
        ctx.fillStyle = skin; ctx.beginPath(); ctx.ellipse(arm.h[0], arm.h[1], 0.019 * U, 0.022 * U, Math.atan2(arm.h[1] - arm.e[1], arm.h[0] - arm.e[0]), 0, 7); ctx.fill();
        ctx.strokeStyle = shade(skin, 0.7); ctx.lineWidth = Math.max(1, U * 0.004); ctx.stroke();
        return;
      }
      ctx.strokeStyle = shade(outer, near ? 0.75 : 0.62); ctx.lineWidth = (o.outfit === 'coat' ? 0.07 : 0.062) * U;
      ctx.beginPath(); ctx.moveTo(sh[0], sh[1]); ctx.lineTo(arm.e[0], arm.e[1]); ctx.lineTo(arm.h[0], arm.h[1]); ctx.stroke();
      ctx.strokeStyle = sleeve(near); ctx.lineWidth = (o.outfit === 'coat' ? 0.058 : 0.05) * U;
      ctx.beginPath(); ctx.moveTo(sh[0], sh[1]); ctx.lineTo(arm.e[0], arm.e[1]);
      const cx = arm.e[0] + (arm.h[0] - arm.e[0]) * 0.75, cy = arm.e[1] + (arm.h[1] - arm.e[1]) * 0.75; ctx.lineTo(cx, cy); ctx.stroke();   // sleeve to the wrist
      if (o.outfit === 'hoodie' || o.outfit === 'jacket') { ctx.strokeStyle = shade(outer, 0.7); ctx.lineWidth = 0.054 * U; ctx.beginPath(); ctx.moveTo(cx - (arm.h[0] - arm.e[0]) * 0.06, cy - (arm.h[1] - arm.e[1]) * 0.06); ctx.lineTo(cx, cy); ctx.stroke(); }   // ribbed cuff
      ctx.strokeStyle = skin; ctx.lineWidth = 0.028 * U; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(arm.h[0], arm.h[1]); ctx.stroke();
      ctx.fillStyle = skin; ctx.beginPath(); ctx.ellipse(arm.h[0], arm.h[1], 0.019 * U, 0.022 * U, Math.atan2(arm.h[1] - arm.e[1], arm.h[0] - arm.e[0]), 0, 7); ctx.fill();
      ctx.strokeStyle = shade(skin, 0.7); ctx.lineWidth = Math.max(1, U * 0.004); ctx.stroke();
    };
    const lineHands = () => {   // the dor runs from the rear hand through the lead hand on toward the kite
      ctx.__solid = 1; ctx.strokeStyle = pose.lineColor || '#fff'; ctx.lineWidth = Math.max(1, U * 0.006);
      const rear = (hA[0] - hB[0]) * ax + (hA[1] - hB[1]) * ay >= 0 ? hB : hA, lead = rear === hB ? hA : hB;
      ctx.beginPath(); ctx.moveTo(rear[0] - ax * 0.05 * U, rear[1] - ay * 0.05 * U + 0.03 * U); ctx.lineTo(rear[0], rear[1]); ctx.lineTo(lead[0], lead[1]); ctx.stroke(); ctx.__solid = 0;   // only between the hands - the game draws the dor on from the lead hand
    };
    const armsBehind = front < -0.2;   // seen from behind: arms reach away from us, mostly hidden by the body
    if (armsBehind) { lineHands(); drawArm(backSh, armB, false); drawArm(leadSh, armA, false); }

    // ---- kameez: long shirt to the knee, side slits, shaded ----
    const kg = ctx.createLinearGradient(-shW * 1.2, 0, shW * 1.2, 0);
    kg.addColorStop(0, shade(o.kameez, 0.84)); kg.addColorStop(0.45, o.kameez); kg.addColorStop(1, shade(o.kameez, 0.88));
    const hemF = west ? (o.outfit === 'coat' ? 0.3 : 0.43) : 0.29;   // a kameez falls to the knee; a t-shirt or jacket to the hip
    const topPath = () => { ctx.beginPath();   // the western top: shoulders to a straight hem at the hip
      ctx.moveTo(-shW, shY + 0.02 * U); ctx.quadraticCurveTo(-shW, shY - 0.028 * U, -shW * 0.42, shY - 0.034 * U); ctx.lineTo(shW * 0.42, shY - 0.034 * U); ctx.quadraticCurveTo(shW, shY - 0.028 * U, shW, shY + 0.02 * U);
      ctx.quadraticCurveTo(shW * 1.04, Y(0.56), hipW * 1.0, Y(0.44)); ctx.lineTo(-hipW * 1.0, Y(0.44));
      ctx.quadraticCurveTo(-shW * 1.04, Y(0.56), -shW, shY + 0.02 * U); };
    const kPath0 = () => { ctx.beginPath();
      ctx.moveTo(-shW, shY + 0.02 * U); ctx.quadraticCurveTo(-shW, shY - 0.028 * U, -shW * 0.42, shY - 0.034 * U); ctx.lineTo(shW * 0.42, shY - 0.034 * U); ctx.quadraticCurveTo(shW, shY - 0.028 * U, shW, shY + 0.02 * U);
      ctx.quadraticCurveTo(shW * 1.08, Y(0.55), hipW * 1.18, Y(0.29)); ctx.lineTo(-hipW * 1.18, Y(0.29));
      ctx.quadraticCurveTo(-shW * 1.08, Y(0.55), -shW, shY + 0.02 * U); };
    const kPath = west ? topPath : kPath0;
    const topCol = o.outfit === 'hoodie' ? (o.coat || COAT_DEF.hoodie) : o.kameez;
    const tg = ctx.createLinearGradient(-shW * 1.2, 0, shW * 1.2, 0); tg.addColorStop(0, shade(topCol, 0.84)); tg.addColorStop(0.45, topCol); tg.addColorStop(1, shade(topCol, 0.88));
    ctx.fillStyle = west ? tg : kg; kPath(); ctx.fill();
    if (o.kpattern && o.kpattern !== 'plain') {   // cloth pattern, clipped to the shirt
      ctx.save(); kPath(); ctx.clip();
      const top = shY - 0.05 * U, bot = Y(0.28);
      if (o.kpattern === 'stripes') { ctx.strokeStyle = shade(o.kameez, 0.72); ctx.lineWidth = Math.max(1, U * 0.012); for (let xx = -shW * 1.4; xx < shW * 1.4; xx += U * 0.04) { ctx.beginPath(); ctx.moveTo(xx, top); ctx.lineTo(xx, bot); ctx.stroke(); } }
      else if (o.kpattern === 'checks') { ctx.strokeStyle = shade(o.kameez, 0.7); ctx.globalAlpha = 0.6; ctx.lineWidth = Math.max(1, U * 0.01); for (let xx = -shW * 1.4; xx < shW * 1.4; xx += U * 0.05) { ctx.beginPath(); ctx.moveTo(xx, top); ctx.lineTo(xx, bot); ctx.stroke(); } for (let yy = top; yy < bot; yy += U * 0.05) { ctx.beginPath(); ctx.moveTo(-shW * 1.4, yy); ctx.lineTo(shW * 1.4, yy); ctx.stroke(); } }
      else if (o.kpattern === 'kadhai') {   // embroidered hem band and neck
        ctx.fillStyle = o.trim; ctx.fillRect(-shW * 1.5, Y(0.33), shW * 3, U * 0.035);
        ctx.fillStyle = shade(o.trim, 0.7); for (let xx = -shW * 1.4; xx < shW * 1.4; xx += U * 0.025) { ctx.beginPath(); ctx.arc(xx, Y(0.33) + U * 0.017, U * 0.006, 0, 7); ctx.fill(); }
        if (front > 0.2) { ctx.fillStyle = o.trim; ctx.beginPath(); ctx.moveTo(-U * 0.025, shY - 0.03 * U); ctx.lineTo(U * 0.025, shY - 0.03 * U); ctx.lineTo(U * 0.012, Y(0.6)); ctx.lineTo(-U * 0.012, Y(0.6)); ctx.closePath(); ctx.fill(); }
      }
      ctx.restore();
    }
    kPath(); ctx.strokeStyle = shade(topCol, 0.7); ctx.lineWidth = lw; ctx.stroke();
    if (!west) {
      ctx.beginPath(); ctx.moveTo(-hipW * 0.98, Y(0.29)); ctx.lineTo(-hipW * 0.86, Y(0.43)); ctx.moveTo(hipW * 0.98, Y(0.29)); ctx.lineTo(hipW * 0.86, Y(0.43)); ctx.stroke();
      ctx.globalAlpha = 0.25; ctx.beginPath(); ctx.moveTo(-shW * 0.5, Y(0.5)); ctx.quadraticCurveTo(0, Y(0.47), shW * 0.5, Y(0.5)); ctx.stroke(); ctx.globalAlpha = 1;   // waist fold
    } else drawWestern();
    function drawWestern() {
      const fr = front > 0.2;
      if (o.outfit === 'tshirt') {
        if (fr) { ctx.strokeStyle = shade(topCol, 0.62); ctx.lineWidth = Math.max(1.2, U * 0.012); ctx.beginPath(); ctx.ellipse(side * U * 0.01, shY - 0.03 * U, 0.05 * U, 0.025 * U, 0, 0.1, Math.PI - 0.1); ctx.stroke(); }   // crew neck
        if (fr && o.print) {   // a little kite printed on the chest
          const cx = side * U * 0.02, cy = Y(0.64), r = U * 0.045; ctx.fillStyle = lum(topCol) > 0.55 ? shade(topCol, 0.5) : '#f4f1e8';
          ctx.beginPath(); ctx.moveTo(cx, cy - r); ctx.lineTo(cx + r * 0.8, cy); ctx.lineTo(cx, cy + r); ctx.lineTo(cx - r * 0.8, cy); ctx.closePath(); ctx.fill();
          ctx.strokeStyle = topCol; ctx.lineWidth = Math.max(1, U * 0.004); ctx.beginPath(); ctx.moveTo(cx, cy - r); ctx.lineTo(cx, cy + r); ctx.moveTo(cx - r * 0.8, cy); ctx.lineTo(cx + r * 0.8, cy); ctx.stroke();
        }
      } else if (o.outfit === 'shirt') {
        if (fr) { ctx.strokeStyle = shade(topCol, 0.6); ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(0, shY - 0.03 * U); ctx.lineTo(0, Y(0.44)); ctx.stroke();
          ctx.fillStyle = shade(topCol, 0.5); for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.arc(0.012 * U, shY + (0.01 + i * 0.07) * U, Math.max(1, 0.006 * U), 0, 7); ctx.fill(); }
          ctx.fillStyle = shade(topCol, 1.08); for (const sx of [-1, 1]) { ctx.beginPath(); ctx.moveTo(0, shY - 0.03 * U); ctx.lineTo(sx * 0.06 * U, shY - 0.045 * U); ctx.lineTo(sx * 0.035 * U, shY + 0.02 * U); ctx.closePath(); ctx.fill(); ctx.strokeStyle = shade(topCol, 0.6); ctx.stroke(); } }   // collar points
        ctx.fillStyle = shade(topCol, 0.8); ctx.fillRect(-shW * 0.55, Y(0.6), U * 0.04, U * 0.04);   // pocket
      } else if (o.outfit === 'hoodie') {
        const hc = topCol;
        if (fr) { ctx.fillStyle = shade(hc, 0.86); ctx.beginPath(); ctx.moveTo(-shW * 0.55, Y(0.45)); ctx.lineTo(-shW * 0.45, Y(0.56)); ctx.lineTo(shW * 0.45, Y(0.56)); ctx.lineTo(shW * 0.55, Y(0.45)); ctx.closePath(); ctx.fill();   // kangaroo pocket
          ctx.strokeStyle = '#f4f1e8'; ctx.lineWidth = Math.max(1, U * 0.006); for (const sx of [-1, 1]) { ctx.beginPath(); ctx.moveTo(sx * 0.03 * U, shY - 0.01 * U); ctx.lineTo(sx * 0.035 * U, shY + 0.09 * U); ctx.stroke(); } }   // drawstrings
        ctx.fillStyle = shade(hc, 0.75); ctx.fillRect(-hipW, Y(0.455), hipW * 2, U * 0.018);   // ribbed hem
      } else if (o.outfit === 'jacket' || o.outfit === 'coat') {
        const cc = o.coat || COAT_DEF[o.outfit], long = o.outfit === 'coat', bot = long ? Y(0.29) : Y(0.44), hw = long ? hipW * 1.16 : hipW * 1.04;
        const g = ctx.createLinearGradient(-shW * 1.2, 0, shW * 1.2, 0); g.addColorStop(0, shade(cc, 0.8)); g.addColorStop(0.5, cc); g.addColorStop(1, shade(cc, 0.85));
        ctx.fillStyle = g;
        const gap = fr ? 0.045 * U + (long ? 0.01 * U : 0.02 * U) : 0;   // open at the front, showing the shirt underneath
        for (const sx of fr ? [-1, 1] : [0]) {
          ctx.beginPath();
          if (sx === 0) {   // from behind: one back panel
            ctx.moveTo(-shW * 1.03, shY - 0.02 * U); ctx.lineTo(shW * 1.03, shY - 0.02 * U); ctx.quadraticCurveTo(shW * 1.1, Y(0.55), hw, bot); ctx.lineTo(-hw, bot); ctx.quadraticCurveTo(-shW * 1.1, Y(0.55), -shW * 1.03, shY - 0.02 * U);
          } else {
            ctx.moveTo(sx * shW * 1.03, shY - 0.02 * U); ctx.lineTo(sx * shW * 0.35, shY - 0.04 * U); ctx.lineTo(sx * gap, Y(0.6)); ctx.lineTo(sx * gap * 0.8, bot); ctx.lineTo(sx * hw, bot); ctx.quadraticCurveTo(sx * shW * 1.1, Y(0.55), sx * shW * 1.03, shY - 0.02 * U);
          }
          ctx.closePath(); ctx.fill(); ctx.strokeStyle = shade(cc, 0.6); ctx.lineWidth = lw; ctx.stroke();
        }
        if (fr) {   // lapels / collar
          ctx.fillStyle = shade(cc, 0.72);
          for (const sx of [-1, 1]) { ctx.beginPath(); ctx.moveTo(sx * shW * 0.35, shY - 0.04 * U); ctx.lineTo(sx * gap, Y(0.6)); ctx.lineTo(sx * (gap + 0.05 * U), shY + 0.06 * U); ctx.lineTo(sx * shW * 0.55, shY - 0.03 * U); ctx.closePath(); ctx.fill(); }
          ctx.fillStyle = shade(cc, 0.45); for (let i = 0; i < (long ? 3 : 2); i++) { ctx.beginPath(); ctx.arc(-gap - 0.012 * U, Y(0.58) + i * 0.07 * U, Math.max(1, 0.007 * U), 0, 7); ctx.fill(); }
          if (long) { ctx.strokeStyle = shade(cc, 0.6); ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(-hw * 0.95, Y(0.48)); ctx.lineTo(-hw * 0.95 + 0.06 * U, Y(0.48)); ctx.moveTo(hw * 0.95, Y(0.48)); ctx.lineTo(hw * 0.95 - 0.06 * U, Y(0.48)); ctx.stroke(); }   // pocket flaps
        } else if (long) { ctx.strokeStyle = shade(cc, 0.6); ctx.beginPath(); ctx.moveTo(0, Y(0.45)); ctx.lineTo(0, bot); ctx.stroke(); }   // the vent at the back
        if (!long) { ctx.fillStyle = shade(cc, 0.7); ctx.fillRect(-hw, Y(0.455), hw * 2, U * 0.02); }   // waistband
      }
    }
    if (o.vest && !west) {   // waistcoat (sadri)
      ctx.fillStyle = o.vest; ctx.beginPath();
      ctx.moveTo(-shW * 0.82, shY - 0.02 * U); ctx.lineTo(-shW * 0.95, Y(0.5)); ctx.lineTo(front > 0.2 ? -shW * 0.08 : shW * 0.95, Y(0.5));
      if (front > 0.2) { ctx.lineTo(-shW * 0.08, Y(0.66)); ctx.lineTo(-shW * 0.32, shY - 0.03 * U); ctx.lineTo(shW * 0.32, shY - 0.03 * U); ctx.lineTo(shW * 0.08, Y(0.66)); ctx.lineTo(shW * 0.08, Y(0.5)); ctx.lineTo(shW * 0.95, Y(0.5)); }
      ctx.lineTo(shW * 0.82, shY - 0.02 * U); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = shade(o.vest, 0.6); ctx.stroke();
    }
    if (o.shawl && !west) {   // chadar thrown over the left shoulder, across the body
      ctx.fillStyle = o.shawl; ctx.beginPath();
      ctx.moveTo(-shW * 1.05, shY - 0.02 * U); ctx.lineTo(-shW * 0.45, shY - 0.04 * U); ctx.lineTo(shW * 1.1, Y(0.48)); ctx.lineTo(shW * 0.9, Y(0.4)); ctx.lineTo(-shW * 1.15, shY + 0.1 * U); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = shade(o.shawl, 0.7); ctx.lineWidth = lw; ctx.stroke();
      ctx.strokeStyle = shade(o.shawl, 1.25); ctx.lineWidth = Math.max(1, U * 0.004); for (let i = 0; i < 6; i++) { const f = i / 5; ctx.beginPath(); ctx.moveTo(shW * (1.1 - f * 0.2), Y(0.48) + f * 0.08 * U * 0); ctx.lineTo(shW * (1.12 - f * 0.2), Y(0.45)); ctx.stroke(); }
      ctx.fillStyle = o.shawl; ctx.beginPath(); ctx.moveTo(-shW * 1.05, shY - 0.01 * U); ctx.lineTo(-shW * 1.25, Y(0.5)); ctx.lineTo(-shW * 0.95, Y(0.52)); ctx.lineTo(-shW * 0.8, shY + 0.05 * U); ctx.closePath(); ctx.fill();   // the hanging end
    }
    if (front > 0.2 && !west) {   // collar band + placket with buttons
      ctx.strokeStyle = shade(o.kameez, 0.65); ctx.lineWidth = lw;
      ctx.beginPath(); ctx.moveTo(0, shY - 0.03 * U); ctx.lineTo(0, Y(0.64)); ctx.stroke();
      ctx.fillStyle = shade(o.kameez, 0.55); for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(0.012 * U, shY + (0.012 + i * 0.035) * U, Math.max(1, 0.006 * U), 0, 7); ctx.fill(); }
    }

    // ---- head ----
    // a real head is about 1/7.5 of the body (it was 1/5: the big-headed cartoon look)
    const hx = side * 0.02 * U, hy = Y(0.882), hr = 0.07 * U * (o.age === 'kid' ? 1.12 : 1);
    { const ng = ctx.createLinearGradient(hx - 0.03 * U, 0, hx + 0.03 * U, 0); ng.addColorStop(0, shade(skin, 0.78)); ng.addColorStop(1, shade(skin, 0.92)); ctx.fillStyle = ng; ctx.fillRect(hx - 0.027 * U, Y(0.835), 0.054 * U, 0.06 * U); }   // neck, in shadow under the jaw
    if (front > -0.2 && !west) { ctx.fillStyle = shade(o.kameez, 0.9); ctx.beginPath(); ctx.ellipse(hx, Y(0.81), 0.05 * U, 0.016 * U, 0, 0, Math.PI); ctx.fill(); }   // collar
    const hairBack = () => {   // long hair hangs behind the head
      if (o.hairStyle === 'long' && o.head !== 'dupatta') { ctx.fillStyle = o.hair; ctx.beginPath(); ctx.ellipse(hx, hy + hr * 0.6, hr * 1.0, hr * 1.25, 0, 0, 7); ctx.fill(); }
    };
    hairBack();
    if (o.outfit === 'hoodie') {   // the hood, down, bunched behind the neck
      const hc = o.coat || COAT_DEF.hoodie; ctx.fillStyle = shade(hc, front < -0.2 ? 0.95 : 0.8); ctx.beginPath(); ctx.ellipse(hx, Y(0.82), hr * 1.15, hr * 0.55, 0, 0, 7); ctx.fill();
    }
    const headW = hr * (0.86 + 0.14 * Math.abs(Math.cos(face)));
    { const sg = ctx.createRadialGradient(hx - headW * 0.35, hy - hr * 0.4, hr * 0.1, hx, hy, hr * 1.25); sg.addColorStop(0, shade(skin, 1.08)); sg.addColorStop(0.6, skin); sg.addColorStop(1, shade(skin, 0.78));
      ctx.fillStyle = sg; ctx.beginPath(); ctx.ellipse(hx, hy, headW, hr * 1.12, 0, 0, 7); ctx.fill(); }   // a lit, rounded face, slightly longer than wide
    // ears
    if (Math.abs(side) < 0.9 || front < 0) for (const s of [-1, 1]) {
      const ex = hx + s * headW * 0.98 * Math.abs(Math.cos(face)) + side * hr * 0.2;
      if (Math.abs(Math.cos(face)) > 0.25) { ctx.fillStyle = shade(skin, 0.92); ctx.beginPath(); ctx.ellipse(ex, hy + hr * 0.05, hr * 0.14, hr * 0.22, 0, 0, 7); ctx.fill(); }
    }
    const look = [clamp(ax, -1, 1), clamp(ay, -1, 1)];
    const drawGlasses = (fx, ey) => {
      if (!o.glasses || o.glasses === 'none') return;
      ctx.lineWidth = Math.max(1, U * 0.007); ctx.strokeStyle = '#1a1a1a';
      for (const s2 of [-1, 1]) { const ex = fx + s2 * hr * 0.36; ctx.beginPath(); if (o.glasses === 'shades') { ctx.fillStyle = '#121212'; ctx.ellipse(ex, ey + hr * 0.01, hr * 0.22, hr * 0.15, 0, 0, 7); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.beginPath(); ctx.ellipse(ex - hr * 0.07, ey - hr * 0.04, hr * 0.06, hr * 0.03, -0.4, 0, 7); ctx.fill(); } else { ctx.arc(ex, ey, hr * 0.2, 0, 7); ctx.stroke(); } }
      ctx.beginPath(); ctx.moveTo(fx - hr * 0.16, ey - hr * 0.02); ctx.quadraticCurveTo(fx, ey - hr * 0.1, fx + hr * 0.16, ey - hr * 0.02); ctx.stroke();
    };
    const blink = ((t + x * 0.003) % 4.3) < 0.12;
    if (front > 0.2) {
      const fx = hx + side * hr * 0.25;
      // hair: a cap of hair over the forehead, styled
      ctx.fillStyle = o.hair; ctx.beginPath();
      if (o.hairStyle === 'curly') { for (let i = -3; i <= 3; i++) { ctx.moveTo(fx + i * hr * 0.26 + hr * 0.2, hy - hr * 0.62); ctx.arc(fx + i * hr * 0.26, hy - hr * 0.66 + Math.abs(i) * hr * 0.08, hr * 0.22, 0, 7); } }
      else if (o.hairStyle === 'side') { ctx.ellipse(hx, hy - hr * 0.55, headW * 1.02, hr * 0.56, 0, Math.PI, 0); ctx.moveTo(fx - hr * 0.5, hy - hr * 0.6); ctx.quadraticCurveTo(fx + hr * 0.3, hy - hr * 0.85, fx + headW, hy - hr * 0.35); ctx.lineTo(fx + headW, hy - hr * 0.6); }
      else { ctx.ellipse(hx, hy - hr * 0.52, headW * 1.02, hr * 0.58, 0, Math.PI, 0); }
      ctx.fill();
      if (o.hairStyle === 'long' && o.head !== 'dupatta') { ctx.fillRect(hx - headW * 1.02, hy - hr * 0.5, hr * 0.22, hr * 1.2); ctx.fillRect(hx + headW * 1.02 - hr * 0.22, hy - hr * 0.5, hr * 0.22, hr * 1.2); }
      // eyes: whites, iris looking at the kite, pupil, highlight; blinks now and then
      const ey = hy - hr * 0.02, eyes = [fx - hr * 0.36, fx + hr * 0.36];
      // far-away fliers (head only a few pixels): skip the face details nobody can see - a big saving on phones
      if (hr > 3.2) {
      for (const ex of eyes) {
        if (blink) { ctx.strokeStyle = shade(skin, 0.45); ctx.lineWidth = Math.max(1, U * 0.006); ctx.beginPath(); ctx.moveTo(ex - hr * 0.15, ey); ctx.lineTo(ex + hr * 0.15, ey); ctx.stroke(); continue; }
        // real eyes are small, almond-shaped and mostly iris at this size - no big white saucers or cartoon highlights
        ctx.fillStyle = shade(skin, 0.82); ctx.beginPath(); ctx.ellipse(ex, ey - hr * 0.02, hr * 0.2, hr * 0.11, 0, 0, 7); ctx.fill();   // the socket's shadow
        ctx.fillStyle = '#efe7dc'; ctx.beginPath(); ctx.ellipse(ex, ey, hr * 0.15, hr * 0.065, 0, 0, 7); ctx.fill();
        const ix = ex + look[0] * hr * 0.05, iy = ey + look[1] * hr * 0.02;
        ctx.save(); ctx.beginPath(); ctx.ellipse(ex, ey, hr * 0.15, hr * 0.065, 0, 0, 7); ctx.clip();
        ctx.fillStyle = shade(o.eyes, 0.8); ctx.beginPath(); ctx.arc(ix, iy, hr * 0.075, 0, 7); ctx.fill(); ctx.restore();
        ctx.strokeStyle = shade(skin, 0.42); ctx.lineWidth = Math.max(0.8, U * 0.004); ctx.beginPath(); ctx.ellipse(ex, ey, hr * 0.15, hr * 0.065, 0, Math.PI * 1.02, Math.PI * 1.98); ctx.stroke();   // upper lid
      }
      // brows: knit together when hauling or on a tunka (effort), relaxed otherwise
      const effort = mode === 'pull' || tug > 0.3 ? 1 : 0;
      ctx.strokeStyle = shade(o.hair, 1.1); ctx.lineWidth = Math.max(1.2, U * 0.011);
      for (const s of [-1, 1]) { const bx = fx + s * hr * 0.36; ctx.beginPath(); ctx.moveTo(bx - s * hr * 0.2, ey - hr * 0.24 + effort * hr * 0.05); ctx.quadraticCurveTo(bx, ey - hr * 0.33, bx + s * hr * 0.19, ey - hr * 0.25 - effort * hr * 0.02); ctx.stroke(); }
      // nose
      ctx.strokeStyle = shade(skin, 0.72); ctx.lineWidth = Math.max(1, U * 0.006);
      ctx.beginPath(); ctx.moveTo(fx + hr * 0.02, ey + hr * 0.06); ctx.quadraticCurveTo(fx + hr * 0.1, ey + hr * 0.3, fx - hr * 0.06, ey + hr * 0.32); ctx.stroke();
      // cheeks
      ctx.fillStyle = 'rgba(190,90,80,.07)'; for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(fx + s * hr * 0.5, ey + hr * 0.32, hr * 0.17, 0, 7); ctx.fill(); }
      // mouth: a smile at rest, gritted teeth hauling, a small "o" giving line, a grin on the tunka
      const my = hy + hr * 0.55;
      if (mode === 'pull') { ctx.fillStyle = '#5a1f1a'; ctx.beginPath(); ctx.ellipse(fx, my, hr * 0.2, hr * 0.08, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#fff'; ctx.fillRect(fx - hr * 0.17, my - hr * 0.03, hr * 0.34, hr * 0.04); }
      else if (mode === 'send') { ctx.fillStyle = '#5a1f1a'; ctx.beginPath(); ctx.ellipse(fx, my, hr * 0.07, hr * 0.09, 0, 0, 7); ctx.fill(); }
      else if (o.expr === 'grin' || tug > 0.3) { ctx.fillStyle = '#5a1f1a'; ctx.beginPath(); ctx.arc(fx, my - hr * 0.1, hr * 0.22, 0.15, Math.PI - 0.15); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#fff'; ctx.fillRect(fx - hr * 0.17, my - hr * 0.06, hr * 0.34, hr * 0.06); }
      else if (o.expr === 'serious') { ctx.strokeStyle = '#8a3b33'; ctx.lineWidth = Math.max(1, U * 0.007); ctx.beginPath(); ctx.moveTo(fx - hr * 0.14, my); ctx.lineTo(fx + hr * 0.14, my); ctx.stroke(); }
      else { ctx.strokeStyle = '#8a3b33'; ctx.lineWidth = Math.max(1, U * 0.007); ctx.beginPath(); ctx.arc(fx, my - hr * 0.12, hr * 0.18, 0.35, Math.PI - 0.35); ctx.stroke(); }
      drawGlasses(fx, ey);
      if (o.mustache) { ctx.fillStyle = o.hair; ctx.beginPath(); ctx.ellipse(fx - hr * 0.13, my - hr * 0.13, hr * 0.15, hr * 0.06, -0.2, 0, 7); ctx.ellipse(fx + hr * 0.13, my - hr * 0.13, hr * 0.15, hr * 0.06, 0.2, 0, 7); ctx.fill(); }
      if (o.beard) { ctx.fillStyle = o.hair; ctx.beginPath(); ctx.moveTo(hx - headW * 0.95, hy + hr * 0.1); ctx.quadraticCurveTo(hx - headW * 0.8, hy + hr * 1.25, hx, hy + hr * 1.3); ctx.quadraticCurveTo(hx + headW * 0.8, hy + hr * 1.25, hx + headW * 0.95, hy + hr * 0.1); ctx.quadraticCurveTo(hx + headW * 0.6, hy + hr * 0.75, fx + hr * 0.25, my + hr * 0.12); ctx.lineTo(fx - hr * 0.25, my + hr * 0.12); ctx.quadraticCurveTo(hx - headW * 0.6, hy + hr * 0.75, hx - headW * 0.95, hy + hr * 0.1); ctx.fill(); }
      }
    } else if (front > -0.35) {
      // side-on: hair on the back of the head, a profile with nose, eye and mouth toward where they face
      const s = side >= 0 ? 1 : -1;
      ctx.fillStyle = o.hair; ctx.beginPath(); ctx.ellipse(hx - s * hr * 0.3, hy - hr * 0.2, hr * 0.68, hr * 0.9, 0, 0, 7); ctx.fill();
      ctx.fillStyle = skin; ctx.beginPath(); ctx.moveTo(hx + s * headW * 0.92, hy - hr * 0.1); ctx.lineTo(hx + s * headW * 1.18, hy + hr * 0.22); ctx.lineTo(hx + s * headW * 0.95, hy + hr * 0.3); ctx.fill();   // nose
      ctx.fillStyle = shade(skin, 0.9); ctx.beginPath(); ctx.ellipse(hx - s * hr * 0.1, hy + hr * 0.05, hr * 0.13, hr * 0.2, 0, 0, 7); ctx.fill();   // ear
      if (!blink) { ctx.fillStyle = '#0d0907'; ctx.beginPath(); ctx.arc(hx + s * headW * 0.62, hy - hr * 0.02, hr * 0.07, 0, 7); ctx.fill(); }
      if (o.glasses !== 'none') { ctx.strokeStyle = '#1a1a1a'; ctx.lineWidth = Math.max(1, U * 0.006); ctx.beginPath(); ctx.moveTo(hx + s * headW * 0.95, hy - hr * 0.05); ctx.lineTo(hx - s * hr * 0.05, hy - hr * 0.08); ctx.stroke();
        ctx.fillStyle = o.glasses === 'shades' ? '#151515' : 'rgba(200,230,255,.35)'; ctx.beginPath(); ctx.ellipse(hx + s * headW * 0.7, hy - hr * 0.02, hr * 0.16, hr * 0.12, 0, 0, 7); ctx.fill(); ctx.stroke(); }
      ctx.strokeStyle = shade(o.hair, 1.1); ctx.lineWidth = Math.max(1, U * 0.009); ctx.beginPath(); ctx.moveTo(hx + s * headW * 0.42, hy - hr * 0.24); ctx.lineTo(hx + s * headW * 0.82, hy - hr * 0.22); ctx.stroke();
      ctx.strokeStyle = '#8a3b33'; ctx.lineWidth = Math.max(1, U * 0.006); ctx.beginPath(); ctx.moveTo(hx + s * headW * 0.7, hy + hr * 0.55); ctx.lineTo(hx + s * headW * 0.92, hy + hr * 0.52); ctx.stroke();
      if (o.mustache) { ctx.fillStyle = o.hair; ctx.beginPath(); ctx.ellipse(hx + s * headW * 0.85, hy + hr * 0.42, hr * 0.14, hr * 0.05, 0, 0, 7); ctx.fill(); }
      if (o.beard) { ctx.fillStyle = o.hair; ctx.beginPath(); ctx.ellipse(hx + s * hr * 0.35, hy + hr * 0.75, hr * 0.62, hr * 0.48, 0, 0, Math.PI); ctx.fill(); }
    } else {
      // from behind: the back of the head
      ctx.fillStyle = o.hair; ctx.beginPath(); ctx.ellipse(hx, hy - hr * 0.08, headW * 1.0, hr * 1.0, 0, 0, 7); ctx.fill();
      if (o.hairStyle === 'curly') { ctx.fillStyle = shade(o.hair, 1.3); for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.arc(hx + Math.cos(i) * hr * 0.5, hy - hr * 0.3 + Math.sin(i * 2) * hr * 0.3, hr * 0.12, 0, 7); ctx.fill(); } }
      { const ng = ctx.createLinearGradient(0, hy + hr * 0.5, 0, hy + hr * 1.05); ng.addColorStop(0, shade(skin, 0.7)); ng.addColorStop(1, shade(skin, 0.9)); ctx.fillStyle = ng;   // the nape of the neck, in the hair's shadow
        ctx.beginPath(); ctx.moveTo(hx - hr * 0.42, hy + hr * 0.62); ctx.quadraticCurveTo(hx, hy + hr * 0.78, hx + hr * 0.42, hy + hr * 0.62); ctx.lineTo(hx + hr * 0.36, hy + hr * 1.05); ctx.lineTo(hx - hr * 0.36, hy + hr * 1.05); ctx.closePath(); ctx.fill(); }
    }
    // ---- headwear ----
    const hc = o.headColor;
    if (o.head === 'topi') { ctx.fillStyle = hc; ctx.beginPath(); ctx.ellipse(hx, hy - hr * 0.62, headW * 0.98, hr * 0.5, 0, Math.PI, 0); ctx.fill(); ctx.strokeStyle = shade(hc, 0.72); ctx.lineWidth = lw; ctx.stroke(); for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.arc(hx + i * hr * 0.3, hy - hr * 0.85, hr * 0.05, 0, 7); ctx.stroke(); } }
    else if (o.head === 'jinnah') { ctx.fillStyle = hc; ctx.beginPath(); ctx.moveTo(hx - headW * 0.98, hy - hr * 0.5); ctx.lineTo(hx - headW * 0.9, hy - hr * 1.15); ctx.lineTo(hx + headW * 0.9, hy - hr * 1.15); ctx.lineTo(hx + headW * 0.98, hy - hr * 0.5); ctx.closePath(); ctx.fill(); ctx.strokeStyle = shade(hc, 1.4); ctx.lineWidth = lw; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(hx - headW * 0.85, hy - hr * (0.65 + i * 0.13)); ctx.lineTo(hx + headW * 0.85, hy - hr * (0.65 + i * 0.13)); ctx.stroke(); } }
    else if (o.head === 'cap') {
      ctx.fillStyle = hc; ctx.beginPath(); ctx.ellipse(hx, hy - hr * 0.45, headW * 1.05, hr * 0.7, 0, Math.PI, 0); ctx.fill();
      ctx.fillStyle = shade(hc, 0.8);
      if (front > 0.2) { ctx.beginPath(); ctx.ellipse(hx + side * hr * 0.3, hy - hr * 0.45, headW * 0.95, hr * 0.15, 0, 0, Math.PI); ctx.fill(); }
      else if (front > -0.35) { const s = side >= 0 ? 1 : -1; ctx.beginPath(); ctx.ellipse(hx + s * headW * 0.95, hy - hr * 0.45, hr * 0.55, hr * 0.12, 0, 0, 7); ctx.fill(); }
    } else if (o.head === 'pagri') {
      ctx.fillStyle = hc; ctx.beginPath(); ctx.ellipse(hx, hy - hr * 0.5, headW * 1.22, hr * 0.9, 0, Math.PI * 1.02, -0.02); ctx.fill();
      ctx.strokeStyle = shade(hc, 0.72); ctx.lineWidth = Math.max(1, U * 0.005);
      for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.ellipse(hx, hy - hr * (0.55 + i * 0.2), headW * (1.15 - i * 0.14), hr * 0.2, -0.18 + i * 0.12, Math.PI, 0); ctx.stroke(); }
      if (front < -0.2) { ctx.fillStyle = hc; ctx.beginPath(); ctx.moveTo(hx - hr * 0.2, hy - hr * 0.4); ctx.lineTo(hx + hr * 0.25, hy - hr * 0.4); ctx.lineTo(hx + hr * 0.15, hy + hr * 0.9); ctx.lineTo(hx - hr * 0.1, hy + hr * 0.8); ctx.fill(); }   // the tail (shamla)
    } else if (o.head === 'patka') {
      ctx.fillStyle = hc; ctx.beginPath(); ctx.ellipse(hx, hy - hr * 0.55, headW * 1.02, hr * 0.62, 0, Math.PI, 0); ctx.fill();
      ctx.beginPath(); ctx.arc(hx, hy - hr * 1.05, hr * 0.33, 0, 7); ctx.fill();
      ctx.strokeStyle = shade(hc, 0.7); ctx.lineWidth = lw; ctx.beginPath(); ctx.arc(hx, hy - hr * 1.05, hr * 0.33, 0, 7); ctx.stroke();
    } else if (o.head === 'dupatta') {
      // a thin chiffon dupatta: it hugs the head, falls over the shoulders in soft folds, a little see-through
      const dg = ctx.createLinearGradient(hx - headW * 1.3, hy - hr, hx + headW * 1.3, Y(0.6)); dg.addColorStop(0, shade(hc, 1.05)); dg.addColorStop(0.5, hc); dg.addColorStop(1, shade(hc, 0.72));
      ctx.save(); ctx.globalAlpha *= 0.86; ctx.fillStyle = dg; ctx.beginPath();
      ctx.moveTo(hx - headW * 1.08, hy + hr * 0.5); ctx.quadraticCurveTo(hx - headW * 1.18, hy - hr * 1.28, hx, hy - hr * 1.18); ctx.quadraticCurveTo(hx + headW * 1.18, hy - hr * 1.28, hx + headW * 1.08, hy + hr * 0.5);
      ctx.quadraticCurveTo(shW * 1.05, Y(0.8), shW * 1.12, Y(0.66)); ctx.quadraticCurveTo(0, Y(0.7), -shW * 1.12, Y(0.66)); ctx.quadraticCurveTo(-shW * 1.05, Y(0.8), hx - headW * 1.08, hy + hr * 0.5); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = shade(hc, 0.7); ctx.lineWidth = Math.max(0.8, U * 0.004);
      for (const k of [-0.5, 0, 0.5]) { ctx.beginPath(); ctx.moveTo(hx + k * headW, hy - hr * 0.6); ctx.quadraticCurveTo(hx + k * headW * 1.6, Y(0.78), k * shW * 1.4, Y(0.68)); ctx.stroke(); }   // folds
      ctx.restore();
      if (front > 0.2) {   // her face shows through the opening - redraw the face over the cloth
        const fx = hx + side * hr * 0.25;
        ctx.fillStyle = skin; ctx.beginPath(); ctx.ellipse(hx + side * hr * 0.12, hy + hr * 0.08, headW * 0.78, hr * 0.92, 0, 0, 7); ctx.fill();
        ctx.fillStyle = o.hair; ctx.beginPath(); ctx.ellipse(hx, hy - hr * 0.62, headW * 0.7, hr * 0.25, 0, Math.PI, 0); ctx.fill();
        const ey = hy - hr * 0.02;
        for (const ex of [fx - hr * 0.33, fx + hr * 0.33]) {
          if (blink) { ctx.strokeStyle = shade(skin, 0.45); ctx.beginPath(); ctx.moveTo(ex - hr * 0.13, ey); ctx.lineTo(ex + hr * 0.13, ey); ctx.stroke(); continue; }
          ctx.fillStyle = '#fbf8f3'; ctx.beginPath(); ctx.ellipse(ex, ey, hr * 0.16, hr * 0.11, 0, 0, 7); ctx.fill();
          const ix = ex + look[0] * hr * 0.05, iy = ey + look[1] * hr * 0.035;
          ctx.fillStyle = o.eyes; ctx.beginPath(); ctx.arc(ix, iy, hr * 0.08, 0, 7); ctx.fill();
          ctx.fillStyle = '#0d0907'; ctx.beginPath(); ctx.arc(ix, iy, hr * 0.04, 0, 7); ctx.fill();
          ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ix - hr * 0.025, iy - hr * 0.025, hr * 0.02, 0, 7); ctx.fill();
          ctx.strokeStyle = '#1b1410'; ctx.lineWidth = Math.max(1, U * 0.005); ctx.beginPath(); ctx.ellipse(ex, ey, hr * 0.16, hr * 0.11, 0, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke();
        }
        ctx.strokeStyle = shade(o.hair, 1.1); ctx.lineWidth = Math.max(1, U * 0.008);
        for (const s of [-1, 1]) { const bx = fx + s * hr * 0.33; ctx.beginPath(); ctx.moveTo(bx - s * hr * 0.17, ey - hr * 0.2); ctx.quadraticCurveTo(bx, ey - hr * 0.29, bx + s * hr * 0.17, ey - hr * 0.22); ctx.stroke(); }
        ctx.strokeStyle = shade(skin, 0.72); ctx.lineWidth = Math.max(1, U * 0.005); ctx.beginPath(); ctx.moveTo(fx + hr * 0.02, ey + hr * 0.08); ctx.quadraticCurveTo(fx + hr * 0.08, ey + hr * 0.27, fx - hr * 0.05, ey + hr * 0.29); ctx.stroke();
        ctx.fillStyle = 'rgba(230,110,100,.2)'; for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(fx + s * hr * 0.45, ey + hr * 0.3, hr * 0.13, 0, 7); ctx.fill(); }
        drawGlasses(fx, ey);
        const my = hy + hr * 0.52;
        if (mode === 'pull') { ctx.fillStyle = '#7a2a2a'; ctx.beginPath(); ctx.ellipse(fx, my, hr * 0.16, hr * 0.07, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#fff'; ctx.fillRect(fx - hr * 0.13, my - hr * 0.025, hr * 0.26, hr * 0.035); }
        else { ctx.strokeStyle = '#b04a4a'; ctx.lineWidth = Math.max(1, U * 0.008); ctx.beginPath(); ctx.arc(fx, my - hr * 0.1, hr * 0.15, 0.4, Math.PI - 0.4); ctx.stroke(); }
      }
    }
    // ---- arms in front of the body when seen from the front or side ----
    if (!armsBehind) { lineHands(); drawArm(backSh, armB, true); drawArm(leadSh, armA, true); }
    ctx.restore();
    // hand position back in screen space
    const c = Math.cos(lean), s = Math.sin(lean);
    const fwd = (hA[0] - hB[0]) * ax + (hA[1] - hB[1]) * ay >= 0 ? hA : hB;   // the hand further up the line
    return { hand: [x + fwd[0] * c - fwd[1] * s, y + fwd[0] * s + fwd[1] * c] };
  }

  /* ---------------- the realistic finish ----------------
   * The figures are drawn with soft edges (no hard cartoon outlines: every edge line is drawn faint) and then lit as one
   * body: a soft light from the sky above and to one side, the side away from it in shade, the legs darker toward
   * the roof, and the colours a touch less candy-bright - the way real cloth and skin look outdoors. Close-up figures
   * are drawn on a small canvas of their own so the lighting only falls on the figure; far-away ones (a few pixels
   * tall) skip that and are drawn straight in. */
  const pool = [];
  function soften(ctx, thin) {   // only the thin edge lines go faint; arms, sleeves and the dor (thick strokes) stay solid
    if (ctx.__soft) return () => {};
    const st = ctx.stroke; ctx.__soft = 1;
    ctx.stroke = function () { if (this.__solid || this.lineWidth > thin) return st.apply(this, arguments); const a = this.globalAlpha; this.globalAlpha = a * 0.5; st.apply(this, arguments); this.globalAlpha = a; };
    return () => { ctx.stroke = st; ctx.__soft = 0; };
  }
  function draw(ctx, x, y, h, oIn, pose) {
    const m = ctx.getTransform ? ctx.getTransform() : { a: 1, d: 1 }, sc = Math.abs(m.a) || 1, U = h * ((oIn && oIn.age) === 'kid' ? 0.72 : 1);
    if (h * sc < 46 || !root.document) { const un = soften(ctx, U * 0.02); try { return drawRaw(ctx, x, y, h, oIn, pose); } finally { un(); } }
    const W = Math.ceil(U * 2.0), H = Math.ceil(U * 1.75), ox = W / 2, oy = U * 1.6;
    let cv = pool.pop(); if (!cv) cv = root.document.createElement('canvas');
    const pw = Math.ceil(W * sc), ph = Math.ceil(H * sc);
    if (cv.width < pw || cv.height < ph) { cv.width = Math.max(cv.width, pw); cv.height = Math.max(cv.height, ph); }
    const g = cv.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, pw + 2, ph + 2); g.setTransform(sc, 0, 0, sc, 0, 0);
    const un = soften(g, U * 0.02); let out;
    try { out = drawRaw(g, ox, oy, h, oIn, pose); } finally { un(); }
    // light it as one body
    g.globalCompositeOperation = 'source-atop';
    const side = Math.sin(pose.face || 0) >= 0 ? 1 : -1;
    const lg = g.createLinearGradient(ox - side * U * 0.35, oy - U, ox + side * U * 0.35, oy - U * 0.6);
    lg.addColorStop(0, 'rgba(255,248,235,.16)'); lg.addColorStop(0.5, 'rgba(0,0,0,0)'); lg.addColorStop(1, 'rgba(20,24,40,.24)'); g.fillStyle = lg; g.fillRect(0, 0, W, H);
    const vg = g.createLinearGradient(0, oy - U, 0, oy);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(0.55, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(25,20,15,.22)'); g.fillStyle = vg; g.fillRect(0, 0, W, H);
    g.fillStyle = 'rgba(128,124,118,.10)'; g.fillRect(0, 0, W, H);   // takes the edge off saturated cloth
    g.globalCompositeOperation = 'source-over';
    ctx.drawImage(cv, 0, 0, pw, ph, x - ox, y - oy, W * (pw / (W * sc)), H * (ph / (H * sc)));
    pool.push(cv);
    if (out && out.hand) out.hand = [out.hand[0] + x - ox, out.hand[1] + y - oy];
    return out;
  }

  /* ---------------- make-your-own flier panel (#charMaker) ---------------- */
  function open(saved, onSave) {
    const el = document.querySelector('#charMaker'); if (!el) return;
    let o = { ...BASE, ...PRESETS[0], ...(saved.myFlier || {}), id: 'myflier', name: (saved.myFlier && saved.myFlier.name) || 'My flier' };
    let tm = 0, raf = 0, previewMode = 'auto';
    const esc = v => String(v).replace(/[<>&"]/g, '');
    const chips = (obj, key) => Object.entries(obj).map(([id, l]) => `<button data-k="${key}" data-v="${id}" class="${o[key] === id ? 'on' : ''}">${l}</button>`).join('');
    const color = (key, label) => `<label class="swatch"><input type="color" data-c="${key}" value="${o[key] || '#000000'}"><span>${label}</span></label>`;
    let tab = 'body';
    const TABS = [['body', 'Body & face'], ['clothes', 'Clothes'], ['head', 'Headwear']];
    function surprise() {
      const pick = a => a[Math.floor(Math.random() * a.length)], hue = () => '#' + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0');
      const cloth = ['#f4f1e8', '#6cb4ee', '#e9dcc0', '#ef6fa0', '#2e8b57', '#f28c28', '#7b1e3a', '#7b4bb3', '#1f2a44', '#c1121f', '#ffd23f', '#0b6e4f', '#ffffff', '#2b2b2b'];
      o = { ...o, skin: Math.floor(Math.random() * SKINS.length), build: pick(Object.keys(BUILDS)), age: pick(['adult', 'adult', 'kid', 'elder']), hairStyle: pick(Object.keys(HAIRSTYLES)),
        mustache: Math.random() < 0.4, beard: Math.random() < 0.25, glasses: pick(['none', 'none', 'specs', 'shades']), expr: pick(Object.keys(EXPRS)), head: pick(Object.keys(HEADWEAR)),
        headColor: pick(cloth), kameez: pick(cloth), shalwar: pick(cloth), kpattern: pick(Object.keys(KPATTERNS)), trim: pick(['#c9a227', '#c1121f', '#1f2a44', '#ffffff']), vest: Math.random() < 0.35 ? pick(cloth) : '', shawl: Math.random() < 0.25 ? pick(cloth) : '', shoes: pick(['#6b4226', '#3a2a20', '#c2185b', '#1f2a44']), eyes: pick(['#3b2416', '#1b1410', '#4a6b3a', '#2f5d8a']) };
      o.outfit = pick(['shalwar', 'shalwar', 'tshirt', 'shirt', 'hoodie', 'jacket', 'coat']);
      if (o.outfit !== 'shalwar') { o.shalwar = pick(['#3b5b8c', '#2b3a55', '#4a6fa5', '#22304a', '#2a2f3a', '#6b6b6b']); o.shoes = pick(['#f4f4f4', '#1b1b1b', '#6b4226', '#c1121f']); o.coat = pick(cloth.concat(['#5a4636', '#2b2b2b', '#3d5a80'])); o.print = Math.random() < 0.5; }
      render();
    }
    function render() {
      const chips = (obj, key) => Object.entries(obj).map(([id, l]) => `<button data-k="${key}" data-v="${id}" class="${o[key] === id ? 'on' : ''}">${l}</button>`).join('');
      const pane = {
        body: `<div class="mk-sec"><h4>Skin</h4><div class="chips">${SKINS.map((c, i) => `<button data-k="skin" data-v="${i}" class="dot ${o.skin === i ? 'on' : ''}" style="background:${c}" aria-label="skin ${i + 1}"></button>`).join('')}</div></div>
          <div class="mk-sec"><h4>Age &amp; build</h4><div class="chips">${chips(AGES, 'age')}</div><div class="chips">${chips(BUILDS, 'build')}</div></div>
          <div class="mk-sec"><h4>Hair</h4><div class="chips">${chips(HAIRSTYLES, 'hairStyle')}</div><div class="chips"><button data-t="mustache" class="${o.mustache ? 'on' : ''}">Moustache</button><button data-t="beard" class="${o.beard ? 'on' : ''}">Beard</button></div></div>
          <div class="mk-sec"><h4>Face</h4><div class="chips">${chips(EXPRS, 'expr')}</div><div class="chips">${chips(GLASSES, 'glasses')}</div>
            <div class="swatches">${color('hair', 'Hair')}${color('eyes', 'Eyes')}</div></div>`,
        clothes: `<div class="mk-sec"><h4>Outfit</h4><div class="chips">${chips(OUTFITS, 'outfit')}</div></div>` + (o.outfit === 'shalwar' || !o.outfit ? `<div class="mk-sec"><h4>Kameez</h4><div class="swatches">${color('kameez', 'Kameez')}${color('shalwar', 'Shalwar')}${color('shoes', 'Chappal')}</div>
            <div class="chips">${chips(KPATTERNS, 'kpattern')}</div>${o.kpattern === 'kadhai' ? `<div class="swatches">${color('trim', 'Embroidery')}</div>` : ''}</div>
          <div class="mk-sec"><h4>Layers</h4><div class="chips"><button data-t="vest" class="${o.vest ? 'on' : ''}">Waistcoat</button><button data-t="shawl" class="${o.shawl ? 'on' : ''}">Shawl / chadar</button></div>
            <div class="swatches">${o.vest ? color('vest', 'Waistcoat') : ''}${o.shawl ? color('shawl', 'Shawl') : ''}</div></div>`
          : `<div class="mk-sec"><h4>Colours</h4><div class="swatches">${LAYER[o.outfit] ? color('coat', LAYER[o.outfit]) : ''}${o.outfit !== 'hoodie' ? color('kameez', o.outfit === 'tshirt' ? 'T-shirt' : 'Shirt') : ''}${color('shalwar', 'Jeans')}${color('shoes', 'Shoes')}</div>
            ${o.outfit === 'tshirt' ? `<div class="chips"><button data-t="print" class="${o.print ? 'on' : ''}">Kite print</button></div>` : ''}</div>`),
        head: `<div class="mk-sec"><h4>Headwear</h4><div class="chips">${chips(HEADWEAR, 'head')}</div><div class="swatches">${o.head !== 'none' ? color('headColor', 'Colour') : ''}</div></div>`
      }[tab];
      el.querySelector('.mk-body').innerHTML = `
        <div class="mk-prev"><canvas id="cmPrev" width="260" height="300"></canvas>
          <div class="seg" id="cmPose">${[['auto', 'Turn'], ['idle', 'Hold'], ['pull', 'Khainch'], ['send', 'Dheel'], ['tug', 'Tunka']].map(([id, l]) => `<button data-pose="${id}" class="${previewMode === id ? 'on' : ''}">${l}</button>`).join('')}</div>
          <input id="cmName" maxlength="16" value="${esc(o.name)}" placeholder="Name">
          <button class="ghost sm wide" id="cmSurprise">&#127922; Surprise me</button></div>
        <div class="mk-opts">
          <div class="mk-sec"><h4>Start from</h4><div class="chips">${PRESETS.map(p => `<button data-preset="${p.id}">${p.name}</button>`).join('')}</div></div>
          <div class="seg mk-tabs">${TABS.map(([id, l]) => `<button data-tab="${id}" class="${tab === id ? 'on' : ''}">${l}</button>`).join('')}</div>
          ${pane}
        </div>`;
      el.querySelectorAll('[data-k]').forEach(b => b.onclick = () => { keepName(); const k = b.dataset.k, was = o.outfit; o[k] = k === 'skin' ? +b.dataset.v : b.dataset.v;
        if (k === 'outfit' && o.outfit !== 'shalwar') { if (!was || was === 'shalwar') { o.shalwar = '#3b5b8c'; o.shoes = '#f4f4f4'; } if (LAYER[o.outfit] && !o.coat) o.coat = COAT_DEF[o.outfit]; }
        render(); });
      el.querySelectorAll('[data-c]').forEach(i => i.oninput = () => { o[i.dataset.c] = i.value; });
      el.querySelectorAll('[data-t]').forEach(b => b.onclick = () => { keepName(); const k = b.dataset.t; o[k] = k === 'vest' ? (o.vest ? '' : '#2f4f4f') : k === 'shawl' ? (o.shawl ? '' : '#8c2f39') : !o[k]; render(); });   // print, mustache, beard toggle
      el.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { keepName(); tab = b.dataset.tab; render(); });
      el.querySelectorAll('[data-preset]').forEach(b => b.onclick = () => { const nm = el.querySelector('#cmName').value; o = { ...BASE, ...PRESETS.find(p => p.id === b.dataset.preset), id: 'myflier', name: nm }; render(); });
      el.querySelectorAll('[data-pose]').forEach(b => b.onclick = () => { previewMode = b.dataset.pose; el.querySelectorAll('[data-pose]').forEach(x => x.classList.toggle('on', x === b)); });
      el.querySelector('#cmSurprise').onclick = () => { keepName(); surprise(); };
    }
    const keepName = () => { const n = el.querySelector('#cmName'); if (n) o.name = n.value; };
    const anim = () => {   // live preview: turns round slowly and works the line, so you see every side
      const cv = el.querySelector('#cmPrev'); if (!cv || el.classList.contains('hidden')) return;
      const c = cv.getContext('2d'); tm += 1 / 60; c.clearRect(0, 0, cv.width, cv.height);
      let mode = previewMode, face = Math.PI + Math.sin(tm * 0.5) * 0.5, tug = 0;
      if (previewMode === 'auto') { const cyc = (tm / 3) % 4; mode = ['idle', 'pull', 'send', 'tug'][Math.floor(cyc)]; face = Math.PI + Math.sin(tm * 0.4) * 2.2; }
      if (mode === 'tug') { tug = Math.max(0, 1 - ((tm * 1.4) % 1) * 3); mode = 'idle'; }
      draw(c, 130, 285, 250, o, { face, aim: [0.55, -1], t: tm, mode, tug, lineColor: '#d33' });
      raf = requestAnimationFrame(anim);
    };
    el.querySelector('#cmSave').onclick = () => { keepName(); o.name = (o.name || '').trim() || 'My flier'; onSave({ ...o }); el.classList.add('hidden'); cancelAnimationFrame(raf); };
    el.querySelector('#cmClose').onclick = () => { el.classList.add('hidden'); cancelAnimationFrame(raf); };
    render(); el.classList.remove('hidden'); cancelAnimationFrame(raf); anim();
  }
  root.Fliers = { draw, open, PRESETS, SKINS, HEADWEAR, BASE, AGES, GLASSES, OUTFITS };
})(typeof self !== 'undefined' ? self : this);
