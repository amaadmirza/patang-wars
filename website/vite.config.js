import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

// base './' + hash routes (see src/router.js): the built site works from any folder on any static host
// (GitHub Pages, Netlify, cPanel, or the game's own server) without server rewrite rules.
export default defineConfig({
  plugins: [vue()],
  base: './',
  build: { outDir: 'dist', assetsInlineLimit: 0 }
});
