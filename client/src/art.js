/* Original vector art for kites and thread spools. Returns SVG strings (browser + node).
 * Kites: 200x200 viewBox, nose at the top, bridle/tail included. Spools: 128x128 viewBox. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.KiteArt = factory();
})(typeof self !== 'undefined' ? self : this, function () {

  const svg = (vb, body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${vb} ${vb}" width="${vb}" height="${vb}">${body}</svg>`;
  const stick = (d, ink, w = 3) => `<path d="${d}" fill="none" stroke="${ink}" stroke-width="${w}" stroke-linecap="round"/>`;

  /* ---------------- KITES ---------------- */
  const KITE = {
    patang: p => svg(200, `
      <polygon points="100,8 172,86 100,192 28,86" fill="${p.c3}" stroke="${p.ink}" stroke-width="3" stroke-linejoin="round"/>
      <polygon points="100,8 172,86 100,86" fill="${p.c1}"/><polygon points="100,86 28,86 100,192" fill="${p.c1}"/>
      <polygon points="100,8 28,86 100,86" fill="${p.c2}"/><polygon points="100,86 172,86 100,192" fill="${p.c2}"/>
      <polygon points="100,8 172,86 100,192 28,86" fill="none" stroke="${p.ink}" stroke-width="3" stroke-linejoin="round"/>
      ${stick('M100 8 L100 192', p.ink)}${stick('M28 86 Q100 56 172 86', p.ink)}
      <circle cx="100" cy="76" r="4" fill="${p.ink}"/>`),

    pipa: p => svg(200, `
      <polygon points="100,10 176,100 100,190 24,100" fill="${p.c3}"/>
      <polygon points="100,10 176,100 100,100" fill="${p.c1}"/><polygon points="24,100 100,100 100,190" fill="${p.c1}"/>
      <polygon points="100,10 24,100 100,100" fill="${p.c2}"/><polygon points="176,100 100,190 100,100" fill="${p.c2}"/>
      <circle cx="100" cy="100" r="26" fill="${p.c3}" stroke="${p.ink}" stroke-width="3"/><circle cx="100" cy="100" r="11" fill="${p.c1}"/>
      <polygon points="100,10 176,100 100,190 24,100" fill="none" stroke="${p.ink}" stroke-width="4" stroke-linejoin="round"/>
      ${stick('M100 10 L100 190', p.ink, 2.5)}${stick('M24 100 L176 100', p.ink, 2.5)}
      <path d="M92 190 q-6 12 0 22 M100 190 q6 14 0 26 M108 190 q-6 12 0 20" stroke="${p.c1}" stroke-width="5" fill="none" stroke-linecap="round" transform="scale(1 .88) translate(0 14)"/>`),

    eddy: p => svg(200, `
      <polygon points="100,6 166,64 100,172 34,64" fill="${p.c1}" stroke="${p.ink}" stroke-width="3" stroke-linejoin="round"/>
      <polygon points="100,6 166,64 100,64" fill="${p.c2}"/><polygon points="100,64 34,64 100,172" fill="${p.c2}"/>
      <polygon points="100,6 166,64 100,172 34,64" fill="none" stroke="${p.ink}" stroke-width="3" stroke-linejoin="round"/>
      ${stick('M100 6 L100 172', p.ink)}${stick('M34 64 Q100 38 166 64', p.ink)}
      <path d="M100 172 C86 182 114 190 100 199" stroke="${p.c1}" stroke-width="7" fill="none" stroke-linecap="round"/>
      <path d="M100 172 C86 182 114 190 100 199" stroke="${p.c3}" stroke-width="2.5" fill="none" stroke-dasharray="4 5"/>`),

    rokkaku: p => svg(200, `
      <polygon points="100,6 166,52 166,150 100,194 34,150 34,52" fill="${p.c3}" stroke="${p.ink}" stroke-width="3" stroke-linejoin="round"/>
      <polygon points="34,52 166,52 166,84 34,84" fill="${p.c1}"/><polygon points="34,116 166,116 166,150 34,150" fill="${p.c1}"/>
      <polygon points="100,6 166,52 34,52" fill="${p.c2}"/><polygon points="34,150 166,150 100,194" fill="${p.c2}"/>
      <circle cx="100" cy="100" r="17" fill="${p.c2}" stroke="${p.ink}" stroke-width="3"/><circle cx="100" cy="100" r="6" fill="${p.ink}"/>
      <polygon points="100,6 166,52 166,150 100,194 34,150 34,52" fill="none" stroke="${p.ink}" stroke-width="3.5" stroke-linejoin="round"/>
      ${stick('M100 6 L100 194', p.ink)}${stick('M34 52 L166 52', p.ink)}${stick('M34 150 L166 150', p.ink)}
      ${stick('M34 100 L166 100', p.ink, 2)}`),

    delta: p => svg(200, `
      <polygon points="100,10 190,172 10,172" fill="${p.c3}" stroke="${p.ink}" stroke-width="3" stroke-linejoin="round"/>
      <polygon points="100,10 190,172 100,172" fill="${p.c1}"/><polygon points="100,10 10,172 100,172" fill="${p.c2}"/>
      <polygon points="100,72 128,172 72,172" fill="${p.c3}" opacity=".85"/>
      <polygon points="100,10 190,172 10,172" fill="none" stroke="${p.ink}" stroke-width="3.5" stroke-linejoin="round"/>
      ${stick('M100 10 L100 172', p.ink)}${stick('M100 72 L44 124', p.ink, 2)}${stick('M100 72 L156 124', p.ink, 2)}
      <path d="M100 172 L100 196" stroke="${p.ink}" stroke-width="3"/>
      <path d="M10 172 Q100 188 190 172" fill="none" stroke="${p.ink}" stroke-width="2.5"/>`),

    bird: p => svg(200, `
      <path d="M100 30 C112 30 118 44 112 60 L188 108 C168 108 136 100 116 96 L108 176 L100 194 L92 176 L84 96 C64 100 32 108 12 108 L88 60 C82 44 88 30 100 30Z"
            fill="${p.c1}" stroke="${p.ink}" stroke-width="3" stroke-linejoin="round"/>
      <path d="M100 60 L188 108 C168 108 136 100 116 96 L100 120Z" fill="${p.c2}"/>
      <path d="M100 60 L12 108 C32 108 64 100 84 96 L100 120Z" fill="${p.c2}"/>
      <path d="M100 30 L88 12 L100 20 L112 12Z" fill="${p.c3}" stroke="${p.ink}" stroke-width="2.5" stroke-linejoin="round"/>
      <circle cx="93" cy="46" r="3.2" fill="${p.ink}"/><circle cx="107" cy="46" r="3.2" fill="${p.ink}"/>
      <path d="M96 52 L100 60 L104 52Z" fill="${p.c3}" stroke="${p.ink}" stroke-width="2"/>
      ${stick('M100 30 L100 190', p.ink, 2.5)}${stick('M12 108 Q100 78 188 108', p.ink, 3)}`)
  };

  /* ---------------- SPOOLS / REELS ---------------- */
  const wood = '#b07a45', woodDk = '#7c4f26', metal = '#c9ced6';
  const wind = (x, y, w, h, c) => { // thread windings drawn as fine bands
    let s = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="${c}"/>`;
    for (let i = 1; i < 9; i++) s += `<line x1="${x + (w * i) / 9}" y1="${y}" x2="${x + (w * i) / 9}" y2="${y + h}" stroke="#000" stroke-opacity=".18"/>`;
    return s;
  };
  const SPOOL = {
    charkhi: c => svg(128, `
      <line x1="6" y1="64" x2="122" y2="64" stroke="${woodDk}" stroke-width="7" stroke-linecap="round"/>
      <circle cx="8" cy="64" r="7" fill="${wood}" stroke="${woodDk}" stroke-width="2"/><circle cx="120" cy="64" r="7" fill="${wood}" stroke="${woodDk}" stroke-width="2"/>
      <rect x="26" y="30" width="9" height="68" rx="3" fill="${wood}" stroke="${woodDk}" stroke-width="2"/>
      <rect x="93" y="30" width="9" height="68" rx="3" fill="${wood}" stroke="${woodDk}" stroke-width="2"/>
      ${wind(35, 36, 58, 56, c)}`),

    firki: c => svg(128, `
      <line x1="10" y1="64" x2="118" y2="64" stroke="#444" stroke-width="5" stroke-linecap="round"/>
      <rect x="22" y="24" width="10" height="80" rx="4" fill="#d9d3c2" stroke="#8a8371" stroke-width="2"/>
      <rect x="96" y="24" width="10" height="80" rx="4" fill="#d9d3c2" stroke="#8a8371" stroke-width="2"/>
      ${wind(32, 28, 64, 72, c)}`),

    chilena: c => { // star-shaped wooden wheel, front view
      let spokes = '';
      for (let i = 0; i < 5; i++) { const a = (i * 72 - 90) * Math.PI / 180; spokes += `<line x1="64" y1="64" x2="${(64 + 46 * Math.cos(a)).toFixed(1)}" y2="${(64 + 46 * Math.sin(a)).toFixed(1)}" stroke="${woodDk}" stroke-width="7" stroke-linecap="round"/>`; }
      return svg(128, `<circle cx="64" cy="64" r="56" fill="${wood}" stroke="${woodDk}" stroke-width="3"/>
      <circle cx="64" cy="64" r="48" fill="${c}"/><circle cx="64" cy="64" r="40" fill="none" stroke="#000" stroke-opacity=".2" stroke-width="2" stroke-dasharray="2 4"/>
      <circle cx="64" cy="64" r="34" fill="${wood}"/>${spokes}<circle cx="64" cy="64" r="9" fill="${woodDk}"/><circle cx="64" cy="64" r="3.5" fill="${metal}"/>`);
    },

    paila: c => svg(128, `
      <ellipse cx="64" cy="98" rx="46" ry="13" fill="#000" opacity=".2"/>
      <path d="M18 44 v50 a46 13 0 0 0 92 0 v-50z" fill="${c}"/>
      <path d="M18 44 v50 a46 13 0 0 0 92 0 v-50" fill="none" stroke="#000" stroke-opacity=".25" stroke-width="2"/>
      <rect x="18" y="62" width="92" height="16" fill="#fff" opacity=".85"/>
      <ellipse cx="64" cy="44" rx="46" ry="13" fill="${c}" stroke="#000" stroke-opacity=".25" stroke-width="2"/>
      <ellipse cx="64" cy="44" rx="30" ry="8" fill="#000" opacity=".28"/>`),

    roca: c => svg(128, `
      <ellipse cx="64" cy="108" rx="40" ry="10" fill="${woodDk}"/><rect x="24" y="98" width="80" height="10" fill="${wood}"/>
      <ellipse cx="64" cy="98" rx="40" ry="10" fill="${wood}" stroke="${woodDk}" stroke-width="2"/>
      <path d="M40 26 L24 98 a40 10 0 0 0 80 0 L88 26z" fill="${c}"/>
      <path d="M36 44 q28 12 56 0 M32 62 q32 14 64 0 M28 80 q36 14 72 0" fill="none" stroke="#000" stroke-opacity=".22" stroke-width="2"/>
      <ellipse cx="64" cy="26" rx="24" ry="6" fill="${c}" stroke="#000" stroke-opacity=".25" stroke-width="2"/>
      <rect x="60" y="8" width="8" height="20" rx="2" fill="${woodDk}"/>`),

    lata: c => svg(128, `
      <ellipse cx="64" cy="106" rx="34" ry="10" fill="#000" opacity=".2"/>
      <path d="M30 34 v70 a34 9 0 0 0 68 0 v-70z" fill="${metal}"/>
      <rect x="30" y="52" width="68" height="34" fill="${c}"/>
      <path d="M30 34 v70 a34 9 0 0 0 68 0 v-70" fill="none" stroke="#5c6470" stroke-width="2"/>
      <ellipse cx="64" cy="34" rx="34" ry="9" fill="#e6e9ee" stroke="#5c6470" stroke-width="2"/>
      <ellipse cx="64" cy="34" rx="24" ry="6" fill="${c}"/><path d="M64 34 C74 22 92 24 106 10" fill="none" stroke="${c}" stroke-width="3" stroke-linecap="round"/>`)
  };

  /* ---------------- CHARKHI & PINNA (the reels the game uses) ----------------
   * Charkhi: the wooden reel held by two handles, the dor wound on the drum between two side frames.
   * Pinna: a ball of dor wound by hand over a paper core (the cheap way to carry thread).
   * Drawn in SVG, recoloured live: `c` is the dor colour on the reel, `o` the reel's own look. */
  const winding = (x, y, w, h, c, n = 11) => {
    let s = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4" fill="${c}"/>`;
    s += `<rect x="${x}" y="${y}" width="${w}" height="${h * 0.32}" rx="4" fill="#fff" opacity=".22"/>`;
    s += `<rect x="${x}" y="${y + h * 0.72}" width="${w}" height="${h * 0.28}" rx="4" fill="#000" opacity=".16"/>`;
    for (let i = 1; i < n; i++) { const yy = y + (h * i) / n; s += `<path d="M${x + 2} ${yy} Q${x + w / 2} ${yy + (i % 2 ? 2.5 : -2.5)} ${x + w - 2} ${yy}" stroke="#000" stroke-opacity=".14" fill="none"/>`; }
    return s;
  };
  function charkhi(c, o = {}) {
    const fr = o.frame || '#b07a45', dk = o.dark || '#6b4220', band = o.band, hd = o.handle || dk;
    const side = x => `<path d="M${x} 22 L${x + 12} 22 L${x + 14} 106 L${x - 2} 106 Z" fill="${fr}" stroke="${dk}" stroke-width="2" stroke-linejoin="round"/>
      ${band ? `<rect x="${x - 1}" y="34" width="14" height="6" fill="${band}"/><rect x="${x - 1}" y="88" width="14" height="6" fill="${band}"/>` : ''}
      <circle cx="${x + 6}" cy="64" r="4" fill="${dk}"/>`;
    return svg(128, `
      <ellipse cx="64" cy="114" rx="50" ry="6" fill="#000" opacity=".18"/>
      <rect x="2" y="59" width="18" height="10" rx="5" fill="${hd}"/><rect x="108" y="59" width="18" height="10" rx="5" fill="${hd}"/>
      <rect x="0" y="56" width="8" height="16" rx="4" fill="${fr}" stroke="${dk}" stroke-width="1.5"/><rect x="120" y="56" width="8" height="16" rx="4" fill="${fr}" stroke="${dk}" stroke-width="1.5"/>
      ${winding(36, 30, 56, 68, c)}
      ${side(22)}${side(94)}
      <path d="M92 40 C104 30 116 20 126 6" stroke="${c}" stroke-width="2" fill="none" stroke-linecap="round"/>`);
  }
  function pinna(c, o = {}) {
    const core = o.core || '#f1e6cf', coreDk = o.coreDark || '#b8a27a';
    let wraps = '';
    for (let i = 0; i < 9; i++) { const a = -70 + i * 17; wraps += `<ellipse cx="64" cy="66" rx="40" ry="${13 + (i % 3) * 5}" transform="rotate(${a} 64 66)" fill="none" stroke="#000" stroke-opacity=".13" stroke-width="1.4"/>`; }
    return svg(128, `
      <ellipse cx="64" cy="114" rx="40" ry="6" fill="#000" opacity=".18"/>
      <circle cx="64" cy="66" r="44" fill="${c}"/>
      <circle cx="52" cy="50" r="30" fill="#fff" opacity=".18"/><circle cx="76" cy="84" r="30" fill="#000" opacity=".12"/>
      ${wraps}
      <ellipse cx="64" cy="66" rx="11" ry="15" fill="${core}" stroke="${coreDk}" stroke-width="2"/><ellipse cx="64" cy="66" rx="5" ry="8" fill="${coreDk}" opacity=".7"/>
      <path d="M100 44 C110 34 118 22 124 8" stroke="${c}" stroke-width="2" fill="none" stroke-linecap="round"/>`);
  }
  // the reels on offer in the game (look only - the dor you pick decides cutting power)
  const REELS = [
    { id: 'charkhi:sheesham', name: 'Charkhi · Sheesham', kind: 'charkhi', o: { frame: '#9a6232', dark: '#5a3414' } },
    { id: 'charkhi:kikar', name: 'Charkhi · Kikar', kind: 'charkhi', o: { frame: '#c99a63', dark: '#7c5528' } },
    { id: 'charkhi:lal', name: 'Charkhi · Lal', kind: 'charkhi', o: { frame: '#c0392b', dark: '#6e1a12', band: '#f4d03f' } },
    { id: 'charkhi:hara', name: 'Charkhi · Hara', kind: 'charkhi', o: { frame: '#1e8449', dark: '#0b4122', band: '#ffffff' } },
    { id: 'charkhi:neela', name: 'Charkhi · Neela', kind: 'charkhi', o: { frame: '#2e5fa8', dark: '#132f5c', band: '#f4d03f' } },
    { id: 'charkhi:kala', name: 'Charkhi · Kala', kind: 'charkhi', o: { frame: '#2b2b2b', dark: '#0d0d0d', band: '#d4ac0d' } },
    { id: 'charkhi:basant', name: 'Charkhi · Basant', kind: 'charkhi', o: { frame: '#f1c40f', dark: '#9a7d0a', band: '#e67e22' } },
    { id: 'charkhi:gulabi', name: 'Charkhi · Gulabi', kind: 'charkhi', o: { frame: '#e75480', dark: '#8a2246', band: '#ffffff' } },
    { id: 'pinna:kaghaz', name: 'Pinna · Kaghaz', kind: 'pinna', o: {} },
    { id: 'pinna:akhbar', name: 'Pinna · Akhbar', kind: 'pinna', o: { core: '#e4e4e4', coreDark: '#8a8a8a' } },
    { id: 'pinna:gatta', name: 'Pinna · Gatta', kind: 'pinna', o: { core: '#c79a5b', coreDark: '#7a5528' } },
    { id: 'pinna:lal', name: 'Pinna · Lal core', kind: 'pinna', o: { core: '#e74c3c', coreDark: '#922b21' } }
  ];
  const reelSVG = (reel, color) => (reel.kind === 'pinna' ? pinna : charkhi)(color, reel.o);

  return { KITE, SPOOL, REELS, reelSVG, charkhi, pinna, kiteSVG: (id, pal) => KITE[id](pal), spoolSVG: (id, color) => SPOOL[id](color) };
});
