// Same import order as src/main.ts: fonts first so their @font-face rules land before the theme,
// then the tokens every component's scoped CSS reads, then the global element rules. base.css is
// the same file the app loads, so a story renders on the app's foundation.
import '@fontsource-variable/geist';
import '@fontsource-variable/space-grotesk';
import '@fontsource-variable/geist-mono';
import '@material-symbols/font-400/outlined.css';
import '../src/assets/theme.css';
import '../src/assets/base.css';
import './preview.css';

import type { Preview } from '@storybook/vue3-vite';
import { setup } from '@storybook/vue3-vite';
import { createPinia } from 'pinia';
import { createMemoryHistory, createRouter } from 'vue-router';
import { type AuthParams, buildRoutes, type RouterParams } from './decorators';

/**
 * Installs a fresh Pinia + router on every story's app. This runs before mount, which is why it
 * lives here rather than in a decorator: components calling a store or useRouter() at setup time
 * would throw otherwise, and a per-story instance means state can't leak between stories.
 */
setup((app, context) => {
	const pinia = createPinia();
	app.use(pinia);

	const routerParams = (context?.parameters?.router ?? {}) as RouterParams;
	// Seeded through the constructor rather than `push`, which resolves a tick later — long enough
	// to render the wrong `router-link-exact-active` link.
	const history = createMemoryHistory();
	history.replace(routerParams.initialPath ?? '/');
	app.use(createRouter({ history, routes: buildRoutes(routerParams) }));

	// Signs the story in or out through the same localStorage key the auth store reads.
	const auth = (context?.parameters?.auth ?? {}) as AuthParams;
	if (auth.expiresAt === null) localStorage.removeItem('token_expiration');
	else if (auth.expiresAt) localStorage.setItem('token_expiration', auth.expiresAt);
});

const preview: Preview = {
	parameters: {
		options: {
			// Foundations (tokens) before UI (primitives) before App, because that's the order you read the
			// design system in. The sidebar sorts on `title`, not filename, so the sub-order is explicit.
			storySort: {
				order: [
					'Foundations',
					['Getting Started', 'Conventions', 'Color', 'Typography', 'Spacing', 'Shape', 'Elevation', 'Motion'],
					'UI',
					'App',
					'Record Edit Fields',
					'Record View Fields',
					'Table Display Fields',
					'Filter Fields',
				],
			},
		},
		controls: {
			matchers: {
				color: /(background|color)$/i,
				date: /Date$/i,
			},
		},
		a11y: {
			// Fail rather than warn, globally: an a11y violation in a primitive multiplies across every
			// view that consumes it. Foundations' specimen stories opt out with `a11y: { disable: true }`.
			test: 'error',
		},
		backgrounds: {
			options: {
				// The app renders on --color-paper, not white — a white default would hide contrast bugs.
				paper: { name: 'Paper', value: '#f5f8fe' },
				surface: { name: 'Surface', value: '#ffffff' },
				ink: { name: 'Ink', value: '#0a0f24' },
			},
		},
	},
	initialGlobals: {
		backgrounds: { value: 'paper' },
	},
};

export default preview;
