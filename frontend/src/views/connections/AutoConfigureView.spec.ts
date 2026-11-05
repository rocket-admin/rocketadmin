import { flushPromises } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { reactive } from 'vue';
import type { ConfigProgress } from '@/stores/configuration-state';
import AutoConfigureView from './AutoConfigureView.vue';
import { mountConnectionView } from './connectionsTestUtils';

const configState = vi.hoisted(() => ({
	progress: null as ConfigProgress | null,
	startConfiguring: vi.fn(),
}));
vi.mock('@/stores/configuration-state', () => ({ useConfigurationStateStore: () => reactive(configState) }));

const mountPage = (url = '/auto-configure/conn-1') =>
	mountConnectionView(AutoConfigureView, '/auto-configure/:connectionId?', url);

function emit(progress: ConfigProgress) {
	reactive(configState).progress = progress;
	return flushPromises();
}

describe('AutoConfigureView', () => {
	let finish: (value: boolean) => void = () => {};

	beforeEach(() => {
		vi.clearAllMocks();
		configState.progress = null;
		configState.startConfiguring.mockImplementation(
			() =>
				new Promise<boolean>((resolve) => {
					finish = resolve;
				}),
		);
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('starts configuring the connection and shows the humanized log', async () => {
		const { wrapper } = await mountPage();

		expect(configState.startConfiguring).toHaveBeenCalledWith('conn-1');
		expect(wrapper.find('h2').text()).toBe('Configuring your database');
		expect(wrapper.text()).toContain('Initializing…');

		await emit({ type: 'message', text: 'Fetching tables from database' });
		await emit({ type: 'message', text: 'Inspected structure of table "users"' });

		const items = wrapper.findAll('.auto-configure__log-item');
		expect(items.map((li) => li.text())).toEqual([
			'✓Initializing…',
			'✓Reading your tables…',
			'Read structure of users',
		]);
		expect(items.at(-1)?.classes()).toContain('auto-configure__log-item--current');
		expect(wrapper.find('a').attributes('href')).toBe('/dashboard/conn-1');
		wrapper.unmount();
	});

	it('keeps only the last five lines and skips repeats', async () => {
		const { wrapper } = await mountPage();

		for (const table of ['a', 'b', 'c', 'd', 'e', 'e']) {
			await emit({ type: 'message', text: `Inspected structure of table "${table}"` });
		}

		expect(wrapper.findAll('.auto-configure__log-item')).toHaveLength(5);
		expect(wrapper.text()).not.toContain('Initializing…');
		wrapper.unmount();
	});

	it('summarises the configured tables, widgets and settings, then opens the dashboard', async () => {
		const { wrapper, router } = await mountPage();
		vi.useFakeTimers();

		await emit({ type: 'message', text: 'Added Phone widget for table "users" on column "phone"' });
		await emit({ type: 'message', text: 'Set up settings for table "orders", ordering parameter set to ASC' });
		await emit({ type: 'message', text: 'Set up settings for table "orders", ordering_field parameter set to "id"' });
		await emit({ type: 'complete' });

		expect(wrapper.find('h2').text()).toBe('Your database is ready');
		expect(wrapper.find('[data-testid="auto-configure-summary"]').text()).toBe('2 tables1 widget2 settings');

		finish(true);
		await flushPromises();
		expect(router.currentRoute.value.path).toBe('/auto-configure/conn-1');
		await vi.advanceTimersByTimeAsync(1800);
		expect(router.currentRoute.value.path).toBe('/dashboard/conn-1');
		wrapper.unmount();
	});

	it('shows the error instead of the log', async () => {
		const { wrapper } = await mountPage();

		await emit({ type: 'error', message: 'Setup failed with status 500' });

		expect(wrapper.find('[role="alert"]').text()).toBe('Setup failed with status 500');
		expect(wrapper.find('.auto-configure__log').exists()).toBe(false);
		wrapper.unmount();
	});

	it('goes back to the connections list without a connection id', async () => {
		const { router } = await mountPage('/auto-configure');

		expect(configState.startConfiguring).not.toHaveBeenCalled();
		expect(router.currentRoute.value.path).toBe('/connections-list');
	});
});
