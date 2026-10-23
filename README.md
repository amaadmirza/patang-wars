# Bo Kata! — project handbook

**Bo Kata!** (pehle *Patang Wars*) is a Basant rooftop kite-fighting game: fly a patang off a Lahore roof, hook a rival's
line in a pecha, cut it, loot the falling kite. It runs in a browser (with an online server for friends), as an offline
Android app, and has its own website.

This file is the map of the whole project: what lives where, how to run and release it, and which knob to turn for the
things people usually want changed. Version history is in [CHANGELOG.md](CHANGELOG.md), test results in
[QA-REPORT.md](QA-REPORT.md).

**Current version: v7.1** (`package.json` 1.7.1, Android `app/package.json` 1.7.1).

---

## 1. What is in this repository

```
client/            the game itself (one HTML page + plain JavaScript, no framework)
  index.html       every screen and panel (splash, home, shop, settings, match HUD, pause, results ...)
  css/index.css    all styles (phone layouts at the bottom of the file)
  src/             the game code - see section 4
  assets/          kites/ (patang/, tukkal/ pictures), brand/ (logo), music/, spools/
  models/          background panoramas
  data/            kites/threads/palettes JSON (reference copies; the game uses src/data.js)
  tools/           build-catalog.js (kite list), kite-names.json, test-physics.js, logo and icon makers
server/            Node.js server for the browser game: pages, player records, shop, online rooms, anti-cheat
test/              npm test - server, online, purchases, persistence, multi-pecha
app/               the Android app (Capacitor 8). app/www is generated - never edit it by hand
  README-APP.md    how the app is built and signed (step by step, Roman Urdu)
.github/workflows/build-apps.yml   builds the APK + AAB on GitHub and publishes a Release
website/           the Bo Kata! website (Vue 3 + Vite) - see website/README.md
tools/qa/          end-to-end QA, performance and kite-rotation measuring tools - section 8
deploy/            systemd service + nginx config for a VPS
build.js           client/ -> dist/public (web) or app/www (phone app)
screenshots-*/     screenshots per version
unused-assets/     kite pictures that are NOT in the game (other companies' characters/logos)
```

## 2. Run it on your computer

