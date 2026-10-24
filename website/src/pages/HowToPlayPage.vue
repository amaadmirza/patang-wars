<template>
  <div class="wrap hw">
    <header class="page-head">
      <h1>How to play</h1>
      <p class="lede">Point the nose, fly, and fight with the line: a few keys, and a few things every rooftop flier knows.</p>
    </header>

    <section class="hw-sec" aria-labelledby="hw-ctl">
      <h2 id="hw-ctl">Controls</h2>
      <div class="hw-table-wrap">
        <table class="hw-table">
          <caption class="visually-hidden">Keyboard and touch controls</caption>
          <thead><tr><th scope="col">Action</th><th scope="col">Keyboard</th><th scope="col">Two players (P1 / P2)</th><th scope="col">Phone</th></tr></thead>
          <tbody>
            <tr v-for="c in controls" :key="c.what">
              <th scope="row"><b>{{ c.what }}</b><span>{{ c.note }}</span></th>
              <td><kbd v-for="k in c.keys" :key="k">{{ k }}</kbd></td>
              <td><kbd v-for="k in c.p12" :key="k">{{ k }}</kbd></td>
              <td><span class="hw-touch">{{ c.touch }}</span></td>
            </tr>
          </tbody>
        </table>
      </div>
      <p class="muted hw-small">Zoom with the mouse wheel or <kbd>[</kbd> <kbd>]</kbd>. On a phone, drag the slider on the left edge up to zoom in and down to zoom out, or pinch the sky. Prefer swiping? Settings, then Controls, then Swipe.</p>
    </section>

    <section class="hw-sec hw-two" aria-labelledby="hw-fly">
      <div>
        <h2 id="hw-fly">Flying</h2>
        <p>Let go of everything and your patang settles nose-up into a steady hover. To aim it, steer: a quick tap nudges the nose, holding turns it fast. Then press FLY and it flies the way its nose points.</p>
        <p>Like a real patang it runs out of power at the edges of the sky and straight overhead. Give it DHEEL and a loose patang spins by itself and runs away with the line. Want it to turn slowly when left alone too? Settings, General, Kite turns when left alone.</p>
        <p>Kite down on a roof? Press FLY and it launches again from there.</p>
      </div>
      <figure class="hw-fig">
        <img src="screens/match.webp" alt="Flying in Lahore Rooftops: the zoom slider on the left, KHAINCH, DHEEL and FLY on the right" loading="lazy" width="1400" height="647" />
        <figcaption>Steer on the left, KHAINCH, DHEEL and FLY on the right, zoom slider on the left edge.</figcaption>
      </figure>
    </section>

    <section class="hw-sec" aria-labelledby="hw-pecha">
      <h2 id="hw-pecha">Winning a pecha</h2>
      <div class="hw-two">
        <div>
          <p>Fly your line across a rival's and the two hook. What cuts is line moving through the crossing, so a still line loses. Back out the way you came to escape.</p>
          <p><b>Upar ya neeche.</b> If you are on top, DHEEL cuts best. If you are below, KHAINCH cuts best. Your card in the top-left corner says which you are, and the ring at the crossing is green while you are cutting and red while you are being cut.</p>
          <p>A quick tap of FLY in a pecha is a <b>jhatka</b>: one sharp jerk that saws hard for a moment. A third kite can join a pecha already on, but never more than three lines in one tangle, and the cut goes to whoever did the most cutting.</p>
        </div>
        <figure class="hw-chart" aria-labelledby="hw-chart-cap">
          <figcaption id="hw-chart-cap"><b>What wins a pecha.</b> Share of pechas won by a test player using each approach, measured in the game.</figcaption>
          <ul>
            <li v-for="r in winRates" :key="r.how" :class="{ best: r.best }">
              <span class="hw-bar-label">{{ r.how }}</span>
              <span class="hw-bar"><i :style="{ width: r.pct + '%' }"></i></span>
              <span class="hw-bar-val">{{ r.pct }}%</span>
            </li>
          </ul>
        </figure>
      </div>
    </section>

    <section class="hw-sec" aria-labelledby="hw-tips">
      <h2 id="hw-tips">Ustad tips</h2>
      <ul class="hw-tips">
        <li v-for="t in tips" :key="t.title"><h3>{{ t.title }}</h3><p>{{ t.text }}</p></li>
      </ul>
    </section>

    <section class="hw-sec hw-two" aria-labelledby="hw-loot">
      <div>
        <h2 id="hw-loot">Loot</h2>
        <p>Cut kites fall trailing string, and in a Festival kites cut over other roofs keep drifting over yours. Sweep your line through a falling kite or its dor and it wraps onto your line and comes down it to your hands in a few seconds. Hold KHAINCH to bring it faster.</p>
        <p>Be quick. The street kids snag loose kites with their jhaar sticks, or catch the trailing dor and haul it down hand over hand; the Loot chase window in the corner shows the race. Sweep your line through it while they pull and you can still snatch it.</p>
      </div>
      <figure class="hw-fig">
        <img src="screens/loot-window.webp" alt="A match with the small Loot chase window in the corner" loading="lazy" width="1400" height="681" />
        <figcaption>The Loot chase window: small, in the corner, and you can hide it in Settings.</figcaption>
      </figure>
    </section>

    <section class="hw-sec" aria-labelledby="hw-score">
      <h2 id="hw-score">Points, coins and rank</h2>
      <div class="hw-three">
        <div>
          <h3>Points in a match</h3>
          <dl class="hw-dl">
            <div><dt>A cut</dt><dd>+3</dd></div>
            <div><dt>Kite brought home</dt><dd>+2</dd></div>
            <div><dt>Losing your kite</dt><dd>−1</dd></div>
          </dl>
          <p class="muted">Cuts in a row earn bonus points.</p>
        </div>
        <div>
          <h3>Coins</h3>
          <dl class="hw-dl">
            <div><dt>Each cut</dt><dd>{{ pay.cut }}</dd></div>
            <div><dt>Each kite home</dt><dd>{{ pay.caught }}</dd></div>
            <div><dt>A win</dt><dd>{{ pay.win }}</dd></div>
            <div><dt>Finishing a match</dt><dd>{{ pay.match }}</dd></div>
          </dl>
          <p class="muted">You start with {{ start }} coins. Daily login pays {{ loginLine }}, a free gift every 4 hours, and a daily challenge.</p>
        </div>
        <div>
          <h3>Rank</h3>
          <ol class="hw-ranks">
            <li v-for="r in ranks" :key="r[0]"><b>{{ r[0] }}</b><span>{{ r[1] ? r[1].toLocaleString() + ' XP' : 'start' }}</span></li>
          </ol>
          <p class="muted">Every cut, every kite home and every win earns XP.</p>
        </div>
      </div>
    </section>
  </div>
