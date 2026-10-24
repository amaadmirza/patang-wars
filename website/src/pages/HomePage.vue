<template>
  <div>
    <PechaHero />

    <section class="section hp-pecha" aria-labelledby="hp-pecha-h">
      <div class="wrap">
        <h2 id="hp-pecha-h">A pecha, start to finish</h2>
        <p class="lede">Every fight in Bo Kata! is a real pecha: two strings crossed in the sky, and the one that moves wins.</p>
        <ol class="hp-steps">
          <li v-for="s in steps" :key="s.title">
            <h3>{{ s.title }}</h3>
            <p>{{ s.text }}</p>
          </li>
        </ol>
        <router-link class="hp-more" to="/how-to-play">Learn the controls and the tricks</router-link>
      </div>
    </section>

    <section class="hp-shots" aria-labelledby="hp-shots-h">
      <div class="wrap">
        <h2 id="hp-shots-h">On the roof</h2>
        <div class="hp-shot-grid">
          <figure class="hp-shot hp-shot-main">
            <img src="screens/pecha.webp" alt="A pecha in the game: two pink lines crossed over the Lahore rooftops, KHAINCH and DHEEL glowing" loading="lazy" width="1400" height="647" />
            <figcaption>Hooked over the old city. Your card says if you are on top or below; the ring at the crossing turns green while you are cutting.</figcaption>
          </figure>
          <figure class="hp-shot">
            <img src="screens/hub.webp" alt="The home screen: Lahore Rooftops, your kite, the Play button" loading="lazy" width="1400" height="647" />
            <figcaption>Pick a sky, a mode and how sharp the bots are, then Play.</figcaption>
          </figure>
          <figure class="hp-shot">
            <img src="screens/mohalla.webp" alt="The Mohalla career: six neighbourhoods from Mozang to Androon Shehr" loading="lazy" width="1400" height="647" />
            <figcaption>Mohalla: your street against theirs, six neighbourhoods to beat.</figcaption>
          </figure>
        </div>
      </div>
    </section>

    <section class="section hp-kites" aria-labelledby="hp-kites-h">
      <div class="wrap">
        <div class="hp-kites-head">
          <h2 id="hp-kites-h">{{ counts.kites }} kites, from free to legendary</h2>
          <p class="muted">{{ counts.patang }} patangs and {{ counts.tukkal }} tukkals, plus 20 flag kites. {{ counts.free }} are free from your first match; the rest you buy with the coins you win.</p>
        </div>
        <KiteRack :kites="rack" />
        <router-link class="btn hp-kites-btn" to="/kites">Browse every kite</router-link>
      </div>
    </section>

    <section class="hp-basant" aria-labelledby="hp-basant-h">
      <div class="wrap hp-basant-row">
        <div>
          <h2 id="hp-basant-h">Basant, on your screen</h2>
          <p>The yellow kurtas, the dhol on the next roof, the street kids with their jhaar, and that shout from three chhats away. Every word in the game comes from the roof.</p>
          <router-link class="btn btn-quiet" to="/basant">The patang dictionary</router-link>
        </div>
        <dl class="hp-words">
          <div><dt>Pecha</dt><dd>Two strings crossed, sawing until one parts.</dd></div>
          <div><dt>Dheel</dt><dd>Give line. From on top, it cuts.</dd></div>
          <div><dt>Khainch</dt><dd>Pull in, hand over hand. From below, it cuts.</dd></div>
          <div><dt>Kati patang</dt><dd>A cut kite, free for whoever catches it.</dd></div>
        </dl>
      </div>
    </section>

    <section class="section hp-modes" aria-labelledby="hp-modes-h">
      <div class="wrap hp-modes-grid">
        <div>
          <h2 id="hp-modes-h">Five ways to fight</h2>
          <p class="lede">Bots that fly like people, a friend on the same screen, or your whole mohalla online.</p>
          <router-link class="hp-more" to="/modes">Modes, skies and strings</router-link>
        </div>
        <dl class="hp-modes-list">
          <div v-for="m in modes" :key="m.name">
            <dt>{{ m.name }}</dt>
            <dd>{{ m.text }}</dd>
          </div>
        </dl>
      </div>
    </section>

    <section class="hp-go" aria-labelledby="hp-go-h">
      <div class="wrap hp-go-row">
        <div>
          <h2 id="hp-go-h">The wind is right</h2>
          <p>Free, no ads, and it flies offline on your Android phone.</p>
        </div>
        <div class="hp-go-cta">
          <a class="btn" :href="config.apkUrl">Download for Android</a>
          <router-link class="btn btn-quiet" to="/basant">Read about Basant</router-link>
        </div>
      </div>
    </section>
  </div>
