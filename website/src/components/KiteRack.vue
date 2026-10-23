<template>
  <!-- a kite seller's rope: real kites from the game hanging on strings, as they hang in Lahore's kite bazaars -->
  <div class="kr" role="list" aria-label="A few of the kites">
    <svg class="kr-rope" viewBox="0 0 1000 40" preserveAspectRatio="none" aria-hidden="true"><path d="M0 6 Q500 46 1000 6" /></svg>
    <router-link v-for="(k, i) in shown" :key="k.id" role="listitem" class="kr-kite" :to="{ path: '/kites', query: { k: k.id } }"
      :style="{ '--top': ropeY(i) + 'px', '--drop': drop(i) + 'px', '--tilt': tilt(i) + 'deg' }" :title="k.name">
      <i class="kr-string" aria-hidden="true"></i>
      <img :src="k.img" :alt="k.name" loading="lazy" width="120" height="120" />
    </router-link>
  </div>
</template>

<script>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';

export default {
  name: 'KiteRack',
  props: { kites: { type: Array, required: true } },
  setup(props) {
    // as many kites as fit the rope at this width (a phone gets 6, a laptop 12) - never a scrolling rope
    const width = ref(typeof window !== 'undefined' ? window.innerWidth : 1200);
    const onResize = () => { width.value = window.innerWidth; };
    onMounted(() => window.addEventListener('resize', onResize, { passive: true }));
    onBeforeUnmount(() => window.removeEventListener('resize', onResize));
    const shown = computed(() => props.kites.slice(0, width.value < 600 ? 6 : width.value < 960 ? 9 : 12));
    // the rope sags in the middle (y = 6 at the ends, 26 in the middle - the same curve as the SVG path); each string is
    // tied on the rope where its kite hangs, at its own length, and each kite hangs at its own small angle
    const frac = i => (i + 0.5) / Math.max(1, shown.value.length);
    const ropeY = i => Math.round(6 + 80 * frac(i) * (1 - frac(i)));
    const drop = i => ropeY(i) + 16 + (i % 3) * 12;
    const tilt = i => [-7, 5, -3, 8, -5, 3, -8, 6][i % 8];
    return { shown, ropeY, drop, tilt };
  }
};
</script>

<style>
.kr { position: relative; display: flex; justify-content: space-around; padding-bottom: 12px; }
.kr-rope { position: absolute; left: 0; right: 0; top: 0; width: 100%; height: 40px; overflow: visible; pointer-events: none; }
.kr-rope path { fill: none; stroke: var(--jamun-soft); stroke-width: 2.5; vector-effect: non-scaling-stroke; }
.kr-kite { position: relative; flex: 0 1 104px; min-width: 0; margin: 0 4px; padding-top: var(--drop); text-decoration: none; transform-origin: 50% 0; }
.kr-string { position: absolute; left: 50%; top: var(--top); height: calc(var(--drop) - var(--top) + 6px); width: 1.5px; background: var(--jamun-soft); }
.kr-kite img { width: 100%; height: auto; transform: rotate(var(--tilt)); transform-origin: 50% 0; transition: transform 0.4s cubic-bezier(0.3, 1.6, 0.5, 1); filter: drop-shadow(0 6px 6px rgba(42, 15, 28, 0.18)); }
.kr-kite:hover img, .kr-kite:focus-visible img { transform: rotate(calc(var(--tilt) * -1.6)); }
</style>
