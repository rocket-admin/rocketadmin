import { flushPromises, type VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import { createMemoryHistory, createRouter } from 'vue-router';
import type { DashboardWidget } from '@/models/dashboard';
import type { SavedQuery } from '@/models/saved-query';
import { openDialog } from './__tests__/dialog-harness';
import PanelEditDialog from './PanelEditDialog.vue';

const dashboards = vi.hoisted(() => ({ createWidget: vi.fn(), updateWidget: vi.fn() }));
const queries = vi.hoisted(() => ({ list: [] as SavedQuery[], connectionIds: [] as string[] }));
vi.mock('@/stores/dashboards', () => ({ useDashboardsStore: () => dashboards }));
vi.mock('@/stores/saved-queries', () => ({
	useSavedQueriesQuery: (connectionId: () => string) => {
		queries.connectionIds.push(connectionId());
		return { savedQueries: ref(queries.list) };
	},
}));
vi.mock('./analytics', () => ({ trackDashboardsEvent: vi.fn() }));

const savedQueries: SavedQuery[] = [
	{
		id: 'query-1',
		name: 'Avg Clicks / Short URL',
		description: null,
		widget_type: 'chart',
		chart_type: 'bar',
		widget_options: null,
		query_text: 'SELECT * FROM stats',
		connection_id: 'test-conn',
		created_at: '2024-01-01',
		updated_at: '2024-01-01',
	},
	{
		id: 'query-2',
		name: 'Total Users',
		description: 'Count of all users',
		widget_type: 'counter',
		chart_type: null,
		widget_options: { value_column: 'count' },
		query_text: 'SELECT COUNT(*) as count FROM users',
		connection_id: 'test-conn',
		created_at: '2024-01-01',
		updated_at: '2024-01-01',
	},
];

const existingWidget: DashboardWidget = {
	id: 'widget-123',
	position_x: 2,
	position_y: 3,
	width: 4,
	height: 4,
	query_id: 'query-1',
	dashboard_id: 'test-dash',
};

function makeRouter() {
	return createRouter({
		history: createMemoryHistory(),
		routes: [{ path: '/:p(.*)*', component: { render: () => null } }],
	});
}

async function open(widget: DashboardWidget | null) {
	const router = makeRouter();
	await router.push('/dashboards/test-conn/test-dash');
	const opened = await openDialog<boolean>(
		PanelEditDialog,
		{ connectionId: 'test-conn', dashboardId: 'test-dash', widget },
		[router],
	);
	return { ...opened, router };
}

function select(wrapper: VueWrapper) {
	return wrapper.get<HTMLSelectElement>('[data-testid="panel-query-select"]');
}

/** Chooses the option whose text is `label`. */
async function choose(wrapper: VueWrapper, label: string) {
	const option = select(wrapper)
		.findAll('option')
		.find((candidate) => candidate.text() === label);
	if (!option) throw new Error(`No option "${label}"`);
	await select(wrapper).setValue(option.element.value);
}

describe('PanelEditDialog', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		vi.clearAllMocks();
		queries.list = savedQueries;
		queries.connectionIds = [];
		dashboards.createWidget.mockResolvedValue({ id: 'new-widget' });
		dashboards.updateWidget.mockResolvedValue({ id: 'updated-widget' });
	});

	describe('add mode', () => {
		it('loads the saved queries of the connection and requires one', async () => {
			const { wrapper } = await open(null);

			expect(queries.connectionIds).toEqual(['test-conn']);
			expect(wrapper.get('h2').text()).toBe('Add panel');
			expect(select(wrapper).text()).toContain('Total Users');
			expect(wrapper.get('button[type="submit"]').attributes('disabled')).toBeDefined();
			wrapper.unmount();
		});

		it('creates the widget at the top left with the default size and closes with true', async () => {
			const { wrapper, dialogRef } = await open(null);

			await choose(wrapper, 'Avg Clicks / Short URL');
			await wrapper.get('form').trigger('submit');

			expect(dashboards.createWidget).toHaveBeenCalledWith('test-conn', 'test-dash', {
				query_id: 'query-1',
				position_x: 0,
				position_y: 0,
				width: 4,
				height: 4,
			});
			await expect(dialogRef.afterClosed()).resolves.toBe(true);
			wrapper.unmount();
		});

		it('leaves for the panel editor from "Create new query"', async () => {
			const { wrapper, dialogRef, router } = await open(null);

			await choose(wrapper, '+ Create new query');
			await flushPromises();

			await expect(dialogRef.afterClosed()).resolves.toBeUndefined();
			expect(router.currentRoute.value.path).toBe('/panels/test-conn/new');
			wrapper.unmount();
		});

		it('invites to create a query when there are none', async () => {
			queries.list = [];
			const { wrapper } = await open(null);

			expect(wrapper.text()).toContain('No saved queries yet');
			expect(wrapper.find('form').exists()).toBe(false);
			expect(wrapper.get('a').attributes('href')).toBe('/panels/test-conn/new');
			wrapper.unmount();
		});
	});

	describe('edit mode', () => {
		it('starts from the linked query and updates the widget query', async () => {
			const { wrapper, dialogRef } = await open(existingWidget);

			expect(wrapper.get('h2').text()).toBe('Edit panel');
			expect(select(wrapper).element.selectedOptions[0]?.textContent?.trim()).toBe('Avg Clicks / Short URL');
			await choose(wrapper, 'Total Users');
			await wrapper.get('form').trigger('submit');

			expect(dashboards.updateWidget).toHaveBeenCalledWith('test-conn', 'test-dash', 'widget-123', {
				query_id: 'query-2',
			});
			await expect(dialogRef.afterClosed()).resolves.toBe(true);
			wrapper.unmount();
		});

		it('requires a query for a widget without a linked one', async () => {
			const { wrapper } = await open({ ...existingWidget, query_id: null });

			expect(wrapper.get('button[type="submit"]').attributes('disabled')).toBeDefined();
			wrapper.unmount();
		});
	});
});
