import { flushPromises } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { type Ref, ref } from 'vue';
import { mountPage } from '@/components/dashboards/__tests__/mount-page';
import type { Dashboard } from '@/models/dashboard';
import type { SavedQuery } from '@/models/saved-query';
import DashboardView from './DashboardView.vue';

// grid-layout-plus measures the DOM, which jsdom doesn't lay out: render the items as plain boxes.
vi.mock('grid-layout-plus', async () => {
	const { defineComponent, h } = await import('vue');
	return {
		GridLayout: defineComponent({
			name: 'GridLayout',
			props: ['layout', 'isDraggable', 'isResizable'],
			emits: ['layout-updated', 'update:layout'],
			setup:
				(_props, { slots }) =>
				() =>
					h('div', { class: 'grid-stub' }, slots.default?.()),
		}),
		GridItem: defineComponent({
			name: 'GridItem',
			props: ['i', 'x', 'y', 'w', 'h'],
			setup:
				(_props, { slots }) =>
				() =>
					h('div', slots.default?.()),
		}),
	};
});
vi.mock('vue-chartjs', async () => ({ Chart: (await import('@/components/charts/__tests__/chart-stub')).ChartStub }));

const state = vi.hoisted(() => ({
	ids: [] as string[][],
	dashboard: undefined as unknown,
	loading: undefined as unknown,
	refresh: vi.fn(),
	updateWidgetPosition: vi.fn(),
	fetchSavedQuery: vi.fn(),
	executeSavedQuery: vi.fn(),
}));
const track = vi.hoisted(() => vi.fn());
vi.mock('@/stores/dashboards', () => ({
	useDashboardQuery: (connectionId: Ref<string>, dashboardId: Ref<string>) => {
		state.ids.push([connectionId.value, dashboardId.value]);
		return { dashboard: state.dashboard, loading: state.loading, refresh: state.refresh };
	},
	useDashboardsStore: () => ({
		updateWidgetPosition: state.updateWidgetPosition,
		createWidget: vi.fn(),
		updateWidget: vi.fn(),
		deleteWidget: vi.fn(async () => ({ id: 'w1' })),
	}),
}));
vi.mock('@/stores/saved-queries', () => ({
	useSavedQueriesStore: () => ({ fetchSavedQuery: state.fetchSavedQuery, executeSavedQuery: state.executeSavedQuery }),
	useSavedQueriesQuery: () => ({ savedQueries: ref([]) }),
}));
vi.mock('@/stores/connections', () => ({ useConnectionsStore: () => ({ connectionTitle: 'Test Connection' }) }));
vi.mock('@/components/dashboards/analytics', () => ({ trackDashboardsEvent: track }));

function makeDashboard(): Dashboard {
	return {
		id: 'd1',
		name: 'Sales',
		description: 'Monthly numbers',
		connection_id: 'conn-1',
		created_at: '2024-01-01',
		updated_at: '2024-01-01',
		widgets: [
			{ id: 'w1', position_x: 0, position_y: 0, width: 4, height: 4, query_id: 'q1', dashboard_id: 'd1' },
			{ id: 'w2', position_x: 4, position_y: 0, width: 4, height: 4, query_id: 'q2', dashboard_id: 'd1' },
		],
	};
}

const counterQuery: SavedQuery = {
	id: 'q1',
	name: 'Total Users',
	description: null,
	widget_type: 'counter',
	chart_type: null,
	widget_options: { value_column: 'n' },
	query_text: 'SELECT COUNT(*) AS n FROM users',
	connection_id: 'conn-1',
	created_at: '2024-01-01',
	updated_at: '2024-01-01',
};

const open = () => mountPage(DashboardView, '/dashboards/:connectionId/:dashboardId', '/dashboards/conn-1/d1');

