import '@fontsource/noto-sans/300.css';
import '@fontsource/noto-sans/400.css';
import '@fontsource/noto-sans/500.css';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
import '@material-symbols/font-400/outlined.css';

import { VueQueryPlugin } from '@tanstack/vue-query';
import { createPinia } from 'pinia';
import { createApp } from 'vue';
import App from './App.vue';
import { loadConfig } from './config';
import { vuetify } from './plugins/vuetify';
import { router } from './router';

async function bootstrap() {
	await loadConfig('/config.json');

	createApp(App).use(createPinia()).use(router).use(vuetify).use(VueQueryPlugin).mount('#app');
}

bootstrap();