</template>

<script>
import game from '../data/game.json';

export default {
  name: 'HowToPlayPage',
  setup() {
    const controls = [
      { what: 'Fly', note: 'hold: the kite flies along its nose', keys: ['↑'], p12: ['W', 'I'], touch: 'Hold FLY' },
      { what: 'Tunka', note: 'a quick tap of Fly: dip, swing, dart', keys: ['↑'], p12: ['W', 'I'], touch: 'Tap FLY' },
      { what: 'Steer', note: 'turn the nose', keys: ['←', '→'], p12: ['A D', 'J L'], touch: '◀ ▶' },
      { what: 'Khainch', note: 'hold: pull the line in', keys: ['A', '↓'], p12: ['S', 'K'], touch: 'KHAINCH' },
      { what: 'Dheel', note: 'hold: let line out', keys: ['D'], p12: ['Q', 'O'], touch: 'DHEEL' },
      { what: 'Land', note: 'bring it home and change kite', keys: ['R'], p12: ['R', 'H'], touch: 'Land' }
    ];
    // measured in the game (README v6.4): a test player, many pechas per approach
    const winRates = [
      { how: 'Holding still', pct: 22 },
      { how: 'The wrong way (khainch on top, dheel below)', pct: 31 },
      { how: 'Khainch only', pct: 47 },
      { how: 'Khainch with jhatkas', pct: 53 },
      { how: 'Dheel on top, khainch below', pct: 69, best: true }
    ];
    const tips = [
      { title: 'Let it spin, then tunka', text: 'Give a little DHEEL and a patang spins on the slack line. Watch the nose, and the moment it points where you want to go, tap FLY for a tunka. It is faster than steering and it is how real fliers aim.' },
      { title: 'Fight from above', text: 'Climb over a rival before you cross their line. From on top, a long dheel does the cutting for you while they struggle underneath.' },
      { title: 'Never hold still', text: 'In a pecha the moving string cuts. If you are underneath, khainch hard; if you are losing, a jhatka or two buys you the moment you need.' },
      { title: 'Watch your line wear', text: 'Your card in the corner shows tension and line wear. A worn line goes quickly, so back out of a bad pecha the way you came in, and fight again later.' },
      { title: 'Pick the kite for the wind', text: 'A patang is quick and twitchy, best on calm days. On a gusty sky like Monsoon Clouds or Karachi Seaside, a tukkal stays steadier.' },
      { title: 'Pick your string', text: 'Glass manjha is a fine all-rounder. Nylon barely cuts but almost never snaps; the sharpest strings cut fastest but are fragile. Buy them in the Shop with coins you win.' },
      { title: 'Loot low and fast', text: 'A cut kite falls with the wind. Sweep your line through it or its trailing string before it reaches the street, then khainch it home before the kids grab it.' },
      { title: 'Help your mohalla', text: 'In team matches, call "Help me!" from quick chat and a team-mate joins your pecha. Your team\'s strings never cut each other.' }
    ];
    const ranks = [['Naya', 0], ['Shagird', 400], ['Patangbaaz', 1200], ['Pecha Baaz', 2600], ['Ustad', 4800], ['Khalifa', 8000]];
    const R = game.rewards, coins = R.login.filter(d => d.coins).map(d => d.coins);
    const loginLine = `${coins[0]} to ${coins[coins.length - 1]} coins over six days and a free Rare Crate on day seven`;
    return { controls, winRates, tips, ranks, pay: R.pay, start: R.start, loginLine };
  }
};
</script>

