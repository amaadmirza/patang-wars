<template>
  <div class="wrap fq">
    <header class="page-head">
      <h1>Questions</h1>
      <p class="lede">The things people ask first. Something else? The game's How to play screen covers every control.</p>
    </header>
    <div class="fq-list">
      <details v-for="(f, i) in faqs" :key="i" class="fq-item" :open="i === 0">
        <summary><h2>{{ f.q }}</h2></summary>
        <p v-for="(a, j) in f.a" :key="j">{{ a }}</p>
      </details>
    </div>
  </div>
</template>

<script>
export default {
  name: 'FaqPage',
  setup() {
    const faqs = [
      { q: 'Is Bo Kata! free?', a: ['Yes. Every mode is free and 83 kites are free from your first match. Other kites, strings, reels and fliers are bought with coins you win by playing. There is no real-money shop.'] },
      { q: 'Does it work without internet?', a: ['The Android app works fully offline, with everything saved on the phone. In a browser, the game works from its server; online rooms and the weekly leaderboard need that server.'] },
      { q: 'My line keeps getting cut. What am I doing wrong?', a: ['Probably holding still. A still line loses a pecha. Check your card in the top-left: if you are on top, hold DHEEL; if you are below, hold KHAINCH. Add a quick tap of FLY for a jhatka.', 'In the game\'s own test, the right move won 69% of pechas and holding still won 22%.'] },
      { q: 'How do I zoom on a phone?', a: ['Drag the slider on the left edge of the screen: up to zoom in, down to zoom out. You can also tap + and − at its ends, or pinch the sky with two fingers. Your zoom is remembered.'] },
      { q: 'The game feels slow on my phone.', a: ['Open Settings, then Display, and choose Battery saver. It keeps the sharpness at a steady level and switches off the heavier glow effects. On Auto the game adjusts by itself but never drops below one pixel per screen point.'] },
      { q: 'A kite I bought is gone.', a: ['In version 7.1 the Saudi Arabia flag kite and the Pipa, Raia/Wau, Box, Bird and Star kites were retired. If you owned any, the full price came back as coins and a message told you so. If you were flying one, you now have a starter kite selected.'] },
      { q: 'Will my coins and kites survive an update?', a: ['Yes. A new Android build installs over the old one and keeps everything, as long as both builds are signed with the same key. On a server, player records live outside the game folder, so unzipping a new version doesn\'t touch them. Settings, then Profile has a backup code for moving to another phone or browser.'] },
      { q: 'Can people cheat online?', a: ['The server decides every cut, the score, the clock and who wins. Each player only sends their own kite, and the server checks its speed, line length and position.'] },
      { q: 'Is there an iPhone app?', a: ['Not yet: the app is built for Android only for now. On an iPhone you can play in Safari, held sideways.'] }
    ];
    return { faqs };
  }
};
</script>

<style>
.fq-list { max-width: 820px; }
.fq-item { border-top: 1px solid var(--surface-line); }
.fq-item:last-child { border-bottom: 1px solid var(--surface-line); }
.fq-item summary { list-style: none; cursor: pointer; padding: 18px 44px 18px 0; position: relative; }
.fq-item summary::-webkit-details-marker { display: none; }
.fq-item summary h2 { margin: 0; font-size: var(--t-lg); font-weight: 700; }
.fq-item summary::after { content: ''; position: absolute; right: 8px; top: 50%; width: 12px; height: 12px; margin-top: -9px; border-right: 2.5px solid var(--manjha); border-bottom: 2.5px solid var(--manjha); transform: rotate(45deg); transition: transform 0.2s; }
.fq-item[open] summary::after { transform: rotate(225deg); margin-top: -3px; }
.fq-item p { margin: 0 0 14px; color: var(--text-soft); }
.fq-item p:last-child { padding-bottom: 8px; }
</style>
