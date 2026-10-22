# Patang Wars

**Cut · Loot · Rule the sky.**  ·  *Basant ka asli muqabla — pecha lagao, Bo Kata!*

(Pehle naam: Kite Fight. Logo: `client/assets/brand/logo.svg`, emblem: `emblem.svg`, app icon: `icon.svg`.
Doosre naam/logo concepts: `client/assets/brand/concepts/` — `python3 client/tools/make-logos.py` se dobara banti hain.)

## Phone app (Android APK)

`app/` mein poori game ka **offline** phone app hai (Capacitor 8). GitHub par muft banta hai — Android Studio ya Mac ke
baghair: **`app/README-APP.md`** dekhein (qadam ba qadam). Workflow: `.github/workflows/build-apps.yml`.

## v6.5
- **Pecha ki awaaz** badli: pehle tez "beep" aur bareek si-si wali hiss thi; ab halki dor ki ragad (neechi, narm, thodi
  thar-thar) aur pecha lagne par ek chhoti si "thap". Kaafi kam shor.
- **Dor patli**: pecha mein lines ~40% patli (apni 1.6 px, doosron ki 1.1 px), halka sa saaya.
- **Pecha ke andar pecha kam**: ek line zyada se zyada **2** pechon mein (ek waqt mein 3 lines). Koi bot aap ki us line par
  nahi chadhta jo pehle se pecha mein hai — doosra pecha sirf tab jab **aap khud** kisi ke pecha mein ghusein. Pecha khulne
  ke baad 1.5 s tak wahi do lines dobara nahi phansti. Bots ka doosre ke pecha mein ghusna: Easy/Normal par band, Hard par kam.
  (Test: 4 minute festival, 10 patangein — aap ki patang 3-line pecha mein **0 s**, pehle 6–12 s.)
- **Mobile par zoom**: daayen kinare **+ / −** buttons aur do ungliyon se **pinch**. Zoom yaad rehta hai.
- **Menu aur icons naye**: rang-daar game icons, baayen rail par jis section mein hain wo peela chamakta hai, Mode aur Bots
  ab ek tasveer-wale picker se (har option nazar aata hai, chuna hua tick ke saath). Shop, Patang, Mohalla, Settings,
  Trophies, Collection — sab ek hi game style: frame, gol laal close button, peele tabs, chuni cheez par tick. Dark aur Light dono.
- Phone app ab **sirf Android** banti hai (iPhone build band).

## v6.4

- **Patang urana (flying), naap-tol ke saath behtar** — ek "naya khiladi" test player (FLY zyada, kabhi kabhi steer) ke 3 minute, 4 qism ki patangon par:
  | | Pehle | Ab |
  |---|---|---|
  | Patang 15 m se upar | 26–37% waqt | **92%** |
  | Darmiyani unchai | ~11 m (chhaton ke paas) | **~39 m** |
  | Launch | 4.6 s | **3 s** |
  | Chhat se takra kar "crashed" | 0–3 | **0** |
  - **Upar par dor dheel:** patang bilkul sar ke upar ho (hawa ki khirki ka kinara, wahan taaqat nahi) to FLY ab thodi dor chhorta hai aur hawa patang ko wapas bahar le jaati hai — asli patang baaz yehi karta hai. (60 m ke baad dor sirf DHEEL se.)
  - **Chhat mein nose-dive nahi:** neeche (12 m se kam) nose neeche kar ke FLY dabao to patang chhat mein ghusne ki bajaye sky mein seedhi skim karti hai. Upar dive ab bhi dive hai.
  - **Chhat se dobara:** patang chhat par gir jaye to FLY ya tunka se wahin se dobara uthti hai (pehle 4 s baad "crashed").
  - **Steer:** halka tap ab ~20° (pehle ~60°) — nishana lagana aasaan; dabaye rakho to wahi tez 360°/s.
- **Pecha, sach mein:**
  - **Upar ya neeche:** upar se **dheel**, neeche se **khainch** zyada kaat'ta hai. Card (upar-baayen) batata hai aap kahan hain aur kya karna hai.
  - **Jhatka:** pecha mein tunka = ek jhatka, ek pal ke liye tez kaat (har 0.3 s mein ek se zyada nahi).
  - **Apni dor pehchano:** pecha mein aap ki dor ka kinara safed, doosron ka kala (aksar dono laal/gulabi manjha hoti thi).
  - Naap: chup chaap pakre rehna 22% jeet, ulta daao 31%, khainch 47%, khainch+jhatka 53%, **sahi daao (upar dheel / neeche khainch) 69%**.
