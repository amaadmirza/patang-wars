<template>
  <div class="wrap dl">
    <header class="page-head">
      <h1>Get Bo Kata!</h1>
      <p class="lede">Free, no ads, and the Android app plays the whole game offline: Festival, Duel, Mohalla, the shop and every kite you win.</p>
    </header>

    <div class="dl-ways">
      <section class="dl-way dl-main" aria-labelledby="dl-apk">
        <h2 id="dl-apk">Android</h2>
        <p>Phones and tablets running Android. About 19 MB.</p>
        <a class="btn" :href="config.apkUrl">Download for Android</a>
        <p class="dl-note">Opens the download page: tap the file that ends in <b>.apk</b>.</p>
      </section>
      <section class="dl-way" aria-labelledby="dl-web">
        <h2 id="dl-web">iPhone and computer</h2>
        <p v-if="config.playUrl">Play in Safari, Chrome or any browser, on a computer or a phone held sideways. Nothing to install.</p>
        <p v-else>An iPhone app isn't out yet. Bo Kata! also runs in a web browser: ask the friend who runs your group's game for the link, open it in Safari, and hold the phone sideways.</p>
        <a v-if="config.playUrl" class="btn btn-quiet" :href="config.playUrl">Play in your browser</a>
      </section>
    </div>

    <section class="dl-sec" aria-labelledby="dl-install">
      <h2 id="dl-install">Installing on Android</h2>
      <p class="muted">The app comes straight from us, not the Play Store, so Android asks you once to allow it.</p>
      <ol class="dl-steps">
        <li><b>Download it.</b> Tap Download for Android, then the file ending in .apk. You can also forward that file to friends on WhatsApp.</li>
        <li><b>Open the file.</b> Tap it in your notifications or in your Files app.</li>
        <li><b>Allow the install.</b> If Android says installing from this source isn't allowed, tap Settings, switch on "Allow from this source" for the app you opened it with (Chrome, Files or WhatsApp), and go back.</li>
        <li><b>Install and play.</b> Tap Install, then Open. The game always plays sideways, full screen.</li>
      </ol>
      <p class="muted">Getting a new version later? Install it over the old one. If Android says "App not installed", uninstall the old Bo Kata! first.</p>
    </section>

    <section class="dl-sec" aria-labelledby="dl-friends">
      <h2 id="dl-friends">Playing with friends</h2>
      <div class="dl-friends">
        <div><h3>On one computer</h3><p>Two players mode splits the screen: one flies with W A S D, the other with I J K L.</p></div>
        <div><h3>Online, in a room</h3><p>In the browser game, tap Online, create a room and send the invite link on WhatsApp. Up to ten fliers share one sky, and your whole mohalla can play as a team.</p></div>
      </div>
    </section>
  </div>
</template>

<script>
import config from '../config.js';

export default {
  name: 'DownloadPage',
  setup() { return { config }; }
};
</script>

<style>
.dl-ways { display: grid; grid-template-columns: 1.2fr 1fr; gap: 16px; }
.dl-way { padding: clamp(20px, 3vw, 32px); border-radius: var(--radius-l); background: var(--surface); box-shadow: inset 0 0 0 1px var(--surface-line); display: flex; flex-direction: column; align-items: flex-start; }
.dl-way p { color: var(--text-soft); }
.dl-main { background: var(--sky); color: #fff; box-shadow: none; }
.dl-main p { color: #e3eeff; }
.dl-main .btn { font-size: 1.15rem; min-height: 54px; padding: 0.6em 1.6em; }
.dl-note { font-size: var(--t-sm); margin: 12px 0 0; }
@media (max-width: 760px) { .dl-ways { grid-template-columns: 1fr; } }
.dl-sec { padding: clamp(32px, 5vw, 56px) 0 0; }
.dl-steps { counter-reset: st; list-style: none; margin: 18px 0; padding: 0; max-width: 760px; }
.dl-steps li { counter-increment: st; position: relative; padding: 14px 0 14px 60px; border-top: 1px solid var(--surface-line); }
.dl-steps li::before { content: counter(st); position: absolute; left: 0; top: 12px; width: 40px; height: 40px; border-radius: 50%; display: grid; place-items: center; background: var(--genda); color: var(--jamun); font-family: var(--display); font-weight: 800; }
.dl-steps b { display: block; font-family: var(--display); font-size: 1.12rem; }
.dl-friends { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 14px; }
.dl-friends > div { padding: 18px 20px; border-radius: var(--radius-m); background: var(--surface); box-shadow: inset 0 0 0 1px var(--surface-line); }
.dl-friends p { margin: 0; color: var(--text-soft); }
@media (max-width: 760px) { .dl-friends { grid-template-columns: 1fr; } }
</style>
