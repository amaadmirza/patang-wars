<template>
  <section class="ph" aria-labelledby="ph-title">
    <canvas ref="cv" class="ph-canvas" aria-hidden="true"></canvas>
    <div class="wrap ph-inner">
      <div class="ph-copy">
        <h1 id="ph-title" class="ph-title">
          <img src="brand/logo.svg" alt="Bo Kata!" width="420" height="300" />
        </h1>
        <p class="ph-sub">Fly your patang off a Lahore rooftop, hook a rival's line in a pecha, and work your manjha until theirs snaps.</p>
        <div class="ph-cta">
          <a class="btn" :href="config.apkUrl">Download for Android</a>
          <a v-if="config.playUrl" class="btn btn-quiet" :href="config.playUrl">Play in your browser</a>
          <router-link v-else class="btn btn-quiet" to="/basant">What is Basant?</router-link>
        </div>
        <p class="ph-facts">{{ counts.kites }} kites to collect, {{ counts.scenes }} skies from Lahore to Karachi, free, and it plays offline.</p>
      </div>
    </div>
    <div ref="tryEl" class="ph-try">
      <button class="ph-cut" type="button" :disabled="state !== 'hooked'" @click="cut">
        {{ state === 'hooked' ? 'Cut their line' : state === 'cut' ? 'Bo kata!' : 'Next rival climbing…' }}
      </button>
      <p class="ph-hint" aria-live="polite">{{ hint }}</p>
    </div>
    <p class="ph-shout" :class="{ 'ph-shout-on': state === 'cut' }" aria-hidden="true">Bo kata!</p>
    <SkylineEdge class="ph-roofs" />
  </section>
</template>

<script>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import SkylineEdge from './SkylineEdge.vue';
import config from '../config.js';
import game from '../data/game.json';

/* The hero is a real pecha, drawn with two kites from the game: your line (from the left roof) and a rival's (from the
 * right roof) cross in the sky. Both kites ride the wind and rock a little. "Cut their line" snaps the rival's dor at
 * the crossing: the kite flips and drifts off downwind trailing its string, and a new rival climbs into the fight. */
const RIVALS = ['patang/hilal', 'tukkal/tukkal-basant', 'patang/chand-tara', 'tukkal/tukkal-mor', 'patang/char-rang', 'patang/lahori-shola'];