Node.js 18 or newer (https://nodejs.org, the LTS one).

```bash
npm install          # once
npm run dev          # http://localhost:8080 straight from client/ - edit a file, refresh the browser
npm run build        # makes dist/public (what players get)
npm start            # the real server on port 8080 (uses dist/public)
npm test             # 121 server/online/economy tests
node client/tools/test-physics.js   # 50 flight-model checks
```

Friends on the same Wi-Fi open the second address the server prints (like `http://192.168.1.10:8080`). Over the internet:
`cloudflared tunnel --url http://localhost:8080`, or a VPS with `deploy/`. Player records live outside the game folder in
`~/PatangWars-data` (change with `DATA_DIR`), so a new version never touches coins or kites.

## 3. Release a new Android APK

Everything is automatic once a change is pushed to `main`:

1. Change the version in **both** `package.json` and `app/package.json` (and `client/index.html`, the line with
   `set-ver`), and add a section to `CHANGELOG.md`.
2. Commit and push to `main`. Any change under `client/`, `app/`, `build.js` or the workflow starts
   **Actions → Build Android app** (about 3-4 minutes).
3. When it finishes, a new **Release** appears on GitHub (`v1.7.1-build6` style) with `BoKata-….apk` (install on a phone)
   and `….aab` (Google Play). Releases page: https://github.com/amaadmirza/patang-wars/releases
4. Phones install the new APK over the old one and keep their coins and kites — as long as every build is signed with the
   same key. The key lives in the repository secrets `ANDROID_KEYSTORE_BASE64` and `ANDROID_KEYSTORE_PASSWORD`
   (`app/README-APP.md` explains how the first run makes it). Never delete those secrets.

You can also start a build by hand: Actions → Build Android app → Run workflow.

## 4. The game code (client/src)

| File | What it does | Shared with the server? |
|---|---|---|
| `game.js` | Everything you see and touch: menus, shop, settings, match loop, bots (`botInput`), camera, all drawing (`drawWorld`, `drawKite`, `drawSail`, `drawPerson`), HUD, touch controls, zoom slider, splash, tutorial, online client, phone-app hooks | no |
| `physics.js` | The kite flight model: wind, lift, line, tension, steering rate, dheel/khainch, cartwheel, cut kites falling | **yes** (online) |
| `pecha.js` | Pecha rules: hooking, who saws whom, upar/neeche, jhatka, up to 2 pechas on a line | **yes** |
| `economy.js` | Coins, prices, shop, crates, daily login, gift, Mohalla career, retired kites and refunds | **yes** |
| `data.js` | Kite shapes (patang, tukkal ...) with their flight numbers, strings (threads), colours | yes |
| `catalog.js` | The list of picture kites — **generated**, don't edit (see 6.1) | yes |
| `kitemaker.js` | Kite workshop (repaint a kite) and the 20 flag kites | no |
| `fliers.js` | The people on the roofs (drawn, not pictures) | no |
| `sound.js` | All sound and music (made in code, no audio files needed) | no |
| `art.js`, `trophies.js`, `boot.js`, `env.js` | SVG kite art, trophies, theme before first paint, dev flag | no |

Anything marked **shared** also runs on the server; after changing it run `npm test` — online matches depend on both
sides agreeing.

## 5. Where to change common things

Search for the quoted text in the file to find the exact line.

### Kite feel and look
| Want | File | Search for | Notes |
|---|---|---|---|
| How fast a kite turns by itself when left alone | `game.js` | `IDLE GHOOMNA` → `(2.6 + loose * 1.6)` | rad/s; 3.8 ≈ 218°/s for a patang. Delay before it starts: `k.idleT > 0.3`. Chance it reverses: `Math.random() < 0.3` |
| Switch the self-turn off by default | `game.js` | `saved.idleSpin !== false` | players can also switch it in Settings → General |
| Spin on dheel | `game.js` | `GHOOMNA on dheel` → `(1.6 + loose * 6.4)` | |
| Steering speed | `physics.js` | `const MAX_TURN = 6.3` | rad/s at full steer; players also have Settings → Steering speed |
| How much the sail bends / rocks / flutters | `game.js` | `function kiteAtt` → `a.bow`, `a.flA`, `70 * (rT - a.r)` | bow is a fraction of kite width |
| Sail drawn flat again (old look) | `game.js` | `function drawSail` → `cols = devPx < 28 ? 1` | make it always 1 col / 1 row |
| Slack line droop | `game.js` | `function lineVis` → `dist * 0.085`, `* 0.16` | drawing only |
| Kite size on screen | `game.js` | `function kiteSize` | |

### Screen, camera, controls
| Want | File | Search for |
|---|---|---|
| Zoom range | `game.js` | `ZOOM_MIN = 0.55, ZOOM_MAX = 2.2` |
| Zoom slider position / size | `index.css` | `#zoomSlider{` |
| Touch buttons | `index.html` `#touch`, `index.css` `#touch button` (players can also move them: Settings → Controls → Customize buttons) |
| Keyboard keys | `game.js` | `solo: { thrust: ['arrowup']` |
| Graphics sharpness | `game.js` | `const QUAL = { scale: 2, max: 2, min: 1` (never below 1x; Battery saver = 1x) |
| Smoothness after a slow frame | `game.js` | `const cap = G.online ? 12 : 4` |
| Splash → home hand-over | `game.js` | `SMOOTH HAND-OVER` |

### Kites, prices, rewards
| Want | File | Search for |
|---|---|---|
| Price of a kite | `economy.js` | `function kitePrice` (by rarity: Free / 120 / 250 / 450; flag kites 150) |
| Free starter kites | `economy.js` | `FREE_KITES` |
| String / reel / flier prices | `economy.js` | `THREAD_PRICE`, `SPOOL_PRICE`, `CHAR_PRICE` |
| Coins per match | `economy.js` | `const PAY = { cut: 10, caught: 8, win: 40` |
| Daily login, gift, crates | `economy.js` | `LOGIN`, `GIFT`, `CRATES` |
| Mohalla career | `economy.js` | `MOHALLAS` |
| A kite's name | `client/tools/kite-names.json` then rebuild the catalog (6.1) |
| Flag kites | `kitemaker.js` | `const FLAGS = {` |
| Skies (scenes) | `game.js` | `lahore: { name: 'Lahore Rooftops'` and `STAGE_ORDER` |
| Bot difficulty | `game.js` | `const DIFFICULTY = {` |
| Rooftop people | `fliers.js` | `PRESETS` |

## 6. Recipes

### 6.1 Add or remove a kite picture
1. Put the PNG (transparent background, kite pointing up) in `client/assets/kites/patang/` or `.../tukkal/`.
   The folder decides how it flies. The file name becomes the name (`lal-baaz.png` → "Lal Baaz") unless
   `client/tools/kite-names.json` gives one.
2. `node client/tools/build-catalog.js` — rewrites `client/src/catalog.js`.
3. **Removing** a kite people may have bought: also add its id and its old price to `RETIRED_KITES` in `economy.js`
   (`kitePrice(id)` tells you the price). Owners then get the coins back once, automatically, and a message.
4. Website: `cd website && python3 scripts/sync-images.py .. . && node scripts/sync-data.cjs .. .`

### 6.2 Change a text the player sees
Screens and buttons are in `client/index.html`. Tutorial steps: `game.js`, search `const TUT = [`
(`text:` for keyboard, `touch:` for phone buttons, `swipe:` for swipe controls). Help screen: `index.html`, `id="how"`.

### 6.3 A new setting switch
`game.js` → `function renderQuick` has the list of switches (`['idleSpin', 'Kite turns when left alone', ...]`). Add one
line with an id, a label, a getter and a setter on `saved`; read it where needed as `saved.yourId`.

### 6.4 Publish the website
`cd website && npm install && npm run build`, then put `website/dist` on any static host (Netlify, GitHub Pages,
cPanel). First set your links in `website/src/config.js` (`playUrl`, `apkUrl`).

## 7. How the main systems work (short)

- **Match loop** (`game.js` `function loop`): physics at a fixed 120 steps a second, drawn at the screen's rate in
  between (smooth on 60-144 Hz). After a slow frame it catches up at most 4 steps offline.
- **Flying** (`physics.js`): the nose points where you steer; FLY pushes along the nose; the line holds the kite on a
  sphere around your hand; the wind window runs out of power at the edges and overhead.
- **Turning by itself** (`game.js`, `IDLE GHOOMNA`, v7.1): left alone, the *sail* turns (`k.idleAng`) while the line keeps
  the kite hanging in its hover; the moment you pull, tunka or steer, `kiteTakeAim` makes the kite fly where its nose was
  showing. Measured against the reference video (~150-220°/s); see `screenshots-v7.1/rotation-reference-vs-v70-vs-v71.png`.
- **Drawing a kite** (`drawKite` → `drawSail`): the picture is cut into a small grid and each cell placed in 3D (bow,
  bank, pitch, flutter, shading) using mipmapped copies of the picture.
- **Pecha** (`pecha.js`): crossing lines hook; moving line through the crossing saws; from on top dheel cuts best, from
  below khainch; online the server runs the same code and decides every cut.
- **Coins and shop** (`economy.js`): offline the rules run on the phone; online the server runs them on checked match
  results (`server/anticheat.js`), so a browser can't give itself coins.
- **Online** (`server/rooms.js`, `ws.js`): rooms with a 4-letter code, up to 10 players, the server simulates pechas
  30 times a second.

## 8. Testing before a release

```bash
npm test                                   # 121 tests, must all pass
node client/tools/test-physics.js          # 50 flight checks
npm install --no-save playwright && npx playwright install chromium   # once, for the tools below
npm run build && npm start                  # in one terminal (port 8080)
node tools/qa/sqa.js http://localhost:8080/ web-desk desk            # 28 UI steps, computer size
node tools/qa/sqa.js http://localhost:8080/ web-phone phone          # 28 UI steps, phone size
node build.js --app && (cd app/www && python3 -m http.server 8093)  # the phone app's files
node tools/qa/sqa.js http://localhost:8093/ app-phone phone app      # 27 UI steps, offline app
node tools/qa/online.js http://localhost:8080/                       # two players online, 10 checks
node tools/qa/perf.js http://localhost:8080/ check 20 4              # fps under a 4x slower CPU (use npm run dev)
python3 tools/qa/track.py video.mp4 5 12 label - pink                # measure a kite's rotation in a video (OpenCV)
```

Screenshots of every step go to `qa-out/`. The last full results are in `QA-REPORT.md`.

## 9. Asking for the next change

The fastest way to get a change right:
- **What and where:** the screen or mode (Festival, Duel, Mohalla, Online), phone or computer, and the phone model.
- **Show it:** a screen recording or screenshot of the problem, and — for "make it feel like X" — a video of X. The
  rotation fix in v7.1 came from measuring your video frame by frame.
- **The version** you are on (Settings, bottom of the Profile tab, e.g. "v7.1").
- **Keep or change:** say if something should become a setting players can switch, or change for everyone.

## 10. Version history (short)

| Version | Main changes |
|---|---|
| 7.1 | Kite turns by itself when left alone (measured from the reference video); bowed 3D paper sails, bank, rock, flutter, line droop; zoom slider on the left; smoother pechas and sharper phone graphics; no jerk after the splash; retired the Saudi flag kite and the Pipa/Raia/Dabba/Parinda/Sitara kites (full refunds); Vue website; full SQA |
| 7.0 | New name Bo Kata!, smaller loot window, real pause menu on phones, faster phone menus, clean shout voice |
| 6.5 | Softer pecha sound, thinner lines, max 3 lines in a tangle, phone zoom |
| 6.4 | Upar/neeche pecha rules, jhatka, joining a pecha, better flying for beginners, calmer music |
| 6.3 | New home screen, daily login, gift, crates, records kept outside the game folder |

Full details: [CHANGELOG.md](CHANGELOG.md).
