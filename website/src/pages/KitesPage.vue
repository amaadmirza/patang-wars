<template>
  <div class="wrap kp">
    <header class="page-head">
      <h1>Kites</h1>
      <p class="lede">All {{ all.length }} picture kites in Bo Kata! {{ version }}. Free ones fly from your first match; the rest are bought once with coins you win and stay yours.</p>
    </header>

    <form class="kp-tools" role="search" @submit.prevent>
      <label class="kp-search">
        <span class="visually-hidden">Find a kite by name</span>
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4.5 4.5" /></svg>
        <input v-model.trim="q" type="search" placeholder="Find a kite by name" autocomplete="off" />
      </label>
      <fieldset class="kp-seg">
        <legend class="visually-hidden">Shape</legend>
        <label v-for="t in typeOpts" :key="t.id" :class="{ on: type === t.id }">
          <input v-model="type" type="radio" name="kp-type" :value="t.id" class="visually-hidden" />{{ t.label }}
        </label>
      </fieldset>
      <fieldset class="kp-seg">
        <legend class="visually-hidden">Price</legend>
        <label v-for="r in rarityOpts" :key="r.id" :class="{ on: rarity === r.id }" :style="r.color ? { '--dot': r.color } : null">
          <input v-model="rarity" type="radio" name="kp-rar" :value="r.id" class="visually-hidden" /><i v-if="r.color" aria-hidden="true"></i>{{ r.label }}
        </label>
      </fieldset>
    </form>

    <p class="kp-count" aria-live="polite">{{ list.length === all.length ? 'Showing all ' + all.length + ' kites' : list.length + ' of ' + all.length + ' kites' }}</p>

    <div v-if="list.length" class="kp-grid">
      <KiteCard v-for="k in list" :key="k.id" :kite="k" @open="openKite" />
    </div>
    <div v-else class="kp-empty">
      <p>No kite matches "{{ q || 'these filters' }}". Try part of a name, like "tara" or "tukkal", or show everything.</p>
      <button class="btn" type="button" @click="reset">Show all kites</button>
    </div>

    <dialog ref="dlg" class="kp-dlg" aria-labelledby="kp-dlg-h" @close="onClose" @click="backdrop">
      <div v-if="cur" class="kp-dlg-body">
        <div class="kp-dlg-pic"><img :src="cur.img" :alt="cur.name" width="320" height="320" /></div>
        <div class="kp-dlg-text">
          <h2 id="kp-dlg-h">{{ cur.name }}</h2>
          <p class="kp-dlg-tags">
            <span class="kp-tag" :style="{ background: tier(cur).color, color: tier(cur).ink }">{{ cur.rarity }}</span>
            <span class="kp-tag kp-tag-quiet">{{ typeOf(cur).label }}</span>
          </p>
          <p class="kp-dlg-price">{{ cur.price ? cur.price + ' coins in the shop' : 'Free: in your kite box from the first match' }}</p>
          <p>{{ typeOf(cur).flight }}</p>
          <p class="muted">In the game every kite is drawn as a bowed paper sail: it banks into turns, rocks in the gusts and its corners flutter.</p>
          <div class="kp-dlg-nav">
            <button class="btn btn-quiet" type="button" @click="step(-1)">Previous kite</button>
            <button class="btn btn-quiet" type="button" @click="step(1)">Next kite</button>
          </div>
        </div>
        <button class="kp-dlg-x" type="button" aria-label="Close" @click="close">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
        </button>
      </div>
    </dialog>
  </div>
</template>

<script>
import { ref, computed, watch, onMounted, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import KiteCard from '../components/KiteCard.vue';
import kites from '../data/kites.json';
import config from '../config.js';
import { RARITY, TYPES } from '../data/rarity.js';

const ORDER = { Free: 0, Rare: 1, Epic: 2, Legendary: 3 };

export default {
  name: 'KitesPage',
  components: { KiteCard },
  setup() {
    const route = useRoute(), router = useRouter();
    const all = [...kites].sort((a, b) => ORDER[a.rarity] - ORDER[b.rarity] || a.name.localeCompare(b.name));
    const q = ref(''), type = ref('all'), rarity = ref('all'), cur = ref(null), dlg = ref(null);
    const typeOpts = [{ id: 'all', label: 'All shapes' }, { id: 'patang', label: 'Patang' }, { id: 'tukkal', label: 'Tukkal' }];
    const rarityOpts = [{ id: 'all', label: 'Any price' }, ...Object.entries(RARITY).map(([id, r]) => ({ id, label: id, color: r.color }))];
    const norm = s => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9 ]/g, '');
    const list = computed(() => {
      const nq = norm(q.value);
      return all.filter(k => (type.value === 'all' || k.type === type.value) && (rarity.value === 'all' || k.rarity === rarity.value) && (!nq || norm(k.name).includes(nq) || k.id.includes(nq.replace(/ /g, '-'))));
    });
    const tier = k => RARITY[k.rarity] || RARITY.Free;
    const typeOf = k => TYPES[k.type] || { label: k.type, flight: '' };
    const reset = () => { q.value = ''; type.value = 'all'; rarity.value = 'all'; };

    // the open kite lives in the address (?k=lal-hukam), so a kite can be shared and Back closes it
    function openKite(k) { router.push({ query: { ...route.query, k: k.id } }); }
    function close() { const { k, ...rest } = route.query; router.push({ query: rest }); }
    function onClose() { if (route.query.k) close(); }
    function backdrop(e) { if (e.target === dlg.value) close(); }
    function step(d) {
      const L = list.value.length ? list.value : all, i = L.findIndex(k => cur.value && k.id === cur.value.id);
      const next = L[(i + d + L.length) % L.length]; router.replace({ query: { ...route.query, k: next.id } });
    }
    async function sync() {
      const id = route.query.k, k = id ? all.find(x => x.id === id) : null;
      cur.value = k; await nextTick();
      const d = dlg.value; if (!d || typeof d.showModal !== 'function') return;
      if (k && !d.open) d.showModal(); else if (!k && d.open) d.close();
    }
    watch(() => route.query.k, sync);
    onMounted(sync);
    return { all, q, type, rarity, typeOpts, rarityOpts, list, cur, dlg, tier, typeOf, reset, openKite, close, onClose, backdrop, step, version: config.version };
  }
};
</script>

