<template>
  <div class="bs">
    <header class="bs-head">
      <div class="wrap">
        <h1>Basant</h1>
        <p class="lede">The day the whole city climbs onto its roofs. Yellow clothes, music from every chhat, the sky full of patangs, and every few minutes, somewhere, a shout: <b>bo kata!</b></p>
      </div>
    </header>

    <section class="wrap bs-sec bs-story" aria-labelledby="bs-day">
      <div>
        <h2 id="bs-day">A day on the roof</h2>
        <p>Basant welcomes the spring at the end of winter, when the mustard fields of Punjab turn yellow. In Lahore it belongs to the rooftops: families and friends gather on the chhat from morning, the old city's roofs fill up shoulder to shoulder, and the fight in the sky goes on until dark. At night the kites come back out under lights.</p>
        <p>Nobody flies alone. One hand holds the dor, another friend holds the charkhi or pinna and lets the line run, and the whole roof watches every pecha. When your kite cuts another, the roof erupts. When yours is cut, the street kids are already running for it.</p>
      </div>
      <figure class="bs-fig">
        <img src="screens/hub.webp" alt="Bo Kata! home screen: Lahore Rooftops with a patang in the sky" loading="lazy" width="1400" height="647" />
        <figcaption>Lahore Rooftops, the first sky in the game. Old City Sunset, Walled City and Basant Night are waiting too.</figcaption>
      </figure>
    </section>

    <section class="bs-band" aria-labelledby="bs-pecha">
      <div class="wrap">
        <h2 id="bs-pecha">How a pecha is won</h2>
        <p class="lede">A pecha is two strings crossed in the sky. Nobody wins by holding still: the string that moves through the crossing does the cutting.</p>
        <ol class="bs-steps">
          <li><h3>Cross their line</h3><p>Fly your patang across a rival's string, from above or from below. The strings catch, and the pecha is on.</p></li>
          <li><h3>Work your dor</h3><p>On top? Give <b>dheel</b>: let the line run out so it saws across theirs. Underneath? <b>Khainch</b>: pull in, hand over hand, fast.</p></li>
          <li><h3>One sharp jhatka</h3><p>A quick tug in the middle of a pecha, a <b>jhatka</b>, saws hard for a moment. Good fliers save it for the right second.</p></li>
          <li><h3>Bo kata!</h3><p>Their string parts. The cut patang goes limp and drifts off with the wind, its string trailing behind it.</p></li>
        </ol>
      </div>
    </section>

    <section class="wrap bs-sec" aria-labelledby="bs-kite">
      <h2 id="bs-kite">Know your kite</h2>
      <div class="bs-kite">
        <figure class="bs-anatomy" aria-label="The parts of a patang">
          <svg viewBox="0 0 320 340" role="img" aria-labelledby="bs-anat-t">
            <title id="bs-anat-t">A patang with its parts labelled: kaman, spine, kanni and dor</title>
            <path d="M160 20 L292 150 L160 300 L28 150 Z" class="bs-paper" />
            <path d="M160 20 L160 300" class="bs-stick" />
            <path d="M36 150 Q160 72 284 150" class="bs-stick" />
            <path d="M160 116 Q205 170 196 214 M160 236 Q190 228 196 214" class="bs-kanni" />
            <path d="M196 214 Q236 270 250 336" class="bs-dor" />
            <circle cx="196" cy="214" r="5" class="bs-knot" />
            <text x="232" y="96" class="bs-lab">kaman</text>
            <text x="114" y="268" class="bs-lab">spine</text>
            <text x="210" y="198" class="bs-lab">kanni</text>
            <text x="258" y="300" class="bs-lab">dor</text>
          </svg>
        </figure>
        <div class="bs-parts">
          <dl>
            <div><dt>Kaman</dt><dd>The curved bamboo bow across the kite. It bends back in the wind, and that bend is what keeps a patang flying.</dd></div>
            <div><dt>Spine</dt><dd>The straight stick from nose to tail. The kite turns around it.</dd></div>
            <div><dt>Kanni</dt><dd>The two short strings tied through the paper that meet in a knot, where the dor is tied. Move the knot toward the nose and the kite flies flatter and faster; toward the tail and it climbs steadier. In the game you can re-tie it before a match.</dd></div>
            <div><dt>Dor and manjha</dt><dd>The flying line. Manjha is dor coated with glue and powdered glass, made for cutting. In the game you choose your string: cotton can't cut at all, glass manjha is the classic, and the sharpest strings cost the most coins.</dd></div>
          </dl>
          <div class="bs-types">
            <div><h3>Patang</h3><p>The Lahori fighter: a light paper diamond with no tail. Fast, twitchy, it spins on slack line and darts the moment you tug.</p></div>
            <div><h3>Tukkal</h3><p>Bigger, with a paper tail. Steadier in gusts and harder to knock out of the sky, a little slower to turn.</p></div>
          </div>
        </div>
      </div>
    </section>

    <section class="wrap bs-sec" aria-labelledby="bs-dict">
      <h2 id="bs-dict">The patang dictionary</h2>
      <p class="muted">The words you'll hear on every roof, and in the game.</p>
      <dl class="bs-dict">
        <div v-for="w in words" :key="w.term"><dt>{{ w.term }}</dt><dd>{{ w.text }}</dd></div>
      </dl>
    </section>

    <section class="wrap bs-sec bs-safe" aria-labelledby="bs-safe">
      <h2 id="bs-safe">Fly it safely</h2>
      <p>On a real roof, glass, chemical and metal-coated strings have hurt people, riders on the road and birds, and many cities restrict kite flying, so check the rules where you live. In Bo Kata! the manjha is make-believe: cut all the kites you like.</p>
    </section>
  </div>
