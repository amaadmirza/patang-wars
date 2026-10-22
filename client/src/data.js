/* Kite + thread data. SI units (m, kg, s, N). Works in browser (window.KiteData) and node. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.KiteData = factory();
})(typeof self !== 'undefined' ? self : this, function () {

  // area m^2, mass kg, trim = resting angle of attack (deg), clMax/cdMax = flat-plate style coefficients,
  // stability 0..1 (1 = rock steady, 0 = twitchy), rollMax = max bank angle (deg), rollTau = bank response (s),
  // alphaTau = pitch response (s), wind = [min, ideal, max] m/s
  // kanni = bridle knot offset along the spine, as a fraction of the kite's height, + toward the nose / - toward
  // the tail (0 = dead centre). A real tail-less diamond patang is flown on two threads (the "kanni") tied to the
  // spine above and below its centre and knotted where they meet; that knot, not the geometric centre, is where
  // the flying line actually pulls. Sliding the knot nose-ward makes the kite sit flatter and fly faster/twitchier
  // (a fighting kite is tuned this way); sliding it tail-ward makes it sit more nose-up and stabler. Only
  // meaningful for bridled diamonds here; kites with a fixed keel (delta) or a hexagonal frame (rokkaku) use 0.
  const KITES = {
    patang: {
      id: 'patang', name: 'Patang', origin: 'India / Pakistan',
      note: 'Classic tail-less diamond with a bow. Light, fast, very twitchy: the fighting kite.',
      size: { w: 0.42, h: 0.46 }, area: 0.16, mass: 0.006, trim: 28, clMax: 1.15, cd0: 0.14, cdMax: 1.9,
      stability: 0.25, rollMax: 40, rollTau: 0.18, alphaTau: 0.25, wind: [2, 5, 10], kanni: 0.07,
      stats: { speed: 5, stability: 1, lift: 3, agility: 5 }
    },
    pipa: {
      id: 'pipa', name: 'Pipa Raia', origin: 'Brazil',
      note: 'Sturdier film-and-cane diamond with short streamers. Balanced, forgiving, good all-rounder.',
      size: { w: 0.55, h: 0.55 }, area: 0.24, mass: 0.014, trim: 30, clMax: 1.1, cd0: 0.16, cdMax: 1.9,
      stability: 0.5, rollMax: 35, rollTau: 0.25, alphaTau: 0.3, wind: [2.5, 5.5, 11], kanni: 0.03,
      stats: { speed: 4, stability: 3, lift: 3, agility: 4 }
    },
    eddy: {
      id: 'eddy', name: 'Eddy', origin: 'Malaya / Europe',
      note: 'Bowed diamond with a tail ribbon. The tail adds drag and damps wobble: easy to launch and hold.',
      size: { w: 0.7, h: 0.75 }, area: 0.32, mass: 0.04, trim: 32, clMax: 1.05, cd0: 0.22, cdMax: 2.0,
      stability: 0.85, rollMax: 25, rollTau: 0.4, alphaTau: 0.45, wind: [2, 4.5, 9], kanni: -0.02,
      stats: { speed: 2, stability: 5, lift: 4, agility: 2 }
    },
    rokkaku: {
      id: 'rokkaku', name: 'Rokkaku', origin: 'Japan',
      note: 'Six-sided battle kite. Big, heavy pull, holds still in a stable wind then darts on a tug.',
      size: { w: 1.0, h: 1.2 }, area: 0.75, mass: 0.11, trim: 26, clMax: 1.0, cd0: 0.18, cdMax: 1.8,
      stability: 0.7, rollMax: 30, rollTau: 0.55, alphaTau: 0.6, wind: [3, 6, 12], kanni: 0,
      stats: { speed: 3, stability: 4, lift: 5, agility: 3 }
    },
    delta: {
      id: 'delta', name: 'Delta', origin: 'Modern',
      note: 'Triangular keel kite. Flies in the lightest air and rides high; slow to turn.',
      size: { w: 1.1, h: 0.6 }, area: 0.42, mass: 0.05, trim: 22, clMax: 1.3, cd0: 0.12, cdMax: 1.5,
      stability: 0.9, rollMax: 20, rollTau: 0.5, alphaTau: 0.5, wind: [1.5, 4, 9], kanni: 0,
      stats: { speed: 3, stability: 5, lift: 5, agility: 1 }
    },
    bird: {
      id: 'bird', name: 'Fighter Bird', origin: 'Original design',
      note: 'Swept-wing bird shape. High glide ratio and the sharpest dive; punishes mistakes.',
      size: { w: 0.8, h: 0.5 }, area: 0.26, mass: 0.02, trim: 24, clMax: 1.25, cd0: 0.1, cdMax: 1.6,
      stability: 0.4, rollMax: 50, rollTau: 0.15, alphaTau: 0.2, wind: [2.5, 6, 11], kanni: 0.09,
      stats: { speed: 5, stability: 2, lift: 4, agility: 5 }
    }
  };

  // dia m, strength N (breaking load), sharp 0..1 (cutting power), ea N (stiffness*length), mu kg/m (line mass)
  const THREADS = {
    cotton: {
      id: 'cotton', name: 'Plain Cotton', tier: 'Beginner', color: '#e8dcc0',
      note: 'Untreated cotton. Cannot cut, but tough and cheap. Good for practice.',
      dia: 0.0006, strength: 32, sharp: 0.05, ea: 900, mu: 0.00022, stats: { cut: 1, strength: 3, weight: 3 }
    },
    manjha: {
      id: 'manjha', name: 'Glass Manjha', tier: 'Standard', color: '#ff5ea8',
      note: 'Cotton coated with glue and powdered glass. The traditional cutter: sharp but brittle.',
      dia: 0.0006, strength: 22, sharp: 0.7, ea: 800, mu: 0.00026, stats: { cut: 4, strength: 2, weight: 3 }
    },
    cerol: {
      id: 'cerol', name: 'Cerol', tier: 'Standard', color: '#f2d21b',
      note: 'Brazilian ground-quartz coating. Even cut, moderate strength.',
      dia: 0.0007, strength: 26, sharp: 0.6, ea: 850, mu: 0.00030, stats: { cut: 3, strength: 3, weight: 3 }
    },
    chilena: {
      id: 'chilena', name: 'Chilena', tier: 'Advanced', color: '#3ad6c5',
      note: 'Braided nylon with abrasive. Best balance of strength and bite.',
      dia: 0.0005, strength: 40, sharp: 0.65, ea: 1400, mu: 0.00020, stats: { cut: 4, strength: 4, weight: 2 }
    },
    nylon: {
      id: 'nylon', name: 'Smooth Nylon', tier: 'Standard', color: '#5aa8ff',
      note: 'Very strong and light, but almost no cutting power. Wins by not breaking.',
      dia: 0.0004, strength: 60, sharp: 0.15, ea: 1800, mu: 0.00012, stats: { cut: 1, strength: 5, weight: 1 }
    },
    razor: {
      id: 'razor', name: 'Razor Wire Manjha', tier: 'Elite', color: '#9b6bff',
      note: 'Extremely aggressive coat, fragile and heavy. Cuts anything, snaps if you pull hard.',
      dia: 0.0007, strength: 15, sharp: 1.0, ea: 700, mu: 0.00040, stats: { cut: 5, strength: 1, weight: 4 }
    }
  };

  const PALETTES = [
    { name: 'Sunset', c1: '#e63946', c2: '#ffd166', c3: '#fff3d6', ink: '#3a2a1a' },
    { name: 'Ocean',  c1: '#118ab2', c2: '#06d6a0', c3: '#e8faff', ink: '#12324a' },
    { name: 'Royal',  c1: '#7b2cbf', c2: '#f72585', c3: '#ffe8f5', ink: '#2a1240' },
    { name: 'Tricolor', c1: '#ff8c1a', c2: '#ffffff', c3: '#1a9e4b', ink: '#1a2a4a' }
  ];

  return { KITES, THREADS, PALETTES };
});
