import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { jsonResponse, mockFetch } from '@/__tests__/mock-fetch';
import { useNotificationsStore } from '@/stores/notifications';
import { type ConfigProgress, DRAIN_INTERVAL_MS, useConfigurationStateStore } from './configuration-state';

vi.mock('@/environment', () => ({ environment: { apiRoot: '', saasURL: '' } }));
vi.mock('@/config', () => ({ getConfig: () => ({ baseURL: '/api', saasURL: '' }) }));

/** A streamed response whose lines are released by calling `push`, then `end`. */
function controlledStream() {
	const encoder = new TextEncoder();
	let controller!: ReadableStreamDefaultController<Uint8Array>;
	const body = new ReadableStream<Uint8Array>({
		start(c) {
			controller = c;
		},
	});
	return {
		response: new Response(body, { status: 200 }),
		push: (line: string) => controller.enqueue(encoder.encode(`${line}\n`)),
		end: () => controller.close(),
	};
}

describe('configuration state store', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		localStorage.clear();
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.unstubAllGlobals();
	});

	it('streams the setup, paces the progress log and resolves true', async () => {
		const stream = controlledStream();
		const fetch = mockFetch(stream.response);
		localStorage.setItem('c1__masterKey', 'secret');
		const store = useConfigurationStateStore();
		const showSuccessSnackbar = vi.spyOn(useNotificationsStore(), 'showSuccessSnackbar');
		const seen: (ConfigProgress | null)[] = [];
		store.$subscribe(() => seen.push(store.progress));

		const done = store.startConfiguring('c1');
		expect(store.isConfiguring('c1')).toBe(true);
		expect(store.progress).toEqual({ type: 'message', text: 'Starting configuration…' });
		expect(await store.startConfiguring('c1')).toBe(false);

		stream.push(JSON.stringify({ type: 'message', text: 'Configuring users' }));
		stream.push(JSON.stringify({ type: 'message', text: 'Configuring orders' }));
		await vi.advanceTimersByTimeAsync(0);
		// Queued behind the paced drain rather than shown at once.
		expect(store.progress?.text).toBe('Starting configuration…');
		await vi.advanceTimersByTimeAsync(DRAIN_INTERVAL_MS);
		expect(store.progress?.text).toBe('Configuring users');

		stream.push('data: {"type":"complete"}');
		stream.end();
		await vi.advanceTimersByTimeAsync(2000);

		expect(await done).toBe(true);
		expect(store.isConfiguring('c1')).toBe(false);
		expect(store.progress).toEqual({ type: 'complete' });
		expect(seen.map((progress) => progress?.text ?? progress?.type)).toContain('✓ Setup complete');
		expect(showSuccessSnackbar).toHaveBeenCalledWith('All tables have been configured.');
		expect(fetch.last().url).toBe('/api/ai/v2/setup/c1');
		expect(fetch.last().headers.get('masterpwd')).toBe('secret');
	});

	it('reports a failed request and resolves false', async () => {
		mockFetch(jsonResponse({ message: 'nope' }, 500));
		const store = useConfigurationStateStore();
		const showErrorSnackbar = vi.spyOn(useNotificationsStore(), 'showErrorSnackbar');

		const done = store.startConfiguring('c1');
		await vi.advanceTimersByTimeAsync(0);

		expect(await done).toBe(false);
		expect(store.progress).toEqual({ type: 'error', message: 'Setup failed with status 500' });
		expect(showErrorSnackbar).toHaveBeenCalledWith('Setup failed with status 500');
		expect(store.isConfiguring('c1')).toBe(false);
	});
});