</template>

<script>
import PechaHero from '../components/PechaHero.vue';
import KiteRack from '../components/KiteRack.vue';
import config from '../config.js';
import kites from '../data/kites.json';
import game from '../data/game.json';

// a hand-picked rope for the home page: a mix of shapes, colours and rarities
const RACK = ['lal-hukam', 'tukkal-mor', 'chand-tara', 'hilal', 'tukkal-basant', 'lahori-shola', 'char-rang', 'tukkal-shahi', 'bichhu', 'dhanak', 'tukkal-sitaare', 'jangi-pari'];

export default {
  name: 'HomePage',
  components: { PechaHero, KiteRack },
  setup() {
    const byId = new Map(kites.map(k => [k.id, k]));
    const rack = RACK.map(id => byId.get(id)).filter(Boolean);
    const steps = [
      { title: 'Hook', text: 'Fly your line across a rival\'s. From above or below, the two strings catch and the pecha starts.' },
      { title: 'Work the line', text: 'From on top, let line out with DHEEL. From below, pull it in with KHAINCH. A quick tap of FLY is a jhatka: one hard saw.' },
      { title: 'Cut', text: 'A still line loses. When their dor parts, the whole street hears it: bo kata!' },
      { title: 'Loot', text: 'The cut kite drifts down trailing string. Sweep your line through it and reel it home before the street kids grab it.' }
    ];
    const modes = [
      { name: 'Festival', text: 'Up to ten kites over the roofs, everyone against everyone, cut kites drifting over your head to loot.' },
      { name: 'Duel', text: 'You and one bot, one pecha at a time. The cleanest way to learn upar and neeche.' },
      { name: 'Two players', text: 'Split screen on one computer: one on the arrows, one on WASD.' },
      { name: 'Mohalla', text: 'Team fights, 2 vs 2 or 3 vs 3. Your team\'s strings never cut each other. Beat six neighbourhoods.' },
      { name: 'Online', text: 'A room for up to ten friends: share the invite link on WhatsApp and fight on one sky.' }
    ];
    return { rack, steps, modes, counts: game.counts, config };
  }
};
</script>

<style>
.hp-pecha h2 { max-width: 18ch; }
.hp-steps { list-style: none; counter-reset: step; margin: 36px 0 24px; padding: 0; display: grid; grid-template-columns: repeat(4, 1fr); gap: 0; position: relative; }
/* the four steps hang off one pink line, like knots on a dor */
.hp-steps::before { content: ''; position: absolute; left: 22px; right: 22px; top: 22px; height: 2.5px; background: var(--manjha); border-radius: 2px; }
.hp-steps li { counter-increment: step; position: relative; padding: 64px 22px 0 0; }
.hp-steps li::before { content: counter(step); position: absolute; left: 0; top: 0; width: 46px; height: 46px; display: grid; place-items: center; border-radius: 50%;
  background: var(--genda); color: var(--jamun); font-family: var(--display); font-weight: 800; font-size: 1.3rem; box-shadow: 0 0 0 5px var(--page-bg); }
