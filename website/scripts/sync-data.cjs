// Rebuilds src/data/*.json from the game's own source (kites, prices, scenes, strings, Mohalla, rewards).
// usage:  node scripts/sync-data.cjs ../bo-kata-web .
const fs = require('fs'), path = require('path'), vm = require('vm');
const [G, S] = process.argv.slice(2);
const E = require(path.join(G, 'client/src/economy.js'));
const c = { window: {} }; vm.runInNewContext(fs.readFileSync(path.join(G, 'client/src/catalog.js'), 'utf8'), c);
const kites = c.window.KITE_CATALOG.map(k => { const price = E.kitePrice(k.id); const [, folder, file] = /assets\/kites\/(\w+)\/([\w.-]+)\.png$/.exec(k.src);
  return { id: k.id.replace(/^png:/, ''), name: k.name, type: folder, price, rarity: E.rarityOf(price), img: `kites/${folder}/${file.replace(/\.png$/, '')}.webp` }; });
const threads = JSON.parse(fs.readFileSync(path.join(G, 'client/data/threads.json'), 'utf8')).map(t => ({ id: t.id, name: t.name, tier: t.tier, color: t.color, note: t.note, stats: t.stats, price: E.THREAD_PRICE[t.id] ?? null }));
const src = fs.readFileSync(path.join(G, 'client/src/game.js'), 'utf8');
const scenes = [...src.matchAll(/^    (\w+): \{ name: '([^']+)'(.*)$/gm)].map(m => ({ id: m[1], name: m[2], night: /night: true|nightDrawn/.test(m[3]), wind: +(/wind: ([\d.]+)/.exec(m[3]) || [0, 0])[1] })).filter(s => s.wind); const ORDER = JSON.parse(/const STAGE_ORDER = (\[[^\]]+\])/.exec(src)[1].replace(/'/g, '"')); scenes.sort((a, b) => ORDER.indexOf(a.id) - ORDER.indexOf(b.id)); scenes.splice(0, scenes.length, ...scenes.filter(s => ORDER.includes(s.id)));
const mohallas = E.MOHALLAS.map(m => ({ name: m.name, size: m.size, diff: m.diff, reward: m.reward, note: m.note }));
const rewards = { login: E.LOGIN, crates: Object.entries(E.CRATES).map(([id, c]) => ({ id, name: c.name, price: c.price })), pay: E.PAY, start: E.START_COINS };
const counts = { kites: kites.length, patang: kites.filter(k => k.type === 'patang').length, tukkal: kites.filter(k => k.type === 'tukkal').length, free: kites.filter(k => !k.price).length, scenes: scenes.length };
fs.writeFileSync(path.join(S, 'src/data/kites.json'), JSON.stringify(kites));
fs.writeFileSync(path.join(S, 'src/data/game.json'), JSON.stringify({ threads, scenes, mohallas, rewards, counts }, null, 1));
console.log(counts, rewards.crates, scenes.map(s => s.name).join(', '));