</template>

<script>
export default {
  name: 'BasantPage',
  setup() {
    const words = [
      { term: 'Bo kata!', text: 'The shout when a kite is cut. In the game your own roof shouts it when you win a pecha, in Urdu or Hindi.' },
      { term: 'Pecha', text: 'A kite fight: two strings crossed and sawing at each other until one parts.' },
      { term: 'Dheel', text: 'Letting line out. From on top of a pecha, dheel cuts best. In open sky it lets the kite run away downwind.' },
      { term: 'Khainch', text: 'Pulling the line in, hand over hand. From underneath a pecha, khainch cuts best.' },
      { term: 'Tunka', text: 'A short tug on the line. The kite dips, swings and darts the way its nose points.' },
      { term: 'Jhatka', text: 'A tunka in the middle of a pecha: one sharp jerk that saws hard for a moment.' },
      { term: 'Ghoomna', text: 'A patang turning by itself on a loose line. Wait until the nose points your way, then pull.' },
      { term: 'Manjha', text: 'Cutting string: cotton coated with glue and powdered glass.' },
      { term: 'Dor', text: 'The flying line itself.' },
      { term: 'Charkhi', text: 'The wooden reel that holds the dor, held by a friend who lets it spin.' },
      { term: 'Pinna', text: 'A ball of string wound by hand, the simple alternative to a charkhi.' },
      { term: 'Kanni', text: 'The bridle: two strings on the kite meeting in the knot where the dor is tied.' },
      { term: 'Kaman', text: 'The curved bamboo bow of a patang.' },
      { term: 'Kati patang', text: 'A cut kite, drifting loose. Whoever gets it first keeps it.' },
      { term: 'Lapetna', text: 'Wrapping a falling kite with your own line to bring it down to your roof.' },
      { term: 'Jhaar', text: 'The thorny stick the street kids use to snag a falling kite before you can.' },
      { term: 'Chhat', text: 'The roof, where Basant happens.' },
      { term: 'Mohalla', text: 'Your neighbourhood. In the game, your street fights theirs as a team.' }
    ];
    return { words };
  }
};
</script>

