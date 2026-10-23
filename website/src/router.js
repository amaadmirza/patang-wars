import { createRouter, createWebHashHistory } from 'vue-router';
import HomePage from './pages/HomePage.vue';
import KitesPage from './pages/KitesPage.vue';
import HowToPlayPage from './pages/HowToPlayPage.vue';
import ModesPage from './pages/ModesPage.vue';
import DownloadPage from './pages/DownloadPage.vue';
import UpdatesPage from './pages/UpdatesPage.vue';
import FaqPage from './pages/FaqPage.vue';
import PrivacyPage from './pages/PrivacyPage.vue';
import NotFoundPage from './pages/NotFoundPage.vue';

export const routes = [
  { path: '/', name: 'home', component: HomePage, meta: { title: 'Rooftop kite fighting' } },
  { path: '/kites', name: 'kites', component: KitesPage, meta: { title: 'Kites' } },
  { path: '/how-to-play', name: 'how', component: HowToPlayPage, meta: { title: 'How to play' } },
  { path: '/modes', name: 'modes', component: ModesPage, meta: { title: 'Modes and skies' } },
  { path: '/download', name: 'download', component: DownloadPage, meta: { title: 'Play and download' } },
  { path: '/updates', name: 'updates', component: UpdatesPage, meta: { title: 'Updates' } },
  { path: '/faq', name: 'faq', component: FaqPage, meta: { title: 'Questions' } },
  { path: '/privacy', name: 'privacy', component: PrivacyPage, meta: { title: 'Privacy' } },
  { path: '/:pathMatch(.*)*', name: 'missing', component: NotFoundPage, meta: { title: 'Not found' } }
];

const router = createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior(to, from, saved) {
    if (saved) return saved;
    if (to.hash && to.hash.length > 1 && !to.hash.startsWith('#/')) return { el: to.hash, top: 80, behavior: 'smooth' };
    return { top: 0 };
  }
});

router.afterEach(to => {
  document.title = `Bo Kata! - ${to.meta.title || 'Rooftop kite fighting'}`;
});

export default router;