export default {
  name: 'PechaHero',
  components: { SkylineEdge },
  setup() {
    const cv = ref(null), tryEl = ref(null), state = ref('hooked');
    const counts = game.counts;
    const hint = computed(() => state.value === 'hooked' ? 'Your pink line is on top of theirs - in the game you would hold DHEEL to saw it.' : state.value === 'cut' ? 'Their kite is loose. In a match, sweep your line through it to loot it.' : '');
    let raf = 0, visible = true, t = 0, last = 0, rivalIx = 0, cutAt = 0, W = 0, H = 0, dpr = 1, ro = null, io = null;
    const still = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    const imgs = {};
    const img = key => { if (!imgs[key]) { const i = new Image(); i.src = `kites/${key}.webp`; imgs[key] = i; } return imgs[key]; };
    const mine = { key: 'patang/lal-hukam' };
    const rival = { key: RIVALS[0], free: false, fx: 0, fy: 0, vx: 0, vy: 0, spin: 0, ang: 0, rise: 1 };

    function layout() {   // where the roofs and the kites sit, for this screen shape
      const wide = W > 820;
      return {
        a1: [W * (wide ? 0.5 : 0.18), H * 0.98], a2: [W * (wide ? 0.97 : 0.95), H * 0.98],
        k1: [W * (wide ? 0.8 : 0.7), H * (wide ? 0.26 : 0.2)], k2: [W * (wide ? 0.62 : 0.3), H * (wide ? 0.2 : 0.14)],
        size: Math.max(52, Math.min(W, H) * (wide ? 0.13 : 0.15))
      };
    }
    // a line from the roof to the kite, sagging a little; returns points along it
    function linePts(a, b, sag, n = 24) {
      const pts = [];
      for (let i = 0; i <= n; i++) { const s = i / n, w = 6.75 * s * (1 - s) * (1 - s); pts.push([a[0] + (b[0] - a[0]) * s + sag * 0.3 * w, a[1] + (b[1] - a[1]) * s + sag * w]); }
      return pts;
    }
    function crossing(p, q) {   // first crossing of two polylines
      for (let i = 0; i < p.length - 1; i++) for (let j = 0; j < q.length - 1; j++) {
        const [x1, y1] = p[i], [x2, y2] = p[i + 1], [x3, y3] = q[j], [x4, y4] = q[j + 1];
        const d = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4); if (!d) continue;
        const ta = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / d, tb = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / d;
        if (ta >= 0 && ta <= 1 && tb >= 0 && tb <= 1) return { x: x1 + ta * (x2 - x1), y: y1 + ta * (y2 - y1), i, j };
      }
      return null;
    }
    function stroke(ctx, pts, color, w, upto) {
      const n = upto == null ? pts.length : upto;
      ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < n; i++) ctx.lineTo(pts[i][0], pts[i][1]);
      ctx.strokeStyle = 'rgba(42,15,28,.35)'; ctx.lineWidth = w + 1.6; ctx.stroke();
      ctx.strokeStyle = color; ctx.lineWidth = w; ctx.stroke();
    }
    function kite(ctx, key, x, y, size, ang, bank) {   // the picture, banked: narrower as it tilts, like a real sail
      const im = img(key); if (!im.complete || !im.naturalWidth) return;
      const r = im.naturalHeight / im.naturalWidth;
      ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.scale(Math.cos(bank) * 0.92 + 0.08, 1);
      ctx.drawImage(im, -size / 2, -size * r / 2, size, size * r); ctx.restore();
    }
    function frame(now) {
      raf = 0;
      const dt = Math.min(0.05, last ? (now - last) / 1000 : 0); last = now; t += still ? 0 : dt;
      const c = cv.value; if (!c) return; const ctx = c.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
      const L = layout(), S = L.size;
      // your kite: hovering, swaying on the wind
      const k1 = [L.k1[0] + Math.sin(t * 0.9) * S * 0.18, L.k1[1] + Math.sin(t * 1.3 + 1) * S * 0.1];
      const p1 = linePts(L.a1, k1, H * 0.035);
      // the rival: climbing in, hooked, or loose after the cut
      if (state.value === 'climb') { rival.rise = Math.max(0, rival.rise - dt * 0.6); if (rival.rise <= 0) state.value = 'hooked'; }
      const k2h = [L.k2[0] + Math.sin(t * 1.1 + 2) * S * 0.16, L.k2[1] + Math.sin(t * 1.5) * S * 0.08 + rival.rise * H * 0.7];
      let p2 = null, X = null;
      if (!rival.free) { p2 = linePts(L.a2, k2h, H * 0.03); X = crossing(p1, p2); }
      else {
        rival.vx += (W * 0.05 - rival.vx) * dt * 0.8; rival.vy += (H * 0.06 - rival.vy) * dt * 0.5;   // carried downwind, sinking
        rival.fx += rival.vx * dt; rival.fy += rival.vy * dt; rival.ang += rival.spin * dt;
        if (now - cutAt > 4200 || rival.fx > W + S || rival.fy > H + S) {   // a new rival climbs into the fight
          rivalIx = (rivalIx + 1) % RIVALS.length; Object.assign(rival, { key: RIVALS[rivalIx], free: false, rise: 1 }); state.value = 'climb';
        }
      }
      // lines first (behind the kites)
      stroke(ctx, p1, '#ff3d7f', 2.2);
      if (p2) stroke(ctx, p2, '#ffd23f', 1.8);
      if (rival.free) {   // the cut dor trails under the loose kite
        ctx.beginPath(); ctx.moveTo(rival.fx, rival.fy);
        for (let i = 1; i <= 12; i++) ctx.lineTo(rival.fx - i * S * 0.12 - Math.sin(t * 3 + i * 0.6) * 4, rival.fy + i * S * 0.1);
        ctx.strokeStyle = 'rgba(255,210,63,.9)'; ctx.lineWidth = 1.5; ctx.stroke();
        // and the stub left on the roof, falling slack
        const stub = Math.min(1, (now - cutAt) / 900), cx = rival.cutX, cy = rival.cutY + stub * H * 0.25;
        ctx.beginPath(); ctx.moveTo(L.a2[0], L.a2[1]); ctx.quadraticCurveTo((L.a2[0] + cx) / 2, (L.a2[1] + cy) / 2 + 20, cx, cy); ctx.strokeStyle = 'rgba(255,210,63,.75)'; ctx.lineWidth = 1.5; ctx.stroke();
      }
      // the pecha ring at the crossing
      if (X && state.value === 'hooked') {
        const pulse = still ? 0.5 : 0.5 + 0.5 * Math.sin(t * 6);
        ctx.beginPath(); ctx.arc(X.x, X.y, 9 + pulse * 5, 0, Math.PI * 2); ctx.strokeStyle = `rgba(61,220,151,${0.55 + 0.4 * pulse})`; ctx.lineWidth = 3; ctx.stroke();
        rival.cutX = X.x; rival.cutY = X.y;
        placeTry(X.x, X.y);
      }
      kite(ctx, mine.key, k1[0], k1[1], S, -0.35 + Math.sin(t * 1.7) * 0.08, Math.sin(t * 1.2) * 0.35);
      if (rival.free) kite(ctx, rival.key, rival.fx, rival.fy, S * 0.95, rival.ang, Math.sin(t * 4) * 1.2);
      else kite(ctx, rival.key, k2h[0], k2h[1], S * 0.95, 0.4 + Math.sin(t * 1.4 + 1) * 0.1, Math.sin(t * 1.1 + 2) * 0.35);
      rival.hx = k2h[0]; rival.hy = k2h[1];
      if (visible && !still) raf = requestAnimationFrame(frame);
    }
    // the Cut button sits right beside the ring at the crossing (kept on screen), so it is obvious what it cuts
    let tryAt = null;
    function placeTry(x, y) {   // it only moves if the crossing has drifted well away - a button that wanders is hard to tap
      const el = tryEl.value; if (!el) return;
      if (tryAt && Math.hypot(x - tryAt[0], y - tryAt[1]) < 70 && tryAt[2] === W) return; tryAt = [x, y, W];
      const w = el.offsetWidth || 240, roomRight = x + 26 + w <= W - 12;
      const left = roomRight ? x + 26 : Math.max(12, Math.min(W - w - 12, x - w / 2)), top = Math.max(12, Math.min(H - 150, roomRight ? y - 22 : y + 26));
      const oy = cv.value ? cv.value.offsetTop : 0;   // the scene sits in the lower band on a phone
      el.style.transform = `translate(${Math.round(left)}px, ${Math.round(top + oy)}px)`; el.classList.add('ph-try-on');
    }
    function kick() { if (!raf) raf = requestAnimationFrame(frame); }
    function cut() {
      if (state.value !== 'hooked') return;
      Object.assign(rival, { free: true, fx: rival.hx, fy: rival.hy, vx: W * 0.12, vy: -H * 0.05, spin: 2.4, ang: 0.4 });
      cutAt = performance.now(); state.value = 'cut';
      if (still) { setTimeout(() => { rivalIx = (rivalIx + 1) % RIVALS.length; Object.assign(rival, { key: RIVALS[rivalIx], free: false, rise: 0 }); state.value = 'hooked'; kick(); }, 2600); }
      setTimeout(() => { if (state.value === 'cut') state.value = 'loose'; }, 1600);
      kick();
    }
    function resize() {
      const c = cv.value; if (!c) return; const r = c.getBoundingClientRect();
      dpr = Math.min(2, window.devicePixelRatio || 1); W = r.width; H = r.height;
      c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); kick();
    }
    onMounted(() => {
      mine.key = 'patang/lal-hukam'; RIVALS.forEach(img); img(mine.key);
      Object.values(imgs).forEach(i => i.addEventListener('load', kick));
      state.value = 'hooked'; rival.rise = 0;
      resize();
      if ('ResizeObserver' in window) { ro = new ResizeObserver(resize); ro.observe(cv.value); } else window.addEventListener('resize', resize);
      if ('IntersectionObserver' in window) { io = new IntersectionObserver(es => { visible = es[0].isIntersecting; last = 0; if (visible) kick(); }); io.observe(cv.value); }
      document.addEventListener('visibilitychange', onVis);
    });
    const onVis = () => { visible = !document.hidden; last = 0; if (visible) kick(); };
    onBeforeUnmount(() => { cancelAnimationFrame(raf); raf = 0; if (ro) ro.disconnect(); else window.removeEventListener('resize', resize); if (io) io.disconnect(); document.removeEventListener('visibilitychange', onVis); });
    return { cv, tryEl, state, hint, cut, counts, config };
  }
};
</script>

