<template>
  <footer class="sf">
    <SkylineEdge class="sf-roofs" />
    <div class="sf-body">
      <div class="wrap sf-grid">
        <div class="sf-brand">
          <img src="brand/logo.svg" alt="Bo Kata! Cut, loot, rule the sky." width="220" height="160" />
          <p>Basant ka asli muqabla. A rooftop kite-fighting game made in Pakistan for everyone who grew up on a chhat. Version {{ config.version }}.</p>
        </div>
        <nav class="sf-col" aria-label="The game">
          <h2>The game</h2>
          <router-link to="/how-to-play">How to play and tips</router-link>
          <router-link to="/kites">All kites</router-link>
          <router-link to="/modes">Modes and skies</router-link>
          <router-link to="/updates">What's new</router-link>
        </nav>
        <nav class="sf-col" aria-label="More">
          <h2>More</h2>
          <router-link to="/basant">Basant and the patang dictionary</router-link>
          <router-link to="/download">Download for Android</router-link>
          <router-link to="/faq">Questions</router-link>
          <router-link to="/privacy">Privacy</router-link>
        </nav>
      </div>
      <div class="wrap sf-small">
        <p>Fly responsibly: in the game the glass manjha is make-believe. In real life, metal and chemical strings hurt people and birds, and many cities restrict kite flying - check your local rules.</p>
      </div>
    </div>
  </footer>
</template>

<script>
import SkylineEdge from './SkylineEdge.vue';
import config from '../config.js';

export default {
  name: 'SiteFooter',
  components: { SkylineEdge },
  setup() { return { config }; }
};
</script>

<style>
.sf { margin-top: clamp(40px, 6vw, 80px); color: #f4ecdf; }
.sf-roofs { display: block; width: 100%; height: clamp(60px, 9vw, 120px); color: #3a2230; }
.sf-body { background: #3a2230; padding: 24px 0 36px; margin-top: -1px; }
.sf-grid { display: grid; grid-template-columns: 1.4fr 1fr 1fr; gap: 32px; }
.sf-brand img { width: 200px; height: auto; margin-bottom: 12px; }
.sf-brand p { color: #d8c9d0; max-width: 36ch; }
.sf-col { display: flex; flex-direction: column; gap: 6px; }
.sf-col h2 { font-size: var(--t-md); color: var(--genda); margin-bottom: 6px; }
.sf-col a { color: #f4ecdf; text-decoration: none; }
.sf-col a:hover { color: var(--genda); text-decoration: underline; }
.sf-small { margin-top: 28px; padding-top: 18px; border-top: 1px solid rgba(255, 255, 255, 0.12); font-size: var(--t-sm); color: #bba9b2; }
@media (max-width: 760px) { .sf-grid { grid-template-columns: 1fr 1fr; } .sf-brand { grid-column: 1 / -1; } }
</style>