- **Chalte pecha mein shamil ho sakte ho:** agar pecha laga hua hai to teesri patang us ki dor kaat kar pecha mein aa sakti hai (do dor ek par; Mohalla mein team-mate madad ko aata hai). Ek uljhan mein 3 se zyada dor kabhi nahi. Har crossing ka apna ghera, dor dono crossings se mudti hai, card par "Pecha vs Imran +1", feed mein "Kabir joined the pecha". **Kaat usi ko milti hai jis ne zyada kaata** (pehle jo bhi aakhri hissa kaatta). Online server bhi bilkul yehi qanoon chalata hai (naya test `test/multipecha.test.js`). Bots: Mohalla mein hamesha team-mate ki madad, Festival mein kabhi kabhi (Easy par kabhi nahi).
- **Music ab tang nahi karta:** dhol ab har beat par nahi bajta — 8-8 bar ke hisse (shuru halka, phir poora, phir break jahan sirf dhun); dhol, chimta, shehnai naram; phone speaker ke liye boom aur tez seeti kaati, compressor; default awaaz 60% → 40% (jis ne khud badli wo waisi); match mein music game ke neeche (55%), aur chhat ki DJ party apni music ke saath doosra gaana nahi lagti; tracks ke beech fade; Basant Mix bansuri se shuru, sirf-dhol wala loop mix se bahar (alag se chun sakte hain).
- **Online** ab baayen rail par, Home ke baad, hara button "Online" likha hua aur laal live nishan ke saath. File se kholne par samjhata hai ke server chahiye. Trophies daayen events mein.

## v6.3

- **Naya home screen** (jaise mobile games mein): baayen taraf buttons (Home, Kites, Mohalla, Shop, Trophies), upar rank aur
  coins, beech mein chhat chunein (‹ 1. Lahore Rooftops ›) — us mein aap ki apni patang urti dikhti hai — aur bara **Play**.
  Play ke saath **Bots** (Easy/Normal/Hard) aur **Mode** (Festival / Duel / Two players). Daayen taraf events, laal "!" ke saath.
- **Daily login:** 7 din ke inaam (50 → 200 coins, 7wan din muft **Rare Crate**). Ek din chhoot jaye to reset nahi hota.
  **Free gift:** har 4 ghante 25 coins. **"You received"** screen inaam dikhati hai.
- **Crates (Shop → Crates):** Patang Crate 150, Rare Crate 320, Legend Crate 600 — aisi patang jo aap ke paas nahi.
  Sab inaam aur crates **server** tay karta hai (do dafa claim nahi ho sakta).
- **Pecha:** beech wala bara pecha panel hata diya (wo khud pecha ko dhak leta tha). Ab pecha ki maloomat upar-baayen aap ke
  card mein, aur aasman mein crossing par ek ghera: **hara** = aap kaat rahe hain, **laal** = aap kat rahe hain, teer = upar/neeche.
  Pecha mein camera dono patangon par zoom karta hai, phansi hui dor moti dikhti hai, KHAINCH/DHEEL buttons chamakte hain,
  dor kam reh jaye to screen ke kinare laal. **Khainch ab patang ko upar le jata hai** (pehle chhat par gira deta tha aur pecha
  baghair faisle ke khatam ho jata tha: 14 mein se 10). Ab 14 mein se 12 pechon ka faisla hota hai.
- **Mobile tez:** chhaton par log har frame dobara banaye jaate the — phone ka 37% waqt. Ab sprite ban kar ~10 dafa/second.
  4x dheeme CPU par: 20 → 44 fps, 50 ms se lambe jhatke 32% → 2%.
- **Khareedi patangein ab kabhi nahi jaati:**
  - player records ab game folder se **bahar** `PatangWars-data` (home folder) mein. Naya zip nikalne par pehli dafa purane
    folder ka record **khud import** hota hai (`imported player records from ...` terminal mein).
  - khareedari foran disk par (pehle 3 second tak sirf memory mein).
  - server se ek dafa jawab na aaye to game ab 300 coins wala khaali batwa nahi dikhata — purana record dikhata hai aur dobara koshish.
  - Settings → Profile → **Backup your account**: Player ID aur backup code. Doosre phone/browser par code paste karein → wahi coins aur patangein.
    Cookies saaf ho jayen to browser khud wapas le aata hai.
