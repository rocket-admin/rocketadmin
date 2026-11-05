import { describe, expect, it } from 'vitest';
import { buildEnvironment } from './environment';
import { version } from './version';

describe('buildEnvironment', () => {
	it('maps the SaaS production variables', () => {
		expect(
			buildEnvironment({
				PROD: true,
				VITE_SAAS: 'true',
				VITE_API_ROOT: '/api',
				VITE_SAAS_URL: '',
				VITE_SAAS_HOSTNAMES: 'app.rocketadmin.com, rocket.sitenova.com',
				VITE_STAGING_HOST: 'staging.example.com',
				VITE_TURNSTILE_SITE_KEY: 'site-key',
			}),
		).toEqual({
			production: true,
			saas: true,
			apiRoot: '/api',
			saasURL: '',
			saasHostnames: ['app.rocketadmin.com', 'rocket.sitenova.com'],
			stagingHost: 'staging.example.com',
			version,
			turnstileSiteKey: 'site-key',
		});
	});

	it('defaults to a self-hosted, non-production environment', () => {
		const environment = buildEnvironment({ PROD: false, VITE_SAAS: 'false', VITE_SAAS_HOSTNAMES: '' });

		expect(environment.production).toBe(false);
		expect(environment.saas).toBe(false);
		expect(environment.saasHostnames).toEqual([]);
		expect(environment.apiRoot).toBe('');
	});
});
