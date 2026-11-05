/// <reference types="vitest/config" />
import fs from 'node:fs';
import { fileURLToPath, URL } from 'node:url';
import vue from '@vitejs/plugin-vue';
import { defineConfig, type Plugin } from 'vite';

const isSaasMode = (mode: string) => mode === 'saas' || mode === 'saas-production';

// SaaS builds serve index.saas.html (Intercom, gtag, GSI, Turnstile, loader) as index.html,
// like the `index` option of the Angular `saas` and `saas-production` configurations.
function saasIndexHtml(mode: string): Plugin {
	return {
		name: 'rocketadmin-saas-index-html',
		transformIndexHtml: {
			order: 'pre',
			handler: (html) =>
				isSaasMode(mode) ? fs.readFileSync(fileURLToPath(new URL('./index.saas.html', import.meta.url)), 'utf8') : html,
		},
	};
}

export default defineConfig(({ mode }) => ({
	plugins: [vue(), saasIndexHtml(mode)],
	resolve: {
		alias: {
			'@': fileURLToPath(new URL('./src', import.meta.url)),
		},
	},
	server: {
		host: '127.0.0.1',
		// Port of frontend/src/proxy.conf.json
		proxy: {
			// Anchored with the trailing slash: a bare '/api' prefix also proxies the /api-keys page.
			'^/api/': {
				target: 'https://app.rocketadmin.com',
				changeOrigin: true,
				secure: false,
			},
		},
	},
	worker: {
		format: 'es',
	},
	build: {
		// Hashed bundles go in the root, like the Angular build: the immutable-cache rule in
		// frontend/nginx/default.conf only matches root files and answers 404 for a missing one.
		// Under assets/ a stale chunk would fall through to index.html, and the folder is shared
		// with the unhashed static assets.
		assetsDir: '',
		sourcemap: true,
	},
	test: {
		environment: 'jsdom',
		// Process real CSS: the Foundations docs parse theme.css through a `?raw` import
		// (src/components/ui/docs/readTokens.ts), which is an empty string under `css: false`.
		css: true,
		setupFiles: ['src/test-setup.ts'],
		// Pinned so the source-hygiene specs can resolve `src/` from process.cwd().
		root: fileURLToPath(new URL('./', import.meta.url)),
	},
}));