<style>
.bs-head { background: linear-gradient(180deg, #f2a900 0%, #ffd23f 70%, #ffe57d 100%); color: var(--jamun); padding: clamp(44px, 7vw, 88px) 0 clamp(28px, 4vw, 48px); }
.bs-head .lede { color: var(--jamun); max-width: 56ch; }
.bs-sec { padding: clamp(36px, 5vw, 64px) var(--gutter) 0; }
.bs-story { display: grid; grid-template-columns: 1.1fr 1fr; gap: clamp(20px, 4vw, 48px); align-items: center; }
.bs-fig { margin: 0; }
.bs-fig img { width: 100%; height: auto; border-radius: var(--radius-m); box-shadow: 0 0 0 1px var(--surface-line); }
.bs-fig figcaption { font-size: var(--t-sm); color: var(--text-soft); margin-top: 8px; }
.bs-band { margin-top: clamp(40px, 6vw, 72px); padding: clamp(36px, 5vw, 64px) 0; background: var(--sky); color: #fff; }
.bs-band .lede { color: #e3eeff; }
.bs-steps { list-style: none; counter-reset: s; margin: 24px 0 0; padding: 0; display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; }
.bs-steps li { counter-increment: s; position: relative; padding-top: 52px; }
.bs-steps li::before { content: counter(s); position: absolute; top: 0; left: 0; width: 40px; height: 40px; border-radius: 50%; display: grid; place-items: center; background: var(--genda); color: var(--jamun); font-family: var(--display); font-weight: 800; }
.bs-steps p { color: #e3eeff; font-size: 1rem; }
.bs-kite { display: grid; grid-template-columns: minmax(220px, 0.8fr) 1.4fr; gap: clamp(20px, 4vw, 48px); align-items: start; margin-top: 12px; }
.bs-anatomy { margin: 0; padding: 12px; border-radius: var(--radius-l); background: var(--surface); box-shadow: inset 0 0 0 1px var(--surface-line); }
.bs-anatomy svg { width: 100%; height: auto; display: block; }
.bs-paper { fill: #e63946; stroke: #9c1d29; stroke-width: 2; }
.bs-stick { fill: none; stroke: #f6e2b0; stroke-width: 4; stroke-linecap: round; }
.bs-kanni { fill: none; stroke: var(--text); stroke-width: 2; }
.bs-dor { fill: none; stroke: var(--manjha); stroke-width: 2.5; }
.bs-knot { fill: var(--genda); stroke: var(--text); stroke-width: 1.5; }
.bs-lab { font-family: var(--display); font-weight: 700; font-size: 17px; fill: var(--text); paint-order: stroke; stroke: var(--surface); stroke-width: 5px; }
.bs-parts dl { margin: 0; }
.bs-parts dl > div { padding: 12px 0; border-top: 1px solid var(--surface-line); }
.bs-parts dt { font-family: var(--display); font-weight: 800; font-size: var(--t-lg); }
.bs-parts dd { margin: 2px 0 0; color: var(--text-soft); }
.bs-types { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-top: 18px; }
.bs-types > div { padding: 16px 18px; border-radius: var(--radius-m); background: var(--surface); box-shadow: inset 0 0 0 1px var(--surface-line); }
.bs-types h3 { margin-bottom: 4px; }
.bs-types p { margin: 0; color: var(--text-soft); font-size: 1rem; }
.bs-dict { margin: 16px 0 0; display: grid; grid-template-columns: 1fr 1fr; gap: 0 40px; }
.bs-dict > div { display: grid; grid-template-columns: 8.5rem 1fr; gap: 14px; padding: 12px 0; border-top: 1px solid var(--surface-line); }
.bs-dict dt { font-family: var(--display); font-weight: 800; font-size: 1.12rem; color: var(--link); }
.bs-dict dd { margin: 0; color: var(--text-soft); }
.bs-safe p { max-width: 68ch; }
@media (max-width: 860px) {
  .bs-story, .bs-kite { grid-template-columns: 1fr; }
  .bs-steps { grid-template-columns: 1fr 1fr; }
  .bs-dict { grid-template-columns: 1fr; }
}
@media (max-width: 520px) { .bs-steps, .bs-types { grid-template-columns: 1fr; } .bs-dict > div { grid-template-columns: 1fr; gap: 2px; } }
</style>