- **Patangon ke naam:** sab tasveerein naye naam aur qism ke folder mein: `assets/kites/patang|tukkal|pipa|raia|dabba|parinda|sitara/`
  (jaise `patang/lal-hukam.png`, `tukkal/tukkal-shahi.png`). Purane naam (patangN1, pk9, "bosta", "teste"...) khatam. Purani
  khareedi patangein, collection aur workshop patangein khud naye naam par chali jaati hain; qeemat wahi.
  Naam badalne ke liye: `client/tools/kite-names.json`. Nayi tasveer bas sahi folder mein daalein aur `node client/tools/build-catalog.js`.
  Doosri companies ke characters/logo wali 12 tasveerein (Spider-Man, Batman, Wolverine, Deadpool, Saw, Oakley, "Pipa Combate" ...)
  `unused-assets/kites/` mein — game mein nahi.
- **SQA fixes:** match chhorne ke foran baad crash (bot ka der se aane wala message); Duel jeetne par "You win the festival!";
  online mein "Playing as Asif" likha hota par room banane par "Choose a name first"; phone seedha (portrait) karne par match se
  nikalne ka rasta nahi tha (ab "Back to home"); daily login popup match ke upar khul sakta tha.
- Settings → **General**: Music, Sound, Vibration, Kite sound, Cut replays, Roof music, Battery saver, Swipe — sab switches ek jagah.

## v6.2

- **Pecha ab aasman mein:** bots pecha mein naak neeche hone par bhi khainch karte the, to patang seedhi chhaton par ja girti
  thi (bot-vs-bot pechon mein taqreeban aadhe mein ek patang chhat par lag jaati thi) aur pecha wahin zameen se chalta rehta tha. Ab bot sirf naak upar
  hone par khainch karta hai; naak neeche ho to dheel de kar patang ghoomne deta hai, phir khainch. Neeche hon to upar
  chadhte hain. Pecha ab chhaton ke upar nahi, aasman mein hota hai (jaise asal video mein).
- **Chhat par giri patang ka pecha khatam:** jo patang pecha ke dauran chhat/zameen par aa jaye, us ki dor aasman mein
  nahi rehti — pecha "released" ho jata hai (pehle zameen par pari patang bhi pecha jeet sakti thi).
- **Kati patang:** girti hui kati patang ab har kuch second baad palat kar taqreeban kinare se (patli lakeer jaisi) dikhti hai.

## v6.1

- Patangon ki asal tasveerein (Pipa Combate ki ijazat se) wapas — koi tabdeeli nahi.
- Naya naam aur logo: **Patang Wars**.

## v6 mein kya naya hai

- **Naya naam aur logo:** Patang Wars — splash, menu, browser tab icon sab naye.
- **Tez rotation:** steer ab ~360°/s (pehle ~150°/s), dheel par patang taqreeban 1 chakkar/second ghoomti hai.
  Settings → Gameplay → **Steering speed**: Smooth / Quick / Sharp.
- **Settings page:** saari settings ek jagah (Sound, Music, Gameplay, Controls, Display, Profile). Menu se **Settings**,
  ya match mein ⚙ button / pause screen se. Offline match settings khulne par ruk jata hai.
  Naye options: Sound effects On/Off, Steering speed, Graphics (Auto / High / Battery saver), Full screen, Reset settings.
- **Menu scroll khatam:** main menu ab har screen (desktop, laptop, phone landscape/portrait) par bina scroll ke poora aata hai.
- **QA fixes:** 0-0 match ab "jeet" nahi (pehle muft win coins milte the); naye player ka pehla match ab coins/XP deta hai;
  results par tutorial box nahi rehta; bots ab dor tak pohanch kar pecha lagate hain (Duel mein bot paas mandlata rehta tha);
  kharab/purani save se match start na hone ka crash; double-tap se ghalti se "Buy" khulna; Daily challenge card ab Festival kholta hai;
  favicon 404.

# Server + online multiplayer

Game ek Node.js server par chalti hai. Aap usay kisi IP aur port par chalate hain (jaise `http://192.168.1.10:8080`),
dost wo address browser mein kholte hain, apna **naam** daalte hain, aur **Online** mein ek hi aasman par pecha lagate hain.

---

## 1. Pehli dafa chalana

**Node.js** chahiye (version 18 ya naya) — https://nodejs.org se "LTS" install karein. Check: `node -v`

