// global tokens and base styles first, so each component's own styles (loaded with it) can build on them
import './styles.css';
import { createApp } from 'vue';
import App from './App.vue';
import router from './router.js';

createApp(App).use(router).mount('#app');
