// Error tracking and analytics, ported from frontend/src/main.ts, app.component.ts and
// posthog.service.ts:
// - Sentry: SaaS builds only.
// - PostHog: SaaS production builds only.
// - Amplitude: every build, page views on each navigation (Angulartics2Amplitude.startTracking).
import * as Sentry from '@sentry/vue';
import amplitude from 'amplitude-js';
import posthog from 'posthog-js';
import type { App } from 'vue';
import type { Router } from 'vue-router';
import { environment } from '@/environment';

const SENTRY_DSN = 'https://4d774c4c2c8a8f733cb4d43599cc0dc6@o4506084700389376.ingest.sentry.io/4506084702486528';
const POSTHOG_KEY = 'phc_VPnWHIMj9UjhRLPr7shATjgL0J4KrWWOHkK3JwZbnkw';
const AMPLITUDE_KEY = '9afd282be91f94da735c11418d5ff4f5';

export function initMonitoring(app: App, router: Router): void {
	if (environment.saas) {
		Sentry.init({
			app,
			dsn: SENTRY_DSN,
			integrations: [Sentry.browserTracingIntegration({ router })],
			tracePropagationTargets: ['localhost', /^https:\/\/app\.rocketadmin\.com\/api/],
			tracesSampleRate: 1.0,
			replaysSessionSampleRate: 0.1,
			replaysOnErrorSampleRate: 1.0,
		});
	}

	if (environment.saas && environment.production) {
		posthog.init(POSTHOG_KEY, { api_host: 'https://us.i.posthog.com', defaults: '2025-11-30' });
	}

	// Some third-party snippets in index.saas.html expect the global.
	(window as unknown as { amplitude: typeof amplitude }).amplitude = amplitude;
	amplitude.getInstance().init(AMPLITUDE_KEY);
	router.afterEach((to) => {
		amplitude.getInstance().logEvent('Pageview', { url: to.fullPath });
	});
}