describe('DashboardView', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		state.ids = [];
		state.dashboard = ref<Dashboard | null>(makeDashboard());
		state.loading = ref(false);
		state.fetchSavedQuery.mockImplementation(async (_c: string, id: string) => ({
			...counterQuery,
			id,
			name: `Query ${id}`,
		}));
		state.executeSavedQuery.mockResolvedValue({ data: [{ n: 5 }] });
		state.updateWidgetPosition.mockResolvedValue({});
	});

	it('loads the dashboard and renders a panel per widget, titled by its saved query', async () => {
		const { wrapper } = await open();

		expect(state.ids).toEqual([['conn-1', 'd1']]);
		expect(document.title).toBe('Sales | Test Connection');
		expect(wrapper.get('h1').text()).toBe('Sales');
		expect(wrapper.text()).toContain('Monthly numbers');
		expect(wrapper.get('[data-testid="panel-w1"]').text()).toContain('Query q1');
		expect(wrapper.get('[data-testid="panel-w2"]').text()).toContain('Query q2');
		expect(state.executeSavedQuery).toHaveBeenCalledWith('conn-1', 'q1');
		wrapper.unmount();
	});

	it('shows the empty state for a dashboard without panels', async () => {
		(state.dashboard as Ref<Dashboard>).value = { ...makeDashboard(), widgets: [] };
		const { wrapper } = await open();

		expect(wrapper.text()).toContain('No panels yet');
		expect(wrapper.find('[data-testid="edit-mode-toggle"]').exists()).toBe(false);
		wrapper.unmount();
	});

	it('shows a spinner while loading', async () => {
		(state.dashboard as Ref<Dashboard | null>).value = null;
		(state.loading as Ref<boolean>).value = true;
		const { wrapper } = await open();

		expect(wrapper.get('h1').text()).toBe('Loading...');
		expect(wrapper.find('[role="status"]').exists()).toBe(true);
		wrapper.unmount();
	});

	it('enables dragging and resizing in edit mode', async () => {
		const { wrapper } = await open();
		const grid = wrapper.getComponent({ name: 'GridLayout' });

		expect(grid.props('isDraggable')).toBe(false);
		await wrapper.get('input[data-testid="edit-mode-toggle"]').setValue(true);

		expect(grid.props('isDraggable')).toBe(true);
		expect(grid.props('isResizable')).toBe(true);
		expect(track).toHaveBeenCalledWith('Dashboards: edit mode enabled');
		wrapper.unmount();
	});

	it('saves only the panels whose position or size changed', async () => {
		const { wrapper } = await open();
		const grid = wrapper.getComponent({ name: 'GridLayout' });

		grid.vm.$emit('layout-updated', [
			{ i: 'w1', x: 0, y: 0, w: 4, h: 4 },
			{ i: 'w2', x: 6, y: 2, w: 6, h: 3 },
		]);
		await flushPromises();

		expect(state.updateWidgetPosition).toHaveBeenCalledTimes(1);
		expect(state.updateWidgetPosition).toHaveBeenCalledWith('conn-1', 'd1', 'w2', {
			position_x: 6,
			position_y: 2,
			width: 6,
			height: 3,
		});

		grid.vm.$emit('layout-updated', [{ i: 'w2', x: 6, y: 2, w: 6, h: 3 }]);
		await flushPromises();
		expect(state.updateWidgetPosition).toHaveBeenCalledTimes(1);
		wrapper.unmount();
	});

	it('reloads the dashboard after a panel is deleted', async () => {
		const { wrapper } = await open();

		await wrapper.get('[data-testid="panel-w1"] button[aria-label="Panel actions"]').trigger('click');
		const items = wrapper.findAll('[data-testid="panel-w1"] [role="menuitem"]');
		expect(items.map((item) => item.get('.ui-menu-item__label').text())).toEqual([
			'Configure panel',
			'Change query',
			'Delete',
		]);
		expect(items[0]?.attributes('href')).toBe('/panels/conn-1/q1');
		await items[2]?.trigger('click');
		await flushPromises();
		expect(track).toHaveBeenCalledWith('Dashboards: delete panel dialog opened');

		await wrapper.get('form').trigger('submit');
		await flushPromises();
		expect(state.refresh).toHaveBeenCalled();
		wrapper.unmount();
	});

	it('opens the add panel dialog', async () => {
		const { wrapper } = await open();

		await wrapper.get('[data-testid="add-panel-button"]').trigger('click');
		await flushPromises();

		expect(track).toHaveBeenCalledWith('Dashboards: add panel dialog opened');
		expect(wrapper.text()).toContain('No saved queries yet');
		wrapper.unmount();
	});

	it('goes back to the dashboards list', async () => {
		const { wrapper, router } = await open();

		await wrapper.get('button[aria-label="Back to dashboards"]').trigger('click');
		await flushPromises();

		expect(router.currentRoute.value.path).toBe('/dashboards/conn-1');
		wrapper.unmount();
	});
});
