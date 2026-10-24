# Bo Kata!

**Cut · Loot · Rule the sky.**  ·  *Basant ka asli muqabla — pecha lagao, Bo Kata!*

(Pehle naam: Patang Wars, us se pehle Kite Fight. Logo: `client/assets/brand/logo.svg`, hub ka wordmark: `wordmark.svg`,
emblem: `emblem.svg`, app icon: `icon.svg`.
Doosre naam/logo concepts: `client/assets/brand/concepts/` — `python3 client/tools/make-logos.py` se dobara banti hain.)

## Phone app (Android APK)

`app/` mein poori game ka **offline** phone app hai (Capacitor 8). GitHub par muft banta hai — Android Studio ya Mac ke
baghair: **`app/README-APP.md`** dekhein (qadam ba qadam). Workflow: `.github/workflows/build-apps.yml`.

## v7.3
- **Bina button dabaye patang ab khud nahi ghoomti:** v7.1 ka "idle ghoomna" (chhorne par patang ~200°/s ghoomti thi,
  6 s mein 3.5 chakkar) patang ka rukh kahin bhi chhor deta tha, aur agla Fly use ghalat taraf ya chhat mein bhej deta tha.
  Ab chhorne par patang **naak upar, ek jagah tik kar** hover karti hai (v7.0 jaisa). Setting "Kite turns when left alone"
  ab default **off**; on karein to dheemi (~70–100°/s). Dheel par ghoomna pehle jaisa.
  - beginner test (2.5 min, wahi random haath): 15 m se upar waqt 59% → **91%**, median unchai 20 → **48 m**, chhat se takkar 2 → **0**.
- **Sar ke oopar Fly par patang hawa mein jam jaati thi:** Fly ke waqt naak ke saath hawa ka zor bhi kaat diya jata tha,
  to zenith par patang 4–5 s bilkul ruki rehti (0.1 m/s) aur dor bekaar nikalti rehti. Ab wahan haath ki pakad patang ki
  "power" ke hisaab se: patang chadhti hai aur hawa use wapas bahar le jaati hai; dor sirf utni nikalti hai jitni patang le.
- **Khainch ke baad patang ka ghoom kar chhat mein girna:** khainch se patang 8 m ke andar aaye to reel ki safety dor dheeli
  karti thi, aur game use player ki dheel samajh kar patang ghuma deta tha — agla Fly use chhat mein maar deta. Ab safety
  wali dheel ghoomna nahi laati.
- **Sail ka jhukaav aur kam:** mudte waqt ~17° (pehle 22°), dheel par ghoomte waqt sail ka tilt aadha — patang dabba nahi lagti.
- Pecha check: sahi chaal (upar se dheel, neeche se khainch + jhatka) jeetti hai, ruk kar rehna haarta hai; ek browser par
  sab se bura frame 51 ms, 100 ms se lamba koi frame nahi.

## v7.2
- **Patang ki shakal ab saaf rehti hai (tunka, khainch, left/right):** paper sail bohot zyada mudta aur ghoomta tha.
  - steer par sail ka jhukaav (roll) pehle 52° tak jata tha, ab zyada se zyada ~16°; khainch par kaman ka bend 0.28 se 0.15.
  - tunka ka jhoola 0.45 se 0.28; perspective kam (door ka camera), shade 0.3 tak; flutter aadha.
  - patang ab bhi bank karti, jhoolti aur ghoomti hai, lekin shakal patang hi rehti hai.
- **Udte waqt aur pecha mein atakna (stuck) khatam:** har frame ka khud ka JS waqt naapa (phone size, CPU 2x dheema):
  - sab se bura frame 516 ms se 82 ms; 100 ms se lambe frame 14 se 0; p99 92 ms se 33 ms; 10 ms se lambe GC 32 se 10–15.
  - wajahein: pecha zoom mein apne flier ki tasveer har frame dobara banti thi; loot wale bachche har frame poore
    banaye jaate the (365 ms tak); replay recorder bohot kachra (garbage) banata tha; nayi patang ki pehli tasveer
    (decode + mipmaps) beech match mein banti thi; HUD ka box-shadow animation game ke upar repaint karta tha.
  - ilaaj: tasveer cache ka har frame budget, bachche bhi sprite se, recorder ring buffers (kachra nahi), patangein match
    se pehle garam (warm) ki jaati hain, loot patangon ka pool, HUD animation sirf opacity.
