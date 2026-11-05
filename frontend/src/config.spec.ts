import { afterEach, describe, expect, it, vi } from 'vitest';
import { defaultConfig, getConfig, loadConfig } from './config';

const jsonResponse = (body: unknown, status = 200) =>
	new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

describe('loadConfig', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('reads baseURL and saasURL from the config file', async () => {
		const fetchFn = vi
			.fn<typeof fetch>()
			.mockResolvedValue(jsonResponse({ baseURL: '/custom-api', saasURL: 'https://saas' }));

		const config = await loadConfig('/config.json', fetchFn);

		expect(fetchFn).toHaveBeenCalledWith('/config.json', { cache: 'no-cache' });
		expect(config).toEqual({ baseURL: '/custom-api', saasURL: 'https://saas' });
		expect(getConfig()).toEqual(config);
	});

	it('falls back to defaults for missing fields', async () => {
		const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({ baseURL: '/custom-api' }));

		expect(await loadConfig('/config.json', fetchFn)).toEqual({ baseURL: '/custom-api', saasURL: '' });
	});

	it('falls back to defaults when the request fails', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
		const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({}, 404));

		expect(await loadConfig('/config.json', fetchFn)).toEqual(defaultConfig);
		expect(getConfig()).toEqual(defaultConfig);
	});
});
