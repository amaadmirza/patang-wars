#!/usr/bin/env node
/* One-time (v6.3): renames the kite pictures from the old pack's file names (Portuguese, numbers, "teste"...) to proper
 * kite names, one folder per kind of kite, using tools/kite-names.json. Safe to run again: files already moved are
 * skipped. Writes:
 *   - client/assets/kites/<folder>/<new-name>.png
 *   - client/tools/kite-id-map.json   { "png:<old>": "png:<new>" }  (the migration map, also baked into economy.js)
 * Pictures listed under "_excluded" (third-party characters and logos) are moved out of the shipped assets into
 * unused-assets/kites/, so they are not served or bought.
 * Then run tools/build-catalog.js. */
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..'), KD = path.join(ROOT, 'assets', 'kites'), OUTX = path.join(ROOT, '..', 'unused-assets', 'kites');
const NAMES = JSON.parse(fs.readFileSync(path.join(__dirname, 'kite-names.json'), 'utf8'));
const slug = s => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const files = [];
(function walk(d) { for (const f of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, f.name); if (f.isDirectory()) walk(p); else if (/\.png$/i.test(f.name)) files.push(p); } })(KD);

const map = {}, seenNames = new Set(), seenSlugs = new Set(), problems = [];
for (const [k, v] of Object.entries(NAMES)) {
  if (k.startsWith('_')) continue;
  const s = slug(v[1]);
  if (seenNames.has(v[1])) problems.push('duplicate name ' + v[1]);
  if (seenSlugs.has(s)) problems.push('duplicate file name ' + s);
  seenNames.add(v[1]); seenSlugs.add(s);
}
const newFolders = new Set(Object.values(NAMES).filter(Array.isArray).map(v => v[0]).filter(x => typeof x === 'string'));
let moved = 0, kept = 0, excluded = 0;
for (const f of files) {
  const rel = path.relative(KD, f).split(path.sep), dir = rel.length > 1 ? rel[0] : '', base = path.basename(f, '.png');
  // already in its new home?
  if (newFolders.has(dir) && Object.values(NAMES).some(v => Array.isArray(v) && v[0] === dir && slug(v[1]) === base)) { kept++; continue; }
  if ((NAMES._excluded || []).includes(base)) { fs.mkdirSync(OUTX, { recursive: true }); fs.renameSync(f, path.join(OUTX, base + '.png')); excluded++; continue; }
  // the old pack had TWO different pictures called tk5.png (one in Patang/, one in tukkal/)
  const key = dir.toLowerCase() === 'tukkal' && NAMES[dir.toLowerCase() + '/' + base] ? dir.toLowerCase() + '/' + base : base;
  const v = NAMES[key];
  if (!v) { problems.push('no name for ' + path.relative(KD, f)); continue; }
  const to = path.join(KD, v[0], slug(v[1]) + '.png');
  fs.mkdirSync(path.dirname(to), { recursive: true });
  if (fs.existsSync(to)) { problems.push('target exists ' + to); continue; }
  fs.renameSync(f, to); moved++;
  // the catalog kept the FIRST tk5 (Patang/tk5.png, read before tukkal/) under the id png:tk5
  if (key === base) map['png:' + base] = 'png:' + slug(v[1]);
}
// a stable map even when run again after the move: rebuild every entry from the names file
for (const [k, v] of Object.entries(NAMES)) if (!k.startsWith('_') && !k.includes('/')) map['png:' + k] = 'png:' + slug(v[1]);
// remove now-empty old folders
for (const d of fs.readdirSync(KD, { withFileTypes: true })) if (d.isDirectory() && !newFolders.has(d.name)) { try { fs.rmdirSync(path.join(KD, d.name)); } catch (e) {} }
fs.writeFileSync(path.join(__dirname, 'kite-id-map.json'), JSON.stringify(map, null, 1) + '\n');
console.log(`moved ${moved}, already renamed ${kept}, excluded ${excluded}, ids mapped ${Object.keys(map).length}`);
if (problems.length) { console.error('PROBLEMS:\n  ' + problems.join('\n  ')); process.exit(1); }
