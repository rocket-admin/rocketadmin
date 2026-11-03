import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/api/client';
import { ChartStub } from '@/components/charts/__tests__/chart-stub';
import type { DashboardWidget } from '@/models/dashboard';
import type { SavedQuery } from '@/models/saved-query';
import ChartPanel from './ChartPanel.vue';
import CounterPanel from './CounterPanel.vue';
import DashboardPanel from './DashboardPanel.vue';
import TablePanel from './TablePanel.vue';
import TextPanel from './TextPanel.vue';

vi.mock('vue-chartjs', async () => ({ Chart: (await import('@/components/charts/__tests__/chart-stub')).ChartStub }));

const savedQueries = vi.hoisted(() => ({ fetchSavedQuery: vi.fn(), executeSavedQuery: vi.fn() }));
vi.mock('@/stores/saved-queries', () => ({ useSavedQueriesStore: () => savedQueries }));

const widget: DashboardWidget = {
	id: 'test-id',
	position_x: 0,
	position_y: 0,
	width: 4,
	height: 4,
	query_id: 'test-query',
	dashboard_id: 'test-dashboard',
};

function query(overrides: Partial<SavedQuery>): SavedQuery {
	return {
		id: 'test-query',
		name: 'Test Query',
		description: null,
		widget_type: 'chart',
		chart_type: 'bar',
		widget_options: null,
		query_text: 'SELECT * FROM stats',
		connection_id: 'test-conn',
		created_at: '2024-01-01',
		updated_at: '2024-01-01',
		...overrides,
	};
}

describe('ChartPanel', () => {
	it('draws the preloaded rows', () => {
		const wrapper = mount(ChartPanel, {
			props: {
				widget,
				connectionId: 'test-conn',
				preloadedQuery: query({ widget_options: { label_column: 'name', value_column: 'count' } }),
				preloadedData: [
					{ name: 'A', count: 10 },
					{ name: 'B', count: 20 },
				],
			},
		});
		const chart = wrapper.getComponent(ChartStub);

		expect(chart.props('type')).toBe('bar');
		expect(chart.props('data')).toMatchObject({ labels: ['A', 'B'], datasets: [{ data: [10, 20] }] });
	});

	it('falls back to the first two columns without stored options', () => {
		const wrapper = mount(ChartPanel, {
			props: {
				widget,
				connectionId: 'test-conn',
				preloadedQuery: query({ chart_type: null }),
				preloadedData: [{ day: 'Mon', visits: 3 }],
			},
		});

		expect(wrapper.getComponent(ChartStub).props('data')).toMatchObject({ labels: ['Mon'], datasets: [{ data: [3] }] });
	});

	it('shows the empty state without rows', () => {
		const wrapper = mount(ChartPanel, { props: { widget, connectionId: 'c', preloadedQuery: query({}) } });

		expect(wrapper.text()).toBe('No data available');
	});
});

describe('CounterPanel', () => {
	it('shows the value column of the first row', () => {
		const wrapper = mount(CounterPanel, {
			props: {
				widget,
				connectionId: 'test-conn',
				preloadedQuery: query({ widget_type: 'counter', widget_options: { value_column: 'total' } }),
				preloadedData: [{ total: 42 }],
			},
		});

		expect(wrapper.get('.counter-panel__value').text()).toBe('42');
		expect(wrapper.get('.counter-panel__label').text()).toBe('total');
	});

	it('abbreviates large numbers and uses the label column', () => {
		const wrapper = mount(CounterPanel, {
			props: {
				widget,
				connectionId: 'test-conn',
				preloadedQuery: query({ widget_type: 'counter', widget_options: { label_column: 'title' } }),
				preloadedData: [{ revenue: 1520000, title: 'Revenue' }],
			},
		});

		expect(wrapper.get('.counter-panel__value').text()).toBe('1.5M');
		expect(wrapper.get('.counter-panel__label').text()).toBe('Revenue');
	});

	it('shows the empty state without rows', () => {
		const wrapper = mount(CounterPanel, { props: { widget, connectionId: 'c', preloadedQuery: query({}) } });

		expect(wrapper.text()).toBe('No data available');
	});
});

