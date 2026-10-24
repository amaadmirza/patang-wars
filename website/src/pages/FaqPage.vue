<template>
  <div class="wrap fq">
    <header class="page-head">
      <h1>Questions</h1>
      <p class="lede">What fliers ask us most. For every control, open How to play in the game or on this site.</p>
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
      { q: 'Is Bo Kata! free?', a: ['Yes, completely. There are no ads and no real-money shop. 83 kites are free from your first match; the rest, along with strings, reels and fliers, you buy with coins you win by playing.'] },
      { q: 'Does it need the internet?', a: ['The Android app plays everything offline: Festival, Duel, Two players, Mohalla, the shop and your collection, all saved on your phone. Online rooms with friends need the browser game.'] },
      { q: 'My line keeps getting cut. What am I doing wrong?', a: ['Probably holding still: in a pecha the string that moves does the cutting. Look at your card in the corner. If you are on top, hold DHEEL; if you are underneath, hold KHAINCH, and add a quick tap of FLY for a jhatka.', 'In the game\'s own test, the right move won 69% of pechas and holding still won 22%.'] },
      { q: 'Why does my kite turn by itself?', a: ['Like a real patang, a kite left alone on its line slowly turns. Wait until its nose points where you want to go, then press FLY: it shoots straight that way. If you prefer a kite that stays still, switch off Settings, General, Kite turns when left alone.'] },
      { q: 'How do I zoom on a phone?', a: ['Drag the slider on the left side of the screen: up to zoom in, down to zoom out. Tap + or − at its ends, or pinch the sky with two fingers. The game remembers your zoom.'] },
      { q: 'How do I get more kites?', a: ['Win coins: every cut, every kite you bring home and every win pays. Claim the daily login and the free gift every four hours, finish the daily challenge, and beat the Mohalla career. Crates in the Shop always give you a kite you don\'t have yet.'] },
      { q: 'The game feels slow on my phone.', a: ['Open Settings, Display, and choose Battery saver. It switches off the heavier effects and keeps the picture at a steady sharpness.'] },
      { q: 'A kite I bought is gone.', a: ['In version 7.1 the Saudi Arabia flag kite and the Pipa, Raia/Wau, Box, Bird and Star kites were retired. Everyone who owned one got the full price back in coins, with a message the next time they opened the game.'] },
      { q: 'Will I lose my coins when I update?', a: ['Not when you install the new version over the old one. If Android says "App not installed" and you have to uninstall first, the coins saved on that phone are lost, so install updates over the top whenever you can.'] },
      { q: 'Is it OK for children?', a: ['There are no ads, no purchases with real money and no open chat: in online rooms players can only send ready-made quick-chat phrases like "Nice cut!".'] },
      { q: 'Is there an iPhone app?', a: ['Not yet. On an iPhone you can play the browser game in Safari, holding the phone sideways.'] }
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
