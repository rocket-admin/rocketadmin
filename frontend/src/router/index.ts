import { createRouter, createWebHistory } from 'vue-router';
import { applyTitle, beforeEachGuard } from './guards';
import { routes } from './routes';

export { routes };

export const router = createRouter({
	history: createWebHistory(import.meta.env.BASE_URL),
	routes,
});

router.beforeEach(beforeEachGuard);
router.afterEach((to) => applyTitle(to));
