// Self-hosted brand fonts first so their @font-face rules land before the theme, then the tokens,
// then base.css (which reads them). .storybook/preview.ts mirrors this order — keep them together.
import '@fontsource-variable/geist';
import '@fontsource-variable/space-grotesk';
import '@fontsource-variable/geist-mono';
import '@material-symbols/font-400/outlined.css';
import './assets/theme.css';
import './assets/base.css';

import { VueQueryPlugin } from '@tanstack/vue-query';
import { createPinia } from 'pinia';
import { createApp } from 'vue';
import App from './App.vue';
import { isApiError } from './api/client';
import { loadConfig } from './config';
import { initMonitoring } from './lib/monitoring';
import { router } from './router';
import { useAuthStore } from './stores/auth';
import { bindConnectionsToRouter } from './stores/connections';
import { bindTablesToRouter } from './stores/tables';

async function bootstrap() {
	await loadConfig('/config.json');

	const app = createApp(App);
	const pinia = createPinia();
	app.use(pinia);
	initMonitoring(app, router);

	// An awaited request that failed has already been shown to the user (see ApiError.notified);
	// letting it reach the console as an unhandled error would only add noise.
	const defaultHandler = app.config.errorHandler;
	app.config.errorHandler = (error, instance, info) => {
		if (isApiError(error) && error.notified) return;
		if (defaultHandler) defaultHandler(error, instance, info);
		else console.error(error);
	};
	window.addEventListener('unhandledrejection', (event) => {
		if (isApiError(event.reason) && event.reason.notified) event.preventDefault();
	});

	// Before the router resolves the first route: the guards read the restored session.
	useAuthStore(pinia).restoreSession();

	// Queries behave like Angular's httpResource: one attempt (the client already reported the
	// failure) and no refetch on window focus.
	// Angular read the current connection and table from the URL on every navigation.
	bindConnectionsToRouter(router);
	bindTablesToRouter(router);

	app
		.use(router)
		.use(VueQueryPlugin, {
			queryClientConfig: { defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } } },
		})
		.mount('#app');
}

bootstrap();
