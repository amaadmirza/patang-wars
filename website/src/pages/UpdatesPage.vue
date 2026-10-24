<template>
  <div class="wrap up">
    <header class="page-head">
      <h1>Updates</h1>
      <p class="lede">What changed in each version, newest first.</p>
    </header>
    <ol class="up-list">
      <li v-for="r in releases" :key="r.v" class="up-rel">
        <div class="up-when"><h2>v{{ r.v }}</h2><p>{{ r.title }}</p></div>
        <ul>
          <li v-for="(c, i) in r.changes" :key="i">{{ c }}</li>
        </ul>
      </li>
    </ol>
  </div>
</template>

<script>
export default {
  name: 'UpdatesPage',
  setup() {
    const releases = [
      { v: '7.6', title: 'Bo kata, right on time', changes: [
        '"Bo kata!" is shouted the instant the kite is cut. On some phones the voice came 5-10 seconds late; the game now records its shouts when it starts, so they play at once.',
        'A kite you hook now comes down your line to your roof by itself in a few seconds. Khainch still brings it faster.',
        'In a pecha your kite no longer gets stuck right overhead, and DHEEL spins it there too.',
        'The slow-motion replay after a cut is now off (it paused the game). Switch it on in Settings if you like it.'
      ] },
      { v: '7.5', title: 'Smooth ghoomna, a little bow', changes: [
        'On DHEEL your patang spins smoothly and evenly again, one way round, as in 7.2. FLY, tunka or khainch still stop it dead, nose steady.',
        'The wings bow back a little in the wind, steady, with no ripple.'
      ] },
      { v: '7.4', title: 'Ghoomna like the real thing', changes: [
        'Give DHEEL and your patang now spins the way a real one does: never perfectly even, now and then the other way, and tipping in 3D as it turns. Press FLY or tunka and it stops dead, nose steady, and flies that way.',
        'The kite is a stiff, flat sail again: no more bending or rippling on tunka, khainch, fly or steering.',
        'The dor is finer and hangs in a natural curve, bending behind the kite as it moves.',
        'In a pecha your kite holds steady while the dor does the cutting.'
      ] },
      { v: '7.3', title: 'A kite that listens', changes: [
        'Let go and your kite now settles nose-up into a steady hover, instead of spinning round and round. Fly goes where you point it.',
        'Holding FLY right overhead no longer freezes the kite in mid-air: it climbs and the wind carries it back out.',
        'After a khainch brings the kite close, it no longer starts spinning and diving into the roof.',
        'The paper sail tips less when you steer or give dheel, so it always looks like a patang.'
      ] },
      { v: '7.2', title: 'Smooth pechas, steady kites', changes: [
        'No more freezes in the middle of a pecha: the people on the roofs and the street kids are drawn far more efficiently.',
        'Your kite keeps its shape: tunka, khainch and steering no longer twist and bend it out of shape.',
        'A new Basant page on this site, with the patang dictionary.'
      ] },
      { v: '7.1', title: 'Kites that fly like paper', changes: [
        'Left alone, your kite now turns slowly by itself like a real patang (about a turn every two seconds); press FLY when the nose points your way. You can switch it off in Settings.',
        'Kites are drawn as bowed paper sails: the wings bend back under load, the kite banks into turns, rocks in the gusts and its corners flutter.',
        'A slack line now hangs in a real curve and straightens when you pull.',
        'Zoom on phones is a slider on the left edge: drag up to zoom in, down to zoom out.',
        'Smoother pechas and sharper graphics on phones.',
        'No more jump from the splash screen to the home screen.',
        'Retired: the Saudi Arabia flag kite and the Pipa, Raia/Wau, Box, Bird and Star kites. Anyone who bought one got the full price back in coins.'
      ] },
      { v: '7.0', title: 'New name: Bo Kata!', changes: [
        'Patang Wars is now Bo Kata!, with a new logo and app splash. The Android app updates over the old one and keeps your coins and kites.',
        'A smaller Loot chase window, with Small, Large and Hide in Settings.',
        'A real pause menu on phones: Resume, Settings, Controls and Quit to home. Back opens and closes it.',
        'Faster menus on phones, and a clearer "Bo kata!" shout in Urdu or Hindi.'
      ] },
      { v: '6.5', title: 'Quieter pecha, phone zoom', changes: [
        'A softer pecha sound and thinner lines.',
        'At most three lines in one tangle; bots no longer pile onto your pecha.',
        'Zoom buttons and pinch on phones, remembered between matches.',
        'New menu icons and pickers for mode and bots.'
      ] },
      { v: '6.4', title: 'Upar ya neeche', changes: [
        'Pechas reward the right move: dheel from on top, khainch from below, and a jhatka for a sharp saw.',
        'Join a pecha already on; the cut goes to whoever did the most cutting.',
        'Kites climb higher and launch faster; easier to aim with a quick tap.',
        'Music that doesn\'t wear you out, and Online on the home rail.'
      ] },
      { v: '6.3', title: 'A new home screen', changes: [
        'A mobile-game home screen with your kite flying over the chosen sky.',
        'Daily login rewards, a free gift every four hours and kite crates.',
        'Bought kites are kept outside the game folder and can be backed up with a code.'
      ] }
    ];
    return { releases };
  }
};
</script>

<style>
.up-list { list-style: none; margin: 0; padding: 0; }
.up-rel { display: grid; grid-template-columns: 14rem 1fr; gap: 24px; padding: 28px 0; border-top: 1px solid var(--surface-line); }
.up-rel:first-child { border-top: 0; }
.up-when h2 { margin: 0; font-size: var(--t-xl); }
.up-when p { margin: 0; color: var(--text-soft); }
.up-rel:first-child .up-when h2 { color: var(--manjha-ink); }
.up-rel ul { margin: 0; padding-left: 1.1em; display: grid; gap: 8px; max-width: 70ch; }
.up-rel ul li::marker { color: var(--manjha); }
@media (max-width: 700px) { .up-rel { grid-template-columns: 1fr; gap: 10px; } }
</style>
