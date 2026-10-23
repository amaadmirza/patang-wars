# Bo Kata! website (Vue 3 + Vite)

The website for **Bo Kata!**, the Basant rooftop kite-fighting game: a live pecha on the home page (two real kites
from the game, tap to cut), every kite in a searchable gallery, how to play, modes and skies, downloads, server
hosting, updates, FAQ and a privacy page (needed for Google Play).

## Chalana (run it)

Node.js 18 ya naya chahiye.

```bash
npm install        # ek dafa
npm run dev        # http://localhost:5173 - change karte hi page khud refresh
npm run build      # dist/ folder - yehi website hai
npm run preview    # build ko test karein
```

## Publish karne se pehle: apne links

`src/config.js` kholein aur sirf ye teen cheezein badlein:

| Setting | Kya | Misaal |
|---|---|---|
| `playUrl` | jahan browser wali game chalti hai (aap ka Bo Kata! server) | `https://play.example.com` |
| `apkUrl` | Android APK ka download link (GitHub Releases) - khaali ho to Download page batata hai APK kaise banti hai | `https://github.com/you/bo-kata/releases/latest` |
| `sourceUrl` | aap ki GitHub repository (optional) | |

## Kahan lagayein (deploy)

`npm run build` ke baad `dist/` folder kisi bhi static hosting par daal dein - koi server setting nahi chahiye
(pages `#/kites` jaise hash links hain, aur sab raaste relative hain, is liye kisi bhi folder se chalti hai):

- **Netlify / Vercel / Cloudflare Pages:** build command `npm run build`, output folder `dist`.
- **GitHub Pages:** `dist/` ka maal `gh-pages` branch par, ya Actions se.
- **cPanel / apna nginx:** `dist/` ka maal `public_html` (ya kisi bhi folder) mein copy.

## Nayi patangein aayein to (sync from the game)

Website ka data game ke apne code se banta hai (patangein, qeematein, skies, dor, Mohalla, inaam). Game mein patang
daalne/hatane ke baad (game folder `../bo-kata-web` maan kar):

```bash
python3 scripts/sync-images.py ../bo-kata-web .   # patangon ki tasveerein -> public/kites/*.webp (Pillow chahiye)
node scripts/sync-data.cjs ../bo-kata-web .        # src/data/kites.json + game.json
```

## Folders

```
index.html            page shell, fonts (Baloo 2 + Mukta), meta tags
src/main.js           app start
src/router.js         pages (hash routes)
src/config.js         YOUR links - edit before publishing
src/styles.css        colours, type scale, buttons (shared by every page)
src/components/       PechaHero (the live pecha), SiteHeader, SiteFooter, SkylineEdge, KiteCard, KiteRack
src/pages/            Home, Kites, How to play, Modes, Download, Updates, FAQ, Privacy, Not found
src/data/             kites.json + game.json (generated from the game), rarity.js
public/               kites/ (175 WebP), screens/ (game screenshots), brand/ (logo SVGs)
scripts/              sync-data.cjs, sync-images.py
```

## Design

Basant ki dopahar: upar gehra aasman, parhne ke liye halka aasman, logo ka genda-peela, links aur dor ke liye
manjha-gulabi, jamni-siyah syahi, aur neeche Lahore ki chhaton ka silhouette. Headings Baloo 2, text Mukta.
Light aur dark dono. Phone par home page pehle text, phir pecha. Motion kam: sirf hero ki patangein, aur
"reduce motion" wale phone par wo bhi ruki hui.
