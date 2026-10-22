// Generates assets/kites/*.svg, assets/spools/*.svg and data/*.json: node tools/build-assets.js
const fs = require('fs'), path = require('path');
const { KITES, THREADS, PALETTES } = require('../src/data.js');
const Art = require('../src/art.js');
const root = path.join(__dirname, '..');
const w = (rel, txt) => { const f = path.join(root, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, txt); };

for (const id of Object.keys(KITES))
  PALETTES.forEach(p => w(`assets/kites/${id}_${p.name.toLowerCase()}.svg`, Art.kiteSVG(id, p)));

// spool style per thread (matches the "spool grid" idea from the reference video)
const SPOOL_FOR = { cotton: 'charkhi', manjha: 'firki', cerol: 'lata', chilena: 'chilena', nylon: 'roca', razor: 'paila' };
for (const [id, t] of Object.entries(THREADS)) w(`assets/spools/${id}.svg`, Art.spoolSVG(SPOOL_FOR[id], t.color));

const kites = Object.values(KITES).map(k => ({ ...k, art: PALETTES.map(p => `assets/kites/${k.id}_${p.name.toLowerCase()}.svg`) }));
const threads = Object.values(THREADS).map(t => ({ ...t, spool: SPOOL_FOR[t.id], art: `assets/spools/${t.id}.svg` }));
w('data/kites.json', JSON.stringify(kites, null, 2));
w('data/threads.json', JSON.stringify(threads, null, 2));
w('data/palettes.json', JSON.stringify(PALETTES, null, 2));
console.log(`wrote ${kites.length * PALETTES.length} kite SVGs, ${threads.length} spool SVGs, 3 json files`);
