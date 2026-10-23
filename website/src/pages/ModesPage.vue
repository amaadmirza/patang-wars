<template>
  <div class="wrap md">
    <header class="page-head">
      <h1>Modes and skies</h1>
      <p class="lede">Bots on three levels, a friend beside you, your street against theirs, or a room of friends online.</p>
    </header>

    <section class="md-sec" aria-labelledby="md-modes">
      <h2 id="md-modes" class="visually-hidden">Modes</h2>
      <div class="md-modes">
        <article v-for="m in modes" :key="m.name" class="md-mode">
          <h3>{{ m.name }}</h3>
          <p>{{ m.text }}</p>
          <p class="md-mode-who">{{ m.who }}</p>
        </article>
      </div>
      <p class="muted md-small">Bots come in Easy (slow and forgiving), Normal (a fair fight) and Hard (sharp and aggressive). Matches run 2, 3 or 5 minutes, with no limit, or first to 5 or 10 cuts.</p>
    </section>

    <section class="md-sec" aria-labelledby="md-career">
      <div class="md-head">
        <h2 id="md-career">The Mohalla career</h2>
        <p class="muted">Six neighbourhoods, each unlocked by beating the one before. Team-mates' strings never cut each other; the side with more cuts wins.</p>
      </div>
      <ol class="md-career">
        <li v-for="(m, i) in mohallas" :key="m.name">
          <div class="md-career-name"><h3>{{ m.name }}</h3><p>{{ m.note }}</p></div>
          <p class="md-career-meta">{{ m.size }} vs {{ m.size }}, {{ diffLabel(m.diff) }} bots</p>
          <p class="md-career-reward"><b>{{ m.reward }}</b> coins</p>
        </li>
      </ol>
    </section>

    <section class="md-sec" aria-labelledby="md-skies">
      <div class="md-head">
        <h2 id="md-skies">{{ scenes.length }} skies</h2>
        <p class="muted">Each sky has its own wind. Stronger wind means faster kites and harder pechas.</p>
      </div>
      <ul class="md-skies">
        <li v-for="s in scenes" :key="s.id" :class="{ night: s.night }">
          <span class="md-sky-name">{{ s.name }}</span>
          <span class="md-wind" :title="'Wind ' + s.wind + ' m/s'"><i :style="{ width: (s.wind / 9 * 100) + '%' }"></i></span>
          <span class="md-sky-val">{{ s.wind }} m/s</span>
        </li>
      </ul>
    </section>

    <section class="md-sec" aria-labelledby="md-strings">
      <div class="md-head">
        <h2 id="md-strings">Strings</h2>
        <p class="muted">Your dor decides how well you cut and how long you last. Cotton can't cut at all; razor line cuts hardest but is the most expensive.</p>
      </div>
      <div class="md-strings">
        <article v-for="t in threads" :key="t.id" class="md-string">
          <span class="md-swatch" :style="{ background: t.color }" aria-hidden="true"></span>
          <div>
            <h3>{{ t.name }}</h3>
            <p class="md-string-tier">{{ t.tier }}, {{ t.price ? t.price + ' coins' : 'free' }}</p>
            <p>{{ t.note }}</p>
            <dl class="md-stats">
              <div v-for="(v, k) in t.stats" :key="k"><dt>{{ statLabel(k) }}</dt><dd><span class="md-pips" :aria-label="v + ' of 5'"><i v-for="n in 5" :key="n" :class="{ on: n <= v }"></i></span></dd></div>
            </dl>
          </div>
        </article>
      </div>
    </section>

    <section class="md-sec" aria-labelledby="md-crates">
      <div class="md-head">
        <h2 id="md-crates">Crates</h2>
        <p class="muted">A crate always gives you a kite you don't have yet.</p>
      </div>
      <ul class="md-crates">
        <li v-for="c in crates" :key="c.id"><b>{{ c.name }}</b><span>{{ c.price }} coins</span></li>
      </ul>
    </section>
  </div>
</template>

<script>
import game from '../data/game.json';

export default {
  name: 'ModesPage',
  setup() {
    const modes = [
      { name: 'Festival', who: '1 player, up to 9 bots', text: 'The whole sky at once: everyone against everyone, kites cut on other roofs drifting over yours to loot.' },
      { name: 'Duel', who: '1 player, 1 bot', text: 'One rival, one pecha after another. The best way to learn when to give dheel and when to pull.' },
      { name: 'Two players', who: '2 players, one keyboard', text: 'Split screen on one computer, with bots or without. P1 flies with WASD, P2 with IJKL.' },
      { name: 'Mohalla', who: '2 vs 2 or 3 vs 3', text: 'Team fights, and a career ladder of six neighbourhoods from Mozang to Androon Shehr. Call "Help me!" and a team-mate comes.' },
      { name: 'Online', who: 'Up to 10 friends', text: 'Make a room on your own server, send the invite link on WhatsApp, and fight on one sky. The server decides every cut.' }
    ];
    const diffLabel = d => ({ easy: 'easy', normal: 'normal', hard: 'hard' }[d] || d);
    const statLabel = k => ({ cut: 'Cutting', strength: 'Strength', weight: 'Weight' }[k] || k);
    const threads = game.threads;
    return { modes, mohallas: game.mohallas, scenes: game.scenes, threads, crates: game.rewards.crates, diffLabel, statLabel };
  }
};
</script>

