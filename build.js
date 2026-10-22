#!/usr/bin/env node
/* Build: client/ -> dist/public/
 *
 *  - All game scripts become ONE minified file (app.<hash>.js). The modules are wrapped in a single private scope, so
 *    the game's internals (physics, pecha settings, the running match) are no longer reachable from the browser
 *    console, and every local name is shortened by the minifier.
 *  - The development test hook (window.__game) is compiled out (KF_DEBUG = false), and src/env.js is not shipped.
 *  - CSS is minified (app.<hash>.css). Hashed file names let the server cache them forever.
 *  - Text files get .br and .gz copies made ahead of time, so the server never compresses on the fly (low CPU).
 *  - assets/ and models/ are copied from client/ (or from the project root, if you keep them there).
 *
 * Note: minifying makes the code hard to read and copy; no technique can make browser code truly secret. What must
 * not be cheated (records, trophies) is decided on the server - see server/anticheat.js.
 */
'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto'), zlib = require('zlib');

function loadEsbuild() {
  const tries = [process.env.ESBUILD_PATH, 'esbuild', '/opt/npm-tools/node_modules/esbuild'].filter(Boolean);
  for (const t of tries) { try { return require(t); } catch (e) {} }
  console.error('esbuild is missing. Run:  npm install');
  process.exit(1);
}
const esbuild = loadEsbuild();

// --app: the phone app build (Android/iOS, app/): the whole game inside the app, offline - no server, no compressed copies
const APP = process.argv.includes('--app');
const ROOT = __dirname, SRC = path.join(ROOT, 'client'), OUT = APP ? path.join(ROOT, 'app', 'www') : path.join(ROOT, 'dist', 'public');
// modules that only attach themselves to their UMD root: they go into the private scope
const PRIVATE = ['trophies.js', 'economy.js', 'data.js', 'physics.js', 'pecha.js', 'kitemaker.js', 'fliers.js', 'art.js'];
const EXPORTS = ['KiteTrophies', 'KiteEconomy', 'KiteData', 'KitePhysics', 'KitePecha', 'KiteMaker', 'Fliers', 'KiteArt'];
const DEV_ONLY = ['env.js'];
const COMPRESS = /\.(js|css|html|svg|json|txt|webmanifest)$/i;

const hash = buf => crypto.createHash('sha256').update(buf).digest('hex').slice(0, 10);
const read = f => fs.readFileSync(path.join(SRC, f), 'utf8');

function rmrf(p) { fs.rmSync(p, { recursive: true, force: true }); }
function copyDir(from, to) {
  if (!fs.existsSync(from)) return 0;
  let n = 0;
  for (const e of fs.readdirSync(from, { withFileTypes: true })) {
    if (e.name.startsWith('.')) continue;
    const a = path.join(from, e.name), b = path.join(to, e.name);
    if (e.isDirectory()) n += copyDir(a, b);
    else if (e.isFile()) { fs.mkdirSync(to, { recursive: true }); fs.copyFileSync(a, b); n++; }
  }
  return n;
}
function precompress(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const f = path.join(dir, e.name);
    if (e.isDirectory()) { precompress(f); continue; }
    if (!COMPRESS.test(f)) continue;
    const buf = fs.readFileSync(f);
    if (buf.length < 512) continue;
    fs.writeFileSync(f + '.br', zlib.brotliCompressSync(buf, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 11 } }));
    fs.writeFileSync(f + '.gz', zlib.gzipSync(buf, { level: 9 }));
  }
}

