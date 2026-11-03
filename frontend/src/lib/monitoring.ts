// Error tracking and analytics, ported from frontend/src/main.ts, app.component.ts and
// posthog.service.ts:
// - Sentry: SaaS builds only.
// - PostHog: SaaS production builds only.
// - Amplitude: every build, page views on each navigation (Angulartics2Amplitude.startTracking).

import type { Event } from '@sentry/vue';
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
			// Named by route template, like the Angular app, rather than by Vue route name.
			integrations: [Sentry.browserTracingIntegration({ router, routeLabel: 'path' })],
			tracePropagationTargets: ['localhost', /^https:\/\/app\.rocketadmin\.com\/api/],
			tracesSampleRate: 1.0,
			replaysSessionSampleRate: 0.1,
			replaysOnErrorSampleRate: 1.0,
			beforeSend: toAngularSentryEvent,
			beforeSendTransaction: toAngularSentryEvent,
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

/**
 * The route template as the Angular app names it: `/dashboard/:connectionId/:tableName` becomes
 * `/dashboard/:connection-id/:table-name`, and the catch-all becomes `**`. Keeps Sentry grouping,
 * alerts and dashboards the same across the cutover.
 */
export function toAngularRoutePath(path: string): string {
	if (path.startsWith('/:pathMatch')) return '**';
	return path.replace(/:([a-zA-Z]+)/g, (_match, name: string) => `:${kebabCase(name)}`);
}

/**
 * Renames the transaction and the route-param attributes the Vue router integration sets, and drops
 * its `query.*` attributes: they carry filters, searches and primary-key values that Angular never sent.
 */
export function toAngularSentryEvent<T extends Event>(event: T): T {
	if (event.transaction) event.transaction = toAngularRoutePath(event.transaction);
	const data = event.contexts?.trace?.data;
	if (data) {
		for (const key of Object.keys(data)) {
			const value = data[key];
			delete data[key];
			if (key.startsWith('query.')) continue;
			const param = /^(?<base>url\.path\.parameter|url\.path\.params|params)\.(?<name>.+)$/.exec(key)?.groups;
			if (param) data[`${param.base}.${kebabCase(param.name ?? '')}`] = value;
			else if (key === 'url.template' && typeof value === 'string') data[key] = toAngularRoutePath(value);
			else data[key] = value;
		}
	}
	return event;
}

function kebabCase(name: string): string {
	return name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}