<style>
.kp-tools { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; margin: 4px 0 10px; }
.kp-search { position: relative; flex: 1 1 260px; max-width: 380px; }
.kp-search svg { position: absolute; left: 14px; top: 50%; width: 20px; height: 20px; margin-top: -10px; fill: none; stroke: var(--text-soft); stroke-width: 2; stroke-linecap: round; }
.kp-search input { width: 100%; min-height: 46px; padding: 8px 14px 8px 42px; border-radius: 999px; border: 1.5px solid var(--surface-line); background: var(--surface); color: var(--text); font: inherit; }
.kp-search input:focus { outline: none; border-color: var(--manjha); box-shadow: 0 0 0 3px rgba(255, 61, 127, 0.2); }
.kp-seg { display: flex; flex-wrap: wrap; gap: 4px; margin: 0; padding: 4px; border: 0; border-radius: 999px; background: var(--sky-mist); }
.kp-seg label { display: inline-flex; align-items: center; gap: 6px; min-height: 38px; padding: 4px 14px; border-radius: 999px; cursor: pointer; font-weight: 500; font-size: var(--t-sm); }
.kp-seg label:hover { background: rgba(255, 255, 255, 0.5); }
.kp-seg label.on { background: var(--surface); box-shadow: 0 1px 0 var(--surface-line), 0 0 0 1.5px var(--jamun); font-weight: 700; }
.kp-seg label:focus-within { outline: 3px solid var(--manjha); outline-offset: 1px; }
.kp-seg i { width: 10px; height: 10px; border-radius: 50%; background: var(--dot); box-shadow: 0 0 0 1px rgba(42, 15, 28, 0.25); }
.kp-count { font-size: var(--t-sm); color: var(--text-soft); margin: 4px 0 16px; }
.kp-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 14px; }
@media (max-width: 480px) { .kp-grid { grid-template-columns: repeat(2, 1fr); gap: 10px; } }
.kp-empty { padding: 40px 0; }

.kp-dlg { width: min(760px, calc(100vw - 32px)); max-height: calc(100vh - 32px); padding: 0; border: 0; border-radius: var(--radius-l); background: var(--surface); color: var(--text); box-shadow: 0 30px 60px -20px rgba(28, 79, 166, 0.55); }
.kp-dlg::backdrop { background: rgba(28, 46, 90, 0.55); }
.kp-dlg-body { position: relative; display: grid; grid-template-columns: 1fr 1.15fr; }
.kp-dlg-pic { display: grid; place-items: center; padding: 28px; background: radial-gradient(circle at 50% 35%, #ffffff, var(--sky-mist)); }
.kp-dlg-pic img { width: 100%; max-width: 300px; height: auto; transform: rotate(-5deg); filter: drop-shadow(0 16px 18px rgba(42, 15, 28, 0.25)); }
.kp-dlg-text { padding: 28px 28px 24px; }
.kp-dlg-text h2 { font-size: var(--t-xl); padding-right: 36px; }
.kp-dlg-tags { display: flex; gap: 8px; }
.kp-tag { display: inline-block; padding: 2px 10px; border-radius: 999px; font-weight: 700; font-size: var(--t-sm); }
.kp-tag-quiet { background: var(--sky-mist); color: var(--text); }
.kp-dlg-price { font-family: var(--display); font-weight: 700; font-size: var(--t-lg); margin-bottom: 0.4em; }
.kp-dlg-nav { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 8px; }
.kp-dlg-nav .btn { min-height: 42px; font-size: var(--t-sm); }
.kp-dlg-x { position: absolute; right: 12px; top: 12px; width: 42px; height: 42px; border: 0; border-radius: 50%; background: var(--sky-mist); color: var(--text); cursor: pointer; display: grid; place-items: center; }
.kp-dlg-x svg { width: 20px; height: 20px; fill: none; stroke: currentColor; stroke-width: 2.4; stroke-linecap: round; }
@media (max-width: 620px) { .kp-dlg-body { grid-template-columns: 1fr; } .kp-dlg-pic { padding: 22px; } .kp-dlg-pic img { max-width: 180px; } .kp-dlg-text { padding: 20px; } }
</style>