async function main() {
  const t0 = Date.now();
  const html = read('index.html');
  const scripts = [...html.matchAll(/<script src="src\/([\w.-]+)"><\/script>/g)].map(m => m[1]);
  if (!scripts.length) throw new Error('no <script src="src/..."> tags found in client/index.html');
  const boot = scripts[0] === 'boot.js' ? 'boot.js' : null;

  // ---- one private scope for the whole game ----
  const UMD = /typeof self !== 'undefined' \? self : this/g;
  let body = '';
  const lastPrivate = Math.max(...PRIVATE.map(f => scripts.indexOf(f)));
  if (PRIVATE.some(f => !scripts.includes(f))) throw new Error('index.html is missing one of: ' + PRIVATE.join(', '));
  scripts.forEach((f, i) => {
    if (f === boot || DEV_ONLY.includes(f)) return;
    let code = read('src/' + f);
    if (PRIVATE.includes(f)) {
      const n = (code.match(UMD) || []).length;
      if (n !== 1) throw new Error(`${f}: expected one UMD root, found ${n}`);
      code = code.replace(UMD, '__r');
    }
    body += `/* ${f} */\n${code}\n;\n`;
    // once the last private module has loaded, give the rest of the game its names (private to this bundle)
    if (i === lastPrivate) body += `var ${EXPORTS.map(e => `${e} = __r.${e}`).join(', ')};\n`;
  });
  const bundle = `(function () {\nvar __r = {};\n${body}})();\n`;
  const opts = { minify: true, target: 'es2019', legalComments: 'none', define: { KF_DEBUG: 'false' }, charset: 'utf8' };
  const app = (await esbuild.transform(bundle, { ...opts, loader: 'js' })).code;
  if (/__game|KF_DEBUG/.test(app)) throw new Error('debug hook survived the build');
  const bootJs = boot ? (await esbuild.transform(read('src/' + boot), { ...opts, loader: 'js' })).code : '';
  const css = (await esbuild.transform(read('css/index.css'), { loader: 'css', minify: true, legalComments: 'none' })).code;

  rmrf(APP ? OUT : path.join(ROOT, 'dist'));
  fs.mkdirSync(OUT, { recursive: true });
  const appName = `app.${hash(app)}.js`, cssName = `app.${hash(css)}.css`, bootName = boot ? `boot.${hash(bootJs)}.js` : '';
  fs.writeFileSync(path.join(OUT, appName), app);
  fs.writeFileSync(path.join(OUT, cssName), css);
  if (boot) fs.writeFileSync(path.join(OUT, bootName), bootJs);

  // ---- index.html: point at the built files, drop comments and blank lines ----
  let out = html
    .replace(/<link rel="stylesheet" href="css\/index\.css">/, `<link rel="stylesheet" href="${cssName}">`)
    .replace(/<script src="src\/boot\.js"><\/script>/, boot ? `<script src="${bootName}"></script>` : '')
    .replace(/<script src="src\/[\w.-]+"><\/script>\s*/g, '')
    .replace('</body>', `${APP ? '<script>window.PW_APP = { offline: true };</script>\n' : ''}<script src="${appName}"></script>\n</body>`)
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\n\s*\n/g, '\n');
  // the stylesheet referenced the background from css/: built CSS sits at the root next to models/
  fs.writeFileSync(path.join(OUT, 'index.html'), out);
  const cssFixed = css.replace(/url\(\.\.\/models\//g, 'url(models/');
  if (cssFixed !== css) fs.writeFileSync(path.join(OUT, cssName), cssFixed);

  // ---- game pictures ----
  let files = 0;
  for (const d of ['assets', 'models']) {
    const inClient = path.join(SRC, d), inRoot = path.join(ROOT, d);
    files += copyDir(fs.existsSync(inClient) ? inClient : inRoot, path.join(OUT, d));
  }
  if (!APP) precompress(OUT);
  const kb = f => (fs.statSync(path.join(OUT, f)).size / 1024).toFixed(0) + ' KB';
  const brKb = f => fs.existsSync(path.join(OUT, f + '.br')) ? ' (' + (fs.statSync(path.join(OUT, f + '.br')).size / 1024).toFixed(0) + ' KB brotli)' : '';
  console.log(`built ${APP ? 'app/www (phone app, offline)' : 'dist/public'} in ${Date.now() - t0} ms`);
  console.log(`  ${appName}  ${kb(appName)}${brKb(appName)}`);
  console.log(`  ${cssName}  ${kb(cssName)}${brKb(cssName)}`);
  console.log(`  assets/models files copied: ${files}`);
  if (!files) console.log('  (no assets found: put your assets/ and models/ folders inside client/ or the project root)');
}
main().catch(e => { console.error('BUILD FAILED:', e.message); process.exit(1); });
