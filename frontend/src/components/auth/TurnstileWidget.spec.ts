import { mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { TurnstileInstance, TurnstileOptions } from '@/types/third-party-auth';
import TurnstileWidget from './TurnstileWidget.vue';

vi.mock('@/environment', () => ({ environment: { turnstileSiteKey: 'env-site-key' } }));

const WIDGET_ID = 'widget-1';
let options: TurnstileOptions | undefined;
let turnstile: { [K in keyof TurnstileInstance]: ReturnType<typeof vi.fn> };

function installTurnstile() {
	turnstile = {
		render: vi.fn((_container: HTMLElement, renderOptions: TurnstileOptions) => {
			options = renderOptions;
			return WIDGET_ID;
		}),
		reset: vi.fn(),
		getResponse: vi.fn(),
		remove: vi.fn(),
	};
	window.turnstile = turnstile as unknown as TurnstileInstance;
}

async function mountRendered(props: Record<string, unknown> = {}) {
	const wrapper = mount(TurnstileWidget, { props });
	await vi.advanceTimersByTimeAsync(100);
	return wrapper;
}

describe('TurnstileWidget', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		options = undefined;
		installTurnstile();
	});

	afterEach(() => {
		vi.useRealTimers();
		delete window.turnstile;
	});

	it('renders the widget into its container with the site key, theme and "always" appearance', async () => {
		const wrapper = await mountRendered({ theme: 'dark' });

		expect(turnstile.render).toHaveBeenCalledWith(wrapper.element, expect.any(Object));
		expect(options).toMatchObject({ sitekey: 'env-site-key', theme: 'dark', appearance: 'always' });
	});

	it('emits the token and the error and expiry callbacks', async () => {
		const wrapper = await mountRendered({ siteKey: 'custom' });
		expect(options?.sitekey).toBe('custom');

		options?.callback?.('test-token');
		options?.['error-callback']?.();
		options?.['expired-callback']?.();

		expect(wrapper.emitted('token-received')).toEqual([['test-token']]);
		expect(wrapper.emitted('token-error')).toHaveLength(1);
		expect(wrapper.emitted('token-expired')).toHaveLength(1);
	});

	it('resets the widget on reset() and removes it on unmount', async () => {
		const wrapper = await mountRendered();

		(wrapper.vm as unknown as { reset: () => void }).reset();
		expect(turnstile.reset).toHaveBeenCalledWith(WIDGET_ID);

		wrapper.unmount();
		expect(turnstile.remove).toHaveBeenCalledWith(WIDGET_ID);
	});

	it('emits an error when the script never loads', async () => {
		delete window.turnstile;
		const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
		const wrapper = mount(TurnstileWidget);

		await vi.advanceTimersByTimeAsync(5000);

		expect(wrapper.emitted('token-error')).toHaveLength(1);
		expect(consoleError).toHaveBeenCalledWith('Turnstile script failed to load');
		consoleError.mockRestore();
	});
});