1. Zip ko kisi folder mein nikaalein, maslan `C:\kite-fight` ya `~/kite-fight`.
2. Patangon ki tasveerein `client/assets/kites/` aur background `client/models/panoramic/` mein pehle se hain.
3. Us folder mein terminal kholein (Windows: folder mein address bar par `cmd` likh kar Enter) aur chalayein:
   ```bash
   npm install          # sirf ek dafa (build tool)
   npm run build        # game tayyar karta hai  - har code change ke baad dobara
   npm start            # server chalu
   ```
4. Terminal mein aisa likha aayega:
   ```
   Patang Wars on http://0.0.0.0:8080
     open on this network:  http://192.168.1.10:8080
   ```
   Apne computer par `http://localhost:8080` kholein. **Doston ko neeche wala address dein** (`192.168.1.10:8080` aap ka apna hoga).

Band karna: terminal mein `Ctrl + C`. Port badalna: `PORT=3000 npm start` (Windows cmd: `set PORT=3000 && npm start`).

---

## v5 mein kya naya hai

- **Pecha:** dor ek doosre par charh jaye to pecha ab tikta hai (pehle aadhe second mein "release" ho jata tha). Ab
  **khainch** aur **dheel** dono asal mein kaatte hain — jo apni dor zyada chalata hai wo jeetta hai; dor rok ke
  rakhoge to kat jaogi. Aam pecha 5-9 second chalta hai, sirf takrane se patang nahi katti.
- **Smooth controls:** har frame physics ke darmiyan theek waqt par draw hota hai (60/90/120/144 Hz screen par jhatke khatam).
- **Dheel:** patang dheel par tezi se door bhaagti hai (~8 m/s) aur ghoomti hai; khainch 8 m tak kaam karta hai.
- **Mobile swipe controls:** Settings → Controls → **Swipe**: neeche khencho = FLY, aur neeche = KHAINCH, upar = DHEEL,
  daayen/baayen = steer, tap = tunka. Buttons wala tareeqa bhi mojood hai.
- **Kite select:** click par page ab jhatka/scroll nahi karta.
- **Looters & log:** giri hui patang zameen par phisalti nahi rehti; loot camera theek; bots ab dor par hamla karte hain.
  Rooftop log ab kam cartoon: asli tanaasub (chhota sar), chhoti aankhen, roshni aur saaya.

## v4 mein kya naya hai

- **Patang ki awaaz:** asli kaghaz wali *pharpharahat* (phar-phar) — koi seeti ya tone nahi. Settings → **Kite sound** On/Off.
- **Controls:** steer ab ek seedhi raftaar se ghumata hai aur chhorte hi ruk jata hai; nose wahin rehti hai jahan chhora,
  phir **Fly** dabao to patang usi taraf jaati hai (pehle Fly ~2 m/s par atak jaati thi, ab ~10-12 m/s). Hawa ki khirki
  (wind window) ke kinare aur bilkul upar patang ki taaqat khatam ho jaati hai. Dheel mein dor sirf utni nikalti hai jitni
  patang kheenchti hai, is liye dheel ke baad tunka foran kaam karta hai.
- **Music:** Settings → Music → **Choose…** — Basant Mix, Basant Bhangra (Lahore), Uttarayan Garba, Sufi Qawwali,
  Rooftop Dhol, Evening Bansuri, ya **Your songs**. Volume slider. **+ Add songs** se apne mp3/m4a/ogg gaane daal sakte
  hain (browser mein save rehte hain). Server par sab ke liye gaane: files `client/assets/music/` mein daal dein.
  `B` key / ♫ button agla track.
- **Shouts:** "Bo kaata!", "Kat gayi oye!", "Urr gayi patang!" ab **Urdu ya Hindi** awaaz mein (Settings → Shouts).
  Device ki Urdu/Hindi voice use hoti hai (Chrome/Edge mein hoti hai); na ho to game ki apni awaaz — English kabhi nahi.

---

## 2. Dost ke saath kaise khelein

**Aap (host):**
1. Game kholein → **Tap to play** → apna **naam** likhein (pehli dafa sirf) → **Continue**.
2. Menu mein **Online** → *Create a room* (scene aur match ki length chunein: 2/3/5 min, No limit, First to 5 / 10 cuts) → **Create room**.
3. Aap ko ek **room code** (jaise `HKET`) aur **invite link** milega → **Copy** kar ke WhatsApp par bhej dein.

