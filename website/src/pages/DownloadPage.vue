<template>
  <div class="wrap dl">
    <header class="page-head">
      <h1>Play and download</h1>
      <p class="lede">Three ways to fly: in a browser, as an Android app that works offline, or on your own server with friends.</p>
    </header>

    <div class="dl-ways">
      <section class="dl-way" aria-labelledby="dl-web">
        <h2 id="dl-web">In your browser</h2>
        <p>Works on a computer and on a phone held sideways, with nothing to install. Played from a Bo Kata! server it also has online rooms and the weekly leaderboard.</p>
        <a class="btn" :href="config.playUrl">Play in your browser</a>
      </section>

      <section class="dl-way" aria-labelledby="dl-apk">
        <h2 id="dl-apk">Android app</h2>
        <p>The whole game on the phone, offline: Festival, Duel, Mohalla, the shop, coins and crates, all saved on the phone. Always landscape, full screen, and the Back button works like you expect.</p>
        <a v-if="config.apkUrl" class="btn" :href="config.apkUrl">Download the APK</a>
        <a v-else class="btn" href="#apk-build" @click.prevent="toApk">How to get the APK</a>
        <p class="dl-note">Installing over an older version keeps your coins and kites.</p>
      </section>
    </div>

    <section id="apk-build" class="dl-sec" aria-labelledby="dl-apk-h">
      <h2 id="dl-apk-h">Build the Android app on GitHub</h2>
      <p class="muted">No Android Studio or Mac needed: GitHub's machines build it from the mobile zip. Free for a public repository.</p>
      <ol class="dl-steps">
        <li><b>Put the project on GitHub.</b> Install GitHub Desktop, unzip the mobile zip, then File, Add local repository, Create repository, Publish repository.</li>
        <li><b>Run the build.</b> On github.com open the repository, then Actions, then Build Android app, then Run workflow. It takes 10 to 20 minutes.</li>
        <li><b>Download it.</b> Open the finished run. Under Artifacts, android-app has the .apk (install on a phone) and the .aab (for Google Play).</li>
        <li><b>Save the signing key, once.</b> The first run also makes android-signing-key. Add its two files as repository secrets named ANDROID_KEYSTORE_BASE64 and ANDROID_KEYSTORE_PASSWORD, keep them private, and run the build again. Every later update then installs over the old app.</li>
        <li><b>Install.</b> Send the .apk to the phone, open it, allow "Install unknown apps" for that one app, then Install.</li>
      </ol>
      <p class="muted">Publishing on Google Play needs a one-time $25 developer account, the .aab file, screenshots and a privacy policy link. This site has one: <router-link to="/privacy">Privacy</router-link>.</p>
    </section>

    <section id="host" class="dl-sec" aria-labelledby="dl-host-h">
      <h2 id="dl-host-h">Host a server for friends</h2>
      <p class="muted">The web zip runs on any computer with Node.js 18 or newer. Your friends open its address in a browser, type a name, and join your room.</p>
      <div class="dl-host">
        <div>
          <h3>Start it</h3>
          <pre class="dl-code"><code>npm install
npm run build
npm start</code></pre>
          <p>The terminal prints two addresses. Open <code>http://localhost:8080</code> yourself and give friends the network one, like <code>http://192.168.1.10:8080</code>. Stop it with Ctrl + C; change the port with <code>PORT=3000 npm start</code>.</p>
        </div>
        <div>
          <h3>Play together</h3>
          <dl class="dl-where">
            <div><dt>Same Wi-Fi</dt><dd>Nothing more to do. If Windows asks, choose Allow access.</dd></div>
            <div><dt>Over the internet</dt><dd>Easiest: <code>cloudflared tunnel --url http://localhost:8080</code> gives you a public https link. Or forward port 8080 on your router.</dd></div>
            <div><dt>Always on</dt><dd>Put it on a VPS with the included systemd service and nginx config for HTTPS.</dd></div>
          </dl>
          <p>Then in the game: Online, Create a room, copy the invite link to WhatsApp, and press Start match when everyone is in.</p>
        </div>
      </div>
    </section>
  </div>
</template>

<script>
import config from '../config.js';

export default {
  name: 'DownloadPage',
  setup() {
    const toApk = () => { const el = document.getElementById('apk-build'); if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); el.setAttribute('tabindex', '-1'); el.focus({ preventScroll: true }); } };
    return { config, toApk };
  }
};
</script>

<style>
.dl-ways { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.dl-way { padding: clamp(20px, 3vw, 32px); border-radius: var(--radius-l); background: var(--surface); box-shadow: inset 0 0 0 1px var(--surface-line); display: flex; flex-direction: column; align-items: flex-start; }
.dl-way:first-child { background: var(--sky); color: #fff; box-shadow: none; }
.dl-way:first-child p { color: #e3eeff; }
.dl-way p { color: var(--text-soft); }
.dl-way .btn { margin-top: auto; }
.dl-note { font-size: var(--t-sm); margin: 10px 0 0; }
@media (max-width: 760px) { .dl-ways { grid-template-columns: 1fr; } }

.dl-sec { padding: clamp(32px, 5vw, 56px) 0 0; scroll-margin-top: 80px; }
.dl-sec:focus { outline: none; }
.dl-steps { counter-reset: st; list-style: none; margin: 18px 0; padding: 0; display: grid; gap: 0; max-width: 820px; }
.dl-steps li { counter-increment: st; position: relative; padding: 14px 0 14px 60px; border-top: 1px solid var(--surface-line); }
.dl-steps li::before { content: counter(st); position: absolute; left: 0; top: 12px; width: 40px; height: 40px; border-radius: 50%; display: grid; place-items: center; background: var(--genda); font-family: var(--display); font-weight: 800; }
.dl-steps b { display: block; font-family: var(--display); font-size: 1.12rem; }
.dl-host { display: grid; grid-template-columns: 1fr 1.2fr; gap: clamp(20px, 4vw, 48px); margin-top: 18px; }
@media (max-width: 860px) { .dl-host { grid-template-columns: 1fr; } }
.dl-code { margin: 0 0 14px; padding: 16px 18px; border-radius: var(--radius-m); background: var(--jamun); color: #fff6d6; overflow-x: auto; line-height: 1.7; }
.dl-code code { font-size: 0.95rem; }
.dl-where { margin: 0 0 14px; }
.dl-where > div { padding: 10px 0; border-top: 1px solid var(--surface-line); }
.dl-where dt { font-weight: 700; }
.dl-where dd { margin: 0; color: var(--text-soft); }
p code, dd code { padding: 1px 6px; border-radius: 6px; background: var(--sky-mist); overflow-wrap: anywhere; }
</style>