<style>
.ph { position: relative; overflow: hidden; color: #fff; isolation: isolate;
  background: linear-gradient(180deg, #1c4fa6 0%, #2f6fd0 38%, #6aa6ea 72%, #a9cdf5 100%); min-height: min(760px, 100svh); display: flex; flex-direction: column; }
.ph-canvas { position: absolute; inset: 0; width: 100%; height: 100%; z-index: 0; }
.ph-inner { position: relative; z-index: 1; flex: 1; display: flex; align-items: center; padding-top: clamp(24px, 5vw, 56px); padding-bottom: clamp(140px, 18vw, 200px); }
.ph-copy { max-width: 520px; }
.ph-title { margin: 0 0 8px; }
.ph-title img { width: min(420px, 78vw); height: auto; filter: drop-shadow(0 10px 24px rgba(28, 79, 166, 0.45)); }
.ph-sub { font-size: var(--t-lg); line-height: 1.45; color: #fff; max-width: 34ch; text-shadow: 0 1px 2px rgba(28, 79, 166, 0.5); }
.ph-cta { display: flex; flex-wrap: wrap; gap: 12px; margin: 22px 0 14px; }
.ph-cta .btn-quiet { color: #fff; }
.ph-facts { font-size: var(--t-sm); color: #e3eeff; }
.ph-try { position: absolute; z-index: 2; left: 0; top: 0; display: flex; flex-direction: column; align-items: flex-start; gap: 6px; width: 250px; opacity: 0; transition: opacity 0.3s, transform 0.6s cubic-bezier(0.3, 0, 0.2, 1); }
.ph-try-on { opacity: 1; }
.ph-try:not(.ph-try-on) { transition: none; }
.ph-cut { font-family: var(--display); font-weight: 800; font-size: var(--t-md); padding: 10px 18px; min-height: 46px; border-radius: 999px; border: 2px solid #fff; color: #fff; background: rgba(42, 15, 28, 0.35); cursor: pointer; backdrop-filter: blur(2px); }
.ph-cut:hover:not(:disabled) { background: var(--manjha); border-color: var(--manjha); }
.ph-cut:disabled { cursor: default; opacity: 0.85; }
.ph-hint { margin: 0; padding: 6px 10px; border-radius: 10px; font-size: var(--t-xs); line-height: 1.4; color: #fff; background: rgba(28, 79, 166, 0.55); }
.ph-hint:empty { display: none; }
.ph-shout { position: absolute; z-index: 2; left: 50%; top: 28%; margin: 0; transform: translate(-50%, 0) scale(0.6) rotate(-6deg); opacity: 0; pointer-events: none;
  font-family: var(--display); font-weight: 800; font-size: clamp(2.6rem, 8vw, 5.6rem); color: var(--genda); -webkit-text-stroke: 3px var(--jamun); paint-order: stroke fill; transition: opacity 0.25s, transform 0.35s cubic-bezier(0.2, 1.6, 0.4, 1); }
.ph-shout-on { opacity: 1; transform: translate(-50%, 0) scale(1) rotate(-6deg); }
.ph-roofs { position: absolute; z-index: 1; left: 0; right: 0; bottom: -1px; width: 100%; height: clamp(70px, 10vw, 130px); color: var(--page-bg); }
@media (max-width: 820px) {
  .ph { min-height: 0; }
  /* phone: the words first, then the pecha in its own band of sky above the roofs */
  .ph-canvas { top: auto; bottom: 0; height: 430px; }
  .ph-inner { align-items: flex-start; padding-top: 28px; padding-bottom: 440px; }
  .ph-title img { width: min(300px, 70vw); }
  .ph-try { width: 210px; }
  .ph-shout { top: auto; bottom: 250px; }
}
</style>