**Dost:**
1. Aap ka bheja link kholta hai (jaise `http://192.168.1.10:8080/?room=HKET`) → **Tap to play** → apna **naam** likhta hai
   → seedha aap ke room mein. (Ya: Online → *Join a friend* mein code likh kar **Join**, ya *Open rooms* list se.)
2. *Change kite & gear* se apni patang, dor, charkhi, flier chun sakta hai.

**Phir:** sab room mein aa jayen to host **Start match** dabata hai. 10 tak players. Match ke baad **Back to room** se
dobara khel sakte hain.

Online mein har koi apni chhat se, apni patang urata hai. Kis ki dor kati, score, waqt aur jeet — **sab server
faisla karta hai**, is liye koi cheating se jeet nahi sakta. Online records aur trophies bhi server par save hote hain.

---

## 3. Dost kahan se khel sakta hai?

| Dost kahan hai | Kya karna hai |
|---|---|
| **Usi Wi-Fi / ghar / office** mein | Kuch nahi — `http://AAP-KA-IP:8080` kaafi hai (terminal mein dikhta hai). Windows pehli dafa "Allow access" poochhe to **Allow** karein. |
| **Internet par, kahin aur** | Neeche teen mein se ek tareeqa |

**Internet ke tareeqe:**
- **Tunnel (sab se aasaan, router ko chhede baghair):** [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/do-more-with-tunnels/trycloudflare/) install kar ke
  `cloudflared tunnel --url http://localhost:8080` chalayein — ye ek `https://....trycloudflare.com` link deta hai, wohi
  dost ko dein. (ngrok bhi isi tarah kaam karta hai.)
- **Router port forwarding:** router settings mein port `8080` ko apne computer ke IP par forward karein, aur dost ko apna
  public IP + port dein (google par "what is my ip"). Har router ka tareeqa alag hota hai.
- **VPS / cloud server (hamesha online):** game ko server par rakhein — section 5.

---

## 4. Development

`npm run dev` — build ke baghair seedha `client/` se chalta hai, test hook (`window.__game`) on.
`npm test` — 68 tests: security, cheating ke case, online rooms, aur ek poora online pecha jo server khud kaat'ta hai.

---

## 5. Hamesha chalta rahe (VPS) + HTTPS

- `deploy/kite-fight.service` (systemd): crash ya reboot ke baad game khud dobara chal jati hai — instructions file mein.
- Public domain par HTTPS: `deploy/nginx.conf` + `certbot`. Is surat mein server ko `HOST=127.0.0.1 TRUST_PROXY=1` ke saath chalayein.

| Setting | Default | Kaam |
|---|---|---|
| `HOST` | `0.0.0.0` | kis IP par sune |
| `PORT` | `8080` | kis port par |
| `SECRET` | khud banta hai (`data/secret.key`) | player cookies ka signature (32+ characters) |
| `TRUST_PROXY` | off | sirf nginx/Cloudflare ke peeche `1` |
| `DATA_DIR` | `~/PatangWars-data` (game folder se bahar) | players ka record — **backup lein, kisi ko na dein** |

Health check: `http://IP:PORT/healthz` (kitne log online, kitne rooms, kitne match chal rahe).

---

## 6. Security — mukhtasar

- **Online:** har player sirf apni patang bhejta hai; server check karta hai (speed, dor ki lambai, apni line par rehna).
  Pecha server par 30 dafa/second chalta hai — kaatna, score, waqt, jeet sirf server ka faisla. Teleport ya lag wali
  patang thodi der pecha se bahar rehti hai (koi cut nahi jeet sakti); bilkul namumkin harkatein → kick.
- **Offline matches:** server ka token + nateeje ki jaanch; namumkin nateeje rad.
- Naam aur kite ke naam escape hote hain; dusri website se API/WebSocket band; sakht Content-Security-Policy;
  rate limits; sirf `dist/public` ki files; server ka koi bahar ka package nahi.
- Code ek mangled bundle mein (68 KB brotli). Browser ka code 100% chhupaya nahi ja sakta — isi liye faislay server karta hai.

## Folders

```
client/   game ka source (index.html, css/, src/) + assets/ (original patangen, logo)
server/   server.js (pages + API), rooms.js (online), anticheat.js, store.js, ws.js
build.js  client/ -> dist/public (bundle + minify)
test/     npm test
deploy/   systemd + nginx examples
~/PatangWars-data/  (khud banta hai, game folder se bahar) records + secret key
```