<style>
.md-sec { padding: clamp(24px, 4vw, 44px) 0; }
.md-head { display: grid; grid-template-columns: 1fr 1.2fr; gap: 24px; align-items: end; margin-bottom: 18px; }
.md-head h2, .md-head p { margin: 0; }
@media (max-width: 760px) { .md-head { grid-template-columns: 1fr; gap: 6px; } }
.md-small { font-size: var(--t-sm); margin-top: 14px; }

.md-modes { display: grid; grid-template-columns: repeat(6, 1fr); gap: 14px; }
.md-mode { grid-column: span 2; padding: 20px; border-radius: var(--radius-m); background: var(--surface); box-shadow: inset 0 0 0 1px var(--surface-line); display: flex; flex-direction: column; }
.md-mode:nth-child(4), .md-mode:nth-child(5) { grid-column: span 3; }
.md-mode h3 { font-size: var(--t-xl); margin-bottom: 6px; }
.md-mode p { color: var(--text-soft); margin-bottom: 10px; }
.md-mode-who { margin-top: auto !important; margin-bottom: 0 !important; font-weight: 700; color: var(--text) !important; font-size: var(--t-sm); }
@media (max-width: 860px) { .md-modes { grid-template-columns: 1fr 1fr; } .md-mode, .md-mode:nth-child(4), .md-mode:nth-child(5) { grid-column: span 1; } .md-mode:nth-child(5) { grid-column: 1 / -1; } }
@media (max-width: 520px) { .md-modes { grid-template-columns: 1fr; } }

.md-career { list-style: none; margin: 0; padding: 0; counter-reset: mh; }
.md-career li { counter-increment: mh; display: grid; grid-template-columns: 3rem 1fr 11rem 7rem; gap: 16px; align-items: center; padding: 16px 0; border-top: 1px solid var(--surface-line); }
.md-career li:last-child { border-bottom: 1px solid var(--surface-line); }
.md-career li::before { content: counter(mh); width: 2.6rem; height: 2.6rem; display: grid; place-items: center; border-radius: 50%; background: var(--sky-mist); font-family: var(--display); font-weight: 800; font-size: 1.15rem; }
.md-career li:last-child::before { background: var(--genda); }
.md-career h3 { margin: 0; }
.md-career-name p { margin: 0; color: var(--text-soft); font-size: var(--t-sm); }
.md-career-meta, .md-career-reward { margin: 0; font-size: var(--t-sm); }
.md-career-reward { text-align: right; }
.md-career-reward b { font-family: var(--display); font-size: var(--t-lg); }
@media (max-width: 700px) { .md-career li { grid-template-columns: 3rem 1fr; } .md-career-meta, .md-career-reward { grid-column: 2; text-align: left; } }

.md-skies { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: 1fr 1fr; gap: 0 40px; }
.md-skies li { display: grid; grid-template-columns: 1fr 34% 4.2rem; gap: 12px; align-items: center; padding: 10px 0; border-bottom: 1px dashed var(--surface-line); }
.md-sky-name { font-weight: 500; }
.md-skies li.night .md-sky-name::after { content: ' (night)'; color: var(--text-soft); font-weight: 400; }
.md-wind { height: 8px; border-radius: 4px; background: var(--sky-mist); overflow: hidden; }
.md-wind i { display: block; height: 100%; background: var(--sky); border-radius: 4px; }
.md-sky-val { text-align: right; font-variant-numeric: tabular-nums; color: var(--text-soft); font-size: var(--t-sm); }
@media (max-width: 760px) { .md-skies { grid-template-columns: 1fr; } }

.md-strings { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 14px; }
.md-string { display: grid; grid-template-columns: 14px 1fr; gap: 16px; padding: 18px; border-radius: var(--radius-m); background: var(--surface); box-shadow: inset 0 0 0 1px var(--surface-line); }
.md-swatch { width: 6px; justify-self: center; border-radius: 3px; box-shadow: 0 0 0 1px rgba(42, 15, 28, 0.2); }
.md-string h3 { margin-bottom: 2px; }
.md-string-tier { font-size: var(--t-sm); color: var(--text-soft); margin-bottom: 8px; }
.md-string p { font-size: 0.98rem; }
.md-stats { margin: 0; display: grid; gap: 4px; }
.md-stats > div { display: flex; justify-content: space-between; align-items: center; font-size: var(--t-sm); }
.md-stats dt { color: var(--text-soft); }
.md-stats dd { margin: 0; }
.md-pips { display: inline-flex; gap: 3px; }
.md-pips i { width: 14px; height: 6px; border-radius: 3px; background: var(--sky-mist); }
.md-pips i.on { background: var(--manjha); }

.md-crates { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 12px; }
.md-crates li { display: flex; flex-direction: column; min-width: 180px; padding: 16px 20px; border-radius: var(--radius-m); background: var(--surface); box-shadow: inset 0 0 0 1px var(--surface-line), inset 4px 0 0 var(--genda); }
.md-crates b { font-family: var(--display); font-size: var(--t-lg); }
.md-crates span { color: var(--text-soft); }
</style>
