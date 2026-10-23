<template>
  <div class="wrap pv">
    <header class="page-head">
      <h1>Privacy</h1>
      <p class="lede">Short version: the Android app sends nothing anywhere, and a game server keeps only what it needs to remember your coins and kites.</p>
    </header>
    <section class="pv-body">
      <h2>The Android app</h2>
      <p>The app runs offline. Your name, coins, kites, settings and records are saved on your phone only. The app has no ads, no analytics and no account, and it does not send any data to us or to anyone else.</p>
      <h2>Playing on a Bo Kata! server</h2>
      <p>When you play in a browser on a server, the server stores the name you choose, your coins, the kites and gear you own, your match records and trophies, so they are there next time. It sets one cookie that identifies your player record. It does not ask for your email, phone number or location.</p>
      <p>Each server is run by whoever hosts it (for example a friend running it for your group). The records live on that computer, in a folder outside the game, and are not shared with anyone.</p>
      <h2>Your choices</h2>
      <p>Clearing the app's data, or your browser's site data, removes what is stored on your device. To remove your record from a server, ask the person who runs it.</p>
      <h2>Children</h2>
      <p>Bo Kata! does not collect personal information from anyone, including children.</p>
      <p class="muted">Last updated for version {{ version }}.</p>
    </section>
  </div>
</template>

<script>
import config from '../config.js';
export default { name: 'PrivacyPage', setup() { return { version: config.version }; } };
</script>

<style>
.pv-body { max-width: 720px; }
.pv-body h2 { font-size: var(--t-xl); margin-top: 1.4em; }
</style>
