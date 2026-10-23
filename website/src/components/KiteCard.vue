<template>
  <button class="kc" type="button" :style="{ '--rar': tier.color }" @click="$emit('open', kite)">
    <span class="kc-pic"><img :src="kite.img" :alt="''" loading="lazy" width="160" height="160" /></span>
    <span class="kc-name">{{ kite.name }}</span>
    <span class="kc-meta">
      <span class="kc-type">{{ typeLabel }}</span>
      <span class="kc-price" :class="{ 'kc-free': !kite.price }">{{ kite.price ? kite.price + ' coins' : 'Free' }}</span>
    </span>
  </button>
</template>

<script>
import { computed } from 'vue';
import { RARITY, TYPES } from '../data/rarity.js';

export default {
  name: 'KiteCard',
  props: { kite: { type: Object, required: true } },
  emits: ['open'],
  setup(props) {
    const tier = computed(() => RARITY[props.kite.rarity] || RARITY.Free);
    const typeLabel = computed(() => (TYPES[props.kite.type] || { label: props.kite.type }).label);
    return { tier, typeLabel };
  }
};
</script>

<style>
.kc { display: flex; flex-direction: column; align-items: stretch; gap: 4px; padding: 10px 10px 12px; border: 0; border-radius: var(--radius-m); background: var(--surface);
  box-shadow: inset 0 0 0 1px var(--surface-line), inset 0 -4px 0 var(--rar); color: var(--text); font: inherit; text-align: left; cursor: pointer; }
.kc:hover { box-shadow: inset 0 0 0 2px var(--rar), inset 0 -4px 0 var(--rar); }
.kc-pic { display: grid; place-items: center; aspect-ratio: 1; border-radius: 10px; background: radial-gradient(circle at 50% 40%, #ffffff 0%, var(--sky-mist) 100%); }
.kc-pic img { width: 82%; height: 82%; object-fit: contain; transition: transform 0.25s; }
.kc:hover .kc-pic img { transform: rotate(-6deg) translateY(-3px); }
.kc-name { font-family: var(--display); font-weight: 700; font-size: 1.02rem; line-height: 1.15; margin-top: 4px; }
.kc-meta { display: flex; justify-content: space-between; gap: 6px; font-size: var(--t-xs); color: var(--text-soft); }
.kc-price { font-weight: 700; color: var(--text); }
.kc-free { color: #13894f; }
</style>