- **Website kite lovers ke liye:** naya Basant safha (chhat ka din, pecha kaise jeette hain, patang ke hisse, 18 lafzon
  ki patang dictionary, hifazat), Download safha sirf players ke liye (install ke 4 qadam), FAQ dobara likha, How to play
  mein "Ustad tips". Developer / GitHub / server wali baatein website se hata di (README mein hain).

## v7.1
- **Splash ke baad jhatka khatam:** tap par game full screen + landscape maangti thi aur usi pal home screen banti aur fade
  hoti — screen ka size badalta (aksar portrait se landscape), home screen fade ke dauran apni jagah se uchhalti thi, aur
  daily-login card bhi beech mein khul jata tha. Ab home screen splash ke **neeche pehle se ban jaati hai** (tasveerein
  decode, layout tayyar), tap ke baad splash tab tak dhaka rehta hai jab tak size ruk na jaye, phir **ek saaf fade**
  (~17 ms har frame), aur login card fade ke **baad**. Naap: pehle Play button fade ke dauran 2 jagah, ab 1.
- **Zoom ab baayen (left) taraf slider:** daayen wali + / − goli hata di. Baayen kinare, aap ke card aur steer buttons ke
  beech, ek khara (vertical) slider: **handle upar khainchein = zoom in, neeche = zoom out**; siron par + / − ek qadam.
  Pinch bhi chalta hai, aur handle har zoom ke saath apni jagah khud aata hai. Zoom yaad rehta hai.
- **Pecha mein "stuck" aur dhundli graphics:**
  - ek dheema frame aane par loop 12 physics steps ek saath chalata tha — agla frame bhi dheema, phir agla (jhatkon ki zanjeer).
    Ab offline ek frame mein zyada se zyada 4 steps; baqi chhor diya jata hai (online server ke saath poora).
  - pecha mein camera zoom hota to **har** chhat wale aadmi ki tasveer ek hi frame mein dobara banti thi. Ab purani tasveer
    naye size par khinch jaati hai aur dobara banana agle frames mein baant diya.
  - quality controller 3x phone ko **0.75x** tak gira deta tha (naam, dor, patang sab dhundle). Ab **2x** se shuru, kabhi
    1x se neeche nahi, aur phone par bhi sharpness wapas aati hai.
  - patangon ki tasveerein ab chhoti pre-scaled copies (mipmaps) se: kam kaam, aur door ki patang chamakti/jhilmilati nahi.
  - canvas opaque (poori game page ke upar blend nahi hoti), aasman zameen ke neeche nahi rangta, scoreboard 6 dafa/second.
  - Naap (10 patangein, Hard, zyada tar pecha, 4x dheema CPU, 844x390 @3x, ek hi seed, dono 2x par): **9.8 → 13.8 fps**,
    physics 11 → 4 ms/frame, drawing JS 42 → 22 ms, 100 ms se lambe jhatke 48 → 20.
- **Patang ka ghoomna (rotation), video se naap kar:** video mein patang ko chhor do (koi khainch nahi) to wo **lagatar ek taraf
  ghoomti rehti hai**, ~150–220°/s (har 2–2.5 s mein ek chakkar); khainch karte hi foran (~0.25 s) ruk kar naak ki seedh mein
  udti hai; chhorte hi phir ghoomne lagti hai, kabhi ulti taraf. Hamari patang chhorne par **jam jaati thi** (3°/s) — yehi
  farq tha. Ab aap ki patang bhi chhorne par ~0.3 s baad ghoomti hai (~210°/s), hawa par latki rehti hai (neeche nahi girti,
  60 s test mein 16.7 m par qaim), FLY/khainch/tunka/steer foran rokta hai aur patang **wahi jaati hai jahan naak dikh rahi
  thi**. Ghoomte waqt sail thoda peeche jhukta aur kinare par aata hai. Settings → General → **Kite turns when left alone**
  (band karein to purana andaz). Bots aur pecha ke qanoon wahi.
- **Patang urane ka andaz (asal video jaisa):** physics pehle se patang ka 3D jhukao (bank/roll) aur pitch nikalti thi magar
  tasveer hamesha seedhi chapti chipki rehti thi. Ab patang **kaghaz ka mura hua sail** hai:
  - **kaman (bow):** dono par peeche mudte hain, load (tez urna, khainch) par zyada, halki si kaanpti hai
  - **jhukao:** mod mein andar ki taraf bank, pitch, aur ek springy jhool — patang hawa mein hilti, jhoolti aur theherti hai
    (dheel par zyada, khainch par kam); jhatka sail ko jhatakta hai
  - **phar-phar:** paron ke kone aur dum par lehar
  - **saaya:** jo hissa aap se door muda hai wo thoda gehra — is se mod nazar aata hai
  - **dheeli dor latakti hai:** dheel par dor asli curve mein jhukti hai (flier ki taraf gehri), khainchte hi seedhi.
  - Sab sirf drawing hai — urne ka hisaab, server aur pecha ke qanoon wahi (sab 121 tests pass).
