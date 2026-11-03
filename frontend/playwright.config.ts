import { defineConfig, devices } from '@playwright/test';

// End-to-end tests run against the self-hosted production build (`.env.production`: VITE_SAAS=false,
// API under /api), served by `vite preview`. A built app has no on-demand compilation or dependency
// re-optimisation, which made a cold dev server reload pages mid-test. The backend is never reached:
// every /api request is answered by the in-memory mock in e2e/support/mock-backend.ts.
const PORT = 4310;
const OUT_DIR = 'dist-e2e';

export default defineConfig({
	testDir: './e2e',
	testMatch: '**/*.e2e.ts',
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 1 : 0,
	reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
	use: {
		baseURL: `http://127.0.0.1:${PORT}`,
		trace: 'retain-on-failure',
		screenshot: 'only-on-failure',
	},
	projects: [
		{
			name: 'chromium',
			use: {
				...devices['Desktop Chrome'],
				// Containers default to a 64MB /dev/shm, which crashes Chromium under parallel load.
				launchOptions: { args: ['--disable-dev-shm-usage'] },
			},
		},
	],
	webServer: {
		command: `pnpm exec vite build --mode production --outDir ${OUT_DIR} && pnpm exec vite preview --outDir ${OUT_DIR} --port ${PORT} --strictPort`,
		url: `http://127.0.0.1:${PORT}`,
		reuseExistingServer: !process.env.CI,
		timeout: 120_000,
	},
});
