<template>
  <a class="skip-link" href="#main" @click.prevent="skip">Skip to content</a>
  <SiteHeader />
  <main id="main" tabindex="-1">
    <router-view />
  </main>
  <SiteFooter />
</template>

<script>
import SiteHeader from './components/SiteHeader.vue';
import SiteFooter from './components/SiteFooter.vue';

export default {
  name: 'App',
  components: { SiteHeader, SiteFooter },
  setup() {
    const skip = () => { const m = document.getElementById('main'); if (m) m.focus(); };
    return { skip };
  }
};
</script>

<style>
.skip-link { position: absolute; left: 12px; top: -60px; z-index: 100; background: var(--genda); color: var(--jamun); padding: 10px 16px; border-radius: 10px; font-weight: 700; }
.skip-link:focus { top: 12px; }
main { display: block; min-height: 60vh; outline: none; }
</style>