.hp-steps h3 { margin-bottom: 6px; }
.hp-steps p { color: var(--text-soft); font-size: 1rem; }
.hp-more { font-weight: 700; }
@media (max-width: 860px) {
  .hp-steps { grid-template-columns: 1fr; gap: 26px; }
  .hp-steps::before { left: 22px; right: auto; top: 22px; bottom: 22px; width: 2.5px; height: auto; }
  .hp-steps li { padding: 4px 0 0 70px; }
}

.hp-shots { padding: 8px 0 clamp(48px, 7vw, 96px); }
.hp-shot-grid { display: grid; grid-template-columns: 1.6fr 1fr; grid-template-rows: auto auto; gap: 18px; margin-top: 18px; }
.hp-shot { margin: 0; }
.hp-shot img { width: 100%; height: auto; border-radius: var(--radius-m); box-shadow: 0 0 0 1px var(--surface-line), 0 18px 34px -18px rgba(28, 79, 166, 0.45); }
.hp-shot-main { grid-row: span 2; }
.hp-shot figcaption { font-size: var(--t-sm); color: var(--text-soft); margin-top: 8px; max-width: 60ch; }
@media (max-width: 760px) { .hp-shot-grid { grid-template-columns: 1fr; } .hp-shot-main { grid-row: auto; } }

.hp-kites { background: var(--surface); border-block: 1px solid var(--surface-line); }
.hp-kites-head { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; align-items: end; margin-bottom: 18px; }
.hp-kites-head h2 { margin: 0; }
.hp-kites-head p { margin: 0; }
.hp-kites-btn { margin-top: 18px; }
@media (max-width: 760px) { .hp-kites-head { grid-template-columns: 1fr; gap: 8px; } }

.hp-modes-grid { display: grid; grid-template-columns: 1fr 1.3fr; gap: clamp(24px, 5vw, 64px); align-items: start; }
.hp-modes-list { margin: 0; display: grid; gap: 0; }
.hp-modes-list > div { display: grid; grid-template-columns: 9.5rem 1fr; gap: 16px; padding: 14px 0; border-top: 1px solid var(--surface-line); }
.hp-modes-list > div:last-child { border-bottom: 1px solid var(--surface-line); }
.hp-modes-list dt { font-family: var(--display); font-weight: 800; font-size: var(--t-lg); line-height: 1.2; }
.hp-modes-list dd { margin: 0; color: var(--text-soft); }
@media (max-width: 760px) { .hp-modes-grid { grid-template-columns: 1fr; } .hp-modes-list > div { grid-template-columns: 1fr; gap: 2px; } }

.hp-basant { background: var(--genda); color: var(--jamun); padding: clamp(36px, 5vw, 64px) 0; }
.hp-basant-row { display: grid; grid-template-columns: 1fr 1.1fr; gap: clamp(20px, 4vw, 56px); align-items: center; }
.hp-basant p { max-width: 46ch; }
.hp-basant .btn-quiet { color: var(--jamun); }
.hp-words { margin: 0; display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.hp-words > div { padding: 14px 16px; border-radius: var(--radius-m); background: rgba(255, 255, 255, 0.55); }
.hp-words dt { font-family: var(--display); font-weight: 800; font-size: var(--t-lg); }
.hp-words dd { margin: 2px 0 0; font-size: 0.98rem; }
@media (max-width: 760px) { .hp-basant-row { grid-template-columns: 1fr; } }
@media (max-width: 420px) { .hp-words { grid-template-columns: 1fr; } }
.hp-go { background: var(--sky); color: #fff; padding: clamp(40px, 6vw, 72px) 0; }
.hp-go-row { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 20px; }
.hp-go h2 { margin-bottom: 6px; }
.hp-go p { margin: 0; color: #e3eeff; }
.hp-go-cta { display: flex; flex-wrap: wrap; gap: 12px; }
.hp-go .btn-quiet { color: #fff; }
</style>
