/* All game audio, made live with WebAudio (no sound files needed, works offline from file://), plus the player's own
 * songs if they add any.
 *
 *   - the kite's own sound: the "phar-phar" of the paper sail fluttering in the wind (can be switched off)
 *   - wind, reel clicks, line-on-line sawing, the crowd
 *   - festival music: several Basant tracks played live (Lahore bhangra, Uttarayan garba, Sufi qawwali, rooftop dhol,
 *     evening bansuri) or a mix of all of them, or the player's own song files
 *   - the shouts ("Bo kaata!", "Kat gayi oye!", "Urr gayi patang!"), spoken in Urdu or Hindi by a South Asian voice
 *
 * Browsers only allow audio after a click/key press, so call Sound.init() from an input handler. */
(function (root) {
  'use strict';
  const AC = root.AudioContext || root.webkitAudioContext;
  let ctx = null, master, sfx, musicBus, kiteBus, noiseBuf, wind, crowd, saw, voices = [], enabled = true, reelPhase = 0, crowdT = 0;
  const pref = { music: false, track: 'mix', musicVol: 0.4, kite: true, voice: 'ur' };
  let duck = 1, scene = 'menu', DM = 1;   // duck: music level in a match; DM: how much drum the current section has

  function noiseLoop(filterType, freq, Q, dest) {
    const src = ctx.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
    const f = ctx.createBiquadFilter(); f.type = filterType; f.frequency.value = freq; f.Q.value = Q;
    const g = ctx.createGain(); g.gain.value = 0;
    src.connect(f); f.connect(g); g.connect(dest || sfx); src.start();
    return { f, g };
  }
  function init() {
    if (!AC) return;
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); if (pref.music && enabled && pref.track === 'mine') songPlay(); return; }
    try {
      ctx = new AC();
      master = ctx.createGain(); master.gain.value = enabled ? 0.9 : 0; master.connect(ctx.destination);
      sfx = ctx.createGain(); sfx.gain.value = 1; sfx.connect(master);
      kiteBus = ctx.createGain(); kiteBus.gain.value = pref.kite ? 1 : 0; kiteBus.connect(sfx);
      // v6.4: the music goes through a gentle tone stage before the speakers - no sub-bass boom on phone speakers (they
      // only rattle), no fizz above 7 kHz, and a soft compressor so a loud dhol hit never jumps out over the game
      musicBus = ctx.createGain(); musicBus.gain.value = 0;
      const mhp = ctx.createBiquadFilter(); mhp.type = 'highpass'; mhp.frequency.value = 85; mhp.Q.value = 0.6;
      const mlp = ctx.createBiquadFilter(); mlp.type = 'lowpass'; mlp.frequency.value = 7000; mlp.Q.value = 0.5;
      const mcomp = ctx.createDynamicsCompressor(); mcomp.threshold.value = -26; mcomp.knee.value = 12; mcomp.ratio.value = 3; mcomp.attack.value = 0.01; mcomp.release.value = 0.3;
      const mpost = ctx.createGain(); mpost.gain.value = 0.5;   // the browser's compressor adds its own make-up gain: take it back off
      musicBus.connect(mhp); mhp.connect(mlp); mlp.connect(mcomp); mcomp.connect(mpost); mpost.connect(master);
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0); let b = 0;
      for (let i = 0; i < d.length; i++) { const w = Math.random() * 2 - 1; b = 0.97 * b + 0.03 * w; d[i] = 0.6 * w + 2.5 * b; }   // white + a little brown: softer, more natural hiss
      wind = noiseLoop('lowpass', 380, 0.6);
      crowd = noiseLoop('bandpass', 750, 0.9);
      saw = noiseLoop('bandpass', 900, 0.8);   // v6.5: dor rubbing on dor - a soft low rasp (was a narrow 2-3.6 kHz hiss that players found piercing)
      if (pref.music) setMusic(true);
    } catch (e) { ctx = null; }
  }
  const ok = () => ctx && enabled;
  const ramp = (param, v, tc = 0.15) => param.setTargetAtTime(v, ctx.currentTime, tc);

  /* =====================================================================================================
   * THE KITE'S OWN SOUND - "pharpharahat"
   * Standing under a paper patang you hear its sail flutter: the thin paper and its loose edges slap against the
   * frame many times a second - "phrrrr... phar-phar-phar" - fast and loud in a gust, in a dive or a spin on dheel,
   * soft and lazy while it hangs steady. No tone, no whistle: just paper.
   *
   * Each flap is a soft papery slap: a few milliseconds of noise rung through a paper-like resonance (~0.7-1.6 kHz)
   * with a tiny low thump of the sheet. Flaps come in a train at 11-20 a second, never perfectly even, swelling and
   * fading in groups. A few seconds of that are written into a buffer once, then looped; while flying only its speed,
   * brightness and loudness move with the air on the sail.
   * ===================================================================================================== */
  let flutterBuf = null;
  function makeFlutter() {
    const sr = ctx.sampleRate, len = Math.floor(sr * 4), b = ctx.createBuffer(1, len, sr), d = b.getChannelData(0);
    let t = 0.01, grp = 0.7, grpT = 0;
    while (t < 3.95) {
      const rate = 14 + 4 * Math.sin(t * 2.3) + 2 * Math.sin(t * 5.1 + 1) + (Math.random() - 0.5) * 3;
      grpT -= 1 / rate; if (grpT <= 0) { grpT = 0.18 + Math.random() * 0.45; grp = 0.25 + Math.random() * 0.75; }   // the groups: "phar... phar-phar"
      const amp = grp * (0.55 + 0.45 * Math.random()), at = Math.floor(t * sr);
      // one slap: noise through a two-pole resonance (the paper), plus a short low thump (the sheet snapping taut)
      const fc = 650 + Math.random() * 900, q = 2.2 + Math.random() * 1.5, w0 = 2 * Math.PI * fc / sr, r = Math.exp(-w0 / (2 * q));
      const a1 = 2 * r * Math.cos(w0), a2 = -r * r; let y1 = 0, y2 = 0;
      const n = Math.floor(sr * (0.012 + Math.random() * 0.01)), th = 160 + Math.random() * 120;
      for (let i = 0; i < n && at + i < len; i++) {
        const e = i < sr * 0.0008 ? i / (sr * 0.0008) : Math.exp(-(i - sr * 0.0008) / (sr * 0.0035));
        const x = (Math.random() * 2 - 1) * e, y = x + a1 * y1 + a2 * y2; y2 = y1; y1 = y;
        d[at + i] += amp * (0.5 * y * (1 - r) * 6 + 0.35 * Math.sin(2 * Math.PI * th * i / sr) * Math.exp(-i / (sr * 0.004)) + 0.12 * x);
      }
      t += 1 / rate;
    }
    let pk = 0; for (let i = 0; i < len; i++) pk = Math.max(pk, Math.abs(d[i]));
    for (let i = 0; i < len; i++) d[i] /= pk || 1;
    return b;
  }
  function kiteVoice(pan = 0) {
    const out = ctx.createGain(); out.gain.value = 0;
    if (ctx.createStereoPanner) { const pn = ctx.createStereoPanner(); pn.pan.value = pan; out.connect(pn); pn.connect(kiteBus); } else out.connect(kiteBus);
    if (!flutterBuf) flutterBuf = makeFlutter();
    const fl = ctx.createBufferSource(); fl.buffer = flutterBuf; fl.loop = true;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2400; lp.Q.value = 0.4;
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 140;
    const flap = ctx.createGain(); flap.gain.value = 0;
    fl.connect(hp); hp.connect(lp); lp.connect(flap); flap.connect(out); fl.start(0, Math.random() * 3.5);
    // the air going past: a very soft low rush, only really there when it moves fast
    const rush = ctx.createGain(); rush.gain.value = 0; rush.connect(out);
    const rsrc = ctx.createBufferSource(); rsrc.buffer = noiseBuf; rsrc.loop = true;
    const rf = ctx.createBiquadFilter(); rf.type = 'lowpass'; rf.frequency.value = 500; rf.Q.value = 0.3;
    rsrc.connect(rf); rf.connect(rush); rsrc.start(0, Math.random() * 1.5);
    return { out, fl, lp, flap, rush, rf, lastHaul: 0, gust: 1, gustT: 0 };
  }
  /** a khainch haul: the dor rasping through the fingers and onto the charkhi ("srrrp") */
  function haulZip(v = 1, pan = 0) {
    if (!ok() || !pref.kite) return;
    const t = ctx.currentTime, src = ctx.createBufferSource(); src.buffer = noiseBuf; src.playbackRate.value = 1.3;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 2.2; f.frequency.setValueAtTime(3000, t); f.frequency.exponentialRampToValueAtTime(1400, t + 0.16);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.06 * v, t + 0.025); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
    let dst = sfx; if (pan && ctx.createStereoPanner) { dst = ctx.createStereoPanner(); dst.pan.value = pan; dst.connect(sfx); }
    src.connect(f); f.connect(g); g.connect(dst); src.start(t, Math.random()); src.stop(t + 0.24);
  }
  /** a tunka or a hard dive: a burst of flapping paper and a rip of air (pan: -1 left .. 1 right) */
  function whoosh(v = 1, pan = 0) {
    if (!ok() || !pref.kite) return;
    const t = ctx.currentTime;
    let dst = sfx; if (pan && ctx.createStereoPanner) { dst = ctx.createStereoPanner(); dst.pan.value = pan; dst.connect(sfx); }
    const src = ctx.createBufferSource(); src.buffer = noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 1.1; f.frequency.setValueAtTime(400, t); f.frequency.exponentialRampToValueAtTime(1300, t + 0.12); f.frequency.exponentialRampToValueAtTime(500, t + 0.32);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.09 * v, t + 0.04); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.34);
    src.connect(f); f.connect(g); g.connect(dst); src.start(t, Math.random()); src.stop(t + 0.4);
    if (!flutterBuf) flutterBuf = makeFlutter();
    const fl = ctx.createBufferSource(); fl.buffer = flutterBuf; fl.playbackRate.value = 1.25;
    const fg = ctx.createGain(); fg.gain.setValueAtTime(0.0001, t); fg.gain.exponentialRampToValueAtTime(0.16 * v, t + 0.03); fg.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
    const fl2 = ctx.createBiquadFilter(); fl2.type = 'lowpass'; fl2.frequency.value = 3200;
    fl.connect(fl2); fl2.connect(fg); fg.connect(dst); fl.start(t, Math.random() * 3); fl.stop(t + 0.5);
  }

  /** Call every frame. wind m/s at the listener's kite, reel m/s (signed), sawing 0..1, gameRunning bool. */
  function update(dt, o) {
    if (!ctx) return;
    const run = o.running && enabled;
    const w = run ? o.wind || 0 : 0;
    ramp(wind.g.gain, Math.min(0.2, w / 52)); ramp(wind.f.frequency, 200 + w * 50, 0.4);
    // crowd: a low murmur that swells now and then by itself
    crowdT -= dt; if (crowdT <= 0) { crowdT = 2 + Math.random() * 4; if (run) ramp(crowd.g.gain, 0.02 + Math.random() * 0.03, 1.2); }
    if (!run) ramp(crowd.g.gain, 0, 0.3);
    // the rasp breathes with each stroke instead of a steady hiss, and stays well under the kite and the wind
    const sw = o.sawing || 0, rasp = 0.75 + 0.25 * Math.sin((ctx.currentTime || 0) * 2 * Math.PI * 7);
    ramp(saw.g.gain, run ? Math.min(0.055, sw * 0.055) * rasp : 0, 0.06);
    ramp(saw.f.frequency, 700 + sw * 450, 0.12);
    // each local flier hears ONLY their own kite: o.kites = [{ air, dist, tension, turn, pan, haul, free }]
    const list = run && pref.kite ? (o.kites || (o.kite ? [o.kite] : [])) : [];
    for (let i = 0; i < Math.max(voices.length, list.length); i++) {
      const k = list[i]; if (k && !voices[i]) voices[i] = kiteVoice(k.pan || 0);
      const kv = voices[i]; if (!kv) continue;
      const air = k ? Math.min(18, k.air || 0) : 0, near = k ? Math.max(0.35, Math.min(1, 1.3 - (k.dist || 0) / 120)) : 0;
      const live = Math.max(0, Math.min(1, (air - 1.5) / 10));
      const turn = Math.min(4, Math.abs(k ? k.turn || 0 : 0)), haul = k ? k.haul || 0 : 0, fall = k && k.free ? 1 : 0;
      const drive = Math.min(1.4, 0.55 * live + 0.18 * turn + 0.45 * haul + 0.6 * fall);   // how hard the sail is working
      // gusts: the flutter swells and settles by itself every second or two, like the real thing
      kv.gustT -= dt; if (kv.gustT <= 0) { kv.gustT = 0.6 + Math.random() * 1.6; kv.gust = 0.55 + Math.random() * 0.6; }
      ramp(kv.out.gain, (list.length > 1 ? 0.75 : 1) * near * (k ? 1 : 0), 0.15);
      ramp(kv.flap.gain, k ? (0.035 + 0.26 * Math.min(1, drive)) * kv.gust : 0, 0.18);
      kv.fl.playbackRate.setTargetAtTime(0.72 + 0.03 * air + 0.22 * Math.min(1, drive), ctx.currentTime, 0.3);
      ramp(kv.lp.frequency, 1300 + 1900 * Math.min(1, drive) + air * 40, 0.3);
      ramp(kv.rush.gain, 0.012 + 0.05 * Math.min(1, air / 15), 0.3); ramp(kv.rf.frequency, 380 + air * 22, 0.4);
      // one "srrrp" of dor through the hands at the peak of each khainch haul
      if (k && haul > 0.85 && kv.lastHaul <= 0.85) haulZip(0.6 + 0.4 * (k.pull || 1), k.pan || 0);
      kv.lastHaul = haul;
    }
    if (run) musicTick();
    // reel clicks: the charkhi ratchets once per ~0.4 m of line wound in or let out
    if (run && Math.abs(o.reel || 0) > 0.3) { reelPhase += Math.abs(o.reel) * dt / 0.4; while (reelPhase >= 1) { reelPhase -= 1; click(o.reel < 0 ? 0.8 : 0.55); } }
  }
  function click(v = 1) {
    if (!ok()) return;
    const t = ctx.currentTime, src = ctx.createBufferSource(); src.buffer = noiseBuf; src.playbackRate.value = 1.5;
    const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 3000;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.13 * v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.025);
    src.connect(f); f.connect(g); g.connect(sfx); src.start(t, Math.random()); src.stop(t + 0.03);
  }
  function tone(freq, dur, type = 'triangle', vol = 0.08, slideTo = null, delay = 0, dest) {
    if (!ok()) return;
    const t = ctx.currentTime + delay, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t); if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest || sfx); o.start(t); o.stop(t + dur + 0.05);
  }
  /** a crowd cheer: the crowd noise swells, with a couple of whistles on top */
  function cheer(big = true) {
    if (!ok()) return;
    const t = ctx.currentTime;
    crowd.g.gain.cancelScheduledValues(t); crowd.g.gain.setTargetAtTime(big ? 0.3 : 0.15, t, 0.08); crowd.g.gain.setTargetAtTime(0.03, t + 0.9, 0.9);
    crowd.f.frequency.setTargetAtTime(1100, t, 0.1); crowd.f.frequency.setTargetAtTime(750, t + 1, 0.8);
    if (big) { tone(1900, 0.45, 'sine', 0.022, 2600, 0.3); tone(2300, 0.35, 'sine', 0.016, 1800, 0.75); }
    crowdT = 3;
  }
  function lost() { tone(300, 0.5, 'sawtooth', 0.05, 110); }
  function hooked() { tone(660, 0.12, 'triangle', 0.07); tone(990, 0.12, 'triangle', 0.06, null, 0.1); }
  function collected() { tone(784, 0.14, 'triangle', 0.08); tone(988, 0.14, 'triangle', 0.08, null, 0.12); tone(1319, 0.3, 'triangle', 0.08, null, 0.24); cheer(false); }
  /** two lines hook: a soft papery "khrr" of manjha catching on manjha, and the faint thump of the line going taut
   *  (v6.5 - it was a square-wave beep) */
  function pecha() {
    if (!ok()) return; const t = ctx.currentTime + 0.01;
    for (const [d, f, v] of [[0, 1100, 0.05], [0.07, 800, 0.035]]) {
      const src = ctx.createBufferSource(); src.buffer = noiseBuf; const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = 0.9;
      const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t + d); g.gain.exponentialRampToValueAtTime(v, t + d + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.16);
      src.connect(bp); bp.connect(g); g.connect(sfx); src.start(t + d, Math.random()); src.stop(t + d + 0.2);
    }
    const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(95, t + 0.12);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.06, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18); o.connect(g); g.connect(sfx); o.start(t); o.stop(t + 0.2);
  }
  function tug() { click(1.2); tone(180, 0.06, 'triangle', 0.04, 120); }   // a tunka: the line snapping taut
  function ui() { tone(880, 0.05, 'triangle', 0.04); }
  function horn() { tone(220, 0.9, 'sawtooth', 0.06); tone(330, 0.9, 'sawtooth', 0.04); cheer(true); }

  /* =====================================================================================================
   * VOICES - the shouts, with a South Asian voice
   * Uses the device's own Urdu / Hindi voice (Google हिन्दी, Microsoft Uzma/Asad/Swara, Apple Lekha...) with the
   * words written in that language's own script, so they come out with the right accent. The old code asked for the
   * voice list once, before the browser had loaded it (Chrome fills it in a moment later), found nothing and spoke
   * with the default US-English voice - that was the English accent. If the device really has no South Asian voice,
   * a small built-in shouting voice is used instead, never an English one.
   * ===================================================================================================== */
  const PH = {
    bokata:   { roman: 'Bo kaata!', ur: 'بو کاٹا!', hi: 'बो काटा!', fx: 'b oo k aa aa t a' },
    bokatahai:{ roman: 'Bo kaata hai!', ur: 'بو کاٹا ہے!', hi: 'बो काटा है!', fx: 'b oo k aa aa t a h e' },
    wokata:   { roman: 'Woh kaata!', ur: 'وہ کاٹا!', hi: 'वो काटा!', fx: 'w oo k aa aa t a' },
    katgayi:  { roman: 'Kat gayi oye!', ur: 'کٹ گئی اوئے!', hi: 'कट गई ओए!', fx: 'k a t g a ii oo y e' },
    urrgayi:  { roman: 'Urr gayi patang!', ur: 'اُڑ گئی پتنگ!', hi: 'उड़ गई पतंग!', fx: 'u r g a ii p a t a ng' },
    oyehoye:  { roman: 'Oye hoye!', ur: 'اوئے ہوئے!', hi: 'ओए होए!', fx: 'oo y e h oo y e' },
    wah:      { roman: 'Wah! Kya maara!', ur: 'واہ! کیا مارا!', hi: 'वाह! क्या मारा!', fx: 'w aa aa k y aa m aa r a' },
    pakro:    { roman: 'Pakro! Pakro!', ur: 'پکڑو! پکڑو!', hi: 'पकड़ो! पकड़ो!', fx: 'p a k r oo p a k r oo' },
    lootlo:   { roman: 'Loot lo!', ur: 'لوٹ لو!', hi: 'लूट लो!', fx: 'l uu t l oo' },
    merihai:  { roman: 'Meri hai!', ur: 'میری ہے!', hi: 'मेरी है!', fx: 'm e r ii h e' },
    aayi:     { roman: 'Aayi aayi!', ur: 'آئی آئی!', hi: 'आई आई!', fx: 'aa ii aa ii' },
    kaata:    { roman: 'Kaata!', ur: 'کاٹا!', hi: 'काटा!', fx: 'k aa aa t a' }
  };
  let sysVoices = [];
  const ss = root.speechSynthesis;
  function loadVoices() { try { sysVoices = ss ? ss.getVoices() || [] : []; } catch (e) { sysVoices = []; } }
  if (ss) { loadVoices(); try { if (ss.addEventListener) ss.addEventListener('voiceschanged', loadVoices); else ss.onvoiceschanged = loadVoices; } catch (e) {} }
  /** the best South Asian voice this device has for the chosen language, or null */
  function pickVoice() {
    if (!sysVoices.length) loadVoices();
    const order = pref.voice === 'hi' ? [/^hi/i, /^ur/i] : [/^ur/i, /^hi/i];   // v7: never en-IN - it read "Bo kaata" as English words
    for (const re of order) {
      const c = sysVoices.filter(v => re.test(v.lang || ''));
      if (!c.length) continue;
      // the natural-sounding online voices first, then whatever is installed
      c.sort((a, b) => (/natural|online|neural|google/i.test(b.name) ? 1 : 0) - (/natural|online|neural|google/i.test(a.name) ? 1 : 0));
      return c[0];
    }
    return null;
  }
  const langOf = v => /^ur/i.test(v.lang) ? 'ur' : /^hi/i.test(v.lang) ? 'hi' : 'roman';
  /* v7: the phone app speaks through Android's own text-to-speech (Google's Urdu / Hindi voices), via the small native
   * plugin the app build adds (app/scripts/patch-native.js). An Android WebView has no speechSynthesis, so before this
   * the app always fell back to the built-in synth voice - which is what players heard as "distorted". */
  const NT = { checked: false, ok: false, langs: {} };
  function nativeTts() {
    const C = root.Capacitor, P = C && C.Plugins && C.Plugins.BoKataVoice;
    if (!P || !(C.isNativePlatform ? C.isNativePlatform() : true)) return null;
    if (!NT.checked) { NT.checked = true; NT.ok = true;
      try { P.languages().then(r => { NT.langs = r || {}; NT.ok = !!(NT.langs.ur || NT.langs.hi); }).catch(() => { NT.ok = false; }); } catch (e) { NT.ok = false; } }
    return NT.ok ? P : null;
  }
  /** what voice the shouts will use, for the settings screen */
  function voiceInfo() {
    if (nativeTts() && (NT.langs.ur || NT.langs.hi)) { const l = pref.voice === 'hi' ? (NT.langs.hi ? 'hi' : 'ur') : (NT.langs.ur ? 'ur' : 'hi'); return { name: 'Phone voice (' + (l === 'ur' ? 'Urdu' : 'Hindi') + ')', lang: l, builtIn: false }; }
    const v = pickVoice(); return v ? { name: v.name, lang: v.lang, builtIn: false } : { name: 'Built-in rooftop voice', lang: pref.voice, builtIn: true };
  }
  let speaking = -9;
  /** say one of the PH phrases: vol 0..1, pitch ~0.5..2, rate ~0.8..1.4. far: a shout from another roof (quiet, built-in) */
  function say(key, vol = 1, pitch = 1, rate = 1, far = false) {
    if (!ok() || pref.voice === 'off') return false;
    const p = PH[key] || PH.bokata;
    // other roofs and the street kids: always the small built-in voice, quiet and far off. (They went through the
    // phone's speech engine with chipmunk pitches, queued up behind each other and cut off your own shout.)
    if (far) return fxSay(p.fx, vol, pitch, rate, true);
    const now = ctx.currentTime; if (now - speaking < 0.9) return false; speaking = now;   // one shout at a time
    const nt = nativeTts();
    if (nt) {
      const l = pref.voice === 'hi' ? (NT.langs.hi ? 'hi' : 'ur') : (NT.langs.ur ? 'ur' : 'hi');
      // natural speed and pitch: changing them makes a recorded voice sound processed
      try { nt.speak({ text: p[l], lang: l === 'ur' ? 'ur-PK' : 'hi-IN', rate: 1.0, pitch: 1.0, volume: Math.min(1, vol) }).catch(() => { NT.ok = false; fxSay(p.fx, vol, pitch, rate, false); }); return true; } catch (e) { NT.ok = false; }
    }
    const v = pickVoice();
    if (v && ss && root.SpeechSynthesisUtterance) {
      try {
        const u = new root.SpeechSynthesisUtterance(p[langOf(v)]);
        u.voice = v; u.lang = v.lang; u.volume = Math.min(1, vol); u.pitch = 1; u.rate = 1;
        if (ss.speaking || ss.pending) ss.cancel();
        ss.speak(u); return true;
      } catch (e) {}
    }
    return fxSay(p.fx, vol, pitch, rate, false);
  }

  /* ---- the built-in voice (v7, rebuilt): one shouting voice made the way a throat makes it. A glottal pulse (falling
   * harmonics, a little jitter) goes through the three vowel resonances IN SERIES - like the throat, mouth and lips -
   * instead of three separate band-pass filters added together. Stops are a short silence and a soft burst, h is breath.
   * v6 used two such voices 3.5 semitones apart, plus narrow filters at triple gain: the two voices beat against each
   * other and the result sounded buzzy and distorted. Now: one voice, gentle resonances, a limiter at the end. ---- */
  const VOW = { a: [700, 1220, 2600, 0.1], aa: [780, 1180, 2550, 0.12], e: [480, 1900, 2600, 0.11], ii: [320, 2250, 2950, 0.12], oo: [470, 860, 2550, 0.13], u: [380, 900, 2400, 0.08], uu: [340, 800, 2350, 0.12] };
  const CON = {   // [type, duration, F1, F2, F3, burst/noise centre, voiced]
    b: ['stop', 0.05, 300, 900, 2300, 900, 1], p: ['stop', 0.07, 300, 900, 2300, 1000, 0], t: ['stop', 0.06, 350, 1700, 2500, 3200, 0], d: ['stop', 0.05, 350, 1700, 2500, 3000, 1],
    k: ['stop', 0.07, 300, 1900, 2400, 1900, 0], g: ['stop', 0.05, 300, 1900, 2400, 1800, 1], h: ['breath', 0.07], r: ['flap', 0.035, 450, 1350, 1800], l: ['glide', 0.06, 380, 1100, 2700],
    m: ['nasal', 0.07, 280, 1000, 2300], n: ['nasal', 0.06, 280, 1600, 2500], ng: ['nasal', 0.09, 280, 1900, 2400], w: ['glide', 0.05, 340, 750, 2300], y: ['glide', 0.05, 300, 2200, 2900]
  };
  let glottal = null, voiceOut = null;
  function voiceBus() {   // a soft limiter just for voices, so a shout on top of the cheer never clips
    if (voiceOut) return voiceOut;
    const c = ctx.createDynamicsCompressor(); c.threshold.value = -14; c.knee.value = 8; c.ratio.value = 8; c.attack.value = 0.003; c.release.value = 0.15;
    const g = ctx.createGain(); g.gain.value = 1; c.connect(g); g.connect(sfx);
    return (voiceOut = c);
  }
  function fxSay(seq, vol = 1, pitch = 1, rate = 1, far = false) {
    if (!ok()) return false;
    if (!glottal) { const n = 48, re = new Float32Array(n), im = new Float32Array(n); for (let h = 1; h < n; h++) im[h] = Math.pow(h, -1.55); glottal = ctx.createPeriodicWave(re, im); }
    const ph = seq.split(' ').filter(Boolean), t0 = ctx.currentTime + 0.03, sp = 1 / Math.max(0.6, rate);
    // output: level, a high-pass (no rumble), a low-pass (far roofs are muffled), the limiter
    const out = ctx.createGain(); out.gain.value = (far ? 0.045 : 0.085) * vol;
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 170; hp.Q.value = 0.5;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = far ? 1900 : 4600; lp.Q.value = 0.5;
    out.connect(hp); hp.connect(lp);
    let dest = lp;
    if (far && ctx.createStereoPanner) { const pn = ctx.createStereoPanner(); pn.pan.value = Math.random() * 1.6 - 0.8; lp.connect(pn); dest = pn; }
    dest.connect(voiceBus());
    const f0 = (far ? 165 : 182) * pitch;
    const o = ctx.createOscillator(); o.setPeriodicWave(glottal);
    // natural wobble: a slow vibrato plus a faster small jitter
    const vib = ctx.createOscillator(), vg = ctx.createGain(); vib.frequency.value = 5.2; vg.gain.value = f0 * 0.01; vib.connect(vg); vg.connect(o.frequency);
    const jit = ctx.createOscillator(), jg = ctx.createGain(); jit.type = 'triangle'; jit.frequency.value = 13.7; jg.gain.value = f0 * 0.004; jit.connect(jg); jg.connect(o.frequency);
    const vgain = ctx.createGain(); vgain.gain.value = 0; o.connect(vgain);
    const nz = ctx.createBufferSource(); nz.buffer = noiseBuf; nz.loop = true; const ngain = ctx.createGain(); ngain.gain.value = 0; nz.connect(ngain);
    // the vocal tract: three resonances in series
    const F = [0, 1, 2].map(i => { const f = ctx.createBiquadFilter(); f.type = 'peaking'; f.frequency.value = [700, 1200, 2600][i]; f.gain.value = [14, 13, 10][i]; f.Q.value = [6, 8, 9][i]; return f; });
    const tilt = ctx.createBiquadFilter(); tilt.type = 'lowpass'; tilt.frequency.value = 3200; tilt.Q.value = 0.4;
    vgain.connect(tilt); ngain.connect(tilt); tilt.connect(F[0]); F[0].connect(F[1]); F[1].connect(F[2]); F[2].connect(out);
    const burst = ctx.createBiquadFilter(); burst.type = 'bandpass'; burst.Q.value = 1.2; const bg = ctx.createGain(); bg.gain.value = 0; nz.connect(burst); burst.connect(bg); bg.connect(out);
    let t = t0;
    const cur = [700, 1200, 2600];   // where each formant is heading (the param's .value doesn't follow scheduled ramps)
    const setF = (fs, at, glide) => fs.forEach((fq, i) => { F[i].frequency.setValueAtTime(cur[i], at); F[i].frequency.linearRampToValueAtTime(fq, at + glide); cur[i] = fq; });
    const n = ph.length;
    for (let i = 0; i < n; i++) {
      const p = ph[i], last = i === n - 1;
      if (VOW[p]) {
        // stressed (doubled) vowels are long and high, the last one falls: the shape of a shout
        const doubled = ph[i + 1] === p; if (doubled) i++;
        const v = VOW[p], d = (doubled ? v[3] * 2.5 : v[3]) * sp * (last ? 1.5 : 1);
        setF(v.slice(0, 3), t, 0.045);
        o.frequency.setValueAtTime(f0 * (doubled ? 1.18 : 1.04), t); o.frequency.linearRampToValueAtTime(f0 * (last ? 0.8 : doubled ? 1.12 : 1.0), t + d);
        vgain.gain.setTargetAtTime(doubled ? 1 : 0.82, t, 0.015); ngain.gain.setTargetAtTime(0.025, t, 0.02);   // a breath of air in every vowel
        t += d;
        if (last) { vgain.gain.setTargetAtTime(0, t - 0.07, 0.045); ngain.gain.setTargetAtTime(0, t - 0.07, 0.045); }
        continue;
      }
      const c = CON[p]; if (!c) continue;
      const d = c[1] * sp;
      if (c[0] === 'stop') {
        vgain.gain.setTargetAtTime(c[6] ? 0.08 : 0, t, 0.01); ngain.gain.setTargetAtTime(0, t, 0.01);
        setF([c[2], c[3], c[4]], t, d * 0.8);
        burst.frequency.setValueAtTime(c[5], t + d); bg.gain.setValueAtTime(0, t + d); bg.gain.linearRampToValueAtTime(c[6] ? 0.08 : 0.16, t + d + 0.005); bg.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.03);
        if (!c[6]) { ngain.gain.setValueAtTime(0, t + d + 0.012); ngain.gain.linearRampToValueAtTime(0.09, t + d + 0.022); ngain.gain.linearRampToValueAtTime(0.02, t + d + 0.05); }
        t += d + 0.012;
      } else if (c[0] === 'breath') {
        vgain.gain.setTargetAtTime(0.04, t, 0.012); ngain.gain.setTargetAtTime(0.18, t, 0.012); t += d;
      } else {   // nasal / glide / flap: voiced, formants move, a little quieter
        vgain.gain.setTargetAtTime(c[0] === 'nasal' ? 0.4 : c[0] === 'flap' ? 0.45 : 0.65, t, 0.012); ngain.gain.setTargetAtTime(0.012, t, 0.01);
        setF([c[2], c[3], c[4]], t, d * 0.6); t += d;
      }
    }
    const end = t + 0.15;
    [o, vib, jit, nz].forEach(x => { x.start(t0); x.stop(end); });
    vgain.gain.setTargetAtTime(0, end - 0.1, 0.03);
    return true;
  }

  /** your cut: the roof erupts - "Bo kaata!" */
  function shout(kind = 'win') {
    if (!ok()) return;
    cheer(true);
    if (kind === 'lost') say(['katgayi', 'bokata', 'oyehoye'][Math.floor(Math.random() * 3)], 0.9);
    else if (kind === 'snap') say('urrgayi', 0.9);
    else say(['bokata', 'bokata', 'bokatahai', 'wokata', 'wah'][Math.floor(Math.random() * 5)], 1);
  }
  /* ---------------- far-away voices: other rooftops shouting across the festival ---------------- */
  const FAR = ['bokata', 'bokatahai', 'kaata', 'wokata', 'bokata', 'oyehoye', 'urrgayi'];
  let farGap = 8, lastVoice = -9;
  function far(force) {
    if (!ok()) return;
    const now = ctx.currentTime; if (!force && now - lastVoice < 4) return; lastVoice = now;
    say(FAR[Math.floor(Math.random() * FAR.length)], 0.35 + Math.random() * 0.25, 0.88 + Math.random() * 0.24, 0.95 + Math.random() * 0.15, true);
    crowd.g.gain.setTargetAtTime(0.08, now, 0.2); crowd.g.gain.setTargetAtTime(0.03, now + 0.8, 0.8);
  }
  /** street kids shouting as they chase a cut kite */
  function kids() { if (!ok()) return; const K = ['pakro', 'lootlo', 'merihai', 'aayi', 'pakro']; say(K[Math.floor(Math.random() * K.length)], 0.4, 1.3 + Math.random() * 0.15, 1.12, true); }
  function farTick(dt, running) { if (!running) return; farGap -= dt; if (farGap <= 0) { farGap = 10 + Math.random() * 18; far(); } }

  /* =====================================================================================================
   * MUSIC - Basant tracks played live
   * Our own compositions in the styles you hear on Basant rooftops (film songs are copyrighted, so the game can't ship
   * them - but players can add their own song files, see "your songs" below). Every track is scheduled a little ahead
   * on the audio clock so it stays in time even when a frame is slow, and plays through its own bus (music volume) with
   * a little room reverb.
   * ===================================================================================================== */
  let mRev = null;
  function musicRev() {
    if (mRev) return mRev;
    const len = Math.floor(ctx.sampleRate * 2.2), ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2); }
    const cv = ctx.createConvolver(); cv.buffer = ir; const wet = ctx.createGain(); wet.gain.value = 0.32; cv.connect(wet); wet.connect(musicBus);
    const send = ctx.createGain(); send.gain.value = 1; send.connect(cv);
    return (mRev = send);
  }
  /** a music voice's output: dry into the music bus + a send to the reverb */
  const outs = new Map();
  function mOut(t, wetAmt = 0.4) {   // shared per reverb amount, so a busy track doesn't build thousands of mixer nodes
    const key = Math.round(wetAmt * 20); if (outs.has(key)) return outs.get(key);
    const g = ctx.createGain(); g.connect(musicBus); if (wetAmt > 0) { const s = ctx.createGain(); s.gain.value = wetAmt; g.connect(s); s.connect(musicRev()); }
    outs.set(key, g); return g;
  }
  // sargam -> semitones: S r R g G M m P d D n N, ' = octave up, , = octave down. "-" is a rest. Number = length in steps.
  const SARGAM = { S: 0, r: 1, R: 2, g: 3, G: 4, M: 5, m: 6, P: 7, d: 8, D: 9, n: 10, N: 11 };
  function mel(str) {
    const ev = []; let pos = 0;
    for (const tok of str.split(/[\s|]+/).filter(Boolean)) {
      const m = /^([-SrRgGMmPdDnN])([',]*)(\d+)$/.exec(tok); if (!m) continue;
      const len = +m[3];
      if (m[1] !== '-') { let s = SARGAM[m[1]]; for (const c of m[2]) s += c === "'" ? 12 : -12; ev.push({ at: pos, semi: s, len }); }
      pos += len;
    }
    return { ev, len: pos, at: (step) => ev.find(e => e.at === step) };
  }
  const hzOf = (base, semi) => base * Math.pow(2, semi / 12);
  const pat = s => s.split('').map(c => c === 'X' ? 1 : c === 'x' ? 0.6 : c === 'o' ? 0.35 : 0);

  /* ---------- instruments ---------- */
  function dagga(t, v, dest) {   // the dhol's big bass head
    if (!dest) { v *= DM * 0.8; if (v < 0.02) return; }   // music: follows the section (the rooftop party has its own bus)
    dest = dest || mOut(t, 0.25);
    const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(118, t); o.frequency.exponentialRampToValueAtTime(52, t + 0.2);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.42 * v, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.42); o.connect(g); g.connect(dest); o.start(t); o.stop(t + 0.45);
    const n = ctx.createBufferSource(); n.buffer = noiseBuf; const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 420; const ng = ctx.createGain();
    ng.gain.setValueAtTime(0.22 * v, t); ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.06); n.connect(f); f.connect(ng); ng.connect(dest); n.start(t, Math.random()); n.stop(t + 0.08);
  }
  function tilli(t, v, dest) {   // the thin stick on the treble head: a sharp, dry crack
    if (!dest) { v *= DM * 0.7; if (v < 0.02) return; }
    dest = dest || mOut(t, 0.25);
    const src = ctx.createBufferSource(); src.buffer = noiseBuf; const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 3000; f.Q.value = 2.2;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.2 * v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.055); src.connect(f); f.connect(g); g.connect(dest); src.start(t, Math.random()); src.stop(t + 0.07);
    const o = ctx.createOscillator(), g2 = ctx.createGain(); o.type = 'triangle'; o.frequency.setValueAtTime(680, t); o.frequency.exponentialRampToValueAtTime(560, t + 0.05);
    g2.gain.setValueAtTime(0.07 * v, t); g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.06); o.connect(g2); g2.connect(dest); o.start(t); o.stop(t + 0.07);
  }
  function chimta(t, v) {   // Punjabi fire-tongs with jingles: a bright metallic shimmer
    v *= DM * 0.55; if (v < 0.02) return;   // it was the most piercing sound in the game
    const dest = mOut(t, 0.35);
    const src = ctx.createBufferSource(); src.buffer = noiseBuf; const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 6500;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.07 * v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14); src.connect(f); f.connect(g); g.connect(dest); src.start(t, Math.random()); src.stop(t + 0.16);
    for (const fq of [3150, 4720, 6230]) { const o = ctx.createOscillator(), og = ctx.createGain(); o.type = 'sine'; o.frequency.value = fq * (0.99 + Math.random() * 0.02);
      og.gain.setValueAtTime(0.012 * v, t); og.gain.exponentialRampToValueAtTime(0.0001, t + 0.18); o.connect(og); og.connect(dest); o.start(t); o.stop(t + 0.2); }
  }
  function clap(t, v) {   // hand claps: three tiny slaps a few ms apart
    v *= DM * 0.8; if (v < 0.02) return;
    const dest = mOut(t, 0.45);
    for (let i = 0; i < 3; i++) { const tt = t + i * 0.009 + Math.random() * 0.004, src = ctx.createBufferSource(); src.buffer = noiseBuf;
      const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1150 + Math.random() * 300; f.Q.value = 1.3; const g = ctx.createGain();
      g.gain.setValueAtTime((i === 2 ? 0.22 : 0.12) * v, tt); g.gain.exponentialRampToValueAtTime(0.0001, tt + (i === 2 ? 0.09 : 0.02)); src.connect(f); f.connect(g); g.connect(dest); src.start(tt, Math.random()); src.stop(tt + 0.1); }
  }
  function stick(t, v) {   // dandiya sticks / a wood block
    v *= DM * 0.8; if (v < 0.02) return;
    const dest = mOut(t, 0.3);
    for (const [fq, a] of [[1750, 1], [2650, 0.5]]) { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.value = fq;
      g.gain.setValueAtTime(0.08 * v * a, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.045); o.connect(g); g.connect(dest); o.start(t); o.stop(t + 0.05); }
  }
  // tabla: dayan (treble, tuned) and bayan (bass, with the wrist bend that makes the "ge" swoop)
  function tabla(t, bol, v = 1) {
    v *= Math.max(0.35, DM) * 0.85;   // the tabla carries the qawwali: it thins out but never stops
    const dest = mOut(t, 0.3), SA = 233.1 * 2;
    const dayan = (dec, a) => { for (const [h, ha] of [[1, 1], [2, 0.55], [3, 0.3], [4.2, 0.12]]) { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.value = SA * h;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.06 * a * ha * v, t + 0.003); g.gain.exponentialRampToValueAtTime(0.0001, t + dec / h); o.connect(g); g.connect(dest); o.start(t); o.stop(t + dec + 0.05); } };
    const bayan = (open, a) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(open ? 88 : 110, t); if (open) o.frequency.linearRampToValueAtTime(128, t + 0.25);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.3 * a * v, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + (open ? 0.5 : 0.07)); o.connect(g); g.connect(dest); o.start(t); o.stop(t + 0.55); };
    const tap = a => { const s = ctx.createBufferSource(); s.buffer = noiseBuf; const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 2400; f.Q.value = 1; const g = ctx.createGain();
      g.gain.setValueAtTime(0.09 * a * v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.03); s.connect(f); f.connect(g); g.connect(dest); s.start(t, Math.random()); s.stop(t + 0.04); };
    switch (bol) {
      case 'dha': dayan(0.6, 1); bayan(true, 1); break;
      case 'dhi': dayan(0.35, 0.8); bayan(true, 0.9); break;
      case 'na': dayan(0.6, 1); break;
      case 'tin': dayan(0.3, 0.75); break;
      case 'ge': bayan(true, 1); break;
      case 'ke': bayan(false, 0.8); break;
      case 'ti': tap(1); dayan(0.08, 0.3); break;
    }
  }
  // Karplus-Strong plucked string (tumbi, rubab): cached per pitch
  const ksCache = new Map();
  function ksBuf(f, decay, bright) {
    const key = f.toFixed(1) + decay + bright; if (ksCache.has(key)) return ksCache.get(key);
    const sr = ctx.sampleRate, N = Math.max(2, Math.round(sr / f)), n = Math.floor(sr * 1.4), b = ctx.createBuffer(1, n, sr), d = b.getChannelData(0), buf = new Float32Array(N);
    let prev = 0; for (let i = 0; i < N; i++) { prev = bright * (Math.random() * 2 - 1) + (1 - bright) * prev; buf[i] = prev; }
    let idx = 0, pk = 0;
    for (let i = 0; i < n; i++) { const cur = buf[idx], nx = buf[(idx + 1) % N]; d[i] = cur; buf[idx] = decay * 0.5 * (cur + nx); idx = (idx + 1) % N; pk = Math.max(pk, Math.abs(cur)); }
    for (let i = 0; i < n; i++) d[i] /= pk || 1;
    ksCache.set(key, b); return b;
  }
  function pluck(t, f, dur, v = 1, kind = 'tumbi') {
    const dest = mOut(t, 0.35), src = ctx.createBufferSource(); src.buffer = ksBuf(f, kind === 'tumbi' ? 0.9965 : 0.998, kind === 'tumbi' ? 0.75 : 0.55);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.075 * v, t + 0.003); g.gain.setTargetAtTime(0, t + Math.max(0.08, dur), 0.08);
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 180; const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 4200;
    src.connect(hp); hp.connect(lp); lp.connect(g); g.connect(dest); src.start(t); src.stop(t + Math.min(1.4, dur + 0.5));
  }
  /** reed and wind melody voices. kind: 'shehnai' (nasal double reed), 'algoza' (twin folk flutes), 'harmonium' */
  function reed(t, f, dur, kind, from, v = 1) {
    const dest = mOut(t, kind === 'harmonium' ? 0.35 : 0.45), g = ctx.createGain(), end = t + dur;
    const vib = ctx.createOscillator(), vg = ctx.createGain(); vib.frequency.value = kind === 'shehnai' ? 6.2 : 5; vg.gain.setValueAtTime(0, t); vg.gain.linearRampToValueAtTime(f * (kind === 'harmonium' ? 0.002 : 0.011), t + Math.min(0.5, dur * 0.6)); vib.connect(vg);
    const oscs = [];
    const add = (type, mult, det, amp) => { const o = ctx.createOscillator(), og = ctx.createGain(); o.type = type; o.detune.value = det;
      if (from) { o.frequency.setValueAtTime(from * mult, t); o.frequency.exponentialRampToValueAtTime(f * mult, t + Math.min(0.12, dur * 0.35)); } else o.frequency.setValueAtTime(f * mult, t);
      vg.connect(o.frequency); og.gain.value = amp; o.connect(og); oscs.push([o, og]); return og; };
    let chain;
    if (kind === 'shehnai') {
      const pre = ctx.createGain(); add('sawtooth', 1, 0, 0.6).connect(pre); add('square', 1, 4, 0.25).connect(pre);
      const f1 = ctx.createBiquadFilter(); f1.type = 'peaking'; f1.frequency.value = 1150; f1.Q.value = 1.8; f1.gain.value = 4;
      const f2 = ctx.createBiquadFilter(); f2.type = 'peaking'; f2.frequency.value = 2700; f2.Q.value = 2; f2.gain.value = 2;
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2900; const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 400;
      pre.connect(hp); hp.connect(f1); f1.connect(f2); f2.connect(lp); chain = lp;
    } else if (kind === 'algoza') {
      const pre = ctx.createGain(); add('triangle', 1, -6, 0.7).connect(pre); add('triangle', 1, 7, 0.55).connect(pre); add('sine', 2, 0, 0.12).connect(pre);
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2600; pre.connect(lp); chain = lp;
      const n = ctx.createBufferSource(); n.buffer = noiseBuf; const nf = ctx.createBiquadFilter(); nf.type = 'bandpass'; nf.frequency.value = f * 2; nf.Q.value = 1.5; const ng = ctx.createGain(); ng.gain.value = 0.05;
      n.connect(nf); nf.connect(ng); ng.connect(g); n.start(t, Math.random()); n.stop(end + 0.2);
    } else {   // harmonium: three slightly detuned reeds and a soft lower octave, through the wooden box
      const pre = ctx.createGain(); add('sawtooth', 1, -7, 0.35).connect(pre); add('sawtooth', 1, 6, 0.35).connect(pre); add('square', 0.5, 0, 0.18).connect(pre);
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1900; lp.Q.value = 0.7; pre.connect(lp); chain = lp;
    }
    const atk = kind === 'harmonium' ? 0.07 : kind === 'shehnai' ? 0.05 : 0.06, pk = (kind === 'shehnai' ? 0.065 : kind === 'algoza' ? 0.1 : 0.11) * v;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(pk, t + atk); g.gain.setValueAtTime(pk * 0.92, t + Math.max(atk, dur - 0.05)); g.gain.exponentialRampToValueAtTime(0.0001, end + (kind === 'harmonium' ? 0.12 : 0.08));
    chain.connect(g); g.connect(dest);
    vib.start(t); vib.stop(end + 0.2); for (const [o] of oscs) { o.start(t); o.stop(end + 0.2); }
  }
  function drone(t, base, dur, v = 1, kind = 'harmonium') {   // a held Sa + Pa underneath
    reed(t, base, dur, kind, 0, 0.4 * v); reed(t, base * 1.5, dur, kind, 0, 0.25 * v);
  }

  /* ---------- the tracks ----------
   * spb = steps per bar, sd() = seconds per step, play(step, t, sd) schedules one step. */
  const BH = { S: 277.18 };   // C# - a bright, high Punjabi pitch
  const bhTumbi = [mel("S'2 S'2 R'2 G'2 R'2 S'2 n2 S'2 | G'2 G'2 M'2 G'2 R'2 S'2 R'2 -2"), mel("P2 P2 n2 P2 M2 G2 R2 G2 | S'2 n2 P2 M2 G2 R2 S2 -2")];
  const bhMel = [mel("G4 M2 P2 P4 D2 P2 | M2 G2 R2 G2 S8 | G4 M2 P2 n4 D2 P2 | M2 G2 R2 n,2 S8"),
                 mel("P4 P2 D2 n4 S'4 | n2 D2 P2 M2 G8 | M4 G2 R2 G4 M4 | G2 R2 n,2 R2 S8")];
  const bhDagga = pat('X..x..X...X.x..o'), bhTilli = pat('..x.xX.x.x..x.xx'), bhChimta = pat('X.x.X.x.X.x.X.x.');
  const TRACKS = {
    bhangra: {
      name: 'Basant Bhangra · Lahore', note: 'Dhol, chimta, tumbi and algoza', spb: 16, sd: () => 60 / 100 / 4, swing: 0.3,
      play(step, t) {
        const bar = Math.floor(step / 16), i = step % 16, cyc = bar % 16, fill = (cyc === 7 || cyc === 15) && i >= 8;
        if (fill) { if (i % 2 === 0) dagga(t, 0.7); tilli(t, 0.5 + 0.5 * (i / 16)); }
        else { if (bhDagga[i]) dagga(t, bhDagga[i] * (i === 0 ? 1 : 0.85)); if (bhTilli[i]) tilli(t, bhTilli[i] * (0.7 + 0.3 * Math.random())); }
        if (cyc >= 1 && bhChimta[i]) chimta(t, bhChimta[i] * (i % 4 ? 0.6 : 1));
        if (cyc >= 2) { const r = bhTumbi[Math.floor(bar / 2) % 4 === 3 ? 1 : 0], e = r.at((bar % 2) * 16 + i); if (e) pluck(t, hzOf(BH.S, e.semi), e.len * 0.15, cyc >= 8 ? 0.6 : 1); }
        if (cyc >= 8) { const m = bhMel[cyc >= 12 ? 1 : 0], e = m.at((cyc % 4) * 16 + i); if (e) { reed(t, hzOf(BH.S * 2, e.semi), e.len * 0.15 * 0.95, 'algoza', this.last, 0.9); this.last = hzOf(BH.S * 2, e.semi); } }
      }
    },
    garba: {
      name: 'Uttarayan Garba · Gujarat', note: 'Dhol, dandiya sticks, shehnai and harmonium', spb: 6, sd: () => 0.2, swing: 0,
      mels: [mel("S3 R3 | g3 M3 | P6 | g3 R3 | S2 R2 g2 | M6 | g3 R3 | S6"), mel("P3 D3 | n3 D3 | P6 | M3 g3 | M2 P2 D2 | P6 | g3 R3 | S6"),
             mel("S'3 n3 | D3 P3 | D3 n3 | S'6 | n2 D2 P2 | M3 g3 | R3 n,3 | S6")],
      play(step, t) {
        const bar = Math.floor(step / 6), i = step % 6, cyc = bar % 32;
        if (i === 0) dagga(t, 1); if (i === 3) dagga(t, 0.75); if (i === 2 || i === 5) tilli(t, 0.8); if (i === 4 && bar % 2) tilli(t, 0.45);
        if (cyc >= 2 && (i === 1 || i === 2 || i === 4 || i === 5)) stick(t, i === 2 || i === 5 ? 1 : 0.55);
        if (i === 0 && bar % 4 === 0) drone(t, 261.63 / 2, 4 * 6 * 0.2, 0.9);
        if (cyc >= 4) { const m = this.mels[Math.floor((cyc - 4) / 8) % 3], e = m.at(((cyc - 4) % 8) * 6 + i); if (e) { const f = hzOf(261.63 * 2, e.semi); reed(t, f, e.len * 0.2 * 0.97, 'shehnai', this.last, 0.85); this.last = f; } }
      }
    },
    qawwali: {
      name: 'Sufi Qawwali Night', note: 'Tabla, taali claps and harmonium', spb: 8, sd: () => 0.29, swing: 0.08,
      theka: ['dha', 'ge', 'na', 'ti', 'na', 'ke', 'dhi', 'na'],
      mels: [mel("S2 r2 g2 M2 | P4 M2 g2 | r2 g2 M2 g2 | r2 S6"), mel("P2 d2 P2 M2 | g4 M2 P2 | d2 n2 S'2 n2 | d2 P6"),
             mel("S'4 n2 d2 | P4 d2 P2 | M2 g2 r2 g2 | M2 g2 r2 S2")],
      play(step, t) {
        const bar = Math.floor(step / 8), i = step % 8, cyc = bar % 24;
        tabla(t, this.theka[i], i === 0 ? 1 : 0.8); if (cyc >= 16 && i % 2 === 1) tabla(t + 0.29 / 2, 'ti', 0.5);
        if (cyc >= 2 && (cyc >= 10 ? i % 2 === 0 : (i === 2 || i === 6))) clap(t, cyc >= 10 && i % 4 === 0 ? 1 : 0.75);
        if (i === 0 && bar % 2 === 0) drone(t, 233.08, 2 * 8 * 0.29, 0.7);
        if (cyc >= 4) { const m = this.mels[Math.floor((cyc - 4) / 4) % 3], e = m.at(((cyc - 4) % 4) * 8 + i); if (e) { const f = hzOf(233.08 * 2, e.semi); reed(t, f, e.len * 0.29 * 0.96, 'harmonium', 0, 1); } }
      }
    },
    dhol: {
      name: 'Rooftop Dhol', note: 'Just the dhol - a rooftop party chaal', spb: 16, sd: () => 60 / 148 / 2, swing: 0.12,
      D: pat('X..x..X.X..x..X.'), T: pat('..x.xx.x..x.xx.x'),
      tune: [[6, 0, 5, 6, 8, 0, 6, 0, 5, 4, 5, 0, 6, 0, 0, 0], [8, 0, 9, 8, 6, 0, 5, 6, 8, 0, 6, 5, 4, 0, 0, 0], [4, 5, 6, 0, 6, 5, 4, 0, 3, 4, 5, 0, 4, 3, 1, 0], [3, 4, 5, 6, 8, 0, 6, 5, 6, 0, 5, 4, 6, 0, 0, 0]],
      SC: [0, 261.6, 293.7, 329.6, 392.0, 440.0, 523.3, 587.3, 659.3, 784.0],
      play(step, t, sd) {
        const i = step % 16, ph = Math.floor(step / 16) % 4;
        if (this.D[i]) dagga(t, i % 8 === 0 ? 1 : 0.75); if (this.T[i]) tilli(t, 0.6 + 0.4 * Math.random());
        if (step % 128 >= 32) { const deg = this.tune[ph][i]; if (deg) { let len = 1; while (i + len < 16 && !this.tune[ph][i + len]) len++; reed(t, this.SC[deg], Math.min(len, 3) * sd * 0.95, 'algoza', 0, 0.7); } }
      }
    },
    bansuri: { name: 'Evening Bansuri', note: 'Calm flute over a tanpura', calm: true }
  };
  // the mix starts calm and leaves out the dhol-only loop (players found an endless dhol tiring); it can still be picked
  const MIX = ['bansuri', 'qawwali', 'garba', 'bhangra'];
  const TRACK_LIST = [{ id: 'mix', name: 'Basant Mix', note: 'All the tracks, one after another' }].concat(Object.keys(TRACKS).map(id => ({ id, name: TRACKS[id].name, note: TRACKS[id].note })));
  const M = { next: 0, step: 0, cur: null, since: 0 };
  function activeTrack() { return pref.track === 'mix' ? M.mixId || (M.mixId = MIX[0]) : pref.track; }

  /* ---- Evening Bansuri: a slow raga on bansuri over a tanpura, generated live so it never loops ---- */
  let sNext = 0, sString = 0, flNext = 0, flLast = 0, flPhrase = 0, shimmerT = 0, flDeg = 5, flLeft = 0;
  const SA = 146.8, BHUP = [0, 2, 4, 7, 9];
  const hzB = (deg, oct = 0) => SA * Math.pow(2, (BHUP[((deg % 5) + 5) % 5] + 12 * (Math.floor(deg / 5) + oct)) / 12);
  function tanpura(t, f, v) {
    const dest = mOut(t, 0.7), g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.055 * v, t + 0.08); g.gain.exponentialRampToValueAtTime(0.0001, t + 5.5); g.connect(dest);
    [[1, 1], [2, 0.5], [3, 0.32], [4, 0.2], [5, 0.12]].forEach(([h, a], i) => {
      const o = ctx.createOscillator(), og = ctx.createGain(); o.type = 'sine'; o.frequency.value = f * h * (1 + (i ? 0.0015 * i : 0));
      og.gain.setValueAtTime(a * (i ? 0.3 : 1), t); og.gain.linearRampToValueAtTime(a, t + 0.6 + i * 0.25); og.gain.exponentialRampToValueAtTime(a * 0.05, t + 5.2);
      o.connect(og); og.connect(g); o.start(t); o.stop(t + 5.6);
    });
  }
  function bansuri(t, f, dur, from) {
    const dest = mOut(t, 0.75), o = ctx.createOscillator(), o2 = ctx.createOscillator(), g2 = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain(), g = ctx.createGain(), lp = ctx.createBiquadFilter();
    o.type = 'sine'; o2.type = 'sine'; g2.gain.value = 0.12;
    if (from) { o.frequency.setValueAtTime(from, t); o.frequency.exponentialRampToValueAtTime(f, t + Math.min(0.35, dur * 0.3)); } else o.frequency.setValueAtTime(f, t);
    o2.frequency.value = f * 2;
    lfo.frequency.value = 4.6; lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(f * 0.008, t + Math.min(1.2, dur * 0.6)); lfo.connect(lg); lg.connect(o.frequency);
    lp.type = 'lowpass'; lp.frequency.value = 2200;
    const pk = 0.065;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(pk, t + 0.18); g.gain.setValueAtTime(pk * 0.9, t + dur * 0.75); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.25);
    o.connect(lp); o2.connect(g2); g2.connect(lp); lp.connect(g); g.connect(dest);
    const n = ctx.createBufferSource(); n.buffer = noiseBuf; const nf = ctx.createBiquadFilter(); nf.type = 'bandpass'; nf.frequency.value = f * 2; nf.Q.value = 1.2;
    const ng = ctx.createGain(); ng.gain.setValueAtTime(0.0001, t); ng.gain.exponentialRampToValueAtTime(0.012, t + 0.1); ng.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.2);
    n.connect(nf); nf.connect(ng); ng.connect(dest);
    const end = t + dur + 0.3; [o, o2, lfo].forEach(x => { x.start(t); x.stop(end); }); n.start(t, Math.random()); n.stop(end);
  }
  function shimmer(t) {
    const dest = mOut(t, 0.8);
    for (let i = 0; i < 7; i++) { const tt = t + i * 0.07, f = hzB(i, 2), o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'triangle'; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, tt); g.gain.exponentialRampToValueAtTime(0.014, tt + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, tt + 2.2); o.connect(g); g.connect(dest); o.start(tt); o.stop(tt + 2.3); }
  }
  function bansuriTick() {
    const now = ctx.currentTime;
    if (sNext < now) sNext = now + 0.1;
    while (sNext < now + 0.4) { const f = [SA * 1.5, SA * 2, SA * 2, SA][sString % 4]; tanpura(sNext, f, sString % 4 === 3 ? 1.1 : 0.85); sString++; sNext += 1.1; }
    if (flNext < now) flNext = now + 2;
    while (flNext < now + 0.4) {
      if (flLeft <= 0) {
        flLeft = 3 + Math.floor(Math.random() * 4); flPhrase++;
        flNext += 2.2 + Math.random() * 2.5; flLast = 0; flDeg = [5, 3, 7, 4][flPhrase % 4];
        if (now > shimmerT) { shimmer(flNext - 0.8); shimmerT = now + 20 + Math.random() * 20; }
        continue;
      }
      const step = [-2, -1, -1, 1, 1, 2][Math.floor(Math.random() * 6)];
      flDeg = Math.max(2, Math.min(10, flDeg + step + (flDeg > 8 ? -1 : flDeg < 4 ? 1 : 0)));
      if (flLeft === 1) flDeg = Math.random() < 0.6 ? 5 : 3;
      const dur = flLeft === 1 ? 2.6 + Math.random() * 1.2 : [0.55, 0.8, 1.1, 1.6][Math.floor(Math.random() * 4)];
      const f = hzB(flDeg, 1); bansuri(flNext, f, dur, flLast && Math.random() < 0.55 ? flLast : 0);
      flLast = f; flNext += dur * 0.98; flLeft--;
    }
  }

  function musicTick() {
    if (!ok() || !pref.music || pref.track === 'mine') return;
    const id = activeTrack(), tr = TRACKS[id]; if (!tr) return;
    const now = ctx.currentTime;
    if (M.cur !== id) { M.cur = id; M.step = 0; M.next = now + 0.25; M.since = now; tr.last = 0; sNext = flNext = 0; fadeIn(1.5); }
    // the mix moves on every ~2.5 minutes, at the end of a phrase, fading out and in (it used to cut straight across)
    if (M.fadeAt) { if (now >= M.fadeAt) { M.fadeAt = 0; M.mixId = MIX[(MIX.indexOf(id) + 1) % MIX.length]; } return; }
    if (pref.track === 'mix' && now - M.since > 150 && (tr.calm ? flLeft <= 0 : M.step % (tr.spb * 8) === 0)) {
      M.fadeAt = now + 1.8; musicBus.gain.cancelScheduledValues(now); musicBus.gain.setTargetAtTime(0, now, 0.5); return;
    }
    // ARRANGEMENT: the drums play in sections of 8 bars - in, light, full, light, OUT (a break), light, full, light -
    // instead of pounding every beat for minutes on end. The melody carries the breaks.
    if (!tr.calm) { const bar = Math.floor(M.step / tr.spb), sec = Math.floor(bar / 8) % 8; DM = id === 'dhol' ? [0.6, 0.8, 1, 0.8, 0.45, 0.8, 1, 0.7][sec] : [0.25, 0.6, 1, 0.65, 0, 0.6, 1, 0.55][sec]; }
    if (tr.calm) { bansuriTick(); return; }
    const sd = tr.sd();
    if (M.next < now) M.next = now + 0.05;
    while (M.next < now + 0.3) {
      const t = M.next + ((M.step % 2) ? sd * (tr.swing || 0) : 0);
      try { tr.play(M.step, t, sd); } catch (e) {}
      M.next += sd; M.step++;
    }
  }

  /* ---- your songs: audio files you add in Music & sound (kept in this browser), plus any the host has put in the
   * server's  client/assets/music/  folder. They play as a shuffled, looping playlist. ---- */
  let HOST_SONGS = [];   // filled from the server (GET api/music: the files in assets/music/)
  let mySongs = [], songEl = null, songOrder = [], songPos = 0, songUrl = null;
  const DB = 'kite-fight-music';
  function idb() { return new Promise((res, rej) => { try { const r = indexedDB.open(DB, 1); r.onupgradeneeded = () => r.result.createObjectStore('songs', { keyPath: 'id' }); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); } catch (e) { rej(e); } }); }
  async function loadSongs() {
    try {
      if (root.fetch && root.location && /^https?:/.test(root.location.protocol) && !root.PW_APP) {   // the phone app has no server to ask
        const r = await root.fetch('api/music', { credentials: 'same-origin' });
        if (r.ok) { const j = await r.json(); HOST_SONGS = (j.songs || []).map(x => ({ id: 'host:' + x.url, name: x.name, url: x.url })); }
      }
    } catch (e) {}
    try { const db = await idb(); mySongs = await new Promise((res) => { const q = db.transaction('songs').objectStore('songs').getAll(); q.onsuccess = () => res(q.result || []); q.onerror = () => res([]); }); }
    catch (e) { mySongs = []; }
    return songList();
  }
  const songList = () => HOST_SONGS.map(s => ({ id: s.id, name: s.name, host: true })).concat(mySongs.map(s => ({ id: s.id, name: s.name })));
  async function addSongs(files) {
    const list = Array.from(files || []).filter(f => /^audio\//.test(f.type) || /\.(mp3|m4a|aac|ogg|oga|opus|wav|flac|webm)$/i.test(f.name));
    if (!list.length) return songList();
    try {
      const db = await idb();
      await new Promise((res, rej) => { const tx = db.transaction('songs', 'readwrite'), st = tx.objectStore('songs');
        for (const f of list) st.put({ id: 'my:' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), name: f.name.replace(/\.[^.]+$/, ''), blob: f });
        tx.oncomplete = res; tx.onerror = () => rej(tx.error); });
    } catch (e) { for (const f of list) mySongs.push({ id: 'tmp:' + Math.random(), name: f.name.replace(/\.[^.]+$/, ''), blob: f }); songOrder = []; return songList(); }   // private window: keep them for this visit only
    songOrder = [];
    return loadSongs();
  }
  async function removeSong(id) {
    try { const db = await idb(); await new Promise(res => { const tx = db.transaction('songs', 'readwrite'); tx.objectStore('songs').delete(id); tx.oncomplete = res; tx.onerror = res; }); } catch (e) {}
    mySongs = mySongs.filter(s => s.id !== id); songOrder = [];
    if (songEl && songEl.dataset && songEl.dataset.id === id) { songEl.pause(); songNext(); }
    return songList();
  }
  function songSrc(id) {
    const h = HOST_SONGS.find(s => s.id === id); if (h) return h.url;
    const m = mySongs.find(s => s.id === id); if (!m) return null;
    if (songUrl) URL.revokeObjectURL(songUrl); songUrl = URL.createObjectURL(m.blob); return songUrl;
  }
  function songNext() {
    const all = songList(); if (!all.length) return false;
    if (!songOrder.length || songPos >= songOrder.length) { songOrder = all.map(s => s.id).sort(() => Math.random() - 0.5); songPos = 0; }
    const id = songOrder[songPos++], src = songSrc(id); if (!src) return songNext();
    if (!songEl) { songEl = new root.Audio(); songEl.preload = 'auto'; songEl.onended = () => songNext(); songEl.onerror = () => { if (songList().length > 1) setTimeout(songNext, 300); }; }
    songEl.dataset.id = id; songEl.src = src; songEl.volume = Math.min(1, pref.musicVol * 0.9);
    if (pref.music && enabled && pref.track === 'mine') songEl.play().catch(() => {});
    if (onSongChange) onSongChange(songList().find(s => s.id === id));
    return true;
  }
  let onSongChange = null;
  function songPlay() {
    if (!root.Audio || !songList().length) return false;
    if (!songEl || !songEl.src) return songNext();
    songEl.volume = Math.min(1, pref.musicVol * 0.9 * duck); songEl.play().catch(() => {}); return true;
  }
  function songStop() { if (songEl) songEl.pause(); }
  function nowPlaying() { if (pref.track === 'mine') { const id = songEl && songEl.dataset.id, s = songList().find(x => x.id === id); return s ? s.name : 'Your songs'; } const id = activeTrack(); return TRACKS[id] ? TRACKS[id].name : ''; }

  const musicLevel = () => pref.music && enabled ? pref.musicVol * duck : 0;
  function fadeIn(sec = 1.5) { if (!ctx) return; const n = ctx.currentTime; musicBus.gain.cancelScheduledValues(n); musicBus.gain.setTargetAtTime(musicLevel(), n, sec / 3); }
  /** 'menu' or 'match': in a match the music sits under the game (kite, wind, shouts) instead of on top of it */
  function setScene(s) { scene = s === 'match' ? 'match' : 'menu'; duck = scene === 'match' ? 0.55 : 1; if (ctx) ramp(musicBus.gain, musicLevel(), 0.8); if (songEl) songEl.volume = Math.min(1, pref.musicVol * 0.9 * duck); }
  function setMusic(on) {
    pref.music = !!on;
    if (pref.music && enabled) { if (pref.track === 'mine') { if (!songPlay()) pref.track = 'mix'; /* nothing added yet: play the mix */ } else songStop(); }
    else songStop();
    if (ctx) ramp(musicBus.gain, musicLevel(), 0.5);
  }
  /** choose a track: 'mix', 'bhangra', 'garba', 'qawwali', 'dhol', 'bansuri' or 'mine' (your songs) */
  function setTrack(id) {
    if (id === 'soothing') id = 'bansuri'; if (id === 'festival') id = 'dhol';   // older saves
    pref.track = (TRACKS[id] || id === 'mix' || id === 'mine') ? id : 'mix';
    if (pref.track === 'mix') M.mixId = null;
    M.cur = null;
    if (ctx) { // let the old track's tail ring out under the new one rather than cutting it dead
      const n = ctx.currentTime; musicBus.gain.cancelScheduledValues(n); musicBus.gain.setTargetAtTime(0, n, 0.06); musicBus.gain.setTargetAtTime(musicLevel(), n + 0.3, 0.4);
    }
    if (pref.track === 'mine' && pref.music && enabled) { if (!songPlay()) pref.track = 'mix'; } else songStop();
  }
  const setStyle = setTrack;   // old name
  function setMusicVolume(v) { pref.musicVol = Math.max(0, Math.min(1, v)); if (ctx) ramp(musicBus.gain, musicLevel(), 0.1); if (songEl) songEl.volume = Math.min(1, pref.musicVol * 0.9 * duck); }
  function setKiteSound(on) { pref.kite = !!on; if (ctx) ramp(kiteBus.gain, pref.kite ? 1 : 0, 0.1); }
  function setVoice(v) { pref.voice = v === 'hi' || v === 'off' ? v : 'ur'; }
  /** keeps the music going on the menus too (the game's own update() only runs during a match) */
  function menuTick() { if (ctx && pref.music && enabled) musicTick(); }
  const unlocked = () => !!ctx && ctx.state === 'running';
  /** a short taste of the shout, for the settings screen */
  function testVoice() { init(); if (!ok()) return; speaking = -9; say('bokata', 1); }

  /* ---------------- rooftop parties: a DJ and a dhol player on two roofs across the street ----------------
   * Each has its own bus: a gain (how near the camera is), a low-pass (far away you hear the thump, not the detail) and
   * a stereo pan (which side of you it is). One shared clock keeps the beats steady. */
  let party = null;
  const PBPM = 128, PSTEP = 60 / PBPM / 2, PBASS = [55, 55, 65.4, 55, 73.4, 65.4, 49, 55];
  const PD = pat('X..x..X.X..x..X.'), PT = pat('..x.xx.x..x.xx.x');
  function partyBus() {
    const g = ctx.createGain(); g.gain.value = 0; const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1400; lp.Q.value = 0.5;
    g.connect(lp); let pn = null;
    if (ctx.createStereoPanner) { pn = ctx.createStereoPanner(); lp.connect(pn); pn.connect(sfx); } else lp.connect(sfx);
    return { g, lp, pn };
  }
  function kick(t, dest) { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.5, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.28); o.connect(g); g.connect(dest); o.start(t); o.stop(t + 0.3); }
  function hat(t, dest, v = 1) { const src = ctx.createBufferSource(); src.buffer = noiseBuf; const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 7000;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.09 * v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.045); src.connect(f); f.connect(g); g.connect(dest); src.start(t, Math.random()); src.stop(t + 0.06); }
  function bassNote(t, f0, dur, dest) { const o = ctx.createOscillator(), lp = ctx.createBiquadFilter(), g = ctx.createGain(); o.type = 'sawtooth'; o.frequency.value = f0;
    lp.type = 'lowpass'; lp.frequency.setValueAtTime(900, t); lp.frequency.exponentialRampToValueAtTime(220, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.16, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(lp); lp.connect(g); g.connect(dest); o.start(t); o.stop(t + dur + 0.02); }
  /** list: [{ kind: 'dj'|'dhol', vol 0..1, pan -1..1, near 0..1 }] for the roofs in earshot; on: false fades them out */
  function partyUpdate(list, on) {
    if (!ctx) return;
    if (!party) party = { next: 0, step: 0, dj: partyBus(), dhol: partyBus() };
    const live = on && enabled;
    for (const kind of ['dj', 'dhol']) {
      const src = live ? (list || []).find(x => x.kind === kind) : null, b = party[kind];
      ramp(b.g.gain, src ? src.vol * (musicLevel() > 0 ? 0.4 : 1) : 0, 0.35);   // under your own music, the neighbours' party is a distant thump, not a second song
      if (src) { if (b.pn) ramp(b.pn.pan, Math.max(-1, Math.min(1, src.pan)), 0.3); ramp(b.lp.frequency, 500 + 3000 * src.near, 0.5); }
    }
    if (!live || !list || !list.length) { party.next = 0; return; }
    const now = ctx.currentTime; if (party.next < now) party.next = now + 0.06;
    while (party.next < now + 0.25) {
      const i = party.step % 16, t = party.next, bar = Math.floor(party.step / 16);
      if (PD[i]) dagga(t, i % 8 === 0 ? 1 : 0.7, party.dhol.g);
      if (PT[i]) tilli(t, 0.5 + 0.4 * Math.random(), party.dhol.g);
      if (i % 4 === 0) kick(t, party.dj.g);
      if (i % 4 === 2) hat(t, party.dj.g, 1); else if (i % 2) hat(t, party.dj.g, 0.45);
      if (i % 2 === 0) bassNote(t, PBASS[(i / 2 + bar * 3) % 8], PSTEP * 1.7, party.dj.g);
      party.next += PSTEP; party.step++;
    }
  }
  /** the beat clock, so the dancers on the roofs move in time with what you hear */
  const partyBeat = () => (ctx ? ctx.currentTime : performance.now() / 1000) * PBPM / 60;
  function setEnabled(on) {
    enabled = on; if (ctx) ramp(master.gain, on ? 0.9 : 0, 0.05);
    setMusic(pref.music);
    if (!on && ss) try { ss.cancel(); } catch (e) {}
  }

  root.Sound = {
    setScene, whoosh, haulZip, partyUpdate, partyBeat, setStyle, setTrack, kids, init, update, menuTick, unlocked, click, tug, setMusic, far, farTick, cheer, shout, lost, hooked,
    collected, pecha, ui, horn, tone, setEnabled, setMusicVolume, setKiteSound, setVoice, voiceInfo, testVoice, say,
    TRACKS: TRACK_LIST, nowPlaying, loadSongs, addSongs, removeSong, songList, songNext, set onSongChange(f) { onSongChange = f; }
  };
})(typeof self !== 'undefined' ? self : this);
