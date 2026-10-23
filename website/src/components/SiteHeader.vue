<template>
  <header class="sh" :class="{ 'sh-solid': solid || open }">
    <div class="wrap sh-row">
      <router-link to="/" class="sh-brand" aria-label="Bo Kata! home" @click="open = false">
        <img src="brand/emblem.svg" alt="" width="40" height="40" />
        <span>Bo Kata!</span>
      </router-link>
      <button class="sh-toggle" type="button" :aria-expanded="open ? 'true' : 'false'" aria-controls="sh-nav" @click="open = !open">
        <span class="visually-hidden">Menu</span>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path v-if="!open" d="M4 7h16M4 12h16M4 17h16" /><path v-else d="M6 6l12 12M18 6 6 18" /></svg>
      </button>
      <nav id="sh-nav" class="sh-nav" :class="{ 'sh-open': open }" aria-label="Main">
        <router-link v-for="l in links" :key="l.to" :to="l.to" @click="open = false">{{ l.label }}</router-link>
        <a class="btn sh-play" :href="config.playUrl" @click="open = false">Play now</a>
      </nav>
    </div>
  </header>
</template>

<script>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import config from '../config.js';

export default {
  name: 'SiteHeader',
  setup() {
    const open = ref(false), solid = ref(false);
    const links = [
      { to: '/kites', label: 'Kites' },
      { to: '/how-to-play', label: 'How to play' },
      { to: '/modes', label: 'Modes' },
      { to: '/updates', label: 'Updates' },
      { to: '/faq', label: 'FAQ' },
      { to: '/download', label: 'Download' }
    ];
    const onScroll = () => { solid.value = window.scrollY > 24; };
    const onKey = e => { if (e.key === 'Escape') open.value = false; };
    onMounted(() => { onScroll(); window.addEventListener('scroll', onScroll, { passive: true }); window.addEventListener('keydown', onKey); });
    onBeforeUnmount(() => { window.removeEventListener('scroll', onScroll); window.removeEventListener('keydown', onKey); });
    return { open, solid, links, config };
  }
};
</script>

<style>
.sh { position: sticky; top: env(safe-area-inset-top, 0px); z-index: 50; color: #fff; background: var(--sky); transition: background 0.2s, box-shadow 0.2s; }
.sh-solid { background: var(--sky-deep); box-shadow: 0 2px 0 rgba(42, 15, 28, 0.25); }
.sh-row { display: flex; align-items: center; gap: 16px; min-height: 64px; }
.sh-brand { display: flex; align-items: center; gap: 10px; color: #fff; text-decoration: none; font-family: var(--display); font-weight: 800; font-size: 1.35rem; letter-spacing: -0.01em; }
.sh-brand img { width: 40px; height: 40px; }
.sh-nav { margin-left: auto; display: flex; align-items: center; gap: 4px; }
.sh-nav a:not(.btn) { color: #fff; text-decoration: none; font-weight: 500; padding: 8px 12px; border-radius: 999px; }
.sh-nav a:not(.btn):hover { background: rgba(255, 255, 255, 0.14); }
.sh-nav a.router-link-active:not(.btn) { background: rgba(255, 210, 63, 0.22); box-shadow: inset 0 -2px 0 var(--genda); border-radius: 10px 10px 4px 4px; }
.sh-play { margin-left: 8px; min-height: 42px; padding: 0.45em 1.1em; }
.sh-toggle { display: none; margin-left: auto; width: 46px; height: 46px; border: 0; border-radius: 12px; background: rgba(255, 255, 255, 0.12); color: #fff; cursor: pointer; }
.sh-toggle svg { width: 26px; height: 26px; fill: none; stroke: currentColor; stroke-width: 2.4; stroke-linecap: round; }
@media (max-width: 900px) {
  .sh-toggle { display: grid; place-items: center; }
  .sh-nav { display: none; position: absolute; left: 0; right: 0; top: 64px; flex-direction: column; align-items: stretch; gap: 2px; padding: 8px var(--gutter) 20px; background: var(--sky-deep); box-shadow: 0 10px 20px rgba(0, 0, 0, 0.2); }
  .sh-nav.sh-open { display: flex; }
  .sh-nav a:not(.btn) { padding: 12px 14px; font-size: 1.1rem; }
  .sh-play { margin: 10px 0 0; }
}
</style>
