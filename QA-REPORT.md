# Phone app (offline) — SQA

| Check | Result |
|---|---|
| App bundle (`node build.js --app` → `app/www`) in phone browsers 844x390, 740x360, 1024x768, with stand-ins for the native parts | 75 / 75 |
| — no request to any server (API or WebSocket) during a full session | 0 calls |
| — first launch, daily prize, "You received", shop purchase kept after restarting the app, all modes, Mohalla, tutorial | pass |
| — Android back button (panel → pause → home → exit), app in background pauses, haptics, system bars hidden | pass |
| `scripts/patch-native.js` on Capacitor 8 template files: landscape, VIBRATE, immersive MainActivity, versions, Info.plist (valid plist), run twice | pass |
| Generated `MainActivity.java` compiled against the Android/Capacitor API signatures | pass |
| Workflow: YAML structure, 9 shell steps (`bash -n`), signing-key step run for real (PKCS12 key, password masked) | pass |
| Web game + server after the app changes: `npm test` 121, match flows 48, online 6 | pass |

Not run here: the full Gradle / Xcode builds themselves — this workspace cannot download Google's Android SDK or run
Xcode. They run on GitHub's machines (Actions). If a run fails, send me the red step's log.

---

# Patang Wars v6.4 — SQA report

Package 1.6.4. Same tools as v6.3 (Chromium desktop + phone emulation, CPU slowed 4x for phones), plus new measurements
for flying, pecha tactics, joining a pecha, and the music (recorded from the game's own audio output and analysed).

## Results
| Suite | Result |
|---|---|
| `npm test` — server, anti-cheat, rooms | 57 / 57 |
| `npm test` — online multiplayer | 32 / 32 |
| `npm test` — purchases & records | 21 / 21 |
| `npm test` — **new** joining a running pecha, online, server-decided (`multipecha.test.js`) | 11 / 11 |
| `client/tools/test-physics.js` | 50 / 50 |
| Browser: match flows, every mode, desktop + phone | 48 / 48 |
| Browser: purchases survive reloads / bad network / cookies / 2nd phone / old saves | 15 / 15 |
| Browser: online, desktop host + phone guest | 6 / 6 |
| Browser: UI sweep, 11 screen sizes, production build | 0 issues |
| Phone performance (844x390 @3x, CPU 4x slower) | 40.7 fps, 1.6% frames over 50 ms (unchanged from v6.3) |

## 1. Kite flying — measured with a "beginner" test player (3 min, holds Fly 55% of the time, random steer taps)
| Kite | Above 15 m: before → after | Median height | Crashes into the roof | Launch |
|---|---|---|---|---|
| Patang (Lal Hukam) | 28% → 92% | 11 → 40 m | 1 → 0 | 4.6 → 3.0 s |
| Tukkal | 33% → 94% | 12 → 67 m | 3 → 0 | 4.5 → 2.9 s |
| Dabba (box) | 26% → 92% | 10 → 38 m | 1 → 0 | 4.6 → 3.0 s |
| Raia (delta) | 37% → 92% | 11 → 40 m | 0 → 0 | 4.6 → 3.0 s |

Causes found: Fly overhead had no power (top of the wind window) and nothing let line out; a 0.5 s steer turned the nose
upside down (360 deg/s from the first instant) and Fly then drove it into the roof at 13 m/s; a kite on the roof ignored
Fly/tunka for 4 s. Fixes: line slips out on the climb when overhead (only above ~68 deg, never past 60 m by itself); a low
nose-dive becomes a skim (high up a dive stays a dive); Fly/tunka relaunches from the roof; steering ramps 40% → 100% over
0.3 s (a tap is ~20 deg, a hold is still full speed; bots unchanged); faster launch out with the wind. Scripted
manoeuvres re-checked: hover, climb, steer-and-fly, tunka, dheel, khainch and circles all behave; a dive from 22 m pulls
out at 5 m instead of crashing.

## 2. Pecha — 20 fights per strategy against a Normal bot (browser, real input keys)
| Strategy | Won | Lost | Released | Win rate of decided |
|---|---|---|---|---|
| Hold still | 2 | 7 | 11 | 22% |
| Wrong move for your side | 4 | 9 | 7 | 31% |
| Khainch only | 7 | 8 | 5 | 47% |
| Khainch + jhatka taps | 8 | 7 | 5 | 53% |
| Dheel only | 9 | 4 | 7 | 69% |
| **Right move for your side** (dheel on top, khainch below) | **11** | 5 | 4 | **69%**, most fights decided |

New: upar/neeche bonus, jhatka (rate-limited, same rule on the server), your line white-edged / theirs dark-edged
(they were both red/pink and indistinguishable), HUD tells you the best move. Phone frame sequences checked.

## 3. Joining a running pecha
- Rule in the shared `pecha.js`, so offline and the online server are identical: up to 2 pechas per line (3 lines per tangle).
- Festival, 10 kites, Hard, 4 min: 13.7 s of 3-line tangles, never more than 2 rivals on one line, 69 cuts, no errors.
  Mohalla 3v3: 11 s of tangles (team-mates helping), 28 cuts, no errors.
- Online (3 real WebSocket players): A and B hooked and holding, C crosses A's line and hauls → A cut in 4.1 s,
  **credited to C**.
- **Bug found and fixed while testing:** with two lines on one kite, the cut went to whichever pair pushed the wear past
  100% — often the line that had barely touched it. Credit now goes to whoever did the most cutting in the last ~3 s
  (client and server, cuts and snapped-while-sawn lines).

## 4. Music — recorded from the game and analysed
- Before: drums on nearly every beat for minutes with no breaks, short melody loops, a sub-bass boom under 85 Hz
  (phone speakers just rattle), and in a match the menu music, the rooftop DJ (128 bpm) and the dhol party all at once
  over wind and kite sounds.
- After: drums in 8-bar sections (light intro, full, light, a break with only the melody, ...); softer dhol, chimta and
  shehnai; high-pass 85 Hz, low-pass 7 kHz, compressor; default 40% (was 60%; a volume you set yourself is kept); in a
  match the music sits at 55% and the rooftop party ducks under it; fades between tracks; the Mix starts with the calm
  bansuri and leaves out the dhol-only loop. Measured: menu −34 dB (was −29), intro −42 dB building up.

## 5. Online on the rail
Second on the left rail, green, labelled, with a live dot, on every screen size. Opened from a file it explains that the
game server is needed instead of disappearing.

## Known limits
- Music judged by measurement and spectrograms, not by ear — please listen on your phones and tell me which track still bothers people.
- Real-device testing (iPhone/Safari, low-end Android) still recommended.

---

# Patang Wars v6.3 — SQA report (web + mobile)

Build tested: v6.3 (package 1.6.3), production bundle (`npm run build && npm start`) and the dev build. Chromium, desktop
and mobile emulation (touch, device pixel ratio 2–3, CPU slowed 4× to stand in for a mid-range phone).

## Results
| Suite | Result |
|---|---|
| `npm test` — server, anti-cheat, rooms (`run-tests.js`) | 57 / 57 |
| `npm test` — online multiplayer, 10-player room, Mohalla teams (`multiplayer.test.js`) | 32 / 32 |
| `npm test` — **new** purchases & records (`persistence.test.js`) | 21 / 21 |
| `client/tools/test-physics.js` | 50 / 50 |
| Browser: purchases survive reloads, network failure, cleared cookies, second phone, old saves | 15 / 15 |
| Browser: every mode to results → Play again → Menu, Land & swap, replay, settings mid-match (desktop + phone) | 48 / 48 |
| Browser: online, 2 browsers (desktop host + phone guest): create → invite link → join → match → leave | 6 / 6 |
| Browser: UI sweep, 11 screen sizes, production build | 0 issues (after the fixes below) |

**Screen sizes:** 1920×1080, 1366×768, 1280×720, 1024×600, tablet 1024×768 (touch), phones landscape 932×430, 844×390,
740×360, 667×375, phones portrait 390×844, 360×740. On each size: the home layout was measured (nothing off screen or
overlapping, no sideways scrolling, touch targets at least 32 px); every hub button was opened and closed (Shop, coins,
Collection, Leaderboard, Trophies, How to, Settings + all 7 tabs + all 8 switches, Daily, Free gift, Mohalla, Kites,
Online); every shop tab including Crates; stage arrows, Bots and Mode; Festival, Duel, Two players, Tutorial and a
Mohalla career fight were started, paused and left. Page errors were collected throughout.

## What the 7 requests turned into
| # | Request | Done |
|---|---|---|
| 1 | Rename the kites in the assets folder | 208 pictures renamed to proper names and sorted by kind into `assets/kites/patang, tukkal, pipa, raia, dabba, parinda, sitara`. The folder now decides how a kite flies. Old ids are migrated everywhere (purchases, collection, saved pick, workshop kites, online gear, the server's records), and every price is unchanged (checked for all 207 old ids). 12 pictures of other companies' characters/logos were moved to `unused-assets/kites/`. |
| 2 | Pecha details in the centre block the pecha | The centre panel is gone. Pecha details now sit in your own card (top-left); the pecha banners are small and low. Verified on phone screenshots: the crossing and both kites stay clear. |
| 3 | Work more on the pecha | Camera zooms onto the fight, a ring at the crossing (green = you cut, red = you're being cut, arrow = on top/below), bold hooked lines, glowing KHAINCH/DHEEL buttons, red screen edges + vibration when your line is nearly through. **Mechanics:** a held khainch used to drag the kite onto the roof, which ends the pecha with no result — 10 of 14 fights. Khainch now lifts the kite, as a real haul does: 12 of 14 fights end in a cut. Holding still still loses (0 of 14 won). |
| 4 | Mobile stutter | Rooftop figures were redrawn from scratch every frame (37% of all CPU). They are now sprites refreshed ~10×/s (your own ~25×/s), staggered so they never land on one frame; reel SVGs decoded once. 4×-slowed CPU, 844×390 @3×: **27.7 → 43.7 fps, frames over 50 ms 12% → 1.5%** (prod build); drawing 25 → 6.7 ms a frame. |
| 5 | Bought kites removed on restart | Found 5 causes, all fixed and tested (see "Bugs"): records inside the game folder, a 3 s write delay, one failed request switching to an empty wallet, kites swapped out while loading, no way back after cookies are cleared. Added Settings → Profile → **Backup your account** (Player ID + code). |
| 6 | Complete SQA on mobile and web | This report. |
| 7 | Game flow like the video | New home hub: left rail, rank + coins on top, stage selector with your kite flying in it, big Play with Bots/Mode beside it, events column with red "!" badges, settings gear in the corner; 7-day **Daily login** with a crate on day 7, **Free gift** every 4 h, full-screen **"You received"**, **Crates** in the shop; Settings → General switch grid. Server-checked: nothing can be claimed twice. |

## Bugs found and fixed
| # | Severity | Bug | Fix |
|---|---|---|---|
| 1 | Critical | Player records lived in `data/` **inside** the game folder. Unpacking a new version into a new folder started every player from 300 coins and nothing bought (and a new cookie key logged everyone out) | Records live in `~/PatangWars-data` (outside the game). On first start the newest old `data/` next to it is imported, key included. Service file pins `DATA_DIR`. |
| 2 | High | A purchase reached disk only at the next 3 s save: a crash or closed console window lost it | Purchases, prizes and match pay are written within 0.25 s; records also saved on exit and crash |
| 3 | High | One failed `/api/profile` (server restarting, Wi-Fi blip, rate limit) switched the whole session to this browser's own empty wallet — looked exactly like "all my kites are gone" | Cached record stays on screen; retried with back-off. Only a server without the API (404) plays locally |
| 4 | High | Tapping Play before the record arrived "swapped your kite for a free one" — permanently | Loadout is never changed while the record is still loading |
| 5 | High | Cookies cleared / other browser: no way to get your coins back | Backup code + Player ID; automatic restore when the browser still remembers the code |
| 6 | High | Pecha centre panel covered your kite and the crossing | Moved into your own card |
| 7 | High | Held khainch ended most pechas on the roof with no result | Pecha khainch lift |
| 8 | High | Phones: frames over 50 ms in 12–32% of frames | Figure sprites |
| 9 | Medium | Crash "Cannot read properties of null (reading 'feed')" when leaving a match while a bot was about to talk | Guarded |
| 10 | Medium | Online: "Playing as Asif" shown, but create/join refused with "Choose a name first" when the server's record had no name | The remembered name is re-registered on connect |
| 11 | Medium | Portrait mid-match: the rotate cover hid everything, no way to leave | "Back to home" on the cover |
| 12 | Medium | Shop could sell kite ids that are not in the game | Server checks the catalog |
| 13 | Low | Duel win said "You win the festival!" | "You win the duel!" |
| 14 | Low | Two different pictures were both called `tk5.png` (one was never shown) | Both kept, now Tukkal Hara and Tukkal Pipal |
| 15 | Low (found in my own new code during QA) | Free gift could be claimed twice (a 32-bit truncation of the time); daily popup could open over a match | Fixed before release |

## Known limits
- Emulated phones in headless Chromium have no GPU, so the fps numbers are pessimistic; compare before/after, not the absolute value. Please also try it on your own phones.
- Online in the reconnect path and Safari/iOS were not tested on real devices here.
- Server records are a JSON file; fine for this size. Back up `~/PatangWars-data` — it holds every player's coins and the cookie key.

---

# Patang Wars v6.1 — QA report

Build tested: v6 (package 1.6.0). Tested in Chromium (desktop and mobile emulation). I drove the game both in a real browser session and in sped-up simulation.

## Results
| Suite | Result |
|---|---|
| `npm test` (server, anti-cheat, online rooms, 10-player room, mohalla) | 32 / 32 pass |
| `client/tools/test-physics.js` | 50 / 50 pass (steering test updated to the new 360°/s spec) |
| Production bundle (`npm run build`), served by the server and opened as a file | Loads and plays, no console errors, test hook compiled out |
| Online: 2 browsers (desktop host + phone guest), create → invite link → join → match → disconnect | Pass |

## Coverage
- **Modes:** Festival, Duel, Two Players (shared and split), Mohalla quick match, Mohalla career rung, Tutorial, Online. Each one was started, played with random key presses, finished, then Play again, Menu and Esc were tried.
- **Screens:** splash, name, menu, Settings (all 6 tabs), How to play, Shop (buy, can't afford), Collection, Leaderboard, Trophies, kite select, kite swap (Land), results, pause, button editor.
- **Screen sizes:** 1920×1080, 1366×768, 1280×720, 1024×600; phone landscape 844×390, 740×360, 667×375; phone portrait 414×896, 390×844, 360×740, 375×667. The menu fits without scrolling on all of them.
- **Input:** keyboard, mouse, touch buttons, swipe controls, dragging in the button editor, double-click and double-tap.
- **Edge cases:**
  - localStorage blocked, corrupt JSON, wrong-typed or removed saved values
  - window resize mid-match, tab hidden (auto-pause), Settings opened mid-match (pauses offline, keeps running online)
  - manual pause kept after closing Settings
  - bots set to max (9) and to 0, zoom at both limits
  - bad names (empty, 1 character, spaces, HTML, too long, emoji)
  - bad room codes, player disconnecting mid-match, Reset settings

## Bugs found and fixed
| # | Severity | Bug | Fix |
|---|---|---|---|
| 1 | High | Kite steering felt slow (147°/s) and the dheel spin was slow (one turn per ~1.8 s) | About 360°/s steering and one spin per second on dheel. New *Steering speed* setting (Smooth / Quick / Sharp) |
| 2 | High | The main menu scrolled after the splash screen (the settings card made it 778 px tall on a 720 px screen) | All settings moved to a new **Settings** page; menu layouts tightened for every size |
| 3 | High | A tie on 0 points showed "You win the festival!" and paid win coins and XP; staying idle until the timer ran out was a free win | Ties are no longer wins (honest placing for the results and the server record); new titles "No winner - nobody scored" and "Tied at the top!" |
| 4 | High | A new player's first real match (with the tips on) paid no coins or XP and wasn't recorded, even after cutting kites | Only the menu Tutorial is unpaid; real matches always count |
| 5 | High | A damaged or old save (unknown kite, scene or thread) made every match fail to start (`Cannot read properties of undefined`) | Every saved value is checked on load and falls back to its default |
| 6 | Medium | Duel bot could hover a few metres from your kite for minutes without crossing your line (it aimed at a spot outside its wind window, and its line never paid out) | Bots aim at a spot on your line they can actually reach and let line out first. Bots now hook a pecha much more often |
| 7 | Medium | The tutorial box stayed on top of the results screen | Hidden when the match ends |
| 8 | Medium | Double-clicking a menu mode opened the "Buy" pop-up for whatever kite was under the cursor | New screen ignores taps for 350 ms |
| 9 | Low | Customize buttons from Settings showed the settings text bleeding through behind the editor | Settings hides while the editor is open and comes back after |
| 10 | Low | The Daily challenge card was a button that did nothing | Now opens a Festival |
| 11 | Low | `favicon.ico` 404 on every load | Added an SVG app icon |
| 12 | Info | The original zip shipped `data/secret.key` and `data/profiles.json` (the server's signing key and player records) | Left out of this package; the server creates a new key on first run. **If the old zip was shared, change that key.** |

## Known limits (not bugs)
- If the player keeps a very short line (~24 m) right above their own roof, a bot whose roof is downwind can only reach the tip of that line, so in a Duel it may circle close without hooking. Once you let some line out, it attacks normally.
- Shouts use the device's Urdu or Hindi voice. Without one, the game's built-in voice is used (this is shown in Settings → Sound).
- Phones: Android Chrome locks to landscape. iPhone shows a "rotate your phone" screen during matches.

## v6.1 changes (re-tested)
- New name and logo **Patang Wars** (4 concepts in `client/assets/brand/concepts/`).
- Kite pictures: the original set, unchanged.
- Re-tested: `npm test`, physics tests, every mode, edge cases, online match, menu fit on all sizes.

## v6.2 changes (compared against real pecha video)
Measured over 500 s of bot-vs-bot Duel per run (about 40 pechas each):
| | Before | After |
|---|---|---|
| Time in a pecha with a kite under 5 m above its roof | 35% | 0-1% |
| Pechas where one kite ended on the roof/ground | about half | 0 |
| Median kite height during a pecha | 11 m | 17-22 m |
| Cuts won A / B | even | even (16 / 15) |

- Bots no longer khainch or Fly with the nose pointing down during a pecha (a patang flies where its nose points, so it
  power-dived into the roofs at 10-15 m/s). The low-altitude climb rule now also applies inside a pecha.
- A kite that touches the roof or ground during a pecha releases it (`released: 'ground'`, same rule on the server).
- Cut kites flip nearly edge-on every few seconds while falling (visual only).
- Re-tested: `npm test` 32/32, `client/tools/test-physics.js` 50/50, Duel in the browser with no console errors.