<style>
.hw-sec { padding: clamp(28px, 4vw, 48px) 0; border-top: 1px solid var(--surface-line); }
.hw-sec:first-of-type { border-top: 0; padding-top: 8px; }
.hw-two { display: grid; grid-template-columns: 1fr 1fr; gap: clamp(20px, 4vw, 48px); align-items: start; }
.hw-three { display: grid; grid-template-columns: repeat(3, 1fr); gap: clamp(20px, 4vw, 40px); }
@media (max-width: 860px) { .hw-two, .hw-three { grid-template-columns: 1fr; } }
.hw-tips { list-style: none; margin: 14px 0 0; padding: 0; display: grid; grid-template-columns: repeat(2, 1fr); gap: 0 40px; }
.hw-tips li { position: relative; padding: 14px 0 12px 36px; border-top: 1px solid var(--surface-line); }
.hw-tips li::before { content: ''; position: absolute; left: 6px; top: 22px; width: 13px; height: 13px; transform: rotate(45deg); background: var(--genda); box-shadow: 0 0 0 2px var(--jamun-soft); border-radius: 1px; }
.hw-tips h3 { margin: 0 0 4px; }
.hw-tips p { margin: 0; color: var(--text-soft); }
@media (max-width: 760px) { .hw-tips { grid-template-columns: 1fr; } }
.hw-fig { margin: 0; }
.hw-fig img { width: 100%; height: auto; border-radius: var(--radius-m); box-shadow: 0 0 0 1px var(--surface-line); }
.hw-fig figcaption { font-size: var(--t-sm); color: var(--text-soft); margin-top: 8px; }
.hw-small { font-size: var(--t-sm); margin-top: 12px; }

.hw-table-wrap { overflow-x: auto; border-radius: var(--radius-m); box-shadow: inset 0 0 0 1px var(--surface-line); background: var(--surface); }
.hw-table { width: 100%; border-collapse: collapse; min-width: 560px; }
.hw-table th, .hw-table td { padding: 12px 16px; text-align: left; vertical-align: middle; border-bottom: 1px solid var(--surface-line); }
.hw-table thead th { font-size: var(--t-sm); color: var(--text-soft); font-weight: 500; background: var(--sky-mist); }
.hw-table tbody tr:last-child > * { border-bottom: 0; }
.hw-table tbody th b { display: block; font-family: var(--display); font-size: 1.1rem; }
.hw-table tbody th span { display: block; font-size: var(--t-sm); color: var(--text-soft); font-weight: 400; }
.hw-table kbd + kbd { margin-left: 6px; }
.hw-touch { display: inline-block; padding: 2px 10px; border-radius: 999px; background: var(--jamun); color: #fff; font-weight: 700; font-size: var(--t-sm); letter-spacing: 0.02em; }

.hw-chart { margin: 0; padding: 20px; border-radius: var(--radius-m); background: var(--surface); box-shadow: inset 0 0 0 1px var(--surface-line); }
.hw-chart figcaption { font-size: var(--t-sm); color: var(--text-soft); margin-bottom: 14px; }
.hw-chart figcaption b { color: var(--text); font-size: var(--t-md); display: block; }
.hw-chart ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 12px; }
.hw-chart li { display: grid; grid-template-columns: 1fr 3.2rem; grid-template-areas: 'label label' 'bar val'; gap: 2px 10px; align-items: center; }
.hw-bar-label { grid-area: label; font-size: var(--t-sm); }
.hw-bar { grid-area: bar; height: 12px; border-radius: 6px; background: var(--sky-mist); overflow: hidden; }
.hw-bar i { display: block; height: 100%; border-radius: 6px; background: var(--plaster-dark); }
.hw-chart li.best .hw-bar i { background: var(--manjha); }
.hw-chart li.best .hw-bar-label { font-weight: 700; }
.hw-bar-val { grid-area: val; text-align: right; font-weight: 700; font-variant-numeric: tabular-nums; }

.hw-dl { margin: 0 0 10px; }
.hw-dl > div { display: flex; justify-content: space-between; gap: 12px; padding: 7px 0; border-bottom: 1px dashed var(--surface-line); }
.hw-dl dt { color: var(--text-soft); }
.hw-dl dd { margin: 0; font-weight: 700; font-variant-numeric: tabular-nums; }
.hw-ranks { list-style: none; margin: 0 0 10px; padding: 0; }
.hw-ranks li { display: flex; justify-content: space-between; gap: 12px; padding: 7px 0; border-bottom: 1px dashed var(--surface-line); }
.hw-ranks span { color: var(--text-soft); font-variant-numeric: tabular-nums; }
</style>