describe('TablePanel', () => {
	it('renders one column per key of the first row', () => {
		const wrapper = mount(TablePanel, {
			props: {
				widget,
				connectionId: 'test-conn',
				preloadedQuery: query({ widget_type: 'table' }),
				preloadedData: [
					{ id: 1, name: 'John', email: 'john@example.com' },
					{ id: 2, name: 'Jane', email: 'jane@example.com' },
				],
			},
		});

		expect(wrapper.findAll('th').map((th) => th.text())).toEqual(['id', 'name', 'email']);
		expect(wrapper.findAll('tbody tr')).toHaveLength(2);
	});

	it('shows the empty state without rows', () => {
		const wrapper = mount(TablePanel, { props: { widget, connectionId: 'c' } });

		expect(wrapper.text()).toBe('No data available');
	});
});

describe('TextPanel', () => {
	it('renders the text content as markdown', async () => {
		const wrapper = mount(TextPanel, {
			props: {
				widget,
				preloadedQuery: query({ widget_type: 'text', widget_options: { text_content: '# Hello World' } }),
			},
		});
		await flushPromises();

		expect(wrapper.get('h1').text()).toBe('Hello World');
	});

	it('asks for content when there is none', () => {
		const wrapper = mount(TextPanel, { props: { widget, preloadedQuery: query({ widget_type: 'text' }) } });

		expect(wrapper.text()).toContain('No content');
		expect(wrapper.text()).toContain('Edit this panel to add text content.');
	});
});

describe('DashboardPanel', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		vi.clearAllMocks();
	});

	it('loads the saved query and its result, renders the matching panel and emits the query', async () => {
		const counter = query({ widget_type: 'counter', widget_options: { value_column: 'n' } });
		savedQueries.fetchSavedQuery.mockResolvedValue(counter);
		savedQueries.executeSavedQuery.mockResolvedValue({ data: [{ n: 7 }] });
		const wrapper = mount(DashboardPanel, { props: { widget, connectionId: 'test-conn' } });

		expect(wrapper.find('[role="status"]').exists()).toBe(true);
		await flushPromises();

		expect(savedQueries.fetchSavedQuery).toHaveBeenCalledWith('test-conn', 'test-query');
		expect(savedQueries.executeSavedQuery).toHaveBeenCalledWith('test-conn', 'test-query');
		expect(wrapper.getComponent(CounterPanel).props('preloadedData')).toEqual([{ n: 7 }]);
		expect(wrapper.emitted('loaded')).toEqual([[counter]]);
	});

	it('says so when no query is linked', async () => {
		const wrapper = mount(DashboardPanel, { props: { widget: { ...widget, query_id: null }, connectionId: 'c' } });
		await flushPromises();

		expect(savedQueries.fetchSavedQuery).not.toHaveBeenCalled();
		expect(wrapper.text()).toBe('No query linked to this panel');
	});

	it('shows the server error message', async () => {
		savedQueries.fetchSavedQuery.mockRejectedValue(new ApiError('Bad SQL', 400, { message: 'Bad SQL' }));
		savedQueries.executeSavedQuery.mockResolvedValue({ data: [] });
		const wrapper = mount(DashboardPanel, { props: { widget, connectionId: 'c' } });
		await flushPromises();

		expect(wrapper.text()).toBe('Bad SQL');
	});

	it('flags an unknown panel type', async () => {
		savedQueries.fetchSavedQuery.mockResolvedValue({ ...query({}), widget_type: 'gauge' });
		savedQueries.executeSavedQuery.mockResolvedValue({ data: [] });
		const wrapper = mount(DashboardPanel, { props: { widget, connectionId: 'c' } });
		await flushPromises();

		expect(wrapper.text()).toBe('Unknown panel type: gauge');
	});
});