- **Poora SQA (web + phone + app):** asli UI se har screen aur flow — web computer 28/28, web phone 28/28, offline app 27/27,
  online (do browser, invite link se join) 10/10, 6 minute Hard Festival soak (103 cuts, 0 errors), asli 2 minute match ka
  nateeja aur server se coins. Ek bug pakra aur theek kiya (pause screen agle match mein ek frame ke liye ja sakti thi).
  Tafseel QA-REPORT.md mein.
- **Patangein hatayi gayin:** Saudi Arabia flag patang, aur folders `assets/kites/parinda`, `pipa`, `raia`, `dabba`, `sitara`
  (33 tasveerein) — shop mein 175 tasveer-patangein. Shop/Kites mein Pipa, Bird/Bat, Raia/Wau, Box, Star tabs bhi hataye.
  **Jis ne in mein se koi khareedi thi use poori qeemat wapas** (ek dafa, record se patang usi waqt nikal jaati hai —
  offline phone par bhi aur server par bhi), aur ek chhota sa message. Jo yehi patang uda raha tha use starter patang mil
  jaati hai; in tasveeron par bani workshop patangein patang tasveer par chali jaati hain.

## v7.0 — naya naam: **Bo Kata!**
- **Naam badla:** Patang Wars → **Bo Kata!** Tagline wahi: *Cut · Loot · Rule the sky.* Naya logo, hub wordmark, app splash.
  Android app ka **appId wahi** (`pk.patangwars.game`) aur signing key wahi — naya APK purane ke upar install hota hai,
  coins aur patangein qaim. Server ka data folder bhi wahi (`~/PatangWars-data`).
- **Loot window chhoti:** loot chase wali choti tasveer ab ~25% chhoti, kone mein (phone: upar-daayen, zoom buttons se hat kar;
  computer: neeche-baayen), patli label. **Settings → Gameplay → Loot window: Small / Large / Hide**, aur General mein ek switch.
- **Match mein "stuck" khatam:** phone par Pause screen likhta tha "Press P to continue" — koi button nahi tha, log phans jaate
  the. Ab asli menu: **Resume**, Settings, Controls (Buttons/Swipe, Move buttons), **Quit to home**. ⌂ button ab foran match
  khatam nahi karta, menu kholta hai. Esc aur Android **Back** bhi yehi menu kholte/band karte hain.
- **Menu tez aur saaf (phone + web):** phone par panels ke peeche live blur aur animated saaye band (Android WebView ka sab se
  bhaari kaam); Shop/Kites ki 200+ patangein ab sirf nazar aane par paint hoti hain (shop khulna ~40% tez); panel lamba ho to
  upar se scroll hota hai (kabhi kat kar phansta nahi); tap foran (double-tap zoom ka intezar nahi); panel khula ho to peeche
  ki animation ruk jaati hai. Hub: rail par labels (Online, Kites, Mohalla, Shop), Settings ka gear upar coins ke saath.
  Android Back ab har screen band karta hai (Online, naam, kite maker, buttons editor bhi).
- **"Bo kaata!" ki awaaz saaf:** purani built-in awaaz do aawazon se banti thi jo 3.5 sur ke faasle par ek saath bolti thin —
  aapas mein takra kar "distorted" lagti thi (spectrogram mein do harmonic lines). Ab ek hi saaf awaaz, gale jaisi
  resonance, aur limiter. **Phone app** ab Android ki apni Urdu/Hindi TTS awaaz istemal karta hai (naya chhota native
  plugin `BoKataVoice`, `app/scripts/patch-native.js` banata hai) — WebView mein speechSynthesis hota hi nahi tha, is liye
  app hamesha robot awaaz par jaata tha. Browser mein bhi phone ki awaaz ab asli speed/pitch par (pehle pitch badal kar
  "chipmunk" ho jaati thi); door ki chhaton aur bachon ke naare chhoti built-in awaaz mein, aap ka naara nahi kaatte.

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
- **Patangon ke naam:** sab tasveerein naye naam aur qism ke folder mein: `assets/kites/patang|tukkal|pipa|raia|dabba|parinda|sitara/` (v7.1: ab sirf `patang` aur `tukkal`)
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
