# Patang Wars — Android aur iPhone app

Ye app **offline** hai: poori game phone ke andar. Festival, Duel, Two players, Mohalla, tutorial, shop, coins, daily
login, crates — sab chalte hain, sab kuch phone par save hota hai. **Online** aur **leaderboard** "coming soon" dikhate
hain (server lagne par ek update se chalu honge).

Phone par: hamesha landscape (letay hue), poori screen (upar/neeche ki bars chhupi), screen bujhti nahi, asli vibration
(iPhone par bhi), Android ka **Back** button: panel band → match roko → home → app band.

---

## 1. APK aur IPA banana — GitHub par (aap ko Android Studio ya Mac ki zaroorat nahi)

GitHub ki apni machines app banati hain: Linux par Android, Mac par iPhone. **Public** repository par ye bilkul muft hai.
(Private par har mahine 2,000 muft minute — kuch builds ke liye kaafi. Aap ki signing key dono soorton mein chhupi rehti hai.)

1. **github.com** par muft account banayein.
2. **GitHub Desktop** install karein (desktop.github.com) aur us mein sign in karein.
   (Website par drag-and-drop ek waqt mein sirf 100 files leta hai; is project mein ~330 hain — is liye GitHub Desktop.)
3. Zip ko nikaalein. GitHub Desktop → **File → Add local repository** → `patang-wars` folder chunein → "create a
   repository" par click → **Create repository** → **Publish repository** (chahein to "Keep this code private" hata dein: muft builds).
4. github.com par apni repository kholein → **Actions** tab → agar poochhe to "I understand my workflows, go ahead and enable them".
5. Baayen **Build Android & iPhone apps** → **Run workflow** → **Run workflow**.
6. 10–20 minute. Khatam hone par run kholein, neeche **Artifacts**:
   - `android-app` → **PatangWars-…apk** (phone par seedha install) aur **…aab** (Google Play Store ke liye)
   - `iphone-app` → **PatangWars-…-unsigned.ipa**
   - `android-signing-key` → sirf **pehli** dafa (neeche dekhein — zaroori!)

### Pehli build ke baad: signing key save karein (ek dafa, 2 minute)
Android har update ko pichhle wale ki **same key** se sign chahta hai, warna phone purani app ke upar update nahi karta
(aur Play Store bhi nahi). Pehli build ne aap ke liye nayi key banayi hai:
1. `android-signing-key` artifact download karein, kholein. Is mein 2 text files hain.
2. Repository → **Settings → Secrets and variables → Actions → New repository secret**:
   - Name `ANDROID_KEYSTORE_BASE64` — value: `ANDROID_KEYSTORE_BASE64.txt` ka poora text
   - Name `ANDROID_KEYSTORE_PASSWORD` — value: `ANDROID_KEYSTORE_PASSWORD.txt` ka text
3. Ye files kahin mehfooz rakhein (USB / Google Drive private), **kisi ko na dein**. Key kho gayi to Play Store par
   app kabhi update nahi ho sakegi.
4. Actions se ek dafa aur **Run workflow** — ab ki APK aap ki apni key se hai; aage sab builds isi se.

## 2. Android phone par APK install
APK WhatsApp/USB se phone par bhejein → kholein → "Install unknown apps" ki ijazat (sirf us app ko jis se khol rahe
hain, jaise Files ya WhatsApp) → **Install**. Naya version purane ke upar install hota hai, coins aur patangein qaim rehti hain
(sirf tab jab dono builds ek hi signing key se hon — upar wala qadam).

## 3. iPhone par IPA
Apple **unsigned** IPA ko seedha install nahi karne deta. Teen raaste:
- **Muft, apne iPhone par test:** computer (Windows/Mac) par **Sideloadly** ya **AltStore** → apni Apple ID se IPA sign
  ho kar iPhone par jaati hai. Muft Apple ID wali app **7 din** chalti hai, phir dobara sign karni padti hai.
- **Doston ko dena / App Store:** **Apple Developer** account ($99/saal) → app **TestFlight** par (100 tak testers ko
  link) ya App Store par. Is ke liye signed build chahiye — account ban jaye to batayein, workflow mein signing jod dunga
  (certificate + profile GitHub secrets mein).
- **Mac ho to:** Xcode mein `app/ios/App` khol kar apni Apple ID se seedha phone par chalayein (neeche section 5).

## 4. Google Play Store (jab tayyar hon)
Google Play Console account ($25, ek dafa) → nayi app → **AAB** file upload. Play ko chahiye: app icon (bana hua hai),
screenshots (`screenshots-v6.4/` mein kuch hain), short description, aur ek **privacy policy** ka link (app koi data
nahi bhejti — ek saada page kaafi hai).

## 5. Apne computer par banana (chahein to)
- Node.js 22+, JDK 21, Android Studio (Otter 2025.2.1 ya naya). iPhone ke liye Mac + Xcode 26.
- Is folder (`app/`) mein:
  ```bash
  cd ..  && npm install && cd app      # game ka build tool (esbuild)
  npm install
  npm run www                           # game ko app/www mein banata hai (offline)
  npx cap add android                   # aur/ya: npx cap add ios
  npm run assets                        # icon aur splash
  node scripts/patch-native.js          # landscape, full screen, version
  npx cap sync
  npx cap open android                  # Android Studio: Build → Generate Signed App Bundle / APK
  npx cap open ios                      # Xcode: apni team chunein → Run / Archive
  ```

## 6. Game badli? App update
Game ki files (`client/`) badlein → GitHub Desktop mein **Commit** → **Push** → workflow khud chalta hai aur naya APK/IPA
banata hai (har build ka number khud aage barhta hai). Version naam badalna ho to `app/package.json` mein `"version"`.

## 7. Jab server mil jaye
Online chalu karne ke liye app mein server ka pata (https wala domain) daalna hoga aur login ka tareeqa app ke mutabiq
karna hoga. Ye agla qadam hai — server ka address mil jaye to bata dein.

---
Files: `capacitor.config.json` (app ka naam, id `pk.patangwars.game`, rang), `assets/` (icon + splash — inhein badal kar
`npm run assets`), `scripts/patch-native.js` (landscape / full screen / version), `../.github/workflows/build-apps.yml`
(GitHub par build). App id ek dafa Play Store par chali gayi to badli nahi ja sakti — badalni ho to abhi badlein.