---

## 7. Is update mein kya badla (v1.2)

- **UI/UX:** naya main menu (do column, icons, settings ek card mein); dropdown (Scene / Match) ka font ab dark aur light
  dono theme mein saaf nazar aata hai.
- **Mobile sirf landscape:** phone par game full screen ho kar landscape mein lock hoti hai (jahan browser ijazat de,
  maslan Android Chrome); iPhone par seedha pakarne par "Phone ko landscape mein ghumayein" ki screen aati hai. Kite /
  dor / flier chunne wali screen landscape phone par do column mein hai, aur match ke dauran upar ki bar chhoti hai.
- **Pecha:** pehle wala (original) pecha hi rakha gaya hai.
- **Khainch:** hath-ba-hath — har khainch par dor jhatke se andar aati hai aur patang apni naak ki taraf lapakti hai.
- **Pharpharahat:** kaghaz ki karkarahat jaisi chhoti chhoti phar-phar, be-qaida waqfon par (engine jaisi lagatar
  awaaz nahi); hawa, mod aur khainch par tez.
- **Kati patang:** zyada tar daayen-baayen aahista jhoolti hai aur kabhi kabhi dheere se mudti hai (taqreeban ek chakkar
  har 6-11 second), hawa ke saath door jaati aur aahista neeche aati hai.
- **Mobile ki rotate screen** aur loot ke naye messages ab English mein hain.
- **Lootne wale bachay:** patang thori upar ho aur uski latakti dor pohanch mein ho, to bacha dor pakar kar patang ko
  hath-ba-hath neeche kheench leta hai. Is dauran aap apni dor se use ab bhi chheen sakte hain.

---

## 8. Naye features (v1.3)

| Feature | Kya hai |
|---|---|
| **Coins aur Shop** | Har match coins deta hai (cut 10, patang ghar laana 8, jeet 40, match khatam karna 5, streak bonus). Shop mein patangen (Rare/Epic/Legendary), dor, charkhi aur fliers khareeden. Muft starter set hamesha milta hai. Har naye aur purane player ko 300 coins se shuru. |
| **Daily challenge** | Roz ek naya kaam (maslan "Cut 3 kites"), poora karne par extra coins. Pakistan waqt ke mutabiq raat 12 baje badalta hai. |
| **Loot collection** | Jo bhi patang aap kaat kar ghar laate hain wo collection mein jama hoti hai; jo abhi nahi mili wo saaye ki tarah dikhti hai. |
| **Leaderboard** | Is hafte ke sab se zyada cuts, sab se lambi streak, sab se zyada loot (sirf online server par). |
| **Mohalla mode** | Team match 2v2 / 3v3. Apni team ki dor apni team ki dor nahi kaatti. Career: 6 mohallay (Mozang se Androon Shehr tak), har ek jeetne par agla khulta hai aur inaam milta hai. Online rooms mein "Mohalla: two teams" ka option. |
| **Quick chat** | 8 tayyar English jumle (T ya 1-8). Online sab ko jaate hain; offline bots jawab dete hain ("Help me!" par team-mate madad ko aata hai). |
| **Slow-motion replay** | Aap ke cut ke baad 3-4 second ka replay, slow motion mein. Skip button, "Don't show replays", aur Settings mein On/Off. |
| **Raat ki Basant** | Raat ke scenes mein roshan patangen (LED), chamakti dor, rangeen searchlights, aur aasman mein urti fanoos (sky lanterns). |
| **DJ aur dhol ki chhatein** | Do chhaton par DJ aur dhol wala, naachte log; awaaz aap ki taraf se faasle aur simt ke hisaab se. Settings: "Roof music". |
| **Touch buttons customize** | Settings → "Customize buttons" (ya pause screen par): buttons ko khiska kar jagah, size aur see-through set karein; Left-handed aur Reset. Buttons hamesha screen ke neeche wale hisse mein, screen par aur ek doosre se alag rehte hain. |

**Hifazat:** online coins, khareedari, daily, career aur leaderboard sab server par hote hain (`client/src/economy.js` ke qawaid,
`server/anticheat.js` se check shuda nateejon par). Browser se coins badalne ka koi raasta nahi. Online match mein jo cheez
aap ne nahi khareedi wo server khud muft starter cheez se badal deta hai. Bina server (file se khola) ye sab isi device par chalta hai.
